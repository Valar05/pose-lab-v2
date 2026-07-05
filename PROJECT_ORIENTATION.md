# Pose Lab V2 Project Orientation

Pose Lab V2 is a clean saber workflow. It is not a Pose Lab fork and must not
inherit old Pose Lab runtime systems by default.

## Current Target

The visible target is deliberately small:

- Meshy character visible from `public/assets/meshy/meshy_apose_walking_with_skin.glb`.
- Real sabre mesh visible from `public/assets/meshy/meshy_real_sabre.glb`.
- Direct visual saber placement controls inspired by TFTM placement workflow.
- Baked `Ready` pose data, not runtime retargeting.
- `Attack1` remains a review target, but no accepted baked Attack1 pose is
  currently shipped.
- Draft animation candidates live under ignored `generated/pose-candidates/` and
  cannot become repo truth without promotion through `src/pose-status.js`.
- Boring FK saber ownership:
  `RightHand -> SaberGrip -> sabre mesh`.

The sabre must read as held by the character. A proxy, marker, route label,
telemetry value, or source-string assertion is not a visible saber.

## First Read Order

Before editing:

1. Read this file.
2. Read `README.md`.
3. Read `docs/VISUAL_VERIFICATION_DOCTRINE.md`.
4. For Attack1 or imported motion work, read
   `docs/POSE_LAB_V2_ATTACK_BAKE_DOCTRINE.md`.
5. For asset changes, read `ASSET_PROVENANCE.md`.

## Banned Imports From Old Pose Lab

Do not bring these into V2 unless the user explicitly reverses this contract:

- debug bridge workflows;
- proxy sabers or marker-only acceptance;
- old generated visual evidence frameworks;
- runtime retargeting systems;
- runtime FK/IK solver stacks;
- visual metric gates as acceptance;
- local screenshot or localhost capture as final truth;
- route-only, HTTP-only, build-only, or telemetry-only success claims.

Old Pose Lab may be mined for source assets, source clips, or lessons learned.
Its architecture is evidence, not inheritance.

## Visual Acceptance

Hosted cloud review is the final visual surface. Local render is agent eyesight
only: it may catch blank pages, loading pages, error pages, missing meshes, and
obvious no-op visuals before the user is asked to look, but it is not final
acceptance.

Machine checks are guardrails:

- `node --check`
- `npm run build`
- `npm run smoke`
- source-string checks
- route checks
- asset reachability
- deploy success

These checks can explain why a page failed. They cannot prove that the Meshy
character, hands, camera, pose, or real sabre look correct. If the screenshot or
cloud review is human-red, the build is red.

## Boot And Render Shape

The app can feel slow because boot currently waits for a useful scene to be
assembled from large assets:

- Meshy GLB, about 7.5 MB.
- Real sabre GLB, about 11 MB.
- Meshy PBR textures, including a large normal map.
- Baked Ready pose module.
- Pose acceptance manifest: `src/pose-status.js`.
- Character normalization and first-use scene setup.

Future performance work should make boot progressive: show the character and
sabre as soon as the essential GLBs are ready, then apply heavier PBR or
camera-specific preparation asynchronously. Do not hide slow loading behind a
false-green route or smoke result.

## Verification Commands

Common guardrails:

```sh
npm run bake:ready
npm run build
npm run smoke
git diff --check
```

Use the smallest relevant set for the change. A documentation-only patch usually
needs `git diff --check` and readback. Runtime, pose, or asset work needs the
related bake/build/smoke checks plus hosted visual review.

## Reporting Rule

Reports must separate:

- files changed;
- guardrail checks run;
- hosted URL when relevant;
- visual state observed;
- remaining red build evidence.

Do not report visual success unless the hosted review surface visibly shows the
requested result.
