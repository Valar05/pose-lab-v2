import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const siteRoot = path.resolve(import.meta.dirname, '..');
const outRoot = path.resolve(siteRoot, '..', 'pose-lab-v2-transfer');
const runtimeRoot = path.join(outRoot, 'public/assets/valkyrie-squad/factory-v1');
const authoringRoot = path.join(outRoot, 'authoring/valkyrie-squad/factory-v1');

fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(runtimeRoot, 'runtime'), { recursive: true });
fs.mkdirSync(authoringRoot, { recursive: true });
fs.mkdirSync(path.join(outRoot, 'src'), { recursive: true });
fs.mkdirSync(path.join(outRoot, 'tools'), { recursive: true });
fs.mkdirSync(path.join(outRoot, 'docs'), { recursive: true });

const siteHtml = fs.readFileSync(path.join(siteRoot, 'dist/index.html'), 'utf8');
const style = siteHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const body = siteHtml.match(/<body>([\s\S]*?)<script>/)?.[1];
let script = siteHtml.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
if (!style || !body || !script) throw new Error('Could not extract exact Site runtime');

script = script
  .replace("poseAtlas.src='assets/april-pose-atlas-96.png'", "poseAtlas.src=new URL('../assets/valkyrie-squad/factory-v1/runtime/april-pose-atlas-96.png',import.meta.url).href")
  .replace("vanguardAtlas.src='assets/vanguard-pose-atlas-96.png?v=2'", "vanguardAtlas.src=new URL('../assets/valkyrie-squad/factory-v1/runtime/vanguard-pose-atlas-96.png',import.meta.url).href")
  .replace("vanguardCombatAtlas.src='assets/vanguard-combat-pose-atlas-96-candidate-v3-refined-grounded.png'", "vanguardCombatAtlas.src=new URL('../assets/valkyrie-squad/factory-v1/runtime/vanguard-combat-pose-atlas-96-candidate-v3-refined-grounded.png',import.meta.url).href")
  .replace("vanguardSheet.src='assets/vanguard-contact-sheet-candidate-v1.png'", "vanguardSheet.src=new URL('../assets/valkyrie-squad/factory-v1/runtime/vanguard-contact-sheet-accepted-v1.png',import.meta.url).href")
  .replace(
    "const prepared=new Map();let character=",
    "const APRIL_ANIMATION_IDS=Object.freeze(['combat-idle','idle','run','jab','cross','front-kick','dash','dodge-slide','flip-jump']);const VANGUARD_ANIMATION_IDS=Object.freeze(['heavy-idle','run','brake-pivot','reach-brace','dash','dodge-slide','flip-jump','shotgun-blast','bayonet-drive','weapon-bash','grapple-entry']);const prepared=new Map();let character="
  )
  .replace(
    "clip=character==='vanguard'?(requested&&(requested in VANGUARD_COMBAT_CLIPS||requested==='combat-sheet')?requested:'heavy-idle'):'jab';",
    "clip=character==='vanguard'?(requested&&(VANGUARD_ANIMATION_IDS.includes(requested)||requested==='combat-sheet')?requested:'heavy-idle'):(requested&&APRIL_ANIMATION_IDS.includes(requested)?requested:'jab');"
  );

const moduleSource = `// Exact Pose Lab V2 transfer of ChatGPT Site commit 905d3a200e9a34a3832176cc3a761c88ead370ee.\nconst app=document.querySelector('#app');\nconst style=document.createElement('style');\nstyle.textContent=${JSON.stringify(style)};\ndocument.head.append(style);\napp.innerHTML=${JSON.stringify(body)};\ndocument.body.dataset.reviewMode='valkyrie-sprite';\ndocument.body.dataset.reviewReady='0';\n${script}\ndocument.body.dataset.reviewReady='1';\n`;
fs.writeFileSync(path.join(outRoot, 'src/valkyrie-sprite-lab.js'), moduleSource);

const runtimeFiles = [
  ['dist/assets/april-pose-atlas-96.png', 'runtime/april-pose-atlas-96.png'],
  ['dist/assets/april-pose-atlas-96.json', 'runtime/april-pose-atlas-96.json'],
  ['dist/assets/vanguard-pose-atlas-96.png', 'runtime/vanguard-pose-atlas-96.png'],
  ['dist/assets/vanguard-pose-atlas-96.json', 'runtime/vanguard-pose-atlas-96.json'],
  ['dist/assets/vanguard-combat-pose-atlas-96-candidate-v3-refined-grounded.png', 'runtime/vanguard-combat-pose-atlas-96-candidate-v3-refined-grounded.png'],
  ['source-masters/vanguard-contact-sheet-accepted-v1.png', 'runtime/vanguard-contact-sheet-accepted-v1.png'],
  ['dist/project.json', 'project.json'],
];
for (const [from, to] of runtimeFiles) {
  const dest = path.join(runtimeRoot, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(siteRoot, from), dest);
}

for (const folder of ['source-masters', 'factory', 'scripts', 'tests']) {
  fs.cpSync(path.join(siteRoot, folder), path.join(authoringRoot, folder), { recursive: true });
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expected = {
  april: ['combat-idle','idle','run','jab','cross','front-kick','dash','dodge-slide','flip-jump'],
  vanguard: ['heavy-idle','run','brake-pivot','reach-brace','dash','dodge-slide','flip-jump','shotgun-blast','bayonet-drive','weapon-bash','grapple-entry'],
};
const transferManifest = {
  schema: 'pose-lab-v2-valkyrie-sprite-transfer-v1',
  status: 'quarantined',
  source: {
    repository: 'ChatGPT Site source repository',
    revision: '905d3a200e9a34a3832176cc3a761c88ead370ee',
    siteVersion: 30,
  },
  runtime: {
    view: 'valkyrie',
    animationFramesBaked: false,
    semanticPoseCellsOnly: true,
    filtering: 'nearest-neighbor',
    rootMotion: false,
  },
  animationIds: expected,
  counts: { april: expected.april.length, vanguard: expected.vanguard.length, total: expected.april.length + expected.vanguard.length },
  acceptance: {
    april: 'preserved exact Site state; human verdicts carried per project manifest',
    vanguardNoncombat: 'accepted factory identity and pose library; motion state preserved from Site',
    vanguardCombat: 'candidate-v3; visual acceptance pending',
  },
  assets: runtimeFiles.map(([, to]) => {
    const file = path.join(runtimeRoot, to);
    return { path: to, bytes: fs.statSync(file).size, sha256: sha256(file) };
  }),
  provenance: {
    authoringPath: 'authoring/valkyrie-squad/factory-v1',
    noBlendPresentInSource: true,
    rejectedHistoryPreserved: true,
  },
};
fs.writeFileSync(path.join(runtimeRoot, 'transfer-manifest.json'), `${JSON.stringify(transferManifest, null, 2)}\n`);

const indexPath = path.join(outRoot, 'index.html');
fs.writeFileSync(indexPath, 'PLACEHOLDER: patched from authoritative Pose Lab V2 main during transfer\n');

const testSource = `#!/usr/bin/env node\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport crypto from 'node:crypto';\nconst root=path.resolve(import.meta.dirname,'..');\nconst base=path.join(root,'public/assets/valkyrie-squad/factory-v1');\nconst manifest=JSON.parse(fs.readFileSync(path.join(base,'transfer-manifest.json'),'utf8'));\nconst expectedApril=['combat-idle','idle','run','jab','cross','front-kick','dash','dodge-slide','flip-jump'];\nconst expectedVanguard=['heavy-idle','run','brake-pivot','reach-brace','dash','dodge-slide','flip-jump','shotgun-blast','bayonet-drive','weapon-bash','grapple-entry'];\nconst assert=(v,m)=>{if(!v)throw new Error(m)};\nassert(JSON.stringify(manifest.animationIds.april)===JSON.stringify(expectedApril),'April animation-ID set changed');\nassert(JSON.stringify(manifest.animationIds.vanguard)===JSON.stringify(expectedVanguard),'Vanguard animation-ID set changed');\nassert(manifest.counts.total===20,'complete library must contain 20 animations');\nfor(const asset of manifest.assets){const file=path.join(base,asset.path);const bytes=fs.readFileSync(file);assert(bytes.length===asset.bytes,asset.path+' byte count changed');assert(crypto.createHash('sha256').update(bytes).digest('hex')===asset.sha256,asset.path+' hash changed')}\nconst moduleSource=fs.readFileSync(path.join(root,'src/valkyrie-sprite-lab.js'),'utf8');\nfor(const id of [...expectedApril,...expectedVanguard])assert(moduleSource.includes(\"'\"+id+\"'\"),'runtime missing '+id);\nassert(moduleSource.includes(\"new URL('../assets/valkyrie-squad/factory-v1/runtime/\"),'runtime assets must resolve inside Pose Lab V2');\nassert(moduleSource.includes(\"document.body.dataset.reviewReady='1'\"),'runtime readiness marker missing');\nconsole.log(JSON.stringify({ok:true,april:expectedApril.length,vanguard:expectedVanguard.length,total:20,checks:['animation-id equality','asset sha256','Pose Lab asset paths','runtime readiness']},null,2));\n`;
fs.writeFileSync(path.join(outRoot, 'tools/test_valkyrie_sprite_transfer.mjs'), testSource);

const docs = `# Valkyrie Squad sparse sprite factory transfer\n\nThis package moves the exact procedural April/Vanguard runtime from ChatGPT Site commit \`905d3a200e9a34a3832176cc3a761c88ead370ee\` into Pose Lab V2.\n\n- Review view: \`?view=valkyrie&character=april&clip=jab\` or \`?view=valkyrie&character=vanguard&clip=grapple-entry\`.\n- April: 9 animations.\n- Vanguard: 11 animations (7 noncombat, 4 combat).\n- The atlases contain semantic poses only. Motion, deformation, shear, stretch, rotation, and blur remain procedural.\n- Vanguard combat remains quarantined candidate V3.\n- No Blender file existed in the Site source; none is claimed here.\n- Do not remove the Site resources until the phone-hosted Pose Lab route reads back all 20 IDs and Drew visually accepts the transferred surface.\n`;
fs.writeFileSync(path.join(outRoot, 'docs/VALKYRIE_SPRITE_FACTORY_TRANSFER.md'), docs);

console.log(JSON.stringify({ ok: true, outRoot, files: fs.readdirSync(runtimeRoot), counts: transferManifest.counts }, null, 2));
