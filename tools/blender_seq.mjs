// A LIFE, FRAME BY FRAME. The growth arc exported as a sequence of specimens.
//
//   node tools/blender_seq.mjs                                  # Ember Creeper 7, whole arc
//   node tools/blender_seq.mjs 'Cathedral Fern' 21 3000
//   FPS=24 FROM=0 TO=485 OUT=export/film node tools/blender_seq.mjs
//
// Writes `<out>/f0000.json` + `f0000.bin` per frame and `<out>/seq.json`, a
// manifest. `tools/blender_clip.mjs` renders them.
//
// ⚠ THERE IS NO TIMELAPSE HERE, AND THE WORD WAS THE MISTAKE.
//
// The simulation runs at 125 steps per second — `WORLD.ptPerSec`, and
// `App.step()` matches it exactly (`_acc += speedMul * dtms / 8`, six steps
// capped per frame). An Ember Creeper reaches peak at step 2527. That is
// **20.2 seconds of real time for an entire life**, so a film of the whole arc
// at 24 fps is 485 frames at a stride of 5.21 steps, played at NATURAL SPEED.
//
// This matters for more than naming. A timelapse would have had to pick a
// stride, and a stride is a sampling rate: the stem's own bending mode is
// 0.56-0.64 Hz and the fastest gust in the shipped field is 1.78 Hz, so
// anything below ~3.6 Hz aliases the wind into a judder that looks like a bug
// in the solver. At 24 fps there is no aliasing anywhere in the clip and the
// growth and the wind are the same footage. The dichotomy this was going to be
// built around — a growth timelapse OR a wind clip — was false.
//
// ⚠ AND THE TOPOLOGY CHANGES EVERY FRAME, so this is a sequence of separate
// specimens and NOT a deforming mesh. There is no shape-key or mesh-cache route
// to a growing plant: organs appear, axes branch, the vein network canalises new
// strands. A frame costs a full export. Measured on the shipped hero that is
// 13.4 MB mean and 25.2 MB at peak (211k triangles, 21k strands) — a stand is
// 128 MB a frame, which is why the film is one specimen and a sky rather than
// one specimen and a clearing.

import { App, SPECIES } from '../src/70_app.js';
import { Buffers, setView } from '../src/50_geom.js';
import { WORLD } from '../src/37_wind.js';
import { v3 } from '../src/00_math.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

// Copied from `blender_export.mjs`, which copied it from `test/views.mjs`, and
// copied rather than shared for the reason stated there: this list is every
// property `makeSpecimen` and `drawSpecimen` read off `this`, and if it grows
// all three files should break loudly rather than one shared copy quietly
// drawing a different program in all of them.
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

function grown(a) { const b = new Float32Array(a.length * 2); b.set(a); return b; }

class Capture extends Buffers {
  constructor() {
    super();
    this.seg = new Float32Array(1 << 20);
    this.segN = 0;
    this.dropped.seg = 0;
  }
  vert(p, n, c, e) { if (this.triN + 10 > this.tri.length) this.tri = grown(this.tri); super.vert(p, n, c, e); }
  point(p, c, s) { if (this.ptN + 7 > this.pt.length) this.pt = grown(this.pt); super.point(p, c, s); }
  ribbon(a, b, side, w0, w1, c, e) {
    if (this.segN + 12 > this.seg.length) this.seg = grown(this.seg);
    const s = this.seg; let i = this.segN;
    s[i] = a[0]; s[i + 1] = a[1]; s[i + 2] = a[2];
    s[i + 3] = b[0]; s[i + 4] = b[1]; s[i + 5] = b[2];
    s[i + 6] = w0; s[i + 7] = w1;
    s[i + 8] = c[0]; s[i + 9] = c[1]; s[i + 10] = c[2];
    s[i + 11] = e;
    this.segN = i + 12;
  }
}

// --- arguments -------------------------------------------------------------
const name = process.argv[2] || 'Ember Creeper';
const seed = +(process.argv[3] || 7);
const steps = +(process.argv[4] || 2527);
const fps = +(process.env.FPS || 24);
const viewName = process.env.VIEW || 'natural';
const mesh = process.env.MESH || 'full';
const out = process.env.OUT || `export/${name.toLowerCase().replace(/\W+/g, '_')}_${seed}_seq`;
// FROM/TO are FRAME indices, so a pilot is a slice of the real film rather than
// a different render. The plant is still stepped from zero either way — growth
// is a state, not a function of the frame index, and a plant cannot be rewound.
const from = +(process.env.FROM || 0);
const toEnv = process.env.TO;

if (!SPECIES[name]) {
  console.error(`no such species: ${name}\n  ${Object.keys(SPECIES).join('\n  ')}`);
  process.exit(1);
}

// The shipped width floor, read off the shipped file — see `blender_export.mjs`
// for why this is grepped rather than copied.
const src = readFileSync(new URL('../src/50_geom.js', import.meta.url), 'utf8');
const m = src.match(/\bMINW\s*=\s*([0-9.eE+-]+)/);
if (!m) {
  console.error(`could not read MINW's default out of src/50_geom.js — has it been renamed?`);
  process.exit(1);
}
const wFloor = process.env.WFLOOR !== undefined ? +process.env.WFLOOR : +m[1];

// THE STRIDE IS NOT AN INTEGER AND MUST NOT BE ROUNDED. 125/24 = 5.2083. Rounded
// to 5 the clip runs 4% fast; rounded to 6 it runs 15% slow, and "the wind looks
// too quick" is a complaint this project has already fielded twice for other
// reasons. The frame's step count is carried as a running accumulator so the
// error never accumulates past one step.
const stride = WORLD.ptPerSec / fps;
const nFrames = Math.floor(steps / stride);
const to = toEnv !== undefined ? Math.min(+toEnv, nFrames) : nFrames;

console.log(`${name} seed ${seed}: ${steps} steps = ${(steps / WORLD.ptPerSec).toFixed(2)}s`);
console.log(`  ${nFrames} frames at ${fps} fps, stride ${stride.toFixed(4)} steps/frame`);
console.log(`  writing frames ${from}..${to - 1} to ${out}/\n`);

mkdirSync(out, { recursive: true });
setView(v3(0, 4, 15), wFloor, 0);

const app = standIn({ viewName });
if (mesh === 'full') { app.bladeMU = 1e9; app.bladeMV = 1e9; app.bladeRef = 1e-9; }
const S = App.prototype.makeSpecimen.call(app, name, seed);

const frames = [];
// The union of every frame's bounds. THE RIG IS COMPOSED FROM THIS AND NOT FROM
// A FRAME. `film()` places every lamp at a multiple of `r` and powers it at
// `r*r`, and `r` is the subject's own extent — so a rig rebuilt per frame from
// that frame's bbox would light a seedling with a seedling's key and the grown
// plant with a grown plant's, and the exposure would crawl the whole clip. The
// consumer passes `span`/`pivot` off this manifest, once, and never moves them.
const all = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

let done = 0, bytes = 0;
const t0 = Date.now();
for (let f = 0; f < to; f++) {
  const target = Math.round((f + 1) * stride);
  while (done < target) { S.plant.step(1); done++; }
  if (f < from) continue;

  const B = new Capture();
  App.prototype.drawSpecimen.call(app, B, S, null);

  const sat = B.saturated();
  if (sat) {
    console.error(`  !! frame ${f}: BUFFER SATURATED — ${JSON.stringify(sat)}`);
    process.exit(1);
  }

  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const g = (x, y, z) => {
    if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (z < bb[2]) bb[2] = z;
    if (x > bb[3]) bb[3] = x; if (y > bb[4]) bb[4] = y; if (z > bb[5]) bb[5] = z;
  };
  for (let i = 0; i < B.triN; i += 10) g(B.tri[i], B.tri[i + 1], B.tri[i + 2]);
  for (let i = 0; i < B.segN; i += 12) { g(B.seg[i], B.seg[i + 1], B.seg[i + 2]); g(B.seg[i + 3], B.seg[i + 4], B.seg[i + 5]); }
  for (let i = 0; i < B.ptN; i += 7) g(B.pt[i], B.pt[i + 1], B.pt[i + 2]);
  for (let i = 0; i < 3; i++) { if (bb[i] < all[i]) all[i] = bb[i]; if (bb[i + 3] > all[i + 3]) all[i + 3] = bb[i + 3]; }

  const tri = B.tri.subarray(0, B.triN);
  const seg = B.seg.subarray(0, B.segN);
  const pt = B.pt.subarray(0, B.ptN);
  const bin = Buffer.concat([
    Buffer.from(tri.buffer, tri.byteOffset, tri.byteLength),
    Buffer.from(seg.buffer, seg.byteOffset, seg.byteLength),
    Buffer.from(pt.buffer, pt.byteOffset, pt.byteLength),
  ]);

  const tag = String(f).padStart(4, '0');
  const stage = S.plant.stage();
  const organs = S.plant.axes.reduce((n, a) => n + a.organs.length, 0);
  const header = {
    format: 'canalisation-specimen-1',
    species: name, seed, steps: done, view: viewName, stage,
    frame: f, fps, simSeconds: done / WORLD.ptPerSec,
    unitM: WORLD.unitM, wFloor,
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
    heroBbox: { min: bb.slice(0, 3), max: bb.slice(3) },
    garden: [],
    organs, axes: S.plant.axes.length,
    sections: {
      tri: { offset: 0, floats: tri.length, stride: 10 },
      seg: { offset: tri.byteLength, floats: seg.length, stride: 12 },
      pt: { offset: tri.byteLength + seg.byteLength, floats: pt.length, stride: 7 },
    },
    dropped: B.dropped,
  };
  writeFileSync(`${out}/f${tag}.json`, JSON.stringify(header));
  writeFileSync(`${out}/f${tag}.bin`, bin);
  bytes += bin.length;

  frames.push({ frame: f, step: done, t: done / WORLD.ptPerSec, stage, organs,
    tris: tri.length / 30, segs: seg.length / 12,
    height: (bb[4] - bb[1]) * WORLD.unitM, mb: +(bin.length / 1048576).toFixed(2) });

  if (f % 24 === 0 || f === to - 1) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  f${tag}  t=${(done / WORLD.ptPerSec).toFixed(2)}s  ${stage.padEnd(10)}  ` +
      `${String(organs).padStart(4)} organs  ${String(Math.round(tri.length / 30)).padStart(7)} tris  ` +
      `${(bb[4] - bb[1]) * WORLD.unitM > 0 ? ((bb[4] - bb[1]) * WORLD.unitM).toFixed(3) : '0.000'} m  ` +
      `${(bin.length / 1048576).toFixed(1)} MB  [${el.toFixed(0)}s]`);
  }
}

const manifest = {
  format: 'canalisation-sequence-1',
  species: name, seed, view: viewName, wFloor, unitM: WORLD.unitM,
  fps, stride, steps, ptPerSec: WORLD.ptPerSec,
  first: from, last: to - 1, count: frames.length,
  seconds: frames.length / fps,
  // The union bbox over the WHOLE clip. A consumer composing a fixed frame
  // wants this and not any single frame's.
  bbox: { min: all.slice(0, 3), max: all.slice(3) },
  heightM: (all[4] - all[1]) * WORLD.unitM,
  frames,
};
writeFileSync(`${out}/seq.json`, JSON.stringify(manifest, null, 2));

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`
  ${frames.length} frames, ${(frames.length / fps).toFixed(2)}s at ${fps} fps
  ${mb(bytes)} MB total, ${(bytes / 1048576 / frames.length).toFixed(1)} MB mean
  clip bbox ${all.slice(0, 3).map(v => v.toFixed(2)).join(', ')} .. ${all.slice(3).map(v => v.toFixed(2)).join(', ')}
  final height ${((all[4] - all[1]) * WORLD.unitM).toFixed(3)} m
  ${out}/seq.json
`);
