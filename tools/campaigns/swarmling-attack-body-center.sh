#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/swarmling-attack-body-center.contract.json"
HELPER="tools/campaigns/apply_swarmling_attack_body_center.py"
SELF="tools/campaigns/swarmling-attack-body-center.sh"
ATLAS="public/assets/vanguard/fleshpunk/characters/swarmling/source/swarmling-approved-atlas.png"
MANIFEST="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
PREVIEW="src/procedural-swarmling-preview.js"
TEST="tools/test_swarmling_attacks.mjs"
RECEIPT="campaigns/swarmling-attack-body-center.receipt.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"

for f in "$CONTRACT" "$HELPER" "$SELF"; do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

AUTHOR="$STATE/swarmling-attack-center-$SEALED"
mkdir -p "$STATE"
if [ -e "$AUTHOR" ]; then
  git worktree remove --force "$AUTHOR" 2>/dev/null || stop "stale author worktree"
fi
git worktree add --detach "$AUTHOR" "$SEALED" >/dev/null
cd "$AUTHOR"

echo "=== STICKY BOOT ==="
for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing required rule/contract: $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

echo "=== APPLY ATTACK CENTERING ==="\necho "TEST_EXPECTATIONS=PER_ATTACK_STAGE_ANCHORS_V2"
python3 "$HELPER" "$ATLAS" "$MANIFEST"

echo "=== VERIFY ==="
python3 - "$MANIFEST" "$PREVIEW" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[1]).read_text())
p=Path(sys.argv[2]).read_text()

run=next(a for a in m["animations"] if a["id"]=="run")
if any(f["anchorPoint"]!=[128,249] for f in run["frames"]):
    raise SystemExit("STOP: Run anchors changed")

for aid in ("jab","rake","scythe-bloom"):
    a=next(x for x in m["animations"] if x["id"]==aid)
    if a.get("rootMotion") is not False:
        raise SystemExit(f"STOP: {aid} root motion changed")
    if a.get("stageAnchor",[None,None])[1] != 226:
        raise SystemExit(f"STOP: {aid} stage Y changed")
    if a.get("centeringAuthority",{}).get("mode")!="weighted-body-core-vs-pinned-foot":
        raise SystemExit(f"STOP: {aid} centering authority missing")

jab=next(a for a in m["animations"] if a["id"]=="jab")
if jab["frames"][1]["sourceCell"]!=15:
    raise SystemExit("STOP: Needle Jab impact changed")

if "const presentationScale=1.5;" not in p:
    raise SystemExit("STOP: presentation scale changed")

print("attack_centering_lock_check=PASS")
for aid in ("jab","rake","scythe-bloom"):
    a=next(x for x in m["animations"] if x["id"]==aid)
    print(f"{aid}_stageAnchor={a['stageAnchor']}")
PY

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke
git diff --check

echo "=== STAGE IMPLEMENTATION ==="
git add "$MANIFEST"
for p in $(git diff --cached --name-only); do
  case "$p" in
    "$MANIFEST") ;;
    *) stop "unauthorized staged path: $p" ;;
  esac
done

git config user.name "Pose Lab Campaign"
git config user.email "pose-lab-campaign@localhost"
git commit -m "Center Swarmling attacks around body core"
IMPLEMENTATION="$(git rev-parse HEAD)"

echo "=== CREATE RECEIPT ==="
python3 - "$RECEIPT" "$SEALED" "$IMPLEMENTATION" "$MANIFEST" <<'PY'
from pathlib import Path
import json,sys
m=json.loads(Path(sys.argv[4]).read_text())
anchors={
    a["id"]:a["stageAnchor"]
    for a in m["animations"]
    if a["id"] in {"jab","rake","scythe-bloom"}
}
Path(sys.argv[1]).write_text(json.dumps({
  "schema":"pose-lab-v2-campaign-receipt-v1",
  "campaign":"swarmling-attack-body-center-v1",
  "status":"implemented-awaiting-human-review",
  "sealedRevision":sys.argv[2],
  "implementationRevision":sys.argv[3],
  "attackStageAnchors":anchors,
  "runUntouched":True,
  "atlasPixelsChanged":False,
  "needleJabImpactCell":15,
  "presentationScale":1.5,
  "rootMotion":False,
  "humanVerdict":"pending"
},indent=2)+"\n")
PY

git add "$RECEIPT"
git commit -m "Record Swarmling attack centering receipt"
FINAL="$(git rev-parse HEAD)"

echo "=== PUSH + READBACK ==="
git push origin "HEAD:main"
git fetch origin main
[ "$(git rev-parse origin/main)" = "$FINAL" ] || stop "origin/main readback mismatch"

if [ -d "$LIVE" ]; then
  git -C "$ROOT" worktree remove --force "$LIVE" 2>/dev/null || stop "stale live worktree"
fi
git -C "$ROOT" worktree add --detach "$LIVE" "$FINAL" >/dev/null
cd "$LIVE"

node "$TEST"
node --check "$PREVIEW"
npm run test:2d
npm run build
npm run smoke

PORT="$(python3 - <<'PY'
import socket
s=socket.socket(); s.bind(('127.0.0.1',0)); print(s.getsockname()[1]); s.close()
PY
)"
BASE="http://127.0.0.1:$PORT"
LOG="$STATE/server-$PORT.log"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$LIVE/dist" >"$LOG" 2>&1 &
PID=$!

READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "$PID" 2>/dev/null; then cat "$LOG" >&2 || true; stop "review server exited"; fi
  if curl -fsS "$BASE/motion.html?rev=$FINAL" >/dev/null 2>&1; then READY=1; break; fi
  sleep .1
done
[ "$READY" = 1 ] || stop "review server not ready"

STAMP="$(date +%s)"
JAB="$BASE/motion.html?procedural=swarmling-jab&rev=$FINAL&nocache=$STAMP"
RAKE="$BASE/motion.html?procedural=swarmling-rake&rev=$FINAL&nocache=$STAMP"
BLOOM="$BASE/motion.html?procedural=swarmling-scythe-bloom&rev=$FINAL&nocache=$STAMP"

echo "=== REVIEW ==="
echo "FINAL_REV=$FINAL"
echo "JAB=$JAB"
echo "RAKE=$RAKE"
echo "SCYTHE_BLOOM=$BLOOM"
echo "ATTACK_CENTERING=WEIGHTED_BODY_CORE"
echo "RUN=UNTOUCHED"
echo "JAB_IMPACT_CELL=15"
echo "ROOT_MOTION=OFF"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$JAB" >/dev/null 2>&1 || true
