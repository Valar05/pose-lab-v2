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
