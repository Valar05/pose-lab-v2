# Pose Lab Sprite Normalization

## Purpose

Normalize high-resolution April/Vanguard sprite sheets into the canonical Pose Lab sprite format without destroying silhouette scale, pivot consistency, or runtime readability.

## Core rule

Do **not** uniformly shrink an entire multi-cell source sheet to a small atlas.

The canonical workflow is:

1. Treat the high-resolution sheet as authoritative source art.
2. Isolate each pose/cell individually.
3. Normalize each pose independently:
   - preserve the full silhouette;
   - preserve intended contact/ground line;
   - preserve consistent character scale;
   - align a stable pivot/anchor;
   - keep useful transparent padding;
   - remove/clean source background as needed.
4. Reduce each normalized pose to the canonical **96 px sprite representation**.
5. Pack normalized 96 px sprites into the indexed/runtime atlas.
6. For motion/deformation work, enlarge the selected canonical 96 px sprite onto the **512 × 512 working canvas** used by Pose Lab.
7. Animate/deform there, then evaluate back at native sprite scale.

## Visual treatment

Match the established April/Vanguard Pose Lab look:

- alpha/edge cleanup after isolation;
- controlled value-band collapse/posterization where appropriate;
- preserve the shared limited-palette look (historically ~64-color treatment);
- avoid muddy resampling;
- preserve important armor, face, weapon, hand-occupancy, and contact cues.

## What not to do

- Do not resize a 4×3 high-resolution sheet directly to 384×288 just because 96×96 is the target cell size.
- Do not make every cell inherit the same bounding box without per-pose normalization.
- Do not crop limbs, weapon geometry, motion arcs, or planted feet.
- Do not treat the 512 canvas as the shipped sprite resolution.
- Do not treat the high-resolution sheet dimensions as runtime layout.

## Fix-as-you-go doctrine

When building a motion:

1. Pull only the source poses needed for the move.
2. Normalize those poses into canonical 96 px sprites.
3. Use them in the PLMP/Pose Lab motion.
4. When the animation is accepted, keep/upload those normalized sprites into Pose Lab.
5. Do not stop production to normalize the entire corpus unless there is a concrete batch reason.

## Acceptance criteria

A normalized sprite passes when:

- the entire intended silhouette is visible;
- character scale is consistent with existing April/Vanguard canonical sprites;
- pivot/contact alignment is stable;
- no critical face/armor/weapon details are lost;
- it reads clearly at 96 px;
- it can be enlarged to the 512 working canvas without changing its canonical identity.

## Reminder

**Author high → normalize per pose → ship at 96 → work/deform at 512 → judge at native scale.**
