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

## Recovery update — 2026-09-18

Recovered the original implementation from commit `789bc3a5d8f3f9ddd831ae98889eeb958d8a5f59` and hardened the implementation through `3c0408c85dca7353ed4c2e4eb6fa080a1f92c7fb`.

- Created Pose Lab animations now persist their rendered PNG frame blobs, identity, labels, and frame timing in IndexedDB and rehydrate into the animation picker on reload. Older source-only drafts remain restorable in the importer.
- GIF export now preserves per-frame durations instead of flattening every frame to frame 1's delay; its test uses a portable OS temp directory and checks exact GIF frame timing with Pillow.
- Manual box constraints now remain inside sources smaller than the normal four-pixel minimum.
- Frame-box editing now has a complete keyboard path: Page Up/Down changes selection, arrows move, Ctrl/Command + arrows resize, Shift changes the step to ten pixels, status changes are announced, and focus is visibly outlined.
- Dedicated `Sprite Lab CI` exists at `.github/workflows/sprite-lab-ci.yml` and runs the six handoff checks without the heavier Sprite Refinery collector/PR side effects.

### Verification truth

GitHub-hosted verification is currently an infrastructure evidence gap, not a passing result. Sprite Lab CI runs `35414182329`, `35414317344`, `35414324049`, and `35414328610` each completed as failures within a few seconds; the first run's `verify` job exposed no step summaries and its log download returned `BlobNotFound`. The existing Sprite Refinery Batch also failed before useful collector verification on these pushes. Do not translate those failures into a test assertion without job output.

Home Center Phone Hands command `sprite-lab-verify-3c0408c-v1` was queued to `primary-phone` with an exact expected SHA, clean-worktree gate, fast-forward-only update, and all six verification commands. It had not leased when recorded; `primary-phone`'s `lastSeenAtMs` remained `1789783212151` across checks. Therefore runtime test acceptance and hosted visual acceptance remain pending. Do not repeat the older claim that all machine checks passed unless a fresh execution receipt proves it.

