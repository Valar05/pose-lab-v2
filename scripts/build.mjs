import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const entry of ['index.html', 'src', 'public']) {
  fs.cpSync(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

console.log(JSON.stringify({
  ok: true,
  outDir: 'dist',
  mode: 'static-github-pages',
}, null, 2));

