// HOW MUCH OF ANYTHING IS THERE? — the quantity harness this project did not have.
//
// CLAUDE.md states the gap in as many words: "There is still no harness here that
// measures how much of anything there is; density was checked by rasterising a
// silhouette in a scratch script." That script is gone, so TUNING's fill ladder —
// the table that decided `budTake`, `organBudget` and `organLen` for the conifer —
// is currently a set of numbers nobody can reproduce. ROADMAP 13 item 0 asks for
// that ladder to be re-run from scratch on needles, which cannot mean anything
// until the instrument exists again.
//
//   node test/crown.mjs                    # the shipped Ashfall Spire
//   node test/crown.mjs '{"ay":0.008}'     # patch marginBias.ay
//   node test/crown.mjs '{"ay":0.008,"organLen":4.5}'
//
// ---------------------------------------------------------------------------
// WHAT FILL IS, AND THE TRAP IT SITS IN
//
// `fill` is ink over the crown's OWN rasterised outline, per row. The outline is
// read off the ink itself — leftmost and rightmost covered column in that row —
// so a crown is not rewarded for being wider, only for being solid inside
// whatever silhouette it has. TUNING records the alternative that failed: needle
// area over silhouette area returns ~0.28 for every variant including ones that
// plainly differ, because both terms scale together. Two wrong diagnoses came
// out of that before anyone noticed.
//
// THE TRAP THIS ONE SITS IN IS RESOLUTION, and it is about to matter more than
// it ever has. Fill is a pixel-coverage statistic, so it is only meaningful at a
// stated raster. A blade thinner than one cell either vanishes or bloats to a
// full cell depending on how the sampler rounds, and ROADMAP 13 item 0 is
// precisely a proposal to make the blades 4.5x thinner. A ladder measured on
// paddles at one resolution and re-run on needles at the same resolution is
// therefore not a controlled comparison — the needle is being measured by an
// instrument whose quantisation it has moved into.
//
// So every number here is reported at four rasters, and the ratio between
// variants is only believable where it is stable across them. Where it is not,
// this file says so out loud rather than printing one number.
//
// The rasters are matched to how the piece is actually looked at: a 46-unit
// spire framed to the height of a 1080-tall portrait window is ~23 px per world
// unit at the whole-tree framing, and `tools/tree_shot.mjs` exists because that
// framing is the only one that can answer "is it sparse". The coarse rows are
// kept because they are what an ASCII crown draws at, and because a statistic
// that only holds at one raster is not a statistic.
//
// ---------------------------------------------------------------------------
// WHAT IS AND IS NOT ASSERTED
//
// Fill is an EMERGENT quantity. Pinning it in a test would convert it into an
// imposed one, which is the split CLAUDE.md draws between the chemistry and the
// mechanics, so nothing here asserts a fill value. What IS asserted is the
// instrument: that the rasteriser conserves drawn area under a change of
// resolution, and that it responds to width at all. A metric that cannot see the
// knob it is being used to set is the `domin` trap from `test/venation.mjs`
// arriving a second time, and that one is kept in the output specifically so it
// stays visible.
//
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';

const OVER = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const STEPS = +(process.env.STEPS || 9000);
const SEEDS = (process.env.SEEDS || '11,29').split(',').map(Number);

let fails = 0;
const check = (label, ok, got, want) => {
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}\n         got ${got}   want ${want}`);
  if (!ok) fails++;
};

// ---------------------------------------------------------------------------
// GROW ONE
//
// Arrested, not merely old. TUNING records a cost sweep that reported the tree
// getting CHEAPER as it got bigger, because at the larger budget it had not
// arrested yet and a live meristem is a different program from a retired one.
// The same hazard applies to shape: a crown still putting out branches is not
// the crown anyone will see.
function grow(over, seed) {
  const S = SPECIES['Ashfall Spire'];
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  sp.marginBias = { ...(S.sp.marginBias || {}) };
  // the knobs this file exists to sweep
  if (over.ay !== undefined) sp.marginBias.ay = over.ay;
  // `aspectFloor` clamps the blade's aspect in `30_leaf.js` and TUNING records it
  // as never biting, on a measurement taken when this species wore a PADDLE at
  // aspect 0.193. A needle lives at 0.04-0.06, which is the floor itself, so it
  // is a live knob here and has to be sweepable.
  if (over.aspectFloor !== undefined) sp.leafOpts.aspectFloor = over.aspectFloor;
  for (const k of ['organLen', 'organBudget', 'budTake', 'maxOrgans', 'maxAxes', 'organTilt',
    // HOW DENSELY NEEDLES PACK ALONG A SHOOT, which is the axis that does not
    // widen the crown. Every other way of adding foliage lengthens an axis and
    // grows the silhouette as fast as it fills it.
    'minInternode', 'internode', 'elongation',
    // HOW MANY ORDERS OF BRANCHING, and it was missing from this list — which
    // matters more than a missing knob usually does. `maxGen: 2` was rejected on
    // "fill 0.281 -> 0.268", and 0.281 is the signature of the metric the very
    // next paragraph of that JOURNAL entry retracts: needle area over silhouette
    // area, which "came back 0.28 for every variant including ones that plainly
    // differed". This raster metric is the replacement, and until now it could
    // not be pointed at the one change the broken metric killed.
    'maxGen'])
    if (over[k] !== undefined) sp[k] = over[k];

  const P = new Plant({ ...DEFAULT_PRM, ...S.prm }, { ...MERISTEM_DEFAULTS, ...S.mo }, sp, seed);
  let arrested = -1;
  for (let s = 1; s <= STEPS; s++) {
    P.step(1);
    if (arrested < 0 && P.spent && P.spent()) { arrested = s; break; }
  }
  return { P, sp, arrested };
}

// ---------------------------------------------------------------------------
// THE BLADE FOOTPRINT
//
// `50_geom.js` draws a blade as frame.o + frame.x*u*len + frame.z*v*len, with v
// the margin's own half-width at u scaled by how far maturation has run. So the
// ink a blade puts on the frame is exactly that patch, and reading it here off
// `leaf.wSide` means this harness measures the silhouette the MARGIN grew rather
// than a rectangle standing in for it. That is the whole point: `marginBias.ay`
// moves half-width and leaves length alone, and a footprint model that ignored
// width could not see the change at all.
const TAIL = 0.46;                                    // `bladeMap`'s unfurling tail
const matAt = (u, dev) => Math.max(0, Math.min(1, (dev - u) / TAIL + 1));

function organInk(org, push, NU, NV) {
  const leaf = org.leaf, len = org.len, dev = org.dev || 0;
  if (!leaf || !leaf.wSide || len < 0.02 || org.shed) return;
  const fr = org.frame;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const m = 0.10 + 0.90 * matAt(u, dev);
    for (let j = -NV; j <= NV; j++) {
      const t = j / NV;
      const w = leaf.wSide(u, t < 0 ? -1 : 1) * m * t;
      push(
        fr.o[0] + fr.x[0] * u * len + fr.z[0] * w * len,
        fr.o[1] + fr.x[1] * u * len + fr.z[1] * w * len,
        fr.o[2] + fr.x[2] * u * len + fr.z[2] * w * len,
      );
    }
  }
}

// The stem too — a bare pole with tufts on it is the defect being measured, and
// leaving the pole out of the ink would flatter exactly that failure.
function axisInk(ax, push, NU) {
  const pts = ax.pts, rad = ax.radii;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const r = (rad && rad[i]) || 0;
    for (let k = 0; k <= NU; k++) {
      const t = k / NU;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
      for (let s = -4; s <= 4; s++) push(x + (s / 4) * r, y, z);
    }
  }
}

// ---------------------------------------------------------------------------
// RASTERISE
//
// Orthographic, side on, dropping the depth axis — which is what an eye at the
// whole-tree framing gets, and what "reads as sparse" is a statement about.
// Rows are height bands; a row's outline is its own leftmost and rightmost ink.
// Sampling density is set by the FINEST raster the points will be rasterised at,
// not by a constant. A blade sampled at 96 steps and then rasterised at 3840
// rows is a dotted line, and a dotted line is a sparse crown — the harness would
// manufacture the very defect it exists to measure.
// Sampling density is set by the raster the ink is going onto, not by a
// constant. A blade sampled at 96 steps and rasterised at 3840 rows is a dotted
// line, and a dotted line is a sparse crown — the harness would manufacture the
// very defect it exists to measure. It marks the grid directly rather than
// materialising points, because at the finest raster the point list is 42M long.
function walk(P, pxPerUnit, emit) {
  for (const ax of P.axes) {
    let segL = 0;
    for (let i = 0; i < ax.pts.length - 1; i++)
      segL = Math.max(segL, Math.hypot(ax.pts[i + 1][0] - ax.pts[i][0], ax.pts[i + 1][1] - ax.pts[i][1], ax.pts[i + 1][2] - ax.pts[i][2]));
    axisInk(ax, emit, Math.max(4, Math.ceil(segL * pxPerUnit * 1.5)));
    for (const org of ax.organs) {
      // two samples per pixel along each direction — the Nyquist rate for
      // "leaves no gap", and the reason this has to scale with the raster
      const NU = Math.max(16, Math.ceil(org.len * pxPerUnit * 2));
      let hw = 0;
      if (org.leaf && org.leaf.wSide) for (let i = 0; i <= 8; i++) hw = Math.max(hw, org.leaf.wSide(i / 8, 1));
      const NV = Math.max(4, Math.ceil(hw * org.len * pxPerUnit * 2));
      organInk(org, emit, NU, NV);
    }
  }
}

function raster(P, rows) {
  // bounds first, off a cheap coarse pass — the extent of the ink is not
  // sensitive to sampling density the way its interior is
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  walk(P, 4, (x, y) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  });
  if (!isFinite(x0)) return null;
  const H = Math.max(1e-6, y1 - y0);
  const perPx = H / rows;                              // square pixels
  const cols = Math.max(1, Math.ceil((x1 - x0) / perPx) + 2);
  const g = new Uint8Array(rows * cols);
  let hit = 0;
  walk(P, 1 / perPx, (x, y) => {
    const c = Math.floor((x - x0) / perPx);
    const r = Math.floor((y1 - y) / perPx);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    const k = r * cols + c;
    if (!g[k]) { g[k] = 1; hit++; }
  });

  // per-row: ink over that row's own extent
  let ink = 0, span = 0, liveRows = 0;
  for (let r = 0; r < rows; r++) {
    let lo = -1, hi = -1, n = 0;
    for (let c = 0; c < cols; c++) if (g[r * cols + c]) { if (lo < 0) lo = c; hi = c; n++; }
    if (lo < 0) continue;
    ink += n; span += (hi - lo + 1); liveRows++;
  }
  return { fill: span ? ink / span : 0, ink: hit, rows, cols, perPx, liveRows, H, W: x1 - x0, g, x0, y1 };
}

// ---------------------------------------------------------------------------
// 960 rows on a 46-unit spire is ~21 px per world unit, which is the whole-tree
// framing `tools/tree_shot.mjs` shoots at — so that column is "how it reads on
// screen". The finer ones are there to answer the different question of how much
// tissue is actually present, which only separates from the first once the ink
// stops being resolvable.
const RASTERS = [240, 480, 960, 1920, 3840];
const RENDER_RASTER = 960;

function measure(over, seed) {
  const { P, sp, arrested } = grow(over, seed);
  const organs = P.axes.reduce((s, a) => s + a.organs.length, 0);
  const base = P.origin[1];
  let top = -Infinity, rad = 0;
  for (const ax of P.axes) {
    const t = ax.tipPos();
    if (t[1] - base > top) top = t[1] - base;
    rad = Math.max(rad, Math.hypot(t[0] - P.origin[0], t[2] - P.origin[2]));
  }
  
  const at = {};
  for (const r of RASTERS) at[r] = raster(P, r);
  // drawn blade area, as the cheap "how much tissue is there" companion — this
  // is the quantity fill is a PROJECTION of, and the two coming apart is the
  // signature of needles that no longer overlap.
  let area = 0;
  for (const ax of P.axes) for (const o of ax.organs) {
    if (!o.leaf || !o.leaf.wSide || o.shed || o.len < 0.02) continue;
    let w = 0;
    for (let i = 0; i <= 16; i++) w += (o.leaf.wSide(i / 16, 1) + o.leaf.wSide(i / 16, -1)) / 2;
    area += (w / 17) * 2 * o.len * o.len;
  }
  // how wide a needle actually is, in world units — the number that decides
  // which of the rasters above are measuring the crown and which the sampler
  let hw = 0, n = 0;
  for (const ax of P.axes) for (const o of ax.organs) {
    if (!o.leaf || !o.leaf.wSide || o.len < 0.02) continue;
    let w = 0;
    for (let i = 0; i <= 16; i++) w = Math.max(w, o.leaf.wSide(i / 16, 1));
    hw += w * o.len; n++;
  }
  const width = n ? 2 * hw / n : 0;
  // the finest raster at which a needle is still at least RESOLVED px across.
  // Below that, fill is a statement about rounding.
  const RESOLVED = 4;
  let good = RASTERS[0];
  for (const r of RASTERS) if (width / at[r].perPx >= RESOLVED) good = r;
  return { P, sp, arrested, organs, axes: P.axes.length, top, rad, at, area, width, good };
}

console.log(`\n=== the crown, as a QUANTITY. Ashfall Spire${Object.keys(OVER).length ? ' + ' + JSON.stringify(OVER) : ''} ===\n`);
console.log(`  steps <= ${STEPS}, seeds ${SEEDS.join(',')}\n`);

const runs = SEEDS.map((s) => ({ seed: s, m: measure(OVER, s) }));

console.log('  seed  arrested   axes  organs   height   crownR   blade area');
for (const { seed, m } of runs) {
  console.log(`  ${String(seed).padStart(4)}  ${(m.arrested < 0 ? 'no' : String(m.arrested)).padStart(8)}   ${String(m.axes).padStart(4)}  ${String(m.organs).padStart(6)}   ${m.top.toFixed(2).padStart(6)}   ${m.rad.toFixed(2).padStart(6)}   ${m.area.toFixed(1).padStart(10)}`);
}

console.log('\n  FILL, at five rasters. Read across: a ratio that moves with resolution is');
console.log('  the quantisation moving, not the crown. `*` marks rasters where a needle is');
console.log('  under 4 px across, where the number is the sampler rather than the tissue.\n');
console.log('  seed   ' + RASTERS.map(r => `${r} rows`.padStart(10)).join(''));
for (const { seed, m } of runs) {
  console.log(`  ${String(seed).padStart(4)}   `
    + RASTERS.map(r => (m.at[r].fill.toFixed(4) + (m.width / m.at[r].perPx < 4 ? '*' : ' ')).padStart(10)).join(''));
}
console.log('\n  seed   needle width   px @960 (the whole-tree framing)   resolved up to');
for (const { seed, m } of runs) {
  console.log(`  ${String(seed).padStart(4)}   ${m.width.toFixed(4).padStart(12)}   `
    + `${(m.width / m.at[RENDER_RASTER].perPx).toFixed(2).padStart(31)}   ${String(m.good).padStart(13)} rows`);
}
console.log(`\n  ON SCREEN (${RENDER_RASTER} rows) : ` + runs.map(r => r.m.at[RENDER_RASTER].fill.toFixed(4)).join('  '));
console.log('  HOW MUCH IS THERE  : ' + runs.map(r => r.m.at[r.m.good].fill.toFixed(4) + ` @${r.m.good}`).join('  '));

// ---------------------------------------------------------------------------
// THE INSTRUMENT, CHECKED
//
// QUICK=1 skips this and the drawing, for sweeping a ladder — the checks cost
// three extra specimens and they are about the harness, which does not change
// between rows of a sweep. Do not make it the default: the first thing this
// file did on a needle was fail its own area-conservation check.
if (!process.env.QUICK) {
console.log('\n=== the instrument, checked before any of the above is believed ===\n');
{
  const m = runs[0].m;

  // Both checks run at the RESOLVED raster rather than a fixed one. A sampler
  // validated only where its subject happens to be fat is not validated for the
  // case it is about to be used on, and the case it is about to be used on is a
  // needle 4.5x thinner than anything this has measured before.
  const R = m.good;

  // 1. Does it see width across the range it is being used over? A metric used
  //    to set a WIDTH knob that cannot see width is `test/venation.mjs`'s
  //    `domin` trap arriving a second time — a strong-looking result that is
  //    arithmetic. The comparison this file exists to make is the shipped paddle
  //    against the spruce band, so those are the two points it is checked on:
  //    checking it on a 2x nudge instead would have passed it in a regime where
  //    the answer is saturated, which is the same error as reading a trend off
  //    the noisy end of a sweep.
  const PAD = 0.16, NDL = 0.008;
  const pad = measure({ ...OVER, ay: PAD }, SEEDS[0]);
  const ndl = measure({ ...OVER, ay: NDL }, SEEDS[0]);
  const dF = pad.at[RENDER_RASTER].fill - ndl.at[RENDER_RASTER].fill;
  check(`the raster RESPONDS TO WIDTH over the range in use (ay ${PAD} vs ${NDL})`,
    dF > 0.10, `fill ${pad.at[RENDER_RASTER].fill.toFixed(4)} -> ${ndl.at[RENDER_RASTER].fill.toFixed(4)} (${dF.toFixed(4)})`, '> 0.10');

  // ...and the number that decides whether item 0 is affordable at all, which is
  // a property of the crown rather than of the harness, so it prints.
  //
  // OVERLAP. If tissue and ink fell together, every square unit of blade would
  // be doing visible work and a 4.8x thinner needle would cost 4.8x the crown.
  // They do not fall together, because at paddle width a great deal of the
  // foliage is behind other foliage. The gap between the two ratios is the
  // redundant tissue, and it is the headroom this change spends.
  //
  // NOTE WHAT THIS IS MEASURED ACROSS. An earlier version nudged ay by 2x from
  // the shipped value and reported a 1.03x ink change as "saturated coverage".
  // It is nothing of the kind: 0.16 -> 0.08 moves the TISSUE by 1.07x, because
  // that is the flat top of the sweep TUNING warns about by name. The ratio had
  // to be split into numerator and denominator before it said anything true —
  // the same lesson, on the same knob, two documents apart.
  const aPad = pad.at[RENDER_RASTER].ink * pad.at[RENDER_RASTER].perPx ** 2;
  const aNdl = ndl.at[RENDER_RASTER].ink * ndl.at[RENDER_RASTER].perPx ** 2;
  console.log(`\n  OVERLAP, across the change actually proposed (ay ${PAD} -> ${NDL}):`);
  console.log(`    blade tissue   ${pad.area.toFixed(0).padStart(6)} -> ${ndl.area.toFixed(0).padStart(6)} sq units   ${(pad.area / ndl.area).toFixed(2)}x less`);
  console.log(`    drawn ink      ${aPad.toFixed(0).padStart(6)} -> ${aNdl.toFixed(0).padStart(6)} sq units   ${(aPad / aNdl).toFixed(2)}x less`);
  console.log(`  Tissue falls ${(pad.area / ndl.area).toFixed(1)}x and the picture only ${(aPad / aNdl).toFixed(1)}x. That gap is the redundant`);
  console.log('  foliage, and it is why this is affordable rather than a straight 4.8x loss.');

  // 2. Drawn area is a property of the crown, not of the sampler. Doubling the
  //    raster must not change how much world the ink covers by more than the
  //    boundary term. Same conservation `test/veinlod.mjs` asserts for drawn
  //    width and `50_geom.js` for cell thinning — and it is the check that
  //    FAILED first time round at ay 0.008, which is how the 4 px floor above
  //    got its value instead of the 1.5 px somebody guessed.
  const iA = RASTERS.indexOf(R);
  const lo = RASTERS[Math.max(0, iA - 1)];
  const aLo = m.at[lo].ink * m.at[lo].perPx ** 2;
  const aHi = m.at[R].ink * m.at[R].perPx ** 2;
  const dA = Math.abs(aHi - aLo) / Math.max(aLo, 1e-9);
  check(`drawn AREA is conserved across a 2x raster change (${lo} -> ${R} rows)`,
    dA < 0.25, `${(dA * 100).toFixed(1)}% (${aLo.toFixed(1)} -> ${aHi.toFixed(1)} sq units)`, '< 25%');

  const px = m.width / m.at[RENDER_RASTER].perPx;
  console.log(`\n  a needle is ${px.toFixed(2)} px across at the whole-tree framing.`);
  console.log(px < 4
    ? `  ** AT THIS WIDTH THE ${RENDER_RASTER}-ROW FILL IS PARTLY THE SAMPLER. It is still the right\n     number for "how it reads on screen" — the viewer's eye has the same problem — but\n     "how much is there" must be read at ${R} rows, and the two are different questions. **`
    : '  wide enough that every raster above is measuring the crown rather than the rounding.');
}
}

// ---------------------------------------------------------------------------
// DRAWN. `test/conifer.mjs` section 3b is the reason every file here draws the
// thing it just measured: four numeric sections, a closed form and a 4x sweep
// all agreed with each other while the specimen was the wrong shape and the
// wrong way up, and ten lines of ASCII caught it in one look.
if (!process.env.QUICK) {
console.log('\n=== 5. the crown, drawn at the coarse raster ===\n');
{
  const m = runs[0].m, R = 44;
  const r = raster(m.P, R);
  const step = Math.max(1, Math.floor(r.cols / 96));
  for (let row = 0; row < R; row++) {
    let s = '';
    for (let c = 0; c < r.cols; c += step) {
      let any = 0;
      for (let k = 0; k < step && c + k < r.cols; k++) if (r.g[row * r.cols + c + k]) any++;
      s += any === 0 ? ' ' : any > step * 0.5 ? '#' : any > 1 ? '+' : '.';
    }
    console.log('  ' + s.replace(/\s+$/, ''));
  }
  console.log(`\n  ${r.H.toFixed(1)} units tall, ${r.W.toFixed(1)} wide; each cell ${(r.perPx * step).toFixed(2)} x ${r.perPx.toFixed(2)} units.`);
}
}

console.log(fails ? `\n${fails} CHECK(S) FAILED\n` : '\nall checks passed\n');
process.exit(fails ? 1 : 0);
