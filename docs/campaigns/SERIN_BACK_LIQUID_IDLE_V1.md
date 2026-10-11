# Serin Back Liquid Idle V1

Source: exact approved 1024x1536 transparent RGBA PNG, SHA-256 `e666cd65570ee7485f8c5e6c422fb0172883a317e0bea466477e201d45f6c79c`.
Phone ingress: `/storage/emulated/0/Pictures/file_000000004e1081f5b22a4ef0ddd717a5.png`. No image regeneration or guessed replacement files.

New Pose Lab V2 variant route: `motion.html?procedural=serin-back-idle`. One source frame, no root motion. Reuses dedicated WebGL source deformation architecture, preserving original Serin front and other characters. The glimmer, hair, liquid, pool and upper lid are separately animated. Blink eyes calibrated at (551,124) and (604,147) source pixels. Visual acceptance pending.

Run from Termux (working tree and other tmux sessions preserved):

```sh
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-back-liquid-idle-v1 && git show FETCH_HEAD:tools/campaigns/serin-back-liquid-idle-v1.sh | bash
```

The script uses Git source control for binary ingress from the existing phone path, verifies exact hash, commits and pushes a receipt, builds an isolated worktree, serves in tmux and checks served dependencies and SHA. The browser URL is a review surface, not proof of accepted animation; Drew is visual acceptance authority. No changes are made to front Serin renderer or source.
