#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

A_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
R_REL="public/assets/vanguard/procedural/shotgun-reload.recipe.json"
F_REL="public/assets/vanguard/procedural/shotgun-fire.recipe.json"
M_REL="public/assets/vanguard/procedural/vanguard-shotgun-atlas-append.manifest.json"
REF_REL="public/assets/vanguard/procedural/butt-smash.recipe.json"

A="$P/$A_REL"
R="$P/$R_REL"
F="$P/$F_REL"
M="$P/$M_REL"
REF="$P/$REF_REL"

RELOAD="/storage/emulated/0/Download/vanguard-shotgun-reload-source-original.jpg"
FIRE="/storage/emulated/0/Download/file_00000000be1481f5a3f60d247fb48856 (1).png"
CAL="/storage/emulated/0/Download/vanguard-pose-atlas-reload-calibrated-15pct-smaller.png"

cd "$P"
cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md docs/VANGUARD_ATLAS_AUTHORITY.md "$REF_REL" >/dev/null

echo "============================================================"
echo " VANGUARD SHOTGUN: APPEND TO CANONICAL EXPANDED ATLAS"
echo "============================================================"
echo "AUTHORITY=$A_REL (NOT historical vanguard-pose-atlas-90.png)"
echo "MISSION=append one six-cell row only: reload 97-99 + fire 100-102"
echo "WRITABLE=$A_REL,$R_REL,$F_REL,$M_REL"
echo "LOCKED=all existing atlas pixels through y=1645; Butt Smash 91-93; Shoulder Charge 94-95; all shotgun timing/effects/registration"

mkdir -p "$L/shotgun-expanded-append"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for X in "$A_REL" "$R_REL" "$F_REL" "$M_REL"; do
  S="$(git status --porcelain --untracked-files=all -- "$X")"
  if [ -n "$S" ]; then
    printf '%s\n' "$S" > "$L/shotgun-expanded-append/$(basename "$X").preflight-status.txt"
    if git ls-files --error-unmatch "$X" >/dev/null 2>&1; then
      git diff -- "$X" > "$L/shotgun-expanded-append/$(basename "$X").preflight.diff"
    fi
    echo "STOP: campaign target already dirty: $X"
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
echo "=== VERIFY CANONICAL EXPANDED ATLAS ==="
python3 - "$A" public/assets/vanguard/procedural/vanguard-pose-atlas-expanded.manifest.json <<'PY'
from PIL import Image
from pathlib import Path
import hashlib,json,sys
a=Path(sys.argv[1]); m=Path(sys.argv[2])
im=Image.open(a).convert("RGB")
assert im.size==(1037,1645), f"STOP: canonical expanded atlas geometry changed: {im.size}"
meta=json.loads(m.read_text())
got=hashlib.sha256(a.read_bytes()).hexdigest()
want=meta["destinationSha256"]
assert got==want, f"STOP: canonical expanded atlas hash changed: {got} != {want}"
print("EXPANDED_ATLAS_SIZE=1037x1645")
print("EXPANDED_ATLAS_SHA256="+got)
print("EXISTING_CELL_OWNERSHIP=91-93 Butt Smash; 94-95 Shoulder Charge; 96 empty")
PY

cp "$A" "$L/shotgun-expanded-append/base-1645.png"

echo
echo "=== VERIFY PINNED SOURCES ==="
python3 - "$RELOAD" "$FIRE" "$CAL" <<'PY'
from PIL import Image
import hashlib,sys
spec=[
 ("reload",sys.argv[1],(1536,512),"c32f1590a435aea696de34ebe5f4a89c9039d1bc7fac368a8c77ac180bf177e6"),
 ("fire",sys.argv[2],(2172,724),"01424c34c4b0d9bd8b7216c566b4de2be3b967d1b776d2c39ecddccc459c91b0"),
 ("cal",sys.argv[3],(1037,1632),"db8bdbc7c8a3411b10ff5d29b40200884ca41d26db450b0392dc5a672b469a72"),
]
for label,path,size,want in spec:
    im=Image.open(path).convert("RGB")
    got=hashlib.sha256(im.tobytes()).hexdigest()
    assert im.size==size, f"STOP: {label} dimensions {im.size} != {size}"
    assert got==want, f"STOP: {label} pixel SHA mismatch {got}"
    print(f"SOURCE_{label.upper()}={path}")
    print(f"SOURCE_{label.upper()}_PIXEL_SHA256={got}")
PY

echo
echo "=== APPEND ONE ROW: 97-102 ==="
python3 - "$A" "$RELOAD" "$FIRE" "$CAL" "$M" <<'PY'
from PIL import Image,ImageEnhance
from pathlib import Path
import copy,hashlib,json,statistics,sys

a_p,reload_p,fire_p,cal_p,manifest_p=map(Path,sys.argv[1:])
base=Image.open(a_p).convert("RGB")
reload=Image.open(reload_p).convert("RGB")
fire=Image.open(fire_p).convert("RGB")
cal=Image.open(cal_p).convert("RGB")

assert base.size==(1037,1645)
assert reload.size==(1536,512)
assert fire.size==(2172,724)
assert cal.size==(1037,1632)

base_file_sha=hashlib.sha256(a_p.read_bytes()).hexdigest()
base_pixels=base.tobytes()
W=1037
Y0=1645
Y1=1754
ROW_H=Y1-Y0

def col_rect(col,y0=Y0,y1=Y1):
    x0=round(col*W/6); x1=round((col+1)*W/6)
    return x0,y0,x1,y1

def old_cal_cell(cell):
    col=(cell-1)%6
    x0=round(col*W/6); x1=round((col+1)*W/6)
    return cal.crop((x0,1536,x1,1632))

def bbox(im,t=18):
    px=im.load(); xs=[]; ys=[]
    for y in range(im.height):
        for x in range(im.width):
            if max(px[x,y])>t:
                xs.append(x); ys.append(y)
    assert xs
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def three_square_frames(im):
    p=im.height
    assert im.width==p*3
    return [im.crop((i*p,0,(i+1)*p,p)) for i in range(3)]

out=Image.new("RGB",(W,Y1),(0,0,0))
out.paste(base,(0,0))

# Reload candidate already carries the requested calibration. Move those three
# cell images intact into the new canonical row as 97,98,99.
reload_cells=[old_cal_cell(c) for c in (91,92,93)]
for cell,sprite in zip((97,98,99),reload_cells):
    col=(cell-1)%6
    x0,y0,x1,y1=col_rect(col)
    assert sprite.width==(x1-x0)
    assert sprite.height<=ROW_H
    out.paste(sprite,(x0,y1-sprite.height))

# One shared scale, inferred from authored reload -> calibrated reload,
# then compensated once for the 724px fire carrier. No normalize-resize chain.
ratios=[]
for src,calcell in zip(three_square_frames(reload),reload_cells):
    sb=bbox(src); cb=bbox(calcell)
    ratios.append((cb[3]-cb[1])/(sb[3]-sb[1]))
scale512=statistics.median(ratios)
assert max(ratios)-min(ratios)<0.04, f"STOP: reload calibration scale inconsistent: {ratios}"
fire_scale=scale512*(512/fire.height)
print("RELOAD_CALIBRATION_RATIOS="+",".join(f"{x:.6f}" for x in ratios))
print(f"FIRE_EFFECTIVE_SCALE={fire_scale:.8f}")

def mild_red(im):
    r,g,b=im.split()
    r=r.point(lambda v:min(255,round(v*1.02)))
    g=g.point(lambda v:min(255,round(v*0.97)))
    b=b.point(lambda v:min(255,round(v*0.95)))
    im=Image.merge("RGB",(r,g,b))
    im=ImageEnhance.Contrast(im).enhance(1.05)
    im=ImageEnhance.Color(im).enhance(1.03)
    return ImageEnhance.Brightness(im).enhance(0.98)

fire_prepared=[]
for i,frame in enumerate(three_square_frames(fire),1):
    b=bbox(frame)
    subject=mild_red(frame.crop(b))
    nw=max(1,round(subject.width*fire_scale))
    nh=max(1,round(subject.height*fire_scale))
    subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)
    fire_prepared.append(subject)
    print(f"FIRE_PREP_{i}={nw}x{nh}")

for cell,sprite in zip((100,101,102),fire_prepared):
    col=(cell-1)%6
    x0,y0,x1,y1=col_rect(col)
    sw,sh=x1-x0,y1-y0
    assert sprite.width<=sw, f"STOP: cell {cell} too wide {sprite.width}>{sw}"
    assert sprite.height<=sh-5, f"STOP: cell {cell} too tall {sprite.height}>{sh-5}"
    x=x0+(sw-sprite.width)//2
    y=y1-5-sprite.height
    out.paste(sprite,(x,y))

assert out.crop((0,0,W,Y0)).tobytes()==base_pixels
out.save(a_p)
final_sha=hashlib.sha256(a_p.read_bytes()).hexdigest()

manifest={
 "schema":"vanguard-shotgun-expanded-atlas-append-candidate-v1",
 "status":"quarantined",
 "humanVerdict":"pending",
 "baseAtlas":{
   "path":"assets/vanguard/procedural/vanguard-pose-atlas-expanded.png",
   "size":[1037,1645],
   "sha256":base_file_sha,
   "preservedPixelRect":[0,0,1037,1645]
 },
 "result":{
   "size":[1037,1754],
   "sha256":final_sha,
   "rowBounds":{"16":[1645,1754]}
 },
 "newCells":{
   "97":"shotgun reload open",
   "98":"shotgun reload insert",
   "99":"shotgun reload close",
   "100":"shotgun fire brace",
   "101":"shotgun fire drive",
   "102":"shotgun fire recoil"
 },
 "sources":{
   "reload":{"path":str(reload_p),"pixelSha256":hashlib.sha256(reload.tobytes()).hexdigest()},
   "fire":{"path":str(fire_p),"pixelSha256":hashlib.sha256(fire.tobytes()).hexdigest()},
   "reloadCalibration":{"path":str(cal_p),"pixelSha256":hashlib.sha256(cal.tobytes()).hexdigest()}
 }
}
manifest_p.write_text(json.dumps(manifest,indent=2)+"\n")
print("OLD_ATLAS_PIXELS_0_1645=PRESERVED_EXACTLY")
print("FINAL_ATLAS_SIZE=1037x1754")
print("NEW_CELLS=97,98,99,100,101,102")
print("FINAL_ATLAS_SHA256="+final_sha)
PY

echo
echo "=== REPOINT ONLY THE TWO SHOTGUN RECIPES ==="
python3 - "$R" "$F" "$REF" <<'PY'
from pathlib import Path
import copy,json,sys
rp,fp,refp=map(Path,sys.argv[1:])
r=json.loads(rp.read_text())
f=json.loads(fp.read_text())
ref=json.loads(refp.read_text())
r0=copy.deepcopy(r); f0=copy.deepcopy(f)

atlas=copy.deepcopy(ref["atlases"]["vanguard-canonical"])
assert atlas["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert atlas["size"]==[1037,1645]
assert atlas["rows"]==16
assert atlas["rowBounds"]["15"]==[1536,1645]
atlas["rows"]=17
atlas["size"]=[1037,1754]
atlas["rowBounds"]["16"]=[1645,1754]

r["atlases"]["vanguard-canonical"]=copy.deepcopy(atlas)
f["atlases"]["vanguard-canonical"]=copy.deepcopy(atlas)

r["sources"]["open"]["cell"]=97
r["sources"]["shell"]["cell"]=98
r["sources"]["close"]["cell"]=99
r["description"]="Shotgun reload review · expanded-atlas 97→98→99→idle"
r["motionAuthority"]["description"]="Expanded canonical atlas cells 97,98,99 are shotgun reload pose authority; no visible effect; no guessed foot point."

f["sources"]["brace"]["cell"]=100
f["sources"]["drive"]["cell"]=101
f["sources"]["recoil"]["cell"]=102
f["description"]="Shotgun fire review · expanded-atlas 100→101→102 + dedicated muzzle"
f["motionAuthority"]["description"]="Expanded canonical atlas cells 100,101,102 are shotgun fire pose authority; dedicated exact muzzle; no root motion; pin/effect placement review-gated."

# Hard-lock everything unrelated to atlas selection / pose cell identity.
for before,after,label in ((r0,r,"reload"),(f0,f,"fire")):
    for key in ("rootMotion","canvas","bodyScale","stage","phases","effect"):
        assert after[key]==before[key], f"STOP: {label} locked field changed: {key}"
    assert after["sources"]["idle"]==before["sources"]["idle"]
    assert after["sources"]["muzzle"]==before["sources"]["muzzle"]

rp.write_text(json.dumps(r,indent=2)+"\n")
fp.write_text(json.dumps(f,indent=2)+"\n")
print("SHOTGUN_RELOAD_CELLS=97,98,99")
print("SHOTGUN_FIRE_CELLS=100,101,102")
print("SHOTGUN_TIMING_EFFECTS_REGISTRATION=UNCHANGED")
PY

echo
echo "=== DIFF GUARD ==="
mapfile -t TRACKED < <(git diff --name-only)
printf 'tracked=%s\n' "${TRACKED[@]}"
for X in "${TRACKED[@]}"; do
  case "$X" in
    "$A_REL"|"$R_REL"|"$F_REL") ;;
    *) echo "STOP: UNAUTHORIZED_TRACKED_DIFF $X"; exit 1 ;;
  esac
done
[ "${#TRACKED[@]}" -eq 3 ] || { echo "STOP: expected exactly atlas + two recipe tracked changes"; exit 1; }
[ -f "$M" ] || { echo "STOP: candidate manifest missing"; exit 1; }

python3 - "$A" "$L/shotgun-expanded-append/base-1645.png" <<'PY'
from PIL import Image
import sys
a=Image.open(sys.argv[1]).convert("RGB")
b=Image.open(sys.argv[2]).convert("RGB")
assert a.size==(1037,1754)
assert b.size==(1037,1645)
assert a.crop((0,0,1037,1645)).tobytes()==b.tobytes()
print("PRECOMMIT_EXISTING_ATLAS_PIXELS=PRESERVED")
PY

echo
echo "=== COMMIT + PUSH ==="
git add "$A_REL" "$R_REL" "$F_REL" "$M_REL"
git commit -m "Append Vanguard shotgun poses to canonical expanded atlas"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$A_REL" > "$L/shotgun-expanded-append/committed-atlas.png"
git show "$REV:$R_REL" > "$L/shotgun-expanded-append/committed-reload.json"
git show "$REV:$F_REL" > "$L/shotgun-expanded-append/committed-fire.json"
git show "$REV:$M_REL" > "$L/shotgun-expanded-append/committed-manifest.json"
python3 - "$L/shotgun-expanded-append/committed-atlas.png" "$L/shotgun-expanded-append/base-1645.png" "$L/shotgun-expanded-append/committed-reload.json" "$L/shotgun-expanded-append/committed-fire.json" <<'PY'
from PIL import Image
import json,sys
a=Image.open(sys.argv[1]).convert("RGB")
b=Image.open(sys.argv[2]).convert("RGB")
assert a.size==(1037,1754)
assert a.crop((0,0,1037,1645)).tobytes()==b.tobytes()
r=json.load(open(sys.argv[3])); f=json.load(open(sys.argv[4]))
assert r["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert f["atlases"]["vanguard-canonical"]["path"]=="assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
assert [r["sources"][x]["cell"] for x in ("open","shell","close")]==[97,98,99]
assert [f["sources"][x]["cell"] for x in ("brace","drive","recoil")]==[100,101,102]
print("COMMITTED_READBACK=PASS")
PY

echo
echo "=== EXACT-REVISION BUILD ==="
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
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
  assets/vanguard/procedural/shotgun-reload.recipe.json \
  assets/vanguard/procedural/shotgun-fire.recipe.json \
  assets/vanguard/procedural/butt-smash.recipe.json \
  assets/vanguard/procedural/shoulder-charge.recipe.json; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
RU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"
BU="http://127.0.0.1:8766/motion.html?procedural=vanguard-butt-smash&rev=$REV&nocache=$STAMP"
SU="http://127.0.0.1:8766/motion.html?procedural=vanguard-shoulder-charge&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " SHOTGUN APPENDED TO CANONICAL EXPANDED ATLAS"
echo "============================================================"
echo "REV=$REV"
echo "ATLAS=assets/vanguard/procedural/vanguard-pose-atlas-expanded.png"
echo "ATLAS_SIZE=1037x1754"
echo "RELOAD_CELLS=97,98,99"
echo "FIRE_CELLS=100,101,102"
echo "RELOAD_REVIEW=$RU"
echo "FIRE_REVIEW=$FU"
echo "BUTT_SMASH_REGRESSION=$BU"
echo "SHOULDER_CHARGE_REGRESSION=$SU"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$RU"
