# Asset Provenance

## Swarmling

- Authoring source: `authoring/swarmling/Swarmling.blend`
- Authoring manifest: `authoring/swarmling/manifest.json`
- Source SHA-256: `1ec19b77e6bf4e0cf1fbb85c5a875d76afce68145e8494af548a046b2770b0ca`
- Source Blender version: 4.04
- Embedded action names observed before native inspection: `Idle`, `Attack`
- Tank Kata source inventory:
  - `assets/generated/meshy/swarmling/Meshy_AI_Swarmling_0723173944_texture.glb`
  - `assets/generated/meshy/swarmling/Meshy_AI_Swarmling_biped.zip`
  - `assets/generated/meshy/swarmling/manifest.json`
- Role: first Fleshpunk beat-em-up enemy and control specimen for ordinary
  approach, interruption, stagger, and death behavior before Slasherrats teach
  the game's continuous U-turn movement grammar.
- Animation rule: native source animation owns pose, limb ownership, timing,
  and camera-relative choreography. Appearance work may improve costume,
  materials, colors, and surface treatment without changing animation geometry.
- Current status: the `.blend` source is preserved in Pose Lab V2. Native
  Blender inventory, runtime GLB export, locked gameplay-camera renders, and
  concept-art anchoring remain required before visual acceptance.



## Crimson Plume Knight / Arborblade

- Full runtime character file: `public/assets/crimson/crimson_plume_knight_rigged_pbr.glb`
- Full runtime sword file: `public/assets/crimson/arborblade_sword.glb`
- Default review character file: `public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb`
- Default review sword file: `public/assets/crimson/arborblade_sword_review.glb`
- Review asset manifest: `public/assets/crimson/crimson_review_assets_manifest.json`
- Runtime manifest: `public/assets/crimson/crimson_manifest.json`
- Sword calibration: `public/assets/crimson/crimson_sword_calibration.json`
- Model-viewer constraint contract: `public/assets/crimson/crimson_model_viewer_constraints.json`
- Vanguard attack reference: `public/assets/crimson/vanguard_swordattack1_reference.json`
- Rig source archive: `/storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_biped.zip`
- Rig source files inside archive:
  - `Meshy_AI_Crimson_Plume_Knight_biped/Meshy_AI_Crimson_Plume_Knight_biped_Animation_Walking_withSkin.glb`
  - `Meshy_AI_Crimson_Plume_Knight_biped/Meshy_AI_Crimson_Plume_Knight_biped_Animation_Running_withSkin.glb`
- Full character material source: `/storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_0717211804_texture.glb`
- Full sword material source: `/storage/emulated/0/Download/Meshy_AI_Arborblade_0717211756_texture.glb`
- Build script: `tools/import_crimson/build_crimson_assets.mjs` plus `tools/import_crimson/normalize_crimson_sword.mjs` and `tools/import_crimson/optimize_crimson_review_assets.py` (`npm run build:crimson`)
- Offline review script: `tools/import_crimson/render_crimson_sword_calibration_blender.py` (`npm run review:crimson-sword`)
- Hosted review URL script: `tools/crimson_sword_review_url.mjs` (`npm run review:crimson-sword-url`)
- Cloud visual acceptance gate: `tools/require_crimson_cloud_visual_evidence.mjs` (`npm run accept:crimson-sword`)
- Reference script: `tools/import_crimson/extract_vanguard_swordattack1_reference.mjs` (`npm run reference:crimson:swordattack1`)
- Role: Crimson Plume Knight authoring lane with a real static PBR Arborblade sword attached through `RightHand -> SaberGrip -> ArborbladeSword`. The biped source contributes skeleton, skin, walking, and running clips; the static character GLB contributes full PBR texture channels; the static sword GLB contributes the real sword mesh/material. The project-owned runtime sword is a normalized derivative with the hilt anchor at local origin and the blade pointing along local +Z; source download bytes remain the provenance input. The calibration records this offline-socket-calibrated contract and does not claim hosted visual acceptance. The optimized review GLBs are project-owned derivatives made by resizing embedded PBR JPEG payloads for hosted review speed; they preserve source geometry, skin, animations, materials, and sword calibration while the full imported GLBs remain available with `quality=source`. Crimson sword changes must reconcile constrained Blender diagnostics with hosted Pose Lab browser socket proof before they can be reported. Local Blender diagnostics are fail-closed against the model-viewer constraint contract and cannot invent independent sword placement, scale, camera, or hierarchy. Crimson sword visual acceptance is blocked until `generated/cloud-visual-evidence/crimson-sword/latest.json` contains fresh hosted screenshot evidence accepted by `npm run accept:crimson-sword`. Vanguard `SwordAttack1` is reference-only timing/relationship evidence for a later quarantined Crimson attack candidate.

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

## Vanguard

- Runtime file: `public/assets/vanguard/vanguard_rigged_animations.glb`
- Runtime manifest: `public/assets/vanguard/vanguard_manifest.json`
- Source blend: `/storage/emulated/0/Download/Vanguard.blend`
- Build script: `tools/import_vanguard/export_vanguard_glb.py` (`npm run build:vanguard`)
- Inspect script: `tools/import_vanguard/inspect_vanguard_blend.py` (`npm run inspect:vanguard`)
- Exported objects: `Body`, `Long_Sword`, and `rig`; Rigify widget meshes are excluded.
- Embedded clips: 20 source actions, including `Idle`, `ClubIdle`, `RunForwardOld`, `SpinAttack`, `SwordAttack1` through `SwordAttack5`, midair sword attacks, jump, land, and ledge clips.
- Texture status: the blend references `D:/Unity/Warrior Apocalypse/Assets/Textures/LowPolyPropsAlbedoVanguard.jpeg` and `D:/Unity/Warrior Apocalypse/Assets/Textures/Vanguard_albedo.jpeg`, but those images were not packed and loaded as 0x0 missing images during import. The runtime applies a generated fallback palette because the exported body vertex colors are white: light blue plates, dark green underarmor, red helmet feathers, cyan eyeholes, and bounded steel for the sword/props until the original albedo files are recovered.
- Root motion sidecar: `public/assets/vanguard/vanguard_root_motion.json`, extracted from `pose.bones["root"].location` at 60 fps. Pose Lab does not apply this root motion; the browser resets the imported `root` bone after animation updates so clips preview in-place while game locomotion data remains available.
- Role: imported Vanguard character/animation inspection lane selectable with `?model=vanguard` and playable with `?model=vanguard&clip=ClipName`. It is not Meshy accepted pose truth and does not use Meshy Ready, Attack1, fist hands, or the real sabre placement lane.

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

### Vanguard Muramasa 2.5D oberhau canary

- Canonical appearance source: `public/assets/vanguard/fleshpunk/idle/frames/idle_0000.png`.
- Approved motion witness: frame 42 / key 7 under `public/assets/vanguard/fleshpunk/candidates/false-edge-oberhau-001/`.
- Editable source is the immutable Home Center-backed Blender revision; repo PNGs are quarantined review derivatives.
- Attempt 003 repairs production v21 using the existing four attachment roots and records all component reuse in `authoring/vanguard_muramasa_canary/part-library.json`.
- Whole-frame generation, a fifth attachment, and motion changes are forbidden.
- Human acceptance remains Drew Clarke only.


## FPSPlayer Arms Donor

- Runtime review asset: `public/assets/fpsplayer/FPSPlayer.glb`
- Source lineage: original FPSPlayer donor from the Pose Lab / Infinite Brutality family
- Role: low-poly torso-less first-person body and embedded animation inspection lane
- Canonical review surface: existing phone-hosted Pose Lab V2 runtime sourced from this GitHub repo; do not create a separate ChatGPT/Site host.
- Phone route after checkout sync: `http://127.0.0.1:4173/?model=fpsplayer`
- Review route suffix: `?model=fpsplayer`
- Direct clip route: `?model=fpsplayer&clip=CLIP_NAME`
- Embedded source inventory: 55 animations; individual finger bones are preserved
- Rule: this route is source inspection. Do not retarget, rebuild topology, or alter weights merely to review the original motions.

## FPSPlayer ARIES V8 — accepted material baseline

| Field | Value |
| --- | --- |
| Pose Lab model key | `fpsplayer-aries-v8` |
| Accepted Blender master | `FPSPlayer_ARIES_ORM_v8.blend` |
| Runtime GLB | `FPSPlayer_ARIES_ORM_v8_runtime.glb` |
| Runtime SHA-256 | `0360bcac731882f20ae39b8e7869251263b6836de175ec701e003949d9e26089` |
| Artifact source | `Valar05/taste-trap-material-lab@3f3ae1f3edfacb61d74bb3089264e92c12025109` |
| Material maps | Albedo V5.1; Normal V3; packed ORM V8 |
| Accepted inventory | 15 physical plates; 16 meshes; 1 skin; 57 animations |
| Accepted review | Android first-person view at 105 degree FOV |
| 2D derivative rule | Append-only under `public/assets/fpsplayer-aries-v8/2d/`; accepted 3D source and accepted pixels remain immutable |

The exact file hashes and the standalone texture hashes are authoritative in `public/assets/fpsplayer-aries-v8/fpsplayer_aries_v8_manifest.json`.

