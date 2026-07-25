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
    this.droop = 0;
    this.tilt = 0;
    this.frame = { o: v3(), x: v3(), y: v3(), z: v3() };
  }
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
    this.florigen = 0;
    this.floral = false;
    this.fruit = null;
    this.floralCount = 0;
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
        org.droop = sp.droop * smoothstep(0, sp.organGrow * 1.7, org.age);
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
    if (this.floral && this.floralCount >= sp.floralOrgans && !this.fruit) {
      this.setFruit(sp);
    }

    // A determinate shoot: once it has made its complement of organs the apex
    // arrests. The specimen finishes instead of growing off the top of the
    // frame forever — and the meristem stops costing anything.
    const budgetLeft = sp.organBudget - this.plant.vegOrganCount();
    if ((!this.floral && (this.organs.length >= sp.maxOrgans || budgetLeft <= 0))) {
      this.alive = false; this.arrested = true;
      this.meristem = null;   // an arrested shoot has no growing point to pay for
    }

    // --- harvest whatever the meristem decided --------------------------------
    while (m.emitted.length) {
      const prim = m.emitted.shift();
      if (this.organs.length >= sp.maxOrgans) break;
      // two organs cannot share an internode, however fast the tip patterns
      const mi = this.floral ? sp.minInternode * 0.10 : sp.minInternode;
      if (this.length - this.lastOrganLen < mi) continue;
      this.lastOrganLen = this.length;
      this.addOrgan(prim);
    }

    // --- organs mature --------------------------------------------------------
    for (const org of this.organs) {
      org.age += dt;
      const f = smoothstep(0, sp.organGrow, org.age);
      org.dev = f;
      org.len = org.maxLen * (0.04 + 0.96 * f);
      org.droop = sp.droop * smoothstep(0, sp.organGrow * 1.7, org.age);
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
        const ax = this.plant.addAxis(org.frame.o, dir, this.gen + 1);
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
    m.R *= 0.66; m.rCZ *= 0.42; m.rPZ *= 0.62; m.G *= 2.3;
    this.meristem.candidates = [];
    this.meristem.emitted.length = 0;
  }

  // The apex has spent itself. What is left becomes an ovary.
  setFruit(sp) {
    const seed = (this.seed * 2654435761 + 7919) >>> 0;
    this.fruit = new Fruit(this.plant.prm, this.plant.sp.fruitOpts || {}, seed);
    this.alive = false;
    this.arrested = true;
    this.meristem = null;      // the apex is spent; stop paying for it
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
    // same plane and saw through each other
    org.roll = (org.rnd() - 0.5) * sp.organRoll;
    org.lift = (org.rnd() - 0.5) * 0.22;
    org.leafAt = 0;
    org.birthLen = this.length;
    if (this.floral) {
      this.floralCount++;
      // identity read off the radius the organ was founded at: the floral
      // meristem shrinks as it consumes itself, so later organs start further
      // in, and that gradient is the only thing distinguishing them
      org.q = clamp(1 - (prim.r / Math.max(1e-3, this.meristem.o.rPZ)), 0, 1);
      org.floral = true;
      // the outer ones are petals — leaves whose margin was told to grow broad
      // and smooth instead of long and toothed
      org.petal = org.q < sp.petalQ;
      org.leaf = null;
      org.maxLen = sp.organLen * (org.petal ? 0.30 : 0.13) * (0.82 + 0.36 * org.rnd());
      org.tilt = org.petal ? sp.petalTilt * (0.9 + 0.2 * org.rnd())
        : sp.organTilt * 0.30;
      org.roll *= 0.25;
      org.droopScale = org.petal ? 0.12 : 0.05;
    }
    this.organs.push(org);
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
      _zd[1] -= (org.droop * (org.droopScale === undefined ? 1 : org.droopScale) - org.lift) * (org.dev || 0);
      v3norm(_zd, _zd);
      v3copy(org.frame.o, _zp);
      v3copy(org.frame.x, _zd);
      v3norm(_zside, v3cross(_zside, _zd, _zax));
      if (v3len(_zside) < 0.1) v3set(_zside, 1, 0, 0);
      v3copy(org.frame.z, _zside);
      v3norm(_znrm, v3cross(_znrm, _zside, _zd));
      // roll the blade about its own petiole
      const cr = Math.cos(org.roll), sr = Math.sin(org.roll);
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
    o.margin = {
      ay: lerp(0.34, 0.86, r()),
      g1: lerp(0.00070, 0.00170, r()),
      gExp: lerp(1.6, 3.0, r()),
      D: lerp(4.5, 11.0, r()),
      tipBias: lerp(0.25, 0.85, r()),
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
  floralOrgans: 9,      // organs the flower makes before the apex is spent
  fruitFlow: 0.0060,     // a swelling fruit is a huge sink; the stem answers
  fruitScale: 0.55,
  fruitOpts: {},
  maxFlowers: 6,
  petalQ: 0.62,      // organs founded outside this are petals
  petalTilt: 1.45,   // petals reflex past perpendicular as they open
  tropism: 0.02,
  wander: 0.35,
  organLen: 1.35,
  organTilt: 0.85,
  organGrow: 190,
  droop: 0.55,
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
    this.addAxis(v3(0, 0, 0), v3(0, 1, 0), 0);
  }
  addAxis(base, dir, gen) {
    const a = new Axis(this, base, dir, gen, (this.seed * 31 + this.axes.length * 6151) >>> 0);
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
    for (const a of this.axes) {
      a.step(dt, this.sp);
      // the fruit runs faster than the shoot; there is a lot to resolve
      if (a.fruit) for (let k = 0; k < 3; k++) a.fruit.step(dt);
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
