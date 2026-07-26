// Watch a blade canalise at cell resolution, and capture it at three points.
//
// Written for the lamina close-up: `test/lamina.mjs` proves the numbers are
// there to be drawn, but whether the cells actually land ON the blade — rather
// than floating beside it, or behind it, or inside the stalk — is a question
// only a picture answers.
//
//   node tools/leaf_shot.mjs [prefix] [speciesName] [seed]
//
// Writes <prefix>-early.png, <prefix>-mid.png, <prefix>-done.png and prints the
// replay's progress, the detail ramp and the buffer counts at each. A blank
// close-up with a healthy point count means the cells are being drawn somewhere
// the camera is not — check the material -> surface mapping before the palette.
//
// Do not read the fps off this — see tools/README.md.
//
// GL backend: same choice as tools/flower_shot.mjs. Swiftshader loses the
// context on this macOS machine and writes black while still reporting a full
// triangle count, so ask ANGLE-on-Metal for a headed run on darwin.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , prefix = 'shots/leaf', species, seed] = process.argv;
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

// grow until there is a blade worth looking at
let org = null;
for (let i = 0; i < 60; i++) {
  org = await pg.evaluate(() => {
    const w = window.__app.watchOrgan();
    return w ? { len: +w.org.len.toFixed(2), dev: +(w.org.dev || 0).toFixed(2) } : null;
  });
  if (org) break;
  await pg.waitForTimeout(1000);
}
console.log('blade to watch:', JSON.stringify(org));
if (!org) { console.log('no blade opened — nothing to shoot'); await b.close(); process.exit(1); }

// Slow the specimen right down so the blade under the microscope holds still,
// then ask to go in. Not to a stop: the replay is paced off the same clock, so
// speedMul 0 would freeze the thing we came to watch.
await pg.evaluate(() => {
  const a = window.__app;
  a.speedMul = 0.35;
  a.takeOver();
  a.enterFocus('leaf');
  a.cam.autoRot = false;
});
// let the camera fly in and settle before judging anything
await pg.waitForTimeout(4500);

const probe = () => pg.evaluate(() => {
  const a = window.__app, r = a._replay;
  return {
    replay: r ? { built: r.leaf.built, mature: r.leaf.mature, age: Math.round(r.leaf.age),
      cells: r.leaf.F ? r.leaf.F.n : 0, veins: r.leaf.veins ? r.leaf.veins.length : 0 } : null,
    detail: +a.detail.toFixed(2),
    dist: +a.cam.dist.toFixed(2),
    pts: a.renderer.nPt, lines: a.renderer.nLine, tris: a.renderer.nTri,
  };
});

const shots = [];
for (const [name, until] of [['early', 120], ['mid', 500], ['done', 1e9]]) {
  for (let i = 0; i < 90; i++) {
    const st = await probe();
    if (!st.replay) break;
    if (st.replay.age >= until || st.replay.mature) break;
    await pg.waitForTimeout(250);
  }
  const st = await probe();
  await pg.screenshot({ path: `${prefix}-${name}.png` });
  shots.push({ name, ...st });
  console.log(name.padEnd(6), JSON.stringify(st));
}
if (errs.length) console.log('PAGE ERRORS:\n  ' + errs.join('\n  '));
const done = shots[shots.length - 1];
if (done.replay && !done.replay.mature) console.log('NOTE: replay never finished — raise the wait');
await b.close();
