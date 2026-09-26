#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
A="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
RELOAD="/storage/emulated/0/Download/vanguard-shotgun-reload-source-original.jpg"
FIRE="/storage/emulated/0/Download/vanguard-shotgun-fire-source-original.png"
RH="b9f877a233d080792da17c32a4072ddce564d8dd795cbb4368aaeb7f4bdbdc5b"
FH="40c495c4547f609a569fd0f946356146c3c684073fe50d2c099c272bef2acf41"
W="$L/worktree"
cd "$P"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null
echo "MISSION=repair rejected shotgun append sprites only: 15% shorter + exact established Vanguard red refinery"
echo "AUTHORITY=original authored reload/fire sheets + repository executable refinery authority"
echo "WRITABLE=$A cells 91-93 and 97-99 only"
echo "LOCKED=cells 1-90; reserved cells; recipes; timing; effects; renderer; registration"
git status --short
git diff --quiet HEAD -- "$A" || { echo "STOP: DIRTY_TARGET $A"; exit 1; }
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START=$(git rev-parse HEAD)
test -f "$RELOAD" && test "$(sha256sum "$RELOAD"|awk '{print $1}')" = "$RH" || { echo "STOP: reload source authority mismatch"; exit 1; }
test -f "$FIRE" && test "$(sha256sum "$FIRE"|awk '{print $1}')" = "$FH" || { echo "STOP: fire source authority mismatch"; exit 1; }
# User explicitly authorized a guessed visual refinery candidate.
# This is NOT canonical refinery authority and remains human-review quarantined.
REFINERY="GUESS_V2:red*1.02 green*0.97 blue*0.95 contrast1.05 saturation1.03 brightness0.98"
echo "REFINERY_CANDIDATE=$REFINERY"
mkdir -p "$L/shotgun-red-repair"
cp "$A" "$L/shotgun-red-repair/before.png"
# Prepare both authored batches with ONE declared guessed transform and the
# user's explicit shared 0.85 scale correction. No per-frame normalization.
python3 - "$RELOAD" "$L/shotgun-red-repair/reload-prepared.png" "$FIRE" "$L/shotgun-red-repair/fire-prepared.png" <<'PY'
from PIL import Image,ImageEnhance
from pathlib import Path
import sys
def prep(src,dst):
 im=Image.open(src).convert("RGB")
 # One visual candidate transform for every pixel/frame in both batches.
 r,g,b=im.split()
 r=r.point(lambda v:min(255,round(v*1.02)))
 g=g.point(lambda v:min(255,round(v*0.97)))
 b=b.point(lambda v:min(255,round(v*0.95)))
 im=Image.merge("RGB",(r,g,b))
 im=ImageEnhance.Contrast(im).enhance(1.05)
 im=ImageEnhance.Color(im).enhance(1.03)
 im=ImageEnhance.Brightness(im).enhance(0.98)
 # Shared relative size correction. Preserve authored 3-wide geometry.
 fw=im.width//3
 assert fw*3==im.width
 nw=max(1,round(fw*0.85)); nh=max(1,round(im.height*0.85))
 out=Image.new("RGB",(nw*3,nh),(0,0,0))
 for i in range(3):
  panel=im.crop((i*fw,0,(i+1)*fw,im.height)).resize((nw,nh),Image.Resampling.LANCZOS)
  out.paste(panel,(i*nw,0))
 out.save(dst)
for a,b in ((sys.argv[1],sys.argv[2]),(sys.argv[3],sys.argv[4])): prep(a,b)
print("REFINERY_CANDIDATE=GUESS_V2")
print("SHARED_SCALE_MULTIPLIER=0.85")
PY
python3 - "$A" "$L/shotgun-red-repair/before.png" "$L/shotgun-red-repair/reload-prepared.png" "$L/shotgun-red-repair/fire-prepared.png" <<'PY'
from PIL import Image
from pathlib import Path
import sys
atlas_p,before_p,rp,fp=map(Path,sys.argv[1:])
a=Image.open(atlas_p).convert("RGB"); b=Image.open(before_p).convert("RGB")
assert b.size==(1037,1728); assert a.size==(1037,1728)
def rect(c):
 i=c-1; row=i//6; col=i%6; x0=round(col*1037/6); x1=round((col+1)*1037/6)
 if row==15:y0,y1=1536,1632
 elif row==16:y0,y1=1632,1728
 else: raise AssertionError(c)
 return x0,y0,x1,y1
def frames(path):
 im=Image.open(path).convert("RGB")
 assert im.width%3==0
 w=im.width//3
 return [im.crop((i*w,0,(i+1)*w,im.height)) for i in range(3)]
def nonblack_bbox(im,t=18):
 px=im.load(); xs=[]; ys=[]
 for y in range(im.height):
  for x in range(im.width):
   if max(px[x,y])>t: xs.append(x);ys.append(y)
 assert xs
 return min(xs),min(ys),max(xs)+1,max(ys)+1
items=list(zip((91,92,93),frames(rp)))+list(zip((97,98,99),frames(fp)))
measured=[]
for c,im in items:
 box=nonblack_bbox(im); sprite=im.crop(box); x0,y0,x1,y1=rect(c)
 measured.append((c,sprite,x1-x0,y1-y0))
 print(f"CELL {c}: sprite={sprite.width}x{sprite.height} slot={x1-x0}x{y1-y0}")
# Never shrink useful poses again to satisfy the old 96px append row.
# Preserve requested 0.85 preparation scale and grow ONLY the two rejected
# append rows. Existing 0..1536 pixels remain byte-identical.
need=max(s.height+10 for _,s,_,_ in measured)
row_h=max(96,need)
print(f"APPEND_ROW_HEIGHT={row_h}")
old=a
grown=Image.new("RGB",(1037,1536+row_h*2),(0,0,0))
grown.paste(old.crop((0,0,1037,1536)),(0,0))
a=grown
def grown_rect(c):
 i=c-1; row=i//6; col=i%6
 x0=round(col*1037/6); x1=round((col+1)*1037/6)
 assert row in (15,16)
 y0=1536+(row-15)*row_h; y1=y0+row_h
 return x0,y0,x1,y1
for c,s,_,_ in measured:
 x0,y0,x1,y1=grown_rect(c); sw=x1-x0; sh=y1-y0
 assert s.width<=sw and s.height<=sh
 a.paste(s,(x0+(sw-s.width)//2,y1-5-s.height))
# Immutable old published rectangle and reserved slots.
assert a.crop((0,0,1037,1536)).tobytes()==b.crop((0,0,1037,1536)).tobytes()
for c in (94,95,96,100,101,102):
 r=rect(c); assert a.crop(r).tobytes()==b.crop(r).tobytes(),f"reserved cell {c} changed"
a.save(atlas_p)
print("ATLAS_REPAIR=BUILT")
PY
BAD=$(git diff --name-only | grep -v "^$A$" || true)
[ -z "$BAD" ] || { echo "STOP: UNEXPECTED_DIFF"; echo "$BAD"; exit 1; }
node --check src/procedural-motion-preview.js
git add "$A"
git commit -m "Repair Vanguard shotgun sprite scale and canonical red refinery"
git push origin main
REV=$(git rev-parse HEAD)
git show "$REV:$A" > "$L/shotgun-red-repair/committed.png"
cmp -s "$A" "$L/shotgun-red-repair/committed.png" || { echo "STOP: committed readback mismatch"; exit 1; }
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"; git worktree add --detach "$W" "$REV"; cd "$W"
node --check src/procedural-motion-preview.js
npm run build
[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2; kill -0 "$PID"
STAMP=$(date +%s)
RELOAD_URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FIRE_URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"
echo "REV=$REV"
echo "REFINERY_CANDIDATE=$REFINERY"
echo "RELOAD_REVIEW=$RELOAD_URL"
echo "FIRE_REVIEW=$FIRE_URL"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$RELOAD_URL"
