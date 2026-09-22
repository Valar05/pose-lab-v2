#!/usr/bin/env python3
"""Focused regression checks for Crimson frame-zero evidence stitching."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image

from stitch_crimson_vanguard_attack1_compare import (
    comparison_evidence,
    overall_evidence_status,
    paired_comparison_evidence,
    tile_caption,
)


def assert_equal(actual, expected, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def main() -> None:
    clean_frame = {"label": "start", "failures": [], "image": "current.png"}
    assert_equal(
        overall_evidence_status({"status": "FAIL", "frames": [clean_frame]})[0],
        "FAIL",
        "manifest red overrides clean frame",
    )
    assert_equal(
        overall_evidence_status({"status": "PASS", "authorFailures": [{"code": "AUTHOR_RED"}], "frames": [clean_frame]})[0],
        "FAIL",
        "author failure overrides manifest pass",
    )
    assert_equal(
        overall_evidence_status({
            "status": "PASS",
            "candidateParity": {"status": "PASS", "exactFramePayloadMatch": False},
            "frames": [clean_frame],
        })[0],
        "FAIL",
        "inexact parity overrides local pass",
    )
    assert_equal(
        overall_evidence_status({"status": "PASS", "frames": [clean_frame]})[0],
        "PASS",
        "legacy manifest without candidate parity remains supported",
    )
    assert_equal(
        overall_evidence_status({
            "status": "PASS",
            "candidate": "crimson-combat-ready-vanguard-frame0-4",
            "frames": [clean_frame],
        })[0],
        "FAIL",
        "frame-zero cannot pass with missing parity and paired evidence",
    )
    assert_equal(
        overall_evidence_status({
            "status": "PASS",
            "candidate": "crimson-combat-ready-vanguard-frame0-4",
            "candidateParity": {
                "status": "PASS",
                "exactFramePayloadMatch": True,
                "authoredGlbShaMatch": True,
                "committedStatusMatch": True,
                "committedAuthorEligibleBeforeCandidateParity": True,
            },
            "authoredFrameZero": {"exactAuthoredGlb": True},
            "authorReport": {"protectedBodyParity": {"status": "PASS"}},
            "emptyHandedArmCheckpoint": {"image": "checkpoint.png"},
            "frames": [{
                "label": "start",
                "failures": [],
                "baselineComparison": {"views": ["front"]},
                "rejectedBaselineViews": [{"view": "front", "image": "rejected.png"}],
                "currentViews": [{"view": "front", "image": "current.png"}],
            }],
        })[0],
        "PASS",
        "complete frame-zero contract can pass",
    )
    if tile_caption("REJECTED BASELINE / front", "PASS")[0].endswith("PASS"):
        raise AssertionError("rejected evidence tile must never be stamped PASS")

    discovered = comparison_evidence({
        "rejectedBaselineViews": [{"view": "front", "image": "rejected-front.png"}],
        "oldVsNewViews": {
            "current": [{"view": "front", "image": "current-front.png"}],
        },
        "frames": [{"crimsonViews": [{"view": "side", "image": "preserved-elsewhere.png"}]}],
    })
    assert_equal(
        discovered,
        [
            ("REJECTED BASELINE", "front", "rejected-front.png"),
            ("CURRENT", "front", "current-front.png"),
        ],
        "old-vs-new view discovery",
    )
    assert_equal(
        paired_comparison_evidence({
            "frames": [{
                "label": "start",
                "baselineComparison": {"views": ["front", "profile"]},
                "currentViews": [
                    {"view": "front", "image": "current-front.png"},
                    {"view": "profile", "image": "current-profile.png"},
                ],
                "rejectedBaselineViews": [
                    {"view": "front", "image": "rejected-front.png"},
                    {"view": "profile", "image": "rejected-profile.png"},
                ],
            }],
        }),
        [
            ("REJECTED BASELINE", "start / front", "rejected-front.png"),
            ("CURRENT", "start / front", "current-front.png"),
            ("REJECTED BASELINE", "start / profile", "rejected-profile.png"),
            ("CURRENT", "start / profile", "current-profile.png"),
        ],
        "same-camera old/new pairing order",
    )

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        image_names = ["rejected.png", "current.png", "checkpoint.png", "shared.png", "reference.png"]
        for index, name in enumerate(image_names):
            Image.new("RGB", (32, 24), (40 + index * 20, 50, 60)).save(root / name)
        manifest_path = root / "manifest.json"
        manifest_path.write_text(json.dumps({
            "status": "FAIL",
            "authorFailures": [{"code": "AUTHOR_COMMITTED_CANDIDATE_PARITY_MISMATCH"}],
            "candidateParity": {"status": "FAIL", "exactFramePayloadMatch": False},
            "emptyHandedArmCheckpoint": {"image": "checkpoint.png"},
            "frames": [{
                "label": "start",
                "failures": [],
                "image": "shared.png",
                "referenceViews": [{"view": "front", "image": "reference.png"}],
                "currentViews": [{"view": "front", "image": "current.png"}],
                "rejectedBaselineViews": [{"view": "front", "image": "rejected.png"}],
                "crimsonViews": [{"view": "front", "image": "current.png"}],
            }],
        }), encoding="utf-8")
        completed = subprocess.run(
            [sys.executable, str(Path(__file__).with_name("stitch_crimson_vanguard_attack1_compare.py")), "--manifest", str(manifest_path)],
            check=False,
            capture_output=True,
            text=True,
        )
        stitched = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert_equal(stitched["contactSheetStatus"], "FAIL", "synthetic red manifest sheet status")
        assert_equal(set(stitched["contactSheetImages"]), set(image_names), "synthetic evidence inclusion and dedupe")
        if '"ok": false' not in completed.stdout or '"status": "FAIL"' not in completed.stdout:
            raise AssertionError(f"red stitch stdout must stay red: {completed.stdout}")
        if completed.returncode == 0:
            raise AssertionError("red stitch process must exit nonzero")
        if not (root / stitched["contactSheet"]).exists():
            raise AssertionError("synthetic contact sheet was not created")

    print({"ok": True, "checks": 11})


if __name__ == "__main__":
    main()
