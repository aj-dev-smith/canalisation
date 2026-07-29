// Before/after for the vein LOD, on the HERO specimen at the shipped camera —
// which is the frame this change puts at risk. The saving is all at distance,
// but the cull law is anchored to the focal length rather than switched on
// there, so the subject's own back leaves do lose some ribbons and the relight
// has to hide it. That is a claim about pixels and belongs in a browser.
//
// Picks the GL backend per platform: on macOS `--use-gl=swiftshader` loses the
// context and writes a BLACK png while still reporting a full triangle count.
//
//   node tools/veinlod_shot.mjs OUTDIR [species] [seed] [waitMs]

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';

const [, , outDir = 'shots', species = 'Cathedral Fern', seed = '4242', waitMs = '16000'] = process.argv;
mkdirSync(outDir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(pageUrl);
await pg.waitForTimeout(1200);
await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, +sd), [species, seed]);
await pg.waitForTimeout(+waitMs);

// Freeze so the two frames are the same plant in the same air, and take the
// camera off the director — left to itself it picks a close-up, and a lens
// pressed against one petal says nothing about a canopy of ninety blades, which
// is what this change is about.
await pg.evaluate(() => {
  const a = window.__app;
  a.speedMul = 0;
  a.shot = null; a.subject = null; a.focus = null; a._watch = null;
  a.userDriving = true;           // stop the director choosing another shot
  a.cam.autoRot = false;
  a.cam.dist = 9.0; a.cam.az = 0.6; a.cam.el = 0.12; a.cam.tgtY = 1.5;
});
await pg.waitForTimeout(800);

const DIST = +(process.env.VEINLOD_DIST || 26);

const shoot = async (tag, lodOn) => {
  await pg.evaluate((on) => { window.__app.veinLOD = on; }, lodOn);
  await pg.waitForTimeout(600);
  // Re-assert the framing immediately before the shutter: the camera damps
  // toward the specimen's bounding box every frame, so a distance set once at
  // the top of the run is quietly pulled back in before either frame is taken.
  await pg.evaluate((d) => {
    const a = window.__app;
    a.cam.dist = d; a.cam.az = 0.6; a.cam.el = 0.10; a.cam.tgtY = 2.2;
    a.bbS = null;
  }, DIST);
  await pg.waitForTimeout(120);
  const st = await pg.evaluate(() => {
    const a = window.__app;
    return { tris: a.renderer.nTri, lines: a.renderer.nLine, fps: +a.fps.toFixed(1) };
  });
  await pg.screenshot({ path: `${outDir}/veinlod-${tag}.png` });
  console.log(tag.padEnd(6), JSON.stringify(st));
};

await shoot('after', true);
await shoot('before', false);

if (errs.length) console.log('--- console ---\n' + errs.slice(0, 8).join('\n'));
await b.close();
