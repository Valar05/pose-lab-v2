#!/usr/bin/env python3
"""Stitch Crimson/Vanguard Blender comparison frames into a contact sheet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        raise SystemExit(f'missing manifest: {manifest_path}')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    root = manifest_path.parent
    frames = manifest.get('frames') or []
    if not frames:
        raise SystemExit('manifest has no frames')
    thumbs = []
    for frame in frames:
        image_path = root / frame['image']
        image = Image.open(image_path).convert('RGB')
        image.thumbnail((360, 220))
        canvas = Image.new('RGB', (360, 258), (14, 16, 18))
        canvas.paste(image, ((360 - image.width) // 2, 26))
        draw = ImageDraw.Draw(canvas)
        status = 'FAIL' if frame.get('failures') else 'PASS'
        draw.text((8, 6), f"{frame['label']} {status}", fill=(255, 220, 120) if status == 'FAIL' else (190, 255, 190))
        if frame.get('failures'):
            draw.text((8, 238), frame['failures'][0]['code'][:54], fill=(255, 150, 150))
        thumbs.append(canvas)
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (360 * cols, 258 * rows), (8, 9, 10))
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((index % cols) * 360, (index // cols) * 258))
    out = root / 'contact_sheet.png'
    sheet.save(out)
    manifest['contactSheet'] = out.name
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({'ok': True, 'contactSheet': str(out)}, indent=2))


if __name__ == '__main__':
    main()
