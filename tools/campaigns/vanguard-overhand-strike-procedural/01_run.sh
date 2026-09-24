#!/data/data/com.termux/files/usr/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

RECIPE="animations/candidates/vanguard/overhand-strike/recipe.json"
ATLAS="$REPO_ROOT/authoring/vanguard-procedural/source/vanguard-pose-atlas-48.png"
ATLAS_SHA="0f6183b8cfa516388ec62b70b79773037c3bfe21576ae9bc0a52510eac8a4420"
SLASH="/storage/emulated/0/Download/Diorama-Slash-Keys/slash_right.png"

GEN_DIR="$REPO_ROOT/animations/candidates/vanguard/overhand-strike/generated"
PREVIEW="$GEN_DIR/preview.gif"
STRIP="$GEN_DIR/strip.png"
RESOLVED="$GEN_DIR/recipe-resolved.json"

DST="/storage/emulated/0/Download/Vanguard-Overhand-Strike-Procedural"
LOG="$DST/console.log"

mkdir -p "$DST" "$(dirname "$ATLAS")"
: > "$LOG"

copy_log() {
  if command -v termux-clipboard-set >/dev/null 2>&1 && [[ -f "$LOG" ]]; then
    termux-clipboard-set < "$LOG" >/dev/null 2>&1 || true
  fi
}
trap copy_log EXIT INT TERM

hash_file() {
  sha256sum "$1" | awk '{print $1}'
}

find_real_atlas() {
  local root f got
  for root in     "$REPO_ROOT"     "/storage/emulated/0/Download"     "/storage/emulated/0/Pictures"     "/storage/emulated/0/Documents"; do
    [[ -d "$root" ]] || continue
    while IFS= read -r -d '' f; do
      got="$(hash_file "$f" 2>/dev/null || true)"
      if [[ "$got" == "$ATLAS_SHA" ]]; then
        printf '%s\n' "$f"
        return 0
      fi
    done < <(find "$root" -type f \( -iname '*.png' -o -iname '*.webp' \) -print0 2>/dev/null)
  done
  return 1
}

{
  echo "CAMPAIGN=vanguard-overhand-strike-procedural-proof"
  echo "repo=$REPO_ROOT"
  echo "recipe=$RECIPE"
  echo "expected_atlas_sha=$ATLAS_SHA"
  echo "slash=$SLASH"
  echo "downloads=$DST"
  echo

  [[ -f "$RECIPE" ]] || { echo "STOP: recipe missing: $RECIPE"; exit 2; }
  [[ -f "$SLASH" ]] || { echo "STOP: slash key missing: $SLASH"; exit 2; }
  command -v python3 >/dev/null 2>&1 || { echo "STOP: python3 not found"; exit 2; }
  command -v npm >/dev/null 2>&1 || { echo "STOP: npm not found"; exit 2; }
  command -v sha256sum >/dev/null 2>&1 || { echo "STOP: sha256sum not found"; exit 2; }

  echo "=== RESOLVE REAL VANGUARD ATLAS ==="
  if [[ -f "$ATLAS" ]] && [[ "$(hash_file "$ATLAS")" == "$ATLAS_SHA" ]]; then
    echo "ATLAS_ALREADY_INSTALLED=$ATLAS"
  else
    FOUND="$(find_real_atlas || true)"
    if [[ -z "$FOUND" ]]; then
      echo "STOP: the real 48-pose Vanguard atlas was not found."
      echo "expected_sha256=$ATLAS_SHA"
      echo "expected_dimensions=1536x1170"
      echo "searched=$REPO_ROOT,/storage/emulated/0/Download,/storage/emulated/0/Pictures,/storage/emulated/0/Documents"
      echo "Do not substitute any other image."
      exit 20
    fi
    echo "FOUND_ATLAS=$FOUND"
    cp -f "$FOUND" "$ATLAS"
    echo "INSTALLED_ATLAS=$ATLAS"
  fi

  [[ "$(hash_file "$ATLAS")" == "$ATLAS_SHA" ]] || {
    echo "STOP: installed atlas hash is wrong"
    exit 21
  }

  python3 - "$ATLAS" <<'PY'
from PIL import Image
import sys
p=sys.argv[1]
im=Image.open(p)
print("atlas_dimensions=%dx%d" % im.size)
if im.size != (1536,1170):
    print("STOP: atlas dimensions are not 1536x1170")
    raise SystemExit(22)
print("ATLAS_IDENTITY_OK")
PY
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || exit "$STATUS"

  python3 - <<'PY'
try:
    import PIL, numpy
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

  python3 - "$RESOLVED" "$ATLAS_SHA" <<'PY'
import json, sys
from pathlib import Path
p=Path(sys.argv[1])
expected=sys.argv[2]
data=json.loads(p.read_text())
assert data.get("rootMotion") is False, "resolved recipe unexpectedly enables root motion"
hashes=data.get("atlasHashes") or {}
assert hashes.get("vanguard-canonical") == expected, (hashes, expected)
phases=data.get("phases") or []
assert phases, "resolved recipe contains no phases"
print("RESOLVED_RECIPE_OK")
print("id=" + str(data.get("id")))
print("phases=" + str(len(phases)))
print("atlas_hash[vanguard-canonical]=" + hashes["vanguard-canonical"])
PY
  STATUS=$?
  [[ "$STATUS" -eq 0 ]] || { echo "STOP: resolved recipe verification failed"; exit "$STATUS"; }

  echo
  echo "=== DELIVER ==="
  cp -f "$PREVIEW" "$DST/vanguard_overhand_strike_procedural_preview.gif"
  cp -f "$STRIP" "$DST/vanguard_overhand_strike_procedural_strip.png"
  cp -f "$RESOLVED" "$DST/vanguard_overhand_strike_procedural_recipe_resolved.json"

  if command -v termux-media-scan >/dev/null 2>&1; then
    termux-media-scan "$DST/vanguard_overhand_strike_procedural_preview.gif" >/dev/null 2>&1 || true
    termux-media-scan "$DST/vanguard_overhand_strike_procedural_strip.png" >/dev/null 2>&1 || true
    termux-media-scan "$DST/vanguard_overhand_strike_procedural_recipe_resolved.json" >/dev/null 2>&1 || true
  fi

  echo
  echo "=== DOWNLOADS CONTENTS ==="
  ls -lh "$DST"

  echo
  echo "VANGUARD_OVERHAND_STRIKE_PROCEDURAL_OK"
  echo "preview=$DST/vanguard_overhand_strike_procedural_preview.gif"
  echo "strip=$DST/vanguard_overhand_strike_procedural_strip.png"
  echo "resolved=$DST/vanguard_overhand_strike_procedural_recipe_resolved.json"
  echo "console=$LOG"
} 2>&1 | tee -a "$LOG"

STATUS=${PIPESTATUS[0]}
copy_log
exit "$STATUS"
