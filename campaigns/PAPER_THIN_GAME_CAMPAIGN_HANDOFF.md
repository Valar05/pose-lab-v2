# PAPER THIN — GAME CAMPAIGN HANDOFF
**Canonical, obvious entry point for resuming the Paper Thin game.**  
Updated: 2026-10-23. Status: pre-game animation campaign / transition to implementation.  
This is a durable handoff, not a claim that all animations are accepted.

## First read / authority
Read in order:
1. `AGENTS.md`
2. `docs/POSE_IS_GOD.md`
3. `docs/POSE_LAB_CAMPAIGN_RULES.md` (including the Paper Thin / Connie lessons)
4. `docs/POSE_CAMPAIGN_FRAMEWORK.md`
5. `doctrine/animation/sparse_sprite_motion_v1.json`
6. `campaigns/connie-paper-motion-20261021.contract.json`
7. This document.
Inspect actual current branch, commits, deployed page, and source image before touching animation. No guesswork. Human visual verdict is authoritative.

## Mission and status
The user said Connie's sprite work was nearly ready to move into making **Paper Thin**, with a few motion tweaks remaining. Do not invent game design, mechanics, platform, or scope not yet explicitly agreed. Next phase is to establish a game implementation campaign, but preserve sprite/animation decisions and finish named corrections first.

### Assets and identity
- Repo: `Valar05/pose-lab-v2`.
- Active campaign branch: `campaign/connie-paper-motion-20261021`.
- Canonical original approved composite: `public/assets/connie/connie-approved-composite.png`, 1536×1294, SHA-256 `1862aaa232426324cb9c698c878411922b7e8bcd649ff042dd5a8a870265abe3`. Black background with extracted foreground masking. **Immutable unless explicitly unlocked.**
- Rects and visible bounds: `src/motion/connie-profiles.js`.
- Native Motion Profile Lab renderer: `src/motion-profile-editor.js`.
- Review route: `https://valar05.github.io/pose-lab-v2/review/connie-motion/motion.html?character=connie&rev=<commit>`. Check exact deployed pin in `.github/workflows/pages.yml`.
- Vanguard reference: `src/procedural-run-preview.js` and `public/assets/vanguard/procedural/run.recipe.json`; Vanguard run uses weighted authored poses, eased per-pose signed shear, registration, no root motion, and zero generic bob. Do not approximate it with vertical bouncing or per-pixel liquid legs.
- An image-generation pass attempted to add an actual arm to Connie's idle. The generated sprite sheet is **not** established as the approved canonical source or committed repo asset. Preserve the existing source until human acceptance of the arm edit; avoid overwriting all other poses.

## Human verdicts, precisely separated
- **Accepted / positive feedback:** Correcting ~30% x-axis squash improved appearance; idle motion was liked; after several failed blink attempts, the visible-eye blink was reported working; directional squash/rebound on aerial was described as looking all right. Preserve these while fixing unrelated issues.
- **Rejected:** Generic up/down run bounce, jagged/liquid leg pixel deformation, a jarring run-loop stop/doubled endpoint frame, rotating the human/aerial spin_1 sprite, too-long idle/static spin hold, flat excessive rotation speed through transformation, incorrect eye/hair deformation in earlier iterations, any scaling on spin_2 or pinwheel.
- **Still requires visual verdict:** Current run continuity, exact Vanguard-inspired deformation, dash rotation speed envelope, spin_1-only shrink/grow, seamless human-to-pinwheel silhouette transition, and arm addition to idle. Code presence/build/deploy is not approval.

## Exact animation intent
### Idle
One canonical idle pose with gentle procedural motion. Eye closes by *localized deformation of the visible eye*; never warp hair or enlarge the far eye. Preserve working blink and liked idle unless explicitly requested.

### Run
Original authored poses run_1, run_2, run_3; conceptual loop `1→2→3→2→1`. **The last 1 is the loop boundary, not an extra held keyframe**: do not repeat/dwell on 1 at both start and end. Preserve authored pose pixels. Adapt Vanguard's actual procedural timing/deformation semantics rather than fake it with a y-axis bounce, whole-character pop, or scanline-liquid leg motion. Avoid root motion. Inspect exact boundary timestamps and phase interpolation.

### Aerial
Three authored aerial poses. Directional squash along kick vector, followed by release/stretch into rebound, **not** periodic heartbeat pulsing. Last human verdict: looks all right; preserve.

### Dash spin / transformation
- The first and last pose is **spin_1**, the authored crouched/mid-air HUMAN sprite next to the transforming frame in the source sheet. It may be an aerial attack. **Never substitute the standing ground idle.**
- spin_1 is **stationary in rotation** at both endpoints. Brief stationary hold only; do not create a jarring long dwell.
- spin_1 (and ONLY spin_1) **shrinks while transitioning into spin_2** and **grows back out of spin_2 on return**, because the human sprite is larger than the pinwheel. The shrink/grow must be visually apparent and continuous; the head must not abruptly appear in empty space.
- **spin_2 is native scale** throughout. Explicitly reset scale to 1 as soon as spin_2 is active. **spin_3/pinwheel is native scale**, no scaling at all. Earlier attempts improperly shrank spin_2, and the user rejected them.
- Rotation: none on spin_1. On spin_2 begin slowly, increase angular velocity gradually, reach fastest rotation on spin_3/pinwheel, then decelerate with a symmetric mirrored envelope through spin_2, reaching zero before spin_1. Continuous rotation in one direction only. The user specifically said earlier changes did not visibly differentiate spin_2 speed from pinwheel speed.
- Rotation endpoint orientation must return to the original upright aerial pose. Make velocity and angle continuous across frame switches; use a piecewise angular-velocity curve integrated into angle, not a naive global smoothstep whose middle velocity is nearly constant.
- Verify by frame-by-frame playback and speed measurement, not code inspection alone.

## Important prior implementation history
- At one point a run sequence included `['run_1','run_2','run_3','run_2','run_1']`, producing a perceptible hold at the wrap. A later observed branch revision changed it to `['run_1','run_2','run_3','run_2']`; check CURRENT code before modifying.
- Earlier dash implementation used `spin_1` at first/last and `spin_2`/ `spin_3` between, with angle `6*Math.PI*smoothstep(phase)`. The user rejected rotation on spin_1 and insufficient visible velocity differentiation. Do not reintroduce those mistakes.
- A previous Pages workflow deployed a pinned campaign SHA to `dist/review/connie-motion` without merging the campaign branch into main. Verify the exact pin and live module.
- Review-page cache-busting parameter was `rev`; later page accepted `revision` as well. Verify the deployed loader rather than assuming a query parameter invalidates modules.

## Transport: chat → Drive → phone → Pose Lab
The user expects the known Pose Lab Flow: approved generated image/file uploaded to Google Drive as a bypass to access it on Android, then imported/pushed into Pose Lab V2 and made Git-owned runtime authority. Distinguish (1) generated candidate, (2) approved exact bytes, (3) Drive ingress, (4) Git committed asset, (5) deployed runtime, (6) human visual approval. Do not claim any of these from evidence of another. If a new image is generated, verify its actual file location, preserve the approved original, and get a verdict before replacing canonical frames. Never use an unrelated generated full sheet as a stealth replacement for an arm-only edit.

## Campaign execution etiquette
- Operate in Motivated Mode: investigate, edit, test, deploy, inspect, and report actual results. Do not stop after writing code or after a green build when visual validation is required.
- Source-first: inspect atlas at high resolution, including relevant eye/arm/frame and crops; do not guess pixel landmarks.
- Limit mutation to the user's requested property; lock all approved neighbors.
- Before change, save exact baseline SHA and expected before/after frame/phase behavior.
- After change, run syntax/build and browser/render tests, check first/middle/last and loop boundary frames, deploy with unique `rev`, verify live code, then ask for visual acceptance.
- Never report a transport success as an animation fix.

## Paper Thin game handoff / next decisions
Before game implementation, confirm the intended game runtime, scene structure, control model, combat rules, and asset integration instead of importing mechanics from unrelated projects. Reuse the approved Connie animation data from Pose Lab V2 and preserve original authored frame identity. Open a dedicated Paper Thin game campaign/contract and retain this handoff as its entry point.

## Historical links and receipts
- Last confirmed prior review from this conversation: `https://valar05.github.io/pose-lab-v2/review/connie-motion/motion.html?character=connie&rev=7067736`; this is **not** necessarily the current latest revision.
- The user continued issuing corrections after that revision, including shrinking ONLY spin_1 and restoring spin_2 to full scale. Query current branch before making claims.
- GitHub Pages deployment is not human approval.
