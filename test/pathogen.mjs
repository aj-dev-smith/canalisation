// ---------------------------------------------------------------------------
// AN AGENT IN THE TISSUE — the derivation, then the measurement.
//
// Sections 1-3 are the pre-flight: an invasion front has a closed-form speed,
// so this file works the number out first and then asks the solver for it. That
// ordering is the only reason to believe anything the later sections print.
//
//   1. Fisher-KPP front speed, against the EXACT DISCRETE dispersion relation
//      c* = min_L [ (2 Dv (cosh L - 1) + rho) / L ]     (not just 2 sqrt(Dv rho),
//      which is its continuum limit and is also printed for comparison)
//   2. The invasion threshold. R0 = r/clr, and nothing invades below 1.
//   3. Advection by the host's own flux. NOT a shift of c* — upwind advection
//      enters the dispersion relation as adv*(e^L - 1), and assuming otherwise
//      is the first thing this file caught.
//   4. The clamp added to stepAuxin is a NO-OP for every shipped species.
//
// Asserts and exits non-zero.
// ---------------------------------------------------------------------------
import { CellField, stepAuxin, DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';
import { Infection, PATHOGEN_DEFAULTS, AGENTS } from '../src/15_pathogen.js';
import { Meristem } from '../src/20_meristem.js';

let failures = 0;
function ok(cond, label, detail) {
  const tag = cond ? '  ok  ' : ' FAIL ';
  if (!cond) failures++;
  console.log(`${tag} ${label}${detail ? '   ' + detail : ''}`);
}
const f = (x, n = 4) => Number(x).toFixed(n);

// --- the closed form -------------------------------------------------------
// Linearising the agent's equation about v = 0 on a uniform chain gives
//   dv_i/dt = Dv (v_{i+1} - 2 v_i + v_{i-1}) + rho v_i,     rho = r - clr
// and a front v ~ exp(L(ct - i)) requires  c(L) = [2 Dv (cosh L - 1) + rho] / L.
// A pulled front travels at the minimum of that over L > 0.
//
// ADVECTION IS NOT A SHIFT, and assuming it was is what this file caught first.
// The agent is carried by an UPWIND difference — chi*u*(v_{i-1} - v_i) — because
// that is the only stable way to advect on a graph with no preferred axis. Under
// the same ansatz v_{i-1} = v_i e^L, so the term enters the dispersion relation
// as chi*u*(e^L - 1), NOT as chi*u*L. The two agree only as L -> 0. Upwind
// differencing carries its own numerical diffusion, so an advected front is
// genuinely faster than "the still-air speed plus the wind":
//
//   c(L) = [ 2 Dv (cosh L - 1) + rho + adv (e^L - 1) ] / L
//
function frontSpeedDiscrete(Dv, rho, adv = 0) {
  if (rho <= 0) return adv;
  let best = Infinity;
  // golden-section would do; a fine scan is clearer and this is not hot
  for (let L = 1e-4; L < 12; L += 1e-4) {
    const c = (2 * Dv * (Math.cosh(L) - 1) + rho + adv * (Math.expm1(L))) / L;
    if (c < best) best = c;
  }
  return best;
}
const frontSpeedContinuum = (Dv, rho, adv = 0) => adv + 2 * Math.sqrt(Math.max(0, Dv * rho));

// The endemic titre. Logistic growth against clearance settles where
// r v (1 - v) = clr v, i.e. v* = 1 - clr/r — NOT at the carrying capacity.
// A front is only detectable by a threshold below this.
const endemicTitre = (r, clr) => Math.max(0, 1 - clr / r);

// --- a 1D chain of cells, which is a topology stepAuxin already supports ----
function chain(N, w = 1) {
  const F = new CellField(N + 4);
  for (let i = 0; i < N; i++) F.add(i, 0, 0);
  F.clearTopology();
  for (let i = 0; i + 1 < N; i++) F.link(i, i + 1, w);
  return F;
}

// front position = the last cell above `thresh`, linearly interpolated
function frontPos(F, thresh = 0.5) {
  let last = -1;
  for (let i = 0; i < F.n; i++) if (F.vir[i] > thresh) last = i;
  if (last < 0 || last + 1 >= F.n) return last;
  const a = F.vir[last], b = F.vir[last + 1];
  return last + (a - thresh) / Math.max(1e-9, a - b);
}

// =========================================================================
console.log('\n=== 1. FISHER-KPP FRONT SPEED — derived first, then measured ===\n');
// =========================================================================
{
  const N = 600, dt = 0.005;
  const cases = [
    { r: 0.90, clr: 0.00, Dv: 0.35 },
    { r: 0.90, clr: 0.00, Dv: 0.70 },   // double Dv  — scaling checked below
    { r: 1.80, clr: 0.00, Dv: 0.35 },   // double rho — and it is not sqrt(2)
    { r: 0.60, clr: 0.20, Dv: 0.50 },   // clearance just subtracts from rho
  ];
  console.log('   Dv      r     clr    rho   c_continuum  c_discrete   c_measured    err');
  const measured = [];
  for (const cs of cases) {
    const F = chain(N);
    const inf = new Infection(F, { ...PATHOGEN_DEFAULTS, ...cs, chi: 0 });
    inf.inoculateIndex(0);
    // the front is tracked at half the ENDEMIC titre, not half the carrying
    // capacity — with clearance on, the tissue behind the front never reaches 1
    const th = 0.5 * endemicTitre(cs.r, cs.clr);
    // let the front form, then time it over a window well away from the seed
    const T0 = 60, T1 = 160;
    let x0 = 0, x1 = 0, t = 0;
    while (t < T1) {
      inf.step(dt); t += dt;
      if (Math.abs(t - T0) < dt / 2) x0 = frontPos(F, th);
    }
    x1 = frontPos(F, th);
    const c = (x1 - x0) / (T1 - T0);
    const rho = cs.r - cs.clr;
    const cd = frontSpeedDiscrete(cs.Dv, rho);
    const cc = frontSpeedContinuum(cs.Dv, rho);
    const err = (c - cd) / cd;
    measured.push({ ...cs, rho, c, cd, cc, err });
    console.log(`  ${f(cs.Dv, 2)}   ${f(cs.r, 2)}   ${f(cs.clr, 2)}   ${f(rho, 2)}` +
      `     ${f(cc)}      ${f(cd)}      ${f(c)}    ${(err * 100).toFixed(2)}%`);
  }
  console.log('');
  for (const m of measured) {
    ok(Math.abs(m.err) < 0.05,
      `front speed within 5% of the discrete closed form (Dv=${m.Dv}, rho=${f(m.rho, 2)})`,
      `measured ${f(m.c)} vs ${f(m.cd)}`);
  }
  // Ratios are the sharper statement — the Bramson log correction largely
  // cancels between two runs, so these land an order of magnitude tighter than
  // the absolute band above and cannot be hit by accident.
  //
  // NOTE they are NOT sqrt(2). The sqrt scaling of 2*sqrt(Dv*rho) is a CONTINUUM
  // statement; on a lattice the ratio is whatever the discrete relation says,
  // and asserting sqrt(2) here was this file's first false failure.
  const s1 = measured[1].c / measured[0].c, p1 = measured[1].cd / measured[0].cd;
  const s2 = measured[2].c / measured[0].c, p2 = measured[2].cd / measured[0].cd;
  console.log(`  doubling Dv : measured x${f(s1)}  discrete x${f(p1)}  (continuum would be x${f(Math.SQRT2)})`);
  console.log(`  doubling rho: measured x${f(s2)}  discrete x${f(p2)}  (continuum would be x${f(Math.SQRT2)})\n`);
  ok(Math.abs(s1 / p1 - 1) < 0.01, 'doubling Dv scales as the discrete relation says', `${f(s1)} vs ${f(p1)}`);
  ok(Math.abs(s2 / p2 - 1) < 0.01, 'doubling rho scales as the discrete relation says', `${f(s2)} vs ${f(p2)}`);
  console.log('  The continuum value 2*sqrt(Dv*rho) is 2-4% low here, which is the');
  console.log('  lattice: a discrete front outruns its continuum limit. Asserting on');
  console.log('  the discrete form is what makes a 5% band meaningful rather than slack.');
}

// =========================================================================
console.log('\n=== 2. THE INVASION THRESHOLD — R0 = r/clr ===\n');
// =========================================================================
{
  const dt = 0.005, T = 200;
  console.log('     r     clr     R0    v* predicted   v* at source    burden   invades');
  const rows = [];
  for (const [r, clr] of [[0.9, 0.3], [0.9, 0.7], [0.9, 0.9], [0.9, 1.1], [0.9, 1.6]]) {
    const F = chain(300);
    const inf = new Infection(F, { ...PATHOGEN_DEFAULTS, r, clr, Dv: 0.35, chi: 0 });
    inf.inoculateIndex(0);
    for (let t = 0; t < T; t += dt) inf.step(dt);
    const vEq = endemicTitre(r, clr);
    const b = inf.burden(0.5 * vEq);
    const R0 = r / clr;
    rows.push({ r, clr, R0, b, vEq, vSrc: F.vir[0] });
    console.log(`   ${f(r, 2)}   ${f(clr, 2)}   ${f(R0, 2)}      ${f(vEq, 3)}          ${f(F.vir[0], 3)}` +
      `      ${f(b.total, 2).padStart(7)}    ${b.cells > 0}`);
  }
  for (const row of rows) {
    if (row.R0 > 1.05) {
      ok(row.b.cells > 0, `R0 = ${f(row.R0, 2)} > 1 invades`, `${row.b.cells} cells`);
      // the endemic level is its own closed form, and getting it wrong is what
      // made the R0 = 1.29 case look like a failure: it HAD invaded, to a titre
      // of 0.22, under a detector that only looked above 0.5
      ok(Math.abs(row.vSrc - row.vEq) < 0.01, `  and settles at v* = 1 - clr/r`,
        `${f(row.vSrc, 3)} vs ${f(row.vEq, 3)}`);
    }
    if (row.R0 < 0.95) ok(row.b.total < 1e-3, `R0 = ${f(row.R0, 2)} < 1 dies out`, `burden ${f(row.b.total, 6)}`);
  }
  console.log('\n  Nothing schedules this and no cell counts down. An agent that cannot');
  console.log('  outrun clearance simply fails to establish — which is the same kind of');
  console.log('  emergent condition as Plant.spent(). And the tissue behind the front');
  console.log('  does NOT saturate: it holds 1 - clr/r, so a mild agent is a permanent');
  console.log('  low-grade deformation rather than an all-or-nothing one.');
}

// =========================================================================
console.log('\n=== 3. CARRIED BY THE HOST\'S OWN FLUX — the upwind dispersion relation ===\n');
// =========================================================================
{
  const N = 600, dt = 0.005, Dv = 0.35, r = 0.9, clr = 0;
  console.log('    chi      u    predicted    measured     err');
  const out = [];
  for (const [chi, u] of [[0, 1], [0.4, 1.0], [0.8, 1.0], [0.4, 2.0]]) {
    const F = chain(N);
    // impose a uniform rightward transport field. stepAuxin makes J exactly
    // antisymmetric across a wall, so a chain carrying flux u to the right has
    // J = +u on every i->i+1 half-edge and -u on every mirror.
    for (let i = 0; i < F.n; i++) {
      const o = i * MAXNB;
      for (let k = 0; k < F.deg[i]; k++) F.J[o + k] = F.nbr[o + k] > i ? u : -u;
    }
    const inf = new Infection(F, { ...PATHOGEN_DEFAULTS, r, clr, Dv, chi });
    inf.inoculateIndex(0);
    const T0 = 40, T1 = 100;
    let x0 = 0, t = 0;
    while (t < T1) {
      inf.step(dt); t += dt;
      if (Math.abs(t - T0) < dt / 2) x0 = frontPos(F);
    }
    const c = (frontPos(F) - x0) / (T1 - T0);
    const pred = frontSpeedDiscrete(Dv, r - clr, chi * u);
    const err = (c - pred) / pred;
    out.push({ chi, u, c, pred, err });
    console.log(`   ${f(chi, 2)}   ${f(u, 2)}    ${f(pred)}     ${f(c)}    ${(err * 100).toFixed(2)}%`);
  }
  for (const o of out) {
    ok(Math.abs(o.err) < 0.05, `advected front matches the upwind dispersion relation (chi=${o.chi}, u=${o.u})`,
      `${f(o.c)} vs ${f(o.pred)}`);
  }
  console.log('\n  This is the term that matters: `J` is the realised auxin transport the');
  console.log('  solver computes anyway, so an agent riding it needs no spread geometry.');
  console.log('  Where an infection goes is decided by the plant\'s own polarity field.');
}

// =========================================================================
console.log('\n=== 4. THE CLAMP IS A NO-OP FOR EVERY SHIPPED SPECIES ===\n');
// =========================================================================
{
  // stepAuxin gained a branch for comp < 0. The claim is that no shipped
  // species can reach it, because comp in [0,1] makes the PIN weight a convex
  // combination of two non-negative numbers. Check the premise on real tissue
  // rather than on paper: run a meristem and watch min(comp).
  const prm = { ...DEFAULT_PRM };
  const m = new Meristem(prm, { G: 0.0042 }, 11);
  let minComp = Infinity, maxComp = -Infinity, steps = 0;
  for (let i = 0; i < 400; i++) {
    m.step(1); steps++;
    const F = m.F;
    for (let c = 0; c < F.n; c++) {
      if (!(F.flag[c] & 1)) continue;
      if (F.comp[c] < minComp) minComp = F.comp[c];
      if (F.comp[c] > maxComp) maxComp = F.comp[c];
    }
  }
  console.log(`  ${steps} meristem steps, comp range observed: [${f(minComp)}, ${f(maxComp)}]`);
  ok(minComp >= 0, 'no cell in an uninfected meristem ever has comp < 0',
    `min ${f(minComp)}`);
  ok(maxComp <= 1.0001, 'and none exceeds 1', `max ${f(maxComp)}`);

  // And the algebra the claim rests on, stated as a check rather than a comment.
  let worst = Infinity;
  for (let d = 2; d <= MAXNB; d++) {
    const uni = 1 / d;
    for (let gi = 0; gi <= 20; gi++) {
      const g = gi / 20;
      for (let ci = 0; ci <= 20; ci++) {
        const cmp = ci / 20;
        const v = uni + (g - uni) * cmp;
        if (v < worst) worst = v;
      }
    }
  }
  ok(worst >= 0, 'the blend is non-negative over the whole shipped comp range',
    `min ${f(worst, 6)}`);

  // A dead agent must also be exactly inert.
  const F2 = chain(50);
  const inert = new Infection(F2, { ...PATHOGEN_DEFAULTS, dRho: 2, dMu: 1, dComp: -1 });
  const before = Array.from({ length: F2.n }, (_, i) => [F2.rho[i], F2.mu[i], F2.comp[i]]);
  inert.apply(); inert.revert();
  let exact = true;
  for (let i = 0; i < F2.n; i++) {
    if (F2.rho[i] !== before[i][0] || F2.mu[i] !== before[i][1] || F2.comp[i] !== before[i][2]) exact = false;
  }
  ok(exact, 'apply() then revert() restores the host bit-for-bit', '(stash-and-copy, not add-then-subtract)');
}

// =========================================================================
console.log('\n=== 5. THE NAMED AGENTS, and whether each one establishes ===\n');
// =========================================================================
{
  const dt = 0.005, T = 100;
  console.log('   agent        r    clr    R0     Dv    chi    dRho   dMu   dComp   burden');
  for (const [name, a] of Object.entries(AGENTS)) {
    const o = { ...PATHOGEN_DEFAULTS, ...a };
    const F = chain(300);
    if (o.chi) for (let i = 0; i < F.n; i++) {
      const ofs = i * MAXNB;
      for (let k = 0; k < F.deg[i]; k++) F.J[ofs + k] = F.nbr[ofs + k] > i ? 1 : -1;
    }
    const inf = new Infection(F, o);
    inf.inoculateIndex(0);
    for (let t = 0; t < T; t += dt) inf.step(dt);
    const b = inf.burden(0.5);
    const R0 = o.clr > 0 ? o.r / o.clr : Infinity;
    console.log(`   ${name.padEnd(11)} ${f(o.r, 2)}  ${f(o.clr, 2)}  ${(R0 === Infinity ? 'inf' : f(R0, 1)).padStart(5)}` +
      `  ${f(o.Dv, 2)}  ${f(o.chi, 2)}   ${f(o.dRho, 2)}  ${f(o.dMu, 2)}   ${f(o.dComp, 2)}   ${f(b.frac, 3)}`);
    ok(b.cells > 0, `agent '${name}' establishes`, `${(b.frac * 100).toFixed(1)}% of the chain`);
  }
}

console.log('');
if (failures) { console.log(`${failures} FAILURE(S)\n`); process.exit(1); }
console.log('all pathogen pre-flight checks passed\n');
