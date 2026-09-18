#!/usr/bin/env node
import assert from 'node:assert/strict';
import { detectFrameBoxes, constrainFrameBox, clearConnectedBackground } from '../src/sprite-slicer.js';
function image(width, height, background=[248,248,248,255]) { const data=new Uint8ClampedArray(width*height*4); for(let i=0;i<data.length;i+=4)data.set(background,i); return {data,width,height}; }
function rect(img,x,y,w,h,color=[25,45,70,255]) { for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)img.data.set(color,(yy*img.width+xx)*4); }
const irregular=image(1475,720); rect(irregular,52,120,320,500); rect(irregular,566,88,300,525); rect(irregular,1070,130,342,480);
const boxes=detectFrameBoxes(irregular); assert.equal(boxes.length,3,'1475x720 irregular three-frame sheet must auto-detect three frames'); assert.ok(boxes[0].x<52&&boxes[0].width>320,'detected boxes include editable padding'); assert.deepEqual(boxes.map(b=>b.x).sort((a,b)=>a-b),boxes.map(b=>b.x),'boxes preserve reading order');
const transparent=image(620,340,[0,0,0,0]); rect(transparent,25,25,180,280,[255,20,80,255]); rect(transparent,390,35,190,270,[30,220,160,255]); assert.equal(detectFrameBoxes(transparent).length,2,'transparent sheet must detect islands');
const cleared=clearConnectedBackground(irregular); assert.equal(cleared[3],0,'edge-connected dominant background becomes transparent'); assert.equal(cleared[(150*irregular.width+100)*4+3],255,'foreground remains opaque');
assert.deepEqual(constrainFrameBox({x:-5,y:330,width:900,height:1},620,340),{x:0,y:330,width:620,height:4},'manual box edits stay inside source');
console.log(JSON.stringify({ok:true,checks:['1475x720 non-divisible sheet','transparent background','reading order','box constraints','transparent edge background']},null,2));
