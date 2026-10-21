#!/usr/bin/env python3
"""Connie measurement *data* regression; requires no source PNGs in CI.

This validates exact annotation/report parity and refuses to interpret the
absence of canonical source bytes as successful pixel verification.
"""
from __future__ import annotations
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CALIBRATION = ROOT / "campaigns/connie-anatomical-calibration-v1.json"
REPORT = ROOT / "campaigns/connie-anatomical-measurements-v1.json"
SOURCE_HASHES = {
    "idle": "7fb56a75e6e02d0bb256469845bbfd57a5aff0e925b1a5216ac1828debec827b",
    "run": "a8a5acfc9eab5c61b3b060e933ec9f91807b463cefd10ed0b5927ad420500b12",
    "aerial": "e8796c2de42fef4cdf4265cdfc6d69e90a4409071175e0b98c4bb6b9d1e1fee0",
    "pinwheel": "32cab3b7e7deebc2f7607e189fa5790771b6d7bbd942ba27cc442edccbf753cf",
}
SOURCE_SIZES = {
    "idle": (1152, 1536), "run": (1536, 864),
    "aerial": (1536, 512), "pinwheel": (1536, 512),
}
PARTITIONS = {
    "idle": [0, 1152],
    "run": [0, 512, 994, 1536],
    "aerial": [0, 470, 1030, 1536],
    "pinwheel": [0, 545, 1030, 1536],
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def measure(points, a, b):
    if a not in points or b not in points:
        return None
    return math.dist(points[a], points[b])


def main():
    cfg = json.loads(CALIBRATION.read_text())
    r = json.loads(REPORT.read_text())
    require(cfg["schema"] == "pose-lab-sprite-calibration-v1", "incorrect calibration schema")
    require(r["status"] == "provisional-measured-not-ingressed", "must preserve incomplete status")
    require(cfg["sourceAuthority"]["sourceExistsInGitHub"] is False, "false source-ingress claim")
    require(r["overview"]["safeToApply"] is False, "must not treat annotations as approval")
    require(cfg["measurement"]["minimumConfidence"] == 0.8, "confidence policy changed")
    require(cfg["measurement"]["maximumSequenceSpread"] == 0.08, "sequence spread policy changed")
    require(len(cfg["sequences"]) == 3 and len(r["sequences"]) == 3, "sequence count")

    authority = cfg["sourceAuthority"]["sourceDigests"]
    for role in SOURCE_HASHES:
        require(authority[role]["sha256"] == SOURCE_HASHES[role], role + " unexpected SHA")
        require(tuple(authority[role]["canvasPx"]) == SOURCE_SIZES[role], role + " wrong size")
        require(r["sourceAuthority"][role]["sha256"] == SOURCE_HASHES[role], role + " report SHA drift")

    ref = cfg["canonical"]
    require(ref["landmarks"]["crown"] == [751, 145] and ref["landmarks"]["chin"] == [754, 298], "reference changed")
    require(ref["observedVisibleBoundsSourcePx"] == [21, 48, 1075, 1482], "reference bounds drift")
    ref_head = measure(ref["landmarks"], "crown", "chin")
    require(abs(ref_head - r["overview"]["standingHeadPx"]) < 0.0001, "reference head length drift")
    entries = [ref]
    report_entries = [r["canonical"]]
    for group, rr in zip(cfg["sequences"], r["sequences"]):
        role = group["id"]
        require(role in ("run", "aerial", "pinwheel") and rr["id"] == role, "sequence identity")
        edges = PARTITIONS[role]
        require(len(group["frames"]) == len(edges) - 1, "frame count drift")
        require(rr["frameCount"] == len(group["frames"]), "reported count drift")
        good_lengths = []
        for i, (frame, reported) in enumerate(zip(group["frames"], rr["frames"])):
            entries.append(frame)
            report_entries.append(reported)
            x, y, w, h = frame["cell"]
            require((x, x + w) == (edges[i], edges[i + 1]), "source seam misallocation")
            require((y, h) == (0, SOURCE_SIZES[role][1]), "height mismatch")
            x0, y0, x1, y1 = frame["observedVisibleBoundsSourcePx"]
            require(x <= x0 < x1 <= x + w and y <= y0 < y1 <= h,
                    "foreground evidence outside source cell")
            require((x0 > x and x1 < x + w), "foreground touches extraction seam")
            require(reported["sourceCellPx"] == frame["cell"], "report source-cell drift")
            require(reported["visibleBoundsSourcePx"] == frame["observedVisibleBoundsSourcePx"],
                    "report source-bounds drift")
            require(reported["landmarksSourcePx"] == frame["landmarks"], "report landmark drift")
            require(reported["confidence"] == frame["confidence"], "report confidence drift")
            require(reported["anchorSourcePx"] == frame["anchor"], "report anchor drift")
            require(frame["anchorLabel"] in ("hip", "rotation-center"), "unsupported anchor")
            for name, (px, py) in {**frame["landmarks"], "anchor": frame["anchor"]}.items():
                require(x <= px < x + w and 0 <= py < h,
                        f"{frame['name']} {name} outside measured source cell")
            head = measure(frame["landmarks"], "crown", "chin")
            torso = measure(frame["landmarks"], "shoulder", "hip")
            require(head is None or abs(head - reported["distancesPx"]["crownToChin"]) < .0001,
                    "head arithmetic drift")
            require(torso is None or abs(torso - reported["distancesPx"]["shoulderToHip"]) < .0001,
                    "torso arithmetic drift")
            if head is not None and frame["confidence"] >= .8:
                good_lengths.append(head)
        good_lengths.sort()
        mid = len(good_lengths) // 2
        med = (good_lengths[mid] if len(good_lengths) % 2 else
               (good_lengths[mid - 1] + good_lengths[mid]) / 2)
        factor = ref_head / med
        require(abs(factor - rr["candidateUniformScaleRatio"]) < .000001,
                "per-sequence factor drift")
        if role == "pinwheel":
            require(rr["normalizationStatus"].startswith("BLOCKED"), "pinwheel gate bypassed")
            require(group["frames"][1]["confidence"] < .8, "occluded face claimed reliable")
            require(group["frames"][2]["landmarks"] == {}, "headless pinwheel guessed landmarks")
            require(group["frames"][2]["inheritMeasurementFrom"] == "pinwheel_1",
                    "headless frame must explicitly inherit if approved")
        else:
            require(all(f["confidence"] >= .8 for f in group["frames"]), "reliable family not reliable")
    require(len(entries) == 10 and len(report_entries) == 10, "expected 10 original frames")
    require(all("durationMs" not in f for f in entries),
            "static image cannot provide a trusted animation duration")
    require(all("artisticException" not in g and "transformation" not in g
                for g in cfg["sequences"]), "unapproved artistic scaling shortcut")
    require(not (ROOT / "public/assets/connie/source/idle.png").is_file(),
            "source ingress status must be revisited if images become available")
    print("CONNIE_LANDMARK_DATA_VALID=10")
    print("CANONICAL_HEAD_PX=%.4f" % ref_head)
    print("SEQUENCE_CANDIDATE_SCALES=" + json.dumps(
        {g["id"]: g["candidateUniformScaleRatio"] for g in r["sequences"]},
        sort_keys=True))
    print("SOURCE_PNG_VERIFICATION=NOT_PERFORMED_IN_GITHUB_CI; SOURCE_INGRESS_MISSING=TRUE")
    print("RUNTIME_NORMALIZATION=BLOCKED; NO_ARTWORK_MODIFIED")


if __name__ == "__main__":
    main()
