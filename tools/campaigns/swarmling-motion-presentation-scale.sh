#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export PAGER=cat GIT_PAGER=cat

ROOT="/storage/emulated/0/Documents/GodotProjects/pose-lab-v2"
PARENT="11d2f24926fddbb05a1f13e37fd38db7f73f53d8"
CONTRACT="campaigns/swarmling-motion-presentation-scale.contract.json"
HELPER="tools/campaigns/patch_swarmling_presentation_scale.py"
PREVIEW="src/procedural-swarmling-preview.js"
RUN="public/assets/vanguard/fleshpunk/characters/swarmling/animations.json"
STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"

stop(){ echo "STOP: $*" >&2; exit 1; }

cd "$ROOT"
git status --short
git fetch origin main
SEALED="$(git rev-parse origin/main)"
W="$STATE/swarmling-scale-$SEALED"
[ ! -e "$W" ] || stop "author worktree already exists"
mkdir -p "$STATE"
git worktree add --detach "$W" "$SEALED" >/dev/null
cd "$W"

for f in AGENTS.md docs/POSE_LAB_CAMPAIGN_RULES.md docs/POSE_IS_GOD.md "$CONTRACT"; do
  [ -s "$f" ] || stop "missing $f"
  cat "$f" >/dev/null
  echo "READ=$f"
done

RUN_BLOB="$(git hash-object "$RUN")"
python3 "$HELPER" "$PREVIEW"
grep -Fq "const presentationScale=1.5;" "$PREVIEW" || stop "scale patch missing"
[ "$(git hash-object "$RUN")" = "$RUN_BLOB" ] || stop "source assets changed"
node --check "$PREVIEW"
npm run build
npm run smoke
git diff --check
