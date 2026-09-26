#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
APPEND_MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"
ATLAS="$P/$ATLAS_REL"
APPEND_MANIFEST="$P/$APPEND_MANIFEST_REL"

cd "$P"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md >/dev/null

echo "============================================================"
echo " VANGUARD ONE-ATLAS RUNTIME MIGRATION"
echo "============================================================"
echo "MISSION=make every live Vanguard recipe use the one canonical expanded atlas"
echo "CANONICAL=$ATLAS_REL"
echo "LOCKED=all pose cell IDs; all timing; all effects; all registration; atlas pixels"
echo "WRITABLE=atlas declarations only inside live Vanguard *.recipe.json files"
echo "HISTORICAL_ATLASES=archaeology only; never runtime"

mkdir -p "$L/one-atlas"

mapfile -t TARGETS < <(python3 - <<'PY'
from pathlib import Path
import json
root=Path("public/assets/vanguard/procedural")
for p in sorted(root.glob("*.recipe.json")):
    try:
        o=json.loads(p.read_text())
    except Exception:
        continue
    if o.get("subject")!="vanguard":
        continue
    if "atlas" in o or "vanguard-canonical" in o.get("atlases",{}):
        print(p)
PY
)

[ "${#TARGETS[@]}" -gt 0 ] || { echo "STOP: no live Vanguard recipes found"; exit 1; }

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for X in "${TARGETS[@]}"; do
  if ! git diff --quiet HEAD -- "$X"; then
    git diff -- "$X" > "$L/one-atlas/$(basename "$X").preflight.diff"
    echo "STOP: live Vanguard recipe already dirty: $X"
    exit 1
  fi
done

echo
echo "=== SYNC MAIN ==="
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START="$(git rev-parse HEAD)"
echo "START_HEAD=$START"

echo
echo "=== VERIFY ONE CANONICAL ATLAS ==="
python3 - "$ATLAS" "$APPEND_MANIFEST" <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys
a=Path(sys.argv[1]); m=Path(sys.argv[2])
meta=json.loads(m.read_text())
im=Image.open(a).convert("RGB")
want_size=tuple(meta["result"]["size"])
want_sha=meta["result"]["sha256"]
got_sha=hashlib.sha256(a.read_bytes()).hexdigest()
assert im.size==want_size==(1037,1754), f"STOP: canonical atlas size mismatch {im.size} != {want_size}"
assert got_sha==want_sha, f"STOP: canonical atlas hash mismatch {got_sha} != {want_sha}"
print("CANONICAL_ATLAS_SIZE=1037x1754")
print("CANONICAL_ATLAS_SHA256="+got_sha)
print("CANONICAL_ATLAS_PATH=assets/vanguard/procedural/vanguard-pose-atlas-expanded.png")
PY

ATLAS_SHA="$(sha256sum "$ATLAS" | awk '{print $1}')"

echo
echo "=== MIGRATE LIVE RECIPES, ATLAS DECLARATION ONLY ==="
python3 - "$ATLAS_SHA" "${TARGETS[@]}" <<'PY'
from pathlib import Path
import copy,json,sys
atlas_sha=sys.argv[1]
paths=[Path(x) for x in sys.argv[2:]]

canonical={
  "path":"assets/vanguard/procedural/vanguard-pose-atlas-expanded.png",
  "columns":6,
  "rows":17,
  "indexBase":1,
  "mode":"blue-key",
  "size":[1037,1754],
  "rowBounds":{
    "0":[0,102],"1":[102,205],"2":[205,307],"3":[307,410],"4":[410,512],
    "5":[512,614],"6":[614,717],"7":[717,819],"8":[819,922],"9":[922,1024],
    "10":[1024,1126],"11":[1126,1229],"12":[1229,1331],"13":[1331,1434],
    "14":[1434,1536],"15":[1536,1645],"16":[1645,1754]
  }
}

def without_vanguard_atlas(o):
    x=copy.deepcopy(o)
    if "atlas" in x:
        x.pop("atlas")
    if "atlases" in x and "vanguard-canonical" in x["atlases"]:
        x["atlases"]=copy.deepcopy(x["atlases"])
        x["atlases"].pop("vanguard-canonical")
        if not x["atlases"]:
            x.pop("atlases")
    return x

changed=[]
for p in paths:
    before=json.loads(p.read_text())
    after=copy.deepcopy(before)

    if "atlas" in after:
        old=after["atlas"]
        # procedural-run schema used by Idle/Run.
        after["atlas"]={
          "file":canonical["path"],
          "columns":canonical["columns"],
          "rows":canonical["rows"],
          "indexBase":canonical["indexBase"],
          "size":canonical["size"],
          "sha256":atlas_sha,
          "rowBounds":copy.deepcopy(canonical["rowBounds"])
        }
        # Preserve any non-geometry atlas metadata not superseded above.
        for k,v in old.items():
            if k not in {"file","columns","rows","indexBase","size","sha256","rowBounds"}:
                after["atlas"][k]=v

    if "vanguard-canonical" in after.get("atlases",{}):
        after["atlases"]["vanguard-canonical"]=copy.deepcopy(canonical)

    assert without_vanguard_atlas(before)==without_vanguard_atlas(after), \
        f"STOP: non-atlas property changed in {p}"

    if after!=before:
        p.write_text(json.dumps(after,indent=2)+"\n")
        changed.append(str(p))
        print("MIGRATED="+str(p))

print("MIGRATED_COUNT="+str(len(changed)))
PY

echo
echo "=== ONE-ATLAS GUARD ==="
python3 - "$ATLAS_SHA" <<'PY'
from pathlib import Path
import json,sys
want_sha=sys.argv[1]
root=Path("public/assets/vanguard/procedural")
bad=[]
seen=0
for p in sorted(root.glob("*.recipe.json")):
    try:o=json.loads(p.read_text())
    except Exception:continue
    if o.get("subject")!="vanguard":continue

    if "atlas" in o:
        seen+=1
        a=o["atlas"]
        if a.get("file")!="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png":
            bad.append(f"{p}: atlas.file={a.get('file')}")
        if a.get("size")!=[1037,1754] or a.get("rows")!=17:
            bad.append(f"{p}: atlas geometry stale")
        if a.get("sha256")!=want_sha:
            bad.append(f"{p}: atlas sha stale")

    if "vanguard-canonical" in o.get("atlases",{}):
        seen+=1
        a=o["atlases"]["vanguard-canonical"]
        if a.get("path")!="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png":
            bad.append(f"{p}: canonical path={a.get('path')}")
        if a.get("size")!=[1037,1754] or a.get("rows")!=17:
            bad.append(f"{p}: canonical geometry stale")

assert seen>0
if bad:
    raise SystemExit("STOP: one-atlas guard failed\n" + "\n".join(bad))
print("ONE_ATLAS_GUARD=PASS")
print("LIVE_VANGUARD_POSE_ATLAS_COUNT=1")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -gt 0 ] || { echo "STOP: expected stale live recipes to migrate"; exit 1; }

for X in "${CHANGED[@]}"; do
  [[ "$X" == public/assets/vanguard/procedural/*.recipe.json ]] || {
    echo "STOP: unauthorized diff $X"
    exit 1
  }
done

# Prove the canonical atlas itself did not move by one byte.
[ "$(sha256sum "$ATLAS" | awk '{print $1}')" = "$ATLAS_SHA" ] || {
  echo "STOP: canonical atlas changed during recipe migration"
  exit 1
}

echo
echo "=== COMMIT + PUSH ==="
git add -- "${CHANGED[@]}"
git commit -m "Unify Vanguard runtime on one canonical atlas"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:public/assets/vanguard/procedural/idle.recipe.json" > "$L/one-atlas/idle.json"
git show "$REV:public/assets/vanguard/procedural/run.recipe.json" > "$L/one-atlas/run.json"
python3 - "$L/one-atlas/idle.json" "$L/one-atlas/run.json" "$ATLAS_SHA" <<'PY'
import json,sys
for path in sys.argv[1:3]:
    o=json.load(open(path))
    a=o["atlas"]
    assert a["file"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
    assert a["size"]==[1037,1754]
    assert a["rows"]==17
    assert a["rowBounds"]["16"]==[1645,1754]
    assert a["sha256"]==sys.argv[3]
print("IDLE_RUN_COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
node --check src/procedural-run-preview.js
node --check src/procedural-motion-preview.js
npm run build

echo
echo "=== SERVE EXACT REVISION ==="
[ ! -f "$L/server.pid" ] || kill "$(cat "$L/server.pid")" 2>/dev/null || true
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!
echo "$PID" > "$L/server.pid"
sleep 2
kill -0 "$PID" || { cat "$L/server.log"; exit 1; }

for U in \
  assets/vanguard/procedural/vanguard-pose-atlas-expanded.png \
  assets/vanguard/procedural/idle.recipe.json \
  assets/vanguard/procedural/run.recipe.json \
  assets/vanguard/procedural/shotgun-reload.recipe.json \
  assets/vanguard/procedural/shotgun-fire.recipe.json \
  assets/vanguard/procedural/butt-smash.recipe.json \
  assets/vanguard/procedural/shoulder-charge.recipe.json; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
IDLE="http://127.0.0.1:8766/motion.html?procedural=vanguard-idle&rev=$REV&nocache=$STAMP"
RUNURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-run&rev=$REV&nocache=$STAMP"
RELOAD="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FIRE="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"
BUTT="http://127.0.0.1:8766/motion.html?procedural=vanguard-butt-smash&rev=$REV&nocache=$STAMP"
SHOULDER="http://127.0.0.1:8766/motion.html?procedural=vanguard-shoulder-charge&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " VANGUARD ONE-ATLAS RUNTIME DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "SOLE_ATLAS=assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
echo "IDLE_REVIEW=$IDLE"
echo "RUN_REVIEW=$RUNURL"
echo "RELOAD_REVIEW=$RELOAD"
echo "FIRE_REVIEW=$FIRE"
echo "BUTT_SMASH_REVIEW=$BUTT"
echo "SHOULDER_CHARGE_REVIEW=$SHOULDER"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$IDLE"
