// Run at speed until a flower has opened, then frame it and capture.
//
// Written for the whorl work: floral organs above `petalQ` had never once been
// produced, so the render path for them had never been looked at. Polls until an
// axis has both petals and inner organs open, points the camera at that axis
// rather than trusting the director to be looking there, and shoots.
//
//   node tools/flower_shot.mjs [outfile] [speciesName] [seed]
//
// Pass a seed to make a capture reproducible: specimen seeds are random by
// default, and a flower's organ count varies from specimen to specimen now that
// the apex decides it.
//
// Do not read the fps off this — see tools/README.md.
//
// GL backend: the other tools here ask for swiftshader, which on this macOS
// machine loses the WebGL context and writes a black PNG while still reporting a
// full triangle count (the failure tools/README.md warns about). ANGLE-on-Metal
// in a headed browser renders correctly, so that is what this asks for, falling
// back to software elsewhere.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , out = 'shots/flower.png', species, seed] = process.argv;
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

// poll for a flower with both identities present
const probe = () => pg.evaluate(() => {
  const P = window.__app.plant;
  const flowers = P.axes.filter(a => a.floral).map(a => {
    const fo = a.organs.filter(o => o.floral);
    return {
      petals: fo.filter(o => o.petal).length,
      inner: fo.length - fo.filter(o => o.petal).length,
      open: fo.filter(o => (o.dev || 0) > 0.9).length,
      dev: fo.map(o => +(o.dev || 0).toFixed(2)),
      fruit: a.fruit ? a.fruit.phase : null,
      q: fo.map(o => +o.q.toFixed(2)),
    };
  });
  return { stage: P.stage(), flowers };
});

// The window worth shooting: organs open, ovary not yet drawn. 50_geom.js skips
// the shell while the fruit is still in its `pattern` phase, and that is the only
// moment the flower stands on its own — after that it is an opaque solid against
// thin translucent blades and it owns the frame.
//
// That window is 21-504 simulation steps wide (measured over 39 flowers, median
// ~154), which at speedMul 4 is about a second of wall time. Polling from outside
// the page cannot hit it — one round trip steps straight over it. So let the page
// stop itself: wrap the app's own step and freeze the instant the window opens.
await pg.evaluate(() => {
  const a = window.__app;
  const orig = a.step.bind(a);
  a.step = (dt) => {
    orig(dt);
    if (a.speedMul === 0) return;
    for (const ax of a.plant.axes) {
      if (!ax.floral) continue;
      const fo = ax.organs.filter(o => o.floral);
      if (!fo.length || !fo.some(o => !o.petal)) continue;
      // ovary not yet drawn (50_geom.js skips the shell during `pattern`)
      if (ax.fruit && ax.fruit.phase !== 'pattern') continue;
      if (fo.every(o => (o.dev || 0) > 0.9)) { a.speedMul = 0; window.__caught = true; return; }
    }
  };
});
let st = null;
for (let i = 0; i < 120; i++) {
  st = await probe();
  if (await pg.evaluate(() => !!window.__caught)) break;
  await pg.waitForTimeout(1000);
}
console.log('caught the open-flower window:', await pg.evaluate(() => !!window.__caught));
await pg.evaluate(() => { window.__app.speedMul = 0; });
console.log(JSON.stringify(st));

// Point at the richest flower using the director's own subject mechanism. Do
// NOT drive the camera directly: the framer recomputes aim and distance from
// `subject` every frame, and it is skipped entirely while `userDriving` — set
// either of those wrong and you get a correct HUD over an empty black frame.
await pg.evaluate(() => {
  const a = window.__app, P = a.plant;
  let best = null, score = -1;
  for (const ax of P.axes) {
    if (!ax.floral) continue;
    const fo = ax.organs.filter(o => o.floral);
    const s = fo.filter(o => o.petal).length + 2 * fo.filter(o => !o.petal).length;
    if (s > score) { score = s; best = ax; }
  }
  if (!best) return;
  a.giveBack();
  a.focus = null;
  // same shape the director's own flower shot uses (70_app.js)
  a.subject = { kind: 'flower', ax: best, dist: 4.2, el: 0.34, hold: 1e9 };
  a.shot = a.subject; a.shotT = 0;
  a.cam.autoRot = false;
});
await pg.waitForTimeout(4000);
console.log(JSON.stringify(await pg.evaluate(() => ({
  dist: +window.__app.cam.dist.toFixed(2), tris: window.__app.renderer.nTri,
}))));
if (errs.length) console.log('--- console ---\n' + errs.slice(0, 10).join('\n'));
await pg.screenshot({ path: out });
await b.close();
