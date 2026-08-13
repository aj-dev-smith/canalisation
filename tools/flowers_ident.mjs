// IS EVERY FLOWER IN THE FIELD THE HERO'S? — and did making them their own
// change the page that only ever had one plant?
//
//   node tools/flowers_ident.mjs 'garden=7&seed=21&ff=3000&speed=0&shot=bank'
//   node tools/flowers_ident.mjs 'seed=21&ff=2600&focus=flower&speed=0' flowers_base.html
//
// Two things, because the change has two halves and they fail differently.
//
// 1. THE PIGMENT TABLE. The bullseye threshold and the baked spot atlas are
//    per-specimen quantities that used to be scene-wide uniforms — one draw
//    from the HERO's seed applied to every petal in the field. They are now a
//    material per member, so the check is that N members carry N DISTINCT
//    numbers and N distinct atlases. A digest of each atlas is printed beside
//    each threshold: identical digests are the old bug, and the tool exits
//    non-zero on them. (A member with no flowers yet has an all-zero atlas and
//    is reported as `empty` rather than counted as a collision — an atlas
//    fills when that specimen's petals mature, not when it germinates.)
//
// 2. THE SOLO PAGE. Splitting the petal draw into one group per member must
//    be a no-op at N = 1. Given a second html file, the tool loads both with
//    the same query and compares the two frames pixel for pixel: mean absolute
//    delta over RGB, and the fraction of pixels that differ at all. This is
//    the only claim here a number can settle rather than an argument.
//
// ⚠ AND THE FRAME HAS TO COME OUT OF THE COMPOSITOR. The first version read
// the WebGL canvas back with drawImage, which without preserveDrawingBuffer
// hands you an already-cleared buffer: it reported `mean 0.0000 — IDENTICAL`
// for the solo page (right answer, no evidence), for a garden of seven (wrong
// answer), and for a build against itself. It screenshots now, and refuses a
// frame whose mean pixel is black — the same guard tools/flowers_shot.mjs
// carries, for the same reason: agreement between two blank pictures is the
// easiest result in this repo to get by accident.
//
// ⚠ THE CAMERA HAS TO BE PINNED FOR (2) TO MEAN ANYTHING. The director drifts
// perpetually and OrbitControls autoRotates, so two runs of the SAME build
// disagree by whatever wall clock elapsed between them. The tool turns
// autoRotate off, polls the eye until it stops moving, and — read this before
// trusting a delta — the recommended query carries `focus=flower&speed=0`,
// where 45_director.js documents dir.el as staying 0 and the drift term as
// exactly zero. Run it A-against-A first: a nonzero self-delta means the pin
// did not hold and any A-against-B number is noise.
//
// GL backend as tools/flowers_shot.mjs: darwin gets ANGLE-on-Metal headed,
// because swiftshader writes a black frame while reporting full counts.
import { chromium } from 'playwright';
import { existsSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';
import { platform } from 'os';

const [, , query = 'garden=7&seed=21&ff=3000&speed=0', pageA = 'flowers.html', pageB = null]
  = process.argv;
const url = (f) => pathToFileURL(resolve(f)).href + (query ? '?' + query : '');
for (const f of [pageA, pageB]) if (f && !existsSync(f)) {
  console.error(`no such file: ${f}`); process.exit(1);
}

const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

// One page load: drain the fast-forward, pin the camera, read the pigment
// table, and hand back the raw RGBA of the canvas.
let shotN = 0;
async function shoot(file) {
  const pg = await b.newPage({ viewport: { width: 900, height: 620 }, deviceScaleFactor: 2 });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(url(file));
  await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function',
    null, { timeout: 30000 });

  const deadline = Date.now() + 180000;
  for (;;) {
    const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
    if (!hud.includes('(fast-forward')) break;
    if (Date.now() > deadline) { console.error('TIMEOUT draining ff'); await b.close(); process.exit(1); }
    await pg.waitForTimeout(500);
  }

  // PIN THE CLOCK TOO. FlowerScene.render(t) takes wall time straight into
  // uT, which drives the sky's glow breath, the ground pool's breath and the
  // film grain's hash — so two runs of the SAME build at different wall clocks
  // disagree over 97% of the frame by a mean of 12/255, which is four times
  // anything this change does. Measured, not assumed: that was the first
  // reading this tool produced once it was looking at real pixels.
  await pg.evaluate(() => {
    const sc = window.__fl.scene, f = sc.render.bind(sc);
    sc.render = () => f(1e6);      // any fixed instant; the grain is a hash of it
  });
  // pin: no autoRotate, then poll the EYE (not dist/target — autoRotate moves
  // azimuth only, which is exactly the axis a dist-based settle cannot see)
  await pg.evaluate(() => { window.__fl.scene.controls.autoRotate = false; });
  // EXACT equality, not a tolerance: the framer eases geometrically and the
  // depth-of-field range eases with it, so "moving by less than 1e-4" leaves a
  // residue you can see — 0.141% of the frame at a mean of 0.0008/255, which
  // is a floor a whisper-level pigment change could hide under. Held to zero
  // the same build against itself is bit-identical.
  let prev = null, stable = 0, move = Infinity;
  const until = Date.now() + 45000;
  while (Date.now() < until && stable < 2) {
    await pg.waitForTimeout(500);
    const e = await pg.evaluate(() => window.__fl.scene.camera.position.toArray());
    if (prev) {
      move = Math.hypot(e[0] - prev[0], e[1] - prev[1], e[2] - prev[2]);
      stable = move === 0 ? stable + 1 : 0;
    }
    prev = e;
  }
  const pinned = move === 0;

  // NOPOL=1 empties the pollen population before the frame. The grains are the
  // one thing on this page that is NOT reproducible across two loads at the
  // same step: shedding draws off a seeded stream but a grain also DIES on
  // age, so how the fast-forward happened to be chunked into frames decides
  // which grains survive. Measured: a solo Ember Creeper at seed 4207 carries
  // two motes, and they are the whole of a 0.0065/255 delta between two builds
  // whose buffers, uniforms and camera agree exactly — 650 px of 2.23M, and
  // the diff map is black everywhere on the plant. Not caused by this change
  // and not fixable from here; excluded so the plant can be compared alone.
  if (process.env.NOPOL) await pg.evaluate(() => { window.__fl.pollen.n = 0; });

  // the pigment table, straight off the materials
  const pig = await pg.evaluate(() => {
    const sc = window.__fl.scene;
    const mats = sc._petMats || [];
    return mats.map((m, i) => {
      if (!m) return null;
      const d = m._spotData;
      // a cheap order-sensitive digest: sum, and a positional weighting so two
      // atlases with the same histogram but different arrangement differ
      let s = 0, w = 0, nz = 0;
      for (let k = 0; k < d.length; k++) { s += d[k]; w += d[k] * (k % 977); if (d[k] > 0) nz++; }
      return { mem: i, bull: m.uniforms.uBull.value, sum: s, wsum: w, nz };
    }).filter(Boolean);
  });

  // THE FRAME COMES OUT AS A SCREENSHOT, NOT OFF THE CANVAS. drawImage on a
  // WebGL canvas without preserveDrawingBuffer reads an already-cleared back
  // buffer, so the first version of this tool compared two empty ImageDatas
  // and reported `mean 0.0000 — IDENTICAL` for the solo page, for a garden of
  // seven, and for a build against itself. Three "identical"s in a row with a
  // max delta of exactly 0.0 is what a broken instrument looks like, not a
  // clean result. Playwright's screenshot goes through the compositor and is
  // the same path tools/flowers_shot.mjs trusts.
  // One shot, written from the buffer — a garden of seven at 1800x1240 takes
  // longer than the 30s default to composite, and taking it twice timed out.
  const png = await pg.screenshot({ timeout: 120000 });
  // PNG=<prefix> keeps them: a delta is a number and this change is a LOOK,
  // and the two shots are matched on one camera so the eye compares flowers
  // rather than framings.
  if (process.env.PNG) writeFileSync(`${process.env.PNG}_${shotN++}.png`, png);
  await pg.close();
  return { pig, png, pinned, errs };
}

// Decode two PNGs and compare them, in a blank page — Node has no image
// decoder here and the repo has no PNG dependency (tools/flowers_shot.mjs
// makes the same choice for the same reason).
async function comparePng(p, q) {
  const pg = await b.newPage();
  const r = await pg.evaluate(async ([a, c]) => {
    const load = async (b64) => {
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
      const bm = await createImageBitmap(blob);
      const cv = document.createElement('canvas');
      cv.width = bm.width; cv.height = bm.height;
      cv.getContext('2d').drawImage(bm, 0, 0);
      return { w: bm.width, h: bm.height,
        d: cv.getContext('2d').getImageData(0, 0, bm.width, bm.height).data };
    };
    const A = await load(a), B = await load(c);
    if (A.w !== B.w || A.h !== B.h) return { sizeMismatch: true, aw: A.w, ah: A.h, bw: B.w, bh: B.h };
    let sum = 0, mx = 0, diff = 0, n = 0, ink = 0;
    for (let k = 0; k < A.d.length; k += 4) {
      let e = 0;
      for (let j = 0; j < 3; j++) e += Math.abs(A.d[k + j] - B.d[k + j]);
      e /= 3;
      sum += e; n++; if (e > mx) mx = e; if (e > 0) diff++;
      ink += (A.d[k] + A.d[k + 1] + A.d[k + 2]) / 3;
    }
    // AND WHERE. A mean delta says how much and never where, and "a few
    // hundred pixels at max 131" reads as a bug or as antialiasing depending
    // entirely on whether they are scattered along edges or sitting in a
    // patch. The map is written 16x amplified so a 1/255 difference is visible.
    const cv = document.createElement('canvas');
    cv.width = A.w; cv.height = A.h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(A.w, A.h);
    for (let k = 0; k < A.d.length; k += 4) {
      let e = 0;
      for (let j = 0; j < 3; j++) e += Math.abs(A.d[k + j] - B.d[k + j]);
      const v = Math.min(255, (e / 3) * 16);
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { w: A.w, h: A.h, mean: sum / n, max: mx, diffFrac: diff / n, n,
      meanPix: ink / n, map: cv.toDataURL('image/png') };
  }, [p.toString('base64'), q.toString('base64')]);
  await pg.close();
  if (process.env.PNG && r.map)
    writeFileSync(`${process.env.PNG}_diff.png`, Buffer.from(r.map.split(',')[1], 'base64'));
  return r;
}

const A = await shoot(pageA);
console.log(`${pageA}  camera ${A.pinned ? 'pinned' : '⚠ STILL MOVING at cap'}`);
if (A.errs.length) console.log('  page errors:', A.errs.slice(0, 3).join(' | '));

// --- 1. the pigment table ---
console.log('\nper-member pigment (bullseye threshold, spot-atlas digest)');
const seen = new Map();
let collide = 0, empty = 0;
for (const p of A.pig) {
  const key = `${p.bull.toFixed(6)}|${p.sum.toFixed(3)}|${p.wsum.toFixed(3)}`;
  const dup = seen.has(key);
  if (p.nz === 0) empty++;
  else if (dup) collide++;
  if (!dup) seen.set(key, p.mem);
  console.log(`  m${String(p.mem).padStart(2)}  bull ${p.bull.toFixed(4)}  ` +
    `atlas sum ${p.sum.toFixed(1).padStart(8)}  w ${p.wsum.toFixed(0).padStart(9)}  ` +
    `filled ${String(p.nz).padStart(4)}/${3 * 32 * 32}` +
    (p.nz === 0 ? '  (empty — no mature petals yet)' : dup ? `  ⚠ IDENTICAL to m${seen.get(key)}` : ''));
}
const live = A.pig.length - empty;
console.log(`  ${live} member${live === 1 ? '' : 's'} with a filled atlas, ` +
  `${collide} collision${collide === 1 ? '' : 's'}`);
const bulls = A.pig.map(p => p.bull);
console.log(`  bullseye spread: ${Math.min(...bulls).toFixed(4)} .. ${Math.max(...bulls).toFixed(4)}` +
  `  (${new Set(bulls.map(v => v.toFixed(6))).size} distinct of ${bulls.length})`);

// --- 2. the solo page ---
let fails = collide > 0 ? 1 : 0;
if (collide > 0) console.error(`\nFAIL: ${collide} member(s) share a pigment program`);

if (pageB) {
  const Bp = await shoot(pageB);
  console.log(`\n${pageB}  camera ${Bp.pinned ? 'pinned' : '⚠ STILL MOVING at cap'}`);
  const r = await comparePng(A.png, Bp.png);
  if (r.sizeMismatch) {
    console.error(`FAIL: frame sizes differ ${r.aw}x${r.ah} vs ${r.bw}x${r.bh}`); fails++;
  } else {
    console.log(`\npixel delta: mean ${r.mean.toFixed(4)}/255  max ${r.max.toFixed(1)}  ` +
      `differing ${(100 * r.diffFrac).toFixed(3)}% of ${r.n} px  (${r.w}x${r.h})`);
    // the same black-frame guard tools/flowers_shot.mjs carries: two empty
    // frames agree perfectly, which is how the first version of this file
    // "proved" its own claim
    console.log(`  mean pixel ${r.meanPix.toFixed(2)}/255` +
      (r.meanPix < 3 ? '  ⚠ BLACK FRAME — the delta above means nothing' : ''));
    if (r.meanPix < 3) fails++;
    else if (!A.pinned || !Bp.pinned) console.log('  ⚠ a camera did not pin — this number is noise');
    else if (r.mean === 0) console.log('  IDENTICAL');
  }
}

await b.close();
console.log(fails ? '\nFAIL' : '\nok');
process.exit(fails ? 1 : 0);
