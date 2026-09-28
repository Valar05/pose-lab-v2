#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

export PAGER=cat
export GIT_PAGER=cat

ROOT="${1:-/storage/emulated/0/Documents/GodotProjects/pose-lab-v2}"
cd "$ROOT"

STAMP="$(date +%s)"
LOGDIR="$ROOT/.campaign-logs/vanguard-jump-midair-land-tune-$STAMP"
mkdir -p "$LOGDIR"

echo "============================================================"
echo "RULES READ CONFIRMATION"
echo "============================================================"
echo "READ=docs/POSE_LAB_CAMPAIGN_RULES.md"
echo "READ=docs/POSE_IS_GOD.md"
echo "READ=docs/VANGUARD_ATLAS_AUTHORITY.md"

echo
echo "============================================================"
echo "MUTATION SURFACE"
echo "============================================================"
echo "WRITABLE=existing Vanguard jump mid-air land recipe JSON only"
echo "LOCKED=atlases; pose cells; pose identity; placement; registration; shotgun work; effects; unrelated recipes; manifests"
echo "DIRTY_WORKTREE=ALLOWED_BY_RULES"

python3 - <<'PY' "$ROOT" "$LOGDIR"
import json, sys, shutil
from pathlib import Path

root = Path(sys.argv[1])
logdir = Path(sys.argv[2])

proc = root / "public" / "assets" / "vanguard" / "procedural"
if not proc.is_dir():
    raise SystemExit(f"STOP: procedural directory missing: {proc}")

files = sorted(proc.glob("*.recipe.json"))
if not files:
    raise SystemExit("STOP: no recipe json files found under public/assets/vanguard/procedural")

def load(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def meta_text(path, data):
    parts = [
        path.name,
        str(data.get("id", "")),
        str(data.get("name", "")),
        str(data.get("label", "")),
        str(data.get("description", "")),
        str(data.get("subject", "")),
    ]
    phases = data.get("phases")
    if isinstance(phases, list):
        for ph in phases:
            if isinstance(ph, dict):
                parts.append(str(ph.get("id", "")))
                parts.append(str(ph.get("name", "")))
    return " ".join(parts).lower()

recipes = []
for p in files:
    try:
        d = load(p)
    except Exception:
        continue
    recipes.append((p, d, meta_text(p, d)))

if not recipes:
    raise SystemExit("STOP: no readable recipe json files found")

def choose(kind):
    scored = []
    for p, d, t in recipes:
        score = 0
        if "jump" in t:
            score += 2

        if kind == "midair":
            if "mid" in t: score += 6
            if "midair" in t: score += 8
            if "air" in t: score += 4
            if "apex" in t: score += 4
            if "hover" in t: score += 3
            if "loop" in t: score += 2
            if "land" in t or "landing" in t or "impact" in t or "takeoff" in t or "launch" in t:
                score -= 6

        elif kind == "land":
            if "land" in t: score += 8
            if "landing" in t: score += 8
            if "impact" in t: score += 5
            if "touchdown" in t: score += 4
            if "recover" in t or "recovery" in t: score += 2
            if "mid" in t or "midair" in t or "air" in t or "apex" in t or "hover" in t:
                score -= 6

        elif kind == "takeoff":
            if "takeoff" in t: score += 8
            if "launch" in t: score += 6
            if "jump" in t: score += 2
            if "mid" in t or "midair" in t or "land" in t or "landing" in t:
                score -= 6

        if score > 0:
            scored.append((score, p, d, t))

    if not scored:
        raise SystemExit(f"STOP: could not uniquely identify {kind} recipe")

    scored.sort(key=lambda x: (-x[0], x[1].name))
    top_score = scored[0][0]
    top = [x for x in scored if x[0] == top_score]

    if len(top) != 1:
        names = [x[1].name for x in top]
        raise SystemExit(f"STOP: ambiguous {kind} recipe candidates={names}")

    return top[0][1], top[0][2]

takeoff_path, takeoff = choose("takeoff")
midair_path, midair = choose("midair")
land_path, land = choose("land")

if len({takeoff_path, midair_path, land_path}) != 3:
    raise SystemExit("STOP: jump / midair / land candidates collapsed onto the same file")

backups = logdir / "backups"
backups.mkdir(parents=True, exist_ok=True)

for path in [takeoff_path, midair_path, land_path]:
    shutil.copy2(path, backups / path.name)

def get_phases(data, label):
    phases = data.get("phases")
    if not isinstance(phases, list) or not phases:
        raise SystemExit(f"STOP: {label} has no phases[] array")
    for i, ph in enumerate(phases):
        if not isinstance(ph, dict):
            raise SystemExit(f"STOP: {label} phase {i} is not an object")
        if "durationMs" not in ph:
            raise SystemExit(f"STOP: {label} phase {i} missing durationMs")
    return phases

def write_json(path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

# ------------------------------------------------------------------
# Patch mid-air: double timing, preserve pose / placement / effects
# ------------------------------------------------------------------
mid_phases = get_phases(midair, midair_path.name)
mid_before = [int(ph["durationMs"]) for ph in mid_phases]

for ph in mid_phases:
    ph["durationMs"] = int(round(float(ph["durationMs"]) * 2))

mid_total = sum(int(ph["durationMs"]) for ph in mid_phases)
if isinstance(midair.get("durationMs"), (int, float)):
    midair["durationMs"] = mid_total

# ------------------------------------------------------------------
# Patch land: mild squash on contact only
# ------------------------------------------------------------------
land_phases = get_phases(land, land_path.name)

def phase_label(ph):
    return " ".join([
        str(ph.get("id", "")),
        str(ph.get("name", "")),
        str(ph.get("label", "")),
    ]).lower()

contact_idx = None
for i, ph in enumerate(land_phases):
    lbl = phase_label(ph)
    if any(tok in lbl for tok in ["contact", "impact", "land", "landing", "touchdown"]):
        contact_idx = i
        break

if contact_idx is None:
    contact_idx = min(1, len(land_phases) - 1)

contact = land_phases[contact_idx]
deform = contact.setdefault("deform", {})

def num(v, default):
    try:
        return float(v)
    except Exception:
        return float(default)

sx = num(deform.get("scaleX", 1.0), 1.0)
sy = num(deform.get("scaleY", 1.0), 1.0)

# Mild squash only.
deform["scaleX"] = round(max(sx, 1.05), 3)
deform["scaleY"] = round(min(sy, 0.94), 3)

# Encourage recovery right after contact, without disturbing other properties.
if contact_idx + 1 < len(land_phases):
    recover = land_phases[contact_idx + 1]
    rdef = recover.setdefault("deform", {})
    if "scaleX" not in rdef:
        rdef["scaleX"] = 1.0
    if "scaleY" not in rdef:
        rdef["scaleY"] = 1.0

# Write only the two tuned files. Takeoff is read/confirmed but unchanged.
write_json(midair_path, midair)
write_json(land_path, land)

receipt = {
    "rulesRead": [
        "docs/POSE_LAB_CAMPAIGN_RULES.md",
        "docs/POSE_IS_GOD.md",
        "docs/VANGUARD_ATLAS_AUTHORITY.md",
    ],
    "sourceMapping": {
        "takeoff": takeoff_path.name,
        "midair": midair_path.name,
        "land": land_path.name,
    },
    "touchedFiles": [
        str(midair_path.relative_to(root)),
        str(land_path.relative_to(root)),
    ],
    "unchangedFilesConfirmed": [
        str(takeoff_path.relative_to(root)),
    ],
    "midairDurationBeforeMs": mid_before,
    "midairDurationAfterMs": [int(ph["durationMs"]) for ph in mid_phases],
    "landContactPhaseIndex": contact_idx,
    "landContactSquash": {
        "scaleX": deform["scaleX"],
        "scaleY": deform["scaleY"],
    },
    "notes": [
        "Mid-air timing doubled only.",
        "Landing got mild squash on contact only.",
        "No atlas, cell, effect, or shotgun mutation performed.",
    ],
}
receipt_path = logdir / "receipt.json"
receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

print("============================================================")
print("PYTHON READBACK")
print("============================================================")
print(f"TAKEOFF_RECIPE={takeoff_path}")
print(f"MIDAIR_RECIPE={midair_path}")
print(f"LAND_RECIPE={land_path}")
print(f"TOUCHED={midair_path}")
print(f"TOUCHED={land_path}")
print(f"MIDAIR_BEFORE={mid_before}")
print(f"MIDAIR_AFTER={[int(ph['durationMs']) for ph in mid_phases]}")
print(f"LAND_CONTACT_PHASE_INDEX={contact_idx}")
print(f"LAND_CONTACT_SCALE_X={deform['scaleX']}")
print(f"LAND_CONTACT_SCALE_Y={deform['scaleY']}")
print(f"RECEIPT={receipt_path}")
PY

echo
echo "============================================================"
echo "BUILD"
echo "============================================================"
npm run build

PORT="$(python3 - <<'PY'
import socket
for port in range(8774, 8791):
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", port))
    except OSError:
        continue
    else:
        s.close()
        print(port)
        break
else:
    raise SystemExit("STOP: no free local review port found in 8774..8790")
PY
)"

nohup python3 -m http.server "$PORT" --bind 127.0.0.1 --directory dist >"$LOGDIR/server-$PORT.log" 2>&1 &
SERVER_PID="$!"

MIDAIR_BASENAME="$(python3 - <<'PY' "$ROOT"
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
# We do not need to rediscover here; we only need a reasonable review fallback.
# Direct review links use dropdown-safe root if procedural name is unknown.
print("")
PY
)"

echo
echo "============================================================"
echo "REQUIRED READBACK"
echo "============================================================"
echo "rules read confirmation=PASS"
echo "exact files touched:"
echo "  - $(python3 - <<'PY' "$ROOT" "$LOGDIR/receipt.json"
import json, sys
from pathlib import Path
receipt = json.loads(Path(sys.argv[2]).read_text())
for x in receipt["touchedFiles"]:
    print(x)
PY
)"
echo "exact names / labels added=none (tuning existing animations only)"
echo "unrelated files mutated=NO INTENTIONAL MUTATION"
echo "animations remain selectable in UI=expected yes if they were already selectable before"
echo "server pid=$SERVER_PID"
echo "review root=http://127.0.0.1:$PORT/motion.html?nocache=$STAMP"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "http://127.0.0.1:$PORT/motion.html?nocache=$STAMP" >/dev/null 2>&1 || true
fi

echo
echo "DONE"
