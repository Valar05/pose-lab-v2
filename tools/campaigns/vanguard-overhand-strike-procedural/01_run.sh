#!/data/data/com.termux/files/usr/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

RECIPE="animations/candidates/vanguard/overhand-strike/recipe.json"
ATLAS="public/assets/vanguard/fleshpunk/canon/Vanguard_Canonical_Character_and_Pose_Sheet_2026-07-30.png"
SLASH="/storage/emulated/0/Download/Diorama-Slash-Keys/slash_right.png"

GEN_DIR="$REPO_ROOT/animations/candidates/vanguard/overhand-strike/generated"
PREVIEW="$GEN_DIR/preview.gif"
STRIP="$GEN_DIR/strip.png"
RESOLVED="$GEN_DIR/recipe-resolved.json"

DST="/storage/emulated/0/Download/Vanguard-Overhand Strike-Procedural"
LOG="$DST/console.log"

mkdir -p "$DST"
: > "$LOG"

copy_log() {
  if command -v termux-clipboard-set >/dev/null 2>&1 && [[ -f "$LOG" ]]; then
    termux-clipboard-set < "$LOG" >/dev/null 2>&1 || true
  fi
}
trap copy_log EXIT INT TERM

{
  echo "CAMPAIGN=vanguard-overhand-strike-procedural-proof"
  echo "repo=$REPO_ROOT"
  echo "recipe=$RECIPE"
  echo "atlas=$ATLAS"
  echo "slash=$SLASH"
  echo "downloads=$DST"
  echo

  fail=0

  [[ -f "$RECIPE" ]] || { echo "STOP: recipe missing: $RECIPE"; fail=1; }
  [[ -f "$ATLAS" ]] || { echo "STOP: Vanguard atlas missing: $ATLAS"; fail=1; }
  [[ -f "$SLASH" ]] || { echo "STOP: slash key missing: $SLASH"; fail=1; }
  command -v python3 >/dev/null 2>&1 || { echo "STOP: python3 not found"; fail=1; }
  command -v npm >/dev/null 2>&1 || { echo "STOP: npm not found"; fail=1; }

  if [[ "$fail" -ne 0 ]]; then
    exit 2
  fi

  python3 - <<'PY'
try:
    import PIL
    import numpy
    print("PYTHON_DEPS_OK")
    print("Pillow=" + getattr(PIL, "__version__", "unknown"))
    print("numpy=" + getattr(numpy, "__version__", "unknown"))
except Exception as exc:
    print("STOP: Python dependency missing:", exc)
    raise SystemExit(3)
PY
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || exit "$STATUS"

  echo
  echo "=== VALIDATE RECIPE ==="
  npm run motion:validate -- "$RECIPE"
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || { echo "STOP: recipe validation failed"; exit "$STATUS"; }

  echo
  echo "=== RENDER ==="
  rm -f "$PREVIEW" "$STRIP" "$RESOLVED"
  npm run motion:render -- "$RECIPE"
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || { echo "STOP: render failed"; exit "$STATUS"; }

  echo
  echo "=== VERIFY OUTPUTS ==="
  [[ -s "$PREVIEW" ]] || { echo "STOP: preview missing: $PREVIEW"; exit 10; }
  [[ -s "$STRIP" ]] || { echo "STOP: strip missing: $STRIP"; exit 11; }
  [[ -s "$RESOLVED" ]] || { echo "STOP: resolved recipe missing: $RESOLVED"; exit 12; }

  python3 - "$RESOLVED" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
data = json.loads(p.read_text())
assert data.get("rootMotion") is False, "resolved recipe unexpectedly enables root motion"
assert data.get("atlasHashes"), "resolved recipe did not record atlas hashes"
phases = data.get("phases", [])
assert phases, "resolved recipe contains no phases"
print("RESOLVED_RECIPE_OK")
print("id=" + str(data.get("id")))
print("phases=" + str(len(phases)))
for atlas, digest in data.get("atlasHashes", {}).items():
    print(f"atlas_hash[{atlas}]={digest}")
PY
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || { echo "STOP: resolved recipe verification failed"; exit "$STATUS"; }

  echo
  echo "=== DELIVER ==="
  cp -f "$PREVIEW" "$DST/vanguard_overhand-strike_procedural_preview.gif"
  cp -f "$STRIP" "$DST/vanguard_overhand-strike_procedural_strip.png"
  cp -f "$RESOLVED" "$DST/vanguard_overhand-strike_procedural_recipe_resolved.json"

  if command -v termux-media-scan >/dev/null 2>&1; then
    termux-media-scan "$DST/vanguard_overhand-strike_procedural_preview.gif" >/dev/null 2>&1 || true
    termux-media-scan "$DST/vanguard_overhand-strike_procedural_strip.png" >/dev/null 2>&1 || true
    termux-media-scan "$DST/vanguard_overhand-strike_procedural_recipe_resolved.json" >/dev/null 2>&1 || true
  fi

  echo
  echo "=== DOWNLOADS CONTENTS ==="
  ls -lh "$DST"

  echo
  echo "VANGUARD_OVERHAND_STRIKE_PROCEDURAL_OK"
  echo "preview=$DST/vanguard_overhand-strike_procedural_preview.gif"
  echo "strip=$DST/vanguard_overhand-strike_procedural_strip.png"
  echo "resolved=$DST/vanguard_overhand-strike_procedural_recipe_resolved.json"
  echo "console=$LOG"
} 2>&1 | tee -a "$LOG"

STATUS=${PIPESTATUS[0]}
copy_log
exit "$STATUS"
