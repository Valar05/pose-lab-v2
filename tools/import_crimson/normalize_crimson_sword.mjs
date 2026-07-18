import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const sourceSwordPath = '/storage/emulated/0/Download/Meshy_AI_Arborblade_0717211756_texture.glb';
const outDir = path.join(root, 'public/assets/crimson');
const runtimeSwordPath = path.join(outDir, 'arborblade_sword.glb');
const calibrationPath = path.join(outDir, 'crimson_sword_calibration.json');
const manifestPath = path.join(outDir, 'crimson_manifest.json');
const SCHEMA = 'pose-lab-v2-crimson-sword-calibration-v1';

function align4(value) {
  return (value + 3) & ~3;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readGlb(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file} is not a GLB`);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.slice(offset + 8, offset + 8 + length);
    if (type === 'JSON') json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trimEnd());
    if (type === 'BIN\0') bin = Buffer.from(chunk);
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error(`${file} missing JSON or BIN chunk`);
  return { json, bin };
}

function writeGlb(file, json, bin) {
  json.buffers = [{ byteLength: bin.length }];
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(align4(jsonBytes.length) - jsonBytes.length, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc(align4(bin.length) - bin.length)]);
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
  fs.writeFileSync(file, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));
}

function accessorByteOffset(json, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  return (view.byteOffset || 0) + (accessor.byteOffset || 0);
}

function accessorStride(json, accessorIndex, componentCount) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  return view.byteStride || componentCount * 4;
}

function requireFloatAccessor(json, accessorIndex, type) {
  const accessor = json.accessors[accessorIndex];
  if (!accessor || accessor.componentType !== 5126 || accessor.type !== type) {
    throw new Error(`expected FLOAT ${type} accessor at ${accessorIndex}`);
  }
  return accessor;
}

function readVec3(bin, byteOffset) {
  return [bin.readFloatLE(byteOffset), bin.readFloatLE(byteOffset + 4), bin.readFloatLE(byteOffset + 8)];
}

function writeVec3(bin, byteOffset, value) {
  bin.writeFloatLE(value[0], byteOffset);
  bin.writeFloatLE(value[1], byteOffset + 4);
  bin.writeFloatLE(value[2], byteOffset + 8);
}

function writeVec4(bin, byteOffset, value) {
  bin.writeFloatLE(value[0], byteOffset);
  bin.writeFloatLE(value[1], byteOffset + 4);
  bin.writeFloatLE(value[2], byteOffset + 8);
  bin.writeFloatLE(value[3], byteOffset + 12);
}

function transformPosition(value, anchor) {
  return [value[0] - anchor[0], value[2] - anchor[2], anchor[1] - value[1]];
}

function transformDirection(value) {
  return [value[0], value[2], -value[1]];
}

function normalizeVec3(value) {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function transformPositionAccessor(json, bin, accessorIndex, anchor) {
  const accessor = requireFloatAccessor(json, accessorIndex, 'VEC3');
  const offset = accessorByteOffset(json, accessorIndex);
  const stride = accessorStride(json, accessorIndex, 3);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < accessor.count; i += 1) {
    const byteOffset = offset + i * stride;
    const next = transformPosition(readVec3(bin, byteOffset), anchor);
    writeVec3(bin, byteOffset, next);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], next[axis]);
      max[axis] = Math.max(max[axis], next[axis]);
    }
  }
  accessor.min = min;
  accessor.max = max;
  return { min, max, size: max.map((value, index) => value - min[index]) };
}

function transformNormalAccessor(json, bin, accessorIndex) {
  const accessor = requireFloatAccessor(json, accessorIndex, 'VEC3');
  const offset = accessorByteOffset(json, accessorIndex);
  const stride = accessorStride(json, accessorIndex, 3);
  for (let i = 0; i < accessor.count; i += 1) {
    const byteOffset = offset + i * stride;
    writeVec3(bin, byteOffset, normalizeVec3(transformDirection(readVec3(bin, byteOffset))));
  }
}

function transformTangentAccessor(json, bin, accessorIndex) {
  const accessor = requireFloatAccessor(json, accessorIndex, 'VEC4');
  const offset = accessorByteOffset(json, accessorIndex);
  const stride = accessorStride(json, accessorIndex, 4);
  for (let i = 0; i < accessor.count; i += 1) {
    const byteOffset = offset + i * stride;
    const xyz = transformDirection(readVec3(bin, byteOffset));
    writeVec4(bin, byteOffset, [xyz[0], xyz[1], xyz[2], bin.readFloatLE(byteOffset + 12)]);
  }
}

function sourcePositionBounds(json) {
  const mesh = json.meshes?.[0];
  const accessorIndex = mesh?.primitives?.[0]?.attributes?.POSITION;
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor?.min || !accessor?.max) throw new Error('sword source missing position bounds');
  const size = accessor.max.map((value, index) => value - accessor.min[index]);
  return { min: accessor.min, max: accessor.max, size };
}

function roundVec(value) {
  return value.map((entry) => Number(entry.toFixed(6)));
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const source = readGlb(sourceSwordPath);
  const target = { json: clone(source.json), bin: Buffer.from(source.bin) };
  const sourceBounds = sourcePositionBounds(target.json);
  const length = sourceBounds.size[1];
  const crossCenter = [
    (sourceBounds.min[0] + sourceBounds.max[0]) / 2,
    0,
    (sourceBounds.min[2] + sourceBounds.max[2]) / 2,
  ];
  const hiltTopRatio = 0.62;
  const hiltAnchor = [crossCenter[0], sourceBounds.min[1] + length * hiltTopRatio, crossCenter[2]];
  const sourceTip = [crossCenter[0], sourceBounds.min[1], crossCenter[2]];
  const sourcePommel = [crossCenter[0], sourceBounds.max[1], crossCenter[2]];
  let normalizedBounds = null;
  for (const mesh of target.json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const attrs = primitive.attributes || {};
      if (attrs.POSITION !== undefined) normalizedBounds = transformPositionAccessor(target.json, target.bin, attrs.POSITION, hiltAnchor);
      if (attrs.NORMAL !== undefined) transformNormalAccessor(target.json, target.bin, attrs.NORMAL);
      if (attrs.TANGENT !== undefined) transformTangentAccessor(target.json, target.bin, attrs.TANGENT);
    }
  }
  target.json.asset = {
    ...target.json.asset,
    generator: `${target.json.asset?.generator || 'unknown'}; pose-lab-v2 Crimson Arborblade normalized +Z hilt-origin`,
    extras: {
      ...(target.json.asset?.extras || {}),
      poseLabV2CrimsonSword: {
        source: sourceSwordPath,
        sourceSha256: sha256(sourceSwordPath),
        role: 'normalized real static Arborblade sword mesh for Crimson RightHand -> SaberGrip calibration',
        normalized: true,
        sourceBladeAxis: [0, -1, 0],
        bladeLocalAxis: [0, 0, 1],
        hiltOriginPolicy: 'source bounds center at the top-middle of the hilt/guard transition, original -Y blade remapped to runtime +Z',
      },
    },
  };
  for (const [index, node] of (target.json.nodes || []).entries()) {
    node.name ||= index === 0 ? 'ArborbladeSword' : `ArborbladeNode_${index}`;
    delete node.matrix;
    delete node.translation;
    delete node.rotation;
    delete node.scale;
  }
  if (target.json.meshes?.[0]) target.json.meshes[0].name = 'Arborblade_Sword_Normalized_HiltOrigin_ZForward';
  if (target.json.materials?.[0]) target.json.materials[0].name = 'Arborblade_PBR';
  writeGlb(runtimeSwordPath, target.json, target.bin);

  const calibration = {
    schema: SCHEMA,
    status: 'offline-socket-calibrated-not-hosted-visual-accepted',
    targetCharacter: 'crimson',
    swordAsset: 'public/assets/crimson/arborblade_sword.glb',
    sourceSwordAsset: sourceSwordPath,
    sourceSwordSha256: sha256(sourceSwordPath),
    hierarchy: ['RightHand', 'SaberGrip', 'ArborbladeSword'],
    saberGripLocal: {
      parentBone: 'RightHand',
      position: [0, 0, 0],
      rotationDeg: [96.50876, 0, -0.07512],
      scale: [1, 1, 1],
    },
    swordLocal: {
      position: [0, 0, 0],
      rotationDeg: [0, 0, 0],
      scale: [88, 88, 88],
    },
    sourceBladeLocalAxis: [0, -1, 0],
    bladeLocalAxis: [0, 0, 1],
    hiltLocalPoint: [0, 0, 0],
    tipLocalPoint: roundVec(transformPosition(sourceTip, hiltAnchor)),
    pommelLocalPoint: roundVec(transformPosition(sourcePommel, hiltAnchor)),
    normalizedBounds: {
      min: roundVec(normalizedBounds.min),
      max: roundVec(normalizedBounds.max),
      size: roundVec(normalizedBounds.size),
      dominantAxis: 'z',
    },
    acceptanceNote: 'Offline socket calibration places the normalized origin at the top-middle hilt/guard transition, keeps SaberGrip as an unscaled RightHand child, scales the sword mesh locally for Crimson units, and maps the blade tip to runtime local +Z. Hosted visual review is still required before claiming Crimson socket acceptance.',
  };
  fs.writeFileSync(calibrationPath, `${JSON.stringify(calibration, null, 2)}\n`);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.saberGrip = calibration;
    manifest.bounds ||= {};
    manifest.bounds.sword = calibration.normalizedBounds;
    manifest.acceptance ||= {};
    manifest.acceptance.currentState = 'offline-socket-calibrated-pending-hosted-review';
    manifest.swordNormalization = {
      script: 'tools/import_crimson/normalize_crimson_sword.mjs',
      runtimeSword: 'public/assets/crimson/arborblade_sword.glb',
      bladeLocalAxis: [0, 0, 1],
      hiltLocalPoint: [0, 0, 0],
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(JSON.stringify({ ok: true, runtimeSword: runtimeSwordPath, calibrationPath, bladeLocalAxis: calibration.bladeLocalAxis, tipLocalPoint: calibration.tipLocalPoint }, null, 2));
}

main();
