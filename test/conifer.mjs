// ROADMAP 13 step 1: PRE-FLIGHT THE CONICAL SILHOUETTE.
//
// The claim being tested is ROADMAP 13's claim 1: that a conifer's taper falls
// out of the apical dominance already in `Axis.step`, with nothing drawing a
// cone. Lower buds escape earlier, so they have had longer to elongate.
//
// This file is the number worked out BEFORE the solver, in the same spirit as
// `cantileverHz` in `39a_stem.js` and the pipe model in `test/petiole.mjs`: a
// second, independent implementation of the claim, so the check does not use
// the thing being checked as its own reference. Branch length against height is
// kinematics, not chemistry, so it gets asserted rather than printed.
//
// ---------------------------------------------------------------------------
// THE DERIVATION
//
// An axis climbs by two terms, and only one of them knows about generation:
//
//   40_plant.js:138   rate = sp.elongation * (gen === 0 ? 1 : 0.72) * ...
//   40_plant.js:402   elongate() stretches the subapical zone and OVERWRITES
//                     this.length
//
// The second is a fixed window of arc below the tip, stretching at
// `sp.internode` and decaying over `sp.internodeSpan`, so once an axis is
// longer than a few spans it contributes
//
//   integral of internode * exp(-b/span) db  ->  internode * internodeSpan
//
// per unit time, on EVERY axis, leader or lateral. So the two climb rates are
//
//   V0 = E + I*S                 (leader)
//   V1 = gamma*E + I*S           (lateral, gamma = 0.72)
//   k  = V1 / V0                 (the taper slope)
//
// A bud escapes on the first step where BOTH gates open: `suppressed <=
// branching`, i.e. the tip is at least d_dom = -dominance * ln(branching)
// above it, and `org.age >= budRelease`, i.e. the tip has climbed
// V0 * budRelease above it. Both are CONSTANTS, the same for every bud, so
//
//   d_esc = max(-dominance * ln(branching), V0 * budRelease)
//
// A bud escaping when the leader's arc length is A_esc has, by the time the
// leader reaches A_fin, grown
//
//   L = V1 * (t_fin - t_esc) = k * (A_fin - A_esc)
//
// PREDICTION 1 (shape): branch length is LINEAR in the arc position of its bud,
// slope -k, hitting zero a fixed distance d_esc below the apex. That is a cone,
// and nothing drew it. ROADMAP 13's claim 1 stands or falls here.
//
// PREDICTION 2 (slope): k = (gamma*E + I*S) / (E + I*S). Note what this says:
// the 0.72 the roadmap entry expected to set the taper is diluted by subapical
// stretching, which carries no generation penalty. On the shipped defaults
// I*S = 0.0187 against E = 0.0052, so stretching is 3.6x the tip's own
// extension and k comes out near 0.94 -- a crown of branches almost as long as
// the tree is tall. k is bounded in (gamma, 1) for any species: setting
// `internode: 0` reaches the floor and NOTHING reaches below it.
//
// PREDICTION 3 (escape distance): d_esc is the same for every bud, and on the
// shipped defaults budRelease binds rather than dominance -- 7.18 against 3.59.
// That matters for a conifer, because it is `dominance` the roadmap entry
// expects to be shaping the crown and it is not the term in charge.
//
// PREDICTION 4 (silhouette): a branch of length L leaving at angle theta from
// vertical puts its tip at radius L*sin(theta), height h + L*cos(theta). With
// u = A_fin - d_esc - A_esc the crown envelope is
//
//   r = k*u*sin(theta),  z = zeta * (A_fin - d_esc - u*(1 - k*cos(theta)))
//
// where zeta = H/A_fin converts the leader's arc into height, because `wander`
// and `nutation` mean a stem is not a straight line. So the crown is a
// straight-sided cone of half-angle
//
//   atan( k*sin(theta) / (zeta * (1 - k*cos(theta))) )
//
// The escape lerps 45% toward vertical (40_plant.js:241), so theta = 50.7deg.
//
// WHAT THAT MEANS, AND IT IS THE POINT OF RUNNING THIS FIRST: a Norway spruce
// is a crown half-angle around 8-15deg. The floor k = gamma = 0.72 with a
// horizontal branch and a straight stem gives atan(0.72) = 35.8deg, and the
// shipped angle and k give worse. The cone is emergent in SHAPE and roughly
// 2-4x too FAT in slope, and no species parameter reaches the difference,
// because the binding constant is hardcoded and shared by all eight species.
// That is worth knowing on day zero, which is what ROADMAP 13 asks this for.
// ---------------------------------------------------------------------------

import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';

const prm = { ...DEFAULT_PRM, T: 40, D: 6, mu: 0.3, rho: 0.6, b: 3 };
const mo = { ...MERISTEM_DEFAULTS, R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 };

// The lateral penalty at 40_plant.js:138, kept here deliberately as a second
// copy. Everything else is read out of the shipped defaults, per the rule that
// a harness carrying its own copy of a shipped constant eventually tests a
// different program than the one you are running.
const GAMMA = 0.72;

const predict = (sp) => {
  const E = sp.elongation, I = sp.internode, S = sp.internodeSpan;
  const IS = (I > 0) ? I * S : 0;
  const V0 = E + IS, V1 = GAMMA * E + IS;
  const dDom = -sp.dominance * Math.log(sp.branching);
  const dBud = V0 * sp.budRelease;
  return { V0, V1, k: V1 / V0, dDom, dBud, dEsc: Math.max(dDom, dBud) };
};

// A controlled vegetative run: no florigen, so nothing converts to a flower
// half way up and truncates the taper; generous budgets so the leader is not
// arrested by the whole-plant organ cap; one library leaf because canalising
// eight of them is the slow part and nothing here reads a blade.
const VEG = {
  florigenRate: 0, leafLibrary: 1, leafBudget: 8,
  maxOrgans: 400, organBudget: 900, maxAxes: 40, maxGen: 1,
};

function fit(pts) {
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const m = sxy / (sxx || 1e-12), c = my - m * mx;
  return { m, c, r2: (sxy * sxy) / ((sxx * syy) || 1e-12), n, zero: -c / (m || -1e-12) };
}
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

// `pts` drops its oldest point past 900 (40_plant.js:168) and `length` is the
// arc of what is left, so past that the leader's arc bookkeeping is measured
// from a base that is moving. Stay under it: points ~ A/segLen, A ~ V0*T.
const stepBudget = (sp, want) => {
  const V0 = predict(sp).V0;
  return Math.min(want, Math.floor(0.88 * 900 * sp.segLen / V0));
};

// Grow, stamping every branch at the moment it escapes. Stamping is what makes
// this a clean measurement: no spatial matching between a frozen branch base
// and an organ frame that advects out from under it.
function grow(over, want) {
  const sp = { ...VEG, ...over };
  const full = { ...SPECIES_DEFAULTS, ...sp };
  const steps = stepBudget(full, want);
  const P = new Plant(prm, mo, sp, 11);
  const main = P.axes[0];
  const stamp = new Map();
  const addAxis = P.addAxis.bind(P);
  P.addAxis = (base, dir, gen, parentNode, parentAxis) => {
    const a = addAxis(base, dir, gen, parentNode, parentAxis);
    if (parentAxis === main) {
      const tip = main.tipPos();
      const dx = tip[0] - base[0], dy = tip[1] - base[1], dz = tip[2] - base[2];
      stamp.set(a, { aEsc: main.length, dEsc: Math.hypot(dx, dy, dz), h: base[1] - P.origin[1] });
    }
    return a;
  };
  for (let s = 0; s < steps; s++) P.step(1);
  const lat = [...stamp.entries()]
    .filter(([a]) => a.gen === 1)
    .map(([a, s]) => ({ ...s, L: a.length }))
    .sort((x, y) => x.aEsc - y.aEsc);
  return { P, sp: full, steps, main, lat, aFin: main.length, H: main.tipPos()[1] - P.origin[1] };
}

let fails = 0;
const check = (name, ok, got, want) => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n         got ${got}   want ${want}`);
};

// --- 1. the taper law -------------------------------------------------------
console.log('\n=== 1. the taper law: L = k * (A_fin - A_esc), zero at d_esc below the apex ===\n');

const r = grow({}, 9000);
const p = predict(r.sp);
const zeta = r.H / r.aFin;
console.log(`  species defaults, ${r.steps} steps, seed 11`);
console.log(`  E ${r.sp.elongation}  I*S ${(r.sp.internode * r.sp.internodeSpan).toFixed(5)}  (stretching is ${(r.sp.internode * r.sp.internodeSpan / r.sp.elongation).toFixed(1)}x the tip's own extension)`);
console.log(`  predicted  V0 ${p.V0.toFixed(5)}  V1 ${p.V1.toFixed(5)}  k ${p.k.toFixed(4)}`);
console.log(`  predicted  d_esc ${p.dEsc.toFixed(2)}  (dominance ${p.dDom.toFixed(2)}, budRelease ${p.dBud.toFixed(2)} -- the larger binds)`);
console.log(`  leader     arc ${r.aFin.toFixed(2)}  height ${r.H.toFixed(2)}  zeta ${zeta.toFixed(3)}`);
console.log(`  laterals   ${r.lat.length}`);

const f = fit(r.lat.map(o => [o.aEsc, o.L]));
if (!f) { console.log('\n  TOO FEW LATERALS TO FIT'); fails++; }
else {
  console.log(`\n  fitted  L = ${f.m.toFixed(4)} * A_esc + ${f.c.toFixed(2)}   R2 ${f.r2.toFixed(4)}  (n ${f.n})`);
  console.log(`  fitted  zero at A_esc ${f.zero.toFixed(2)}, i.e. ${(r.aFin - f.zero).toFixed(2)} of arc below the apex`);
  const dm = median(r.lat.map(o => o.dEsc));
  console.log(`  measured d_esc at escape: median ${dm.toFixed(2)}, min ${Math.min(...r.lat.map(o => o.dEsc)).toFixed(2)}, max ${Math.max(...r.lat.map(o => o.dEsc)).toFixed(2)}`);

  console.log('\n   A_esc    L      predicted    height');
  for (const o of r.lat) {
    console.log(`  ${o.aEsc.toFixed(2).padStart(6)}  ${o.L.toFixed(2).padStart(6)}  ${(p.k * Math.max(0, r.aFin - o.aEsc)).toFixed(2).padStart(9)}  ${o.h.toFixed(2).padStart(8)}`);
  }

  check('PREDICTION 1  taper is linear in bud arc position (R2 >= 0.95)',
    f.r2 >= 0.95, f.r2.toFixed(4), '>= 0.95');
  check('PREDICTION 2  slope = -k within 10%',
    Math.abs(-f.m - p.k) / p.k <= 0.10, (-f.m).toFixed(4), `${p.k.toFixed(4)} +-10%`);
  check('PREDICTION 3  median escape distance = d_esc within 25%',
    Math.abs(dm - p.dEsc) / p.dEsc <= 0.25, dm.toFixed(2), `${p.dEsc.toFixed(2)} +-25%`);
  check('PREDICTION 3b budRelease binds, not dominance',
    p.dBud > p.dDom, `budRelease ${p.dBud.toFixed(2)} vs dominance ${p.dDom.toFixed(2)}`, 'budRelease larger');
}

// --- 2. does k move the way the formula says? -------------------------------
console.log('\n=== 2. k = (gamma*E + I*S)/(E + I*S): sweep the dilution ===\n');
console.log('  internode   predicted k   measured slope    R2     n   steps');
for (const I of [0, 0.0018, 0.0072, 0.020]) {
  const rr = grow({ internode: I }, 9000);
  const pp = predict(rr.sp);
  const ff = fit(rr.lat.map(o => [o.aEsc, o.L]));
  console.log(`  ${String(I).padStart(9)}   ${pp.k.toFixed(4).padStart(11)}   ${ff ? (-ff.m).toFixed(4).padStart(14) : '     too few  '}   ${ff ? ff.r2.toFixed(3) : '  -  '}  ${String(rr.lat.length).padStart(3)}  ${String(rr.steps).padStart(5)}`);
  if (ff && rr.lat.length >= 5) {
    check(`internode ${I}: slope tracks k within 12%`,
      Math.abs(-ff.m - pp.k) / pp.k <= 0.12, (-ff.m).toFixed(4), pp.k.toFixed(4));
  }
}
console.log(`\n  THE FLOOR: with internode 0 the formula gives k = gamma = ${GAMMA} exactly.`);
console.log('  No species parameter reaches below it, because gamma is hardcoded.');

// --- 3. the silhouette that implies -----------------------------------------
console.log('\n=== 3. crown half-angle, and the verdict on claim 1 ===\n');
const THETA = Math.atan2(0.55, 0.45);   // the hardcoded 0.45 lerp toward vertical
const half = (k, th, z) => Math.atan2(k * Math.sin(th), z * (1 - k * Math.cos(th))) * 180 / Math.PI;
console.log(`  branch angle from vertical, from the 0.45 lerp: ${(THETA * 180 / Math.PI).toFixed(1)}deg`);
console.log(`  zeta (leader height / leader arc), measured:    ${zeta.toFixed(3)}`);
console.log('');
console.log(`  shipped k ${p.k.toFixed(3)}, shipped angle, measured zeta  ->  half-angle ${half(p.k, THETA, zeta).toFixed(1)}deg`);
console.log(`  floor   k ${GAMMA},  shipped angle, measured zeta  ->  half-angle ${half(GAMMA, THETA, zeta).toFixed(1)}deg`);
console.log(`  floor   k ${GAMMA},  horizontal,    straight stem  ->  half-angle ${half(GAMMA, Math.PI / 2, 1).toFixed(1)}deg`);
console.log('  a Norway spruce is about 8-15deg.');
console.log('');
console.log('  VERDICT: the SHAPE is emergent and linear -- claim 1 stands structurally,');
console.log('  and nothing draws a cone. The SLOPE has a hard floor at gamma = 0.72 at');
console.log('  40_plant.js:138, shared by all eight species, and that floor is 2-4x too');
console.log('  fat for a conifer. A spruce needs a term that suppresses lateral');
console.log('  elongation, and the engine does not have one yet.');

// --- 4. the obvious fix, killed on paper ------------------------------------
// ON PAPER ONLY -- nothing below is measured, and nothing in `src/` implements
// it. It is here because it is the first thing anyone will reach for after
// reading section 3, and it costs a day to find out by building it.
//
// The engine already computes `suppressed = exp(-d/dominance)` and uses it as a
// BINARY gate. The obvious move is to use it as a CONTINUOUS multiplier on
// lateral elongation -- apical control rather than apical dominance, which is
// the textbook distinction and the right biology for a conifer. Then
//
//   L(a) = integral of V1 * exp(-(A(t) - a)/lambda) dt, t_esc..t_fin
//        = k * lambda * [ beta - exp(-(A_fin - a)/lambda) ],   beta = exp(-d_esc/lambda)
//
// and as (A_fin - a) grows the exponential vanishes and L tends to the CONSTANT
// k*lambda*beta. Every branch below about 3*lambda of the apex ends up the same
// length. That is a bottlebrush, not a cone -- it removes the taper it was
// reached for to steepen.
console.log('\n=== 4. continuous apical control: derived, NOT measured, and it is a dead end ===\n');
{
  const lam = r.sp.dominance, beta = Math.exp(-p.dEsc / lam);
  // clamped at zero: the closed form goes negative for a bud the formula has
  // not released yet, i.e. one less than d_esc below the apex
  const Lac = (a) => Math.max(0, p.k * lam * (beta - Math.exp(-(r.aFin - a) / lam)));
  console.log(`  lambda ${lam}  beta ${beta.toFixed(4)}  asymptote k*lambda*beta = ${(p.k * lam * beta).toFixed(2)}`);
  console.log('\n   A_esc    linear L    apical-control L');
  for (const o of r.lat.filter((_, i) => i % 5 === 0)) {
    console.log(`  ${o.aEsc.toFixed(2).padStart(6)}  ${(p.k * (r.aFin - o.aEsc)).toFixed(2).padStart(9)}  ${Lac(o.aEsc).toFixed(2).padStart(17)}`);
  }
  const lo = r.lat[0], mid = r.lat[r.lat.length >> 1];
  const rl = (p.k * (r.aFin - lo.aEsc)) / (p.k * (r.aFin - mid.aEsc));
  const ra = Lac(lo.aEsc) / Lac(mid.aEsc);
  console.log(`\n  lowest/middle branch length -- cone (as shipped) ${rl.toFixed(2)}x, apical control ${ra.toFixed(2)}x`);
  console.log('  A cone needs that ratio well above 1. Apical control drives it to 1.');
  console.log('  So it is not the route to a spruce, and it should not be built to find out.');
}

console.log(fails ? `\n${fails} CHECK(S) FAILED\n` : '\nall checks passed\n');
process.exit(fails ? 1 : 0);
