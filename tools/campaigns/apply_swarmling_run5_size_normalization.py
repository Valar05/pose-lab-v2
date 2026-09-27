from PIL import Image
from pathlib import Path
import hashlib, json, statistics, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4])
asset_root=Path(sys.argv[5])

EXPECTED_SOURCE_SHA="81a883d4825474bd16a03e0bb70c7fc126a20aa96e98d255160bf5d807e19c71"
TARGET_CELL=5
AUTHORITY_CELLS=[1,2,3,4,6]

raw=atlas_path.read_bytes()
if hashlib.sha256(raw).hexdigest()!=EXPECTED_SOURCE_SHA:
    raise SystemExit("STOP: source atlas is not the expected tiny uncropped authority")

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions changed")

def rect(n):
    i=n-1
    c=i%6
    r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def cell(n):
    return src.crop(rect(n)).copy()

def visible_bbox(im,threshold=24):
    px=im.load()
    xs=[]; ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>threshold:
                xs.append(x); ys.append(y)
    if not xs:
        raise SystemExit("STOP: empty visible cell")
    return (min(xs),min(ys),max(xs)+1,max(ys)+1)

def metrics(n):
    im=cell(n)
    b=visible_bbox(im)
    x0,y0,x1,y1=b
    return {"bbox":b,"w":x1-x0,"h":y1-y0,"cx":(x0+x1-1)/2,"ground":y1-1}

before_cells={n:hashlib.sha256(cell(n).tobytes()).hexdigest() for n in range(1,25)}
good=[metrics(n) for n in AUTHORITY_CELLS]
bad=metrics(TARGET_CELL)
target_h=int(round(statistics.median([m["h"] for m in good])))
target_cx=float(bad["cx"])
target_ground=int(bad["ground"])

if bad["h"]>=target_h:
    raise SystemExit(f"STOP: run cell 5 is no longer undersized ({bad['h']} >= {target_h})")

scale=target_h/bad["h"]
x0,y0,x1,y1=bad["bbox"]
subject=cell(TARGET_CELL).crop((x0,y0,x1,y1))
new_w=max(1,int(round(subject.width*scale)))
new_h=max(1,int(round(subject.height*scale)))
subject=subject.resize((new_w,new_h),Image.Resampling.LANCZOS)

new_cell=Image.new("RGBA",(256,256),(0,0,0,255))
paste_x=int(round(target_cx-new_w/2))
paste_y=target_ground+1-new_h
paste_x=max(0,min(256-new_w,paste_x))
paste_y=max(0,min(256-new_h,paste_y))
new_cell.alpha_composite(subject,(paste_x,paste_y))

rx0,ry0,rx1,ry1=rect(TARGET_CELL)
src.paste(new_cell,(rx0,ry0,rx1,ry1))
src.save(atlas_path)

after_cells={}
for n in range(1,25):
    after_cells[n]=hashlib.sha256(src.crop(rect(n)).tobytes()).hexdigest()

changed=[n for n in range(1,25) if before_cells[n]!=after_cells[n]]
if changed!=[TARGET_CELL]:
    raise SystemExit(f"STOP: unauthorized atlas cells changed: {changed}")

new_bad_bbox=visible_bbox(src.crop(rect(TARGET_CELL)))
new_h_actual=new_bad_bbox[3]-new_bad_bbox[1]
if abs(new_h_actual-target_h)>1:
    raise SystemExit(f"STOP: normalized cell 5 height {new_h_actual} does not match target {target_h}")

def transparent_black(im):
    im=im.copy()
    px=im.load()
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if r==0 and g==0 and b==0:
                px[x,y]=(0,0,0,0)
    return im

def body_center_anchor(n):
    im=src.crop(rect(n))
    b=visible_bbox(im,24)
    x0,y0,x1,y1=b
    return [int(round((x0+x1-1)/2)),int(y1-1)]

manifest=json.loads(manifest_path.read_text())
manifest["authority"]["sourceByteSha256"]=hashlib.sha256(atlas_path.read_bytes()).hexdigest()
manifest["authority"]["sourceRgbaPixelSha256"]=hashlib.sha256(src.tobytes()).hexdigest()
manifest["authority"]["sourceRecovery"]="run cell 5 normalized to median Run height; all other atlas cells unchanged"
manifest["authority"]["run5ScaleNormalization"]={
    "oldVisibleHeightPx":bad["h"],
    "targetVisibleHeightPx":target_h,
    "scale":round(scale,6),
    "authorityCells":AUTHORITY_CELLS
}

run=next(a for a in manifest["animations"] if a["id"]=="run")
contact=Image.new("RGBA",(1536,256),(0,0,0,0))
run_anchors=[]
for i,f in enumerate(run["frames"],start=1):
    im=transparent_black(src.crop(rect(i)))
    out=asset_root/f["src"]
    out.parent.mkdir(parents=True,exist_ok=True)
    im.save(out)
    f["sourceCell"]=i
    f["durationMs"]=80
    f["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    anchor=body_center_anchor(i)
    f["anchorPoint"]=anchor
    run_anchors.append(anchor)
    contact.alpha_composite(im,((i-1)*256,0))
contact_path=asset_root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)
run["pinAuthority"]={
    "mode":"body-center-x-ground-y",
    "reason":"Run body-centered; cell 5 size normalized to peer frames"
}

manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

new_const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"
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
hits=[i for i,l in enumerate(test_lines) if "run pins missing" in l and "runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one run-pin assertion")
test_lines[hits[0]]="if(!preview.includes("+json.dumps(new_const)+"))fail('run body-center anchors missing');"
test_path.write_text("\n".join(test_lines)+"\n")

print("RUN_HEIGHTS_BEFORE="+json.dumps([metrics(n)["h"] if n!=TARGET_CELL else bad["h"] for n in range(1,7)]))
print("RUN5_TARGET_HEIGHT="+str(target_h))
print("RUN5_SCALE="+str(round(scale,6)))
print("RUN_ANCHORS="+json.dumps(run_anchors,separators=(',',':')))
print("NEW_SOURCE_SHA256="+manifest["authority"]["sourceByteSha256"])
