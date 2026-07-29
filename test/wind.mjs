// THE AIR, MEASURED.
//
//   node test/wind.mjs ['{"uRef":3}']
//
// ROADMAP 7 steps 1, 2 and 4: one wind velocity field expressed once for both the
// simulation and the shader, attached blades loaded through the same plate model the
// fall uses, and continuity of attitude and rate at abscission. Almost nothing here
// can be judged by looking — a wrong wind still looks like wind, and the attached
// rock turns out to be a fraction of a degree — so the numbers are the review.
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
// The attached-blade section prints more than it judges on purpose, and it now
// documents a mechanism that SHIPS OFF. On the old petiole — half the stem's radius —
// the rock was correct, quasi-static and invisible at 0.28 degrees rms. ROADMAP 5 gave
// the stalk a physical radius and the same mechanism did not become visible, it became
// wrong: 69 degrees rms, a third of the time against the stop, and blades snapping
// between face-on attitudes at 10-25 Hz when the wind's own top gust mode is 1.78 Hz.
// So the numbers below are a falsified mechanism kept measurable, and every assertion
// on them is deliberately weak. `40_plant.js` above `stepFlaps` has the full account;
// read it before concluding the solver is broken, and before reaching for `kappa`.

import { WORLD, WIND_DEFAULTS, windField, windAt, windShear, windGLSL, windGLSLNumbers }
  from '../src/37_wind.js';
import {
  petioleOf, flapOf, flapState, flapStep, drawnBladeLen, fallFrame, FLAP_DEFAULTS,
} from '../src/39_fall.js';
import { Plant } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { v3, v3dot, clamp } from '../src/00_math.js';

const opt = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const DEG = 180 / Math.PI;
const _sf = { o: v3(), x: v3(), y: v3(), z: v3(), t: 0 };
function section(name) { console.log(`\n${name}`); }
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

// ===========================================================================
// ATTACHED BLADES — ROADMAP 7 step 2
//
// The roadmap asked this section to show "blade response scaling with gust strength
// and with the blade's own area, and going quiet in still air". It does, and it also
// shows something that was not expected: the response is real, correct, quasi-static
// and INVISIBLE — a few thousandths of a degree. Why, and what to do about it, is the
// substance of the 2026-07-26 JOURNAL entry. Read the table before concluding the
// solver is broken.

section('attached blades');
{
  const P = new Plant(DEFAULT_PRM, MERISTEM_DEFAULTS, { wind: f }, 21);
  for (let i = 0; i < 6000; i++) P.step(1);
  const organs = P.axes.flatMap(a => a.organs)
    .filter(o => o.leaf && o.leaf.margin && o.leaf.margin.mature && !o.shed && o.dev > 0.5);
  console.log(`  ${organs.length} blades on the specimen at 6000 steps`);

  // What the petiole works out to, and what that means for the rock.
  const rows = organs.slice(0, 8).map(o => {
    const pet = petioleOf(o);
    const len = drawnBladeLen(o.len, o.sen || 0);
    const fl = flapOf(o.leaf, len, o.sen || 0, pet);
    return { o, pet, len, fl };
  });
  console.log('    blade   chord  petiole  pet r    k        f(Hz)    arm');
  for (const r of rows) {
    console.log('  ' + [r.len, r.fl.p.c, r.pet.len, r.pet.r0, r.fl.k,
      r.fl.om0 * toHz, r.fl.arm]
      .map((x, i) => (i === 5 ? x.toFixed(0) : x.toFixed(4)).padStart(7)).join(' '));
  }
  // THIS RATIO IS A SECOND, INDEPENDENT MEASUREMENT OF `kappa`, and it is the reason
  // the shipped value is not just "the middle of a published range".
  //
  // It read 0.135-0.274 while the petiole came off the stem's radius, against a note
  // saying a real leaf is nearer 0.02. That 0.02 was an estimate and it was high. Take
  // an ordinary broadleaf — a birch, a poplar, a maple — and the petiole diameter runs
  // about 1 mm on a 4 cm blade, 1.5 on 6, 2.5 on 10: r/chord ≈ 0.0125 in all three,
  // which is also what `kappa = A_pet/A_blade` ≈ 4.6e-4 gives on the same leaf. So the
  // pipe model's constant and this ratio are the same measurement taken two ways, and
  // they agree to within the width of the published range.
  {
    const mm = rows.map(r => r.pet.r0 / r.fl.p.c);
    console.log(`  petiole radius as a fraction of the blade's chord: `
      + `${Math.min(...mm).toFixed(3)}-${Math.max(...mm).toFixed(3)}`
      + '   — a real broadleaf is about 0.0125, and stiffness goes as the FOURTH POWER');
    ok(Math.min(...mm) > 0.006 && Math.max(...mm) < 0.025,
      'the stalk is a petiole rather than scaffolding, measured against a real leaf',
      `${Math.min(...mm).toFixed(3)}-${Math.max(...mm).toFixed(3)}`);
  }

  // Response against gust strength. The aerodynamic torque is quadratic in the wind,
  // and the blade is quasi-static at these stiffnesses, so the twist should go as the
  // square of the wind speed. That it does is the check: a response that scaled
  // linearly would mean something was being driven by the mean rather than the load.
  const respond = (uRef, lenMul = 1) => {
    const fw = windField({ ...opt, uRef });
    let s2 = 0, n = 0, worst = 0, hits = 0, pin = 0;
    for (const o of organs) {
      const pet = petioleOf(o);
      const len = drawnBladeLen(o.len, o.sen || 0) * lenMul;
      const fl = flapOf(o.leaf, len, o.sen || 0, pet);
      const st = flapState(fl);
      for (let i = 0; i < 1200; i++) {
        windAt(u, fw, o.frame.o[0], o.frame.o[1], o.frame.o[2], i);
        flapStep(st, v3dot(u, o.frame.z), v3dot(u, o.frame.y), 1);
        if (i > 200) {
          s2 += st.phi * st.phi; n++;
          worst = Math.max(worst, Math.abs(st.phi));
          // TIME AT THE STOP, not contacts with it. A blade that grazes the stop in a
          // gust and one that lives against it are the same number of contacts and
          // completely different pictures, and counting contacts is what let an
          // earlier version of this file believe the stop was idle.
          if (Math.abs(st.phi) > 0.95 * fl.o.maxFlap) pin++;
        }
      }
      hits += st.hit;
    }
    return { rms: Math.sqrt(s2 / Math.max(1, n)), worst, hits, pinned: pin / Math.max(1, n) };
  };
  const u = [0, 0, 0];
  console.log('\n  twist against wind speed (all blades, 10s of plant time each)');
  // Calm, force 2, the shipped force 3, and force 4-5. Deliberately NOT out to a
  // gale: at 16 m/s blades reach `maxFlap` and pin there, which is the stop doing its
  // job rather than the integrator failing, and an assertion that cannot tell those
  // apart is worse than no assertion.
  const sweep = [0, 0.5, 1, 2].map(m => ({ m, ...respond(f.o.uRef * m) }));
  for (const s of sweep) {
    console.log(`    uRef ${(f.o.uRef * s.m).toFixed(2).padStart(5)} m/s   `
      + `rms ${(s.rms * DEG).toExponential(2)} deg   peak ${(s.worst * DEG).toExponential(2)} deg`);
  }
  ok(sweep[0].rms === 0, 'a blade in still air does not move at all', sweep[0].rms);
  // THE QUADRATIC CHECK HAS TO BE MADE IN THE LINEAR REGIME, and it did not used to
  // have to be. On the old petiole — half the STEM's radius, four orders of magnitude
  // too stiff — the blade never left the linear regime at any weather, so the whole
  // sweep was a straight line on log-log and this assertion could be made anywhere on
  // it. On a pipe-model petiole (ROADMAP 5) the blade reaches its aerodynamic
  // equilibrium, face-on, at ordinary wind speeds, and past that point MORE wind cannot
  // buy more angle. So the load is still quadratic and the response saturates, and an
  // assertion that reads the saturated end reports neither.
  //
  // Measured where the response is still small, which is the only place the claim is
  // about the load rather than about the geometry.
  const lin = [0.08, 0.16, 0.32].map(m => ({ m, ...respond(f.o.uRef * m) }));
  console.log('  in the linear regime, where the answer is still about the load:');
  for (const s of lin) {
    console.log(`    uRef ${(f.o.uRef * s.m).toFixed(2).padStart(5)} m/s   `
      + `rms ${(s.rms * DEG).toExponential(2)} deg`);
  }
  ok(lin.every(s => s.rms * DEG < 12), 'the linear-regime samples really are unsaturated',
    lin.map(s => (s.rms * DEG).toFixed(1)).join(' '));
  ok(lin[1].rms > lin[0].rms * 2.6 && lin[2].rms > lin[1].rms * 2.6,
    'in that regime the response grows as the SQUARE of the wind — it is a load, not a drift',
    lin.map(s => (s.rms * DEG).toExponential(1)).join(' '));
  // ...and how much of the time the stop is what you are looking at. THIS IS THE
  // HONEST WEAK POINT OF THE WHOLE FLAP MODEL and the number is here so it cannot be
  // forgotten: on a pipe-model petiole the aerodynamic torque and the spring are
  // COMPARABLE — within a factor of two at the shipped weather — so the blade reaches
  // face-on and a shifting wind carries it past. That is the one-DOF rigid blade
  // showing its seams, exactly as the ROADMAP 5 pre-flight predicted it would: a plate
  // hinged along its own midrib is statically unstable in twist, and nothing in this
  // model reconfigures or lets the lamina give.
  //
  // So the assertion is deliberately weak, and says what can be defended: the blade is
  // still a dynamical system rather than a thing lying against a clip. The strong claim
  // — that the twist is a good model of a leaf — is NOT made, and ROADMAP 5 carries
  // what would have to be true for it to be.
  console.log('  time spent within a whisker of the stop: '
    + sweep.map(s => `${(100 * s.pinned).toFixed(1)}%`).join('  ')
    + '   <- the one-DOF blade showing its seams; see ROADMAP 5');
  ok(sweep[1].pinned < 0.05,
    'in a light wind the blade is nowhere near the stop', `${(100 * sweep[1].pinned).toFixed(1)}%`);
  ok(sweep[3].pinned > sweep[1].pinned && sweep[2].pinned > sweep[1].pinned,
    'and how much of the time it is there grows with the weather rather than being fixed',
    sweep.map(s => (100 * s.pinned).toFixed(1)).join(' '));
  // And in a gale it must still be bounded and finite rather than diverging. The
  // exact solution is unconditionally stable at any stiffness, which is the property
  // being checked here — the first version of the integrator was explicit and blew
  // the stiffest blade on the specimen straight through the stop.
  const gale = respond(f.o.uRef * 4);
  ok(Number.isFinite(gale.rms) && gale.worst <= FLAP_DEFAULTS.maxFlap + 1e-9,
    'and in a force 7 gale the rock is bounded by the stop rather than diverging',
    `${(gale.rms * DEG).toFixed(2)} deg rms, ${gale.hits} stop contacts`);

  // ...and against the blade's own size, with the petiole held fixed. Bigger blade,
  // bigger load on the same stalk. Note this is NOT simply "more area": the same
  // scaling makes it heavier and slower, so the two compete, and which wins is a
  // measurement.
  const small = respond(f.o.uRef, 0.7), big = respond(f.o.uRef, 1.4);
  console.log(`  blade scaled 0.7x / 1.4x on the same petiole: `
    + `rms ${(small.rms * DEG).toExponential(2)} / ${(big.rms * DEG).toExponential(2)} deg`);
  ok(big.rms > small.rms * 1.2,
    'a bigger blade on the same stalk twists further',
    `${(small.rms * DEG).toExponential(2)} -> ${(big.rms * DEG).toExponential(2)}`);

  // THE SIGN OF THE ADDED-MASS TORQUE, checked the way the fall's was: by what the
  // model does, not by what the page says. A plate free to turn must settle FACE-ON
  // to the flow — that is why a dropped card falls flat — so with the spring made
  // negligible, the chord must end up across the wind and stay there.
  {
    const o = organs[Math.floor(organs.length / 2)];
    const len = drawnBladeLen(o.len, 0);
    // The spring made negligible — but RELATIVE to the shipped one, not at an absolute
    // value. It was `eModulus: 1e2`, which was four orders below the modulus of the day
    // and comfortably negligible against the petiole of the day. ROADMAP 5 then thinned
    // every stalk, `k` goes as r^4, and the same absolute number became numerically
    // degenerate rather than merely small: `flapStep` solves the oscillator exactly and
    // its equilibrium term is `torque/k`, so as k falls the closed form evaluates a
    // finite angle as an enormous number times a tiny one and loses every digit. The
    // answer wandered — 53, 132, 65 degrees — and looked like a sign error in the
    // added-mass torque. The floor is at k ~ 1e-6 in world units; above it the answer is
    // clean and monotone in the residual spring, settling at 94.5, 89.9, 86.7, 79.7 and
    // 77.2 degrees as the spring is stiffened, which is face-on approached from the
    // stiff side. That is the actual physics, and 3e-3 of the shipped modulus sits in
    // the middle of it.
    //
    // So: negligible against what is shipped, and it stays negligible if that changes.
    const fl = flapOf(o.leaf, len, 0, petioleOf(o),
                      { eModulus: FLAP_DEFAULTS.eModulus * 3e-3, zeta: 0, maxFlap: 3 });
    const st = flapState(fl, 0.9);          // well off face-on
    // A fixed wind vector, resolved onto the rocking chord and normal. Face-on means
    // none of it lies along the chord.
    const along = (phi) => Math.abs(Math.cos(phi));
    const first = along(st.phi);
    for (let i = 0; i < 4000; i++) {
      flapStep(st, 0.15 * Math.cos(st.phi), -0.15 * Math.sin(st.phi), 0.05);
    }
    const last = along(st.phi);
    console.log(`  free blade in a steady wind settles at ${(st.phi * DEG).toFixed(1)} deg`
      + `, wind along the chord ${(100 * first).toFixed(0)}% -> ${(100 * last).toFixed(0)}%`);
    ok(last < 0.3 && last < first * 0.5,
      'a free blade turns its face to the wind, so the added-mass torque has the sign a falling card does',
      `${first.toFixed(3)} -> ${last.toFixed(3)}`);
  }
}

// --- THE SEAM: is a blade already moving when it lets go? --------------------
//
// ROADMAP 7 step 4's acceptance criterion is that you should not be able to tell from
// the motion which frame a blade detached on. This measures it, on a specimen grown
// all the way to shedding, by comparing the drawn frame either side of abscission.
//
// It reports two numbers because they are two different problems, and only one of them
// is the rock. See the JOURNAL entry: the levelling of the long axis is the big one and
// it predates all of this.

section('the seam at abscission');
{
  const P = new Plant(DEFAULT_PRM, MERISTEM_DEFAULTS, { wind: f }, 21);
  const pre = new Map();
  const recs = [];
  for (let i = 0; i < 12000 && recs.length < 24; i++) {
    for (const a of P.axes) for (const o of a.organs) {
      // Snapshot every attached organ, not only the ones carrying a flap state. This
      // used to gate on `o.flapSt`, which was fine while the flap was on and silently
      // emptied the whole section when it shipped off — and the two things this
      // measures, how far the drawn chord and the long axis jump at release, are
      // properties of the FRAME and have nothing to do with the flap.
      if (o.shed || !o.frame) continue;
      pre.set(o, { z: [...o.frame.z], x: [...o.frame.x], om: o.flapSt ? o.flapSt.om : 0 });
    }
    P.step(1);
    for (const a of P.axes) for (const o of a.organs) {
      if (!o.shed || !o.fall || o.fall.t > 2 || o._seam) continue;
      o._seam = 1;
      const b = pre.get(o);
      if (!b) continue;
      fallFrame(o.fall, o.fallFrom, o.fallAxis, _sf);
      const ang = (p, q) => Math.acos(clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1));
      recs.push({ dz: ang(b.z, _sf.z), dx: ang(b.x, _sf.x), om: b.om, fom: o.fall.om });
    }
  }
  const med = (k) => {
    const v = recs.map(r => Math.abs(r[k])).sort((a, b) => a - b);
    return v.length ? v[v.length >> 1] : 0;
  };
  const worstOf = (k) => Math.max(0, ...recs.map(r => Math.abs(r[k])));
  console.log(`  ${recs.length} blades caught in the act of letting go`);
  console.log(`  chord jump at release       med ${(med('dz') * DEG).toFixed(2)} deg`
    + `   max ${(worstOf('dz') * DEG).toFixed(2)}`);
  console.log(`  long-axis jump at release   med ${(med('dx') * DEG).toFixed(2)} deg`
    + `   max ${(worstOf('dx') * DEG).toFixed(2)}`
    + '   <- the fall levels the axis; see JOURNAL');
  console.log(`  rock rate carried over      med ${med('om').toExponential(2)} rad/pt`
    + (FLAP_DEFAULTS.enabled ? '' : '   <- zero: the flap ships off, see 40_plant.js'));
  ok(recs.length > 4, 'the specimen shed enough blades to measure the seam', recs.length);
  // The rate is continuous by construction now — `startFall` reads it off the attached
  // rock — so what is asserted is that the handover happened at all, not a tolerance
  // on a quantity that is currently 1e-9 either side. When the rock gets bigger (a
  // softer petiole), this is where it would show.
  ok(recs.every(r => Number.isFinite(r.fom)), 'every handover produced a finite fall rate');
  ok(med('dz') < 0.35,
    'the drawn chord does not jump more than 20 degrees at abscission',
    (med('dz') * DEG).toFixed(2));
}

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
