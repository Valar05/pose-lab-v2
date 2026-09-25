# Vanguard Sprite Refinery

`npm run refinery:vanguard --` is the single command surface layered on PR #4's
native Steel pose packets and 2D reviewer. It does not generate appearance art
or call an API.

```sh
npm run refinery:vanguard -- import-concept --source /transport/01-562930.jpg
npm run refinery:vanguard -- prepare --manifest refinery/vanguard-batch.example.json
npm run refinery:vanguard -- queue --manifest refinery/vanguard-batch.example.json
npm run refinery:vanguard -- status --manifest refinery/vanguard-batch.example.json
npm run refinery:vanguard -- ingest --manifest BATCH.json --clip CLIP --attempt attempt-001 --sheet BATCH--CLIP--attempt-001.png
npm run refinery:vanguard -- verify --manifest BATCH.json --clip CLIP --attempt attempt-001
npm run refinery:vanguard -- reject --manifest BATCH.json --clip CLIP --attempt attempt-001 --reviewer NAME --reason "visible geometry mismatch"
npm run refinery:vanguard -- approve --manifest BATCH.json --clip CLIP --attempt attempt-001 --reviewer NAME
npm run refinery:vanguard -- collect --manifest BATCH.json
```

Preparation reuses pose packets made by `render_animation_pose_packet.py`,
`assemble_animation_pose_packet.py`, and `verify_animation_pose_packet.py` and
emits a self-contained manual ChatGPT work packet. A retry always starts from
that packet. `ingest` preserves the returned sheet, requires its batch/clip/
attempt filename, splits it mechanically into transparent 512×512 RGBA PNGs,
and copies authored Steel timing. It deliberately records no ChatGPT model name.

`verify` is structural only and cannot approve art. `approve` is the sole human
approval transition and binds the reviewer and timestamp to all hashes.
`collect` is the only shared registry writer. Rejected evidence is retained.
Infrastructure failures are `blocked`; artwork rejection is `red`.

The approved concept target is hash-gated. If its exact 316594-byte JPEG is not
available, all other tooling remains usable in fixture mode, while production
preparation reports `conceptMaterialized: false`. Never substitute
`Vanguard_front.png` or a generated frame.

The schema, example batch, and machine-readable Command Center job contract live
under `schemas/` and `refinery/`. Use `?view=2d&batch=URL_TO_STATE_JSON` to show
batch/clip state and evidence links alongside direct PNG review.

## Sprite extraction doctrine
- Original authored images are the mechanical source.
- Screenshots, generated derivatives, review GIFs, and packed atlases are review evidence only when originals exist.
- For regular sheets, apply one shared scale factor to the entire sheet. Do not independently normalize each frame.
- Shrink before inference/measurement to keep the fast low-resolution review loop.
- 96px is a pixel-density convention, not a requirement that every crop be 96px tall.
- Preserve authored order and source-cell geometry.
- Grow the atlas when necessary. Never clip or shrink a useful pose to fit a cell.
- Preserve the established body/ground anchor convention.
- Cleanup must be conservative: phantom fragments can be removed, but legitimate separated weapon/anatomy geometry must survive.
- Dedupe only after corpus capture and review. Exact duplicates are safe; meaningful near-duplicates stay.
