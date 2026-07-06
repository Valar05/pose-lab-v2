# Asset Provenance

## Meshy Character

- Runtime file: `public/assets/meshy/meshy_apose_walking_with_skin.glb`
- Source workspace file: `../pose-lab/assets/models/meshy_character_sheet/animated/Meshy_AI_Meshy_Character_Sheet_biped_Animation_Walking_withSkin.glb`
- Role: visible A-pose Meshy character reference for saber placement.

## Meshy Sabre

- Runtime file: `public/assets/meshy/meshy_real_sabre.glb`
- Source workspace file: `../pose-lab/assets/models/meshy_sabre/Meshy_AI_A_French_revolution_c_0628223518_texture.glb`
- Role: real visible sabre mesh for direct placement.

## Three.js Runtime

- Runtime files: `vendor/three/`
- Source workspace files: `../tanks-for-the-memories/node_modules/three/`
- Version: `0.166.1`
- Role: same-origin browser runtime for GLB loading, orbit camera controls, and
  WebGL rendering without a CDN startup dependency.
- Included examples modules: `GLTFLoader.js`, `OrbitControls.js`, and
  `BufferGeometryUtils.js`.

## FPSPlayer Pose References

- Source workspace file: `../pose-lab/assets/models/FPSPlayer.glb`
- Runtime files generated from it: `src/ready-pose.js`
- Role: source-only pose reference for baking Meshy upper-body states. The GLB
  is not loaded by the browser runtime, and no old Pose Lab runtime retargeter,
  gates, debug bridge, or weapon solver was copied.
- `Attack1` is still a desired target, but the previous generated
  `src/attack1-pose.js` was quarantined and removed because visual review proved
  it encoded a bad pose.
- Future generated animation candidates belong in ignored
  `generated/pose-candidates/` until promoted with cloud visual evidence.

No Pose Lab runtime code, rig profiles, generated visual artifacts, debug bridge
code, or metric acceptance tooling was copied.

## Meshy-Derived Fist Hands

- Runtime file: `public/assets/meshy/meshy_fist_hands.glb`
- Source file: `public/assets/meshy/meshy_apose_walking_with_skin.glb`
- Authoring script: `authoring/meshy_fist/blender_build_meshy_fist_authoring.py`
- Build command: `npm run build:fist-hands`
- Role: quarantined fist visual review asset for weaponless fist routes. The asset
  is derived from actual Meshy hand-weighted vertices, compacted into closed fist
  hulls, and parented under the existing `RightHand` / `LeftHand` bones at
  runtime. It is not a proxy primitive and it does not mutate the original Meshy
  body mesh or skin weights.
- Generated diagnostics: `generated/meshy-fist-authoring/` is ignored scratch;
  rerun `npm run build:fist-hands` and `npm run validate:fist-hands` to refresh
  local Blender renders and the manifest.
- Acceptance: diagnostic manifests and Blender renders are guardrails only. The
  cloud V2 route must still visibly read as a fist before the asset is accepted.
