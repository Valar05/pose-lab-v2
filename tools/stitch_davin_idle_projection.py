#!/usr/bin/env python3
"""Build a Davin idle landmark projection overlay diagnostic."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROJECTION = ROOT / "generated" / "davin-idle" / "screenshot-1" / "projection" / "landmarks.json"
DEFAULT_RENDER_MANIFEST = ROOT / "generated" / "davin-idle" / "screenshot-1" / "render" / "manifest.json"
DEFAULT_OUT = ROOT / "generated" / "davin-idle" / "screenshot-1" / "davin-idle-screenshot-1-projection.png"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int) -> ImageFont.ImageFont:
    for candidate in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/system/fonts/Roboto-Regular.ttf"]:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def resolve(path_text: str, base: Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else base / path


def fit_image_with_box(image: Image.Image, width: int, height: int):
    image = image.convert("RGB")
    scale = min(width / image.width, height / image.height)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))))
    canvas = Image.new("RGB", (width, height), (42, 45, 48))
    ox = (width - resized.width) // 2
    oy = (height - resized.height) // 2
    canvas.paste(resized, (ox, oy))
    return canvas, (ox, oy, resized.width, resized.height)


def draw_point(draw, xy, color, label, small_font):
    x, y = xy
    r = 7
    draw.ellipse((x - r, y - r, x + r, y + r), outline=color, width=3)
    draw.text((x + 9, y - 9), label, fill=color, font=small_font)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--projection", default=str(DEFAULT_PROJECTION))
    parser.add_argument("--render-manifest", default=str(DEFAULT_RENDER_MANIFEST))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    projection_path = Path(args.projection)
    if not projection_path.is_absolute():
        projection_path = ROOT / projection_path
    render_manifest_path = Path(args.render_manifest)
    if not render_manifest_path.is_absolute():
        render_manifest_path = ROOT / render_manifest_path
    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out

    projection = json.loads(projection_path.read_text())
    render_manifest = json.loads(render_manifest_path.read_text())
    candidate_path = Path(render_manifest["candidate"]["path"])
    if not candidate_path.is_absolute():
        candidate_path = ROOT / candidate_path
    candidate = json.loads(candidate_path.read_text())
    screenshot_path = Path(candidate["source"]["sourceScreenshot"])
    render_path = resolve(render_manifest["frames"][0]["path"], render_manifest_path.parent)

    panel_w = 960
    panel_h = 720
    title_h = 104
    label_h = 54
    sheet = Image.new("RGB", (panel_w * 2, title_h + panel_h + label_h), (18, 21, 24))
    draw = ImageDraw.Draw(sheet)
    title_font = font(25)
    small_font = font(14)
    label_font = font(18)
    draw.text((18, 12), "Davin idle screen-space projection diagnostic", fill=(235, 238, 242), font=title_font)
    draw.text((18, 48), f"Status: {projection.get('status')} | mean error: {projection.get('meanErrorPx')}px | red until projected rig points match target landmarks", fill=(255, 194, 102), font=small_font)

    source_img, source_box = fit_image_with_box(Image.open(screenshot_path), panel_w, panel_h)
    render_img, render_box = fit_image_with_box(Image.open(render_path), panel_w, panel_h)
    source_draw = ImageDraw.Draw(source_img)
    render_draw = ImageDraw.Draw(render_img)
    sx, sy, sw, sh = source_box
    rx, ry, rw, rh = render_box
    vp = projection["viewport"]
    for item in projection["landmarks"]:
        target = item.get("targetPx")
        projected = item.get("projectedPx")
        if target:
            draw_point(source_draw, (sx + target[0] / vp["width"] * sw, sy + target[1] / vp["height"] * sh), (255, 86, 86), item["name"], small_font)
        if projected:
            draw_point(render_draw, (rx + projected[0] / vp["width"] * rw, ry + projected[1] / vp["height"] * rh), (104, 216, 255), item["name"], small_font)
    sheet.paste(source_img, (0, title_h))
    sheet.paste(render_img, (panel_w, title_h))
    draw.rectangle((0, title_h + panel_h, panel_w * 2, title_h + panel_h + label_h), fill=(18, 21, 24))
    draw.text((18, title_h + panel_h + 14), "target landmarks on source screenshot", fill=(238, 241, 245), font=label_font)
    draw.text((panel_w + 18, title_h + panel_h + 14), "projected rig points on local render", fill=(238, 241, 245), font=label_font)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    projection["overlay"] = {"path": str(out), "sha256": sha256(out)}
    projection_path.write_text(json.dumps(projection, indent=2) + "\n")
    print(str(out))


if __name__ == "__main__":
    main()
