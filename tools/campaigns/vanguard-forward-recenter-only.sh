#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "============================================================"
echo " VANGUARD FORWARD RECENTER ONLY"
echo "============================================================"
echo "MISSION=fix run + attack1 forward centering only"
echo "AUTHORITY=recipe metadata only; no atlas rebuild; no renderer surgery"
echo "WRITABLE=public/assets/vanguard/procedural/run.recipe.json"
echo "WRITABLE+=public/assets/vanguard/procedural/overhand-strike.recipe.json"
echo "LOCKED=all atlas PNGs; all shotgun files; effects; registration; non-target recipes"
echo

ROOT="${ROOT:-$PWD}"
cd "$ROOT"

RUN_RECIPE="${RUN_RECIPE:-public/assets/vanguard/procedural/run.recipe.json}"
ATTACK_RECIPE="${ATTACK_RECIPE:-public/assets/vanguard/procedural/overhand-strike.recipe.json}"

# Negative usually moves the sprite left on screen; flip sign if needed.
RUN_DX="${RUN_DX:--6}"
ATTACK_DX="${ATTACK_DX:--6}"

echo "=== DIRTY PREFLIGHT ==="
git diff --quiet -- "$RUN_RECIPE" "$ATTACK_RECIPE" || {
  echo "STOP: target recipe already dirty"
  git status --short -- "$RUN_RECIPE" "$ATTACK_RECIPE"
  exit 1
}
echo "OK: targets clean"
echo

echo "=== SYNC MAIN ==="
git fetch origin main
git pull --ff-only
echo "START_HEAD=$(git rev-parse HEAD)"
echo

python3 - "$RUN_RECIPE" "$ATTACK_RECIPE" "$RUN_DX" "$ATTACK_DX" <<'PY'
import json, sys, pathlib

run_path = pathlib.Path(sys.argv[1])
atk_path = pathlib.Path(sys.argv[2])
run_dx = float(sys.argv[3])
atk_dx = float(sys.argv[4])

CANDIDATE_NUMERIC_KEYS = {
    "anchorX",
    "centerX",
    "offsetX",
    "renderOffsetX",
    "spriteOffsetX",
    "bodyOffsetX",
    "bodyX",
    "originX",
    "placementX",
    "targetX",
}

CANDIDATE_NESTED_KEYS = {"offset", "anchor", "origin", "center", "position", "body", "placement"}

def load(p):
    return json.loads(p.read_text())

def dump(p, data):
    p.write_text(json.dumps(data, indent=2) + "\n")

def textish(v):
    return isinstance(v, str)

def is_forward_marker(s):
    s = s.lower()
    return (
        s == "forward"
        or s.startswith("forward-")
        or s.endswith("-forward")
        or "forward" in s
    )

def is_forward_context(stack):
    for item in stack:
        if textish(item) and is_forward_marker(item):
            return True
    return False

def patch_obj(obj, dx, path_bits, stack, changes):
    touched = False

    local_markers = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and k.lower() in {"name", "label", "id", "phase", "segment", "state", "section", "source", "tag"}:
                local_markers.append(v)

    forward_here = is_forward_context(stack + local_markers)

    if isinstance(obj, dict):
        # Direct numeric X-like fields
        if forward_here:
            for k in list(obj.keys()):
                if k in CANDIDATE_NUMERIC_KEYS and isinstance(obj[k], (int, float)):
                    before = obj[k]
                    obj[k] = before + dx
                    changes.append((".".join(path_bits + [k]), before, obj[k]))
                    touched = True

            # Nested dictionaries with x
            for k, v in obj.items():
                if k in CANDIDATE_NESTED_KEYS and isinstance(v, dict) and isinstance(v.get("x"), (int, float)):
                    before = v["x"]
                    v["x"] = before + dx
                    changes.append((".".join(path_bits + [k, "x"]), before, v["x"]))
                    touched = True

        # Recurse
        for k, v in obj.items():
            child_stack = stack + local_markers + [k]
            if isinstance(v, (dict, list)):
                if patch(v, dx, path_bits + [str(k)], child_stack, changes):
                    touched = True

    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, (dict, list)):
                if patch(v, dx, path_bits + [str(i)], stack, changes):
                    touched = True

    return touched

def patch(node, dx, path_bits, stack, changes):
    if isinstance(node, dict):
        return patch_obj(node, dx, path_bits, stack, changes)
    elif isinstance(node, list):
        touched = False
        for i, item in enumerate(node):
            if isinstance(item, (dict, list)):
                if patch(item, dx, path_bits + [str(i)], stack, changes):
                    touched = True
        return touched
    return False

def run_one(path, dx, label):
    data = load(path)
    changes = []
    touched = patch(data, dx, [path.name], [], changes)
    if not touched or not changes:
        raise SystemExit(f"STOP: no forward-centering fields changed in {path}")
    dump(path, data)
    print(f"{label}_RECIPE={path}")
    print(f"{label}_DX={dx}")
    print(f"{label}_CHANGES={len(changes)}")
    for p, a, b in changes:
        print(f"  {p}: {a} -> {b}")

run_one(run_path, run_dx, "RUN")
run_one(atk_path, atk_dx, "ATTACK1")
PY

echo
echo "=== VALIDATE ==="
node --check src/procedural-motion-preview.js
echo "REPOSITORY_AUTHORING_MUTATION=RECIPE_ONLY"
echo

echo "=== DIFF ==="
git diff -- "$RUN_RECIPE" "$ATTACK_RECIPE" || true
echo

echo "DONE"
echo "If run/attack moved the wrong direction, rerun with:"
echo "  RUN_DX=6 ATTACK_DX=6 bash tools/campaigns/vanguard-forward-recenter-only.sh"
