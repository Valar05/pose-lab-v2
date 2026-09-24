# Manual Test Prompt — Vanguard Undercut Procedural Recipe

FORTRESS ONLINE. EXECUTE, DO NOT REDESIGN.

MISSION

Prove the new Pose Lab V2 procedural recipe machinery by reproducing the approved Vanguard undercut from one declarative recipe.

REPOSITORY

Valar05/pose-lab-v2

AUTHORITATIVE RECIPE

animations/candidates/vanguard/undercut/recipe.json

RENDERER

tools/render_motion_recipe.py

INPUTS

I will provide/attach these exact source images:

1. Vanguard idle
2. Vanguard Attack 1 chamber
3. Vanguard Attack 1 commit
4. Vanguard Attack 1 pre-impact
5. Vanguard Attack 1 contact
6. Diorama slash_right key

Do not redraw, regenerate, reinterpret, rotate, replace, or invent any body pose.

Save the supplied files to the exact recipe asset paths:

animations/candidates/vanguard/undercut/assets/vanguard_idle.png
animations/candidates/vanguard/undercut/assets/vanguard_attack1_chamber.png
animations/candidates/vanguard/undercut/assets/vanguard_attack1_commit.png
animations/candidates/vanguard/undercut/assets/vanguard_attack1_preimpact.png
animations/candidates/vanguard/undercut/assets/vanguard_attack1_contact.png
animations/candidates/vanguard/undercut/assets/slash_right.png

Then run exactly:

npm run motion:render -- animations/candidates/vanguard/undercut/recipe.json

REQUIRED OUTPUTS

animations/candidates/vanguard/undercut/generated/preview.gif
animations/candidates/vanguard/undercut/generated/strip.png
animations/candidates/vanguard/undercut/generated/recipe-resolved.json

MOTION CONTRACT

- No root motion.
- Rear planted foot stays pinned.
- Idle -> lean-back anticipation -> chamber -> commit -> strong forward contact.
- Contact uses the strongest forward shear.
- Contact holds long enough to read.
- No authored recovery frame may be introduced.
- Recoil must be derived procedurally from the contact pose.
- Full animation returns to Idle.
- Slash is independent of body animation.
- Slash orientation and screen placement stay fixed.
- Slash reveals clockwise from approximately 10:00 to 5:00.
- Slash reaches maximum brightness/open state only briefly.
- Tight emissive glow peaks at contact.
- Core burns off before the wider glow haze.
- Slash luminance map controls the fade.

EVIDENCE

Show me the generated GIF and strip. Report the resolved recipe path and source hashes. Do not claim success from tests alone. Human-visible animation is the acceptance surface.

If anything fails, stop at the failing boundary and report exactly what failed. Do not substitute a different pose, animation, viewer, renderer, or architecture.
