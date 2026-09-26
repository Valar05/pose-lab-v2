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
PORT=8766
BASE="http://127.0.0.1:$PORT"

probe_exact_server() {
  local tmp
  tmp="$L/probe.$$"
  if ! curl -fsS "$BASE/assets/vanguard/procedural/overhand-strike.recipe.json" > "$tmp.recipe" 2>/dev/null; then
    rm -f "$tmp.recipe" "$tmp.renderer"
    return 1
  fi
  if ! curl -fsS "$BASE/src/procedural-motion-preview.js" > "$tmp.renderer" 2>/dev/null; then
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

if probe_exact_server; then
  echo "SERVER=REUSED_EXISTING_EXACT_BYTES"
else
  if [ -f "$L/server.pid" ]; then
    OLD_PID="$(cat "$L/server.pid" 2>/dev/null || true)"
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      kill "$OLD_PID" 2>/dev/null || true
      sleep 1
    fi
  fi

  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
  PID=$!
  echo "$PID" > "$L/server.pid"
  sleep 2

  if ! kill -0 "$PID" 2>/dev/null; then
    if probe_exact_server; then
      echo "SERVER=EXISTING_PROCESS_WON_RACE_BUT_SERVES_EXACT_BYTES"
    else
      cat "$L/server.log"
      echo "STOP: port $PORT is occupied by a server that does not serve this exact revision"
      exit 1
    fi
  else
    echo "SERVER=STARTED_PID_$PID"
  fi
fi

probe_exact_server || {
  echo "STOP: runtime bytes do not match exact built revision"
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
