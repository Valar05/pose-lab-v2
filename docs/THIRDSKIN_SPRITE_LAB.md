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
