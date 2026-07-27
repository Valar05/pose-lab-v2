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
  - retains normalized-image landmarks for contact and compression evidence;
  - protects compression plateau entry, peak, and exit as sparse semantic keys;
  - rejects near duplicates;
  - retrieves closest native Regnet poses;
  - proposes foot-contact intervals from stationary-camera image motion rather
    than hip-relative world coordinates.
- `tools/bake_regnet_capture_blender.py`
  - imports Regnet's final rig;
  - initializes each key from the closest native Regnet pose;
  - blends capture direction with the native prior;
  - maps stationary-camera pelvis-to-ankle compression onto target pelvis
    height when support contacts exist;
  - drives only anatomical bone chains, never a pelvis/spine bone toward
    multiple branch children;
  - applies target-length foot-contact solves;
  - bakes sparse keys;
  - writes fixed and orthogonal evidence, BLEND, GLB, and a quarantined manifest.

## Verified now

- Both downloaded ZIPs match Drive MD5 and recorded SHA-256.
- The real archive indexes as 21 clips on one skeleton.
- Motion-vault contract test passes.
- Sparse capture/retrieval contract test passes.
- Python compilation passes.

## Real capture 602881

- Library source: `libfile_279aa4a215f48191aafda2a511bd918e`
- Video SHA-256:
  `03b8a9ce13da609b7410a950b910064c2bcf0e24a0d3adfd38bcd7b081a0bf09`
- Working action: `RegnetSquatCapture001`
- Boundary: frames `0..44` at 24 fps; weaponless; non-looping.
- Heavy MediaPipe model tracked 45/45 decoded frames.
- The first generic packet was rejected before Blender: it skipped the bottom
  hold and fragmented two visibly planted feet into five false intervals.
- The repaired packet protects frames 22, 28, and 31 for the compression
  plateau and proposes both foot contacts from frame 0 through 44.
- Exact capture evidence lives in
  `experiments/regnet-captures/602881/`.

## Not yet claimed

- No Blender render has been visually accepted.
- No hosted Pose Lab route exists for a capture-directed clip.
- Human verdict is pending.

## Next exact move

1. Materialize the locked biped ZIP from Drive ID
   `1G6PsdVS24Zw8kqiWZgzRlM22hE_UhkFd`.
2. Verify SHA-256
   `4f4d7a973203e5f57493b7c6b7c41e5076bbe67f9164249cf107daa35b15c964`.
3. Run `tools/bake_regnet_capture_blender.py` with the base character GLB,
   locked ZIP, and
   `experiments/regnet-captures/602881/capture-packet.json`.
4. Inspect every fixed-camera key plus an orthogonal compression key.
5. Reject locally if pelvis depth, knees, foot locks, balance, or arm guard fail.
6. Publish only the exact surviving GLB to an immutable Pose Lab route.
7. Create `pose-lab-v2-review-bundle-v1`.
8. Ask Drew for the visible verdict.

If candidate 001 looks bad, preserve it under `rejected/` with the failing key,
authority, observed defect, and required repair. Do not increase smoothing,
confidence, or solver complexity until the visible failure is named.
