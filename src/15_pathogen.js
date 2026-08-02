// ---------------------------------------------------------------------------
// AN AGENT IN THE TISSUE
//
// Something that arrives after the plant has started, spreads through it, and
// deforms the auxin machinery it finds. A pathogen, an effector, an injected
// protein — the model does not care which.
//
// This is the same category as `37_wind.js` and `39_fall.js`: it is a thing the
// plant is SUBJECT TO, not chemistry the plant does and not a shape anybody
// drew. Nothing here says what an infected plant looks like. It says what the
// agent does to three numbers per cell, and the solver in `10_auxin.js` decides
// the rest.
//
//   dv_i/dt =   r v_i (1 - v_i)                    replication, logistic
//             - clr v_i                            host clearance
//             + sum_j Dv w_ij (v_j - v_i)          cell to cell
//             + chi * upwind(J_ij, v)              carried BY THE HOST'S OWN FLUX
//
// The last term is the point. `J` is the realised auxin transport field, which
// the solver already computes on every wall of every cell, every step. An agent
// that rides it does not need a spread geometry: it goes where the plant's own
// polarity sends it, so the shape of an infection is canalised for the same
// reason a vein is.
//
// PRE-FLIGHT, and the reason `test/pathogen.mjs` exists: with chi = 0 this is
// Fisher-KPP, whose front speed is known in closed form,
//
//   c = 2 sqrt( Dv (r - clr) ),      and there is no invasion at all if clr >= r
//
// so the solver can be checked against a number worked out beforehand rather
// than against itself. With advection it becomes c = chi*u + 2 sqrt(Dv(r-clr)).
// Both are asserted before anything in here is believed about a plant.
// ---------------------------------------------------------------------------

import { MAXNB } from './10_auxin.js';

export const PATHOGEN_DEFAULTS = {
  r: 0.90,        // replication rate. R0 = r/clr; below 1 the agent dies out
  clr: 0.00,      // host clearance
  Dv: 0.35,       // cell-to-cell movement (plasmodesmatal, in wall-conductance units)
  chi: 0.00,      // how strongly the agent is carried by the auxin flux J
  vCap: 1.0,      // carrying capacity of the titre

  // --- what it deforms. All three scale linearly with local titre v. ---
  dRho: 0.0,      // auxin production. Agrobacterium's iaaM/iaaH, in one number
  dMu: 0.0,       // auxin turnover. A sink, or a degradation effector
  dComp: 0.0,     // PIN competence. NEGATIVE INVERTS POLARITY — see below

  seedTitre: 0.9, // titre written into a cell at the point of inoculation
};

// ---------------------------------------------------------------------------
// dComp is the interesting one and it is worth being precise about.
//
// `comp` gates how far a cell's PIN allocation may depart from uniform:
//
//     g = uni + (g_raw - uni) * comp
//
// At comp = 1 the cell polarises fully up-the-gradient; at comp = 0 it spreads
// carriers evenly and cannot sharpen a maximum. Every species ships in [0,1],
// where that expression is a convex combination of two non-negative numbers and
// therefore never goes negative.
//
// At comp < 0 it is a REFLECTION ABOUT UNIFORM: PIN goes to the wall the
// gradient rule would have avoided. That is not a sicker plant, it is a cell
// with inverted polarity, and it is the only perturbation here that can produce
// a body plan the parameter space does not otherwise contain. `stepAuxin` needs
// one clamp to allow it, and that clamp is provably a no-op for comp in [0,1]
// (see the note in 10_auxin.js) — which is why the nine species are untouched.
// ---------------------------------------------------------------------------

// A named agent is a row in a table, for the same reason `VIEWS` is a table:
// four copies of this would drift apart inside a week, and every real difference
// between them is one of these numbers turned up or down.
export const AGENTS = {
  // Auxin overproduction, localised. The direct analogue of Agrobacterium
  // T-DNA: the agent carries the host's own biosynthesis genes.
  // NOTE the second symptom is not listed here because it is not imposed —
  // raising `a` locally drives the concentration switch s = a^h/(ath^h + a^h)
  // toward 1, so infected tissue canalises whether or not it should. Tangled
  // vasculature in a gall is a CONSEQUENCE of the auxin term, not a term.
  gall: { r: 0.85, clr: 0.05, Dv: 0.30, chi: 0.0, dRho: 2.40, dMu: 0.0, dComp: 0.0 },

  // A sink rather than a source: the agent degrades or sequesters auxin.
  chlorosis: { r: 0.70, clr: 0.05, Dv: 0.55, chi: 0.0, dRho: 0.0, dMu: 1.60, dComp: 0.0 },

  // Competence knocked out. Tissue that carries auxin but cannot sharpen it
  // into a maximum — so it can still be crossed by a vein, and can no longer
  // found an organ.
  blind: { r: 0.80, clr: 0.05, Dv: 0.45, chi: 0.0, dRho: 0.0, dMu: 0.0, dComp: -1.0 },

  // POLARITY INVERTED. The exotic one.
  invert: { r: 0.80, clr: 0.05, Dv: 0.40, chi: 0.0, dRho: 0.0, dMu: 0.0, dComp: -2.0 },

  // Systemic: weak replication, low clearance, and it rides the transport field
  // instead of crawling. Reaches far from the inoculation point.
  systemic: { r: 0.35, clr: 0.02, Dv: 0.10, chi: 0.60, dRho: 0.80, dMu: 0.0, dComp: 0.0 },
};

// ---------------------------------------------------------------------------
// An infection of one cell field.
//
// It does not own the field and does not change its topology. It holds a titre
// per cell, and it deforms the host's per-cell parameters for the duration of
// one auxin step and then puts them back exactly, so nothing downstream can
// read a deformed value by accident and no baseline can go stale.
// ---------------------------------------------------------------------------
export class Infection {
  constructor(F, opts = {}) {
    this.F = F;
    this.o = { ...PATHOGEN_DEFAULTS, ...opts };
    const cap = F.cap;
    this.dv = new Float32Array(cap);     // scratch derivative
    this.rho0 = new Float32Array(cap);   // stashed host baselines
    this.mu0 = new Float32Array(cap);
    this.comp0 = new Float32Array(cap);
    this.applied = false;
    this.t = 0;
    // The field carries its own infection, so an organ does not need to be told
    // about one — it checks `F.inf` around its solve loop and is otherwise
    // unchanged. Uninfected tissue pays one null test per step.
    F.inf = this;
  }

  // Inoculate the cell nearest (x, y). Returns the cell index, or -1.
  inoculate(x, y) {
    const F = this.F;
    let best = -1, bd = Infinity;
    for (let i = 0; i < F.n; i++) {
      if (!(F.flag[i] & 1)) continue;
      const dx = F.x[i] - x, dy = F.y[i] - y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) F.vir[best] = this.o.seedTitre;
    return best;
  }

  inoculateIndex(i) {
    if (i >= 0 && i < this.F.n) this.F.vir[i] = this.o.seedTitre;
    return i;
  }

  // total titre, and how much of the tissue is above a threshold
  burden(thresh = 0.5) {
    const F = this.F;
    let tot = 0, cells = 0, live = 0, peak = 0;
    for (let i = 0; i < F.n; i++) {
      if (!(F.flag[i] & 1)) continue;
      live++;
      const v = F.vir[i];
      tot += v;
      if (v > peak) peak = v;
      if (v > thresh) cells++;
    }
    return { total: tot, cells, live, frac: live ? cells / live : 0, peak };
  }

  // --- the field's own dynamics -------------------------------------------
  step(dt) {
    const F = this.F, o = this.o;
    const { n, vir, deg, nbr, rev, w, J, flag } = F;
    const { r, clr, Dv, chi, vCap } = o;
    const dv = this.dv;

    for (let i = 0; i < n; i++) {
      if (!(flag[i] & 1)) { dv[i] = 0; continue; }
      const vi = vir[i];
      const d = deg[i], ofs = i * MAXNB;
      // logistic replication against a carrying capacity, minus clearance
      let acc = r * vi * (1 - vi / vCap) - clr * vi;
      for (let k = 0; k < d; k++) {
        const e = ofs + k;
        const j = nbr[e];
        acc += Dv * w[e] * (vir[j] - vi);
        if (chi !== 0) {
          // upwind advection along the host's own auxin flux. J[e] is the net
          // flux i->j, so a positive value exports titre from i, and the
          // mirrored half-edge imports what the neighbour is exporting to us.
          const out = J[e];
          if (out > 0) acc -= chi * out * vi;
          const inn = J[rev[e]];
          if (inn > 0) acc += chi * inn * vir[j];
        }
      }
      dv[i] = acc;
    }

    for (let i = 0; i < n; i++) {
      if (!(flag[i] & 1)) continue;
      let v = vir[i] + dt * dv[i];
      if (v < 0) v = 0; else if (v > vCap) v = vCap;
      vir[i] = v;
    }
    this.t += dt;
  }

  // --- deformation of the host, applied around one auxin step --------------
  // These two MUST bracket the stepAuxin call. `apply` stashes the host's own
  // values and writes deformed ones; `revert` copies the stash back, so the
  // restore is exact rather than an inverse arithmetic operation that would
  // drift over thousands of steps.
  apply() {
    if (this.applied) return;
    const F = this.F, o = this.o;
    const { n, vir, rho, mu, comp, flag } = F;
    const dRho = o.dRho, dMu = o.dMu, dComp = o.dComp;
    if (dRho === 0 && dMu === 0 && dComp === 0) return;
    for (let i = 0; i < n; i++) {
      if (!(flag[i] & 1)) continue;
      const v = vir[i];
      this.rho0[i] = rho[i]; this.mu0[i] = mu[i]; this.comp0[i] = comp[i];
      if (v <= 0) continue;
      if (dRho !== 0) { let x = rho[i] + v * dRho; rho[i] = x < 0 ? 0 : x; }
      if (dMu !== 0) { let x = mu[i] + v * dMu; mu[i] = x < 0 ? 0 : x; }
      if (dComp !== 0) comp[i] = comp[i] + v * dComp;
    }
    this.applied = true;
  }

  revert() {
    if (!this.applied) return;
    const F = this.F;
    const { n, rho, mu, comp, flag } = F;
    for (let i = 0; i < n; i++) {
      if (!(flag[i] & 1)) continue;
      rho[i] = this.rho0[i]; mu[i] = this.mu0[i]; comp[i] = this.comp0[i];
    }
    this.applied = false;
  }
}

// Convenience: run one substep of the host solver with the agent's deformation
// in place, then take the agent's own step. Callers that already have their own
// substep loop should bracket it with apply()/revert() themselves.
export function stepInfected(inf, stepFn, dt) {
  inf.apply();
  try { stepFn(); } finally { inf.revert(); }
  inf.step(dt);
}
