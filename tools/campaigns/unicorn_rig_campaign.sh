#!/usr/bin/env bash
# One Pose Lab V2 mounted-unicorn rig campaign, Git as sole source-code transport.
# Usage: bash tools/campaigns/unicorn_rig_campaign.sh /sdcard/Download/934732.png
set -euo pipefail
export PAGER=cat GIT_PAGER=cat
BRANCH="codex/unicorn-reference-measurement-v1"
CONTRACT="campaigns/unicorn-mounted-canter-v1.contract.json"
SOURCE="${1:-/sdcard/Download/934732.png}"
EXPECTED="282d9cd98d0f2bd01816a5a3fe6e18c9e67d375a4a29da6f9809285fb2c9a698"
echo "[UNICORN] Existing Pose Lab V2 | original art -> layers -> canter candidate"
for cmd in git python3 bash; do
 command -v "$cmd" >/dev/null 2>&1 || { echo "STOP missing $cmd";exit 2; }
done
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "STOP: launch from Pose Lab V2 checkout";exit 2; }
cd "$ROOT"
# Resolve caller-supplied relative source before changing to disposable worktree.
SOURCE="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$SOURCE")"
git remote get-url origin | grep -Eq '(^|[:/])Valar05/pose-lab-v2(\.git)?$' || { echo "STOP: wrong origin";exit 2; }
[ -f "$SOURCE" ] || { echo "STOP: exact 934732.png missing at $SOURCE";exit 2; }
python3 - "$SOURCE" "$EXPECTED" <<'PY'
import sys,hashlib
from pathlib import Path
src=Path(sys.argv[1])
digest=hashlib.sha256(src.read_bytes()).hexdigest()
if digest!=sys.argv[2]:raise SystemExit("STOP: wrong source SHA256 "+digest)
try:
 from PIL import Image
except ImportError:
 raise SystemExit("STOP: Pillow missing. Install once with python3 -m pip install Pillow")
with Image.open(src) as im:
 if im.size!=(1774,887):raise SystemExit("STOP: wrong source geometry")
print("UNICORN_SOURCE_SHA256_OK="+digest)
PY
git fetch origin "$BRANCH"
START="$(git rev-parse "refs/remotes/origin/$BRANCH")"
STATE="$(mktemp -d -t unicorn-plv2.XXXXXXXX)"
WORK="$STATE/worktree"
# Dirty original checkout is never switched, reset, stashed or cleaned.
git worktree add --detach "$WORK" "$START"
cd "$WORK"
source tools/campaigns/campaign_common.sh
pose_campaign_boot "$WORK" "$CONTRACT"
pose_campaign_verify "$WORK" "$CONTRACT"
ART="$WORK/public/assets/unicorn"
DEST="$ART/candidate"
SRC="$ART/source/934732.png"
AUTH="$WORK/docs/characters/unicorn-source-manifest.json"
[ ! -e "$DEST" ] || pose_campaign_stop "candidate already exists: refuse to overwrite"
[ ! -e "$SRC" ] || pose_campaign_stop "source already committed: do not overwrite"
mkdir -p "$ART/source" "$(dirname "$AUTH")"
cp -- "$SOURCE" "$SRC"
python3 - "$AUTH" "$EXPECTED" <<'PY'
import json,sys
out,digest=sys.argv[1:]
ref="public/assets/unicorn/source/934732.png"
obj={"schema":"pose-lab-sprite-character-authority-v1",
     "character":"Mounted Unicorn and Rider","project":"Unicorn Terrain Engineering Game",
     "references":[{"role":role,"path":ref,"sha256":digest} for role in ("CHARACTER","STYLE")]}
with open(out,"w") as f:json.dump(obj,f,indent=2);f.write("\n")
PY
DOCTRINE="$STATE/authoring-doctrine.md"
python3 tools/campaigns/sprite_doctrine_boot.py --task sprite-author \
 --contract "$CONTRACT" --character-manifest docs/characters/unicorn-source-manifest.json \
 --output "$DOCTRINE"
echo "[UNICORN] ART+DOCTRINE GATE PASS. Packet available for working agent: $DOCTRINE"
python3 tools/campaigns/unicorn_rig_build.py --source "$SRC" --out "$DEST" --lead near
pose_campaign_verify "$WORK" "$CONTRACT"
pose_campaign_check_worktree "$WORK" "$CONTRACT"
python3 - "$DEST" <<'PY'
import json,hashlib,sys
from pathlib import Path
p=Path(sys.argv[1]);m=json.loads((p/"animations.json").read_text())
r=json.loads((p/"rig.json").read_text())
assert m["schema"]=="pose-lab-v2-2d-animation-set-v1"
assert r["rootMotionX"] is False and r["humanVerdict"]=="pending"
frames=m["animations"][0]["frames"]
assert len(frames)==24
assert len(set(f["sha256"] for f in frames))>=8
for f in frames:
 path=p/f["src"]
 assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==f["sha256"]
assert r["contactDriftMaxPx"]<=2
print("CANONICAL_FRAME_HASHES_OK=24; human visual verdict pending")
PY
pose_campaign_stage "$WORK" "$CONTRACT" \
 public/assets/unicorn/source/934732.png \
 public/assets/unicorn/candidate docs/characters/unicorn-source-manifest.json
IMPL="$(pose_campaign_commit "$WORK" "feat(unicorn): stage source-backed rig and canter candidate" | tail -n1)"
pose_campaign_write_receipt "$WORK" "$CONTRACT" "$START" "$IMPL" "" "" \
 "repo-owned-pose-lab-v2-unicorn" "pending"
pose_campaign_stage "$WORK" "$CONTRACT" campaigns/unicorn-mounted-canter-v1.receipt.json
FINAL="$(pose_campaign_commit "$WORK" "receipt(unicorn): quarantine canter visual review" | tail -n1)"
pose_campaign_push_and_readback "$WORK" "$BRANCH" "$FINAL"
echo "[UNICORN] REMOTE PUSH+READBACK=$FINAL"
echo "[UNICORN] Candidate not yet hosted or visually accepted. Exact Pose Lab V2 route once runtime serves SHA:"
echo "?view=2d&manifest=./assets/unicorn/candidate/animations.json&animation=canter&cacheBust=$FINAL"
echo "[UNICORN] Inspect four legs, occlusion seams, planted hooves, rider stability and the three-beat lead."
echo "[UNICORN] Working tree preserved for diagnosis: $WORK"
