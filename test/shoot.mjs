// The transport stream, and how much of senescence it actually explains.
//
// `src/38_shoot.js` was built to make abscission a competition — a leaf shed
// when it loses its share of a stream shared with every other organ — and that
// hypothesis was FALSIFIED here before it shipped. The measurements are in
// JOURNAL.md; the short version is that auxin is made by each organ rather than
// competed for, so flux through the abscission zone is conserved and carries no
// scarcity signal. This harness is kept pointed at the same numbers so the
// falsification stays reproducible and so nobody rebuilds it.
//
// What the file does now: senescence begins when the ORGANISM is spent (no
// growing point anywhere), and each blade is dismantled at a rate set by how far
// its export falls short of holding itself together. So this prints:
//
//   1. the stream itself — auxin and export along the leader, whether it is
//      finite, and the basipetal gradient it produces
//   2. the two quantities the falsified hypothesis rested on, still measured:
//      export per blade, and the stem/blade ratio across the zone
//   3. who was shed and when, and whether the plant finishes at all
//   4. the knockouts that keep the honest split visible:
//        leafDecay 0    — the age-linked export decline OFF. Whatever is still
//                         shed here was shed by the stream alone. Expect little:
//                         the decline is what ENDS a leaf, the stream is what
//                         ORDERS them, and that claim should stay measured.
//        fruitSource 0  — the fruit's auxin contribution removed. Note this is
//                         not the correlative-control experiment it looks like:
//                         fruit matters because setting it ARRESTS the apex, not
//                         because of the auxin it makes.
//
// It prints; it does not judge. No assertion here pins an emergent quantity.
//
//   node test/shoot.mjs                 # default species, 2 seeds
//   node test/shoot.mjs 'Sun Coral'
//   STEPS=20000 node test/shoot.mjs
//
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 14000);
const SEEDS = [21, 137];

function grow(name, seed, shootOpts) {
  const S = SPECIES[name];
  const prm = { ...DEFAULT_PRM, ...S.prm };
  const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  // the stream is off in the shipped plant; this harness is what turns it on
  sp.shootOpts = { enabled: true, ...(S.sp.shootOpts || {}), ...shootOpts };
  const P = new Plant(prm, mo, sp, seed);
  for (let s = 1; s <= STEPS; s++) P.step(1);
  return P;
}

// every vegetative organ on the plant, in the order it was founded
function organs(P) {
  const out = [];
  for (let ai = 0; ai < P.axes.length; ai++) {
    const a = P.axes[ai];
    for (let oi = 0; oi < a.organs.length; oi++) {
      const o = a.organs[oi];
      if (o.floral) continue;
      out.push({
        axis: ai, idx: oi, org: o, age: o.age,
        y: o.frame.o[1],
        exp: o.vExport || 0, sen: o.sen || 0,
        shed: !!o.shed, shedAt: o.shedAt,
        aStem: P.vasc.auxinAt(o.vStem), aBlade: P.vasc.auxinAt(o.vNode),
      });
    }
  }
  // founding order across the whole plant is age, descending — the oldest organ
  // on the plant was founded first, whichever shoot it is on
  out.sort((p, q) => q.age - p.age);
  return out;
}

// Spearman rank correlation. Ties get averaged ranks, which matters here because
// several organs can be shed on the same step.
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return NaN;
  const rank = (v) => {
    const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx, b = ry[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return (dx <= 0 || dy <= 0) ? NaN : num / Math.sqrt(dx * dy);
}

const num = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

function summary(P) {
  const os = organs(P);
  const shed = os.filter(o => o.shed);
  const sen = os.filter(o => !o.shed && o.sen > 0.02);
  // `os` is already in founding order, so an organ's index in it IS its rank by
  // age across the whole plant. Correlate that against when it was shed.
  const bornIdx = [], shedT = [];
  os.forEach((o, i) => { if (o.shed) { bornIdx.push(i); shedT.push(o.shedAt); } });
  const live = os.filter(o => !o.shed);
  return {
    organs: os.length, shed: shed.length, senescing: sen.length,
    firstShed: shed.length ? Math.min(...shed.map(o => o.shedAt)) : NaN,
    lastShed: shed.length ? Math.max(...shed.map(o => o.shedAt)) : NaN,
    rho: spearman(bornIdx, shedT),
    // and against HEIGHT, which is the part age alone cannot explain
    rhoY: spearman(shed.map(o => o.y), shedT),
    meanExp: mean(live.map(o => o.exp)),
  };
}

console.log(`${STEPS} steps, seeds ${SEEDS.join('/')}\n`);

const names = only ? [only] : Object.keys(SPECIES);
for (const name of names) {
  if (!SPECIES[name]) { console.error('no such species: ' + name); process.exit(1); }
}

// ---------------------------------------------------------------------------
// 1. the stream on one plant, in detail
// ---------------------------------------------------------------------------
{
  const name = names[0];
  const P = grow(name, SEEDS[0], {});
  const V = P.vasc, F = V.F;
  let bad = 0, amin = 1e9, amax = -1e9;
  for (let i = 0; i < F.n; i++) {
    if (!Number.isFinite(F.a[i])) bad++;
    if (F.a[i] < amin) amin = F.a[i];
    if (F.a[i] > amax) amax = F.a[i];
  }
  console.log(`--- the stream: ${name}, seed ${SEEDS[0]} ---`);
  console.log(`nodes ${F.n}${V.full ? ' (CAPACITY REACHED)' : ''}   ` +
    `auxin ${num(amin, 3)}..${num(amax, 3)}   nonfinite ${bad}   ` +
    `root a=${num(F.a[V.root], 3)}`);
  if (bad) console.log('    ^ THE STREAM WENT NON-FINITE — suspect the timestep (PITFALLS)');
  if (amax - amin < 1e-3) console.log('    ^ FLAT FIELD — nothing is being transported');

  console.log(`spent ${P.spent()}   dead ${P.dead()}   ` +
    `senescence ${num(P.senescence(), 2)}   stage ${P.stage()}`);

  const a0 = P.axes[0];
  const veg = a0.organs.filter(o => !o.floral);
  console.log('\nleader, oldest organ first:');
  console.log('  #   age      y  a_stem a_blade   ratio   export    sen  shed');
  for (const o of veg.slice().sort((p, q) => q.age - p.age).slice(0, 20)) {
    const as = V.auxinAt(o.vStem), ab = V.auxinAt(o.vNode);
    console.log('  ' + String(veg.indexOf(o)).padStart(2) +
      num(o.age).padStart(7) + num(o.frame.o[1], 2).padStart(7) +
      num(as, 2).padStart(8) + num(ab, 2).padStart(8) +
      num(as / Math.max(1e-6, ab), 2).padStart(8) +
      num(o.vExport, 3).padStart(9) +
      num(o.sen, 2).padStart(7) + (o.shed ? '   yes' : '     .'));
  }
  // the falsified signal, kept in view: the stem side is richer than the blade
  // side essentially always, so "reversed gradient" never discriminates
  const rr = veg.filter(o => o.vNode !== undefined)
    .map(o => V.auxinAt(o.vStem) / Math.max(1e-6, V.auxinAt(o.vNode)));
  const rev = rr.filter(r => r > 1).length;
  console.log(`\nstem/blade ratio across the zone: reversed(>1) in ${rev}/${rr.length} organs` +
    ` — this is why it cannot be the abscission signal`);
  console.log();
}

// ---------------------------------------------------------------------------
// 2. every species, and the two knockouts
// ---------------------------------------------------------------------------
const cols = ['organs', 'shed', 'senesc', 'first', 'last', 'rho(age)', 'rho(y)', 'dead'];
console.log('--- senescence, and what moves it ---');
console.log('species'.padEnd(19) + 'variant'.padEnd(13) + cols.map(c => c.padStart(9)).join(''));

const VARIANTS = [
  // what actually ships: the stream runs so its numbers can be read, but
  // senescence is driven by the organism being spent
  ['shipped', {}],
  // the falsified path, reproduced
  ['stream drives', { senesceFromStream: true }],
  ['  no decline', { senesceFromStream: true, leafDecay: 0 }],
  ['  no fruit aux', { senesceFromStream: true, fruitSource: 0 }],
];

for (const name of names) {
  for (const [label, opts] of VARIANTS) {
    const plants = SEEDS.map(seed => grow(name, seed, opts));
    const rows = plants.map(summary);
    const agg = (f) => mean(rows.map(f).filter(Number.isFinite));
    console.log(
      (label === 'shipped' ? name.slice(0, 18) : '').padEnd(19) + label.padEnd(13) +
      num(agg(r => r.organs)).padStart(9) +
      num(agg(r => r.shed), 1).padStart(9) +
      num(agg(r => r.senescing), 1).padStart(9) +
      num(agg(r => r.firstShed)).padStart(9) +
      num(agg(r => r.lastShed)).padStart(9) +
      num(agg(r => r.rho), 2).padStart(9) +
      num(agg(r => r.rhoY), 2).padStart(9) +
      `${plants.filter(P => P.dead()).length}/${plants.length}`.padStart(9));
    if (label === 'shipped' && !plants.some(P => P.senescence() > 0)) {
      console.log('    ^ NOTHING SENESCED — the specimen never finishes');
    }
  }
}

console.log(`
Reading this table
  shipped        senescence gated on Plant.spent() — no growing point left
                 anywhere on the organism. 'shed' 0 here means the specimen
                 never finishes, which is the thing this work exists to fix.
  stream drives  the FALSIFIED hypothesis, reproduced: the transport stream sets
                 the rate instead. Kept runnable, off in the shipped plant.
  rho(age)       rank correlation, founding order vs shed time.
  rho(y)         the same against HEIGHT.
                 On 'stream drives' these wander -0.05 to 0.57 by species, and
                 with 'no decline' no specimen completes at all. That is why the
                 stream does not ship. On the
                 'shipped' rows rho(age) should be strongly positive, because
                 there the age ordering is stated outright rather than derived.
  no decline     the age-linked export decline switched off. Whatever is still
                 shed was shed by the stream alone — expect it to collapse.
  no fruit aux   the fruit's auxin contribution removed. Barely moves anything:
                 2.57 vs 2.55 on the stem/blade ratio. A fruit ends a plant by
                 arresting its apex, not by what it puts in the stream.
  dead           specimens that fully completed within ${STEPS} steps.`);
