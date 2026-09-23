#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 SwordAttackN [samples]" >&2
  exit 2
fi

ACTION="$1"
SAMPLES="${2:-${SAMPLES:-9}}"

case "$ACTION" in
  SwordAttack1|SwordAttack2|SwordAttack3|SwordAttack4|SwordAttack5) ;;
  *)
    echo "[error] unsupported action: $ACTION" >&2
    exit 3
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$REPO_ROOT/generated/vanguard-swordattack-contact-sheets/$ACTION/$STAMP"
LOG="$OUT_DIR/run.log"
RECEIPT="$OUT_DIR/CLIPBOARD.txt"
SHEET="$OUT_DIR/${ACTION}_contact_sheet.png"
DOWNLOAD_SHEET="/storage/emulated/0/Download/${ACTION}_contact_sheet.png"
ASSET="$REPO_ROOT/public/assets/vanguard/vanguard_rigged_animations.glb"

mkdir -p "$OUT_DIR"

copy_receipt() {
  if command -v termux-clipboard-set >/dev/null 2>&1; then
    termux-clipboard-set < "$RECEIPT" || true
  fi
}

finish() {
  code=$?
  {
    echo "VANGUARD SWORD CONTACT SHEET CAMPAIGN"
    echo "status=$([ "$code" -eq 0 ] && echo SUCCESS || echo ERROR)"
    echo "exit_code=$code"
    echo "action=$ACTION"
    echo "samples=$SAMPLES"
    echo "contact_sheet=$SHEET"
    echo "download_sheet=$DOWNLOAD_SHEET"
    echo "out_dir=$OUT_DIR"
    echo "log=$LOG"
    echo
    echo "---- LAST LOG LINES ----"
    if [ -f "$LOG" ]; then
      tail -n 120 "$LOG"
    else
      echo "(log was not created)"
    fi
  } > "$RECEIPT"
  copy_receipt
  echo
  cat "$RECEIPT"
  exit "$code"
}
trap finish EXIT

{
  echo "[campaign] action=$ACTION samples=$SAMPLES"
  echo "[campaign] repo=$REPO_ROOT"
  echo "[campaign] asset=$ASSET"
  echo "[campaign] out=$OUT_DIR"

  cd "$REPO_ROOT"

  test -f "$ASSET" || {
    echo "[error] canonical Vanguard GLB missing: $ASSET"
    exit 20
  }

  echo "[1/3] render native $ACTION samples with repo Blender runner"
  node scripts/run-blender-tool.mjs tools/export_vanguard_idle_game_blender.py --     --asset public/assets/vanguard/vanguard_rigged_animations.glb     --out-dir "$OUT_DIR"     --action "$ACTION"     --frame-count "$SAMPLES"     --output-fps "$SAMPLES"     --source-fps 60     --camera-side left     --width 512     --height 512     --foot-anchor-tolerance-px 9999

  echo "[2/3] assemble numbered contact sheet"
  python3 "$SCRIPT_DIR/make_contact_sheet.py"     --root "$OUT_DIR"     --out "$SHEET"     --title "$ACTION"

  test -s "$SHEET" || {
    echo "[error] contact sheet missing or empty: $SHEET"
    exit 30
  }

  echo "[3/3] copy attachable sheet to Downloads"
  cp -f "$SHEET" "$DOWNLOAD_SHEET"
  test -s "$DOWNLOAD_SHEET" || {
    echo "[error] Downloads copy missing or empty: $DOWNLOAD_SHEET"
    exit 31
  }

  echo "[success] $SHEET"
  echo "[attach] $DOWNLOAD_SHEET"
} 2>&1 | tee "$LOG"
