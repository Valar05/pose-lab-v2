import bpy
import json
import math
import os

SOURCE = '/storage/emulated/0/Download/Vanguard.blend'
OUT = '/storage/emulated/0/Documents/GodotProjects/pose-lab-v2/public/assets/vanguard/vanguard_root_motion.json'
ROOT_BONE = 'root'
FPS = 60

bpy.ops.wm.open_mainfile(filepath=SOURCE)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

def curve_map(action, data_path_prefix):
    curves = {}
    for fc in action.fcurves:
        if fc.data_path == data_path_prefix:
            curves[fc.array_index] = fc
    return curves

def evaluate(curves, index, frame, default):
    curve = curves.get(index)
    return float(curve.evaluate(frame)) if curve else default

def fixed(value, places=6):
    if abs(value) < 10 ** (-(places + 1)):
        value = 0.0
    return round(float(value), places)

def fixed_vec(values, places=6):
    return [fixed(v, places) for v in values]

actions = []
for action in bpy.data.actions:
    start = int(math.floor(action.frame_range[0]))
    end = int(math.ceil(action.frame_range[1]))
    loc_curves = curve_map(action, f'pose.bones["{ROOT_BONE}"].location')
    quat_curves = curve_map(action, f'pose.bones["{ROOT_BONE}"].rotation_quaternion')
    euler_curves = curve_map(action, f'pose.bones["{ROOT_BONE}"].rotation_euler')
    samples = []
    first_loc = [evaluate(loc_curves, axis, start, 0.0) for axis in range(3)]
    first_quat = [
        evaluate(quat_curves, 0, start, 1.0),
        evaluate(quat_curves, 1, start, 0.0),
        evaluate(quat_curves, 2, start, 0.0),
        evaluate(quat_curves, 3, start, 0.0),
    ] if quat_curves else None
    for frame in range(start, end + 1):
        loc = [evaluate(loc_curves, axis, frame, first_loc[axis]) for axis in range(3)]
        sample = {
            'frame': frame,
            'time': fixed((frame - start) / FPS),
            'rootLocalPosition': fixed_vec(loc),
            'deltaFromStart': fixed_vec([loc[i] - first_loc[i] for i in range(3)]),
        }
        if quat_curves:
            quat = [
                evaluate(quat_curves, 0, frame, first_quat[0]),
                evaluate(quat_curves, 1, frame, first_quat[1]),
                evaluate(quat_curves, 2, frame, first_quat[2]),
                evaluate(quat_curves, 3, frame, first_quat[3]),
            ]
            sample['rootLocalQuaternion'] = fixed_vec(quat)
        elif euler_curves:
            euler = [evaluate(euler_curves, axis, frame, 0.0) for axis in range(3)]
            sample['rootLocalEulerRad'] = fixed_vec(euler)
        samples.append(sample)
    last_loc = samples[-1]['rootLocalPosition'] if samples else fixed_vec(first_loc)
    total = [last_loc[i] - fixed(first_loc[i]) for i in range(3)]
    has_motion = any(abs(v) > 0.0001 for v in total) or any(
        any(abs(v) > 0.0001 for v in sample['deltaFromStart']) for sample in samples
    )
    actions.append({
        'name': action.name,
        'frameStart': start,
        'frameEnd': end,
        'fps': FPS,
        'duration': fixed((end - start) / FPS),
        'rootBone': ROOT_BONE,
        'space': 'source Blender pose bone local space',
        'axisConvention': {
            'x': 'source local lateral',
            'y': 'source local forward/back root travel in this Vanguard rig',
            'z': 'source local vertical',
        },
        'applyInPoseLab': False,
        'hasRootMotion': has_motion,
        'startPosition': fixed_vec(first_loc),
        'endPosition': fixed_vec(last_loc),
        'totalDelta': fixed_vec(total),
        'samples': samples,
    })

payload = {
    'schema': 'pose-lab-v2-vanguard-root-motion-v1',
    'sourceBlend': SOURCE,
    'runtimeGlb': 'public/assets/vanguard/vanguard_rigged_animations.glb',
    'rootBone': ROOT_BONE,
    'fps': FPS,
    'applyInPoseLab': False,
    'notes': 'Root motion is extracted for game locomotion use and intentionally not applied by the Pose Lab V2 browser preview. The browser keeps Vanguard animation playback in-place by resetting the imported root bone after mixer updates.',
    'actions': actions,
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(payload, f, indent=2)
print(json.dumps({
    'ok': True,
    'out': OUT,
    'actions': len(actions),
    'withRootMotion': [a['name'] for a in actions if a['hasRootMotion']],
}, indent=2))
