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
export function fallState(plate, drop = Infinity) {
  const skew = plate.skew;
  // Released nearly broadside — a leaf on a stem is held roughly horizontal, and
  // that is the attitude with the most drag, so this is where a fall starts. The
  // tilt it starts with is the blade's own asymmetry, not a random number.
  return {
    plate, t: 0,
    s: 0, y: 0, th: skew * 0.5,
    vs: 0, vy: 0,
    om: -skew * plate.o.wobble,
    th0: skew * 0.5,
    turns: 0, sMin: 0, sMax: 0, vyPeak: 0,
    revs: 0, _sgn: 0, spin: 0,
    thMin: skew * 0.5, thMax: skew * 0.5,
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
      st.vs = st.vy = 0; st.om = 0;
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
  // the in-plane horizontal, perpendicular to the pitch axis
  v3set(_fallPl, -axis[2], 0, axis[0]);
  for (let k = 0; k < 3; k++) {
    out.o[k] = frame.o[k] + _fallPl[k] * st.s + _fallUp[k] * st.y;
    out.x[k] = axis[k];                                   // length: fixed, level
    out.z[k] = _fallPl[k] * c + _fallUp[k] * s;            // width: the chord
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
