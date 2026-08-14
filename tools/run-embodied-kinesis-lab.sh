#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$WORKSPACE/pose-lab/assets/models/FPSPlayer.glb" ]]; then
  echo "BLOCKED: expected sibling reference repo at $WORKSPACE/pose-lab with assets/models/FPSPlayer.glb" >&2
  exit 2
fi

node scripts/fps-fist-reference.mjs
node scripts/bake-fist-attack1-candidate.mjs
node tools/embodied_kinesis_regnet.mjs
node scripts/build.mjs

if ! node -e "import('playwright').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
  echo "Bootstrapping local visual-evidence dependency (one time)..." >&2
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save playwright
fi

if ! python3 - <<'PY' >/dev/null 2>&1
from PIL import Image
PY
then
  python3 -m pip install --user pillow==11.3.0
fi

PORT="${KINESIS_PORT:-4173}"
python3 -m http.server "$PORT" -d dist >"${TMPDIR:-/tmp}/embodied-kinesis-http.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do
  if curl --fail --silent "http://127.0.0.1:$PORT/" >/dev/null; then break; fi
  sleep 0.25
done
KINESIS_URL="http://127.0.0.1:$PORT/" node tools/embodied_kinesis_capture.mjs
python3 tools/embodied_kinesis_key_sheet.py

STAGE=$(node -p "JSON.parse(require('fs').readFileSync('config/embodied-kinesis-canary.json')).stage")
CANDIDATE=$(node -p "JSON.parse(require('fs').readFileSync('config/embodied-kinesis-canary.json')).candidate")
OUT="generated/embodied-kinesis/$STAGE/$CANDIDATE"
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -hide_banner -loglevel error -y -framerate 24 -i "$OUT/motion/frame-%03d.png" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUT/animation-fpv.mp4"
else
  echo "NOTE: ffmpeg missing; keys and comparison sheet are complete, MP4 encode skipped." >&2
fi
printf '\nEmbodied Kinesis evidence: %s\n' "$ROOT/$OUT"
