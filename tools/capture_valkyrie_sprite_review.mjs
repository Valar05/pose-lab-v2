#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const baseUrl=process.argv[2]||'http://127.0.0.1:4174/';
const outDir=process.argv[3]||'generated/valkyrie-sprite-review';
const cases=[
  {clip:'bayonet-drive',steps:1,phase:'body drives through'},
  {clip:'weapon-bash',steps:1,phase:'high reverse load'},
  {clip:'heavy-idle',steps:0,phase:'heavy idle'}
];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHROME_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:1});
const report={schema:'valkyrie-full-sprite-visual-qa-v1',viewport:{width:430,height:932},cases:[]};
try{
  for(const item of cases){
    const url=new URL(baseUrl);
    url.searchParams.set('view','valkyrie');
    url.searchParams.set('character','vanguard');
    url.searchParams.set('clip',item.clip);
    url.searchParams.set('cacheBust','full-sprite-ci');
    await page.goto(url.href,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.body.dataset.reviewReady==='1');
    if((await page.locator('#play').textContent())==='Pause')await page.locator('#play').click();
    for(let i=0;i<item.steps;i++)await page.locator('#stepNext').click();
    await page.waitForTimeout(80);
    const inspection=await page.evaluate(()=>{
      const canvas=document.querySelector('#canvas');
      const context=canvas.getContext('2d');
      const image=context.getImageData(0,0,canvas.width,canvas.height).data;
      let left=canvas.width,top=canvas.height,right=-1,bottom=-1,pixels=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        if(image[(y*canvas.width+x)*4+3]===0)continue;
        pixels++;if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
      }
      return{
        phase:document.querySelector('#phase')?.textContent||'',
        mode:document.querySelector('#mode')?.textContent||'',
        imageRendering:getComputedStyle(canvas).imageRendering,
        bounds:pixels?{left,top,right,bottom,width:right-left+1,height:bottom-top+1,pixels}:null
      };
    });
    if(!inspection.phase.toLowerCase().includes(item.phase))throw new Error(`${item.clip} wrong phase: ${inspection.phase}`);
    if(!inspection.bounds)throw new Error(`${item.clip} drew no visible sprite pixels`);
    const b=inspection.bounds,margin=18;
    if(b.left<margin||b.top<margin||b.right>511-margin||b.bottom>511-margin)throw new Error(`${item.clip} escaped full-sprite margin: ${JSON.stringify(b)}`);
    if(inspection.imageRendering!=='pixelated'&&inspection.imageRendering!=='crisp-edges')throw new Error(`${item.clip} lost nearest-neighbor presentation: ${inspection.imageRendering}`);
    const screenshotPath=path.join(outDir,`${item.clip}.png`);
    const bytes=await page.locator('#stage').screenshot({path:screenshotPath});
    report.cases.push({...item,inspection,screenshot:screenshotPath,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ok:true,outDir,cases:report.cases.map(x=>({clip:x.clip,phase:x.inspection.phase,bounds:x.inspection.bounds,sha256:x.sha256}))},null,2));
}finally{
  await browser.close();
}
