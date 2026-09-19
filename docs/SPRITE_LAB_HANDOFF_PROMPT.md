# Sprite Lab Intelligent Slicer Handoff Prompt

Continue work in `/storage/emulated/0/Documents/GodotProjects/pose-lab-v2-sprite-refinery` on branch `agent/sprite-refinery-mvp`.

## Current outcome

Pose Lab's existing `?view=2d` surface owns Sprite Lab import. The full-page importer accepts PNG, WebP, and JPEG, analyzes pixels for irregular frame regions, overlays editable boxes, and supports touch move/resize plus add/delete/reorder. Accepted crops are background-cleared, centered into 512x512 transparent frames, appended as a new draft animation in the existing player, and persisted with their rendered frame blobs in IndexedDB so the created animation survives reload. GIF export preserves each frame's duration. The editable canvas supports pointer drag/resize plus keyboard-only box selection, move, and resize with a visible focus ring.

The former divisible-grid premise is forbidden. Do not reintroduce columns/rows as a required gate.

## Exact live test specimen

- Source: `/storage/emulated/0/Pictures/image_cc96778d.jpg`
- Format/dimensions: JPEG RGB, 1475x720
- Pixel detector result: four panel candidates in reading order; the first three are portrait animation frames and the fourth is the end-card candidate the author can delete.
- The source dimensions are intentionally not divisible by three.

## Verification

Run:

```sh
npm run test:sprite-slicer
npm run test:gif-encoder
npm run test:2d
npm run build
npm run smoke
git diff --check
```

Serve through the existing tmux session `sprite-lab-video` at:

`http://127.0.0.1:4173/?view=2d&cacheBust=intelligent-slicer-1`

Machine checks are guardrails. The next visual review must use the project's accepted hosted/cloud lane before claiming visual acceptance. On phone, verify the exact specimen can be selected, proposed boxes are visible/editable, deleting the end card yields three frames, the new animation plays in the existing Pose Lab controls, reload restores the draft, and the exported GIF opens as a three-frame loop.

## Recovery update - 2026-09-18

Recovered the original implementation from commit `789bc3a5d8f3f9ddd831ae98889eeb958d8a5f59` and hardened the application/test/documentation tree through `b1a699183b390613c2c7ca35f686c49a6722b659`.

- Created Pose Lab animations now persist their rendered PNG frame blobs, identity, labels, and frame timing in IndexedDB and rehydrate into the animation picker on reload. Older source-only drafts remain restorable in the importer.
- GIF export now preserves per-frame durations instead of flattening every frame to frame 1's delay; its test uses a portable OS temp directory and checks exact GIF frame timing with Pillow.
- Manual box constraints now remain inside sources smaller than the normal four-pixel minimum.
- Frame-box editing now has a complete keyboard path: Page Up/Down changes selection, arrows move, Ctrl/Command + arrows resize, Shift changes the step to ten pixels, status changes are announced, and focus is visibly outlined.
- `Sprite Lab CI` remains at `.github/workflows/sprite-lab-ci.yml` as an explicit `workflow_dispatch` mirror. Automatic push triggering was removed after GitHub-hosted jobs repeatedly failed before exposing a single step, so hosted-runner provisioning noise cannot masquerade as a Sprite Lab test failure.

### Verified runtime receipt

Home Center Phone Hands command `sprite-lab-verify-b1a6991-v2` completed on `primary-phone` with `exitCode=0` and `ok=true`.

The receipt proves:

- The actual checkout was `/storage/emulated/0/Documents/GodotProjects/pose-lab-v2-sprite-refinery`.
- It is a Git worktree with `.git` stored as a file. This explains the superseded first verification command, `sprite-lab-verify-3c0408c-v1`, which failed on an incorrect `.git`-must-be-a-directory gate before testing code.
- The checkout started at `789bc3a5d8f3f9ddd831ae98889eeb958d8a5f59`, fetched the exact remote head `b1a699183b390613c2c7ca35f686c49a6722b659`, and fast-forwarded only.
- `npm run test:sprite-slicer` passed, including the 1475x720 non-divisible-sheet contract and tiny-source box constraint.
- `npm run test:gif-encoder` passed with three frames and exact delays `60/120/250 ms`.
- `npm run test:2d` passed.
- `npm run build` passed.
- `npm run smoke` passed.
- `git diff --check` passed.
- The checkout ended at `b1a699183b390613c2c7ca35f686c49a6722b659` with the branch tracking `origin/agent/sprite-refinery-mvp` and no worktree changes.

GitHub-hosted runs `35414182329`, `35414317344`, `35414324049`, and `35414328610` remain failed infrastructure evidence: the first run's `verify` job exposed no step summaries and its log download returned `BlobNotFound`. They are not a contradictory test result because no test step was exposed.

Machine/runtime verification is green through the Home Center phone receipt. Hosted visual acceptance is still pending and must not be claimed until the exact specimen is exercised through the accepted hosted/cloud visual lane.

