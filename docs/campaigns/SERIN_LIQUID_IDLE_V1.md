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