#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
EXPECTED_BYTES="2a9ee9cc38a4b695d9a561bdce08eab71671de261fcae9e07b1f6a44f55f6f91"
EXPECTED_RGBA="d69d58e50ff26345a45230ea85f1e5d7eaad1d843c8a1774d8c92845f8f599ad"
PACKAGE_PARENT="b0262b421768477e17bdc546997e94509b413823"
CAMPAIGN="tools/campaigns/swarmling-vanguard-side-2d.sh"
CONTRACT="campaigns/swarmling-vanguard-side-2d.contract.json"
RECEIPT="campaigns/swarmling-vanguard-side-2d.receipt.json"
NEWROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
VIEWER="src/sprite-viewer.js"
TEST="tools/test_sprite_review_surface.mjs"
LEGACY="public/assets/swarmling/fleshpunk/animations.json"
VANGUARD="public/assets/vanguard/fleshpunk/animations.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
AUTHOR="$STATE/swarmling-vanguard-side-author"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

echo "=== SWARMLING VANGUARD-SIDE 2D CAMPAIGN ==="
echo "MUTABLE=$VIEWER $TEST $NEWROOT/** $RECEIPT"
echo "LOCKED=authoring/swarmling/** public/assets/swarmling/fleshpunk/** $VANGUARD"
echo "NO_RESIZE=accepted sheet already contains final scale correction"

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing"

SOURCE=""
for p in   "/storage/emulated/0/Download/fleshpunk_enemy_sheet_20pct_smaller_again.png"   "/storage/emulated/0/Downloads/fleshpunk_enemy_sheet_20pct_smaller_again.png"   "/storage/emulated/0/Pictures/fleshpunk_enemy_sheet_20pct_smaller_again.png"
do
  [ -f "$p" ] && SOURCE="$p" && break
done
[ -n "$SOURCE" ] || stop "accepted Swarmling sheet not found in bounded known locations"

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
mapfile -t GOT < <(git diff --name-only "$PACKAGE_PARENT..$SEALED" | sort)
mapfile -t WANT < <(printf '%s\n' "$CAMPAIGN" "$CONTRACT" | sort)
[ "${GOT[*]}" = "${WANT[*]}" ] || stop "origin/main is not the sealed two-file campaign package"

mkdir -p "$STATE"
if [ -d "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" 2>/dev/null || rm -rf "$AUTHOR"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done
grep -q "Sprite/contact-sheet guardrails" AGENTS.md || stop "sprite boot gate missing"
grep -q "Binary asset handling" docs/POSE_LAB_CAMPAIGN_RULES.md || stop "binary doctrine missing"
grep -q "Sprite-sheet production lane" docs/POSE_IS_GOD.md || stop "Pose Is God sprite lane missing"

LEGACY_BLOB="$(git hash-object "$LEGACY")"
VANGUARD_BLOB="$(git hash-object "$VANGUARD")"

echo "=== VERIFY ACCEPTED SOURCE ==="
python3 - "$SOURCE" "$EXPECTED_BYTES" "$EXPECTED_RGBA" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,sys
p=Path(sys.argv[1]); raw=p.read_bytes()
if hashlib.sha256(raw).hexdigest()!=sys.argv[2]:
    raise SystemExit("STOP: accepted sheet byte hash mismatch")
im=Image.open(p).convert("RGBA")
if im.size!=(1536,1024):
    raise SystemExit("STOP: accepted sheet dimensions mismatch")
if hashlib.sha256(im.tobytes()).hexdigest()!=sys.argv[3]:
    raise SystemExit("STOP: accepted sheet pixel hash mismatch")
print("SOURCE_OK",p)
PY

rm -rf "$NEWROOT"
mkdir -p "$NEWROOT/source" "$NEWROOT/run/frames"
cp "$SOURCE" "$NEWROOT/source/swarmling-approved-atlas.png"

echo "=== EXTRACT RUN CELLS 1-6 WITHOUT RESIZING ==="
python3 - "$NEWROOT" "$EXPECTED_BYTES" "$EXPECTED_RGBA" <<'PY'
from PIL import Image
from pathlib import Path
from collections import deque
import hashlib,json,sys
root=Path(sys.argv[1])
src=root/"source/swarmling-approved-atlas.png"
if hashlib.sha256(src.read_bytes()).hexdigest()!=sys.argv[2]:
    raise SystemExit("STOP: copied source bytes changed")
atlas=Image.open(src).convert("RGBA")
if hashlib.sha256(atlas.tobytes()).hexdigest()!=sys.argv[3]:
    raise SystemExit("STOP: copied source pixels changed")
CW=CH=256
def clear_border_black(cell):
    im=cell.copy().convert("RGBA"); px=im.load(); w,h=im.size
    seen=set(); q=deque()
    def bg(x,y):
        r,g,b,a=px[x,y]; return a>0 and max(r,g,b)<=18
    def push(x,y):
        if (x,y) not in seen and bg(x,y): seen.add((x,y)); q.append((x,y))
    for x in range(w): push(x,0); push(x,h-1)
    for y in range(h): push(0,y); push(w-1,y)
    while q:
        x,y=q.popleft(); r,g,b,a=px[x,y]; px[x,y]=(r,g,b,0)
        if x: push(x-1,y)
        if x+1<w: push(x+1,y)
        if y: push(x,y-1)
        if y+1<h: push(x,y+1)
    return im
frames=[]; contact=Image.new("RGBA",(CW*6,CH),(0,0,0,0))
for i in range(6):
    frame=clear_border_black(atlas.crop((i*CW,0,(i+1)*CW,CH)))
    rel=f"run/frames/run_{i:04d}.png"; out=root/rel
    frame.save(out)
    frames.append({"src":rel,"durationMs":80,"sourceCell":i+1,"sha256":hashlib.sha256(out.read_bytes()).hexdigest()})
    contact.alpha_composite(frame,(i*CW,0))
contact.save(root/"run/contact-sheet.png")
manifest={
 "schema":"pose-lab-v2-2d-animation-set-v1",
 "status":"quarantined",
 "character":"Swarmling",
 "lineage":"vanguard-side-2d-sprite",
 "defaultAnimation":"run",
 "frameSpace":{"width":256,"height":256,"colorMode":"RGBA","background":"transparent","facing":"source-authored","camera":"fixed"},
 "authority":{"source":"source/swarmling-approved-atlas.png","sourceByteSha256":sys.argv[2],"sourceRgbaPixelSha256":sys.argv[3],"sourceLayout":{"columns":6,"rows":4,"cellWidth":256,"cellHeight":256},"scale":"already accepted; no additional resize","excludedLineage":"authoring/swarmling/** and public/assets/swarmling/fleshpunk/**"},
 "animations":[{"id":"run","label":"Run","loop":True,"contactSheet":"run/contact-sheet.png","groundGuideY":255,"contract":["cells 1-6","80ms each","no resize","no generated in-betweens"],"frames":frames}]
}
(root/"animations.json").write_text(json.dumps(manifest,indent=2)+"\n")
PY

echo "=== REPOINT EXISTING CHARACTER SELECTOR ONLY ==="
python3 - "$VIEWER" "$TEST" <<'PY'
from pathlib import Path
import sys
vp,tp=map(Path,sys.argv[1:3]); v=vp.read_text(); t=tp.read_text()
old="./assets/swarmling/fleshpunk/animations.json"
new="./assets/vanguard/fleshpunk/characters/swarmling/animations.json"
if v.count(old)!=1: raise SystemExit("STOP: selector mapping anchor changed")
v=v.replace(old,new,1)
old_guard="assert(viewer.includes(\"swarmling: { label: 'Swarmling', manifest: './assets/swarmling/fleshpunk/animations.json' }\"), 'Swarmling must have its own manifest namespace');"
new_guard="assert(viewer.includes(\"swarmling: { label: 'Swarmling', manifest: './assets/vanguard/fleshpunk/characters/swarmling/animations.json' }\"), 'Swarmling must live in the Vanguard-side 2D sprite namespace');"
if old_guard not in t: raise SystemExit("STOP: selector test anchor changed")
t=t.replace(old_guard,new_guard,1)
anchor="\nif (failures.length) {\n"
if anchor not in t: raise SystemExit("STOP: test completion anchor changed")
block=r"""
const spriteSwarmlingPath = 'public/assets/vanguard/fleshpunk/characters/swarmling/animations.json';
assert(fs.existsSync(path.join(root, spriteSwarmlingPath)), 'Vanguard-side Swarmling manifest is missing');
if (fs.existsSync(path.join(root, spriteSwarmlingPath))) {
  const s = JSON.parse(read(spriteSwarmlingPath).toString('utf8'));
  const base = 'public/assets/vanguard/fleshpunk/characters/swarmling';
  assert(s.character === 'Swarmling', 'sprite character name changed');
  assert(s.lineage === 'vanguard-side-2d-sprite', 'sprite Swarmling lineage changed');
  assert(s.defaultAnimation === 'run', 'Run must be default');
  assert(s.frameSpace?.width === 256 && s.frameSpace?.height === 256, 'accepted cell geometry changed');
  assert(s.authority?.sourceByteSha256 === '2a9ee9cc38a4b695d9a561bdce08eab71671de261fcae9e07b1f6a44f55f6f91', 'accepted source changed');
  const run = s.animations?.[0];
  assert(run?.id === 'run' && run.frames?.length === 6, 'Run must contain six frames');
  assert(run.frames.every((f,i) => f.sourceCell === i+1 && f.durationMs === 80), 'Run order/timing changed');
  for (const [i,f] of run.frames.entries()) {
    const rel=path.join(base,f.src);
    assert(fs.existsSync(path.join(root,rel)), `sprite Swarmling frame ${i} missing`);
    if (!fs.existsSync(path.join(root,rel))) continue;
    const bytes=read(rel), size=pngSize(bytes);
    assert(size.width === 256 && size.height === 256, `sprite Swarmling frame ${i} geometry changed`);
    assert(sha256(bytes) === f.sha256, `sprite Swarmling frame ${i} bytes changed`);
  }
}
"""
t=t.replace(anchor,"\n"+block+anchor,1)
vp.write_text(v); tp.write_text(t)
PY

[ "$(git hash-object "$LEGACY")" = "$LEGACY_BLOB" ] || stop "legacy Blender-derived Swarmling changed"
[ "$(git hash-object "$VANGUARD")" = "$VANGUARD_BLOB" ] || stop "Vanguard manifest changed"

node --check "$VIEWER"
node "$TEST"
npm run build
npm run smoke
git diff --check

git add "$VIEWER" "$TEST" "$NEWROOT"
for p in $(git diff --cached --name-only); do
  case "$p" in "$VIEWER"|"$TEST"|"$NEWROOT"/*) ;; *) stop "unauthorized staged path: $p";; esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Add Vanguard-side 2D Swarmling run"
IMPLEMENTATION="$(git rev-parse HEAD)"

python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$EXPECTED_BYTES" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
 "schema":"pose-lab-v2-campaign-receipt-v1",
 "campaign":"swarmling-vanguard-side-2d-v1",
 "status":"implemented-awaiting-human-review",
 "sealedRevision":sys.argv[2],
 "implementationRevision":sys.argv[3],
 "sourceByteSha256":sys.argv[4],
 "run":{"sourceCells":[1,2,3,4,5,6],"durationMsPerFrame":80},
 "preserved":["authoring/swarmling/**","public/assets/swarmling/fleshpunk/**","public/assets/vanguard/fleshpunk/animations.json"],
 "humanVerdict":"pending"
},indent=2)+"\n")
PY
git add "$RECEIPT"
git commit -m "Record Swarmling 2D campaign receipt"
FINAL="$(git rev-parse HEAD)"

git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "Git readback mismatch"

if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || rm -rf "$LIVE"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"
node --check "$VIEWER"
node "$TEST"
npm run build
npm run smoke

probe(){
  local base="$1"
  curl -fsS "$base/src/sprite-viewer.js?rev=$FINAL" | grep -Fq "./assets/vanguard/fleshpunk/characters/swarmling/animations.json" &&
  curl -fsS "$base/assets/vanguard/fleshpunk/characters/swarmling/animations.json?rev=$FINAL" | grep -Fq "$EXPECTED_BYTES"
}
BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  U="http://127.0.0.1:$PORT"
  if probe "$U"; then BASE="$U"; break; fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$STATE/server-$PORT.log" 2>&1 &
  PID=$!; sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$U"; then BASE="$U"; echo "$PID" >"$STATE/server.pid"; break; fi
  kill "$PID" 2>/dev/null || true
done
[ -n "$BASE" ] || stop "exact review server unavailable"

URL="$BASE/?view=2d&character=swarmling&animation=run&cacheBust=$FINAL"
echo "FINAL_REV=$FINAL"
echo "REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$URL" >/dev/null 2>&1 || true
