// ---------------------------------------------------------------------------
// The exhibit: camera, species, scene assembly, and the loop.
// ---------------------------------------------------------------------------

import { DEFAULT_PRM } from './10_auxin.js';
import { MERISTEM_DEFAULTS } from './20_meristem.js';
import { Leaf, LEAF_DEFAULTS } from './30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from './40_plant.js';
import { Buffers, tube, blade, laminaCells, meristemDome, fruitShell, setView } from './50_geom.js';
import { Renderer } from './60_render.js';
import {
  v3, v3set, v3copy, v3add, v3sub, v3scale, v3addScaled, v3norm, v3len, v3lerp,
  TAU, clamp, lerp, smoothstep, mulberry32,
} from './00_math.js';

// --- species ---------------------------------------------------------------
// Each is a parameter set, not a shape. Nothing here says what the plant will
// look like; it says how its chemistry is tuned.
//
//   prm  the auxin engine — T/D set the patterning wavelength, so they set how
//        crowded the leaves are before anything else does
//   mo   the meristem — how big the growing point is and how fast it expands
//   sp   the organism — elongation, branching, tropism, when it flowers
//   marginBias  multipliers on the leaf margin's own chemistry. A species scales
//        it; the per-leaf draw still varies inside that. See LeafPool._make.
//   pal  colour only. Never geometry.
//
// `test/species.mjs` grows all of them headlessly and prints the numbers. Run it
// before and after touching anything here.
// how finely the inner-organ palette is graded across q (cached, not per-frame)
const INNER_STEPS = 5;

export const SPECIES = {
  'Cathedral Fern': {
    prm: { T: 40, D: 6.0, mu: 0.30, rho: 0.60, b: 3.0 },
    mo: { R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 },
    sp: {
      elongation: 0.0044, organLen: 4.3, organTilt: 0.86, droop: 0.5,
      maxOrgans: 52, branching: 0.5, maxAxes: 5,
      leafOpts: { fenestrate: 0 },
      marginBias: { ay: 0.86, g1: 1.10 },
    },
    pal: {
      blade0: [0.06, 0.21, 0.21], blade1: [0.10, 0.36, 0.32],
      veinTint: [0.02, 0.16, 0.22], vein: [0.35, 1.0, 0.95],
      stem0: [0.13, 0.26, 0.27], stem1: [0.22, 0.44, 0.40],
      cell0: [0.05, 0.14, 0.20], cell1: [0.55, 1.0, 0.85],
      bgTop: [0.012, 0.030, 0.045], bgBot: [0.004, 0.008, 0.014],
      bgGlow: [0.03, 0.10, 0.13], fog: [0.02, 0.05, 0.07], fogD: 0.075,
      key: [0.35, 0.75, 0.45], keyCol: [0.55, 0.85, 0.80],
      ambTop: [0.10, 0.22, 0.30], ambBot: [0.02, 0.04, 0.07],
      glow: 1.0, spore: [0.4, 0.9, 0.85],
      pin: [0.55, 0.92, 1.0], spark: [0.85, 1.0, 0.95],
      fruit0: [0.06, 0.20, 0.17], fruit1: [0.95, 0.45, 0.55],
      petal0: [0.20, 0.30, 0.46], petal1: [0.62, 0.80, 1.0], petalVein: [0.8, 0.95, 1.0],
    },
  },
  'Spiral Ossuary': {
    prm: { T: 52, D: 6.5, mu: 0.30, rho: 0.60, b: 3.4 },
    mo: { R: 10, rCZ: 2.2, rPZ: 6.4, G: 0.0042 },
    sp: {
      elongation: 0.0036, organLen: 3.2, organTilt: 0.66, droop: 0.24,
      maxOrgans: 60, branching: 0.30, maxAxes: 3,
      leafOpts: { fenestrate: 0 },
      marginBias: { ay: 0.62, g1: 1.25, D: 0.80 },
    },
    pal: {
      blade0: [0.26, 0.24, 0.20], blade1: [0.50, 0.47, 0.40],
      veinTint: [0.30, 0.16, 0.02], vein: [1.0, 0.62, 0.20],
      stem0: [0.30, 0.28, 0.24], stem1: [0.58, 0.54, 0.46],
      cell0: [0.18, 0.15, 0.13], cell1: [1.0, 0.75, 0.35],
      bgTop: [0.045, 0.038, 0.033], bgBot: [0.010, 0.008, 0.007],
      bgGlow: [0.09, 0.055, 0.02], fog: [0.06, 0.05, 0.045], fogD: 0.062,
      key: [0.4, 0.8, 0.3], keyCol: [0.95, 0.85, 0.70],
      ambTop: [0.22, 0.20, 0.18], ambBot: [0.05, 0.04, 0.035],
      glow: 0.9, spore: [1.0, 0.8, 0.45],
      pin: [1.0, 0.80, 0.45], spark: [1.0, 0.95, 0.75],
      fruit0: [0.24, 0.22, 0.17], fruit1: [1.0, 0.62, 0.18],
      petal0: [0.44, 0.38, 0.28], petal1: [1.0, 0.90, 0.66], petalVein: [1.0, 0.9, 0.7],
    },
  },
  'Abyssal Frond': {
    prm: { T: 34, D: 5.4, mu: 0.30, rho: 0.60, b: 2.7 },
    mo: { R: 11, rCZ: 2.8, rPZ: 7.4, G: 0.0034 },
    sp: {
      elongation: 0.0050, organLen: 5.0, organTilt: 1.02, droop: 0.95,
      maxOrgans: 44, branching: 0.62, maxAxes: 6,
      leafOpts: { fenestrate: 0.052 },
      marginBias: { ay: 1.12, D: 1.15 },
    },
    pal: {
      blade0: [0.10, 0.04, 0.16], blade1: [0.20, 0.08, 0.29],
      veinTint: [0.22, 0.02, 0.24], vein: [1.0, 0.28, 0.85],
      stem0: [0.14, 0.06, 0.20], stem1: [0.26, 0.11, 0.36],
      cell0: [0.09, 0.03, 0.14], cell1: [1.0, 0.45, 0.95],
      bgTop: [0.030, 0.010, 0.045], bgBot: [0.004, 0.002, 0.010],
      bgGlow: [0.07, 0.015, 0.10], fog: [0.04, 0.015, 0.06], fogD: 0.082,
      key: [0.3, 0.85, 0.42], keyCol: [0.62, 0.45, 0.85],
      ambTop: [0.16, 0.08, 0.26], ambBot: [0.03, 0.01, 0.06],
      glow: 0.95, spore: [0.9, 0.4, 1.0],
      pin: [0.85, 0.55, 1.0], spark: [1.0, 0.80, 1.0],
      fruit0: [0.08, 0.05, 0.16], fruit1: [0.95, 0.20, 0.70],
      petal0: [0.32, 0.10, 0.34], petal1: [1.0, 0.42, 0.86], petalVein: [1.0, 0.7, 1.0],
    },
  },
  'Sun Coral': {
    prm: { T: 46, D: 7.2, mu: 0.30, rho: 0.60, b: 3.2 },
    mo: { R: 9.5, rCZ: 2.0, rPZ: 6.2, G: 0.005 },
    sp: {
      elongation: 0.0032, organLen: 3.0, organTilt: 0.5, droop: 0.15,
      maxOrgans: 64, branching: 0.72, maxAxes: 7, maxGen: 3,
      leafOpts: { fenestrate: 0.040 },
      marginBias: { ay: 1.20, g1: 0.90 },
    },
    pal: {
      blade0: [0.30, 0.10, 0.04], blade1: [0.56, 0.24, 0.08],
      veinTint: [0.35, 0.22, 0.02], vein: [1.0, 0.85, 0.35],
      stem0: [0.34, 0.12, 0.05], stem1: [0.62, 0.26, 0.09],
      cell0: [0.22, 0.07, 0.03], cell1: [1.0, 0.9, 0.45],
      bgTop: [0.045, 0.020, 0.014], bgBot: [0.008, 0.004, 0.004],
      bgGlow: [0.11, 0.04, 0.015], fog: [0.07, 0.035, 0.02], fogD: 0.058,
      key: [0.45, 0.7, 0.55], keyCol: [1.0, 0.82, 0.60],
      ambTop: [0.26, 0.14, 0.09], ambBot: [0.05, 0.025, 0.02],
      glow: 1.0, spore: [1.0, 0.7, 0.35],
      pin: [1.0, 0.85, 0.50], spark: [1.0, 1.0, 0.80],
      fruit0: [0.22, 0.10, 0.04], fruit1: [1.0, 0.72, 0.15],
      petal0: [0.44, 0.18, 0.06], petal1: [1.0, 0.78, 0.30], petalVein: [1.0, 0.9, 0.5],
    },
  },
  // A bramble. Weak apical dominance and a short bud-release delay mean almost
  // every axil wakes up, so the specimen is mostly stem — and because branching
  // spends the shared organ budget, each shoot is left with small, narrow leaves.
  'Hoarfrost Thicket': {
    prm: { T: 44, D: 5.0, mu: 0.30, rho: 0.60, b: 3.4 },
    mo: { R: 9.0, rCZ: 2.0, rPZ: 5.8, G: 0.0046 },
    sp: {
      elongation: 0.0022, internode: 0.0032, organLen: 2.6, organTilt: 0.62,
      droop: 0.10, maxOrgans: 34, branching: 0.92, maxAxes: 9, maxGen: 3,
      budRelease: 210, dominance: 3.2, nutation: 0.024, nutAmp: 0.42,
      wander: 0.62, tropism: 0.016, tipRadius: 0.042,
      leafOpts: { fenestrate: 0 },
      marginBias: { ay: 0.55, g1: 1.25, D: 0.75 },
    },
    pal: {
      blade0: [0.16, 0.20, 0.26], blade1: [0.42, 0.52, 0.62],
      veinTint: [0.10, 0.16, 0.30], vein: [0.72, 0.90, 1.0],
      stem0: [0.18, 0.22, 0.28], stem1: [0.46, 0.55, 0.66],
      cell0: [0.12, 0.16, 0.24], cell1: [0.80, 0.92, 1.0],
      bgTop: [0.020, 0.028, 0.042], bgBot: [0.005, 0.007, 0.012],
      bgGlow: [0.05, 0.07, 0.12], fog: [0.035, 0.045, 0.065], fogD: 0.070,
      key: [0.42, 0.78, 0.38], keyCol: [0.82, 0.90, 1.0],
      ambTop: [0.18, 0.22, 0.30], ambBot: [0.04, 0.05, 0.075],
      glow: 1.05, spore: [0.75, 0.88, 1.0],
      pin: [0.70, 0.88, 1.0], spark: [0.95, 0.99, 1.0],
      fruit0: [0.14, 0.18, 0.24], fruit1: [0.55, 0.80, 1.0],
      petal0: [0.30, 0.36, 0.46], petal1: [0.90, 0.95, 1.0], petalVein: [0.85, 0.95, 1.0],
    },
  },
  // A climber. Long internodes that keep stretching far below the tip, a fast
  // circumnutation and a weak upward tropism: the axis writes a helix instead of
  // a column. It flowers on less leaf area than the others, so it fruits early.
  'Ember Creeper': {
    prm: { T: 38, D: 6.8, mu: 0.30, rho: 0.60, b: 2.9 },
    mo: { R: 10.5, rCZ: 2.6, rPZ: 7.0, G: 0.0038 },
    sp: {
      elongation: 0.0058, internode: 0.0090, internodeSpan: 3.6,
      organLen: 3.6, organTilt: 1.16, droop: 0.62, maxOrgans: 30,
      branching: 0.22, maxAxes: 3, wander: 0.55, nutation: 0.030,
      nutAmp: 0.52, tropism: 0.030, florigenThresh: 8, maxFlowers: 8,
      fruitScale: 0.78,
      leafOpts: { fenestrate: 0 },
      marginBias: { ay: 1.35, g1: 0.85, D: 1.25 },
    },
    pal: {
      blade0: [0.26, 0.05, 0.06], blade1: [0.58, 0.11, 0.12],
      veinTint: [0.32, 0.04, 0.03], vein: [1.0, 0.42, 0.24],
      stem0: [0.16, 0.06, 0.05], stem1: [0.34, 0.14, 0.10],
      cell0: [0.18, 0.04, 0.04], cell1: [1.0, 0.45, 0.30],
      bgTop: [0.030, 0.010, 0.010], bgBot: [0.006, 0.002, 0.003],
      bgGlow: [0.060, 0.014, 0.014], fog: [0.035, 0.012, 0.012], fogD: 0.075,
      key: [0.38, 0.72, 0.50], keyCol: [1.0, 0.72, 0.62],
      ambTop: [0.18, 0.08, 0.08], ambBot: [0.04, 0.016, 0.016],
      glow: 1.0, spore: [1.0, 0.45, 0.30],
      pin: [1.0, 0.55, 0.40], spark: [1.0, 0.85, 0.70],
      fruit0: [0.20, 0.04, 0.05], fruit1: [1.0, 0.24, 0.16],
      petal0: [0.42, 0.08, 0.10], petal1: [1.0, 0.50, 0.42], petalVein: [1.0, 0.80, 0.70],
    },
  },
  // A cushion. Nothing here shortens the plant. Its internodes simply never
  // open, so every leaf the meristem makes is left stacked where it was born and
  // the phyllotactic spiral stays on the ground where you can read it directly.
  // The meristem itself is run slow and long-wavelength (low G, D near 7) because
  // that is the regime that keeps emitting for thousands of steps instead of
  // locking up after a few dozen organs — see TUNING.md.
  'Sulphur Rosette': {
    prm: { T: 42, D: 6.8, mu: 0.30, rho: 0.60, b: 3.2 },
    mo: { R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0034 },
    sp: {
      elongation: 0.0016, internode: 0.0011, internodeSpan: 1.4,
      minInternode: 0.015, organLen: 2.6, organTilt: 1.34, droop: 0.18,
      maxOrgans: 78, organBudget: 84,
      branching: 0.0, maxAxes: 1, nutation: 0.006, nutAmp: 0.05,
      wander: 0.10, florigenThresh: 46, floralOrgans: 12, organRoll: 0.20,
      leafOpts: { fenestrate: 0 },
      marginBias: { ay: 0.78, g1: 1.20, gExp: 1.15 },
    },
    pal: {
      blade0: [0.10, 0.13, 0.02], blade1: [0.26, 0.32, 0.04],
      veinTint: [0.26, 0.30, 0.02], vein: [0.85, 1.0, 0.25],
      stem0: [0.18, 0.22, 0.05], stem1: [0.40, 0.48, 0.10],
      cell0: [0.14, 0.17, 0.04], cell1: [0.90, 1.0, 0.40],
      bgTop: [0.018, 0.020, 0.007], bgBot: [0.004, 0.005, 0.002],
      bgGlow: [0.045, 0.050, 0.010], fog: [0.028, 0.032, 0.011], fogD: 0.072,
      key: [0.30, 0.80, 0.52], keyCol: [0.92, 1.0, 0.70],
      ambTop: [0.14, 0.17, 0.07], ambBot: [0.03, 0.035, 0.014],
      glow: 0.95, spore: [0.90, 1.0, 0.35],
      pin: [0.85, 1.0, 0.45], spark: [1.0, 1.0, 0.75],
      fruit0: [0.16, 0.19, 0.04], fruit1: [0.95, 0.95, 0.20],
      petal0: [0.34, 0.38, 0.10], petal1: [0.95, 1.0, 0.45], petalVein: [1.0, 1.0, 0.70],
    },
  },
  // The opposite extreme: a big meristem run slow, so it patterns rarely and
  // the plant flowers off a dozen leaves instead of fifty. Each of those leaves
  // gets an enormous share of the organ budget, and fenestration opens the blade
  // up where the veins are far apart. maxOrgans is deliberately well above the
  // leaf count it actually reaches — an axis that hits maxOrgans arrests, and an
  // arrested apex can never convert to a flower. See PITFALLS.md.
  'Nightglass Parasol': {
    prm: { T: 38, D: 6.4, mu: 0.30, rho: 0.60, b: 2.8 },
    mo: { R: 11.5, rCZ: 2.8, rPZ: 7.8, G: 0.0030 },
    sp: {
      elongation: 0.0040, internode: 0.0052, organLen: 6.8, organTilt: 1.06,
      droop: 0.30, maxOrgans: 24, branching: 0.12, maxAxes: 2,
      internodeSpan: 3.4, radiusScale: 1.45, thicken: 0.00048, organFlow: 0.00050,
      florigenThresh: 4, floralOrgans: 6, fruitScale: 0.70,
      leafOpts: { fenestrate: 0.100 },
      marginBias: { ay: 1.45, g1: 0.90, D: 1.35 },
    },
    pal: {
      blade0: [0.04, 0.05, 0.12], blade1: [0.11, 0.13, 0.28],
      veinTint: [0.10, 0.12, 0.26], vein: [0.88, 0.94, 1.0],
      stem0: [0.05, 0.06, 0.13], stem1: [0.12, 0.14, 0.28],
      cell0: [0.04, 0.05, 0.13], cell1: [0.85, 0.92, 1.0],
      bgTop: [0.010, 0.012, 0.030], bgBot: [0.002, 0.003, 0.008],
      bgGlow: [0.02, 0.03, 0.09], fog: [0.015, 0.020, 0.050], fogD: 0.088,
      key: [0.25, 0.86, 0.44], keyCol: [0.70, 0.78, 1.0],
      ambTop: [0.08, 0.10, 0.24], ambBot: [0.02, 0.02, 0.06],
      glow: 1.10, spore: [0.80, 0.88, 1.0],
      pin: [0.75, 0.85, 1.0], spark: [1.0, 1.0, 1.0],
      fruit0: [0.05, 0.06, 0.14], fruit1: [0.75, 0.85, 1.0],
      petal0: [0.12, 0.14, 0.30], petal1: [0.70, 0.80, 1.0], petalVein: [0.95, 0.98, 1.0],
    },
  },
};

const BASE_PAL = {
  bloom: 0.38, bloomThresh: 1.15, exposure: 1.04, grain: 0.024, vignette: 0.60,
  sway: 1.0, dof: 0.80, laminaMul: 0.86,
  pin: [0.62, 0.88, 1.0], spark: [1.0, 0.98, 0.86],
  fruit0: [0.10, 0.22, 0.14], fruit1: [0.85, 0.30, 0.22],
  petal0: [0.30, 0.24, 0.42], petal1: [0.72, 0.55, 0.95], petalVein: [1.0, 0.85, 1.0],
};

export class App {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.renderer = new Renderer(canvas);
    this.B = new Buffers();
    this.cam = {
      az: 0.7, el: 0.22, dist: 15, fov: 0.72,
      eye: v3(0, 4, 15), target: v3(0, 4, 0), tgtY: 4,
      autoRot: true, idle: 0,
    };
    this.speciesName = 'Cathedral Fern';
    this.speedMul = 1;
    this.showMeristem = true;
    this.detail = 0;
    this.focus = null;
    this.userDriving = false;
    this.subject = null;
    this.shot = null; this.shotT = 0;
    this.resumeAfter = 16000;
    this.idleT = 0;
    this.ringWidth = 0;
    this.frame = 0;
    this.t = 0;
    this.fps = 60;
    this._acc = 0;
    this.spores = [];
    this.newSpecimen();
    this._bindInput();
  }

  newSpecimen(name = this.speciesName, seed = (Math.random() * 1e6) | 0) {
    this.specimenNo = ('000' + (seed % 9973)).slice(-4);
    const S = SPECIES[name] || SPECIES['Cathedral Fern'];
    this.speciesName = name;
    this.prm = { ...DEFAULT_PRM, ...S.prm };
    this.mo = { ...MERISTEM_DEFAULTS, ...S.mo };
    this.sp = { ...SPECIES_DEFAULTS, ...S.sp };
    this.sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
    this.pal = { ...BASE_PAL, ...S.pal };
    // The lamina is pulled down so the vasculature is the brightest thing in
    // the plant. A leaf should read as light held inside tissue.
    const m = this.pal.laminaMul;
    this.pal.blade0 = this.pal.blade0.map(v => v * m);
    this.pal.blade1 = this.pal.blade1.map(v => v * m);
    // petals share every rendering rule with leaves; only the colours differ
    this.petalPal = { ...this.pal, blade0: this.pal.petal0.map(v => v * m),
      blade1: this.pal.petal1.map(v => v * m), vein: this.pal.petalVein,
      veinTint: this.pal.petal1.map(v => v * 0.25) };
    // Inner floral organs. Until the apex started consuming itself, `q` never
    // rose above `petalQ`, so no organ ever took this path and it fell through to
    // the foliage palette — a whorl of stamens rendered as green stem-stubs the
    // first time it was looked at. They grade from the petal colour toward the
    // species' own vein colour, which is its bright accent, so an inner organ
    // reads as catching light rather than as a leaf that failed to open. Graded
    // on `q` and not switched on identity: q is continuous, and nothing here
    // should know how many whorls there are.
    this.innerPals = [];
    for (let i = 0; i < INNER_STEPS; i++) {
      const t = 0.30 + 0.62 * (i / (INNER_STEPS - 1));
      const mix = (c, d) => c.map((v, k) => lerp(v, d[k], t));
      this.innerPals.push({ ...this.petalPal,
        blade0: mix(this.petalPal.blade0, this.pal.vein.map(v => v * m * 0.55)),
        blade1: mix(this.petalPal.blade1, this.pal.vein.map(v => v * m)),
        glow: this.petalPal.glow * (1 + 0.5 * t) });
    }
    if (this.ringWidth) this.mo.rOut = this.mo.rCZ + this.ringWidth;
    const fr = mulberry32(seed ^ 0x51ed270b);
    this.sp.fruitOpts = {
      T: lerp(14, 34, fr()), D: lerp(1.8, 4.2, fr()),
      gExp: lerp(1.3, 2.6, fr()), gAux: lerp(0.00035, 0.00075, fr()),
      seedThresh: lerp(1.25, 1.7, fr()),
    };
    this.plant = new Plant(this.prm, this.mo, this.sp, seed);
    this.bbS = null;
    this.cam.dist = 7.5; this.cam.tgtY = 1.4;
    const rnd = mulberry32(seed ^ 0x5bf03635);
    this.spores = [];
    this.shot = null; this.shotT = 0; this.subject = null;
    this._covered = new Set();   // headline events are once per axis, per specimen
    this.userDriving = false; this.idleT = 0;
    for (let i = 0; i < 220; i++) {
      this.spores.push({
        p: v3((rnd() - 0.5) * 34, rnd() * 26 - 2, (rnd() - 0.5) * 34),
        s: 0.02 + rnd() * 0.05, ph: rnd() * TAU, sp: 0.1 + rnd() * 0.5,
      });
    }
    this.age = 0;
  }

  _bindInput() {
    const c = this.canvas;
    let drag = false, panning = false, lx = 0, ly = 0, pinch = 0, pcx = 0, pcy = 0;

    // Orbit and zoom alone cannot get you onto one leaf — they only ever circle
    // the point the auto-framer chose, which is the middle of the plant. Panning
    // moves that point in the camera's own screen plane, scaled so a pixel drags
    // the same apparent distance however far out you are.
    const pan = (dx, dy) => {
      const cm = this.cam;
      const fwd = v3(); v3norm(fwd, v3sub(fwd, cm.target, cm.eye));
      const right = v3(); v3norm(right, v3cross3(right, fwd, v3(0, 1, 0)));
      const up2 = v3(); v3norm(up2, v3cross3(up2, right, fwd));
      const s = 2 * Math.tan(cm.fov / 2) * cm.dist / Math.max(1, this.renderer.H);
      if (cm.cx === undefined) { cm.cx = cm.target[0]; cm.cz = cm.target[2]; }
      cm.cx += (up2[0] * dy - right[0] * dx) * s;
      cm.tgtY += (up2[1] * dy - right[1] * dx) * s;
      cm.cz += (up2[2] * dy - right[2] * dx) * s;
      cm.idle = 0;
    };

    const down = (x, y, isPan) => {
      drag = true; panning = !!isPan; lx = x; ly = y;
      this.cam.idle = 0; this.cam.autoRot = false; this.takeOver();
    };
    const move = (x, y) => {
      if (!drag) return;
      const dx = x - lx, dy = y - ly;
      if (panning) pan(dx, dy);
      else {
        this.cam.az -= dx * 0.006;
        this.cam.el = clamp(this.cam.el + dy * 0.005, -0.5, 1.35);
      }
      lx = x; ly = y; this.cam.idle = 0;
    };
    const up = () => { drag = false; panning = false; };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      // right button or shift-drag pans; shift is there for trackpads
      down(e.clientX, e.clientY, e.button === 2 || e.button === 1 || e.shiftKey);
    });
    c.addEventListener('pointermove', e => move(e.clientX, e.clientY));
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.takeOver();
      // stop the idle drift too, exactly as pointerdown does — without this a
      // wheel-only zoom left autoRot on, which picked the faster damping
      this.cam.autoRot = false;
      this.cam.dist = clamp(this.cam.dist * (1 + Math.sign(e.deltaY) * 0.09), 3, 70);
      this.cam.idle = 0;
    }, { passive: false });
    const centre = (t) => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        [pcx, pcy] = centre(e.touches);
        drag = false;
        this.takeOver();
        this.cam.autoRot = false;
      }
    }, { passive: true });
    c.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.cam.dist = clamp(this.cam.dist * (pinch / Math.max(1, d)), 3, 70);
        pinch = d;
        // and two fingers moving together pan, so touch can reach a leaf too
        const [nx, ny] = centre(e.touches);
        pan(nx - pcx, ny - pcy);
        pcx = nx; pcy = ny;
        this.cam.idle = 0;
      }
    }, { passive: true });
    c.addEventListener('touchend', () => { pinch = 0; }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // THE DIRECTOR
  //
  // The plant has events now — a leaf unfurling, a flower opening, a fruit
  // swelling, a ripening wave crossing it. This picks which of those to be
  // looking at, holds the shot, and moves on. It hands over the instant the
  // viewer touches anything, and takes back over only if asked.
  // ---------------------------------------------------------------------------
  // A plant blooms once and ripens once. Measured on a Cathedral Fern, the
  // window in which petals are visibly opening is open for about 1.1s, and the
  // ripening front crosses in about 1.2s — each happening ONCE in a fifty-second
  // film. A shot holds for 10-12s, and the director only used to choose at shot
  // boundaries, so the chance of a re-pick even landing inside the bloom was
  // about one in twelve, before it then had to win a lottery against leaf,
  // apex and wide. That is why it "always skipped the blooming": not preference,
  // arithmetic. Weight tuning cannot fix an event shorter than one shot.
  //
  // So the rare events are no longer lottery entries. They are HEADLINES:
  //   - triggered early, on "this axis is about to bloom" rather than "is
  //     blooming", so the camera is already there when it happens;
  //   - allowed to interrupt a running shot rather than wait it out;
  //   - held past the end of the event, so you see the flower open and then rest
  //     on it, instead of cutting the instant it finishes;
  //   - fired once per axis, so the film moves on instead of looping.
  // Leaf, apex and wide stay a lottery. They are the filler between events.
  headlineShot() {
    const P = this.plant;
    const seen = this._covered || (this._covered = new Set());
    const key = (ax, k) => k + ':' + P.axes.indexOf(ax);
    for (const ax of P.axes) {
      // fruit set through swelling and the ripening wave — one continuous arc
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern' && !seen.has(key(ax, 'fruit'))) {
        let r = 0;
        for (let i = 0; i < ax.fruit.n; i++) r += ax.fruit.ripe[i];
        if (r / ax.fruit.n < 0.98) {
          return { kind: 'fruit', ax, headline: true, dist: 3.4, el: 0.30, hold: 13000, minHold: 6000 };
        }
      }
      // petals exist but have not finished opening. Note this fires while dev is
      // still ~0, which is the point — arrive before the bloom, not during it.
      if (ax.floral && !ax.fruit && !seen.has(key(ax, 'flower'))) {
        const petals = ax.organs.filter(o => o.petal);
        if (petals.length) {
          const dev = petals.reduce((a, o) => a + (o.dev || 0), 0) / petals.length;
          if (dev < 0.97) {
            // minHold is short because the shot that preempts this one is almost
            // always the fruit on this same axis — the flower becomes the fruit,
            // so it is the same point in space and the cut reads as a push-in
            // rather than a jump. Holding longer here only loses the swelling.
            return { kind: 'flower', ax, headline: true, dist: 4.2, el: 0.34, hold: 10000, minHold: 3000 };
          }
        }
      }
    }
    return null;
  }

  _markCovered(sh) {
    if (!sh || !sh.headline) return;
    const seen = this._covered || (this._covered = new Set());
    seen.add(sh.kind + ':' + this.plant.axes.indexOf(sh.ax));
  }

  pickShot() {
    const P = this.plant;
    const head = this.headlineShot();
    if (head) { this._markCovered(head); return head; }
    const prev = this.shot && this.shot.kind;
    const cand = [];
    let liveTip = null;
    for (const ax of P.axes) if (ax.alive && ax.meristem && (!liveTip || ax.tipPos()[1] > liveTip.tipPos()[1])) liveTip = ax;

    for (const ax of P.axes) {
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
        let r = 0;
        for (let i = 0; i < ax.fruit.n; i++) r += ax.fruit.ripe[i];
        r /= ax.fruit.n;
        // a ripening front crossing a fruit is the best thing on screen
        const w = (r > 0.02 && r < 0.97) ? 9 : (ax.fruit.phase === 'grow' ? 6 : 1.2);
        cand.push({ kind: 'fruit', ax, w, dist: 3.4, el: 0.30, hold: 11000 });
      }
      if (ax.floral && !ax.fruit) {
        const open = ax.organs.filter(o => o.petal && (o.dev || 0) > 0.05 && (o.dev || 0) < 0.95).length;
        if (open) cand.push({ kind: 'flower', ax, w: 7, dist: 4.2, el: 0.34, hold: 10000 });
      }
    }
    for (const ax of P.axes) {
      for (const o of ax.organs) {
        if (o.floral || !o.leaf) continue;
        const d = o.dev || 0;
        if (d > 0.14 && d < 0.62) { cand.push({ kind: 'organ', ax, org: o, w: 3.2, dist: 2.6, el: 0.26, hold: 8500 }); break; }
      }
    }
    if (liveTip) cand.push({ kind: 'apex', ax: liveTip, w: P.organCount() < 5 ? 12 : 2.6, hold: 9500 });
    cand.push({ kind: 'wide', w: P.organCount() < 3 ? 0.2 : 5, hold: 12000 });

    let tot = 0;
    for (const c of cand) { if (c.kind === prev) c.w *= 0.22; tot += c.w; }
    let r = this._rnd() * tot;
    for (const c of cand) { r -= c.w; if (r <= 0) return c; }
    return cand[cand.length - 1];
  }

  _rnd() {
    this._rs = ((this._rs || 12345) * 1103515245 + 12345) & 0x7fffffff;
    return this._rs / 0x7fffffff;
  }

  directorStep(dtms) {
    if (this.userDriving) {
      this.subject = null;
      // yielding to touch has to work in both directions: after a while with
      // no input, the film resumes on its own
      this.idleT = (this.idleT || 0) + dtms;
      if (this.idleT > this.resumeAfter) this.giveBack();
      return;
    }
    this.idleT = 0;
    this.shotT = (this.shotT || 0) + dtms;
    // Preemption. Waiting out a 10s hold is exactly how a 1.1s bloom got missed,
    // so a pending headline cuts the current shot short. Filler yields at once; a
    // headline yields only after its own minHold, so each event still gets its
    // moment rather than being clipped by the next one.
    let cut = !this.shot || this.shotT > (this.shot.hold || 10000);
    if (!cut) {
      const head = this.headlineShot();
      if (head && !(this.shot.headline && this.shot.ax === head.ax && this.shot.kind === head.kind)) {
        cut = !this.shot.headline || this.shotT > (this.shot.minHold || 0);
      }
    }
    if (cut) {
      this.shot = this.pickShot();
      this.shotT = 0;
    }
    const sh = this.shot;
    if (sh.kind === 'apex' && (!sh.ax.alive || !sh.ax.meristem)) { this.shot = null; return; }
    this.focus = sh.kind === 'apex' ? 'apex' : null;
    this.subject = (sh.kind === 'fruit' || sh.kind === 'flower' || sh.kind === 'organ') ? sh : null;
  }

  // The blade worth looking at down the microscope. A leaf that is still
  // canalising wins outright — that is the one where the needles are visibly
  // falling into line — and the biggest opened blade is the fallback, where
  // they are already in line and only the traffic still moves.
  watchOrgan() {
    let live = null, big = null, bigA = 0;
    for (const ax of this.plant.axes) {
      for (const o of ax.organs) {
        const L = o.leaf;
        if (o.floral || !L || !L.margin || !L.margin.mature) continue;
        if ((o.dev || 0) < 0.35 || o.len < 0.05) continue;
        if (!L.mature) { if (!live || o.len > live.org.len) live = { ax, org: o }; }
        else if (o.len * (o.dev || 0) > bigA) { bigA = o.len * (o.dev || 0); big = { ax, org: o }; }
      }
    }
    return live || big;
  }

  // ---------------------------------------------------------------------
  // Watching a blade canalise.
  //
  // The library canalises a blade in about 900 steps at 60 steps a frame —
  // fifteen frames, a quarter of a second — and then the leaf is frozen for
  // the rest of its life. So there is essentially never a leaf on the plant
  // caught in the act, and the one thing worth seeing is over before the
  // camera arrives.
  //
  // A leaf is reproducible from `(prm, opts, seed)`: same lattice, same
  // sources, same vein network segment for segment. So the close-up grows
  // this leaf AGAIN, slowly, in place. It is not a recording and not an
  // approximation of one — it is the identical computation that produced the
  // blade being pointed at, run at a rate an eye can follow, and it ends on
  // exactly the vasculature that blade already has. `test/lamina.mjs` checks
  // that the replay lands on the original.
  // ---------------------------------------------------------------------
  watchStep(dtms) {
    if (this.focus !== 'leaf') { this._watch = null; this._replay = null; return; }
    // Latch the blade being inspected rather than re-picking it every frame:
    // the pick would change under the viewer as leaves open and the camera
    // would cut to a different one mid-shot.
    const w = this._watch;
    if (!w || !w.org.leaf || w.ax.organs.indexOf(w.org) < 0) {
      this._watch = this.watchOrgan();
      this._replay = null;
    }
    if (!this._watch) return;
    const L = this._watch.org.leaf;
    if (!this._replay || this._replay.of !== L) {
      this._replay = { of: L, leaf: new Leaf(this.prm, L.o, L.seed) };
    }
    const R = this._replay.leaf;
    if (R.mature) return;
    // The outline is not the point and the viewer can already see it on the
    // blade in front of them, so run the margin phase at full speed and only
    // slow down for the part worth watching. Without this the close-up opens
    // on eight seconds of empty leaf while the margin patterns.
    if (!R.built) { for (let k = 0; k < 400 && !R.built && !R.mature; k++) R.step(1); return; }
    // ~900 steps of canalisation at this rate is about twelve seconds. The
    // time slider scales it like everything else, and at zero the replay stops
    // with the plant rather than running on under a paused specimen.
    if (this.speedMul <= 0) return;
    const n = clamp(Math.round(dtms * 0.075 * this.speedMul), 1, 12);
    for (let k = 0; k < n && !R.mature; k++) R.step(1);
    if (R.mature) R.veinDistanceField(30);    // so the finished blade tints
  }

  // Go and look at something, and mean it.
  //
  // The close-up buttons hand the camera to the viewer before switching mode,
  // and `userDriving` deliberately locks the auto-framer out — that is what
  // stopped the wheel fighting the director. But it also means asking to go
  // into the cells never actually took the camera there: the mechanism faded
  // up only if you then scrolled in far enough by hand, which nobody does.
  //
  // So a focus change buys a short window in which the framer may still fly,
  // and any touch of the camera spends it immediately. Ask to be somewhere and
  // you are taken there; touch the controls and it lets go for good.
  enterFocus(f) {
    this.focus = f;
    this.focusFly = f ? 2600 : 0;
  }

  takeOver() {
    this.idleT = 0;
    this.focusFly = 0;
    if (this.userDriving) return;
    this.userDriving = true;
    this.subject = null;
    if (this.onHandover) this.onHandover();
  }
  giveBack() {
    this.userDriving = false;
    this.focus = null; this.focusFly = 0;
    this.shot = null; this.shotT = 0;
    this.cam.autoRot = true;
  }

  // --------------------------------------------------------------------------
  step(dtms) {
    // step count follows real time, so growth looks the same on a slow device
    this._acc += this.speedMul * dtms / 8;
    const steps = clamp(Math.floor(this._acc), 0, 6);
    this._acc -= steps;
    for (let i = 0; i < steps; i++) this.plant.step(1);
    this.age += steps;
    this.t += dtms;

    this.directorStep(dtms);

    this.watchStep(dtms);

    // camera: frame whatever the specimen has actually become
    const c = this.cam;
    c.idle += dtms;
    // Resuming the drift is the film's business, and giveBack() owns it. Flipping
    // it back on after 6s while the viewer was still driving also switched the
    // framing damping from 0.035 to 0.10, so a wheel zoom was dragged back three
    // times faster than a drag was.
    if (c.idle > 6000 && !this.userDriving) c.autoRot = true;
    if (c.autoRot) c.az += dtms * 0.000042;
    // The raw bounding box jumps every time an organ appears. Smooth it first,
    // then smooth the camera against it — two stages of damping is the
    // difference between a camera that drifts and one that twitches.
    const raw = this.plant.bounds();
    const bs = this.bbS || (this.bbS = { ...raw });
    // damping expressed as a time constant, so a slow device and a fast one
    // settle at the same rate rather than the same number of frames
    const damp = (rate) => 1 - Math.exp(-rate * dtms / 16.67);
    const kb = damp(0.075);
    bs.cx = lerp(bs.cx, raw.cx, kb); bs.cy = lerp(bs.cy, raw.cy, kb);
    bs.cz = lerp(bs.cz, raw.cz, kb);
    bs.w = lerp(bs.w, raw.w, kb); bs.h = lerp(bs.h, raw.h, kb);
    const bb = bs;
    // Fit the specimen into the clear part of the frame — the panel owns the
    // bottom, so the subject is fitted to 66% of the height and biased upward.
    const aspect = Math.max(0.45, this.renderer.W / this.renderer.H);
    // Fit the specimen's bounding sphere. Horizontal FOV is the wider of the
    // two on a landscape canvas, so the vertical one is what binds.
    const halfV = c.fov / 2;
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    const hh = bb.h / 2, hw = bb.w / 2;
    // fit height into 66% of the frame (the panel owns the bottom) and width
    // into 86%, then step back far enough to clear the near side of the plant
    const distV = (hh / 0.66) / Math.tan(halfV);
    const distH = (hw / 0.86) / Math.tan(halfH);
    let want = clamp(Math.max(distV, distH) + hw * 0.9 + 1.2, 5, 120);
    let aimY = bb.cy - hh * 0.14, aimX = bb.cx, aimZ = bb.cz;
    const sub = this.subject;
    if (sub) {
      let p = null, scale = 1;
      if (sub.kind === 'fruit') { p = sub.ax.tipPos(); scale = this.sp.fruitScale * 1.6; }
      else if (sub.kind === 'flower') {
        p = sub.ax.tipPos();
        // Frame the FLOWER, not the stalk carrying it. This was ax.length * 0.6 —
        // the length of the whole shoot — so a flower on a tall axis was framed
        // from 40 units away (the clamp ceiling) and read as a speck. Measured
        // 39.77 on a seed whose flowering axis was ~15 units long.
        // How far the petal tips actually reach from the axis, using maxLen so
        // the framing does not drift outward as the petals grow into it. Measured
        // ~1.52 on a Cathedral Fern; the 1.2 puts the whole flower inside the
        // frame with a little air rather than cropping the outermost petals.
        let reach = 0;
        for (const o of sub.ax.organs) {
          if (!o.floral) continue;
          const f = o.frame.o, t = sub.ax.tipPos();
          const base = Math.hypot(f[0] - t[0], f[1] - t[1], f[2] - t[2]);
          reach = Math.max(reach, base + (o.maxLen || o.len || 0));
        }
        scale = Math.max(0.5, reach * 1.2);
      }
      else if (sub.kind === 'organ' && sub.org) { p = sub.org.frame.o; scale = Math.max(0.6, sub.org.len * 0.7); }
      if (p) {
        aimX = p[0]; aimY = p[1]; aimZ = p[2];
        want = clamp(scale * sub.dist, 1.6, 40);
        c.el = lerp(c.el, sub.el, damp(0.03));
      }
    }
    if (this.focus === 'apex') {
      // sit right off the growing point, close enough that single cells resolve
      let best = null;
      for (const ax of this.plant.axes) if (ax.alive && (!best || ax.tipPos()[1] > best.tipPos()[1])) best = ax;
      if (!best) best = this.plant.main;
      const tp = best.tipPos();
      const ms = Math.max(0.35, best.radii[best.radii.length - 1] * 5.5);
      want = ms * 5.6;
      aimX = tp[0]; aimY = tp[1] + ms * 0.22; aimZ = tp[2];
      // look down onto the dome — the spiral is only legible from above
      c.el = lerp(c.el, 0.78, damp(0.05));
    }
    if (this.focus === 'leaf') {
      // Sit close enough that individual cells resolve. The detail ramp in
      // buildScene fades the mechanism up on apparent blade size, so this is
      // the same knob seen from the other end: put the blade at roughly the
      // width of the frame and the needles come up on their own.
      const w = this._watch;
      if (w) {
        const bl = w.org.len * 0.80;
        const f = w.org.frame.o, fx = w.org.frame.x;
        const pet = w.org.len * 0.34 + w.org.radius * 1.8;
        // aim at the middle of the blade, not at where it joins the stalk
        const mid = 0.45 * bl;
        aimX = f[0] + fx[0] * (pet + mid);
        aimY = f[1] + fx[1] * (pet + mid);
        aimZ = f[2] + fx[2] * (pet + mid);
        want = clamp(bl * 1.05, 0.5, 40);
        // Face the blade. The apex close-up can just look down from a fixed
        // elevation because a meristem is always more or less horizontal, but
        // a leaf hangs at whatever angle its tilt, droop and roll put it, and
        // a blade seen edge-on projects six hundred cells onto a single line —
        // which is exactly what the first captures showed, and it reads as a
        // bare stalk with a row of lights on it rather than as a sheet of
        // tissue. So steer to the organ's own normal instead of a constant.
        const n = w.org.frame.y;
        const sgn = n[1] < 0 ? -1 : 1;         // approach from above, not below
        const nx = n[0] * sgn, ny = clamp(n[1] * sgn, -0.95, 0.95), nz = n[2] * sgn;
        if (!this.userDriving || this.focusFly > 0) {
          let d = Math.atan2(nx, nz) - c.az;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          c.az += d * damp(0.045);
          c.el = lerp(c.el, Math.asin(ny), damp(0.045));
        }
      }
    }
    // While the viewer is driving, the auto-framer has to keep its hands off the
    // camera. This block used to run unconditionally: a wheel event set `dist`,
    // and the very next frame lerped it straight back to the fitted distance, so
    // zooming in visibly sprang back out. Orbit escaped only because `az`/`el`
    // are not fitted here — which is exactly how the bug presented, "zoom fights
    // me, orbit is fine". `userDriving` gated the director's choice of shot but
    // never the framing.
    const k = damp(c.autoRot ? 0.10 : 0.035);
    if (c.cx === undefined) { c.cx = aimX; c.cz = aimZ; }
    if (this.focusFly > 0) this.focusFly -= dtms;
    if (!this.userDriving || this.focusFly > 0) {
      c.dist = lerp(c.dist, want, k);
      c.tgtY = lerp(c.tgtY, aimY, k);
      c.cx = lerp(c.cx, aimX, k);
      c.cz = lerp(c.cz, aimZ, k);
    }
    v3set(c.target, c.cx, c.tgtY, c.cz);
    // fog begins where the subject does
    c.fogNear = Math.max(0, c.dist - Math.max(hh, hw) * 1.1);
    // only things well off the plane the camera is looking at go soft
    c.dofRange = Math.max(2.0, Math.max(hh, hw) * 0.62);
    // Under the microscope that range is the whole specimen, so nothing ever
    // defocuses and the blade behind the one being looked at is drawn just as
    // sharply — it reads as part of the same surface and swamps the tissue.
    // Shallow depth of field is what a microscope actually has.
    if (this.focus === 'leaf') c.dofRange = Math.max(0.4, c.dist * 0.22);
    const ce = Math.cos(c.el), se = Math.sin(c.el);
    v3set(c.eye,
      c.target[0] + Math.sin(c.az) * ce * c.dist,
      c.target[1] + se * c.dist,
      c.target[2] + Math.cos(c.az) * ce * c.dist);

    for (const s of this.spores) {
      s.p[1] += s.sp * 0.004 * dtms * 0.06;
      s.p[0] += Math.sin(this.t * 0.0004 + s.ph) * 0.004;
      if (s.p[1] > 26) s.p[1] = -2;
    }
  }

  buildScene() {
    const B = this.B, pal = this.pal, P = this.plant;
    B.reset();
    // spend the vertex budget where there is something to see: a specimen with
    // sixty fronds gets a coarser surface than one with six
    // vein ribbons face the camera and never get thinner than a pixel or so
    const px = 2 * Math.tan(this.cam.fov / 2) / Math.max(1, this.renderer.H);
    setView(this.cam.eye, this.cam.dist * px * 1.5);
    this.detail = 0;
    // when the camera has gone in to look at a growing tip, anything between it
    // and that tip is in the way — drop it rather than let a leaf fill the frame
    let cullFrom = null, cullR = 0, cullRad = 0, cullKeep = null, cullKeepOrg = null;
    const sb = this.subject;
    if (sb && (sb.kind === 'fruit' || sb.kind === 'flower')) {
      cullFrom = sb.ax.tipPos();
      cullRad = this.sp.fruitScale * 2.2;
      if (sb.kind === 'flower') {
        // a flower is much wider than a fruit — size the clearance to the petals
        let reach = 0;
        for (const o of sb.ax.organs) {
          if (!o.floral) continue;
          const f = o.frame.o;
          reach = Math.max(reach, Math.hypot(f[0] - cullFrom[0], f[1] - cullFrom[1],
            f[2] - cullFrom[2]) + (o.maxLen || o.len || 0));
        }
        cullRad = Math.max(cullRad, reach * 1.25);
      }
      cullKeep = sb.ax;      // never cull the flower we came to look at
    } else if (this.focus === 'apex') {
      let best = null;
      for (const ax of P.axes) if (ax.alive && (!best || ax.tipPos()[1] > best.tipPos()[1])) best = ax;
      if (best) {
        cullFrom = best.tipPos();
        cullRad = Math.max(0.35, best.radii[best.radii.length - 1] * 5.5) * 1.15;
      }
    } else if (this.focus === 'leaf' && this._watch) {
      const org = this._watch.org;
      const pet = org.len * 0.34 + org.radius * 1.8, bl = org.len * 0.80;
      const d = pet + bl * 0.45;
      cullFrom = [org.frame.o[0] + org.frame.x[0] * d,
        org.frame.o[1] + org.frame.x[1] * d,
        org.frame.o[2] + org.frame.x[2] * d];
      cullRad = bl * 0.85;
      cullKeepOrg = org;      // never clear away the leaf we came to look at
    }
    // Clear a cylinder along the line of sight rather than a sphere around the
    // eye. The old test compared each organ's BASE distance to the subject
    // distance, which both stripped lateral scenery that was never in the way and
    // — worse — kept long leaves whose base sits behind the subject while the
    // blade reaches right across the front of it. That is what was burying the
    // flower shot.
    let sdx = 0, sdy = 0, sdz = 0;
    if (cullFrom) {
      sdx = cullFrom[0] - this.cam.eye[0];
      sdy = cullFrom[1] - this.cam.eye[1];
      sdz = cullFrom[2] - this.cam.eye[2];
      const sl = Math.hypot(sdx, sdy, sdz) || 1;
      sdx /= sl; sdy /= sl; sdz /= sl;
      cullR = sl - cullRad;      // stop clearing just short of the subject
    }
    const nOrg = P.organCount();
    const fen = (this.sp.leafOpts.fenestrate || 0) > 0;
    this.bladeMU = nOrg > 42 ? (fen ? 17 : 13) : nOrg > 24 ? 18 : 22;
    this.bladeMV = nOrg > 42 ? (fen ? 9 : 6) : nOrg > 24 ? 8 : 10;
    for (const ax of P.axes) {
      const nseg = ax.pts.length;
      if (nseg > 1) {
        tube(B, ax.pts, ax.radii, 7, (t) => ({
          c: [lerp(pal.stem0[0], pal.stem1[0], t), lerp(pal.stem0[1], pal.stem1[1], t), lerp(pal.stem0[2], pal.stem1[2], t)],
          e: t > 0.93 && ax.alive ? (t - 0.93) * 5.0 * pal.glow : 0,
        }));
      }
      for (const org of ax.organs) {
        if (org.len < 0.02) continue;
        if (cullFrom && org !== cullKeepOrg && !(ax === cullKeep && org.floral)) {
          const ox = org.frame.o[0] - this.cam.eye[0];
          const oy = org.frame.o[1] - this.cam.eye[1];
          const oz = org.frame.o[2] - this.cam.eye[2];
          const t = ox * sdx + oy * sdy + oz * sdz;          // along the sight line
          if (t > 0 && t < cullR) {
            const px2 = ox - sdx * t, py2 = oy - sdy * t, pz2 = oz - sdz * t;
            // how far off the sight line it sits, allowing for its own reach
            if (Math.hypot(px2, py2, pz2) - (org.len || 0) < cullRad) continue;
          }
        }
        // The blade under the microscope is drawn from its own replay, so the
        // vasculature arrives when the canalisation being watched actually
        // produces it rather than being there from the start as a spoiler.
        // Same outline either way — the replay reproduces this leaf exactly.
        const rp = this._replay;
        const L = (rp && this._watch && org === this._watch.org && rp.of === org.leaf
          && rp.leaf.built) ? rp.leaf : org.leaf;
        // petiole
        const a = org.frame.o;
        // a longer stalk carries the blade clear of the shoot and its neighbours
        const pet = org.len * 0.34 + org.radius * 1.8;
        const b = v3(a[0] + org.frame.x[0] * pet,
          a[1] + org.frame.x[1] * pet,
          a[2] + org.frame.x[2] * pet);
        tube(B, [a, b], [org.radius * 0.5, org.radius * 0.30], 5, () => ({ c: pal.stem1, e: 0 }));
        if (!L || !L.margin || !L.margin.mature) continue;
        const fr = { o: b, x: org.frame.x, y: org.frame.y, z: org.frame.z };
        // blades unfurl rather than appearing at full size
        // one development parameter: the blade lengthens, the wave of
        // maturation runs out along it, and the furled tip uncoils behind it
        const dev = clamp((org.dev || 0) * 1.06 - 0.03, 0, 1);
        const bl = org.len * 0.80;
        if (bl < 0.02) continue;
        const bp = org.petal ? this.petalPal
          : org.floral ? this.innerPals[clamp(
            Math.round(((org.q - this.sp.petalQ) / Math.max(1e-3, 1 - this.sp.petalQ)) * (INNER_STEPS - 1)),
            0, INNER_STEPS - 1)]
            : pal;
        const curl = -bl * (org.petal ? 0.05 : 0.16), ripple = bl * 0.014;
        // The blade mesh is deliberately far coarser than the tissue — the
        // veins are meant to carry the detail, and at arm's length they do.
        // Under the microscope they cannot: 22x10 quads across a blade that
        // fills the frame is a visibly faceted slab, and cells scattered over
        // it read as blobs on cardboard. Refine just the one blade being
        // looked at, up to the resolution of the tissue actually simulated.
        const dEyeB = Math.hypot(fr.o[0] - this.cam.eye[0], fr.o[1] - this.cam.eye[1],
          fr.o[2] - this.cam.eye[2]);
        const detL = smoothstep(0.42, 0.95, bl / Math.max(0.01, dEyeB));
        const mu = Math.round(lerp(this.bladeMU, L.o.nu, detL));
        const mv = Math.round(lerp(this.bladeMV, L.o.nv, detL));
        blade(B, L, fr, bl, bl, bp, curl, ripple, bp.glow, mu, mv, dev,
          1 - 0.82 * detL);
        // Same idiom as the growing tip: there is no mode to find, the tissue
        // simply starts showing what it is doing once you are close enough for
        // a cell to be more than a pixel. The ramp is on apparent blade size —
        // the existing 'organ' beauty shot sits at about 0.44 and must stay
        // clear of it, so nothing begins until the blade is filling the frame.
        if (detL > 0.004) {
          if (detL > this.detail) this.detail = detL;
          laminaCells(B, L, fr, bl, bl, pal, curl, ripple, this.t, detL, dev);
        }
      }
      // the fruit, if this shoot got that far
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
        const n2 = ax.pts.length;
        const tip = ax.pts[n2 - 1];
        const fs = this.sp.fruitScale * (ax.gen === 0 ? 1 : 0.72);
        fruitShell(B, ax.fruit, tip, fs, pal);
      }

      // the growing point itself
      if (this.showMeristem && ax.alive && ax.meristem) {
        const n = ax.pts.length;
        const tip = ax.pts[n - 1];
        const prev = ax.pts[Math.max(0, n - 2)];
        const dir = v3(); v3norm(dir, v3sub(dir, tip, prev));
        if (!isFinite(dir[0]) || v3len(dir) < 0.5) v3set(dir, 0, 1, 0);
        let refv = v3(0, 0, 1);
        if (Math.abs(dir[2]) > 0.9) refv = v3(1, 0, 0);
        const e1 = v3(); v3norm(e1, v3cross3(e1, refv, dir));
        const e2 = v3(); v3norm(e2, v3cross3(e2, dir, e1));
        const mScale = Math.max(0.35, ax.radii[n - 1] * 5.5);
        // the mechanism fades up as you approach — no mode to find, you just
        // come closer and the cells start showing what they are doing
        const dEye = Math.hypot(this.cam.eye[0] - tip[0], this.cam.eye[1] - tip[1], this.cam.eye[2] - tip[2]);
        const det = smoothstep(0.030, 0.105, mScale / Math.max(0.01, dEye));
        if (det > this.detail) this.detail = det;
        meristemDome(B, ax.meristem, { o: tip, x: dir, y: e2, z: e1 },
          mScale, pal, this.t, det);
      }
    }
    for (const s of this.spores) B.point(s.p, pal.spore, s.s * 0.9);
    this.renderer.upload(B);
  }

  render() {
    // ease the bloom off as the cells resolve, so detail is not washed away
    const p = this.pal;
    const keep = p._bloom === undefined ? (p._bloom = p.bloom) : p._bloom;
    p.bloom = keep * (1 - 0.55 * this.detail);
    this.renderer.draw(this.cam, this.pal, this.t);
    p.bloom = keep;
  }
}

// tiny local cross to avoid an import cycle in the hot path
function v3cross3(o, a, b) {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  o[0] = x; o[1] = y; o[2] = z; return o;
}
