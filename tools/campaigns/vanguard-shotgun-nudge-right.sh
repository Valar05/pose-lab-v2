#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
cd "$P"

NUDGE_X="${NUDGE_X:-6}"

RELOAD="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
RENDERER="src/procedural-motion-preview.js"

echo "============================================================"
echo " VANGUARD SHOTGUN NUDGE RIGHT"
echo "============================================================"
echo "MISSION=nudge both shotgun animations slightly to the right"
echo "AUTHORITY=recipe placement only"
echo "WRITABLE=$RELOAD"
echo "WRITABLE+=$FIRE"
echo "LOCKED=all atlas PNGs; renderer behavior; effects; registration; timing; dropdown"
echo "NUDGE_X=$NUDGE_X"

echo
echo "=== RULE PREFLIGHT ==="
test -f AGENTS.md
test -f docs/POSE_LAB_CAMPAIGN_RULES.md
test -f docs/POSE_IS_GOD.md
echo "RULES_PRESENT=YES"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short || true
git fetch origin main || true
echo "START_HEAD=$(git rev-parse HEAD)"

echo
echo "=== PATCH BOTH SHOTGUN RECIPES ==="
python3 - "$NUDGE_X" "$RELOAD" "$FIRE" <<'PY'
import json, sys
from pathlib import Path

nudge = int(sys.argv[1])
paths = [Path(p) for p in sys.argv[2:]]

preferred_paths = [
    ("centerX",),
    ("preview", "centerX"),
    ("placement", "centerX"),
    ("render", "centerX"),
    ("registration", "centerX"),
    ("body", "centerX"),
    ("bodyPlacement", "centerX"),
]

def resolve_slot(obj, path):
    cur = obj
    for part in path[:-1]:
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    leaf = path[-1]
    if isinstance(cur, dict) and isinstance(cur.get(leaf), (int, float)):
        return cur, leaf
    return None

def collect_centerx(obj, prefix=()):
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "centerX" and isinstance(v, (int, float)):
                found.append(prefix + (k,))
            found.extend(collect_centerx(v, prefix + (k,)))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            found.extend(collect_centerx(v, prefix + (str(i),)))
    return found

for path in paths:
    data = json.loads(path.read_text())
    matches = [p for p in preferred_paths if resolve_slot(data, p) is not None]

    if len(matches) != 1:
        found = [".".join(p) for p in collect_centerx(data)]
        raise AssertionError(
            f"STOP: {path} expected exactly one known centerX target; "
            f"preferred_matches={[ '.'.join(m) for m in matches ]}; "
            f"all_centerX={found}"
        )

    parent, key = resolve_slot(data, matches[0])
    old = parent[key]
    new = old + nudge
    parent[key] = new
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"{path}: {'.'.join(matches[0])} {old} -> {new}")
PY

echo
echo "=== READBACK ==="
python3 - "$RELOAD" "$FIRE" <<'PY'
import json, sys
for p in sys.argv[1:]:
    data = json.load(open(p))
    def pick(d):
        for chain in [
            ("centerX",),
            ("preview","centerX"),
            ("placement","centerX"),
            ("render","centerX"),
            ("registration","centerX"),
            ("body","centerX"),
            ("bodyPlacement","centerX"),
        ]:
            cur = d
            ok = True
            for part in chain[:-1]:
                if not isinstance(cur, dict) or part not in cur:
                    ok = False
                    break
                cur = cur[part]
            if ok and isinstance(cur, dict) and isinstance(cur.get(chain[-1]), (int, float)):
                return ".".join(chain), cur[chain[-1]]
        return None, None
    name, val = pick(data)
    print(f"{p}: {name}={val}")
PY

node --check "$RENDERER"

echo
echo "=== DIFF ==="
git diff -- "$RELOAD" "$FIRE" || true

STAMP="$(date +%s)"
echo
echo "============================================================"
echo " REVIEW URLS"
echo "============================================================"
echo "RELOAD=http://127.0.0.1:8769/motion.html?procedural=vanguard-shotgun-reload&nocache=$STAMP"
echo "FIRE=http://127.0.0.1:8769/motion.html?procedural=vanguard-shotgun-fire&nocache=$STAMP"
echo "DONE"
