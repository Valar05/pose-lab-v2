import assert from 'node:assert/strict';
import {
  DEFAULT_PLAYBACK_SPEED,
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
  PLAYBACK_SPEED_STORAGE_KEY,
  clampPlaybackSpeed,
  formatPlaybackSpeed,
  readPlaybackSpeed,
  writePlaybackSpeed,
} from '../src/playback-preferences.js';

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    value(key) { return values.get(key); },
  };
}

assert.equal(clampPlaybackSpeed('0.47'), 0.45);
assert.equal(clampPlaybackSpeed(-10), MIN_PLAYBACK_SPEED);
assert.equal(clampPlaybackSpeed(99), MAX_PLAYBACK_SPEED);
assert.equal(clampPlaybackSpeed('nope'), DEFAULT_PLAYBACK_SPEED);
assert.equal(formatPlaybackSpeed(0.5), '0.50×');

const empty = makeStorage();
assert.equal(readPlaybackSpeed(empty), DEFAULT_PLAYBACK_SPEED);

const seeded = makeStorage({ [PLAYBACK_SPEED_STORAGE_KEY]: '0.55' });
assert.equal(readPlaybackSpeed(seeded), 0.55);

const writable = makeStorage();
assert.equal(writePlaybackSpeed(1.37, writable), 1.35);
assert.equal(writable.value(PLAYBACK_SPEED_STORAGE_KEY), '1.35');

assert.equal(readPlaybackSpeed({ getItem() { throw new Error('blocked'); } }), DEFAULT_PLAYBACK_SPEED);
assert.equal(writePlaybackSpeed(0.5, { setItem() { throw new Error('blocked'); } }), 0.5);

console.log(JSON.stringify({ ok: true, key: PLAYBACK_SPEED_STORAGE_KEY }));
