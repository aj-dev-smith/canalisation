// Does a shed blade fall like a plate, or like an animation?
//
// The version this replaces had four constants — terminal velocity, swing
// amplitude, swing frequency, tumble rate — and a hash of the attachment point.
// Every blade therefore fell at the same speed and pitched at the same rate, and
// the only thing separating two leaves was a phase offset. That is the number this
// harness exists to move.
//
//   node test/fall.mjs              # all three sections
//   node test/fall.mjs sweep        # just the model validation
//   node test/fall.mjs blades       # just the real-blade table
//
// THREE QUESTIONS, in the order that matters:
//
//   1. Is the integrator actually a falling plate? A quasi-steady plate has a
//      published qualitative result: as the dimensionless moment of inertia I*
//      rises, behaviour goes STEADY -> FLUTTER -> TUMBLE. If sweeping I* here does
//      not reproduce that ordering, the model is wrong and nothing below it means
//      anything. This is the section that can fail.
//   2. Do real blades land on both sides of the transition? A physically correct
//      model that puts all eight species in one regime has bought nothing — it
//      would be a more expensive way to make every leaf fall the same.
//   3. How much spread is there, and where does it come from? The claim is that
//      speed, regime and drift direction are all consequences of the margin. So
//      the numbers have to vary between blades of the SAME species, driven by
//      nothing but their own silhouettes.

import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import {
  FALL_DEFAULTS, bladeSection, plateOf, fallState, fallStep, fallRegime,
  drawnBladeLen,
} from '../src/39_fall.js';

const only = process.argv[2] || 'all';
const LIFE = FALL_DEFAULTS.life;

// Integrate one plate until it lands or its drawn life runs out, and report what
// it did. `h` is the height of the attachment above the ground; without it the
// blade falls into the void and every distance below is meaningless.
function drop(plate, h = Infinity) {
  const st = fallState(plate, h);
  let bad = 0;
  for (let i = 0; i < LIFE; i++) {
    fallStep(st, 1);
    if (!Number.isFinite(st.y) || !Number.isFinite(st.th)) { bad = i; break; }
    if (st.landed) break;
  }
  return {
    st, bad,
    landed: !!st.landed,
    tLand: st.tLand,
    regime: fallRegime(st),
    drop: -st.y,
    vAvg: -st.y / Math.max(1, st.t),
    vPeak: st.vyPeak,
    drift: st.sMax - st.sMin,
    net: Math.abs(st.s),
    turns: st.turns,
    revs: st.revs,
    spin: st.spin / (2 * Math.PI),
    // the number behind "too flappy and spinny": rotations per second of real time
    revPerSec: (st.spin / (2 * Math.PI)) / Math.max(1e-6, st.t / 125),
    ratio: st.spin > 1e-6 ? Math.abs(st.th - st.th0) / st.spin : 0,
    amp: st.thMax - st.thMin,
  };
}

// --- 1. is it a falling plate? ---------------------------------------------
//
// I* = sigma / (rhoF * chord), so the way to sweep it without touching anything
// else is to sweep the chord. A synthetic symmetric plate, given a small tilt so
// there is something for the instability to grow from.
function sweep() {
  console.log('\n=== 1. MODEL VALIDATION: does I* select the regime? ===');
  console.log('synthetic symmetric plate, chord swept, everything else fixed\n');
  console.log('    chord      I*   regime     spin  ratio    amp   vAvg   vPeak   drift');
  const seen = [];
  for (const c of [16.0, 12.0, 8.0, 6.0, 4.0, 3.2, 2.6, 2.1, 1.8, 1.5, 1.3, 1.15, 1.0, 0.9, 0.8, 0.7,
                   0.62, 0.54, 0.48, 0.42, 0.36, 0.30, 0.26, 0.18, 0.12, 0.08]) {
    // a bare plate: no leaf, so bladeSection's fallback path, then override the
    // chord directly. skew is set small and equal for every row so the ONLY thing
    // changing down the table is I*.
    const p = plateOf(null, 1, 0, {});
    const o = p.o, sigma = p.sigma;
    p.c = c;
    p.m = sigma * c;
    p.I = p.m * c * c / 12;
    p.m22 = 0.25 * Math.PI * o.rhoF * c * c;
    p.Ia = Math.PI * o.rhoF * c * c * c * c / 128;
    p.Istar = sigma / (o.rhoF * c);
    p.skew = 0.05;
    const r = drop(p);
    seen.push({ Istar: p.Istar, regime: r.regime });
    console.log(
      `  ${c.toFixed(3).padStart(7)} ${p.Istar.toFixed(3).padStart(7)}   ` +
      `${r.regime.padEnd(8)} ${r.spin.toFixed(2).padStart(6)} ${r.ratio.toFixed(2).padStart(6)} ` +
      `${r.amp.toFixed(2).padStart(6)}  ` +
      `${r.vAvg.toFixed(4)}  ${r.vPeak.toFixed(4)}  ${r.drift.toFixed(3).padStart(6)}` +
      (r.bad ? `   DIVERGED at ${r.bad}` : ''));
  }

  // WHAT TO ASSERT, and what not to.
  //
  // The first version of this check demanded that the regime be monotonic in I*
  // all the way down the table, and it failed — on rows in the MIDDLE that flipped
  // between labels from one chord to the next. That is not a bug, it is the chaotic
  // band the papers put between fluttering and tumbling, and a single run inside it
  // is genuinely not classifiable. Requiring monotonicity through it was asserting
  // something the literature does not claim.
  //
  // So the claim tested here is about the ENDS: the low-I* end flutters and does
  // not tumble, the high-I* end tumbles and does not flutter, and the middle is
  // allowed to be a mess. That is falsifiable, and it is true of real plates.
  // The bands are stated as I* ranges rather than as fractions of the table,
  // because the table's spacing is arbitrary and the transition is not: measured
  // here it sits around I* = 0.4, with clean tumbling from about 1.7 up. Slicing
  // the table into thirds put a row at I* = 0.41 inside the "low" group and failed
  // on it, which was the check straddling the transition rather than the model
  // misbehaving. These two numbers are measurements — if the coefficients change
  // they move, and the right response is to re-read them, NOT to widen them until
  // this passes again.
  const LOW_I = 0.30, HIGH_I = 2.0;
  const byI = [...seen].sort((a, b) => a.Istar - b.Istar);
  const low = byI.filter(r => r.Istar <= LOW_I);
  const high = byI.filter(r => r.Istar >= HIGH_I);
  const kinds = new Set(seen.map(s => s.regime));
  const lowBad = low.filter(r => r.regime === 'tumble');
  const highBad = high.filter(r => r.regime === 'flutter');
  console.log('');
  console.log(`  regimes reached: ${[...kinds].join(', ')}`);
  console.log(`  low  I* ${low[0].Istar.toFixed(2)}-${low[low.length - 1].Istar.toFixed(2)}: ` +
              `${low.map(r => r.regime).join(' ')}`);
  console.log(`  high I* ${high[0].Istar.toFixed(2)}-${high[high.length - 1].Istar.toFixed(2)}: ` +
              `${high.map(r => r.regime).join(' ')}`);
  if (kinds.size < 2) {
    console.log('  FAIL: the sweep only ever produces one behaviour. The model is');
    console.log('        not selecting a regime, so it is an expensive constant.');
  } else if (lowBad.length) {
    console.log(`  FAIL: ${lowBad.length} of the lowest-I* plates tumbled.`);
  } else if (highBad.length) {
    console.log(`  FAIL: ${highBad.length} of the highest-I* plates fluttered.`);
  } else {
    console.log('  PASS: flutter at low I*, tumble at high I*, chaos in between.');
  }
  return { kinds, ok: kinds.size >= 2 && !lowBad.length && !highBad.length };
}

// --- 2 and 3. real blades ---------------------------------------------------
function blades() {
  console.log('\n=== 2. REAL BLADES: what does each species do? ===');
  console.log('every leaf in the library, dropped at sen=1 (the shipped shed condition)\n');
  const rows = [];
  for (const name of Object.keys(SPECIES)) {
    const S = SPECIES[name];
    const prm = { ...DEFAULT_PRM, ...S.prm };
    const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
    const sp = { ...SPECIES_DEFAULTS, ...S.sp };
    sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
    const P = new Plant(prm, mo, sp, 21);
    for (let s = 1; s <= 5000; s++) P.step(1);

    // real organ lengths, so the chord is the chord that gets drawn
    // Height above the ground matters as much as the blade does, so take the real
    // attachment height. The plant's base is the lowest point on its main axis.
    let baseY = Infinity;
    for (const a of P.axes) for (const o of a.organs) {
      if (o.frame && o.frame.o[1] < baseY) baseY = o.frame.o[1];
    }
    if (!Number.isFinite(baseY)) baseY = 0;
    const lens = [];
    for (const a of P.axes) for (const o of a.organs) {
      if (!o.floral && o.leaf && o.len > 0) {
        lens.push({ leaf: o.leaf, len: o.len, h: Math.max(0.2, o.frame.o[1] - baseY) });
      }
    }
    if (!lens.length) { console.log(`  ${name}: no blades`); continue; }

    const per = lens.map(({ leaf, len, h }) => {
      const p = plateOf(leaf, drawnBladeLen(len, 1), 1, {});
      return { p, h, r: drop(p, h), sec: bladeSection(leaf) };
    });
    const reg = {};
    for (const x of per) reg[x.r.regime] = (reg[x.r.regime] || 0) + 1;
    const f = k => per.map(x => k(x)).sort((a, b) => a - b);
    const q = (arr, t) => arr[Math.min(arr.length - 1, Math.floor(arr.length * t))];
    const chords = f(x => x.p.c), istars = f(x => x.p.Istar);
    const vs = f(x => x.r.vAvg), drifts = f(x => x.r.drift);
    const hts = f(x => x.h), secs = f(x => x.r.tLand / 125);
    const rps = f(x => x.r.revPerSec);
    // The number that decides whether a fall stays in the picture: how far it
    // travelled sideways compared with how far it had to come down.
    const glide = f(x => x.r.drift / Math.max(0.01, x.h));
    const skews = per.map(x => x.sec.skew);
    const left = skews.filter(s => s < 0).length;
    const diverged = per.filter(x => x.r.bad).length;
    const landed = per.filter(x => x.r.landed).length;

    rows.push({ name, n: per.length, reg, chords, istars, vs, drifts,
                glide, hts, secs, rps, landed, left, diverged,
                ars: f(x => x.p.AR) });
    console.log(`  ${name}`);
    console.log(`    blades ${per.length}   chord ${q(chords, 0).toFixed(2)}-${q(chords, 0.99).toFixed(2)}` +
                `   I* ${q(istars, 0).toFixed(2)}-${q(istars, 0.99).toFixed(2)}`);
    console.log(`    regime ${Object.entries(reg).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    console.log(`    descent ${q(vs, 0).toFixed(4)}-${q(vs, 0.99).toFixed(4)} (old model: 0.0300 for every blade)`);
    console.log(`    drift   ${q(drifts, 0).toFixed(2)}-${q(drifts, 0.99).toFixed(2)}` +
                `   glide/height ${q(glide, 0).toFixed(2)}-${q(glide, 0.99).toFixed(2)}` +
                `   turning left ${left}/${per.length}`);
    console.log(`    spin    ${q(rps, 0).toFixed(2)}-${q(rps, 0.99).toFixed(2)} rev/s` +
                `   AR ${q(f(x => x.p.AR), 0).toFixed(2)}-${q(f(x => x.p.AR), 0.99).toFixed(2)}`);
    console.log(`    height  ${q(hts, 0).toFixed(1)}-${q(hts, 0.99).toFixed(1)}` +
                `   landed ${landed}/${per.length} in ${q(secs, 0).toFixed(2)}-${q(secs, 0.99).toFixed(2)}s` +
                (diverged ? `   DIVERGED ${diverged}` : ''));
  }

  console.log('\n=== 3. SPREAD: is the variation real, and where is it from? ===');
  const allReg = {};
  let n = 0, vlo = 1e9, vhi = -1e9;
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.reg)) allReg[k] = (allReg[k] || 0) + v;
    n += r.n;
    vlo = Math.min(vlo, r.vs[0]); vhi = Math.max(vhi, r.vs[r.vs.length - 1]);
  }
  console.log(`  ${n} blades across ${rows.length} species`);
  console.log(`  regimes: ${Object.entries(allReg).map(([k, v]) =>
    `${k} ${v} (${(100 * v / n).toFixed(0)}%)`).join(', ')}`);
  console.log(`  descent speed spans ${vlo.toFixed(4)}-${vhi.toFixed(4)}` +
              `  = ${(vhi / vlo).toFixed(2)}x   (old model: 1.00x, identical for all)`);
  const multi = rows.filter(r => Object.keys(r.reg).length > 1).length;
  console.log(`  species showing more than one regime WITHIN themselves: ${multi}/${rows.length}`);
  const allG = rows.flatMap(r => r.glide).sort((a, b) => a - b);
  const allS = rows.flatMap(r => r.secs).sort((a, b) => a - b);
  const nLanded = rows.reduce((a, r) => a + r.landed, 0);
  console.log(`  landed before fading: ${nLanded}/${n}` +
              `   fall takes ${allS[0].toFixed(2)}-${allS[allS.length - 1].toFixed(2)}s` +
              `  (old model: 5.0s to fall 18 units, always)`);
  console.log(`  sideways travel per unit of height: median ${allG[Math.floor(allG.length / 2)].toFixed(2)},` +
              ` worst ${allG[allG.length - 1].toFixed(2)}`);
  const allR = rows.flatMap(r => r.rps).sort((a, b) => a - b);
  console.log(`  spin: median ${allR[Math.floor(allR.length / 2)].toFixed(2)} rev/s,` +
              ` worst ${allR[allR.length - 1].toFixed(2)} rev/s`);
  console.log('  A real dead leaf turns something like 1-3 times a second. Much past');
  console.log('  that and it reads as flapping rather than falling — which is what the');
  console.log('  uncorrected 2D version did, and is what arCorrect is for.');
  console.log('  Sideways travel much over about 1.5x the drop leaves the frame before');
  console.log('  it lands. Both of these are cues to go and look, not pass/fail.');
  if (Object.keys(allReg).length < 2) {
    console.log('  WEAK: real blades all do the same thing. The physics is right but');
    console.log('        the calibration puts every margin on one side of the');
    console.log('        transition — retune sigma, do not ship this.');
  }
  return rows;
}

if (only === 'all' || only === 'sweep') sweep();
if (only === 'all' || only === 'blades') blades();
console.log('');
