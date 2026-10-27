#!/usr/bin/env bash
set -Eeuo pipefail
SELF="$(realpath "$0")"
ROOT="$(cd "$(dirname "$SELF")/../.." && pwd -P)"
cd "$ROOT"
[[ -f AGENTS.md && -f motion.html && -f docs/POSE_LAB_CAMPAIGN_RULES.md && -f docs/POSE_IS_GOD.md ]] || { echo BLOCKED=WRONG_REPO; exit 2; }
[[ "$(git rev-parse --show-toplevel)" = "$ROOT" ]] || exit 2
REMOTE="$(git remote get-url origin)"
case "$REMOTE" in https://github.com/Valar05/pose-lab-v2|https://github.com/Valar05/pose-lab-v2.git|git@github.com:Valar05/pose-lab-v2.git) ;; *) echo BLOCKED=WRONG_REMOTE; exit 2;; esac
echo "RESOLVED_REPO=$ROOT"
echo "EXECUTION_DIR=$PWD"
echo "BRANCH=$(git branch --show-current)"
echo "HEAD=$(git rev-parse HEAD)"
for f in docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/POSE_CAMPAIGN_FRAMEWORK.md; do [[ -s "$f" ]] || exit 3; echo "DOCTRINE=$f"; done
[[ "$(git branch --show-current)" = main ]] || { echo BLOCKED=NOT_MAIN; exit 3; }
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || { echo BLOCKED=DIRTY_CHECKOUT; exit 3; }
for tool in git node python3 curl sha256sum; do command -v "$tool" >/dev/null || { echo "BLOCKED=MISSING_$tool"; exit 4; }; done
git fetch --no-tags origin main
git merge --ff-only origin/main
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || { echo BLOCKED=DIRTY_AFTER_UPDATE; exit 3; }
SHA="$(git rev-parse HEAD)"
echo "REVISION=$SHA"
ASSET=public/assets/boneforge-titan/boneforge_titan_rigged_pbr.glb
[[ -s "$ASSET" ]] || { echo BLOCKED=BONEFORGE_MISSING_ON_MAIN; exit 5; }
grep -Fq "'boneforge-titan'" src/main.js || { echo BLOCKED=MODEL_UNREGISTERED; exit 5; }
node scripts/build.mjs
[[ -s dist/motion.html && -s dist/src/main.js && -s "dist/$ASSET" ]] || { echo BLOCKED=BUILD_INCOMPLETE; exit 5; }
PORT=4189
STATE="$HOME/.local/state/pose-lab-fpv-main"
mkdir -p "$STATE"
PIDFILE="$STATE/server.pid"
LOG="$STATE/server.log"
if [[ -s "$PIDFILE" ]]; then
  OLD="$(cat "$PIDFILE")"
  if kill -0 "$OLD" 2>/dev/null; then
    echo "BLOCKED=SERVER_ALREADY_RUNNING_PID_$OLD"
    echo "REVIEW=http://127.0.0.1:$PORT/motion.html?model=boneforge-titan&view=fpv"
    exit 0
  fi
fi
if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/motion.html" >/dev/null 2>&1; then
  echo BLOCKED=PORT_IN_USE_BY_OTHER_SERVER; exit 6
fi
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/dist" >"$LOG" 2>&1 </dev/null &
PID=$!
echo "$PID" > "$PIDFILE"
OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/motion.html" >/dev/null 2>&1 && curl -fsS --max-time 5 "http://127.0.0.1:$PORT/assets/boneforge-titan/boneforge_titan_rigged_pbr.glb" -o /dev/null 2>&1; then OK=1; break; fi
  sleep 1
done
[[ "$OK" == 1 ]] || { echo BLOCKED=SERVER_START; tail -20 "$LOG"; exit 7; }
printf '{"revision":"%s","pid":%s,"model_sha256":"%s","status":"http-ready-human-review-pending"}\n' "$SHA" "$PID" "$(sha256sum "$ASSET" | cut -d' ' -f1)" >"$STATE/receipt.json"
echo "RECEIPT=$STATE/receipt.json"
echo "SERVER_PID=$PID"
echo "REVIEW=http://127.0.0.1:$PORT/motion.html?model=boneforge-titan&view=fpv"
echo STATUS=HTTP_READY_HUMAN_REVIEW_PENDING
