// THE GARDENER'S BENCH, HEADLESS: does a cut release buds, does the paste hold
// them, and do the two numbers that can be worked out on paper come out.
//
// Derivation first, then the solver, then a drawing — the order CLAUDE.md asks
// for. The two physical claims are checked against closed forms; the chemistry's
// outcomes (how many buds, which ones) are printed and only asserted to have the
// SIGN the experiment is about, never pinned to a count, because a count here is
// emergent and pinning it would turn it into something imposed.
//
//   1  the shipped path never runs any of this: an uncut specimen under the
//      shipped rule arms no bud and has no cut axis
//   2  prune(), the button that froze the plant it was meant to release, now
//      releases it — the regression test for the bug this work started from
//   3  Thimann & Skoog: under the stream field, cutting the leader frees buds
//      the tip was holding asleep, one of them commits, and the first to commit
//      puts buds it reaches back to sleep — on every species and seed tried
//   4  their control: putting auxin back on the cut holds every one of those
//      buds; taking it away frees them
//   5  the drain front's timing against its closed form, t_cut + d / v, to the
//      step, and commitment exactly tauCommit after that
//   6  the photogravitropic equilibrium against its closed form, atan(k)
//   7  the four specimens, drawn
//
//   node test/tend.mjs            (~70 s)
//   node test/tend.mjs quick      two species, one seed

import { readFileSync } from 'fs';
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';

// tend/10_program.js is a plain script concatenated into tend.html's one scope,
// with no imports of its own, so it is read as text rather than imported — the
// harness grows exactly the program the page grows
const progSrc = readFileSync(new URL('../tend/10_program.js', import.meta.url), 'utf8');
const { tendProgram, TEND_SPECIES } = new Function(progSrc + '; return { tendProgram, TEND_SPECIES };')();

const quick = process.argv[2] === 'quick';
let fails = 0;
const check = (ok, what) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) fails++; };

function grow(name, seed, over = {}, program = true) {
  const S = SPECIES[name];
  const prm = { ...DEFAULT_PRM, ...S.prm };
  const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  if (program) Object.assign(sp, tendProgram(name, sp));
  Object.assign(sp, over);
  const P = new Plant(prm, mo, sp, seed);
  // every event, not the page's bounded list of the last 64
  P.all = [];
  P.onNote = (e) => P.all.push(e);
  return P;
}
const run = (P, n) => { for (let i = 0; i < n; i++) P.step(1); };
// the buds below `s` on `ax` that the stream is holding asleep right now — the
// population a cut is ABOUT; the page measures the same set
const heldBelow = (P, ax, s) => new Set(ax.organs.filter(o => !o.floral && !o.shed && !o.took
  && o.birthLen <= s && ax.streamAt(o.birthLen, P.time, P.sp) > P.sp.branching));
const evs = (P, kind, ax, t0, held) => P.all.filter(e => e.kind === kind && e.from === ax
  && e.t >= t0 && held.has(e.org));
const woke = (P, ax, t0, held) => evs(P, 'bud', ax, t0, held);

const species = quick ? ['Cathedral Fern', 'Ember Creeper'] : TEND_SPECIES;
const seeds = quick ? [21] : [21, 137];

// ---------------------------------------------------------------------------
console.log('\n1. the shipped path does not run the stream');
for (const name of ['Cathedral Fern', 'Ember Creeper', 'Sun Coral']) {
  const P = grow(name, 21, {}, false);
  run(P, 2600);
  let armed = 0, cut = 0;
  for (const a of P.axes) { if (a.cutInfo) cut++; for (const o of a.organs) if (o.armed) armed++; }
  check(armed === 0 && cut === 0 && P.light === null, `${name}: no bud armed, no cut axis, no lamp (${P.axes.length} axes, ${P.organCount()} organs)`);
}

// ---------------------------------------------------------------------------
console.log('\n2. prune() releases the plant it used to freeze');
// Measured before the fix (2026-09-22): a young Cathedral Fern pruned at step 500
// stood at one axis and thirteen organs forever. The shipped species keep their
// shipped rule here — this is the main page's button, not the bench.
for (const name of ['Cathedral Fern', 'Sun Coral']) {
  const P = grow(name, 21, {}, false);
  run(P, 500);
  const before = { axes: P.axes.length, organs: P.organCount() };
  P.prune();
  run(P, 1500);
  check(P.axes.length > before.axes && P.organCount() > before.organs + 5,
    `${name}: pruned at 500 — axes ${before.axes} -> ${P.axes.length}, organs ${before.organs} -> ${P.organCount()}`);
}

// ---------------------------------------------------------------------------
console.log('\n3. Thimann & Skoog 1933: cutting the tip frees the buds it held, and one takes over');
console.log('   species              seed  held  freed  committed  put back to sleep  first commit (steps, units below)');
const rows = [];
for (const name of species) for (const seed of seeds) {
  const P = grow(name, seed);
  run(P, 900);
  const L = P.main, s = L.length * 0.66, t0 = P.time;
  const held = heldBelow(P, L, s);
  P.cut(L, s);
  run(P, 600);
  const freed = new Set(evs(P, 'free', L, t0, held).map(e => e.org)).size;
  const w = woke(P, L, t0, held);
  const slept = new Set(evs(P, 'resleep', L, t0, held).map(e => e.org)).size;
  rows.push({ name, seed, held: held.size, freed, woke: w.length, slept });
  const f = w[0];
  console.log(`   ${name.padEnd(20)} ${String(seed).padStart(4)}  ${String(held.size).padStart(4)}  ${String(freed).padStart(5)}  `
    + `${String(w.length).padStart(9)}  ${String(slept).padStart(17)}  ` + (f ? `${f.t - t0} / ${(s - f.s).toFixed(2)}` : '-'));
}
const withHeld = rows.filter(r => r.held > 0);
check(withHeld.length === rows.length, `every cut had buds held asleep below it (${withHeld.length}/${rows.length})`);
check(withHeld.every(r => r.woke > 0), `every cut ended in a commitment (${withHeld.filter(r => r.woke > 0).length}/${withHeld.length})`);
check(withHeld.every(r => r.woke < r.freed || r.freed === 1),
  'where more than one bud came free, fewer committed than came free — the rest were put back to sleep');
check(withHeld.some(r => r.slept > 0), 'somewhere a freed bud was put back to sleep by the one that committed first');

// ---------------------------------------------------------------------------
console.log('\n4. the control: the tip\'s auxin put back on the cut holds them (agar, in 1933); taking it away frees them');
let heldAll = true, wipedWoke = 0, wipedN = 0;
for (const name of species) for (const seed of seeds) {
  const P = grow(name, seed);
  run(P, 900);
  const L = P.main, s = L.length * 0.66, t0 = P.time;
  const held = heldBelow(P, L, s);
  P.cut(L, s);
  P.paste(L, 1);
  run(P, 600);
  const under = evs(P, 'free', L, t0, held).length + woke(P, L, t0, held).length;
  P.wipe(L);
  const tw = P.time;
  run(P, 500);
  const after = woke(P, L, tw, held).length;
  if (under > 0) heldAll = false;
  wipedN++; if (after > 0) wipedWoke++;
  console.log(`   ${name.padEnd(20)} ${String(seed).padStart(4)}  held ${String(held.size).padStart(3)}  freed or committed under auxin ${under}  committed after it was taken away ${after}`);
}
check(heldAll, 'no bud the tip was holding came free while the auxin was back on the cut');
check(wipedWoke === wipedN, `taking the auxin away let a bud commit on every plant (${wipedWoke}/${wipedN})`);

// ---------------------------------------------------------------------------
console.log('\n5. the drain front arrives on time');
// On a single stem whose only source is its own apex, the stream a distance d
// below a cut made at t_c is level * exp(-d/lambda) until the last auxin that
// passed the cut arrives, at t_c + d/v, and zero after. So the bud nearest the
// cut — held, old enough, and taking with certainty — must wake on the first
// step at or after t_c + d/v. Nothing else in the model can make it earlier or
// later, which is what makes it a check rather than a report.
{
  const P = grow('Cathedral Fern', 21, { maxAxes: 1e9, branching: 0.5 });
  run(P, 700);
  const L = P.main;
  // cut a little way down, so the nearest bud below is a full internode away
  const s = L.length - 2.2, t0 = P.time;
  const held = heldBelow(P, L, s);
  const cand = [...held].filter(o => o.age >= P.sp.budRelease).sort((a, b) => b.birthLen - a.birthLen)[0];
  P.cut(L, s);
  run(P, 300);
  const v = P.patV, tau = P.tauCommit;
  const pred = t0 + (s - cand.birthLen) / v;
  const fr = evs(P, 'free', L, t0, held).find(e => e.org === cand);
  const cm = woke(P, L, t0, held).find(e => e.org === cand);
  console.log(`   cut at s=${s.toFixed(2)}, nearest held bud at ${cand.birthLen.toFixed(2)}, v=${v.toFixed(4)}, tauCommit=${tau.toFixed(1)}`);
  console.log(`   drain predicted ${pred.toFixed(2)} (first step at or after it: ${Math.ceil(pred - 1e-9)}), bud came free at ${fr ? fr.t : '-'}`);
  check(fr && Math.abs(fr.t - Math.ceil(pred - 1e-9)) <= 1, 'the nearest bud came free within one step of t_c + d/v');
  check(cm && Math.abs(cm.t - (fr.t + Math.ceil(tau - 1e-9))) <= 1, `and committed tauCommit later (at ${cm ? cm.t : '-'})`);
}

// ---------------------------------------------------------------------------
console.log('\n6. the photogravitropic equilibrium');
// The tip lerps toward normalize(up + k * l) with k = photoGain * I / (I + half),
// so with the light horizontal it settles at atan(k) from vertical — the angle at
// which the transverse components of the two sine-law stimuli cancel. The lamp is
// put very far away so its direction and irradiance do not change as the tip
// moves toward it, and circumnutation and wander are silenced so nothing else
// pulls the tip.
for (const I of [0.25, 0.5, 2.0]) {
  const P = grow('Cathedral Fern', 21, { wander: 0, nutAmp: 0, branching: 0 }, false);
  const D = 5000;
  P.light = { pos: [D, P.origin[1] + 6, 0], power: I * D * D, on: true };
  run(P, 700);
  const sp = P.sp;
  const k = sp.photoGain * Math.pow(I, sp.photoExp);
  const pred = Math.atan(k) * 180 / Math.PI;
  const d = P.main.dir;
  const got = Math.atan2(Math.hypot(d[0], d[2]), d[1]) * 180 / Math.PI;
  check(Math.abs(got - pred) < 1.0, `irradiance ${I}: tip at ${got.toFixed(2)} deg from vertical, closed form ${pred.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
console.log('\n7. drawn: untouched, cut, pasted, lit from the right');
function ascii(P, W = 38, H = 22) {
  const pts = [];
  for (const a of P.axes) {
    for (let i = 1; i < a.pts.length; i++) {
      for (let k = 0; k <= 3; k++) {
        const p = a.pts[i - 1], q = a.pts[i], t = k / 3;
        pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, a.cutInfo ? '%' : a.gen ? '/' : '|']);
      }
    }
    for (const o of a.organs) {
      if (o.shed) continue;
      for (let k = 1; k <= 4; k++) {
        const t = k / 4 * o.len;
        pts.push([o.frame.o[0] + o.frame.x[0] * t, o.frame.o[1] + o.frame.x[1] * t, o.floral ? '*' : '.']);
      }
    }
  }
  return pts;
}
function draw(sets, labels, W = 30, H = 20) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const pts of sets) for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const s = Math.min((W - 1) / Math.max(1e-6, x1 - x0), (H - 1) * 2 / Math.max(1e-6, y1 - y0));
  const rank = { ' ': 0, '.': 1, '*': 2, '/': 3, '|': 4, '%': 5 };
  const grids = sets.map(pts => {
    const g = Array.from({ length: H }, () => Array(W).fill(' '));
    for (const [x, y, c] of pts) {
      const cx = Math.round((x - (x0 + x1) / 2) * s + W / 2), cy = H - 1 - Math.round((y - y0) * s / 2);
      if (cx >= 0 && cx < W && cy >= 0 && cy < H && rank[c] >= rank[g[cy][cx]]) g[cy][cx] = c;
    }
    return g;
  });
  console.log('   ' + labels.map(l => l.padEnd(W)).join('  '));
  for (let r = 0; r < H; r++) console.log('   ' + grids.map(g => g[r].join('')).join('  '));
}
{
  const name = 'Cathedral Fern', seed = 21;
  const A = grow(name, seed); run(A, 1700);
  const B = grow(name, seed); run(B, 900); B.cut(B.main, B.main.length * 0.66); run(B, 800);
  const C = grow(name, seed); run(C, 900); C.cut(C.main, C.main.length * 0.66); C.paste(C.main, 1); run(C, 800);
  const D = grow(name, seed); run(D, 400);
  D.light = { pos: [D.origin[0] + 14, D.origin[1] + 10, 0], power: 90, on: true }; run(D, 1300);
  draw([ascii(A), ascii(B), ascii(C), ascii(D)], ['untouched', 'cut at 900', 'cut + pasted', 'lamp at right from 400']);
  console.log('   | leader   / branch   % cut stump   . leaf   * floral');
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
