#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"
R="public/assets/vanguard/procedural/shoulder-charge.recipe.json"
H="public/assets/vanguard/procedural/horizontal-strike.recipe.json"
cd "$P"
git diff --quiet HEAD -- "$R" || { echo "STOP: shoulder recipe has tracked edits"; exit 1; }
python3 - <<'PY'
import json
from pathlib import Path
from copy import deepcopy
rp=Path("public/assets/vanguard/procedural/shoulder-charge.recipe.json")
hp=Path("public/assets/vanguard/procedural/horizontal-strike.recipe.json")
d=json.loads(rp.read_text()); h=json.loads(hp.read_text())
body_before={"atlases":deepcopy(d["atlases"]),"bodySources":{k:deepcopy(v) for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":deepcopy(p["deform"])} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":deepcopy(d["stage"]),"rootMotion":d["rootMotion"]}
src=deepcopy(h["sources"][h["effect"]["source"]])
es=deepcopy(h["effectAtlases"][src["atlas"]])
assert src["kind"]=="effect-atlas-cell"
assert es["path"]=="assets/vanguard/procedural/diorama-slash-atlas.png"
assert es["columns"]==4 and es["rows"]==2 and es["indexBase"]==1
d["effectAtlases"]={"slash-canonical":es}
src["atlas"]="slash-canonical"; src["cell"]=4; src["role"]="effect"; src["preserveCellBounds"]=True
d["sources"]["shoulderWake"]=src
d["effect"]=deepcopy(h["effect"]); d["effect"]["source"]="shoulderWake"; d["effect"]["revealMode"]="none"; d["effect"]["liveControls"]=False; d["effect"]["position"]=[205,112]; d["effect"]["rotateZDeg"]=0; d["effect"]["tiltXDeg"]=0; d["effect"]["yawYDeg"]=0; d["effect"]["scaleX"]=0.95; d["effect"]["scaleY"]=0.95; d["effect"]["depthSplit"]=0
for p in d["phases"]:
    if p["id"] in ("idle","anticipation","idle-return"): p["effect"]={"reveal":0,"core":0,"tightGlow":0,"wideGlow":0}
    elif p["id"]=="release": p["effect"]={"reveal":1,"core":0.35,"tightGlow":0.30,"wideGlow":0.15}
    elif p["id"]=="impact": p["effect"]={"reveal":1,"core":1,"tightGlow":1,"wideGlow":0.75}
    elif p["id"]=="crush": p["effect"]={"reveal":1,"core":0.40,"tightGlow":0.30,"wideGlow":0.15}
body_after={"atlases":d["atlases"],"bodySources":{k:v for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":p["deform"]} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":d["stage"],"rootMotion":d["rootMotion"]}
assert body_before==body_after
rp.write_text(json.dumps(d,indent=2)+"\n")
print("BODY UNCHANGED; canonical effect-atlas-cell wired; cell 4")
PY
python3 -m json.tool "$R" >/dev/null
node --check src/procedural-motion-preview.js
git add "$R"
git commit -m "Wire shoulder wake through canonical effect atlas"
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
assert s["kind"]=="effect-atlas-cell" and s["cell"]==4
assert es["path"]=="assets/vanguard/procedural/diorama-slash-atlas.png"
assert os.path.isfile("dist/"+es["path"])
assert next(p for p in d["phases"] if p["id"]=="impact")["effect"]["core"]>0
print("BUILT EFFECT CONTRACT PASS")
PY
if [ -f "$L/server.pid" ]; then kill "$(cat "$L/server.pid")" 2>/dev/null || true; fi
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2
kill -0 "$PID" || { cat "$L/server.log"; exit 1; }
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shoulder-charge&rev=$REV"
echo "$URL"; termux-open-url "$URL"
