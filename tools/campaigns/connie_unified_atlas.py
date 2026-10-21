#!/usr/bin/env python3
"""One-sheet export, reusing Connie's approved V3 source partitions.

Full transparent RGBA atlas of ALL TEN authored poses in fixed-size cells.
Head-envelope-based sequence factors apply identically to every frame of
one regular animation. Dash/pinwheel retains its original authored scale
until the artist approves the transformation-to-body relationship.
"""
from __future__ import annotations
import hashlib
import json
import math
from pathlib import Path
from PIL import Image

LAYOUT=(
    ("idle", "run_1", "run_2", "run_3"),
    ("rebound_1", "rebound_2", "rebound_3", None),
    ("dash_1", "dash_2", "dash_3", None),
)

def fail(msg):
    raise ValueError("CONNIE_SINGLE_SHEET_STOP: "+msg)

def build_atlas(doc, sources, groups, out, revision, frame_art):
    order=[fid for line in LAYOUT for fid in line if fid]
    if len(order)!=10 or len(set(order))!=10 or set(order)!=set(doc["frameOrder"]):
        fail("one atlas must preserve all 10 exact authored frames")
    scales={"idle":1.0,"run":groups["run"]["singleSequenceFactor"],
            "rebound":groups["rebound"]["singleSequenceFactor"],"dash":1.0}
    if any(not isinstance(f,(float,int)) or not math.isfinite(f) or f<=0 for f in scales.values()):
        fail("undefined or invalid family scale")
    prepared={}
    for fid in order:
        record=doc["frames"][fid]
        art, anchor=frame_art(doc,sources,fid)
        scale=scales[record["source"]]
        scaled_w=max(1,round(art.width*scale))
        scaled_h=max(1,round(art.height*scale))
        scaled_anchor=(round(anchor[0]*scale),round(anchor[1]*scale))
        prepared[fid]={"art":art,"anchor":anchor,"scaledAnchor":scaled_anchor,
                       "width":scaled_w,"height":scaled_h,
                       "scale":scale,"role":record["source"],
                       "pivotKind":"head-envelope-comparison" if record.get("head") else "silhouette-fallback"}
    # One fixed optical comparison pivot across the complete character atlas.
    # Bounds computed from every authored pose, not from a per-frame fit-to-box.
    pad=36
    pivot_x=pad+max(z["scaledAnchor"][0] for z in prepared.values())
    pivot_y=pad+max(z["scaledAnchor"][1] for z in prepared.values())
    cell_w=pivot_x+pad+max(z["width"]-z["scaledAnchor"][0] for z in prepared.values())
    cell_h=pivot_y+pad+max(z["height"]-z["scaledAnchor"][1] for z in prepared.values())
    cell_w=math.ceil(cell_w/64)*64
    cell_h=math.ceil(cell_h/64)*64
    canvas=Image.new("RGBA",(cell_w*4,cell_h*3),(0,0,0,0))
    atlas_records=[]
    for row, ids in enumerate(LAYOUT):
        for column,fid in enumerate(ids):
            if fid is None: continue
            z=prepared[fid]
            image=(z["art"].resize((z["width"],z["height"]),Image.Resampling.LANCZOS)
                   if z["scale"]!=1 else z["art"])
            local_x=pivot_x-z["scaledAnchor"][0]
            local_y=pivot_y-z["scaledAnchor"][1]
            if (local_x<pad or local_y<pad or
                local_x+image.width>cell_w-pad or local_y+image.height>cell_h-pad):
                fail("whole authored silhouette would clip: "+fid)
            canvas.alpha_composite(image,(column*cell_w+local_x,row*cell_h+local_y))
            record=doc["frames"][fid]
            atlas_records.append({
                "id":fid,"sequence":z["role"],
                "sourceSha256":doc["sources"][z["role"]]["sha256"],
                "sourceCellPx":record["regionPx"],
                "atlasCellPx":[column*cell_w,row*cell_h,cell_w,cell_h],
                "visibleRectInCellPx":[local_x,local_y,image.width,image.height],
                "sequenceUniformScale":round(z["scale"],8),
                "opticalPivotInCellPx":[pivot_x,pivot_y],
                "opticalPivotType":z["pivotKind"],
                "groundAnchor":None,"durationMs":None,
                "artisticScaleApprovalRequired":z["role"]=="dash"})
    filename="connie-unified-sprite-sheet.png"
    canvas.save(out/filename,optimize=False)
    metadata={
        "schema":"pose-lab-v2-unified-atlas-candidate-v1",
        "status":"quarantined-human-visual-verdict-pending",
        "character":"Connie",
        "sourceCommit":revision,"sourceAuthority":"campaigns/connie-source-measurements-v3.json",
        "image":filename,"sha256":hashlib.sha256((out/filename).read_bytes()).hexdigest(),
        "canvasPx":list(canvas.size),"grid":{"columns":4,"rows":3,
          "cellWidth":cell_w,"cellHeight":cell_h},
        "emptySlots":[[3,1],[3,2]],
        "frameOrder":order,"frameCount":10,"frames":atlas_records,
        "sequences":{"idle":["idle"],"run":["run_1","run_2","run_3"],
          "wall-impact":["rebound_1","rebound_2","rebound_3"],
          "dash":["dash_1","dash_2","dash_3"]},
        "uniformSequenceFactors":scales,
        "dashStatus":"UNAPPROVED physical scale; original 1.0x preserved",
        "registrationStatus":"Shared optical head pivot for sheet comparison only; no grounded-foot registration claim",
        "timeStatus":"No authored frame timing available; none manufactured",
        "noIntermediateFrames":True,"noLimbsAltered":True,"sourcesUnmodified":True,
        "atlasReadyForHumanReview":True,"gameReady":False
    }
    (out/"connie-unified-sprite-sheet.json").write_text(
        json.dumps(metadata,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("CONNIE_SINGLE_SHEET_EXPORTED=10")
    print("CONNIE_SINGLE_SHEET_SIZE=%dx%d"%canvas.size)
    print("CONNIE_SINGLE_SHEET_SHA256="+metadata["sha256"])
    return metadata
