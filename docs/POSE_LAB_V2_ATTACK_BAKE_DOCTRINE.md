# Pose Lab V2 Attack Bake Doctrine

Pose Lab V2 converts weapon poses by baking small, reviewable pose data. It does
not import Pose Lab runtime systems.

Current status: `Attack1` is quarantined. The previous generated
`src/attack1-pose.js` and its false-green bake/diagnostic path were removed.
Keep `Attack1` as a target, but do not iterate on that deleted bad copy.

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
3. Start from the FPS source clip, not from any deleted/generated Meshy
   `Attack1` copy.
4. Bake Meshy upper-body samples from the source clip using imported keyed
   rotations plus the accepted `Ready` local roll offsets. Do not use IK hand
   pinning in the attack bake.
5. Write the bake as a static JavaScript data module only after visual review
   shows a sane arm chain and blade axis.
6. Runtime playback may interpolate baked quaternions, but it must not solve or
   reinterpret the attack.
7. Cloud review is the visible acceptance surface. Numeric wrist-travel checks
   are guardrails, not proof that the attack reads correctly.

## Acceptance

- Rest remains unchanged.
- Ready still loads and follows boring FK.
- Attack1 boots directly from `?pose=attack1`; until accepted bake data exists,
  it must report quarantine and show the Ready fallback.
- The right wrist/forearm visibly twist through the strike instead of becoming a
  static held pose.
- The real sabre remains attached to `SaberGrip` and follows `RightHand`.
