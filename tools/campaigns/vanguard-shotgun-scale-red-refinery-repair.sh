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
# Recover executable refinery authority. Prose/docs and the rejected sharp-repair campaign are not authority.
SELF="tools/campaigns/vanguard-shotgun-scale-red-refinery-repair.sh"
mapfile -t CANDIDATES < <(
  git grep -l -E 'POSE_LAB_VANGUARD_REFINERY_CLI_V1' -- 'tools/**' 'src/**' 2>/dev/null   | grep -v -F "$SELF"   | grep -v -F 'tools/campaigns/vanguard-shotgun-sharp-source-repair.sh'   || true
)
if [ "${#CANDIDATES[@]}" -ne 1 ]; then
  echo "STOP: MISSING_REFINERY_AUTHORITY"
  echo "Expected exactly one repository executable authority for the established Vanguard red/color refinery."
  printf 'candidate=%s\n' "${CANDIDATES[@]:-}"
  echo "No tint, histogram match, channel guess, or runtime bodyScale substitution is permitted."
  exit 42
fi
REFINERY="${CANDIDATES[0]}"
echo "REFINERY_AUTHORITY=$REFINERY"
# The executable authority must expose the narrow CLI contract documented for this repair.
grep -q 'POSE_LAB_VANGUARD_REFINERY_CLI_V1' "$REFINERY" || {
  echo "STOP: MISSING_REFINERY_AUTHORITY"
  echo "Candidate lacks POSE_LAB_VANGUARD_REFINERY_CLI_V1 contract: $REFINERY"
  exit 42
}
mkdir -p "$L/shotgun-red-repair"
cp "$A" "$L/shotgun-red-repair/before.png"
# Prepare two three-frame batches through exact refinery authority.
# 0.85 is the user's explicit correction to the currently rejected batch scale.
bash "$REFINERY" --source "$RELOAD" --frames 3 --shared-scale-multiplier 0.85 --output "$L/shotgun-red-repair/reload-prepared.png"
bash "$REFINERY" --source "$FIRE" --frames 3 --shared-scale-multiplier 0.85 --output "$L/shotgun-red-repair/fire-prepared.png"
python3 - "$A" "$L/shotgun-red-repair/before.png" "$L/shotgun-red-repair/reload-prepared.png" "$L/shotgun-red-repair/fire-prepared.png" <<'PY'
from PIL import Image
from pathlib import Path
import sys
atlas_p,before_p,rp,fp=map(Path,sys.argv[1:])
a=Image.open(atlas_p).convert("RGB"); b=Image.open(before_p).convert("RGB")
assert a.size==b.size==(1037,1728)
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
def place(c,im):
 box=nonblack_bbox(im); s=im.crop(box); x0,y0,x1,y1=rect(c)
 assert s.width<=x1-x0 and s.height<=y1-y0
 a.paste((0,0,0),(x0,y0,x1,y1))
 a.paste(s,(x0+((x1-x0)-s.width)//2,y1-5-s.height))
for c,s in zip((91,92,93),frames(rp)): place(c,s)
for c,s in zip((97,98,99),frames(fp)): place(c,s)
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
echo "REFINERY=$REFINERY"
echo "RELOAD_REVIEW=$RELOAD_URL"
echo "FIRE_REVIEW=$FIRE_URL"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$RELOAD_URL"
