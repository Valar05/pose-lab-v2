# Pose Lab V2 Motion Profile System

## Model

Frames → Profiles → Animation Instances → PLMP → Candidate → Human Approval → Promotion.

Profiles are reusable motion grammars. They contain normalized timing, easings, modifiers, filters, constraints, and events, but **never absolute animation duration**.

Animation instances supply:
- character;
- concrete frame-role assignments;
- duration;
- per-key timing overrides;
- parameter overrides;
- stack overrides.

Stretching duration scales the whole profile. Individual normalized keys remain editable afterward.

## Primary authoring action

**Copy Profile** is the default authoring path.

New Blank Profile exists only as an escape hatch.

Copies preserve provenance but become independent objects. Editing a copied profile does not mutate the source.

## Frame roles

Profiles request semantic roles such as ready, impact, recovery, contactL, passL.

Required and optional roles are explicit.

## Regions

Profiles may target semantic regions such as punch_arm, torso, head, planted_foot, weapon.

Character/frame mappings supply actual masks or anchors. Profiles should not hard-code pixel rectangles.

## Stack order

1. source frame
2. geometric/deformation modifiers
3. constraints
4. shader/image filters
5. compositing/echoes
6. discrete events

## Timing

Profile keys are normalized [0,1].

Example jab:
- ready 0.00
- drive 0.18
- impact 0.43
- recoil 0.62
- settle 1.00

A 320 ms animation and 600 ms animation use the same profile. The resolved milliseconds scale automatically.

## Registries

Atomic registries live in src/motion/registries.js:
- easings
- motion/deformation modifiers
- filters, including WebGL shader filters
- constraints
- events

Profiles compose these atoms.

## Versioning

Animations pin profile id + version.

Updating jab@2 must never silently mutate an animation authored against jab@1.

Upgrade is an explicit future action with A/B review.

## Saving

The editor serializes the instance to PLMP and computes a canonical candidate path:

animations/candidates/<character>/<animation-id>/recipe.json

The browser must not contain GitHub credentials. Actual repository mutation must use the authenticated Home Center/GitHub authority.

## Initial profiles

- jab@1
- kick@1
- run@1

These are intentionally reusable templates, not character-specific animations.
