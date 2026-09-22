// A SHARED LINK REGROWS THE SAME PLANT — checked, not assumed.
//
// tend.html's share button packs a seed and a list of what was done to the plant
// (cuts, auxin on and off, where the lamp was) into the URL, and the page claims
// that opening it regrows the exact plant. That claim rests on the engine being
// deterministic AND on the page applying every action at the same plant step it
// was made at — the lamp in particular moves between frames, which is why the
// simulation reads a committed copy of it (`TendApp._commitLamp`).
//
// So: page A tends a plant through the same methods the pointer handlers call,
// in real time, with the lamp dragged about; page B opens A's link; both
// fingerprint every stem point at the same plant step. Exits non-zero if they
// differ. On macOS it uses Metal, as every capture tool here does.
//
//   node tools/tend_replay.mjs [species] [seed]

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , species = 'Ember Creeper', seed = '7'] = process.argv;
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const base = pathToFileURL(process.cwd() + '/tend.html').href;
const errs = [];
const open = async (url) => {
  const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto(url);
  await pg.waitForTimeout(1500);
  return pg;
};
// a fingerprint of the plant's shape: every stem point, rounded to 1e-5
const PRINT = `(P) => { let h = 2166136261 >>> 0; const mix = (x) => { h = Math.imul(h ^ (x | 0), 16777619) >>> 0; };
  for (const a of P.axes) { mix(a.organs.length); for (const p of a.pts) { mix(Math.round(p[0] * 1e5)); mix(Math.round(p[1] * 1e5)); mix(Math.round(p[2] * 1e5)); } }
  return h + ':' + P.axes.length + ':' + P.organCount(); }`;

const A = await open(`${base}?species=${encodeURIComponent(species)}&seed=${seed}&ff=300`);
// tend it, in real time: lamp on and dragged, a cut, auxin on a cut, taken off
const step = (n) => A.evaluate((n) => new Promise(res => { const a = window.__tend, t1 = a.plant.time + n; a.speedMul = 1;
  const go = () => a.plant.time >= t1 ? res() : requestAnimationFrame(go); go(); }), n);
await A.evaluate(() => { const a = window.__tend; a.slowCuts = false; a.moveLamp(innerWidth * 0.75, innerHeight * 0.35, true); a._placed = true; a.setLamp(true); });
for (let i = 0; i < 12; i++) {
  await A.evaluate((i) => window.__tend.moveLamp(innerWidth * (0.75 - i * 0.03), innerHeight * (0.35 + i * 0.01), false), i);
  await step(9);
}
await step(200);
await A.evaluate(() => { const a = window.__tend, L = a.plant.main; a.doCut({ ax: L, s: L.length * 0.7, p: L.tipPos(), i: 1, f: 0 }); });
await step(260);
await A.evaluate(() => { const a = window.__tend; const ax = a.plant.axes.filter(x => x.alive && x.meristem).sort((p, q) => q.tipPos()[1] - p.tipPos()[1])[0];
  if (ax) a.doCut({ ax, s: ax.length * 0.5, p: ax.tipPos(), i: 1, f: 0 }, true); });
await step(180);
await A.evaluate(() => { const a = window.__tend; const st = a.plant.axes.find(x => x.cutInfo && x.cutInfo.paste.some(p => p.off === Infinity)); if (st) a.togglePaste(st); });
await step(150);
await A.evaluate(() => { window.__tend.setLamp(false); });
await step(40);
const rec = await A.evaluate(async (PRINT) => {
  const a = window.__tend; a.speedMul = 0;
  await new Promise(r => setTimeout(r, 200));
  const print = eval(PRINT);
  // the link, exactly as the share button builds it
  const url = location.href.split('#')[0].split('?')[0] + '#r=' + await tbPack(a.log);
  return { t: a.plant.time, print: print(a.plant), url, n: a.log.a.length, kinds: a.log.a.map(x => x[0]).join('') };
}, PRINT);
console.log(`tended: t=${rec.t}, ${rec.n} actions (${rec.kinds.replace(/L+/g, m => 'L×' + m.length + ' ')}), url ${rec.url.length} chars`);
console.log(`  A  ${rec.print}`);

const B = await open(rec.url);
const got = await B.evaluate(([T, PRINT]) => new Promise((res) => {
  const a = window.__tend, print = eval(PRINT);
  const check = () => {
    // the replay may already be running; hook every step until T
    a.onStep = (P) => { if (P.time === T) { a.onStep = null; a.speedMul = 0; res(print(P)); } };
  };
  check();
  setTimeout(() => res('timeout at t=' + a.plant.time), 60000);
}), [rec.t, PRINT]);
console.log(`  B  ${got}`);
const ok = got === rec.print;
console.log(ok ? 'REPLAY IDENTICAL' : 'REPLAY DIFFERS');
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
