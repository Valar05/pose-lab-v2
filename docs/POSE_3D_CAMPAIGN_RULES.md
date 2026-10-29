# POSE LAB V2 — 3D RIGGING AND SKINNING DOCTRINE (STICKY)

CANONICAL LIVE GOOGLE DRIVE DOCUMENT (read in full before every 3D/rigging/campaign turn):
https://docs.google.com/document/d/1BNXVfowZWQSSA0Nk0OK4jP7_K-ysHnM5vTPV_EB8EWU/edit

This repo-local copy is an operational pointer and minimum offline guard, **not a substitute** for the live Google Doc. Every 3D change must load `AGENTS.md`, this file, live `CAMPAIGN_ETIQUETTE`, `docs/POSE_LAB_CAMPAIGN_RULES.md`, `docs/POSE_IS_GOD.md`, `docs/POSE_CAMPAIGN_FRAMEWORK.md`, and the active contract; preserve all prior approved art/animation locks.

## Assets and authority
- Original Heady Meshy SmartRig GLB and v02 motion are protected by exact SHA-256 checks. Do not alter, decimate, regen, or overwrite the source. A derived GLB is not the original.
- Count, weights, skin, node/joint identity, UVs, materials, generated GIF and user visual acceptance are **separate** evidentiary states.
- No GitHub writes (owner retains authority). No Computer Hands/Phone Hands, alternate devices, or undocumented transport for this campaign without authorization.

## First executable phase
- ONLY reduce Bone_034 hip weighting on BODY-facing attachment boundary, tapering smoothly inward to preserve full LEG-facing side.
- Transfer removed weight to body parent Bone_001 while preserving 4-influence maximum, normalization, and all other mesh parts. Fail safely if no insignificant slot exists.
- Keep exact v02 animation (`Bone_034→Bone_033→Bone_032`) and three fixed views; generate animated GLB/GIF and request `termux-open` on phone. If opening fails, mark separately; a valid GIF does not prove the phone displayed it.
- Hair-to-foot cleanup is deferred. Claw pincer second-bone work is deferred. Do not change them during hip trial.

## Future reusable tools
- `build_welded_adjacency`, `connected_components`, `rings_from_seeds`, `grow_mask`, `erode_mask`, `directional_hip_mask`, `transfer_weight_to_parent`, `repair_hair_foot_weights`, `repair_claw_two_segment_weights` (claw implementation gated), gait timing/phase/direction helpers, texture-preserving renderer.
- Eventually six locomotor legs and two claws, independently articulated pincer halves, arm walk sway, grumpy idles, eyestalk gestures, hug, VR/2D rendering. Those future stages require separate technical/human acceptance.

## Acceptance
- `doctor` validates live repo and dependencies; run outputs full checksums, vertex count, affected weight diff, animation channel parity, texture identity, GIF frames, and `OPEN=REQUESTED/FAIL/UNAVAILABLE`.
- Never claim full walk, skin repair, or actual Android display from package construction/local tests alone. Only user verdict promotes candidate to accepted.
