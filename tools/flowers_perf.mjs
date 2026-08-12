// flowers.html frame-gap sampler — the garden_hitch.mjs lesson applied to the
// flower piece: A HARNESS THAT WAITS CANNOT SEE A FREEZE. Every capture script
// navigates, waits and screenshots, so a frozen tab and a busy one are the same
// script; this one samples requestAnimationFrame gaps for ~30 seconds of LIVE
// growth (no ff — fast-forward runs 40 steps a frame by design and would bury
// the number being measured) and prints where the time went.
//
//   node tools/flowers_perf.mjs ['<query>'] [seconds]
//   node tools/flowers_perf.mjs 'seed=21&form=daisy' 30
//
// PRINTS, DOES NOT JUDGE. There is no frame budget for this piece yet; this
// file establishes the baseline (the project's split: emergent and perceptual
// quantities are printed and read, physical claims are asserted). When a budget
// exists, write it against these numbers — and remember garden_hitch's other
// lesson before adding a verdict line: its FREEZES verdict outlived the scene
// it was written for.
//
// Garden-aware: reports __fl.garden's specimen count when that handle exists,
// 'garden: not built yet' when it does not.
//
// Headed ANGLE-on-Metal on darwin, same as flowers_shot.mjs — a software-path
// sample is a measurement of swiftshader, not of the piece.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , query = '', secondsArg] = process.argv;
const seconds = Math.max(5, +(secondsArg || 30));
const q = new URLSearchParams(query);
if (q.has('ff')) {
  console.error('note: dropping ff=' + q.get('ff') + ' — this tool measures live growth');
  q.delete('ff');
}
const qs = q.toString();
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + (qs ? '?' + qs : '');

const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 2 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl);
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function',
  null, { timeout: 30000 });

// The sampler lives in the page: an independent rAF loop records the gap
// between callbacks. Sampling from outside over the protocol cannot see a
// stalled main thread — that is the whole point of doing it this way.
await pg.evaluate(() => {
  window.__gaps = [];
  let last = performance.now();
  const loop = (t) => {
    window.__gaps.push(t - last);
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

const st0 = await pg.evaluate(() => window.__fl.state());
console.log(`sampling ${seconds}s of live growth from step ${st0.step} ...`);
// wait in chunks so a hung page fails inside a minute, not silently forever
for (let waited = 0; waited < seconds * 1000; waited += 5000)
  await pg.waitForTimeout(Math.min(5000, seconds * 1000 - waited));

const r = await pg.evaluate(() => {
  const gaps = window.__gaps.slice(1);   // first gap spans the injection
  const fl = window.__fl;
  return {
    gaps,
    step: fl.state().step,
    hud: document.getElementById('hud').textContent,
    garden: Array.isArray(fl.garden) ? fl.garden.length : null,
    organs: fl.B && fl.B.organs ? fl.B.organs.length : null,
  };
});

const gaps = r.gaps.slice().sort((a, b) => a - b);
const pick = (p) => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))];
const total = r.gaps.reduce((a, x) => a + x, 0);
const hudFps = (r.hud.match(/(\d+)\s*fps/) || [])[1];

console.log(`\n${r.gaps.length} frames over ${(total / 1000).toFixed(1)}s  ` +
  `(steps ${st0.step} -> ${r.step}, ${r.organs ?? '?'} organs drawn)`);
console.log(`gap median ${pick(0.5).toFixed(1)}ms  p95 ${pick(0.95).toFixed(1)}ms  ` +
  `p99 ${pick(0.99).toFixed(1)}ms  worst ${gaps[gaps.length - 1].toFixed(1)}ms`);
console.log(`fps ${(r.gaps.length / (total / 1000)).toFixed(1)} measured  ` +
  `hud ${hudFps ? hudFps : '?'}`);
console.log(r.garden !== null ? `garden: ${r.garden} specimens` : 'garden: not built yet');
if (errs.length) {
  console.error('--- page errors ---\n' + errs.slice(0, 10).join('\n'));
  await b.close();
  process.exit(1);
}
await b.close();
