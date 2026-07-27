// A BLADE IN AIR — ATTACHED, AND LET GO
//
// Two things live here and they are the same plate model. The bottom of the file is
// the newer one: a blade still on its petiole, rocking under the wind field in
// `37_wind.js`. The top is a blade that has let go and is falling. They share
// `plateOf`, they share the quasi-steady coefficients, and they share one state
// variable — the rock of the chord about the midrib — which is what makes abscission
// continuous rather than a cut (ROADMAP 7 step 4).
//
// ---------------------------------------------------------------------------
// A SHED BLADE FALLING
//
// This replaces four tuned animation constants — terminal velocity, swing
// amplitude, swing frequency, tumble rate — with an integrator, because the old
// version was the one piece of motion in the piece that was authored rather than
// simulated, and it showed. Every blade fell at the same speed, swung the same
// distance, and pitched at the same rate; only a hash of the attachment point
// separated them, so a canopy came down in parallel.
//
// WHY GRAVITY ALONE WOULD HAVE BEEN WORSE. The comment this file replaced argued
// that a blade reaches terminal velocity within a length of letting go and never
// accelerates again, so a constant descent is closer to the truth than an
// integrated one. That is right, and it is why the fix is not "add gravity". What
// makes a real leaf worth watching is that its ATTITUDE SETS THE DRAG AND THE
// DRAG CHANGES ITS ATTITUDE. Broadside it is nearly all drag and it stalls;
// stalled it slips edgewise, sheds the stall, and pitches through. That loop is
// the whole phenomenon and no amount of tuning a sine reproduces it.
//
// THE MODEL is the quasi-steady falling plate: added mass, a circulatory (lift)
// term with translational and rotational parts, form drag resolved separately
// along and across the chord, and rotational damping. Andersen, Pesavento & Wang,
// *Unsteady aerodynamics of fluttering and tumbling plates*, JFM 541 (2005), and
// the companion transitions paper in the same volume. The result worth having is
// theirs: a falling plate does not have one behaviour. It picks STEADY DESCENT,
// FLUTTER, or TUMBLE, and which one is set by a dimensionless moment of inertia
// that is essentially thickness over width.
//
// WHICH IS WHY IT BELONGS IN THIS PROJECT. A blade's width over its length is not
// a parameter here — `30_leaf.js` overwrites it with what the margin grew. So the
// regime a blade falls in is selected by a silhouette that patterned itself, and
// a drained blade sits somewhere different in that plane than a turgid one
// because it has lost mass. Nothing chooses which leaves flutter and which tumble.
//
// Two more things arrive free, and both used to be hashes:
//
//   - WHICH WAY IT TURNS. The two halves of a margin pattern independently and do
//     not come out equal (see 30_leaf.js:91). That asymmetry offsets the centre
//     of area from the midrib, which is an off-axis pressure, which is the torque
//     that breaks the symmetry of the fall. Which way a blade tumbles — and so
//     which way it drifts, since a tumbling plate drifts — is decided by which
//     side of the leaf grew wider.
//   - WHICH PLANE IT FALLS IN. The blade's own frame at abscission, which
//     phyllotaxis set. Leaves attached at different angles fall in different
//     planes, so a canopy comes down in a spread rather than a sheet.
//
// WHAT IS CHOSEN HERE, and this went better than expected: nothing.
//
// The plan was to trade four animation constants for one honest fudge — a scaled
// gravity, picked to put the fall on the same compressed clock as the growth. It
// turned out not to be needed. Gravity is 9.81, air is 1.2, and the lamina's mass
// per area is a real and heavily measured plant trait; the only other things needed
// are the world's two exchange rates, and the piece had already fixed both (16
// units to the metre-tall plant, 125 plant-time units to the second). Put those
// together and every number in the fall is either physics or biology.
//
// It also lands in the right place without being aimed there. A drained blade's
// terminal velocity comes out at 0.78 m/s, which is what a dead leaf does, and the
// blades these margins grow come out spread across the flutter/tumble transition
// instead of piled up on one side of it. An earlier draft DID pick the density by
// hand, trying to arrange exactly that, and did worse. The measured numbers were
// better than the chosen ones, which is the argument for this whole project in
// miniature. See TUNING.md.

import { TAU, clamp, v3, v3set, v3norm, v3cross } from './00_math.js';
import { WORLD } from './37_wind.js';

export const FALL_DEFAULTS = {
  // --- the world's scales and the air, both shared ---------------------------
  //
  // `unitM`, `ptPerSec`, `gEarth` and `rhoAir` used to be written out here. They
  // live in `WORLD` in `37_wind.js` now, because the wind field needs the same
  // density of air and the same two exchange rates, and a second definition of the
  // density of air is exactly the class of bug that branch exists to remove. Every
  // key name is unchanged, so a harness can still override any of them.
  ...WORLD,

  // --- measured physical quantities -------------------------------------------
  //
  // This is the part worth arguing about, and the argument is that there is
  // nothing to tune. `g` is gravity. `lma` is leaf mass per area, which is one of
  // the most heavily measured traits in plant ecology and runs 50-150 g/m2 across
  // most species; 120 fresh and 72 dry sits mid-range. `rhoAir` is air.
  //
  // Put those three together with the two scales above and the fall has no free
  // parameters. It also comes out RIGHT: a drained blade's broadside terminal
  // velocity works out at about 0.78 m/s, which is what a dead leaf does, and the
  // dimensionless moment of inertia lands on 0.1-1.8 across the blades these
  // species actually grow — straddling the flutter/tumble transition rather than
  // sitting to one side of it. That straddle is a RESULT, not a calibration. An
  // earlier draft of this file picked `sigma` by hand to try to achieve it and put
  // every blade on the same side; the real numbers did better than the chosen ones.
  lmaFresh: 0.120,  // kg/m^2, turgid lamina
  lmaDry: 0.072,    // kg/m^2, once it has drained into its own veins. A dry blade
                    // is lighter, which moves it in the regime plane, so drying
                    // can change how a leaf falls — and 0.6 of fresh is the
                    // ordinary fresh-to-dry ratio for a leaf.
  thickM: 0.0004,   // lamina thickness, metres. Real, and roughly scale-invariant
                    // across one plant's leaves. Only enters the along-chord added
                    // mass, which is nearly nothing; the mass comes from lma.
  rhoF: 1.0,        // the medium, in world units. Fixing it at 1 is what defines
                    // the world's mass unit; everything else is a ratio to it.

  // --- quasi-steady coefficients --------------------------------------------
  // These are the model's, not this project's. Values in the range the JFM papers
  // fit to experiment; none of them is doing aesthetic work.
  cPar: 0.18,       // form drag along the chord (edge-on: small)
  cPerp: 1.95,      // form drag across the chord (broadside: nearly a bluff body)
  cT: 1.20,         // translational circulation, 2D
  cR: Math.PI,      // rotational circulation, 2D
  // Rotational damping is NOT an independent coefficient, and treating it as one
  // was a mistake carried for several revisions. The torque resisting spin is the
  // same normal-force drag as `cPerp`, just integrated over a chord whose local
  // speed is omega*r instead of being uniform — so it uses the same coefficient. It
  // was set to 0.90 by nothing but habit, which quietly halved the damping and is
  // part of why the fall came out too lively. `null` means "use cPerp".
  cRot: null,

  // THE BLADE IS NOT A 2D PLATE, and this is the term that stopped it looking
  // "flappy and spinny" — which was the first honest reaction to watching it.
  //
  // The model above solves a cross-section, which is to say a plate of infinite
  // span. A leaf is a stub: a few units long and nearly as wide. Air escapes round
  // the ends of a short plate instead of being turned by it, so the circulation
  // actually developed is a fraction of what two-dimensional theory predicts, and
  // circulation is exactly what drives both the lift and the spin. Uncorrected 2D
  // lift on a leaf-shaped plate is roughly twice reality, and it showed: blades
  // rotated several times a second and glided further sideways than they fell.
  //
  // The correction is the ordinary finite-span one, AR/(AR+2) — Prandtl, and it is
  // in every aerodynamics text. What makes it worth having here rather than merely
  // necessary is where AR comes from: span over chord is the blade's LENGTH over its
  // WIDTH, and that is the one number `30_leaf.js` overwrites with whatever the
  // margin grew. So this does not damp every blade equally. A long narrow leaf keeps
  // most of its lift and stays lively; a broad stubby one loses most of it and falls
  // steeply. Which of those a given blade is was decided by its own silhouette.
  arCorrect: true,  // set false in a harness to see the 2D behaviour it replaced

  // A SECOND ROTATIONAL PLANE — FALSIFIED, SHIPS DISABLED.
  //
  // Kept off, and kept runnable, for the same reason `rhoI: 0` keeps the dead second
  // inhibitor in `10_auxin.js` and `shootOpts.enabled` keeps the whole-plant stream in
  // `38_shoot.js`: a negative result you cannot re-measure is just a story. Switch it
  // on with `{tiltPlane: true}` and `test/fall.mjs`'s third section reproduces both
  // halves of what follows.
  //
  // WHAT IT WAS FOR. `fallFrame` draws a falling blade with its long axis LEVELLED,
  // because the borrowed 2D model needs gravity in the pitch plane and therefore needs a
  // horizontal pitch axis. So a blade hanging at a droop straightens out on the exact
  // frame it detaches on — measured at a median 27 degrees and up to 44 — which is the
  // one thing ROADMAP 7 step 4 says must not happen. This integrates the cross-section
  // along the blade's LENGTH as well, so the tilt is carried over at abscission and then
  // levelled aerodynamically by the same added-mass couple, with no new coefficient.
  //
  // IT WORKS, AND THEN IT DOES NOT.
  //
  //   * The seam closes completely: the long-axis jump goes 27.1 deg -> 0.00, and the
  //     chord jump 4.0 -> 1.0, over 24 blades caught letting go.
  //   * Dropped with its pitch at rest it is exactly what was wanted: from tilts of
  //     5-40 degrees it levels in 0.10-0.11 s, overshoots by at most 11, and not one
  //     blade of forty goes over.
  //   * But **once the pitch tumbles, this plane is pumped without bound.** With the
  //     pitch released anywhere between 15 and 75 degrees, 32-39 of 40 blades take the
  //     long axis past 90 degrees and the median excursion reaches 600-900 degrees —
  //     end over end, repeatedly.
  //
  // WHY, and it is a statement about the reduction rather than a bug to find. Two
  // independently-solved 2D planes do not exchange angular momentum. A real rigid body
  // has gyroscopic terms that move it between the planes and conserve the total; here
  // the pitch feeds the tilt through the frame (the sign of the tilt's restoring couple
  // goes as cos(th)) and nothing carries energy back, so a tumbling pitch drives the
  // tilt resonantly and there is no term that can stop it. It is well behaved only on
  // the knife-edge th = 0 or 90, which is not a solution.
  //
  // The route out is a genuine 3D rigid-body fall: one angular velocity, one inertia
  // tensor, Euler's equations, and the quasi-steady load evaluated on the 3D relative
  // flow. That should reproduce the validated 2D flutter/tumble ordering as its
  // in-plane limit, which is a real test to hold it to — and it is a rewrite of a
  // shipped file, so it wants its own branch.
  //
  // The cheaper route out is to stop handing it a 27-degree tilt. That tilt is
  // `sp.droop`, which is imposed; the pre-flight in ROADMAP 5 measured what a blade's
  // own weight would actually bend its petiole to, and got 4.8-13.2 degrees. At tilts
  // that size this plane never misbehaves. **So ROADMAP 7b would close most of this
  // seam by deleting the constant that opens it.**
  tiltPlane: false,

  // --- housekeeping ----------------------------------------------------------
  // HOW LONG A SHED BLADE IS DRAWN, and this stopped being a single number when
  // the fall became real.
  //
  // The old animation faded a blade out over a fixed 620 units from the moment it
  // let go, which was fine when the descent was a constant: it always covered the
  // same distance in that time. A physical fall does not. Blades now vary by nearly
  // tenfold in descent speed, and holding the old rule meant most of them were
  // half transparent before they were halfway down and evaporated in mid-air — the
  // CI gate caught it at 36 of 96 reaching the ground.
  //
  // So the fade keys off LANDING rather than off a clock. A blade is fully drawn for
  // the whole of its fall however long that takes, lies on the ground for `settle`,
  // and then goes. `life` is only a backstop for the rare glider that never lands.
  life: 1800,       // plant-time backstop, ~14s at 1x
  settle: 420,      // plant-time it lies on the ground before fading, ~3.4s
  wobble: 0.22,     // how much of the blade's margin asymmetry becomes initial
                    // angular velocity. Not a shape: a scale on a measured
                    // asymmetry, which is why it can be one number for all eight
                    // species.
  maxStep: 24,      // sub-steps per plant-time unit at rest. The flutter is much
                    // stiffer than the growth loop it rides inside.
  spinStep: 40,     // extra sub-steps per radian-per-plant-time of spin, so a
                    // tumbling plate refines itself and a drifting one does not
                    // pay for it.
  subCap: 4000,     // hard ceiling on sub-steps in one call, so a plate that does
                    // something unforeseen cannot take the frame with it.
};

// THE BLADE THAT IS DRAWN IS NOT THE ORGAN.
//
// `70_app.js` draws a blade at 0.80 of its organ's length and shrinks it a further
// 12% as it dries. That is a rendering decision and it predates this file, but the
// physics has to be about the blade on the screen or the whole exercise is void:
// the chord sets I*, and I* selects the regime. Using the organ length instead made
// every plate 1.4x too big and pushed the entire population toward fluttering.
//
// So the number lives here, once, and both the picture and the fall read it from
// the same place. It is defined in this file rather than in the renderer only
// because this file loads first — see the concatenation order in build.js.
export const BLADE_DRAWN = 0.80;      // drawn length as a fraction of organ length
export const BLADE_DRY_SHRINK = 0.12; // how much more it loses once fully drained
export function drawnBladeLen(len, sen) {
  return len * BLADE_DRAWN * (1 - clamp(sen || 0, 0, 1) * BLADE_DRY_SHRINK);
}

// How wide is this blade, and where is the centre of that width?
//
// Both are read off the grown margin rather than the `aspect` option, because the
// option is only a seed for it — `30_leaf.js` replaces `o.aspect` with what the
// margin actually did. `skew` is the part that matters most here: the signed
// offset of the centre of area from the midrib, in half-widths. It is small,
// it is different for every leaf, and it is the entire reason a fall has a
// direction.
export function bladeSection(leaf, samples = 24) {
  let area = 0, mom = 0, wmax = 0;
  if (!leaf || !leaf.margin || !leaf.margin.mature) {
    // A blade shed before its margin matured has no measured silhouette. Fall
    // back to the seeded aspect and no asymmetry; it will descend steadily,
    // which is the honest answer for a plate we know nothing about.
    const a = (leaf && leaf.o && leaf.o.aspect) || 0.44;
    return { width: 2 * a, skew: 0, area: 2 * a * 0.6 };
  }
  for (let i = 1; i < samples; i++) {
    const u = i / samples;
    const hl = leaf.margin.half(u, -1), hr = leaf.margin.half(u, 1);
    const w = hl + hr;
    area += w;
    // centre of this strip, signed, relative to the midrib
    mom += (hr - hl) * 0.5 * w;
    if (w > wmax) wmax = w;
  }
  area /= samples;
  const skew = area > 1e-6 ? (mom / samples) / area : 0;
  return { width: wmax, skew, area };
}

// Everything about the plate that the fall needs, worked out once at abscission.
//
// `len` is the blade's world length, so widths scale with it. `sen` is how far
// the blade drained before it let go, which is what makes it lighter.
// Gravity and areal density in WORLD units, derived from the physical quantities
// and the two scales. Both drop out of insisting that the dimensionless groups
// match: I* = sigma/(rhoF*c) has to equal lma/(rhoAir*c_metres), and terminal
// velocity has to convert. There is no freedom left in either.
export function fallScales(o) {
  return {
    g: o.gEarth / (o.unitM * o.ptPerSec * o.ptPerSec),
    sigmaFresh: o.lmaFresh / (o.rhoAir * o.unitM),
    sigmaDry: o.lmaDry / (o.rhoAir * o.unitM),
    thick: o.thickM / o.unitM,
  };
}

export function plateOf(leaf, len, sen, opt) {
  const o = { ...FALL_DEFAULTS, ...(opt || {}) };
  const S = fallScales(o);
  const sec = bladeSection(leaf);
  const c = Math.max(1e-4, sec.width * len);       // chord: the blade's width
  const h = S.thick;                               // thickness, world units
  const sigma = S.sigmaFresh +
    clamp(sen, 0, 1) * (S.sigmaDry - S.sigmaFresh);
  const m = sigma * c;                             // mass per unit span
  const I = m * c * c / 12;                        // about the long axis
  // 2D thin-plate added mass and added moment of inertia, half-chord a = c/2.
  const m11 = 0.25 * Math.PI * o.rhoF * h * h;     // along the chord: negligible
  const m22 = 0.25 * Math.PI * o.rhoF * c * c;     // broadside: dominant
  const Ia = Math.PI * o.rhoF * c * c * c * c / 128;
  // The dimensionless moment of inertia that selects the regime — the papers'
  // (rho_s/rho_f)(h/c), which with an areal density is just sigma/(rho_f c). So it
  // is made of two world constants and ONE measured quantity: the width the margin
  // grew. Big broad blades sit low in it and flutter; small narrow ones sit high
  // and tumble; a blade that drained before letting go has moved down it.
  const Istar = sigma / (o.rhoF * c);
  // Finite span. AR is the blade's length over its width, both measured off the
  // margin, so how much lift this particular blade loses is its own business.
  const AR = Math.max(0.05, len / c);
  const arf = o.arCorrect ? AR / (AR + 2) : 1;
  return { o, g: S.g, c, h, sigma, m, I, m11, m22, Ia, Istar,
           AR, cT: o.cT * arf, cR: o.cR * arf,
           cRot: o.cRot === null || o.cRot === undefined ? o.cPerp : o.cRot,
           skew: sec.skew, area: sec.area };
}

// The 2D state, in the vertical plane the blade fell into.
//
//   s, y   position in that plane: s is the horizontal coordinate along the
//          plane's own axis, y is height. Both world units.
//   th     angle of the chord from horizontal
//   vs, vy, om   the velocities
// `drop` is how far this blade can fall before it is on the ground: the height of
// its attachment above the plant's base. It matters more than it sounds like it
// should. Without it a blade falls for its whole drawn life, and the first version
// of this had blades descending 60 world units and drifting 70 sideways through a
// scene 16 units tall — physically fine, and completely useless. A leaf that lands
// is also the only version of this that can be MEASURED, because drift-to-landing
// is the number that decides whether a fall stays in frame.
// `th0` and `om0` CLOSE THE SEAM (ROADMAP 7 step 4). Pass the attitude and the
// angular velocity the blade already had while it was attached and the fall starts
// from the motion that was already happening, which is the acceptance criterion for
// that step: you should not be able to tell from the motion which frame a blade
// detached on. `40_plant.js:startFall` measures both off the drawn frame and the
// attached rock.
//
// The fallbacks are what shipped before there was an attached model to be continuous
// with: released nearly broadside — a leaf on a stem is held roughly horizontal, and
// that is the attitude with the most drag — tilted by the blade's own asymmetry, and
// with an initial rate scaled off that same asymmetry by `wobble`. They are still
// used by `test/fall.mjs`, which drops blades in isolation with no plant attached.
export function fallState(plate, drop = Infinity, th0, om0, ph0) {
  const skew = plate.skew;
  const th = th0 === undefined ? skew * 0.5 : th0;
  const tilt = plate.o.tiltPlane && ph0 !== undefined ? ph0 : 0;
  return {
    plate, t: 0,
    s: 0, y: 0, th,
    vs: 0, vy: 0,
    om: om0 === undefined ? -skew * plate.o.wobble : om0,
    // The tilt of the long axis out of horizontal, and its rate. `ph0` is the tilt the
    // blade was hanging at, so the drawn axis need not jump at abscission — but only if
    // `tiltPlane` is on, which it is not: see FALL_DEFAULTS for the measurement that
    // switched it off, and note that a tilt carried over with nothing integrating it
    // would be worse than the jump, since it would never level at all.
    ph: tilt, omPh: 0, ph0: tilt,
    th0: th,
    turns: 0, sMin: 0, sMax: 0, vyPeak: 0,
    revs: 0, _sgn: 0, spin: 0,
    thMin: th, thMax: th,
    ground: -Math.abs(drop), landed: 0, tLand: 0,
  };
}

// One step of the quasi-steady plate. `dt` in plant-time.
//
// Written in the body frame — components along the chord and across it — because
// that is where the added-mass tensor is diagonal and the circulation has a clean
// form. The rotating-frame terms (`om * v`) are what carry the coupling that makes
// the thing interesting.
export function fallStep(st, dt) {
  const p = st.plate, o = p.o;
  // Adaptive sub-stepping, and it is not optional. The flutter is an order of
  // magnitude stiffer than the growth loop this rides inside, and a tumbling plate
  // is stiffer again — the first version of this integrated at six sub-steps and
  // test/fall.mjs showed mid-range chords running away to 1e124 within a hundred
  // plant-time units. The step is set from the plate's CURRENT spin, so a plate
  // that is barely rocking is cheap and one that is going over pays for itself.
  if (st.landed) {
    // On the ground. A leaf that has landed keeps settling for a moment — it is
    // still a sheet with air under it — and then lies flat, which is the attitude
    // `50_geom.js` already draws a dried blade curling into.
    st.t += dt;
    st.th += (Math.round(st.th / Math.PI) * Math.PI - st.th) * Math.min(1, dt * 0.02);
    // ...and the long axis settles level, on the same relaxation, so litter lies flat
    // rather than propped on one end.
    st.ph += (Math.round(st.ph / Math.PI) * Math.PI - st.ph) * Math.min(1, dt * 0.02);
    st.omPh = 0;
    return st;
  }
  let rem = dt, guard = 0;
  while (rem > 1e-9 && guard++ < o.subCap) {
    let h = 1 / (o.maxStep + o.spinStep * Math.abs(st.om));
    if (h > rem) h = rem;
    rem -= h;
    const c = Math.cos(st.th), sn = Math.sin(st.th);
    // world velocity -> body frame
    const vPar = st.vs * c + st.vy * sn;
    const vPerp = -st.vs * sn + st.vy * c;
    const sp = Math.hypot(vPar, vPerp);

    // Circulation. The translational part is the flat-plate sin(2a) law written
    // without ever forming the angle: sin(2a) = 2*vPar*vPerp/sp^2.
    const gam = sp > 1e-9
      ? -0.5 * p.c * (p.cT * 2 * vPar * vPerp / sp - p.cR * p.c * st.om)
      : 0.5 * p.c * p.c * p.cR * st.om;

    // Kutta-Joukowski lift, perpendicular to the velocity, plus form drag
    // resolved along and across the chord, plus gravity projected into the frame.
    const lPar = -o.rhoF * gam * vPerp;
    const lPerp = o.rhoF * gam * vPar;
    const dPar = 0.5 * o.rhoF * p.c * o.cPar * sp * vPar;
    const dPerp = 0.5 * o.rhoF * p.c * o.cPerp * sp * vPerp;
    const gPar = -p.m * p.g * sn;
    const gPerp = -p.m * p.g * c;

    const aPar = ((p.m + p.m22) * st.om * vPerp + lPar - dPar + gPar) / (p.m + p.m11);
    const aPerp = (-(p.m + p.m11) * st.om * vPar + lPerp - dPerp + gPerp) / (p.m + p.m22);
    // The added-mass (Munk) torque. This is the term that turns a plate BROADSIDE
    // to its own motion, which is why a dropped card falls flat, and with the
    // circulation it is what stalls and flips it.
    //
    // The sign is negative and that was established by measurement, not by
    // reading it off the page: with the other sign, test/fall.mjs's sweep showed
    // plates settling EDGE-ON and knifing down at twice terminal velocity, which
    // is the opposite of the one behaviour everybody has seen a falling card do.
    // Frame conventions differ between write-ups of this model; the falling card
    // does not.
    const tq = -(p.m22 - p.m11) * vPar * vPerp
      - p.cRot * o.rhoF * p.c * p.c * p.c * p.c * Math.abs(st.om) * st.om / 64;
    const aOm = tq / (p.I + p.Ia);

    // THE SECOND PLANE: the long axis levelling itself.
    //
    // Everything above solves the cross-section across the WIDTH. This solves the one
    // along the LENGTH, and it exists because the blade has to come off the plant at
    // the tilt it was hanging at rather than snapping level — a drooping blade
    // straightened out on the exact frame it detached on, by a median of 27 degrees,
    // which is precisely the tell ROADMAP 7 step 4 forbids.
    //
    // It is the SAME added-mass couple, and it needs no new coefficient: a plate turns
    // its face into the flow, and for a blade coming down that means its plane goes
    // horizontal, which levels the long axis. The "chord" of this cross-section is the
    // blade's length and its "span" is the width, so every quantity is the pitch
    // plane's with `c` and the length swapped. Since the equation is a torque over an
    // inertia and both scale with the span, the span cancels and this is written per
    // unit width exactly as the pitch is written per unit span.
    //
    // WHAT THIS IS NOT is a three-dimensional rigid body. The coupling runs one way:
    // the pitch drives the tilt through the frame, the tilt does not feed back into the
    // pitch, and gravity stays in the pitch plane where the borrowed model needs it.
    // That keeps the validated flutter/tumble physics above bit-for-bit unchanged —
    // `test/fall.mjs`'s regime ordering is an assertion about it — and buys continuity
    // of the drawn attitude, which is what was actually wrong. A real 3D solve would be
    // a different piece of work and would invalidate that validation.
    if (o.tiltPlane) {
    const spn = Math.max(1e-4, p.AR * p.c);          // the blade's length
    const m22b = 0.25 * Math.PI * o.rhoF * spn * spn;
    const Ib = p.sigma * spn * spn * spn / 12 + Math.PI * o.rhoF * Math.pow(spn, 4) / 128;
    // The world velocity resolved on the tilted long axis and on the plate normal. Both
    // fall out of the frame `fallFrame` builds; see the derivation there.
    const cp = Math.cos(st.ph), sp2 = Math.sin(st.ph);
    const vLen = st.vy * sp2;
    const vNrm = -st.vs * sn + st.vy * c * cp;
    const tqPh = -(m22b - o.rhoF * 0.25 * Math.PI * p.h * p.h) * vLen * vNrm
      - p.cRot * o.rhoF * Math.pow(spn, 4) * Math.abs(st.omPh) * st.omPh / 64;
    st.omPh += (tqPh / Ib) * h;
    st.ph += st.omPh * h;
    }

    const nPar = vPar + aPar * h, nPerp = vPerp + aPerp * h;
    st.om += aOm * h;
    st.th += st.om * h;
    st.spin += Math.abs(st.om) * h;   // rotation TRAVELLED, not net
    // body frame -> world, with the NEW angle
    const c2 = Math.cos(st.th), s2 = Math.sin(st.th);
    st.vs = nPar * c2 - nPerp * s2;
    st.vy = nPar * s2 + nPerp * c2;
    st.s += st.vs * h;
    st.y += st.vy * h;
    st.t += h;

    if (st.y <= st.ground) {
      st.y = st.ground;
      st.landed = 1; st.tLand = st.t;
      st.vs = st.vy = 0; st.om = 0; st.omPh = 0;
      rem = 0;
      break;
    }

    if (st.s < st.sMin) st.sMin = st.s;
    if (st.s > st.sMax) st.sMax = st.s;
    if (-st.vy > st.vyPeak) st.vyPeak = -st.vy;
    if (st.th < st.thMin) st.thMin = st.th;
    if (st.th > st.thMax) st.thMax = st.th;

    // Reversals of the pitch. This is what separates flutter from tumble, and it
    // is counted rather than inferred. The deadband is on angular velocity scaled
    // by the plate's own size, so it is not a threshold in disguise: a plate that
    // is merely drifting through zero does not score a reversal.
    const dead = 0.02 / Math.max(1e-3, p.c);
    const sg = st.om > dead ? 1 : st.om < -dead ? -1 : 0;
    if (sg !== 0) {
      if (st._sgn !== 0 && sg !== st._sgn) st.revs++;
      st._sgn = sg;
    }
  }
  st.turns = Math.abs(st.th - st.th0) / TAU;
  return st;
}

// Which of the three behaviours did this blade actually do?
//
// The distinction is not a threshold on a parameter — it is read off the
// trajectory, the same way it is read off a tank experiment. A tumbler keeps
// accumulating rotation in one direction; a flutterer reverses; a steady descent
// does neither.
// Which of the behaviours did this blade actually do?
//
// The real discriminator in the literature is whether the pitch angle is BOUNDED.
// A flutterer rocks and comes back, so its rotation cancels; a tumbler keeps going
// the same way, so it does not. So the test is the fraction of travelled rotation
// that ended up as net rotation:
//
//   ratio = |th_end - th_start| / (rotation travelled)
//
// near 1 for a tumbler, near 0 for a flutterer, and in between for the chaotic
// band the papers report sitting between them. Two earlier versions of this
// function used net angle alone and then amplitude alone; both misread a plate
// that went round and came back, which is exactly the case the ratio settles.
//
// These thresholds are for NAMING a trajectory and nothing in the simulation reads
// them. The drawn fall is the integrated one whatever this returns.
export function fallRegime(st) {
  if (st.spin < 0.9) return 'steady';      // barely rotated: settles and glides
  const ratio = Math.abs(st.th - st.th0) / st.spin;
  if (ratio > 0.7) return 'tumble';
  if (ratio < 0.3) return 'flutter';
  return 'chaotic';
}

// --- placing the 2D fall back in the scene ---------------------------------
//
// WHICH AXIS THE PLATE PITCHES ABOUT, and it took reading `50_geom.js:139` to get
// this right rather than plausible. A blade is drawn with `frame.x` along its
// length, `frame.z` across its width, and `frame.y` as its normal. A leaf rocks
// about its MIDRIB, so the two-dimensional cross-section the integrator solves is
// the WIDTH — the chord is `z`, and the axis it pitches about is `x`. The first
// version of this rotated the long axis instead, which is a leaf rolling end over
// end down its own length: a plausible-looking motion that is not the one the
// integrator was solving, so the regime measured in `test/fall.mjs` and the motion
// on screen would have been about different objects.
//
// So: the long axis stays horizontal and fixed, and the blade rocks about it in the
// vertical plane. The plane is therefore set by the direction the leaf was pointing
// when it let go — which is to say by phyllotaxis.
const _fallUp = v3(0, 1, 0), _fallPl = v3();

// The horizontal axis the blade pitches about: its long axis, flattened.
export function fallAxis(frame, out) {
  v3set(out, frame.x[0], 0, frame.x[2]);
  if (Math.hypot(out[0], out[2]) < 1e-5) {
    // pointing straight up or down, so its long axis gives no horizontal: use the
    // width axis, which is guaranteed perpendicular to it
    v3set(out, frame.z[0], 0, frame.z[2]);
    if (Math.hypot(out[0], out[2]) < 1e-5) v3set(out, 1, 0, 0);
  }
  return v3norm(out, out);
}

// Build the drawn frame for a falling blade: the 2D state rotated back out into its
// own vertical plane.
export function fallFrame(st, frame, axis, out) {
  const c = Math.cos(st.th), s = Math.sin(st.th);
  // The long axis is no longer level. `ph` is its tilt out of horizontal, integrated
  // in `fallStep`, and it starts at whatever tilt the blade was hanging at — which is
  // what stops a drooping blade snapping straight the instant it lets go. `u` is the
  // in-plane "up" the chord swings against, perpendicular to the tilted long axis, and
  // it reduces to world up when the axis is level.
  const cp = Math.cos(st.ph), sp = Math.sin(st.ph);
  // the in-plane horizontal, perpendicular to the pitch axis
  v3set(_fallPl, -axis[2], 0, axis[0]);
  for (let k = 0; k < 3; k++) {
    out.o[k] = frame.o[k] + _fallPl[k] * st.s + _fallUp[k] * st.y;
    out.x[k] = axis[k] * cp + _fallUp[k] * sp;             // length: tilted
    const uk = -axis[k] * sp + _fallUp[k] * cp;            // in-plane up
    out.z[k] = _fallPl[k] * c + uk * s;                    // width: the chord
  }
  // the normal follows, and the handedness is the one `50_geom.js` draws with:
  // an identity frame has z cross x = y
  v3cross(out.y, out.z, out.x);
  // 0 while it is still in the air, whatever that takes; then it fades where it
  // landed. The backstop case is a blade that never lands, which fades out over the
  // last `settle` of its life so it cannot hang in the frame forever.
  const o = st.plate.o;
  out.t = st.landed
    ? clamp((st.t - st.tLand) / o.settle, 0, 1)
    : clamp((st.t - (o.life - o.settle)) / o.settle, 0, 1);
  return out;
}

// ===========================================================================
// AN ATTACHED BLADE — ROADMAP 7 step 2
//
// The problem this half solves: everything still on the plant was a rigid card in
// dead calm. A shed blade was a properly loaded aerodynamic body and an attached one
// was not, so abscission was a discontinuity between two models of the same air.
//
// THE DEGREE OF FREEDOM IS THE ROCK ABOUT THE MIDRIB, and it is chosen to be the
// same one the fall integrates. `org.roll` already rotates a blade about its own
// petiole (40_plant.js:472) — that is the axis a leaf rocks on, it is the axis the
// falling plate pitches about, and using anything else would mean the attitude and
// the angular velocity had to be translated at the moment of letting go, which is
// exactly the seam ROADMAP 7 step 4 has to close. So an attached blade has one
// dynamic angle, it is added to the roll the organ grew, and at abscission it is
// handed straight to `fallState`.
//
// It is worth being explicit that this is ONE degree of freedom and a leaf has more.
// The petiole also BENDS — the blade lifts and drops as a whole — and that motion is
// bigger than the rock in most winds. It is left out deliberately: bending under the
// blade's own weight is what `sp.droop` currently stands in for, and deriving droop
// from a force balance is ROADMAP 7b, held back so that a change to every silhouette
// on every species does not arrive tangled up with a change to how things move.
//
// WHAT DRIVES IT. Three torques, all from the same quasi-steady plate as the fall,
// evaluated on the wind at the blade rather than on the blade's own velocity:
//
//   1. THE ADDED-MASS (MUNK) TORQUE. The dominant one, and the reason this is
//      interesting rather than decorative. A body in a flow feels a couple that turns
//      its largest-added-mass direction into the velocity — for a plate that is the
//      normal, so a plate turns its FACE to the flow. That is why a dropped card
//      falls flat, and attached it means the wind is always trying to rotate a blade
//      broadside to itself while the petiole pulls it back. Sign derived here rather
//      than copied: the equilibrium has to be face-on, and `test/wind.mjs` asserts a
//      free blade in steady wind rotates to it.
//   2. THE OFFSET-AREA TORQUE. The normal force acts through the blade's centre of
//      area, which is not on the midrib, because the two halves of a margin pattern
//      independently (30_leaf.js:91). So the same wind gives every blade a slightly
//      different steady twist, in a direction its own silhouette decided. Same
//      `skew` the fall uses to break the symmetry of a tumble.
//   3. ROTATIONAL DAMPING. The chord sweeping through air, `cRot`, unchanged from
//      the fall. Whether this is enough on its own is a measurement, not an
//      assumption — see `zeta` below.
//
// WHAT HOLDS IT. The petiole, as a torsional spring: `k = GJ/L` over the real
// tapered length, with `G = E/(2(1+nu))` and `J = pi r^4 / 2`. **Every input to that
// is already in the plant.** The petiole's length and radius are what the renderer
// draws (moved here, below, for the same reason `BLADE_DRAWN` is here), the radius
// comes off the stem radius which came off Murray's law, and `E` is the single
// material constant the ROADMAP 7 pre-flight settled on. So step 2 costs one number
// the project had already argued for, and no new geometry.
//
// WHY THE PETIOLE'S TAPER IS INTEGRATED RATHER THAN AVERAGED. Torsional stiffness
// goes as the fourth power of the radius, so a stalk that narrows from 0.5 to 0.3 of
// the stem radius is not adequately described by either end: the compliance is an
// integral of `dx/J(x)` and the thin end dominates it. Averaging the radius first
// would make the petiole 2.4x too stiff, which at fourth power is not a rounding
// error. It is two lines of algebra and it is exact for a linear taper.

export const FLAP_DEFAULTS = {
  // THE ONE MATERIAL CONSTANT, and it is not new. The ROADMAP 7 pre-flight measured
  // the plant's own emergent radii against a cantilever frequency and found that
  // `E ~ 60 MPa` puts seven of eight species in 0.49-4.6 Hz off nothing per-species.
  // 60 MPa is turgid, parenchyma-rich, succulent-like tissue — NOT wood, which is
  // 1-10 GPa. These stems are genuinely fleshy: slenderness runs 16-99 where a real
  // herbaceous stem is nearer 200. Do not reach for a woody `E` and then wonder why
  // everything buzzes. See TUNING.md, "the air", and ROADMAP 7's pre-flight table.
  eModulus: 60e6,   // Pa
  // Turgid parenchyma is mostly water and nearly incompressible, so 0.5 rather than
  // a metal's 0.3. It only enters as `G = E/(2(1+nu))`, so this is the difference
  // between dividing by 3 and dividing by 2.6.
  poisson: 0.5,
  // STRUCTURAL DAMPING, and it is a THIRD material constant, which TUNING.md says
  // should make you re-read the pre-flight rather than reach for it. It was reached
  // for anyway, and here is the argument, because the argument is a measurement.
  //
  // The blade is already damped aerodynamically by `cRot` — the chord sweeping
  // through air — and the hope was that this would be enough. It is not, and the
  // reason is structural rather than adjustable: aero rotational damping is
  // QUADRATIC in the rate, so at the microradian amplitudes this geometry produces it
  // contributes essentially nothing, and a blade set ringing by a gust rings
  // undamped forever. Material damping is linear and is what actually stops a real
  // petiole. Damping ratios measured on plant stems and petioles run about 0.05-0.2,
  // so 0.1 is mid-range and is not doing aesthetic work — at 800 Hz it means the ring
  // is gone in a quarter of a plant-time unit and the blade simply follows the wind,
  // which is the honest behaviour of a stalk this stout.
  zeta: 0.10,
  sub: 12,          // integrator substeps per period of the FORCING (the response is
                    // solved exactly, so nothing here has to resolve the spring)
  subCap: 96,
  // A stop, not a shape: no torsional spring on a real petiole is linear out to a
  // quarter turn, and a blade that has rotated this far has left the regime the
  // quasi-steady model describes anyway.
  maxFlap: 1.2,     // rad
};

// THE PETIOLE THE RENDERER DRAWS IS THE PETIOLE THAT HOLDS THE BLADE.
//
// These three numbers were in `70_app.js` and are here now, for exactly the reason
// `BLADE_DRAWN` is: the mechanics has to be about the stalk on the screen. If the
// drawn petiole and the sprung one disagree, a blade rocks on a spring nobody can
// see. One definition, read by both — `70_app.js` calls `petioleOf` now.
//
// The numbers themselves are still arbitrary, and this is the honest weak point of
// step 2 rather than something it fixed: the radius comes off the STEM's radius at
// the node, not off the blade the petiole carries, which is already ROADMAP 5's
// complaint about flower close-ups. Stiffness goes as r^4, so that arbitrariness is
// now load-bearing — see the JOURNAL entry for the measurement and what it implies.
export const PETIOLE = { ofOrganLen: 0.34, ofRadius: 1.8, rBase: 0.5, rTip: 0.30 };

export function petioleOf(org) {
  return {
    len: Math.max(1e-4, org.len * PETIOLE.ofOrganLen + org.radius * PETIOLE.ofRadius),
    r0: Math.max(1e-5, org.radius * PETIOLE.rBase),
    r1: Math.max(1e-5, org.radius * PETIOLE.rTip),
  };
}

// Young's modulus in world units. Stress has the dimensions of density times
// velocity squared, and both of those are already fixed: the medium is 1 by
// definition (`rhoF`) which is 1.2 kg/m^3, and one world velocity unit is
// `unitM*ptPerSec` = 7.8125 m/s. So there is no freedom in this conversion either.
export function stiffScales(o) {
  const vs = o.unitM * o.ptPerSec;
  const E = o.eModulus / (o.rhoAir * vs * vs);
  return { E, G: E / (2 * (1 + o.poisson)) };
}

// Torsional stiffness of the tapered petiole: k = G / integral(dx / J(x)), with
// J = pi r^4 / 2 and r linear along the stalk. Exact.
export function torsionK(pet, G) {
  const { len, r0, r1 } = pet;
  const jOf = (r) => Math.PI * r * r * r * r / 2;
  const comp = Math.abs(r1 - r0) < 1e-9
    ? len / jOf(r0)
    : (2 / Math.PI) * (len / (3 * (r1 - r0))) * (1 / (r0 * r0 * r0) - 1 / (r1 * r1 * r1));
  return G / Math.max(1e-12, comp);
}

// Everything an attached blade needs, worked out once. `len` is the DRAWN blade
// length, as for `plateOf` — the physics is about the blade on the screen.
export function flapOf(leaf, len, sen, pet, opt) {
  const o = { ...FALL_DEFAULTS, ...FLAP_DEFAULTS, ...(opt || {}) };
  const p = plateOf(leaf, len, sen, o);
  const S = stiffScales(o);
  const k = torsionK(pet, S.G);
  // The plate model is two-dimensional — per unit of span — so both the inertia and
  // the torques are multiplied by the span, which is the blade's own length. A bigger
  // blade therefore responds more slowly, which is the right way round.
  const J = Math.max(1e-12, (p.I + p.Ia) * len);
  return {
    o, p, k, J, span: len,
    om0: Math.sqrt(k / J),
    // The offset of the centre of area from the midrib, in world units. `skew` is in
    // the margin's own units, so it scales with the blade's length like every other
    // width in `bladeSection`.
    arm: p.skew * len,
    cStruct: 2 * o.zeta * Math.sqrt(k * J),
  };
}

export function flapState(f, phi = 0, om = 0) {
  return { f, phi, om, t: 0, phiMin: phi, phiMax: phi, spin: 0, hit: 0 };
}

// The aerodynamic torque, per unit span, SPLIT BY WHAT IT DEPENDS ON — a torque that
// does not care how fast the blade is turning, and a coefficient on how fast it is.
//
// The split is not cosmetic. Everything proportional to the rate belongs in the
// oscillator's damping, where the closed-form solution can integrate it exactly; held
// constant across a substep instead, it pumps the spring. That is not a hypothetical:
// the first version held the whole torque constant and a ringdown in DEAD AIR grew
// from 12 to 27 degrees over eight cycles. There is no energy source in still air, so
// the growth was the integrator, and it was hiding a real instability underneath — see
// `cCirc` below, which genuinely can be negative.
export function flapTerms(f, wz, wy, om) {
  const o = f.o, p = f.p;
  const sp = Math.hypot(wz, wy);
  // The plate's velocity through the air is minus the wind's. Every aerodynamic term
  // below is either quadratic in it or uses it twice, so this sign cannot be got
  // wrong — but writing it down is what makes these terms literally the fall's.
  const vPar = -wz, vPerp = -wy;
  // translational circulation: the flat-plate sin(2a) law, no rotation in it
  const gamT = sp > 1e-9 ? -0.5 * p.c * (p.cT * 2 * vPar * vPerp / sp) : 0;
  const dPerp = 0.5 * o.rhoF * p.c * o.cPerp * sp * vPerp;
  const tq0 = -(p.m22 - p.m11) * vPar * vPerp        // (1) added mass: turns it face-on
    + f.arm * (o.rhoF * gamT * vPar - dPerp);        // (2) force on the offset centre
  // ROTATIONAL CIRCULATION ON AN OFFSET CENTRE OF AREA IS NEGATIVE DAMPING half the
  // time, and this is the interesting term in the attached case. A rocking plate sheds
  // circulation proportional to its own rate; that circulation acts through a centre
  // of area the margin put off the midrib; so the resulting torque is proportional to
  // the rate with a sign set by which way the flow crosses the chord. When it is
  // negative it feeds the rock — which is what leaf flutter IS, and what the classical
  // torsional-galloping instability is. It is left with its own sign rather than
  // absolute-valued into a damper.
  const cCirc = -f.arm * o.rhoF * 0.5 * p.c * p.c * p.cR * vPar;
  // (3) form drag on the sweeping chord — `cRot`, the fall's. Quadratic in the rate,
  // so linearised at the current rate: exact here, always dissipative, and vanishing
  // at small amplitude, which is why it cannot be the only damping (see `zeta`).
  const cRotL = p.cRot * o.rhoF * p.c * p.c * p.c * p.c * Math.abs(om) / 64;
  return { tq0, cAero: cCirc + cRotL, sp };
}

// The whole aerodynamic torque, per unit span. Nothing in the simulation calls this —
// the integrator wants the split — but a harness checking the model against the fall's
// wants the sum, and writing it as the sum is what documents that the split is one.
export function flapTorque(f, wz, wy, om) {
  const t = flapTerms(f, wz, wy, om);
  return t.tq0 - t.cAero * om;
}

// One step of the attached blade. `wz` and `wy` are the wind velocity resolved on the
// blade's own chord and normal — `40_plant.js` does that projection, because it is the
// thing that holds the frame. `dt` in plant time.
//
// The sense of `phi` is the sense of `org.roll` and of the fall's `th`: all three
// rotate the chord toward the blade's normal. That is not a coincidence to be checked
// later, it is the whole reason the seam can close.
//
// THE LINEAR PART IS SOLVED EXACTLY, and it has to be. A petiole this stout is a
// violently stiff spring — measured at 374-4000 Hz on the radii the plant grows,
// which is 19-200 radians per plant-time unit — and an explicit integrator needs
// hundreds of substeps per unit not to explode. The first version stepped
// symplectically with a cap of 96 and the stiffest blade on the specimen blew up
// through the cap and pinned itself against `maxFlap`, where it read as a plausible
// 68-degree twist. So the damped harmonic oscillator is advanced by its closed-form
// solution over the substep with the aerodynamic torque held constant, which is
// unconditionally stable at any stiffness and needs one substep rather than four
// hundred. What is left explicit is the quadratic aero damping inside `flapTorque`,
// which is a small correction at these amplitudes.
export function flapStep(st, wz, wy, dt) {
  const f = st.f, o = f.o, p = f.p;
  const sp = Math.hypot(wz, wy);
  // Substeps now resolve the FORCING rather than the response — the response is
  // exact — so the rate that matters is how fast the flow crosses the chord.
  const rate = sp / Math.max(1e-6, p.c);
  const sub = Math.min(o.subCap, Math.max(1, Math.ceil(dt * rate * o.sub / TAU)));
  const h = dt / sub;
  const wn = f.om0;
  const crit = 2 * Math.sqrt(Math.max(1e-30, f.k * f.J));
  for (let i = 0; i < sub; i++) {
    const T = flapTerms(f, wz, wy, st.om);
    // The damping ratio is recomputed each substep because the air contributes to it,
    // and the air's contribution CAN BE NEGATIVE — a blade can be self-exciting. It is
    // clamped either side of critical rather than branching on the overdamped case,
    // which no plant tissue is anywhere near, and bounded below so that an unstable
    // blade grows at a finite rate instead of overflowing.
    const zt = clamp((f.cStruct + T.cAero * f.span) / crit, -0.999, 0.999);
    const wd = wn * Math.sqrt(1 - zt * zt);
    // Where the spring would hold it if this torque were steady. For a petiole this
    // stiff the blade is here almost immediately, which is the honest answer.
    const eq = f.k > 0 ? T.tq0 * f.span / f.k : 0;
    const A = st.phi - eq;
    const B = wd > 1e-12 ? (st.om + zt * wn * A) / wd : 0;
    const dec = Math.exp(-zt * wn * h);
    const cs = Math.cos(wd * h), sn = Math.sin(wd * h);
    st.phi = eq + dec * (A * cs + B * sn);
    st.om = dec * ((-zt * wn * A + wd * B) * cs - (zt * wn * B + wd * A) * sn);
    if (st.phi > o.maxFlap) { st.phi = o.maxFlap; st.om = Math.min(0, st.om); st.hit++; }
    if (st.phi < -o.maxFlap) { st.phi = -o.maxFlap; st.om = Math.max(0, st.om); st.hit++; }
    st.spin += Math.abs(st.om) * h;
    st.t += h;
    if (st.phi < st.phiMin) st.phiMin = st.phi;
    if (st.phi > st.phiMax) st.phiMax = st.phi;
  }
  return st;
}
