// Does the blade have anything to SHOW at cell resolution?
//
// The meristem close-up works because the needles visibly converge on a point.
// The claim for the leaf is the other half of the same sentence: needles fall
// into LINE, and that line is a vein. This harness checks that claim is in the
// numbers before any of it is drawn.
//
//   usage: node test/lamina.mjs '{}' '{}' [seed]
//
// Three questions:
//   1. do needles get MORE polarised over time (is there motion to watch)?
//   2. at maturity, are needles on a vein more polarised than needles between
//      veins (is there contrast, or is the whole blade one lamp)?
//   3. do the needles on a vein point ALONG it (does the line read as a line)?

import { Leaf } from '../src/30_leaf.js';
import { DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';

const over = JSON.parse(process.argv[2] || '{}');
const lo = JSON.parse(process.argv[3] || '{}');
const seed = +(process.argv[4] || 7);
const prm = { ...DEFAULT_PRM, ...over };
const L = new Leaf(prm, lo, seed);

// The needle the renderer will draw: the PIN-weighted mean wall direction.
// This is F.P, the allocated carrier, not F.pi — same quantity meristemDome
// already draws, so the numbers here describe the actual picture.
function needle(F, i) {
  const d = F.deg[i], off = i * MAXNB;
  let px = 0, py = 0, tot = 0;
  for (let k = 0; k < d; k++) {
    const e = off + k, j = F.nbr[e];
    const ex = F.x[j] - F.x[i], ey = F.y[j] - F.y[i];
    const el = Math.hypot(ex, ey) || 1;
    const w = F.P[e];
    px += w * ex / el; py += w * ey / el; tot += w;
  }
  if (tot <= 1e-9) return null;
  px /= tot; py /= tot;
  const pol = Math.hypot(px, py);
  return pol < 1e-6 ? null : { x: px / pol, y: py / pol, pol };
}

function polStats(F) {
  let sum = 0, n = 0, strong = 0;
  for (let i = 0; i < F.n; i++) {
    const nd = needle(F, i);
    if (!nd) continue;
    sum += nd.pol; n++;
    if (nd.pol > 0.5) strong++;
  }
  return { mean: n ? sum / n : 0, strong: n ? strong / n : 0, n };
}

// Candidate channels for needle LENGTH and BRIGHTNESS. Direction is settled —
// it is the PIN-weighted wall direction above — but how committed a cell is has
// more than one plausible measure, and they do not agree. See below.
//
//   polP  — |mean wall direction| weighted by allocated PIN. What the meristem
//           close-up already draws.
//   frac  — the share of a cell's flux-mode PIN sitting on its single busiest
//           wall. This is the quantity bake() thresholds to call a wall a vein,
//           so it is the model's OWN definition of "this cell is a canal".
//   flux  — the largest net flux through any of the cell's walls: traffic.
function channels(F, i) {
  const d = F.deg[i], off = i * MAXNB;
  let tot = 0, mx = 0, flux = 0;
  for (let k = 0; k < d; k++) {
    const e = off + k;
    tot += F.pi[e];
    if (F.pi[e] > mx) mx = F.pi[e];
    if (F.J[e] > flux) flux = F.J[e];
  }
  return { frac: tot > 1e-9 ? mx / tot : 0, flux };
}

// --- 1. is there motion to watch? ------------------------------------------
// Sample while the blade canalises. The margin has to finish patterning before
// the lattice exists at all, so the clock starts at `lattice`.
console.log('# needles falling into line');
console.log('  step   cells   mean|pol|  frac>0.5');
let s = 0, lattice = 0, next = 0;
const series = [];
while (!L.mature && s < 8000) {
  L.step(1); s++;
  if (!lattice && L.F) { lattice = s; next = s; }
  if (lattice && s >= next) {
    const st = polStats(L.F);
    if (st.n) series.push({ age: s - lattice, ...st });
    console.log(`  ${String(s - lattice).padStart(5)}  ${String(st.n).padStart(5)}` +
      `   ${st.mean.toFixed(3).padStart(8)}  ${(st.strong * 100).toFixed(1).padStart(7)}%`);
    next = s + 150;
  }
}
const fin = polStats(L.F);
console.log(`  ${String(s - lattice).padStart(5)}  ${String(fin.n).padStart(5)}` +
  `   ${fin.mean.toFixed(3).padStart(8)}  ${(fin.strong * 100).toFixed(1).padStart(7)}%   (mature)`);
console.log('  lattice at', lattice, ' mature at', s);
if (series.length) {
  const rise = fin.mean / Math.max(1e-9, series[0].mean);
  console.log('  rise over the run', rise.toFixed(2) + 'x',
    rise > 1.15 ? ' — needles do visibly commit' : ' — FLAT, nothing to watch');
}

// --- 2 & 3. contrast and alignment at maturity ------------------------------
// A cell is "on a vein" if one of its walls survived into the baked network.
const F = L.F;
const onVein = new Uint8Array(F.n);
const veinDir = new Float32Array(F.n * 2);
{
  // rebuild the index the bake used, so a cell can be matched to its vein
  const key = new Map();
  for (let i = 0; i < F.n; i++) key.set(`${F.x[i].toFixed(6)},${F.y[i].toFixed(6)}`, i);
  for (const v of L.veins) {
    const a = key.get(`${v.x0.toFixed(6)},${v.y0.toFixed(6)}`);
    const b = key.get(`${v.x1.toFixed(6)},${v.y1.toFixed(6)}`);
    const dx = v.x1 - v.x0, dy = v.y1 - v.y0;
    const dl = Math.hypot(dx, dy) || 1;
    for (const i of [a, b]) {
      if (i === undefined) continue;
      // keep the heaviest vein through this cell — that is the line the eye reads
      if (!onVein[i] || v.w > veinDir[i * 2 + 1] * 0) { onVein[i] = 1; }
      veinDir[i * 2] = dx / dl; veinDir[i * 2 + 1] = dy / dl;
    }
  }
}
const acc = { polP: [0, 0], frac: [0, 0], flux: [0, 0] };
let vN = 0, aN = 0, alSum = 0, alN = 0;
for (let i = 0; i < F.n; i++) {
  const nd = needle(F, i);
  if (!nd) continue;
  const ch = channels(F, i);
  const s = onVein[i] ? 0 : 1;
  acc.polP[s] += nd.pol; acc.frac[s] += ch.frac; acc.flux[s] += ch.flux;
  if (onVein[i]) {
    vN++;
    const c = Math.abs(nd.x * veinDir[i * 2] + nd.y * veinDir[i * 2 + 1]);
    alSum += c; alN++;
  } else aN++;
}
console.log('\n# contrast at maturity — which channel separates vein from areole?');
console.log(`  ${vN} cells on a vein, ${aN} in between`);
console.log('  channel   on a vein   in between      ratio');
for (const k of ['polP', 'frac', 'flux']) {
  const v = vN ? acc[k][0] / vN : 0, a = aN ? acc[k][1] / aN : 0;
  const r = v / Math.max(1e-9, a);
  console.log(`  ${k.padEnd(8)}  ${v.toFixed(4).padStart(9)}   ${a.toFixed(4).padStart(9)}` +
    `  ${(r.toFixed(2) + 'x').padStart(9)}` +
    (r > 1.3 ? '   veins stand out' : '   FLAT — reads as one lamp'));
}
console.log('  alignment   ', (alN ? alSum / alN : 0).toFixed(3),
  '|cos| between needle and its vein (1 = dead along it, 0.5 = random)');

// --- is a leaf reproducible? ------------------------------------------------
// The close-up grows the blade you are pointing at a second time, slowly, so
// the canalisation can be watched. That is only honest if the second growing
// IS the first one — if it drifted, the view would end on a vein network the
// leaf in front of you does not have.
{
  const R = new Leaf(prm, L.o, L.seed);
  let r = 0;
  while (!R.mature && r < 8000) { R.step(1); r++; }
  const same = L.veins.length === R.veins.length && L.veins.every((v, i) =>
    v.x0 === R.veins[i].x0 && v.y0 === R.veins[i].y0 &&
    v.x1 === R.veins[i].x1 && v.y1 === R.veins[i].y1 && v.w === R.veins[i].w);
  console.log('\n# replay');
  console.log('  steps', s, '->', r, ' cells', L.F.n, '->', R.F.n,
    ' veins', L.veins.length, '->', R.veins.length);
  console.log('  ' + (same
    ? 'identical — the replay lands on the blade it is standing in front of'
    : 'DIVERGED — the close-up would end on the wrong vein network'));
  if (!same) process.exitCode = 1;
}

// --- the picture the renderer is going to draw ------------------------------
// Needle direction as a character, brightness as case: a strongly polarised
// cell is upper case. Vein files should read as runs of the same character.
const W = 72, H = 30;
const g = Array.from({ length: H }, () => new Array(W).fill(' '));
const glyph = (a) => {
  const k = ((Math.round(a / (Math.PI / 4)) % 4) + 4) % 4;
  return ['-', '\\', '|', '/'][k];
};
for (let i = 0; i < F.n; i++) {
  const nd = needle(F, i);
  const cx = Math.round(F.x[i] * (W - 1));
  const cy = Math.round((F.y[i] / L.o.aspect * 0.5 + 0.5) * (H - 1));
  if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
  if (!nd) { g[cy][cx] = '.'; continue; }
  const ch = glyph(Math.atan2(nd.y, nd.x));
  g[cy][cx] = nd.pol > 0.5 ? ch.toUpperCase() : (nd.pol > 0.25 ? ch : '.');
}
console.log('\n# needle field (case = committed, . = apolar)');
console.log(g.map(r => r.join('')).join('\n'));
