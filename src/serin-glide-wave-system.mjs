import {SerinGlideController, demoAxis, DEMO_DURATION_SECONDS} from './serin-glide-system.mjs';
export {demoAxis,DEMO_DURATION_SECONDS};
const follow=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export class SerinGlideWaveController extends SerinGlideController {
 reset(){
  super.reset();
  this.wavePhase=0;this.edgePhase=0;this.waveAmplitude=0.006;
  this.crest=0;this.crestCenter=0.75;this.wakeImpulse=0;this.forwardLean=0;
  return this.getState();
 }
 getState(){
  return Object.freeze({...super.getState(),wavePhase:this.wavePhase||0,
   edgePhase:this.edgePhase||0,waveAmplitude:this.waveAmplitude||0,
   crest:this.crest||0,crestCenter:this.crestCenter||0.75,
   wakeImpulse:this.wakeImpulse||0,forwardLean:this.forwardLean||0});
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
   // Added lean modifies only upper sprite. The grounded puddle never rotates.
   this.forwardLean=follow(this.forwardLean,Math.abs(this.velocity)>0.01?
    Math.sign(this.velocity)*(3+10*speed):0,8,h);
   rem-=h;
  }
  return this.getState();
 }
}
