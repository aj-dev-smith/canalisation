// THE STEM BENDS
//
// ROADMAP 7 step 3, and the one that makes the air visible. Steps 1 and 2 put a real
// wind field in the scene and loaded every blade with it, and the honest result was
// that a blade rocks by a quarter of a degree on the petioles this plant grows. The
// motion a viewer actually reads was always going to be here: the axes themselves,
// bending under the load of their own canopy.
//
// It is also what lets `SWAY` die. That was three sines of position and wall-clock
// time in the vertex shader — a decorative displacement the simulation could not see,
// and the last authored motion in the piece after the fall was derived.
//
// WHY THIS FILE IS ALLOWED TO EXIST, since the project's claim is one engine. Same
// argument as `39_fall.js`: this is physics the plant is SUBJECT TO, not chemistry the
// plant does. Nothing about the plant's shape is drawn here. The stiffness comes off
// radii Murray's law already grew, the load comes off blades the margin already grew,
// and the frequency is a consequence of both. See ROADMAP 7's framing note.
//
// ---------------------------------------------------------------------------
// THE MODEL: a chain of damped rotational springs
//
// Each axis is divided into `stations` along its arc. Each station carries a small
// rotation of everything above it, resisted by the beam's own bending stiffness
// `EI/ds`, damped, and driven by the moment of the aerodynamic load above it. Compose
// the rotations from the base up and you have the deflected stem; the first mode of
// the chain is the first cantilever mode of the beam, which is the thing the ROADMAP 7
// pre-flight computed analytically and which `test/stem.mjs` checks this against.
//
// It is a reduction — a Rayleigh-Ritz discretisation of the beam onto `stations`
// generalised coordinates — and it is a COUPLED one. The first version was not, and
// that is worth writing down because it looked completely reasonable: each station an
// independent damped oscillator, its stiffness `EI/ds` against the inertia of
// everything above it. It ran, it rang, its damping was right, and its frequency was a
// function of the station count. `k` goes as `EI/ds` and `ds` goes as `1/M`, so every
// uncoupled oscillator stiffens as the mesh refines while its inertia does not, and the
// measured frequency climbed as the square root of `M` — 1.57 Hz at four stations,
// 2.76 at sixteen, still rising. A number that depends on your mesh is not a
// measurement, it is a dial with a physical-sounding name.
//
// The fix is the mass matrix. When station j rotates, everything above it translates —
// including the mass above station k — so the coordinates share inertia and
// `M_jk = sum of m_i d_ij d_ik` over the mass above both. Stiffness stays diagonal,
// because the springs really are independent; it is the inertia that couples. With that,
// compliances add in series the way a real cantilever's do and the answer converges.
// `test/stem.mjs`'s third section is the proof and it is not optional: without it there
// is no way to tell this apart from the version that was wrong.
//
// ---------------------------------------------------------------------------
// GRAVITY IS ALREADY IN THE REST SHAPE, AND IT HAS TO BE
//
// The obvious thing to do is load the stem with its own weight as well as the wind.
// Do not. A cantilever's static sag under self-weight and its first natural frequency
// are not independent — both are the same stiffness-to-mass group — and eliminating
// `EI` between them gives
//
//     delta = 1.545 g / omega_1^2
//
// which is a statement with no free parameters in it at all. At the pre-flight's
// measured 1.18 Hz, a Cathedral Fern's tip would hang **27 cm** below where it grew, on
// a plant 1.08 m tall. There is no stiffness that gives both a plant-like sway period
// and a stem that stands up: to keep the sag under 5% of the height you need the first
// mode above 2.8 Hz, and then it does not sway like a plant.
//
// Real plants are not exempt from that arithmetic — they escape it by not being static
// structures. A stem is continuously remodelled toward its target orientation by
// gravitropic and phototropic growth, so the shape it has grown into IS its static
// equilibrium; the sag is already spent. `40_plant.js` grows that shape (tropism,
// nutation, wander) and this file solves the DEVIATIONS about it. So the rest shape
// carries gravity, the dynamics carries the wind, and no silhouette changes.
//
// The same arithmetic is why ROADMAP 7b is subtler than it looks: a petiole that
// bends under its blade's weight is the same rigid link between sag and frequency.
//
// ---------------------------------------------------------------------------
// WHAT IS CHOSEN HERE: nothing that was not already chosen.
//
//   E        the pre-flight's one material constant, and `39_fall.js` already uses it
//   rho      800 kg/m^3, plant tissue, and the pre-flight already uses it
//   zeta     0.10, the structural damping the petiole already uses — same tissue
//   cdStem   1.2, a circular cylinder in crossflow. Textbook, like `cPerp`
//
// Blade loads reuse `cPerp` and `cPar` from the plate model, so a leaf presents the
// drag its own attitude earns and nothing has to say how much of the canopy is broadside
// — which matters more than it sounds. Assuming every blade broadside overestimates the
// load about fourfold and blows the plant flat.

import {
  v3, v3set, v3copy, v3add, v3sub, v3scale, v3addScaled, v3dot, v3cross, v3norm, v3len,
  clamp,
} from './00_math.js';
import { WORLD, windAt } from './37_wind.js';

export const STEM_DEFAULTS = {
  // --- material, all of it already in the tree -------------------------------
  eModulus: 60e6,   // Pa. ROADMAP 7's pre-flight; `FLAP_DEFAULTS` uses the same one
  rhoTissue: 800,   // kg/m^3, hydrated plant tissue. The pre-flight uses the same one
  poisson: 0.5,     // unused for bending; here so the material is described in one place
  zeta: 0.10,       // structural damping ratio, as the petiole. Measured 0.05-0.2

  // --- aerodynamic, both textbook --------------------------------------------
  cdStem: 1.2,      // circular cylinder in crossflow
  cPerp: 1.95,      // as the plate model: a blade broadside
  cPar: 0.18,       // as the plate model: a blade edge-on

  // --- discretisation ---------------------------------------------------------
  // Stations per axis. This is a resolution, not a physical quantity, and
  // `test/stem.mjs` sweeps it to show the measured frequency has converged — which is
  // the only thing that makes it a resolution rather than a dial.
  stations: 8,
  sub: 6,           // integrator substeps per radian-per-plant-time of the fastest
                    // station, so a stiff tip refines itself and a slow base does not
                    // pay for it
  subCap: 64,
  maxTilt: 0.45,    // rad per station. A stop, and a wide one: reaching it means the
                    // load has left the range a linear beam describes
};

// Young's modulus and tissue density in world units. Stress has the dimensions of
// density times velocity squared and both are already fixed — the medium is 1 by
// definition and one world velocity unit is `unitM*ptPerSec` — so there is no freedom
// in either conversion. Same derivation as `stiffScales` in `39_fall.js`.
export function stemScales(o, w) {
  const vs = (w.unitM * w.ptPerSec);
  return {
    E: o.eModulus / (w.rhoAir * vs * vs),
    rho: o.rhoTissue / w.rhoAir,
  };
}

// The analytic first cantilever mode, for a UNIFORM beam of radius r and length L.
// This is the ROADMAP 7 pre-flight's formula, kept here because `test/stem.mjs` checks
// the solver against it and a check whose reference lives only in a markdown table is
// not a check. SI in, Hz out.
export function cantileverHz(rM, lM, o) {
  const oo = { ...STEM_DEFAULTS, ...(o || {}) };
  return 0.5596 * (rM / (lM * lM)) * Math.sqrt(oo.eModulus / (4 * oo.rhoTissue));
}

// Prefixed, because the bundle is one shared scope and `_a`/`_d` were already
// taken elsewhere — build.js caught it, which is what it is for (PITFALLS).
const _bnA = v3(), _bnB = v3(), _bnC = v3(), _bnD = v3(), _bnW = v3(), _bnF = v3(), _bnQ = v3();

// CHOLESKY, not a general inverse, and the reason is accuracy rather than speed.
//
// `A = M + (h*beta + h^2) K` is symmetric positive definite by construction, so it has
// a Cholesky factor and Cholesky is the numerically stable way to use it. That matters
// here because the mass matrix is ill-conditioned on purpose — neighbouring stations
// see nearly the same mass at nearly the same distance, so its rows are nearly parallel.
// A Gauss-Jordan inverse held up to twelve stations and then lost it: the measured
// frequency sat at 1.53 Hz for 4, 6, 8 and 12 stations and jumped to 1.87 at 16, which
// looked like a discretisation that had not converged and was actually a solver losing
// digits. Factor once per axis per step, then three triangular solves per substep.
function cholesky(a, n, out) {
  const L = out;
  L.length = n * n;
  L.fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i * n + j];
      for (let k = 0; k < j; k++) sum -= L[i * n + k] * L[j * n + k];
      if (i === j) {
        L[i * n + j] = Math.sqrt(Math.max(1e-30, sum));
      } else {
        L[i * n + j] = sum / L[j * n + j];
      }
    }
  }
  return L;
}

// Solve A x = b in place on `b`, given A's Cholesky factor, for one component at a
// stride — the three spatial components are interleaved.
function cholSolve(L, n, b, off, stride) {
  for (let i = 0; i < n; i++) {
    let sum = b[i * stride + off];
    for (let k = 0; k < i; k++) sum -= L[i * n + k] * b[k * stride + off];
    b[i * stride + off] = sum / L[i * n + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i * stride + off];
    for (let k = i + 1; k < n; k++) sum -= L[k * n + i] * b[k * stride + off];
    b[i * stride + off] = sum / L[i * n + i];
  }
  return b;
}

// A general inverse, still used for nothing on the hot path but kept because the power
// iteration and any harness poking at the matrix want it.
function invert(a, n, out) {
  const m = out;
  m.length = n * 2 * n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) m[i * 2 * n + j] = a[i * n + j];
    for (let j = 0; j < n; j++) m[i * 2 * n + n + j] = i === j ? 1 : 0;
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r * 2 * n + c]) > Math.abs(m[piv * 2 * n + c])) piv = r;
    }
    if (piv !== c) {
      for (let j = 0; j < 2 * n; j++) {
        const t = m[c * 2 * n + j]; m[c * 2 * n + j] = m[piv * 2 * n + j]; m[piv * 2 * n + j] = t;
      }
    }
    let d = m[c * 2 * n + c];
    if (Math.abs(d) < 1e-30) d = d < 0 ? -1e-30 : 1e-30;
    const inv = 1 / d;
    for (let j = 0; j < 2 * n; j++) m[c * 2 * n + j] *= inv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r * 2 * n + c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) m[r * 2 * n + j] -= f * m[c * 2 * n + j];
    }
  }
  const res = a._inv || (a._inv = []);
  res.length = n * n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) res[i * n + j] = m[i * 2 * n + n + j];
  return res;
}

// Rotate `out` = R(theta) * v, Rodrigues, with theta a rotation vector.
function rotVec(out, v, th) {
  const a = Math.hypot(th[0], th[1], th[2]);
  if (a < 1e-9) return v3copy(out, v);
  const kx = th[0] / a, ky = th[1] / a, kz = th[2] / a;
  const c = Math.cos(a), s = Math.sin(a);
  const dot = kx * v[0] + ky * v[1] + kz * v[2];
  out[0] = v[0] * c + (ky * v[2] - kz * v[1]) * s + kx * dot * (1 - c);
  out[1] = v[1] * c + (kz * v[0] - kx * v[2]) * s + ky * dot * (1 - c);
  out[2] = v[2] * c + (kx * v[1] - ky * v[0]) * s + kz * dot * (1 - c);
  return out;
}

export class Bend {
  constructor(opts) {
    this.o = { ...STEM_DEFAULTS, ...(opts || {}) };
    this.n = 0;
    this.st = [];         // per station: rest pose, properties, state
    this.ds = 0;
    this.live = false;
  }

  _station(i) {
    while (this.st.length <= i) {
      this.st.push({
        s: 0, p: v3(), t: v3(), r: 0, k: 1, J: 1,
        th: v3(), om: v3(), tq: v3(),
        m: 0,                       // mass of this station's own segment
      });
    }
    return this.st[i];
  }

  // Read the axis's REST polyline and radii, and work out each station's position,
  // stiffness and the inertia of everything above it. Cheap enough to redo every step,
  // which matters because the plant is growing underneath this the whole time.
  sync(pts, radii, np, organs, S) {
    const o = this.o;
    const M = o.stations;
    this.n = 0;
    if (np < 3) { this.live = false; return; }
    // arc length of the rest polyline
    const arc = this._arc || (this._arc = []);
    arc.length = np;
    arc[0] = 0;
    for (let i = 1; i < np; i++) {
      arc[i] = arc[i - 1] + Math.hypot(
        pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
    }
    const L = arc[np - 1];
    if (!(L > 1e-3)) { this.live = false; return; }
    this.L = L;
    const ds = L / M;
    this.ds = ds;
    this.n = M;
    this.live = true;

    // Sample the rest polyline at each station's arc position.
    let seg = 1;
    for (let j = 0; j < M; j++) {
      const st = this._station(j);
      const s = (j + 0.5) * ds;
      st.s = s;
      while (seg < np - 1 && arc[seg] < s) seg++;
      const a0 = arc[seg - 1], a1 = arc[seg];
      const f = a1 > a0 ? (s - a0) / (a1 - a0) : 0;
      for (let k = 0; k < 3; k++) {
        st.p[k] = pts[seg - 1][k] + (pts[seg][k] - pts[seg - 1][k]) * f;
        st.t[k] = pts[seg][k] - pts[seg - 1][k];
      }
      v3norm(st.t, st.t);
      st.r = Math.max(1e-4, radii[seg - 1] + (radii[seg] - radii[seg - 1]) * f);
      // EI/ds — the whole stiffness story, and every input to it is emergent: the
      // radius came off Murray's law on the traffic the axis carries.
      st.k = S.E * (Math.PI * Math.pow(st.r, 4) / 4) / ds;
      st.m = S.rho * Math.PI * st.r * st.r * ds;
    }

    // Organs: which station span each one sits above, its mass and its area. Blades
    // are most of both the mass and all of the drag.
    const org = this._org || (this._org = []);
    org.length = 0;
    for (const g of organs) {
      if (g.shed || !g.frame) continue;
      const area = g.bendArea || 0;
      const mass = g.bendMass || 0;
      if (!(area > 0) && !(mass > 0)) continue;
      org.push(g);
    }

    // THE MASS MATRIX. Rotating station j carries everything above it, so two stations
    // both below a given lump of mass share that lump's inertia:
    //
    //     M_jk = sum over mass above BOTH of  m_i * d_ij * d_ik
    //
    // The arms are distances to each station, which is the right measure for bending
    // because the mass lies along the stem and the rotation is across it. Stiffness
    // stays diagonal — the springs are genuinely independent — and it is this coupling
    // that makes compliances add in series, which is what makes the answer converge in
    // `stations` rather than climb with it.
    const mm = this._mm || (this._mm = []);
    mm.length = M * M;
    mm.fill(0);
    const arm = this._arm || (this._arm = []);
    // stem segments
    for (let i = 0; i < M; i++) {
      const q = this.st[i];
      for (let j = 0; j <= i; j++) {
        const p = this.st[j].p;
        arm[j] = i === j ? ds * 0.29
          : Math.hypot(q.p[0] - p[0], q.p[1] - p[1], q.p[2] - p[2]);
      }
      for (let j = 0; j <= i; j++) {
        for (let k = 0; k <= i; k++) mm[j * M + k] += q.m * arm[j] * arm[k];
      }
    }
    // organs
    for (const g of org) {
      let top = -1;
      for (let j = 0; j < M; j++) {
        if (this.st[j].s > g.bendS) break;
        const p = this.st[j].p;
        arm[j] = Math.hypot(g.frame.o[0] - p[0], g.frame.o[1] - p[1], g.frame.o[2] - p[2]);
        top = j;
      }
      for (let j = 0; j <= top; j++) {
        for (let k = 0; k <= top; k++) mm[j * M + k] += g.bendMass * arm[j] * arm[k];
      }
    }
    // a floor on the diagonal, so a station with nothing above it is merely stiff
    // rather than singular
    for (let j = 0; j < M; j++) mm[j * M + j] = Math.max(mm[j * M + j], 1e-9);
    for (let j = 0; j < M; j++) this.st[j].J = mm[j * M + j];
    this.minv = invert(mm, M, this._minv || (this._minv = []));

    // The first mode, by power iteration on K^-1 M — K is diagonal, so its inverse is
    // free, and the largest eigenvalue of K^-1 M is 1/omega_1^2. Five iterations is
    // plenty for a number used to set the damping and the substep.
    const x = this._pw || (this._pw = []);
    x.length = M;
    for (let j = 0; j < M; j++) x[j] = 1;
    let lam = 1;
    for (let it = 0; it < 6; it++) {
      const y = this._pw2 || (this._pw2 = []);
      y.length = M;
      for (let j = 0; j < M; j++) {
        let acc = 0;
        for (let k = 0; k < M; k++) acc += mm[j * M + k] * x[k];
        y[j] = acc / this.st[j].k;
      }
      let nrm = 0;
      for (let j = 0; j < M; j++) nrm = Math.max(nrm, Math.abs(y[j]));
      if (!(nrm > 0)) break;
      lam = nrm;
      for (let j = 0; j < M; j++) x[j] = y[j] / nrm;
    }
    this.w1 = 1 / Math.sqrt(Math.max(1e-12, lam));
    // ...and keep the eigenvector. It is the first mode's shape, it costs nothing extra,
    // and `test/stem.mjs` kicks the beam with it so that a ringdown measures ONE mode
    // rather than whatever mixture a uniform kick happens to excite.
    const md = this.mode || (this.mode = []);
    md.length = M;
    for (let j = 0; j < M; j++) md[j] = x[j];
  }

  // One step. `wind` is the field from `37_wind.js`, `t` is plant time. The forces are
  // evaluated on the BENT positions from last step — the organ frames already are —
  // because a beam that is loaded in the pose it grew in rather than the pose it is in
  // cannot be damped by its own motion.
  step(dt, wind, t, world) {
    if (!this.live) return;
    const o = this.o, M = this.n;
    const org = this._org || [];
    // SUBSTEPS FOLLOW THE MODE WE CARE ABOUT, NOT THE ONE THE MESH INVENTED, because
    // the integrator below is unconditionally stable and does not have to resolve the
    // fast modes to survive them.
    //
    // It has to be implicit. The coupled mass matrix is a sum of outer products of very
    // similar arm vectors — neighbouring stations see nearly the same mass at nearly the
    // same distance — so it is ill-conditioned by construction, `M^-1 K` has an enormous
    // spread of eigenvalues, and an explicit step at any affordable size rings at the
    // sample rate. It did: the first coupled version reported 250 Hz, which is exactly
    // Nyquist for the sampling, and zero damping. Backward Euler costs one 8x8 inverse
    // per axis per step and kills the invented modes while barely touching the first —
    // at the frequencies these axes have, its artificial damping is under 0.1% of zeta.
    const sub = Math.min(o.subCap, Math.max(1, Math.ceil(dt * this.w1 * o.sub / 6.2831853)));
    const h = dt / sub;
    // (M + h*C + h^2*K) with C = beta*K, factorised once for the whole call
    const beta = 2 * o.zeta / Math.max(1e-9, this.w1);
    const kf = h * beta + h * h;
    const A = this._A || (this._A = []);
    A.length = M * M;
    for (let j = 0; j < M * M; j++) A[j] = this._mm[j];
    for (let j = 0; j < M; j++) A[j * M + j] += kf * this.st[j].k;
    const Lc = cholesky(A, M, this._Lc || (this._Lc = []));
    const rhs = this._rhs || (this._rhs = []);
    rhs.length = M * 3;

    for (let n = 0; n < sub; n++) {
      for (let j = 0; j < M; j++) v3set(this.st[j].tq, 0, 0, 0);

      // --- the load -----------------------------------------------------------
      // Stem segments: a cylinder only feels the crossflow, so the along-axis
      // component of the relative wind does nothing.
      for (let i = 0; i < M; i++) {
        const q = this.st[i];
        windAt(_bnW, wind, q.p[0], q.p[1], q.p[2], t);
        this._pointVel(_bnB, q.p, q.s);
        v3sub(_bnA, _bnW, _bnB);                       // relative wind
        const along = v3dot(_bnA, q.t);
        v3addScaled(_bnA, _bnA, q.t, -along);        // crossflow only
        const sp = v3len(_bnA);
        v3scale(_bnF, _bnA, 0.5 * o.cdStem * (2 * q.r * this.ds) * sp);
        this._addTorqueAt(q.p, _bnF, q.s);
      }
      // Blades. Each one presents the drag its own attitude earns — resolved on its
      // normal and in its plane with the plate model's own two coefficients — so
      // nothing here has to say how much of the canopy is facing the wind.
      for (const g of org) {
        const fr = g.frame;
        windAt(_bnW, wind, fr.o[0], fr.o[1], fr.o[2], t);
        this._pointVel(_bnB, fr.o, g.bendS);
        v3sub(_bnA, _bnW, _bnB);
        const vn = v3dot(_bnA, fr.y);
        v3scale(_bnF, fr.y, 0.5 * o.cPerp * g.bendArea * Math.abs(vn) * vn);
        v3addScaled(_bnC, _bnA, fr.y, -vn);          // in-plane component
        const vt = v3len(_bnC);
        v3addScaled(_bnF, _bnF, _bnC, 0.5 * o.cPar * g.bendArea * vt);
        this._addTorqueAt(fr.o, _bnF, g.bendS);
      }

      // --- integrate -----------------------------------------------------------
      // Backward Euler on  M w' = Q - K theta - C w,  theta' = w, which rearranges to
      //   (M + hC + h^2 K) w_next = M w + h (Q - K theta)
      // and is solved with the factorisation above. Component-wise in x, y and z: one
      // mass matrix serves both bending directions, exact for a straight axis and close
      // enough for the gentle curves these grow.
      for (let j = 0; j < M; j++) {
        const st = this.st[j];
        for (let k = 0; k < 3; k++) {
          let mw = 0;
          for (let i = 0; i < M; i++) mw += this._mm[j * M + i] * this.st[i].om[k];
          rhs[j * 3 + k] = mw + h * (st.tq[k] - st.k * st.th[k]);
        }
      }
      for (let k = 0; k < 3; k++) cholSolve(Lc, M, rhs, k, 3);
      for (let j = 0; j < M; j++) {
        const st = this.st[j];
        for (let k = 0; k < 3; k++) {
          st.om[k] = rhs[j * 3 + k];
          st.th[k] += st.om[k] * h;
        }
        // NO PROJECTION HERE, and that was a real bug rather than a simplification.
        //
        // Torsion is excluded where it should be — `_torqueOn` drops the component of
        // every torque along the station's own axis, so nothing ever twists the stem.
        // An earlier version ALSO projected `th` and `om` perpendicular to the tangent
        // after each substep, which looks like belt and braces and is actually a
        // multiplicative decay applied to a rotating vector: on a stem that curves, the
        // tangent has a component along the swing, so a fixed fraction of the
        // deflection was deleted every substep. It cost 20% of the frequency — the
        // solver rang at 1.52 Hz while its own eigenvalue said 1.26 — and it was found
        // by checking one against the other, which is the entire reason that check
        // exists. A constraint enforced by repeatedly deleting part of the state is not
        // a constraint, it is a damper with no physics in it.
        const a = v3len(st.th);
        if (a > o.maxTilt) {
          v3scale(st.th, st.th, o.maxTilt / a);
          const rad = v3dot(st.om, st.th) / (o.maxTilt * o.maxTilt);
          if (rad > 0) v3addScaled(st.om, st.om, st.th, -rad);
        }
      }
    }
  }

  // Velocity of a material point at arc `s`, from the stations below it. This is what
  // makes the air damp the stem rather than only push it — without it a gust sets the
  // plant ringing with nothing but the structural damping to stop it, and plants are
  // mostly aerodynamically damped.
  //
  // A station at exactly `s` contributes nothing (zero arm), so the same arc rule
  // serves for both a station and an organ and there is no index bookkeeping.
  _pointVel(out, p, s) {
    v3set(out, 0, 0, 0);
    for (let j = 0; j < this.n; j++) {
      const st = this.st[j];
      if (st.s > s) break;
      v3sub(_bnQ, p, st.p);
      v3cross(_bnD, st.om, _bnQ);
      v3add(out, out, _bnD);
    }
    return out;
  }

  // A force applied at `p`, which sits at arc `s`, torques every station below it.
  _addTorqueAt(p, f, s) {
    for (let j = 0; j < this.n; j++) {
      if (this.st[j].s > s) break;
      this._torqueOn(this.st[j], p, f);
    }
  }

  _torqueOn(st, p, f) {
    v3sub(_bnQ, p, st.p);
    v3cross(_bnD, _bnQ, f);
    // bending only — a moment about the axis itself is torsion and is not modelled
    v3addScaled(_bnD, _bnD, st.t, -v3dot(_bnD, st.t));
    v3add(st.tq, st.tq, _bnD);
  }

  // Compose the station rotations from the base up and carry the whole polyline with
  // them. `extra` is a list of other point arrays to carry along — the axes branching
  // off this one, which have to ride their parent or they float away from it.
  apply(pts, np, arcOf, extra) {
    if (!this.live) return;
    const M = this.n;
    for (let j = 0; j < M; j++) {
      const st = this.st[j];
      if (v3len(st.th) < 1e-7) continue;
      const piv = st.p;
      for (let i = 0; i < np; i++) {
        if (arcOf[i] <= st.s) continue;
        v3sub(_bnQ, pts[i], piv);
        rotVec(_bnA, _bnQ, st.th);
        v3add(pts[i], piv, _bnA);
      }
      // the stations above this one move too, so the next pivot is the bent one
      for (let i = j + 1; i < M; i++) {
        v3sub(_bnQ, this.st[i].p, piv);
        rotVec(_bnA, _bnQ, st.th);
        v3add(this.st[i].p, piv, _bnA);
        rotVec(_bnA, this.st[i].t, st.th);
        v3copy(this.st[i].t, _bnA);
      }
      if (extra) {
        for (const arr of extra) {
          for (const q of arr) {
            v3sub(_bnQ, q, piv);
            rotVec(_bnA, _bnQ, st.th);
            v3add(q, piv, _bnA);
          }
        }
      }
    }
  }

  // How far the top of this axis has been carried, in world units. Diagnostics only.
  tipOffset(restTip) {
    if (!this.live || !this.n) return 0;
    v3copy(_bnA, restTip);
    for (let j = 0; j < this.n; j++) {
      const st = this.st[j];
      if (st.s >= this.L) continue;
      v3sub(_bnQ, _bnA, st.p);
      rotVec(_bnB, _bnQ, st.th);
      v3add(_bnA, st.p, _bnB);
    }
    return v3len(v3sub(_bnQ, _bnA, restTip));
  }
}
