# Serin authored full-body jump V1

**Original source:** `/storage/emulated/0/Pictures/file_00000000d06481f5866e830f23523b51.png` from the phone screenshot (2026-10-12), SHA-256 `dae365a6adf33bb3961df2a5cbeb21f53c37f1043124765511c7b8ef8015e453`. Approved by human to proceed into animation. The complete image is RGBA, 1086 x 1448.

**Preserve:** approved front idle with upper-lid blink, right glide with established anticipation, wave crest and grounded pool, reverse motion, source hashes and native scale. Previous `serin-unified` route remains untouched.

**New authored airborne:** `serin-unified-authored` route selects the one full new PNG on the physics jump's first update, moves the ENTIRE sprite upward by `jumpY`, and returns to ground art upon contact. The source contains hair, fabric, dangling gems and a galaxy liquid tail together. No separate floor puddle, crossfade, fake fragments, or inferred feet. Source is used without repainting, recoloring, cropping or fitting.

**Ingress:** Git-owned phone script reads the exact source from Pictures and validates SHA and PNG header; writes only the new image in an isolated worktree, verifies accepted locks and contract, commits and pushes the original image with remote readback, then builds and starts a separate tmux preview on the phone. Original checkout remains untouched.

**Run once in Termux:**
```bash
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin codex/serin-authored-jump-v1 && git show FETCH_HEAD:tools/campaigns/serin-authored-jump-v1.sh | bash
```

**Review:** open the returned live `motion.html?procedural=serin-unified-authored&rev=<actual sha>`, tap Jump from idle and then while gliding. Confirm all of Serin moves, pose scale remains coherent, immediate input, no detached puddle and no landing delay. Do not promote visually until human verdict.

## Live-fluid jump correction

The first hosted build had an image hard switch and physical jump but a completely static airborne shader; all fluid code ran only in the ground branch. This revision preserves the approved complete PNG and drives its liquid tail with layered traveling UV waves, velocity-dependent lag and tip curl, adds weaker trailing hair inertia and shifting internal violet galaxy highlights, then produces a short landing ripple on the existing pool. It adds no new art, split body sections, source-frame interpolation, or jump delay. Await human review on the real phone Pose Lab route.
