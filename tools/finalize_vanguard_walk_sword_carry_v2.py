#!/usr/bin/env python3
"""Package the quarantined Steel WalkSwordCarryV2 2D review candidate."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contact_sheet(paths: list[Path], out: Path, title: str) -> None:
    canvas = Image.new("RGBA", (2048, 1056), (18, 22, 28, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 8), title, fill="white")
    for index, path in enumerate(paths):
        canvas.alpha_composite(
            Image.open(path).convert("RGBA"),
            ((index % 4) * 512, (index // 4) * 512 + 32),
        )
    canvas.save(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--publish", required=True)
    args = parser.parse_args()
    root = Path(args.root)
    publish = Path(args.publish)
    metadata = json.loads((root / "metadata.json").read_text())

    if metadata["status"] != "rendered-pending-visual-review":
        raise SystemExit("Unexpected authoring status")
    if sum(metadata["contract"]["timingMs"]) != 820:
        raise SystemExit("Timing changed")
    if metadata["contract"]["weapon"]["mode"] != "embedded":
        raise SystemExit("Weapon contract changed")
    if metadata["contract"]["retargeting"]:
        raise SystemExit("Retargeting is forbidden for this candidate")

    side_paths = [root / "side" / frame["image"] for frame in metadata["frames"]]
    front_paths = [
        root / "orthogonal" / frame["image"]
        for frame in metadata["orthogonalFrames"]
    ]
    side_sheet = root / "locked-side-contact-sheet.png"
    front_sheet = root / "orthogonal-contact-sheet.png"
    contact_sheet(
        side_paths,
        side_sheet,
        "QUARANTINED STEEL WALK SWORD CARRY V2 — LOCKED SIDE",
    )
    contact_sheet(
        front_paths,
        front_sheet,
        "QUARANTINED STEEL WALK SWORD CARRY V2 — ORTHOGONAL",
    )

    frames_dir = publish / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for index, source in enumerate(side_paths):
        shutil.copy2(source, frames_dir / f"walkswordcarryv2_{index:04d}.png")
    shutil.copy2(side_sheet, publish / "contact-sheet.png")
    shutil.copy2(front_sheet, publish / "orthogonal-contact-sheet.png")
    shutil.copy2(root / "metadata.json", publish / "source-metadata.json")
    shutil.copy2(
        root / "vanguard_walk_sword_carry_v2.glb",
        publish / "vanguard_walk_sword_carry_v2.glb",
    )

    frames = [
        {
            "src": f"frames/walkswordcarryv2_{index:04d}.png",
            "durationMs": metadata["contract"]["timingMs"][index],
            "sha256": sha256(frames_dir / f"walkswordcarryv2_{index:04d}.png"),
        }
        for index in range(8)
    ]
    manifest = {
        "schema": "pose-lab-v2-2d-animation-set-v1",
        "character": "Steel Vanguard · Walk Sword Carry V2 candidate 001",
        "defaultAnimation": "walkswordcarryv2",
        "frameSpace": {
            "width": 512,
            "height": 512,
            "colorMode": "RGBA",
            "background": "transparent",
            "facing": "screen-right",
            "camera": "fixed",
        },
        "authority": {
            "locomotion": "Approved Steel Walk v1",
            "actingPass": "WalkSwordCarryV2 candidate 001",
            "reviewState": "candidate",
            "humanVerdict": None,
        },
        "animations": [
            {
                "id": "walkswordcarryv2",
                "label": "Walk Sword Carry V2 · Candidate 001",
                "loop": True,
                "contactSheet": "contact-sheet.png",
                "sourceMetadata": "source-metadata.json",
                "groundGuideY": 400,
                "contract": [
                    "screen-right",
                    "approved Walk v1 locomotion",
                    "fixed camera",
                    "eight authored poses",
                    "single embedded sword",
                    "candidate only",
                ],
                "frames": frames,
            }
        ],
    }
    (publish / "animations.json").write_text(json.dumps(manifest, indent=2) + "\n")
    receipt = {
        "schema": "pose-lab-v2-sword-carry-evidence-v1",
        "status": "quarantined",
        "timingMs": metadata["contract"]["timingMs"],
        "motionSummary": metadata["motionSummary"],
        "exportSha256": metadata["export"]["sha256"],
        "contactSheetSha256": sha256(publish / "contact-sheet.png"),
        "orthogonalSheetSha256": sha256(publish / "orthogonal-contact-sheet.png"),
        "weapon": metadata["contract"]["weapon"],
        "humanVerdict": None,
    }
    (publish / "evidence.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"status": "QUARANTINED", "frames": 8, "publish": str(publish)}))


if __name__ == "__main__":
    main()
