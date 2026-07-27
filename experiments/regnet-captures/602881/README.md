# Regnet Squat Capture 001

Status: **quarantined direction packet; Blender evidence pending**.

This is the first real human-directed Regnet capture. The performance is a
weaponless guarded deep squat: standing entry, controlled descent, deep
compression plateau, and recovery. It does not loop.

## Why this capture mattered

The first generic packet was rejected before Blender. It selected descent and
recovery but almost skipped the bottom hold, and it fragmented two visibly
planted feet into five false contact intervals.

The failure had two causes:

1. sparse pose selection knew about directional difference but not a timed
   compression plateau;
2. foot contact was measured in hip-relative world landmarks, where a planted
   foot appears to move whenever the pelvis lowers.

The repaired contract retains normalized-image evidence, protects plateau
entry/peak/exit at frames 22/28/31, and measures stationary-camera ankle motion.
Both feet are now proposed as planted for frames 0 through 44.

## Kept treasure

- `source-lock.json`: immutable source, Regnet, and packet identities.
- `landmarks.json`: all 45 provider landmarks, without decoded image frames.
- `capture-packet.json`: eight sparse keys, retrieval candidates, contacts,
  timing, and acceptance boundary.
- `diagnostic-regnet-sprint-stop.glb`: exact 24-joint geometry, skin, and
  72-channel native prior with only the review texture reduced to 128×128 WebP.
- `render-candidate-001.py`: hash-locked Blender job with the exact direction
  packet embedded for authenticated repository rendering.

The 45 decoded JPEGs and contact-sheet experiments were scratch evidence. They
are deliberately not committed.

The diagnostic GLB is not a replacement source asset. It exists because the
direct Work Mode host-file upload rejected locally generated file paths and the
configured one-shot worker is non-routable. Its structure matches the
authoritative GLB: 26 named nodes, 24 skin joints, one unchanged 10,256-vertex
mesh, and one 72-channel/2,904-keyframe animation. Geometry was not simplified
and animation was not resampled.

## Next exact command

Materialize and verify the locked biped ZIP, extract the base character GLB, then
run:

```sh
blender --background --python tools/bake_regnet_capture_blender.py -- \
  --target /path/to/Meshy_AI_The_Iron_Nomad_biped_Character_output.glb \
  --archive /path/to/regnet_biped.zip \
  --packet experiments/regnet-captures/602881/capture-packet.json \
  --out-dir generated/regnet/captures/602881/candidate-001 \
  --strength 0.85 \
  --fps 30
```

Inspect every fixed-camera key and at least the compression peak from an
orthogonal view. Reject if the pelvis does not descend, either foot slides, the
knees collapse or reverse, the torso loses balance, or the raised guard becomes
unreadable. Do not publish a Pose Lab route until local Blender evidence
survives those checks.
