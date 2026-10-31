#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail
VERSION="03.10.5"
MODEL_SHA="8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27"
PAYLOAD_SHA="1704ce5c9b2dfd53500e8831de5dc1a6244261d9f67533b3d0726b94ab68ada2"
NAME="HEADY_HAIR_RIG_v03_10_5_TERMUX_CAMPAIGN.sh"
CAMPAIGN="HEADY_HAIR_RIG"
STAGE="PRECHECK"
log(){ printf '%s\n' "$*"; }
blocked(){ log "RESULT=BLOCKED" "LAST_STAGE=$STAGE" "CAUSE=$*" "PRESERVATION=ORIGINAL_GLB_AND_PREVIOUS_CAMPAIGNS_UNCHANGED;NO_GITHUB_WRITES"; exit 2; }
trap 's=$?; log "RESULT=BLOCKED_UNEXPECTED_EXIT_$s" "LAST_STAGE=$STAGE" "PRESERVATION=ORIGINAL_GLB_AND_PREVIOUS_CAMPAIGNS_UNCHANGED"' ERR
SCRIPT="$(readlink -f "$0" 2>/dev/null || printf '%s' "$0")"
log "CAMPAIGN=$CAMPAIGN" "VERSION=$VERSION" "SCRIPT=$SCRIPT" "SCRIPT_SHA256=$(sha256sum "$SCRIPT" | cut -d' ' -f1)"
log "STAGE=VERIFY_EMBEDDED_ENGINE"
python3 - "$SCRIPT" "$PAYLOAD_SHA" <<'VERIFY_HAIR_PAYLOAD'
import hashlib,sys
p=sys.argv[1];want=sys.argv[2]
s=open(p,encoding='utf-8').read()
marker="<<'HEADY_HAIR_PAYLOAD'\n"
assert s.count(marker)==1, 'PAYLOAD_MARKER_NOT_UNIQUE'
b=s.split(marker,1)[1].split('\nHEADY_HAIR_PAYLOAD\n',1)[0]+'\n'
h=hashlib.sha256(b.encode('utf-8')).hexdigest()
print('EMBEDDED_SHA256='+h,flush=True)
assert h==want,'EMBEDDED_PYTHON_SHA256_MISMATCH'
compile(b,'heady_hair_engine_v03105.py','exec')
print('EMBEDDED_PYTHON_COMPILE=PASS',flush=True)
VERIFY_HAIR_PAYLOAD
STAGE="RESOLVE_SOURCE"
REPO=""
for candidate in "$HOME/storage/documents/GodotProjects/pose-lab-v2" "/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"; do
  if [ -d "$candidate/.git" ] && [ -f "$candidate/AGENTS.md" ]; then
    REPO="$(readlink -f "$candidate")"; break
  fi
done
[ -n "$REPO" ] || blocked "POSE_LAB_REPOSITORY_NOT_FOUND"
[ -f "$REPO/motion.html" ] || blocked "POSE_LAB_MOTION_HTML_MISSING"
[ -f "$REPO/scripts/build.mjs" ] || blocked "POSE_LAB_BUILD_SCRIPT_MISSING"
log "RESOLVED_REPO=$REPO"
log "HEAD=$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo UNKNOWN)"
log "BRANCH=$(git -C "$REPO" branch --show-current 2>/dev/null || echo UNKNOWN)"
MODEL=""
for path in \
 "$REPO/tools/heady/campaigns/grounded_ik_v03/review_v03_8/Meshy_AI_Character_output (1).glb" \
 "$REPO/tools/heady/campaigns/grounded_ik_v03/review_v03_7_1/Meshy_AI_Character_output (1).glb" \
 "$REPO/tools/heady/campaigns/grounded_ik_v03/review_v03_6/Meshy_AI_Character_output (1).glb"; do
 if [ -f "$path" ]; then
  actual="$(sha256sum "$path" | cut -d' ' -f1)"
  if [ "$actual" = "$MODEL_SHA" ]; then MODEL="$path"; break; fi
 fi
done
[ -n "$MODEL" ] || blocked "PINNED_52_JOINT_SOURCE_GLB_NOT_FOUND_OR_HASH_MISMATCH"
log "SOURCE_MODEL=$MODEL" "SOURCE_GLB_SHA256=$MODEL_SHA"
RENDERER="$REPO/tools/heady/campaigns/grounded_ik_v03/review_v03_8/renderer_readonly_reference.py"
[ -f "$RENDERER" ] || blocked "ORIGINAL_POSE_LAB_RENDERER_MISSING"
log "STAGE=DEPENDENCIES_AND_SAFE_OUTPUT_CHECK"
STAGE="DEPENDENCIES"
python3 -c 'import numpy,scipy,PIL; print("REQUIRED_DEPENDENCIES=PASS")' || blocked "MISSING_NUMPY_SCIPY_OR_PIL"
BASE="$REPO/tools/heady/campaigns/grounded_ik_v03"
TARGET="$BASE/review_v03_10_5"
if [ -e "$TARGET" ]; then
 STAGE="VERIFY_EXISTING_CANDIDATE"
 python3 - "$TARGET" "$MODEL_SHA" <<'VERIFY_PRIOR'
import json,sys,hashlib,pathlib
p=pathlib.Path(sys.argv[1]);r=json.loads((p/'Heady_v03_10_5_HairRig_Receipt.json').read_text())
assert r['version']=='03.10.5' and r['source_sha256']==sys.argv[2]
g=p/'Heady_v03_10_5_SevenBoneHairRig_Candidate.glb'
assert hashlib.sha256(g.read_bytes()).hexdigest()==r['derived_glb_sha256']
for n in (r['mask_filename'],r['preview_filename']):assert (p/n).is_file()
print('EXISTING_CANDIDATE=VERIFIED_REUSE',flush=True)
VERIFY_PRIOR
else
 STAGE="CREATE_SCOPED_STAGING"
 TEMP="$BASE/.hair_v03_10_5_stage_$$"
 [ ! -e "$TEMP" ] || blocked "STAGING_NAME_COLLISION"
 mkdir "$TEMP" || blocked "STAGING_CREATION_FAILED"
 log "WORK_STAGING=$TEMP"
 log "STAGE=RUN_ACTUAL_GLB_HAIR_RIG"
 STAGE="RUN_ACTUAL_GLB_HAIR_RIG"
 HEADY_REPO="$REPO" python3 - "$MODEL" "$TEMP" <<'HEADY_HAIR_PAYLOAD'
#!/usr/bin/env python3
"""Heady 03.10.5: conservative skin-weight isolation, independent seven-node hair rig.

NO simulation in this campaign. Three.js/WebXR momentum hair controller belongs to next campaign.
Source pin: original 52-joint Meshy GLB (immutable). Derived GLB only.
"""
from __future__ import annotations
import os, sys, json, struct, math, hashlib, io, copy, time, traceback
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.spatial.transform import Rotation as Rot
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

VERSION='03.10.5'
HASH='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
SKIN_COUNTS=52
HAIR_NODES=['HeadyHair_Root']+[f'HeadyHair_{x:02d}' for x in range(1,7)]
# The groups below are complete long-ribbon groups verified on this exact GLB.
# The main connected mesh (group zero) requires conservative, spatial/texture gating.
LONG_RIBBONS=(1,3,5,6,7,19,35,54,62,71)

def log(*a): print(*a,flush=True)
def check(cond,why):
 if not cond:raise RuntimeError(why)
def sha(b):return hashlib.sha256(b).hexdigest()

class Model:
 def __init__(self,data):
  check(sha(data)==HASH,'SOURCE_GLB_SHA256_MISMATCH')
  magic,ver,length=struct.unpack_from('<4sII',data,0)
  check(magic==b'glTF' and ver==2 and length==len(data),'INVALID_GLB')
  jl,jt=struct.unpack_from('<II',data,12);check(jt==0x4e4f534a,'INVALID_GLB_JSON_CHUNK')
  self.j=json.loads(data[20:20+jl]);at=20+jl
  bl,bt=struct.unpack_from('<II',data,at)
  check(bt==0x004e4942,'INVALID_GLB_BIN_CHUNK')
  self.bin=bytes(data[at+8:at+8+bl]);check(at+8+bl==len(data),'TRUNCATED_GLB')
  self.data=data
  self.attrs=self.j['meshes'][0]['primitives'][0]['attributes']
  self.p=self.read(self.attrs['POSITION']).astype(float)
  self.t=self.read(self.attrs['TEXCOORD_0']).astype(float)
  self.ji=self.read(self.attrs['JOINTS_0']).astype(np.uint8)
  self.w=self.read(self.attrs['WEIGHTS_0']).astype(float)
  self.f=self.read(self.j['meshes'][0]['primitives'][0]['indices']).ravel().astype(int).reshape(-1,3)
  self.skin=self.j['skins'][0]
  self.ibms=self.read(self.skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1).astype(float)
  self.tex=self.base_texture()
  check(len(self.p)==9021 and len(self.skin['joints'])==SKIN_COUNTS,'UNEXPECTED_SOURCE_TOPOLOGY')
  check(self.j['accessors'][self.attrs['JOINTS_0']]['componentType']==5121,'JOINT_FORMAT_NOT_UINT8')
  check(self.j['accessors'][self.attrs['WEIGHTS_0']]['componentType']==5126,'WEIGHT_FORMAT_NOT_FLOAT32')
  check(np.max(np.abs(self.w.sum(axis=1)-1))<3e-6,'SOURCE_WEIGHTS_NOT_NORMALIZED')
 def read(self,n):
  a=self.j['accessors'][n];v=self.j['bufferViews'][a['bufferView']]
  check(not a.get('sparse'),'SPARSE_ACCESSOR_UNSUPPORTED')
  d={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
  k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  dt=np.dtype(d); off=v.get('byteOffset',0)+a.get('byteOffset',0)
  stride=v.get('byteStride',k*dt.itemsize)
  if stride==k*dt.itemsize:return np.frombuffer(self.bin,dtype=dt,count=a['count']*k,offset=off).reshape(-1,k).copy()
  return np.ndarray((a['count'],k),dtype=dt,buffer=self.bin,offset=off,strides=(stride,dt.itemsize)).copy()
 def base_texture(self):
  mat=self.j['materials'][0];tx=self.j['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]
  view=self.j['bufferViews'][self.j['images'][tx['source']]['bufferView']]
  b=self.bin[view['byteOffset']:view['byteOffset']+view['byteLength']]
  return np.asarray(Image.open(io.BytesIO(b)).convert('RGB'))

def worlds(doc,rot_changes=None):
 nodes=doc['nodes'];parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
 rot_changes=rot_changes or {};cache={}
 def rec(i):
  if i in cache:return cache[i]
  n=nodes[i];m=np.eye(4)
  m[:3,3]=n.get('translation',[0,0,0])
  R=Rot.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()
  if i in rot_changes:R=R@Rot.from_rotvec(np.asarray(rot_changes[i],float)).as_matrix()
  m[:3,:3]=R@np.diag(n.get('scale',[1,1,1]))
  cache[i]=rec(parents[i])@m if i in parents else m
  return cache[i]
 return np.asarray([rec(i) for i in range(len(nodes))])

def skinpts(model,doc,ibms,joints,weights,rot_changes=None):
 wm=worlds(doc,rot_changes)
 mat=wm[np.asarray(doc['skins'][0]['joints'],int)]@ibms
 pp=np.c_[model.p,np.ones(len(model.p))]
 result=np.zeros((len(pp),3),float)
 for k in range(4):
  a=np.einsum('nij,nj->ni',mat[joints[:,k]],pp)
  result+=weights[:,k,None]*a[:,:3]
 return result

def vertex_color(model):
 t=model.t
 h,w,_=model.tex.shape
 x=np.clip(np.rint(t[:,0]*(w-1)).astype(int),0,w-1)
 y=np.clip(np.rint((1.0-t[:,1])*(h-1)).astype(int),0,h-1)
 return model.tex[y,x].astype(float)/255.

def grow_hair_mask(model):
 p=model.p; n=len(p);faces=model.f;origW=model.w
 # Weld only to recover *diagnostic* long ribbons, not to indiscriminately flood the main body.
 _,inv=np.unique(np.round(p,5),axis=0,return_inverse=True)
 aa=np.r_[inv[faces[:,0]],inv[faces[:,1]],inv[faces[:,2]]]
 bb=np.r_[inv[faces[:,1]],inv[faces[:,2]],inv[faces[:,0]]]
 A=coo_matrix((np.ones(len(aa)*2),(np.r_[aa,bb],np.r_[bb,aa])),shape=(inv.max()+1,inv.max()+1)).tocsr()
 cnt,cl=connected_components(A,directed=False)
 comp=cl[inv]
 check(cnt==79,'CONNECTED_COMPONENT_COUNT_CHANGED')
 # Truly disconnected elongated ribbons are selected together, including their non-plum highlights.
 ribbon=np.isin(comp,LONG_RIBBONS)
 col=vertex_color(model);r,g,b=col.T
 # Conservative plum test. Avoid pale face/white blouse and orange/black crab limbs.
 plum=(r>.13)&(r<.65)&(b>.14)&(b>.48*r)&(b>1.27*g)&(r>1.5*g)&(g<.19)
 x,y,z=p.T
 # Farthest-back hair can be distinct in 3D, whereas rear leg endpoints mostly stay near z=-0.29.
 # The threshold tightens farther down to exclude all six feet.
 cutoff=np.interp(y,[0,.4,.65,.85,1.0,1.30,1.5,1.7],[-.35,-.35,-.31,-.21,-.14,-.075,-.065,-.075])
 bulk=(comp==0)&(z<cutoff)&plum&(y>.06)&(y<1.56)
 # Keep a narrow, rigid head-adjacent collar; prevent skin-painting scalp and accessories.
 main=bulk|ribbon
 # The root transition is deliberately stiff and not sourced from lower-body weights.
 root_zone=y>=1.37
 # near the top, only posterior geometry and definitely purple hair
 main&=(~root_zone)|((z<-.065)&plum)
 # Hard exclusion of verified actual toe-witness vertices, which must never become hair.
 # Estimate actual toes from y<=.028, leg-dominant original weights, and x/z spread.
 jnames=[model.j['nodes'][q]['name'] for q in model.skin['joints']]
 leg_nodes=[f'Bone_{q:03d}' for q in (7,6,5,13,12,11,21,20,19,18,24,23,22,10,9,8,17,16,15,14)]
 leg_ids=np.array([jnames.index(q) for q in leg_nodes],int)
 lw=(np.isin(model.ji,leg_ids)*origW).sum(axis=1)
 toes=(y<.030)&(lw>.65)
 # Protect their triangle-neighbors as well. Crabs keep all six legs.
 protected=toes.copy()
 incident=np.any(toes[faces],axis=1)
 if incident.any(): protected[faces[incident].ravel()]=True
 main[protected]=False
 # SELECT MORE at the *raw triangle island* level: never split a triangle's three
 # vertices between moved and unmoved rigs. This avoids tearing in the ribbon mesh.
 ra=np.r_[faces[:,0],faces[:,1],faces[:,2]]
 rb=np.r_[faces[:,1],faces[:,2],faces[:,0]]
 B=coo_matrix((np.ones(2*len(ra)),(np.r_[ra,rb],np.r_[rb,ra])),shape=(n,n)).tocsr()
 nraw,rlab=connected_components(B,directed=False)
 sizes=np.bincount(rlab,minlength=nraw)
 hits=np.bincount(rlab,weights=main.astype(float),minlength=nraw)
 pz=np.bincount(rlab,weights=z,minlength=nraw)/np.maximum(1,sizes)
 py=np.bincount(rlab,weights=y,minlength=nraw)/np.maximum(1,sizes)
 protect_group=np.bincount(rlab,weights=protected.astype(float),minlength=nraw)>0
 # Preserve entire high-confidence long ribbons; extend main body hair only
 # to small triangular pieces sharing at least 30% of conservative hair seeds.
 accept=(hits/np.maximum(sizes,1)>=.30)&(pz<-.08)&(py<1.48)&(~protect_group)
 main=accept[rlab]
 check(not np.any((main[faces].sum(axis=1)>0)&(main[faces].sum(axis=1)<3)), 'PARTIAL_TRIANGLE_HAIR_MASK')
 # Need a substantial, separate posterior hair candidate and strong leg-weight contamination proof.
 check(main.sum()>200,'HAIR_SELECTION_TOO_SMALL')
 check(main.sum()<.29*n,'HAIR_SELECTION_TOO_BROAD')
 check((lw[main]>.15).sum()>25,'UNEXPECTED_NO_HAIR_LEG_CONTAMINATION')
 check(not np.any(main&protected),'HAIR_MASK_INTERSECTS_PROTECTED_TOES')
 return main,{'total_vertices':n,'hair_vertices':int(main.sum()),'disconnected_ribbons':int(ribbon.sum()),'main_mesh_candidates':int(bulk.sum()),'hair_with_leg_weight':int((lw[main]>1e-5).sum()),'hair_mean_leg_weight':float(lw[main].mean()),'protected_toe_vertices':int(protected.sum()),'unselected_posterior_plum':int(((z<cutoff)&plum&~main).sum()),'mask_coverage_is_complete':'NOT_ASSERTED','leg_bones':leg_nodes}

def new_hair_rig(model,mask):
 doc=copy.deepcopy(model.j);outJ=model.ji.copy();outW=model.w.astype(np.float32).copy()
 old_count=len(doc['nodes']);existing=worlds(doc)
 head=next(i for i,x in enumerate(doc['nodes']) if x.get('name')=='Bone_025')
 parentWorld=existing[head]
 # At rest this chain follows head and progresses through the back hair down toward its tips.
 yys=[1.38,1.23,1.05,.86,.67,.46,.25]
 zz=[-.12,-.16,-.21,-.26,-.30,-.36,-.42]
 pos=np.array([[.0,yy,zz_] for yy,zz_ in zip(yys,zz)])
 newnodes=[]
 for i,name in enumerate(HAIR_NODES):
  if i==0:
   local=np.linalg.inv(parentWorld)@np.r_[pos[0],1.]
   rot=Rot.from_matrix(parentWorld[:3,:3]).inv().as_quat().tolist()
   tr=local[:3].tolist()
  else:rot=[0,0,0,1];tr=(pos[i]-pos[i-1]).tolist()
  nd={'name':name,'translation':tr,'rotation':rot}
  if i<6:nd['children']=[old_count+i+1]
  newnodes.append(nd)
 doc['nodes'][head].setdefault('children',[]).append(old_count)
 doc['nodes'].extend(newnodes)
 # One fixed scalp root plus six flexible sections. Each vertex uses at most two adjacent bones.
 ids=list(range(SKIN_COUNTS,SKIN_COUNTS+len(HAIR_NODES)))
 yy=model.p[mask,1]
 f=(pos[0,1]-yy)/(pos[0,1]-pos[-1,1])*6
 f=np.clip(f,0,6)
 low=np.minimum(np.floor(f).astype(int),5)
 alpha=f-low
 # Rigid head collar: first ~10-15cm is attached to scalp root.
 stiff=yy>=1.30
 low[stiff]=0;alpha[stiff]=0
 ix=np.flatnonzero(mask)
 outJ[ix,:]=0;outW[ix,:]=0.
 outJ[ix,0]=np.asarray(ids)[low];outJ[ix,1]=np.asarray(ids)[low+1]
 outW[ix,0]=1-alpha;outW[ix,1]=alpha
 outJ[ix[stiff],1]=0;outW[ix[stiff],1]=0
 check(np.max(outJ)<256,'JOINTS_0_UINT8_OVERFLOW')
 check(np.max(np.abs(outW.sum(axis=1)-1))<1e-5,'WEIGHT_SUM_INVALID')
 check(np.array_equal(outJ[~mask],model.ji[~mask]),'NONHAIR_JOINTS_CHANGED')
 check(np.array_equal(outW[~mask],model.w[~mask].astype(np.float32)),'NONHAIR_WEIGHTS_CHANGED')
 skin=doc['skins'][0];skin['joints'].extend(range(old_count,old_count+7))
 new_world=worlds(doc)
 ext=np.array([np.linalg.inv(new_world[old_count+i]) for i in range(7)])
 ibms=np.concatenate([model.ibms,ext])
 check(ibms.shape==(59,4,4),'IBM_WRONG_SHAPE')
 # Input GLB is packed. Modify only JOINTS_0 & WEIGHTS_0 and append the expanded IBM buffer.
 binary=bytearray(model.bin)
 def write_attr(accessor,values):
  a=doc['accessors'][accessor];v=doc['bufferViews'][a['bufferView']]
  data=np.asarray(values)
  dt={5121:np.uint8,5126:np.dtype('<f4')}[a['componentType']]
  check(v.get('byteStride') in (None,data.shape[1]*np.dtype(dt).itemsize),'INTERLEAVED_ATTRIBUTES_UNSUPPORTED')
  data=data.astype(dt,copy=False).tobytes(order='C')
  start=v.get('byteOffset',0)+a.get('byteOffset',0)
  end=start+len(data);check(end<=len(binary),'ATTRIBUTE_RANGE_OVERFLOW')
  binary[start:end]=data
 write_attr(model.attrs['JOINTS_0'],outJ)
 write_attr(model.attrs['WEIGHTS_0'],outW)
 while len(binary)%4:binary.append(0)
 offs=len(binary)
 bmat=ibms.transpose(0,2,1).astype('<f4').tobytes()
 binary.extend(bmat)
 doc['bufferViews'].append({'buffer':0,'byteOffset':offs,'byteLength':len(bmat)})
 doc['accessors'].append({'bufferView':len(doc['bufferViews'])-1,'componentType':5126,'count':len(ibms),'type':'MAT4'})
 skin['inverseBindMatrices']=len(doc['accessors'])-1
 doc['buffers'][0]['byteLength']=len(binary)
 doc.setdefault('asset',{}).setdefault('extras',{})['heady_hair_rig']={'campaign':'03.10.5','model_source_sha256':HASH,'new_nodes':HAIR_NODES,'physics':'NOT_CONFIGURED'}
 jb=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8');jb+=b' '*((-len(jb))%4)
 while len(binary)%4:binary.append(0)
 raw=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+bytes(binary)
 return raw,doc,ibms,outJ,outW,old_count,pos

def check_rig(model,mask,candidate,doc,ibms,ji,w,first_node):
 check(len(doc['skins'][0]['joints'])==59,'RIG_JOINT_COUNT_WRONG')
 check(len(doc['nodes'])==61,'NODE_COUNT_WRONG')
 check(not doc.get('animations'),'SOURCE_ANIMATIONS_WERE_ADDED')
 check(len(doc['meshes'])==len(model.j['meshes']),'MESH_COUNT_CHANGED')
 check([n.get('name') for n in doc['nodes'][:54]]==[n.get('name') for n in model.j['nodes']],'ORIGINAL_NODE_NAMES_CHANGED')
 rest=skinpts(model,doc,ibms,ji,w)
 rest0=skinpts(model,model.j,model.ibms,model.ji,model.w)
 maxdiff=float(np.max(np.linalg.norm(rest-rest0,axis=1)))
 check(maxdiff<.00008,f'REST_SKIN_DRIFT={maxdiff}')
 # Rotate all six leg root nodes one at a time. Hair must remain completely still.
 names={n.get('name'):i for i,n in enumerate(doc['nodes'])}
 legroots=['Bone_007','Bone_013','Bone_021','Bone_024','Bone_010','Bone_017']
 maxhair=0;maxoutside=0
 for bone in legroots:
  test=skinpts(model,doc,ibms,ji,w,{names[bone]:[.0,0.23,0.0]})
  hair_error=float(np.max(np.linalg.norm(test[mask]-rest[mask],axis=1)))
  maxhair=max(maxhair,hair_error)
  outside=float(np.max(np.linalg.norm(test[~mask]-rest[~mask],axis=1)))
  maxoutside=max(maxoutside,outside)
 check(maxhair<.00009,f'LEG_DRIVES_NEW_HAIR={maxhair}')
 check(maxoutside>.0004,'CANARY_LEG_ROTATION_NOT_DETECTABLE')
 # The new root follows the source head, including turns and nods.
 head_test=skinpts(model,doc,ibms,ji,w,{names['Bone_025']:[.07,.11,.02]})
 head_shift=float(np.max(np.linalg.norm(head_test[mask]-rest[mask],axis=1)))
 check(head_shift>.001,'HAIR_ROOT_NOT_FOLLOWING_HEAD')
 # Independently rotate a real hair bone, verify the visible body stays fixed.
 test=skinpts(model,doc,ibms,ji,w,{first_node+3:[.0,0.22,0.]})
 mh=float(np.max(np.linalg.norm(test[mask]-rest[mask],axis=1)))
 mn=float(np.max(np.linalg.norm(test[~mask]-rest[~mask],axis=1)))
 check(mh>.0004,'HAIR_BONE_DOES_NOT_DEFORM_HAIR')
 check(mn<.00009,'HAIR_BONE_MOVES_NONHAIR')
 return {'rest_skinned_max_displacement':maxdiff,'leg_induced_selected_hair_displacement_max':maxhair,'leg_rotation_other_mesh_displacement':maxoutside,'hair_bone_selected_hair_displacement':mh,'hair_bone_nonhair_displacement':mn,'head_rotation_moves_hair':head_shift,'skin_joints':len(doc['skins'][0]['joints']),'source_preserved':sha(model.data)==HASH}

def diagnostic(model,mask,directory,stat,positions):
 from PIL import Image,ImageDraw,ImageFont
 p=model.p;im=Image.new('RGB',(1440,800),(14,20,27));d=ImageDraw.Draw(im)
 panels=[('FRONT | original geometry / hair mask',0,1,0,0),('SIDE | depth vs height',2,1,720,0)]
 for title,xi,yi,dx,dy in panels:
  d.text((dx+20,15),title,fill=(231,237,235))
  # global fixed camera gives identical scale for selection and evidence
  scale=415; xc=dx+350;yc=dy+705
  for i in np.flatnonzero(~mask):
   x=int(xc+p[i,xi]*scale);y=int(yc-p[i,yi]*scale)
   if dx<=x<dx+720 and 40<=y<780:d.point((x,y),fill=(76,84,91))
  for i in np.flatnonzero(mask):
   x=int(xc+p[i,xi]*scale);y=int(yc-p[i,yi]*scale)
   if dx<=x<dx+720 and 40<=y<780:d.ellipse((x-1,y-1,x+1,y+1),fill=(237,104,173))
  for j,xyz in enumerate(positions):
   x=int(xc+xyz[xi]*scale);y=int(yc-xyz[yi]*scale)
   d.ellipse((x-5,y-5,x+5,y+5),outline=(88,228,203),width=2)
   d.text((x+8,y-5),str(j),fill=(88,228,203))
 d.text((20,776),f"Heady v03.10.5 | Selected: {stat['hair_vertices']}/{stat['total_vertices']} | ORIGINAL geometry and pixels preserved",fill=(229,213,182))
 path=directory/'Heady_v03_10_5_HairMask_Audit.png';im.save(path)
 return path

def render_preview(model,doc,ibms,ji,w,first,directory):
 # Actual skinned source-mesh render via the established Pose Lab raster helper.
 import importlib.util
 root=os.environ.get('HEADY_REPO','')
 render_source=Path(root)/'tools/heady/campaigns/grounded_ik_v03/review_v03_8/renderer_readonly_reference.py'
 if not render_source.is_file():raise RuntimeError('POSE_LAB_RENDERER_MISSING: '+str(render_source))
 spec=importlib.util.spec_from_file_location('heady_original_renderer',render_source)
 ren=importlib.util.module_from_spec(spec);spec.loader.exec_module(ren)
 frames=[]
 for i in range(9):
  t=i/8.
  bend=0.19*math.sin(math.pi*t)
  twists={first+q:[0.,(-1)**q*bend*(q/6),.0] for q in range(1,7)}
  sk=skinpts(model,doc,ibms,ji,w,twists)
  canvas=Image.new('RGB',(880,494),(12,17,22));draw=ImageDraw.Draw(canvas)
  cams=[('FRONT',[-.04,1.13,3.4],[0,.83,0.0]),('OBLIQUE',[2.3,1.24,2.2],[0,.83,0])]
  for c,(name,eye,focus) in enumerate(cams):
   image=ren.raster(sk,model.t,model.f,model.tex,eye,focus,255,426,430)
   canvas.paste(image,(7+c*440,35));draw.text((14+c*440,12),name+' | skinned new rig',fill=(230,234,237))
  draw.text((12,472),'HEADY v03.10.5 | Hair-bone articulation proof | NOT PHYSICS | source mesh/UV unchanged',fill=(226,208,181))
  frames.append(canvas)
  log(f'RENDER_PROGRESS={i+1}/9')
 dest=directory/'Heady_v03_10_5_HairBones_Candidate.gif'
 frames[0].save(dest,save_all=True,append_images=frames[1:],duration=110,loop=0,optimize=False)
 return dest

def main():
 check(len(sys.argv)==3,'USAGE: hair_engine.py ORIGINAL_GLB OUTPUT_DIRECTORY')
 src=Path(sys.argv[1]);dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
 log('CAMPAIGN=HEADY_HAIR_RIG','VERSION='+VERSION,'PHYSICS=DEFERRED_INERTIAL_NO_REST_SPRING')
 model=Model(src.read_bytes()); log('SOURCE=VERIFIED_SHA256_52JOINTS')
 log('PHASE=CONSERVATIVE_SELECT_MORE')
 mask,stat=grow_hair_mask(model); log('MASK_SELECTED='+str(stat['hair_vertices']),'HAIR_CONTAMINATED='+str(stat['hair_with_leg_weight']))
 log('PHASE=APPEND_HAIR_RIG_AND_REWEIGHT')
 raw,doc,ibms,ji,w,first,positions=new_hair_rig(model,mask)
 check(sha(model.data)==HASH,'SOURCE_CHANGED_DURING_RUN')
 log('PHASE=DIFFERENTIAL_SKIN_TESTS')
 tests=check_rig(model,mask,raw,doc,ibms,ji,w,first);log('TEST_RESULTS='+json.dumps(tests))
 candidate=dest/'Heady_v03_10_5_SevenBoneHairRig_Candidate.glb'
 candidate.write_bytes(raw)
 img=diagnostic(model,mask,dest,stat,positions)
 log('PHASE=SOURCE_TEXTURED_SKINNED_PREVIEW')
 preview=render_preview(model,doc,ibms,ji,w,first,dest)
 # Open the generated file structurally and verify changed skin records.
 gen=candidate.read_bytes();check(gen[:4]==b'glTF' and struct.unpack_from('<I',gen,8)[0]==len(gen),'CANDIDATE_GLB_INVALID')
 receipt={'campaign':'HEADY_HAIR_RIG','version':VERSION,'state':'CANDIDATE_NOT_ACCEPTED',
          'source_sha256':HASH,'derived_glb_sha256':sha(gen),'input_vertex_count':len(model.p),
          'original_joint_count':52,'candidate_joint_count':59,'hair_bone_nodes':HAIR_NODES,
          'new_hair_vertex_mask':stat,'skin_test':tests,
          'preview_filename':preview.name,'mask_filename':img.name,
          'scope':'ORIGINAL_GLB_UNMODIFIED; NO_NEW_MESH; SEVEN_NEW_BONES; HAIR_WEIGHT_ROWS_ONLY',
          'physics':'NOT_IMPLEMENTED (NEXT CAMPAIGN: THREEJS_INERTIAL_DRAG_GRAVITY_NO_REST_RESTORE)',
          'limit':'Conservative posterior geometry and disconnected ribbons: review mask before claiming entire hairstyle',
          'generated_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
 (dest/'Heady_v03_10_5_HairRig_Receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 log('RESULT=GENERATED_CANDIDATE_NEEDS_HUMAN_MASK_APPROVAL')
 log('CANDIDATE='+str(candidate));log('CANDIDATE_SHA256='+sha(gen))
 log('MASK_AUDIT='+str(img));log('REVIEW_GIF='+str(preview))
if __name__=='__main__':
 try:main()
 except Exception as e:
  print('RESULT=BLOCKED','CAUSE='+str(e),'TRACE='+traceback.format_exc(limit=3).replace('\n',' | '),flush=True)
  raise SystemExit(2)
HEADY_HAIR_PAYLOAD
 cp "$SCRIPT" "$TEMP/$NAME"
 [ "$(sha256sum "$TEMP/$NAME" | cut -d' ' -f1)" = "$(sha256sum "$SCRIPT" | cut -d' ' -f1)" ] || blocked "SCRIPT_REPO_COPY_BAD_HASH"
 [ ! -e "$TARGET" ] || blocked "TARGET_CREATED_DURING_RENDER_PRESERVING_TEMP"
 mv "$TEMP" "$TARGET" || blocked "PROMOTE_SCOPED_CANDIDATE_FAILED"
 log "CANDIDATE_PROMOTED=$TARGET"
fi
STAGE="PUBLISH_VERIFIED_IMAGES"
checked_publish(){
 local SRC="$1" DIR="$2" NAME="$3" DEST H1 H2
 DEST="$DIR/$NAME"
 [ -s "$SRC" ] || blocked "PUBLIC_SOURCE_MISSING:$SRC"
 [ -d "$DIR" ] || blocked "PUBLIC_DIRECTORY_MISSING:$DIR"
 H1="$(sha256sum "$SRC" | cut -d' ' -f1)"
 if [ -e "$DEST" ]; then
  H2="$(sha256sum "$DEST" | cut -d' ' -f1)"
  [ "$H1" = "$H2" ] || blocked "PUBLIC_NAME_COLLISION_DIFFERENT_BYTES:$DEST"
 else
  cp -n "$SRC" "$DEST" || blocked "PUBLIC_COPY_FAILED:$DEST"
  H2="$(sha256sum "$DEST" | cut -d' ' -f1)"
  [ "$H1" = "$H2" ] || blocked "PUBLIC_READBACK_SHA_MISMATCH:$DEST"
 fi
 log "PUBLISHED=$DEST" "PUBLIC_SHA256=$H1"
 if command -v mediarefresh >/dev/null 2>&1; then
  if mediarefresh "$DEST" >/dev/null 2>&1; then log "MEDIA_SCAN_REQUESTED=$DEST"; else log "MEDIA_SCAN=UNAVAILABLE:$DEST"; fi
 elif command -v termux-media-scan >/dev/null 2>&1; then
  if termux-media-scan "$DEST" >/dev/null 2>&1; then log "MEDIA_SCAN_REQUESTED=$DEST"; else log "MEDIA_SCAN=UNAVAILABLE:$DEST"; fi
 else log "MEDIA_SCAN=NO_SCANNER:$DEST";fi
}
for KIND in pictures downloads; do
 DIR="$HOME/storage/$KIND"
 checked_publish "$TARGET/Heady_v03_10_5_HairMask_Audit.png" "$DIR" "Heady_v03_10_5_HairMask_Audit.png"
 checked_publish "$TARGET/Heady_v03_10_5_HairBones_Candidate.gif" "$DIR" "Heady_v03_10_5_HairBones_Candidate.gif"
done
checked_publish "$TARGET/Heady_v03_10_5_SevenBoneHairRig_Candidate.glb" "$HOME/storage/downloads" "Heady_v03_10_5_SevenBoneHairRig_Candidate.glb"
STAGE="VIEWER_OPEN_ATTEMPT"
if command -v termux-open >/dev/null 2>&1; then
 if termux-open "$HOME/storage/pictures/Heady_v03_10_5_HairBones_Candidate.gif" >/dev/null 2>&1; then log "OPEN=REQUESTED_NOT_CONFIRMED"; else log "OPEN=FAILED_OR_UNAVAILABLE"; fi
else log "OPEN=UNAVAILABLE";fi
log "RESULT=CANDIDATE_GENERATED_AND_PUBLISHED"
log "ACCEPTANCE=HUMAN_REVIEW_REQUIRED_FOR_ENTIRE_HAIR_MASK"
log "PHYSICS=NOT_IMPLEMENTED; NEXT_THREEJS_INERTIAL_NO_SPRING_TO_REST"
log "OUTPUT_DIR=$TARGET"
log "PRESERVATION=ORIGINAL_GLB_PRIOR_GAITS_GIT_INDEX_UNCHANGED;NO_GITHUB_WRITES"
