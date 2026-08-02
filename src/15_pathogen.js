// ---------------------------------------------------------------------------
// A PATHOGEN
//
// Something that replicates in the tissue and, where its titre is high, changes
// what the auxin engine does. It draws nothing. It has no shape, no target
// organ and no idea what a leaf is — it is a scalar that multiplies rates.
//
//   dv_i/dt = rep * v_i * (v_i - vA) * (1 - v_i)     replication above a dose
//           + Dv * sum_j w_ij (v_j - v_i)             cell to cell, through walls
//
// The middle factor is the one that had to be there and was not at first. A
// LOGISTIC pathogen cannot be excluded from anything: diffusion leaves a tiny
// titre in every cell within a few hundred frames, and any tiny titre grows in
// place, so the infection never has to travel and every race is won before it
// starts. Measured — a patch was swept off the rim by frame 100, and the whole
// meristem was infected by frame 1000 anyway, from a residue of 0.004.
//
// `vA` is the MINIMUM INFECTIVE DOSE, and it is not a fudge: a plant virus
// establishes a cell through a founder bottleneck of a very few virions, so a
// sub-threshold titre really does go extinct. It makes v=0 a stable state,
// which is what an exclusion needs to be exclusion.
//
// It also buys a closed form. This is Nagumo's bistable equation, whose
// travelling front has a known speed
//
//   c = sqrt(rep * Dv / 2) * (1 - 2 vA)
//
// so the solver can be checked against a number worked out beforehand instead
// of against itself — and the sign of that speed is the whole result: a front
// with 2 vA > 1 RETREATS, and the tissue clears itself.
//
// The movement term runs on the SAME wall graph the auxin diffuses on, which is
// not an analogy: a plant virus moves cell-to-cell through plasmodesmata, and
// `w` is already the conductance of that wall. `Dv` is the movement protein.
// It is far below auxin's `D` because a virion is not a small molecule.
//
// The field is carried by cells, so advection is free — an infected cell that
// is displaced toward the rim takes its titre with it, and a daughter cell
// inherits its mother's. That is what makes the central result possible:
//
//   REPLICATION COMPETES WITH TISSUE DISPLACEMENT. The infection spreads as a
//   Fisher-KPP front at c = 2*sqrt(Dv*rep); the meristem carries tissue outward
//   at v(r) = Gt*r. The front stalls where those are equal, at r = c/Gt, so a
//   slow pathogen occupies a disc and CANNOT reach the rim. Real meristems
//   exclude real viruses, which is why meristem-tip culture cleans infected
//   stock, and here that exclusion is a race rather than a rule.
//
// WHAT THIS COSTS AGAINST THE ONE RULE: nothing, on the same argument as
// `37_wind.js`. A pathogen is environmental — chemistry the plant is subject to
// rather than shape the plant is told to have. The test that keeps it honest is
// that every parameter below is a RATE or a CONCENTRATION. The moment one of
// them is a geometry, this file is a lie and the project's whole claim with it.
// ---------------------------------------------------------------------------

import { MAXNB } from './10_auxin.js';

export const PATHOGEN_DEFAULTS = {
  rep: 0.5,        // replication rate. Carrying capacity is 1 by normalisation:
                   // titre is a saturation fraction, not a virion count
  vA: 0.15,        // minimum infective dose. Below it a cell clears itself, so
                   // v=0 is stable and an uninfected tissue stays uninfected
  Dv: 2.0,         // cell-to-cell movement, through plasmodesmata. Explicit
                   // Euler is stable while dt < 1/(2 Dv w deg) = 0.06 here,
                   // against the shared step of 0.014.
                   //
                   // rep and Dv are not independently free: the front is
                   // sqrt(2 Deff/rep) wide, and a front narrower than a CELL is
                   // a front the lattice can pin. These sit at 2.9 cells wide.
  // --- dose-response ------------------------------------------------------
  // Each is the value the target multiplier takes at FULL titre. 1 is no
  // effect, so the default pathogen is a passenger: it replicates, it spreads,
  // and it does nothing. Every phenotype below has to be switched on by name.
  compMul: 1,      // PIN polarisation competence. -> 0 is NPA / pin1
  rhoMul: 1,       // auxin production.            -> >1 is Agrobacterium iaaM/iaaH
  muMul: 1,        // auxin turnover
};

// linear dose-response from healthy (1) to fully infected (mul)
export function dose(v, mul) {
  return mul === 1 ? 1 : 1 + v * (mul - 1);
}

// Inoculation. A patch of tissue is given a starting titre — this is where the
// needle went in, and it is a boundary condition from outside the plant in
// exactly the way the wind is. `r <= 0` inoculates every cell (systemic
// arrival through the phloem, which is how a real infection reaches an apex).
export function inoculate(F, opts = {}) {
  const x0 = opts.x || 0, y0 = opts.y || 0, r = opts.r ?? 0, t = opts.titre ?? 0.5;
  let hit = 0;
  for (let i = 0; i < F.n; i++) {
    if (r > 0 && Math.hypot(F.x[i] - x0, F.y[i] - y0) > r) continue;
    F.vir[i] = t; hit++;
  }
  return hit;
}

// one explicit Euler step of the pathogen, on the same clock as the auxin
export function stepPathogen(F, vp, dt) {
  const { n, vir, deg, nbr, w, flag, aux1 } = F;
  const { rep, vA, Dv } = vp;
  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1)) { aux1[i] = 0; continue; }
    const d = deg[i], o = i * MAXNB;
    const vi = vir[i];
    let acc = rep * vi * (vi - vA) * (1 - vi);
    for (let k = 0; k < d; k++) {
      const e = o + k;
      acc += Dv * w[e] * (vir[nbr[e]] - vi);
    }
    aux1[i] = acc;
  }
  for (let i = 0; i < n; i++) {
    let v = vir[i] + dt * aux1[i];
    // Titre is a fraction of carrying capacity, so it is clamped to [0,1]. The
    // logistic term already holds it there; the clamp is against a stiff step.
    if (v < 0) v = 0; else if (v > 1) v = 1;
    vir[i] = v;
  }
}

// The closed-form speed of the bistable front, kept here so a harness can check
// the solver against a number rather than against itself. Negative means the
// front retreats and the tissue clears.
// `wbar` is the tissue's mean wall conductance. The lattice factor is the
// hexagonal-lattice Laplacian, sum_j (v_j - v_i) = (3/2) h^2 grad^2 v with
// h = d0 = 1, so the continuum diffusivity the front actually sees is
// Dv * wbar * 3/2 rather than Dv. Measured against the meristem: 0.70.
export function frontSpeed(vp, wbar = 0.70) {
  const Deff = vp.Dv * wbar * 1.5;
  return Math.sqrt(vp.rep * Deff / 2) * (1 - 2 * vp.vA);
}

// how wide that front is, in cells. Below about 1 the lattice pins it.
export function frontWidth(vp, wbar = 0.70) {
  return Math.sqrt(2 * vp.Dv * wbar * 1.5 / vp.rep);
}

// how much infection is there, and how far out has it got?
export function viralLoad(F, thresh = 0.5) {
  let sum = 0, mx = 0, hot = 0, frontR = 0, alive = 0;
  for (let i = 0; i < F.n; i++) {
    if (!(F.flag[i] & 1)) continue;
    alive++;
    const v = F.vir[i];
    sum += v;
    if (v > mx) mx = v;
    if (v > thresh) {
      hot++;
      const r = Math.hypot(F.x[i], F.y[i]);
      if (r > frontR) frontR = r;
    }
  }
  return { mean: sum / (alive || 1), max: mx, frac: hot / (alive || 1), frontR, n: alive };
}
