#!/usr/bin/env python3
"""Build Meshy-derived fist hands for Pose Lab V2.

This is a Blender-first authored asset lane. It extracts hand-weighted vertices from
`public/assets/meshy/meshy_apose_walking_with_skin.glb`, reshapes only the
extracted hand point clouds into compact closed fist hulls, and exports a quarantined runtime GLB.
The original Meshy body mesh, skeleton, and skin weights are not modified.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE_GLB = ROOT / 'public' / 'assets' / 'meshy' / 'meshy_apose_walking_with_skin.glb'
RUNTIME_GLB = ROOT / 'public' / 'assets' / 'meshy' / 'meshy_fist_hands.glb'
OUT_DIR = ROOT / 'generated' / 'meshy-fist-authoring'
RENDER_DIR = OUT_DIR / 'renders'
MANIFEST_PATH = OUT_DIR / 'manifest.json'
CONTACT_PATH = OUT_DIR / 'contact_sheet.html'

VIEWS = [
    {'id': 'fpv', 'label': 'FPV read', 'direction': (0.0, -1.0, 0.24), 'distance': 2.4, 'lens': 34},
    {'id': 'right_close', 'label': 'Right fist close', 'object': 'RightMeshyFistHand', 'direction': (0.0, -1.0, 0.18), 'distance': 2.1, 'lens': 54},
    {'id': 'left_close', 'label': 'Left fist close', 'object': 'LeftMeshyFistHand', 'direction': (0.0, -1.0, 0.18), 'distance': 2.1, 'lens': 54},
    {'id': 'top_shape', 'label': 'Top shape', 'direction': (0.0, 0.0, 1.0), 'distance': 2.5, 'lens': 50},
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-glb', default=str(SOURCE_GLB))
    parser.add_argument('--runtime-glb', default=str(RUNTIME_GLB))
    parser.add_argument('--out-dir', default=str(OUT_DIR))
    parser.add_argument('--no-render', action='store_true')
    argv = []
    import sys
    if '--' in sys.argv:
        argv = sys.argv[sys.argv.index('--') + 1:]
    return parser.parse_args(argv)


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
    raise RuntimeError('Meshy armature not found')


def find_skinned_mesh(objects: list[bpy.types.Object]) -> bpy.types.Object:
    meshes = [obj for obj in objects if obj.type == 'MESH' and obj.vertex_groups]
    if not meshes:
        raise RuntimeError('Meshy skinned mesh with vertex groups not found')
    return max(meshes, key=lambda obj: len(obj.data.vertices))


def group_weight(vertex: bpy.types.MeshVertex, group_index: int) -> float:
    for group in vertex.groups:
        if group.group == group_index:
            return group.weight
    return 0.0


def hand_local_point(mesh_obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str, co: Vector) -> Vector:
    world = mesh_obj.matrix_world @ co
    armature_local = armature.matrix_world.inverted() @ world
    bone = armature.data.bones[bone_name]
    return bone.matrix_local.inverted() @ armature_local


def compact_fist_point(point: Vector, center: Vector, side_sign: float) -> Vector:
    # Keep this intentionally simple and inspectable: compress the extracted hand
    # shell toward the palm while preserving asymmetric Meshy surface detail.
    delta = point - center
    return Vector((
        center.x + delta.x * 0.72,
        center.y + delta.y * 0.42,
        center.z + delta.z * 0.68 + abs(delta.y) * 0.18,
    ))


def extract_hand(mesh_obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str, out_name: str, side_sign: float) -> bpy.types.Object:
    vg = mesh_obj.vertex_groups.get(bone_name)
    if vg is None:
        raise RuntimeError(f'vertex group {bone_name} not found')
    mesh = mesh_obj.data
    included = set()
    face_indices = []
    for poly in mesh.polygons:
        weights = [group_weight(mesh.vertices[index], vg.index) for index in poly.vertices]
        if min(weights) > 0.18 and sum(weights) / len(weights) > 0.45:
            face_indices.append(poly.index)
            included.update(poly.vertices)
    if len(included) < 80:
        raise RuntimeError(f'not enough {bone_name} vertices for Meshy-derived fist: {len(included)}')

    local_points = {
        index: hand_local_point(mesh_obj, armature, bone_name, mesh.vertices[index].co)
        for index in included
    }
    center = sum(local_points.values(), Vector()) / len(local_points)
    points = [compact_fist_point(point, center, side_sign) for point in local_points.values()]
    bm = bmesh.new()
    verts = [bm.verts.new(tuple(point)) for point in points]
    bm.verts.ensure_lookup_table()
    hull = bmesh.ops.convex_hull(bm, input=verts)
    delete_geom = []
    seen_geom = set()
    for geom in list(hull.get('geom_interior', [])) + list(hull.get('geom_unused', [])):
        if not geom.is_valid or id(geom) in seen_geom:
            continue
        seen_geom.add(id(geom))
        delete_geom.append(geom)
    if delete_geom:
        bmesh.ops.delete(bm, geom=delete_geom, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=[face for face in bm.faces])
    out_mesh = bpy.data.meshes.new(out_name + 'Mesh')
    bm.to_mesh(out_mesh)
    bm.free()
    out_mesh.update()
    out_obj = bpy.data.objects.new(out_name, out_mesh)
    bpy.context.scene.collection.objects.link(out_obj)
    if mesh_obj.material_slots:
        out_obj.data.materials.append(mesh_obj.material_slots[0].material)
    out_obj['pose_lab_v2_source'] = 'derived from Meshy hand-weighted vertices'
    out_obj['parent_bone'] = bone_name
    out_obj['runtime_parent_contract'] = f'{bone_name} -> {out_name}'
    out_obj['fist_transform'] = 'compact hand-local Meshy vertices; original body mesh untouched'
    return out_obj


def add_review_rig(hand_obj: bpy.types.Object, side: str) -> bpy.types.Object:
    # The runtime uses the static authored fist mesh for now, but the artifact
    # records the intended simple rig chain for future curl controls.
    rig = bpy.data.objects.new(f'{side}FistRigContract', None)
    rig.empty_display_type = 'ARROWS'
    rig.empty_display_size = 0.08
    bpy.context.scene.collection.objects.link(rig)
    rig['mitten_chain'] = json.dumps([f'{side}Mitten01', f'{side}Mitten02', f'{side}Mitten03'])
    rig['thumb_chain'] = json.dumps([f'{side}Thumb01', f'{side}Thumb02'])
    rig['weights_status'] = 'static extracted Meshy hand mesh in v1; no full-body weights modified'
    return rig


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def setup_render_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 900
    scene.render.resolution_y = 520
    scene.world.color = (0.055, 0.065, 0.07)
    camera_data = bpy.data.cameras.new('fist_review_camera')
    camera = bpy.data.objects.new('fist_review_camera', camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    sun_data = bpy.data.lights.new('fist_review_sun', 'SUN')
    sun = bpy.data.objects.new('fist_review_sun', sun_data)
    sun.rotation_euler = (math.radians(45), 0, math.radians(32))
    sun.data.energy = 2.1
    bpy.context.collection.objects.link(sun)
    area_data = bpy.data.lights.new('fist_review_softbox', 'AREA')
    area = bpy.data.objects.new('fist_review_softbox', area_data)
    area.location = (0, -2.2, 1.3)
    area.data.energy = 380
    area.data.size = 2.5
    bpy.context.collection.objects.link(area)
    return camera


def object_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector, Vector, Vector]:
    min_v = Vector((float('inf'), float('inf'), float('inf')))
    max_v = Vector((float('-inf'), float('-inf'), float('-inf')))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)
    center = (min_v + max_v) * 0.5
    size = max_v - min_v
    return min_v, max_v, center, size


def render_views(camera: bpy.types.Object, out_dir: Path) -> list[dict[str, str]]:
    render_dir = out_dir / 'renders'
    render_dir.mkdir(parents=True, exist_ok=True)
    images = []
    fist_objects = [obj for obj in bpy.data.objects if obj.name in {'RightMeshyFistHand', 'LeftMeshyFistHand'}]
    _, _, all_center, all_size = object_bounds(fist_objects)
    for view in VIEWS:
        targets = fist_objects
        if view.get('object'):
            targets = [bpy.data.objects[view['object']]]
        _, _, center, size = object_bounds(targets)
        target = center if view.get('object') else all_center
        frame_size = max(size.x, size.y, size.z, all_size.x * 0.35, 0.5)
        direction = Vector(view['direction']).normalized()
        camera.location = target + direction * frame_size * view['distance']
        camera.data.lens = view['lens']
        camera.data.clip_start = 0.005
        camera.data.clip_end = 20
        look_at(camera, target)
        path = render_dir / f"{view['id']}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        images.append({'id': view['id'], 'label': view['label'], 'path': str(path.relative_to(out_dir))})
    return images


def write_contact(out_dir: Path, images: list[dict[str, str]]) -> None:
    cards = []
    for image in images:
        cards.append(f"<figure><img src='{image['path']}'><figcaption>{image['label']}</figcaption></figure>")
    CONTACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONTACT_PATH.write_text("""<!doctype html><meta charset='utf-8'>
<title>Meshy Fist Authoring Review</title>
<style>body{margin:0;background:#111;color:#eee;font:16px system-ui}main{padding:16px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}figure{margin:0;background:#1d2225;padding:10px;border-radius:8px}img{width:100%;height:auto;display:block}figcaption{padding-top:8px;color:#ccd}</style>
<main><h1>Meshy Fist Authoring Review</h1><p>Diagnostic only. Uses actual Meshy hand-derived geometry; cloud review remains acceptance.</p><section>""" + ''.join(cards) + "</section></main>\n")


def main() -> None:
    args = parse_args()
    source = Path(args.source_glb).resolve()
    runtime_glb = Path(args.runtime_glb).resolve()
    out_dir = Path(args.out_dir).resolve()
    if not source.exists():
        raise FileNotFoundError(source)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    runtime_glb.parent.mkdir(parents=True, exist_ok=True)

    clear_scene()
    imported = import_glb(source)
    armature = find_armature(imported)
    skinned = find_skinned_mesh(imported)
    right = extract_hand(skinned, armature, 'RightHand', 'RightMeshyFistHand', -1.0)
    left = extract_hand(skinned, armature, 'LeftHand', 'LeftMeshyFistHand', 1.0)
    add_review_rig(right, 'Right')
    add_review_rig(left, 'Left')

    for obj in imported:
        obj.hide_render = True
        obj.hide_viewport = True
    for obj in [right, left]:
        obj.hide_render = False
        obj.hide_viewport = False

    bpy.ops.object.select_all(action='DESELECT')
    for obj in [right, left]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = right
    bpy.ops.export_scene.gltf(filepath=str(runtime_glb), export_format='GLB', use_selection=True)

    images = []
    if not args.no_render:
        camera = setup_render_scene()
        images = render_views(camera, out_dir)
        write_contact(out_dir, images)

    manifest = {
        'schema': 'pose-lab-v2-meshy-fist-authoring-v1',
        'asset': 'meshy_fist_hands',
        'status': 'quarantined-review',
        'diagnostic_only': True,
        'source_glb': str(source.relative_to(ROOT)),
        'source_glb_sha256': sha256(source),
        'runtime_glb': str(runtime_glb.relative_to(ROOT)),
        'runtime_glb_sha256': sha256(runtime_glb),
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'blender': bpy.app.version_string,
        'geometry_policy': 'actual Meshy hand-weighted vertices extracted and compacted into closed convex fist hulls; original body mesh and weights untouched',
        'runtime_parenting': {
            'RightMeshyFistHand': 'RightHand',
            'LeftMeshyFistHand': 'LeftHand',
        },
        'intended_rig': {
            'mitten_chain': ['Mitten01', 'Mitten02', 'Mitten03'],
            'thumb_chain': ['Thumb01', 'Thumb02'],
            'note': 'v1 exports static real-derived fist meshes; chains are recorded as the next Blender control rig target, not runtime acceptance proof.'
        },
        'acceptance_note': 'Cloud visual review must decide whether the hands read as fists; this manifest is guardrail evidence only.',
        'images': images,
        'contact_sheet': 'contact_sheet.html' if images else None,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'ok': True, 'runtime_glb': str(runtime_glb), 'manifest': str(MANIFEST_PATH), 'images': len(images)}, indent=2))


if __name__ == '__main__':
    main()
