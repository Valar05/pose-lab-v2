#!/usr/bin/env python3
"""Heady 52-joint rest-model: ground-locked feet under BODY translation.

Run: python grounded_ik_static_test.py /absolute/source.glb /absolute/output/dir
Performs one deliberately small static root translation experiment, NEVER creates
animation tracks, and does not modify the source. Six joint families are fitted
against actual LINEAR-BLEND-SKINNED toe vertex witnesses. Solver joint axes are
PROVISIONAL: local X/Z only, no twist; no anatomical mechanical limits validated.
"""
from __future__ import annotations
import sys, json, struct, hashlib, csv
from pathlib import Path
from functools import lru_cache
import numpy as np
from scipy.spatial.transform import Rotation as Rot
from scipy.optimize import least_squares

src=Path(sys.argv[1]); out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
data=src.read_bytes(); sourcehash=hashlib.sha256(data).hexdigest()
EXPECTED='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
assert sourcehash==EXPECTED, 'SOURCE_HASH_MISMATCH'
assert data[:4]==b'glTF'
json_len,json_ty=struct.unpack_from('<II',data,12);assert json_ty==0x4e4f534a
J=json.loads(data[20:20+json_len]);binhead=20+json_len
binlen,bintype=struct.unpack_from('<II',data,binhead);assert bintype==0x004e4942
binb=data[binhead+8:binhead+8+binlen]
N=len(J['nodes']);orig_nodes=J['nodes']
parents={c:i for i,n in enumerate(orig_nodes) for c in n.get('children',[])}
names={n.get('name'):i for i,n in enumerate(orig_nodes)}
worldroot=names['SmartRigArmature'];mesh_n=names['Mesh_0']
links={'left_front':['Bone_007','Bone_006','Bone_005'],
       'left_middle':['Bone_013','Bone_012','Bone_011'],
       'left_rear':['Bone_021','Bone_020','Bone_019','Bone_018'],
       'right_front':['Bone_024','Bone_023','Bone_022'],
       'right_middle':['Bone_010','Bone_009','Bone_008'],
       'right_rear':['Bone_017','Bone_016','Bone_015','Bone_014']}
keys=list(links)
chains={label:[names[s] for s in b] for label,b in links.items()}
skinJ=J['skins'][0]['joints'];skin2node=np.asarray(skinJ,int)
node2skin={node:i for i,node in enumerate(skinJ)}
view_types={5120:'i1',5121:'u1',5122:'i2',5123:'u2',5125:'u4',5126:'f4'}
shapes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def readacc(i):
 a=J['accessors'][i];v=J['bufferViews'][a['bufferView']];t=np.dtype('<'+view_types[a['componentType']]);count=shapes[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0)
 stride=v.get('byteStride',count*t.itemsize)
 if stride==count*t.itemsize:
  ar=np.frombuffer(binb,dtype=t,offset=off,count=a['count']*count).reshape(-1,count).copy()
 else:ar=np.ndarray((a['count'],count),dtype=t,buffer=binb,offset=off,strides=(stride,t.itemsize)).copy()
 if a.get('normalized'):ar=ar.astype(float)/np.iinfo(t).max
 return ar
skin=J['skins'][0]
IBM=readacc(skin['inverseBindMatrices']).astype(float).reshape(-1,4,4).transpose(0,2,1)
attrs=J['meshes'][0]['primitives'][0]['attributes'];P=readacc(attrs['POSITION']).astype(float)
VH=np.c_[P,np.ones(len(P))]
W=readacc(attrs['WEIGHTS_0']).astype(float)
JI=readacc(attrs['JOINTS_0']).astype(int)
assert np.max(np.abs(W.sum(axis=1)-1))<2e-6

# Original local transforms contain meaningful non-axis-aligned quaternion frames.
base_R={i:Rot.from_quat(n.get('rotation',[0,0,0,1])).as_matrix() for i,n in enumerate(orig_nodes)}
base_t={i:np.asarray(n.get('translation',[0,0,0]),float) for i,n in enumerate(orig_nodes)}
base_s={i:np.asarray(n.get('scale',[1,1,1]),float) for i,n in enumerate(orig_nodes)}

def build_matrices(root_delta=None,delta_angles=None):
 root_delta=np.zeros(3) if root_delta is None else np.asarray(root_delta,float)
 delta_angles={} if delta_angles is None else delta_angles
 @lru_cache(None)
 def g(i):
  t=base_t[i].copy()
  if i==worldroot:t+=root_delta
  M=np.eye(4);M[:3,3]=t
  R=base_R[i]
  if i in delta_angles:
   x,z=delta_angles[i]
   R=R@Rot.from_rotvec([x,0.0,z]).as_matrix()
  M[:3,:3]=R@np.diag(base_s[i])
  return g(parents[i])@M if i in parents else M
 return np.array([g(i) for i in range(N)])

M0=build_matrices();binding=M0[skin2node]@IBM
assert np.max(np.abs(binding-np.eye(4)))<6e-5, ('IBM_MISMATCH',np.max(np.abs(binding-np.eye(4))))

def skin_vertices(M,ids=None):
 # Fully evaluated skinning, including non-leg influences, not only FK marker.
 if ids is None:ids=np.arange(len(P))
 bmat=M[skin2node]@IBM
 p=VH[ids]
 sk=np.zeros((len(ids),3),float)
 for slot in range(4):
  weights=W[ids,slot]
  # Matrices selected per vertex for arbitrary JOINTS_0 skin index
  v=np.einsum('nij,nj->ni',bmat[JI[ids,slot]],p)
  sk+=v[:,:3]*weights[:,None]
 return sk

restskin=skin_vertices(M0)
max_rest_error=np.max(np.linalg.norm(restskin-P,axis=1))
assert max_rest_error<5e-5,max_rest_error

# Determine fixed witness groups once from source (without moving target during optimization).
toe_sets={}; toe_anchor={};ownership={}; groups={}
for label,chain in chains.items():
 ownskin=[node2skin[n] for n in chain]
 own_w=(np.isin(JI,ownskin)*W).sum(axis=1)
 owner=np.flatnonzero(own_w>=0.60)
 y=restskin[owner,1]
 lo=np.min(y);idx=owner[y<=lo+0.012]
 assert len(idx)>=2,(label,len(idx))
 toe_sets[label]=idx
 toe_anchor[label]=np.median(restskin[idx],axis=0)
 ownership[label]=dict(vertices=len(idx),owned_total=len(owner),first=np.asarray(toe_anchor[label]).tolist(),min_y=float(lo),median_owner_weight=float(np.median(own_w[idx])))
 groups[label]=chain



# VISUAL BODY-TRANSLATION EXPERIMENT (not walking, no gait authored)
from datetime import datetime
from PIL import Image,ImageDraw,ImageFont
import importlib.util,math
from scipy.spatial import ConvexHull
HERE=out
# Camera rasterizer is copied into this packet under the same directory (not downloaded at runtime).
spec=importlib.util.spec_from_file_location('heady_render',str(HERE/'renderer_readonly_reference.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
g=mod.GLB(data)
mesh=mod.inspect_model(g)
tex=mod.texture(g);uv=g.accessor(mesh['a']['TEXCOORD_0']);faces=mesh['f']
assert not J.get('animations')
assert len(J['skins'][0]['joints'])==52
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try: font=ImageFont.truetype(fontpath,16);small=ImageFont.truetype(fontpath,13)
except: font=None; small=None

def project(world,eye,focus,scale,w,h):
 eye=np.asarray(eye,float);focus=np.asarray(focus,float);forward=focus-eye;forward/=np.linalg.norm(forward)
 right=np.cross(forward,[0.,1.,0.]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 delta=np.asarray(world)-focus
 return (float(delta@right*scale+w/2),float(h/2-delta@up*scale))

# Deliberately larger displacement than previous 0.03. Increment body translation while freezing all six world-space toe anchors.
STEPS=11
MAG_X=0.12
MAG_Z=0.025
results=[];snapshots=[]
prior={k:np.zeros(len(groups[k])*2) for k in keys}
for tick in range(STEPS):
 progress=tick/(STEPS-1)
 shift=np.array([MAG_X*progress,0.,MAG_Z*progress])
 angles={}
 for passidx in range(2):
  for label,chain in groups.items():
   previous=prior[label]
   def res(q):
    candidate=angles.copy();candidate.update({node:(q[2*i],q[2*i+1]) for i,node in enumerate(chain)})
    p=skin_vertices(build_matrices(shift,candidate),toe_sets[label])
    p_error=np.median(p,axis=0)-toe_anchor[label]
    return np.r_[p_error,0.004*q,0.002*(q-previous)]
   candidate=least_squares(res,previous,bounds=(-.55,.55),max_nfev=100,ftol=1e-10,xtol=1e-10,gtol=1e-10)
   angles.update({node:(candidate.x[2*i],candidate.x[2*i+1]) for i,node in enumerate(chain)})
   prior[label]=candidate.x.copy()
 world=build_matrices(shift,angles);sk=skin_vertices(world)
 planted={leg:np.median(sk[toe_sets[leg]],axis=0) for leg in keys}
 foot_errors={leg:float(np.linalg.norm(planted[leg]-toe_anchor[leg])) for leg in keys}
 root=world[worldroot][:3,3]
 joint_max=max(np.max(np.abs(np.degrees(x))) for x in angles.values())
 record=dict(tick=tick,progress=progress,root_shift_x=float(shift[0]),root_shift_z=float(shift[2]),max_foot_drift=float(max(foot_errors.values())),mean_foot_drift=float(np.mean(list(foot_errors.values()))),max_uncontrolled_drift=float(np.linalg.norm(shift)),worst_vertex_y=float(sk[:,1].min()),max_joint_rotation_deg=float(joint_max),**{'drift_'+leg:foot_errors[leg] for leg in keys})
 results.append(record);snapshots.append((sk,world,shift,angles,planted))
 print('TICK=%02d SHIFT_X=%.4f MAX_DRIFT=%.6f WORST_Y=%.6f MAX_ROTATION=%.2f'% (tick,shift[0],record['max_foot_drift'],record['worst_vertex_y'],joint_max),flush=True)

# not claiming success without constraining the failed behavior
assert src.read_bytes()==data,'SOURCE_BYTES_MUTATED'
assert len(J['skins'][0]['joints'])==52 and not J.get('animations')
assert np.isfinite([r['max_foot_drift'] for r in results]).all()

import csv
with (out/'measurements_11ticks.csv').open('w',newline='') as file:
 writer=csv.DictWriter(file,fieldnames=list(results[0]));writer.writeheader();writer.writerows(results)

# Choose two fixed camera viewpoints, camera stays WORLD FIXED for all frames.
CAMERAS=[dict(label='FRONT',eye=np.array([0.,.83,3.2]),focus=np.array([0.,.76,0.]),scale=315.,width=560,height=570),
         dict(label='3/4',eye=np.array([2.3,1.32,2.65]),focus=np.array([0.,.76,0.]),scale=315.,width=560,height=570)]
COLORS=[(255,177,85),(242,213,104),(159,219,128),(122,182,241),(200,145,239),(254,136,180)]

# Fixed WORLD floor on top of render. Floor lines visually advance behind body in model space.
def decorate(image,world,shift,sk,planted,cam,progress):
 d=ImageDraw.Draw(image,'RGBA');w,h=image.size;cam2=cam
 eye,focus,scale=cam2['eye'],cam2['focus'],cam2['scale']
 # world grid, constant coordinates, drawn over transparent-ish beneath leg level, after render (thin)
 for x in np.arange(-.9,1.01,.15):
  a=project([x,0,-.8],eye,focus,scale,w,h);b=project([x,0,.8],eye,focus,scale,w,h)
  d.line([a,b],fill=(74,116,105,75),width=1)
 for z in np.arange(-.9,1.01,.15):
  a=project([-.9,0,z],eye,focus,scale,w,h);b=project([.9,0,z],eye,focus,scale,w,h)
  d.line([a,b],fill=(74,116,105,75),width=1)
 # Anchor labels: same six ground positions in every frame, not re-centered to moving root
 for ci,leg in enumerate(keys):
  ax,ay=project(toe_anchor[leg],eye,focus,scale,w,h)
  bx,by=project(planted[leg],eye,focus,scale,w,h)
  color=COLORS[ci]
  d.ellipse([ax-8,ay-8,ax+8,ay+8],outline=(*color,245),width=2)
  d.line([(ax-11,ay),(ax+11,ay)],fill=(*color,255),width=1)
  d.line([(ax,ay-11),(ax,ay+11)],fill=(*color,255),width=1)
  d.ellipse([bx-3,by-3,bx+3,by+3],fill=(*color,255))
 # draw a visible permanent reference for rest root and current root projection
 root_rest=M0[worldroot][:3,3]
 curr=world[worldroot][:3,3]
 x0,y0=project(root_rest+[0,.15,0],eye,focus,scale,w,h)
 x1,y1=project(curr+[0,.15,0],eye,focus,scale,w,h)
 d.line([(x0,y0),(x1,y1)],fill=(251,230,130,220),width=4)
 d.ellipse([x0-5,y0-5,x0+5,y0+5],outline=(255,255,255,245),width=2)
 d.ellipse([x1-6,y1-6,x1+6,y1+6],fill=(255,221,120,240))
 return image

panels=[]
for tick,(sk,world,shift,angles,planted) in enumerate(snapshots):
 parts=[]
 for cam in CAMERAS:
  w,h=cam['width'],cam['height']
  img=mod.raster(sk,uv,faces,tex,cam['eye'],cam['focus'],cam['scale'],w,h)
  img=decorate(img,world,shift,sk,planted,cam,tick/(STEPS-1))
  parts.append(img)
 board=Image.new('RGB',(2*560+24,640),(15,19,24))
 painter=ImageDraw.Draw(board)
 for j,img in enumerate(parts):
  x=8+j*568
  board.paste(img,(x,45))
  painter.text((x+6,12),f'{CAMERAS[j]["label"]} / world-fixed camera',font=font,fill=(235,242,243))
 painter.text((16,616),f'BODY {shift[0]:+.3f} X / {shift[2]:+.3f} Z  |  six original toe targets FIXED  |  tick {tick+1}/{STEPS}',font=small,fill=(231,220,183))
 panels.append(board)

panels[0].save(out/'GROUND_IK_WorldAnchored_BodyMotion.gif',save_all=True,append_images=panels[1:]+panels[-2::-1],duration=140,loop=0,optimize=False)
for idx in [0,5,10]:panels[idx].save(out/f'Static_Pose_Tick_{idx:02d}.png')
# One visual contact sheet, with constant framing, no resizing per pose
contact=Image.new('RGB',(panels[0].width*3,panels[0].height),(10,12,15))
for j,k in enumerate([0,5,10]): contact.paste(panels[k],(j*panels[0].width,0))
contact.save(out/'WorldFixed_ThreeStep_Comparison.jpg',quality=91)

# A zoomed tracking-only plot, with rigorous native source data preserved
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,axes=plt.subplots(2,1,figsize=(9,7),sharex=True)
t=[r['tick'] for r in results]
axes[0].plot(t,[r['max_uncontrolled_drift'] for r in results],marker='o',label='Uncontrolled root drift')
axes[0].plot(t,[r['max_foot_drift'] for r in results],marker='o',label='IK maximum toe-median drift')
axes[0].set_ylabel('Model units');axes[0].legend();axes[0].grid(alpha=.2)
axes[1].plot(t,[r['max_foot_drift'] for r in results],marker='o',label='Foot residual',color='tab:orange')
axes[1].set_xlabel('Solver update (11 frames)');axes[1].set_ylabel('Native units (magnified)');axes[1].grid(alpha=.2)
fig.tight_layout();fig.savefig(out/'Foot_Lock_Residuals_Zoom.png',dpi=170);plt.close(fig)

status='PROVISIONAL_PASS' if max(r['max_foot_drift'] for r in results)<.006 and min(r['worst_vertex_y'] for r in results)>-.006 else 'FAILED_GROUNDED_IK_VISUAL_GATE'
receipt={'campaign':'HEADY_GROUNDED_IK','version':'03.2.0','status':status,'source_sha256':sourcehash,'source_preserved':src.read_bytes()==data,'mesh_animation_channels':len(J.get('animations',[])),'not_a_gait':True,'not_physics_engine':True,'test_body_motion':[MAG_X,0.,MAG_Z],'steps':STEPS,'max_skinned_toe_median_drift':max(r['max_foot_drift'] for r in results),'min_deformed_mesh_y':min(r['worst_vertex_y'] for r in results),'largest_joint_adjustment_deg':max(r['max_joint_rotation_deg'] for r in results),'artifact_names':['GROUND_IK_WorldAnchored_BodyMotion.gif','WorldFixed_ThreeStep_Comparison.jpg','Foot_Lock_Residuals_Zoom.png','Static_Pose_Tick_00.png','Static_Pose_Tick_05.png','Static_Pose_Tick_10.png'],'limitations':['provisional bone local X/Z constraints','toe anchor is sample median not load-bearing pad','Y=0 raycast ground not an engine rigid-body physics simulation','no swinging or new gait','human visible acceptance pending']}
(out/'RESULT_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('STATUS='+status,flush=True)
print('MAX_FOOT_DRIFT='+str(receipt['max_skinned_toe_median_drift']),flush=True)
print('MIN_Y='+str(receipt['min_deformed_mesh_y']),flush=True)
print('GIF='+str(out/'GROUND_IK_WorldAnchored_BodyMotion.gif'),flush=True)
assert status=='PROVISIONAL_PASS','STUDY_INCONCLUSIVE_DO_NOT_DELIVER_AS_PASS'
