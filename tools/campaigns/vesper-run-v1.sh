#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

P="${POSE_LAB_ROOT:-$HOME/storage/documents/GodotProjects/pose-lab-v2}"
STATE="${POSE_LAB_STATE:-$HOME/.local/state/pose-lab-v2-vesper-run-v1}"
CONTRACT="campaigns/vesper-run-v1.contract.json"
PORT="${POSE_LAB_PORT:-}"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$P/.git" ] || stop "Pose Lab repo not found at $P"
cd "$P"

echo "============================================================"
echo " VESPER RUN V1 — VERIFY / BUILD / REVIEW"
echo "============================================================"
echo "PHONE_HANDS=FORBIDDEN"
echo "CURRENT_WORKTREE_MUTATION=NONE"
echo "RUNTIME_AUTHORITY=origin/main exact revision"
echo "ATLAS_LOCK=02553770f1987ec0a235ff972deee0eeb9d28140855384031e62c9c2de05273b"
echo "POSE_AUTHORITY=Vesper gameplay atlas cells 2-7"
echo "TIMING_AUTHORITY=Vanguard-derived 1050ms six-pose cadence"
echo "PROCEDURAL=alternating authored shear + subtle 1.25px bob + 0.012 shear pulse"
echo "ROOT_MOTION=OFF"

echo
echo "=== READ DOCTRINE ==="
RULES=(
  "AGENTS.md"
  "docs/POSE_LAB_CAMPAIGN_RULES.md"
  "docs/POSE_IS_GOD.md"
  "docs/POSE_CAMPAIGN_FRAMEWORK.md"
  "docs/VESPER_LOW_RES_ATLAS_PROCESS.md"
  "docs/VESPER_LOW_RES_ACCEPTED_ARTIFACT.md"
)
for f in "${RULES[@]}"; do
  [ -s "$f" ] || stop "missing required rule: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo
echo "=== FETCH CANONICAL MAIN WITHOUT TOUCHING CURRENT WORKTREE ==="
git fetch origin main
REV="$(git rev-parse origin/main)"
echo "EXACT_REVISION=$REV"

mkdir -p "$STATE"
W="$STATE/worktree-$REV"
if [ -e "$W" ]; then
  git worktree remove --force "$W" >/dev/null 2>&1 || true
  rm -rf "$W"
fi
git worktree add --detach "$W" "$REV" >/dev/null

cleanup_on_fail(){
  code=$?
  if [ "$code" -ne 0 ]; then
    echo "FAILED_REVISION=$REV" >&2
    if [ -f "$STATE/server.log" ]; then
      tail -80 "$STATE/server.log" >&2 || true
    fi
  fi
  exit "$code"
}
trap cleanup_on_fail EXIT

cd "$W"
source tools/campaigns/campaign_common.sh

echo
echo "=== FAIL-CLOSED CAMPAIGN PREFLIGHT ==="
pose_campaign_boot "$W" "$CONTRACT"
pose_campaign_verify "$W" "$CONTRACT"

echo
echo "=== LOCKED ATLAS / RUNTIME CONTRACT ==="
node tools/test_vesper_run_runtime.mjs
node --check src/procedural-vesper-run-preview.js

ATLAS="public/assets/vesper/procedural/vesper-gameplay-atlas.png"
GOT_SHA="$(sha256sum "$ATLAS" | awk '{print $1}')"
if [ "$GOT_SHA" != "02553770f1987ec0a235ff972deee0eeb9d28140855384031e62c9c2de05273b" ]; then
  stop "locked Vesper atlas SHA mismatch: $GOT_SHA"
fi

python3 - <<'PY'
import json
from pathlib import Path
r=json.loads(Path("public/assets/vesper/procedural/run.recipe.json").read_text())
assert [p["cell"] for p in r["poses"]]==[2,3,4,5,6,7]
assert r["cycleMs"]==1050
assert r["rootMotion"] is False
assert r["secondary"]["bobPx"]==1.25
assert r["secondary"]["shearPulse"]==0.012
assert r["atlas"]["size"]==[1448,1086]
print("RECIPE_SEMANTICS=PASS")
PY

echo
echo "=== BUILD EXACT REVISION ==="
# Pose Lab is intentionally dependency-free for local static builds.
# package.json guardrails require no npm dependencies; do not npm install/ci here.
node scripts/build.mjs

echo
echo "=== SERVE POSE LAB V2 ==="
if [ -f "$STATE/server.pid" ]; then
  old="$(cat "$STATE/server.pid" 2>/dev/null || true)"
  if [ -n "$old" ]; then
    kill "$old" 2>/dev/null || true
  fi
fi

if [ -z "$PORT" ]; then
  PORT="$(pose_campaign_free_port)"
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$STATE/server.log" 2>&1 &
PID=$!
echo "$PID" > "$STATE/server.pid"

pose_campaign_wait_http "http://127.0.0.1:$PORT/motion.html" "$PID" "$STATE/server.log"

RUNTIME_FILES=(
  "assets/vesper/procedural/vesper-gameplay-atlas.png"
  "assets/vesper/procedural/run.recipe.json"
)
for rel in "${RUNTIME_FILES[@]}"; do
  curl -fsS "http://127.0.0.1:$PORT/$rel" >/dev/null || stop "runtime resource unavailable: $rel"
done

STAMP="$(date +%s)"
URL="http://127.0.0.1:$PORT/motion.html?procedural=vesper-run&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " VESPER RUN READY FOR HUMAN REVIEW"
echo "============================================================"
echo "REV=$REV"
echo "ATLAS_SHA256=$GOT_SHA"
echo "REVIEW_URL=$URL"
echo "HUMAN_VERDICT=PENDING"
echo
echo "CHECK ONLY:"
echo "  - correct cells 2-7"
echo "  - Vesper gameplay scale stays locked"
echo "  - foot / baseline jitter"
echo "  - 1050ms cadence"
echo "  - authored alternating shear"
echo "  - subtle 1.25px procedural bob"
echo "  - subtle 0.012 procedural shear pulse"
echo "  - continuous loop"
echo
echo "NO GIF. NO PHONE HANDS. NO ATLAS MUTATION."

trap - EXIT
