#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, shutil, sys
from pathlib import Path

def parse_value(raw: str):
    try:
        return json.loads(raw)
    except Exception:
        return raw

def find_repo(start: Path) -> Path:
    p=start.resolve()
    for c in [p,*p.parents]:
        if (c/"package.json").is_file() and (c/"public").is_dir():
            return c
    raise SystemExit("STOP: run inside pose-lab-v2")

def resolve_recipe(repo: Path, target: str) -> Path:
    p=Path(target)
    if p.is_file():
        return p.resolve()
    if not p.is_absolute():
        q=(repo/p)
        if q.is_file():
            return q.resolve()
    matches=list(repo.glob(f"public/assets/**/procedural/{target}.recipe.json"))
    if len(matches)==1:
        return matches[0].resolve()
    if not matches:
        raise SystemExit(f"STOP: animation recipe not found: {target}")
    raise SystemExit("STOP: ambiguous animation id; use full path:\n" + "\n".join(str(x) for x in matches))

def set_path(obj, dotted: str, value):
    parts=dotted.split(".")
    cur=obj
    for part in parts[:-1]:
        if isinstance(cur,list):
            cur=cur[int(part)]
        else:
            if part not in cur or cur[part] is None:
                cur[part]={}
            cur=cur[part]
    last=parts[-1]
    if isinstance(cur,list):
        cur[int(last)]=value
    else:
        cur[last]=value

def scale_matching(obj, key: str, factor: float):
    if isinstance(obj,dict):
        for k,v in obj.items():
            if k==key and isinstance(v,(int,float)):
                obj[k]=v*factor
            else:
                scale_matching(v,key,factor)
    elif isinstance(obj,list):
        for v in obj:
            scale_matching(v,key,factor)

def main():
    ap=argparse.ArgumentParser(description="Update any Pose Lab procedural animation recipe.")
    ap.add_argument("animation", help="animation id or recipe path")
    ap.add_argument("--set", action="append", default=[], metavar="PATH=VALUE",
                    help="set any dotted JSON path; VALUE accepts JSON")
    ap.add_argument("--cells", help="replace pose cell order, comma-separated")
    ap.add_argument("--cycle-ms", type=int)
    ap.add_argument("--blend", type=float)
    ap.add_argument("--lean-scale", type=float, help="multiply every shearX by this factor")
    ap.add_argument("--duration-scale", type=float, help="multiply durationMs values by this factor")
    ap.add_argument("--no-backup", action="store_true")
    ap.add_argument("--sync-live", action="store_true",
                    help="copy changed public asset into active Pose Lab live worktree/dist when present")
    args=ap.parse_args()

    repo=find_repo(Path.cwd())
    recipe=resolve_recipe(repo,args.animation)
    data=json.loads(recipe.read_text())

    if not args.no_backup:
        shutil.copy2(recipe,recipe.with_suffix(recipe.suffix+".bak"))

    if args.cells:
        cells=[int(x.strip()) for x in args.cells.split(",") if x.strip()]
        poses=data.get("poses")
        if not isinstance(poses,list):
            raise SystemExit("STOP: recipe has no poses[]")
        if len(cells)!=len(poses):
            raise SystemExit(f"STOP: expected {len(poses)} cells, got {len(cells)}")
        for pose,cell in zip(poses,cells):
            pose["cell"]=cell

    if args.cycle_ms is not None:
        data["cycleMs"]=args.cycle_ms
    if args.blend is not None:
        data["blendWindow"]=args.blend
    if args.lean_scale is not None:
        scale_matching(data,"shearX",args.lean_scale)
    if args.duration_scale is not None:
        scale_matching(data,"durationMs",args.duration_scale)

    for assignment in args.set:
        if "=" not in assignment:
            raise SystemExit(f"STOP: --set requires PATH=VALUE: {assignment}")
        path,raw=assignment.split("=",1)
        set_path(data,path,parse_value(raw))

    recipe.write_text(json.dumps(data,indent=2)+"\n")
    print(f"UPDATED {recipe}")

    if args.sync_live:
        live=Path.home()/".local/state"
        for wt in live.glob("pose-lab-v2-*/worktree"):
            try:
                rel=recipe.relative_to(repo)
            except ValueError:
                continue
            dest=wt/rel
            if dest.parent.is_dir():
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(recipe,dest)
                dist=wt/"dist"/Path(*rel.parts[1:]) if rel.parts and rel.parts[0]=="public" else None
                if dist and dist.parent.is_dir():
                    dist.parent.mkdir(parents=True,exist_ok=True)
                    shutil.copy2(recipe,dist)
                print(f"SYNCED {wt}")

if __name__=="__main__":
    main()
