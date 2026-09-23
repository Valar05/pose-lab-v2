#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

CAMPAIGN_ID="pose-lab-v2-motion-profile-lab"
REPO_SLUG="Valar05/pose-lab-v2"
REPO_HTTPS="https://github.com/Valar05/pose-lab-v2.git"
PORT="${POSE_LAB_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/?view=motion"
SESSION="plv2-motion-profile"
STATE_ROOT="${POSE_LAB_CAMPAIGN_STATE:-$HOME/.local/state/$CAMPAIGN_ID}"
STATE_FILE="$STATE_ROOT/state.env"
LATEST_RECEIPT="$STATE_ROOT/latest-receipt.txt"
HISTORY_FILE="$STATE_ROOT/history.log"
LOG_FILE="$STATE_ROOT/campaign.log"
RUN_DIR="$STATE_ROOT/runs"
MANAGED_ROOT="$STATE_ROOT/repo"
SCRIPT_SELF="$0"

mkdir -p "$STATE_ROOT" "$RUN_DIR"

ts() { date +%s; }
iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

clip() {
  local text="$1"
  if command -v termux-clipboard-set >/dev/null 2>&1; then
    printf '%s' "$text" | termux-clipboard-set >/dev/null 2>&1 || true
  else
    printf '[campaign] clipboard unavailable\n' >&2
  fi
}

emit_receipt() {
  local text="$1"
  printf '%s\n' "$text"
  printf '%s\n' "$text" > "$LATEST_RECEIPT"
  printf '%s | %s\n' "$(iso)" "$text" >> "$HISTORY_FILE"
  clip "$text"
}

fatal() {
  local code="$1"; shift
  local msg="FAIL campaign=$CAMPAIGN_ID code=$code message=$* log=$LOG_FILE receipt=$LATEST_RECEIPT"
  emit_receipt "$msg"
  exit "$code"
}

write_state() {
  local run_id="$1" phase="$2" status="$3" started="$4" heartbeat="$5" last_action="$6" root="${7:-}" head="${8:-}" resume_of="${9:-}"
  python3 - "$STATE_FILE" "$run_id" "$phase" "$status" "$started" "$heartbeat" "$last_action" "$root" "$head" "$resume_of" "$LOG_FILE" "$LATEST_RECEIPT" <<'PY'
import sys, shlex
(path, run_id, phase, status, started, heartbeat, last_action, root, head, resume_of, log, receipt) = sys.argv[1:]
vals = {
  'RUN_ID': run_id, 'PHASE': phase, 'STATUS': status, 'STARTED_AT': started,
  'HEARTBEAT_AT': heartbeat, 'LAST_ACTION': last_action, 'ROOT': root,
  'HEAD_SHA': head, 'RESUME_OF': resume_of, 'LOG_FILE': log,
  'LATEST_RECEIPT': receipt,
}
with open(path, 'w', encoding='utf-8') as f:
  for k,v in vals.items():
    f.write(f"{k}={shlex.quote(str(v))}\n")
PY
}

load_state() {
  [ -f "$STATE_FILE" ] || return 1
  . "$STATE_FILE"
}

find_checkout() {
  if [ -n "${POSE_LAB_ROOT:-}" ] && [ -d "$POSE_LAB_ROOT/.git" ]; then
    printf '%s\n' "$POSE_LAB_ROOT"; return 0
  fi
  for candidate in \
    "$HOME/pose-lab-v2" \
    "$HOME/src/pose-lab-v2" \
    "$HOME/projects/pose-lab-v2" \
    "/storage/emulated/0/Documents/pose-lab-v2" \
    "/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
  do
    if [ -d "$candidate/.git" ]; then printf '%s\n' "$candidate"; return 0; fi
  done
  local found
  found="$(find "$HOME" -maxdepth 3 -type d -name pose-lab-v2 -print -quit 2>/dev/null || true)"
  [ -n "$found" ] && [ -d "$found/.git" ] && { printf '%s\n' "$found"; return 0; }
  return 1
}

assert_tools() {
  for cmd in git tmux python3 curl npm; do
    command -v "$cmd" >/dev/null 2>&1 || fatal 20 "missing required command: $cmd"
  done
}

campaign_canary() {
  assert_tools
  command -v setsid >/dev/null 2>&1 || fatal 20 "missing required command: setsid"
  local csession="${SESSION}-canary-$$"
  tmux new-session -d -s "$csession" "exec setsid sh -c 'sleep 300'" || fatal 21 "canary launch failed"
  sleep 0.2
  tmux has-session -t "$csession" 2>/dev/null || fatal 22 "canary session not alive"
  local pid
  pid="$(tmux list-panes -t "$csession" -F '#{pane_pid}' | head -n1)"
  [ -n "$pid" ] || fatal 23 "canary pane pid missing"
  kill -TERM "-$pid" 2>/dev/null || true
  sleep 0.2
  if tmux has-session -t "$csession" 2>/dev/null; then
    kill -KILL "-$pid" 2>/dev/null || true
    tmux kill-session -t "$csession" 2>/dev/null || true
  fi
  tmux has-session -t "$csession" 2>/dev/null && fatal 24 "out-of-band stop canary failed"
  emit_receipt "CANARY_OK campaign=$CAMPAIGN_ID process_isolation=tmux out_of_band_stop=verified"
}

launch_worker() {
  local resume_of="${1:-}"
  assert_tools
  campaign_canary >/dev/null

  if tmux has-session -t "$SESSION" 2>/dev/null; then
    fatal 30 "campaign already running; use status/follow/stop"
  fi

  local run_id="$(date +%Y%m%dT%H%M%S)-$$"
  local started="$(ts)"
  : > "$LOG_FILE"
  write_state "$run_id" "launch" "running" "$started" "$started" "commission persisted; launching worker" "" "" "$resume_of"
  printf '%s | RUN_START run=%s resume_of=%s\n' "$(iso)" "$run_id" "$resume_of" >> "$HISTORY_FILE"

  tmux new-session -d -s "$SESSION" \
    "exec setsid bash '$SCRIPT_SELF' __worker '$run_id' '$started' '$resume_of' >>'$LOG_FILE' 2>&1"

  sleep 0.2
  tmux has-session -t "$SESSION" 2>/dev/null || fatal 31 "worker failed to start"
  emit_receipt "RUNNING campaign=$CAMPAIGN_ID run=$run_id status='bash $SCRIPT_SELF status' follow='bash $SCRIPT_SELF follow' stop='bash $SCRIPT_SELF stop' receipts='bash $SCRIPT_SELF receipts'"
}

worker_update() {
  local run_id="$1" phase="$2" started="$3" action="$4" root="${5:-}" head="${6:-}" resume_of="${7:-}"
  write_state "$run_id" "$phase" "running" "$started" "$(ts)" "$action" "$root" "$head" "$resume_of"
  printf '[%s] phase=%s action=%s\n' "$(iso)" "$phase" "$action"
}

worker_fail() {
  local run_id="$1" started="$2" resume_of="$3" phase="$4" code="$5" message="$6" root="${7:-}" head="${8:-}"
  write_state "$run_id" "$phase" "failed" "$started" "$(ts)" "$message" "$root" "$head" "$resume_of"
  local tail_text
  tail_text="$(tail -n 30 "$LOG_FILE" 2>/dev/null || true)"
  local receipt="FAIL campaign=$CAMPAIGN_ID run=$run_id phase=$phase code=$code message=$message log=$LOG_FILE
$tail_text"
  printf '%s\n' "$receipt" > "$LATEST_RECEIPT"
  printf '%s | FAIL run=%s phase=%s code=%s message=%s\n' "$(iso)" "$run_id" "$phase" "$code" "$message" >> "$HISTORY_FILE"
  clip "$receipt"
  exit "$code"
}

worker_main() {
  local run_id="$1" started="$2" resume_of="$3"
  trap 'worker_fail "$run_id" "$started" "$resume_of" "unexpected" "$?" "unexpected worker failure" "${ROOT:-}" "${HEAD_SHA:-}"' ERR

  assert_tools
  worker_update "$run_id" "resolve_repo" "$started" "locating checkout" "" "" "$resume_of"

  if ROOT="$(find_checkout)"; then
    :
  else
    ROOT="${POSE_LAB_ROOT:-$HOME/pose-lab-v2}"
    worker_update "$run_id" "clone" "$started" "cloning $REPO_SLUG to $ROOT" "$ROOT" "" "$resume_of"
    mkdir -p "$(dirname "$ROOT")"
    git clone "$REPO_HTTPS" "$ROOT"
  fi

  cd "$ROOT"
  worker_update "$run_id" "verify_repo" "$started" "verifying origin and preservation boundary" "$ROOT" "" "$resume_of"
  REMOTE="$(git remote get-url origin 2>/dev/null || true)"
  case "$REMOTE" in *Valar05/pose-lab-v2*) ;; *) worker_fail "$run_id" "$started" "$resume_of" "verify_repo" 40 "wrong origin: $REMOTE" "$ROOT" "";; esac

  worker_update "$run_id" "update" "$started" "fetching origin/main" "$ROOT" "" "$resume_of"
  git fetch --prune origin main

  USE_MANAGED=0
  if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
    USE_MANAGED=1
    printf '[%s] preserve: user checkout is not on main; using managed checkout\n' "$(iso)"
  elif [ -n "$(git status --porcelain)" ]; then
    USE_MANAGED=1
    printf '[%s] preserve: user checkout is dirty; using managed checkout\n' "$(iso)"
    git status --short
  elif ! git merge-base --is-ancestor HEAD origin/main; then
    USE_MANAGED=1
    printf '[%s] preserve: user main has local/divergent commits; using managed checkout\n' "$(iso)"
  fi

  if [ "$USE_MANAGED" -eq 0 ]; then
    worker_update "$run_id" "update" "$started" "fast-forwarding user checkout" "$ROOT" "" "$resume_of"
    git merge --ff-only origin/main
  else
    worker_update "$run_id" "managed_checkout" "$started" "preserving user checkout and preparing campaign-owned current-main checkout" "$MANAGED_ROOT" "" "$resume_of"
    if [ ! -d "$MANAGED_ROOT/.git" ]; then
      rm -rf "$MANAGED_ROOT"
      git clone "$REPO_HTTPS" "$MANAGED_ROOT"
    fi
    ROOT="$MANAGED_ROOT"
    cd "$ROOT"
    MREMOTE="$(git remote get-url origin 2>/dev/null || true)"
    case "$MREMOTE" in *Valar05/pose-lab-v2*) ;; *) worker_fail "$run_id" "$started" "$resume_of" "managed_checkout" 41 "managed checkout has wrong origin: $MREMOTE" "$ROOT" "";; esac
    git fetch --prune origin main
    git checkout -B main origin/main
    git reset --hard origin/main
    git clean -fd
  fi

  HEAD_SHA="$(git rev-parse HEAD)"

  worker_update "$run_id" "dependencies" "$started" "ensuring npm dependencies" "$ROOT" "$HEAD_SHA" "$resume_of"
  if [ -f package-lock.json ]; then
    [ -d node_modules ] || npm ci
  elif [ -f package.json ]; then
    [ -d node_modules ] || npm install
  fi

  worker_update "$run_id" "build" "$started" "building Pose Lab V2" "$ROOT" "$HEAD_SHA" "$resume_of"
  npm run build

  worker_update "$run_id" "server" "$started" "starting local review server" "$ROOT" "$HEAD_SHA" "$resume_of"
  if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    worker_fail "$run_id" "$started" "$resume_of" "server" 43 "port $PORT already in use" "$ROOT" "$HEAD_SHA"
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$LOG_FILE" 2>&1 &
  SERVER_PID=$!

  READY=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then READY=1; break; fi
    sleep 0.25
  done
  [ "$READY" -eq 1 ] || worker_fail "$run_id" "$started" "$resume_of" "server" 44 "server failed readiness check" "$ROOT" "$HEAD_SHA"

  worker_update "$run_id" "verify_route" "$started" "verifying Motion Profile Lab route and module" "$ROOT" "$HEAD_SHA" "$resume_of"
  curl -fsS "$URL" | grep -q 'loading Pose Lab V2' || worker_fail "$run_id" "$started" "$resume_of" "verify_route" 45 "route did not return Pose Lab shell" "$ROOT" "$HEAD_SHA"
  curl -fsS "http://127.0.0.1:$PORT/src/motion-profile-editor.js" | grep -q 'Motion Profile Lab' || worker_fail "$run_id" "$started" "$resume_of" "verify_route" 46 "motion editor module not reachable" "$ROOT" "$HEAD_SHA"

  worker_update "$run_id" "open" "$started" "opening Motion Profile Lab on Android" "$ROOT" "$HEAD_SHA" "$resume_of"
  if command -v termux-open-url >/dev/null 2>&1; then
    termux-open-url "$URL" || true
  elif command -v am >/dev/null 2>&1; then
    am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
  fi

  write_state "$run_id" "ready" "ready" "$started" "$(ts)" "Motion Profile Lab live; heartbeat loop active" "$ROOT" "$HEAD_SHA" "$resume_of"
  git status --short > "$RUN_DIR/$run_id.git-status.txt"
  emit_receipt "READY campaign=$CAMPAIGN_ID run=$run_id url=$URL repo=$ROOT head=$HEAD_SHA tmux=$SESSION log=$LOG_FILE git_status=$RUN_DIR/$run_id.git-status.txt"

  while kill -0 "$SERVER_PID" 2>/dev/null; do
    write_state "$run_id" "ready" "ready" "$started" "$(ts)" "server healthy" "$ROOT" "$HEAD_SHA" "$resume_of"
    sleep 10
  done
  worker_fail "$run_id" "$started" "$resume_of" "server" 47 "server exited unexpectedly" "$ROOT" "$HEAD_SHA"
}

show_status() {
  if ! load_state; then
    emit_receipt "IDLE campaign=$CAMPAIGN_ID no_state=1 state=$STATE_FILE"
    return 0
  fi
  local now="$(ts)" elapsed=$((now-STARTED_AT)) age=$((now-HEARTBEAT_AT)) live="no"
  tmux has-session -t "$SESSION" 2>/dev/null && live="yes"
  emit_receipt "STATUS campaign=$CAMPAIGN_ID run=$RUN_ID status=$STATUS phase=$PHASE tmux_alive=$live heartbeat_age_s=$age elapsed_s=$elapsed last_action='$LAST_ACTION' repo='$ROOT' head='$HEAD_SHA' log='$LOG_FILE' receipt='$LATEST_RECEIPT'"
}

follow_logs() {
  [ -f "$LOG_FILE" ] || fatal 50 "log does not exist yet"
  printf '[campaign] Ctrl-C detaches log follow; it does NOT stop the campaign.\n'
  tail -n 40 -f "$LOG_FILE"
}

stop_campaign() {
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    if load_state; then
      write_state "$RUN_ID" "$PHASE" "stopped" "$STARTED_AT" "$(ts)" "stop requested; session already absent" "$ROOT" "$HEAD_SHA" "$RESUME_OF"
    fi
    emit_receipt "STOPPED campaign=$CAMPAIGN_ID session_already_absent=1"
    return 0
  fi
  local pid
  pid="$(tmux list-panes -t "$SESSION" -F '#{pane_pid}' | head -n1)"
  if [ -n "$pid" ]; then
    kill -TERM "-$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      tmux has-session -t "$SESSION" 2>/dev/null || break
      sleep 0.2
    done
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      kill -KILL "-$pid" 2>/dev/null || true
      tmux kill-session -t "$SESSION" 2>/dev/null || true
    fi
  else
    tmux kill-session -t "$SESSION" 2>/dev/null || true
  fi
  if load_state; then
    write_state "$RUN_ID" "$PHASE" "stopped" "$STARTED_AT" "$(ts)" "stopped by operator" "$ROOT" "$HEAD_SHA" "$RESUME_OF"
  fi
  emit_receipt "STOPPED campaign=$CAMPAIGN_ID tmux=$SESSION"
}

show_receipts() {
  printf '%s\n' '--- latest ---'
  [ -f "$LATEST_RECEIPT" ] && cat "$LATEST_RECEIPT" || printf '(none)\n'
  printf '%s\n' '--- recent history ---'
  [ -f "$HISTORY_FILE" ] && tail -n 20 "$HISTORY_FILE" || printf '(none)\n'
}

cmd="${1:-help}"
case "$cmd" in
  run) launch_worker "" ;;
  resume)
    local_resume=""
    if load_state; then local_resume="$RUN_ID"; fi
    launch_worker "$local_resume"
    ;;
  status) show_status ;;
  follow) follow_logs ;;
  stop) stop_campaign ;;
  receipts) show_receipts ;;
  canary) campaign_canary ;;
  __worker) worker_main "${2:?run id}" "${3:?started}" "${4:-}" ;;
  help|*)
    cat <<EOF_HELP
$CAMPAIGN_ID

Usage:
  bash $SCRIPT_SELF run
  bash $SCRIPT_SELF resume
  bash $SCRIPT_SELF status
  bash $SCRIPT_SELF follow
  bash $SCRIPT_SELF stop
  bash $SCRIPT_SELF receipts
  bash $SCRIPT_SELF canary

Stable state: $STATE_ROOT
Review URL:  $URL
EOF_HELP
    ;;
esac
