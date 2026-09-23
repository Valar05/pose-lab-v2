# Vanguard Sword-Attack Contact-Sheet Campaign

Bash-first campaign for scavenging reusable poses from the canonical 3D Vanguard animation library.

## Continue the campaign: SwordAttack2–5

After pulling the current remote, run exactly:

```bash
cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 && git fetch origin main && git checkout origin/main -- tools/campaigns/vanguard-swordattack-contact-sheets && bash tools/campaigns/vanguard-swordattack-contact-sheets/00_render_remaining.sh
```

That renders SwordAttack2, SwordAttack3, SwordAttack4, and SwordAttack5 sequentially using the already-proven Vanguard render path.

Every successful sheet is copied to a predictable Android Downloads path:

```text
/storage/emulated/0/Download/SwordAttack1_contact_sheet.png
/storage/emulated/0/Download/SwordAttack2_contact_sheet.png
/storage/emulated/0/Download/SwordAttack3_contact_sheet.png
/storage/emulated/0/Download/SwordAttack4_contact_sheet.png
/storage/emulated/0/Download/SwordAttack5_contact_sheet.png
```

The campaign continues through later attacks even if one attack fails. At the end it copies one combined receipt to the Android clipboard containing success/error status, the attachable sheet paths, and the log tail.

Set `SAMPLES=12` before the command only when a denser sheet is explicitly wanted.

## Single-attack bites

- `01_swordattack1.sh`
- `02_swordattack2.sh`
- `03_swordattack3.sh`
- `04_swordattack4.sh`
- `05_swordattack5.sh`

The generic worker is `run_action.sh`. No manual Blender UI work is required.
