#!/usr/bin/env python3
"""Run-first physical scale guard; never certify unrelated torso/head ratios."""
from __future__ import annotations
import json,math,statistics,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent/"campaigns"))
from connie_v3_cloud_preview import source_authority,scale_analysis

ROOT=Path(__file__).resolve().parents[1]
CAL=ROOT/"campaigns/connie-anatomical-v3-calibration-v1.json"

def span(rec,kind):
    keys=("shoulderSourcePx","hipSourcePx") if kind=="body" else ("crownSourcePx","chinSourcePx")
    a,b=(rec.get(k) for k in keys)
    return math.dist(a,b) if a is not None and b is not None else None

def verify():
    original=source_authority()
    c=json.loads(CAL.read_text())
    groups=scale_analysis(original)
    assert c["schema"]=="pose-lab-v3-anatomical-calibration-v1"
    assert c["canonical"]=="run" and c["canonicalFrameAuthority"]==["run_1","run_2","run_3"]
    assert c["metric"]=="shoulder-to-hip-body-core-physical-distance"
    assert c["policy"]["oneFactorPerGroup"] and c["policy"]["doNotMeasureFromAlphaBounds"]
    assert c["status"].startswith("provisional")
    assert set(c["frames"])==set(original["frameOrder"])
    assert all(c["authority"]["sourceSHA256"][role]==source["sha256"]
               for role,source in original["sources"].items())
    run_span=statistics.median([span(c["frames"][fid],"body") for fid in c["canonicalFrameAuthority"]])
    assert 100<run_span<150,run_span
    assert groups["run"]["singleSequenceFactor"]==1.0
    assert groups["run"]["canonicalCharacterScale"]=="run"
    assert groups["idle"]["singleSequenceFactor"]<.6, "oversized idle not shrunk"
    assert .25<groups["idle"]["singleSequenceFactor"]<.6
    assert groups["rebound"]["singleSequenceFactor"]<1.0
    assert groups["dash"]["singleSequenceFactor"]<1.0
    results={}
    maxerror=0
    for role,spec in c["groups"].items():
        scale=groups[role]["singleSequenceFactor"]
        reliable=spec["measurementFrames"]
        assert scale>0 and math.isfinite(scale)
        assert groups[role]["physicalScaleMetric"]=="shoulder-to-hip-body-core"
        observed=[]
        for fid in spec["frames"]:
            r=c["frames"][fid]
            if fid in reliable:
                assert r["bodyCoreConfidence"]>=c["policy"]["confidenceFloor"]
                raw=span(r,"body")
                assert raw and raw>0
                scaled=raw*scale
                deviation=abs(scaled/run_span-1)
                assert deviation<=c["policy"]["maximumRelativeAnatomicalResidual"], (fid,deviation)
                maxerror=max(maxerror,deviation)
                observed.append({"id":fid,"rawBodyPx":round(raw,3),
                                 "scaledBodyPx":round(scaled,3),
                                 "relativeDifferencePct":round(deviation*100,3)})
        assert observed
        results[role]={"scale":scale,"measured":observed,
                       "headVsRun":groups[role]["postScaledHeadToRunRatio"],
                       "headProportionMismatch":groups[role]["headProportionMismatchFlag"]}
    assert span(c["frames"]["dash_3"],"body") is None
    assert c["groups"]["dash"]["transformKind"]=="uniform-deliberate-transformation"
    assert groups["dash"]["artisticReviewRequired"]
    assert c["frames"]["rebound_1"]["bodyCoreConfidence"]<c["policy"]["confidenceFloor"]
    assert c["frames"]["dash_2"]["bodyCoreConfidence"]<c["policy"]["confidenceFloor"]
    assert groups["idle"]["headProportionMismatchFlag"], "report expected idle head/body mismatch"
    print("CONNIE_CANONICAL_RUN=LOCKED_1X")
    print("CONNIE_RUN_BODY_TARGET_PX=%.4f"%run_span)
    print("CONNIE_RUN_FIRST_SCALE_REPORT="+json.dumps(results,sort_keys=True))
    print("CONNIE_MAX_BODY_CORE_RESIDUAL=%.3f%%"%(maxerror*100))
    print("CONNIE_IDLE_SHRINK_CONFIRMED=TRUE")
    print("CONNIE_ALL_FAMILIES_RUN_REFERENCED=TRUE")
    print("CONNIE_HEAD_PROPORTIONS=INDEPENDENT_DIAGNOSTIC_HUMAN_REVIEW")
    print("CONNIE_HUMAN_VERDICT=PENDING")

if __name__=="__main__":
    verify()
