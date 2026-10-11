# Serin Liquid Idle V1 · quarantined campaign

## Authority

- Artwork: the exact approved one-frame RGBA PNG, **1086×1448**, SHA-256 **00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f**.
- Phone ingress: \`/storage/emulated/0/Pictures/file_00000000c48481f5a63e37968c17dffe.png\`.
- Git-owned source once committed: \`public/assets/serin/serin-idle.png\`.
- One image is pose authority. Neither generated intermediate sprites nor guessed atlas cells may replace it.
- Vanguard one-frame idle is **conceptual inspiration only**, not a source image or shared renderer modification.
- Root motion is OFF. Transparent alpha is retained. Human visual acceptance is pending.

## Shading

Dedicated, small WebGL1/GLSL fragment pass in \`src/serin-idle-preview.js\` on \`motion.html?procedural=serin-idle\`. Feathery position-dependent inversely sampled displacement:
- layered hair inertia, anchored at its root;
- flowing liquid-column bend, tapering to the waist;
- lower pool radial ripples, with stationary ground footprint;
- tiny separate torso breathe;
- star glints and nebula current highlights.

Shader amounts are individually adjustable. Prefers-reduced-motion pauses by default. Canvas alpha stays transparent; checkerboard is stage-only and never baked into asset. WebGL unavailable: show the *actual* static approved frame, explicitly label fallback.

## One phone command

Run from an authenticated Termux checkout of Pose Lab V2 (this does not change its current working tree):

\`\`\`sh
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-liquid-idle-v1 && git show FETCH_HEAD:tools/campaigns/serin-liquid-idle-v1.sh | bash
\`\`\`

The repo-owned script creates an isolated worktree, reads the laws and contract, verifies the source, stages **only** the exact PNG, creates implementation/receipt commits, pushes with revision readback, tests and builds, and runs an isolated tmux HTTP server. It prints and opens its phone-local review URL. All user dirty-tree archaeology remains untouched. No giant pasted code and no base64 binary transport.

## Acceptance boundary

A Git branch or build green is not a visible review. Phone runtime HTTP and SHA readback prove transport, not visual quality or deployed hosted cloud status. Candidate stays quarantined until the correct Pose Lab result is inspected by Drew. Do not merge into main or claim accepted visual motion without that verdict.
## Eye blink continuation (2026-10-11)

The earlier idle is visually liked, so all accepted liquid, hair, backdrop and one-frame identity values are preserved. Added two artwork-calibrated eye masks (left 668,110 radius 25×11; right 713,126 radius 19×9) in **source pixel coordinates**. Blinks close briskly, open more slowly, occur irregularly over a 34-second deterministic sequence, and sometimes double blink. A **Blink now** button provides immediate human review independent of animation's pause state. Blink strength zero returns the original facial pixels; no change to source PNG. The crop overlay used to estimate coordinates is diagnostic only, never a runtime input. Tests pin original hair, pool, tail and breath shader expressions.

Original command, branch and repo-owned campaign launcher remain unchanged. Reload using the existing launcher to pick up the new exact commit. Phone-side screenshots and visual acceptance remain pending.

## Corrected eyelid campaign

Human rejected the cheek-sampled covering and sparse spacing. This revision replaces the painted facial overlay with reversible **upper-lid image deformation**. A top eyelid tissue interval from the same canonical PNG is stretched downward; exposed original iris interval compresses toward the stationary lower eyelid. No skin tint, line drawing, cheek sampling, regeneration, additional frame or alpha change. At zero blink the exact original facial pixels are returned, and earlier accepted hair/liquid/pool math remains unchanged.

Schedule is deterministic over 22 seconds with five regularly spaced intervals of about 3–5 s and one closely spaced double blink. `Blink now` continues to work. Exact phone campaign launcher in this document is unchanged. Result is a quarantined candidate until the user reviews eyelid movement on the phone.
