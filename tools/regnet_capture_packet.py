#!/usr/bin/env python3
"""Turn a video-landmark sidecar into sparse Regnet-directed pose keys."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "pose-lab-v2-regnet-capture-direction-v1"
LANDMARK_SCHEMA = "pose-lab-v2-humanoid-landmarks-v1"
JOINTS = (
    "Hips", "Spine02", "Spine01", "Spine", "neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
)
BONES = (
    ("Hips", "Spine02"), ("Spine02", "Spine01"), ("Spine01", "Spine"),
    ("Spine", "neck"), ("neck", "Head"),
    ("Spine", "LeftShoulder"), ("LeftShoulder", "LeftArm"),
    ("LeftArm", "LeftForeArm"), ("LeftForeArm", "LeftHand"),
    ("Spine", "RightShoulder"), ("RightShoulder", "RightArm"),
    ("RightArm", "RightForeArm"), ("RightForeArm", "RightHand"),
    ("Hips", "LeftUpLeg"), ("LeftUpLeg", "LeftLeg"),
    ("LeftLeg", "LeftFoot"), ("LeftFoot", "LeftToeBase"),
    ("Hips", "RightUpLeg"), ("RightUpLeg", "RightLeg"),
    ("RightLeg", "RightFoot"), ("RightFoot", "RightToeBase"),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sub(a: tuple[float, ...], b: tuple[float, ...]) -> tuple[float, float, float]:
    return a[0] - b[0], a[1] - b[1], a[2] - b[2]


def length(value: tuple[float, ...]) -> float:
    return math.sqrt(sum(axis * axis for axis in value))


def unit(value: tuple[float, ...]) -> tuple[float, float, float]:
    scale = length(value) or 1.0
    return value[0] / scale, value[1] / scale, value[2] / scale


def midpoint(a: dict, b: dict, confidence: float | None = None) -> dict:
    return {
        "x": (a["x"] + b["x"]) * 0.5,
        "y": (a["y"] + b["y"]) * 0.5,
        "z": (a["z"] + b["z"]) * 0.5,
        "confidence": confidence if confidence is not None else min(a["confidence"], b["confidence"]),
    }


def between(a: dict, b: dict, factor: float) -> dict:
    return {
        "x": a["x"] + (b["x"] - a["x"]) * factor,
        "y": a["y"] + (b["y"] - a["y"]) * factor,
        "z": a["z"] + (b["z"] - a["z"]) * factor,
        "confidence": min(a["confidence"], b["confidence"]),
    }


def point(item: dict) -> tuple[float, float, float]:
    return float(item["x"]), float(item["y"]), float(item.get("z", 0.0))


def normalized(frame: dict) -> dict:
    landmarks = frame["landmarks"]
    missing = sorted(set(JOINTS) - set(landmarks))
    if missing:
        raise ValueError(f"frame {frame.get('frame')}: missing joints {missing}")
    hips = point(landmarks["Hips"])
    scale = length(sub(point(landmarks["Head"]), hips)) or 1.0
    positions = {
        name: [round(axis / scale, 6) for axis in sub(point(landmarks[name]), hips)]
        for name in JOINTS
    }
    directions = {
        f"{start}>{end}": [
            round(axis, 6)
            for axis in unit(sub(point(landmarks[end]), point(landmarks[start])))
        ]
        for start, end in BONES
    }
    confidence = {
        name: round(float(landmarks[name].get("confidence", 1.0)), 6)
        for name in JOINTS
    }
    return {"positions": positions, "directions": directions, "confidence": confidence}


def descriptor_distance(a: dict, b: dict, confidence: dict | None = None) -> float:
    total = 0.0
    weight_sum = 0.0
    for start, end in BONES:
        key = f"{start}>{end}"
        av = a["directions"][key]
        bv = b["directions"][key]
        weight = min(confidence.get(start, 1.0), confidence.get(end, 1.0)) if confidence else 1.0
        total += weight * math.sqrt(sum((x - y) ** 2 for x, y in zip(av, bv)))
        weight_sum += weight
    return total / max(weight_sum, 1e-9)


def frame_energy(previous: dict | None, current: dict) -> float:
    if previous is None:
        return 0.0
    return descriptor_distance(previous, current, current["confidence"])


def probe_video(path: Path) -> dict:
    command = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=index,codec_type,width,height,avg_frame_rate",
        "-of", "json", str(path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return json.loads(result.stdout)
    except (FileNotFoundError, subprocess.CalledProcessError):
        return {"status": "ffprobe-unavailable"}


def local_maxima(values: list[float]) -> list[int]:
    return [
        index for index in range(1, len(values) - 1)
        if values[index] >= values[index - 1] and values[index] > values[index + 1]
    ]


def select_keys(frames: list[dict], count: int, duplicate_threshold: float) -> tuple[list[int], list[dict]]:
    if count >= len(frames):
        return list(range(len(frames))), []
    energy = [frame["energy"] for frame in frames]
    selected = {0, len(frames) - 1}
    for index in sorted(local_maxima(energy), key=lambda item: energy[item], reverse=True):
        if len(selected) >= count:
            break
        selected.add(index)
    while len(selected) < count:
        candidates = [index for index in range(len(frames)) if index not in selected]
        choice = max(
            candidates,
            key=lambda index: min(
                descriptor_distance(frames[index], frames[other], frames[index]["confidence"])
                + abs(index - other) / len(frames) * 0.15
                for other in selected
            ),
        )
        selected.add(choice)
    ordered = sorted(selected)
    kept: list[int] = []
    rejected: list[dict] = []
    for index in ordered:
        nearest = min(
            (descriptor_distance(frames[index], frames[other], frames[index]["confidence"]) for other in kept),
            default=math.inf,
        )
        if index not in {0, len(frames) - 1} and nearest < duplicate_threshold:
            rejected.append({
                "frame": frames[index]["frame"],
                "timeSeconds": frames[index]["timeSeconds"],
                "reason": "near-duplicate-pose",
                "nearestDistance": round(nearest, 6),
            })
        else:
            kept.append(index)
    return kept, rejected


def match_vault(frame: dict, vault: dict, limit: int) -> list[dict]:
    matches = []
    for clip in vault["clips"]:
        for sample in clip["samples"]:
            matches.append({
                "clipId": clip["id"],
                "clipTitle": clip["title"],
                "timeSeconds": sample["timeSeconds"],
                "distance": round(descriptor_distance(frame, sample, frame["confidence"]), 6),
                "tags": clip.get("tags", []),
            })
    matches.sort(key=lambda item: (item["distance"], item["clipId"], item["timeSeconds"]))
    return matches[:limit]


def contact_hypotheses(frames: list[dict], threshold: float = 0.025) -> list[dict]:
    hypotheses = []
    for side in ("Left", "Right"):
        name = f"{side}Foot"
        active = None
        for index, frame in enumerate(frames):
            speed = 0.0 if index == 0 else length(sub(
                tuple(frame["positions"][name]), tuple(frames[index - 1]["positions"][name])
            ))
            planted = speed <= threshold and frame["confidence"].get(name, 0.0) >= 0.5
            if planted and active is None:
                active = index
            if active is not None and (not planted or index == len(frames) - 1):
                end = index if planted and index == len(frames) - 1 else index - 1
                if end > active:
                    hypotheses.append({
                        "joint": name,
                        "startFrame": frames[active]["frame"],
                        "endFrame": frames[end]["frame"],
                        "startTimeSeconds": frames[active]["timeSeconds"],
                        "endTimeSeconds": frames[end]["timeSeconds"],
                        "status": "proposed-requires-human-review",
                    })
                active = None
    return hypotheses


def extract_mediapipe(args: argparse.Namespace) -> None:
    try:
        import cv2  # type: ignore
        import mediapipe as mp  # type: ignore
    except ImportError as error:
        raise SystemExit(
            "extract requires opencv-python and mediapipe; install them outside the locked repo runtime"
        ) from error
    video = Path(args.video).resolve()
    capture = cv2.VideoCapture(str(video))
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=args.model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=args.min_confidence,
        min_tracking_confidence=args.min_confidence,
    )
    landmark = mp.solutions.pose.PoseLandmark
    direct = {
        "LeftArm": landmark.LEFT_SHOULDER,
        "LeftForeArm": landmark.LEFT_ELBOW, "LeftHand": landmark.LEFT_WRIST,
        "RightArm": landmark.RIGHT_SHOULDER,
        "RightForeArm": landmark.RIGHT_ELBOW, "RightHand": landmark.RIGHT_WRIST,
        "LeftUpLeg": landmark.LEFT_HIP, "LeftLeg": landmark.LEFT_KNEE,
        "LeftFoot": landmark.LEFT_ANKLE, "LeftToeBase": landmark.LEFT_FOOT_INDEX,
        "RightUpLeg": landmark.RIGHT_HIP, "RightLeg": landmark.RIGHT_KNEE,
        "RightFoot": landmark.RIGHT_ANKLE, "RightToeBase": landmark.RIGHT_FOOT_INDEX,
        "Head": landmark.NOSE,
    }
    frames = []
    frame_index = 0
    while True:
        ok, image = capture.read()
        if not ok:
            break
        result = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if not result.pose_world_landmarks:
            frame_index += 1
            continue
        raw = result.pose_world_landmarks.landmark

        def get(which) -> dict:
            item = raw[which.value]
            return {
                "x": item.x, "y": -item.y, "z": item.z,
                "confidence": min(item.visibility, item.presence),
            }

        points = {name: get(which) for name, which in direct.items()}
        left_hip, right_hip = get(landmark.LEFT_HIP), get(landmark.RIGHT_HIP)
        left_shoulder, right_shoulder = get(landmark.LEFT_SHOULDER), get(landmark.RIGHT_SHOULDER)
        hips = midpoint(left_hip, right_hip)
        shoulders = midpoint(left_shoulder, right_shoulder)
        points["LeftShoulder"] = between(shoulders, left_shoulder, 0.35)
        points["RightShoulder"] = between(shoulders, right_shoulder, 0.35)
        points["Hips"] = hips
        points["Spine02"] = between(hips, shoulders, 0.28)
        points["Spine01"] = between(hips, shoulders, 0.56)
        points["Spine"] = between(hips, shoulders, 0.82)
        points["neck"] = shoulders
        frames.append({
            "frame": frame_index,
            "timeSeconds": round(frame_index / fps, 6),
            "landmarks": points,
        })
        frame_index += 1
    output = {
        "schema": LANDMARK_SCHEMA,
        "source": {"video": str(video), "sha256": sha256(video), "fps": fps},
        "frames": frames,
    }
    path = Path(args.out).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({"output": str(path), "frames": len(frames)}, indent=2))


def build_packet(args: argparse.Namespace) -> None:
    landmark_path = Path(args.landmarks).resolve()
    vault_path = Path(args.vault).resolve()
    video = Path(args.video).resolve() if args.video else None
    source = json.loads(landmark_path.read_text())
    vault = json.loads(vault_path.read_text())
    if source.get("schema") != LANDMARK_SCHEMA:
        raise SystemExit(f"landmarks must use {LANDMARK_SCHEMA}")
    if vault.get("schema") != "pose-lab-v2-regnet-motion-vault-v1":
        raise SystemExit("not a Regnet motion vault")
    frames = []
    previous = None
    for item in source["frames"]:
        current = normalized(item)
        record = {
            "frame": int(item["frame"]),
            "timeSeconds": float(item["timeSeconds"]),
            **current,
        }
        record["energy"] = round(frame_energy(previous, record), 6)
        frames.append(record)
        previous = record
    if len(frames) < 2:
        raise SystemExit("capture requires at least two landmark frames")
    selected, rejected = select_keys(frames, args.keys, args.duplicate_threshold)
    keyframes = []
    for order, index in enumerate(selected):
        frame = frames[index]
        keyframes.append({
            "id": f"k{order:03d}",
            "sourceFrame": frame["frame"],
            "timeSeconds": frame["timeSeconds"],
            "energy": frame["energy"],
            "confidenceFloor": round(min(frame["confidence"].values()), 6),
            "descriptor": {
                "positions": frame["positions"],
                "directions": frame["directions"],
                "confidence": frame["confidence"],
            },
            "nearestRegnetPoses": match_vault(frame, vault, args.matches),
            "status": "proposed",
        })
    packet = {
        "schema": SCHEMA,
        "status": "proposed-not-authored-not-accepted",
        "createdAt": utc_now(),
        "source": {
            "landmarks": str(landmark_path),
            "landmarksSha256": sha256(landmark_path),
            "video": str(video) if video else source.get("source", {}).get("video"),
            "videoSha256": sha256(video) if video else source.get("source", {}).get("sha256"),
            "videoProbe": probe_video(video) if video else None,
        },
        "vault": {
            "path": str(vault_path),
            "sha256": sha256(vault_path),
            "sourceArchiveSha256": vault["source"]["sha256"],
            "skeletonSha256": vault["contract"]["skeletonSha256"],
        },
        "selection": {
            "policy": "endpoints + energy extrema + confidence-weighted farthest-pose sampling",
            "requestedKeys": args.keys,
            "selectedKeys": len(keyframes),
            "duplicateThreshold": args.duplicate_threshold,
            "rejected": rejected,
        },
        "locks": {
            "camera": args.camera_lock,
            "screenDirection": args.screen_direction,
            "rootMotion": args.root_motion,
            "weapon": args.weapon,
            "timing": "source timestamps",
        },
        "contactHypotheses": contact_hypotheses(frames),
        "keyframes": keyframes,
        "solverContract": {
            "order": [
                "normalize Regnet and capture rest bases",
                "solve hips and torso body basis",
                "lock reviewed foot and hand contacts",
                "solve target-length limbs with capture-derived pole planes",
                "apply target-specific hand, foot, head, and armor correction",
                "bake only reviewed sparse keys",
                "interpolate after key-pose visual acceptance",
            ],
            "forbidden": [
                "copy source local rotations onto Regnet",
                "treat two-dimensional landmark depth as authoritative",
                "promote nearest mocap retrieval as authored animation",
                "emit every captured frame as a pose key",
                "claim acceptance from distance metrics",
            ],
        },
        "acceptance": {
            "authoringRender": "pending",
            "orthogonalView": "pending",
            "hostedPoseLab": "pending",
            "humanVerdict": "pending",
        },
    }
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(packet, indent=2) + "\n")
    print(json.dumps({
        "output": str(output),
        "sourceFrames": len(frames),
        "selectedKeys": len(keyframes),
        "rejectedNearDuplicates": len(rejected),
        "contacts": len(packet["contactHypotheses"]),
    }, indent=2))


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)
    extract = commands.add_parser("extract")
    extract.add_argument("video")
    extract.add_argument("--out", required=True)
    extract.add_argument("--model-complexity", type=int, default=2, choices=[0, 1, 2])
    extract.add_argument("--min-confidence", type=float, default=0.55)
    extract.set_defaults(func=extract_mediapipe)
    build = commands.add_parser("build")
    build.add_argument("--landmarks", required=True)
    build.add_argument("--vault", required=True)
    build.add_argument("--video")
    build.add_argument("--out", required=True)
    build.add_argument("--keys", type=int, default=8)
    build.add_argument("--matches", type=int, default=5)
    build.add_argument("--duplicate-threshold", type=float, default=0.035)
    build.add_argument("--camera-lock", default="source capture camera")
    build.add_argument("--screen-direction", default="preserve source")
    build.add_argument("--root-motion", default="preserve in authoring; suppress only in named game export")
    build.add_argument("--weapon", default="none")
    build.set_defaults(func=build_packet)
    return root


def main() -> None:
    args = parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
