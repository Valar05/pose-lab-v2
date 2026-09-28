from PIL import Image
from pathlib import Path
import json, statistics, sys

atlas_path=Path(sys.argv[1])
manifest_path=Path(sys.argv[2])

EXPECTED_SHA="c9546c1bc61d9e5b0a2e558e26b53488e140520d5ae21b0f288ff2c3c85c7ea2"
CANVAS_CENTER_X=215
PRESENTATION_SCALE=1.5

m=json.loads(manifest_path.read_text())
if m.get("authority",{}).get("sourceByteSha256")!=EXPECTED_SHA:
    raise SystemExit("STOP: current atlas hash changed")

src=Image.open(atlas_path).convert("RGBA")
if src.size!=(1536,1024):
    raise SystemExit("STOP: atlas dimensions changed")

def rect(n):
    i=n-1
    c=i%6
    r=i//6
    return (c*256,r*256,(c+1)*256,(r+1)*256)

def body_core_x(n):
    im=src.crop(rect(n))
    px=im.load()
    ys=[]
    for y in range(256):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>40:
                ys.append(y)
    if not ys:
        raise SystemExit(f"STOP: empty attack source cell {n}")
    ymin,ymax=min(ys),max(ys)
    h=ymax-ymin+1
    lo=max(0,int(round(ymin+h*.24)))
    hi=min(255,int(round(ymin+h*.72)))
    xs=[]
    for y in range(lo,hi+1):
        for x in range(256):
            r,g,b,a=px[x,y]
            if a>0 and max(r,g,b)>55:
                xs.append(x)
    if not xs:
        raise SystemExit(f"STOP: no body-core pixels in attack source cell {n}")
    return float(statistics.median(xs))

attack_ids=["jab","rake","scythe-bloom"]
results={}

for aid in attack_ids:
    a=next((x for x in m.get("animations",[]) if x.get("id")==aid),None)
    if not a:
        raise SystemExit(f"STOP: missing attack {aid}")
    timeline=a.get("timeline",[])
    if not timeline:
        raise SystemExit(f"STOP: missing timeline for {aid}")
    weighted=0.0
    total=0.0
    details=[]
    for item in timeline:
        cell=item.get("sourceCell")
        anchor=item.get("anchorPoint")
        dur=float(item.get("durationMs",0))
        if not isinstance(cell,int) or not (isinstance(anchor,list) and len(anchor)==2):
            raise SystemExit(f"STOP: {aid} timeline item missing sourceCell/anchorPoint")
        core=body_core_x(cell)
        offset=core-float(anchor[0])
        weighted += offset*dur
        total += dur
        details.append({"cell":cell,"coreX":core,"anchorX":anchor[0],"offset":offset,"durationMs":dur})
    if total<=0:
        raise SystemExit(f"STOP: invalid timeline duration for {aid}")
    avg_offset=weighted/total
    stage_x=int(round(CANVAS_CENTER_X - avg_offset*PRESENTATION_SCALE))
    old=a.get("stageAnchor")
    if old!=[220,226]:
        raise SystemExit(f"STOP: unexpected pre-centering stageAnchor for {aid}: {old}")
    a["stageAnchor"]=[stage_x,226]
    a["centeringAuthority"]={
        "mode":"weighted-body-core-vs-pinned-foot",
        "canvasCenterX":CANVAS_CENTER_X,
        "presentationScale":PRESENTATION_SCALE,
        "weightedCoreOffsetPx":round(avg_offset,4),
        "resolvedStageAnchorX":stage_x
    }
    results[aid]={"stageAnchor":[stage_x,226],"weightedOffset":avg_offset,"details":details}

# Preserve semantic locks.
jab=next(a for a in m["animations"] if a["id"]=="jab")
if jab["frames"][1]["sourceCell"]!=15:
    raise SystemExit("STOP: Needle Jab impact cell changed")
run=next(a for a in m["animations"] if a["id"]=="run")
if any(f.get("anchorPoint")!=[128,249] for f in run.get("frames",[])):
    raise SystemExit("STOP: Run anchors changed")

manifest_path.write_text(json.dumps(m,indent=2)+"\n")

for aid,r in results.items():
    print(aid.upper()+"_STAGE_ANCHOR="+json.dumps(r["stageAnchor"]))
    print(aid.upper()+"_WEIGHTED_CORE_OFFSET="+str(round(r["weightedOffset"],4)))
