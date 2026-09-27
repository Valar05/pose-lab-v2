#!/usr/bin/env python3
import hashlib
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / "tools/campaigns/campaign_core.py"

spec = importlib.util.spec_from_file_location("campaign_core", CORE)
core = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(core)

def git(root, *args):
    return subprocess.run(["git","-C",str(root),*args],check=True,capture_output=True,text=True).stdout.strip()

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

with tempfile.TemporaryDirectory() as td:
    root=Path(td)
    git(root,"init")
    git(root,"config","user.email","test@example.com")
    git(root,"config","user.name","Campaign Test")

    for rel in core.DEFAULT_RULES:
        write(root/rel, rel+"\n")
    write(root/"locked.txt","locked\n")
    write(root/"allowed.txt","before\n")
    write(root/"state.json",json.dumps({"nested":{"value":7}},indent=4)+"\n")

    locked_sha=hashlib.sha256((root/"locked.txt").read_bytes()).hexdigest()
    contract={
        "schema":core.SCHEMA,
        "id":"framework-selftest-v1",
        "mission":"Prove structural campaign mechanics.",
        "machine":{
            "mutablePaths":[
                "allowed.txt",
                "state.json",
                "campaigns/framework-selftest.receipt.json"
            ],
            "receiptPath":"campaigns/framework-selftest.receipt.json",
            "lockedFiles":[{"path":"locked.txt","sha256":locked_sha}],
            "checks":[
                {"kind":"json-equals","path":"state.json","pointer":"/nested/value","value":7},
                {"kind":"text-contains","path":"allowed.txt","value":"before"}
            ]
        }
    }
    write(root/"campaign.json",json.dumps(contract,separators=(",",":"))+"\n")

    git(root,"add",".")
    git(root,"commit","-m","baseline")

    c=core.load_contract(root,"campaign.json")
    core.assert_required_rules(root,c)
    core.assert_locked_files(root,c)
    core.assert_checks(root,c)

    # JSON formatting is deliberately changed; structural assertion must survive.
    write(root/"state.json",json.dumps({"nested":{"value":7}},indent=2)+"\n")
    write(root/"allowed.txt","before\nauthorized mutation\n")
    changed=core.assert_diff_allowed(root,c)
    assert set(changed)=={"allowed.txt","state.json"}, changed

    git(root,"add","allowed.txt","state.json")
    staged=core.assert_diff_allowed(root,c,staged=True)
    assert set(staged)=={"allowed.txt","state.json"}, staged

    # A forbidden path must fail closed.
    write(root/"forbidden.txt","nope\n")
    try:
        core.assert_diff_allowed(root,c)
    except core.CampaignError as exc:
        assert "unauthorized changed paths" in str(exc)
    else:
        raise AssertionError("forbidden diff was accepted")
    (root/"forbidden.txt").unlink()

    # Locked bytes must fail independently of mutable-path handling.
    write(root/"locked.txt","changed\n")
    try:
        core.assert_locked_files(root,c)
    except core.CampaignError as exc:
        assert "LOCK VIOLATION" in str(exc)
    else:
        raise AssertionError("locked-file mutation was accepted")
    write(root/"locked.txt","locked\n")

    # Receipt is created before anyone can stage it, eliminating the old ordering trap.
    receipt=core.write_receipt(
        root,c,
        start_revision="a"*40,
        implementation_revision="b"*40,
        final_revision=None,
        review_url="http://127.0.0.1/review",
        execution_lane="selftest",
    )
    assert receipt.exists()
    payload=json.loads(receipt.read_text())
    assert payload["campaign"]=="framework-selftest-v1"
    assert payload["humanVerdict"]=="pending"

    # Machine-readable path matching supports directories without source-string surgery.
    assert core.path_allowed("dir/a.txt",["dir/**"])
    assert not core.path_allowed("other/a.txt",["dir/**"])

print(json.dumps({
    "ok":True,
    "checked":[
        "structural-json-checks",
        "locked-file-hashes",
        "worktree-diff-allowlist",
        "staged-diff-allowlist",
        "receipt-before-stage-order",
        "globbed-mutable-paths"
    ]
},indent=2))
