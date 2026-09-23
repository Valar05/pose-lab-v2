export const MOTION_PROFILES = Object.freeze({
  'jab@1': {
    schema:'pose-lab.motion-profile.v1',
    id:'jab', version:1, label:'Jab',
    family:'two-frame-strike',
    frameRoles:[
      {id:'ready', label:'Ready', required:true, regions:['punch_arm','torso','head','planted_foot','weapon']},
      {id:'impact', label:'Impact', required:true, regions:['punch_arm','torso','head','planted_foot','weapon']},
      {id:'recovery', label:'Recovery', required:false}
    ],
    keys:[
      {id:'ready',at:0},
      {id:'drive',at:.18},
      {id:'impact',at:.43},
      {id:'recoil',at:.62},
      {id:'settle',at:1}
    ],
    transitions:[
      {id:'drive',from:'ready',to:'impact',easing:'aprilJabDrive',
       modifiers:['translate','torsoCompression','armExtension'],
       filters:[{id:'directionalBlur',envelope:[0,.25,1,0]},{id:'contactEcho',envelope:[0,0,1,.2]}],
       constraints:['footLock','weaponLock','preserveSilhouette','preserveBaseline']},
      {id:'recoil',from:'impact',to:'ready',easing:'aprilJabRecoil',
       modifiers:['recoilCompress'],
       filters:[],
       constraints:['footLock','weaponLock','preserveSilhouette','preserveBaseline']}
    ],
    parameters:{
      weight:{type:'number',default:1,min:.25,max:2},
      snap:{type:'number',default:1,min:.25,max:2},
      blurStrength:{type:'number',default:.35,min:0,max:1},
      echoAmount:{type:'number',default:.2,min:0,max:1},
      recoil:{type:'number',default:1,min:0,max:2}
    }
  },
  'kick@1': {
    schema:'pose-lab.motion-profile.v1',
    id:'kick', version:1, label:'Kick',
    family:'strike',
    frameRoles:[
      {id:'chamber',label:'Chamber',required:true},
      {id:'extension',label:'Extension',required:true},
      {id:'recovery',label:'Recovery',required:false}
    ],
    keys:[{id:'chamber',at:0},{id:'drive',at:.22},{id:'impact',at:.48},{id:'recover',at:.7},{id:'settle',at:1}],
    transitions:[
      {id:'drive',from:'chamber',to:'extension',easing:'easeOutCubic',
       modifiers:['rotate','translate','squashStretch'],
       filters:[{id:'directionalBlur',envelope:[0,.2,1,.1]},{id:'smearTrail',envelope:[0,.25,.9,0]}],
       constraints:['footLock','preserveSilhouette','preserveBaseline']},
      {id:'recover',from:'extension',to:'chamber',easing:'easeInOutCubic',
       modifiers:['recoilCompress'],filters:[],constraints:['footLock','preserveBaseline']}
    ],
    parameters:{weight:{type:'number',default:1,min:.25,max:2},snap:{type:'number',default:1,min:.25,max:2},blurStrength:{type:'number',default:.3,min:0,max:1}}
  },
  'run@1': {
    schema:'pose-lab.motion-profile.v1',
    id:'run', version:1, label:'Run',
    family:'loop',
    frameRoles:[
      {id:'contactL',label:'Contact L',required:true},
      {id:'passL',label:'Pass L',required:true},
      {id:'contactR',label:'Contact R',required:true},
      {id:'passR',label:'Pass R',required:true}
    ],
    keys:[{id:'contactL',at:0},{id:'passL',at:.25},{id:'contactR',at:.5},{id:'passR',at:.75},{id:'loop',at:1}],
    transitions:[
      {id:'stride',from:'contactL',to:'contactR',easing:'easeInOutCubic',
       modifiers:['translate','squashStretch','pivotShift'],
       filters:[{id:'directionalBlur',envelope:[0,.35,.5,0]}],
       constraints:['preserveSilhouette','preserveBaseline']}
    ],
    loop:true,
    parameters:{cadence:{type:'number',default:1,min:.25,max:2},bounce:{type:'number',default:1,min:0,max:2},smear:{type:'number',default:.2,min:0,max:1}}
  }
});

export function getMotionProfile(id, version=1) {
  return MOTION_PROFILES[`${id}@${version}`] || null;
}
