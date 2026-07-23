#!/usr/bin/env python3
"""Extract Blender's embedded preview thumbnail without requiring Blender."""

from __future__ import annotations

import argparse
import struct
from pathlib import Path

from PIL import Image


def extract_preview(source: Path) -> Image.Image:
    data = source.read_bytes()
    if len(data) < 12 or not data.startswith(b"BLENDER"):
        raise ValueError(f"{source} is not a Blender file")

    pointer_marker = chr(data[7])
    endian_marker = chr(data[8])
    pointer_size = {"_": 4, "-": 8}.get(pointer_marker)
    endian = {"v": "<", "V": ">"}.get(endian_marker)
    if pointer_size is None or endian is None:
        raise ValueError("unsupported Blender file header")

    header_size = 4 + 4 + pointer_size + 4 + 4
    offset = 12
    while offset + header_size <= len(data):
        code = data[offset : offset + 4].rstrip(b"\0")
        size = struct.unpack_from(f"{endian}I", data, offset + 4)[0]
        payload_offset = offset + header_size
        payload_end = payload_offset + size
        if payload_end > len(data):
            raise ValueError("truncated Blender block")
        if code == b"TEST":
            width, height = struct.unpack_from(f"{endian}II", data, payload_offset)
            rgba = data[payload_offset + 8 : payload_end]
            expected = width * height * 4
            if width <= 0 or height <= 0 or len(rgba) < expected:
                raise ValueError("invalid Blender preview block")
            image = Image.frombytes("RGBA", (width, height), rgba[:expected])
            return image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        offset = payload_end

    raise ValueError("Blender file has no embedded preview")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--scale", type=int, default=4)
    args = parser.parse_args()

    image = extract_preview(args.source)
    if args.scale > 1:
        image = image.resize(
            (image.width * args.scale, image.height * args.scale),
            Image.Resampling.NEAREST,
        )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    print(f"{args.output} {image.width}x{image.height}")


if __name__ == "__main__":
    main()
