#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd /storage/emulated/0/Documents/GodotProjects/pose-lab-v2 || exit 1

TARGET="src/procedural-motion-preview.js"
TMP="$(mktemp)"

python3 - "$TARGET" "$TMP" <<'PY'
from pathlib import Path
import sys

target = Path(sys.argv[1])
tmp = Path(sys.argv[2])
s = target.read_text()

start = s.index("function buildSlash(){")
end = s.index("\nfunction stageOffsetX(){", start)

new_func = r'''function buildSlash(){
 function colorizeCanvas(c){
   const x=c.getContext('2d',{willReadFrequently:true});
   const pix=x.getImageData(0,0,c.width,c.height),pd=pix.data;
   const stops=recipe.effect.gradientStops.slice().sort((a,b)=>a.at-b.at);
   function colorFor(vv){
     const n=vv/255;let a=stops[0],b=stops[stops.length-1];
     for(let i=0;i<stops.length-1;i++){
       if(n>=stops[i].at&&n<=stops[i+1].at){a=stops[i];b=stops[i+1];break;}
     }
     const t=(b.at-a.at)?(n-a.at)/(b.at-a.at):0;
     return [0,1,2].map(k=>Math.round(lerp(a.rgb[k],b.rgb[k],t)));
   }
   for(let i=0;i<pd.length;i+=4){
     const vv=Math.max(pd[i],pd[i+1],pd[i+2]),rgb=colorFor(vv);
     pd[i]=rgb[0];pd[i+1]=rgb[1];pd[i+2]=rgb[2];
     pd[i+3]=Math.max(0,Math.min(255,Math.round(vv*recipe.effect.alphaGain)));
   }
   x.putImageData(pix,0,0);
   return c;
 }

 const sw=slash.naturalWidth||slash.width;
 const sh=slash.naturalHeight||slash.height;
 const c=document.createElement('canvas');
 c.width=sw;
 c.height=sh;
 const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(slash,0,0,sw,sh);

 const im=x.getImageData(0,0,c.width,c.height),d=im.data;
 let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
   const i=(y*c.width+xx)*4;
   const vv=Math.max(d[i],d[i+1],d[i+2]);
   if(vv>4){
     minX=Math.min(minX,xx);
     minY=Math.min(minY,y);
     maxX=Math.max(maxX,xx);
     maxY=Math.max(maxY,y);
   }
 }
 if(maxX<minX||maxY<minY)throw new Error('Empty slash atlas cell');

 const cropW=maxX-minX+1;
 const cropH=maxY-minY+1;
 const artW=Math.max(1,Number(recipe.effect.width||cropW));
 const artH=Math.max(1,Math.round(cropH*artW/cropW));

 // Global no-crop rule:
 // Preserve current visible art size. Add transparent breathing room
 // before reveal/depth transforms so neither pass can hard-crop the art.
 const pad=Math.max(64,Math.round(Math.max(artW,artH)*0.50));

 const art=document.createElement('canvas');
 art.width=artW;
 art.height=artH;
 art.getContext('2d').drawImage(
   c,minX,minY,cropW,cropH,
   0,0,artW,artH
 );

 const padded=document.createElement('canvas');
 padded.width=artW+pad*2;
 padded.height=artH+pad*2;
 padded.getContext('2d').drawImage(art,pad,pad);

 slashMap=colorizeCanvas(padded);
}'''

tmp.write_text(s[:start] + new_func + s[end:])
PY

cp "$TMP" "$TARGET"
rm -f "$TMP"

node --check "$TARGET"
git diff --check

CHANGED="$(git diff --name-only)"
if [ -n "$CHANGED" ] && [ "$CHANGED" != "$TARGET" ]; then
  echo "STOP: unexpected files changed:"
  printf '%s\n' "$CHANGED"
  exit 1
fi

git add "$TARGET"
git commit -m "Global no-crop rule for slash effects"
git push origin main

echo
echo "=== REFRESH ==="
LOG="$TMPDIR/pose-refresh.log"
bash tools/campaigns/vanguard-horizontal-projective-refresh.sh >"$LOG" 2>&1 || {
  cat "$LOG"
  exit 1
}
cat "$LOG"

echo
echo "=== RECEIPT ==="
HEAD="$(git rev-parse HEAD)"
echo "head=$HEAD"
echo "http://127.0.0.1:8766/motion.html?procedural=vanguard-horizontal-strike&rev=$HEAD"
