# VESPER LOW-RES ATLAS PROCESS — RECONSTRUCTION-PROOF RECORD

Status: **HUMAN-VISUALLY ACCEPTED DIRECTION — 2026-09-29**

This file records the complete Vesper low-resolution atlas process, including the repeated failure modes that must not be rediscovered.

Read this file together with:

- `docs/POSE_LAB_CAMPAIGN_RULES.md`
- `docs/POSE_IS_GOD.md`
- `docs/LOW_RES_SPRITE_DOWNSAMPLE_CONTRACT.md`

The purpose of this record is simple:

> **Never reconstruct this workflow from chat memory again.**

---

## 1. Human target

Drew's target is not "a 96 px character."

The gameplay goal is:

- Vesper should read slightly smaller than Obsidian as a character.
- Character scale must be judged from the **head/body relationship**, not arbitrary atlas bounds.
- Long rifle, cape, antennae, claws, and other overflow are not body-scale evidence.
- Vesper must occupy the same **low-resolution visual language** as Obsidian.
- The final read is allowed to be fuzzy/soft.
- At gameplay size, detail should collapse into broad masses rather than remain a miniature high-resolution painting.

The accepted stopping condition from Drew was effectively:

> **"Surely this is close enough."**

At that point, the important visual-language mismatch was considered sufficiently solved for production use.

Do not reopen the whole family merely to chase microscopic differences unless Drew explicitly asks.

---

## 2. Core authority split

### Appearance / pose source authority

Use the accepted Vesper source sheet or accepted Vesper atlas source named by the active campaign.

Do not use:

- screenshots,
- review GIFs,
- previous failed down-res derivatives,
- phone captures,
- generated comparison sheets,

as mechanical source when the accepted source still exists.

### Scale authority

For Vesper vs Obsidian, the most reliable comparison surface is:

> **HEAD SIZE FIRST.**

Drew explicitly corrected the previous whole-body-height approach.

The head is used as the practical scale ruler because:

- attack poses can compress or extend the body,
- weapons distort total bounds,
- capes and antennae distort full silhouette,
- crouched poses make whole-body height misleading,
- head scale is comparatively stable across pose families.

The whole sprite may be uniformly scaled, but the scale factor must be chosen so the head reads at the intended relative size.

### Visual-language authority

Obsidian's accepted low-resolution sprites are the comparison authority for:

- internal detail density,
- edge softness,
- frequency collapse,
- face readability,
- weapon readability,
- broad-mass grouping.

---

## 3. Failure history — DO NOT REPEAT

### Failure A — "96 px means exactly 96 px"

Wrong.

"96 px" is a gameplay density convention, not a forced total sprite height.

Do not shrink a character merely because weapon/cape/antennae exceed an arbitrary box.

### Failure B — whole-sprite bounds used as scale authority

Wrong.

Vesper and Obsidian have radically different envelopes. Long weapons, cape spill, antennae, and pose extension make full-bounds comparison unreliable.

### Failure C — bad comparison pose

Wrong.

A compressed crouch or foreshortened motion frame can make the head look too large and the body too small.

Named failure:
- **BAD-PROOF-FRAME**

Use a readable frame where the head can be judged cleanly.

### Failure D — simple shrink / BOX resize only

Wrong.

This produced:

> **MINIATURE-ILLUSTRATION**

Vesper became physically smaller but retained far too much internal illustration detail.

Symptoms:

- facial features still separately readable,
- straps and seams remain crisp,
- rifle sub-parts remain individually legible,
- cloth texture survives as dense micro-contrast,
- silhouette is small but interior frequency remains high.

### Failure E — blur only in the enlarged review

Wrong.

A blurry preview does not change gameplay source pixels.

Detail must collapse **before or during downsampling**, not only after the sprite has been enlarged for review.

### Failure F — scaling the butt strike uniformly without checking head size

Wrong for the specific correction intent.

Drew clarified that the head is the comparison surface. A local sprite can be uniformly resized, but the target factor must be chosen by matching head size to the family, not by arbitrary whole-sprite height.

### Failure G — regenerating the whole atlas to repair one bad frame

Forbidden.

If Drew says the atlas is good except the butt strike, then every other cell is locked.

Named failure:
- **LOCK-ERASURE**

Only the named cell may change.

### Failure H — handoff without looking

Forbidden.

Named failure:
- **UNINSPECTED-HANDOFF**

The operator must open the actual native and enlarged proof images before delivering.

---

## 4. The final scale doctrine

### Rule 1 — head is the comparison surface

For Vesper family scale, compare a clean Vesper head against a clean accepted Obsidian head.

Use a frame where:

- head is visible,
- pose is not severely foreshortened,
- silhouette is readable,
- no giant VFX crosses the head,
- no perspective trick changes apparent head size.

### Rule 2 — whole sprite follows the chosen head scale

Once the target head relationship is established:

- apply one **uniform scale** to the entire sprite,
- preserve aspect ratio,
- preserve pose geometry,
- preserve weapon/body relationship,
- do not independently resize limbs, rifle, cape, or head.

### Rule 3 — family scale is frozen

Once the Vesper family scale is accepted:

- use one global family scale,
- do not fit each pose independently,
- allow cells to grow,
- do not shrink poses to fit a cell.

---

## 5. The final detail-collapse doctrine

Matching head size is necessary but not sufficient.

After scale is correct, compare **internal readability**.

Ask:

### Face
Does Vesper still have individually readable brow/nose/mouth/cheek detail while Obsidian's face is mostly a few masses?

If yes, Vesper is too detailed.

### Rifle
Can individual rifle sub-parts still be read while Obsidian's weapon reads as a broader shape?

If yes, Vesper is too detailed.

### Cloth / armor
Are straps, folds, seams, cables, and tiny highlights still separately legible?

If yes, Vesper is too detailed.

### Silhouette
Does the silhouette remain readable after internal detail is collapsed?

It must.

The goal is not "blur until mush."

The goal is:

> **preserve silhouette and major material masses; collapse micro-detail.**

---

## 6. Proven mechanical treatment

For a high-detail painted/generated Vesper source being brought toward the softer Obsidian lane, use this as the reference mechanical treatment:

1. Start from accepted high-resolution source.
2. Apply source-space Gaussian preblur.
3. Downsample once with BOX.
4. Apply a small post-downsample Gaussian blur if still too crisp.
5. Save individual low-resolution frames.
6. Build atlas from those exact low-res frames with **no further rescaling**.

Current reference calibration:

- source-space Gaussian blur radius: **4.0 px**
- downsample resampler: **PIL.Image.Resampling.BOX**
- post-downsample Gaussian blur radius: **0.35 px**
- atlas assembly rescale: **none**
- review enlargement: **4x BILINEAR**
- review-only enlargement Gaussian blur radius: **0.45 px**

These values are the starting calibration for this source/detail regime.

They are not sacred constants.

If the result still reads more detailed than Obsidian, increase detail collapse and re-proof.

If it becomes mushier than Obsidian, back off.

---

## 7. Comparison workflow — mandatory

Before building or accepting the atlas:

### Step A — choose the comparison pair

Pick:

- one clean accepted Obsidian frame,
- one clean Vesper frame.

Avoid bad proof frames.

### Step B — match head scale

Judge head size first.

Do not use total sprite bounds.

### Step C — build native side-by-side

Place both sprites:

- on black,
- on the same baseline convention,
- at native gameplay pixels,
- with no rescaling after their gameplay conversion.

### Step D — build 4x nearest inspection

Nearest-neighbor enlargement exposes actual pixel clusters.

### Step E — build soft gameplay preview

Use:

- 4x BILINEAR
- optional review-only Gaussian ~0.45 px

This checks perceived softness/detail lane.

### Step F — operator looks

The operator must open all proof artifacts.

Do not deliver because the script succeeded.

### Step G — reject if mismatched

Reject if Vesper still reads:

- sharper,
- more internally detailed,
- more facially explicit,
- more texture-dense,

than Obsidian.

---

## 8. Local correction rule — butt strike lesson

If one atlas cell is wrong and the rest is accepted:

> **ONLY THAT CELL IS WRITABLE.**

For a butt-strike that is too tall:

1. identify exact cell;
2. preserve all other atlas pixels;
3. use head size as the scale comparison surface;
4. choose one uniform whole-sprite scale factor based on head match;
5. preserve aspect ratio;
6. preserve bottom/ground anchor unless explicitly reopened;
7. preserve horizontal center unless explicitly reopened;
8. use BOX for mechanical low-res resizing;
9. verify every pixel outside the target cell is unchanged.

Do not regenerate the whole atlas.

Do not change blur/softness of other cells.

Do not change neighboring cell geometry.

---

## 9. Atlas growth rule

Drew explicitly wants all useful Vesper poses in **one atlas with room to grow**.

Therefore:

- prefer one canonical Vesper gameplay atlas;
- pack accepted poses into roomy cells;
- allow long rifle/cape/antenna overflow;
- grow atlas dimensions when needed;
- do not rescale accepted sprites during packing;
- append new accepted poses rather than replacing old accepted cells;
- preserve source order/manifest identity;
- keep empty capacity where useful for later poses.

The atlas is a container.

It must never become another normalization stage.

---

## 10. Exact operator checklist

Before doing anything:

- [ ] Read `POSE_LAB_CAMPAIGN_RULES.md`
- [ ] Read `POSE_IS_GOD.md`
- [ ] Read `LOW_RES_SPRITE_DOWNSAMPLE_CONTRACT.md`
- [ ] Read this Vesper process record
- [ ] Identify accepted Vesper source
- [ ] Identify accepted Obsidian comparison frame
- [ ] Choose a clean head-readable pair
- [ ] Declare that head size is the scale surface
- [ ] Lock every already-good atlas cell

Scale:

- [ ] Match head size
- [ ] Use uniform whole-sprite scale
- [ ] Freeze one family scale
- [ ] Ignore weapon/cape/antenna bounds for body scale
- [ ] Grow cells instead of shrinking character

Detail:

- [ ] Apply source preblur if needed
- [ ] BOX downsample once
- [ ] Apply small post-blur if needed
- [ ] Check face readability
- [ ] Check rifle readability
- [ ] Check cloth/armor micro-detail
- [ ] Reject miniature-illustration look

Proof:

- [ ] Native comparison
- [ ] 4x nearest inspection
- [ ] soft gameplay preview
- [ ] operator opens and looks at all three
- [ ] no claim of acceptance before Drew sees it

Atlas:

- [ ] low-res individual frames exist first
- [ ] atlas packing does not rescale
- [ ] accepted cells remain pixel-locked
- [ ] room to grow is preserved
- [ ] local defect means local writable cell only

---

## 11. Human acceptance rule

Drew's visible verdict is final.

When Drew says:

- **"close enough"** -> stop polishing that visual property and lock it;
- **"everything is good except X"** -> only X is writable;
- **"too detailed"** -> reopen detail-collapse only unless scale is also rejected;
- **"too big/small"** -> reopen scale only unless detail is also rejected;
- **"head size is the comparison surface"** -> use head size, not bbox height.

Do not argue with the visible read using measurements.

Measurements support the human verdict; they do not replace it.

---

## 12. Short version for future operators

If you remember nothing else:

> **Match Vesper to Obsidian by head size. Scale the whole sprite uniformly from that head match. Then deliberately collapse high-resolution detail until face, rifle, cloth, and armor read at Obsidian's softness/detail frequency. Save individual low-res frames first. Pack them into one roomy atlas without rescaling. If one cell is wrong, touch only that cell. Open the actual comparison before delivery. Stop when Drew says close enough.**


---

## Cross-character method boundary

This file is a **case-study method reference**, not a source of universal character measurements.

Future Obsidian, Vanguard, or other Pose Lab low-resolution work may reuse the process structure:

- choose a readable anatomical comparison surface;
- derive one uniform whole-sprite scale from that surface;
- separate scale matching from detail-collapse;
- use source preblur -> BOX downsample -> small postblur where needed;
- save individual low-res frames before atlas assembly;
- treat atlas packing as placement only;
- repair accepted work locally;
- stop and lock when Drew says close enough.

Do **not** copy Vesper-specific numeric measurements, head proportions, cell dimensions, or blur values into another character unless a new proof establishes them there.

Artifact provenance remains separate:
**source authority -> generated/painted derivative when applicable -> gameplay derivative -> atlas container**.


## Accepted Vesper raster authorities — 2026-09-29

These user-supplied sprite sheets are **source authority**. They are not prompts, inspiration, or approximate references.

- `929519.png` — six-frame Vesper run source, 1536×1024, SHA-256 `2e49d53c17d956b89574d850cf70be1d9e074409301b90f4dbe7d9fb32e934c0`
  - same exact bytes were previously recorded under the alias `929523.png`
  - grid: **3 columns × 2 rows**
  - each run frame is mechanically extracted from its exact 512×512 source cell
- `929514.png` — accepted Vesper sprite source sheet, SHA-256 `90f6838423764ed6059eeec5653adf4ebbbc1915641f1bc2098e088547afc611`
- `929515.png` — accepted Vesper sprite source sheet, SHA-256 `9ca7070b0e83e72ee6373a4a2007a0af9a9373af476cf911b82b8fba058e6e66`
- `929578.png` — accepted Vesper sprite source sheet, SHA-256 `8bb9f557758bcd856b01841b19ea0cc4a80c4afbbd9522c3af83adf07c16a7b8`

### HARD BAN — NO IMAGE GENERATION

For these accepted Vesper sprite authorities:

- **ImageGen is forbidden.**
- Do not redraw, reinterpret, restyle, "improve", interpolate with generation, or invent replacement poses.
- Mechanical operations only: exact cell extraction, uniform scaling, declared raster filtering/down-resolution, padding, placement, atlas append, registration, timing, and procedural runtime transforms.
- A generated sprite may never substitute for one of these source-authority pixels.
- If a required pose is absent from these authorities, stop at the missing pose instead of inventing it.

Named regression: **GENERATED-SUBSTITUTION** — replacing an accepted raster pose with a newly imagined/generated approximation.

### Run-specific authority

For `vesper-run`, the six exact cells from `929519.png` are the pose authority.

Do not infer the run from neighboring atlas cells.
Do not use a GIF as pose authority when these source cells are available.
Do not substitute a visually similar generated cell.

The only writable operations before human acceptance are mechanical conversion, registration, timing, and subordinate procedural presentation.
