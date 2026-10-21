#!/usr/bin/env python3
"""GitHub-owned Connie V3 source review with sequence-uniform candidate scaling.

Uses the original V3 measured head envelopes. Renders *quarantined static*
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


def head_height(frame):
    return frame.get("head", {}).get("heightPx")


def scale_analysis(doc):
    ref = doc["frames"]["idle"]
    h = head_height(ref)
    if not h or h <= 0:
        stop("no standing head measurement")
    groups = {}
    for role in ORDER:
        ids = [fid for fid in doc["frameOrder"] if doc["frames"][fid]["source"] == role]
        measured = [head_height(doc["frames"][i]) for i in ids if head_height(doc["frames"][i])]
        ordered = sorted(measured)
        median = ((ordered[len(ordered)//2] if len(ordered) % 2 else
                   (ordered[len(ordered)//2-1] + ordered[len(ordered)//2]) / 2)
                  if ordered else None)
        factor = h / median if median else None
        spread = max((abs(v / median - 1) for v in measured), default=0) if median else None
        blocked = role == "dash" or median is None or spread > .08
        groups[role] = {
            "id": role, "label": LABELS[role], "frames": ids,
            "observedHeadEnvelopePx": measured,
            "medianHeadEnvelopePx": median,
            "singleSequenceFactor": round(factor, 8) if factor else None,
            "maximumHeadEnvelopeDeviation": round(spread, 5) if spread is not None else None,
            "status": "BLOCKED manual artistic review" if blocked else "QUARANTINED uniform preview",
            "reasons": (["Deliberate shape transformation and headless frame",
                         "Headless pinwheel cannot be assigned reliable anatomical scale"]
                        if blocked and role == "dash" else []),
        }
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
      "canonicalHeadEnvelopePx":270,
      "measurementKind":"V3 manually recorded head bounding envelope; NOT anatomical crown-to-chin ground truth",
      "originalSHA256":{k:doc["sources"][k]["sha256"] for k in ORDER},
      "groups":entries,
      "noInventedTiming":True,
      "pinwheelBlocked":True,
      "gameReady":False,
      "sourceImagesUnchanged":True,
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
<h1>Connie · quarantined deterministic scale candidates</h1>
<p>GitHub source revision: '''+html.escape(revision)+'''</p>
<p>Head-envelope measurements are a proxy. These static sheets preserve poses and do not invent animation timing.
Dash / pinwheel is blocked. No original source art was changed or promoted.</p>
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
