// THE CONIFER, FRAMED AS A TREE.
//
// `Ashfall Spire` is 46 units tall — three times any herb — and every other
// capture tool here frames from `sceneBounds()` with a shot list built around a
// subject you can walk round. A tall narrow plant on a 16:10 viewport is the
// framing `clip.mjs` warns about: it looks lost, and "looks lost" and "is too
// sparse" are the same picture.
//
// So this one is portrait, and it takes the crown three ways: the whole
// silhouette, the middle third where a viewer reads density, and one branch
// close enough to count needles on.
//
// Picks the GL backend per platform: on macOS `--use-gl=swiftshader` loses the
// context and writes a BLACK png while still reporting a full triangle count.
//
//   node tools/tree_shot.mjs OUTDIR [seed] [waitMs] [species]
//
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';

const [, , outDir = 'shots', seed = '11', waitMs = '60000',
  species = 'Ashfall Spire'] = process.argv;
// OVER='{"sp":{"budTake":1}}' patches the preset before the specimen is grown,
// so two candidates can be compared in one session on one GL backend. TAG names
// the files. Without this a preset A/B costs a rebuild and a second browser,
// and two browsers on this machine are not guaranteed to get the same renderer.
const OVER = process.env.OVER ? JSON.parse(process.env.OVER) : null;
const TAG = process.env.TAG ? '-' + process.env.TAG : '';
mkdirSync(outDir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
// PORTRAIT. A 46-unit spire framed to fit its height into a landscape frame
// puts the tree in the middle 20% of the picture and calls the result sparse.
const pg = await b.newPage({ viewport: { width: 760, height: 1180 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(pageUrl);
await pg.waitForTimeout(1200);
if (OVER) {
  const applied = await pg.evaluate(([sp, over]) => {
    const S = window.__SPECIES && window.__SPECIES[sp];
    if (!S) return null;
    for (const k of Object.keys(over)) Object.assign(S[k], over[k]);
    return { sp: S.sp };
  }, [species, OVER]);
  // ASSERT THE PATCH LANDED. A silent no-op here would compare a candidate
  // against itself and report "no difference", which is the most expensive
  // wrong answer this tool can give.
  if (!applied) throw new Error(`no such species to patch: ${species}`);
  for (const [k, v] of Object.entries(OVER.sp || {})) {
    if (typeof v !== 'object' && applied.sp[k] !== v) {
      throw new Error(`override did not land: sp.${k} is ${applied.sp[k]}, wanted ${v}`);
    }
  }
  console.log(`patched ${species}: ${JSON.stringify(OVER)}`);
}
await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, +sd), [species, seed]);
// grow it at speed — a conifer needs thousands of steps to make a crown
await pg.evaluate(() => { window.__app.speedMul = 4; });

// POLL FOR THE CROWN, DO NOT WAIT A FIXED TIME. The first run of this tool
// waited 60s at 4x and photographed a DEAD tree: `Ashfall Spire` arrests around
// step 2900 and the senescence wave then strips every needle it has, so the
// picture was a bare skeleton and "sparse" would have been the obvious and
// completely wrong conclusion. Stop the clock the moment the shoot arrests.
const deadline = Date.now() + (+waitMs);
let grew = null;
for (;;) {
  const s = await pg.evaluate(() => {
    const a = window.__app, p = a.plant;
    return { organs: p.stats().organs, stage: p.stage(), spent: p.spent() };
  });
  if (s.spent || s.stage === 'senescing' || s.stage === 'dead'
    || Date.now() > deadline) { grew = s; break; }
  await pg.waitForTimeout(400);
}
console.log(`grown to: ${JSON.stringify(grew)}`);

// Freeze, and take the camera off the director.
await pg.evaluate(() => {
  const a = window.__app;
  a.speedMul = 0;
  a.shot = null; a.subject = null; a.focus = null; a._watch = null;
  a.userDriving = true;
  a.cam.autoRot = false;
});
await pg.waitForTimeout(700);

const bb = await pg.evaluate(() => {
  const b = window.__app.sceneBounds();
  return { cx: b.cx, cy: b.cy, cz: b.cz, w: b.w, h: b.h };
});
const fov = await pg.evaluate(() => window.__app.cam.fov);
// fit HEIGHT into the portrait frame, not the larger of the two dimensions
//
// FIXDIST= PINS THAT DISTANCE, AND AN A/B NEEDS IT. Every framing below is a
// fraction of `whole`, so a candidate that changes the specimen's SIZE is
// photographed from further away — and then every framing, including the
// arm's-length one, is at a different scale from the shot it is being compared
// with. `organLen 3.0 -> 5.4` moves the bounds 51.3 -> 56.0 and the close-up
// 9.3% back, which is enough to make a real difference in blade shape read as
// "about the same". TUNING already records this as a way to buy a false theory,
// measured on geometry counts; it costs you a visual comparison the same way.
// Take the A shot, read the `framing at` line, and pass it to the B shot.
const auto = bb.h * 0.5 / Math.tan(fov / 2) * 1.15;
const whole = process.env.FIXDIST ? +process.env.FIXDIST : auto;
console.log(`bounds ${bb.w.toFixed(1)} x ${bb.h.toFixed(1)}, framing at ${whole.toFixed(1)}`
  + (process.env.FIXDIST ? `  (PINNED; this specimen's own would be ${auto.toFixed(1)})` : ''));

const FRAMINGS = [
  ['whole', { dist: whole, az: 0.6, el: 0.02, tgtY: bb.cy }],
  ['mid', { dist: whole * 0.32, az: 1.1, el: 0.03, tgtY: bb.cy }],
  ['branch', { dist: whole * 0.10, az: 1.5, el: 0.02, tgtY: bb.cy + bb.h * 0.12 }],
];

console.log('framing   tri      line     pt       dropped');
for (const [tag, cam] of FRAMINGS) {
  // Re-assert immediately before the shutter: the framer damps `cam.dist`
  // toward the bounding sphere every frame, so anything set once is pulled
  // somewhere else before the picture is taken.
  await pg.evaluate((c) => {
    const a = window.__app;
    Object.assign(a.cam, c);
    a.bbS = null;
  }, cam);
  await pg.waitForTimeout(450);
  const st = await pg.evaluate(() => {
    const a = window.__app;
    const s = a.plant.stats();
    return { tri: a.renderer.nTri / 3, line: a.renderer.nLine / 6, pt: a.renderer.nPt,
      dropped: a.B.saturated(), organs: s.organs, axes: s.axes,
      height: +s.height.toFixed(1), stage: a.plant.stage() };
  });
  await pg.screenshot({ path: `${outDir}/tree${TAG}-${tag}.png` });
  console.log(tag.padEnd(9), String(st.tri | 0).padEnd(9), String(st.line | 0).padEnd(9),
    String(st.pt | 0).padEnd(9), st.dropped ? JSON.stringify(st.dropped) : '—',
    `| organs ${st.organs} axes ${st.axes} h ${st.height} ${st.stage}`);
}

if (errs.length) console.log('--- console ---\n' + errs.slice(0, 8).join('\n'));
await b.close();
