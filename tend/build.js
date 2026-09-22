// Build tend.html — the gardener's bench.
//
// Same discipline as ../build.js and ../flowers/build.js: one file, no server, no
// CDN, and the bundle is PARSED before it is written. The engine goes in exactly
// as ../build.js takes it — renderer included, because this page draws with the
// shipped WebGL2 renderer and the shipped `drawSpecimen` — MINUS 80_main.js, the
// main page's wiring, which this page replaces. tend/*.js goes last, shares the
// one scope with the engine, and IS scanned for duplicate names: a collision in a
// concatenated bundle is a SyntaxError and a dead page.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SRC_SKIP = new Set(['80_main.js']);

const strip = (s) => s
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s+/gm, '');

let out = '';
const srcFiles = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js') && !SRC_SKIP.has(f)).sort();
for (const f of srcFiles) out += `\n// ===================== src/${f} =====================\n` + strip(readFileSync(join(root, 'src', f), 'utf8'));
const own = readdirSync(here).filter(f => f.endsWith('.js') && f !== 'build.js' && !f.endsWith('.test.mjs')).sort();
for (const f of own) out += `\n// ===================== tend/${f} =====================\n` + strip(readFileSync(join(here, f), 'utf8'));

// Duplicate top-level declarations — ../build.js's algorithm, every declarator.
const seen = new Map();
let dup = 0;
for (const line of out.split('\n')) {
  const m = line.match(/^(?:(?:const|let)\s+(.*)|(?:class|function)\s+([A-Za-z_$][\w$]*))/);
  if (!m) continue;
  const names = [];
  if (m[2]) names.push(m[2]);
  else {
    let depth = 0, start = 0;
    for (let i = 0; i <= m[1].length; i++) {
      const ch = m[1][i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (i === m[1].length || (ch === ',' && depth === 0)) {
        const d = m[1].slice(start, i).match(/^\s*([A-Za-z_$][\w$]*)/);
        if (d) names.push(d[1]);
        start = i + 1;
      }
    }
  }
  for (const n of names) {
    if (seen.has(n)) { console.error('DUPLICATE TOP-LEVEL:', n); dup++; }
    seen.set(n, true);
  }
}
if (dup) { console.error('tend.html was NOT written.'); process.exit(1); }
try {
  new Function(out);
} catch (e) {
  console.error('BUNDLE DOES NOT PARSE:', e.message);
  console.error('tend.html was NOT written.');
  process.exit(1);
}
const tpl = readFileSync(join(here, 'template.html'), 'utf8');
writeFileSync(join(root, 'tend.html'), tpl.replace('/* __BUNDLE__ */', () => out));
console.log('built tend.html', (out.length / 1024).toFixed(1) + 'kb js');
