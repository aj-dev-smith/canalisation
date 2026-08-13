// Black-tile probe — is the one-frame BLACK rectangle in the picture, or in the
// instrument?
//
// A second artefact turned up while fixing the flash: a clean, screen-axis-
// aligned ~128 px square of pure black, for one frame, anywhere on screen. It
// predates the flash fix (measured on both builds) and it is a different animal
// — the flash is a bright bloom splat, this is a hole.
//
// 128 px is a raster tile, and the only place a tile could arrive empty is the
// readback: tools/flowers_glitch.mjs snapshots the canvas with drawImage /
// toDataURL from a rAF, and a WebGL canvas without preserveDrawingBuffer has no
// contract about what a second consumer sees. So read the canvas TWICE — once
// where the probe reads it, and once more immediately after — and compare. A
// square that is black in one read and not the other was never on screen.
//
//   node tools/flowers_black.mjs '<query>' <seconds>
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=1337&ff=2200', secondsArg = '90'] = process.argv;
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 60000 });
await pg.waitForTimeout(4000);

await pg.evaluate(() => {
  const cv = document.querySelector('canvas');
  const G = 12;
  const mk = () => { const c = document.createElement('canvas'); c.width = G * 8; c.height = G * 8; return c; };
  const cA = mk(), cB = mk();
  const gA = cA.getContext('2d', { willReadFrequently: true });
  const gB = cB.getContext('2d', { willReadFrequently: true });
  const grid = (g, c) => {
    g.drawImage(cv, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const t = new Float32Array(G * G);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      t[((y >> 3) * G) + (x >> 3)] += (d[i] * 0.30 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 64;
    }
    return t;
  };
  const S = window.__glb = { n: 0, dark: 0, agree: 0, disagree: 0, ex: [] };
  let prev = null;
  const loop = () => {
    const a = grid(gA, cA);          // first read, where the glitch probe reads
    const bb = grid(gB, cB);         // second read, same frame, same canvas
    S.n++;
    if (prev) {
      for (let k = 0; k < G * G; k++) {
        // a tile that COLLAPSED this frame: the black-rectangle signature
        if (prev[k] - a[k] > 26 && a[k] < prev[k] * 0.45) {
          S.dark++;
          const same = Math.abs(bb[k] - a[k]) < 6;
          if (same) S.agree++; else S.disagree++;
          if (S.ex.length < 12) S.ex.push({ frame: S.n, tile: k, prev: +prev[k].toFixed(1),
            read1: +a[k].toFixed(1), read2: +bb[k].toFixed(1) });
        }
      }
    }
    prev = a;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

await pg.waitForTimeout(+secondsArg * 1000);
const out = await pg.evaluate(() => window.__glb);
console.log(`frames ${out.n}  collapsed tiles ${out.dark}  both reads agree ${out.agree}  disagree ${out.disagree}`);
for (const e of out.ex) console.log(`   f${e.frame} tile ${e.tile}  prev ${e.prev} -> read1 ${e.read1} / read2 ${e.read2}`);
await b.close();
