#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
EXPECTED_SHA="81a883d4825474bd16a03e0bb70c7fc126a20aa96e98d255160bf5d807e19c71"
CONTRACT="campaigns/swarmling-tiny-uncropped-promotion.contract.json"
SELF="tools/campaigns/swarmling-tiny-uncropped-promotion.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-tiny-uncropped-promotion.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

find_atlas(){
  for d in /storage/emulated/0/Download /storage/emulated/0/Pictures; do
    [ -d "$d" ] || continue
    while IFS= read -r -d '' f; do
      sha="$(sha256sum "$f" | awk '{print $1}')"
      if [ "$sha" = "$EXPECTED_SHA" ]; then
        printf '%s\n' "$f"
        return 0
      fi
    done < <(find "$d" -maxdepth 1 -type f -name '*.png' -print0 2>/dev/null)
  done
  return 1
}

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing"
SOURCE="$(find_atlas || true)"
[ -n "$SOURCE" ] || stop "tiny uncropped atlas not found in Download/Pictures by exact SHA"

echo "=== SOURCE ==="
echo "SOURCE=$SOURCE"
sha256sum "$SOURCE"

python3 - "$SOURCE" <<'PY'
from PIL import Image
import sys
im=Image.open(sys.argv[1])
print("dimensions=%sx%s"%im.size)
print("mode="+im.mode)
if im.size != (1536,1024):
    raise SystemExit("STOP: atlas must be 1536x1024")
PY

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
git cat-file -e "$SEALED:$CONTRACT" || stop "sealed contract missing"
git cat-file -e "$SEALED:$SELF" || stop "campaign script missing"

AUTHOR="$STATE/swarmling-tiny-author-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" 2>/dev/null || stop "could not retire stale author worktree"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

mkdir -p "$ASSET_ROOT/source" "$ASSET_ROOT/run/frames"
cp "$SOURCE" "$ATLAS"

python3 - "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST" "$ASSET_ROOT" "$EXPECTED_SHA" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,re,statistics,sys

atlas_path=Path(sys.argv[1]); manifest_path=Path(sys.argv[2]); preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4]); root=Path(sys.argv[5]); expected=sys.argv[6]

raw=atlas_path.read_bytes()
if hashlib.sha256(raw).hexdigest()!=expected:
    raise SystemExit("STOP: copied atlas SHA mismatch")
src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions mismatch")

def cell(n):
    i=n-1; c=i%6; r=i//6
    return src.crop((c*256,r*256,(c+1)*256,(r+1)*256)).copy()

def pts_nonblack(im):
    px=im.load(); pts=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a and (r>8 or g>8 or b>8):
                pts.append((x,y))
    return pts

def foot(n):
    pts=pts_nonblack(cell(n))
    if not pts: raise SystemExit(f"STOP: empty cell {n}")
    maxy=max(y for _,y in pts)
    xs=[x for x,y in pts if y>=maxy-3]
    return [int(round(statistics.median(xs))), int(maxy)]

m=json.loads(manifest_path.read_text())
m["authority"]["sourceByteSha256"]=expected
m["authority"]["sourceRgbaPixelSha256"]=hashlib.sha256(src.tobytes()).hexdigest()
m["authority"]["sourceDimensions"]=[1536,1024]
m["authority"]["scale"]="Exact tiny approved footprint restored; recovered full silhouettes fitted into old visible bounds"
m["authority"]["sourceRecovery"]="tiny uncropped atlas promoted by exact SHA"

run=next(a for a in m["animations"] if a["id"]=="run")
contact=Image.new("RGBA",(1536,256),(0,0,0,0))
run_anchors=[]
for i,f in enumerate(run["frames"]):
    im=cell(i+1)
    px=im.load()
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if r==0 and g==0 and b==0:
                px[x,y]=(0,0,0,0)
    out=root/f["src"]; out.parent.mkdir(parents=True,exist_ok=True); im.save(out)
    f["sourceCell"]=i+1; f["durationMs"]=80
    f["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    contact.alpha_composite(im,(i*256,0))
    run_anchors.append(foot(i+1))
contact.save(root/run["contactSheet"])

for a in m["animations"]:
    if a.get("id") not in {"jab","rake","scythe-bloom"}: continue
    used={f["sourceCell"] for f in a.get("frames",[])} | {f["sourceCell"] for f in a.get("timeline",[])}
    if isinstance(a.get("idleSource"),dict): used.add(a["idleSource"]["sourceCell"])
    anchors={n:foot(n) for n in used}
    if isinstance(a.get("idleSource"),dict): a["idleSource"]["anchorPoint"]=anchors[a["idleSource"]["sourceCell"]]
    for f in a.get("frames",[]): f["anchorPoint"]=anchors[f["sourceCell"]]
    for f in a.get("timeline",[]): f["anchorPoint"]=anchors[f["sourceCell"]]
    a["pinAuthority"]={"source":expected,"method":"bottom-contact median x over final 4 occupied rows","stageAnchor":[220,226]}

manifest_path.write_text(json.dumps(m,indent=2)+"\n")

preview=preview_path.read_text()
const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"
preview2=re.sub(r"const runAnchors=\[[^;]+;",const,preview,count=1)
if preview2==preview: raise SystemExit("STOP: runAnchors not replaced")
preview_path.write_text(preview2)

test=test_path.read_text()
test2=re.sub(
    r"if\(!preview\.includes\('const runAnchors=\[[^']+;'\)\)fail\('[^']*run pins missing'\);",
    "if(!preview.includes("+json.dumps(const)+"))fail('tiny-atlas run pins missing');",
    test,count=1
)
if test2==test: raise SystemExit("STOP: run-pin guard not replaced")
test_path.write_text(test2)

print("run_anchors="+json.dumps(run_anchors,separators=(',',':')))
print("source_rgba_sha256="+m["authority"]["sourceRgbaPixelSha256"])
PY

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

git add "$ATLAS" "$ASSET_ROOT/run" "$MANIFEST" "$PREVIEW" "$TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$ATLAS"|"$ASSET_ROOT"/run/*|"$MANIFEST"|"$PREVIEW"|"$TEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Restore tiny uncropped Swarmling atlas"
IMPLEMENTATION="$(git rev-parse HEAD)"

python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$EXPECTED_SHA" <<'PY'
from pathlib import Path
import json,sys
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-tiny-uncropped-promotion-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "sourceByteSha256":sys.argv[4],
  "rootMotion":False,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record tiny uncropped Swarmling receipt"
FINAL="$(git rev-parse HEAD)"

git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"

if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "could not retire prior live worktree"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke

SERVED_MANIFEST="${MANIFEST#public/}"
probe(){
  local base="$1"
  curl -fsS "$base/motion.html?rev=$FINAL" | grep -Fq "Motion Profile Lab" &&
  curl -fsS "$base/$SERVED_MANIFEST?rev=$FINAL" | grep -Fq "$EXPECTED_SHA"
}

PORT="$(python3 - <<'PY'
import socket
s=socket.socket(); s.bind(('127.0.0.1',0)); print(s.getsockname()[1]); s.close()
PY
)"
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
READY=0
for _ in $(seq 1 40); do
  if ! kill -0 "$PID" 2>/dev/null; then cat "$LOG" >&2 || true; stop "review server exited"; fi
  if probe "$BASE"; then READY=1; break; fi
  sleep .1
done
[ "$READY" = 1 ] || stop "review server not ready"

STAMP="$(date +%s)"
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$STAMP"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "RUN=$RUN"
echo "JAB=$JAB"
echo "SOURCE_SHA256=$EXPECTED_SHA"
echo "TINY_FOOTPRINT=RESTORED"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
