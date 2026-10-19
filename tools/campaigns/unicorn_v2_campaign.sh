#!/usr/bin/env bash
set -euo pipefail
BRANCH=codex/unicorn-reference-measurement-v1
CONTRACT=campaigns/unicorn-textured-limb-v2.contract.json
SRC="${1:-/sdcard/Download/file_00000000ab3881f59acb321d0506ba88.png}"
ROOT="$HOME/pose-lab-v2"
if [ ! -d "$ROOT/.git" ]; then
  [ ! -e "$ROOT" ] || { echo "STOP unexpected Pose Lab directory"; exit 2; }
  git clone --single-branch --branch "$BRANCH" https://github.com/Valar05/pose-lab-v2.git "$ROOT"
fi
[ -f "$SRC" ] || { echo "STOP source artwork not found: $SRC"; exit 2; }
python3 - "$SRC" <<'PY'
import hashlib,sys
want="282d9cd98d0f2bd01816a5a3fe6e18c9e67d375a4a29da6f9809285fb2c9a698"
got=hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest()
if got!=want:raise SystemExit("STOP wrong artwork SHA256 "+got)
print("ORIGINAL_SOURCE_OK="+got)
PY
git -C "$ROOT" fetch origin "$BRANCH"
START="$(git -C "$ROOT" rev-parse FETCH_HEAD)"
WORK="$(mktemp -d)/authoring"
git -C "$ROOT" worktree add --detach "$WORK" "$START"
cd "$WORK"
source tools/campaigns/campaign_common.sh
pose_campaign_boot "$WORK" "$CONTRACT"
pose_campaign_verify "$WORK" "$CONTRACT"
[ ! -e public/assets/unicorn/candidate-v2 ] || pose_campaign_stop "candidate-v2 already exists"
python3 tools/campaigns/unicorn_textured_rig_v2.py --source "$SRC" --out public/assets/unicorn/candidate-v2
pose_campaign_verify "$WORK" "$CONTRACT"
pose_campaign_check_worktree "$WORK" "$CONTRACT"
python3 - <<'PY'
import json,hashlib
from pathlib import Path
p=Path("public/assets/unicorn/candidate-v2")
j=json.loads((p/"animations.json").read_text());rig=json.loads((p/"rig.json").read_text())
assert rig["status"]=="quarantined-human-pending"
assert rig["maskedPixelHolesNotInpainted"] is True
assert len(j["animations"][0]["frames"])==24
for frame in j["animations"][0]["frames"]:
 b=(p/frame["src"]).read_bytes()
 assert hashlib.sha256(b).hexdigest()==frame["sha256"]
assert (p/"segmentation_mask.png").is_file()
print("UNICORN_V2_24_FRAME_BYTES_OK; source-texture masks and contact sheet present")
PY
pose_campaign_stage "$WORK" "$CONTRACT" public/assets/unicorn/candidate-v2
IMPL="$(pose_campaign_commit "$WORK" "feat(unicorn): stage quarantined source-pixel V2 limb rig" | tail -n1)"
pose_campaign_write_receipt "$WORK" "$CONTRACT" "$START" "$IMPL" "" "" "pose-lab-v2-repo-authoring" pending
pose_campaign_stage "$WORK" "$CONTRACT" campaigns/unicorn-textured-limb-v2.receipt.json
FINAL="$(pose_campaign_commit "$WORK" "receipt(unicorn): preserve V2 source-pixel review receipt" | tail -n1)"
pose_campaign_push_and_readback "$WORK" "$BRANCH" "$FINAL"
echo "UNICORN_V2_REMOTE_READBACK=$FINAL"
echo "UNACCEPTED: source pixel limbs, missing hidden anatomy, manual visual review required"
echo "POSE_LAB_MANIFEST=?view=2d&manifest=./assets/unicorn/candidate-v2/animations.json&animation=canter&cacheBust=$FINAL"
