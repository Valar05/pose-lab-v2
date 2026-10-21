#!/usr/bin/env python3
"""Pose Lab V2 deterministic, landmark-calibrated sprite scale normalization.

Anatomical landmarks are *inputs*, never inferred from bounding boxes.
The analysis is inspectable and fail-closed. Outputs are quarantined until
an exact analysis digest receives an explicit saved human approval.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
from pathlib import Path

from PIL import Image, ImageChops

SCHEMA = "pose-lab-sprite-calibration-v1"
REPORT_SCHEMA = "pose-lab-sprite-measurements-v1"
APPROVAL_SCHEMA = "pose-lab-sprite-normalization-approval-v1"
VIEWER_SCHEMA = "pose-lab-v2-2d-animation-set-v1"
LANDMARKS = ("crown", "chin", "shoulder", "hip", "knee", "ankle", "foot")


def canonical_json(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fail(message):
    raise ValueError("SPRITE_NORMALIZATION_STOP: " + message)


def locate(root, rel):
    if not isinstance(rel, str) or not rel:
        fail("source path must be a nonempty repository-relative string")
    path = (root / rel).resolve()
    if not path.is_relative_to(root.resolve()):
        fail("source path escapes repository root: " + rel)
    return path


def read_image(root, frame):
    path = locate(root, frame["file"])
    if not path.is_file():
        fail("canonical asset unavailable: " + str(frame["file"]))
    raw = path.read_bytes()
    expected = frame.get("sha256")
    if not isinstance(expected, str) or len(expected) != 64 or digest(raw) != expected:
        fail("source SHA-256 mismatch or absent: " + frame["file"])
    with Image.open(path) as opened:
        if opened.format != "PNG":
            fail("source must be PNG: " + frame["file"])
        image = opened.copy()
    cell = frame.get("cell")
    if not (isinstance(cell, list) and len(cell) == 4 and all(type(n) is int for n in cell)):
        fail("explicit [x,y,width,height] source cell required")
    x, y, w, h = cell
    if min(x, y) < 0 or min(w, h) < 1 or x + w > image.width or y + h > image.height:
        fail("source cell outside canvas: " + frame["file"])
    return image, (x, y, w, h)


def alpha_artwork(image, background):
    """Preserves all pixels, including disconnected petals, inside an explicit cell.

    For opaque black mattes this uses Connie's established dark-pixel unmatting
    threshold. No connected-component filter discards legitimate fragments.
    """
    if background == "alpha":
        return image.convert("RGBA")
    if background != "black":
        fail("background must be alpha or black; manual masks need preprepared alpha assets")
    rgb = image.convert("RGB")
    output = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    src, dst = rgb.load(), output.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src[x, y]
            lum = max(r, g, b)
            if lum <= 2:
                continue
            if lum < 24:
                a = min(255, round(255 * (lum - 2) / 22))
                if a:
                    dst[x, y] = (min(255, round(r * 255 / a)),
                                 min(255, round(g * 255 / a)),
                                 min(255, round(b * 255 / a)), a)
            else:
                dst[x, y] = (r, g, b, 255)
    return output


def distance(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def metric_of(record):
    points = record.get("landmarks", {})
    if not isinstance(points, dict):
        fail("landmarks must be a coordinate map")
    for name, pt in points.items():
        if name not in LANDMARKS or not (isinstance(pt, list) and len(pt) == 2
                                          and all(isinstance(n, (int, float)) and
                                                  not isinstance(n, bool) and math.isfinite(n) for n in pt)):
            fail("invalid anatomical landmark: " + str(name))
    metric = record.get("metric", "head")
    pairs = {"head": ("crown", "chin"), "torso": ("shoulder", "hip")}
    if metric not in pairs:
        fail("metric must be head or torso")
    a, b = pairs[metric]
    if a not in points or b not in points:
        return metric, None
    value = distance(points[a], points[b])
    if value <= 1:
        fail("degenerate anatomical measurement")
    return metric, round(value, 6)


def inspect(root, record, background):
    image, (x, y, w, h) = read_image(root, record)
    art = alpha_artwork(image.crop((x, y, x + w, y + h)), background)
    box = art.getchannel("A").getbbox()
    if box is None:
        fail("blank source cell: " + record["file"])
    metric, value = metric_of(record)
    points = record.get("landmarks", {})
    for name, (px, py) in points.items():
        if not (x <= px < x + w and y <= py < y + h):
            fail("landmark outside cell: " + name)
    conf = record.get("confidence")
    if not isinstance(conf, (int, float)) or not (0 <= conf <= 1):
        fail("every frame requires a recorded confidence from 0 to 1")
    anchor = record.get("anchor")
    if not (isinstance(anchor, list) and len(anchor) == 2 and
            all(isinstance(n, (int, float)) and math.isfinite(n) for n in anchor)):
        fail("explicit anatomical frame anchor required")
    if not (x <= anchor[0] < x + w and y <= anchor[1] < y + h):
        fail("anchor outside cell")
    return {
        "name": record["name"], "file": record["file"], "sha256": record["sha256"],
        "canvasPx": list(image.size), "cellPx": [x, y, w, h],
        "visibleBoundsCellPx": list(box),
        "visibleBoundsSourcePx": [box[0] + x, box[1] + y, box[2] + x, box[3] + y],
        "landmarksSourcePx": points, "metric": metric, "measurementPx": value,
        "confidence": conf, "pose": record.get("pose", "unspecified"),
        "facing": record.get("facing", "unspecified"), "anchorSourcePx": anchor,
        "anchorLabel": record.get("anchorLabel", "unspecified"),
        "durationMs": record.get("durationMs", 100),
        "inheritMeasurementFrom": record.get("inheritMeasurementFrom"),
    }


def analyze(config, root):
    if config.get("schema") != SCHEMA:
        fail("invalid calibration schema")
    opts = config.get("measurement", {})
    bg = opts.get("background", "alpha")
    min_conf = opts.get("minimumConfidence", 0.8)
    max_spread = opts.get("maximumSequenceSpread", 0.08)
    if not (0 < min_conf <= 1 and 0 <= max_spread <= 0.5):
        fail("invalid confidence/spread policy")
    reference = inspect(root, config["canonical"], bg)
    reference_metrics = {}
    for kind in ("head", "torso"):
        metric, value = metric_of({**config["canonical"], "metric": kind})
        if value is not None:
            reference_metrics[metric] = value
    if reference["confidence"] < min_conf or not reference_metrics:
        fail("canonical anatomical landmarks not reliable")
    if not config.get("sequences"):
        fail("at least one sequence required")
    result = {"schema": REPORT_SCHEMA, "character": config.get("character", "Unnamed"),
              "configSha256": digest(canonical_json(config).encode("utf-8")),
              "measurement": {"background": bg, "minimumConfidence": min_conf,
                              "maximumSequenceSpread": max_spread},
              "canonical": {**reference, "metricsPx": reference_metrics},
              "sequences": [], "blocked": False}
    known_groups = {}
    for group in config["sequences"]:
        group_id = group["id"]
        if group_id in known_groups:
            fail("duplicate sequence: " + group_id)
        if not group.get("frames"):
            fail("empty sequence: " + group_id)
        measured = [inspect(root, frame, bg) for frame in group["frames"]]
        names = [r["name"] for r in measured]
        if len(names) != len(set(names)):
            fail("duplicate frame identity in " + group_id)
        if len({m["anchorLabel"] for m in measured}) != 1:
            fail("inconsistent anatomical anchor labels: " + group_id)
        if any(type(m["durationMs"]) is not int or m["durationMs"] < 1 for m in measured):
            fail("invalid frame duration: " + group_id)
        ratios = []
        exceptions = []
        for m in measured:
            ref = reference_metrics.get(m["metric"])
            if ref is None:
                exceptions.append(m["name"] + ": canonical " + m["metric"] + " missing")
            elif m["measurementPx"] is None:
                if m["inheritMeasurementFrom"] not in names or names.index(m["inheritMeasurementFrom"]) >= names.index(m["name"]):
                    exceptions.append(m["name"] + ": missing anatomy requires earlier explicit inheritance")
            elif m["confidence"] < min_conf:
                exceptions.append(m["name"] + ": low-confidence landmark measurement")
            else:
                m["scaleRatioToCanonical"] = round(ref / m["measurementPx"], 8)
                ratios.append(m["scaleRatioToCanonical"])
        relation = group.get("transformation")
        override = group.get("artisticException")
        if relation is not None:
            source_group = known_groups.get(relation.get("scaleFromSequence"))
            if not source_group or not isinstance(relation.get("relativeScale"), (int, float)) or not relation.get("reason"):
                fail("transformation needs prior sequence, relativeScale, and reason")
            factor = source_group["scaleFactor"] * relation["relativeScale"] if source_group["scaleFactor"] else None
        elif override is not None:
            if not isinstance(override.get("scaleFactor"), (int, float)) or not override.get("reason"):
                fail("artistic exception requires factor and reason")
            factor = override["scaleFactor"]
        else:
            factor = statistics.median(ratios) if ratios else None
        spread = max((abs(r / factor - 1) for r in ratios), default=0) if factor else None
        if factor is not None and (not math.isfinite(factor) or factor <= 0):
            fail("nonpositive/nonfinite scaling: " + group_id)
        if len(ratios) == 0 and relation is None and override is None:
            exceptions.append("no trustworthy anatomical scale measurements")
        if spread is not None and spread > max_spread and not (relation or override):
            exceptions.append("intra-sequence scale discrepancy exceeds policy")
        status = "blocked" if exceptions else "review-candidate"
        result["blocked"] |= status == "blocked"
        entry = {"id": group_id, "status": status,
                 "scaleFactor": round(factor, 8) if factor is not None else None,
                 "ratioSpread": round(spread, 6) if spread is not None else None,
                 "artisticException": override, "transformation": relation,
                 "issues": exceptions, "frames": measured}
        known_groups[group_id] = entry
        result["sequences"].append(entry)
    return result


def render(config, report, root, out, approval=None):
    remeasured = analyze(config, root)
    if canonical_json(remeasured) != canonical_json(report):
        fail("saved report differs from current source/config measurement")
    if report["blocked"]:
        fail("anatomical measurement blocked; correct calibration instead of guessing")
    if approval is not None:
        if (approval.get("schema") != APPROVAL_SCHEMA or
            approval.get("verdict") != "approved" or
            approval.get("analysisSha256") != digest(canonical_json(report).encode("utf-8")) or
            sorted(approval.get("approvedSequences", [])) != sorted(g["id"] for g in report["sequences"])):
            fail("human approval does not match exact analysis")
    out = out.resolve()
    if out == root.resolve() or root.resolve() in out.parents and "source" in out.parts:
        fail("refusing to render over a source directory")
    if out.exists() and any(out.iterdir()):
        fail("output must be a fresh empty directory; never overwrite existing assets")
    if out.is_relative_to(root):
        originals = [locate(root, r["file"]) for r in [config["canonical"]] +
                     [f for g in config["sequences"] for f in g["frames"]]]
        if any(p == out or out in p.parents for p in originals):
            fail("output overlaps canonical source files")
    out.mkdir(parents=True, exist_ok=True)
    bg = report["measurement"]["background"]
    prepared = []
    extents = [0, 0, 0, 0]
    for gconf, group in zip(config["sequences"], report["sequences"]):
        for source, frame in zip(gconf["frames"], group["frames"]):
            image, (sx, sy, w, h) = read_image(root, source)
            art = alpha_artwork(image.crop((sx, sy, sx + w, sy + h)), bg)
            left, top, right, bottom = art.getchannel("A").getbbox()
            art = art.crop((left, top, right, bottom))
            anchor = (frame["anchorSourcePx"][0] - sx - left,
                      frame["anchorSourcePx"][1] - sy - top)
            factor = group["scaleFactor"]
            prepared.append((group["id"], frame, art, anchor, factor))
            for use_factor in (1.0, factor):
                scaled_w = max(1, round(art.width * use_factor))
                scaled_h = max(1, round(art.height * use_factor))
                xa, ya = round(anchor[0] * use_factor), round(anchor[1] * use_factor)
                extents[0] = max(extents[0], xa)
                extents[1] = max(extents[1], scaled_w - xa)
                extents[2] = max(extents[2], ya)
                extents[3] = max(extents[3], scaled_h - ya)
    padding = int(config.get("outputPaddingPx", 16))
    if not 0 <= padding <= 128:
        fail("invalid output padding")
    anchor_x, anchor_y = padding + extents[0], padding + extents[2]
    canvas_size = (sum(extents[:2]) + padding * 2, sum(extents[2:]) + padding * 2)
    manifest = {"schema": VIEWER_SCHEMA, "character": report["character"],
                "defaultAnimation": report["sequences"][0]["id"],
                "frameSpace": {"width": canvas_size[0], "height": canvas_size[1],
                               "colorMode": "RGBA", "background": "transparent",
                               "facing": "calibrated", "camera": "fixed"},
                "normalization": {"status": "human-approved" if approval else "quarantined",
                                   "analysisSha256": digest(canonical_json(report).encode("utf-8")),
                                   "sourcePreservation": "read-only SHA-verified input assets"},
                "animations": []}
    render_records = []
    for group in report["sequences"]:
        group_prepared = [p for p in prepared if p[0] == group["id"]]
        frames, comparisons, full_contact = [], [], Image.new("RGBA", (canvas_size[0] * len(group_prepared), canvas_size[1] * 2))
        for index, (_, frame, original, anchor, factor) in enumerate(group_prepared):
            row = []
            for label, scale in (("before", 1.0), ("after", factor)):
                w = max(1, round(original.width * scale))
                h = max(1, round(original.height * scale))
                art = original.resize((w, h), Image.Resampling.LANCZOS) if scale != 1 else original
                x = anchor_x - round(anchor[0] * scale)
                y = anchor_y - round(anchor[1] * scale)
                if min(x, y) < 0 or x + w > canvas_size[0] or y + h > canvas_size[1]:
                    fail("artwork would be clipped: " + frame["name"])
                image = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
                image.alpha_composite(art, (x, y))
                rel = f"{group['id']}/{label}/{index:03d}.png"
                (out / group["id"] / label).mkdir(parents=True, exist_ok=True)
                image.save(out / rel, optimize=False)
                row.append({"src": rel, "durationMs": frame["durationMs"],
                            "sha256": digest((out / rel).read_bytes()), "sourceFrame": index})
                full_contact.alpha_composite(image, (canvas_size[0] * index, canvas_size[1] * (label == "after")))
                if label == "after":
                    render_records.append({"sequence": group["id"], "frame": frame["name"],
                                           "scale": factor,
                                           "anchorCanvasPx": [anchor_x, anchor_y],
                                           "registrationOffsetPx": [x, y],
                                           "visibleSizePx": [w, h]})
            comparisons.append(row[0])
            frames.append(row[1])
        contact_path = f"{group['id']}/contact-sheet.png"
        full_contact.save(out / contact_path, optimize=False)
        manifest["animations"].append({
            "id": group["id"], "label": group["id"].replace("-", " ").title(),
            "loop": True, "contactSheet": contact_path,
            "groundGuideY": anchor_y,
            "primaryLabel": "Uniform anatomy-calibrated candidate",
            "contract": [f"scale {group['scaleFactor']:.6f}", "one factor per sequence",
                         "no redraws", "human visual verdict required"],
            "frames": frames,
            "comparison": {"label": "Original source pixels", "synchronized": True,
                           "frames": comparisons},
        })
    (out / "animations.json").write_text(canonical_json(manifest), encoding="utf-8")
    (out / "render-receipt.json").write_text(canonical_json({
        "schema": "pose-lab-sprite-normalization-render-v1",
        "status": "human-approved" if approval else "quarantined",
        "analysisSha256": manifest["normalization"]["analysisSha256"],
        "configSha256": report["configSha256"],
        "frameSpace": canvas_size, "registration": render_records,
        "manifestSha256": digest((out / "animations.json").read_bytes()),
    }), encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["analyze", "preview", "apply"])
    parser.add_argument("--config", required=True)
    parser.add_argument("--root", default=".")
    parser.add_argument("--report", required=True)
    parser.add_argument("--output")
    parser.add_argument("--approval")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    computed = analyze(config, root)
    if args.action == "analyze":
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(canonical_json(computed), encoding="utf-8")
        print("ANALYSIS_SHA256=" + digest(canonical_json(computed).encode("utf-8")))
        print("BLOCKED=" + str(computed["blocked"]))
        return
    existing = json.loads(Path(args.report).read_text(encoding="utf-8"))
    if args.action == "apply" and not args.approval:
        fail("apply requires saved explicit human approval")
    if not args.output:
        fail("preview/apply require --output")
    approval = json.loads(Path(args.approval).read_text(encoding="utf-8")) if args.approval else None
    if args.action == "preview" and approval is not None:
        fail("preview may not claim approved state")
    manifest = render(config, existing, root, Path(args.output), approval)
    print("NORMALIZATION=" + manifest["normalization"]["status"])
    print("REVIEW_MANIFEST=" + str(Path(args.output) / "animations.json"))


if __name__ == "__main__":
    main()
