# Local Blender Animation Muscle

This lane is local-only. Blender renders are the truth surface for this tooling
pass; browser/cloud review is not part of this contract unless a later task
explicitly restores it.

## Pipeline

```text
source video or clip
-> clip range ledger
-> keyed contact sheet
-> saved poses
-> timed composition
-> Blender render truth
-> promotion only after review
```

The tools automate labor, not judgment. Metrics, hashes, and traces explain what
changed, but rendered frames decide whether a candidate is worth keeping.

## Tools

- `npm run video:ledger -- ...`
  manages one append-only-ish ledger per source video. A single video may hold
  any number of named clip ranges, each representing one animation extraction
  surface.
- `npm run video:contact-sheet -- ...`
  extracts timestamped frames for a whole video or one ledger clip and writes a
  contact sheet plus manifest.
- `npm run learning:packet -- ...`
  compares a polished legacy poseclip/evidence pair with an optional tripod
  contact sheet. The first specimen is Gravity Fist `LowBackKick` because its
  eight read phases make support-foot plant, hips-first turn, torso carry,
  low-foot contact, and recovery easy to critique.
- `npm run cloud:worker-job -- ...`
  packages a learning packet into a self-contained cloud-worker job bundle.
  This is the boundary between local authoring diagnostics and Home Center
  Command Center MCP cloud execution.
- `npm run animation:compose -- ...`
  composes saved poses into an arbitrarily timed animation candidate.
- `npm run animation:compare -- ...`
  compares generated artifacts and fails on no-op output.
- `npm run blender:render-truth -- ...`
  imports real assets in Blender and renders deterministic review views.
- `npm run blender:sample-source -- ...`
  samples Blender-readable source assets and records clip/bone inventory.

## Metadata Rule

Every artifact must preserve:

- source path and hash;
- ledger id and clip id when a clip range is used;
- selected timestamps or source frame ids;
- pose ids and animation candidate id;
- tool name, version, command arguments, and generated timestamp;
- status: `draft`, `candidate`, `rejected`, `accepted`, or `promoted`.

Contact sheets must never become anonymous. Saved poses must point back to the
frame or source sample that produced them. Composed animations must point back to
all pose ids and timing recipe inputs.

## Dependency Surface

The local toolchain uses Debian/proot Blender:

```sh
proot-distro login debian -- blender --background
```

The expected Debian-side packages are:

```text
ffmpeg python3-pil python3-opencv python3-scipy python3-skimage
python3-imageio python3-matplotlib jq imagemagick gifsicle
```

MediaPipe is intentionally not required for v1. It may become optional landmark
assistance later, but generated landmarks must not overwrite saved poses.

## Cloud Boundary

Local learning artifacts are not enough once workers enter the loop. The worker
runtime is Home Center Command Center MCP. Before a worker runs, package the
learning packet with `npm run cloud:worker-job -- ...`. The bundle copies the
legacy poseclip/evidence JSON and optional tripod contact manifest into
`generated/cloud-worker-jobs/` so a one-shot Codex worker has a complete input
surface without consulting workspace skills, memories, or sibling repositories.
Use `npm run cloud:agent-preflight` before dispatch to regenerate the packet,
package the cloud job, and run the cheap guardrails in a stable order.

## First Learning Specimen

Use Ares `LowBackKick [sf2-eased]` as the first learning workflow before
authoring new animation. The legacy source is:

```text
../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json
../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json
```

The packet must include these phases: `start`, `windup`, `anticipation`,
`anticipationHold`, `contact`, `contactHold`, `recoil`, and `settle`.

Without a tripod clip, the packet status is `NO_TRIPOD_VIDEO`. With a ledger clip
but no contact sheet, the status is `NO_TRIPOD_CONTACT_SHEET`. Verification must
not convert either state into animation acceptance.

Example legacy-only run:

```sh
npm run learning:packet -- \
  --legacy-poseclip ../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json \
  --legacy-evidence ../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json
```
