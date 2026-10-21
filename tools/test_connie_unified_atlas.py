#!/usr/bin/env python3
"""Remote CI: one dense real-source Connie atlas, exact cell map and pixels."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent / "campaigns"))
from connie_v3_cloud_preview import (
    source_authority, scale_analysis, frame_art, produce, verify_sources
)
from connie_unified_atlas import LAYOUT

ROOT = Path(__file__).resolve().parents[1]


def assert_atlas(out, doc, groups, sources):
    meta = json.loads((out / "connie-unified-sprite-sheet.json").read_text())
    png = out / "connie-unified-sprite-sheet.png"
    assert meta["sha256"] == hashlib.sha256(png.read_bytes()).hexdigest()
    assert meta["schema"] == "pose-lab-v2-unified-atlas-candidate-v1"
    assert meta["status"].startswith("quarantined")
    assert meta["gameReady"] is False
    assert meta["frameCount"] == len(meta["frames"]) == 10
    ids = [fid for row in LAYOUT for fid in row]
    assert meta["frameOrder"] == ids
    assert set(ids) == set(doc["frameOrder"])
    assert meta["uniformSequenceFactors"]["dash"] == groups["dash"]["singleSequenceFactor"]
    assert 0 < meta["uniformSequenceFactors"]["dash"] and meta["uniformSequenceFactors"]["dash"] != 1.0
    assert meta["uniformSequenceFactors"]["run"] == groups["run"]["singleSequenceFactor"] == 1.0
    assert .25 < meta["uniformSequenceFactors"]["idle"] < .60
    assert meta["uniformSequenceFactors"]["idle"] == groups["idle"]["singleSequenceFactor"]
    assert meta["uniformSequenceFactors"]["rebound"] == groups["rebound"]["singleSequenceFactor"]
    assert meta["layout"]["kind"] == "irregular-row-packed"
    assert meta["layout"]["rowCount"] == len(LAYOUT) == 3
    assert meta["layout"]["rowFrameIds"] == [list(row) for row in LAYOUT]
    assert meta["layout"]["noPerFrameFit"] is True
    assert meta["canvasAreaReduction"] >= .25
    with Image.open(png) as im:
        atlas = im.convert("RGBA")
    assert list(atlas.size) == meta["canvasPx"]
    assert atlas.width * atlas.height < 4608 * 4800 * .75
    assert atlas.getchannel("A").getextrema()[0] == 0

    occupied = set()
    bounds = {}
    for rec in meta["frames"]:
        x, y, cw, ch = rec["atlasCellPx"]
        assert 0 <= x < x + cw <= atlas.width
        assert 0 <= y < y + ch <= atlas.height
        row_index = rec["row"]
        assert ch == meta["layout"]["rowHeightPx"][row_index]
        assert rec["id"] == LAYOUT[row_index][rec["column"]]
        assert (x, y) not in occupied
        occupied.add((x, y))
        for previous_id, (px, py, pw, ph) in bounds.items():
            assert x + cw <= px or px + pw <= x or y + ch <= py or py + ph <= y, (
                rec["id"], "overlaps", previous_id)
        bounds[rec["id"]] = (x, y, cw, ch)
        left, top, w, h = rec["visibleRectInCellPx"]
        assert 0 <= left < left + w <= cw and 0 <= top < top + h <= ch
        assert rec["sourceSha256"] == doc["sources"][rec["sequence"]]["sha256"]
        assert rec["sourceCellPx"] == doc["frames"][rec["id"]]["regionPx"]
        assert rec["durationMs"] is None and rec["groundAnchor"] is None
        assert rec["sequenceUniformScale"] == meta["uniformSequenceFactors"][rec["sequence"]]
        assert rec["artisticScaleApprovalRequired"] is (rec["sequence"] == "dash")

        # Compare exact composite output with the original authored pixels,
        # scaled ONCE according to its animation sequence and translated.
        art, _ = frame_art(doc, sources, rec["id"])
        scaled = (art.resize((w, h), Image.Resampling.LANCZOS)
                  if rec["sequenceUniformScale"] != 1.0 else art)
        assert scaled.size == (w, h)
        expected = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        expected.alpha_composite(scaled, (left, top))
        cell = atlas.crop((x, y, x+cw, y+ch))
        assert cell.tobytes() == expected.tobytes(), rec["id"] + ": pixels changed or clipped"

    row_origin = 0
    for row_index, row in enumerate(LAYOUT):
        y_positions = {bounds[fid][1] for fid in row}
        assert y_positions == {row_origin}
        heights = {bounds[fid][3] for fid in row}
        assert heights == {meta["layout"]["rowHeightPx"][row_index]}
        cells = [bounds[fid] for fid in row]
        for left, right in zip(cells, cells[1:]):
            assert left[0]+left[2] == right[0], "row is not tightly packed"
        row_origin += meta["layout"]["rowHeightPx"][row_index]
    assert row_origin == atlas.height
    report = json.loads((out / "report.json").read_text())
    assert report["singleSpriteSheetFrameCount"] == 10
    assert report["singleSpriteSheetSha256"] == meta["sha256"]
    assert "connie-unified-sprite-sheet.png" in (out / "index.html").read_text()
    proof=out/"connie-run-body-scale-audit.png"
    assert proof.is_file()
    with Image.open(proof) as diagnostic:
        assert diagnostic.size == (1750,760)
        diagnostic.verify()
    assert 'src="connie-run-body-scale-audit.png"' in (out/"index.html").read_text()
    assert 'src="connie-anatomical-head-audit.png"' not in (out/"index.html").read_text()
    print("CONNIE_UNIFIED_ATLAS_CELLS_OK=10")
    print("CONNIE_UNIFIED_ATLAS_PIXEL_EQUIVALENCE_OK=10")
    print("CONNIE_UNIFIED_ATLAS_AREA_REDUCTION=%.2f%%" %
          (100 * meta["canvasAreaReduction"]))
    print("CONNIE_UNIFIED_ATLAS_SHA256=" + meta["sha256"])


def synth(doc):
    sources = {}
    for role, details in doc["sources"].items():
        w, h = details["dimensionsPx"]
        im = Image.new("RGB", (w, h), "black")
        draw = ImageDraw.Draw(im)
        for rec in doc["frames"].values():
            if rec["source"] != role:
                continue
            x, y, cw, ch = rec["regionPx"]
            draw.rectangle((x+40, y+40, x+cw-55, y+ch-50), fill=(249, 176, 191))
            draw.rectangle((x+80, y+60, x+cw-100, y+ch-65), fill=(35, 20, 40))
        sources[role] = im
    return sources


def run(doc, sources, tag):
    with tempfile.TemporaryDirectory() as directory:
        home = Path(directory)
        before = {k: hashlib.sha256(v.tobytes()).hexdigest()
                  for k, v in sources.items()}
        generated = []
        for suffix in ("a", "b"):
            out = home / suffix
            produce(doc, sources, scale_analysis(doc), out, tag)
            assert_atlas(out, doc, scale_analysis(doc), sources)
            generated.append(out)
        for file in generated[0].rglob("*"):
            if file.is_file():
                peer = generated[1] / file.relative_to(generated[0])
                assert peer.is_file() and file.read_bytes() == peer.read_bytes()
        assert before == {k: hashlib.sha256(v.tobytes()).hexdigest()
                          for k, v in sources.items()}
        print("CONNIE_UNIFIED_ATLAS_DETERMINISM_OK=2")


if __name__ == "__main__":
    doc = source_authority()
    run(doc, synth(doc), "test-synthetic")
    if len(sys.argv) > 1 and sys.argv[1] == "--real":
        run(doc, verify_sources(doc), "source-verified")
        print("CONNIE_UNIFIED_ATLAS_REAL_SOURCE_OK=4")
    else:
        print("CONNIE_UNIFIED_ATLAS_SYNTHETIC_ONLY=TRUE")
