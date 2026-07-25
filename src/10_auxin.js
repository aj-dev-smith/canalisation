// ---------------------------------------------------------------------------
// AUXIN TRANSPORT ENGINE
//
// One solver, two polarisation regimes, switched by local auxin concentration.
// This is the unification proposed by Bayer et al. (2009) and Cieslak et al.
// (2019): the same PIN feedback loop produces convergence points (phyllotaxis,
// leaf serration) where auxin is low, and canals (vasculature) where auxin is
// high.
//
//   da_i/dt = rho_i - mu_i a_i
//           + sum_j [ T (P_ji phi(a_j) - P_ij phi(a_i)) + D w_ij (a_j - a_i) ]
//
//   phi(a) = a / (Km + a)                       saturating carrier kinetics
//
//   P_ij  = p_i * q_ij / sum_k q_ik             PIN allocated over membranes
//
//   q_ij  = (1 - s_i) * G_ij  +  s_i * C_ij     the two regimes, blended
//     G_ij = a_j^b / sum_k a_k^b                UP-THE-GRADIENT   (Smith 2006)
//     C_ij = pi_ij / sum_k pi_ik                WITH-THE-FLUX     (Mitchison 1980)
//        d pi_ij/dt = alpha * J_ij^2/(1 + J_ij^2/Jsat) - beta * pi_ij
//     s_i  = a_i^h / (ath^h + a_i^h)            the concentration switch
//
//   dp_i/dt = rhoP * a_i^n/(kP^n + a_i^n) - muP * p_i    auxin up-regulates PIN
//
// Nothing in here knows what a leaf or a stem is. Geometry decides the rest.
// ---------------------------------------------------------------------------

export const MAXNB = 8;

export const DEFAULT_PRM = {
  rho: 0.60,       // baseline auxin production
  mu: 0.30,        // baseline auxin turnover
  D: 6.0,          // passive diffusion across a wall
  T: 40.0,         // active transport strength
  Km: 1.2,         // Michaelis constant of the efflux carrier
  b: 3.0,          // up-the-gradient sharpness
  ath: 0.60,       // auxin concentration at which canalisation takes over
  hSwitch: 2.5,    // steepness of that switch — a real sigmoid, not a step
  alpha: 0.08,     // flux -> PIN feedback gain
  beta: 0.15,      // PIN turnover on the flux branch
  // The feedback must stay in its quadratic regime. If pi saturates, every wall
  // of a cell ends up equal and the cell has no polarity at all — the canal is
  // the *contrast* between one wall and its neighbours, not the absolute level.
  Jsat: 1e6,
  piFloor: 0.002,  // residual PIN so a canal can always be re-routed
  rhoP: 1.0,       // PIN synthesis
  kP: 1.6,         // half-saturation of PIN synthesis by auxin
  nP: 2.0,
  muP: 0.55,       // PIN decay
  pMin: 0.35,
  // Explicit Euler is only stable while dt < 1/(2 D w deg). With D=6, w<=1 and
  // six walls per cell that ceiling is about 0.014, so the step is held well
  // under it and the work is made up with substeps.
  // second signal: off by default (DI/muI give its reach, sqrt(DI/muI))
  DI: 6.0,
  muI: 0.06,
  rhoI: 0.0,       // set > 0 to switch the long-range inhibitor on
  kI: 1.0,         // inhibitor level at which competence is halved
  dt: 0.014,
  substeps: 3,
};

// A CellField is a bag of cells plus a symmetric neighbour graph in CSR form.
// Every directed edge carries its own PIN state, which is what makes
// canalisation possible at all.
export class CellField {
  constructor(cap) {
    this.cap = cap;
    this.n = 0;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.a = new Float32Array(cap);      // auxin
    this.p = new Float32Array(cap);      // total PIN in the cell
    this.rho = new Float32Array(cap);    // per-cell production
    this.mu = new Float32Array(cap);     // per-cell turnover (sinks raise this)
    this.flag = new Uint8Array(cap);     // bit0 alive, bit1 frozen, bit2 source
    this.age = new Float32Array(cap);
    this.id = new Int32Array(cap);       // stable identity across swap-removal
    this.sz = new Float32Array(cap);     // cell area, in units of the target area
    this.comp = new Float32Array(cap);   // PIN competence (0..1) — tissue identity
    this.organ = new Int32Array(cap);    // id of the organ this cell was recruited to
    this.inh = new Float32Array(cap);    // second, slower signal made by organs
    this.nextId = 1;
    this.aux0 = new Float32Array(cap);   // scratch
    this.aux1 = new Float32Array(cap);   // scratch

    this.deg = new Int32Array(cap);
    this.nbr = new Int32Array(cap * MAXNB);
    this.rev = new Int32Array(cap * MAXNB);   // index of the mirrored half-edge
    this.w = new Float32Array(cap * MAXNB);   // wall conductance
    this.pi = new Float32Array(cap * MAXNB);  // flux-mode PIN memory
    this.P = new Float32Array(cap * MAXNB);   // allocated PIN, membrane i->j
    this.J = new Float32Array(cap * MAXNB);   // last net flux i->j
    this.q = new Float32Array(cap * MAXNB);   // scratch allocation weights
  }

  add(x, y, a = 0.1) {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.a[i] = a;
    this.p[i] = 1; this.rho[i] = 0; this.mu[i] = 0;
    this.flag[i] = 1; this.age[i] = 0; this.deg[i] = 0;
    this.id[i] = this.nextId++; this.sz[i] = 1; this.comp[i] = 1; this.organ[i] = 0;
    this.inh[i] = 0;
    const o = i * MAXNB;
    for (let k = 0; k < MAXNB; k++) { this.pi[o + k] = 0.05; this.P[o + k] = 0; this.J[o + k] = 0; }
    return i;
  }

  // swap-remove; caller must rebuild topology afterwards
  remove(i) {
    const last = --this.n;
    if (i !== last) {
      this.x[i] = this.x[last]; this.y[i] = this.y[last];
      this.a[i] = this.a[last]; this.p[i] = this.p[last];
      this.rho[i] = this.rho[last]; this.mu[i] = this.mu[last];
      this.flag[i] = this.flag[last]; this.age[i] = this.age[last];
      this.id[i] = this.id[last]; this.sz[i] = this.sz[last];
      this.comp[i] = this.comp[last]; this.organ[i] = this.organ[last];
      this.inh[i] = this.inh[last];
    }
  }

  clearTopology() {
    this.deg.fill(0, 0, this.n);
  }

  // adds the pair (i,j) once; caller guarantees i<j to avoid duplicates
  link(i, j, w = 1) {
    if (this.deg[i] >= MAXNB || this.deg[j] >= MAXNB) return;
    const ei = i * MAXNB + this.deg[i];
    const ej = j * MAXNB + this.deg[j];
    this.nbr[ei] = j; this.w[ei] = w; this.rev[ei] = ej;
    this.nbr[ej] = i; this.w[ej] = w; this.rev[ej] = ei;
    this.deg[i]++; this.deg[j]++;
  }
}

// ---------------------------------------------------------------------------
// one explicit Euler step of the whole system
// ---------------------------------------------------------------------------
// mode: 'grad' pins the tissue to up-the-gradient polarisation (a meristem),
// 'flux' pins it to canalisation (a vein network), 'auto' lets each cell decide
// from its own auxin level, which is the unified model.
export function stepAuxin(F, prm, mode = 'auto') {
  const { n, a, p, rho, mu, deg, nbr, rev, w, pi, P, J, q, flag, comp } = F;
  const { D, T, Km, b, ath, hSwitch, alpha, beta, Jsat, piFloor,
    rhoP, kP, nP, muP, pMin } = prm;
  const dt = prm.dt;
  const athH = Math.pow(ath, hSwitch);

  // --- 1. allocate each cell's PIN over its membranes -----------------------
  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1)) continue;
    const d = deg[i], o = i * MAXNB;
    if (d === 0) continue;

    // concentration switch: how canalising is this cell right now?
    const ai = a[i];
    let s;
    if (mode === 'grad') s = 0;
    else if (mode === 'flux') s = 1;
    else { const aH = Math.pow(ai, hSwitch); s = aH / (athH + aH); }

    let sg = 0, sc = 0;
    for (let k = 0; k < d; k++) {
      const j = nbr[o + k];
      const g = Math.pow(a[j] > 0 ? a[j] : 0, b);   // up-the-gradient weight
      const c = pi[o + k] + piFloor;                 // with-the-flux weight
      q[o + k] = g;                                  // stash gradient part
      sg += g; sc += c;
    }
    if (sg <= 1e-9) sg = 1e-9;
    if (sc <= 1e-9) sc = 1e-9;

    // Competence is how *polarised* a cell's PIN can get, not how much of it
    // there is. An incompetent cell still carries auxin — it just spreads its
    // carriers evenly over every wall, so it cannot sharpen a gradient into a
    // maximum. This is the only spatial prior in the model, and it is the
    // documented difference between central-zone and peripheral-zone identity.
    const pi_ = p[i];
    const uni = 1 / d;
    const cmp = comp[i];
    for (let k = 0; k < d; k++) {
      // competence gates gradient *sensing* only. Canalisation is a different
      // feedback — a cell that is carrying a real flux can polarise to it
      // whatever its identity, which is why veins can cross tissue that would
      // never spontaneously form a maximum.
      let g = q[o + k] / sg;
      g = uni + (g - uni) * cmp;
      const c = (pi[o + k] + piFloor) / sc;
      P[o + k] = pi_ * ((1 - s) * g + s * c);
    }
  }

  // --- 2. fluxes and the auxin update --------------------------------------
  const da = F.aux0;
  for (let i = 0; i < n; i++) da[i] = 0;

  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1)) continue;
    const d = deg[i], o = i * MAXNB;
    const ai = a[i];
    const phi_i = ai / (Km + ai);
    let acc = rho[i] - mu[i] * ai;
    for (let k = 0; k < d; k++) {
      const e = o + k;
      const j = nbr[e];
      const aj = a[j];
      const phi_j = aj / (Km + aj);
      const out = T * P[e] * phi_i;
      const inn = T * P[rev[e]] * phi_j;
      const dif = D * w[e] * (aj - ai);
      acc += inn - out + dif;
      // Total net flux, carrier-mediated plus diffusive. The diffusive part is
      // what lets a canal nucleate at all: before any PIN is polarised the only
      // thing pointing at the sink is the concentration gradient, and
      // canalisation has to be able to hear it.
      J[e] = out - inn - dif;
    }
    da[i] = acc;
  }

  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1) || (flag[i] & 2)) continue;
    let v = a[i] + dt * da[i];
    if (v < 0) v = 0; else if (v > 60) v = 60;
    a[i] = v;
  }

  // --- 3. the canalisation feedback: flux begets transport capacity ---------
  if (mode !== 'grad') {
    for (let i = 0; i < n; i++) {
      if (!(flag[i] & 1)) continue;
      const d = deg[i], o = i * MAXNB;
      for (let k = 0; k < d; k++) {
        const e = o + k;
        const jf = J[e] > 0 ? J[e] : 0;
        const drive = (jf * jf) / (1 + (jf * jf) / Jsat);
        let v = pi[e] + dt * (alpha * drive - beta * pi[e]);
        if (v < 0) v = 0; else if (v > 1e4) v = 1e4;
        pi[e] = v;
      }
    }
  }

  // --- 4. auxin up-regulates its own transporter ---------------------------
  const kPn = Math.pow(kP, nP);
  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1)) continue;
    const an = Math.pow(a[i], nP);
    const prod = rhoP * an / (kPn + an);
    let v = p[i] + dt * (prod - muP * p[i]);
    if (v < pMin) v = pMin; else if (v > 6) v = 6;
    p[i] = v;
  }
}

// ---------------------------------------------------------------------------
// A SECOND SIGNAL
//
// The experiment this exists for: in the auxin-only model the reach of an
// organ's inhibition is sqrt(D/mu), and D and mu are the same two constants
// that set the spacing of the pattern. You cannot lengthen the memory without
// coarsening the pattern. This field is made by organ founder cells, diffuses
// with its OWN D and decays with its OWN mu, and suppresses polarisation
// competence rather than auxin itself — so its length scale sqrt(DI/muI) is
// free, and the auxin budget is untouched.
//
// Cells carry it, so it advects outward with the tissue exactly as the organs do.
// ---------------------------------------------------------------------------
export function stepInhibitor(F, prm) {
  const { n, inh, deg, nbr, w, flag, organ, aux1 } = F;
  const { DI, muI, rhoI } = prm;
  const dt = prm.dt;
  for (let i = 0; i < n; i++) {
    if (!(flag[i] & 1)) { aux1[i] = 0; continue; }
    const d = deg[i], o = i * MAXNB;
    const vi = inh[i];
    let acc = (organ[i] > 0 ? rhoI : 0) - muI * vi;
    for (let k = 0; k < d; k++) {
      const e = o + k;
      acc += DI * w[e] * (inh[nbr[e]] - vi);
    }
    aux1[i] = acc;
  }
  for (let i = 0; i < n; i++) {
    let v = inh[i] + dt * aux1[i];
    if (v < 0) v = 0; else if (v > 80) v = 80;
    inh[i] = v;
  }
}

// total outgoing active flux of a cell — used to size veins and to draw glow
export function fluxMagnitude(F, i) {
  const d = F.deg[i], o = i * MAXNB;
  let m = 0;
  for (let k = 0; k < d; k++) { const v = F.J[o + k]; if (v > m) m = v; }
  return m;
}
