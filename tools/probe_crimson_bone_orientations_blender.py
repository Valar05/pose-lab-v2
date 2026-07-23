#!/usr/bin/env python3
"""Measure Crimson's real arm-bone orientation language through Blender -> glTF.

This is a calibration instrument, not a pose author.  It loads the exact
committed Crimson frame-zero candidate through a generated glTF animation,
applies isolated signed local-axis probes, exports those probes through the
same Blender glTF path used by production, and records the observed result.
No Vanguard transform, joint, endpoint, or quaternion enters this tool.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from render_crimson_vanguard_attack1_compare_blender import (
    AUTHORED_BONE_NAMES,
    CRIMSON_GLB,
    PROTECTED_BODY_BONE_NAMES,
    activate_action_containing,
    canonical_frame_bytes,
    clear_scene,
    crimson_node_frames,
    find_armature,
    freeze_armature_pose_and_remove_new_actions,
    import_glb,
    inject_animation,
    load_candidate,
    parse_glb,
    read_accessor_values,
    sha256,
    sha256_bytes,
    validate_requested_candidate,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATE = ROOT / "src" / "review-candidates" / "crimson-combat-ready-vanguard-frame0-4.js"
DEFAULT_OUT = ROOT / "generated" / "crimson-orientation-ledger" / "latest"
SCHEMA = "pose-lab-v2-crimson-bone-orientation-ledger-v1"
MANIFEST_SCHEMA = "pose-lab-v2-crimson-orientation-probe-manifest-v1"
EXPECTED_CANDIDATE_ID = "crimson-combat-ready-vanguard-frame0-4"
EXPECTED_POSE_SHA256 = "4db76a74b24d56411d6429c0c5f35bbe77bedbe92bda086d65a162aaea0ab41a"
EXPECTED_AUTHORED_GLB_SHA256 = "d20a0f8f8f82b94ffbf0b96a10e4aa1326c6915f7346abc29385c89bcc8d734b"
PROBE_BONES = (
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
)
PROBE_AXES = {
    "X": Vector((1.0, 0.0, 0.0)),
    "Y": Vector((0.0, 1.0, 0.0)),
    "Z": Vector((0.0, 0.0, 1.0)),
}
PROBE_SIGNS = (("plus", 1.0), ("minus", -1.0))
PROBE_DEGREES = 5.0
AXIS_ANGLE_TOLERANCE_DEGREES = 0.2
SIGNED_AXIS_PAIR_MAX_DOT = -0.995
MAPPING_ORTHOGONAL_MAX_DOT = 0.02
MAPPING_DETERMINANT_MIN = 0.98
MAPPING_DETERMINANT_MAX = 1.02
NON_TARGET_EXPORT_DELTA_MAX_DEGREES = 0.001
REST_BASIS_COMPOSITION_MAX_RESIDUAL_DEGREES = 0.001
REST_AIM_AXIS_MIN_DOT_Y = 0.999
MESH_INFLUENCE_MIN_WEIGHT = 0.01
MESH_INFLUENCE_STRONG_WEIGHT = 0.25
MESH_INFLUENCE_DOMINANT_WEIGHT = 0.75


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def rounded(values, digits: int = 8) -> list[float]:
    return [round(float(value), digits) for value in values]


def vector_payload(value: Vector, digits: int = 8) -> list[float]:
    return rounded((value.x, value.y, value.z), digits)


def quaternion_payload(value: Quaternion, digits: int = 8) -> list[float]:
    value = value.normalized()
    if value.w < 0:
        value = -value
    return rounded((value.x, value.y, value.z, value.w), digits)


def matrix_payload(value: Matrix, digits: int = 8) -> list[list[float]]:
    return [rounded(row, digits) for row in value]


def xyzw_quaternion(values: list[float]) -> Quaternion:
    return Quaternion((float(values[3]), float(values[0]), float(values[1]), float(values[2]))).normalized()


def signed_delta(base: Quaternion, sample: Quaternion) -> tuple[Vector, float]:
    delta = (base.inverted() @ sample).normalized()
    if delta.w < 0:
        delta = -delta
    angle = math.degrees(delta.angle)
    axis = delta.axis.normalized() if angle > 0.000001 else Vector((0.0, 0.0, 0.0))
    return axis, angle


def rotation_delta_degrees(left: Quaternion, right: Quaternion) -> float:
    delta = (left.inverted() @ right).normalized()
    if delta.w < 0:
        delta = -delta
    return math.degrees(delta.angle)


def probe_schedule() -> list[dict]:
    schedule = [{"frame": 1, "key": "baseline", "bone": None, "axis": None, "sign": 0}]
    frame = 2
    for bone_name in PROBE_BONES:
        for axis_name in PROBE_AXES:
            for sign_name, sign in PROBE_SIGNS:
                schedule.append({
                    "frame": frame,
                    "key": f"{bone_name}.{axis_name}.{sign_name}",
                    "bone": bone_name,
                    "axis": axis_name,
                    "sign": sign,
                })
                frame += 1
    return schedule


def restore_pose(armature: bpy.types.Object, baseline: dict[str, Matrix]) -> None:
    for bone_name, matrix in baseline.items():
        armature.pose.bones[bone_name].matrix_basis = matrix.copy()
    bpy.context.view_layer.update()


def set_local_probe(armature: bpy.types.Object, bone_name: str, axis: Vector, degrees: float) -> None:
    bone = armature.pose.bones[bone_name]
    location, rotation, scale = bone.matrix_basis.decompose()
    rotation = (rotation @ Quaternion(axis, math.radians(degrees))).normalized()
    bone.matrix_basis = (
        Matrix.Translation(location)
        @ rotation.to_matrix().to_4x4()
        @ Matrix.Diagonal((scale.x, scale.y, scale.z, 1.0))
    )
    bpy.context.view_layer.update()


def key_pose(armature: bpy.types.Object, frame: int) -> None:
    for bone in armature.pose.bones:
        location, rotation, scale = bone.matrix_basis.decompose()
        bone.rotation_mode = "QUATERNION"
        bone.location = location
        bone.rotation_quaternion = rotation.normalized()
        bone.scale = scale
        bone.keyframe_insert(data_path="location", frame=frame)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
        bone.keyframe_insert(data_path="scale", frame=frame)
    bpy.context.view_layer.update()


def bone_world_matrix(armature: bpy.types.Object, bone_name: str) -> Matrix:
    return armature.matrix_world @ armature.pose.bones[bone_name].matrix


def bone_landmark(armature: bpy.types.Object, bone_name: str) -> dict:
    bone = armature.pose.bones[bone_name]
    world = bone_world_matrix(armature, bone_name)
    head = armature.matrix_world @ bone.head
    tail = armature.matrix_world @ bone.tail
    return {
        "headWorld": vector_payload(head),
        "tailWorld": vector_payload(tail),
        "aimWorld": vector_payload((tail - head).normalized()),
        "worldQuaternion": quaternion_payload(world.to_quaternion()),
    }


def influence_sources(objects: list[bpy.types.Object], bone_name: str) -> list[dict]:
    sources = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        group = obj.vertex_groups.get(bone_name)
        if group is None:
            continue
        weights = []
        for vertex in obj.data.vertices:
            weight = next((entry.weight for entry in vertex.groups if entry.group == group.index), 0.0)
            if weight >= MESH_INFLUENCE_MIN_WEIGHT:
                weights.append((vertex.index, float(weight)))
        if weights:
            sources.append({"object": obj, "weights": weights})
    return sources


def influence_landmark(sources: list[dict]) -> dict | None:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    weight_sum = 0.0
    weighted_sum = Vector((0.0, 0.0, 0.0))
    strong_count = 0
    dominant_count = 0
    objects = []
    for source in sources:
        obj = source["object"]
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            if len(mesh.vertices) != len(obj.data.vertices):
                raise RuntimeError(f"evaluated topology changed for {obj.name}")
            objects.append(obj.name)
            for index, weight in source["weights"]:
                point = evaluated.matrix_world @ mesh.vertices[index].co
                points.append(point)
                weighted_sum += point * weight
                weight_sum += weight
                strong_count += int(weight >= MESH_INFLUENCE_STRONG_WEIGHT)
                dominant_count += int(weight >= MESH_INFLUENCE_DOMINANT_WEIGHT)
        finally:
            evaluated.to_mesh_clear()
    if not points or weight_sum <= 0:
        return None
    centroid = weighted_sum / weight_sum
    low = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    high = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return {
        "objects": sorted(set(objects)),
        "weightedVertexCount": len(points),
        "strongVertexCount": strong_count,
        "dominantVertexCount": dominant_count,
        "weightSum": round(weight_sum, 8),
        "weightedCentroidWorld": vector_payload(centroid),
        "boundsWorld": {"min": vector_payload(low), "max": vector_payload(high)},
    }


def delta_payload(baseline: dict, sample: dict) -> dict:
    result = {}
    for field in ("headWorld", "tailWorld", "aimWorld"):
        left = Vector(baseline[field])
        right = Vector(sample[field])
        result[f"{field}Delta"] = vector_payload(right - left)
    result["worldRotationDeltaDegrees"] = round(rotation_delta_degrees(
        xyzw_quaternion(baseline["worldQuaternion"]),
        xyzw_quaternion(sample["worldQuaternion"]),
    ), 8)
    return result


def mesh_delta_payload(baseline: dict | None, sample: dict | None) -> dict | None:
    if not baseline or not sample:
        return None
    left = Vector(baseline["weightedCentroidWorld"])
    right = Vector(sample["weightedCentroidWorld"])
    delta = right - left
    return {
        "weightedCentroidWorldDelta": vector_payload(delta),
        "distance": round(delta.length, 8),
    }


def rest_contract(armature: bpy.types.Object, bone_name: str) -> dict:
    bone = armature.data.bones[bone_name]
    parent_relative = bone.parent.matrix_local.inverted() @ bone.matrix_local if bone.parent else bone.matrix_local.copy()
    rest_rotation = bone.matrix_local.to_3x3().normalized()
    aim_armature = (bone.tail_local - bone.head_local).normalized()
    aim_local = (rest_rotation.inverted() @ aim_armature).normalized()
    return {
        "parent": bone.parent.name if bone.parent else None,
        "children": sorted(child.name for child in bone.children),
        "length": round(float(bone.length), 8),
        "rollBasis": {
            "axis": "local +Y aim axis",
            "zeroAuthority": "parentRelativeRest.quaternion",
            "note": "rest roll is encoded by the full parent-relative basis; no context-free scalar roll is claimed",
        },
        "parentRelativeRest": {
            "translation": vector_payload(parent_relative.to_translation()),
            "quaternion": quaternion_payload(parent_relative.to_quaternion()),
            "matrix": matrix_payload(parent_relative),
        },
        "localAimAxis": vector_payload(aim_local),
        "localAxesInArmature": {
            "X": vector_payload(rest_rotation @ PROBE_AXES["X"]),
            "Y": vector_payload(rest_rotation @ PROBE_AXES["Y"]),
            "Z": vector_payload(rest_rotation @ PROBE_AXES["Z"]),
        },
    }


def bend_contract(armature: bpy.types.Object, bone_name: str) -> dict | None:
    side = "Left" if bone_name.startswith("Left") else "Right"
    if bone_name not in {f"{side}Arm", f"{side}ForeArm"}:
        return None
    shoulder = armature.matrix_world @ armature.pose.bones[f"{side}Arm"].head
    elbow = armature.matrix_world @ armature.pose.bones[f"{side}ForeArm"].head
    wrist = armature.matrix_world @ armature.pose.bones[f"{side}Hand"].head
    upper = elbow - shoulder
    lower = wrist - elbow
    normal = upper.cross(lower)
    if normal.length <= 0.000001:
        return {"status": "DEGENERATE", "authority": "inferred-from-calibration-positions"}
    normal.normalize()
    local_normal = bone_world_matrix(armature, bone_name).to_3x3().inverted() @ normal
    local_normal.normalize()
    components = {axis: float(local_normal[index]) for index, axis in enumerate(("X", "Y", "Z"))}
    chosen = max(components, key=lambda axis: abs(components[axis]))
    sign = 1 if components[chosen] >= 0 else -1
    return {
        "status": "INFERRED",
        "authority": "inferred-from-calibration-positions-not-anatomical-metadata",
        "elbowPlaneNormalWorld": vector_payload(normal),
        "elbowPlaneNormalInCurrentBoneLocal": vector_payload(local_normal.normalized()),
        "preferredBendAxis": {"axis": chosen, "sign": sign, "alignment": round(abs(components[chosen]), 8)},
        "twistAxis": {"source": "measured-local-aim-axis", "axis": "Y"},
    }


def export_probe_glb(objects: list[bpy.types.Object], armature: bpy.types.Object, path: Path, schedule: list[dict]) -> dict:
    bpy.context.scene.frame_start = schedule[0]["frame"]
    bpy.context.scene.frame_end = schedule[-1]["frame"]
    bpy.context.scene.frame_set(schedule[0]["frame"])
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_frame_range=True,
        export_force_sampling=True,
        export_def_bones=True,
        export_yup=True,
    )
    return {"path": path.name, "sha256": sha256(path), "action": "CrimsonBoneOrientationProbeV1"}


def exported_rotations(path: Path, action_name: str) -> dict[str, dict]:
    gltf, binary = parse_glb(path)
    matches = [animation for animation in gltf.get("animations", []) if animation.get("name") == action_name]
    if len(matches) != 1:
        raise RuntimeError(f"expected one {action_name} animation; got {[a.get('name') for a in gltf.get('animations', [])]}")
    animation = matches[0]
    result = {}
    for channel in animation.get("channels", []):
        target = channel.get("target", {})
        if target.get("path") != "rotation":
            continue
        node = gltf["nodes"][target["node"]]
        name = node.get("name")
        if name not in AUTHORED_BONE_NAMES:
            continue
        sampler = animation["samplers"][channel["sampler"]]
        times = [float(values[0]) for values in read_accessor_values(gltf, binary, sampler["input"])]
        values = [rounded(sample, 10) for sample in read_accessor_values(gltf, binary, sampler["output"])]
        result[name] = {"times": times, "values": values}
    return result


def mapping_contract(exported: dict[str, dict], schedule: list[dict], bone_name: str) -> tuple[dict, list[dict]]:
    failures = []
    channel = exported[bone_name]
    if len(channel["values"]) != len(schedule):
        raise RuntimeError(f"{bone_name} exported {len(channel['values'])} samples for {len(schedule)} probes")
    baseline = xyzw_quaternion(channel["values"][0])
    responses = {}
    plus_axes = {}
    for entry in schedule[1:]:
        if entry["bone"] != bone_name:
            continue
        sample = xyzw_quaternion(channel["values"][entry["frame"] - 1])
        axis, angle = signed_delta(baseline, sample)
        responses.setdefault(entry["axis"], {})["plus" if entry["sign"] > 0 else "minus"] = {
            "exportedDeltaAxis": vector_payload(axis),
            "exportedDeltaDegrees": round(angle, 8),
        }
        if entry["sign"] > 0:
            plus_axes[entry["axis"]] = axis
        if abs(angle - PROBE_DEGREES) > AXIS_ANGLE_TOLERANCE_DEGREES:
            failures.append({
                "code": "EXPORTED_PROBE_ANGLE_MISMATCH",
                "bone": bone_name,
                "axis": entry["axis"],
                "sign": entry["sign"],
                "actualDegrees": round(angle, 8),
                "expectedDegrees": PROBE_DEGREES,
            })
    for axis_name, pair in responses.items():
        plus = Vector(pair["plus"]["exportedDeltaAxis"])
        minus = Vector(pair["minus"]["exportedDeltaAxis"])
        dot = plus.dot(minus)
        pair["signedPairDot"] = round(dot, 8)
        if dot > SIGNED_AXIS_PAIR_MAX_DOT:
            failures.append({"code": "SIGNED_PROBE_AXES_NOT_OPPOSED", "bone": bone_name, "axis": axis_name, "dot": round(dot, 8)})
    mapping = Matrix((
        (plus_axes["X"].x, plus_axes["Y"].x, plus_axes["Z"].x),
        (plus_axes["X"].y, plus_axes["Y"].y, plus_axes["Z"].y),
        (plus_axes["X"].z, plus_axes["Y"].z, plus_axes["Z"].z),
    ))
    orthogonality = {
        "XY": round(abs(plus_axes["X"].dot(plus_axes["Y"])), 8),
        "XZ": round(abs(plus_axes["X"].dot(plus_axes["Z"])), 8),
        "YZ": round(abs(plus_axes["Y"].dot(plus_axes["Z"])), 8),
    }
    determinant = float(mapping.determinant())
    if max(orthogonality.values()) > MAPPING_ORTHOGONAL_MAX_DOT:
        failures.append({"code": "EXPORTED_AXIS_MAPPING_NOT_ORTHOGONAL", "bone": bone_name, "actual": orthogonality})
    if not (MAPPING_DETERMINANT_MIN <= determinant <= MAPPING_DETERMINANT_MAX):
        failures.append({"code": "EXPORTED_AXIS_MAPPING_BAD_DETERMINANT", "bone": bone_name, "actual": determinant})
    return {
        "baselineExportedQuaternion": quaternion_payload(baseline),
        "blenderLocalToGltfLocalAxisMatrix": matrix_payload(mapping),
        "blenderLocalToGltfLocalQuaternion": quaternion_payload(mapping.to_quaternion()) if determinant > 0 else None,
        "determinant": round(determinant, 8),
        "orthogonality": orthogonality,
        "responses": responses,
    }, failures


def protected_export_contract(exported: dict[str, dict], schedule: list[dict]) -> tuple[dict, list[dict]]:
    failures = []
    reports = {}
    for bone_name in sorted(PROTECTED_BODY_BONE_NAMES):
        channel = exported.get(bone_name)
        if not channel:
            failures.append({"code": "PROTECTED_EXPORT_CHANNEL_MISSING", "bone": bone_name})
            continue
        baseline = xyzw_quaternion(channel["values"][0])
        maximum = max(rotation_delta_degrees(baseline, xyzw_quaternion(sample)) for sample in channel["values"])
        reports[bone_name] = round(maximum, 10)
        if maximum > NON_TARGET_EXPORT_DELTA_MAX_DEGREES:
            failures.append({"code": "PROTECTED_CHANNEL_MOVED_DURING_PROBE", "bone": bone_name, "maxDegrees": round(maximum, 10)})
    return {
        "maximumRotationDeltaDegrees": max(reports.values(), default=None),
        "perBoneMaximumRotationDeltaDegrees": reports,
        "thresholdDegrees": NON_TARGET_EXPORT_DELTA_MAX_DEGREES,
    }, failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-js", default=str(DEFAULT_CANDIDATE))
    parser.add_argument("--candidate-id", default=EXPECTED_CANDIDATE_ID)
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT))
    parser.add_argument("--probe-degrees", type=float, default=PROBE_DEGREES)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(argv)
    if abs(args.probe_degrees - PROBE_DEGREES) > 0.000001:
        raise RuntimeError(f"orientation ledger v1 requires the canonical {PROBE_DEGREES} degree probe")
    candidate_path = Path(args.candidate_js)
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = out_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    candidate = load_candidate(candidate_path)
    frame = validate_requested_candidate(candidate, args.candidate_id)
    source = candidate.get("source", {})
    pose_sha = sha256_bytes(canonical_frame_bytes(frame))
    if args.candidate_id != EXPECTED_CANDIDATE_ID or candidate.get("id") != EXPECTED_CANDIDATE_ID:
        raise RuntimeError("orientation probe is not bound to the frozen Crimson calibration candidate")
    if pose_sha != EXPECTED_POSE_SHA256 or source.get("poseSha256") != EXPECTED_POSE_SHA256:
        raise RuntimeError(f"calibration pose SHA mismatch: actual={pose_sha} declared={source.get('poseSha256')}")
    if source.get("authoredGlbSha256") != EXPECTED_AUTHORED_GLB_SHA256 or source.get("exactAuthoredGlb") is not True:
        raise RuntimeError("calibration candidate lacks exact authored-GLB provenance")

    frames, node_frames = crimson_node_frames(candidate)
    calibration_glb = inject_animation(
        CRIMSON_GLB,
        frames,
        node_frames,
        tmp_dir / "frozen_calibration_candidate.glb",
        candidate["id"],
    )

    clear_scene()
    actions_before = set(bpy.data.actions)
    objects = import_glb(calibration_glb)
    armature = find_armature(objects, "Crimson orientation probe")
    # The glTF importer is the authority that reconstructs browser-local
    # candidate channels in Blender.  Applying candidate quaternions directly
    # to matrix_basis is forbidden because those spaces are not equivalent.
    activate_action_containing(armature, candidate["id"])
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    freeze_armature_pose_and_remove_new_actions(armature, actions_before)

    missing = [bone for bone in PROBE_BONES if armature.pose.bones.get(bone) is None]
    if missing:
        raise RuntimeError(f"Crimson probe bones missing: {missing}")
    baseline_basis = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    schedule = probe_schedule()
    influence = {bone: influence_sources(objects, bone) for bone in PROBE_BONES}
    baseline_landmarks = {bone: bone_landmark(armature, bone) for bone in PROBE_BONES}
    baseline_mesh = {bone: influence_landmark(influence[bone]) for bone in PROBE_BONES}

    action = bpy.data.actions.new("CrimsonBoneOrientationProbeV1")
    armature.animation_data_create()
    armature.animation_data.action = action
    measured = {bone: {} for bone in PROBE_BONES}
    for entry in schedule:
        bpy.context.scene.frame_set(entry["frame"])
        restore_pose(armature, baseline_basis)
        if entry["bone"]:
            set_local_probe(
                armature,
                entry["bone"],
                PROBE_AXES[entry["axis"]],
                entry["sign"] * PROBE_DEGREES,
            )
            landmark = bone_landmark(armature, entry["bone"])
            mesh = influence_landmark(influence[entry["bone"]])
            measured[entry["bone"]][entry["key"]] = {
                "landmark": landmark,
                "landmarkDelta": delta_payload(baseline_landmarks[entry["bone"]], landmark),
                "meshInfluenceDelta": mesh_delta_payload(baseline_mesh[entry["bone"]], mesh),
            }
        key_pose(armature, entry["frame"])
    restore_pose(armature, baseline_basis)

    probe_glb = out_dir / "crimson_orientation_probes.glb"
    export_report = export_probe_glb(objects, armature, probe_glb, schedule)
    exported = exported_rotations(probe_glb, action.name)
    failures = []
    bone_ledgers = {}
    for bone_name in PROBE_BONES:
        rest = rest_contract(armature, bone_name)
        if Vector(rest["localAimAxis"]).dot(Vector((0.0, 1.0, 0.0))) < REST_AIM_AXIS_MIN_DOT_Y:
            failures.append({"code": "REST_AIM_AXIS_NOT_LOCAL_Y", "bone": bone_name, "actual": rest["localAimAxis"]})
        mapping, mapping_failures = mapping_contract(exported, schedule, bone_name)
        failures.extend(mapping_failures)
        blender_baseline = baseline_basis[bone_name].to_quaternion().normalized()
        gltf_baseline = xyzw_quaternion(mapping["baselineExportedQuaternion"])
        rest_basis = xyzw_quaternion(rest["parentRelativeRest"]["quaternion"])
        composed_gltf = (rest_basis @ blender_baseline).normalized()
        composition_residual = rotation_delta_degrees(composed_gltf, gltf_baseline)
        mapping["baselineBlenderMatrixBasisQuaternion"] = quaternion_payload(blender_baseline)
        mapping["baselineQuaternionAngularDifferenceDegrees"] = round(rotation_delta_degrees(blender_baseline, gltf_baseline), 8)
        mapping["blenderBasisToGltf"] = {
            "formula": "gltfLocal = parentRelativeRest * blenderMatrixBasis",
            "inverseFormula": "blenderMatrixBasis = inverse(parentRelativeRest) * gltfLocal",
            "composedQuaternion": quaternion_payload(composed_gltf),
            "compositionResidualDegrees": round(composition_residual, 8),
            "maximumResidualDegrees": REST_BASIS_COMPOSITION_MAX_RESIDUAL_DEGREES,
        }
        if composition_residual > REST_BASIS_COMPOSITION_MAX_RESIDUAL_DEGREES:
            failures.append({
                "code": "REST_BASIS_GLTF_COMPOSITION_MISMATCH",
                "bone": bone_name,
                "actualResidualDegrees": round(composition_residual, 8),
                "maximumResidualDegrees": REST_BASIS_COMPOSITION_MAX_RESIDUAL_DEGREES,
            })
        bone_ledgers[bone_name] = {
            "rest": rest,
            "calibration": baseline_landmarks[bone_name],
            "meshInfluence": baseline_mesh[bone_name],
            "bendGuidance": bend_contract(armature, bone_name),
            "gltfRoundTrip": mapping,
            "positiveRotationResponse": {
                axis: measured[bone_name][f"{bone_name}.{axis}.plus"]
                for axis in PROBE_AXES
            },
            "negativeRotationResponse": {
                axis: measured[bone_name][f"{bone_name}.{axis}.minus"]
                for axis in PROBE_AXES
            },
        }
    protected_report, protected_failures = protected_export_contract(exported, schedule)
    failures.extend(protected_failures)

    ledger = {
        "schema": SCHEMA,
        "createdAt": utc_now(),
        "status": "FAIL" if failures else "PASS",
        "classification": "calibration-measurement-not-pose-acceptance",
        "rig": {
            "character": "crimson",
            "sourceGlb": str(CRIMSON_GLB.relative_to(ROOT)),
            "sourceGlbSha256": sha256(CRIMSON_GLB),
        },
        "calibrationSpecimen": {
            "candidateId": candidate["id"],
            "candidatePath": str(candidate_path.relative_to(ROOT)),
            "candidateModuleSha256": sha256(candidate_path),
            "poseSha256": pose_sha,
            "authoredGlbSha256": source["authoredGlbSha256"],
            "exactAuthoredGlb": True,
            "visualVerdict": "REJECTED_FOR_HANDOFF_MEASUREMENT_WORTHY",
            "rejectedBecause": "browser-center blade line meets the plume and grazes the visor contour",
        },
        "authority": {
            "positionTruth": "frozen Crimson candidate reconstructed by glTF import",
            "orientationTruth": "isolated signed Blender local-axis probes measured after Blender glTF export",
            "bendGuidance": "inferred from calibration shoulder-elbow-wrist positions and labeled as inference",
            "crossRigPoseInputs": [],
        },
        "probe": {
            "degrees": PROBE_DEGREES,
            "axes": list(PROBE_AXES),
            "signs": [name for name, _sign in PROBE_SIGNS],
            "sampleCount": len(schedule),
            "schedule": schedule,
            "exportedGlb": export_report,
        },
        "protectedBody": protected_report,
        "bones": bone_ledgers,
        "weaponAttachment": {
            "attachmentBone": "RightHand",
            "authority": "committed browser-local candidate transform; character GLB contains no sword",
            "sabreLocal": frame["sabreLocal"],
            "solveOrder": ["position-target", "pole-guidance", "measured-bone-basis", "wrist-roll", "visible-mesh-seat"],
        },
        "failures": failures,
    }
    ledger_path = out_dir / "crimson-bone-orientation-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2), encoding="utf-8")
    manifest = {
        "schema": MANIFEST_SCHEMA,
        "createdAt": ledger["createdAt"],
        "status": ledger["status"],
        "classification": ledger["classification"],
        "ledger": {"path": ledger_path.name, "sha256": sha256(ledger_path)},
        "probeGlb": export_report,
        "candidate": ledger["calibrationSpecimen"],
        "failureCount": len(failures),
        "failures": failures,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({
        "ok": not failures,
        "outDir": str(out_dir.relative_to(ROOT)) if out_dir.is_relative_to(ROOT) else str(out_dir),
        "ledger": ledger_path.name,
        "ledgerSha256": manifest["ledger"]["sha256"],
        "probeGlbSha256": export_report["sha256"],
        "failureCount": len(failures),
    }, indent=2))
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
