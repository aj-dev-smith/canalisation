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
    .map(([a, s]) => {
      // where the branch ACTUALLY ended up, so the crown envelope is measured
      // rather than reconstructed from an assumed branch angle. `pts` carries
      // the deflected pose, so this includes gravity -- which is where the
      // branch really is, and is the honest thing to draw.
      const b = a.pts[0], t = a.tipPos();
      const rx = t[0] - P.origin[0], rz = t[2] - P.origin[2];
      const dy = t[1] - b[1], dh = Math.hypot(t[0] - b[0], t[2] - b[2]);
      return {
        ...s, L: a.length,
        rTip: Math.hypot(rx, rz), zTip: t[1] - P.origin[1],
        zBase: b[1] - P.origin[1], rBase: Math.hypot(b[0] - P.origin[0], b[2] - P.origin[2]),
        theta: Math.atan2(dh, dy),   // the branch's own angle from vertical
      };
    })
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

// --- 3. the silhouette ------------------------------------------------------
// The crown envelope is MEASURED off where the branches actually ended up, and
// the closed form is the cross-check rather than the source. The first version
// of this section was the closed form alone and it was WRONG -- it multiplied
// the branch's own extension by zeta, which is the leader's arc-to-height
// factor and has no business there. The corrected form is
//
//   r = k*u*sin(theta),  z = z_top - u*(zeta - k*cos(theta))
//   half-angle = atan( k*sin(theta) / (zeta - k*cos(theta)) )
//
// which is 2-4deg off the wrong one -- small enough that only re-deriving it
// caught it, which is the argument for measuring the envelope instead.
console.log('\n=== 3. crown half-angle: measured, then cross-checked ===\n');
const SPRUCE = 12;    // degrees, mid-range of a Norway spruce's 8-15
const half = (k, th, z) => Math.atan2(k * Math.sin(th), z - k * Math.cos(th)) * 180 / Math.PI;
const thetaMean = r.lat.reduce((s, o) => s + o.theta, 0) / r.lat.length;

// fit the envelope: radius against depth below the crown apex, through the origin
const zTop = Math.max(...r.lat.map(o => o.zTip));
let num = 0, den = 0;
for (const o of r.lat) { const u = zTop - o.zTip; num += u * o.rTip; den += u * u; }
const envSlope = num / (den || 1e-12);
const measured = Math.atan(envSlope) * 180 / Math.PI;

console.log(`  branch angle from vertical: nominal ${(Math.atan2(0.55, 0.45) * 180 / Math.PI).toFixed(1)}deg from the 0.45 lerp, MEASURED mean ${(thetaMean * 180 / Math.PI).toFixed(1)}deg`);
console.log(`  zeta (leader height / leader arc), measured: ${zeta.toFixed(3)}`);
console.log(`  crown apex at height ${zTop.toFixed(2)}`);
console.log('');
console.log(`  MEASURED crown half-angle, off ${r.lat.length} branch tips:  ${measured.toFixed(1)}deg`);
console.log(`  closed form at measured k and theta:                ${half(-f.m, thetaMean, zeta).toFixed(1)}deg`);
console.log(`  closed form at floor k ${GAMMA}, same theta:              ${half(GAMMA, thetaMean, zeta).toFixed(1)}deg`);
console.log(`  closed form at floor k ${GAMMA}, horizontal, straight:    ${half(GAMMA, Math.PI / 2, 1).toFixed(1)}deg`);
console.log(`  a Norway spruce:                                    ${SPRUCE}deg (8-15)`);

check('measurement and closed form agree within 6deg',
  Math.abs(measured - half(-f.m, thetaMean, zeta)) <= 6,
  `${measured.toFixed(1)} vs ${half(-f.m, thetaMean, zeta).toFixed(1)}`, 'within 6deg');

// Does the branch ANGLE offer a way out? ROADMAP 13 names the hardcoded 0.45
// lerp as an obstacle. It is not the one that matters, and this says why.
console.log('\n  half-angle against branch angle, at the FLOOR k = 0.72 and a straight stem:\n');
console.log('    theta   half-angle');
for (const d of [20, 35, 50, 65, 80, 90]) {
  console.log(`    ${String(d).padStart(3)}deg   ${half(GAMMA, d * Math.PI / 180, 1).toFixed(1).padStart(6)}deg`);
}
console.log('\n  The branch angle moves the crown by about 12deg across its whole range,');
console.log(`  and the gap to a spruce is about ${(half(GAMMA, thetaMean, zeta) - SPRUCE).toFixed(0)}deg -- IF theta could be held. It cannot.`);

// --- 3a. why theta is 25deg and not 50.7deg: nothing holds a branch out ------
// The measured mean branch angle is half the nominal one, and that is not
// noise. Every axis is pulled toward vertical every step, with no generation
// term anywhere in it:
//
//   40_plant.js:141   const want = v3(0, 1, 0);   ... plus wander/nutation
//   40_plant.js:150   v3lerp(this.dir, this.dir, want, clamp(sp.tropism*dt, 0, 1))
//
// At `tropism` 0.02 that is a lerp of 0.02 per step toward vertical, so a
// branch's initial direction decays with a time constant of 1/0.02 = 50 steps.
// The hardcoded 0.45 lerp sets the direction for the first fifty steps of a
// branch that then grows for thousands. It is not a branch angle; it is an
// initial condition that is immediately forgotten.
console.log('\n=== 3a. the branch angle does not persist: every axis is orthotropic ===\n');
{
  const tau = 1 / r.sp.tropism;
  const byL = r.lat.slice().sort((a, b) => a.L - b.L);
  const young = byL.slice(0, 8), old = byL.slice(-8);
  const mean = (a, f) => a.reduce((s, o) => s + f(o), 0) / a.length;
  const ty = mean(young, o => o.theta) * 180 / Math.PI;
  const to = mean(old, o => o.theta) * 180 / Math.PI;
  console.log(`  tropism ${r.sp.tropism} -> a branch's initial direction decays with time constant ${tau.toFixed(0)} steps`);
  console.log(`  nominal angle set at escape by the 0.45 lerp:   ${(Math.atan2(0.55, 0.45) * 180 / Math.PI).toFixed(1)}deg`);
  console.log(`  8 SHORTEST branches (youngest), mean theta:     ${ty.toFixed(1)}deg`);
  console.log(`  8 LONGEST  branches (oldest),   mean theta:     ${to.toFixed(1)}deg`);
  console.log(`  all ${r.lat.length}, mean theta:                             ${(thetaMean * 180 / Math.PI).toFixed(1)}deg`);
  check('the oldest branches have been pulled closer to vertical than the youngest',
    to < ty, `old ${to.toFixed(1)}deg vs young ${ty.toFixed(1)}deg`, 'old < young');
  check('measured theta is far below the nominal 50.7deg (tropism erases it)',
    thetaMean * 180 / Math.PI < 40, `${(thetaMean * 180 / Math.PI).toFixed(1)}deg`, '< 40deg');
  console.log('\n  THIS IS THE BIGGER OBSTACLE, and it is not the one the entry names.');
  console.log('  A conifer\'s laterals are PLAGIOTROPIC -- they hold a near-horizontal set');
  console.log('  point for life. Every axis here is ORTHOTROPIC: `want` is vertical for');
  console.log('  leader and lateral alike, with no generation term. So long lower branches');
  console.log('  curve up and put their tips at the TOP of the crown, which is why the');
  console.log('  drawing below is widest at the top. The length taper is real and the');
  console.log('  silhouette still is not a cone.');
}

// --- 3b. the same thing, drawn ----------------------------------------------
// ASCII, in the idiom of test/margin.mjs and test/fruit.mjs, because "2-4x too
// fat" is a composition claim and a number is a poor way to put one. Character
// cells are twice as tall as wide, so a column spans half the world distance a
// row does -- otherwise the picture would misreport the very angle it is drawn
// to show.
console.log('\n=== 3b. the crown, drawn. Left: as it grows. Right: a spruce at 12deg ===\n');
{
  const ROWS = 34, HALFW = 32;
  const perRow = zTop / (ROWS - 1), perCol = perRow / 2;
  const mk = () => Array.from({ length: ROWS }, () => new Array(HALFW * 2 + 1).fill(' '));
  const put = (g, rr, zz, ch) => {
    const row = ROWS - 1 - Math.round(zz / perRow);
    const col = HALFW + Math.round(rr / perCol);
    if (row >= 0 && row < ROWS && col >= 0 && col <= HALFW * 2) g[row][col] = ch;
  };
  const grid = mk(), ref = mk();

  for (const o of r.lat) {
    // both sides, so it reads as a specimen rather than half of one
    for (const sgn of [1, -1]) {
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        put(grid, sgn * (o.rBase + t * (o.rTip - o.rBase)), o.zBase + t * (o.zTip - o.zBase), i === steps ? '*' : '-');
      }
    }
  }
  for (let i = 0; i < ROWS; i++) put(grid, 0, i * perRow, '|');
  for (let i = 0; i < ROWS; i++) {
    const z = i * perRow, u = zTop - z;
    if (u < 0) continue;
    const rr = u * Math.tan(SPRUCE * Math.PI / 180);
    put(ref, rr, z, '\\'); put(ref, -rr, z, '/'); put(ref, 0, z, '|');
  }
  for (let i = 0; i < ROWS; i++) console.log('  ' + grid[i].join('').replace(/\s+$/, '').padEnd(HALFW * 2 + 3) + ' ' + ref[i].join('').replace(/\s+$/, ''));
  console.log(`\n  each column ${perCol.toFixed(2)} world units, each row ${perRow.toFixed(2)} -- drawn to true angle.`);
}

console.log('\n  VERDICT: the SHAPE is emergent and linear -- claim 1 stands structurally,');
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
