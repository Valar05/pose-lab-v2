#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
ATLAS="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
DL="/storage/emulated/0/Download"
WORK="$ROOT/.atlas-campaign"
OUT="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json"
REVIEW="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded-review.png"
cd "$ROOT"
echo "=== APPEND-ONLY VANGUARD ATLAS CAMPAIGN ==="
[[ -f "$ATLAS" ]] || { echo "STOP: canonical atlas missing"; exit 2; }
rm -rf "$WORK"; mkdir -p "$WORK"
mapfile -t PICK < <(find "$DL" -maxdepth 1 -type f -iname '*.png' -printf '%T@ %p\n' | sort -nr | head -2 | cut -d' ' -f2-)
[[ "${#PICK[@]}" -eq 2 ]] || { echo "STOP: expected the two identified PNG source sheets"; exit 3; }
cp -- "${PICK[0]}" "$WORK/source-1.png"; cp -- "${PICK[1]}" "$WORK/source-2.png"
printf 'source_1=%s\nsource_2=%s\n' "${PICK[0]}" "${PICK[1]}"
python3 - "$ATLAS" "$OUT" "$MANIFEST" "$REVIEW" "$WORK/source-1.png" "$WORK/source-2.png" <<'PY'
from PIL import Image,ImageFilter,ImageEnhance,ImageDraw
from pathlib import Path
import hashlib,json,math,sys
atlas_p,out_p,manifest_p,review_p,s1,s2=map(Path,sys.argv[1:7])
base=Image.open(atlas_p).convert("RGBA"); W,H=base.size
if (W,H)!=(1037,1536): raise SystemExit(f"STOP: canonical dimensions {W}x{H}, expected 1037x1536")
# Human-verified authored sheet geometry from this campaign: source1=3 horizontal frames, source2=2.
spec=[(s1,3),(s2,2)]
raw=[]
for si,(p,n) in enumerate(spec,1):
 im=Image.open(p).convert("RGBA"); w,h=im.size
 for i in range(n):
  xa=round(i*w/n); xb=round((i+1)*w/n)
  # preserve the entire authored partition, then trim only black border inside it
  crop=im.crop((xa,0,xb,h))
  rgb=crop.convert("RGB"); pts=[]
  for y in range(crop.height):
   for x in range(crop.width):
    if max(rgb.getpixel((x,y)))>=24: pts.append((x,y))
  if not pts: raise SystemExit(f"STOP: empty source{si}/frame{i+1}")
  xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; pad=8
  box=(max(0,min(xs)-pad),max(0,min(ys)-pad),min(crop.width,max(xs)+pad+1),min(crop.height,max(ys)+pad+1))
  raw.append((f"source{si}-frame{i+1}",crop.crop(box)))
print("source_1_pose_count=3"); print("source_2_pose_count=2")
# ONE shared scale across the complete batch, based on tallest authored crop, preserving relative scale.
target_h=96
scale=target_h/max(im.height for _,im in raw)
prepared=[]
for name,im in raw:
 nw=max(1,round(im.width*scale)); nh=max(1,round(im.height*scale))
 im=im.resize((nw,nh),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.55))
 r,g,b,a=im.split(); r=ImageEnhance.Brightness(r).enhance(1.10); g=ImageEnhance.Brightness(g).enhance(.92); b=ImageEnhance.Brightness(b).enhance(.88)
 prepared.append((name,Image.merge("RGBA",(r,g,b,a))))
cols=6; start=91; cw=W/cols
row_h=max(round(H/15),max(im.height+20 for _,im in prepared))
rows=math.ceil(len(prepared)/cols); newH=H+rows*row_h
out=Image.new("RGBA",(W,newH),(0,0,0,255)); out.paste(base,(0,0)); entries=[]
for i,(name,im) in enumerate(prepared):
 row=i//cols; col=i%cols; x0=round(col*cw); x1=round((col+1)*cw); y0=H+row*row_h; y1=y0+row_h
 if im.width>x1-x0-8 or im.height>row_h-8: raise SystemExit(f"STOP: {name} exceeds append cell; atlas geometry must grow")
 x=x0+((x1-x0)-im.width)//2; y=y1-im.height-6
 out.alpha_composite(im,(x,y))
 entries.append({"cell":start+i,"name":name,"sourceSha256":hashlib.sha256((s1 if i<3 else s2).read_bytes()).hexdigest(),"cellRect":[x0,y0,x1-x0,row_h],"spriteSize":[im.width,im.height]})
if out.crop((0,0,W,H)).tobytes()!=base.tobytes(): raise SystemExit("STOP: old atlas pixels changed")
out.save(out_p)
manifest={"schema":"vanguard-atlas-append-v2","base":"vanguard-pose-atlas-90.png","baseSize":[W,H],"columns":6,"startCell":91,"sharedScale":scale,"entries":entries}
manifest_p.write_text(json.dumps(manifest,indent=2)+"\n")
# Visible review strip, enlarged 3x, numbered.
thumb_w=220; thumb_h=170
rev=Image.new("RGB",(thumb_w*len(prepared),thumb_h),(0,0,0)); d=ImageDraw.Draw(rev)
for i,(name,im) in enumerate(prepared):
 scale2=min((thumb_w-20)/im.width,(thumb_h-35)/im.height); q=im.resize((round(im.width*scale2),round(im.height*scale2)),Image.Resampling.NEAREST)
 x=i*thumb_w+(thumb_w-q.width)//2; y=25+(thumb_h-25-q.height)//2; rev.paste(q.convert("RGB"),(x,y)); d.text((i*thumb_w+6,5),f"{91+i} {name}",fill=(255,255,255))
rev.save(review_p)
print("old_region=PIXEL_IDENTICAL"); print("new_cells=91-95"); print(f"shared_scale={scale:.6f}"); print(f"review={review_p}")
PY
echo "=== OPEN VISIBLE REVIEW ==="
termux-open "$REVIEW" 2>/dev/null || termux-open "$OUT" 2>/dev/null || true
echo "VANGUARD_ATLAS_PREPARED_FOR_REVIEW"
echo "No canonical atlas overwrite. No commit/push until visible review is accepted."
