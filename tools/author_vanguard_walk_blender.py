#!/usr/bin/env python3
"""Bake and render the first canonical Steel Vanguard Walk action.

RunForwardOld is sampled only as legacy Steel motion evidence.  The resulting
Walk is a new, eight-key, in-place action; no retargeter or camera correction is
involved.
"""
from __future__ import annotations

import argparse, json, math, sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from render_animation_pose_packet import (capture_weapon, clear_scene,
    evaluated_world_vertices, flatten_matrix, is_weapon_object, lock_camera,
    make_camera, select_action, select_armature, sha256)

POSES = ("left-contact", "left-compression", "passing-left-support",
         "right-reach", "right-contact", "right-compression",
         "passing-right-support", "left-reach")
SUPPORT = ("left", "left", "left", "left", "right", "right", "right", "right")
TIMING_MS = (110, 90, 100, 110, 110, 90, 100, 110)
LANDMARKS = {"leftFoot":"foot.ik.L", "leftKnee":"shin.fk.L",
             "rightFoot":"foot.ik.R", "rightKnee":"shin.fk.R",
             "pelvis":"spine", "head":"head", "leftHand":"hand.fk.L",
             "rightHand":"hand.fk.R"}

def args():
    p=argparse.ArgumentParser(); p.add_argument('--asset',required=True); p.add_argument('--out-dir',required=True)
    a=sys.argv; return p.parse_args(a[a.index('--')+1:] if '--' in a else [])

def point(scene, camera, value, w=512, h=512):
    q=world_to_camera_view(scene,camera,value)
    return {"x":round(float(q.x)*w,4),"y":round((1-float(q.y))*h,4),"depth":round(float(q.z),6)}

def bone_point(arm, name):
    b=arm.pose.bones.get(name)
    if not b: raise RuntimeError(f"Steel rig missing {name}")
    return arm.matrix_world @ b.head

def pose_snapshot(arm):
    return {b.name:(b.location.copy(),b.rotation_mode,b.rotation_quaternion.copy(),
                    b.rotation_euler.copy(),b.scale.copy()) for b in arm.pose.bones}

def apply_snapshot(arm, snap, frame):
    for b in arm.pose.bones:
        loc,mode,quat,euler,scale=snap[b.name]
        b.location=loc; b.rotation_mode=mode
        if mode=='QUATERNION': b.rotation_quaternion=quat
        else: b.rotation_euler=euler
        b.scale=scale
        for path in ('location','scale'):
            b.keyframe_insert(path,frame=frame,group=b.name)
        b.keyframe_insert('rotation_quaternion' if mode=='QUATERNION' else 'rotation_euler',frame=frame,group=b.name)

def bounds(scene, arm, meshes, actions):
    lo=Vector((math.inf,math.inf,math.inf)); hi=Vector((-math.inf,-math.inf,-math.inf))
    for action,frames in actions:
        arm.animation_data.action=action
        for f in frames:
            scene.frame_set(int(f),subframe=f-int(f)); bpy.context.view_layer.update()
            for obj in meshes:
                for v in evaluated_world_vertices(obj):
                    for i in range(3): lo[i]=min(lo[i],v[i]); hi[i]=max(hi[i],v[i])
    return lo,hi

def configure(scene, meshes):
    scene.render.engine='BLENDER_WORKBENCH'; scene.render.resolution_x=512; scene.render.resolution_y=512
    scene.render.resolution_percentage=100; scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=True; scene.display.shading.light='STUDIO'; scene.display.shading.color_type='OBJECT'
    scene.display.shading.show_shadows=False; scene.display.shading.show_cavity=True
    for o in meshes: o.color=(.72,.70,.64,1) if is_weapon_object(o) else (.46,.76,.96,1)

def render_set(scene,arm,action,frames,camera,meshes,out,label,legacy):
    out.mkdir(parents=True,exist_ok=True); records=[]; cm=flatten_matrix(camera.matrix_world); cs=round(camera.data.ortho_scale,9)
    arm.animation_data.action=action
    for i,f in enumerate(frames):
        scene.frame_set(int(f),subframe=f-int(f)); bpy.context.view_layer.update()
        root=arm.pose.bones.get('root');
        if not legacy and root and root.location.length>1e-6: raise RuntimeError(f'Walk root moved at pose {i}')
        weapon=capture_weapon(scene,camera,arm,meshes)
        if weapon.get('status')!='measured': raise RuntimeError(f'sword not measurable at pose {i}')
        image=f'{label}_{i:04d}.png'; scene.render.filepath=str(out/image); bpy.ops.render.render(write_still=True)
        if flatten_matrix(camera.matrix_world)!=cm or round(camera.data.ortho_scale,9)!=cs: raise RuntimeError('camera changed')
        joints={k:point(scene,camera,bone_point(arm,v)) for k,v in LANDMARKS.items()}
        hilt={"x":round(weapon['hilt']['x']*512,4),"y":round(weapon['hilt']['y']*512,4),"depth":weapon['hilt']['depth']}
        records.append({"index":i,"pose":POSES[i],"supportLeg":SUPPORT[i],"durationMs":TIMING_MS[i],"image":image,
          "sha256":sha256(out/image),"joints":joints,"weapon":{"hilt":hilt,"tip":{"x":round(weapon['tip']['x']*512,4),"y":round((1-weapon['tip']['y'])*512,4),"depth":weapon['tip']['depth']},
          "leftHandHiltDistancePx":round(math.dist((joints['leftHand']['x'],joints['leftHand']['y']),(hilt['x'],hilt['y'])),4),
          "rightHandHiltDistancePx":round(math.dist((joints['rightHand']['x'],joints['rightHand']['y']),(hilt['x'],hilt['y'])),4),
          "handDepthDelta":round(abs(joints['leftHand']['depth']-joints['rightHand']['depth']),6)},
          "cameraMatrixWorld":cm,"cameraOrthoScale":cs})
    return records

def main():
    a=args(); root=Path(__file__).resolve().parents[1]; asset=(root/a.asset).resolve(); out=(root/a.out_dir).resolve()
    clear_scene(); bpy.ops.import_scene.gltf(filepath=str(asset)); scene=bpy.context.scene; arm=select_armature(); arm.animation_data_create()
    legacy=select_action('RunForwardOld'); start,end=map(float,legacy.frame_range); samples=[start+(end-start)*i/8 for i in range(8)]
    arm.animation_data.action=legacy; snaps=[]
    for f in samples:
        scene.frame_set(int(f),subframe=f-int(f)); bpy.context.view_layer.update(); s=pose_snapshot(arm)
        # Explicit root-motion suppression in the authored action.
        loc,mode,q,e,scale=s['root']; loc=Vector((0,0,0)); s['root']=(loc,mode,q,e,scale); snaps.append(s)
    walk=bpy.data.actions.new('Walk'); arm.animation_data.action=walk
    for i,s in enumerate(snaps): apply_snapshot(arm,s,i)
    for fc in walk.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'
    walk['pose_authority']='Steel Vanguard rig'; walk['authored_pose_count']=8; walk['root_motion_suppressed']=True
    meshes=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]; configure(scene,meshes)
    lo,hi=bounds(scene,arm,meshes,[(legacy,samples),(walk,list(range(8)))])
    camera=make_camera(scene); lock_camera(camera,'left',lo,hi,1.0)
    legacy_records=render_set(scene,arm,legacy,samples,camera,meshes,out/'legacy-runforwardold','legacy',True)
    walk_records=render_set(scene,arm,walk,list(range(8)),camera,meshes,out/'walk','walk',False)
    arm.animation_data.action=walk; export=out/'vanguard_walk.glb'
    bpy.ops.export_scene.gltf(filepath=str(export),export_format='GLB',export_animations=True,export_current_frame=False)
    metadata={"schema":"pose-lab-v2-vanguard-walk-v1","status":"rendered-pending-verification",
      "source":{"asset":a.asset,"assetSha256":sha256(asset),"legacyComparisonAction":"RunForwardOld","legacyRole":"legacy comparison only","canonicalAction":"Walk","poseAuthority":"Steel Vanguard rig"},
      "contract":{"poseCount":8,"poseOrder":list(POSES),"screenFacing":"right","camera":"one invariant orthographic camera","cameraMatrixWorld":flatten_matrix(camera.matrix_world),"cameraOrthoScale":round(camera.data.ortho_scale,9),"perFrameStabilization":False,"reframing":False,"rootMotionSuppressed":True,"retargeting":False,"mirroring":False,"timingMs":list(TIMING_MS)},
      "legacyFrames":legacy_records,"frames":walk_records,"walkGlb":{"path":"vanguard_walk.glb","sha256":sha256(export)}}
    (out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps({"status":"RENDERED","poses":8,"out":str(out)}))
if __name__=='__main__': main()
