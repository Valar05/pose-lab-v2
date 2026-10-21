#!/usr/bin/env python3
"""GitHub-owned Connie V3 source review with sequence-uniform candidate scaling.

Uses manually calibrated physical face landmarks, not V3 silhouette bounds. Renders *quarantined static*
comparisons only, not animation with invented timing or an accepted atlas.
Intended to run on GitHub Actions AFTER four exact PNGs arrive via native Git.
"""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import math
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from sprite_scale_normalization import alpha_artwork
from connie_unified_atlas import build_atlas

AUTH = ROOT / "campaigns/connie-source-measurements-v3.json"
ORDER = ("idle", "run", "rebound", "dash")
LABELS = {"idle": "Standing reference", "run": "Run",
          "rebound": "Wall impact", "dash": "Dash / pinwheel"}


def stop(msg):
    raise ValueError("CONNIE_CLOUD_STOP: " + msg)


def source_authority():
    record = json.loads(AUTH.read_text())
    if record.get("schema") != "pose-lab-connie-measurements-v3":
        stop("wrong source manifest schema")
    expected = {"idle": 1, "run": 3, "rebound": 3, "dash": 3}
    for role in expected:
        if role not in record["sources"]:
            stop("missing original source role: " + role)
    if len(record["frameOrder"]) != 10 or len(record["frames"]) != 10:
        stop("unexpected authored frame count")
    for role in expected:
        records = [f for f in record["frameOrder"] if record["frames"][f]["source"] == role]
        if len(records) != expected[role]:
            stop("missing original source frames: " + role)
    return record


def verify_sources(doc):
    source = {}
    for role in ORDER:
        info = doc["sources"][role]
        path = ROOT / info["repoPath"]
        if not path.is_file() or path.is_symlink():
            stop("missing Git source PNG: " + str(path))
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != info["sha256"]:
            stop("original V3 SHA mismatch: " + role)
        with Image.open(path) as opened:
            if opened.format != "PNG" or list(opened.size) != info["dimensionsPx"]:
                stop("original dimensions/format mismatch: " + role)
            source[role] = opened.copy()
        print("GITHUB_ORIGINAL_VERIFIED", role, actual)
    return source


def scale_analysis(doc):
    """Use explicit crown-to-chin anatomy, never a rose/hair bounding rectangle."""
    import statistics
    calib_path = ROOT / "campaigns/connie-anatomical-v3-calibration-v1.json"
    calib = json.loads(calib_path.read_text(encoding="utf-8"))
    if calib.get("schema") != "pose-lab-v3-anatomical-calibration-v1":
        stop("calibration schema mismatch")
    if calib["authority"]["originalGitRevision"] != "56f000831aecdde15fc3588effd93aa822ebdb79":
        stop("Connie anatomy calibrated against unexpected source revision")
    if calib["canonical"] != "idle":
        stop("standing reference must remain canonical")
    if set(calib["frames"]) != set(doc["frameOrder"]):
        stop("anatomical annotation must cover exactly ten source-authoritative frames")
    if set(calib["groups"]) != set(ORDER):
        stop("one and only one calibrated group per original animation")
    for role in ORDER:
        if calib["authority"]["sourceSHA256"][role] != doc["sources"][role]["sha256"]:
            stop("anatomy was calibrated on different source PNGs: " + role)
    def length(fid):
        record = calib["frames"][fid]
        source = doc["frames"][fid]
        if record["source"] != source["source"]:
            stop("anatomical point source mismatch: " + fid)
        points = (record.get("crownSourcePx"), record.get("chinSourcePx"))
        if any(p is None for p in points):
            return None
        x, y, w, h = source["regionPx"]
        for point in points:
            if (not isinstance(point, list) or len(point) != 2 or
                not (x <= point[0] < x + w and y <= point[1] < y + h)):
                stop("anatomical point falls outside exact source cell: " + fid)
        dist = math.dist(*points)
        if dist < 10 or not math.isfinite(dist):
            stop("degenerate anatomical measurement: " + fid)
        return dist
    ref = length("idle")
    if ref is None or calib["frames"]["idle"]["confidence"] < calib["policy"]["confidenceFloor"]:
        stop("canonical standing anatomy unreliable")
    groups = {}
    for role in ORDER:
        family = calib["groups"][role]
        ids = [fid for fid in doc["frameOrder"] if doc["frames"][fid]["source"] == role]
        if ids != family["frames"]:
            stop("authored animation frame order diverges from calibration: " + role)
        reliable = family["measurementFrames"]
        if not reliable:
            stop("sequence lacks an explicit anatomical scale anchor: " + role)
        if any(fid not in ids for fid in reliable):
            stop("calibration measure subset outside sequence: " + role)
        values = []
        measured = {}
        for fid in ids:
            v = length(fid)
            conf = calib["frames"][fid]["confidence"]
            measured[fid] = {"crownChinPx": round(v, 4) if v else None,
                             "confidence": conf,
                             "contributesToScale": fid in reliable,
                             "notes": calib["frames"][fid]["note"]}
            if fid in reliable:
                if v is None or conf < calib["policy"]["confidenceFloor"]:
                    stop("chosen anatomical scale landmark unreliable: " + fid)
                values.append(v)
        median = statistics.median(values)
        factor = ref / median
        residuals = {fid: abs(v * factor / ref - 1)
                     for fid in reliable
                     for v in [length(fid)]}
        max_error = max(residuals.values())
        if max_error > calib["policy"]["maximumRelativeAnatomicalResidual"]:
            stop("anatomical sequence variance is too high: " + role)
        if role == "dash" and family["transformKind"] != "uniform-deliberate-transformation":
            stop("headless dash relationship must be recorded explicitly")
        groups[role] = {
            "id": role, "label": LABELS[role], "frames": ids,
            "anatomicalTargetPx": round(ref, 4),
            "medianReliableCrownChinPx": round(median, 4),
            "singleSequenceFactor": round(factor, 8),
            "anatomicalMeasurement": measured,
            "maximumAnatomicalResidual": round(max_error, 6),
            "observedHeadEnvelopePx": [doc["frames"][fid].get("head", {}).get("heightPx") for fid in ids],
            "oldBoundingBoxProxyFactor": round(
                doc["frames"]["idle"]["head"]["heightPx"] /
                statistics.median([doc["frames"][fid]["head"]["heightPx"]
                                   for fid in ids if doc["frames"][fid].get("head")]), 8),
            "status": ("QUARANTINED transformation-scale candidate; human approval required"
                       if role == "dash" else "QUARANTINED anatomical-scale candidate"),
            "artisticReviewRequired": role == "dash",
            "scaleAuthority": "manually calibrated crown/chin from source-faithful original V3 PNGs",
            "reasons": [family.get("exception", "")] if family.get("exception") else [],
        }
    print("CONNIE_ANATOMICAL_CANONICAL_PX=%.4f" % ref)
    print("CONNIE_ANATOMICAL_SEQUENCE_FACTORS=" + json.dumps(
        {k: v["singleSequenceFactor"] for k, v in groups.items()}))
    return groups


def frame_art(doc, source, fid):
    frame = doc["frames"][fid]
    role = frame["source"]
    x, y, w, h = frame["regionPx"]
    full = source[role]
    if min(x, y) < 0 or x + w > full.width or y + h > full.height:
        stop("region exceeds source image: " + fid)
    im = alpha_artwork(full.crop((x, y, x+w, y+h)), "black")
    box = im.getchannel("A").getbbox()
    if not box:
        stop("empty original authored frame: " + fid)
    # Full alpha bounds include valid detached ornaments. Never infer anatomy
    # from this bbox and never use the V3 connected-component cleanup as a mask.
    im = im.crop(box)
    head = frame.get("head")
    if head:
        anchor = ((head["boundsSourcePx"][0]+head["boundsSourcePx"][2])/2 - x - box[0],
                  (head["boundsSourcePx"][1]+head["boundsSourcePx"][3])/2 - y - box[1])
    else:
        anchor = (im.width/2, im.height/2)
    return im, anchor


def display_frame(art, anchor, scale):
    # Display-only head centering. Not a saved game grounding anchor or root
    # registration. Contained with no cropping even when paper extends wildly.
    pad = 30
    w, h = max(1, round(art.width * scale)), max(1, round(art.height * scale))
    image = art.resize((w,h), Image.Resampling.LANCZOS) if scale != 1 else art
    refx, refy = round(anchor[0] * scale), round(anchor[1] * scale)
    # An oversized generous container, not scale-to-box.
    dest = Image.new("RGBA", (max(w + 2 * pad, 1500),
                              max(h + 2 * pad, 1500)), (0,0,0,0))
    dest.alpha_composite(image, (pad,pad))
    return dest, (pad+refx,pad+refy)


def mini_card(art, label, factor=1.0):
    canvas = Image.new("RGB", (560,520), (23,23,26))
    # Fixed optical zoom across every animation, never per-frame fit-to-box.
    zoom = 0.31 * factor
    tw,th=max(1,round(art.width*zoom)),max(1,round(art.height*zoom))
    if tw > 530 or th > 445:
        stop("comparison would clip at fixed global optical zoom: " + label)
    thumb = art.resize((tw,th), Image.Resampling.LANCZOS)
    x,y=(560-thumb.width)//2,(466-thumb.height)//2
    canvas.paste(thumb, (x,y), thumb.getchannel("A"))
    draw = ImageDraw.Draw(canvas)
    draw.text((15,477), label, fill=(255,255,255))
    return canvas


def produce(doc, src, groups, out, revision):
    out.mkdir(parents=True, exist_ok=False)
    unified=build_atlas(doc,src,groups,out,revision,frame_art)
    entries = []
    for role in ORDER:
        group = groups[role]
        row = []
        for fid in group["frames"]:
            im, anchor = frame_art(doc, src, fid)
            before,_ = display_frame(im, anchor, 1.0)
            (out / "original").mkdir(exist_ok=True)
            before.save(out / "original" / (fid+".png"))
            row.append(mini_card(im, fid + " original"))
        group["originalContactSheet"] = "original-"+role+".png"
        sheet = Image.new("RGB", (560 * len(row), 520), (23,23,26))
        for i,card in enumerate(row):
            sheet.paste(card, (560*i, 0))
        sheet.save(out / group["originalContactSheet"])
        if group["status"].startswith("BLOCKED"):
            entries.append(group)
            continue
        scaled_cards = []
        for fid in group["frames"]:
            im,anchor=frame_art(doc,src,fid)
            after,_=display_frame(im,anchor,group["singleSequenceFactor"])
            (out/"candidate").mkdir(exist_ok=True)
            after.save(out/"candidate"/(fid+".png"))
            scaled_cards.append(mini_card(im, fid + " uniform scale candidate", group["singleSequenceFactor"]))
        sheet=Image.new("RGB",(560*len(scaled_cards),520),(23,23,26))
        for i,card in enumerate(scaled_cards):
            sheet.paste(card,(560*i,0))
        group["candidateContactSheet"]="candidate-"+role+".png"
        sheet.save(out/group["candidateContactSheet"])
        entries.append(group)
    report={
      "schema":"pose-lab-connie-v3-cloud-preview-v1",
      "status":"quarantined-awaiting-human-review",
      "sourceRevision":revision,
      "canonicalCrownChinPx":groups["idle"]["anatomicalTargetPx"],
      "measurementKind":"V3 original-source calibrated crown-to-chin facial plane distance; hair/roses excluded",
      "originalSHA256":{k:doc["sources"][k]["sha256"] for k in ORDER},
      "groups":entries,
      "noInventedTiming":True,
      "pinwheelBlocked":True,
      "gameReady":False,
      "sourceImagesUnchanged":True,
      "singleSpriteSheet":"connie-unified-sprite-sheet.png",
      "singleSpriteSheetMetadata":"connie-unified-sprite-sheet.json",
      "singleSpriteSheetSha256":unified["sha256"],
      "singleSpriteSheetFrameCount":10,
    }
    (out/"report.json").write_text(json.dumps(report,indent=2)+"\n")
    cards=[]
    for group in entries:
        before=html.escape(group["originalContactSheet"])
        after=group.get("candidateContactSheet")
        info=html.escape(group["label"]+" | "+group["status"]+" | sequence scale "+str(group["singleSequenceFactor"]))
        cards.append('<section><h2>'+info+'</h2><p>Original source frames</p><img alt="'+html.escape(group["label"])+' originals" src="'+before+'"><p>Candidate uniform scale</p>'+
                     ('<img alt="'+html.escape(group["label"])+' normalized candidates" src="'+html.escape(after)+'">' if after else
                       '<p role="status">BLOCKED: shape transformation requires human decision. Original frames preserved.</p>')+
                     '</section>')
    page='''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Connie scale review · Pose Lab V2</title>
<style>body{font:16px system-ui,sans-serif;background:#131319;color:#f8f6fa;margin:auto;padding:1.4rem;max-width:1300px}img{display:block;width:100%;height:auto;object-fit:contain;background:#0b0b0c;margin:12px 0 22px;border:1px solid #555;border-radius:8px}h1,h2{color:#ffc5dc}section{padding:18px 0;border-top:1px solid #555}a{color:#9bd9ff}</style>
<h1>Connie · all 10 poses in one sprite sheet</h1>
<p>One real transparent sprite sheet with tightly packed irregular cells and an exact source frame map. Standing + run + wall impact + dash, with no frame-by-frame fit or invented timing.</p>
<p><a href="connie-unified-sprite-sheet.png" download>View / save complete transparent sprite sheet</a> · <a href="connie-unified-sprite-sheet.json">Atlas cells + scales (JSON)</a></p>
<img alt="Connie compact ten-frame unified sprite atlas with standing, run, wall-impact, and dash poses in three tightly packed rows" src="connie-unified-sprite-sheet.png">
<h2>Separate sequence comparisons (diagnostic only)</h2>
<p>GitHub source revision: '''+html.escape(revision)+'''</p>
<p>Calibrated facial anatomy determines whole-sequence scale. These static sheets preserve poses and do not invent animation timing.
Dash/pinwheel uses one recorded whole-sequence anatomical factor from its visible first frame. Its human approval remains pending. No original source art was changed or promoted.</p>
'''+ "\n".join(cards)+'''<p><a href="report.json">Measurement report (JSON)</a></p></html>'''
    (out/"index.html").write_text(page)
    print("CONNIE_V3_GITHUB_PREVIEW_OK=10")
    print("REVIEW_STATUS=QUARANTINED")
    print("REVIEW_ENTRY=index.html")
    print("SEQUENCE_FACTORS="+json.dumps({k:v["singleSequenceFactor"] for k,v in groups.items()}))


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--verify-manifest-only", action="store_true")
    p.add_argument("--output")
    p.add_argument("--revision",default="unspecified")
    args=p.parse_args()
    doc=source_authority()
    groups=scale_analysis(doc)
    if args.verify_manifest_only:
        print("CONNIE_V3_CLOUD_MANIFEST_OK=10")
        print("PRE_UPLOAD_FACTORS="+json.dumps({k:v["singleSequenceFactor"] for k,v in groups.items()}))
        return
    if not args.output:
        stop("output required for GitHub candidate generation")
    sources=verify_sources(doc)
    produce(doc,sources,groups,Path(args.output),args.revision)


if __name__=="__main__":
    try:
        main()
    except (OSError,TypeError,ValueError,KeyError) as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(2)
