import { resolveProfileTiming, validateFrameRoles } from './profile-core.js';

export function serializeMotionInstance(profile, instance) {
  const validity = validateFrameRoles(profile, instance.frames);
  if (!validity.ok) throw new Error(`Missing required frame roles: ${validity.missing.join(', ')}`);
  const resolvedTimingMs = resolveProfileTiming(profile, instance.durationMs, instance.timingOverrides);
  return {
    schema:'plmp.v1',
    kind:'directed',
    motion:profile.id,
    profile:{id:profile.id,version:profile.version,copiedFrom:profile.copiedFrom || null},
    subject:instance.character,
    durationMs:instance.durationMs,
    frames:instance.frames,
    normalizedKeys:Object.fromEntries(profile.keys.map((key)=>[
      key.id,
      instance.timingOverrides?.[key.id] ?? key.at
    ])),
    resolvedTimingMs,
    transitions:profile.transitions,
    parameters:{
      defaults:Object.fromEntries(Object.entries(profile.parameters || {}).map(([k,v])=>[k,v.default])),
      overrides:instance.parameterOverrides || {}
    },
    stackOverrides:instance.stackOverrides || {},
    provenance:{
      deterministic:true,
      profilePinned:true,
      sourceFrameHashes:instance.sourceFrameHashes || {}
    }
  };
}

export function candidateRepoPath(instance) {
  const character = (instance.character || 'unknown').toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
  const id = (instance.id || 'motion').toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
  return `animations/candidates/${character}/${id}/recipe.json`;
}
