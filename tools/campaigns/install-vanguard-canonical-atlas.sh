#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

REPO="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
DOWNLOADS="/storage/emulated/0/Download"
TARGET="$REPO/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
EXPECTED_SHA="98f0920139a94fcc93074a765c721e7e1f4c083311c2c1cea9edaa8f2e087ed1"
EXPECTED_DIMS="1037 x 1536"

cd "$REPO"

echo "=== FETCH MAIN ==="
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "=== FIND EXACT ATLAS IN DOWNLOADS ==="
SOURCE=""
while IFS= read -r -d '' f; do
  sha="$(sha256sum "$f" | awk '{print $1}')"
  if [ "$sha" = "$EXPECTED_SHA" ]; then
    SOURCE="$f"
    break
  fi
done < <(find "$DOWNLOADS" -maxdepth 2 -type f -iname '*.png' -print0)

if [ -z "$SOURCE" ]; then
  echo "STOP: exact atlas not found in Downloads"
  echo "Expected SHA-256: $EXPECTED_SHA"
  echo "Save the uploaded 1037x1536 image into Downloads, then rerun this script."
  exit 20
fi

echo "source=$SOURCE"

echo "=== VERIFY SOURCE ==="
file "$SOURCE"
file "$SOURCE" | grep -F "$EXPECTED_DIMS" >/dev/null || {
  echo "STOP: wrong dimensions"
  exit 21
}
printf '%s  %s
' "$EXPECTED_SHA" "$SOURCE" | sha256sum -c -

echo "=== INSTALL CANONICAL ATLAS ==="
mkdir -p "$(dirname "$TARGET")"
cp -f "$SOURCE" "$TARGET"

echo "=== VERIFY TARGET ==="
file "$TARGET"
printf '%s  %s
' "$EXPECTED_SHA" "$TARGET" | sha256sum -c -

echo "=== COMMIT ==="
git add -- "$TARGET"
if git diff --cached --quiet; then
  echo "NOOP: canonical atlas already matches exact uploaded source"
else
  git commit -m "Restore canonical Vanguard procedural atlas"
  git push origin main
fi

echo "=== RECEIPT ==="
git rev-parse HEAD
git status --short
sha256sum "$TARGET"
file "$TARGET"
