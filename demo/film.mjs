// THE FIELD, MOVING — FILMED OFFLINE. `clip.mjs` records wall-clock, and
// under software GL that is a slideshow: the renderer manages ~1 fps and the
// recorder faithfully writes down that nothing happened. This tool renders
// the SAME motion smoothly by owning the clock instead of trusting the
// machine's: hold the RAF loop, call `__stepMs` with fabricated timestamps
// one frame apart, screenshot each, and hand the sequence to ffmpeg. The
// result is true-rate motion at a solid frame rate no matter how slow the
// renderer is — the same reason blender_clip.mjs renders one frame per
// Blender process instead of screen-recording a viewport.
//
//   node demo/film.mjs shots 12 24        # 12s at 24fps -> shots/demo_film.mp4
//
// ffmpeg is vendored as a static build into tools/.cache/ffmpeg (curl, like
// the three.js vendor — Node's fetch ignores HTTPS_PROXY).

import { mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = process.argv[2] || 'shots';
const seconds = +(process.argv[3] || 20);
const fps = +(process.argv[4] || 24);
const camMode = process.argv[5] || 'flight';   // the pollinator's tour; 'drift' for the old orbit
const W = +(process.env.WIDTH || 1280), H = +(process.env.HEIGHT || 800);
mkdirSync(outDir, { recursive: true });

// --- ffmpeg, vendored --------------------------------------------------------
const FFDIR = join(ROOT, 'tools', '.cache', 'ffmpeg');
const FF = join(FFDIR, 'ffmpeg');
if (!existsSync(FF)) {
  console.log('vendoring static ffmpeg…');
  mkdirSync(FFDIR, { recursive: true });
  const url = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
  let r = spawnSync('curl', ['-sSfL', '-o', join(FFDIR, 'ff.tar.xz'), url], { stdio: 'inherit' });
  if (r.status === 0) r = spawnSync('tar', ['xf', join(FFDIR, 'ff.tar.xz'), '--strip-components=1', '-C', FFDIR], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('could not vendor ffmpeg'); process.exit(1); }
}

// --- render the frames -------------------------------------------------------
// RESUME=1 keeps frames a crashed run already paid for (a 16-minute render
// lost its browser to the OOM killer at frame 465 of 480) and replays only
// the drifters' integrated state before rendering the remainder.
const frames = join(outDir, '.film_frames');
const resume = process.env.RESUME === '1';
if (!resume) rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
const have = resume ? readdirSync(frames).filter((f) => /^f_\d+\.png$/.test(f)).length : 0;

const { chromium } = await import('playwright');
const { srv, port } = await serve(0);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('page error:', e.message));

await page.goto(`http://127.0.0.1:${port}/?cam=${camMode}`, { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', null, { timeout: 240000 });
// a film frame is a picture, not a document — the HUD and the fps meter stay
// on the live page and out of the film. The meter got baked into a whole
// scout pass's frames before this listed it.
await page.addStyleTag({ content: '#hud, #fps { display: none; }' });
await page.evaluate('window.__hold = true');

const n = Math.round(seconds * fps);
if (have > 0) {
  console.log(`resuming: ${have} frames on disk; replaying drifter state…`);
  await page.evaluate(({ have, fps }) => {
    window.__skipDraw = true;
    for (let i = 0; i < have; i++) window.__stepMs(i * 1000 / fps);
    window.__skipDraw = false;
  }, { have, fps });
}
console.log(`rendering ${n - have} of ${n} frames, ${seconds}s at ${fps}fps, ${W}x${H}…`);
const t0 = Date.now();
for (let i = have; i < n; i++) {
  await page.evaluate((ms) => window.__stepMs(ms), i * 1000 / fps);
  await page.screenshot({ path: join(frames, `f_${String(i).padStart(4, '0')}.png`) });
  if ((i + 1) % fps === 0) {
    const el = (Date.now() - t0) / 1000, rate = (i + 1) / el;
    console.log(`  ${i + 1}/${n}  (${rate.toFixed(1)} frames/s, ~${Math.round((n - i - 1) / rate)}s left)`);
  }
}
await browser.close();
srv.close();

// --- encode ------------------------------------------------------------------
// H.264 + yuv420p plays everywhere; crf 18 is visually lossless for this much
// dark gradient, and the dark scene compresses hard anyway.
const out = join(outDir, 'demo_film.mp4');
const r = spawnSync(FF, [
  '-y', '-framerate', String(fps), '-i', join(frames, 'f_%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', out,
], { stdio: ['ignore', 'ignore', 'inherit'] });
if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
rmSync(frames, { recursive: true, force: true });
console.log(`\n  ${out}  (${n} frames, every one of them rendered on purpose)`);
