#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
TARGET="b08d6b71d4ce4e7e2ff1555fad459e364a086352"
CONTRACT="campaigns/swarmling-recovered-atlas-repin.contract.json"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
SERVED_MANIFEST="${MANIFEST#public/}"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
git cat-file -e "$TARGET^{commit}" || stop "target revision unavailable"

mkdir -p "$STATE"
if [ -d "$LIVE" ]; then
  git worktree remove --force "$LIVE" 2>/dev/null || stop "could not retire prior live worktree"
fi
git worktree add --detach "$LIVE" "$TARGET" >/dev/null
cd "$LIVE"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== REPIN CONTRACT ==="
python3 - "$CONTRACT" "$MANIFEST" <<'PY'
from pathlib import Path
import json,sys
c=json.loads(Path(sys.argv[1]).read_text())
m=json.loads(Path(sys.argv[2]).read_text())
if m["authority"]["sourceByteSha256"] != "7513136d32a923d33d212609ea722d34c26bab855d2ce2775f0922bb88871787":
    raise SystemExit("STOP: recovered atlas hash changed")
if c["attackSourceChoices"]["jab"] != [10,14]:
    raise SystemExit("STOP: Jab source pair drifted")
if c["attackSourceChoices"]["rake"] != [13,15]:
    raise SystemExit("STOP: Rake source pair drifted")
if c["attackSourceChoices"]["scytheBloom"] != [11,15,16]:
    raise SystemExit("STOP: Scythe Bloom source set drifted")
for a in m["animations"]:
    if a.get("id") in {"jab","rake","scythe-bloom"} and a.get("rootMotion") is not False:
        raise SystemExit("STOP: root motion must remain off")
print("repin_contract=PASS")
PY

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

probe(){
  local base="$1"
  curl -fsS "$base/motion.html?rev=$TARGET" | grep -Fq "Motion Profile Lab" &&
  curl -fsS "$base/$PREVIEW?rev=$TARGET" | grep -Fq "const runAnchors=[[128,238],[126,238],[126,239],[115,239],[122,239],[135,240]];" &&
  curl -fsS "$base/$SERVED_MANIFEST?rev=$TARGET" | grep -Fq '"sourceCell": 14'
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
RUN="$BASE/motion.html?procedural=swarmling-run&rev=$TARGET&nocache=$STAMP"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$TARGET&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$TARGET&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$TARGET&nocache=$STAMP"

echo "=== REVIEW ==="
echo "RUN=$RUN"
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "RUN_PINS=RECOVERED_ATLAS_MEASURED"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RUN" >/dev/null 2>&1 || true
