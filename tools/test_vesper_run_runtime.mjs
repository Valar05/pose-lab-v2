import fs from 'node:fs';
import crypto from 'node:crypto';

const atlasPath='public/assets/vesper/procedural/vesper-gameplay-atlas.png';
const recipePath='public/assets/vesper/procedural/run.recipe.json';
const motionPath='motion.html';
const previewPath='src/procedural-vesper-run-preview.js';

const atlas=fs.readFileSync(atlasPath);
const hash=crypto.createHash('sha256').update(atlas).digest('hex');
if(hash!=='02553770f1987ec0a235ff972deee0eeb9d28140855384031e62c9c2de05273b'){
  throw new Error('Vesper atlas SHA mismatch: '+hash);
}
if(atlas.length<24 || atlas.toString('ascii',1,4)!=='PNG') throw new Error('Vesper atlas is not PNG');
const width=atlas.readUInt32BE(16), height=atlas.readUInt32BE(20);
if(width!==1448||height!==1086) throw new Error(`Wrong atlas dimensions ${width}x${height}`);

const recipe=JSON.parse(fs.readFileSync(recipePath,'utf8'));
if(recipe.subject!=='vesper') throw new Error('recipe subject must be vesper');
if(recipe.rootMotion!==false) throw new Error('Vesper run must not own root motion');
if(recipe.cycleMs!==1050) throw new Error('Vesper run cycle must be 1050 ms');
const cells=recipe.poses.map(p=>p.cell);
if(JSON.stringify(cells)!==JSON.stringify([2,3,4,5,6,7])) throw new Error('Vesper run cell order mismatch: '+cells.join(','));
if(recipe.atlas.sha256!==hash) throw new Error('recipe atlas SHA does not match bytes');
if(recipe.secondary?.bobPx!==1.25) throw new Error('expected subtle procedural bob');
if(recipe.secondary?.shearPulse!==0.012) throw new Error('expected procedural shear pulse');

const motion=fs.readFileSync(motionPath,'utf8');
if(!motion.includes("procedural === 'vesper-run'")) throw new Error('motion.html does not route vesper-run');
if(!motion.includes("./src/procedural-vesper-run-preview.js")) throw new Error('Vesper run module not routed');

const preview=fs.readFileSync(previewPath,'utf8');
for(const required of [
  'preserve source-cell geometry',
  'bobCyclesPerRun',
  'shearPulseCyclesPerRun',
  "fetch('./assets/vesper/procedural/run.recipe.json'"
]){
  if(!preview.includes(required)) throw new Error('Vesper preview missing '+required);
}
console.log('PASS: Vesper run runtime contract');
console.log(JSON.stringify({width,height,sha256:hash,cells,cycleMs:recipe.cycleMs,secondary:recipe.secondary},null,2));
