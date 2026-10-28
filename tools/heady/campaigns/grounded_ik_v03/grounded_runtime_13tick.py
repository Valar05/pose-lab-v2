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


# Deterministic BODY-DRIVEN RUNTIME PREVIEW: per-tick root motion and
# fresh IK evaluation under fixed world-foot anchors. This is not a physics engine.
from datetime import datetime
import time

def floor_height(x,z):
    # Explicit triangle-mesh collision space, two triangles in the plane Y=0.
    triangles=[np.array([[-1.5,0,-1.5],[1.5,0,-1.5],[1.5,0,1.5]]),
               np.array([[-1.5,0,-1.5],[1.5,0,1.5],[-1.5,0,1.5]])]
    for A,B,C in triangles:
        cross=np.cross(B-A,C-A)
        if abs(cross[1])<1e-12:continue
        # barycentric inside test in 2D x-z for downward ray
        tx=np.array([x,z])-A[[0,2]]
        try: uv=np.linalg.solve(np.column_stack([B[[0,2]]-A[[0,2]],C[[0,2]]-A[[0,2]]]),tx)
        except np.linalg.LinAlgError:continue
        if uv[0]>=-1e-10 and uv[1]>=-1e-10 and uv.sum()<=1+1e-10:return float(A[1]+uv[0]*(B[1]-A[1])+uv[1]*(C[1]-A[1]))
    raise ValueError('FLOOR_RAY_MISSED')

for label,target in toe_anchor.items():
    assert abs(floor_height(target[0],target[2]))<1e-10,(label,target)

# Travel includes both sideways (+X) and forward (+Z) drift, deliberately tiny.
# Actor moves each tick; foot anchors stay in WORLD COORDINATES.
steps=13;dt=1/30
keys=list(groups)
previous={leg:np.zeros(2*len(chain)) for leg,chain in groups.items()}
all_results=[];final_angles={};final_delta=None
start=time.monotonic()
for tick in range(steps):
    t=tick/(steps-1)
    shift=np.array([0.030*t,0,0.012*t])
    angles={}
    for pass_id in range(2):
      for leg,chain in groups.items():
        prior=previous[leg]
        baseline=prior.copy()
        def resid(q):
            temp=angles.copy();temp.update({n:(q[2*i],q[2*i+1]) for i,n in enumerate(chain)})
            mids=np.median(skin_vertices(build_matrices(shift,temp),toe_sets[leg]),axis=0)
            return np.r_[mids-toe_anchor[leg],0.008*q,0.003*(q-prior)]
        sol=least_squares(resid,baseline,bounds=(-0.35,0.35),max_nfev=85,ftol=1e-10,xtol=1e-10,gtol=1e-10)
        assert sol.success or np.linalg.norm(sol.fun[:3])<0.002,(leg,tick,sol.message)
        angles.update({n:(sol.x[2*i],sol.x[2*i+1]) for i,n in enumerate(chain)})
        previous[leg]=sol.x
    world=build_matrices(shift,angles)
    sk=skin_vertices(world)
    foot_drift={leg:float(np.linalg.norm(np.median(sk[toe_sets[leg]],axis=0)-toe_anchor[leg])) for leg in keys}
    floor_low=float(np.min(sk[:,1]))
    joints=max(abs(v) for ar in angles.values() for v in ar)
    original=skin_vertices(build_matrices(shift,{}))
    control_drift={leg:float(np.linalg.norm(np.median(original[toe_sets[leg]],axis=0)-toe_anchor[leg])) for leg in keys}
    all_results.append({'tick':tick,'t_seconds':round(tick*dt,7),'shift_x':round(float(shift[0]),7),'shift_z':round(float(shift[2]),7),'max_foot_drift':max(foot_drift.values()),'mean_foot_drift':float(np.mean(list(foot_drift.values()))),'max_uncontrolled_drift':max(control_drift.values()),'floor_min_y':floor_low,'max_joint_angle_deg':float(np.degrees(joints)),**{'drift_'+leg:foot_drift[leg] for leg in keys}})
    print(f'TICK {tick:02d}/{steps-1:02d} body=({shift[0]:.4f}, {shift[2]:.4f}) foot_drift_max={max(foot_drift.values()):.7f} floor_min_y={floor_low:.7f}',flush=True)
    final_angles=angles.copy();final_delta=shift.copy()

# Guard against accidental re-using the rejected gait or misrepresenting this as physics.
assert not J.get('animations'), 'SOURCE_ANIMATION_CHANNELS_NOT_ZERO'
assert len(J['skins'][0]['joints'])==52,'SKIN_CHANGED'
assert np.linalg.norm(final_delta)>0.031,'ROOT_DID_NOT_MOVE'
assert max(row['max_foot_drift'] for row in all_results)<0.001,'DRIFT_TOO_HIGH'
assert all(row['max_uncontrolled_drift']>=row['max_foot_drift'] for row in all_results),'NO_IMPROVEMENT'
assert min(row['floor_min_y'] for row in all_results)>-0.001,'FLOOR_PENETRATION_HIGH'
assert src.read_bytes()==data,'SOURCE_CHANGED'

result={'status':'PROVISIONAL_DYNAMIC_KINEMATIC_PASS','source_sha256':sourcehash,
        'test':'13 sequential per-tick IK evaluations, root moves diagonally X+0.030 Z+0.012, six foot-world locks, explicit 2-triangle surface',
        'not_claimed':['not a game engine physics simulation','no forces/friction/true COM','no gait animation, no swing or touchdown','joint local X/Z axes provisional','no toe pads/contact normals calibration','no actual on-phone installation'],
        'steps':steps,'tick_dt_sec':dt,'body_final_shift':final_delta.tolist(),
        'max_foot_drift':max(r['max_foot_drift'] for r in all_results),
        'final_foot_drift':all_results[-1]['max_foot_drift'],
        'max_control_drift':max(r['max_uncontrolled_drift'] for r in all_results),
        'worst_floor_y':min(r['floor_min_y'] for r in all_results),
        'largest_joint_angle_delta_deg':max(r['max_joint_angle_deg'] for r in all_results),
        'elapsed_wall_sec':round(time.monotonic()-start,4),
        'original_source_preserved':True}
(out/'RUNTIME_KINEMATIC_RECEIPT.json').write_text(json.dumps(result,indent=2)+'\n')
with (out/'runtime_13ticks.csv').open('w',newline='') as f:
    wr=csv.DictWriter(f,fieldnames=list(all_results[0]));wr.writeheader();wr.writerows(all_results)

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(9,4.8));t=[z['t_seconds'] for z in all_results]
ax.plot(t,[z['max_uncontrolled_drift'] for z in all_results],label='Root motion without IK',marker='o')
ax.plot(t,[z['max_foot_drift'] for z in all_results],label='Root motion with per-tick grounded IK',marker='o')
ax.set_xlabel('Runtime test elapsed time (s)');ax.set_ylabel('Maximum of six skinned-foot median drift (native units)')
ax.set_title('Heady / moving body & 6 world-locked skinned feet / NO GAIT');ax.legend();ax.grid(alpha=.2)
fig.tight_layout();fig.savefig(out/'Runtime_13Tick_FootLock.png',dpi=160);plt.close(fig)

print('STATUS='+result['status'])
print('MAX_DRIFT_NATIVE='+str(result['max_foot_drift']))
print('WORST_FLOOR_Y='+str(result['worst_floor_y']))
print('RECEIPT='+str(out/'RUNTIME_KINEMATIC_RECEIPT.json'))
print('NO_ANIMATION=TRUE')
print('REAL_ENGINE_PHYSICS=NOT_RUN')
