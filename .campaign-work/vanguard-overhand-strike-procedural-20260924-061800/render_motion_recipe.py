#!/usr/bin/env python3
"""
Pose Lab V2 deterministic sparse-sprite motion recipe renderer.

This tool does not invent poses. It composes immutable source images using
recipe-declared affine deformation, pinned contacts, timing, and optional
procedural slash/effect layers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageOps


SCHEMA = "pose-lab-v2-procedural-motion-recipe-v1"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def load_recipe(path: Path) -> dict[str, Any]:
    recipe = json.loads(path.read_text())
    if recipe.get("schema") != SCHEMA:
        raise ValueError(f"unsupported recipe schema: {recipe.get('schema')!r}")
    if not recipe.get("id") or not recipe.get("canvas") or not recipe.get("sources") or not recipe.get("phases"):
        raise ValueError("recipe requires id, canvas, sources, and phases")
    if recipe.get("rootMotion", False):
        raise ValueError("rootMotion=true is outside this renderer contract")
    return recipe


def black_luminance_to_alpha(image: Image.Image, threshold: int = 8) -> Image.Image:
    rgb = np.array(image.convert("RGB"))
    lum = rgb.max(axis=2)
    alpha = np.where(lum > threshold, lum, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def blue_key_to_alpha(image: Image.Image) -> Image.Image:
    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[..., :3].astype(np.int16)
    blue = (
        (rgb[..., 2] > 110)
        & (rgb[..., 2] > rgb[..., 0] + 35)
        & (rgb[..., 2] > rgb[..., 1] + 35)
    )
    rgba[..., 3] = np.where(blue, 0, rgba[..., 3])
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def load_source(path: Path, mode: str) -> Image.Image:
    image = Image.open(path)
    if mode == "rgba":
        return image.convert("RGBA")
    if mode == "black-luminance-alpha":
        return black_luminance_to_alpha(image)
    if mode == "blue-key":
        return blue_key_to_alpha(image)
    raise ValueError(f"unsupported source mode: {mode}")


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "package.json").is_file() and (candidate / "tools").is_dir():
            return candidate
    raise FileNotFoundError("could not locate Pose Lab V2 repository root")


def crop_atlas_cell(atlas: Image.Image, atlas_spec: dict[str, Any], cell: int) -> Image.Image:
    cols = int(atlas_spec["columns"])
    rows = int(atlas_spec["rows"])
    index_base = int(atlas_spec.get("indexBase", 0))
    idx = int(cell) - index_base
    if idx < 0 or idx >= cols * rows:
        raise ValueError(f"atlas cell {cell} is outside {cols}x{rows} grid")
    col = idx % cols
    row = idx // cols

    # Proportional edges intentionally support atlases whose dimensions do not
    # divide evenly into the declared grid.
    x0 = round(col * atlas.width / cols)
    x1 = round((col + 1) * atlas.width / cols)
    y0 = round(row * atlas.height / rows)
    y1 = round((row + 1) * atlas.height / rows)
    return atlas.crop((x0, y0, x1, y1))


def trim_rgba(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    return image.crop(bbox) if bbox else image


def rear_foot_left_anchor(sprite: Image.Image, contact_band_px: int = 16) -> tuple[int, int]:
    alpha = np.array(sprite.getchannel("A")) > 0
    ys, xs = np.where(alpha)
    if len(xs) == 0:
        raise ValueError("cannot derive anchor from empty sprite")
    y_max = int(ys.max())
    y0 = max(0, y_max - contact_band_px)
    band = alpha[y0 : y_max + 1, :]
    x_has = band.any(axis=0)

    spans: list[tuple[int, int]] = []
    start: int | None = None
    for x, value in enumerate(x_has):
        if value and start is None:
            start = x
        elif not value and start is not None:
            spans.append((start, x - 1))
            start = None
    if start is not None:
        spans.append((start, len(x_has) - 1))

    if not spans:
        return int(xs.min()), y_max

    x0, x1 = spans[0]
    pts = np.where(band[:, x0 : x1 + 1])
    anchor_x = x0 + int(round(pts[1].mean())) if len(pts[1]) else (x0 + x1) // 2
    return anchor_x, y_max


def resolve_anchor(sprite: Image.Image, source_spec: dict[str, Any]) -> tuple[int, int]:
    if "anchor" in source_spec:
        x, y = source_spec["anchor"]
        return int(x), int(y)
    mode = source_spec.get("anchorMode", "rear-foot-left")
    if mode == "rear-foot-left":
        return rear_foot_left_anchor(sprite, int(source_spec.get("contactBandPx", 16)))
    if mode == "bottom-center":
        return sprite.width // 2, sprite.height - 1
    raise ValueError(f"unsupported anchor mode: {mode}")


def place_source(
    source: Image.Image,
    source_anchor: tuple[int, int],
    canvas_size: tuple[int, int],
    canvas_anchor: tuple[int, int],
) -> Image.Image:
    out = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    x = int(canvas_anchor[0] - source_anchor[0])
    y = int(canvas_anchor[1] - source_anchor[1])
    out.alpha_composite(source, (x, y))
    return out


def affine_about(
    frame: Image.Image,
    pivot: tuple[int, int],
    *,
    shear_x: float = 0.0,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
    shift_x: float = 0.0,
    shift_y: float = 0.0,
) -> Image.Image:
    px, py = pivot
    transform = np.array([[scale_x, shear_x], [0.0, scale_y]], dtype=float)
    offset = np.array(
        [
            px - scale_x * px - shear_x * py + shift_x,
            py - scale_y * py + shift_y,
        ],
        dtype=float,
    )
    inverse = np.linalg.inv(transform)
    inv_offset = -inverse @ offset
    coeffs = (
        inverse[0, 0],
        inverse[0, 1],
        inv_offset[0],
        inverse[1, 0],
        inverse[1, 1],
        inv_offset[1],
    )
    return frame.transform(
        frame.size,
        Image.Transform.AFFINE,
        coeffs,
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )


def clock_to_screen_degrees(clock_value: float) -> float:
    # 12 -> -90, 3 -> 0, 6 -> 90, 9 -> 180.
    return (clock_value % 12.0) * 30.0 - 90.0


def angular_reveal_mask(
    size: tuple[int, int],
    origin: tuple[int, int],
    pivot: tuple[int, int],
    progress: float,
    start_clock: float,
    end_clock: float,
    feather_deg: float,
) -> Image.Image:
    width, height = size
    start_deg = clock_to_screen_degrees(start_clock)
    end_deg = clock_to_screen_degrees(end_clock)
    while end_deg <= start_deg:
        end_deg += 360.0

    current = start_deg + (end_deg - start_deg) * max(0.0, min(1.0, progress))

    yy, xx = np.mgrid[0:height, 0:width]
    gx = xx + origin[0]
    gy = yy + origin[1]
    angles = np.degrees(np.arctan2(gy - pivot[1], gx - pivot[0]))
    angles[angles < start_deg] += 360.0

    mask = np.zeros((height, width), dtype=np.float32)
    fully_visible = angles <= current - feather_deg
    edge = (angles > current - feather_deg) & (angles <= current)
    mask[fully_visible] = 1.0
    if feather_deg > 0:
        mask[edge] = 1.0 - (angles[edge] - (current - feather_deg)) / feather_deg
    else:
        mask[angles <= current] = 1.0

    return Image.fromarray(np.uint8(np.clip(mask, 0.0, 1.0) * 255), "L")


def color_from_stops(value: int, stops: list[dict[str, Any]]) -> tuple[int, int, int]:
    x = value / 255.0
    ordered = sorted(stops, key=lambda stop: float(stop["at"]))
    if x <= float(ordered[0]["at"]):
        return tuple(int(v) for v in ordered[0]["rgb"])
    if x >= float(ordered[-1]["at"]):
        return tuple(int(v) for v in ordered[-1]["rgb"])
    for left, right in zip(ordered, ordered[1:]):
        a = float(left["at"])
        b = float(right["at"])
        if a <= x <= b:
            t = 0.0 if b <= a else (x - a) / (b - a)
            return tuple(
                int(round(float(left["rgb"][i]) + (float(right["rgb"][i]) - float(left["rgb"][i])) * t))
                for i in range(3)
            )
    return tuple(int(v) for v in ordered[-1]["rgb"])


def build_effect_map(effect_source: Image.Image, effect_spec: dict[str, Any]) -> Image.Image:
    image = trim_rgba(effect_source)
    target_width = int(effect_spec.get("width", image.width))
    if target_width != image.width:
        ratio = target_width / image.width
        image = image.resize(
            (target_width, max(1, int(round(image.height * ratio)))),
            Image.Resampling.LANCZOS,
        )

    gray = ImageOps.grayscale(image)
    stops = effect_spec["gradientStops"]
    alpha_gain = float(effect_spec.get("alphaGain", 1.0))
    out = Image.new("RGBA", gray.size, (0, 0, 0, 0))
    gp = gray.load()
    op = out.load()
    for y in range(gray.height):
        for x in range(gray.width):
            value = gp[x, y]
            r, g, b = color_from_stops(value, stops)
            alpha = max(0, min(255, int(round(value * alpha_gain))))
            op[x, y] = (r, g, b, alpha)
    return out


def validate_recipe(recipe: dict[str, Any]) -> None:
    canvas = recipe["canvas"]
    if len(canvas.get("size", [])) != 2:
        raise ValueError("canvas.size must be [width,height]")
    if len(canvas.get("anchor", [])) != 2:
        raise ValueError("canvas.anchor must be [x,y]")
    source_ids = set(recipe["sources"])
    for phase in recipe["phases"]:
        if phase["source"] not in source_ids:
            raise ValueError(f"phase {phase.get('id')} references missing source {phase['source']}")
        if int(phase.get("durationMs", 0)) <= 0:
            raise ValueError(f"phase {phase.get('id')} needs positive durationMs")
    if recipe.get("effect"):
        effect = recipe["effect"]
        if effect["source"] not in source_ids:
            raise ValueError("effect references missing source")


def render(recipe_path: Path, out_dir: Path) -> dict[str, Any]:
    recipe = load_recipe(recipe_path)
    validate_recipe(recipe)

    canvas_size = tuple(int(v) for v in recipe["canvas"]["size"])
    canvas_anchor = tuple(int(v) for v in recipe["canvas"]["anchor"])
    background = tuple(int(v) for v in recipe["canvas"].get("background", [0, 0, 0, 255]))

    source_images: dict[str, Image.Image] = {}
    source_hashes: dict[str, str] = {}
    source_anchors: dict[str, tuple[int, int]] = {}
    repo_root = find_repo_root(recipe_path.parent)

    atlas_cache: dict[str, Image.Image] = {}
    atlas_hashes: dict[str, str] = {}

    for atlas_id, atlas_spec in recipe.get("atlases", {}).items():
        atlas_path = (repo_root / atlas_spec["path"]).resolve()
        if not atlas_path.is_file():
            raise FileNotFoundError(f"missing atlas {atlas_id}: {atlas_path}")

        digest = sha256_file(atlas_path)
        expected_digest = atlas_spec.get("sha256")
        if expected_digest and digest != expected_digest:
            raise ValueError(
                f"atlas {atlas_id} SHA-256 mismatch: expected {expected_digest}, got {digest}"
            )

        opened = Image.open(atlas_path).convert("RGBA")
        expected_size = atlas_spec.get("size")
        if expected_size:
            wanted = tuple(int(v) for v in expected_size)
            if opened.size != wanted:
                raise ValueError(
                    f"atlas {atlas_id} size mismatch: expected {wanted}, got {opened.size}"
                )

        atlas_cache[atlas_id] = opened
        atlas_hashes[atlas_id] = digest

    for source_id, source_spec in recipe["sources"].items():
        kind = source_spec.get("kind", "image")
        if kind == "atlas-cell":
            atlas_id = source_spec["atlas"]
            if atlas_id not in atlas_cache:
                raise ValueError(f"source {source_id} references unknown atlas {atlas_id}")
            raw = crop_atlas_cell(atlas_cache[atlas_id], recipe["atlases"][atlas_id], int(source_spec["cell"]))
            mode = source_spec.get("mode", recipe["atlases"][atlas_id].get("mode", "rgba"))
            # Apply source mode to the cropped cell without round-tripping through disk.
            if mode == "rgba":
                image = raw.convert("RGBA")
            elif mode == "blue-key":
                image = blue_key_to_alpha(raw)
            elif mode == "black-luminance-alpha":
                image = black_luminance_to_alpha(raw)
            else:
                raise ValueError(f"unsupported atlas-cell mode: {mode}")
            source_hashes[source_id] = f"{atlas_hashes[atlas_id]}#cell={source_spec['cell']}"
        elif kind == "image":
            source_path = (repo_root / source_spec["path"]).resolve() if source_spec.get("repoRelative", False) else (recipe_path.parent / source_spec["path"]).resolve()
            if not source_path.is_file():
                raise FileNotFoundError(f"missing source {source_id}: {source_path}")
            image = load_source(source_path, source_spec.get("mode", "rgba"))
            source_hashes[source_id] = sha256_file(source_path)
        else:
            raise ValueError(f"unsupported source kind: {kind}")

        if source_spec.get("trim", True):
            image = trim_rgba(image)
        source_images[source_id] = image
        if source_spec.get("role", "body") == "body":
            source_anchors[source_id] = resolve_anchor(image, source_spec)

    effect_spec = recipe.get("effect")
    effect_map: Image.Image | None = None
    if effect_spec:
        effect_map = build_effect_map(source_images[effect_spec["source"]], effect_spec)

    frames: list[Image.Image] = []
    durations: list[int] = []
    resolved_phases: list[dict[str, Any]] = []

    for index, phase in enumerate(recipe["phases"]):
        source_id = phase["source"]
        placed = place_source(
            source_images[source_id],
            source_anchors[source_id],
            canvas_size,
            canvas_anchor,
        )
        deform = phase.get("deform", {})
        body = affine_about(
            placed,
            canvas_anchor,
            shear_x=float(deform.get("shearX", 0.0)),
            scale_x=float(deform.get("scaleX", 1.0)),
            scale_y=float(deform.get("scaleY", 1.0)),
            shift_x=float(deform.get("shiftX", 0.0)),
            shift_y=float(deform.get("shiftY", 0.0)),
        )

        composite = Image.new("RGBA", canvas_size, background)
        composite.alpha_composite(body)

        effect_state = phase.get("effect")
        if effect_map is not None and effect_state:
            position = tuple(int(v) for v in effect_spec["position"])
            pivot = tuple(int(v) for v in effect_spec["pivot"])
            reveal = angular_reveal_mask(
                effect_map.size,
                position,
                pivot,
                float(effect_state.get("reveal", 0.0)),
                float(effect_spec.get("startClock", 10.0)),
                float(effect_spec.get("endClock", 5.0)),
                float(effect_spec.get("featherDeg", 14.0)),
            )
            visible = ImageChops.multiply(effect_map.getchannel("A"), reveal)

            core_gain = float(effect_state.get("core", 0.0))
            tight_gain = float(effect_state.get("tightGlow", 0.0))
            wide_gain = float(effect_state.get("wideGlow", 0.0))

            core_alpha = visible.point(lambda z, gain=core_gain: int(z * gain))
            tight_alpha = visible.filter(
                ImageFilter.GaussianBlur(float(effect_spec.get("tightBlurPx", 2.4)))
            ).point(lambda z, gain=tight_gain: int(z * float(effect_spec.get("tightOpacity", 0.65)) * gain))
            wide_alpha = visible.filter(
                ImageFilter.GaussianBlur(float(effect_spec.get("wideBlurPx", 7.5)))
            ).point(lambda z, gain=wide_gain: int(z * float(effect_spec.get("wideOpacity", 0.55)) * gain))

            wide_color = tuple(int(v) for v in effect_spec.get("wideGlowRgb", [255, 42, 0]))
            tight_color = tuple(int(v) for v in effect_spec.get("tightGlowRgb", [255, 180, 28]))
            wide = Image.new("RGBA", effect_map.size, (*wide_color, 0))
            wide.putalpha(wide_alpha)
            tight = Image.new("RGBA", effect_map.size, (*tight_color, 0))
            tight.putalpha(tight_alpha)
            core = effect_map.copy()
            core.putalpha(core_alpha)

            composite.alpha_composite(wide, position)
            composite.alpha_composite(tight, position)
            composite.alpha_composite(core, position)

        frames.append(composite.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE, colors=256))
        duration = int(phase["durationMs"])
        durations.append(duration)
        resolved_phases.append(
            {
                "index": index,
                "id": phase["id"],
                "source": source_id,
                "durationMs": duration,
                "deform": phase.get("deform", {}),
                "effect": effect_state or None,
            }
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    gif_path = out_dir / "preview.gif"
    strip_path = out_dir / "strip.png"
    resolved_path = out_dir / "recipe-resolved.json"

    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=1,
        optimize=False,
    )

    rgba_frames = [frame.convert("RGBA") for frame in frames]
    strip = Image.new("RGBA", (canvas_size[0] * len(rgba_frames), canvas_size[1]), (0, 0, 0, 0))
    for i, frame in enumerate(rgba_frames):
        strip.alpha_composite(frame, (i * canvas_size[0], 0))
    strip.save(strip_path)

    resolved = {
        "schema": "pose-lab-v2-procedural-motion-resolved-v1",
        "recipe": str(recipe_path),
        "id": recipe["id"],
        "subject": recipe.get("subject"),
        "rootMotion": False,
        "canvas": recipe["canvas"],
        "sourceHashes": source_hashes,
        "atlasHashes": atlas_hashes,
        "phases": resolved_phases,
        "outputs": {
            "previewGif": str(gif_path),
            "stripPng": str(strip_path),
        },
    }
    resolved_path.write_text(json.dumps(resolved, indent=2) + "\n")
    return resolved


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("recipe", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    recipe_path = args.recipe.resolve()
    recipe = load_recipe(recipe_path)
    validate_recipe(recipe)

    if args.validate_only:
        print("MOTION_RECIPE_VALID")
        print(f"recipe={recipe_path}")
        return 0

    out_dir = args.out.resolve() if args.out else (recipe_path.parent / "generated").resolve()
    resolved = render(recipe_path, out_dir)
    print("MOTION_RECIPE_RENDER_OK")
    print(f"id={resolved['id']}")
    print(f"preview={resolved['outputs']['previewGif']}")
    print(f"strip={resolved['outputs']['stripPng']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
