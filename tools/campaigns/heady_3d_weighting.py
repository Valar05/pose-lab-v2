#!/usr/bin/env python3
# Original invocation (Termux, from ANY directory, once installed inside Pose Lab V2):
# bash "$HOME/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_campaign.sh" run
# Installer invocation: python -c '...validated ZIP bootstrap...' (see README in archive).
# Campaign: Heady Pose Lab V2 3D weighting and procedural motion. One script, modular operators.
# 2026-10-28 first slice: ONLY body-facing Bone_034 weight reduction + exact v02 motion rerender.
# 2026-10-28 v04 invocation: bash "$HOME/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_campaign.sh" run-v04
# v04: LOCK body-to-socket Bone_034; two moving links Bone_033/032; shaft-only cross-leg weight isolation.
# Never change anything at body base, root cap, or ambiguous mesh island.
# 2026-10-28 deliver-only recovery: bash "$HOME/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_campaign.sh" publish
# publish copies EXISTING verified GIF to Pictures + Downloads; no model/weight edits.
# Future hair/claw/six-leg operations are API functions, NOT run in this slice.
"""Headless GLB skinning, guarded weight operators, deterministic 3-camera review GIF.
Requires NumPy & Pillow at runtime, available as Termux python-numpy/python-pillow packages.
Does not run Git, Phone Hands, Computer Hands or alter source/model originals.
"""
import argparse, hashlib, json, math, os, pathlib, shutil, struct, subprocess, sys, tempfile, time, traceback
from collections import deque

ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / 'tools/heady/assets'
OUTPUT_DIR = ROOT / 'tools/heady/output'
CONFIG = ROOT / 'tools/heady/config/heady_3d_v1.json'
EXPECTED_ORIGINAL = '02535ebecaaf2431c1d79baa4ef9f95580e349c879bf27a9368f92586f973fbd'
EXPECTED_V02 = 'eb274dbaad676c6aa35f7fb9922cef78fa4cbc1598a9a68bb4d2b529b2f37bd1'
GLB_MAGIC = b'glTF'; J_CHUNK=0x4E4F534A; B_CHUNK=0x004E4942


def digest(b): return hashlib.sha256(b).hexdigest()
def digest_file(p): return digest(pathlib.Path(p).read_bytes())
def atomic_bytes(p, b):
    p=pathlib.Path(p);p.parent.mkdir(parents=True,exist_ok=True)
    if p.exists():
        if digest_file(p)==digest(b):return 'UNCHANGED'
        raise RuntimeError(f'FAIL_CLOSED_OUTPUT_COLLISION: {p}')
    fd,tmp=tempfile.mkstemp(prefix='.heady-',dir=str(p.parent))
    try:
        with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
        os.replace(tmp,p)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    return 'CREATED'

def npmod():
    import numpy as np
    return np

def pilmod():
    from PIL import Image,ImageDraw,ImageFont
    return Image,ImageDraw,ImageFont

class GLB:
    def __init__(self,path):
        self.path=pathlib.Path(path);self.raw=self.path.read_bytes()
        if len(self.raw)<28:raise ValueError('GLB too short')
        magic,v,ln=struct.unpack_from('<4sII',self.raw,0)
        if magic!=GLB_MAGIC or v!=2 or ln!=len(self.raw): raise ValueError('Invalid GLB header/length')
        jsize,jtype=struct.unpack_from('<II',self.raw,12)
        if jtype!=J_CHUNK:raise ValueError('Expected JSON chunk')
        self.json=json.loads(self.raw[20:20+jsize]);self.binchunk_at=20+jsize
        bsize,btype=struct.unpack_from('<II',self.raw,self.binchunk_at)
        if btype!=B_CHUNK:raise ValueError('Missing BIN chunk')
        self.binst=self.binchunk_at+8;self.binsize=bsize
        if self.binst+bsize!=len(self.raw):raise ValueError('Unexpected extra chunks')
        self.bin=memoryview(self.raw)[self.binst:]
    def accessor(self,i):
        np=npmod(); a=self.json['accessors'][i];v=self.json['bufferViews'][a['bufferView']]
        if a.get('sparse') or v.get('byteStride'): raise ValueError('Unsupported sparse/interleaved accessor; fail closed')
        dt={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}[a['componentType']]
        cols={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        ofs=v.get('byteOffset',0)+a.get('byteOffset',0)
        arr=np.frombuffer(self.bin,dtype=dt,count=a['count']*cols,offset=ofs).reshape(-1,cols).copy()
        return arr
    def put_accessor(self,raw,i,arr):
        a=self.json['accessors'][i];v=self.json['bufferViews'][a['bufferView']]
        if a['componentType']!=5126 or a.get('sparse') or v.get('byteStride'): raise RuntimeError('Cannot patch non-float/interleaved accessor')
        ofs=self.binst+v.get('byteOffset',0)+a.get('byteOffset',0)
        payload=arr.astype('<f4').tobytes();size=v['byteLength']
        if size<len(payload):raise ValueError('Accessor overflow')
        raw[ofs:ofs+len(payload)]=payload


def validate_repo():
    required=['AGENTS.md','docs/POSE_LAB_CAMPAIGN_RULES.md','docs/POSE_IS_GOD.md','docs/POSE_CAMPAIGN_FRAMEWORK.md','docs/POSE_3D_CAMPAIGN_RULES.md','motion.html','scripts/build.mjs']
    miss=[x for x in required if not (ROOT/x).is_file()]
    if miss:raise RuntimeError('WRONG_REPO_OR_RULES_MISSING: '+','.join(miss))
    agent=(ROOT/'AGENTS.md').read_text()
    if 'POSE_3D_CAMPAIGN_RULES.md' not in agent:raise RuntimeError('3D sticky AGENTS pointer missing')
    return True


def inspect_source(g):
    np=npmod();d=g.json; prim=d['meshes'][0]['primitives'][0];a=prim['attributes']
    assert d['skins'][0]['name']=='SmartRigArmature' and len(d['skins'][0]['joints'])==57
    P=g.accessor(a['POSITION']);I=g.accessor(prim['indices']).ravel().reshape(-1,3)
    J=g.accessor(a['JOINTS_0']);W=g.accessor(a['WEIGHTS_0'])
    assert len(P)==8831 and len(I)==7582 and W.shape==(len(P),4)
    assert np.all(np.isfinite(P)) and np.all(np.isfinite(W))
    assert np.max(np.abs(W.sum(axis=1)-1))<1e-4
    return {'positions':P,'faces':I,'joints':J,'weights':W,'attrs':a,'images':image_payload_hashes(g)}


def image_payload_hashes(g):
    out=[]
    for image in g.json['images']:
        if 'bufferView' not in image:raise RuntimeError('External texture not bundled')
        v=g.json['bufferViews'][image['bufferView']];o=v['byteOffset'];out.append(digest(g.bin[o:o+v['byteLength']]))
    return out


def build_welded_adjacency(positions,faces,decimals=6):
    """Analysis-only graph includes UV seam duplicates, never edits mesh vertices."""
    coords=[tuple(round(float(x),decimals) for x in p) for p in positions]
    groups={}
    for i,c in enumerate(coords): groups.setdefault(c,[]).append(i)
    adj=[set() for _ in range(len(positions))]
    for a,b,c in faces:
        a,b,c=int(a),int(b),int(c)
        for p,q in [(a,b),(b,c),(c,a)]:adj[p].add(q);adj[q].add(p)
    for members in groups.values():
        if len(members)>1:
            leader=members[0]
            for ix in members[1:]:adj[leader].add(ix);adj[ix].add(leader)
    return adj


def connected_components(adjacency,eligible=None):
    eligible=set(range(len(adjacency))) if eligible is None else set(eligible)
    unseen=set(eligible);parts=[]
    while unseen:
        s=unseen.pop(); stack=[s];part={s}
        while stack:
            for n in adjacency[stack.pop()]:
                if n in unseen:unseen.remove(n);part.add(n);stack.append(n)
        parts.append(part)
    return sorted(parts,key=len,reverse=True)


def rings_from_seeds(adjacency,seeds,within=None,max_steps=3):
    within=set(range(len(adjacency))) if within is None else set(within)
    d={i:0 for i in seeds if i in within};queue=deque(d)
    while queue:
        v=queue.popleft()
        if d[v]>=max_steps:continue
        for n in adjacency[v]:
            if n in within and n not in d:d[n]=d[v]+1;queue.append(n)
    return d


def grow_mask(adjacency,seeds,steps=1,within=None): return set(rings_from_seeds(adjacency,seeds,within,steps))

def erode_mask(adjacency,mask,steps=1):
    out=set(mask)
    for _ in range(steps):out={v for v in out if all(n in out for n in adjacency[v])}
    return out


def quat_matrix(q):
    np=npmod();x,y,z,w=[float(k) for k in q];n=x*x+y*y+z*z+w*w
    if n<1e-16:raise ValueError('Invalid quaternion')
    s=2/n;xx,yy,zz=x*x*s,y*y*s,z*z*s;xy,xz,yz=x*y*s,x*z*s,y*z*s;wx,wy,wz=w*x*s,w*y*s,w*z*s
    return np.array([[1-yy-zz,xy-wz,xz+wy],[xy+wz,1-xx-zz,yz-wx],[xz-wy,yz+wx,1-xx-yy]],dtype=float)


def node_local(n,rotation_override=None):
    np=npmod()
    if 'matrix' in n:
        if rotation_override is not None:raise ValueError('Animation of matrix node unsupported')
        return np.asarray(n['matrix'],dtype=float).reshape(4,4).T
    mat=np.eye(4);mat[:3,:3]=quat_matrix(rotation_override if rotation_override is not None else n.get('rotation',[0,0,0,1])) @ np.diag(n.get('scale',[1,1,1]));mat[:3,3]=n.get('translation',[0,0,0]);return mat


def parent_map(nodes):
    m={}
    for i,n in enumerate(nodes):
        for c in n.get('children',[]):
            if c in m:raise ValueError('Multiple-parent glTF node')
            m[c]=i
    return m


def node_worlds(d,overrides=None):
    np=npmod();nodes=d['nodes'];parents=parent_map(nodes);cache={};overrides=overrides or {}
    def calc(i):
        if i not in cache:
            local=node_local(nodes[i],overrides.get(i))
            cache[i]=calc(parents[i]) @ local if i in parents else local
        return cache[i]
    return [calc(i) for i in range(len(nodes))]


def bone_root_direction(d):
    np=npmod();world=node_worlds(d)
    start=world[53][:3,3];mid=world[52][:3,3];axis=mid-start
    axis/=np.linalg.norm(axis)
    return start,axis


def directional_hip_mask(data,glb,config):
    """Proximal BODY-side only, not distal-leg side. Geometry along actual hip->next joint axis."""
    np=npmod();P=data['positions'];J=data['joints'];W=data['weights']
    skin=glb.json['skins'][0]['joints'];hip=skin.index(53)
    hw=(W*(J==hip)).sum(axis=1)
    origin,axis=bone_root_direction(glb.json)
    axial=(P-origin) @ axis
    eligible=np.flatnonzero(hw>config['min_hip_weight'])
    if not len(eligible):raise RuntimeError('No eligible hip vertices')
    # Only a bounded proximal subset, based on the real joint axis, not global X.
    lo=np.quantile(axial[eligible],config['body_quantile_low'])
    hi=np.quantile(axial[eligible],config['body_quantile_high'])
    if hi<=lo:raise ValueError('Bad proximal quantile window')
    adj=build_welded_adjacency(P,data['faces'])
    selected=set(int(k) for k in eligible if axial[k] < hi)
    # Restrict to seed-connected local hip patch; no global 3D box mask.
    seeds={int(i) for i in eligible if axial[i]<=lo}
    comps=connected_components(adj,selected)
    selected=set().union(*(p for p in comps if p & seeds)) if comps else set()
    if not selected:raise RuntimeError('No body-facing connected hip region')
    strength=np.zeros(len(P),dtype=float)
    for i in selected:
        t=float(np.clip((hi-axial[i])/(hi-lo),0,1))
        strength[i]=t*t*(3-2*t)*float(config['max_weight_reduction_fraction'])
    if len(np.flatnonzero(strength))>config['max_affected_vertices']:raise RuntimeError('HIP_MASK_TOO_LARGE')
    return strength,{'hip_skin_index':hip,'hip_node':53,'parent_node':54,'axis_xyz':axis.tolist(),'origin_xyz':origin.tolist(),'proximity_low':float(lo),'proximity_high':float(hi),'mask_size':int(np.count_nonzero(strength)), 'max_cut':float(strength.max()),'mask_bounds_xyz':[P[strength>0].min(axis=0).tolist(),P[strength>0].max(axis=0).tolist()]}


def transfer_weight_to_parent(J,W,affected,source_skin_id,target_skin_id,max_allowed_replace=0.015,allowed_ancestors=()):
    """Conserve total weight. If 4 slots occupied, evict smallest tiny non-target weight only.
    If impossible, skip vertex and report; never silently destroy meaningful influences.
    """
    np=npmod();outJ=J.copy();outW=W.copy();edits=[];skipped=[]
    for i in np.flatnonzero(affected>1e-10):
        ids=outJ[i].astype(int);ws=outW[i].astype(float)
        sidx=np.flatnonzero(ids==source_skin_id)
        if len(sidx)!=1:skipped.append((int(i),'SOURCE_SLOT'));continue
        s=int(sidx[0]);take=float(ws[s]*affected[i]);
        if take<1e-9:continue
        t=np.flatnonzero(np.isin(ids,[target_skin_id,*allowed_ancestors]))
        if len(t):
            target=int(t[0])
        else:
            zeros=np.flatnonzero(ws<1e-9)
            if len(zeros):target=int(zeros[0])
            else:
                # Avoid deleting significant body/leg influences.
                viable=[int(k) for k in range(4) if k!=s and ws[k]<=min(max_allowed_replace,take*0.60)]
                if not viable:skipped.append((int(i),'NO_SAFE_SLOT'));continue
                target=min(viable,key=lambda k:ws[k]);discard=float(ws[target]);ws[s]+=discard;ws[target]=0.0
            ids[target]=target_skin_id
        ws[s]-=take;ws[target]+=take
        if np.min(ws)<-1e-7:raise RuntimeError('NEGATIVE_WEIGHTS')
        if abs(float(ws.sum())-1)>1e-4:raise RuntimeError(f'NON_NORMALIZED_WEIGHTS vertex {i} before={W[i].tolist()} after={ws.tolist()} joints={ids.tolist()} source={source_skin_id} target={target_skin_id} take={take}')
        outJ[i]=ids;outW[i]=ws
        edits.append({'vertex':int(i),'removed_hip':take,'new_parent_weight':float(ws[target])})
    return outJ,outW,edits,skipped


def repair_hair_foot_weights(J,W,hair_vertex_mask,foot_skin_ids,head_skin_id):
    """Future stage; only call with approved, externally verified anatomical hair mask."""
    np=npmod()
    if hair_vertex_mask is None or not len(hair_vertex_mask):raise ValueError('Hair mask not verified')
    J2=J.copy();W2=W.copy();stats=[]
    for i in sorted(hair_vertex_mask):
        v_ids=J2[i].astype(int);v_w=W2[i].astype(float)
        remove=float(sum(w for k,w in zip(v_ids,v_w) if k in foot_skin_ids))
        if remove<=1e-9:continue
        for k in range(4):
            if v_ids[k] in foot_skin_ids:v_w[k]=0
        hits=[k for k in range(4) if v_ids[k]==head_skin_id]
        if hits:v_w[hits[0]]+=remove
        else:
            free=[k for k in range(4) if v_w[k]<1e-9]
            if not free:raise RuntimeError(f'No hair-safe influence slot on vertex {i}')
            v_ids[free[0]]=head_skin_id;v_w[free[0]]=remove
        J2[i]=v_ids;W2[i]=v_w;stats.append(int(i))
    return J2,W2,stats


def repair_claw_two_segment_weights(*, approved_pincer_masks=None, approved_joint_nodes=None):
    """Future stage: require owner-accepted hinge joints and both pincer half masks."""
    if not approved_pincer_masks or not approved_joint_nodes:
        raise RuntimeError('CLAW_STAGE_NOT_AUTHORIZED: approved anatomical pivot and masks required')
    raise RuntimeError('CLAW_STAGE_NOT_IMPLEMENTED: first slice is hip only')


def generate_master_leg_gait(t,stance=.64,stride=.105,lift=.075):
    """Trajectory grammar for later 6-leg orchestration; v02 joint quats remain locked today."""
    phase=t%1
    if phase<stance:return {'contact':True,'x':stride*(.5-phase/stance),'y':0.0}
    u=(phase-stance)/(1-stance);return {'contact':False,'x':stride*(-.5+u),'y':lift*math.sin(math.pi*u)}

def phase_offset(t,offset):return (t+offset)%1

def move_direction(x,y,angle):return (x*math.cos(angle)-y*math.sin(angle),x*math.sin(angle)+y*math.cos(angle))


def verify_unchanged_except_weights(original,candidate,attrs,source_hashes):
    np=npmod();base=bytearray(original.raw);copy=bytearray(candidate)
    idx=attrs['WEIGHTS_0'];a=original.json['accessors'][idx];view=original.json['bufferViews'][a['bufferView']]
    at=original.binst+view['byteOffset']+a.get('byteOffset',0);sz=a['count']*4*4
    copy[at:at+sz]=base[at:at+sz]
    # JOINTS change may be needed to add parent slot
    ja=original.json['accessors'][attrs['JOINTS_0']];jv=original.json['bufferViews'][ja['bufferView']]
    jo=original.binst+jv['byteOffset']+ja.get('byteOffset',0);jsz=jv['byteLength']
    copy[jo:jo+jsz]=base[jo:jo+jsz]
    if bytes(copy)!=bytes(base):raise RuntimeError('UNEXPECTED_GLB_BYTES_MODIFIED')
    if image_payload_hashes(GLB_bytes(candidate))!=source_hashes:raise RuntimeError('TEXTURES_CHANGED')

class GLB_bytes(GLB):
    def __init__(self,buf):
        self.path=None;self.raw=bytes(buf)
        _,v,ln=struct.unpack_from('<4sII',self.raw);jsz,jtype=struct.unpack_from('<II',self.raw,12)
        self.json=json.loads(self.raw[20:20+jsz]);self.binchunk_at=20+jsz
        self.binsize,btype=struct.unpack_from('<II',self.raw,self.binchunk_at);self.binst=self.binchunk_at+8;self.bin=memoryview(self.raw)[self.binst:]


def quat_slerp(q0,q1,f):
    np=npmod();q0=np.asarray(q0,dtype=float);q1=np.asarray(q1,dtype=float)
    dot=np.dot(q0,q1)
    if dot<0:q1=-q1;dot=-dot
    if dot>.9995:q=q0+(q1-q0)*f;return q/np.linalg.norm(q)
    theta=math.acos(float(np.clip(dot,-1,1)));return (math.sin((1-f)*theta)*q0+math.sin(f*theta)*q1)/math.sin(theta)


def animation_quaternions(g,time_sec):
    np=npmod();d=g.json;out={}
    for ch in d['animations'][0]['channels']:
        if ch['target']['path']!='rotation':raise RuntimeError('Unexpected animation channel')
        sam=d['animations'][0]['samplers'][ch['sampler']];tt=g.accessor(sam['input']).ravel();q=g.accessor(sam['output'])
        if len(tt)!=len(q):raise RuntimeError('Animation shape mismatch')
        time_sec=float(time_sec) % float(tt[-1]);k=int(np.searchsorted(tt,time_sec,'right'))
        if k<=0:val=q[0]
        else:
            ix=min(k,len(tt)-1);f=(time_sec-tt[ix-1])/max(float(tt[ix]-tt[ix-1]),1e-12);val=quat_slerp(q[ix-1],q[ix],f)
        out[ch['target']['node']]=val
    if set(out) not in ({51,52,53},{51,52}):raise RuntimeError(f'Unexpected gait channels {set(out)}')
    return out


def skin_positions(g,src,frame_time):
    np=npmod();d=g.json;nodes=d['nodes'];w=node_worlds(d,animation_quaternions(g,frame_time));rest_inv=g.accessor(d['skins'][0]['inverseBindMatrices'])
    # Stored MAT4 is column-major; accessor must be transposed per joint.
    mats=np.stack([w[node_idx]@rest_inv[k].reshape(4,4).T for k,node_idx in enumerate(d['skins'][0]['joints'])])
    p=src['positions'];j=src['joints'].astype(int);weights=src['weights']
    coords=np.column_stack([p,np.ones(len(p))]);result=np.zeros((len(p),4),float)
    for slot in range(4):
        per=mats[j[:,slot]]
        result+=np.einsum('nij,nj->ni',per,coords)*weights[:,slot,None]
    # mesh node is attached to scene, usually world identity here
    return result[:,:3]


def image_rgba_texture(g):
    import io
    Image,_,_=pilmod();d=g.json
    p=d['meshes'][0]['primitives'][0];mat=d['materials'][p['material']]
    tid=mat['pbrMetallicRoughness']['baseColorTexture']['index'];image_idx=d['textures'][tid]['source'];im=d['images'][image_idx]
    bv=d['bufferViews'][im['bufferView']];encoded=bytes(g.bin[bv['byteOffset']:bv['byteOffset']+bv['byteLength']])
    return npmod().array(Image.open(io.BytesIO(encoded)).convert('RGB'))


def camera_frame(points,uv,faces,texture,camera,size,focus,scale):
    """Small NumPy/Pillow textured orthographic triangle z-buffer, GLB UV convention (V up)."""
    np=npmod();Image,_,_=pilmod();W,H=size
    eye=np.asarray(camera,float);focus=np.asarray(focus,float)
    view=(focus-eye);view/=np.linalg.norm(view)
    right=np.cross(view,[0,1,0]);right/=np.linalg.norm(right)
    up=np.cross(right,view);up/=np.linalg.norm(up)
    dp=points-focus
    sx=dp@right*scale+W/2;sy=H/2-dp@up*scale;z=dp@view
    out=np.full((H,W,3),[15,19,21],dtype=np.uint8);depth=np.full((H,W),np.inf,dtype=float)
    u=uv[:,0];v=uv[:,1] # Verified against source Meshy GLB: embedded bitmap uses this V orientation; do not flip again
    tw,th=texture.shape[1],texture.shape[0]
    uvx=np.clip(u*(tw-1),0,tw-1);uvy=np.clip(v*(th-1),0,th-1)
    # Triangles already triangulated; fail rather than remeshing source.
    for ai,bi,ci in faces:
        ai=int(ai);bi=int(bi);ci=int(ci)
        x0,y0=sx[ai],sy[ai];x1,y1=sx[bi],sy[bi];x2,y2=sx[ci],sy[ci]
        minx=max(0,int(math.floor(min(x0,x1,x2))));maxx=min(W-1,int(math.ceil(max(x0,x1,x2))))
        miny=max(0,int(math.floor(min(y0,y1,y2))));maxy=min(H-1,int(math.ceil(max(y0,y1,y2))))
        if minx>maxx or miny>maxy:continue
        area=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0)
        if abs(area)<1e-8:continue
        gx,gy=np.meshgrid(np.arange(minx,maxx+1),np.arange(miny,maxy+1))
        w1=((gx-x0)*(y2-y0)-(gy-y0)*(x2-x0))/area
        w2=((x1-x0)*(gy-y0)-(y1-y0)*(gx-x0))/area
        w0=1-w1-w2
        valid=(w0>=-1e-7)&(w1>=-1e-7)&(w2>=-1e-7)
        if not np.any(valid):continue
        zz=z[ai]*w0+z[bi]*w1+z[ci]*w2
        area_dep=depth[miny:maxy+1,minx:maxx+1]
        valid&=(zz<area_dep)
        if not np.any(valid):continue
        yy,xx=np.where(valid)
        pix_u=np.rint(w0[yy,xx]*uvx[ai]+w1[yy,xx]*uvx[bi]+w2[yy,xx]*uvx[ci]).astype(int)
        pix_v=np.rint(w0[yy,xx]*uvy[ai]+w1[yy,xx]*uvy[bi]+w2[yy,xx]*uvy[ci]).astype(int)
        # Slight ambient + diffuse per triangle; no change to texture asset.
        a=points[ai];b=points[bi];c=points[ci];norm=np.cross(b-a,c-a)
        nrm=np.linalg.norm(norm);cosv=abs(float(np.dot(norm, np.array([.3,.7,.6]))))/nrm if nrm>1e-8 else 1
        light=.78+.22*cosv
        colors=np.clip(texture[pix_v,pix_u]*light,0,255).astype(np.uint8)
        out[miny+yy,minx+xx]=colors;area_dep[yy,xx]=zz[yy,xx]
    return Image.fromarray(out)


def render_gif(g,data,config,outpath,num_frames=18,stage_label='Hip trim v03 | same v02 keyframes'):
    np=npmod();Image,ImageDraw,_=pilmod()
    UV=g.accessor(data['attrs']['TEXCOORD_0']);tex=image_rgba_texture(g)
    layouts=config['cameras'];panels=[]
    frames=[]
    h,w=355,1180
    for f in range(num_frames):
        t=f/num_frames
        pts=skin_positions(g,data,t)
        canvas=Image.new('RGB',(w,h),(12,16,18));draw=ImageDraw.Draw(canvas)
        for ix,cam in enumerate(layouts):
            pos=tuple(cam['center']);eye=tuple(cam['eye']);dims=(cam['w'],cam['h'])
            img=camera_frame(pts,UV,data['faces'],tex,eye,dims,pos,cam['scale'])
            x=ix*(cam['w']+10);canvas.paste(img,(x,26));draw.text((x+8,8),cam['label'],fill=(235,235,232))
        draw.text((10,h-16),f'HEADY 3D  |  {stage_label}  |  t={t:.2f}s',fill=(207,209,210))
        frames.append(canvas)
    # Save GIF with exact loop; no untrusted external encoder.
    outpath.parent.mkdir(parents=True,exist_ok=True)
    if outpath.exists():raise RuntimeError('GIF_COLLISION: already exists')
    tmp=outpath.with_name('.'+outpath.name)
    frames[0].save(tmp,format='GIF',save_all=True,append_images=frames[1:],duration=max(20,int(round(1000/num_frames))),loop=0,optimize=False)
    os.replace(tmp,outpath)
    return {'frames':len(frames),'width':w,'height':h,'sha256':digest_file(outpath)}


def defer_open_gif(path):
    """Explicit GIF MIME type. Success is dispatch, not proof the viewer appeared."""
    cmd=shutil.which('termux-open')
    if not cmd:return {'status':'UNAVAILABLE','reason':'termux-open executable not installed'}
    try:
        cp=subprocess.run([cmd,'--view','--content-type','image/gif',str(path)],timeout=25,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        return {'status':'REQUESTED' if cp.returncode==0 else 'FAIL','exit':cp.returncode,'stderr':cp.stderr[-400:]}
    except Exception as e:return {'status':'FAIL','reason':str(e)}


def _safe_copy_public(src, public_dir, source_hash):
    """Atomic, hash-verified, non-overwriting delivery to Android shared storage."""
    import stat
    public_dir=pathlib.Path(public_dir).expanduser()
    if not public_dir.is_dir():
        return {'status':'UNAVAILABLE','reason':'STORAGE_DIRECTORY_MISSING','directory':str(public_dir)}
    base=src.name
    candidate=public_dir/base
    if candidate.exists() and not candidate.is_file():
        return {'status':'FAIL','reason':'DESTINATION_NOT_FILE','path':str(candidate)}
    if candidate.is_file() and digest_file(candidate)!=source_hash:
        candidate=public_dir/(src.stem+'-'+source_hash[:12]+src.suffix)
    if candidate.is_file():
        if digest_file(candidate)!=source_hash:
            return {'status':'FAIL','reason':'DESTINATION_HASH_COLLISION','path':str(candidate)}
        return {'status':'VERIFIED_EXISTING','path':str(candidate),'sha256':source_hash,'bytes':src.stat().st_size}
    fd,tmp=tempfile.mkstemp(prefix='.heady-publish-',suffix='.tmp',dir=str(public_dir))
    try:
        with os.fdopen(fd,'wb') as dst, src.open('rb') as source:
            shutil.copyfileobj(source,dst,1024*1024)
            dst.flush();os.fsync(dst.fileno())
        if digest_file(tmp)!=source_hash:
            raise RuntimeError('PUBLICATION_STAGE_HASH_MISMATCH')
        # destination is absent, do not overwrite a concurrent unrelated file
        if candidate.exists():
            raise RuntimeError('PUBLICATION_RACE_COLLISION')
        os.replace(tmp,candidate)
        if digest_file(candidate)!=source_hash:
            raise RuntimeError('PUBLICATION_READBACK_MISMATCH')
        return {'status':'VERIFIED_NEW','path':str(candidate),'sha256':source_hash,'bytes':src.stat().st_size}
    except Exception as e:
        return {'status':'FAIL','reason':str(e),'path':str(candidate)}
    finally:
        if os.path.exists(tmp):os.unlink(tmp)


def _scan_public_file(path):
    """Request previous owner-approved Android scanner broadcast; do not assert indexed."""
    cmd=shutil.which('am')
    if not cmd:return {'status':'UNAVAILABLE','reason':'ANDROID_AM_MISSING'}
    try:
        uri='file://'+str(pathlib.Path(path).resolve())
        cp=subprocess.run([cmd,'broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d',uri],
                          timeout=12,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        return {'status':'REQUESTED' if cp.returncode==0 else 'FAIL',
                'exit':cp.returncode,'stderr':cp.stderr[-250:]}
    except Exception as e:return {'status':'FAIL','reason':str(e)}


def publish_existing_gif(gif):
    """No rerigging: read the existing GIF, publish to Pictures AND Downloads, request opening."""
    gif=pathlib.Path(gif)
    if not gif.is_file() or gif.stat().st_size==0:raise RuntimeError('PUBLISH_SOURCE_GIF_MISSING')
    Image,_,_=pilmod()
    with Image.open(gif) as im:
        if im.format!='GIF' or getattr(im,'n_frames',0)<5:
            raise RuntimeError('PUBLISH_SOURCE_GIF_INVALID')
        frame_count=im.n_frames
    source_hash=digest_file(gif)
    home=pathlib.Path.home()
    destinations={
        'Pictures':home/'storage'/'pictures',
        'Downloads':home/'storage'/'downloads',
    }
    copies={k:_safe_copy_public(gif,p,source_hash) for k,p in destinations.items()}
    media={k:_scan_public_file(v['path']) if v['status'].startswith('VERIFIED') else {'status':'SKIPPED'}
           for k,v in copies.items()}
    primary=next((v['path'] for k,v in copies.items() if k=='Pictures' and v['status'].startswith('VERIFIED')),None)
    if primary is None:
        primary=next((v['path'] for v in copies.values() if v['status'].startswith('VERIFIED')),None)
    opening=defer_open_gif(primary) if primary else {'status':'SKIPPED','reason':'NO_VERIFIED_PUBLIC_COPY'}
    result={'status':'PUBLICATION_VERIFIED' if all(v['status'].startswith('VERIFIED') for v in copies.values())
            else ('PARTIAL_PUBLICATION' if primary else 'FAIL'),
            'source_gif':str(gif),'source_sha256':source_hash,'frames':frame_count,
            'copies':copies,'media_index_requests':media,'open':opening,
            'viewer_visible':'UNVERIFIED_REQUIRES_OWNER'}
    return result


def write_receipt(info):
    OUTPUT_DIR.mkdir(parents=True,exist_ok=True)
    target=OUTPUT_DIR/'heady_hiptrim_v03_receipt.json'
    b=(json.dumps(info,indent=2,sort_keys=True)+'\n').encode()
    # receipt may change as execution goes; preserve previous revision before overwrite
    if target.exists():
        prev=target.read_bytes()
        if prev!=b:
            bk=OUTPUT_DIR/('receipt-backup-'+digest(prev)[:12]+'.json')
            atomic_bytes(bk,prev)
    fd,tmp=tempfile.mkstemp(dir=OUTPUT_DIR,prefix='.receipt-')
    with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
    os.replace(tmp,target)
    return target


def run(config,open_image=True,frames=None):
    np=npmod();validate_repo()
    ori=GLB(ASSET_DIR/'Meshy_AI_Character_output.glb');v02=GLB(ASSET_DIR/'Heady_SmartRig_visible_leg_scuttle_v02.glb')
    if digest(ori.raw)!=EXPECTED_ORIGINAL or digest(v02.raw)!=EXPECTED_V02:raise RuntimeError('SOURCE_HASH_MISMATCH')
    if len(v02.json.get('animations',[]))!=1:raise RuntimeError('V02_ANIMATION_UNEXPECTED')
    data=inspect_source(v02);ori_data=inspect_source(ori)
    if data['images']!=ori_data['images']:
        # Texture images can change order, but actual hash sets must be identical.
        if sorted(data['images'])!=sorted(ori_data['images']):raise RuntimeError('SOURCE_TEXTURES_DIFFER')
    mask,diag=directional_hip_mask(data,v02,config['hip_trim'])
    oldJ=data['joints'];oldW=data['weights'];skin=v02.json['skins'][0]['joints']
    target=skin.index(54)
    if diag['hip_skin_index']!=skin.index(53):raise RuntimeError('HIP_MAPPING_CHANGED')
    newJ,newW,edits,skipped=transfer_weight_to_parent(oldJ,oldW,mask,skin.index(53),target,config['hip_trim']['max_safe_slot_replacement'],allowed_ancestors=(skin.index(56),))
    if len(edits)<config['hip_trim']['min_edited_vertices']:raise RuntimeError('TOO_FEW_WEIGHT_EDITS')
    if len(skipped)>config['hip_trim']['max_skipped_vertices']:raise RuntimeError('TOO_MANY_UNSAFE_FULL_SLOTS')
    assert np.allclose(newW.sum(axis=1),1,atol=2e-6)
    assert np.all(newW>=0) and np.all(newW<=1+1e-6)
    touched=np.flatnonzero(np.any(oldJ!=newJ,axis=1)|np.any(abs(oldW-newW)>1e-8,axis=1))
    if not set(touched).issubset(set(np.flatnonzero(mask))):raise RuntimeError('UNRELATED_VERTEX_EDIT')
    out=bytearray(v02.raw)
    v02.put_accessor(out,data['attrs']['JOINTS_0'],newJ) if False else None
    ji=data['attrs']['JOINTS_0'];acc=v02.json['accessors'][ji];bv=v02.json['bufferViews'][acc['bufferView']]
    jo=v02.binst+bv['byteOffset']+acc.get('byteOffset',0)
    rawJ=newJ.astype('<u2' if acc['componentType']==5123 else 'u1').tobytes()
    if len(rawJ)!=acc['count']*4*(2 if acc['componentType']==5123 else 1):raise RuntimeError('Bad joints dtype')
    out[jo:jo+len(rawJ)]=rawJ
    v02.put_accessor(out,data['attrs']['WEIGHTS_0'],newW)
    verify_unchanged_except_weights(v02,out,data['attrs'],data['images'])
    repaired=GLB_bytes(out);repaired_data=inspect_source(repaired)
    if repaired_data['images']!=data['images']:raise RuntimeError('Source image changed')
    if repaired.json['animations']!=v02.json['animations']:raise RuntimeError('V02_ANIMATION_NOT_PRESERVED')
    OUTPUT_DIR.mkdir(parents=True,exist_ok=True)
    glbfile=OUTPUT_DIR/'Heady_hiptrim_v03_animated.glb'
    glb_result=atomic_bytes(glbfile,out)
    gif=OUTPUT_DIR/'Heady_hiptrim_v03_three_angle.gif'
    if not gif.exists():
        ginfo=render_gif(repaired,repaired_data,config,gif,num_frames=frames or config['gif_frames'])
    else:
        Image,_,_=pilmod();im=Image.open(gif)
        ginfo={'frames':getattr(im,'n_frames',1),'width':im.width,'height':im.height,'sha256':digest_file(gif),'reused':True}
    if ginfo['frames']!=(frames or config['gif_frames']):raise RuntimeError('GIF_FRAMECOUNT_MISMATCH')
    if ginfo['frames']<5:raise RuntimeError('GIF_RENDER_INCOMPLETE')
    publication=publish_existing_gif(gif) if open_image else {'status':'SKIPPED_FOR_TEST'}
    opening=publication['open'] if open_image else {'status':'SKIPPED_FOR_TEST'}
    receipt={'campaign':'heady_3d_v1','stage':'hip_trim_one_leg_v03','timestamp_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'original_sha256':EXPECTED_ORIGINAL,'v02_sha256':EXPECTED_V02,'output_glb':str(glbfile),'output_glb_sha256':digest_file(glbfile),'output_action':glb_result,'gif_path':str(gif),'gif':ginfo,'open':opening,'publication':publication,'bone_mapping':{'hip_node':53,'parent_node':54,'middle_node':52,'distal_node':51},'weight_diagnostics':diag,'edited_vertex_count':len(edits),'skipped_unsafe_slot_count':len(skipped),'first_skipped':skipped[:15],'max_removed_per_vertex':max(x['removed_hip'] for x in edits),'status':'CANDIDATE_AWAITING_HUMAN_REVIEW','no_hair_or_claw_edits':True,'animation_channels_preserved':True,'original_model_untouched':True}
    write_receipt(receipt)
    print('HEADY_3D_STAGE=CANDIDATE_AWAITING_HUMAN_REVIEW')
    print('EDITED_VERTICES='+str(len(edits)));print('SKIPPED_UNSAFE='+str(len(skipped)))
    print('OUTPUT_GLB='+str(glbfile));print('OUTPUT_GIF='+str(gif));print('GIF_FRAMES='+str(ginfo['frames']))
    print('OPEN='+opening['status']); print('RECEIPT='+str(OUTPUT_DIR/'heady_hiptrim_v03_receipt.json'))
    return receipt


def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['doctor','run','run-v03','run-v04','status','status-v04','resume','publish','hair','claws']);parser.add_argument('--no-open',action='store_true');parser.add_argument('--frames',type=int,default=None);args=parser.parse_args()
    if args.action in ('run-v04','run','resume'):
        if args.frames is not None and args.frames<8:raise SystemExit('TOO_FEW_FRAMES')
        run_v04(open_image=not args.no_open,frames=args.frames);return
    if args.action=='status-v04' or (args.action=='status' and (OUTPUT_DIR/'heady_socket_shaft_v04_receipt.json').exists()):
        path=OUTPUT_DIR/'heady_socket_shaft_v04_receipt.json'
        print(path.read_text() if path.is_file() else 'NOT_RUN');return
    if args.action in ('hair','claws'):raise SystemExit('DEFERRED_BY_CONTRACT: first slice is hip-only; hair/claw mutators are not enabled.')
    if args.action=='status':
        p=OUTPUT_DIR/'heady_hiptrim_v03_receipt.json';print(p.read_text() if p.exists() else 'NOT_RUN');return
    if args.action=='publish':
        validate_repo()
        receipt_file=OUTPUT_DIR/'heady_hiptrim_v03_receipt.json'
        if not receipt_file.is_file():raise RuntimeError('PUBLISH_REQUIRES_COMPLETED_DEVICE_RECEIPT')
        old_receipt=json.loads(receipt_file.read_text())
        if old_receipt.get('status')!='CANDIDATE_AWAITING_HUMAN_REVIEW':
            raise RuntimeError('PUBLISH_UNEXPECTED_RECEIPT_STATUS')
        source=OUTPUT_DIR/'Heady_hiptrim_v03_three_angle.gif'
        if str(source)!=old_receipt.get('gif_path'):
            raise RuntimeError('PUBLISH_RECEIPT_PATH_MISMATCH')
        if digest_file(source)!=old_receipt.get('gif',{}).get('sha256'):
            raise RuntimeError('PUBLISH_GIF_HASH_MISMATCH')
        result=publish_existing_gif(source)
        old_receipt['publication']=result
        write_receipt(old_receipt)
        print(json.dumps(result,indent=2,sort_keys=True))
        if result['status']=='FAIL':raise RuntimeError('PUBLICATION_FAILED')
        return
    validate_repo()
    for n,sha in [('Meshy_AI_Character_output.glb',EXPECTED_ORIGINAL),('Heady_SmartRig_visible_leg_scuttle_v02.glb',EXPECTED_V02)]:
        path=ASSET_DIR/n
        if not path.exists() or digest_file(path)!=sha:raise RuntimeError('Asset missing/hash mismatched: '+n)
    if args.action=='doctor':
        np=npmod();pilmod(); print('DOCTOR=PASS');print('REPO='+str(ROOT));print('NUMPY='+np.__version__);return
    cfg=json.loads(CONFIG.read_text());run(cfg,open_image=not args.no_open,frames=args.frames)


# ========== V04: USER-VERIFIED TWO-LINK LEG + BODY-BASE-PROTECTED SHAFT WEIGHTING ==========
# Invocation originally used on phone: bash ~/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_campaign.sh run-v04
# Source authority: original Meshy GLB + preserved v02 animation. v03 hip-trim is NOT used.
# Hair, claw, central body attachment and leg root caps are immutable in this stage.

def _rotation_z(theta):
    np=npmod();c,s=math.cos(theta),math.sin(theta)
    return np.array([[c,-s,0.0],[s,c,0.0],[0.0,0.0,1.0]],float)

def _matrix_to_quat(R):
    """xyzw unit quaternion from proper 3x3 rotation. Guard handedness."""
    np=npmod(); R=np.asarray(R,float)
    if np.linalg.det(R)<0.999 or np.linalg.det(R)>1.001:raise RuntimeError('BAD_ROTATION_OR_REFLECTION')
    t=float(np.trace(R))
    if t>0:
        s=math.sqrt(t+1.0)*2;w=.25*s;x=(R[2,1]-R[1,2])/s;y=(R[0,2]-R[2,0])/s;z=(R[1,0]-R[0,1])/s
    else:
        i=int(np.argmax(np.diag(R)))
        if i==0:
            s=math.sqrt(1+R[0,0]-R[1,1]-R[2,2])*2;x=.25*s;y=(R[0,1]+R[1,0])/s;z=(R[0,2]+R[2,0])/s;w=(R[2,1]-R[1,2])/s
        elif i==1:
            s=math.sqrt(1+R[1,1]-R[0,0]-R[2,2])*2;y=.25*s;x=(R[0,1]+R[1,0])/s;z=(R[1,2]+R[2,1])/s;w=(R[0,2]-R[2,0])/s
        else:
            s=math.sqrt(1+R[2,2]-R[0,0]-R[1,1])*2;z=.25*s;x=(R[0,2]+R[2,0])/s;y=(R[1,2]+R[2,1])/s;w=(R[1,0]-R[0,1])/s
    q=np.asarray([x,y,z,w],float);return q/np.linalg.norm(q)

def _point_line_cylinder(P,A,B,axial_min,axial_max,radius):
    """Finite interior of physical bone shaft, not root and not joint cap."""
    np=npmod();v=B-A;length=np.linalg.norm(v)
    if length<.08:raise RuntimeError('BONE_LINK_TOO_SHORT_FOR_CYLINDER')
    t=(P-A)@v/(v@v)
    proj=A+np.clip(t,0,1)[:,None]*v
    radius_arr=np.linalg.norm(P-proj,axis=1)
    return (t>=axial_min)&(t<=axial_max)&(radius_arr<=radius),t,radius_arr

def identify_protected_leg_shafts(g,data):
    """Only two VERIFIED separately connected leg islands; no body base changes.

    Bone_007→006→005 = front neighboring leg; Bone_028→027→026 = second.
    Bone_034 is a fixed body-to-socket brace for TARGET leg 033→032.
    All glTF node ids here are locked to exact source hashes; fail on ambiguity.
    """
    np=npmod();P=data['positions'];J=data['joints'].astype(int);W=data['weights'];d=g.json
    joints=d['skins'][0]['joints'];comp=connected_components(build_welded_adjacency(P,data['faces']))
    world=node_worlds(d)
    groups=[{'name':'front_neighbor','nodes':(26,25,24),'foreign':(53,52,51,47,46,45)},
            {'name':'second_neighbor','nodes':(47,46,45),'foreign':(53,26,25,24)}]
    output=[];used=set(); all_approved=set()
    for group in groups:
        root,mid,dist=group['nodes'];family_idx=[joints.index(n) for n in group['nodes']]
        scores=[]
        for ix,component in enumerate(comp):
            if len(component)<100:continue
            vs=np.asarray(sorted(component),int)
            own_weight=(W[vs]*np.isin(J[vs],family_idx)).sum()
            scores.append((float(own_weight)/len(vs),ix,vs))
        candidates=sorted(scores,reverse=True)
        if not candidates or candidates[0][0]<.70 or candidates[0][1] in used:
            raise RuntimeError(f'NO_UNIQUE_OWNER_ISLAND: {group["name"]}')
        dominance,comp_id,verts=candidates[0]
        if len(candidates)>1 and candidates[1][0]>.70:raise RuntimeError(f'MULTIPLE_OWNER_ISLANDS_{group["name"]}')
        used.add(comp_id)
        points=P[verts]
        root_xyz=world[root][:3,3];mid_xyz=world[mid][:3,3];dist_xyz=world[dist][:3,3]
        # First link: only its far half. Second link: exclude first/last 18% caps.
        first,_,_=_point_line_cylinder(points,root_xyz,mid_xyz,.55,.92,.12)
        second,_,_=_point_line_cylinder(points,mid_xyz,dist_xyz,.18,.88,.12)
        # Second independent BODY-BASE GUARD: physical distance from owner root >=0.23.
        safe=(first|second)&(np.linalg.norm(points-root_xyz,axis=1)>.23)
        own_weight_each=(W[verts]*np.isin(J[verts],family_idx)).sum(axis=1)
        safe&=(own_weight_each>=.25)
        foreign_idx=[joints.index(n) for n in group['foreign']]
        foreign_each=(W[verts]*np.isin(J[verts],foreign_idx)).sum(axis=1)
        affected=verts[safe & (foreign_each>1e-7)]
        if not len(affected):raise RuntimeError(f'NO_ISOLATED_SHAFT_CONTAMINATION: {group["name"]}')
        if len(affected)>80:raise RuntimeError('SHAFT_MASK_TOO_BROAD')
        # Guard: group is an isolated leg component, never torso/head/claw.
        if set(int(k) for k in affected)&all_approved:raise RuntimeError('OVERLAPPING_LEG_ISLANDS')
        all_approved.update(int(k) for k in affected)
        output.append({'name':group['name'],'nodes':group['nodes'],'component':comp_id,
            'size':len(verts),'ownership_fraction':dominance,'vertices':affected,
            'family_indices':family_idx,'foreign_indices':foreign_idx,'root_xyz':root_xyz.tolist(),
            'protected_body_base_distance':.23,
            'shaft_radius':.12,'shaft_t_first':[.55,.92],'shaft_t_second':[.18,.88],
            'foreign_weight_before':float(foreign_each[safe].sum())})
    return output

def isolate_leg_weight_families(data,source,groups):
    """Remove foreign influences only in certified shaft; keep totals and 4 slots.
    Incoming foreign weights are added to an ALREADY PRESENT owner-family slot.
    Root/body/socket and all other vertices remain byte-for-byte unchanged.
    """
    np=npmod();J=data['joints'].copy();W=data['weights'].copy()
    edits=[];approved=set();old_sum=np.asarray(W.sum(axis=1))
    for group in groups:
        family=set(group['family_indices']);foreign=set(group['foreign_indices'])
        for i in map(int,group['vertices']):
            if i in approved:raise RuntimeError('DOUBLE_WEIGHT_EDIT')
            approved.add(i)
            ids=J[i].astype(int);ww=W[i].astype(float)
            owner=[k for k in range(4) if ids[k] in family and ww[k]>.00001]
            foreign_slots=[k for k in range(4) if ids[k] in foreign and ww[k]>1e-7]
            if not owner or not foreign_slots:raise RuntimeError('MISSING_OWNER_OR_FOREIGN_SLOT')
            # All foreign weight into strongest already-present natural owner.
            keep=max(owner,key=lambda k:ww[k]);removed=float(sum(ww[k] for k in foreign_slots))
            if removed>0.75:raise RuntimeError('SUSPICIOUSLY_LARGE_FOREIGN_INFLUENCE')
            ww[keep]+=removed
            for j in foreign_slots:ww[j]=0.0
            if abs(ww.sum()-old_sum[i])>1e-6 or np.min(ww)<0:raise RuntimeError('WEIGHT_SUM_CHANGED')
            W[i]=ww;edits.append({'vertex':i,'leg':group['name'],'removed_foreign':removed,
                                      'owner_joint':int(ids[keep]), 'foreign_joint_slots':[(int(ids[j]),float(data['weights'][i,j])) for j in foreign_slots]})
    expected=np.asarray(sorted(approved),dtype=int)
    diff=np.flatnonzero(np.any(np.abs(W-data['weights'])>1e-8,axis=1))
    if not np.array_equal(diff,expected):raise RuntimeError('OUTSIDE_SHAFT_WEIGHT_CHANGE')
    if np.any(J!=data['joints']):raise RuntimeError('JOINT_ID_CHANGED')
    if np.max(np.abs(W.sum(axis=1)-1))>2e-6:raise RuntimeError('NON_NORMALIZED_RESULT')
    return J,W,edits

def solve_two_link_fixed_socket(g,data):
    """2-link XY analytical IK for exact source leg, 30fps periodic clip.
    Desired toe path takes old lateral stance/swing rhythm; shrinks stride to reachable
    socket-fixed workspace. Bone_034 is never animated or repositioned.
    """
    np=npmod();d=g.json;world=node_worlds(d)
    socket=world[52][:3,3].copy();elbow=world[51][:3,3].copy()
    skin=d['skins'][0]['joints'];bone_idx=skin.index(51)
    distal_weights=(data['weights']*(data['joints']==bone_idx)).sum(axis=1)
    choices=np.flatnonzero(distal_weights>.75)
    if len(choices)<10:raise RuntimeError('TOE_WITNESS_NOT_LOCALIZED')
    inverse=np.linalg.inv(world[51]); local=(np.column_stack((data['positions'][choices],np.ones(len(choices))))@inverse.T)[:,:3]
    toe_vertex=int(choices[np.argmax(local[:,1])]);toe_rest=data['positions'][toe_vertex]
    L1=np.linalg.norm((elbow-socket)[:2]);L2=np.linalg.norm((toe_rest-elbow)[:2])
    if not (.20<L1<.40 and .18<L2<.33):raise RuntimeError('TWO_LINK_LENGTH_MISMATCH')
    ang1rest=math.atan2((elbow-socket)[1],(elbow-socket)[0]);ang2rest=math.atan2((toe_rest-elbow)[1],(toe_rest-elbow)[0])
    times=g.accessor(d['animations'][0]['samplers'][0]['input']).ravel().copy()
    if len(times)!=31 or abs(times[-1]-1)>1e-5:raise RuntimeError('UNEXPECTED_V02_TIME_GRID')
    # Distal toe witness is evaluated through actual skinning, not a generic bbox center.
    old=np.asarray([skin_positions(g,data,float(t)%1)[toe_vertex] for t in times[:-1]])
    phase=times[:-1];old_center=float(np.median(old[:,0]));
    # Shorten horizontal stride and offset to be reachable with STRUCTURAL socket fixed.
    target_x=float(socket[0]+.11)+.64*(old[:,0]-old_center)
    # Correct planted contact height, preserve lift/recovery order and timings.
    target_y=np.full(len(phase),.012,dtype=float)
    swing=phase>=.64
    target_y[swing]=.012+.064*np.sin(np.pi*(phase[swing]-.64)/.36)
    rest53=np.asarray(d['nodes'][53].get('rotation',[0,0,0,1]),float)
    out52=[];out51=[];metrics=[]
    for t,x,y in zip(phase,target_x,target_y):
        dx,dy=float(x-socket[0]),float(y-socket[1]);r=math.hypot(dx,dy)
        maxreach=L1+L2-.006
        if r>maxreach:
            # Preserve contact Y preferentially: shorten X toward socket.
            excess=math.sqrt(max(0,maxreach*maxreach-dy*dy))
            dx=math.copysign(min(abs(dx),excess),dx);r=math.hypot(dx,dy)
        if r>maxreach+1e-6 or r<abs(L1-L2)+.006:raise RuntimeError('UNREACHABLE_TWO_LINK_GOAL')
        a=(L1*L1-L2*L2+r*r)/(2*r)
        h=math.sqrt(max(0,L1*L1-a*a))
        base=np.asarray([socket[0]+a*dx/r,socket[1]+a*dy/r])
        perp=np.asarray([-dy/r,dx/r])
        elbow_options=[base+h*perp,base-h*perp]
        # Positive/bent-outward elbow branch matches original crab-leg rest configuration.
        selected=min(elbow_options,key=lambda e:np.linalg.norm(e-elbow[:2]))
        a1=math.atan2(selected[1]-socket[1],selected[0]-socket[0])
        a2=math.atan2(y-selected[1],x-selected[0])
        R52=_rotation_z(a1-ang1rest)@world[52][:3,:3]
        R51=_rotation_z(a2-ang2rest)@world[51][:3,:3]
        q52=_matrix_to_quat(world[53][:3,:3].T@R52)
        q51=_matrix_to_quat(R52.T@R51)
        out52.append(q52);out51.append(q51)
        metrics.append({'t':round(float(t),4),'x':float(x),'y':float(y),'reachable_distance':r})
    out52=np.asarray(out52);out51=np.asarray(out51)
    # Adjacent quaternions must maintain continuous short-path interpolation.
    for q in (out52,out51):
        for i in range(1,len(q)):
            if np.dot(q[i],q[i-1])<0:q[i]*=-1
    out52=np.vstack([out52,out52[0]]).astype('<f4');out51=np.vstack([out51,out51[0]]).astype('<f4')
    return {52:out52,51:out51}, {'toe_witness_vertex':toe_vertex,'two_link_length_xy':[float(L1),float(L2)],
        'fixed_socket_xyz':socket.tolist(),'target_toe_xy':metrics,'stance_fraction':.64,'swing_fraction':.36,
        'old_toe_x_range':[float(old[:,0].min()),float(old[:,0].max())],
        'old_toe_y_range':[float(old[:,1].min()),float(old[:,1].max())]}

def _repack_glb(g,binbytes,document):
    js=json.dumps(document,separators=(',',':'),ensure_ascii=False).encode('utf8')
    js+=b' '*((-len(js))%4)
    binary=bytes(binbytes)
    if len(binary)%4:raise RuntimeError('BIN_NOT_ALIGNED')
    total=12+8+len(js)+8+len(binary)
    return struct.pack('<4sII',b'glTF',2,total)+struct.pack('<II',len(js),J_CHUNK)+js+struct.pack('<II',len(binary),B_CHUNK)+binary

def _patch_v04_glb(g,src,weights,rotation,original_hashes):
    np=npmod();doc=json.loads(json.dumps(g.json))
    raw=bytearray(g.raw)
    # Only skin weights, and only animation outputs for Bone_033 and Bone_032.
    g.put_accessor(raw,src['attrs']['WEIGHTS_0'],weights)
    for channel in doc['animations'][0]['channels']:
        target=channel['target']['node']
        if target in (51,52):
            sampler=doc['animations'][0]['samplers'][channel['sampler']]
            g.put_accessor(raw,sampler['output'],rotation[target])
    # Remove the structural support bone from ALL animation channels; it stays at rest.
    doc['animations'][0]['channels']=[ch for ch in doc['animations'][0]['channels'] if ch['target']['node']!=53]
    if {x['target']['node'] for x in doc['animations'][0]['channels']}!={51,52}:raise RuntimeError('ANIMATION_CHANNELS_NOT_TWO_LINK')
    out=_repack_glb(g,raw[g.binst:g.binst+g.binsize],doc)
    actual=GLB_bytes(out);check=inspect_source(actual)
    if check['images']!=original_hashes:raise RuntimeError('TEXTURES_CHANGED')
    if not np.array_equal(check['positions'],src['positions']):raise RuntimeError('MESH_CHANGED')
    if not np.array_equal(check['joints'],src['joints']):raise RuntimeError('JOINTS_CHANGED')
    if not np.allclose(check['weights'],weights,atol=1e-7):raise RuntimeError('WEIGHTS_READBACK_DIFFER')
    # Byte diff in binary restricted to two animation float arrays and WEIGHTS_0.
    source_bytes=bytes(g.bin);new_bytes=bytes(actual.bin)
    allowed=np.zeros(len(source_bytes),bool)
    permit=[src['attrs']['WEIGHTS_0']]
    for ch in doc['animations'][0]['channels']:
        permit.append(doc['animations'][0]['samplers'][ch['sampler']]['output'])
    for accessor_id in permit:
        acc=g.json['accessors'][accessor_id];view=g.json['bufferViews'][acc['bufferView']]
        start=view.get('byteOffset',0)+acc.get('byteOffset',0)
        end=start+acc['count']*4*4
        allowed[start:end]=True
    from_bytes=np.frombuffer(source_bytes,dtype='u1');to_bytes=np.frombuffer(new_bytes,dtype='u1')
    if not np.array_equal(from_bytes[~allowed],to_bytes[~allowed]):raise RuntimeError('UNAUTHORIZED_BINARY_CHANGE')
    if g.json['skins']!=actual.json['skins'] or g.json['nodes']!=actual.json['nodes']:raise RuntimeError('ARMATURE_REST_CHANGED')
    return out,actual,check

def write_v04_receipt(r):
    out=OUTPUT_DIR/'heady_socket_shaft_v04_receipt.json';out.parent.mkdir(parents=True,exist_ok=True)
    data=(json.dumps(r,indent=2,sort_keys=True)+'\n').encode()
    if out.exists():
        before=out.read_bytes()
        if before!=data:
            atomic_bytes(OUTPUT_DIR/('heady_v04_receipt_backup_'+digest(before)[:12]+'.json'),before)
    fd,tmp=tempfile.mkstemp(prefix='.heady-receipt-',dir=str(out.parent))
    with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
    os.replace(tmp,out)
    return out

def run_v04(open_image=True,frames=None):
    np=npmod();validate_repo()
    orig=GLB(ASSET_DIR/'Meshy_AI_Character_output.glb');g=GLB(ASSET_DIR/'Heady_SmartRig_visible_leg_scuttle_v02.glb')
    if digest(orig.raw)!=EXPECTED_ORIGINAL or digest(g.raw)!=EXPECTED_V02:raise RuntimeError('SOURCE_LOCK_MISMATCH')
    source=inspect_source(g);orig_source=inspect_source(orig)
    if sorted(source['images'])!=sorted(orig_source['images']):raise RuntimeError('SOURCE_TEXTURE_HASHES_CHANGED')
    if [g.json['nodes'][i].get('name') for i in (53,52,51,26,25,24,47,46,45)]!=['Bone_034','Bone_033','Bone_032','Bone_007','Bone_006','Bone_005','Bone_028','Bone_027','Bone_026']:
        raise RuntimeError('JOINT_NAME_MAPPING_CHANGED')
    groups=identify_protected_leg_shafts(g,source)
    newJ,newW,edits=isolate_leg_weight_families(source,g,groups)
    rotation,ik=solve_two_link_fixed_socket(g,source)
    payload,preview,preview_data=_patch_v04_glb(g,source,newW,rotation,source['images'])
    # Mechanical animation acceptance: true socket at Bone_033 head stays fixed.
    times=g.accessor(g.json['animations'][0]['samplers'][0]['input']).ravel()
    sockets=[]; toe_poses=[];toe_vertex=ik['toe_witness_vertex'];other_leg_movement=[]
    initial_pos=skin_positions(preview,preview_data,0.0)
    for t in times[:-1]:
        quat=animation_quaternions(preview,float(t))
        worlds=node_worlds(preview.json,quat)
        sockets.append(worlds[52][:3,3])
        pose=skin_positions(preview,preview_data,float(t))
        toe_poses.append(pose[toe_vertex]);
        if float(t)>0:other_leg_movement.append(float(np.linalg.norm(pose[groups[0]['vertices']]-initial_pos[groups[0]['vertices']],axis=1).max()))
    sockets=np.asarray(sockets);toe_poses=np.asarray(toe_poses)
    max_socket=float(np.linalg.norm(sockets-sockets[0],axis=1).max())
    if max_socket>1e-6:raise RuntimeError('SOCKET_MOVED_DESPITE_LOCK')
    if not np.all(np.isfinite(toe_poses)):raise RuntimeError('TOE_NAN')
    # no toe flying into the sky or implausible floor penetration
    if toe_poses[:,1].max()>.16 or toe_poses[:,1].min()<-.11:raise RuntimeError('TOE_PATH_OUTSIDE_SAFETY_BOUNDS')
    count=int(frames or 18)
    OUTPUT_DIR.mkdir(parents=True,exist_ok=True)
    glb=OUTPUT_DIR/'Heady_two_link_shaft_isolation_v04.glb'
    action=atomic_bytes(glb,payload)
    gif=OUTPUT_DIR/'Heady_two_link_shaft_isolation_v04_three_angle.gif'
    if gif.exists():
        Image,_,_=pilmod();im=Image.open(gif)
        if im.format!='GIF' or im.n_frames!=count:raise RuntimeError('GIF_OUTPUT_COLLISION')
        gif_info={'frames':im.n_frames,'width':im.width,'height':im.height,'sha256':digest_file(gif),'reused':True}
    else:
        config=json.loads(CONFIG.read_text())
        gif_info=render_gif(preview,preview_data,config,gif,num_frames=count,
                 stage_label='v04 fixed socket | two moving links | isolated shaft weights')
    published=publish_existing_gif(gif) if open_image else {'status':'SKIPPED_FOR_TEST'}
    receipt={'campaign':'heady_3d_v04','stage':'fixed_socket_two_link_shaft_weight_isolation',
             'timestamp_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
             'status':'CANDIDATE_AWAITING_HUMAN_REVIEW','original_source_sha256':EXPECTED_ORIGINAL,
             'source_v02_sha256':EXPECTED_V02,'output_glb':str(glb),'output_glb_sha256':digest_file(glb),
             'output_glb_action':action,'gif_path':str(gif),'gif':gif_info,'publication':published,
             'socket_displacement_max':max_socket,'bone_034_animation_removed':True,
             'animated_bone_nodes':[52,51],'leg_ownership_islands':[{k:v for k,v in g0.items() if k!='vertices' and k!='family_indices' and k!='foreign_indices'}|{'edited_vertex_count':sum(e['leg']==g0['name'] for e in edits)} for g0 in groups],
             'edited_vertex_count':len(edits),'foreign_weight_removed_total':sum(e['removed_foreign'] for e in edits),
             'body_base_protected':True,'protected_regions':['body','socket','root cap','ambiguous islands','hair','claws'],
             'toe_witness_position_y_range':[float(toe_poses[:,1].min()),float(toe_poses[:,1].max())],
             'foot_witness_x_range':[float(toe_poses[:,0].min()),float(toe_poses[:,0].max())],
             'max_other_leg_shaft_displacement':max(other_leg_movement) if other_leg_movement else 0,
             'ik':ik,'no_original_assets_modified':True,'no_hair_or_claw_edits':True,
             'human_review':'PENDING'}
    write_v04_receipt(receipt)
    print('V04_STATUS=CANDIDATE_AWAITING_HUMAN_REVIEW')
    print('BODY_BASE_PROTECTED=TRUE')
    print('BONE_034_SOCKET_DISPLACEMENT_MAX='+str(max_socket))
    print('SHAFT_VERTICES_REASSIGNED='+str(len(edits)))
    print('GLB='+str(glb));print('GIF='+str(gif));print('PUBLICATION='+published['status'])
    print('RECEIPT='+str(OUTPUT_DIR/'heady_socket_shaft_v04_receipt.json'))
    return receipt

if __name__=='__main__':
    try:main()
    except Exception as e:
        print('CAMPAIGN_FAIL='+str(e),file=sys.stderr);traceback.print_exc();sys.exit(1)
