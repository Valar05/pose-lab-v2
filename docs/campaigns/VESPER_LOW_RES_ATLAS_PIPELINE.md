# VESPER LOW-RES ATLAS PIPELINE — ACCEPTED PRODUCTION CASE

Status: **ACCEPTED / DO NOT RECONSTRUCT FROM CHAT**

This document records the full production archaeology for bringing Vesper into the same gameplay-resolution family as Obsidian. Read it together with:

- `docs/POSE_LAB_CAMPAIGN_RULES.md`
- `docs/POSE_IS_GOD.md`
- `docs/LOW_RES_SPRITE_DOWNSAMPLE_CONTRACT.md`

The point of this file is to prevent a repeat of the same failure cycle.

## Human verdict

Drew's final visible verdict on the accepted visual-language result was effectively:

> "Surely this is close enough."

Followed immediately by a request to preserve the entire process so it never has to be reconstructed again.

Treat the accepted result as locked for visual-language purposes unless Drew explicitly reopens it.

## Accepted artifacts and authorities

### Obsidian gameplay comparison authority

Source file used during the final comparison campaign:

- filename: `929117.png` / mounted source may be JPEG bytes depending on ingress
- dimensions: **1401 x 1536**
- SHA-256: **d445456e7e54b38619e81052f0e0f40e44581d117762b9d940c7510cc17c0c31**

Purpose:
- gameplay-resolution visual-language authority
- scale/detail/softness comparison
- not a pose donor for Vesper

### Vesper high-resolution source authority

- filename: `929523.png`
- dimensions: **1536 x 1024**
- SHA-256: **2e49d53c17d956b89574d850cf70be1d9e074409301b90f4dbe7d9fb32e934c0**

Purpose:
- Vesper appearance/pose source for the run-family/down-resolution work

### Rejected / intermediate fuzzy Vesper atlas

- filename: `fuzzy_biomechanical_soldier_sprite_sheet.png`
- dimensions: **1448 x 1086**
- SHA-256: **0dd1364674ca48a178856b2527f6abddaa2271180f0ec4a1041a8a83974cec09**

This was visually closer but still too detailed relative to Obsidian.

### Accepted final low-resolution Vesper atlas

- filename: `mossy_sniper_pixel_sprite_atlas.png`
- dimensions: **1448 x 1086**
- SHA-256: **02553770f1987ec0a235ff972deee0eeb9d28140855384031e62c9c2de05273b**

This is the accepted visual-language target.

## The core mistake we repeated

We repeatedly treated down-resolution as if it were primarily a size problem.

It was not.

The failed candidates were often smaller on screen but still preserved:
- facial features as separate readable structures;
- straps and seams as individually legible lines;
- rifle subcomponents as distinct high-resolution parts;
- cloak texture as illustration detail;
- high-frequency edge contrast.

They therefore read as **miniature concept art**, not gameplay sprites.

The correct acceptance question is not:

> "Is Vesper small enough?"

It is:

> "At gameplay scale, does Vesper carry approximately the same amount of readable internal information as Obsidian?"

Named failure: **MINIATURE-ILLUSTRATION**.

## Scale authority: HEAD IS THE COMPARISON SURFACE

For this Vesper/Obsidian comparison, Drew explicitly designated the **head** as the cross-character scale ruler.

This supersedes speculative whole-body fitting for this campaign.

### Rule

1. Choose a readable Obsidian frame and a readable Vesper frame.
2. Compare the visible head footprint, not weapon envelope, pose envelope, or cell dimensions.
3. Establish the desired relative head size.
4. Apply that resulting scale **uniformly to the whole Vesper sprite**.
5. Do not edit the head independently.
6. Do not shrink only the body.
7. Do not stretch vertically or horizontally.

The head is the measuring surface; the **whole sprite** receives the uniform transform.

### Why

Crouch, recoil, cape, rifle angle, and pose compression make full-body bounding boxes unreliable across characters.

The head is much more stable as a visual scale cue.

### Important exception to generic body-height doctrine

The generic Pose Lab contract still uses body height by default.

However, when Drew explicitly names another comparison surface such as the head, that human-declared surface becomes campaign authority.

Do not silently revert to body-height fitting.

## Comparison-frame rule

A proof frame must actually be useful.

Reject comparison frames with:
- extreme crouch;
- extreme foreshortening;
- severe squash;
- motion blur;
- obscured head;
- unusual perspective that makes head/body proportion impossible to judge.

Named failure: **BAD-PROOF-FRAME**.

## Detail-language comparison

Compare one Obsidian sprite and one Vesper sprite at native pixels, then enlarge only for inspection.

Judge:

### Face
Obsidian-level target:
- face collapses into a few masses;
- individual nose/mouth/brow detail is not strongly separable.

### Weapon
- reads as one coherent weapon with a few accents;
- not a collection of individually readable tiny components.

### Armor / cloth
- seams and folds merge into value masses;
- small straps and texture islands do not remain independently crisp.

### Legs / feet
- silhouette remains readable;
- interior anatomy simplifies.

### Edge language
- Vesper should not have materially crisper, higher-frequency edges than Obsidian.

Named failure: **SOFTNESS-MISMATCH**.

## Mechanical detail-collapse recipe

When converting a high-detail painted/generated source mechanically, the proven baseline recipe is:

1. start from accepted high-resolution source;
2. source-space Gaussian low-pass blur: **4.0 px**;
3. downsample once with **PIL.Image.Resampling.BOX**;
4. optional post-downsample Gaussian blur: **0.35 px**;
5. save individual low-resolution frame;
6. repeat with one family-wide scale/treatment;
7. atlas assembly is placement only;
8. no rescale during atlas assembly.

Review-only enlargement:
- **4x BILINEAR**
- Gaussian blur **0.45 px**

The review enlargement is not gameplay source.

### Critical caveat

This mechanical recipe was **not sufficient by itself** to make the earlier Vesper sources visually match Obsidian. It improved softness but still preserved too much internal illustration detail.

Therefore:

- do not claim success because the blur/downsample recipe ran;
- open the result and compare internal readability;
- if it still reads as miniature illustration, it fails.

## Generation lane vs mechanical lane

### Mechanical down-resolution

Use mechanical raster processing when:
- the accepted source already has compatible art structure;
- only scale/softness/detail collapse is needed;
- the user requested resizing/downres;
- a local accepted atlas is being corrected.

### Generation

Fresh generation is a different lane.

Do **not** automatically switch from mechanical down-resolution to generation.

Generation may only be used when Drew explicitly authorizes generation/new composition.

The final accepted Vesper visual-language target was reached via a newly generated low-resolution-styled atlas after repeated mechanical candidates remained too detailed.

That does **not** mean generation is now the default repair mechanism.

## One roomy atlas

Drew explicitly wants all Vesper states consolidated into **one atlas**, with room to grow.

Rules:
- one atlas is preferred over fragmented sheets;
- leave empty cells / canvas room for future actions;
- grow atlas/cells instead of shrinking sprites to fit;
- weapon/cape/antenna overflow is allowed;
- atlas assembly does not rescale accepted sprites;
- source order and pose identity must remain stable once published.

## Local correction rule after acceptance

Once the atlas is visually accepted:

> "Everything is good except X" means only X is writable.

Do not regenerate the atlas to fix one sprite.

Examples:
- butt strike too tall -> resize/reposition butt-strike sprite only;
- one stray artifact -> erase that artifact only;
- one frame off-center -> adjust that frame only.

Every pixel outside the named writable cell/region should remain unchanged when feasible.

Named failure: **LOCK-ERASURE**.

## Butt-strike lesson

A previous repair scaled the butt strike by an arbitrary whole-sprite percentage.

That was the wrong authority.

Correct rule:

1. compare butt-strike head footprint to accepted family head footprint;
2. derive the scale from head size;
3. scale the entire butt-strike sprite uniformly by that factor;
4. preserve aspect ratio;
5. preserve intended baseline/ground relationship;
6. do not independently resize the head or body.

The head is the ruler, not the thing being separately edited.

## Mandatory proof before handoff

Before delivering a new low-res atlas candidate:

1. native Obsidian/Vesper comparison;
2. nearest-neighbor enlarged inspection;
3. soft/readability preview;
4. open all three;
5. visibly inspect scale, head proportion, detail density, softness, silhouette, clipping;
6. reject locally if they do not match;
7. only then hand off.

A script PASS is not visual acceptance.

Named failure: **UNINSPECTED-HANDOFF**.

## Delivery rule

Drew must receive the actual visible artifact.

Do not provide only a raw filesystem path.

Provide a real downloadable/visible attachment or sandbox link when supported.

If delivery is failing, say so rather than pretending a path is a delivered file.

## Final compact recipe

When this comes up again:

1. **READ THE THREE POSE LAB DOCS + THIS FILE.**
2. Locate the accepted source, not a failed derivative.
3. Choose a readable Obsidian comparison frame.
4. Choose a readable Vesper comparison frame.
5. Use **head size** as the campaign scale authority.
6. Apply that scale uniformly to the entire sprite/family.
7. Collapse detail, not merely dimensions.
8. Compare internal readability against Obsidian.
9. Keep all states in **one roomy atlas**.
10. After acceptance, local fixes stay local/mechanical.
11. Open the result yourself before delivery.
12. Drew's visible verdict is final.

## Do not reconstruct this from memory

This file exists specifically because this process was reconstructed and re-learned too many times.

If this task reappears, read this document first.
