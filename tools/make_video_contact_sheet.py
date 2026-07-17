#!/usr/bin/env python3
"""Extract a keyed contact sheet from a source video or ledger clip."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "generated" / "video-contact-sheets"
SCHEMA = "pose-lab-v2-video-contact-sheet-v1"
TOOL = "make_video_contact_sheet.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return value[:96] or "contact-sheet"


def probe_duration(video: Path, ffprobe: str) -> float:
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(video)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def load_ledger_clip(path: Path, clip_id: str) -> tuple[dict, dict]:
    ledger = json.loads(path.read_text())
    for clip in ledger.get("clips", []):
        if clip.get("id") == clip_id:
            return ledger, clip
    raise SystemExit(f"clip not found in ledger: {clip_id}")


def timestamps(start: float, end: float, count: int, explicit: str | None) -> list[float]:
    if explicit:
        return [round(float(value), 6) for value in explicit.split(",") if value.strip()]
    if count <= 1:
        return [round(start, 6)]
    span = end - start
    return [round(start + span * (index / (count - 1)), 6) for index in range(count)]


def extract_frame(video: Path, time_value: float, out_path: Path, ffmpeg: str, width: int) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    vf = f"scale={width}:-1"
    subprocess.run(
        [ffmpeg, "-y", "-ss", f"{time_value:.6f}", "-i", str(video), "-frames:v", "1", "-vf", vf, str(out_path)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def draw_sheet(frames: list[dict], out_path: Path, columns: int) -> None:
    thumbs = [Image.open(frame["path"]).convert("RGB") for frame in frames]
    if not thumbs:
        raise SystemExit("no frames extracted")
    label_h = 44
    cell_w = max(image.width for image in thumbs)
    cell_h = max(image.height for image in thumbs) + label_h
    rows = math.ceil(len(thumbs) / columns)
    sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 18)
        small = ImageFont.truetype("DejaVuSans.ttf", 14)
    except OSError:
        font = small = None
    for index, (frame, image) in enumerate(zip(frames, thumbs)):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        sheet.paste(image, (x, y))
        label = frame["label"]
        draw.text((x + 8, y + image.height + 5), label, fill=(245, 245, 245), font=font)
        draw.text((x + 8, y + image.height + 26), f"{frame['time']:.3f}s", fill=(180, 190, 200), font=small)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def write_html(manifest: dict, path: Path) -> None:
    cards = []
    for frame in manifest["frames"]:
        image = frame["image"]
        cards.append(
            f"<figure><img src='{image}'><figcaption><b>{frame['label']}</b><br>{frame['time']:.3f}s</figcaption></figure>"
        )
    path.write_text("""<!doctype html><meta charset='utf-8'>
<title>Video Contact Sheet</title>
<style>body{margin:0;background:#101214;color:#eee;font:15px system-ui}main{padding:16px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}figure{margin:0;background:#1c2024;padding:8px;border-radius:6px}img{width:100%;display:block}figcaption{padding-top:6px;color:#cbd5df}</style>
<main><h1>Video Contact Sheet</h1><p>Diagnostic extraction surface. Metadata is preserved in manifest.json.</p><section>""" + "".join(cards) + "</section></main>\n")


def update_ledger_artifact(ledger_path: Path, clip_id: str, manifest_path: Path, sheet_path: Path, html_path: Path) -> None:
    ledger = json.loads(ledger_path.read_text())
    clip = None
    for candidate in ledger.get("clips", []):
        if candidate.get("id") == clip_id:
            clip = candidate
            break
    if clip is None:
        raise SystemExit(f"clip not found while updating ledger: {clip_id}")
    artifact = {
        "kind": "video-contact-sheet",
        "manifest": str(manifest_path),
        "manifestSha256": sha256(manifest_path),
        "contactSheet": str(sheet_path),
        "contactSheetSha256": sha256(sheet_path),
        "html": str(html_path),
        "htmlSha256": sha256(html_path),
        "createdAt": utc_now(),
        "tool": TOOL,
    }
    clip.setdefault("artifacts", []).append(artifact)
    clip["updatedAt"] = utc_now()
    ledger.setdefault("events", []).append({
        "at": utc_now(),
        "tool": TOOL,
        "kind": "artifact.video-contact-sheet",
        "payload": {
            "clipId": clip_id,
            "manifest": str(manifest_path),
            "contactSheet": str(sheet_path),
        },
    })
    ledger["updatedAt"] = utc_now()
    ledger_path.write_text(json.dumps(ledger, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video")
    parser.add_argument("--ledger")
    parser.add_argument("--clip")
    parser.add_argument("--label")
    parser.add_argument("--out-dir")
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--times", help="comma-separated absolute source-video timestamps")
    parser.add_argument("--thumb-width", type=int, default=360)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()

    ledger = clip = None
    if args.ledger:
        if not args.clip:
            raise SystemExit("--clip is required with --ledger")
        ledger, clip = load_ledger_clip(Path(args.ledger), args.clip)
        video = Path(ledger["source"]["path"])
        label = args.label or clip["label"]
        start = float(clip["start"])
        end = float(clip["end"])
    else:
        if not args.video:
            raise SystemExit("--video or --ledger is required")
        video = Path(args.video)
        label = args.label or video.stem
        start = 0.0
        end = probe_duration(video, args.ffprobe)

    if not video.exists():
        raise SystemExit(f"video not found: {video}")
    out_dir = Path(args.out_dir) if args.out_dir else OUT_ROOT / slugify(video.stem) / slugify(args.clip or label)
    frame_dir = out_dir / "frames"
    selected_times = timestamps(start, end, args.count, args.times)
    frames = []
    for index, time_value in enumerate(selected_times):
        frame_id = f"f{index:03d}"
        path = frame_dir / f"{frame_id}_{time_value:.3f}.jpg"
        extract_frame(video, time_value, path, args.ffmpeg, args.thumb_width)
        frames.append({
            "id": frame_id,
            "label": frame_id,
            "time": round(time_value, 6),
            "image": str(path.relative_to(out_dir)),
            "path": str(path),
            "sha256": sha256(path),
        })

    sheet_path = out_dir / "contact_sheet.jpg"
    draw_sheet(frames, sheet_path, args.columns)
    manifest = {
        "schema": SCHEMA,
        "status": "draft",
        "tool": TOOL,
        "generatedAt": utc_now(),
        "source": {
            "path": str(video),
            "sha256": sha256(video),
            "ledger": str(Path(args.ledger).resolve()) if args.ledger else None,
            "clipId": args.clip,
            "clipLabel": label,
            "clipStart": start,
            "clipEnd": end,
        },
        "frames": [{key: value for key, value in frame.items() if key != "path"} for frame in frames],
        "contactSheet": "contact_sheet.jpg",
        "html": "contact_sheet.html",
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    html_path = out_dir / "contact_sheet.html"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    write_html(manifest, html_path)
    if args.ledger and args.clip:
        update_ledger_artifact(Path(args.ledger), args.clip, manifest_path, sheet_path, html_path)
    print(str(manifest_path))


if __name__ == "__main__":
    main()
