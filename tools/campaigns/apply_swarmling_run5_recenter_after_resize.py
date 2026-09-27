from pathlib import Path
import json,sys

manifest_path=Path(sys.argv[1])
preview_path=Path(sys.argv[2])
test_path=Path(sys.argv[3])

EXPECTED_SOURCE_SHA="814251044e0308eaa74deea14b08273fb133abacca097c4f0537b75eb72ae40e"
EXPECTED_OLD_ANCHOR=[128,249]
NEW_ANCHOR=[126,249]

m=json.loads(manifest_path.read_text())
if m.get("authority",{}).get("sourceByteSha256")!=EXPECTED_SOURCE_SHA:
    raise SystemExit("STOP: resized atlas source hash changed")

run=next((a for a in m.get("animations",[]) if a.get("id")=="run"),None)
if not run or len(run.get("frames",[]))!=6:
    raise SystemExit("STOP: run manifest missing or not six frames")

frame5=run["frames"][4]
if frame5.get("sourceCell")!=5:
    raise SystemExit("STOP: fifth run frame no longer maps to source cell 5")
if frame5.get("anchorPoint")!=EXPECTED_OLD_ANCHOR:
    raise SystemExit(f"STOP: run-5 anchor drifted before recenter: {frame5.get('anchorPoint')}")
frame5["anchorPoint"]=NEW_ANCHOR
run["pinAuthority"]={
    "mode":"body-center-x-ground-y",
    "reason":"Run body-centered; Run-5 recentered after size calibration by human-visible delta",
    "run5AnchorCorrection":[-2,0]
}
manifest_path.write_text(json.dumps(m,indent=2)+"\n")

preview_lines=preview_path.read_text().splitlines()
hits=[i for i,l in enumerate(preview_lines) if l.strip().startswith("const runAnchors=")]
if len(hits)!=1:
    raise SystemExit("STOP: expected exactly one runAnchors declaration")
old_line=preview_lines[hits[0]]
expected="const runAnchors=[[127,249],[128,249],[128,249],[128,250],[128,249],[128,250]];"
if old_line.strip()!=expected:
    raise SystemExit("STOP: runAnchors changed before recenter")
new_line="const runAnchors=[[127,249],[128,249],[128,249],[128,250],[126,249],[128,250]];"
preview_lines[hits[0]]=new_line
preview_path.write_text("\n".join(preview_lines)+"\n")

test_lines=test_path.read_text().splitlines()
hits=[i for i,l in enumerate(test_lines) if "preview.includes(" in l and "const runAnchors=" in l]
if len(hits)!=1:
    raise SystemExit(f"STOP: expected one runAnchors assertion, found {len(hits)}")
test_lines[hits[0]]='if(!preview.includes("const runAnchors=[[127,249],[128,249],[128,249],[128,250],[126,249],[128,250]];"))fail(\'run body-center anchors missing\');'
test_path.write_text("\n".join(test_lines)+"\n")

print("RUN5_ANCHOR_OLD=[128,249]")
print("RUN5_ANCHOR_NEW=[126,249]")
print("SOURCE_HASH_PRESERVED="+EXPECTED_SOURCE_SHA)
