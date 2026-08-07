// Build flowers.html — the Three.js flower piece.
//
// Same discipline as ../build.js: one file, no server, no CDN, and the bundle
// is PARSED before it is written. Differences, each argued for:
//   - vendor/ (three r147 UMD + its example passes) goes in verbatim, first.
//     Each vendor file is an IIFE that leaks only THREE, so the duplicate scan
//     skips them — scanning minified three would drown the signal.
//   - src/ comes in exactly as ../build.js takes it, MINUS 60_render.js and
//     80_main.js: the WebGL2 renderer and the page wiring are the two things
//     this piece replaces, and both are DOM-touching at call time. Everything
//     the flowers need — the solver, the organs, the geometry helpers, the
//     species table, drawSpecimen's helpers — is in the rest.
//   - flowers/*.js (numbered, like src/) goes last and IS scanned: it shares
//     the one scope with the engine, and a name collision there is the same
//     silent death PITFALLS records for canalisation.html.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// The composer stack (EffectComposer, UnrealBloomPass et al.) was vendored
// once and is gone: 30_scene.js now runs the shipped post chain manually,
// which is both more faithful to 60_render.js and ~53kb lighter.
const VENDOR = ['three.min.js', 'OrbitControls.js'];
const SRC_SKIP = new Set(['60_render.js', '80_main.js']);

let vend = '';
for (const f of VENDOR) vend += `\n// ===== vendor/${f} =====\n` + readFileSync(join(root, 'vendor', f), 'utf8');

const strip = (s) => s
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s+/gm, '');

let out = '';
const srcFiles = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js') && !SRC_SKIP.has(f)).sort();
for (const f of srcFiles) out += `\n// ===================== src/${f} =====================\n` + strip(readFileSync(join(root, 'src', f), 'utf8'));
const flFiles = readdirSync(here).filter(f => f.endsWith('.js') && f !== 'build.js').sort();
for (const f of flFiles) out += `\n// ===================== flowers/${f} =====================\n` + strip(readFileSync(join(here, f), 'utf8'));

// Duplicate top-level declaration scan — ../build.js's algorithm, applied to
// the scanned (non-vendor) half of the bundle. Every declarator in a list.
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
if (dup) { console.error('flowers.html was NOT written.'); process.exit(1); }

const bundle = vend + out;
try {
  new Function(bundle);
} catch (e) {
  console.error('BUNDLE DOES NOT PARSE:', e.message);
  console.error('flowers.html was NOT written.');
  process.exit(1);
}

const tpl = readFileSync(join(here, 'template.html'), 'utf8');
writeFileSync(join(root, 'flowers.html'), tpl.replace('/* __BUNDLE__ */', () => bundle));
console.log('built flowers.html', (bundle.length / 1024).toFixed(1) + 'kb js');
