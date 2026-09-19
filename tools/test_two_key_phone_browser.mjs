#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:4175/?view=2d&cacheBust=two-key-browser',
    keyA: '',
    keyB: '',
    outDir: path.join(os.homedir(), '.local/state/pose-lab/two-key-browser-acceptance'),
    browser: process.env.CHROMIUM_BIN || 'chromium-browser',
    port: 9225,
  };
  for (let i=2;i<argv.length;i+=1) {
    const key=argv[i];
    const value=argv[i+1];
    if (key === '--url') { args.url=value; i+=1; }
    else if (key === '--key-a') { args.keyA=value; i+=1; }
    else if (key === '--key-b') { args.keyB=value; i+=1; }
    else if (key === '--out-dir') { args.outDir=value; i+=1; }
    else if (key === '--browser') { args.browser=value; i+=1; }
    else if (key === '--port') { args.port=Number(value); i+=1; }
    else throw new Error('unknown argument: '+key);
  }
  if (!args.keyA || !args.keyB) throw new Error('--key-a and --key-b are required');
  return args;
}
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
async function waitUntil(fn, timeoutMs=30000, intervalMs=100) {
  const end=Date.now()+timeoutMs;
  let last;
  while (Date.now()<end) {
    try { const value=await fn(); if (value) return value; } catch (error) { last=error; }
    await sleep(intervalMs);
  }
  throw last || new Error('timed out');
}
class Cdp {
  constructor(ws) {
    this.ws=ws; this.id=0; this.pending=new Map(); this.events=new Map();
    ws.onmessage=(event)=>{
      const msg=JSON.parse(event.data);
      if (msg.id) {
        const pending=this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else pending.resolve(msg.result || {});
      } else if (msg.method) {
        for (const handler of this.events.get(msg.method) || []) handler(msg.params || {});
      }
    };
  }
  send(method, params={}) {
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
}
async function connect(wsUrl) {
  const ws=new WebSocket(wsUrl);
  await new Promise((resolve,reject)=>{ ws.onopen=resolve; ws.onerror=()=>reject(new Error('CDP websocket failed')); });
  return new Cdp(ws);
}
async function evaluate(cdp, expression) {
  const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'browser evaluation failed');
  return result.result?.value;
}
async function waitExpr(cdp, expression, timeout=30000) {
  return waitUntil(async()=>await evaluate(cdp, expression), timeout, 100);
}
async function nodeFor(cdp, selector) {
  const {root}=await cdp.send('DOM.getDocument',{depth:1,pierce:true});
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
  if (!nodeId) throw new Error('selector not found: '+selector);
  return nodeId;
}
async function setFile(cdp, selector, file) {
  const nodeId=await nodeFor(cdp,selector);
  await cdp.send('DOM.setFileInputFiles',{nodeId,files:[path.resolve(file)]});
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new Event('change',{bubbles:true})); true`);
}
async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click(); true`);
}
async function setValue(cdp, selector, value, eventName='change') {
  await evaluate(cdp, `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event(${JSON.stringify(eventName)},{bubbles:true}));return true})()`);
}
async function setChecked(cdp, selector, checked) {
  await evaluate(cdp, `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.checked=${checked?'true':'false'};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
}
async function waitFile(dir, predicate, timeout=30000) {
  return waitUntil(async()=>{
    const files=await fs.readdir(dir);
    const found=files.find((name)=>predicate(name) && !name.endsWith('.crdownload'));
    return found ? path.join(dir,found) : '';
  },timeout,150);
}

const args=parseArgs(process.argv);
const outDir=path.resolve(args.outDir);
const downloadDir=path.join(outDir,'downloads');
const profileDir=path.join(outDir,'chromium-profile');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(downloadDir,{recursive:true});
await fs.mkdir(profileDir,{recursive:true});

const browser=spawn(args.browser,[
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${args.port}`,
  `--user-data-dir=${profileDir}`,
  args.url,
],{stdio:['ignore','pipe','pipe']});
let stderr='';
browser.stderr.on('data',(chunk)=>{stderr+=chunk.toString();});

try {
  const targets=await waitUntil(async()=>{
    const response=await fetch(`http://127.0.0.1:${args.port}/json`);
    if (!response.ok) return null;
    const list=await response.json();
    return list.filter((entry)=>entry.type==='page' && entry.webSocketDebuggerUrl);
  },30000,100);
  const cdp=await connect(targets[0].webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Page.enable');
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir,eventsEnabled:true});
  await waitExpr(cdp,"document.body?.dataset?.reviewReady === '1'",30000);

  const modes=await evaluate(cdp,"[...document.querySelector('[data-animation-mode]').options].map(o=>o.value)");
  if (JSON.stringify(modes)!==JSON.stringify(['frame-sequence','two-key-snap','contact-sheet-review'])) throw new Error('mode selector contract changed');
  await setValue(cdp,'[data-animation-mode]','two-key-snap');
  await waitExpr(cdp,"document.querySelector('[data-two-key-panel]')?.hidden === false");

  await setFile(cdp,'[data-two-key-a]',args.keyA);
  await waitExpr(cdp,"document.querySelector('[data-two-key-a-name]')?.textContent.includes('april_K0')");
  await setFile(cdp,'[data-two-key-b]',args.keyB);
  await waitExpr(cdp,"document.querySelector('[data-two-key-b-name]')?.textContent.includes('april_K3')");

  await setValue(cdp,'[data-two-key-hold-a]','500','input');
  await setValue(cdp,'[data-two-key-ab]','240','input');
  await setValue(cdp,'[data-two-key-steps]','3','input');
  await setValue(cdp,'[data-two-key-hold-b]','500','input');
  await setValue(cdp,'[data-two-key-ba]','300','input');
  await setValue(cdp,'[data-two-key-easing]','ease-in-out');
  await setValue(cdp,'[data-two-key-snap]','70','input');
  await setChecked(cdp,'[data-two-key-pingpong]',true);
  await setChecked(cdp,'[data-two-key-foot-anchor]',true);
  await click(cdp,'[data-two-key-build]');

  await waitExpr(cdp,"document.querySelectorAll('[data-frame-index]').length===8 && document.querySelector('[data-animation-title]')?.textContent.startsWith('Two-Key')",60000);
  const inspection=await evaluate(cdp,`(()=>({
    title:document.querySelector('[data-animation-title]')?.textContent,
    readout:document.querySelector('[data-frame-readout]')?.textContent,
    status:document.querySelector('[data-two-key-status]')?.textContent,
    frames:[...document.querySelectorAll('[data-frame-index]')].map((b)=>({type:b.dataset.frameType,label:b.querySelector('span')?.textContent||''})),
    authored:document.querySelectorAll('[data-frame-index][data-frame-type="authored"]').length,
    procedural:document.querySelectorAll('[data-frame-index][data-frame-type="procedural"]').length,
  }))()`);
  if (inspection.authored!==2 || inspection.procedural!==6) throw new Error('authored/procedural frame identity mismatch');

  const endpointPixels=await evaluate(cdp,`(async()=>{
    async function filePixels(file){
      const bitmap=await createImageBitmap(file);
      const c=document.createElement('canvas'); c.width=512;c.height=512;
      const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(bitmap,0,0,512,512);
      return x.getImageData(0,0,512,512).data;
    }
    async function urlPixels(url){
      const blob=await (await fetch(url)).blob();
      return filePixels(blob);
    }
    function mismatches(a,b){let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
    const buttons=[...document.querySelectorAll('[data-frame-index]')];
    const aFile=document.querySelector('[data-two-key-a]').files[0];
    const bFile=document.querySelector('[data-two-key-b]').files[0];
    const aSrc=buttons[0].querySelector('img').src;
    const bSrc=buttons[4].querySelector('img').src;
    return {a:mismatches(await filePixels(aFile),await urlPixels(aSrc)),b:mismatches(await filePixels(bFile),await urlPixels(bSrc))};
  })()`);
  if (endpointPixels.a!==0 || endpointPixels.b!==0) throw new Error('authored endpoint pixels changed: '+JSON.stringify(endpointPixels));

  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await fs.writeFile(path.join(outDir,'two-key-preview.png'),Buffer.from(shot.data,'base64'));

  await setValue(cdp,'[data-two-key-export-scope]','full');
  await click(cdp,'[data-two-key-export-gif]');
  const fullGif=await waitFile(downloadDir,(name)=>name.endsWith('-full.gif'));
  await click(cdp,'[data-two-key-export-png]');
  const fullZip=await waitFile(downloadDir,(name)=>name.endsWith('-full-png-frames.zip'));
  await click(cdp,'[data-two-key-export-json]');
  const fullJson=await waitFile(downloadDir,(name)=>name.endsWith('-full.json'));

  await setValue(cdp,'[data-two-key-export-scope]','authored');
  await click(cdp,'[data-two-key-export-png]');
  const authoredZip=await waitFile(downloadDir,(name)=>name.endsWith('-authored-png-frames.zip'));

  await setValue(cdp,'[data-two-key-sheet-scope]','full');
  await setChecked(cdp,'[data-two-key-sheet-labels]',true);
  await click(cdp,'[data-two-key-export-sheet]');
  const labeledSheet=await waitFile(downloadDir,(name)=>name.endsWith('-full-labeled-contact-sheet.png'));

  await setValue(cdp,'[data-two-key-sheet-scope]','authored');
  await setChecked(cdp,'[data-two-key-sheet-labels]',false);
  await click(cdp,'[data-two-key-export-sheet]');
  const authoredSheet=await waitFile(downloadDir,(name)=>name.endsWith('-authored-unlabeled-contact-sheet.png'));

  await setFile(cdp,'[data-two-key-json]',fullJson);
  await waitExpr(cdp,"document.querySelector('[data-two-key-status]')?.textContent.startsWith('Reloaded 8 frames') && document.querySelectorAll('[data-frame-index]').length===8",30000);
  const reloadStatus=await evaluate(cdp,"document.querySelector('[data-two-key-status]').textContent");

  const report={
    schema:'pose-lab-v2-two-key-phone-browser-acceptance-v1',
    url:args.url,
    keyA:path.resolve(args.keyA),
    keyB:path.resolve(args.keyB),
    modes,
    inspection,
    endpointPixelMismatches:endpointPixels,
    reloadStatus,
    downloads:{fullGif,fullZip,fullJson,authoredZip,labeledSheet,authoredSheet},
  };
  await fs.writeFile(path.join(outDir,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ok:true,...report},null,2));
  cdp.ws?.close?.();
} finally {
  browser.kill('SIGTERM');
  await sleep(500);
  if (!browser.killed) browser.kill('SIGKILL');
  await fs.writeFile(path.join(outDir,'chromium-stderr.log'),stderr);
}
