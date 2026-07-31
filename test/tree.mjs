// ROADMAP 13, blockers 1 and 2: DOES A CROWN FALL OUT OF THE CHEMISTRY?
//
// `test/conifer.mjs` is the pre-flight and its verdict was that the length taper
// is emergent and confirmed while the silhouette is a vase, and upside down.
// Two terms were named: a taper slope floored in (0.72, 1) by a hardcoded
// number, and `want` being vertical for leader and lateral alike so nothing
// holds a branch out. This file is the check on both fixes, and like the
// pre-flight it is a SECOND implementation of each claim rather than a call
// into the thing being checked.
//
// ---------------------------------------------------------------------------
// DERIVATION 1 — THE SET POINT IS THE ZERO OF A WALL SUM
//
// `statocyteFlux` walks a ring of M statocyte walls. The wall at angle phi has
// outward normal component c = cos(phi) along the transverse part of gravity,
// carries `max(0,c)*st` of gravitropic PIN (statoliths sediment onto whichever
// wall is lowest, and only the part of gravity ACROSS the axis can do that, so
// st is the whole of the angle dependence) and `max(0,-c)*ago` of the
// constitutive antigravitropic carrier. Each wall's flux resolved upward is its
// PIN times -c, so
//
//   J(st, ago) = (1/M) * sum_m [ max(0,c)*st + max(0,-c)*ago ] * (-c)
//
// In the limit of many walls both sums are the same integral:
//
//   (1/2pi) * integral of max(0,cos)^2  =  1/4
//
// so   J -> (ago - st)/4,   and the set point is   sin(theta*) = ago.
//
// PREDICTION 1: `gsaOf(ago)` returns asin(min(1,ago)) — and note what is NOT in
// that sentence. Nobody wrote a sine law down. It arrives because the only part
// of gravity a statolith can press a wall with is the part across the axis.
//
// PREDICTION 2: M is a resolution. max(0,cos) has a corner, so the midpoint sum
// converges at O(1/M^2) rather than spectrally; the set point should still be
// stationary to well under a degree by M = 16.
//
// ---------------------------------------------------------------------------
// DERIVATION 2 — APICAL CONTROL HAS A CLOSED FORM, AND IT IS ONE LINE
//
// The partition carries a DENSITY: between forks the stream passes organs, each
// taking its proportional share, so share-per-unit-capacity is unchanged by
// everything except a fork. At a fork with Qm above and Ql on the branch,
//
//   d_m = d * (Qm + Ql) * L     / (L*Qm + (1-L)*Ql)
//   d_l = d * (Qm + Ql) * (1-L) / (L*Qm + (1-L)*Ql)
//
// Every apex has the same capacity, so the ratio of two apices' shares is the
// ratio of the densities that reach them, and the messy denominator cancels:
//
//   PREDICTION 3:   vigour of a lateral off the leader  =  (1 - L) / L
//
// exactly, whatever Qm and Ql are, for a lateral with no forks above it on the
// leader. L = 0.5 gives 1 — an unbiased partition really is unbiased, which is
// the property that let the eight shipped species survive this change.
//
// PREDICTION 4 (second order, and this is the one to watch): a lateral is NOT
// independent of the forks above it. Its vigour relative to the leader is
//
//   (1-L)/L  divided by  product over forks ABOVE it of  L*(Qm+Ql)/(L*Qm+(1-L)*Ql)
//
// and every factor in that product exceeds 1 when L > 0.5. So the leader gains a
// little at every fork it passes, and a branch low in the crown — which has more
// forks above it — runs SLOWER than one near the top. That is a taper of RATE in
// the wrong direction, working against a taper of TIME in the right one, and
// which wins is not decidable on paper. It is why section 4 measures the crown
// instead of trusting section 3.
//
// PREDICTION 5 (the silhouette): with laterals holding a set point theta and a
// taper slope k, the crown envelope is a cone of half-angle
//
//   atan( k*sin(theta) / (zeta - k*cos(theta)) )
//
// (the corrected form from conifer.mjs section 3, zeta = leader height / leader
// arc). A Norway spruce is 8-15 degrees. At theta = 90 and zeta = 1 that is
// atan(k), so k = tan(12deg) = 0.21 and therefore L = 1/(1+k) = 0.826.
// ---------------------------------------------------------------------------

import { Plant, SPECIES_DEFAULTS, statocyteFlux, gsaOf, agoOf, STATOCYTE_WALLS } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';

const DEG = 180 / Math.PI;
let fails = 0;
const check = (name, ok, got, want) => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n         got ${got}   want ${want}`);
};

// --- 1. the statocyte ring --------------------------------------------------
console.log('\n=== 1. the set point is the zero of a wall sum, and nothing wrote a sine ===\n');
{
  // The second implementation: the continuum limit of the same sum, integrated
  // rather than sampled. If these two disagree the ring is not doing what the
  // comment above it says.
  const analytic = (st, ago) => (ago - st) / 4;
  let worst = 0;
  for (const ago of [0.1, 0.3, 0.5, 0.8, 1.0]) {
    for (const st of [0, 0.25, 0.5, 0.75, 1]) {
      worst = Math.max(worst, Math.abs(statocyteFlux(st, ago, 4096) - analytic(st, ago)));
    }
  }
  check('the wall sum converges on the integral (4096 walls)',
    worst < 1e-4, worst.toExponential(2), '< 1e-4');

  console.log('\n  the set point against the offset that produced it:\n');
  console.log('    ago     asin(ago)    gsaOf()     err');
  let werr = 0;
  for (const ago of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95, 1.0, 1.4]) {
    const want = Math.asin(Math.min(1, ago)) * DEG;
    const got = gsaOf(ago) * DEG;
    werr = Math.max(werr, Math.abs(got - want));
    console.log(`    ${ago.toFixed(2).padStart(5)}  ${want.toFixed(3).padStart(10)}  ${got.toFixed(3).padStart(9)}  ${(got - want).toFixed(3).padStart(7)}`);
  }
  check('PREDICTION 1  gsaOf(ago) = asin(min(1,ago)) within 0.3deg at the shipped wall count',
    werr < 0.3, `${werr.toFixed(3)}deg`, '< 0.3deg');

  console.log('\n  PREDICTION 2, walls are a resolution:\n');
  console.log('    walls   set point at ago 0.6');
  let prev = null, moved = 0;
  for (const M of [4, 8, 16, 32, 64, 256]) {
    const g = gsaOf(0.6, M) * DEG;
    if (M >= 16 && prev !== null) moved = Math.max(moved, Math.abs(g - prev));
    prev = g;
    console.log(`    ${String(M).padStart(5)}   ${g.toFixed(4).padStart(10)}deg`);
  }
  check(`PREDICTION 2  past ${STATOCYTE_WALLS} walls the set point moves under 0.1deg`,
    moved < 0.1, `${moved.toFixed(4)}deg`, '< 0.1deg');
}

// --- 2. auxin sets the offset, and the direction is the thing to get right ---
console.log('\n=== 2. auxin -> offset -> angle. MORE AUXIN MUST MEAN MORE VERTICAL ===\n');
{
  const sp = { ...SPECIES_DEFAULTS, agoGain: 1.0, agoK: 0.45 };
  console.log('    auxin at the statocytes   offset      set point');
  let last = 1e9, mono = true;
  for (const iaa of [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.5, 2.0]) {
    const ago = agoOf(iaa, sp, DEFAULT_PRM);
    const th = gsaOf(ago) * DEG;
    if (th > last + 1e-9) mono = false;
    last = th;
    console.log(`    ${iaa.toFixed(2).padStart(21)}   ${ago.toFixed(4).padStart(7)}   ${th.toFixed(1).padStart(9)}deg`);
  }
  check('the map is monotone DECREASING — the sign that inverts the silhouette if wrong',
    mono, 'decreasing', 'decreasing');
  check('agoGain 0 is the orthotropic engine exactly',
    gsaOf(agoOf(0.001, { ...sp, agoGain: 0 }, DEFAULT_PRM)) === 0, 'set point 0', '0');
}

// --- the specimen -----------------------------------------------------------
const prm = { ...DEFAULT_PRM, T: 40, D: 6, mu: 0.3, rho: 0.6, b: 3 };
const mo = { ...MERISTEM_DEFAULTS, R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 };

// A vegetative run, for the same reasons `test/conifer.mjs` uses one: no
// florigen so nothing converts half way up and truncates the taper, one library
// leaf because canalising eight is the slow part and nothing here reads a blade.
const CONIFER = {
  florigenRate: 0, leafLibrary: 1, leafBudget: 8,
  maxOrgans: 400, organBudget: 6000, maxAxes: 70, maxGen: 1,
  // weak apical DOMINANCE and strong apical CONTROL, which is the 2x2 the
  // forestry literature insists on and the reason one exp(-d/lambda) could not
  // do both jobs. Buds escape close under the leader; what they then do is
  // decided by the partition.
  branching: 0.86, budRelease: 60, dominance: 6.0,
  apicalControl: 0.80,
  agoGain: 1.0, agoK: 0.9,
  elongation: 0.0052, organLen: 1.1, organTilt: 0.9,
  // a conifer's leader is straight; wander and circumnutation are what make a
  // herb lean, and they are species knobs that already existed
  wander: 0.05, nutAmp: 0.04,
  // A CONIFER IS WOODY AND THE ENGINE'S DEFAULT MODULUS IS NOT. 60 MPa is
  // herbaceous and right for all eight shipped species; softwood is 8-11 GPa
  // and branch wood, whose microfibril angle is 41-53 degrees, is 1-4.
  // `test/plagio.mjs` is the pre-flight: at 60 MPa a lateral held horizontal
  // has a tip slope of 16-268 degrees, so gravity does not hold a branch out,
  // it collapses it. This is one species entry and no engine change.
  stemOpts: { eModulus: 1.2e9 },
};

const fit = (pts) => {
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const m = sxy / (sxx || 1e-12);
  return { m, c: my - m * mx, r2: (sxy * sxy) / ((sxx * syy) || 1e-12), n };
};
const mean = (a, f) => a.reduce((s, o) => s + f(o), 0) / (a.length || 1);

function grow(over, want) {
  const sp = { ...CONIFER, ...over };
  const full = { ...SPECIES_DEFAULTS, ...sp };
  // `pts` drops its oldest point past 900, so past that the leader's arc
  // bookkeeping is measured from a base that is moving. Stay under it.
  const V0 = full.elongation + full.internode * full.internodeSpan;
  const steps = Math.min(want, Math.floor(0.88 * 900 * full.segLen / V0));
  const P = new Plant(prm, mo, sp, 11);
  const main = P.axes[0];
  const stamp = new Map();
  const addAxis = P.addAxis.bind(P);
  P.addAxis = (base, dir, gen, parentNode, parentAxis) => {
    const a = addAxis(base, dir, gen, parentNode, parentAxis);
    if (parentAxis === main) stamp.set(a, { aEsc: main.length, h: base[1] - P.origin[1] });
    return a;
  };
  for (let s = 0; s < steps; s++) P.step(1);
  const lat = [...stamp.entries()].filter(([a]) => a.gen === 1).map(([a, s]) => {
    const b = a.pts[0], t = a.tipPos();
    const dy = t[1] - b[1], dh = Math.hypot(t[0] - b[0], t[2] - b[2]);
    return {
      ...s, ax: a, L: a.length, vigour: a.vigour, iaa: a.iaa, gsa: a.gsa,
      rTip: Math.hypot(t[0] - P.origin[0], t[2] - P.origin[2]), zTip: t[1] - P.origin[1],
      rBase: Math.hypot(b[0] - P.origin[0], b[2] - P.origin[2]), zBase: b[1] - P.origin[1],
      theta: Math.atan2(dh, dy),
    };
  }).sort((x, y) => x.aEsc - y.aEsc);
  return { P, sp: full, steps, main, lat, aFin: main.length, H: main.tipPos()[1] - P.origin[1] };
}

// --- 3. the partition, against its closed form ------------------------------
console.log('\n=== 3. apical control: is a lateral (1-L)/L of the leader? ===\n');
console.log('        L    predicted (1-L)/L    measured mean    spread    n');
const runs = {};
for (const L of [0.5, 0.65, 0.75, 0.80, 0.9]) {
  const r = runs[L] = grow({ apicalControl: L }, 4000);
  const want = (1 - L) / L;
  const vs = r.lat.map(o => o.vigour);
  const got = mean(r.lat, o => o.vigour);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  console.log(`  ${L.toFixed(3).padStart(7)}    ${want.toFixed(4).padStart(16)}    ${got.toFixed(4).padStart(13)}    ${lo.toFixed(3)}-${hi.toFixed(3)}   ${String(vs.length).padStart(3)}`);
  check(`PREDICTION 3  L ${L}: every lateral is exactly (1-L)/L of the leader`,
    Math.abs(lo - want) < 1e-9 && Math.abs(hi - want) < 1e-9, `${lo.toFixed(6)}-${hi.toFixed(6)}`, want.toFixed(6));
}

// --- 3b. the full partition, run because it is falsified ---------------------
// PREDICTION 4 said the product over forks above a branch is a second-order
// term. It is not — it is the whole answer, and it points the wrong way. This
// section is the measurement that put `fluxPartition` at false, kept runnable
// so the negative stays reproducible rather than being a sentence in a commit.
console.log('\n=== 3b. the FULL flux partition, which is falsified and ships off ===\n');
{
  const fp = grow({ apicalControl: 0.80, fluxPartition: true }, 4000);
  const want = (1 - 0.80) / 0.80;
  const by = fp.lat.slice().sort((a, b) => a.aEsc - b.aEsc);
  const lo = mean(by.slice(0, 5), o => o.vigour), hi = mean(by.slice(-5), o => o.vigour);
  const f = fit(fp.lat.map(o => [o.aEsc, o.L]));
  console.log(`  closed form says every lateral should sit at ${want.toFixed(4)}`);
  console.log(`  lowest five branches, mean vigour:   ${lo.toFixed(4)}`);
  console.log(`  highest five branches, mean vigour:  ${hi.toFixed(4)}`);
  console.log(`  the leader's stream is re-concentrated at every fork it passes, so a`);
  console.log(`  branch attached higher taps a richer one: a ${(hi / lo).toFixed(2)}x taper of RATE,`);
  console.log(`  pointing the opposite way to the taper of TIME that makes the cone.`);
  console.log(`\n  resulting taper  L = ${f.m.toFixed(4)} * A_esc + ${f.c.toFixed(2)}   R2 ${f.r2.toFixed(4)}`);
  console.log(`  lengths ${Math.min(...fp.lat.map(o => o.L)).toFixed(2)}-${Math.max(...fp.lat.map(o => o.L)).toFixed(2)} on a leader of ${fp.aFin.toFixed(0)} — a bottlebrush.`);
  check('the full partition inverts the rate taper (this is the negative result)',
    hi > lo * 1.5, `${(hi / lo).toFixed(2)}x, high over low`, '> 1.5x, i.e. inverted');
  // ⚠ AND THE SIZE OF THAT IS L-DEPENDENT, which is worth stating because the
  // first version of this section asserted the taper was destroyed outright.
  // At L = 0.845 it is: R2 0.033, lengths 1.8-3.5, a bottlebrush. At L = 0.80
  // a taper survives but its slope collapses to a fraction of the closed
  // form's. So the honest claim is the weaker one — the product term is not a
  // second-order correction, it is comparable to the whole answer — and that
  // is what is asserted.
  const first = fit(runs[0.80].lat.map(o => [o.aEsc, o.L]));
  console.log(`  first-order slope for the same L: ${(-first.m).toFixed(4)}  against ${(-f.m).toFixed(4)} here`);
  check('the full partition collapses the taper slope by more than half',
    -f.m < -first.m * 0.5, `${(-f.m).toFixed(4)} vs ${(-first.m).toFixed(4)}`, 'under half');
}

// --- 4. the crown ------------------------------------------------------------
console.log('\n=== 4. the crown: angle, taper, and which end is wide ===\n');
const r = runs[0.80];
const zeta = r.H / r.aFin;
{
  const f = fit(r.lat.map(o => [o.aEsc, o.L]));
  console.log(`  ${r.steps} steps, seed 11, ${r.lat.length} laterals`);
  console.log(`  leader arc ${r.aFin.toFixed(2)}  height ${r.H.toFixed(2)}  zeta ${zeta.toFixed(3)}`);
  console.log(`  taper       L = ${f.m.toFixed(4)} * A_esc + ${f.c.toFixed(2)}   R2 ${f.r2.toFixed(4)}`);
  console.log(`  predicted   slope -k = ${(-(1 - r.sp.apicalControl) / r.sp.apicalControl).toFixed(4)} before PREDICTION 4's second-order tilt\n`);

  console.log('   A_esc  height   length   vigour     iaa   set point   actual angle');
  for (const o of r.lat) {
    console.log(`  ${o.aEsc.toFixed(1).padStart(6)}  ${o.h.toFixed(1).padStart(6)}  ${o.L.toFixed(2).padStart(7)}  ${o.vigour.toFixed(3).padStart(7)}  ${o.iaa.toFixed(3).padStart(6)}  ${(o.gsa * DEG).toFixed(1).padStart(9)}deg  ${(o.theta * DEG).toFixed(1).padStart(9)}deg`);
  }

  const thetaMean = mean(r.lat, o => o.theta);
  const byA = r.lat.slice().sort((a, b) => a.aEsc - b.aEsc);
  const low = byA.slice(0, Math.max(3, byA.length >> 2));
  const high = byA.slice(-Math.max(3, byA.length >> 2));
  const tl = mean(low, o => o.theta) * DEG, th = mean(high, o => o.theta) * DEG;
  console.log(`\n  mean branch angle from vertical: ${(thetaMean * DEG).toFixed(1)}deg   (pre-flight measured 25.0deg, orthotropic)`);
  console.log(`  lowest quarter of the crown:     ${tl.toFixed(1)}deg`);
  console.log(`  highest quarter of the crown:    ${th.toFixed(1)}deg`);

  // THE CONTROLLER'S OWN CHECK, and it is the tip direction rather than the
  // chord. A branch that turns from its near-vertical launch to its set point
  // and then runs straight has a chord somewhere between the two forever, so
  // the chord is a fact about the crown and not about whether the balance
  // works. What the balance controls is where the tip points.
  const tipEl = mean(r.lat, o => Math.acos(Math.max(-1, Math.min(1, o.ax.dir[1]))));
  const spMean = mean(r.lat, o => o.gsa);
  console.log(`  mean TIP direction:              ${(tipEl * DEG).toFixed(1)}deg against a mean set point of ${(spMean * DEG).toFixed(1)}deg`);
  check('the tips sit at the set point the statocyte balance asked for, within 8deg',
    Math.abs(tipEl - spMean) * DEG < 8, `${(tipEl * DEG).toFixed(1)} vs ${(spMean * DEG).toFixed(1)}`, 'within 8deg');
  check('branches hold an angle instead of being pulled vertical (pre-flight left them at 25.0deg)',
    thetaMean * DEG > 50, `${(thetaMean * DEG).toFixed(1)}deg`, '> 50deg');
  check('THE CROWN IS THE RIGHT WAY UP: lower branches lie flatter than upper ones',
    tl > th, `low ${tl.toFixed(1)}deg vs high ${th.toFixed(1)}deg`, 'low > high');

  // the envelope, measured off where the branch tips actually are
  const zTop = Math.max(...r.lat.map(o => o.zTip), r.H);
  let num = 0, den = 0;
  for (const o of r.lat) { const u = zTop - o.zTip; num += u * o.rTip; den += u * u; }
  const measured = Math.atan(num / (den || 1e-12)) * DEG;
  const half = (k, t, z) => Math.atan2(k * Math.sin(t), z - k * Math.cos(t)) * DEG;
  const closed = half(-f.m, thetaMean, zeta);
  console.log(`\n  MEASURED crown half-angle, off ${r.lat.length} branch tips:  ${measured.toFixed(1)}deg`);
  console.log(`  PREDICTION 5, closed form at measured k and theta: ${closed.toFixed(1)}deg`);
  console.log(`  a Norway spruce:                                   12deg (8-15)`);
  check('PREDICTION 5  measurement and closed form agree within 8deg',
    Math.abs(measured - closed) <= 8, `${measured.toFixed(1)} vs ${closed.toFixed(1)}`, 'within 8deg');

  // widest quarter of the crown, by height. The vase was widest at the TOP and
  // four numeric sections of the pre-flight missed it; this is the number that
  // would have caught it.
  const zs = r.lat.map(o => o.zBase);
  const zlo = Math.min(...zs), zhi = Math.max(...zs);
  const bin = (i) => r.lat.filter(o => {
    const u = (o.zBase - zlo) / Math.max(1e-6, zhi - zlo);
    return u >= i / 4 && u < (i + 1) / 4 + (i === 3 ? 1e-6 : 0);
  });
  console.log('\n  crown radius by quarter, bottom to top:');
  const rad = [];
  for (let i = 0; i < 4; i++) {
    const b = bin(i);
    const rr = b.length ? Math.max(...b.map(o => o.rTip)) : 0;
    rad.push(rr);
    console.log(`    quarter ${i + 1}  n ${String(b.length).padStart(2)}  widest tip radius ${rr.toFixed(2)}`);
  }
  check('the crown is widest in its lower half, not its upper',
    Math.max(rad[0], rad[1]) > Math.max(rad[2], rad[3]),
    `lower ${Math.max(rad[0], rad[1]).toFixed(2)} vs upper ${Math.max(rad[2], rad[3]).toFixed(2)}`,
    'lower wider');
}

// --- 5. the same thing, drawn ------------------------------------------------
// Section 3b of `test/conifer.mjs` is the reason this is here: four numeric
// sections, a closed form and a 4x sweep all agreed with each other while the
// specimen was the wrong shape AND the wrong way up, and ten lines of ASCII
// caught it in one look.
console.log('\n=== 5. the crown, drawn. Left: as it grows. Right: a spruce at 12deg ===\n');
{
  const SPRUCE = 12;
  const zTop = Math.max(...r.lat.map(o => o.zTip), r.H);
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
    for (const sgn of [1, -1]) {
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        put(grid, sgn * (o.rBase + t * (o.rTip - o.rBase)), o.zBase + t * (o.zTip - o.zBase), i === 60 ? '*' : '-');
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
  for (let i = 0; i < ROWS; i++) {
    console.log('  ' + grid[i].join('').replace(/\s+$/, '').padEnd(HALFW * 2 + 3) + ' ' + ref[i].join('').replace(/\s+$/, ''));
  }
  console.log(`\n  each column ${perCol.toFixed(2)} world units, each row ${perRow.toFixed(2)} -- drawn to true angle.`);
}

console.log(fails ? `\n${fails} CHECK(S) FAILED\n` : '\nall checks passed\n');
process.exit(fails ? 1 : 0);
