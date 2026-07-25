// ---------------------------------------------------------------------------
// THE LEAF MARGIN
//
// The last thing in this piece that was drawn rather than grown was the leaf
// silhouette — a width function I wrote. This replaces it.
//
// The margin is a chain of epidermal cells running from the petiole, around the
// tip, and back. The same auxin engine runs along that chain in up-the-gradient
// mode, so it breaks into evenly spaced convergence points on its own. Each
// convergence point drives outgrowth along the local outward normal: that is a
// tooth. Between them the margin barely moves: that is a sinus.
//
// The feedback that matters is this — as the leaf grows the margin gets longer,
// which makes room for more convergence points, which makes more teeth. Nobody
// decides how many lobes a leaf has. It is however many fit.
//
// Bilsborough et al. (2011) is the paper this follows.
// ---------------------------------------------------------------------------

import { CellField, stepAuxin, MAXNB } from './10_auxin.js';
import { clamp, lerp, smoothstep, mulberry32, TAU } from './00_math.js';

export const MARGIN_DEFAULTS = {
  maxPts: 620,
  seedPts: 17,
  seedR: 0.055,
  dMax: 0.030,      // insert a cell when the margin stretches past this
  dMin: 0.011,      // merge cells that crowd closer than this
  baseGuard: 0.10,  // fraction of the chain nearest the petiole that is held
  g0: 0.00030,      // baseline outgrowth of the whole margin
  g1: 0.00115,      // extra outgrowth where auxin has converged
  gExp: 2.2,        // how sharply outgrowth answers to auxin
  ax: 1.00,         // proximodistal growth
  ay: 0.62,         // mediolateral growth — the leaf's slenderness
  smooth: 0.16,     // resistance of the margin to kinking
  tipBias: 0.55,    // extra drive toward the distal end early on
  mature: 1400,
  // the chain's own chemistry
  rho: 0.24, mu: 0.30, T: 26, D: 7.0, b: 3.0, sink: 7.0,
};

export class Margin {
  constructor(prm, opts = {}, seed = 1) {
    const o = this.o = { ...MARGIN_DEFAULTS, ...opts };
    this.rnd = mulberry32(seed);
    this.prm = { ...prm, T: o.T, D: o.D, b: o.b, rho: 0, mu: 0 };
    this.F = new CellField(o.maxPts);
    this.age = 0;
    this.teeth = [];      // convergence points, in material coordinates
    this._seedChain();
  }

  _seedChain() {
    const o = this.o, F = this.F;
    for (let i = 0; i < o.seedPts; i++) {
      const th = -Math.PI / 2 + Math.PI * i / (o.seedPts - 1);
      F.add(Math.cos(th) * o.seedR * 1.25, Math.sin(th) * o.seedR,
        0.25 + this.rnd() * 0.25);
    }
    this.link();
  }

  link() {
    const F = this.F;
    F.clearTopology();
    for (let i = 0; i < F.n - 1; i++) F.link(i, i + 1, 1);
  }

  // outward normal of a counter-clockwise chain is (dy, -dx)
  normalAt(i, out) {
    const F = this.F, n = F.n;
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const dx = F.x[b] - F.x[a], dy = F.y[b] - F.y[a];
    const L = Math.hypot(dx, dy) || 1e-6;
    out[0] = dy / L; out[1] = -dx / L;
    return out;
  }

  step(dt = 1) {
    if (this.mature) return;
    const F = this.F, o = this.o, prm = this.prm;
    this.age += dt;

    // --- chemistry along the chain -----------------------------------------
    const n = F.n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += F.a[i];
    const mean = sum / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      F.rho[i] = o.rho;
      F.mu[i] = o.mu;
      F.comp[i] = 1;
      // auxin drains out of both ends into the petiole
      const edge = Math.min(s, 1 - s);
      if (edge < 0.05) F.mu[i] += o.sink * (1 - edge / 0.05);
    }
    for (let k = 0; k < prm.substeps; k++) stepAuxin(F, prm, 'grad');

    // --- outgrowth ----------------------------------------------------------
    const nx = this._nx || (this._nx = new Float32Array(o.maxPts));
    const ny = this._ny || (this._ny = new Float32Array(o.maxPts));
    const nrm = [0, 0];
    const early = 1 - smoothstep(0, o.mature * 0.45, this.age);
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const guard = smoothstep(0, o.baseGuard, Math.min(s, 1 - s));
      // early on the whole thing pushes distally; later it is auxin that decides
      const distal = 1 + o.tipBias * early * Math.sin(s * Math.PI);
      const drive = Math.pow(Math.max(0, F.a[i] / Math.max(1e-4, mean)), o.gExp);
      const rate = (o.g0 + o.g1 * drive) * guard * distal * dt;
      this.normalAt(i, nrm);
      nx[i] = nrm[0] * rate * o.ax;
      ny[i] = nrm[1] * rate * o.ay;
    }
    for (let i = 0; i < n; i++) { F.x[i] += nx[i]; F.y[i] += ny[i]; }

    // --- the margin resists kinking ----------------------------------------
    const sm = o.smooth;
    for (let i = 1; i < n - 1; i++) {
      nx[i] = sm * (F.x[i - 1] + F.x[i + 1] - 2 * F.x[i]);
      ny[i] = sm * (F.y[i - 1] + F.y[i + 1] - 2 * F.y[i]);
    }
    for (let i = 1; i < n - 1; i++) { F.x[i] += nx[i]; F.y[i] += ny[i]; }

    this.resample();
    this.link();
    if (this.age > o.mature) this.finish();
  }

  // A growing margin needs more cells, and that lengthening is what lets new
  // convergence points appear — which is where extra teeth come from.
  resample() {
    const F = this.F, o = this.o;
    for (let i = F.n - 2; i >= 0; i--) {
      const dx = F.x[i + 1] - F.x[i], dy = F.y[i + 1] - F.y[i];
      const d = Math.hypot(dx, dy);
      if (d > o.dMax && F.n < o.maxPts - 2) this._insert(i, 0.5);
      else if (d < o.dMin && F.n > 24 && i > 1 && i < F.n - 3) this._merge(i);
    }
  }

  _insert(i, t) {
    const F = this.F;
    const x = lerp(F.x[i], F.x[i + 1], t), y = lerp(F.y[i], F.y[i + 1], t);
    const a = lerp(F.a[i], F.a[i + 1], t), p = lerp(F.p[i], F.p[i + 1], t);
    const j = F.add(x, y, a);
    if (j < 0) return;
    F.p[j] = p;
    // shift the tail up by one to keep the chain in order
    for (let k = F.n - 1; k > i + 1; k--) {
      F.x[k] = F.x[k - 1]; F.y[k] = F.y[k - 1];
      F.a[k] = F.a[k - 1]; F.p[k] = F.p[k - 1]; F.id[k] = F.id[k - 1];
    }
    F.x[i + 1] = x; F.y[i + 1] = y; F.a[i + 1] = a; F.p[i + 1] = p;
    F.id[i + 1] = F.nextId++;
  }

  _merge(i) {
    const F = this.F;
    F.x[i] = (F.x[i] + F.x[i + 1]) * 0.5;
    F.y[i] = (F.y[i] + F.y[i + 1]) * 0.5;
    F.a[i] = (F.a[i] + F.a[i + 1]) * 0.5;
    for (let k = i + 1; k < F.n - 1; k++) {
      F.x[k] = F.x[k + 1]; F.y[k] = F.y[k + 1];
      F.a[k] = F.a[k + 1]; F.p[k] = F.p[k + 1]; F.id[k] = F.id[k + 1];
    }
    F.n--;
  }

  // Freeze the outline, normalise it into blade coordinates, and hand on the
  // convergence points — each of those becomes a vein source, which is why a
  // real leaf has a vein running to every tooth.
  finish() {
    const F = this.F, o = this.o;
    const n = F.n;
    let x0 = 1e9, x1 = -1e9, ymax = 1e-6;
    for (let i = 0; i < n; i++) {
      if (F.x[i] < x0) x0 = F.x[i];
      if (F.x[i] > x1) x1 = F.x[i];
      if (Math.abs(F.y[i]) > ymax) ymax = Math.abs(F.y[i]);
    }
    const L = Math.max(1e-6, x1 - x0);
    this.length = L;
    this.aspect = ymax / L;

    // outline as half-widths either side of the midrib, sampled along it
    const NS = 96;
    const wl = new Float32Array(NS), wr = new Float32Array(NS);
    for (let i = 0; i < n; i++) {
      const u = clamp((F.x[i] - x0) / L, 0, 1);
      const k = Math.min(NS - 1, Math.round(u * (NS - 1)));
      const v = F.y[i] / L;
      if (v < 0) { if (-v > wl[k]) wl[k] = -v; }
      else if (v > wr[k]) wr[k] = v;
    }
    // fill any sample the margin skipped, then relax the pair a little
    const fill = (w) => {
      for (let k = 1; k < NS; k++) if (w[k] === 0) w[k] = w[k - 1];
      for (let k = NS - 2; k >= 0; k--) if (w[k] === 0) w[k] = w[k + 1];
      // one light pass only — smoothing here would erase the teeth the
      // chemistry just spent its whole development making
      for (let k = 1; k < NS - 1; k++) w[k] = (w[k - 1] + 6 * w[k] + w[k + 1]) * 0.125;
      w[0] = 0; w[NS - 1] = 0;
    };
    fill(wl); fill(wr);
    this.wl = wl; this.wr = wr; this.NS = NS;

    // convergence points: local auxin maxima along the chain
    let sum = 0;
    for (let i = 0; i < n; i++) sum += F.a[i];
    const mean = sum / n;
    this.teeth = [];
    for (let i = 2; i < n - 2; i++) {
      if (F.a[i] < mean * 1.6) continue;
      if (F.a[i] < F.a[i - 1] || F.a[i] < F.a[i + 1]) continue;
      this.teeth.push({
        u: clamp((F.x[i] - x0) / L, 0, 1),
        v: F.y[i] / L,
        a: F.a[i],
      });
    }
    this.mature = true;
  }

  // half-width on one side of the midrib, in units of leaf length
  half(u, sgn) {
    if (!this.wl) return 0;
    const NS = this.NS;
    const f = clamp(u, 0, 1) * (NS - 1);
    const i = Math.min(NS - 2, Math.floor(f));
    const t = f - i;
    const w = sgn < 0 ? this.wl : this.wr;
    return lerp(w[i], w[i + 1], t);
  }
}
