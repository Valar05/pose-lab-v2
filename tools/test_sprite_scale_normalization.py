#!/usr/bin/env python3
"""Regression tests for Pose Lab V2's reusable, source-locked scale core."""
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from sprite_scale_normalization import (
    analyze, canonical_json, digest, fail, render, SCHEMA, APPROVAL_SCHEMA,
)


class ScaleNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "sources").mkdir()
        def art(name, size, extra=False):
            image = Image.new("RGB", size, "black")
            pen = ImageDraw.Draw(image)
            pen.rectangle((20, 10, 35, 60), fill=(255, 210, 190))
            if extra:
                pen.rectangle((size[0] - 5, 4, size[0] - 2, 7), fill=(255, 80, 110))
            path = self.root / "sources" / name
            image.save(path)
            return {"file": "sources/" + name, "sha256": digest(path.read_bytes()),
                    "cell": [0, 0, size[0], size[1]], "confidence": 0.95,
                    "landmarks": {"crown": [25, 10], "chin": [25, 30],
                                  "shoulder": [24, 33], "hip": [26, 52],
                                  "knee": [26, 58], "ankle": [27, 60], "foot": [28, 61]},
                    "anchor": [28, 61], "anchorLabel": "rear-foot",
                    "pose": "running", "facing": "screen-right", "metric": "head"}
        reference = art("canonical.png", (100, 100))
        a = art("run_a.png", (108, 96), extra=True)
        b = art("run_b.png", (145, 80), extra=True)
        for f in (a, b):
            f["landmarks"]["chin"] = [25, 20]  # measured head is half canonical
        self.config = {
            "schema": SCHEMA, "character": "Test Character",
            "measurement": {"background": "black", "minimumConfidence": 0.8,
                            "maximumSequenceSpread": 0.08},
            "canonical": {**reference, "name": "reference", "pose": "standing"},
            "sequences": [{"id": "run", "frames": [
                {**a, "name": "run_1", "durationMs": 80},
                {**b, "name": "run_2", "durationMs": 120, "pose": "crouch"},
            ]}],
        }

    def test_measurement_from_anatomy_not_bbox(self):
        report = analyze(self.config, self.root)
        run = report["sequences"][0]
        self.assertEqual(run["scaleFactor"], 2)
        self.assertEqual(run["ratioSpread"], 0)
        self.assertFalse(report["blocked"])
        self.assertNotEqual(run["frames"][0]["canvasPx"],
                            run["frames"][1]["canvasPx"])
        self.assertEqual([x["durationMs"] for x in run["frames"]], [80, 120])
        self.assertEqual(run["frames"][0]["landmarksSourcePx"]["knee"], [26, 58])
        self.assertNotEqual(run["frames"][0]["visibleBoundsCellPx"],
                            run["frames"][1]["visibleBoundsCellPx"])

    def test_repeated_execution_and_non_destructive_sources(self):
        before = {p.name: digest(p.read_bytes()) for p in (self.root / "sources").iterdir()}
        report = analyze(self.config, self.root)
        result_a = render(self.config, report, self.root, self.root / "candidate_a")
        result_b = render(self.config, report, self.root, self.root / "candidate_b")
        self.assertEqual(result_a, result_b)
        for path_a in (self.root / "candidate_a").rglob("*"):
            if path_a.is_file():
                relative = path_a.relative_to(self.root / "candidate_a")
                self.assertEqual(digest(path_a.read_bytes()),
                                 digest((self.root / "candidate_b" / relative).read_bytes()))
        self.assertEqual(before, {p.name: digest(p.read_bytes())
                                  for p in (self.root / "sources").iterdir()})
        self.assertEqual(result_a["normalization"]["status"], "quarantined")
        self.assertEqual(result_a["animations"][0]["frames"][1]["durationMs"], 120)
        self.assertEqual(len(result_a["animations"][0]["comparison"]["frames"]), 2)
        self.assertEqual(result_a["animations"][0]["groundGuideY"],
                         json.loads((self.root / "candidate_a" / "render-receipt.json")
                                    .read_text())["registration"][0]["anchorCanvasPx"][1])
        for frame in result_a["animations"][0]["frames"]:
            picture = Image.open(self.root / "candidate_a" / frame["src"])
            self.assertEqual(picture.size, (result_a["frameSpace"]["width"],
                                            result_a["frameSpace"]["height"]))
            self.assertIsNotNone(picture.getchannel("A").getbbox())

    def test_detached_effect_is_preserved(self):
        report = analyze(self.config, self.root)
        generated = render(self.config, report, self.root, self.root / "c")
        picture = Image.open(self.root / "c" / generated["animations"][0]["frames"][0]["src"])
        self.assertGreater(picture.getchannel("A").getbbox()[2] - picture.getchannel("A").getbbox()[0], 100)

    def test_low_confidence_is_blocked_without_override(self):
        config = copy.deepcopy(self.config)
        config["sequences"][0]["frames"][0]["confidence"] = 0.1
        report = analyze(config, self.root)
        self.assertTrue(report["blocked"])
        with self.assertRaisesRegex(ValueError, "blocked"):
            render(config, report, self.root, self.root / "not_written")

    def test_scale_drift_is_blocked(self):
        config = copy.deepcopy(self.config)
        config["sequences"][0]["frames"][1]["landmarks"]["chin"] = [25, 27]
        report = analyze(config, self.root)
        self.assertTrue(report["blocked"])
        self.assertIn("intra-sequence scale discrepancy", " ".join(report["sequences"][0]["issues"]))

    def test_transformation_inherits_group_without_bbox_fit(self):
        config = copy.deepcopy(self.config)
        spin = copy.deepcopy(config["sequences"][0]["frames"][0])
        spin["name"] = "spin_1"
        spin["anchorLabel"] = "center"
        spin["anchor"] = [25, 30]
        spin["landmarks"] = {}
        spin["inheritMeasurementFrom"] = "spin_0"
        spin0 = copy.deepcopy(spin)
        spin0["name"] = "spin_0"
        spin0["landmarks"] = {"crown": [25, 10], "chin": [25, 20]}
        spin0.pop("inheritMeasurementFrom")
        config["sequences"].append({
            "id": "pinwheel", "frames": [spin0, spin],
            "transformation": {"scaleFromSequence": "run",
                               "relativeScale": 0.75,
                               "reason": "approved intentional pinwheel envelope"},
        })
        report = analyze(config, self.root)
        self.assertFalse(report["blocked"])
        self.assertEqual(report["sequences"][1]["scaleFactor"], 1.5)
        generated = render(config, report, self.root, self.root / "transformation")
        self.assertEqual(len(generated["animations"]), 2)

    def test_missing_landmark_requires_saved_correction(self):
        config = copy.deepcopy(self.config)
        config["sequences"][0]["frames"][1]["landmarks"] = {}
        report = analyze(config, self.root)
        self.assertTrue(report["blocked"])

    def test_source_hash_mismatch_fails_closed(self):
        config = copy.deepcopy(self.config)
        config["sequences"][0]["frames"][0]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            analyze(config, self.root)

    def test_approval_bound_to_exact_measurements(self):
        report = analyze(self.config, self.root)
        approval = {"schema": APPROVAL_SCHEMA, "verdict": "approved",
                    "analysisSha256": digest(canonical_json(report).encode("utf-8")),
                    "approvedSequences": ["run"], "reviewer": "Human"}
        generated = render(self.config, report, self.root, self.root / "approved", approval)
        self.assertEqual(generated["normalization"]["status"], "human-approved")
        altered = dict(approval, analysisSha256="0" * 64)
        with self.assertRaisesRegex(ValueError, "approval"):
            render(self.config, report, self.root, self.root / "rejected", altered)

    def test_output_cannot_overwrite_source(self):
        report = analyze(self.config, self.root)
        with self.assertRaisesRegex(ValueError, "source"):
            render(self.config, report, self.root, self.root / "sources" / "existing")


if __name__ == "__main__":
    unittest.main()
