// Structural invariants for the simulation. This is the CI gate.
//
// These assertions are deliberately LOOSE. They check that the chemistry is alive
// and finite — tissue patterns, organs initiate, an outline closes, a fruit sets
// seed — and nothing more. They do NOT assert divergence angles, leaf proportions,
// petal counts or any other emergent quantity, because pinning those down in a
// test would quietly turn an emergent result into an imposed one. That is exactly
// the failure mode this project exists to avoid.
//
// If you want to know what the numbers actually are, run the diagnostic harnesses
// alongside this one — they print, they do not judge.

import { Meristem } from '../src/20_meristem.js';
import { Margin } from '../src/25_margin.js';
import { Fruit } from '../src/35_fruit.js';
import { Plant } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';

let failures = 0;
let checks = 0;

function ok(cond, label, detail) {
  checks++;
  if (cond) return;
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}

function finite(arr, n, label) {
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(arr[i])) return ok(false, label, `index ${i} is ${arr[i]}`);
  }
  ok(true, label);
}

function section(name) {
  console.log(name);
}

// --- meristem: does the tissue pattern, and do organs come off it? ----------

section('meristem');
{
  const m = new Meristem(DEFAULT_PRM, {}, 7);
  for (let i = 0; i < 2600; i++) m.step(1);

  ok(m.F.n > 0, 'tissue has cells', `n=${m.F.n}`);
  finite(m.F.a, m.F.n, 'auxin field is finite');
  ok(m.divergence.length > 3, 'organs initiated', `${m.divergence.length + 1} primordia`);
  ok(Number.isFinite(m.plastochron) && m.plastochron > 0,
    'plastochron is positive and finite', m.plastochron);

  const st = m.divergenceStats(60);
  ok(st !== null, 'divergence statistics available');
  if (st) {
    ok(Number.isFinite(st.mean) && Number.isFinite(st.sd),
      'divergence statistics are finite', `mean=${st.mean} sd=${st.sd}`);
  }
}

// --- frozen tissue: the up-the-gradient instability alone must make spots ---

section('patterning (growth off)');
{
  const m = new Meristem(DEFAULT_PRM, { G: 0, detectOff: true }, 11);
  for (let i = 0; i < 900; i++) m.step(1);
  const s = m.patternStats();
  ok(s && Object.keys(s).length > 0, 'pattern statistics available');
  for (const [k, v] of Object.entries(s || {})) {
    if (typeof v === 'number') ok(Number.isFinite(v), `patternStats.${k} is finite`, v);
  }
  finite(m.F.a, m.F.n, 'auxin field is finite');
}

// --- margin: does a leaf outline converge and close? ------------------------

section('leaf margin');
{
  const M = new Margin(DEFAULT_PRM, {}, 3);
  let s = 0;
  while (!M.mature && s < 4000) { M.step(1); s++; }

  ok(M.mature, 'outline reached maturity', `after ${s} steps`);
  ok(M.F.n > 0, 'margin has points', `n=${M.F.n}`);
  ok(Number.isFinite(M.aspect) && M.aspect > 0, 'aspect is positive and finite', M.aspect);
  ok(Number.isFinite(M.length) && M.length > 0, 'length is positive and finite', M.length);

  let bad = null;
  for (let k = 0; k <= 40 && !bad; k++) {
    const u = k / 40;
    for (const side of [-1, 1]) {
      const h = M.half(u, side);
      if (!Number.isFinite(h) || h < 0) bad = `half(${u.toFixed(2)}, ${side}) = ${h}`;
    }
  }
  ok(!bad, 'silhouette is finite and non-negative everywhere', bad);
}

// --- fruit: does the ovary swell and set seed, across seeds? ----------------

section('fruit');
for (const seed of [3, 17, 41, 88]) {
  const f = new Fruit(DEFAULT_PRM, {}, seed);
  let s = 0;
  while (!f.mature && s < 4000) { f.step(1); s++; }
  for (let k = 0; k < 400; k++) f.step(1);   // let the ripening wave finish

  ok(f.mature, `seed ${seed}: fruit matured`, `after ${s} steps`);
  ok(f.seeds.length > 0, `seed ${seed}: ovules placed`, `${f.seeds.length} seeds`);
  finite(f.rad, f.n, `seed ${seed}: radii are finite`);

  let minR = Infinity;
  for (let i = 0; i < f.n; i++) if (f.rad[i] < minR) minR = f.rad[i];
  ok(minR > 0, `seed ${seed}: no collapsed surface`, `min radius ${minR}`);
}

// --- plant: does a whole organism run a life cycle without going numeric? ---

section('plant life cycle');
{
  const prm = { ...DEFAULT_PRM, T: 40, D: 6, mu: 0.3, rho: 0.6, b: 3 };
  const mo = { ...MERISTEM_DEFAULTS, R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 };
  const P = new Plant(prm, mo, { leafLibrary: 3, maxAxes: 8, branching: 0.55 }, 21);
  for (let s = 1; s <= 5000; s++) P.step(1);

  const flowers = P.axes.filter(a => a.floral);
  const petals = P.axes.reduce((n, a) => n + a.organs.filter(o => o.petal).length, 0);
  const fruits = P.axes.filter(a => a.fruit);

  ok(P.axes.length > 1, 'plant branched', `${P.axes.length} axes`);
  ok(Number.isFinite(P.florigen), 'florigen is finite', P.florigen);
  ok(flowers.length > 0, 'plant flowered', `${flowers.length} floral axes`);
  ok(petals > 0, 'petals initiated', `${petals} petals`);
  ok(fruits.length > 0, 'fruit set', `${fruits.length} fruits`);

  for (const a of P.axes) {
    if (!Number.isFinite(a.length)) { ok(false, 'axis lengths are finite', `${a.length}`); break; }
  }
}

// ---------------------------------------------------------------------------

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
