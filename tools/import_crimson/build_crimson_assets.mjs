import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const zipPath = '/storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_biped.zip';
const walkingEntry = 'Meshy_AI_Crimson_Plume_Knight_biped/Meshy_AI_Crimson_Plume_Knight_biped_Animation_Walking_withSkin.glb';
const runningEntry = 'Meshy_AI_Crimson_Plume_Knight_biped/Meshy_AI_Crimson_Plume_Knight_biped_Animation_Running_withSkin.glb';
const materialPath = '/storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_0717211804_texture.glb';
const swordPath = '/storage/emulated/0/Download/Meshy_AI_Arborblade_0717211756_texture.glb';
const outDir = path.join(root, 'public/assets/crimson');
const runtimeGlb = path.join(outDir, 'crimson_plume_knight_rigged_pbr.glb');
const swordGlb = path.join(outDir, 'arborblade_sword.glb');
const manifestPath = path.join(outDir, 'crimson_manifest.json');
const calibrationPath = path.join(outDir, 'crimson_sword_calibration.json');

function align4(value) {
  return (value + 3) & ~3;
}

function readZipGlb(entry) {
  return readGlbBuffer(execFileSync('unzip', ['-p', zipPath, entry], { maxBuffer: 32 * 1024 * 1024 }), `${zipPath}:${entry}`);
}

function readGlb(file) {
  return readGlbBuffer(fs.readFileSync(file), file);
}

function readGlbBuffer(data, label) {
  if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${label} is not GLB`);
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
  if (!json || !bin) throw new Error(`${label} missing JSON or BIN chunk`);
  return { json, bin, label };
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
  target.json.images = clone(materialSource.json.images || []).map((image, index) => ({
    ...image,
    name: image.name || `CrimsonPlumeKnight_PBR_${index}`,
    bufferView: image.bufferView === undefined ? undefined : mapView(image.bufferView),
  }));
  target.json.textures = clone(materialSource.json.textures || []);
  target.json.materials = clone(materialSource.json.materials || []);
  if (target.json.materials[0]) target.json.materials[0].name = 'Crimson_Plume_Knight_PBR';
}

function appendAnimation(target, source, animationIndex, name) {
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
  nextAnimation.name = name;
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

function positionBounds(glb) {
  const mesh = glb.json.meshes?.[0];
  const posAccessor = mesh?.primitives?.[0]?.attributes?.POSITION;
  const accessor = glb.json.accessors?.[posAccessor];
  if (!accessor?.min || !accessor?.max) return null;
  const size = accessor.max.map((value, index) => value - accessor.min[index]);
  const axisNames = ['x', 'y', 'z'];
  const dominant = size.indexOf(Math.max(...size));
  return { min: accessor.min, max: accessor.max, size, dominantAxis: axisNames[dominant], dominantAxisVector: axisNames.map((_, index) => index === dominant ? 1 : 0) };
}

function writeSwordRuntime(source) {
  const target = { json: clone(source.json), bin: Buffer.from(source.bin) };
  target.json.asset = {
    ...target.json.asset,
    generator: `${target.json.asset?.generator || 'unknown'}; pose-lab-v2 Crimson Arborblade intake`,
    extras: {
      ...(target.json.asset?.extras || {}),
      poseLabV2CrimsonSword: {
        source: swordPath,
        role: 'real static Arborblade sword mesh for Crimson RightHand -> SaberGrip calibration',
        bladeLocalAxis: [0, 1, 0],
      },
    },
  };
  target.json.nodes?.forEach((node, index) => {
    if (!node.name) node.name = index === 0 ? 'ArborbladeSword' : `ArborbladeNode_${index}`;
  });
  if (target.json.meshes?.[0]) target.json.meshes[0].name = 'Arborblade_Sword';
  if (target.json.materials?.[0]) target.json.materials[0].name = 'Arborblade_PBR';
  writeGlb(swordGlb, target.json, target.bin);
}

fs.mkdirSync(outDir, { recursive: true });
const walking = readZipGlb(walkingEntry);
const running = readZipGlb(runningEntry);
const materialSource = readGlb(materialPath);
const swordSource = readGlb(swordPath);
const walkingNodeNames = walking.json.nodes.map((node) => node.name || '');
const runningNodeNames = running.json.nodes.map((node) => node.name || '');
if (JSON.stringify(walkingNodeNames) !== JSON.stringify(runningNodeNames)) {
  throw new Error('Crimson walking and running rigs do not share node order');
}
const target = { json: clone(walking.json), bin: Buffer.from(walking.bin) };
target.json.asset = {
  ...target.json.asset,
  generator: `${target.json.asset?.generator || 'unknown'}; pose-lab-v2 Crimson material merge`,
  extras: {
    ...(target.json.asset?.extras || {}),
    poseLabV2Merge: {
      walkingSource: walkingEntry,
      runningSource: runningEntry,
      materialSource: materialPath,
    },
  },
};
target.json.nodes.forEach((node) => {
  if (node.name === 'char1') node.name = 'CrimsonPlumeKnight_Mesh';
  if (node.name === 'Armature') node.name = 'CrimsonPlumeKnight_Armature';
});
if (target.json.meshes?.[0]) target.json.meshes[0].name = 'Crimson_Plume_Knight';
if (target.json.skins?.[0]) target.json.skins[0].name = 'CrimsonPlumeKnight_ArmatureSkin';
if (target.json.animations?.[0]) target.json.animations[0].name = 'CrimsonPlumeKnight|walking|baselayer';
replaceMaterialsFromTextureGlb(target, materialSource);
appendAnimation(target, running, 0, 'CrimsonPlumeKnight|running|baselayer');
writeGlb(runtimeGlb, target.json, target.bin);
writeSwordRuntime(swordSource);

const skeletonJoints = (target.json.skins?.[0]?.joints || []).map((index) => target.json.nodes[index]?.name || `node_${index}`);
const calibration = {
  schema: 'pose-lab-v2-crimson-sword-calibration-v1',
  status: 'calibration-baseline-not-visual-accepted',
  targetCharacter: 'crimson',
  swordAsset: 'public/assets/crimson/arborblade_sword.glb',
  hierarchy: ['RightHand', 'SaberGrip', 'ArborbladeSword'],
  saberGripLocal: {
    parentBone: 'RightHand',
    position: [0, 0, 0],
    rotationDeg: [0, 0, 0],
    scale: [88, 88, 88],
  },
  swordLocal: {
    position: [0, 0.48, 0],
    rotationDeg: [90, 0, 0],
    scale: [1, 1, 1],
  },
  bladeLocalAxis: [0, 1, 0],
  hiltLocalPoint: [0, -0.42, 0],
  tipLocalPoint: [0, 0.5, 0],
  acceptanceNote: 'This only establishes real sword ownership and blade-axis semantics. SwordAttack1 remains quarantined until hosted visual review accepts the attack choreography.',
};
fs.writeFileSync(calibrationPath, `${JSON.stringify(calibration, null, 2)}\n`);

const manifest = {
  schema: 'pose-lab-v2-crimson-runtime-asset-v1',
  sourceDownloads: {
    rigArchive: zipPath,
    rigWalkingEntry: walkingEntry,
    rigRunningEntry: runningEntry,
    staticPbrCharacter: materialPath,
    staticPbrSword: swordPath,
  },
  runtimeGlb: 'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb',
  swordGlb: 'public/assets/crimson/arborblade_sword.glb',
  buildScript: 'tools/import_crimson/build_crimson_assets.mjs',
  skeleton: {
    root: target.json.nodes[target.json.skins?.[0]?.skeleton]?.name || 'Armature',
    jointCount: skeletonJoints.length,
    joints: skeletonJoints,
    rightHand: skeletonJoints.includes('RightHand'),
    rightForeArm: skeletonJoints.includes('RightForeArm'),
    rightArm: skeletonJoints.includes('RightArm'),
  },
  animations: (target.json.animations || []).map((animation) => ({
    name: animation.name,
    channels: animation.channels?.length || 0,
    samplers: animation.samplers?.length || 0,
  })),
  materialStatus: {
    staticCharacterPbrChannels: {
      baseColorTexture: Boolean(materialSource.json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture),
      metallicRoughnessTexture: Boolean(materialSource.json.materials?.[0]?.pbrMetallicRoughness?.metallicRoughnessTexture),
      normalTexture: Boolean(materialSource.json.materials?.[0]?.normalTexture),
      emissiveTexture: Boolean(materialSource.json.materials?.[0]?.emissiveTexture),
    },
    swordPbrChannels: {
      baseColorTexture: Boolean(swordSource.json.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture),
      metallicRoughnessTexture: Boolean(swordSource.json.materials?.[0]?.pbrMetallicRoughness?.metallicRoughnessTexture),
      normalTexture: Boolean(swordSource.json.materials?.[0]?.normalTexture),
      emissiveTexture: Boolean(swordSource.json.materials?.[0]?.emissiveTexture),
    },
  },
  bounds: {
    staticCharacter: positionBounds(materialSource),
    sword: positionBounds(swordSource),
  },
  saberGrip: calibration,
  vanguardReference: {
    sourceGlb: 'public/assets/vanguard/vanguard_rigged_animations.glb',
    sourceClip: 'SwordAttack1',
    usePolicy: 'reference timing and visible blade/hand predicates only; do not copy Vanguard Weapon.R transforms directly onto Crimson',
    rootMotionPolicy: 'save sidecar data for game use; do not apply root motion in Pose Lab',
  },
  acceptance: {
    localChecksAreGuardrails: true,
    hostedCloudReviewRequired: true,
    currentState: 'asset-intake-and-sword-calibration-baseline',
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  runtimeGlb,
  swordGlb,
  manifestPath,
  calibrationPath,
  bytes: {
    runtimeGlb: fs.statSync(runtimeGlb).size,
    swordGlb: fs.statSync(swordGlb).size,
  },
  animations: manifest.animations.map((animation) => animation.name),
  bladeLocalAxis: calibration.bladeLocalAxis,
  rightHand: manifest.skeleton.rightHand,
}, null, 2));
