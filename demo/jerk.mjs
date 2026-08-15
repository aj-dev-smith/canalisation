import { serve } from './serve.mjs';
const { chromium } = await import('playwright');
const { srv, port } = await serve(0);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(`http://127.0.0.1:${port}/?cam=flight`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 240000 });
const r = await page.evaluate(() => {
  window.__hold = true; window.__skipDraw = true;
  const fps = 24, n = 480, qs = [];
  for (let i = 0; i < n; i++) { window.__stepMs(i * 1000 / fps); qs.push(window.__camQ()); }
  window.__skipDraw = false;
  const deg = [];
  for (let i = 1; i < n; i++) {
    const [ax, ay, az, aw] = qs[i - 1], [bx, by, bz, bw] = qs[i];
    const dot = Math.min(1, Math.abs(ax * bx + ay * by + az * bz + aw * bw));
    deg.push(2 * Math.acos(dot) * 180 / Math.PI);
  }
  const worst = deg.reduce((m, d, i) => d > m.d ? { d, i } : m, { d: 0, i: 0 });
  const sorted = [...deg].sort((a, b) => a - b);
  return { max: worst.d, atSec: (worst.i / 24), p95: sorted[(deg.length * 0.95) | 0], mean: deg.reduce((a, b) => a + b) / deg.length };
});
console.log(`per-frame camera rotation: mean ${r.mean.toFixed(2)}°  p95 ${r.p95.toFixed(2)}°  max ${r.max.toFixed(2)}° at ${r.atSec.toFixed(1)}s`);
await browser.close(); srv.close();
if (r.max > 2.5) { console.error('FAIL: still whipping'); process.exit(1); }
console.log('smooth: no frame turns the camera faster than 2.5° (60°/s).');
