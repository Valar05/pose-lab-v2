#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" ]] || { echo "STOP: run inside pose-lab-v2"; exit 2; }

STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
LIVE="$STATE/worktree"
BOOT="$STATE/bootstrap"
SESSION="plv2-vanguard-live"
PORT="${POSE_LAB_PORT:-8766}"

POSE_REL="public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"
SLASH_REL="public/assets/vanguard/procedural/diorama-slash-atlas.png"
POSE_SHA="98f0920139a94fcc93074a765c721e7e1f4c083311c2c1cea9edaa8f2e087ed1"
SLASH_SHA="94a59e09dd0bbc9ceb79a81697d4c5096fc451438c3d9df337e7e2782d743b70"

echo "=== FETCH MAIN ==="
git -C "$ROOT" fetch origin main
mkdir -p "$STATE"

find_sha() {
  local want="$1"
  shift
  local p got root

  for p in "$@"; do
    [[ -f "$p" ]] || continue
    got="$(sha256sum "$p" 2>/dev/null | awk '{print $1}')"
    [[ "$got" == "$want" ]] && { printf '%s\n' "$p"; return 0; }
  done

  for root in "$LIVE" "$ROOT" "/storage/emulated/0/Documents/GodotProjects" "/storage/emulated/0/Download"; do
    [[ -d "$root" ]] || continue
    while IFS= read -r -d '' p; do
      got="$(sha256sum "$p" 2>/dev/null | awk '{print $1}')"
      [[ "$got" == "$want" ]] && { printf '%s\n' "$p"; return 0; }
    done < <(find "$root" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -print0 2>/dev/null)
  done

  return 1
}

need_boot=0
git -C "$ROOT" cat-file -e "origin/main:$POSE_REL" 2>/dev/null || need_boot=1
git -C "$ROOT" cat-file -e "origin/main:$SLASH_REL" 2>/dev/null || need_boot=1

if [[ "$need_boot" -eq 1 ]]; then
  echo "=== ONE-TIME GIT ASSET IMPORT ==="

  pose_src=""
  slash_src=""

  if ! git -C "$ROOT" cat-file -e "origin/main:$POSE_REL" 2>/dev/null; then
    pose_src="$(find_sha "$POSE_SHA"       "$LIVE/$POSE_REL"       "$ROOT/$POSE_REL"       "/storage/emulated/0/Download/918598.png"       "/storage/emulated/0/Download/vanguard-pose-atlas-90.png" || true)"
    [[ -n "$pose_src" ]] || { echo "STOP: canonical 90-pose atlas not found"; exit 11; }
    echo "import_pose=$pose_src"
  fi

  if ! git -C "$ROOT" cat-file -e "origin/main:$SLASH_REL" 2>/dev/null; then
    slash_src="$(find_sha "$SLASH_SHA"       "$LIVE/$SLASH_REL"       "$ROOT/$SLASH_REL"       "/storage/emulated/0/Download/diorama_slash_runtime_atlas_192.png"       "/storage/emulated/0/Download/Diorama-Slash-Keys/diorama_slash_runtime_atlas_192.png"       "/storage/emulated/0/Download/diorama-slash-atlas.png" || true)"
    [[ -n "$slash_src" ]] || { echo "STOP: canonical slash atlas not found"; exit 12; }
    echo "import_slash=$slash_src"
  fi

  TMP_INDEX="$STATE/bootstrap.index"
  rm -f "$TMP_INDEX"
  export GIT_INDEX_FILE="$TMP_INDEX"
  git -C "$ROOT" read-tree origin/main

  if [[ -n "$pose_src" ]]; then
    pose_blob="$(git -C "$ROOT" hash-object -w "$pose_src")"
    git -C "$ROOT" update-index --add --cacheinfo 100644 "$pose_blob" "$POSE_REL"
  fi

  if [[ -n "$slash_src" ]]; then
    slash_blob="$(git -C "$ROOT" hash-object -w "$slash_src")"
    git -C "$ROOT" update-index --add --cacheinfo 100644 "$slash_blob" "$SLASH_REL"
  fi

  tree="$(git -C "$ROOT" write-tree)"
  parent="$(git -C "$ROOT" rev-parse origin/main)"
  commit="$(printf '%s\n' "Commit canonical Vanguard pose and slash atlases" |     git -C "$ROOT" -c user.name="Pose Lab Canonicalizer" -c user.email="pose-lab@local"     commit-tree "$tree" -p "$parent")"

  unset GIT_INDEX_FILE
  rm -f "$TMP_INDEX"

  git -C "$ROOT" push origin "$commit":refs/heads/main
  git -C "$ROOT" fetch origin main
  echo "asset_commit=$commit"
fi

echo "=== REFRESH LIVE WORKTREE ==="
git -C "$ROOT" worktree remove --force "$LIVE" >/dev/null 2>&1 || true
rm -rf "$LIVE"
git -C "$ROOT" worktree prune
git -C "$ROOT" worktree add --detach "$LIVE" origin/main >/dev/null

echo "live_head=$(git -C "$LIVE" rev-parse HEAD)"

echo "=== VERIFY CANONICAL ASSETS ==="
[[ "$(sha256sum "$LIVE/$POSE_REL" | awk '{print $1}')" == "$POSE_SHA" ]] || { echo "STOP: pose atlas hash mismatch"; exit 21; }
[[ "$(sha256sum "$LIVE/$SLASH_REL" | awk '{print $1}')" == "$SLASH_SHA" ]] || { echo "STOP: slash atlas hash mismatch"; exit 22; }

echo "=== BUILD ==="
cd "$LIVE"
node scripts/build.mjs

echo "=== RESTART SERVER ==="
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "cd '$LIVE' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$LIVE/dist'"

BASE="http://127.0.0.1:$PORT"
REV="$(git -C "$LIVE" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV"

for _ in $(seq 1 40); do
  if curl -fsS "$BASE/assets/vanguard/procedural/vanguard-pose-atlas-90.png" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/diorama-slash-atlas.png" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/run.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/idle.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/overhand-strike.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/undercut-strike.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/attack2-uppercut.recipe.json" -o /dev/null 2>&1 &&
     curl -fsS "$BASE/assets/vanguard/procedural/horizontal-strike.recipe.json" -o /dev/null 2>&1; then
    break
  fi
  sleep .2
done

echo "POSE_LAB_CANONICAL_REFRESH_OK"
echo "pose_atlas=90-only"
echo "slash_atlas=canonical"
echo "slash_renderer=single"
echo "url=$URL"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
elif [[ -x /system/bin/am ]]; then
  /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1 || true
fi
