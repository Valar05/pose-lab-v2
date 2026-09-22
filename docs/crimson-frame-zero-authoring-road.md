# Crimson frame-zero authoring road

## Goal

Author one combat-ready Crimson keyframe from Vanguard frame-zero **visual reference**.

The author owns the pose. The user does not animate it for us.

## Authority boundaries

- Vanguard pixels provide performance intent, silhouette, timing, and force direction.
- Crimson's own rig provides every authored target, bend plane, rotation, and keyed translation.
- No Vanguard quaternion, rest delta, joint coordinate, bone basis, or endpoint enters Crimson's authoring function.
- IK may pin deliberately chosen Crimson relationships. IK does not invent the pose.
- A passing diagnostic means the artifact is inspectable. It never means the pose is visually accepted.

## Operating loop

1. Start from branch `agent/crimson-foot-red-gate`.
2. Freeze the accepted center, head, shoulders, Hips, and complete lower body from the exact `3d6a57a9` browser seed.
3. Author both complete arm chains—`LeftArm`, `LeftForeArm`, `LeftHand`, `RightArm`, `RightForeArm`, and `RightHand`—in Three.js model-local space. Project the high roof-guard wrists and opposed low elbow planes first, rotate the blade around the exact center-camera forward axis second, pin the support palm to the visible handle third, and solve roll last.
4. Require the final wrists to remain high, laterally offset, and vertically stepped. Gate the full helmet/plume against the blade, the lower visible face against the crossguard, and the central face aperture against both visible Hand meshes in the exact 986×900 center, left, and right review cameras. Forearm proximity is recorded as an advisory because Vanguard's source silhouette deliberately frames the head with opposed forearms; the rendered pixels decide whether that framing remains readable.
5. Generate a deterministic one-frame GLB containing all 20 bone rotations and the keyed Hips translation. Reload it through `GLTFLoader`; require exactly 21 unique `t=0` channels and require the reconstructed pose hash to match the candidate.
6. Run `--check` so the generated module bytes must exactly equal the committed candidate. A geometry PASS without committed-byte parity is not review evidence.
7. Push the pass. The `Crimson PR Visual Evidence` workflow repeats runtime authoring, GLB round-trip, committed-module parity, repository tests, and the production build.
8. The browser must render the exact candidate ID, pose SHA, and module SHA. For each review view it must also reproduce the authored blade direction and authored hilt/tip screen points before a success screenshot may be written.
9. Retrieve `crimson-frame-zero-browser-<run-id>` and personally inspect center, left, and right screenshots. Runtime numbers can reject a frame; they cannot visually accept one.
10. Keep the candidate `visual-pending` until explicit human approval.

## Reproduction command

GitHub Actions executes the canonical authoring check:

```bash
node tools/author_crimson_frame_zero_runtime.mjs \
  --angle-deg 48 \
  --check \
  --report generated/crimson-frame-zero-runtime/<run-id>/runtime_authoring_report.json
```

Expected runtime-authority artifact contents:

- `runtime_authoring_report.json`: exact cameras, mesh clearances, support pin, low-elbow checks, hashes, committed-module parity, and GLB round-trip proof.
- `crimson-combat-ready-vanguard-frame0-4.authored.glb`: the deterministic 21-channel body keyframe.
- `01-start/screenshot.png`: exact initial center orbit.
- `02-start/screenshot.png`: exact snapped left view.
- `03-start/screenshot.png`: exact snapped right view.
- each browser `visual_qa_manifest.json`: candidate/application parity plus the live runtime-authoring endpoint proof for that exact view.

A handoff is invalid until all three exact browser screenshots exist, open successfully, are materially different from the rejected frame, and pass independent visual review.

## Visual gate

Inspect in this order:

1. Boots: heel and toe contact, sole upright, no hover.
2. Knees: each knee tracks into its own foot; no inward corkscrew.
3. Pelvis: restrained turn over the support polygon; no compensation twist.
4. Force line: rear foot → pelvis → trunk → hands.
5. Shoulders: clavicles remain quiet; upper arms do not manufacture a shrug.
6. Guard: hands form one high, off-center, vertically stepped grip cluster; both elbows are clearly below the hands and open to opposing sides instead of collapsing into the face.
7. Face: readable from primary, front, three-quarter, both profiles, and rear views.
8. Weapon: guard sits outside the top hand, handle crosses both visible gauntlets, and blade clears the helmet/plume silhouette in every review view.
9. Silhouette: Crimson expresses the same loaded sentence as Vanguard without copying his transforms.

## Protected working facts

Do not casually retune these after they pass:

- calibrated heel/toe/sole contact;
- preserved flat boot world orientation;
- keyed Hips translation needed for crouch depth;
- deterministic runtime-authored GLB round-trip as the body-animation authority;
- the committed candidate module as the separate `sabreLocal` authority;
- the exact Three.js browser render as the sword-child basis and visual authority; Blender sword parenting is diagnostic only;
- explicit `visual-pending` acceptance state.
- center and lower-body local transforms captured before arm authoring.
- the rejected `480eb888` GLB hash `4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56` as the no-op baseline.
- exact protected Hips, center, head, and leg channels from `crimson-frame-zero-480eb888-protected-baseline.json`.
- bilateral runtime arm ownership: all six shoulder-to-hand channels may change, while the accepted center, head, shoulders, Hips, and lower body remain frozen.
- a Vanguard-recognition gate: dominant wrist at least `0.20` torso-height above the neck, support wrist at least `0.03`, grip step at least `0.12`, and the hand cluster offset at least `0.08` shoulder-span beside the head.
- a two-hand weapon contract built from dominant skinned Hand vertices: the crossguard's pommel-side face sits just outside the top hand, the handle passes through both visible hand centroids, the hand surfaces do not overlap, and the support hand remains inside the pommel.
- a final low-elbow guard contract: after the support-hand pin, both `ForeArm` heads must remain at least `0.05` torso-height below their matching wrist bones. Reachability and convergence alone cannot promote a flat or upward arm triangle.
- an exact authored blade-direction contract: wrist FK must converge the actual Arborblade mesh to within `0.05` degrees of the threat line before sword seating or support-hand projection.
- dominant Hand mesh landmarks (`Hand >= 0.75`, same-side `ForeArm <= 0.05`, at least 250 vertices, mean Hand weight `>= 0.95`, wrist distance `0.20–0.50` torso-height); imported Hand tails and guessed wrist offsets are explicitly outside the grip contract.
- a dominant-Head mesh silhouette (`Head >= 0.75`) plus freshly evaluated camera matrices for every arm, hand, blade, and crossguard clearance view; `Head.tail` is explicitly outside the visual contract.
- measured protected-body round-trip tolerances (`0.00002` position, `0.000001` sign-invariant quaternion, `0.0000002` in-memory basis) that cover Blender/glTF numeric quantization but not authored motion.
- exact cloud review geometry: 986×900 canvas, 36° vertical FOV, center camera `(2.8, 1.75, 4.2)` toward `(0, 0.95, 0)`, with side views snapped around the runtime sword focus.

## Verdict ledger

| Commit | Verdict | Preserved | Rejected because | Next bounded change |
|---|---|---|---|---|
| `fc2cbaba` | Rejected | Ground contact and coherent knee planes | Square vertical torso; centered roof over face; hiked shoulders; lateral-looking stance; weapon presented above body | Increase depth stagger and body turn; move hand cluster off center and down; keep elbows unequal |
| `c9150bea` | Rejected | Ground contact; coherent depth stagger in profile | Grip and blade still occupy the face plane; shoulders remain lifted; source is too small for reliable next-pass authorship | Add same-scale source and Crimson review angles before another pose edit |
| `ab616b2f` | Evidence gate passed | Pose unchanged from `c9150bea`; same-scale paired views now exist | Not a pose verdict | Freeze lower body and blade angle; repair the high-hand/low-elbow guard triangle |
| `fe15d7af` | Rejected | Grounded depth stagger; restrained body turn | Arms still obscure the face and the weapon grip is unreadable; the arm-target move was too small to produce a material visual change | Freeze the accepted lower body; replace transform nudges with explicit elbow and wrist projection |
| `9f783c96` | Rejected evidence repair | Crimson pose byte-for-byte unchanged from `fe15d7af` | Vanguard still hovers: frame evaluation overwrites transforms applied directly to animated imported roots | Ground source through a non-animated parent stage |
| `357b674d` | Rejected evidence repair | Crimson pose byte-for-byte unchanged from `fe15d7af`; stage transform persists | Whole-asset minimum Z is not the visible boot floor; unrelated imported geometry poisons the ground measurement | Measure only vertices weighted to mapped Vanguard foot bones |
| `8f67c891` | Rejected in CI | Crimson pose byte-for-byte unchanged from `fe15d7af` | Vanguard exposes no matching foot vertex groups for `FootFK_L/R`; render aborts before artifact creation | Fall back to evaluated mesh vertices spatially local to mapped foot bones |
| `480eb888` | Rejected baseline | Crimson pose byte-for-byte unchanged from `fe15d7af`; paired source/target sheet is legible; Vanguard and Crimson boots visibly contact the plane | Arms still obscure the face, hilt contact is unreadable, and repeated screenshots did not show a materially new pose | Keep this artifact only as the no-op comparison; do not hand it off again |
| `d5a26d45` | Rejected in authoring CI | Exact `480eb888` center/lower body; materially new arm silhouette; stable palm proxies; converged two-hand grip; sword visible; front and three-quarter face clearance pass | The right hand misses the shared comparison-camera face-clearance gate by about one pixel; committed placeholder parity is also intentionally red | Lower the authored two-hand guard target while preserving every accepted body and grip contract |
| `faf6e22e` | Blender gates passed; visual-pending | Exact `480eb888` center/lower body; materially lowered arms; readable face; converged two-hand grip; visible sword; all authored geometry gates pass | Browser candidate parity has not run because the committed candidate is still the intentional red placeholder | Commit only the exact generated candidate bytes, then require browser ID/pose/GLB/module/apply-proof parity before handoff |
| `87338ea7` | Rejected after exact browser parity | Exact authored candidate/GLB/module/application parity; accepted center/lower body; arms materially clear the face | Close browser views reveal the blade crossing the visor/plume and the guard sitting beside the wrist; the small contact sheet hid both defects | Replace proxy grip evidence with visible skinned hand geometry and gate blade/crossguard against the actual head silhouette |
| `76187af1` | Rejected in authoring CI | Exact accepted center/lower body; dominant-hand grip geometry and crossguard seating pass; fresh-camera mesh gates expose the true view state | Support-hand iteration stops before convergence; both gauntlets touch the head silhouette in the right profile; blade misses the head margin in primary/front/three-quarter/rear | Lower and extend the whole guard cluster while preserving the grip geometry; iterate support-hand pin to measured tolerance |
| `98d6387c` | Rejected on numeric grip margin | Exact accepted center/lower body; support pin converges; both Hand silhouettes, blade, and crossguard clear the dominant-Head silhouette in all six views; close renders are visually coherent | Crossguard surface gap evaluates one rounding unit below the unchanged `0.005` torso-height minimum because seating and validation use the same exact boundary | Keep the `0.005` gate; seat at `0.0055` torso-height and preserve full-precision measured guard extent |
| `e65f62b7` | Rejected before candidate binding | Exact accepted center/lower body; every authored mesh, grip, face, blade, support-pin, reach-reserve, and bend gate passes with numeric margin | Independent geometry audit catches the support elbow `0.099` torso-height above its wrist; the far-left grip makes the documented low-elbow triangle physically unattainable, but no gate rejects it | Shift the whole guard toward the support shoulder and require both final elbows at least `0.05` torso-height below their wrists |
| `7e349e22` | Rejected in authoring CI | Exact accepted center/lower body; right elbow reaches `0.060` torso-height below its wrist; support reach reserve improves to `0.271`; all face, blade/head, and protected-body gates pass | The three-step wrist correction exhausts its `105` degree cap before reaching the authored threat line, so the actual handle tilts down, drives the support wrist below the feasible low-elbow circle, and leaves only `0.0031` torso-height between the gauntlets | Converge the actual blade direction, raise the whole below-face guard into a feasible elbow circle, author a fresh low support pole, and seat the support surfaces with numeric margin |
| `3d6a57a9` | Blender gates and independent visual bind gate passed | Exact accepted center/lower body; exact authored blade direction; both elbows visibly low; support palm and separated hand surfaces own the handle; face, plume, blade, crossguard, reach, and protected-body gates all pass | The committed browser candidate is intentionally stale, so exact candidate and browser application parity have not run | Bind only the artifact's byte-identical `generated_candidate.js`, then require full Blender plus browser parity before any review handoff |
| `8e6c8e07` | Rejected for handoff; frozen for orientation calibration | Exact candidate ID, pose, module, channel application, stable joint positions, and seated two-hand grip | The center runtime screenshot still has the blade touching the plume and running tangent to the visor. Blender predicted blade direction `[0.875602, -0.470323, 0.110076]`; the browser rendered `[0.50903, 0.85413, 0.10653]`, proving the parented-sword basis was not portable. The legacy green checks certified a different picture. | Preserve this payload as the orientation specimen, then move frame-zero weapon/arm authorship and all three clearance cameras into the exact Three.js runtime with live hilt/tip parity |
| `ae8ea7dc` | Runtime and independent visual gates passed; user gate pending | Exact protected body and legs; runtime-native `RightHand` plus support-chain solve; 21-channel authored-GLB round-trip; exact committed module; center/left/right live endpoint parity; frozen orientation specimen remains drift-checked | No internal visual rejection: the blade clears plume and visor, both hands visibly own the handle, arms stay below the face, and all three views are distinct. This is still not user acceptance. | Hand off only the exact commit-pinned route and preserve this frame unchanged until the user verdict |
| pose `ab63161e` | Runtime geometry passed; browser visual verdict pending | Exact accepted body and legs; measured six-bone bilateral arm authoring; high staggered grip; opposed low elbows; shallow overhead blade line; full blade/guard/hand mesh clearances | Forearm segments intentionally frame the face aperture as Vanguard does, so only close browser pixels can decide whether the pose is recognizable and readable | Run exact browser parity, inspect center/left/right at full size, and bind no handoff unless the rendered performance reads as Vanguard |

Append a row for every pass. Never rewrite a rejection into a success because a later pass improved.

## Orientation archaeology

`8e6c8e07` is not accepted pose truth. It is frozen positional evidence with a known failing view. Its exact module bytes live at `src/review-candidates/crimson-frame-zero-8e6c8e07-orientation-specimen.js`, separate from the advancing review candidate. Use it to measure Crimson's own rig; do not copy Vanguard transforms and do not apply browser/glTF candidate quaternions directly to Blender `matrix_basis`.

The canonical probe is:

```bash
blender --background --python-exit-code 1 \
  --python tools/probe_crimson_bone_orientations_blender.py -- \
  --out-dir generated/crimson-orientation-ledger/latest

python3 tools/validate_crimson_orientation_ledger.py \
  generated/crimson-orientation-ledger/latest/crimson-bone-orientation-ledger.json
```

The probe reconstructs the frozen candidate through glTF import, freezes it, then applies `+5°` and `-5°` local X/Y/Z probes to each shoulder, upper arm, forearm, and hand. One multi-frame Blender export records the actual glTF response. The ledger keeps these authorities separate:

- measured: parent-relative rest basis, local aim axis, signed Blender-local to glTF-local axis mapping, positive rotation response, and skinned mesh influence;
- inferred: preferred elbow plane and bend-axis guidance from the calibration shoulder/elbow/wrist positions;
- preserved rejection: the browser-center blade/plume/visor collision;
- excluded: every Vanguard quaternion, endpoint, joint coordinate, and rest delta.

A future solver that crosses the Blender/glTF boundary must consume the measured ledger in this order: position target, pole guidance, measured bone basis, wrist roll, then visible-mesh weapon seating. The runtime-native frame-zero solver instead consumes the same rig truth directly from the loaded glTF bones and never assigns glTF locals as Blender `matrix_basis`. The ledger is guidance and a drift alarm, not permission to relabel the calibration pose as accepted.

The measured conversion law is deliberately explicit:

```text
glTF local = parent-relative rest × Blender matrix_basis
Blender matrix_basis = inverse(parent-relative rest) × glTF local
```

Signed local-axis deltas survive the export with an identity axis mapping to numerical tolerance. The old failure came from treating an absolute glTF local quaternion as a Blender `matrix_basis` quaternion and thereby omitting the parent-relative rest factor. Any future solver that crosses this boundary must use the measured composition law; direct assignment is a contract violation.

The measured ledger is committed at `public/assets/crimson/crimson-bone-orientation-ledger.json`. `tools/crimson_orientation_space.py` is the pure-Python conversion surface, and Crimson candidate application inside the Blender renderer uses the measured inverse formula. The committed ledger remains bound to candidate pose SHA `4db76a74...` and its rejected-for-handoff verdict.

CI re-measures the ledger and compares every stable rig field against the committed copy. Only per-run `createdAt` and probe-GLB container metadata are ignored. A changed bone basis, mesh influence, bend sign, conversion residual, candidate identity, or protected-body result leaves the orientation job red until the new rig truth is reviewed and deliberately committed.
