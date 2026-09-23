# Swarmling Intake

## Verdict

The Swarmling is the first Fleshpunk beat-em-up enemy.

Its source model already has a strong biological thesis:

- a blind, oversized head that resolves into a feeding mouth;
- a squat humanoid labor body rather than a heroic combat body;
- a dorsal root organ that dominates the silhouette;
- secondary root growths at the hips, thighs, and calves;
- large planted feet and long arms that remain readable in side view.

The model should be improved through materials and local surface hierarchy, not
replaced with armor, costume, horns, weapons, or generic goblin anatomy.

## Source Truth

The project-owned native source is:

```text
authoring/swarmling/Swarmling.blend
```

Its SHA-256 is:

```text
1ec19b77e6bf4e0cf1fbb85c5a875d76afce68145e8494af548a046b2770b0ca
```

The Blender file header identifies Blender 4.04. Its embedded strings expose
two purpose-built action names:

```text
Idle
Attack
```

Run the native inventory and export with:

```sh
npm run inspect:swarmling
npm run build:swarmling
```

The Meshy source package in `tank-kata` was independently verified through a
native cloud checkout with Git LFS enabled. The verified package contains:

- a 6,061-vertex / 6,106-polygon textured static mesh with three packed
  2048×2048 images;
- a 24-bone rigged `RunFast` clip sampled over frames 0.8–12 at 24 fps;
- a 24-bone rigged `running` clip sampled over frames 0.8–16 at 24 fps.

Those locomotion clips are useful inventory. They do not supersede the
purpose-built `Idle` and `Attack` actions in the native Blender source.

## Locked Gameplay View

Use the source QA view named `world_pos_x`.

That orthographic side presents the Swarmling facing screen-left, toward the
right-facing Vanguard. Do not mirror the rig or change camera sides between
frames.

The four native orientation renders and the locomotion contact sheet live in:

```text
docs/assets/swarmling/
```

## Appearance Anchor

The production concept sheet is:

```text
public/assets/swarmling/concept/swarmling-style-anchor-v1.png
```

It establishes:

- pale gray-lilac flesh with bruised blue-green undertones;
- restrained subdermal veins and old graft seams;
- matte skin against wet mouth and root tissue;
- raw pink root tips;
- the dorsal growth as a vascular tendon-and-nerve organ, not decorative
  spikes;
- simple body-first, mouth-second, roots-third value hierarchy.

The concept sheet is appearance authority only. Its more articulated fingers,
toes, and root webbing are improvement targets for a later model revision, not
permission to change the native rig, action geometry, limb ownership, or
silhouette during animation export.

## Next Acceptance Slice

1. Run `inspect:swarmling` against the native `.blend`.
2. Export one runtime GLB containing the native rig, materials, `Idle`, and
   `Attack`.
3. Render `Idle` from the locked `world_pos_x` camera.
4. Skin the style anchor over the native idle without changing geometry.
5. Review the result at beat-em-up gameplay scale beside Vanguard.
6. Only then export hurt and death poses.
