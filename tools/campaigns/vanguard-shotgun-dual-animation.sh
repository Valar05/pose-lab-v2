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
echo " VANGUARD SHOTGUN RELOAD + FIRE REVIEW CAMPAIGN"
echo "============================================================"
echo "MISSION=expose existing Reload and Shotgun Fire candidates in the procedural dropdown and open exact-revision review"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "WRITABLE=$SHELL_REL dropdown/navigation only"
echo "LOCKED=$RENDERER_REL $RELOAD_REL $FIRE_REL $EFFECT_REL $ATLAS_REL $MANIFEST_REL"

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

RENDERER_SHA="$(sha256sum "$RENDERER_REL" | awk '{print $1}')"
RELOAD_SHA="$(sha256sum "$RELOAD_REL" | awk '{print $1}')"
FIRE_SHA="$(sha256sum "$FIRE_REL" | awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL" | awk '{print $1}')"
ATLAS_SHA="$(sha256sum "$ATLAS_REL" | awk '{print $1}')"
MANIFEST_SHA="$(sha256sum "$MANIFEST_REL" | awk '{print $1}')"

echo
echo "=== VERIFY SHOTGUN AUTHORITY ==="
python3 - "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL" <<'PY'
import json,sys
reload=json.load(open(sys.argv[1]))
fire=json.load(open(sys.argv[2]))
manifest=json.load(open(sys.argv[3]))

canon="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert reload["atlases"]["vanguard-canonical"]["path"]==canon
assert fire["atlases"]["vanguard-canonical"]["path"]==canon
assert [reload["sources"][k]["cell"] for k in ("open","shell","close")]==[97,98,99]
assert [fire["sources"][k]["cell"] for k in ("brace","drive","recoil")]==[100,101,102]
assert reload["sources"]["muzzle"]["path"]=="assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
assert fire["sources"]["muzzle"]["path"]=="assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
assert manifest["newCells"]["97"]=="shotgun reload open"
assert manifest["newCells"]["100"]=="shotgun fire brace"
print("SHOTGUN_AUTHORITY=PASS")
PY

echo
echo "=== ENSURE DROPDOWN + CACHE-BUSTED NAVIGATION ==="
python3 - "$SHELL_REL" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()

anchor='      <option value="vanguard-attack5">Vanguard · Attack 5 Jab</option>'
reload_opt='      <option value="vanguard-shotgun-reload">Vanguard · Shotgun Reload</option>'
fire_opt='      <option value="vanguard-shotgun-fire">Vanguard · Shotgun Fire</option>'

if reload_opt not in s or fire_opt not in s:
    assert anchor in s, "STOP: dropdown anchor changed"
    block=anchor+"\n"+reload_opt+"\n"+fire_opt
    s=s.replace(anchor,block,1)

old="""  select.onchange=()=>{
    const p=new URLSearchParams(location.search);
    const rev=p.get('rev');
    location.href='./motion.html?procedural='+encodeURIComponent(select.value)+(rev?'&rev='+encodeURIComponent(rev):'');
  };"""
new="""  select.onchange=()=>{
    const p=new URLSearchParams(location.search);
    const rev=p.get('rev');
    const nocache=p.get('nocache');
    location.href='./motion.html?procedural='+encodeURIComponent(select.value)
      +(rev?'&rev='+encodeURIComponent(rev):'')
      +(nocache?'&nocache='+encodeURIComponent(nocache):'');
  };"""
if old in s:
    s=s.replace(old,new,1)

assert reload_opt in s
assert fire_opt in s
assert "const nocache=p.get('nocache');" in s
assert "+(nocache?'&nocache='+encodeURIComponent(nocache):'');" in s

p.write_text(s)
print("DROPDOWN=PASS")
print("REV_PRESERVATION=PASS")
print("NOCACHE_PRESERVATION=PASS")
PY

node --check "$SHELL_REL"
node --check "$RENDERER_REL"

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
if [ "\${#CHANGED[@]}" -gt 0 ]; then
  printf 'changed=%s\n' "\${CHANGED[@]}"
  [ "\${#CHANGED[@]}" -eq 1 ] || { echo "STOP: more than one file changed"; exit 1; }
  [ "\${CHANGED[0]}" = "$SHELL_REL" ] || { echo "STOP: unauthorized diff \${CHANGED[0]}"; exit 1; }
fi

[ "$(sha256sum "$RENDERER_REL" | awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$RELOAD_REL" | awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload recipe changed"; exit 1; }
[ "$(sha256sum "$FIRE_REL" | awk '{print $1}')" = "$FIRE_SHA" ] || { echo "STOP: fire recipe changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL" | awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect changed"; exit 1; }
[ "$(sha256sum "$ATLAS_REL" | awk '{print $1}')" = "$ATLAS_SHA" ] || { echo "STOP: atlas changed"; exit 1; }
[ "$(sha256sum "$MANIFEST_REL" | awk '{print $1}')" = "$MANIFEST_SHA" ] || { echo "STOP: manifest changed"; exit 1; }

if ! git diff --quiet; then
  echo
  echo "=== COMMIT + PUSH DROPDOWN INFRASTRUCTURE ==="
  git add "$SHELL_REL"
  git commit -m "Expose Vanguard shotgun reviews in dropdown"
  REV="$(git rev-parse HEAD)"

  git fetch origin main
  [ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
    echo "STOP: origin/main advanced during campaign; no push performed"
    exit 1
  }
  git push origin HEAD:main
else
  REV="$ORIGIN_HEAD"
  echo "DROPDOWN_ALREADY_PRESENT=YES"
fi

echo "REV=$REV"

echo
echo "=== COMMITTED / REVISION READBACK ==="
git show "$REV:$SHELL_REL" > "$L/procedural-review-shell.js"
grep -Fq '<option value="vanguard-shotgun-reload">Vanguard · Shotgun Reload</option>' "$L/procedural-review-shell.js"
grep -Fq '<option value="vanguard-shotgun-fire">Vanguard · Shotgun Fire</option>' "$L/procedural-review-shell.js"
grep -Fq "const nocache=p.get('nocache');" "$L/procedural-review-shell.js"
echo "READBACK=PASS"

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
  if ! curl -fsS "$base/src/procedural-review-shell.js" > "$tmp.shell" 2>/dev/null; then
    rm -f "$tmp.shell" "$tmp.reload" "$tmp.fire"
    return 1
  fi
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-reload.recipe.json" > "$tmp.reload" 2>/dev/null; then
    rm -f "$tmp.shell" "$tmp.reload" "$tmp.fire"
    return 1
  fi
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$tmp.fire" 2>/dev/null; then
    rm -f "$tmp.shell" "$tmp.reload" "$tmp.fire"
    return 1
  fi
  local ss bs sr br sf bf
  ss="$(sha256sum "$tmp.shell" | awk '{print $1}')"
  bs="$(sha256sum "$W/dist/src/procedural-review-shell.js" | awk '{print $1}')"
  sr="$(sha256sum "$tmp.reload" | awk '{print $1}')"
  br="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json" | awk '{print $1}')"
  sf="$(sha256sum "$tmp.fire" | awk '{print $1}')"
  bf="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json" | awk '{print $1}')"
  rm -f "$tmp.shell" "$tmp.reload" "$tmp.fire"
  [ "$ss" = "$bs" ] && [ "$sr" = "$br" ] && [ "$sf" = "$bf" ]
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
echo " SHOTGUN DROPDOWN REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RU"
