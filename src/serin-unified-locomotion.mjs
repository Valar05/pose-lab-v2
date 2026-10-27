// Serin unified locomotion: one ground controller, one vertical jump physics lane.
// The game may consume world X and jumpY; the review stage keeps X centered.
import {SerinGlideWaveController} from './serin-glide-wave-system.mjs';
const follow=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
export const JUMP_DEFAULTS=Object.freeze({
 impulse:760,gravity:1260,airDrift:1, // px/s, px/s^2, fraction of ground steering
 takeoffElasticity:0.10,landingElasticity:0.13,bufferSeconds:0.085
});
export class SerinUnifiedLocomotion extends SerinGlideWaveController {
 constructor(config={},jumpConfig={}){super(config);this.jumpConfig={...JUMP_DEFAULTS,...jumpConfig};}
 reset(){
  super.reset();
  this.jumpY=0;this.jumpVelocity=0;this.inAir=false;this.jumpCount=0;
  this.jumpFrom='idle';this.airShape=0;this.flightTrail=0;
  this.landCompression=0;this.landingCount=0;this.jumpBuffer=0;this.lastJumpPressed=false;
  return this.getState();
 }
 getState(){
  return Object.freeze({...super.getState(),
   jumpY:this.jumpY||0,jumpVelocity:this.jumpVelocity||0,
   inAir:!!this.inAir,jumpCount:this.jumpCount||0,
   jumpFrom:this.jumpFrom||'idle',
   airShape:this.airShape||0,flightTrail:this.flightTrail||0,
   landCompression:this.landCompression||0,landingCount:this.landingCount||0,
   jumpBuffer:this.jumpBuffer||0
  });
 }
 update(dt,axis=0,jumpPressed=false){
  if(!Number.isFinite(dt)||dt<0||dt>0.5)throw Error('SERIN_JUMP_INVALID_DELTA');
  if(!Number.isFinite(axis)||Math.abs(axis)>1.001)throw Error('SERIN_JUMP_INVALID_AXIS');
  const edge=!!jumpPressed&&!this.lastJumpPressed;
  this.lastJumpPressed=!!jumpPressed;
  if(edge)this.jumpBuffer=this.jumpConfig.bufferSeconds;
  let remain=dt;
  while(remain>1e-10){
   const h=Math.min(1/120,remain);
   // Immediate takeoff, before any compression animation. Accepted X glide
   // owns movement, so jumping while gliding retains horizontal momentum.
   if(!this.inAir&&this.jumpBuffer>0){
    this.inAir=true;this.jumpY=0;this.jumpVelocity=this.jumpConfig.impulse;
    this.jumpFrom=this.sourceMode>0.5?'glide':'idle';
    this.jumpCount++;this.jumpBuffer=0;this.landCompression=0;
   }
   super.update(h,axis);
   if(this.inAir){
    const oldY=this.jumpY;
    this.jumpVelocity-=this.jumpConfig.gravity*h;
    this.jumpY+=this.jumpVelocity*h;
    if(this.jumpY<=0&&this.jumpVelocity<=0){
     this.jumpY=0;this.jumpVelocity=0;this.inAir=false;
     this.landingCount++;
     this.landCompression=Math.min(1,0.70+oldY/80);
    }
   }
   const goal=this.inAir?1:0;
   this.airShape=follow(this.airShape,goal,this.inAir?12:10,h);
   const speed=Math.min(1,Math.abs(this.velocity)/this.config.maxSpeed);
   this.flightTrail=follow(this.flightTrail,this.inAir?(0.6+0.4*speed):0,this.inAir?7:9,h);
   this.landCompression*=Math.exp(-h/this.jumpConfig.landingElasticity);
   this.jumpBuffer=Math.max(0,this.jumpBuffer-h);
   remain-=h;
  }
  return this.getState();
 }
}
