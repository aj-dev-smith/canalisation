// EVERY VIEW, ONE PLANT, ONE FRAME.
//
// The view registry is the only thing in the piece that changes what a frame is
// made of rather than where the camera is, and no headless harness can judge
// it: `test/views.mjs` says what each view costs and that nothing is dropped,
// which is exactly the class of green that has twice coexisted with a picture
// nobody would ship. This is the part a person has to look at.
//
// Two framings per view, because the views disagree about which one they are
// for. `wide` is the whole specimen, where `cells` has to still read as a
// plant; `close` is an arm's length off one blade, where it has to read as
// tissue. A view that only works at one of those is not finished.
//
// Picks the GL backend per platform: on macOS `--use-gl=swiftshader` loses the
// context and writes a BLACK png while still reporting a full triangle count.
//
//   node tools/views_shot.mjs OUTDIR [species] [seed] [waitMs]
//   GARDEN=7 node tools/views_shot.mjs shots     # and a stand, in each view

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';

const [, , outDir = 'shots', species = 'Cathedral Fern', seed = '4242', waitMs = '20000'] = process.argv;
const GARDEN = +(process.env.GARDEN || 0);
mkdirSync(outDir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(pageUrl);
await pg.waitForTimeout(1200);
await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, +sd), [species, seed]);
await pg.waitForTimeout(+waitMs);
if (GARDEN) {
  await pg.evaluate((n) => window.__app.plantGarden(n, { radius: 20 }), GARDEN);
  await pg.waitForTimeout(4000);
}

// Freeze, and take the camera off the director: the same plant in the same air
// in every frame, or the comparison is between two moments and not two views.
await pg.evaluate(() => {
  const a = window.__app;
  a.speedMul = 0;
  a.shot = null; a.subject = null; a.focus = null; a._watch = null;
  a.userDriving = true;
  a.cam.autoRot = false;
});
await pg.waitForTimeout(700);

const views = await pg.evaluate(() => Object.keys(window.__VIEWS || {}));
const names = views.length ? views : ['natural', 'cells', 'flux', 'field'];

// FRAME FROM THE SCENE'S OWN BOUNDS, not from a distance somebody typed. A
// Cathedral Fern at 20 seconds is four times the size of a Nightglass Parasol,
// and the first version of this tool put the camera at a fixed 9 units for both
// — which parked it INSIDE the fern and produced a page of close-ups of the
// underside of one frond in four different views. `sceneBounds` is what the
// app's own framer uses, so this cannot disagree with what a viewer sees.
const bb = await pg.evaluate(() => {
  const b = window.__app.sceneBounds();
  return { cx: b.cx, cy: b.cy, cz: b.cz, w: b.w, h: b.h };
});
const fov = await pg.evaluate(() => window.__app.cam.fov);
const wide = Math.max(bb.w, bb.h) * 0.5 / Math.tan(fov / 2) * 1.25;
console.log(`bounds ${bb.w.toFixed(1)} x ${bb.h.toFixed(1)}, framing at ${wide.toFixed(1)}`);

const FRAMINGS = GARDEN
  ? [['stand', { dist: wide, az: 0.6, el: 0.14, tgtY: bb.cy }]]
  : [['wide', { dist: wide, az: 0.6, el: 0.12, tgtY: bb.cy }],
    // an arm's length off the canopy, where the cells have to read as tissue
    ['close', { dist: wide * 0.16, az: 0.9, el: 0.05, tgtY: bb.cy + bb.h * 0.22 }]];

console.log('view      framing   tri      line     pt       dropped');
for (const name of names) {
  await pg.evaluate((n) => window.__app.setRenderView(n), name);
  for (const [tag, cam] of FRAMINGS) {
    // Re-assert the framing immediately before the shutter: the camera damps
    // toward the bounding box every frame, so a distance set once at the top of
    // the run is quietly pulled back in before the picture is taken.
    await pg.evaluate((c) => {
      const a = window.__app;
      Object.assign(a.cam, c);
      a.bbS = null;
    }, cam);
    await pg.waitForTimeout(450);
    const st = await pg.evaluate(() => {
      const a = window.__app;
      // `nTri` and `nLine` are VERTEX counts, not primitive counts — the
      // renderer names them for the draw call they feed. Divide before
      // comparing them with anything `test/views.mjs` prints.
      return { tri: a.renderer.nTri / 3, line: a.renderer.nLine / 6,
        pt: a.renderer.nPt, dropped: a.B.saturated(), fps: +a.fps.toFixed(1) };
    });
    await pg.screenshot({ path: `${outDir}/view-${name}-${tag}.png` });
    console.log(name.padEnd(9), tag.padEnd(9),
      String(st.tri | 0).padEnd(9), String(st.line | 0).padEnd(9),
      String(st.pt | 0).padEnd(9),
      st.dropped ? JSON.stringify(st.dropped) : '—');
  }
}

if (errs.length) console.log('--- console ---\n' + errs.slice(0, 8).join('\n'));
await b.close();
