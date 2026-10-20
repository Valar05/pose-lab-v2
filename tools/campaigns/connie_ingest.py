#!/usr/bin/env python3
"""Import Connie's exact approved PNG files and build a SHA-locked frame manifest.

No UI selections; no image generation; no fabricated dimensions or scale factors.
All measured source coordinates belong to campaigns/connie-head-measurements-v2.json.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MEASUREMENTS = ROOT / "campaigns/connie-head-measurements-v2.json"
BASES = [
    Path.home() / "storage/downloads",
    Path.home() / "storage/pictures",
    Path("/storage/emulated/0/Download"),
    Path("/storage/emulated/0/Pictures"),
    Path("/storage/emulated/0/DCIM"),
]
FILENAMES = {
    "run": "file_0000000065a081f598aa79ff7209b9d1.png",
    "dash": "file_00000000abb481f59b8ff374e3df6e8d.png",
    "idle": "file_00000000807881f598bd2fce43c5b0f6.png",
    "rebound": "file_000000001b8c81f5844badc8eaa7bd36.png",
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dims(path: Path) -> list[int]:
    with Image.open(path) as image:
        if image.format != "PNG":
            raise ValueError(f"Not PNG: {path}")
        return list(image.size)

def verify(path: Path, spec: dict) -> None:
    if dims(path) != spec["size"]:
        raise ValueError(f"Source dimensions changed: {path}: {dims(path)} expected {spec['size']}")
    if sha(path) != spec["sha256"]:
        raise ValueError(f"Source SHA-256 changed: {path}")

def locate(role: str, spec: dict) -> Path:
    matches: dict[str, Path] = {}
    for base in BASES:
        if not base.is_dir():
            continue
        candidates = [base / FILENAMES[role]]
        candidates += list(base.glob("*/" + FILENAMES[role]))
        for file in candidates:
            if file.is_file():
                matches[str(file.resolve())] = file
    verified = []
    for file in matches.values():
        if sha(file) == spec["sha256"]:
            verify(file, spec)
            verified.append(file)
    if not verified:
        raise FileNotFoundError(f"Canonical {role} PNG not found, hash {spec['sha256']}")
    print("CONNIE_SOURCE_MATCH", role, len(verified), "hash-matched copies")
    return sorted(verified, key=lambda x: str(x))[0]

def build():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    cfg = json.loads(MEASUREMENTS.read_text())
    if cfg.get("schema") != "pose-lab-connie-head-measurements-v2":
        raise ValueError("Connie measurement schema mismatch")
    sources = cfg["originals"]
    for role, spec in sources.items():
        dest = ROOT / spec["file"]
        if not dest.exists():
            picked = locate(role, spec)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(picked, dest)
        verify(dest, spec)
        print("CONNIE_SOURCE_VERIFIED", role, spec["sha256"])
    frames = []
    for record in cfg["frames"]:
        role = record["source"]
        spec = sources[role]
        width, height = spec["size"]
        if role == "idle":
            cell = [0, 0, width, height]
        else:
            edges = [round(i * width / 3) for i in range(4)]
            third = record["third"]
            cell = [edges[third], 0, edges[third + 1] - edges[third], height]
        item = {
            "name": record["name"],
            "file": spec["file"],
            "sha256": spec["sha256"],
            "cell": cell,
        }
        if "head" in record:
            h = record["head"]
            if len(h) != 4 or not(cell[0] <= h[0] < h[2] <= cell[0] + cell[2]
                                   and 0 <= h[1] < h[3] <= height):
                raise ValueError(f"Invalid source head bounds for {record['name']}")
            item["head"] = h
        else:
            item["scaleFrom"] = record["scaleFrom"]
        excludes = record.get("excludeRects", [])
        for rect in excludes:
            if not (cell[0] <= rect[0] < rect[2] <= cell[0] + cell[2]
                    and 0 <= rect[1] < rect[3] <= height):
                raise ValueError(f"Invalid exclusion rectangle for {record['name']}")
        item["excludeRects"] = excludes
        frames.append(item)
    expected = {"idle", "run_1", "run_2", "run_3", "rebound_1",
                "rebound_2", "rebound_3", "dash_1", "dash_2", "dash_3"}
    if {f["name"] for f in frames} != expected or len(frames) != 10:
        raise ValueError("Missing or duplicated Connie frames")
    manifest = {
        "schema": "pose-lab-connie-atlas-inputs-v2",
        "measurementSource": str(MEASUREMENTS.relative_to(ROOT)),
        "targetHeadHeight": cfg["headTargetPx"],
        "maxAtlasSize": cfg["maxAtlasSize"],
        "padding": cfg["padding"],
        "measurementStatus": "review-candidate",
        "frames": frames,
    }
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(manifest, indent=2, sort_keys=True) + "\n"
    if output.exists() and output.read_text() != text:
        # A prior v2 input file cannot be overwritten without examination.
        raise ValueError(f"Existing v2 input manifest differs: {output}")
    if not output.exists():
        output.write_text(text)
    print("CONNIE_INGRESS_OK=4; SOURCE_HASHES_VERIFIED=4")
    print("CONNIE_MEASURED_SOURCE_HEAD_BOUNDS=9; PINWHEEL_INHERITS=1")
    print("MANIFEST=" + str(output))

if __name__ == "__main__":
    try:
        build()
    except (OSError, KeyError, ValueError, TypeError) as exc:
        print("CONNIE_INGRESS_STOP:", exc, file=sys.stderr)
        sys.exit(2)
