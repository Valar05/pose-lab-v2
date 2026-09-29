# LOW-RES SPRITE DOWNSAMPLE CONTRACT — FAIL CLOSED

This is the mandatory mechanical lane for converting accepted high-resolution sprite/contact-sheet art into gameplay-scale low-resolution sprites.

It exists because repeated attempts that merely made the source image smaller preserved too much illustration detail, produced a miniature-painting look, mismatched established characters such as Obsidian, and were incorrectly handed off without visual inspection.

Read this file before every low-resolution sprite conversion.

## Non-negotiable principle

**Down-resolution is not the same as resizing.**

A valid gameplay conversion must satisfy all three:

1. **Scale match** — the body reads at the intended gameplay size relative to an accepted comparison character.
2. **Detail-frequency match** — fine illustration detail collapses into the same low-resolution visual language as the accepted gameplay sprites.
3. **Softness match** — the result has the same low-frequency / softened read as the accepted gameplay sprite lane, rather than looking like a crisp miniature illustration.

If any one of these fails, the conversion fails.

## Source authority

- Use the accepted high-resolution sprite sheet or accepted individual frame as source authority.
- Never use a previous failed down-res derivative as the source for a later attempt.
- Never use a screenshot, phone preview, review GIF, or generated comparison image as mechanical source when the original accepted source exists.
- Do not use ImageGen to solve a mechanical down-resolution problem.
- Preserve the original source bytes separately and untouched.

## Comparison authority

Before converting a new character family, choose one accepted gameplay-scale comparison frame from an established character.

The comparison frame must:

- be visually readable;
- avoid extreme crouch, squash, foreshortening, or motion blur;
- expose body scale cleanly;
- not use weapon length, cape spill, antennae, VFX, or empty canvas as body-height evidence.

A bad comparison frame invalidates the proof even if the resize math is correct.

## Body-scale procedure

1. Choose one representative source pose for the new character.
2. Measure visible body height only.
3. Exclude weapon reach, cape spill, antennae, raised equipment, VFX, labels, and empty canvas.
4. Declare the target body-height relationship to the comparison character.
5. Compute exactly one global scale factor.
6. Freeze that factor for the entire animation family.
7. Apply that exact factor to every pose.
8. Never fit individual poses independently.
9. Grow output cells/canvas for overflow. Never shrink the character merely to make a rifle, lance, cape, or antenna fit.

Named failures:
- **PER-POSE-NORMALIZATION**
- **WEAPON-BOUND-SCALE**
- **LONG-WEAPON-SHRINK**
- **ATLAS-RESCALE-DRIFT**

## Detail-collapse / softness procedure

The accepted mechanical lane is:

1. Start from the accepted high-resolution frame.
2. Apply a declared **source-space low-pass blur** before downsampling when the source contains significantly more fine illustration detail than the gameplay authority.
3. Downsample once with **PIL.Image.Resampling.BOX** using the frozen family scale.
4. Apply a small declared **post-downsample Gaussian blur** only when needed to match the established low-resolution softness.
5. Save the low-resolution individual frame.
6. Repeat for every frame with the same family-scale and same declared filtering treatment.
7. Build the atlas from those already-down-resolved individual frames.
8. Atlas assembly is placement only. **No rescaling during atlas assembly.**

### Current proven calibration recipe from the Vesper / Obsidian investigation

This is the current reference treatment for a high-detail generated/painted source being brought toward the softer Obsidian gameplay lane:

- source-space Gaussian blur radius: **4.0 px**
- downsample resampler: **BOX**
- post-downsample Gaussian blur radius: **0.35 px**
- atlas assembly rescale: **none**
- review enlargement: **4x BILINEAR**
- review-only enlargement Gaussian blur radius: **0.45 px**

Important:

- The 4x bilinear + 0.45 Gaussian step is a **review preview only**. It is not the gameplay source.
- The gameplay low-resolution sprite is the output after source pre-blur -> BOX downsample -> optional 0.35 post-blur.
- These numeric blur values are a reference calibration for this source/detail regime, not a universal constant. If a different source already matches the gameplay detail frequency, do not add unnecessary blur.
- Any change to these values requires a new visible side-by-side proof against an accepted low-resolution authority.

## Why source pre-blur exists

High-resolution generated or painted art may contain pores, seams, wires, cloth noise, tiny highlights, and linework that survive an ordinary resize as dense micro-contrast.

That creates the failed look:

> "high-resolution illustration made tiny"

rather than:

> "gameplay-scale sprite"

Source-space low-pass filtering collapses information **before** sampling. BOX downsampling then averages the simplified signal into gameplay pixels. A small post-filter can remove residual crunchy edges.

Do not confuse this with simply blurring a large preview after the fact.

## Required individual-frame stage

Every frame must exist as an individual low-resolution image before atlas construction.

The manifest must record:

- source identity;
- source crop/bounds;
- representative body-height measurement;
- target body height;
- exact global scale factor;
- source pre-blur radius;
- downsample resampler;
- post-downsample blur radius;
- output dimensions;
- output SHA-256;
- statement that per-pose fitting was not used.

The atlas builder may only place these frozen low-resolution frames into cells.

## Mandatory proof artifacts

Before an atlas can be handed off, produce all three:

### 1. Native comparison
Accepted low-resolution comparison character and candidate low-resolution character on the same black stage and same ground/baseline convention.

This is the scale truth.

### 2. Nearest-neighbor inspection preview
Enlarge the native comparison with nearest-neighbor only.

This exposes actual pixels and prevents the image viewer from hiding problems with display resampling.

### 3. Soft gameplay/readability preview
Enlarge the same native comparison with the declared soft-preview treatment.

Current reference:
- 4x BILINEAR
- Gaussian radius 0.45 px

This checks whether the candidate and accepted authority occupy the same perceived softness/detail lane.

## Mandatory visual inspection before delivery

The operator must actually open and inspect the proof artifacts before handing them to Drew.

Do not hand off merely because:

- the script ran;
- dimensions are correct;
- hashes exist;
- the manifest says BOX;
- the scale factor is numerically plausible.

Inspect and reject locally if any of these are visible:

- candidate still reads materially crisper than the accepted gameplay character;
- candidate contains much more internal micro-detail;
- candidate head reads obviously too large or too small because of a bad comparison pose;
- body scale is visibly wrong;
- comparison uses a compressed/foreshortened pose that prevents judging body size;
- silhouette or feet are clipped;
- weapon/cape overflow caused body shrink;
- one frame was independently resized;
- atlas assembly resized frames again.

Named failure:
- **MINIATURE-ILLUSTRATION:** technically smaller image still preserves high-resolution illustration density and does not match gameplay sprite language.
- **SOFTNESS-MISMATCH:** candidate and authority have visibly different frequency/softness treatment.
- **BAD-PROOF-FRAME:** comparison pose prevents trustworthy scale/proportion judgment.
- **UNINSPECTED-HANDOFF:** artifact was delivered without the operator visibly reviewing the actual output.

## Accepted-artifact provenance roles

Low-resolution work must keep artifact roles explicit. Acceptance in one role does not silently promote an artifact into another role.

- **source authority** — original authored or explicitly accepted high-resolution source used for mechanical conversion;
- **generated derivative** — creative/generated output that may be accepted art but is not automatically mechanical source authority;
- **gameplay derivative** — down-resolved individual sprite produced from a frozen source by the declared low-res process;
- **atlas container** — packing/placement artifact built from already-frozen gameplay derivatives; atlas acceptance does not redefine source authority.

A file may be accepted in more than one role only when Drew explicitly says so. Record provenance separately from visual acceptance.

Named failure:
- **PROVENANCE-COLLAPSE:** source authority, generated derivative, gameplay derivative, and atlas container were treated as interchangeable.

## Stop-and-lock rule

When Drew says a low-resolution result is **"close enough"**, **"good enough"**, **accepted**, or otherwise visibly approves the relevant property, stop polishing that property and lock it.

Do not continue speculative scale, blur, detail-collapse, or atlas normalization after acceptance. A later defect reopens only the specifically rejected property or cell.

Named failure:
- **ACCEPTANCE-OVERRUN:** continued visual tuning after the human acceptance boundary had already been reached.

## Human authority

Drew's visible review is final.

A locally inspected candidate is only a candidate. Do not call the scale, softness, or detail language accepted until Drew explicitly accepts the visible result.

When Drew says:
- "too detailed" -> reopen detail-collapse/softness only unless scale is also explicitly rejected.
- "too big/small" -> reopen scale only unless detail language is also explicitly rejected.
- "everything except X is good" -> X is the only writable property.

## Delivery requirement

The requested visible comparison is part of the work.

- Deliver the comparison artifact itself, not only a filesystem path.
- When the client supports sandbox links, provide a clickable sandbox link.
- If delivery is known to be failing, do not pretend a path is equivalent to an attachment.
- Prefer one clearly named comparison image over a pile of ambiguous artifacts.
- The user should not have to move files between devices/tools merely to inspect the result.

## Preflight checklist

Before touching pixels:

- [ ] Read `docs/POSE_LAB_CAMPAIGN_RULES.md`
- [ ] Read `docs/POSE_IS_GOD.md`
- [ ] Read this file
- [ ] Identify exact accepted high-resolution source
- [ ] Identify exact accepted low-resolution comparison authority
- [ ] Select a readable comparison frame
- [ ] State body-height target relationship
- [ ] State one global scale
- [ ] State source pre-blur radius
- [ ] State downsample resampler
- [ ] State post-downsample blur radius
- [ ] State atlas cell geometry
- [ ] Confirm atlas will not rescale

Before handoff:

- [ ] Individual low-res frames exist
- [ ] Native comparison exists
- [ ] Nearest-neighbor preview exists
- [ ] Soft preview exists
- [ ] Operator opened all proof artifacts
- [ ] Candidate does not read like a miniature illustration
- [ ] Candidate scale visually matches declared relationship
- [ ] Candidate softness/detail frequency visibly matches authority closely enough for human review
- [ ] Atlas was assembled from frozen low-res frames with no rescale
- [ ] Human verdict is still pending until Drew accepts it


## Vesper-specific scale refinement — 2026-09-29

For the Vesper / Obsidian gameplay family, Drew explicitly established **head size as the comparison surface**.

This refines generic body-height guidance for this character pairing.

Procedure:
1. choose a clean head-readable Obsidian frame;
2. choose a clean head-readable Vesper frame;
3. compare head pixel footprint / apparent head size;
4. choose one uniform whole-sprite scale factor from that head match;
5. freeze that factor for the family;
6. then solve detail-frequency / softness separately.

Do not use total sprite height, rifle length, cape spill, antennae, or crouch compression to override the head-size visual authority.

After scale is correct, reject the result if Vesper still reads like a miniature high-resolution illustration. Detail collapse is a separate required gate.

See:
`docs/VESPER_LOW_RES_ATLAS_PROCESS.md`


## Explicit comparison-surface override

Body height is the default scale authority, but a campaign may explicitly designate another comparison surface. When the user names a surface such as the head, that surface becomes scale authority for that campaign. Compare the same surface across characters, derive one uniform scale factor, and apply it to the entire sprite. Do not independently resize the head/body and do not silently revert to body-height fitting.

The accepted Vesper/Obsidian case uses head size as the cross-character scale ruler because crouch and pose compression made whole-body bounds misleading.

Reference: `docs/campaigns/VESPER_LOW_RES_ATLAS_PIPELINE.md`
