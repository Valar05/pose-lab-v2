export const CONNIE_ATLAS = './assets/connie/connie-approved-composite.png';
export const CONNIE_RECTS = Object.freeze({
 idle:[10,95,310,500],run_1:[360,110,750,490],run_2:[745,110,1110,490],run_3:[1110,110,1520,490],
 aerial_1:[270,585,585,905],aerial_2:[595,585,950,895],aerial_3:[950,595,1280,900],
 spin_1:[250,950,635,1270],spin_2:[630,930,975,1250],spin_3:[965,900,1295,1220]
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
 'connie-run@1':base('connie-run','Connie / Paper Run',['run_1','run_2','run_3'],
 [['run_1',0],['run_2',.333],['run_3',.666],['loop',1]],
 [motion('run_1','run_2','easeInOutCubic',['pivotShift','localizedWarp'],[{id:'directionalBlur',envelope:[0,.3,.65,0]}]),
 motion('run_2','run_3','snap',['rotate','localizedWarp'])],
 {pop:{type:'number',default:.7,min:0,max:2}}),
 'connie-aerial@1':base('connie-aerial','Connie / Aerial',['aerial_1','aerial_2','aerial_3'],
 [['aerial_1',0],['aerial_2',.333],['aerial_3',.666],['loop',1]],
 [motion('aerial_1','aerial_2','easeOutCubic',['rotate','localizedWarp']),
 motion('aerial_2','aerial_3','easeInOutCubic',['rotate','localizedWarp'])]),
 'connie-transform@1':base('connie-transform','Connie / Accelerating Transform',['spin_1','spin_2','spin_3'],
 [['spin_1',0],['spin_2',.305],['spin_3',.621],['settle',1]],
 [motion('spin_1','spin_2','easeInOutCubic',['rotate','localizedWarp']),
 motion('spin_2','spin_3','easeOutCubic',['rotate','localizedWarp'],[{id:'smearTrail',envelope:[0,.15,.85,0]}])],
 {angularAcceleration:{type:'number',default:1,min:0,max:2}}),
 'connie-untransform@1':base('connie-untransform','Connie / Reverse Transform',['spin_3','spin_2','spin_1'],
 [['spin_3',0],['spin_2',.379],['spin_1',.695],['settle',1]],
 [motion('spin_3','spin_2','easeOutCubic',['rotate','localizedWarp']),
 motion('spin_2','spin_1','easeInOutCubic',['rotate','localizedWarp'])])
});
