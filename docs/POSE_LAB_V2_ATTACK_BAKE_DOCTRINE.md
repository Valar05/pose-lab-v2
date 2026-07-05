# Pose Lab V2 Attack Bake Doctrine

Pose Lab V2 converts weapon poses by baking small, reviewable pose data. It does
not import Pose Lab runtime systems.

## Fixed Rules

- The Meshy rest/A-pose is immutable. If rest changes, the change is wrong.
- `Ready` is the calibration baseline for one-hand saber work.
- `OneHandAttack1` is an animated sequence, not a single contact pose.
- The source wrist twist is a time-varying relationship across `Arm.R`,
  `Forearm.R`, `Hand.R`, and the FPS weapon socket reference. Preserve it as
  baked upper-body pose samples.
- FPS weapon socket data is reference evidence only. The visible sabre remains
  boring FK under `RightHand -> SaberGrip -> sabre mesh`.
- Do not add runtime retargeting, IK solvers, debug bridges, generated visual QA
  frameworks, or Pose Lab gate systems to V2.

## Bake Workflow

1. Inspect the source clip inventory from `FPSPlayer.glb`.
2. Confirm the source clip, duration, and keyed wrist/forearm/socket tracks.
3. Bake Meshy upper-body samples from the source clip using the same frame
   mapping and hand pinning style that produced the accepted `Ready` baseline.
4. Write the bake as a static JavaScript data module.
5. Runtime playback may interpolate baked quaternions, but it must not solve or
   reinterpret the attack.
6. Cloud review is the visible acceptance surface. Numeric wrist-travel checks
   are guardrails, not proof that the attack reads correctly.

## Acceptance

- Rest remains unchanged.
- Ready still loads and follows boring FK.
- Attack1 boots directly from `?pose=attack1`.
- The right wrist/forearm visibly twist through the strike instead of becoming a
  static held pose.
- The real sabre remains attached to `SaberGrip` and follows `RightHand`.
