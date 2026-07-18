#!/usr/bin/env python3
"""Render local Crimson/Arborblade diagnostics using the browser model-viewer contract."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
CONSTRAINTS = ROOT / 'public' / 'assets' / 'crimson' / 'crimson_model_viewer_constraints.json'
OUT_ROOT = ROOT / 'generated' / 'crimson-sword-calibration'
SCHEMA = 'pose-lab-v2-crimson-sword-offline-render-v1'
CONTRACT_SCHEMA = 'pose-lab-v2-crimson-model-viewer-constraints-v1'


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def stable_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def contract_hash(contract: dict) -> str:
    return hashlib.sha256(stable_json(contract).encode('utf-8')).hexdigest()


def project_path(relative: str) -> Path:
    return ROOT / relative


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def fail(message: str) -> None:
    raise RuntimeError(f'model-viewer constraint failure: {message}')


def validate_contract(contract: dict, calibration: dict) -> None:
    if contract.get('schema') != CONTRACT_SCHEMA:
        fail('bad or missing contract schema')
    if contract.get('status') != 'diagnostic-only-not-visual-acceptance':
        fail('local Blender contract must remain diagnostic-only')
    if contract.get('model') != 'crimson' or contract.get('target') != 'crimson-sword':
        fail('contract must target Crimson sword')
    if contract.get('assets', {}).get('calibration') != 'public/assets/crimson/crimson_sword_calibration.json':
        fail('contract must point at the project Crimson calibration')
    for key in ['hierarchy', 'saberGripLocal', 'swordLocal', 'bladeLocalAxis', 'hiltLocalPoint']:
        if contract.get(key) != calibration.get(key):
            fail(f'{key} diverges from crimson_sword_calibration.json')
    camera = contract.get('camera') or {}
    if camera.get('fov') != 36 or camera.get('near') != 0.01 or camera.get('far') != 80:
        fail('camera does not match model-viewer REVIEW_CAMERA_CONTRACT')
    if camera.get('position') != [2.8, 1.75, 4.2] or camera.get('target') != [0, 0.95, 0]:
        fail('camera position/target does not match model viewer')
    if camera.get('viewport') != [390, 844]:
        fail('viewport does not match model viewer contract')
    normalization = contract.get('normalization') or {}
    if normalization.get('method') != 'pose-lab-v2-normalizeCharacter' or normalization.get('targetHeight') != 1.75:
        fail('normalization policy does not match browser normalizeCharacter')
    local_capture = contract.get('localBlenderCapture') or {}
    if local_capture.get('classification') != 'diagnostic' or local_capture.get('acceptance') is not False:
        fail('local Blender capture cannot be acceptance')
    if local_capture.get('mustValidateBeforeRender') is not True:
        fail('local Blender capture must validate before render')


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def top_level(objects: list[bpy.types.Object]) -> list[bpy.types.Object]:
    owned = set(objects)
    return [obj for obj in objects if obj.parent not in owned]


def mesh_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector, Vector]:
    low = Vector((float('inf'), float('inf'), float('inf')))
    high = Vector((float('-inf'), float('-inf'), float('-inf')))
    found = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != 'MESH':
            continue
        found = True
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            world = evaluated.matrix_world @ Vector(corner)
            low.x = min(low.x, world.x)
            low.y = min(low.y, world.y)
            low.z = min(low.z, world.z)
            high.x = max(high.x, world.x)
            high.y = max(high.y, world.y)
            high.z = max(high.z, world.z)
    if not found:
        raise RuntimeError('no mesh bounds found')
    return low, high, high - low


def normalize_character(objects: list[bpy.types.Object], contract: dict) -> None:
    low, high, size = mesh_bounds(objects)
    height = max(0.001, size.y)
    target_height = float(contract['normalization']['targetHeight'])
    center = (low + high) * 0.5
    offset = Vector((-center.x, -center.y + size.y * 0.5, -center.z))
    matrix = Matrix.Translation(offset) @ Matrix.Diagonal((target_height / height, target_height / height, target_height / height, 1.0))
    for obj in top_level(objects):
        obj.matrix_world = matrix @ obj.matrix_world
    bpy.context.view_layer.update()


def transform_matrix(transform: dict) -> Matrix:
    position = transform.get('position') or [0, 0, 0]
    rotation_deg = transform.get('rotationDeg') or [0, 0, 0]
    scale = transform.get('scale') or [1, 1, 1]
    translation = Matrix.Translation(Vector(position))
    rotation = Euler(tuple(math.radians(value) for value in rotation_deg), 'XYZ').to_matrix().to_4x4()
    scaling = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return translation @ rotation @ scaling


def find_right_hand_matrix(objects: list[bpy.types.Object]) -> Matrix:
    for obj in objects:
        if obj.type != 'ARMATURE':
            continue
        pose_bone = obj.pose.bones.get('RightHand')
        if pose_bone:
            return obj.matrix_world @ pose_bone.matrix
    raise RuntimeError('Crimson armature did not expose RightHand')


def apply_crimson_sword_review_material(sword_objects: list[bpy.types.Object]) -> None:
    material = bpy.data.materials.new('CrimsonArborbladeVisibleSteel')
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.58, 0.68, 0.74, 1.0)
        bsdf.inputs['Metallic'].default_value = 0.78
        bsdf.inputs['Roughness'].default_value = 0.34
        bsdf.inputs['Emission Color'].default_value = (0.02, 0.07, 0.08, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 0.16
    material.diffuse_color = (0.58, 0.68, 0.74, 1.0)
    for obj in sword_objects:
        if obj.type != 'MESH':
            continue
        obj.data.materials.clear()
        obj.data.materials.append(material)


def attach_sword_to_contract(character_objects: list[bpy.types.Object], sword_objects: list[bpy.types.Object], contract: dict) -> Matrix:
    hand_world = find_right_hand_matrix(character_objects)
    socket_world = hand_world @ transform_matrix(contract['saberGripLocal']) @ transform_matrix(contract['swordLocal'])
    for obj in top_level(sword_objects):
        obj.matrix_world = socket_world @ obj.matrix_world
    bpy.context.view_layer.update()
    return socket_world


def setup_scene(contract: dict, samples: int) -> bpy.types.Object:
    width, height = contract['camera']['viewport']
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'Medium High Contrast'
    scene.world.color = (16 / 255, 19 / 255, 21 / 255)
    camera = bpy.data.objects.new('crimson_model_viewer_contract_camera', bpy.data.cameras.new('crimson_model_viewer_contract_camera'))
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.location = Vector(contract['camera']['position'])
    target = Vector(contract['camera']['target'])
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    camera.data.angle = math.radians(contract['camera']['fov'])
    camera.data.clip_start = contract['camera']['near']
    camera.data.clip_end = contract['camera']['far']
    sun = bpy.data.objects.new('crimson_sword_sun', bpy.data.lights.new('crimson_sword_sun', 'SUN'))
    sun.rotation_euler = (math.radians(45), 0, math.radians(28))
    sun.data.energy = 2.4
    bpy.context.collection.objects.link(sun)
    area = bpy.data.objects.new('crimson_sword_softbox', bpy.data.lights.new('crimson_sword_softbox', 'AREA'))
    area.location = (0, -3.0, 2.4)
    area.data.energy = 500
    area.data.size = 4.0
    bpy.context.collection.objects.link(area)
    return camera


def add_axis_marker(origin: Vector, length: float) -> None:
    mesh = bpy.data.meshes.new('normalized_blade_axis_mesh')
    mesh.from_pydata([origin, origin + Vector((0, 0, length))], [(0, 1)], [])
    marker = bpy.data.objects.new('normalized_blade_axis_plus_z', mesh)
    bpy.context.collection.objects.link(marker)
    material = bpy.data.materials.new('cyan_plus_z_axis')
    material.diffuse_color = (0.0, 0.9, 1.0, 1.0)
    mesh.materials.append(material)


def render_view(out_dir: Path) -> dict:
    path = out_dir / 'model-viewer-orbit.png'
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return {'id': 'model-viewer-orbit', 'label': 'model-viewer constrained orbit', 'path': str(path.relative_to(out_dir.parent)), 'sha256': sha256(path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--out-dir', default=str(OUT_ROOT / 'latest'))
    parser.add_argument('--width', type=int, default=None)
    parser.add_argument('--height', type=int, default=None)
    parser.add_argument('--samples', type=int, default=16)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = parser.parse_args(argv)
    contract = load_json(CONSTRAINTS)
    calibration = load_json(project_path(contract['assets']['calibration']))
    validate_contract(contract, calibration)
    width, height = contract['camera']['viewport']
    if args.width is not None and args.width != width:
        fail(f'--width {args.width} diverges from model-viewer viewport width {width}')
    if args.height is not None and args.height != height:
        fail(f'--height {args.height} diverges from model-viewer viewport height {height}')
    out_dir = Path(args.out_dir)
    if not out_dir.is_absolute():
        out_dir = ROOT / out_dir
    render_dir = out_dir / 'renders'
    render_dir.mkdir(parents=True, exist_ok=True)
    clear_scene()
    character_path = project_path(contract['assets']['character'])
    sword_path = project_path(contract['assets']['sword'])
    character_objects = import_glb(character_path)
    normalize_character(character_objects, contract)
    sword_objects = import_glb(sword_path)
    apply_crimson_sword_review_material(sword_objects)
    socket_world = attach_sword_to_contract(character_objects, sword_objects, contract)
    socket_origin = socket_world @ Vector((0, 0, 0))
    add_axis_marker(socket_origin, 0.75)
    setup_scene(contract, args.samples)
    image = render_view(render_dir)
    manifest = {
        'schema': SCHEMA,
        'status': 'diagnostic-not-hosted-acceptance',
        'classification': 'diagnostic',
        'generatedAt': utc_now(),
        'contract': {
            'path': str(CONSTRAINTS.relative_to(ROOT)),
            'sha256': sha256(CONSTRAINTS),
            'contract_hash': contract_hash(contract),
            'schema': contract.get('schema'),
        },
        'assets': {
            'character': {'path': str(character_path.relative_to(ROOT)), 'sha256': sha256(character_path)},
            'sword': {'path': str(sword_path.relative_to(ROOT)), 'sha256': sha256(sword_path)},
            'calibration': {'path': contract['assets']['calibration'], 'sha256': sha256(project_path(contract['assets']['calibration']))},
        },
        'modelViewerConstraints': {
            'hierarchy': contract.get('hierarchy'),
            'saberGripLocal': contract.get('saberGripLocal'),
            'swordLocal': contract.get('swordLocal'),
            'bladeLocalAxis': contract.get('bladeLocalAxis'),
            'camera': contract.get('camera'),
            'normalization': contract.get('normalization'),
        },
        'socketWorldOrigin': [round(socket_origin.x, 6), round(socket_origin.y, 6), round(socket_origin.z, 6)],
        'images': [image],
        'note': 'Local Blender render is constrained to the browser model-viewer contract. It is diagnostic eyesight only and cannot satisfy hosted visual acceptance.',
    }
    (out_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'ok': True, 'manifest': str(out_dir / 'manifest.json'), 'contract_hash': manifest['contract']['contract_hash'], 'images': [image['path']]}, indent=2))


if __name__ == '__main__':
    main()
