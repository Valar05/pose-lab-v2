# HEADY_GROUNDED_IK v03.6.0: REAL OVERLAPPING TRIPOD CORRECTION

## Reason for correction
v03.5 wave was user-rejected as NOT coordinated enough: exact code SWING_FRACTION=1/6, disallowed overlaps, body only +0.095 units per cycle, and highlighted one leg. Do not replace the accepted v03.4 single-leg source or claim v03.5 approved.

## What changed
Tripod A (LF, LR, RM) swings simultaneously; Tripod B (RF, RR, LM) swings simultaneously half a period later. Swing fraction is 0.42 per group; stance duty is 0.58; no more than three feet unplanted. The entire character body advances +X 0.140 units/cycle, +0.280 over two cycles, with NO root reset. Body anchor marker + path against stationary world cameras are in every frame.

## Mechanical evidence
Two cycles at 24 frames/cycle, 49 evaluations. The original 52-joint rig is skinned from actual original vertex weights; 4-link rear and 3-link front/middle chains use the same provisional X/Z local rotation solver. Real-world foot anchors remain in place until their own group swings. Source GLB byte-hash check mandatory. See TRIPOD_RESULT_RECEIPT.json, tripod_49ticks.csv, Tripod_Synchrony_BodyMotion_Proof.png, Tripod_FixedCamera_StartMidEnd.png.

## Scope limits
This is an offline 3D skinning IK and render proof, NOT Blender-verified, physics-tested, anatomically approved or owner-accepted yet. The Blender baker is scripted but Blender execution remains pending. Existing v03.4 is the protected accepted single-leg baseline; v03.5 wave is rejected as full-body solution. No claws, hair, weight or source changes. Do not claim success of a live Blender/exported/runtime rig until independently verified.

## First invocation (Termux)
Use the one-paste SHA-checked installer shown in the ChatGPT handoff. It installs THIS complete immutable packet into Pose Lab, makes scoped local Git commits, copies and verifies the GIF/review images to BOTH Pictures and Downloads, attempts termux-open, prints full receipt. It does not rerun the solver or older campaigns. No GitHub writes.

## Blender on the laptop (optional)
Unzip and run RUN_BLENDER_TRIPOD.bat on Windows or bash RUN_BLENDER_TRIPOD.sh on Linux with Blender 4.5+ on PATH. This bakes the precomputed source-local bone keys onto the imported original rig and makes candidate editable .blend and GLB. The Blender script needs independent visual/export toe-lock verification: it is NOT a runtime physics controller.
