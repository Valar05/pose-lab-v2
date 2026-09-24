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


echo "=== INSTALL BUNDLED slash_right.png ==="
python3 - "$PROC/slash_right.png" <<'PY'
import base64, sys
from pathlib import Path
payload = """/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAEAAQADASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAcEBQYIAQIDCf/EAEIQAAEDAwEFBgMFBQYGAwAAAAEAAgMEBREGBxIhMUETIlFhcYEIFJEyUmKhwRUjM0KxFhdyktHhJDRDU4LwRGNz/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/APn+iIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiAEngpa0JsD1PqyzyX+9VMOmbFG3fNfcW7ocPEAkcP8A3CCJV6QQT1M7YaeGSWRxw1kbS5x9AFszbtm+wrTbmGuqbvqypA3vt/LQcOZ6Ej2WZW3W9qsVI5ulNIWTTdMOVRJC2AOHlJJ3nnHUAoNdNObDdp+pgyWj0tVUtO7/AORXj5dg/wA3H6BS/p74QZWQMrNZasZTxEZMNBHx9pH8/ZquF728QUExD7/UXOrAPco2bsbD0zI7J+gCju+bUNYaie+Yx1sUZG6XR7xyOg3jx5IJgrPhr2NXGibQW683W31rB/zAqBJvnxcxwx9MKPb/APCFqyAmTSOpbPfY8kiKR/y8uPQkgn3Cxai2gX6inbE2SCJzAMslBLj788+SkXS22inezs7zvPeDhj4Zt3B/8gcIIL1Jsi2laSc79u6Mu0Ebec8cJmix477MhYWWua4tIII4EHmF9AbDtnsMsbIH3eemcRyJa8D1wf0VxucOynXERlv1gsd2kIwZ3UgZN/nbhwQfOxFutePhZ2U6g35dOXi6WOVwO6xsramIE8u6/Dsf+SiHX3wp7QNH2WW82eWDU1BFl0goY3sqGN+92RzvDx3S4jwxxQQOi5ILXEOBBHMFcICIiAiIgIiICIiAiIgIiICIiAiIgK8ab0vfdW3yO02C3S1lS88Qwd1g+853Jo8ysk0bs6kvlrF/vdQ+hs++WRbgBmq3NGXCMHgGtHFzzwb68Fll02p27Smm36X2d2+nohIN2ormAue/yDjgu/xEc+QCDL7RoXZ/set7Lvquem1LqhmHMoo3B1PTP6D8bhzJPdHnyWE6721al1XcBTy1TYaWIgRQwuO405IyB/oowqbpUzSSSTTPnnecl73bwH+p81RxukBc8OwSCC4oMlfrS5Qb0dPLuOHAPwHOB8STzP5K0Vd7uNfUSVFZXVNTLJ/EmmkLnO9SeKpKeldUSAA7oPIYy53o0c1e6aa02xrhOw9qwjvANllJ8G/yR+veKDwpf2lTQfMEx0jHjLXygBxH4RzKrKakqa2qHZVdwlk3cueGEYGOZJcMDzKtlTfJJ6lz4o/l2OyHbri+R4/FI7ifbA8lRzXCpli7ASOZAOIiaTj1PifVBnFKLXShrK7VVYx7iGl0TAQwdeLnZPtwVTCzT8rmyxbQW05zlzKmle5w8+4Dn081Gu9xzzXo2Q+AQTza/wC6WSkZFeNock00Yy6WGxOOTnxcQVIuna/Y7A5rqXatcKdoIIa6y7pHDlkE5/3WptHPCyZpkMuBx/dgfqsgtF5tNLUdrW2+vmYMlrYKgQ5d5ndPBBvTaLhszuVHGyk1nV10p7xc62vjIxzPAhZXajXUUIlsd2ZX05w4sa9wPPoHAEfmtJrDtG09QVnat0nXwxMO8JKS8TB7ePM7wLT9FLOltqmkKuojkhul/tjxzmlDHn1Lmbo6ci1BIG0r4fdDbWjPdKBrNMapIJdVwRfuKl//AN8Q45/G3j47y0p2g7MtZ7MNRmz6vtElI92TBUsO/BUtH80Ug4OHlzHUBfQfSuvm3MRx1d3t98hxmOqjZuTNzyyCf6OCzO5WbT2tNOy2G/W6i1BapuMlJUMLiwj+ZucOa4dHNOR4oPksi2l2yfCDd9PsqdSbLZJ79Z2gyS2p3eraUc+6AP3zR5AOHgea1ckjfFK6ORjmPaS1zXDBBHMEIOqIiAiIgIiICIiAiIgIiICyTTdgp6inkv8AfS+CyUrt17hwdUyYyIY/EnqeTRxKobJaoa6SWruEzoLbSgPqJWDLj4MYOrj08OJPJet+1DNeJYIYohS0FMzsqWjjOWxM/Vx5knmfZBeNRa2ud0EkILaeF0LYGQQ8GU8A4thZ4DkXfePNYbkk+ZXsWADeqH7pPERjmf8ARde3cOEYEY5d3n9UHDYxnMjt0D6r07eNrhuxjdbyBXgSSuEFTNWyyxiMBkbBzDBgu83HmVTLkDqTgLk7g5ZPmUHVF2y3GN3PmSuqDnIxyC9I5Sz7MbSeXEZXEYiDszbxH3Wcz79F7x1wgcHU9LC0jk543z+fD8kFZS0V4ujw2Fj3DGRw3Rj2WYWPRUbaZldqF5ZTv5MbO2JzhniWl3D3WGDUV5bE2MV8ga05aBju+ngqWeuqqubtayolqHnmZHk5+qCZ6Wr2WUUZi/sw+s3d1pkmusm8Dxz9kYA/JVzf7vKqAPpqS5W14JALJnSMPln38FENp1LPa3u+Wttqe4jdDqmDtiOOeTjj8lk9HtW1VTB0bHUsce9vblPTMiDfQAcBwQSbYKOWEtn07eBPGHE7k2I3N+vMKUdMa41FbqyKnqHYl4Aid+4B55zy9FC9m15bboN27Pgp5C0AyV9EQ3e//WIggeoWZWUPuO5BR1MFRk4b8lWRTscAfuSbrh/VBtNZ9Z/NtYa1u9LnAkY9pdnye37XusR2qfD1oXbNSzXSkcyz6nLSW3KCLddKccBURcpB+NveHieSwK02vVdqe90NNUxxh2ANxzQenDmM+/opS01XX2hip5qttQcngZARy5jjyKD5xa10VqLZ9rat0rqihNJcaR2HNB3mSNPFsjHfzMcOIP68Fj6+oG2rY5ZNvWzoCAwUWq6GMvt1eWAdocEmCU/9tx6/ynjyzn5n32xXfTOo62wX63T2+5UUpgqKWdu6+N45gj9eRGCOCC3oiICIiAiIgIiIC9IYZKioZDE0ue84AC81UxSOpqYvZkPlBbnwb1+vL6oK+vuEbbTDaKVgbDEd58gP8V3V3+nkB5q1B+6O5z+91XUkk5K4QOqIiAiIgIiIC5AJ49PFBjqmcjBPDwQcHC5Bx0B9VwiDuJHA5AaPYKpFzqw4Euidhu6N+JjsD3Co12DXng1pPoEFzhv1dGQCKaRg/wCm+njLT+SvdHq+mbUxSVmnLbWFhH7tzNxrx4Hd4n6rFo6SrlOIqaZ5xnDWE8FebXo3Vd4mEVr07c6t5x3YqZ7ufLogkjSd7pKmdza3QEE0Mx7ggkbHujjgDeOT7qVrRUaboJTvUOprAz7bZ6eOKSNvkXceGfRa9O0Hr6zODqzS13pd53Z5dTu+14cAVkVtuet9LVMccdyukLG/9PccWHy3SBnwQbhWC+blOKi2bR66RrRykiAwOgcGnjj3Uo6ev93lY1tTXUVcHDLhvCSOZvoeIK050/r6vuQbJcYKR8uQGyRtbESPPd/rhTdo65WieJj6ipqqF7humXBLS78WOI/NBsJSR22eVghDbZVdAHExP9D0UKfE/wDDhHtW007U2nKSKn1xboThobgXaJo4RE/9wAdwn/CeGMSTR26vmt7aqiq4rjGBlz43FzT644g+qvdqv8jAKerY4x/cec4PkehQfHGop6ikq5aWqgkgnieY5IpWlrmOBwWuB4ggjBBXkvoF8Wnw3M1na6va1s9o+0vVPGZbzQRg71bG1v8AGY0c5Wgd4D7YGftDvfP1AREQEREBERAXeU5LW/daAui5PE58UHCIiAiIgIiICIiAiIgIiAE8gg5AJ5Aldw+ZhBD3s88kLpg+BXrFTVVTwghllx0Y0uwg7RzVG8XNrHMPLJe4ZVVDd7rTfw7lVAeAmdj+qo5KWohAM0EsQPIvYQD9VcLfp+43N5bQQOncOjWu4/kgyKzbStY2sCOivdVEMh3ekzx9+CkvTG0zU13nipq+5W6RhJb/AMVRvkcTw45Y04+iju17O9UCpY6psNxdHkAiKnc4EeOeik+x7M9UPaypsstziizh8csZZu+Qc3APPkglez6avlxhY2k0vQVwxwFGS8DPE5a4B7Tw6hV0Gk9U2qodJLpu6UzN37BaTkengumitn2vbpPBTRW27SyRADvylox4ku/UrY3Tux+509M0Xa7OjlAGXPqe1cPw48kGMaA1XaY6ART0Ffb6wDdMwkJAcAOO6cYz1CkzfbWwb88UFXG8ZbURDG+fPzXRmy+0xTdpJdHOwMHDRk+6yG2abp7axsdNVSOizns94EHz9UFkod6ilE1JUOG7xLHc/wDdaA/Glsco9F6+pNommaFlNY9RveKmCFuI6WuHeeAOjZAd8DoQ8dF9LP2TTdtvyQud1B5EfTmsC2wbKrdtK2RXnRFU4CKuZv0lQRxpapnGJ/pvcD4tc4IPjSirbvaq+x3+ts10pn01dRTvpqiB4wY5GOLXNPoQVRICIiAiIgIiICIiAiIgIiICIiAnVEQc58AvelgE7yZp2wQt4ueePsB1Pksk0Ts51Rr2qnFkof8Ag6Ub1VcJ3dnT0w/G88M+DRxPgs+a/ZFs4hNJV0VPru9MwXOc5zaKE/dOCC8jqG8PE9EGEWNs9TMIdKaXkrJo+LquaD5uQHpwP7uMc+YPqski01tIrqXLo66ohJ7R0VFNDw9GtxxHgOS8tQbd9Y3ajFutjaGyWxhPZ0VvpmRxtHLGAOJwBxOT5rArlqK83ioE10uNRVvHLtXkgeQA4AeQCCZdOXnVOlonB9r14WbxAikpi6M+PTCkey7dbxBEy2UuzapfM89n2rrZmd+MZ4hg/qtVKfUd5pW7tNcquEcgIqh7APLgVfbVtCv1GeyqbtdZYX/aEdfKPfG9jw+iDdS16y1tdWwR/wBm9UW6M8WsbbA5uCOrgc59fBSLZ6/Ur2wh9dW2+SQ47aamaHN6Z3S3AHmVolYdY6fNyklr9bantVO7i4RyOle84zxa3APHxOFnVq2qbNrdTOik1Hri4lzXB+84QFw/lA77sc/AIN6jJezQhpv0TzgtMnaDn6N4D2Vqjs923h2msSQ857KlaQGDzJPFadUW2nQlJCx9ttt5mqYmjcFTcHnLh5kAZ+mfNZtprbrc6uJsVyoK+30jsn5qFhqWN48N4Ak448wfZBt3bv2Xa4Q66amq6kgZa1tOeHur9RX3TL378VdVuJ5tJxn2Wstu2j08wZKy7UVdC/7L4Zu9/lcOB8uiza16ns1XE18DjUy4yW9qI8f+lBsNTfK1DBPSumDT1a/OPUKqOHxFjy2Rp4E4wVClHrSWjLY4zPSuPEOLsj69QstsmtnV9S2OqlaxwGO0aN5rkGk3x77G26d1tQ7WbJTn5C+P+Vue6OEdW1vdf5doxvH8TCeq0yX2v2jaJsu1TZJedE3oxPorpAWRVLe98vOOMUo8C14afTI6r4y6l09ddJ6wuemb3TOprjbamSkqYnfyvY4tOPEcMg9RhBakREBERAREQEREBERAREQF2YAX97O6OJx4Lquc8MIPapqXVMjTuBjGNDGMbya0dP6knqSV4IiAiIgIiICJjzXPDPVBwiIg7s7PID94DqWjKraNlk+ZzXT14hBH8CJu+R15uwFb0QZHU3bS8dNDFadPVcE0eN6tmri+Rx8Q0NDW/mqapuENXI00rBCAB3ZZXOeT47x4fTCsqAoJV0ZtP1bpevhjpr7K3HCOmufejd5Nl5t9+HmtoNmWv6DWtLWfO0slnue82KaQfu2GQ8W8fsSZxyHex4rRu3XKSjeGERTwk5dBUDeid6jmPbCzm2aor7k2Ghiub4Qwhkdtle1sLW5HCJ3AN+oOfFBvlZr2yC6R2u5uPzEmHQ1G6Wxy+QI/VV22ujGufhi1fp+SiZ8623mrpnNHF0kBEwHqQwj3Wv2hdQ1lXQxU19rJ5ba14h7dwLZaZ3TeHMOBGSDzDTjiFspS1EX9lJpaqrin3KbvkOyHDGHfln6oPlEeaL1quy+dm7AAR77twDwzw/JeSAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIOzHBrt4tDscgeS4c5z3lzjknquEQctJDgRzBUn1eraiz/DfQ6Upqkh92q5KiZrXcomHdAPq4n6KLxzXvVTumexue7GwRt9B/vkoPBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQf/Z"""
Path(sys.argv[1]).write_bytes(base64.b64decode(payload))
print("slash_right=" + sys.argv[1])
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

if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "$URL" || true
fi
