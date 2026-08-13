// RECORD flowers.html MOVING — the only artifact in this directory that shows
// the flower piece as a film rather than as a frame.
//
//   node tools/flowers_clip.mjs <outdir> '<query>' <seconds>
//   node tools/flowers_clip.mjs shots/cine 'garden=7&seed=21&ff=3000' 90
//
// Every other tool here is a still, and a still cannot answer the question this
// page's director exists to answer: is the camera SAYING anything, or is it
// arriving at a pose and stopping. `tools/clip.mjs` records the main page by
// grabbing canvas frames; this one is simpler and does not touch the page at
// all — Playwright's own `recordVideo` screencasts the tab, so what lands in
// the .webm is what a viewer would have seen, including the HUD and every
// hitch. It is therefore also the one recording here whose FRAME TIMING is the
// browser's rather than a harness's.
//
// It is an instrument as well as a recorder. While the tab records, it samples
// `window.__fl.state()` at 4 Hz and reports the camera's own motion:
//
//   - speed in world units/s AND in frame widths/s, because "gentle" is only
//     meaningful on screen: the frame at distance d is A*2*tan(fov/2)*d units
//     wide, and both terms are read off the live camera rather than assumed.
//   - the STATIONARY FRACTION — how much of the film the camera spends moving
//     slower than 0.1% of the frame width a second, which is the freeze-frame
//     defect stated as a number. A director with no perpetual drift scores
//     most of its running time here; one with drift scores near zero.
//   - the shot track: which shot ran, for how long, and what the camera did
//     inside it. A cut is where the shot name changes.
//   - capture cost (capMs) and how many specimens were rebuilt (capN), because
//     camera motion is one of the two things that dirties a stream
//     (40_boot.js's camMoved) and a perpetual drift must not thrash it.
//
// GL backend as tools/flowers_shot.mjs: on this macOS machine swiftshader
// loses the context and writes black while still reporting a full triangle
// count, so darwin gets ANGLE-on-Metal in a headed browser.
//
// The fast-forward is drained BEFORE the clock starts but the recording cannot
// be — a video belongs to the context and starts when the context does — so the
// pre-roll is trimmed off with ffmpeg into clip.webm when ffmpeg is present.
// raw.webm is always kept: the drain is itself worth watching once.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , outdir = 'shots/clip', query = 'garden=7&seed=21&ff=3000', secsArg = '60'] = process.argv;
const secs = Math.max(5, +secsArg || 60);
mkdirSync(outdir, { recursive: true });
const qs = new URLSearchParams(query).toString();
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + (qs ? '?' + qs : '');

const W = 1100, H = 700;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const ctx = await b.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: outdir, size: { width: W, height: H } },
});
const pg = await ctx.newPage();
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl);
const t0 = Date.now();
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function',
  null, { timeout: 60000 });

// Drain the fast-forward, exactly as flowers_shot does: poll the HUD rather
// than guess a wall time. Everything before this point is pre-roll.
const deadline = Date.now() + 240000;
for (;;) {
  const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
  if (!hud.includes('(fast-forward')) break;
  if (Date.now() > deadline) { console.error('TIMEOUT draining fast-forward'); break; }
  await pg.waitForTimeout(500);
}
const preroll = (Date.now() - t0) / 1000;
console.log(`pre-roll ${preroll.toFixed(1)}s (navigation + fast-forward), recording ${secs}s`);

// --- the track. 4 Hz: fast enough to catch a cut inside a quarter second,
// slow enough that the evaluate round trip is not what is being measured.
const track = [];
const tStart = Date.now();
while ((Date.now() - tStart) / 1000 < secs) {
  const s = await pg.evaluate(() => {
    const st = window.__fl.state();
    const c = window.__fl.scene.camera;
    return { ...st, t: performance.now() / 1000,
      fovH: 2 * Math.tan(c.fov * Math.PI / 360), aspect: c.aspect };
  });
  track.push(s);
  await pg.waitForTimeout(250);
}
const clipSecs = (Date.now() - tStart) / 1000;

await pg.close();          // flushes the video
await ctx.close();
const raw = `${outdir}/raw.webm`;
{
  const vids = (await import('fs')).readdirSync(outdir).filter(f => f.endsWith('.webm') && f !== 'raw.webm' && f !== 'clip.webm');
  if (vids.length) renameSync(`${outdir}/${vids[0]}`, raw);
}
await b.close();

// the raw samples, so a question the summary does not answer (where was the eye
// during the third shot) does not cost another two-minute run
writeFileSync(`${outdir}/track.json`, JSON.stringify(track));

// --- what the camera did.
let slow = 0, n = 0, dSum = 0;
const spd = [], perShot = new Map();
for (let i = 1; i < track.length; i++) {
  const a = track[i - 1], c = track[i];
  const dt = c.t - a.t;
  if (!(dt > 0)) continue;
  const d = Math.hypot(c.eye[0] - a.eye[0], c.eye[1] - a.eye[1], c.eye[2] - a.eye[2]);
  const v = d / dt;                                   // world units / s
  // the frame at the subject's own distance, so the rate is what a viewer sees
  const fw = Math.max(1e-3, c.aspect * c.fovH * c.dist);
  const vf = v / fw;                                  // frame widths / s
  spd.push({ v, vf, shot: c.shot });
  dSum += d; n++;
  if (vf < 0.001) slow++;
  const e = perShot.get(c.shot) || { t: 0, v: 0, n: 0, cap: 0, capN: 0, vf: [], y: [] };
  e.t += dt; e.v += v; e.n++; e.cap += c.capMs; e.capN += c.capN;
  e.vf.push(vf); e.y.push(c.eye[1]);
  perShot.set(c.shot, e);
}
const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
const vs = spd.map(s => s.v), vfs = spd.map(s => s.vf);
console.log(`\n--- camera over ${clipSecs.toFixed(1)}s, ${n} samples ---`);
console.log(`travel ${dSum.toFixed(1)} units   speed  median ${pct(vs, 0.5).toFixed(3)}  p90 ${pct(vs, 0.9).toFixed(2)}  max ${pct(vs, 1).toFixed(2)} u/s`);
console.log(`screen rate  median ${(pct(vfs, 0.5) * 100).toFixed(3)}  p90 ${(pct(vfs, 0.9) * 100).toFixed(2)} %frame/s`);
console.log(`STATIONARY (< 0.1 %frame/s) ${(100 * slow / Math.max(1, n)).toFixed(1)}% of samples`);
// p10 of the screen rate inside a shot is the DRIFT: the transition is the
// fast tail, so the slow decile is what the camera does once it has arrived.
// That is the number to compare against the director's own FL_DRIFT, and the
// number that is ~0 in a director that parks.
console.log('\nshot          share   mean u/s   drift %frame/s   eye y      capMs   capN');
for (const [k, e] of perShot) {
  const ys = e.y.slice().sort((a, c2) => a - c2);
  console.log(`${(k || '(none)').padEnd(12)}  ${(100 * e.t / clipSecs).toFixed(0).padStart(4)}%   ` +
    `${(e.v / e.n).toFixed(3).padStart(7)}   ${(100 * pct(e.vf, 0.1)).toFixed(3).padStart(8)} (p10)   ` +
    `${ys[0].toFixed(1).padStart(5)}-${ys[ys.length - 1].toFixed(1).padEnd(5)}   ` +
    `${(e.cap / e.n).toFixed(1).padStart(5)}   ${(e.capN / e.n).toFixed(2).padStart(4)}`);
}
// the cuts, as they happened
const cuts = [];
for (let i = 1; i < track.length; i++) if (track[i].shot !== track[i - 1].shot) cuts.push(i);
let prev = 0;
const dwell = [];
for (const i of cuts) { dwell.push(`${track[i - 1].shot} ${(track[i - 1].t - track[prev].t).toFixed(1)}s`); prev = i; }
console.log('\ncuts: ' + (dwell.length ? dwell.join(' | ') : '(none in this window)'));

if (errs.length) console.error('--- page errors ---\n' + errs.slice(0, 10).join('\n'));
console.log(`\nwrote ${raw}`);

// Trim the pre-roll. ffmpeg is not a dependency of this repo; if it is missing
// the raw file is still the recording, it just opens on the fast-forward.
const clip = `${outdir}/clip.webm`;
try {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(preroll.toFixed(2)),
    '-i', raw, '-c', 'copy', clip], { stdio: 'inherit' });
  if (existsSync(clip)) console.log(`wrote ${clip} (pre-roll ${preroll.toFixed(1)}s trimmed)`);
} catch (e) {
  console.log(`ffmpeg unavailable (${e.code || e.message}); raw.webm holds the pre-roll at the front`);
}
if (errs.length) process.exit(1);
