#!/usr/bin/env python3
"""Maintain source-video clip ranges for local animation extraction."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "generated" / "video-ledgers"
SCHEMA = "pose-lab-v2-video-clip-ledger-v1"
TOOL = "video_clip_ledger.py"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-._")
    return value[:96] or "video"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_time(value: str | float | int) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if ":" not in text:
        return float(text)
    parts = [float(part) for part in text.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    raise ValueError(f"invalid time value: {value}")


def rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def ledger_path_for(video: Path, out_dir: Path) -> Path:
    return out_dir / f"{slugify(video.stem)}.ledger.json"


def event(kind: str, payload: dict) -> dict:
    return {
        "at": utc_now(),
        "tool": TOOL,
        "kind": kind,
        "payload": payload,
    }


def load(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


def write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def init_ledger(args: argparse.Namespace) -> None:
    video = Path(args.video).expanduser().resolve()
    if not video.exists():
        raise SystemExit(f"source video not found: {video}")
    out_dir = Path(args.out_dir).resolve()
    path = Path(args.ledger).resolve() if args.ledger else ledger_path_for(video, out_dir)
    existing = load(path)
    if existing and not args.force:
        print(str(path))
        return
    data = {
        "schema": SCHEMA,
        "status": "draft",
        "source": {
            "path": str(video),
            "name": video.name,
            "sha256": sha256(video),
        },
        "clips": [],
        "events": [event("ledger.init", {"video": str(video)})],
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
    }
    write(path, data)
    print(str(path))


def next_clip_id(ledger: dict, label: str) -> str:
    base = slugify(label).lower()
    used = {clip["id"] for clip in ledger.get("clips", [])}
    if base not in used:
        return base
    index = 2
    while f"{base}-{index}" in used:
        index += 1
    return f"{base}-{index}"


def add_clip(args: argparse.Namespace) -> None:
    path = Path(args.ledger).resolve()
    ledger = load(path)
    if ledger.get("schema") != SCHEMA:
        raise SystemExit(f"not a {SCHEMA} ledger: {path}")
    start = parse_time(args.start)
    end = parse_time(args.end)
    if end <= start:
        raise SystemExit("clip end must be greater than clip start")
    clip = {
        "id": args.id or next_clip_id(ledger, args.label),
        "label": args.label,
        "intent": args.intent or "",
        "status": args.status,
        "start": round(start, 6),
        "end": round(end, 6),
        "duration": round(end - start, 6),
        "notes": args.notes or "",
        "keyFrames": [],
        "artifacts": [],
        "metadata": {},
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
    }
    if any(existing["id"] == clip["id"] for existing in ledger.get("clips", [])):
        raise SystemExit(f"clip id already exists: {clip['id']}")
    ledger.setdefault("clips", []).append(clip)
    ledger.setdefault("events", []).append(event("clip.add", {"clipId": clip["id"], "label": clip["label"]}))
    ledger["updatedAt"] = utc_now()
    write(path, ledger)
    print(clip["id"])


def add_artifact(args: argparse.Namespace) -> None:
    path = Path(args.ledger).resolve()
    ledger = load(path)
    clip = find_clip(ledger, args.clip)
    artifact = {
        "kind": args.kind,
        "path": args.path,
        "sha256": sha256(Path(args.path)) if args.hash and Path(args.path).exists() else None,
        "metadata": json.loads(args.metadata) if args.metadata else {},
        "createdAt": utc_now(),
    }
    clip.setdefault("artifacts", []).append(artifact)
    clip["updatedAt"] = utc_now()
    ledger.setdefault("events", []).append(event("artifact.add", {"clipId": clip["id"], "kind": args.kind, "path": args.path}))
    ledger["updatedAt"] = utc_now()
    write(path, ledger)
    print(json.dumps(artifact, indent=2))


def find_clip(ledger: dict, clip_id: str) -> dict:
    for clip in ledger.get("clips", []):
        if clip.get("id") == clip_id:
            return clip
    raise SystemExit(f"clip not found: {clip_id}")


def show(args: argparse.Namespace) -> None:
    ledger = load(Path(args.ledger).resolve())
    if args.clip:
        print(json.dumps(find_clip(ledger, args.clip), indent=2))
    else:
        print(json.dumps(ledger, indent=2))


def list_clips(args: argparse.Namespace) -> None:
    ledger = load(Path(args.ledger).resolve())
    for clip in ledger.get("clips", []):
        print(f"{clip['id']}\t{clip['start']:.3f}-{clip['end']:.3f}\t{clip['status']}\t{clip['label']}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init")
    init.add_argument("--video", required=True)
    init.add_argument("--ledger")
    init.add_argument("--out-dir", default=str(DEFAULT_OUT))
    init.add_argument("--force", action="store_true")
    init.set_defaults(func=init_ledger)

    add = sub.add_parser("add-clip")
    add.add_argument("--ledger", required=True)
    add.add_argument("--label", required=True)
    add.add_argument("--start", required=True)
    add.add_argument("--end", required=True)
    add.add_argument("--id")
    add.add_argument("--intent")
    add.add_argument("--notes")
    add.add_argument("--status", default="draft", choices=["draft", "candidate", "rejected", "accepted", "promoted"])
    add.set_defaults(func=add_clip)

    artifact = sub.add_parser("add-artifact")
    artifact.add_argument("--ledger", required=True)
    artifact.add_argument("--clip", required=True)
    artifact.add_argument("--kind", required=True)
    artifact.add_argument("--path", required=True)
    artifact.add_argument("--metadata")
    artifact.add_argument("--hash", action="store_true")
    artifact.set_defaults(func=add_artifact)

    list_cmd = sub.add_parser("list")
    list_cmd.add_argument("--ledger", required=True)
    list_cmd.set_defaults(func=list_clips)

    show_cmd = sub.add_parser("show")
    show_cmd.add_argument("--ledger", required=True)
    show_cmd.add_argument("--clip")
    show_cmd.set_defaults(func=show)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(1)
