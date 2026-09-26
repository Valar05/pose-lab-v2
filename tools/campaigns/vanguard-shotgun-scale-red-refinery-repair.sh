#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-refine"
W="$L/review"

RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"
ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"

cd "$P"
mkdir -p "$L"

cat \
  AGENTS.md \
  docs/POSE_LAB_CAMPAIGN_RULES.md \
  docs/POSE_IS_GOD.md \
  docs/VANGUARD_ATLAS_AUTHORITY.md \
  >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN V3 EXACT-REVIEW CAMPAIGN"
echo "============================================================"
echo "MISSION=review the already-landed smaller/redder shotgun v3 candidate"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "MUTATION=NONE"
echo "LOCKED=all creative files"
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

REV="$ORIGIN_HEAD"

echo
echo "=== VERIFY LANDED V3 STATE FROM ORIGIN/MAIN ==="
TMP="$L/verify"
rm -rf "$TMP"
mkdir -p "$TMP"

git show "$REV:$RELOAD_REL" > "$TMP/reload.json"
git show "$REV:$FIRE_REL" > "$TMP/fire.json"
git show "$REV:$MANIFEST_REL" > "$TMP/manifest.json"

python3 - "$TMP/reload.json" "$TMP/fire.json" "$TMP/manifest.json" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
f=json.load(open(sys.argv[2]))
m=json.load(open(sys.argv[3]))

assert r["stage"]["centerX"]==215
assert f["stage"]["centerX"]==215
assert [r["sources"][k]["cell"] for k in ("open","shell","close")]==[97,98,99]
assert [f["sources"][k]["cell"] for k in ("brace","drive","recoil")]==[100,101,102]

ref=m.get("refinement",{})
assert ref.get("kind")=="shotgun-size-red-v3"
assert ref.get("humanVerdict")=="pending"
assert ref.get("targetForegroundHeight")==67
assert ref.get("relativeScaleFromPreviousCandidate")==0.9

placements=ref.get("placements",{})
assert set(placements)==set(str(i) for i in range(97,103))
for cell in range(97,103):
    w=placements[str(cell)][2]
    h=placements[str(cell)][3]
    assert 59 <= w <= 66
    assert 66 <= h <= 67

color=ref.get("color",{})
assert color.get("rMultiplier")==1.07
assert color.get("gMultiplier")==0.91
assert color.get("bMultiplier")==0.88
assert color.get("saturation")==1.10

print("SHOTGUN_SIZE_RED_V3=ALREADY_APPLIED")
print("CENTER_X=215")
print("CELLS_97_102=VERIFIED")
print("TARGET_HEIGHT=67")
print("RED_V3=VERIFIED")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build

echo
echo "=== VERIFY BUILT DEPENDENCIES ==="
test -f "$W/dist/$RELOAD_REL"
test -f "$W/dist/$FIRE_REL"
test -f "$W/dist/$ATLAS_REL"
echo "BUILD_DEPENDENCIES=PASS"

echo
echo "=== SERVE EXACT REVISION ==="

probe_exact_server() {
  local base="$1"
  local stem="$L/probe.$$"
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-reload.recipe.json" > "$stem.reload" 2>/dev/null; then
    rm -f "$stem.reload" "$stem.fire" "$stem.shell"
    return 1
  fi
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$stem.fire" 2>/dev/null; then
    rm -f "$stem.reload" "$stem.fire" "$stem.shell"
    return 1
  fi
  if ! curl -fsS "$base/src/procedural-review-shell.js" > "$stem.shell" 2>/dev/null; then
    rm -f "$stem.reload" "$stem.fire" "$stem.shell"
    return 1
  fi

  local ok=0
  [ "$(sha256sum "$stem.reload" | awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json" | awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$stem.fire" | awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json" | awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$stem.shell" | awk '{print $1}')" = "$(sha256sum "$W/dist/src/procedural-review-shell.js" | awk '{print $1}')" ] || ok=1

  rm -f "$stem.reload" "$stem.fire" "$stem.shell"
  [ "$ok" -eq 0 ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"

  if probe_exact_server "$CANDIDATE"; then
    BASE_URL="$CANDIDATE"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi

  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" > "$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1

  if kill -0 "$PID" 2>/dev/null; then
    if probe_exact_server "$CANDIDATE"; then
      BASE_URL="$CANDIDATE"
      echo "$PID" > "$L/server.pid"
      echo "$PORT" > "$L/server.port"
      echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"
      break
    fi
    kill "$PID" 2>/dev/null || true
  fi
done

[ -n "$BASE_URL" ] || {
  echo "STOP: no exact review server available in 8766..8775"
  exit 1
}

STAMP="$(date +%s)"
RU="$BASE_URL/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " SHOTGUN V3 REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

echo
echo "=== OPEN REVIEW ==="
OPENED=0

if command -v termux-open-url >/dev/null 2>&1; then
  if termux-open-url "$RU" >/dev/null 2>&1; then
    OPENED=1
    echo "BROWSER_OPEN=termux-open-url"
  fi
fi

if [ "$OPENED" -eq 0 ] && command -v am >/dev/null 2>&1; then
  if am start -a android.intent.action.VIEW -d "$RU" >/dev/null 2>&1; then
    OPENED=1
    echo "BROWSER_OPEN=am"
  fi
fi

if [ "$OPENED" -eq 0 ] && command -v cmd >/dev/null 2>&1; then
  if cmd activity start-activity -a android.intent.action.VIEW -d "$RU" >/dev/null 2>&1; then
    OPENED=1
    echo "BROWSER_OPEN=cmd-activity"
  fi
fi

[ "$OPENED" -eq 1 ] || {
  echo "STOP: exact review is ready but Android browser launch failed"
  echo "OPEN_THIS_URL=$RU"
  exit 1
}
