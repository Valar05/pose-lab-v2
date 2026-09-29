# Obsidian / LionheartLancer Sprite Bounty — Continuation Packet

Status: **ACTIVE, CONTINUATION SAVED 2026-09-28**

This document is the restart point for the Obsidian sprite campaign. Read it after the normal Pose Lab sticky boot. Do not reconstruct the workflow from chat memory.

## Immediate continuation point

The completed low-resolution bounty cleanup was explicitly accepted by Drew as **"Perfect!"**.

Next unfinished action: **Heavy1** from the LionheartLancer donor.

Heavy1 has not yet been visually reviewed in the current continuation. The repo-owned Blender runner and textured action renderer were repaired before this save, but the Heavy1 render still needs to be executed and reviewed after the local/remote merge.

Current Git landmarks:

- local archaeology commit: `110b8bc9e89dff4d7c3abb29acf9912280f000ab` — `all th3 shit`
- merged local + origin/main: `09522be83f5a7ca3b6a5eb4c2375f7d2f6e4a4c2`
- repo Blender runner path-translation repair entered main before that merge through `3e594a29bd4988e5e53daacb4a23ae1d54ad0780`
- action renderer base-color review repair entered main through `df7a67304db7b778975502877f8484f2140070ff`

Do not delete suspicious local archaeology merely because filenames look strange. The root files `2`, `Air`, `Jump`, `Land`, and `Mid-Air` were deliberately left untouched and captured in Git.

## Character / appearance authority

Character: **Obsidian**, a same-height playable peer to Vanguard.

Appearance lock:

- black / dark-red gothic armor
- red fleshy cable language
- spiked helmet
- black/red cape
- blackened-brass / scorched-gold / clotted-red lion shield with internal glow
- grotesquely oversized red mechanical lance
- the lance is an intentionally impossible horizontal event, not a reason to make the body taller

The approved hero plate is appearance authority. Pose images are pose authority. A generated sprite is never promoted into appearance authority merely because it looks good.

### Identity rule

Vanguard and Obsidian have the same intended body height. The lance makes Obsidian **wider**, not taller. Weapon, cape, and VFX overflow may grow the canvas.

## Donor source

Original Blender source:

`/storage/emulated/0/Download/LionheartLancer.blend`

Working GLB used for action review:

`$HOME/.local/state/pose-lab-v2-lionheart-lancer/worktree/public/assets/lionheart-lancer/LionheartLancer.glb`

Known source actions:

- Cast
- Heavy1
- Heavy2
- Heavy3
- Idle
- Kick
- Light1
- Light2
- Light3
- SpringAttack
- Stomp

GLB names resolve with `_Armature`, for example `Light3_Armature` and `Heavy1_Armature`.

Interpretation already established:

- Light1: mostly arm movement
- Light3: materially greater chest / torso engagement and full-body rotation
- Heavy1 and Heavy2: shield attacks
- Kick / Stomp / SpringAttack are separate useful donors
- hand and wrist orientation materially change the weapon read

## Repo-owned review lane

Do **not** create another one-off downloaded Blender script.

Use:

- `scripts/run-blender-tool.mjs`
- `tools/render_selected_action_beauty.py`

The runner owns Debian/proot Blender invocation and host-to-guest path translation. The renderer owns action resolution, authored-key enumeration, one locked camera, root-motion suppression, PNG output, and manifest output.

The canonical review lane is **Eevee 1-sample, unlit base-color only**. `tools/render_selected_action_beauty.py` must set `scene.eevee.taa_render_samples = 1` (and disable shadows/ray tracing) because the materials are converted to emission for pose review. Do not regress to default 64-sample Eevee: that is the known slow lane. Canonical render policy: `eevee1-unlit-base-color-only-all-authored-keyframes`.

### Heavy1 next command

Run from the current repo checkout after confirming it contains the merged runner:

```sh
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2

node scripts/run-blender-tool.mjs \
  tools/render_selected_action_beauty.py -- \
  --asset "$HOME/.local/state/pose-lab-v2-lionheart-lancer/worktree/public/assets/lionheart-lancer/LionheartLancer.glb" \
  --action Heavy1 \
  --out-dir "/storage/emulated/0/Download/LionheartHeavy1Review" \
  --all-keyframes \
  --camera-side left \
  --width 512 \
  --height 512
```

If it fails, diagnose the exact repo runner / proot path first. Do not redesign the rendering lane.

## Completed action-reference curation

Render every authored keyframe first, preserve individual 512x512 textured frames, then choose a concise four-pose reference. Do not preselect from a tiny overview.

Selections already used:

- **Light1:** k00, k02, k05, k23
- **Light2:** k03, k07, k20, k24
- **Light3:** k04, k09, k24, k32

Idle is not mandatory. Four distinct motion-bearing poses are normally more useful.

## Light3 / back-view lesson

The crucial Light3 failure was repeatedly turning a genuine back / rear-quarter donor pose toward the camera.

The source second attack pose commits the **whole body**:

- feet
- knees
- hips
- pelvis
- spine
- shoulders
- head
- shield plane
- lance line

The pelvis is first-class pose authority. A correct lance vector on a front-facing pelvis is still wrong.

Do not recover the face. Do not rotate the chest toward camera for presentation. Back armor, rear hip, cape root, rear shoulder, and backside silhouette are legitimate identity surfaces.

This failure produced the repo rules BACK-VIEW-AUTHORITY, WHOLE-BODY-ROTATION, PELVIS-IS-POSE-AUTHORITY, REAR-PLANE-PRESERVATION, NO-FACE-RECOVERY, SILHOUETTE-BEATS-PRESENTATION, and LOCAL-EDIT-ONLY.

## Sprite-generation packet

When producing an Obsidian sprite sheet from a donor action:

1. Render the complete named donor action in textured/base-color beauty.
2. Inspect the full-detail frames.
3. Choose four genuinely distinct pose authorities.
4. Freeze the Obsidian hero plate as appearance authority.
5. State identity locks: armor silhouette, helmet, lance construction/proportion, lion shield, hand ownership, cape, material/color language.
6. Generate the four sprite frames from the **same frozen appearance + pose packet**.
7. Review all four side by side for drift.
8. Retry a failed frame from the original frozen packet. Never use a generated frame as the reference for the next generated frame.
9. If one frame alone is wrong, use a local edit on that frame only. All other accepted pixels are locked.
10. Keep useful extra poses. This campaign explicitly prefers a **pose bounty instead of courting scarcity**.

The exaggerated 2D silhouettes are desirable. Do not dilute them merely because a 3D version would be physically awkward.

## Frozen generated pose bounty

The high-resolution generated sheets used for consolidation were:

| Source | SHA-256 |
| --- | --- |
| `929095.png` | `0801181bca913d1fc736e3f5272389df610699a68f5ab17eca0a02b0d5348ce6` |
| `929093.png` | `7a9676807acaf1312d00cb17de7f5bfece18d7c4a54b3239a880a3b043ff4d61` |
| `929092.png` | `3c8d4c1a185518e077c010011f442625054f8df1d28bfc5965e8701d3b9af45a` |
| `929023.png` | `c30fea8f5b28240ce535c145dec7ddc51e88b9a206bc8e1efca90eb66f49fa2d` |
| `929020.png` | `56d10ef4513cc14bd82e6bfd1989bf423a11c47057df04cb020e7278cd0c7c85` |
| `929097.png` single corrected rear/full-rotation pose | `c4481114983a78023adadf106583f6027a5570b0ef757855069a298ed18924ec` |

These are **generated derivative sources**, not the original Lionheart mechanical authority.

## Consolidation lessons

Several automatic consolidation attempts failed. Preserve the reason, not just the outcome.

### Failure: square / quadrant cropping

Naive 2x2 quadrant extraction clipped long lances and sometimes captured pieces of neighboring sprites.

Correct lesson: sprite cleanup is **lasso / mask / eraser work**, not merely choosing a better rectangle. Detached legitimate lance/cape/glow pixels must remain with the owning sprite. Neighbor contamination must be erased by silhouette-aware masks.

### Failure: mechanical scale normalization

Automatic per-pose sizing and later per-sheet sizing both produced visibly inconsistent character scale.

For regular authored animation sheets, obey ONE-SCALE and the long-weapon contract.

For this **generated bounty**, the source generations themselves contain scale drift. Human visual review is authority. If one derived bounty sprite is visibly oversized after consolidation, repair that exact derived sprite locally rather than inventing another global normalization pass.

Do not generalize this exception back onto regular authored sheets.

## ACCEPTED LOW-RES CLEANUP

Accepted input stitch:

- `929116.png`
- SHA-256: `da348a4e1179aa8fd5e25050f85fadb7088d8ec7610db40caf501ca565c83395`

Accepted cleaned output:

- `obsidian_lowres_stitch_cleaned_v1.png`
- SHA-256: `245adbc39d5dfe358276e9f6c10861678e6ceac15cb30389893da6fdaaa25a39`

Drew's verdict on this exact result: **"Perfect!"**

The successful repair was deliberately local:

### Right-hand contamination cleanup

Two detached neighboring-sprite fragments were erased with their actual connected-pixel masks:

- bbox `(959, 934, 979, 972)`, area 452 pixels
- bbox `(959, 972, 979, 996)`, area 300 pixels

Threshold used for foreground detection: max RGB > 25.

This was not a square crop. The removal used the exact connected components as an eraser mask.

### Oversized bottom-left sprite

Original local foreground bbox:

`(28, 1366, 323, 1510)`

Original crop size:

`295 x 144`

Only this sprite was resized.

Target height:

`117 px`

Resulting size:

`240 x 117`

Placement in the final atlas:

`(55, 1349)`

Nominal bottom-left cell used for centering:

- x: 0..350
- y: 1280..1536

Resampler:

`PIL.Image.Resampling.BOX`

Black remained transparent-by-convention during masked paste. No other sprite was regenerated or rescaled.

The exact reproducible cleanup is saved in:

`tools/campaigns/obsidian_sprite_cleanup_exact.py`

That script verifies the accepted input SHA before touching pixels and verifies the accepted output SHA after writing.

## What not to do on restart

- Do not regenerate already accepted Obsidian sprites to "make them consistent".
- Do not use another generated frame as appearance authority.
- Do not turn back/rear-quarter poses toward camera.
- Do not normalize long-weapon sprites from full bounds.
- Do not shrink Obsidian because the lance is large.
- Do not auto-square-crop sprites with long weapons.
- Do not rerun global extraction/normalization to fix one bad cell.
- Do not delete near-duplicate useful poses simply to make a small atlas.
- Do not create another throwaway Blender handoff script.
- Do not bypass `scripts/run-blender-tool.mjs`.
- Do not delete odd repo archaeology without proving it is junk.

## Restart checklist

1. Sticky boot: AGENTS + campaign rules + Pose Is God + this contract/doc.
2. Verify repo HEAD and working-tree status.
3. Treat accepted low-res cleanup hash above as locked visual evidence.
4. Continue with **Heavy1** through the repo-owned textured action review lane.
5. Render all authored Heavy1 keys.
6. Review native/full-resolution frames.
7. Pick four distinct Heavy1 pose authorities.
8. Reuse the frozen Obsidian appearance authority.
9. Generate one four-pose sheet, review for identity/back-view/weapon drift.
10. Keep useful resulting poses in the bounty.
11. Only after human acceptance, consolidate/down-res with the established body-height and manual-cleanup discipline.

## 2026-09-28 Heavy1 acceptance and Heavy2 handoff

Heavy1 was completed after repeated strict pose-transfer correction. Drew explicitly accepted the final single-frame Obsidian result with: **"You beautiful ritsu crab bastard. You did it."**

Final accepted Heavy1 local artifact in this ChatGPT session:

- `/mnt/data/obsidian_knight_s_crimson_lance.png`
- accepted behavior: exact Lionheart donor pose transfer, rear-facing orientation preserved, lance adjusted, back heel adjusted, Obsidian appearance retained

Heavy1 lessons to preserve as hard gates:

- reread Pose Lab sticky-boot rules before every mutation
- donor pose and Obsidian appearance are separate frozen authorities
- pelvis/lower-body direction is first-class pose authority
- preserve facing, handedness, shield side, weapon side, heel/foot orientation, and shoulder anatomy
- do not recover the face on rear-facing poses
- do not use generated derivatives as appearance authority
- when a frame is close, prefer local edit/inpaint over whole-frame regeneration
- one requested animation/frame means one output, not a contact sheet or four variants

Next action: **Heavy2**. Same pipeline, new donor action.

Canonical Heavy2 campaign script: `generated/obsidian-lionheart/run-heavy2-contact-review.sh`.

Heavy2 must use the **fast EEVEE1** lane. The campaign rejects reusable manifests unless `renderPolicy == "eevee1-unlit-base-color-only-all-authored-keyframes"` and `eeveeRenderSamples == 1`. Existing slow/default-sample Heavy2 frames are not valid reuse evidence. Render every authored Heavy2 keyframe from the LionheartLancer GLB, build paginated 2x2 contact sheets for human review, choose distinct motion-bearing authorities with no automatic idle preference, then generate Obsidian only after pose selection.

Heavy2 launch note: an initial Home Center -> Phone Hands launch attempt on 2026-09-28 timed out during the bounded command before successful launch evidence was returned. Do not treat Heavy2 as rendered or complete until a phone receipt proves the render/contact-sheet campaign completed.
