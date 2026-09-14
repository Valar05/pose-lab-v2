# Canonical Blender Archive

This folder is the source-byte archive for historical Blender specimens used by the Blend Archaeology program.

## Ownership split

Pose Lab V2 owns canonical `.blend` bytes, source hashes, and Blender-native inspection evidence.

Thunder Brainstorm owns compact observations, style/motion/mechanic extraction, lineage, and promoted lessons.

## Canonicality rules

- Preserve the original uploaded/downloaded bytes unchanged.
- Store `.blend` files through Git LFS.
- Record SHA-256 and byte size in `manifest.json` before any conversion or cleanup.
- Never overwrite a canonical source with a migrated Blender save.
- If a file must be opened and re-saved in a newer Blender version, save the derivative elsewhere and preserve the canonical source.
- One source file may have many derived renders, exports, contact sheets, or migrated copies; only the original source hash defines the canonical specimen.

## Expected layout

```text
archive/blends/
  README.md
  manifest.json
  Remhir.blend
  ...
```

Inspection artifacts belong under ignored generated paths, not beside canonical source bytes.

## Acceptance

A manifest entry with `binary_present: false` is intake metadata only. The specimen is not archived until the exact `.blend` bytes are committed at the declared path and their SHA-256 matches the manifest.
