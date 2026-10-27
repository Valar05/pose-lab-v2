import {SerinGlideController, demoAxis, DEMO_DURATION_SECONDS} from './serin-glide-system.mjs';
export {demoAxis,DEMO_DURATION_SECONDS};
const follow=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export class SerinGlideWaveController extends SerinGlideController {
 reset(){
  super.reset();
  this.wavePhase=0;this.edgePhase=0;this.waveAmplitude=0.006;
  this.crest=0;this.crestCenter=0.75;this.wakeImpulse=0;this.forwardLean=0;
  this.reverseBend=0;this.shapeProgress=0;
  // Sprite authority is a latched state, not a continuous 0.5 threshold.
  this.sourceMode=0;this.sourceSwitchCount=0;this.reverseHeldSource=0;
  return this.getState();
 }
 getState(){
  return Object.freeze({...super.getState(),wavePhase:this.wavePhase||0,
   edgePhase:this.edgePhase||0,waveAmplitude:this.waveAmplitude||0,
   crest:this.crest||0,crestCenter:this.crestCenter||0.75,
   wakeImpulse:this.wakeImpulse||0,forwardLean:this.forwardLean||0,
   reverseBend:this.reverseBend||0,shapeProgress:this.shapeProgress||0,
   sourceMode:this.sourceMode||0,sourceSwitchCount:this.sourceSwitchCount||0});
 }
 update(dt,input=0){
  if(!Number.isFinite(dt)||dt<0||dt>0.5)throw Error('WAVE_INVALID_DELTA');
  if(!Number.isFinite(input)||Math.abs(input)>1.001)throw Error('WAVE_INVALID_INPUT');
  let rem=dt;
  while(rem>1e-10){
   const h=Math.min(1/120,rem),previous=this.velocity;
   super.update(h,input);
   const speed=Math.min(1,Math.abs(this.velocity)/this.config.maxSpeed);
   const accel=Math.abs((this.velocity-previous)/h);
   const excited=Math.min(1,accel/this.config.brake);
   this.wakeImpulse=follow(this.wakeImpulse,excited,16,h)*Math.exp(-2.9*h);
   this.wavePhase+=h*(1.9+3.2*speed)*2*Math.PI;
   this.edgePhase+=h*(3.5+3.5*speed)*2*Math.PI;
   this.waveAmplitude=follow(this.waveAmplitude,0.006+0.014*speed+0.006*this.wakeImpulse,10,h);
   this.crest=follow(this.crest,0.048*speed+0.012*this.wakeImpulse,8,h);
   this.crestCenter=follow(this.crestCenter,this.velocity<0?0.25:0.76,8,h);
   // Source identity follows a continuous deformation phase, not speed or
   // fluid settling. Enter/exit takes about 200 ms and happens during motion.
   // 0 = authored front idle, 1 = authored forward glide. One handoff each way.
   const right=input>0.05, backwards=input< -0.05;
   const visualTarget=right?1:0;
   this.shapeProgress=follow(this.shapeProgress,visualTarget,right?4.8:4.1,h);
   if(this.shapeProgress<0.0001)this.shapeProgress=0;
   if(this.shapeProgress>0.9999)this.shapeProgress=1;
   // Restore the living body bend. Drive it through the *same* pose phase so
   // it visibly unwinds on exit instead of snapping upright and switching.
   this.forwardLean=follow(this.forwardLean,8.6*this.shapeProgress,10,h);
   // A genuine but restrained backward SILHOUETTE pose for reverse.
   // No new PNG, whole-body flip, or repeated sprite swapping.
   const reverseTarget=backwards?4.5*speed:0;
   this.reverseBend=follow(this.reverseBend,reverseTarget,backwards?9:7,h);
   if(backwards||this.velocity<0)this.pitch=0;
   // Hysteresis lets each source change only once per traversal.
   // This happens *mid-motion*, not after the puddle/torso are frozen.
   let next=this.sourceMode;
   if(this.shapeProgress>=0.58)next=1;
   else if(this.shapeProgress<=0.42)next=0;
   if(next!==this.sourceMode){this.sourceMode=next;this.sourceSwitchCount++;}
   rem-=h;
  }
  return this.getState();
 }
}
