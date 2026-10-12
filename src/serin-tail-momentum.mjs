// Damped, bounded liquid material spring. Does not change character/root physics.
const cap=(n,a,b)=>Math.min(b,Math.max(a,n));
export class SerinTailMomentum{
 constructor(){this.reset();}
 reset(){this.jumpCount=0;this.landingCount=0;this.length=1;this.lengthRate=0;
  this.bend=0;this.bendRate=0;this.impact=0;this.launchMomentum=0;this.launchKind='idle';
  this.direction=1;this.previousVertical=0;}
 advance(dt,s,maxSpeed,impulse=760){
  if(!Number.isFinite(dt)||dt<0||dt>0.5)throw Error('TAIL_INVALID_DT');
  if(!Number.isFinite(maxSpeed)||maxSpeed<=0||!Number.isFinite(impulse)||impulse<=0)throw Error('TAIL_INVALID_CONFIG');
  if(!Number.isFinite(s.velocity)||!Number.isFinite(s.jumpVelocity))throw Error('TAIL_INVALID_PHYSICS');
  if(s.jumpCount!==this.jumpCount&&s.inAir){
   this.jumpCount=s.jumpCount;this.launchKind=s.jumpFrom==='glide'?'glide':'idle';
   const speed=cap(Math.abs(s.velocity)/maxSpeed,0,1);
   this.launchMomentum=this.launchKind==='glide'?Math.max(0.64,speed):Math.min(0.22,speed);
   this.direction=Math.sign(s.velocity)||1;
   this.length=0.71+0.095*this.launchMomentum;this.lengthRate=0.45;
   this.bend=-0.05*this.launchMomentum*this.direction;this.bendRate=-2.1*this.launchMomentum*this.direction;
   this.impact=0;
  }
  if(s.landingCount!==this.landingCount){
   this.landingCount=s.landingCount;
   const speed=cap(-this.previousVertical/impulse,0,1.5);
   this.impact=cap(0.58+0.28*speed+0.12*this.launchMomentum,0,1);
   this.lengthRate=-1.6-speed;this.bendRate*=0.4;
  }
  const up=cap(s.jumpVelocity/impulse,0,1),down=cap(-s.jumpVelocity/impulse,0,1);
  const apex=1-cap(Math.abs(s.jumpVelocity)/impulse,0,1);
  const targetLength=s.inAir?1+up*(0.18+0.085*this.launchMomentum)+down*(0.12+0.05*this.launchMomentum)-0.095*apex:1;
  const lateral=cap(s.velocity/maxSpeed,-1,1);
  const targetBend=s.inAir?
   -(0.036+0.165*this.launchMomentum)*this.direction*(0.55+0.45*up)-0.045*lateral+0.082*down*this.direction:0;
  let remaining=dt;
  while(remaining>1e-10){
   const h=Math.min(1/120,remaining);
   this.lengthRate=cap(this.lengthRate+(256*(targetLength-this.length)-23*this.lengthRate)*h,-6,6);
   this.bendRate=cap(this.bendRate+(152*(targetBend-this.bend)-16*this.bendRate)*h,-5,5);
   this.length=cap(this.length+this.lengthRate*h,0.62,1.36);
   this.bend=cap(this.bend+this.bendRate*h,-0.34,0.34);
   this.impact*=Math.exp(-h/0.15);remaining-=h;
  }
  if(s.inAir)this.previousVertical=s.jumpVelocity;
  return Object.freeze({length:this.length,bend:this.bend,impact:this.impact,
   launchMomentum:this.launchMomentum,launchKind:this.launchKind});
 }
}
