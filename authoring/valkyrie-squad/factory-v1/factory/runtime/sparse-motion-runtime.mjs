export const MOTION_LIBRARY_SCHEMA = 'sparse-sprite-motion-library-v1';

export function ease(t) {
  const q = Math.max(0, Math.min(1, t));
  return q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
}

export function validateMotionLibrary(library, poseIds) {
  if (library.schema !== MOTION_LIBRARY_SCHEMA) throw new Error(`unsupported motion schema: ${library.schema}`);
  if (!library.character || !library.animations || !Object.keys(library.animations).length) throw new Error('motion character and animations are required');
  const allowedPoses = new Set(poseIds);
  for (const [id, animation] of Object.entries(library.animations)) {
    if (!animation.kind || !Number.isFinite(animation.durationMs) || animation.durationMs <= 0) throw new Error(`${id} has invalid kind or duration`);
    if (!animation.poses?.length) throw new Error(`${id} has no semantic poses`);
    for (const pose of animation.poses) if (!allowedPoses.has(pose)) throw new Error(`${id} references missing pose ${pose}`);
    if (animation.rootMotion !== false) throw new Error(`${id} must declare rootMotion false for this factory`);
    if (animation.phases) {
      const phaseDuration = animation.phases.reduce((sum, phase) => sum + phase.durationMs, 0);
      if (Math.abs(phaseDuration - animation.durationMs) > 0.000001) throw new Error(`${id} phase durations do not equal durationMs`);
      for (const phase of animation.phases) {
        if (!phase.name || !Number.isFinite(phase.durationMs) || phase.durationMs <= 0) throw new Error(`${id} has an invalid phase`);
        for (const [channel, range] of Object.entries(phase.channels ?? {})) if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite)) throw new Error(`${id}/${phase.name}/${channel} must be [from,to]`);
      }
    }
    if (animation.motionBlur?.required && !(animation.motionBlur.samples > 1)) throw new Error(`${id} requires multiple blur samples`);
  }
  return library;
}

export function samplePhased(animation, timeMs) {
  if (!animation.phases?.length) throw new Error('samplePhased requires phases');
  const wrapped = ((timeMs % animation.durationMs) + animation.durationMs) % animation.durationMs;
  let cursor = 0;
  for (let index = 0; index < animation.phases.length; index++) {
    const phase = animation.phases[index];
    const end = cursor + phase.durationMs;
    if (wrapped < end || index === animation.phases.length - 1) {
      const progress = ease((wrapped - cursor) / phase.durationMs);
      const channels = Object.fromEntries(Object.entries(phase.channels ?? {}).map(([name, [from, to]]) => [name, from + (to - from) * progress]));
      return { phaseIndex: index, phase: phase.name, timeMs: wrapped, progress, ...channels };
    }
    cursor = end;
  }
}

export function directionalBlurSamples(motionBlur, strength = 1) {
  if (!motionBlur?.required || strength <= 0) return [];
  return Array.from({ length: motionBlur.samples }, (_, index) => {
    const depth = (motionBlur.samples - index) / motionBlur.samples;
    return { offsetPx: -(motionBlur.spanPx ?? 0) * depth * strength, angleDeg: -(motionBlur.spanDeg ?? 0) * depth * strength, filterPx: motionBlur.filterPx, alpha: (0.035 + 0.08 * (1 - depth)) * strength };
  });
}
