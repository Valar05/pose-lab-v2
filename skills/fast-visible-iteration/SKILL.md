# Fast Visible Iteration / Anti-Thrashing

## Purpose

Prevent long, low-value tool/repo exploration when the user has already supplied enough context to produce the requested visible result.

This skill exists because wasting time recovering information that is already known is a production bug.

## Prime directive

**When the requested outcome, source assets, and execution lane are already known, execute immediately. Do not perform broad archaeology first.**

Visible output outranks speculative completeness.

## Default decision order

Before any search/read/tool exploration:

1. Read the current user request literally.
2. Check the current conversation and recent handoff for the exact needed facts.
3. Check already-opened or already-verified source material.
4. Execute the smallest artifact that proves progress.
5. Only retrieve more context when a concrete missing fact blocks execution.

Do not search merely because search is available.

## Archaeology budget

For a narrow visible task:

- maximum **2 targeted lookups** before producing a result;
- maximum **one exact file read** when the needed implementation detail is likely localized;
- do not scan package manifests, whole repos, or unrelated files unless the task explicitly requires architecture recovery;
- if two targeted lookups do not reveal the missing detail, use the best verified current context and make the canary.

If the user asked for a quick visible canary, repository comprehension is not the goal.

## Artifact-first rule

For animation/sprite iteration:

1. identify the exact source frames;
2. normalize only those frames if needed;
3. reproduce the known timing/deformation recipe;
4. render/show the result in the requested visible surface;
5. stop for judgment.

Do not package, schedule, document, refactor, or generalize before the canary is visible unless explicitly requested.

## Pose Lab / Widget Fidget rule

When the user asks for a Pose-Lab-like preview in ChatGPT:

- use **static sprite frames + JavaScript playback/deformation**;
- do **not** use video;
- do **not** use GIF;
- do **not** invoke image generation unless the user explicitly asks to create/edit imagery;
- prefer tiny canonical 96×96 frame assets over large embedded media;
- show the full sprite on a dark/checker stage with correct framing;
- expose timing, stepping, play/pause, and speed controls when useful;
- use the existing PLMP/Pose Lab timing/deformation model rather than inventing a parallel format.

## Known-donor rule

If the user identifies a known donor animation such as April jab:

- treat donor timing/deformation as authoritative unless the user says otherwise;
- copy only the requested motion properties;
- preserve the target character's real source keys and identity;
- do not spend time rediscovering the donor if it is already visible in the current conversation or verified project context.

## Stop conditions

Stop tool use immediately when:

- the user says stop;
- the requested visible artifact is ready for judgment;
- continuing would only improve architecture, documentation, or generality rather than the commissioned result;
- the next step changes scope or lane.

Do not perform a final "one more check" after a stop.

## Message-stream safety

Avoid giant inline payloads.

For interactive ChatGPT previews:

- embed only small frame assets;
- do not stuff large videos or multi-megabyte base64 media into one message;
- keep app/widget code compact and bounded;
- if the visible surface can be built from 96×96 source cells, use those cells directly.

## Correction preservation

After the user corrects a workflow, preserve all earlier constraints.

Example:
- user says no video;
- then says use 96×96 sprites;
- then says copy April timing;
- next revision must satisfy **all three**.

Never fix the newest issue by reintroducing an older rejected approach.

## Time-to-visible target

For a narrow animation canary with known frames and known donor timing:

**Target: one short execution pass, then visible result.**

If the task starts turning into repo archaeology, stop and reassess before continuing.

## Completion standard

A task is complete only when the requested visible result appears on the user's requested surface.

Local scratch files, hidden tool output, repo inspection, or a successful script are not sufficient proof by themselves.

## Reminder

**Known context → exact source → smallest canary → visible result → user judgment.**

Not:

**search → search → package.json → archaeology → architecture essay → no artifact.**
