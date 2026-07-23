#!/usr/bin/env python3
"""Assemble source-only pose packet passes into exact-grid reference sheets."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


PASS_NAMES = ("beauty", "silhouette", "limb-id", "depth")
ROLE_COLORS = {
    "left": (255, 90, 36),
    "right": (32, 205, 255),
    "center": (255, 218, 72),
    "weapon": (255, 255, 255),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def grid_sheet(
    root: Path,
    records: list[dict[str, object]],
    pass_name: str,
    columns: int,
    rows: int,
    frame_width: int,
    frame_height: int,
) -> Image.Image:
    sheet = Image.new("RGB", (columns * frame_width, rows * frame_height), (0, 0, 0))
    for record in records:
        index = int(record["index"])
        col, row = index % columns, index // columns
        pass_record = record["passes"][pass_name]
        image = Image.open(root / pass_record["image"]).convert("RGB")
        if image.size != (frame_width, frame_height):
            raise RuntimeError(
                f"{pass_name} frame {index} is {image.size}, expected "
                f"{(frame_width, frame_height)}"
            )
        sheet.paste(image, (col * frame_width, row * frame_height))
    return sheet


def point_xy(point: dict[str, object], width: int, height: int) -> tuple[int, int]:
    return (
        round(float(point["x"]) * width),
        round(float(point["y"]) * height),
    )


def joint_color(role: str) -> tuple[int, int, int]:
    if role.startswith("left-"):
        return ROLE_COLORS["left"]
    if role.startswith("right-"):
        return ROLE_COLORS["right"]
    return ROLE_COLORS["center"]


def geometry_overlay(
    beauty: Image.Image,
    records: list[dict[str, object]],
    columns: int,
    frame_width: int,
    frame_height: int,
) -> Image.Image:
    sheet = Image.blend(
        beauty.convert("RGB"),
        Image.new("RGB", beauty.size, (0, 0, 0)),
        0.58,
    )
    draw = ImageDraw.Draw(sheet)
    line_width = max(2, frame_width // 140)
    radius = max(3, frame_width // 95)
    for record in records:
        index = int(record["index"])
        cell_x = (index % columns) * frame_width
        cell_y = (index // columns) * frame_height
        for joint in record["joints"]:
            color = joint_color(str(joint["role"]))
            head = point_xy(joint["head"], frame_width, frame_height)
            tail = point_xy(joint["tail"], frame_width, frame_height)
            head = (head[0] + cell_x, head[1] + cell_y)
            tail = (tail[0] + cell_x, tail[1] + cell_y)
            draw.line((head, tail), fill=color, width=line_width)
            draw.ellipse(
                (
                    head[0] - radius,
                    head[1] - radius,
                    head[0] + radius,
                    head[1] + radius,
                ),
                fill=color,
            )
        weapon = record.get("weapon")
        if weapon and weapon.get("status") == "measured":
            hilt = point_xy(weapon["hilt"], frame_width, frame_height)
            tip = point_xy(weapon["tip"], frame_width, frame_height)
            hilt = (hilt[0] + cell_x, hilt[1] + cell_y)
            tip = (tip[0] + cell_x, tip[1] + cell_y)
            draw.line((hilt, tip), fill=ROLE_COLORS["weapon"], width=line_width + 2)
            draw.ellipse(
                (
                    hilt[0] - radius,
                    hilt[1] - radius,
                    hilt[0] + radius,
                    hilt[1] + radius,
                ),
                outline=ROLE_COLORS["weapon"],
                width=line_width,
            )
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    args = parser.parse_args()
    root = Path(args.root)
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("schema") != "animation-pose-packet-v1":
        raise RuntimeError(f"Unsupported pose packet schema: {manifest.get('schema')!r}")
    grid = manifest["grid"]
    columns = int(grid["columns"])
    rows = int(grid["rows"])
    frame_width = int(grid["frameWidth"])
    frame_height = int(grid["frameHeight"])
    records = sorted(manifest["frames"], key=lambda record: int(record["index"]))
    if len(records) != columns * rows:
        raise RuntimeError("Pose packet frame count does not fill the declared grid")

    assembled: dict[str, dict[str, object]] = {}
    sheets: dict[str, Image.Image] = {}
    for pass_name in PASS_NAMES:
        sheet = grid_sheet(
            root,
            records,
            pass_name,
            columns,
            rows,
            frame_width,
            frame_height,
        )
        path = root / f"{pass_name}-grid.png"
        sheet.save(path)
        sheets[pass_name] = sheet
        assembled[pass_name] = {
            "image": path.name,
            "sha256": sha256(path),
            "width": sheet.width,
            "height": sheet.height,
        }

    overlay = geometry_overlay(
        sheets["beauty"],
        records,
        columns,
        frame_width,
        frame_height,
    )
    overlay_path = root / "geometry-grid.png"
    overlay.save(overlay_path)
    assembled["geometry"] = {
        "image": overlay_path.name,
        "sha256": sha256(overlay_path),
        "width": overlay.width,
        "height": overlay.height,
        "legend": {
            "leftChain": "#ff5a24",
            "rightChain": "#20cdff",
            "centerChain": "#ffda48",
            "weaponAxis": "#ffffff",
        },
    }

    manifest["assembled"] = assembled
    generation_contract = {
        "schema": "appearance-only-generation-contract-v1",
        "poseAuthority": "immutable native pose packet",
        "appearanceAuthority": "external concept art supplied separately",
        "referenceOrder": [
            "geometry-grid.png",
            "limb-id-grid.png",
            "depth-grid.png",
            "beauty-grid.png",
            "EXTERNAL_CONCEPT_ART",
        ],
        "allowedChanges": [
            "armor design",
            "materials",
            "colors",
            "face and helmet design",
            "plume and cape surface design",
            "lighting and rendering style",
        ],
        "forbiddenChanges": [
            "joint position or rotation",
            "near/far limb ownership",
            "occlusion order",
            "weapon hilt or tip position",
            "foot contact",
            "camera side, angle, framing, or scale",
            "frame order or timing",
            "mirroring",
            "pose correction or beautification",
            "using generated output as a later reference",
        ],
        "semanticPoseLanguageAllowed": False,
        "retryAuthority": "restart from this native packet, never generated output",
    }
    contract_path = root / "appearance-only-generation-contract.json"
    contract_path.write_text(json.dumps(generation_contract, indent=2) + "\n")
    manifest["generationContract"] = {
        "path": contract_path.name,
        "sha256": sha256(contract_path),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "status": "PASS",
                "root": str(root),
                "sheets": sorted(assembled),
                "generationContract": contract_path.name,
                "size": [columns * frame_width, rows * frame_height],
            }
        )
    )


if __name__ == "__main__":
    main()
