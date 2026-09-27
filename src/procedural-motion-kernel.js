const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;

function phaseWeight(profile,phaseId){
  const weights=profile?.phaseWeights;
  if(!weights||typeof weights!=='object')return 1;
  return num(weights[phaseId],0);
}

function terminalStill(profile,phaseId){
  return Array.isArray(profile?.terminalStillPhases)&&profile.terminalStillPhases.includes(phaseId);
}

function axisSignal(profile,axis,ms,baseSignal){
  const cycle=Math.max(1,num(profile?.cycleMs,1000));
  const phase=(ms/cycle)*TAU+num(profile?.axisPhase?.[axis],0);
  const secondary=num(profile?.harmonics?.secondary,0);
  const tertiary=num(profile?.harmonics?.tertiary,0);
  return Math.sin(phase)+secondary*Math.sin(phase*2+0.73)+tertiary*Math.sin(phase*3+1.31)+baseSignal;
}

function commonEnvelope(profile,ctx){
  const weight=phaseWeight(profile,ctx.phaseId);
  if(weight<=0||terminalStill(profile,ctx.phaseId))return 0;
  const decayMs=Math.max(1,num(profile?.decayMs,650));
  const decay=Math.exp(-Math.max(0,num(ctx.ms,0))/decayMs);
  switch(profile?.mode){
    case 'asymmetric-alert-pulse':
      return weight*(0.42+0.58*clamp(ctx.phaseU,0,1));
    case 'ringdown-impact':
    case 'collapse-ringdown':
    case 'terminal-spasm':
      return weight*Math.max(0.08,decay);
    case 'effort-burst':
      return weight*(0.35+0.65*Math.sin(Math.PI*clamp(ctx.phaseU,0,1)));
    default:
      return weight;
  }
}

function modeSignal(profile,ctx){
  const cycle=Math.max(1,num(profile?.cycleMs,1000));
  const p=(num(ctx.ms,0)/cycle)*TAU;
  switch(profile?.mode){
    case 'organic-breath-v2':
      return 0.18*Math.sin(p*0.5+0.4);
    case 'asymmetric-alert-pulse': {
      const s=Math.sin(p);
      const sharp=Math.pow(Math.max(0,s),3);
      const rebound=0.28*Math.pow(Math.max(0,-s),2);
      return sharp-rebound;
    }
    case 'ringdown-impact':
      return 0.45*Math.sin(p*2.35)*Math.exp(-Math.max(0,num(ctx.ms,0))/Math.max(1,num(profile?.decayMs,560)));
    case 'collapse-ringdown':
      return 0.38*Math.sin(p*1.7)*Math.exp(-Math.max(0,num(ctx.ms,0))/Math.max(1,num(profile?.decayMs,720)));
    case 'effort-burst':
      return 0.22*Math.sin(p*0.75+0.8);
    case 'terminal-spasm':
      return 0.5*Math.sin(p*2.8)*Math.exp(-Math.max(0,num(ctx.ms,0))/Math.max(1,num(profile?.decayMs,520)));
    default:
      return 0;
  }
}

export function evaluateProceduralMotion(profile,ctx,base){
  if(!profile)return {...base};
  const env=commonEnvelope(profile,ctx);
  if(env===0)return {...base};
  const shared=modeSignal(profile,ctx);
  const amps=profile.amplitudes||{};
  const shearSig=axisSignal(profile,'shearX',ctx.ms,shared);
  const sxSig=axisSignal(profile,'scaleX',ctx.ms,shared);
  const sySig=axisSignal(profile,'scaleY',ctx.ms,shared);
  const rotSig=axisSignal(profile,'rotateDeg',ctx.ms,shared);
  return{
    shearX:num(base?.shearX,0)+env*shearSig*num(amps.shearX,0),
    scaleX:num(base?.scaleX,1)-env*sxSig*num(amps.scaleX,0),
    scaleY:num(base?.scaleY,1)+env*sySig*num(amps.scaleY,0),
    rotateDeg:num(base?.rotateDeg,0)+env*rotSig*num(amps.rotateDeg,0)
  };
}
