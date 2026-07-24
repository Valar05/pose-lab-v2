# Ivory Knight Mixamo Source

This directory stages the single target asset required for the first
Vanguard-to-Ivory pose-transfer experiment.

## Source

- Uploaded archive: `Great Sword Pack (1).zip`
- Archive SHA-256:
  `74c187dcc5cd84724f87bb54931d7b8422a7040ad09cb97557d6c4144c049607`
- Archive member:
  `Meshy_AI_Ivory_Knight_0724152606_texture_obj.fbx`
- Staged file: `ivory_knight_mixamo.fbx`
- Staged-file SHA-256:
  `da08570a0c69d4e88598ff3278677dc5de05a688a5cbc3a0f93d1594f4d43fa3`

The FBX owns Ivory Knight's mesh, skin, Mixamo skeleton, bind pose, and embedded
appearance data. The other motion FBXs in the uploaded archive are deliberately
excluded from this first experiment.

## Experiment Boundary

Transfer exactly one canonical Vanguard `Idle` pose onto Ivory Knight's final
Mixamo deform rig. Vanguard's pose is motion authority. Ivory Knight's bind
pose, bone lengths, and native roll are target authority.

Candidate 1 is body-only:

- no Mixamo motion;
- no walk or breathing cycle;
- no sword;
- no runtime retargeter;
- no generic solver stack;
- no promotion or acceptance.

The candidate must be baked as ordinary target FK transforms and reviewed from
the locked side camera plus an orthogonal diagnostic view. Its purpose is to
prove or reject the one-pose rest-basis conversion before harder motion or
weapon composition is attempted.
