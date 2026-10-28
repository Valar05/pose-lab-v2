# Heady | Pose Lab V2 | Grounded IK tick-by-tick experiment v03

**Campaign state:** independently executed and reported OFF-DEVICE. This packet
contains its original 52-joint GLB, runtime-preflight test script, numerical
trace, and plot. It includes no approved walking animation. Existing v07 is
REJECTED. All prior v05-v07 campaigns can remain uninstalled.

## Reproducibility and original execution method

Original off-device experiment:
`python grounded_runtime_13tick.py "Meshy_AI_Character_output (1).glb" .`

Original install/commit invocation, after downloading ZIP to Android Downloads:
`python -c '<read INSTALL_AND_COMMIT.py from ZIP and execute>'`

Installed repo runner: `bash tools/campaigns/heady_grounded_runtime_v03.sh show`
- `show` verifies the saved source/result hashes and displays numerical evidence
  WITHOUT recomputing an animation or asking for a second status script.
- `recompute` runs the 13-tick numerical calculation if scipy, numpy and
  matplotlib are installed in the execution interpreter.

## Actual test

The common rig root was moved X=0 to +0.030 and Z=0 to +0.012 across
13 consecutive calculations. World-frame skinned-foot median targets stayed
fixed; every tick solved all six ORIGINAL leg chains anew. Built-in triangle
floor terrain queries confirm planar ray contacts; no dynamic physics forces.

Numbers from off-device receipt:
- Peak six-toe-median drift: 0.00005179925180538348 model units
- Lowest skinned vertex: -0.0001289438114035618 units under Y=0
- Real-time engine physics: NOT EXECUTED
- On-phone install or Git commit: NOT EXECUTED until user invokes installer

No staged or unstaged unrelated work may be overwritten. Installer checks
its exact file targets before modifying the repo and commits only allowlisted
campaign-owned files to the LOCAL Pose Lab branch. No GitHub push.
