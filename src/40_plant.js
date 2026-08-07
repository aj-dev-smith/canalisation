// ---------------------------------------------------------------------------
// THE ORGANISM
//
// The meristem decides where organs go and when. This file only has to believe
// it. Nothing here invents an angle, a spacing or a branching rule — it reads
// them off the simulation and builds a body around them.
// ---------------------------------------------------------------------------

import { Infection, AGENTS, PATHOGEN_DEFAULTS } from './15_pathogen.js';
import { Meristem } from './20_meristem.js';
import { Leaf } from './30_leaf.js';
import { Fruit } from './35_fruit.js';
import { Vasculature } from './38_shoot.js';
import { windField, windAt, WORLD } from './37_wind.js';
import { Bend, stemScales, STEM_DEFAULTS } from './39a_stem.js';
import {
  plateOf, fallState, fallStep, fallAxis, drawnBladeLen, bladeSection,
  petioleOf, flapOf, flapState, flapStep, fallScales, bendOf, bendAngle,
  bladeAreaOf, FALL_DEFAULTS, FLAP_DEFAULTS,
} from './39_fall.js';
import {
  v3, v3set, v3copy, v3add, v3sub, v3scale, v3addScaled, v3dot, v3cross,
  v3norm, v3len, v3lerp, v3rotAxis, TAU, clamp, lerp, smoothstep, mulberry32,
} from './00_math.js';

// A frond hanging off one node of an axis.
class Organ {
  constructor(node, angle, leaf, seed) {
    this.node = node;
    this.angle = angle;
    this.leaf = leaf;
    this.age = 0;
    this.rnd = mulberry32(seed);
    this.len = 0;
    this.maxLen = 0;
    // How far the petiole bends under the blade — ROADMAP 7b. `bendH` is what a
    // horizontal stalk would do; `bend` is the balance resolved against the angle the
    // organ actually grew at, and it is filled in with the frame. Both start at zero,
    // which is what a leaf that does not exist yet weighs.
    this.bendH = 0;
    this.bend = 0;
    this.tilt = 0;
    this.frame = { o: v3(), x: v3(), y: v3(), z: v3() };
  }
}

// HOW OFTEN THE BALANCE IS RE-SOLVED, and why it is not every step.
//
// `bendOf` integrates the grown margin twice — once for the blade's area and once for
// where along its own length that area sits — and a specimen carries up to 119 organs.
// The inputs only move as the organ grows, so it is recomputed when the blade's length
// or its state of drainage has actually shifted, on the same reasoning `stepFlaps`
// rebuilds its plate. A 2% band is well under a degree of hang.
function updateBend(org) {
  const sen = org.sen || 0;
  if (org._bendAt !== undefined
    && Math.abs(org.len - org._bendAt) < 0.02 * Math.max(1e-6, org.len)
    && Math.abs(sen - org._bendSen) < 0.02) return;
  org._bendAt = org.len;
  org._bendSen = sen;
  org.bendH = bendOf(org).thetaH;
}

// ---------------------------------------------------------------------------
// THE GRAVITROPIC SET POINT — why a branch is not simply vertical
//
// Every axis in this engine used to want the same thing: `want = (0,1,0)`, for
// the leader and for a branch alike. That is orthotropy, and it has exactly one
// fixed point. A conifer's laterals are PLAGIOTROPIC — they hold a near
// horizontal angle for life — so with one set point the crown came out a vase,
// widest at the top, with the long lower branches curving up over the leader.
// `test/conifer.mjs` measured that and `test/tree.mjs` is where it is now
// checked the other way round.
//
// The angle is not drawn. It is the fixed point of a competition between two
// auxin fluxes in the same tissue, and both are measured:
//
//   GRAVITROPISM. Statoliths sediment onto whichever statocyte wall is lowest,
//   PIN follows them to that membrane, auxin is pumped to the underside, the
//   underside elongates, the shoot bends up. Alone this has one fixed point,
//   straight up.
//
//   THE ANTIGRAVITROPIC OFFSET. On a clinostat — gravity signal removed —
//   Arabidopsis lateral shoots bend OUTWARD, "never observed in primary
//   shoots". So a second component is always pushing the organ away from
//   vertical, and it is unmasked the moment gravity stops arguing with it.
//   (Roychoudhry, Del Bianco, Kieffer & Kepinski 2013, Curr Biol 23:1497–1504.)
//
// The gravitropic set point is where they cancel: "angle-dependent variation in
// downward gravitropic auxin flux acting against angle-independent upward,
// antigravitropic flux." The two are separable down to the carrier — PIN7 to
// the UPPER statocyte membrane is the antigravitropic one, PIN3 to the LOWER is
// the gravitropic one, and auxin shifts PIN3 downward through RCN1/PP2A
// dephosphorylation (Roychoudhry et al. 2023, Nature Plants 9:1500–1513). So
//
//        MORE AUXIN  ->  SMALLER OFFSET  ->  MORE VERTICAL
//
// and that direction is the thing to get right. Reversed, the whole silhouette
// inverts — vigorous shoots would flop and starved ones would spire.
//
// ⚠ EVERY MOLECULAR DETAIL ABOVE IS DEMONSTRATED IN LATERAL ROOTS. The 2023
// paper is explicit that shoots are not addressed. For shoots the demonstrated
// level is that the offset exists, that it needs auxin transport, and that its
// magnitude is set by auxin signalling in the gravity-sensing cells. Which
// shoot PINs carry it, and with what polarity, is unknown. This is an
// extrapolation to an aerial organ and it is labelled as one here rather than
// in a commit message.
//
// ⚠ And the sine law is a modelling assumption, not a measurement: a 2025 PNAS
// paper finds every graviresponse component angle-dependent, including PIN
// polarisation, which undercuts the angle-independence the balance assumes.
// Nothing below writes a sine down — see `statocyteFlux`.
// ---------------------------------------------------------------------------

// How many walls the statocyte ring is resolved over. A resolution, not a
// physical quantity: `test/tree.mjs` sweeps it and the set point it produces
// moves by under a hundredth of a degree past sixteen.
export const STATOCYTE_WALLS = 16;

// The net PIN-mediated auxin flux across that ring, resolved antiparallel to
// gravity, for a tip whose transverse gravity component is `st` and whose
// constitutive offset is `ago`. Positive means the offset is winning and the
// tip is being driven further from vertical.
//
// NOTHING HERE WRITES sin(theta). The angle enters once, as `st` — the part of
// gravity that acts ACROSS the axis, which is the only part statoliths can
// sediment with. Along the axis they press on an end wall and say nothing about
// which way is up. That projection IS the sine law, and it arrives as geometry
// rather than as a chosen response curve.
export function statocyteFlux(st, ago, walls = STATOCYTE_WALLS) {
  let J = 0;
  for (let m = 0; m < walls; m++) {
    // the wall's outward normal resolved along the transverse component of
    // gravity: +1 is the wall facing straight down, -1 the one facing up
    const c = Math.cos((m + 0.5) * TAU / walls);
    const pinDown = Math.max(0, c) * st;    // statoliths, and the PIN that follows them
    const pinUp = Math.max(0, -c) * ago;    // the constitutive upper-membrane carrier
    J += (pinUp + pinDown) * -c;            // each wall's flux, resolved upward
  }
  return J / walls;
}

// The angle from vertical at which that sum crosses zero. Bisected rather than
// solved, deliberately: the set point stays the zero of whatever the wall sum
// is, so changing how PIN is allocated over the ring moves the angle without
// anything here having to be re-derived.
export function gsaOf(ago, walls = STATOCYTE_WALLS) {
  if (!(ago > 0)) return 0;
  if (statocyteFlux(1, ago, walls) > 0) return Math.PI / 2;   // the offset wins outright
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = 0.5 * (lo + hi);
    if (statocyteFlux(m, ago, walls) > 0) lo = m; else hi = m;
  }
  return Math.asin(0.5 * (lo + hi));
}

// The offset's magnitude, which is the one thing auxin sets. The response curve
// is not invented here: `10_auxin.js` already writes auxin's control of PIN as a
// Hill function with exponent `nP`, and this is that same curve read the other
// way up — auxin raises RCN1/PP2A, which dephosphorylates the carrier and moves
// it off the upper membrane.
export function agoOf(iaa, sp, prm) {
  if (!(sp.agoGain > 0)) return 0;
  const n = (prm && prm.nP) || 2;
  const k = Math.pow(sp.agoK, n);
  return sp.agoGain * k / (k + Math.pow(Math.max(0, iaa), n));
}

// ---------------------------------------------------------------------------
// APICAL CONTROL — what sets how fast a lateral extends
//
// The forestry literature draws a line the engine did not. Apical DOMINANCE is
// control over whether a bud opens at all; apical CONTROL is suppression of the
// vigour of a branch that has already opened. They are distinct and they are
// ANTI-correlated: conifers have weak dominance and strong control, oaks the
// reverse (Cline & Harrington 2007, Can J For Res 37:74–83; Brown, McAlpine &
// Kormanik 1967, Am J Bot 54:153–162). One `exp(-d/dominance)` field was being
// asked to be both, and one decay length cannot be weak and strong at once.
//
// So control is a PARTITION, not a field. Resource arriving at a fork divides
// between the two subtrees in proportion to their capacities, biased by one
// number L:
//
//   v_m = v * L*Q_m / (L*Q_m + (1-L)*Q_l)          the parent's continuation
//   v_l = v * (1-L)*Q_l / (L*Q_m + (1-L)*Q_l)      the branch
//
// (Borchert & Honda 1984; Palubicki, Horel, Longay, Runions, Lane, Mech &
// Prusinkiewicz 2009, ACM TOG 28(3):58.) In the published model Q is LIGHT,
// computed by shadow propagation. There is no light field here — so Q is the
// auxin traffic a subtree delivers to the fork, which is the quantity
// `updateRadii` already sizes a stem by. NOBODY HAS PUBLISHED THAT
// SUBSTITUTION; it is the experiment, and `test/tree.mjs` is where it is run.
//
// ⚠ Auxin is NOT the apical-control signal — three independent negatives, the
// cleanest being that auxin applied to an already-growing dominant shoot does
// not restore control at all. That is a negative about auxin CONCENTRATION as
// an inhibitor arriving from above. This is a competition for a partitioned
// flux, which is a different claim; it is not licensed by those experiments and
// it is not refuted by them either. See docs/research_7_30_26.md §1.3 and §1.6.
//
// L is a stated number and is defended as one rather than apologised for: "It is
// not known whether apical control in nature is exerted through competition for
// resources, hormonal control, or both." Nobody has derived it. 0.5 is the
// unbiased partition — proportional share, no bias either way.
//
// What this buys that `exp(-d/lambda)` could not: a branch's share depends on
// what it has already built, so it is a RATCHET with memory. The bottlebrush
// theorem — that ANY multiplier reading only distance-below-apex gives a
// cylinder or a straight cone and never a taper — does not apply to it.
// ---------------------------------------------------------------------------

class Axis {
  constructor(plant, base, dir, gen, seed) {
    this.plant = plant;
    this.gen = gen;
    this.seed = seed;
    this.rnd = mulberry32(seed);
    this.pts = [v3(base[0], base[1], base[2])];
    this.radii = [0.02];
    this.dir = v3(); v3norm(this.dir, dir);
    this.up = v3(0, 1, 0);
    // THE VERTICAL PLANE THIS AXIS GROWS OUT IN, remembered rather than re-read
    // off the tip every step. Gravity only ever argues about elevation — there
    // is no force that turns a shoot sideways — so a branch's azimuth has no
    // restoring term, and taking it from the current tip direction makes it a
    // random walk that wander and circumnutation drive. Measured, once the axes
    // stopped being vertical: a branch held a correct 59-degree elevation the
    // whole way up while its azimuth turned a full circle every nine segments,
    // so it corkscrewed 5.2 units up and 0.2 out. This is the axil's own
    // azimuth, which is emergent, and it is what the set point is held in.
    //
    // AND AN AXIS THAT LAUNCHED STRAIGHT UP HAS NO SUCH PLANE, which is where
    // the leader's orthotropy comes from — there is no flag anywhere saying a
    // primary shoot is different. An offset is a push away from vertical in some
    // direction, and a shoot with no dorsiventral axis has no direction to be
    // pushed in. That is the clinostat result read forwards: outward curvature
    // is unmasked in lateral shoots and "never observed in primary shoots",
    // because a primary shoot has no side to bend towards. A lateral gets its
    // plane from the axil it arose in, which is emergent.
    this.azim = v3(dir[0], 0, dir[2]);
    if (v3len(this.azim) < 1e-4) this.azim = null;
    else v3norm(this.azim, this.azim);
    // a stable reference frame carried up the axis, so organ angles mean
    // something consistent from node to node
    this.ref = v3();
    v3norm(this.ref, v3cross(this.ref, Math.abs(this.dir[1]) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0), this.dir));
    this.organs = [];
    this.nodes = [];
    this.kids = [];        // axes branching off this one, so they ride it when it bends
    this.parent = null;
    // THE REST SHAPE AND THE BENT ONE. `pts` is what everything draws and measures
    // off; `rest` is the shape growth actually produced. Each step the pose is
    // restored, grown, saved, and then bent — so growth never compounds on top of
    // last frame's wind, and the deflection is always about the shape the plant grew
    // into. See the gravity note at the top of `39a_stem.js` for why that shape is
    // the right thing to deflect about.
    this.rest = null;
    this.bend = new Bend(plant.sp && plant.sp.stemOpts);
    this.alive = true;
    this.length = 0;
    this.twist = 0;
    // Share of the leader's extension rate this apex commands, and the set
    // point it is holding. Both are computed, once per step, by `Plant`; the
    // leader starts at 1 because everything is expressed as a share of it.
    this.vigour = 1;
    this.gsa = 0;
    this.iaa = 0;
    this.attachOrgan = null;   // the organ in whose axil this shoot arose
    this.infection = null;     // an agent resident in this growing point, if any
    const P = plant.prm, M = { ...plant.mo };
    // a lateral shoot has a smaller growing point than the leader, which is
    // both true of real plants and considerably cheaper
    if (gen > 0) { M.R = M.R * 0.78; M.rCZ = M.rCZ * 0.9; M.rPZ = M.rPZ * 0.82; }
    this.meristem = new Meristem(P, M, seed);
    // A shoot does not start from a randomised sheet of cells — it starts from
    // a meristem that has already settled. Run it forward and throw away the
    // startup transient, or the plant is born wearing a burst of organs.
    const warm = gen === 0 ? 220 : 90;
    for (let i = 0; i < warm; i++) this.meristem.step(1);
    this.meristem.emitted.length = 0;
    this.meristem.divergence.length = 0;
    this.meristem.lastAngle = null;
    this.age = 0;
    this.lastOrganLen = -1e9;
    this.lastOrganAt = 0;
    this.florigen = 0;
    this.floral = false;
    this.fruit = null;
    this.floralCount = 0;
    this.lastFloralAt = 0;
  }

  tipPos() { return this.pts[this.pts.length - 1]; }

  step(dt, sp) {
    this.age += dt;
    if (!this.alive) {
      // an arrested shoot still fills out the organs it already made
      if (this.fruit) this.updateRadii(sp);
      for (const org of this.organs) {
        org.age += dt;
        const f2 = smoothstep(0, sp.organGrow, org.age);
        org.dev = f2;
        org.len = org.maxLen * (0.04 + 0.96 * f2);
        updateBend(org);
        if (!org.leaf) { org.leaf = org.petal ? this.plant.leaves.requestPetal(org.seed) : this.plant.leaves.request(org.seed); if (org.leaf) org.leafAt = org.age; }
      }
      this.updateRadii(sp);
      return;
    }
    const m = this.meristem;
    if (!m) return;
    m.step(dt);

    // --- elongate ------------------------------------------------------------
    // `this.vigour` was `(this.gen === 0 ? 1 : 0.72)` — one hardcoded number
    // shared by all eight species, which is why `test/conifer.mjs` found the
    // taper slope floored in (0.72, 1) with nothing able to reach below it. It
    // is a share of a partitioned flux now; see the apical-control note above.
    // A flower is a compressed shoot: floral identity suppresses internode
    // elongation (the same fact ROADMAP 0z1's whorls lean on). 0.22 was the
    // hardwired suppression; `floralElong` names it so a doubled flower —
    // which keeps founding organs far longer — can pack into a corolla
    // instead of stretching into a raceme of petals. Default is exactly 0.22.
    const fe = sp.floralElong === undefined ? 0.22 : sp.floralElong;
    const rate = sp.elongation * this.vigour * (this.floral ? fe : 1);
    const tip = this.tipPos();
    // WHERE THE TIP IS TRYING TO POINT, which is not simply up. `gsa` is the
    // angle from vertical at which this axis's two statocyte fluxes cancel;
    // zero recovers the orthotropic axis this engine had until now. The offset
    // is applied as an ELEVATION in the vertical plane the tip is already
    // heading in, so wander and nutation go on owning the azimuth.
    const want = v3(0, 1, 0);
    if (this.gsa > 1e-4 && this.azim) {
      const cs = Math.cos(this.gsa), sn = Math.sin(this.gsa);
      v3set(want, this.azim[0] * sn, cs, this.azim[2] * sn);
    }
    // WANDER AND CIRCUMNUTATION ARE PERTURBATIONS OF THE TIP'S OWN DIRECTION,
    // not of the world's vertical, and until an axis could point somewhere other
    // than up there was no way to tell the difference. Both used to be added
    // straight into `want[0]` and `want[2]`: on a near-vertical `want` that
    // tilts it, which is what they are for. On a branch holding 80 degrees off
    // vertical the same offset swings the AZIMUTH instead, and the branch coils
    // — measured chord 17 degrees on a branch whose every segment was laid down
    // at 70-80. The offsets go in the plane ACROSS `want` now, which is what
    // they always meant. For a vertical `want` this reproduces the old vectors
    // exactly, so the eight shipped species do not move.
    _zga[0] = 1; _zga[1] = 0; _zga[2] = 0;
    v3addScaled(_zga, _zga, want, -v3dot(_zga, want));
    if (v3len(_zga) < 1e-4) { _zga[0] = 0; _zga[1] = 0; _zga[2] = 1; v3addScaled(_zga, _zga, want, -v3dot(_zga, want)); }
    v3norm(_zga, _zga);
    v3cross(_zgb, _zga, want);
    const t = this.age * 0.004 + this.seed;
    // circumnutation — the slow helical search a real growing tip performs
    const nu = this.age * sp.nutation + this.seed * 0.7;
    const wa = Math.sin(t) * sp.wander + Math.cos(nu) * sp.nutAmp;
    const wb = Math.cos(t * 1.31) * sp.wander + Math.sin(nu) * sp.nutAmp;
    v3addScaled(want, want, _zga, wa);
    v3addScaled(want, want, _zgb, wb);
    v3norm(want, want);
    v3lerp(this.dir, this.dir, want, clamp(sp.tropism * dt, 0, 1));
    v3norm(this.dir, this.dir);

    this.elongate(dt, sp);

    const seg = rate * dt;
    this.length += seg;
    const last = this.pts[this.pts.length - 1];
    const np = v3();
    v3addScaled(np, last, this.dir, seg);
    // resample: keep one point per internode-ish distance
    if (v3len(v3sub(v3(), np, this.pts[this.pts.length - 1])) > 0 &&
      this.pts.length > 1 &&
      v3len(v3sub(v3(), np, this.pts[this.pts.length - 2])) < sp.segLen) {
      v3copy(this.pts[this.pts.length - 1], np);
    } else {
      this.pts.push(np);
      this.radii.push(0.02);
      if (this.pts.length > 900) { this.pts.shift(); this.radii.shift(); }
    }

    // Florigen: made in the leaves, carried to the tip, and when enough has
    // arrived the growing point stops making leaves and becomes a flower. So
    // WHEN a specimen flowers is a consequence of how much leaf it managed to
    // build, not a number in a table.
    // Florigen is made in the leaves and reaches every growing point, so it is
    // the PLANT that becomes competent to flower, not one shoot. The tip
    // converts, and so does any axillary bud that wakes up afterwards.
    if (sp.florigenRate > 0 && !this.floral) {
      let area = 0;
      for (const org of this.organs) area += (org.dev || 0) * org.len * org.len;
      this.plant.florigen += (area / (sp.organLen * sp.organLen + 1e-6)) * sp.florigenRate * dt;
      if (this.plant.florigen > sp.florigenThresh && this.gen === 0) {
        this.plant.floweredAt = this.plant.vegOrganCount();
        this.goFloral(sp);
      }
    }
    // A determinate shoot: once it has made its complement of organs the apex
    // arrests. The specimen finishes instead of growing off the top of the
    // frame forever — and the meristem stops costing anything.
    const budgetLeft = sp.organBudget - this.plant.vegOrganCount();
    if ((!this.floral && (this.organs.length >= sp.maxOrgans || budgetLeft <= 0
      || this.apexStalled(sp)))) {
      this.alive = false; this.arrested = true;
      this.retireMeristem();  // an arrested shoot has no growing point to pay for
    }

    // --- harvest whatever the meristem decided --------------------------------
    while (m.emitted.length && !this.fruit) {
      const prim = m.emitted.shift();
      if (this.organs.length >= sp.maxOrgans) break;
      // two organs cannot share an internode, however fast the tip patterns.
      // The floral factor was a hardwired 0.10; `floralNode` names it because
      // a COMPRESSED flower (low floralElong/floralStretch) cannot clear even
      // that between foundings and silently discards its primordia — the
      // stalled-shoot trap, measured as a double flower un-doubling to 9
      // petals. Floral organs sharing a node is what a whorl IS.
      const fn = sp.floralNode === undefined ? 0.10 : sp.floralNode;
      const mi = this.floral ? sp.minInternode * fn : sp.minInternode;
      if (this.length - this.lastOrganLen < mi) continue;
      this.lastOrganLen = this.length;
      this.addOrgan(prim);
    }

    // A determinate apex ends one of two ways: it hits the species' ceiling, or
    // it runs out of itself. `floralOrgans` used to be the only trigger, which
    // is why an apex that spent itself early never set fruit and elongated as a
    // bare whip for the rest of the run (ROADMAP 4b). It is now a ceiling on top
    // of a physical condition, so how many organs a flower makes is something
    // the apex decides rather than something the preset states.
    if (this.floral && !this.fruit &&
      (this.floralCount >= sp.floralOrgans || this.apexSpent(sp))) {
      this.setFruit(sp);
    }

    // --- organs mature --------------------------------------------------------
    for (const org of this.organs) {
      org.age += dt;
      const f = smoothstep(0, sp.organGrow, org.age);
      org.dev = f;
      org.len = org.maxLen * (0.04 + 0.96 * f);
      updateBend(org);
      if (!org.leaf) { org.leaf = org.petal ? this.plant.leaves.requestPetal(org.seed) : this.plant.leaves.request(org.seed); if (org.leaf) org.leafAt = org.age; }
    }

    // --- branching: an axillary bud escapes once the apex is far enough away ---
    if (sp.branching > 0 && this.plant.axes.length < sp.maxAxes && this.gen < sp.maxGen) {
      for (const org of this.organs) {
        if (org.branched || org.age < sp.budRelease) continue;
        // the apex suppresses buds below it; that suppression falls off with
        // distance, which is what apical dominance actually looks like
        const d = v3len(v3sub(v3(), this.tipPos(), org.frame.o));
        const suppressed = Math.exp(-d / sp.dominance);
        if (suppressed > sp.branching) continue;
        // NOT EVERY BUD THAT ESCAPES SUPPRESSION BUILDS A SHOOT. Most axillary
        // meristems abort or stay dormant for the life of the plant even with
        // no apex above them, so a bud that clears `dominance` still only takes
        // with probability `budTake`, and a bud that does not take is retired.
        //
        // This was a hardcoded 0.35 with no comment and no way to reach it,
        // which is the same species of constant as the `0.72` and the `0.45`
        // that ROADMAP 13 deleted: an unnamed number doing a job a species
        // parameter should do. It is the single strongest lever on how many
        // branches a crown has — a conifer at 0.35 discards two buds in three
        // and reads as a bare pole with tufts on it. Default is 0.35, so the
        // eight herbs are unchanged bud for bud.
        if (this.rnd() > sp.budTake) { org.branched = true; continue; }
        org.branched = true;
        // A SHOOT LAUNCHES ALONG THE LEAF IT AROSE BEHIND, and that is all.
        // This line used to be `v3lerp(dir, org.frame.x, v3(0,1,0), 0.45)` — 45%
        // of the way to vertical, hardcoded, undocumented and shared by every
        // species. `test/conifer.mjs` showed it was not even a branch angle:
        // tropism forgets an initial direction in about fifty steps and a branch
        // then grows for thousands, so it was an initial condition wearing an
        // angle's clothes. The angle a branch holds is `gsa`, and `org.frame.x`
        // is already emergent — where the axil is, is where the shoot points.
        const dir = v3();
        v3copy(dir, org.frame.x);
        v3norm(dir, dir);
        // competent plant → this bud makes a flower rather than a branch
        const flowering = this.plant.florigen > sp.florigenThresh;
        if (flowering && this.plant.flowerCount() >= sp.maxFlowers) break;
        const ax = this.plant.addAxis(org.frame.o, dir, this.gen + 1, org.vStem, this);
        // the axil it came out of, kept live rather than copied: `org.birthLen`
        // is advected by `elongate` every step, so a stored number would drift
        // off the fork it names and the partition would divide at the wrong place
        ax.attachOrgan = org;
        if (flowering) ax.goFloral(sp, true);
        break;
      }
    }
    this.updateRadii(sp);
  }

  // The floral meristem is a smaller, faster version of the same tissue. Organs
  // crowd together instead of spiralling apart, which is what a flower is.
  goFloral(sp, immediate) {
    this.floral = true;
    this.pedicel = !!immediate;   // a bud that became a flower sits on a stalk
    const m = this.meristem.o;
    // Conversion is a loss of stem-cell renewal, not a loss of size: the central
    // zone stops being maintained, so most of the dome becomes competent at once
    // and organs crowd in instead of spiralling apart. The dome itself keeps the
    // radius it had — it has to, because everything the flower is going to make
    // has to fit in it, and from here nothing replaces what gets used.
    m.rCZ *= sp.floralCZ; m.G *= 2.3;
    // The scale the apex had at the moment it converted. Organ identity is read
    // against this fixed reference and not against the apex's current size — a
    // meristem that contracts self-similarly reports the same q forever if you
    // measure it against itself, which is why q used to be stuck at zero.
    this.floralR0 = m.rPZ;
    this.lastFloralAt = this.age;
    this.meristem.candidates = [];
    this.meristem.emitted.length = 0;
  }

  // A determinate apex has no renewing stem-cell pool. Every organ it founds
  // recruits a patch of tissue that is never replaced, so the competent flank
  // contracts by the area it just lost, and the next organ has nowhere to be
  // founded but further in. That contraction is the whole of floral organ
  // identity here — nothing anywhere names a whorl or counts one.
  consumeApex() {
    const m = this.meristem.o;
    const comp = Math.PI * (m.rPZ * m.rPZ - m.rCZ * m.rCZ);
    const lost = Math.PI * m.organR * m.organR;
    let k = Math.sqrt(clamp(1 - lost / Math.max(1e-3, comp), 0.35, 1));
    // C-class determinacy. AGAMOUS terminates the real floral meristem by
    // shutting off WUS stem-cell renewal (Lohmann 2001, Lenhard 2001), and a
    // double flower is that shutoff failing: the pool replaces part of what
    // each organ recruits, the flank contracts more slowly, and identity —
    // which IS the contraction here — climbs so slowly the carpel band may
    // never be reached. Petal after petal after petal, the ag-1 phenotype,
    // with nothing anywhere counting petals. `apexRenew` is the fraction
    // replaced; at the default 0 this line is exactly the old one and every
    // shipped species is untouched.
    const rn = this.plant.sp.apexRenew || 0;
    if (rn > 0) k = lerp(k, 1, rn);
    m.R *= k; m.rPZ *= k; m.rCZ *= k;
  }

  // `organR` is a patch of tissue a fixed few cells across, so as the apex
  // contracts each organ costs a larger share of what is left. Two ways that
  // ends, and it needs both — measured, because the geometric one alone misses
  // half of them: an apex can stall with 40–70 cells still in the dome, having
  // simply lost the room to sharpen another maximum.
  // The vegetative twin of `apexSpent`, and it exists for the same reason: a
  // shoot arrests on `maxOrgans` or the plant's organ budget, and **a count can
  // only terminate a process that reliably reaches the count.** A lateral that
  // elongates too slowly to clear `minInternode` throws away every primordium
  // its meristem emits, so it sits on one or two organs, never reaches either
  // ceiling, and never converts — only `gen === 0` answers florigen. Measured on
  // Hoarfrost Thicket: one shoot of nine stuck at a single organ, still holding a
  // meristem after 30000 steps.
  //
  // Harmless until senescence, which is why it survived this long — it read as a
  // slightly odd twig. But `Plant.spent()` is an AND over every growing point, so
  // one stalled shoot froze the entire organism's life cycle and the specimen
  // could never finish. A whole-plant condition turns any per-axis leak fatal.
  //
  // Same shape of rule as `floralGrace` and the meristem's `spotGrace`: how you
  // notice something has stopped, not a statement about what it should be.
  apexStalled(sp) {
    return this.age - this.lastOrganAt > sp.vegGrace;
  }

  apexSpent(sp) {
    const m = this.meristem;
    if (!m) return true;
    // no room left: the competent flank is narrower than one founder patch
    if (m.o.rPZ - m.o.rCZ < m.o.organR) return true;
    // stopped: room but no organ in far longer than the last one took. Same kind
    // of rule as the meristem's own `spotGrace` — how you notice something has
    // stopped, not a statement about what the flower should be.
    return this.age - this.lastFloralAt > sp.floralGrace;
  }

  // A growing point is about to be discarded. It is the only thing that ever
  // measured the divergence angle, so hand that reading to the organism before
  // dropping it — keeping the fullest one, not the last to retire. Until apices
  // actually retired this never mattered: something was always still patterning.
  retireMeristem() {
    const m = this.meristem;
    if (m) {
      const st = m.divergenceStats(24);
      const prev = this.plant._lastDiv;
      if (st && (!prev || st.n >= prev.n)) this.plant._lastDiv = st;
      this.plant._lastCells = m.F.n;
      this.plant._lastPl = m.plastochron;
    }
    this.meristem = null;
    // the agent lived in that cell field; it goes with it
    this.infection = null;
  }

  // The apex has spent itself. What is left becomes an ovary.
  setFruit(sp) {
    const seed = (this.seed * 2654435761 + 7919) >>> 0;
    this.fruit = new Fruit(this.plant.prm, this.plant.sp.fruitOpts || {}, seed);
    this.alive = false;
    this.arrested = true;
    this.retireMeristem();     // the apex is spent; stop paying for it
  }

  addOrgan(prim) {
    const sp = this.plant.sp;
    const seed = (this.seed * 7919 + this.organs.length * 104729) >>> 0;
    const leaf = this.plant.leaves.request(seed);
    const org = new Organ(this.pts.length - 1, prim.ang, leaf, seed);
    org.seed = seed;
    org.maxLen = sp.organLen * (0.75 + 0.5 * org.rnd()) * (this.gen === 0 ? 1 : 0.7);
    org.tilt = sp.organTilt * (0.8 + 0.4 * org.rnd());
    // a little roll and pitch scatter so neighbouring blades do not lie in the
    // same plane and saw through each other. `lift` is now in RADIANS about the
    // hang the force balance works out (ROADMAP 7b) rather than a nudge to the
    // vertical component of a direction, which is what it used to be — same
    // magnitude, and it stays because real leaves on one stem do not hang alike for
    // reasons beyond how heavy they are. It is scatter, in the same category as
    // `roll`, not a shape.
    org.roll = (org.rnd() - 0.5) * sp.organRoll;
    org.lift = (org.rnd() - 0.5) * 0.22;
    org.leafAt = 0;
    org.birthLen = this.length;
    this.lastOrganAt = this.age;
    if (this.floral) {
      this.floralCount++;
      // identity read off the radius the organ was founded at: the floral
      // meristem shrinks as it consumes itself, so later organs start further
      // in, and that gradient is the only thing distinguishing them
      org.q = clamp(1 - (prim.r / Math.max(1e-3, this.floralR0 || this.meristem.o.rPZ)), 0, 1);
      org.floral = true;
      // the outer ones are petals — leaves whose margin was told to grow broad
      // and smooth instead of long and toothed
      org.petal = org.q < sp.petalQ;
      org.leaf = null;
      org.maxLen = sp.organLen * (org.petal ? 0.30 : 0.13) * (0.82 + 0.36 * org.rnd());
      org.tilt = org.petal ? sp.petalTilt * (0.9 + 0.2 * org.rnd())
        : sp.organTilt * 0.30;
      org.roll *= 0.25;
      // `droopScale` was here — 0.12 for a petal and 0.05 for anything inside it,
      // holding floral organs up because the leaf's droop was far too much for them.
      // It is gone: a petal is a short stalk carrying a small light blade, so the
      // balance in `bendOf` already gives it almost nothing to hang by. That is the
      // check ROADMAP 5 wanted from the flower close-up, arriving for free.
      this.lastFloralAt = this.age;
      this.consumeApex();
    }
    this.organs.push(org);
    // give it a place in the transport stream; from here it has to hold it
    this.plant.vasc.addOrgan(this, org);
  }

  // A shoot does not only grow at its tip. The tissue just below the apex goes
  // on stretching for a while after it is laid down, which is what pushes
  // leaves apart as the plant develops. Segments are lengthened in place and
  // every organ is carried along by the tissue it was born in.
  elongate(dt, sp) {
    const n = this.pts.length;
    if (n < 3 || sp.internode <= 0) return;
    const oldArc = this._oa || (this._oa = []);
    const newArc = this._na || (this._na = []);
    const dirs = this._dirs || (this._dirs = []);
    const segL = this._sl || (this._sl = []);
    oldArc.length = n; newArc.length = n; segL.length = n - 1;
    while (dirs.length < n) dirs.push(v3());

    oldArc[0] = 0;
    for (let i = 0; i < n - 1; i++) {
      v3sub(_zs0, this.pts[i + 1], this.pts[i]);
      const L = v3len(_zs0) || 1e-6;
      segL[i] = L;
      v3scale(dirs[i], _zs0, 1 / L);
      oldArc[i + 1] = oldArc[i] + L;
    }
    const total = oldArc[n - 1];

    newArc[0] = 0;
    // THE SUBAPICAL STRETCH IS TAXED BY VIGOUR TOO, and it did not used to be.
    // That omission is what floored the taper: `elongate` overwrites
    // `this.length`, so on shipped defaults it contributed 3.6x the tip's own
    // extension with no generation penalty anywhere in it, and the measured
    // taper slope came out 0.94 where the 0.72 above was supposed to put it.
    // A suppressed shoot has short internodes as well as a slow tip; both are
    // the same shoot growing less.
    // A floral axis's stretch has its own factor: the tip's extension was
    // always taxed 0.22 on conversion while this line ran untaxed — that
    // asymmetry is the shipped look (a flower riding a curling apex) and
    // `floralStretch: 1` keeps it exactly. A doubled flower founds organs
    // for far longer, so at full stretch its corolla strings out into a
    // raceme — measured: 22 petals spread over 8.6 units of axis. Packing
    // it is the "a bud is a compressed shoot" fact applied to a flower.
    const fst = sp.floralStretch === undefined ? 1 : sp.floralStretch;
    const stretch = sp.internode * this.vigour * (this.floral ? fst : 1);
    for (let i = 0; i < n - 1; i++) {
      const belowTip = total - oldArc[i];
      const e = stretch * Math.exp(-belowTip / sp.internodeSpan);
      const L = segL[i] * (1 + e * dt);
      newArc[i + 1] = newArc[i] + L;
      v3addScaled(this.pts[i + 1], this.pts[i], dirs[i], L);
    }
    this.length = newArc[n - 1];

    for (const org of this.organs) {
      const L = org.birthLen;
      if (L >= total) { org.birthLen = this.length; continue; }
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (oldArc[m] <= L) lo = m; else hi = m; }
      const t = (L - oldArc[lo]) / Math.max(1e-6, oldArc[hi] - oldArc[lo]);
      org.birthLen = newArc[lo] + t * (newArc[hi] - newArc[lo]);
    }
  }

  // Put the axis back in the shape growth left it in, undoing last step's deflection.
  // Two array copies per axis per step, and it is what keeps the wind from compounding
  // into the grown form.
  restorePose() {
    const r = this.rest;
    if (!r) return;
    const n = Math.min(r.length, this.pts.length);
    for (let i = 0; i < n; i++) v3copy(this.pts[i], r[i]);
  }

  // The point arrays of every axis below this one, so a bend can carry them.
  subtreePoints(out) {
    const acc = out || [];
    for (const k of this.kids) { acc.push(k.pts); k.subtreePoints(acc); }
    return acc;
  }

  savePose() {
    const r = this.rest || (this.rest = []);
    while (r.length < this.pts.length) r.push(v3());
    r.length = this.pts.length;
    for (let i = 0; i < this.pts.length; i++) v3copy(r[i], this.pts[i]);
  }

  // Everything the bend solver needs to know about an organ: where it sits along the
  // axis, how much it weighs, and how much of it the wind can push on. Recorded here
  // because this is where the arc positions are already known.
  tagOrgansForBend(S) {
    for (const org of this.organs) this._tagOrgan(org, S);
  }

  _tagOrgan(org, S) {
    if (org.shed) { org.bendArea = 0; org.bendMass = 0; return; }
    // The blade the renderer draws, at 0.80 of the organ, and its area from the
    // silhouette the margin grew rather than from a rectangle. `bladeAreaOf` is that
    // definition and it lives in `39_fall.js` because three things read it now: the
    // stem's load, the stem's mass, and — since ROADMAP 5 — the thickness of the
    // organ's own stalk.
    const area = bladeAreaOf(org);
    org.bendArea = area;
    // lamina mass plus the petiole's, which is small but is the only mass a bare
    // stalk has once its blade has gone
    const pet = petioleOf(org);
    org.bendMass = S.sigma * area
      + S.rho * Math.PI * pet.r0 * pet.r0 * pet.len * 0.6;
    org.bendS = clamp(org.birthLen, 0, this.length);
  }

  // Where along the parent this shoot forks off, in the parent's own material
  // coordinate. Read live off the axil organ, because that odometer is advected
  // by `elongate` and a copied number would drift off the fork it names.
  attachLen() { return this.attachOrgan ? this.attachOrgan.birthLen : 0; }

  // THE AUXIN TRAFFIC A SUBTREE DELIVERS TO ITS OWN BASE, in the r^3 units
  // `updateRadii` already works in. Every organ is a source, every apex is a
  // source, and every branch hands its whole total to the axis it grew from —
  // which is conservation at a fork, and is what both Murray's law and the pipe
  // model assume of one. Cached per step: `Plant.step` stamps `_flowAt`.
  subtreeFlow(sp) { return this.flowAbove(-1, sp); }

  // The same total, counting only what enters above arc position `s`. This is
  // Q_m at a fork: the parent's own continuation, everything it carries above
  // the branch point, and nothing below.
  flowAbove(s, sp) {
    let f = (this.alive && this.meristem) ? sp.apexFlow : 0;
    if (this.fruit) f += sp.fruitFlow;
    for (const org of this.organs) if (org.birthLen > s) f += sp.organFlow;
    for (const k of this.kids) if (k.attachLen() > s) f += k.subtreeFlow(sp);
    return f;
  }

  // THE AUXIN THIS AXIS'S OWN BENDING ZONE SITS IN, which is what sets the size
  // of its antigravitropic offset and therefore the angle it holds.
  //
  // Every living apex is an auxin source and the stream drains rootward through
  // the statocytes below it, so a shoot sees its own apex at no distance at all
  // plus every apex above it on the path to the root, each attenuated over
  // `dominance`. That is the SAME field, with the same decay length, that
  // already decides whether a bud escapes — one field, two readouts, and the
  // second one costs no new constant.
  //
  // An apex's strength is its vigour, because a suppressed growing point is a
  // smaller auxin source; that is the coupling that makes vigour and angle one
  // story rather than two. What it predicts, and it is worth stating because it
  // is checkable: a branch high in the crown is bathed in the leader's stream
  // and stands up; one far below it is not and lies out flat. And decapitation
  // — less auxin — drives branches MORE horizontal, which is the documented
  // sign and the one naive coupling gets backwards.
  statocyteIAA(sp) {
    let a = (this.alive && this.meristem) ? this.vigour : 0;
    const base = this.pts[0];
    for (let ax = this.parent; ax; ax = ax.parent) {
      if (!ax.alive || !ax.meristem) continue;
      const d = v3len(v3sub(_zs0, ax.tipPos(), base));
      a += ax.vigour * Math.exp(-d / sp.dominance);
    }
    return a;
  }

  // Murray's law: a stem is exactly as thick as the traffic it carries.
  // Organs are then placed by ARC LENGTH along the axis, interpolated between
  // stem points, using a frame that is parallel-transported up the shoot. The
  // old code indexed the nearest vertex, so every organ hopped sideways each
  // time the stem gained a point — that was most of the jitter.
  updateRadii(sp) {
    const n = this.pts.length;
    if (n < 2) { this.radii[0] = sp.tipRadius; return; }

    const arc = this._arc || (this._arc = []);
    const tan = this._tan || (this._tan = []);
    const fu = this._fu || (this._fu = []);
    arc.length = n;
    while (tan.length < n) { tan.push(v3()); fu.push(v3()); }

    // ARC IS A MATERIAL COORDINATE AND MUST COME OFF THE GROWN SHAPE, NOT THE
    // POSE. `stepBend` calls this a second time so the frames below ride the
    // bent stem — but `org.birthLen` is an odometer reading on the shape growth
    // produced, so comparing it against a bent arc measures two different
    // rulers. Bending is near-inextensible, so the two agree to about 1.5 ppm;
    // that is still enough to flip an organ from one side of a station to the
    // other and step that station's radius by one organ's worth of flow. It was
    // 1.87% on one station of one species, flickering with the wind. See
    // PITFALLS.md. Frames still come from `pts`, which is the whole point of the
    // second call.
    const mat = (this.rest && this.rest.length === n) ? this.rest : this.pts;
    arc[0] = 0;
    for (let i = 1; i < n; i++) arc[i] = arc[i - 1] + v3len(v3sub(_zs0, mat[i], mat[i - 1]));
    for (let i = 0; i < n; i++) {
      v3sub(_zs0, this.pts[Math.min(n - 1, i + 1)], this.pts[Math.max(0, i - 1)]);
      if (v3len(_zs0) < 1e-7) v3set(_zs0, 0, 1, 0);
      v3norm(tan[i], _zs0);
    }
    // transport one perpendicular up the axis so organ angles stay put
    let ref = Math.abs(tan[0][1]) > 0.9 ? _zsx : _zsy;
    v3norm(fu[0], v3cross(fu[0], ref, tan[0]));
    for (let i = 1; i < n; i++) {
      const d = v3dot(fu[i - 1], tan[i]);
      v3addScaled(_zs1, fu[i - 1], tan[i], -d);
      if (v3len(_zs1) < 1e-5) { v3norm(fu[i], v3cross(fu[i], Math.abs(tan[i][1]) > 0.9 ? _zsx : _zsy, tan[i])); }
      else v3norm(fu[i], _zs1);
    }

    const total = arc[n - 1];

    // Thickness as a smooth function of arc length: the traffic from organs
    // above, plus steady secondary thickening with distance below the tip.
    // The old version counted polyline vertices, so the whole stem stepped
    // thicker every time the shoot gained a point.
    // Traffic entering above each station, as (arc, flow) pairs. A BRANCH IS
    // TRAFFIC TOO, and it did not used to be: `bl` held only this axis's own
    // organs, so a branch's whole subtree vanished at the fork and the stem
    // below it was sized as if the branch were not there. With three or four
    // laterals that is a small error; with a crown of two dozen it is the
    // difference between a trunk and a twig, and it is a violation of the one
    // thing Murray's law and the pipe model agree on — flow is conserved at a
    // junction. `sp.apexFlow` is here for the same reason: a growing point is
    // the plant's largest single auxin source, which is the whole basis of
    // apical dominance, and it was the one source not being counted.
    const bl = this._bl || (this._bl = []);
    bl.length = 0;
    for (const org of this.organs) bl.push([org.birthLen, sp.organFlow]);
    for (const k of this.kids) bl.push([k.attachLen(), k.subtreeFlow(sp)]);
    bl.sort((a, b) => a[0] - b[0]);
    // The exponent is Murray's law's, and Murray's law is measured to hold only
    // "as long as they do not function additionally as supports for the plant
    // body" (McCulloh, Sperry & Adler 2003, Nature 421:939-942). Every axis here
    // does hold the plant up, so `radiusExp` is a knob and not a constant. See
    // ROADMAP 14 and `test/taper.mjs`; `docs/TUNING.md` has the sweep.
    //
    // `conv` re-expresses the flow terms, which are all stated in units of r^3,
    // for whatever exponent is in force. It is exactly 1 at p = 3, so this line
    // reproduces the pre-2026-07-30 bundle radius for radius.
    const p = sp.radiusExp;
    const tp = Math.pow(sp.tipRadius, p);
    const conv = Math.pow(sp.tipRadius, p - 3);
    let above = 0;
    for (const e of bl) above += e[1];
    let k = 0;
    for (let i = 0; i < n; i++) {
      while (k < bl.length && bl[k][0] <= arc[i]) { above -= bl[k][1]; k++; }
      const below = total - arc[i];
      this.radii[i] = Math.pow(
        tp + (above + sp.thicken * below
          + (this.fruit ? sp.fruitFlow : 0)) * conv,
        1 / p) * sp.radiusScale;
    }

    for (const org of this.organs) {
      const L = clamp(org.birthLen, 0, total);
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arc[m] <= L) lo = m; else hi = m; }
      const seg = Math.max(1e-6, arc[hi] - arc[lo]);
      const t = clamp((L - arc[lo]) / seg, 0, 1);
      v3lerp(_zp, this.pts[lo], this.pts[hi], t);
      v3lerp(_zax, tan[lo], tan[hi], t); v3norm(_zax, _zax);
      v3lerp(_zu, fu[lo], fu[hi], t);
      v3addScaled(_zu, _zu, _zax, -v3dot(_zu, _zax)); v3norm(_zu, _zu);

      const dir = v3rotAxis(_zdir, _zu, _zax, org.angle);
      // pitch away from the axis, then let it settle under its own weight
      // young organs are pressed against the axis and swing out as they fill
      const tl = org.tilt * (0.12 + 0.88 * smoothstep(0.04, 0.72, org.dev || 0));
      v3lerp(_zd, _zax, dir, tl);
      v3norm(_zd, _zd);
      // ...and then it hangs. This line used to subtract `sp.droop` from the vertical
      // component and renormalise, which is a rotation wearing a translation's clothes
      // and was eight stated numbers in the species table. It is a force balance now
      // (ROADMAP 7b): the tip slope of the petiole under the weight of the blade it
      // carries, resolved against the elevation the organ grew at, because only the
      // component of weight ACROSS a stalk bends it. Rotating in the vertical plane the
      // organ already points in keeps the direction a unit vector exactly, which the
      // old subtract-and-renormalise did not — it shortened every organ's azimuth
      // slightly, more for the ones that hung furthest.
      const elev = Math.asin(clamp(_zd[1], -1, 1));
      // the balance itself is kept clean of the scatter, because that is the number
      // `test/petiole.mjs` checks against a cantilever worked out on paper
      org.bend = bendAngle(org.bendH || 0, elev);
      const th = org.bend - (org.lift || 0) * (org.dev || 0);
      const hl = Math.hypot(_zd[0], _zd[2]);
      if (Math.abs(th) > 1e-5 && hl > 1e-6) {
        const e2 = elev - th, c = Math.cos(e2) / hl;
        _zd[0] *= c; _zd[2] *= c; _zd[1] = Math.sin(e2);
      }
      v3copy(org.frame.o, _zp);
      v3copy(org.frame.x, _zd);
      v3norm(_zside, v3cross(_zside, _zd, _zax));
      if (v3len(_zside) < 0.1) v3set(_zside, 1, 0, 0);
      v3copy(org.frame.z, _zside);
      v3norm(_znrm, v3cross(_znrm, _zside, _zd));
      // Roll the blade about its own petiole. `roll` is the scatter it grew with;
      // `flap` is how far the wind has twisted it since — one angle, and the same one
      // the fall integrates, which is what makes abscission continuous (39_fall.js).
      const rl = org.roll + (org.flap || 0);
      const cr = Math.cos(rl), sr = Math.sin(rl);
      _zs1[0] = _zside[0] * cr + _znrm[0] * sr;
      _zs1[1] = _zside[1] * cr + _znrm[1] * sr;
      _zs1[2] = _zside[2] * cr + _znrm[2] * sr;
      _znrm[0] = -_zside[0] * sr + _znrm[0] * cr;
      _znrm[1] = -_zside[1] * sr + _znrm[1] * cr;
      _znrm[2] = -_zside[2] * sr + _znrm[2] * cr;
      v3copy(org.frame.z, _zs1);
      v3copy(org.frame.y, _znrm);
      org.radius = this.radii[lo];
    }
  }
}

const _zs0 = v3(), _zs1 = v3(), _zp = v3(), _zax = v3(), _zu = v3(), _zd = v3();
const _zga = v3(), _zgb = v3();
const _wind = v3(), _fpl = v3();
const _zdir = v3(), _zside = v3(), _znrm = v3();
const _zsx = v3(1, 0, 0), _zsy = v3(0, 1, 0);

// Blades are expensive to grow, so a small library of them is canalised one at
// a time in the background and shared out. Growing one per organ would mean
// thirty tissue simulations running at once, which is thirty times too many.
class LeafPool {
  constructor(prm, sp, seed) {
    this.prm = prm; this.sp = sp;
    this.lib = [];
    this.plib = [];
    this.cur = null;
    this.n = 0;
    this.pn = 0;
    this.petalTurn = false;
    this.seed = seed >>> 0;
    this.budget = sp.leafBudget;
    this.target = sp.leafLibrary;
  }
  _make() {
    const seed = (this.seed + this.n * 2654435761) >>> 0;
    this.n++;
    const r = mulberry32(seed);
    const o = { ...this.sp.leafOpts };
    // variety now comes from the margin's chemistry, not from shape numbers:
    // how slender it grows, how hard a convergence point pushes, and how far
    // apart those convergence points sit.
    //
    // A species scales that chemistry rather than replacing it (`marginBias`),
    // so every leaf on one plant still differs from its neighbours while the
    // whole plant differs from another species. The bias is a multiplier on a
    // rate constant, never a width or a tooth count — nothing here knows what
    // the silhouette will be.
    const mb = this.sp.marginBias;
    o.margin = {
      ay: lerp(0.34, 0.86, r()) * (mb.ay ?? 1),
      g1: lerp(0.00070, 0.00170, r()) * (mb.g1 ?? 1),
      gExp: lerp(1.6, 3.0, r()) * (mb.gExp ?? 1),
      D: clamp(lerp(4.5, 11.0, r()) * (mb.D ?? 1), 2.0, 16.0),
      tipBias: clamp(lerp(0.25, 0.85, r()) * (mb.tipBias ?? 1), 0, 1),
      mature: Math.round(lerp(1100, 1700, r())),
    };
    o.maxSources = Math.floor(lerp(30, 64, r()));
    return new Leaf(this.prm, o, seed);
  }
  request(seed) {
    if (!this.lib.length) return null;
    return this.lib[seed % this.lib.length];
  }
  requestPetal(seed) {
    if (!this.plib.length) return null;
    return this.plib[seed % this.plib.length];
  }
  _makePetal() {
    const seed = (this.seed + 977 + this.pn * 2246822519) >>> 0;
    this.pn++;
    const r = mulberry32(seed);
    const o = { ...this.sp.leafOpts };
    // a petal is a leaf whose margin was told to be broad, smooth and short:
    // wide mediolateral growth, almost no answer to convergence points
    o.margin = {
      ay: lerp(0.95, 1.5, r()),
      g1: lerp(0.00010, 0.00030, r()),
      gExp: 1.2,
      D: lerp(9, 16, r()),
      tipBias: lerp(0.05, 0.30, r()),
      mature: Math.round(lerp(700, 1000, r())),
    };
    o.maxSources = 14;
    o.veinMax = 90;
    return new Leaf(this.prm, o, seed);
  }
  step() {
    if (!this.cur) {
      // fill the leaf library first, then keep a few petals ready
      if (this.lib.length < this.target) { this.cur = this._make(); this.petalTurn = false; }
      else if (this.plib.length < 3) { this.cur = this._makePetal(); this.petalTurn = true; }
      else return;
    }
    const L = this.cur;
    for (let k = 0; k < this.budget && !L.mature; k++) L.step(1);
    if (L.mature) {
      // distance-to-vein drives fenestration and the pooling of light around
      // the vasculature; compute it once, here
      L.veinDistanceField(30);
      (this.petalTurn ? this.plib : this.lib).push(L);
      this.cur = null;
    }
  }
  get growingLeaf() { return this.cur; }
}

export const SPECIES_DEFAULTS = {
  elongation: 0.0052,
  segLen: 0.16,
  minInternode: 0.18,
  organRoll: 0.55,   // scatter in blade roll, radians
  internode: 0.0072,  // subapical stretching rate
  internodeSpan: 2.6,// how far below the tip that stretching persists
  thicken: 0.00030,  // secondary thickening per unit of stem below the tip
  nutation: 0.0135,  // circumnutation rate
  nutAmp: 0.16,
  florigenRate: 0.0016, // how fast leaves make the flowering signal
  florigenThresh: 12,    // how much has to reach the tip before it converts
  floralOrgans: 9,      // ceiling on floral organs; the apex usually stops first
  floralGrace: 320,     // idle steps before a floral apex counts as spent
  apexRenew: 0,         // C-class determinacy: fraction of each recruited patch
                        // the stem-cell pool replaces. 0 = AG intact (all
                        // shipped species); toward 1 the floral meristem keeps
                        // renewing and the flower doubles. See consumeApex()
  floralElong: 0.22,    // internode elongation retained after floral
                        // conversion — a flower is a compressed shoot. 0.22
                        // is the number that was hardwired at the elongation
                        // site; lower packs a many-organ flower into a corolla
  floralStretch: 1,     // same factor for the SUBAPICAL stretch, which was
                        // never taxed on floral axes (that asymmetry is the
                        // shipped look; 1 preserves it exactly). A doubled
                        // flower needs both low or it grows as a raceme
  floralNode: 0.10,     // the floral minInternode factor (was hardwired).
                        // A compressed flower needs it near zero or the
                        // founding gate discards its primordia
  // Idle steps before a VEGETATIVE apex counts as stalled. Chosen from measured
  // gaps, not guessed: across all eight species the longest a healthy shoot ever
  // went between founding organs is 500 steps, and the longest any new lateral
  // took to found its first is 320. 1600 is 3.2x the worst real gap.
  vegGrace: 1600,
  floralCZ: 0.42,       // how much of the central zone survives conversion
  fruitFlow: 0.0060,     // a swelling fruit is a huge sink; the stem answers
  fruitScale: 0.55,
  fruitOpts: {},
  maxFlowers: 6,
  // Where the identity boundary sits on `q`, and so the petal:stamen ratio. This
  // number is chosen, not derived — it is the imposition SCIENCE.md lists. It sat
  // at 0.62 for as long as q was stuck at zero, where it could never fire; the
  // measured q distribution is skewed (p50 0.06, p90 0.53), so 0.62 left 24 of 42
  // flowers with no inner organs at all. See TUNING.md for the threshold sweep.
  petalQ: 0.28,      // organs founded outside this are petals
  petalTilt: 1.45,   // petals reflex past perpendicular as they open
  tropism: 0.02,
  wander: 0.35,
  organLen: 1.35,
  organTilt: 0.85,
  organGrow: 190,
  maxOrgans: 60,
  organBudget: 96,   // across the whole specimen, not per shoot
  tipRadius: 0.05,
  organFlow: 0.00035,
  // What a growing point is worth as an auxin source, in the same r^3 flow units
  // as `organFlow`. It is the traffic `tipRadius` already expresses as a radius —
  // 0.05^3 — kept separately because the partition needs it as a flow, and
  // because a species may make its apex a larger source than its stem tip is
  // wide. It is deliberately NOT added to `updateRadii`'s own stations: `tp`
  // there is this same quantity and adding both would count the apex twice.
  apexFlow: 0.000125,
  // Borchert–Honda's apical control, and the one stated number in the partition
  // that replaced the hardcoded 0.72. 0.5 is unbiased — each subtree takes its
  // proportional share and no fork favours the leader. Above 0.5 the leader is
  // favoured at every fork it passes and the crown becomes excurrent; conifers
  // want it high, oaks near the middle. See the note above `class Axis`.
  apicalControl: 0.5,
  // Switches on the FULL flux partition instead of its first-order term.
  // Falsified and kept runnable — see `Plant._partition` and `test/tree.mjs`
  // section 3. Nothing in the running piece reads it.
  fluxPartition: false,
  // THE ANTIGRAVITROPIC OFFSET, and it ships OFF. Zero recovers the orthotropic
  // axis this engine had until now — every shipped species is a herb whose
  // laterals do stand up — so a species that wants plagiotropic branches turns
  // it on, in the same way `fenestrate` turns on programmed cell death. It is
  // one gain, not an angle: the angles across a crown come from auxin.
  agoGain: 0,
  // The statocyte's half-saturation: the auxin level at which the offset is half
  // its maximum. The analogue of `kP` in `10_auxin.js`, and read on the same
  // Hill exponent `nP`.
  agoK: 0.45,
  radiusScale: 1.0,
  // How radius answers traffic. 3 is Murray's law and is measured only in
  // conduits that do NOT also support the plant; a self-supporting axis reverts
  // toward the pipe model. ROADMAP 14, and the sweep in `test/taper.mjs`.
  radiusExp: 3.0,
  branching: 0.55,
  budRelease: 300,
  dominance: 6.0,
  // What fraction of the buds that escape suppression actually build a shoot.
  // 0.35 is the value this was hardcoded at, so nothing that shipped moves.
  budTake: 0.35,
  maxAxes: 5,
  maxGen: 2,
  leafBudget: 60,
  leafLibrary: 5,
  leafOpts: {},
  // How long the slowest blade on a finished specimen takes to let go. Only the
  // rate is set here — whether it happens at all is `Plant.spent()`.
  senesceFor: 2200,
  senesceHold: 0,  // viewer control: pause the last act. See `senesceStep`
  shootOpts: {},     // per-species overrides on the transport stream (38_shoot)
  // per-species multipliers on the leaf margin's own chemistry (see LeafPool).
  // ay slenderness, g1/gExp how hard a convergence point pushes, D how far
  // apart those points can sit. Empty means "the generic leaf".
  marginBias: {},
};

export class Plant {
  constructor(prm, mo, sp, seed = 1) {
    this.prm = prm; this.mo = mo;
    this.sp = { ...SPECIES_DEFAULTS, ...sp };
    this.seed = seed;
    this.leaves = new LeafPool(prm, this.sp, seed);
    this.axes = [];
    this.time = 0;
    this.florigen = 0;
    // one transport stream for the whole organism, built before the first shoot
    // taps into it
    this.vasc = new Vasculature(prm, this.sp.shootOpts || {});
    // THE AIR THE ORGANISM IS STANDING IN. Taken from the caller if it was given
    // one, because the whole point of `37_wind.js` is that there is one field and
    // everything reads it — when the shader stops making its own weather (ROADMAP 7
    // step 5) it will be handed this object, and when a second specimen germinates
    // (ROADMAP 6) it has to be standing in the same weather as the first.
    this.wind = (sp && sp.wind) || windField(this.sp.windOpts);
    // WHERE IN THE CLEARING THIS ONE CAME UP. Until there was a garden every
    // specimen germinated at the origin and nothing had to say so. A position is
    // not a shape — it says nothing about what the plant becomes — but it has to
    // be real rather than applied at draw time, because the axes are solved as
    // cantilevers in a wind field that varies across the ground: two plants three
    // metres apart are genuinely in different air, and Taylor advection means a
    // gust crosses the stand rather than arriving everywhere at once.
    this.origin = (this.sp.origin || [0, 0, 0]).slice();
    this.agent = null;   // set by inoculate(); see 15_pathogen.js
    this.addAxis(v3(this.origin[0], this.origin[1], this.origin[2]), v3(0, 1, 0), 0);
  }
  // `parentNode` is the stem node of the organ this shoot came out of, so a
  // branch joins the transport stream where it physically joins the plant.
  // Undefined means the leader, which taps the root directly.
  addAxis(base, dir, gen, parentNode, parentAxis) {
    const a = new Axis(this, base, dir, gen, (this.seed * 31 + this.axes.length * 6151) >>> 0);
    a.vApex = this.vasc.startAxis(parentNode);
    // A branch has to ride the axis it came off when that axis bends, or it swings
    // free of the stem it is attached to — which at ten degrees of sway is very
    // visible indeed.
    if (parentAxis) { a.parent = parentAxis; parentAxis.kids.push(a); }
    // A BUD IS MADE OF ITS PARENT'S TISSUE, so it carries whatever that tissue
    // was carrying. This is the only route an agent has between axes, and it is
    // deliberately NOT transport: there is no whole-plant auxin stream in the
    // running piece (`38_shoot.js` ships disabled), so nothing here claims an
    // agent travels up a stem. What it claims is that a shoot founded out of
    // infected tissue starts infected, which is both true and free.
    //
    // The consequence is a severity gradient down the specimen that nobody
    // wrote: axes founded early from a lightly infected apex start light, and
    // ones founded later start heavy, because the parent's titre has risen in
    // between.
    if (this.agent && parentAxis && parentAxis.infection && a.meristem) {
      const src = parentAxis.infection.burden(0).total / Math.max(1, parentAxis.meristem.F.n);
      if (src > 1e-4) {
        a.infection = new Infection(a.meristem.F, this.agent.o);
        for (let i = 0; i < a.meristem.F.n; i++) a.meristem.F.vir[i] = src * this.agent.transmit;
      }
    }
    this.axes.push(a);
    return a;
  }

  // ---------------------------------------------------------------------------
  // INOCULATE THIS SPECIMEN.
  //
  //   plant.inoculate('lesion')          the leader's growing point
  //   plant.inoculate('invert', {axis: 3})
  //
  // Where the agent arrives is a STATED position and time — an event in the
  // environment rather than a property of the plant, the same category as the
  // wind, and SCIENCE.md books it as such. Everything after it is emergent.
  // ---------------------------------------------------------------------------
  inoculate(name, opts = {}) {
    const spec = (typeof name === 'string') ? AGENTS[name] : name;
    if (!spec) return null;
    const o = { ...PATHOGEN_DEFAULTS, ...spec, ...opts };
    this.agent = { name: (typeof name === 'string') ? name : 'custom', o, transmit: opts.transmit ?? 0.8 };
    // An agent needs living tissue to arrive in. Axis 0 is the obvious target
    // and is usually right, but on a herb the leader converts to a flower early
    // and its growing point is GONE — `setFruit` nulls the meristem — so asking
    // for axis 0 late in the life cycle silently infects nothing. Fall back to
    // any axis that still has a growing point.
    //
    // This is not the agent being clever about where to go; it is the fact that
    // there is nothing to infect in dead tissue. `inoculate` returns null when
    // the whole specimen has arrested, and callers should check it — the first
    // browser capture written against this API infected nothing four times and
    // reported four identical plants.
    let a = this.axes[opts.axis || 0];
    if (!a || !a.meristem) a = this.axes.find(x => x.meristem && x.alive) || null;
    if (!a || !a.meristem) return null;
    a.infection = new Infection(a.meristem.F, o);
    // Default: let the agent pick provascular, still-competent tissue rather
    // than a coordinate, which is what every system in the literature actually
    // does — see Infection.inoculateByState. Pass {x, y} to place it by hand.
    if (opts.x !== undefined || opts.y !== undefined) {
      a.infection.inoculate(opts.x || 0, opts.y || 0);
    } else {
      a.infection.inoculateByState(a.rnd || this.rnd);
    }
    return a.infection;
  }

  // total agent burden across every growing point that has one
  agentBurden() {
    if (!this.agent) return null;
    let total = 0, axes = 0, peak = 0;
    for (const a of this.axes) {
      if (!a.infection || !a.meristem) continue;
      const b = a.infection.burden(0.35);
      total += b.total; axes++;
      if (b.peak > peak) peak = b.peak;
    }
    return { agent: this.agent.name, total, axes, peak };
  }
  get main() { return this.axes[0]; }
  organCount() { let n = 0; for (const a of this.axes) n += a.organs.length; return n; }
  // flowers are not leaves and should not be charged against the leaf budget
  vegOrganCount() {
    let n = 0;
    for (const a of this.axes) for (const o of a.organs) if (!o.floral) n++;
    return n;
  }
  flowerCount() { let n = 0; for (const a of this.axes) if (a.floral) n++; return n; }

  // The organism has nothing left to build: every growing point has either
  // arrested on its budget or spent itself into a flower, so there is no tissue
  // anywhere still patterning. This is the same kind of statement as
  // `apexSpent` — a physical condition, read off the plant, not a time. It is
  // what senescence waits for, because a plant with a meristem left is still
  // investing in itself and does not dismantle its leaves.
  spent() {
    for (const a of this.axes) if (a.meristem) return false;
    return this.axes.length > 0;
  }

  // ...and nothing left to ripen or hold up. The end of one specimen.
  dead() {
    if (!this.spent()) return false;
    for (const a of this.axes) {
      if (a.fruit && !a.fruit.barren && !a.fruit.mature) return false;
      for (const o of a.organs) if (!o.floral && !o.shed) return false;
    }
    return true;
  }

  // how far through dismantling itself the specimen is, for the display and for
  // whatever decides to start the next one
  senescence() {
    let n = 0, s = 0;
    for (const a of this.axes) for (const o of a.organs) {
      if (o.floral) continue;
      n++; s += o.shed ? 1 : (o.sen || 0);
    }
    return n ? s / n : 0;
  }

  // cut the apex off and watch dominance lift
  prune() {
    const live = this.axes.filter(a => a.alive);
    if (!live.length) return false;
    let best = live[0];
    for (const a of live) if (a.tipPos()[1] > best.tipPos()[1]) best = a;
    best.alive = false;
    return true;
  }

  // ONE PASS THAT DECIDES HOW FAST EVERY APEX GROWS AND WHICH WAY IT POINTS.
  //
  // Both come off the same partition and are run together for that reason: a
  // shoot's share of the flux is also what makes its apex an auxin source, and
  // the auxin at a shoot's own statocytes is what sizes its offset. Vigour and
  // angle are one story, not two, and running them apart would let them
  // disagree by a step.
  //
  // Cheap enough to run every step — the recursion is over axes, of which a
  // specimen has at most a few dozen, and the flow sums are cached for the
  // duration of the pass.
  updateVigour(sp) {
    const L = clamp(sp.apicalControl, 0.001, 0.999);
    if (sp.fluxPartition) this._partition(sp, L);
    else {
      // WHAT SHIPS: the partition's own first-order answer, which is one line.
      // At a single fork the density ratio is exactly (1-L)/L whatever the two
      // capacities are — the flux terms cancel — so a branch apex extends at
      // that fraction of the apex dominating it, and a second-generation branch
      // at the square of it. L = 0.5 is unbiased and gives every apex the
      // leader's rate, which is why the eight shipped species did not move when
      // this replaced the hardcoded 0.72.
      //
      // Expressed as a share OF THE LEADER'S, not as an absolute. There is no
      // carbon in this model and no total resource to divide, so only the ratio
      // is a quantity the engine can honestly claim — and the ratio is what
      // apical control means. The cost is real and worth writing down: a crown
      // filling in does not slow its own leader here, so the age-dependent
      // drift from excurrent to decurrent form does not fall out.
      const walk = (ax, d) => { ax.vigour = d; for (const k of ax.kids) walk(k, d * (1 - L) / L); };
      walk(this.main, 1);
    }
    // …and now the angle, which reads the vigours just set.
    for (const a of this.axes) {
      a.iaa = a.statocyteIAA(sp);
      a.gsa = gsaOf(agoOf(a.iaa, sp, this.prm));
    }
  }

  // THE FULL FLUX PARTITION, AND IT SHIPS OFF — a falsified mechanism kept
  // runnable, in the same category as the second inhibitor at `rhoI: 0` and the
  // whole-plant stream in `38_shoot.js`. A negative result you cannot
  // re-measure is just a story. `test/tree.mjs` section 3 turns it on.
  //
  // What is carried down the tree is a DENSITY rather than an amount, and that
  // is the whole of why it is fifteen lines. Between forks the stream passes
  // organs, and an organ takes its proportional share of what goes by, so the
  // share PER UNIT of capacity is unchanged by everything except a fork. Every
  // apex has the same capacity `apexFlow`, so the ratio of two apices' shares
  // is the ratio of the densities reaching them and `apexFlow` cancels out of
  // the answer entirely. (Carrying the amount instead was the first version and
  // it compared a lateral's WHOLE SUBTREE share against the leader's top-segment
  // share — not like for like. It crushed the catalogue: Hoarfrost Thicket lost
  // two thirds of its organs.)
  //
  // ⚠ WHY IT IS OFF. The leader takes more than its proportional share at each
  // fork, so the density in the leader RISES as it climbs, and a branch attached
  // higher taps a richer stream. Measured on a 25-lateral crown at L = 0.826:
  // vigour runs 0.056 at the bottom to 0.211 at the top — a 3.8x taper of RATE
  // pointing the wrong way, against the closed form's flat 0.211. It is enough
  // to cancel the taper of TIME that made the pre-flight's R2 = 0.9988, and the
  // crown comes out a bottlebrush (R2 0.036, lengths 2.3-4.4 on a leader of 86).
  //
  // The criticism is precise rather than a shrug: Borchert–Honda is stated for a
  // BINARY tree where an axis forks once into two. A monopodial leader carrying
  // two dozen laterals is not that topology, and running the pairwise rule two
  // dozen times in series compounds a 5% per-fork bias into a 4x one. The
  // first-order term survives that criticism; the product does not.
  _partition(sp, L) {
    const flow = new Map();
    for (const a of this.axes) flow.set(a, a.subtreeFlow(sp));
    const dens = (ax, d) => {
      const kids = ax.kids.slice().sort((a, b) => a.attachLen() - b.attachLen());
      let dd = d;
      for (const k of kids) {
        const Ql = flow.get(k);
        const Qm = ax.flowAbove(k.attachLen(), sp);
        const den = L * Qm + (1 - L) * Ql;
        if (den <= 0) { dens(k, 0); continue; }
        dens(k, dd * (Qm + Ql) * (1 - L) / den);
        dd *= (Qm + Ql) * L / den;
      }
      ax._dens = dd;      // what reaches this axis's own apex
    };
    dens(this.main, 1);
    const lead = this.main._dens || 1e-12;
    for (const a of this.axes) a.vigour = clamp((a._dens || 0) / lead, 0, 1);
  }

  step(dt) {
    this.time += dt;
    this.leaves.step();
    this.updateVigour(this.sp);
    // Undo last step's deflection before growing, so the wind never compounds into
    // the grown shape — see `Axis.restorePose`.
    for (const a of this.axes) a.restorePose();
    for (const a of this.axes) {
      a.step(dt, this.sp);
      // the fruit runs faster than the shoot; there is a lot to resolve
      if (a.fruit) for (let k = 0; k < 3; k++) a.fruit.step(dt);
    }
    for (const a of this.axes) a.savePose();
    this.stepBend(dt);
    // the stream is stepped once the sources have moved, so it always sees the
    // plant as it is this frame. Off by default — see 38_shoot.js.
    if (this.vasc.o.enabled) this.vasc.step(this, dt);
    this.senesceStep(dt);
    this.stepFlaps(dt);
    this.stepFalls(dt);
  }

  // EVERY ATTACHED BLADE IS IN THE AIR TOO — ROADMAP 7 step 2.
  //
  // Before this, the only thing in the scene that knew there was air in it was a
  // blade that had already let go. Now a blade on its petiole is the same plate,
  // loaded by the same field, rocking on the same angle the fall integrates.
  //
  // Stepped here rather than in the renderer for the same reason the falls are: this
  // is simulation, so it runs on plant time and answers to the time slider. The
  // wind's own clock is plant time too (`37_wind.js`), which is the trap that file
  // warns about — the old shader sway ran on wall-clock milliseconds, so it did not.
  //
  // AND IT SHIPS OFF. This is a falsified mechanism kept runnable, in the same
  // category as the second inhibitor at `rhoI: 0` and the whole-plant stream in
  // `38_shoot.js` — a negative result you cannot re-measure is just a story.
  //
  // THE HISTORY, because the two halves of it point opposite ways and only the second
  // one is a verdict. When step 2 landed, the rock measured 0.002 degrees rms at
  // natural frequencies of 374-4040 Hz: correct, continuous at abscission, and
  // invisible. The diagnosis was the petiole, drawn at half the STEM's radius — a
  // rubber rod 8 mm through holding a 20 cm2 blade — and ROADMAP 5 fixed exactly that.
  //
  // On a pipe-model petiole the same mechanism does not become visible, it becomes
  // WRONG, and three independent measurements agree:
  //
  //   * `test/wind.mjs`: 69 degrees rms twist at the shipped weather, and 31% of the
  //     time within a whisker of the stop.
  //   * `tools/jitter.mjs`: blades at 10-25 Hz with peak slew two orders above the
  //     stem's. The one-word verdict is READS AS JITTER.
  //   * the wind's own spectrum: its highest gust mode is 1.78 Hz, so NOTHING is
  //     driving 25 Hz. The blade is not resonating — it is SNAPPING between the two
  //     face-on attitudes as the wind wanders across it.
  //
  // That last one is the finding. A plate hinged along its own midrib is statically
  // unstable in twist — the aerodynamic centre sits ahead of a mid-chord pivot, which
  // is why weather vanes are built the other way round — and the ROADMAP 5 pre-flight
  // predicted precisely this before the radius was touched. It is not a bug in the
  // integrator, it is not the damping (measured: the effective ratio sits at its
  // structural 0.12 and goes negative only 6% of the time), and it is not a constant
  // that wants turning. It is a one-degree-of-freedom rigid blade being asked to stand
  // in for a lamina that in reality twists progressively, gives, and reconfigures.
  //
  // DO NOT SWITCH IT BACK ON BY WIDENING `kappa`. That would work, and it is exactly
  // the move the pre-flight forbids: the twist spans invisible-to-pinned across
  // `kappa`'s published error bar, so tuning it until it looks right is tuning, not
  // measuring — and `kappa` has an independent confirmation from the petiole-to-chord
  // ratio of a real broadleaf that agrees with where it sits now. What has to change
  // is the model, and ROADMAP 5 says what.
  //
  // Nothing visible is lost by this. The rock it replaces was 0.002 degrees. The
  // motion a viewer reads is the stem (step 3) and now the hang (7b).
  stepFlaps(dt) {
    const w = this.wind;
    if (!w || w.o.uRef <= 0) return;      // a dead calm costs nothing at all
    if (!FLAP_DEFAULTS.enabled && !(this.sp.fallOpts && this.sp.fallOpts.enabled)) return;
    for (const a of this.axes) {
      for (const o of a.organs) {
        if (o.shed || !o.leaf || !o.leaf.margin || !o.leaf.margin.mature) continue;
        if (!(o.dev > 0.02)) continue;    // still furled in the bud
        // The plate is rebuilt when the blade's mass or size has moved — it drains
        // and shrinks as it senesces — but not every step, because `plateOf`
        // integrates the margin.
        const sen = o.sen || 0;
        if (!o.flapSt || Math.abs(sen - o.flapSen) > 0.05) {
          const f = flapOf(o.leaf, drawnBladeLen(o.len, sen), sen, petioleOf(o),
                           this.sp.fallOpts);
          o.flapSt = o.flapSt ? (o.flapSt.f = f, o.flapSt) : flapState(f);
          o.flapSen = sen;
        }
        // The wind where the blade is, resolved on the blade's own chord and normal.
        // The frame is this step's, one layout old, which is what every other
        // per-organ quantity here uses.
        windAt(_wind, w, o.frame.o[0], o.frame.o[1], o.frame.o[2], this.time);
        flapStep(o.flapSt,
          v3dot(_wind, o.frame.z), v3dot(_wind, o.frame.y), dt);
        o.flap = o.flapSt.phi;
      }
    }
  }

  // EVERY AXIS BENDS — ROADMAP 7 step 3, and the step that makes the air visible.
  //
  // The load is the canopy's, not the stem's: ninety-odd blades at their own attitudes
  // against a stem whose projected area is a seventh of theirs. The stiffness is
  // `EI/ds` on radii Murray's law grew. Neither end of that was chosen.
  //
  // Solved about the REST shape — the pose growth produced — for the reason set out at
  // the top of `39a_stem.js`: a cantilever's self-weight sag and its first frequency are
  // the same stiffness-to-mass group, so a stem that sways like a plant must also hang
  // 27 cm below where it grew. Real stems escape that by being continuously remodelled
  // toward their target, so the grown shape IS the static equilibrium and this solves
  // the deviations about it. Nothing here changes a silhouette.
  //
  // Parents are stepped and applied before their children, and each axis carries its
  // whole subtree, because a branch that did not ride its parent would swing free of
  // the stem it is attached to.
  stepBend(dt) {
    const w = this.wind;
    if (!w) return;
    // A DEAD CALM STILL HAS TO RELAX. Returning early on `uRef: 0` froze the plant in
    // whatever pose the last gust left it in, which is worse than not modelling wind at
    // all — so a calm scene keeps stepping until the deflection has actually decayed,
    // and only then costs nothing.
    if (w.o.uRef <= 0) {
      let moving = false;
      for (const a of this.axes) {
        const b = a.bend;
        for (let j = 0; j < b.n; j++) {
          if (v3len(b.st[j].th) > 1e-6 || v3len(b.st[j].om) > 1e-6) { moving = true; break; }
        }
        if (moving) break;
      }
      if (!moving) return;
    }
    const o = { ...STEM_DEFAULTS, ...(this.sp.stemOpts || {}) };
    const S = this._stemS || (this._stemS = {});
    const sc = stemScales(o, WORLD);
    S.E = sc.E; S.rho = sc.rho;
    S.sigma = fallScales(FALL_DEFAULTS).sigmaFresh;
    for (const a of this.axes) {
      if (!a.rest) continue;
      a.tagOrgansForBend(S);
      a.bend.sync(a.rest, a.radii, a.rest.length, a.organs, S);
      a.bend.step(dt, w, this.time, WORLD);
    }
    // `axes` is in creation order and a branch is always created after the axis it
    // came off, so this is already parents-first.
    for (const a of this.axes) {
      if (!a.rest || !a.bend.live) continue;
      a.bend.apply(a.pts, a.pts.length, a.bend._arc, a.subtreePoints());
    }
    // ...and rebuild the frames off the shape that will actually be drawn, so organs,
    // blades and shed-blade snapshots all ride the bent stem.
    for (const a of this.axes) a.updateRadii(this.sp);
  }

  // A blade lets go: hand it to the aerodynamics in 39_fall.js.
  //
  // Everything the fall needs is already known about this organ, which is why this
  // is short. The plate comes from the silhouette the margin grew and how far the
  // blade had drained; the plane it falls in is the direction it was pointing, which
  // phyllotaxis set; and the distance it has to travel is its own height above the
  // base of the plant. Nothing here is chosen and nothing is hashed.
  startFall(o) {
    if (!o.leaf) return;                          // never got a blade to fall
    const groundY = this.main.pts[0][1];
    // the DRAWN length, not the organ's — see 39_fall.js
    const plate = plateOf(o.leaf, drawnBladeLen(o.len, o.sen || 1), o.sen || 1,
                          this.sp.fallOpts);
    o.fallAxis = fallAxis(o.frame, v3());
    // THE SEAM — ROADMAP 7 step 4. The fall used to start from a guessed attitude
    // (half the blade's margin asymmetry) and a guessed rate (the same asymmetry
    // times `wobble`), which was the honest best available when nothing attached was
    // moving. Now the blade has been rocking in the same air on the same angle, so
    // both are MEASURED off it and the fall continues the motion instead of starting
    // one.
    //
    // The attitude comes off the drawn chord rather than out of the flap state,
    // because the drawn chord is what the viewer has been looking at: it already
    // carries the roll the organ grew, the tilt, and the wind. `_fpl` is the fall
    // plane's own horizontal, the same basis `fallFrame` rebuilds.
    v3set(_fpl, -o.fallAxis[2], 0, o.fallAxis[0]);
    const th0 = Math.atan2(v3dot(o.frame.z, _zsy), v3dot(o.frame.z, _fpl));
    // The rate carries over directly — both angles are a rotation about the blade's
    // long axis, in the same sense — but the fall pitches about the LEVELLED long
    // axis, so what survives is the component along it. A blade hanging steeply
    // hands over less of its rock than a level one, which is geometry, not a fudge.
    const om0 = (o.flapSt ? o.flapSt.om : 0) * v3dot(o.frame.x, o.fallAxis);
    // And the tilt of the long axis, which is the BIG one: the fall pitches about a
    // levelled axis, so before this a blade hanging at 27 degrees straightened out on
    // the frame it detached on. The fall now starts at the tilt the plant was holding
    // it at and levels it aerodynamically — see the second plane in `fallStep`.
    const ph0 = Math.asin(clamp(v3dot(o.frame.x, _zsy), -1, 1));
    o.fall = fallState(plate, Math.max(0.05, o.frame.o[1] - groundY), th0, om0, ph0);
    // The frame is snapshotted because the axis keeps moving after the blade has
    // gone — it still sways, and a shed organ that kept reading its live frame was
    // hanging off a stem it was no longer attached to.
    o.fallFrom = {
      o: v3(o.frame.o[0], o.frame.o[1], o.frame.o[2]),
      x: v3(o.frame.x[0], o.frame.x[1], o.frame.x[2]),
      y: v3(o.frame.y[0], o.frame.y[1], o.frame.y[2]),
      z: v3(o.frame.z[0], o.frame.z[1], o.frame.z[2]),
    };
  }

  // Advance every blade still in the air. This lives in `Plant.step` rather than in
  // the renderer on purpose: a fall is simulation, so it runs on plant time and
  // answers to the time slider like everything else. Stepping it in `buildScene`
  // instead would have tied the speed of the fall to the frame rate.
  stepFalls(dt) {
    for (const a of this.axes) for (const o of a.organs) {
      if (!o.fall || o.fall.done) continue;
      fallStep(o.fall, dt);
      const fo = o.fall.plate.o;
      // done once it has faded where it landed, or once the backstop runs out
      if (o.fall.t > fo.life ||
          (o.fall.landed && o.fall.t - o.fall.tLand > fo.settle)) o.fall.done = 1;
    }
  }

  // SENESCENCE
  //
  // Be plain about which half of this is emergent, because the interesting half
  // is not the half that looks interesting.
  //
  // WHEN it starts is a physical state of the organism and nothing else: every
  // growing point on the plant has either arrested on its budget or spent itself
  // founding a flower, so there is no tissue anywhere still patterning. Nothing
  // schedules that. It is downstream of how much leaf the plant managed to build,
  // which set when it flowered, which set when its apices were consumed. A shoot
  // that never flowers still gets there by arresting on its organ budget — the
  // point is that both routes are conditions the plant reaches, not times.
  //
  // The ORDER is a wave up the plant, oldest tissue letting go first, and that
  // is asserted here rather than derived. A whole-plant auxin transport network
  // was built to derive it (38_shoot.js) and could not: its shed order correlates
  // with age anywhere from -0.05 to 0.57 depending on the species, and with its
  // age decline removed it cannot finish a plant at all. See JOURNAL.md.
  // What that experiment did establish is that this is one of the places where
  // the chemistry has nothing to say, so the honest thing is a stated rule rather
  // than a stated rule wearing a transport model.
  // `sen` (0..1) and `shed` are read by the scene: `blade()` drains the lamina
  // against them and `70_app.js` flies a shed organ down and stops drawing it.
  // They are the whole interface between finishing and the picture of finishing,
  // so changing what they mean changes what the last minute of a run looks like.
  senesceStep(dt) {
    // exactly one mechanism may own `sen`, or the falsified path cannot be
    // measured against this one — they simply add, and both look like they work
    if (this.vasc.o.enabled && this.vasc.o.senesceFromStream) return;
    // HOLD THE LAST ACT. A viewer control, in the same category as the wind
    // slider and the time slider: it pauses a stage rather than inventing one,
    // and a specimen released from it carries on from exactly where it stopped.
    // Nothing downstream reads it, so it cannot leak into the chemistry — what
    // it does is stop `sen` advancing, and `sen` is the only thing that shedding,
    // the drained colour and the fall all key off.
    //
    // It exists because a garden is mostly BACKGROUND, and the piece's timing was
    // built around one specimen being watched all the way through. Left alone a
    // stand planted with staggered ages has half its members dismantling
    // themselves before anyone has looked at them.
    if (this.sp.senesceHold) return;
    if (!this.spent()) return;
    const sp = this.sp;
    let oldest = 0;
    for (const a of this.axes) for (const o of a.organs)
      if (!o.floral && o.age > oldest) oldest = o.age;
    if (oldest <= 0) return;
    for (const a of this.axes) for (const o of a.organs) {
      if (o.floral || o.shed) continue;
      // squared, so the wave has a front instead of everything fading together
      const rel = clamp(o.age / oldest, 0, 1);
      o.sen = clamp((o.sen || 0) + dt * rel * rel / sp.senesceFor, 0, 1);
      if (o.sen >= 1) { o.shed = true; o.shedAt = this.time; this.startFall(o); }
    }
  }

  // world-space extent of everything currently alive, used to frame the shot
  bounds() {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const a of this.axes) {
      for (const p of a.pts) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
        if (p[2] < z0) z0 = p[2]; if (p[2] > z1) z1 = p[2];
      }
      for (const o of a.organs) {
        // "currently alive" was aspirational until something drew senescence:
        // a shed blade kept its full reach in here long after it stopped being
        // on the plant, so a specimen that had dropped everything was still
        // framed for the canopy it used to have and sat tiny in the middle of
        // an empty shot. Skipping them closes the camera in as it dismantles.
        if (o.shed) continue;
        const f = o.frame.o, r = o.len;
        if (f[0] - r < x0) x0 = f[0] - r; if (f[0] + r > x1) x1 = f[0] + r;
        if (f[1] - r < y0) y0 = f[1] - r; if (f[1] + r > y1) y1 = f[1] + r;
        if (f[2] - r < z0) z0 = f[2] - r; if (f[2] + r > z1) z1 = f[2] + r;
      }
    }
    if (x0 > x1) { x0 = y0 = z0 = -1; x1 = y1 = z1 = 1; }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2,
      w: Math.max(x1 - x0, z1 - z0), h: y1 - y0 };
  }

  // Which act the specimen is in. Drives both the camera and the display.
  stage() {
    const fr = [];
    for (const a of this.axes) if (a.fruit && !a.fruit.barren) fr.push(a.fruit);
    if (this.dead()) return 'dead';
    if (this.senescence() > 0.04) return 'senescing';
    if (fr.length && fr.every(f => f.done)) return 'ripe';
    if (fr.some(f => f.phase === 'grow')) return 'fruiting';
    if (this.axes.some(a => a.floral)) return 'flowering';
    if (this.organCount() > 2) return 'leafing';
    return 'seedling';
  }

  // Everything on this label is something the chemistry decided. None of these
  // numbers exists anywhere in the code — they are measurements of one
  // individual that grew the way it grew.
  card() {
    let leaves = 0, flowers = 0, seeds = 0, teeth = 0, petals = 0;
    let lastLeaf = null, lastFlower = null, ripe = 0, nfruit = 0;
    for (const a of this.axes) {
      if (a.floral) { flowers++; lastFlower = a; }
      if (a.fruit && !a.fruit.barren) {
        nfruit++;
        seeds += a.fruit.seeds.length;
        let r = 0;
        for (let i = 0; i < a.fruit.n; i++) r += a.fruit.ripe[i];
        ripe += r / a.fruit.n;
      }
      for (const o of a.organs) {
        if (o.floral) continue;
        leaves++;
        if (o.leaf && o.leaf.margin && o.leaf.margin.mature) lastLeaf = o.leaf;
      }
    }
    if (lastLeaf) teeth = lastLeaf.margin.teeth.length;
    if (lastFlower) for (const o of lastFlower.organs) if (o.petal) petals++;
    const st = this.stats().divergence;
    return {
      stage: this.stage(), leaves, flowers, petals, teeth,
      seeds, fruit: nfruit,
      ripe: nfruit ? ripe / nfruit : 0,
      floweredAt: this.floweredAt || 0,
      divergence: st ? st.mean : null,
      divergenceSd: st ? st.sd : null,
    };
  }

  stats() {
    // read the angle off whichever growing point has the most to say — the
    // leader arrests, but its laterals keep patterning
    let m = null;
    for (const a of this.axes)
      if (a.meristem && (!m || a.meristem.divergence.length > m.divergence.length)) m = a.meristem;
    // once every growing point has been spent there is nothing left to measure,
    // so hold the last reading rather than blanking the display
    const st = (m ? m.divergenceStats(24) : null) || this._lastDiv || null;
    if (st) this._lastDiv = st;
    if (m) { this._lastCells = m.F.n; this._lastPl = m.plastochron; }
    let organs = 0;
    for (const a of this.axes) organs += a.organs.length;
    return {
      organs, axes: this.axes.length,
      cells: m ? m.F.n : (this._lastCells || 0), live: m ? m.primordia.length : 0,
      divergence: st, plastochron: m ? m.plastochron : (this._lastPl || 0),
      height: this.main.tipPos()[1],
    };
  }
}
