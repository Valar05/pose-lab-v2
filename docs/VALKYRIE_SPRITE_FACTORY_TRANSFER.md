# Valkyrie Squad sparse sprite factory transfer

This package moves the exact procedural April/Vanguard runtime from ChatGPT Site commit `905d3a200e9a34a3832176cc3a761c88ead370ee` into Pose Lab V2.

- Review view: `?view=valkyrie&character=april&clip=jab` or `?view=valkyrie&character=vanguard&clip=grapple-entry`.
- April: 9 animations.
- Vanguard: 11 animations (7 noncombat, 4 combat).
- The atlases contain semantic poses only. Motion, deformation, shear, stretch, rotation, and blur remain procedural.
- Vanguard combat remains quarantined candidate V3.
- No Blender file existed in the Site source; none is claimed here.
- Full-resolution source sheets, acted reference, extraction/refinement tools, tests, and recovery evidence are preserved in Library as `Valkyrie-Squad-Pose-Lab-V2-Source-Masters-2026-09-22.tar.gz` (`libfile_5103eaaaad248191b282ca4dab9b67b7`, SHA-256 `b84c618551b654cbfbdccae9111481ebfbfccb39d3f56a8903e7d5e5ac6417d2`). They are not runtime dependencies.
- `node tools/test_valkyrie_sprite_transfer.mjs` verifies the lean repository payload directly. The archived factory reconstruction tests require restoring the full-resolution masters beside `authoring/valkyrie-squad/factory-v1/` and verifying the archive checksum first.
- Do not remove the Site resources until the phone-hosted Pose Lab route reads back all 20 IDs and Drew visually accepts the transferred surface.
