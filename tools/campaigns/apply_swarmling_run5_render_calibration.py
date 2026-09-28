from PIL import Image
from pathlib import Path
import hashlib, json, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
asset_root=Path(sys.argv[3])

EXPECTED_SHA="0f1e4e667f52a075c4ead4723673a9e93fc25c688d38f3385ddeae7d0d23e058"
SCALE=99/83
CELL=5

raw=atlas_path.read_bytes()
if hashlib.sha256(raw).hexdigest()!=EXPECTED_SHA:
    raise SystemExit("STOP: current atlas is not the expected pre-calibration revision")

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions changed")

def rect(n):
    i=n-1; c=i%6; r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def visible_bbox(im, threshold=24):
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

before={n:hashlib.sha256(src.crop(rect(n)).tobytes()).hexdigest() for n in range(1,25)}

cell=src.crop(rect(CELL)).copy()
x0,y0,x1,y1=visible_bbox(cell)
subject=cell.crop((x0,y0,x1,y1))
cx=(x0+x1-1)/2
ground=y1-1

nw=max(1,round(subject.width*SCALE))
nh=max(1,round(subject.height*SCALE))
subject=subject.resize((nw,nh),Image.Resampling.LANCZOS)

new_cell=Image.new("RGBA",(256,256),(0,0,0,255))
px=round(cx-nw/2)
py=ground+1-nh
px=max(0,min(256-nw,px))
py=max(0,min(256-nh,py))
new_cell.alpha_composite(subject,(px,py))

src.paste(new_cell,rect(CELL))
src.save(atlas_path)

after={n:hashlib.sha256(src.crop(rect(n)).tobytes()).hexdigest() for n in range(1,25)}
changed=[n for n in range(1,25) if before[n]!=after[n]]
if changed!=[CELL]:
    raise SystemExit(f"STOP: unauthorized atlas cells changed: {changed}")

m=json.loads(manifest_path.read_text())
m["authority"]["sourceByteSha256"]=hashlib.sha256(atlas_path.read_bytes()).hexdigest()
m["authority"]["sourceRgbaPixelSha256"]=hashlib.sha256(src.tobytes()).hexdigest()
m["authority"]["sourceRecovery"]="Run cell 5 recalibrated from rendered review ratio 99/83; all other atlas cells unchanged"
m["authority"]["run5RenderCalibration"]={
    "renderedBeforePx":83,
    "renderedTargetPx":99,
    "scaleFromCurrent":SCALE
}

run=next(a for a in m["animations"] if a["id"]=="run")
f=run["frames"][4]
im=src.crop(rect(5)).copy()
ipx=im.load()
for y in range(256):
    for x in range(256):
        r,g,b,a=ipx[x,y]
        if r==0 and g==0 and b==0:
            ipx[x,y]=(0,0,0,0)
out=asset_root/f["src"]
out.parent.mkdir(parents=True,exist_ok=True)
im.save(out)
f["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()

# Rebuild contact sheet only; preserve all run anchor points exactly.
contact=Image.new("RGBA",(1536,256),(0,0,0,0))
for i,rf in enumerate(run["frames"],start=1):
    frame_path=asset_root/rf["src"]
    frm=Image.open(frame_path).convert("RGBA")
    contact.alpha_composite(frm,((i-1)*256,0))
contact_path=asset_root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)

m_path_text=json.dumps(m,indent=2)+"\n"
manifest_path.write_text(m_path_text)

print("RUN5_SCALE_FROM_CURRENT="+str(SCALE))
print("RUN5_BODY_CENTER_X="+str(cx))
print("RUN5_GROUND_Y="+str(ground))
print("NEW_SOURCE_SHA256="+m["authority"]["sourceByteSha256"])
