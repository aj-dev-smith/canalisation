// Does the flower piece draw the same plant the shipped page draws?
//
// flDrawSpecimen claims to be the shipped organ loop plus bookkeeping. That is
// a claim, and the assert-the-claim rule exists because the last "obviously
// equivalent" rewrite in this repo had its sign backwards. So: grow one
// specimen, draw it twice — shipped drawSpecimen into shipped Buffers, and
// flDrawSpecimen into FlowerBuffers — and reconcile the streams float for
// float where layouts allow, count for count where they moved.
//
//   tri:   shipped == captured + petal-stream verts (petals moved streams)
//   line:  shipped ribbons (42 floats) == captured segments (12 floats)
//   pt:    equal
//
// The floral mesh refinement is disabled for the comparison (that difference
// is deliberate and visible; this test is about everything else).
//
// Runs in plain Node by building the same bundle flowers/build.js builds,
// minus the vendor and the two DOM files (30_scene, 40_boot), and evaluating
// it with `new Function` — the same trick build.js uses as its parse gate.

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const strip = (s) => s
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s+/gm, '');

let code = '';
const SRC_SKIP = new Set(['60_render.js', '80_main.js']);
for (const f of readdirSync(join(root, 'src')).filter(f => f.endsWith('.js') && !SRC_SKIP.has(f)).sort())
  code += strip(readFileSync(join(root, 'src', f), 'utf8')) + '\n';
for (const f of ['10_capture.js', '12_form.js', '15_petal.js', '17_spots.js', '20_draw.js'])
  code += strip(readFileSync(join(here, f), 'utf8')) + '\n';
code += '\nreturn { App, Buffers, FlowerBuffers, flEnv, flDrawSpecimen, SPECIES, setView, v3 };\n';

const M = new Function(code)();

let fails = 0, checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (!cond) { fails++; console.error('  FAIL', label, detail || ''); }
  else console.log('  ok  ', label, detail || '');
}

for (const name of ['Ember Creeper', 'Nightglass Parasol']) {
  const seed = 21, steps = 1400;
  console.log(`\n${name} seed ${seed} @ ${steps}`);
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, name, seed);
  for (let i = 0; i < steps; i++) S.plant.step(1);

  // shipped draw
  M.setView(env.cam.eye, 0.004, 0);
  const B0 = new M.Buffers();
  M.App.prototype.drawSpecimen.call(env, B0, S, null);

  // captured draw, floral refinement pinned to shipped resolution
  const env2 = M.flEnv();
  env2.bladeMesh = function (L, bl, detL, out) {
    return M.App.prototype.bladeMesh.call(this, L, bl, 0, out);
  };
  M.setView(env2.cam.eye, 0.004, 0);
  const B1 = new M.FlowerBuffers();
  M.flDrawSpecimen(env2, B1, S);

  // The capture now DROPS triangles with no area (10_capture.js): a blade's
  // parametrisation collapses to a point at the leaf base, so the shipped
  // emitter posts a column of them, and the rasteriser occasionally lights one
  // with garbage varyings — the one-frame flash. The reconciliation stays exact
  // rather than being loosened for it: shipped == captured + petal + dropped.
  const dropped = (B1.degen.tri * 3) * 10 + (B1.degen.pet * 3) * 10;
  ok(B0.triN === B1.triN + (B1.petbN / 16) * 10 + dropped, 'tri floats reconcile',
    `shipped ${B0.triN} == captured ${B1.triN} + petal ${(B1.petbN / 16) * 10} + no-area ${dropped}`);
  ok(B1.degen.tri + B1.degen.pet > 0, 'no-area triangles found and dropped',
    `tri ${B1.degen.tri} + pet ${B1.degen.pet} of ` +
    `${(B0.triN / 30) | 0} (${(100 * (B1.degen.tri + B1.degen.pet) / (B0.triN / 30)).toFixed(1)}%)`);
  ok(B1.triN % 30 === 0 && B1.petbN % 48 === 0, 'streams are whole triangles',
    `tri ${B1.triN} % 30, pet ${B1.petbN} % 48`);
  ok(B0.lineN / 42 === B1.segN / 12, 'ribbon count',
    `shipped ${B0.lineN / 42} == captured ${B1.segN / 12}`);
  ok(B0.ptN === B1.ptN, 'pt floats', `${B0.ptN} == ${B1.ptN}`);
  ok(!B0.saturated(), 'shipped buffers unsaturated');

  // bracketing: every stream byte belongs to exactly one organ, in order
  let last = { tri: 0, seg: 0, pt: 0, pet: 0 }, mono = true;
  for (const o of B1.organs) {
    if (o.tri0 < last.tri || o.seg0 < last.seg || o.pt0 < last.pt || o.pet0 < last.pet) mono = false;
    if (o.tri1 < o.tri0 || o.seg1 < o.seg0 || o.pt1 < o.pt0 || o.pet1 < o.pet0) mono = false;
    last = { tri: o.tri1, seg: o.seg1, pt: o.pt1, pet: o.pet1 };
  }
  ok(mono, 'organ ranges monotone and well-formed', `${B1.organs.length} organs`);
  ok(last.tri === B1.triN && last.seg === B1.segN && last.pet === B1.petbN,
    'ranges cover the streams', `tri ${last.tri}/${B1.triN} seg ${last.seg}/${B1.segN} pet ${last.pet}/${B1.petbN}`);

  const petals = B1.organs.filter(o => o.meta.kind === 'petal');
  ok(petals.length > 0, 'petals present and tagged', `${petals.length}`);
  ok(petals.every(o => o.pet1 > o.pet0), 'every petal has petal-stream geometry');
  ok(petals.every(o => o.meta.q !== undefined && o.meta.q >= 0 && o.meta.q < 1), 'petal q recorded');

  const fx = B1.organs.findIndex(o => o.meta.kind === 'petal');
  const bb = B1.floralBounds(B1.organs[fx].meta.ax);
  ok(!!bb && bb.r > 0.05 && isFinite(bb.r), 'floralBounds returns a real sphere',
    bb ? `r ${bb.r.toFixed(2)}` : 'null');
}

console.log(`\n${checks} checks, ${fails} failures`);
if (fails) process.exit(1);
