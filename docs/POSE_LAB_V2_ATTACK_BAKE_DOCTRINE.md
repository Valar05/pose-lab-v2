# Pose Lab V2 Attack Bake Doctrine

Pose Lab V2 converts weapon poses by baking small, reviewable pose data. It does
not import Pose Lab runtime systems.

Current status: `Attack1` is quarantined. The previous generated
`src/attack1-pose.js` and its false-green bake/diagnostic path were removed.
Keep `Attack1` as a target, but do not iterate on that deleted bad copy.
New candidates must be generated under ignored `generated/pose-candidates/`, not
directly into accepted runtime paths. A tracked `src/review-candidates/*` module
may exist only as a quarantined cloud-preview surface and must not change
`src/pose-status.js` to accepted.

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
- Do not translate visual choreography into unverified rig-space guesses. A
  wrist twist, Euler sign, or quaternion travel total is not accepted until it
  produces the requested screen-space relationship.

## Attack1 Choreography Contract

Before changing Attack1 keys, write the visible predicate for the active review
camera and make the candidate satisfy that predicate.

- Anticipation: right shoulder and right hand travel viewer-right, near the FPV
  screen edge; the sabre tip trails viewer-left of the hilt; the tip does not
  drop below the hilt.
- Contact: the strike reverses anticipation and travels viewer-left; the blade
  reads as striking left; the left arm may leave the FPV frame rather than
  competing with the strike.
- Follow-through and recoil inherit the contact path and settle back toward
  Ready without breaking hand ownership.

If the screenshot contradicts one of these visible predicates, the candidate is
red even when source-motion metrics, wrist-travel totals, build checks, and
smoke checks pass.

## Bake Workflow

1. Inspect the source clip inventory from `FPSPlayer.glb`.
2. Confirm the source clip, duration, and keyed wrist/forearm/socket tracks.
3. Start from the FPS source clip, not from any deleted/generated Meshy
   `Attack1` copy.
4. Bake Meshy upper-body samples from the source clip using imported keyed
   rotations plus the accepted `Ready` local roll offsets. Do not use IK hand
   pinning in the attack bake.
5. Write the bake as a candidate JavaScript data module. For cloud review,
   `attack1-candidate-1` uses prime-key anchors: start, anticipation, contact,
   follow-through, recoil, and end.
6. Runtime playback may interpolate baked quaternions, but it must not solve or
   reinterpret the attack.
7. Cloud review is the visible acceptance surface. Numeric wrist-travel checks
   are guardrails, not proof that the attack reads correctly.
8. Reject the candidate if the projected blade tip/hilt relationship does not
   match the choreography contract. Diagnose the bone-roll or authored-key
   interpretation; do not fix the failure by moving the sabre independently.
   A low screen-space tip-target error is insufficient. The current Attack1
   review candidate must prove the Meshy right elbow, wrist, and real sabre tip
   match calibrated FPS world-space joint/socket targets; live browser readout
   must fail if the current interpolated frame diverges from those targets.
9. Promote the candidate into accepted pose status only after human-visible cloud acceptance,
   using the promotion command so `src/pose-status.js` records the accepted hash
   and evidence URL.

## Acceptance

- Rest remains unchanged.
- Ready still loads and follows boring FK.
- Attack1 boots directly from `?pose=attack1`; until accepted bake data exists,
  it must report quarantine and show the Ready fallback.
- The right wrist/forearm visibly twist through the strike instead of becoming a
  static held pose.
- The real sabre remains attached to `SaberGrip` and follows `RightHand`.
