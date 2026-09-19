# Sprite Lab Intelligent Slicer Handoff Prompt

Continue work in `/storage/emulated/0/Documents/GodotProjects/pose-lab-v2-sprite-refinery` on branch `agent/sprite-refinery-mvp`.

## Current outcome

Pose Lab's existing `?view=2d` surface owns Sprite Lab import. The full-page importer accepts PNG, WebP, and JPEG, analyzes pixels for irregular frame regions, overlays editable boxes, and supports touch move/resize plus add/delete/reorder. Accepted crops are background-cleared, centered into 512x512 transparent frames, appended as a new draft animation in the existing player, and persisted with their rendered frame blobs in IndexedDB so the created animation survives reload. GIF export preserves each frame's duration. The editable canvas supports pointer drag/resize and keyboard move/resize.

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
