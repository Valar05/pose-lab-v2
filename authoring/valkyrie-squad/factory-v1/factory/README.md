# Sparse Sprite Factory

This factory turns immutable high-resolution source art plus a declarative character spec into one compact indexed pose atlas and a procedural motion library. It stores semantic poses only. It never bakes in-betweens, blur samples, recovery frames, or rendered animation strips.

## Build April

```sh
node scripts/build-pose-atlas.mjs factory/april.factory.json
node tests/factory.mjs
node tests/verify.mjs
```

April is the golden fixture. A valid factory refactor must reproduce the accepted 61,003-byte atlas with SHA-256 `1f283f698f8ca17074ab77e832f57dc6c4697614c11e6b27747ecb252128b284` and preserve all nine animation IDs.

## Add a character

1. Copy `april.factory.json` and replace every source file and SHA-256 binding.
2. Declare each unique semantic pose once as a `sheet-cell`, `normalized-crop`, or transparent `whole-image` source. Whole-image fixtures are trimmed, contained, and bottom-centered without becoming baked animation strips.
3. Map animation IDs to those pose IDs in `recipes`; reuse IDs instead of duplicating pixels.
4. Copy the motion library and choose parameterized motion kinds instead of baking frames.
5. Build and run the fail-closed tests. A changed source hash, missing pose, duplicate pose ID, shrinking animation set, invalid phase duration, unsafe alpha policy, or oversized atlas must stop the build.

The game controller owns travel. Motion recipes deform around declared contacts and pivots; they do not introduce root translation unless a future commission explicitly authorizes a different factory contract.

Vanguard is the second fixture. Her accepted identity is independent of the legacy Vanguard animation library. Her atlas remains 96 px, uses nearest-neighbor playback, replaces walk with run, and defers combat poses until her heavy combat language is deliberately chosen.
