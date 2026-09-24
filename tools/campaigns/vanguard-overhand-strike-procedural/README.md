# Vanguard Overhand Strike Procedural Script Campaign

This campaign removes the handoff gap between the atlas-driven recipe and a human-visible result on the phone.

## One job

Render the first golden procedural Vanguard attack directly from the canonical pose atlas and the existing Diorama slash key, verify the resolved recipe, and deliver the review artifacts to Android Downloads.

## Authority

- Recipe: `animations/candidates/vanguard/overhand-strike/recipe.json`
- Vanguard atlas: `public/assets/vanguard/fleshpunk/canon/Vanguard_Canonical_Character_and_Pose_Sheet_2026-07-30.png`
- Slash key: `/storage/emulated/0/Download/Diorama-Slash-Keys/slash_right.png`
- Renderer: `tools/render_motion_recipe.py`

No body-image attachments or manually extracted atlas cells belong in this lane.

## Run

From the Pose Lab V2 checkout:

```sh
bash tools/campaigns/vanguard-overhand-strike-procedural/01_run.sh
```

## What the script does

1. Verifies the recipe, canonical Vanguard atlas, slash key, Python, npm, Pillow and NumPy.
2. Runs `npm run motion:validate`.
3. Runs the single-command procedural renderer.
4. Requires `preview.gif`, `strip.png`, and `recipe-resolved.json`.
5. Verifies no root motion and verifies that atlas hashes were recorded.
6. Copies all three artifacts to `/storage/emulated/0/Download/Vanguard-Overhand Strike-Procedural/`.
7. Refreshes Android media indexing when available.
8. Saves the complete console log in Downloads and copies that log to the Android clipboard on every exit.

## Success receipt

```text
VANGUARD_OVERHAND_STRIKE_PROCEDURAL_OK
```

Tests and hashes are guardrails. The delivered GIF remains the human-visible acceptance surface.
