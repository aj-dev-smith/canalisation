// ---------------------------------------------------------------------------
// SHOOT APICAL MERISTEM
//
// A growing sheet of cells. Cells are displaced outward by v(r) = G r, they
// divide to keep the epidermis at roughly constant density, and they leave the
// meristem at the rim. The auxin engine runs on this sheet in gradient mode.
//
// Auxin maxima appear spontaneously. Each committed maximum becomes a
// primordium, which then acts as a sink — that draining is the *only* source of
// lateral inhibition in this model. The divergence angle is never written down
// anywhere; it is measured.
// ---------------------------------------------------------------------------

import { CellField, stepAuxin, stepInhibitor, MAXNB } from './10_auxin.js';
import { TAU, mulberry32, angDelta, clamp, smoothstep } from './00_math.js';

class HashGrid {
  constructor(cell, cap) {
    this.cell = cell;
    this.head = new Int32Array(4096).fill(-1);
    this.next = new Int32Array(cap).fill(-1);
    this.mask = 4095;
  }
  key(cx, cy) {
    return ((cx * 73856093) ^ (cy * 19349663)) & this.mask;
  }
  build(x, y, n) {
    this.head.fill(-1);
    const c = this.cell;
    for (let i = 0; i < n; i++) {
      const k = this.key(Math.floor(x[i] / c), Math.floor(y[i] / c));
      this.next[i] = this.head[k];
      this.head[k] = i;
    }
  }
  // calls cb(j) for every candidate within one cell ring of (px,py)
  query(px, py, cb) {
    const c = this.cell;
    const cx = Math.floor(px / c), cy = Math.floor(py / c);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        let j = this.head[this.key(cx + dx, cy + dy)];
        while (j !== -1) { cb(j); j = this.next[j]; }
      }
  }
}

export const MERISTEM_DEFAULTS = {
  R: 10.0,          // radius at which cells leave the meristem
  rCZ: 2.4,         // central zone: auxin-competent but organ-incompetent
  rOut: 0,           // outer competence edge (0 = none)
  rPZ: 6.8,         // beyond here auxin drains into the provasculature below
  d0: 1.0,          // target cell spacing
  G: 0.003,        // relative expansion rate per frame, v(r) = G r
  linkR: 1.62,      // wall detection radius, in units of d0
  spotGrace: 45,     // frames a maximum may go missing before it is written off
  keepFrac: 0.45,    // survival threshold, as a fraction of the birth threshold
  organR: 1.9,       // radius of tissue recruited as an organ's founder cells
  organDrain: 0.3,   // export of auxin from founder cells into the stem below
  rimDrain: 1.2,
  czWidth: 0.9,      // how sharply competence switches on at the CZ boundary
  detectA: 1.7,      // a maximum must stand this far above the field mean
  persist: 8,       // frames a maximum must persist before it is committed
  mergeR: 2.2,      // two maxima this close are the same maximum (numerics only)
  noise: 0.05,      // per-cell variation in auxin production
  maxCells: 3600,
};

export class Meristem {
  constructor(prm, opts = {}, seed = 1) {
    this.o = { ...MERISTEM_DEFAULTS, ...opts };
    this.prm = prm;
    this.rnd = mulberry32(seed);
    this.F = new CellField(this.o.maxCells);
    this.grid = new HashGrid(this.o.d0 * this.o.linkR, this.o.maxCells);
    this.primordia = [];     // live sinks inside the meristem
    this.emitted = [];       // queue consumed by the plant
    this.divergence = [];    // measured angles between successive primordia
    this.lastAngle = null;
    this.time = 0;
    this.plastochron = 0;
    this.lastEmit = 0;
    this.candidates = [];    // persistent maxima, tracked by position not index
    this.aMean = 1;
    this._crowd = new Int32Array(this.o.maxCells);
    this._seedTissue();
    this.rebuild();
  }

  _seedTissue() {
    const { R, d0 } = this.o;
    const F = this.F;
    // hexagonal-ish seeding with jitter, then let relaxation sort it out
    const dy = d0 * 0.866;
    for (let gy = -R / dy - 1; gy <= R / dy + 1; gy++) {
      for (let gx = -R / d0 - 1; gx <= R / d0 + 1; gx++) {
        const x = (gx + (gy & 1 ? 0.5 : 0)) * d0 + (this.rnd() - 0.5) * d0 * 0.25;
        const y = gy * dy + (this.rnd() - 0.5) * d0 * 0.25;
        if (Math.hypot(x, y) < R) {
          const i = F.add(x, y, 0.4 + this.rnd() * 0.9);
          // spread cells through the division cycle so they do not divide in lockstep
          if (i >= 0) F.sz[i] = 1 + this.rnd() * 0.85;
        }
      }
    }
    for (let i = 0; i < F.n; i++) F.aux0[i] = 1 + (this.rnd() - 0.5) * 2 * this.o.noise;
  }

  // per-cell production jitter, keyed to stable ids so it does not flicker
  _jitter(i) {
    const h = Math.imul(this.F.id[i] ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    return 1 + ((h & 0xffff) / 65535 - 0.5) * 2 * this.o.noise;
  }

  rebuild() {
    const F = this.F, o = this.o;
    const lim = o.d0 * o.linkR, lim2 = lim * lim;
    this.grid.build(F.x, F.y, F.n);
    F.clearTopology();
    for (let i = 0; i < F.n; i++) {
      const xi = F.x[i], yi = F.y[i];
      this.grid.query(xi, yi, (j) => {
        if (j <= i) return;
        const dx = F.x[j] - xi, dy = F.y[j] - yi;
        const d2 = dx * dx + dy * dy;
        if (d2 < lim2 && d2 > 1e-9) {
          // wall conductance falls off with cell separation
          F.link(i, j, 1.0 - 0.45 * (Math.sqrt(d2) / lim));
        }
      });
    }
  }

  // Physical relaxation: cells push each other apart to a target spacing.
  // The last pass also records how crowded each cell is, which is what decides
  // division — measured space, not a clock, so the sheet cannot drift out of
  // balance with its own division rate.
  relax(iters = 2) {
    const F = this.F, o = this.o, d0 = o.d0;
    const crowdR = d0 * 1.25, crowdR2 = crowdR * crowdR;
    for (let it = 0; it < iters; it++) {
      const record = it === iters - 1;
      this.grid.build(F.x, F.y, F.n);
      for (let i = 0; i < F.n; i++) {
        let px = 0, py = 0, cnt = 0;
        const xi = F.x[i], yi = F.y[i];
        this.grid.query(xi, yi, (j) => {
          if (j === i) return;
          const dx = xi - F.x[j], dy = yi - F.y[j];
          const d2 = dx * dx + dy * dy;
          if (d2 < crowdR2) cnt++;
          const d = Math.sqrt(d2);
          if (d > 1e-6 && d < d0) {
            const f = (d0 - d) / d0;
            px += (dx / d) * f; py += (dy / d) * f;
          }
        });
        F.x[i] = xi + px * 0.42 * d0;
        F.y[i] = yi + py * 0.42 * d0;
        if (record) {
          this._crowd[i] = cnt;
          // remembered cell size, used only for drawing the mosaic
          F.sz[i] = 0.9 * F.sz[i] + 0.1 * (cnt >= 6 ? 0.85 : cnt >= 4 ? 1.0 : 1.25);
        }
      }
    }
  }

  // Cells grow with the tissue and divide at twice their target area; cells
  // that reach the rim have left the meristem. Together these hold the
  // epidermis at constant density while the sheet expands under it.
  prune() {
    const F = this.F, o = this.o;
    for (let i = F.n - 1; i >= 0; i--) {
      if (Math.hypot(F.x[i], F.y[i]) > o.R) F.remove(i);
    }
  }

  // A cell whose neighbourhood has thinned out has, in effect, grown too large:
  // it divides. Expansion opens the gaps; division fills them.
  divide() {
    const F = this.F, o = this.o;
    const n0 = F.n;
    const rimGuard = o.R - o.d0 * 1.3;
    for (let i = 0; i < n0 && F.n < o.maxCells - 2; i++) {
      if (this._crowd[i] >= 5) continue;
      const r = Math.hypot(F.x[i], F.y[i]);
      // low neighbour counts at the rim are geometry, not a gap
      if (r > rimGuard && this._crowd[i] >= 3) continue;
      const th = this.rnd() * TAU;
      const off = 0.32 * o.d0;
      const dx = Math.cos(th) * off, dy = Math.sin(th) * off;
      const j = F.add(F.x[i] + dx, F.y[i] + dy, F.a[i]);
      if (j < 0) break;
      F.x[i] -= dx; F.y[i] -= dy;
      F.p[j] = F.p[i];
      F.sz[j] = F.sz[i];
      F.organ[j] = F.organ[i];   // founder-cell identity is heritable
      this._crowd[i] = 6; this._crowd[j] = 6;
    }
  }

  // an organ's position is the centre of mass of its founder cells, so it moves
  // only as fast as the tissue carries it
  trackOrgans() {
    const F = this.F;
    const sx = new Map(), sy = new Map(), sn = new Map();
    for (let i = 0; i < F.n; i++) {
      const oid = F.organ[i];
      if (!oid) continue;
      sx.set(oid, (sx.get(oid) || 0) + F.x[i]);
      sy.set(oid, (sy.get(oid) || 0) + F.y[i]);
      sn.set(oid, (sn.get(oid) || 0) + 1);
    }
    for (let k = this.primordia.length - 1; k >= 0; k--) {
      const p = this.primordia[k];
      if (!p.emitted) continue;
      const n = sn.get(p.id);
      if (!n) { this.primordia.splice(k, 1); continue; }
      p.x = sx.get(p.id) / n; p.y = sy.get(p.id) / n;
      p.r = Math.hypot(p.x, p.y);
      p.cells = n;
      p.matched = true; p.miss = 0;
      // Once the organ has cleared the peripheral zone it has left the
      // meristem: it stops competing for the meristem's auxin and goes on
      // being a leaf somewhere else.
      if (p.r > this.o.R * 0.97) {
        // released: it is leaving the meristem, so it stops being special
        for (let i = 0; i < F.n; i++) if (F.organ[i] === p.id) F.organ[i] = 0;
        this.primordia.splice(k, 1);
      }
    }
  }

  step(dt) {
    const F = this.F, o = this.o, prm = this.prm;
    this.time += dt;

    // --- tissue growth: displace every cell down the velocity field v = G r
    const g = 1 + o.G * dt;
    for (let i = 0; i < F.n; i++) { F.x[i] *= g; F.y[i] *= g; F.age[i] += dt; }
    for (const p of this.primordia) {
      p.x *= g; p.y *= g;
      p.r = Math.hypot(p.x, p.y);
      p.age += dt;
    }
    this.trackOrgans();

    this.prune();
    this.relax(1);
    this.divide();
    this.rebuild();

    // --- sources and sinks ---------------------------------------------------
    // A primordium drains only the handful of cells it actually occupies. The
    // inhibition field that spaces the next organ is not drawn here — it is the
    // depletion halo that diffusion carves around that sink, and its reach is
    // sqrt(D/mu), a real length scale of the tissue.
    const cw = o.czWidth;
    for (let i = 0; i < F.n; i++) {
      F.rho[i] = prm.rho * this._jitter(i);
      let m = prm.mu;
      const xi = F.x[i], yi = F.y[i];
      // PIN competence: the central zone's stem cells do not polarise the way
      // peripheral-zone cells do, so patterning is confined to the flank.
      const rr = Math.hypot(xi, yi);
      let cmp = smoothstep(o.rCZ - cw, o.rCZ + cw, rr);
      // outer edge of the competent ring: beyond it tissue is committed and no
      // longer able to found an organ. Narrowing this ring is the experiment.
      if (o.rOut > 0) cmp *= 1 - smoothstep(o.rOut - cw, o.rOut + cw, rr);
      // where the long-range signal is strong, a cell can still carry auxin but
      // can no longer sharpen a gradient into a new maximum
      if (prm.rhoI > 0) {
        const q = F.inh[i] / prm.kI;
        cmp *= 1 / (1 + q * q);
      }
      F.comp[i] = cmp;
      // Founder cells of an organ keep exporting auxin downward into the
      // provasculature for as long as they exist. They are anchored in the
      // tissue, so this drain travels outward with them — that is the memory
      // that keeps the pattern from re-arranging itself into a jammed lattice.
      if (F.organ[i] > 0) m += o.organDrain;
      // Below the peripheral zone the tissue is already committed: auxin there
      // is pulled down into the developing provasculature. That drain is what
      // confines organ initiation to a ring, rather than any rule saying so.
      const r = Math.hypot(xi, yi);
      if (r > o.rPZ) {
        const t = clamp((r - o.rPZ) / Math.max(1e-3, o.R - o.rPZ), 0, 1);
        m += o.rimDrain * t * t * (3 - 2 * t);
      }
      F.mu[i] = m;
    }

    // --- solve ---------------------------------------------------------------
    // An agent, if one is resident, deforms the rates this function just wrote
    // and is put back immediately afterwards — so nothing downstream can read a
    // deformed value and no baseline can go stale. See 15_pathogen.js.
    const inf = F.inf;
    if (inf) inf.apply();
    for (let s = 0; s < prm.substeps; s++) {
      stepAuxin(F, prm, 'grad');
      if (prm.rhoI > 0) stepInhibitor(F, prm);
    }
    if (inf) { inf.revert(); inf.step(prm.dt * prm.substeps); }

    if (!o.detectOff) this.detect();
  }

  // diagnostics: how spotty is the field, and at what wavelength?
  patternStats() {
    const F = this.F, o = this.o;
    let sum = 0, mx = 0, mn = 1e9;
    for (let i = 0; i < F.n; i++) { sum += F.a[i]; if (F.a[i] > mx) mx = F.a[i]; if (F.a[i] < mn) mn = F.a[i]; }
    const mean = sum / (F.n || 1);
    const peaks = [];
    for (let i = 0; i < F.n; i++) {
      const r = Math.hypot(F.x[i], F.y[i]);
      if (r > o.R * 0.9) continue;
      const d = F.deg[i], off = i * MAXNB;
      if (d < 3) continue;
      let isMax = true;
      for (let k = 0; k < d; k++) if (F.a[F.nbr[off + k]] >= F.a[i]) { isMax = false; break; }
      if (isMax && F.a[i] > mean * 1.2) peaks.push([F.x[i], F.y[i], F.a[i]]);
    }
    let spacing = 0;
    if (peaks.length > 1) {
      let s = 0;
      for (const p of peaks) {
        let best = 1e9;
        for (const q of peaks) {
          if (q === p) continue;
          const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
          if (d < best) best = d;
        }
        s += best;
      }
      spacing = s / peaks.length;
    }
    return {
      cells: F.n, mean: +mean.toFixed(3), min: +mn.toFixed(3), max: +mx.toFixed(3),
      contrast: +(mx / (mean || 1)).toFixed(2), peaks: peaks.length,
      spacing: +spacing.toFixed(2),
    };
  }

  // ---------------------------------------------------------------------------
  // ORGAN INITIATION
  //
  // There is no separate "primordium" object imposed on the field. An auxin
  // maximum *is* a primordium: the up-the-gradient network around it is already
  // pumping auxin into it, and that draining is already the lateral inhibition
  // that keeps the next organ away. All this routine does is watch the maxima,
  // give them identities as they persist, and report the angle at which each
  // new one appeared.
  // ---------------------------------------------------------------------------
  detect() {
    const F = this.F, o = this.o;
    let sum = 0;
    for (let i = 0; i < F.n; i++) sum += F.a[i];
    this.aMean = F.n ? sum / F.n : 1;
    // Hysteresis: it takes a strong maximum to declare a new organ, but only a
    // weak one to keep an organ you already have. Without this a maximum that
    // dips for a moment is buried and then "re-founded" as a second organ at
    // the same angle, which corrupts the sequence.
    const birthT = this.aMean * o.detectA;
    const keepT = birthT * o.keepFrac;

    // this frame's strict local maxima, in competent tissue
    const found = [];
    for (let i = 0; i < F.n; i++) {
      const ai = F.a[i];
      if (ai < keepT || F.comp[i] < 0.5) continue;
      const d = F.deg[i], off = i * MAXNB;
      if (d < 3) continue;
      let isMax = true;
      for (let k = 0; k < d; k++) if (F.a[F.nbr[off + k]] > ai) { isMax = false; break; }
      if (isMax) found.push({ x: F.x[i], y: F.y[i], a: ai, r: Math.hypot(F.x[i], F.y[i]) });
    }

    // track them frame to frame; a spot is the same spot if it barely moved
    for (const p of this.primordia) p.matched = false;
    const fresh = [];
    for (const f of found) {
      let best = null, bd = o.mergeR;
      for (const p of this.primordia) {
        if (p.matched) continue;
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) {
        best.x = f.x; best.y = f.y; best.r = f.r; best.a = f.a;
        best.matched = true; best.miss = 0; best.run++;
      } else if (f.a >= birthT) fresh.push(f);
    }
    for (let k = this.primordia.length - 1; k >= 0; k--) {
      const p = this.primordia[k];
      if (p.emitted) continue;
      if (!p.matched && ++p.miss > o.spotGrace) this.primordia.splice(k, 1);
    }

    // a genuinely new maximum is a new organ
    for (const f of fresh) {
      // do not found an organ inside tissue already recruited to one
      let taken = false;
      for (let i = 0; i < F.n; i++) {
        if (F.organ[i] === 0) continue;
        if (Math.hypot(F.x[i] - f.x, F.y[i] - f.y) < o.organR * 1.4) { taken = true; break; }
      }
      if (taken) continue;
      const ang = Math.atan2(f.y, f.x);
      const prim = {
        x: f.x, y: f.y, r: f.r, a: f.a, ang, strength: 1, age: 0, run: 1, miss: 0,
        matched: true, emitted: false, t: this.time,
        id: (this._nextId = (this._nextId || 0) + 1),
      };
      this.primordia.push(prim);
    }

    // Report an organ once its maximum has proved it is not a flicker. The
    // angle recorded is the one it was born at, not where it has drifted to.
    for (const p of this.primordia) {
      if (p.emitted || p.run < o.persist) continue;
      p.emitted = true;
      // specify the founder cells: from here the organ is a place in the
      // tissue, not a place in the field
      for (let i = 0; i < F.n; i++) {
        if (F.organ[i] !== 0) continue;
        if (Math.hypot(F.x[i] - p.x, F.y[i] - p.y) < o.organR) F.organ[i] = p.id;
      }
      this.emitted.push(p);
      if (this.lastAngle !== null) {
        this.divergence.push(angDelta(this.lastAngle, p.ang));
        this.plastochron = this.time - this.lastEmit;
      }
      this.lastAngle = p.ang;
      this.lastEmit = this.time;
    }
  }

  // The way you would measure a real plant: ignore the clock, sort the organs
  // by how far they have travelled from the tip (which is their age), and read
  // the angle from one to the next around the axis.
  spatialDivergence() {
    const ps = this.primordia.filter(p => p.emitted).slice().sort((a, b) => a.r - b.r);
    if (ps.length < 4) return null;
    const d = [];
    for (let i = 1; i < ps.length; i++) d.push(angDelta(ps[i].ang, ps[i - 1].ang));
    let pos = 0;
    for (const v of d) if (v > 0) pos++;
    const sign = pos >= d.length / 2 ? 1 : -1;
    const vals = d.map(v => { let a = sign * v * 180 / Math.PI; if (a < -60) a += 360; return a; });
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length);
    return { mean, sd, n: vals.length, vals };
  }

  // --- measurement, not decoration ------------------------------------------
  // Reports the angle between consecutive organs as the plant actually built
  // them. Nothing here feeds back into the simulation.
  divergenceStats(window = 40) {
    const raw = this.divergence.slice(-window);
    if (raw.length < 4) return null;
    let pos = 0;
    for (const v of raw) if (v > 0) pos++;
    const sign = pos >= raw.length / 2 ? 1 : -1;
    const vals = raw.map(v => {
      let a = sign * v * 180 / Math.PI;
      if (a < -60) a += 360;          // same rotation, other way round the circle
      return a;
    });
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / vals.length);
    const lock = vals.filter(v => Math.abs(v - mean) < 20).length / vals.length;
    return {
      mean, sd, n: vals.length, lock,
      handed: sign > 0 ? 'counter-clockwise' : 'clockwise',
    };
  }
}
