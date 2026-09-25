#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"
R="public/assets/vanguard/procedural/shoulder-charge.recipe.json"
A5="public/assets/vanguard/procedural/attack5.recipe.json"
cd "$P"
git diff --quiet HEAD -- "$R" || { echo "STOP: shoulder recipe has tracked edits"; exit 1; }
python3 - <<'PY'
import json
from pathlib import Path
from copy import deepcopy
rp=Path("public/assets/vanguard/procedural/shoulder-charge.recipe.json")
a5p=Path("public/assets/vanguard/procedural/attack5.recipe.json")
d=json.loads(rp.read_text()); a5=json.loads(a5p.read_text())
before={"atlases":deepcopy(d["atlases"]),"bodySources":{k:deepcopy(v) for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":deepcopy(p["deform"])} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":deepcopy(d["stage"]),"rootMotion":d["rootMotion"]}
src=deepcopy(a5["sources"]["spray"]); es=deepcopy(a5["effectAtlases"]["attack5-spray"])
assert src["kind"]=="effect-atlas-cell"
assert es["path"]=="assets/vanguard/procedural/attack5-spray-atlas.png"
assert es["size"]==[1774,887] and es["geometry"]=="irregular-explicit-rects"
# User selected the large hooked/comet effect from this exact atlas. Index it as cell 10.
# Its source sheet is 1774x887; selected top-right hooked/comet region.
# Explicit rect is deliberately separate from Attack 5's cell 9.
es.setdefault("rects",{})["10"]=[845,35,860,455]
d["effectAtlases"]={"shoulder-wake-atlas":es}
d["sources"].pop("shoulderWake",None)
src["atlas"]="shoulder-wake-atlas"; src["cell"]=10; src["role"]="effect"; src["trim"]=True; src["preserveCellBounds"]=False
d["sources"]["shoulderWake"]=src
# Keep Attack 5's proven shared recolor treatment, change only source/placement.
d["effect"]=deepcopy(a5["effect"]); d["effect"]["source"]="shoulderWake"; d["effect"]["revealMode"]="none"; d["effect"]["liveControls"]=False; d["effect"]["position"]=[175,88]; d["effect"]["rotateZDeg"]=0; d["effect"]["tiltXDeg"]=0; d["effect"]["yawYDeg"]=0; d["effect"]["scaleX"]=0.72; d["effect"]["scaleY"]=0.72; d["effect"]["depthSplit"]=0
for p in d["phases"]:
    if p["id"] in ("idle","anticipation","idle-return"): p["effect"]={"reveal":0,"core":0,"tightGlow":0,"wideGlow":0}
    elif p["id"]=="release": p["effect"]={"reveal":1,"core":0.30,"tightGlow":0.25,"wideGlow":0.12}
    elif p["id"]=="impact": p["effect"]={"reveal":1,"core":1,"tightGlow":1,"wideGlow":0.70}
    elif p["id"]=="crush": p["effect"]={"reveal":1,"core":0.38,"tightGlow":0.28,"wideGlow":0.14}
after={"atlases":d["atlases"],"bodySources":{k:v for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":p["deform"]} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":d["stage"],"rootMotion":d["rootMotion"]}
assert before==after
rp.write_text(json.dumps(d,indent=2)+"\n")
print("BODY UNCHANGED; Attack 5 atlas; shoulder wake cell 10")
PY
python3 -m json.tool "$R" >/dev/null
git add "$R"
git commit -m "Use Attack 5 atlas for shoulder wake"
git push origin main
REV="$(git rev-parse HEAD)"
mkdir -p "$L"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
npm run build
python3 - <<'PY'
import json,os
d=json.load(open("dist/assets/vanguard/procedural/shoulder-charge.recipe.json"))
s=d["sources"][d["effect"]["source"]]; es=d["effectAtlases"][s["atlas"]]
assert s["cell"]==10 and es["path"]=="assets/vanguard/procedural/attack5-spray-atlas.png"
assert es["rects"]["10"]==[845,35,860,455]
assert os.path.isfile("dist/"+es["path"])
print("BUILT ATTACK5 WAKE CONTRACT PASS")
PY
if [ -f "$L/server.pid" ]; then kill "$(cat "$L/server.pid")" 2>/dev/null || true; fi
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2
kill -0 "$PID" || { cat "$L/server.log"; exit 1; }
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shoulder-charge&rev=$REV"
echo "$URL"; termux-open-url "$URL"
