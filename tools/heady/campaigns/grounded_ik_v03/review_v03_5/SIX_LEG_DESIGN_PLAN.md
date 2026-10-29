# HEADY GROUNDED IK | V03.5 SIX-LEG SIDEWAYS GAIT
## Comprehensive engineering plan | planning only | 2026-10-28

**Status:** PLAN ONLY. No new IK solve, animated candidate, installer, Git commit, phone upload, or GitHub write has been performed for v03.5. The owner has authorized moving from the approved v03.4 single-foot out-and-back mechanical proof into a *coordinated six-leg walking* design, while explicitly requesting a comprehensive planning phase first.

## 1. Authority, provenance and immutable baseline

- Live Google Drive: Campaign Etiquette `1wntegQjw7238dmGqbvs9TQmlsp4uXdXw7_wPciNx6sI`, revision `AHj4eMT3f9rPHEpAO7HJeB_3KSC5_CekdeGjNhW1b_N1-EQUTw310i_kJZW2K4FOCu8cEVKmc2u_fmNL9mNTrdyD22dFRy2cqRNOzzdNbdY`; Pose Lab 3D rules `1BNXVfowZWQSSA0Nk0OK4jP7_K-ysHnM5vTPV_EB8EWU`, revision `AHj4eMTuJ4TD3rtRQ7CIMUPVrrKahvrIcx6us_qzi88YwQT_iZYDn5IursSH89sUbbnhRevEOcCrdsQaUVF9VaC3HoRrpLyr0WLYrKSfWyk`; current Heady handoff `157fe2ZkMeTShyxd_ocPY7KZdKiEWaaq2_s2R6XVclck`.
- Pose Lab source repository `Valar05/pose-lab-v2`: `AGENTS.md`; `docs/POSE_LAB_CAMPAIGN_RULES.md`; `docs/POSE_IS_GOD.md`; `docs/POSE_CAMPAIGN_FRAMEWORK.md`; repository file `docs/POSE_3D_CAMPAIGN_RULES.md` is **not present** on the public branch inspected; the live Drive 3D document was read. On target device the installer must inspect the actual repo-local file if present before modifications.
- Original rig: `Meshy_AI_Character_output (1).glb`, SHA-256 `8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27`; 52 skinned joints, 0 source animation channels, source character 1.7 native units high. Original binary buffer, geometry, materials, textures, UVs, skeleton and skin weights remain immutable.
- **Accepted motor behavior:** v03.4 one right-middle-foot out-and-back, 37 solver samples; leg `Bone_010 → Bone_009 → Bone_008`; all other five toe witnesses anchored; world-body travel peak +X .095,+Z .020 followed by return; two deliberate lifts with roughly .068 model-unit peak and no lift plateau; owner expressly approved advancing to next stage. Preserve the accepted v03.4 reference visual and numeric receipts; don't reinterpret acceptance as approval for a six-leg walk.
- Prior v07 traditional three-link scuttle is REJECTED. Do not reintroduce its timing, in-air fake root motion, bone/socket displacement or weight edits.
- Physical phone's exact v03.4 Git commit SHA and installed status are **unknown** absent owner receipt; next installer must not assume any prior campaign besides exact original source in the new complete distribution.

## 2. Actual rig anatomy and foot witness geometry

All positions are original model units, +Y up, X lateral, Z front/back. ``Toe`` means *a skinned-mesh witness group*, not the last bone head or an authored foot sole. Right and left labels refer to original source mapping.

| Leg | Joint chain from body | Rest toe X | Rest toe Y | Rest toe Z | Notes |
|---|---|---:|---:|---:|---|
| LF | 007→006→005 | -.385333 | .006974 | +.470333 | Front leg may approach claw and hair silhouette |
| LM | 013→012→011 | -.532232 | .001743 | -.097205 | Three named bones |
| LR | 021→020→019→018 | -.193102 | .002614 | -.286385 | **Four** joints; terminal toe vertices weighted across multiple nodes |
| RF | 024→023→022 | +.385333 | .006103 | +.471641 | Front leg may approach claw and hair silhouette |
| RM | 010→009→008 | +.532232 | .001743 | -.097205 | Owner-accepted out-and-back chain reference |
| RR | 017→016→015→014 | +.190487 | .002614 | -.288129 | **Four** joints; terminal toe witness is nonrigid |

Do not impose 3-bone-only closed-form assumptions on the rear limbs. Keep mesh-deformation-aware witness contact, original local quaternion frames, and independently calibrated axes; current solver uses provisional local X/Z degrees of freedom, **not** proven anatomical limits. Avoid using a single endpoint as a rigid foot for rear legs.

## 3. First deliverable: one genuine sideways world-travel cycle on SIX legs

**Travel command:** world +X (body sideways), zero yaw, flat Y=0 test ground, fixed world camera. Direction is an explicit signed vector; model-forward +Z remains scene calibration, not an unverified default. Choose slow **wave/metachronal** coordination for initial build: one leg moving at a time, five planted. **Not** six isolated per-leg clips: all six solves happen each tick and interact with one shared traveling body.

**Nominal cycle displacement:** root world +X **0.095** native units; each leg's new world contact position advances +X **0.095** after its one swing. Unlike v03.4's test stride +.125 with root +.095 then reversing home, this creates a *spatially closed actor-relative posture after every complete cycle*: world toes and world root each advanced the same 0.095. A 0.125 stride may remain a parameter in diagnostic mode, but must not be imposed globally if a front/rear leg cannot reach. The common cycle advance is bounded by the least capable of six measured reachable workspaces, not by the successful RM leg alone.

**One complete cycle (normalized `phase` 0–1):** provisional alternating-side rear-to-front schedule below. One swing occupies one-sixth of the cycle, with brief event-order hysteresis at touchdown so that another leg does not release before the previous foot is confirmed planted. Stance nominal `5/6` (83.3%) for each leg. This schedule is one mechanical candidate, not a universal crab observation.

| Slot | Phase interval | Swinging foot | Remain world-planted | Phase offset |
|---|---|---|---|---:|
| 1 | [0,1/6) | **Left rear (LR)** | LF, LM, RF, RM, RR | 0/6 |
| 2 | [1/6,2/6) | **Right rear (RR)** | LF, LM, LR, RF, RM | 1/6 |
| 3 | [2/6,3/6) | **Left middle (LM)** | LF, LR, RF, RM, RR | 2/6 |
| 4 | [3/6,4/6) | **Right middle (RM)** | LF, LM, LR, RF, RR | 3/6 |
| 5 | [4/6,5/6) | **Left front (LF)** | LM, LR, RF, RM, RR | 4/6 |
| 6 | [5/6,1) | **Right front (RF)** | LF, LM, LR, RM, RR | 5/6 |

This is a readable biologically motivated schedule; final phase ordering is subject to actual collision, reach and support-polygon screening. We may score alternative orderings within this one campaign, but must document any changed order rather than silently improvising. For physical crab locomotion, interleg coordination depends on species, environment, and speed.

**Preliminary support polygon evidence:** using the six *rest* XZ skinned toe witnesses and a moving `(rootX,rootZ)` proxy over +X .095, replacing each swinging foot's contact at the end of its assigned slot, the **minimum signed proxy-to-hull edge distance is approximately +0.197 model units** at five substeps per swing. Thus this schedule is *not immediately geometrically disqualified*. These are theoretical planar contact points and a body-origin proxy, NOT center-of-mass measurement, load/contact force/friction, or a six-joint physical stability simulation. The actual animated foot positions and world-body transform must be reevaluated every tick; no acceptance based solely on this number.

## 4. Foot placement and individual-leg IK

Every frame, update body-world transform `B(t)` from the character controller FIRST. The controller owns the body translation; no bone-root compensating animation, no pretending the character walks while stationary. All six actual skinned leg meshes share the same parent root transformation and retain source bind matrices.

Per leg, use explicit state machine `STANCE_LOCKED → REQUEST_LIFTOFF → SWING → VERIFY_TOUCHDOWN → STANCE_LOCKED`. During stance, keep a **world-space** anchor immutable while body `B(t)` moves; solve the leg against `B(t)^-1 * world_anchor`. During swing, remove its contact flag, use a terrain-aware reachable next footprint and the accepted v03.4 **nonplateau lift arc**, with same body-relative progress but independently directed leg coordinate frames. At touchdown, release downward velocity, validate ground-contact candidate, and establish the new world-space anchor. No extra recovery-to-rest interval is inserted.

Body travel rate is separate from stepping tempo and foot shape; the initial review may use deliberately slower time sampling while retaining fast swing events in *phase time*. `step_advance = predicted_root_cycle_advance`, with per-leg offsets limited by workspace (lateral/forward). Use a calibrated and labeled foot-contact patch to reconcile front toe median hover (~0.006–0.007 units) with geometric ground, not an indiscriminate forced Y=0 on all toe witnesses.

For each of 3-node LF/LM/RF/RM and 4-node LR/RR, independently configure actual joints, axis modes, bend sign, contact vertices, safe angle ranges, regularization, soft limits and pole direction, preserving world joint-head attachment of the body-side bone. Apply continuous warm-start to the solver for stable joint branches; penalize large per-frame joint jumps but NEVER hide a missed contact by dragging the foot. Verify no discontinuity at each change from stance to swing and at the last-to-first phase boundary.

## 5. Staging in ONE campaign, not one script per leg

**Gate 0: exact-source/repo preflight.** Verify GLB hash; source material and texture buffers; all 52 joints; zero existing animation tracks; current repo HEAD/dirt and install paths; six chains and their output toe witnesses. Fail closed on mismatches. Complete packet must remain usable if the owner skipped earlier v03.3 or v03.4 installers.

**Gate 1: synchronous six-chain static conditioning.** All six feet planted, body moves +X .095 with per-tick solves. Check rear-chain stiffness, cross-leg deformations, foot-patch heights and world drift. Preserve v03.4 benchmark. Candidate remains preview-only, no accepted content modified.

**Gate 2: six-step WAVE.** One continuous body travel, all six legs coordinated by contact scheduler. No loop repetition until one whole cycle passes checks. Reverify support polygon and mesh collisions every tick. If any individual leg fails, AUTOMATICALLY produce its full diagnostic contact sheet (root, 3/4, side, bones, contact witnesses) in the SAME run; do not ask owner to launch six separate scripts. Attempt only predefined safety branches: lower body speed, shorten full-cycle displacement for ALL six consistently, reduce unreachable swing clearance for affected limb, change landing X/Z within reachable ground and document all changes. Do not swap source bones or repaint weights without separate permission.

**Gate 3: two-cycle continuity.** If Gate 2 passes, simulate 2–3 continuous cycles without reversing body direction, compare actor-relative rest/start posture against last frame, guarantee no foot slip after a touchdown, confirm no visible jump in root velocity, limb joint local orientation, target world anchoring, or texture. The first pose and next-period pose need not be pixel-identical in the world camera because root moved, but actor-relative kinematics and contact schedule must be periodic.

**Gate 4: conditional tripod candidate, still same package.** Once the slow wave is acceptable mechanically, run alternating tripods: group **A = LF + LR + RM**, **B = RF + RR + LM**, phase offset 0.5. Rest-state triangular proxy margins from prior measurements A~+.1973 and B~+.1978 model units, NOT dynamics. Use *more than* 0.5 initial stance duty such as beta~0.55–0.6 if needed for touchdown overlap; only reduce to canonical beta=0.5 after contact safety is demonstrated. A tripod may pass geometry and still look biologically unconvincing. User separately accepts or rejects this faster candidate; no automatic promotion.

**Deliberately out of scope:** forward/diagonal blending, inclines/turns, body bounce/roll, claw bracing and opening/closing, arm choreography, hair weighting changes, mesh re-rigging, game-engine force dynamics, full procedural turn cycles. Keep those in backlog for follow-on stages, not hidden prerequisites.

## 6. Numerical, visual, contact and regression gates

- Foot anchors: for each leg in stance, track Euclidean distance between *actual deformed skinned toe witness* and locked world anchor. Desired `<= 0.0002` native units where feasible, FAIL review gate if `>0.001` without an explicitly justified/calibrated contact-patch model. v03.4 had max other-five drift `2.4751e-5` for a single active foot; new tolerances must not be misrepresented as measured achieved values.
- Clearance: calculate lowest deformed foot/leg mesh vertex against triangulated ground; proposed stop if penetration below `-0.001` model units, with all hover/penetration measurements included regardless of passing. Front foot tip witness hover (up to .007) must be measured, not silently compensated by altering source weights.
- Stability: every frame record set of planted feet (at least five in wave, at least three in tripod), convex hull and signed margin from *body-origin proxy*; flag any negative proxy margin and halt if user-chosen geometric safety threshold (initial proposed `.05` model units) is crossed. Real physical stability will still require center of mass and forces later.
- Reachability: fit each target with its own 3/4-joint chain, verify no joint bound saturation, unacceptable local-axis rotations, popping, disconnected socket or unreachable target. Provisional axis bounds are solver guards, NOT biological limits. Source model mesh must remain bit-for-bit identical; generated images are candidates.
- Interpenetration: compute collision proxies for each leg shaft/neighbor, claw, shell and hair (capsules plus close mesh proximity for flagged poses); inspect any suspect frame at high resolution. Don't fix proximity collisions by deleting limbs or masking textures.
- Contact-state truth: never display 'PLANTED' before world-ground touchdown is checked. A toe projected onto the floor on a chart does not prove it has an appropriate contact patch. Maintain exact phase event receipts.
- Smoothness: test first and second pose derivatives around liftoff, touchdown, 1-cycle wrap and optional gait switch; no long hover plateau, no slow return-to-rest tail, no sudden world-root reset, no zero-duration double-transition. Maintain original v03.4 reference as side-by-side comparator.
- Preservation: source GLB SHA, binary buffers, images, weights, joints, rest bind transforms and prior accepted v03.4 artifacts unchanged; v07 rejected variants never reused. No new Game Engine integration claims from offline video results.

## 7. Required visual and structured outputs

One human-friendly self-contained archive with a version-bearing basename `Heady_GroundedIK_v03_5_SixLegWave_Campaign.zip` (actual digest computed on release, NOT predetermined). Contents: immutable source GLB, exact v03.4 accepted source/receipt or hashed ref, all six-joint mappings, machine-readable settings and phase table, whole working simulation/renderer code and primary self-locating runner, tests, manifest, numeric CSV/JSON, logs included in ZIP but ignored from raw Git staging, contact traces, local-stage receipt, and before/after static proofs.

Direct review: **full-body textured world-fixed two-camera GIF** with visible ground grid and six numbered/color-coded world toe anchors; **side/oblique zoom joint review** showing front and rear chains; **clean textured no-overlay video** for artistic judgement; slow wave loop preview of at least two cycles after mechanical gate; **per-leg state timeline**; foot X/Z/Y trajectories, planted drift and signed support margin charts; static first/last actor-relative pose comparison; collision/overreach appendix. All actual source landmarks and target/foot positions annotated with explicit source-coordinate provenance. The direct GIF must remain linkable *outside* the ZIP for easy human review. Every preview uses the original texture UV orientation.

Single owner invocation (only after implementation is commissioned): verify SHA-pinned exact ZIP across Android download duplicate suffixes; install full versioned packet into Pose Lab V2; inspect actual Git ignore rules and stage only scoped nonignored files, force-add only explicitly contracted whole ZIP if ignored; local commit at verified install, generated proof validation, and delivery receipt boundaries; copy + SHA-readback PNG/GIF to **both** Android Pictures and Downloads; attempt bounded media scan + `termux-open`; print complete phase results and paths immediately and at terminal. No extra status script, no manual `mediarefresh`, no computer hands, no GitHub remote writes or push. Resume partial results idempotently with immutable staged files and preserve unrelated dirty/index state. Off-device results and local-phone installs must not be conflated.

## 8. Decision table and rollback

| Observed outcome | Automatic in-campaign action | Human gate |
|---|---|---|
| All six wave contacts and motion good | Preserve the exact approved candidate, proceed to two-cycle continuity preview | Owner inspects full gait |
| Rear leg folds, slips or overreaches | Freeze remaining original input; produce rear joint-marked diagnostics; shorten shared stride or adjust solver axis limits only as a measured **new candidate** | Compare rear chain at native-size view; no separate script |
| Front leg contacts claws or hair | Diagnose proximity with original skinned mesh and unchanged claw pose; adjust foot trajectory/stride within workspace | Inspect high-resolution front-angle proof |
| Foot cannot touch while maintaining support | Reduce root displacement/tempo and rerun full-cycle preflight in the same controlled campaign; fail closed if unresolved | No false physical-pass claim |
| Three-leg tripod support questionable | Deliver the accepted slow wave only and mark tripod blocked/provisional | Owner decides whether to refine speed gait |
| Media delivery or local Git commit fails | Print source-verified last successful phase, preserve immutable packet, run predefined ignore-/partial-index reconciliation | Never claim complete or force repo reset |

## 9. Explicit approval meaning

The current user's approval is for **v03.4 one foot out-and-back** and authorization to **plan the six-foot campaign**. This plan does not automatically authorize a future uploaded/deployed release, new full-speed gait, new weights, altered bone hierarchy, advanced game engine behavior or GitHub write. The next implementation turn should create a candidate and submit visual proof for separate review; only the owner can promote that candidate.

### Technical literature retained for implementers

- Wave gait β=5/6, alternating phase and tripod comparisons: https://www.mdpi.com/2227-7390/11/3/617
- Metachronal slow-wave rear-to-front vs alternating tripod: https://www.mdpi.com/2218-6581/3/2/181
- Phase-continuity, ripple/tripod transition strategies: https://pmc.ncbi.nlm.nih.gov/articles/PMC6749326/
- Static support polygon, IK and omnidirectional phase oscillator implementation: https://www.nature.com/articles/s41598-026-56856-0

**Current terminal state:** DOCUMENTED DESIGN, NO v03.5 MODEL/ANIMATION OR INSTALLER EXECUTION. Next action is authoring a single complete campaign after plan review.
