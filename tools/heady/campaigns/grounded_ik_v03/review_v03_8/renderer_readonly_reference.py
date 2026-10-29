#!/usr/bin/env python3
# ORIGINAL PHONE INVOCATION (first campaign install/run, from ANY Termux directory):
# python - <<'PYBOOT' ... verified ZIP downloads + exec(zipfile.read('INSTALL_AND_RUN.py')) ... PYBOOT
# FUTURE RUNS: bash ~/storage/documents/GodotProjects/pose-lab-v2/tools/campaigns/heady_3d_newrig.sh
# HEADY v05, 52-joint anatomical rig. Do not run older 57-joint v03/v04 patches.
# ONE persistent all-functions 3D campaign engine, includes deferred/guarded weight helpers.
# Git commits local, allowlisted, between VERIFIED material steps; NEVER push.
from __future__ import annotations
import argparse, copy, hashlib, io, json, math, os, pathlib, shutil, struct, subprocess, sys, time, traceback
import numpy as np
from PIL import Image, ImageDraw
HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE  # standalone read-only raster helper; no repo assumption
ASSET=HERE/'assets/Heady_52_joint_source.glb'
CONF=HERE/'config.json'
OUTPUT=HERE/'output'
EXPECTED_SHA='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
FAMILIES={
 'left_front':['Bone_007','Bone_006','Bone_005'],
 'left_middle':['Bone_013','Bone_012','Bone_011'],
 'left_rear':['Bone_021','Bone_020','Bone_019','Bone_018'],
 'right_front':['Bone_024','Bone_023','Bone_022'],
 'right_middle':['Bone_010','Bone_009','Bone_008'],
 'right_rear':['Bone_017','Bone_016','Bone_015','Bone_014']}
ANIM_NAME='HEADY_V05_RightMiddle_OneLeg_ContactStudy'
PACKET_REL='tools/heady/campaigns/heady-newrig-v05'
MODEL_REL=PACKET_REL+'/output/Heady_52_newrig_right_middle_oneleg_v05.glb'
GIF_REL=PACKET_REL+'/output/Heady_52_newrig_right_middle_oneleg_v05.gif'
DIAG_REL=PACKET_REL+'/output/diagnostics.json'
RECEIPT_REL=PACKET_REL+'/output/completion_receipt.json'

def sha(b):return hashlib.sha256(b).hexdigest()
def sha_file(p):return sha(pathlib.Path(p).read_bytes())
def json_bytes(v):return (json.dumps(v,sort_keys=True,indent=2)+'\n').encode()
def assert_true(cond,msg):
 if not cond:raise RuntimeError(msg)
def safe_write(path,blob):
 path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():
  assert_true(path.read_bytes()==blob,'CONFLICT_EXISTING_FILE: '+str(path))
  return 'REUSED'
 temp=path.with_name('.'+path.name+'.tmp-'+str(os.getpid()))
 try:
  with temp.open('xb') as f:f.write(blob);f.flush();os.fsync(f.fileno())
  os.replace(temp,path)
 finally:temp.unlink(missing_ok=True)
 return 'CREATED'

def git(*args,check=True):
 return subprocess.run(['git','-C',str(ROOT),*args],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=check)
def validate_repo():
 for path in ['AGENTS.md','motion.html','scripts/build.mjs','docs/POSE_LAB_CAMPAIGN_RULES.md','docs/POSE_IS_GOD.md','docs/POSE_CAMPAIGN_FRAMEWORK.md']:
  assert_true((ROOT/path).is_file(),'WRONG_POSE_LAB_ROOT: '+str(ROOT/path))
 assert_true((ROOT/'.git').exists(),'NOT_A_GIT_CHECKOUT')
 assert_true(pathlib.Path(git('rev-parse','--show-toplevel').stdout.strip()).resolve()==ROOT.resolve(),'GIT_ROOT_MISMATCH')
 assert_true('pose-lab-v2'==ROOT.name,'TARGET_REPO_NAME_MISMATCH')
 assert_true(git('diff','--cached','--quiet',check=False).returncode==0,'UNRELATED_STAGED_CHANGES: STOP_NO_COMMIT')
 assert_true(git('var','GIT_AUTHOR_IDENT',check=False).returncode==0,'GIT_AUTHOR_IDENTITY_MISSING')

def commit_only(paths,subject):
 validate_repo()
 norm=[]
 for p in paths:
  assert_true(p.startswith(PACKET_REL+'/') or p=='tools/campaigns/heady_3d_newrig.sh','NOT_ALLOWED_TO_STAGE: '+p)
  assert_true((ROOT/p).is_file(),'MISSING_COMMIT_INPUT: '+p)
  norm.append(p)
 subprocess.run(['git','-C',str(ROOT),'add','--',*norm],check=True)
 staged=git('diff','--cached','--name-only','-z').stdout.split('\0')
 assert_true(set(filter(None,staged)).issubset(set(norm)),'STAGED_SCOPE_BREACH')
 if not list(filter(None,staged)):
  return {'status':'UNCHANGED','head':git('rev-parse','HEAD').stdout.strip()}
 result=git('commit','-m',subject,check=False)
 if result.returncode!=0:raise RuntimeError('LOCAL_COMMIT_FAILED: '+result.stderr.strip()[-700:])
 head=git('rev-parse','HEAD').stdout.strip()
 return {'status':'LOCAL_COMMIT_CREATED','head':head,'paths':list(filter(None,staged))}

class GLB:
 def __init__(self,raw):
  self.raw=bytes(raw)
  assert_true(len(self.raw)>28,'GLB_TOO_SMALL')
  magic,version,length=struct.unpack_from('<4sII',self.raw)
  assert_true(magic==b'glTF' and version==2 and length==len(self.raw),'INVALID_GLB_HEADER')
  jlen,jtype=struct.unpack_from('<II',self.raw,12)
  assert_true(jtype==0x4e4f534a,'NO_GLB_JSON')
  self.d=json.loads(self.raw[20:20+jlen]);self.binheader=20+jlen
  blen,btype=struct.unpack_from('<II',self.raw,self.binheader)
  assert_true(btype==0x004e4942,'NO_GLB_BIN')
  self.bstart=self.binheader+8
  assert_true(self.bstart+blen==len(self.raw),'BIN_SIZE_MISMATCH')
  self.blob=self.raw[self.bstart:]
 def accessor(self,index):
  a=self.d['accessors'][index];v=self.d['bufferViews'][a['bufferView']]
  assert_true(not a.get('sparse') and 'byteStride' not in v,'UNSUPPORTED_ACCESSOR_LAYOUT')
  types={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}
  n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  offset=v.get('byteOffset',0)+a.get('byteOffset',0)
  return np.frombuffer(self.blob,dtype=types[a['componentType']],count=n*a['count'],offset=offset).reshape(-1,n).copy()
 def with_animation(self,channels):
  assert_true(not self.d.get('animations'),'SOURCE_HAS_PREEXISTING_ANIMATION')
  document=copy.deepcopy(self.d);binary=bytearray(self.blob)
  samplers=[];links=[]
  for node_idx,quats in sorted(channels.items()):
   assert_true(quats.shape==(19,4),'EXPECTED_19_QUAT_KEYS')
   for kind,arr,typ in [('input',np.linspace(0,1,19,dtype='<f4'),'SCALAR'),('output',quats.astype('<f4'),'VEC4')]:
    while len(binary)%4:binary.append(0)
    offset=len(binary);payload=arr.tobytes();binary.extend(payload)
    document['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload)})
    document['accessors'].append({'bufferView':len(document['bufferViews'])-1,'byteOffset':0,'componentType':5126,'count':len(arr),'type':typ})
    if kind=='input':timeref=len(document['accessors'])-1
    else:qref=len(document['accessors'])-1
   samplers.append({'input':timeref,'output':qref,'interpolation':'LINEAR'})
   links.append({'sampler':len(samplers)-1,'target':{'node':int(node_idx),'path':'rotation'}})
  document['animations']=[{'name':ANIM_NAME,'channels':links,'samplers':samplers}]
  document['buffers'][0]['byteLength']=len(binary)
  js=json.dumps(document,separators=(',',':'),ensure_ascii=False).encode()
  js+=b' ' * (-len(js)%4)
  binary.extend(b'\0'*(-len(binary)%4))
  output=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))
  output+=struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
  new=GLB(output)
  assert_true(new.blob.startswith(self.blob),'ORIGINAL_BINARY_CHANGED')
  for key in self.d:
   if key in ('animations','accessors','bufferViews','buffers'):continue
   assert_true(new.d[key]==self.d[key],'SOURCE_JSON_SECTION_CHANGED_'+key)
  return new

def quat_matrix(q):
 x,y,z,w=map(float,q);n=x*x+y*y+z*z+w*w
 assert_true(n>0,'INVALID_QUAT')
 s=2/n;xx,yy,zz=x*x*s,y*y*s,z*z*s;xy,xz,yz=x*y*s,x*z*s,y*z*s;wx,wy,wz=w*x*s,w*y*s,w*z*s
 return np.array([[1-yy-zz,xy-wz,xz+wy],[xy+wz,1-xx-zz,yz-wx],[xz-wy,yz+wx,1-xx-yy]],float)
def matrix_quat(r):
 r=np.asarray(r,float);trace=np.trace(r)
 if trace>0:
  s=math.sqrt(trace+1)*2;w=.25*s;x=(r[2,1]-r[1,2])/s;y=(r[0,2]-r[2,0])/s;z=(r[1,0]-r[0,1])/s
 else:
  i=np.argmax(np.diag(r));
  if i==0:
   s=math.sqrt(1+r[0,0]-r[1,1]-r[2,2])*2;x=.25*s;y=(r[0,1]+r[1,0])/s;z=(r[0,2]+r[2,0])/s;w=(r[2,1]-r[1,2])/s
  elif i==1:
   s=math.sqrt(1+r[1,1]-r[0,0]-r[2,2])*2;y=.25*s;x=(r[0,1]+r[1,0])/s;z=(r[1,2]+r[2,1])/s;w=(r[0,2]-r[2,0])/s
  else:
   s=math.sqrt(1+r[2,2]-r[0,0]-r[1,1])*2;z=.25*s;x=(r[0,2]+r[2,0])/s;y=(r[1,2]+r[2,1])/s;w=(r[1,0]-r[0,1])/s
 q=np.array([x,y,z,w],float);return q/np.linalg.norm(q)
def rotz(theta):
 c,s=math.cos(theta),math.sin(theta);return np.array([[c,-s,0],[s,c,0],[0,0,1]],float)
def local(n,override=None):
 assert_true('matrix' not in n,'MATRIX_NODES_UNSUPPORTED')
 M=np.eye(4);M[:3,:3]=quat_matrix(n.get('rotation',[0,0,0,1]) if override is None else override)@np.diag(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
def worlds(doc,overrides=None):
 nodes=doc['nodes'];parent={}
 for p,n in enumerate(nodes):
  for child in n.get('children',[]):
   assert_true(child not in parent,'DUPLICATE_PARENT');parent[child]=p
 cache={};overrides=overrides or {}
 def get(i):
  if i not in cache:cache[i]=((get(parent[i]) if i in parent else np.eye(4))@local(nodes[i],overrides.get(i)))
  return cache[i]
 return [get(i) for i in range(len(nodes))]
def inspect_model(g):
 d=g.d;assert_true(len(d['skins'])==1 and len(d['skins'][0]['joints'])==52,'NOT_52_JOINT_AUTHORITY')
 assert_true(len(d['meshes'])==1 and len(d['meshes'][0]['primitives'])==1,'UNEXPECTED_MESH_GRAIN')
 p=d['meshes'][0]['primitives'][0];a=p['attributes'];P=g.accessor(a['POSITION']);J=g.accessor(a['JOINTS_0']).astype(int);W=g.accessor(a['WEIGHTS_0']).astype(float);F=g.accessor(p['indices']).ravel().reshape(-1,3)
 assert_true(len(P)==9021 and len(F)==7277,'SOURCE_GEOMETRY_COUNT_MISMATCH')
 assert_true(np.max(np.abs(W.sum(axis=1)-1))<1e-5,'NONNORMALIZED_WEIGHTS')
 assert_true(np.min(W)>=0 and np.max(J)<52,'SKIN_INVALID')
 name_to_node={d['nodes'][i].get('name'):i for i in d['skins'][0]['joints']}
 for fam in FAMILIES.values():
  assert_true(all(n in name_to_node for n in fam),'MISSING_LEG_BONES')
 return {'p':P,'j':J,'w':W,'f':F,'a':a,'names':name_to_node}

def deferred_hair_weight_cleanup(*a,**kw):raise RuntimeError('DEFERRED_REQUIRES_HAIR_MASK_AND_OWNER_VERDICT')
def deferred_claw_hinge_weight_cleanup(*a,**kw):raise RuntimeError('DEFERRED_REQUIRES_TWO_CLAW_PIVOT_MAP_AND_OWNER_VERDICT')
def safe_weight_crossfamily_audit(g,src):
 # read-only; geometric shielding of body roots, no repainting
 d=g.d;points=src['p'];j=src['j'];w=src['w'];skin=d['skins'][0]['joints'];world=worlds(d)
 report={}
 for label,bones in FAMILIES.items():
  indices=[skin.index(src['names'][b]) for b in bones]
  influence=(w*np.isin(j,indices)).sum(axis=1)
  if int((influence>.8).sum())<15:raise RuntimeError('LEG_WEIGHT_OWNER_NOT_FOUND: '+label)
  report[label]={'weighted_vertices_80pct':int((influence>.8).sum()),'family':bones}
 return report

def solve_leg(g,src,cfg):
 doc=g.d;ws=worlds(doc);lookup=src['names'];parent=lookup['Bone_010'];root=lookup['Bone_009'];tip=lookup['Bone_008']
 assert_true(root in doc['nodes'][parent].get('children',[]) and tip in doc['nodes'][root].get('children',[]),'LEG_HIERARCHY_CHANGED')
 B=ws[root][:3,3];C=ws[tip][:3,3]
 skin=doc['skins'][0]['joints'];tip_idx=skin.index(tip);val=(src['w']*(src['j']==tip_idx)).sum(axis=1)
 cand=np.flatnonzero(val>.5);assert_true(len(cand)>=20,'NO_TOE_WITNESS')
 take=cand[np.argsort(src['p'][cand,1])[:10]];D=src['p'][take].mean(axis=0)
 v1=(C-B)[:2];v2=(D-C)[:2];l1=np.linalg.norm(v1);l2=np.linalg.norm(v2)
 a0=math.atan2(v1[1],v1[0]);b0=math.atan2(v2[1],v2[0]);elbow_sign=1 if math.sin(b0-a0)>=0 else -1
 assert_true(l1>.1 and l2>.1 and l1+l2>.5,'BAD_LEG_LINK_GEOMETRY')
 stance=float(cfg['stance_fraction']);stride=float(cfg['stride']);lift=float(cfg['lift']);inset=float(cfg['inset'])
 def target(t,factor):
  t=t%1
  if t<stance:
   phase=t/stance;dx=-inset-factor*stride*phase;dy=0
  else:
   phase=(t-stance)/(1-stance);s=phase*phase*(3-2*phase)
   dx=-inset-factor*stride*(1-s);dy=lift*factor*math.sin(math.pi*phase)
  return D[:2]+np.array([dx,dy])
 ts=np.linspace(0,1,19)
 factor=1.0
 for retry in range(30):
  radii=[np.linalg.norm(target(t,factor)-B[:2]) for t in ts]
  if max(radii)<l1+l2-1e-4 and min(radii)>abs(l1-l2)+1e-4:break
  factor*=.84
 else:raise RuntimeError('IK_UNREACHABLE_EVEN_WITH_STRIDE_REDUCTION')
 assert_true(factor>=.16,'STRIDE_TOO_SHORT_TO_REVIEW')
 parentR=ws[parent][:3,:3];rootR=ws[root][:3,:3];tipR=ws[tip][:3,:3]
 for R in (parentR,rootR,tipR):assert_true(abs(np.linalg.det(R)-1)<.002,'NON_RIGID_JOINT_WORLD')
 qr=[];qt=[];foot_errors=[];solved=[]
 for t in ts:
  tgt=target(t,factor);dx,dy=tgt-B[:2];r2=dx*dx+dy*dy
  ck=np.clip((r2-l1*l1-l2*l2)/(2*l1*l2),-1,1)
  theta=elbow_sign*math.acos(float(ck));a=math.atan2(dy,dx)-math.atan2(l2*math.sin(theta),l1+l2*math.cos(theta));b=a+theta
  delta1=math.atan2(math.sin(a-a0),math.cos(a-a0));delta2=math.atan2(math.sin(b-b0),math.cos(b-b0))
  newroot=rotz(delta1)@rootR;newtip=rotz(delta2)@tipR
  qroot=matrix_quat(parentR.T@newroot);qtip=matrix_quat(newroot.T@newtip)
  e=B[:2]+l1*np.array([math.cos(a),math.sin(a)])+l2*np.array([math.cos(b),math.sin(b)])
  foot_errors.append(float(np.linalg.norm(tgt-e)));solved.append({'t':float(t),'toe_target_xyz':[float(tgt[0]),float(tgt[1]),float(D[2])], 'delta_first_deg':float(np.degrees(delta1)),'delta_second_deg':float(np.degrees(delta2))})
  qr.append(qroot);qt.append(qtip)
 qr=np.array(qr);qt=np.array(qt)
 # Endpoints must coincide for a looping animation.
 qr[-1]=qr[0];qt[-1]=qt[0]
 assert_true(max(foot_errors)<1e-5,'IK_NUMERIC_FIT_FAILED')
 assert_true(np.max(np.abs(qr[:,0:4]))<=1.001 and np.max(np.abs(qt[:,0:4]))<=1.001,'INVALID_QUATERNION_ANIMATION')
 return {root:qr,tip:qt},{'stationary_socket_xyz':B.tolist(),'socket_parent_node':parent,'moving_nodes':[root,tip],'toe_rest_xyz':D.tolist(),'virtual_link_lengths_xy':[float(l1),float(l2)],'stance_fraction':stance,'stride_requested':stride,'stride_scale':factor,'effective_stride':factor*stride,'lift_requested':lift,'max_ik_endpoint_error':max(foot_errors),'frame_samples':solved}

def slerp(a,b,f):
 dot=float(np.dot(a,b));
 if dot<0:b=-b;dot=-dot
 if dot>.9995:q=a+(b-a)*f;return q/np.linalg.norm(q)
 th=math.acos(np.clip(dot,-1,1));return (math.sin((1-f)*th)*a+math.sin(f*th)*b)/math.sin(th)
def quats_at(g,t):
 anim=g.d['animations'][0];q={}
 for ch in anim['channels']:
  sample=anim['samplers'][ch['sampler']];ts=g.accessor(sample['input']).ravel();vals=g.accessor(sample['output']);t=min(float(t),1.0)
  elapsed=min(max(0.0,float(t)),1.0)*float(ts[-1])
  k=int(np.searchsorted(ts,elapsed,side='right'));lo=max(0,min(len(ts)-2,k-1));dt=float(ts[lo+1]-ts[lo]);frac=np.clip((elapsed-ts[lo])/dt,0,1)
  if sample.get('interpolation','LINEAR')=='CUBICSPLINE':
   a,b=vals[3*lo+1],vals[3*(lo+1)+1];d1,d2=vals[3*lo+2],vals[3*(lo+1)]
   u=float(frac);h00=2*u**3-3*u*u+1;h10=u**3-2*u*u+u;h01=-2*u**3+3*u*u;h11=u**3-u*u
   qout=h00*a+h10*dt*d1+h01*b+h11*dt*d2
   qout=qout/np.linalg.norm(qout)
  else:qout=slerp(vals[lo],vals[lo+1],float(frac))
  q[ch['target']['node']]=qout
 return q
def skin_at(g,src,t):
 w=worlds(g.d,quats_at(g,t));ibm=g.accessor(g.d['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
 mats=np.array([w[ni]@ibm[i] for i,ni in enumerate(g.d['skins'][0]['joints'])]);p=src['p'];ph=np.column_stack([p,np.ones(len(p))]);out=np.zeros((len(p),4))
 for k in range(4):out+=np.einsum('nij,nj->ni',mats[src['j'][:,k]],ph)*src['w'][:,k,None]
 return out[:,:3]
def texture(g):
 p=g.d['meshes'][0]['primitives'][0];mat=g.d['materials'][p['material']];ti=mat['pbrMetallicRoughness']['baseColorTexture']['index'];ix=g.d['textures'][ti]['source'];v=g.d['bufferViews'][g.d['images'][ix]['bufferView']];blob=g.blob[v['byteOffset']:v['byteOffset']+v['byteLength']];return np.array(Image.open(io.BytesIO(blob)).convert('RGB'))
def raster(points,uv,faces,tex,eye,focus,scale,width,height):
 eye=np.asarray(eye,float);focus=np.asarray(focus,float);direction=focus-eye;direction/=np.linalg.norm(direction)
 right=np.cross(direction,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,direction);up/=np.linalg.norm(up)
 dp=points-focus;sx=dp@right*scale+width/2;sy=height/2-dp@up*scale;sz=dp@direction
 rgb=np.full((height,width,3),[14,18,20],np.uint8);zbuf=np.full((height,width),np.inf)
 tx=np.clip(uv[:,0]*(tex.shape[1]-1),0,tex.shape[1]-1);ty=np.clip(uv[:,1]*(tex.shape[0]-1),0,tex.shape[0]-1)
 for ia,ib,ic in faces:
  a,b,c=map(int,(ia,ib,ic));x0,y0=sx[a],sy[a];x1,y1=sx[b],sy[b];x2,y2=sx[c],sy[c]
  xmin=max(0,int(math.floor(min(x0,x1,x2))));xmax=min(width-1,int(math.ceil(max(x0,x1,x2))))
  ymin=max(0,int(math.floor(min(y0,y1,y2))));ymax=min(height-1,int(math.ceil(max(y0,y1,y2))))
  if xmin>xmax or ymin>ymax:continue
  area=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0)
  if abs(area)<1e-8:continue
  xx,yy=np.meshgrid(np.arange(xmin,xmax+1),np.arange(ymin,ymax+1))
  wb=((xx-x0)*(y2-y0)-(yy-y0)*(x2-x0))/area;wc=((x1-x0)*(yy-y0)-(y1-y0)*(xx-x0))/area;wa=1-wb-wc
  valid=(wa>=-1e-7)&(wb>=-1e-7)&(wc>=-1e-7)
  depth=wa*sz[a]+wb*sz[b]+wc*sz[c];areaZ=zbuf[ymin:ymax+1,xmin:xmax+1];valid&=depth<areaZ
  if not valid.any():continue
  py,px=np.where(valid);tu=np.rint(wa[py,px]*tx[a]+wb[py,px]*tx[b]+wc[py,px]*tx[c]).astype(int);tv=np.rint(wa[py,px]*ty[a]+wb[py,px]*ty[b]+wc[py,px]*ty[c]).astype(int)
  normal=np.cross(points[b]-points[a],points[c]-points[a]);norm=np.linalg.norm(normal);shade=.78+.22*abs(float(np.dot(normal,[.3,.7,.6])))/(norm if norm>1e-10 else 1)
  rgb[ymin+py,xmin+px]=np.clip(tex[tv,tu]*shade,0,255).astype(np.uint8);areaZ[py,px]=depth[py,px]
 return Image.fromarray(rgb)
def render(g,src,cfg):
 tex=texture(g);uv=g.accessor(src['a']['TEXCOORD_0']);cams=cfg['cameras'];pw,ph=cfg['panel_width'],cfg['panel_height'];frames=[]
 for i in range(cfg['gif_frames']):
  t=i/cfg['gif_frames'];points=skin_at(g,src,t);canvas=Image.new('RGB',(len(cams)*(pw+8)-8,ph+36),(12,16,18));painter=ImageDraw.Draw(canvas)
  for k,cam in enumerate(cams):
   img=raster(points,uv,src['f'],tex,cam['eye'],cam['focus'],cam['scale'],pw,ph)
   x=k*(pw+8);canvas.paste(img,(x,22));painter.text((x+5,4),cam['label'],fill=(230,230,229))
  painter.text((8,ph+25),f'HEADY NEW RIG {cfg.get("version","v05")}   right middle / {cfg.get("phase_label","fixed socket")}   t={t:.2f}',fill=(210,211,209));frames.append(canvas)
 out=io.BytesIO();frames[0].save(out,format='GIF',save_all=True,append_images=frames[1:],duration=cfg.get('gif_durations_ms',int(round(1000/cfg['gif_frames']))),loop=0,optimize=False)
 return out.getvalue(),{'frames':len(frames),'width':canvas.width,'height':canvas.height}
def deliver_gif(giffile):
 originals=sha_file(giffile);locations={}
 for name,target in [('Pictures',pathlib.Path.home()/'storage/pictures'),('Downloads',pathlib.Path.home()/'storage/downloads')]:
  assert_true(target.is_dir(),'ANDROID_PUBLIC_DIR_NOT_ACCESSIBLE: '+str(target))
  pub=target/giffile.name
  safe_write(pub,giffile.read_bytes())
  assert_true(sha_file(pub)==originals,'PUBLIC_COPY_HASH_MISMATCH')
  locations[name]=str(pub)
 path=locations['Pictures'];open_exe=shutil.which('termux-open')
 opening={'status':'UNAVAILABLE'}
 if open_exe:
  try:
   r=subprocess.run([open_exe,'--view','--content-type','image/gif',path],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=20)
   opening={'status':'REQUESTED' if r.returncode==0 else 'FAILED','exit_code':r.returncode,'stderr':r.stderr[-250:]}
  except Exception as exc:opening={'status':'FAILED','message':str(exc)}
 return {'locations':locations,'sha256':originals,'open_request':opening,'viewer_visually_confirmed':False}
def run_v05():
 validate_repo();cfg=json.loads(CONF.read_text());assert_true(sha_file(ASSET)==EXPECTED_SHA,'SOURCE_GLB_SHA_MISMATCH')
 # Idempotent complete rerun: show the already committed receipt and verified public
 # copies rather than mutating source or requiring a follow-up status script.
 prev=ROOT/RECEIPT_REL
 if prev.is_file():
  old=json.loads(prev.read_text());assert_true(old.get('campaign')=='heady-newrig-v05','UNEXPECTED_EXISTING_RECEIPT')
  for p,h in [(ROOT/MODEL_REL,old['output_glb_sha256']),(ROOT/GIF_REL,old['output_gif_sha256'])]:
   assert_true(p.is_file() and sha_file(p)==h,'PREVIOUS_OUTPUT_MISMATCH: '+str(p))
  for p in old['public']['locations'].values():
   assert_true(pathlib.Path(p).is_file() and sha_file(p)==old['output_gif_sha256'],'PREVIOUS_PUBLIC_FILE_MISSING_OR_CHANGED: '+p)
  print('HEADY_V05=PASS_PREVIOUS_VERIFIED_RESULT',flush=True)
  print('ARTIFACT_COMMIT='+old['stage_2_artifacts_commit']['head'],flush=True)
  print('RECEIPT_COMMIT='+git('rev-parse','HEAD').stdout.strip(),flush=True)
  print('MODEL='+str(ROOT/MODEL_REL),flush=True)
  print('GIF='+str(ROOT/GIF_REL),flush=True)
  for label,path in old['public']['locations'].items():print(label.upper()+'='+path,flush=True)
  print('HUMAN_VERDICT=PENDING; NO_NEW_COMMIT',flush=True)
  return old
 g=GLB(ASSET.read_bytes());src=inspect_model(g)
 assert_true(not g.d.get('animations'),'SOURCE_ALREADY_ANIMATED')
 audit=safe_weight_crossfamily_audit(g,src)
 checks={'source_sha256':EXPECTED_SHA,'vertex_records':int(len(src['p'])),'faces':int(len(src['f'])),'joint_count':52,'families':audit,'original_weights_unchanged':True,'original_glb_unchanged':True}
 # Full packet is already committed by the installer; step #2 commits only generated review.
 channels,diag=solve_leg(g,src,cfg)
 candidate=g.with_animation(channels);csrc=inspect_model(candidate)
 assert_true(g.blob==candidate.blob[:len(g.blob)],'SOURCE_BINARY_PREFIX_CHANGED')
 assert_true(np.array_equal(csrc['j'],src['j']) and np.array_equal(csrc['w'],src['w']),'WEIGHTS_CHANGED_WITHOUT_AUTHORIZATION')
 assert_true(len(candidate.d['animations'][0]['channels'])==2,'MORE_THAN_TWO_ACTIVE_JOINTS')
 for node in channels:assert_true(node!=src['names']['Bone_010'],'BODY_TO_SOCKET_BONE_ANIMATED')
 rest_socket=worlds(g.d)[src['names']['Bone_009']][:3,3]
 pose_sockets=[worlds(candidate.d,quats_at(candidate,t))[src['names']['Bone_009']][:3,3] for t in np.linspace(0,1,19)]
 drift=max(float(np.linalg.norm(q-rest_socket)) for q in pose_sockets)
 assert_true(drift<1e-7,'STATIONARY_SOCKET_DRIFT')
 checks['stationary_socket_max_drift']=drift;checks['two_animated_node_names']=['Bone_009','Bone_008'];checks['read_only_weight_audit']=True
 gif,meta=render(candidate,csrc,cfg)
 with Image.open(io.BytesIO(gif)) as im:assert_true(im.format=='GIF' and im.n_frames==cfg['gif_frames'],'INVALID_GIF_OUTPUT')
 modelpath=ROOT/MODEL_REL;gifpath=ROOT/GIF_REL;diagpath=ROOT/DIAG_REL
 safe_write(modelpath,candidate.raw);safe_write(gifpath,gif)
 diagnostics={'mission':'One ground-reaching leg, v05 fresh 52-joint rig','status':'CANDIDATE_NOT_HUMAN_ACCEPTED','model_sha256':sha_file(modelpath),'gif_sha256':sha_file(gifpath),'source':checks,'gait':diag,'gif':meta}
 safe_write(diagpath,json_bytes(diagnostics))
 step2=commit_only([MODEL_REL,GIF_REL,DIAG_REL],'heady/v05 stage 2: verify and commit single leg gait + GIF')
 public=deliver_gif(gifpath)
 # Stage #3: final receipt, committed; SHA prior to this receipt commit is recorded.
 receipt={'status':'CANDIDATE_AWAITING_HUMAN_REVIEW','campaign':'heady-newrig-v05','stage_1_packet_local_commit':os.environ.get('HEADY_PACKET_COMMIT','UNKNOWN_DIRECT_RUN'),'stage_2_artifacts_commit':step2,'source_sha256':EXPECTED_SHA,'output_glb':str(modelpath),'output_glb_sha256':sha_file(modelpath),'output_gif':str(gifpath),'output_gif_sha256':sha_file(gifpath),'gif':meta,'public':public,'socket_max_drift':drift,'edited_weights':0,'animated_nodes':['Bone_009','Bone_008'],'git_remote_push':'NOT_ATTEMPTED','human_verdict':'PENDING'}
 safe_write(ROOT/RECEIPT_REL,json_bytes(receipt))
 step3=commit_only([RECEIPT_REL],'heady/v05 stage 3: checkpoint delivery + human-review receipt')
 print('HEADY_V05=PASS_CANDIDATE_REQUIRES_HUMAN_REVIEW',flush=True)
 print('PACKET_COMMIT='+receipt['stage_1_packet_local_commit'],flush=True)
 print('ARTIFACT_COMMIT='+step2['head'],flush=True)
 print('RECEIPT_COMMIT='+step3['head'],flush=True)
 print('ACTIVE_JOINTS=Bone_009,Bone_008; SOCKET_DRIFT='+str(round(drift,9)),flush=True)
 print('MODEL='+str(modelpath),flush=True)
 print('GIF='+str(gifpath),flush=True)
 for label,path in public['locations'].items():print(label.upper()+'='+path,flush=True)
 print('OPEN_REQUEST='+public['open_request']['status']+' (not viewer confirmation)',flush=True)
 print('REMOTE_PUSH=NOT_ATTEMPTED',flush=True)
 return receipt


# v06 revision of the SAME persistent 52-joint campaign engine. This code is not a separate tool.
# ORIGINAL V06 USER INVOCATION: Python one-paste verified Heady_52Joint_v06_CrispScuttle_Update.zip
# then INSTALL_AND_RUN_V06.py automatically updates this engine, performs scoped local commits,
# validates and runs GLB/GIF, delivers accessible Pictures/Downloads and prints final receipt.
V06_CONFIG=HERE/'config_v06.json'
V06_MODEL_REL=PACKET_REL+'/output/Heady_52_newrig_right_middle_crisp_v06.glb'
V06_GIF_REL=PACKET_REL+'/output/Heady_52_newrig_right_middle_crisp_v06.gif'
V06_DIAG_REL=PACKET_REL+'/output/diagnostics_v06.json'
V06_BONE_REL=PACKET_REL+'/output/Bone_008_virtual_toe_end_v06.png'
V06_RECEIPT_REL=PACKET_REL+'/output/completion_receipt_v06.json'

def ease01(x):
 x=max(0.,min(1.,float(x)))
 return x*x*(3.-2.*x)

def path_v06(t,cfg,factor,D):
 """Quick true crab recovery instead of v05's one-second slow smoothstep settle."""
 t=float(t)%1.0;stance=float(cfg['stance_fraction']);stride=float(cfg['stride'])*factor
 lift=float(cfg['lift'])*factor;inset=float(cfg['inset'])
 if t<stance:
  u=t/stance
  # stance toe travels backward nearly uniformly, rounding only short contact corners.
  f=(u-ease01(min(1.,u/.08))*.04 + ease01(max(0.,(u-.92)/.08))*.04)
  x=-inset-stride*f;y=0.
 else:
  u=(t-stance)/(1.-stance)
  # Quick midair forward swing; no long smoothstep tail or creeping landing.
  sweep=ease01((u-.04)/.70)
  x=-inset-stride*(1.-sweep)
  up=ease01(u/.17)
  down=1.-ease01((u-.60)/.26)
  y=lift*up*down
 return D[:2]+np.array([x,y])

def solve_leg_v06(g,src,cfg):
 d=g.d;ws=worlds(d);names=src['names'];brace=names['Bone_010'];root=names['Bone_009'];tip=names['Bone_008']
 assert_true(root in d['nodes'][brace].get('children',[]) and tip in d['nodes'][root].get('children',[]),'V06_ANATOMY_CHANGED')
 assert_true(not d['nodes'][tip].get('children'),'V06_EXPECTED_TERMINAL_BONE_008')
 B=ws[root][:3,3];C=ws[tip][:3,3];jidx=d['skins'][0]['joints'].index(tip)
 vals=(src['w']*(src['j']==jidx)).sum(axis=1);ids=np.flatnonzero(vals>.5)
 assert_true(len(ids)>=20,'V06_TOE_REGION_UNAVAILABLE')
 toes=ids[np.argsort(src['p'][ids,1])[:10]];D=np.mean(src['p'][toes],axis=0)
 l1=np.linalg.norm((C-B)[:2]);l2=np.linalg.norm((D-C)[:2]);assert_true(l1>.1 and l2>.1,'V06_LINK_SHORT')
 a0=math.atan2(C[1]-B[1],C[0]-B[0]);b0=math.atan2(D[1]-C[1],D[0]-C[0]);sign=1 if math.sin(b0-a0)>=0 else -1
 ts=np.linspace(0,1,int(cfg['key_count']),dtype=float)
 factor=1.
 for _ in range(38):
  ranges=[np.linalg.norm(path_v06(t if t<1 else 0,cfg,factor,D)-B[:2]) for t in ts]
  if max(ranges)<l1+l2-1e-4 and min(ranges)>abs(l1-l2)+1e-4:break
  factor*=.88
 else:raise RuntimeError('V06_IK_UNREACHABLE')
 assert_true(factor>=.18,'V06_STRIDE_TOO_REDUCED')
 parentR=ws[brace][:3,:3];rootR=ws[root][:3,:3];tipR=ws[tip][:3,:3]
 qs1=[];qs2=[];samples=[];errors=[]
 for t in ts:
  target=path_v06(t,cfg,factor,D)
  dx,dy=target-B[:2];r2=dx*dx+dy*dy
  ck=np.clip((r2-l1*l1-l2*l2)/(2*l1*l2),-1,1)
  theta=sign*math.acos(float(ck));a=math.atan2(dy,dx)-math.atan2(l2*math.sin(theta),l1+l2*math.cos(theta));b=a+theta
  newroot=rotz(a-a0)@rootR;newtip=rotz(b-b0)@tipR
  q1=matrix_quat(parentR.T@newroot);q2=matrix_quat(newroot.T@newtip)
  qs1.append(q1);qs2.append(q2)
  predicted=B[:2]+l1*np.array([math.cos(a),math.sin(a)])+l2*np.array([math.cos(b),math.sin(b)])
  errors.append(float(np.linalg.norm(predicted-target)))
  samples.append({'cycle_fraction':float(t),'height_above_stance':float(target[1]-D[1]),'target_xy':target.tolist()})
 qs1=np.array(qs1);qs2=np.array(qs2)
 # Guarantee cyclic quaternion hemisphere continuity, including the seam.
 for qs in (qs1,qs2):
  for i in range(1,len(qs)):
   if np.dot(qs[i],qs[i-1])<0:qs[i]*=-1
  qs[-1]=qs[0]
 assert_true(max(errors)<1e-5,'V06_IK_TARGET_FAILURE')
 vtoelocal=(np.linalg.inv(ws[tip])@np.array([*D,1.]))[:3]
 return {root:qs1,tip:qs2},{'socket_world_xyz':B.tolist(),'intermediate_world_xyz':C.tolist(),'toe_virtual_world_xyz':D.tolist(),'virtual_toe_offset_from_Bone_008_local_xyz':vtoelocal.tolist(),'Bone_008_has_child':False,'terminal_marker_is_SKINNED':False,'rig_joint_count_unchanged':True,'two_link_lengths_xy':[float(l1),float(l2)],'effective_stride':float(cfg['stride']*factor),'effective_lift':float(cfg['lift']*factor),'cycle_seconds':float(cfg['cycle_seconds']),'stance_fraction':float(cfg['stance_fraction']),'max_ik_key_error':max(errors),'samples':samples}

def _append_accessors(doc,binary,arr,typ):
 while len(binary)%4:binary.append(0)
 off=len(binary);raw=np.asarray(arr,dtype='<f4').tobytes();binary.extend(raw)
 doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(raw)})
 count=len(arr)
 doc['accessors'].append({'bufferView':len(doc['bufferViews'])-1,'componentType':5126,'count':count,'type':typ})
 return len(doc['accessors'])-1

def with_cubic_v06(g,channels,cfg):
 assert_true(not g.d.get('animations'),'V06_SOURCE_ALREADY_ANIMATED')
 doc=copy.deepcopy(g.d);binary=bytearray(g.blob);timevalues=np.linspace(0,float(cfg['cycle_seconds']),int(cfg['key_count']),dtype='<f4')
 samplers=[];links=[]
 for i,qs in sorted(channels.items()):
  assert_true(qs.shape==(int(cfg['key_count']),4),'V06_WRONG_QUATS_SHAPE')
  q=np.array(qs,dtype=float);dt=float(timevalues[1]-timevalues[0])
  deriv=np.zeros_like(q);deriv[1:-1]=(q[2:]-q[:-2])/(2*dt)
  deriv[0]=deriv[-1]=(q[1]-q[-2])/(2*dt)
  # Hermite tangent is time derivative, preserving smooth speed across segment boundaries.
  packed=np.empty((3*len(q),4),dtype='<f4');packed[0::3]=deriv;packed[1::3]=q;packed[2::3]=deriv
  ia=_append_accessors(doc,binary,timevalues,'SCALAR');oa=_append_accessors(doc,binary,packed,'VEC4')
  samplers.append({'input':ia,'output':oa,'interpolation':'CUBICSPLINE'})
  links.append({'sampler':len(samplers)-1,'target':{'node':int(i),'path':'rotation'}})
 doc['animations']=[{'name':'HEADY_V06_RightMiddle_CrispScuttle_FixedSocket','channels':links,'samplers':samplers,'extras':{'cycle_seconds':cfg['cycle_seconds'],'virtual_toe_node':'NOT_SKINNED_SOURCE_52_JOINTS_UNCHANGED'}}]
 doc['buffers'][0]['byteLength']=len(binary)
 js=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4)
 binary.extend(b'\0'*(-len(binary)%4))
 raw=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 result=GLB(raw)
 assert_true(result.blob[:len(g.blob)]==g.blob,'V06_SOURCE_BINARY_MUTATED')
 for key in g.d:
  if key in ('animations','accessors','bufferViews','buffers'):continue
  assert_true(result.d[key]==g.d[key],'V06_SOURCE_GLTF_SECTION_MUTATED: '+key)
 return result

def virtual_bone_map(g,src,diag,cfg):
 cam=cfg['cameras'][2];eye=np.array(cam['eye'],float);focus=np.array(cam['focus'],float);direction=focus-eye;direction/=np.linalg.norm(direction)
 right=np.cross(direction,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,direction);up/=np.linalg.norm(up)
 pw,ph=cfg['panel_width'],cfg['panel_height']
 base=raster(src['p'],g.accessor(src['a']['TEXCOORD_0']),src['f'],texture(g),cam['eye'],cam['focus'],cam['scale'],pw,ph)
 im=Image.new('RGB',(pw,ph+65),(16,19,21));im.paste(base,(0,43));draw=ImageDraw.Draw(im)
 def pt(v):
  v=np.asarray(v,float)-focus;return (round(float(v@right)*cam['scale']+pw/2),round(float(ph/2-v@up*cam['scale']+43)))
 root=pt(diag['socket_world_xyz']);knee=pt(diag['intermediate_world_xyz']);toe=pt(diag['toe_virtual_world_xyz'])
 draw.text((8,3),'Bone_009 -> Bone_008 -> VIRTUAL TOE',fill=(245,245,235))
 draw.text((8,18),'Terminal helper is NOT a skinned bone',fill=(245,193,107))
 draw.line([root,knee],fill=(80,235,220),width=3)
 for f in np.linspace(0,0.96,12):
  a=(round(knee[0]*(1-f)+toe[0]*f),round(knee[1]*(1-f)+toe[1]*f));b=(round(knee[0]*(1-f-.035)+toe[0]*(f+.035)),round(knee[1]*(1-f-.035)+toe[1]*(f+.035)))
  draw.line([a,b],fill=(255,191,79),width=3)
 for (x,y),c,label in [(root,(60,230,221),'SOCKET'),(knee,(60,230,221),'Bone_008'),(toe,(255,190,70),'TOE')]:
  draw.ellipse((x-4,y-4,x+4,y+4),fill=c)
  draw.text((max(0,x+5),max(45,y-12)),label,fill=c)
 o=io.BytesIO();im.save(o,format='PNG');return o.getvalue()

def run_v06():
 validate_repo();cfg=json.loads(V06_CONFIG.read_text());assert_true(sha_file(ASSET)==EXPECTED_SHA,'V06_SOURCE_SHA_MISMATCH')
 receiptpath=ROOT/V06_RECEIPT_REL
 if receiptpath.is_file():
  old=json.loads(receiptpath.read_text())
  for p,h in [(ROOT/V06_MODEL_REL,old['output_glb_sha256']),(ROOT/V06_GIF_REL,old['output_gif_sha256'])]:assert_true(p.is_file() and sha_file(p)==h,'V06_PRIOR_OUTPUT_CHANGED')
  for p in old['public']['locations'].values():assert_true(pathlib.Path(p).is_file() and sha_file(p)==old['output_gif_sha256'],'V06_PRIOR_PUBLIC_IMAGE_CHANGED')
  print('HEADY_V06=PASS_PREVIOUS_COMPLETE_RESULT',flush=True)
  print('SOCKET_DRIFT='+str(old['socket_max_drift']),flush=True)
  print('GIF='+old['output_gif'],flush=True)
  for name,p in old['public']['locations'].items():print(name.upper()+'='+p,flush=True)
  print('HUMAN_VERDICT=PENDING',flush=True)
  return old
 g=GLB(ASSET.read_bytes());src=inspect_model(g)
 channels,diag=solve_leg_v06(g,src,cfg);result=with_cubic_v06(g,channels,cfg);rsrc=inspect_model(result)
 assert_true(np.array_equal(src['w'],rsrc['w']) and np.array_equal(src['j'],rsrc['j']),'V06_WEIGHTS_MUTATED')
 assert_true(len(result.d['skins'][0]['joints'])==52 and len(result.d['nodes'])==len(g.d['nodes']),'V06_SKELETON_CHANGED')
 assert_true(all(c['target']['node'] in channels for c in result.d['animations'][0]['channels']),'V06_OUTSIDE_LEG_ANIMATION')
 assert_true(all(s['interpolation']=='CUBICSPLINE' for s in result.d['animations'][0]['samplers']),'V06_NOT_CUBIC')
 root=src['names']['Bone_009'];restsocket=worlds(g.d)[root][:3,3]
 maxdrift=max(float(np.linalg.norm(worlds(result.d,quats_at(result,float(t)))[root][:3,3]-restsocket)) for t in np.linspace(0,1,41))
 assert_true(maxdrift<1e-7,'V06_SOCKET_NOT_FIXED')
 # Test analytic native interpolation on 240 fractional frames, no hidden NaNs or discontinuous seam.
 max_angle=0.
 for t in np.linspace(0,1,241):
  q=quats_at(result,float(t));assert_true(all(np.isfinite(v).all() for v in q.values()),'V06_NONFINITE_ROTATION')
  max_angle=max(max_angle,max(abs(float(np.linalg.norm(v))-1) for v in q.values()))
 assert_true(max_angle<1e-5,'V06_QUAT_NORMALIZATION')
 cfg['version']='v06';cfg['phase_label']='CRISP SCUTTLE / CUBIC'
 total=int(round(float(cfg['cycle_seconds'])*1000));n=int(cfg['gif_frames']);edges=[int(round((i*total/n)/10)*10) for i in range(n+1)]
 durations=[edges[i+1]-edges[i] for i in range(n)];assert_true(min(durations)>=20 and sum(durations)==total,'V06_GIF_DURATION_INVALID')
 cfg['gif_durations_ms']=durations
 gif,meta=render(result,rsrc,cfg)
 with Image.open(io.BytesIO(gif)) as im:
  assert_true(im.n_frames==n and im.format=='GIF','V06_GIF_INVALID')
  actualdur=[]
  for i in range(im.n_frames):im.seek(i);actualdur.append(im.info.get('duration'))
  assert_true(sum(actualdur)==total,'V06_GIF_SPEED_BROKEN')
 bone=virtual_bone_map(g,src,diag,cfg)
 outputs=[(V06_MODEL_REL,result.raw),(V06_GIF_REL,gif),(V06_BONE_REL,bone)]
 for rel,raw in outputs:safe_write(ROOT/rel,raw)
 checks={'status':'CANDIDATE_NOT_HUMAN_ACCEPTED','source_sha256':EXPECTED_SHA,'source_52_joints_intact':True,'original_weights_unchanged':True,'source_textures_byte_identical':True,'animated_bones':['Bone_009','Bone_008'],'protected_socket':'Bone_010','socket_max_drift':maxdrift,'gait':diag,'interpolation':'CUBICSPLINE','gif_frame_durations_ms':durations,'gif':meta,'terminal_marker':'VIRTUAL_NONSKINNED','human_verdict':'PENDING'}
 safe_write(ROOT/V06_DIAG_REL,json_bytes(checks))
 step2=commit_only([V06_MODEL_REL,V06_GIF_REL,V06_DIAG_REL,V06_BONE_REL],'heady/v06 stage 2: fixed socket, cubic fast scuttle, toe-end witness')
 public=deliver_gif(ROOT/V06_GIF_REL)
 receipt={'status':'CANDIDATE_AWAITING_HUMAN_REVIEW','campaign':'heady-newrig-v06','step1_packet_commit':os.environ.get('HEADY_PACKET_COMMIT','UNKNOWN_DIRECT_RUN'),'step2_artifacts_commit':step2,'output_glb':str(ROOT/V06_MODEL_REL),'output_glb_sha256':sha_file(ROOT/V06_MODEL_REL),'output_gif':str(ROOT/V06_GIF_REL),'output_gif_sha256':sha_file(ROOT/V06_GIF_REL),'diagnostic':str(ROOT/V06_BONE_REL),'socket_max_drift':maxdrift,'edited_weights':0,'public':public,'gif_duration_ms':total,'interpolation':'CUBICSPLINE','human_verdict':'PENDING','git_remote_push':'NOT_ATTEMPTED'}
 safe_write(receiptpath,json_bytes(receipt));step3=commit_only([V06_RECEIPT_REL],'heady/v06 stage 3: public GIF delivery + final receipt')
 print('HEADY_V06=PASS_CANDIDATE_REQUIRES_HUMAN_REVIEW',flush=True)
 print('PACKET_COMMIT='+receipt['step1_packet_commit'],flush=True)
 print('ARTIFACT_COMMIT='+step2['head'],flush=True);print('RECEIPT_COMMIT='+step3['head'],flush=True)
 print('CYCLE_SECONDS='+str(cfg['cycle_seconds'])+'; INTERPOLATION=CUBICSPLINE',flush=True)
 print('ACTIVE_JOINTS=Bone_009,Bone_008; Bone_010=STATIONARY; VIRTUAL_TOE=ANALYTIC_MARKER',flush=True)
 print('SOCKET_DRIFT='+str(round(maxdrift,10)),flush=True)
 print('MODEL='+receipt['output_glb'],flush=True);print('GIF='+receipt['output_gif'],flush=True)
 print('VIRTUAL_TOE_DIAGRAM='+receipt['diagnostic'],flush=True)
 for k,p in public['locations'].items():print(k.upper()+'='+p,flush=True)
 print('OPEN_REQUEST='+public['open_request']['status']+' (viewer not verified)',flush=True)
 print('REMOTE_PUSH=NOT_ATTEMPTED; HUMAN_VERDICT=PENDING',flush=True)
 return receipt



# V07: same one-file engine; the NEW 52-joint rig has THREE moving limb joints.
# User correction: Bone_010 must drive the proximal motion. Its body-side HEAD remains fixed;
# Bone_009's socket is allowed to move because it is at the END of this rotating segment.
# The previous (57-joint) Bone_034 fixed-brace analysis is NOT applicable to this source.
# Reference: user-supplied 938497.mp4, useful crab closeup ~1.65..3.6 s.
# Distinct brisk lift / advance / touchdown are visually observable; exact joint angles aren't.
V07_CONFIG=HERE/'config_v07.json'
V07_MODEL_REL=PACKET_REL+'/output/Heady_52_newrig_three_link_v07.glb'
V07_GIF_REL=PACKET_REL+'/output/Heady_52_newrig_three_link_v07.gif'
V07_DIAG_REL=PACKET_REL+'/output/diagnostics_v07.json'
V07_BONEMAP_REL=PACKET_REL+'/output/Bone_010_009_008_v07_map.png'
V07_RECEIPT_REL=PACKET_REL+'/output/completion_receipt_v07.json'

def _mix(a,b,u):
 return float(a)+(float(b)-float(a))*max(0.,min(1.,float(u)))

def _fast_smooth(u):
 # S-curve only for lift/touch transitions lasting <= 0.045 of the cycle.
 u=max(0.,min(1.,float(u)))
 return u*u*(3.-2.*u)

def gait_path_v07(t,cfg,factor,toe):
 """Foot target is supported for ~81% of the cycle; fast advance is 19%.
 The final part of each cycle IS STANCE, not a lingering recovery-to-rest segment.
 Piecewise event timing intentionally matches visible quick stepping rather than a sine wave.
 Root motion is absent: toe travels opposite simulated body translation during stance.
 """
 t=float(t)%1.;S=float(cfg['stride'])*factor;H=float(cfg['lift'])*factor
 # Equivalent contact speed on either side of the loop seam, no end-of-cycle slowdown.
 if t<.685:
  x=_mix(.15*S,-.70*S,t/.685);y=0.;phase='STANCE'
 elif t<.715:
  u=(t-.685)/.030
  x=_mix(-.70*S,-.72*S,u);y=H*_fast_smooth(u);phase='LIFT'
 elif t<.830:
  u=(t-.715)/.115
  x=_mix(-.72*S,+.30*S,u);y=H;phase='FAST_SWEEP'
 elif t<.875:
  u=(t-.830)/.045
  x=_mix(+.30*S,+.30*S,u);y=H*(1.-_fast_smooth(u));phase='PLANT'
 else:
  x=_mix(+.30*S,+.15*S,(t-.875)/.125);y=0.;phase='STANCE'
 # Animate the ACTUAL proximal link independently. Changes at planted phases are modest.
 # Piecewise root angle rather than a generic sinusoidal swing.
 pivots=((0.,0.),(.685,-5.5),(.715,-6.0),(.830,-3.5),(.875,-3.0),(1.,0.))
 for i in range(len(pivots)-1):
  a,va=pivots[i];b,vb=pivots[i+1]
  if a<=t<=b:
   angle=_mix(va,vb,(t-a)/(b-a));break
 else:angle=-3.
 return toe[:2]+np.array([x,y]),math.radians(angle),phase

def solve_three_link_v07(g,src,cfg):
 d=g.d;w0=worlds(d);names=src['names'];brace=names['Bone_010'];root=names['Bone_009'];tip=names['Bone_008']
 assert_true(root in d['nodes'][brace].get('children',[]) and tip in d['nodes'][root].get('children',[]),'V07_THREE_LINK_HIERARCHY_NOT_PRESENT')
 A=w0[brace][:3,3];B=w0[root][:3,3];C=w0[tip][:3,3]
 jtip=d['skins'][0]['joints'].index(tip);v=(src['w']*(src['j']==jtip)).sum(axis=1)
 ids=np.flatnonzero(v>.5);assert_true(len(ids)>=20,'V07_TOE_WITNESS_NOT_FOUND')
 D=src['p'][ids[np.argsort(src['p'][ids,1])[:10]]].mean(axis=0)
 l0=np.linalg.norm((B-A)[:2]);l1=np.linalg.norm((C-B)[:2]);l2=np.linalg.norm((D-C)[:2]);assert_true(min(l0,l1,l2)>.10,'V07_BAD_THREE_LINK_GEOMETRY')
 a0=math.atan2(C[1]-B[1],C[0]-B[0]);b0=math.atan2(D[1]-C[1],D[0]-C[0]);elbow=1 if math.sin(b0-a0)>=0 else -1
 R0=w0[brace][:3,:3];R1=w0[root][:3,:3];R2=w0[tip][:3,:3]
 ts=np.linspace(0,1,int(cfg['key_count']));scale=1.
 for _ in range(44):
  radii=[]
  for t in ts:
   target,angle,_=gait_path_v07(t,cfg,scale,D)
   joint=A[:2]+(rotz(angle)@(B-A))[:2]
   radii.append(np.linalg.norm(target-joint))
  if max(radii)<l1+l2-1e-4 and min(radii)>abs(l1-l2)+1e-4:break
  scale*=.91
 else:raise RuntimeError('V07_THREE_LINK_TARGET_UNREACHABLE')
 assert_true(scale>.18,'V07_STRIDE_UNREADABLY_SMALL')
 qs0=[];qs1=[];qs2=[];samples=[];errors=[]
 for t in ts:
  target,angle,phase=gait_path_v07(t,cfg,scale,D)
  Bnew=A[:2]+(rotz(angle)@(B-A))[:2]
  delta=target-Bnew;r2=float(delta@delta)
  cost=np.clip((r2-l1*l1-l2*l2)/(2*l1*l2),-1,1)
  theta=elbow*math.acos(float(cost))
  joint_angle=math.atan2(delta[1],delta[0])-math.atan2(l2*math.sin(theta),l1+l2*math.cos(theta))
  tip_angle=joint_angle+theta
  R0new=rotz(angle)@R0;R1new=rotz(joint_angle-a0)@R1;R2new=rotz(tip_angle-b0)@R2
  q0=matrix_quat(w0[names['Bone_001']][:3,:3].T@R0new)
  q1=matrix_quat(R0new.T@R1new)
  q2=matrix_quat(R1new.T@R2new)
  qs0.append(q0);qs1.append(q1);qs2.append(q2)
  pred=Bnew+l1*np.array([math.cos(joint_angle),math.sin(joint_angle)])+l2*np.array([math.cos(tip_angle),math.sin(tip_angle)])
  errors.append(float(np.linalg.norm(pred-target)))
  samples.append({'phase':phase,'cycle_fraction':round(float(t),6),'target_xy':target.tolist(),'toe_clearance':float(target[1]-D[1]),'proximal_degrees':math.degrees(angle),'socket_xy':Bnew.tolist()})
 channels={brace:np.array(qs0),root:np.array(qs1),tip:np.array(qs2)}
 for qs in channels.values():
  for k in range(1,len(qs)):
   if np.dot(qs[k],qs[k-1])<0:qs[k]*=-1
  qs[-1]=qs[0]
 assert_true(max(errors)<1e-5,'V07_IK_KEY_TARGET_ERROR')
 return channels,{'selected_bones':['Bone_010','Bone_009','Bone_008'],'body_attachment_xyz':A.tolist(),'socket_rest_xyz':B.tolist(),'knee_rest_xyz':C.tolist(),'toe_mesh_witness_xyz':D.tolist(),'link_length_xy':[float(l0),float(l1),float(l2)],'stride_reach_factor':scale,'cycle_seconds':cfg['cycle_seconds'],'swing_fraction':.190,'ground_contact_fraction':.810,'event_phases':{'liftoff':.685,'rise_complete':.715,'fast_sweep_complete':.830,'touchdown':.875},'maximum_ik_target_error':max(errors),'samples':samples}

def three_link_bone_map(g,src,diag,cfg):
 cam=cfg['cameras'][1];pw,ph=cfg['panel_width'],cfg['panel_height'];eye=np.asarray(cam['eye']);focus=np.asarray(cam['focus']);f=focus-eye;f/=np.linalg.norm(f)
 right=np.cross(f,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,f);up/=np.linalg.norm(up)
 base=raster(src['p'],g.accessor(src['a']['TEXCOORD_0']),src['f'],texture(g),cam['eye'],cam['focus'],cam['scale'],pw,ph)
 im=Image.new('RGB',(pw,ph+52),(15,18,20));im.paste(base,(0,52));d=ImageDraw.Draw(im)
 def pix(v):
  v=np.asarray(v,dtype=float)-focus;return (round(float(v@right)*cam['scale']+pw/2),round(float(ph/2-v@up*cam['scale']+52)))
 A=pix(diag['body_attachment_xyz']);B=pix(diag['socket_rest_xyz']);C=pix(diag['knee_rest_xyz']);D=pix(diag['toe_mesh_witness_xyz'])
 d.text((6,4),'V07: THREE ACTIVE BONES - 010 / 009 / 008',fill=(244,244,240))
 d.text((6,20),'Toe is a MESH witness, NOT another bone',fill=(255,189,95))
 for p,q,c in [(A,B,(40,210,226)),(B,C,(106,246,120)),(C,D,(250,177,86))]:d.line((p,q),fill=c,width=3)
 for name,loc in [('010',A),('009',B),('008',C),('toe',D)]:
  d.ellipse((loc[0]-4,loc[1]-4,loc[0]+4,loc[1]+4),fill=(250,250,250));d.text((loc[0]+6,loc[1]-10),name,fill=(255,255,255))
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()

def run_v07():
 validate_repo();cfg=json.loads(V07_CONFIG.read_text());assert_true(sha_file(ASSET)==EXPECTED_SHA,'V07_SOURCE_HASH_MISMATCH')
 prev=ROOT/V07_RECEIPT_REL
 if prev.is_file():
  old=json.loads(prev.read_text())
  for path,shaexpected in [(ROOT/V07_MODEL_REL,old['output_glb_sha256']),(ROOT/V07_GIF_REL,old['output_gif_sha256'])]:assert_true(path.is_file() and sha_file(path)==shaexpected,'V07_PREVIOUS_RESULT_MISMATCH')
  for p in old['public']['locations'].values():assert_true(pathlib.Path(p).is_file() and sha_file(p)==old['output_gif_sha256'],'V07_PUBLIC_OUTPUT_MISMATCH')
  print('HEADY_V07=PREVIOUS_RESULT_VERIFIED',flush=True);print('MODEL='+old['output_glb'],flush=True);print('GIF='+old['output_gif'],flush=True)
  for k,p in old['public']['locations'].items():print(k.upper()+'='+p,flush=True)
  print('LOCAL_COMMIT='+git('rev-parse','HEAD').stdout.strip(),flush=True)
  print('HUMAN_REVIEW=PENDING',flush=True)
  return old
 g=GLB(ASSET.read_bytes());src=inspect_model(g);channels,diagnostics=solve_three_link_v07(g,src,cfg)
 result=with_cubic_v06(g,channels,cfg);result.d['animations'][0]['name']='HEADY_V07_RightMiddle_ThreeLink_CrabStep'
 # Name/extras modification is JSON-only: re-export through a fresh byte-preserving copy.
 # The glTF rewriter below retains the original entire binary buffer.
 doc=result.d;doc['animations'][0]['extras']={'cycle_seconds':cfg['cycle_seconds'],'true_active_bones':['Bone_010','Bone_009','Bone_008'],'reference':'938497.mp4 at 1.65..3.6s, qualitative gait'}
 js=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4)
 blob=result.blob;result=GLB(struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob)
 rsrc=inspect_model(result)
 assert_true(np.array_equal(src['j'],rsrc['j']) and np.array_equal(src['w'],rsrc['w']),'V07_SKINNING_WEIGHTS_CHANGED')
 assert_true(result.blob.startswith(g.blob),'V07_SOURCE_BUFFER_CHANGED')
 assert_true(len(result.d['skins'][0]['joints'])==52,'V07_RIG_CHANGED')
 active={x['target']['node'] for x in result.d['animations'][0]['channels']}
 assert_true(active==set(channels) and len(active)==3,'V07_ANIMATION_CHANNELS_NOT_THREE')
 bodies=[];sockets=[];toes=[];maxToeError=0.;root=src['names']['Bone_010'];child=src['names']['Bone_009'];tip=src['names']['Bone_008'];rest=worlds(g.d);D=np.asarray(diagnostics['toe_mesh_witness_xyz']);toeLocal=np.linalg.inv(rest[tip])@np.r_[D,1.]
 for u in np.linspace(0,1,241):
  w=worlds(result.d,quats_at(result,u));bodies.append(w[root][:3,3]);sockets.append(w[child][:3,3]);actual=(w[tip]@toeLocal)[:3];toes.append(actual)
  target,_,_=gait_path_v07(u,cfg,diagnostics['stride_reach_factor'],D)
  maxToeError=max(maxToeError,float(np.linalg.norm(actual[:2]-target)))
 anchorDrift=max(np.linalg.norm(p-bodies[0]) for p in bodies)
 socketTravel=max(np.linalg.norm(s-sockets[0]) for s in sockets)
 assert_true(anchorDrift<1e-7,'V07_BODY_SIDE_BONE_HEAD_MOVED')
 assert_true(socketTravel>.007,'V07_PROXIMAL_LINK_NOT_ACTUALLY_MOVING')
 assert_true(maxToeError<.005,'V07_TOE_NOT_TRACKING_GAIT_TRAJECTORY:'+str(maxToeError))
 assert_true(all(a['interpolation']=='CUBICSPLINE' for a in result.d['animations'][0]['samplers']),'V07_INTERPOLATION_NOT_CUBIC')
 cfg['phase_label']='3-LINK CONTACT / QUICK STEP';cfg['version']='v07'
 # GIF 22 x 20 ms = 440 ms, no hidden 100 ms animation delay.
 cfg['gif_durations_ms']=[20]*int(cfg['gif_frames'])
 gif,meta=render(result,rsrc,cfg)
 with Image.open(io.BytesIO(gif)) as im:
  assert_true(im.n_frames==cfg['gif_frames'],'V07_FRAME_COUNT_MISMATCH')
  elapsed=sum((im.seek(i) or im.info.get('duration')) for i in range(im.n_frames))
 assert_true(elapsed==int(round(cfg['cycle_seconds']*1000)),'V07_WRONG_GIF_DURATION')
 diag={'source_sha256':EXPECTED_SHA,'new_rig_joint_count':52,'source_untouched':True,'weights_unchanged':True,'active_nodes':['Bone_010','Bone_009','Bone_008'],'body_side_pivot_max_drift':anchorDrift,'Bone_009_socket_travel':socketTravel,'toe_max_error_at_241_subframes':maxToeError,'step_events':diagnostics,'gif':meta,'gif_duration_ms':elapsed,'human_review':'PENDING','original_reference':'938497.mp4','observable_reference':'short sharp lift/fast swing/plant; exact angles NOT measurable'}
 safe_write(ROOT/V07_MODEL_REL,result.raw);safe_write(ROOT/V07_GIF_REL,gif);safe_write(ROOT/V07_DIAG_REL,json_bytes(diag));safe_write(ROOT/V07_BONEMAP_REL,three_link_bone_map(g,src,diagnostics,cfg))
 step2=commit_only([V07_MODEL_REL,V07_GIF_REL,V07_DIAG_REL,V07_BONEMAP_REL],'heady/v07 stage 2: real proximal bone + quick crab contact cycle')
 public=deliver_gif(ROOT/V07_GIF_REL)
 receipt={'campaign':'heady-newrig-v07','status':'CANDIDATE_AWAITING_HUMAN_REVIEW','step1_packet_commit':os.environ.get('HEADY_PACKET_COMMIT','UNKNOWN_DIRECT_RUN'),'step2_artifacts_commit':step2,'output_glb':str(ROOT/V07_MODEL_REL),'output_glb_sha256':sha_file(ROOT/V07_MODEL_REL),'output_gif':str(ROOT/V07_GIF_REL),'output_gif_sha256':sha_file(ROOT/V07_GIF_REL),'bone_diagnostic':str(ROOT/V07_BONEMAP_REL),'body_pivot_drift':anchorDrift,'proximal_socket_movement':socketTravel,'toe_tracking_error':maxToeError,'edited_weights':0,'animated_nodes':['Bone_010','Bone_009','Bone_008'],'gif_duration_ms':elapsed,'public':public,'human_verdict':'PENDING','git_remote_push':'NOT_ATTEMPTED'}
 safe_write(ROOT/V07_RECEIPT_REL,json_bytes(receipt));step3=commit_only([V07_RECEIPT_REL],'heady/v07 stage 3: public GIF proof and honest receipt')
 print('HEADY_V07=PASS_ANIMATION_CANDIDATE',flush=True)
 print('PACKET_COMMIT='+str(receipt['step1_packet_commit']),flush=True)
 print('ARTIFACT_COMMIT='+str(step2['head']),flush=True);print('RECEIPT_COMMIT='+str(step3['head']),flush=True)
 print('ACTIVE_BONES=Bone_010,Bone_009,Bone_008; CYCLE_SECONDS='+str(cfg['cycle_seconds']),flush=True)
 print('BODY_PIVOT_DRIFT='+str(round(anchorDrift,9))+'; MOVING_SOCKET_DISTANCE='+str(round(socketTravel,6)),flush=True)
 print('GLB='+receipt['output_glb'],flush=True);print('GIF='+receipt['output_gif'],flush=True)
 for k,p in public['locations'].items():print(k.upper()+'='+p,flush=True)
 print('OPEN_REQUEST='+public['open_request']['status']+'; VIEWER_NOT_CONFIRMED',flush=True)
 print('GIT_REMOTE_PUSH=NOT_ATTEMPTED; HUMAN_VERDICT=PENDING',flush=True)
 return receipt

def main():
 try:
  parser=argparse.ArgumentParser();parser.add_argument('command',nargs='?',choices=['run','run-v07','run-v06','run-v05','doctor'],default='run');args=parser.parse_args()
  if args.command=='doctor':
   validate_repo();assert_true(sha_file(ASSET)==EXPECTED_SHA,'SOURCE_MISSING');inspect_model(GLB(ASSET.read_bytes()));print('DOCTOR=PASS_52_JOINT_SOURCE');return 0
  if args.command=='run-v05':run_v05()
  elif args.command=='run-v06':run_v06()
  else:run_v07()
  return 0
 except Exception as e:
  print('HEADY_V05=FAIL',file=sys.stderr);print('REASON='+str(e),file=sys.stderr);traceback.print_exc(limit=3);return 2
if __name__=='__main__':raise SystemExit(main())
