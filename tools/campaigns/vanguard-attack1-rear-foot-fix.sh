#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$PWD}"
cd "$ROOT"

TARGET="public/assets/vanguard/procedural/overhand-strike.recipe.json"

echo "============================================================"
echo " VANGUARD ATTACK 1 REAR-FOOT FIX"
echo "============================================================"
echo "MISSION=fix attack1 disappearance + body hop by correcting source-local crops for the bad attack1 cells and re-registering them to the same rear foot"
echo "AUTHORITY=observed attack1 source-local cells + existing overhand-strike recipe"
echo "WRITABLE=$TARGET"
echo "LOCKED=all atlas PNGs; renderer; run recipe; shotgun files; effects; registration outside attack1"

echo
echo "=== DIRTY PREFLIGHT ==="
git diff --quiet -- "$TARGET" || {
  echo "STOP: target dirty: $TARGET"
  exit 1
}
echo "OK: target clean"

echo
echo "=== SYNC MAIN ==="
git fetch origin main
git pull --ff-only origin main
START_HEAD="$(git rev-parse HEAD)"
echo "START_HEAD=$START_HEAD"

python3 - <<'PY'
import json
from pathlib import Path

path = Path("public/assets/vanguard/procedural/overhand-strike.recipe.json")
data = json.loads(path.read_text())

# Hand-tuned from the source-local images you already extracted:
# - cell 26 should use the TOP sprite
# - cells 32 and 35 should use the LOWER sprite
# - cell 40, if present, should use the TOP sprite
#
# Rects are in source-local image space (the 162x102-ish source panes),
# not atlas space. Rear-foot anchors are provided in BOTH full-pane and
# rect-local form so we can adapt to the coordinate style already used by
# the recipe.
SPECS = {
    2: {
        "crop": None,
        "anchor_full": [59, 91],   # anticipation / idle-return
    },
    26: {
        "crop": {"x": 46, "y": 0,  "w": 78, "h": 52},   # chamber: TOP sprite
        "anchor_full": [63, 45],
        "anchor_local": [17, 45],
    },
    32: {
        "crop": {"x": 42, "y": 55, "w": 86, "h": 47},   # lean-forward: LOWER sprite
        "anchor_full": [61, 100],
        "anchor_local": [19, 45],
    },
    35: {
        "crop": {"x": 48, "y": 52, "w": 78, "h": 50},   # contact / recoil: LOWER sprite
        "anchor_full": [63, 101],
        "anchor_local": [15, 49],
    },
    40: {
        "crop": {"x": 42, "y": 0,  "w": 80, "h": 32},   # safety if this cell is used
        "anchor_full": [61, 25],
        "anchor_local": [19, 25],
    },
}

CELL_KEYS = ("atlasCell", "cell", "sourceCell", "atlasIndex")

def iter_nodes(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from iter_nodes(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_nodes(v)

def get_cell(d):
    for k in CELL_KEYS:
        v = d.get(k)
        if isinstance(v, int):
            return v
    src = d.get("source")
    if isinstance(src, dict):
        for k in CELL_KEYS:
            v = src.get(k)
            if isinstance(v, int):
                return v
    return None

def ensure_dict(parent, key):
    if not isinstance(parent.get(key), dict):
        parent[key] = {}
    return parent[key]

def set_rect_generic(d, rect):
    if rect is None:
        return

    target = None
    for key in ("sourceRect", "sourceBounds", "cropRect", "sourceCrop"):
        if isinstance(d.get(key), dict):
            target = d[key]
            break
    if target is None:
        target = {}
        d["sourceRect"] = target

    if any(k in target for k in ("x", "y", "w", "h")) or not target:
        target["x"] = rect["x"]
        target["y"] = rect["y"]
        target["w"] = rect["w"]
        target["h"] = rect["h"]
    if any(k in target for k in ("left", "top", "width", "height")) or "w" not in target:
        target["left"] = rect["x"]
        target["top"] = rect["y"]
        target["width"] = rect["w"]
        target["height"] = rect["h"]

def choose_anchor(current, spec):
    # If an existing anchor is clearly rect-local, keep rect-local.
    # Otherwise use full-pane coordinates.
    if isinstance(current, list) and len(current) == 2 and all(isinstance(v, (int, float)) for v in current):
        if "anchor_local" in spec and current[0] <= 140 and current[1] <= 110:
            # Ambiguous, but attack recipes usually store local-ish points.
            # If current point is small enough to fit inside the local crop,
            # prefer local coordinates.
            lx, ly = spec.get("anchor_local", spec["anchor_full"])
            crop = spec.get("crop")
            if crop and current[0] <= crop["w"] + 8 and current[1] <= crop["h"] + 8:
                return [lx, ly]
        return list(spec["anchor_full"])
    # No usable current anchor: prefer local if we have a crop, else full.
    if spec.get("crop") and "anchor_local" in spec:
        return list(spec["anchor_local"])
    return list(spec["anchor_full"])

def set_anchor_generic(d, spec):
    # Top-level anchor
    if "anchorPoint" in d or "crop" in spec:
        d["anchorPoint"] = choose_anchor(d.get("anchorPoint"), spec)

    # Common nested registration shapes
    reg = ensure_dict(d, "registration") if "registration" in d else None
    if reg is not None or "anchorPoint" not in d:
        reg = ensure_dict(d, "registration")
        reg["anchorPoint"] = choose_anchor(reg.get("anchorPoint"), spec)

    # If the recipe uses body-specific anchors, keep them aligned too.
    for holder in (d, reg):
        if isinstance(holder, dict):
            if "bodyAnchorPoint" in holder:
                holder["bodyAnchorPoint"] = choose_anchor(holder.get("bodyAnchorPoint"), spec)

def maybe_tag_background(d):
    # If a source-local background-key system is already present, keep it black-border.
    for key in ("bodyBackgroundKey", "backgroundKey", "sourceBackgroundKey", "sourceLocalBackgroundKey"):
        if key in d:
            d[key] = "black-border"
    for key in ("bodyBackgroundThreshold", "backgroundThreshold", "sourceBackgroundThreshold", "sourceLocalBackgroundThreshold"):
        if key in d:
            d[key] = 18

hits = []
for node in iter_nodes(data):
    cell = get_cell(node)
    if cell in SPECS:
        spec = SPECS[cell]
        set_rect_generic(node, spec["crop"])
        set_anchor_generic(node, spec)
        maybe_tag_background(node)
        hits.append(cell)

# Must hit at least the known live attack1 cells.
required_any = {2, 26, 32, 35}
if not required_any.intersection(hits):
    raise SystemExit("STOP: no attack1 cells found in overhand-strike recipe")

path.write_text(json.dumps(data, indent=2) + "\n")

print("PATCHED_CELLS=", sorted(set(hits)))
print("CENTERING_MODE=rear-foot pin")
print("CROP_MODE=cell26 top; cell32 lower; cell35 lower; cell40 top")
PY

echo
echo "=== VERIFY MUTATION ==="
git diff --quiet -- "$TARGET" && {
  echo "STOP: script made no change to $TARGET"
  exit 1
}
git --no-pager diff -- "$TARGET"

echo
echo "=== COMMIT ==="
git add "$TARGET"
git commit -m "Fix Vanguard attack1 source crops and rear-foot registration"

REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "DONE"
echo "Review Vanguard - Overhand Strike."
echo "If chamber/contact/recoil stop hopping and the disappearing frames are gone, push it."
