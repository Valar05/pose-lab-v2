#!/usr/bin/env python3
"""Connie V3 actual anatomical scale regression, not atlas packing.

Requires saved exact source anatomy; checks that after ONE whole-family scale
the reliable crown/chin measurements match canonical standing head within
explicit tolerance. A metadata-only bbox pass is not acceptance.
"""
from __future__ import annotations
import json, math, hashlib, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent/"campaigns"))
from connie_v3_cloud_preview import source_authority,scale_analysis

ROOT=Path(__file__).resolve().parents[1]
CAL=ROOT/"campaigns/connie-anatomical-v3-calibration-v1.json"


def measure(d):
    if d["crownSourcePx"] is None or d["chinSourcePx"] is None:
        return None
    return math.dist(d["crownSourcePx"],d["chinSourcePx"])


def verify():
    source=source_authority()
    cfg=json.loads(CAL.read_text())
    group=scale_analysis(source)
    assert cfg["schema"]=="pose-lab-v3-anatomical-calibration-v1"
    assert cfg["policy"]["oneFactorPerGroup"] is True
    assert cfg["policy"]["doNotMeasureFromAlphaBounds"] is True
    assert cfg["status"].startswith("provisional")
    assert set(cfg["frames"])==set(source["frameOrder"])
    assert {k:cfg["authority"]["sourceSHA256"][k] for k in ("idle","run","rebound","dash")}=={
        k:source["sources"][k]["sha256"] for k in ("idle","run","rebound","dash")}
    canonical=measure(cfg["frames"]["idle"])
    assert canonical and 100<canonical<200
    assert abs(canonical-group["idle"]["anatomicalTargetPx"])<.0001
    normalized={}
    worst=0
    for role, spec in cfg["groups"].items():
        actual_group=group[role]
        factor=actual_group["singleSequenceFactor"]
        assert math.isfinite(factor) and factor>0
        assert actual_group["scaleAuthority"].startswith("manually calibrated crown")
        measured=[]
        for frame in spec["frames"]:
            entry=cfg["frames"][frame]
            length=measure(entry)
            if frame in spec["measurementFrames"]:
                assert length is not None
                assert entry["confidence"]>=cfg["policy"]["confidenceFloor"]
                resulting=length*factor
                error=abs(resulting/canonical-1)
                assert error <= cfg["policy"]["maximumRelativeAnatomicalResidual"], (
                    frame,resulting,canonical,error)
                worst=max(error,worst)
                measured.append({"frame":frame,"beforePx":round(length,3),
                                 "afterPx":round(resulting,3),
                                 "deviationPct":round(error*100,3)})
            if role=="dash":
                assert actual_group["artisticReviewRequired"] is True
        assert measured
        normalized[role]={"uniformFactor":factor,"reliableFrames":measured}
    assert cfg["frames"]["dash_3"]["crownSourcePx"] is None
    assert cfg["frames"]["dash_3"]["chinSourcePx"] is None
    assert cfg["groups"]["dash"]["transformKind"]=="uniform-deliberate-transformation"
    assert group["dash"]["singleSequenceFactor"]!=1.0
    assert cfg["frames"]["rebound_1"]["confidence"]<cfg["policy"]["confidenceFloor"]
    assert cfg["frames"]["dash_2"]["confidence"]<cfg["policy"]["confidenceFloor"]
    # Historic mistaken envelope factors are not anatomical scale authority.
    assert abs(group["run"]["singleSequenceFactor"]-group["run"]["oldBoundingBoxProxyFactor"])>.1
    assert abs(group["rebound"]["singleSequenceFactor"]-group["rebound"]["oldBoundingBoxProxyFactor"])>.1
    print("CONNIE_ANATOMICAL_TARGET_PX=%.4f"%canonical)
    print("CONNIE_ANATOMICAL_MEASUREMENT_REPORT="+json.dumps(normalized,sort_keys=True))
    print("CONNIE_ANATOMICAL_MAX_DEVIATION=%.3f%%"%(worst*100))
    print("CONNIE_ANATOMICAL_UNIFORM_SEQUENCE_SCALE_PASS=4")
    print("CONNIE_ARTISTIC_VERDICT=PENDING")


if __name__=="__main__":
    verify()
