// ROADMAP 13, blocker 2: CAN GRAVITY HOLD A BRANCH OUT?
//
// The conifer pre-flight (`test/conifer.mjs`, 2026-07-30) found the crown is a
// vase and upside down, because every axis is orthotropic: `want` is vertical
// for leader and lateral alike and `tropism` erases a branch's launch angle in
// about fifty steps. A conifer's laterals are PLAGIOTROPIC -- they hold a
// near-horizontal set point for life.
//
// ROADMAP 13 says not to answer that with `sp.branchAngle`, and points at the
// force balance that deleted `droop` in #7b: a branch's angle is where its own
// weight balances its stiffness. This file asks whether that balance is even
// the right ORDER OF MAGNITUDE, on the radii the engine actually grew, BEFORE
// anything is written. That is the norm that has now paid twice.
//
// ---------------------------------------------------------------------------
// WHERE THIS IS ALLOWED TO LIVE, WHICH IS NOT WHERE IT LOOKS
//
// `39a_stem.js:49-69` is explicit and it constrains this work: the bend solver
// must NOT be loaded with self-weight, because static sag and first natural
// frequency are the same stiffness-to-mass group --
//
//     delta = 1.545 g / omega_1^2
//
// with no free parameter in it. A stem stiff enough not to sag does not sway
// like a plant. Real plants escape by not being static: growth continuously
// remodels toward the target orientation, so THE GROWN SHAPE IS THE STATIC
// EQUILIBRIUM and the sag is already spent. `40_plant.js` grows that shape and
// `39a_stem.js` solves deviations about it.
//
// So plagiotropy is a GROWTH question, not a bend question. Nothing here should
// end up in the Bend solver, and this harness deliberately does not use it.
//
// ---------------------------------------------------------------------------
// THE DERIVATION
//
// A branch of length L, basal radius r, at angle theta from vertical, is a
// cantilever carrying its own weight as a distributed load plus its blades as
// point loads. Only the component perpendicular to the branch bends it, hence
// every sin(theta).
//
//   I = pi r^4 / 4                          second moment
//   w = rho g pi r^2                        self-weight per unit length
//   phi_self  = w sin(theta) L^3 / (6 EI)   tip slope, uniformly distributed
//   phi_blade = sum_i m_i g sin(theta) s_i^2 / (2 EI)   point load at arc s_i
//
// THE SAME TRAP, ONE LEVEL DOWN. Eliminating r between phi_self and the
// cantilever's first mode `f1 = 0.5596 (r/L^2) sqrt(E/4rho)` gives
//
//   phi_self = 0.05219 * g * sin(theta) / (f1^2 * L)
//
// which, like the sag relation above, has NO material constant left in it. That
// cuts both ways and here it cuts in our favour: the whole-plant version says a
// tall stem cannot both stand and sway, but a SHORT thin lateral gets a large
// tip SLOPE at a perfectly plant-like frequency. A 0.3 m branch reaches a
// radian at 1.31 Hz. That is the claim this file measures.
//
// CAVEAT, AND IT IS LOAD-BEARING: all of the above is linear beam theory, which
// over-predicts once the tip slope leaves the small-deflection range. Past
// about 0.5 rad the real cantilever's slope saturates and the linear number is
// an upper bound, not an answer. `39a_stem.js` puts its own stop at
// `maxTilt: 0.45` rad for the same reason.
//
// ---------------------------------------------------------------------------
// CORRECTED 2026-07-30, AFTER THE LITERATURE SWEEP (docs/research_7_30_26.md
// section 2.1). THE FIRST VERSION OF THIS FILE GOT TWO THINGS WRONG AND THE
// CORRECTION INVERTS ITS REASONING, THOUGH NOT ITS CONCLUSION.
//
//  1. THE MODULUS. It ran only at E = 60 MPa, which is HERBACEOUS -- correct
//     for all eight shipped species and wrong for a conifer. But conifer BRANCH
//     wood is not stem wood either: whole living branch sections with bark are
//     0.7-4.6 GPa against ~8.5 GPa for clear stem wood, because branch
//     microfibril angle is 41-53 degrees against 10-20 and MFA dominates axial
//     stiffness. Use 1-4 GPa, central 2. (Cannell & Morgan 1987, Tree Physiol
//     3(4):355-364; Hartwig-Nair et al. 2024, Wood Sci Technol 58(3):887-906.)
//
//  2. "phi = 268 degrees" IS NOT AN ANGLE. Above about 30 degrees a
//     small-deflection formula is no longer reporting a deflection, it is
//     reporting how badly it has been violated. Published large-deflection
//     elastica results for real conifer branches at E = 2 GPa give tip slopes
//     of 16.8-26.6 degrees below horizontal WITH foliage, and 3.5 degrees for
//     bare wood.
//
// SO THE CONCLUSION INVERTS. A woody conifer lateral held horizontal is NEAR
// MECHANICAL EQUILIBRIUM: gravity does not overwhelm stiffness, it droops the
// branch 10-45 degrees and the drooped shape is normal rather than a failure.
// Mechanics PRESERVES the horizontal state -- which is exactly why it cannot
// SUPPLY it. Remove the active set point and a branch does not find horizontal;
// it sits wherever it was built, minus the droop.
//
// The original verdict -- "you still need an active set point" -- survives. The
// reasoning behind it was backwards, and a framing error came with it: a
// cantilever statics problem ALWAYS has an equilibrium. "Gravity overwhelms
// stiffness" was never a coherent thing to conclude.
//
// WHAT TO CARRY INSTEAD: one dimensionless group,
//
//     Gamma = rho g L^3 / (E d^2),     theta_tip = (8/3) * Gamma   (bare, uniform)
//
// Gamma >~ 0.5 is the herbaceous regime -- no useful static set point, and a
// DYNAMIC controller is the right model. Gamma <~ 0.1 is the woody regime, where
// a static set point plus an elastic droop correction is the right
// decomposition. One number decides the architecture, and neither regime is
// "the truth".
// ---------------------------------------------------------------------------

import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { STEM_DEFAULTS, cantileverHz } from '../src/39a_stem.js';
import { FALL_DEFAULTS, bladeAreaOf } from '../src/39_fall.js';
import { WORLD } from '../src/37_wind.js';

const G = 9.81;
const E = STEM_DEFAULTS.eModulus;
const RHO = STEM_DEFAULTS.rhoTissue;
const LMA = FALL_DEFAULTS.lmaFresh;
const U = WORLD.unitM;
const STEPS = +(process.env.STEPS || 5200);

let fails = 0;
const check = (name, ok, got, want) => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n         got ${got}   want ${want}`);
};

// tip slope of a cantilever, SI in, radians out
function tipSlope(rM, lM, blades, theta) {
  const I = Math.PI * rM ** 4 / 4;
  const w = RHO * G * Math.PI * rM * rM;
  const self = w * Math.sin(theta) * lM ** 3 / (6 * E * I);
  let blade = 0;
  for (const b of blades) blade += b.m * G * Math.sin(theta) * b.s * b.s / (2 * E * I);
  return { self, blade, total: self + blade };
}

function run(name) {
  const S = SPECIES[name];
  const prm = { ...DEFAULT_PRM, ...S.prm };
  const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  if (!(sp.branching > 0) || sp.maxAxes < 2) return null;
  const P = new Plant(prm, mo, S.sp, 21);
  for (let s = 0; s < STEPS; s++) P.step(1);

  const out = [];
  for (const a of P.axes) {
    if (a.gen === 0 || a.floral || a.length <= 0) continue;
    const lM = a.length * U;
    const rM = (a.radii[0] || sp.tipRadius) * U;
    if (!(rM > 0) || !(lM > 0)) continue;
    // the branch's own angle from vertical, base to tip
    const b = a.pts[0], t = a.tipPos();
    const theta = Math.atan2(Math.hypot(t[0] - b[0], t[2] - b[2]), Math.max(1e-9, t[1] - b[1]));
    const blades = [];
    for (const org of a.organs) {
      if (org.shed || !org.leaf) continue;
      const area = bladeAreaOf(org) * U * U;      // world^2 -> m^2
      if (!(area > 0)) continue;
      blades.push({ m: area * LMA, s: Math.min(lM, (org.birthLen || 0) * U) });
    }
    const f1 = cantileverHz(rM, lM);
    // the dimensionless group that decides which controller is right
    const gamma = RHO * G * lM ** 3 / (E * (2 * rM) ** 2);
    const grown = tipSlope(rM, lM, blades, theta);
    // THE SCREENING NUMBER. Evaluated at theta = 90deg, because the question is
    // whether a branch could hold itself HORIZONTAL -- asking what droop a
    // nearly-vertical branch gets is circular, since sin(theta) -> 0 is exactly
    // what "vertical" means and the answer is always "almost none".
    const horiz = tipSlope(rM, lM, blades, Math.PI / 2);
    // ARC AGAINST CHORD. phi goes as L^3, so if `length` is inflated by an axis
    // that coils rather than runs, every number here is inflated cubed. The
    // conifer pre-flight was bitten by exactly this confusion once already.
    const chord = Math.hypot(t[0] - b[0], t[1] - b[1], t[2] - b[2]) * U;
    out.push({ lM, rM, theta, blades, f1, gamma, grown: grown.total, ...horiz, chord, tipY: t[1] * U });
  }
  const lead = P.axes[0];
  return {
    name, plant: P, lat: out, height: lead.tipPos()[1] * U,
    leadR: (lead.radii[0] || 0) * U, leadL: lead.length * U,
  };
}

const deg = (x) => x * 180 / Math.PI;
console.log('\n=== can a branch\'s own weight hold it out? shipped species, real radii ===\n');
console.log('  E ' + (E / 1e6) + ' MPa   rho ' + RHO + ' kg/m3   lma ' + LMA + ' kg/m2   1 world unit = ' + U + ' m\n');

const rows = [];
for (const name of Object.keys(SPECIES)) {
  const r = run(name);
  if (!r || !r.lat.length) { console.log(`  ${name.padEnd(20)} no vegetative laterals`); continue; }
  for (const b of r.lat) rows.push({ sp: name, ...b });
  const mean = (f) => r.lat.reduce((s, o) => s + f(o), 0) / r.lat.length;
  console.log(`  ${name.padEnd(20)} h ${r.height.toFixed(2)}m  leader L ${r.leadL.toFixed(2)}m r ${(r.leadR * 1000).toFixed(1)}mm  |  ` +
    `lat ${String(r.lat.length).padStart(2)}  L ${mean(o => o.lM).toFixed(2)}m  r ${(mean(o => o.rM) * 1000).toFixed(1)}mm  ` +
    `f1 ${mean(o => o.f1).toFixed(2)}Hz  phi90 ${deg(mean(o => o.total)).toFixed(0)}deg`);
}

if (!rows.length) {
  console.log('\n  NO LATERALS ANYWHERE -- nothing to pre-flight');
  process.exit(1);
}

console.log('\n  every lateral, sorted by tip slope:\n');
console.log('                       arc   chord        AT theta=90deg          |  as grown');
console.log('  species              L(m)  C(m) r(mm) f1(Hz)  self blade TOTAL  |  theta   phi');
for (const b of rows.slice().sort((x, y) => x.total - y.total)) {
  console.log(`  ${b.sp.padEnd(20)} ${b.lM.toFixed(2).padStart(4)} ${b.chord.toFixed(2).padStart(5)} ${(b.rM * 1000).toFixed(1).padStart(5)} ` +
    `${b.f1.toFixed(2).padStart(6)}  ${deg(b.self).toFixed(0).padStart(4)} ${deg(b.blade).toFixed(0).padStart(5)} ` +
    `${deg(b.total).toFixed(0).padStart(5)}  |  ${deg(b.theta).toFixed(0).padStart(4)}d ${deg(b.grown).toFixed(1).padStart(5)}`);
}
{
  const worstCoil = Math.max(...rows.map(b => b.lM / Math.max(1e-9, b.chord)));
  console.log(`\n  worst arc/chord ratio ${worstCoil.toFixed(2)} -- phi goes as L^3, so this matters cubed`);
}

// --- the parameter-free relation, as a cross-check on two formulas ----------
console.log('\n=== the material constants really do cancel ===\n');
{
  let worst = 0;
  for (const b of rows) {
    // sin(90deg) = 1: `self` is now the held-horizontal number, so the
    // cross-check has to be evaluated at the same angle it was
    const pf = 0.05219 * G * 1 / (b.f1 * b.f1 * b.lM);
    worst = Math.max(worst, Math.abs(pf - b.self) / Math.max(1e-12, b.self));
  }
  console.log(`  phi_self from EI and r, against 0.05219*g*sin(theta)/(f1^2 L): worst disagreement ${(worst * 100).toFixed(2)}%`);
  check('the two forms of phi_self agree within 1%', worst <= 0.01, `${(worst * 100).toFixed(2)}%`, '<= 1%');
}

// --- the verdict ------------------------------------------------------------
console.log('\n=== verdict ===\n');
{
  const strong = rows.filter(b => b.total >= 45 * Math.PI / 180).length;
  const linear = rows.filter(b => b.total <= 0.45).length;
  const medF = rows.map(b => b.f1).sort((a, c) => a - c)[rows.length >> 1];
  const medPhi = rows.map(b => b.total).sort((a, c) => a - c)[rows.length >> 1];
  console.log(`  ${rows.length} vegetative laterals across the catalogue`);
  console.log(`  median first mode      ${medF.toFixed(2)} Hz   (plant-like is roughly 0.3-3)`);
  console.log(`  median tip slope AT HORIZONTAL  ${deg(medPhi).toFixed(0)} deg`);
  console.log(`  ${strong}/${rows.length} would exceed 45deg held out; ${linear}/${rows.length} stay inside linear theory (0.45 rad)`);
  console.log('');
  check('branch frequencies are plant-like, not vibration',
    medF >= 0.2 && medF <= 6, `${medF.toFixed(2)} Hz`, '0.2-6 Hz');
  const medG = rows.map(b => b.gamma).sort((a, c) => a - c)[rows.length >> 1];
  console.log(`  median Gamma = rho g L^3/(E d^2)  ${medG.toFixed(3)}   (>~0.5 herbaceous, <~0.1 woody)`);
  check('the shipped catalogue is squarely in the HERBACEOUS regime (Gamma >= 0.3)',
    medG >= 0.3, medG.toFixed(3), '>= 0.3');
  check('and therefore no static set point is available to it (median slope past 30deg)',
    deg(medPhi) >= 30, `${deg(medPhi).toFixed(0)} deg`, '>= 30deg, i.e. small-deflection is void');
  console.log('\n  Read the CAVEAT at the top before reading a large phi as an angle:');
  console.log('  linear beam theory is an UPPER BOUND past about 0.45 rad (26deg).');
  console.log('\n  READ THE CORRECTION AT THE TOP. These are HERBACEOUS numbers, and anything');
  console.log('  past ~30deg is a small-deflection formula reporting its own violation rather');
  console.log('  than an angle. What they establish is the REGIME, not the droop.');
  console.log('');
  console.log('  ROADMAP 13\'s force-balance route to plagiotropy is falsified either way --');
  console.log('  but for the OPPOSITE reason to the one this file first gave. At woody');
  console.log('  stiffness a lateral held horizontal is near equilibrium and droops 10-45deg,');
  console.log('  so mechanics PRESERVES horizontal and therefore cannot SUPPLY it.');
}

// --- what would have to change: the material, and what that costs ------------
// phi goes as 1/E and f1 goes as sqrt(E), so stiffening to hold a branch out
// buys droop at a fixed exchange rate against sway. That trade is the whole
// decision, and it is arithmetic rather than research.
//
// E = 60 MPa is a HERBACEOUS modulus -- a soft green stem, and correct for every
// species shipped. A conifer is WOODY: softwood along the grain is about 8-11
// GPa, some 150x stiffer. That is the hidden variable behind this whole result,
// and it is a number from a table rather than a dial.
console.log('\n=== what stiffness would hold a branch out, and what it does to sway ===\n');
{
  const med = rows.map(b => ({ phi: b.total, f: b.f1 })).sort((a, c) => a.phi - c.phi)[rows.length >> 1];
  console.log(`  taking the median lateral: phi ${deg(med.phi).toFixed(0)}deg held horizontal, f1 ${med.f.toFixed(2)} Hz at E = 60 MPa\n`);
  console.log('     E        phi at horizontal   f1      verdict');
  for (const mult of [1, 5, 20, 100, 167]) {
    const eM = 60e6 * mult;
    const phi = deg(med.phi) / mult;             // phi ~ 1/E
    const f = med.f * Math.sqrt(mult);           // f1 ~ sqrt(E)
    const tag = phi > 20 ? 'collapses' : (f > 5 ? 'holds out, but vibrates' : 'holds out, and sways like a plant');
    console.log(`  ${(eM / 1e6).toFixed(0).padStart(6)} MPa   ${phi.toFixed(1).padStart(10)}deg   ${f.toFixed(2).padStart(5)} Hz   ${tag}`);
  }
  console.log('\n  Clear conifer STEM wood is ~8500 MPa, but a whole living BRANCH with bark is');
  console.log('  700-4600 MPa -- branch microfibril angle is 41-53deg against 10-20 in stem');
  console.log('  wood, and MFA dominates axial stiffness. The right value is 1-4 GPa.');
  console.log('  The 1-2 GPa window guessed above lands inside that range, which is luck');
  console.log('  worth noting rather than a derivation.');
  console.log('');
  console.log('  Published large-deflection elastica, conifer branch at E = 2 GPa, tip slope');
  console.log('  below horizontal: upper crown -16.8deg, mid -21.9deg, lower -26.6deg, and');
  console.log('  BARE WOOD with no foliage -3.5deg. So the wood skeleton alone barely droops');
  console.log('  and the droop is almost entirely foliage load. (research_7_30_26.md 2.1.)');
}

console.log(fails ? `\n${fails} CHECK(S) FAILED\n` : '\nall checks passed\n');
process.exit(fails ? 1 : 0);
