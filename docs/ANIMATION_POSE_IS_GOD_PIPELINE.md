# Animation Pose Is God

This pipeline captures an embedded animation without interpreting it.

The source animation owns:

- every joint position and rotation;
- near/far limb ownership and occlusion;
- weapon position and path;
- foot contact and weight transfer;
- frame timing;
- one locked orthographic camera.

Concept art owns appearance only. It may supply armor, materials, colors, face,
plume, cape, and rendering style. It does not supply anatomy.

## Forbidden

The pose packet may not:

- retarget to another rig;
- solve IK;
- rotate, repair, mirror, or beautify a pose;
- name or reconstruct a fencing guard;
- change camera side between frames;
- use a generated frame as reference for another generated frame;
- promote telemetry or hashes over visibly wrong output.

## Packet

Each sampled frame contains four raster passes plus measured geometry:

1. `beauty` — readable flat source render;
2. `silhouette` — source outline;
3. `limb-id` — left/right and limb ownership encoded by color;
4. `depth` — camera-space depth encoded near-black to far-white;
5. projected bone heads/tails;
6. projected weapon hilt/tip line.

The assembler emits five exact 4×3 grids:

- `beauty-grid.png`
- `silhouette-grid.png`
- `limb-id-grid.png`
- `depth-grid.png`
- `geometry-grid.png`

All five have identical dimensions and frame order. The geometry grid draws the
left chain orange, right chain cyan, center chain yellow, and weapon axis white.

## Vanguard Proof

```sh
blender --background \
  --python-exit-code 1 \
  --python tools/render_animation_pose_packet.py \
  -- \
  --asset public/assets/vanguard/vanguard_rigged_animations.glb \
  --out-dir generated/vanguard-swordattack1-pose-packet \
  --action SwordAttack1 \
  --frames 0,3,6,9,12,15,18,21,24,28,33,38 \
  --source-fps 60 \
  --camera-side right

python3 tools/assemble_animation_pose_packet.py \
  --root generated/vanguard-swordattack1-pose-packet

python3 tools/verify_animation_pose_packet.py \
  --root generated/vanguard-swordattack1-pose-packet
```

The `right` camera is a model-relative side name, not a semantic facing
instruction. The manifest records the exact camera matrix and rejects any
per-frame change.

## Appearance Pass

Give the image model, together and in this order:

1. `geometry-grid.png`
2. `limb-id-grid.png`
3. `depth-grid.png`
4. `beauty-grid.png`
5. concept art

The prompt must say that references 1–4 are immutable geometry and reference 5
is appearance only. It must not use stance names or ask the model to improve,
correct, dramatize, mirror, or reinterpret the motion.

Every retry begins from the native packet. Never feed a failed generated sheet
back into generation.

## Verification Boundary

`verify_animation_pose_packet.py` fails closed on:

- non-native provenance;
- retargeting, IK, or pose-authoring flags;
- changed camera matrix or orthographic scale;
- missing or changed frame/pass bytes;
- missing projected joints or weapon endpoints;
- changed grid size or frame correspondence.

It can also validate a generated sheet's exact grid dimensions:

```sh
python3 tools/verify_animation_pose_packet.py \
  --root generated/vanguard-swordattack1-pose-packet \
  --generated generated/vanguard-swordattack1-sprites.png \
  --overlay-out generated/vanguard-swordattack1-geometry-review.png \
  --report generated/vanguard-swordattack1-verification.json
```

The verifier does not pretend to recover reliable anatomical landmarks from
stylized pixels. `--overlay-out` draws the native joints and weapon axis over
the generated sheet; that overlay remains the visual acceptance surface.
If generated joints, limb ownership, sword endpoints, feet, silhouette, or
camera side disagree with the overlay/source packet, the generation is red.

Animation pose is geometry. Concept art is costume.
