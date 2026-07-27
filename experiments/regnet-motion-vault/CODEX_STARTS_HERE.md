# Regnet Capture Director — Resume Packet

## Mission

Let a human video performance direct Regnet's animation without copying raw
landmark noise, dumping every video frame into the rig, or repeating the red
Crimson segment-direction transfer.

## Locked treasure

- Drive biped archive: `1G6PsdVS24Zw8kqiWZgzRlM22hE_UhkFd`
- SHA-256: `4f4d7a973203e5f57493b7c6b7c41e5076bbe67f9164249cf107daa35b15c964`
- MD5: `1569b7cce0ffdd7d547c4eb6b1aa7384`
- 21 GLBs, 20 named motions, one base clip
- Shared skeleton: 24 skin joints
- Skeleton signature: `a8bbb6d345fda6b63d2f3be03c81f741e62be70f24268b680aac61afa3be4fb3`
- Total motion: `47.466668` seconds
- Drive appearance archive: `1Q0G5CkIuIztx1Hvgp4Ndlfxre57MrjI8`

Do not commit all 21 with-skin GLBs. They duplicate the same mesh and textures.
The archives remain source authority in Drive.

## Machinery

- `tools/regnet_motion_vault.py`
  - reads GLB animation data inside the ZIP;
  - verifies one skeleton;
  - probes 48 poses per clip;
  - retains eight endpoints/extrema/distinct representatives;
  - writes `vault.json`.
- `tools/regnet_capture_packet.py`
  - optionally extracts MediaPipe world landmarks;
  - accepts provider-neutral landmark JSON;
  - selects sparse keys;
  - rejects near duplicates;
  - retrieves closest native Regnet poses;
  - proposes foot-contact intervals.
- `tools/bake_regnet_capture_blender.py`
  - imports Regnet's final rig;
  - initializes each key from the closest native Regnet pose;
  - blends capture direction with the native prior;
  - applies target-length foot-contact solves;
  - bakes sparse keys;
  - writes fixed and orthogonal evidence, BLEND, GLB, and a quarantined manifest.

## Verified now

- Both downloaded ZIPs match Drive MD5 and recorded SHA-256.
- The real archive indexes as 21 clips on one skeleton.
- Motion-vault contract test passes.
- Sparse capture/retrieval contract test passes.
- Python compilation passes.

## Not yet claimed

- No human performance capture has been supplied in this lane.
- No Regnet candidate has been baked from a real capture.
- No Blender render has been visually accepted.
- No hosted Pose Lab route exists for a capture-directed clip.
- Human verdict is pending.

## Next exact move

1. Record or attach one short, locked-camera performance.
2. Name the action boundary and whether it loops.
3. Extract landmarks without saving anonymous image frames.
4. Build the direction packet and review its sparse contact sheet/timestamps.
5. Bake candidate 001 on Regnet's final rig.
6. Inspect fixed-camera and orthogonal renders.
7. Publish the exact GLB to an immutable Pose Lab route.
8. Create `pose-lab-v2-review-bundle-v1`.
9. Ask Drew for the visible verdict.

If candidate 001 looks bad, preserve it under `rejected/` with the failing key,
authority, observed defect, and required repair. Do not increase smoothing,
confidence, or solver complexity until the visible failure is named.
