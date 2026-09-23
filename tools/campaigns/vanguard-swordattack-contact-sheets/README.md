# Vanguard Sword-Attack Contact-Sheet Campaign

Bash-first campaign for scavenging reusable poses from the canonical 3D Vanguard animation library.

## Bite 01 — SwordAttack1

Run exactly:

```bash
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2
bash tools/campaigns/vanguard-swordattack-contact-sheets/01_swordattack1.sh
```

Optional denser sampling:

```bash
SAMPLES=12 bash tools/campaigns/vanguard-swordattack-contact-sheets/01_swordattack1.sh
```

The launcher uses the repo's existing Blender runner and canonical Vanguard GLB. It renders only the native `SwordAttack1` clip, creates one numbered contact sheet, and writes all results under:

```text
generated/vanguard-swordattack-contact-sheets/SwordAttack1/<timestamp>/
```

The final receipt is copied to the Android clipboard on both success and failure. The receipt includes the contact-sheet path and the tail of the run log so it can be pasted directly back into ChatGPT.

No manual Blender UI work is required.
