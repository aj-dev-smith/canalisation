// PHOTOGRAPH THE STAND. Playwright over demo/serve.mjs, one PNG per framing.
//
//   node demo/shot.mjs shots            # shots/demo_wide.png etc.
//
// Gates the same way tools/gltf_shot.mjs does, for the same documented reason
// (a tool once handed back a black PNG with a full triangle count): each crop
// must be neither near-black nor flat. Thresholds are "did it draw" gates,
// deliberately far from the measured values — this is not a look test, the
// look is what the PNGs are FOR.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from './serve.mjs';

const outDir = process.argv[2] || 'shots';
mkdirSync(outDir, { recursive: true });

const { chromium } = await import('playwright');
const { srv, port } = await serve(0);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });

const fails = [];
const stats = await page.evaluate('window.__stats()');
console.log(`loaded: ${stats.plants ?? '?'} plants, ${stats.meshes} asset meshes, ${stats.lines} line nodes, ${stats.tris.toLocaleString()} asset triangles`);
if (!(stats.tris > 0)) fails.push('no asset triangles loaded');

for (const name of ['wide', 'hero', 'grove', 'pond']) {
  const crop = await page.evaluate((n) => {
    window.__hold = true;
    window.__frame(n);
    const cv = document.querySelector('canvas');
    const w = Math.floor(cv.width * 0.6), h = Math.floor(cv.height * 0.6);
    const x = (cv.width - w) >> 1, y = (cv.height - h) >> 1;
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const ctx = c2.getContext('2d');
    ctx.drawImage(cv, x, y, w, h, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(d.length / 4);
    let mean = 0;
    for (let i = 0; i < lum.length; i++) {
      lum[i] = (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255;
      mean += lum[i];
    }
    mean /= lum.length;
    const hist = new Uint32Array(256);
    for (let i = 0; i < lum.length; i++) hist[Math.min(255, (lum[i] * 255) | 0)]++;
    let mode = 0; for (let i = 1; i < 256; i++) if (hist[i] > hist[mode]) mode = i;
    let ink = 0;
    for (let i = 0; i < lum.length; i++) if (Math.abs(lum[i] * 255 - mode) > 4) ink++;
    return { mean, ink: ink / lum.length };
  }, name);
  const file = join(outDir, `demo_${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${name.padEnd(6)} mean ${crop.mean.toFixed(4)}  ink ${crop.ink.toFixed(4)}  -> ${file}`);
  if (crop.mean < 0.01) fails.push(`${name}: near-black (mean ${crop.mean.toFixed(4)})`);
  if (crop.ink < 0.02) fails.push(`${name}: flat — the camera is looking at nothing (ink ${crop.ink.toFixed(4)})`);
}

await browser.close();
srv.close();

if (fails.length) {
  console.error('\nFAIL:'); for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('\nall framings drew.');
