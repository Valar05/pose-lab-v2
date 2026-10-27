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

## Corrective campaign: source switching, reverse and inverse-warp lean (2026-10-11)

Phone video shows a pronounced whole-body flip on Reverse (at ~5.5 seconds) and an upright/away lean when moving right. Root causes: `uPoseBlend<0.5` directly selecting a source each frame, `if(uFacing<0.0)p.x=1.0-p.x;`, and a forward-positive inverse texture rotation that visually leans away from travel.

New source latch: initial front-idle, one right-glide selection when the user presses Glide Right, no selection change during forward braking, reverse freezes the already selected artwork without mirroring, and the source returns to idle once physically settled. The moving source is the committed Git-owned PNG SHA-256 `8c0d9b48d9522eae67cdea4a6d0d7b0e0d83ca6bfc235254bac8d8bf8c6f1ddc`. The review HUD exposes the actual selected source and cumulative switch count.

Forward motion now uses negative inverse-texture rotation to visually move head/shoulders toward the right. Reverse disables pronounced upper-body pitching, hair and tail detail deformation drops to 12% while the independently praised fast puddle and bow crest shader expressions and driving parameters are *unchanged*.

Source PNGs, stage geometry, routing, the committed wave recipe, campaign script and original pose renderer are not changed. Green CI proves structural logic only; the updated visible phone recording and human verdict remain the acceptance boundary.

## October 12 lean and exit refinement, still human-pending

Following mobile video review, the additional procedural lean was judged excessive and the exit more abrupt than the entry. The existing glide illustration has its own forward lean. Target supplemental controller bend is now 1.5–6 degrees, with a faster onset and slower recovery. Inverse texture rotation is weighted to 58% of this plus 8% of existing pitch; the field is restricted to torso/shoulder landmarks rather than dragging the entire hair mass. The source switch back to front idle waits for motion, slosh, bow crest and residual lean to settle; no extra image swaps or alpha blends.

**Accepted/locked:** exact two Git-owned PNGs (sha256 front `00ba472a...`, glide `8c0d9b48...`), fast current/ripple and visible bow crest, subdued reverse, no horizontal mirroring, shared native source pixels and pool root. The existing ripple/crest GLSL equations and phase/timing are unchanged.

**Visual limitation:** this reduces source-switch shock but does not manufacture a true intermediate illustration; the human must evaluate whether the remaining end swap feels good. If not, an explicit landmark deformation transition will be needed rather than hiding it with longer delay or opacity crossfade. The GitHub CI cannot establish visual acceptance.

## October 12 second visual review correction: morph in motion, bend on reverse

User rejected the too-weak bend and sharp entry/exit in video 932560.mp4, and pointed out reverse was only changing surface motion. The implementation now keeps a separate `shapeProgress` over ~0.2–0.3 s, with source-mode latch at 0.58 advancing and 0.42 retreating. It moves between two authorized sources *while still in motion*, instead of waiting for a motionless puddle. Both textures receive symmetrical source-space bending into a common intermediate field. There is no full-frame RGBA fade and no intermittent threshold-driven flipping. The forward torso has a visible 8.6-degree max controller bend with localized sampling rotation (0.88 weighting, pool pinned). Reverse remains quieter than forward but creates an actual silhouette deformation using `reverseBend` of up to 4.5 degrees, and returns from a forward glide to front idle once instead of showing the unchanged forward-glide art in reverse. No back-battle pose is reused and no sprite is mirrored.

Do **not** regress: source hashes, accepted crest and exact 1.9/5.1/7 Hz ripple settings and three original GLSL puddle deformations, source-space family scale, complete transparent source pixels, phone tmux route, and human pending verdict.

The transition still crosses two authored images with different anatomy. The deform-to-intermediate method reduces spatial discontinuity, but only phone visual review can establish whether the perceptual handoff is convincing. If not, a true landmark-mapped mesh or third approved reverse pose may be required; don't claim the continuity problem solved from green tests alone.
