#!/usr/bin/env python3
"""Ingress only the four approved Connie PNG sheets from Android storage.

Uses existing Connie ingress sha/dims/locate helpers; no guess-by-order, no
transformation, no re-encoding or binary/base64 shuttle through chat.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image
from connie_ingest import FILENAMES, locate, sha, verify

ROOT = Path(__file__).resolve().parents[2]
CFG = ROOT / "campaigns/connie-anatomical-calibration-v1.json"
REPORT = ROOT / "campaigns/connie-anatomical-measurements-v1.json"

# Screenshot order is run, dash, idle, wall impact. Internal measured groups
# are run, pinwheel, idle, aerial respectively, consistent with existing
# Pose Lab source folder names. No meaning inferred from filenames alone.
ORDER = (
    ("run", "run", "run.png", "file_0000000065a081f598aa79ff7209b9d1.png"),
    ("pinwheel", "dash", "dash.png", "file_00000000abb481f59b8ff374e3df6e8d.png"),
    ("idle", "idle", "idle.png", "file_00000000807881f598bd2fce43c5b0f6.png"),
    ("aerial", "rebound", "rebound.png", "file_000000001b8c81f5844badc8eaa7bd36.png"),
)


def stop(msg):
    raise ValueError("CONNIE_INGRESS_STOP: " + msg)


def read_json(p):
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p, obj):
    p.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def check_config(cfg, report):
    if cfg.get("schema") != "pose-lab-sprite-calibration-v1":
        stop("unexpected calibration schema")
    if report.get("schema") != "pose-lab-connie-anatomical-measurement-report-v1":
        stop("unexpected measurement schema")
    if report.get("overview", {}).get("safeToApply") is not False:
        stop("normalization safety lock changed")
    authority = cfg["sourceAuthority"]
    if authority.get("phoneUploadOrder") != [role for role, *_ in ORDER]:
        stop("phone role order changed")
    if not authority.get("sourceDigests"):
        stop("Connie measurements missing")
    seen = set()
    for role, filename_role, dest_name, exact_name in ORDER:
        spec = authority["sourceDigests"][role]
        path = "public/assets/connie/source/" + dest_name
        if spec.get("file") != path:
            stop("source role path mismatch: " + role)
        if authority.get("phoneFilenames", {}).get(role) != exact_name:
            stop("screenshot filename identity mismatch: " + role)
        if FILENAMES[filename_role] != exact_name:
            stop("existing Connie locator disagrees: " + role)
        if (not isinstance(spec.get("sha256"), str) or len(spec["sha256"]) != 64
                or not isinstance(spec.get("canvasPx"), list)
                or len(spec["canvasPx"]) != 2):
            stop("missing expected source hash/dimensions: " + role)
        if path in seen:
            stop("duplicate destination")
        seen.add(path)
    all_records = [cfg["canonical"]] + [
        frame for seq in cfg["sequences"] for frame in seq["frames"]
    ]
    if len(all_records) != 10:
        stop("expected exactly 10 authored poses")
    for rec in all_records:
        path = rec["file"]
        role = next((name for name, _, dest, _ in ORDER
                     if path == "public/assets/connie/source/" + dest), None)
        if role is None or rec["sha256"] != authority["sourceDigests"][role]["sha256"]:
            stop("annotation source not consistent with exact phone PNG: " + rec["name"])
    if set(report["sourceAuthority"]) != set(authority["sourceDigests"]):
        stop("measurement report source set mismatch")
    for role in authority["sourceDigests"]:
        if report["sourceAuthority"][role]["sha256"] != authority["sourceDigests"][role]["sha256"]:
            stop("report SHA vs calibration mismatch: " + role)
    return authority


def verified_png(path, spec):
    verify(path, {"size": spec["canvasPx"], "sha256": spec["sha256"]})
    with Image.open(path) as im:
        im.verify()


def find_source(role, role_key, expected_spec):
    try:
        return locate(role_key, {"size": expected_spec["canvasPx"],
                                 "sha256": expected_spec["sha256"]})
    except FileNotFoundError:
        file_name = FILENAMES[role_key]
        locations = [
            Path.home() / "storage/downloads" / file_name,
            Path("/storage/emulated/0/Download") / file_name,
            Path.home() / "storage/pictures" / file_name,
            Path("/storage/emulated/0/Pictures") / file_name,
        ]
        observed = []
        for p in locations:
            if p.is_file():
                try:
                    with Image.open(p) as im:
                        dimensions = list(im.size)
                    observed.append(f"{p}: SHA256={sha(p)}, dimensions={dimensions}")
                except OSError as exc:
                    observed.append(f"{p}: unreadable image ({exc})")
        stop("No SHA-matching original for " + role + "; expected "
             + expected_spec["sha256"] + " and dimensions "
             + str(expected_spec["canvasPx"]) + "; observed:\n"
             + ("\n".join(observed) if observed else "no matching filenames in Downloads/Pictures"))


def verify_git_sources(authority):
    for role, _, _, _ in ORDER:
        spec = authority["sourceDigests"][role]
        path = ROOT / spec["file"]
        if not path.is_file() or path.is_symlink():
            stop("Git source missing or symlinked: " + str(path))
        verified_png(path, spec)
        print("CONNIE_GIT_SOURCE_VERIFIED", role, spec["sha256"])


def prepare():
    cfg = read_json(CFG)
    report = read_json(REPORT)
    authority = check_config(cfg, report)
    print("PHONE_SOURCE_ORDER=run,dash/pinwheel,idle,wall-impact/rebound")
    # All source identities verified before any write.
    candidates = {}
    for role, finder, _, _ in ORDER:
        spec = authority["sourceDigests"][role]
        existing = ROOT / spec["file"]
        if existing.is_file():
            if existing.is_symlink():
                stop("canonical source path is symlinked: " + str(existing))
            verified_png(existing, spec)
            candidates[role] = existing
            print("SOURCE_ALREADY_PRESENT", role, spec["sha256"])
        else:
            candidates[role] = find_source(role, finder, spec)
            verified_png(candidates[role], spec)
            print("PHONE_SOURCE_VERIFIED", role, spec["sha256"])

    # No original PNG in Downloads is modified or deleted.
    for role, _, _, _ in ORDER:
        spec = authority["sourceDigests"][role]
        target = ROOT / spec["file"]
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copyfile(candidates[role], target)
        verified_png(target, spec)

    cfg["sourceAuthority"]["sourceExistsInGitHub"] = True
    cfg["sourceAuthority"]["sourceAvailability"] = "four exact PNGs staged for Git commit and readback"
    cfg["status"] = "source-ingressed-measurements-provisional"
    cfg["humanReview"]["sourceNotInRepo"] = False
    cfg["humanReview"]["normalizationAllowed"] = False

    report["status"] = "provisional-measured-source-ingressed"
    report["reportKind"] = (
        "Annotation report over original, SHA-locked source PNGs. "
        "Committing source bytes enables repository verification; anatomical "
        "measurements remain provisional until reviewed."
    )
    report["caveats"] = [
        x for x in report["caveats"]
        if not ("source PNGs are not in Git" in x or
                "Source PNGs are absent" in x or
                "Original PNGs are absent" in x)
    ]
    report["caveats"].append(
        "Exact four canonical PNGs have been staged for Git transport. "
        "Hosted delivery and human visual acceptance require separate evidence."
    )
    report["overview"]["safeToApply"] = False
    write_json(CFG, cfg)
    write_json(REPORT, report)

    verify_git_sources(authority)
    # Critical: status only describes source ingress, NOT normalized animation.
    print("CONNIE_INGRESS_PREPARED=4")
    print("ANATOMICAL_MEASUREMENTS=PROVISIONAL; ANIMATIONS=UNMODIFIED")
    print("HUMAN_VISUAL_VERDICT=PENDING")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("check-manifest", "prepare", "verify-import"))
    args = parser.parse_args()
    cfg, report = read_json(CFG), read_json(REPORT)
    authority = check_config(cfg, report)
    if args.action == "check-manifest":
        print("CONNIE_PHONE_MAPPING_MANIFEST_OK=4")
        print("PHONE_SOURCE_ORDER=run,dash/pinwheel,idle,wall-impact/rebound")
    elif args.action == "prepare":
        prepare()
    elif args.action == "verify-import":
        if not cfg["sourceAuthority"].get("sourceExistsInGitHub"):
            stop("calibration doesn't declare imported sources")
        if report["status"] != "provisional-measured-source-ingressed":
            stop("measurement report ingress status absent")
        verify_git_sources(authority)
        print("CONNIE_SOURCE_IMPORT_VERIFIED=4; HUMAN_VERDICT=PENDING")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
