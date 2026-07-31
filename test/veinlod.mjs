// VEIN LEVEL OF DETAIL: what it saves, and what it costs in light.
//
// The vein ribbons, not the blade mesh, are what a specimen costs to draw:
// crushing the lamina grid 30x moves the line count by nothing, because every
// segment of every leaf was drawn at every distance. `blade()` now draws only
// the veins a blade can resolve and folds the dropped light into the survivors.
//
// This harness ASSERTS, because both halves are physical claims with numbers
// worked out beforehand rather than emergent quantities to be read off:
//
//   1. cost falls monotonically with distance  — the cull actually culls
//   2. a far specimen costs under a tenth      — it culls enough to matter
//   3. emitted light does not move with it     — surface brightness is conserved
//
// (3) is the one that matters and the one no screenshot can check. An emissive
// surface looks equally bright per pixel however far away it is, so its light in
// WORLD units must not change with distance — and two separate things here push
// it around: the cull removes ribbons, and the per-blade width floor holds the
// survivors at 1.5 screen pixels, which makes them wider in world units the
// further off they are. Uncorrected, the second effect alone made a distant
// specimen fifteen times too bright.
//
// It is conserved to about 2% while a useful number of ribbons survive, and to
// about 12% on the two species that fall to under a tenth of one. The residual
// is that `veinLite` measures a segment in the leaf's MATERIAL space while the
// blade is drawn through `wAt`, and that approximation averages out over
// hundreds of ribbons and stops averaging when only a handful are left. At that
// point the specimen is around a dozen pixels tall, so the bound is set where
// the error stops being measurable rather than where it stops being real.
//
//   node test/veinlod.mjs [species]

import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { SPECIES } from '../src/70_app.js';
import { Buffers, blade, setView } from '../src/50_geom.js';

let failures = 0, checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (cond) { console.log(`  ok    ${label}${detail === undefined ? '' : `  (${detail})`}`); return; }
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}

function grow(name, seed = 7, steps = 2000) {
  const S = SPECIES[name];
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  const P = new Plant({ ...DEFAULT_PRM, ...S.prm }, { ...MERISTEM_DEFAULTS, ...S.mo }, sp, seed);
  for (let i = 0; i < steps; i++) P.step(1);
  return { P, pal: S.pal };
}

// Total emitted light actually in the line buffer: every ribbon is six vertices
// of pos3/col3/emis1, so summing emissive over vertices and weighting by the
// ribbon's screen area is what the bloom pass integrates. Area is taken from
// the geometry rather than from the model, which is the point — this measures
// what was DRAWN, not what was intended.
function drawnLight(B) {
  const L = B.line;
  let lit = 0;
  for (let i = 0; i < B.lineN; i += 42) {
    // vertices 0,1,2 and 0,2,3 of a quad: take the two triangles' areas
    const p = (k) => [L[i + k * 7], L[i + k * 7 + 1], L[i + k * 7 + 2]];
    const tri = (a, b, c) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
    };
    const a = p(0), b = p(1), c = p(2), d = p(5);
    lit += (tri(a, b, c) + tri(a, c, d)) * L[i + 6];
  }
  return lit;
}

// `grownOnly` draws the same canopy with every blade forced to dev 1.
//
// THE CULL DELIBERATELY EXEMPTS A BLADE THAT IS STILL CANALISING — see the
// `grown` note in `50_geom.js`, which says why (the baked light tables describe
// the whole network, and a half-drawn one relights 69% too bright) and names the
// cheap fix if it is ever needed. It was written when a specimen carried a
// hundred blades and nearly all of them were mature. Ashfall Spire carries six
// hundred and founds them all the way to the end, so a real share of its canopy
// is uncullable at any moment — 12% of its ribbons survive to sixteen focal
// lengths against 0.4% for a fern. That is the exemption's cost, not a failure
// of the cull, so it is measured separately and reported rather than folded into
// the law's own check.
function drawCanopy(B, P, pal, mu, mv, grownOnly) {
  B.reset();
  for (const a of P.axes) {
    for (const o of a.organs) {
      if (o.shed || !o.leaf) continue;
      blade(B, o.leaf, o.frame, o.len, o.len, pal, 0, 0, pal.glow || 1,
        mu, mv, grownOnly ? 1 : (o.dev || 1), 1, o.sen || 0);
    }
  }
}

const NAMES = process.argv[2] ? [process.argv[2]] : Object.keys(SPECIES);
// The app's own numbers: 1080p, 50 degree vertical fov, orbiting at ~7.5 units.
const H = 1080, FOV = 50 * Math.PI / 180;
const PX = 2 * Math.tan(FOV / 2) / H;
const FOCAL = 7.5;

console.log(`\nVEIN LOD — angular pixel ${PX.toExponential(2)} /unit, focal distance ${FOCAL}\n`);

const summary = [];
for (const name of NAMES) {
  const { P, pal } = grow(name);
  const nOrg = P.organCount();
  const fen = (SPECIES[name].sp.leafOpts || {}).fenestrate;
  const mu = nOrg > 42 ? (fen ? 17 : 13) : nOrg > 24 ? 18 : 22;
  const mv = nOrg > 42 ? (fen ? 9 : 6) : nOrg > 24 ? 8 : 10;

  console.log(`${name}  (${nOrg} organs)`);
  console.log('  ' + 'distance'.padStart(9) + 'kline old'.padStart(9) + 'new'.padStart(9)
    + 'ms old'.padStart(8) + 'new'.padStart(8) + 'ribbons'.padStart(8) + 'light'.padStart(9));

  // At every distance, draw it BOTH ways. The reference is not the focal-length
  // frame — it is the old renderer standing in the same place, because the old
  // renderer's own light grows with distance too (a clamped ribbon fattens in
  // world space as the pixel does) and comparing against focal would charge this
  // change for an artifact that was already there.
  const B = new Buffers(), Bo = new Buffers(), Bg = new Buffers(), Bgo = new Buffers();
  const rows = [];
  for (const mult of [1, 2, 4, 8, 16]) {
    const d = FOCAL * mult;
    const G = 25;
    // THE GARDEN CASE, which is the only one that matters: the camera is
    // orbiting the HERO at the focal distance — so the scene-wide floor stays
    // calibrated there — and this specimen is `d` away, further back in the
    // clearing. Moving the camera and the calibration together, which is what
    // the first version of this harness did, models a lone plant being backed
    // away from and can never produce a blade further off than the subject.
    setView([0, 1.0, d], FOCAL * PX * 1.5, PX);        // new: per-blade scale
    const t = process.hrtime.bigint();
    for (let g = 0; g < G; g++) drawCanopy(B, P, pal, mu, mv);
    const ms = Number(process.hrtime.bigint() - t) / 1e6 / G;
    setView([0, 1.0, d], FOCAL * PX * 1.5, 0);         // old: PXR 0, no cull
    const t2 = process.hrtime.bigint();
    for (let g = 0; g < G; g++) drawCanopy(Bo, P, pal, mu, mv);
    const msO = Number(process.hrtime.bigint() - t2) / 1e6 / G;
    // the same frame with every blade grown, which is the population the cull
    // law is stated over
    setView([0, 1.0, d], FOCAL * PX * 1.5, PX);
    drawCanopy(Bg, P, pal, mu, mv, true);
    const klineG = Bg.lineN / 14 / 1000;
    setView([0, 1.0, d], FOCAL * PX * 1.5, 0);
    drawCanopy(Bgo, P, pal, mu, mv, true);
    rows.push({ d, ms, msO,
      kline: B.lineN / 14 / 1000, klineO: Bo.lineN / 14 / 1000,
      klineG, klineGO: Bgo.lineN / 14 / 1000,
      light: drawnLight(B), lightO: drawnLight(Bo) });
  }
  for (const r of rows) {
    console.log('  ' + `${r.d.toFixed(0)}u`.padStart(9)
      + `${r.klineO.toFixed(1)}`.padStart(9) + `${r.kline.toFixed(1)}`.padStart(9)
      + `${r.msO.toFixed(2)}`.padStart(8) + `${r.ms.toFixed(2)}`.padStart(8)
      + `${(100 * r.kline / r.klineO).toFixed(0)}%`.padStart(8)
      + `${(100 * r.light / r.lightO).toFixed(1)}%`.padStart(9));
  }

  const focal = rows[0], far = rows[rows.length - 1];

  // (1) it culls, and monotonically — the whole point
  let mono = true;
  for (let i = 1; i < rows.length; i++) if (rows[i].kline > rows[i - 1].kline + 1e-9) mono = false;
  ok(mono, `${name}: line count falls monotonically with distance`);
  ok(far.klineG / far.klineGO < 0.1, `${name}: a GROWN distant specimen keeps under a tenth of its ribbons`,
    `${(100 * far.klineG / far.klineGO).toFixed(1)}% at ${far.d.toFixed(0)}u`);
  console.log(`  as it actually stands, with growing blades exempt: ${(100 * far.kline / far.klineO).toFixed(1)}%`
    + `  (${(100 * (far.kline - far.klineG) / far.klineO).toFixed(1)} points of that is the exemption)`);

  // (2) THE ONE THAT MATTERS, and the one a screenshot cannot check: at every
  // distance the blade must emit what the old renderer emitted from that spot.
  let worst = 0;
  for (const r of rows) worst = Math.max(worst, Math.abs(r.light / r.lightO - 1));
  ok(worst < 0.15, `${name}: emitted light matches the old renderer everywhere`,
    `worst ${(100 * worst).toFixed(2)}% over 1x-16x focal`);

  summary.push({ name, focal, far, worst });
  console.log('');
}

if (summary.length > 1) {
  const mean = (f) => summary.reduce((a, s) => a + f(s), 0) / summary.length;
  console.log('-'.repeat(72));
  console.log(`at the focal distance : ${mean(s => s.focal.klineO).toFixed(1)}k -> ${mean(s => s.focal.kline).toFixed(1)}k line,  ${mean(s => s.focal.msO).toFixed(2)} -> ${mean(s => s.focal.ms).toFixed(2)} ms`);
  console.log(`at 16x focal          : ${mean(s => s.far.klineO).toFixed(1)}k -> ${mean(s => s.far.kline).toFixed(1)}k line,  ${mean(s => s.far.msO).toFixed(2)} -> ${mean(s => s.far.ms).toFixed(2)} ms`);
  console.log(`worst light mismatch  : ${(100 * Math.max(...summary.map(s => s.worst))).toFixed(2)}%`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
