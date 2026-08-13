// THE HORIZON, FROM THREE HEIGHTS — a scratch capture tool for the ground work.
//
//   node tools/flowers_horizon.mjs <outprefix> '<query>' [cams]
//
// flowers_shot.mjs cannot answer "does the ground melt from a low camera",
// because the boot's framer owns the camera and picks one height. This tool
// drains the fast-forward exactly like flowers_shot.mjs, then WRAPS
// scene.render so the camera is pinned to a stated eye/target before every
// draw — the framer keeps running, and is simply overruled each frame.
//
// Default camera set (world units): eye height 0.35 (near ground level,
// looking across the field), 3.5 (the shipped framing's height), and 26
// (looking down at the disc, where the rim is nearest to being in frame).
// GL backend and the black-PNG check are flowers_shot.mjs's, verbatim.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , out = 'shots/horizon', query = '', camsArg = ''] = process.argv;
const CAMS = camsArg ? JSON.parse(camsArg) : [
  { tag: 'low', eye: [16, 0.35, 16], target: [0, 1.2, 0] },
  { tag: 'mid', eye: [14, 3.5, 14], target: [0, 2.0, 0] },
  { tag: 'high', eye: [10, 26, 10], target: [0, 1.0, 0] },
];

const q = new URLSearchParams(query);
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + q.toString();
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

const deadline = Date.now() + 180000;
for (;;) {
  const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
  if (!hud.includes('(fast-forward')) break;
  if (Date.now() > deadline) { console.error('TIMEOUT draining'); await b.close(); process.exit(1); }
  await pg.waitForTimeout(500);
}
const st = await pg.evaluate(() => window.__fl.state());
console.log(`drained: step ${st.step}`);

// pin the camera: wrap render(), which the boot calls once a frame
await pg.evaluate(() => {
  const s = window.__fl.scene;
  s.controls.autoRotate = false;
  const orig = s.render.bind(s);
  window.__pin = { eye: [14, 3.5, 14], target: [0, 2, 0] };
  s.render = (t) => {
    const p = window.__pin;
    s.camera.position.set(p.eye[0], p.eye[1], p.eye[2]);
    s.controls.target.set(p.target[0], p.target[1], p.target[2]);
    s.camera.lookAt(p.target[0], p.target[1], p.target[2]);
    orig(t);
  };
});

for (const c of CAMS) {
  await pg.evaluate((p) => { window.__pin = p; }, c);
  await pg.waitForTimeout(700);
  const path = `${out}_${c.tag}.png`;
  await pg.screenshot({ path });
  // the black-PNG check, per shot
  const mean = await pg.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    const w = cv.width = Math.min(256, img.width), h = cv.height = Math.min(256, img.height);
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
    return s / (d.length / 4 * 3);
  }, readFileSync(path).toString('base64'));
  console.log(`${path}  eye ${c.eye}  mean pixel ${mean.toFixed(2)}`);
  if (mean < 1) { console.error('BLACK PNG'); process.exit(1); }
}
if (errs.length) console.log('page errors:', errs.slice(0, 5));
await b.close();
