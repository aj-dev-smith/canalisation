// THE BENCH ON FILM: each experiment as a clip, rendered a frame at a time.
//
// tend.html runs in real time and a screen recording of it is only as smooth as
// the machine and the recorder. With `?film` the page does not run its own loop;
// this advances it one frame at a time (`window.__tendFrame(ms)`), photographs
// each frame, and hands them to ffmpeg — so the clip is as smooth as its frame
// rate, at any size, the same every time. The actions are the page's own methods
// called at fixed frames, which is exactly what a pointer would have called.
//
//   node tools/tend_film.mjs OUTDIR [scenario] [size]
//     scenario: cut | lamp | auxin | all      (default all)
//     size:     1080 square by default; CLEAN=1 hides every control but a caption
//
// Needs ffmpeg on the PATH. Frames are written under OUTDIR/<scenario>_frames and
// kept, so a re-encode does not need a re-render.

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';

const [, , outDir = 'shots', which = 'all', sizeArg = '1080'] = process.argv;
const S = +sizeArg, FPS = 30, DT = 1000 / FPS;
const CLEAN = !!process.env.CLEAN;
const gpu = platform() === 'darwin';

// A scenario is a plant, a length in frames, and what to do at which frame.
const SCENES = {
  // Thimann & Skoog: cut the leader of an Ember Creeper a third of the way down
  cut: {
    q: 'species=Ember%20Creeper&seed=7&ff=720', frames: 330, tool: 'shears',
    at: { 45: `const a = window.__tend, L = a.plant.main; a.doCut({ ax: L, s: L.length * 0.64, p: L.tipPos(), i: 1, f: 0 });` },
  },
  // the Darwins: a lamp carried slowly round a young Cathedral Fern
  lamp: {
    q: 'species=Cathedral%20Fern&seed=21&ff=420', frames: 360, tool: 'lamp',
    at: { 20: `const a = window.__tend; a.moveLamp(innerWidth * 0.80, innerHeight * 0.42, true); a._placed = true; a.setLamp(true);` },
    each: (f) => f > 20 ? `window.__tend.moveLamp(innerWidth * (0.80 - 0.0012 * ${f - 20}), innerHeight * (0.42 - 0.0004 * ${f - 20}), false);` : null,
  },
  // the control: cut a Sun Coral and put auxin back on the cut, then take it away
  auxin: {
    q: 'species=Sun%20Coral&seed=21&ff=800', frames: 390, tool: 'paste',
    at: {
      30: `const a = window.__tend; a.slowCuts = false; a.leanCuts = false; const L = a.plant.main; a.doCut({ ax: L, s: L.length * 0.62, p: L.tipPos(), i: 1, f: 0 }, true);`,
      210: `const a = window.__tend; a.slowCuts = true; const st = a.plant.axes.find(x => x.cutInfo && x.cutInfo.paste.some(p => p.off === Infinity)); if (st) a.togglePaste(st);`,
    },
  },
};

const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const errs = [];
for (const name of which === 'all' ? Object.keys(SCENES) : [which]) {
  const sc = SCENES[name];
  if (!sc) { console.error('no such scenario: ' + name); process.exit(1); }
  const dir = `${outDir}/${name}_frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const pg = await b.newPage({ viewport: { width: S, height: S }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  const url = pathToFileURL(process.cwd() + '/tend.html').href
    + `?${sc.q}&film&tool=${sc.tool}` + (CLEAN ? '&clean&caption' : '');
  await pg.goto(url);
  await pg.waitForTimeout(1200);
  // settle the camera onto the plant before the first frame that is kept
  await pg.evaluate((dt) => { for (let i = 0; i < 45; i++) window.__tendFrame(dt); window.__tend.speedMul = 1; }, DT);
  for (let f = 0; f < sc.frames; f++) {
    const js = [sc.at && sc.at[f], sc.each && sc.each(f)].filter(Boolean).join('\n');
    if (js) await pg.evaluate(js);
    await pg.evaluate((dt) => window.__tendFrame(dt), DT);
    await pg.screenshot({ path: `${dir}/f${String(f).padStart(4, '0')}.png` });
    if (f % 60 === 0) process.stdout.write(`${name} ${f}/${sc.frames}\r`);
  }
  const res = await pg.evaluate(() => window.__tend.results);
  console.log(`${name}: ${JSON.stringify(res)}`);
  await pg.close();
  const mp4 = `${outDir}/tend_${name}${CLEAN ? '_clean' : ''}.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', `${dir}/f%04d.png`,
    // The renderer grains every frame afresh (the shipped grade's `grain`), and in
    // the wind every leaf moves every frame too, so an unconstrained encode is
    // 100+ MB for eleven seconds. A temporal denoise takes the grain out before the
    // encoder sees it — a site that re-encodes the upload strips it anyway — and
    // halves that; the motion is the content and stays.
    '-vf', 'hqdn3d=4:3:9:9', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow',
    '-movflags', '+faststart', mp4]);
  // and a 720p cut small enough to attach anywhere
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', 'scale=720:-2:flags=lanczos',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart',
    mp4.replace('.mp4', '_720.mp4')]);
  console.log('  ->', mp4);
}
if (errs.length) console.log(errs.join('\n'));
await b.close();
