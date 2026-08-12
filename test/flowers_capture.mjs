// What does a flower-piece capture COST? Headless Node, no browser.
//
//   node test/flowers_capture.mjs                                # defaults
//   node test/flowers_capture.mjs '{"species":"Nightglass Parasol","seed":7,"steps":2600,"n":4}'
//
// Grows a specimen with the shipped makeSpecimen, then times flDrawSpecimen
// into a FlowerBuffers — median of 20 captures after warm-up — and prints the
// stream float counts. This is the number the browser page pays on every sim
// step and every camera move (40_boot.js capture()), and the number a garden
// multiplies: the phase-3 baseline lives here.
//
// With n>1 it looks for a garden planner in the bundle (flGardenPlan). Today
// there is none, so it prints 'garden: not built yet' and exits 0; when the
// planner lands, this file exercises it unchanged — n specimens at plan
// origins, per-specimen and total capture ms.
//
// PRINTS, does not judge cost — capture ms is a machine-relative quantity and
// there is no budget yet. It ASSERTS only structure, copied from
// flowers/parity.test.mjs: organ ranges monotone and covering the streams,
// because a timing of a capture whose bookkeeping is broken times nothing.
//
// The bundle is built the way flowers/parity.test.mjs builds it (loader copied
// deliberately): src minus 60_render/80_main, plus the five non-DOM flower
// files, one shared scope, evaluated with new Function.

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const strip = (s) => s
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s+/gm, '');

let code = '';
const SRC_SKIP = new Set(['60_render.js', '80_main.js']);
for (const f of readdirSync(join(root, 'src')).filter(f => f.endsWith('.js') && !SRC_SKIP.has(f)).sort())
  code += strip(readFileSync(join(root, 'src', f), 'utf8')) + '\n';
for (const f of ['10_capture.js', '12_form.js', '15_petal.js', '17_spots.js', '20_draw.js'])
  code += strip(readFileSync(join(root, 'flowers', f), 'utf8')) + '\n';
code += '\nreturn { App, Buffers, FlowerBuffers, flEnv, flDrawSpecimen, SPECIES, setView, v3,' +
  ' flGardenPlan: typeof flGardenPlan === "function" ? flGardenPlan : null };\n';

const M = new Function(code)();

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const species = arg.species || 'Ember Creeper';
const seed = arg.seed ?? 21;
const steps = arg.steps ?? 1400;
const n = arg.n ?? 1;

let fails = 0;
function ok(cond, label, detail) {
  if (!cond) { fails++; console.error('  FAIL', label, detail || ''); }
  else console.log('  ok  ', label, detail || '');
}

// grow one specimen at an origin, on a fresh env
function grow(origin) {
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, species, seed, origin);
  for (let i = 0; i < steps; i++) S.plant.step(1);
  return { env, S };
}

// median capture ms: warm-up, then 20 timed captures into the same buffers
function timeCapture(env, B, S) {
  M.setView(env.cam.eye, 0.004, 0);
  for (let i = 0; i < 3; i++) { B.reset(); M.flDrawSpecimen(env, B, S); }
  const ms = [];
  for (let i = 0; i < 20; i++) {
    B.reset();
    const t0 = process.hrtime.bigint();
    M.flDrawSpecimen(env, B, S);
    ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  ms.sort((a, b) => a - b);
  return ms[10];
}

// structure: every stream byte belongs to exactly one organ, in order —
// copied from flowers/parity.test.mjs, which is the source of this check
function checkStructure(B, label) {
  let last = { tri: 0, seg: 0, pt: 0, pet: 0 }, mono = true;
  for (const o of B.organs) {
    if (o.tri0 < last.tri || o.seg0 < last.seg || o.pt0 < last.pt || o.pet0 < last.pet) mono = false;
    if (o.tri1 < o.tri0 || o.seg1 < o.seg0 || o.pt1 < o.pt0 || o.pet1 < o.pet0) mono = false;
    last = { tri: o.tri1, seg: o.seg1, pt: o.pt1, pet: o.pet1 };
  }
  ok(mono, `${label}: organ ranges monotone and well-formed`, `${B.organs.length} organs`);
  ok(last.tri === B.triN && last.seg === B.segN && last.pet === B.petbN,
    `${label}: ranges cover the streams`,
    `tri ${last.tri}/${B.triN} seg ${last.seg}/${B.segN} pet ${last.pet}/${B.petbN}`);
}

function printStreams(B) {
  console.log(`  streams: tri ${B.triN} floats (${B.triN / 10} verts)  ` +
    `vein ${B.segN} floats (${B.segN / 12} segments)  ` +
    `petal ${B.petbN} floats (${B.petbN / 16} verts)  ` +
    `pt ${B.ptN} floats`);
}

console.log(`${species} seed ${seed} @ ${steps} steps`);
const { env, S } = grow();
const B = new M.FlowerBuffers();
const med = timeCapture(env, B, S);
console.log(`  capture ${med.toFixed(2)}ms (median of 20, warm)`);
printStreams(B);
checkStructure(B, 'hero');

if (n > 1) {
  if (typeof M.flGardenPlan === 'function') {
    console.log(`\ngarden of ${n} (flGardenPlan)`);
    const plan = M.flGardenPlan(n, { seed });
    const plots = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const p = plan[i] || {};
      const g = grow(p.origin);
      const gB = new M.FlowerBuffers();
      const ms = timeCapture(g.env, gB, g.S);
      total += ms;
      console.log(`  [${i}] origin ${JSON.stringify(p.origin || null)}  capture ${ms.toFixed(2)}ms`);
      printStreams(gB);
      checkStructure(gB, `[${i}]`);
      plots.push(gB);
    }
    console.log(`  total capture ${total.toFixed(2)}ms for ${n} specimens`);
  } else {
    console.log('\ngarden: not built yet');
  }
}

if (fails) { console.error(`\n${fails} structural failures`); process.exit(1); }
console.log('\nstructure ok');
