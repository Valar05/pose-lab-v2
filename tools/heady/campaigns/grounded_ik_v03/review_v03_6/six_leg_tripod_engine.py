#!/usr/bin/env python3
"""Heady 52-joint rest-model: synchronized tripod locomotion with moving body.

Run: python six_leg_tripod_engine.py /absolute/source.glb /absolute/output/dir
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





# HEADY v03.6.0: synchronized THREE-AT-ONCE, moving-body tripod gait.
# Reference accepted v03.4 is preserved outside this new candidate.
# Author original invocation: python six_leg_wave_engine.py SOURCE.glb OUTPUT_DIRECTORY
from PIL import Image, ImageDraw, ImageFont
import math, importlib.util, traceback
from scipy.spatial import ConvexHull

VERSION='03.6.0'
FRAME_PER_CYCLE=24
CYCLES=2
STEPS=FRAME_PER_CYCLE*CYCLES+1
STRIDE=.14
LIFT=.068
ANGLE_LIMIT=.78 # provisional math bound, not an anatomical truth
GROUP_A=['left_front','left_rear','right_middle']
GROUP_B=['right_front','right_rear','left_middle']
GROUPS={'A':GROUP_A,'B':GROUP_B}
# Two synchronized tripods move TOGETHER. 58% support duty leaves overlap in stance.
SWING_FRACTION=.42
FRAME_MS=85

spec=importlib.util.spec_from_file_location('heady_renderer',str(Path(__file__).resolve().parent/'renderer_readonly_reference.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
try:
 from renderer_accelerated_v034 import raster as fast_raster
 renderer.raster=fast_raster
except ImportError: pass
asset=renderer.GLB(data); mesh=renderer.inspect_model(asset)
tex=renderer.texture(asset); uv=asset.accessor(mesh['a']['TEXCOORD_0']); faces=mesh['f']
assert len(skinJ)==52 and not J.get('animations')
prior={leg:np.zeros(2*len(chain)) for leg,chain in chains.items()}
origin={leg:toe_anchor[leg].copy() for leg in keys}
step_vec=np.array([STRIDE,0.,0.])

def ease(u):
 u=np.clip(u,0.,1.);return float(u*u*(3.-2.*u))
def lifted(u):
 if not 0<u<1:return 0.
 return float(np.sin(np.pi*u**.84)**.82)

def planned(t,leg):
 # Phase-locked tripod groups. A swings in [0,.42), B in [.5,.92).
 # New anchor is set at each touchdown; world body continues +X every cycle.
 group='A' if leg in GROUP_A else 'B'
 phase_start=0. if group=='A' else .5
 q=float(t)-phase_start
 if q < 0: return origin[leg].copy(),'STANCE',-1,0.,0.
 n=math.floor(q+1e-10);frac=max(0.,q-n)
 if frac < SWING_FRACTION-1e-10:
  u=frac/SWING_FRACTION
  return origin[leg]+step_vec*(n+ease(u))+np.array([0.,LIFT*lifted(u),0.]),'SWING',n,u,lifted(u)
 return origin[leg]+step_vec*(n+1),'STANCE',n,1.,0.

def convex_margin(points,center):
 xy=np.array(points,float)
 if len(xy)<3: return -999.
 try:
  h=ConvexHull(xy)
 except Exception:return -999.
 poly=xy[h.vertices];signed=[]
 for a,b in zip(poly,np.roll(poly,-1,axis=0)):
  edge=b-a
  signed.append(np.cross(np.append(edge,0),np.append(np.array(center)-a,0))[2]/np.linalg.norm(edge))
 return float(min(signed))

def solve_tick(shift,targets):
 # Skin-aware numerical IK retains the approved v03.4 solver formulation.
 angles={}
 for sweep in range(2):
  for leg,chain in chains.items():
   prev=prior[leg];target=targets[leg]
   def residual(q):
    pose=angles.copy()
    pose.update({node:(float(q[2*j]),float(q[2*j+1])) for j,node in enumerate(chain)})
    skinned=skin_vertices(build_matrices(shift,pose),toe_sets[leg])
    deviation=np.median(skinned,axis=0)-target
    return np.r_[deviation,0.0025*q,0.001*(q-prev)]
   fit=least_squares(residual,prev,bounds=(-ANGLE_LIMIT,ANGLE_LIMIT),max_nfev=90,ftol=1e-9,xtol=1e-9,gtol=1e-9)
   if np.linalg.norm(fit.fun[:3])>.008:raise RuntimeError('UNREACHABLE_'+leg+'_'+str(np.linalg.norm(fit.fun[:3])))
   angles.update({node:(float(fit.x[2*j]),float(fit.x[2*j+1])) for j,node in enumerate(chain)})
   prior[leg]=fit.x.copy()
 return angles

results=[];frames_data=[];angle_tracks=[]
for tick in range(STEPS):
 t=tick/FRAME_PER_CYCLE
 shift=np.array([STRIDE*t,0,0.])
 requested={leg:planned(t,leg) for leg in keys}
 targets={leg:v[0] for leg,v in requested.items()}
 swing=[leg for leg,v in requested.items() if v[1]=='SWING']
 if swing and set(swing) not in (set(GROUP_A),set(GROUP_B)):raise RuntimeError('BROKEN_TRIPOD_SYNC_'+str(tick)+':'+str(swing))
 angles=solve_tick(shift,targets);world=build_matrices(shift,angles);sk=skin_vertices(world)
 actual={leg:np.median(sk[toe_sets[leg]],axis=0) for leg in keys}
 error={leg:float(np.linalg.norm(actual[leg]-targets[leg])) for leg in keys}
 stance=[leg for leg in keys if leg not in swing]
 margin=convex_margin([targets[k][[0,2]] for k in stance],shift[[0,2]])
 if margin<.05:raise RuntimeError('UNSAFE_SUPPORT_MARGIN_'+str(tick)+'_'+str(margin))
 if max(error[k] for k in stance)>.001:raise RuntimeError('STANCE_DRIFT_'+str(tick)+'_'+str(error))
 min_y=float(sk[:,1].min())
 if min_y<-.001:raise RuntimeError('PENETRATION_'+str(tick)+'_'+str(min_y))
 if max(abs(v) for joint in angles.values() for v in joint)>.775:raise RuntimeError('JOINT_SATURATION_'+str(tick))
 row={'tick':tick,'cycles':t,'root_x':float(shift[0]),'swing_group':('A' if swing and set(swing)==set(GROUP_A) else 'B' if swing and set(swing)==set(GROUP_B) else 'NONE'),'swinging_legs':';'.join(swing),
   'stance_count':len(stance),'support_margin_proxy':margin,'stance_drift_max':max(error[k] for k in stance),
   'active_foot_error':max((error[z] for z in swing),default=0.),'mesh_min_y':min_y,
   'highest_rotation_deg':float(max(abs(np.degrees(v)) for joint in angles.values() for v in joint))}
 for leg in keys:
  row[leg+'_contact']=requested[leg][1];row[leg+'_toe_x']=float(actual[leg][0]);row[leg+'_toe_y']=float(actual[leg][1]);row[leg+'_toe_z']=float(actual[leg][2]);row[leg+'_error']=error[leg]
 results.append(row)
 angle_tracks.append({leg:[float(z) for node in chains[leg] for z in angles[node]] for leg in keys})
 frames_data.append((sk,world,actual,targets,swing))
 print(f"TICK={tick:03d}/{STEPS-1} TRIPOD={row['swing_group']} COUNT={len(swing)} ROOT_X={shift[0]:.4f} STANCE_MAX={row['stance_drift_max']:.7f} MARGIN={margin:.4f}",flush=True)

# Continuity: at exact cycle boundaries, six feet return to near-original BODY-relative positions.
for ix in (FRAME_PER_CYCLE,2*FRAME_PER_CYCLE):
 shift=np.array([results[ix]['root_x'],0,0]);t=ix/FRAME_PER_CYCLE
 for leg in keys:
  target=planned(t,leg)[0]
  if np.linalg.norm((target-shift)-origin[leg])>.00005:
   raise RuntimeError('RELATIVE_CYCLE_SEAM_'+str(ix)+'_'+leg)
assert sourcehash==hashlib.sha256(src.read_bytes()).hexdigest(), 'SOURCE_CHANGED'

with (out/'tripod_49ticks.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=results[0].keys());writer.writeheader();writer.writerows(results)
tracks={'campaign':'HEADY_GROUNDED_IK','version':VERSION,'source_sha256':sourcehash,
 'gait':'TRIPOD_SYNCHRONIZED','cycle_frames':FRAME_PER_CYCLE,'cycles':CYCLES,'frame_count':STEPS,'fps':12,'stride':STRIDE,
 'bone_chains':links,'tripod_groups':GROUPS,'swing_fraction':SWING_FRACTION,'rest_foot_witnesses':{k:v.tolist() for k,v in origin.items()},
 'angle_units':'radians glTF node local X/Z delta exponential rotation',
 'angles_by_tick':angle_tracks,'root_translations_xyz':[[row['root_x'],0.,0.] for row in results],
 'note':'Candidate angles from skin-median least squares, not accepted Blender-import playback.'}
(out/'tripod_bone_tracks.json').write_text(json.dumps(tracks,separators=(',',':'))+'\n')

try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
 sm=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
except OSError:font=ImageFont.load_default();sm=font
CAMERAS=[dict(name='FRONT',eye=np.array([0.,.82,3.4]),focus=np.array([.08,.72,0.]),scale=285.,w=490,h=520),
         dict(name='OBLIQUE',eye=np.array([2.7,1.35,2.85]),focus=np.array([.08,.72,0.]),scale=285.,w=490,h=520)]
COLORS={leg:c for leg,c in zip(keys,[(255,175,78),(244,213,97),(150,219,140),(117,177,244),(211,155,248),(255,123,168)])}
def project(pt,cam):
 eye,focus=cam['eye'],cam['focus']; fw=focus-eye;fw=fw/np.linalg.norm(fw);right=np.cross(fw,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,fw);p=np.asarray(pt,float)-focus
 return float(cam['w']/2+p@right*cam['scale']),float(cam['h']/2-p@up*cam['scale'])
def decorate(im,cam,ix):
 sk,world,actual,targets,swing=frames_data[ix];d=ImageDraw.Draw(im,'RGBA')
 for x in np.arange(-.9,1.,.15):d.line([project([x,0,-.8],cam),project([x,0,.8],cam)],fill=(75,108,104,77),width=1)
 for z in np.arange(-.8,.8,.15):d.line([project([-.9,0,z],cam),project([.9,0,z],cam)],fill=(75,108,104,77),width=1)
 for leg in keys:
  color=COLORS[leg];p=project(actual[leg],cam);t=project(targets[leg],cam)
  d.ellipse((p[0]-4,p[1]-4,p[0]+4,p[1]+4),fill=(*color,255))
  if leg in swing:d.ellipse((t[0]-8,t[1]-8,t[0]+8,t[1]+8),outline=(255,232,110,255),width=3)
 # True GLB moving bone HEAD transforms, not fake pose landmarks.
 for leg in swing:
  pts=[project(world[n][:3,3],cam) for n in chains[leg]]+[project(actual[leg],cam)]
  for a,b in zip(pts,pts[1:]):d.line([a,b],fill=(130,243,213,220),width=3)
  for x,y in pts:d.ellipse((x-4,y-4,x+4,y+4),fill=(18,226,175,255))
 # Persistent world-start marker and MOVING torso reference: make root travel legible.
 start=project([0,0,0],cam);body=project([results[ix]['root_x'],0.,0.],cam)
 d.line([start,body],fill=(255,244,124,255),width=4)
 d.ellipse((start[0]-6,start[1]-6,start[0]+6,start[1]+6),outline=(255,255,255,255),width=2)
 d.ellipse((body[0]-6,body[1]-6,body[0]+6,body[1]+6),fill=(255,234,80,255))
 return im
review=[]
for ix,(sk,world,actual,targets,swing) in enumerate(frames_data):
 board=Image.new('RGB',(1008,586),(12,17,22));d=ImageDraw.Draw(board)
 for c,cam in enumerate(CAMERAS):
  im=renderer.raster(sk,uv,faces,tex,cam['eye'],cam['focus'],cam['scale'],cam['w'],cam['h'])
  board.paste(decorate(im,cam,ix),(8+c*500,43));d.text((14+c*500,13),cam['name']+' / world-fixed',font=font,fill=(223,238,233))
 row=results[ix];d.text((13,565),f"TRIPOD | {ix+1}/{STEPS} | swing group: {row['swing_group']} ({len(swing)} legs) | body +X {row['root_x']:.3f} | {row['stance_count']} support",font=sm,fill=(248,215,160))
 review.append(board)
 if ix in (0,4,8,12,16,20,24,36,48):board.save(out/f'Tripod_Frame_{ix:03d}.png')
# Create non-looping TWO CYCLE review with terminal hold, never count seam twice in loop.
review[0].save(out/'Heady_v03_6_SynchronizedTripod_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS]*(STEPS-1)+[850],loop=1,optimize=False)
contact=Image.new('RGB',(1008*3,586*2),(12,17,22))
for i,ix in enumerate((0,6,12,18,24,48)):contact.paste(review[ix],((i%3)*1008,(i//3)*586))
contact.save(out/'Tripod_SixStates_Review.png')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,axs=plt.subplots(3,1,figsize=(10,8),sharex=True)
for leg in keys:
 xy=[r['tick'] for r in results if r[leg+'_contact']=='SWING']
 axs[0].scatter(xy,[keys.index(leg)]*len(xy),s=18,label=leg)
axs[0].set_yticks(range(6),keys);axs[0].set_title('Tripod phases: three legs swing simultaneously')
axs[1].plot([r['tick'] for r in results],[r['stance_drift_max'] for r in results]);axs[1].axhline(.0002,linestyle=':',color='gray');axs[1].set_ylabel('Max planted drift')
axs[2].plot([r['tick'] for r in results],[r['support_margin_proxy'] for r in results]);axs[2].axhline(.05,linestyle=':',color='gray');axs[2].set_ylabel('Support margin proxy');axs[2].set_xlabel('Solver tick')
fig.tight_layout();fig.savefig(out/'Tripod_Contact_Drift_Stability.png',dpi=150);plt.close(fig)
receipt={'campaign':'HEADY_GROUNDED_IK','version':VERSION,'status':'SYNCHRONIZED_TRIPOD_CANDIDATE_GENERATED',
 'source_sha256':sourcehash,'source_preserved':True,'gltf_original_animations':len(J.get('animations',[])),
 'active_leg_count':len(keys),'rear_four_joint_chains':['left_rear','right_rear'],
 'tripod_groups':GROUPS,'swing_fraction':SWING_FRACTION,'frames':STEPS,'cycles':CYCLES,'body_advance':float(results[-1]['root_x']),
 'max_stance_drift':max(r['stance_drift_max'] for r in results),'minimum_proxy_margin':min(r['support_margin_proxy'] for r in results),
 'minimum_mesh_y':min(r['mesh_min_y'] for r in results),'max_rotation_deg':max(r['highest_rotation_deg'] for r in results),
 'physical_engine':'NOT_RUN','blender_bake':'NOT_RUN','visual_acceptance':'PENDING',
 'caveat':['Provisional X/Z local joint axes', 'Skinned toe medians, not calibrated foot pads', 'Plane Y=0 with no contact forces', 'No claw motion, turns, or speed blend']}
(out/'TRIPOD_RESULT_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('TRIPOD_RESULT='+json.dumps(receipt),flush=True)
