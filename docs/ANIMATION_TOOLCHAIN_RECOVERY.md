# Animation Toolchain Recovery Map

Status: recovered front door; executable local/runtime lane green; hosted visual acceptance blocked by external runner provisioning.

## Front door

Authoritative current animation checkout:

- path: /storage/emulated/0/Documents/GodotProjects/pose-lab-v2-sprite-refinery
- repo: Valar05/pose-lab-v2
- branch: agent/sprite-refinery-mvp
- recovered head: 6fac4273b00479848f67c70b2541f12f9145fe70
- state at recovery: clean, tracking remote, 0 ahead / 0 behind
- local review server: tmux sprite-lab-video at http://127.0.0.1:4173/?view=2d
- Sprite Lab is not a separate application. The existing Pose Lab V2 2D surface owns contact-sheet import, frame correction, draft playback, persistence, and GIF export.

Do not replace this with the older dirty pose-lab-v2 checkout or the standalone pose-lab salvage tree when resuming Sprite Lab work.

## Executable animation muscle already in Pose Lab V2

- Intelligent contact-sheet slicing: npm run test:sprite-slicer and src/sprite-slicer.js
- Browser-local Sprite Lab drafts: src/sprite-viewer.js
- GIF export with per-frame timing: src/gif-encoder.js and npm run test:gif-encoder
- 2D PNG-frame review: npm run test:2d and ?view=2d
- Sprite Refinery: npm run sprite-refinery:plan, sprite-refinery:worker, sprite-refinery:collect
- Video clip ledger: npm run video:ledger
- Video contact sheets: npm run video:contact-sheet
- Learning packets: npm run learning:packet
- Saved-pose composition: npm run animation:compose
- Artifact/no-op comparison: npm run animation:compare
- Deterministic Blender render truth: npm run blender:render-truth
- Blender source sampling: npm run blender:sample-source
- Candidate promotion after accepted evidence: npm run promote:animation
- Browser capture for tracked animations: tools/capture_sprite_review.mjs

Governing local pipeline:

source clip -> ledger -> contact sheet -> saved poses -> timed composition -> Blender render truth -> hosted visual review -> promotion

## Exact Sprite Lab specimen

- phone source: /storage/emulated/0/Pictures/image_cc96778d.jpg
- SHA-256: c68c3268a04027ae7f05eea623f344b079360ce6a1f709a35647b1f0cdadcac2
- bytes: 1,313,998
- JPEG RGB, 1475x720
- expected UI path: detect four candidates -> select/delete end card -> create three 512x512 draft frames -> reload -> restore three-frame draft from IndexedDB

The current phone contract passed slicer, GIF, 2D review, build, smoke, diff check, and local HTTP 200.

## Hosted evidence branch

Hosted importer proof is staged separately so the recovered feature branch remains untouched:

- branch: agent/sprite-lab-hosted-importer-qa-20260919
- exact fixture: tests/fixtures/sprite-lab/image_cc96778d.jpg
- additive capture: tools/capture_sprite_import_review.mjs
- workflow: .github/workflows/sprite-visual-qa.yml
- capture contract: exact source SHA -> four candidates -> keyboard-select frame 4 -> delete -> three frames -> create -> verify 512x512 -> verify IndexedDB source hash and PNG blobs -> reload -> verify draft restoration
- first dispatch: GitHub Actions run 35444888829

Run 35444888829 failed in about four seconds before useful workflow execution. This matches the account-wide GitHub-hosted runner provisioning failures observed in September 2026. It is infrastructure evidence, not a Sprite Lab visual verdict. Do not call hosted visual acceptance green until a real hosted browser executes the capture and its screenshot evidence is inspected.

## Recovered sibling knowledge

### Droobiedoo Animation Apprentice

Valar05/droobiedoo contains the reusable loop:

brief -> motion recipe -> key poses -> critique -> correction note -> reusable lesson -> improved draft

That doctrine is recovered into docs/ANIMATION_APPRENTICE_CONTRACT.md so Pose Lab does not depend on the sibling checkout at runtime.

### Standalone Pose Lab

/storage/emulated/0/Documents/GodotProjects/pose-lab is salvage/source evidence, not the Sprite Lab front door. The recovery scan found dirty work, stashes, and local-only branch material. Preserve it. Do not reset it. Pose Lab V2 may continue reading selected legacy poseclip/evidence inputs as source evidence.

### Affine-animation handoffs

cornfire-convoy-fp, last-convoy-html5, and fleshpunk--inner-heart contain useful affine-animation vocabulary, but their handoffs are prompt/motion-language documents, not missing executable tools. Keep them as reference doctrine; do not port their runtimes into Pose Lab V2.

### Model Viewer animation review

A local Model Viewer worktree was discovered on agent/blender-animation-review. Its remote branch was not found during GitHub readback, so treat it as archaeology until local commit reachability is checked. Do not silently replace Pose Lab's current Blender render-truth lane with it.

## Retired lane: Command Center Codex workers

Older Pose Lab docs stated that Home Center Command Center Codex jobs/workers already existed. Current Home Center rejects jobs.* and reports that Codex agents, jobs, sessions, and workers are permanently retired.

Therefore:

- cloud:worker-job may remain useful as a deterministic self-contained bundle builder.
- generated worker bundles remain provenance artifacts.
- do not claim a callable Command Center Codex dispatch lane.
- do not create a replacement worker platform inside Pose Lab without a new commission.
- hosted visual review remains a separate acceptance gate.

## Recovery rule

1. Start from this map and docs/SPRITE_LAB_HANDOFF_PROMPT.md.
2. Use pose-lab-v2-sprite-refinery for Sprite Lab and current Pose Lab V2 animation tooling.
3. Preserve dirty/local-only sibling repos as source evidence.
4. Use repo-native tools before inventing new ones.
5. Keep deterministic checks, local render truth, hosted browser evidence, and human acceptance as separate states.
6. Never promote animation from metrics or worker output alone.
