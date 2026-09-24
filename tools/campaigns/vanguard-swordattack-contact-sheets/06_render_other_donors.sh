#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_DIR="$REPO_ROOT/generated/vanguard-donor-contact-sheets/campaign-runs/$STAMP"
SUMMARY="$SUMMARY_DIR/CLIPBOARD.txt"
LOG="$SUMMARY_DIR/run.log"

mkdir -p "$SUMMARY_DIR"

# Skip 0T-Pose and SwordAttack1-5; those sword sheets are already harvested.
ACTIONS=(
  ClubIdle
  Idle
  Jump
  JumpCrouch
  JumpForward
  Land
  LedgeClimb
  LedgeGrab
  LedgeGrabHang
  Midair
  MidairSwordAttack1
  MidairSwordAttack2
  RunForwardOld
  SpinAttack
)

samples_for() {
  case "$1" in
    MidairSwordAttack1|MidairSwordAttack2|SpinAttack) echo 9 ;;
    *) echo 6 ;;
  esac
}

overall=0
{
  echo "VANGUARD 3D DONOR HARVEST"
  echo "status=RUNNING"
  echo "repo=$REPO_ROOT"
  echo "actions=${#ACTIONS[@]}"
  echo

  cd "$REPO_ROOT"

  for action in "${ACTIONS[@]}"; do
    samples="$(samples_for "$action")"
    echo "============================================================"
    echo "[harvest] $action samples=$samples"
    echo "============================================================"
    if bash "$SCRIPT_DIR/run_action.sh" "$action" "$samples"; then
      echo "[harvest-result] $action SUCCESS"
    else
      code=$?
      overall=1
      echo "[harvest-result] $action ERROR exit_code=$code"
    fi
    echo
  done

  echo "============================================================"
  echo "ATTACHABLE DOWNLOADS"
  echo "============================================================"
  for action in "${ACTIONS[@]}"; do
    p="/storage/emulated/0/Download/${action}_contact_sheet.png"
    if [ -s "$p" ]; then
      echo "$p"
    else
      echo "MISSING: $p"
    fi
  done
} 2>&1 | tee "$LOG"

{
  echo "VANGUARD 3D DONOR HARVEST"
  if [ "$overall" -eq 0 ]; then
    echo "status=SUCCESS"
  else
    echo "status=PARTIAL_OR_ERROR"
  fi
  echo "summary_log=$LOG"
  echo
  echo "ATTACHABLE DOWNLOADS:"
  for action in "${ACTIONS[@]}"; do
    p="/storage/emulated/0/Download/${action}_contact_sheet.png"
    if [ -s "$p" ]; then
      echo "$p"
    else
      echo "MISSING: $p"
    fi
  done
  echo
  echo "---- LAST LOG LINES ----"
  tail -n 220 "$LOG"
} > "$SUMMARY"

if command -v termux-clipboard-set >/dev/null 2>&1; then
  termux-clipboard-set < "$SUMMARY" || true
fi

cat "$SUMMARY"
exit "$overall"
