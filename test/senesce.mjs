// Is there anything to SEE when a blade dies?
//
// The simulation half of senescence landed first and nothing drew it: `org.sen`
// ran 0->1 and every frame of the arc came back byte-identical. This harness is
// the numeric half of the fix. It grows one real blade, canalises it, bakes the
// vein network, and then asks the renderer's own `blade()` for the vertex stream
// at a series of senescence levels — so what is measured here is the geometry
// that ships, not a restatement of the formula.
//
//   usage: node test/senesce.mjs '{}' '{}' [seed]
//
// Three questions:
//   1. does the blade change at all as it dies (is the channel wired)?
//   2. does the tissue held against a VEIN drain later than the open lamina —
//      the green-island pattern — or does the whole card dim as one?
//   3. is the vasculature the last lit thing left?
//
// The blade is drawn flat here (curl=0, ripple=0) for one reason: with an
// identity frame that makes the vertex positions an exact map back to blade
// coordinates, so the ASCII map below is the real drawn surface rather than a
// second copy of the field it was drawn from.

import { Leaf } from '../src/30_leaf.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { Buffers, blade, setView } from '../src/50_geom.js';

const over = JSON.parse(process.argv[2] || '{}');
const lo = JSON.parse(process.argv[3] || '{}');
const seed = +(process.argv[4] || 7);
const prm = { ...DEFAULT_PRM, ...over };

// Cathedral Fern's blade colours, copied from the species table in 70_app.js.
// Any species would do — the point of deriving the drained colour rather than
// painting it is that none of them needs an entry of its own.
const PAL = {
  blade0: [0.06, 0.21, 0.21], blade1: [0.10, 0.36, 0.32],
  veinTint: [0.02, 0.16, 0.22], vein: [0.35, 1.0, 0.95],
  glow: 1.0,
};

const LEN = 1, MU = 40, MV = 18;
setView([0, 0, 8], 0.004);   // the second argument is the minimum ribbon width


const L = new Leaf(prm, lo, seed);
for (let i = 0; i < 4000 && !L.mature; i++) L.step(1);
if (!L.mature) { console.error('leaf never matured'); process.exit(1); }
L.veinDistanceField(30);
console.log(`leaf  seed=${seed}  cells=${L.F.n}  veins=${L.veins.length}  mature at age ${L.age}`);

// One pass of the shipped blade geometry. Returns the vertex stream, split into
// triangle vertices (the lamina) and the line buffer (the vein ribbons).
function draw(sen) {
  const B = new Buffers();
  const fr = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  blade(B, L, fr, LEN, LEN, PAL, 0, 0, PAL.glow, MU, MV, 1, 1, sen);
  const verts = [];
  for (let i = 0; i < B.triN; i += 10) {
    verts.push({
      u: B.tri[i] / LEN, v: B.tri[i + 2] / LEN,
      c: [B.tri[i + 6], B.tri[i + 7], B.tri[i + 8]], e: B.tri[i + 9],
    });
  }
  let le = 0, lc = [0, 0, 0], ln = 0;
  for (let i = 0; i < B.lineN; i += 7) {
    lc[0] += B.line[i + 3]; lc[1] += B.line[i + 4]; lc[2] += B.line[i + 5];
    le += B.line[i + 6]; ln++;
  }
  return { verts, veinGlow: ln ? le / ln : 0, veinCol: lc.map(x => (ln ? x / ln : 0)), ln };
}

const live = draw(0);
// Emissive at sen=0 IS the distance-to-vein channel — `blade()` writes
// `dd * glow * 0.24` there — so the live pass classifies its own vertices for
// free, with no second copy of the vdf lookup to drift out of step.
const eMax = live.verts.reduce((m, x) => Math.max(m, x.e), 0);
// 0.75 rather than something looser because what `blade()` spares is dd
// SQUARED — see the comment there. A vertex at dd=0.75 is only holding 0.56 of
// the lag, so calling it "on a vein" would blur the very contrast being measured.
const ON = live.verts.map(x => x.e >= eMax * 0.75);
const OPEN = live.verts.map(x => x.e <= eMax * 0.05);
const nOn = ON.filter(Boolean).length, nOpen = OPEN.filter(Boolean).length;
console.log(`      ${live.verts.length} lamina vertices — ${nOn} against a vein, ${nOpen} open lamina\n`);

const lum = (c) => 0.30 * c[0] + 0.59 * c[1] + 0.11 * c[2];
// how far this vertex has moved from the colour it was alive, in units of its
// own living luminance, so a dark species and a bright one are comparable
function drain(a, b) {
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return d / Math.max(1e-4, lum(b));
}
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

// `drain` is a distance and it saturates — the drained colour passes through
// PALE on its way to dark, so the far end of the arc moves back toward where it
// started. Warmth does not saturate, which is why both are here: drain says how
// much has happened, warmth says how far through it is.
console.log('        ------ drain ------    ----- warmth -----   --------- glow ---------');
console.log('  sen     open      vein       open      vein       lamina    vein ribbons');
const rows = [];
for (const sen of [0, 0.25, 0.5, 0.75, 1]) {
  const d = draw(sen);
  const dOpen = [], dOn = [], wOpen = [], wOn = [];
  // red against blue: the one number that says "this stopped being a teal (or
  // purple, or chartreuse) thing and became a dead one"
  const warmth = (c) => c[0] / Math.max(1e-4, c[2]);
  for (let i = 0; i < d.verts.length; i++) {
    if (OPEN[i]) { dOpen.push(drain(d.verts[i].c, live.verts[i].c)); wOpen.push(warmth(d.verts[i].c)); }
    if (ON[i]) { dOn.push(drain(d.verts[i].c, live.verts[i].c)); wOn.push(warmth(d.verts[i].c)); }
  }
  const eL = mean(d.verts.map(x => x.e));
  const mo = mean(dOpen), mv = mean(dOn);
  rows.push({ sen, mo, mv, wo: mean(wOpen), wv: mean(wOn), eL, ev: d.veinGlow });
  console.log(`  ${sen.toFixed(2)}  ${mo.toFixed(3).padStart(7)}   ${mv.toFixed(3).padStart(7)}` +
    `   ${mean(wOpen).toFixed(2).padStart(8)}  ${mean(wOn).toFixed(2).padStart(8)}` +
    `   ${eL.toFixed(4).padStart(9)}  ${d.veinGlow.toFixed(4).padStart(12)}`);
}

// --- the map: where on the blade has it drained? ----------------------------
// Rows are along the blade, columns across it. Dense characters are tissue
// still holding its colour; blank is drained. The vein network should be
// legible in this as a tree, and it should be legible LATE.
function map(sen, cols = 62, rowsN = 22) {
  const d = draw(sen);
  const acc = new Float64Array(cols * rowsN), cnt = new Float64Array(cols * rowsN);
  let vmax = 0;
  for (const x of d.verts) vmax = Math.max(vmax, Math.abs(x.v));
  for (let i = 0; i < d.verts.length; i++) {
    const x = d.verts[i];
    const a = Math.min(rowsN - 1, Math.max(0, Math.round(x.u * (rowsN - 1))));
    const b = Math.min(cols - 1, Math.max(0, Math.round((x.v / (vmax || 1) * 0.5 + 0.5) * (cols - 1))));
    acc[a * cols + b] += 1 - Math.min(1, drain(x.c, live.verts[i].c) / 1.2);
    cnt[a * cols + b] += 1;
  }
  const RAMP = ' .:-=+*#%@';
  const out = [];
  for (let a = 0; a < rowsN; a++) {
    let line = '';
    for (let b = 0; b < cols; b++) {
      const k = a * cols + b;
      if (!cnt[k]) { line += ' '; continue; }
      const h = acc[k] / cnt[k];
      line += RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(h * (RAMP.length - 1))))];
    }
    out.push(line.replace(/\s+$/, ''));
  }
  return out;
}

for (const sen of [0, 0.5, 0.8]) {
  console.log(`\n  --- holding colour, sen=${sen.toFixed(2)} (dense = still alive) ---`);
  for (const line of map(sen)) console.log('  ' + line);
}

const half = rows.find(r => r.sen === 0.5);
console.log(`\n  at half senescence the open lamina has drained ${(half.mo / Math.max(1e-4, half.mv)).toFixed(1)}x` +
  ` as far as the\n  tissue on the veins; the vein ribbons still carry` +
  ` ${(half.ev / Math.max(1e-6, rows[0].ev) * 100).toFixed(0)}% of their glow and the` +
  `\n  lamina ${(half.eL / Math.max(1e-6, rows[0].eL) * 100).toFixed(0)}% of its.`);
