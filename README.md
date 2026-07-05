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
`Attack1` remains a selectable target, but it intentionally falls back to Ready
until a clean source-derived bake is accepted. A quarantined review candidate can
be loaded with `?pose=attack1&candidate=attack1-candidate-1`; that route is for
visual review only and does not make Attack1 accepted repo truth.

Accepted pose modules are listed in `src/pose-status.js`. Draft animations must
stay under ignored `generated/pose-candidates/` until a hosted cloud review is
human-accepted, then promoted with `npm run promote:animation -- --pose attack1
--candidate generated/pose-candidates/FILE.js --evidence-url CLOUD_URL --verdict
accepted`.

Attack candidates use prime-key review anchors: start, anticipation, contact,
follow-through, recoil, and end. Candidate 1 must keep start/end equal to Ready,
preserve wrist/forearm travel, and pass the screen-space blade-tip guard before
it is reviewable.

Numbers are readout/export only. Authoring is direct visual manipulation.

## Checks

```sh
npm run bake:ready
npm run bake:attack1:candidate
npm run build
npm run smoke
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
