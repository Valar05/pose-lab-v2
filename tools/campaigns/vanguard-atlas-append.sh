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
 im=Image.open(fn).convert("RGB"); w,h=im.size; gray=im.convert("L")
 occ=[sum(1 for y in range(h) if gray.getpixel((x,y))>=24) for x in range(w)]
 # Discover every sustained low-occupancy valley. No assumed pose count.
 low=max(2,round(h*.012)); min_gap=max(8,round(w*.012)); min_pose=max(40,round(w*.12))
 valleys=[]; st=None
 for x,n in enumerate(occ+[h]):
  if n<=low and st is None: st=x
  elif n>low and st is not None:
   if x-st>=min_gap: valleys.append((st,x))
   st=None
 cuts=[0]
 for va,vb in valleys:
  c=(va+vb)//2
  if c-cuts[-1]>=min_pose and w-c>=min_pose: cuts.append(c)
 cuts.append(w)
 regions=[(cuts[i],cuts[i+1]) for i in range(len(cuts)-1) if cuts[i+1]-cuts[i]>=min_pose]
 if not regions: raise SystemExit(f"STOP: no pose regions discovered in {fn}")
 print(f"source_{si}_pose_count={len(regions)}")
 for pi,(xa,xb) in enumerate(regions,1):
  pts=[(x,y) for y in range(h) for x in range(xa,xb) if max(im.getpixel((x,y)))>=24]
  if not pts: continue
  xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; pad=max(6,round(min(w,h)*.008))
  x0=max(xa,min(xs)-pad); x1=min(xb,max(xs)+pad+1); y0=max(0,min(ys)-pad); y1=min(h,max(ys)+pad+1)
  im.crop((x0,y0,x1,y1)).save(out/f"pose-{si:02d}-{pi:02d}.png")
  print(f"segmented=source{si}/pose{pi} rect={x0},{y0},{x1-x0},{y1-y0}")
PYSEG
mapfile -t SRC < <(find "$INBOX" -maxdepth 1 -type f -name 'pose-*.png' | sort)
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
