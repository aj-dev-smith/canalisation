// ---------------------------------------------------------------------------
// THE ORGANISM
//
// The meristem decides where organs go and when. This file only has to believe
// it. Nothing here invents an angle, a spacing or a branching rule — it reads
// them off the simulation and builds a body around them.
// ---------------------------------------------------------------------------

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
    const rate = sp.elongation * (this.gen === 0 ? 1 : 0.72) * (this.floral ? 0.22 : 1);
    const tip = this.tipPos();
    // tropism: up, plus a slow drift that gives the axis its character
    const want = v3(0, 1, 0);
    const t = this.age * 0.004 + this.seed;
    want[0] += Math.sin(t) * sp.wander;
    want[2] += Math.cos(t * 1.31) * sp.wander;
    // circumnutation — the slow helical search a real growing tip performs
    const nu = this.age * sp.nutation + this.seed * 0.7;
    want[0] += Math.cos(nu) * sp.nutAmp;
    want[2] += Math.sin(nu) * sp.nutAmp;
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
      // two organs cannot share an internode, however fast the tip patterns
      const mi = this.floral ? sp.minInternode * 0.10 : sp.minInternode;
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
        if (this.rnd() > 0.35) { org.branched = true; continue; }
        org.branched = true;
        const dir = v3();
        v3lerp(dir, org.frame.x, v3(0, 1, 0), 0.45);
        v3norm(dir, dir);
        // competent plant → this bud makes a flower rather than a branch
        const flowering = this.plant.florigen > sp.florigenThresh;
        if (flowering && this.plant.flowerCount() >= sp.maxFlowers) break;
        const ax = this.plant.addAxis(org.frame.o, dir, this.gen + 1, org.vStem, this);
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
    const k = Math.sqrt(clamp(1 - lost / Math.max(1e-3, comp), 0.35, 1));
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
    for (let i = 0; i < n - 1; i++) {
      const belowTip = total - oldArc[i];
      const e = sp.internode * Math.exp(-belowTip / sp.internodeSpan);
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

    arc[0] = 0;
    for (let i = 1; i < n; i++) arc[i] = arc[i - 1] + v3len(v3sub(_zs0, this.pts[i], this.pts[i - 1]));
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
    const bl = this._bl || (this._bl = []);
    bl.length = 0;
    for (const org of this.organs) bl.push(org.birthLen);
    bl.sort((a, b) => a - b);
    let above = bl.length, k = 0;
    for (let i = 0; i < n; i++) {
      while (k < bl.length && bl[k] <= arc[i]) { k++; above--; }
      const below = total - arc[i];
      this.radii[i] = Math.pow(
        Math.pow(sp.tipRadius, 3) + sp.organFlow * above + sp.thicken * below
        + (this.fruit ? sp.fruitFlow : 0),
        1 / 3) * sp.radiusScale;
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
  radiusScale: 1.0,
  branching: 0.55,
  budRelease: 300,
  dominance: 6.0,
  maxAxes: 5,
  maxGen: 2,
  leafBudget: 60,
  leafLibrary: 5,
  leafOpts: {},
  // How long the slowest blade on a finished specimen takes to let go. Only the
  // rate is set here — whether it happens at all is `Plant.spent()`.
  senesceFor: 2200,
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
    this.addAxis(v3(0, 0, 0), v3(0, 1, 0), 0);
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
    this.axes.push(a);
    return a;
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

  step(dt) {
    this.time += dt;
    this.leaves.step();
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
