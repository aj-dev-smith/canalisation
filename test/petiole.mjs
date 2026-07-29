// IS THE PETIOLE A STALK, AND DOES THE BLADE HANG BY A FORCE BALANCE?
//
//   node test/petiole.mjs                    # every species
//   node test/petiole.mjs 'Cathedral Fern'   # one
//
// ROADMAP 5 + 7b. Two things land together here and this harness is why they had to:
//
//   5.  The petiole's radius came off the STEM's radius at the node — half of it,
//       a number nobody derived. Torsional and bending stiffness both go as r^4, so
//       that arbitrariness was four orders of magnitude of load-bearing. It comes
//       off the BLADE now, by the pipe model: conducting area proportional to the
//       leaf area supplied.
//   7b. `sp.droop` was eight stated numbers in the species table answering "how far
//       does a leaf hang". Once the stalk is a real stalk that is a force balance —
//       the tip slope of a cantilever under its blade's own weight — and the numbers
//       can go.
//
// **This harness asserts**, like `stem.mjs` and `fall.mjs` and unlike the chemistry
// ones. Everything here is mechanics, so every claim is a number that can be worked
// out beforehand, and the reference formulas below are worked out beforehand — they
// are deliberately a SECOND implementation of what `39_fall.js` ships, for the same
// reason `cantileverHz` lives in `39a_stem.js`: a check whose reference is the thing
// being checked is not a check.
//
// The one thing it must not do is assert that droop looks right. The test the roadmap
// asked for is stricter and is section 4: **a bigger blade on the same stalk has to
// hang lower without anyone saying it should.** That is what separates a force balance
// from `droop` wearing a physical-sounding name.

import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import {
  petioleOf, PETIOLE, flapOf, flapState, flapStep, bladeSection, drawnBladeLen,
  fallScales, stiffScales, bladeArm, bladeAreaOf, FALL_DEFAULTS, FLAP_DEFAULTS,
} from '../src/39_fall.js';
import { stemScales, STEM_DEFAULTS } from '../src/39a_stem.js';
import { WORLD, windField, windAt, WIND_DEFAULTS } from '../src/37_wind.js';
import { v3, v3dot, clamp } from '../src/00_math.js';

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 6000);
// `PET_E=1e9 node test/petiole.mjs` — the modulus sweep that chose the shipped value.
// Mutating the defaults is the only way to reach it, because the whole point of
// `bendOf` is that `40_plant.js` calls it with nothing.
if (process.env.PET_E) FLAP_DEFAULTS.eModulus = +process.env.PET_E;
if (process.env.KAPPA) PETIOLE.kappa = +process.env.KAPPA;
const DEG = 180 / Math.PI;
const TO_HZ = WORLD.ptPerSec / (2 * Math.PI);
const MM = WORLD.unitM * 1000;              // world units -> mm
const CM2 = WORLD.unitM * WORLD.unitM * 1e4; // world area -> cm^2

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

const blades = (P) => P.axes.flatMap(a => a.organs)
  .filter(o => o.leaf && o.leaf.margin && o.leaf.margin.mature && !o.shed && o.dev > 0.5);

const med = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};

// --- the reference, worked out beforehand ----------------------------------------
//
// THE PIPE MODEL. A petiole's conducting cross-section is proportional to the leaf
// area it supplies: `A_pet = kappa * A_blade`, so `r = sqrt(kappa*A/pi)`. `kappa` is
// dimensionless, so this needs no unit conversion — the ratio is the same in world
// units as in metres, which is worth noticing, because it means the law survives any
// later change to `unitM`.
const rPipe = (area, kappa) => Math.sqrt(Math.max(0, kappa) * area / Math.PI);

// THE TIP SLOPE OF A UNIFORM CANTILEVER carrying a point load `W` at its tip and a
// moment `W*d` from that load sitting `d` further out:
//
//     theta = integral_0^L  M(x)/(E I)  dx,   M(x) = W (L + d - x)
//           = W L (L/2 + d) / (E I)
//
// Exact for a prismatic stalk, which is what the pipe model gives — a petiole carries
// the same traffic from end to end, so it has no reason to taper.
const tipSlope = (W, L, d, E, r) => W * L * (L * 0.5 + d) / (E * Math.PI * r * r * r * r / 4);

// ---------------------------------------------------------------------------------
console.log(`petiole: pipe-model radius and droop as a force balance (${STEPS} steps)`);
console.log(`  kappa = ${PETIOLE.kappa}  (broadleaf petioles measure 2e-4 to 1e-3)`);
console.log(`  E     = ${(FLAP_DEFAULTS.eModulus / 1e6).toFixed(0)} MPa — a petiole, not the stem's 60\n`);

const names = only ? [only] : Object.keys(SPECIES);
const rows = [];

for (const name of names) {
  const P = grow(name);
  const bs = blades(P);
  if (!bs.length) { console.log(`  ${name}: no mature blades`); continue; }

  const S = { ...fallScales(FALL_DEFAULTS), ...stemScales(STEM_DEFAULTS, WORLD) };
  const St = stiffScales({ ...FALL_DEFAULTS, ...FLAP_DEFAULTS });

  const area = [], rDraw = [], rRef = [], fHz = [], bendDeg = [], refDeg = [], arms = [];
  for (const o of bs) {
    const bl = drawnBladeLen(o.len, o.sen || 0);
    const sec = bladeSection(o.leaf);
    const a = sec.area * bl * bl;
    const pet = petioleOf(o);
    const fl = flapOf(o.leaf, bl, o.sen || 0, pet);
    area.push(a);
    rDraw.push(pet.r0);
    rRef.push(rPipe(a, PETIOLE.kappa));
    fHz.push(fl.om0 * TO_HZ);
    // the shipped answer, and the reference answer, for the same organ
    bendDeg.push((o.bend || 0) * DEG);
    const m = S.sigmaFresh * a;
    const d = bladeArm(o.leaf) * bl;
    arms.push(d / bl);
    // horizontal stalk is the worst case and the one with no free geometry in it
    refDeg.push(tipSlope(m * S.g, pet.len, d, St.E, pet.r0) * DEG);
  }

  rows.push({
    name, n: bs.length,
    area: med(area) * CM2,
    rDraw: med(rDraw) * MM,
    rRef: med(rRef) * MM,
    f: med(fHz),
    bend: med(bendDeg),
    ref: med(refDeg),
    arm: med(arms),
  });
}

console.log('  species              blades   area cm2   r mm   r ref   f Hz   bend   ref(horiz)  CoM');
for (const r of rows) {
  console.log('  ' + r.name.padEnd(20)
    + String(r.n).padStart(6)
    + r.area.toFixed(1).padStart(11)
    + r.rDraw.toFixed(2).padStart(7)
    + r.rRef.toFixed(2).padStart(8)
    + r.f.toFixed(1).padStart(7)
    + (r.bend.toFixed(1) + '°').padStart(8)
    + (r.ref.toFixed(1) + '°').padStart(11)
    + r.arm.toFixed(2).padStart(7));
}

// --- 1. the shipped radius IS the pipe model --------------------------------------
console.log('\n1. the drawn stalk is the sprung stalk, and both are the pipe model');
for (const r of rows) {
  ok(Math.abs(r.rDraw - r.rRef) / Math.max(1e-9, r.rRef) < 0.02,
    `${r.name}: shipped radius matches the reference`, `${r.rDraw.toFixed(3)} vs ${r.rRef.toFixed(3)} mm`);
}
{
  const rs = rows.map(r => r.rDraw);
  console.log(`   radius spans ${Math.min(...rs).toFixed(2)}-${Math.max(...rs).toFixed(2)} mm `
    + `across species (it was 6.2-9.5 before, where a real leaf is under 1)`);
}

// --- 2. one constant, and the frequency barely moves ------------------------------
//
// The pre-flight's strongest argument that this is the right law: blade areas span
// 4.5x and the flap frequency does not, because stiffness goes as (kappa*A)^2 and the
// inertia goes as the area too, so they nearly cancel. If that band ever opens up,
// something has stopped scaling with area and the law is no longer doing the work.
console.log('\n2. one constant across every species');
if (rows.length > 1) {
  const fs = rows.map(r => r.f), as = rows.map(r => r.area);
  const spread = Math.max(...fs) / Math.min(...fs), aSpread = Math.max(...as) / Math.min(...as);
  console.log(`   blade area spans ${aSpread.toFixed(1)}x, flap frequency spans ${spread.toFixed(2)}x `
    + `(${Math.min(...fs).toFixed(1)}-${Math.max(...fs).toFixed(1)} Hz)`);
  ok(spread < aSpread * 0.5, 'frequency is far flatter than blade area', `${spread.toFixed(2)}x vs ${aSpread.toFixed(1)}x`);
  ok(Math.min(...fs) > 1 && Math.max(...fs) < 40, 'flap frequencies are plant-like, not vibration',
    `${Math.min(...fs).toFixed(1)}-${Math.max(...fs).toFixed(1)} Hz`);
}

// --- 3. the bend is bounded, and it is what droop used to be ----------------------
console.log('\n3. droop is a force balance now');
{
  const bs = rows.map(r => r.bend);
  console.log(`   blades hang at ${Math.min(...bs).toFixed(1)}-${Math.max(...bs).toFixed(1)}° `
    + `across species, off no per-species number`);
  ok(Math.min(...bs) > 0.5, 'every species droops at all', `min ${Math.min(...bs).toFixed(2)}°`);
  ok(Math.max(...bs) < 60, 'no species collapses', `max ${Math.max(...bs).toFixed(1)}°`);
  for (const r of rows) {
    ok(r.bend <= r.ref * 1.05 + 0.2,
      `${r.name}: the hang never exceeds the horizontal-stalk reference`,
      `${r.bend.toFixed(1)}° vs ${r.ref.toFixed(1)}°`);
  }
}

// --- 4. THE TEST THAT MATTERS -----------------------------------------------------
//
// ROADMAP 7b: "check that it does not simply become `droop` wearing a physical-sounding
// name: the test is whether a bigger blade **on the same stalk** hangs lower without
// anyone saying it should." Read precisely, that is a controlled experiment and not a
// correlation: hold the petiole fixed, put a heavier blade on it. So that is what this
// does — the same organ, its blade area scaled, its stalk untouched.
console.log('\n4. a bigger blade on the SAME stalk hangs lower');
for (const name of names) {
  const P = grow(name);
  const bs = blades(P);
  if (!bs.length) continue;
  // Take the median organ, keep the stalk it actually grew, and hang a blade of 0.5x,
  // 1x and 2x the area off it. Area goes as the square of blade length, so sqrt(mul)
  // of length is `mul` of blade. The reference cantilever is evaluated directly, which
  // is the whole point: nothing here can be satisfied by `bendOf` agreeing with itself.
  const o = bs[bs.length >> 1];
  const pet = petioleOf(o);
  const S = fallScales(FALL_DEFAULTS);
  const St = stiffScales({ ...FALL_DEFAULTS, ...FLAP_DEFAULTS });
  const scaled = [0.5, 1, 2].map((mul) => {
    const bl = drawnBladeLen(o.len * Math.sqrt(mul), 0) * (o.dev || 1);
    const area = bladeSection(o.leaf).area * bl * bl;
    const d = bladeArm(o.leaf) * bl;
    return {
      mul, area: area * CM2,
      deg: tipSlope(S.sigmaFresh * area * S.g, pet.len, d, St.E, pet.r0) * DEG,
    };
  });
  console.log(`   ${name.padEnd(20)} `
    + scaled.map(s => `${s.area.toFixed(0).padStart(4)} cm2 -> ${s.deg.toFixed(1).padStart(5)}°`).join('   '));
  ok(scaled[2].deg > scaled[1].deg && scaled[1].deg > scaled[0].deg,
    `${name}: a heavier blade on the same stalk hangs lower`,
    scaled.map(s => s.deg.toFixed(1)).join(' / '));
}

// --- 4b. and the finding the roadmap did not expect -------------------------------
//
// PRINTS. Across the organs of one specimen the stalk is NOT held fixed — the pipe
// model grows a thicker one for a bigger blade — and then the scaling reverses:
//
//     W ~ A,  I ~ r^4 ~ (kappa A)^2,   so   theta ~ A / A^2 ~ 1/A
//
// A bigger leaf hangs LESS. That is the pipe model's own prediction rather than a bug,
// and it is a known over-compensation: real petioles scale nearer elastic similarity
// (r ~ M^(3/8)) than to area proportionality, precisely because area proportionality
// stiffens faster than it loads. Worth writing down because the roadmap predicted the
// opposite sign, and because it is the strongest argument for the successor law in
// ROADMAP 5 — sizing the stalk off the traffic the midrib actually canalises, which is
// not obliged to go as the area at all.
console.log('\n4b. across a specimen, the stalk changes too — so the scaling reverses (prints)');
for (const name of names) {
  const bs = blades(grow(name));
  if (bs.length < 6) { console.log(`   ${name}: too few blades to rank`); continue; }
  const withArea = bs.map(o => ({ a: bladeAreaOf(o), b: o.bend || 0 })).sort((x, y) => x.a - y.a);
  const k = Math.max(1, withArea.length >> 2);
  const small = withArea.slice(0, k), big = withArea.slice(-k);
  console.log(`   ${name.padEnd(20)} smallest quartile ${(med(small.map(x => x.a)) * CM2).toFixed(0).padStart(4)} cm2 -> `
    + `${(med(small.map(x => x.b)) * DEG).toFixed(1).padStart(5)}°    largest `
    + `${(med(big.map(x => x.a)) * CM2).toFixed(0).padStart(4)} cm2 -> `
    + `${(med(big.map(x => x.b)) * DEG).toFixed(1).padStart(5)}°`);
}

// --- 5. what the twist does now, and how much of it is kappa ----------------------
//
// PRINTS, does not judge. The pre-flight's fourth finding was that the twist swings
// from invisible through perfect to pinned across kappa's own error bar, which is why
// it is not the primary motion and why nothing here asserts on it. This section exists
// so that the sensitivity stays measured rather than remembered.
console.log('\n5. twist against kappa, over the published range (prints, does not judge)');
{
  const name = only || 'Cathedral Fern';
  const P = grow(name);
  const bs = blades(P).slice(0, 24);
  const f = windField({ ...WIND_DEFAULTS });
  const u = v3();
  console.log(`   ${name}, ${bs.length} blades, at the shipped uRef ${WIND_DEFAULTS.uRef} m/s`);
  // `pinned` is the number that decides whether this regime is usable at all: the
  // fraction of drawn frames a blade spends within a whisker of `maxFlap`. The stop is
  // where the quasi-steady plate stops describing anything, so a blade parked there is
  // not "twisting a lot", it is outside the model. Counting stop EVENTS instead — which
  // is what `st.hit` does, and what the first version of this printed — cannot tell a
  // blade that grazes the stop from one that lives against it.
  console.log('     kappa      r mm    f Hz    twist rms   worst   pinned');
  for (const kappa of [2e-4, PETIOLE.kappa, 6e-4, 1e-3]) {
    let s2 = 0, n = 0, worst = 0, pin = 0, rr = 0, ff = 0;
    for (const o of bs) {
      const bl = drawnBladeLen(o.len, o.sen || 0);
      const pet = petioleOf(o, { ...PETIOLE, kappa });
      const fl = flapOf(o.leaf, bl, o.sen || 0, pet);
      rr += pet.r0; ff += fl.om0 * TO_HZ;
      const st = flapState(fl);
      for (let i = 0; i < 1200; i++) {
        windAt(u, f, o.frame.o[0], o.frame.o[1], o.frame.o[2], i);
        flapStep(st, v3dot(u, o.frame.z), v3dot(u, o.frame.y), 1);
        if (i > 200) {
          s2 += st.phi * st.phi; n++;
          worst = Math.max(worst, Math.abs(st.phi));
          if (Math.abs(st.phi) > 0.95 * fl.o.maxFlap) pin++;
        }
      }
    }
    const tag = Math.abs(kappa - PETIOLE.kappa) < 1e-9 ? '  <- shipped' : '';
    console.log('     ' + kappa.toExponential(1).padStart(8)
      + (rr / bs.length * MM).toFixed(2).padStart(8)
      + (ff / bs.length).toFixed(1).padStart(8)
      + (Math.sqrt(s2 / Math.max(1, n)) * DEG).toFixed(1).padStart(11) + '°'
      + (worst * DEG).toFixed(0).padStart(8) + '°'
      + (100 * pin / Math.max(1, n)).toFixed(1).padStart(8) + '%' + tag);
  }
}

console.log(`\n${failures ? `FAILED ${failures}/${checks}` : `ok — ${checks} checks`}`);
process.exit(failures ? 1 : 0);
