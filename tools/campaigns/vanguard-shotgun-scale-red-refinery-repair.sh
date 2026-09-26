#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
ATLAS="$P/$ATLAS_REL"

RELOAD="/storage/emulated/0/Download/vanguard-shotgun-reload-source-original.jpg"
FIRE="/storage/emulated/0/Download/file_00000000be1481f5a3f60d247fb48856 (1).png"
CAL="/storage/emulated/0/Download/vanguard-pose-atlas-reload-calibrated-15pct-smaller.png"

RH="b9f877a233d080792da17c32a4072ddce564d8dd795cbb4368aaeb7f4bdbdc5b"
FH="7b9dfc774870b8fbbdcc4d821a03c2fa9e820d4caec05b8220f668ad00bae9b6"
CH="005c0b0f199a72f93735f9072b8b34ba313bf600294c03a21ea81d266e2fe015"

cd "$P"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null

echo "MISSION=repair rejected shotgun append sprites from the two real authored 3-frame sheets"
echo "SOURCE_AUTHORITY=reload original + fire original"
echo "SCALE_AUTHORITY=previous reload calibration, then explicit 15% shorter"
echo "COLOR=GUESS_V2 mild candidate, still human-review quarantined"
echo "WRITABLE=$ATLAS_REL pixels in rows 15-16 only (y=1536..1728)"
echo "LOCKED=cells 1-90; everything below y=1728; recipes; timing; effects; renderer; registration"

git status --short
git diff --quiet HEAD -- "$ATLAS_REL" || {
  echo "STOP: DIRTY_TARGET $ATLAS_REL"
  exit 1
}

git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START="$(git rev-parse HEAD)"
echo "START_HEAD=$START"

for spec in "$RELOAD:$RH" "$FIRE:$FH" "$CAL:$CH"; do
  f="${spec%:*}"
  h="${spec##*:}"
  test -f "$f" || { echo "STOP: missing source $f"; exit 1; }
  got="$(sha256sum "$f" | awk '{print $1}')"
  [ "$got" = "$h" ] || { echo "STOP: source hash mismatch $f"; echo "got=$got"; echo "want=$h"; exit 1; }
done

mkdir -p "$L/shotgun-red-repair"
cp "$ATLAS" "$L/shotgun-red-repair/before.png"

python3 - "$ATLAS" "$RELOAD" "$FIRE" "$CAL" <<'PY'
from PIL import Image, ImageEnhance
from pathlib import Path
import numpy as np
import sys

atlas_p,reload_p,fire_p,cal_p=map(Path,sys.argv[1:])
atlas=Image.open(atlas_p).convert("RGB")
before=atlas.copy()

assert atlas.width==1037
assert atlas.height>=1728
assert Image.open(reload_p).size==(1536,512), "STOP: reload source is not the authored 3x horizontal sheet"
assert Image.open(fire_p).size==(1536,512), "STOP: fire source is not the authored 3x horizontal sheet"
assert Image.open(cal_p).size==(1037,1632), "STOP: calibration atlas geometry changed"

def component_bbox(im, threshold=18):
    ar=np.asarray(im.convert("RGB"))
    mask=ar.max(axis=2)>threshold
    H,W=mask.shape
    seen=np.zeros((H,W),dtype=np.uint8)
    best=None
    best_n=0
    for y in range(H):
        for x in range(W):
            if not mask[y,x] or seen[y,x]:
                continue
            stack=[(x,y)]
            seen[y,x]=1
            xs=[]; ys=[]
            while stack:
                xx,yy=stack.pop()
                xs.append(xx); ys.append(yy)
                for nx,ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)):
                    if 0<=nx<W and 0<=ny<H and mask[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=1
                        stack.append((nx,ny))
            if len(xs)>best_n:
                best_n=len(xs)
                best=(min(xs),min(ys),max(xs)+1,max(ys)+1)
    assert best is not None
    return best

def atlas_cell(im, cell, y0, y1):
    col=(cell-1)%6
    x0=round(col*1037/6); x1=round((col+1)*1037/6)
    return im.crop((x0,y0,x1,y1))

# Scale authority: the named calibration sheet was the immediately preceding
# mechanical scale candidate. Drew then asked for 15% shorter.
cal=Image.open(cal_p).convert("RGB")
cal_heights=[]
for c in (91,92,93):
    b=component_bbox(atlas_cell(cal,c,1536,1632))
    cal_heights.append(b[3]-b[1])
cal_h=sorted(cal_heights)[1]
target_h=max(1,round(cal_h*0.85))
print("CALIBRATION_HEIGHTS=",cal_heights)
print("CALIBRATION_MEDIAN=",cal_h)
print("TARGET_HEIGHT_15PCT_SHORTER=",target_h)

def three_frames(path):
    im=Image.open(path).convert("RGB")
    assert im.size==(1536,512)
    return [im.crop((i*512,0,(i+1)*512,512)) for i in range(3)]

reload_frames=three_frames(reload_p)
fire_frames=three_frames(fire_p)

# Derive ONE scale from the reload authored sheet, then apply that exact scale
# to all six frames. Both source sheets are 1536x512 and were authored at the
# same source scale.
raw_boxes=[component_bbox(f) for f in reload_frames]
raw_heights=[b[3]-b[1] for b in raw_boxes]
raw_med=sorted(raw_heights)[1]
scale=target_h/raw_med
print("RAW_RELOAD_HEIGHTS=",raw_heights)
print("SHARED_ALL_SIX_SCALE=",f"{scale:.8f}")

def mild_red(im):
    r,g,b=im.split()
    r=r.point(lambda v:min(255,round(v*1.02)))
    g=g.point(lambda v:min(255,round(v*0.97)))
    b=b.point(lambda v:min(255,round(v*0.95)))
    im=Image.merge("RGB",(r,g,b))
    im=ImageEnhance.Contrast(im).enhance(1.05)
    im=ImageEnhance.Color(im).enhance(1.03)
    im=ImageEnhance.Brightness(im).enhance(0.98)
    return im

prepared=[]
for label,frames in (("reload",reload_frames),("fire",fire_frames)):
    for i,frame in enumerate(frames,1):
        box=component_bbox(frame)
        subject=frame.crop(box)
        subject=mild_red(subject)
        nw=max(1,round(subject.width*scale))
        nh=max(1,round(subject.height*scale))
        subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)
        prepared.append((label,i,subject))
        print(f"PREP {label}{i}: {subject.width}x{subject.height}")

# Only the two rejected 96px append rows are rewritten.
# Preserve all accepted history above and all trailing campaign archaeology below.
out=atlas.copy()
out.paste((0,0,0),(0,1536,1037,1728))

def dest_rect(cell):
    i=cell-1
    row=i//6
    col=i%6
    assert row in (15,16)
    x0=round(col*1037/6); x1=round((col+1)*1037/6)
    y0=1536+(row-15)*96
    y1=y0+96
    return x0,y0,x1,y1

for cell,(_,_,sprite) in zip((91,92,93,97,98,99),prepared):
    x0,y0,x1,y1=dest_rect(cell)
    sw,sh=x1-x0,y1-y0
    assert sprite.width<=sw, f"STOP: cell {cell} too wide {sprite.width}>{sw}"
    assert sprite.height<=sh-5, f"STOP: cell {cell} too tall {sprite.height}>{sh-5}"
    x=x0+(sw-sprite.width)//2
    y=y1-5-sprite.height
    out.paste(sprite,(x,y))

# Locked rectangles.
assert out.crop((0,0,1037,1536)).tobytes()==before.crop((0,0,1037,1536)).tobytes()
if out.height>1728:
    assert out.crop((0,1728,1037,out.height)).tobytes()==before.crop((0,1728,1037,before.height)).tobytes()

for c in (94,95,96,100,101,102):
    r=dest_rect(c)
    assert max(ch[1] for ch in out.crop(r).getextrema())==0, f"STOP: reserved cell {c} not black"

out.save(atlas_p)
print("ATLAS_SIZE=",out.size)
print("ROWS_15_16=REPAIRED")
print("TRAILING_Y_GE_1728=PRESERVED")
PY

BAD="$(git diff --name-only | grep -v "^$ATLAS_REL$" || true)"
[ -z "$BAD" ] || { echo "STOP: UNEXPECTED_DIFF"; echo "$BAD"; exit 1; }

node --check src/procedural-motion-preview.js

git add "$ATLAS_REL"
git commit -m "Repair shotgun append sprites from correct authored sources"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

git show "$REV:$ATLAS_REL" > "$L/shotgun-red-repair/committed.png"
cmp -s "$ATLAS" "$L/shotgun-red-repair/committed.png" || { echo "STOP: committed atlas readback mismatch"; exit 1; }

git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check src/procedural-motion-preview.js
npm run build

[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!
echo "$PID" > "$L/server.pid"
sleep 2
kill -0 "$PID" || { echo "STOP: review server died"; cat "$L/server.log"; exit 1; }

STAMP="$(date +%s)"
RU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$RU"
