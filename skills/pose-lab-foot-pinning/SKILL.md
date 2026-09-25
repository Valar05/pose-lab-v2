# Pose Lab Foot Pinning

## Purpose
Keep one authored foot visually planted while swapping sprite poses in procedural animation.

## Literal rule
Pin the exact requested foot. Do not substitute pelvis, centroid, ground center, silhouette center, or another proxy.

## Authority order
1. Canonical sprite sheet for source-cell geometry.
2. Exact renderer crop/cell mapping.
3. Rendered review video for final stage-space residual drift.

## Procedure
1. Identify the exact source cells used by the animation.
2. In each source cell, identify the same physical foot/contact feature.
3. Use an explicit source-space anchor point when possible.
4. Remove phase `shiftY` when the requirement is a vertically planted foot. A post-anchor vertical translation defeats the pin.
5. Render and inspect a real review capture.
6. Measure any remaining lateral residual drift in screen pixels against the chosen reference frame.
7. Correct only that residual with `registrationOffset` in stage space. Do not reconvert stage-pixel residuals through `bodyScale`.
8. If some residual drift is unavoidable, bias it in the character's forward direction, never backward, unless the authored action specifically requires retreat. For a right-facing Vanguard, forward is +X.
9. Preserve authored pose, timing, shear, scale, slash/effect controls, and intentional motion unless explicitly asked to change them.
10. Verify the literal acceptance criterion on the rendered animation, not on an abstract proxy.


## Acceptance threshold
- Vertical planted-foot drift: effectively 0 px.
- Horizontal planted-foot drift: target <= 2 px total across the authored cycle.
- If residual horizontal drift cannot be eliminated without damaging the pose, bias it forward in facing direction. Never accept backward slide merely because it is small.
- Do not call a pass complete from source coordinates alone; verify the rendered review.

## Anti-smart-dumb guardrail
Exact object. Exact coordinate space. Exact subtraction. Exact verification. No proxy objective.

If a simple measured offset solves the visible problem, do not add normalization, optimization, centroid matching, or another heuristic layer.

## Failure lessons from Vanguard overhand
- Atlas-space offsets are not automatically stage-space offsets.
- An explicit foot anchor can still be undone by later phase translations such as `shiftY`.
- Final lateral residual is easiest to correct from the rendered review video in stage pixels.
- If drift remains, prefer forward motion over backward slide.
- Do not stack compensations on top of a bad coordinate assumption. Remove the bad assumption first.
