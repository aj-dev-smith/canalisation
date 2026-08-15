// THE FIELD, MOVING. Records the drifting camera for a while and saves the
// webm — the only artifact in demo/ that shows the wind, which is the point
// of the wind. Same caveat as tools/clip.mjs: under software GL the page runs
// well below 60fps, so the clip is a low-frame-rate record of true-rate
// motion — the gust ladder's slowest octaves are 0.13-0.5 Hz and read fine at
// a few frames a second; do not read stutter as a solver bug.
//
//   node demo/clip.mjs shots 20     # shots/demo_clip.webm, ~20s

import { mkdirSync, renameSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from './serve.mjs';

const outDir = process.argv[2] || 'shots';
const seconds = +(process.argv[3] || 20);
mkdirSync(outDir, { recursive: true });

const { chromium } = await import('playwright');
const { srv, port } = await serve(0);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const ctx = await browser.newContext({
  viewport: { width: 960, height: 600 },
  recordVideo: { dir: outDir, size: { width: 960, height: 600 } },
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });
console.log(`recording ${seconds}s of the field in its wind…`);
await page.waitForTimeout(seconds * 1000);

const video = page.video();
await page.close();
const raw = await video.path();
await ctx.close();
await browser.close();
srv.close();

const out = join(outDir, 'demo_clip.webm');
renameSync(raw, out);
// recordVideo writes a hashed filename; clean any strays from failed runs
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.webm') && f !== 'demo_clip.webm') {
    try { renameSync(join(outDir, f), join(outDir, '.trash_' + f)); } catch {}
  }
}
console.log(`  ${out}`);
