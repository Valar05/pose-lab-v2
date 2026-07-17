#!/usr/bin/env python3
"""Build a side-by-side Davin idle source screenshot vs Blender diagnostic render."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "generated" / "davin-idle" / "screenshot-1" / "render" / "manifest.json"
DEFAULT_OUT = ROOT / "generated" / "davin-idle" / "screenshot-1" / "davin-idle-screenshot-1-diagnostic.png"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int) -> ImageFont.ImageFont:
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/system/fonts/Roboto-Regular.ttf",
    ]:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit_image(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.convert("RGB")
    scale = min(width / image.width, height / image.height)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))))
    canvas = Image.new("RGB", (width, height), (42, 45, 48))
    canvas.paste(resized, ((width - resized.width) // 2, (height - resized.height) // 2))
    return canvas


def resolve_path(path_text: str, base: Path) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return base / path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = ROOT / manifest_path
    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out

    manifest = json.loads(manifest_path.read_text())
    candidate_path = Path(manifest["candidate"]["path"])
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    candidate = json.loads(candidate_path.read_text())
    screenshot = Path(candidate["source"]["sourceScreenshot"])
    render_frame = resolve_path(manifest["frames"][0]["path"], manifest_path.parent)

    panel_w = 960
    panel_h = 720
    title_h = 96
    label_h = 48
    sheet = Image.new("RGB", (panel_w * 2, title_h + panel_h + label_h), (18, 21, 24))
    draw = ImageDraw.Draw(sheet)
    title_font = font(26)
    label_font = font(18)
    small_font = font(14)
    draw.text((18, 14), "Davin screenshot idle diagnostic", fill=(235, 238, 242), font=title_font)
    draw.text((18, 48), "Left: source screenshot. Right: local Blender render. Red/quarantined until the silhouette matches.", fill=(255, 194, 102), font=small_font)

    source_img = fit_image(Image.open(screenshot), panel_w, panel_h)
    render_img = fit_image(Image.open(render_frame), panel_w, panel_h)
    sheet.paste(source_img, (0, title_h))
    sheet.paste(render_img, (panel_w, title_h))
    draw.rectangle((0, title_h + panel_h, panel_w * 2, title_h + panel_h + label_h), fill=(18, 21, 24))
    draw.text((18, title_h + panel_h + 12), "source screenshot", fill=(238, 241, 245), font=label_font)
    draw.text((panel_w + 18, title_h + panel_h + 12), "IK-assisted 3D candidate render", fill=(238, 241, 245), font=label_font)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    manifest["sourceComparison"] = {"path": str(out), "sha256": sha256(out)}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(str(out))


if __name__ == "__main__":
    main()
