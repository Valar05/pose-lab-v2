#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
P="$HOME/storage/documents/GodotProjects/pose-lab-v2"
L="$HOME/.local/state/pose-lab-v2-vanguard-live"
W="$L/worktree"
R="public/assets/vanguard/procedural/shoulder-charge.recipe.json"
JS="src/procedural-motion-preview.js"
cd "$P"
git diff --quiet HEAD -- "$R" || { echo "STOP: shoulder recipe has tracked edits"; exit 1; }
grep -q 'drawSlash' "$JS" || { echo "STOP: shared slash renderer absent"; exit 1; }
python3 - <<'PY'
import json,re
from pathlib import Path
from copy import deepcopy
rp=Path("public/assets/vanguard/procedural/shoulder-charge.recipe.json")
js=Path("src/procedural-motion-preview.js").read_text()
d=json.loads(rp.read_text())
body_before={"atlases":deepcopy(d.get("atlases")),"bodySources":{k:deepcopy(v) for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":deepcopy(p["deform"])} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":deepcopy(d["stage"]),"rootMotion":d["rootMotion"]}
d.pop("effectAtlases",None); d["sources"].pop("shoulderWake",None)
fields=set(re.findall(r'(?:recipe\.)?effect\??\.([A-Za-z_][A-Za-z0-9_]*)',js))
fields |= set(re.findall(r'effect\[\s*[\'"]([^\'"]+)[\'"]\s*\]',js))
candidates=[]
for f in Path("public/assets/vanguard/procedural").glob("*.recipe.json"):
    try:x=json.loads(f.read_text())
    except:continue
    e=x.get("effect")
    if not isinstance(e,dict):continue
    active=any(any(float(p.get("effect",{}).get(k,0) or 0)>0 for k in ("reveal","core","tightGlow","wideGlow")) for p in x.get("phases",[]))
    if active:candidates.append((len(set(e)&fields),str(f),x))
if not candidates: raise SystemExit("STOP: no active effect authority")
candidates.sort(key=lambda x:(-x[0],x[1]))
score,authority_file,authority=candidates[0]
if score==0: raise SystemExit("STOP: renderer/recipe contract correlation failed")
e=deepcopy(authority["effect"])
atlas_path="assets/vanguard/procedural/diorama-slash-atlas.png"
for key in ("atlasPath","path","imagePath","src"):
    if key in fields:e[key]=atlas_path
if "cell" in fields:e["cell"]=4
elif "atlasCell" in fields:e["atlasCell"]=4
elif "slashCell" in fields:e["slashCell"]=4
else:raise SystemExit("STOP: renderer cell field not identified")
for k,v in {"position":[205,112],"rotateZDeg":0,"tiltXDeg":0,"yawYDeg":0,"scaleX":0.95,"scaleY":0.95,"flipX":False,"flipY":False,"depthSplit":0,"revealMode":"none","liveControls":False}.items():
    if k in e:e[k]=v
d["effect"]=e
for p in d["phases"]:
    if p["id"] in ("idle","anticipation","idle-return"): p["effect"]={"reveal":0,"core":0,"tightGlow":0,"wideGlow":0}
    elif p["id"]=="release": p["effect"]={"reveal":1,"core":0.35,"tightGlow":0.30,"wideGlow":0.15}
    elif p["id"]=="impact": p["effect"]={"reveal":1,"core":1,"tightGlow":1,"wideGlow":0.75}
    elif p["id"]=="crush": p["effect"]={"reveal":1,"core":0.40,"tightGlow":0.30,"wideGlow":0.15}
body_after={"atlases":d.get("atlases"),"bodySources":{k:v for k,v in d["sources"].items() if v.get("role")=="body"},"phases":[{"id":p["id"],"source":p["source"],"durationMs":p["durationMs"],"deform":p["deform"]} for p in d["phases"]],"bodyScale":d["bodyScale"],"stage":d["stage"],"rootMotion":d["rootMotion"]}
assert body_before==body_after
rp.write_text(json.dumps(d,indent=2)+"\n")
print("authority",authority_file,"body unchanged; effect cell 4")
PY
python3 -m json.tool "$R" >/dev/null
node --check "$JS"
git add "$R"
git commit -m "Wire shoulder wake through renderer effect contract"
git push origin main
REV="$(git rev-parse HEAD)"
mkdir -p "$L"
git worktree remove --force "$W" 2>/dev/null || true
rm -rf "$W"
git worktree add --detach "$W" "$REV"
cd "$W"
npm run build
if [ -f "$L/server.pid" ]; then kill "$(cat "$L/server.pid")" 2>/dev/null || true; fi
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$W/dist" >"$L/server.log" 2>&1 &
PID=$!; echo "$PID" >"$L/server.pid"; sleep 2
kill -0 "$PID" || { cat "$L/server.log"; exit 1; }
URL="http://127.0.0.1:8766/motion.html?procedural=vanguard-shoulder-charge&rev=$REV"
echo "$URL"
termux-open-url "$URL"
