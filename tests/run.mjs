// Ejecuta las suites de tests/*.test.mjs una tras otra. «node tests/run.mjs movil inv» ejecuta solo las que contienen esos textos.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const filters = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.mjs') && (!filters.length || filters.some(x => f.includes(x)))).sort();
if (!files.length) { console.log('Ninguna suite coincide con', filters.join(' ')); process.exit(1); }
let bad = [];
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (r.status !== 0) bad.push(f);
}
console.log(bad.length ? `\nFallan: ${bad.join(', ')}` : `\nTodas las suites pasan (${files.length}).`);
process.exit(bad.length ? 1 : 0);
