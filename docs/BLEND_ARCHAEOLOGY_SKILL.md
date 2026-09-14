# Blend Archaeology Skill

## Purpose

Inspect old Blender projects as executable design fossils without bloating working context.

The goal is not to summarize every object in a `.blend`. The goal is to recover the smallest durable set of lessons that explains why the project felt good, what the authored motion actually did, which ideas later reappeared, and what should change future design decisions.

This skill treats old files as evidence, not nostalgia.

## Core law

For every blend:

```text
SOURCE BYTES
-> TECHNICAL INVENTORY
-> VISUAL / MOTION EVIDENCE
-> CAUSAL EXTRACTION
-> DESIGN LESSON
-> COMPACT RECORD
```

The compact record is the durable truth. Raw inspection output is supporting evidence and should not be carried in conversation after the record is written.

## Context budget

A completed blend should normally occupy no more than:

- one machine-readable record under `archaeology/blends/records/`;
- one short human note under `archaeology/blends/notes/` only when the lesson needs prose;
- generated inspection artifacts under ignored `generated/blend-archaeology/`;
- one line in the rolling index.

Do not keep giant object lists, bone dumps, frame-by-frame narration, or raw Blender reports in chat context once they have been reduced.

## Evidence classes

Every observation must carry one status:

- `OBSERVED`: directly visible in rendered / inspected source evidence.
- `MEASURED`: derived from source data by deterministic tooling.
- `USER_MEMORY`: supplied by Drew from lived production/play history.
- `INFERRED`: interpretation supported by evidence but not directly stored in source.
- `VERIFIED`: independent evidence channels agree.
- `UNKNOWN`: do not fill the gap.

Never silently convert `USER_MEMORY` into `OBSERVED`.

## Inspection order

### 1. Preserve identity

Record:

- original filename;
- SHA-256 when bytes are available;
- Blender version if readable;
- source date if trustworthy;
- project / character names visible in the file;
- whether this is original source, derivative, export, or recovered copy.

### 2. Inventory without commentary

Extract only useful structural facts:

- scenes and collections;
- visible meshes and their rough roles;
- armatures;
- actions / NLA strips;
- cameras;
- constraints and drivers;
- modifiers that visibly affect form or motion;
- materials only when material behavior is design-relevant;
- game-engine or export metadata when present.

Do not narrate every Blender datablock.

### 3. Find the motion vocabulary

For animated files, identify the smallest semantic set of states or verbs.

Prefer verbs such as:

```text
WAIT
READ
APPROACH
LOAD
COMMIT
BREAK
COUNTER
RETURN
```

Avoid labels that merely repeat clip names unless the clip name itself is the useful verb.

Ask:

- What becomes newly true?
- What gets irreversibly committed?
- What remains planted / invariant?
- What distance changes?
- What does contact invalidate?
- What does recovery preserve?
- Which motion is authored, and which is interpolation / mocap residue?

### 4. Separate channels

Track independently when useful:

```text
BODY
ROOT / WORLD TRANSLATION
PROP
TARGET
CAMERA
ENVIRONMENT
TIMING
SCALE / DEFORMATION
GAMEPLAY STATE
SOUND / VFX
```

Do not force one clip to explain the whole event.

### 5. Run the reduction tests

Use the smallest applicable tests:

- silhouette test;
- contact-sheet / extrema test;
- ASCII or stick-figure ablation when useful;
- support-foot / invariant test;
- anticipation vs release timing;
- squash-and-stretch / silhouette expansion;
- state persistence across recovery;
- whether a move reads from one frame;
- whether removing a key causes the action to stop being true.

### 6. Distinguish construction history

Record how the motion came into being when known:

- fully authored;
- mocap-derived;
- mocap with key deletion;
- retimed source;
- retargeted;
- procedural;
- hybrid;
- unknown.

This matters because two opposite production methods can converge on the same causal grammar.

### 7. Extract the lesson

Each blend gets at most five durable lessons.

A lesson must change future work.

Good:

> A counter can carry an infinite combat loop when the state reversal is more expressive than move-count variety.

Bad:

> The game had a gargoyle and was fun.

Each lesson should state:

- the mechanism;
- the evidence;
- the consequence for future design.

### 8. Find descendants and ancestors

When justified, connect the specimen to later / earlier projects.

Examples:

```text
Remhir -> Gravity Fist
old sword work -> punch / counter minimalism
Gravity Fist Ares -> Pose Lab V1 reductions -> Pose Lab V2 learning packets
```

Relationships are directional and evidence-tagged. Do not manufacture lineage because two things look similar.

### 9. Write the compact record

Use `archaeology/blends/schema/blend-record.schema.json`.

The record must answer, without opening the blend again:

1. What is this?
2. What did it do unusually well?
3. What motion / interaction grammar did it use?
4. What production method created that grammar?
5. What did Drew learn, whether or not he knew it at the time?
6. Where did the lesson reappear later?
7. What should future work do differently because this file exists?

### 10. Update only the index-level summary

The rolling index should stay terse:

```text
slug | source | one-line mechanism | strongest descendant | confidence
```

Do not duplicate record detail in the index.

## Animation literary analysis bridge

When prose or game narrative is relevant, use the same causal primitives established by Animation Literary Analysis:

```text
small authored structure
+ rule system / prior
+ interpreter
-> large experienced event
```

A blend may teach prose. Prose may teach animation. Record the transferable mechanism rather than privileging the original medium.

## Pose Lab integration

Pose Lab remains the visual / motion laboratory.

Blend Archaeology may reuse:

- contact sheets;
- pose extrema;
- root / foot / hand measurements;
- existing Gravity Fist poseclips;
- V1 critiques;
- V2 visual-verification doctrine;
- Blender render truth lanes.

It must not treat machine-green metrics as artistic acceptance.

Human-visible truth outranks the inspection report.

## Conversation protocol

For each new `.blend`:

1. Inspect source.
2. Show Drew only the high-value visual / structural findings.
3. Ask for memory only when it can discriminate between competing interpretations.
4. Write the record before moving to the next file.
5. Carry forward only:
   - specimen slug;
   - one-line mechanism;
   - strongest lesson;
   - links to related records.

This is the anti-context-bloat contract.

## Final rudder

Do not ask:

> What is inside this Blender file?

Ask:

> What did this file teach Drew's design nervous system, and can the evidence prove it?
