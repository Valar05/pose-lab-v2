#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-fire-single-pose"
W="$L/review"

FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"

cd "$P"
mkdir -p "$L"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN FIRE — EXACT REVIEW REFRESH"
echo "============================================================"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "MUTATION=NONE"
echo "EXPECTED=cell100 only + shear back/forward + shotgun blast move/scale controls"

git status --short || true
git fetch origin main
REV="$(git rev-parse origin/main)"
echo "ORIGIN_HEAD=$REV"

TMP="$L/verify"
rm -rf "$TMP"; mkdir -p "$TMP"
git show "$REV:$FIRE_REL" > "$TMP/fire.json"
git show "$REV:$RENDERER_REL" > "$TMP/renderer.js"

python3 - "$TMP/fire.json" "$TMP/renderer.js" <<'PY'
import json,sys
f=json.load(open(sys.argv[1]))
r=open(sys.argv[2]).read()
a=[p for p in f["phases"] if p["id"] in ("wide-plant","load-back","fire","settle")]
assert [p["source"] for p in a]==["brace"]*4
assert [p["deform"]["shearX"] for p in a]==[0,-0.24,0.30,0]
assert all(p["deform"]["scaleX"]==p["deform"]["scaleY"]==1 for p in a)
assert all(p["deform"]["shiftX"]==p["deform"]["shiftY"]==0 for p in a)
assert f["effect"]["controlProfile"]=="move-scale-only"
assert "Shotgun Blast Controls" in r
assert "window.__slashControls?.controls?.full?.checked" in r
print("SHOTGUN_FIRE_STATE=PASS")
PY

git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build
test -f "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"
test -f "$W/dist/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"

probe(){
  local base="$1" t="$L/probe.$$"
  curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$t.fire" 2>/dev/null || return 1
  curl -fsS "$base/src/procedural-motion-preview.js" > "$t.js" 2>/dev/null || return 1
  local ok=0
  [ "$(sha256sum "$t.fire"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"|awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$t.js"|awk '{print $1}')" = "$(sha256sum "$W/dist/src/procedural-motion-preview.js"|awk '{print $1}')" ] || ok=1
  rm -f "$t.fire" "$t.js"; [ "$ok" -eq 0 ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  C="http://127.0.0.1:$PORT"
  if probe "$C"; then BASE_URL="$C"; echo "SERVER=REUSED_EXACT PORT=$PORT"; break; fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!; sleep 1
  if kill -0 "$PID" 2>/dev/null && probe "$C"; then
    BASE_URL="$C"; echo "$PID" > "$L/server.pid"; echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"; break
  fi
  kill "$PID" 2>/dev/null || true
done

[ -n "$BASE_URL" ] || { echo "STOP: no exact review server"; exit 1; }
STAMP="$(date +%s)"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

if command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$FU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=termux-open-url"
elif command -v am >/dev/null 2>&1 && am start -a android.intent.action.VIEW -d "$FU" >/dev/null 2>&1; then
  echo "BROWSER_OPEN=am"
else
  echo "OPEN_THIS_URL=$FU"
fi
