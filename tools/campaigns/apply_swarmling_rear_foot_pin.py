from pathlib import Path
import json,sys

manifest_path=Path(sys.argv[1])
preview_path=Path(sys.argv[2])
test_path=Path(sys.argv[3])

run_anchors=[[105,249],[115,249],[113,249],[104,250],[121,249],[108,250]]
attack_anchors={
  7:[117,250],10:[106,250],11:[110,249],
  13:[103,250],15:[104,250],16:[110,250]
}

m=json.loads(manifest_path.read_text())
anims={a["id"]:a for a in m["animations"]}

jab=anims["jab"]
jab["frames"][0]["sourceCell"]=10
jab["frames"][0]["anchorPoint"]=attack_anchors[10]
jab["frames"][1]["sourceCell"]=15
jab["frames"][1]["anchorPoint"]=attack_anchors[15]

for item in jab.get("timeline",[]):
    ident=item.get("id","")
    if ident=="idle-enter":
        cell=7
    elif ident=="windup":
        cell=10
    elif ident in {"strike","recovery"}:
        cell=15
    elif ident=="idle-return":
        cell=7
    else:
        continue
    item["sourceCell"]=cell
    item["anchorPoint"]=attack_anchors[cell]
if isinstance(jab.get("idleSource"),dict):
    jab["idleSource"]["sourceCell"]=7
    jab["idleSource"]["anchorPoint"]=attack_anchors[7]
jab["pinAuthority"]={
  "mode":"explicit-rear-support-foot",
  "source":"human-reviewed tiny atlas",
  "impactCell":15
}

for anim_id in ("rake","scythe-bloom"):
    a=anims[anim_id]
    if isinstance(a.get("idleSource"),dict):
        cell=a["idleSource"]["sourceCell"]
        if cell in attack_anchors:
            a["idleSource"]["anchorPoint"]=attack_anchors[cell]
    for key in ("frames","timeline"):
        for item in a.get(key,[]):
            cell=item.get("sourceCell")
            if cell in attack_anchors:
                item["anchorPoint"]=attack_anchors[cell]
    a["pinAuthority"]={
      "mode":"explicit-rear-support-foot",
      "source":"human-reviewed tiny atlas"
    }

manifest_path.write_text(json.dumps(m,indent=2)+"\n")

preview_lines=preview_path.read_text().splitlines()
idx=[i for i,l in enumerate(preview_lines) if l.strip().startswith("const runAnchors=")]
if len(idx)!=1:
    raise SystemExit("STOP: expected one runAnchors declaration")
new_const="const runAnchors="+json.dumps(run_anchors,separators=(',',':'))+";"
preview_lines[idx[0]]=new_const
preview_path.write_text("\n".join(preview_lines)+"\n")

test=test_path.read_text()
test=test.replace(
  "jab:{authoredCells:[10,14],timelineCells:[7,10,14,14,7],activeAtMs:350}",
  "jab:{authoredCells:[10,15],timelineCells:[7,10,15,15,7],activeAtMs:350}"
)
lines=test.splitlines()
hits=[i for i,l in enumerate(lines) if "run pins missing" in l and "runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit("STOP: expected one run-pin assertion")
lines[hits[0]]="if(!preview.includes("+json.dumps(new_const)+"))fail('rear-foot run pins missing');"
test_path.write_text("\n".join(lines)+"\n")

print("RUN_ANCHORS="+json.dumps(run_anchors,separators=(',',':')))
print("JAB_IMPACT_CELL=15")
