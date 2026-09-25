#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"
RECIPE="public/assets/vanguard/procedural/attack2-uppercut.recipe.json"
POSE="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
SLASH="public/assets/vanguard/procedural/diorama-slash-atlas.png"
EXPECTED_SLASH_SHA="e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d"

[[ -d "$ROOT/.git" ]] || { echo "STOP: missing $ROOT"; exit 2; }

echo "=== PULL CANONICAL MAIN ==="
git -C "$ROOT" fetch origin main
git -C "$ROOT" checkout main
git -C "$ROOT" merge --ff-only origin/main
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
echo "main_head=$HEAD"

echo "=== VERIFY UPPERCUT CONTRACT ==="
node - "$ROOT/$RECIPE" "$EXPECTED_SLASH_SHA" <<'NODE'
const fs=require('fs');
const [path,sha]=process.argv.slice(2);
const r=JSON.parse(fs.readFileSync(path,'utf8'));
const need={idle:2,chamber:20,rise:32,contact:21};
for(const [k,v] of Object.entries(need)){
  if(r.sources?.[k]?.cell!==v) throw new Error(`${k} cell != ${v}`);
  if(r.sources?.[k]?.anchorMode!=='rear-foot-left') throw new Error(`${k} rear-foot pin missing`);
}
if(r.sources?.['slash-right']?.cell!==8) throw new Error('slash-right cell != 8');
if(r.effectAtlases?.['slash-canonical']?.sha256!==sha) throw new Error('recipe slash sha mismatch');
for(const p of r.phases||[]){
  if(Number(p.deform?.shiftY||0)!==0) throw new Error(`${p.id} violates rear-foot Y pin`);
}
console.log('uppercut_contract=PASS');
NODE

ACTUAL_SLASH_SHA="$(sha256sum "$ROOT/$SLASH" | awk '{print $1}')"
[[ "$ACTUAL_SLASH_SHA" == "$EXPECTED_SLASH_SHA" ]] || {
  echo "STOP: slash atlas sha mismatch"
  echo "expected=$EXPECTED_SLASH_SHA"
  echo "actual=$ACTUAL_SLASH_SHA"
  exit 11
}
echo "slash_atlas_sha256=$ACTUAL_SLASH_SHA"

echo "=== REFRESH LIVE WORKTREE ==="
mkdir -p "$STATE"
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" "$HEAD" >/dev/null
[[ -s "$LIVE/$POSE" && -s "$LIVE/$SLASH" && -s "$LIVE/$RECIPE" ]] || {
  echo "STOP: live worktree missing canonical assets"
  exit 12
}

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs

echo "=== RESTART 8766 FROM PROJECT ROOT ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$LIVE'"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV&nocache=$(date +%s)"

READY=0
for _ in $(seq 1 20); do
  if curl -fsS "$BASE/$RECIPE?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/$SLASH?rev=$REV" -o /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep .2
done
[[ "$READY" -eq 1 ]] || { echo "STOP: 8766 runtime verification failed"; exit 20; }

echo "VANGUARD_ATTACK2_UPPERCUT_REFRESH_OK"
echo "live_head=$(git -C "$LIVE" rev-parse HEAD)"
echo "rear_foot_pin=rear-foot-left+zero-phase-shiftY"
echo "slash_cell=8"
echo "url=$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
