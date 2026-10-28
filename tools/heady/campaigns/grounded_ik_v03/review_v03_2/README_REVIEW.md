# HEADY GROUNDED IK — v03.2 world-fixed proof

Campaign: HEADY_GROUNDED_IK (same identity as v03.0 and v03.1)
New test: 11 successive offline skinned-vertex IK solves as common character root translates in world space.

## Verified source and invariants
- Original glTF binary source `Meshy_AI_Character_output (1).glb` SHA256 `8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27`.
- 52 skin joints, no animation tracks in the source, 6 leg chains with 3/4 named joint heads.
- Weights and source model never altered; the source is included unmodified.
- All 6 toe targets are established once in rest-world coordinates from original skinning and fixed for all 11 evaluations.
- The *same world camera* is used at every position. The entire skinned model is rendered with the original texture, not an abstract stick figure.
- No walking cycle, claw movement, swing/lift/replant or game-physics engine simulated.

## Latest numeric proof (UNACCEPTED visual candidate)
- Root translation at final pose: (+0.120, 0, +0.025) native model units.
- Uncontrolled root displacement magnitude at final pose: 0.1225765 native units.
- Maximum of six skinned toe-witness median drifts across all 11 ticks: 0.000140445939 model units.
- Lowest skinned mesh Y across sequence: -0.000952865228 units versus reference mathematical ground Y=0. This is a real, nonzero penetration; not concealed by a drift metric.
- Largest single provisional joint-axis rotation delta across evaluated poses: approx 23.02 degrees.
- Provisional joint DOF model allows local X/Z rotations, +/-0.55 rad; those are calculation bounds, not measured physical crab ranges.

## Visible review artifacts
- `GROUND_IK_WorldAnchored_BodyMotion.gif` is a back-and-forth diagnostic, NOT A WALK CYCLE. The actor moves laterally/forward while six colored world toe crosses stay still.
- `WorldFixed_ThreeStep_Comparison.jpg` is the start/mid/end three-column reference in constant coordinates.
- `Static_Pose_Tick_00/05/10.png` are full-resolution individual snapshots.
- `Foot_Lock_Residuals_Zoom.png` has one main drift comparison and one independent magnified IK residual plot.
- `measurements_11ticks.csv` and `RESULT_RECEIPT.json` provide machine-readable evidence.
- The script `grounded_ik_visual_proof.py` is reproducible off-device using Python 3, numpy, scipy, Pillow, matplotlib. `renderer_readonly_reference.py` is a local read-only rendering helper that does not depend on phone or Pose Lab runtime.

## IMPORTANT LIMITATIONS
No game engine was launched; floor is Y=0 collision-space approximation without dynamic contact forces/friction. Toe anchors are skin-derived medians, not independently identified toe pads; some toes hover. The skin may visually distort even if the foot median is locked. Human acceptance still required before this solver becomes a gait controller. V07 rejected walking animation remains rejected.

## Reproduce outside the owner's phone
Run from a directory containing the two Python programs and the original GLB:

```
python3 grounded_ik_visual_proof.py 'Meshy_AI_Character_output (1).glb' .
```

It will recompute the 11 positions and evidence. To put this whole verified packet into the owner's actual Pose Lab V2 checkout and publish GIF/JPG/PNGs to both public Android media locations, use the included immutable installer; no regeneration is required on Android. Local Git commits only, no remote push.
