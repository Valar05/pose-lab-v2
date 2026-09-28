#!/data/data/com.termux/files/usr/bin/bash
# Shared shell helpers for repo-owned Pose Lab campaigns.
# Source this file from a sealed campaign script; do not run it directly.

set -euo pipefail
export PAGER=cat GIT_PAGER=cat

pose_campaign_stop(){ echo "STOP: $*" >&2; exit 1; }

pose_campaign_require_file(){
  [ -s "$1" ] || pose_campaign_stop "missing required file: $1"
}

pose_campaign_boot(){
  local root="$1" contract="$2"
  cd "$root"
  for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$contract"; do
    pose_campaign_require_file "$f"
    cat "$f" >/dev/null
    echo "READ=$f"
  done
  python3 tools/campaigns/campaign_core.py --root "$root" preflight --contract "$contract" --skip-diff
}

pose_campaign_author_worktree(){
  local root="$1" state_root="$2" tag="$3" revision="$4"
  local work="$state_root/$tag-$revision"
  mkdir -p "$state_root"
  if [ -e "$work" ]; then
    git -C "$root" worktree remove --force "$work" >/dev/null 2>&1 || pose_campaign_stop "could not retire stale worktree: $work"
  fi
  git -C "$root" worktree add --detach "$work" "$revision" >/dev/null
  printf '%s\n' "$work"
}

pose_campaign_check_worktree(){
  local root="$1" contract="$2"
  python3 "$root/tools/campaigns/campaign_core.py" --root "$root" check-diff --contract "$contract"
}

pose_campaign_check_staged(){
  local root="$1" contract="$2"
  python3 "$root/tools/campaigns/campaign_core.py" --root "$root" check-diff --contract "$contract" --staged
}

pose_campaign_verify(){
  local root="$1" contract="$2"
  python3 "$root/tools/campaigns/campaign_core.py" --root "$root" verify --contract "$contract"
}

pose_campaign_stage(){
  local root="$1" contract="$2"; shift 2
  [ "$#" -gt 0 ] || pose_campaign_stop "pose_campaign_stage requires at least one path"
  git -C "$root" add -- "$@"
  pose_campaign_check_staged "$root" "$contract"
}

pose_campaign_commit(){
  local root="$1" message="$2"
  git -C "$root" config user.name "Pose Lab Campaign"
  git -C "$root" config user.email "pose-lab-campaign@localhost"
  git -C "$root" commit -m "$message"
  git -C "$root" rev-parse HEAD
}

pose_campaign_write_receipt(){
  local root="$1" contract="$2" start_rev="$3" implementation_rev="$4"
  local final_rev="${5:-}" review_url="${6:-}" execution_lane="${7:-repo-owned-campaign}" human_verdict="${8:-pending}"
  local args=(--root "$root" receipt --contract "$contract" --start-revision "$start_rev" --implementation-revision "$implementation_rev" --execution-lane "$execution_lane" --human-verdict "$human_verdict")
  if [ -n "$final_rev" ]; then args+=(--final-revision "$final_rev"); fi
  if [ -n "$review_url" ]; then args+=(--review-url "$review_url"); fi
  python3 "$root/tools/campaigns/campaign_core.py" "${args[@]}"
}

pose_campaign_push_and_readback(){
  local root="$1" branch="$2" expected="$3"
  git -C "$root" push origin "HEAD:$branch"
  git -C "$root" fetch origin "$branch"
  local got
  got="$(git -C "$root" rev-parse "origin/$branch")"
  [ "$got" = "$expected" ] || pose_campaign_stop "origin/$branch readback mismatch: $got != $expected"
  echo "READBACK_OK=$got"
}

pose_campaign_free_port(){
  python3 - <<'PY'
import socket
s=socket.socket()
s.bind(("127.0.0.1",0))
print(s.getsockname()[1])
s.close()
PY
}

pose_campaign_wait_http(){
  local url="$1" pid="$2" log="$3"
  for _ in $(seq 1 50); do
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$log" >&2 || true
      pose_campaign_stop "review server exited"
    fi
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep .1
  done
  pose_campaign_stop "review server did not become ready: $url"
}
