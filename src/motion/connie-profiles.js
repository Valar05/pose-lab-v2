export const CONNIE_ATLAS = './assets/connie/connie-approved-composite.png';
export const CONNIE_RECTS = Object.freeze({
 idle:[10,95,310,500],run_1:[360,110,750,490],run_2:[745,110,1110,490],run_3:[1110,110,1520,490],
 aerial_1:[270,585,585,905],aerial_2:[595,585,950,895],aerial_3:[950,595,1280,900],
 spin_1:[250,950,635,1270],spin_2:[630,930,975,1250],spin_3:[965,900,1295,1220]
});
// Pixel-content bounds measured from the immutable atlas, relative to each crop.
// Used only for anchoring. Never normalize width/height or rescale poses.
export const CONNIE_CONTENT_BOUNDS=Object.freeze({
 idle:[9,14,280,393],
 run_1:[14,19,379,358],run_2:[10,22,349,365],run_3:[15,17,397,365],
 aerial_1:[9,12,302,311],aerial_2:[10,12,347,294],aerial_3:[13,10,315,296],
 spin_1:[13,15,376,304],spin_2:[12,16,345,299],spin_3:[0,10,315,294]
});
const role=(id)=>({id,label:id,required:true});
const base=(id,label,roles,keys,transitions,parameters={})=>({
 schema:'pose-lab.motion-profile.v1',id,version:1,label,family:'connie-atlas',
 frameRoles:roles.map(role),keys:keys.map(([id,at])=>({id,at})),transitions,parameters
});
const motion=(from,to,easing,modifiers,filters=[])=>({id:to,from,to,easing,modifiers,filters,
 constraints:['preserveSilhouette','preserveBaseline']});
export const CONNIE_PROFILES=Object.freeze({
 'connie-idle@1':base('connie-idle','Connie / Deformed Idle',['idle'],[['idle',0],['settle',.5],['loop',1]],
 [motion('idle','idle','easeInOutCubic',['localizedWarp'])],
 {deformation:{type:'number',default:.6,min:0,max:2},breathScale:{type:'number',default:0,min:0,max:0}}),
 'connie-run@1':base('connie-run','Connie / Paper Run 1-2-3-2-1',['run_1','run_2','run_3'],
 [['run_1',0],['run_2',.2],['run_3',.4],['return_2',.6],['return_1',.8],['loop',1]],
 [motion('run_1','run_2','easeInOutCubic',['pivotShift','localizedWarp'],[{id:'directionalBlur',envelope:[0,.3,.65,0]}]),
 motion('run_2','run_3','snap',['rotate','localizedWarp'])],
 {pop:{type:'number',default:.7,min:0,max:2}}),
 'connie-aerial@1':base('connie-aerial','Connie / Aerial',['aerial_1','aerial_2','aerial_3'],
 [['aerial_1',0],['aerial_2',.333],['aerial_3',.666],['loop',1]],
 [motion('aerial_1','aerial_2','easeOutCubic',['rotate','localizedWarp']),
 motion('aerial_2','aerial_3','easeInOutCubic',['rotate','localizedWarp'])]),
 'connie-dash-spin@1':base('connie-dash-spin','Connie / Dash Spin and Return',['spin_1','spin_2','spin_3'],
 [['spin_1',0],['spin_2',.14],['spin_3',.30],['spin_hold',.48],['return_3',.65],['return_2',.79],['return_1',.92],['spin_1',.98]],
 [motion('spin_1','spin_2','easeInCubic',['rotate']),motion('spin_2','spin_3','easeInCubic',['rotate']),
 motion('spin_3','spin_2','linear',['rotate']),motion('spin_2','spin_1','linear',['rotate'])],
 {direction:{type:'number',default:1,min:1,max:1},angularAcceleration:{type:'number',default:1,min:0,max:2}}),
 'connie-transform@1':base('connie-transform','Connie / Dash Spin and Return',['spin_1','spin_2','spin_3'],
 [['spin_1',0],['spin_2',.14],['spin_3',.30],['spin_hold',.48],['return_3',.65],['return_2',.79],['return_1',.92],['spin_1',.98]],
 [motion('spin_1','spin_2','easeInCubic',['rotate']),motion('spin_2','spin_3','easeInCubic',['rotate']),
 motion('spin_3','spin_2','linear',['rotate']),motion('spin_2','spin_1','linear',['rotate'])]),
 'connie-untransform@1':base('connie-untransform','Connie / Continuous Direction Return',['spin_3','spin_2','spin_1'],
 [['spin_3',0],['spin_2',.35],['spin_1',.7],['idle',.96]],
 [motion('spin_3','spin_2','linear',['rotate']),motion('spin_2','spin_1','linear',['rotate'])])
});
