# Regnet Motion Vault and Capture Director

Status: **source and machinery green; authored animation pending**.

This lane turns Regnet's Meshy biped download into a searchable motion vocabulary,
then uses a human video capture to direct sparse target-rig keys. It does not
promote raw mocap, nearest-neighbor retrieval, landmark output, or solver metrics
as animation.

## Recovered source truth

The authoritative Drive sources and hashes are locked in `source-lock.json`.
The biped archive contains 21 GLBs on one 24-joint skeleton:

- 20 named performances;
- one base-character clip;
- 47.466668 seconds of total motion;
- 72 animation channels per GLB;
- one shared skeleton signature.

The named trove covers directional running, guarded punch preparation, two punch
combos, cautious crouch travel, jumps, leaps, vaulting, pushing, armed travel,
unstable walking, ordinary walking, and a sprint-to-stop transition.

The archive is the motion authority. `vault.json` is a reproducible retrieval
index containing eight distinct representatives selected from 48 probes per
clip—168 poses total, rather than a uniform frame dump. The static OBJ/MTL/PNG
archive is appearance provenance only.

## Why this is not the old BVH failure

The quarantined Crimson BVH spike proved that BVH can transport a clean anatomical
hierarchy. It also proved that copying segment directions onto a different body
is not retargeting. The result folded and stretched visibly.

Regnet's capture lane therefore solves in this order:

1. synchronize source, capture, and target rest bases;
2. solve hips and torso body basis;
3. review and lock foot, hand, or prop contacts;
4. solve target-length limbs with capture-derived pole planes;
5. apply Regnet-specific hand, foot, head, and armor corrections;
6. bake only sparse reviewed keys;
7. interpolate only after those keys read sanely.

Video directs performance. Regnet's own motion vault supplies pose priors. The
target rig, contacts, and human review decide the actual pose.

## Build the motion vault

Materialize the locked biped ZIP outside the repository, verify both hashes, then:

```sh
python3 tools/regnet_motion_vault.py /path/to/regnet_biped.zip \
  --out experiments/regnet-motion-vault/vault.json \
  --samples 8 \
  --probe-samples 48 \
  --shard-size 7 \
  --drive-file-id 1G6PsdVS24Zw8kqiWZgzRlM22hE_UhkFd \
  --drive-md5 1569b7cce0ffdd7d547c4eb6b1aa7384 \
  --source-uri gdrive://1G6PsdVS24Zw8kqiWZgzRlM22hE_UhkFd
```

The index evaluates GLTF animation channels directly. It retains endpoints,
motion-energy extrema, and farthest distinct poses. It stores normalized joint
positions and anatomical bone directions, not rendered frames or duplicated mesh
bytes. The checked-in index is sharded by seven clips so workers can resume and
load bounded motion families. A denser disposable working index may use more
retained samples without changing the locked source.

## Direct Regnet with a capture

Optional MediaPipe extraction:

```sh
python3 tools/regnet_capture_packet.py extract capture.mp4 \
  --out generated/regnet/captures/CAPTURE_ID/landmarks.json
```

The extractor requires `opencv-python` and `mediapipe`. That dependency is
optional so the repository can also accept landmark sidecars from another
authorized capture provider.

Build a sparse direction packet:

```sh
python3 tools/regnet_capture_packet.py build \
  --video capture.mp4 \
  --landmarks generated/regnet/captures/CAPTURE_ID/landmarks.json \
  --vault experiments/regnet-motion-vault/vault.json \
  --out generated/regnet/captures/CAPTURE_ID/direction-packet.json \
  --keys 8 \
  --weapon none
```

Selection preserves endpoints, normalized-image compression plateau entry/peak/
exit when available, motion-energy extrema, and the most distinct remaining
poses. Near duplicates are recorded as rejected evidence, except protected
semantic boundaries that preserve a real hold. Foot contacts come from
stationary-camera ankle motion in image space; hip-relative world landmarks
cannot distinguish a planted squat from moving feet. Each selected key carries
its closest poses from Regnet's own motion library, but those matches are
suggestions rather than animation keys.

## Required downstream authoring

The packet is consumed by a Blender/Pose Lab target solver that must emit:

- the exact source and target rig hashes;
- selected capture keys and timestamps;
- reviewed contact intervals;
- fixed-camera and orthogonal renders from Regnet's final rig;
- a quarantined GLB clip;
- a `pose-lab-v2-review-bundle-v1` manifest;
- the immutable hosted Pose Lab route;
- a pending human verdict.

No candidate can be promoted because a capture was detected, a nearby mocap pose
was found, endpoint error was small, or a GLB exported. The visible Regnet motion
is the product.

Bake the sparse packet onto Regnet's final rig:

```sh
blender --background --python tools/bake_regnet_capture_blender.py -- \
  --target /path/to/Meshy_AI_The_Iron_Nomad_biped_Character_output.glb \
  --archive /path/to/regnet_biped.zip \
  --packet generated/regnet/captures/CAPTURE_ID/direction-packet.json \
  --out-dir generated/regnet/captures/CAPTURE_ID/candidate-001
```

The Blender pass initializes every capture key from the closest pose on Regnet's
own identical skeleton, maps fixed-camera pelvis compression onto target pelvis
height when support contacts exist, blends capture directions into that sane
native prior, drives only anatomical bone chains, locks proposed foot contacts
with target-length two-bone solves, bakes only the sparse keys, and emits
fixed-camera plus orthogonal evidence. The output remains quarantined.

## Waste policy

Keep:

- original locked archives;
- the compact vault;
- source video and landmark hash;
- sparse keys and contact sidecars;
- final-rig renders, candidates, rejections, and verdicts.

Do not keep:

- per-frame screenshots from the capture;
- 21 committed copies of the same skinned mesh and textures;
- anonymous contact sheets;
- near-duplicate pose keys;
- generated in-betweens before key-pose acceptance;
- any candidate relabeled as accepted without a human verdict.

## Verification

```sh
python3 -m py_compile \
  tools/regnet_motion_vault.py \
  tools/regnet_capture_packet.py \
  tools/bake_regnet_capture_blender.py
python3 tools/test_regnet_motion_vault.py
python3 tools/test_regnet_capture_packet.py
```
