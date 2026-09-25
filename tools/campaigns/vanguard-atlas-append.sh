#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
ATLAS="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
DL="/storage/emulated/0/Download"
INBOX="$ROOT/.atlas-inbox"
OUT="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json"
cd "$ROOT"
echo "=== APPEND-ONLY VANGUARD ATLAS ==="
[[ -f "$ATLAS" ]] || { echo "STOP: canonical atlas missing"; exit 2; }
rm -rf "$INBOX"
mkdir -p "$INBOX"
mapfile -t PICK < <(find "$DL" -maxdepth 1 -type f -iname '*.png' -printf '%T@ %p\n' | sort -nr | head -2 | cut -d' ' -f2-)
[[ "${#PICK[@]}" -eq 2 ]] || { echo "STOP: expected two PNGs in Downloads"; exit 3; }
cp -- "${PICK[0]}" "$INBOX/superman-01.png"
cp -- "${PICK[1]}" "$INBOX/superman-02.png"
printf 'source_1=%s\nsource_2=%s\n' "${PICK[0]}" "${PICK[1]}"
echo "=== SEGMENT INDIVIDUAL POSES FROM SOURCE SHEETS ==="
python3 - "$INBOX/superman-01.png" "$INBOX/superman-02.png" "$INBOX" <<'PYSEG'
from PIL import Image
from pathlib import Path
import sys
out=Path(sys.argv[3])
for si,fn in enumerate(sys.argv[1:3],1):
 im=Image.open(fn).convert("RGB")
 # black-background source sheets: foreground is any materially non-black pixel.
 px=im.load(); w,h=im.size
 mask=[[False]*w for _ in range(h)]
 for y in range(h):
  for x in range(w):
   r,g,b=px[x,y]
   mask[y][x]=max(r,g,b)>=28
 # column occupancy separates the large authored figures without guessing fixed dimensions.
 occ=[sum(mask[y][x] for y in range(h)) for x in range(w)]
 runs=[]; start=None
 for x,n in enumerate(occ+[0]):
  if n>3 and start is None: start=x
  if n<=3 and start is not None:
   if x-start>=max(20,w//12): runs.append((start,x))
   start=None
 if len(runs)<2: raise SystemExit(f"STOP: source {fn} yielded {len(runs)} pose regions, expected >=2")
 # keep the two widest meaningful regions, then restore reading order
 runs=sorted(sorted(runs,key=lambda q:q[1]-q[0],reverse=True)[:2])
 for pi,(x0,x1) in enumerate(runs,1):
  ys=[y for y in range(h) if any(mask[y][x] for x in range(x0,x1))]
  if not ys: raise SystemExit("STOP: empty segmented pose")
  y0=max(0,min(ys)-8); y1=min(h,max(ys)+9); x0=max(0,x0-8); x1=min(w,x1+8)
  crop=im.crop((x0,y0,x1,y1))
  crop.save(out/f"pose-{si:02d}-{pi:02d}.png")
  print(f"segmented=source{si}/pose{pi} rect={x0},{y0},{x1-x0},{y1-y0}")
PYSEG
mapfile -t SRC < <(find "$INBOX" -maxdepth 1 -type f -name 'pose-*.png' | sort)
[[ "${#SRC[@]}" -eq 4 ]] || { echo "STOP: expected four individual pose crops, got ${#SRC[@]}"; exit 4; }
python3 - "$ATLAS" "$OUT" "$MANIFEST" "${SRC[@]}" <<'PY'
from PIL import Image,ImageFilter,ImageEnhance
from pathlib import Path
import hashlib,json,math,sys
atlas_p,out_p,manifest_p=map(Path,sys.argv[1:4]); src=[Path(x) for x in sys.argv[4:]]
base=Image.open(atlas_p).convert("RGBA"); W,H=base.size
if (W,H)!=(1037,1536): raise SystemExit(f"STOP: canonical dimensions changed: {W}x{H}")
cols=6; start=91; cw=W/cols; ch=H/15; rows=math.ceil(len(src)/cols); newH=round(H+rows*ch)
out=Image.new("RGBA",(W,newH),(0,0,0,255)); out.paste(base,(0,0)); entries=[]
for i,p in enumerate(src):
 im=Image.open(p).convert("RGBA")
 # Correct established treatment: shrink first to ~96px body-density convention, then soften/red-shift.
 target_h=96
 shared_scale=target_h/max(1,im.height)
 im=im.resize((max(1,round(im.width*shared_scale)),target_h),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(0.55))
 r,g,b,a=im.split(); r=ImageEnhance.Brightness(r).enhance(1.10); g=ImageEnhance.Brightness(g).enhance(.92); b=ImageEnhance.Brightness(b).enhance(.88); im=Image.merge("RGBA",(r,g,b,a)); cell=start+i; row=i//cols; col=i%cols; x0=round(col*cw); x1=round((col+1)*cw); y0=H+round(row*ch); y1=H+round((row+1)*ch); boxw,boxh=x1-x0,y1-y0; bb=im.getbbox()
 if not bb: raise SystemExit(f"STOP: empty source {p}")
 im=im.crop(bb); # Never independently normalize each frame. Preserve prepared scale; grow cell/atlas instead.
 if im.width>boxw*.92 or im.height>boxh*.92: raise SystemExit(f"STOP: prepared pose {p} exceeds append cell; grow atlas/cell, do not shrink")
 x=x0+(boxw-im.width)//2; y=y1-im.height-round(boxh*.06); out.alpha_composite(im,(x,y)); entries.append({"cell":cell,"source":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"rect":[x0,y0,boxw,boxh]})
if out.crop((0,0,W,H)).tobytes()!=base.tobytes(): raise SystemExit("STOP: old atlas pixels changed")
out.save(out_p); manifest={"schema":"vanguard-atlas-append-v1","base":"vanguard-pose-atlas-90.png","baseSize":[W,H],"columns":cols,"startCell":start,"entries":entries}; manifest_p.write_text(json.dumps(manifest,indent=2)+"\n"); print("old_region=PIXEL_IDENTICAL"); print(f"new_cells={start}-{start+len(src)-1}"); print(f"output={out_p}"); print(f"manifest={manifest_p}")
PY
echo "=== REVIEW ONLY; NO AUTOMATIC REPLACEMENT ==="
echo "Canonical cells 1-90 were not overwritten."
echo "Review $OUT before promotion."
