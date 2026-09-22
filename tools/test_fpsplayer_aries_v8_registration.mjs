import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = 'public/assets/fpsplayer-aries-v8/fpsplayer_aries_v8_manifest.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert(manifest.modelKey === 'fpsplayer-aries-v8', 'manifest model key must remain fpsplayer-aries-v8');
assert(manifest.status === 'user-accepted-3d-baseline', '3D baseline must remain explicitly accepted');
assert(manifest.twoDUpdatePolicy?.source3DImmutable === true, '2D work must not mutate the accepted 3D source');
assert(manifest.twoDUpdatePolicy?.appendOnly === true, '2D derivatives must be append-only');

for (const [file, expected] of Object.entries(manifest.files || {})) {
  assert(fs.existsSync(path.join(root, file)), `missing accepted asset: ${file}`);
  if (fs.existsSync(path.join(root, file))) assert(sha256(file) === expected, `hash mismatch: ${file}`);
}

const glbPath = manifest.source.runtimeGlb;
if (fs.existsSync(path.join(root, glbPath))) {
  const bytes = fs.readFileSync(path.join(root, glbPath));
  assert(bytes.toString('ascii', 0, 4) === 'glTF', 'runtime asset must be binary glTF');
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/, ''));
  assert(json.meshes?.length === 16, 'runtime must retain 16 meshes');
  assert(json.skins?.length === 1, 'runtime must retain one skin');
  assert(json.animations?.length === 57, 'runtime must retain 57 animations');
  assert(json.nodes?.filter((node) => node.name?.startsWith('ARIES_Plate_')).length === 15, 'runtime must retain 15 physical plate nodes');
  const materials = new Set((json.materials || []).map((item) => item.name));
  assert(materials.has('ARIES_Plate_Material') && materials.has('Player'), 'runtime must retain both accepted materials');
  const images = new Set((json.images || []).map((item) => item.name));
  for (const name of ['FPSPlayer_ARIES_Albedo_v5_1', 'FPSPlayer_ARIES_Normal_v3', 'FPSPlayer_ARIES_ORM_v8']) {
    assert(images.has(name), `runtime missing embedded texture: ${name}`);
  }
  const primitives = (json.meshes || []).flatMap((mesh) => mesh.primitives || []);
  assert(primitives.length > 0 && primitives.every((primitive) => primitive.attributes?.TEXCOORD_1 !== undefined), 'every runtime primitive must retain TEXCOORD_1');
}

const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
for (const needle of [
  "'fpsplayer-aries-v8': {",
  "asset: ASSETS.fpsplayerAriesV8",
  "defaultClip: 'FistReady'",
  "firstPersonFov: 105",
  "'aries-v8': 'fpsplayer-aries-v8'",
]) assert(main.includes(needle), `model registration missing: ${needle}`);

const derivatives = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/fpsplayer-aries-v8/2d/animations.json'), 'utf8'));
assert(derivatives.modelKey === manifest.modelKey, '2D lane must target the ARIES V8 model');
assert(derivatives.sourceModelSha256 === manifest.files[glbPath], '2D lane must pin the accepted runtime GLB hash');
assert(derivatives.policy?.appendOnly === true, '2D animation registry must be append-only');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, modelKey: manifest.modelKey, animations: manifest.inventory.animations, files: Object.keys(manifest.files).length }, null, 2));
