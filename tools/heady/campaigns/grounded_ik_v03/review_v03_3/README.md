# Heady Grounded IK v03.3.0: One deliberate step (CANDIDATE)

One right-middle walking-leg step with moving body root, five fixed world foot anchors, and explicit liftoff / quick transfer / replant / hold. THIS IS NOT A LOOPED GAIT or an engine-physics simulation.

## First invocation
Download the exact **Heady_GroundedIK_v03_3_OneDeliberateStep_Campaign.zip** to Android Downloads and execute the hash-locked one-paste Python bootstrap delivered with this ZIP. The installer is internally `INSTALL_AND_RUN_v03_3.py`. The same complete ZIP is preserved in the canonical Pose Lab V2 repository under `tools/heady/campaigns/grounded_ik_v03/review_v03_3/WHOLE_PACKET_v03_3.zip`, with all loose campaign members too. Do not rerun v05-v07, previous v03 packets, or download any helper.

## Durable runner
`bash tools/campaigns/heady_grounded_ik_v03_3.sh verify` — check all locked packet members.
`bash tools/campaigns/heady_grounded_ik_v03_3.sh view` — request viewing Android public GIF.
`bash tools/campaigns/heady_grounded_ik_v03_3.sh reproduce` — OPTIONAL re-run on a separate desktop with NumPy, SciPy, Pillow, Matplotlib installed; reproduces candidate from original GLB, not automatically on Android.

## User-facing review
- `HEADY_GroundedIK_OneDeliberateStep_v03_3.gif`: 19-tick unilateral single-step demonstration. Playback ends instead of reverting into walking-loop.
- `ThreeStates_WorldFixed.png`: fixed-world camera start, step, planted-final poses.
- `Frame_07_SWING.png`: separated lift proof.
- `LiftAndPlant_Evidence.png`: image-plane witness heights over 19 points.
- `SingleStep_19Ticks.csv` and `RESULT_RECEIPT.json`: exact measured evidence.

## Locks and known limitations
Source SHA256 `8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27` is original 52-joint model. Only visual on-the-fly skinning changes in this output, source GLB stays unmodified with 0 animation channels; skin weights and embedded textures unchanged. Right-middle chain Bone_010 → Bone_009 → Bone_008 is driven, and its bone-head transform is attached to body root. Provisional local X/Z axes and mathematical Y=0 floor; not anatomical IK authority or rigid-body physics. Original skin-derived toe witnesses are median sample vertices, not validated footpad contacts. Five feet remain world-locked. The first single step is a QUARANTINED CANDIDATE until the owner accepts it. v07 remains REJECTED.

## Local Git commit law
Installer stages ONLY declared versioned members (excluding host_run.log, which lives in WHOLE_PACKET), plus the exact complete packet. There are two separate LOCAL commits: (1) implementation + evidence, (2) public media delivery receipt. No push or GitHub writes. Preserve any unrelated staged/unstaged files. All public media is SHA readback verified in Pictures and Downloads. termux-open REQUESTED is not viewer-confirmed.
