#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"
RECIPE_REL="assets/vanguard/procedural/attack2-uppercut.recipe.json"
SOURCE_RECIPE="public/$RECIPE_REL"

echo "=== PULL CANONICAL MAIN ==="
git -C "$ROOT" fetch origin main
git -C "$ROOT" checkout main
git -C "$ROOT" merge --ff-only origin/main
HEAD="$(git -C "$ROOT" rev-parse HEAD)"
echo "main_head=$HEAD"

echo "=== VERIFY PLANTED-FOOT 2D IK CONTRACT ==="
node - "$ROOT/$SOURCE_RECIPE" <<'NODE'
const fs=require('fs');
const p=process.argv[2], r=JSON.parse(fs.readFileSync(p,'utf8'));
const want={
  idle:{cell:2,point:[57,89]},
  chamber:{cell:20,point:[50,91]},
  rise:{cell:32,point:[67,82]},
  contact:{cell:21,point:[45,86]}
};
for(const [name,w] of Object.entries(want)){
  const s=r.sources?.[name];
  if(!s) throw new Error("missing body source "+name);
  if(s.cell!==w.cell) throw new Error(name+": expected cell "+w.cell+", got "+s.cell);
  if(s.anchorMode!=="explicit-point") throw new Error(name+": anchorMode must be explicit-point");
  if(JSON.stringify(s.anchorPoint)!==JSON.stringify(w.point))
    throw new Error(name+": anchorPoint mismatch "+JSON.stringify(s.anchorPoint));
}
for(const p of r.phases||[]){
  if(Number(p.deform?.shiftY||0)!==0) throw new Error(p.id+": shiftY would undo foot pin");
}
const fx=r.sources?.["slash-right"];
if(!fx || fx.cell!==8) throw new Error("approved slash cell 8 is not active");
const sha=r.effectAtlases?.["slash-canonical"]?.sha256;
if(sha!=="e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d")
  throw new Error("slash atlas SHA mismatch");
console.log("foot_ik_contract=PASS");
console.log("cells=2,20,32,21");
console.log("anchors=2:[57,89] 20:[50,91] 32:[67,82] 21:[45,86]");
console.log("slash_cell=8");
NODE

echo "=== REFRESH LIVE WORKTREE ==="
mkdir -p "$STATE"
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" "$HEAD" >/dev/null
echo "live_head=$(git -C "$LIVE" rev-parse HEAD)"

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs
[[ -s "$LIVE/dist/$RECIPE_REL" ]] || { echo "STOP: built recipe missing"; exit 12; }
[[ -s "$LIVE/dist/src/procedural-motion-preview.js" ]] || { echo "STOP: built renderer missing"; exit 13; }

echo "=== RESTART REVIEW SERVER ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE/dist' && exec python3 -m http.server '$PORT' --bind 127.0.0.1"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
READY=0
for _ in $(seq 1 40); do
  if curl -fsS "$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/$RECIPE_REL?rev=$REV" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/src/procedural-motion-preview.js?rev=$REV" -o /dev/null 2>&1; then
    READY=1; break
  fi
  sleep .2
done
if [[ "$READY" -ne 1 ]]; then
  echo "STOP: exact browser runtime did not come up"
  tmux capture-pane -pt "$SESSION" || true
  exit 20
fi

URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV&nocache=$(date +%s)"
echo "=== UPPERCUT REVIEW READY ==="
echo "runtime_http=PASS"
echo "served_root=$LIVE/dist"
echo "url=$URL"
echo "NOTE: visual acceptance is literal rear-foot drift: vertical ~0 px, horizontal <=2 px total."

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
