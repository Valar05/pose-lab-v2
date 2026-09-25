# POSE LAB CAMPAIGN RULES — FAIL CLOSED

These rules are mandatory for Vanguard procedural sprite campaigns. They exist because repeated conversational improvisation caused regressions.

## Authority separation
- Pose authority and timing authority are separate. A 3D clip may supply timing only unless explicitly named as pose authority.
- User-supplied/accepted sprite frames and the canonical sprite sheet are pose authority. Never substitute a nearby atlas cell.
- Effect source authority must be explicit: individual image OR one exact atlas cell. Never render an entire atlas as an effect.
- Git-owned committed assets are runtime authority. Downloads/Pictures are ingress only, never runtime truth.

## Locks
- Once Drew says an animation, frame, pose, foot pin, effect, timing, transform, or property is good/final/accepted/locked, it is immutable until Drew explicitly unlocks that exact thing.
- A correction narrows the writable surface. "Everything is good except X" means ONLY X may change.
- Never repair one frame by rewriting all frames.
- Never modify a shared renderer to solve a single-animation problem unless the change is proven behavior-neutral for every locked animation and explicitly authorized.
- Attacks 1–4 are currently locked. Attack 5 is the only active mutation surface.

## Planted foot / 2D IK
- Exact foot. Exact point. Exact coordinate space. Pin first. Trim second. Verify on render.
- Identify the exact same physical foot in every canonical source cell.
- Use explicit source-cell anchor points. Never substitute ground center, centroid, pelvis, silhouette center, lowest row, or heuristic anchoring.
- Every planted frame targets the same stage point.
- Audit registrationOffset and phase shiftX/shiftY after pinning. No unexplained compensation may remain.
- If rendered residual remains, adjust only the named bad frame in stage space by the measured residual.
- Acceptance: vertical drift effectively 0 px; horizontal drift <=2 px total.

## Effects
- Individual effect request => dedicated individual image source.
- Atlas effect request => exact declared grid + exact selected cell.
- Never switch between individual image and atlas because it is convenient.
- Never choose an asset by "newest file", dimensions, filename vibes, or nearest visual resemblance when identity is known.
- Preserve approved source bytes/hash. Do not regenerate/crop/downsample an accepted effect unless explicitly requested.
- An atlas is a container, never an animation.

## Timing
- Preserve documented native cadence when a named source clip is timing authority.
- Do not infer pose selection from timing source.
- Do not retime accepted phases while fixing registration/effects unless timing is explicitly unlocked.
- Recovery/interpolation may be optional when combo input cancels it; do not assume recovery is mandatory.

## Git / runtime
- Git is transport and source truth. Refresh scripts are read-only.
- Authoring changes happen in GitHub/repo source, then refresh pulls canonical main.
- Refresh uses a disposable worktree. Never use local scratch as accomplishment proof.
- One canonical repo-owned refresh script per active campaign; do not proliferate stale $HOME scripts.
- Runtime verifier must understand the current recipe schema. A stale verifier is a failure, not a reason to mutate source.
- HTTP 200/build success is transport proof only, never visual acceptance.
- Before commit: verify diff contains only authorized files/properties.
- After commit: verify locked recipe/file hashes are unchanged.
- Never use git clean, stash, reset, or deletion on unrelated user archaeology/backups.

## Visual acceptance
- Drew's visible review is final taste authority.
- Do not declare a visual fix from JSON/configuration.
- Preserve GOOD states explicitly before the next mutation.
- A later defect in another frame does not revoke an earlier accepted frame.
- Wrong pose identity is fixed before placement. Wrong placement is fixed before timing/VFX polish.

## Operational discipline
- Read this file and the Planted Foot skill before every procedural attack mutation.
- No guessed cell numbers. Determine from canonical sheet/evidence.
- No "helpful" adjacent cleanup.
- No global rewrites for local defects.
- When evidence is insufficient, stop at the exact missing fact instead of improvising.
