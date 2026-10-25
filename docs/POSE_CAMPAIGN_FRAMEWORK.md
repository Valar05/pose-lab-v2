# Pose Lab Campaign Framework V2

## Purpose

Pose Lab campaigns remain fail-closed, Git-owned, contract-driven operations. V2
does not weaken those guarantees. It removes duplicated ceremony that made the
repo brittle during Swarmling production.

The framework exists to keep the useful paranoia while eliminating accidental
complexity.

## The split

A campaign has three layers:

1. **Contract** — declares mission, exact mutable paths, locked file hashes,
   structural expectations, receipt path, and required doctrine.
2. **Campaign-specific apply helper** — performs only the creative/source
   mutation commissioned by the contract.
3. **Shared campaign core** — performs generic mechanics: sticky boot,
   lock verification, path-scope verification, structural checks, receipt
   creation, worktree helpers, push/readback helpers, and review-server
   readiness.

Shared mechanics live in:

```text
tools/campaigns/campaign_core.py
tools/campaigns/campaign_common.sh
```

Campaign-specific scripts should source/use these instead of copying equivalent
logic.

## Contract schema

New campaigns use:

```json
{
  "schema": "pose-lab-v2-campaign-contract-v2",
  "id": "example-v1",
  "mission": "Describe the exact commissioned state transition.",
  "machine": {
    "mutablePaths": [
      "path/to/exact-file.json",
      "path/to/generated/**",
      "campaigns/example.receipt.json"
    ],
    "receiptPath": "campaigns/example.receipt.json",
    "requiredRules": [
      "AGENTS.md",
      "docs/POSE_LAB_CAMPAIGN_RULES.md",
      "docs/POSE_IS_GOD.md"
    ],
    "lockedFiles": [
      {
        "path": "path/to/locked.bin",
        "sha256": "..."
      }
    ],
    "checks": [
      {
        "kind": "json-equals",
        "path": "path/to/state.json",
        "pointer": "/some/property",
        "value": 15
      },
      {
        "kind": "text-contains",
        "path": "src/runtime.js",
        "value": "required semantic token"
      }
    ]
  }
}
```

Human-readable prose may still explain locks and acceptance criteria, but
machine enforcement must use the `machine` block instead of scraping prose.

## Rules that make V2 less brittle

### Structural checks, not formatting checks

Never verify JSON with `grep` for indentation/spacing. Use
`json-equals` against a JSON Pointer.

Never locate a source assertion by matching its old error-message prose. If a
source rewrite is unavoidable, identify a stable structural declaration and
assert uniqueness before mutation.

### Invariants are different from campaign variables

A test may lock `rootMotion=false` because that is an invariant.

A test must not hardcode `stageAnchor=[220,226]` when a sealed centering
campaign explicitly owns `stageAnchor`. In that case, the contract owns the
expected value and verification reads it from the contract/current canonical
state.

### One writable-path authority

`machine.mutablePaths` is the one mechanical path allowlist.

Campaign scripts must not maintain a second hand-written `case` allowlist
with different semantics. Use:

```sh
python3 tools/campaigns/campaign_core.py check-diff --contract ...
```

or the shared shell helper.

### Receipt ordering is fixed

The sequence is:

1. mutate
2. verify
3. stage implementation
4. verify staged surface
5. commit implementation
6. **create receipt**
7. stage receipt
8. commit receipt
9. push + exact readback
10. build/serve exact final revision
11. human review

A nonexistent receipt is never included in the first `git add`.

### Partial reruns

Campaign-specific apply helpers should be idempotent when practical. If the
desired state already exists, they should verify it and continue. A partially
completed prior run is not automatically an error.

If idempotence would hide an ambiguous creative state, fail closed instead.

### Stale verifier behavior

If a sealed campaign authorizes property X to change and an old verifier rejects
X solely because it still contains the previous value, that is a stale verifier.

When the repair is purely enforcement plumbing and remains inside the campaign's
authorized surface, repair the verifier and continue the same campaign. Do not
turn it into another Drew debugging turn.

### Sprite-sheet-first still wins

The framework does not move visual authority into tests. For sprite work:

1. pose identity
2. canonical sheet geometry
3. registration/pinning
4. timing/deformation
5. runtime presentation

Human review remains final visual authority.

## CLI

From repository root:

```sh
python3 tools/campaigns/campaign_core.py preflight --contract campaigns/example.contract.json
python3 tools/campaigns/campaign_core.py verify --contract campaigns/example.contract.json
python3 tools/campaigns/campaign_core.py check-diff --contract campaigns/example.contract.json
python3 tools/campaigns/campaign_core.py check-diff --contract campaigns/example.contract.json --staged
```

Receipt creation:

```sh
python3 tools/campaigns/campaign_core.py receipt \
  --contract campaigns/example.contract.json \
  --start-revision <sha> \
  --implementation-revision <sha> \
  --execution-lane repo-owned-campaign
```

## Acceptance test

Run:

```sh
python3 tools/test_pose_campaign_framework.py
```

The test intentionally covers the production failures that triggered this
framework:

- formatting-independent JSON verification
- locked file hashes
- worktree diff allowlists
- staged diff allowlists
- whole-worktree guards include staged, unstaged, and untracked files
- receipt creation before staging
- globbed mutable paths
- rejection of unauthorized mutations

## Migration policy

Do **not** bulk-rewrite historical campaigns. They are archaeology and receipts
of what actually happened.

Migrate active/new campaigns when they are touched. This avoids another global
rewrite while steadily shrinking the brittle surface.

The old hardcoded `tools/campaigns/pose_campaign_guard.py` remains legacy
Attack-5 infrastructure until that campaign is next reopened. New campaigns
must use V2.

## Self-locating repo-owned entrypoints (2026-10-25)

Every campaign runner must be safe when invoked from an arbitrary current working directory. The owner often has multiple campaigns open simultaneously. A repo-owned script MUST resolve its own real location (including symlinks where applicable), derive and verify the intended repository/worktree root or a validated explicit override, and `cd` into that root **before** running any repository-relative reads, Git commands, tests, or mutations. Never assume `pwd`, `$HOME`, an interactive shell's previous directory, or a single active campaign. If resolution is ambiguous or does not identify the intended repository, fail closed without touching files. Log `RESOLVED_REPO`, `EXECUTION_DIR`, `BRANCH`, and `HEAD` at preflight. Keep logs, receipts, locks, and worktrees campaign-specific so parallel execution cannot clobber adjacent work. The owner's decision to navigate manually for one run does not waive this rule for future scripts. Verify this behavior from an unrelated directory as a required acceptance test.

## Branch parity and review URL operation (2026-10-25)

Before implementing or publishing a character or campaign, inventory relevant active branches against the intended deployment base and preserve previously approved character profiles, art assets, selector options, and routed reviews. A branch containing an asset is not proof that main or Pages contains it. Treat missing Connie or another existing character as a regression and reconcile intentionally, without checking out an older branch over newer work. Verify both preserved and new character entries in the actual hosted editor. When a review URL exists, the operator must attempt to OPEN it with authorized browser controls and inspect the rendered content, not simply print its URL. If browser control is unavailable in chat, disclose that limit and provide a direct link; do not claim an automatic open. A successful HTTP status alone does not establish visible UI acceptance.
