#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, writeJson } from './sprite_refinery_common.mjs';

export const OPENAI_IMAGE_EDIT_ENDPOINT = '/v1/images/edits';
export const OPENAI_IMAGE_EDIT_MODEL = 'gpt-image-1';

export function buildPrompt({ manifest, clip, posePacketHash }) {
  return [
    'Sprite Refinery appearance-only edit.',
    'References 1-4 are immutable native Steel Vanguard geometry, limb ownership, depth, and beauty render.',
    'Reference 5 is the approved Fleshpunk Vanguard concept and controls appearance only.',
    `Clip: ${clip.id} / ${clip.action}. Pose packet hash: ${posePacketHash}.`,
    'Preserve exact frame order, camera, facing screen-right, foot contact, hand depth, sword hilt/tip geometry, and timing.',
    'Do not mirror, reframe, stabilize, beautify the pose, invent in-betweens, or use Crimson-derived appearance.',
    'Return one PNG contact sheet with the same grid and transparent or chroma-keyable background.'
  ].join('\n');
}

export function runFixtureProvider({ posePacketDir, outFile, provenanceFile, manifest, clip, attempt }) {
  const source = path.join(posePacketDir, 'beauty-grid.png');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.copyFileSync(source, outFile);
  writeJson(provenanceFile, {
    schema: 'pose-lab-v2-sprite-refinery-provider-provenance-v1',
    provider: 'fixture',
    model: 'fixture-copy-beauty-grid',
    attempt,
    clip_id: clip.id,
    prompt_version: 'appearance-only-v1',
    concept_hash: manifest.concept?.sha256 || null,
    pose_packet_hash: sha256File(path.join(posePacketDir, 'manifest.json')),
    output_hash: sha256File(outFile),
    paid_call: false,
  });
}

export function runOpenAiProvider({ posePacketDir, conceptPath, outFile, provenanceFile, manifest, clip, attempt }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for the real OpenAI provider');
  const posePacketHash = sha256File(path.join(posePacketDir, 'manifest.json'));
  const prompt = buildPrompt({ manifest, clip, posePacketHash });
  const responseFile = `${outFile}.response.json`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const files = [
    path.join(posePacketDir, 'geometry-grid.png'),
    path.join(posePacketDir, 'limb-id-grid.png'),
    path.join(posePacketDir, 'depth-grid.png'),
    path.join(posePacketDir, 'beauty-grid.png'),
    conceptPath,
  ];
  const curlArgs = [
    '--fail-with-body', '--silent', '--show-error', '--location', '--retry', '3', '--retry-delay', '2',
    `https://api.openai.com${OPENAI_IMAGE_EDIT_ENDPOINT}`,
    '-H', `Authorization: Bearer ${process.env.OPENAI_API_KEY}`,
    '-F', `model=${manifest.provider.model}`,
    '-F', `prompt=${prompt}`,
    '-F', `quality=${manifest.provider.quality || 'medium'}`,
    '-F', `size=${manifest.provider.size || '1536x1024'}`,
    '-F', `output_format=${manifest.provider.output_format || 'png'}`,
  ];
  for (const file of files) curlArgs.push('-F', `image[]=@${file}`);
  const response = spawnSync('curl', curlArgs, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  if (response.status !== 0) {
    throw new Error(`OpenAI image edit request failed with status ${response.status}: ${response.stderr || response.stdout.slice(0, 300)}`);
  }
  fs.writeFileSync(responseFile, response.stdout);
  const data = JSON.parse(response.stdout);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI image edit response did not contain data[0].b64_json');
  fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
  writeJson(provenanceFile, {
    schema: 'pose-lab-v2-sprite-refinery-provider-provenance-v1',
    provider: 'openai',
    endpoint: '/v1/images/edits',
    model: manifest.provider.model,
    quality: manifest.provider.quality,
    size: manifest.provider.size,
    output_format: manifest.provider.output_format,
    attempt,
    clip_id: clip.id,
    prompt_version: 'appearance-only-v1',
    concept_hash: sha256File(conceptPath),
    pose_packet_hash: posePacketHash,
    output_hash: sha256File(outFile),
    paid_call: true,
    usage: data.usage || null,
  });
}
