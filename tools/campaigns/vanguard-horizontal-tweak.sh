#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2

RECIPE="public/assets/vanguard/procedural/horizontal-strike.recipe.json"
VIEWER="src/procedural-motion-preview.js"

python3 - <<'PY'
import json
from pathlib import Path

recipe_path = Path("public/assets/vanguard/procedural/horizontal-strike.recipe.json")
data = json.loads(recipe_path.read_text())

effect = data.setdefault("effect", {})

# Treat one body length as slash-width * 0.5 in practice for this effect pass.
# Baseline from prior reset:
#   width = 168
#   position = [130, 122]
# So:
#   left 1 body length  ~= 42 px
#   up 1/4 body length  ~= 10 px
effect["rotationDeg"] = -30
effect["rotateZDeg"] = -30
effect["flipY"] = True
effect["flipX"] = False
effect["scaleX"] = 1
effect["scaleY"] = 1
effect["globalScaleX"] = 1
effect["planeScale"] = 1
effect["yawShearX"] = 0
effect["pitchScaleY"] = 1
effect["projectionMode"] = "none"

base_x, base_y = effect.get("position", [130, 122])
effect["position"] = [base_x - 42, base_y - 10]

recipe_path.write_text(json.dumps(data, indent=2) + "\n")
print(f"UPDATED {recipe_path}")
PY

python3 - <<'PY'
from pathlib import Path
p = Path("src/procedural-motion-preview.js")
s = p.read_text()

start = s.find("function transformedSlash(")
if start < 0:
    raise SystemExit("STOP: transformedSlash() not found")

next_fn = s.find("\nfunction drawSlash(", start)
if next_fn < 0:
    raise SystemExit("STOP: drawSlash() not found after transformedSlash()")

replacement = r'''function transformedSlash(image,spec){
  const rotDeg =
    Number(spec.rotationDeg ?? spec.rotateZDeg ?? 0);
  const rot = rotDeg * Math.PI / 180;

  const flipX = !!spec.flipX;
  const flipY = !!spec.flipY;
  const sx = Number(spec.scaleX ?? 1) * (flipX ? -1 : 1);
  const sy = Number(spec.scaleY ?? 1) * (flipY ? -1 : 1);

  const w = image.width;
  const h = image.height;
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const outW = Math.ceil(w * c + h * s);
  const outH = Math.ceil(w * s + h * c);

  const out = document.createElement('canvas');
  out.width = Math.max(1, outW);
  out.height = Math.max(1, outH);
  const oc = out.getContext('2d');

  oc.translate(out.width / 2, out.height / 2);
  oc.rotate(rot);
  oc.scale(sx, sy);
  oc.drawImage(image, -w / 2, -h / 2);

  return out;
}'''

s = s[:start] + replacement + s[next_fn:]
p.write_text(s)
print(f"UPDATED {p}")
PY

chmod +x tools/campaigns/vanguard-horizontal-tweak.sh

echo
echo "DONE"
echo "Run:"
echo "  bash tools/campaigns/vanguard-horizontal-tweak.sh"
echo "then your normal refresh script"
