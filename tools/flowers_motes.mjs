// WHAT SIZE IS A GRAIN ON THE SCREEN?
//
//   node tools/flowers_motes.mjs 'garden=7&seed=21&ff=3000&speed=0&shot=bank'
//
// The pollen in 18_pollen.js is right and for a long time nobody could see it.
// This is the instrument that says so: it drains the ff like flowers_shot.mjs,
// settles the camera, then walks the live population and evaluates FL_PT_VS's
// OWN gl_PointSize expression per grain — psize * uPx / clip.w, clamped to
// [1, 64] — so the histogram is the rasteriser's number rather than an
// estimate of it. On the pre-floor renderer it returns p50 = p90 = p99 = max =
// 1.00 at the establishing shot: the whole population against the clamp, with
// zero variance, which is not a thing a screenshot can tell you.
//
// It also reports:
//   inFrame  grains inside the frustum. Zero is a real answer and the close
//            shot returns it — the population can be entirely OUT of the
//            picture, which is a framing question and not a size one.
//   lightPx2 sum over in-frame grains of (drawn area) x (colour luminance),
//            in px^2. This is what "keep the total light sane" has to be
//            measured in, and it is the number to quote against the frame's
//            own pixel count when arguing about fireflies.
//
// ⚠ The size is DEVICE pixels (over2dev), which is what gl_PointSize means.
// over2css divides by the device pixel ratio. Say which you mean: at dpr 2
// they differ by 2x and the two readings support opposite conclusions.
//
// GL backend and the headed-on-darwin rule are flowers_shot.mjs's, verbatim.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , query = ''] = process.argv;
const q = new URLSearchParams(query);
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + q.toString();
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 2 });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function', null, { timeout: 30000 });
const deadline = Date.now() + 240000;
for (;;) {
  const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
  if (!hud.includes('(fast-forward')) break;
  if (Date.now() > deadline) { console.error('TIMEOUT'); await b.close(); process.exit(1); }
  await pg.waitForTimeout(500);
}
{
  let prev = null, stable = 0;
  const until = Date.now() + 25000;
  while (Date.now() < until && stable < 2) {
    await pg.waitForTimeout(600);
    const s = await pg.evaluate(() => window.__fl.state());
    if (prev) {
      const dT = Math.hypot(s.target[0] - prev.target[0], s.target[1] - prev.target[1], s.target[2] - prev.target[2]);
      stable = (Math.abs(s.dist - prev.dist) < 0.05 && dT < 0.05) ? stable + 1 : 0;
    }
    prev = s;
  }
}
const r = await pg.evaluate(() => {
  const fl = window.__fl, s = fl.scene, p = fl.pollen;
  const cam = s.camera;
  cam.updateMatrixWorld();
  const uPx = s.ptMat.uniforms.uPx.value;
  const v = new THREE.Vector4();
  const mvp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const px = [], lum = [];
  let light = 0, inFrame = 0;
  for (let i = 0; i < p.n; i++) {
    const o = i * 7;
    v.set(p.buf[o], p.buf[o + 1], p.buf[o + 2], 1).applyMatrix4(mvp);
    const size = Math.min(64, Math.max(1, p.buf[o + 6] * uPx / Math.max(0.001, v.w)));
    const on = v.w > 0 && Math.abs(v.x) <= v.w && Math.abs(v.y) <= v.w && v.z >= -v.w && v.z <= v.w;
    px.push(size);
    const L = 0.2126 * p.buf[o + 3] + 0.7152 * p.buf[o + 4] + 0.0722 * p.buf[o + 5];
    lum.push(L);
    if (on) { inFrame++; light += Math.PI * 0.25 * size * size * L; }
  }
  px.sort((a, b) => a - b);
  const pct = f => px.length ? +px[Math.min(px.length - 1, Math.floor(f * px.length))].toFixed(2) : 0;
  const dpr = s.renderer.getPixelRatio();
  return {
    n: p.n, inFrame, dpr, uPx: +uPx.toFixed(1), worldSize: +p.size.toFixed(4),
    p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: +(px[px.length - 1] || 0).toFixed(2),
    // the PR body's statistic, at device pixels and at CSS pixels
    over2dev: px.filter(v => v > 2).length,
    over2css: px.filter(v => v / dpr > 2).length,
    over4css: px.filter(v => v / dpr > 4).length,
    meanLum: +(lum.reduce((a, b) => a + b, 0) / Math.max(1, lum.length)).toFixed(4),
    lightPx2: +light.toFixed(1),
  };
});
console.log(query);
console.log(JSON.stringify(r));
await b.close();
