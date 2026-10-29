# Heady Grounded IK v03.5.0 | Blender and Pose Lab V2

**Original campaign identity:** `HEADY_GROUNDED_IK` • **Successor of accepted v03.4 out-and-back** • **New six-leg candidate, NOT human accepted**

## What is already calculated

This sealed packet contains a complete **two-cycle, 73-frame six-leg wave gait** calculated off-device from the exact original 52-joint Meshy model. All six leg families move under a traveling body. The six swing phases are LR → RR → LM → RM → LF → RF, one leg in swing at a time. The body advances +X0.095 native units per cycle, and each leg advances the same world distance at its touchdown. The original texture and source GLB are untouched. No old v05-v07 scuttle is reused.

**Actually measured offline:** maximum stance toe-median drift `6.90105e-06` units; minimum moving-body-origin support polygon proxy margin `0.198691`; minimum full-skinned mesh vertex Y `-0.0002308`; maximum provisional local joint angle `22.420°`. These are **solver metrics**, not center-of-mass physics or Blender-export validation. The real Blender import/export and rendered final .blend/.glb have NOT been executed in this environment.

## All ingredients

- `Meshy_AI_Character_output (1).glb`: immutable source, SHA-256 `8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27`.
- `six_leg_wave_engine.py`: **actual** source-skin-aware six-leg IK / phase scheduler / constraints / debug rendering; Python + numpy/scipy/Pillow/matplotlib/numba for regeneration, not required to view the included preview.
- `wave_bone_tracks.json`: all 73 frames' real six-chain local X/Z joint rotations and world root offsets.
- `blender_bake_six_leg_wave.py`: Blender 4.5 authoring script, importing GLB, calibrating glTF→Blender bone frames, keyframing all six chains and root, creating a floor/cameras, saving editable `.blend` and GLB export. No false claim of live Blender IK: the baked poses were produced by the **off-device skin-aware IK solver**, while Blender contains the editable sampled results.
- `Heady_v03_5_SixLeg_Wave_Candidate.gif`: already-rendered, fixed-camera textured 2-cycle candidate; `Wave_SixStates_Review.png` and `Wave_Contact_Drift_Stability.png`, native review frames and CSV/JSON receipts.
- `APPROVED_v03_4_Reference.png`: exact previous approved review image for regression comparison, NOT overwritten.
- `RUN_BLENDER_WAVE.sh` and `RUN_BLENDER_WAVE.bat`: one-command Blender execution on a computer where Blender 4.5 is installed.
- `TEST_PACKET.py`: independent pure-Python integrity & phase/concurrency test, no Blender needed.
- `INSTALL_AND_RUN_v03_5.py`: one-paste Termux/Pose Lab archive installer: immutable files, scoped local Git commits, 5 images published and SHA-readback to **each** of Android Pictures and Downloads, opens GIF when Termux can dispatch, prints terminal receipt; NO GitHub write, NO heavy simulation rerun on phone.

## Blender on the Cauldron / a desktop with Blender 4.5+

Unzip **this same packet**, open a terminal inside its `tools/heady/campaigns/grounded_ik_v03/review_v03_5/` folder, then run:

- Linux/macOS (when `blender` is on PATH): `bash RUN_BLENDER_WAVE.sh`
- Windows: double click `RUN_BLENDER_WAVE.bat` (or from CMD run `RUN_BLENDER_WAVE.bat`).

The script calls `blender --background --python blender_bake_six_leg_wave.py -- --source "Meshy_AI_Character_output (1).glb" --tracks wave_bone_tracks.json --out Blender_Exports`. It does **not** require previously installed Pose Lab campaigns. Outputs are `Blender_Exports/Heady_v03_5_SixLegWave_EDITABLE.blend`, an exported candidate GLB, and a candid `BLENDER_EXPORT_RECEIPT.json` on success. The blender script also accepts `--render-stills` to render six extra full-size proof frames on an adequately equipped computer.

**Explicit unverified gate:** this session lacks Blender, so only Python syntax and original GLB/track/installer checks have been performed for the Blender script. Verify actual Blender import bone mapping via printed RMS, inspect the editable .blend at several frames, and validate exported skinned toe motion before using GLB in a game. Blender import/export is not guaranteed to preserve byte-identical image buffers or node naming, so do NOT promote its output to source authority. Blender export is an independent candidate, never an overwrite of the original GLB.

## Phone and Pose Lab V2

Use the one-paste hash-pinned Termux invocation accompanying the ZIP. It installs the complete original source, accepted v03.4 reference, simulation/baker code, generated wave results, and the complete original ZIP under the versioned `tools/heady/campaigns/grounded_ik_v03/review_v03_5/` directory, installs a repo-owned launcher at `tools/campaigns/heady_grounded_ik_v03_5.sh`, and commits only owned paths locally. It also publishes the review GIF and four static previews to Pictures/Downloads, scans, attempts open, commits receipt. **Blender does not run on Termux**. You can visually inspect the supplied GIF without running Blender or the installer.

## Acceptance and locks

- v03.4 single-leg out/back remains approved as its own motion. This six-leg variant is **pending**.
- v07 is rejected. Hair, claws, weights, skeleton rest, image payloads and source GLB all remain immutable.
- Mathematical foot anchors use toe-median witnesses, not approved collision soles; source Y-up ground is model Y=0, and Blender converts this to Z-up. No terrain physics, foot friction, certified COM or force simulation.
- All individual leg chains are correct: LF 007/006/005; LM 013/012/011; LR 021/020/019/018; RF 024/023/022; RM 010/009/008; RR 017/016/015/014.
- The tripod variant is deferred to a new visual review. This bundle is a wave candidate only.
