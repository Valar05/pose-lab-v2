const freeze = (value) => Object.freeze(value);

export const EASINGS = freeze({
  linear: { id: 'linear', label: 'Linear', sample: (t) => t },
  easeOutCubic: { id: 'easeOutCubic', label: 'Ease Out Cubic', sample: (t) => 1 - Math.pow(1 - t, 3) },
  easeInOutCubic: { id: 'easeInOutCubic', label: 'Ease In/Out Cubic', sample: (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2 },
  snap: { id: 'snap', label: 'Snap', sample: (t) => t < .7 ? t * .55 : .385 + (t - .7) * 2.05 },
  overshoot: { id: 'overshoot', label: 'Overshoot', sample: (t) => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); } },
  stepped: { id: 'stepped', label: 'Stop-motion Step', sample: (t, steps=4) => Math.floor(t*Math.max(1,steps))/Math.max(1,steps) },
  aprilJabDrive: { id: 'aprilJabDrive', label: 'April Jab Drive', sample: (t) => 1 - Math.pow(1 - t, 4) },
  aprilJabRecoil: { id: 'aprilJabRecoil', label: 'April Jab Recoil', sample: (t) => t < .35 ? t/.35 : 1 - ((t-.35)/.65)*.28 },
});

export const MODIFIERS = freeze({
  translate: { id:'translate', label:'Translate' },
  rotate: { id:'rotate', label:'Rotate' },
  scale: { id:'scale', label:'Scale' },
  skew: { id:'skew', label:'Skew' },
  squashStretch: { id:'squashStretch', label:'Squash / Stretch' },
  localizedWarp: { id:'localizedWarp', label:'Localized Warp' },
  armExtension: { id:'armExtension', label:'Arm Extension' },
  torsoCompression: { id:'torsoCompression', label:'Torso Compression' },
  recoilCompress: { id:'recoilCompress', label:'Recoil Compression' },
  pivotShift: { id:'pivotShift', label:'Pivot Shift' },
});

export const FILTERS = freeze({
  directionalBlur: { id:'directionalBlur', label:'Directional Blur', type:'webgl', envelope:true },
  contactEcho: { id:'contactEcho', label:'Contact Echo', type:'webgl', envelope:true },
  displacementWarp: { id:'displacementWarp', label:'Displacement Warp', type:'webgl', envelope:true },
  edgeStretch: { id:'edgeStretch', label:'Edge Stretch', type:'webgl', envelope:true },
  smearTrail: { id:'smearTrail', label:'Smear Trail', type:'webgl', envelope:true },
  hitFlash: { id:'hitFlash', label:'Hit Flash', type:'webgl', envelope:true },
  paletteQuantize: { id:'paletteQuantize', label:'Palette Quantize', type:'image', envelope:false },
  alphaCleanup: { id:'alphaCleanup', label:'Alpha Cleanup', type:'image', envelope:false },
});

export const CONSTRAINTS = freeze({
  footLock: { id:'footLock', label:'Foot Lock' },
  handLock: { id:'handLock', label:'Hand Lock' },
  weaponLock: { id:'weaponLock', label:'Weapon Lock' },
  headStabilize: { id:'headStabilize', label:'Head Stabilize' },
  preserveSilhouette: { id:'preserveSilhouette', label:'Preserve Silhouette' },
  preserveBaseline: { id:'preserveBaseline', label:'Preserve Baseline' },
  maxStretch: { id:'maxStretch', label:'Maximum Stretch' },
});

export const EVENTS = freeze({
  hitStop: { id:'hitStop', label:'Hit Stop' },
  contact: { id:'contact', label:'Contact' },
  muzzleFlash: { id:'muzzleFlash', label:'Muzzle Flash' },
  cameraShake: { id:'cameraShake', label:'Camera Shake' },
  soundCue: { id:'soundCue', label:'Sound Cue' },
});
