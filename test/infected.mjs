// ---------------------------------------------------------------------------
// AN AGENT ON REAL TISSUE — the measurement and the drawing.
//
// `test/pathogen.mjs` is the derivation: it checks the agent's own dynamics
// against a closed form on a synthetic chain, and nothing in here is worth
// reading if that file is red. This one asks the question that matters —
// does an infected plant come out DIFFERENT, and is the difference something
// nobody drew?
//
// It prints and draws. Most of it deliberately does not assert: what an
// infection looks like is an emergent quantity, and pinning it to a number
// would convert it into an imposed one. The things it DOES assert are
// structural claims that were worked out beforehand:
//
//   - an uninfected leaf is bit-identical with the agent machinery compiled in
//   - an agent with R0 < 1 clears completely and leaves no trace
//   - dComp is EXACTLY inert on a blade, because flux mode multiplies the
//     gradient weight by zero — see section 4, this is not a bug
//   - the clamp renormalises rather than discarding carriers, checked on one
//     isolated allocation rather than on a grown field
//
// Everything else is here to be looked at.
//
// ⚠ KNOWN AND NOT YET SOLVED: on a blade every agent reaches burden 1.00 — the
// front crosses a few-hundred-cell lattice long before the blade matures, so
// what lands is a GLOBAL parameter change and not a localised lesion. A gall
// needs a patch, and a patch needs the front slow relative to organ
// development. That regime is un-swept. See the note at the end of section 2.
// ---------------------------------------------------------------------------
import { Leaf } from '../src/30_leaf.js';
import { Meristem } from '../src/20_meristem.js';
import { CellField, stepAuxin, DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';
import { Infection, PATHOGEN_DEFAULTS, AGENTS } from '../src/15_pathogen.js';

let failures = 0;
function ok(cond, label, detail) {
  if (!cond) failures++;
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${detail ? '   ' + detail : ''}`);
}
const f = (x, n = 3) => Number(x).toFixed(n);
const SEED = +(process.argv[2] || 7);

// Grow one leaf. If `agent` is given, inoculate as soon as the interior lattice
// exists — the blade has no cells to infect before its margin has finished.
function growLeaf(agent, at = [0.5, 0.0], seed = SEED) {
  const prm = { ...DEFAULT_PRM };
  const L = new Leaf(prm, {}, seed);
  let s = 0, inf = null, inocCell = -1;
  while (!L.mature && s < 8000) {
    L.step(1); s++;
    if (agent && !inf && L.F && L.F.n > 20) {
      inf = new Infection(L.F, { ...PATHOGEN_DEFAULTS, ...AGENTS[agent] });
      inocCell = inf.inoculate(at[0], at[1]);
    }
  }
  return { L, inf, steps: s, inocCell };
}

// What a viewer actually receives from a blade: how many strands, how much
// traffic the biggest one takes, and how many carry half of it.
//
// ⚠ DO NOT REPORT L.veins.length AS A COUNT. `veinMax` is a hard cap (260) and
// every configuration tried here — control, saturated, and everything between —
// produces more candidates than that, so `L.veins.length` reads 260 in every
// row and looks like a strong "no effect" result that is pure arithmetic. It is
// the same trap as the unreachable-maximum metric in test/venation.mjs, and it
// survived one round of this harness before being noticed. `canals` below
// re-derives the count from the field with the cap taken off.
function veinStats(L) {
  const mg = L.veins.map(v => v.mag).sort((a, b) => b - a);
  const tot = mg.reduce((a, b) => a + b, 0);
  let acc = 0, n50 = 0;
  for (const m of mg) { acc += m; n50++; if (acc >= tot / 2) break; }

  const F = L.F, o = L.o;
  let maxPi = 1e-9;
  for (let i = 0; i < F.n * MAXNB; i++) if (F.pi[i] > maxPi) maxPi = F.pi[i];
  let canals = 0;
  for (let i = 0; i < F.n; i++) {
    const d = F.deg[i], off = i * MAXNB;
    let tot2 = 0;
    for (let k = 0; k < d; k++) tot2 += F.pi[off + k];
    if (tot2 <= 1e-9) continue;
    for (let k = 0; k < d; k++) {
      const e = off + k, j = F.nbr[e];
      if (j <= i) continue;
      let t3 = 0;
      const dj = F.deg[j], oj = j * MAXNB;
      for (let q = 0; q < dj; q++) t3 += F.pi[oj + q];
      const fr = Math.max(F.pi[e] / tot2, t3 > 1e-9 ? F.pi[F.rev[e]] / t3 : 0);
      const mag = Math.max(F.pi[e], F.pi[F.rev[e]]);
      if (fr < o.veinFrac || mag < maxPi * o.veinFloor) continue;
      canals++;
    }
  }
  return { drawn: L.veins.length, canals, top: tot ? mg[0] / tot : 0, n50, traffic: tot };
}

function draw(L, inf, W = 62, H = 22) {
  const g = Array.from({ length: H }, () => new Array(W).fill(' '));
  for (const v of L.veins) {
    for (let t = 0; t <= 12; t++) {
      const x = v.x0 + (v.x1 - v.x0) * t / 12, y = v.y0 + (v.y1 - v.y0) * t / 12;
      const cx = Math.round(x * (W - 1)), cy = Math.round((y / L.o.aspect * 0.5 + 0.5) * (H - 1));
      if (cx >= 0 && cx < W && cy >= 0 && cy < H) g[cy][cx] = v.w > 0.75 ? '#' : (v.w > 0.5 ? '+' : '.');
    }
  }
  // overlay where the agent actually is, on cells the veins did not claim
  if (inf) {
    const F = inf.F;
    for (let i = 0; i < F.n; i++) {
      if (F.vir[i] < 0.35) continue;
      const cx = Math.round(F.x[i] * (W - 1));
      const cy = Math.round((F.y[i] / L.o.aspect * 0.5 + 0.5) * (H - 1));
      if (cx >= 0 && cx < W && cy >= 0 && cy < H && g[cy][cx] === ' ') g[cy][cx] = '~';
    }
  }
  return g.map(r => r.join('')).join('\n');
}

// =========================================================================
console.log('\n=== 1. AN UNINFECTED LEAF IS UNCHANGED ===\n');
// =========================================================================
// The machinery is compiled in whether or not anything is using it. If the
// clean path moved at all, nothing below this line would mean anything.
const ctrl = growLeaf(null);
const cs = veinStats(ctrl.L);
console.log(`  control leaf (seed ${SEED}): ${ctrl.steps} steps, ${cs.canals} canals ` +
  `(${cs.drawn} drawn, capped at veinMax), top strand ${(cs.top * 100).toFixed(1)}%, n50 ${cs.n50}`);
{
  const again = growLeaf(null);
  const bs = veinStats(again.L);
  ok(again.steps === ctrl.steps && bs.canals === cs.canals &&
    Math.abs(bs.traffic - cs.traffic) < 1e-9,
    'two clean runs are identical', `${bs.canals} canals, traffic ${f(bs.traffic, 6)}`);
}
{
  // an agent that cannot establish must leave no trace at all
  const dead = growLeaf(null);
  const inf = new Infection(dead.L.F, { ...PATHOGEN_DEFAULTS, r: 0.2, clr: 1.4, dRho: 5 });
  inf.inoculate(0.5, 0);
  for (let i = 0; i < 400; i++) inf.step(DEFAULT_PRM.dt * 3);
  const b = inf.burden(0.01);
  ok(b.total < 1e-4, 'an agent with R0 < 1 clears completely', `burden ${f(b.total, 8)}`);
}

// =========================================================================
console.log('\n=== 2. WHAT EACH AGENT DOES TO A BLADE ===\n');
// =========================================================================
console.log('  agent       canals    d%     top strand   n50   burden   drawn');
console.log(`  ${'(control)'.padEnd(12)} ${String(cs.canals).padStart(4)}    --      ` +
  `${(cs.top * 100).toFixed(1).padStart(5)}%      ${String(cs.n50).padStart(3)}     --     ${cs.drawn}`);
const grown = {};
for (const name of Object.keys(AGENTS)) {
  const r = growLeaf(name);
  const st = veinStats(r.L);
  grown[name] = r;
  const b = r.inf ? r.inf.burden(0.35) : { frac: 0 };
  const d = ((st.canals - cs.canals) / cs.canals * 100);
  console.log(`  ${name.padEnd(12)} ${String(st.canals).padStart(4)}  ${(d >= 0 ? '+' : '') + d.toFixed(1).padStart(5)}%      ` +
    `${(st.top * 100).toFixed(1).padStart(5)}%      ${String(st.n50).padStart(3)}    ${f(b.frac, 2)}    ${st.drawn}`);
}
console.log('\n  `canals` is how many strands the blade committed, and `top strand` is the');
console.log('  share of traffic the biggest one carries. Those two are the channel the');
console.log('  engine is visible through — a blade that loses its reticulation is a');
console.log('  blade the viewer can no longer read the chemistry off. See ROADMAP 13');
console.log('  item 0, which is where the needle died on exactly this measurement.');
console.log('');
console.log('  blind and invert sit at exactly +0.0% because dComp cannot act in flux');
console.log('  mode. That is section 4, and it is a derivation confirmed by two agents');
console.log('  independently rather than an absence of effect.');
console.log('');
console.log('  ⚠ READ THE BURDEN COLUMN BEFORE THE REST. Every agent here reaches 1.00,');
console.log('  meaning it has saturated the whole blade — so these rows are a GLOBAL');
console.log('  parameter change, not a lesion, and `gall` spreading traffic over 112');
console.log('  strands instead of 10 is what uniform overproduction does (every cell a');
console.log('  source, so no gradient, so no hierarchy). A real gall needs a PATCH, and');
console.log('  a patch needs the front slow against blade maturation. Unswept.');
console.log('');
console.log('  The `drawn` column is veinMax and is NOT a measurement — it reads 260');
console.log('  for every row including the control, because every configuration makes');
console.log('  more candidates than the cap. An earlier pass of this file reported it');
console.log('  as "veins" and read a flat 260 as "the agent changes nothing". `canals`');
console.log('  is the count with the cap taken off, and it is the one that moves.');

// =========================================================================
console.log('\n=== 3. DRAWN, because four numbers agreeing is not evidence of shape ===\n');
// =========================================================================
// This section exists for the reason test/conifer.mjs draws an ASCII crown: on
// that file, four numeric sections and a closed form all agreed with each other
// while the specimen was the wrong shape AND upside down.
//   '#' heavy strand   '+' medium   '.' minor   '~' agent above titre 0.35
console.log('  CONTROL\n');
console.log(draw(ctrl.L, null));
for (const name of ['gall', 'blind', 'invert']) {
  console.log(`\n  ${name.toUpperCase()}  (${JSON.stringify(AGENTS[name])})\n`);
  console.log(draw(grown[name].L, grown[name].inf));
}

// =========================================================================
console.log('\n\n=== 4. WHERE dComp CAN AND CANNOT BITE ===\n');
// =========================================================================
// A blade solves in 'flux' mode, which pins s = 1, and the PIN allocation is
//     P = p * ((1 - s) * g + s * c)
// so the gradient weight `g` — the ONLY thing `comp` touches — is multiplied by
// zero. `blind` and `invert` are therefore inert on a blade BY CONSTRUCTION, and
// the identical rows in section 2 are the correct answer rather than a bug.
// A competence agent is a MERISTEM agent. That is worth stating plainly because
// it is not obvious from the parameter list.
{
  const g0 = veinStats(grown['blind'].L), g1 = veinStats(grown['invert'].L);
  ok(g0.canals === cs.canals && Math.abs(g0.traffic - cs.traffic) < 1e-6 &&
    g1.canals === cs.canals && Math.abs(g1.traffic - cs.traffic) < 1e-6,
    'dComp is exactly inert on a blade (flux mode multiplies g by zero)',
    `blind ${g0.canals}/${f(g0.traffic, 3)}, invert ${g1.canals}/${f(g1.traffic, 3)}`);

  // The clamp renormalises rather than discarding carriers. The failure mode is
  // an inverted cell quietly allocating less PIN than it holds.
  //
  // MEASURING THAT ON A GROWN MERISTEM DOES NOT WORK, and the wrong version is
  // worth recording because it looked convincing: `p` is updated at the END of
  // the same stepAuxin call that allocated `P`, so sum(P)/p is one step stale
  // for every cell, infected or not. Comparing an infected run against a control
  // run then measures how far the two fields' auxin trajectories have diverged —
  // it came out 1.4e-3 apart with the INVERTED cells nearer 1.0 than the clean
  // ones, which is not even the sign the failure mode would produce.
  //
  // The claim is about a single allocation. So it is checked on a single
  // allocation, against `p` captured immediately before the call.
  const F = new CellField(16);
  const hub = F.add(0, 0, 1.0);
  for (let k = 0; k < 6; k++) {
    const th = k * Math.PI / 3;
    // deliberately uneven auxin, so the gradient weights are far from uniform
    // and a reflection through uniform genuinely drives some of them negative
    F.add(Math.cos(th), Math.sin(th), 0.2 + 0.9 * k);
  }
  F.clearTopology();
  for (let k = 1; k <= 6; k++) F.link(0, k, 1);
  for (let i = 0; i < F.n; i++) { F.comp[i] = -2.0; F.p[i] = 1.3 + 0.2 * i; }
  const pBefore = Array.from({ length: F.n }, (_, i) => F.p[i]);
  stepAuxin(F, { ...DEFAULT_PRM }, 'grad');   // grad mode: s = 0, so g is all of P

  let worst = 0, negWeights = 0;
  for (let i = 0; i < F.n; i++) {
    if (F.deg[i] === 0) continue;
    const o = i * MAXNB;
    let sum = 0;
    for (let k = 0; k < F.deg[i]; k++) { sum += F.P[o + k]; if (F.P[o + k] === 0) negWeights++; }
    const err = Math.abs(sum - pBefore[i]) / pBefore[i];
    if (err > worst) worst = err;
  }
  console.log(`  isolated allocation, comp = -2 on a 6-neighbour hub:`);
  console.log(`  ${negWeights} wall weights clamped to zero, worst sum(P) error ${worst.toExponential(2)}`);
  ok(negWeights > 0, 'the clamp actually fired', `${negWeights} walls`);
  ok(worst < 1e-6, 'each cell still allocates exactly its own PIN over its walls',
    `worst relative error ${worst.toExponential(2)}`);
}

// =========================================================================
console.log('\n=== 5. A MERISTEM UNDER THE AGENT — does patterning change? ===\n');
// =========================================================================
{
  console.log('  agent        organs   live   divergence  sd     lock    aMean   burden');
  const rows = [];
  for (const name of [null, 'blind', 'invert', 'gall', 'chlorosis']) {
    const prm = { ...DEFAULT_PRM };
    const m = new Meristem(prm, { G: 0.008 }, 3);
    let inf = null;
    for (let i = 0; i < 4000; i++) {
      m.step(1);
      if (name && !inf && i === 600) {
        inf = new Infection(m.F, { ...PATHOGEN_DEFAULTS, ...AGENTS[name] });
        inf.inoculate(0, 0);   // the centre of the apex
      }
    }
    const st = m.divergenceStats(40);
    const b = inf ? inf.burden(0.35) : { frac: 0 };
    rows.push({ name, organs: m.emitted.length, live: m.primordia.length, st, b, aMean: m.aMean });
    console.log(`  ${(name || '(control)').padEnd(12)} ${String(m.emitted.length).padStart(5)}  ` +
      `${String(m.primordia.length).padStart(5)}    ` +
      `${st ? f(st.mean, 1).padStart(6) + '°' : '   --  '}  ${st ? f(st.sd, 1).padStart(5) : '  -- '}  ` +
      `${st ? f(st.lock, 2).padStart(5) : '  -- '}   ${f(m.aMean, 2).padStart(5)}   ${f(b.frac, 2)}`);
  }
  const ctl = rows[0];
  console.log('\n  Read this as a comparison, not a score. Phyllotaxis here wanders');
  console.log('  90-160° UNINFECTED — the project\'s honest headline limitation — so a');
  console.log('  shifted mean is NOT by itself evidence the agent did anything. Organ');
  console.log('  COUNT is the reliable column: founding an organ requires sharpening a');
  console.log('  maximum, which is exactly the operation `comp` gates.');
  ok(ctl.organs > 0, 'the control meristem emits organs at all', `${ctl.organs}`);
}

console.log('');
if (failures) { console.log(`${failures} FAILURE(S)\n`); process.exit(1); }
console.log('all infected-tissue checks passed\n');
