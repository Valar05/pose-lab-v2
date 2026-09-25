#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
DL="/storage/emulated/0/Download"
DEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
MANIFEST="$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json"
ACCEPTED_NAME="vanguard_atlas_shoulders_midpoint.png"
TARGET_WIDTH=1037

cd "$ROOT"
echo "=== VANGUARD ACCEPTED ATLAS INGEST ==="
echo "mutable_surface=$DEST,$MANIFEST"
echo "authority=human-accepted complete atlas from Downloads"
echo "allowed_transform=uniform whole-image resize to width $TARGET_WIDTH"
echo "forbidden=crop,frame reconstruction,retint,repack,other repo mutations"

mapfile -t CANDIDATES < <(find "$DL" -maxdepth 1 -type f \( -name "$ACCEPTED_NAME" -o -name 'vanguard_atlas_shoulders_midpoint (*).png' -o -name 'vanguard_atlas_shoulders_midpoint_*.png' \) -print | sort)
if [[ "${#CANDIDATES[@]}" -ne 1 ]]; then
  echo "STOP: expected exactly one accepted midpoint atlas in Downloads; found ${#CANDIDATES[@]}"
  printf '%s\n' "${CANDIDATES[@]:-}"
  exit 2
fi
SRC="${CANDIDATES[0]}"
echo "source=$SRC"

python3 - "$SRC" "$DEST" "$MANIFEST" "$TARGET_WIDTH" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys
src,dest,manifest=map(Path,sys.argv[1:4]); target_w=int(sys.argv[4])
raw=Image.open(src).convert("RGB")
if raw.width<=0 or raw.height<=0: raise SystemExit("STOP: invalid accepted atlas")
source_size=list(raw.size)
scale=target_w/raw.width
target_h=round(raw.height*scale)
normalized=raw if raw.width==target_w else raw.resize((target_w,target_h),Image.Resampling.LANCZOS)
dest.parent.mkdir(parents=True,exist_ok=True)
tmp=dest.with_suffix(dest.suffix+".tmp")
normalized.save(tmp,format="PNG")
tmp.replace(dest)
source_sha=hashlib.sha256(src.read_bytes()).hexdigest()
dest_sha=hashlib.sha256(dest.read_bytes()).hexdigest()
manifest.write_text(json.dumps({
 "schema":"vanguard-atlas-accepted-ingest-v2",
 "acceptedBy":"Drew",
 "verdict":"good enough",
 "sourceFilename":src.name,
 "sourceSha256":source_sha,
 "sourceSize":source_size,
 "normalization":{"kind":"uniform-whole-image-resize","targetWidth":target_w,"scale":scale,"outputSize":[target_w,target_h],"filter":"LANCZOS"},
 "destinationSha256":dest_sha,
 "newCells":[91,92,93,94,95],
 "note":"The accepted full atlas is sole authority for today's newly authored frames. Whole-image width normalization is explicitly authorized; no frame reconstruction, crop, tint, or repack."
},indent=2)+"\n")
print(f"source_size={source_size[0]}x{source_size[1]}")
print(f"uniform_scale={scale:.9f}")
print(f"destination_size={target_w}x{target_h}")
print("source_sha256="+source_sha)
print("destination_sha256="+dest_sha)
PY

echo "=== VERIFY OUTPUT ==="
python3 - "$DEST" "$TARGET_WIDTH" <<'PY'
from PIL import Image
from pathlib import Path
import sys
p=Path(sys.argv[1]); target=int(sys.argv[2]); im=Image.open(p)
if im.width!=target: raise SystemExit(f"STOP: destination width {im.width} != {target}")
print("OUTPUT_GEOMETRY_OK")
PY

echo "=== DIFF SCOPE ==="
git status --short -- "$DEST" "$MANIFEST"
echo "=== OPEN CANONICAL DESTINATION ==="
termux-open "$DEST" 2>/dev/null || true
echo "VANGUARD_ACCEPTED_ATLAS_INGEST_OK"
echo "destination=$DEST"
echo "No commit/push performed; visible destination is ready for final verification."
