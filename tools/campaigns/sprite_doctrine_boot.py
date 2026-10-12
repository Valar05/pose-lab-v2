#!/usr/bin/env python3
"""Read-only, fail-closed, task-aware Pose Lab animation context assembly."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = "doctrine/animation/doctrine-index-v1.json"
SCHEMA = "pose-lab-animation-doctrine-index-v1"
ROLES = {"CHARACTER", "STYLE", "POSE", "WEAPON", "EXAGGERATION", "LAYOUT"}

class ContextGateError(Exception):
    pass

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def source(rel: str, *, allow_external: bool = False) -> tuple[Path, bytes]:
    if not isinstance(rel, str) or not rel or "\x00" in rel:
        raise ContextGateError("invalid source path")
    p = Path(rel)
    if p.is_absolute():
        if not allow_external:
            raise ContextGateError("absolute doctrine path forbidden: " + rel)
        target = p
    else:
        if ".." in p.parts:
            raise ContextGateError("parent traversal forbidden: " + rel)
        target = ROOT / p
    if any(part.is_symlink() for part in (target, *list(target.parents)[:len(target.parts)])):
        raise ContextGateError("symlink source forbidden: " + rel)
    if not target.is_file() or target.stat().st_size == 0:
        raise ContextGateError("missing or empty source: " + rel)
    return target, target.read_bytes()

def json_source(rel: str) -> tuple[dict, bytes]:
    _, b = source(rel)
    try:
        value = json.loads(b)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ContextGateError("invalid JSON source: " + rel) from exc
    if not isinstance(value, dict):
        raise ContextGateError("JSON source root must be object: " + rel)
    return value, b

def task_from_contract(contract: dict) -> str:
    subject = (str(contract.get("id", "")) + " " + str(contract.get("mission", ""))).lower()
    tests = [
        (r"\b(jump|airborne|midair|landing)\b", "jump"),
        (r"\b(run|jog|stride|sprint)\b", "run"),
        (r"\b(idle|blink|breath)\b", "idle"),
        (r"\b(attack|strike|melee|combat)\b", "attack"),
        (r"\b(glide|locomotion|movement|walking)\b", "locomotion"),
    ]
    for regex, task in tests:
        if re.search(regex, subject):
            return task
    return "review"

def character_manifest(path: str) -> tuple[str, bytes, dict]:
    manifest, b = json_source(path)
    if manifest.get("schema") != "pose-lab-sprite-character-authority-v1":
        raise ContextGateError("character authority schema mismatch")
    if not manifest.get("character") or not manifest.get("project"):
        raise ContextGateError("character/project required")
    refs = manifest.get("references")
    if not isinstance(refs, list) or not refs:
        raise ContextGateError("source identity reference images required")
    found = set()
    for item in refs:
        if not isinstance(item, dict) or item.get("role") not in ROLES:
            raise ContextGateError("untyped or invalid character reference role")
        role, rel, expected = item["role"], item.get("path"), item.get("sha256")
        if not isinstance(expected, str) or not re.fullmatch("[0-9a-f]{64}", expected):
            raise ContextGateError("reference SHA-256 must be exact")
        p, original = source(rel)
        if p.suffix.lower() not in (".png", ".webp", ".jpg", ".jpeg"):
            raise ContextGateError("reference must be an image file: " + str(rel))
        if sha(original) != expected:
            raise ContextGateError("source image hash mismatch: " + str(rel))
        found.add(role)
    if "CHARACTER" not in found:
        raise ContextGateError("new authored sprite requires a canonical CHARACTER image")
    if "STYLE" not in found:
        raise ContextGateError("new authored sprite requires an explicit STYLE image")
    return path, b, manifest

def packet(task: str, contract_path: str | None, character_path: str | None) -> tuple[str, list[dict]]:
    index, _ = json_source(INDEX_PATH)
    if index.get("schema") != SCHEMA:
        raise ContextGateError("doctrine index schema mismatch")
    if contract_path:
        contract, _ = json_source(contract_path)
        if contract.get("schema") != "pose-lab-v2-campaign-contract-v2":
            raise ContextGateError("active campaign schema mismatch")
    else:
        contract = {}
    if task == "auto":
        task = task_from_contract(contract)
    registry = index.get("taskKinds")
    if not isinstance(registry, dict) or task not in registry:
        raise ContextGateError("unrecognized doctrine task: " + task)
    if task == "sprite-author" and not character_path:
        raise ContextGateError("SOURCE_AUTHORITY_REQUIRED: --character-manifest before new art")
    if character_path:
        character_manifest(character_path)

    # Deduplicate by canonical path; never infer documents from filesystem globbing.
    candidates = [*index["core"], *index["normative"], *registry[task]["additional"],
                  *registry[task]["exemplars"]]
    if contract_path:
        candidates.append(contract_path)
    if character_path:
        candidates.append(character_path)
    paths = list(dict.fromkeys(candidates))
    normative = set(index["core"] + index["normative"])
    exemplars = set(registry[task]["exemplars"])
    result = []
    text = [f"# Pose Lab context packet | task={task}",
            "This is mechanically assembled source text, not proof that the working AI read it.",
            "Character-specific exemplars are NON-NORMATIVE outside their recorded character.",
            "The working AI must inspect actual character artwork before sprite generation.",
            ""]
    for rel in paths:
        _, b = source(rel)
        try:
            content = b.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ContextGateError("non-UTF8 doctrine source: " + rel) from exc
        role = ("EXEMPLAR-NON-NORMATIVE" if rel in exemplars else
                "CORE-NORMATIVE" if rel in normative else
                "CHARACTER-MANIFEST" if rel == character_path else
                "CAMPAIGN-AUTHORITY" if rel == contract_path else
                "EVIDENCE-LEDGER")
        result.append({"path": rel, "role": role, "sha256": sha(b), "bytes": len(b)})
        text.extend([f"## Source: {rel}", f"Authority: {role}; SHA-256: {sha(b)}",
                     "~~~text", content.rstrip(), "~~~", ""])
    content = "\n".join(text) + "\n"
    return content, result

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--task", default="auto", choices=("auto", "sprite-author", "sprite-edit", "extract", "idle", "run", "jump", "locomotion", "attack", "review"))
    p.add_argument("--contract", help="repo-relative active V2 campaign contract")
    p.add_argument("--character-manifest", help="repo-relative v1 character authority manifest with hash-pinned images")
    p.add_argument("--output", help="path to emit complete Markdown context packet; omit to print complete packet")
    args = p.parse_args()
    content, manifest = packet(args.task, args.contract, args.character_manifest)
    data = content.encode("utf-8")
    if args.output:
        path = Path(args.output)
        if path.is_symlink() or (path.exists() and not path.is_file()):
            raise ContextGateError("output destination is not a regular file")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        if path.read_bytes() != data:
            raise ContextGateError("context packet byte readback failed")
        print(f"POSE_CONTEXT_PACKET={path}")
        print(f"POSE_CONTEXT_SHA256={sha(data)}")
        print(f"POSE_CONTEXT_SOURCE_COUNT={len(manifest)}")
        for entry in manifest:
            print("POSE_CONTEXT_SOURCE=" + entry["role"] + ":" + entry["path"] + ":" + entry["sha256"])
        print("POSE_CONTEXT_REQUIRES_MODEL_READ=TRUE")
    else:
        sys.stdout.write(content)

if __name__ == "__main__":
    try:
        main()
    except (ContextGateError, OSError, ValueError, KeyError, TypeError) as exc:
        print("POSE_CONTEXT_FAIL_CLOSED: " + str(exc), file=sys.stderr)
        sys.exit(2)
