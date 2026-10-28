# Heady Grounded IK v03.2.1 — scoped commit + visual delivery recovery

This is the **same grounded IK campaign** (successor to v03.2.0) with a new immutable distribution filename. It resumes the **specific failed v03.2 Git staging step** without recomputing leg motion or running old v05-v07 campaigns.

Root cause: `host_run.log` was present in the v03.2 git-add allowlist even though Pose Lab deliberately ignores `*.log`. That makes `git add -- <all paths>` fail. Git may already have partially staged other v03.2 items. This fix readback-verifies all v03.2 bytes, keeps `host_run.log` in the complete source packet and on disk, **does not stage it**, and commits exact allowlisted, nonignored files. The full immutable v03.2 and v03.2.1 ZIPs are stored in the repository. Scope-capped local Git checkpoints do not touch unrelated staged files.

Publication: this one invocation copies the complete GIF, three-pose JPG, error plot, and final static PNG into both Android Pictures and Downloads with new version-stamped filenames; checks SHA-256 for all eight; optionally requests media scan and `termux-open`; then makes a separate receipt commit. Output says `OPEN=REQUESTED_NOT_CONFIRMED`, not that a viewer actually displayed the GIF.

The prior real v03 local commit is `532d24f984aac9b792744e9b27eb7af9baf36408`, retained untouched. If v03.1 was not installed, nothing about this release requires it.

**One invocation**: download `Heady_GroundedIK_v03_2_1_CommitAndOpenRepair.zip`, verify pinned SHA-256, and execute its root `INSTALL_AND_RESUME_v03_2_1.py`. This is an install/delivery repair, *not* a new gait or a physics engine test. Does not push to GitHub.

## Rules provenance
- Campaign Etiquette: https://docs.google.com/document/d/1wntegQjw7238dmGqbvs9TQmlsp4uXdXw7_wPciNx6sI/edit
- Pose Lab 3D: https://docs.google.com/document/d/1BNXVfowZWQSSA0Nk0OK4jP7_K-ysHnM5vTPV_EB8EWU/edit
- Pose Lab repository: `AGENTS.md`, `docs/POSE_LAB_CAMPAIGN_RULES.md`, `docs/POSE_IS_GOD.md`, `docs/POSE_CAMPAIGN_FRAMEWORK.md`

Human acceptance remains pending. Offline mock fixture PASS is not physical Android viewer proof.
