// DOES PLANTING A GARDEN FREEZE THE TAB?
//
// It did: the head start ran in one synchronous loop, 11,400 steps for a stand
// of seven, and a step during GROWTH costs about 1.7ms because that is when the
// leaf pool canalises its library. Nineteen seconds of blocked main thread, and
// nothing in `tools/` noticed, because every other tool here sits and waits.
//
// So this measures the one thing those cannot: the longest gap between animation
// frames while the stand establishes. That is what "it freezes" actually means,
// and it is a number.
//
//   node tools/garden_hitch.mjs [n] [seed] [radius] [budgetMs]

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , n = '7', seed = '20260728', radius = '20', budget = ''] = process.argv;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pathToFileURL(process.cwd() + '/canalisation.html').href);
await pg.waitForTimeout(1500);

// start a frame-gap recorder that is independent of the app's own loop
await pg.evaluate(() => {
  window.__gaps = [];
  let last = performance.now();
  const tick = () => {
    const t = performance.now();
    window.__gaps.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await pg.waitForTimeout(600);
await pg.evaluate(() => { window.__gaps.length = 0; });

const t0 = Date.now();
await pg.evaluate(([nn, sd, rr, bg]) => {
  const a = window.__app;
  if (bg) a.warmBudgetMs = +bg;
  a.plantGarden(+nn, { seed: +sd, radius: +rr });
}, [n, seed, radius, budget]);

await pg.waitForFunction(() => !window.__app.gardenWarming(), null,
  { timeout: 240000, polling: 100 });
const wallMs = Date.now() - t0;

const g = await pg.evaluate(() => {
  const gaps = window.__gaps.slice();
  gaps.sort((x, y) => y - x);
  const sum = gaps.reduce((a, b) => a + b, 0);
  return { frames: gaps.length, worst: gaps[0], p99: gaps[Math.floor(gaps.length * 0.01)],
    median: gaps[Math.floor(gaps.length / 2)], sum };
});

console.log(`stand of ${n} established in ${(wallMs / 1000).toFixed(1)}s wall clock`);
console.log(`frames drawn while it did: ${g.frames}`);
console.log(`frame gap  median ${g.median.toFixed(1)}ms   p99 ${g.p99.toFixed(1)}ms   WORST ${g.worst.toFixed(1)}ms`);
// A frame gap over about 250ms is what a person calls a freeze; under ~50ms and
// the tab is simply busy.
const verdict = g.worst > 250 ? 'FREEZES' : g.worst > 80 ? 'HITCHES' : 'stays responsive';
console.log(`verdict: ${verdict}`);
if (errs.length) console.log('--- console ---\n' + errs.slice(0, 6).join('\n'));
await b.close();
process.exit(g.worst > 250 ? 1 : 0);
