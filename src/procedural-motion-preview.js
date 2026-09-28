import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const requested=params.get('procedural');
const animation=requested==='vanguard-jump'
  ? 'vanguard-jump'
  : requested==='vanguard-midair'
  ? 'vanguard-midair'
  : requested==='vanguard-land'
  ? 'vanguard-land'
  : requested==='vanguard-shotgun-reload'
  ? 'vanguard-shotgun-reload'
  : requested==='vanguard-shotgun-fire'
  ? 'vanguard-shotgun-fire'
  : requested==='vanguard-shoulder-charge'
  ? 'vanguard-shoulder-charge'
  : requested==='vanguard-butt-smash'
  ? 'vanguard-butt-smash'
  : requested==='vanguard-attack5'
  ? 'vanguard-attack5'
  : requested==='vanguard-undercut-strike'
  ? 'vanguard-undercut-strike'
  : requested==='vanguard-attack2-uppercut'
    ? 'vanguard-attack2-uppercut'
    : requested==='vanguard-horizontal-strike'
      ? 'vanguard-horizontal-strike'
      : 'vanguard-overhand-strike';
const isJump=animation==='vanguard-jump';
const isMidair=animation==='vanguard-midair';
const isLand=animation==='vanguard-land';
const isShotgunReload=animation==='vanguard-shotgun-reload';
const isShotgunFire=animation==='vanguard-shotgun-fire';
const isShoulderCharge=animation==='vanguard-shoulder-charge';
const isButtSmash=animation==='vanguard-butt-smash';
const isAttack5=animation==='vanguard-attack5';
const isUndercut=animation==='vanguard-undercut-strike';
const isAttack2=animation==='vanguard-attack2-uppercut';
const isHorizontal=animation==='vanguard-horizontal-strike';
const ui=createProceduralReviewShell({
  title:isJump?'Vanguard Jump':isMidair?'Vanguard Mid-Air':isLand?'Vanguard Land':isShotgunReload?'Vanguard Shotgun Reload':isShotgunFire?'Vanguard Shotgun Fire':isShoulderCharge?'Vanguard Shoulder Charge':isButtSmash?'Vanguard Butt Smash':isAttack5?'Vanguard Attack 5':isHorizontal?'Vanguard Horizontal Slash':isAttack2?'Vanguard Attack 2 Uppercut':isUndercut?'Vanguard Undercut Strike':'Vanguard Overhand Strike',
  animation,
  accent:'#ffbd4a'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]'),phaseEl=q('[data-phase]'),timeEl=q('[data-time]'),kv=q('[data-kv]');
let recipe,atlas,slash,slashMap,speedLines,playing=true,start=performance.now(),offset=0,total=1,phases=[];
const cache=new Map(),clamp=v=>Math.max(0,Math.min(1,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});
function rect(spec,cell){const idx=cell-(spec.indexBase||0),c=idx%spec.columns,r=Math.floor(idx/spec.columns);const x0=Math.round(c*atlas.naturalWidth/spec.columns),x1=Math.round((c+1)*atlas.naturalWidth/spec.columns),explicit=spec.rowBounds?.[String(r)],y0=explicit?Number(explicit[0]):Math.round(r*atlas.naturalHeight/spec.rows),y1=explicit?Number(explicit[1]):Math.round((r+1)*atlas.naturalHeight/spec.rows);return[x0,y0,x1-x0,y1-y0]}
function body(sourceId){
 if(cache.has(sourceId))return cache.get(sourceId);
 const src=recipe.sources[sourceId],spec=recipe.atlases[src.atlas];
 let [sx,sy,sw,sh]=rect(spec,src.cell);
 if(Array.isArray(src.sourceRect)&&src.sourceRect.length===4){
  const [rx,ry,rw,rh]=src.sourceRect.map(Number);
  if(![rx,ry,rw,rh].every(Number.isFinite)||rw<=0||rh<=0)throw new Error('Invalid sourceRect for '+sourceId);
  if(rx<0||ry<0||rx+rw>sw||ry+rh>sh)throw new Error('sourceRect escapes atlas cell for '+sourceId);
  sx+=rx;sy+=ry;sw=rw;sh=rh;
 }

 const raw=document.createElement('canvas');
 raw.width=sw;raw.height=sh;
 const rc=raw.getContext('2d',{willReadFrequently:true});
 rc.drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);

 const im=rc.getImageData(0,0,sw,sh),d=im.data;
 let minX=sw,minY=sh,maxX=-1,maxY=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];
   if(B>110&&B>R+35&&B>G+35){d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0;}
   if(d[i+3]>8){
     minX=Math.min(minX,x);minY=Math.min(minY,y);
     maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   }
 }
 // Optional source-local cleanup for opaque-black sprite sheets.
 // Default is OFF, so every existing locked animation is behavior-identical.
 if(src.backgroundKey==='black-border'){
  const threshold=Number(src.backgroundKeyThreshold??18);
  const seen=new Uint8Array(sw*sh),stack=[];
  const isBg=(x,y)=>{
   const i=(y*sw+x)*4;
   return d[i+3]>8 && Math.max(d[i],d[i+1],d[i+2])<=threshold;
  };
  const push=(x,y)=>{
   const i=y*sw+x;
   if(seen[i]||!isBg(x,y))return;
   seen[i]=1;stack.push([x,y]);
  };
  for(let x=0;x<sw;x++){push(x,0);push(x,sh-1);}
  for(let y=0;y<sh;y++){push(0,y);push(sw-1,y);}
  while(stack.length){
   const [x,y]=stack.pop(),di=(y*sw+x)*4;
   d[di+3]=0;
   if(x>0)push(x-1,y);
   if(x+1<sw)push(x+1,y);
   if(y>0)push(x,y-1);
   if(y+1<sh)push(x,y+1);
  }
  minX=sw;minY=sh;maxX=-1;maxY=-1;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const i=(y*sw+x)*4;
   if(d[i+3]>8){
    minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   }
  }
 }

 if(src.isolateLargestComponent){
   const seen=new Uint8Array(sw*sh),components=[];
   const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
     const pi=y*sw+x;
     if(seen[pi]||d[pi*4+3]<=8)continue;
     const stack=[[x,y]],pixels=[];seen[pi]=1;
     while(stack.length){
       const [cx,cy]=stack.pop(),ci=cy*sw+cx;
       pixels.push(ci);
       for(const [dx,dy] of neighbors){
         const nx=cx+dx,ny=cy+dy;
         if(nx<0||ny<0||nx>=sw||ny>=sh)continue;
         const ni=ny*sw+nx;
         if(seen[ni]||d[ni*4+3]<=8)continue;
         seen[ni]=1;stack.push([nx,ny]);
       }
     }
     components.push(pixels);
   }
   components.sort((a,b)=>b.length-a.length);
   const keep=new Uint8Array(sw*sh);
   if(components[0])for(const i of components[0])keep[i]=1;
   minX=sw;minY=sh;maxX=-1;maxY=-1;
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
     const i=y*sw+x,di=i*4;
     if(!keep[i])d[di+3]=0;
     if(d[di+3]>8){
       minX=Math.min(minX,x);minY=Math.min(minY,y);
       maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
     }
   }
 }
 rc.putImageData(im,0,0);
 if(maxX<minX)throw new Error('Empty atlas cell '+src.cell);

 if(src.anchorMode==='explicit-point' && Array.isArray(src.anchorPoint)){
   const item={
     canvas:raw,
     anchor:[Number(src.anchorPoint[0]),Number(src.anchorPoint[1])],
     cell:src.cell,
     cellGeometry:true,
     bodyScale:1
   };
   cache.set(sourceId,item);
   return item;
 }

 // Horizontal Slash uses a common atlas-cell coordinate system.
 // Do NOT independently trim its authored poses or their apparent height/grounding drifts.
 if(src.anchorMode==='ground-contact-center'){
   // Preserve native atlas scale. Use the actual lowest occupied foreground row
   // as the common ground line, and center on the foreground touching that row.
   const groundY=maxY;
   const bandTop=Math.max(minY,groundY-5);
   let sumX=0,countX=0;
   for(let y=bandTop;y<=groundY;y++){
     for(let x=minX;x<=maxX;x++){
       if(d[(y*sw+x)*4+3]>8){sumX+=x;countX++;}
     }
   }
   const groundX=countX?Math.round(sumX/countX):Math.round((minX+maxX)/2);
   const item={
     canvas:raw,
     anchor:[groundX,groundY],
     cell:src.cell,
     cellGeometry:true,
     bodyScale:1
   };
   cache.set(sourceId,item);
   return item;
 }

 const trim=document.createElement('canvas');
 trim.width=maxX-minX+1;trim.height=maxY-minY+1;
 trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);

 let anchorX=Math.round(trim.width/2),anchorY=trim.height-1;
 if(src.anchorMode==='rear-foot-left'){
   const td=trim.getContext('2d',{willReadFrequently:true}).getImageData(0,0,trim.width,trim.height).data;
   const band=Math.min(16,trim.height),y0=trim.height-band;let spans=[],spanStart=null;
   for(let x=0;x<trim.width;x++){
     let hit=false;
     for(let y=y0;y<trim.height;y++){if(td[(y*trim.width+x)*4+3]>8){hit=true;break;}}
     if(hit&&spanStart===null)spanStart=x;
     if(!hit&&spanStart!==null){spans.push([spanStart,x-1]);spanStart=null;}
   }
   if(spanStart!==null)spans.push([spanStart,trim.width-1]);
   const span=spans[0]||[0,trim.width-1];let sum=0,count=0,rearY=y0;
   for(let x=span[0];x<=span[1];x++)for(let y=y0;y<trim.height;y++){
     if(td[(y*trim.width+x)*4+3]>8){sum+=x;count++;rearY=Math.max(rearY,y);}
   }
   anchorX=count?Math.round(sum/count):span[0];
   anchorY=count?rearY:trim.height-1;
 }

 const item={canvas:trim,anchor:[anchorX,anchorY],cell:src.cell};
 cache.set(sourceId,item);
 return item;
}
function phaseAt(ms){let a=0;for(let i=0;i<phases.length;i++){const p=phases[i];if(ms<a+p.durationMs||i===phases.length-1)return{p,i,u:clamp((ms-a)/p.durationMs)};a+=p.durationMs}}
function iv(i,u,key,name){const a=phases[i],b=phases[Math.min(phases.length-1,i+1)],fallback=key==='deform'?({shearX:0,scaleX:1,scaleY:1,shiftX:0,shiftY:0}[name]):0;return lerp(Number(a[key]?.[name]??fallback),Number(b[key]?.[name]??a[key]?.[name]??fallback),ease(u))}
function effectCell(image,spec,cell){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const explicit=spec.rects?.[String(cell)];
 let x0,y0,x1,y1;
 if(explicit){
   x0=Math.round(Number(explicit[0]));y0=Math.round(Number(explicit[1]));
   x1=Math.round(x0+Number(explicit[2]));y1=Math.round(y0+Number(explicit[3]));
 }else{
   const idx=cell-(spec.indexBase||0),c=idx%spec.columns,r=Math.floor(idx/spec.columns);
   x0=Math.round(c*iw/spec.columns);x1=Math.round((c+1)*iw/spec.columns);
   y0=Math.round(r*ih/spec.rows);y1=Math.round((r+1)*ih/spec.rows);
 }
 const out=document.createElement('canvas');
 out.width=x1-x0;out.height=y1-y0;
 out.getContext('2d').drawImage(image,x0,y0,out.width,out.height,0,0,out.width,out.height);



  /*
   * Optional vector lasso for irregular effect sprites.
   *
   * Points are expressed in ORIGINAL ATLAS coordinates.
   * Pixels outside the polygon become transparent.
   */
  const lassoSource=
    recipe?.sources?.[recipe?.effect?.source]||{};

  if(
    Array.isArray(lassoSource.effectLasso) &&
    lassoSource.effectLasso.length>=3
  ){
    const lx=out.getContext(
      '2d',
      {willReadFrequently:true}
    );

    const original=lx.getImageData(
      0,0,out.width,out.height
    );

    /*
     * Canvas clip gives us a clean vector mask.
     * Polygon coordinates are converted from atlas-space
     * to this extracted cell's local coordinates.
     */
    const masked=document.createElement('canvas');

    masked.width=out.width;
    masked.height=out.height;

    const mc=masked.getContext('2d');

    mc.save();
    mc.beginPath();

    lassoSource.effectLasso.forEach(
      (pt,index)=>{
        const px=Number(pt[0])-x0;
        const py=Number(pt[1])-y0;

        if(index===0){
          mc.moveTo(px,py);
        }else{
          mc.lineTo(px,py);
        }
      }
    );

    mc.closePath();
    mc.clip();

    mc.drawImage(out,0,0);

    mc.restore();

    lx.clearRect(
      0,0,out.width,out.height
    );

    lx.drawImage(masked,0,0);
  }

 return out;
}
function buildSlash(){
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
 c.width=sw;c.height=sh;
 const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(slash,0,0,sw,sh);

 const im=x.getImageData(0,0,c.width,c.height),d=im.data;
 let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
   const i=(y*c.width+xx)*4,vv=Math.max(d[i],d[i+1],d[i+2]);
   if(vv>4){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y);}
 }
 if(maxX<minX||maxY<minY)throw new Error('Empty slash atlas cell');

 const source=recipe.sources?.[recipe.effect?.source]||{};
 const preserveCellBounds=source.preserveCellBounds===true;

 const cropX=preserveCellBounds?0:minX;
 const cropY=preserveCellBounds?0:minY;
 const cropW=preserveCellBounds?sw:(maxX-minX+1);
 const cropH=preserveCellBounds?sh:(maxY-minY+1);

 const crop=document.createElement('canvas');
 crop.width=cropW;
 crop.height=cropH;
 crop.getContext('2d').drawImage(
   c,cropX,cropY,cropW,cropH,0,0,cropW,cropH
 );

 const w=preserveCellBounds?sw:Math.max(1,Number(recipe.effect.width||cropW));
 const h=preserveCellBounds?sh:Math.max(1,Math.round(cropH*w/cropW));

 const o=document.createElement('canvas');
 o.width=w;
 o.height=h;
 o.getContext('2d').drawImage(crop,0,0,w,h);

 slashMap=colorizeCanvas(o);
}
function stageOffsetX(){
 const key=recipe.stage?.centerSource||'idle',it=body(key),[px]=recipe.canvas.anchor;
 const bodyScale=Number(recipe.bodyScale??1);
 const localCenter=px-it.anchor[0]*bodyScale+(it.canvas.width*bodyScale)/2;
 return (recipe.stage?.centerX??215)-localCenter;
}
function drawBody(id,d,blurAmount=0){
 const it=body(id),[px,py]=recipe.canvas.anchor;
 const src=recipe.sources[id]||{};
 const reg=src.registrationOffset||[0,0];
 const bodyScale=Number(recipe.bodyScale??1);
 const drawPass=(offsetX=0,offsetY=0,alpha=1,filter='none')=>{
   ctx.save();
   ctx.globalAlpha=alpha;
   ctx.filter=filter;
   ctx.translate(stageOffsetX(),0);
   ctx.translate(px+Number(reg[0]||0)+offsetX,py+Number(reg[1]||0)+offsetY);
   ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
   ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
   ctx.restore();
 };
 const blur=recipe.motionBlur;
 if(blur?.enabled && blurAmount>0){
   const samples=Math.max(1,Math.round(Number(blur.samples??4)));
   const span=Math.max(0,Number(blur.spanPx??28));
   const filterPx=Math.max(0,Number(blur.filterPx??2));
   const maxAlpha=Math.max(0,Math.min(1,Number(blur.maxAlpha??.32)));
   const direction=Array.isArray(blur.directionStage)?blur.directionStage:[-1,0];
   const dx=Number(direction[0]??-1),dy=Number(direction[1]??0);
   for(let n=samples;n>=1;n--){
     const t=n/samples;
     const alpha=blurAmount*maxAlpha*(1-.52*t);
     drawPass(dx*span*t,dy*span*t,alpha,filterPx?('blur('+filterPx+'px)'):'none');
   }
   if(recipe.speedLineSprite?.enabled){
     drawSpeedLineSprite(px,py,reg,d,bodyScale,blurAmount);
   }
   const primaryFilterPx=Math.max(0,Number(blur.primaryFilterPx??0))*blurAmount;
   ctx.save();
   ctx.globalAlpha=1;
   ctx.filter=primaryFilterPx?('blur('+primaryFilterPx+'px)'):'none';
   ctx.translate(stageOffsetX(),0);
   ctx.translate(px+Number(reg[0]||0),py+Number(reg[1]||0));
   ctx.transform((d.scaleX||1)*bodyScale,0,d.shearX,(d.scaleY||1)*bodyScale,d.shiftX||0,d.shiftY||0);
   ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
   ctx.restore();
   return;
 }
 drawPass();
}

function drawSpeedLineSprite(px,py,reg,d,bodyScale,amount){
 const spec=recipe.speedLineSprite||{};
 if(!spec.enabled||!speedLines||amount<=0)return;
 const pos=Array.isArray(spec.position)?spec.position:[20,-68];
 const minX=Number(spec.minScaleX??0.58);
 const maxX=Number(spec.maxScaleX??1);
 const sx=minX+(maxX-minX)*Math.max(0,Math.min(1,amount));
 const sy=Number(spec.scaleY??1);
 const alpha=Math.max(0,Math.min(1,Number(spec.alpha??0.78)))*amount;

 ctx.save();
 ctx.globalAlpha=alpha;
 ctx.imageSmoothingEnabled=spec.imageSmoothing!==false;
 ctx.translate(stageOffsetX(),0);
 ctx.translate(px+Number(reg[0]||0)+Number(pos[0]||0),py+Number(reg[1]||0)+Number(pos[1]||0));
 const inheritedScale=spec.inheritBodyScale===false?1:bodyScale;
 ctx.transform((d.scaleX||1)*inheritedScale,0,d.shearX,(d.scaleY||1)*inheritedScale,d.shiftX||0,d.shiftY||0);
 ctx.scale(sx,sy);
 // The source converges at its right edge, so pin that edge to Vanguard's back.
 ctx.drawImage(speedLines,-speedLines.width,-speedLines.height/2);
 ctx.restore();
}

function revealOriginFor(sourceId){
 const it=body(sourceId);
 const src=recipe.sources[sourceId]||{};
 const canvas=it.canvas;
 const data=canvas.getContext('2d',{willReadFrequently:true})
   .getImageData(0,0,canvas.width,canvas.height).data;

 let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;

 for(let y=0;y<canvas.height;y++){
   for(let x=0;x<canvas.width;x++){
     if(data[(y*canvas.width+x)*4+3]>8){
       minX=Math.min(minX,x);
       minY=Math.min(minY,y);
       maxX=Math.max(maxX,x);
       maxY=Math.max(maxY,y);
     }
   }
 }

 if(maxX<minX||maxY<minY){
   return [
     stageOffsetX()+recipe.canvas.anchor[0],
     recipe.canvas.anchor[1]
   ];
 }

 // The head is the upper occupied portion of the body.
 // Use the median occupied X in the top quarter to avoid
 // weapon/limb outliers and keep the origin tied to the sprite.
 const headLimit=minY+(maxY-minY)*0.26;
 const xs=[];
 let ySum=0,yCount=0;

 for(let y=minY;y<=headLimit;y++){
   for(let x=minX;x<=maxX;x++){
     if(data[(y*canvas.width+x)*4+3]>8){
       xs.push(x);
       ySum+=y;
       yCount++;
     }
   }
 }

 if(!xs.length){
   xs.push(Math.round((minX+maxX)/2));
   ySum=minY+(maxY-minY)*0.12;
   yCount=1;
 }

 xs.sort((a,b)=>a-b);
 const headX=xs[Math.floor(xs.length/2)];
 const headY=ySum/yCount;

 const bodyScale=Number(recipe.bodyScale??1);
 const stageX=stageOffsetX()
   +recipe.canvas.anchor[0]
   +(headX-Number(src.anchorPoint?.[0]??it.anchor[0]))*bodyScale;

 const stageY=recipe.canvas.anchor[1]
   +(headY-Number(src.anchorPoint?.[1]??it.anchor[1]))*bodyScale;

 return [stageX,stageY];
}

function drawSlash(e,layerName='front'){
 if(!e||!slashMap)return;

 const spec=recipe.effect||{};
 const hasDepthSplit=Number.isFinite(Number(spec.depthSplit));
 if(!hasDepthSplit && layerName==='back')return;
 const image=slashMap;
 const x=Number(spec.position?.[0]??0);
 const y=Number(spec.position?.[1]??0);
 const reveal=clamp(Number(e.reveal??0));
 if(reveal<=0)return;

 const split=hasDepthSplit?Math.max(.05,Math.min(.95,Number(spec.depthSplit))):.5;
 const art=image.__art||{x:0,y:0,width:image.width,height:image.height};
 const px=Number(art.pivotX??(art.x+art.width*(spec.revealPivot?.[0]??.5)));
 const py=Number(art.pivotY??(art.y+art.height*(spec.revealPivot?.[1]??.5)));

 const rotZ=Number(spec.rotateZDeg??0)*Math.PI/180;
 const tiltX=Number(spec.tiltXDeg??0)*Math.PI/180;
 const yawY=Number(spec.yawYDeg??0)*Math.PI/180;
 const sx=Number(spec.scaleX??1);
 const sy=Number(spec.scaleY??1)*(spec.flipY?-1:1);

 // Keep normal 2D Rotate Z separate from pseudo-3D controls.
 // Tilt X compresses Y; Yaw Y adds horizontal projective shear.
 const pseudoScaleY=Math.max(.06,Math.abs(Math.cos(tiltX)));
 const pseudoShearX=Math.tan(yawY)*.65;

 const start=Number(spec.revealStartDeg??0)*Math.PI/180;
 const sweep=Number(spec.revealSweepDeg??180)*Math.PI/180;
 const end=spec.revealCounterClockwise===false
   ? start+sweep*reveal
   : start-sweep*reveal;

 function passImage(color){
   let source=image;
   if(spec.flipX){
     const mirrored=document.createElement('canvas');
     mirrored.width=image.width;
     mirrored.height=image.height;
     const mc=mirrored.getContext('2d');
     mc.translate(image.width,0);
     mc.scale(-1,1);
     mc.drawImage(image,0,0);
     source=mirrored;
   }
   if(!color)return source;
   const tint=document.createElement('canvas');
   tint.width=image.width;
   tint.height=image.height;
   const tc=tint.getContext('2d');
   tc.drawImage(source,0,0);
   tc.globalCompositeOperation='source-in';
   tc.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;
   tc.fillRect(0,0,tint.width,tint.height);
   return tint;
 }

 const radius=Math.hypot(image.width,image.height)*2.5;
 const backIsLeft=(spec.backSide||'left')==='left';
 const passes=[
   {a:e.wideGlow*spec.wideOpacity,b:spec.wideBlurPx,color:spec.wideGlowRgb},
   {a:e.tightGlow*spec.tightOpacity,b:spec.tightBlurPx,color:spec.tightGlowRgb},
   {a:e.core,b:0,color:null}
 ];

 ctx.save();

 // Radial reveal is deliberately created in stage coordinates.
 // Its origin is Vanguard's head, not the slash pivot.
 if(spec.revealMode==='radial'){
   const origin=revealOriginFor(spec.revealOriginBody||'commit');
   ctx.beginPath();
   ctx.arc(
     origin[0],
     origin[1],
     Math.max(0,radius*reveal),
     0,
     Math.PI*2
   );
   ctx.clip();
 }

 ctx.translate(stageOffsetX()+x+px,y+py);
 ctx.rotate(rotZ);
 ctx.scale(sx,sy);
 ctx.transform(1,0,pseudoShearX,pseudoScaleY,0,0);

 // "none" means no reveal clipping.
 if(spec.revealMode!=='none' && spec.revealMode!=='radial'){
   ctx.beginPath();
   ctx.moveTo(0,0);
   ctx.arc(0,0,radius,start,end,spec.revealCounterClockwise!==false);
   ctx.closePath();
   ctx.clip();
 }

 // Optional depth split. Without one, the front pass draws the whole slash.
 if(hasDepthSplit){
   ctx.beginPath();
   const splitX=-px+Number(art.x)+Number(art.width)*split;
   if(layerName==='back'){
     if(backIsLeft){
       ctx.rect(-px+Number(art.x)-8,-py+Number(art.y)-8,Number(art.width)*split+16,Number(art.height)+16);
     }else{
       ctx.rect(splitX-8,-py+Number(art.y)-8,Number(art.width)*(1-split)+16,Number(art.height)+16);
     }
   }else{
     if(backIsLeft){
       ctx.rect(splitX-8,-py+Number(art.y)-8,Number(art.width)*(1-split)+16,Number(art.height)+16);
     }else{
       ctx.rect(-px+Number(art.x)-8,-py+Number(art.y)-8,Number(art.width)*split+16,Number(art.height)+16);
     }
   }
   ctx.clip();
 }

 for(const q of passes){
   if(q.a<=0)continue;
   ctx.save();
   ctx.globalAlpha=q.a;
   ctx.filter=q.b?`blur(${q.b}px)`:'none';
   ctx.drawImage(passImage(q.color),-px,-py);
   ctx.restore();
 }
 ctx.restore();
}
function render(ms){
 const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},b=iv(i,u,'blur','amount'),e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null; if(window.__slashControls?.controls?.full?.checked&&e){e.reveal=1;e.core=1;e.tightGlow=1;e.wideGlow=.7;}
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle='#000';
 ctx.fillRect(0,0,canvas.width,canvas.height);

 drawSlash(e,'back');
 drawBody(p.source,d,b);
 drawSlash(e,'front');

 phaseEl.textContent=p.id;
 timeEl.textContent=Math.round(ms)+' / '+total+' ms';
 scrub.value=String(ms/total);
 const src=recipe.sources[p.source];
 kv.innerHTML=`<div>Atlas cell</div><div>${src.cell??''}</div><div>Shear X</div><div>${d.shearX.toFixed(3)}</div><div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){let ms=offset;if(playing)ms=(offset+(now-start))%total;render(ms);requestAnimationFrame(loop)}
play.onclick=()=>{if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}else{start=performance.now();playing=true;play.textContent='❚❚'}};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

function installShotgunBlastMoveScaleControls(side){
 const box=document.createElement('details');
 box.open=true;
 box.setAttribute('data-slash-controls','');
 box.innerHTML=
   '<summary style="font-size:15px;margin-bottom:10px">Shotgun Blast Controls</summary>'+
   '<div style="display:grid;grid-template-columns:92px 1fr 54px;gap:7px 8px;align-items:center;font-size:12px">'+
   '<label>X</label><input data-hc="x" type="range" min="-250" max="450" step="1"><output data-out="x"></output>'+
   '<label>Y</label><input data-hc="y" type="range" min="-250" max="450" step="1"><output data-out="y"></output>'+
   '<label>Scale X</label><input data-hc="sx" type="range" min="-3" max="3" step=".05"><output data-out="sx"></output>'+
   '<label>Scale Y</label><input data-hc="sy" type="range" min="-3" max="3" step=".05"><output data-out="sy"></output>'+
   '</div>'+
   '<div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">'+
   '<button data-hc-reset>Reset move/scale</button><button data-hc-copy>Copy values</button></div>';
 side.insertBefore(box,side.querySelector('details'));
 const fx=recipe.effect;
 const defaults={position:[...(fx.position||[0,0])],scaleX:Number(fx.scaleX??1),scaleY:Number(fx.scaleY??1)};
 const controls={
   x:box.querySelector('[data-hc="x"]'),y:box.querySelector('[data-hc="y"]'),
   sx:box.querySelector('[data-hc="sx"]'),sy:box.querySelector('[data-hc="sy"]')
 };
 function refresh(){for(const k of ['x','y','sx','sy'])box.querySelector('[data-out="'+k+'"]').textContent=controls[k].value}
 function setValues(){
   controls.x.value=fx.position?.[0]??0;controls.y.value=fx.position?.[1]??0;
   controls.sx.value=Number(fx.scaleX??1);controls.sy.value=Number(fx.scaleY??1);refresh();
 }
 function apply(){
   fx.position=[Number(controls.x.value),Number(controls.y.value)];
   const sx=Number(controls.sx.value),sy=Number(controls.sy.value);
   fx.scaleX=Math.abs(sx)<.01?.01:sx;fx.scaleY=Math.abs(sy)<.01?.01:sy;
   refresh();render(offset);
 }
 Object.values(controls).forEach(el=>{el.oninput=apply;el.onchange=apply});
 box.querySelector('[data-hc-reset]').onclick=()=>{
   fx.position=[...defaults.position];fx.scaleX=defaults.scaleX;fx.scaleY=defaults.scaleY;setValues();render(offset);
 };
 box.querySelector('[data-hc-copy]').onclick=async()=>{
   const text=JSON.stringify({position:fx.position,scaleX:fx.scaleX,scaleY:fx.scaleY},null,2);
   try{await navigator.clipboard.writeText(text)}catch{} console.log('SHOTGUN_BLAST_VALUES',text);
 };
 setValues();
 window.__slashControls={box,controls};
}

function installSlashControls(){
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-slash-controls]'))return;
 if(recipe.effect?.liveControls===false)return;
 if(recipe.id==='vanguard-shotgun-fire-procedural-v1'&&recipe.effect?.controlProfile==='move-scale-only'){
   installShotgunBlastMoveScaleControls(side);
   return;
 }

 const box=document.createElement('details');
 box.open=true;
 box.setAttribute('data-slash-controls','');
 box.innerHTML=`
   <summary style="font-size:15px;margin-bottom:10px">Slash Controls</summary>
   <div style="display:grid;grid-template-columns:92px 1fr 54px;gap:7px 8px;align-items:center;font-size:12px">
     <label>X</label><input data-hc="x" type="range" min="-250" max="450" step="1"><output data-out="x"></output>
     <label>Y</label><input data-hc="y" type="range" min="-250" max="450" step="1"><output data-out="y"></output>
     <label>Rotate Z °</label><input data-hc="rotz" type="range" min="-180" max="180" step="1"><output data-out="rotz"></output>
     <label>Tilt X °</label><input data-hc="tiltx" type="range" min="-89" max="89" step="1"><output data-out="tiltx"></output>
     <label>Yaw Y °</label><input data-hc="yawy" type="range" min="-75" max="75" step="1"><output data-out="yawy"></output>
     <label>Scale X</label><input data-hc="sx" type="range" min="-3" max="3" step=".05"><output data-out="sx"></output>
     <label>Scale Y</label><input data-hc="sy" type="range" min="-3" max="3" step=".05"><output data-out="sy"></output>
     <label>Depth split</label><input data-hc="split" type="range" min="0" max="1" step=".01"><output data-out="split"></output>
     <label>Reveal start</label><input data-hc="rstart" type="range" min="-180" max="360" step="1"><output data-out="rstart"></output>
     <label>Reveal sweep</label><input data-hc="rsweep" type="range" min="1" max="360" step="1"><output data-out="rsweep"></output>
   </div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
     <label><input data-hc="flipx" type="checkbox"> Invert X</label>
     <label><input data-hc="flipy" type="checkbox"> Flip Y</label>
     <label><input data-hc="full" type="checkbox"> Full effect</label>
   </div>
   <div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">
     <button data-hc-reset>Reset</button>
     <button data-hc-copy>Copy values</button>
   </div>
 `;
 side.insertBefore(box,side.querySelector('details'));

 const fx=recipe.effect;
 const controls={
   x:box.querySelector('[data-hc="x"]'),
   y:box.querySelector('[data-hc="y"]'),
   rotz:box.querySelector('[data-hc="rotz"]'),
   tiltx:box.querySelector('[data-hc="tiltx"]'),
   yawy:box.querySelector('[data-hc="yawy"]'),
   sx:box.querySelector('[data-hc="sx"]'),
   sy:box.querySelector('[data-hc="sy"]'),
   split:box.querySelector('[data-hc="split"]'),
   rstart:box.querySelector('[data-hc="rstart"]'),
   rsweep:box.querySelector('[data-hc="rsweep"]'),
   flipx:box.querySelector('[data-hc="flipx"]'),
   flipy:box.querySelector('[data-hc="flipy"]'),
   full:box.querySelector('[data-hc="full"]')
 };
 function setValues(){
   controls.x.value=fx.position?.[0]??0;
   controls.y.value=fx.position?.[1]??0;
   controls.rotz.value=fx.rotateZDeg??0;
   controls.tiltx.value=fx.tiltXDeg??0;
   controls.yawy.value=fx.yawYDeg??0;
   controls.sx.value=Number(fx.scaleX??1);
   controls.sy.value=Number(fx.scaleY??1);
   controls.split.value=fx.depthSplit??.5;
   controls.rstart.value=fx.revealStartDeg??0;
   controls.rsweep.value=fx.revealSweepDeg??180;
   controls.flipx.checked=!!fx.flipX;
   controls.flipy.checked=!!fx.flipY;
   refreshOutputs();
 }
 function refreshOutputs(){
   for(const k of ['x','y','rotz','tiltx','yawy','sx','sy','split','rstart','rsweep']){
     box.querySelector('[data-out="'+k+'"]').textContent=controls[k].value;
   }
 }
 function apply(){
   fx.position=[Number(controls.x.value),Number(controls.y.value)];
   fx.rotateZDeg=Number(controls.rotz.value);
   fx.tiltXDeg=Number(controls.tiltx.value);
   fx.yawYDeg=Number(controls.yawy.value);
   const sx=Number(controls.sx.value),sy=Number(controls.sy.value);
   fx.scaleX=Math.abs(sx)<.01?(sx<0?-.01:.01):sx;
   fx.scaleY=Math.abs(sy)<.01?(sy<0?-.01:.01):sy;
   fx.flipX=controls.flipx.checked;
   fx.flipY=controls.flipy.checked;
   fx.depthSplit=Number(controls.split.value);
   fx.revealStartDeg=Number(controls.rstart.value);
   fx.revealSweepDeg=Number(controls.rsweep.value);
   refreshOutputs();
   render(offset);
 }
 Object.values(controls).forEach(el=>{el.oninput=apply;el.onchange=apply;});
 box.querySelector('[data-hc-reset]').onclick=()=>{
   Object.assign(fx,{position:[130,122],rotateZDeg:0,tiltXDeg:0,yawYDeg:0,scaleX:1,scaleY:1,flipX:false,flipY:false,depthSplit:.5,revealStartDeg:0,revealSweepDeg:180});
   controls.full.checked=false;setValues();render(offset);
 };
 box.querySelector('[data-hc-copy]').onclick=async()=>{
   const payload={
     position:fx.position,
     rotateZDeg:fx.rotateZDeg,
     tiltXDeg:fx.tiltXDeg,
     yawYDeg:fx.yawYDeg,
     scaleX:fx.scaleX,
     scaleY:fx.scaleY,
     flipX:fx.flipX,
     flipY:fx.flipY,
     depthSplit:fx.depthSplit,
     revealStartDeg:fx.revealStartDeg,
     revealSweepDeg:fx.revealSweepDeg
   };
   try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));}catch{}
   box.querySelector('[data-hc-copy]').textContent='Copied';
   setTimeout(()=>box.querySelector('[data-hc-copy]').textContent='Copy values',800);
 };
 window.__slashControls={box,controls};
 setValues();
}

try{
 const recipePath=isJump
   ? './assets/vanguard/procedural/jump.recipe.json'
   : isMidair
   ? './assets/vanguard/procedural/midair.recipe.json'
   : isLand
   ? './assets/vanguard/procedural/land.recipe.json'
   : isShotgunReload
   ? './assets/vanguard/procedural/shotgun-reload.recipe.json'
   : isShotgunFire
   ? './assets/vanguard/procedural/shotgun-fire.recipe.json'
   : isShoulderCharge
   ? './assets/vanguard/procedural/shoulder-charge.recipe.json'
   : isButtSmash
   ? './assets/vanguard/procedural/butt-smash.recipe.json'
   : isAttack5
   ? './assets/vanguard/procedural/attack5.recipe.json'
   : isHorizontal
   ? './assets/vanguard/procedural/horizontal-strike.recipe.json'
   : isAttack2
     ? './assets/vanguard/procedural/attack2-uppercut.recipe.json'
     : isUndercut
       ? './assets/vanguard/procedural/undercut-strike.recipe.json'
       : './assets/vanguard/procedural/overhand-strike.recipe.json';
 recipe=await fetch(recipePath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);q('[data-title]').textContent=recipe.id;phases=recipe.phases;total=phases.reduce((n,p)=>n+Number(p.durationMs),0);canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];
 const spec=recipe.atlases['vanguard-canonical'];
 const atlasPath=spec.path.startsWith('./')?spec.path:'./'+spec.path;
 const effectSource=recipe.sources[recipe.effect.source];
 if(effectSource.kind==='effect-atlas-cell'){
   const es=recipe.effectAtlases?.[effectSource.atlas];
   if(!es)throw new Error('Missing effect atlas '+effectSource.atlas);
   const effectPath=es.path.startsWith('./')?es.path:'./'+es.path;
   const loaded=await Promise.all([loadImage(atlasPath),loadImage(effectPath)]);
   atlas=loaded[0];
   slash=effectCell(loaded[1],es,effectSource.cell);
 }else{
   const slashPath=effectSource.path.startsWith('./')?effectSource.path:'./'+effectSource.path;
   [atlas,slash]=await Promise.all([loadImage(atlasPath),loadImage(slashPath)]);
 }
 if(recipe.speedLineSprite?.enabled){
   const speedPath=recipe.speedLineSprite.path.startsWith('./')
     ? recipe.speedLineSprite.path
     : './'+recipe.speedLineSprite.path;
   speedLines=await loadImage(speedPath);
 }
 buildSlash();
 for(const [id,src] of Object.entries(recipe.sources))if(src.role==='body')body(id);
 installSlashControls();
 render(0);
 requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';document.querySelector('#app pre').textContent=err?.stack||String(err)}
