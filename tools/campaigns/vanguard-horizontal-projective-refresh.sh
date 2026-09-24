#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "STOP: run this from inside pose-lab-v2."
  exit 2
fi

STATE="$HOME/.local/state/pose-lab-v2-vanguard-live"
WORK="$STATE/worktree"
SESSION="plv2-vanguard-live"
BASE_PORT="${POSE_LAB_PORT:-8766}"

echo "=== FETCH MAIN ==="
git -C "$ROOT" fetch origin main

echo
echo "=== PREPARE LIVE WORKTREE ==="
if [[ ! -d "$WORK/.git" && ! -f "$WORK/.git" ]]; then
  mkdir -p "$STATE"
  git -C "$ROOT" worktree prune
  git -C "$ROOT" worktree add --detach "$WORK" origin/main
fi

sync_from_main() {
  local rel="$1"
  local dst="$WORK/$rel"
  mkdir -p "$(dirname "$dst")"
  git -C "$ROOT" show "origin/main:$rel" > "$dst" || {
    echo "STOP: origin/main missing $rel"
    exit 10
  }
  echo "UPDATED $rel"
}

for rel in   motion.html   src/procedural-review-shell.js   src/procedural-run-preview.js   src/procedural-motion-preview.js   public/assets/vanguard/procedural/run.recipe.json   public/assets/vanguard/procedural/idle.recipe.json   public/assets/vanguard/procedural/overhand-strike.recipe.json   public/assets/vanguard/procedural/undercut-strike.recipe.json   public/assets/vanguard/procedural/attack2-uppercut.recipe.json   public/assets/vanguard/procedural/horizontal-strike.recipe.json
do
  sync_from_main "$rel"
done

PROC="$WORK/public/assets/vanguard/procedural"
DIST_PROC="$WORK/dist/assets/vanguard/procedural"
mkdir -p "$PROC" "$DIST_PROC"

echo
echo "=== VERIFY RUNTIME ASSETS ==="

find_asset() {
  local dest="$1"
  shift
  [[ -f "$dest" ]] && return 0
  for p in "$@"; do
    if [[ -f "$p" ]]; then
      cp -f "$p" "$dest"
      echo "COPIED $(basename "$dest") from $p"
      return 0
    fi
  done
  return 1
}

find_asset "$PROC/vanguard-pose-atlas-90.png"   "$ROOT/public/assets/vanguard/procedural/vanguard-pose-atlas-90.png"   "/storage/emulated/0/Download/vanguard-pose-atlas-90.png"   "/storage/emulated/0/Download/918598.png" || {
    echo "STOP: missing vanguard-pose-atlas-90.png"
    exit 11
  }

find_asset "$PROC/slash_horizontal_clean.png"   "$ROOT/public/assets/vanguard/procedural/slash_horizontal_clean.png"   "/storage/emulated/0/Download/slash_horizontal_clean.png"   "/storage/emulated/0/Download/917846.png" || {
    echo "STOP: missing slash_horizontal_clean.png"
    exit 12
  }

echo
echo "=== BUILD ==="
cd "$WORK"
node scripts/build.mjs

cp -f "$PROC/vanguard-pose-atlas-90.png" "$DIST_PROC/vanguard-pose-atlas-90.png"
cp -f "$PROC/slash_horizontal_clean.png" "$DIST_PROC/slash_horizontal_clean.png"
cp -f "$PROC/horizontal-strike.recipe.json" "$DIST_PROC/horizontal-strike.recipe.json"

echo
echo "=== RESTART SERVER ==="
for s in plv2-vanguard-run-live plv2-overhand-live plv2-vanguard-live; do
  tmux kill-session -t "$s" 2>/dev/null || true
done

python3 - <<'PY'
import os, signal, subprocess
try:
    out=subprocess.check_output(["ps","-ef"],text=True,errors="ignore")
except Exception:
    raise SystemExit
for line in out.splitlines():
    if "python3" in line and "http.server" in line and ("pose-lab-v2" in line or "plv2" in line):
        parts=line.split()
        if len(parts)>1:
            try: os.kill(int(parts[1]),signal.SIGTERM)
            except Exception: pass
PY

PORT="$(python3 - "$BASE_PORT" <<'PY'
import socket,sys
start=int(sys.argv[1])
for p in range(start,start+40):
    s=socket.socket()
    try:
        s.bind(("127.0.0.1",p))
    except OSError:
        s.close()
        continue
    s.close()
    print(p)
    raise SystemExit
raise SystemExit("STOP: no free local port")
PY
)"

LOG="$STATE/server.log"
: > "$LOG"

tmux new-session -d -s "$SESSION"   "cd '$WORK' && exec python3 -m http.server '$PORT' --bind 127.0.0.1 --directory '$WORK/dist' >>'$LOG' 2>&1"

BASE="http://127.0.0.1:$PORT"
URL="$BASE/motion.html?procedural=vanguard-horizontal-strike"

READY=0
for _ in $(seq 1 50); do
  if curl -fsS "$URL" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/src/procedural-motion-preview.js" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/horizontal-strike.recipe.json" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/slash_horizontal_clean.png" -o /dev/null 2>/dev/null; then
    READY=1
    break
  fi
  sleep .2
done

if [[ "$READY" -ne 1 ]]; then
  echo "STOP: HTTP verification failed."
  tail -n 80 "$LOG" || true
  exit 20
fi

echo
echo "VANGUARD_HORIZONTAL_PROJECTIVE_REFRESH_OK"
echo "url=$URL"
echo "pose_order=80->62->61"
echo "slash=projected near/front -> far/rear"
echo "composite=back slash -> Vanguard -> front slash"

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
fi
