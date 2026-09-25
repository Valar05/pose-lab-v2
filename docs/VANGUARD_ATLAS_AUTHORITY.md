# Vanguard Atlas Authority

This file exists so Vanguard pose selection does not require archaeology.

## Canonical expanded gameplay atlas

For Vanguard procedural animations requiring expanded poses, use:

`assets/vanguard/procedural/vanguard-pose-atlas-expanded.png`

Do not select an atlas by filename similarity, screenshots, backup names,
review images, source-sheet names, or remembered dimensions.

## Machine-readable authority

`public/assets/vanguard/procedural/butt-smash.recipe.json`

is the proven reference declaration for the expanded atlas.

New expanded-pose recipes must copy its complete:

`atlases.vanguard-canonical`

object, including `rowBounds`.

Do not reconstruct or approximate the geometry.

## Current geometry

- columns: 6
- rows: 16
- index base: 1
- size: 1037 × 1645
- final row bounds: 1536 → 1645

## Bottom-row pose ownership

- cell 91: Butt Smash windup
- cell 92: Butt Smash drive
- cell 93: Butt Smash impact
- cell 94: Shoulder Charge brace
- cell 95: Shoulder Charge impact / drive
- cell 96: empty

## Historical files are not authority

`vanguard-pose-atlas-90.png` is historical and does not contain the
expanded bottom-row contract used by Butt Smash and Shoulder Charge.

Files containing names such as:

- NO_CLIP
- review
- backup
- pre-*
- source

may be useful archaeology, but they are not runtime atlas-selection
authority.

## Authoring rule

When creating a new Vanguard attack:

1. Read `butt-smash.recipe.json`.
2. Copy its complete expanded atlas declaration.
3. Choose the intended cells.
4. Do not alter another atlas's row count or dimensions to make those
   cell numbers appear valid.
5. Do not create another Vanguard runtime atlas merely to add an attack.

## Debugging rule

If the page, renderer, and recipe load but the wrong pose appears,
the server is already doing its job.

Check:

route → recipe → atlas path → rowBounds → cell

Do not restart or redesign a working server to fix a pose-selection bug.

HTTP 200 proves plumbing, not animation correctness.
