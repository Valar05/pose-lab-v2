#!/usr/bin/env node
import fs from 'node:fs'; import { spawnSync } from 'node:child_process'; import { encodeGif } from '../src/gif-encoder.js';
function frame(color) { const width=8,height=8,data=new Uint8ClampedArray(width*height*4); for(let i=0;i<data.length;i+=4)data.set([...color,255],i); return {width,height,getContext(){return {getImageData(){return {data};}};}}; }
const blob=encodeGif([frame([255,0,0]),frame([0,255,0]),frame([0,0,255])],120); const bytes=Buffer.from(await blob.arrayBuffer());
if(bytes.subarray(0,6).toString()!=='GIF89a'||bytes.at(-1)!==59)throw new Error('GIF structure invalid');
const out='/data/data/com.termux/files/usr/tmp/pose-lab-sprite-lab-test.gif'; fs.writeFileSync(out,bytes);
const check=spawnSync('python3',['-c',"from PIL import Image; import sys; im=Image.open(sys.argv[1]); assert im.size==(8,8); assert im.n_frames==3",out],{encoding:'utf8'}); if(check.status!==0)throw new Error(check.stderr||'Pillow rejected GIF');
console.log(JSON.stringify({ok:true,frames:3,size:[8,8],bytes:bytes.length},null,2));
