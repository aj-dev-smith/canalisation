// A STAND OF PLANTS. Grows a garden, frames the whole clearing, and reports what
// the frame actually costs — triangles, lines, and how close the line buffer is
// to its cap, which is the number that matters because a full buffer drops
// geometry SILENTLY (see `Buffers` in 50_geom.js).
//
//   node tools/garden_shot.mjs OUTDIR [n] [seed] [dist] [waitMs] [radius]
//
// `dist` 0 leaves the framer to fit the clearing itself. `radius` wants to be
// well clear of the blade length -- these plants carry 4-unit fronds, so a ring
// of 9 puts them through each other and reads as one tangled mass rather than as
// a stand.

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';

const [, , outDir = 'shots', n = '6', seed = '20260728', dist = '22', waitMs = '9000', radius = '18'] = process.argv;
mkdirSync(outDir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(pageUrl);
await pg.waitForTimeout(1200);

const info = await pg.evaluate(([nn, sd, rr]) => {
  const a = window.__app;
  // Seed the HERO too. `newSpecimen` defaults to Math.random(), so without this
  // the subject is a different plant every run and no two captures compare.
  a.newSpecimen(a.speciesName, +sd);
  const k = a.plantGarden(+nn, { seed: +sd, radius: +rr });
  // Headless has no smoothness to protect, so let the warm-up take big bites.
  // The shipped budget is 8ms a frame, which is right for a live tab and would
  // make a capture wait the better part of a minute.
  a.warmBudgetMs = 250;
  return { planted: k, hero: a.specimenNo, species: a.garden.map(s => s.name),
    warm: a.garden.map(s => s.warm) };
}, [n, seed, radius]);
console.log('planted', info.planted, 'around hero', info.hero, '|', info.species.join(', '));
console.log('head starts', info.warm.join(', '));

// The stand grows into its head start a slice at a time now, so wait for it to
// arrive rather than assuming it is there. Blocking on it in one `evaluate` was
// what the first version did and it is 19 SECONDS of frozen main thread.
await pg.waitForFunction(() => !window.__app.gardenWarming(), null,
  { timeout: 180000, polling: 250 });
await pg.evaluate(() => { window.__app.warmBudgetMs = undefined; });
await pg.waitForTimeout(+waitMs);

// Several framings in one session, because the interesting question is what the
// stand looks like FROM WHERE, and growing it again for each guess is slow.
//
// The camera is re-asserted immediately before every shutter. The framer damps
// `cam.dist` toward the scene's own bounding sphere on every frame, so anything
// set once is quietly pulled somewhere else before the picture is taken — which
// is how three captures in a row came back looking at the inside of one plant.
const FRAMINGS = [
  { tag: 'wide',   dist: 60, el: 0.30, az: 0.7, tgtY: 3.0 },
  { tag: 'low',    dist: 46, el: 0.10, az: 2.1, tgtY: 2.4 },
  { tag: 'above',  dist: 52, el: 0.55, az: 4.0, tgtY: 2.0 },
];
const rows = [];
for (const F of FRAMINGS) {
  await pg.evaluate((f) => {
    const a = window.__app;
    a.shot = null; a.subject = null; a.focus = null; a._watch = null;
    a.userDriving = true; a.cam.autoRot = false;
    a.cam.dist = f.dist; a.cam.el = f.el; a.cam.az = f.az; a.cam.tgtY = f.tgtY;
  }, F);
  await pg.waitForTimeout(260);
  // and again, after the frame the damping would have used to move it
  await pg.evaluate((f) => {
    const a = window.__app;
    a.cam.dist = f.dist; a.cam.el = f.el; a.cam.az = f.az; a.cam.tgtY = f.tgtY;
  }, F);
  await pg.waitForTimeout(120);
  const st = await pg.evaluate(() => {
    const a = window.__app, R = a.renderer, B = a.B;
    let organs = 0;
    for (const S of a.specimens()) organs += S.plant.organCount();
    return { fps: +a.fps.toFixed(1), specimens: a.specimens().length, organs,
      dist: +a.cam.dist.toFixed(1), tris: R.nTri, lines: R.nLine,
      lineFull: +(100 * B.lineN / B.line.length).toFixed(1),
      triFull: +(100 * B.triN / B.tri.length).toFixed(1) };
  });
  rows.push({ tag: F.tag, ...st });
  await pg.screenshot({ path: `${outDir}/garden-${F.tag}.png` });
  if (st.lineFull > 97 || st.triFull > 97) {
    console.log(`*** ${F.tag}: BUFFER SATURATED — geometry dropped silently ***`);
  }
}
console.table(rows);
if (errs.length) console.log('--- console ---\n' + errs.slice(0, 8).join('\n'));
await b.close();
