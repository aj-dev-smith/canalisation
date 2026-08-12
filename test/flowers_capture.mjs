// What does a flower-piece capture COST, and WHERE? Headless Node, no browser.
//
//   node test/flowers_capture.mjs                                   # one specimen
//   node test/flowers_capture.mjs '{"n":7,"steps":3000}'            # the field
//   node test/flowers_capture.mjs '{"n":7,"steps":3000,"lod":0}'    # ...LOD off
//
// Grows a specimen with the shipped makeSpecimen, then times flDrawSpecimen
// into a FlowerBuffers — median of 20 captures after warm-up — and prints the
// stream float counts. This is the number the browser page pays on every sim
// step and every camera move (40_boot.js captureDirty()), and the number a
// garden multiplies.
//
// With n>1 it grows the WHOLE FIELD flGardenPlan (35_garden.js) plans: species
// dealt without replacement, plan origins, per-member floral form, and — the
// part that decides the organ count — the germination STAGGER, so member i is
// grown for `steps - startAt` steps exactly as the page's world clock grows it.
// A field profiled without the stagger is a different field: at steps 3000 with
// FL_GARDEN_STAGGER 2400 the youngest member is a seedling.
//
// THE PROFILE. Timing a whole capture says only that it is slow. This file
// breaks it down three ways, all off the organ brackets FlowerBuffers already
// records, so nothing in flowers/ is instrumented to get them:
//   - per specimen (which plant, how far from the eye, how many organs);
//   - per organ KIND (stem / leaf / petal / sepal / stamen / carpel / fruit /
//     meristem), ms and floats, which is the table that says where to look;
//   - per stream (tri / petal / vein / point), floats and share.
// The per-kind clock is a timing FlowerBuffers subclass that reads the wall
// clock in beginOrgan/endOrgan — it costs ~0.1us an organ, and the total it
// sums to is printed against the uninstrumented median so an inflated
// instrument shows up as a discrepancy rather than as a conclusion.
//
// THE EYE MATTERS, so it is stated rather than defaulted: the field is framed
// the way 40_boot's garden shot frames it (the bound of every specimen, dolly
// 2.35x the bound radius), and every distance-dependent law downstream — the
// blade-mesh LOD this file exists to measure — is evaluated from that eye.
//
// PRINTS, does not judge cost — capture ms is a machine-relative quantity and
// there is no budget. It ASSERTS only structure, copied from
// flowers/parity.test.mjs: organ ranges monotone and covering the streams,
// because a timing of a capture whose bookkeeping is broken times nothing.
//
// The bundle is built the way flowers/parity.test.mjs builds it (loader copied
// deliberately): src minus 60_render/80_main, plus the non-DOM flower files,
// one shared scope, evaluated with new Function.

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
// every non-DOM flowers file, in build order (30_scene and 40_boot touch the
// DOM). 28_lod.js is the blade LOD and MUST be here — it is the thing measured.
for (const f of ['10_capture.js', '12_form.js', '15_petal.js', '17_spots.js',
  '20_draw.js', '28_lod.js', '35_garden.js'])
  code += strip(readFileSync(join(root, 'flowers', f), 'utf8')) + '\n';
code += '\nreturn { App, Buffers, FlowerBuffers, flEnv, flDrawSpecimen, SPECIES, setView, v3,' +
  ' flGardenPlan, flApplyForm, flBladeMeshLOD, flSetRaster, flSpecimenDist, FL_LOD };\n';

const M = new Function(code)();

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const species = arg.species || 'Ember Creeper';
const seed = arg.seed ?? 21;
const steps = arg.steps ?? 1400;
const n = arg.n ?? 1;
const lodOn = arg.lod === undefined ? 1 : +arg.lod;
// The RASTER the law is stated against: the drawing buffer's height in pixels.
// tools/flowers_shot.mjs shoots 780 CSS px at deviceScaleFactor 2, so 1560 is
// the page's own number and not a harness invention.
const pxH = arg.px ?? 1560;

let fails = 0;
function ok(cond, label, detail) {
  if (!cond) { fails++; console.error('  FAIL', label, detail || ''); }
  else console.log('  ok  ', label, detail || '');
}

// The page's own URL-parameter object, for flApplyForm. A bare open rotates the
// form per seed, which is what a default field shows.
const noQ = { get: () => null };

// grow one specimen at an origin, on a fresh env, with its floral form applied
function grow(name, sd, origin, nsteps) {
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, name, sd, origin);
  S.plant.sp.senesceHold = true;                 // the page's default
  M.flApplyForm(S, name, sd, noQ);
  for (let i = 0; i < nsteps; i++) S.plant.step(1);
  return { env, S };
}

// median capture ms: warm-up, then 20 timed captures into the same buffers
function timeCapture(env, B, S) {
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

// The per-kind clock. A FlowerBuffers that times each organ bracket and files
// the ms and the stream floats under the organ's kind.
// WARM IT, and reset the tally, before the pass that is read: an instrumented
// COLD pass sums to more than the warm median it is compared against, and the
// difference reads as instrument overhead when it is just the first run.
function timedPass(env, S) {
  const TB = TimingBuffers();
  for (let i = 0; i < 3; i++) { TB.reset(); M.flDrawSpecimen(env, TB, S); }
  TB.byKind.clear();
  TB.reset();
  M.flDrawSpecimen(env, TB, S);
  return TB;
}

function TimingBuffers() {
  const B = new M.FlowerBuffers();
  B.byKind = new Map();
  B._t0 = 0n;
  const bo = B.beginOrgan.bind(B), eo = B.endOrgan.bind(B);
  B.beginOrgan = (meta) => { B._t0 = process.hrtime.bigint(); bo(meta); };
  B.endOrgan = () => {
    const o = B._open;
    eo();
    if (!o) return;
    const dt = Number(process.hrtime.bigint() - B._t0) / 1e6;
    const k = o.meta.kind;
    let r = B.byKind.get(k);
    if (!r) B.byKind.set(k, r = { n: 0, ms: 0, tri: 0, pet: 0, seg: 0, pt: 0 });
    r.n++; r.ms += dt;
    r.tri += o.tri1 - o.tri0; r.pet += o.pet1 - o.pet0;
    r.seg += o.seg1 - o.seg0; r.pt += o.pt1 - o.pt0;
  };
  return B;
}

function kindTable(rows) {
  // rows: Map kind -> {n, ms, tri, pet, seg, pt}, merged across specimens
  const list = [...rows.entries()].sort((a, b) => b[1].ms - a[1].ms);
  const tot = list.reduce((s, r) => s + r[1].ms, 0);
  console.log('  kind        n      ms     %     tri fl    petal fl    vein fl');
  for (const [k, r] of list) {
    console.log(`  ${k.padEnd(9)} ${String(r.n).padStart(4)} ${r.ms.toFixed(2).padStart(7)} ` +
      `${(100 * r.ms / Math.max(1e-9, tot)).toFixed(1).padStart(5)}  ${String(r.tri).padStart(9)} ` +
      `${String(r.pet).padStart(11)} ${String(r.seg).padStart(10)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(9)} ${String(list.reduce((s, r) => s + r[1].n, 0)).padStart(4)} ` +
    `${tot.toFixed(2).padStart(7)}`);
}

function printStreams(B, pad = '  ') {
  console.log(`${pad}streams: tri ${B.triN} floats (${B.triN / 10} verts)  ` +
    `vein ${B.segN} floats (${B.segN / 12} segments)  ` +
    `petal ${B.petbN} floats (${B.petbN / 16} verts)  ` +
    `pt ${B.ptN} floats`);
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

// ---------------------------------------------------------------- one specimen
if (n <= 1) {
  console.log(`${species} seed ${seed} @ ${steps} steps`);
  const { env, S } = grow(species, seed, undefined, steps);
  M.setView(env.cam.eye, 0.004, 0);
  M.flSetRaster(env.cam.eye, lodOn ? pxH : 0, env.cam.fov);
  env.bladeMesh = M.flBladeMeshLOD;
  env._flD = M.flSpecimenDist(S);
  const B = new M.FlowerBuffers();
  const med = timeCapture(env, B, S);
  console.log(`  organs ${S.plant.organCount()}  capture ${med.toFixed(2)}ms (median of 20, warm)`);
  printStreams(B);
  kindTable(timedPass(env, S).byKind);
  checkStructure(B, 'hero');
}

// ---------------------------------------------------------------------- a field
if (n > 1) {
  const plan = M.flGardenPlan(seed, n, {});
  console.log(`garden of ${n}, seed ${seed} @ world step ${steps}` +
    `  (blade LOD ${lodOn ? 'ON' : 'OFF'})`);
  const grown = [];
  for (let i = 0; i < n; i++) {
    const p = plan[i];
    grown.push({ p, ...grow(p.name, p.seed, p.origin, Math.max(0, steps - p.startAt)) });
  }

  // THE EYE: the page's garden framing (40_boot updateFraming, gardenN branch) —
  // the bound of every specimen's axis points, dolly 2.35x the bound radius.
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const g of grown) for (const ax of g.S.plant.axes) for (const q of ax.pts) {
    if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0];
    if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1];
    if (q[2] < z0) z0 = q[2]; if (q[2] > z1) z1 = q[2];
  }
  const cx = (x0 + x1) / 2, cy = Math.max(1.2, (y0 + y1) / 2), cz = (z0 + z1) / 2;
  const rad = Math.max(5, Math.max(2, Math.hypot(x1 - cx, y1 - cy, z1 - cz)) * 1.15);
  const dist = rad * 2.35;
  // a level three-quarter eye at the dolly distance, the shot the page settles to
  const eye = M.v3(cx + dist * 0.80, cy + dist * 0.35, cz + dist * 0.49);
  console.log(`  eye ${eye.map(v => v.toFixed(1)).join(',')}  target ` +
    `${[cx, cy, cz].map(v => v.toFixed(1)).join(',')}  framing dist ${dist.toFixed(1)}`);

  const merged = new Map();
  let total = 0, tri = 0, pet = 0, seg = 0, pt = 0, organs = 0;
  const Bs = [];
  for (let i = 0; i < n; i++) {
    const g = grown[i];
    g.env.cam.eye[0] = eye[0]; g.env.cam.eye[1] = eye[1]; g.env.cam.eye[2] = eye[2];
    g.env.cam.dist = dist;
    M.setView(eye, 0.004, 0);
    M.flSetRaster(eye, lodOn ? pxH : 0, g.env.cam.fov);
    g.env.bladeMesh = M.flBladeMeshLOD;
    // no hero exemption: the law exempts the subject by itself, because the
    // subject is large on screen (see 28_lod.js, and the close-up check below)
    g.env._flD = M.flSpecimenDist(g.S);
    const B = new M.FlowerBuffers();
    const ms = timeCapture(g.env, B, g.S);
    const o = g.S.plant.organCount();
    const d = Math.hypot(g.p.origin[0] - eye[0], eye[1], g.p.origin[2] - eye[2]);
    total += ms; tri += B.triN; pet += B.petbN; seg += B.segN; pt += B.ptN; organs += o;
    console.log(`  [${i}] ${g.p.name.padEnd(20)} age ${String(Math.max(0, steps - g.p.startAt)).padStart(4)}` +
      `  d ${d.toFixed(1).padStart(5)}  organs ${String(o).padStart(4)}  capture ${ms.toFixed(2).padStart(7)}ms`);
    printStreams(B, '      ');
    checkStructure(B, `[${i}]`);
    Bs.push(B);
    const TB = timedPass(g.env, g.S);
    for (const [k, r] of TB.byKind) {
      let m = merged.get(k);
      if (!m) merged.set(k, m = { n: 0, ms: 0, tri: 0, pet: 0, seg: 0, pt: 0 });
      m.n += r.n; m.ms += r.ms; m.tri += r.tri; m.pet += r.pet; m.seg += r.seg; m.pt += r.pt;
    }
  }
  console.log(`\n  FIELD: ${organs} organs, capture ${total.toFixed(2)}ms/frame`);
  const allF = tri + pet + seg + pt;
  const pc = (v) => (100 * v / Math.max(1, allF)).toFixed(1) + '%';
  console.log(`  streams: tri ${tri} (${pc(tri)})  petal ${pet} (${pc(pet)})  ` +
    `vein ${seg} (${pc(seg)})  pt ${pt} (${pc(pt)})`);
  console.log('');
  kindTable(merged);
}

if (fails) { console.error(`\n${fails} structural failures`); process.exit(1); }
console.log('\nstructure ok');
