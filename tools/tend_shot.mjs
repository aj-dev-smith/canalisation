// THE BENCH, PHOTOGRAPHED: the three experiments done by a script, a frame at
// each moment worth seeing, and what the page measured about each.
//
// This is the part no headless harness can judge. `test/tend.mjs` says whether
// a cut releases buds and whether the paste holds them; this says whether a
// person watching would SEE either — whether the drain front reads, whether the
// wake is visible, whether the lamp's pull shows before the viewer gives up.
//
// Same GL rule as every capture tool here: on macOS `--use-gl=swiftshader` loses
// the context and writes a BLACK png, so macOS gets Metal.
//
//   node tools/tend_shot.mjs OUTDIR [species] [seed] [growSteps]
//
// Frames: grown, lamp (+3 s), cut (+0.2/+1/+2.5/+6 s), paste (held at +5 s,
// then wiped +3 s). Every frame is taken at speed 0 so the picture is one
// moment of the simulation, not a smear across two.

import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';
import { mkdirSync } from 'fs';

const [, , outDir = 'shots', species = 'Cathedral Fern', seed = '21', grow = '900'] = process.argv;
mkdirSync(outDir, { recursive: true });
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const W = +(process.env.W || 1280), H = +(process.env.H || 820);
const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1) });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const url = pathToFileURL(process.cwd() + '/tend.html').href
  + `?species=${encodeURIComponent(species)}&seed=${seed}&ff=${grow}&speed=0`;
await pg.goto(url);
await pg.waitForTimeout(2500);
const tag = species.replace(/\s+/g, '_').toLowerCase() + '_' + seed;
const shot = async (name) => {
  await pg.waitForTimeout(250);
  await pg.screenshot({ path: `${outDir}/tend_${tag}_${name}.png` });
  const r = await pg.evaluate(() => {
    const a = window.__tend, P = a.plant;
    return { t: P.time, axes: P.axes.length, tips: P.axes.filter(x => x.alive && x.meristem).length,
      organs: P.organCount(), results: a.results };
  });
  console.log(name.padEnd(12), JSON.stringify(r));
};
// run the plant for n steps of plant time, rendering as it goes, then hold
const run = async (steps) => {
  await pg.evaluate((n) => { window.__tend._runTo = window.__tend.plant.time + n; window.__tend.speedMul = 1; }, steps);
  await pg.waitForFunction(() => window.__tend.plant.time >= window.__tend._runTo, null, { timeout: 120000, polling: 50 });
  await pg.evaluate(() => { window.__tend.speedMul = 0; });
};
await shot('grown');

// THE LAMP, to the right of the plant at two-thirds height
await pg.evaluate(() => {
  const a = window.__tend, bb = a.plant.bounds();
  a.lamp.pos[0] = bb.cx + Math.max(6, bb.h * 0.55);
  a.lamp.pos[1] = bb.cy + bb.h * 0.25;
  a.lamp.pos[2] = bb.cz + 2;
  a.setLamp(true); a._placed = true;
});
await run(375);
await shot('lamp');
await pg.evaluate(() => window.__tend.setLamp(false));

// THE CUT: the leader, a third of the way down from its tip
await pg.evaluate(() => {
  const a = window.__tend, L = a.plant.main;
  const s = L.length * 0.66;
  a.doCut({ ax: L, s, p: L.tipPos(), i: Math.max(1, L.pts.length - 2), f: 0 });
});
await shot('cut0');
await run(25); await shot('cut02');
await run(100); await shot('cut1');
await run(190); await shot('cut25');
await run(440); await shot('cut6');

// THE CONTROL: a fresh plant of the same seed, cut at the same place, pasted
await pg.evaluate(([sp, sd, g]) => {
  const a = window.__tend;
  a.newSpecimen(sp, +sd);
  for (let i = 0; i < +g; i++) a.plant.step(1);
  a.bbS = null;
  const L = a.plant.main;
  a.doCut({ ax: L, s: L.length * 0.66, p: L.tipPos(), i: 1, f: 0 }, true);
}, [species, seed, grow]);
await run(625); await shot('pasted5');
await pg.evaluate(() => window.__tend.togglePaste(window.__tend.plant.main));
await run(375); await shot('wiped3');

console.log(errs.length ? errs.join('\n') : 'no page errors');
await b.close();
