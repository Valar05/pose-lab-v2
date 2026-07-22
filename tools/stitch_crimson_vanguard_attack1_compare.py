#!/usr/bin/env python3
"""Build a legible, self-contained visual review sheet from Blender evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw


TILE_SIZE = (480, 300)
CAPTION_HEIGHT = 34
HEADER_HEIGHT = 78
COLUMNS = 2
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def tile_caption(caption: str, status: str) -> tuple[str, tuple[int, int, int]]:
    if caption.startswith("REJECTED BASELINE"):
        return f"{caption} — REJECTED", (255, 150, 130)
    if "CURRENT" in caption:
        return f"{caption} — CURRENT", (170, 220, 255)
    if status == "FAIL":
        return f"{caption} — GATE FAIL", (255, 180, 150)
    return f"{caption} — EVIDENCE", (220, 220, 220)


def make_tile(image_path: Path, caption: str, status: str) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail(TILE_SIZE)
    canvas = Image.new("RGB", (TILE_SIZE[0], TILE_SIZE[1] + CAPTION_HEIGHT), (14, 16, 18))
    canvas.paste(image, ((TILE_SIZE[0] - image.width) // 2, CAPTION_HEIGHT))
    draw = ImageDraw.Draw(canvas)
    rendered_caption, color = tile_caption(caption, status)
    draw.text((10, 10), rendered_caption, fill=color)
    return canvas


def overall_evidence_status(manifest: dict) -> tuple[str, list[str]]:
    """Derive the sheet verdict from the complete evidence gate, never a clean frame alone."""
    reasons: list[str] = []
    if manifest.get("status") != "PASS":
        reasons.append(f"manifest.status={manifest.get('status') or 'missing'}")
    author_failures = manifest.get("authorFailures") or []
    if author_failures:
        codes = [str(item.get("code") or "author failure") for item in author_failures if isinstance(item, dict)]
        reasons.append("authorFailures=" + ", ".join(codes[:4]))
    if "candidateParity" in manifest:
        parity = manifest.get("candidateParity") or {}
        if parity.get("status") != "PASS":
            reasons.append(f"candidateParity.status={parity.get('status') or 'missing'}")
        if parity.get("exactFramePayloadMatch") is not True:
            reasons.append("candidateParity.exactFramePayloadMatch=false")
    frame_failures = [
        failure
        for frame in manifest.get("frames") or []
        for failure in frame.get("failures") or []
    ]
    if frame_failures:
        reasons.append(f"frameFailures={len(frame_failures)}")
    frame_zero = (
        manifest.get("candidate") == "crimson-combat-ready-vanguard-frame0-4"
        or manifest.get("authoredFrameZero") is not None
    )
    if frame_zero:
        parity = manifest.get("candidateParity") or {}
        if not manifest.get("candidateParity"):
            reasons.append("candidateParity=missing")
        for field in [
            "exactFramePayloadMatch",
            "authoredGlbShaMatch",
            "committedStatusMatch",
            "committedAuthorEligibleBeforeCandidateParity",
        ]:
            if parity.get(field) is not True:
                reasons.append(f"candidateParity.{field}=false-or-missing")
        if (manifest.get("authoredFrameZero") or {}).get("exactAuthoredGlb") is not True:
            reasons.append("authoredFrameZero.exactAuthoredGlb=false-or-missing")
        if manifest.get("authorReport", {}).get("protectedBodyParity", {}).get("status") != "PASS":
            reasons.append("authorReport.protectedBodyParity.status!=PASS")
        checkpoint = manifest.get("emptyHandedArmCheckpoint") or {}
        if not is_image_filename(checkpoint.get("image")):
            reasons.append("emptyHandedArmCheckpoint.image=missing")
        for frame in manifest.get("frames") or []:
            expected_views = [
                str(view)
                for view in (frame.get("baselineComparison") or {}).get("views") or []
            ]
            rejected_views = {
                str(view.get("view"))
                for view in frame.get("rejectedBaselineViews") or []
                if isinstance(view, dict) and is_image_filename(view.get("image"))
            }
            current_views = {
                str(view.get("view"))
                for view in frame.get("currentViews") or []
                if isinstance(view, dict) and is_image_filename(view.get("image"))
            }
            if not expected_views or rejected_views != set(expected_views) or current_views != set(expected_views):
                reasons.append(
                    f"frame[{frame.get('label') or '?'}].sameCameraPairs=incomplete"
                )
    return ("FAIL", reasons) if reasons else ("PASS", [])


def is_image_filename(value: object) -> bool:
    return isinstance(value, str) and Path(value).suffix.lower() in IMAGE_SUFFIXES


def image_entries(value: object, trail: tuple[str, ...] = ()) -> list[tuple[str, str]]:
    """Read either a direct image, a view record, or nested/list view records."""
    if is_image_filename(value):
        return [(trail[-1] if trail else "view", str(value))]
    if isinstance(value, list):
        entries: list[tuple[str, str]] = []
        for index, item in enumerate(value, start=1):
            entries.extend(image_entries(item, (*trail, f"view-{index}")))
        return entries
    if not isinstance(value, dict):
        return []
    entries = []
    direct_image = value.get("image")
    if is_image_filename(direct_image):
        label = str(value.get("view") or value.get("label") or value.get("name") or (trail[-1] if trail else "view"))
        entries.append((label, direct_image))
    for key, nested in value.items():
        if key in {"image", "imageSha256", "sha256"}:
            continue
        if isinstance(nested, (dict, list)) or is_image_filename(nested):
            entries.extend(image_entries(nested, (*trail, str(key))))
    return entries


def comparison_evidence(manifest: dict) -> list[tuple[str, str, str]]:
    """Find explicit old-vs-new view groups while tolerating renderer schema refinements."""
    found: list[tuple[str, str, str]] = []

    def walk(value: object, paired: bool = False) -> None:
        if isinstance(value, list):
            for item in value:
                walk(item, paired)
            return
        if not isinstance(value, dict):
            return
        for key, nested in value.items():
            normalized = "".join(character for character in str(key).lower() if character.isalnum())
            next_paired = paired or "oldvsnew" in normalized or "beforeafter" in normalized
            category = None
            if "rejectedbaseline" in normalized or (next_paired and normalized in {"old", "baseline", "rejected"}):
                category = "REJECTED BASELINE"
            elif "currentcandidate" in normalized or ("current" in normalized and "view" in normalized) or (next_paired and normalized in {"new", "current", "candidate"}):
                category = "CURRENT"
            if category:
                for detail, filename in image_entries(nested, (str(key),)):
                    found.append((category, detail, filename))
                continue
            walk(nested, next_paired)

    walk(manifest)
    return found


def paired_comparison_evidence(manifest: dict) -> list[tuple[str, str, str]]:
    """Order exact same-camera rejected/current views as adjacent two-column pairs."""
    found: list[tuple[str, str, str]] = []
    for frame in manifest.get("frames") or []:
        rejected = {
            str(view.get("view") or f"view-{index}"): view.get("image")
            for index, view in enumerate(frame.get("rejectedBaselineViews") or [], start=1)
            if isinstance(view, dict) and is_image_filename(view.get("image"))
        }
        current = {
            str(view.get("view") or f"view-{index}"): view.get("image")
            for index, view in enumerate(frame.get("currentViews") or [], start=1)
            if isinstance(view, dict) and is_image_filename(view.get("image"))
        }
        declared_order = (frame.get("baselineComparison") or {}).get("views") or []
        view_order = list(dict.fromkeys([
            *(str(view) for view in declared_order),
            *rejected.keys(),
            *current.keys(),
        ]))
        frame_label = str(frame.get("label") or "frame")
        for view_name in view_order:
            detail = f"{frame_label} / {view_name}"
            if view_name in rejected:
                found.append(("REJECTED BASELINE", detail, str(rejected[view_name])))
            if view_name in current:
                found.append(("CURRENT", detail, str(current[view_name])))
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        raise SystemExit(f"missing manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    root = manifest_path.parent
    frames = manifest.get("frames") or []
    if not frames:
        raise SystemExit("manifest has no frames")

    status, status_reasons = overall_evidence_status(manifest)
    tiles = []
    included = []
    included_set = set()

    def append_evidence(caption: str, filename: object) -> None:
        if not is_image_filename(filename) or filename in included_set:
            return
        image_path = root / str(filename)
        if not image_path.exists():
            raise SystemExit(f"manifest references missing image: {image_path}")
        tiles.append(make_tile(image_path, caption, status))
        included.append(str(filename))
        included_set.add(str(filename))

    for category, detail, filename in paired_comparison_evidence(manifest):
        append_evidence(f"{category} / {detail}", filename)

    # Preserve compatibility with older/nested manifests after the explicit
    # same-camera pairs. Filename dedupe keeps current schema views from repeating.
    for category, detail, filename in comparison_evidence(manifest):
        append_evidence(f"{category} / {detail}", filename)

    checkpoint = manifest.get("emptyHandedArmCheckpoint") or {}
    for detail, filename in image_entries(checkpoint, ("empty-handed arm checkpoint",)):
        append_evidence(f"CURRENT / {detail}", filename)

    for frame in frames:
        evidence = [("source + CURRENT candidate", frame.get("image"))]
        evidence.extend(
            (f"reference / {view.get('view', 'view')}", view.get("image"))
            for view in frame.get("referenceViews") or []
        )
        evidence.extend(
            (f"CURRENT Crimson / {view.get('view', 'view')}", view.get("image"))
            for view in frame.get("crimsonViews") or []
        )
        for view_name, filename in evidence:
            caption = f"{frame['label']} / {view_name}"
            append_evidence(caption, filename)

    if not tiles:
        raise SystemExit("manifest produced no reviewable images")
    rows = (len(tiles) + COLUMNS - 1) // COLUMNS
    sheet = Image.new(
        "RGB",
        (TILE_SIZE[0] * COLUMNS, HEADER_HEIGHT + (TILE_SIZE[1] + CAPTION_HEIGHT) * rows),
        (8, 9, 10),
    )
    draw = ImageDraw.Draw(sheet)
    header_color = (255, 130, 110) if status == "FAIL" else (150, 255, 160)
    draw.text((16, 12), f"OVERALL EVIDENCE STATUS: {status}", fill=header_color)
    reason_text = "; ".join(status_reasons) if status_reasons else "all manifest, authoring, parity, and frame gates passed"
    draw.text((16, 39), reason_text[:220], fill=(220, 220, 220))
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % COLUMNS) * TILE_SIZE[0], HEADER_HEIGHT + (index // COLUMNS) * (TILE_SIZE[1] + CAPTION_HEIGHT)))
    out = root / "contact_sheet.png"
    sheet.save(out)
    manifest["contactSheet"] = out.name
    manifest["contactSheetStatus"] = status
    manifest["contactSheetStatusReasons"] = status_reasons
    manifest["contactSheetImages"] = included
    manifest["contactSheetContract"] = "overall status inherits manifest, authoring, candidate-parity, and frame gates; rejected baseline and current arm evidence precede preserved source/current views"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"ok": status == "PASS", "status": status, "contactSheet": str(out), "images": len(included)}, indent=2))
    if status != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
