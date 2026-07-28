// Is the occlusion cull throwing away leaves the viewer can see?
//
// `buildScene` clears the line of sight to whatever the director is pointing at,
// so a leaf in the way of a close-up is dropped rather than allowed to fill the
// frame. That is the right thing to do. This measures whether it is doing it to
// the right leaves, because a blade that blinks out while you are watching reads
// as a rendering bug and nothing else.
//
// Two passes:
//
//   1. every species, a whole life cycle, director hands off. `%hidden` is the
//      share of the canopy the cull is removing; `flips/frame` is how often some
//      blade changes visibility, which is the thing you actually notice.
//
//   2. the handover. The camera is taken mid apex shot the way a pointerdown
//      takes it, then pulled back and orbited. `takeOver()` clears the
//      director's SUBJECT, so the cull should stop; if `focus` survives, it does
//      not, and it then measures a sight line to a tip nobody is looking at.
//
//   node tools/cull.mjs [secsPerSpecies] [handoverSecs]

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const SECS = +(process.argv[2] || 35);
const HAND = +(process.argv[3] || 15);

const WRAP = () => {
  const a = window.__app;
  if (a.__wrapped) return;
  a.__wrapped = true;
  const orig = a.buildScene.bind(a);
  a.buildScene = function () {
    orig();
    const r = window.__rec; if (!r) return;
    let blades = 0, occ = 0, flips = 0;
    for (const ax of a.plant.axes) for (const o of ax.organs) {
      if (!o.leaf || o.floral || o.shed) continue;
      blades++;
      const v = !!o._occ; if (v) occ++;
      const was = r.prev.get(o);
      if (was !== undefined && was !== v) flips++;
      r.prev.set(o, v);
    }
    if (a.focus) r.modes.add('focus:' + a.focus);
    if (a.subject) r.modes.add('subject:' + a.subject.kind);
    r.rows.push({ blades, occ, flips });
  };
};

const SUM = () => {
  const r = window.__rec, rows = r.rows.filter(x => x.blades > 0);
  if (!rows.length) return null;
  let tot = 0, occ = 0, flips = 0, peak = 0;
  for (const x of rows) {
    tot += x.blades; occ += x.occ; flips += x.flips;
    const p = x.occ / x.blades; if (p > peak) peak = p;
  }
  return { n: rows.length, peak: +(100 * peak).toFixed(1),
    mean: +(100 * occ / tot).toFixed(1), fp: +(flips / rows.length).toFixed(3),
    modes: [...r.modes].join(' ') };
};

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 900, height: 620 }, deviceScaleFactor: 1 });
pg.on('pageerror', e => console.log('PAGEERROR ' + e.message));
await pg.goto(pageUrl);
await pg.waitForTimeout(1500);

// the species rail carries each name in the chip's title attribute
const names = await pg.evaluate(() =>
  [...document.querySelectorAll('#species .chip')].map(e => e.title));

console.log('1. director hands off, one whole life cycle each\n');
console.log('species                    frames  peak%hidden  mean%hidden  flips/frame  modes seen');
let worstMean = 0, worstName = '';
for (const name of names) {
  await pg.evaluate((n) => {
    const a = window.__app;
    // fixed seed: the same eight specimens every run, so a before and an after
    // are comparable. Without it each run grows a different plant and the
    // numbers move by more than any change you are trying to measure.
    a.newSpecimen(n, 4242); a.giveBack(); a.speedMul = 3;
    window.__rec = { rows: [], prev: new Map(), modes: new Set() };
  }, name);
  await pg.evaluate(WRAP);
  await pg.waitForTimeout(SECS * 1000);
  const s = await pg.evaluate(SUM);
  if (!s) { console.log(`${name.padEnd(24)}  no frames`); continue; }
  if (s.mean > worstMean) { worstMean = s.mean; worstName = name; }
  console.log(`${name.padEnd(24)}  ${String(s.n).padStart(6)}  ${String(s.peak).padStart(11)}  ${String(s.mean).padStart(11)}  ${String(s.fp).padStart(11)}  ${s.modes}`);
}
console.log(`\nworst: ${worstName} at ${worstMean}% of the canopy hidden on average`);

console.log('\n2. the handover — camera taken mid apex shot, pulled back, orbited\n');
await pg.evaluate(() => {
  const a = window.__app;
  a.newSpecimen(a.speciesName, 4242); a.giveBack(); a.speedMul = 3;
  window.__rec = { rows: [], prev: new Map(), modes: new Set() };
});
const hand = await pg.evaluate((s) => new Promise(res => {
  const a = window.__app;
  let waited = 0;
  const iv = setInterval(() => {
    waited += 50;
    // the apex shot is one of several the director may pick, and it only exists
    // while some axis still has a live meristem — ask it to re-pick rather than
    // waiting out the weighting
    if (a.focus !== 'apex' && waited % 300 === 0) { a.shot = null; a.shotT = 99999; }
    if (a.focus === 'apex' || waited > 20000) {
      clearInterval(iv);
      if (a.focus !== 'apex') return res({ ok: false });
      a.takeOver();                       // what a pointerdown on the canvas calls
      const after = a.focus;
      window.__rec.rows.length = 0;       // measure only what follows the grab
      a.cam.dist *= 2.2;                  // pull back for a wide look, as you would
      const spin = setInterval(() => { a.cam.az += 0.02; a.cam.idle = 0; }, 16);
      setTimeout(() => { clearInterval(spin); res({ ok: true, after }); }, s * 1000);
    }
  }, 50);
}), HAND);

if (!hand.ok) console.log('no apex shot came up; handover pass did not run');
else {
  const s = await pg.evaluate(SUM);
  console.log(`focus after takeOver(): ${hand.after === null ? 'null (cleared)' : hand.after + ' (survived)'}`);
  console.log(`subject after takeOver(): ${await pg.evaluate(() => window.__app.subject === null ? 'null (cleared)' : 'survived')}`);
  if (s) console.log(`\nwhile orbiting: ${s.mean}% of the canopy hidden on average, ${s.peak}% at peak, ${s.fp} visibility flips per frame over ${s.n} frames`);
}
await b.close();
