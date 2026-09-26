#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-shotgun-refine"
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
echo " VANGUARD SHOTGUN SIZE + RED REFINEMENT"
echo "============================================================"
echo "MISSION=undo accidental horizontal nudge; make cells 97-102 a little smaller and more red"
echo "PRIMARY_WORKTREE=READ_ONLY"
echo "SOURCE_AUTHORITY=manifest-pinned authored reload/fire sheets"
echo "WRITABLE=$ATLAS_REL cells 97-102 only"
echo "WRITABLE+=$RELOAD_REL stage.centerX only"
echo "WRITABLE+=$FIRE_REL stage.centerX only"
echo "WRITABLE+=$MANIFEST_REL result sha + refinement metadata"
echo "LOCKED=cells 1-96; effect bytes/placement; timing; deformation; renderer; dropdown; every other recipe"
echo "TARGET_HORIZONTAL=restore stage.centerX 215"
echo "TARGET_SIZE=90 percent of current candidate foreground height, rebuilt from original authored sheets"
echo "TARGET_COLOR=red refinery v3"

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

EFFECT_SHA="$(sha256sum "$EFFECT_REL" | awk '{print $1}')"
RENDERER_SHA="$(sha256sum "$RENDERER_REL" | awk '{print $1}')"
SHELL_SHA="$(sha256sum "$SHELL_REL" | awk '{print $1}')"

cp "$ATLAS_REL" "$L/atlas-before.png"
cp "$RELOAD_REL" "$L/reload-before.json"
cp "$FIRE_REL" "$L/fire-before.json"
cp "$MANIFEST_REL" "$L/manifest-before.json"

echo
echo "=== VERIFY RECIPES / MANIFEST ==="
python3 - "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL" <<'PY'
import json,sys
r=json.load(open(sys.argv[1]))
f=json.load(open(sys.argv[2]))
m=json.load(open(sys.argv[3]))

canon="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert r["atlases"]["vanguard-canonical"]["path"]==canon
assert f["atlases"]["vanguard-canonical"]["path"]==canon
assert r["stage"]["centerX"]==221, f"STOP: reload centerX unexpected: {r['stage']['centerX']}"
assert f["stage"]["centerX"]==221, f"STOP: fire centerX unexpected: {f['stage']['centerX']}"
assert [r["sources"][k]["cell"] for k in ("open","shell","close")]==[97,98,99]
assert [f["sources"][k]["cell"] for k in ("brace","drive","recoil")]==[100,101,102]
assert m["newCells"]=={
 "97":"shotgun reload open",
 "98":"shotgun reload insert",
 "99":"shotgun reload close",
 "100":"shotgun fire brace",
 "101":"shotgun fire drive",
 "102":"shotgun fire recoil"
}
print("RECIPE_MANIFEST_AUTHORITY=PASS")
PY

echo
echo "=== RESOLVE PINNED AUTHORED SOURCES + REBUILD CELLS 97-102 ==="
python3 - "$ATLAS_REL" "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL" <<'PY'
from PIL import Image, ImageEnhance
from pathlib import Path
import hashlib, json, sys

atlas_p,reload_recipe_p,fire_recipe_p,manifest_p=map(Path,sys.argv[1:])
manifest=json.loads(manifest_p.read_text())

def pixel_sha(path):
    im=Image.open(path).convert("RGB")
    return hashlib.sha256(im.tobytes()).hexdigest()

def resolve_source(spec):
    preferred=Path(spec["path"])
    want=spec["pixelSha256"]

    candidates=[]
    if preferred.exists():
        candidates.append(preferred)

    roots=[Path("/storage/emulated/0/Download"),Path("/storage/emulated/0/Pictures")]
    stem=preferred.stem.split(" (")[0]
    for root in roots:
        if not root.exists():
            continue
        for pat in (preferred.name, stem+"*", "*shotgun*"):
            for p in root.glob(pat):
                if p.is_file() and p.suffix.lower() in (".png",".jpg",".jpeg") and p not in candidates:
                    candidates.append(p)

    matches=[]
    for p in candidates:
        try:
            if pixel_sha(p)==want:
                matches.append(p)
        except Exception:
            pass

    if not matches:
        raise SystemExit(f"STOP: no bounded source matches pixel SHA {want}")
    matches=sorted(set(matches), key=lambda p:(0 if p==preferred else 1, str(p)))
    return matches[0]

reload_src=resolve_source(manifest["sources"]["reload"])
fire_src=resolve_source(manifest["sources"]["fire"])
print("RELOAD_SOURCE=",reload_src)
print("FIRE_SOURCE=",fire_src)

atlas=Image.open(atlas_p).convert("RGB")
before=atlas.copy()
assert atlas.size==(1037,1754), f"STOP: atlas geometry changed: {atlas.size}"

ROW0,ROW1=1645,1754
THRESH=18

def cell_rect(cell):
    i=cell-1
    row=i//6
    col=i%6
    assert row==16, f"STOP: shotgun cell {cell} not in row 16"
    x0=round(col*1037/6)
    x1=round((col+1)*1037/6)
    return x0,ROW0,x1,ROW1

def bbox_nonblack(im):
    pix=im.load()
    xs=[]; ys=[]
    for y in range(im.height):
        for x in range(im.width):
            if max(pix[x,y])>THRESH:
                xs.append(x); ys.append(y)
    if not xs:
        raise SystemExit("STOP: empty foreground")
    return min(xs),min(ys),max(xs)+1,max(ys)+1

# Current visible candidate establishes only the requested RELATIVE correction.
current_heights=[]
for c in range(97,103):
    crop=before.crop(cell_rect(c))
    b=bbox_nonblack(crop)
    current_heights.append(b[3]-b[1])
current_median=sorted(current_heights)[len(current_heights)//2]
target_h=max(1,round(current_median*0.90))
print("CURRENT_HEIGHTS=",current_heights)
print("CURRENT_MEDIAN=",current_median)
print("TARGET_HEIGHT_90PCT=",target_h)

def split3(path):
    im=Image.open(path).convert("RGB")
    w,h=im.size
    assert w%3==0, f"STOP: authored sheet is not three equal horizontal panels: {path} {im.size}"
    panel=w//3
    # Manifest-pinned fire carrier may be a uniform transport resize
    # (observed 2172x724 = 3 x 724). Preserve authored layout and use
    # one shared scale per sheet rather than forcing it back to 1536x512.
    assert panel==h, f"STOP: authored 3-panel layout/aspect changed: {path} {im.size}"
    out=[]
    for i in range(3):
        frame=im.crop((i*panel,0,(i+1)*panel,h))
        out.append(frame.crop(bbox_nonblack(frame)))
    print(f"SOURCE_GEOMETRY {path}={w}x{h} PANEL={panel}x{h}")
    return out

reload_frames=split3(reload_src)
fire_frames=split3(fire_src)

# Each manifest-pinned authored sheet may be a different uniform carrier size.
# Preserve within-sheet scale with ONE shared scale per 3-frame sheet.
def sheet_scale(frames,label):
    heights=[f.height for f in frames]
    med=sorted(heights)[1]
    scale=target_h/med
    print(f"{label}_SOURCE_HEIGHTS=",heights)
    print(f"{label}_SHARED_SCALE=",f"{scale:.8f}")
    return scale

reload_scale=sheet_scale(reload_frames,"RELOAD")
fire_scale=sheet_scale(fire_frames,"FIRE")

def red_v3(im):
    # Stronger than rejected V2, still conservative.
    r,g,b=im.split()
    r=r.point(lambda v:min(255,round(v*1.07)))
    g=g.point(lambda v:min(255,round(v*0.91)))
    b=b.point(lambda v:min(255,round(v*0.88)))
    im=Image.merge("RGB",(r,g,b))
    im=ImageEnhance.Color(im).enhance(1.10)
    im=ImageEnhance.Contrast(im).enhance(1.05)
    im=ImageEnhance.Brightness(im).enhance(0.98)
    return im

prepared=[]
for label,frames,scale in (("reload",reload_frames,reload_scale),("fire",fire_frames,fire_scale)):
    for idx,frame in enumerate(frames,1):
        frame=red_v3(frame)
        nw=max(1,round(frame.width*scale))
        nh=max(1,round(frame.height*scale))
        frame=frame.resize((nw,nh),Image.Resampling.LANCZOS)
        prepared.append((label,idx,frame))
        print(f"PREP_{label}_{idx}={nw}x{nh}")

out=before.copy()

# Clear and rewrite ONLY 97-102.
for c in range(97,103):
    out.paste((0,0,0),cell_rect(c))

placements={}
for cell,(_,_,sprite) in zip(range(97,103),prepared):
    x0,y0,x1,y1=cell_rect(cell)
    sw,sh=x1-x0,y1-y0
    assert sprite.width<=sw, f"STOP: cell {cell} too wide"
    assert sprite.height<=sh-5, f"STOP: cell {cell} too tall"
    x=x0+(sw-sprite.width)//2
    y=y1-5-sprite.height
    out.paste(sprite,(x,y))
    placements[str(cell)]=[x,y,sprite.width,sprite.height]

# Published/other content is mechanically locked.
assert out.crop((0,0,1037,ROW0)).tobytes()==before.crop((0,0,1037,ROW0)).tobytes()
for c in range(97):
    pass

# Verify every row16 cell outside 97-102 is irrelevant because row16 is exactly cells 97-102.
out.save(atlas_p)

# Undo accidental horizontal nudge only.
for rp in (reload_recipe_p,fire_recipe_p):
    d=json.loads(rp.read_text())
    assert d["stage"]["centerX"]==221
    d["stage"]["centerX"]=215
    rp.write_text(json.dumps(d,indent=2)+"\n")

# Update manifest to match new canonical atlas bytes and record this refinement.
new_sha=hashlib.sha256(atlas_p.read_bytes()).hexdigest()
manifest["result"]["sha256"]=new_sha
manifest["refinement"]={
    "kind":"shotgun-size-red-v3",
    "humanVerdict":"pending",
    "relativeScaleFromPreviousCandidate":0.90,
    "targetForegroundHeight":target_h,
    "sharedScaleFromAuthoredSources":{
        "reload":reload_scale,
        "fire":fire_scale
    },
    "color":{
        "rMultiplier":1.07,
        "gMultiplier":0.91,
        "bMultiplier":0.88,
        "saturation":1.10,
        "contrast":1.05,
        "brightness":0.98
    },
    "placements":placements,
    "horizontalPlacement":"restored stage.centerX 215 in reload/fire recipes"
}
manifest_p.write_text(json.dumps(manifest,indent=2)+"\n")

print("ATLAS_SHA256=",new_sha)
print("CENTER_X_RESTORED=215")
print("CELLS_97_102=SMALLER_REDDER")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
[ "${#CHANGED[@]}" -eq 4 ] || { echo "STOP: expected exactly four changed files"; exit 1; }
for WANT in "$ATLAS_REL" "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL"; do
  printf '%s\n' "${CHANGED[@]}" | grep -Fxq "$WANT" || { echo "STOP: missing expected diff $WANT"; exit 1; }
done

[ "$(sha256sum "$EFFECT_REL" | awk '{print $1}')" = "$EFFECT_SHA" ] || { echo "STOP: effect changed"; exit 1; }
[ "$(sha256sum "$RENDERER_REL" | awk '{print $1}')" = "$RENDERER_SHA" ] || { echo "STOP: renderer changed"; exit 1; }
[ "$(sha256sum "$SHELL_REL" | awk '{print $1}')" = "$SHELL_SHA" ] || { echo "STOP: dropdown changed"; exit 1; }

echo
echo "=== COMMIT + PUSH ==="
git add "$ATLAS_REL" "$RELOAD_REL" "$FIRE_REL" "$MANIFEST_REL"
git commit -m "Refine Vanguard shotgun scale and red"
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
git show "$REV:$RELOAD_REL" > "$L/reload-committed.json"
git show "$REV:$FIRE_REL" > "$L/fire-committed.json"
git show "$REV:$MANIFEST_REL" > "$L/manifest-committed.json"
git show "$REV:$ATLAS_REL" > "$L/atlas-committed.png"

python3 - "$L/reload-committed.json" "$L/fire-committed.json" "$L/manifest-committed.json" "$L/atlas-committed.png" <<'PY'
import hashlib,json,sys
r=json.load(open(sys.argv[1]))
f=json.load(open(sys.argv[2]))
m=json.load(open(sys.argv[3]))
atlas=sys.argv[4]
assert r["stage"]["centerX"]==215
assert f["stage"]["centerX"]==215
assert m["refinement"]["kind"]=="shotgun-size-red-v3"
assert m["result"]["sha256"]==hashlib.sha256(open(atlas,"rb").read()).hexdigest()
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

echo
echo "=== SERVE EXACT REVISION ==="
probe_exact_server() {
  local base="$1" tmp="$L/probe.$$"
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-reload.recipe.json" > "$tmp.reload" 2>/dev/null; then
    rm -f "$tmp.reload" "$tmp.fire"
    return 1
  fi
  if ! curl -fsS "$base/assets/vanguard/procedural/shotgun-fire.recipe.json" > "$tmp.fire" 2>/dev/null; then
    rm -f "$tmp.reload" "$tmp.fire"
    return 1
  fi
  local sr br sf bf
  sr="$(sha256sum "$tmp.reload" | awk '{print $1}')"
  br="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-reload.recipe.json" | awk '{print $1}')"
  sf="$(sha256sum "$tmp.fire" | awk '{print $1}')"
  bf="$(sha256sum "$W/dist/assets/vanguard/procedural/shotgun-fire.recipe.json" | awk '{print $1}')"
  rm -f "$tmp.reload" "$tmp.fire"
  [ "$sr" = "$br" ] && [ "$sf" = "$bf" ]
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
  if kill -0 "$PID" 2>/dev/null; then
    BASE_URL="$CANDIDATE"
    echo "$PID" > "$L/server.pid"
    echo "$PORT" > "$L/server.port"
    echo "SERVER=STARTED PORT=$PORT PID=$PID"
    break
  fi
done

[ -n "$BASE_URL" ] || { echo "STOP: no review port available in 8766..8775"; exit 1; }
probe_exact_server "$BASE_URL" || { echo "STOP: selected server does not serve exact built bytes"; exit 1; }

STAMP="$(date +%s)"
RU="$BASE_URL/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="$BASE_URL/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " SHOTGUN SIZE + RED REVIEW READY"
echo "============================================================"
echo "REV=$REV"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RU"
