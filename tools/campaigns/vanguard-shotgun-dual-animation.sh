#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun"
A="$L/authoring"
W="$L/review"

SHELL_REL="src/procedural-review-shell.js"
RENDERER_REL="src/procedural-motion-preview.js"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"

cd "$P"
mkdir -p "$L"

cat \
  AGENTS.md \
  docs/POSE_LAB_CAMPAIGN_RULES.md \
  docs/POSE_IS_GOD.md \
  docs/VANGUARD_ATLAS_AUTHORITY.md \
  >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN RIGHT-NUDGE CAMPAIGN"
echo "============================================================"
echo "MISSION=nudge Reload and Shotgun Fire 6px right as whole composites"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "WRITABLE=$RELOAD_REL stage.centerX only"
echo "WRITABLE+=$FIRE_REL stage.centerX only"
echo "LOCKED=atlas pixels; source cells 97-102; effect bytes/placement; timing; deformation; renderer; dropdown; every other recipe"
echo "TARGET_CENTER_X=221"

echo
echo "=== DIRTY / DIVERGENCE PREFLIGHT ==="
git status --short || true
git fetch origin main

LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"

if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline --decorate "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi
git ls-files --others --exclude-standard > "$L/untracked.txt" || true
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

echo
echo "=== CLEAN AUTHORING WORKTREE FROM ORIGIN/MAIN ==="
git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"
cd "$A"

for F in "$SHELL_REL" "$RENDERER_REL" "$RELOAD_REL" "$FIRE_REL" "$EFFECT_REL" "$ATLAS_REL" "$MANIFEST_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

SHELL_SHA="$(sha256sum "$SHELL_REL" | awk '{print $1}')"
RENDERER_SHA="$(sha256sum "$RENDERER_REL" | awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL" | awk '{print $1}')"
ATLAS_SHA="$(sha256sum "$ATLAS_REL" | awk '{print $1}')"
MANIFEST_SHA="$(sha256sum "$MANIFEST_REL" | awk '{print $1}')"

cp "$RELOAD_REL" "$L/reload-before.json"
cp "$FIRE_REL" "$L/fire-before.json"

echo
echo "=== VERIFY AUTHORITY + APPLY RIGHT NUDGE ==="
python3 - "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL" <<'PY'
import copy,json,sys
from pathlib import Path

rp,fp,mp=map(Path,sys.argv[1:])
reload=json.loads(rp.read_text())
fire=json.loads(fp.read_text())
manifest=json.loads(mp.read_text())

canon="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

for name,d in (("reload",reload),("fire",fire)):
    assert d["atlases"]["vanguard-canonical"]["path"]==canon
    assert d["stage"]["centerSource"]=="idle"
    assert d["stage"]["centerX"]==215, f"STOP: {name} stage.centerX changed: {d['stage']['centerX']}"

assert [reload["sources"][k]["cell"] for k in ("open","shell","close")]==[97,98,99]
assert [fire["sources"][k]["cell"] for k in ("brace","drive","recoil")]==[100,101,102]
assert reload["sources"]["muzzle"]["path"]=="assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
assert fire["sources"]["muzzle"]["path"]=="assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
assert manifest["newCells"]["97"]=="shotgun reload open"
assert manifest["newCells"]["100"]=="shotgun fire brace"

reload_before=copy.deepcopy(reload)
fire_before=copy.deepcopy(fire)

reload["stage"]["centerX"]=221
fire["stage"]["centerX"]=221

def normalized(d):
    x=copy.deepcopy(d)
    x["stage"]["centerX"]="__AUTHORIZED_CENTER_X__"
    return x

assert normalized(reload)==normalized(reload_before), "STOP: reload mutation escaped stage.centerX"
assert normalized(fire)==normalized(fire_before), "STOP: fire mutation escaped stage.centerX"

rp.write_text(json.dumps(reload,indent=2)+"\n")
fp.write_text(json.dumps(fire,indent=2)+"\n")

print("RELOAD_CENTER_X=215->221")
print("FIRE_CENTER_X=215->221")
print("NUDGE=+6px")
print("CELLS_97_102=UNCHANGED")
print("EFFECT=UNCHANGED")
print("TIMING=UNCHANGED")
print("DEFORMATION=UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "\${CHANGED[@]}"
[ "\${#CHANGED[@]}" -eq 2 ] || { echo "STOP: expected exactly two changed files"; exit 1; }
printf '%s\n' "\${CHANGED[@]}" | grep -Fxq "$RELOAD_REL"
printf '%s\n' "\${CHANGED[@]}" | grep -Fxq "$FIRE_REL"

[ "$(sha256sum "$SHELL_REL" | awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: dropdown shell changed"; exit 1; }
[ "$(sha256sum "$RENDERER_REL" | awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL" | awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect changed"; exit 1; }
[ "$(sha256sum "$ATLAS_REL" | awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: atlas changed"; exit 1; }
[ "$(sha256sum "$MANIFEST_REL" | awk '{print $1}')" = "$MANIFEST_SHA" ] || { echo "STOP: manifest changed"; exit 1; }

echo
echo "=== COMMIT + PUSH ==="
git add "$RELOAD_REL" "$FIRE_REL"
git commit -m "Nudge Vanguard shotgun animations right"
REV="$(git rev-parse HEAD)"

git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
  echo "STOP: origin/main advanced during campaign; no push performed"
  exit 1
}
git push origin HEAD:main

echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$RELOAD_REL" > "$L/reload-committed.json"
git show "$REV:$FIRE_REL" > "$L/fire-committed.json"

python3 - "$L/reload-committed.json" "$L/fire-committed.json" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
f=json.load(open(sys.argv[2]))
assert r["stage"]["centerX"]==221
assert f["stage"]["centerX"]==221
assert [r["sources"][k]["cell"] for k in ("open","shell","close")]==[97,98,99]
assert [f["sources"][k]["cell"] for k in ("brace","drive","recoil")]==[100,101,102]
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
cd "$P"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check "$SHELL_REL"
node --check "$RENDERER_REL"
npm run build

echo
echo "=== SERVE EXACT REVISION ==="

probe_exact_server() {
  local base="$1" tmp="$L/probe.$$"
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-reload.recipe.json" > "$tmp.reload" 2>/dev/null; then
    rm -f "$tmp.reload" "$tmp.fire"
    return 1
  fi
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$tmp.fire" 2>/dev/null; then
    rm -f "$tmp.reload" "$tmp.fire"
    return 1
  fi
  local sr br sf bf
  sr="$(sha256sum "$tmp.reload" | awk '{print $1}')"
  br="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json" | awk '{print $1}')"
  sf="$(sha256sum "$tmp.fire" | awk '{print $1}')"
  bf="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json" | awk '{print $1}')"
  rm -f "$tmp.reload" "$tmp.fire"
  [ "$sr" = "$br" ] && [ "$sf" = "$bf" ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"
  if probe_exact_server "$CANDIDATE"; then
    BASE_URL="$CANDIDATE"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi

  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    BASE_URL="$CANDIDATE"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED PORT=$PORT PID=$PID"
    break
  fi
done

[ -n "$BASE_URL" ] || { echo "STOP: no review port available in 8766..8775"; exit 1; }
probe_exact_server "$BASE_URL" || { echo "STOP: selected server does not serve exact built bytes"; exit 1; }

STAMP="$(date +%s)"
RU="$BASE_URL/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " SHOTGUN RIGHT-NUDGE REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RU"
