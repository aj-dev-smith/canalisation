import { Leaf } from '../src/30_leaf.js';
import { DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';
const over = JSON.parse(process.argv[2] || '{}');
const lo = JSON.parse(process.argv[3] || '{}');
const seed = +(process.argv[4] || 4);
const prm = { ...DEFAULT_PRM, ...over };
// NOTE seed 4 is one of the ~31% of leaves that grow a futile tip eddy (see
// JOURNAL.md). It is kept as the default precisely because it is the hard case,
// but do not read it as typical — pass a seed as argv[4] to compare.
const L = new Leaf(prm, lo, seed);
// The interior lattice does not exist until the margin has finished patterning,
// so stats() can only be asked for after that. Step until mature rather than to
// a fixed count — margin `mature` is randomised per leaf.
let s = 0, lattice = 0;
while (!L.mature && s < 8000) {
  L.step(1); s++;
  if (!lattice && L.F) { lattice = s; console.log('lattice at', s, JSON.stringify(L.stats())); }
}
console.log('mature at', s, JSON.stringify(L.stats()));

// Vein hierarchy. The blade draws each vein at width (0.25 + w*1.35), so the
// spread of w is what the eye actually receives — see 50_geom.js.
const ws = L.veins.map(v => v.w).sort((a, b) => b - a);
const mg = L.veins.map(v => v.mag).sort((a, b) => b - a);
const q = (a, f) => a[Math.min(a.length - 1, (a.length * f) | 0)];
const dw = (w) => 0.25 + w * 1.35;
console.log('veins:', L.veins.length, 'maxPI:', L.maxPi.toFixed(2));
console.log('  raw traffic   max/median', (mg[0] / q(mg, 0.5)).toFixed(1) + 'x');
console.log('  drawn width   max/min   ', (dw(ws[0]) / dw(ws[ws.length - 1])).toFixed(2) + 'x',
  ' max/median', (dw(ws[0]) / dw(q(ws, 0.5))).toFixed(2) + 'x');
console.log('  w  median', q(ws, 0.5).toFixed(3), ' min', ws[ws.length - 1].toFixed(3));

// Is the midrib at the base, where the sink is? And is the tip circulating
// futilely rather than delivering? A closed flux loop reinforces itself and gets
// drawn as heavy vasculature while carrying nothing. See JOURNAL.md.
{
  const F = L.F, U = 0.85, cross = [], basal = [], apical = [];
  for (let i = 0; i < F.n; i++) {
    const d = F.deg[i], off = i * MAXNB;
    for (let k = 0; k < d; k++) {
      const e = off + k, j = F.nbr[e];
      if (F.x[i] < U && F.x[j] >= U) cross.push(F.J[F.rev[e]]);  // +ve = toward base
      if (j <= i) continue;
      const u = (F.x[i] + F.x[j]) / 2, m = Math.max(F.pi[e], F.pi[F.rev[e]]);
      if (u < 0.2) basal.push(m); else if (u >= 0.8) apical.push(m);
    }
  }
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const gB = cross.filter(v => v > 0).reduce((a, v) => a + v, 0);
  const gA = -cross.filter(v => v < 0).reduce((a, v) => a + v, 0);
  const ratio = mean(basal) / Math.max(1e-9, mean(apical));
  const circ = gA / Math.max(1e-9, gB);
  console.log('  base/tip pi  ', ratio.toFixed(2) + 'x',
    ratio < 0.5 ? ' INVERTED — tip outweighs the midrib' : ' midrib is at the base, correct');
  console.log('  tip circ     ', (circ * 100).toFixed(0) + '%',
    circ > 0.75 ? ' futile eddy (>75% predicts inversion)' : ' delivering');
  console.log('  net to base  ', cross.reduce((a, v) => a + v, 0).toFixed(1),
    ' (gross basal', gB.toFixed(1) + ', apical', gA.toFixed(1) + ')');
}

// crude ASCII picture of the vein network
const W = 64, H = 26;
const g = Array.from({ length: H }, () => new Array(W).fill(' '));
for (const v of L.veins) {
  for (let t = 0; t <= 12; t++) {
    const x = v.x0 + (v.x1 - v.x0) * t / 12, y = v.y0 + (v.y1 - v.y0) * t / 12;
    const cx = Math.round(x * (W - 1)), cy = Math.round((y / L.o.aspect * 0.5 + 0.5) * (H - 1));
    if (cx >= 0 && cx < W && cy >= 0 && cy < H) g[cy][cx] = v.w > 0.75 ? '#' : (v.w > 0.5 ? '+' : '.');
  }
}
console.log(g.map(r => r.join('')).join('\n'));
