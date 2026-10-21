#!/data/data/com.termux/files/usr/bin/bash
# Pose Lab V2 Connie source ingress. Invoke from within the existing Pose Lab Git
# checkout even when that checkout has unrelated dirty/untracked files.
set -euo pipefail
export PAGER=cat GIT_PAGER=cat PYTHONDONTWRITEBYTECODE=1

STOP(){ echo "CONNIE_PHONE_STOP: $*" >&2; exit 2; }
BRANCH="feature/deterministic-sprite-scale-normalization-20261020"
CONTRACT="campaigns/connie-phone-source-ingress-v1.contract.json"
CALIBRATION="campaigns/connie-anatomical-calibration-v1.json"
REPORT="campaigns/connie-anatomical-measurements-v1.json"
SOURCES=(
  public/assets/connie/source/run.png
  public/assets/connie/source/dash.png
  public/assets/connie/source/idle.png
  public/assets/connie/source/rebound.png
)

P="${POSE_LAB_REPO:-$(pwd -P)}"
P="$(git -C "$P" rev-parse --show-toplevel)" || STOP "run inside Pose Lab's Git checkout"
[ "$(basename "$P")" = "pose-lab-v2" ] || STOP "expected pose-lab-v2 checkout, got $P"
test -f "$P/AGENTS.md" || STOP "Pose Lab repository root not found"
command -v git >/dev/null || STOP "Git is required"
command -v python3 >/dev/null || STOP "Python + Pillow are required"
python3 -c 'from PIL import Image' || STOP "Install Pillow in Termux: python -m pip install Pillow"
if [ ! -d "$HOME/storage/downloads" ] && [ ! -d /storage/emulated/0/Download ]; then
  STOP "Phone storage unavailable. Run termux-setup-storage and grant access."
fi

echo "===== CONNIE PHONE SOURCE INGRESS ====="
echo "PHONE_ORDER=run,dash/pinwheel,idle,wall-impact/rebound"
echo "CANONICAL_REPO=$P"
echo "TARGET_REMOTE_BRANCH=$BRANCH"

# Preserve all local work and archives, including a dirty main checkout.
git -C "$P" status --porcelain=v1
LOCAL_HEAD="$(git -C "$P" rev-parse HEAD)"
echo "ORIGINAL_LOCAL_HEAD=$LOCAL_HEAD (not changed)"
git -C "$P" remote get-url origin >/dev/null || STOP "Git remote origin unavailable"

# Git is the only binary transport. Author on an isolated, detached worktree.
git -C "$P" fetch --no-tags origin \
  "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" \
  || STOP "could not fetch latest authorized Pose Lab feature branch"
REMOTE="$(git -C "$P" rev-parse "refs/remotes/origin/$BRANCH")"
STATE_ROOT="$HOME/.local/state/pose-lab-v2/connie-phone-ingress"
mkdir -p "$STATE_ROOT"
SESSION="$(mktemp -d "$STATE_ROOT/session.XXXXXXXX")"
WORK="$SESSION/worktree"
git -C "$P" worktree add --detach "$WORK" "$REMOTE" >/dev/null \
  || STOP "could not open isolated Git authoring worktree"
cd "$WORK"

source tools/campaigns/campaign_common.sh
pose_campaign_boot "$WORK" "$CONTRACT"
PACKET="$SESSION/doctrine.md"
python3 tools/campaigns/sprite_doctrine_boot.py --task extract \
  --contract "$CONTRACT" --output "$PACKET" \
  || STOP "sprite extraction doctrine gate failed"
cat "$PACKET"

python3 tools/campaigns/connie_phone_source_ingress.py check-manifest
python3 tools/campaigns/connie_phone_source_ingress.py prepare
python3 tools/campaigns/connie_phone_source_ingress.py verify-import
python3 tools/test_connie_anatomical_calibration.py
pose_campaign_verify "$WORK" "$CONTRACT"
pose_campaign_check_worktree "$WORK" "$CONTRACT"

if git -C "$WORK" diff --quiet HEAD -- \
  "$CALIBRATION" "$REPORT" && \
  ! git -C "$WORK" ls-files --others --exclude-standard \
  -- "${SOURCES[@]}" | grep -q .; then
  echo "CONNIE_PHONE_IMPORT=ALREADY_PRESENT; NO_NEW_COMMIT"
  echo "REMOTE_GIT_REVISION=$REMOTE"
  echo "HUMAN_VISUAL_VERDICT=PENDING"
  exit 0
fi

# Stage implementation before receipt, with the campaign allowlist as authority.
pose_campaign_stage "$WORK" "$CONTRACT" \
  "${SOURCES[@]}" "$CALIBRATION" "$REPORT"
git -C "$WORK" diff --cached --check
IMPLEMENTATION="$(pose_campaign_commit "$WORK" \
  "Import four SHA-verified Connie phone source PNGs" | tail -n 1)"

python3 - "$WORK" <<'PY'
import hashlib,json,subprocess,sys
from pathlib import Path
root=Path(sys.argv[1])
cfg=json.loads((root/"campaigns/connie-anatomical-calibration-v1.json").read_text())
for role, info in cfg["sourceAuthority"]["sourceDigests"].items():
    blob=subprocess.check_output(["git","-C",str(root),"show","HEAD:"+info["file"]])
    actual=hashlib.sha256(blob).hexdigest()
    if actual!=info["sha256"]:
        raise SystemExit("STOP: committed Git blob mismatch for "+role)
    print("COMMITTED_GIT_BLOB_SHA_OK",role,actual)
PY

pose_campaign_write_receipt "$WORK" "$CONTRACT" "$REMOTE" \
  "$IMPLEMENTATION" "" "" "android-termux-git-binary-ingress" "pending"
pose_campaign_stage "$WORK" "$CONTRACT" \
  campaigns/connie-phone-source-ingress-v1.receipt.json
FINAL="$(pose_campaign_commit "$WORK" \
  "Receipt: Connie phone source ingress, visual review pending" | tail -n 1)"

pose_campaign_push_and_readback "$WORK" "$BRANCH" "$FINAL"
python3 tools/campaigns/connie_phone_source_ingress.py verify-import
echo "CONNIE_PHONE_INGRESS_COMMITTED=4"
echo "SOURCE_SHA_256_VERIFIED=4"
echo "GITHUB_REVISION=$FINAL"
echo "GITHUB_SOURCE_BASE=https://github.com/Valar05/pose-lab-v2/tree/$FINAL/public/assets/connie/source"
echo "CONNIE_NORMALIZATION=NOT_APPLIED"
echo "HUMAN_VISUAL_VERDICT=PENDING"
echo "ORIGINAL_LOCAL_HEAD_PRESERVED=$LOCAL_HEAD"
