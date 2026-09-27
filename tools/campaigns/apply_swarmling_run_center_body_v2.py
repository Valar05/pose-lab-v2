from PIL import Image
from pathlib import Path
import json, re, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])
preview_path=Path(sys.argv[3])
test_path=Path(sys.argv[4])

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit(f"STOP: unexpected atlas size {src.size}")

def cell_image(n):
    i=n-1
    c=i%6
    r=i//6
    return src.crop((c*256,r*256,(c+1)*256,(r+1)*256))

def visible_points(im):
    px=im.load()
    pts=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>40:
                pts.append((x,y))
    return pts

def body_center_anchor(n):
    pts=visible_points(cell_image(n))
    if not pts:
        raise SystemExit(f"STOP: no visible pixels in cell {n}")
    xs=[x for x,_ in pts]
    ys=[y for _,y in pts]
    return [int(round((min(xs)+max(xs))/2)), max(ys)]

m=json.loads(manifest_path.read_text())
anims={a["id"]:a for a in m["animations"]}

run=anims["run"]
if len(run.get("frames",[]))!=6:
    raise SystemExit("STOP: Run must contain six frames")

run_anchors=[]
for i,f in enumerate(run["frames"],start=1):
    a=body_center_anchor(i)
    f["sourceCell"]=i
    f["anchorPoint"]=a
    run_anchors.append(a)
run["pinAuthority"]={
    "mode":"body-center-x-ground-y",
    "reason":"Human review: Run was worst offender; body centering chosen for run only"
}

jab=anims["jab"]
if len(jab.get("frames",[]))<2:
    raise SystemExit("STOP: Needle Jab frames missing")
jab["frames"][1]["sourceCell"]=15

for item in jab.get("timeline",[]):
    ident=str(item.get("id","")).lower()
    if ident in {"strike","recovery","impact","attack"}:
        item["sourceCell"]=15

manifest_path.write_text(json.dumps(m,indent=2)+"\n")

preview_lines=preview_path.read_text().splitlines()
idx=[i for i,l in enumerate(preview_lines) if l.strip().startswith("const runAnchors=")]
if len(idx)!=1:
    raise SystemExit("STOP: expected one runAnchors declaration")
new_const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"
preview_lines[idx[0]]=new_const
preview="\n".join(preview_lines)+"\n"
if "const presentationScale=1.5;" not in preview:
    raise SystemExit("STOP: presentation scale changed unexpectedly")
preview_path.write_text(preview)

test=test_path.read_text()
test=test.replace(
    "jab:{authoredCells:[10,14],timelineCells:[7,10,14,14,7],activeAtMs:350}",
    "jab:{authoredCells:[10,15],timelineCells:[7,10,15,15,7],activeAtMs:350}"
)
lines=test.splitlines()
hits=[i for i,l in enumerate(lines) if "run pins missing" in l and "runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit("STOP: expected one run-pin assertion")
lines[hits[0]]="if(!preview.includes("+json.dumps(new_const)+"))fail('run body-center anchors missing');"
test_path.write_text("\n".join(lines)+"\n")

print("RUN_ANCHORS="+json.dumps(run_anchors,separators=(',',':')))
print("JAB_IMPACT_CELL=15")
