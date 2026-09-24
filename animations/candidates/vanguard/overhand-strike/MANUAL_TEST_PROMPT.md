# Manual Test Prompt — Vanguard Atlas-Driven Overhand Strike

FORTRESS ONLINE. EXECUTE, DO NOT REDESIGN.

MISSION

Prove the Pose Lab V2 procedural motion renderer by rebuilding the Vanguard overhand-strike directly from the existing Vanguard sprite atlas.

NO BODY IMAGE ATTACHMENTS ARE REQUIRED OR ALLOWED.

REPOSITORY

Valar05/pose-lab-v2

AUTHORITATIVE RECIPE

animations/candidates/vanguard/overhand-strike/recipe.json

BODY AUTHORITY

authoring/vanguard-procedural/source/vanguard-pose-atlas-48.png

The recipe resolves these 1-based, row-major atlas cells itself:

- idle: 2
- chamber: 26
- commit: 40
- preimpact: 32
- contact: 35

Do not extract or save those cells as new source PNGs. The renderer must crop them directly from the atlas at runtime.

SLASH AUTHORITY

Use the existing phone asset:

/storage/emulated/0/Download/Diorama-Slash-Keys/slash_right.png

Do not rotate or translate the slash during the animation. Its position/orientation are fixed by the recipe; only reveal/glow/fade change.

RUN

From the Pose Lab V2 repository root:

npm run motion:render -- animations/candidates/vanguard/overhand-strike/recipe.json

REQUIRED OUTPUTS

animations/candidates/vanguard/overhand-strike/generated/preview.gif
animations/candidates/vanguard/overhand-strike/generated/strip.png
animations/candidates/vanguard/overhand-strike/generated/recipe-resolved.json

MOTION CONTRACT

- No root motion.
- Rear planted foot stays pinned.
- Body source frames come only from the atlas cells named above.
- Idle -> lean-back anticipation -> chamber -> commit -> strong forward contact.
- Contact uses the strongest forward skew.
- Contact holds long enough to read.
- No authored recovery frame.
- Recoil derives procedurally from the contact atlas cell.
- Full animation returns to atlas Idle.
- Slash is independent from body motion.
- Slash fixed orientation/placement.
- Clockwise reveal about 10:00 -> 5:00.
- Brief full-open emissive peak.
- Core fades before wide glow haze.
- Luminance controls the slash burnoff.

EVIDENCE

Show the generated GIF and strip.
Report the resolved atlas hash and cell references.
Human-visible animation is acceptance.
Do not substitute loose body PNGs or ask me to upload body frames.


## Atlas identity lock

The required Vanguard atlas is exactly 1536x1170 with SHA-256:

`0f6183b8cfa516388ec62b70b79773037c3bfe21576ae9bc0a52510eac8a4420`

Any other image must fail closed.
