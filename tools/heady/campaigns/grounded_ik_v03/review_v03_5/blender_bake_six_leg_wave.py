#!/usr/bin/env python3
"""Blender 4.3+ headless or GUI entry point. v03.5.0.

Usage: blender --background --python blender_bake_six_leg_wave.py -- --source original.glb --tracks wave_bone_tracks.json --out directory

Imports the ORIGINAL 52-joint Meshy GLB, calibrates glTF node rest frames to
Blender bone rest frames using all 52 original bone heads (Kabsch rigid fit),
bakes precomputed WORLD-PLANTED skin-aware IK results as editable pose keys,
keyframes actual body/root travel, saves .blend and exports candidate .glb.
This is a baked visualization of the numeric solver, not a live physics IK rig.
Never writes the input source. No original skin weights or rest bones are edited.
"""
from __future__ import annotations
import os,sys,json,struct,hashlib,argparse,math,traceback
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix,Quaternion,Vector

VERSION='03.5.0'
SOURCE_SHA='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'

def args():
 raw=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--tracks',required=True);p.add_argument('--out',required=True)
 p.add_argument('--render-stills',action='store_true');return p.parse_args(raw)

def gltf_rest(blob):
 assert blob[:4]==b'glTF', 'NOT_GLB'
 n,ty=struct.unpack_from('<II',blob,12);assert ty==0x4e4f534a
 j=json.loads(blob[20:20+n]);nodes=j['nodes'];parents={ch:i for i,node in enumerate(nodes) for ch in node.get('children',[])}
 memo={}
 def mat(i):
  if i not in memo:
   node=nodes[i];q=node.get('rotation',[0,0,0,1]);q=Quaternion((q[3],q[0],q[1],q[2]))
   trans=Vector(node.get('translation',[0,0,0]));scale=Vector(node.get('scale',[1,1,1]))
   m=Matrix.Translation(trans)@q.to_matrix().to_4x4()@Matrix.Diagonal((scale.x,scale.y,scale.z,1))
   memo[i]=(mat(parents[i])@m) if i in parents else m
  return memo[i]
 return j,{node.get('name'):mat(i).copy() for i,node in enumerate(nodes) if 'name' in node}

def rigid_frame_mapping(glb_rest,arm,allbones):
 # Maps native glTF WORLD joint origins to Blender ARMATURE LOCAL rest heads.
 a=np.array([[float(x) for x in glb_rest[n].translation] for n in allbones]);
 b=np.array([[float(x) for x in arm.data.bones[n].head_local] for n in allbones]);
 ac=a.mean(0);bc=b.mean(0)
 u,s,vt=np.linalg.svd((a-ac).T@(b-bc)); r=vt.T@u.T
 if np.linalg.det(r)<0:vt[-1]*=-1;r=vt.T@u.T
 trans=bc-r@ac;fit=(a@r.T)+trans
 error=float(np.sqrt(np.mean(np.sum((fit-b)**2,axis=1))))
 if error>0.015:
  raise RuntimeError(f'BLENDER_GLTF_REST_REGISTRATION_FAILED_RMS={error:.6f}, verify importer version / bone naming')
 return Matrix(r.tolist()),Vector(trans.tolist()),error

def main():
 a=args();src=Path(a.source).expanduser().resolve();tracks_file=Path(a.tracks).expanduser().resolve();out=Path(a.out).expanduser().resolve();out.mkdir(parents=True,exist_ok=True)
 data=src.read_bytes();digest=hashlib.sha256(data).hexdigest();assert digest==SOURCE_SHA,'WRONG_SOURCE_GLB_SHA'
 tracks=json.loads(tracks_file.read_text());assert tracks['version']==VERSION and tracks['source_sha256']==digest,'TRACKS_WRONG_VERSION_OR_SOURCE'
 rig_spec=tracks['bone_chains'];frame_count=tracks['frame_count'];fps=tracks['fps'];angles=tracks['angles_by_tick']
 assert len(angles)==frame_count and len(tracks['root_translations_xyz'])==frame_count,'TRACK_LENGTH_MISMATCH'
 model,rest=gltf_rest(data)
 allbones=[n for chain in rig_spec.values() for n in chain]
 assert len(allbones)==20 and len(set(allbones))==20,'WRONG_3_OR_4_BONE_CHAIN_STRUCTURE'
 # Blender may have many startup objects: we intentionally begin a clean review scene.
 bpy.ops.wm.read_factory_settings(use_empty=True)
 old=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(src))
 imported=set(bpy.data.objects)-old
 rigs=[obj for obj in imported if obj.type=='ARMATURE' and all(n in obj.data.bones for n in allbones)]
 if len(rigs)!=1:raise RuntimeError('EXPECTED_ONE_52_JOINT_ARMATURE_GOT_'+str(len(rigs)))
 arm=rigs[0]
 if len(arm.data.bones)!=52:raise RuntimeError('NOT_52_BONE_IMPORT_'+str(len(arm.data.bones)))
 basis,translation,registration_rms=rigid_frame_mapping(rest,arm,allbones)
 rest_arm_world=arm.matrix_world.copy()
 # Parent exactly the imported top-level model objects, preserving rest transforms.
 driver=bpy.data.objects.new('HEADY_WorldBodyDriver_v03_5',None);bpy.context.scene.collection.objects.link(driver)
 for obj in list(imported):
  if obj.parent not in imported:
   previous=obj.matrix_world.copy();obj.parent=driver;obj.matrix_world=previous
 # Align each glTF node's local exponential-rotation vector to Blender bone rest axes.
 converter={}
 for chain in rig_spec.values():
  for name in chain:
   rb=arm.data.bones[name].matrix_local.to_3x3().normalized()
   rg=rest[name].to_3x3().normalized()
   converter[name]=rb.inverted()@basis@rg
   pb=arm.pose.bones[name];pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0)
 scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=frame_count;scene.render.fps=fps
 # The controller owns TRANSLATION, never a compensating root-bone rotation.
 for index,(frame_angles,root_native) in enumerate(zip(angles,tracks['root_translations_xyz']),1):
  offset=Vector(root_native)
  # Armature local direction mapped into Blender world according to ORIGINAL rest arm matrix.
  world_shift=rest_arm_world.to_3x3()@(basis@offset)
  driver.location=world_shift;driver.keyframe_insert('location',frame=index,group='Grounded body translation')
  for leg,chain in rig_spec.items():
   vals=frame_angles[leg]
   if len(vals)!=len(chain)*2:raise RuntimeError(f'WRONG_CHAIN_ANGLE_COUNT_{leg}_{index}')
   for bi,name in enumerate(chain):
    x,z=vals[2*bi:2*bi+2]
    v=Vector((float(x),0.,float(z)));d=Quaternion(v.normalized(),v.length) if v.length>1e-12 else Quaternion()
    q=(converter[name]@d.to_matrix()@converter[name].inverted()).to_quaternion()
    pb=arm.pose.bones[name];pb.rotation_quaternion=q;pb.keyframe_insert('rotation_quaternion',frame=index,group='Heady grounded IK baked poses')
 scene.frame_set(1);bpy.context.view_layer.update()
 # Leg constraints deliberately NOT added to baked track: not a fake 'live IK' promise.
 # Scene ground is world Z=0 after Blender's glTF axis import.
 bpy.ops.mesh.primitive_plane_add(size=4,location=(0,0,-.003))
 plane=bpy.context.object;plane.name='HEADY_ReferenceFloor_visual_only';plane.hide_render=False
 material=bpy.data.materials.new('HEADDY_Floor_Neutral');material.diffuse_color=(.1,.15,.16,1);plane.data.materials.append(material)
 # Ground geometry is visualization; it is NOT an actual collision-force simulation.
 scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1080;scene.render.resolution_y=720;scene.render.resolution_percentage=85
 scene.world.color=(.11,.11,.13)
 for name,location,power,size in [('KEY',(2.5,-4.,4.5),850,4),('FILL',(-3,-2,2.5),500,3)]:
  light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
  obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=location
 def look_at(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
 for name,loc in [('Front',(0,-3.6,1.05)),('Oblique',(2.65,-3.,1.7))]:
  cam=bpy.data.cameras.new('HEADY_'+name+'_Camera');o=bpy.data.objects.new('HEADY_'+name+'_Camera',cam);scene.collection.objects.link(o);o.location=loc;look_at(o,(0,0,.7));cam.lens=43
 scene.camera=bpy.data.objects['HEADY_Oblique_Camera']
 # Save editable and portable outputs. Only output files, NEVER overwrite src.
 blend=out/'Heady_v03_5_SixLegWave_EDITABLE.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
 candidate=out/'Heady_v03_5_SixLegWave_CANDIDATE.glb'
 bpy.ops.export_scene.gltf(filepath=str(candidate),export_format='GLB',export_animations=True,export_skins=True,export_cameras=False,export_lights=False)
 if a.render_stills:
  for frame in (1,13,25,37,55,73):
   scene.frame_set(frame);scene.render.filepath=str(out/f'Blender_Frame_{frame:03d}.png');bpy.ops.render.render(write_still=True)
 ok=hashlib.sha256(src.read_bytes()).hexdigest()==digest
 receipt={'campaign':'HEADY_GROUNDED_IK','version':VERSION,'phase':'BLENDER_BAKE_EXPORTED',
  'source_sha256':digest,'source_preserved':ok,'blender_version':bpy.app.version_string,
  'rest_registration_rms':registration_rms,'frames':frame_count,
  'blend':str(blend),'candidate_glb':str(candidate),
  'original_materials_preserved_in_source':True,
  'skinned_toe_world_lock_in_export':'NOT_YET_INDEPENDENTLY_VERIFIED',
  'visual_acceptance':'PENDING','physics':'NOT_RUN'}
 (out/'BLENDER_EXPORT_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('CAMPAIGN_STATUS=BLENDER_EXPORTED_CANDIDATE_VISUAL_VERIFICATION_PENDING',flush=True)
 print(json.dumps(receipt,indent=2),flush=True)

try:main()
except Exception as exc:
 print('CAMPAIGN_STATUS=BLOCKED',flush=True);print('LAST_FAILURE='+repr(exc),flush=True);traceback.print_exc();sys.exit(1)
