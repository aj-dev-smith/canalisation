// THE POLLEN POPULATION, HEADLESS. What does a field actually shed, and where
// does a grain go?
//
//   node test/flowers_pollen.mjs                              # the solo page
//   node test/flowers_pollen.mjs '{"n":7,"steps":3000}'       # a field of seven
//   node test/flowers_pollen.mjs '{"n":7,"rate":0.02}'        # sweep the rate
//
// 18_pollen.js is physics the plant is subject to (Stokes settling in the one
// wind field), so it is the same category as 39_fall.js and gets the same
// treatment: work the numbers out and then ask the solver for them, rather
// than judging a mote field by eye alone. Four questions this answers and a
// screenshot cannot:
//
//   1. HOW MANY ANTHERS a field has, over time. The shed rate is per dehiscing
//      organ, so the population's source term is N_anther * rate, and a garden
//      multiplies the anther count without touching the cap.
//   2. WHETHER THE CAP BINDS, and from when. At the cap, emission is silently
//      refused and every plant's plume thins in proportion — the population
//      stops being a statement about the flowers and becomes a statement about
//      FL_POLLEN.max.
//   3. WHERE A GRAIN DIES: age, ground, or the world edge. Those are three
//      completely different pictures (a hanging mote field, pollen settling,
//      a downwind plume leaving the clearing) and the ratio decides which one
//      the viewer gets.
//   4. WHAT IT COSTS. Every live grain is a windAt() per frame; the wind field
//      is a 7-octave mode ladder, so this is the one part of the piece whose
//      cost scales with a legibility constant.
//
// The world clock here is the ff path of 40_boot.js: every specimen is paid its
// whole debt every step, so age == step - startAt exactly, which is what the
// page's hero always is and what its members converge to. Grains drift on the
// WORLD clock (one air over the clearing), plants shed on their OWN.
//
// PRINTS. It asserts only that the population conserves — every grain emitted
// is alive, dead or refused — because a census that does not add up is not a
// measurement.

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
// `polfile` swaps 18_pollen.js for another copy of it — which is how the
// before/after in the branch notes was measured, against
// `git show <rev>:flowers/18_pollen.js`. A negative result you cannot
// re-measure is just a story, and so is a positive one.
const argv0 = process.argv[2] ? JSON.parse(process.argv[2]) : {};
for (const f of ['10_capture.js', '12_form.js', '15_petal.js', '17_spots.js',
  '18_pollen.js', '20_draw.js', '28_lod.js', '35_garden.js'])
  code += strip(readFileSync(f === '18_pollen.js' && argv0.polfile
    ? argv0.polfile : join(root, 'flowers', f), 'utf8')) + '\n';
code += '\nreturn { App, flEnv, SPECIES, FlPollen, FL_POLLEN, flGardenPlan, flApplyForm, WORLD, velToWorld, windAt, v3 };\n';
const M = new Function(code)();

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const species = arg.species || 'Ember Creeper';
const seed = arg.seed ?? 21;
const steps = arg.steps ?? 3000;
const n = arg.n ?? 1;
const every = arg.every ?? 250;
if (arg.rate !== undefined) M.FL_POLLEN.rate = arg.rate;
if (arg.max !== undefined) M.FL_POLLEN.max = arg.max;
if (arg.beyond !== undefined) M.FL_POLLEN.beyond = arg.beyond;
if (arg.life !== undefined) M.FL_POLLEN.life = arg.life;

// A stand-in for 40_boot's URLSearchParams, so flApplyForm rotates the form
// per seed exactly as the page does.
const q = { get: (k) => (arg[k] === undefined ? null : String(arg[k])) };

const env = M.flEnv();
const plan = n > 1 ? M.flGardenPlan(seed, n, {}) : null;
const specs = [];
{
  const nm = plan ? plan[0].name : species;
  const S = M.App.prototype.makeSpecimen.call(env, nm, seed);
  S.plant.sp.senesceHold = true;
  M.flApplyForm(S, nm, seed, q);
  specs.push({ S, startAt: 0, age: 0, stepped: 0, name: nm });
  if (plan) for (let i = 1; i < plan.length; i++)
    specs.push({ S: null, startAt: plan[i].startAt, age: 0, stepped: 0, name: plan[i].name, plan: plan[i] });
}
const wind = specs[0].S.plant.wind;

const pollen = new M.FlPollen(seed, specs[0].S.pal.keyCol, plan);
// `takesField` marks the population that walks a LIST of specimens. Kept as a
// feature test rather than a version check so this harness runs against the
// hero-only population too, which is how the before/after below was measured.
const multi = !!pollen.takesField && arg.solo !== 1;

const P = M.FL_POLLEN;
const rows = [];
let stepMs = 0, stepCalls = 0;

function anthers(S) {
  let a = 0;
  const wb = S.sp.whorlBands, pQ = S.sp.petalQ;
  for (const ax of S.plant.axes) {
    if (!ax.floral) continue;
    for (const org of ax.organs) {
      if (!org.floral || org.petal || org.shed) continue;
      if ((org.dev || 0) < P.devGate || (org.sen || 0) > 0) continue;
      if (!org.frame || org.len < 0.05) continue;
      if (wb) { if (org.whorl !== 'stamen') continue; }
      else {
        const qn = ((org.q || 0) - pQ) / Math.max(1e-3, 1 - pQ);
        if (qn > P.qBand) continue;
      }
      a++;
    }
  }
  return a;
}

// World steps between pollen updates. THE PAGE'S FRAME, not a convenience: a
// grain drifts ~0.32 world units per plant-time unit in the shipped 2.5 m/s
// air, so the chunk IS the integration step, and at the ?ff= chunk of 40 a
// grain jumps 12.8 units per call and can be emitted and killed inside one.
// The real-time page advances at most 6 world steps a frame (40_boot.js), so
// that is the default here; `chunk` sweeps it, and the difference between 6
// and 40 is the difference between the field you watch and the field a
// fast-forwarded screenshot shows.
const CH = arg.chunk ?? 6;
for (let step = 1; step <= steps; step += CH) {
  const d = Math.min(CH, steps - step + 1);
  for (const s of specs) {
    if (!s.S && s.startAt <= step) {
      const p = s.plan;
      const M2 = M.App.prototype.makeSpecimen.call(env, p.name, p.seed, p.origin, wind);
      M2.plant.sp.senesceHold = true;
      M.flApplyForm(M2, p.name, p.seed, q);
      s.S = M2;
    }
    if (!s.S) { s.stepped = 0; continue; }
    const want = (step + d - 1) - s.startAt;
    const pay = Math.max(0, want - s.age);
    for (let j = 0; j < pay; j++) s.S.plant.step(1);
    s.age += pay; s.stepped = pay;
  }
  const t0 = process.hrtime.bigint();
  if (multi) pollen.step(specs, d, step + d - 1);
  else pollen.step(specs[0].S, specs[0].stepped, specs[0].age);
  stepMs += Number(process.hrtime.bigint() - t0) / 1e6; stepCalls++;

  if ((step - 1) % every < CH || step + CH > steps) {
    let ant = 0, shedders = 0, germ = 0;
    for (const s of specs) {
      if (!s.S) continue;
      germ++;
      const a = anthers(s.S);
      ant += a;
      if (a > 0) shedders++;
    }
    // where the grains are: radius from the clearing's centre, and height
    let rmax = 0, rsum = 0, hsum = 0, out = 0;
    for (let i = 0; i < pollen.n; i++) {
      const o = i * 7, b = pollen.buf;
      const r = Math.hypot(b[o], b[o + 2]);
      rsum += r; hsum += b[o + 1]; if (r > rmax) rmax = r;
      // AMONG THE FLOWERS, or on the sky. `near` counts grains within one
      // plant's room (FL_GARDEN_SPACING) of the nearest specimen — the ones a
      // viewer reads as motes around a flower rather than as pin-pricks in the
      // distance. It is the number that should not move when `beyond` does.
      let dn = Infinity;
      for (const s2 of specs) {
        if (!s2.S) continue;
        const og = s2.plan ? s2.plan.origin : [0, 0, 0];
        dn = Math.min(dn, Math.hypot(b[o] - og[0], b[o + 2] - og[2]));
      }
      if (dn <= 12) out++;
    }
    rows.push({ step: step + d - 1, germ, shedders, ant, grains: pollen.n,
      rmean: pollen.n ? rsum / pollen.n : 0, rmax,
      hmean: pollen.n ? hsum / pollen.n : 0, out });
  }
}

const label = plan ? `garden of ${n}` : species;
console.log(`\n=== POLLEN: ${label}, seed ${seed}, ${steps} steps ` +
  `(rate ${P.rate}, max ${P.max}, life ${P.life}) ===`);
console.log('  step   germ  shed  anthers  grains   cap%   r_mean  r_max   y_mean     near');
for (const r of rows)
  console.log(`  ${String(r.step).padStart(5)}  ${String(r.germ).padStart(4)}  ` +
    `${String(r.shedders).padStart(4)}  ${String(r.ant).padStart(7)}  ` +
    `${String(r.grains).padStart(6)}  ${(100 * r.grains / P.max).toFixed(0).padStart(4)}  ` +
    `${r.rmean.toFixed(1).padStart(7)} ${r.rmax.toFixed(1).padStart(6)}  ` +
    `${r.hmean.toFixed(1).padStart(7)}  ${String(r.out).padStart(7)}`);

console.log(`\n  population step: ${(stepMs / stepCalls).toFixed(3)} ms mean over ` +
  `${stepCalls} calls (${(stepMs / stepCalls / Math.max(1, pollen.n) * 1000).toFixed(2)} us/grain)`);
console.log(`  settling: ${pollen.vs.toFixed(5)} world units / plant-time unit ` +
  `= ${(pollen.vs / M.velToWorld(M.WORLD) * 100).toFixed(2)} cm/s`);
const R = plan ? 0.83 * 12 * Math.sqrt(n) : 0;
if (plan) console.log(`  field radius ${R.toFixed(1)} units` +
  (pollen.rEdge ? `; story ends at ${pollen.rEdge.toFixed(1)}` : '; world-edge test at 90'));

// WHERE A GRAIN GOES. Three deaths and one refusal, and they are four
// different pictures. Only the population that keeps a census can say.
const s = pollen.stat;
if (s) {
  const d = s.age + s.ground + s.edge;
  console.log(`\n  emitted ${s.emit}  refused (cap) ${s.refuse}` +
    `   died: age ${s.age} (${(100 * s.age / Math.max(1, d)).toFixed(0)}%)` +
    `  ground ${s.ground} (${(100 * s.ground / Math.max(1, d)).toFixed(0)}%)` +
    `  edge ${s.edge} (${(100 * s.edge / Math.max(1, d)).toFixed(0)}%)`);
  // THE CENSUS MUST ADD UP. A population that loses grains it cannot account
  // for is not measuring anything, and the swap-with-last removal in step()
  // is exactly the kind of loop that drops one silently.
  const bal = s.emit - d - pollen.n;
  console.log(`  conservation: emit - died - alive = ${bal}` + (bal === 0 ? '  OK' : '  MISMATCH'));
  if (bal !== 0) { console.error('FAIL: pollen census does not balance'); process.exit(1); }
}
