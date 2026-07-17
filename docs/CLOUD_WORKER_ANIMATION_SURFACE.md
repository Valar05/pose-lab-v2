# Cloud Worker Animation Surface

Cloud workers are the next execution lane for animation learning. The worker
runtime already exists in Home Center Command Center MCP; Pose Lab V2 only needs
to package clear job inputs for that surface. Local tools remain useful for fast
iteration, but repo truth must not depend on workspace skills, hidden memories,
sibling checkout state, or untracked notes.

## Contract

Each cloud worker job must be a self-contained generated bundle:

```text
generated/cloud-worker-jobs/JOB_ID/
  job.json
  learning_manifest.json
  inputs/
    legacy_poseclip.json
    legacy_evidence.json
    tripod_contact_manifest.json        optional
    video_ledger.json                   optional
```

The bundle is diagnostic input. It does not promote animation data, change
runtime pose files, or replace hosted visual review.

## Dispatch Surface

Use Home Center Command Center MCP as the cloud worker control plane:

```text
https://us-central1-home-center-dclar.cloudfunctions.net/commandCenterMcp/mcp
```

The expected worker is a one-shot Codex worker with prepared workspace support.
Do not invent a second worker platform inside Pose Lab V2. The remaining work is
to provide Command Center with:

- a clean `pose-lab-v2` prepared-base manifest;
- a prompt packet that points at `CODEX_STARTS_HERE.md` and the packaged
  `job.json`;
- mutation policy that allows generated output reports but blocks runtime pose
  edits unless explicitly authorized;
- artifact expectations for worker output reports.

The prompt packet lives in `docs/COMMAND_CENTER_DISPATCH_PROMPT.md`. Worker
output requirements live in `docs/CLOUD_WORKER_OUTPUT_CONTRACT.md`.

## Worker Responsibilities

A worker may:

- render or analyze the legacy poseclip phases;
- compare the legacy phases against a tripod contact sheet;
- propose timing, phase, silhouette, and body-mechanics notes;
- write generated reports under its job output directory.

A worker must not:

- mutate `src/`, `public/`, accepted pose modules, or runtime routes;
- import old Pose Lab runtime systems;
- claim visual acceptance from metrics alone;
- depend on `.codex`, memories, local browser state, or workspace-only skills.

## First Specimen

The first cloud-ready specimen is Gravity Fist `LowBackKick`. The packaged
learning surface must preserve the eight phases already present in the legacy
evidence:

```text
start, windup, anticipation, anticipationHold, contact, contactHold, recoil, settle
```

If the packet has no tripod video, the job remains `NO_TRIPOD_VIDEO`. A worker
may still analyze the legacy choreography, but it must not pretend a human
tripod comparison has happened.

## Commands

Create the local learning packet:

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

Verify the surface:

```sh
npm run cloud:agent-preflight
npm run test:cloud-worker-surface
```

Dispatching is owned by Home Center Command Center tooling, not this repo. Use
the Command Center one-shot workflow from `home-center` when ready. A real
dispatch is complete only when Command Center records terminal job state, events,
and artifacts.

## Knowledge Boundary

Anything a future agent or worker needs must live in this repo:

- workflow docs under `docs/`;
- commands in `package.json`;
- job schemas and materialized source JSON in generated bundles;
- final accepted animation data only through the explicit promotion flow.

Workspace skills and memories may inspire work, but they are not operational
dependencies.
