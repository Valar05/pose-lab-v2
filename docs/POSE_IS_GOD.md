# Pose Is God

This is the fail-closed authoring and delivery contract for Pose Lab animation.
It exists because a correct offline render, a correct transport metric, and a
correct hosted animation are different claims.

## Authorities

Keep four records. Do not substitute one for another.

1. **Repository:** source revision, status, manifests, hashes, and accepted or
   rejected history.
2. **Authoring:** contact sheets or renders made from the final performing rig.
3. **Runtime:** the exact Pose Lab route, loaded assets, active clip, playback
   state, and weapon composition.
4. **Human:** the visible accept or reject verdict on that hosted route.

Only the human verdict may promote a candidate from quarantined to accepted.

## Choose one authoring lane

### Direct final-rig authoring

Use for ordinary poses and bespoke animation.

- Manipulate the final rig directly.
- Establish a readable key pose before adding secondary motion.
- Save the authored keys or action on that rig.
- Use a locked comparison camera and at least one orthogonal diagnostic view.
- Reject silhouette, balance, joint, contact, grip, and weapon-readability
  failures before export.

Do not write a generic procedural IK or coordinate solver merely to create one
pose. A solver is a separate product and requires its own request and tests.

### Retargeting

Use only when motion transfer is explicitly the task.

- Synchronize source and target rest bases.
- Project world-space endpoints and pole planes.
- Solve with target proportions and target joint semantics.
- Drive planted contacts before preserving source angles.
- Preserve target-specific foot, hand, head, and leaf-bone orientation.
- Judge the rendered target, not BVH round-trip or proxy fidelity.

### Appearance or sprite transfer

- Preserve accepted pose pixels, timing, and articulation.
- Apply only declared skinning or rigid whole-frame stabilization.
- Never repair motion by silently changing the accepted pose.

Do not switch lanes without recording the change.


## Sprite Sheet First — Pose Is God

For 2D sprite animation, the sprite sheet is the first visual/mechanical authority. Before changing runtime anchors, stage placement, timing, interpolation, deformation, presentation scale, or renderer code, inspect the canonical sheet itself.

**Required order of diagnosis:**

1. **Pose identity:** Is the correct authored pose/frame selected?
2. **Sprite-sheet geometry:** Are frame scale, crop, source bounds, ground line, and body center internally consistent in the sheet?
3. **Registration:** Only after the sheet is proven coherent, solve planted-foot/body anchors and stage placement.
4. **Timing/deformation:** Only after identity + sheet geometry + registration are correct, tune timing, squash/skew/rotation, effects, or interpolation.
5. **Runtime presentation:** Renderer or presentation-scale changes are last resort and must not compensate for a bad sheet.

A runtime defect that appears to be anchoring may actually be baked into the sheet. A frame that is independently resized, cropped, re-centered, or packed differently from its neighbors can make downstream anchor math look wrong even when the runtime is behaving exactly as configured.

**Never normalize frames independently when the source animation was authored at one shared character scale.** Preserve one shared scale for the animation family. If one source row is inconsistent, repair the row mechanically before adding compensating runtime offsets.

Human-visible review outranks numeric convenience. If a screenshot/video says two frames do not read as the same character scale or center, inspect the sheet before inventing another anchor correction.

## Weapon contract

Choose one:

- `embedded`: weapon is inside the delivered character asset; or
- `external`: one weapon is attached through one hierarchy and calibration; or
- `none`: the animation is intentionally weaponless.

Authoring and runtime must use the same mode, hierarchy, and calibration hash.
Do not preserve an imported sword base transform offline and replace it with a
browser calibration online. Do not embed and also attach a second weapon.

## Candidate workflow

1. Read repo truth and state the final rig, requested action, reference, weapon
   mode, camera, and acceptance target.
2. Author the smallest readable candidate in the correct lane.
3. Render the final rig with the declared weapon contract.
4. Inspect the locked contact sheet and orthogonal diagnostics. Reject locally
   visible failures.
5. Export one exact candidate and record its SHA-256.
6. Publish those exact bytes to an immutable or uniquely cache-busted route.
7. Load the exact Pose Lab route and record:
   - requested and active model;
   - requested and active clip;
   - playback state;
   - whether rest/fallback is active;
   - page, module, character, and weapon resource status;
   - hosted character SHA-256;
   - runtime weapon contract;
   - browser screenshot status.
8. Write a `pose-lab-v2-review-bundle-v1` manifest and run:

   ```sh
   node tools/verify_pose_review_bundle.mjs path/to/review-bundle.json
   ```

9. Lead the handoff with the Pose Lab V2 URL. Label the candidate quarantined
   and state any visual evidence limitation.
10. After explicit human acceptance, set `human.verdict` to `accepted` and run:

   ```sh
   node tools/verify_pose_review_bundle.mjs \
     path/to/review-bundle.json --promotion
   ```

Do not merge, promote, or alter accepted material before step 10 passes.

## Review bundle schema

Required shape:

```json
{
  "schema": "pose-lab-v2-review-bundle-v1",
  "status": "quarantined",
  "source": {
    "revision": "40-character commit SHA",
    "character": "Crimson",
    "action": "GuardIdle"
  },
  "authoring": {
    "lane": "direct-final-rig",
    "finalRig": true,
    "renderer": "Blender 4.4",
    "exportSha256": "64-character SHA-256",
    "evidence": {
      "lockedContactSheet": "artifact path or URL",
      "orthogonalView": "artifact path or URL"
    },
    "weapon": {
      "mode": "external",
      "hierarchy": ["RightHand", "SaberGrip", "ArborbladeSword"],
      "calibrationSha256": "64-character SHA-256"
    }
  },
  "runtime": {
    "url": "immutable Pose Lab URL containing the revision",
    "requestedModel": "crimson",
    "activeModel": "crimson",
    "requestedClip": "GuardIdle",
    "activeClip": "GuardIdle",
    "playbackActive": true,
    "fallbackRestActive": false,
    "hostedCharacterSha256": "same SHA-256 as authoring export",
    "resources": [
      {"role": "page", "url": "...", "status": 200},
      {"role": "module", "url": "...", "status": 200},
      {"role": "character", "url": "...", "status": 200},
      {"role": "weapon", "url": "...", "status": 200}
    ],
    "weapon": {
      "mode": "external",
      "hierarchy": ["RightHand", "SaberGrip", "ArborbladeSword"],
      "calibrationSha256": "same calibration SHA-256"
    },
    "visual": {
      "status": "browser-captured",
      "evidence": "screenshot path or URL"
    }
  },
  "human": {
    "verdict": "pending",
    "evidence": null
  }
}
```

For a weaponless action, use `"mode": "none"`, an empty hierarchy, and
`calibrationSha256: null` in both surfaces. If WebGL cannot render in the
automation browser, use runtime visual status `user-pending`; the bundle may be
handed off but must not be described as visually green.

## Hard stops

Do not hand off when:

- the requested clip is missing or not the active clip;
- a separate state system reports rest/fallback;
- any required resource is not HTTP 200;
- hosted and inspected character hashes differ;
- weapon modes, hierarchies, or calibration hashes differ;
- the authoring render and runtime compose different assets;
- the review URL is mutable and not uniquely cache-busted.

Do not promote when the human verdict is not explicitly `accepted`.

## Sprite-sheet production lane
When working with authored 2D sprite/contact sheets, the original authored sheet is the source authority. Shrink the source before inference/measurement, use one shared scale for a regular sheet, preserve source order and cell geometry, and never normalize each frame independently. Atlas cells are containers: grow the atlas instead of clipping or shrinking useful poses. Preserve the established body/ground anchor. Cleanup must distinguish phantom fragments from legitimate separated geometry; use explicit masks when needed. Prefer corpus inclusion over premature dedupe. Generated derivatives, screenshots, and review GIFs are not mechanical source when the original exists.


## Contact-sheet authoring discipline — 2026-09-27
For pose selection, the requested review artifact is itself part of the authoring contract.

- If the task is to build a contact sheet for a proposed animation, select the intended poses first, then build the sheet from those poses. An exhaustive source dump is provenance, not the requested animation contact sheet.
- Use the highest-detail available source for the selected poses. Do not intentionally downrez a reference before generation or human review.
- A user-supplied screenshot can be review authority when explicitly requested, even though it is not mechanical extraction authority.
- Deliver the visible artifact before explaining process when the artifact can already be produced.
- Do not require the user to shuttle an artifact through another tool or device merely to return it to the assistant.
- Preserve meaningful micro-variation in a growing pose ledger. Similar-looking poses may encode different hand, chest, weapon, shield, timing, or silhouette reads and should not be removed solely for deduplication.


## Lightweight action-reference lane — 2026-09-27
For direct pose selection and ImageGen-reference preparation, use the smallest authoring surface that preserves source truth.

- Render only the named action.
- Render only the selected authored keyframes when the desired subset is already known.
- Render one full-resolution beauty PNG per selected frame. Do not produce forensic passes unless a later diagnostic explicitly needs them.
- Keep the final curated contact sheet small: assemble selected full-resolution frames directly, without resizing or thumbnail extraction.
- A large overview sheet may help select frame identities, but it must never replace the original full-resolution frame renders in the final reference artifact.
- If transport downsampling is observed, reduce the number of frames/actions per artifact rather than reducing source resolution.


### High-resolution curation order — 2026-09-27
When the purpose of rendering is to decide which poses to keep:
1. render every authored keyframe for the named action at the requested native review resolution;
2. preserve each frame as an individual beauty PNG;
3. paginate those originals into small review sheets without resizing;
4. inspect those pages;
5. choose the final small pose set;
6. assemble the final ImageGen reference from the original selected PNGs.

Do not preselect the final frame set from a downsampled overview and then call the later rerender a curation pass.


## Appearance consistency gate — 2026-09-27
Before ImageGen is used for a sprite animation, freeze two separate authorities:

1. **Pose authority:** the selected native/full-resolution pose frames.
2. **Appearance authority:** the exact approved character reference set.

The appearance set must visibly establish every identity-critical feature that needs to remain stable across the animation. For a weapon-and-shield character, that normally includes:
- body/armor silhouette;
- helmet/head silhouette;
- weapon construction and proportions;
- shield construction and motif;
- which side owns the weapon and shield;
- primary material and color language.

A single hero plate is sufficient only when those properties are visibly unambiguous. If one of them is obscured or ambiguous, add the smallest dedicated reference needed before generation.

Generation order:
1. freeze selected pose frames;
2. freeze appearance authority set;
3. state identity locks;
4. generate all frames from the same frozen packet;
5. review the whole generated set side-by-side for drift;
6. reject drifted frames and retry from the original packet;
7. never use a generated frame as the reference for another frame.

The goal is not maximum reference count. The goal is enough visual authority to prevent model drift before it starts.


## Four-pose textured reference lane — 2026-09-27
For ImageGen sprite-reference preparation:
1. render the complete named action as textured/material beauty frames when the pose subset is not already known;
2. inspect the full-detail renders;
3. choose four poses by default, favoring distinct motion information;
4. include idle only when that specific animation actually needs it;
5. assemble the final sheet from the original selected renders.

The candidate render count and the final contact-sheet pose count are separate concerns. Rendering many candidate frames is allowed; the final reference should remain concise.
