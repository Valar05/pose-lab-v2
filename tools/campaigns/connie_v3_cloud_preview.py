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
    """Match whole-character physical BODY scale to the RUN, never to idle.

    These source-space shoulder/hip landmark selections are provisional.
    A single factor applies to each authored animation including transformed
    poses. Heads are independently reported as a ratio warning, not used as
    scale authority or silently changed.
    """
    import statistics
    calib = json.loads(
        (ROOT / "campaigns/connie-anatomical-v3-calibration-v1.json").read_text(encoding="utf-8"))
    if calib.get("schema") != "pose-lab-v3-anatomical-calibration-v1":
        stop("unexpected anatomical calibration schema")
    if calib["authority"]["originalGitRevision"] != "56f000831aecdde15fc3588effd93aa822ebdb79":
        stop("body landmarks not bound to canonical Connie source revision")
    if calib["canonical"] != "run" or calib["canonicalFrameAuthority"] != ["run_1","run_2","run_3"]:
        stop("RUN MUST BE THE CANONICAL CHARACTER SCALE")
    if calib["metric"] != "shoulder-to-hip-body-core-physical-distance":
        stop("body core rather than head envelope must determine scale")
    if set(calib["frames"]) != set(doc["frameOrder"]) or set(calib["groups"]) != set(ORDER):
        stop("calibration coverage or animation family mismatch")
    for role in ORDER:
        if calib["authority"]["sourceSHA256"][role] != doc["sources"][role]["sha256"]:
            stop("calibration PNG hash differs from original V3: "+role)

    def length(fid, kind):
        record=calib["frames"][fid]
        frame=doc["frames"][fid]
        if frame["source"] != record["source"]:
            stop("frame source changed: "+fid)
        keys=(("shoulderSourcePx","hipSourcePx") if kind=="body"
              else ("crownSourcePx","chinSourcePx"))
        points=[record.get(name) for name in keys]
        if any(p is None for p in points):
            return None
        x,y,w,h=frame["regionPx"]
        for point in points:
            if not isinstance(point,list) or len(point)!=2 or not (
                x<=point[0]<x+w and y<=point[1]<y+h):
                stop("invalid "+kind+" landmark outside source frame: "+fid)
        dist=math.dist(*points)
        if not math.isfinite(dist) or dist<10:
            stop("invalid "+kind+" anatomical span: "+fid)
        return dist

    canon_ids=calib["groups"]["run"]["measurementFrames"]
    if canon_ids != calib["canonicalFrameAuthority"]:
        stop("run measurement set cannot move away from canonical run")
    floor=calib["policy"]["confidenceFloor"]
    for fid in canon_ids:
        if calib["frames"][fid]["bodyCoreConfidence"] < floor:
            stop("canonical run body core unreliable: "+fid)
    run_target=statistics.median([length(fid,"body") for fid in canon_ids])
    if not 80<run_target<220:
        stop("run canonical body scale outside expected measured source envelope")
    run_face=statistics.median([length(fid,"head") for fid in canon_ids])
    result={}
    for role in ORDER:
        family=calib["groups"][role]
        ids=[fid for fid in doc["frameOrder"] if doc["frames"][fid]["source"]==role]
        reliable=family["measurementFrames"]
        if ids!=family["frames"] or not reliable or any(fid not in ids for fid in reliable):
            stop("group frames or calibration anchor invalid: "+role)
        measurements={}
        spans=[]
        for fid in ids:
            record=calib["frames"][fid]
            body=length(fid,"body")
            head=length(fid,"head")
            conf=record["bodyCoreConfidence"]
            if fid in reliable:
                if body is None or conf<floor:
                    stop("unreliable physical body-core size: "+fid)
                spans.append(body)
            measurements[fid]={
                "shoulderHipPx":round(body,4) if body is not None else None,
                "crownChinPx":round(head,4) if head is not None else None,
                "bodyConfidence":conf,
                "headConfidence":record["confidence"],
                "contributesToPhysicalScale":fid in reliable,
                "notes":record["note"]}
        measured_median=statistics.median(spans)
        factor=1.0 if role=="run" else run_target/measured_median
        body_error=max(abs((value*factor/run_target)-1) for value in spans)
        if body_error>calib["policy"]["maximumRelativeAnatomicalResidual"]:
            stop("body scale disagreement within "+role+": %.3f"%body_error)
        if role=="idle" and not (.25<factor<.65):
            stop("idle should shrink to run body size, not become reference")
        if role=="dash" and family["transformKind"]!="uniform-deliberate-transformation":
            stop("headless dash body scale must be inherited from body-visible frame")
        head_values=[length(fid,"head") for fid in reliable if length(fid,"head") is not None]
        head_after=statistics.median(head_values)*factor if head_values else None
        head_ratio=head_after/run_face if head_after is not None else None
        result[role]={
            "id":role,"label":LABELS[role],"frames":ids,
            "canonicalCharacterScale":"run",
            "physicalScaleMetric":"shoulder-to-hip-body-core",
            "anatomicalTargetPx":round(run_target,4),
            "medianReliableBodyCorePx":round(measured_median,4),
            "singleSequenceFactor":round(factor,8),
            "anatomicalMeasurement":measurements,
            "maximumAnatomicalResidual":round(body_error,6),
            "postScaledHeadToRunRatio":round(head_ratio,5) if head_ratio else None,
            "headProportionMismatchFlag":bool(head_ratio and abs(head_ratio-1)>.15),
            "status":("QUARANTINED run-reference body scale; dash artistic review required"
                     if role=="dash" else "QUARANTINED run-reference body-scale candidate"),
            "artisticReviewRequired":role=="dash",
            "scaleAuthority":"measured shoulder-to-hip body core relative to canonical RUN",
            "reasons":[family.get("exception","")] if family.get("exception") else [],
        }
    if result["run"]["singleSequenceFactor"]!=1.0:
        stop("run reference changed scale")
    print("CONNIE_RUN_CANONICAL_BODY_CORE_PX=%.4f"%run_target)
    print("CONNIE_RUN_REFERENCE_GROUP_SCALES="+json.dumps({
        k:g["singleSequenceFactor"] for k,g in result.items()},sort_keys=True))
    print("CONNIE_POST_SCALE_HEAD_RATIOS_DIAGNOSTIC_ONLY="+json.dumps({
        k:g["postScaledHeadToRunRatio"] for k,g in result.items()},sort_keys=True))
    return result


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


def make_anatomical_audit(doc, sources, groups, out):
    """One optical zoom, shoulders-to-hips, all ten frame slots."""
    calibration=json.loads(
        (ROOT/"campaigns/connie-anatomical-v3-calibration-v1.json").read_text())
    names=["idle","run_1","run_2","run_3","rebound_1",
           "rebound_2","rebound_3","dash_1","dash_2","dash_3"]
    tile_w,tile_h=350,380
    result=Image.new("RGB",(tile_w*5,tile_h*2),(20,20,26))
    pen=ImageDraw.Draw(result)
    for index,fid in enumerate(names):
        record=calibration["frames"][fid]
        factor=groups[record["source"]]["singleSequenceFactor"]
        tx,ty=(index%5)*tile_w,(index//5)*tile_h
        shoulder=record["shoulderSourcePx"]
        hip=record["hipSourcePx"]
        if shoulder is None or hip is None:
            pen.text((tx+10,ty+160),fid+": no visible anatomy",fill=(255,170,195))
            pen.text((tx+10,ty+183),"sequence-wide scale inherited",fill=(255,255,255))
            continue
        original,anchor=frame_art(doc,sources,fid)
        scaled=original.resize((max(1,round(original.width*factor)),
                                max(1,round(original.height*factor))),
                               Image.Resampling.LANCZOS) if factor!=1 else original
        sx,sy,sw,sh=doc["frames"][fid]["regionPx"]
        # Same foreground crop logic as the exporter; no per-card fit-to-box.
        original_rgba=alpha_artwork(sources[record["source"]].crop((sx,sy,sx+sw,sy+sh)),"black")
        bx,by,_,_=original_rgba.getchannel("A").getbbox()
        a=((shoulder[0]-sx-bx)*factor,(shoulder[1]-sy-by)*factor)
        b=((hip[0]-sx-bx)*factor,(hip[1]-sy-by)*factor)
        center=((a[0]+b[0])/2,(a[1]+b[1])/2)
        cx,cy=round(center[0]-158),round(center[1]-158)
        portrait=scaled.crop((cx,cy,cx+316,cy+316))
        panel=Image.new("RGBA",(316,316),(20,20,26,255))
        panel.alpha_composite(portrait)
        result.paste(panel.convert("RGB"),(tx+17,ty+24))
        x1,y1=tx+17+round(a[0]-cx),ty+24+round(a[1]-cy)
        x2,y2=tx+17+round(b[0]-cx),ty+24+round(b[1]-cy)
        pen.line([(x1,y1),(x2,y2)],fill=(70,240,105),width=3)
        for px,py in [(x1,y1),(x2,y2)]:
            pen.ellipse((px-4,py-4,px+4,py+4),fill=(252,232,72))
        body=math.dist(shoulder,hip)*factor
        head=math.dist(record["crownSourcePx"],record["chinSourcePx"])*factor if record.get("crownSourcePx") and record.get("chinSourcePx") else None
        pen.text((tx+8,ty+348),
                 "%s  body %.0f px  face %s"%(fid,body,("%.0f"%head if head is not None else "?")),
                 fill=(255,232,245))
        pen.text((tx+8,ty+364),"conf %.2f"%record["bodyCoreConfidence"],fill=(192,192,211))
    result.save(out/"connie-run-body-scale-audit.png")
    print("CONNIE_RUN_BODY_CORE_COMPARISON_CREATED=10")


def produce(doc, src, groups, out, revision):
    out.mkdir(parents=True, exist_ok=False)
    unified=build_atlas(doc,src,groups,out,revision,frame_art)
    make_anatomical_audit(doc,src,groups,out)
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
      "canonicalRunShoulderHipPx":groups["run"]["anatomicalTargetPx"],
      "measurementKind":"RUN physical reference; approximate original-source shoulder-to-hip body-core spans. Face lengths diagnostic only; no independent limb normalization.",
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
<h1>Connie · RUN scale is 1.0× · oversized IDLE resized</h1>
<p>The three run poses set the canonical character size. Idle is uniformly scaled DOWN; wall impact and dash are calibrated to the same physical body reference. All ten original poses share one sprite sheet, with no independent body-part edits or invented timing.</p>
<p><a href="connie-unified-sprite-sheet.png" download>View / save complete transparent sprite sheet</a> · <a href="connie-unified-sprite-sheet.json">Atlas cells + scales (JSON)</a></p>
<img alt="Connie compact ten-frame unified sprite atlas with standing, run, wall-impact, and dash poses in three tightly packed rows" src="connie-unified-sprite-sheet.png">
<h2>Physical BODY scale compared to canonical RUN</h2>
<p>The green segments measure shoulder-to-hip body-core spans at one optical pixel scale. Run is 1×. Idle shrinks to match run. Face measurements are shown independently as diagnostics, not silently forced to match.</p>
<p><a href="connie-run-body-scale-audit.png">Open the run-reference body-scale comparison</a></p>
<img alt="Connie body-core and face sizes at identical optical zoom, with run establishing size" src="connie-run-body-scale-audit.png">
<h2>Separate sequence comparisons (diagnostic only)</h2>
<p>GitHub source revision: '''+html.escape(revision)+'''</p>
<p>Run torso establishes physical scale; entire other animation sequences are uniformly resized. These static sheets preserve poses and do not invent animation timing.
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
