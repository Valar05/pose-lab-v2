#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,struct,sys
from pathlib import Path
from PIL import Image

root=Path(sys.argv[1]).resolve()
contract=json.loads((root/sys.argv[2]).read_text())
rp=root/'public/assets/vanguard/procedural/overhand-strike.recipe.json'
sp=root/'src/procedural-motion-preview.js'
ap=root/'public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png'
recipe=json.loads(rp.read_text())
renderer=sp.read_text()

def stop(m): raise SystemExit('STOP: '+m)

if [p['durationMs'] for p in recipe['phases']] != [25,45,45,30,25,70,70,95,90,105]: stop('accepted timing changed')
if recipe.get('comboHandoffMs') != 310: stop('accepted handoff changed')
if recipe.get('rootMotion') is not False: stop('rootMotion changed')
if recipe.get('canvas',{}).get('anchor') != [92,226]: stop('canvas anchor changed')
if recipe.get('stage',{}).get('centerX') != 220: stop('stage changed')
if recipe.get('bodyScale') != 1.5: stop('bodyScale changed')
for k,v in {'idle':2,'chamber':26,'commit':40,'preimpact':32,'contact':35}.items():
    if recipe['sources'][k]['cell'] != v: stop(f'{k} source cell changed')
if recipe['sources']['slash-right']['cell'] != 5: stop('slash source changed')
expected_blur={'idle':0.0,'anticipation':0.0,'chamber':0.0,'cross-commit':0.32,'lean-forward':1.0,'contact':0.46,'follow-through':0.08,'recoil-1':0.0,'recoil-2':0.0,'idle-return':0.0}
for pid,amount in expected_blur.items():
    p=next((q for q in recipe['phases'] if q['id']==pid),None)
    if not p or p.get('blur',{}).get('amount') != amount: stop(f'{pid} blur envelope changed')

repair=contract['assetRepair']
raw=ap.read_bytes()
if hashlib.sha256(raw).hexdigest()!=repair['inputSha256']: stop('unexpected speed-line input bytes')
if raw[:8]!=b'\x89PNG\r\n\x1a\n': stop('speed-line asset is not PNG')
w,h=struct.unpack('>II',raw[16:24])
if [w,h]!=repair['inputSize']: stop(f'unexpected speed-line input size {w}x{h}')
im=Image.open(ap).convert('RGBA')
fade_w=int(repair['fadeWidthPx'])
fixed=im.copy()
px=fixed.load()
for x in range(w-fade_w,w):
    t=(w-1-x)/max(1,fade_w-1)
    for y in range(h):
        r,g,b,a=px[x,y]
        px[x,y]=(r,g,b,round(a*t))
pad=int(repair['transparentPadRightPx'])
out=Image.new('RGBA',(w+pad,h),(0,0,0,0))
out.paste(fixed,(0,0))
out.save(ap)
if list(out.size)!=repair['outputSize']: stop('crop repair output size mismatch')
pixel_sha=hashlib.sha256(out.tobytes()).hexdigest()
if pixel_sha!=repair['outputPixelSha256']: stop('crop repair output pixel hash mismatch')

fx=recipe.get('speedLineSprite')
if not fx or not fx.get('enabled'): stop('speedLineSprite missing')
fx['manualScaleX']=1
fx['manualScaleY']=1

old=""" const sx=minX+(maxX-minX)*Math.max(0,Math.min(1,amount));
 const sy=Number(spec.scaleY??1);
 const alpha=Math.max(0,Math.min(1,Number(spec.alpha??0.78)))*amount;
"""
new=""" const sx=(minX+(maxX-minX)*Math.max(0,Math.min(1,amount)))*Number(spec.manualScaleX??1);
 const sy=Number(spec.scaleY??1)*Number(spec.manualScaleY??1);
 const alpha=Math.max(0,Math.min(1,Number(spec.alpha??0.78)))*amount;
"""
if old not in renderer: stop('speed-line scale block not found')
renderer=renderer.replace(old,new,1)

anchor='function installSlashControls(){'
idx=renderer.find(anchor)
if idx<0: stop('Slash Controls function not found')
speed_controls=r'''function installSpeedLineControls(){
 const side=document.querySelector('.side');
 if(!side||!recipe.speedLineSprite?.enabled||side.querySelector('[data-speed-line-controls]'))return;
 const fx=recipe.speedLineSprite;
 const box=document.createElement('details');
 box.open=true;
 box.setAttribute('data-speed-line-controls','');
 box.innerHTML=''
  +'<summary style="font-size:15px;margin-bottom:10px">Speed Line Controls</summary>'
  +'<div style="display:grid;grid-template-columns:92px 1fr 54px;gap:7px 8px;align-items:center;font-size:12px">'
  +'<label>X</label><input data-sp="x" type="range" min="-250" max="450" step="1"><output data-spout="x"></output>'
  +'<label>Y</label><input data-sp="y" type="range" min="-250" max="450" step="1"><output data-spout="y"></output>'
  +'<label>Scale X</label><input data-sp="sx" type="range" min=".1" max="4" step=".05"><output data-spout="sx"></output>'
  +'<label>Scale Y</label><input data-sp="sy" type="range" min=".1" max="4" step=".05"><output data-spout="sy"></output>'
  +'<label>Alpha</label><input data-sp="a" type="range" min="0" max="1" step=".01"><output data-spout="a"></output>'
  +'</div>'
  +'<div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">'
  +'<button data-sp-reset>Reset speed lines</button><button data-sp-copy>Copy speed-line values</button></div>';
 const firstDetails=side.querySelector('details');
 if(firstDetails)side.insertBefore(box,firstDetails); else side.appendChild(box);
 const defaults={position:[...(fx.position||[0,0])],manualScaleX:Number(fx.manualScaleX??1),manualScaleY:Number(fx.manualScaleY??1),alpha:Number(fx.alpha??.78)};
 const controls={x:box.querySelector('[data-sp="x"]'),y:box.querySelector('[data-sp="y"]'),sx:box.querySelector('[data-sp="sx"]'),sy:box.querySelector('[data-sp="sy"]'),a:box.querySelector('[data-sp="a"]')};
 function refresh(){for(const k of ['x','y','sx','sy','a'])box.querySelector('[data-spout="'+k+'"]').textContent=controls[k].value;}
 function setValues(){controls.x.value=fx.position?.[0]??0;controls.y.value=fx.position?.[1]??0;controls.sx.value=Number(fx.manualScaleX??1);controls.sy.value=Number(fx.manualScaleY??1);controls.a.value=Number(fx.alpha??.78);refresh();}
 function apply(){fx.position=[Number(controls.x.value),Number(controls.y.value)];fx.manualScaleX=Number(controls.sx.value);fx.manualScaleY=Number(controls.sy.value);fx.alpha=Number(controls.a.value);refresh();render(offset);}
 Object.values(controls).forEach(el=>{el.oninput=apply;el.onchange=apply;});
 box.querySelector('[data-sp-reset]').onclick=()=>{fx.position=[...defaults.position];fx.manualScaleX=defaults.manualScaleX;fx.manualScaleY=defaults.manualScaleY;fx.alpha=defaults.alpha;setValues();render(offset);};
 box.querySelector('[data-sp-copy]').onclick=async()=>{const payload={position:fx.position,manualScaleX:fx.manualScaleX,manualScaleY:fx.manualScaleY,alpha:fx.alpha};const txt=JSON.stringify(payload,null,2);try{await navigator.clipboard.writeText(txt)}catch{}console.log('SPEED_LINE_VALUES',txt);box.querySelector('[data-sp-copy]').textContent='Copied';setTimeout(()=>box.querySelector('[data-sp-copy]').textContent='Copy speed-line values',800);};
 setValues();
 window.__speedLineControls={box,controls};
}

'''
renderer=renderer[:idx]+speed_controls+renderer[idx:]

old_call=''' installSlashControls();
 render(0);
'''
new_call=''' installSlashControls();
 installSpeedLineControls();
 render(0);
'''
if old_call not in renderer: stop('control install boundary not found')
renderer=renderer.replace(old_call,new_call,1)

rp.write_text(json.dumps(recipe,indent=2)+'\n')
sp.write_text(renderer)

print('RIGHT_EDGE_CROP=FIXED_BY_ALPHA_TAPER_PLUS_TRANSPARENT_PAD')
print('SPEED_LINE_OUTPUT=169x72')
print('SLASH_CONTROLS=PRESERVED')
print('SPEED_LINE_CONTROLS=ADDED_SEPARATELY')
print('CONTROLS=X,Y,SCALE_X,SCALE_Y,ALPHA,COPY,RESET')
print('TIMING=LOCKED_600MS')
print('HANDOFF=LOCKED_310MS')
print('SLASH=LOCKED')
print('POSES=LOCKED')
print('BLUR_ENVELOPE=LOCKED')
