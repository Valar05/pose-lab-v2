# Vanguard Undercut Procedural Proof

This directory is the first end-to-end proof of Pose Lab V2 procedural sparse-sprite attack rendering.

The recipe is authoritative. Source images are immutable inputs. The renderer may deform, pin, composite, reveal, glow and time those sources, but it may not invent or redraw a body pose.

## Required assets

Place these exact source images under `assets/`:

- `vanguard_idle.png`
- `vanguard_attack1_chamber.png`
- `vanguard_attack1_commit.png`
- `vanguard_attack1_preimpact.png`
- `vanguard_attack1_contact.png`
- `slash_right.png`

The body anchors should be the approved Vanguard frames. `slash_right.png` should be the grayscale/white Diorama slash key on black.

## One-command render

From the Pose Lab V2 repository root:

```sh
npm run motion:render -- animations/candidates/vanguard/undercut/recipe.json
```

Outputs:

```text
animations/candidates/vanguard/undercut/generated/preview.gif
animations/candidates/vanguard/undercut/generated/strip.png
animations/candidates/vanguard/undercut/generated/recipe-resolved.json
```

## Contract

- no root motion;
- rear foot is the deformation pivot;
- body source art is immutable;
- contact has the strongest forward shear;
- recovery uses the contact pose procedurally, not a new recovery drawing;
- motion resolves back to Idle;
- slash is a separate fixed-orientation overlay;
- slash uses angular reveal, emissive glow, luminance-driven burnoff.

If this recipe cannot reproduce the approved undercut, fix the renderer/recipe. Do not silently add a new pose.
