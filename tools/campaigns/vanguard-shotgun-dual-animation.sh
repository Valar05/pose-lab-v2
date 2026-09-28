#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-fire-blast-transform"
A="$L/authoring"
W="$L/review"

FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"

cd "$P"
mkdir -p "$L"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN FIRE — BAKE BLAST MOVE/SCALE"
echo "============================================================"
echo "MISSION=bake Drew's accepted shotgun-blast move/scale values"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "WRITABLE=$FIRE_REL effect.position/effect.scaleX/effect.scaleY only"
echo "LOCKED=single-pose body; shear timing; all other effect properties; effect bytes; reload; atlas; manifest; renderer; every other animation"
echo "TARGET_POSITION=[100,106]"
echo "TARGET_SCALE_X=1.1"
echo "TARGET_SCALE_Y=0.75"

git status --short || true
git fetch origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"

if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi
git ls-files --others --exclude-standard > "$L/untracked.txt" || true
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"
cd "$A"

for F in "$FIRE_REL" "$RELOAD_REL" "$RENDERER_REL" "$SHELL_REL" "$EFFECT_REL" "$ATLAS_REL" "$MANIFEST_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

RELOAD_SHA="$(sha256sum "$RELOAD_REL"|awk '{print $1}')"
RENDERER_SHA="$(sha256sum "$RENDERER_REL"|awk '{print $1}')"
SHELL_SHA="$(sha256sum "$SHELL_REL"|awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL"|awk '{print $1}')"
ATLAS_SHA="$(sha256sum "$ATLAS_REL"|awk '{print $1}')"
MANIFEST_SHA="$(sha256sum "$MANIFEST_REL"|awk '{print $1}')"

cp "$FIRE_REL" "$L/fire-before.json"

echo
echo "=== VERIFY FIRE STATE + APPLY BLAST TRANSFORM ==="
python3 - "$FIRE_REL" <<'PY'
import copy,json,sys
from pathlib import Path

p=Path(sys.argv[1])
f=json.loads(p.read_text())
before=copy.deepcopy(f)

# Single-pose body state is already accepted for this campaign and must remain unchanged.
active=[x for x in f["phases"] if x["id"] in ("wide-plant","load-back","fire","settle")]
assert [x["source"] for x in active]==["brace"]*4
assert [x["deform"]["shearX"] for x in active]==[0,-0.24,0.30,0]
assert all(x["deform"]["scaleX"]==x["deform"]["scaleY"]==1 for x in active)
assert all(x["deform"]["shiftX"]==x["deform"]["shiftY"]==0 for x in active)
assert f["effect"]["controlProfile"]=="move-scale-only"

f["effect"]["position"]=[100,106]
f["effect"]["scaleX"]=1.1
f["effect"]["scaleY"]=0.75

# Guard: only the three requested blast-transform properties may differ.
def normalized(d):
    x=copy.deepcopy(d)
    x["effect"]["position"]="__AUTHORIZED_POSITION__"
    x["effect"]["scaleX"]="__AUTHORIZED_SCALE_X__"
    x["effect"]["scaleY"]="__AUTHORIZED_SCALE_Y__"
    return x

assert normalized(f)==normalized(before), "STOP: mutation escaped shotgun blast move/scale"
p.write_text(json.dumps(f,indent=2)+"\n")

print("SHOTGUN_BLAST_POSITION=[100,106]")
print("SHOTGUN_BLAST_SCALE_X=1.1")
print("SHOTGUN_BLAST_SCALE_Y=0.75")
print("OTHER_EFFECT_PROPERTIES=UNCHANGED")
print("BODY_ANIMATION=UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -eq 1 ] || { echo "STOP: expected exactly one changed file"; exit 1; }
[ "${CHANGED[0]}" = "$FIRE_REL" ] || { echo "STOP: unexpected changed file ${CHANGED[0]}"; exit 1; }

[ "$(sha256sum "$RELOAD_REL"|awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload changed"; exit 1; }
[ "$(sha256sum "$RENDERER_REL"|awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$SHELL_REL"|awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: shell changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL"|awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect bytes changed"; exit 1; }
[ "$(sha256sum "$ATLAS_REL"|awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: atlas changed"; exit 1; }
[ "$(sha256sum "$MANIFEST_REL"|awk '{print $1}')" = "$MANIFEST_SHA" ] || { echo "STOP: manifest changed"; exit 1; }

echo
echo "=== COMMIT + PUSH ==="
git add "$FIRE_REL"
git commit -m "Bake Vanguard shotgun blast transform"
REV="$(git rev-parse HEAD)"

git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || { echo "STOP: origin/main advanced; no push"; exit 1; }
git push origin HEAD:main
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$FIRE_REL" > "$L/fire-committed.json"
python3 - "$L/fire-committed.json" <<'PY'
import json,sys
f=json.load(open(sys.argv[1]))
assert f["effect"]["position"]==[100,106]
assert f["effect"]["scaleX"]==1.1
assert f["effect"]["scaleY"]==0.75
a=[x for x in f["phases"] if x["id"] in ("wide-plant","load-back","fire","settle")]
assert [x["source"] for x in a]==["brace"]*4
assert [x["deform"]["shearX"] for x in a]==[0,-0.24,0.30,0]
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT BUILD / SERVE / REVIEW ==="
cd "$P"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build

probe(){
  local base="$1" t="$L/probe.$$"
  curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$t.fire" 2>/dev/null || return 1
  local a b
  a="$(sha256sum "$t.fire"|awk '{print $1}')"
  b="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"|awk '{print $1}')"
  rm -f "$t.fire"
  [ "$a" = "$b" ]
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
