# Procedural Sprite Motion

## Purpose

This document defines the reusable procedural-motion layer developed on the
Swarmling utility set and intended for later reuse by Vanguard.

The source pose remains authority. Procedural motion is a secondary deformation
layer around an accepted anchor. It must never compensate for wrong pose identity,
bad sprite-sheet scale, crop errors, or registration defects.

## Pipeline order

1. Pose identity
2. Sprite-sheet geometry
3. Registration / anchor
4. Authored timeline interpolation
5. Procedural physiology overlay
6. Review playback behavior

The motion kernel lives in:

```text
src/procedural-motion-kernel.js
```

Its public entry point is:

```js
evaluateProceduralMotion(profile, context, baseDeform)
```

## Why this is better than one sine wave

Earlier procedural deformation drove shear, scale, and rotation from essentially
one shared oscillator. That produces visible motion, but it can read as generic
"pulsing."

The physiology kernel separates four concerns:

- **independent axis phase** — shear, X scale, Y scale, and rotation do not peak
  at the same instant;
- **state/phase weighting** — an Aggro flare can pulse harder than its entry or
  recovery without changing the authored pose;
- **mode-specific waveform** — alert, damage, collapse, effort, breath, and
  death do not share the same temporal character;
- **terminal stillness** — named phases such as `corpse` can hard-zero the
  procedural layer.

Everything remains deterministic. No random jitter is required.

## Current physiology modes

### organic-breath-v2

Used for single-frame Idle. Slow multi-harmonic breathing and sway with
independent axis phases. The authored pose never changes.

### asymmetric-alert-pulse

Used for Aggro / Surprise. The positive half-wave is sharpened and the rebound
is smaller, producing a fast pressurization and softer recoil rather than a
symmetrical wobble.

### ringdown-impact

Used for Damage. High-frequency impact energy decays rapidly across the hit
reaction.

### collapse-ringdown

Used for Knockdown. The oscillation is slower and heavier than Damage, with very
little residual energy once prone.

### effort-burst

Used for Stand Up. The envelope grows during the middle of a phase, so effort is
strongest while pushing/rising rather than at pose boundaries.

### terminal-spasm

Used for Death. Damped high-frequency motion is permitted during fatal stagger,
kneel, and fall, then hard-zeroed on the corpse phase.

## Profile shape

Profiles are manifest data, not renderer constants:

```json
{
  "mode": "asymmetric-alert-pulse",
  "cycleMs": 240,
  "decayMs": 900,
  "amplitudes": {
    "shearX": 0.052,
    "scaleX": 0.034,
    "scaleY": 0.062,
    "rotateDeg": 2.8
  },
  "axisPhase": {
    "shearX": 0.35,
    "scaleX": 1.75,
    "scaleY": 0.0,
    "rotateDeg": 2.35
  },
  "phaseWeights": {
    "idle-enter": 0.12,
    "surprise-flare": 1.25,
    "surprise-hold": 0.82,
    "idle-return": 0.22
  },
  "terminalStillPhases": []
}
```

This separation matters for Vanguard: the reusable technology is the kernel and
profile schema. Vanguard should receive its own profiles based on its own poses,
timing, mass, and combat semantics rather than copying Swarmling amplitudes.

## Transfer rule for Vanguard

When porting this system to Vanguard:

- preserve all accepted Vanguard atlas cells and recipe timing;
- attach profiles only after pose/registration correctness is already proven;
- use Vanguard-specific envelopes for anticipation, recoil, recovery, idle mass,
  shotgun kick, Gravity Fist charge/release, and other state semantics;
- never copy Swarmling physiology values merely because the kernel supports them;
- keep procedural deformation subordinate to authored key poses and VFX.

The transferable invention is **state-aware deterministic secondary motion**, not
a universal character wobble.
