// Zero-normal probe — headless, no browser, no GPU.
//
// tools/flowers_vn.mjs convicted ONE cause of the one-frame black square:
// |vN| == 0 in the tri stream's fragment shader, which makes normalize(vN) a
// 0/0 NaN, which the two defocus gaussians spread into an axis-aligned
// rectangle, which mix()/aces()/pow() deliver to the screen as a black hole.
// It did not say whether the zero is IN THE BUFFER or made by interpolation.
//
// Those are different bugs with different fixes, and the difference is decided
// in Node: build the same bundle parity.test.mjs builds, capture the same
// specimens the page grows, and walk the tri stream's normals. A normal that
// is zero in the buffer is a capture bug. If every normal in the buffer is
// unit, then |vN| = 0 can only be barycentric cancellation — two vertices of
// one triangle carrying opposite normals, with the fragment landing where
// they cancel — and the fix has to be at the fragment, because the vertices
// are individually fine.
//
//   node tools/flowers_zeron.mjs
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
  code += strip(readFileSync(join(here, '..', 'flowers', f), 'utf8')) + '\n';
code += '\nreturn { App, Buffers, FlowerBuffers, flEnv, flDrawSpecimen, SPECIES, setView, v3 };\n';
const M = new Function(code)();

const names = Object.keys(M.SPECIES);
let totTri = 0, totZero = 0, totNonUnit = 0, totOpp = 0, totCancel = 0;
let totVerts = 0, gapLo = 9;
const worst = [];
for (const name of names) {
  const seed = 1337, steps = 2200;
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, name, seed);
  for (let i = 0; i < steps; i++) S.plant.step(1);
  M.setView(env.cam.eye, 0.004, 0);
  const B = new M.FlowerBuffers();
  M.flDrawSpecimen(env, B, S);

  // both streams share FL_GUARD, so both are walked. Layouts from 10_capture:
  // tri is pos3 nrm3 col3 emis (10), petal is pos3 nrm3 col4 dd q u v dev lib (16).
  for (const [lbl, arr, cnt, ST] of [['tri', B.tri, B.triN, 10], ['pet', B.petb, B.petbN, 16]]) {
  const a = arr, n = cnt;
  let zero = 0, nonUnit = 0, opp = 0, cancel = 0, minL = 9, maxL = 0, minNZ = 9, verts = 0;
  // eslint-disable-next-line no-unused-vars
  for (let k = 0; k + ST * 3 <= n; k += ST * 3) {
    const nn = [];
    for (let v = 0; v < 3; v++) {
      const o = k + v * ST + 3;
      const L = Math.hypot(a[o], a[o + 1], a[o + 2]);
      nn.push([a[o], a[o + 1], a[o + 2], L]);
      verts++;
      if (L === 0) zero++;
      else { if (L < minNZ) minNZ = L; if (Math.abs(L - 1) > 1e-3) nonUnit++; }
      if (L < minL) minL = L;
      if (L > maxL) maxL = L;
    }
    // OPPOSED vertex normals in one triangle: the only way a convex
    // combination of unit vectors can reach zero length
    let worstDot = 1;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const A = nn[i], Bv = nn[j];
      if (A[3] < 1e-6 || Bv[3] < 1e-6) continue;
      const d = (A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2]) / (A[3] * Bv[3]);
      if (d < worstDot) worstDot = d;
    }
    if (worstDot < -0.99) opp++;
    // can a convex combination of the three actually hit zero? It can iff the
    // origin is inside their convex hull; a sufficient test for the pair case
    // is two opposed normals, which is what `opp` counts. The stricter test:
    // the three sum to something shorter than any one of them
    const sx = nn[0][0] + nn[1][0] + nn[2][0], sy = nn[0][1] + nn[1][1] + nn[2][1],
      sz = nn[0][2] + nn[1][2] + nn[2][2];
    if (Math.hypot(sx, sy, sz) < 0.05) cancel++;
  }
  totTri += n / (ST * 3); totZero += zero; totNonUnit += nonUnit; totOpp += opp; totCancel += cancel;
  totVerts += verts; if (minNZ < 9) gapLo = Math.min(gapLo, minNZ);
  worst.push({ name: name + ' [' + lbl + ']', tris: n / (ST * 3), zero, nonUnit, opp, cancel, verts,
    minNZ: +minNZ.toFixed(7), maxL: +maxL.toFixed(7),
    degen: lbl === 'tri' ? B.degen.tri : B.degen.pet });
  }
}

console.log('species / stream           verts    zeroN  nonUnit  opposed  cancelling  min nonzero|n|   max|n|  degen-dropped');
for (const w of worst)
  console.log(`${w.name.padEnd(26)} ${String(w.verts).padStart(8)} ${String(w.zero).padStart(8)}` +
    ` ${String(w.nonUnit).padStart(8)} ${String(w.opp).padStart(8)} ${String(w.cancel).padStart(11)}` +
    ` ${String(w.minNZ).padStart(15)} ${String(w.maxL).padStart(8)} ${String(w.degen).padStart(14)}`);
console.log(`\nTOTAL  ${totTri} triangles / ${totVerts} vertices: ${totZero} with a ZERO normal ` +
  `(${(100 * totZero / totVerts).toFixed(2)}%), ${totNonUnit} non-unit,`);
console.log(`       the population is a GAP: nothing between 0 and ${gapLo.toFixed(7)}.`);
console.log(`       ${totOpp} carrying an OPPOSED pair (dot < -0.99), ${totCancel} whose three normals cancel.`);
console.log(totZero || totOpp
  ? 'A zero |vN| is REACHABLE from this buffer.'
  : 'Every normal in the buffer is unit and no triangle can interpolate to zero:\n' +
    'a zero |vN| would have to come from the rasteriser, not the capture.');
