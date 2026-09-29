#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

# Heavy2 V2 campaign: exact Heavy1 contact-review lane, action-swapped only.
# Human review remains paginated 2x2 contact sheets; sprite generation stays off.
ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
CONTRACT="campaigns/obsidian-lionheart-sprite-bounty-v1.contract.json"
SELF="generated/obsidian-lionheart/run-heavy2-contact-review.sh"
COMMON="tools/campaigns/campaign_common.sh"
FRAMEWORK="docs/POSE_CAMPAIGN_FRAMEWORK.md"
CONTINUATION="docs/campaigns/OBSIDIAN_LIONHEART_SPRITE_BOUNTY.md"
RUNNER="scripts/run-blender-tool.mjs"
RENDERER="tools/render_selected_action_beauty.py"

ACTION="Heavy2"
WIDTH=512
HEIGHT=512
CAMERA_SIDE="left"

ASSET="$HOME/.local/state/pose-lab-v2-lionheart-lancer/worktree/public/assets/lionheart-lancer/LionheartLancer.glb"
STATE="$HOME/.local/state/pose-lab-v2-obsidian-heavy2-contact-review"
LIVE="$STATE/live"
TMP="$STATE/tmp_frames"

EXISTING="/storage/emulated/0/Download/LionheartHeavy2Review"
OUT_BASE="/storage/emulated/0/Download/LionheartHeavy2ContactReview"

stop(){ echo "STOP: $*" >&2; exit 1; }

[ -d "$ROOT/.git" ] || stop "Pose Lab checkout missing: $ROOT"
cd "$ROOT"

echo "=== PRIMARY WORKTREE READ-ONLY ==="
git status --short

echo "=== FETCH + SEAL CANONICAL MAIN ==="
git fetch origin main
SEALED="$(git rev-parse origin/main)"
echo "SEALED_REV=$SEALED"

for f in   "$CONTRACT" "$SELF" "$COMMON" "$FRAMEWORK" "$CONTINUATION" "$RUNNER" "$RENDERER"
do
  git cat-file -e "$SEALED:$f" || stop "sealed package missing: $f"
done

mkdir -p "$STATE"
if [ -e "$LIVE" ]; then
  git worktree remove --force "$LIVE" >/dev/null 2>&1 || stop "could not retire stale worktree"
fi
git worktree add --detach "$LIVE" "$SEALED" >/dev/null
cd "$LIVE"
source "$COMMON"

echo "=== STICKY BOOT ==="
pose_campaign_boot "$LIVE" "$CONTRACT"
cat "$FRAMEWORK" >/dev/null
echo "READ=$FRAMEWORK"
cat "$CONTINUATION" >/dev/null
echo "READ=$CONTINUATION"

echo "=== CONTRACT VERIFY ==="
pose_campaign_verify "$LIVE" "$CONTRACT"
pose_campaign_check_worktree "$LIVE" "$CONTRACT"
[ -z "$(git status --porcelain)" ] || stop "sealed campaign worktree dirty before review build"

echo "=== LOCATE / PREPARE FRAME SOURCE ==="
SOURCE=""
if [ -f "$EXISTING/manifest.json" ]; then
  if python3 - "$EXISTING" "$ACTION" "$WIDTH" "$HEIGHT" <<'PY'
import json, sys
from pathlib import Path
root=Path(sys.argv[1]); action=sys.argv[2]; w=int(sys.argv[3]); h=int(sys.argv[4])
m=json.loads((root/"manifest.json").read_text())
assert m.get("status")=="PASS"
assert m.get("actionRequested")==action
assert m.get("resolution")==[w,h]
frames=m.get("frames") or []
assert frames
assert m.get("selectedKeyIndices")==list(range(len(frames)))
assert len(frames)==m.get("authoredKeyframeCount")
for i,f in enumerate(frames):
    assert f.get("keyIndex")==i
    p=root/f.get("image","")
    assert p.is_file()
print(len(frames))
PY
  then
    SOURCE="$EXISTING"
    echo "REUSE_EXISTING_FRAMES=$SOURCE"
  fi
fi

if [ -z "$SOURCE" ]; then
  echo "=== RENDER EVERY AUTHORED HEAVY2 KEYFRAME ==="
  rm -rf "$TMP"
  mkdir -p "$TMP"
  [ -f "$ASSET" ] || stop "Lionheart donor GLB missing: $ASSET"
  node "$RUNNER"     "$RENDERER" --     --asset "$ASSET"     --action "$ACTION"     --out-dir "$TMP"     --all-keyframes     --camera-side "$CAMERA_SIDE"     --width "$WIDTH"     --height "$HEIGHT"
  SOURCE="$TMP"
fi

OUT="$OUT_BASE"
if [ -e "$OUT" ] && find "$OUT" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null | grep -q .; then
  OUT="${OUT_BASE}-$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p "$OUT"

echo "=== BUILD 2X2 CONTACT SHEETS ==="
python3 - "$SOURCE" "$OUT" "$ACTION" "$WIDTH" "$HEIGHT" <<'PY'
from __future__ import annotations
import hashlib, json, math, sys
from pathlib import Path
from PIL import Image

src=Path(sys.argv[1]); out=Path(sys.argv[2]); action=sys.argv[3]
w=int(sys.argv[4]); h=int(sys.argv[5])
manifest=json.loads((src/"manifest.json").read_text())
frames=manifest.get("frames") or []
if not frames:
    raise SystemExit("STOP: no frames in manifest")

cols=2; rows=2; per=4
pages=[]
index=[]
for page_i in range(math.ceil(len(frames)/per)):
    batch=frames[page_i*per:(page_i+1)*per]
    sheet=Image.new("RGBA",(cols*w,rows*h),(0,0,0,255))
    slots=[]
    for slot_i,frame in enumerate(batch):
        p=src/frame["image"]
        img=Image.open(p).convert("RGBA")
        if img.size!=(w,h):
            raise SystemExit(f"STOP: unexpected frame size {p.name}: {img.size}")
        x=(slot_i%cols)*w
        y=(slot_i//cols)*h
        sheet.paste(img,(x,y))
        slots.append({
            "slot":slot_i,
            "keyIndex":frame["keyIndex"],
            "blenderFrame":frame["blenderFrame"],
            "source":frame["image"],
            "sourceSha256":frame["sha256"],
        })
    name=f"{action.upper()}_REVIEW_{page_i+1:02d}.png"
    path=out/name
    sheet.save(path)
    pages.append({
        "page":name,
        "sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
        "slots":slots,
    })
    index.append({"page":name,"slots":slots})

(out/"review-index.json").write_text(json.dumps({
    "schema":"pose-lab-heavy2-contact-review-index-v1",
    "action":action,
    "pageGrid":[2,2],
    "cellResolution":[w,h],
    "pages":index,
},indent=2)+"\n")

receipt={
    "schema":"pose-lab-heavy2-review-handoff-v1",
    "status":"PASS",
    "actionRequested":action,
    "actionResolved":manifest.get("actionResolved"),
    "frameCount":len(frames),
    "renderPolicy":"textured-all-authored-keyframes-2x2-contact-sheets",
    "cellResolution":[w,h],
    "pageGrid":[2,2],
    "pages":pages,
}
(out/"HEAVY2_RECEIPT.json").write_text(json.dumps(receipt,indent=2)+"\n")
print(f"FRAME_COUNT={len(frames)}")
print(f"PAGE_COUNT={len(pages)}")
PY

echo "=== ANDROID MEDIA REFRESH ==="
command -v termux-media-scan >/dev/null 2>&1 || stop "termux-media-scan missing"
for f in "$OUT"/*.png "$OUT"/*.json; do
  [ -f "$f" ] || continue
  termux-media-scan "$f" >/dev/null 2>&1 || true
done
echo "MEDIA_REFRESH=PASS"

echo "=== FINAL VERIFY ==="
python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path
out=Path(sys.argv[1])
receipt=json.loads((out/"HEAVY2_RECEIPT.json").read_text())
assert receipt.get("status")=="PASS"
pages=receipt.get("pages") or []
assert pages
for p in pages:
    assert (out/p["page"]).is_file()
assert (out/"review-index.json").is_file()
print(f"PASS: {len(pages)} contact sheets ready")
PY

pose_campaign_verify "$LIVE" "$CONTRACT"
pose_campaign_check_worktree "$LIVE" "$CONTRACT"

echo "=== HUMAN REVIEW HANDOFF ==="
echo "SEALED_REV=$SEALED"
echo "SOURCE_FRAMES=$SOURCE"
echo "CONTACT_REVIEW_DIR=$OUT"
echo "ACTION=$ACTION"
echo "CELL_RESOLUTION=${WIDTH}x${HEIGHT}"
echo "GRID=2x2"
echo "HUMAN_VERDICT=PENDING"
