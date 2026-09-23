export const PLAYBACK_SPEED_STORAGE_KEY = 'pose-lab-v2.sprite-playback-speed.v1';
export const DEFAULT_PLAYBACK_SPEED = 1;
export const MIN_PLAYBACK_SPEED = 0.1;
export const MAX_PLAYBACK_SPEED = 3;
export const PLAYBACK_SPEED_STEP = 0.05;

export function clampPlaybackSpeed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_PLAYBACK_SPEED;
  const clamped = Math.max(MIN_PLAYBACK_SPEED, Math.min(MAX_PLAYBACK_SPEED, numeric));
  return Math.round(clamped / PLAYBACK_SPEED_STEP) * PLAYBACK_SPEED_STEP;
}

export function formatPlaybackSpeed(value) {
  return `${clampPlaybackSpeed(value).toFixed(2)}×`;
}

export function readPlaybackSpeed(storage = globalThis.localStorage) {
  try {
    if (!storage) return DEFAULT_PLAYBACK_SPEED;
    const stored = storage.getItem(PLAYBACK_SPEED_STORAGE_KEY);
    return stored === null ? DEFAULT_PLAYBACK_SPEED : clampPlaybackSpeed(stored);
  } catch {
    return DEFAULT_PLAYBACK_SPEED;
  }
}

export function writePlaybackSpeed(value, storage = globalThis.localStorage) {
  const normalized = clampPlaybackSpeed(value);
  try {
    storage?.setItem(PLAYBACK_SPEED_STORAGE_KEY, String(normalized));
  } catch {
    // Persistence is a convenience; playback must remain usable when storage is unavailable.
  }
  return normalized;
}
