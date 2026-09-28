import fs from 'node:fs';

const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const fail=m=>{throw new Error(m)};

const recipes={
 overhand:load('public/assets/vanguard/procedural/overhand-strike.recipe.json'),
 undercut:load('public/assets/vanguard/procedural/undercut-strike.recipe.json'),
 uppercut:load('public/assets/vanguard/procedural/attack2-uppercut.recipe.json'),
 horizontal:load('public/assets/vanguard/procedural/horizontal-strike.recipe.json'),
 jab:load('public/assets/vanguard/procedural/attack5.recipe.json'),
};

const expectedDur={
 overhand:[25,45,45,30,25,70,70,95,90,105],
 undercut:[75,75,70,45,45,125,90,95,90,105],
 uppercut:[25,25,190,125,150,105,80,55],
 horizontal:[65,125,130,155,85,90],
 jab:[33,109,109,109,108,108,74],
};
for(const [name,r] of Object.entries(recipes)){
 if(r.phases.map(p=>p.durationMs).join(',')!==expectedDur[name].join(','))fail(name+' timing changed');
 if(r.rootMotion!==false)fail(name+' rootMotion changed');
}
if(recipes.overhand.speedLineSprite)fail('rejected Overhand speedLineSprite still active');
if(recipes.overhand.comboHandoffMs!==310)fail('Overhand handoff changed');

const expectedEnv={
 undercut:{idle:0,anticipation:0,'low-chamber':.08,'undercut-commit':.42,'rise-through':1,'high-contact':.5,'high-follow-through':.1,'recoil-1':0,'recoil-2':0,'idle-return':0},
 uppercut:{idle:0,anticipation:0,'low-chamber':.08,'rising-drive':1,'high-contact':.52,'high-follow-through':.1,recoil:0,'idle-return':0},
 horizontal:{idle:0,chamber:.08,'stab-contact':1,'recover-high':.3,settle:0,'idle-return':0},
 jab:{idle:0,coil:.1,launch:1,contact:.44,hold:.08,recover:0,return:0},
};
const expectedDir={
 undercut:[-.8,.35],
 uppercut:[-.7,.45],
 horizontal:[-1,0],
 jab:[-1,.05],
};
for(const name of ['undercut','uppercut','horizontal','jab']){
 const r=recipes[name];
 if(!r.motionBlur?.enabled)fail(name+' blur disabled');
 if(r.motionBlur.samples!==4||r.motionBlur.spanPx!==34||r.motionBlur.filterPx!==2||r.motionBlur.maxAlpha!==.48||r.motionBlur.primaryFilterPx!==4)fail(name+' blur profile changed');
 if(r.motionBlur.primaryStretchX!==0||r.motionBlur.primarySquashY!==0||r.motionBlur.primaryShearX!==0||r.motionBlur.primaryShiftPx!==0)fail(name+' rejected body deformation returned');
 if(r.motionBlur.directionStage.join(',')!==expectedDir[name].join(','))fail(name+' blur direction changed');
 for(const [id,v] of Object.entries(expectedEnv[name])){
  if(r.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(name+':'+id+' blur amount changed');
 }
}

const expectedCells={
 undercut:{idle:2,chamber:79,commit:77,preimpact:64,contact:68,'slash-right':5},
 uppercut:{idle:2,chamber:20,rise:32,contact:21,'slash-right':3},
 horizontal:{idle:2,chamber:80,commit:62,contact:61,'slash-right':8},
 jab:{idle:2,coil:65,drive:75,finish:87,spray:9},
};
for(const [name,cells] of Object.entries(expectedCells)){
 for(const [sid,cell] of Object.entries(cells))if(recipes[name].sources[sid]?.cell!==cell)fail(name+':'+sid+' source changed');
}
console.log('Vanguard remaining-attacks blur pass v9: PASS');
