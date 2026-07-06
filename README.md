# Pose Lab V2

Clean saber placement surface.

This repo contains only:

- the Meshy A-pose/standing source GLB used as the visible character;
- the Meshy Character Sheet PBR texture channels extracted from
  `Meshy_AI_Meshy_Character_Sheet_0705152059_texture.glb`;
- the real Meshy sabre GLB;
- TFTM-style direct placement controls for the visible sabre.
- one baked Meshy `Ready` pose preset generated from the old FPS
  `OneHandReady` reference through source-orientation retargeting and IK hand
  pinning, with no hidden runtime wrist-roll patch.
- an `Attack1` review target, currently quarantined because no accepted Meshy
  `OneHandAttack1` bake exists in repo truth.
- an `Attack2` quarantined combo review candidate that starts from Attack1
  contact hold rather than Ready.

It is not a Pose Lab fork. It does not include runtime retargeting, runtime
FK/IK solvers, debug bridges, visual metric gates, case systems, or numeric
authoring panels.

## Use

```sh
npm run build
```

Tap the real sabre, then use:

- `Move` to drag it in the camera plane;
- `Rotate` to orient it by drag;
- `Scale` to resize it by drag;
- `Copy Export` to copy the current transform JSON.

`Saber` mode edits the real sabre through a runtime `SaberGrip` parent under
the Meshy `RightHand` bone. `Pose` mode exposes curated Meshy body-bone handles
for rotate-only posing. Pose mode does not add IK, retargeting, animation clips,
or numeric pose panels.

`Rest` restores the golden Meshy source pose. `Ready` applies the baked
upper-body pose preset in memory; it does not run a retargeter or animate the
sabre. The sabre follows because `SaberGrip` is a child of `RightHand`.
`Attack1` now opens a manual first-person authoring draft by default: every
prime key starts as the accepted `Ready` pose, then can be posed by hand and
saved per key. A quarantined review candidate can still be loaded with
`?pose=attack1&candidate=attack1-candidate-1`; that route is for visual review
only and does not make Attack1 accepted repo truth.

Accepted pose modules are listed in `src/pose-status.js`. Draft animations must
stay under ignored `generated/pose-candidates/` until a hosted cloud review is
human-accepted, then promoted with `npm run promote:animation -- --pose attack1
--candidate generated/pose-candidates/FILE.js --evidence-url CLOUD_URL --verdict
accepted`.

Attack candidates use prime-key review anchors: start, anticipation, contact,
follow-through, recoil, and end. Candidate 1 must keep start/end equal to Ready,
preserve wrist/forearm travel, and pass the screen-space blade-tip guard before
it is reviewable.

Current useful attack authoring doctrine lives in
[Attack Authoring Learnings](docs/ATTACK_AUTHORING_LEARNINGS.md). The important
lesson is that usable attacks need hold/snap/hold/recover timing. Good isolated
poses are not enough.

Manual Attack1 authoring uses the same anchors but does not use candidate frames
as starting material. Use the key strip to select a key, pose bones visually in
FPV, tap `Save Key`, and `Export Clip` once for the whole animation. The export
schema is `pose-lab-v2-manual-animation-v1` with status `manual-review`.

For Attack1, screen-space means the review camera relationship the user can see,
not a rig-space proxy. Anticipation must show the sabre tip trailing left of the
hilt while the right shoulder/hand move right. Contact must reverse into a
viewer-left strike. A wrist-travel number, source-motion statistic, or successful
smoke run does not make a candidate visually acceptable if those relationships
are wrong.

Joint-pinned review is available as a quarantined authoring aid:
`npm run bake:attack1:joint-pinned` writes `attack1-joint-pinned-3`, which uses
FPS `ArmR`, `ForearmR`, `HandR`, and `WeaponR` as world-space reference evidence.
The bake pins Meshy `RightArm`, `RightForeArm`, and `RightHand` in calibrated
world space, then checks live elbow, wrist, blade-tip, and blade-angle error in
the browser. Review it with
`?pose=attack1&candidate=attack1-joint-pinned-3&view=fpv&worldSocket=1`. This is
not accepted Attack1 until promoted through the normal human-visible cloud
review.

Numbers are readout/export only. Authoring is direct visual manipulation.


## Meshy-Derived Fist Hands

Weaponless fist review can use a quarantined real-geometry fist asset generated
from the existing Meshy hand vertices:

```sh
npm run build:fist-hands
npm run validate:fist-hands
```

This writes `public/assets/meshy/meshy_fist_hands.glb` for runtime review and
ignored diagnostic renders under `generated/meshy-fist-authoring/`. The runtime
loads it only for fist routes such as `?candidate=fist-ready-candidate-1` or
`?fistHands=1`, parents it under the real hand bones, and hides original FPV
hand vertices only in that fist review mode.

The fist asset is still quarantined until hosted cloud review says the hands
read as fists. The build and manifest only prove that the asset is current and
derived from the Meshy source.

## Checks

```sh
npm run bake:ready
npm run bake:attack1:candidate
npm run bake:attack1:tip-match
npm run bake:attack1:tip-basis
npm run bake:attack1:joint-pinned
npm run bake:attack2:candidate
npm run build
npm run smoke
npm run review:attacks
git diff --check
```

`npm run smoke`, syntax checks, source-string checks, and asset reachability are
guardrails only. They are not visual acceptance and cannot close a
screenshot-red build.

See [Visual Verification Doctrine](docs/VISUAL_VERIFICATION_DOCTRINE.md) for the
required evidence order before reporting visual progress.

## Cloud Review Rule

The hosted URL is the review surface. A successful deploy, HTTP 200 on the shell,
or reachable component files are not visual acceptance.

Local render is diagnostic eyesight, not acceptance. When the agent has local
render tooling, or the user asks for agent eyes before wake, run a local
boot/render probe first to catch blank screens, loading screens, error pages,
missing meshes, and obvious no-op visuals. Do not substitute that probe for the
hosted visual review.

When waking a cloud URL:

1. If local render/agent eyes are required, run that diagnostic before wake.
2. Verify the exact URL that was opened, including query string.
3. Verify the module and real GLB assets referenced by that page.
4. Treat those checks as blank-page diagnostics only.
5. Do not claim visual success until the hosted page visibly renders the Meshy
   character and real sabre.
