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
- Selected native action member:
  `great sword idle.fbx`
- Staged action:
  `great_sword_idle.fbx`
- Staged-action SHA-256:
  `f40c61f279e45cfd7307cbd6272837eeb266e931bb83c2001957c5e4eb584d53`

The FBX owns Ivory Knight's mesh, skin, Mixamo skeleton, bind pose, and embedded
appearance data. `great_sword_idle.fbx` is the only motion source admitted to
this experiment. The other five idle variants and all other motion FBXs in the
uploaded archive are deliberately excluded.

## Experiment Boundary

Clone exactly one pose from Ivory Knight's native `great sword idle.fbx` action
onto Ivory Knight's final Mixamo deform rig, then correct that pose to match
canonical Vanguard `Idle`. The native clip supplies a compatible two-hand grip
and keyed target-rig transforms. Vanguard supplies visible pose authority:
balance, pelvis and spine attitude, stance, guard side, and blade line. Ivory
Knight's bind pose, bone lengths, and native roll remain target authority.

Candidate 1 is one frame:

- no other Mixamo motion;
- no walk or breathing cycle;
- no procedural retargeter;
- no generic solver stack;
- no inherited anime great-sword counterbalance;
- one external sword contract, added only after the body and grip are proven;
- no runtime retargeter;
- no promotion or acceptance.

The candidate must be baked as ordinary target FK transforms and reviewed from
the locked side camera plus an orthogonal diagnostic view. Its purpose is to
prove or reject direct final-rig correction of a native target action before
breathing, locomotion, or multi-key transfer is attempted.
