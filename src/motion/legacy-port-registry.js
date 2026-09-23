export const LEGACY_MOTION_PORTS = Object.freeze([
  // April donor motions. These are preserved as reusable profile/preset sources,
  // not one-off hard-coded animations.
  { owner:'april', motion:'jab', targetProfile:'jab@1', portAs:'preset', status:'ported-profile-source' },
  { owner:'april', motion:'cross', targetProfile:'jab@1', portAs:'profile-copy', status:'queued-profile-copy' },
  { owner:'april', motion:'hook', targetProfile:'jab@1', portAs:'profile-copy', status:'queued-profile-copy' },
  { owner:'april', motion:'run', targetProfile:'run@1', portAs:'instance', status:'queued-instance' },

  // Vanguard motions already known in Pose Lab / current corpus.
  { owner:'vanguard', motion:'jab', targetProfile:'jab@1', portAs:'instance', status:'queued-source-binding' },
  { owner:'vanguard', motion:'cross', targetProfile:'jab@1', portAs:'profile-copy', status:'queued-profile-copy' },
  { owner:'vanguard', motion:'hook', targetProfile:'jab@1', portAs:'profile-copy', status:'queued-profile-copy' },
  { owner:'vanguard', motion:'kick', targetProfile:'kick@1', portAs:'instance', status:'queued-source-binding' },
  { owner:'vanguard', motion:'run', targetProfile:'run@1', portAs:'instance', status:'queued-source-binding' },
  { owner:'vanguard', motion:'dodge-slide', targetProfile:'slide@1', portAs:'instance', status:'queued-source-binding' },
  { owner:'vanguard', motion:'flip-jump', targetProfile:'jump@1', portAs:'instance', status:'queued-source-binding' },

  // Existing Pose Lab motions that should become profile-backed instances or copies.
  { owner:'vanguard', motion:'grab-pull-blast', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'retention-thoom', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'two-hand-drive', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'reverse-crush', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'heavy-idle', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'brake-hard-plant', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'brace-manipulate', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' },
  { owner:'vanguard', motion:'dash', targetProfile:null, portAs:'future-profile', status:'inventory-preserved' }
]);

export function portsFor(owner) {
  return LEGACY_MOTION_PORTS.filter((entry) => entry.owner === owner);
}

export function unresolvedPorts() {
  return LEGACY_MOTION_PORTS.filter((entry) => !entry.status.startsWith('ported'));
}
