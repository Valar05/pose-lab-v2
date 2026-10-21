#!/usr/bin/env python3
"""Dense single-sheet atlas for Connie's original, SHA-locked ten poses.

Irregular cells have exact map coordinates; all authored art is transformed by
one uniform factor per animation. The layout changes only cell placement, not
pose pixels, shape, intended sequence scale, or movement timing.
"""
from __future__ import annotations

import hashlib
import json
import math

from PIL import Image

LAYOUT = (
    ("idle", "run_1", "run_2", "run_3"),
    ("rebound_1", "rebound_2", "rebound_3"),
    ("dash_1", "dash_2", "dash_3"),
)
PADDING = 18


def fail(message):
    raise ValueError("CONNIE_SINGLE_SHEET_STOP: " + message)


def build_atlas(doc, sources, groups, out, revision, frame_art):
    ids = [fid for row in LAYOUT for fid in row]
    if len(ids) != 10 or len(set(ids)) != 10 or set(ids) != set(doc["frameOrder"]):
        fail("sheet must include each of ten authored poses exactly once")

    scales = {"idle": 1.0, "run": groups["run"]["singleSequenceFactor"],
              "rebound": groups["rebound"]["singleSequenceFactor"], "dash": 1.0}
    if any(not isinstance(f, (float, int)) or not math.isfinite(f) or f <= 0
           for f in scales.values()):
        fail("missing or invalid sequence-uniform physical scale")

    frames = {}
    for fid in ids:
        entry = doc["frames"][fid]
        role = entry["source"]
        art, anchor = frame_art(doc, sources, fid)
        factor = scales[role]
        width = max(1, round(art.width * factor))
        height = max(1, round(art.height * factor))
        scaled_anchor = (round(anchor[0] * factor), round(anchor[1] * factor))
        frames[fid] = {"art": art, "source": entry, "role": role,
                       "scale": factor, "width": width, "height": height,
                       "anchor": scaled_anchor,
                       "opticalPivotType": ("head-envelope-comparison" if entry.get("head")
                                           else "silhouette-center-fallback")}

    # Pack rows tightly at their REAL pixel scale. Cells are deliberately
    # irregular because the full-body idle and crouched authored poses have
    # very different intrinsic silhouettes. Per-frame fit-to-box is forbidden.
    # Each row shares an optical head Y for preview only; no gameplay root pin.
    row_sizes = []
    for row in LAYOUT:
        top = max(frames[fid]["anchor"][1] for fid in row)
        bottom = max(frames[fid]["height"] - frames[fid]["anchor"][1] for fid in row)
        row_height = top + bottom + PADDING * 2
        row_width = sum(frames[fid]["width"] + PADDING * 2 for fid in row)
        row_sizes.append({"height": row_height, "width": row_width, "opticalY": top})
    sheet_w = max(row["width"] for row in row_sizes)
    sheet_h = sum(row["height"] for row in row_sizes)
    if sheet_w <= 0 or sheet_h <= 0:
        fail("invalid packed dimensions")

    atlas = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    records, y = [], 0
    for row_index, (row, dimensions) in enumerate(zip(LAYOUT, row_sizes)):
        # Shorter rows are centered horizontally as complete rows.
        x = (sheet_w - dimensions["width"]) // 2
        for column, fid in enumerate(row):
            item = frames[fid]
            cell_w = item["width"] + 2 * PADDING
            cell_h = dimensions["height"]
            local_x = PADDING
            local_y = PADDING + dimensions["opticalY"] - item["anchor"][1]
            if (local_y < PADDING or local_y + item["height"] > cell_h - PADDING):
                fail("packed cell would clip original detail: " + fid)
            resized = (item["art"].resize((item["width"], item["height"]),
                                         Image.Resampling.LANCZOS)
                       if item["scale"] != 1 else item["art"])
            atlas.alpha_composite(resized, (x + local_x, y + local_y))
            rec = item["source"]
            records.append({
                "id": fid, "sequence": item["role"],
                "sourceSha256": doc["sources"][item["role"]]["sha256"],
                "sourceCellPx": rec["regionPx"],
                "atlasCellPx": [x, y, cell_w, cell_h],
                "visibleRectInCellPx": [local_x, local_y,
                                        item["width"], item["height"]],
                "sequenceUniformScale": round(item["scale"], 8),
                "opticalPivotInCellPx": [local_x + item["anchor"][0],
                                        local_y + item["anchor"][1]],
                "opticalPivotType": item["opticalPivotType"],
                "groundAnchor": None, "durationMs": None,
                "artisticScaleApprovalRequired": item["role"] == "dash",
                "row": row_index, "column": column,
            })
            x += cell_w
        if x > sheet_w:
            fail("packed row exceeds atlas canvas")
        y += dimensions["height"]
    if len(records) != 10 or y != sheet_h:
        fail("packed source-frame count or height wrong")

    filename = "connie-unified-sprite-sheet.png"
    atlas.save(out / filename, optimize=False)
    original_area = 4608 * 4800
    compact_area = atlas.width * atlas.height
    if compact_area >= original_area * 0.75:
        fail("review atlas still has excessive unused canvas (must shrink >=25%)")
    metadata = {
        "schema": "pose-lab-v2-unified-atlas-candidate-v1",
        "status": "quarantined-human-visual-verdict-pending",
        "character": "Connie",
        "sourceCommit": revision,
        "sourceAuthority": "campaigns/connie-source-measurements-v3.json",
        "image": filename,
        "sha256": hashlib.sha256((out / filename).read_bytes()).hexdigest(),
        "canvasPx": [atlas.width, atlas.height],
        "layout": {"kind": "irregular-row-packed", "rowCount": len(LAYOUT),
                   "rowFrameIds": [list(row) for row in LAYOUT],
                   "rowHeightPx": [r["height"] for r in row_sizes],
                   "paddingPx": PADDING, "noPerFrameFit": True},
        "frameOrder": ids, "frameCount": len(records), "frames": records,
        "sequences": {"idle": ["idle"], "run": ["run_1", "run_2", "run_3"],
                      "wall-impact": ["rebound_1", "rebound_2", "rebound_3"],
                      "dash": ["dash_1", "dash_2", "dash_3"]},
        "uniformSequenceFactors": scales,
        "dashStatus": "UNAPPROVED physical scale; original 1.0x preserved",
        "registrationStatus": ("Row-comparison optical head pivot only; exact authored "
                               "gameplay foot/root registration not assumed"),
        "timeStatus": "No authored frame timing available; none manufactured",
        "noIntermediateFrames": True, "noLimbsAltered": True,
        "sourcesUnmodified": True, "gameReady": False,
        "atlasReadyForHumanReview": True,
        "previousCanvasPx": [4608, 4800],
        "canvasAreaReduction": round(1 - compact_area / original_area, 6),
    }
    (out / "connie-unified-sprite-sheet.json").write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("CONNIE_SINGLE_SHEET_EXPORTED=10")
    print("CONNIE_SINGLE_SHEET_PACKED_ROWS=3")
    print("CONNIE_SINGLE_SHEET_SIZE=%dx%d" % atlas.size)
    print("CONNIE_SINGLE_SHEET_AREA_SAVED=%.2f%%" %
          (100 * metadata["canvasAreaReduction"]))
    print("CONNIE_SINGLE_SHEET_SHA256=" + metadata["sha256"])
    return metadata
