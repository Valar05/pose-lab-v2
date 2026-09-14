# Blend Archaeology Ledger

This folder is the durable memory surface for old Blender projects.

It exists to keep long-running archaeological work out of chat context while preserving evidence, lineage, and design lessons.

## Layout

```text
archaeology/blends/
  README.md
  index.json
  schema/
    blend-record.schema.json
  records/
    <slug>.json
  notes/
    <slug>.md          # optional, only when the compact record is not enough
```

Generated inspection dumps, renders, contact sheets, frame strips, temporary exports, and raw Blender inventories belong under:

```text
generated/blend-archaeology/<slug>/
```

They are evidence, not durable context.

## Read policy

When starting a new chat or specimen, read only:

1. `docs/BLEND_ARCHAEOLOGY_SKILL.md`;
2. `archaeology/blends/index.json`;
3. the specific record(s) relevant to the current file;
4. raw/generated evidence only when a claim needs re-verification.

Do not preload every blend record.

## Write policy

Every inspected blend gets one record.

The record should be small enough to understand the specimen without reopening the blend, but not large enough to become another context dump.

Use evidence labels exactly as defined by the skill.

## Index policy

`index.json` is a routing table, not a knowledge dump.

Each entry keeps only:

- slug;
- source filename;
- project / subject;
- one-line mechanism;
- strongest known descendant / echo;
- confidence;
- record path;
- status.

## Principle

The raw blend is the fossil.

The record is the lesson.

The index is the map.
