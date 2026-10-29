# Heady Grounded IK v03.4.0: one out-and-back foot transfer

Original invocation: download `Heady_GroundedIK_v03_4_OutAndBack_Campaign.zip` and run the SHA-pinned one-paste Termux bootstrap delivered with this packet.

This is a single FOOT stepping out and returning while the BODY translates out and back, with other five feet retaining fixed WORLD toe anchors. 37 solver ticks, non-repeating GIF, two fixed-world cameras, explicit skinned toe witness + three actual articulated joint markers. No source mesh, weight, material, texture, rig or keyframed GLB edits; no prior v03.3/v07 scripts run.

Original source GLB SHA-256: `8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27`.

## Numerical verification

- Outward foot peak lift ~0.0679817 native units, return foot peak ~0.0679813.
- The other five original foot anchors max drift ~0.0000247511 native units.
- Original return anchor 3D error ~8.65e-12 native units; final body shift 0.
- Outward replant 3D error 3.66e-6; max skinned mesh floor dip about 0.000281.
- Proximal Bone_010, middle Bone_009 and distal Bone_008 each have measured nonzero local X/Z variations, listed in RESULT_RECEIPT.json.
- Neither robot collision impulses nor actual physics engine nor validated anatomical joint limits were tested.

## Review

`HEADY_GroundedIK_OutAndBack_v03_4.gif` (37 unique frames, one non-looping play, long final hold) and `FiveStates_WorldFixed.png` are primary review surfaces.
`OutAndBack_LiftEvidence.png`, six keyframe PNGs and `OutAndBack_37Ticks.csv` are supplementary.
This is a candidate, NOT user-accepted and not a complete crab gait.

## Reproduce

Use Python with NumPy, SciPy, Pillow, Matplotlib and optionally Numba for acceleration. Running the source-to-output simulator is optional; the phone installer does NOT recompute anything. From the packet directory:

`python grounded_out_and_back.py 'Meshy_AI_Character_output (1).glb' /path/to/fresh/output/`

Put `renderer_readonly_reference.py` in the output directory or copy it there first. The optional fast renderer module should be importable from the source script's directory.

## Delivery

One first invocation must install/retain this entire versioned ZIP in Pose Lab V2, make scoped LOCAL Git commits (no GitHub push), publish/readback-hash GIF+images into Pictures and Downloads, request `termux-open` and display the full result. `host_run.log` is preserved inside this packet and on disk but excluded from git staging because repo ignores logs. Media-open request is NOT proof the Android UI actually displayed.
