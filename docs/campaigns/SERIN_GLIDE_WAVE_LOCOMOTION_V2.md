# Serin Wave Glide V2

## What is commissioned
One real Pose Lab V2 phone campaign for a right-facing, forward-leaning, one-frame Serin glide.
Preserve original Serin front idle as the endpoint of exploration. Keep original back-facing battle idle and prior glide candidate intact.
The new glide source is the EXACT named 1024x1536 transparent PNG already saved at:
/storage/emulated/0/Pictures/file_00000000b6ac81fbb8c9c9f85a645117.png

## Procedure and protections
GitHub branch codex/serin-glide-wave-locomotion-v2 contains the actual script.
Git worktree is isolated; never reset, checkout or stash the user's active checkout.
Shared V2 campaign core checks source locks, permitted diffs, receipt order, GitHub push/readback and localhost HTTP.
Existing front, battle and earlier glide files are immutable. The exact phone source is imported into a new distinct path.
Initial branch records pending phone ingress. Once copied, the original PNG SHA-256 is sealed into recipe and contract and pushed with a receipt.
No invented hash and no guessing alternate phone files.

## Behavior
Controller uses real game input, velocity, acceleration, and braking. Forward lean applies above waist, without rotating the pinned puddle.
At idle the puddle flows at ~1.9Hz; while gliding the flow accelerates to ~5.1Hz plus ~7Hz edge motion.
The leading bow crest rises with speed and persists briefly after releasing the throttle. The still image is never a rendered frame sequence.
Transitions deform texture coordinates around the handoff; only one texture draws at a time. No whole-image transparency blend.
One world scale. No independent source up/down rescale. Old 84% V1 safe-area compensation is not inherited.

## Phone launch
Run in Termux:
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-glide-wave-locomotion-v2 && git show FETCH_HEAD:tools/campaigns/serin-glide-wave-locomotion-v2.sh | bash

## Acceptance
GitHub green is source/build evidence, not user visual acceptance.
Visual review must prove the pool visibly crests, head/torso lean, no double anatomy, idle return, acceptable proportional consistency, and no unintended clipping.
Quarantine until the human verdict is accepted.

Native pixel-scale registration: idle 1086x1448 and glide 1024x1536 are sampled on one 1086x1536 world pixel plane, bottom aligned, with no per-source scale multiplier. Half-width difference centers the glide by 31 pixels; idle top offset is 88 pixels. The 768x1086 display canvas maintains this aspect ratio. These are fixed native source dimensions and stage geometry, not independent source-size normalization. The first true phone review must still judge body-landmark consistency.
