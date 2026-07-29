// RENDER VIEWS: what each one costs, and whether the cell table is honest.
//
//   node test/views.mjs            # one specimen and a garden of eight
//   node test/views.mjs 'Sun Coral'   # named species, and NO garden — much faster
//
// The garden of eight is most of the runtime (~35s of ~41s) and it is there for one
// reason: it is the heaviest configuration the scene can reach, and therefore the
// only one that can prove a buffer is not silently dropping geometry. Naming a
// species skips it, which is what you want while iterating. CI does not name one.
//
// This gates, and gating it roughly doubled CI — 123s to 401s at first, before the
// memoisation below. That is a real cost and it was taken deliberately: what this
// covers is the class of thing that would be silently wrong in every view at once.
//
// This one ASSERTS and exits non-zero, which puts it with `smoke`, `wind`,
// `stem`, `petiole` and `veinlod` rather than with the printing harnesses. The
// split is the project's epistemics: an emergent quantity must not be pinned
// down in a test, but everything here is mechanical. The cell table is a cache
// of a computation, so it either reproduces that computation or it is a bug.
// The level of detail claims to conserve drawn area, which is a number worked
// out beforehand. And a buffer either has room or silently drops geometry.
//
// It drives the SHIPPED `drawSpecimen` through a stand-in App rather than
// keeping its own copy of the draw. `test/stem.mjs` used to hardcode a wind
// speed the app had moved on from and went on faithfully reporting a scene that
// no longer existed; a harness with its own copy of the renderer would do the
// same thing, more quietly.

import { App, SPECIES, VIEWS } from '../src/70_app.js';
import { DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { Buffers, laminaCells, setView } from '../src/50_geom.js';
import { windField, WIND_DEFAULTS } from '../src/37_wind.js';
import { v3, clamp } from '../src/00_math.js';

let failures = 0, checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (cond) return;
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}
function section(n) { console.log('\n' + n); }

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 4200);

// --- a stand-in App --------------------------------------------------------
//
// `drawSpecimen` and `makeSpecimen` are methods, and everything they read off
// `this` is listed here. That list is the point: if it grows, this breaks
// loudly rather than testing a different program.
function standIn(over) {
  return {
    cam: { eye: v3(0, 4, 15), dist: 15, fov: 0.72 },
    viewName: 'natural',
    view: App.prototype.view,
    setBladeLOD: App.prototype.setBladeLOD,
    bladeMU: 22, bladeMV: 10,
    detail: 0, t: 12000,
    _watch: null, _replay: null,
    showMeristem: true,
    ringWidth: 0, windU: undefined, senesceHeld: false,
    ...over,
  };
}

// GROWING A SPECIMEN IS THE ENTIRE COST OF THIS HARNESS — 4,200 steps apiece, and
// the draws being measured are milliseconds. Four of the sections below want the
// same Cathedral Fern, and growing it four times took CI from 123s to 401s when
// this became a gate. Memoised by everything that determines the plant.
const _grown = new Map();
function grow(name, seed, origin, wind) {
  const key = `${name}|${seed}|${origin ? origin.join(',') : ''}|${wind ? 'w' : ''}`;
  if (_grown.has(key)) return _grown.get(key);
  const app = standIn();
  const S = App.prototype.makeSpecimen.call(app, name, seed, origin, wind);
  for (let s = 1; s <= STEPS; s++) S.plant.step(1);
  _grown.set(key, S);
  return S;
}

// A camera that frames the thing, so the level of detail is exercised at the
// distance it was designed for rather than at an arbitrary one.
function frame(bb, app) {
  const r = Math.max(bb.w, bb.h) * 0.5;
  const d = Math.max(3, r / Math.tan(app.cam.fov / 2) * 1.15);
  app.cam.dist = d;
  app.cam.eye = v3(bb.cx, bb.cy + d * 0.22, bb.cz + d);
  const px = 2 * Math.tan(app.cam.fov / 2) / 1000;   // a 1000px-tall frame
  setView(app.cam.eye, d * px * 1.5, px);
  return d;
}

// ---------------------------------------------------------------------------
section('the ribbon emitter is unchanged');
// ---------------------------------------------------------------------------
// `Buffers.ribbon` was rewritten to write straight into the buffer instead of
// building four corner arrays. Every vein and every needle in every view goes
// through it, so a transposed component or a flipped winding would be a subtle
// wrongness everywhere at once and nothing else here would notice.
//
// The reference below is the code it replaced, written out. That is the point:
// a check whose reference is the thing being checked is not a check — the same
// reason `test/petiole.mjs` keeps a second pipe model and `39a_stem.js` keeps
// `cantileverHz`.
{
  const B = new Buffers();
  const a = [1.5, -2.25, 0.75], b = [-0.5, 3.0, 2.25], side = [0.6, 0.0, -0.8];
  const w0 = 0.037, w1 = 0.019, col = [0.2, 0.55, 0.9], e = 1.75;
  B.ribbon(a, b, side, w0, w1, col, e);

  const ref = [];
  const gv = (p) => ref.push(p[0], p[1], p[2], col[0], col[1], col[2], e);
  const a0 = [a[0] - side[0] * w0, a[1] - side[1] * w0, a[2] - side[2] * w0];
  const a1 = [a[0] + side[0] * w0, a[1] + side[1] * w0, a[2] + side[2] * w0];
  const b0 = [b[0] - side[0] * w1, b[1] - side[1] * w1, b[2] - side[2] * w1];
  const b1 = [b[0] + side[0] * w1, b[1] + side[1] * w1, b[2] + side[2] * w1];
  gv(a0); gv(a1); gv(b1); gv(a0); gv(b1); gv(b0);

  ok(B.lineN === 42, 'a ribbon is six vertices of seven floats', B.lineN);
  // `Math.fround`, because the buffer is a Float32Array and the reference above
  // is computed in float64. Without it this reports a 1e-7 mismatch that is the
  // store rounding and nothing else — which it did, on the first run.
  let worst = 0;
  for (let i = 0; i < 42; i++) worst = Math.max(worst, Math.abs(B.line[i] - Math.fround(ref[i])));
  ok(worst === 0, 'and every float matches the formulation it replaced', worst);
}

// ---------------------------------------------------------------------------
section('the cell table reproduces the live path');
// ---------------------------------------------------------------------------
// A cache whose reference is itself is not a check. This forces both branches
// of `laminaCells` over the same leaf and compares what came out.
{
  const S = grow(only || 'Cathedral Fern', 21);
  // THE LEVEL OF DETAIL OFF, which is what a zero angular pixel size means —
  // the same switch `app.veinLOD = false` throws. Comparing the two paths with
  // it on compares a culled table against an unculled live pass and reports a
  // difference that is the cull working. That is measured in the next section,
  // on its own.
  setView(v3(0, 4, 15), 0.004, 0);
  const org = S.plant.axes.flatMap(a => a.organs)
    .find(o => !o.shed && o.leaf && o.leaf.mature && o.len > 0.05);
  ok(!!org, 'found a mature blade to compare');
  if (org) {
    const L = org.leaf, bl = org.len;
    const draw = () => {
      const B = new Buffers();
      laminaCells(B, L, org.frame, bl, bl, S.pal, -bl * 0.16, bl * 0.014,
        12000, 1, 1, 0);
      return B;
    };
    // the table path
    const Bt = draw();
    // and the live one, with the table refused
    delete L._cells;
    const wasMature = L.mature;
    L.mature = false;
    const Bl = draw();
    L.mature = wasMature;
    delete L._cells;

    ok(Bt.ptN === Bl.ptN, 'same number of points emitted',
      `${Bt.ptN / 7} baked vs ${Bl.ptN / 7} live`);
    ok(Bt.lineN === Bl.lineN, 'same number of needle ribbons emitted',
      `${Bt.lineN / 42} baked vs ${Bl.lineN / 42} live`);

    // The table is stored in a hashed order, so compare as multisets: sort the
    // records by position and walk them together.
    const recs = (B, stride) => {
      const out = [];
      for (let i = 0; i < (stride === 7 ? B.ptN : B.lineN); i += stride) {
        out.push(B[stride === 7 ? 'pt' : 'line'].slice(i, i + stride));
      }
      out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
      return out;
    };
    const pt = recs(Bt, 7), pl = recs(Bl, 7);
    let worst = 0, wk = -1;
    for (let i = 0; i < Math.min(pt.length, pl.length); i++) {
      for (let k = 0; k < 7; k++) {
        const d = Math.abs(pt[i][k] - pl[i][k]);
        if (d > worst) { worst = d; wk = k; }
      }
    }
    // float32 round trips through the table; anything structural is far larger
    ok(worst < 1e-5, 'every cell agrees, position colour and size',
      `worst component drift ${worst.toExponential(2)} on field ${wk}`);
    console.log(`  ${pt.length} cells compared, worst drift ${worst.toExponential(2)}`);
  }
}

// ---------------------------------------------------------------------------
section('the level of detail conserves drawn area');
// ---------------------------------------------------------------------------
// A receding emissive surface must look equally bright per pixel, so the total
// area it draws in world units must not move with distance. That is the same
// invariant `blade()`'s `relight` obeys for ribbons, stated for discs — and it
// is a number worked out beforehand rather than read off the picture.
{
  const S = grow(only || 'Cathedral Fern', 21);
  const org = S.plant.axes.flatMap(a => a.organs)
    .find(o => !o.shed && o.leaf && o.leaf.mature && o.len > 0.05);
  const L = org.leaf, bl = org.len;
  const areaAt = (dist) => {
    const px = 2 * Math.tan(0.72 / 2) / 1000;
    // hold the reference distance fixed and move only the eye, which is what a
    // background specimen actually does
    setView(v3(org.frame.o[0], org.frame.o[1], org.frame.o[2] + dist), 6 * px * 1.5, px);
    const B = new Buffers();
    laminaCells(B, L, org.frame, bl, bl, S.pal, -bl * 0.16, bl * 0.014, 12000, 0, 1, 0);
    let a = 0, n = 0;
    for (let i = 0; i < B.ptN; i += 7) { const r = B.pt[i + 6]; a += r * r; n++; }
    return { a, n };
  };
  const near = areaAt(6);
  console.log('  eye distance   cells drawn   total drawn area (r^2)');
  let allOk = true;
  for (const d of [6, 12, 24, 48, 96]) {
    const r = areaAt(d);
    const rel = r.a / near.a;
    console.log(`  ${String(d).padStart(11)}   ${String(r.n).padStart(11)}   ${rel.toFixed(3)}x`);
    // the count is rounded to whole cells, so the tail is granular; 8% is well
    // inside that and nowhere near the 15x error an unconserved cull produces
    if (Math.abs(rel - 1) > 0.08) allOk = false;
  }
  ok(allOk, 'drawn area holds within 8% from 6 to 96 units');
  ok(areaAt(96).n < near.n / 8, 'and the cull is actually culling',
    `${areaAt(96).n} of ${near.n} at sixteen times the distance`);
}

// ---------------------------------------------------------------------------
section('what each view costs');
// ---------------------------------------------------------------------------
const CAPS = { tri: (1 << 23), line: (1 << 23), pt: null };   // pt read below

function measure(specimens, app) {
  const B = new Buffers();
  if (CAPS.pt === null) CAPS.pt = B.pt.length;
  const run = () => {
    B.reset();
    for (const S of specimens) App.prototype.drawSpecimen.call(app, B, S, null);
  };
  for (let i = 0; i < 3; i++) run();
  const t0 = process.hrtime.bigint();
  const N = 12;
  for (let i = 0; i < N; i++) run();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
  return { ms, tri: B.triN / 30, line: B.lineN / 42, pt: B.ptN / 7,
    triF: B.triN / B.tri.length, lineF: B.lineN / B.line.length, ptF: B.ptN / B.pt.length,
    dropped: B.saturated() };
}

function report(title, specimens) {
  console.log(`\n  ${title}`);
  console.log('  view        ms    triangles     ribbons       points   buffers (tri/line/pt)');
  const app = standIn();
  // the clearing, not the subject — same distinction `App.sceneBounds` makes
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const S of specimens) {
    const b = S.plant.bounds();
    x0 = Math.min(x0, b.cx - b.w / 2); x1 = Math.max(x1, b.cx + b.w / 2);
    z0 = Math.min(z0, b.cz - b.w / 2); z1 = Math.max(z1, b.cz + b.w / 2);
    y0 = Math.min(y0, b.cy - b.h / 2); y1 = Math.max(y1, b.cy + b.h / 2);
  }
  frame({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2,
    w: Math.max(x1 - x0, z1 - z0), h: y1 - y0 }, app);
  app.setBladeLOD(specimens);   // a stand gets a stand's mesh density
  console.log(`  ${specimens.length} specimen(s), blade mesh ${app.bladeMU}x${app.bladeMV}`);
  const rows = {};
  for (const name of Object.keys(VIEWS)) {
    app.viewName = name;
    const r = measure(specimens, app);
    rows[name] = r;
    console.log(`  ${name.padEnd(9)} ${r.ms.toFixed(2).padStart(5)}` +
      `${String(r.tri | 0).padStart(13)}${String(r.line | 0).padStart(12)}` +
      `${String(r.pt | 0).padStart(13)}   ` +
      `${(r.triF * 100).toFixed(0)}% / ${(r.lineF * 100).toFixed(0)}% / ${(r.ptF * 100).toFixed(0)}%`);
    // A full buffer used to drop geometry silently, so the failure was a
    // picture that is merely missing things. `Buffers.saturated()` reports it
    // now, and this is the check that reads the report.
    ok(!r.dropped, `${name}: nothing was dropped`,
      r.dropped && JSON.stringify(r.dropped));
    ok(r.triF < 0.95 && r.lineF < 0.95 && r.ptF < 0.95, `${name}: buffers have headroom`,
      `${(r.triF * 100).toFixed(0)}/${(r.lineF * 100).toFixed(0)}/${(r.ptF * 100).toFixed(0)}%`);
    ok(r.tri + r.line + r.pt > 100, `${name}: draws something`);
  }
  return rows;
}

{
  const one = report('one specimen, framed',
    [grow(only || 'Cathedral Fern', 21)]);

  // WHERE THE TIME GOES, channel by channel. Same specimen, same framing, with
  // one channel switched on at a time — so the cost of a view is readable as a
  // sum rather than guessed at. This is what stops the next person tuning the
  // wrong knob: the answer has been surprising twice already.
  console.log('\n  one channel at a time');
  const S1 = grow(only || 'Cathedral Fern', 21);
  const app = standIn();
  frame(S1.plant.bounds(), app);
  app.setBladeLOD([S1]);
  const base = { lamina: 0, veins: 0, cells: 0, needles: 0, fruitSolid: false,
    stem: 0, stemSolid: false, meristem: 0, spores: false };
  const channels = [
    ['stem only', { ...base, stem: 1, stemSolid: true }],
    ['lamina surface', { ...base, lamina: 1 }],
    ['vasculature', { ...base, veins: 1 }],
    ['cells', { ...base, cells: 1 }],
    ['cells + needles', { ...base, cells: 1, needles: 1 }],
    ['needles, no cells', { ...base, needles: 1 }],
  ];
  for (const [label, v] of channels) {
    VIEWS.__probe = v;
    app.viewName = '__probe';
    const r = measure([S1], app);
    console.log(`  ${label.padEnd(20)} ${r.ms.toFixed(2).padStart(6)} ms   ` +
      `${String(r.tri | 0).padStart(7)} tri  ${String(r.line | 0).padStart(7)} rib  ` +
      `${String(r.pt | 0).padStart(7)} pt`);
  }
  delete VIEWS.__probe;

  // WHAT THE TABLE BUYS, measured on the shipped draw rather than in the
  // abstract. Refusing the table sends every organ down the live path, which is
  // what `laminaCells` did for every caller before this branch.
  console.log('');
  const leaves = new Set();
  for (const ax of S1.plant.axes) for (const o of ax.organs) {
    if (o.leaf && o.leaf.mature) leaves.add(o.leaf);
  }
  VIEWS.__probe = { ...base, cells: 1, needles: 1 };
  app.viewName = '__probe';
  const baked = measure([S1], app);
  for (const L of leaves) { L._cells = null; L.mature = false; }
  const live = measure([S1], app);
  for (const L of leaves) { L.mature = true; delete L._cells; }
  delete VIEWS.__probe;
  console.log(`  whole plant at cell resolution: ${live.ms.toFixed(2)} ms live, ` +
    `${baked.ms.toFixed(2)} ms from the table  (${(live.ms / baked.ms).toFixed(1)}x)`);
  console.log(`  ${leaves.size} distinct leaves across ` +
    `${S1.plant.axes.reduce((a, x) => a + x.organs.length, 0)} organs`);
  ok(baked.ms < live.ms * 0.6, 'the cell table is worth having',
    `${baked.ms.toFixed(2)}ms baked vs ${live.ms.toFixed(2)}ms live`);
  // The claim this branch rests on, and it is a bounded one rather than a win.
  // `cells` REPLACES the lamina, so it is judged against `natural` and not
  // against zero — and it comes out dearer, not cheaper, which is worth having
  // written down because the first version of this test asserted the opposite
  // on the strength of a prototype that skipped the material-to-world map.
  //
  // The bound is what matters: a whole plant at the resolution the solver runs
  // at is the same ORDER as a plant drawn as surfaces, not an order above it.
  // That is the difference between a view and a demo.
  ok(one.cells.ms < one.natural.ms * 2,
    'the cell view stays within twice the lamina it replaces',
    `${one.cells.ms.toFixed(2)}ms vs ${one.natural.ms.toFixed(2)}ms`);
  ok(one.field.ms < one.natural.ms,
    'and the instrument view, which is cells alone, is cheaper than either',
    `${one.field.ms.toFixed(2)}ms vs ${one.natural.ms.toFixed(2)}ms`);
}

if (!only) {
  const wind = windField({ ...WIND_DEFAULTS });
  const names = Object.keys(SPECIES);
  const stand = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    stand.push(grow(names[i % names.length], 100 + i * 37,
      v3(Math.cos(a) * 9, 0, Math.sin(a) * 9), wind));
  }
  report('a garden of eight, framed as a stand', stand);
}

console.log(`\n${failures ? `${failures} FAILED of ${checks}` : `all ${checks} checks passed`}`);
process.exit(failures ? 1 : 0);
