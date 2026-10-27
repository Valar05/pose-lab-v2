# Serin unified locomotion V1 (Pose Lab V2)

One new unified phone review scene for approved front idle and its upper-lid blink, ground glide and bow waves, reverse, immediate jump from either idle or glide, and graphical landing response. Never overwrite the existing accepted ground preview.

Source locks: front `00ba472a...`, right glide `8c0d9b48...`; no image substitutions or independent scale normalization. The accepted previous Wave Glide and standalone front idle remain independent unmodified review surfaces.

Flight image truth: No separately authored midair PNG has been accepted or ingested. The new airborne silhouette is authored in-place by a procedural warp of the already-authorized current one-frame image, with a trailing liquid column and a residual grounded pool. A dedicated authored midair key may be added later if human review asks for it.

Physics: jump impulse 760 px/s upward, gravity 1260 px/s2, instant same-frame input with no pre-launch crouch delay. Original X movement continues in air. Landing squash is presentation only, so a second jump may occur before the squash ends. Stage gains 359 source pixels of headroom while preserving the same native 1086px source width.

Blink: canonical front recipe supplies exact left/right eye rectangles, scheduled double-blink timing, manual blink, and the existing upper-lid-only deformation algorithm. No eyelid repaint. Existing 1.9/5.1/7 Hz wave phase, crest and grounded fluid source equations remain unchanged.

Controls: Glide right, Stop, Reverse, Jump, Blink now; Space/ArrowUp jump, ArrowLeft/Right move, S stop; tap Jump while moving to test glide-to-air.

Phone launch command:
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-unified-locomotion-v1 && git show FETCH_HEAD:tools/campaigns/serin-unified-locomotion-v1.sh | bash

Await actual phone video verdict for airborne silhouette, source selection, landing clarity, alpha and clipping. GitHub CI is not visual acceptance.
