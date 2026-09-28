from PIL import Image
from pathlib import Path
import hashlib, json, statistics, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4])
asset_root=Path(sys.argv[5])

EXPECTED_SHA="814251044e0308eaa74deea14b08273fb133abacca097c4f0537b75eb72ae40e"
TARGET_HEIGHTS=[45,45,46,46,45,46]
TARGET_X=128
TARGET_GROUND=249

raw=atlas_path.read_bytes()
if hashlib.sha256(raw).hexdigest()!=EXPECTED_SHA:
    raise SystemExit("STOP: current atlas is not the expected pre-repair revision")

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions changed")

def rect(n):
    i=n-1; c=i%6; r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def bbox(im,thr=24):
    px=im.load()
    xs=[]; ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>thr:
                xs.append(x); ys.append(y)
    if not xs:
        raise SystemExit("STOP: empty Run source cell")
    return (min(xs),min(ys),max(xs)+1,max(ys)+1)

def body_core_x(im,b):
    x0,y0,x1,y1=b
    h=y1-y0
    lo=max(0,int(round(y0+h*.24)))
    hi=min(255,int(round(y0+h*.72)))
    px=im.load()
    xs=[]
    for y in range(lo,hi+1):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                xs.append(x)
    if not xs:
        return (x0+x1-1)/2
    return float(statistics.median(xs))

before_nonrun={
    n:hashlib.sha256(src.crop(rect(n)).tobytes()).hexdigest()
    for n in range(7,25)
}

old_heights=[]
new_heights=[]

for n,target_h in enumerate(TARGET_HEIGHTS,start=1):
    cell=src.crop(rect(n)).copy()
    b=bbox(cell)
    x0,y0,x1,y1=b
    old_h=y1-y0
    old_heights.append(old_h)
    core_x=body_core_x(cell,b)

    subject=cell.crop(b)
    scale=target_h/old_h
    nw=max(1,int(round(subject.width*scale)))
    nh=max(1,int(round(subject.height*scale)))
    subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)

    # Map the old body-core X through the crop+scale so that the torso,
    # not tendrils/extremities, lands at the shared Run center.
    core_rel=(core_x-x0)*scale
    px=int(round(TARGET_X-core_rel))
    py=int(round(TARGET_GROUND+1-nh))

    px=max(0,min(256-nw,px))
    py=max(0,min(256-nh,py))

    out=Image.new("RGBA",(256,256),(0,0,0,255))
    out.alpha_composite(subject,(px,py))
    src.paste(out,rect(n))

    nb=bbox(out)
    new_heights.append(nb[3]-nb[1])

src.save(atlas_path)

changed_nonrun=[
    n for n in range(7,25)
    if hashlib.sha256(src.crop(rect(n)).tobytes()).hexdigest()!=before_nonrun[n]
]
if changed_nonrun:
    raise SystemExit(f"STOP: non-Run atlas cells changed: {changed_nonrun}")

for got,want in zip(new_heights,TARGET_HEIGHTS):
    if abs(got-want)>1:
        raise SystemExit(f"STOP: rebuilt Run height {got} misses target {want}")

manifest=json.loads(manifest_path.read_text())
manifest["authority"]["sourceByteSha256"]=hashlib.sha256(atlas_path.read_bytes()).hexdigest()
manifest["authority"]["sourceRgbaPixelSha256"]=hashlib.sha256(src.tobytes()).hexdigest()
manifest["authority"]["sourceRecovery"]="Run row rebuilt to one shared character scale and physical torso center"
manifest["authority"]["runUniformScaleRepair"]={
    "originalSourceVisibleHeightsPx":[62,62,64,64,63,64],
    "targetRunVisibleHeightsPx":TARGET_HEIGHTS,
    "targetBodyCoreX":TARGET_X,
    "targetGroundY":TARGET_GROUND
}

run=next(a for a in manifest["animations"] if a["id"]=="run")
if len(run.get("frames",[]))!=6:
    raise SystemExit("STOP: Run manifest must have six frames")

contact=Image.new("RGBA",(1536,256),(0,0,0,0))
for i,f in enumerate(run["frames"],start=1):
    im=src.crop(rect(i)).copy()
    p=im.load()
    for y in range(256):
        for x in range(256):
            r,g,b,a=p[x,y]
            if r==0 and g==0 and b==0:
                p[x,y]=(0,0,0,0)
    out=asset_root/f["src"]
    out.parent.mkdir(parents=True,exist_ok=True)
    im.save(out)
    f["sourceCell"]=i
    f["durationMs"]=80
    f["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    f["anchorPoint"]=[TARGET_X,TARGET_GROUND]
    contact.alpha_composite(im,((i-1)*256,0))

contact_path=asset_root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)

run["pinAuthority"]={
    "mode":"physical-body-core-centered-source",
    "reason":"Run source row rebuilt uniformly; all frames physically centered at one torso X and ground Y",
    "stageAnchor":[220,226]
}

manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

new_const="const runAnchors=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]];"
preview_lines=preview_path.read_text().splitlines()
hits=[i for i,l in enumerate(preview_lines) if l.strip().startswith("const runAnchors=")]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one runAnchors declaration")
preview_lines[hits[0]]=new_const
preview_text="\n".join(preview_lines)+"\n"
if "const presentationScale=1.5;" not in preview_text:
    raise SystemExit("STOP: presentation scale changed unexpectedly")
preview_path.write_text(preview_text)

test_lines=test_path.read_text().splitlines()
hits=[i for i,l in enumerate(test_lines) if "preview.includes(" in l and "const runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit(f"STOP: expected one runAnchors assertion, found {len(hits)}")
test_lines[hits[0]]='if(!preview.includes("const runAnchors=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]];"))fail(\'uniform Run anchors missing\');'
test_path.write_text("\n".join(test_lines)+"\n")

jab=next(a for a in manifest["animations"] if a["id"]=="jab")
if jab["frames"][1]["sourceCell"]!=15:
    raise SystemExit("STOP: Needle Jab impact cell drifted")

print("RUN_HEIGHTS_BEFORE="+json.dumps(old_heights))
print("RUN_HEIGHTS_AFTER="+json.dumps(new_heights))
print("RUN_ANCHORS=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]]")
print("NEW_SOURCE_SHA256="+manifest["authority"]["sourceByteSha256"])
