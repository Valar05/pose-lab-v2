from PIL import Image
from pathlib import Path
import json, statistics, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4])

EXPECTED_SHA="814251044e0308eaa74deea14b08273fb133abacca097c4f0537b75eb72ae40e"

m=json.loads(manifest_path.read_text())
if m.get("authority",{}).get("sourceByteSha256")!=EXPECTED_SHA:
    raise SystemExit("STOP: resized atlas source hash changed")

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions changed")

def rect(n):
    i=n-1
    c=i%6
    r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def body_core_anchor(n):
    im=src.crop(rect(n))
    px=im.load()
    pts=[]
    ys_all=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>40:
                ys_all.append(y)
    if not ys_all:
        raise SystemExit(f"STOP: no visible pixels in Run cell {n}")
    ymin,ymax=min(ys_all),max(ys_all)
    h=max(1,ymax-ymin+1)
    band_lo=int(round(ymin+h*0.24))
    band_hi=int(round(ymin+h*0.72))
    for y in range(max(0,band_lo),min(256,band_hi+1)):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                # Keep dense-ish pixels; thin tendrils/extremities are de-emphasized by median.
                pts.append((x,y))
    if not pts:
        raise SystemExit(f"STOP: no body-core pixels in Run cell {n}")
    xs=sorted(x for x,_ in pts)
    core_x=int(round(statistics.median(xs)))
    ground=max(ys_all)
    return [core_x,int(ground)]

run=next((a for a in m.get("animations",[]) if a.get("id")=="run"),None)
if not run or len(run.get("frames",[]))!=6:
    raise SystemExit("STOP: Run manifest missing or malformed")

old_anchors=[f.get("anchorPoint") for f in run["frames"]]
new_anchors=[body_core_anchor(i) for i in range(1,7)]

for f,a in zip(run["frames"],new_anchors):
    f["anchorPoint"]=a

run["pinAuthority"]={
    "mode":"body-core-x-ground-y",
    "reason":"Human review: full-silhouette centering did not improve perceived centering because tendrils/extremities skewed the center"
}
manifest_path.write_text(json.dumps(m,indent=2)+"\n")

preview_lines=preview_path.read_text().splitlines()
hits=[i for i,l in enumerate(preview_lines) if l.strip().startswith("const runAnchors=")]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one runAnchors declaration")
new_const="const runAnchors="+json.dumps(new_anchors,separators=(',',':'))+";"
preview_lines[hits[0]]=new_const
preview_text="\n".join(preview_lines)+"\n"
if "const presentationScale=1.5;" not in preview_text:
    raise SystemExit("STOP: presentation scale changed unexpectedly")
preview_path.write_text(preview_text)

test_lines=test_path.read_text().splitlines()
hits=[i for i,l in enumerate(test_lines) if "preview.includes(" in l and "const runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit(f"STOP: expected one runAnchors assertion, found {len(hits)}")
test_lines[hits[0]]="if(!preview.includes("+json.dumps(new_const)+"))fail('run body-core anchors missing');"
test_path.write_text("\n".join(test_lines)+"\n")

print("RUN_OLD_ANCHORS="+json.dumps(old_anchors,separators=(',',':')))
print("RUN_BODY_CORE_ANCHORS="+json.dumps(new_anchors,separators=(',',':')))
print("SOURCE_HASH_PRESERVED="+EXPECTED_SHA)
