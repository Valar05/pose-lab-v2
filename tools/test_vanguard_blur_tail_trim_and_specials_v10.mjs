import fs from 'node:fs';

const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const fail=m=>{throw new Error(m)};

const r={
 jab:load('public/assets/vanguard/procedural/attack5.recipe.json'),
 horizontal:load('public/assets/vanguard/procedural/horizontal-strike.recipe.json'),
 buttStrike:load('public/assets/vanguard/procedural/butt-smash.recipe.json'),
 shoulderCharge:load('public/assets/vanguard/procedural/shoulder-charge.recipe.json'),
 overhand:load('public/assets/vanguard/procedural/overhand-strike.recipe.json'),
 undercut:load('public/assets/vanguard/procedural/undercut-strike.recipe.json'),
 uppercut:load('public/assets/vanguard/procedural/attack2-uppercut.recipe.json'),
};

const dur={
 jab:[33,109,109,109,108,108,74],
 horizontal:[65,125,130,155,85,90],
 buttStrike:[70,160,140,240,90],
 shoulderCharge:[70,165,55,80,90,150],
};
for(const name of Object.keys(dur)){
 if(r[name].phases.map(p=>p.durationMs).join(',')!==dur[name].join(','))fail(name+' timing changed');
 if(r[name].rootMotion!==false)fail(name+' rootMotion changed');
}

const env={
 jab:{idle:0,coil:0,launch:1,contact:.22,hold:0,recover:0,return:0},
 horizontal:{idle:0,chamber:0,'stab-contact':1,'recover-high':.1,settle:0,'idle-return':0},
 buttStrike:{idle:0,windup:0,drive:1,impact:.18,'idle-return':0},
 shoulderCharge:{idle:0,anticipation:0,release:.58,impact:1,crush:.12,'idle-return':0},
};
const dir={jab:[-1,.05],horizontal:[-1,0],buttStrike:[-1,.1],shoulderCharge:[-1,.02]};
for(const name of Object.keys(env)){
 const rr=r[name];
 if(!rr.motionBlur?.enabled)fail(name+' blur disabled');
 if(rr.motionBlur.samples!==4||rr.motionBlur.spanPx!==34||rr.motionBlur.filterPx!==2||rr.motionBlur.maxAlpha!==.48||rr.motionBlur.primaryFilterPx!==4)fail(name+' blur profile changed');
 if(rr.motionBlur.primaryStretchX!==0||rr.motionBlur.primarySquashY!==0||rr.motionBlur.primaryShearX!==0||rr.motionBlur.primaryShiftPx!==0)fail(name+' body deformation returned');
 if(rr.motionBlur.directionStage.join(',')!==dir[name].join(','))fail(name+' direction changed');
 for(const [id,v] of Object.entries(env[name])){
  if(rr.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(name+':'+id+' blur changed');
 }
}

const accepted={
 overhand:{idle:0,anticipation:0,chamber:0,'cross-commit':.32,'lean-forward':1,contact:.46,'follow-through':.08,'recoil-1':0,'recoil-2':0,'idle-return':0},
 undercut:{idle:0,anticipation:0,'low-chamber':.08,'undercut-commit':.42,'rise-through':1,'high-contact':.5,'high-follow-through':.1,'recoil-1':0,'recoil-2':0,'idle-return':0},
 uppercut:{idle:0,anticipation:0,'low-chamber':.08,'rising-drive':1,'high-contact':.52,'high-follow-through':.1,recoil:0,'idle-return':0},
};
for(const name of Object.keys(accepted)){
 for(const [id,v] of Object.entries(accepted[name])){
  if(r[name].phases.find(p=>p.id===id)?.blur?.amount!==v)fail(name+': accepted blur changed at '+id);
 }
}

const cells={
 jab:{idle:2,coil:65,drive:75,finish:87,spray:9},
 horizontal:{idle:2,chamber:80,commit:62,contact:61,'slash-right':8},
 buttStrike:{idle:2,windup:91,drive:92,impact:93,dummyFx:9},
 shoulderCharge:{idle:2,brace:94,impact:95,dummyFx:9,shoulderWake:10},
};
for(const [name,map] of Object.entries(cells))for(const [sid,cell] of Object.entries(map))if(r[name].sources[sid]?.cell!==cell)fail(name+':'+sid+' source changed');

console.log('Vanguard blur-tail trim and specials v10: PASS');
