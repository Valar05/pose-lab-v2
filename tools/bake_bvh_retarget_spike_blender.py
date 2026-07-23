#!/usr/bin/env python3
"""Transfer Vanguard's native Idle through an ORG-only BVH proxy onto Crimson.

This experiment isolates ordinary anatomical animation transfer. It loads no
weapon and applies no grip, contact, IK, or per-model correction layer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
EXPERIMENT = ROOT / "experiments" / "bvh-retarget"
SOURCE = ROOT / "public" / "assets" / "vanguard" / "vanguard_rigged_animations.glb"
TARGET = ROOT / "public" / "assets" / "crimson" / "crimson_plume_knight_rigged_pbr.glb"
MAP = EXPERIMENT / "bone-map.json"
SKELETON = EXPERIMENT / "canonical-skeleton.json"
DEFAULT_OUT = ROOT / "generated" / "bvh-retarget-spike"
SAMPLES = tuple(range(0, 24, 2))
SCHEMA = "pose-lab-v2-org-bvh-idle-transfer-v1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.actions, bpy.data.armatures, bpy.data.meshes, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object], label: str) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{label}: expected one armature, found {[obj.name for obj in armatures]}")
    return armatures[0]


def activate_action(armature: bpy.types.Object, requested: str) -> bpy.types.Action:
    matches = [action for action in bpy.data.actions if action.name == requested or action.name.startswith(f"{requested}_")]
    if not matches:
        raise RuntimeError(f"missing {requested}; available={sorted(action.name for action in bpy.data.actions)}")
    action = sorted(matches, key=lambda item: (item.name != requested, item.name))[0]
    armature.animation_data_create()
    armature.animation_data.action = action
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.data.pose_position = "POSE"
    return action


def source_matrix_world(armature: bpy.types.Object, bone_name: str) -> Matrix:
    pose_bone = armature.pose.bones.get(bone_name)
    if pose_bone is None:
        raise RuntimeError(f"source pose bone missing: {bone_name}")
    return armature.matrix_world @ pose_bone.matrix


def source_rest_world(armature: bpy.types.Object, bone_name: str) -> Matrix:
    bone = armature.data.bones.get(bone_name)
    if bone is None:
        raise RuntimeError(f"source rest bone missing: {bone_name}")
    return armature.matrix_world @ bone.matrix_local


def interpolated_matrix(a: Matrix, b: Matrix, factor: float) -> Matrix:
    location = a.translation.lerp(b.translation, factor)
    rotation = a.to_quaternion().slerp(b.to_quaternion(), factor)
    return Matrix.LocRotScale(location, rotation, Vector((1, 1, 1)))


def canonical_source_matrix(
    armature: bpy.types.Object, source_map: dict[str, str | None], canonical: str, rest: bool
) -> Matrix:
    mapped = source_map[canonical]
    getter = source_rest_world if rest else source_matrix_world
    if mapped is not None:
        return getter(armature, mapped)
    if canonical != "spineMid":
        raise RuntimeError(f"no source interpolation rule for {canonical}")
    return interpolated_matrix(
        getter(armature, source_map["spineLower"]),
        getter(armature, source_map["chest"]),
        0.5,
    )


def create_proxy(
    source: bpy.types.Object, skeleton: dict, source_map: dict[str, str | None]
) -> bpy.types.Object:
    data = bpy.data.armatures.new("CanonicalBVH")
    proxy = bpy.data.objects.new("CanonicalBVH", data)
    bpy.context.collection.objects.link(proxy)
    proxy.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = proxy
    proxy.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit = {}
    for entry in skeleton["joints"]:
        name = entry["name"]
        source_bone = source_map[name]
        bone = data.edit_bones.new(name)
        if source_bone is not None:
            original = source.data.bones[source_bone]
            rest_world = source.matrix_world @ original.matrix_local
            bone.matrix = rest_world
            bone.length = max(
                0.001,
                (source.matrix_world @ original.tail_local - source.matrix_world @ original.head_local).length,
            )
        else:
            rest_world = canonical_source_matrix(source, source_map, name, rest=True)
            bone.matrix = rest_world
            bone.length = max(
                0.001,
                (
                    canonical_source_matrix(source, source_map, "chest", rest=True).translation
                    - canonical_source_matrix(source, source_map, "spineLower", rest=True).translation
                ).length
                * 0.5,
            )
        if (bone.tail - bone.head).length < 0.001:
            bone.tail = bone.head + Vector((0, 0.05, 0))
        edit[name] = bone
    for entry in skeleton["joints"]:
        parent = entry["parent"]
        if parent:
            edit[entry["name"]].parent = edit[parent]
            edit[entry["name"]].use_connect = False
    bpy.ops.object.mode_set(mode="POSE")
    for bone in proxy.pose.bones:
        bone.rotation_mode = "QUATERNION"
    bpy.ops.object.mode_set(mode="OBJECT")
    return proxy


def bake_proxy(
    source: bpy.types.Object,
    proxy: bpy.types.Object,
    source_map: dict[str, str | None],
    frames: tuple[int, ...],
) -> tuple[bpy.types.Action, dict[int, dict[str, dict[str, Matrix]]]]:
    action = bpy.data.actions.new("CanonicalIdle")
    proxy.animation_data_create()
    proxy.animation_data.action = action
    sampled: dict[int, dict[str, dict[str, Matrix]]] = {}

    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        sampled[frame] = {}

        # The imported GLTF action is fully baked: evaluated ORG joints carry
        # translation as well as orientation. Copy the evaluated matrices
        # exactly into the small proxy and let BVH transport those channels.
        for canonical in source_map:
            desired_world = canonical_source_matrix(
                source, source_map, canonical, rest=False
            )
            bone = proxy.pose.bones[canonical]
            bone.matrix = proxy.matrix_world.inverted() @ desired_world
            bpy.context.view_layer.update()

        for canonical in source_map:
            pose_bone = proxy.pose.bones[canonical]
            rest = proxy.data.bones[canonical].matrix_local
            if pose_bone.parent:
                local_pose = pose_bone.parent.matrix.inverted() @ pose_bone.matrix
                local_rest = (
                    proxy.data.bones[pose_bone.parent.name].matrix_local.inverted() @ rest
                )
            else:
                local_pose = pose_bone.matrix.copy()
                local_rest = rest.copy()
            basis_delta = local_rest.inverted() @ local_pose
            sampled[frame][canonical] = {
                "world": (proxy.matrix_world @ pose_bone.matrix).copy(),
                "expected": canonical_source_matrix(
                    source, source_map, canonical, rest=False
                ).copy(),
                "delta": basis_delta.copy(),
                "motion": (
                    basis_delta
                    if pose_bone.parent is None
                    else local_rest @ basis_delta @ local_rest.inverted()
                ).copy(),
            }
            pose_bone.rotation_mode = "QUATERNION"
            pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
            pose_bone.keyframe_insert(
                "rotation_quaternion", frame=frame, group=pose_bone.name
            )
            pose_bone.keyframe_insert("scale", frame=frame, group=pose_bone.name)
    return action, sampled

def verify_source_proxy(
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> dict:
    errors = []
    for frame, bones in sampled.items():
        for name, record in bones.items():
            error = matrix_error(record["world"], record["expected"])
            errors.append({"frame": frame, "bone": name, **error})
    return {
        "maxPositionError": max(item["position"] for item in errors),
        "maxRotationErrorDeg": max(item["rotationDeg"] for item in errors),
        "samples": len(errors),
        "worstPosition": max(errors, key=lambda item: item["position"]),
        "worstRotation": max(errors, key=lambda item: item["rotationDeg"]),
    }


def export_proxy_bvh(proxy: bpy.types.Object, output: Path, frame_start: int, frame_end: int) -> None:
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    proxy.select_set(True)
    bpy.context.view_layer.objects.active = proxy
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_anim.bvh(
        filepath=str(output),
        frame_start=frame_start,
        frame_end=frame_end,
        global_scale=1.0,
        rotate_mode="ZXY",
        root_transform_only=False,
    )


def import_bvh(path: Path, axis_forward: str, axis_up: str) -> bpy.types.Object:
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(
        filepath=str(path),
        global_scale=1.0,
        frame_start=0,
        use_fps_scale=False,
        update_scene_fps=False,
        update_scene_duration=False,
        rotate_mode="NATIVE",
        axis_forward=axis_forward,
        axis_up=axis_up,
    )
    created = [obj for obj in bpy.data.objects if obj not in before and obj.type == "ARMATURE"]
    if len(created) != 1:
        raise RuntimeError(f"BVH round trip created {len(created)} armatures")
    created[0].name = f"CanonicalBVH_{axis_forward}_{axis_up}"
    return created[0]


def matrix_error(a: Matrix, b: Matrix) -> dict:
    angle = a.to_quaternion().rotation_difference(b.to_quaternion()).angle
    angle = min(angle, math.tau - angle)
    return {
        "position": (a.translation - b.translation).length,
        "rotationDeg": math.degrees(angle),
    }


def direction(matrix: Matrix) -> Vector:
    return (matrix.to_3x3() @ Vector((0, 1, 0))).normalized()


def trajectory_errors(
    imported: bpy.types.Object,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> list[dict]:
    skeleton = json.loads(SKELETON.read_text())
    primary_child = {}
    for entry in skeleton["joints"]:
        parent = entry["parent"]
        if parent and parent not in primary_child:
            primary_child[parent] = entry["name"]
    errors = []
    for frame, bones in sampled.items():
        # Blender's BVH importer places the first motion row at frame 1 even
        # when frame_start=0. The canonical authoring contract remains 0-based.
        bpy.context.scene.frame_set(frame + 1)
        bpy.context.view_layer.update()
        for name, original in bones.items():
            imported_bone = imported.pose.bones.get(name)
            if imported_bone is None:
                raise RuntimeError(f"BVH round trip lost {name}")
            actual_world = imported.matrix_world @ imported_bone.matrix
            expected_world = original["world"]
            child_name = primary_child.get(name)
            direction_error = 0.0
            if child_name:
                actual_child = (
                    imported.matrix_world @ imported.pose.bones[child_name].matrix
                ).translation
                expected_child = bones[child_name]["world"].translation
                actual_segment = (actual_child - actual_world.translation).normalized()
                expected_segment = (expected_child - expected_world.translation).normalized()
                dot = max(-1.0, min(1.0, actual_segment.dot(expected_segment)))
                direction_error = math.degrees(math.acos(dot))
            errors.append({
                "frame": frame,
                "bone": name,
                "position": (actual_world.translation - expected_world.translation).length,
                "directionErrorDeg": direction_error,
                "expectedPosition": list(expected_world.translation),
                "actualPosition": list(actual_world.translation),
            })
    return errors


def choose_bvh_axes(
    path: Path,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> tuple[bpy.types.Object, dict]:
    axes = ("X", "Y", "Z", "-X", "-Y", "-Z")
    candidates = []
    for forward in axes:
        for up in axes:
            if forward.lstrip("-") == up.lstrip("-"):
                continue
            armature = import_bvh(path, forward, up)
            errors = trajectory_errors(armature, sampled)
            candidates.append({
                "forward": forward,
                "up": up,
                "armature": armature,
                "meanPositionError": sum(item["position"] for item in errors) / len(errors),
                "maxPositionError": max(item["position"] for item in errors),
                "maxDirectionErrorDeg": max(item["directionErrorDeg"] for item in errors),
            })
    best = min(candidates, key=lambda item: (item["meanPositionError"], item["maxPositionError"]))
    for candidate in candidates:
        if candidate is best:
            continue
        bpy.data.objects.remove(candidate["armature"], do_unlink=True)
    report = {
        key: value for key, value in best.items() if key != "armature"
    }
    report["testedAxisPairs"] = len(candidates)
    best["armature"].name = "CanonicalBVHRoundTrip"
    return best["armature"], report


def verify_roundtrip(
    imported: bpy.types.Object,
    sampled: dict[int, dict[str, dict[str, Matrix]]],
) -> dict:
    errors = trajectory_errors(imported, sampled)
    return {
        "maxPositionError": max(entry["position"] for entry in errors),
        "maxDirectionErrorDeg": max(entry["directionErrorDeg"] for entry in errors),
        "samples": len(errors),
        "worstPosition": max(errors, key=lambda item: item["position"]),
        "worstDirection": max(errors, key=lambda item: item["directionErrorDeg"]),
    }


def rest_local(armature: bpy.types.Object, bone_name: str) -> Matrix:
    bone = armature.data.bones[bone_name]
    return bone.parent.matrix_local.inverted() @ bone.matrix_local if bone.parent else bone.matrix_local.copy()


def bake_target(
    canonical: bpy.types.Object,
    target: bpy.types.Object,
    skeleton: dict,
    target_map: dict[str, str],
    frames: tuple[int, ...],
) -> bpy.types.Action:
    action = bpy.data.actions.new("CrimsonCanonicalIdle")
    target.animation_data_create()
    target.animation_data.action = action

    # Transfer the complete rest-relative world orientation. The previous
    # direction-only solve aligned parent->child segments but discarded roll,
    # so an ordinary idle folded Crimson even without a weapon in the scene.
    order = [entry["name"] for entry in skeleton["joints"] if entry["name"] != "root"]
    parent_by_name = {
        entry["name"]: None if entry["parent"] == "root" else entry["parent"]
        for entry in skeleton["joints"]
        if entry["name"] != "root"
    }
    canonical_rest = {
        name: (canonical.matrix_world @ canonical.data.bones[name].matrix_local).copy()
        for name in order
    }
    target_rest = {
        name: target.data.bones[target_map[name]].matrix_local.copy()
        for name in order
    }
    target_rest_world = {
        name: (target.matrix_world @ target_rest[name]).copy()
        for name in order
    }
    target_local = {name: rest_local(target, target_map[name]) for name in order}
    target_world_rotation_inverse = target.matrix_world.to_quaternion().inverted()

    for frame in frames:
        bpy.context.scene.frame_set(frame + 1)
        bpy.context.view_layer.update()
        desired: dict[str, Matrix] = {}
        for name in order:
            source_pose_world = canonical.matrix_world @ canonical.pose.bones[name].matrix
            motion_world = (
                source_pose_world.to_quaternion()
                @ canonical_rest[name].to_quaternion().inverted()
            )
            desired_world_rotation = motion_world @ target_rest_world[name].to_quaternion()
            desired_target_rotation = target_world_rotation_inverse @ desired_world_rotation

            parent = parent_by_name[name]
            if parent:
                head = desired[parent] @ target_local[name].translation
            else:
                # Idle baseline deliberately suppresses object/root translation.
                head = target_rest[name].translation.copy()
            desired[name] = Matrix.LocRotScale(
                head, desired_target_rotation, Vector((1, 1, 1))
            )
            target.pose.bones[target_map[name]].matrix = desired[name]

        bpy.context.view_layer.update()
        for name in order:
            bone = target.pose.bones[target_map[name]]
            bone.rotation_mode = "QUATERNION"
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
    return action

def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    low = Vector((math.inf, math.inf, math.inf))
    high = Vector((-math.inf, -math.inf, -math.inf))
    for obj in objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            low.x, low.y, low.z = min(low.x, point.x), min(low.y, point.y), min(low.z, point.z)
            high.x, high.y, high.z = max(high.x, point.x), max(high.y, point.y), max(high.z, point.z)
    if not math.isfinite(low.x):
        raise RuntimeError("no rendered mesh bounds")
    return low, high


def setup_render() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    camera = bpy.data.objects.new("BVHSpikeCamera", bpy.data.cameras.new("BVHSpikeCamera"))
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def frame_camera(camera: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector) -> None:
    low, high = mesh_bounds(objects)
    center = (low + high) * 0.5
    size = high - low
    camera.location = center + direction.normalized() * max(size.length * 2.2, 4.0)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = max(size.x, size.y, size.z) * 1.28
    camera.data.clip_start = 0.01
    camera.data.clip_end = 1000


def render(path: Path, camera: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector) -> None:
    frame_camera(camera, objects, direction)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def joint_world(target: bpy.types.Object, target_map: dict[str, str], canonical: str) -> Vector:
    return (target.matrix_world @ target.pose.bones[target_map[canonical]].matrix).translation.copy()


def foot_midpoint(target: bpy.types.Object, target_map: dict[str, str]) -> Vector:
    return (joint_world(target, target_map, "foot.L") + joint_world(target, target_map, "foot.R")) * 0.5


def idle_metrics(
    target: bpy.types.Object,
    target_map: dict[str, str],
    baseline_foot_midpoint: Vector,
    baseline_hips: Vector,
) -> dict:
    names = (
        "hips", "chest", "head",
        "clavicle.L", "upperArm.L", "lowerArm.L", "hand.L",
        "clavicle.R", "upperArm.R", "lowerArm.R", "hand.R",
        "upperLeg.L", "lowerLeg.L", "foot.L",
        "upperLeg.R", "lowerLeg.R", "foot.R",
    )
    joints = {
        name: [round(value, 6) for value in joint_world(target, target_map, name)]
        for name in names
    }
    current_foot_midpoint = foot_midpoint(target, target_map)
    hips = joint_world(target, target_map, "hips")
    return {
        "joints": joints,
        "footMidpointDrift": (current_foot_midpoint - baseline_foot_midpoint).length,
        "hipsDrift": (hips - baseline_hips).length,
        "weaponLoaded": False,
        "constraintLayers": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    out = Path(args.out_dir)
    if not out.is_absolute():
        out = ROOT / out
    out.mkdir(parents=True, exist_ok=True)
    mapping = json.loads(MAP.read_text())
    skeleton = json.loads(SKELETON.read_text())
    source_map = mapping["source"]["map"]
    target_map = mapping["target"]["map"]
    bpy.context.scene.render.fps = skeleton["frameRate"]

    clear_scene()
    source_objects = import_glb(SOURCE)
    source = find_armature(source_objects, "Vanguard")
    source_action = activate_action(source, mapping["source"]["clip"])
    proxy = create_proxy(source, skeleton, source_map)
    proxy_action, sampled = bake_proxy(source, proxy, source_map, SAMPLES)
    source_proxy = verify_source_proxy(sampled)
    (out / "source-proxy.json").write_text(json.dumps(source_proxy, indent=2) + "\n")
    if source_proxy["maxPositionError"] > 0.01 or source_proxy["maxRotationErrorDeg"] > 1.0:
        raise RuntimeError(
            "ORG source to canonical proxy exceeded tolerance: "
            f"position={source_proxy['maxPositionError']:.6f}m "
            f"rotation={source_proxy['maxRotationErrorDeg']:.6f}deg"
        )
    bvh_path = out / "vanguard_idle_org_proxy.bvh"
    export_proxy_bvh(proxy, bvh_path, min(SAMPLES), max(SAMPLES))
    source_proxy_world = proxy.matrix_world.copy()

    source.hide_render = True
    for obj in source_objects:
        obj.hide_viewport = True
        obj.hide_render = True
    proxy.hide_viewport = True
    proxy.hide_render = True
    canonical, axis_selection = choose_bvh_axes(bvh_path, sampled)
    roundtrip = verify_roundtrip(canonical, sampled)
    (out / "roundtrip.json").write_text(
        json.dumps(
            {
                "importedObjectMatrix": [list(row) for row in canonical.matrix_world],
                "axisSelection": axis_selection,
                "result": roundtrip,
            },
            indent=2,
        )
        + "\n"
    )
    if roundtrip["maxPositionError"] > 0.01 or roundtrip["maxDirectionErrorDeg"] > 1.0:
        raise RuntimeError(
            "BVH round trip exceeded tolerance: "
            f"position={roundtrip['maxPositionError']:.6f}m "
            f"direction={roundtrip['maxDirectionErrorDeg']:.6f}deg"
        )

    target_objects = import_glb(TARGET)
    target = find_armature(target_objects, "Crimson")
    target_action = bake_target(canonical, target, skeleton, target_map, SAMPLES)
    render_objects = target_objects
    camera = setup_render()
    evidence = []
    bpy.context.scene.frame_set(SAMPLES[0])
    bpy.context.view_layer.update()
    baseline_foot_midpoint = foot_midpoint(target, target_map)
    baseline_hips = joint_world(target, target_map, "hips")
    for frame in SAMPLES:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        image = out / f"locked-side-{frame:03d}.png"
        render(image, camera, render_objects, Vector((0, -1, 0.12)))
        evidence.append(
            {"frame": frame, "view": "locked-side", "image": image.name, "sha256": sha256(image),
             "metrics": idle_metrics(target, target_map, baseline_foot_midpoint, baseline_hips)}
        )
    diagnostic_frame = SAMPLES[len(SAMPLES) // 2]
    for label, direction in (
        ("front", Vector((-1, 0, 0.08))),
        ("three-quarter", Vector((-1, -1, 0.12))),
        ("rear-three-quarter", Vector((1, 1, 0.12))),
    ):
        bpy.context.scene.frame_set(diagnostic_frame)
        bpy.context.view_layer.update()
        image = out / f"diagnostic-{label}.png"
        render(image, camera, render_objects, direction)
        evidence.append(
            {"frame": diagnostic_frame, "view": label, "image": image.name, "sha256": sha256(image),
             "metrics": idle_metrics(target, target_map, baseline_foot_midpoint, baseline_hips)}
        )

    blend_path = out / "crimson_org_bvh_idle_transfer.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    manifest = {
        "schema": SCHEMA,
        "status": "executed-idle-transfer-pending-visual-acceptance",
        "blender": bpy.app.version_string,
        "source": {"asset": str(SOURCE.relative_to(ROOT)), "sha256": sha256(SOURCE), "action": source_action.name},
        "target": {"asset": str(TARGET.relative_to(ROOT)), "sha256": sha256(TARGET), "action": target_action.name},
        "interchange": {
            "asset": bvh_path.name,
            "sha256": sha256(bvh_path),
            "jointCount": len(skeleton["joints"]),
            "frames": list(SAMPLES),
            "frameRate": skeleton["frameRate"],
            "units": skeleton["units"],
            "rootConvention": skeleton["rootMotion"],
            "rotationChannels": skeleton["rotationChannels"],
            "axisSelection": axis_selection,
            "sourceLayer": "ORG only",
            "proxyAction": proxy_action.name,
        },
        "sourceToProxy": source_proxy,
        "roundTrip": roundtrip,
        "evidence": evidence,
        "conclusions": {
            "bvhSolved": [
                "small inspectable anatomical hierarchy",
                "evaluated ORG motion separated from Rigify controls and DEF segmentation",
                "deterministic hierarchy/channel/frame-rate/root interchange",
                "ORG-only native Idle transported to a clean canonical skeleton",
            ],
            "acceptanceGate": [
                "recognizable Crimson anatomy in every frame",
                "stable feet and root through the idle loop",
                "hands and arms arrive naturally without weapon constraints",
                "no per-model weights or IK unless this plain transfer proves they are needed",
            ],
            "excluded": [
                "weapon loading or prop ownership",
                "grip sockets or bilateral closure",
                "weapon metrics",
                "IK and contact solving",
            ],
        },
        "blend": {"file": blend_path.name, "sha256": sha256(blend_path)},
    }
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"ok": True, "out": str(out), "manifest": str(manifest_path), "roundTrip": roundtrip}, indent=2))


if __name__ == "__main__":
    main()
