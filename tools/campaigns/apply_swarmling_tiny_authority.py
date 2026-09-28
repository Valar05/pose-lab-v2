from PIL import Image
from pathlib import Path
import hashlib, json, statistics, sys

atlas_path = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
preview_path = Path(sys.argv[3])
test_path = Path(sys.argv[4])
root = Path(sys.argv[5])
expected = sys.argv[6]

raw = atlas_path.read_bytes()
if hashlib.sha256(raw).hexdigest() != expected:
    raise SystemExit("STOP: copied atlas SHA mismatch")

src = Image.open(atlas_path).convert("RGBA")
if src.size != (1536, 1024):
    raise SystemExit("STOP: atlas dimensions mismatch")

def cell(n):
    i=n-1
    c,r=i%6,i//6
    return src.crop((c*256,r*256,(c+1)*256,(r+1)*256)).copy()

def foot(n):
    im=cell(n)
    px=im.load()
    pts=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a and max(r,g,b)>40:
                pts.append((x,y))
    if not pts:
        raise SystemExit(f"STOP: no body pixels in cell {n}")
    max_y=max(y for _,y in pts)
    xs=[x for x,y in pts if y>=max_y-3]
    return [int(round(statistics.median(xs))),int(max_y)]

m=json.loads(manifest_path.read_text())
m["authority"]["sourceByteSha256"]=expected
m["authority"]["sourceRgbaPixelSha256"]=hashlib.sha256(src.tobytes()).hexdigest()
m["authority"]["sourceDimensions"]=[1536,1024]
m["authority"]["scale"]="Tiny approved footprint restored; no renderer compensation"
m["authority"]["sourceRecovery"]="tiny uncropped atlas promoted by exact SHA"

run=next(a for a in m["animations"] if a["id"]=="run")
if len(run["frames"])!=6:
    raise SystemExit("STOP: run must contain six frames")

contact=Image.new("RGBA",(1536,256),(0,0,0,0))
run_anchors=[]
for i,f in enumerate(run["frames"]):
    im=cell(i+1)
    px=im.load()
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if r==0 and g==0 and b==0:
                px[x,y]=(0,0,0,0)
    out=root/f["src"]
    out.parent.mkdir(parents=True,exist_ok=True)
    im.save(out)
    f["sourceCell"]=i+1
    f["durationMs"]=80
    f["sha256"]=hashlib.sha256(out.read_bytes()).hexdigest()
    contact.alpha_composite(im,(i*256,0))
    run_anchors.append(foot(i+1))

contact_path=root/run["contactSheet"]
contact_path.parent.mkdir(parents=True,exist_ok=True)
contact.save(contact_path)

for a in m["animations"]:
    if a.get("id") not in {"jab","rake","scythe-bloom"}:
        continue
    used={f["sourceCell"] for f in a.get("frames",[])}
    used|={f["sourceCell"] for f in a.get("timeline",[])}
    if isinstance(a.get("idleSource"),dict):
        used.add(a["idleSource"]["sourceCell"])
    anchors={n:foot(n) for n in used}
    if isinstance(a.get("idleSource"),dict):
        a["idleSource"]["anchorPoint"]=anchors[a["idleSource"]["sourceCell"]]
    for f in a.get("frames",[]):
        f["anchorPoint"]=anchors[f["sourceCell"]]
    for f in a.get("timeline",[]):
        f["anchorPoint"]=anchors[f["sourceCell"]]
    a["pinAuthority"]={
        "source":expected,
        "method":"bright bottom-contact median x over final 4 rows",
        "stageAnchor":[220,226]
    }

manifest_path.write_text(json.dumps(m,indent=2)+"\n")

new_const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"

preview_lines=preview_path.read_text().splitlines()
hits=[i for i,line in enumerate(preview_lines) if line.strip().startswith("const runAnchors=")]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one runAnchors declaration")
preview_lines[hits[0]]=new_const
preview_text="\n".join(preview_lines)+"\n"
if "const presentationScale=1.5;" not in preview_text:
    raise SystemExit("STOP: presentation scale changed unexpectedly")
preview_path.write_text(preview_text)

test_lines=test_path.read_text().splitlines()
hits=[i for i,line in enumerate(test_lines) if "run pins missing" in line and "runAnchors=" in line]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one run-pin guard")
indent=test_lines[hits[0]][:len(test_lines[hits[0]])-len(test_lines[hits[0]].lstrip())]
test_lines[hits[0]]=indent+"if(!preview.includes("+json.dumps(new_const)+"))fail('tiny-atlas run pins missing');"
test_path.write_text("\n".join(test_lines)+"\n")

print("run_anchors="+json.dumps(run_anchors,separators=(',',':')))
print("source_rgba_sha256="+m["authority"]["sourceRgbaPixelSha256"])
