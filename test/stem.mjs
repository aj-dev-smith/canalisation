// DOES THE STEM BEND LIKE A BEAM?
//
//   node test/stem.mjs                    # every species
//   node test/stem.mjs 'Cathedral Fern'   # one
//
// ROADMAP 7 step 3 says: "Axes as damped cantilevers off `E` and `ax.radii`. Check
// measured frequencies against the table above; if they disagree, the solver is wrong,
// and that is a genuinely valuable check to have precomputed."
//
// So that is what this is. The pre-flight computed, analytically and before any solver
// existed, that `EI ∝ r⁴` on the radii the plant already grows puts seven of eight
// species at 0.5-4.6 Hz off one material constant. This grows each species, kicks its
// main axis in still air, and counts the ringdown. **This section can fail**, like
// `test/fall.mjs`'s first: a solver that does not reproduce a frequency somebody worked
// out on paper beforehand is not a beam, and nothing else it does would mean anything.
//
// The rest prints rather than judging: how far the wind actually pushes each species,
// and whether the answer has converged in the number of stations — which is the only
// thing that makes `stations` a resolution rather than a dial.

import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { STEM_DEFAULTS, stemScales, cantileverHz } from '../src/39a_stem.js';
import { WORLD, windField } from '../src/37_wind.js';
import { v3, v3len, v3sub } from '../src/00_math.js';

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 6000);
const DEG = 180 / Math.PI;
const calm = windField({ uRef: 0 });
let failures = 0, checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (cond) return;
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}

function grow(name, opts) {
  const S = SPECIES[name];
  const sp = { ...SPECIES_DEFAULTS, ...S.sp, ...(opts || {}) };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  const P = new Plant({ ...DEFAULT_PRM, ...S.prm }, { ...MERISTEM_DEFAULTS, ...S.mo }, sp, 21);
  for (let i = 0; i < STEPS; i++) P.step(1);
  return P;
}

// Kick the axis and count the ringdown. Still air, so there is no forcing and the only
// thing acting is the beam's own stiffness against its own inertia — which is exactly
// what a natural frequency is.
function ringdown(a, kick = 0.05) {
  const b = a.bend;
  if (!b.live) return null;
  // Kick it in the shape of its own first mode, which the solver already computed. A
  // uniform kick excites every mode the mesh carries, and then a zero-crossing count
  // reports the mixture — which is how an earlier version of this produced a "frequency"
  // that wandered from 1.5 to 1.9 Hz with the station count while the eigenvalue behind
  // it sat at 1.26 the whole time.
  for (let j = 0; j < b.n; j++) {
    const w = b.mode && b.mode.length === b.n ? b.mode[j] : 1;
    b.st[j].th[0] = kick * w; b.st[j].th[1] = 0; b.st[j].th[2] = 0;
    b.st[j].om[0] = b.st[j].om[1] = b.st[j].om[2] = 0;
  }
  // Long enough to hold several periods of the mode being measured, and no longer.
  // With zeta 0.1 the amplitude is down to a thousandth of the kick after ten periods,
  // and counting crossings past that point measures float noise — which is exactly what
  // an earlier version did, and it reported a frequency that wandered with the station
  // count while the solver's own eigenvalue sat still.
  const span = Math.max(200, Math.ceil(6 * (2 * Math.PI / Math.max(1e-6, b.w1)) / 0.25));
  const trace = [];
  for (let i = 0; i < span; i++) {
    b.step(0.25, calm, i * 0.25, WORLD);
    trace.push(b.st[0].th[0]);
  }
  // Zero crossings of the base station's rotation, two per period — but only over the
  // LATER part of the trace. A uniform kick excites every mode the mesh carries, and
  // the more stations there are the more of them there are to excite; measuring across
  // the transient reads a mixture and reports it as a frequency. It did exactly that:
  // the answer sat at 1.53 Hz for 4 through 12 stations and jumped to 1.87 at 16, which
  // looked like a solver that had not converged and was a measurement that had not
  // waited. A ringdown settles into its first mode; measure it there.
  // Skip the opening transient — a uniform kick excites every mode the mesh carries —
  // and stop once the signal has decayed into the noise.
  const from = Math.floor(trace.length * 0.04);
  let until = trace.length - 1;
  while (until > from && Math.abs(trace[until]) < kick * 0.02) until--;
  let cross = 0, first = -1, last = -1;
  for (let i = from + 1; i <= until; i++) {
    if ((trace[i - 1] <= 0) !== (trace[i] <= 0)) {
      if (first < 0) first = i; else last = i;
      cross++;
    }
  }
  if (cross < 3 || last < 0) return { hz: 0, decay: 0, cross };
  const periods = (cross - 1) / 2;
  const dtPt = (last - first) * 0.25;
  const hz = periods / (dtPt / WORLD.ptPerSec);
  // amplitude decay over the measured span, as a damping ratio
  let a0 = 0, a1 = 0;
  for (let i = first; i < first + 40 && i < trace.length; i++) a0 = Math.max(a0, Math.abs(trace[i]));
  for (let i = last - 40; i < last; i++) if (i > 0) a1 = Math.max(a1, Math.abs(trace[i]));
  const zeta = a1 > 0 && a0 > 0
    ? Math.log(a0 / a1) / (2 * Math.PI * periods) : 1;
  return { hz, zeta, cross };
}

function tipSway(P, name, uRef) {
  P.wind = windField({ uRef });
  const a = P.main;
  // start from the shape it grew into, not from wherever the last measurement left it
  for (let j = 0; j < a.bend.n; j++) {
    a.bend.st[j].th[0] = a.bend.st[j].th[1] = a.bend.st[j].th[2] = 0;
    a.bend.st[j].om[0] = a.bend.st[j].om[1] = a.bend.st[j].om[2] = 0;
  }
  const rest = a.rest ? a.rest[a.rest.length - 1] : null;
  if (!rest) return null;
  let peak = 0, sum = 0, n = 0, hit = 0;
  for (let i = 0; i < 1500; i++) {
    P.step(1);
    if (i < 300) continue;                 // let the transient go
    const d = a.bend.tipOffset(a.rest[a.rest.length - 1]);
    peak = Math.max(peak, d); sum += d; n++;
    for (let j = 0; j < a.bend.n; j++) {
      if (v3len(a.bend.st[j].th) >= a.bend.o.maxTilt - 1e-6) hit++;
    }
  }
  return { mean: sum / n, peak, hit, L: a.bend.L };
}

const names = only ? [only] : Object.keys(SPECIES);

// --- 1. the frequency, against the number computed before the solver existed ------

console.log('=== 1. RINGDOWN: does it match the pre-flight? ===');
console.log('  A kick in still air, and the beam rings at its own frequency. `analytic`');
console.log('  is the pre-flight table: the UNIFORM-cantilever formula on the base');
console.log('  radius. The solver is tapered, and taper RAISES the first mode — it');
console.log('  removes mass from the tip, where the modal displacement is largest,');
console.log('  faster than it removes stiffness — by about 1.5-1.6x for a strong taper.');
console.log('  So measured above analytic is expected; measured far below it would mean');
console.log('  the beam had gone soft, and either way the absolute number has to land in');
console.log('  the 0.5-4.6 Hz the pre-flight predicted for these radii.\n');
console.log('  species                 L(m)   r(mm)   analytic   mode1   ringdown   ratio   zeta');
const grown = {};
for (const name of names) {
  const P = grown[name] = grow(name);
  const a = P.main;
  const S = stemScales(STEM_DEFAULTS, WORLD);
  a.tagOrgansForBend({ ...S, sigma: 1.6 });
  a.bend.sync(a.rest, a.radii, a.rest.length, a.organs, { ...S, sigma: 1.6 });
  const r = ringdown(a);
  if (!r) { console.log(`  ${name.padEnd(22)} too short to bend`); continue; }
  const L = a.bend.L * WORLD.unitM;
  const rBase = a.bend.st[0].r * WORLD.unitM;
  const an = cantileverHz(rBase, L);
  const eig = a.bend.w1 * WORLD.ptPerSec / (2 * Math.PI);
  const ratio = an > 0 ? eig / an : 0;
  console.log(`  ${name.padEnd(22)} ${L.toFixed(2).padStart(5)}  ${(rBase * 1000).toFixed(1).padStart(6)}`
    + `   ${an.toFixed(2).padStart(8)}   ${eig.toFixed(2).padStart(6)}`
    + `   ${r.hz.toFixed(2).padStart(8)}   ${ratio.toFixed(2).padStart(5)}   ${(r.zeta || 0).toFixed(3)}`);
  // The integrator has to reproduce the mode the matrices say it has. These are two
  // independent computations — an eigenvalue and a stopwatch — and if they disagree the
  // solver is not integrating the system it assembled.
  ok(Math.abs(r.hz / Math.max(1e-9, eig) - 1) < 0.25,
    `${name}: the ringdown matches the solver's own first mode`,
    `${r.hz.toFixed(2)} vs ${eig.toFixed(2)} Hz`);
  ok(eig > 0.05 && eig < 60, `${name}: rings at a plant-like frequency`, eig.toFixed(2));
  ok(ratio > 0.5 && ratio < 2.2,
    `${name}: within reach of the analytic cantilever, allowing for taper`,
    ratio.toFixed(2));
  ok(r.zeta > 0.02 && r.zeta < 0.9, `${name}: the ringdown actually decays`, (r.zeta || 0).toFixed(3));
}

// --- 2. how far does the wind actually move it? -----------------------------------

console.log('\n=== 2. SWAY: how far does a force 3 push each species? ===');
console.log('  Tip displacement from the shape it grew into, in world units and as an');
console.log('  angle at the base. Prints; a number here is a judgement, not a fact.\n');
console.log('  species                calm    force2   force3   force4   tip angle f3');
for (const name of names) {
  const P = grown[name] || (grown[name] = grow(name));
  const row = [];
  for (const u of [0, 2, 4, 8]) row.push(tipSway(P, name, u));
  if (!row[0]) { console.log(`  ${name.padEnd(22)} —`); continue; }
  const ang = Math.atan2(row[2].peak, row[2].L) * DEG;
  console.log(`  ${name.padEnd(22)} ${row.map(r => r.peak.toFixed(2).padStart(6)).join('  ')}`
    + `   ${ang.toFixed(1).padStart(6)}°`);
  // Not exactly zero: `Plant.stepBend` stops stepping once every station is below its
  // quiescence threshold, so a calm scene settles to a residual rather than to a hard
  // zero. 1e-4 world units is six microns on a metre-tall plant.
  ok(row[0].peak < 1e-4, `${name}: dead calm settles the stem`, row[0].peak);
  ok(row[2].peak > row[1].peak, `${name}: harder wind moves it further`);
  ok(row.every(r => Number.isFinite(r.peak)), `${name}: the deflection stays finite`);
  ok(row[2].hit === 0, `${name}: force 3 does not reach the stop`, row[2].hit);
}

// --- 3. is `stations` a resolution or a dial? --------------------------------------

if (!only) {
  console.log('\n=== 3. CONVERGENCE: is `stations` a resolution? ===');
  console.log('  The measured frequency against the number of stations. If it is still');
  console.log('  moving at the shipped value, it is a dial and the answer is arbitrary.\n');
  const name = 'Cathedral Fern';
  const out = [];
  console.log('    stations   mode1     ringdown');
  for (const m of [4, 6, 8, 12, 16, 24]) {
    const P = grow(name, { stemOpts: { stations: m } });
    const a = P.main;
    const S = stemScales(STEM_DEFAULTS, WORLD);
    a.tagOrgansForBend({ ...S, sigma: 1.6 });
    a.bend.sync(a.rest, a.radii, a.rest.length, a.organs, { ...S, sigma: 1.6 });
    const eig = a.bend.w1 * WORLD.ptPerSec / (2 * Math.PI);
    const r = ringdown(a);
    out.push({ m, eig, hz: r ? r.hz : 0 });
    console.log(`      ${String(m).padStart(6)}   ${eig.toFixed(3)} Hz   ${(r ? r.hz : 0).toFixed(3)} Hz`);
  }
  const lo = Math.min(...out.map(o => o.eig)), hi = Math.max(...out.map(o => o.eig));
  const drift = (hi - lo) / Math.max(1e-9, lo);
  console.log(`    across 4 to 24 stations the first mode moves by ${(drift * 100).toFixed(1)}%`);
  ok(drift < 0.05, 'the first mode has converged in the number of stations',
    `${(drift * 100).toFixed(1)}%`);
}

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
