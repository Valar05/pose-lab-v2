# Vanguard approved six-frame run integration

The approved Vanguard run source is `biomechanical_warrior_running_sprite_sheet.png` (SHA-256 `fc121638fe04310f35b684c9e20dda578d64868ca4a66215bdbc71956dcfd8b7`). Its six authored cells are consumed in reading order: top-left, top-middle, top-right, bottom-left, bottom-middle, bottom-right.

Pose Lab V2 does **not** play the review GIF or a video. The working runtime asset is `public/assets/valkyrie-squad/factory-v1/runtime/vanguard-run-pose-atlas-96.png`, a 3×2 atlas of six 96×96 semantic pose cells. The adjacent JSON manifest records the source hash, authored order, translation-only registration, and runtime contract.

## April authority reused

Vanguard run calls the same `drawBridgeDistortedSprite` function and the same `RUN` / `RUN_CAMERA` constants used by April in `src/valkyrie-sprite-lab.js`. The accepted donor is `authoring/valkyrie-squad/factory-v1/source-masters/april-v5-canonical.spritelab.json`.

Pinned donor values remain 3.8 FPS (263.15789473684214 ms per authored pose), 1578.947368421053 ms cycle, fixed [256,451] pose pivot, camera scale .80, stretch .10, squash .055, shear .075, 28×24 deformation mesh, and the accepted cloth/hose secondary-motion parameters. No Vanguard-specific torso yaw or rotation layer was added.

## Vanguard-only normalization

The generated sheet contains systematic cell-placement translation. Each 512×512 authored cell therefore receives only a translation registration before being reduced to the fixed 96×96 working cell. Offsets in authored reading order are:

`[-26,-14], [0,-15], [28,-14], [-26,14], [2,13], [27,13]`

No per-frame scale, rotation, pose, weapon, or leg edit is permitted by this asset contract.

The existing Previous/Next authored-key controls can inspect the six source poses individually while Run is selected. Playing clears manual stepping and returns to the accepted April procedural run treatment.
