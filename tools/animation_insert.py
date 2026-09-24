#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path

def find_repo(start: Path) -> Path:
    p=start.resolve()
    for c in [p,*p.parents]:
        if (c/"package.json").is_file() and (c/"public").is_dir():
            return c
    raise SystemExit("STOP: run inside pose-lab-v2")

def parse_cells(raw: str):
    return [int(x.strip()) for x in raw.split(",") if x.strip()]

def main():
    ap=argparse.ArgumentParser(description="Insert a new Pose Lab procedural animation recipe.")
    ap.add_argument("animation_id")
    ap.add_argument("--character", default="vanguard")
    ap.add_argument("--cells", required=True, help="atlas cells in playback order, comma-separated")
    ap.add_argument("--atlas-file", required=True, help="public-relative atlas path, e.g. assets/vanguard/procedural/vanguard-pose-atlas-54.png")
    ap.add_argument("--columns", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--atlas-width", type=int, required=True)
    ap.add_argument("--atlas-height", type=int, required=True)
    ap.add_argument("--cycle-ms", type=int, default=1000)
    ap.add_argument("--blend", type=float, default=0.15)
    ap.add_argument("--anchor", default="215,226")
    ap.add_argument("--mode", choices=["loop","oneshot"], default="loop")
    ap.add_argument("--out")
    args=ap.parse_args()

    repo=find_repo(Path.cwd())
    cells=parse_cells(args.cells)
    ax,ay=[int(x.strip()) for x in args.anchor.split(",",1)]

    poses=[]
    for i,cell in enumerate(cells,1):
        poses.append({
            "id":f"pose-{i}",
            "cell":cell,
            "weight":1.0,
            "deform":{"shearX":0.0,"scaleX":1.0,"scaleY":1.0,"shiftY":0.0}
        })

    data={
        "schema":"pose-lab-v2-procedural-animation-recipe-v1",
        "id":args.animation_id,
        "subject":args.character,
        "mode":args.mode,
        "rootMotion":False,
        "travelOwner":"game-controller",
        "canvas":{"size":[430,260],"anchor":[ax,ay],"anchorMeaning":"stable sprite-local pivot"},
        "atlas":{
            "file":args.atlas_file,
            "columns":args.columns,
            "rows":args.rows,
            "indexBase":1,
            "size":[args.atlas_width,args.atlas_height]
        },
        "cycleMs":args.cycle_ms,
        "blendWindow":args.blend,
        "poses":poses,
        "secondary":{"forwardSkewPulse":0.0,"breathScaleY":0.0,"bobPx":0.0}
    }

    if args.out:
        out=(repo/args.out).resolve()
    else:
        out=repo/"public"/"assets"/args.character/"procedural"/f"{args.animation_id}.recipe.json"
    out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists():
        raise SystemExit(f"STOP: recipe already exists: {out}; use animation_update.py")
    out.write_text(json.dumps(data,indent=2)+"\n")
    print(f"INSERTED {out}")
    print(f"CELLS {','.join(map(str,cells))}")

if __name__=="__main__":
    main()
