# Thirdskin sparse runtime in Sprite Lab

Sprite Lab is the commissioned runtime and review surface for Thirdskin Commander. The 3D Pose Lab is not used for staging; Ares there is reference quarry only.

## Route

```text
?view=sprite&manifest=/path/to/thirdskin-runtime-plan.json
```

The manifest must use `thirdskin-runtime-plan-v1`, produced by the Thirdskin Commander compiler. Sprite Lab loads only unique source cells, verifies each cell SHA-256, evaluates deformation curves in memory, and changes cells only at exposure-program boundaries.

The Three.js path exists because Thirdskin requires asymmetric UV-side stretch, sampled outline/glow, and echo layers. It does not change cell count and does not write rendered frames.

## Status

The adapter is runtime-capable but remains visually red until a real compiled recipe with non-placeholder cell hashes is hosted and inspected. The existing April inline six-frame diagnostic is superseded and is not accepted input for this route.

Machine tests are guardrails. Human acceptance occurs on the exact hosted Sprite Lab URL.


## Persistent playback-speed control

Every animation review surface exposes a playback-speed **slider by default**.

- Range: `0.10×` through `3.00×`, in `0.05×` steps.
- The chosen value is written to browser local storage under one shared key: `pose-lab-v2.sprite-playback-speed.v1`.
- The same stored value is read by both the ordinary 2D animation reviewer and the Thirdskin sparse Sprite Lab route.
- Switching animations does not reset the slider.
- Reloading the page does not reset the slider.
- Timing bytes in manifests and runtime plans remain canonical and unchanged; the slider is strictly a review/playback multiplier.
- If local storage is unavailable, playback falls back to `1.00×` without blocking review.

This is intentionally a human-tuning surface: Drew can settle on a value once and report the exact multiplier rather than requesting repeated timing edits.
