// IS THE VENATION PARALLEL OR RETICULATE?
//
// A monocot leaf is not "a narrow dicot leaf". The discriminator is not the
// silhouette, it is the vasculature:
//
//   reticulate — ONE dominant midrib, secondaries branching off it at an angle,
//                a net between them.
//   parallel   — SEVERAL co-equal bundles running the length of the blade,
//                cross-linked only by fine commissurals.
//
// THE ANSWER THIS HARNESS WAS BUILT TO GET IS NEGATIVE, AND IT IS IN JOURNAL.md
// under 2026-07-30. A narrow blade does NOT canalise parallel venation. It
// makes the same reticulate hierarchy with fewer bundles in it. Do not re-run
// the aspect-ratio sweep expecting a different answer; read the entry first.
//
// It prints five numbers, and the last two are the only ones to trust:
//
//   axial   — traffic-weighted fraction of vein running up the blade rather
//             than across it. Measured in LATTICE units, not material ones —
//             see the note at the metric.
//   strands — how many baked veins cross the mid-blade line u=0.5.
//   domin   — fattest crossing vein over the median crossing vein.
//             *** DO NOT DRAW CONCLUSIONS FROM THIS ONE. *** It is computed on
//             the baked vein list, so it inherits veinFrac, veinFloor and
//             veinMax, and a denser network flattens it for free. On two seeds
//             it said 1.3 for a strap against 3.4 for a dicot and looked like a
//             discovery; on eight seeds and on raw traffic the effect is not
//             there. It is kept only so the trap stays visible.
//   n50/top — the same question asked of raw wall traffic, with no threshold,
//             no cap and no dependence on network density. These are the ones
//             that decided it.
//
// usage: node venation.mjs '<prm>' '<leafOpts>' [seed]
//   dicot control:  node test/venation.mjs '{}' '{"veinMax":3000}' 7
//   strap:          node test/venation.mjs '{}' '{"nu":72,"nv":21,"veinMax":3000,
//                     "margin":{"ay":0.03,"D":1.2,"T":52,"dMax":0.018,
//                     "dMin":0.007,"maxPts":900}}' 7

import { Leaf } from '../src/30_leaf.js';
import { DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';

const over = JSON.parse(process.argv[2] || '{}');
const lo = JSON.parse(process.argv[3] || '{}');
const seed = +(process.argv[4] || 7);
const prm = { ...DEFAULT_PRM, ...over };

const L = new Leaf(prm, lo, seed);
let s = 0;
while (!L.mature && s < 12000) { L.step(1); s++; }
if (!L.veins) { console.log(JSON.stringify({ error: 'never matured', steps: s })); process.exit(1); }

const V = L.veins;

// --- 1. axial fraction, weighted by traffic --------------------------------
// MEASURE THIS IN LATTICE UNITS, NOT MATERIAL ONES. `_link` joins each cell to
// (same row, next col) and to two diagonals — there is NO pure along-blade
// link. So in material coordinates the most axial segment a vein can possibly
// be made of is already ~40deg off axis, and a 20deg threshold reports 0.00 for
// every leaf ever grown. The first version of this harness did exactly that and
// the dicot control is what caught it.
//
// In units of the lattice spacing a diagonal is (1 row, 0.5 col) = 26.6deg and
// a cross-link is (0 rows, 1 col) = 90deg, so 45deg separates the two cleanly
// and the number means "share of traffic running up the blade rather than
// across it".
const asp = L.o.aspect;
const du = 1 / (L.o.nu - 1);
const dvy = 2 * asp / (L.o.nv - 1);
let wAx = 0, wTot = 0;
for (const v of V) {
  const nx = (v.x1 - v.x0) / du, ny = (v.y1 - v.y0) / dvy;
  const len = Math.hypot(nx, ny);
  if (len < 1e-9) continue;
  const ang = Math.atan2(Math.abs(ny), Math.abs(nx)) * 180 / Math.PI;
  wTot += v.mag * len;
  if (ang < 45) wAx += v.mag * len;
}

// --- 2 & 3. strands crossing mid-blade, and the midrib's dominance ----------
// A "strand" is a vein segment straddling u=0.5. Two segments belonging to the
// same bundle would both straddle only if the bundle doubled back, so counting
// straddles counts bundles.
const cross = V.filter(v => (v.x0 - 0.5) * (v.x1 - 0.5) <= 0);
cross.sort((a, b) => b.mag - a.mag);
const med = cross.length ? cross[cross.length >> 1].mag : 0;
const domin = med > 1e-12 ? cross[0].mag / med : Infinity;

// spread of the crossing bundles across the blade — a grass fills the width,
// a dicot midrib sits on the centreline
const ys = cross.map(v => Math.abs((v.y0 + v.y1) / 2) / asp).sort((a, b) => a - b);
const ySpread = ys.length ? ys[ys.length >> 1] : 0;

// --- 3b. the threshold-free version of the same question -------------------
// `domin` above is computed on the BAKED vein list, so it inherits veinFrac,
// veinFloor and veinMax. The strap's network is proportionally denser than the
// dicot's (veins per cell 0.98 vs 0.65), which could manufacture a flat
// hierarchy all by itself. So ask the same question of the raw traffic, over
// every wall that crosses mid-blade whether or not it was called a vein:
//
//   n50 — how many crossing walls carry half of all the traffic crossing.
//         A midrib is ONE strand doing most of the work, so a dicot should sit
//         near 1. Co-equal bundles share it out, so a grass should be several.
//   top — the single largest crossing wall's share of crossing traffic.
//
// Neither depends on a threshold, a cap, or how dense the drawn network is.
const F = L.F;
const mags = [];
for (let i = 0; i < F.n; i++) {
  const d = F.deg[i], off = i * MAXNB;
  for (let k = 0; k < d; k++) {
    const e = off + k, j = F.nbr[e];
    if (j <= i) continue;
    if ((F.x[i] - 0.5) * (F.x[j] - 0.5) > 0) continue;
    mags.push(Math.max(F.pi[e], F.pi[F.rev[e]]));
  }
}
mags.sort((a, b) => b - a);
const sum = mags.reduce((a, b) => a + b, 0);
let acc = 0, n50 = 0;
for (const m of mags) { acc += m; n50++; if (acc >= sum * 0.5) break; }
const top = sum > 0 ? mags[0] / sum : 0;

console.log(JSON.stringify({
  steps: s,
  aspect: +asp.toFixed(3),
  cells: L.F.n,
  veins: V.length,
  vPerCell: +(V.length / L.F.n).toFixed(2),
  axial: +(wAx / (wTot || 1)).toFixed(3),
  strands: cross.length,
  domin: +domin.toFixed(2),
  walls: mags.length,
  n50,
  top: +top.toFixed(3),
  ySpread: +ySpread.toFixed(2),
}));

// --- ASCII, isotropic-ish so the eye can check the numbers -----------------
const W = 96, H = 21;
const g = Array.from({ length: H }, () => new Array(W).fill(' '));
const hi = Math.max(...V.map(v => v.mag));
for (const v of V) {
  const n = Math.max(2, Math.ceil(Math.hypot(v.x1 - v.x0, (v.y1 - v.y0) / asp) * 60));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = v.x0 + (v.x1 - v.x0) * t, y = (v.y0 + (v.y1 - v.y0) * t) / asp;
    const px = Math.round(x * (W - 1));
    const py = Math.round((H - 1) / 2 + y * (H - 1) / 2);
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const c = v.mag > hi * 0.30 ? '#' : v.mag > hi * 0.06 ? '+' : '.';
    const cur = g[py][px];
    if (cur === '#' || (cur === '+' && c === '.')) continue;
    g[py][px] = c;
  }
}
console.log(g.map(r => r.join('')).join('\n'));
