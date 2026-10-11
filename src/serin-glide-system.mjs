// Production-facing, deterministic input-driven Serin locomotion.
// The game owns world placement; sprite rendering reads the resulting state.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const toward=(x,t,n)=>x<t?Math.min(x+n,t):Math.max(x-n,t);
export const GLIDE_DEFAULTS=Object.freeze({
 maxSpeed:235,accelerate:525,brake:710,reverseBrake:920,
 pitchDegrees:7.8,accelerationPitchDegrees:3.2,
 springStiffness:78,springDamping:14,blendRise:6.5,blendFall:4.0,
 substepSeconds:1/120
});
export class SerinGlideController {
 constructor(config={}){this.config={...GLIDE_DEFAULTS,...config};this.reset();}
 reset(){this.velocity=0;this.position=0;this.slosh=0;this.sloshVelocity=0;this.poseBlend=0;this.phase=0;this.facing=1;this.pitch=0;this.wake=0;this.time=0;this.mode='idle';return this.getState();}
 getState(){return Object.freeze({velocity:this.velocity,position:this.position,slosh:this.slosh,sloshVelocity:this.sloshVelocity,poseBlend:this.poseBlend,phase:this.phase,facing:this.facing,pitch:this.pitch,wake:this.wake,time:this.time,mode:this.mode});}
 update(dt,input=0){
  if(!Number.isFinite(dt)||dt<0||dt>0.5)throw Error('INVALID_GLIDE_DELTA');
  if(!Number.isFinite(input))throw Error('INVALID_GLIDE_INPUT');
  const axis=clamp(input,-1,1);let remain=dt;
  while(remain>1e-10){const h=Math.min(this.config.substepSeconds,remain);this.step(h,axis);remain-=h;}
  return this.getState();
 }
 step(dt,axis){
  const cfg=this.config,last=this.velocity,want=axis*cfg.maxSpeed;
  const opposed=axis&&this.velocity&&Math.sign(axis)!==Math.sign(this.velocity);
  const rate=axis===0?cfg.brake:opposed?cfg.reverseBrake:cfg.accelerate;
  this.velocity=toward(this.velocity,want,rate*dt);
  const acc=(this.velocity-last)/dt;
  this.position+=this.velocity*dt;this.time+=dt;
  if(axis)this.facing=Math.sign(axis);
  else if(Math.abs(this.velocity)>0.5)this.facing=Math.sign(this.velocity);
  const force=-acc*0.00025;
  this.sloshVelocity+=(force-cfg.springStiffness*this.slosh-cfg.springDamping*this.sloshVelocity)*dt;
  this.slosh=clamp(this.slosh+this.sloshVelocity*dt,-0.42,0.42);
  const speed=Math.min(1,Math.abs(this.velocity)/cfg.maxSpeed);
  const target=speed<0.025?0:speed*speed*(3-2*speed);
  this.poseBlend=toward(this.poseBlend,target,(target>this.poseBlend?cfg.blendRise:cfg.blendFall)*dt);
  if(this.poseBlend<0.00001)this.poseBlend=0;
  const forward=this.velocity===0?0:Math.sign(this.velocity);
  this.pitch=clamp(forward*speed*cfg.pitchDegrees+clamp(acc/cfg.accelerate,-1.5,1.5)*cfg.accelerationPitchDegrees+this.slosh*15,-15,15);
  this.phase+=Math.abs(this.velocity)*dt*0.055;
  this.wake=clamp(speed*0.75+Math.abs(this.slosh)*1.2,0,1);
  if(Math.abs(this.velocity)<0.12&&Math.abs(this.slosh)<0.0005&&Math.abs(this.sloshVelocity)<0.005&&this.poseBlend===0){
   this.velocity=0;this.slosh=0;this.sloshVelocity=0;this.pitch=0;this.wake=0;this.mode='idle';
  }else if(axis&&Math.abs(acc)>2)this.mode='starting';
  else if(axis===0&&Math.abs(this.velocity)>0.12)this.mode='braking';
  else if(axis===0)this.mode='settling';
  else this.mode='gliding';
 }
}
export const DEMO_DURATION_SECONDS=10.75;
export function demoAxis(t){return t>=1&&t<5?1:0;}
