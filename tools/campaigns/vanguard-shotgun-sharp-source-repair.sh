#!/usr/bin/env bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"
A="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
RELOAD="/storage/emulated/0/Download/vanguard-shotgun-reload-source-original.jpg"
FIRE="/storage/emulated/0/Download/vanguard-shotgun-fire-source-original.png"
RH="b9f877a233d080792da17c32a4072ddce564d8dd795cbb4368aaeb7f4bdbdc5b"
FH="40c495c4547f609a569fd0f946356146c3c684073fe50d2c099c272bef2acf41"
cd "$P"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null
echo "MISSION=repair only six unaccepted appended sprite preparations"
echo "AUTHORITY=original authored reload/fire strips"
echo "WRITABLE=$A cells 91-93 and 97-99 only"
echo "LOCKED=cells 1-90, reserved 94-96/100-102, all recipes, renderer, timing, effects"
git status --short
git diff --quiet HEAD -- "$A" || { echo "STOP: atlas unexpectedly dirty"; exit 1; }
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START=$(git rev-parse HEAD)
test -f "$RELOAD" || { echo "STOP: download the exact named reload original"; exit 1; }
test -f "$FIRE" || { echo "STOP: download the exact named fire original"; exit 1; }
[ "$(sha256sum "$RELOAD"|awk '{print $1}')" = "$RH" ] || { echo "STOP: reload source hash mismatch"; exit 1; }
[ "$(sha256sum "$FIRE"|awk '{print $1}')" = "$FH" ] || { echo "STOP: fire source hash mismatch"; exit 1; }
mkdir -p "$L/shotgun-sharp-repair"
cp "$A" "$L/shotgun-sharp-repair/before.png"
python3 - "$P/$A" "$RELOAD" "$FIRE" "$L/shotgun-sharp-repair/manifest.json" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys
atlas_p,reload_p,fire_p,manifest_p=map(Path,sys.argv[1:])
atlas=Image.open(atlas_p).convert("RGB")
before=atlas.copy()
assert atlas.size==(1037,1728)
TARGET_H=74
THRESH=18
def bbox(im):
    a=im.convert("RGB"); px=a.load(); xs=[]; ys=[]
    for y in range(a.height):
      for x in range(a.width):
        if max(px[x,y])>THRESH: xs.append(x); ys.append(y)
    if not xs: raise SystemExit("STOP: empty authored frame")
    return min(xs),min(ys),max(xs)+1,max(ys)+1
def split3(path):
    im=Image.open(path).convert("RGB"); w,h=im.size
    assert w%3==0, f"STOP: source not three equal authored panels: {im.size}"
    pw=w//3; out=[]
    for i in range(3):
      p=im.crop((i*pw,0,(i+1)*pw,h)); b=bbox(p); out.append(p.crop(b))
    return out
def prepare(frames):
    hs=[x.height for x in frames]
    scale=TARGET_H/sorted(hs)[1]
    # Single direct resample. No 0.5 intermediate, no reconstruction/upscale.
    return [x.resize((max(1,round(x.width*scale)),max(1,round(x.height*scale))),Image.Resampling.LANCZOS) for x in frames],scale,hs
def cellrect(cell):
    i=cell-1; row=i//6; col=i%6
    x0=round(col*1037/6); x1=round((col+1)*1037/6)
    if row==15: y0,y1=1536,1632
    elif row==16: y0,y1=1632,1728
    else: raise AssertionError(cell)
    return x0,y0,x1,y1
def clear_and_place(cell,sprite):
    x0,y0,x1,y1=cellrect(cell)
    atlas.paste((0,0,0),(x0,y0,x1,y1))
    assert sprite.width<=x1-x0 and sprite.height<=y1-y0
    x=x0+((x1-x0)-sprite.width)//2
    y=y1-5-sprite.height
    atlas.paste(sprite,(x,y))
    return [x,y,sprite.width,sprite.height]
reload=split3(reload_p); fire=split3(fire_p)
reload2,rs,rhs=prepare(reload); fire2,fs,fhs=prepare(fire)
placements={}
for c,s in zip((91,92,93),reload2): placements[str(c)]=clear_and_place(c,s)
for c,s in zip((97,98,99),fire2): placements[str(c)]=clear_and_place(c,s)
# Old published rectangle must remain exact.
assert atlas.crop((0,0,1037,1536)).tobytes()==before.crop((0,0,1037,1536)).tobytes()
# Reserved slots must remain exact too.
for c in (94,95,96,100,101,102):
    r=cellrect(c)
    assert atlas.crop(r).tobytes()==before.crop(r).tobytes(), f"STOP: reserved cell {c} changed"
atlas.save(atlas_p)
def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()
m={"schema":"vanguard-six-sprite-sharp-repair-v1","status":"quarantined","targetForegroundHeight":TARGET_H,
   "method":"one shared scale per authored 3-frame sheet; one direct LANCZOS resample; no intermediate downsample/reconstruction",
   "reload":{"source":str(reload_p),"sha256":sha(reload_p),"sourceHeights":rhs,"sharedScale":rs,"cells":[91,92,93]},
   "fire":{"source":str(fire_p),"sha256":sha(fire_p),"sourceHeights":fhs,"sharedScale":fs,"cells":[97,98,99]},
   "placements":placements,"atlasSha256":sha(atlas_p),"humanVerdict":"pending"}
manifest_p.write_text(json.dumps(m,indent=2)+"\n")
print(json.dumps(m,indent=2))
PY
# Only atlas may differ before commit.
BAD=$(git diff --name-only | grep -v "^$A$" || true)
[ -z "$BAD" ] || { echo "STOP: unauthorized diff"; echo "$BAD"; exit 1; }
node --check src/procedural-motion-preview.js
git add "$A"
git commit -m "Sharpen Vanguard shotgun atlas poses from authored sources"
git push origin main
REV=$(git rev-parse HEAD)
git show "$REV:$A" > "$L/shotgun-sharp-repair/committed.png"
cmp -s "$A" "$L/shotgun-sharp-repair/committed.png" || { echo "STOP: committed atlas readback mismatch"; exit 1; }
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"; git worktree add --detach "$W" "$REV"; cd "$W"
node --check src/procedural-motion-preview.js
npm run build
[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2; kill -0 "$PID"
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV"
echo "REV=$REV"; echo "REVIEW=$URL"; echo "HUMAN_VERDICT=PENDING"
termux-open-url "$URL"
