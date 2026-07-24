# Pose Lab Agent Contract

For any pose, animation, retarget, sprite-motion, weapon, render, or review-link
work, read and follow `docs/POSE_IS_GOD.md` before editing.

Non-negotiable rules:

- The visible pose and motion are the product. Metrics and transport fidelity
  are evidence only.
- Author ordinary poses directly on the final performing rig. Do not replace
  direct posing with a procedural coordinate solver unless the task explicitly
  requires a reusable solver.
- Keep repository, authoring-render, hosted-runtime, and human-review evidence
  separate. Never claim one proves another.
- Use one weapon composition contract in both authoring and runtime.
- Treat all new candidates as quarantined until a human accepts the exact hosted
  Pose Lab result.
- Always provide the exact Pose Lab V2 review URL for animation handoff.
- Stop if the hosted route falls back to rest, activates the wrong clip, loses
  or recomposes the weapon, serves mismatched bytes, or cannot resolve an asset.

The invocation phrase is **Pose is God**. The explicit skill invocation is
`@pose-is-god`.
