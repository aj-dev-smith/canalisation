// THE PLANT, OUT OF THE BROWSER AND INTO A PATH TRACER.
//
//   node tools/blender_export.mjs                          # Cathedral Fern, seed 21
//   node tools/blender_export.mjs 'Ashfall Spire' 7 5200    # species, seed, steps
//   VIEW=flux node tools/blender_export.mjs                 # any of the four views
//
// Writes `<out>.json` (a header) and `<out>.bin` (float32 payload) into
// `export/` by default; `tools/blender_import.py` reads the pair inside Blender.
//
// THE WHOLE POINT OF THIS FILE IS THAT IT ADDS NO GEOMETRY CODE. It grows a
// specimen with the shipped `makeSpecimen`, draws it with the shipped
// `drawSpecimen`, and the only thing it supplies is a `Buffers` that keeps a
// second copy of what passed through it. A bridge that re-implemented the draw
// would drift from the renderer inside a week — the same argument that keeps
// `test/views.mjs` driving the real `drawSpecimen` through a stand-in App, and
// the same one behind `test/stem.mjs` reading `WIND_DEFAULTS` instead of
// hardcoding a wind speed the app had moved on from.
//
// ONE THING IS DELIBERATELY THROWN AWAY, AND IT IS THE INTERESTING ONE.
// A vein is drawn in the browser as a camera-facing ribbon — six vertices
// rotated to face the eye — because that is how you get a hairline to read as a
// thickness in a rasteriser. Exported as triangles, that is a flat billboard
// baked at one camera position, and the first orbit of a turntable would show
// every vein in the plant turn edge-on and vanish. So `ribbon()` here does NOT
// call through to the emitter: it records `(a, b, w0, w1)` and drops `side`.
// Blender gets a CURVE with a radius per point, which Cycles renders as a real
// tube from any angle. The view-dependence was never in the vein — it was in
// the rasteriser — so this is a lossless swap rather than an approximation.
//
// `seg2` (needles) funnels through `ribbon` too, so it comes across the same
// way for free. `tube()` and `blade()` write through `vert()` and are honest
// triangles already. `point()` is a point cloud.

import { App, SPECIES } from '../src/70_app.js';
import { Buffers, setView } from '../src/50_geom.js';
import { WORLD } from '../src/37_wind.js';
import { v3, mulberry32 } from '../src/00_math.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

// --- a stand-in App --------------------------------------------------------
//
// Copied from `test/views.mjs`, and copied on purpose: this list is every
// property `makeSpecimen` and `drawSpecimen` read off `this`. If it grows, both
// files break loudly rather than quietly drawing a different program. Keeping
// one shared copy would hide exactly the change worth being told about.
function standIn(over) {
  return {
    cam: { eye: v3(0, 4, 15), dist: 15, fov: 0.72 },
    viewName: 'natural',
    view: App.prototype.view,
    setBladeLOD: App.prototype.setBladeLOD,
    bladeMesh: App.prototype.bladeMesh,
    bladeMU: 22, bladeMV: 10, bladeRef: 4.3,
    detail: 0, t: 12000,
    _watch: null, _replay: null,
    showMeristem: true,
    ringWidth: 0, windU: undefined, senesceHeld: false,
    ...over,
  };
}

// --- the capturing buffer --------------------------------------------------
//
// THE BUFFERS GROW HERE, AND THEY MUST. `Buffers` is sized for a clearing at 60
// fps and drops geometry when it fills — deliberately, and it says so, which is
// how this was caught. But a frame budget is the wrong constraint for a file:
// an Ashfall Spire at the solver's own lamina resolution wanted 1.44 M triangles
// and the shipped triangle buffer holds 279,620, so the first conifer export
// went out with 80% of the tree missing and a saturation warning that only
// exists because that pitfall had already cost two sessions.
//
// Overriding the emitters rather than just allocating something enormous, so
// that "big enough" is not a number anybody has to be right about.
function grown(a) {
  const b = new Float32Array(a.length * 2);
  b.set(a);
  return b;
}

class Capture extends Buffers {
  constructor() {
    super();
    // a, b, w0, w1, rgb, emis = 12 floats per segment
    this.seg = new Float32Array(1 << 20);
    this.segN = 0;
    this.dropped.seg = 0;
  }
  vert(p, n, c, e) {
    if (this.triN + 10 > this.tri.length) this.tri = grown(this.tri);
    super.vert(p, n, c, e);
  }
  point(p, c, s) {
    if (this.ptN + 7 > this.pt.length) this.pt = grown(this.pt);
    super.point(p, c, s);
  }
  ribbon(a, b, side, w0, w1, c, e) {
    if (this.segN + 12 > this.seg.length) this.seg = grown(this.seg);
    const s = this.seg; let i = this.segN;
    s[i] = a[0]; s[i + 1] = a[1]; s[i + 2] = a[2];
    s[i + 3] = b[0]; s[i + 4] = b[1]; s[i + 5] = b[2];
    s[i + 6] = w0;  s[i + 7] = w1;
    s[i + 8] = c[0]; s[i + 9] = c[1]; s[i + 10] = c[2];
    s[i + 11] = e;
    this.segN = i + 12;
  }
}

// --- arguments -------------------------------------------------------------
const name = process.argv[2] || 'Cathedral Fern';
const seed = +(process.argv[3] || 21);
const steps = +(process.argv[4] || 3000);
const viewName = process.env.VIEW || 'natural';
const until = process.env.STAGE || '';
const mesh = process.env.MESH || 'full';
const out = process.env.OUT || `export/${name.toLowerCase().replace(/\W+/g, '_')}_${seed}_${viewName}`;

// THE SHIPPED WIDTH FLOOR, READ OFF THE SHIPPED FILE. `MINW`'s default is not
// exported — and a harness that keeps its own copy of a shipped constant will
// eventually draw a different program than the one you are running, which is
// the lesson `test/stem.mjs` learned by hardcoding a wind speed. So this greps
// it and dies if the shape ever changes, rather than quietly reverting to a
// number somebody typed. `PXR` is angular, so in the browser the floor varies
// with distance and `MINW` is its value AT THE FRAMING DISTANCE — which is the
// right constant for a hero render of a framed subject.
const src = readFileSync(new URL('../src/50_geom.js', import.meta.url), 'utf8');
const m = src.match(/\bMINW\s*=\s*([0-9.eE+-]+)/);
if (!m) {
  console.error(`could not read MINW's default out of src/50_geom.js — has it been renamed?`);
  process.exit(1);
}
const wFloor = process.env.WFLOOR !== undefined ? +process.env.WFLOOR : +m[1];

if (!SPECIES[name]) {
  console.error(`no such species: ${name}\n  ${Object.keys(SPECIES).join('\n  ')}`);
  process.exit(1);
}

// --- grow ------------------------------------------------------------------
//
// `STAGE=` stops at a stage rather than at a step count, which is what a
// portrait wants: the step at which a specimen is at its fullest is a property
// of the species and the seed, not a number to look up. 3,000 steps is a
// Cathedral Fern well into senescence and an Ashfall Spire barely started.
//
// `STAGE=peak` is the one that is not a stage — it is the last step before
// senescence begins, which is the fullest the plant ever is and has no name in
// `Plant.stage()`. It costs a second growth, because a plant cannot be rewound:
// pass one finds the step, pass two regrows to it. That is only sound because
// growth is seeded and deterministic, so the two passes assert against each
// other rather than trusting it.
const app = standIn({ viewName });
const grow = (n, stopAt) => {
  const a = standIn({ viewName });
  const s = App.prototype.makeSpecimen.call(a, name, seed);
  for (let i = 1; i <= n; i++) {
    s.plant.step(1);
    if (i % 500 === 0) process.stdout.write('.');
    if (stopAt && s.plant.stage() === stopAt) return { S: s, took: i };
  }
  return { S: s, took: n };
};
process.stdout.write(`growing ${name} seed ${seed}${until ? ` to ${until}` : ''} `);
let S, took;
if (until === 'peak') {
  const scout = grow(steps, 'senescing');
  const target = Math.max(1, scout.took - 1);
  process.stdout.write(` peak at ${target} `);
  ({ S, took } = grow(target));
  if (S.plant.stage() === 'senescing') {
    console.error(`\n  !! the two growth passes disagree — growth is not deterministic`);
    process.exit(1);
  }
} else {
  ({ S, took } = grow(steps, until || null));
}
const stage = S.plant.stage();
console.log(` ${stage} at step ${took}`);
if (until && until !== 'peak' && stage !== until) {
  console.error(`  !! never reached '${until}' in ${steps} steps (got '${stage}')`);
}

// THE BLADE MESH AT THE RESOLUTION THE SOLVER RAN AT, which is the one thing
// this export can have that the browser cannot. `bladeMesh` scales the lamina
// grid down to hold quads-per-drawn-area constant across a scene, because a
// real-time frame has a triangle budget; it is clamped by `L.o.nu`/`L.o.nv`, the
// leaf's own lattice, so asking for more than that is not a request for
// invented detail — it is a request to stop throwing the solved tissue away.
// `MESH=auto` keeps the browser's own numbers, for an A/B against a screenshot.
if (mesh === 'full') { app.bladeMU = 1e9; app.bladeMV = 1e9; app.bladeRef = 1e-9; }

// --- draw ------------------------------------------------------------------
//
// THE LEVEL OF DETAIL IS SWITCHED OFF, which is what a zero angular pixel size
// means and what `app.veinLOD = false` throws in the browser. The cull exists
// so a real-time frame can drop veins that land under a pixel at the camera's
// framing distance; a path tracer has no framing distance and no frame budget,
// and this is the one export where every vein the chemistry grew should come
// across.
//
// ⚠ THE WIDTH FLOOR IS NOT PART OF THAT, AND ASSUMING IT WAS COST A DAY. This
// line used to pass `1e-4` with a paragraph arguing that `MINW` is a *pixel*
// floor and a pixel floor has no meaning in a path tracer. The physics is right
// and the picture is wrong: measured on a Cathedral Fern, the MEDIAN vein sits
// exactly at the shipped floor and the thinnest are 12x under it, so `MINW` is
// what lifts more than half the network to a visible common width. Drawing the
// hierarchy at its true scale draws most of it at no scale at all, and a leaf
// comes out a flat disc. It is the ROADMAP 13 needle result again — botanical
// correctness and legibility of the mechanism point opposite ways here, and the
// project's claim is the second one. Default is the shipped `MINW`; `WFLOOR=`
// is there to sweep it, not to be left off.
setView(v3(0, 4, 15), wFloor, 0);

const B = new Capture();
App.prototype.drawSpecimen.call(app, B, S, null);

// THE HERO'S OWN EXTENT, MEASURED BEFORE ANYTHING ELSE IS PLANTED. A garden's
// bbox is the whole clearing, and a camera framed on that frames a wide shot of
// seven plants. `film()` takes `span`/`pivot`, so the consumer needs to know
// where the SUBJECT is independently of where the set is.
const heroBB = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
{
  const g = (x, y, z) => {
    if (x < heroBB[0]) heroBB[0] = x; if (y < heroBB[1]) heroBB[1] = y; if (z < heroBB[2]) heroBB[2] = z;
    if (x > heroBB[3]) heroBB[3] = x; if (y > heroBB[4]) heroBB[4] = y; if (z > heroBB[5]) heroBB[5] = z;
  };
  for (let i = 0; i < B.triN; i += 10) g(B.tri[i], B.tri[i + 1], B.tri[i + 2]);
  for (let i = 0; i < B.segN; i += 12) { g(B.seg[i], B.seg[i + 1], B.seg[i + 2]); g(B.seg[i + 3], B.seg[i + 4], B.seg[i + 5]); }
}

// --- the clearing ----------------------------------------------------------
//
// A BLACK BACKGROUND IS THE PROBLEM AND MORE PLANTS ARE THE ANSWER. A path
// tracer lights the subject with what is around it, so a specimen alone in a
// void is lit by nothing but its own practicals — and the alternative to a void
// is not an imported HDRI or a scanned rock, because the palette IS this
// piece's look and set dressing nobody grew would be the first thing here that
// the simulation did not make. The background should be more of the same
// chemistry, at other ages, out of focus.
//
// This is `plantGarden`'s ring, reimplemented rather than called, for one
// reason: `plantGarden` pays the head start off in slices against a frame
// budget (`warmGarden`), which is exactly right for a tab and meaningless for a
// file. The RING is the part worth copying and it is copied honestly — jittered
// angle, jittered radius, staggered ages — so a stand exported here has the same
// statistics as a stand on screen.
const gardenN = +(process.env.GARDEN || 0);
const gardenPlan = [];
if (gardenN > 0) {
  const gseed = +(process.env.GARDEN_SEED || (seed ^ 0x5bf03635)) >>> 0;
  const rad = +(process.env.GARDEN_RADIUS || 9);
  const minAge = +(process.env.GARDEN_MIN || 400);
  const maxAge = +(process.env.GARDEN_MAX || 2600);
  // ONE species by default, and that is a composition decision worth stating:
  // the palettes here differ enough between species that a mixed clearing reads
  // as a colour chart. `GARDEN_SPECIES=*` samples the catalogue instead.
  const pick = process.env.GARDEN_SPECIES || name;
  const names = Object.keys(SPECIES);
  const rnd = mulberry32(gseed);
  const TAU = Math.PI * 2;
  for (let i = 0; i < gardenN; i++) {
    const ang = (i + 0.5) / gardenN * TAU + (rnd() - 0.5) * 0.9;
    const d = rad * (0.55 + 0.75 * rnd());
    gardenPlan.push({
      name: pick === '*' ? names[(rnd() * names.length) | 0] : pick,
      seed: (gseed + i * 7919) >>> 0,
      origin: [Math.cos(ang) * d, 0, Math.sin(ang) * d],
      warm: Math.floor(minAge + (maxAge - minAge) * rnd()),
    });
  }
  // ONE AIR OVER THE WHOLE CLEARING, exactly as `plantGarden` does it — the
  // stand has to be standing in the same wind or the stems disagree about which
  // way it is blowing, which is visible the moment two plants overlap.
  const wind = S.plant.wind;
  for (const p of gardenPlan) {
    process.stdout.write(`  planting ${p.name} seed ${p.seed} at ${p.origin.map(v => v.toFixed(1))} age ${p.warm} `);
    const ga = standIn({ viewName });
    const GS = App.prototype.makeSpecimen.call(ga, p.name, p.seed, p.origin, wind);
    for (let i = 1; i <= p.warm; i++) GS.plant.step(1);
    if (mesh === 'full') { ga.bladeMU = 1e9; ga.bladeMV = 1e9; ga.bladeRef = 1e-9; }
    App.prototype.drawSpecimen.call(ga, B, GS, null);
    p.stage = GS.plant.stage();
    p.organs = GS.plant.axes.reduce((n, a) => n + a.organs.length, 0);
    console.log(`-> ${p.stage}, ${p.organs} organs`);
  }
}

// A TRUNCATED FILE IS WORSE THAN NO FILE, because the picture it makes is
// merely missing things and looks like a plant. The buffers grow, so this
// should now be unreachable — it is here because it was NOT unreachable before
// they did, and the first conifer export shipped 80% short with only a warning.
const sat = B.saturated();
if (sat) {
  console.error(`  !! BUFFER SATURATED — geometry was dropped: ${JSON.stringify(sat)}`);
  process.exit(1);
}

// --- bounds ----------------------------------------------------------------
const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
const grow3 = (x, y, z) => {
  if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (z < bb[2]) bb[2] = z;
  if (x > bb[3]) bb[3] = x; if (y > bb[4]) bb[4] = y; if (z > bb[5]) bb[5] = z;
};
for (let i = 0; i < B.triN; i += 10) grow3(B.tri[i], B.tri[i + 1], B.tri[i + 2]);
for (let i = 0; i < B.segN; i += 12) { grow3(B.seg[i], B.seg[i + 1], B.seg[i + 2]); grow3(B.seg[i + 3], B.seg[i + 4], B.seg[i + 5]); }
for (let i = 0; i < B.ptN; i += 7) grow3(B.pt[i], B.pt[i + 1], B.pt[i + 2]);

// --- write -----------------------------------------------------------------
const tri = B.tri.subarray(0, B.triN);
const seg = B.seg.subarray(0, B.segN);
const pt = B.pt.subarray(0, B.ptN);

const bin = Buffer.concat([
  Buffer.from(tri.buffer, tri.byteOffset, tri.byteLength),
  Buffer.from(seg.buffer, seg.byteOffset, seg.byteLength),
  Buffer.from(pt.buffer, pt.byteOffset, pt.byteLength),
]);

const header = {
  format: 'canalisation-specimen-1',
  species: name, seed, steps, view: viewName,
  stage,
  // The ruler was fixed months ago by the wind and the falling blade, and it is
  // what makes a physical camera in Blender mean anything: a 2.88 m sapling has
  // to be 2.88 m if depth of field is going to behave like a lens.
  unitM: WORLD.unitM,
  // What the ribbon widths in `seg` were floored at, so a consumer can tell a
  // swept export from a shipped-look one without guessing from the numbers.
  wFloor,
  // A vein's colour is already the palette's; the renderer's grade (bloom,
  // exposure, vignette) is NOT applied here and should not be. A path tracer
  // does its own tone mapping, and baking a real-time grade into vertex colours
  // would be grading twice.
  // WRITE THE KEYS THE PALETTE ACTUALLY HAS. This said `bg: S.pal.bg` for a
  // while and there is no `bg` — a species carries `bgTop`, `bgBot` and
  // `bgGlow`, so `JSON.stringify` dropped the key entirely and every consumer
  // silently fell back to its own default. That put an Ember Creeper, whose own
  // background is 0.030/0.010/0.010 of warm near-black, in a blue-grey room.
  // An undefined that survives serialisation as an ABSENT KEY is the quiet
  // version of this bug: `pal.get('bg', default)` cannot tell "no such colour"
  // from "nobody asked".
  palette: {
    glow: S.pal.glow,
    bgTop: S.pal.bgTop, bgBot: S.pal.bgBot, bgGlow: S.pal.bgGlow,
    fog: S.pal.fog, fogD: S.pal.fogD,
    stem0: S.pal.stem0, stem1: S.pal.stem1,
    blade0: S.pal.blade0, blade1: S.pal.blade1,
    vein: S.pal.vein, veinTint: S.pal.veinTint,
    fruit0: S.pal.fruit0, fruit1: S.pal.fruit1,
    petal0: S.pal.petal0, petal1: S.pal.petal1,
    key: S.pal.key, keyCol: S.pal.keyCol,
    ambTop: S.pal.ambTop, ambBot: S.pal.ambBot,
    laminaMul: S.pal.laminaMul,
  },
  bbox: { min: bb.slice(0, 3), max: bb.slice(3) },
  // the SUBJECT's extent, which is not the SET's once a garden is planted
  heroBbox: { min: heroBB.slice(0, 3), max: heroBB.slice(3) },
  garden: gardenPlan.map(p => ({ name: p.name, seed: p.seed, origin: p.origin,
    warm: p.warm, stage: p.stage, organs: p.organs })),
  organs: S.plant.axes.reduce((n, a) => n + a.organs.length, 0),
  axes: S.plant.axes.length,
  // byte offsets into the .bin, all float32
  sections: {
    // pos3 nrm3 col3 emis1 — a non-indexed triangle soup
    tri: { offset: 0, floats: tri.length, stride: 10 },
    // a3 b3 w0 w1 col3 emis1 — one vein/needle/thin-stem segment
    seg: { offset: tri.byteLength, floats: seg.length, stride: 12 },
    // pos3 col3 size1
    pt: { offset: tri.byteLength + seg.byteLength, floats: pt.length, stride: 7 },
  },
  dropped: B.dropped,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(`${out}.json`, JSON.stringify(header, null, 2));
writeFileSync(`${out}.bin`, bin);

// WHAT THE FLOOR DID, PRINTED. The whole reason this export looked wrong for a
// day was a width distribution nobody was looking at, so it is in the summary
// now: if `at floor` is a large fraction, that is not a defect — it IS the
// mechanism by which the network stays visible.
const ws = [];
for (let i = 6; i < seg.length; i += 12) { ws.push(seg[i], seg[i + 1]); }
ws.sort((a, b) => a - b);
const q = (f) => ws.length ? ws[Math.min(ws.length - 1, Math.floor(f * ws.length))] : 0;
const atFloor = ws.filter(w => w <= wFloor * 1.0001).length / (ws.length || 1);

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`
  vein width  floor ${wFloor}  p10 ${q(0.1).toFixed(5)}  median ${q(0.5).toFixed(5)}  p90 ${q(0.9).toFixed(5)}  max ${(ws[ws.length - 1] || 0).toFixed(5)}
              ${(atFloor * 100).toFixed(1)}% of ribbon ends sit AT the floor
  ${name}  seed ${seed}  view ${viewName}  stage ${stage}
  hero: ${header.axes} axes, ${header.organs} organs${gardenPlan.length
    ? `\n  stand: ${gardenPlan.length} more, ${gardenPlan.reduce((n, p) => n + p.organs, 0)} organs (${gardenPlan.map(p => p.stage).join(', ')})`
    : ''}
  ${(tri.length / 30).toLocaleString()} triangles
  ${(seg.length / 12).toLocaleString()} segments (veins, needles, thin stems)
  ${(pt.length / 7).toLocaleString()} points
  bbox ${bb.slice(0, 3).map(v => v.toFixed(2)).join(', ')} .. ${bb.slice(3).map(v => v.toFixed(2)).join(', ')}
  height ${(bb[4] - bb[1]).toFixed(2)} units = ${((bb[4] - bb[1]) * WORLD.unitM).toFixed(2)} m

  ${out}.json + ${out}.bin  (${mb(bin.length)} MB)
`);
