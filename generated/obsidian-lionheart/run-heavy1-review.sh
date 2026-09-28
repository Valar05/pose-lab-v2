#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Obsidian / Lionheart Heavy1 review handoff.
# This script does not author or regenerate sprites. It invokes the repo-owned
# Blender runner + textured action renderer to produce authored Heavy1 review
# frames only, then stops for human pose curation.

REPO="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/obsidian-lionheart-sprite-bounty-v1.contract.json"
CONTINUITY="b4da35c9ab71e4b366ac29743cf883baa4d42132"
ASSET="$HOME/.local/state/pose-lab-v2-lionheart-lancer/worktree/public/assets/lionheart-lancer/LionheartLancer.glb"

cd "$REPO"

echo "== Obsidian Heavy1 review =="
echo "repo: $REPO"
HEAD="$(git rev-parse HEAD)"
SHORT_HEAD="$(git rev-parse --short=12 HEAD)"
echo "HEAD: $HEAD"

echo
echo "== Working tree truth (read-only; dirt is not deleted or reset) =="
git status --short || true

echo
echo "== Continuity / doctrine preflight =="
git cat-file -e "${CONTINUITY}^{commit}"
if ! git merge-base --is-ancestor "$CONTINUITY" HEAD; then
  echo "STOP: current HEAD is not descended from continuity seal $CONTINUITY" >&2
  exit 20
fi

for path in   AGENTS.md   docs/POSE_LAB_CAMPAIGN_RULES.md   docs/POSE_IS_GOD.md   docs/POSE_CAMPAIGN_FRAMEWORK.md   "$CONTRACT"   docs/campaigns/OBSIDIAN_LIONHEART_SPRITE_BOUNTY.md   scripts/run-blender-tool.mjs   tools/render_selected_action_beauty.py
do
  if [[ ! -f "$path" ]]; then
    echo "STOP: required repo file missing: $path" >&2
    exit 21
  fi
done

python3 tools/campaigns/campaign_core.py verify --contract "$CONTRACT"

if [[ ! -f "$ASSET" ]]; then
  echo "STOP: Lionheart donor GLB missing: $ASSET" >&2
  exit 22
fi

OUT_DIR="${OUT_DIR:-/storage/emulated/0/Download/LionheartHeavy1Review-$SHORT_HEAD}"
if [[ -e "$OUT_DIR" ]] && [[ -n "$(find "$OUT_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
  echo "STOP: output directory already contains files: $OUT_DIR" >&2
  echo "Set OUT_DIR to a fresh path and rerun. Existing review evidence was left untouched." >&2
  exit 23
fi
mkdir -p "$OUT_DIR"

echo
echo "== Rendering every authored Heavy1 keyframe =="
node scripts/run-blender-tool.mjs   tools/render_selected_action_beauty.py --   --asset "$ASSET"   --action Heavy1   --out-dir "$OUT_DIR"   --all-keyframes   --camera-side left   --width 512   --height 512

echo
echo "== Render verification =="
python3 - "$OUT_DIR/manifest.json" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
if not manifest_path.is_file():
    raise SystemExit(f"STOP: missing manifest: {manifest_path}")

data = json.loads(manifest_path.read_text())
expected = {
    "schema": "pose-lab-selected-action-beauty-v1",
    "status": "PASS",
    "actionRequested": "Heavy1",
    "resolution": [512, 512],
    "cameraSide": "model-left",
    "rootMotionSuppressed": True,
    "appearance": "base-color-textures-only",
}
for key, value in expected.items():
    if data.get(key) != value:
        raise SystemExit(
            f"STOP: manifest mismatch for {key}: expected {value!r}, got {data.get(key)!r}"
        )

frames = data.get("frames") or []
if not frames:
    raise SystemExit("STOP: Heavy1 manifest contains no rendered frames")

missing = [f.get("image") for f in frames if not (manifest_path.parent / f.get("image", "")).is_file()]
if missing:
    raise SystemExit(f"STOP: manifest names missing frame files: {missing}")

manifest_sha = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
print(f"PASS: Heavy1 authored keyframes rendered: {len(frames)}")
print(f"resolved action: {data.get('actionResolved')}")
print(f"manifest sha256: {manifest_sha}")
print(f"review dir: {manifest_path.parent}")
PY

echo
echo "STOP FOR HUMAN CURATION."
echo "Next step is to inspect these native 512x512 Heavy1 frames and choose four distinct pose authorities."
echo "Do not generate Obsidian sprites from Heavy1 until those four poses are selected."
