#!/usr/bin/env python3
"""Phone ingress for Connie's original V3 four-sheet source family.

Only verifies and copies exact originals to the Git authoring worktree.
Never normalizes, edits pixels, rewrites annotations or invents timing.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image
from connie_ingest import FILENAMES, locate

ROOT = Path(__file__).resolve().parents[2]
SOURCE_AUTHORITY = ROOT / "campaigns/connie-source-measurements-v3.json"
# Phone screenshot order, not alphabetical order. Canonical Pose Lab V3 roles.
ORDER = (
    ("run", "run", "file_0000000065a081f598aa79ff7209b9d1.png"),
    ("dash", "dash", "file_00000000abb481f59b8ff374e3df6e8d.png"),
    ("idle", "idle", "file_00000000807881f598bd2fce43c5b0f6.png"),
    ("rebound", "rebound", "file_000000001b8c81f5844badc8eaa7bd36.png"),
)
EXPECTED_SOURCE_HASHES = {
    "run": "b95d6a84f0c4e410eab5c95e5f921b6f54ca1d79c91f587d1523128e94d36f03",
    "dash": "84b9a61a55f24a04fda6b25e84edff6c8252d52814eb8c7cd2390f572f37daa2",
    "idle": "32d3a1bd1ca0877098db02e02934ef3da5b6e995a4b51c6326a17d40a44dc134",
    "rebound": "ca90a80b7ce7339b0a64efef230ce1daf6fd5fdd72f8e1933c513b99e6a41d21",
}


def stop(message):
    raise ValueError("CONNIE_INGRESS_STOP: " + message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def specifications():
    doc = json.loads(SOURCE_AUTHORITY.read_text(encoding="utf-8"))
    if doc.get("schema") != "pose-lab-connie-measurements-v3":
        stop("historical source manifest schema changed")
    items = doc["sources"]
    if set(items) != set(EXPECTED_SOURCE_HASHES):
        stop("expected one V3 original for each of the four roles")
    for role, name, filename in ORDER:
        info = items[role]
        if FILENAMES[name] != filename:
            stop("phone filename mapping changed: " + role)
        if (info["sha256"] != EXPECTED_SOURCE_HASHES[role] or
            info["repoPath"] != "public/assets/connie/source/" + role + ".png"):
            stop("V3 original source authority changed: " + role)
        if (len(info["dimensionsPx"]) != 2 or
            not all(type(v) is int and v > 0 for v in info["dimensionsPx"])):
            stop("source dimensions invalid: " + role)
    return items


def verify_png(path, info):
    if path.is_symlink():
        stop("source is a symlink: " + str(path))
    actual = digest(path)
    if actual != info["sha256"]:
        stop("source SHA mismatch: " + str(path) + "; got " + actual +
             "; expected " + info["sha256"])
    with Image.open(path) as image:
        if image.format != "PNG" or list(image.size) != info["dimensionsPx"]:
            stop("unexpected image dimensions/format: " + str(path))
        image.verify()


def source_path(role, info):
    target = ROOT / info["repoPath"]
    if target.exists():
        verify_png(target, info)
        return target
    try:
        path = locate(role, {"sha256": info["sha256"], "size": info["dimensionsPx"]})
    except FileNotFoundError:
        name = dict((r, f) for r, _, f in ORDER)[role]
        seen = []
        for base in (Path.home() / "storage/downloads", Path("/storage/emulated/0/Download"),
                     Path.home() / "storage/pictures", Path("/storage/emulated/0/Pictures")):
            item = base / name
            if item.is_file():
                with Image.open(item) as im:
                    dimensions = list(im.size)
                seen.append(str(item) + " SHA256=" + digest(item) +
                            " dimensions=" + str(dimensions))
        stop("original not found for " + role + "; expected " + info["sha256"] +
             "; found:\n" + ("\n".join(seen) if seen else "none under expected filenames"))
    verify_png(path, info)
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("check-manifest", "prepare", "verify-import"))
    action = parser.parse_args().action
    source = specifications()
    if action == "check-manifest":
        print("CONNIE_PHONE_MAPPING_MANIFEST_OK=4")
        print("PHONE_SOURCE_ORDER=run,dash/pinwheel,idle,wall-impact/rebound")
        print("SOURCE_FAMILY=ORIGINAL_V3")
        return
    if action == "verify-import":
        for role, _, _ in ORDER:
            dest = ROOT / source[role]["repoPath"]
            if not dest.is_file():
                stop("Git source missing: " + str(dest))
            verify_png(dest, source[role])
            print("CONNIE_GIT_SOURCE_VERIFIED", role, source[role]["sha256"])
        print("CONNIE_SOURCE_IMPORT_VERIFIED=4")
        return
    # Preflight ALL four before writing any file. Never mix source revisions.
    selected = {role: source_path(role, source[role]) for role, _, _ in ORDER}
    for role, _, _ in ORDER:
        dest = ROOT / source[role]["repoPath"]
        if dest.is_file():
            verify_png(dest, source[role])
            continue
        if dest.exists():
            stop("existing source path is not a regular PNG: " + str(dest))
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(selected[role], dest)
        verify_png(dest, source[role])
    for role, _, _ in ORDER:
        print("ORIGINAL_V3_GIT_SOURCE", role, source[role]["sha256"])
    print("CONNIE_INGRESS_PREPARED=4")
    print("PHONE_TASK=SOURCE_UPLOAD_ONLY")
    print("NORMALIZATION=GITHUB_ONLY_AFTER_PUSH")


if __name__ == "__main__":
    try:
        main()
    except (KeyError, TypeError, OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
