#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
EXPECTED_SHA="81a883d4825474bd16a03e0bb70c7fc126a20aa96e98d255160bf5d807e19c71"
CONTRACT="campaigns/swarmling-restore-tiny-authority.contract.json"
HELPER="tools/campaigns/apply_swarmling_tiny_authority.py"
SELF="tools/campaigns/swarmling-restore-tiny-authority.sh"
ASSET_ROOT="public/assets/vanguard/fleshpunk/characters/swarmling"
ATLAS="$ASSET_ROOT/source/swarmling-approved-atlas.png"
MANIFEST="$ASSET_ROOT/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-restore-tiny-authority.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
stop(){ echo "STOP: $*" >&2; exit 1; }
find_atlas(){
  for d in /storage/emulated/0/Download /storage/emulated/0/Pictures; do
    [ -d "$d" ] || continue
    while IFS= read -r -d '' f; do
      sha="$(sha256sum "$f" | awk '{print $1}')"
      if [ "$sha" = "$EXPECTED_SHA" ]; then printf '%s\n' "$f"; return 0; fi
    done < <(find "$d" -maxdepth 1 -type f -name '*.png' -print0 2>/dev/null)
  done
  return 1
}
[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing"
SOURCE="$(find_atlas || true)"
[ -n "$SOURCE" ] || stop "tiny uncropped atlas not found by exact SHA"
echo "=== SOURCE ==="
echo "SOURCE=$SOURCE"
sha256sum "$SOURCE"
cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
for f in "$CONTRACT" "$HELPER" "$SELF"; do git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"; done
AUTHOR="$STATE/swarmling-tiny-restore-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then git worktree remove --force "$AUTHOR" 2>/dev/null || stop "stale author worktree"; fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"
echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done
mkdir -p "$ASSET_ROOT/source" "$ASSET_ROOT/run/frames"
cp "$SOURCE" "$ATLAS"
python3 "$HELPER" "$ATLAS" "$MANIFEST" "$PREVIEW" "$TEST" "$ASSET_ROOT" "$EXPECTED_SHA"
echo "=== VERIFY ==="
grep -Fq 'const presentationScale=1.5;' "$PREVIEW" || stop "presentation scale changed"
node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check
git add "$ATLAS" "$ASSET_ROOT/run" "$MANIFEST" "$PREVIEW" "$TEST"
for p in $(git diff --cached --name-only); do
  case "$p" in "$ATLAS"|"$ASSET_ROOT"/run/*|"$MANIFEST"|"$PREVIEW"|"$TEST") ;; *) stop "unauthorized staged path: $p" ;; esac
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
 "campaign":"swarmling-restore-tiny-authority-v1",
 "status":"implemented-awaiting-human-review",
 "sealedRevision":sys.argv[2],
 "implementationRevision":sys.argv[3],
 "sourceByteSha256":sys.argv[4],
 "presentationScale":1.5,
 "rootMotion":False,
 "humanVerdict":"pending"
},indent=2)+"\n")
PY
git add "$RECEIPT"
git commit -m "Record tiny Swarmling restoration receipt"
FINAL="$(git rev-parse HEAD)"
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"
if [ -d "$LIVE" ]; then git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "stale live worktree"; fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"
node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
SERVED_MANIFEST="${MANIFEST#public/}"
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
  if curl -fsS "$BASE/$SERVED_MANIFEST?rev=$FINAL" | grep -Fq "$EXPECTED_SHA"; then READY=1; break; fi
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
echo "PRESENTATION_SCALE=1.5"
echo "TINY_SOURCE_AUTHORITY=ON"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"
termux-open-url "$RUN" >/dev/null 2>&1 || true
