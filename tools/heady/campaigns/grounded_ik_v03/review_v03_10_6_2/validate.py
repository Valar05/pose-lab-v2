#!/usr/bin/env python3
"""Heady v03.10.6: actual original-vs-derived six-leg vertex displacement validation."""
import importlib.util,json,sys,hashlib
from pathlib import Path
import numpy as np
src=Path(sys.argv[1]); glb=Path(sys.argv[2]); module=Path(sys.argv[3]);out=Path(sys.argv[4]);out.mkdir(exist_ok=True,parents=True)
s=importlib.util.spec_from_file_location('he03105',module);m=s.loader;m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
original=m.Model(src.read_bytes()); candidate=m.Model if False else None
# Model requires original hash; parse derived separately via original authoring functions.
raw=glb.read_bytes();import struct
jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);blen=struct.unpack_from('<I',raw,20+jl)[0];binb=raw[28+jl:28+jl+blen]
# Read candidate accessors from its own binary while using original topology/UV.
class Carrier:
 def __init__(self,doc,binb):self.j=doc;self.bin=binb
 read=m.Model.read
c=Carrier(doc,binb);attrs=doc['meshes'][0]['primitives'][0]['attributes']
JI=c.read(attrs['JOINTS_0']).astype(int);W=c.read(attrs['WEIGHTS_0']).astype(float)
IBM=c.read(doc['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1).astype(float)
mask=np.isin(JI,np.array([doc['skins'][0]['joints'].index(i) for i,n in enumerate(doc['nodes']) if n.get('name','').startswith('HeadyHair_')],int)).any(axis=1)
# Correctly classify even hair solely head-weighted? Use selected hair difference from original JI/W.
mask=np.any(JI!=original.ji,axis=1)|np.any(np.abs(W-original.w)>1e-7,axis=1)
assert mask.sum()>200 and mask.sum()<3000,('HAIR_MASK_OUT_OF_RANGE',mask.sum())
head=m.skinpts(original,doc,IBM,JI,W); original_rest=m.skinpts(original,original.j,original.ibms,original.ji,original.w)
assert np.max(np.linalg.norm(head-original_rest,axis=1))<.00008
names={v.get('name'):i for i,v in enumerate(doc['nodes'])}
legs=[['Bone_007','Bone_006','Bone_005'],['Bone_013','Bone_012','Bone_011'],['Bone_021','Bone_020','Bone_019','Bone_018'],['Bone_024','Bone_023','Bone_022'],['Bone_010','Bone_009','Bone_008'],['Bone_017','Bone_016','Bone_015','Bone_014']]
all_stats=[];nframes=25
frames=[]
# actual skinned pose, each leg independent; rigid torso/head, hair physics OFF.
for i in range(nframes):
 leg_idx=(i//4)%6
 phase=(i%4)/3
 angles={names[b]:[.0,0.0, .26*np.sin(np.pi*phase)] for b in legs[leg_idx]}
 p=m.skinpts(original,doc,IBM,JI,W,angles)
 po=m.skinpts(original,original.j,original.ibms,original.ji,original.w,angles)
 a=float(np.max(np.linalg.norm(p[mask]-head[mask],axis=1)))
 b=float(np.max(np.linalg.norm(po[mask]-original_rest[mask],axis=1)))
 outside=float(np.max(np.linalg.norm(p[~mask]-head[~mask],axis=1)))
 all_stats.append({'frame':i,'leg':leg_idx,'hair_fixed_displacement':a,'old_hair_leg_displacement':b,'nonhair_leg_displacement':outside})
 frames.append(p)
assert max(x['hair_fixed_displacement'] for x in all_stats)<9e-5
assert max(x['nonhair_leg_displacement'] for x in all_stats)>.0004
assert max(x['old_hair_leg_displacement'] for x in all_stats)>.0004
# Generate direct actual-mesh textured animation; no fake poses
from PIL import Image,ImageDraw
import importlib.util
rpath=Path(sys.argv[5]);rs=importlib.util.spec_from_file_location('heady_raster',rpath);r=importlib.util.module_from_spec(rs);rs.loader.exec_module(r)
images=[]
# Render EVERY posed frame, including the nonzero-angle poses that the old
# every-fourth sampling inadvertently discarded. Include the original damaged
# rig beside the repaired rig for an honest visual A/B check.
old_frames=[]
for i in range(nframes):
 leg_idx=(i//4)%6
 phase=(i%4)/3
 angles={names[bone]:[0.,0.,.45*np.sin(np.pi*phase)] for bone in legs[leg_idx]}
 old_frames.append(m.skinpts(original,original.j,original.ibms,original.ji,original.w,angles))
# Same rotation magnitude on old and corrected rigs.
frames=[]
all_stats=[]
for i in range(nframes):
 leg_idx=(i//4)%6
 phase=(i%4)/3
 angles={names[bone]:[0.,0.,.45*np.sin(np.pi*phase)] for bone in legs[leg_idx]}
 p=m.skinpts(original,doc,IBM,JI,W,angles)
 po=old_frames[i]
 all_stats.append({'frame':i,'leg':leg_idx+1,'angle_radians':float(.45*np.sin(np.pi*phase)),
   'hair_fixed_displacement':float(np.max(np.linalg.norm(p[mask]-head[mask],axis=1))),
   'old_hair_leg_displacement':float(np.max(np.linalg.norm(po[mask]-original_rest[mask],axis=1))),
   'nonhair_leg_displacement':float(np.max(np.linalg.norm(p[~mask]-head[~mask],axis=1)))})
 frames.append(p)
assert max(x['hair_fixed_displacement'] for x in all_stats)<9e-5
assert max(x['nonhair_leg_displacement'] for x in all_stats)>.0004
assert max(x['old_hair_leg_displacement'] for x in all_stats)>.0004
assert any(x['angle_radians']>.3 for x in all_stats)
for i in range(nframes):
 a=r.raster(old_frames[i],original.t,original.f,original.tex,[-.04,1.13,3.4],[0,.83,0],245,450,430)
 c=r.raster(frames[i],original.t,original.f,original.tex,[-.04,1.13,3.4],[0,.83,0],245,450,430)
 canvas=Image.new('RGB',(900,480),(13,17,22));canvas.paste(a,(0,24));canvas.paste(c,(450,24));d=ImageDraw.Draw(canvas)
 d.text((10,5),'BEFORE: original weights (leg-linked hair)',fill=(244,170,160))
 d.text((462,5),'AFTER: hair isolated (physics OFF)',fill=(144,228,196))
 stat=all_stats[i]
 d.text((12,458),f'LEG {stat["leg"]}/6 | ANGLE {stat["angle_radians"]:.3f} rad | OLD HAIR {stat["old_hair_leg_displacement"]:.5f}',fill=(240,228,214))
 d.text((465,458),f'FIXED HAIR {stat["hair_fixed_displacement"]:.8f} | FRAME {i+1}/{nframes}',fill=(240,228,214))
 images.append(canvas)
images[0].save(out/'Heady_v03_10_6_LegIsolation.gif',save_all=True,append_images=images[1:],duration=120,loop=0,optimize=False)
print('VISUAL_ANIMATION_FRAMES='+str(len(images)), 'POSED_RENDER_FRAMES='+str(sum(x['angle_radians']>.1 for x in all_stats)),flush=True)
receipt={'version':'03.10.6.2','source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'derived_sha256':hashlib.sha256(raw).hexdigest(),'selected_hair_vertices':int(mask.sum()),'hair_movement_from_six_leg_isolation_max':max(x['hair_fixed_displacement'] for x in all_stats),'old_hair_movement_max':max(x['old_hair_leg_displacement'] for x in all_stats),'full_approved_scuttle_replay':'NOT_EXECUTED','physics_live_browser':'NOT_EXECUTED','selected_mask_complete':'NOT_PROVEN','frames':all_stats}
(out/'Heady_v03_10_6_IsolationReceipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print('ISOLATION=PASS', 'HAIR_MOVEMENT_MAX='+str(receipt['hair_movement_from_six_leg_isolation_max']),flush=True)
