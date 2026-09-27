import argparse
import sys
from pathlib import Path
import bpy

if "--" not in sys.argv:
    raise SystemExit("STOP: Blender tool args missing -- separator")
argv = sys.argv[sys.argv.index("--") + 1:]

parser = argparse.ArgumentParser()
parser.add_argument("--blend", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args(argv)

blend = Path(args.blend)
output = Path(args.output)

if not blend.is_absolute():
    raise SystemExit(f"STOP: expected absolute --blend path, got {blend}")
if not output.is_absolute():
    raise SystemExit(f"STOP: expected absolute --output path, got {output}")
if not blend.is_file():
    raise SystemExit(f"STOP: blend file not visible to Blender: {blend}")

output.parent.mkdir(parents=True, exist_ok=True)

print(f"OPEN_BLEND={blend}")
bpy.ops.wm.open_mainfile(filepath=str(blend))

print("OBJECTS=" + ",".join(o.name for o in bpy.context.scene.objects))
print("ACTIONS=" + ",".join(a.name for a in bpy.data.actions))

bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_morph=True,
)

print(f"WROTE_GLB={output}")
