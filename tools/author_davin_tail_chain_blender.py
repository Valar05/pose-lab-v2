#!/usr/bin/env python3
"""Author a three-segment Davin tail bone chain and isolate tail weights.

This creates a derived GLB. The original Davin runtime GLB is not overwritten.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE_GLB = ROOT / 'public' / 'assets' / 'davin' / 'davin_wingsworth_kestrel_man_rigged_pbr.glb'
RUNTIME_GLB = ROOT / 'public' / 'assets' / 'davin' / 'davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb'
OUT_DIR = ROOT / 'generated' / 'davin-tail-authoring'

TAIL_BONES = ['Tail01', 'Tail02', 'Tail03']


def argv_after_blender() -> list[str]:
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-glb', default=str(SOURCE_GLB))
    parser.add_argument('--runtime-glb', default=str(RUNTIME_GLB))
    parser.add_argument('--out-dir', default=str(OUT_DIR))
    parser.add_argument('--mask-debug', action='store_true')
    parser.add_argument('--allow-red-mask', action='store_true', help='export even when the tail mask sanity gate fails')
    parser.add_argument('--diagnostic-only', action='store_true', help='write mask manifest/render without exporting or failing')
    return parser.parse_args(argv_after_blender())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def find_armature(objects: list[bpy.types.Object]) -> bpy.types.Object:
    for obj in objects:
        if obj.type == 'ARMATURE':
            return obj
    raise RuntimeError('Davin armature not found')


def find_skinned_mesh(objects: list[bpy.types.Object]) -> bpy.types.Object:
    meshes = [obj for obj in objects if obj.type == 'MESH' and obj.vertex_groups]
    if not meshes:
        raise RuntimeError('Davin skinned mesh not found')
    return max(meshes, key=lambda obj: len(obj.data.vertices))


def ensure_vertex_group(mesh_obj: bpy.types.Object, name: str) -> bpy.types.VertexGroup:
    group = mesh_obj.vertex_groups.get(name)
    if group is None:
        group = mesh_obj.vertex_groups.new(name=name)
    return group


def vertex_weight(vertex: bpy.types.MeshVertex, group_index: int) -> float:
    for item in vertex.groups:
        if item.group == group_index:
            return item.weight
    return 0.0


def tail_mask(mesh_obj: bpy.types.Object, vertex: bpy.types.MeshVertex) -> float:
    world = mesh_obj.matrix_world @ vertex.co
    x, y, z = world.x, world.y, world.z
    # Davin source coordinates: head/front is negative Y; rear plumage/tail is positive Y.
    # Keep this deliberately conservative: central rear lower-body feathers only.
    if abs(x) > 0.33:
        return 0.0
    if y < 0.06:
        return 0.0
    if z < 0.12 or z > 0.93:
        return 0.0
    rear = min(1.0, max(0.0, (y - 0.06) / 0.25))
    central = min(1.0, max(0.0, 1.0 - abs(x) / 0.33))
    vertical = 1.0
    # Avoid grabbing the forward torso/vest top; strongest tail weights low and rear.
    if z > 0.72:
        vertical *= max(0.0, 1.0 - (z - 0.72) / 0.21)
    return rear * central * vertical


def tail_segment_weights(mesh_obj: bpy.types.Object, vertex: bpy.types.MeshVertex, mask: float) -> tuple[float, float, float]:
    world = mesh_obj.matrix_world @ vertex.co
    # Tip is lower/back; base is upper/front of the selected plume.
    t = min(1.0, max(0.0, ((world.y - 0.06) / 0.28) * 0.55 + ((0.88 - world.z) / 0.76) * 0.45))
    centers = [0.14, 0.50, 0.86]
    raw = [max(0.0, 1.0 - abs(t - c) / 0.36) for c in centers]
    total = sum(raw) or 1.0
    return tuple(mask * value / total for value in raw)


def add_tail_bones(armature: bpy.types.Object) -> list[dict[str, tuple[float, float, float]]]:
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = armature.data.edit_bones
    for name in TAIL_BONES:
        existing = eb.get(name)
        if existing:
            eb.remove(existing)
    hips = eb.get('Hips')
    if hips is None:
        raise RuntimeError('Hips bone not found for tail parent')
    world_points = [
        Vector((0.0, 0.11, 0.79)),
        Vector((0.0, 0.19, 0.62)),
        Vector((0.0, 0.27, 0.43)),
        Vector((0.0, 0.33, 0.22)),
    ]
    local_points = [armature.matrix_world.inverted() @ point for point in world_points]
    authored = []
    parent = hips
    for index, name in enumerate(TAIL_BONES):
        bone = eb.new(name)
        bone.head = local_points[index]
        bone.tail = local_points[index + 1]
        bone.roll = 0.0
        bone.parent = parent
        bone.use_connect = False
        authored.append({'name': name, 'head': tuple(round(v, 5) for v in world_points[index]), 'tail': tuple(round(v, 5) for v in world_points[index + 1])})
        parent = bone
    bpy.ops.object.mode_set(mode='OBJECT')
    return authored


def reweight_tail(mesh_obj: bpy.types.Object) -> dict:
    groups = [ensure_vertex_group(mesh_obj, name) for name in TAIL_BONES]
    selected = []
    removed_total = 0
    for vertex in mesh_obj.data.vertices:
        mask = tail_mask(mesh_obj, vertex)
        if mask <= 0.04:
            continue
        weights = tail_segment_weights(mesh_obj, vertex, mask)
        if sum(weights) <= 0.04:
            continue
        selected.append(vertex.index)
        # Remove existing body influences from the isolated tail vertices. This makes
        # the chain independent for later spring-bone tests instead of inheriting leg noise.
        for group in list(vertex.groups):
            vg = mesh_obj.vertex_groups[group.group]
            if vg.name not in TAIL_BONES:
                vg.remove([vertex.index])
                removed_total += 1
        for group, weight in zip(groups, weights):
            group.add([vertex.index], weight, 'REPLACE')
        # Normalize the chain to 1.0 on selected vertices.
        total = sum(weights)
        if total > 0:
            for group, weight in zip(groups, weights):
                group.add([vertex.index], weight / total, 'REPLACE')
    if not selected:
        raise RuntimeError('tail mask selected zero vertices')
    points = [mesh_obj.matrix_world @ mesh_obj.data.vertices[index].co for index in selected]
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    counts = {}
    for group in groups:
        counts[group.name] = sum(1 for index in selected if vertex_weight(mesh_obj.data.vertices[index], group.index) > 0.01)
    return {
        'selectedVertices': len(selected),
        'removedInfluences': removed_total,
        'boundsMin': tuple(round(v, 5) for v in low),
        'boundsMax': tuple(round(v, 5) for v in high),
        'tailGroupCounts': counts,
    }


def mask_acceptance(weight_report: dict) -> dict:
    low = weight_report['boundsMin']
    high = weight_report['boundsMax']
    width_x = round(high[0] - low[0], 5)
    depth_y = round(high[1] - low[1], 5)
    height_z = round(high[2] - low[2], 5)
    failures = []
    if width_x > 0.28:
        failures.append(f'tail selection is too wide on X for a central/fan root isolate: {width_x}')
    if height_z > 0.55:
        failures.append(f'tail selection is too tall and likely includes torso/leg/wing vertices: {height_z}')
    if weight_report['selectedVertices'] > 180:
        selected_vertices = weight_report['selectedVertices']
        failures.append(f'tail selection has too many vertices for the initial spring-chain isolate: {selected_vertices}')
    return {
        'status': 'PASS' if not failures else 'FAIL',
        'widthX': width_x,
        'depthY': depth_y,
        'heightZ': height_z,
        'failures': failures,
        'note': 'Fail closed until a mask-debug render proves only the low rear tail fan is selected.'
    }


def add_debug_mask_material(mesh_obj: bpy.types.Object) -> None:
    mat = bpy.data.materials.new('TailMask_Debug_Red')
    mat.diffuse_color = (1.0, 0.08, 0.02, 1.0)
    mesh_obj.data.materials.append(mat)
    debug_index = len(mesh_obj.data.materials) - 1
    for poly in mesh_obj.data.polygons:
        values = [tail_mask(mesh_obj, mesh_obj.data.vertices[index]) for index in poly.vertices]
        if sum(values) / len(values) > 0.08:
            poly.material_index = debug_index


def render_mask_debug(out_path: Path) -> None:
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.world.color = (0.045, 0.05, 0.055)
    if hasattr(scene, 'display'):
        scene.display.shading.light = 'STUDIO'
        scene.display.shading.color_type = 'MATERIAL'
    camera = bpy.data.objects.new('davin_tail_mask_camera', bpy.data.cameras.new('davin_tail_mask_camera'))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 1.8
    camera.location = (1.35, -1.55, 0.78)
    direction = Vector((0.0, 0.18, 0.55)) - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    light = bpy.data.objects.new('davin_tail_mask_light', bpy.data.lights.new('davin_tail_mask_light', 'AREA'))
    light.location = (0.0, -2.4, 2.5)
    light.data.energy = 500
    light.data.size = 4
    bpy.context.collection.objects.link(light)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)


def export_glb(path: Path) -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True)


def main() -> None:
    args = parse_args()
    source = Path(args.source_glb).resolve()
    runtime = Path(args.runtime_glb).resolve()
    out_dir = Path(args.out_dir).resolve()
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / 'manifest.json'
    clear_scene()
    imported = import_glb(source)
    armature = find_armature(imported)
    mesh_obj = find_skinned_mesh(imported)
    authored = add_tail_bones(armature)
    weight_report = reweight_tail(mesh_obj)
    acceptance = mask_acceptance(weight_report)
    debug_render = out_dir / 'tail-mask-debug.png'
    if args.mask_debug or acceptance['status'] != 'PASS':
        add_debug_mask_material(mesh_obj)
        render_mask_debug(debug_render)
    exported = (acceptance['status'] == 'PASS' or args.allow_red_mask) and not args.diagnostic_only
    if exported:
        for obj in bpy.data.objects:
            obj.select_set(obj.type in {'ARMATURE', 'MESH', 'EMPTY'})
        export_glb(runtime)
    runtime_sha = sha256(runtime) if runtime.exists() else None
    manifest = {
        'schema': 'pose-lab-v2-davin-tail3-authoring-v1',
        'status': 'derived-runtime-asset',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'sourceGlb': str(source.relative_to(ROOT)),
        'sourceSha256': sha256(source),
        'runtimeGlb': str(runtime.relative_to(ROOT)),
        'runtimeSha256': runtime_sha,
        'exportedRuntime': exported,
        'diagnosticOnly': bool(args.diagnostic_only),
        'maskDebugRender': str(debug_render.relative_to(ROOT)) if debug_render.exists() else None,
        'blender': bpy.app.version_string,
        'tailChain': authored,
        'weightReport': weight_report,
        'maskAcceptance': acceptance,
        'springBoneIntent': {
            'chain': TAIL_BONES,
            'rootParent': 'Hips',
            'note': 'Tail vertices are isolated from body/leg groups and bound across Tail01/Tail02/Tail03 for later spring-bone motion.'
        },
        'acceptance': 'Asset authoring guardrail only; visual contact sheet must prove silhouette improvement.'
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    if not exported:
        ok = bool(args.diagnostic_only)
        print(json.dumps({'ok': ok, 'runtimeGlb': str(runtime), 'manifest': str(manifest_path), 'maskAcceptance': acceptance, **weight_report}, indent=2))
        if not args.diagnostic_only:
            raise RuntimeError('Davin tail mask sanity gate failed; runtime GLB was not overwritten')
        return
    print(json.dumps({'ok': True, 'runtimeGlb': str(runtime), 'manifest': str(manifest_path), 'maskAcceptance': acceptance, **weight_report}, indent=2))

if __name__ == '__main__':
    main()
