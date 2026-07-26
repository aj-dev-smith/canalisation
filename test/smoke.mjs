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
import { Leaf } from '../src/30_leaf.js';
import { Buffers, blade, setView } from '../src/50_geom.js';
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

  // --- senescence: does the specimen FINISH? -------------------------------
  // Structural only. That a plant which has run out of growing points then
  // dismantles itself is an invariant; how fast, in what order, and how much of
  // it completes inside the step budget are not, and are not asserted.
  let spentAt = null, sen = 0, wentBackwards = false;
  for (let s = 5001; s <= 20000; s++) {
    P.step(1);
    if (spentAt === null && P.spent()) spentAt = s;
    const v = P.senescence();
    if (v < sen - 1e-6) wentBackwards = true;
    sen = v;
    if (P.dead()) break;
  }
  ok(spentAt !== null, 'every growing point was eventually spent', `at step ${spentAt}`);
  ok(Number.isFinite(sen) && sen >= 0 && sen <= 1, 'senescence is a finite fraction', sen);
  ok(sen > 0, 'a spent specimen begins to senesce', `senescence=${sen.toFixed(2)}`);
  ok(!wentBackwards, 'senescence never runs backwards');
  const shed = P.axes.reduce((n, a) => n + a.organs.filter(o => o.shed).length, 0);
  ok(shed > 0, 'blades were shed', `${shed} of ${P.vegOrganCount()}`);
  ok(['senescing', 'dead'].includes(P.stage()), 'stage reaches senescing or dead', P.stage());
}

// --- is any of that DRAWN? -------------------------------------------------
// The gate imported the simulation and nothing else, which is how a geometry
// module once shipped a bundle that did not parse with 47 checks green
// (PITFALLS.md). Importing `50_geom.js` here is half the value of this section
// on its own.
//
// Scope, precisely: this asserts that **`blade()` implements the channel**. It
// cannot assert that the scene passes it — `sen` is the fourteenth positional
// argument and a call site that quietly stopped supplying it would still draw a
// perfectly good live leaf. Only the browser can catch that, and
// `tools/senesce_shot.mjs` is where it would show.
//
// The vein-lag assertion is fair game for a test — unlike a divergence angle it
// is an imposed rule (SCIENCE.md item 6), so pinning it turns nothing emergent
// into something stated.

section('senescence is drawn');
{
  const L = new Leaf(DEFAULT_PRM, {}, 7);
  let s = 0;
  while (!L.mature && s < 4000) { L.step(1); s++; }
  ok(L.mature, 'a blade to draw', `matured after ${s} steps`);
  L.veinDistanceField(30);
  setView([0, 0, 8], 0.004);

  const fr = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const pal = {
    blade0: [0.06, 0.21, 0.21], blade1: [0.10, 0.36, 0.32],
    veinTint: [0.02, 0.16, 0.22], vein: [0.35, 1.0, 0.95], glow: 1.0,
  };
  const draw = (sen) => {
    const B = new Buffers();
    blade(B, L, fr, 1, 1, pal, 0, 0, 1, 30, 14, 1, 1, sen);
    const v = [];
    for (let i = 0; i < B.triN; i += 10) v.push([B.tri[i + 6], B.tri[i + 7], B.tri[i + 8], B.tri[i + 9]]);
    return v;
  };
  const live = draw(0), half = draw(0.5), dead = draw(1);
  ok(live.length > 0 && live.length === half.length && half.length === dead.length,
    'the same blade is drawn at every senescence', `${live.length} vertices`);

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let moved = 0;
  for (let i = 0; i < live.length; i++) if (dist(live[i], dead[i]) > 0.01) moved++;
  ok(moved > live.length * 0.5, 'a dead blade is not the colour of a live one',
    `${moved} of ${live.length} vertices moved`);

  // emissive at sen=0 is the distance-to-vein channel, so the live pass sorts
  // its own vertices into "on a vein" and "open lamina"
  const eMax = live.reduce((m, x) => Math.max(m, x[3]), 0);
  let dOpen = 0, nOpen = 0, dVein = 0, nVein = 0;
  for (let i = 0; i < live.length; i++) {
    if (live[i][3] <= eMax * 0.05) { dOpen += dist(live[i], half[i]); nOpen++; }
    else if (live[i][3] >= eMax * 0.75) { dVein += dist(live[i], half[i]); nVein++; }
  }
  ok(nOpen > 0 && nVein > 0, 'the blade has both open lamina and vein tissue',
    `${nOpen} open, ${nVein} on a vein`);
  ok(dOpen / Math.max(1, nOpen) > dVein / Math.max(1, nVein),
    'half way through, the open lamina has drained further than the veins',
    `${(dOpen / Math.max(1, nOpen)).toFixed(3)} vs ${(dVein / Math.max(1, nVein)).toFixed(3)}`);

  let glowLive = 0, glowDead = 0;
  for (let i = 0; i < live.length; i++) { glowLive += live[i][3]; glowDead += dead[i][3]; }
  ok(glowDead < glowLive * 0.05, 'dead tissue has stopped glowing',
    `${glowDead.toFixed(2)} against ${glowLive.toFixed(2)}`);
}

// ---------------------------------------------------------------------------

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
