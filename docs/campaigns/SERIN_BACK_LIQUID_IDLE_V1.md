# Serin Back Liquid Idle V1

Source: exact approved 1024x1536 transparent RGBA PNG, SHA-256 `e666cd65570ee7485f8c5e6c422fb0172883a317e0bea466477e201d45f6c79c`.
Phone ingress: `/storage/emulated/0/Pictures/file_000000004e1081f5b22a4ef0ddd717a5.png`. No image regeneration or guessed replacement files.

New Pose Lab V2 variant route: `motion.html?procedural=serin-back-idle`. One source frame, no root motion. Reuses dedicated WebGL source deformation architecture, preserving original Serin front and other characters. The glimmer, hair, liquid, pool and upper lid are separately animated. Blink eyes calibrated at (551,124) and (604,147) source pixels. Visual acceptance pending.

Run from Termux (working tree and other tmux sessions preserved):

```sh
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-back-liquid-idle-v1 && git show FETCH_HEAD:tools/campaigns/serin-back-liquid-idle-v1.sh | bash
```

The script uses Git source control for binary ingress from the existing phone path, verifies exact hash, commits and pushes a receipt, builds an isolated worktree, serves in tmux and checks served dependencies and SHA. The browser URL is a review surface, not proof of accepted animation; Drew is visual acceptance authority. No changes are made to front Serin renderer or source.

## 2026-10-11: phone runtime guard repair

Observed on the actual phone after successful PNG ingress: `Serin source contract mismatch` on the back-view route. The runtime retained a corrupted front-view SHA string because an overly broad numeric substitution changed digits inside the former 64-character digest. GitHub build/asset checks did not catch this browser boot failure. Patch narrows to the source guard only: pin the exact approved 64-digit Serin-back SHA, keep recipe schema and source checks fail-closed, verify recipe ↔ JS literal ↔ Git-owned PNG together in CI, and fix the phone campaign's `node --check` target to the back-view renderer. No visual changes. Human review remains pending until corrected route displays the actual animation.
