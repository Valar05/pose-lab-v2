import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

for (const marker of [
  'data-animation-menu',
  'data-animation-select',
  'data-animation-play',
  'data-animation-pause',
  'data-animation-restart',
  'function syncImportedAnimationMenu()',
  "animationSelect?.addEventListener('change'",
  'setupImportedAnimations(characterGltf)',
]) {
  assert.ok(source.includes(marker), `missing animation menu contract: ${marker}`);
}

assert.match(source, /animationSelect\.replaceChildren\(\.\.\.clipNames\.map/);
assert.match(source, /cyclePoseStateButton\.hidden = ACTIVE_CHARACTER\.supportsAnimationClips/);
assert.match(styles, /button\[data-cycle-animation\]/);
assert.match(styles, /button\[data-fpv-control-mode\]/);
assert.match(styles, /button\[hidden\]\s*\{\s*display: none !important;/);
assert.match(styles, /\.animation-menu\[hidden\]\s*\{\s*display: none;/);

console.log('imported animation menu contract ok');
