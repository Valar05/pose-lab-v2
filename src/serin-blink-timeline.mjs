// Serin blink envelopes are pure and time-domain controlled.
// Exact intervals are declared by the pose recipe, not seeded randomly each render.
export function ease01(n) {
  const t=Math.max(0,Math.min(1,n));
  return t*t*(3-2*t);
}
export function blinkPulse(timeMs, event) {
  const dt=timeMs-event.atMs;
  const close=event.closeMs, hold=event.holdMs, open=event.openMs;
  if(dt<0||dt>close+hold+open)return 0;
  if(dt<close)return ease01(dt/close);
  if(dt<close+hold)return 1;
  return 1-ease01((dt-close-hold)/open);
}
export function scheduledBlink(timeMs, spec) {
  if(!Number.isFinite(timeMs)||timeMs<0)return 0;
  const t=((timeMs%spec.periodMs)+spec.periodMs)%spec.periodMs;
  return spec.events.reduce((value,event)=>Math.max(value,blinkPulse(t,event)),0);
}
export function manualBlink(nowMs,startedAtMs,event) {
  return Number.isFinite(startedAtMs)
    ? blinkPulse(Math.max(0,nowMs-startedAtMs),event)
    : 0;
}
export function verifyBlinkSpec(spec) {
  if(!spec||!Number.isFinite(spec.periodMs)||spec.periodMs<15000||spec.periodMs>120000)throw Error('SERIN_BLINK_PERIOD_INVALID');
  if(!Array.isArray(spec.events)||spec.events.length<3||spec.events.length>12)throw Error('SERIN_BLINK_SCHEDULE_INVALID');
  let previousEnd=-1;
  for(const event of spec.events){
    const {atMs,closeMs,holdMs,openMs}=event;
    if(![atMs,closeMs,holdMs,openMs].every(Number.isFinite)||closeMs<40||holdMs<0||openMs<65||atMs<=previousEnd)throw Error('SERIN_BLINK_EVENT_INVALID');
    previousEnd=atMs+closeMs+holdMs+openMs;
  }
  if(previousEnd>=spec.periodMs)throw Error('SERIN_BLINK_PERIOD_SEAM');
  for(const k of ['leftEye','rightEye']){
    const eye=spec[k];
    if(!eye||![eye.x,eye.y,eye.rx,eye.ry,eye.slant].every(Number.isFinite))throw Error('SERIN_EYE_REGION_INVALID');
    if(eye.x<620||eye.x>750||eye.y<72||eye.y>160||eye.rx<5||eye.rx>35||eye.ry<4||eye.ry>16||Math.abs(eye.slant)>0.5)throw Error('SERIN_EYE_REGION_UNSAFE');
  }
  return true;
}
