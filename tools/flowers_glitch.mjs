// Glitch probe — catch one-frame flashes in flowers.html at full resolution.
//
// The reported defect is "glitchy flashes on flowers... every now and again".
// A screenshot loop cannot catch a 16 ms transient; this hooks a rAF callback
// registered AFTER the app's own loop (so it runs after render, before the
// compositor clears the buffer), downsamples the live canvas into an 12x12
// tile grid every frame, and flags a tile whose luminance spikes up and comes
// back within a frame. On a spike it snapshots the FULL canvas via toDataURL
// in the same frame — the glitch frame itself, plus its neighbours.
//
// Frames where the camera moved (eyeMove >= 0.02) are excluded — a dolly or a
// cut is not a glitch, and the first run of this probe filled its save slots
// with exactly those. Each confirmed spike records the director's shot and
// whether __fl.state().capN moved that frame, so a recapture-correlated pop
// and a texture flash separate in the log.
//
// 2026-08-12 baseline on flowers-garden (garden=7 seed=21 ff=2200, 75 s):
// 3 confirmed still-camera spikes, mag 30-50, capN uncorrelated; the saved
// frames show a screen-axis-aligned rectangle of regular grid noise over a
// flower for exactly one frame. PRINTS, DOES NOT JUDGE — read the saved
// frames; zero spikes over minutes is the pass a fix should demonstrate.
//
//   node tools/flowers_glitch.mjs '<query>' <seconds> <outdir>
//   node tools/flowers_glitch.mjs 'garden=7&seed=21&ff=2200' 75 shots/glitch
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const [, , query = 'garden=7&seed=21', secondsArg = '60', outdir = 'shots/glitch'] = process.argv;
const seconds = +secondsArg;
mkdirSync(outdir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;

const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl);
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function', null, { timeout: 30000 });
await pg.waitForTimeout(3000); // let ff finish and the scene settle

await pg.evaluate(() => {
  const cv = document.querySelector('canvas');
  const G = 12;               // tile grid
  const small = document.createElement('canvas');
  small.width = G * 8; small.height = G * 8;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  window.__glitch = { spikes: [], frames: {}, n: 0, prev: null, prev2: null, pending: null };
  const S = window.__glitch;
  const lum = () => {
    ctx.drawImage(cv, 0, 0, small.width, small.height);
    const d = ctx.getImageData(0, 0, small.width, small.height).data;
    const t = new Float32Array(G * G);
    for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) {
      const i = (y * small.width + x) * 4;
      t[((y >> 3) * G) + (x >> 3)] += (d[i] * 0.30 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 64;
    }
    return t;
  };
  let prevEye = null, prevCapN = 0;
  const loop = () => {
    const t = lum(); S.n++;
    const st = window.__fl.state();
    const eyeMove = prevEye ? Math.hypot(st.eye[0] - prevEye[0], st.eye[1] - prevEye[1], st.eye[2] - prevEye[2]) : 0;
    const capped = st.capN !== prevCapN;
    prevEye = st.eye; prevCapN = st.capN;
    // a pending spike from last frame: judge it now that we can see recovery
    if (S.pending) {
      const p = S.pending; S.pending = null;
      let recovered = 0;
      for (const k of p.tiles) if (Math.abs(t[k] - p.before[k]) < p.mag[k] * 0.4) recovered++;
      if (recovered >= p.tiles.length * 0.6) {
        S.spikes.push({ frame: p.frame, tiles: p.tiles, mag: p.tiles.map(k => p.mag[k].toFixed(1)),
          eyeMove: p.eyeMove.toFixed(3), capped: p.capped, shot: p.st });
        if (Object.keys(S.frames).length < 12) {
          S.frames[p.frame] = p.shot;              // the glitch frame itself
          S.frames[p.frame + 1] = cv.toDataURL();  // the recovered frame
        }
      }
    }
    if (S.prev && S.prev2 && eyeMove < 0.02) {     // still camera only — a dolly is not a glitch
      const tiles = []; const mag = new Float32Array(G * G);
      for (let k = 0; k < G * G; k++) {
        const d1 = t[k] - S.prev[k];               // jump this frame
        const d0 = Math.abs(S.prev[k] - S.prev2[k]); // ordinary motion, last frame
        if (Math.abs(d1) > 26 && Math.abs(d1) > 4 * (d0 + 2)) { tiles.push(k); mag[k] = Math.abs(d1); }
      }
      if (tiles.length >= 1 && tiles.length <= 20) {
        // candidate flash: snapshot NOW (same frame), confirm recovery next frame
        S.pending = { frame: S.n, tiles, mag, before: S.prev, shot: cv.toDataURL(),
          eyeMove, capped, st: st.shot };
      }
    }
    S.prev2 = S.prev; S.prev = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

await pg.waitForTimeout(seconds * 1000);
const out = await pg.evaluate(() => ({
  n: window.__glitch.n,
  spikes: window.__glitch.spikes,
  frames: window.__glitch.frames,
  state: window.__fl.state(),
}));
console.log(`frames sampled: ${out.n}, spikes confirmed: ${out.spikes.length}`);
for (const s of out.spikes.slice(0, 40)) console.log("  frame", s.frame, "shot", s.shot, "capped", s.capped, "eyeMove", s.eyeMove, "tiles", s.tiles.join(","), "mag", s.mag.join(","));
let saved = 0;
for (const [f, url] of Object.entries(out.frames)) {
  writeFileSync(`${outdir}/f${f}.png`, Buffer.from(url.split(',')[1], 'base64'));
  saved++;
}
console.log(`saved ${saved} frames to ${outdir}/`);
console.log('shot:', out.state.shot, 'errors:', errs.length ? errs : 'none');
await b.close();
