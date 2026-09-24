# Vanguard 3D Donor Contact-Sheet Campaign

Bash-first extraction of reusable poses from the canonical 3D Vanguard animation library.

## Already harvested

- SwordAttack1
- SwordAttack2
- SwordAttack3
- SwordAttack4
- SwordAttack5

## Next harvest

Run:

```bash
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin main && git checkout origin/main -- tools/campaigns/vanguard-swordattack-contact-sheets && bash tools/campaigns/vanguard-swordattack-contact-sheets/06_render_other_donors.sh
```

This renders contact sheets for:

- ClubIdle
- Idle
- Jump
- JumpCrouch
- JumpForward
- Land
- LedgeClimb
- LedgeGrab
- LedgeGrabHang
- Midair
- MidairSwordAttack1
- MidairSwordAttack2
- RunForwardOld
- SpinAttack

The obvious attack-rich clips use 9 samples. Simpler movement/transition clips use 6 to keep the campaign fast.

Each successful contact sheet is copied to:

```text
/storage/emulated/0/Download/<Action>_contact_sheet.png
```

The campaign continues through errors and copies one combined receipt to the Android clipboard at the end.

No manual Blender UI work is required.
