// ---------------------------------------------------------------------------
// THE FRUIT
//
// The leaf margin was a ring of cells that pushed outward wherever auxin had
// converged. This is the same idea closed into a surface.
//
// Two phases, both chemistry:
//
//   1. PLACEMENT. Auxin runs over the ovary wall in up-the-gradient mode and
//      breaks into convergence points, exactly as it does on a meristem or a
//      leaf margin. Those points are the ovules. How many there are, and how
//      they sit, is whatever the geometry allowed — nobody counts them.
//
//   2. SWELLING. Those ovules become seeds, and seeds are auxin sources. Auxin
//      spreads out through the wall and the wall grows in proportion. Where
//      seeds cluster the fruit bulges; between them it stays pinched. The
//      lobing of the fruit is a readout of where the seeds landed.
//
// This is why you can set fruit on an unpollinated flower by painting auxin on
// it. No pollen is simulated here and none is needed — parthenocarpy is real.
//
// Then it ripens, as an autocatalytic front: the ripening signal triggers its
// own production, so it crosses the fruit as a travelling wave rather than
// fading in everywhere at once.
//
// The one simplification: growth is radial from the centre. Cells keep their
// direction and only change their distance. A fruit is therefore always
// star-shaped about its core, which almost every real fruit is, and it removes
// any possibility of the surface folding through itself as it lobes.
// ---------------------------------------------------------------------------

import { CellField, stepAuxin, MAXNB } from './10_auxin.js';
import { clamp, lerp, smoothstep, mulberry32 } from './00_math.js';

export const FRUIT_DEFAULTS = {
  subdiv: 3,          // icosphere refinement; 3 gives 642 wall cells
  patternFor: 520,    // frames spent deciding where the ovules go
  growFor: 1500,      // frames of swelling
  r0: 0.10,           // ovary radius at fertilisation
  seedRho: 0.85,      // auxin made by each seed
  wallMu: 0.46,
  gWall: 0.00016,     // baseline swelling of the whole wall
  gAux: 0.00052,      // extra swelling where the seeds have delivered auxin
  gExp: 1.8,         // how sharply the wall answers to auxin
  smooth: 0.020,     // the wall resists creasing — applied every step, so tiny
  seedThresh: 1.45,   // auxin needed, over the mean, to become an ovule
  ripenRate: 0.022,  // autocatalytic gain of the ripening front
  ripenDiff: 0.13,
  ripenAt: 0.72,      // fraction of swelling done before ripening starts
  // the wall's own chemistry while it is deciding where the seeds go
  T: 22, D: 2.6, b: 3.0, rho: 0.5, mu: 0.34,
};

// --- icosphere -------------------------------------------------------------
function icosphere(subdiv) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; });
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < subdiv; s++) {
    const mid = new Map();
    const nf = [];
    const midpoint = (a, b) => {
      const k = a < b ? a * 100000 + b : b * 100000 + a;
      let m = mid.get(k);
      if (m !== undefined) return m;
      const p = [(verts[a][0] + verts[b][0]) / 2, (verts[a][1] + verts[b][1]) / 2, (verts[a][2] + verts[b][2]) / 2];
      const l = Math.hypot(p[0], p[1], p[2]);
      m = verts.length;
      verts.push([p[0] / l, p[1] / l, p[2] / l]);
      mid.set(k, m);
      return m;
    };
    for (const f of faces) {
      const a = midpoint(f[0], f[1]), b = midpoint(f[1], f[2]), c = midpoint(f[2], f[0]);
      nf.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]);
    }
    faces = nf;
  }
  return { verts, faces };
}

export class Fruit {
  constructor(prm, opts = {}, seed = 1) {
    const o = this.o = { ...FRUIT_DEFAULTS, ...opts };
    this.rnd = mulberry32(seed);
    const { verts, faces } = icosphere(o.subdiv);
    const n = verts.length;
    this.n = n;
    this.faces = faces;
    this.dir = new Float32Array(n * 3);
    this.rad = new Float32Array(n);
    this.pos = new Float32Array(n * 3);
    this.nrm = new Float32Array(n * 3);
    this.ripe = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.dir[i * 3] = verts[i][0];
      this.dir[i * 3 + 1] = verts[i][1];
      this.dir[i * 3 + 2] = verts[i][2];
      this.rad[i] = o.r0 * (0.97 + 0.06 * this.rnd());
    }
    this.prm = { ...prm, T: o.T, D: o.D, b: o.b, rho: 0, mu: 0 };
    this.F = new CellField(n);
    for (let i = 0; i < n; i++) this.F.add(0, 0, 0.3 + 0.4 * this.rnd());
    // the wall's neighbour graph is the mesh's own edges
    const seen = new Set();
    for (const f of faces) {
      for (let e = 0; e < 3; e++) {
        const a = f[e], b = f[(e + 1) % 3];
        const k = a < b ? a * 100000 + b : b * 100000 + a;
        if (seen.has(k)) continue;
        seen.add(k);
        this.F.link(Math.min(a, b), Math.max(a, b), 1);
      }
    }
    this.phase = 'pattern';
    this.age = 0;
    this.seeds = [];
    this.ripening = false;
    this.mature = false;
    this.updatePositions();
  }

  // --- phase 1: where do the ovules go? ------------------------------------
  patternStep(dt) {
    const F = this.F, o = this.o;
    for (let i = 0; i < this.n; i++) { F.rho[i] = o.rho; F.mu[i] = o.mu; F.comp[i] = 1; }
    for (let k = 0; k < this.prm.substeps; k++) stepAuxin(F, this.prm, 'grad');
    this.age += dt;
    if (this.age < o.patternFor) return;

    let sum = 0;
    for (let i = 0; i < this.n; i++) sum += F.a[i];
    const mean = sum / this.n;
    this.seeds = [];
    for (let i = 0; i < this.n; i++) {
      if (F.a[i] < mean * o.seedThresh) continue;
      const d = F.deg[i], off = i * MAXNB;
      let isMax = true;
      for (let k = 0; k < d; k++) if (F.a[F.nbr[off + k]] > F.a[i]) { isMax = false; break; }
      if (isMax) this.seeds.push(i);
    }
    // an ovary with nothing in it does not set fruit
    if (!this.seeds.length) { this.barren = true; this.mature = true; return; }
    for (let i = 0; i < this.n; i++) F.a[i] = 0.05;
    this.phase = 'grow';
    this.age = 0;
  }

  // --- phase 2: the seeds feed the wall and the wall swells ----------------
  growStep(dt) {
    const F = this.F, o = this.o;
    for (let i = 0; i < this.n; i++) { F.rho[i] = 0; F.mu[i] = o.wallMu; F.comp[i] = 1; }
    for (const s of this.seeds) F.rho[s] = o.seedRho;
    for (let k = 0; k < this.prm.substeps; k++) stepAuxin(F, this.prm, 'flux');

    let sum = 0;
    for (let i = 0; i < this.n; i++) sum += F.a[i];
    const mean = Math.max(1e-4, sum / this.n);

    const g = this._g || (this._g = new Float32Array(this.n));
    for (let i = 0; i < this.n; i++) {
      const drive = Math.pow(Math.max(0, F.a[i] / mean), o.gExp);
      g[i] = this.rad[i] + (o.gWall + o.gAux * drive) * dt;
    }
    // the wall is a sheet, so it resists creasing between neighbours
    for (let i = 0; i < this.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      let s = 0;
      for (let k = 0; k < d; k++) s += g[F.nbr[off + k]];
      this.rad[i] = lerp(g[i], s / Math.max(1, d), o.smooth);
    }
    this.updatePositions();

    this.age += dt;
    if (!this.ripening && this.age > o.growFor * o.ripenAt) this.startRipening();
    if (this.ripening) this.ripenStep(dt);
    if (this.age > o.growFor) { this.phase = 'ripe'; this.mature = true; }
  }

  // --- phase 3: ripening as a self-feeding wave ----------------------------
  startRipening() {
    this.ripening = true;
    // it starts somewhere, and where it starts is arbitrary — in a real fruit
    // it is usually the end furthest from the stalk
    let best = 0, by = -1e9;
    for (let i = 0; i < this.n; i++) {
      const y = this.pos[i * 3 + 1] + this.rnd() * 0.2;
      if (y > by) { by = y; best = i; }
    }
    this.ripe[best] = 0.35;
  }

  ripenStep(dt) {
    const F = this.F, o = this.o;
    const R = this.ripe;
    const nx = this._rn || (this._rn = new Float32Array(this.n));
    for (let i = 0; i < this.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      let lap = 0;
      for (let k = 0; k < d; k++) lap += R[F.nbr[off + k]] - R[i];
      // autocatalysis: the signal provokes its own production
      nx[i] = o.ripenRate * R[i] * (1 - R[i]) + o.ripenDiff * lap / Math.max(1, d);
    }
    for (let i = 0; i < this.n; i++) R[i] = clamp(R[i] + nx[i] * dt, 0, 1);
  }

  step(dt = 1) {
    if (this.done) return;
    if (this.mature && this.phase === 'ripe') {
      if (!this.ripening) { this.done = true; return; }
      this.ripenStep(dt);
      // once the wave has crossed the whole fruit there is nothing left to do
      let s = 0;
      for (let i = 0; i < this.n; i++) s += this.ripe[i];
      if (s / this.n > 0.985) this.done = true;
      return;
    }
    if (this.mature) return;
    if (this.phase === 'pattern') this.patternStep(dt);
    else this.growStep(dt);
  }

  updatePositions() {
    const n = this.n, P = this.pos, D = this.dir, N = this.nrm;
    for (let i = 0; i < n; i++) {
      P[i * 3] = D[i * 3] * this.rad[i];
      P[i * 3 + 1] = D[i * 3 + 1] * this.rad[i];
      P[i * 3 + 2] = D[i * 3 + 2] * this.rad[i];
    }
    N.fill(0);
    for (const f of this.faces) {
      const a = f[0] * 3, b = f[1] * 3, c = f[2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
      const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      for (const v of f) { N[v * 3] += nx; N[v * 3 + 1] += ny; N[v * 3 + 2] += nz; }
    }
    for (let i = 0; i < n; i++) {
      const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1;
      N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l;
    }
  }

  stats() {
    let mn = 1e9, mx = -1e9, sum = 0, rp = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.rad[i] < mn) mn = this.rad[i];
      if (this.rad[i] > mx) mx = this.rad[i];
      sum += this.rad[i];
      rp += this.ripe[i];
    }
    const mean = sum / this.n;
    return {
      phase: this.phase, cells: this.n, seeds: this.seeds.length,
      rMin: +mn.toFixed(3), rMax: +mx.toFixed(3), rMean: +mean.toFixed(3),
      lobing: +((mx - mn) / mean).toFixed(2),
      ripe: +(rp / this.n).toFixed(2),
    };
  }
}
