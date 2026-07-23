# Crimson BVH Retarget Spike

Status: **contract GREEN; Blender motion bake RED / not yet executed**.

The executable spike is `tools/bake_bvh_retarget_spike_blender.py`. Run it with:

```sh
npm run experiment:bvh-retarget
```

GitHub Actions runs the same proof on pushes to `agent/bvh-retarget-spike` and
uploads the canonical BVH, round-trip metrics, baked Crimson `.blend`, locked
side-view frames, orthogonal diagnostic renders, and `manifest.json`.

This branch replaces the previous transform-transfer experiment with one narrow
question:

> Does baking evaluated motion onto a small canonical skeleton, carrying that
> motion through BVH, and applying rest-corrected deltas to Crimson produce a
> useful body before weapon constraints?

## Why the old path became impossible

The source is not a simple humanoid skeleton:

- Vanguard has 440 GLB nodes and 437 skin joints.
- `SwordAttack1` has 1,311 animation channels and writes translation, rotation,
  and scale for all 437 joints.
- Those joints include Rigify ORG/DEF/MCH layers, IK and FK branches, hose and
  twist helpers, weapon sockets, controls, mechanism bones, and armor helpers.
- Crimson has 26 nodes and 24 skin joints under a plain direct hierarchy.
- Crimson's armature root carries a `0.01` scale.

The rejected candidate did not merely map a source motion to a target skeleton.
It sampled selected Vanguard controls, mixed local deltas with body-basis
changes, solved limb endpoints again, and then applied camera-compensated blade
directions. Each correction changed the coordinate system of the next one.

## The BVH guillotine

BVH is useful only after the evaluated Vanguard pose is reduced to the
21-joint contract in `canonical-skeleton.json`.

The Blender pass must:

1. Import Vanguard and activate native `SwordAttack1`.
2. Create the canonical proxy armature in a normalized rest pose.
3. At 60 fps, sample the evaluated source `ORG-*` anatomical joints in world
   space.
4. Solve the proxy from joint positions plus distal orientation for net twist.
5. Bake the proxy action.
6. Export only the proxy as BVH.
7. Clear the scene and re-import the BVH.
8. Normalize Crimson against the same rest/facing/height contract.
9. Apply canonical world-pose deltas through each Crimson parent/rest basis.
10. Bake a Crimson action and render diagnostic plus fixed-camera evidence.

Directly exporting Vanguard's 437-joint armature as BVH is explicitly rejected.
That preserves the bureaucracy instead of removing it.

`DEF-*` is also rejected as the canonical input. Vanguard's limbs are split
across multiple DEF segments for twist and deformation. Those bones are useful
for checking the rendered mesh after the motion is applied, but `ORG-*` is the
small anatomical skeleton that should cross the interchange boundary.

## What BVH buys

- A human-readable, inspectable hierarchy and channel stream.
- One root convention, unit convention, frame rate, and Euler order.
- Separation between evaluated body motion and source rig controls.
- A reusable canonical motion bank for retrieval and curve extraction.
- A round-trip boundary that can be numerically tested.

## What BVH cannot buy

- The Arborblade mesh or its grip calibration.
- A second hand constrained to the same rigid sword.
- Contact intervals, foot locks, collision, or hit frames.
- Rigify twist/hose behavior or Crimson-specific armor correction.
- Screen-readable acting.

Those remain sidecars and downstream constraints. The immediate proof is body
motion: shoulders, clavicles, elbows, chest, and pelvis must participate before
the sword is attached.

## Current verification

Run:

```sh
python3 tools/test_bvh_retarget_contract.py
```

This verifies the checked-in GLB facts and all mapped nodes without Blender.
It generates `rig-diff.json`.

The visual/BVH proof is still RED because the existing Cloud Run Codex executor
accepted the job but exited on account quota before running Blender. No Blender
installation was attempted, in accordance with the repository constraint.
