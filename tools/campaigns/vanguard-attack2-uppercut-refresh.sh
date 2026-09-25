#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"
RECIPE_REL="public/assets/vanguard/procedural/attack2-uppercut.recipe.json"

echo "=== PULL CANONICAL MAIN ==="
git -C "$ROOT" fetch origin main
git -C "$ROOT" checkout main
git -C "$ROOT" merge --ff-only origin/main
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
echo "main_head=$HEAD"

echo "=== VERIFY DOCUMENTED UPPERCUT CONTRACT ==="
node - "$ROOT/$RECIPE_REL" <<'NODE'
const fs=require('fs');
const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const want={idle:[2,[58,96]],chamber:[20,[50,91]],rise:[32,[67,82]],contact:[21,[45,86]]};
for(const [name,[cell,point]] of Object.entries(want)){
  const s=r.sources?.[name];
  if(!s||s.cell!==cell||s.anchorMode!=='explicit-point'||JSON.stringify(s.anchorPoint)!==JSON.stringify(point))
    throw new Error(name+': planted-foot contract mismatch');
}
for(const p of r.phases||[]) if(Number(p.deform?.shiftY||0)!==0) throw new Error(p.id+': shiftY undoes pin');
const fx=r.sources?.['slash-right'];
if(!fx||fx.cell!==8||fx.preserveCellBounds!==true) throw new Error('Jovian slash must be cell 8 with preserveCellBounds');
if(r.effect?.revealMode!=='none') throw new Error('uppercut slash must not be reveal-clipped');
if(r.effectAtlases?.['slash-canonical']?.sha256!=='e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d')
  throw new Error('slash atlas SHA mismatch');
console.log('documented_contract=PASS');
NODE

echo "=== RECREATE DISPOSABLE LIVE WORKTREE ==="
mkdir -p "$STATE"
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" "$HEAD" >/dev/null
LIVE_HEAD="$(git -C "$LIVE" rev-parse HEAD)"
[[ "$LIVE_HEAD" == "$HEAD" ]] || { echo "STOP: live HEAD mismatch"; exit 11; }
echo "live_head=$LIVE_HEAD"

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs

echo "=== VERIFY PROJECT-ROOT RUNTIME INPUTS ==="
[[ -s "$LIVE/motion.html" ]] || { echo "STOP: motion.html missing"; exit 12; }
[[ -s "$LIVE/src/procedural-motion-preview.js" ]] || { echo "STOP: renderer missing"; exit 13; }
[[ -s "$LIVE/public/assets/vanguard/procedural/attack2-uppercut.recipe.json" ]] || { echo "STOP: source recipe missing"; exit 14; }
[[ -s "$LIVE/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png" ]] || { echo "STOP: pose atlas missing"; exit 15; }
[[ -s "$LIVE/public/assets/vanguard/procedural/diorama-slash-atlas.png" ]] || { echo "STOP: slash atlas missing"; exit 16; }

echo "=== RESTART 8766 FROM PROJECT ROOT ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
READY=0
for _ in $(seq 1 25); do
  if curl -fsS "$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/public/assets/vanguard/procedural/attack2-uppercut.recipe.json?rev=$REV" -o /dev/null 2>&1; then
    READY=1
    break
  fi
  sleep .2
done
if [[ "$READY" -ne 1 ]]; then
  echo "STOP: project-root runtime verification failed"
  tmux capture-pane -pt "$SESSION" || true
  exit 20
fi

# motion.html expects ./assets; project-root server needs the canonical public mapping.
# Create only a disposable live-runtime symlink, never source state.
rm -f "$LIVE/assets"
ln -s public/assets "$LIVE/assets"
curl -fsS "$BASE/assets/vanguard/procedural/attack2-uppercut.recipe.json?rev=$REV" -o /dev/null ||
  { echo "STOP: exact browser recipe URL failed"; exit 21; }

URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV&nocache=$(date +%s)"
echo "=== UPPERCUT REVIEW READY ==="
echo "runtime_http=PASS"
echo "served_root=$LIVE"
echo "browser_recipe=assets/vanguard/procedural/attack2-uppercut.recipe.json"
echo "slash_cell=8 preserveCellBounds=true revealMode=none"
echo "url=$URL"
echo "VISUAL ACCEPTANCE REQUIRED: rear foot vertical ~0px; horizontal <=2px total."

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
