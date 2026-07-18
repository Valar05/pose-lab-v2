import bpy, json, os
blend = '/storage/emulated/0/Download/Vanguard.blend'
out = '/storage/emulated/0/Documents/GodotProjects/pose-lab-v2/generated/vanguard-inspect/inventory.json'
bpy.ops.wm.open_mainfile(filepath=blend)
data = {
  'source': blend,
  'objects': [{
    'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None,
    'data': o.data.name if getattr(o, 'data', None) else None
  } for o in bpy.data.objects],
  'armatures': [{
    'name': a.name,
    'bones': [b.name for b in a.data.bones],
    'poseBones': [b.name for b in a.pose.bones]
  } for a in bpy.data.objects if a.type == 'ARMATURE'],
  'actions': [{
    'name': action.name,
    'frame_range': [float(action.frame_range[0]), float(action.frame_range[1])],
    'fcurves': len(action.fcurves),
    'groups': [g.name for g in action.groups]
  } for action in bpy.data.actions],
  'materials': [{
    'name': m.name,
    'use_nodes': bool(m.use_nodes)
  } for m in bpy.data.materials],
  'images': [{
    'name': img.name,
    'filepath': img.filepath,
    'packed': bool(img.packed_file),
    'size': list(img.size)
  } for img in bpy.data.images],
  'scenes': [{
    'name': s.name,
    'frame_start': int(s.frame_start),
    'frame_end': int(s.frame_end),
    'fps': int(s.render.fps)
  } for s in bpy.data.scenes]
}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
print(json.dumps({'ok': True, 'out': out, 'objects': len(data['objects']), 'armatures': len(data['armatures']), 'actions': len(data['actions'])}, indent=2))
