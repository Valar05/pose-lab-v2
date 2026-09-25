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


## Regression taxonomy learned from production
These are named failure classes. Treat recurrence as a guard failure, not a creative decision.
- WRONG-CELL: guessed or substituted atlas cell. Fix identity before placement.
- WRONG-FOOT: anchored a proxy, different foot, or unmeasured point.
- GLOBAL-REPINS-LOCAL: changed multiple accepted sources to repair one bad frame.
- AUTHORITY-BLEED: used 3D timing authority to choose 2D poses, or visual reference to rewrite timing.
- ATLAS-AS-EFFECT: rendered a whole sheet when one effect/cell was requested.
- ASSET-ROULETTE: selected Pictures/Downloads input by newest, dimensions, filename, or resemblance instead of explicit provenance.
- STALE-VERIFIER: refresh script asserted an obsolete recipe schema.
- SERVER-ROOT-MISMATCH: runtime served a root inconsistent with browser asset paths.
- TRANSPORT-AS-ACCEPTANCE: build/HTTP/config PASS reported as visual success.
- LOCK-ERASURE: a later fix changed a property already declared good/final.
- HISTORY-WHOLESALE: restored a whole historical recipe when only one property needed recovery.
- COMPENSATION-STACK: registrationOffset/shift/shear added on top of a bad anchor instead of fixing the source assumption.
- SHARED-FIX-LOCAL-BUG: edited shared renderer for one animation without explicit authorization.
- REFRESH-AUTHORS: refresh script mutates source. Forbidden.
- LOCAL-PROOF: local scratch/worktree state presented as completion. Forbidden.

## Required mutation protocol
1. Read campaign contract and this doctrine.
2. Print current mutable surface.
3. Verify all locked blob hashes before editing.
4. Identify exact requested property and authority.
5. Make the smallest source mutation possible.
6. Run guard before commit/push where the execution lane permits.
7. Reject any diff outside the mutable surface.
8. Pull canonical main into disposable worktree.
9. Run guard again from that exact revision.
10. Build and verify exact browser dependencies.
11. Open visible review.
12. Record human verdict. Only that verdict may expand/narrow locks.

## Evidence-first execution and anti-improvisation
- Before every mutation, reread this doctrine and the active campaign contract. Do not rely on conversational recollection.
- User-visible evidence outranks assumptions. If a screenshot proves an asset is already loaded/rendering, transport, ingress, Git ownership, and HTTP availability are CLOSED unless contrary evidence appears.
- Diagnose the smallest remaining defect from observed evidence. Never reopen solved pipeline stages.
- Do not propose or execute asset transport when the asset is already present in the canonical/live pipeline.
- Do not create a new representation merely because the current representation is inconvenient. Preserve the user's requested source and execution lane.
- A successful prior visual property remains accepted unless Drew explicitly rejects that property. Preserve it mechanically.
- Every mutation must state internally: requested defect, writable property set, forbidden property set, authority, and acceptance evidence. If these cannot be named, do not mutate.
- Never turn a diagnosis into a new architecture. Fix the named defect in the existing architecture.

## Atlas geometry
- Never assume an image is a regular atlas because it contains multiple effects.
- Grid metadata (columns/rows/indexBase) is allowed only when equal cell geometry is proven by the source artifact or authoritative metadata.
- Irregularly arranged artwork MUST use measured source rectangles / irregular-cell bounds.
- If a screenshot shows fragments of neighboring effects, treat that as evidence of a bad extraction rectangle/grid, not evidence that the source asset is wrong.
- Never solve bad atlas extraction by re-importing, regenerating, copying, or transporting an asset that is already present.
- An exact effect selection requires: canonical source asset + measured source rectangle (or proven regular cell) + explicit pivot/placement.
- Effect extraction geometry and effect placement are separate. Fix extraction before tuning position/scale/rotation.

## Script and campaign compliance
- Any script handed to Drew must itself follow the active campaign doctrine. A script that bypasses the guard or reintroduces a rejected runtime topology is invalid even if its individual shell commands work.
- Before handing off a script, compare it against the complete constraint ledger: source authority, locks, mutation surface, runtime root, asset paths, verifier schema, and acceptance boundary.
- Canonical refresh scripts MUST call the campaign guard and MUST use the already-proven runtime topology for that surface.
- A newly written guard/refresh system is not exempt from prior doctrine. New infrastructure inherits every settled constraint.
- When a guard catches structural state but misses the observed failure class, update the guard/rules before further creative mutation when feasible.
- Never claim a rule is encoded in the repo unless the corresponding Git write succeeded and a commit SHA is available.

## Binary asset handling
- Do not use base64 as a convenience transport for Pose Lab binary assets.
- Do not transport an asset at all when evidence shows the canonical/live pipeline already contains it.
- Filesystem/Git ingress is used only for genuinely new binary assets.

## Execute discovered prerequisite fixes immediately
- If execution reveals a stale guard, stale contract, stale verifier, or other repo-owned prerequisite that blocks the already-authorized requested work, FIX THAT PREREQUISITE IMMEDIATELY and continue the original work in the same campaign.
- Do not stop merely to report that a prerequisite should be updated when the required update is within the existing authorization, mutation boundary, and safety constraints.
- A discovered prerequisite repair does NOT require a new user prompt when it only reconciles repo enforcement/infrastructure with already-settled campaign rules and does not expand the requested creative mutation surface.
- After repairing the prerequisite, rerun the guard/verifier and continue through the requested visible review boundary.
- Stop only when the prerequisite repair would change locked creative content, expand authority, require unavailable evidence, or cross an explicitly forbidden boundary.

## Sprite-sheet production lessons
- Use original authored sheets as mechanical source; generated derivatives are review-only.
- Shrink source before inference/measurement for speed.
- Apply one shared scale to a regular sheet; do not normalize frames independently.
- Preserve source order and source-cell geometry.
- Grow atlas/cells instead of clipping or shrinking useful poses.
- Match the established body/ground anchor convention.
- Cleanup must distinguish phantom fragments from legitimate separated geometry; use explicit masks when needed.
- Prefer inclusion over premature dedupe; exact duplicates may be removed, meaningful near-duplicates stay.
- Static atlas review and animation review are separate acceptance gates.


## Image Edit vs. Image Generation Lane (2026-09-25)
When the user requests an edit/inpaint/retouch/paint operation on an existing image, the existing image is the authoritative base.

- **EDIT / INPAINT means localized transformation.** Preserve the supplied image and all unmasked content. Regenerate or transform only the explicitly requested region.
- **GENERATION means new composition.** It may create a new image from a description and does not preserve the supplied pixels/layout by default.
- Never substitute a mechanical pixel-editing script, collage, crop/reassembly, or fresh generation when the user explicitly asked for an inpaint/edit unless they separately authorize that implementation.
- Never reinterpret “in paint,” “inpainting,” “paint over,” “edit this image,” or “change just X” as a request to regenerate the whole image.
- For a frame sheet, “edit only frame N” locks every other frame. The mask/write surface is limited to frame N and the named region inside it.
- For localized edits, preserve composition, pose, camera, scale, and all non-target content unless the request explicitly changes one of those properties.
- If the requested edit is safety-eligible, use the image-edit lane directly. Do not bounce through unrelated tools or create intermediate derivatives.
- A failed generation/edit attempt must not silently fall back to a different implementation lane. Stop and report the exact blocking condition.
- **Time-box rule:** localized edits should use the smallest viable tool path. Do not launch repository archaeology, atlas repacking, or mechanical reconstruction for a simple image edit.
- **Source integrity:** the supplied original remains the source. Any generated edit is a derived review candidate until accepted; it must never overwrite or become the source for later mechanical extraction without explicit acceptance.

## Append-only canonical pose atlas
- Published atlas cells are immutable. Never move, resize, repack, renumber, crop, or reprocess existing cells.
- Canonical pose-atlas growth is append-only downward in complete six-cell rows.
- Existing atlas width is invariant. Growth may increase height only.
- Before writing an expanded atlas, preserve and verify the entire old pixel rectangle byte-for-byte at pixel level.
- New poses receive monotonically increasing cell IDs. Empty tail slots remain reserved; never backfill holes above the append boundary.
- Source preparation and atlas append are separate stages. Never regenerate an accepted pose merely to make it fit.
- Every append campaign emits a manifest mapping new cell IDs to source names and source hashes.
- An append script must fail closed if canonical dimensions, old-region pixels, source count, or expected starting cell differ from its declared contract.
