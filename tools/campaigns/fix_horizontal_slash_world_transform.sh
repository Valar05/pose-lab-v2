#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FILE="$ROOT/src/procedural-motion-preview.js"

if [[ ! -f "$FILE" ]]; then
  echo "STOP: missing $FILE"
  exit 1
fi

python3 - "$FILE" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

def replace_function(src, name, next_name, new_body):
    a = src.index(f"function {name}(")
    b = src.index(f"function {next_name}(", a)
    return src[:a] + new_body + "\n\n" + src[b:]

new_transformed = r'''function transformedSlash(image,spec){
  // Do NOT pre-transform or trim the slash.
  // Rotation / shear / flip / scale must happen in world draw space
  // or the pivot walks and the result clips.
  return image;
}'''

new_draw = r'''function drawSlash(e,layerName='front'){
  if(!e || !slashMap) return;

  const spec = recipe.effect || {};
  const img = slashMap;

  const reveal = clamp(e.reveal);
  const split = Math.max(.10, Math.min(.90, Number(spec.depthSplit ?? .54)));
  const pivot = spec.revealPivot || [.18, .78];
  const startDeg = Number(spec.revealStartDeg ?? -12);
  const spanDeg = Number(spec.revealSpanDeg ?? 150);
  const backIsLeft = (spec.backSide || 'left') === 'left';

  const pos = spec.position || [0,0];
  const x = Number(pos[0] ?? 0);
  const y = Number(pos[1] ?? 0);

  const px = img.width  * Number(pivot[0] ?? .18);
  const py = img.height * Number(pivot[1] ?? .78);

  const rot = Number(spec.rotationDeg || 0) * Math.PI / 180;
  const sx  = (spec.flipX ? -1 : 1) * Number(spec.stretchX ?? 1);
  const sy  = (spec.flipY ? -1 : 1) * Number(spec.pitchScaleY ?? 1);
  const shx = Number(spec.yawShearX ?? 0);

  const cx = stageOffsetX() + x + px;
  const cy = y + py;

  function tintPass(color){
    if(!color) return img;
    const tint = document.createElement('canvas');
    tint.width = img.width;
    tint.height = img.height;
    const tc = tint.getContext('2d');
    tc.drawImage(img,0,0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    tc.fillRect(0,0,tint.width,tint.height);
    return tint;
  }

  function clipHalf(c){
    const front = layerName !== 'back';
    const drawLeftHalf = front ? !backIsLeft : backIsLeft;
    const pad = Math.max(img.width, img.height);

    c.beginPath();
    if(drawLeftHalf){
      c.rect(
        -px - pad,
        -py - pad,
        img.width * split + pad * 2,
        img.height + pad * 2
      );
    }else{
      c.rect(
        -px + img.width * split - pad,
        -py - pad,
        img.width * (1 - split) + pad * 2,
        img.height + pad * 2
      );
    }
    c.clip();
  }

  const passes = [
    { a: e.wideGlow  * (spec.wideOpacity  ?? .34), b: spec.wideBlurPx  ?? 10, color: spec.wideGlowRgb  || [255,110,30] },
    { a: e.tightGlow * (spec.tightOpacity ?? .62), b: spec.tightBlurPx ??  3, color: spec.tightGlowRgb || [255,165,90] },
    { a: e.core, b: 0, color: null }
  ];

  ctx.save();

  // Transform in world space around a stable pivot.
  ctx.translate(cx, cy);
  if(rot) ctx.rotate(rot);
  ctx.transform(1, 0, shx, 1, 0, 0);
  ctx.scale(sx, sy);

  // Real radial reveal, in local slash space.
  const radius = Math.max(img.width, img.height) * 2.5;
  const start = startDeg * Math.PI / 180;
  const end   = (startDeg + spanDeg * reveal) * Math.PI / 180;

  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.arc(0,0,radius,start,end,false);
  ctx.closePath();
  ctx.clip();

  // Then split into back/front halves.
  clipHalf(ctx);

  for(const p of passes){
    if(p.a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.filter = p.b ? `blur(${p.b}px)` : 'none';
    ctx.drawImage(tintPass(p.color), -px, -py);
    ctx.restore();
  }

  ctx.restore();
}'''

s = replace_function(s, "transformedSlash", "drawSlash", new_transformed)
s = replace_function(s, "drawSlash", "render", new_draw)

p.write_text(s)
print(f"PATCHED {p}")
PY

echo
echo "=== REBUILD ==="
cd "$ROOT"
node scripts/build.mjs

echo
echo "PATCH_OK"
echo "Now run your normal refresh script again."
