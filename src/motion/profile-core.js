export const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function resolveProfileTiming(profile, durationMs, timingOverrides = {}) {
  const duration = Math.max(1, Number(durationMs) || 1);
  const out = {};
  for (const key of profile.keys || []) {
    const normalized = timingOverrides[key.id] ?? key.at;
    out[key.id] = Math.round(clamp01(normalized) * duration);
  }
  return out;
}

export function copyProfile(profile, { id, label } = {}) {
  const next = deepClone(profile);
  next.id = id || `${profile.id}-copy`;
  next.label = label || `${profile.label} Copy`;
  next.version = 1;
  next.copiedFrom = { id: profile.id, version: profile.version };
  return next;
}

export function instantiateProfile(profile, {
  id,
  character,
  durationMs = 320,
  frames = {},
  timingOverrides = {},
  parameterOverrides = {},
  stackOverrides = {},
} = {}) {
  return {
    schema: 'pose-lab.motion-instance.v1',
    id: id || `${profile.id}-instance`,
    profile: { id: profile.id, version: profile.version },
    character: character || 'unknown',
    durationMs: Math.max(1, Number(durationMs) || 320),
    frames: { ...frames },
    timingOverrides: { ...timingOverrides },
    parameterOverrides: { ...parameterOverrides },
    stackOverrides: { ...stackOverrides },
  };
}

export function validateFrameRoles(profile, frames) {
  const missing = [];
  for (const role of profile.frameRoles || []) {
    if (role.required !== false && !frames?.[role.id]) missing.push(role.id);
  }
  return { ok: missing.length === 0, missing };
}

export function effectiveParameter(profile, instance, id) {
  if (id in (instance.parameterOverrides || {})) return instance.parameterOverrides[id];
  return profile.parameters?.[id]?.default;
}

export function profileKey(profile, instance, keyId) {
  const override = instance.timingOverrides?.[keyId];
  if (override !== undefined) return clamp01(override);
  return clamp01(profile.keys.find((key) => key.id === keyId)?.at ?? 0);
}
