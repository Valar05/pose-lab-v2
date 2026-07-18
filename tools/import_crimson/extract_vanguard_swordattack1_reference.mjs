import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const sourceGlb = path.join(root, 'public/assets/vanguard/vanguard_rigged_animations.glb');
const outPath = path.join(root, 'public/assets/crimson/vanguard_swordattack1_reference.json');
const referenceTracks = ['root', 'upper_arm.fk.R', 'forearm.fk.R', 'hand.fk.R', 'Weapon.R', 'Long_Sword'];
const primeTimes = {
  start: 0,
  anticipation: 0.18,
  contact: 0.38,
  contactHold: 0.5,
  followThrough: 0.7,
  recoil: 0.95,
  end: 1.25,
};

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

function componentCount(type) {
  return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type] || 1;
}

function componentReader(componentType) {
  if (componentType === 5126) return { bytes: 4, read: (buffer, offset) => buffer.readFloatLE(offset) };
  if (componentType === 5123) return { bytes: 2, read: (buffer, offset) => buffer.readUInt16LE(offset) };
  if (componentType === 5125) return { bytes: 4, read: (buffer, offset) => buffer.readUInt32LE(offset) };
  throw new Error(`unsupported accessor componentType ${componentType}`);
}

function readAccessor(glb, index) {
  const accessor = glb.json.accessors[index];
  const view = glb.json.bufferViews[accessor.bufferView];
  const count = componentCount(accessor.type);
  const reader = componentReader(accessor.componentType);
  const byteStride = view.byteStride || reader.bytes * count;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const values = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const tuple = [];
    for (let c = 0; c < count; c += 1) tuple.push(Number(reader.read(glb.bin, start + i * byteStride + c * reader.bytes).toFixed(6)));
    values.push(count === 1 ? tuple[0] : tuple);
  }
  return values;
}

function nearestValue(times, values, sampleTime) {
  if (!times.length) return null;
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < times.length; i += 1) {
    const distance = Math.abs(times[i] - sampleTime);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return { time: times[best], value: values[best] };
}

const glb = readGlb(sourceGlb);
const nodes = glb.json.nodes || [];
const nodeNames = new Map(nodes.map((node, index) => [index, node.name || `node_${index}`]));
const animation = (glb.json.animations || []).find((entry) => entry.name === 'SwordAttack1');
if (!animation) throw new Error('Vanguard SwordAttack1 clip missing');
const tracks = [];
let duration = 0;
for (const channel of animation.channels || []) {
  const nodeName = nodeNames.get(channel.target?.node);
  if (!referenceTracks.includes(nodeName)) continue;
  const sampler = animation.samplers[channel.sampler];
  const input = readAccessor(glb, sampler.input);
  const output = readAccessor(glb, sampler.output);
  duration = Math.max(duration, ...input);
  tracks.push({
    node: nodeName,
    path: channel.target.path,
    interpolation: sampler.interpolation || 'LINEAR',
    keyCount: input.length,
    startTime: input[0],
    endTime: input[input.length - 1],
    samples: Object.fromEntries(Object.entries(primeTimes).map(([label, time]) => [label, nearestValue(input, output, time)])),
  });
}
const byNode = Object.fromEntries(referenceTracks.map((name) => [name, tracks.filter((track) => track.node === name)]));
const reference = {
  schema: 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v1',
  sourceGlb: 'public/assets/vanguard/vanguard_rigged_animations.glb',
  sourceClip: 'SwordAttack1',
  duration: Number(duration.toFixed(6)),
  primeTimes,
  policy: {
    role: 'reference-only',
    target: 'Crimson Plume Knight / Arborblade sword authoring',
    forbiddenUse: 'Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.',
    intendedUse: 'Use timing plus hand/forearm/weapon relationship predicates to author a quarantined Crimson attack candidate.',
  },
  referenceTracks,
  byNode,
};
fs.writeFileSync(outPath, `${JSON.stringify(reference, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outPath, duration: reference.duration, tracks: tracks.length, nodes: Object.fromEntries(Object.entries(byNode).map(([name, entries]) => [name, entries.length])) }, null, 2));
