#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-color-softness"
A="$L/authoring"
W="$L/review"

ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
RELOAD_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
FIRE_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
MANIFEST_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"
EFFECT_REL="public/assets/vanguard/procedural/vanguard-shotgun-fire-effect.png"
RENDERER_REL="src/procedural-motion-preview.js"
SHELL_REL="src/procedural-review-shell.js"

cd "$P"
mkdir -p "$L"

cat \
  AGENTS.md \
  docs/POSE_LAB_CAMPAIGN_RULES.md \
  docs/POSE_IS_GOD.md \
  docs/VANGUARD_ATLAS_AUTHORITY.md \
  >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN COLOR + SOFTNESS CAMPAIGN"
echo "============================================================"
echo "MISSION=preserve current shotgun height/placement; match canonical Vanguard red + softness"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "APPEARANCE_AUTHORITY=canonical atlas cell 2"
echo "WRITABLE=$ATLAS_REL cells 97-102 pixels only"
echo "WRITABLE+=$MANIFEST_REL refinement metadata/result sha only"
echo "LOCKED=cell geometry/placement; recipes; centerX; timing; effects; registration; renderer; dropdown; cells 1-96"

echo
echo "=== DIRTY / DIVERGENCE PREFLIGHT ==="
git status --short || true
git fetch origin main

LOCAL_HEAD="$(git rev-parse HEAD)"
ORIGIN_HEAD="$(git rev-parse origin/main)"
BASE="$(git merge-base HEAD origin/main)"
echo "LOCAL_HEAD=$LOCAL_HEAD"
echo "ORIGIN_HEAD=$ORIGIN_HEAD"
echo "MERGE_BASE=$BASE"

if [ "$LOCAL_HEAD" != "$ORIGIN_HEAD" ]; then
  git log --oneline --decorate "$BASE..HEAD" > "$L/local-only-commits.txt" || true
  git diff --binary "$BASE..HEAD" > "$L/local-only-history.patch" || true
  echo "LOCAL_DIVERGENCE=PRESERVED_NOT_MUTATED"
fi
git ls-files --others --exclude-standard > "$L/untracked.txt" || true
echo "PRIMARY_WORKTREE_LEFT_UNTOUCHED=YES"

echo
echo "=== CLEAN AUTHORING WORKTREE FROM ORIGIN/MAIN ==="
git worktree remove --force "$A" 2>/dev/null || true
rm -rf "$A"
git worktree add --detach "$A" "$ORIGIN_HEAD"
cd "$A"

for F in "$ATLAS_REL" "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL" "$EFFECT_REL" "$RENDERER_REL" "$SHELL_REL"; do
  test -e "$F" || { echo "STOP: missing $F"; exit 1; }
done

RELOAD_SHA="$(sha256sum "$RELOAD_REL" | awk '{print $1}')"
FIRE_SHA="$(sha256sum "$FIRE_REL" | awk '{print $1}')"
EFFECT_SHA="$(sha256sum "$EFFECT_REL" | awk '{print $1}')"
RENDERER_SHA="$(sha256sum "$RENDERER_REL" | awk '{print $1}')"
SHELL_SHA="$(sha256sum "$SHELL_REL" | awk '{print $1}')"

cp "$ATLAS_REL" "$L/atlas-before.png"
cp "$MANIFEST_REL" "$L/manifest-before.json"

echo
echo "=== APPLY COLOR + SOFTNESS ONLY ==="
python3 - "$ATLAS_REL" "$RELOAD_REL" "$MANIFEST_REL" <<'PY'
from PIL import Image, ImageFilter, ImageStat, ImageEnhance
from pathlib import Path
import hashlib,json,sys

atlas_p,recipe_p,manifest_p=map(Path,sys.argv[1:])
atlas=Image.open(atlas_p).convert("RGB")
before=atlas.copy()
recipe=json.loads(recipe_p.read_text())
manifest=json.loads(manifest_p.read_text())

assert atlas.size==(1037,1754)
assert recipe["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert recipe["atlases"]["vanguard-canonical"]["rowBounds"]["16"]==[1645,1754]
assert manifest.get("refinement",{}).get("targetForegroundHeight")==67

cols=recipe["atlases"]["vanguard-canonical"]["columns"]
row_bounds={int(k):v for k,v in recipe["atlases"]["vanguard-canonical"]["rowBounds"].items()}
W=atlas.width
THRESH=18

def cell_rect(cell):
    idx=cell-1
    row=idx//cols
    col=idx%cols
    y0,y1=row_bounds[row]
    x0=round(col*W/cols)
    x1=round((col+1)*W/cols)
    return (x0,y0,x1,y1)

def bbox_nonblack(im):
    px=im.load()
    xs=[]; ys=[]
    for y in range(im.height):
        for x in range(im.width):
            if max(px[x,y])>THRESH:
                xs.append(x); ys.append(y)
    if not xs:
        raise SystemExit(f"STOP: empty foreground in {im.size}")
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def stats(im):
    mask=Image.new("L",im.size,0)
    mp=mask.load(); px=im.load()
    for y in range(im.height):
        for x in range(im.width):
            if max(px[x,y])>THRESH:
                mp[x,y]=255
    st=ImageStat.Stat(im,mask=mask)
    edge=ImageStat.Stat(im.convert("L").filter(ImageFilter.FIND_EDGES),mask=mask).mean[0]
    return [max(1.0,v) for v in st.mean[:3]], float(edge)

ref_cell=before.crop(cell_rect(2))
ref_bbox=bbox_nonblack(ref_cell)
ref=ref_cell.crop(ref_bbox)
ref_rgb,ref_edge=stats(ref)
print("REFERENCE_CELL=2")
print("REFERENCE_RGB=",[round(v,2) for v in ref_rgb])
print("REFERENCE_EDGE=",round(ref_edge,3))

report={}
out=before.copy()

for cell in range(97,103):
    rect=cell_rect(cell)
    slot=before.crop(rect)
    bb=bbox_nonblack(slot)
    crop=slot.crop(bb)
    old_size=crop.size
    rgb0,edge0=stats(crop)

    # Match canonical color ratios conservatively, with an explicit red bias.
    gains=[]
    for i in range(3):
        raw=ref_rgb[i]/rgb0[i]
        blended=1.0 + 0.70*(raw-1.0)
        gains.append(max(0.78,min(1.30,blended)))
    gains[0]=min(1.34,gains[0]*1.06)
    gains[1]=max(0.74,gains[1]*0.96)
    gains[2]=max(0.72,gains[2]*0.93)

    r,g,b=crop.split()
    r=r.point(lambda v:min(255,round(v*gains[0])))
    g=g.point(lambda v:min(255,round(v*gains[1])))
    b=b.point(lambda v:min(255,round(v*gains[2])))
    tuned=Image.merge("RGB",(r,g,b))
    tuned=ImageEnhance.Color(tuned).enhance(1.06)

    # Choose the closest softness candidate to canonical cell 2.
    candidates=[("none",tuned)]
    for radius in (0.25,0.40,0.55,0.70,0.90):
        candidates.append((f"blur-{radius}",tuned.filter(ImageFilter.GaussianBlur(radius))))
    candidates.append(("sharpen",tuned.filter(ImageFilter.UnsharpMask(radius=1,percent=80,threshold=2))))

    scored=[]
    for name,img in candidates:
        _,e=stats(img)
        scored.append((abs(e-ref_edge),name,img,e))
    _,mode,tuned,edge1=min(scored,key=lambda x:x[0])

    assert tuned.size==old_size

    x0,y0,x1,y1=rect
    l,t,rgt,bot=bb
    newslot=slot.copy()
    newslot.paste((0,0,0),bb)
    newslot.paste(tuned,(l,t))
    out.paste(newslot,(x0,y0))

    # Geometry is locked exactly.
    newbb=bbox_nonblack(newslot)
    assert newbb==bb, f"STOP: cell {cell} bbox changed {bb}->{newbb}"

    rgb1,_=stats(tuned)
    report[str(cell)]={
        "bbox":[l,t,rgt,bot],
        "size":[old_size[0],old_size[1]],
        "rgbBefore":[round(v,3) for v in rgb0],
        "rgbAfter":[round(v,3) for v in rgb1],
        "channelGains":[round(v,5) for v in gains],
        "edgeBefore":round(edge0,5),
        "edgeAfter":round(edge1,5),
        "softnessMode":mode
    }
    print(f"CELL_{cell}=size:{old_size[0]}x{old_size[1]} bbox:{bb} softness:{mode} edge:{edge0:.3f}->{edge1:.3f}")

# Everything above the quarantined shotgun row is immutable.
assert out.crop((0,0,1037,1645)).tobytes()==before.crop((0,0,1037,1645)).tobytes()

out.save(atlas_p)

new_sha=hashlib.sha256(atlas_p.read_bytes()).hexdigest()
manifest["result"]["sha256"]=new_sha
manifest["refinement"]={
    **manifest.get("refinement",{}),
    "kind":"shotgun-color-softness-v4",
    "humanVerdict":"pending",
    "appearanceAuthority":"canonical atlas cell 2",
    "geometryPolicy":"preserve exact current bbox/size/placement for cells 97-102",
    "referenceRgb":[round(v,3) for v in ref_rgb],
    "referenceEdge":round(ref_edge,5),
    "cells":report
}
manifest_p.write_text(json.dumps(manifest,indent=2)+"\n")

print("ATLAS_SHA256=",new_sha)
print("GEOMETRY_PRESERVED=YES")
print("COLOR_SOFTNESS_V4=APPLIED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -eq 2 ] || { echo "STOP: expected exactly atlas + manifest"; exit 1; }
printf '%s\n' "${CHANGED[@]}" | grep -Fxq "$ATLAS_REL"
printf '%s\n' "${CHANGED[@]}" | grep -Fxq "$MANIFEST_REL"

[ "$(sha256sum "$RELOAD_REL" | awk '{print $1}')" = "$RELOAD_SHA" ] || { echo "STOP: reload recipe changed"; exit 1; }
[ "$(sha256sum "$FIRE_REL" | awk '{print $1}')" = "$FIRE_SHA" ] || { echo "STOP: fire recipe changed"; exit 1; }
[ "$(sha256sum "$EFFECT_REL" | awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect changed"; exit 1; }
[ "$(sha256sum "$RENDERER_REL" | awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$SHELL_REL" | awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: dropdown changed"; exit 1; }

echo
echo "=== COMMIT + PUSH ==="
git add "$ATLAS_REL" "$MANIFEST_REL"
git commit -m "Match Vanguard shotgun color and softness"
REV="$(git rev-parse HEAD)"

git fetch origin main
[ "$(git rev-parse origin/main)" = "$ORIGIN_HEAD" ] || {
  echo "STOP: origin/main advanced during campaign; no push performed"
  exit 1
}
git push origin HEAD:main
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$MANIFEST_REL" > "$L/manifest-committed.json"
git show "$REV:$ATLAS_REL" > "$L/atlas-committed.png"
python3 - "$L/manifest-committed.json" "$L/atlas-committed.png" <<'PY'
import hashlib,json,sys
m=json.load(open(sys.argv[1]))
assert m["refinement"]["kind"]=="shotgun-color-softness-v4"
assert m["result"]["sha256"]==hashlib.sha256(open(sys.argv[2],"rb").read()).hexdigest()
for c in map(str,range(97,103)):
    assert c in m["refinement"]["cells"]
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
cd "$P"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"

node --check "$RENDERER_REL"
node --check "$SHELL_REL"
npm run build

test -f "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json"
test -f "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"
test -f "$W/dist/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
echo "BUILD_DEPENDENCIES=PASS"

echo
echo "=== SERVE EXACT REVISION ==="
probe_exact_server() {
  local base="$1" stem="$L/probe.$$"
  curl -fsS "$base/assets/vanguard/procedural/shotgun-reload.recipe.json" > "$stem.reload" 2>/dev/null || return 1
  curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$stem.fire" 2>/dev/null || return 1
  curl -fsS "$base/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png" > "$stem.atlas" 2>/dev/null || return 1
  local ok=0
  [ "$(sha256sum "$stem.reload"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json"|awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$stem.fire"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json"|awk '{print $1}')" ] || ok=1
  [ "$(sha256sum "$stem.atlas"|awk '{print $1}')" = "$(sha256sum "$W/dist/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"|awk '{print $1}')" ] || ok=1
  rm -f "$stem.reload" "$stem.fire" "$stem.atlas"
  [ "$ok" -eq 0 ]
}

BASE_URL=""
for PORT in 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775; do
  CANDIDATE="http://127.0.0.1:$PORT"
  if probe_exact_server "$CANDIDATE"; then
    BASE_URL="$CANDIDATE"
    echo "SERVER=REUSED_EXACT PORT=$PORT"
    break
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$W/dist" >"$L/server-$PORT.log" 2>&1 &
  PID=$!
  sleep 1
  if kill -0 "$PID" 2>/dev/null && probe_exact_server "$CANDIDATE"; then
    BASE_URL="$CANDIDATE"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED_EXACT PORT=$PORT PID=$PID"
    break
  fi
  kill "$PID" 2>/dev/null || true
done

[ -n "$BASE_URL" ] || { echo "STOP: no exact review server available"; exit 1; }

STAMP="$(date +%s)"
RU="$BASE_URL/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " SHOTGUN COLOR + SOFTNESS REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

OPENED=0
if command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$RU" >/dev/null 2>&1; then
  OPENED=1
  echo "BROWSER_OPEN=termux-open-url"
elif command -v am >/dev/null 2>&1 && am start -a android.intent.action.VIEW -d "$RU" >/dev/null 2>&1; then
  OPENED=1
  echo "BROWSER_OPEN=am"
elif command -v cmd >/dev/null 2>&1 && cmd activity start-activity -a android.intent.action.VIEW -d "$RU" >/dev/null 2>&1; then
  OPENED=1
  echo "BROWSER_OPEN=cmd-activity"
fi

[ "$OPENED" -eq 1 ] || {
  echo "STOP: exact review ready but browser launch failed"
  echo "OPEN_THIS_URL=$RU"
  exit 1
}
