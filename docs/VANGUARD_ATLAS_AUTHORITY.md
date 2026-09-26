# Vanguard Atlas Authority

This file exists so Vanguard pose selection does not require archaeology.

## One-atlas invariant

There is exactly one live Vanguard runtime pose atlas:

`assets/vanguard/procedural/vanguard-pose-atlas-expanded.png`

Every live Vanguard recipe, including Idle, Run, attacks, Butt Smash, Shoulder Charge, Reload, and Fire, must read this same atlas. No live recipe may reference `vanguard-pose-atlas-90.png` or another Vanguard pose atlas.

Historical atlases may remain in Git as archaeology, but they are never runtime-selection authority.

## Machine-readable geometry authority

The current shotgun recipes carry the physically current atlas declaration after the appended review row. Existing accepted rows must remain pixel-identical when the atlas grows.

Current physical geometry:

- columns: 6
- rows: 17
- index base: 1
- size: 1037 × 1754
- row 15 bounds: 1536 → 1645
- row 16 bounds: 1645 → 1754

## Pose ownership

- cells 1–90: established Vanguard pose corpus
- cell 91: Butt Smash windup
- cell 92: Butt Smash drive
- cell 93: Butt Smash impact
- cell 94: Shoulder Charge brace
- cell 95: Shoulder Charge impact / drive
- cell 96: empty / reserved
- cells 97–99: Shotgun Reload candidate, human review pending
- cells 100–102: Shotgun Fire candidate, human review pending

The shotgun row is quarantined until Drew accepts it. Quarantine does not create a second atlas.

## Authoring rule

When creating or repairing a Vanguard animation:

1. Read this file.
2. Use `vanguard-pose-atlas-expanded.png`.
3. Preserve all existing atlas pixels exactly.
4. Append downward only when genuinely new poses are needed.
5. Update the single canonical atlas declaration without changing unrelated timing, effects, registration, or pose IDs.
6. Never create, rebuild, or resurrect another Vanguard runtime pose atlas.

## Migration rule

If any live Vanguard recipe still points at `vanguard-pose-atlas-90.png` or another pose atlas, that recipe is stale infrastructure. Repoint only its atlas declaration to the one canonical expanded atlas, preserving every non-atlas property and every cell ID.

## Debugging rule

If the page, renderer, and recipe load but the wrong pose appears, check:

route → recipe → canonical atlas declaration → rowBounds → cell

HTTP 200 proves plumbing, not animation correctness.
