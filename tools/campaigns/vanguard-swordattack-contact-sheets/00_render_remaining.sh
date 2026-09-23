#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY_DIR="$REPO_ROOT/generated/vanguard-swordattack-contact-sheets/campaign-runs/$STAMP"
SUMMARY="$SUMMARY_DIR/CLIPBOARD.txt"
LOG="$SUMMARY_DIR/run.log"
SAMPLES="${SAMPLES:-9}"

mkdir -p "$SUMMARY_DIR"

copy_clipboard() {
  if command -v termux-clipboard-set >/dev/null 2>&1; then
    termux-clipboard-set < "$SUMMARY" || true
  fi
}

overall=0
{
  echo "VANGUARD SWORD ATTACK CONTACT SHEET CAMPAIGN"
  echo "status=RUNNING"
  echo "samples=$SAMPLES"
  echo "repo=$REPO_ROOT"
  echo

  cd "$REPO_ROOT"

  for n in 2 3 4 5; do
    action="SwordAttack$n"
    echo "============================================================"
    echo "[campaign] $action"
    echo "============================================================"
    if bash "$SCRIPT_DIR/run_action.sh" "$action" "$SAMPLES"; then
      echo "[campaign-result] $action SUCCESS"
    else
      code=$?
      overall=1
      echo "[campaign-result] $action ERROR exit_code=$code"
    fi
    echo
  done

  echo "============================================================"
  echo "ATTACH THESE FILES"
  echo "============================================================"
  for n in 1 2 3 4 5; do
    p="/storage/emulated/0/Download/SwordAttack${n}_contact_sheet.png"
    if [ -s "$p" ]; then
      echo "$p"
    else
      echo "MISSING: $p"
      [ "$n" -eq 1 ] || overall=1
    fi
  done
} 2>&1 | tee "$LOG"

{
  if [ "$overall" -eq 0 ]; then
    echo "VANGUARD SWORD ATTACK CONTACT SHEET CAMPAIGN"
    echo "status=SUCCESS"
  else
    echo "VANGUARD SWORD ATTACK CONTACT SHEET CAMPAIGN"
    echo "status=PARTIAL_OR_ERROR"
  fi
  echo "samples=$SAMPLES"
  echo "summary_log=$LOG"
  echo
  echo "ATTACH THESE FILES:"
  for n in 1 2 3 4 5; do
    p="/storage/emulated/0/Download/SwordAttack${n}_contact_sheet.png"
    if [ -s "$p" ]; then
      echo "$p"
    else
      echo "MISSING: $p"
    fi
  done
  echo
  echo "---- LAST LOG LINES ----"
  tail -n 180 "$LOG"
} > "$SUMMARY"

copy_clipboard
cat "$SUMMARY"
exit "$overall"
