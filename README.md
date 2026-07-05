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

Numbers are readout/export only. Authoring is direct visual manipulation.

## Checks

```sh
npm run bake:ready
npm run build
npm run smoke
git diff --check
```

## Cloud Review Rule

The hosted URL is the review surface. A successful deploy, HTTP 200 on the shell,
or reachable component files are not visual acceptance.

When waking a cloud URL:

1. Verify the exact URL that was opened, including query string.
2. Verify the module and real GLB assets referenced by that page.
3. Treat those checks as blank-page diagnostics only.
4. Do not claim visual success until the hosted page visibly renders the Meshy
   character and real sabre.
