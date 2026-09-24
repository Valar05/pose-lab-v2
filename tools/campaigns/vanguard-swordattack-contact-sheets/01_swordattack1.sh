#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ACTION="SwordAttack1"
SAMPLES="${SAMPLES:-9}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$REPO_ROOT/generated/vanguard-swordattack-contact-sheets/$ACTION/$STAMP"
LOG="$OUT_DIR/run.log"
RECEIPT="$OUT_DIR/CLIPBOARD.txt"
SHEET="$OUT_DIR/${ACTION}_contact_sheet.png"
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

  echo "[1/2] render native SwordAttack1 samples with repo Blender runner"
  node scripts/run-blender-tool.mjs tools/export_vanguard_idle_game_blender.py --     --asset public/assets/vanguard/vanguard_rigged_animations.glb     --out-dir "$OUT_DIR"     --action "$ACTION"     --frame-count "$SAMPLES"     --output-fps "$SAMPLES"     --source-fps 60     --camera-side left     --width 512     --height 512     --foot-anchor-tolerance-px 9999

  echo "[2/2] assemble numbered contact sheet"
  python3 "$SCRIPT_DIR/make_contact_sheet.py"     --root "$OUT_DIR"     --out "$SHEET"     --title "$ACTION"

  test -s "$SHEET" || {
    echo "[error] contact sheet missing or empty: $SHEET"
    exit 30
  }

  echo "[success] $SHEET"
} 2>&1 | tee "$LOG"
