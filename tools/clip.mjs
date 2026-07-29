// RECORD THE PIECE MOVING.
//
//   node tools/clip.mjs out/dir [seconds] [species] [seed] [speed] [waitSeconds] [w] [h] [uRef]
//
// Every other tool here takes a still, and tools/README.md is emphatic that a still
// cannot judge motion. This one records a webm, which can be: it is the only artifact
// in the repo that shows what the wind actually does.
//
// It exists because ROADMAP 7 replaced the shader's decorative sway with a real bending
// stem, and the difference between those two is entirely in the time axis — same
// amplitude to within 12%, completely different motion. A screenshot cannot tell them
// apart and neither can a triangle count.
//
// GL backend: as flower_shot.mjs. On macOS `--use-gl=swiftshader` loses the context and
// writes black frames while still reporting a full triangle count, so this asks for
// ANGLE-on-Metal in a headed browser there. **Do not read a clip recorded on the
// software path** — it renders at about 16fps, which looks like the simulation
// stuttering when it is the renderer.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { readdirSync, renameSync, mkdirSync } from 'fs';

const [, , outDir = 'shots/clip', secs = '8', species, seed, speed = '1', wait = '20',
  vw = '1000', vh = '1000', uRef] = process.argv;
// `uRef` overrides the shipped wind speed. The weather is the one composition choice in
// the mechanics and there is no experiment that settles it, so the way it gets settled
// is a pair of clips at two speeds and a person watching them.
// A SQUARE-ISH FRAME, on purpose. The camera fits the specimen's height into 66% of the
// frame, so on a 16:10 viewport a tall narrow plant is correctly framed vertically and
// lost horizontally. These are tall narrow plants.
const gpu = platform() === 'darwin';
mkdirSync(outDir, { recursive: true });

const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const ctx = await b.newContext({
  viewport: { width: +vw, height: +vh },
  recordVideo: { dir: outDir, size: { width: +vw, height: +vh } },
});
const pg = await ctx.newPage();
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pathToFileURL(process.cwd() + '/canalisation.html').href);

if (species) {
  await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, sd ? +sd : undefined),
    [species, seed]);
}
// A GARDEN, optionally: `GARDEN=7 node tools/clip.mjs ...` plants a stand around the
// subject and lets the framer fit the whole clearing. `GARDEN_RADIUS` defaults to 20,
// which wants to stay well clear of the blade length -- these plants carry 4-unit
// fronds, so a tighter ring puts them through each other and reads as one tangled mass
// rather than as a stand of separate plants.
//
// The director is switched off for a garden shot. Its shot list is written around a
// single subject, so left running it flies into one plant's apex and the other seven
// stop being the point.
const gardenN = +(process.env.GARDEN || 0);
if (gardenN > 0) {
  await pg.evaluate(([n, r, sd]) => {
    const a = window.__app;
    a.plantGarden(+n, { radius: +r, seed: sd ? +sd : undefined });
    a.userDriving = true;          // the director's shots are about one plant
    a.shot = null; a.subject = null; a.focus = null;
    a.cam.autoRot = true;          // keep the slow drift; the framer sets the distance
    a.cam.el = 0.30;
  }, [gardenN, process.env.GARDEN_RADIUS || 20, seed]);
}
// Grow at speed with the panel collapsed, then settle to the recording speed. The wait
// is in real seconds and is what decides which act of the life cycle gets filmed.
if (uRef !== undefined) await pg.evaluate(u => window.__app.setWind(+u), uRef);
await pg.evaluate(() => { window.__app.speedMul = 4; document.body.classList.add('collapsed'); });
await pg.waitForTimeout(+wait * 1000);
await pg.evaluate((sp) => { window.__app.speedMul = +sp; }, speed);
await pg.waitForTimeout(+secs * 1000);

const state = await pg.evaluate(() => {
  const P = window.__app.plant, a = P.main;
  return {
    stage: P.stage(), organs: P.organCount(), axes: P.axes.length,
    fps: +window.__app.fps.toFixed(1), tri: window.__app.renderer.nTri,
    swayHz: a.bend && a.bend.live
      ? +(a.bend.w1 * 125 / (2 * Math.PI)).toFixed(2) : null,
    tipOffset: a.bend && a.bend.live && a.rest
      ? +a.bend.tipOffset(a.rest[a.rest.length - 1]).toFixed(3) : null,
    wind: P.wind ? P.wind.o.uRef : null,
  };
});
// A still from the last frame too, so the clip can be sanity-checked without a
// video player and so a post has a matching thumbnail.
await pg.screenshot({ path: `${outDir}/${(species || 'clip').toLowerCase().replace(/\s+/g, '-')}.png` });
console.log(JSON.stringify(state));
console.log(errs.length ? 'CONSOLE ERRORS:\n' + errs.join('\n') : 'no console errors');

await ctx.close();
await b.close();

const vids = readdirSync(outDir).filter(f => f.endsWith('.webm'));
if (vids.length) {
  const name = `${outDir}/${(species || 'clip').toLowerCase().replace(/\s+/g, '-')}.webm`;
  renameSync(`${outDir}/${vids[vids.length - 1]}`, name);
  console.log('wrote', name);
}
