#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export GIT_PAGER=cat PAGER=cat

P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"

ATLAS_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
RUN_REL="src/procedural-run-preview.js"
ATLAS="$P/$ATLAS_REL"
RUN="$P/$RUN_REL"

cd "$P"

cat AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md >/dev/null

echo "============================================================"
echo " VANGUARD ATLAS 1728 REBUILD + LEGACY COMPAT"
echo "============================================================"
echo "MISSION=replace accidental 4168px atlas with one 1037x1728 canonical atlas; preserve cells 1-90; restore reload from calibration; build fire from exact authored source; repair idle/run legacy view"
echo "SOURCE_AUTHORITY=decoded-pixel identity of authored sheets + calibrated reload atlas"
echo "WRITABLE=$ATLAS_REL rows 15-16 plus removal of proven campaign-owned tail; $RUN_REL legacy atlas-view compatibility only"
echo "LOCKED=cells 1-90; all recipes; timing; effects; pose identities; registration"

mkdir -p "$L/atlas-1728-rebuild"

echo
echo "=== DIRTY PREFLIGHT ==="
git status --short
for F in "$ATLAS_REL" "$RUN_REL"; do
  if ! git diff --quiet HEAD -- "$F"; then
    git diff -- "$F" > "$L/atlas-1728-rebuild/$(basename "$F").preflight.diff"
    echo "STOP: target already dirty; archived exact diff: $F"
    exit 1
  fi
done

echo
echo "=== SYNC MAIN ==="
git fetch origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || git merge --ff-only origin/main
START="$(git rev-parse HEAD)"
echo "START_HEAD=$START"

# Preserve recipe locks before any mutation.
LOCK_FILE="$L/atlas-1728-rebuild/recipe-locks.sha256"
sha256sum \
  public/assets/vanguard/procedural/idle.recipe.json \
  public/assets/vanguard/procedural/run.recipe.json \
  public/assets/vanguard/procedural/shotgun-reload.recipe.json \
  public/assets/vanguard/procedural/shotgun-fire.recipe.json \
  > "$LOCK_FILE"

echo
echo "=== RESOLVE SOURCE ART BY DECODED PIXEL SHA ==="
mapfile -d '' SRC < <(python3 - <<'PY'
from PIL import Image
from pathlib import Path
import fnmatch, hashlib, os, sys

targets=[
 {
  "label":"reload","size":(1536,512),
  "pixel_sha":"c32f1590a435aea696de34ebe5f4a89c9039d1bc7fac368a8c77ac180bf177e6",
  "byte_sizes":{184990},
  "patterns":["vanguard-shotgun-reload-source-original*","920832*"],
  "preferred":[Path("/storage/emulated/0/Download/vanguard-shotgun-reload-source-original.jpg")],
 },
 {
  "label":"fire","size":(1536,512),
  "pixel_sha":"0acca93d08ed0b14f2bbcc9d308593f61297a5cb427e78a9a38935a6b5c903e6",
  "byte_sizes":{176696},
  "patterns":["*be1481f5a3f60d247fb48856*","vanguard-shotgun-fire-source-original*"],
  "preferred":[
    Path("/storage/emulated/0/Download/file_00000000be1481f5a3f60d247fb48856.png"),
    Path("/storage/emulated/0/Download/file_00000000be1481f5a3f60d247fb48856 (1).png"),
    Path("/storage/emulated/0/Download/vanguard-shotgun-fire-source-original.png"),
    Path("/storage/emulated/0/Download/vanguard-shotgun-fire-source-original-1.png"),
    Path("/storage/emulated/0/Pictures/file_00000000be1481f5a3f60d247fb48856.png"),
  ],
  "dhash_whole":"410ccb0ccb1cc659c718c718d35cd248c618cf2cc32ca698a492249624d634d2",
  "dhash_frames":[
    "06000e0039207c007a007a107a5c59707d303c84ba4072c060c8cae0c2f2c030",
    "03000e0019003d2079007a183b4c1d3859907a849c683160e0e08530c0686068",
    "030007001c903e003d003d083d2c16382d982c822e601cc8f0e44160f0503058",
  ],
 },
 {
  "label":"cal","size":(1037,1632),
  "pixel_sha":"db8bdbc7c8a3411b10ff5d29b40200884ca41d26db450b0392dc5a672b469a72",
  "byte_sizes":{909304},
  "patterns":["vanguard-pose-atlas-reload-calibrated-15pct-smaller*"],
  "preferred":[Path("/storage/emulated/0/Download/vanguard-pose-atlas-reload-calibrated-15pct-smaller.png")],
 },
]

roots=[Path("/storage/emulated/0/Download"),Path("/storage/emulated/0/Pictures")]

def dhash_hex(im, hash_size=16):
    g=im.convert("L").resize((hash_size+1,hash_size),Image.Resampling.LANCZOS)
    px=list(g.getdata())
    w=hash_size+1
    value=0
    for y in range(hash_size):
        row=y*w
        for x in range(hash_size):
            value=(value<<1) | int(px[row+x+1] > px[row+x])
    return f"{value:0{hash_size*hash_size//4}x}"

def hdist(a,b):
    return (int(a,16)^int(b,16)).bit_count()

def visual_signature(im):
    whole=dhash_hex(im)
    frames=[dhash_hex(im.crop((i*512,0,(i+1)*512,512))) for i in range(3)] if im.size==(1536,512) else []
    return whole,frames

def pixsig(p):
    try:
        im=Image.open(p).convert("RGB")
        return im, hashlib.sha256(im.tobytes()).hexdigest()
    except Exception as e:
        print(f"SKIP unreadable={p} err={e}",file=sys.stderr)
        return None,None

def bounded_candidates(t):
    seen=set()
    for p in t["preferred"]:
        if p not in seen:
            seen.add(p)
            yield p

    # Metadata-only walk. Decode only candidates matching known basename patterns
    # or known encoded byte sizes. Final authority remains exact decoded pixel SHA.
    for root in roots:
        if not root.exists(): continue
        for dirpath,dirs,files in os.walk(root):
            rel=Path(dirpath).relative_to(root)
            if len(rel.parts)>=4:
                dirs[:]=[]
            for name in files:
                low=name.lower()
                if not low.endswith((".png",".jpg",".jpeg")):
                    continue
                p=Path(dirpath)/name
                if p in seen:
                    continue
                try:
                    size=p.stat().st_size
                except OSError:
                    continue
                name_hit=any(fnmatch.fnmatch(name,pat) for pat in t["patterns"])
                size_hit=size in t["byte_sizes"]
                if not (name_hit or size_hit):
                    continue
                seen.add(p)
                yield p

resolved=[]
for t in targets:
    tested=[]
    exact=[]
    perceptual=[]
    for p in bounded_candidates(t):
        if not p.is_file():
            continue
        tested.append(str(p))
        print(f"CANDIDATE {t['label']}={p}",file=sys.stderr,flush=True)
        im,got_sha=pixsig(p)
        if im is None:
            continue
        got_size=im.size
        print(f"  size={got_size[0]}x{got_size[1]} pixel_sha={got_sha}",file=sys.stderr,flush=True)
        if got_size==t["size"] and got_sha==t["pixel_sha"]:
            exact.append(p)
            print(f"  EXACT_PIXEL_MATCH",file=sys.stderr,flush=True)
            continue
        if t["label"]=="fire" and got_size==t["size"]:
            whole,frames=visual_signature(im)
            dw=hdist(whole,t["dhash_whole"])
            dfs=[hdist(a,b) for a,b in zip(frames,t["dhash_frames"])]
            print(f"  VISUAL_FINGERPRINT whole={dw} frames={dfs}",file=sys.stderr,flush=True)
            if dw<=8 and all(d<=6 for d in dfs):
                perceptual.append((p,dw,dfs))
    if len(exact)>=1:
        found=exact[0]
        mode="exact-pixel-sha"
        if len(exact)>1:
            print(f"DUPLICATE_EXACT_CARRIERS {t['label']}={exact}; selected={found}",file=sys.stderr,flush=True)
    elif t["label"]=="fire" and len(perceptual)==1:
        found=perceptual[0][0]
        mode=f"bounded-perceptual whole={perceptual[0][1]} frames={perceptual[0][2]}"
    elif t["label"]=="fire" and len(perceptual)>1:
        print(f"STOP: ambiguous perceptual matches for fire: {perceptual}",file=sys.stderr)
        sys.exit(43)
    else:
        print(
          f"STOP: source identity not recovered for {t['label']} "
          f"size={t['size']} pixel_sha={t['pixel_sha']} tested={len(tested)}",
          file=sys.stderr
        )
        for p in tested[:20]:
            print(f"  tested={p}",file=sys.stderr)
        sys.exit(41)
    print(f"RESOLVED {t['label']}={found} mode={mode}",file=sys.stderr,flush=True)
    resolved.append(found)

for p in resolved:
    sys.stdout.buffer.write(str(p).encode()+b"\0")
PY
)

[ "${#SRC[@]}" -eq 3 ] || { echo "STOP: source resolver returned ${#SRC[@]} paths"; exit 1; }
RELOAD="${SRC[0]}"
FIRE="${SRC[1]}"
CAL="${SRC[2]}"
echo "RESOLVED_RELOAD=$RELOAD"
echo "RESOLVED_FIRE=$FIRE"
echo "RESOLVED_CAL=$CAL"
echo
echo "=== REBUILD EXACT 1037x1728 ATLAS ==="
cp "$ATLAS" "$L/atlas-1728-rebuild/before-4168.png"

python3 - "$ATLAS" "$RELOAD" "$FIRE" "$CAL" "$L/atlas-1728-rebuild/final-1728.png" <<'PY'
from PIL import Image, ImageEnhance
from pathlib import Path
import hashlib, statistics, sys

atlas_p,reload_p,fire_p,cal_p,out_copy=map(Path,sys.argv[1:])
atlas=Image.open(atlas_p).convert("RGB")
reload=Image.open(reload_p).convert("RGB")
fire=Image.open(fire_p).convert("RGB")
cal=Image.open(cal_p).convert("RGB")

assert atlas.size==(1037,4168), f"STOP: expected proven accidental atlas 1037x4168, got {atlas.size}"
assert reload.size==(1536,512)
assert fire.size==(1536,512)
assert cal.size==(1037,1632)

def bbox(im,t=18):
    px=im.load(); xs=[]; ys=[]
    for y in range(im.height):
        for x in range(im.width):
            if max(px[x,y])>t:
                xs.append(x); ys.append(y)
    assert xs
    return min(xs),min(ys),max(xs)+1,max(ys)+1

def source_frames(im):
    # Human/source evidence establishes exactly three authored horizontal panels.
    return [im.crop((i*512,0,(i+1)*512,512)) for i in range(3)]

def cell_rect(cell,y0=1536,row_h=96):
    i=cell-1; row=i//6; col=i%6
    assert row in (15,16)
    x0=round(col*1037/6); x1=round((col+1)*1037/6)
    yy0=y0+(row-15)*row_h
    return x0,yy0,x1,yy0+row_h

# Prove cells 1-90 survived the accidental-growth campaigns unchanged by
# comparing current canonical prefix against the known calibration artifact.
assert atlas.crop((0,0,1037,1536)).tobytes()==cal.crop((0,0,1037,1536)).tobytes(), \
    "STOP: cells 1-90 no longer match calibration authority"

# Calibration already contains Drew's requested 15%-smaller correction.
# Do NOT apply 15% again. Copy reload cells 91-93 exactly.
out=Image.new("RGB",(1037,1728),(0,0,0))
out.paste(atlas.crop((0,0,1037,1536)),(0,0))

reload_cells=[]
for c in (91,92,93):
    x0,y0,x1,y1=cell_rect(c)
    src=cal.crop((x0,1536,x1,1632))
    assert max(ch[1] for ch in src.getextrema())>18, f"STOP: calibration reload cell {c} empty"
    out.paste(src,(x0,y0))
    reload_cells.append(src)

# Reserved slots in calibration row must be empty.
for c in (94,95,96):
    x0,_,x1,_=cell_rect(c)
    src=cal.crop((x0,1536,x1,1632))
    assert max(ch[1] for ch in src.getextrema())<=18, f"STOP: calibration reserved cell {c} populated"

# Derive one mechanical scale from original reload source -> final calibrated
# reload cells. Use the median height ratio and apply it unchanged to all fire frames.
reload_src_frames=source_frames(reload)
ratios=[]
for frame,cell in zip(reload_src_frames,reload_cells):
    sb=bbox(frame); cb=bbox(cell)
    sh=sb[3]-sb[1]; ch=cb[3]-cb[1]
    ratios.append(ch/sh)

scale=statistics.median(ratios)
assert max(ratios)-min(ratios)<0.04, f"STOP: calibration scale inconsistent across reload frames: {ratios}"
print("RELOAD_CALIBRATION_RATIOS=",",".join(f"{x:.6f}" for x in ratios))
print("SHARED_FIRE_SCALE=",f"{scale:.8f}")

def mild_red(im):
    # User-authorized GUESS_V2 candidate. Human review remains mandatory.
    r,g,b=im.split()
    r=r.point(lambda v:min(255,round(v*1.02)))
    g=g.point(lambda v:min(255,round(v*0.97)))
    b=b.point(lambda v:min(255,round(v*0.95)))
    im=Image.merge("RGB",(r,g,b))
    im=ImageEnhance.Contrast(im).enhance(1.05)
    im=ImageEnhance.Color(im).enhance(1.03)
    im=ImageEnhance.Brightness(im).enhance(0.98)
    return im

fire_frames=source_frames(fire)
prepared=[]
for i,frame in enumerate(fire_frames,1):
    b=bbox(frame)
    subject=frame.crop(b)
    subject=mild_red(subject)
    nw=max(1,round(subject.width*scale))
    nh=max(1,round(subject.height*scale))
    subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)
    prepared.append(subject)
    print(f"FIRE_PREP_{i}={nw}x{nh}")

for c,sprite in zip((97,98,99),prepared):
    x0,y0,x1,y1=cell_rect(c)
    sw,sh=x1-x0,y1-y0
    assert sprite.width<=sw, f"STOP: fire cell {c} too wide {sprite.width}>{sw}"
    assert sprite.height<=sh-5, f"STOP: fire cell {c} too tall {sprite.height}>{sh-5}"
    x=x0+(sw-sprite.width)//2
    y=y1-5-sprite.height
    out.paste(sprite,(x,y))

for c in (94,95,96,100,101,102):
    r=cell_rect(c)
    assert max(ch[1] for ch in out.crop(r).getextrema())<=18, f"STOP: reserved cell {c} populated"

# Final hard proofs.
assert out.size==(1037,1728)
assert out.crop((0,0,1037,1536)).tobytes()==atlas.crop((0,0,1037,1536)).tobytes()
for c in (91,92,93):
    x0,y0,x1,y1=cell_rect(c)
    assert out.crop((x0,y0,x1,y1)).tobytes()==cal.crop((x0,1536,x1,1632)).tobytes()

out.save(atlas_p)
out.save(out_copy)
print("BAD_ATLAS_SIZE=1037x4168")
print("FINAL_ATLAS_SIZE=1037x1728")
print("CELLS_1_90=PIXEL_IDENTICAL")
print("RELOAD_91_93=CALIBRATION_EXACT")
print("FIRE_97_99=AUTHORED_SOURCE_GUESS_V2_CANDIDATE")
print("FINAL_SHA256="+hashlib.sha256(atlas_p.read_bytes()).hexdigest())
PY

echo
echo "=== PATCH LEGACY IDLE/RUN VIEW WITHOUT REWRITING RECIPES ==="
python3 - "$RUN" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()

old_rect=""" const explicit=a.rowBounds?.[String(r)];
 const y0=explicit?Number(explicit[0]):Math.round(r*atlas.naturalHeight/a.rows);
 const y1=explicit?Number(explicit[1]):Math.round((r+1)*atlas.naturalHeight/a.rows);"""
new_rect=""" const explicit=a.rowBounds?.[String(r)];
 const viewHeight=Number(a.size?.[1]??atlas.naturalHeight);
 const y0=explicit?Number(explicit[0]):Math.round(r*viewHeight/a.rows);
 const y1=explicit?Number(explicit[1]):Math.round((r+1)*viewHeight/a.rows);"""

old_guard=""" if(atlas.naturalWidth!==recipe.atlas.size[0]||atlas.naturalHeight!==recipe.atlas.size[1])throw new Error(`Wrong Vanguard atlas dimensions: expected ${recipe.atlas.size.join('x')}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);"""
new_guard=""" const declaredAtlasWidth=Number(recipe.atlas.size[0]),declaredAtlasHeight=Number(recipe.atlas.size[1]);
 if(atlas.naturalWidth!==declaredAtlasWidth||atlas.naturalHeight<declaredAtlasHeight)throw new Error(`Wrong Vanguard atlas dimensions: expected width ${declaredAtlasWidth} and height >= ${declaredAtlasHeight}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);"""

assert old_rect in s, "STOP: legacy rectFor insertion point changed"
assert old_guard in s, "STOP: legacy dimension guard changed"
s=s.replace(old_rect,new_rect,1).replace(old_guard,new_guard,1)
p.write_text(s)
print("LEGACY_VIEW_HEIGHT=recipe.atlas.size[1]")
print("LEGACY_PHYSICAL_HEIGHT_RULE=>=declared")
PY

node --check "$RUN"

echo
echo "=== DIFF + LOCK GUARD ==="
mapfile -t CHANGED < <(git diff --name-only)
printf 'changed=%s\n' "${CHANGED[@]}"
for F in "${CHANGED[@]}"; do
  case "$F" in
    "$ATLAS_REL"|"$RUN_REL") ;;
    *) echo "STOP: UNAUTHORIZED_DIFF $F"; exit 1 ;;
  esac
done
[ "${#CHANGED[@]}" -eq 2 ] || { echo "STOP: expected exactly atlas + legacy reader changes"; exit 1; }

sha256sum -c "$LOCK_FILE"

python3 - "$ATLAS" "$L/atlas-1728-rebuild/final-1728.png" <<'PY'
from PIL import Image
import sys
a=Image.open(sys.argv[1]).convert("RGB")
b=Image.open(sys.argv[2]).convert("RGB")
assert a.size==b.size==(1037,1728)
assert a.tobytes()==b.tobytes()
print("PRECOMMIT_ATLAS_READBACK=PASS")
PY

echo
echo "=== COMMIT + PUSH ==="
git add "$ATLAS_REL" "$RUN_REL"
git commit -m "Restore canonical Vanguard atlas and preserve legacy views"
git push origin main
REV="$(git rev-parse HEAD)"
echo "REV=$REV"

echo
echo "=== COMMITTED READBACK ==="
git show "$REV:$ATLAS_REL" > "$L/atlas-1728-rebuild/committed-atlas.png"
cmp -s "$ATLAS" "$L/atlas-1728-rebuild/committed-atlas.png"
git show "$REV:$RUN_REL" > "$L/atlas-1728-rebuild/committed-run-preview.js"
grep -Fq 'const viewHeight=Number(a.size?.[1]??atlas.naturalHeight);' "$L/atlas-1728-rebuild/committed-run-preview.js"
grep -Fq 'atlas.naturalHeight<declaredAtlasHeight' "$L/atlas-1728-rebuild/committed-run-preview.js"

python3 - "$L/atlas-1728-rebuild/committed-atlas.png" <<'PY'
from PIL import Image
import sys
assert Image.open(sys.argv[1]).size==(1037,1728)
print("COMMITTED_ATLAS_SIZE=1037x1728")
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
  assets/vanguard/procedural/vanguard-pose-atlas-90.png \
  assets/vanguard/procedural/idle.recipe.json \
  assets/vanguard/procedural/run.recipe.json \
  assets/vanguard/procedural/shotgun-reload.recipe.json \
  assets/vanguard/procedural/shotgun-fire.recipe.json; do
  curl -fsS "http://127.0.0.1:8766/$U" >/dev/null
done

STAMP="$(date +%s)"
IDLE="http://127.0.0.1:8766/motion.html?procedural=vanguard-idle&rev=$REV&nocache=$STAMP"
RUNURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-run&rev=$REV&nocache=$STAMP"
RELOADURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-reload&rev=$REV&nocache=$STAMP"
FIREURL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shotgun-fire&rev=$REV&nocache=$STAMP"

echo
echo "============================================================"
echo " VANGUARD ATLAS REBUILD DEPLOYED"
echo "============================================================"
echo "REV=$REV"
echo "ATLAS=1037x1728"
echo "IDLE_REVIEW=$IDLE"
echo "RUN_REVIEW=$RUNURL"
echo "RELOAD_REVIEW=$RELOADURL"
echo "FIRE_REVIEW=$FIREURL"
echo "HUMAN_VERDICT=PENDING"

termux-open-url "$IDLE"
