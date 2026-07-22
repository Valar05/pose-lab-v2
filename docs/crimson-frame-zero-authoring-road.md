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
2. Import and freeze the exact `480eb888` GLB pose as the body seed; do not reconstruct its center or legs.
3. Reset only both shoulder/arm chains, then project explicit Crimson-local elbow and wrist targets.
4. Render and inspect the empty-handed arm checkpoint before wrist roll or sword attachment.
5. Orient and seat the sword on a torso-scaled forearm-to-wrist palm proxy, then pin the matching left proxy to a body-scaled point on the actual oriented hilt-to-pommel segment. Never use this rig's malformed Hand tails as palm landmarks.
6. Push the pass. The `Crimson PR Visual Evidence` workflow authors the candidate in Blender.
7. Retrieve the `crimson-frame-zero-blender-<run-id>` artifact and inspect every same-camera old/new pair.
8. Commit the generated candidate only when all non-parity author gates pass and the arm silhouette is materially different.
9. Require the browser job to render that exact candidate ID, pose SHA, authored-GLB SHA, and module SHA after Blender parity passes.
10. Keep the candidate `visual-pending` until explicit human approval.

## Reproduction command

GitHub Actions executes the canonical render:

```bash
blender --background --python-exit-code 1 \
  --python tools/render_crimson_vanguard_attack1_compare_blender.py -- \
  --out-dir generated/crimson-frame-zero/<run-id> \
  --frames start \
  --candidate-js src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js \
  --candidate-id crimson-combat-ready-vanguard-frame0-4 \
  --author-frame-zero \
  --samples 16 \
  --width 1600 \
  --height 900

python3 tools/stitch_crimson_vanguard_attack1_compare.py \
  --manifest generated/crimson-frame-zero/<run-id>/manifest.json
```

Expected artifact contents:

- `01-start.png`: Vanguard and Crimson together.
- `01-start-reference-close-*.png`: five same-scale Vanguard reference views.
- `01-start-crimson-close-*.png`: five matching Crimson views.
- `contact_sheet.png`: two-column rejected/current pairs first, then the empty-handed checkpoint, shared comparison, and reference views.
- `manifest.json`: authored inputs, joint/foot diagnostics, hashes, and status.
- `authored_frame_zero.glb`: the exact one-frame Blender action.
- `empty_handed_arm_checkpoint.png`: the arm silhouette before wrist roll and sword attachment.
- `generated_candidate.js`: the exact browser candidate generated from the Blender-authored keyframe.
- same-camera `rejected-baseline` and `current` views: direct evidence that both wrists and elbows materially moved.

A handoff is invalid until the local file exists, opens successfully, and visibly contains the render.

## Visual gate

Inspect in this order:

1. Boots: heel and toe contact, sole upright, no hover.
2. Knees: each knee tracks into its own foot; no inward corkscrew.
3. Pelvis: restrained turn over the support polygon; no compensation twist.
4. Force line: rear foot → pelvis → trunk → hands.
5. Shoulders: clavicles remain quiet; upper arms do not manufacture a shrug.
6. Guard: hands form one off-center grip cluster; elbows are unequal and below the hands.
7. Face: readable from front and three-quarter views.
8. Weapon: hilt meets the weapon hand; blade clears helmet and body in both profiles.
9. Silhouette: Crimson expresses the same loaded sentence as Vanguard without copying his transforms.

## Protected working facts

Do not casually retune these after they pass:

- calibrated heel/toe/sole contact;
- preserved flat boot world orientation;
- keyed Hips translation needed for crouch depth;
- Blender glTF export as the browser-animation authority;
- explicit `visual-pending` acceptance state.
- center and lower-body local transforms captured before arm authoring.
- the rejected `480eb888` GLB hash `4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56` as the no-op baseline.
- exact protected Hips, center, head, and leg channels from `crimson-frame-zero-480eb888-protected-baseline.json`.
- a two-hand weapon contract: right palm on the hilt, left hand on the hilt-to-pommel segment, and both forearms clear of the face in the gated views.
- a `0.06` torso-height palm proxy advanced from each wrist along its solved forearm ray; imported Hand tails are explicitly outside the grip contract.
- measured protected-body round-trip tolerances (`0.00002` position, `0.000001` sign-invariant quaternion, `0.0000002` in-memory basis) that cover Blender/glTF numeric quantization but not authored motion.

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

Append a row for every pass. Never rewrite a rejection into a success because a later pass improved.
