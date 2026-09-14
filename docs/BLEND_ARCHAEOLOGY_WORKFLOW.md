# Blend Archaeology Workflow

This is the operational companion to `BLEND_ARCHAEOLOGY_SKILL.md`.

## One specimen, one cycle

For each `.blend`:

```text
INTAKE
-> BYTE IDENTITY
-> BLENDER INVENTORY
-> RENDER / CONTACT SHEET
-> MOTION GRAMMAR
-> USER-MEMORY RECONCILIATION
-> COMPACT RECORD
-> INDEX UPDATE
-> STOP
```

Do not begin the next blend until the current record is written.

## Intake

Preserve the original filename. Compute SHA-256 before any conversion.

Create:

```text
archaeology/blends/records/<slug>.json
```

with status-equivalent evidence that clearly separates direct source facts from user memory.

## Structural inspection

Use:

```sh
node scripts/run-blender-tool.mjs tools/blend_archaeology_inspect.py -- \
  --blend /absolute/path/to/file.blend \
  --out generated/blend-archaeology/<slug>/inventory.json
```

The inventory is intentionally compact. If it is not compact enough, fix the inspector instead of pasting the dump into durable notes.

## Visual inspection

Prefer a small number of diagnostic surfaces:

- scene overview;
- action list;
- one contact sheet per important action family;
- representative anticipation / contact / recovery frames;
- fixed camera when the original game camera can be recovered;
- silhouette-first views when form is hard to read.

Do not render everything merely because it exists.

## Historical reconciliation

After source inspection, compare against Drew's memory.

Preserve both when they differ:

```text
USER_MEMORY: what the game felt like / how it was authored
OBSERVED: what the surviving file proves
INFERRED: the best model that explains both
```

Historical memory is design evidence. It is not replaced by a later file state.

## Motion extraction

For each important action, seek the smallest set of semantic extrema.

Useful dimensions:

- anticipation duration;
- commitment threshold;
- range / root travel;
- support invariant;
- silhouette expansion;
- squash / stretch or perceptual equivalent;
- contact state change;
- recovery cost;
- counter relationship;
- reset behavior.

If a move began as mocap, ask which deleted keys made it stronger.

If a move was fully authored, ask which extrema were placed intentionally.

## Lesson promotion

A lesson enters the durable record only if at least one is true:

- it explains remembered game feel;
- it predicts a later project choice;
- it changes current design practice;
- it survives comparison against another specimen;
- it reveals a failure mode worth avoiding.

Cap at five lessons per blend.

## Context reset

After record + index update, future chats should carry only:

```text
<slug>
<one-line mechanism>
<strongest lesson>
<related specimen slugs>
```

Everything else is retrievable from the record.

That is the entire point of the system.
