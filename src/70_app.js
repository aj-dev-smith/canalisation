// ---------------------------------------------------------------------------
// The exhibit: camera, species, scene assembly, and the loop.
// ---------------------------------------------------------------------------

import { DEFAULT_PRM } from './10_auxin.js';
import { MERISTEM_DEFAULTS } from './20_meristem.js';
import { Leaf, LEAF_DEFAULTS } from './30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from './40_plant.js';
import { windField, WIND_DEFAULTS } from './37_wind.js';
import { fallFrame, drawnBladeLen, petioleOf, BLADE_DRAWN } from './39_fall.js';
import {
  Buffers, tube, blade, laminaCells, meristemDome, fruitShell, fruitCells,
  stemRibbon, setView, senesceTint,
} from './50_geom.js';
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
      elongation: 0.0044, organLen: 4.3, organTilt: 0.86,
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
      elongation: 0.0036, organLen: 3.2, organTilt: 0.66,
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
      elongation: 0.0050, organLen: 5.0, organTilt: 1.02,
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
      elongation: 0.0032, organLen: 3.0, organTilt: 0.5,
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
      elongation: 0.0022, internode: 0.0032, organLen: 2.6, organTilt: 0.62, maxOrgans: 34, branching: 0.92, maxAxes: 9, maxGen: 3,
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
  // A TREE, and the first thing here that is not a herb. Everything that makes
  // it one is chemistry the other eight already had turned to a different
  // setting, plus two mechanisms this species is the first to switch on.
  //
  //   agoGain    the antigravitropic offset. Its laterals hold a gravitropic set
  //              point instead of being pulled vertical, so the crown is a spire
  //              rather than the vase every other species would make with this
  //              many branches. The angle itself is not stated anywhere — it is
  //              where two statocyte fluxes cancel, and auxin sizes one of them.
  //   apicalControl  0.80, so a branch apex extends at (1-L)/L = 0.25 of the
  //              leader's. That is the taper, and lower branches are longer only
  //              because they escaped earlier and have been growing longer.
  //   branching 0.94 with budRelease 60  weak apical DOMINANCE — buds escape
  //              close under the leader — against strong apical CONTROL, which
  //              is the 2x2 the forestry literature insists on and is the
  //              conifer corner of it.
  //   eModulus 1.2 GPa  a conifer is woody and the engine's default is
  //              herbaceous. At 60 MPa this specimen folds up; see test/plagio.mjs.
  //   aspectFloor 0.04  lets the margin's own slenderness through. NOTE the
  //              floor does NOT bite: this margin grows aspect 0.193 on its own
  //              and the floor is five times below it, so the blade is a narrow
  //              paddle rather than the needle this comment used to claim. The
  //              VENATION is a needle's — one dominant bundle — and that is what
  //              `test/venation.mjs` measured. The SILHOUETTE is not.
  //   marginBias.ay 0.16  A PURE WIDTH KNOB, and a needle was built on it,
  //              measured, drawn, and DELIBERATELY NOT SHIPPED. Over 0.16 ->
  //              0.003 the margin's length is flat (x0.66 to x1.07, no trend)
  //              while its half-width falls 17x. At 0.008 it grows aspect
  //              0.040-0.058 over three seeds — inside a Norway spruce's
  //              0.02-0.05 — holding n50 = 1, and rendered at arm's length it is
  //              unmistakably a needle. So the knob works and the biology is
  //              right. The reason it is not here is in `docs/JOURNAL.md`
  //              (2026-07-31) and it is worth reading before turning it down:
  //
  //              A NEEDLE CANALISES ONE STRAND, AND THAT IS THE WHOLE PROBLEM.
  //              A Cathedral Fern leaf canalises 373-470 veins with the traffic
  //              spread over 3-7 of them (top strand 16-29%). A needle canalises
  //              69-80 veins with ONE carrying 77-99%. Botanically that is
  //              exactly right for *Picea* and `test/venation.mjs` verified it as
  //              a success — but the reticulate network is the only channel
  //              through which this engine is visible, and a needle has none of
  //              it. Measured through the same harness at each specimen's own
  //              framing, a fern draws 190 vein ribbons per organ and this
  //              species 78; the needle takes it to ~48. The blade got correct
  //              and the piece got quieter.
  //
  //              So this is not a defect waiting on a better parameter. It is a
  //              choice between botanical fidelity to a genus nobody promised —
  //              THIS IS XENOBOTANY, the species is Ashfall Spire and not Norway
  //              Spruce — and legibility of the mechanism the whole project
  //              exists to show. The wide blade shows more chemistry, so it
  //              stays. `test/crown.mjs` has the numbers for both.
  //
  // WHAT SETS HOW FULL THE CROWN IS, and it is three numbers rather than one.
  // Shipped, this specimen was a Charlie Brown tree — a bare pole with tufts —
  // and the diagnosis was that all three were fighting each other:
  //
  //   budTake 1.0  the hardcoded coin flip that used to discard two escaped
  //              buds in three. At 1.0 it is GONE for this species, so branch
  //              count is decided entirely by `exp(-d/dominance) > branching`,
  //              which is chemistry, rather than by an unnamed constant. 29
  //              branches became 76, and `maxAxes` is not what stops it — the
  //              dominance falloff is, at 77 axes against a cap of 140.
  //   organBudget 2200  the budget is a POOL over the whole specimen, so
  //              raising `budTake` alone just divides 540 organs among three
  //              times as many branches and the tree gets SMALLER: measured
  //              46.1 -> 35.3 units tall, crown radius 7.9 -> 4.3. More
  //              branches has to be paid for.
  //   maxOrgans 80  left alone deliberately. It caps the LEADER, so the extra
  //              budget goes into branches and not into a taller trunk: height
  //              stays at 46.1 to the digit while crown fill goes 0.56 -> 0.70.
  //
  //   organLen 3.0  nearly free, and on PADDLES it saturates here: 3.0 and 3.8
  //              come out within 0.003 of each other. That is a statement about
  //              needles that already OVERLAP, and it does not generalise — on a
  //              needled blade the same knob never saturates, buying +0.051,
  //              +0.041, +0.033, +0.029 of fill per step at no extra organ. Which
  //              is worth knowing if the leaf is ever narrowed: `organLen` is the
  //              only lever that fills a needled crown, and it does so by making
  //              the needle proportionally WIDER on screen — half-width is aspect
  //              times length, so it spends the thinness one-for-one.
  //
  //   organTilt 0.92  left alone, and MEASURED rather than assumed. Spreading
  //              the blades further off the axis is the other free axis and it is
  //              nearly dead: 0.92 -> 1.40 moves fill by 0.009. Self-overlap is
  //              not what limits this crown.
  //
  //   minInternode 0.12  the one lever that adds foliage WITHOUT lengthening an
  //              axis, found while sweeping the needle and untried before that.
  //              Everything else that adds foliage grows the silhouette as fast
  //              as it fills it; packing organs along a shoot does not. Left at
  //              0.12 because the paddle does not need it, but it is the first
  //              thing to reach for if this crown ever has to get denser.
  //
  // ORGANS ARE THE WORST OF THE THREE LEVERS and that matters for ROADMAP 10b:
  // they SATURATE NEAR 1800 AND THEN REVERSE — fill 0.511 / 0.535 / 0.534 /
  // 0.508 across budgets 1200 / 1800 / 2400 / 3200, while crown radius goes
  // 7.0 -> 15.0. The extra organs grow the silhouette as fast as they fill it,
  // which is the same mechanism that falsified `maxGen: 2`. So this crown cannot
  // be bought denser with simulation cost, and 10b should not be sized as though
  // it could. `test/crown.mjs` is the instrument for all of this.
  //
  // It has no florigen, so it never flowers and never sets fruit — which is the
  // right biology for a gymnosperm and is a code path REMOVED rather than added.
  // It still finishes: an axis that runs out of growing point arrests, the plant
  // reports spent, and the senescence wave runs as it does for everything else.
  'Ashfall Spire': {
    prm: { T: 40, D: 6.0, mu: 0.30, rho: 0.60, b: 3.0 },
    mo: { R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 },
    sp: {
      elongation: 0.0034, organLen: 3.0, organTilt: 0.92, organRoll: 0.30,
      // BRANCHES ON BRANCHES, which this species did not have and a real one is
      // mostly made of. Fabrika, Scheer, Sedmak, Kurth & Schon 2019, BioResources
      // 14(1):908-921, measured branching order on a 10-year-old Norway spruce
      // stand over 12,000 growth units: first order 26.7%, second 52.8%, third
      // 16.6%, fourth 4.0%. **Roughly three quarters of a real juvenile spruce's
      // growth units are second order or higher**, and ours were 100% first,
      // because `maxGen` was 1 — BELOW the herbs' default of 2, on the one
      // species in the catalogue that most needed it. Kozlowski & Ward 1961
      // (Kozlowski & Pallardy, Physiology of Woody Plants 2nd ed., Table 3.2)
      // found QUATERNARY axes on 6-year-old red pine, white pine, white spruce
      // and black spruce, so this is closer to the floor than the ceiling.
      //
      // ⚠ IT IS RECORDED AS FALSIFIED IN JOURNAL AND TUNING AND THAT RESULT DOES
      // NOT HOLD. It was rejected on "fill 0.281 -> 0.268", and 0.281 is the
      // signature of the metric the very next paragraph of that entry retracts —
      // needle area over silhouette area, which "came back 0.28 for every variant
      // including ones that plainly differed". Every fill number the project
      // quotes today comes from the raster metric that replaced it and they live
      // at 0.51-0.77. `maxGen` was also never in `test/crown.mjs`'s sweepable knob
      // list, so the working instrument had never been pointed at it. Measured
      // properly: fill 0.772 -> 0.736 while crown radius goes 6.87 -> 11.53 and
      // blade area 673 -> 1702, at IDENTICAL height. Fill is normalised by the
      // crown's own outline precisely so a crown cannot score by getting bigger,
      // which is what makes it unable to see this change. See PR #35.
      //
      // THE TWO CAPS HAVE TO MOVE WITH IT AND THAT IS THE WHOLE TRICK. At
      // `maxGen: 2` alone the axis count slams into `maxAxes` and the organ pool
      // is spent low in the crown, so the leader's top third starves — measured,
      // and it is the same trap as raising `budTake` on its own. `maxAxes` 240
      // and `organBudget` 3000 are what hold height at 46.06 to the digit while
      // the crown fills. Pushed further (4200 organs, `maxOrgans` 110) the
      // triangle buffer saturates and drops 27-38k triangles.
      //
      // IT COSTS 2.5x THE ORGANS AND THAT IS SHIPPED KNOWINGLY, for the same
      // reason #32's crown was: the cost is linear in organs and belongs to
      // ROADMAP 10b and 11, not here. Do not buy it back by lowering `maxGen`.
      maxOrgans: 80, organBudget: 3000, maxAxes: 240, maxGen: 2,
      branching: 0.94, budRelease: 60, dominance: 6.0, budTake: 1.0,
      apicalControl: 0.80, agoGain: 1.0, agoK: 0.90,
      // a conifer's leader is straight, and wander and circumnutation are what
      // make the other eight lean
      wander: 0.06, nutation: 0.010, nutAmp: 0.05,
      florigenRate: 0,
      tipRadius: 0.055, minInternode: 0.12,
      stemOpts: { eModulus: 1.2e9 },
      leafOpts: { fenestrate: 0, aspectFloor: 0.04, nv: 5 },
      marginBias: { ay: 0.16, g1: 1.30, D: 0.70 },
    },
    // THE ONE PALETTE IN THE CATALOGUE WHOSE STEM FOUGHT ITS OWN FOLIAGE, and
    // the only species where that could matter. Shipped, this was `stem1
    // [0.34, 0.31, 0.27]` — a warm neutral, RED channel highest — under cool
    // green blades. Every other species keeps stem and blade in one hue family:
    // the fern's stem is teal under teal, Sun Coral's is orange under orange,
    // Ember's red under red. Ashfall Spire was the exception, and it is the one
    // specimen whose stems are a large share of the frame rather than a thin
    // support for the blades — 77 axes and a 2.9 m trunk against a herb's four
    // or five. So the defect every herb hid, the tree put in the middle of the
    // picture, and the branches read as brown dowels with pale fuzz stuck on.
    //
    // TWO THINGS WERE WRONG AND ONLY ONE OF THEM WAS HUE. Pulling the stem into
    // the foliage's family fixed the colour and left it reading as dark rods,
    // because `stem1` also sat well below the blades in VALUE. It is lightened
    // toward the foliage's midtone here, and that is what actually made the
    // branches stop looking foreign. Checked at the whole-tree and mid framings,
    // both pinned with `FIXDIST=` so the A/B is at one scale.
    //
    // AND IT WAS IN CATHEDRAL FERN'S HUE FAMILY, ONLY GREYER — which is the
    // worst of both, neither distinct nor vivid. The ground is warm now and the
    // tree is cold: the only cold-subject-on-warm-field pairing in the
    // catalogue, so this species reads as itself at a glance, and the name
    // finally means something. Nothing here is a shape; a background is
    // atmosphere, in the same category as the air in `37_wind.js`.
    pal: {
      blade0: [0.05, 0.11, 0.09], blade1: [0.17, 0.32, 0.26],
      veinTint: [0.06, 0.15, 0.13], vein: [0.62, 0.95, 0.80],
      stem0: [0.14, 0.19, 0.16], stem1: [0.38, 0.46, 0.41],
      cell0: [0.05, 0.11, 0.09], cell1: [0.72, 0.96, 0.82],
      bgTop: [0.026, 0.020, 0.017], bgBot: [0.005, 0.004, 0.003],
      bgGlow: [0.075, 0.042, 0.024], fog: [0.032, 0.027, 0.024], fogD: 0.070,
      key: [0.38, 0.80, 0.44], keyCol: [0.86, 0.90, 0.88],
      ambTop: [0.14, 0.18, 0.20], ambBot: [0.03, 0.038, 0.042],
      glow: 0.92, spore: [0.85, 0.82, 0.62],
      pin: [0.62, 0.90, 0.85], spark: [0.90, 0.98, 0.94],
      fruit0: [0.10, 0.14, 0.13], fruit1: [0.60, 0.70, 0.62],
      petal0: [0.22, 0.28, 0.28], petal1: [0.72, 0.84, 0.80], petalVein: [0.85, 0.92, 0.90],
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
      organLen: 3.6, organTilt: 1.16, maxOrgans: 30,
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
      minInternode: 0.015, organLen: 2.6, organTilt: 1.34,
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
      elongation: 0.0040, internode: 0.0052, organLen: 6.8, organTilt: 1.06, maxOrgans: 24, branching: 0.12, maxAxes: 2,
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
  dof: 0.80, laminaMul: 0.86,
  pin: [0.62, 0.88, 1.0], spark: [1.0, 0.98, 0.86],
  fruit0: [0.10, 0.22, 0.14], fruit1: [0.85, 0.30, 0.22],
  petal0: [0.30, 0.24, 0.42], petal1: [0.72, 0.55, 0.95], petalVein: [1.0, 0.85, 1.0],
};

// ---------------------------------------------------------------------------
// VIEWS: WHICH CHANNELS OF THE SIMULATION REACH THE SCREEN
//
// The renderer was decoupled from the simulation a long way before anything
// took advantage of it, and what that decoupling actually bought is visible
// here: the scene is assembled once, and a view decides which of the things the
// solver knows get drawn. None of these is a different renderer. They are the
// same `drawSpecimen` reading a different set of weights, which is deliberate —
// four copies of a two-hundred-line function would drift apart inside a week,
// and every real difference between these views IS a channel being turned up or
// down. Adding a fifth should be an entry in this table, not a new file.
//
// What each one is FOR:
//
//   natural   a plant standing in light. Opaque lamina, canalised vasculature
//             glowing inside it, occlusion and depth. What has always shipped.
//
//   cells     THE ORGANISM AS THE THING THAT WAS SIMULATED. No lamina at all:
//             every leaf, every growing point and every ovary wall drawn at the
//             resolution the solver runs at, ~67,000 cells on a Cathedral Fern,
//             each one holding the auxin it actually holds and aiming the
//             needle it actually aimed. The close-up treatment, applied to the
//             whole plant at once instead of to one blade under a microscope.
//
//   flux      THE ORGANISM AS ONE TRANSPORT NETWORK. Drop the cells and keep
//             what they are doing: the canalised veins and the PIN needles,
//             nothing else. Meristem convergence, leaf venation and the ovary's
//             ripening wave end up in one visual language, which is the actual
//             thesis — `stepAuxin` on three topologies — rendered directly
//             rather than argued for in a doc.
//
//   field     AN INSTRUMENT, NOT A PICTURE. Auxin concentration on one ramp,
//             the species palette discarded, bloom and grade and defocus off.
//             Nothing here is composed; it is for reading the field off the
//             screen, and it is the view in which two species look alike —
//             which is itself the point, since a species is a parameter set.
//
// `stemSolid: false` is the one flag that is not a weight, and it earns its
// place: `tube()` is opaque geometry that writes depth, so in a view whose
// proposition is that you can see THROUGH the organism the stem has to move to
// the additive pass or it punches a plant-shaped hole in its own tissue.
export const VIEWS = {
  natural: {
    label: 'natural',
    lamina: 1, veins: 1, cells: 0, needles: 0, fruitSolid: true,
    stem: 1, stemSolid: true, meristem: 1, spores: true,
  },
  cells: {
    label: 'cells',
    // the veins stay, faint. They are what the needles fall into, and without
    // them a field of needles reads as milling about rather than as canalising
    lamina: 0, veins: 0.45, cells: 1, needles: 0.85, fruitSolid: false,
    // THE STEM IS A GHOST, NOT A PANE OF GLASS. A ribbon at the stem's own
    // radius is its true silhouette, and at 0.55 it read as lit frosted glass
    // laid across the tissue behind it — the one thing in these views that
    // looked drawn rather than measured. The width is unchanged; only the
    // brightness moved.
    stem: 0.16, stemSolid: false, meristem: 1, spores: true,
    pal: { bloom: 0.22, exposure: 0.90, dof: 0.55, vignette: 0.5 },
  },
  flux: {
    label: 'flux',
    lamina: 0, veins: 1.35, cells: 0, needles: 1, fruitSolid: false,
    stem: 0.14, stemSolid: false, meristem: 1, spores: true,
    pal: { bloom: 0.30, exposure: 1.06, dof: 0.55, vignette: 0.5 },
  },
  field: {
    label: 'field',
    lamina: 0, veins: 0, cells: 1, needles: 0, fruitSolid: false,
    stem: 0.10, stemSolid: false, meristem: 1,
    // drifting spores are scenery, and on an instrument they are noise that
    // looks exactly like the signal — both are points of light
    spores: false,
    // ONE RAMP FOR EVERY SPECIES. `cell0`/`cell1` are the only palette entries
    // the cell channel reads, so overriding those two is the whole instrument.
    // Dark blue to white through the middle of the range: a sequential ramp
    // that does not pretend to a hue the concentration does not have.
    cellPal: { cell0: [0.03, 0.05, 0.16], cell1: [1.0, 0.98, 0.90] },
    // ripeness is a different field from concentration — see `fruitCells`
    ripeTint: 0,
    pal: { bloom: 0.0, exposure: 1.0, grain: 0.0, vignette: 0.0, dof: 0.0 },
  },
};

// ---------------------------------------------------------------------------
// A SHED BLADE LETTING GO
//
// Abscission separates the organ at the base of its stalk, so what leaves is the
// whole leaf — stalk and all — and what is left behind is bare stem.
//
// What happens after that used to live here, as four constants and a hash: a fixed
// terminal velocity, a fixed swing, a fixed pitch rate, and a per-organ phase so
// that a canopy did not come down in step. It was the one piece of motion in the
// piece that was authored rather than simulated, and next to everything around it
// that showed. It is now integrated in `39_fall.js` and stepped by the plant, and
// the only thing left here is reading the answer.
//
// The frame the blade is drawn on is its frame at the moment it let go, not its
// live one — the axis keeps swaying after the leaf has gone, and a shed organ
// reading its live frame is a leaf still hinged to a stem it has left.
const _shedFr = { o: v3(), x: v3(), y: v3(), z: v3(), t: 0 };
const _petC = v3();

// FLORAL FORMS — homeotic programs, as presets over the engine knobs that
// already exist. Every key here is a species option with a shipped default
// (whorlBands, receptacle, apexRenew, the floral compression triple...), so a
// form adds no mechanism: it is a different SETTING of the ABC machinery, the
// way a species is a different setting of the chemistry. All numbers were
// measured in flowers/ (the piece these programs were built for, PR #42) and
// its README carries the derivations. Two honesty notes: `columbine` here is
// the ARCHITECTURE only — the nectar spur and the bicolor sepals live in
// flowers.html's petal renderer, so under this renderer it reads as nested
// whorls carried out on pedicels; and `daisy` raises the organ budget, so a
// garden planted under it is a heavier garden.
const FLORAL_FORMS = {
  wild: null,
  // the full ABC plan: calyx, corolla, filament ring, pistil. Program B for
  // the three species whose q sits at zero and then jumps (measured sweep,
  // flowers/README) — under A a Cathedral Fern is S8 P1.
  abc: (name) => {
    const progB = name === 'Cathedral Fern' || name === 'Hoarfrost Thicket'
      || name === 'Sulphur Rosette';
    const P = progB
      ? { renew: 0.75, organs: 28, dome: 2.2, bands: [0.06, 0.24, 0.60] }
      : { renew: 0.55, organs: 26, dome: 3.0, bands: [0.08, 0.38, 0.65] };
    return {
      whorlBands: { sepal: P.bands[0], stamen: P.bands[1], carpel: P.bands[2],
        filament: 1.8, style: 1.5 },
      apexRenew: P.renew, floralOrgans: P.organs, floralDome: P.dome,
      floralElong: 0.08, floralStretch: 0.08, floralNode: 0.008,
      floralGrace: 960, petalGrade: 0.35,
    };
  },
  // the C-class mutant: stamen whorls founded as petals, determinacy lost —
  // 20-23 petals in nested graded whorls
  double: () => ({
    petalQ: 0.62, apexRenew: 0.7, floralOrgans: 34,
    floralElong: 0.08, floralStretch: 0.08, floralNode: 0.008,
    floralGrace: 960, petalGrade: 0.5,
  }),
  // the capitulum: florets ride the tip of a bolting peduncle, the head is
  // the disc the meristem actually was (receptacle un-collapses q)
  daisy: () => ({
    whorlBands: { sepal: 0.05, stamen: 0.18, carpel: 0.96, sepalLen: 0.16,
      petalLen: 0.45, stamenLen: 0.10, filament: 0.9, style: 1.5 },
    receptacle: 1.1, apexRenew: 0.88, floralOrgans: 90, floralDome: 4.0,
    floralElong: 0.35, floralStretch: 0.08, floralNode: 0.008,
    tropism: 0.002, floralGrace: 1600, organBudget: 400, maxOrgans: 140,
    petalGrade: 0, petalTilt: 1.5,
  }),
  // the spurred plan's architecture: petaloid outer whorl counts, whorls
  // nested on a small receptacle, each flower carried out on a pedicel
  columbine: () => ({
    whorlBands: { sepal: 0.02, stamen: 0.28, carpel: 0.75, sepalLen: 0.32,
      petalLen: 0.26, stamenLen: 0.13, filament: 1.5, style: 1.5 },
    receptacle: 0.25, apexRenew: 0.70, floralOrgans: 32, floralDome: 3.0,
    floralElong: 0.30, floralStretch: 0.08, floralNode: 0.008,
    tropism: 0.004, floralGrace: 1200, organBudget: 260, maxOrgans: 120,
    petalGrade: 0.15, petalTilt: 0.8,
  }),
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
    this.viewName = 'natural';
    this.speedMul = 1;
    this.showMeristem = true;
    this.detail = 0;
    this.focus = null;
    // who asked for the current focus — the film, or the person watching it.
    // `takeOver()` drops the film's, keeps the viewer's.
    this.focusByDirector = false;
    this.userDriving = false;
    this.subject = null;
    this.shot = null; this.shotT = 0;
    this.resumeAfter = 16000;
    this.idleT = 0;
    this.ringWidth = 0;
    // which floral program new specimens grow under; null = the species as
    // shipped. Scene-level on purpose: identity is read at each organ's
    // founding, so a form is a thing a specimen is GROWN under, not a switch
    // on a standing plant — and a garden planted while it is set joins it.
    this.floralForm = null;
    this.frame = 0;
    this.t = 0;
    this.fps = 60;
    this._acc = 0;
    this.spores = [];
    this.newSpecimen();
    this._bindInput();
  }

  // ONE SPECIMEN, AND EVERYTHING IT NEEDS TO BE DRAWN.
  //
  // All of this used to be assigned straight onto the App, because there was
  // only ever one of it. A second plant of a different species needs its own
  // species options and its own three palettes, so they are bundled instead —
  // and the hero is mirrored back onto the App below, which is what keeps
  // `app.plant`, `app.pal` and `app.sp` meaning exactly what they have always
  // meant to the HUD, the director, `80_main.js` and everything in `tools/`.
  //
  // `wind` is passed in rather than made here on purpose. THE WHOLE CLEARING IS
  // IN ONE AIR: the field is the piece's one weather and a garden of plants each
  // holding a private `windField()` would be a stand of plants in unrelated
  // breezes, which is precisely the defect ROADMAP 7 was opened to fix, arriving
  // again by a different route.
  makeSpecimen(name, seed, origin, wind) {
    const S = SPECIES[name] || SPECIES['Cathedral Fern'];
    const prm = { ...DEFAULT_PRM, ...S.prm };
    const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
    const sp = { ...SPECIES_DEFAULTS, ...S.sp };
    sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
    const pal = { ...BASE_PAL, ...S.pal };
    // The lamina is pulled down so the vasculature is the brightest thing in
    // the plant. A leaf should read as light held inside tissue.
    const m = pal.laminaMul;
    pal.blade0 = pal.blade0.map(v => v * m);
    pal.blade1 = pal.blade1.map(v => v * m);
    // petals share every rendering rule with leaves; only the colours differ
    const petalPal = { ...pal, blade0: pal.petal0.map(v => v * m),
      blade1: pal.petal1.map(v => v * m), vein: pal.petalVein,
      veinTint: pal.petal1.map(v => v * 0.25) };
    const innerPals = [];
    for (let i = 0; i < INNER_STEPS; i++) {
      const t = 0.30 + 0.62 * (i / (INNER_STEPS - 1));
      const mix = (c, d) => c.map((v, k) => lerp(v, d[k], t));
      innerPals.push({ ...petalPal,
        blade0: mix(petalPal.blade0, pal.vein.map(v => v * m * 0.55)),
        blade1: mix(petalPal.blade1, pal.vein.map(v => v * m)),
        glow: petalPal.glow * (1 + 0.5 * t) });
    }
    if (this.ringWidth) mo.rOut = mo.rCZ + this.ringWidth;
    if (this.windU !== undefined) sp.windOpts = { ...sp.windOpts, uRef: this.windU };
    const fr2 = mulberry32(seed ^ 0x51ed270b);
    sp.fruitOpts = {
      T: lerp(14, 34, fr2()), D: lerp(1.8, 4.2, fr2()),
      gExp: lerp(1.3, 2.6, fr2()), gAux: lerp(0.00035, 0.00075, fr2()),
      seedThresh: lerp(1.25, 1.7, fr2()),
    };
    // A STERILE CORNER lived in that draw for as long as it existed: ovule
    // patterning on the 642-cell shell fails outright when T/D < ~5.3 (the
    // spot wavelength misfits the shell — measured on a 6x5 T-D grid, 6 fruit
    // seeds each, the boundary is sharp: 12-20 ovules on one side, ZERO on
    // the other, nothing between). The ranges above include that corner, and
    // 5 of 40 specimen seeds landed in it — barren for life, no ripening, a
    // seed head with nothing in it. Clamping D after the draws keeps every
    // fertile specimen bit-identical (their values pass through) and the
    // PRNG call order untouched; only the sterile 12.5% change, from nothing
    // to a finer-lobed fruit. T/6 leaves ~15% margin over the measured cliff.
    sp.fruitOpts.D = Math.min(sp.fruitOpts.D, sp.fruitOpts.T / 6);
    if (origin) sp.origin = origin;
    if (wind) sp.wind = wind;
    // a specimen planted while the last act is held joins it held
    if (this.senesceHeld) sp.senesceHold = true;
    // the floral program, applied before the Plant is constructed: identity
    // is read off sp at each organ's founding, so a form is part of what a
    // specimen is grown under. null (and any harness's stand-in App, which
    // never sets it) is the shipped species exactly.
    if (this.floralForm && FLORAL_FORMS[this.floralForm])
      Object.assign(sp, FLORAL_FORMS[this.floralForm](name));
    return { name, seed, prm, mo, sp, pal, petalPal, innerPals,
      plant: new Plant(prm, mo, sp, seed) };
  }

  // everything drawn this frame: the subject, then whatever else came up
  specimens() { return this.garden.length ? [this.hero, ...this.garden] : [this.hero]; }

  // WHICH CHANNELS REACH THE SCREEN. Read through a method rather than off the
  // field so an unknown name degrades to the shipped view instead of throwing
  // in the middle of a frame — `app.viewName = 'cell'` from a console is a
  // typo, not a reason to lose the scene.
  // BLADE LEVEL OF DETAIL IS A PROPERTY OF THE SCENE, NOT OF A PLANT. This
  // counted one specimen's organs, which was the same number while there was
  // only one specimen; in a garden it would give every plant the mesh density
  // it would have had alone, and the cost is what the frame has to carry all
  // together.
  //
  // Lifted out of `buildScene` so a harness can drive it. It was inline, and
  // `test/views.mjs` measuring a stand at the single-specimen density reported
  // a garden 52% heavier than the one that ships — which is the exact failure
  // mode of a harness keeping its own copy of a shipped constant, arriving by
  // omission instead of by duplication.
  setBladeLOD(specimens) {
    let nOrg = 0, fen = false;
    for (const S of specimens) {
      nOrg += S.plant.organCount();
      if ((S.sp.leafOpts.fenestrate || 0) > 0) fen = true;
    }
    this.bladeMU = nOrg > 42 ? (fen ? 17 : 13) : nOrg > 24 ? 18 : 22;
    this.bladeMV = nOrg > 42 ? (fen ? 9 : 6) : nOrg > 24 ? 8 : 10;
    // AND THE LONGEST BLADE IN THE SCENE, because the numbers above are a
    // budget for the frame and were being spent per blade regardless of how
    // much of the frame a blade covers. A Cathedral Fern frond is 4.3 long and
    // an Ashfall Spire needle 1.15 — a fourteenfold difference in drawn area,
    // both getting 17x9 quads. Two conifers in a stand of eight overflowed the
    // triangle buffer by 317,000, which the buffer said out loud because a full
    // buffer stopped being silent (ROADMAP 10). See `bladeMesh`.
    this.bladeRef = 0.5;
    for (const S of specimens) this.bladeRef = Math.max(this.bladeRef, S.sp.organLen);
  }

  // How finely one blade is drawn. Two ceilings on the scene budget, and both
  // are conservations rather than dials — the same shape of law as the vein
  // cull and the cell thinning:
  //
  //   - NEVER FINER THAN THE TISSUE. A needle is five cells across; nine quads
  //     cannot tell them apart, and the whole reason the mesh is coarse is that
  //     the veins are meant to carry the detail.
  //   - QUADS PER UNIT OF DRAWN BLADE AREA HELD CONSTANT against the largest
  //     blade in the scene. Quads go as area and area as length squared, so each
  //     side scales linearly with length. Floored, because a blade still has to
  //     be a surface.
  //
  // `detL` is the microscope and it wins: walking the camera into a blade still
  // fades all the way up to the leaf's own lattice.
  bladeMesh(L, bl, detL, out) {
    const q = clamp(bl / this.bladeRef, 0.16, 1);
    let mu = Math.max(4, Math.round(this.bladeMU * q));
    let mv = Math.max(2, Math.round(this.bladeMV * q));
    if (detL > 0) { mu = Math.round(lerp(mu, L.o.nu, detL)); mv = Math.round(lerp(mv, L.o.nv, detL)); }
    out[0] = Math.min(L.o.nu, mu);
    out[1] = Math.min(L.o.nv, mv);
    return out;
  }

  view() { return VIEWS[this.viewName] || VIEWS.natural; }
  setRenderView(name) {
    if (!VIEWS[name]) return false;
    this.viewName = name;
    return true;
  }

  // WHAT THE CAMERA HAS TO FIT. With one plant this was `plant.bounds()` and the
  // distinction did not exist; with a stand it has to be the clearing, or the
  // framer damps in on the subject and the camera ends up standing INSIDE the
  // garden looking at the underside of somebody's canopy — which is exactly what
  // the first capture did, and it looks like a bug in the scene rather than in
  // the framing.
  //
  // When the shot has a subject the answer is still that subject: a close-up is a
  // statement that the rest of the clearing is not what we are looking at.
  sceneBounds() {
    if (!this.garden.length || this.subject || this.focus) return this.plant.bounds();
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const S of this.specimens()) {
      const b = S.plant.bounds();
      const hw = b.w / 2, hh = b.h / 2;
      if (b.cx - hw < x0) x0 = b.cx - hw; if (b.cx + hw > x1) x1 = b.cx + hw;
      if (b.cy - hh < y0) y0 = b.cy - hh; if (b.cy + hh > y1) y1 = b.cy + hh;
      if (b.cz - hw < z0) z0 = b.cz - hw; if (b.cz + hw > z1) z1 = b.cz + hw;
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2,
      w: Math.max(x1 - x0, z1 - z0), h: y1 - y0 };
  }

  // A STAND OF PLANTS.
  //
  // Positions are scattered on a ring around the subject, and that is scene
  // composition rather than an imposed shape — it says where a seed landed, not
  // what grows out of it. Every other thing that separates these plants is the
  // engine's: species, seed, and how far through its life each one is.
  //
  // They are staggered in AGE on purpose, and it is the cheapest interesting
  // thing here. Given the same species and a different seed you get a different
  // plant; given a different head start you get a seedling next to a flowering
  // adult next to a standing seed head, which is what a clearing actually looks
  // like and what no single specimen can show. `warm` is run before the first
  // frame, so the stand is already established when the shot opens.
  plantGarden(n = 6, opts = {}) {
    const seed = opts.seed === undefined ? (Math.random() * 1e6) | 0 : opts.seed;
    const r = mulberry32(seed ^ 0x9e3779b9);
    const names = Object.keys(SPECIES);
    const rad = opts.radius === undefined ? 9 : opts.radius;
    const wind = this.plant.wind;      // ONE air over the whole clearing
    this.garden = []; this._warmAt = 0;
    // Only the PLAN is drawn up here. Constructing a specimen is not cheap
    // either — every `Axis` runs its meristem forward 220 steps in its own
    // constructor, so it is born from a settled sheet rather than a burst of
    // organs — and seven of those back to back is a 501ms hitch on its own,
    // measured with `tools/garden_hitch.mjs`. Budgeting the head start while
    // building all seven plants up front fixes the long freeze and leaves the
    // sharp one.
    this._plan = [];
    this._warmAt = 0;              // round-robin cursor, see `warmGarden`
    for (let i = 0; i < n; i++) {
      // a ring, jittered, so nothing reads as a planted row
      const a = (i + 0.5) / n * TAU + (r() - 0.5) * 0.9;
      const d = rad * (0.55 + 0.75 * r());
      this._plan.push({
        name: opts.species || names[(r() * names.length) | 0],
        seed: (seed + i * 7919) >>> 0,
        origin: [Math.cos(a) * d, 0, Math.sin(a) * d],
        wind,
        // stagger: from just-germinated to well past flowering
        warm: Math.floor(lerp(opts.minAge === undefined ? 120 : opts.minAge,
          opts.maxAge === undefined ? 2600 : opts.maxAge, r())),
      });
    }
    this.bbS = null;
    // A HEAD START IS NOT FREE, AND IT MUST NOT BE PAID ALL AT ONCE.
    //
    // This used to run every specimen's warm-up in one synchronous loop right
    // here, which is 11,400 steps for a stand of seven — and a step during
    // GROWTH is not the ~300us a grown plant costs, it is about 1.7ms, because
    // that is when the leaf pool is canalising its library. Measured at 19
    // SECONDS of blocked main thread. The tab simply stops, and the headless
    // capture tools never noticed because sitting and waiting is all they do.
    //
    // So it is paid off a slice at a time, round-robin, which also happens to be
    // the better thing to watch: every plant comes up as a seedling at once and
    // the clearing fills in together, rather than specimens popping into
    // existence fully grown one after another.
    if (opts.instant) this.warmGarden(Infinity);
    return this.garden.length;
  }

  // is the stand still being planted, or still growing into its head start?
  gardenWarming() {
    return (this._plan && this._plan.length > 0) || this.garden.some(S => S.debt > 0);
  }

  // HOLD THE LAST ACT, across the whole clearing.
  //
  //   __app.holdSenescence()        stop leaves ageing and dropping
  //   __app.holdSenescence(false)   let them carry on from where they stopped
  //
  // Set on `plant.sp` rather than on the specimen's own `sp`: `Plant` copies its
  // options at construction, so the two are different objects and setting the
  // outer one looks like it works and does nothing.
  holdSenescence(on = true) {
    for (const S of this.specimens()) S.plant.sp.senesceHold = !!on;
    this.senesceHeld = !!on;
    return !!on;
  }

  // Pay down the head start, round-robin, inside a time budget. Returns true
  // when the whole stand has arrived.
  warmGarden(budgetMs) {
    if (!this.gardenWarming()) return true;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const t0 = now();
    const spent = () => budgetMs !== Infinity && now() - t0 >= budgetMs;
    for (;;) {
      // plant at most one per round — a `Plant` costs about 70ms to construct
      if (this._plan && this._plan.length) {
        const p = this._plan.shift();
        const S = this.makeSpecimen(p.name, p.seed, p.origin, p.wind);
        S.warm = p.warm; S.debt = p.warm;
        // One air, ONE CLOCK. The head start is a compressed life, so once the
        // debt is paid this member's `time` sits `warm` ahead of the moment it
        // was planted — without this offset it would spend the rest of its life
        // sampling wind from `warm` steps in the future of everyone else's.
        // While the debt is still paying down the member's wall clock lags by
        // exactly the debt remaining and converges to the hero's as it lands,
        // which is the least-surprising thing a compressed life can do.
        S.plant.windPhase = this.plant.time + this.plant.windPhase - p.warm;
        this.garden.push(S);
        if (spent()) return false;
      }
      // THE BUDGET IS CHECKED PER STEP, NOT PER ROUND, and the comment that used
      // to be here is why: "a round is seven steps and the budget is in whole
      // milliseconds, so per-step timing would cost more than it saves." That
      // holds only if every step costs the same, and they do not — a herb's
      // step is a few hundred microseconds and a conifer's is milliseconds, so
      // one round could overrun the whole budget several times over and nothing
      // looked until it was finished. `tools/garden_hitch.mjs` caught it the
      // day the conifer's crown got denser: worst frame gap 141ms -> 296ms on
      // the same seed, straight through the 250ms budget. A `now()` call is
      // ~100ns against a step that costs milliseconds.
      //
      // `_warmAt` is a cursor rather than a fresh scan, so breaking mid-round
      // does not hand the whole budget to whichever specimens sort first — the
      // next call resumes where this one stopped and the round-robin survives.
      let any = false;
      const g = this.garden;
      for (let k = 0; k < g.length; k++) {
        const S = g[(this._warmAt + k) % g.length];
        if (S.debt <= 0) continue;
        S.plant.step(1); S.debt--;
        any = true;
        if (spent()) { this._warmAt = (this._warmAt + k + 1) % g.length; return false; }
      }
      this._warmAt = 0;
      if (!any && !(this._plan && this._plan.length)) return true;
      if (spent()) return false;
    }
  }

  newSpecimen(name = this.speciesName, seed = (Math.random() * 1e6) | 0) {
    this.specimenNo = ('000' + (seed % 9973)).slice(-4);
    this.speciesName = name;
    // The weather outlives the specimen. `windU` is only set once the viewer has
    // touched the slider; until then the species' own `windOpts` (usually nothing,
    // so `WIND_DEFAULTS`) decides, and a regrow must not silently return the scene
    // to a calm the viewer had turned up out of. `makeSpecimen` reads it.
    const spec = this.makeSpecimen(name, seed);
    // A regrown hero starts its life clock at zero, but the scene's wall clock
    // has moved on — a garden's members keep theirs, and the air is one field.
    // The new specimen picks up the scene clock where the old one left it.
    if (this.plant) spec.plant.windPhase = this.plant.time + this.plant.windPhase;
    this.hero = spec;
    // Mirror the hero onto the App. Everything that predates the garden reads
    // these — the HUD, the director, the close-up modes, `80_main.js`, every
    // tool in `tools/` — and a specimen bundle is an addition rather than a
    // replacement precisely so none of that has to know about it.
    this.prm = spec.prm; this.mo = spec.mo; this.sp = spec.sp;
    this.pal = spec.pal; this.petalPal = spec.petalPal;
    this.innerPals = spec.innerPals; this.plant = spec.plant;
    this.garden = []; this._warmAt = 0;
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

  // CHANGE THE WEATHER WITHOUT REGROWING THE PLANT. The field bakes its mode table
  // once in `windField`, so a new speed means a new field rather than a mutated
  // option — and rebaking is the whole point, because sigma_u, every gust frequency
  // and the profile are all derived from `uRef` and would otherwise disagree with it.
  // Keeping the seed means the same eddies at a different strength, so dragging the
  // slider reads as the wind getting up rather than as a different day each frame.
  setWind(uRef) {
    this.windU = uRef;
    const o = { ...WIND_DEFAULTS, ...this.sp.windOpts, uRef };
    this.sp.windOpts = o;
    if (this.plant) this.plant.wind = windField(o);
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
    this.focusByDirector = true;
    this.subject = (sh.kind === 'fruit' || sh.kind === 'flower' || sh.kind === 'organ') ? sh : null;
  }

  // The blade worth looking at down the microscope. A leaf that is still
  // canalising wins outright — that is the one where the needles are visibly
  // falling into line — and the biggest opened blade is the fallback, where
  // they are already in line and only the traffic still moves.
  watchOrgan() {
    let live = null, big = null, bigA = 0, freshest = null, minSen = 2;
    for (const ax of this.plant.axes) {
      for (const o of ax.organs) {
        const L = o.leaf;
        if (o.floral || !L || !L.margin || !L.margin.mature) continue;
        if ((o.dev || 0) < 0.35 || o.len < 0.05) continue;
        if (o.shed) continue;                        // it is not on the plant
        if ((o.sen || 0) < minSen) { minSen = o.sen || 0; freshest = { ax, org: o }; }
        // Prefer a blade that is not being dismantled: the replay canalises a
        // network from scratch, and doing that on tissue visibly draining under
        // it is a contradiction. On a specimen where every blade has started,
        // `freshest` takes over rather than the close-up going empty.
        if ((o.sen || 0) > 0.25) continue;
        if (!L.mature) { if (!live || o.len > live.org.len) live = { ax, org: o }; }
        else if (o.len * (o.dev || 0) > bigA) { bigA = o.len * (o.dev || 0); big = { ax, org: o }; }
      }
    }
    return live || big || freshest;
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
    // ...but a blade that starts dismantling itself under the microscope has
    // stopped being the thing the shot is about, so that one does let go.
    const w = this._watch;
    if (!w || !w.org.leaf || w.ax.organs.indexOf(w.org) < 0 || w.org.shed) {
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
    this.focusByDirector = false;      // the viewer asked for this one
    this.focusFly = f ? 2600 : 0;
  }

  takeOver() {
    this.idleT = 0;
    this.focusFly = 0;
    if (this.userDriving) return;
    this.userDriving = true;
    this.subject = null;
    // The director's focus goes with its subject. Only the subject was being
    // cleared here, so an apex shot's `focus` survived the handover — and since
    // the auto-framer is locked out while the viewer drives, the ONLY thing it
    // still did was keep the occlusion cull running, clearing the canopy along
    // a sight line to a growing tip nobody was looking at any more. Orbiting
    // then swept that clearance through the plant: 80% of the blades gone at
    // the peak, a blade changing visibility every few frames. A focus the
    // VIEWER asked for stays — that is the close-up they pressed a button for.
    if (this.focusByDirector) { this.focus = null; this.focusByDirector = false; }
    if (this.onHandover) this.onHandover();
  }
  giveBack() {
    this.userDriving = false;
    this.focus = null; this.focusByDirector = false; this.focusFly = 0;
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
    // A specimen still growing into its head start is stepped by the warm-up and
    // not here as well, so it arrives at the age it was given rather than at
    // that age plus however long the stand took to establish.
    this.warmGarden(this.warmBudgetMs === undefined ? 8 : this.warmBudgetMs);
    for (const S of this.garden) {
      if (S.debt > 0) continue;
      for (let i = 0; i < steps; i++) S.plant.step(1);
    }
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
    const raw = this.sceneBounds();
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
        const bl = w.org.len * BLADE_DRAWN;
        const f = w.org.frame.o, fx = w.org.frame.x;
        const pet = petioleOf(w.org).len;
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
    // only things well off the plane the camera is looking at go soft.
    // Under the microscope that range is the whole specimen, so nothing ever
    // defocuses and the blade behind the one being looked at is drawn just as
    // sharply — it reads as part of the same surface and swamps the tissue.
    // Shallow depth of field is what a microscope actually has.
    const dofT = this.focus === 'leaf'
      ? Math.max(0.4, c.dist * 0.22)
      : Math.max(2.0, Math.max(hh, hw) * 0.62);
    // Ease it. Switching focus mode moved this by an order of magnitude in a
    // single frame (5.09 -> 0.45 going in, 1.12 -> 7.45 coming out) and the
    // whole frame snapped between sharp and soft. Racking the focus over half
    // a second reads as a lens; jumping it reads as a glitch.
    c.dofRange = c.dofRange === undefined ? dofT : lerp(c.dofRange, dofT, damp(0.05));
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
    // The third number is the ANGULAR pixel size, so a blade can work out its
    // own scale from its own distance rather than inheriting the one measured
    // at the camera's orbit radius. Passing it alongside the second rather than
    // replacing it keeps every non-blade caller on the scene-wide value.
    //
    // Passing ZERO instead is the pre-LOD renderer, exactly — every vein of
    // every blade at the scene-wide floor. It is here so the change stays
    // re-measurable from a browser rather than only from a harness
    // (`tools/veinlod_shot.mjs`), the same reason `FALL_DEFAULTS.tiltPlane` and
    // `shootOpts.enabled` are still in the tree.
    setView(this.cam.eye, this.cam.dist * px * 1.5, this.veinLOD === false ? 0 : px);
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
      const pet = petioleOf(org).len, bl = org.len * BLADE_DRAWN;
      const d = pet + bl * 0.45;
      const at = [org.frame.o[0] + org.frame.x[0] * d,
        org.frame.o[1] + org.frame.x[1] * d,
        org.frame.o[2] + org.frame.x[2] * d];
      // Open the clearance as the camera arrives, not the instant the mode is
      // set. This used to engage at full width while the camera was still out
      // at the wide shot, where the sight line is long and the cleared cylinder
      // swallows most of the specimen — so pressing the button made half the
      // plant vanish in one frame, before anything had moved.
      const de = Math.hypot(at[0] - this.cam.eye[0], at[1] - this.cam.eye[1],
        at[2] - this.cam.eye[2]);
      const near = smoothstep(0.30, 0.80, bl / Math.max(0.01, de));
      if (near > 0.01) {
        cullFrom = at;
        cullRad = bl * 0.85 * near;
        cullKeepOrg = org;    // never clear away the leaf we came to look at
      }
    }
    // Open the clearance as the camera arrives, not on the cut.
    //
    // The leaf close-up already did this, for a reason written out below it: it
    // used to engage at full width while the camera was still out at the wide
    // shot, and pressing the button made half the plant vanish in one frame.
    // The director's own shots had exactly the same defect and nobody had
    // joined it up — a cut to a fruit or a growing tip cleared a third of the
    // canopy instantly, from a viewpoint the clearance was not sized for, and
    // then handed it back on the next cut. That is the blinking.
    //
    // Same ramp, same quantity: how much of the frame the subject spans.
    // Measured over all eight species, every shot type is above 0.41 once it
    // has settled, while the apex and fruit cuts start around 0.21 — so the
    // clearance is fully open by the time the shot is, and shut at the cut.
    if (cullFrom && this.focus !== 'leaf') {
      const de = Math.hypot(cullFrom[0] - this.cam.eye[0],
        cullFrom[1] - this.cam.eye[1], cullFrom[2] - this.cam.eye[2]);
      const near = smoothstep(0.20, 0.38, 2 * cullRad / Math.max(0.01, de));
      if (near < 0.01) cullFrom = null; else cullRad *= near;
    }
    // Clear a cylinder along the line of sight rather than a sphere around the
    // eye. The old test compared each organ's BASE distance to the subject
    // distance, which both stripped lateral scenery that was never in the way and
    // — worse — kept long leaves whose base sits behind the subject while the
    // blade reaches right across the front of it. That is what was burying the
    // flower shot.
    let sdx = 0, sdy = 0, sdz = 0, cullDist = 1;
    if (cullFrom) {
      sdx = cullFrom[0] - this.cam.eye[0];
      sdy = cullFrom[1] - this.cam.eye[1];
      sdz = cullFrom[2] - this.cam.eye[2];
      const sl = Math.hypot(sdx, sdy, sdz) || 1;
      sdx /= sl; sdy /= sl; sdz /= sl;
      cullDist = sl;
      cullR = sl - cullRad;      // stop clearing just short of the subject
    }
    // BLADE LEVEL OF DETAIL IS A PROPERTY OF THE SCENE, NOT OF A PLANT. This
    // counted one specimen's organs, which was the same number while there was
    // only one specimen; in a garden it would give every plant the mesh density
    // it would have had alone, and the cost is what the frame has to carry all
    // together.
    this.setBladeLOD(this.specimens());
    // the subject first, with the clearance, then the rest of the clearing
    this.drawSpecimen(B, this.hero, cullFrom ? {
      keep: cullKeep, keepOrg: cullKeepOrg, r: cullR, rad: cullRad,
      dist: cullDist, dx: sdx, dy: sdy, dz: sdz,
    } : null);
    for (const S of this.garden) this.drawSpecimen(B, S, null);
    if (this.view().spores !== false) {
      for (const s of this.spores) B.point(s.p, pal.spore, s.s * 0.9);
    }
    this.renderer.upload(B);
  }

  // DRAW ONE SPECIMEN. Lifted out of `buildScene` whole when the scene stopped
  // being a single plant; every line of it is what was there before, reading its
  // species options and its three palettes off the specimen rather than off the
  // App. `cull` is the occlusion clearance, and it is null for everything except
  // the subject of the shot — a background plant is never in its own way, and
  // clearing a cone through one of them would be clearing scenery the viewer is
  // looking AT rather than through.
  drawSpecimen(B, S, cull) {
    const pal = S.pal;
    const V = this.view();
    // The cell channel is the only one a view repalettes, and it is read by
    // three different organs — build it once rather than per blade.
    const cpal = V.cellPal ? { ...pal, ...V.cellPal } : pal;
    for (const ax of S.plant.axes) {
      const nseg = ax.pts.length;
      if (nseg > 1) {
        if (V.stemSolid) {
          tube(B, ax.pts, ax.radii, 7, (t) => ({
            c: [lerp(pal.stem0[0], pal.stem1[0], t), lerp(pal.stem0[1], pal.stem1[1], t), lerp(pal.stem0[2], pal.stem1[2], t)],
            e: t > 0.93 && ax.alive ? (t - 0.93) * 5.0 * pal.glow : 0,
          }));
        } else {
          stemRibbon(B, ax.pts, ax.radii, pal.stem1, V.stem);
        }
      }
      for (const org of ax.organs) {
        if (org.len < 0.02) continue;
        // A shed organ is still drawn — falling — until it has been gone long
        // enough. This is the only place in the scene where an organ is drawn
        // somewhere other than where the simulation put it, so everything below
        // reads `oFr` rather than `org.frame`.
        let oFr = org.frame, gone = 0;
        if (org.shed) {
          // no fall state means it never had a blade to drop
          if (!org.fall || org.fall.done) continue;
          oFr = fallFrame(org.fall, org.fallFrom, org.fallAxis, _shedFr);
          gone = oFr.t;
        }
        // Occlusion clearing, with hysteresis.
        //
        // The subject this is measured from is a growing, circumnutating tip,
        // so the sight line is never still even when the camera is: organs
        // sitting near the boundary crossed it back and forth and blinked in
        // and out of the scene every few frames. The forward pass writes depth,
        // so this cannot be a fade — a blade dimmed to black still hides what
        // is behind it, and hiding what is behind it is the entire job. What it
        // can be is sticky. An organ now has to be clearly INSIDE the cleared
        // cylinder to be dropped and clearly OUTSIDE to come back, so a wobble
        // at the boundary decides once instead of once per frame.
        let occluded = false;
        if (cull && org !== cull.keepOrg && !(ax === cull.keep && org.floral)) {
          const ox = oFr.o[0] - this.cam.eye[0];
          const oy = oFr.o[1] - this.cam.eye[1];
          const oz = oFr.o[2] - this.cam.eye[2];
          const t = ox * cull.dx + oy * cull.dy + oz * cull.dz;          // along the sight line
          if (t > 0 && t < cull.r) {
            const px2 = ox - cull.dx * t, py2 = oy - cull.dy * t, pz2 = oz - cull.dz * t;
            // how far off the sight line it sits, allowing for its own reach
            const lat = Math.hypot(px2, py2, pz2) - (org.len || 0);
            // A CONE from the eye to the subject, not a cylinder. Being "in the
            // way" is a statement about angle: a leaf a tenth of the way along
            // the sight line only has to be a tenth as far off it to cover the
            // same part of the frame. Tested as a cylinder, every leaf got the
            // subject's full world-space clearance no matter how near the lens
            // it sat, which cleared great swathes of canopy that were nowhere
            // near the subject on screen — 28.8% of a Cathedral Fern's blades
            // on average, half of them at once at the peak, blinking as the
            // shot moved. The radius at the subject is unchanged, so the thing
            // the clearance exists for still happens.
            occluded = lat < cull.rad * (t / cull.dist) * (org._occ ? 1.20 : 0.86);
          }
        }
        org._occ = occluded;
        if (occluded) continue;
        const L = org.leaf;
        // How far through dismantling itself this organ is. A blade only lets go
        // once this has reached 1, so a falling one is already fully drained —
        // `gone` carries the rest of the departure and nothing else has to.
        const sen = org.sen || 0;
        const vis = 1 - gone * gone;        // it lingers, then it is not there
        // petiole
        const a = oFr.o;
        // a longer stalk carries the blade clear of the shoot and its neighbours
        const pt = petioleOf(org);
        const pet = pt.len;
        const b = v3(a[0] + oFr.x[0] * pet,
          a[1] + oFr.x[1] * pet,
          a[2] + oFr.x[2] * pet);
        // the stalk empties too — the whole organ is being withdrawn from, not
        // just its blade, and a green stalk under a drained blade reads as a bug
        let petC = pal.stem1;
        if (sen > 0) {
          senesceTint(_petC, pal.stem1[0], pal.stem1[1], pal.stem1[2], sen * 0.85);
          _petC[0] *= vis; _petC[1] *= vis; _petC[2] *= vis;
          petC = _petC;
        }
        // THE STALK ON SCREEN IS THE STALK IN THE SOLVER. These were `org.radius *
        // 0.5` and `* 0.30` — the stem's radius, halved, written down here and again in
        // `39_fall.js`, so the drawn petiole and the sprung one were only equal by
        // coincidence. `petioleOf` is the one definition now, and the pipe model gives a
        // prismatic stalk, so there is one radius rather than two (ROADMAP 5).
        if (V.stemSolid) tube(B, [a, b], [pt.r0, pt.r1], 5, () => ({ c: petC, e: 0 }));
        else stemRibbon(B, [a, b], [pt.r0, pt.r1], petC, V.stem);
        if (!L || !L.margin || !L.margin.mature) continue;
        const fr = { o: b, x: oFr.x, y: oFr.y, z: oFr.z };
        // blades unfurl rather than appearing at full size
        // one development parameter: the blade lengthens, the wave of
        // maturation runs out along it, and the furled tip uncoils behind it
        const dev = clamp((org.dev || 0) * 1.06 - 0.03, 0, 1);
        // A drying blade shrivels — it loses the turgor that was holding it
        // open, which is also why it curls (below). Small: this is the tissue
        // contracting, not the leaf being scaled away, and scaling it away is
        // the cheat that would make the fall read as a dissolve.
        const bl = drawnBladeLen(org.len, sen);
        if (bl < 0.02) continue;
        const bp = org.petal ? S.petalPal
          : org.floral ? S.innerPals[clamp(
            Math.round(((org.q - S.sp.petalQ) / Math.max(1e-3, 1 - S.sp.petalQ)) * (INNER_STEPS - 1)),
            0, INNER_STEPS - 1)]
            : pal;
        // and it curls as it dries, hard: a dead leaf on the ground is a tube
        const curl = -bl * (org.petal ? 0.05 : 0.16) * (1 + sen * 2.2);
        const ripple = bl * 0.014;
        // ONE blade goes under the microscope: the one being inspected.
        //
        // This started out purely distance-driven, like the growing tip, where
        // proximity alone fades the mechanism up and there is no mode to find.
        // That does not transfer either. There is one meristem and the camera
        // is pointed at it; there are twenty to a hundred blades, and near the
        // apex several sit close to the lens at once. Every one of them then
        // refined its mesh and grew needles, which cost a fortune and — worse —
        // put each of them a hair from the refinement threshold and a hair from
        // the occlusion cull, so they flickered in and out together. Traced at a
        // dead-still camera: 13k triangles to 40k and back, frame to frame.
        //
        // A microscope looks at one thing. Distance still does the fading, so
        // arriving still feels like arriving rather than like a switch being
        // thrown, but only the watched blade participates.
        let detL = 0;
        if (this._watch && org === this._watch.org) {
          const dEyeB = Math.hypot(fr.o[0] - this.cam.eye[0], fr.o[1] - this.cam.eye[1],
            fr.o[2] - this.cam.eye[2]);
          // the director's existing `organ` beauty shot sits at about 0.44 and
          // must stay clear of this, so nothing starts until the blade is
          // filling the frame
          detL = smoothstep(0.42, 0.95, bl / Math.max(0.01, dEyeB));
        }
        // The blade mesh is deliberately far coarser than the tissue — the
        // veins are meant to carry the detail, and at arm's length they do.
        // Under the microscope they cannot: 22x10 quads across a blade that
        // fills the frame is a visibly faceted slab, and cells scattered over
        // it read as blobs on cardboard.
        const mesh = this.bladeMesh(L, bl, detL, this._mesh || (this._mesh = [0, 0]));
        const mu = mesh[0], mv = mesh[1];
        blade(B, L, fr, bl, bl, bp, curl, ripple, bp.glow, mu, mv, dev,
          (1 - 0.82 * detL) * vis, sen,
          { surface: V.lamina > 0, veinMul: V.veins * vis });
        // A VIEW SETS A FLOOR ON THE MICROSCOPE, it does not replace it. Walking
        // the camera into a blade still fades the mechanism up the same way in
        // every view — what a cell view changes is where that fade STARTS, which
        // is everywhere at once instead of on the one watched blade.
        const detV = Math.max(detL, V.needles);
        if (V.cells > 0 || detV > 0.004) {
          if (detL > this.detail) this.detail = detL;
          // Cells and needles come from the replay while one is running, but
          // the VEINS above are always the real leaf's. Swapping the whole leaf
          // over meant the vasculature blinked out the moment the replay took
          // over and blinked back when it finished — and the network being
          // there throughout is what makes the needles legible as falling into
          // it, rather than merely milling about.
          const rp = this._replay;
          const src = (rp && rp.of === L && rp.leaf.built) ? rp.leaf : L;
          laminaCells(B, src, fr, bl, bl, cpal, curl, ripple, this.t, detV, dev,
            sen, { cells: V.cells > 0 ? 1 : 0 });
        }
      }
      // the fruit, if this shoot got that far
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
        const n2 = ax.pts.length;
        const tip = ax.pts[n2 - 1];
        const fs = S.sp.fruitScale * (ax.gen === 0 ? 1 : 0.72);
        if (V.fruitSolid) fruitShell(B, ax.fruit, tip, fs, pal);
        else fruitCells(B, ax.fruit, tip, fs, cpal, V.needles, V.ripeTint);
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
          mScale, cpal, this.t, Math.max(det, V.needles) * V.meristem);
      }
    }
  }

  render() {
    // ease the bloom off as the cells resolve, so detail is not washed away
    const p = this.pal;
    const keep = p._bloom === undefined ? (p._bloom = p.bloom) : p._bloom;
    p.bloom = keep * (1 - 0.55 * this.detail);
    // A VIEW MAY OVERRIDE THE GRADE, and the overrides are restored after the
    // draw rather than written into the palette. The palette belongs to the
    // specimen — it is built once in `makeSpecimen` and the species owns it —
    // so a view that edited it in place would make switching views a
    // destructive operation and switching back a lossy one. Saving and
    // restoring around the one call is the same trick the bloom line above has
    // used since the close-up shipped.
    const V = this.view();
    const over = V.pal;
    let saved = null;
    if (over) {
      saved = {};
      for (const k of Object.keys(over)) { saved[k] = p[k]; p[k] = over[k]; }
      if (over.bloom !== undefined) p.bloom = over.bloom * (1 - 0.55 * this.detail);
    }
    this.renderer.draw(this.cam, this.pal, this.t);
    if (saved) for (const k of Object.keys(saved)) p[k] = saved[k];
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
