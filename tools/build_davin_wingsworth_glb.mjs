import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const walkingPath = path.join(root, 'generated/davin-biped-inspect/Meshy_AI_Sky_Patrol_Hawk_biped/Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Walking_withSkin.glb');
const runningPath = path.join(root, 'generated/davin-biped-inspect/Meshy_AI_Sky_Patrol_Hawk_biped/Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Running_withSkin.glb');
const materialPath = '/storage/emulated/0/Download/Meshy_AI_Sky_Patrol_Hawk_0716213205_texture.glb';
const outPath = path.join(root, 'public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb');

function align4(value) {
  return (value + 3) & ~3;
}

function readGlb(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file} is not GLB`);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.slice(offset + 8, offset + 8 + length);
    if (type === 'JSON') json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trimEnd());
    if (type === 'BIN\0') bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file} missing JSON or BIN chunk`);
  return { json, bin };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function appendSlice(target, source, byteOffset, byteLength) {
  const padding = align4(target.bin.length) - target.bin.length;
  if (padding) target.bin = Buffer.concat([target.bin, Buffer.alloc(padding)]);
  const nextOffset = target.bin.length;
  target.bin = Buffer.concat([target.bin, source.bin.slice(byteOffset, byteOffset + byteLength)]);
  return nextOffset;
}

function appendBufferView(target, source, sourceIndex) {
  const sourceView = source.json.bufferViews[sourceIndex];
  const nextView = clone(sourceView);
  nextView.byteOffset = appendSlice(target, source, sourceView.byteOffset || 0, sourceView.byteLength);
  const nextIndex = target.json.bufferViews.length;
  target.json.bufferViews.push(nextView);
  return nextIndex;
}

function replaceMaterialsFromTextureGlb(target, materialSource) {
  const viewMap = new Map();
  const mapView = (index) => {
    if (!viewMap.has(index)) viewMap.set(index, appendBufferView(target, materialSource, index));
    return viewMap.get(index);
  };
  target.json.samplers = clone(materialSource.json.samplers || []);
  target.json.images = clone(materialSource.json.images || []).map((image) => ({
    ...image,
    bufferView: image.bufferView === undefined ? undefined : mapView(image.bufferView),
  }));
  target.json.textures = clone(materialSource.json.textures || []);
  target.json.materials = clone(materialSource.json.materials || []);
  target.json.materials[0].name = 'Davin_Wingsworth_Kestrel_Man_PBR';
}

function appendAnimation(target, source, animationIndex = 0) {
  const animation = source.json.animations?.[animationIndex];
  if (!animation) return;
  const accessorMap = new Map();
  const mapAccessor = (sourceAccessorIndex) => {
    if (accessorMap.has(sourceAccessorIndex)) return accessorMap.get(sourceAccessorIndex);
    const sourceAccessor = source.json.accessors[sourceAccessorIndex];
    const nextAccessor = clone(sourceAccessor);
    if (sourceAccessor.bufferView !== undefined) {
      nextAccessor.bufferView = appendBufferView(target, source, sourceAccessor.bufferView);
    }
    const nextIndex = target.json.accessors.length;
    target.json.accessors.push(nextAccessor);
    accessorMap.set(sourceAccessorIndex, nextIndex);
    return nextIndex;
  };
  const nextAnimation = clone(animation);
  nextAnimation.name = 'DavinWingsworth|running|baselayer';
  for (const sampler of nextAnimation.samplers || []) {
    sampler.input = mapAccessor(sampler.input);
    sampler.output = mapAccessor(sampler.output);
  }
  target.json.animations ||= [];
  target.json.animations.push(nextAnimation);
}

function writeGlb(out, json, bin) {
  json.buffers = [{ byteLength: bin.length }];
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonPadding = align4(jsonBytes.length) - jsonBytes.length;
  const binPadding = align4(bin.length) - bin.length;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPadding)]);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 4, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.write('JSON', 4, 4, 'ascii');
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.write('BIN\0', 4, 4, 'ascii');
  fs.writeFileSync(out, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
}

const walking = readGlb(walkingPath);
const running = readGlb(runningPath);
const materialSource = readGlb(materialPath);
const walkingNodeNames = walking.json.nodes.map((node) => node.name || '');
const runningNodeNames = running.json.nodes.map((node) => node.name || '');
if (JSON.stringify(walkingNodeNames) !== JSON.stringify(runningNodeNames)) {
  throw new Error('walking and running rigs do not share node order');
}
const target = { json: clone(walking.json), bin: Buffer.from(walking.bin) };
target.json.asset = {
  ...target.json.asset,
  generator: `${target.json.asset?.generator || 'unknown'}; pose-lab-v2 Davin material merge`,
  extras: {
    ...(target.json.asset?.extras || {}),
    poseLabV2Merge: {
      walkingSource: 'Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Walking_withSkin.glb',
      runningSource: 'Meshy_AI_Sky_Patrol_Hawk_biped_Animation_Running_withSkin.glb',
      materialSource: 'Meshy_AI_Sky_Patrol_Hawk_0716213205_texture.glb',
    },
  },
};
target.json.nodes.forEach((node) => {
  if (node.name === 'char1') node.name = 'DavinWingsworth_KestrelMan_Mesh';
  if (node.name === 'Armature') node.name = 'DavinWingsworth_Armature';
});
if (target.json.meshes?.[0]) target.json.meshes[0].name = 'DavinWingsworth_KestrelMan';
if (target.json.skins?.[0]) target.json.skins[0].name = 'DavinWingsworth_ArmatureSkin';
if (target.json.animations?.[0]) target.json.animations[0].name = 'DavinWingsworth|walking|baselayer';
replaceMaterialsFromTextureGlb(target, materialSource);
appendAnimation(target, running, 0);
writeGlb(outPath, target.json, target.bin);
console.log(JSON.stringify({ ok: true, outPath, bytes: fs.statSync(outPath).size, skins: target.json.skins?.length || 0, animations: target.json.animations?.map((a) => a.name), materials: target.json.materials?.map((m) => m.name), images: target.json.images?.map((i) => i.name) }, null, 2));
