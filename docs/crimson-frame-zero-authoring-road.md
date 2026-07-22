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
2. Change only one named composition relationship per pass.
3. Push the pass. The `Crimson PR Visual Evidence` workflow runs Blender.
4. Retrieve the `crimson-frame-zero-blender-<run-id>` artifact.
5. Open `contact_sheet.png` and all source PNGs locally.
6. Record the visual verdict below before changing another variable.
7. Only after Blender survives review, export the exact keyed GLB and test browser parity.
8. Keep the candidate `visual-pending` until explicit human approval.

## Reproduction command

GitHub Actions executes the canonical render:

```bash
blender --background --python-exit-code 1 \
  --python tools/render_crimson_vanguard_attack1_compare_blender.py -- \
  --out-dir generated/crimson-frame-zero/<run-id> \
  --frames start \
  --candidate-js src/review-candidates/crimson-combat-ready-vanguard-frame0-3.js \
  --candidate-id crimson-combat-ready-vanguard-frame0-3 \
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
- `contact_sheet.png`: the shared comparison plus all ten close views, large enough to inspect.
- `manifest.json`: authored inputs, joint/foot diagnostics, hashes, and status.
- `authored_frame_zero.glb`: the exact one-frame Blender action.

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

## Verdict ledger

| Commit | Verdict | Preserved | Rejected because | Next bounded change |
|---|---|---|---|---|
| `fc2cbaba` | Rejected | Ground contact and coherent knee planes | Square vertical torso; centered roof over face; hiked shoulders; lateral-looking stance; weapon presented above body | Increase depth stagger and body turn; move hand cluster off center and down; keep elbows unequal |
| `c9150bea` | Rejected | Ground contact; coherent depth stagger in profile | Grip and blade still occupy the face plane; shoulders remain lifted; source is too small for reliable next-pass authorship | Add same-scale source and Crimson review angles before another pose edit |
| `ab616b2f` | Evidence gate passed | Pose unchanged from `c9150bea`; same-scale paired views now exist | Not a pose verdict | Freeze lower body and blade angle; repair the high-hand/low-elbow guard triangle |
| `fe15d7af` | Agent visual gate passed; still unaccepted | Grounded depth stagger; restrained body turn; above-brow off-center grip; low unequal elbows; face and helmet clear in target views | Vanguard reference views hover because source grounding used animation time zero instead of the rendered start sample | Freeze Crimson pose; correct source evidence timing only |
| `9f783c96` | Rejected evidence repair | Crimson pose byte-for-byte unchanged from `fe15d7af` | Vanguard still hovers: frame evaluation overwrites transforms applied directly to animated imported roots | Ground source through a non-animated parent stage |
| `357b674d` | Rejected evidence repair | Crimson pose byte-for-byte unchanged from `fe15d7af`; stage transform persists | Whole-asset minimum Z is not the visible boot floor; unrelated imported geometry poisons the ground measurement | Measure only vertices weighted to mapped Vanguard foot bones |
| `8f67c891` | Rejected in CI | Crimson pose byte-for-byte unchanged from `fe15d7af` | Vanguard exposes no matching foot vertex groups for `FootFK_L/R`; render aborts before artifact creation | Fall back to evaluated mesh vertices spatially local to mapped foot bones |
| `480eb888` | Pending evidence | Crimson pose byte-for-byte unchanged from `fe15d7af` | Awaiting unweighted-rig ground proof | Inspect paired sheet and confirm source boots contact the plane |

Append a row for every pass. Never rewrite a rejection into a success because a later pass improved.
