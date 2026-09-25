#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
DL="/storage/emulated/0/Download"
DEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json"
ACCEPTED_NAME="vanguard_atlas_shoulders_midpoint.png"

cd "$ROOT"
echo "=== VANGUARD ACCEPTED ATLAS INGEST ==="
echo "mutable_surface=$DEST,$MANIFEST"
echo "authority=human-accepted full atlas downloaded from chat"
echo "forbidden=all other repo files and all image reprocessing"

# Exact-name first. Android/browser may suffix duplicate downloads; allow only unambiguous matches.
mapfile -t CANDIDATES < <(find "$DL" -maxdepth 1 -type f \( -name "$ACCEPTED_NAME" -o -name 'vanguard_atlas_shoulders_midpoint (*).png' -o -name 'vanguard_atlas_shoulders_midpoint_*.png' \) -print | sort)
if [[ "${#CANDIDATES[@]}" -ne 1 ]]; then
  echo "STOP: expected exactly one accepted midpoint atlas in Downloads; found ${#CANDIDATES[@]}"
  printf '%s\n' "${CANDIDATES[@]:-}"
  exit 2
fi
SRC="${CANDIDATES[0]}"
echo "source=$SRC"

# Fail closed on identity/geometry. No transform, crop, resize, tint, repack, or regeneration.
python3 - "$SRC" "$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,sys
src=Path(sys.argv[1]); old=Path(sys.argv[2])
a=Image.open(src).convert("RGB"); b=Image.open(old).convert("RGB")
if a.width != b.width:
    raise SystemExit(f"STOP: width mismatch accepted={a.width} canonical={b.width}")
if a.height <= b.height:
    raise SystemExit(f"STOP: accepted atlas did not append downward: {a.height} <= {b.height}")
# Old published rectangle must be pixel-identical.
if a.crop((0,0,b.width,b.height)).tobytes()!=b.tobytes():
    raise SystemExit("STOP: accepted download changes published cells 1-90")
print("old_region=PIXEL_IDENTICAL")
print("accepted_size=%dx%d"%a.size)
print("accepted_sha256="+hashlib.sha256(src.read_bytes()).hexdigest())
PY

mkdir -p "$(dirname "$DEST")"
TMP="$DEST.tmp"
cp -- "$SRC" "$TMP"
mv -- "$TMP" "$DEST"

python3 - "$SRC" "$DEST" "$MANIFEST" <<'PY'
from pathlib import Path
import hashlib,json,sys
src,dest,manifest=map(Path,sys.argv[1:4])
sh=hashlib.sha256(dest.read_bytes()).hexdigest()
if hashlib.sha256(src.read_bytes()).digest()!=hashlib.sha256(dest.read_bytes()).digest():
    raise SystemExit("STOP: destination bytes differ from accepted download")
manifest.write_text(json.dumps({
  "schema":"vanguard-atlas-accepted-ingest-v1",
  "acceptedBy":"Drew",
  "verdict":"good enough",
  "sourceFilename":src.name,
  "sourceSha256":sh,
  "destination":str(dest.relative_to(dest.parents[3])),
  "newCells":[91,92,93,94,95],
  "note":"Accepted artifact copied byte-for-byte from Downloads. No image processing performed by ingest campaign."
},indent=2)+"\n")
print("destination_sha256="+sh)
PY

echo "=== DIFF SCOPE ==="
git status --short -- "$DEST" "$MANIFEST"
EXTRA="$(git status --porcelain | awk '{print $2}' | grep -v -F -e "public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png" -e "public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json" || true)"
if [[ -n "$EXTRA" ]]; then
  echo "NOTE: unrelated pre-existing dirty archaeology preserved and untouched:"
  printf '%s\n' "$EXTRA"
fi

echo "=== OPEN CANONICAL DESTINATION ==="
termux-open "$DEST" 2>/dev/null || true
echo "VANGUARD_ACCEPTED_ATLAS_INGEST_OK"
echo "destination=$DEST"
echo "No commit/push performed; visible destination is ready for final verification."
