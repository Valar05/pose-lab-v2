#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
LOCAL_ATLAS="$ROOT/public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
EXPECTED_SHA="7513136d32a923d33d212609ea722d34c26bab855d2ce2775f0922bb88871787"
CONTRACT="campaigns/swarmling-recovered-atlas-promotion.contract.json"
SELF="tools/campaigns/swarmling-recovered-atlas-promotion.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
RECEIPT="campaigns/swarmling-recovered-atlas-promotion.receipt.json"
PREVIEW="src/procedural-swarmling-preview.js"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing"
[ -f "$LOCAL_ATLAS" ] || stop "installed recovered atlas missing: $LOCAL_ATLAS"

echo "=== VERIFY USER-INSTALLED ATLAS ==="
ACTUAL_SHA="$(sha256sum "$LOCAL_ATLAS" | awk '{print $1}')"
echo "atlas_sha256=$ACTUAL_SHA"
[ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || stop "atlas bytes differ from approved downloaded file"

python3 - "$LOCAL_ATLAS" <<'PY'
from PIL import Image
from pathlib import Path
import sys
p=Path(sys.argv[1])
im=Image.open(p)
print("atlas_mode="+im.mode)
print("atlas_dimensions=%sx%s"%im.size)
if im.size != (1536,1024):
    raise SystemExit("STOP: recovered atlas must be exactly 1536x1024")
PY

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
git cat-file -e "$SEALED:$CONTRACT" || stop "sealed contract missing from origin/main"
git cat-file -e "$SEALED:$SELF" || stop "campaign script missing from origin/main"

AUTHOR="$STATE/swarmling-atlas-author-$SEALED"
LIVE="$STATE/worktree"
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

echo "=== PROMOTE RECOVERED ATLAS + REBUILD RUN ==="
mkdir -p "$ASSET_ROOT/source" "$ASSET_ROOT/run/frames"
cp "$LOCAL_ATLAS" "$ATLAS"

python3 - "$ATLAS" "$MANIFEST" "$ASSET_ROOT" "$EXPECTED_SHA" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
root=Path(sys.argv[3])
expected_sha=sys.argv[4]

raw=atlas_path.read_bytes()
byte_sha=hashlib.sha256(raw).hexdigest()
if byte_sha != expected_sha:
    raise SystemExit("STOP: copied atlas byte hash changed")

src=Image.open(atlas_path).convert("RGBA")
if src.size != (1536,1024):
    raise SystemExit("STOP: copied atlas dimensions changed")
rgba_sha=hashlib.sha256(src.tobytes()).hexdigest()

manifest=json.loads(manifest_path.read_text())
manifest["authority"]["sourceByteSha256"]=byte_sha
manifest["authority"]["sourceRgbaPixelSha256"]=rgba_sha
manifest["authority"]["sourceDimensions"]=[1536,1024]
manifest["authority"]["sourceRecovery"]="recovered from user-approved atlas; exact sizing/layout preserved; no destructive crop"

run=next((a for a in manifest["animations"] if a["id"]=="run"),None)
if not run or len(run.get("frames",[])) != 6:
    raise SystemExit("STOP: expected six-frame Swarmling run manifest")

contact=Image.new("RGBA",(1536,256),(0,0,0,0))
for i,frame in enumerate(run["frames"]):
    cell=src.crop((i*256,0,(i+1)*256,256)).copy()
    px=cell.load()
    # Preserve all authored detail. Only literal RGB 0,0,0 background is transparent.
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if r==0 and g==0 and b==0:
                px[x,y]=(0,0,0,0)
    out=root/frame["src"]
    out.parent.mkdir(parents=True,exist_ok=True)
    cell.save(out)
    frame["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    frame["sourceCell"]=i+1
    frame["durationMs"]=80
    contact.alpha_composite(cell,(i*256,0))

contact_path=root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)

manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")
print("source_byte_sha256="+byte_sha)
print("source_rgba_sha256="+rgba_sha)
print("run_frames=6")
print("run_geometry=256x256")
print("background_cleanup=exact-black-only")
PY

echo "=== VERIFY CAMPAIGN LOCKS ==="
python3 - "$MANIFEST" "$EXPECTED_SHA" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[1]).read_text())
expected=sys.argv[2]
if m.get("authority",{}).get("sourceByteSha256") != expected:
    raise SystemExit("STOP: manifest source hash not updated")
if m.get("authority",{}).get("timingAuthority",{}).get("revision") != "e89c2adf671b06af4ce6a6c1d3f0118e68a6c274":
    raise SystemExit("STOP: SecurityTitan timing authority changed")
for a in m.get("animations",[]):
    if a.get("id") in {"jab","rake","scythe-bloom"} and a.get("rootMotion") is not False:
        raise SystemExit("STOP: attack no-root-motion contract missing")
print("manifest_lock_check=PASS")
PY

node tools/test_swarmling_attacks.mjs
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGED SURFACE ==="
git add "$ATLAS" "$MANIFEST" "$ASSET_ROOT/run"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$ATLAS"|"$MANIFEST"|"$ASSET_ROOT"/run/*) ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Promote recovered Swarmling atlas"
IMPLEMENTATION="$(git rev-parse HEAD)"

python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$EXPECTED_SHA" "$MANIFEST" <<'PY'
from pathlib import Path
import json,sys
manifest=json.loads(Path(sys.argv[5]).read_text())
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-recovered-atlas-promotion-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "sourceByteSha256":sys.argv[4],
  "sourceRgbaPixelSha256":manifest["authority"]["sourceRgbaPixelSha256"],
  "runFrameHashes":[f["sha256"] for f in next(a for a in manifest["animations"] if a["id"]=="run")["frames"]],
  "rootMotion":False,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY
git add "$RECEIPT"
git commit -m "Record recovered Swarmling atlas receipt"
FINAL="$(git rev-parse HEAD)"

echo "=== PUSH + READBACK ==="
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"
git show "$FINAL:$MANIFEST" | python3 -c 'import json,sys; expected=sys.argv[1]; m=json.load(sys.stdin); raise SystemExit(0 if m.get("authority",{}).get("sourceByteSha256")==expected else 1)' "$EXPECTED_SHA" || stop "committed manifest readback mismatch"

echo "=== BUILD EXACT FINAL REVISION ==="
if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "could not retire prior live worktree"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"
node tools/test_swarmling_attacks.mjs
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
[ "$READY" = 1 ] || {
  cat "$LOG" >&2 || true
  stop "review server did not become ready"
}

STAMP="$(date +%s)"
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$FINAL&nocache=$STAMP"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "RUN=$RUN"
echo "JAB=$JAB"
echo "SOURCE_SHA256=$EXPECTED_SHA"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
