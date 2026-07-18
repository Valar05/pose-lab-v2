import bpy, json, os
SOURCE = '/storage/emulated/0/Download/Vanguard.blend'
OUT = '/storage/emulated/0/Documents/GodotProjects/pose-lab-v2/public/assets/vanguard/vanguard_rigged_animations.glb'
MANIFEST = '/storage/emulated/0/Documents/GodotProjects/pose-lab-v2/generated/vanguard-inspect/export-manifest.json'
bpy.ops.wm.open_mainfile(filepath=SOURCE)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
for obj in bpy.data.objects:
    obj.select_set(False)
exported = []
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE' and obj.name == 'rig':
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        exported.append(obj.name)
    elif obj.type == 'MESH' and not obj.name.startswith('WGT-'):
        obj.select_set(True)
        exported.append(obj.name)
# Keep all actions available to the exporter.
for action in bpy.data.actions:
    action.use_fake_user = True
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_nla_strips=False,
    export_extra_animations=True,
    export_frame_range=False,
    export_yup=True,
    export_apply=False,
    export_skins=True,
    export_morph=False
)
manifest = {
    'schema': 'pose-lab-v2-vanguard-export-v1',
    'source': SOURCE,
    'output': OUT,
    'selectedObjects': exported,
    'actions': [{'name': a.name, 'frameRange': [float(a.frame_range[0]), float(a.frame_range[1])], 'fcurves': len(a.fcurves)} for a in bpy.data.actions],
    'images': [{'name': img.name, 'filepath': img.filepath, 'packed': bool(img.packed_file), 'size': list(img.size)} for img in bpy.data.images],
}
with open(MANIFEST, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)
print(json.dumps({'ok': True, 'out': OUT, 'bytes': os.path.getsize(OUT), 'objects': exported, 'actions': len(manifest['actions'])}, indent=2))
