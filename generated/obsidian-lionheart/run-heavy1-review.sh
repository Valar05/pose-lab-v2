#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

# Obsidian / Lionheart Heavy1 authored-keyframe review campaign.
#
# Commission boundary:
# - action: Heavy1 only
# - source: existing LionheartLancer GLB
# - renderer: existing repo-owned textured beauty lane
# - output: EVERY authored Heavy1 keyframe
# - exactly ONE beauty PNG per authored keyframe
# - resolution: 512x512
# - camera: model-left
# - no diagnostics, no extra render passes, no pose preselection
# - no sprite generation, no accepted-sprite mutation
# - no primary-worktree mutation
#
# This is a Pose Lab V2 campaign handoff: it seals origin/main, creates a
# disposable exact-revision worktree, performs sticky boot, verifies the
# campaign contract/framework, renders through the canonical runner, verifies
# the manifest and every output hash, and stops for human pose curation.

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/obsidian-lionheart-sprite-bounty-v1.contract.json"
SELF="generated/obsidian-lionheart/run-heavy1-review.sh"
COMMON="tools/campaigns/campaign_common.sh"
FRAMEWORK="docs/POSE_CAMPAIGN_FRAMEWORK.md"
CONTINUATION="docs/campaigns/OBSIDIAN_LIONHEART_SPRITE_BOUNTY.md"
RUNNER="scripts/run-blender-tool.mjs"
RENDERER="tools/render_selected_action_beauty.py"

ACTION="Heavy1"
WIDTH=512
HEIGHT=512
CAMERA_SIDE="left"

ASSET="$HOME/.local/state/pose-lab-v2-lionheart-lancer/worktree/public/assets/lionheart-lancer/LionheartLancer.glb"
STATE="$HOME/.local/state/pose-lab-v2-obsidian-heavy1-review"
LIVE="$STATE/live"
OUT="/storage/emulated/0/Download/LionheartHeavy1Review"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short

echo "=== FETCH + SEAL CANONICAL MAIN ==="
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in   "$CONTRACT"   "$SELF"   "$COMMON"   "$FRAMEWORK"   "$CONTINUATION"   "$RUNNER"   "$RENDERER"
do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

mkdir -p "$STATE"
if [ -e "$LIVE" ]; then
  git worktree remove --force "$LIVE" >/dev/null 2>&1 || stop "could not retire stale campaign worktree"
fi
git worktree add --detach "$LIVE" "$SEALED" >/dev/null
cd "$LIVE"

source "$COMMON"

echo "=== FRAMEWORK V2 STICKY BOOT ==="
pose_campaign_boot "$LIVE" "$CONTRACT"

cat "$FRAMEWORK" >/dev/null
echo "READ=$FRAMEWORK"
cat "$CONTINUATION" >/dev/null
echo "READ=$CONTINUATION"

echo "=== CAMPAIGN BOUNDARY ==="
echo "ACTION=$ACTION"
echo "RENDER_POLICY=EVERY_AUTHORED_KEYFRAME"
echo "BEAUTIES_PER_KEYFRAME=1"
echo "RESOLUTION=${WIDTH}x${HEIGHT}"
echo "CAMERA_SIDE=model-$CAMERA_SIDE"
echo "APPEARANCE=base-color-textures-only"
echo "DIAGNOSTIC_PASSES=0"
echo "POSE_PRESELECTION=NONE"
echo "SPRITE_GENERATION=OFF"
echo "ACCEPTED_SPRITE_MUTATION=OFF"

echo "=== PACKAGE PREFLIGHT ==="
bash -n "$SELF"
node --check "$RUNNER"
python3 -m py_compile "$RENDERER" tools/campaigns/campaign_core.py
python3 tools/test_pose_campaign_framework.py
pose_campaign_verify "$LIVE" "$CONTRACT"
pose_campaign_check_worktree "$LIVE" "$CONTRACT"
[ -z "$(git status --porcelain)" ] || stop "sealed campaign worktree is dirty before render"

echo "=== DONOR ASSET ==="
[ -f "$ASSET" ] || stop "Lionheart donor GLB missing: $ASSET"
echo "ASSET=$ASSET"

if [ -e "$OUT" ] && find "$OUT" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null | grep -q .; then
  stop "review directory already contains evidence: $OUT"
fi
mkdir -p "$OUT"

echo "=== RENDER EVERY AUTHORED HEAVY1 KEYFRAME ==="
node "$RUNNER"   "$RENDERER" --   --asset "$ASSET"   --action "$ACTION"   --out-dir "$OUT"   --all-keyframes   --camera-side "$CAMERA_SIDE"   --width "$WIDTH"   --height "$HEIGHT"

echo "=== VERIFY EXACT REVIEW CONTRACT ==="
python3 - "$OUT" "$ACTION" "$WIDTH" "$HEIGHT" <<'PY'
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

out_dir = Path(sys.argv[1])
action = sys.argv[2]
width = int(sys.argv[3])
height = int(sys.argv[4])
manifest_path = out_dir / "manifest.json"

if not manifest_path.is_file():
    raise SystemExit(f"STOP: missing manifest: {manifest_path}")

manifest = json.loads(manifest_path.read_text())

expected = {
    "schema": "pose-lab-selected-action-beauty-v1",
    "status": "PASS",
    "renderPolicy": "beauty-only-all-authored-keyframes",
    "actionRequested": action,
    "resolution": [width, height],
    "cameraSide": "model-left",
    "rootMotionSuppressed": True,
    "appearance": "base-color-textures-only",
}
for key, value in expected.items():
    actual = manifest.get(key)
    if actual != value:
        raise SystemExit(
            f"STOP: manifest mismatch {key}: expected {value!r}, got {actual!r}"
        )

resolved = str(manifest.get("actionResolved") or "")
if re.sub(r"(?:_Armature|_rig)$", "", resolved, flags=re.I).lower() != action.lower():
    raise SystemExit(f"STOP: resolved action is not {action}: {resolved!r}")

count = manifest.get("authoredKeyframeCount")
indices = manifest.get("selectedKeyIndices")
frames = manifest.get("frames")

if not isinstance(count, int) or count <= 0:
    raise SystemExit(f"STOP: invalid authoredKeyframeCount: {count!r}")
if indices != list(range(count)):
    raise SystemExit(
        "STOP: selectedKeyIndices are not every authored keyframe in source order"
    )
if not isinstance(frames, list) or len(frames) != count:
    raise SystemExit(
        f"STOP: expected {count} frame records, got "
        f"{len(frames) if isinstance(frames, list) else type(frames).__name__}"
    )

expected_pngs = []
seen = set()
for expected_index, frame in enumerate(frames):
    if frame.get("outputIndex") != expected_index:
        raise SystemExit(
            f"STOP: outputIndex mismatch at record {expected_index}: {frame!r}"
        )
    if frame.get("keyIndex") != expected_index:
        raise SystemExit(
            f"STOP: keyIndex mismatch at record {expected_index}: {frame!r}"
        )

    name = frame.get("image")
    if not isinstance(name, str) or not re.fullmatch(r"k\d+\.png", name):
        raise SystemExit(f"STOP: invalid frame image name: {name!r}")
    if name in seen:
        raise SystemExit(f"STOP: duplicate beauty filename: {name}")
    seen.add(name)

    path = out_dir / name
    if not path.is_file():
        raise SystemExit(f"STOP: missing beauty PNG: {path}")

    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != frame.get("sha256"):
        raise SystemExit(
            f"STOP: SHA mismatch for {name}: {digest} != {frame.get('sha256')}"
        )
    expected_pngs.append(name)

actual_pngs = sorted(p.name for p in out_dir.glob("*.png"))
if sorted(expected_pngs) != actual_pngs:
    raise SystemExit(
        "STOP: output PNG set is not exactly one beauty per authored keyframe; "
        f"manifest={sorted(expected_pngs)!r} actual={actual_pngs!r}"
    )

print(f"PASS: Heavy1 authored keyframes={count}")
print("PASS: every authored keyframe rendered")
print("PASS: exactly one beauty PNG per keyframe")
print(f"PASS: resolution={width}x{height}")
print("PASS: appearance=base-color-textures-only")
print("PASS: diagnostics=none")
print("PASS: source order preserved")
print(f"MANIFEST_SHA256={hashlib.sha256(manifest_path.read_bytes()).hexdigest()}")
PY

echo "=== POST-RENDER REPO VERIFY ==="
pose_campaign_verify "$LIVE" "$CONTRACT"
pose_campaign_check_worktree "$LIVE" "$CONTRACT"
[ -z "$(git status --porcelain)" ] || stop "campaign render dirtied exact-revision worktree"

echo "=== HUMAN REVIEW HANDOFF ==="
echo "SEALED_REV=$SEALED"
echo "ACTION=$ACTION"
echo "REVIEW_DIR=$OUT"
echo "EVERY_AUTHORED_KEYFRAME=YES"
echo "BEAUTIES_PER_KEYFRAME=1"
echo "RESOLUTION=${WIDTH}x${HEIGHT}"
echo "TEXTURED=YES"
echo "DIAGNOSTIC_PASSES=0"
echo "SPRITE_GENERATION=OFF"
echo "HUMAN_VERDICT=PENDING"
echo "NEXT=inspect all Heavy1 beauties, then curate four distinct pose authorities"
