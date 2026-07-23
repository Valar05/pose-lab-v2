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

Local-only procedural animation tooling lives in
[Local Blender Animation Muscle](docs/LOCAL_BLENDER_ANIMATION_MUSCLE.md). That
lane uses a video clip ledger, keyed contact sheets, saved-pose composition, and
Blender-rendered truth artifacts under ignored `generated/` paths. It is
diagnostic/authoring infrastructure, not browser/cloud visual acceptance.
Its first learning specimen is Gravity Fist `LowBackKick`, where a legacy
poseclip/evidence pair can be compared with an optional tripod recording before
any new animation is authored.
Cloud-worker packaging is documented in
[Cloud Worker Animation Surface](docs/CLOUD_WORKER_ANIMATION_SURFACE.md). That
surface materializes the learning packet inputs into a generated job bundle for
Home Center Command Center MCP one-shot Codex workers, so workers do not depend
on workspace skills, memories, sibling repos, or local browser state.

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



## Imported Character Pose Models

Davin Wingsworth, the Kestrel Man, is the default manual pose-authoring surface.
The merged runtime GLB is:

```text
public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb
```

It is derived from the merged rig/skin and walking/running clips from the downloaded biped zip
with the full base-color, metallic-roughness, normal, and emissive material
channels from the downloaded textured GLB. The original merged source remains at
`public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb`; the default runtime asset adds a real `Tail01` -> `Tail02` -> `Tail03` chain for spring-bone tests. Other imports remain available with:

```sh
?model=meshy
?model=ares
?model=security-titan
?model=vanguard
?model=vanguard&clip=SwordAttack1
```

The imported character routes are for direct manual posing and contact
sheet/source-art preparation. They do not use Meshy Ready, Attack1, fist hands,
or the real sabre placement lane unless the Meshy model is explicitly selected.

### Vanguard idle game export

The canonical imported Vanguard GLB can be exported as one deterministic,
game-ready idle slice:

```sh
npm run export:vanguard-idle
```

The command uses Vanguard's embedded native `Idle` action, six uniform loop
samples, one locked orthographic model-left camera that presents Vanguard
screen-right, and transparent RGBA output. It writes the numbered sequence,
3×2 contact sheet, 6 fps GIF, and metadata under
`generated/vanguard/idle/`. Verification fails closed when the camera changes,
the armature object moves, the background is not transparent, frame dimensions
differ, either canonical IK foot control moves more than two pixels, or the
rendered ground-contact row moves more than two pixels. The exporter samples
Vanguard's native `Idle` without muting root curves, rewriting bones, or moving
the armature. Foot and ground-contact data are measurements only. Set
`BLENDER_BIN` to an existing Blender executable; without it, the repo-owned
runner continues to use the existing Debian `proot-distro` Blender installation.

### 2D game-asset preview

Approved Fleshpunk Vanguard sprite sequences can be inspected without rendering
a GIF:

```text
?model=vanguard&view=2d&clip=Idle
?model=vanguard&view=2d&clip=SwordAttack1
```

`View: 2D` plays the promoted transparent PNG frames directly from
`public/assets/vanguard/fleshpunk/animations.json`. It does not use a GIF,
re-render the GLB, interpolate new frames, mirror the art, stabilize the
character, or reframe cells. The manifest preserves the approved model-left /
screen-right camera contract and the authored per-frame timing for the
six-frame `Idle` and twelve-frame `SwordAttack1`.

The preview controls provide play/pause, quarter/half/full speed, previous/next
frame, integer-frame scrubbing, and clip selection. The 2D surface hides the 3D
canvas, pose handles, and authoring gestures. The embedded GLB remains the pose
source used to create new animation geometry; the promoted RGBA PNG sequences
are the shippable game assets and the 2D review surface.


## Crimson Plume Knight / Arborblade

The new Meshy downloads are imported as a staged Crimson authoring lane:

```text
public/assets/crimson/crimson_plume_knight_rigged_pbr.glb
public/assets/crimson/arborblade_sword.glb
public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb
public/assets/crimson/arborblade_sword_review.glb
public/assets/crimson/crimson_review_assets_manifest.json
public/assets/crimson/crimson_sword_calibration.json
public/assets/crimson/crimson_model_viewer_constraints.json
public/assets/crimson/vanguard_swordattack1_reference.json
```

Use:

```sh
npm run build:crimson
npm run validate:crimson-model-viewer-constraints
npm run test:crimson-model-viewer-constraints
npm run optimize:crimson-review-assets
npm run test:crimson-review-assets
npm run review:crimson-sword
npm run review:crimson-sword-url
npm run validate:crimson-sword-intake
npm run accept:crimson-sword:cloud -- --visual-read "Hosted cloud screenshot shows..."
npm run accept:crimson-sword
npm run validate:crimson-sword
npm run reference:crimson:swordattack1
npm run review:crimson-attack1:cloud -- --dispatch
```

Review route:

```text
?model=crimson
?model=crimson&quality=source
```

The default Crimson route uses optimized review GLBs so cloud review does not
pay the full imported texture payload every frame. The full imported PBR GLBs
are preserved and selectable with `quality=source`; this is for fidelity and
provenance inspection, not the fast review loop. Regenerate the review GLBs with
`npm run optimize:crimson-review-assets` and enforce their payload/material
contract with `npm run test:crimson-review-assets`.

This route uses the Crimson biped for the body and the real Arborblade static
PBR sword under `RightHand -> SaberGrip -> ArborbladeSword`. Arborblade is
offline-normalized before browser use: the runtime GLB origin is the hilt
anchor, the blade points along local `+Z`, and the browser consumes the saved
`crimson_sword_calibration.json` grip/sword-local contract. Manual transform
tools remain useful for authoring, but they are not the basic import/socket
calibration path. The current calibration is deliberately labeled
`offline-socket-calibrated-not-hosted-visual-accepted`. Vanguard `SwordAttack1` is
extracted as timing and relationship reference only; its `Weapon.R` transforms
are not copied directly as accepted Crimson motion.
The Crimson download package has walking/running only, so any SwordAttack1 must
be authored as a quarantined candidate after grip/orientation review. Model-viewer constraints are now a fail-closed contract in `public/assets/crimson/crimson_model_viewer_constraints.json`: local Blender diagnostics must use the same asset paths, `RightHand -> SaberGrip -> ArborbladeSword` hierarchy, calibration transform, browser normalization policy, and review camera/viewport as the hosted model viewer. `npm run review:crimson-sword` validates that contract before Blender can render. Local Blender diagnostic renders for the normalized Crimson sword are written under ignored `generated/crimson-sword-calibration/`; they are agent eyesight, not hosted visual acceptance. Crimson sword work must pass the three-step loop: fix the constrained Blender view, verify hosted Pose Lab browser socket proof, then reconcile both surfaces before reporting.

Crimson sword checks are deliberately split. `npm run validate:crimson-sword-intake`
only proves asset intake, normalized hilt origin, local `+Z` blade axis, material
presence, and runtime wiring. It is a guardrail. The normal hosted evidence lane
is:

```sh
npm run accept:crimson-sword:cloud -- --visual-read "Hosted cloud screenshot shows..."
```

That command prints the exact cache-busted Crimson URL, waits for the current
Pages deploy when available, runs the `Crimson Visual QA` GitHub workflow with
system Chrome, downloads the cloud screenshot artifact, promotes
`generated/cloud-visual-evidence/crimson-sword/latest.json`, and runs
`npm run accept:crimson-sword`. The visual read is mandatory: telemetry cannot
promote itself. Use `--run-id GITHUB_ACTIONS_RUN_ID` to reuse an already captured
cloud artifact after visually inspecting its `screenshot.png`.

Only `npm run accept:crimson-sword` can pass Crimson sword visual acceptance.
The manifest must match the current `crimson-sword-<git-sha>` cache token and
explicitly assert that the real Arborblade is visible, the hilt is seated in
the right hand, the blade projects forward from the wrist, the hand is not
impaled, and no manual alignment was required. Local Android screenshots,
localhost captures, Blender renders, deploy success, build output, smoke
output, raw telemetry, and cloud action records with no inspected screenshot are
rejected for this acceptance gate.

Vanguard is exported from `/storage/emulated/0/Download/Vanguard.blend` into
`public/assets/vanguard/vanguard_rigged_animations.glb`. The runtime GLB keeps
the `Body`, `Long_Sword`, and `rig` objects plus 20 embedded Blender actions.
Use `npm run inspect:vanguard` to refresh the scratch inventory and
`npm run build:vanguard` to regenerate the runtime GLB. The source blend
references external Windows texture paths that were not packed. The runtime
applies a generated palette: light blue plates, dark green underarmor, red
helmet feathers, cyan eyeholes, and bounded steel sword/props material. The
original albedo files are still not present. Root
motion is saved separately in `public/assets/vanguard/vanguard_root_motion.json`
for game use and is intentionally suppressed in Pose Lab playback.

## Davin Tail Chain

Davin's default runtime model is a derived GLB with a three-segment tail chain:

```sh
npm run review:davin-tail-mask
npm run build:davin-tail3
```

`review:davin-tail-mask` is non-destructive: it writes the mask manifest and debug render without overwriting the runtime GLB. `build:davin-tail3` is fail-closed and refuses to export when the selected region is too wide, too tall, or too large to be a sane low rear tail fan.

The authoring tool imports the source merged Davin GLB, creates `Tail01`,
`Tail02`, and `Tail03` under `Hips`, removes existing body/leg influences from
the selected rear feather vertices, and binds that cluster across the new chain.
The output is `public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb`
with an ignored manifest at `generated/davin-tail-authoring/manifest.json`.
This is rig authoring only; the later spring-bone behavior still needs runtime
implementation and visual review.

## Davin Screenshot Idle Lane

The newest screenshot idle target is `Screenshot_20260716-182009.png`: a
three-quarter hawk-cop guard stance with head facing viewer-right, one wing
swept open, one wing held as a guard, wide talons, and a low rear tail fan. The
current first-pass 3D candidate is quarantined and visually red, but reproducible:

```sh
npm run bake:davin-idle
npm run review:davin-idle
# Browser review route:
?model=davin&pose=idle
```

The candidate module is `src/review-candidates/davin-idle-screenshot-1.js`; ignored diagnostics render under `generated/davin-idle/screenshot-1/`. The review command now also writes a screen-space projection overlay comparing explicit screenshot landmarks with projected rig points. No browser runtime IK or OpenPose dependency is added. This lane exists to expose the miss and iterate toward the screenshot silhouette, not to claim acceptance.

## Davin LowBackKick Viability Lane

Davin can load a quarantined LowBackKick candidate transferred from the old Ares
SF2-timed poseclip:

```sh
npm run bake:davin-lowbackkick
npm run build
# Browser review route:
?model=davin&pose=lowbackkick
```

The candidate is generated from `../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json`
and its matching visual-evidence timing file. The first pass maps shared Mixamo
style bones onto Davin, samples the eight SF2 read keys, and transfers rotations
only. It intentionally ignores source positions/scales and stays labeled
`diagnostic-not-acceptance` / `quarantined-review`.

For agent eyesight before cloud review, render a local diagnostic contact sheet:

```sh
npm run review:davin-lowbackkick
```

That writes ignored Blender frames and a stitched PNG under
`generated/davin-lowbackkick/contact-sheet/ares-transfer-1/`. The sheet is useful
for deciding whether Davin and Ares share enough rig behavior to keep investing,
but it is not the hosted visual truth lane and does not promote the animation.

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
npm run review:crimson-sword-url
npm run validate:crimson-sword-intake
npm run accept:crimson-sword:cloud -- --visual-read "Hosted cloud screenshot shows..."
npm run accept:crimson-sword
npm run cloud:agent-preflight
npm run test:learning-packet
npm run test:cloud-worker-surface
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
5. Do not claim visual success until the hosted page visibly renders the requested
   character and real weapon relationship.
6. For Crimson sword work, use `npm run accept:crimson-sword:cloud -- --visual-read ...`
   as the default review lane, or `--run-id` to reuse an inspected cloud capture.
7. Do not use the word "pass" unless `npm run accept:crimson-sword` passed
   against current cloud screenshot evidence.
