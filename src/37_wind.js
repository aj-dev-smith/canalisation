// THE AIR
//
// One wind velocity field, defined once, evaluated by both the simulation and the
// shader from the same baked table of numbers.
//
// WHY THIS FILE EXISTS AT ALL. The piece had two unrelated models of the same air.
// A shed blade was integrated quasi-steady aerodynamics (`39_fall.js`); everything
// still attached was a rigid card in dead calm, displaced by `SWAY` in
// `60_render.js` — three sines of position and wall-clock time evaluated in the
// vertex shader, which the simulation could not see. So abscission was a
// discontinuity between two airs, and the first person to watch it said so
// unprompted. ROADMAP 7 is the fix, and its first step is this file: the field,
// before anything read it. Attached blades read it (`flapStep` in `39_fall.js`, driven
// from `Plant.stepFlaps`), the axes bend under it (`39a_stem.js`), and `SWAY` is gone.
//
// "DEFINED ONCE" IS THE WHOLE POINT, and it is the one claim here that cannot be
// checked by looking at the screen. Two functions that resemble each other is
// precisely the failure being fixed, so the JS and the GLSL are not two
// implementations: `windField()` bakes a table of modes, `windAt()` sums it, and
// `windGLSL()` emits an unrolled sum of *the same table's numbers*. The table
// round-trip is asserted in `test/wind.mjs` and in the CI gate; that the two
// arithmetics agree to float32 is measured on a real GPU by
// `tools/wind_check.mjs`, because nothing in Node can evaluate GLSL.
//
// WHAT IS CHOSEN HERE. One thing: the weather. `uRef` is how hard it is blowing,
// and a still day and a gale are both legitimate scenes, so that number is a
// setting in the way `39_fall.js` deliberately has none. Everything downstream of
// it is measured:
//
//   - the height profile is the logarithmic law of the wall, which is what a wind
//     profile over a rough surface measurably is, off von Karman's constant and a
//     roughness length taken from a table;
//   - the gust strength is not a dial. Surface-layer turbulence has
//     sigma_u ~ 2.5 u*, and u* follows from `uRef` and the profile, so how gusty
//     it is is decided by how hard it is blowing;
//   - the gusts are a Fourier synthesis with Kolmogorov amplitudes — E(k) ~ k^-5/3
//     over an octave ladder, so the amplitude exponent is -1/3 and nothing about
//     the relative size of large and small eddies is picked;
//   - the frequencies are Taylor's frozen-turbulence hypothesis, k . U: an eddy's
//     frequency at a fixed point is how fast the mean flow carries it past. Plus
//     each eddy's own overturning rate, a_i k_i, which is a timescale rather than a
//     coefficient. So there is no "sway frequency" anywhere in this file, and there
//     is no octave whose speed was set by ear.
//
// EXACTLY DIVERGENCE-FREE, and that is worth having because it is assertable. Each
// gust mode's velocity is perpendicular to its own wavevector, so its divergence
// vanishes identically; the mean flow is horizontal and varies only with height, so
// its divergence vanishes too. `test/wind.mjs` measures it numerically and the gate
// asserts it. That is not decoration: a field with sources in it pumps energy into
// whatever reads it, and this is the cheapest possible guard against the field
// being quietly wrong once four other things depend on it.
//
// It also means the gusts do NOT taper to nothing at the ground, which looks like
// an omission and is not. sigma_u is very nearly constant with height through the
// surface layer even though the mean speed goes to zero at the roughness height —
// that is the measured behaviour, and it is also the only version that keeps the
// divergence exactly zero. What quietens the bottom of the plant is that the bottom
// of the plant is stiff (ROADMAP 7 step 3), not that the air stops.
//
// THE TIME ARGUMENT IS PLANT TIME, not wall-clock milliseconds, and this is the
// trap to avoid when the shader is finally wired to it. `70_app.js` keeps both
// clocks: `age` counts plant-time steps and `t` accumulates real milliseconds, and
// `SWAY` reads `t`. A field driven by wall-clock in the shader and by plant time in
// the simulation would be two airs again — the same bug in a subtler form, and one
// that only shows on the time slider, where the plant would speed up and the wind
// would not. Everything here is per plant-time unit.

import { TAU, mulberry32, v3, v3set, v3norm, v3cross } from './00_math.js';

// --- the world's exchange rates, and the two physical constants of the air ----
//
// These moved here out of `FALL_DEFAULTS` when this file arrived, because a second
// definition of the density of air is exactly the thing this branch exists to
// prevent. `39_fall.js` now spreads them, so every key name it used still works
// and a harness can still override them.
//
// Neither scale is new and neither is aesthetic. They are the exchange rates
// between this simulation and the world, and they were already fixed by things that
// shipped long before either file: a Cathedral Fern stands about 16 world units
// tall and reads as a metre of plant, and `App.step` advances plant time at 125
// units per real second (70_app.js:703). Writing them down is what lets everything
// else be a measured quantity instead of a chosen one.
export const WORLD = {
  unitM: 0.0625,    // metres per world unit — a 16-unit plant is 1m
  ptPerSec: 125,    // plant-time units per real second at 1x
  gEarth: 9.81,     // m/s^2
  rhoAir: 1.2,      // kg/m^3
};

// metres per second -> world units per plant-time unit. One world unit is `unitM`
// metres and one plant-time unit is 1/`ptPerSec` seconds, so the conversion is the
// product of both, and it is the same 7.8125 the fall already used implicitly.
export function velToWorld(w) { return 1 / (w.unitM * w.ptPerSec); }

export const WIND_DEFAULTS = {
  // --- the weather: the one number here that is a choice ---------------------
  //
  // Mean wind speed in metres per second at `yRefM` above the ground.
  //
  // THE BEAUFORT SCALE IS THE RIGHT PLACE TO GET THIS, and it is a nicer answer than
  // "pick a number that looks good", because Beaufort's descriptions are *defined by
  // what the wind does to plants*:
  //
  //   force 1, 0.3-1.5 m/s   smoke drifts; leaves do not move
  //   force 2, 1.6-3.3       wind felt on the face; LEAVES RUSTLE
  //   force 3, 3.4-5.4       LEAVES AND SMALL TWIGS IN CONSTANT MOTION
  //   force 4, 5.5-7.9       dust and loose paper raised; small branches move
  //
  // The load is quadratic in speed, so this band choice is the loudest number in the
  // whole mechanical stack: the pressure on a stem at force 3 is eleven times what it
  // is at force 1. A first draft shipped 1.2 — force 1, where by definition leaves do
  // not move — and then reported that the mechanics was invisible. It was: correctly.
  //
  // IT THEN SHIPPED 4.0, force 3, AND THAT WAS TOO MUCH — not by any measurement, but
  // because a person watched it and said so, twice. Force 3's own wording is the tell:
  // "leaves and small twigs in *constant* motion" is a description of a busy scene, and
  // this piece is a quiet close study of one specimen. Force 2 is where a viewer reads
  // air rather than weather. 2.5 m/s is the upper-middle of that band, which keeps the
  // mechanics legible — the floppiest species still leans 1.9° off its grown shape and
  // the stiffest still is not quite still — at roughly 40% of the force-3 load.
  //
  // THIS IS THE ONE NUMBER IN THE PROJECT WHERE THE EYE IS THE RIGHT INSTRUMENT, and it
  // is worth being clear about why, because everywhere else in the mechanics the eye is
  // explicitly not trusted (see `39_fall.js`, whose constants are not tunable at all).
  // Everything downstream of `uRef` is measured, so a wrong value here cannot make the
  // physics wrong — it can only put the scene in the wrong weather. Choosing the weather
  // is composition, and there is no experiment that settles it. So it is a slider in the
  // UI (`80_main.js`) rather than a constant to be argued about: turn it up to a gale and
  // the same air is still one air.
  //
  // Set it to 0 for a dead calm and the whole field is identically zero, which is what
  // `test/wind.mjs` checks: still air has to cost nothing and do nothing.
  uRef: 2.5,
  yRefM: 1.0,       // the height that speed is quoted at, metres. A plant's height.

  // --- the profile: the law of the wall -------------------------------------
  // z0 is a roughness length off a standard table: mown grass is 0.008-0.03 m and
  // 0.02 sits in the middle of it. kappa is von Karman's constant. Neither is mine.
  z0M: 0.02,
  kappa: 0.40,

  // --- the turbulence: all of it derived from u* ----------------------------
  // sigma_u / u* in the neutral surface layer is measurably about 2.5, so the gust
  // amplitude is not an independent quantity — once you have said how hard it is
  // blowing you have said how gusty it is. This is the constant that keeps `uRef`
  // from being two dials pretending to be one.
  sigmaOverUstar: 2.5,
  // THE INTEGRAL LENGTH SCALE — the size of the biggest eddy that matters, and the
  // number this file got wrong first time in a way that could be seen rather than
  // measured.
  //
  // It shipped at 1.0 m, justified as "of order the height above the ground". That rule
  // is real but it is about the VERTICAL component: the eddies that carry w are limited
  // by their distance from the wall. The STREAMWISE component is not — its integral
  // scale is set by the depth of the boundary layer, and standard wind-engineering
  // values are tens to hundreds of metres near the ground (ESDU-type figures put L_u at
  // roughly 30-60 m at a height of 1 m, and ~100 m at 10 m). Using the vertical
  // component's scale for the streamwise one made **every gust mode 3.9 to 19.3 Hz**,
  // which is not wind, it is vibration — and that is exactly how it read: the stem
  // buzzed and the leaves near the tip shimmered. Both complaints, one wrong number.
  //
  // At 32 m the ladder runs 32 m down to 0.5 m and the frequencies run 0.13 Hz to 8 Hz,
  // with about 63% of the gust variance in the two slowest octaves — because Kolmogorov
  // gives the big eddies the big amplitudes. So a specimen gets slow coherent pushes
  // with fine texture on top, which is what standing in a breeze is like.
  //
  // Keep the ladder wide rather than moving it: the largest eddy is much bigger than the
  // plant, so it loads the whole specimen together, and the smallest is a fraction of it,
  // so the loading still varies along the stem. Both ends are doing work.
  lambdaM: 32.0,
  nMode: 7,         // octaves: 32, 16, 8, 4, 2, 1, 0.5 m
  // Kolmogorov. E(k) ~ k^(-5/3) in the inertial range, so the velocity amplitude of
  // an octave goes as sqrt(k E(k)) ~ k^(-1/3). The exponent is written as the
  // spectral slope it comes from rather than as -1/3, so that it reads as a citation
  // instead of as a number somebody liked.
  spectralSlope: -5 / 3,
  // Each eddy also turns over on its own timescale, a_i k_i, which decorrelates the
  // field so it is not one frozen pattern sliding rigidly past. Dimensionless, and 1
  // means "at its own overturning rate".
  turnover: 1.0,
  // Which way it is blowing, radians, in the ground plane. Environment, like the
  // speed: a scene picks one. Nothing about the plant depends on it.
  bearing: 0.0,
  // Which realisation of the spectrum. Synthetic turbulence is a random draw from a
  // spectrum — the spectrum is the physics, the draw is not — so this seeds the
  // wavevector directions and phases and nothing else.
  seed: 1,
};

// Bake the field: everything in world units and plant time, ready to be summed by
// `windAt` or emitted as GLSL by `windGLSL`. Both read this and only this.
export function windField(opt) {
  const o = { ...WIND_DEFAULTS, ...(opt || {}) };
  const w = { ...WORLD, ...(opt || {}) };
  const vs = velToWorld(w);
  const z0 = o.z0M / w.unitM;               // roughness length, world units
  const yRef = o.yRefM / w.unitM;
  // The log law, regularised as ln(1 + y/z0) rather than ln(y/z0) so that it is
  // finite and zero AT the ground instead of singular below the roughness height.
  // That is the standard way to write it when you need a value everywhere rather
  // than only in the region where it was fitted, and it costs nothing: above a few
  // z0 the two are the same curve.
  const invZ0 = 1 / z0;
  const lnRef = Math.log(1 + yRef * invZ0);
  const invLnRef = 1 / lnRef;
  const uStar = o.kappa * o.uRef / lnRef;    // m/s, friction velocity
  const sigma = o.sigmaOverUstar * uStar;    // m/s, gust rms
  // The mean flow at the reference height, as a world-unit vector. Horizontal, so
  // the mean contributes nothing to the divergence.
  const uMean = [Math.cos(o.bearing) * o.uRef * vs, 0, Math.sin(o.bearing) * o.uRef * vs];

  // The modes. Directions and phases are a draw from the seeded PRNG; the
  // amplitudes and frequencies are not drawn, they are the spectrum.
  const rnd = mulberry32(o.seed >>> 0);
  const ampExp = (o.spectralSlope + 1) / 2;  // -5/3 -> -1/3
  const kv = [], pv = [], wgt = [];
  for (let i = 0; i < o.nMode; i++) {
    const L = (o.lambdaM / Math.pow(2, i)) / w.unitM;   // wavelength, world units
    const k = TAU / L;
    // A direction on the sphere, area-uniform so the ladder is not biased toward
    // the poles. Only the draw is random; the magnitude is the spectrum's.
    const z = rnd() * 2 - 1, ph = rnd() * TAU, r = Math.sqrt(Math.max(0, 1 - z * z));
    const kd = v3(r * Math.cos(ph), z, r * Math.sin(ph));
    // The polarisation: perpendicular to the wavevector, which is what makes this
    // mode divergence-free. Any perpendicular will do, so pick one by crossing with
    // a second draw and fall back if the two came out parallel.
    const t1 = v3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    const p = v3();
    v3cross(p, kd, t1);
    if (Math.hypot(p[0], p[1], p[2]) < 1e-6) v3cross(p, kd, v3(0, 1, 0));
    v3norm(p, p);
    kv.push([kd[0] * k, kd[1] * k, kd[2] * k]);
    pv.push([p[0], p[1], p[2]]);
    wgt.push(Math.pow(k, ampExp));
  }
  // Normalise the ladder so the summed variance is sigma^2. The variance of
  // a*sin(...) is a^2/2, so sum a_i^2 / 2 = sigma^2 fixes the scale; the SHAPE
  // across the ladder is Kolmogorov's and is untouched by this.
  let sw = 0;
  for (const g of wgt) sw += g * g;
  const c = sw > 0 ? sigma * vs * Math.sqrt(2 / sw) : 0;

  const modes = [];
  for (let i = 0; i < kv.length; i++) {
    const a = c * wgt[i];
    const kmag = Math.hypot(kv[i][0], kv[i][1], kv[i][2]);
    // Taylor: the frequency seen at a fixed point is the mean flow carrying the
    // eddy past, k . U. Plus the eddy's own turnover, a k. Both rad per plant-time.
    const om = kv[i][0] * uMean[0] + kv[i][1] * uMean[1] + kv[i][2] * uMean[2]
      + o.turnover * a * kmag;
    modes.push({
      k: kv[i],
      // amplitude folded into the polarisation vector, so the sum is one multiply
      // per mode in both languages
      a: [pv[i][0] * a, pv[i][1] * a, pv[i][2] * a],
      om, ph: rnd() * TAU, amp: a, kmag,
    });
  }
  return {
    o, w, vs, z0, invZ0, invLnRef, uStar, sigma, sigmaW: sigma * vs,
    uMean, uMeanMag: Math.hypot(uMean[0], uMean[1], uMean[2]), modes,
  };
}

// The height profile, dimensionless: 0 at the ground, 1 at the reference height.
// Written with the same precomputed reciprocals the GLSL uses so the two do the
// same arithmetic in the same order.
export function windShear(f, y) {
  return Math.log(1 + Math.max(y, 0) * f.invZ0) * f.invLnRef;
}

// The field. World units per plant-time unit, at world position (x, y, z) and
// plant time t. This and the emitted GLSL are the two things that must agree.
export function windAt(out, f, x, y, z, t) {
  const sh = Math.log(1 + Math.max(y, 0) * f.invZ0) * f.invLnRef;
  let ux = f.uMean[0] * sh, uy = f.uMean[1] * sh, uz = f.uMean[2] * sh;
  for (let i = 0; i < f.modes.length; i++) {
    const m = f.modes[i];
    const s = Math.sin(m.k[0] * x + m.k[1] * y + m.k[2] * z - m.om * t + m.ph);
    ux += m.a[0] * s; uy += m.a[1] * s; uz += m.a[2] * s;
  }
  return v3set(out, ux, uy, uz);
}

// --- the same field, as GLSL -------------------------------------------------
//
// Emitted from the baked table above, unrolled, with every number a literal. There
// is no loop and no uniform array because there is nothing for the shader to be
// told: the modes are fixed the moment the scene picks its weather, and a shader
// recompile is the cheaper of the two ways to change the wind.
//
// `float32` is why this needs a tolerance rather than an equality when it is checked
// against `windAt`: 9 significant figures go in and about 7 survive. Measured on
// ANGLE/Metal by tools/wind_check.mjs, the disagreement is 1.6e-5 of the mean wind
// speed early in a run and 1.1e-4 late in one — it grows LINEARLY with plant time,
// because a mode's phase is `om*t` and float32 holds it to a fixed fraction of its own
// magnitude. Both are orders below anything that could be seen. If it ever matters,
// the fix is to quantise the frequencies onto a common fundamental so the field is
// exactly periodic and the shader can be handed `mod(t, T)`.
function glf(x) {
  if (!Number.isFinite(x)) throw new Error('windGLSL: non-finite constant ' + x);
  let s = x.toPrecision(9);
  // GLSL ES has no implicit int->float in a vec3 constructor, so every literal has
  // to carry a decimal point or an exponent. `1e-7` is a float literal; `2` is not.
  if (!/[.eE]/.test(s)) s += '.0';
  // A negative constant is parenthesised because it is not always in a position
  // where a leading minus parses: `- -1.2*t` is not GLSL, and one mode's frequency
  // is negative whenever the wind is blowing against its wavevector, which is half
  // of them. Costs nothing and removes a whole class of emitter bug.
  return x < 0 ? `(${s})` : s;
}
function glv(v) { return `vec3(${glf(v[0])},${glf(v[1])},${glf(v[2])})`; }

export function windGLSL(f, name = 'windAt') {
  const L = [];
  L.push(`// GENERATED by windGLSL() in src/37_wind.js from the same baked mode`);
  L.push(`// table windAt() sums. Do not hand-edit; tools/wind_check.mjs compares`);
  L.push(`// this against the JS on a real GPU. t is PLANT TIME, not milliseconds.`);
  L.push(`vec3 ${name}(vec3 p, float t){`);
  L.push(`  float sh = log(1.0 + max(p.y,0.0)*${glf(f.invZ0)})*${glf(f.invLnRef)};`);
  L.push(`  vec3 u = ${glv(f.uMean)}*sh;`);
  for (const m of f.modes) {
    // The frequency is baked ALREADY NEGATED, and every term is a `+`, because a
    // sign that lives in the operator cannot be read back out of the source: the
    // first version wrote `-om*t` and `windGLSLNumbers` recovered `-om` for a
    // positive mode and `-om` for a negative one, so half the table round-tripped
    // with the wrong sign and the check that caught it is the reason this comment
    // exists. Any constant a test has to verify should carry its own sign.
    L.push(`  u += ${glv(m.a)}*sin(dot(${glv(m.k)},p)+${glf(-m.om)}*t+${glf(m.ph)});`);
  }
  L.push(`  return u;`);
  L.push(`}`);
  return L.join('\n');
}

// Read the numbers back out of emitted GLSL, so a test can assert that what the
// shader will compile is the table the simulation is summing and not a formatting
// accident. This is the half of "defined once" that does not need a GPU, and it is
// the half that catches the mistakes that are easy to make: a dropped mode, a lost
// sign, a literal truncated to an int.
export function windGLSLNumbers(src) {
  // `vec3` has a digit in it, so the type names come out before the numbers do.
  const nums = (s) => ((s.replace(/vec[234]/g, '')
    .match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g)) || []).map(Number);
  const lines = src.split('\n').filter(l => !l.trim().startsWith('//'));
  const shear = lines.find(l => l.includes('float sh'));
  const mean = lines.find(l => l.includes('vec3 u ='));
  const modes = lines.filter(l => l.includes('u +='));
  if (!shear || !mean) throw new Error('windGLSLNumbers: no field in that source');
  const sh = nums(shear);
  return {
    // the leading 1.0 and the 0.0 of max(p.y,0.0) are structure, not constants
    invZ0: sh[2], invLnRef: sh[3],
    uMean: nums(mean),
    modes: modes.map(l => {
      const v = nums(l);
      // v[6] is the frequency as baked, which is -om: see the emitter.
      return { a: v.slice(0, 3), k: v.slice(3, 6), om: -v[6], ph: v[7] };
    }),
  };
}
