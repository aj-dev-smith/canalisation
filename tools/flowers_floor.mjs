// WHAT DOES THE FLOOR CONTRIBUTE TO THIS FRAME?
//
//   node tools/flowers_floor.mjs shots/floor 'garden=7&seed=21&ff=3000&speed=0&shot=wide'
//
// flowers_horizon.mjs answers "does the ground melt" from three heights. This
// answers a different and blunter question: how much of the picture is the
// ground actually WORTH. "The field floats in void" is a claim about a
// difference, and the honest way to measure a difference is to take it — so
// this drains the ff exactly like flowers_shot.mjs, settles the camera, then
// renders the SAME frame three ways (everything / ground hidden / ground
// alone), reads back all three framebuffers and reports, per horizontal band,
// the mean |all - noGround|. A floor you cannot see is a floor whose delta is
// zero, and on the pre-pool build eight of twelve bands came back EXACTLY
// zero — which no amount of looking at the composite frame will tell you,
// because a dark floor and a dark void are the same pixels.
//
// It also prints the melt/fog profile along the view ray, worked out in JS
// from the ground material's own uniforms, so the picture and the closed form
// can argue. That is how the first diagnosis got corrected: the melt was NOT
// what had taken the floor (it is 0.75-0.93 out where the plants stand, not
// 1.0) — the pool of light was simply a 5-unit pool at the origin in a
// clearing of radius 26.
//
// ⚠ dMax is not a second opinion on dMean. Alpha carries linear depth for the
// defocus pass, so hiding the ground changes what is behind a silhouette and
// the blur moves; the large maxima are that, at organ edges, not floor.
//
// Writes <outprefix>_groundonly.png and <outprefix>_noground.png. The
// ground-only frame is the one worth looking at — it is the floor with nothing
// standing on it.
//
// GL backend and the headed-on-darwin rule are flowers_shot.mjs's, verbatim.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , out = 'shots/probe', query = ''] = process.argv;
const q = new URLSearchParams(query);
const pageUrl = pathToFileURL(process.argv[4] || (process.cwd() + '/flowers.html')).href + '?' + q.toString();
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
console.log('open', pageUrl);
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function', null, { timeout: 30000 });
const deadline = Date.now() + 240000;
for (;;) {
  const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
  if (!hud.includes('(fast-forward')) break;
  if (Date.now() > deadline) { console.error('TIMEOUT'); await b.close(); process.exit(1); }
  await pg.waitForTimeout(500);
}
// let the framer settle
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

const res = await pg.evaluate(async () => {
  const fl = window.__fl, s = fl.scene;
  const cam = s.camera, g = s.ground;
  const u = g.mat.uniforms;
  const info = {
    eye: [cam.position.x, cam.position.y, cam.position.z],
    target: [s.controls.target.x, s.controls.target.y, s.controls.target.z],
    fogD: s.fogU.uFogD.value, fogNear: s.fogU.uFogNear.value,
    fog: s.pal.fog, bgBot: s.pal.bgBot, bgTop: s.pal.bgTop,
    haze: [u.uHazeG.value, u.uHazeH.value, u.uHazeP.value, u.uHazeN.value],
    soil0: [u.uSoil0.value.r, u.uSoil0.value.g, u.uSoil0.value.b],
    soil1: [u.uSoil1.value.r, u.uSoil1.value.g, u.uSoil1.value.b],
    R: u.uR.value,
  };
  // the melt/fog profile along the view ray, on the ground plane
  const eye = info.eye, tg = info.target;
  const dir = [tg[0] - eye[0], tg[1] - eye[1], tg[2] - eye[2]];
  const dl = Math.hypot(...dir); dir.forEach((v, i) => dir[i] = v / dl);
  info.profile = [];
  for (const dist of [10, 20, 30, 45, 60, 80, 100, 140]) {
    // point at `dist` along the ray, projected onto the ground plane radially
    const px = eye[0] + dir[0] * dist, pz = eye[2] + dir[2] * dist;
    const d = Math.hypot(px - eye[0], 0 - eye[1], pz - eye[2]);
    const L = Math.max(0, d - info.haze[3]);
    const ye = Math.max(eye[1], 0);
    const H = info.haze[1];
    const hf = ye < 1e-3 ? 1 : H * (1 - Math.exp(-ye / H)) / ye;
    const melt = Math.pow(1 - Math.exp(-info.fogD * info.haze[0] * L * hf), info.haze[2]);
    const rad = Math.hypot(px, pz);
    const geo = Math.max(0, Math.min(1, (rad / info.R - 0.62) / (0.90 - 0.62)));
    const geoS = geo * geo * (3 - 2 * geo);
    const fw = Math.max(0, Math.min(1, 1 - Math.exp(-Math.max(0, d - info.fogNear) * info.fogD)));
    info.profile.push({ dist, d: +d.toFixed(1), r: +rad.toFixed(1), melt: +melt.toFixed(3),
      geo: +geoS.toFixed(3), tot: +Math.max(melt, geoS).toFixed(3), fog: +fw.toFixed(3) });
  }

  // three renders of the same frame
  const grab = () => {
    const c = s.renderer.domElement;
    const cv = document.createElement('canvas');
    cv.width = c.width; cv.height = c.height;
    cv.getContext('2d').drawImage(c, 0, 0);
    return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  };
  const plants = [s.triMesh, s.petMesh, s.ribMesh, s.ptMesh, s.polMesh];
  const vis = plants.map(m => m.visible);
  const t = performance.now();
  s.render(t); const all = grab();
  g.mesh.visible = false; s.render(t); const noG = grab();
  g.mesh.visible = true; plants.forEach(m => m.visible = false); s.render(t); const gOnly = grab();
  plants.forEach((m, i) => m.visible = vis[i]);
  s.render(t);

  const W = all.width, H = all.height;
  const bands = 12, rows = [];
  for (let bi = 0; bi < bands; bi++) {
    const y0 = Math.floor(H * bi / bands), y1 = Math.floor(H * (bi + 1) / bands);
    let dsum = 0, gl = 0, al = 0, n = 0, dmax = 0;
    for (let y = y0; y < y1; y += 2) for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const la = (all.data[i] + all.data[i + 1] + all.data[i + 2]) / 3;
      const ln = (noG.data[i] + noG.data[i + 1] + noG.data[i + 2]) / 3;
      const lg = (gOnly.data[i] + gOnly.data[i + 1] + gOnly.data[i + 2]) / 3;
      const d = Math.abs(la - ln);
      dsum += d; if (d > dmax) dmax = d;
      gl += lg; al += la; n++;
    }
    rows.push({ band: bi, y: `${y0}-${y1}`, dMean: +(dsum / n).toFixed(2), dMax: +dmax.toFixed(1),
      gndL: +(gl / n).toFixed(1), allL: +(al / n).toFixed(1) });
  }
  return { info, rows, W, H };
});

console.log(JSON.stringify(res.info, null, 1));
console.log('\nband  yrange      |all-noGround|  max   groundOnlyL  allL');
for (const r of res.rows)
  console.log(`${String(r.band).padStart(2)}   ${r.y.padEnd(10)}  ${String(r.dMean).padStart(6)}      ${String(r.dMax).padStart(5)}   ${String(r.gndL).padStart(6)}    ${String(r.allL).padStart(6)}`);

// and the pictures
const plants = ['triMesh', 'petMesh', 'ribMesh', 'ptMesh', 'polMesh'];
await pg.evaluate((p) => { const s = window.__fl.scene; p.forEach(k => s[k].visible = false); }, plants);
await pg.waitForTimeout(400);
await pg.screenshot({ path: `${out}_groundonly.png` });
await pg.evaluate((p) => { const s = window.__fl.scene; p.forEach(k => s[k].visible = true); }, plants);
await pg.evaluate(() => { window.__fl.scene.ground.mesh.visible = false; });
await pg.waitForTimeout(400);
await pg.screenshot({ path: `${out}_noground.png` });
await pg.evaluate(() => { window.__fl.scene.ground.mesh.visible = true; });
console.log(`wrote ${out}_groundonly.png ${out}_noground.png`);
await b.close();
