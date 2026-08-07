// ANTHOCYANIN SPOTS BY REACTION-DIFFUSION, ON THE TISSUE THE ENGINE GREW.
//
// Ding, Yuan et al. 2020 (Current Biology 30:802 [D]) showed Mimulus petal
// spots are a two-species activator-inhibitor system — NEGAN self-activates
// and activates a mobile repressor — and published the complete parameter set
// for a modified Gierer-Meinhardt model. Those constants, verbatim:
//
//   D_A = 0.01   D_I = 0.5     (mobility ratio 50:1)
//   U_A = 0.03   U_I = 0.03    A0 = 0.01   I0 = 0
//   G_A = 0.08   G_I = 0.12    k = 0.001
//   zero-flux boundaries, A initialised randomly
//
// Here the solver runs on the petal's OWN lamina lattice — the CellField the
// margin cut and the canalisation patterned — rather than their 100x100
// square. Zero-flux falls out of the lattice for free (a boundary cell just
// has fewer neighbours), and the spot arrangement inherits the real tissue
// geometry, seed by seed. Petals come from a library of three, so this runs
// three times per specimen, once each, at ~50ms — the same one-time-bake
// category as `cellTable`.
//
// Two numerical departures from the paper, both flagged:
//   - dt = 0.2 explicit Euler (they do not publish their integrator; the
//     diffusion stability bound for D_I = 0.5 on a degree<=6 lattice is ~0.3).
//   - I is initialised at ~0.5 rather than 0 — with I = 0 and k = 0.001 the
//     first Euler step multiplies A by ~1000, which is an integrator artefact,
//     not biology. The ATTRACTOR (dispersed spots) is what is published;
//     the init only moves which arrangement you land in. [OURS-numerics]
//
// The result is baked to a vdf-style (u, v/aspect) grid so the shader can
// read it exactly where it reads the vein distance field.

const FL_SPOT_RES = 32;

function flSpotsRun(leaf) {
  const F = leaf.F, n = F.n, deg = F.deg, nbr = F.nbr;
  const rnd = mulberry32(((leaf.seed || 1) ^ 0x51075eed) >>> 0);
  const DA = 0.01, DI = 0.5, UA = 0.03, UI = 0.03, A0 = 0.01, I0 = 0, GA = 0.08, GI = 0.12, K = 0.001;
  const dt = 0.2, STEPS = 3000;
  let A = new Float32Array(n), I = new Float32Array(n);
  let A2 = new Float32Array(n), I2 = new Float32Array(n);
  for (let i = 0; i < n; i++) { A[i] = 0.5 + rnd(); I[i] = 0.5 + 0.5 * rnd(); }
  for (let s = 0; s < STEPS; s++) {
    for (let i = 0; i < n; i++) {
      const o = i * MAXNB, di = deg[i];
      let lA = 0, lI = 0;
      for (let k = 0; k < di; k++) {
        const j = nbr[o + k];
        lA += A[j] - A[i]; lI += I[j] - I[i];
      }
      const aa = A[i] * A[i];
      A2[i] = A[i] + dt * (DA * lA + GA * aa / (I[i] + K) + A0 - UA * A[i]);
      I2[i] = I[i] + dt * (DI * lI + GI * aa + I0 - UI * I[i]);
      if (A2[i] < 0) A2[i] = 0;
      if (I2[i] < 1e-4) I2[i] = 1e-4;
    }
    let t;
    t = A; A = A2; A2 = t;
    t = I; I = I2; I2 = t;
  }
  // normalise and bake to the vdf grid
  let mx = 1e-9;
  for (let i = 0; i < n; i++) if (A[i] > mx) mx = A[i];
  const res = FL_SPOT_RES;
  const acc = new Float32Array(res * res), cnt = new Float32Array(res * res);
  const asp = leaf.o.aspect || 1;
  for (let i = 0; i < n; i++) {
    const a = clamp(Math.round(F.x[i] * (res - 1)), 0, res - 1);
    const b = clamp(Math.round((F.y[i] / asp * 0.5 + 0.5) * (res - 1)), 0, res - 1);
    acc[a * res + b] += A[i] / mx; cnt[a * res + b]++;
  }
  const out = new Float32Array(res * res);
  for (let k = 0; k < res * res; k++) out[k] = cnt[k] > 0 ? acc[k] / cnt[k] : -1;
  // fill bins no cell landed in from their neighbours, a few passes
  for (let pass = 0; pass < 4; pass++) {
    for (let a = 0; a < res; a++) for (let b = 0; b < res; b++) {
      const k = a * res + b;
      if (out[k] >= 0) continue;
      let s = 0, c = 0;
      if (a > 0 && out[k - res] >= 0) { s += out[k - res]; c++; }
      if (a < res - 1 && out[k + res] >= 0) { s += out[k + res]; c++; }
      if (b > 0 && out[k - 1] >= 0) { s += out[k - 1]; c++; }
      if (b < res - 1 && out[k + 1] >= 0) { s += out[k + 1]; c++; }
      if (c) out[k] = s / c;
    }
  }
  for (let k = 0; k < res * res; k++) if (out[k] < 0) out[k] = 0;
  return out;
}
