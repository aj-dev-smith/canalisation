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
import { v3 } from '../src/00_math.js';
import { writeFileSync, mkdirSync } from 'node:fs';
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
// across. `minWorld` is small for the same reason — `MINW` is a *pixel* floor
// on ribbon width, and a floor measured in pixels has no meaning here. Setting
// it to a real vein's own scale is what keeps the hierarchy legible as
// thickness instead of flattening the thin ones onto one width.
setView(v3(0, 4, 15), 1e-4, 0);

const B = new Capture();
App.prototype.drawSpecimen.call(app, B, S, null);

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

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`
  ${name}  seed ${seed}  view ${viewName}  stage ${stage}
  ${header.axes} axes, ${header.organs} organs
  ${(tri.length / 30).toLocaleString()} triangles
  ${(seg.length / 12).toLocaleString()} segments (veins, needles, thin stems)
  ${(pt.length / 7).toLocaleString()} points
  bbox ${bb.slice(0, 3).map(v => v.toFixed(2)).join(', ')} .. ${bb.slice(3).map(v => v.toFixed(2)).join(', ')}
  height ${(bb[4] - bb[1]).toFixed(2)} units = ${((bb[4] - bb[1]) * WORLD.unitM).toFixed(2)} m

  ${out}.json + ${out}.bin  (${mb(bin.length)} MB)
`);
