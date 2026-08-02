// ---------------------------------------------------------------------------
// A PATHOGEN IN THE MERISTEM
//
// Sections 1-3 are the DERIVATION, checked against closed forms worked out
// before the solver was written. Section 4 is the phenotype, which is chemistry
// and is therefore printed rather than pinned. Section 5 draws it, because four
// numeric sections agreeing with each other is exactly how the conifer came out
// upside down (see test/conifer.mjs section 3b).
//
// Asserts and exits non-zero. Not wired into CI.
// ---------------------------------------------------------------------------

import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { PATHOGEN_DEFAULTS, inoculate, viralLoad, frontSpeed, frontWidth } from '../src/15_pathogen.js';

const prm = { ...DEFAULT_PRM };
const T_PER_FRAME = prm.dt * prm.substeps;   // the pathogen runs on the auxin clock
const WBAR = 0.70;                            // measured mean wall conductance
let fails = 0;
function check(name, ok, got, want) {
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(46)} ${got}${want ? `   (${want})` : ''}`);
}

// a static sheet: no expansion, no rim loss, no organ detection
function staticField(vp, R = 16) {
  return new Meristem(prm, { G: 0, R, maxCells: 6000, detectOff: true, pathogen: vp }, 3);
}

// ---------------------------------------------------------------------------
console.log('\n1. THE FRONT — does the solver reproduce Nagumo?');
console.log('   c = sqrt(rep * Deff / 2) * (1 - 2 vA),  Deff = Dv * wbar * 3/2');
console.log('   rep    Dv    vA     width   c_closed   c_meas    ratio');
{
  const cases = [[0.5, 2, 0.15], [0.5, 2, 0.30], [1.0, 2, 0.15], [0.5, 4, 0.15]];
  const ratios = [];
  for (const [rep, Dv, vA] of cases) {
    const vp = { ...PATHOGEN_DEFAULTS, rep, Dv, vA };
    const m = staticField(vp);
    for (let i = 0; i < m.F.n; i++) if (m.F.x[i] < -6) m.F.vir[i] = 1;
    const front = (F) => { let b = -99; for (let i = 0; i < F.n; i++) if (Math.abs(F.y[i]) < 3 && F.vir[i] > 0.5 && F.x[i] > b) b = F.x[i]; return b; };
    const x0 = front(m.F);
    for (let s = 0; s < 600; s++) m.step(1);
    const cMeas = (front(m.F) - x0) / (600 * T_PER_FRAME);
    const cClosed = frontSpeed(vp, WBAR);
    ratios.push(cMeas / cClosed);
    console.log(`   ${String(rep).padEnd(6)}${String(Dv).padEnd(6)}${String(vA).padEnd(7)}${frontWidth(vp, WBAR).toFixed(2).padStart(5)}` +
      `${cClosed.toFixed(3).padStart(11)}${cMeas.toFixed(3).padStart(9)}${(cMeas / cClosed).toFixed(3).padStart(9)}`);
  }
  // A 600-frame front position read off a relaxing, dividing cell lattice. The
  // band is deliberately the one test/stem.mjs accepts for its own pre-flight.
  const lo = Math.min(...ratios), hi = Math.max(...ratios);
  check('every ratio within 0.6-1.5 of the closed form', lo > 0.6 && hi < 1.5,
    `${lo.toFixed(2)}-${hi.toFixed(2)}`);
  // The sign is the whole result: 2 vA > 1 means the tissue clears itself.
  const retreat = frontSpeed({ ...PATHOGEN_DEFAULTS, vA: 0.6 }, WBAR);
  check('a dose above 1/2 gives a RETREATING front', retreat < 0, retreat.toFixed(3));
}

// ---------------------------------------------------------------------------
console.log('\n2. THE CRITICAL NUCLEUS — how small an infection heals over?');
console.log('   a 2D front has curvature: dR/dt = c - Deff/R, so R* = Deff/c.');
console.log('   Scanned at 0.25 cells: a unit-granularity sweep cannot resolve this,');
console.log('   and the first pass "failed" by 0.07 of a cell for that reason alone.');
console.log('   rep    Dv    vA     R*_closed   R*_meas   excess');
{
  const cases = [[0.5, 2, 0.15], [1.0, 2, 0.15], [0.5, 2, 0.05], [0.5, 4, 0.15]];
  const excess = [];
  for (const [rep, Dv, vA] of cases) {
    const vp = { ...PATHOGEN_DEFAULTS, rep, Dv, vA };
    const Rstar = (Dv * WBAR * 1.5) / frontSpeed(vp, WBAR);
    let thresh = null;
    for (let r0 = 2.0; r0 <= 8.0; r0 += 0.25) {
      const m = staticField(vp, 18);
      inoculate(m.F, { x: 0, y: 0, r: r0, titre: 1.0 });
      for (let s = 0; s < 1500; s++) m.step(1);
      if (viralLoad(m.F).frac > 0.02) { thresh = r0; break; }
    }
    excess.push(thresh === null ? NaN : thresh - Rstar);
    console.log(`   ${String(rep).padEnd(6)}${String(Dv).padEnd(6)}${String(vA).padEnd(7)}` +
      `${Rstar.toFixed(2).padStart(8)}${(thresh ?? NaN).toFixed(2).padStart(11)}${(thresh - Rstar).toFixed(2).padStart(9)}`);
  }
  // The closed form is a THIN-FRONT result and an inoculated disc is a step,
  // not a tanh: it spends some radius forming its own front before it can
  // start moving. So the measured threshold must sit ABOVE the closed form,
  // and the assertion is that ordering plus a bound — not a fitted tolerance.
  check('R* is a lower bound: measured exceeds closed form in every case',
    excess.every(e => e > 0), excess.map(e => e.toFixed(2)).join(' '));
  check('...and by under 1.5 cells, so the closed form is useful',
    excess.every(e => e < 1.5), `max ${Math.max(...excess).toFixed(2)}`);
}

// ---------------------------------------------------------------------------
console.log('\n3. THE RACE — can a growing meristem throw an infection off its rim?');
console.log('   tissue is carried out at v(r) = Gt r, so a front holds only inside');
console.log('   r = c/Gt. Viable needs R* as well, so exclusion is visible only when');
console.log('   PI = rep (1 - 2 vA)^2 / (2 Gt) < 1 AND c/Gt + 2 R* < R.');
{
  const G = 0.008, Gt = G / T_PER_FRAME;
  const table = [
    ['shipped default', { ...PATHOGEN_DEFAULTS }],
    ['slow replicator ', { rep: 0.2, Dv: 0.244, vA: 0.05 }],
  ];
  for (const [label, over] of table) {
    const vp = { ...PATHOGEN_DEFAULTS, ...over };
    const c = frontSpeed(vp, WBAR), Deff = vp.Dv * WBAR * 1.5;
    const Rstar = Deff / c, cap = c / Gt;
    const PI = vp.rep * (1 - 2 * vp.vA) ** 2 / (2 * Gt);
    const fits = cap + 2 * Rstar < 10;
    console.log(`   ${label}  R*=${Rstar.toFixed(2)}  capture r=${cap.toFixed(2)}  PI=${PI.toFixed(2)}` +
      `  ${fits ? 'exclusion is geometrically reachable' : 'no viable inoculum can be excluded'}`);
  }
  // the slow replicator: a supercritical patch placed outside the capture
  // radius should be swept off the rim, and the same patch on the apex should
  // take. That contrast is the experiment; the shipped pathogen cannot show it.
  const vp = { ...PATHOGEN_DEFAULTS, rep: 0.2, Dv: 0.244, vA: 0.05 };
  const trial = (x0) => {
    const m = new Meristem(prm, { G, pathogen: vp }, 3);
    inoculate(m.F, { x: x0, y: 0, r: 2.4, titre: 1.0 });
    for (let s = 0; s < 4000; s++) m.step(1);
    return viralLoad(m.F).frac;
  };
  const onApex = trial(0), offApex = trial(6.5);
  console.log(`   inoculated on the apex: frac=${onApex.toFixed(3)}    out at r=6.5: frac=${offApex.toFixed(3)}`);
  check('an apex inoculation establishes', onApex > 0.5, onApex.toFixed(3));
  check('the same inoculum out on the flank is EXPELLED', offApex < 0.02, offApex.toFixed(3));
}

// ---------------------------------------------------------------------------
console.log('\n4. THE PHENOTYPE — printed, not pinned. This half is chemistry.');
console.log('');
console.log('   ⚠ ORGAN COUNT IS NOT THE INSTRUMENT HERE, and using it reports a');
console.log('   correct-looking result for the wrong reason. `detect()` gates on');
console.log('   `F.comp[i] < 0.5`, so suppressing competence switches the organ');
console.log('   DETECTOR off by fiat, whatever the tissue is doing. A first pass');
console.log('   asserted "full suppression founds no organs" and it would have');
console.log('   passed without the tissue having changed at all. `patternStats()`');
console.log('   has no such gate: contrast is max/mean of the auxin field itself,');
console.log('   and it is what says whether a maximum can still be sharpened.');
console.log('');
console.log('   variant           peaks  CONTRAST  spacing   aMean   titre   organs*');
const pheno = {};
{
  const STEPS = +(process.env.STEPS || 4000);
  const run = (label, patho) => {
    const m = new Meristem(prm, { G: 0.008, ...(patho ? { pathogen: { ...PATHOGEN_DEFAULTS, ...patho } } : {}) }, 3);
    if (patho) inoculate(m.F, { x: 0, y: 0, r: 5, titre: 1.0 });
    // one frame of patternStats is noisy; average the last 500
    let n = 0, pk = 0, ct = 0, sp = 0;
    for (let s = 0; s < STEPS; s++) {
      m.step(1);
      if (s >= STEPS - 500) { const ps = m.patternStats(); pk += ps.peaks; ct += ps.contrast; sp += ps.spacing; n++; }
    }
    const L = viralLoad(m.F);
    const rec = { peaks: pk / n, contrast: ct / n, spacing: sp / n,
      aMean: m.aMean, titre: L.mean, organs: m.emitted.length, m };
    pheno[label] = rec;
    console.log(`   ${label.padEnd(17)}${rec.peaks.toFixed(1).padStart(5)}${rec.contrast.toFixed(2).padStart(10)}` +
      `${rec.spacing.toFixed(2).padStart(9)}${rec.aMean.toFixed(2).padStart(8)}${rec.titre.toFixed(2).padStart(8)}` +
      `${String(rec.organs).padStart(9)}`);
    return rec;
  };
  run('healthy', null);
  run('passenger', {});
  for (const cm of [0.75, 0.5, 0.25, 0.1, 0.0]) run(`compMul=${cm}`, { compMul: cm });
  for (const rm of [1.5, 2.5, 4.0, 8.0]) run(`rhoMul=${rm}`, { rhoMul: rm });
  console.log('   * organs is printed for continuity with test/focus.mjs and is the');
  console.log('     confounded column. Read CONTRAST.');

  // A passenger replicates to full titre and multiplies nothing, so it must be
  // invisible. This is the control, and it is what catches the whole file
  // becoming a way of perturbing the tissue merely by being present.
  const h = pheno['healthy'], p = pheno['passenger'];
  check('a passenger at full titre changes NOTHING', h.contrast === p.contrast && h.peaks === p.peaks,
    `contrast ${h.contrast.toFixed(2)} vs ${p.contrast.toFixed(2)}, peaks ${h.peaks.toFixed(1)} vs ${p.peaks.toFixed(1)}`);
  check('...and it really did replicate', p.titre > 0.9, p.titre.toFixed(2));

  // Competence is how sharply a cell can polarise, so suppressing it must cost
  // CONTRAST monotonically and end in a field with no maxima left in it.
  const seq = [h, pheno['compMul=0.75'], pheno['compMul=0.5'], pheno['compMul=0.25'],
    pheno['compMul=0.1'], pheno['compMul=0']].map(r => r.contrast);
  let mono = true; for (let i = 1; i < seq.length; i++) if (seq[i] > seq[i - 1]) mono = false;
  check('contrast falls monotonically with competence', mono, seq.map(v => v.toFixed(2)).join(' > '));
  check('full suppression flattens the field (contrast < 1.3)', pheno['compMul=0'].contrast < 1.3,
    pheno['compMul=0'].contrast.toFixed(2), 'healthy 9.00');
  check('...and leaves under one maximum standing', pheno['compMul=0'].peaks < 1.5,
    pheno['compMul=0'].peaks.toFixed(1));

  // The two phenotypes reach a flat field by different routes, and the auxin
  // budget is what tells them apart: a pin cannot pattern the auxin it has, a
  // gall has drowned in auxin it cannot spend. Same contrast, 10x the budget.
  const pin = pheno['compMul=0'], gall = pheno['rhoMul=8'];
  check('a gall flattens the field too', gall.contrast < 1.4, gall.contrast.toFixed(2));
  check('a pin keeps the healthy auxin budget (<20%)',
    Math.abs(pin.aMean - h.aMean) / h.aMean < 0.20, `${pin.aMean.toFixed(2)} vs ${h.aMean.toFixed(2)}`);
  check('a gall reaches the same flatness on 5x the auxin',
    gall.aMean / pin.aMean > 5, `${gall.aMean.toFixed(2)} vs ${pin.aMean.toFixed(2)}`);

  // The result nobody predicted: PARTIAL suppression does not thin the pattern
  // out, it multiplies it. Weak polarisation cannot build a few strong maxima,
  // so it builds many weak ones, closer together.
  check('partial suppression MULTIPLIES maxima (0.5 vs healthy)',
    pheno['compMul=0.5'].peaks > h.peaks * 1.5 && pheno['compMul=0.5'].spacing < h.spacing,
    `peaks ${h.peaks.toFixed(1)} -> ${pheno['compMul=0.5'].peaks.toFixed(1)}, ` +
    `spacing ${h.spacing.toFixed(2)} -> ${pheno['compMul=0.5'].spacing.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
console.log('\n5. DRAWN — titre (left) against auxin (right). Four numbers agreeing');
console.log('   with each other is how the conifer came out upside down.');
{
  const draw = (m, field, hi) => {
    const W = 31, H = 15, R = 10, ramp = ' .:-=+*#%@';
    const rows = [];
    for (let ry = 0; ry < H; ry++) {
      let line = '';
      for (let rx = 0; rx < W; rx++) {
        const x = (rx / (W - 1) - 0.5) * 2 * R, y = (0.5 - ry / (H - 1)) * 2 * R;
        let best = -1, bd = 1e9;
        for (let i = 0; i < m.F.n; i++) {
          const d = (m.F.x[i] - x) ** 2 + (m.F.y[i] - y) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
        if (bd > 1.6 * 1.6) { line += ' '; continue; }
        const v = field(best) / hi;
        line += ramp[Math.max(0, Math.min(9, Math.round(v * 9)))];
      }
      rows.push(line);
    }
    return rows;
  };
  for (const label of ['healthy', 'compMul=0.5', 'compMul=0', 'rhoMul=8']) {
    const m = pheno[label].m;
    const a = draw(m, (i) => m.F.vir[i], 1);
    const b = draw(m, (i) => m.F.a[i], Math.max(1e-6, pheno[label].aMean * 2.2));
    console.log(`\n   ${label}   titre${' '.repeat(24)}auxin`);
    for (let r = 0; r < a.length; r++) console.log('   ' + a[r] + '  |  ' + b[r]);
  }
}

console.log(`\n${fails ? `FAILED ${fails} check(s)` : 'all checks passed'}`);
process.exit(fails ? 1 : 0);
