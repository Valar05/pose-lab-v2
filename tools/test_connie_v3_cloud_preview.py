#!/usr/bin/env python3
"""GitHub CI smoke exercise of cloud render before phone originals arrive.

Synthetic rectangles only validate renderer mechanics, not Connie art authority.
Real source SHA verification is separately fail-closed in the hosted cloud job.
"""
import json
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent / "campaigns"))
from connie_v3_cloud_preview import source_authority, scale_analysis, produce, verify_sources


def test():
    doc = source_authority()
    groups = scale_analysis(doc)
    assert len(doc["frames"]) == 10
    assert len(groups["run"]["frames"]) == 3
    assert len(groups["rebound"]["frames"]) == 3
    assert len(groups["dash"]["frames"]) == 3
    assert groups["dash"]["status"].startswith("QUARANTINED")
    assert groups["dash"]["artisticReviewRequired"] is True
    assert groups["dash"]["singleSequenceFactor"] != 1.0
    assert all(groups[k]["singleSequenceFactor"] > 0 for k in groups)
    if not (Path(__file__).resolve().parents[1] / "public/assets/connie/source/run.png").is_file():
        try:
            verify_sources(doc)
            raise AssertionError("cloud renderer accepted absent originals")
        except ValueError as exc:
            assert "missing Git source PNG" in str(exc)
    # The synthetic artwork is never committed, transported, or used as source.
    synthetic = {}
    for role in ("idle","run","rebound","dash"):
        w,h=doc["sources"][role]["dimensionsPx"]
        pic=Image.new("RGB",(w,h),"black")
        draw=ImageDraw.Draw(pic)
        for frame in doc["frames"].values():
            if frame["source"] != role:
                continue
            x,y,cw,ch=frame["regionPx"]
            draw.rectangle((x+45,y+55,min(x+cw-45,w-1),min(y+ch-45,h-1)),
                           fill=(250,165,189))
        synthetic[role]=pic
    with tempfile.TemporaryDirectory() as td:
        out=Path(td)/"review"
        produce(doc,synthetic,groups,out,"synthetic-test-only")
        report=json.loads((out/"report.json").read_text())
        assert report["status"]=="quarantined-awaiting-human-review"
        assert report["pinwheelBlocked"] is True
        assert report["gameReady"] is False
        assert (out/"index.html").is_file()
        for role in ("idle","run","rebound","dash"):
            assert (out/("original-"+role+".png")).is_file()
            assert (out/"original"/(groups[role]["frames"][0]+".png")).is_file()
            assert (out/("candidate-"+role+".png")).is_file()
            assert (out/"candidate"/(groups[role]["frames"][0]+".png")).is_file()
        print("CONNIE_CLOUD_RENDER_MECHANICS_TEST_OK=10")
        print("REAL_ORIGINAL_SOURCE_PROOF=NOT_YET_AVAILABLE")


if __name__=="__main__":
    test()
