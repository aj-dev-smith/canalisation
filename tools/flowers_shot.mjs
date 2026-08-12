// Screenshot flowers.html — the flower piece's own capture tool.
//
//   node tools/flowers_shot.mjs <outfile> '<query>'
//   node tools/flowers_shot.mjs shots/daisy.png 'seed=21&form=daisy&ff=2600&focus=flower&speed=0'
//
// `&speed=0` is the reproducible-still recipe: the ff grows the plant, then
// nothing moves but the camera. Without it the plant keeps growing during the
// settle, bestFlower can switch subjects, and the flight restarts — the first
// columbine capture was shot from INSIDE the corolla that way.
//
// tools/flower_shot.mjs targets canalisation.html; this one targets the flower
// piece, whose page contract is `window.__fl` (40_boot.js): { S, env, scene, B,
// state() }. It waits for that handle, then polls until the fast-forward has
// drained — no '(fast-forward' left in the HUD and, if `&shotstep=N` is in the
// query, state().step past N — settles a few frames, and shoots.
//
// Designed for today's single-specimen page AND for the garden when it exists:
// counts come from `__fl.garden` (summed across its buffers) when that handle
// appears, from `__fl.B` when it does not. Degrades gracefully either way.
//
// GL backend copied from tools/flower_shot.mjs exactly: on this macOS machine
// swiftshader loses the WebGL context and writes a BLACK PNG while still
// reporting a full triangle count (tools/README.md), so darwin gets
// ANGLE-on-Metal in a headed browser. Because that failure does not announce
// itself, the tool also decodes its own screenshot and fails if the mean pixel
// is black — a triangle count is not evidence of a picture.
//
// Do not read the fps off this — see tools/README.md.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , out = 'shots/flowers.png', query = ''] = process.argv;
const q = new URLSearchParams(query);
const shotstep = q.has('shotstep') ? +q.get('shotstep') : null;
q.delete('shotstep');   // the page does not know this parameter; it is ours
const qs = q.toString();
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + (qs ? '?' + qs : '');

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

// the page's handle, not an arbitrary timeout
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function',
  null, { timeout: 30000 });

// Drain the fast-forward. `ff` runs 40 steps a frame, so a big ff takes real
// wall time; poll rather than compute. Two exits: the HUD no longer says
// '(fast-forward', and if &shotstep= was given, the sim has reached it. With
// speed=0 and no ff the step is stable immediately and the first poll passes.
const deadline = Date.now() + 180000;
let st = null;
for (;;) {
  st = await pg.evaluate(() => ({
    ...window.__fl.state(),
    hud: document.getElementById('hud').textContent,
  }));
  const draining = st.hud.includes('(fast-forward');
  const early = shotstep !== null && st.step < shotstep;
  if (!draining && !early) break;
  if (Date.now() > deadline) {
    console.error(`TIMEOUT waiting for drain: step ${st.step}` +
      (shotstep !== null ? ` (target ${shotstep})` : '') +
      (draining ? ' still fast-forwarding' : ''));
    await b.close();
    process.exit(1);
  }
  await pg.waitForTimeout(500);
}
console.log(`drained: step ${st.step}  dist ${st.dist.toFixed(2)}  radius ${st.radius.toFixed(2)}`);

// Settle: the framer EASES onto its subject (lerp 0.02-0.03 per frame,
// 40_boot.js), so right after a long fast-forward the camera is mid-flight
// from the wide shot — a fixed wait shot the columbine from inside its own
// corolla. Poll until the camera has stopped moving (dist and target stable
// across two consecutive polls), capped at 25s because a growing plant keeps
// the framer honestly drifting forever.
{
  let prev = null, stable = 0;
  const until = Date.now() + 25000;
  while (Date.now() < until && stable < 2) {
    await pg.waitForTimeout(600);
    const s = await pg.evaluate(() => window.__fl.state());
    if (prev) {
      const dT = Math.hypot(s.target[0] - prev.target[0], s.target[1] - prev.target[1],
        s.target[2] - prev.target[2]);
      stable = (Math.abs(s.dist - prev.dist) < 0.05 && dT < 0.05) ? stable + 1 : 0;
    }
    prev = s;
  }
  st = prev;
  console.log(`settled: dist ${st.dist.toFixed(2)} (camera ${stable >= 2 ? 'stable' : 'still easing at cap'})`);
  st.hud = await pg.evaluate(() => document.getElementById('hud').textContent);
}

// stream counts, garden-aware: when __fl.garden exists (an array of specimens
// or of {B} entries), sum across its buffers; otherwise read the one B.
const counts = await pg.evaluate(() => {
  const fl = window.__fl;
  const read = (B) => B ? {
    tri: B.triN || 0, seg: B.segN || 0, pt: B.ptN || 0, pet: B.petbN || 0,
    organs: B.organs ? B.organs.length : 0,
  } : null;
  const g = fl.garden;
  if (Array.isArray(g) && g.length) {
    const tot = { tri: 0, seg: 0, pt: 0, pet: 0, organs: 0, specimens: g.length };
    for (const e of g) {
      const c = read(e && (e.B || (e.triN !== undefined ? e : null)));
      if (!c) continue;
      tot.tri += c.tri; tot.seg += c.seg; tot.pt += c.pt; tot.pet += c.pet;
      tot.organs += c.organs;
    }
    // the hero's own buffer is __fl.B whether or not a garden exists
    const h = read(fl.B);
    if (h) { tot.tri += h.tri; tot.seg += h.seg; tot.pt += h.pt; tot.pet += h.pet; tot.organs += h.organs; }
    return tot;
  }
  return { ...read(fl.B), specimens: 1 };
});
console.log(`specimens ${counts.specimens}  organs ${counts.organs}`);
console.log(`tri ${counts.tri} floats (${counts.tri / 10} verts, ${counts.tri / 30 | 0} triangles)  ` +
  `vein ${counts.seg} floats (${counts.seg / 12} segments)  ` +
  `petal ${counts.pet} floats (${counts.pet / 16} verts)  ` +
  `pt ${counts.pt} floats (${counts.pt / 7} points)`);
console.log('hud:', st.hud.replace(/\n/g, ' · '));

await pg.screenshot({ path: out });

// Verify the PNG is not black — the documented swiftshader failure mode is a
// black PNG WITH a full triangle count, so counts alone prove nothing. Decode
// the screenshot in the same browser (a 2D canvas; no Node PNG dependency).
const png = readFileSync(out);
const mean = await pg.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = rej;
    img.src = 'data:image/png;base64,' + b64;
  });
  const c = document.createElement('canvas');
  const w = c.width = Math.min(256, img.width), h = c.height = Math.min(256, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
  return s / (d.length / 4 * 3);
}, png.toString('base64'));
console.log(`mean pixel ${mean.toFixed(2)} (0-255)`);

if (errs.length) {
  console.error('--- page errors ---\n' + errs.slice(0, 10).join('\n'));
  await b.close();
  process.exit(1);
}
await b.close();
if (mean < 3) {
  console.error(`BLACK FRAME: mean pixel ${mean.toFixed(2)} < 3 — the swiftshader ` +
    'failure mode (tools/README.md). The triangle count above is not evidence.');
  process.exit(1);
}
console.log('wrote', out);
