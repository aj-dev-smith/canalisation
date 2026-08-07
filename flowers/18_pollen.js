// POLLEN, IN THE ONE AIR.
//
// The anther-analogs shed grains, and a grain rides `37_wind.js`'s field — the
// same field the stem bends in, sampled at each grain's own position, because
// two winds in one scene is exactly the sin that file exists to prevent. A
// 30 um grain has a Stokes response time of ~3 ms, far below one plant-time
// unit, so the honest integrator is the quasi-steady one: velocity is the
// local wind plus a settling term, and there is no inertia to integrate.
//
//   Settling is Stokes' law, v_s = rho_p g d^2 / (18 mu_air). With d = 30 um,
//   rho_p = 1200 kg/m^3 (a sporopollenin-walled grain) and mu_air = 1.81e-5
//   Pa s, v_s = 3.3 cm/s — inside the published 2-4 cm/s for pine pollen [D].
//   Converted to world units with the same velToWorld(WORLD) the wind and the
//   falling blade already use; g and the air come from WORLD itself.
//
// Stated, honestly:
//   - WHICH organs dehisce is [OURS]: inner organs in the outer part of the
//     inner q-range (qn < qBand) — the stamen-analog band. The carpel-analog
//     at the top of the range keeps its grains. The engine has no anther; q is
//     the closest thing it computes to "this organ makes pollen".
//   - The drawn size and the shed rate are LEGIBILITY choices, same category
//     as the vein width floor MINW: a real grain is 0.0005 world units and
//     sub-pixel at every distance, so a grain is drawn as the mote you see
//     when a shaft of light catches one. Its colour is the KEY LIGHT'S colour,
//     not a pigment — a backlit mote shows you the light, not itself.

const FL_POLLEN = {
  dGrain: 30e-6,     // grain diameter, m [D: 20-40 um across taxa]
  rhoGrain: 1200,    // grain density, kg/m^3 [D]
  muAir: 1.81e-5,    // dynamic viscosity of air, Pa s (physics)
  max: 4096,         // population cap
  rate: 0.05,        // grains per dehiscing organ per plant-time unit [legibility]
  qBand: 0.72,       // stamen-analog band: qn below this sheds [OURS]
  devGate: 0.85,     // dehiscence gate: the organ is essentially mature
  life: 900,         // plant-time units before a grain leaves the story (7.2 s)
  size: 0.022,       // drawn mote size, world units [legibility]
  bright: 1.1,       // key-colour multiplier on a mote [grade-category]
  fadeIn: 40,        // pt units to full brightness — a grain POPPING to full
  fadeOut: 150,      // white at the anther reads as a glitch, not a mote
};

class FlPollen {
  constructor(seed, keyCol) {
    this.buf = new Float32Array(FL_POLLEN.max * 7);   // pt layout: pos3 col3 size
    this.age = new Float32Array(FL_POLLEN.max);
    this.n = 0;
    this.rnd = mulberry32((seed ^ 0x9011e4) >>> 0);
    const P = FL_POLLEN, w = WORLD;
    this.vs = P.rhoGrain * w.gEarth * P.dGrain * P.dGrain / (18 * P.muAir)
      * velToWorld(w);   // world units per plant-time unit, downward
    this.col = [keyCol[0] * P.bright, keyCol[1] * P.bright, keyCol[2] * P.bright];
    this._w = v3();
    this._acc = 0;
    this._cand = [];
  }

  _emit(x, y, z, r) {
    if (this.n >= FL_POLLEN.max) return;
    const i = this.n * 7, b = this.buf;
    b[i] = x + (this.rnd() - 0.5) * r;
    b[i + 1] = y + (this.rnd() - 0.5) * r;
    b[i + 2] = z + (this.rnd() - 0.5) * r;
    b[i + 3] = this.col[0]; b[i + 4] = this.col[1]; b[i + 5] = this.col[2];
    b[i + 6] = FL_POLLEN.size * (0.7 + 0.6 * this.rnd());
    this.age[this.n] = 0;
    this.n++;
  }

  // Advance the population by `dt` plant-time units at wind-clock `t`.
  step(S, dt, t) {
    if (dt <= 0) return;
    const P = S.plant, C = FL_POLLEN;

    // shed: every mature stamen-analog is a candidate, and the expected count
    // accumulates fractionally so a low rate still sheds eventually
    const cand = this._cand;
    cand.length = 0;
    const pQ = S.sp.petalQ;
    for (const ax of P.axes) {
      if (!ax.floral) continue;
      for (const org of ax.organs) {
        if (!org.floral || org.petal || org.shed) continue;
        if ((org.dev || 0) < C.devGate || (org.sen || 0) > 0) continue;
        if (!org.frame || org.len < 0.05) continue;
        const qn = ((org.q || 0) - pQ) / Math.max(1e-3, 1 - pQ);
        if (qn > C.qBand) continue;
        cand.push(org);
      }
    }
    if (cand.length) {
      this._acc += cand.length * C.rate * dt;
      let nEmit = Math.floor(this._acc);
      this._acc -= nEmit;
      for (; nEmit > 0; nEmit--) {
        const org = cand[Math.floor(this.rnd() * cand.length) % cand.length];
        const f = org.frame, L = org.len;
        this._emit(f.o[0] + f.x[0] * L, f.o[1] + f.x[1] * L, f.o[2] + f.x[2] * L,
          L * 0.4);
      }
    }

    // drift: wind at the grain, plus settling; a grain leaves the story on the
    // ground (the floor is where the stem starts, as everywhere here), at the
    // edge of the world, or when its time is up
    const wf = P.wind, b = this.buf, w = this._w;
    for (let i = 0; i < this.n;) {
      const o = i * 7;
      windAt(w, wf, b[o], b[o + 1], b[o + 2], t);
      b[o] += w[0] * dt;
      b[o + 1] += (w[1] - this.vs) * dt;
      b[o + 2] += w[2] * dt;
      this.age[i] += dt;
      // brightness envelope: ease in at the anther, out at the end of life
      const env = Math.max(0, Math.min(
        this.age[i] / C.fadeIn, 1, (C.life - this.age[i]) / C.fadeOut));
      b[o + 3] = this.col[0] * env;
      b[o + 4] = this.col[1] * env;
      b[o + 5] = this.col[2] * env;
      if (b[o + 1] < 0 || this.age[i] > C.life ||
          Math.abs(b[o]) > 90 || Math.abs(b[o + 2]) > 90) {
        const l = --this.n;
        if (i !== l) {
          b.copyWithin(o, l * 7, l * 7 + 7);
          this.age[i] = this.age[l];
          continue;   // re-examine the swapped-in grain
        }
      } else i++;
    }
  }
}
