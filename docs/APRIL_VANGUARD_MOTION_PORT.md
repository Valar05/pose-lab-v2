# April + Vanguard Motion Port Plan

All existing April and Vanguard motion work belongs in the new motion-profile system.

## Rule

Do not leave useful procedural timing, deformation, shader, filter, constraint, or event behavior trapped inside legacy animations.

Port it upward into reusable registries and profiles, then represent character-specific animations as profile-backed instances.

## April

April is the primary donor for high-quality strike timing.

Immediate donor migrations:
- Jab -> jab@1 source/preset
- Cross -> copy profile from jab family, then preserve April cross-specific timing/torque
- Hook -> copy profile from jab family, then preserve April hook-specific timing/arc
- Run -> run@1 instance/preset

The purpose is not to reproduce April as hard-coded special cases. Her useful motion grammar should become reusable atoms and profile copies.

## Vanguard

Known current motions to migrate:
- Jab
- Cross
- Hook
- Kick
- Run
- Dodge / Slide
- Flip / Jump
- Grab -> Pull -> Blast
- Retention THOOM
- Two-Hand Drive
- Reverse Crush
- Heavy Idle
- Brake / Hard Plant
- Brace / Manipulate
- Dash

The first seven already map directly to current profile families. The remaining motions stay in the migration registry until dedicated reusable profiles are created.

## Migration rule

Each legacy motion is handled by one of:
- profile source / reusable preset
- profile copy
- profile-backed animation instance
- future profile

No legacy animation should be silently deleted or considered migrated merely because a similarly named profile exists.

## Source binding

Character-specific source frames remain authoritative.

Profiles provide grammar, not replacement artwork.

## Completion

A port is complete only when:
1. its source frames/roles are bound;
2. its profile/version is pinned;
3. its instance serializes to PLMP;
4. it can be previewed in Motion Profile Lab;
5. its candidate can be saved to the repo and read back;
6. human approval determines promotion.
