// HOW FAST IS THE SCENE MOVING?
//
//   node tools/jitter.mjs [species] [seed] [waitSeconds] [uRef]
//
// "It wobbles too fast" and "some leaves jitter" are the two things a still cannot show
// and a person watching cannot quantify. This samples the actual drawn state at frame
// rate — the tip of the main axis, and the normals of individual blades — and reports
// where the energy sits in frequency.
//
// The number that matters is the fraction of movement above about 3 Hz. Anything a
// viewer reads as "jitter" rather than "sway" lives up there, and at 60 Hz displays it
// is also where aliasing starts.
//
// This is how the wind field's integral length scale was caught being wrong: every gust
// mode was 3.9-19.3 Hz because the vertical component's length scale had been used for
// the streamwise one, so the plant was being driven at frequencies that are physically
// present in air but carry almost none of its energy.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

// `uRef` is optional and overrides the shipped wind speed, so a before/after on the
// weather is two runs of one binary rather than two checkouts. It is the only argument
// here that changes the physics rather than the sampling.
const [, , species, seed, wait = '6', uRef] = process.argv;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 900, height: 700 } });
await pg.goto(pathToFileURL(process.cwd() + '/canalisation.html').href);
if (species) {
  await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, sd ? +sd : undefined),
    [species, seed]);
}
if (uRef !== undefined) await pg.evaluate(u => window.__app.setWind(+u), uRef);
await pg.evaluate(() => { window.__app.speedMul = 4; });
await pg.waitForTimeout(+wait * 1000);
// Freeze growth and the camera. Anything still moving is the air.
await pg.evaluate(() => { const a = window.__app; a.speedMul = 1; a.cam.autoRot = false; a.cam.idle = 0; });
await pg.waitForTimeout(1200);

// Record in the page, at frame rate, so the sampling is the same clock the viewer sees.
const rec = await pg.evaluate(() => new Promise((res) => {
  const app = window.__app, P = app.plant, a = P.main;
  const organs = P.axes.flatMap(x => x.organs).filter(o => !o.shed && o.leaf && o.dev > 0.5);
  const pick = organs.filter((_, i) => i % Math.max(1, Math.floor(organs.length / 6)) === 0).slice(0, 6);
  const out = { t: [], tip: [], blades: pick.map(() => []) };
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now();
    out.t.push((now - t0) / 1000);
    // THE TIP'S DEFLECTION, NOT THE TIP'S POSITION. The absolute tip climbs as the
    // axis elongates, and growth is a much larger displacement than sway is — the
    // first version of this recorded position and reported an rms of 1.0 world units
    // that barely moved when the wind was cut by a third, because it was measuring
    // the plant getting taller. Against the rest shape, growth cancels and what is
    // left is the bending.
    const r = a.rest && a.rest[a.rest.length - 1];
    const p = a.pts[a.pts.length - 1];
    out.tip.push(r ? [p[0] - r[0], p[1] - r[1], p[2] - r[2]] : [p[0], p[1], p[2]]);
    pick.forEach((o, i) => out.blades[i].push([o.frame.y[0], o.frame.y[1], o.frame.y[2]]));
    if (now - t0 < 5000) requestAnimationFrame(tick); else res(out);
  };
  requestAnimationFrame(tick);
}));
await b.close();

// Split each signal's variance either side of a cut frequency, by differencing: the
// step-to-step change is a high-pass, and comparing its size to the whole signal's
// spread says how much of the movement is fast. Crude, robust, and enough to tell sway
// from jitter without carrying an FFT around.
function report(label, series, dt) {
  const n = series.length;
  if (n < 8) return console.log(`  ${label}: too few samples`);
  const dims = series[0].length;
  let total = 0, fast = 0, peakRate = 0;
  for (let d = 0; d < dims; d++) {
    const v = series.map(s => s[d]);
    const mean = v.reduce((a, b) => a + b, 0) / n;
    for (const x of v) total += (x - mean) * (x - mean);
    for (let i = 1; i < n; i++) {
      const step = v[i] - v[i - 1];
      fast += step * step;
      peakRate = Math.max(peakRate, Math.abs(step) / dt);
    }
  }
  // For a sinusoid at f, sampled at 1/dt, the mean square step is 2*var*(1-cos(2 pi f dt)).
  // Invert that for an equivalent frequency: the rate the movement "feels" like.
  const varTot = total / (n * dims);
  const msStep = fast / ((n - 1) * dims);
  const c = Math.max(-1, Math.min(1, 1 - msStep / (2 * Math.max(1e-18, varTot))));
  const fEq = Math.acos(c) / (2 * Math.PI * dt);
  console.log(`  ${label.padEnd(12)} rms ${Math.sqrt(varTot).toExponential(2)}`
    + `   dominant rate ${fEq.toFixed(2)} Hz`
    + `   peak slew ${peakRate.toExponential(2)}/s`);
  return fEq;
}

const dt = (rec.t[rec.t.length - 1] - rec.t[0]) / (rec.t.length - 1);
console.log(`${rec.t.length} frames at ${(1 / dt).toFixed(0)} fps over ${rec.t[rec.t.length - 1].toFixed(1)}s\n`);
const tipHz = report('stem tip', rec.tip, dt);
console.log('');
const bladeHz = rec.blades.map((s, i) => report(`blade ${i}`, s, dt)).filter(Number.isFinite);
const worst = Math.max(...bladeHz);
console.log(`\nstem ${tipHz.toFixed(2)} Hz, worst blade ${worst.toFixed(2)} Hz`);
console.log(worst > 4 || tipHz > 4
  ? 'READS AS JITTER: something is being driven above ~4 Hz.'
  : 'READS AS SWAY: everything is below ~4 Hz.');
