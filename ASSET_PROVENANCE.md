# Asset Provenance


## Davin Wingsworth / Kestrel Man

- Source merged file: `public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb`
- Runtime file: `public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb`
- Rig source archive: `/storage/emulated/0/Download/Meshy_AI_Sky_Patrol_Hawk_biped.zip`
- Rig source files inside archive:
  - `Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Walking_withSkin.glb`
  - `Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Running_withSkin.glb`
- Full material source: `/storage/emulated/0/Download/Meshy_AI_Sky_Patrol_Hawk_0716213205_texture.glb`
- Build script: `tools/build_davin_wingsworth_glb.mjs`
- Tail authoring script: `tools/author_davin_tail_chain_blender.py` (`npm run build:davin-tail3`)
- Tail authoring manifest: `generated/davin-tail-authoring/manifest.json`
- Role: default manual pose-authoring character for Davin Wingsworth, the Kestrel Man. The source merged GLB preserves the rig/skin from the biped source, embeds walking and running animations, and replaces the simple rig material with the full base-color, metallic-roughness, normal, and emissive material channels from the textured source GLB. The runtime GLB is a derived asset that adds real `Tail01`, `Tail02`, and `Tail03` bones under `Hips`, isolates the rear feather/tail vertices from body and leg groups, and binds that cluster across the three-segment chain for later spring-bone motion.
- Screenshot idle source: `/storage/emulated/0/Pictures/Screenshots/Screenshot_20260716-182009.png`
- Screenshot idle authoring script: `tools/author_davin_idle_screenshot_blender.py` (`npm run bake:davin-idle`)
- Screenshot idle diagnostic script: `scripts/render-davin-idle-diagnostic.mjs` (`npm run review:davin-idle`)
- Screenshot idle candidate: `src/review-candidates/davin-idle-screenshot-1.js`

## Meshy Character

- Runtime file: `public/assets/meshy/meshy_apose_walking_with_skin.glb`
- Source workspace file: `../pose-lab/assets/models/meshy_character_sheet/animated/Meshy_AI_Meshy_Character_Sheet_biped_Animation_Walking_withSkin.glb`
- Role: visible A-pose Meshy character reference for saber placement.

## Meshy Sabre

- Runtime file: `public/assets/meshy/meshy_real_sabre.glb`
- Source workspace file: `../pose-lab/assets/models/meshy_sabre/Meshy_AI_A_French_revolution_c_0628223518_texture.glb`
- Role: real visible sabre mesh for direct placement.


## Imported Gravity Fist Character Rigs

- Runtime file: `public/assets/ares/ares_rigged_diffuse.glb`
- Source workspace file: `../gravity-fist-threejs/assets/models/Ares.glb`
- Sidecar texture copy: `public/assets/ares/ares_texture_0.png`
- Source sidecar texture: `../gravity-fist-threejs/assets/models/Ares_texture_0.png`
- Role: imported Mixamo-rigged Ares authoring model for manual Pose Lab V2 pose work. It is selectable with `?model=ares` and maps Pose Lab logical body controls to `mixamorig:*` bones. It is not an accepted Meshy baked-pose target and does not use the Meshy sabre, fist-hands, or Ready/Attack1 status lane.

- Runtime file: `public/assets/ares/security_titan_rigged_diffuse.glb`
- Source workspace file: `../gravity-fist-threejs/assets/models/SecurityTitan.glb`
- Sidecar texture copy: `public/assets/ares/security_titan_texture_0.png`
- Source sidecar texture: `../gravity-fist-threejs/assets/models/SecurityTitan_texture_0.png`
- Role: imported Mixamo-rigged SecurityTitan authoring model for manual Pose Lab V2 pose work. It is selectable with `?model=security-titan` and shares the same logical-to-Mixamo pose-control mapping. It is kept separate from the Meshy saber-placement baseline.

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
