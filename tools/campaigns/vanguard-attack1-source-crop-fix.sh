#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-attack1-crop"
W="$L/worktree"

RUN_REL="public/assets/vanguard/procedural/run.recipe.json"
ATTACK1_REL="public/assets/vanguard/procedural/overhand-strike.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"

RUN="$P/$RUN_REL"
ATTACK1="$P/$ATTACK1_REL"
RENDERER="$P/$RENDERER_REL"

cd "$P"

cat   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/VANGUARD_ATLAS_AUTHORITY.md   animations/candidates/vanguard/overhand-strike/MANUAL_TEST_PROMPT.md   >/dev/null

echo "============================================================"
echo " VANGUARD ATTACK 1 SOURCE-LOCAL CROP REVIEW"
echo "============================================================"
echo "HUMAN_VERDICT=Run fixed; locked"
echo "MISSION=review already-committed Attack 1 contact source crop"
echo "TARGET_REVISION=2cd3ca01926e576cc0f81c25c52e5576150f5e07"
echo "LOCKED=$RUN_REL entire file; atlas bytes; Attack1 timing/effects/registration/deformation/anchorPoint; every other recipe"

mkdir -p "$L"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short

for F in "$RUN_REL" "$ATTACK1_REL" "$RENDERER_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/$(basename "$F").preflight.diff"
    echo "STOP: target dirty; archived diff: $F"
    exit 1
  fi
done

echo
echo "=== SYNC MAIN ==="
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== VERIFY COMMITTED FIX ==="
python3 - "$ATTACK1" <<'PY'
import json,sys
a=json.load(open(sys.argv[1]))
assert a["id"]=="vanguard-overhand-strike-procedural-proof-v4"
assert a["sources"]["contact"]["cell"]==35
assert a["sources"]["contact"]["sourceRect"]==[0,0,173,34]
assert a["sources"]["contact"]["anchorPoint"]==[46,89]
assert a["stage"]["centerX"]==220
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["5"]==[512,614]
assert a["atlases"]["vanguard-canonical"]["rowBounds"]["6"]==[614,717]
print("ATTACK1_COMMITTED_FIX=CONFIRMED")
PY

grep -Fq "Array.isArray(src.sourceRect)" "$RENDERER"
echo "RENDERER_SOURCE_RECT_SUPPORT=CONFIRMED"

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check src/procedural-motion-preview.js
npm run build

echo
echo "=== SERVE EXACT REVISION ==="

probe_exact_server() {
  local base="$1" tmp
  tmp="$L/probe.$"
  if ! curl -fsS "$base/assets/vanguard/procedural/overhand-strike.recipe.json" > "$tmp.recipe" 2>/dev/null; then
    rm -f "$tmp.recipe" "$tmp.renderer"
    return 1
  fi
  if ! curl -fsS "$base/src/procedural-motion-preview.js" > "$tmp.renderer" 2>/dev/null; then
    rm -f "$tmp.recipe" "$tmp.renderer"
    return 1
  fi
  local served_recipe served_renderer built_recipe built_renderer
  served_recipe="$(sha256sum "$tmp.recipe" | awk '{print $1}')"
  served_renderer="$(sha256sum "$tmp.renderer" | awk '{print $1}')"
  built_recipe="$(sha256sum "$W/dist/assets/vanguard/procedural/overhand-strike.recipe.json" | awk '{print $1}')"
  built_renderer="$(sha256sum "$W/dist/src/procedural-motion-preview.js" | awk '{print $1}')"
  rm -f "$tmp.recipe" "$tmp.renderer"
  [ "$served_recipe" = "$built_recipe" ] && [ "$served_renderer" = "$built_renderer" ]
}

BASE=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"

  if probe_exact_server "$CANDIDATE"; then
    BASE="$CANDIDATE"
    echo "SERVER=REUSED_EXISTING_EXACT_BYTES PORT=$PORT"
    break
  fi

  LOG="$L/server-$PORT.log"
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$LOG" 2>&1 &
  PID=$!
  sleep 1

  if kill -0 "$PID" 2>/dev/null; then
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    BASE="$CANDIDATE"
    echo "SERVER=STARTED_PID_$PID PORT=$PORT"
    break
  fi
done

[ -n "$BASE" ] || {
  echo "STOP: no review port available in 8766..8775"
  exit 1
}

probe_exact_server "$BASE" || {
  echo "STOP: selected runtime does not serve exact built revision"
  exit 1
}

STAMP="$(date +%s)"
URL="$BASE/motion.html?procedural=vanguard-overhand-strike&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " ATTACK 1 SOURCE-LOCAL CROP READY FOR REVIEW"
echo "============================================================"
echo "REV=$REV"
echo "RUN=LOCKED_ACCEPTED"
echo "CONTACT_SOURCE_RECT=[0,0,173,34]"
echo "ATTACK1_REVIEW=$URL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$URL"
