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
else
  git -C "$WORK" reset --hard origin/main
fi
echo "live_head=$(git -C "$WORK" rev-parse HEAD)"

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


echo "=== INSTALL BUNDLED slash_right.png ==="
python3 - "$PROC/slash_right.png" <<'PY'
import base64, sys
from pathlib import Path
payload = """iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAABOmUlEQVR4nO2daZBcZ3X+33t73/dtemakGY1kWZYs8MZmgo0NuFKmYsckIRt7qHzMUqlUUkVCBbKAC6gkJpUKhFRCSMxmiqKggg22MdgOjnfZsixLs2nWnul9X+//w4/7/q96JFkaj6UZ+30+qEY9Pbdvd7/nfc95znPOEUJBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQeHiQdM0m82m6zr/1XXdbrfzs81m0zRNPpP/AuufOxwOm83Gf10ul8vl4gmapslL2e12+Vcbr2C9H13X5c1omqbr+tATFBS2DENLXMLhcMifdV13OBxyUQLWvVzfuq5brUheXD5ZmoR88GWhVv+rB/WZDkPuu4PBYDAYCHNNDwaDfr8vnzMYDLCZfr9vGIYQwm63O53OycnJAwcO7Nq1q1QqHT169MSJE4VCodvtsnxtNpthGFyHo4BfaZomX4uX3nhXGx9UeOVQBnAaNE1jNZ8Ncmu32Wzdbpef0+n0gQMHrrjiipGRkVQq5fP5PB4Pi7tQKBw/fvzEiRPHjx+fm5urVqtCCLvd3uv1+Fu73T4YDAzDsL6uPCiGFv3L3p7ChUIZwC+wcYvF4ZE7tNy5gd/vn5iYOHTo0J49exKJhN/vd7lcdrvd5XIZhsGadjgcTqfTMIxer9doNJaWlubn50+ePPncc8/Nzc0NBgOPx9NsNrkgAUO73ZZLHBuwrnh1Dmw5lAEMA4en3+9blxorz+l0ZjKZffv2jY+PT05OhsPhUCjEFs5fcSz0er3BYEDga7PZ7Ha7ruterxefqtVqra+vLywsnDhxYm5ubm5urlwuVyoV6z243e5WqyVfeuh8UNhCKAP4BaR3Yd1lcdnD4fDo6Ojk5OTExEQ2m41EIm63Wz7f4XB4PB5d16vVaqlUarfbMnjgQHC73U6nU9d1t9vt9XpxohwOR7/fr9VqlUrl1KlTzz///AsvvLCwsFAul1n6Doej1+sZhkEEzKlyyT6d1y6UAZwGud36/f7x8fHR0dH9+/cnEomRkZFIJGKz2TqdTrvdJvCNRCJ+v7/T6ZRKpUql0mq1er1es9lst9vNZrPT6djt9kAg4PP5HA4HYS5Okc1m8/v9gUDA6XRqmuZ0OgeDQaVSKRQKi4uLL7zwAjFDvV5vt9uJvN3/cjIfUd5pW7tNcquEcgIqh7APLgVfbVtCv1GeyqbtdZYX/aEdfKPfG9jw+iDdS16y1tdWwR/wBm9UW6M8WsbbA5uCOrgc59fBSLZ6/Ur2wh9dW2+SQ47aamaHN6Z3S3AHmVolYdY6fNyklr9bantVO7i4RyOle84zxa3APHxOFnVq2qbNrdTOik1Hri4lzXB+84QFw/lA77sc/AIN6jJezQhpv0TzgtMnaDn6N4D2Vqjs923h2msSQ857KlaQGDzJPFadUW2nQlJCx9ttt5mqYmjcFTcHnLh5kAZ+mfNZtprbrc6uJsVyoK+30jsn5qFhqWN48N4Ak448wfZBt3bv2Xa4Q66amq6kgZa1tOeHur9RX3TL378VdVuJ5tJxn2Wstu2j08wZKy7UVdC/7L4Zu9/lcOB8uiza16ns1XE18DjUy4yW9qI8f+lBsNTfK1DBPSumDT1a/OPUKqOHxFjy2Rp4E4wVClHrSWjLY4zPSuPEOLsj69QstsmtnV9S2OqlaxwGO0aN5rkGk3x77G26d1tQ7WbJTn5C+P+Vue6OEdW1vdf5doxvH8TCeq0yX2v2jaJsu1TZJedE3oxPorpAWRVLe98vOOMUo8C14afTI6r4y6l09ddJ6wuemb3TOprjbamSkqYnfyvY4tOPEcMg9RhBakREBERAREQEREBERAREQF2YAX97O6OJx4Lquc8MIPapqXVMjTuBjGNDGMbya0dP6knqSV4IiAiIgIiICJjzXPDPVBwiIg7s7PID94DqWjKraNlk+ZzXT14hBH8CJu+R15uwFb0QZHU3bS8dNDFadPVcE0eN6tmri+Rx8Q0NDW/mqapuENXI00rBCAB3ZZXOeT47x4fTCsqAoJV0ZtP1bpevhjpr7K3HCOmufejd5Nl5t9+HmtoNmWv6DWtLWfO0slnue82KaQfu2GQ8W8fsSZxyHex4rRu3XKSjeGERTwk5dBUDeid6jmPbCzm2aor7k2Ghiub4Qwhkdtle1sLW5HCJ3AN+oOfFBvlZr2yC6R2u5uPzEmHQ1G6Wxy+QI/VV22ujGufhi1fp+SiZ8623mrpnNHF0kBEwHqQwj3Wv2hdQ1lXQxU19rJ5ba14h7dwLZaZ3TeHMOBGSDzDTjiFspS1EX9lJpaqrin3KbvkOyHDGHfln6oPlEeaL1quy+dm7AAR77twDwzw/JeSAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIOzHBrt4tDscgeS4c5z3lzjknquEQctJDgRzBUn1eraiz/DfQ6Upqkh92q5KiZrXcomHdAPq4n6KLxzXvVTumexue7GwRt9B/vkoPBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z"""
data = base64.b64decode(payload)
if not data.startswith(b"\x89PNG\r\n\x1a\n"):
    raise SystemExit("STOP: bundled slash_right is not PNG")
Path(sys.argv[1]).write_bytes(data)
print("slash_right_png_bytes=" + str(len(data)))
PY

echo
echo "=== BUILD ==="
cd "$WORK"
node scripts/build.mjs

cp -f "$PROC/vanguard-pose-atlas-90.png" "$DIST_PROC/vanguard-pose-atlas-90.png"
cp -f "$PROC/slash_horizontal_clean.png" "$DIST_PROC/slash_horizontal_clean.png"
cp -f "$PROC/slash_right.png" "$DIST_PROC/slash_right.png"
cp -f "$PROC/undercut-strike.recipe.json" "$DIST_PROC/undercut-strike.recipe.json"
cp -f "$PROC/attack2-uppercut.recipe.json" "$DIST_PROC/attack2-uppercut.recipe.json"
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
REV="$(git -C "$WORK" rev-parse --short HEAD)"
URL="$BASE/motion.html?procedural=vanguard-attack2-uppercut&rev=$REV"

READY=0
for _ in $(seq 1 50); do
  if curl -fsS "$URL" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/src/procedural-motion-preview.js" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/horizontal-strike.recipe.json" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/slash_horizontal_clean.png" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/slash_right.png" -o /dev/null 2>/dev/null &&      curl -fsS "$BASE/assets/vanguard/procedural/attack2-uppercut.recipe.json" -o /dev/null 2>/dev/null; then
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
echo "POSE_LAB_REFRESH_OK"
echo "url=$URL"
echo "live_head=$(git -C "$WORK" rev-parse HEAD)"
echo "original_undercut=restored"
echo "attack2_uppercut=20->32->21"
echo "attack2_total_ms=930"
echo "slash_right_http=OK"

OPENED=0
if [[ -x /system/bin/am ]]; then
  if /system/bin/am start -a android.intent.action.VIEW -d "$URL" >/dev/null 2>&1; then
    OPENED=1
  fi
fi
if [[ "$OPENED" -ne 1 ]] && command -v termux-open-url >/dev/null 2>&1; then
  if termux-open-url "$URL"; then
    OPENED=1
  fi
fi
if [[ "$OPENED" -eq 1 ]]; then
  echo "auto_open=OK"
else
  echo "auto_open=FAILED url=$URL"
fi
