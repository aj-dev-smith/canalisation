// ---------------------------------------------------------------------------
// DOES AN INFECTED PLANT LOOK INFECTED, OR DOES IT LOOK LIKE A BUG?
//
// `src/15_pathogen.js` was built, measured and drawn entirely headlessly, and
// every number in test/pathogen.mjs and test/infected.mjs says it works. None of
// that answers the only question a viewer asks. This project's record is that a
// person looking for a few seconds has beaten a green suite three times — a wind
// field at vibration frequencies, an upside-down crown, and a tree with a tenth
// of its foliage — so this file exists to be LOOKED AT rather than read.
//
//   node tools/infect_shot.mjs shots                 # control + 3 agents
//   node tools/infect_shot.mjs shots invert          # just one
//   SPECIES='Cathedral Fern' VIEW=field node tools/infect_shot.mjs shots
//
// Every variant is grown in ONE page session on ONE GL backend from ONE seed
// for the SAME simulated duration, and differs only in whether `inoculate` was
// called — the same argument tools/tree_shot.mjs makes for its `OVER=` patch.
// An A/B across two browser launches is not an A/B.
//
// THREE THINGS IT GETS RIGHT THAT THE FIRST VERSION DID NOT, all of them
// mistakes this repo had already written down somewhere:
//
//  1. IT PINS THE CAMERA DISTANCE TO THE CONTROL'S. `invert` costs a specimen
//     91% of its organs, so a camera that frames each plant on its own bounds
//     flies IN on the sick one and photographs it at a completely different
//     scale — which makes "much smaller" read as "about the same". tree_shot.mjs
//     documents exactly this as a way to buy a false theory; FIXDIST there,
//     the control's own distance here.
//  2. IT POLLS FOR THE STAGE INSTEAD OF WAITING. The first run photographed a
//     plant that was already SENESCING and drew conclusions about foliage from
//     it — the same failure tree_shot's first run had, which photographed a
//     dead tree. The stage of every shot is printed beside it.
//  3. IT CHECKS THE AGENT ACTUALLY LANDED. `inoculate` returns null when no
//     axis still has a growing point, and a herb's leader converts to a flower
//     early. The first run infected nothing four times and reported four
//     identical plants without complaint.
// ---------------------------------------------------------------------------
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { mkdirSync } from 'fs';

const pageUrl = pathToFileURL(process.cwd() + '/canalisation.html').href;
const outDir = process.argv[2] || 'shots';
const only = process.argv[3];
const SPECIES = process.env.SPECIES || 'Abyssal Frond';
const SEED = +(process.env.SEED || 21);
const VIEW = process.env.VIEW || 'natural';
const BEFORE = +(process.env.BEFORE || 1500);   // growth before inoculation
const STOP_AT = process.env.STOP_AT || 'ripe';  // stage to stop the CONTROL at
const MAX_MS = +(process.env.MAX_MS || 90000);
// 4x is too coarse to catch a stage: a herb crosses fruiting, ripe AND senescing
// inside one 500ms poll, and the first run of this file photographed a dying
// plant three times before the assertion below was believed.
const SPEED = +(process.env.SPEED || 1.5);
const POLL = 200;

mkdirSync(outDir, { recursive: true });
const AGENTS = only ? [only] : ['lesion', 'chlorosis', 'invert'];

const b = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pageUrl);
await pg.waitForTimeout(2500);

const STAGES = ['seedling', 'leafing', 'flowering', 'fruiting', 'ripe', 'senescing', 'spent'];
const stageIdx = (s) => Math.max(0, STAGES.indexOf(String(s || '').toLowerCase()));

async function freezeAndTakeCamera() {
  await pg.evaluate(() => {
    const a = window.__app;
    a.speedMul = 0;
    a.shot = null; a.subject = null; a.focus = null; a._watch = null;
    a.userDriving = true;
    a.cam.autoRot = false;
  });
  await pg.waitForTimeout(600);
}

// grow one variant; `holdMs` null means "poll until STOP_AT and report how long"
async function specimen(agent, holdMs, pinnedDist) {
  await pg.evaluate(([s, sd, v, sp]) => {
    const a = window.__app;
    a.newSpecimen(s, +sd);
    a.setRenderView(v);
    a.speedMul = sp;
    a.userDriving = true; a.cam.autoRot = false;
    a.shot = null; a.subject = null; a.focus = null; a._watch = null;
  }, [SPECIES, SEED, VIEW, SPEED]);
  await pg.waitForTimeout(BEFORE);

  let inoc = null;
  if (agent) {
    inoc = await pg.evaluate((a) => {
      const p = window.__app.plant;
      const live = p.axes.filter(x => x.meristem && x.alive).length;
      const r = p.inoculate(a);
      return { ok: !!r, liveAxes: live, totalAxes: p.axes.length };
    }, agent);
  }

  let elapsed = BEFORE;
  if (holdMs == null) {
    // poll for the stage rather than trusting a stopwatch
    while (elapsed < MAX_MS) {
      await pg.waitForTimeout(POLL);
      elapsed += POLL;
      const st = await pg.evaluate(() => String(window.__app.plant.stage()));
      if (stageIdx(st) >= stageIdx(STOP_AT)) break;
    }
  } else {
    await pg.waitForTimeout(Math.max(0, holdMs - BEFORE));
    elapsed = holdMs;
  }

  await freezeAndTakeCamera();

  const bb = await pg.evaluate(() => {
    const b = window.__app.sceneBounds();
    const fov = window.__app.cam.fov;
    return { cy: b.cy, w: b.w, h: b.h, fov };
  });
  const own = bb.h * 0.5 / Math.tan(bb.fov / 2) * 1.25;
  const dist = pinnedDist || own;

  // re-assert immediately before the shutter: the framer damps cam.dist toward
  // the bounding sphere every frame, so anything set once is pulled away again
  await pg.evaluate(([d, y]) => {
    const a = window.__app;
    Object.assign(a.cam, { dist: d, az: 0.6, el: 0.04, tgtY: y });
    a.bbS = null;
  }, [dist, bb.cy]);
  await pg.waitForTimeout(500);

  const st = await pg.evaluate(() => {
    const a = window.__app, s = a.plant.stats();
    return {
      organs: s.organs, axes: s.axes, height: +s.height.toFixed(2),
      tris: a.renderer.nTri, lines: a.renderer.nLine,
      stage: String(a.plant.stage()),
      burden: a.plant.agentBurden ? a.plant.agentBurden() : null,
    };
  });
  const path = `${outDir}/infect_${agent || 'control'}.png`;
  await pg.screenshot({ path });
  return { agent: agent || '(control)', inoc, st, path, elapsed, own, dist };
}

// The control sets both the clock and the camera, so every sick plant is shot
// after the same simulated time and from the same distance.
const ctl = await specimen(null, null, null);
console.log(`\n  control reached '${ctl.st.stage}' after ${ctl.elapsed}ms; framing at ${ctl.own.toFixed(1)}`);
const rows = [ctl];
for (const a of AGENTS) rows.push(await specimen(a, ctl.elapsed, ctl.own));
await b.close();

console.log(`\n  ${SPECIES}, seed ${SEED}, view ${VIEW}, inoculated at ${BEFORE}ms,` +
  ` all shots at ${ctl.elapsed}ms and distance ${ctl.own.toFixed(1)}\n`);
console.log('  agent        organs   axes   height   stage        its own dist   burden');
for (const r of rows) {
  const b0 = r.st.burden;
  console.log(`  ${r.agent.padEnd(12)} ${String(r.st.organs).padStart(5)}  ${String(r.st.axes).padStart(4)}   ` +
    `${String(r.st.height).padStart(6)}   ${r.st.stage.padEnd(11)}  ${r.own.toFixed(1).padStart(8)}` +
    `      ${b0 && b0.axes ? b0.axes + ' axes, peak ' + b0.peak.toFixed(2) : '--'}`);
}
console.log('\n  `its own dist` is what this plant WOULD have been framed at. Where it is');
console.log('  much smaller than the control\'s, the shot is deliberately wide — that is');
console.log('  the effect, and framing it out would be hiding the result.');
console.log('');
for (const r of rows) console.log(`  wrote ${r.path}`);

// --- assertions -----------------------------------------------------------
// Nothing here judges what the picture LOOKS like; that is the point of the
// file, and pinning an emergent appearance to a number would impose it. What it
// can check is that there is a picture, and that the experiment actually ran.
let bad = 0;
for (const r of rows) {
  if (r.st.organs <= 0 || r.st.tris <= 0) {
    console.log(` FAIL  ${r.agent}: nothing was drawn (organs ${r.st.organs}, tris ${r.st.tris})`);
    bad++;
  }
  if (r.agent !== '(control)' && r.inoc && !r.inoc.ok) {
    console.log(` FAIL  ${r.agent}: inoculate() returned nothing — the agent never landed.` +
      ` ${r.inoc.liveAxes}/${r.inoc.totalAxes} axes still had a growing point;` +
      ` inoculate EARLIER with BEFORE=.`);
    bad++;
  }
}
if (stageIdx(ctl.st.stage) >= stageIdx('senescing')) {
  console.log(` FAIL  the control is already '${ctl.st.stage}' — this is a picture of a dying`+
    ` plant, and foliage read off it means nothing. Lower STOP_AT.`);
  bad++;
}
if (errs.length) {
  console.log('\n  --- console errors ---\n  ' + errs.slice(0, 8).join('\n  '));
  bad += errs.length;
}
console.log('');
if (bad) { console.log(`${bad} PROBLEM(S)\n`); process.exit(1); }
console.log('pictures written. NOW GO AND LOOK AT THEM — that is the entire point.\n');
