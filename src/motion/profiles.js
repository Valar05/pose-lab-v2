import { CONNIE_PROFILES } from './connie-profiles.js';
export const MOTION_PROFILES = Object.freeze({
  ...CONNIE_PROFILES,
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
  },
  'slide@1': {
    schema:'pose-lab.motion-profile.v1',
    id:'slide', version:1, label:'Slide',
    family:'locomotion',
    frameRoles:[
      {id:'entry',label:'Entry',required:true},
      {id:'lowExtend',label:'Low Extend',required:true},
      {id:'recovery',label:'Recovery',required:false}
    ],
    keys:[
      {id:'entry',at:0},
      {id:'drop',at:.16},
      {id:'glide',at:.42},
      {id:'recover',at:.78},
      {id:'settle',at:1}
    ],
    transitions:[
      {id:'drop',from:'entry',to:'lowExtend',easing:'easeOutCubic',
       modifiers:['translate','torsoCompression','squashStretch'],
       filters:[{id:'directionalBlur',envelope:[0,.3,.8,0]},{id:'smearTrail',envelope:[0,.25,.9,0]}],
       constraints:['preserveSilhouette','preserveBaseline']},
      {id:'recover',from:'lowExtend',to:'entry',easing:'easeInOutCubic',
       modifiers:['recoilCompress'],filters:[],constraints:['preserveBaseline']}
    ],
    parameters:{
      lowness:{type:'number',default:1,min:.5,max:1.5},
      glide:{type:'number',default:1,min:.25,max:2},
      smear:{type:'number',default:.3,min:0,max:1},
      recovery:{type:'number',default:1,min:.25,max:2}
    }
  },
  'jump@1': {
    schema:'pose-lab.motion-profile.v1',
    id:'jump', version:1, label:'Jump',
    family:'airborne',
    frameRoles:[
      {id:'crouch',label:'Crouch',required:true},
      {id:'airborne',label:'Airborne',required:true},
      {id:'landing',label:'Landing',required:false}
    ],
    keys:[
      {id:'crouch',at:0},
      {id:'launch',at:.16},
      {id:'apex',at:.48},
      {id:'descent',at:.72},
      {id:'landing',at:.9},
      {id:'settle',at:1}
    ],
    transitions:[
      {id:'launch',from:'crouch',to:'airborne',easing:'easeOutCubic',
       modifiers:['translate','squashStretch','pivotShift'],
       filters:[{id:'directionalBlur',envelope:[0,.3,.7,0]}],
       constraints:['preserveSilhouette']},
      {id:'landing',from:'airborne',to:'crouch',easing:'easeInOutCubic',
       modifiers:['translate','recoilCompress','squashStretch'],
       filters:[{id:'contactEcho',envelope:[0,0,.8,.15]}],
       constraints:['preserveSilhouette','preserveBaseline']}
    ],
    parameters:{
      height:{type:'number',default:1,min:.25,max:2},
      hang:{type:'number',default:1,min:.25,max:2},
      travel:{type:'number',default:1,min:0,max:2},
      landingWeight:{type:'number',default:1,min:.25,max:2},
      smear:{type:'number',default:.2,min:0,max:1}
    }
  }
});

export function getMotionProfile(id, version=1) {
  return MOTION_PROFILES[`${id}@${version}`] || null;
}
