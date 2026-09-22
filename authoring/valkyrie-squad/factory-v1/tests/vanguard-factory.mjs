import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';
import { buildPoseAtlas, readFactorySpec } from '../scripts/lib/pose-atlas-factory.mjs';
import { validateMotionLibrary } from '../factory/runtime/sparse-motion-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = await readFactorySpec(root, 'factory/vanguard.factory.json');
const { manifest } = await buildPoseAtlas({ root, spec });
const motion = JSON.parse(await readFile(path.join(root, spec.motionLibrary), 'utf8'));
validateMotionLibrary(motion, spec.poses.map((pose) => pose.id));
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
const project = JSON.parse(await readFile(path.join(root, 'dist/project.json'), 'utf8'));

const master = await readFile(path.join(root, 'source-masters/vanguard-factory-identity-master.png'));
if (createHash('sha256').update(master).digest('hex') !== 'dadd4823fef419ee768884f966aec97f9288f5bdd3f5f73280dbba3aae1648e2') throw new Error('accepted Vanguard identity master drifted');
const atlasPath = path.join(root, 'dist/assets/vanguard-pose-atlas-96.png');
const atlas = await readFile(atlasPath);
const metadata = await sharp(atlas).metadata();
if (metadata.width !== 384 || metadata.height !== 288 || !metadata.isPalette || manifest.atlas.bytes >= 1_000_000 || manifest.atlas.paletteColors !== 64) throw new Error('Vanguard atlas is not a compact 4x3 96 px indexed pose sheet');
if (manifest.poseCount !== 12 || manifest.animationFramesBaked !== false || manifest.runtimeMotion !== 'procedural') throw new Error('Vanguard fixture baked motion or changed accepted pose count');
if (spec.futurePosePlan.locomotion.join(',') !== 'run' || spec.futurePosePlan.excludedLocomotion.join(',') !== 'walk' || !spec.futurePosePlan.combat.startsWith('separate future pose pass') || spec.futurePosePlan.legacyVanguardWork !== 'excluded as pose authority') throw new Error('Vanguard future atlas direction regressed');
if (!spec.futurePosePlan.weaponIdentity.includes('rotary-profile shotgun') || !spec.futurePosePlan.excludedWeaponBehavior.includes('continuous minigun stream')) throw new Error('Vanguard rotary scattergun contract regressed');
const vanguardIdle = motion.animations['heavy-idle'];
const p = vanguardIdle.parameters;
if (vanguardIdle.durationMs !== 1900 || vanguardIdle.rootMotion !== false || p.lateralSkewX !== 11 || p.breathY !== 4 || p.chestExpand !== 0.018 || p.skewStartV !== 0.18 || p.skewLockV !== 0.9) throw new Error('Vanguard does not use April\'s exact deployed idle law');
if (p.filtering !== 'nearest-neighbor') throw new Error('Vanguard idle lost crisp filtering');
const vanguardRun = motion.animations.run;
if (vanguardRun.poses.length !== 6 || vanguardRun.fps !== 3.8 || vanguardRun.durationMs !== 1578.947368421053 || vanguardRun.rootMotion !== false) throw new Error('Vanguard run did not inherit the accepted six-key April timing baseline');
for (const id of ['heavy-idle','idle','run','brake-pivot','reach-brace','dash','dodge-slide','flip-jump']) if (!motion.animations[id]) throw new Error(`Vanguard motion library is missing ${id}`);
if (!html.includes("vanguardAtlas.src='assets/vanguard-pose-atlas-96.png?v=2'") || !html.includes("canvas.style.imageRendering='pixelated'") || html.includes('imageSmoothingEnabled=true') || html.includes('image-rendering:auto')) throw new Error('one or more Site paths can blur the 96 px poses');
if (!html.includes("setLabels('heavy idle','April idle law · 1.90 s · 96 px nearest-neighbor')")) throw new Error('live Vanguard idle is not bound to April\'s deployed law');
const contactSheet = await readFile(path.join(root, 'dist/assets/vanguard-contact-sheet-candidate-v1.png'));
const contactSheetMeta = await sharp(contactSheet).metadata();
if (contactSheetMeta.width !== 1536 || contactSheetMeta.height !== 1024 || createHash('sha256').update(contactSheet).digest('hex') !== '5a4aecf0433c6f3eef422b94bcc0fd02db9cf7c49d36f4180867580a90df6ff6') throw new Error('Vanguard 12-pose candidate contact sheet drifted');
const acceptedSheet = await readFile(path.join(root, 'source-masters/vanguard-contact-sheet-accepted-v1.png'));
const alphaSheet = await readFile(path.join(root, 'source-masters/vanguard-contact-sheet-accepted-v1-alpha.png'));
if (createHash('sha256').update(acceptedSheet).digest('hex') !== '5a4aecf0433c6f3eef422b94bcc0fd02db9cf7c49d36f4180867580a90df6ff6' || createHash('sha256').update(alphaSheet).digest('hex') !== '029ce4b8b25a58b0baa45002d69507d7b2e43590771e24b7021825f162262269') throw new Error('accepted Vanguard contact-sheet authority drifted');
const originalRgb = await sharp(acceptedSheet).removeAlpha().raw().toBuffer();
const extractedRgb = await sharp(alphaSheet).removeAlpha().raw().toBuffer();
if (!originalRgb.equals(extractedRgb)) throw new Error('Vanguard alpha extraction changed accepted RGB');
if (!html.includes("vanguardSheet.src='assets/vanguard-contact-sheet-candidate-v1.png'") || !html.includes('accepted 12-pose contact sheet')) throw new Error('accepted Vanguard source sheet is absent from live review');
const combatSpec = JSON.parse(await readFile(path.join(root, 'factory/vanguard-combat.candidate-v1.json'), 'utf8'));
const combatAtlas = await readFile(path.join(root, combatSpec.runtimeAtlas.file));
const combatAtlasMeta = await sharp(combatAtlas).metadata();
if (combatSpec.state !== 'candidate-v3-refined-alpha-grounded-awaiting-drew-visual-review' || combatSpec.renderCandidate.poseCount !== 12 || combatAtlasMeta.width !== 384 || combatAtlasMeta.height !== 288 || !combatAtlasMeta.hasAlpha || combatSpec.runtimeAtlas.animationFramesBaked !== false) throw new Error('Vanguard combat candidate lost its 12-key transparent sparse-atlas contract');
if (createHash('sha256').update(combatAtlas).digest('hex') !== combatSpec.runtimeAtlas.sha256 || combatAtlas.byteLength !== combatSpec.runtimeAtlas.bytes) throw new Error('Vanguard combat candidate atlas drifted');
const combatMaster = await readFile(path.join(root, combatSpec.renderCandidate.file));
const combatAlpha = await readFile(path.join(root, combatSpec.renderCandidate.alphaFile));
if (createHash('sha256').update(combatAlpha).digest('hex') !== combatSpec.renderCandidate.alphaSha256) throw new Error('refined Vanguard combat alpha drifted');
const combatMasterRgb = await sharp(combatMaster).removeAlpha().raw().toBuffer();
const combatAlphaRgb = await sharp(combatAlpha).removeAlpha().raw().toBuffer();
if (!combatMasterRgb.equals(combatAlphaRgb)) throw new Error('refined Vanguard combat alpha changed source RGB');
if (!combatSpec.renderCandidate.alphaPolicy.includes('brown-matte model') || !combatSpec.renderCandidate.weaponAudit.includes('all 12 complete weapon silhouettes')) throw new Error('Vanguard refined-alpha or complete-weapon audit contract is missing');
const combatAlphaRaw = await sharp(combatAlpha).ensureAlpha().raw().toBuffer();
const alphaRegionCount = (x0, y0, x1, y1) => {
  let count = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (combatAlphaRaw[(y * 1536 + x) * 4 + 3]) count++;
  return count;
};
const weaponWitnesses = [
  ['forward-aim', alphaRegionCount(220, 381, 384, 551), 6000],
  ['blast-contact', alphaRegionCount(604, 381, 768, 551), 6500],
  ['reverse-windup', alphaRegionCount(0, 683, 180, 758), 6500],
  ['overhead-apex', alphaRegionCount(564, 683, 768, 758), 4500],
];
for (const [pose, count, minimum] of weaponWitnesses) if (count < minimum) throw new Error(`${pose} lost required weapon-region alpha (${count} < ${minimum})`);
const combatPixels = await sharp(combatAtlas).ensureAlpha().raw().toBuffer();
const cornerAlpha = [3, 4 * (combatAtlasMeta.width - 1) + 3, 4 * combatAtlasMeta.width * (combatAtlasMeta.height - 1) + 3, 4 * (combatAtlasMeta.width * combatAtlasMeta.height - 1) + 3].map((index) => combatPixels[index]);
if (cornerAlpha.some((alpha) => alpha !== 0)) throw new Error('Vanguard combat atlas retained opaque matte at a canvas corner');
for (const clip of ['shotgun-blast','bayonet-drive','weapon-bash','grapple-entry']) {
  if (!combatSpec.motionTests[clip] || !html.includes(`data-clip="${clip}"`) || !html.includes(`'${clip}':Object.freeze`)) throw new Error(`Vanguard combat motion test ${clip} is missing`);
}
const requiredAxes = {'shotgun-blast':'backward','bayonet-drive':'forward','weapon-bash':'downward','grapple-entry':'inward'};
for (const [clip, axis] of Object.entries(requiredAxes)) {
  if (combatSpec.motionTests[clip].axis !== axis || !html.includes(`'${clip}':Object.freeze({axis:'${axis}'`)) throw new Error(`${clip} lost its unique ${axis} trajectory`);
}
for (const clip of ['shotgun-blast','bayonet-drive','grapple-entry']) {
  const start = html.indexOf(`'${clip}':Object.freeze`);
  const end = html.indexOf(clip === 'grapple-entry' ? '\n});' : "\n  '", start + 1);
  const block = html.slice(start, end);
  if (/sy:(?!1(?:[,}]))/.test(block)) throw new Error(`${clip} reintroduced a shared vertical/uppercut contour`);
}
if (!html.includes("'weapon-bash':Object.freeze({axis:'downward'") || !html.includes("sy:1.12") || !html.includes("sy:.86")) throw new Error('reverse crush no longer owns the high-to-low vertical arc');
if (!html.includes('forward skew · elbow pulls victim inward') || !html.includes('arm kicks backward · body says no') || !html.includes('███████→ body drives through') || !html.includes('DOWN · receiver crush')) throw new Error('Vanguard directional combat language is not exposed at runtime');
const grappleStart = html.indexOf("'grapple-entry':Object.freeze(");
const grappleEnd = html.indexOf("\n});", grappleStart);
const grappleSource = html.slice(grappleStart, grappleEnd);
if (!grappleSource.includes("weaponContinuity:'visible-throughout'") || !grappleSource.includes("postGrabShear:'forward-upper-body'") || !grappleSource.includes("name:'forward skew · elbow pulls victim inward',cell:'carry-transition',end:500,to:{sx:.98,sy:1,sh:.11,x:0}") || !grappleSource.includes("name:'PICTURED CONTACT · THOOM',cell:'blast-contact',end:630,to:{sx:1.03,sy:1,sh:.07,x:0}") || !grappleSource.includes("name:'one-hand retention settle',cell:'low-carry',end:920")) throw new Error('grab/pull/blast lost its post-grab forward skew, pictured contact frame, inward pull, or visible-weapon identity');
for (const forbidden of ["cell:'high-guard'", "cell:'recoil'", "cell:'forward-aim'"]) if (grappleSource.includes(forbidden)) throw new Error(`grab/pull/blast contains forbidden choreography: ${forbidden}`);
if (grappleSource.includes('sx:1.14') || grappleSource.includes('x:19')) throw new Error('grab/pull/blast regressed to the rejected shoulder-charge translation');
const grappleTest = combatSpec.motionTests['grapple-entry'];
if (grappleTest.weaponContinuity !== 'visible-throughout' || grappleTest.postGrabShear !== 'forward-upper-body' || grappleTest.picturedContactPose !== 'blast-contact' || grappleTest.maxBodyTravelPx !== 4 || grappleTest.keys.join(',') !== 'low-carry,grapple-retention,carry-transition,blast-contact,low-carry' || !grappleTest.prohibitedPoses.includes('high-guard upward-angle pose') || !grappleTest.prohibitedPoses.includes('forward shoulder-charge translation')) throw new Error('grab/pull/blast pictured-frame, forward-skew, weapon-continuity, or anti-charge rules are missing from the combat manifest');
if (!html.includes("vanguardCombatAtlas.src='assets/vanguard-combat-pose-atlas-96-candidate-v3-refined-grounded.png'") || !html.includes('refined-alpha combat atlas · 12 candidate keys') || !html.includes('complete weapon silhouettes') || !html.includes("requested==='combat-sheet'")) throw new Error('refined-alpha Vanguard combat review route is incomplete');
if (!Object.values(combatSpec.motionTests).every((test) => test.durationMs > 0) || combatSpec.locks.rootMotion !== false || !combatSpec.locks.groundPivot.includes('two-foot registered')) throw new Error('Vanguard combat motion lost timing, two-foot ground lock, or no-root-motion locks');
const groundReport = JSON.parse(await readFile(path.join(root, combatSpec.locks.groundLockReport), 'utf8'));
for (const frame of groundReport.frames) for (const foot of ['image-left','image-right']) {
  const dx = Math.abs(frame.after[foot][0] - groundReport.target[foot][0]);
  const dy = Math.abs(frame.after[foot][1] - groundReport.target[foot][1]);
  if (dx > groundReport.tolerancePx || dy > groundReport.tolerancePx) throw new Error(`${frame.frame} ${foot} exceeds ground-lock tolerance`);
}
if (!html.includes('active=1-smoothstep(.60,.86,v)') || !html.includes('two-foot lock · ankle-zero deformation')) throw new Error('runtime combat deformation does not fade to zero before the feet');
for (const test of Object.values(combatSpec.motionTests)) if (test.keys.includes('forward-aim') || test.keys.includes('high-guard')) throw new Error('demoted formal-aim/high-guard grammar remains active');
const fixture = project.factoryFixtures?.find((entry) => entry.id === 'vanguard');
if (!fixture || fixture.poseState !== 'accepted' || fixture.atlas.sha256 !== manifest.atlas.sha256 || fixture.atlas.poseCount !== 12 || fixture.posePlan.locomotion !== 'run only; no walk' || !fixture.posePlan.combat.startsWith('separate')) throw new Error('deployed Vanguard factory receipt is missing or stale');

console.log(`VANGUARD_FACTORY_PASS: accepted 12-pose noncombat sheet preserved; separate transparent 12-pose combat candidate drives four procedural motion tests`);
