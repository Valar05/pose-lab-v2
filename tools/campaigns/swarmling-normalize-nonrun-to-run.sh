#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
EXPECTED_SHA="75932d49800ce93dacb7a3ed8a2f294020b3313ac5ae98a96083facac07eb602"
CONTRACT="campaigns/swarmling-normalize-nonrun-to-run.contract.json"
SELF="tools/campaigns/swarmling-normalize-nonrun-to-run.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-normalize-nonrun-to-run.receipt.json"
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
[ -n "$SOURCE" ] || stop "normalized Swarmling atlas not found in Download/Pictures by exact SHA"

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
    raise SystemExit("STOP: normalized atlas must be 1536x1024")
PY

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
git cat-file -e "$SEALED:$CONTRACT" || stop "sealed contract missing"
git cat-file -e "$SEALED:$SELF" || stop "campaign script missing"

AUTHOR="$STATE/swarmling-normalize-author-$SEALED"
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

echo "=== PROMOTE NORMALIZED ATLAS ==="
mkdir -p "$ASSET_ROOT/source" "$ASSET_ROOT/run/frames"
cp "$SOURCE" "$ATLAS"

python3 - "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST" "$ASSET_ROOT" "$EXPECTED_SHA" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,re,statistics,sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4])
root=Path(sys.argv[5])
expected_sha=sys.argv[6]

raw=atlas_path.read_bytes()
byte_sha=hashlib.sha256(raw).hexdigest()
if byte_sha != expected_sha:
    raise SystemExit("STOP: copied atlas SHA mismatch")

src=Image.open(atlas_path).convert("RGBA")
if src.size != (1536,1024):
    raise SystemExit("STOP: copied atlas dimensions mismatch")
rgba_sha=hashlib.sha256(src.tobytes()).hexdigest()

def cell_image(cell_no):
    idx=cell_no-1
    c=idx%6
    r=idx//6
    return src.crop((c*256,r*256,(c+1)*256,(r+1)*256)).copy()

def nonblack_mask_points(cell):
    px=cell.load()
    pts=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a and (r>8 or g>8 or b>8):
                pts.append((x,y))
    return pts

def foot_anchor(cell_no):
    pts=nonblack_mask_points(cell_image(cell_no))
    if not pts:
        raise SystemExit(f"STOP: empty source cell {cell_no}")
    max_y=max(y for _,y in pts)
    bottom=[x for x,y in pts if y >= max_y-3]
    if not bottom:
        raise SystemExit(f"STOP: no bottom contact pixels in cell {cell_no}")
    return [int(round(statistics.median(bottom))), int(max_y)]

manifest=json.loads(manifest_path.read_text())
manifest["authority"]["sourceByteSha256"]=byte_sha
manifest["authority"]["sourceRgbaPixelSha256"]=rgba_sha
manifest["authority"]["sourceDimensions"]=[1536,1024]
manifest["authority"]["scale"]="Run row is scale authority; non-Run cells normalized to Run scale in approved atlas"
manifest["authority"]["sourceRecovery"]="normalized recovered atlas promoted by exact SHA"

run=next(a for a in manifest["animations"] if a["id"]=="run")
if len(run["frames"]) != 6:
    raise SystemExit("STOP: run must contain six frames")

run_anchors=[]
contact=Image.new("RGBA",(1536,256),(0,0,0,0))
for i,frame in enumerate(run["frames"]):
    cell=cell_image(i+1)
    px=cell.load()
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if r==0 and g==0 and b==0:
                px[x,y]=(0,0,0,0)
    out=root/frame["src"]
    out.parent.mkdir(parents=True,exist_ok=True)
    cell.save(out)
    frame["sourceCell"]=i+1
    frame["durationMs"]=80
    frame["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    contact.alpha_composite(cell,(i*256,0))
    run_anchors.append(foot_anchor(i+1))

contact_path=root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)

for anim in manifest["animations"]:
    if anim.get("id") not in {"jab","rake","scythe-bloom"}:
        continue
    used=set()
    if isinstance(anim.get("idleSource"),dict):
        used.add(anim["idleSource"]["sourceCell"])
    for f in anim.get("frames",[]):
        used.add(f["sourceCell"])
    for f in anim.get("timeline",[]):
        used.add(f["sourceCell"])
    anchors={cell:foot_anchor(cell) for cell in used}
    if isinstance(anim.get("idleSource"),dict):
        anim["idleSource"]["anchorPoint"]=anchors[anim["idleSource"]["sourceCell"]]
    for f in anim.get("frames",[]):
        f["anchorPoint"]=anchors[f["sourceCell"]]
    for f in anim.get("timeline",[]):
        f["anchorPoint"]=anchors[f["sourceCell"]]
    anim["pinAuthority"]={
        "source":byte_sha,
        "method":"bottom-contact median x over final 4 occupied rows",
        "stageAnchor":[220,226]
    }

manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

preview=preview_path.read_text()
new_const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"
preview2=re.sub(r"const runAnchors=\[[^;]+;",new_const,preview,count=1)
if preview2==preview:
    raise SystemExit("STOP: runAnchors constant not replaced")
preview_path.write_text(preview2)

test=test_path.read_text()
test2=re.sub(
    r"if\(!preview\.includes\('const runAnchors=\[[^']+;'\)\)fail\('recovered-atlas run pins missing'\);",
    "if(!preview.includes("+json.dumps(new_const)+"))fail('normalized-atlas run pins missing');",
    test,
    count=1
)
if test2==test:
    raise SystemExit("STOP: run-pin test guard not replaced")
test_path.write_text(test2)

print("source_byte_sha256="+byte_sha)
print("source_rgba_sha256="+rgba_sha)
print("run_anchors="+json.dumps(run_anchors,separators=(',',':')))
for anim in manifest["animations"]:
    if anim.get("id") in {"jab","rake","scythe-bloom"}:
        print(anim["id"]+"_pins="+json.dumps([f["anchorPoint"] for f in anim["frames"]],separators=(',',':')))
PY

echo "=== VERIFY ==="
python3 - "$MANIFEST" "$EXPECTED_SHA" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[1]).read_text())
if m["authority"]["sourceByteSha256"] != sys.argv[2]:
    raise SystemExit("STOP: manifest source hash mismatch")
for a in m["animations"]:
    if a.get("id") in {"jab","rake","scythe-bloom"} and a.get("rootMotion") is not False:
        raise SystemExit("STOP: root motion changed")
print("manifest=PASS")
PY

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE ==="
git add "$ATLAS" "$ASSET_ROOT/run" "$MANIFEST" "$PREVIEW" "$TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$ATLAS"|"$ASSET_ROOT"/run/*|"$MANIFEST"|"$PREVIEW"|"$TEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Normalize Swarmling non-Run scale to Run"
IMPLEMENTATION="$(git rev-parse HEAD)"

python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$EXPECTED_SHA" "$MANIFEST" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[5]).read_text())
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-normalize-nonrun-to-run-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "sourceByteSha256":sys.argv[4],
  "sourceRgbaPixelSha256":m["authority"]["sourceRgbaPixelSha256"],
  "rootMotion":False,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record Swarmling scale normalization receipt"
FINAL="$(git rev-parse HEAD)"

echo "=== PUSH + READBACK ==="
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
s=socket.socket()
s.bind(('127.0.0.1',0))
print(s.getsockname()[1])
s.close()
PY
)"
[ -n "$PORT" ] || stop "failed to allocate free review port"

BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!
echo "$PID" >"$STATE/server.pid"

READY=0
for _ in $(seq 1 40); do
  if ! kill -0 "$PID" 2>/dev/null; then
    cat "$LOG" >&2 || true
    stop "review server exited"
  fi
  if probe "$BASE"; then READY=1; break; fi
  sleep .1
done
[ "$READY" = 1 ] || { cat "$LOG" >&2 || true; stop "review server not ready"; }

STAMP="$(date +%s)"
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$STAMP"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$FINAL&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "RUN=$RUN"
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "SOURCE_SHA256=$EXPECTED_SHA"
echo "RUN_SCALE_AUTHORITY=ON"
echo "PINS=REMEASURED"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
