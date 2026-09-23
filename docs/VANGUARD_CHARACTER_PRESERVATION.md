# Vanguard Character Preservation Contract

Status: canonical production doctrine
Authority: Drew Clarke
Accepted: 2026-07-30

## Authority split

- **Appearance authority:** the six original Fleshpunk Vanguard idle frames in `public/assets/vanguard/fleshpunk/idle/`.
- **Pose authority — idle:** all six original idle poses.
- **Pose authority — held carry walk:** all eight poses in Home Center Drive file `1P-iajzKegi3doNtFcYHFPLt4JSbig5hW` (`Vanguard-Held-Carry-Walk-Candidate-003.gif`).
- **Pose authority — false-edge oberhau:** all eight poses in Home Center Drive file `186gB4vAFHshMvkRgFwXqinn-4XCK_XCG` (`Vanguard_False_Edge_Oberhau_Repaired_001_REVIEW_LOOP.gif`).
- **Timing authority:** remains animation-specific. Pose approval does not silently approve every prior timing map.
- **Acceptance authority:** Drew’s visible verdict.

Grounded Motion is retired. It is not a dependency, source of truth, or required intermediate.

## Governing rule

Approved motion does not grant its artwork authority over Vanguard’s identity.

The original idle owns anatomy, proportions, armor construction and coverage, plume, hair, face, palette, sword design and dimensions, facing, camera, and screen-space scale. The walk and oberhau own their approved pose chronology, contacts, grip relationships, weapon path, support exchange, and demonstrated endpoints. Their visual drift is evidence of what must be reconstructed, not new character canon.

## Production lane

1. Ingest owned or authorized footage, animation, or an accepted pose packet as immutable motion authority.
2. Select and approve the key-only performance before adding breakdowns.
3. Reconstruct the approved poses using an idle-derived layered Vanguard master and an approved replacement-part library.
4. Reuse canonical parts directly where perspective permits. For extreme foreshortening, create one corrective part, review it against the appearance master, and retain it for later reuse.
5. Preserve camera, framing, ground line, screen direction, pose order, contacts, grip, and weapon path.
6. Create arcade feel through exposure and hold timing before drawing new motion.
7. Review the reconstructed keys in Pose Lab beside the appearance master and motion witness.
8. Promote only after visible human acceptance.

## Fail-closed drift gates

Reject a candidate before timing, effects, atlas packing, or engine integration when any frame changes:

- character height, torso-to-leg ratio, limb thickness, or head scale;
- armor-piece silhouette, placement, coverage, or material family;
- plume and hair mass, attachment, or silhouette;
- sword length, blade width, hilt, grip spacing, or active-edge read;
- palette beyond the approved material ranges;
- camera, facing, per-frame scale, crop, or ground registration;
- hand count, grip attachment, support-foot state, or accepted pose chronology.

Mechanical hashes and manifests prove byte identity and transport only. They do not prove character preservation.

## Canonical pipeline

`accepted motion → canonical identity reconstruction → key-only runtime → timing map → Pose Lab review → promotion`

Forbidden:

`one prompt per frame → independent redraws → average the drift → call it consistency`

## Source receipts

- Held carry walk SHA-256: `746de1ed471eaaa96704d77837da73c9fb381fbd09878f80a2f6c97a080509d9`
- Repaired oberhau SHA-256: `225e9171f38a563f394cd8702b4981f2f008b1c24cf18bcc2fe04171755b1c71`
- Idle manifest: `public/assets/vanguard/fleshpunk/animations.json`
