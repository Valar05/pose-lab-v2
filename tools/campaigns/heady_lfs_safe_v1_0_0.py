#!/usr/bin/env python3
"""Heady Git LFS migration candidate, v1.0.0.

READ THE RESULT: prepares a fast-forward candidate in an isolated, shared-object
clone. NEVER pushes, force-pushes, resets, deletes source assets, or changes the
source branch/commits. Duplicate byte content uses the same Git LFS object ID.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import traceback

VERSION = "1.0.0"
CAMPAIGN = "heady-lfs-safe"
REPO_NAME = "Valar05/pose-lab-v2"
PATTERNS = [
    "tools/heady/**/*.glb",
    "tools/heady/**/*.gif",
    "tools/heady/**/*.zip",
    "tools/heady/**/*.blend",
    "tools/heady/**/*.mp4",
]
SUFFIXES = {".glb", ".gif", ".zip", ".blend", ".mp4"}
MIN_FREE = 250 * 1024 * 1024
STATE = Path.home() / ".local" / "share" / "heady-lfs-campaign-v1"


class Blocked(RuntimeError):
    pass


def cmd(args, cwd=None, capture=True, check=True, env=None):
    p = subprocess.run(
        [str(x) for x in args], cwd=str(cwd) if cwd else None,
        text=True, errors="replace", stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None, env=env
    )
    if check and p.returncode:
        joined = " ".join(str(x) for x in args[:3])
        raise Blocked("COMMAND_FAILED: " + joined + " (exit " + str(p.returncode) + ")")
    return (p.stdout or "").strip() if capture else p.returncode


def git(repo, *args):
    return cmd(["git", "-C", repo, *args])


def read_blob_sha(repo, blob):
    h = hashlib.sha256()
    proc = subprocess.Popen(
        ["git", "-C", str(repo), "cat-file", "blob", blob],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
    )
    assert proc.stdout is not None
    while True:
        chunk = proc.stdout.read(1048576)
        if not chunk:
            break
        h.update(chunk)
    if proc.wait():
        raise Blocked("BLOB_READ_FAILED: " + blob)
    return h.hexdigest()


def inventory(repo, revision):
    raw = subprocess.check_output(
        ["git", "-C", str(repo), "ls-tree", "-rz", "-l", revision, "--", "tools/heady/"]
    )
    files = []
    for row in raw.split(b"\0"):
        if not row or b"\t" not in row:
            continue
        meta, filename = row.split(b"\t", 1)
        pieces = meta.split()
        if len(pieces) != 4 or pieces[1] != b"blob":
            continue
        path = filename.decode("utf-8", errors="surrogateescape")
        if Path(path).suffix.lower() not in SUFFIXES:
            continue
        size = int(pieces[3]) if pieces[3] != b"-" else 0
        sha = read_blob_sha(repo, pieces[2].decode())
        files.append({"path": path, "bytes": size, "sha256": sha})
    groups = {}
    for f in files:
        if f["path"].lower().endswith(".glb"):
            groups.setdefault(f["sha256"], []).append(f["path"])
    duplicates = [paths for paths in groups.values() if len(paths) > 1]
    return files, duplicates


def is_lfs_pointer(repo, revision, path):
    p = subprocess.run(
        ["git", "-C", str(repo), "show", revision + ":" + path],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
    )
    return p.returncode == 0 and p.stdout.startswith(
        b"version https://git-lfs.github.com/spec/v1\n"
    ) and b"oid sha256:" in p.stdout


def write_receipt(path, receipt):
    path.parent.mkdir(parents=True, exist_ok=True)
    staging = path.with_suffix(".json.tmp")
    staging.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    os.replace(staging, path)


def bootstrap_lfs():
    if shutil.which("git-lfs") or cmd(["git", "lfs", "version"], check=False):
        if cmd(["git", "lfs", "version"], check=False):
            return
    if not shutil.which("pkg"):
        raise Blocked("GIT_LFS_MISSING: Termux pkg unavailable; no alternate installer attempted")
    print("BOOTSTRAP: git-lfs missing; trying Termux package manager", flush=True)
    try:
        subprocess.run(["pkg", "install", "-y", "git-lfs"], check=True, timeout=180)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise Blocked("GIT_LFS_BOOTSTRAP_FAILED: " + type(exc).__name__) from exc
    if not cmd(["git", "lfs", "version"], check=False):
        raise Blocked("GIT_LFS_STILL_MISSING")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["audit", "prepare", "status"], nargs="?", default="prepare")
    parser.add_argument("--repo", default=str(
        Path.home() / "storage" / "documents" / "GodotProjects" / "pose-lab-v2"
    ))
    args = parser.parse_args()
    if args.mode == "status":
        found = sorted(STATE.glob("*/receipt.json"))
        if not found:
            raise Blocked("NO_RECEIPTS")
        print(found[-1].read_text())
        return
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir() or not (repo / ".git").exists():
        raise Blocked("REPOSITORY_NOT_FOUND: " + str(repo))
    root = Path(git(repo, "rev-parse", "--show-toplevel")).resolve()
    if root != repo:
        raise Blocked("REPO_ROOT_MISMATCH: " + str(root))
    origin = git(repo, "remote", "get-url", "origin")
    canonical = origin.removesuffix(".git").rstrip("/")
    if not (canonical.endswith("github.com/Valar05/pose-lab-v2")
            or canonical.endswith("github.com:Valar05/pose-lab-v2")):
        raise Blocked("WRONG_ORIGIN: requires Valar05/pose-lab-v2")
    branch = git(repo, "branch", "--show-current")
    if branch != "main":
        raise Blocked("WRONG_BRANCH: expected phone local main, got " + branch)
    original = git(repo, "rev-parse", "HEAD")
    status = git(repo, "status", "--porcelain=v1")
    if status:
        raise Blocked("DIRTY_REPO: preserve changes; stage nothing and stop")
    remote = git(repo, "ls-remote", "origin", "refs/heads/main").split()
    if not remote or len(remote[0]) != 40:
        raise Blocked("REMOTE_MAIN_UNAVAILABLE")
    advertised = remote[0]
    print("CAMPAIGN=" + CAMPAIGN + " VERSION=" + VERSION)
    print("SOURCE_REPO=" + str(repo))
    print("SOURCE_HEAD=" + original + " REMOTE_MAIN=" + advertised)
    # Ref refresh is read-only to the server; it cannot change local main/HEAD.
    cmd(["git", "-C", repo, "fetch", "--no-tags", "origin",
         "refs/heads/main:refs/remotes/origin/main"], capture=False)
    base = git(repo, "rev-parse", "refs/remotes/origin/main")
    if base != advertised:
        raise Blocked("REMOTE_CHANGED_DURING_FETCH")
    if subprocess.run(["git", "-C", str(repo), "merge-base", "--is-ancestor", base, original]).returncode:
        raise Blocked("LOCAL_MAIN_DIVERGED: no rebase or force push attempted")
    ahead = int(git(repo, "rev-list", "--count", base + ".." + original))
    files, duplicates = inventory(repo, original)
    receipt = {
        "campaign": CAMPAIGN, "version": VERSION, "source_repo": str(repo),
        "source_head": original, "remote_main": base, "local_unpublished_commits": ahead,
        "binary_assets": files, "identical_glb_path_groups": duplicates,
        "note": "Distinct SHA-256 GLBs are never automatically merged or deleted."
    }
    if not files:
        raise Blocked("NO_HEADY_BINARY_ASSETS_IN_CURRENT_HEAD")
    print("LOCAL_UNPUBLISHED_COMMITS=" + str(ahead))
    print("HEADY_BINARY_COUNT=" + str(len(files)) +
          " BYTES=" + str(sum(f["bytes"] for f in files)))
    for f in files:
        print("ASSET " + str(f["bytes"]) + " sha256=" + f["sha256"] + " " + f["path"])
    for group in duplicates:
        print("EXACT_CONTENT_REUSE_ONE_LFS_OID: " + " | ".join(group))
    if args.mode == "audit":
        print("RESULT=AUDIT_ONLY; no remote write, source commit or branch mutation")
        return
    if ahead == 0:
        raise Blocked("ALREADY_PUBLISHED_OR_NO_LOCAL_COMMITS: history rewrite not approved")
    bootstrap_lfs()
    STATE.mkdir(parents=True, exist_ok=True)
    run_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + original[:8] + "-" + str(os.getpid())
    run_dir = STATE / run_id
    run_dir.mkdir(exist_ok=False)
    receipt_path = run_dir / "receipt.json"
    receipt["status"] = "PREPARING"
    write_receipt(receipt_path, receipt)
    clone = run_dir / "candidate-repo"
    try:
        needed = MIN_FREE + sum(f["bytes"] for f in files) * 2
        free = shutil.disk_usage(STATE).free
        if free < needed:
            raise Blocked("INSUFFICIENT_DISK: free=" + str(free) +
                          " estimated_needed=" + str(needed))
        cmd(["git", "clone", "--shared", "--no-checkout", "--no-tags",
             "--quiet", "--", str(repo), str(clone)], capture=False)
        git(clone, "remote", "set-url", "origin", origin)
        git(clone, "update-ref", "refs/remotes/origin/main", base)
        candidate_branch = "campaign/heady-lfs-prepared-" + original[:10]
        git(clone, "checkout", "-q", "-b", candidate_branch, original)
        git(clone, "lfs", "install", "--local")
        git(clone, "lfs", "track", *PATTERNS)
        git(clone, "add", "--", ".gitattributes")
        git(clone, "commit", "-m", "campaign(heady): track 3D binary assets in LFS")
        git(clone, "lfs", "migrate", "import", "--yes",
            "--include-ref=refs/heads/" + candidate_branch,
            "--exclude-ref=refs/remotes/origin/main",
            "--include=" + ",".join(PATTERNS))
        rewritten = git(clone, "rev-parse", "HEAD")
        if rewritten == original:
            raise Blocked("MIGRATION_PRODUCED_NO_NEW_COMMIT")
        if subprocess.run(["git", "-C", str(clone), "merge-base",
                           "--is-ancestor", base, rewritten]).returncode:
            raise Blocked("NOT_FAST_FORWARD_FROM_REMOTE: publish blocked")
        git(clone, "lfs", "checkout")
        for f in files:
            if not is_lfs_pointer(clone, rewritten, f["path"]):
                raise Blocked("NOT_LFS_POINTER: " + f["path"])
            asset = clone / f["path"]
            if not asset.exists():
                raise Blocked("MIGRATED_ASSET_MISSING: " + f["path"])
            h = hashlib.sha256()
            with asset.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1048576), b""):
                    h.update(chunk)
            if h.hexdigest() != f["sha256"]:
                raise Blocked("MIGRATED_ASSET_HASH_MISMATCH: " + f["path"])
        if git(repo, "rev-parse", "HEAD") != original:
            raise Blocked("SOURCE_HEAD_CHANGED_DURING_RUN")
        if git(repo, "status", "--porcelain=v1"):
            raise Blocked("SOURCE_WORKTREE_CHANGED_DURING_RUN")
        now_remote = git(repo, "ls-remote", "origin", "refs/heads/main").split()
        if not now_remote or now_remote[0] != base:
            raise Blocked("REMOTE_MAIN_MOVED_DURING_RUN: no push attempted")
        receipt.update({
            "status": "CANDIDATE_READY_NOT_PUSHED",
            "candidate_branch": candidate_branch,
            "candidate_sha": rewritten,
            "candidate_clone": str(clone),
            "lfs_files": git(clone, "lfs", "ls-files", "--long").splitlines(),
            "all_source_asset_sha256_verified": True,
            "remote_write": False,
            "published": False,
            "source_main_unchanged": True
        })
        write_receipt(receipt_path, receipt)
        print("RESULT=CANDIDATE_READY_NOT_PUSHED")
        print("CANDIDATE_SHA=" + rewritten)
        print("CANDIDATE_REPO=" + str(clone))
        print("ORIGINAL_MAIN_UNTOUCHED=" + original)
        print("RECEIPT=" + str(receipt_path))
        print("PUBLISH_BLOCKED_UNTIL_SEPARATELY_AUTHORIZED; NO FORCE PUSH")
    except Exception as e:
        receipt.update({"status": "BLOCKED", "reason": str(e),
                        "candidate_clone": str(clone), "remote_write": False})
        write_receipt(receipt_path, receipt)
        print("RESULT=BLOCKED REASON=" + str(e))
        print("RECEIPT=" + str(receipt_path))
        raise


if __name__ == "__main__":
    try:
        main()
    except (Blocked, subprocess.SubprocessError, OSError) as e:
        print("CAMPAIGN_BLOCKED=" + str(e), file=sys.stderr)
        sys.exit(2)
