#!/usr/bin/env python3
"""GitHub-run single RGBA atlas checks, including real-original mode."""
from __future__ import annotations
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

sys.path.insert(0,str(Path(__file__).resolve().parent/"campaigns"))
from connie_v3_cloud_preview import source_authority,scale_analysis,frame_art,produce,verify_sources

ROOT=Path(__file__).resolve().parents[1]

def assert_atlas(out,doc,groups):
    meta=json.loads((out/"connie-unified-sprite-sheet.json").read_text())
    png=out/"connie-unified-sprite-sheet.png"
    assert meta["sha256"]==hashlib.sha256(png.read_bytes()).hexdigest()
    assert meta["schema"]=="pose-lab-v2-unified-atlas-candidate-v1"
    assert meta["status"].startswith("quarantined")
    assert meta["frameCount"]==10 and len(meta["frames"])==10
    assert set(meta["frameOrder"])==set(doc["frameOrder"])
    assert meta["uniformSequenceFactors"]["dash"]==1.0
    assert meta["uniformSequenceFactors"]["run"]==groups["run"]["singleSequenceFactor"]
    assert meta["uniformSequenceFactors"]["rebound"]==groups["rebound"]["singleSequenceFactor"]
    assert meta["grid"]["columns"]==4 and meta["grid"]["rows"]==3
    w,h=meta["grid"]["cellWidth"],meta["grid"]["cellHeight"]
    with Image.open(png) as im:
        atlas=im.convert("RGBA")
    assert atlas.size==(w*4,h*3) and atlas.getchannel("A").getextrema()[0]==0
    cells=set()
    for rec in meta["frames"]:
        x,y,cw,ch=rec["atlasCellPx"]
        assert cw==w and ch==h
        assert x%w==0 and y%h==0 and (x,y) not in cells
        cells.add((x,y))
        sprite=atlas.crop((x,y,x+w,y+h))
        visible=sprite.getchannel("A").getbbox()
        assert visible is not None,rec["id"]
        left,top,ww,hh=rec["visibleRectInCellPx"]
        assert 0<=left<left+ww<=w and 0<=top<top+hh<=h
        assert visible[0]>=left and visible[1]>=top
        assert visible[2]<=left+ww and visible[3]<=top+hh
        assert rec["sourceSha256"]==doc["sources"][rec["sequence"]]["sha256"]
        assert rec["sourceCellPx"]==doc["frames"][rec["id"]]["regionPx"]
        assert rec["durationMs"] is None and rec["groundAnchor"] is None
        if rec["sequence"]=="dash":
            assert rec["artisticScaleApprovalRequired"] is True
            assert rec["sequenceUniformScale"]==1
        else:
            assert rec["artisticScaleApprovalRequired"] is False
    for slot in ([3,1],[3,2]):
        assert atlas.crop((slot[0]*w,slot[1]*h,(slot[0]+1)*w,(slot[1]+1)*h)).getchannel("A").getbbox() is None
    report=json.loads((out/"report.json").read_text())
    assert report["singleSpriteSheetFrameCount"]==10
    assert report["singleSpriteSheetSha256"]==meta["sha256"]
    assert "connie-unified-sprite-sheet.png" in (out/"index.html").read_text()
    print("CONNIE_UNIFIED_ATLAS_CELLS_OK=10")
    print("CONNIE_UNIFIED_ATLAS_SHA256="+meta["sha256"])
    return meta

def synth(doc):
    sources={}
    for role,details in doc["sources"].items():
        w,h=details["dimensionsPx"]
        im=Image.new("RGB",(w,h),"black")
        draw=ImageDraw.Draw(im)
        for fid,rec in doc["frames"].items():
            if rec["source"]!=role:continue
            x,y,cw,ch=rec["regionPx"]
            draw.rectangle((x+40,y+40,x+cw-55,y+ch-50),fill=(249,176,191))
            draw.rectangle((x+80,y+60,x+cw-100,y+ch-65),fill=(35,20,40))
        sources[role]=im
    return sources

def run(doc,sources,tag):
    with tempfile.TemporaryDirectory() as home:
        home=Path(home)
        a,b=home/"a",home/"b"
        gs=scale_analysis(doc)
        produce(doc,sources,gs,a,tag)
        meta=assert_atlas(a,doc,gs)
        # No source changed during deterministic repeat: byte identity.
        before={k:hashlib.sha256(v.tobytes()).hexdigest() for k,v in sources.items()}
        produce(doc,sources,scale_analysis(doc),b,tag)
        assert_atlas(b,doc,gs)
        for rel in a.rglob("*"):
            if rel.is_file():
                assert hashlib.sha256(rel.read_bytes()).digest()==hashlib.sha256((b/rel.relative_to(a)).read_bytes()).digest()
        assert before=={k:hashlib.sha256(v.tobytes()).hexdigest() for k,v in sources.items()}
        print("CONNIE_UNIFIED_ATLAS_DETERMINISM_OK=2")
        return meta

if __name__=="__main__":
    doc=source_authority()
    run(doc,synth(doc),"test-synthetic")
    if len(sys.argv)>1 and sys.argv[1]=="--real":
        sources=verify_sources(doc)
        run(doc,sources,"source-verified")
        print("CONNIE_UNIFIED_ATLAS_REAL_SOURCE_OK=4")
    else:
        print("CONNIE_UNIFIED_ATLAS_SYNTHETIC_ONLY=TRUE")
