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


## Production failures learned 2026-09-25 — mandatory guards

These rules are consequences of observed Vanguard atlas failures and are mandatory, not suggestions.

### Campaign execution must carry through
- A known recoverable error path is a branch to repair-and-continue, not a reason to stop and hand Drew another debugging turn.
- Before handing off any shell campaign, preflight embedded Python/shell syntax and assert the exact expected tokens/contract. Never knowingly hand off an error message as a possible normal branch.
- Never put an interactive pager in a one-run campaign. Set PAGER/GIT_PAGER or use non-paging commands.
- If a dirty tracked file blocks canonical sync, preserve its bytes and diff first, reconcile only the known campaign-owned file, and leave all unrelated dirty archaeology untouched.
- Every phone-side campaign handoff MUST assume the worktree may already be dirty. Dirty-tree reconciliation is a required preflight, not an exceptional recovery step.
- Before any fetch/merge/pull that could overwrite a campaign-owned tracked file: inspect status; archive that exact file plus its diff; if and only if its provenance is the immediately preceding campaign-generated mutation, restore ONLY that file to HEAD; then fast-forward. Never ask Drew to discover this collision by running the script.
- A handoff that begins with `git merge --ff-only origin/main` without dirty-tree preflight is invalid.
- Never use stash/reset/clean as a convenience broom.
- After every Git write, reread the committed file and verify the intended bytes actually landed. A commit SHA alone does not prove content correctness.
- Do not stop after diagnosing a repo-owned prerequisite that is already authorized to repair. Fix it and continue to the visible review boundary.

### Source identity and ingress
- When exact source files have already been identified by path/hash, pin those exact files. Never fall back to "newest two PNGs" or other filesystem roulette.
- Existing Downloads/Pictures sources do not need retransmission through chat, base64, or another transport.
- Never confuse chat review images with the already-present original filesystem sources.

### Sprite extraction
- A multi-pose source is NOT automatically a regular grid. Count, separators, and overlap must be proven from the authored source.
- Never infer pose count from filename, equal thirds/halves, connected-component count, or "widest regions" when human/source evidence provides the authored count.
- Equal-width partitions may be indexing hints only. They are not crop boundaries when silhouettes, hair, weapons, trails, debris, or effects cross them.
- Overlapping authored poses require explicit masks/lassos or another source-faithful separation. Do not use nearest-center pixel ownership.
- Never keep only the largest/central connected component. Legitimate limbs, weapons, hair, effects, feet, and debris can be disconnected at sprite resolution.
- Never delete pixels from a contaminated packed atlas when the original authored source exists. Rebuild the rejected new cells from originals.
- Cleanup is subtraction-only on explicitly identified contamination. If ownership is ambiguous, preserve pixels and request/derive an explicit mask rather than amputating the pose.

### Scale and color calibration
- 96px is a density convention, NEVER a target crop height.
- Do not invent target sprite heights or RGB multipliers when an accepted atlas/source pair exists.
- Measure the accepted canonical atlas before scaling new sprites. Record the measurement population, statistic, and resulting transform.
- For a regular authored batch, preserve one shared source scale unless the source itself contains intentionally different scale classes.
- Do not normalize each new pose independently to a median bounding-box height. Relative authored scale is locked unless explicitly rejected.
- When Drew accepts color but rejects crop/scale, color becomes locked. Subsequent fixes may not retint.
- When Drew accepts scale but rejects another property, scale becomes locked.
- Reuse the exact accepted color/refinery transform for artwork from the same source family whenever available. Persist that transform as executable authority, not prose only.

### Atlas packing
- Existing published cells are immutable. Verify the old pixel rectangle is pixel-identical before review.
- New append cells must be roomy enough for complete prepared silhouettes. Grow append geometry rather than clipping.
- Never shrink a useful pose merely because a cell is too small.
- Ground/baseline placement must be measured against the established atlas convention, not eyeballed.
- New cell IDs and source hashes must be manifested.

### Visual review surface
- Isolated new-sprite strips are supplemental only. They cannot establish relative scale, tint, density, grounding, or packing acceptance.
- Every atlas append review MUST expose the full expanded atlas with existing accepted cells visible beside the new cells.
- Review must make new cell IDs identifiable without hiding the surrounding canonical comparison.
- Never call build, hash, manifest, syntax, HTTP, or guard success visual acceptance.

### Narrow writable surface
- "Good enough" or "good" locks that named visual property immediately.
- A rejected property narrows the next mutation to that property only.
- Never fix crop by changing color, fix scale by changing extraction, or fix one appended cell by rewriting the other accepted appended cells.
- Before every retry, explicitly preserve all accepted properties mechanically, not by intention.

### No heuristic escalation after failure
- If one heuristic extraction visibly fails, do not replace it with a more destructive heuristic on the same derivative.
- Return to original source authority, preserve accepted transforms, and use explicit measured geometry/masks.
- Two consecutive visual failures of the same class require updating the campaign guard/doctrine before another attempt.


## Instant Execution Doctrine — deterministic rails for constrained reasoning

This section exists because a lower-reasoning execution mode can still invent locally plausible solutions while failing to re-check global campaign constraints. Correctness MUST NOT depend on model reasoning effort. The model may propose; deterministic campaign machinery decides whether a proposal is legal.

### Interpretation cannot mutate directly
- Model interpretation is never mutation authority by itself.
- Every consequential mutation follows: REQUEST -> PLAN -> SEALED PLAN -> APPLY -> VERIFY -> RECEIPT.
- A read-only planning/preflight phase resolves exact authority, input paths and hashes, HEAD, dirty state, writable paths/properties, locked properties, intended diff, expected outputs, and verification before mutation begins.
- Do not discover source identity, cell identity, transform meaning, or writable scope halfway through apply.

### Sealed mutation contract
- Before apply, persist or print a machine-readable contract containing at minimum: normalized request, authority, input identities/hashes, starting HEAD/state hash, mutable paths, mutable properties, locked properties, expected outputs, and verification predicates.
- Apply consumes that exact contract. It may not silently reinterpret the request.
- If consequential information is absent from the contract, apply fails closed rather than inventing it.

### Stale-plan rejection
- Bind every plan to the relevant starting state: HEAD, required file hashes, accepted artifact hashes, and target dirty-state facts.
- If bound state changes between plan and apply, reject with STALE_PLAN and recompute.
- Historical passing evidence is archaeology, not proof for current HEAD.

### Determinism and idempotence
- Identical request + identical state MUST resolve the same authorities, inputs, writable surface, intended diff, and verification predicates.
- Planning twice against identical state should produce equivalent normalized plans.
- Applying an already-successful campaign again MUST be a no-op or reproduce identical bytes. Cumulative transforms are forbidden.
- Important campaign tooling is not accepted until an immediate second apply returns NO_OP_ALREADY_APPLIED (or equivalent) and leaves hashes unchanged.
- Never express an accepted absolute visual state as a relative repeated operation such as "30% smaller again." Seal the resulting artifact/hash or absolute transform.

### Identity before mutation
- "I think this is the sprite/cell/file" is not authority.
- Consequential identity must come from explicit user designation, manifest/contract, accepted artifact/hash, or verified source mapping.
- Human/source evidence outranks heuristic identity.
- Wrong identity is repaired before placement, scale, timing, effects, or packing.

### Typed uncertainty and failure
- Unknown is a valid deterministic state, not an invitation to improvise.
- Use narrow failure states where applicable, including UNKNOWN_SOURCE_IDENTITY, AMBIGUOUS_MASK, DIRTY_TARGET, STALE_PLAN, LOCK_VIOLATION, UNEXPECTED_DIFF, MISSING_AUTHORITY, and VISUAL_REVIEW_REQUIRED.
- A failed verification does not authorize the same apply step to try a different heuristic or architecture.
- Return to planning with preserved evidence.

### Consequential ambiguity gate
- Consequential ambiguity MUST collapse before apply.
- Harmless ambiguity may remain unresolved.
- If uncertainty can change which pixels/files/cells/properties are mutated, it is consequential and must be resolved by authority/evidence, not inference.

### Already-true short circuit
- Before mutation, evaluate whether the requested postcondition already holds.
- If it does, return NO_OP_ALREADY_APPLIED with current evidence.
- Do not rewrite registration, re-ingest artifacts, reapply transforms, append duplicates, or create redundant commits merely because a campaign was invoked.

### Claim-scoped verification
- Verification must prove the exact claim being made.
- "Server works" requires the intended committed revision plus the required live endpoints.
- "Atlas promoted" requires the committed artifact identity/hash and served artifact identity/hash where runtime delivery is part of the request.
- "Sprite resized" requires before/after evidence for the explicitly identified sprite, not a different cell.
- Build success, HTTP success, syntax success, guard success, and visual acceptance are distinct evidence classes and MUST NOT substitute for one another.

### Current-state receipts
- Final receipts bind at minimum: normalized request/plan identity, HEAD, relevant input hashes, output hashes, executed command/campaign identity, verification predicates, and verdict.
- Do not reuse a prior receipt as current proof after relevant state changes.
- Requested capability, intended capability, deployed capability, and verified capability remain distinct until receipts prove each transition.

### Recoverable failures checkpoint and continue
- Recoverable infrastructure/prerequisite failures preserve evidence and continuation state.
- When repair is already authorized and deterministic, repair and continue rather than returning Drew to the prompt.
- Drew is not the transport/debugging layer for predictable branches.
- A known recoverable branch belongs in campaign code.

### Evidence hierarchy
When evidence conflicts, use this authority order for the property at issue:
1. explicit current human acceptance/designation;
2. accepted artifact/hash or sealed campaign contract;
3. current repo doctrine/manifest;
4. current runtime evidence from the intended revision;
5. historical evidence;
6. model interpretation/heuristics.
Lower authority cannot silently override higher authority.

### Narrow mutation after acceptance
- Human acceptance immediately locks the accepted property.
- Subsequent plans must mechanically carry locked values/hashes forward.
- A correction narrows the writable surface; it does not reopen the whole artifact.
- If preserving a locked property cannot be proven, do not apply.

### Instant-mode behavioral bias
When reasoning effort is constrained, bias toward:
- READ over remember;
- INSPECT over infer;
- VERIFY over narrate;
- EXISTING AUTHORITY over invention;
- ABSOLUTE STATE over relative transforms;
- NO-OP over redundant mutation;
- TYPED FAILURE over improvisation;
- ONE SEALED PLAN over conversational patch chains.

### Required campaign acceptance battery
For new or materially changed campaign machinery:
1. PLAN twice against identical state; normalized plans must agree on authority, inputs/hashes, mutable surface, intended diff, and verification.
2. APPLY only the sealed plan.
3. VERIFY exact expected diff/output hashes and locked-state preservation.
4. Expose the required visible review surface when visual acceptance is part of the task.
5. REAPPLY immediately.
6. Require NO_OP_ALREADY_APPLIED (or byte-identical equivalent).
7. REVERIFY and require the same verdict/receipt predicates.

A campaign that only works because the current model is clever enough to remember unwritten context is not production-ready.


## Image-generation pose/reference doctrine — learned 2026-09-25

These rules govern generative pose mining before mechanical sprite extraction. They inherit the same authority separation and sealed-plan discipline used elsewhere in Pose Lab.

### Reference roles are typed and non-interchangeable
- Before generation, assign each supplied reference an explicit role: CHARACTER/MODEL, WEAPON, POSE/SKELETON, EXAGGERATION, STYLE, or LAYOUT.
- A reference controls only its declared role. Pose reference does not redesign the character or weapon; character reference does not override requested body geometry; exaggeration reference does not donate choreography.
- When multiple references conflict, resolve by property-specific authority before generation. Never blend authorities by visual similarity.
- If a previously generated candidate is accepted for one property only, that acceptance does not promote its other properties.

### Preserve accepted identity while mining pose diversity
- For established characters, character identity and canonical weapon geometry are locked during pose exploration unless explicitly unlocked.
- A new pose request changes pose/choreography only. It does not authorize a new weapon, grip architecture, costume, proportions, or character interpretation.
- If a generation preserves pose but drifts character/weapon identity, reject it as a candidate rather than treating the drift as a new baseline.
- Do not use a visibly rejected derivative as the next generation's identity authority.

### Contact-sheet mining beats false precision when requested
- When exact single-pose generation repeatedly drifts, prefer a contact-sheet mining pass when Drew authorizes spam/harvest.
- A mining sheet is a set of independent candidate solutions, NOT an animation sequence unless explicitly requested.
- Candidate poses on a mining sheet must have materially distinct silhouettes, centers of gravity, torso/hip relationships, and action lines. Six near-duplicates is a failed sheet.
- "Exaggerate like reference X" means match X's RANGE/AMPLITUDE of pose separation, not X's choreography.
- Human pose references define joint/body geometry when designated pose authority. Exaggeration may amplify that geometry but may not replace it with a generic run, lunge, dash, butt strike, or weapon attack.

### Shoulder/body-action distinction
- If the requested action is shoulder-led, the shoulder/body must visibly lead the action line.
- Weapon motion must not become the apparent primary attack unless explicitly requested.
- A shoulder charge is not satisfied by forward translation alone. It requires readable shoulder displacement, torso rotation/compression, hip counter-rotation, and weight transfer.
- "Short-range/heavy counter" forbids silently converting the move into a long running step, leap, projectile pose, or generic dash.

### Generated sheet composition
- Unless requested otherwise: no prose labels, arrows, callouts, UI, scenery, or explanatory typography.
- Keep candidate figures isolated with non-overlapping silhouettes and sufficient gutters for later extraction.
- Keep character scale consistent across cells unless scale variation is itself requested.
- Do not clip hair, limbs, weapon, trails, or other authored geometry. Increase canvas/cell room instead.
- For pose mining, effects/debris are subordinate to readable body geometry and must not contaminate neighboring cells.

### Failure memory and retry discipline
- After a rejected generation, record the rejected properties mentally/in the active plan and preserve every accepted property on retry.
- Never respond to a weapon-identity failure by changing pose strategy, or to a pose failure by redesigning the weapon.
- Two failures of the same class require changing the generation strategy or constraints before retry, not merely rewording the same request.
- Do not propose returning to a generation strategy already demonstrated to fail in the same campaign without new evidence that changes the failure condition.

### Mechanical extraction boundary
- Generated contact sheets are authored source for the poses generated on that sheet once Drew selects/accepts them; later screenshots, crops, stitched previews, and atlas derivatives are not replacement source authority.
- Selection ("use poses 4 and 6") authorizes deterministic crop/stitch only. It does not authorize regeneration, rescaling, repainting, or cleanup unless separately requested.
- Deterministic slice/stitch must preserve source pixels and scale. Any generative repair is a separate mutation requiring an explicit edit/generation request.


### Browser-module syntax is a required transport gate
- A static build reporting success does NOT prove browser JavaScript is syntactically valid.
- Every refresh/promotion campaign that serves a directly loaded JavaScript module MUST run a syntax parser/check against that exact committed module before restart and again from the disposable served revision.
- For the current Pose Lab runtime, `node --check src/procedural-motion-preview.js` (or an equivalent parser that understands the file) is mandatory before claiming the review surface can load.
- Literal escape corruption such as the two-character sequence backslash+n in source code is a named failure class: ESCAPED-NEWLINE-SOURCE. Read-back must check for it after programmatic source patching.
- BUILD_OK without MODULE_SYNTAX_OK is insufficient evidence and must fail closed before browser handoff.
- If local repair produces no diff, do not commit/push/refresh and pretend the repair propagated. Verify the intended byte-level postcondition first; NO_DIFF_WITH_UNMET_POSTCONDITION is a failure.


## Campaign Drive / Fresh-Chat Execution Contract

### Purpose
Campaign Drive exists to make substantial Pose Lab work survive fresh chats, constrained/Instant reasoning, tool-session drift, and disappearing actuators without requiring Drew to reconstruct context or become the transport/debugging layer. A campaign package is an executable continuation boundary, not a prose recap.

### Fresh-chat benchmark
A fresh chat is the preferred hostile test of campaign durability. It should be able to enter with minimal instruction, read root `AGENTS.md`, recover this doctrine and the active campaign package, inspect current repository/runtime truth, and continue safely without conversational archaeology.

Success means a fresh-chat executor can:
1. discover the authorized Home Center/Organ execution lane;
2. recover current HEAD, runtime revision, dirty-tree state, and relevant artifacts before mutation;
3. distinguish read authority, planning authority, mutation authority, execution authority, and human visual acceptance;
4. produce a complete sealed campaign before consequential execution;
5. preserve unrelated dirty archaeology;
6. survive an unavailable/disappearing actuator without substituting architecture;
7. repair deterministic/recoverable prerequisites and continue;
8. distinguish requested, authored, committed, pushed, deployed, served, mechanically verified, and visually accepted states;
9. reach the commissioned acceptance surface rather than stopping at an intermediate success;
10. emit a continuation receipt sufficient for another fresh chat.

### Campaign package shape
Every substantial campaign package should expose, in machine-readable or mechanically unambiguous form:
- MISSION: exact commissioned outcome.
- AUTHORITY: source artifacts, user designations, accepted hashes/frames/poses, and timing authority.
- CURRENT STATE: relevant HEAD, deployed/served revision, known runtime topology, active artifacts.
- LOCKS: accepted properties and files that may not change.
- WRITABLE SURFACE: exact files/properties the campaign may mutate.
- EXECUTION LANE: authorized repo/device/runtime path; forbidden substitutes.
- SEALED PLAN: ordered deterministic operations bound to starting state.
- FAILURE BRANCHES: known recoverable states and their deterministic repairs.
- VERIFICATION: claim-scoped mechanical checks.
- VISUAL GATE: exact human-visible review surface when applicable.
- RECEIPT: state transitions and evidence sufficient for continuation.

### Artificial handoff / commit barrier
Direct actuator access MUST NOT imply incremental mutation authority.
- For consequential code/artifact work, planning happens while mutation is unavailable or logically disabled.
- Produce the complete executable campaign before gaining/using mutation execution.
- Seal/freeze the campaign before apply. The executor may run it but may not opportunistically rewrite it while it is running.
- If an unhandled consequential state appears, stop with evidence and return to planning. Produce a new sealed campaign rather than entering an interactive poke/fix loop.
- Known recoverable branches already encoded in the campaign may self-repair and continue.
- This preserves the useful pressure of a human script handoff without requiring Drew to manually inspect or transport the script.

### Least interactivity
Prefer the minimum interactive mutation surface that can complete the job.
- More actuator capability is not automatically better.
- Repeated tiny direct mutations encourage local hill-climbing and flailing.
- Read/inspect access may be broad; write/execute authority should be campaign-scoped.
- Optimize away Drew's copy/paste burden, NOT the plan/seal/apply boundary.
- Drew should approve/review consequential outcomes where required, not serve as shell transport.

### Tool/actuator disappearance and transport degradation
Phone Hands, browser actuators, or other execution capabilities are ephemeral unless the active campaign proves they are currently available.
- Never assume an actuator persists because it existed earlier in the conversation.
- Re-resolve the authorized execution/transport lane at campaign start and before apply when required.
- Loss of Phone Hands does NOT by itself block a campaign when the exact same sealed campaign can be executed through the already-authorized Termux/manual-paste lane.
- Treat that state as TRANSPORT_DEGRADED, not EXECUTION_BLOCKED.
- Automatic transport: sealed campaign -> Phone Hands -> execution.
- Degraded transport: sealed campaign -> Drew copies/pastes it unchanged into the authorized Termux lane -> execution.
- Actually blocked: the required operation cannot be represented or executed through either authorized transport path, or manual transport would change the commissioned execution lane.
- The campaign artifact MUST remain identical across automatic and degraded transport. Losing Phone Hands changes who carries the envelope, not what is inside it, the target runtime, mutation authority, locks, verification, or acceptance surface.
- Manual copy/paste is a valid fallback transport, not a new architecture and not evidence that Drew owns debugging/reasoning responsibility.
- When degraded transport is used, optimize for one complete self-contained campaign rather than a conversational sequence of shell fragments.
- Do NOT silently switch to Work mode, a phone browser, Browser Nerve, local scratch, another repo, or a newly invented architecture.
- Tool disappearance changes available transport/deployed capability, not the commissioned architecture.
- A campaign package must remain useful when an actuator is temporarily absent: planning, state recovery, validation, manual transport, and continuation evidence should still proceed where authorized.

### Human handoff lesson
The observed reliability benefit of script handoff does NOT depend on Drew reviewing the script line-by-line. The benefit is the requirement that the agent compress the intended operation into one coherent executable artifact before mutation.
- Preserve that computational pressure when transport is automated.
- A giant script that is self-contained, scoped, preflighted, and verifiable can be preferable to dozens of interactive mutations.
- Script syntax correctness is necessary but secondary to process correctness. Campaign verification must prove the commissioned state transition, not merely that shell executed.

### Instant-mode operating model
Instant/constrained reasoning is a supported production mode when the campaign provides deterministic rails.
- Never depend on the model remembering accumulated conversation constraints.
- Root boot gate + campaign package + current repo evidence are the working memory.
- Prefer deterministic scripts/guards to model improvisation.
- Escalated reasoning may design or repair rails, but ordinary execution must not require it.
- A campaign that fails solely because reasoning effort is lower is missing executable doctrine.

### Campaign Drive acceptance test
For a real campaign, test in a fresh chat without manually reteaching accumulated corrections. Give only enough information to identify the repo/campaign.
- If the executor needs conversational coaching to recover a rule already known here, treat it as a Campaign Drive documentation/guard failure.
- Improve the package/root boot gate, then retest fresh rather than teaching one chat a private workaround.
- Use a real but bounded task, not a toy canary, so architecture substitution, dirty-state handling, acceptance boundaries, and actuator loss are observable.
- Do not count success unless the requested artifact and requested evidence arrive through the authorized lane.

### Continuation receipt
Every completed or blocked campaign should leave a compact durable receipt containing:
- campaign/package version or hash;
- starting and ending HEAD/revision;
- exact files/properties mutated;
- input/output hashes where material;
- dirty archaeology preserved;
- execution lane actually used;
- guards/checks run and their results;
- deployed/served revision where applicable;
- visual review URL/surface;
- human verdict if supplied;
- unresolved typed blocker and exact continuation point if incomplete.

The receipt is for the next fresh chat. It must not require access to the conversation that produced it.


### Vanguard appended-sprite scale and color refinery — 2026-09-25
- A visible mismatch between newly appended Vanguard poses and accepted canonical poses is a SOURCE-PREPARATION defect. Do not compensate with recipe `bodyScale`, renderer blur, CSS/canvas scaling, timing, deformation, or registration.
- When Drew gives a relative size correction such as "15% shorter", apply that correction once to the shared source scale of the rejected authored batch. Preserve relative authored scale inside the batch. Never independently normalize frames.
- Vanguard source preparation has two independent obligations: geometry/scale and the established red color/refinery treatment. Passing one does not imply the other.
- "Actual red filter" means the exact established executable Vanguard color/refinery transform already used for the canonical source family. Do not approximate it by eye, invent a new tint, histogram-match, or substitute generic channel scaling.
- Before processing new poses, recover and identify that executable transform from repository authority. If no unique executable authority exists, fail `MISSING_REFINERY_AUTHORITY` rather than inventing one.
- Apply color/refinery treatment at source-preparation resolution before final atlas packing, in the same order as its canonical executable authority.
- If a rejected append batch has not been visually accepted, only those rejected append cells are writable. Existing accepted/published cells, reserved cells, recipes, timing, effects, renderer behavior, and registration remain locked unless explicitly reopened.
- Visual comparison must include at least one accepted canonical pose and one repaired new pose at the same review zoom. Static atlas correctness and animated runtime correctness remain separate human gates.


### Expanded canonical atlas / legacy recipe compatibility — 2026-09-25
- The canonical Vanguard atlas may grow downward only by the exact rows required by accepted/appended cells. Accidental campaign padding or temporary oversized rows are not archaeology and must not be preserved as canonical content.
- A known campaign-owned height explosion may be repaired by truncating only the proven campaign-owned tail, while verifying the entire retained pixel rectangle byte-for-byte before commit.
- Legacy recipes may intentionally describe only the original atlas prefix (for example 1037x1536 / 15 rows) while the physical canonical atlas is taller. Their sampler must use the recipe-declared atlas height for row geometry and may accept a physical atlas whose width matches exactly and whose height is greater than or equal to the declared height.
- A legacy compatibility change is valid only when behavior is identical when physical and declared atlas sizes are equal. Do not rewrite accepted idle/run pose recipes merely to accommodate append-only atlas growth.
- Physical atlas height, recipe view height, and row sampling geometry are separate contracts. Never derive legacy row height from the physical expanded atlas height.


### Transport-stable raster identity and baked calibration — 2026-09-25
- When a user-authored raster source has been re-encoded by phone/chat transport but its decoded RGB pixels are identical, exact dimensions + SHA-256 of decoded RGB pixels may serve as mechanical source identity. Never accept filename, timestamp, byte count, or dimensions alone.
- If the user has explicitly established that a known source may be transport-reencoded and exact decoded-pixel SHA no longer survives, a bounded resolver may use a robust visual fingerprint ONLY for already-identified candidate files. Require exact dimensions, whole-image perceptual-hash distance within a tight threshold, per-frame perceptual-hash checks, and fail closed on zero or multiple matches. This is source-identity recovery, not asset roulette.
- Source resolution by decoded-pixel identity must use a bounded candidate set derived from known paths/basenames/patterns and optional byte-size prefilters, then verify the authoritative pixel SHA. Never decode/hash the user's entire Downloads/Pictures image corpus in a campaign.
- Byte SHA remains the authority when exact encoded bytes matter (for example an accepted runtime effect). Pixel SHA is only for source-art identity across lossless/re-encoded containers.
- Once exact source identity is established, do not use connected-component selection to discard legitimate separated geometry such as hair, weapon tips, shells, or detached silhouette details. Use the full foreground bbox inside the proven authored frame partition.
- A named calibration artifact that already encodes a requested relative correction (for example `*-15pct-smaller`) is the post-correction authority. Never apply the same percentage a second time.
