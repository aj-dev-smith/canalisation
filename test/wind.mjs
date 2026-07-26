// THE AIR, MEASURED.
//
//   node test/wind.mjs ['{"uRef":3}']
//
// ROADMAP 7 step 1 is "one wind velocity field, expressed once and available to
// both the simulation and the shader". Nothing reads it yet, so there is nothing to
// look at, and the two claims that matter are both invisible: that the field is a
// physically sensible flow, and that the JS and the GLSL are the same field.
//
// This harness both JUDGES and PRINTS, like test/fall.mjs. It judges the things
// that are exactly true and would be silently wrong otherwise —
//
//   * the field is divergence-free, to machine precision, not approximately;
//   * still air is identically zero, so a calm scene costs nothing;
//   * the gust strength is the surface-layer value derived from u*, not a dial;
//   * the octave ladder is Kolmogorov's, measured off the baked amplitudes;
//   * the emitted GLSL contains the same numbers the JS is summing.
//
// — and prints the things that are judgements rather than facts: how hard it is
// blowing at the heights this plant occupies, and whether the field contains energy
// at the frequencies the stems are going to have (0.5-4.6 Hz, from the ROADMAP 7
// pre-flight table). If the wind has no energy near the stem's first mode, nothing
// in step 3 will move, and that is worth knowing before writing a solver.
//
// Step 2 will extend this file with attached-blade response. It is named `wind.mjs`
// rather than `field.mjs` for that reason.

import { WORLD, WIND_DEFAULTS, windField, windAt, windShear, windGLSL, windGLSLNumbers }
  from '../src/37_wind.js';

const opt = process.argv[2] ? JSON.parse(process.argv[2]) : {};
let failures = 0, checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (cond) return;
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}

const f = windField(opt);
const toMS = 1 / f.vs;                       // world units per plant-time -> m/s
const toHz = f.w.ptPerSec / (2 * Math.PI);   // rad per plant-time -> Hz

// --- what the weather works out to ------------------------------------------

console.log('the air');
console.log(`  uRef            ${f.o.uRef.toFixed(2)} m/s at ${f.o.yRefM.toFixed(2)} m`
  + `   (${(f.o.uRef * f.vs).toFixed(4)} world/pt)`);
console.log(`  z0              ${f.o.z0M} m -> ${f.z0.toFixed(3)} world units`);
console.log(`  u*              ${f.uStar.toFixed(4)} m/s`);
console.log(`  sigma_u         ${f.sigma.toFixed(4)} m/s`
  + `   (turbulence intensity ${(100 * f.sigma / Math.max(1e-9, f.o.uRef)).toFixed(0)}%)`);
console.log(`  modes           ${f.modes.length}`);
console.log('    #   lambda(m)  lambda(u)   amp(m/s)     f(Hz)');
f.modes.forEach((m, i) => {
  const lamW = 2 * Math.PI / m.kmag;
  console.log(`    ${i}   ${(lamW * f.w.unitM).toFixed(3).padStart(8)}`
    + `   ${lamW.toFixed(2).padStart(8)}`
    + `   ${(m.amp * toMS).toFixed(4).padStart(8)}`
    + `   ${(Math.abs(m.om) * toHz).toFixed(3).padStart(7)}`);
});

// The stems are going to be damped cantilevers at 0.5-4.6 Hz on seven of eight
// species. Does the air contain anything there? A field whose only energy is at
// 20 Hz would leave every stem still, and it would look like a solver bug.
{
  const band = f.modes.filter(m => {
    const hz = Math.abs(m.om) * toHz;
    return hz > 0.3 && hz < 6;
  });
  const pw = (ms) => ms.reduce((s, m) => s + m.amp * m.amp, 0);
  const frac = pw(f.modes) > 0 ? pw(band) / pw(f.modes) : 0;
  console.log(`  energy in 0.3-6 Hz, where the stems will be: `
    + `${(100 * frac).toFixed(0)}% of gust variance, ${band.length} of ${f.modes.length} modes`);
}

// --- the profile -------------------------------------------------------------

console.log('\nheight profile (log law of the wall)');
console.log('    y(u)    y(m)     shear    mean(m/s)');
for (const y of [0, 0.5, 1, 2, 4, 8, 16, 24]) {
  const sh = windShear(f, y);
  console.log(`  ${y.toFixed(1).padStart(6)}  ${(y * f.w.unitM).toFixed(3).padStart(6)}`
    + `  ${sh.toFixed(4).padStart(8)}  ${(sh * f.o.uRef).toFixed(3).padStart(9)}`);
}
{
  ok(Math.abs(windShear(f, 0)) < 1e-12, 'no mean flow at the ground', windShear(f, 0));
  ok(Math.abs(windShear(f, f.o.yRefM / f.w.unitM) - 1) < 1e-9,
    'the profile is 1 at the reference height');
  let mono = true;
  for (let y = 0; y < 30; y += 0.25) if (windShear(f, y + 0.25) <= windShear(f, y)) mono = false;
  ok(mono, 'mean speed increases with height everywhere');
}

// --- divergence: exactly zero, not nearly ------------------------------------
//
// Each mode's velocity is perpendicular to its own wavevector and the mean flow is
// horizontal and depends only on height, so div u vanishes identically — including
// across the max(y,0) kink at the ground, because the mean has no vertical
// component for that kink to act on. What is measured here is a central difference,
// so what is left is truncation error, and it should scale as h^2.
{
  const u0 = [0, 0, 0], u1 = [0, 0, 0];
  // Normalised by the largest velocity gradient in the field, so the number is
  // dimensionless and comparable across weathers. Floored, because a dead calm has
  // no gradients at all and 0/0 is not a passing test — it reported NaN, and NaN is
  // not less than the tolerance, so the guard is here rather than in the assertion.
  const kMax = f.modes.reduce((s, m) => Math.max(s, m.kmag), 1);
  const scale = Math.max(1e-12, f.sigmaW * kMax);
  // The step is set from the shortest wave in the field rather than fixed, because a
  // fixed one is a test that gets stricter as the ladder gets longer for no physical
  // reason: at `nMode: 7` the smallest eddy is a quarter of a world unit and h=0.01
  // reported 5e-4 of pure truncation error, which failed an assertion about a field
  // whose divergence is analytically zero.
  const h0 = 0.02 / kMax;
  const worstAt = (h) => {
    let worst = 0;
    for (let i = 0; i < 400; i++) {
      const x = (i * 7.3) % 40 - 20, y = (i * 3.1) % 24, z = (i * 11.7) % 40 - 20;
      const t = (i * 37.9) % 2000;
      let div = 0;
      for (let ax = 0; ax < 3; ax++) {
        const p = [x, y, z];
        p[ax] -= h; windAt(u0, f, p[0], p[1], p[2], t);
        p[ax] += 2 * h; windAt(u1, f, p[0], p[1], p[2], t);
        div += (u1[ax] - u0[ax]) / (2 * h);
      }
      worst = Math.max(worst, Math.abs(div) / scale);
    }
    return worst;
  };
  const d1 = worstAt(h0), d2 = worstAt(h0 / 2);
  console.log(`\ndivergence  worst |div u| / (sigma k_max) = ${d1.toExponential(2)}`
    + ` at h=${h0.toExponential(1)}, ${d2.toExponential(2)} at h/2`
    + `   (ratio ${d1 > 0 ? (d1 / d2).toFixed(1) : 'n/a'}, second order is 4)`);
  ok(d1 < 1e-4, 'the field is divergence-free', d1.toExponential(2));
  // The stronger statement, and the one worth having: halving the step quarters the
  // residual, so what is left is the central difference and not the field. An
  // approximately solenoidal field would flatten out at its own error instead.
  if (f.o.uRef > 0) {
    ok(d2 < d1 / 3, 'and what is left of it is truncation error, not divergence',
      `${d1.toExponential(2)} -> ${d2.toExponential(2)}`);
  }
}

// --- gust statistics: derived from u*, not chosen -----------------------------
{
  const u = [0, 0, 0];
  let s2 = 0, n = 0, peak = 0;
  for (let i = 0; i < 40000; i++) {
    const x = (i * 2.7182818) % 60 - 30, z = (i * 1.4142136) % 60 - 30;
    const y = 16;
    const t = i * 0.61803399 * 13;
    windAt(u, f, x, y, z, t);
    const sh = windShear(f, y);
    const gx = u[0] - f.uMean[0] * sh, gy = u[1] - f.uMean[1] * sh, gz = u[2] - f.uMean[2] * sh;
    const m2 = gx * gx + gy * gy + gz * gz;
    s2 += m2; n++;
    peak = Math.max(peak, Math.sqrt(m2));
  }
  const rms = Math.sqrt(s2 / n);
  console.log(`\ngusts at plant height`);
  console.log(`  rms   ${(rms * toMS).toFixed(4)} m/s   predicted ${f.sigma.toFixed(4)}`
    + `   (${(100 * rms / Math.max(1e-12, f.sigmaW) - 100).toFixed(1)}%)`);
  console.log(`  peak  ${(peak * toMS).toFixed(4)} m/s`
    + `   = ${(peak / Math.max(1e-12, f.sigmaW)).toFixed(2)} sigma`);
  if (f.o.uRef > 0) {
    ok(Math.abs(rms / f.sigmaW - 1) < 0.05,
      'gust rms is the surface-layer value 2.5 u*, to 5%',
      (rms / f.sigmaW).toFixed(4));
  }
}

// --- the spectral ladder is Kolmogorov's -------------------------------------
//
// Velocity amplitude per octave goes as sqrt(k E(k)) with E ~ k^-5/3, so the
// amplitude exponent is -1/3 and consecutive octaves differ by 2^(-1/3) = 0.7937.
// Measured off the baked table rather than asserted from the constant, so an
// emitter or normalisation bug shows up here.
if (f.modes.length > 1 && f.o.uRef > 0) {
  let worst = 0;
  const want = Math.pow(2, (f.o.spectralSlope + 1) / 2);
  const got = [];
  for (let i = 1; i < f.modes.length; i++) {
    const r = f.modes[i].amp / f.modes[i - 1].amp;
    got.push(r.toFixed(4));
    worst = Math.max(worst, Math.abs(r - want));
  }
  console.log(`\nspectrum  octave amplitude ratios ${got.join(' ')}`
    + `   want ${want.toFixed(4)} (E ~ k^${f.o.spectralSlope.toFixed(3)})`);
  ok(worst < 1e-6, 'the octave ladder is the Kolmogorov one', worst.toExponential(2));
}

// --- still air ---------------------------------------------------------------
{
  const calm = windField({ ...opt, uRef: 0 });
  const u = [0, 0, 0];
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    windAt(u, calm, i * 3.7 - 40, (i * 1.9) % 24, i * 2.3 - 30, i * 41);
    worst = Math.max(worst, Math.abs(u[0]), Math.abs(u[1]), Math.abs(u[2]));
  }
  console.log(`\nstill air   worst |u| = ${worst.toExponential(2)}`);
  ok(worst === 0, 'a dead calm is identically zero everywhere', worst);
}

// --- one definition: the GLSL carries the same numbers -----------------------
//
// The half of "defined once" that does not need a GPU. tools/wind_check.mjs does
// the other half, which is whether the two arithmetics agree once compiled.
{
  const src = windGLSL(f);
  const g = windGLSLNumbers(src);
  ok(g.modes.length === f.modes.length, 'the GLSL has one term per baked mode',
    `${g.modes.length} vs ${f.modes.length}`);
  const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-8 + 1e-12;
  ok(near(g.invZ0, f.invZ0) && near(g.invLnRef, f.invLnRef),
    'the GLSL profile constants are the baked ones');
  ok([0, 1, 2].every(i => near(g.uMean[i], f.uMean[i])),
    'the GLSL mean flow is the baked one', JSON.stringify(g.uMean));
  let bad = 0;
  g.modes.forEach((m, i) => {
    const b = f.modes[i];
    for (let j = 0; j < 3; j++) {
      if (!near(m.a[j], b.a[j]) || !near(m.k[j], b.k[j])) bad++;
    }
    if (!near(m.om, b.om) || !near(m.ph, b.ph)) bad++;
  });
  ok(bad === 0, 'every mode survived the round trip to GLSL and back', `${bad} off`);
  // Emitter traps that are invisible until a shader fails to compile in a browser.
  ok(!/--/.test(src), 'no double minus in the emitted source');
  ok(!/vec3\(\s*-?\d+\s*[,)]/.test(src), 'no bare integer literals in a vec3');
  ok(/^vec3 windAt\(vec3 p, float t\)\{$/m.test(src), 'the emitted signature is stable');
  console.log(`\nGLSL   ${src.split('\n').length} lines, `
    + `${src.length} chars, ${g.modes.length} unrolled modes`);
  if (process.env.WIND_GLSL) console.log(src);
}

// --- what it looks like from the plant ---------------------------------------
//
// The streamwise component at plant height over ten seconds of plant time, and the
// same at knee height. Not judged: this is the picture that says whether the field
// gusts on a timescale a viewer would read as wind rather than as a vibration.
{
  const u = [0, 0, 0];
  const N = 74, secs = 10, dir = [Math.cos(f.o.bearing), 0, Math.sin(f.o.bearing)];
  console.log(`\nstreamwise speed over ${secs}s of plant time, m/s`);
  for (const y of [16, 4]) {
    const v = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1) * secs * f.w.ptPerSec;
      windAt(u, f, 0, y, 0, t);
      v.push((u[0] * dir[0] + u[2] * dir[2]) * toMS);
    }
    const lo = Math.min(...v), hi = Math.max(...v);
    const ramp = ' .:-=+*#%@';
    const row = v.map(x => ramp[Math.min(ramp.length - 1,
      Math.floor((x - lo) / Math.max(1e-9, hi - lo) * ramp.length))]).join('');
    console.log(`  y=${String(y).padStart(2)}u  ${lo.toFixed(2).padStart(6)} `
      + `|${row}| ${hi.toFixed(2)}`);
  }
}

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
