#!/usr/bin/env python3
"""Heady 52-joint rest-model: ground-locked feet under BODY translation.

Run: python grounded_single_step.py /absolute/source.glb /absolute/output/dir
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




# v03.3: ONE independent lift-transfer-plant event, body translation continues throughout.
# This is NOT a repeating walk cycle, gait scheduler, or physical-engine test.
from PIL import Image, ImageDraw, ImageFont
import math, importlib.util, traceback

TARGET='right_middle'
STEPS=19
SWING_BEGIN=5
PLANT_BEGIN=13
BODY_DELTA=np.array([.095,0.,.020])
STEP_DELTA=np.array([.125,0.,.014])
FOOT_LIFT=.068
ANGLE_LIMIT=.78 # mathematical solver guard only, NOT anatomical limit authority
FRAME_MS=100

spec=importlib.util.spec_from_file_location('heady_render',str(out/'renderer_readonly_reference.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
asset=renderer.GLB(data)
mesh=renderer.inspect_model(asset)
tex=renderer.texture(asset)
uv=asset.accessor(mesh['a']['TEXCOORD_0']);faces=mesh['f']
assert len(J['skins'][0]['joints'])==52 and not J.get('animations')

results=[];snapshot=[]
prior={leg:np.zeros(2*len(chain),float) for leg,chain in chains.items()}

# A deliberate step is directed by physically meaningful FOOT WORLD targets.
# The body root moves continuously; the other five target anchors never move.
def ease(t):
 t=np.clip(t,0.,1.)
 return t*t*(3.-2.*t)

def step_target(k):
 # Avoid a slow return-to-rest: direct transfer toward next *ground contact*.
 if k<SWING_BEGIN:
  return toe_anchor[TARGET].copy(),'PLANTED_OLD',0.,0.
 if k>=PLANT_BEGIN:
  return toe_anchor[TARGET]+STEP_DELTA,'PLANTED_NEW',1.,0.
 u=(k-SWING_BEGIN)/(PLANT_BEGIN-SWING_BEGIN)
 # Early lift, meaningful forward transfer, quick touchdown.
 # Separate lift / advance / lower control, not a sine/cosine rest-pose animation.
 # Intermediate points target the FOOT, not an invented set of bone angles.
 lift_ratio=0.
 if u<.26: lift_ratio=ease(u/.26)
 elif u<.67: lift_ratio=1.
 else: lift_ratio=1.-ease((u-.67)/.33)
 travel=ease(np.clip((u-.10)/.80,0.,1.))
 dest=toe_anchor[TARGET] + STEP_DELTA*travel + np.array([0.,FOOT_LIFT*lift_ratio,0.])
 return dest,'SWING',travel,lift_ratio

def optimize_tick(shift,world_target):
 angles={}
 # small alternating sweeps handle blended skin near shared bases.
 for loop in range(2):
  for leg,chain in chains.items():
   previous=prior[leg]
   target=world_target if leg==TARGET else toe_anchor[leg]
   def residual(q):
    pose=angles.copy()
    pose.update({node:(float(q[2*i]),float(q[2*i+1])) for i,node in enumerate(chain)})
    got=skin_vertices(build_matrices(shift,pose),toe_sets[leg])
    deviation=np.median(got,axis=0)-target
    return np.r_[deviation,0.0025*q,0.001*(q-previous)]
   fit=least_squares(residual,previous,bounds=(-ANGLE_LIMIT,ANGLE_LIMIT),max_nfev=90,ftol=1e-9,xtol=1e-9,gtol=1e-9)
   if not fit.success and np.linalg.norm(fit.fun[:3])>.012:
    raise RuntimeError('IK_NOT_CONVERGED_'+leg)
   angles.update({node:(float(fit.x[2*i]),float(fit.x[2*i+1])) for i,node in enumerate(chain)})
   prior[leg]=fit.x.copy()
 return angles

for tick in range(STEPS):
 progress=tick/(STEPS-1)
 shift=BODY_DELTA*progress
 target,state,travel,lift=step_target(tick)
 angles=optimize_tick(shift,target)
 world=build_matrices(shift,angles)
 sk=skin_vertices(world)
 actual={leg:np.median(sk[toe_sets[leg]],axis=0) for leg in keys}
 errors={leg:float(np.linalg.norm(actual[leg]-(target if leg==TARGET else toe_anchor[leg]))) for leg in keys}
 anchored_error=max(errors[k] for k in keys if k!=TARGET)
 tgerr=errors[TARGET]
 foot_y=float(actual[TARGET][1])
 root_shift=world[worldroot][:3,3]-M0[worldroot][:3,3]
 assert np.linalg.norm(root_shift-shift)<1e-8
 record={'tick':tick,'phase':state,'progress':float(progress),'root_x':float(shift[0]),'root_z':float(shift[2]),'target_x':float(target[0]),'target_y':float(target[1]),'target_z':float(target[2]),'actual_x':float(actual[TARGET][0]),'actual_y':foot_y,'actual_z':float(actual[TARGET][2]),'swing_lift_ratio':float(lift),'swing_travel_ratio':float(travel),'target_error':tgerr,'five_anchor_drift_max':anchored_error,'mesh_min_y':float(sk[:,1].min()),'max_bone_rotation_deg':float(max(np.max(np.abs(np.degrees(a))) for a in angles.values()))}
 results.append(record);snapshot.append((sk,world,target,actual,angles))
 print(f'TICK={tick:02d} PHASE={state} ROOT_X={shift[0]:.4f} FOOT_X={foot_y:.4f}/{target[1]:.4f} TARGET_ERROR={tgerr:.5f} FIVE_LOCK={anchored_error:.5f}',flush=True)

# Strong numerical gates check that this is a STEP, not another all-feet pin test.
assert np.linalg.norm(snapshot[0][3][TARGET]-toe_anchor[TARGET])<.002
assert results[7]['phase']=='SWING' and results[7]['actual_y']-toe_anchor[TARGET][1]>.023, 'FOOT_NEVER_LIFTS'
assert snapshot[-1][3][TARGET][0]-snapshot[0][3][TARGET][0]>.095, 'FOOT_DID_NOT_ADVANCE'
assert max(x['five_anchor_drift_max'] for x in results)<.004, 'FIVE_PLANTED_FEET_SLIDE'
assert max(x['target_error'] for x in results)<.009, 'SWING_TARGET_NOT_REACHED'
assert results[-1]['target_error']<.003, 'FOOT_DID_NOT_REPLANT'
assert min(x['mesh_min_y'] for x in results)>-.012, 'FLOOR_PENETRATION_EXCESSIVE'
assert sourcehash==hashlib.sha256(src.read_bytes()).hexdigest(), 'SOURCE_NOT_PRESERVED'

import csv
with (out/'SingleStep_19Ticks.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=results[0].keys());writer.writeheader();writer.writerows(results)

try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
 sm=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
except OSError:font=ImageFont.load_default();sm=font

CAMERAS=[dict(name='FRONT',eye=np.array([0.,.85,3.4]),focus=np.array([0.,.75,0.]),scale=320.,w=560,h=560),
         dict(name='OBLIQUE',eye=np.array([2.7,1.45,2.85]),focus=np.array([0.,.75,0.]),scale=320.,w=560,h=560)]
COLORS=[(255,175,78),(244,213,97),(150,219,140),(117,177,244),(211,155,248),(255,123,168)]

def project(pt,cam):
 eye,focus=cam['eye'],cam['focus'];fw=focus-eye;fw=fw/np.linalg.norm(fw)
 right=np.cross(fw,np.array([0.,1.,0.]));right=right/np.linalg.norm(right)
 up=np.cross(right,fw)
 p=np.asarray(pt,float)-focus
 return float(cam['w']/2+p@right*cam['scale']),float(cam['h']/2-p@up*cam['scale'])

def decorate(img,cam,tick,world,target,actual,phase):
 d=ImageDraw.Draw(img,'RGBA')
 # WORLD floor, explicitly labelled and constant across frame sequence.
 for x in np.arange(-.9,1.0,.15):d.line((project([x,0,-.85],cam),project([x,0,.85],cam)),fill=(82,110,107,72),width=1)
 for z in np.arange(-.85,.9,.15):d.line((project([-.9,0,z],cam),project([.9,0,z],cam)),fill=(82,110,107,72),width=1)
 for index,leg in enumerate(keys):
  old=project(toe_anchor[leg],cam);p=project(actual[leg],cam)
  color=COLORS[index]
  d.ellipse((old[0]-6,old[1]-6,old[0]+6,old[1]+6),outline=(*color,255),width=2)
  d.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),fill=(*color,255))
  if leg==TARGET:
   tgt=project(target,cam)
   d.line((old,tgt),fill=(255,215,87,190),width=3)
   d.ellipse((tgt[0]-8,tgt[1]-8,tgt[0]+8,tgt[1]+8),outline=(255,236,110,255),width=3)
   d.line((p,tgt),fill=(255,70,95,240),width=2)
 # Root movement: same WORLD position reference throughout
 r0=project(M0[worldroot][:3,3]+[0.,.2,0.],cam)
 r1=project(world[worldroot][:3,3]+[0.,.2,0.],cam)
 d.line((r0,r1),fill=(244,242,121,220),width=4)
 d.ellipse((r0[0]-4,r0[1]-4,r0[0]+4,r0[1]+4),outline=(255,255,255,255),width=2)
 d.ellipse((r1[0]-5,r1[1]-5,r1[0]+5,r1[1]+5),fill=(249,232,108,255))
 return img

frames=[]
for tick,(sk,world,target,actual,angles) in enumerate(snapshot):
 scene=Image.new('RGB',(1144,644),(13,17,23));painter=ImageDraw.Draw(scene)
 for index,cam in enumerate(CAMERAS):
  img=renderer.raster(sk,uv,faces,tex,cam['eye'],cam['focus'],cam['scale'],cam['w'],cam['h'])
  img=decorate(img,cam,tick,world,target,actual,results[tick]['phase'])
  scene.paste(img,(8+568*index,50))
  painter.text((16+568*index,13),cam['name']+' / fixed-world camera',font=font,fill=(232,243,241))
 painter.text((16,618),f'RIGHT MIDDLE FOOT | {results[tick]["phase"]} | tick {tick+1}/{STEPS} | five feet world-planted',font=sm,fill=(241,210,156))
 frames.append(scene)
 if tick in (0,7,11,13,18):scene.save(out/f'Frame_{tick:02d}_{results[tick]["phase"]}.png')
frames[0].save(out/'HEADY_GroundedIK_OneDeliberateStep_v03_3.gif',save_all=True,append_images=frames[1:],duration=[FRAME_MS]*18+[850],loop=1,optimize=False)
contact=Image.new('RGB',(frames[0].width*3,frames[0].height),(12,16,23))
for n,tick in enumerate((0,8,18)):contact.paste(frames[tick],(n*frames[0].width,0))
contact.save(out/'ThreeStates_WorldFixed.png')

from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(8.5,4.5))
ax.plot([r['tick'] for r in results],[r['target_y']-toe_anchor[TARGET][1] for r in results],'.-',label='Requested foot lift')
ax.plot([r['tick'] for r in results],[r['actual_y']-toe_anchor[TARGET][1] for r in results],'.-',label='Skinned foot lift')
ax.set_xlabel('Update / non-looping single step');ax.set_ylabel('Foot height above original (model units)')
ax.grid(alpha=.2);ax.legend();fig.tight_layout();fig.savefig(out/'LiftAndPlant_Evidence.png',dpi=140);plt.close(fig)

report={'campaign':'HEADY_GROUNDED_IK','version':'03.3.0','stage':'ONE_DELIBERATE_STEP_CANDIDATE','source_sha256':sourcehash,'source_preserved':hashlib.sha256(src.read_bytes()).hexdigest()==sourcehash,'animation_channels_in_source':len(J.get('animations',[])),'toe_witness':'median of source skinned lowest owned vertices','foot_selected':TARGET,'selected_bones':links[TARGET],'original_52_joint_rig_unchanged':True,'five_planted_anchor_drift_max':float(max(x['five_anchor_drift_max'] for x in results)),'step_foot_target_error_max':float(max(x['target_error'] for x in results)),'step_foot_replant_error':float(results[-1]['target_error']),'step_horizontal_distance':float(snapshot[-1][3][TARGET][0]-snapshot[0][3][TARGET][0]),'peak_foot_lift':float(max(x['actual_y'] for x in results)-toe_anchor[TARGET][1]),'min_mesh_y':float(min(x['mesh_min_y'] for x in results)),'body_translation':list(BODY_DELTA),'step_delta':list(STEP_DELTA),'frame_count':STEPS,'step_state':'CANDIDATE_PENDING_HUMAN_REVIEW','no_repeat_gait':True,'physical_engine_raycast':'NOT_RUN','limitations':['Mathematical flat Y=0 collision plane, not engine physics','Provisional local X/Z bone-axis degrees, not calibrated mechanical joint limits','Tip anchored to skinned vertex median rather than validated physical contact patch','No claw gait, no recurrent scheduler, no hip weight edits','Human visual review controls acceptance']}
(out/'RESULT_RECEIPT.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print('CANDIDATE_GENERATED=YES',flush=True)
print('FIVE_PLANTED_MAX_DRIFT='+str(report['five_planted_anchor_drift_max']),flush=True)
print('PEAK_STEP_FOOT_LIFT='+str(report['peak_foot_lift']),flush=True)
print('REPLANT_ERROR='+str(report['step_foot_replant_error']),flush=True)
print('GIF='+str(out/'HEADY_GroundedIK_OneDeliberateStep_v03_3.gif'),flush=True)
