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
- Runtime files generated from it: `src/ready-pose.js`,
  `src/attack1-pose.js`
- Role: source-only pose reference for baking Meshy upper-body states. The GLB
  is not loaded by the browser runtime, and no old Pose Lab runtime retargeter,
  gates, debug bridge, or weapon solver was copied.

No Pose Lab runtime code, rig profiles, generated visual artifacts, debug bridge
code, or metric acceptance tooling was copied.
