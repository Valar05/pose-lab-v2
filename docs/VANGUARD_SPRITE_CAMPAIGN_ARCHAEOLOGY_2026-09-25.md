# Vanguard Sprite Campaign Archaeology — 2026-09-25

This document preserves the concrete workflow lessons learned while consolidating Vanguard combat sprite/contact sheets in Pose Lab V2.

## What worked

- Large contact-sheet batches were substantially more effective than one-pose-at-a-time iteration.
- When a source sheet was regular, preserving the sheet's authored 3x2 or 4x4 geometry and reading order prevented accidental reordering.
- Shrinking source material before inference/inspection made the loop much faster.
- The active Vanguard atlas uses a low-resolution character scale around 96px as a pixel-density convention.
- One shared scale factor across a regular source sheet preserves relative sprite scale better than independently resizing every frame.
- The atlas can and should grow when useful poses are discovered.
- Animation-specific roles matter: undercut starters, anticipation, contact, follow-through, recovery, jump, run, reload, and movement frames can be visually similar but functionally distinct.

## Failures that must not recur

### Generated intermediary contamination
A generated image or derivative can look plausible but must never become the source for a mechanical extraction operation. Mechanical atlas work must return to the original authored upload.

### Per-frame normalization
Resizing every cropped sprite to a common bounding-box height produced visible scale mismatch. The crop dimensions are not the scale target.

### Fixed-cell clipping
Trying to force large silhouettes into existing cells caused clipped weapons and bodies. The correct response is larger cells or a larger atlas, not a smaller sprite.

### Phantom fragments
Contact sheets can contain detached feet, claws, labels, or neighboring fragments. These are extraction contamination. However, some detached-looking pixels can be legitimate weapon or anatomy geometry, so blindly keeping only the largest connected component is unsafe.

### Over-aggressive dedupe
Near-duplicate frames can carry different leg placement, torso rotation, weapon angle, anticipation, or combat role. Exact duplicate removal is safe. Near-duplicate removal is only safe when redundancy is unambiguous.

### Missing corpus
A selection pass performed too early can throw away the one useful undercut starter or transition frame. Preserve the corpus first, then curate.

## Canonical future workflow

1. Identify and freeze the original authored source sheets.
2. Ignore screenshots, review GIFs, generated images, and previous packed atlases as mechanical source.
3. Determine whether each source is a proven regular grid. If not, use measured irregular rectangles.
4. Apply one shared scale factor to the source sheet.
5. Perform inference and measurement at the smaller pixel density.
6. Preserve authored reading order.
7. Extract silhouettes without redefining their intended scale from crop bounds.
8. Remove contamination conservatively. Use lasso or explicit masks when connected-component logic would risk deleting legitimate separated geometry.
9. Pack into roomy cells using the established Vanguard body/ground anchor convention.
10. If anything clips, grow the atlas. Do not shrink the sprite to fit.
11. Keep near-duplicates in the initial corpus when uncertain.
12. Review the static atlas.
13. Review the actual resulting animation. Static packing success does not guarantee good motion.
14. Curate only after the complete useful corpus is represented.

## Vanguard-specific motion corpus already identified

The campaign has accumulated source material for:
- six-frame combat run cycle
- combat step / forward stepping while firing
- reload sequence
- jump
- thrust and stab variants
- overhead and descending strikes
- side and horizontal sweeps
- undercut / rising cut candidates
- airborne/lunge candidates
- grounded recoveries
- special/ready poses

When a source batch contains a useful missing role, preserve the entire authored sequence before pruning.

## Human review rules

- Drew's visible review is the final art gate.
- "Good enough" from file structure, hashes, build success, HTTP success, or static packing is not visual acceptance.
- When a frame is rejected for a local property, preserve every previously accepted property.
- A later problem in another frame does not revoke an earlier accepted frame.
- When uncertain, keep the frame.

## Tooling rule

No image generation is part of mechanical atlas/refinery work. Image generation may be a separate creative authoring lane, but its output must not be silently promoted to source authority for mechanical extraction.

## Intended repository homes

The enduring rules live in:
- docs/POSE_LAB_CAMPAIGN_RULES.md
- docs/VANGUARD_SPRITE_REFINERY.md
- docs/ATTACK_AUTHORING_LEARNINGS.md
- AGENTS.md

This archaeology record exists so the detailed lessons from the 2026-09-25 Vanguard consolidation are not lost when conversational context changes.
