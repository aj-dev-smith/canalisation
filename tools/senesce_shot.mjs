// Run at speed until a specimen starts dismantling itself, and capture the arc.
//
//   node tools/senesce_shot.mjs [prefix] [speciesName] [seed]
//   node tools/senesce_shot.mjs shots/sen 'Cathedral Fern' 21
//
// Writes three frames — `-onset`, `-mid`, `-spent` — at senescence 0.02, 0.50 and
// `Plant.dead()`. Pass a seed to make it reproducible.
//
// WHAT THIS CURRENTLY PROVES, AND WHAT IT DOES NOT. As of the branch that added
// senescence, **nothing renders it**: `org.sen` and `org.shed` are set by the
// simulation and no geometry or shader reads either, so all three frames show the
// same intact plant. What the tool verifies today is that the state machine runs
// in a real browser — that a specimen reaches `spent`, that the stage bar follows
// it, and that no console error appears on the way. The three frames become worth
// comparing the moment anything in `50_geom.js` or `60_render.js` reads `sen`.
//
// Do not read the fps off this — see tools/README.md.
//
// GL backend picked the way flower_shot.mjs picks it: swiftshader loses the WebGL
// context on macOS and writes a black PNG while still reporting a full triangle
// count, which is the failure mode that does not announce itself.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const [, , prefix = 'shots/senesce', species, seed] = process.argv;
mkdirSync(dirname(prefix), { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
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
await pg.goto(pageUrl);

if (species) await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, sd ? +sd : undefined), [species, seed]);
await pg.evaluate(() => { window.__app.speedMul = 4; document.body.classList.add('collapsed'); });

// Let the page stop itself at each mark. Polling from outside cannot hit a
// threshold reliably — one round trip steps straight over it, which is the same
// reason flower_shot.mjs wraps the step instead of sampling.
await pg.evaluate(() => {
  const a = window.__app;
  const orig = a.step.bind(a);
  window.__marks = [];
  a.step = (dt) => {
    orig(dt);
    if (a.speedMul === 0) return;
    const P = a.plant, s = P.senescence();
    const want = window.__want;
    const hit = want === 'dead' ? P.dead() : s >= want;
    if (hit) { a.speedMul = 0; window.__caught = true; }
  };
});

const state = () => pg.evaluate(() => {
  const a = window.__app, P = a.plant;
  const organs = P.axes.reduce((n, x) => n + x.organs.filter(o => !o.floral).length, 0);
  const shed = P.axes.reduce((n, x) => n + x.organs.filter(o => o.shed).length, 0);
  const senN = P.axes.reduce((n, x) => n + x.organs.filter(o => !o.floral && (o.sen || 0) > 0.02 && !o.shed).length, 0);
  // what the stage bar is actually showing, read off the DOM rather than the model
  const lit = [...document.querySelectorAll('#stage span')].filter(e => e.classList.contains('on')).map(e => e.dataset.s);
  return {
    stage: P.stage(), stageBarLit: lit, spent: P.spent(), dead: P.dead(),
    senescence: +P.senescence().toFixed(3), organs, shed, senescing: senN,
    tris: a.renderer.nTri, lines: a.renderer.nLine,
  };
});

async function runTo(want, label) {
  await pg.evaluate((w) => { window.__caught = false; window.__want = w; window.__app.speedMul = 4; }, want);
  for (let i = 0; i < 90; i++) {
    if (await pg.evaluate(() => !!window.__caught)) break;
    await pg.waitForTimeout(500);
  }
  const caught = await pg.evaluate(() => !!window.__caught);
  await pg.evaluate(() => { window.__app.speedMul = 0; });
  await pg.waitForTimeout(600);
  const st = await state();
  console.log(`${label.padEnd(7)} caught=${caught}  ${JSON.stringify(st)}`);
  await pg.screenshot({ path: `${prefix}-${label}.png` });
  return caught;
}

await runTo(0.02, 'onset');
await runTo(0.50, 'mid');
await runTo('dead', 'spent');

if (errs.length) console.log('--- console ---\n' + errs.slice(0, 10).join('\n'));
else console.log('--- no console errors ---');
await b.close();
