// ---------------------------------------------------------------------------
// THE BLADE
//
// The same auxin engine, on a different piece of geometry, doing the other
// thing it can do.
//
// Auxin is made along the growing margin. Up-the-gradient polarisation breaks
// that margin into discrete convergence points — those are the teeth and lobes.
// Each convergence point accumulates auxin until it crosses the switch, flips
// to with-the-flux polarisation, and canalises a strand back to the petiole.
// That strand is a vein.
//
// Serration and venation are not two systems here. They are one system either
// side of a threshold, which is the claim Bayer and Cieslak make about the
// real thing.
// ---------------------------------------------------------------------------

import { CellField, stepAuxin, MAXNB } from './10_auxin.js';
import { Margin } from './25_margin.js';
import { TAU, clamp, smoothstep, mulberry32, lerp } from './00_math.js';

export const LEAF_DEFAULTS = {
  nu: 46,            // cells along the blade
  nv: 25,            // cells across the blade at its widest
  srcRho: 1.6,       // auxin made at each convergence point
  srcSpacing: 0.055, // how close two sources may be
  srcEvery: 14,      // frames between recruiting a new source
  maxSources: 70,
  interiorSrc: 0.08, // chance a source lands inside the blade, not on the margin
  petioleU: 0.045,
  petioleMu: 6.0,    // the base of the blade is the sink everything drains to
  bodyMu: 0.045,     // low turnover, so auxin reaches the sink instead of decaying
  grow: 0.0022,      // blade expansion per frame
  matureAt: 900,     // frames until the vein pattern is frozen and baked
  veinFrac: 0.40,    // share of a cell's PIN on one wall for it to be a canal
  veinMax: 260,     // strongest N canals are drawn
  veinFloor: 0.004,  // and it must carry real traffic, not just be lopsided
  shapeP: 0.75,      // outline exponents — these make the silhouette
  shapeQ: 0.85,
  lobes: 3.0,        // marginal undulation
  lobeDepth: 0.16,
  fenestrate: 0.0,   // programmed cell death between veins (monstera holes)
  aspect: 0.44,      // width / length
  furl: 0.42,        // how tightly the immature tip is rolled
  laminaComp: 0.12,  // gradient competence inside the blade
};

export class Leaf {
  constructor(prm, opts = {}, seed = 1) {
    this.o = { ...LEAF_DEFAULTS, ...opts };
    // the blade runs both polarisation modes; that is the whole point
    this.prm = { ...prm, rho: 0, mu: 0 };
    // Kept so this leaf can be grown again. `(prm, o, seed)` reproduces a blade
    // exactly — same lattice, same sources, same vein network down to the last
    // segment — which is what lets the close-up replay a leaf's own
    // canalisation slowly enough to watch. `test/lamina.mjs` asserts it.
    this.seed = seed;
    this.rnd = mulberry32(seed);
    this.age = 0;
    this.scale = 0.06;      // blades start tiny and expand
    this.mature = false;
    this.veins = null;      // baked geometry once mature
    // Phase one: grow the outline. Nothing about this leaf's shape exists yet.
    this.margin = new Margin(prm, this.o.margin || {}, seed ^ 0x9e37);
    this.built = false;
  }

  // half-width on one side of the midrib, read off the grown margin
  wSide(u, sgn) {
    return this.margin.mature ? this.margin.half(u, sgn) : 0;
  }

  // The silhouette is no longer a formula. It is whatever the margin grew.
  widthAt(u) {
    if (!this.margin.mature) return 0;
    if (u <= 0 || u >= 1) return 0;
    return Math.max(this.margin.half(u, -1), this.margin.half(u, 1));
  }

  _build() {
    const o = this.o;
    const F = new CellField(o.nu * o.nv + 8);
    this.F = F;
    this.index = new Int32Array(o.nu * o.nv).fill(-1);
    const du = 1 / (o.nu - 1);
    const dv = 1 / (o.nv - 1);
    for (let r = 0; r < o.nu; r++) {
      const u = r * du;
      // The lamina has to be cut to the SAME outline the blade is drawn with.
      // The two halves of the margin patterned independently, so using one
      // half-width for both sides leaves tissue — and veins — hanging outside
      // the leaf on whichever side came out narrower.
      const hwL = this.wSide(u, -1), hwR = this.wSide(u, 1);
      for (let c = 0; c < o.nv; c++) {
        // triangular lattice: alternate rows are offset by half a cell
        const v = ((c + (r & 1 ? 0.5 : 0)) * dv - 0.5) * 2;
        const yy = v * o.aspect;
        if (Math.abs(yy) > (yy < 0 ? hwL : hwR)) continue;
        // jitter so canals cannot snap to the lattice axes
        const jx = (this.rnd() - 0.5) * du * 0.45;
        const jy = (this.rnd() - 0.5) * dv * 0.45;
        const i = F.add(u + jx, v * o.aspect + jy, 0.05);
        if (i < 0) continue;
        this.index[r * o.nv + c] = i;
        F.comp[i] = 1;
      }
    }
    this.rows = o.nu; this.cols = o.nv;
    this._link();
    this._classify();
  }

  _link() {
    const F = this.F, o = this.o;
    const at = (r, c) => (r < 0 || r >= o.nu || c < 0 || c >= o.nv) ? -1 : this.index[r * o.nv + c];
    for (let r = 0; r < o.nu; r++) {
      for (let c = 0; c < o.nv; c++) {
        const i = at(r, c);
        if (i < 0) continue;
        const odd = r & 1 ? 1 : 0;
        const nbrs = [at(r, c + 1), at(r + 1, c - 1 + odd), at(r + 1, c + odd)];
        for (const j of nbrs) {
          if (j < 0 || j <= i) continue;
          const dx = F.x[j] - F.x[i], dy = F.y[j] - F.y[i];
          const d = Math.hypot(dx, dy) || 1e-4;
          F.link(i, j, clamp(0.024 / d, 0.25, 1.0));
        }
      }
    }
  }

  // Who makes auxin and who drains it. Discrete sources appear near the margin
  // as the blade expands — these stand for the convergence points that mark
  // future teeth and hydathodes. The petiole is the one sink. Everything
  // between them is undifferentiated blade.
  _classify() {
    const F = this.F, o = this.o;
    this.isMargin = new Uint8Array(F.n);
    this.sources = [];
    this._teeth = [];
    for (let i = 0; i < F.n; i++) {
      const u = F.x[i];
      const hw = this.wSide(u, F.y[i] < 0 ? -1 : 1);
      const edge = hw - Math.abs(F.y[i]);
      this.isMargin[i] = (edge < 0.055 || u > 0.94) ? 1 : 0;
      F.rho[i] = 0;
      F.mu[i] = o.bodyMu;
      F.comp[i] = 1;
      if (u < o.petioleU) { F.mu[i] = o.petioleMu; this.isMargin[i] = 0; }
    }
    // every convergence point the margin made becomes a vein source, which is
    // why a real leaf has a strand running out to every tooth
    for (const t of this.margin.teeth) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < F.n; i++) {
        if (F.rho[i] > 0) continue;
        const d = Math.hypot(F.x[i] - t.u, F.y[i] - t.v);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && bd < 0.12) { F.rho[best] = o.srcRho; this.sources.push(best); }
    }
  }

  // Add one source where the blade is emptiest — new tissue is what makes room
  // for a new convergence point, so the pattern refines as the leaf expands.
  addSource() {
    const F = this.F, o = this.o;
    let best = -1, bestD = -1;
    for (let i = 0; i < F.n; i++) {
      if (F.x[i] < 0.10 || F.rho[i] > 0) continue;
      // sources sit at or near the margin, as hydathodes do
      if (!this.isMargin[i] && this.rnd() > o.interiorSrc) continue;
      let d = 9;
      for (const sIdx of this.sources) {
        const dd = Math.hypot(F.x[i] - F.x[sIdx], F.y[i] - F.y[sIdx]);
        if (dd < d) d = dd;
      }
      d *= 0.75 + 0.5 * this.rnd();     // a little disorder, as in real leaves
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best < 0 || bestD < o.srcSpacing) return false;
    F.rho[best] = o.srcRho;
    this.sources.push(best);
    return true;
  }

  step(dt = 1) {
    if (this.mature) return;
    if (!this.built) {
      this.margin.step(dt);
      if (this.margin.mature) {
        this.o.aspect = Math.max(0.12, this.margin.aspect);
        this._build();
        this.built = true;
      }
      return;
    }
    this.age += dt;
    const o = this.o;
    this.scale = Math.min(1, this.scale + o.grow * dt);
    // the blade keeps recruiting sources while it is still expanding
    if (this.age % o.srcEvery < dt && this.sources.length < o.maxSources) this.addSource();
    for (let s = 0; s < this.prm.substeps; s++) stepAuxin(this.F, this.prm, 'flux');
    if (this.age > o.matureAt) this.bake();
  }

  // Freeze the vein network into drawable geometry. After this the leaf costs
  // nothing per frame, which is what lets a whole plant stay interactive.
  bake() {
    const F = this.F, o = this.o;
    const segs = [];
    // A canal is a cell that has committed most of its transport to ONE wall.
    // So an edge counts as a vein by its share of the cell's polarity, not by
    // its absolute PIN — otherwise only the trunk, where all the flux funnels,
    // ever clears the bar.
    const frac = new Float32Array(F.n * MAXNB);
    for (let i = 0; i < F.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      let tot = 0;
      for (let k = 0; k < d; k++) tot += F.pi[off + k];
      if (tot <= 1e-9) continue;
      for (let k = 0; k < d; k++) frac[off + k] = F.pi[off + k] / tot;
    }
    let maxPi = 1e-9;
    for (let i = 0; i < F.n * MAXNB; i++) if (F.pi[i] > maxPi) maxPi = F.pi[i];
    for (let i = 0; i < F.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      for (let k = 0; k < d; k++) {
        const e = off + k, j = F.nbr[e];
        if (j <= i) continue;
        const f = Math.max(frac[e], frac[F.rev[e]]);
        const mag = Math.max(F.pi[e], F.pi[F.rev[e]]);
        if (f < o.veinFrac || mag < maxPi * o.veinFloor) continue;
        segs.push({
          x0: F.x[i], y0: F.y[i], x1: F.x[j], y1: F.y[j],
          mag,   // raw traffic; turned into a drawn order below
          f,
        });
      }
    }
    // Keep the network that carries the traffic. Drawing every lopsided wall
    // turns a leaf into a solid sheet of light; the hierarchy is the point.
    segs.sort((a, b) => b.mag - a.mag);
    this.veins = segs.slice(0, o.veinMax);
    // Order of a vein: how much traffic it carries, log-compressed — traffic
    // spans three orders of magnitude across a blade, and vein calibre goes
    // like its logarithm (the same Murray's-law reasoning as the stem taper).
    //
    // Normalise against the range the SURVIVING veins actually occupy, not
    // against maxPi. maxPi is the maximum over every wall in the tissue,
    // including the ones that never became veins at all, so dividing by it
    // leaves the bottom of the 0..1 range unreachable by construction and
    // squashes a genuine 15x hierarchy into about 1.5x of drawn width. The
    // engine finds the hierarchy; this is only what stops it being thrown
    // away on the way to the screen. See TUNING.md.
    let lo = Infinity, hi = 0;
    for (const s of this.veins) { if (s.mag < lo) lo = s.mag; if (s.mag > hi) hi = s.mag; }
    const l0 = Math.log(1 + lo), l1 = Math.log(1 + hi);
    const span = l1 - l0;
    for (const s of this.veins) {
      s.w = span > 1e-6 ? clamp((Math.log(1 + s.mag) - l0) / span, 0, 1) : 1;
    }
    this.maxPi = maxPi;
    this.mature = true;
  }

  // distance from a blade point to the nearest vein — drives fenestration
  // and the way light pools around the vasculature
  veinDistanceField(res = 40) {
    const segs = this.veins || [];
    const fld = new Float32Array(res * res).fill(9);
    for (let a = 0; a < res; a++) {
      for (let b = 0; b < res; b++) {
        const u = a / (res - 1);
        const v = (b / (res - 1) - 0.5) * 2 * this.o.aspect;
        let best = 9;
        for (const s of segs) {
          const dx = s.x1 - s.x0, dy = s.y1 - s.y0;
          const L2 = dx * dx + dy * dy || 1e-6;
          let t = ((u - s.x0) * dx + (v - s.y0) * dy) / L2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = s.x0 + dx * t - u, py = s.y0 + dy * t - v;
          const d = Math.hypot(px, py);
          if (d < best) best = d;
        }
        fld[a * res + b] = best;
      }
    }
    this.vdf = fld; this.vdfRes = res;
    return fld;
  }

  stats() {
    const F = this.F;
    let mx = 0, sum = 0, veins = 0, maxPi = 0;
    for (let i = 0; i < F.n; i++) { sum += F.a[i]; if (F.a[i] > mx) mx = F.a[i]; }
    for (let i = 0; i < F.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      for (let k = 0; k < d; k++) if (F.pi[off + k] > maxPi) maxPi = F.pi[off + k];
    }
    for (let i = 0; i < F.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      for (let k = 0; k < d; k++) if (F.nbr[off + k] > i && F.pi[off + k] > maxPi * 0.05) veins++;
    }
    return {
      cells: F.n, aMean: +(sum / F.n).toFixed(2), aMax: +mx.toFixed(2),
      maxPi: +maxPi.toFixed(2), veinEdges: veins,
    };
  }
}
