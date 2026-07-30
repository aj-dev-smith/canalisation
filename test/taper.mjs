// ROADMAP 14: HOW THICK IS A STEM, AND WHAT SETS THE TAPER?
//
// `Axis.updateRadii` sizes every axis by Murray's law -- r^3 proportional to the
// traffic it carries. The 2026-07-30 literature sweep found that law is measured
// with an exception attached:
//
//   "These conduits conform to the Murray's law optimum as long as they do not
//    function additionally as supports for the plant body."
//
//   McCulloh, Sperry & Adler 2003, Water transport in plants obeys Murray's law,
//   Nature 421(6926):939-942. Quote verified verbatim against the paper.
//
// Every axis in this engine holds the plant up. So the exponent is a knob, not a
// constant, and this file sweeps it. The paper's statement of the EXCEPTION is
// verified; the replacement exponent is NOT -- "self-supporting axes revert
// toward r^2, with elastic-similarity arguments near 2.5" is the sweep's reading
// of surrounding literature. Hence a sweep rather than a substitution.
//
// ---------------------------------------------------------------------------
// WHAT THE PRE-FLIGHT FOUND, AND WHERE THE ROADMAP WAS WRONG
//
// ROADMAP 14 says "we are over-tapering every trunk in the garden right now."
// Measured, on the shipped catalogue at 5200 steps, the leader taper r0/rTip is
// 1.33 to 1.63 -- over the WHOLE height. A real 1 m herbaceous stem tapers more
// like 5-8x. The trunks are NEAR-CYLINDERS, so the defect is UNDER-tapering.
//
// The direction of the fix survives and the reason for it does not. Lowering the
// exponent thickens the base relative to the tip, which is what was wanted; but
// it was wanted because the stems are barrels, not because they are spikes.
//
// The cube root is why. Radius answers traffic through a 1/p power, so p = 3
// compresses a 190-fold range of traffic into a 5.7-fold range of radius, and
// then the fruit sink -- a constant added along the whole axis -- lifts the tip
// most of the rest of the way.
//
// ---------------------------------------------------------------------------
// THE CLOSED FORM, WORKED OUT BEFORE THE SOLVER WAS RUN
//
// After the reparameterisation in `updateRadii`, with X(s) the flow in r^3 units,
//
//   r(s) = tipRadius * (1 + X(s)/tipRadius^3)^(1/p) * radiusScale
//
// so for a FIXED grown plant -- same X(s) -- the whole profile is one power law
// in p. Two consequences that this file asserts, because both are arithmetic and
// neither is a fact about biology:
//
//   1. TAPER TRANSFORMS AS A POWER.   taper(p) = taper(3)^(3/p)
//      A stem that tapers 1.54x under Murray tapers 1.54^1.5 = 1.91x at p = 2.
//
//   2. THE PROFILE'S SHAPE IS INVARIANT. log(r(s)/tip) / log(r0/tip) does not
//      depend on p at all. Changing the exponent rescales the log-profile; it
//      cannot bend it. So NO exponent turns these barrels into the profile of a
//      real stem -- only the traffic field X(s) can do that.
//
// (2) is the load-bearing result and it is the reason this file exists rather
// than a one-line commit. It says the exponent is worth moving and is NOT the
// whole answer, and it says so on paper rather than after a day of sweeping.
//
// Assertions here are on the ARITHMETIC. The choice of exponent is not asserted,
// because which exponent is right is a question about plants and the honest
// answer is in TUNING.md with its numbers.
//
//   node test/taper.mjs                 # sweep 3, 2.5, 2
//   node test/taper.mjs 3 2.5 2 1.5     # any exponents
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { STEM_DEFAULTS, cantileverHz } from '../src/39a_stem.js';
import { WORLD } from '../src/37_wind.js';

const G = 9.81;
const E = STEM_DEFAULTS.eModulus;
const RHO = STEM_DEFAULTS.rhoTissue;
const U = WORLD.unitM;
const STEPS = +(process.env.STEPS || 5200);
const SEED = +(process.env.SEED || 21);

const EXPS = process.argv.slice(2).map(Number).filter(x => x > 0);
if (!EXPS.length) EXPS.push(3, 2.5, 2);

let fails = 0;
const check = (name, ok, got, want) => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n         got ${got}   want ${want}`);
};

// Greenhill 1881: the longest a heavy column of radius r can be and still stand.
// The safety factor a real tree carries against this is about 2-5 (Niklas).
const safety = (rM, lM) => 1.959 * Math.cbrt(E * rM * rM / (4 * RHO * G)) / lM;

function grow(name, p) {
  const S = SPECIES[name];
  const sp = { ...S.sp, radiusExp: p };
  const P = new Plant({ ...DEFAULT_PRM, ...S.prm }, { ...MERISTEM_DEFAULTS, ...S.mo }, sp, SEED);
  for (let s = 0; s < STEPS; s++) P.step(1);
  const a = P.axes[0];
  const n = a.radii.length;
  const r0 = a.radii[0], rT = a.radii[n - 1];
  const prof = [];
  for (let j = 0; j <= 20; j++) prof.push(a.radii[Math.min(n - 1, Math.round(j / 20 * (n - 1)))]);
  const lat = P.axes.filter(x => x.gen > 0 && x.length > 0 && x.radii.length > 1);
  return {
    r0, rT, taper: r0 / rT, prof, L: a.length,
    r0M: r0 * U, lM: a.length * U,
    f1: cantileverHz(r0 * U, a.length * U),
    S: safety(r0 * U, a.length * U),
    latTaper: lat.length ? lat.reduce((s, x) => s + x.radii[0] / x.radii[x.radii.length - 1], 0) / lat.length : NaN,
    tip: { ...SPECIES_DEFAULTS, ...S.sp }.tipRadius,
    scale: { ...SPECIES_DEFAULTS, ...S.sp }.radiusScale,
  };
}

const names = Object.keys(SPECIES);
const data = new Map();   // p -> name -> row

console.log(`\n=== ROADMAP 14: the exponent that sizes a stem ===\n`);
console.log(`  Murray r^3 holds only in conduits that do not support the plant (McCulloh 2003).`);
console.log(`  Every axis here supports the plant. E ${E / 1e6} MPa  rho ${RHO} kg/m3  1 unit = ${U} m  seed ${SEED}  steps ${STEPS}\n`);

for (const p of EXPS) {
  const byName = new Map();
  for (const nm of names) byName.set(nm, grow(nm, p));
  data.set(p, byName);
}

// ---------------------------------------------------------------------------
// 1. THE TABLE
// ---------------------------------------------------------------------------
console.log('--- 1. what each exponent grows -------------------------------------------\n');
for (const p of EXPS) {
  const by = data.get(p);
  console.log(`  p = ${p}`);
  console.log(`    species              r0(mm)  rTip(mm)  taper   lat taper   f1(Hz)   Greenhill S   rescale`);
  for (const nm of names) {
    const r = by.get(nm), base = data.get(EXPS[0]).get(nm);
    console.log(`    ${nm.padEnd(20)} ${(r.r0M * 1000).toFixed(2).padStart(6)}  ${(r.rT * U * 1000).toFixed(2).padStart(7)}  ` +
      `${r.taper.toFixed(3).padStart(6)}  ${(r.latTaper || NaN).toFixed(3).padStart(9)}   ` +
      `${r.f1.toFixed(2).padStart(6)}   ${r.S.toFixed(2).padStart(11)}   ${(base.r0 / r.r0).toFixed(3).padStart(6)}x`);
  }
  const mean = (f) => names.reduce((s, nm) => s + f(by.get(nm)), 0) / names.length;
  console.log(`    ${'MEAN'.padEnd(20)} ${(mean(r => r.r0M) * 1000).toFixed(2).padStart(6)}  ${(mean(r => r.rT * U) * 1000).toFixed(2).padStart(7)}  ` +
    `${mean(r => r.taper).toFixed(3).padStart(6)}  ${mean(r => r.latTaper).toFixed(3).padStart(9)}   ` +
    `${mean(r => r.f1).toFixed(2).padStart(6)}   ${mean(r => r.S).toFixed(2).padStart(11)}\n`);
}
console.log(`  "rescale" is the factor radiusScale would need to hold the BASAL radius where`);
console.log(`  p = ${EXPS[0]} put it -- and so to hold EI, and so to hold the sway the stem was tuned for.\n`);

// ---------------------------------------------------------------------------
// 2. THE CLOSED FORM, CHECKED
// ---------------------------------------------------------------------------
console.log('--- 2. does the solver reproduce the closed form? --------------------------\n');
console.log(`  taper(p) = taper(p0)^(p0/p), because r/tip = (1 + X/tip^3)^(1/p) with X fixed.\n`);
const p0 = EXPS[0];
let worstTaper = 0, worstShape = 0;
for (const p of EXPS.slice(1)) {
  for (const nm of names) {
    const a = data.get(p0).get(nm), b = data.get(p).get(nm);
    // the plant is grown independently at each exponent, so X(s) is only the
    // same if radius does not feed back into growth. That it does not is
    // exactly what this comparison tests.
    const want = Math.pow(a.taper, p0 / p);
    const err = Math.abs(b.taper - want) / want;
    worstTaper = Math.max(worstTaper, err);
    // shape invariance: the log-profile, normalised, must not move
    for (let j = 0; j <= 20; j++) {
      const la = Math.log(a.prof[j] / a.scale / a.tip), lb = Math.log(b.prof[j] / b.scale / b.tip);
      const l0a = Math.log(a.r0 / a.scale / a.tip), l0b = Math.log(b.r0 / b.scale / b.tip);
      if (l0a < 1e-9 || l0b < 1e-9) continue;
      worstShape = Math.max(worstShape, Math.abs(la / l0a - lb / l0b));
    }
  }
}
if (EXPS.length > 1) {
  // Tight, deliberately. Growth does not read radius, so two plants grown at
  // different exponents carry an identical traffic field X(s) and the transform
  // is exact arithmetic, not an approximation. A loose tolerance here would have
  // hidden the pose bug in `updateRadii` that this file found: it showed up as a
  // single species missing the closed form by 2.8%.
  check('taper transforms as taper(p0)^(p0/p)', worstTaper < 1e-6,
    `worst relative error ${worstTaper.toExponential(2)}`, '< 1e-6');
  check('the normalised log-profile does not depend on p', worstShape < 1e-9,
    `worst deviation ${worstShape.toExponential(2)}`, '< 1e-9');
  console.log(`\n  The second one is the result. The exponent RESCALES the log-profile and cannot`);
  console.log(`  BEND it, so no exponent turns a barrel into a stem. Only the traffic field X(s)`);
  console.log(`  can do that -- which is a claim about what the plant carries, not about wood.\n`);
}

// ---------------------------------------------------------------------------
// 3. DRAW IT. Four numeric sections agreed with each other while the conifer was
//    the wrong shape and the wrong way up; ten lines of ASCII caught it.
// ---------------------------------------------------------------------------
console.log('--- 3. draw the trunk (half-profile, base at the bottom, 30x exaggerated) --\n');
const W = 46;
const shown = names.slice(0, 3);
for (const nm of shown) {
  console.log(`  ${nm}`);
  const cols = EXPS.map(p => data.get(p).get(nm));
  const big = Math.max(...cols.map(c => c.r0));
  let head = '   ';
  for (const p of EXPS) head += `p=${String(p).padEnd(W / EXPS.length - 4)}`;
  console.log(head);
  for (let row = 20; row >= 0; row--) {
    let line = '   ';
    for (const c of cols) {
      const w = Math.max(1, Math.round(c.prof[row] / big * 12));
      line += ('|' + '#'.repeat(w)).padEnd(Math.floor(W / EXPS.length));
    }
    console.log(line);
  }
  console.log('');
}
console.log(`  Widths share one scale across the exponents in a row, so the panels are`);
console.log(`  comparable. What to look for is not thickness -- radiusScale can buy that --`);
console.log(`  it is whether the edge is a straight line or a curve. It is a straight line`);
console.log(`  at every exponent, which is section 2 restated in pixels.\n`);

// ---------------------------------------------------------------------------
// 4. THE MECHANICAL CHECK, WHICH IS THE ONE THAT DECIDES ANYTHING
// ---------------------------------------------------------------------------
console.log('--- 4. can these stems stand up? -------------------------------------------\n');
console.log(`  Greenhill: L_crit = 1.959 (E r^2 / 4 rho g)^(1/3). Real trees carry S = 2-5.\n`);
for (const p of EXPS) {
  const by = data.get(p);
  const S = names.map(nm => by.get(nm).S).sort((a, b) => a - b);
  const f = names.map(nm => by.get(nm).f1).sort((a, b) => a - b);
  console.log(`    p = ${String(p).padEnd(5)} S ${S[0].toFixed(2)} .. ${S[S.length >> 1].toFixed(2)} .. ${S[S.length - 1].toFixed(2)}` +
    `     f1 ${f[0].toFixed(2)} .. ${f[f.length >> 1].toFixed(2)} .. ${f[f.length - 1].toFixed(2)} Hz`);
}
console.log(`\n  At the shipped exponent the median leader stands at S ~ 1.7 -- within a factor`);
console.log(`  of two of a real tree, which is better than this engine had any right to be,`);
console.log(`  and NOT the thing ROADMAP 14 was worried about. Lowering p raises S by making`);
console.log(`  everything thicker, and raises f1 with it: a stem that cannot fall over does`);
console.log(`  not sway like a plant, which is the trade 39a_stem.js:49-69 already names.\n`);

console.log(fails ? `\n  ${fails} FAILED\n` : '\n  all checks passed\n');
process.exit(fails ? 1 : 0);
