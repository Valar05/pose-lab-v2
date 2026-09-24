# Vanguard Overhand Strike Procedural Proof

This is the first end-to-end proof of Pose Lab V2 procedural sparse-sprite attack rendering.

## Body source

The renderer reads body anchors directly from the canonical Vanguard sprite atlas:

`authoring/vanguard-procedural/source/vanguard-pose-atlas-48.png`

The recipe uses 1-based row-major cells:

- idle 2
- chamber 26
- commit 40
- preimpact 32
- contact 35

No loose body PNGs are part of this contract.

## Effect source

The current phone proof reads the already-delivered Diorama slash key from:

`/storage/emulated/0/Download/Diorama-Slash-Keys/slash_right.png`

## Render

```sh
npm run motion:render -- animations/candidates/vanguard/overhand-strike/recipe.json
```

Outputs:

```text
animations/candidates/vanguard/overhand-strike/generated/preview.gif
animations/candidates/vanguard/overhand-strike/generated/strip.png
animations/candidates/vanguard/overhand-strike/generated/recipe-resolved.json
```

The recipe, atlas cells, deformation values, effect parameters, and source hashes are the durable animation definition. Generated GIF/strip files are review artifacts, not source authority.


## Atlas identity lock

The required Vanguard atlas is exactly 1536x1170 with SHA-256:

`0f6183b8cfa516388ec62b70b79773037c3bfe21576ae9bc0a52510eac8a4420`

Any other image must fail closed.
