# Serin Glide Locomotion · V1

## Mission and locks
An input-driven, game-facing **locomotion system**, not an authored walk cycle. Serin glides without crossing her legs. Acceleration adds forward pitch, distance animates her liquid, braking creates inertial overshoot, and a damped spring returns her to the original idle. Glamour and the long hair remain essential.
- The source at *both endpoints*: existing locked Serin Back idle PNG, SHA-256 `e666cd65570ee7485f8c5e6c422fb0172883a317e0bea466477e201d45f6c79c`.
- Source while moving: approved latest right-facing glam-glide PNG, 1024×1536 RGBA, SHA-256 `d7cd7e8df9168b1adc774c6784fae3aad4671a68a7369d56329c18ee01ccfa40`. Ingress from exact bytes saved to Android Pictures.
- No edits to front/back idle renderer or art, Vanguard, Swarmling, shared animation systems or base source. Root world translation is owned by the game; the preview pins the sprite to demonstrate shape.
- All motion input is controller-based, not a fixed timeline of authored walking frames. The optional demo merely drives actual controller input for roughly eleven seconds.

## Game API
```js
import {SerinGlideController} from './serin-glide-system.mjs';
const body = new SerinGlideController();
const state = body.update(dtSeconds,moveAxis);  // -1..1; 0 brakes
// Game collision/system consumes state.position or state.velocity.
// Renderer samples state.poseBlend, pitch, slosh, wake, phase and facing.
```

## Phone campaign
Download the exact Serin glide alpha PNG from this conversation to Android Pictures. The runner finds exactly one matching SHA; if not, set an explicit SERIN_GLIDE_SOURCE path. Do not rename/interpolate/derive a replacement image.
```sh
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-glide-locomotion-v1 && git show FETCH_HEAD:tools/campaigns/serin-glide-locomotion-v1.sh | bash
```
The repository-owned campaign uses isolated worktree, shared framework boot/locks/receipts, exact binary ingress+GitHub push readback, build, dedicated tmux server and verified HTTP asset hashes. No clean/reset/stash or change to other servers.

## Acceptance
Must visibly begin idle and end idle; accelerate forward and pitch, coast smoothly without legs crossing, brake with slosh but pinned pool, and settle naturally. GitHub CI and HTTP 200 are not visual acceptance. HUMAN_VERDICT=PENDING until phone review.

## Repair: phone server recipe 404 (2026-10-11)
Phone campaign completed exact PNG ingress, GitHub push/readback at `b45a7111eca1225ce252f99c7912faa7260c609b`, source checks, controller tests, and build. It then stopped because the campaign launcher probed the nonexistent path `/assets/serin-glide/idle.recipe.json`. Canonical recipe and the renderer both use `/assets/serin-glide/locomotion.recipe.json`.

Correction is limited to the launcher's served-recipe check, a deterministic script/recipe identity regression guard, and a GitHub Actions HTTP smoke test of the actual built artifact for recipe + both locked PNGs. The already committed glide PNG, idle PNG, physics controller, pose blending and WebGL renderer are unchanged. Human visual review is still pending. Re-run the same GitHub fetch-and-run command to create an isolated worktree for this corrected revision and serve its assets from the dedicated Serin glide tmux session.
