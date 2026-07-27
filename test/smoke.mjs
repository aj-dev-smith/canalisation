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
import {
  FALL_DEFAULTS, plateOf, fallState, fallStep, fallRegime, drawnBladeLen,
} from '../src/39_fall.js';
import { WORLD, WIND_DEFAULTS, windField, windAt, windGLSL, windGLSLNumbers } from '../src/37_wind.js';

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

section('a shed blade falls like a plate');
{
  // WHAT IS AND IS NOT ASSERTED HERE. Consistent with the note at the top of this
  // file, nothing below pins an emergent quantity: not a descent speed, not a
  // drift, not which regime any particular blade picks. What is asserted is that
  // the mechanism is a mechanism — that it is finite, that it terminates, and that
  // the dimensionless moment of inertia actually SELECTS the behaviour rather than
  // decorating it. That last one is the whole claim of 39_fall.js, and it is cheap
  // to check, so it gates.

  // A plate that cannot rotate at all is not a falling plate. Sweep the chord,
  // which is the only way to move I* without touching anything else, and confirm
  // the ends of the range do the two different things the literature says.
  const drop = (plate, h) => {
    const st = fallState(plate, h);
    for (let i = 0; i < FALL_DEFAULTS.life; i++) {
      fallStep(st, 1);
      if (!Number.isFinite(st.y) || !Number.isFinite(st.th) || !Number.isFinite(st.s)) return null;
      if (st.landed) break;
    }
    return st;
  };
  const bare = (c) => {
    const p = plateOf(null, 1, 0, {});
    const o = p.o, sg = p.sigma;
    p.c = c; p.m = sg * c; p.I = p.m * c * c / 12;
    p.m22 = 0.25 * Math.PI * o.rhoF * c * c;
    p.Ia = Math.PI * o.rhoF * c * c * c * c / 128;
    p.Istar = sg / (o.rhoF * c); p.skew = 0.05;
    const AR = Math.max(0.05, 1 / c), arf = o.arCorrect ? AR / (AR + 2) : 1;
    p.AR = AR; p.cT = o.cT * arf; p.cR = o.cR * arf;
    return p;
  };
  const wide = [16.0, 12.0, 8.0].map(c => drop(bare(c), Infinity));
  const narrow = [0.26, 0.18, 0.12].map(c => drop(bare(c), Infinity));
  ok(wide.every(Boolean) && narrow.every(Boolean),
    'the integrator stays finite across the whole range of chords');
  if (wide.every(Boolean) && narrow.every(Boolean)) {
    const wr = wide.map(fallRegime), nr = narrow.map(fallRegime);
    ok(!wr.includes('tumble'), 'a broad plate does not tumble', wr.join(' '));
    ok(nr.every(r => r === 'tumble'), 'a narrow plate does', nr.join(' '));
  }

  // The fall has to be worth its cost: if every blade a real specimen grows lands
  // on the same behaviour, this is an expensive way to have one constant.
  const P = new Plant(DEFAULT_PRM, MERISTEM_DEFAULTS, undefined, 21);
  for (let i = 0; i < 5200; i++) P.step(1);
  const organs = P.axes.flatMap(a => a.organs).filter(o => !o.floral && o.leaf && o.len > 0);
  ok(organs.length > 0, 'the specimen grew blades that could fall', `${organs.length}`);

  let baseY = Infinity;
  for (const o of organs) if (o.frame.o[1] < baseY) baseY = o.frame.o[1];
  const seen = {};
  let landed = 0, bad = 0;
  for (const o of organs) {
    const h = Math.max(0.2, o.frame.o[1] - baseY);
    const st = drop(plateOf(o.leaf, drawnBladeLen(o.len, 1), 1, undefined), h);
    if (!st) { bad++; continue; }
    if (st.landed) landed++;
    const r = fallRegime(st);
    seen[r] = (seen[r] || 0) + 1;
  }
  ok(bad === 0, 'every real blade integrates to a finite trajectory', `${bad} bad`);
  ok(Object.keys(seen).length > 1,
    'real blades do not all fall the same way',
    Object.entries(seen).map(([k, v]) => `${k}:${v}`).join(' '));
  ok(landed > organs.length * 0.4, 'most blades reach the ground before they fade',
    `${landed} of ${organs.length}`);

  // And the handover: a plant that has started shedding has handed its blades to
  // the aerodynamics. This is the wiring check — the gate cannot see the scene, but
  // it can see that `Plant` starts and steps a fall, because the first version of
  // this stepped it in the renderer and it ran at frame rate instead of plant time.
  // 8000 rather than 6000: the DEFAULT parameter set is slower through the arc than
  // any of the species presets and does not shed its first blade until about 7000.
  const Q = new Plant(DEFAULT_PRM, MERISTEM_DEFAULTS, undefined, 21);
  for (let i = 0; i < 8000; i++) Q.step(1);
  const shed = Q.axes.flatMap(a => a.organs).filter(o => o.shed && o.leaf);
  ok(shed.length > 0, 'the specimen got far enough to shed something', `${shed.length}`);
  ok(shed.every(o => o.fall), 'every shed blade was handed to the aerodynamics');
  ok(shed.some(o => o.fall && o.fall.t > 0), 'and the plant is stepping those falls');
  ok(shed.every(o => o.fall && Number.isFinite(o.fall.y) && Number.isFinite(o.fall.th)),
    'with finite state throughout');
  ok(shed.every(o => o.fallFrom && o.fallAxis),
    'and each kept the frame it let go from');
}

section('one air');
{
  // ROADMAP 7 step 1: a single wind field read by both the simulation and the
  // shader. Nothing reads it yet, so what gates is the part that would be silently
  // wrong — that the field is a flow at all, and that the GLSL carries the same
  // numbers the JS sums. `test/wind.mjs` prints the physics; `tools/wind_check.mjs`
  // measures the two arithmetics against each other on a real GPU, which this gate
  // cannot do because it has no browser.
  const f = windField();
  const u = [0, 0, 0];
  let bad = 0;
  for (let i = 0; i < 200; i++) {
    windAt(u, f, (i * 7.3) % 40 - 20, (i * 3.1) % 26 - 1, (i * 11.7) % 40 - 20, i * 47);
    if (!u.every(Number.isFinite)) bad++;
  }
  ok(bad === 0, 'the field is finite everywhere, including below the ground', `${bad} bad`);

  // Divergence-free, which is exact by construction: every gust mode is polarised
  // perpendicular to its own wavevector and the mean flow is horizontal and depends
  // only on height. A field with sources in it pumps energy into whatever reads it.
  const kMax = f.modes.reduce((s, m) => Math.max(s, m.kmag), 1);
  const h = 0.02 / kMax, u0 = [0, 0, 0], u1 = [0, 0, 0];
  let worst = 0;
  for (let i = 0; i < 120; i++) {
    const p0 = [(i * 5.1) % 30 - 15, (i * 2.7) % 24, (i * 9.3) % 30 - 15], t = i * 61;
    let div = 0;
    for (let ax = 0; ax < 3; ax++) {
      const p = p0.slice();
      p[ax] -= h; windAt(u0, f, p[0], p[1], p[2], t);
      p[ax] += 2 * h; windAt(u1, f, p[0], p[1], p[2], t);
      div += (u1[ax] - u0[ax]) / (2 * h);
    }
    worst = Math.max(worst, Math.abs(div) / (f.sigmaW * kMax));
  }
  ok(worst < 1e-4, 'and divergence-free', worst.toExponential(2));

  // IS IT WEATHER, OR IS IT A VIBRATION? This is the check that did not exist when the
  // field shipped with the vertical component's integral length scale applied to the
  // streamwise one, which put every gust mode between 3.9 and 19.3 Hz. Everything else
  // in this section passed at the time: the field was finite, divergence-free to 1e-6,
  // gust rms within 0.1% of `2.5 u*`, and byte-identical to its own shader. It was
  // internally consistent and it was not wind, and a person watching said so.
  //
  // Near the ground, the energy-containing eddies are metres across and are carried
  // past at a few metres per second, so weather happens at fractions of a hertz to a
  // few hertz. 3 Hz is a generous ceiling: the shipped field's fastest mode is 1.8 and
  // the force-3 version's was 2.9. Anything above this is not a scene that is too
  // gusty, it is a spectrum whose length scales are wrong.
  const fast = f.modes
    .map(m => Math.abs(m.om) * WORLD.ptPerSec / (2 * Math.PI))
    .filter(hz => hz > 3);
  ok(fast.length === 0, 'and slow enough to be weather rather than vibration',
    fast.length ? `${fast.length} modes above 3 Hz, worst ${Math.max(...fast).toFixed(1)}` : '');

  // The weather is the one number in the mechanics that is a composition choice, so it
  // is the one that can be changed without a measurement to justify it — which makes it
  // the one worth pinning to its citation. Beaufort force 2 is "wind felt on the face;
  // leaves rustle". Force 1 is "leaves do not move" and shipped once, correctly
  // invisible; force 3 is "leaves and small twigs in CONSTANT motion" and shipped once,
  // too busy for a close study of one specimen. If this fails, SCIENCE.md, TUNING.md and
  // CLAUDE.md all describe a scene the piece is no longer standing in.
  ok(WIND_DEFAULTS.uRef >= 1.6 && WIND_DEFAULTS.uRef <= 3.3,
    'the shipped weather is the Beaufort force 2 the docs cite', WIND_DEFAULTS.uRef);

  // A dead calm has to be exactly nothing, not nearly nothing: `uRef: 0` is how a
  // still scene is expressed, and a field that trembled at zero wind would be the
  // old decorative sway wearing a physical name.
  const calm = windField({ uRef: 0 });
  let stir = 0;
  for (let i = 0; i < 60; i++) {
    windAt(u, calm, i * 3.7 - 40, (i * 1.9) % 24, i * 2.3 - 30, i * 41);
    stir = Math.max(stir, Math.abs(u[0]), Math.abs(u[1]), Math.abs(u[2]));
  }
  ok(stir === 0, 'still air is identically zero', stir);

  // "Defined once" is the entire point of the file, so the round trip through the
  // emitter is a structural invariant, not a nicety. The sign trap that this caught
  // when it was first written is written up in the emitter.
  const src = windGLSL(f);
  const g = windGLSLNumbers(src);
  const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-8 + 1e-12;
  let off = 0;
  if (g.modes.length !== f.modes.length) off += 100;
  if (!near(g.invZ0, f.invZ0) || !near(g.invLnRef, f.invLnRef)) off++;
  if (![0, 1, 2].every(i => near(g.uMean[i], f.uMean[i]))) off++;
  g.modes.forEach((m, i) => {
    const b = f.modes[i];
    for (let j = 0; j < 3; j++) if (!near(m.a[j], b.a[j]) || !near(m.k[j], b.k[j])) off++;
    if (!near(m.om, b.om) || !near(m.ph, b.ph)) off++;
  });
  ok(off === 0, 'the emitted GLSL is the same field the simulation sums', `${off} off`);
  ok(!/--/.test(src) && !/vec3\(\s*-?\d+\s*[,)]/.test(src),
    'and it is GLSL a compiler will accept');

  // The fall reads the world's scales and the density of air out of `WORLD` now.
  // If that spread is ever dropped, `plateOf` gets `undefined` for gravity and
  // every fall becomes NaN — which the section above would catch, but not say why.
  ok(['unitM', 'ptPerSec', 'gEarth', 'rhoAir'].every(k => FALL_DEFAULTS[k] === WORLD[k]),
    'the fall and the wind share one set of world constants');
}

// ---------------------------------------------------------------------------

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
