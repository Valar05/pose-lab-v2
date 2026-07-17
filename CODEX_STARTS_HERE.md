# Codex Starts Here

This repo is `pose-lab-v2`, the clean replacement surface for saber and
first-person animation authoring. It is not old Pose Lab. Do not import old Pose
Lab runtime systems, debug bridges, marker-only acceptance, or metric-green
visual claims.

## Where We Left Off

The current work shifted from local-only animation tooling toward cloud-worker
ready learning packets.

Recent uncommitted repo work adds:

- local video and Blender animation-muscle tools;
- a `LowBackKick` learning packet builder;
- a cloud-worker job packager;
- docs that move workflow knowledge out of workspace skills/memory and into the
  repo.

The first learning specimen is Gravity Fist `LowBackKick`, using:

```text
../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json
../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json
```

The required phases are:

```text
start, windup, anticipation, anticipationHold, contact, contactHold, recoil, settle
```

Generated local artifacts currently include:

```text
generated/learning/lowbackkick/Low-Back-Kick-learning-packet/manifest.json
generated/cloud-worker-jobs/Low-Back-Kick-learning-packet/job.json
```

Those generated paths are ignored. They are diagnostic inputs, not promoted
repo truth.

## Important Files

- `PROJECT_ORIENTATION.md`: read this first.
- `README.md`: current product/use/verification summary.
- `docs/VISUAL_VERIFICATION_DOCTRINE.md`: visual truth beats machine checks.
- `docs/POSE_LAB_V2_ATTACK_BAKE_DOCTRINE.md`: attack and pose rules.
- `docs/LOCAL_BLENDER_ANIMATION_MUSCLE.md`: local learning/render/tool lane.
- `docs/CLOUD_WORKER_ANIMATION_SURFACE.md`: cloud-worker handoff contract.
- `package.json`: repo-owned commands. Do not rely on hidden skills or memory.

## Current Commands

Build the Low Back Kick learning packet:

```sh
npm run learning:packet -- \
  --legacy-poseclip ../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json \
  --legacy-evidence ../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json
```

Package it for a cloud worker:

```sh
npm run cloud:worker-job -- \
  --learning-packet generated/learning/lowbackkick/Low-Back-Kick-learning-packet/manifest.json
```

Verify the tooling:

```sh
npm run test:learning-packet
npm run test:cloud-worker-surface
npm run build
npm run smoke
git diff --check
```

## Todo

1. Commit the current local/cloud-worker tooling once reviewed.
2. Add or verify the `pose-lab-v2` Command Center prepared-base manifest.
3. Make the worker consume `generated/cloud-worker-jobs/*/job.json`.
4. Have the worker write only generated job outputs, never `src/`, `public/`,
   accepted pose modules, or runtime routes.
5. Add a tripod video ledger and contact sheet when real human footage exists.
6. Compare legacy `LowBackKick` phases against tripod footage.
7. Promote only human-reviewed animation results through the explicit promotion
   flow; never promote from metrics alone.

## Next Step

The immediate next implementation step is not inventing a worker host. The
worker host is Home Center Command Center MCP, using one-shot Codex workers.
Next, create the Command Center dispatch packet and prepared-base manifest that
make this repo's packaged job consumable by that existing cloud worker lane.

The worker should accept the packaged job directory and produce an output report
beside it:

```text
generated/cloud-worker-jobs/Low-Back-Kick-learning-packet/outputs/
```

The worker should start by reading only `job.json`, packaged `inputs/*.json`,
and repo-local docs. If it needs `.codex`, memories, sibling repo paths, a local
browser, or hidden workspace context, the job package is incomplete and must be
fixed before the worker is trusted.

For Command Center dispatch, use the Home Center one-shot worker workflow. A job
is real only after Command Center records terminal state, events, and artifacts.

## Dispatch Checklist

1. Commit or intentionally preserve the baseline.
2. Run `npm run cloud:agent-preflight`.
3. Confirm `generated/cloud-worker-jobs/Low-Back-Kick-learning-packet/job.json`
   exists.
4. Dispatch through Home Center Command Center MCP using
   `docs/COMMAND_CENTER_DISPATCH_PROMPT.md`.
5. Inspect Command Center terminal state, events, and artifacts.
6. Review worker outputs under the job `outputs/` directory.
7. Do not promote animation unless hosted visual review later accepts it.

## Non-Negotiables

- Do not mutate the Meshy rest/A-pose casually.
- Do not claim visual success from syntax, smoke, source strings, route labels,
  telemetry, or generated reports.
- Do not let generated learning packets become accepted animation truth.
- Do not resurrect old Pose Lab architecture.
- Keep exact visible nouns honest: a real sabre mesh is not a marker, proxy, dot,
  or label.
- Cloud workers are execution helpers, not acceptance authorities.
- The cloud worker runtime is Home Center Command Center MCP; do not build a
  duplicate worker platform here.

## Current Verification State

The last verified guardrails were:

```text
npm run test:learning-packet          passed
npm run test:cloud-worker-surface     passed
python3 -m py_compile ...             passed
npm run build                         passed
npm run smoke                         passed
git diff --check                      passed
```

Smoke/build are guardrails only. They do not prove visual acceptance.
