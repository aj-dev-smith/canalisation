// THE BRIDGE PAIR, AS A GLB — the plant into three.js, in metres.
//
//   node tools/gltf_export.mjs export/cathedral_fern_21_natural
//   node tools/gltf_export.mjs export/cathedral_fern_21_natural.json out.glb
//   RADIAL=8 LINES=1 VEIN_MIN_W=0.004 node tools/gltf_export.mjs export/…
//
// `tools/blender_export.mjs` grows a specimen and writes a documented pair —
// `<out>.json` (a header) and `<out>.bin` (a float32 payload). THAT PAIR IS THE
// INTERFACE. This file re-grows nothing and re-draws nothing; it reads the
// capture and re-expresses it as binary glTF 2.0. If the plant looks wrong in a
// three.js scene, the bug is in the bridge or in here, and the two are cleanly
// separable — which is the whole reason the pair exists as a file rather than
// as a function call.
//
// THREE THINGS THIS CONVERSION HAS TO DECIDE, and they are the only decisions
// in the file:
//
// 1. METRES. glTF's unit is the metre and three.js believes it — lights fall
//    off, cameras have focal lengths, physics has gravity. `header.unitM` is the
//    ruler the wind and the falling blade fixed months ago (0.0625 m/unit), so
//    every position here is multiplied by it and a Cathedral Fern comes out at
//    ~1.4 m instead of ~22 of nothing. THE VEIN RADII ARE SCALED BY THE SAME
//    FACTOR — a tube whose radius is in world units on a body that is in metres
//    is 16x too fat, and it reads as "the veins look like cables" rather than as
//    a unit bug.
//
// 2. A VEIN IS A TUBE, NOT A RIBBON. The browser draws a vein as a
//    camera-facing ribbon because that is how a rasteriser makes a hairline read
//    as a thickness; `blender_export.mjs` throws the `side` away for exactly
//    that reason and hands Blender a curve with a radius per point. glTF has no
//    curve primitive, so the sweep happens HERE: consecutive segments are
//    chained into strands and each strand is swept as an indexed tube with
//    `RADIAL` sides. The view-dependence was in the rasteriser, never in the
//    vein, so this is the same lossless swap the Blender bridge makes — just
//    resolved to triangles instead of deferred to Cycles.
//
// 3. THE WIDTHS ARE ALREADY FLOORED, AND THAT IS DELIBERATE. `header.wFloor` is
//    the shipped `MINW` — a *pixel* floor in the browser — and the Blender
//    bridge keeps it after establishing that dropping it draws the median vein
//    at no scale at all and a leaf comes out a flat disc. Do not "fix" it here.
//    `VEIN_MIN_W` is the opposite lever: it DROPS thin segments entirely rather
//    than thinning them, which is the honest way to buy triangles back for a
//    far-LOD. Default 0, i.e. every vein the chemistry grew.
//
// Env knobs:
//   RADIAL       sides per tube ring (default 5). 3 is a prism, 8 is smooth.
//   VEIN_MIN_W   drop segments whose max half-width is under this, world units
//                (default 0 = keep all). The LOD lever.
//   LINES=1      ALSO emit the strand centrelines as a mode-1 LINES node
//                "veins-lines" — a far-LOD that costs two vertices a segment
//                against the tube's 2 x RADIAL, for a consumer to swap in.
//
// No dependencies, `node:fs` only: the GLB writer is a hundred lines at the
// bottom of this file. A glTF exporter is a buffer, a list of bufferViews and a
// list of accessors, and reaching for a package to do that would put a
// dependency in a repo that has none.

import { readFileSync, writeFileSync } from 'node:fs';

// --- arguments -------------------------------------------------------------
const arg = process.argv[2];
if (!arg) {
  console.error(`usage: node tools/gltf_export.mjs <export-basename-or-json-path> [out.glb]

  node tools/blender_export.mjs 'Cathedral Fern' 21 2500   # writes the pair
  node tools/gltf_export.mjs export/cathedral_fern_21_natural`);
  process.exit(1);
}
const base = arg.replace(/\.(json|bin|glb)$/i, '');
const out = process.argv[3] || `${base}.glb`;

const RADIAL = Math.max(3, (+(process.env.RADIAL || 5)) | 0);
const VEIN_MIN_W = +(process.env.VEIN_MIN_W || 0);
const LINES = process.env.LINES === '1';

// Chaining tolerance. The bridge emits a strand's segments consecutively and
// segment i+1's `a` is segment i's `b` bit for bit, so this is a float32
// equality test with slack rather than a search radius — widening it would
// start welding genuinely separate strands whose ends happen to be near.
const CHAIN_EPS2 = 1e-6 * 1e-6;
// A ring of radius zero is a degenerate fan of zero-area triangles, which some
// consumers turn into NaN normals. The shipped width floor means this should
// never bite; it is here so that a `WFLOOR=0` sweep still produces a valid file.
const W_EPS = 1e-6;

const die = (msg) => { console.error(`  !! ${msg}`); process.exit(1); };

// --- read the pair ---------------------------------------------------------
let header, raw;
try {
  header = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
  raw = readFileSync(`${base}.bin`);
} catch (e) {
  die(`could not read the pair '${base}.json' + '${base}.bin'\n     ${e.message}`);
}

// THE FORMAT STRING IS THE CONTRACT. A capture written by a future bridge with
// a different stride would be read here as garbage that still looks like a
// plant — the worst failure mode this pipeline has, and the one the version
// suffix on the format name exists to prevent.
if (header.format !== 'canalisation-specimen-1') {
  die(`not a canalisation specimen capture: format is ${JSON.stringify(header.format)}`);
}
const unitM = header.unitM;
if (!(unitM > 0)) die(`header has no usable unitM (got ${header.unitM})`);

// READ THE SECTIONS BY THE HEADER'S BYTE OFFSETS, never by assuming the order
// they happen to be written in. The bridge concatenates tri/seg/pt today; the
// header is what says so, and a consumer that hardcodes the concatenation order
// is a consumer that breaks silently the first time a section is added.
function section(name, stride) {
  const s = header.sections && header.sections[name];
  if (!s) return { a: new Float32Array(0), n: 0 };
  if (s.stride !== stride) die(`section '${name}' has stride ${s.stride}, expected ${stride} — the bridge format has changed`);
  if (!s.floats) return { a: new Float32Array(0), n: 0 };
  if (s.offset % 4) die(`section '${name}' starts at byte ${s.offset}, which is not float32-aligned`);
  const end = s.offset + s.floats * 4;
  if (end > raw.length) die(`section '${name}' runs to byte ${end} but '${base}.bin' is ${raw.length} bytes — truncated capture`);
  // `.slice` on the underlying ArrayBuffer copies, which is what guarantees the
  // Float32Array view is aligned however Node happened to pool the file read.
  return {
    a: new Float32Array(raw.buffer.slice(raw.byteOffset + s.offset, raw.byteOffset + end)),
    n: s.floats / stride,
  };
}

const TRI = section('tri', 10);   // pos3 nrm3 col3 emis1, a non-indexed soup
const SEG = section('seg', 12);   // a3 b3 w0 w1 col3 emis1
const PT = section('pt', 7);      // pos3 col3 size1

if (TRI.n % 3) console.error(`  !! tri section holds ${TRI.n} vertices, not a multiple of 3 — the last partial triangle is dropped`);
const triVerts = TRI.n - (TRI.n % 3);

// --- the glTF document, and one binary buffer under it ---------------------
const gltf = {
  asset: { version: '2.0', generator: 'canalisation gltf_export' },
  scene: 0, scenes: [], nodes: [], meshes: [], materials: [],
  accessors: [], bufferViews: [], buffers: [],
};
const binParts = [];
let binLen = 0;

// EVERY bufferView 4-BYTE ALIGNED. float32 data lands there for free; a
// 16-bit index buffer with an odd count does not, and the resulting file is
// invalid in a way that only some loaders complain about.
function addView(buf, target) {
  const pad = (4 - (binLen % 4)) % 4;
  if (pad) { binParts.push(Buffer.alloc(pad)); binLen += pad; }
  const i = gltf.bufferViews.length;
  const bv = { buffer: 0, byteOffset: binLen, byteLength: buf.length };
  if (target) bv.target = target;
  gltf.bufferViews.push(bv);
  binParts.push(buf);
  binLen += buf.length;
  return i;
}
const bufOf = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength);
function addAcc(a) { gltf.accessors.push(a); return gltf.accessors.length - 1; }

// A float attribute. `minmax` computes the per-component bounds glTF REQUIRES
// on POSITION — a loader uses them for frustum culling and for the bounding
// sphere three.js hands to a raycaster, and omitting them is invalid rather
// than merely lax.
function attrAcc(arr, comps, minmax) {
  const count = arr.length / comps;
  const acc = { bufferView: addView(bufOf(arr), 34962), componentType: 5126, count, type: ['', 'SCALAR', 'VEC2', 'VEC3', 'VEC4'][comps] };
  if (minmax) {
    const mn = new Array(comps).fill(Infinity), mx = new Array(comps).fill(-Infinity);
    for (let i = 0; i < arr.length; i += comps) {
      for (let c = 0; c < comps; c++) {
        const v = arr[i + c];
        if (v < mn[c]) mn[c] = v;
        if (v > mx[c]) mx[c] = v;
      }
    }
    if (!count) { mn.fill(0); mx.fill(0); }
    acc.min = mn; acc.max = mx;
  }
  return addAcc(acc);
}
function idxAcc(arr) {
  // componentType chosen PER MESH by its own vertex count: a 16-bit index
  // buffer is half the bytes and every consumer prefers it, but one vertex over
  // 65535 and it silently wraps to geometry that looks like a hairball.
  const ct = arr.BYTES_PER_ELEMENT === 2 ? 5123 : 5125;
  return addAcc({ bufferView: addView(bufOf(arr), 34963), componentType: ct, count: arr.length, type: 'SCALAR' });
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const childNodes = [];
function addNode(name, mesh) {
  gltf.nodes.push({ name, mesh });
  childNodes.push(gltf.nodes.length - 1);
}

// --- lamina ----------------------------------------------------------------
//
// The triangle soup comes across as a soup. It is NOT indexed here on purpose:
// the capture's vertices carry per-vertex normals and colours that a welding
// pass would have to average, and averaging them would smooth exactly the
// creases and the per-organ colour breaks that `drawSpecimen` put there.
// De-duplicating a soup is a mesh operation, and this file is a transcoder.
let laminaTris = 0;
if (triVerts) {
  const pos = new Float32Array(triVerts * 3);
  const nrm = new Float32Array(triVerts * 3);
  const col = new Float32Array(triVerts * 4);
  for (let v = 0; v < triVerts; v++) {
    const s = v * 10;
    pos[v * 3] = TRI.a[s] * unitM; pos[v * 3 + 1] = TRI.a[s + 1] * unitM; pos[v * 3 + 2] = TRI.a[s + 2] * unitM;
    nrm[v * 3] = TRI.a[s + 3]; nrm[v * 3 + 1] = TRI.a[s + 4]; nrm[v * 3 + 2] = TRI.a[s + 5];
    // ALPHA IS THE EMISSIVE WEIGHT, not an opacity. The renderer's glow term is
    // a per-vertex scalar with nowhere else to go in a glTF vertex format, and
    // COLOR_0's fourth channel is the one slot every loader already reads. A
    // consumer that treats it as opacity gets a plausible picture by accident;
    // one that feeds it to an emissive term gets the piece.
    col[v * 4] = TRI.a[s + 6]; col[v * 4 + 1] = TRI.a[s + 7]; col[v * 4 + 2] = TRI.a[s + 8];
    col[v * 4 + 3] = clamp01(TRI.a[s + 9]);
  }
  gltf.materials.push({
    name: 'lamina',
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.9 },
    doubleSided: true,
  });
  gltf.meshes.push({
    name: 'lamina',
    primitives: [{
      mode: 4,
      attributes: { POSITION: attrAcc(pos, 3, true), NORMAL: attrAcc(nrm, 3, false), COLOR_0: attrAcc(col, 4, false) },
      material: gltf.materials.length - 1,
    }],
  });
  addNode('lamina', gltf.meshes.length - 1);
  laminaTris = triVerts / 3;
}

// --- veins: segments -> strands -------------------------------------------
//
// The bridge emits a strand's segments consecutively, so a strand is a
// CONTIGUOUS RUN in buffer order and the chaining is a scan rather than a
// search. That is worth stating because it is the reason this is O(n) on a
// conifer's 167k segments instead of a spatial hash.
let segDropped = 0;
const keep = new Int32Array(SEG.n);
let nk = 0;
for (let i = 0; i < SEG.n; i++) {
  const s = i * 12;
  if (Math.max(SEG.a[s + 6], SEG.a[s + 7]) < VEIN_MIN_W) { segDropped++; continue; }
  keep[nk++] = i;
}

// Runs of chained segments. Note the test is applied to the KEPT list, so
// dropping a middle segment breaks its strand in two rather than welding across
// the hole — which is what you want from an LOD lever.
const runs = [];
if (nk) {
  let s0 = 0;
  for (let k = 1; k < nk; k++) {
    const p = keep[k - 1] * 12, c = keep[k] * 12;
    const dx = SEG.a[p + 3] - SEG.a[c], dy = SEG.a[p + 4] - SEG.a[c + 1], dz = SEG.a[p + 5] - SEG.a[c + 2];
    if (dx * dx + dy * dy + dz * dz >= CHAIN_EPS2) { runs.push([s0, k]); s0 = k; }
  }
  runs.push([s0, nk]);
}

// A STRAND WITH NO LENGTH HAS NO TANGENT, so it cannot be swept — the frame
// construction divides by a length that is zero and every ring comes out NaN,
// which propagates into the POSITION accessor's min/max and poisons the whole
// file's bounds. Counted rather than silent: if this number is ever large,
// something upstream is emitting ribbons of zero extent and that is the bug.
const live = [];
let degenerate = 0, maxRun = 0, tubeVerts = 0, tubeTris = 0, strandPts = 0, sweptSeg = 0;
for (const r of runs) {
  let len2 = 0;
  for (let k = r[0]; k < r[1]; k++) {
    const s = keep[k] * 12;
    const dx = SEG.a[s + 3] - SEG.a[s], dy = SEG.a[s + 4] - SEG.a[s + 1], dz = SEG.a[s + 5] - SEG.a[s + 2];
    len2 += dx * dx + dy * dy + dz * dz;
  }
  if (len2 < 1e-18) { degenerate++; continue; }
  const np = (r[1] - r[0]) + 1;
  live.push(r);
  sweptSeg += np - 1;
  if (np > maxRun) maxRun = np;
  strandPts += np;
  tubeVerts += np * RADIAL;
  tubeTris += (np - 1) * RADIAL * 2;
}

if (live.length) {
  const pos = new Float32Array(tubeVerts * 3);
  const nrm = new Float32Array(tubeVerts * 3);
  const col = new Float32Array(tubeVerts * 4);
  const idx = tubeVerts > 65535 ? new Uint32Array(tubeTris * 3) : new Uint16Array(tubeTris * 3);
  // the strand centrelines, kept only for the LINES far-LOD
  const lpos = LINES ? new Float32Array(strandPts * 3) : null;
  const lcol = LINES ? new Float32Array(strandPts * 4) : null;
  const lidx = LINES ? ((strandPts > 65535 ? new Uint32Array((strandPts - live.length) * 2) : new Uint16Array((strandPts - live.length) * 2))) : null;

  // per-ring trig, computed once
  const cs = new Float32Array(RADIAL), sn = new Float32Array(RADIAL);
  for (let j = 0; j < RADIAL; j++) { const th = j / RADIAL * Math.PI * 2; cs[j] = Math.cos(th); sn[j] = Math.sin(th); }

  // scratch for the longest strand we will meet
  const P = new Float32Array(maxRun * 3), R = new Float32Array(maxRun), C = new Float32Array(maxRun * 4);
  const T = new Float32Array(maxRun * 3);

  let vo = 0, io = 0, lo = 0, lio = 0;
  for (const r of live) {
    const np = (r[1] - r[0]) + 1;
    // point 0 is the first segment's `a`; point i+1 is segment i's `b`. Radius
    // and colour follow the same rule, so a strand whose ribbons taper carries
    // the taper into the tube.
    {
      const s = keep[r[0]] * 12;
      P[0] = SEG.a[s] * unitM; P[1] = SEG.a[s + 1] * unitM; P[2] = SEG.a[s + 2] * unitM;
      R[0] = Math.max(SEG.a[s + 6], W_EPS) * unitM;
      C[0] = SEG.a[s + 8]; C[1] = SEG.a[s + 9]; C[2] = SEG.a[s + 10]; C[3] = clamp01(SEG.a[s + 11]);
    }
    for (let k = r[0]; k < r[1]; k++) {
      const s = keep[k] * 12, i = (k - r[0]) + 1;
      P[i * 3] = SEG.a[s + 3] * unitM; P[i * 3 + 1] = SEG.a[s + 4] * unitM; P[i * 3 + 2] = SEG.a[s + 5] * unitM;
      R[i] = Math.max(SEG.a[s + 7], W_EPS) * unitM;
      C[i * 4] = SEG.a[s + 8]; C[i * 4 + 1] = SEG.a[s + 9]; C[i * 4 + 2] = SEG.a[s + 10]; C[i * 4 + 3] = clamp01(SEG.a[s + 11]);
    }

    // TANGENTS BY CENTRAL DIFFERENCE, with the ends one-sided. A zero-length
    // interior step (two ribbons stacked on the same point, which the capture
    // does contain) leaves no direction, so it inherits the previous tangent
    // rather than producing a NaN ring.
    let px = 0, py = 1, pz = 0;
    for (let i = 0; i < np; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(np - 1, i + 1) * 3;
      let tx = P[i1] - P[i0], ty = P[i1 + 1] - P[i0 + 1], tz = P[i1 + 2] - P[i0 + 2];
      const L = Math.hypot(tx, ty, tz);
      if (L > 1e-12) { tx /= L; ty /= L; tz /= L; px = tx; py = ty; pz = tz; }
      else { tx = px; ty = py; tz = pz; }
      T[i * 3] = tx; T[i * 3 + 1] = ty; T[i * 3 + 2] = tz;
    }

    // A ROTATION-MINIMISING FRAME, propagated by projection. Picking a fresh
    // "up" per ring instead would twist the tube wherever the strand passes
    // near vertical, which on a stem is exactly where every strand goes.
    let nx, ny, nz;
    {
      const tx = T[0], ty = T[1], tz = T[2];
      const ax = Math.abs(tx), ay = Math.abs(ty), az = Math.abs(tz);
      // cross the tangent with whichever axis it is least parallel to
      let ux = 0, uy = 0, uz = 0;
      if (ax <= ay && ax <= az) ux = 1; else if (ay <= az) uy = 1; else uz = 1;
      nx = ty * uz - tz * uy; ny = tz * ux - tx * uz; nz = tx * uy - ty * ux;
      const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    }

    for (let i = 0; i < np; i++) {
      const tx = T[i * 3], ty = T[i * 3 + 1], tz = T[i * 3 + 2];
      // re-orthogonalise the carried normal against this ring's tangent
      const d = nx * tx + ny * ty + nz * tz;
      let ax2 = nx - d * tx, ay2 = ny - d * ty, az2 = nz - d * tz;
      let L = Math.hypot(ax2, ay2, az2);
      if (L < 1e-9) {
        // the strand doubled back exactly; any perpendicular will do
        const bx = Math.abs(tx) <= Math.abs(ty) && Math.abs(tx) <= Math.abs(tz) ? 1 : 0;
        const by = !bx && Math.abs(ty) <= Math.abs(tz) ? 1 : 0;
        const bz = !bx && !by ? 1 : 0;
        ax2 = ty * bz - tz * by; ay2 = tz * bx - tx * bz; az2 = tx * by - ty * bx;
        L = Math.hypot(ax2, ay2, az2) || 1;
      }
      nx = ax2 / L; ny = ay2 / L; nz = az2 / L;
      // binormal, so (N, B, T) is right-handed and the ring winds CCW seen from
      // outside — which is what makes `doubleSided: false` show the outside.
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
      const rad = R[i];
      const cr = C[i * 4], cg = C[i * 4 + 1], cb = C[i * 4 + 2], ca = C[i * 4 + 3];
      for (let j = 0; j < RADIAL; j++) {
        const c = cs[j], s = sn[j];
        const ox = nx * c + bx * s, oy = ny * c + by * s, oz = nz * c + bz * s;
        const o = (vo + i * RADIAL + j);
        pos[o * 3] = P[i * 3] + ox * rad; pos[o * 3 + 1] = P[i * 3 + 1] + oy * rad; pos[o * 3 + 2] = P[i * 3 + 2] + oz * rad;
        nrm[o * 3] = ox; nrm[o * 3 + 1] = oy; nrm[o * 3 + 2] = oz;
        col[o * 4] = cr; col[o * 4 + 1] = cg; col[o * 4 + 2] = cb; col[o * 4 + 3] = ca;
      }
      if (LINES) {
        const o = lo + i;
        lpos[o * 3] = P[i * 3]; lpos[o * 3 + 1] = P[i * 3 + 1]; lpos[o * 3 + 2] = P[i * 3 + 2];
        lcol[o * 4] = cr; lcol[o * 4 + 1] = cg; lcol[o * 4 + 2] = cb; lcol[o * 4 + 3] = ca;
        if (i) { lidx[lio++] = o - 1; lidx[lio++] = o; }
      }
    }
    for (let i = 0; i < np - 1; i++) {
      const b0 = vo + i * RADIAL, b1 = b0 + RADIAL;
      for (let j = 0; j < RADIAL; j++) {
        const j2 = (j + 1) % RADIAL;
        idx[io++] = b0 + j; idx[io++] = b0 + j2; idx[io++] = b1 + j2;
        idx[io++] = b0 + j; idx[io++] = b1 + j2; idx[io++] = b1 + j;
      }
    }
    vo += np * RADIAL;
    lo += np;
  }

  gltf.materials.push({
    name: 'veins',
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.7 },
    doubleSided: false,
  });
  const veinMat = gltf.materials.length - 1;
  gltf.meshes.push({
    name: 'veins',
    primitives: [{
      mode: 4,
      indices: idxAcc(idx),
      attributes: { POSITION: attrAcc(pos, 3, true), NORMAL: attrAcc(nrm, 3, false), COLOR_0: attrAcc(col, 4, false) },
      material: veinMat,
    }],
  });
  addNode('veins', gltf.meshes.length - 1);

  if (LINES) {
    gltf.meshes.push({
      name: 'veins-lines',
      primitives: [{
        mode: 1,
        indices: idxAcc(lidx),
        attributes: { POSITION: attrAcc(lpos, 3, true), COLOR_0: attrAcc(lcol, 4, false) },
        material: veinMat,
      }],
    });
    addNode('veins-lines', gltf.meshes.length - 1);
  }
}

// --- points ----------------------------------------------------------------
//
// `_SIZE` is a custom attribute, which glTF allows under the leading underscore
// and which no loader will do anything with by itself. It is here because the
// capture's point size IS data — it is what the renderer scales a meristem cell
// or a pollen point by — and dropping it would leave a consumer to invent one.
// Scaled to metres like everything else, so a shader can treat it as a world
// diameter rather than as a screen constant.
if (PT.n) {
  const pos = new Float32Array(PT.n * 3);
  const col = new Float32Array(PT.n * 4);
  const siz = new Float32Array(PT.n);
  for (let v = 0; v < PT.n; v++) {
    const s = v * 7;
    pos[v * 3] = PT.a[s] * unitM; pos[v * 3 + 1] = PT.a[s + 1] * unitM; pos[v * 3 + 2] = PT.a[s + 2] * unitM;
    col[v * 4] = PT.a[s + 3]; col[v * 4 + 1] = PT.a[s + 4]; col[v * 4 + 2] = PT.a[s + 5]; col[v * 4 + 3] = 1;
    siz[v] = PT.a[s + 6] * unitM;
  }
  gltf.meshes.push({
    name: 'points',
    primitives: [{
      mode: 0,
      attributes: { POSITION: attrAcc(pos, 3, true), COLOR_0: attrAcc(col, 4, false), _SIZE: attrAcc(siz, 1, false) },
    }],
  });
  addNode('points', gltf.meshes.length - 1);
}

// --- the scene -------------------------------------------------------------
//
// EVERYTHING THE HEADER KNEW THAT THE TRIANGLES DO NOT, carried on the scene's
// `extras`. The palette is the one that matters: a species' look is its palette
// and a three.js scene that picks its own background puts an Ember Creeper's
// warm near-black in a blue-grey room, which is the exact bug the Blender bridge
// wrote up. `bbox` is copied VERBATIM and is therefore in WORLD UNITS while the
// geometry is in metres — `unitM` is right beside it, and changing one of the
// two would make this key disagree with the header it claims to copy.
gltf.nodes.push({ name: 'specimen', children: childNodes });
const rootNode = gltf.nodes.length - 1;
gltf.scenes.push({
  name: 'specimen',
  nodes: [rootNode],
  extras: {
    species: header.species, seed: header.seed, stage: header.stage, view: header.view,
    unitM, wFloor: header.wFloor, palette: header.palette, bbox: header.bbox,
  },
});

// --- write the GLB ---------------------------------------------------------
//
// Binary glTF is a 12-byte header and a list of length-prefixed chunks. The
// only two ways to get it wrong are the paddings — JSON pads with SPACES so it
// stays parseable, BIN pads with zeros — and the total length, which counts the
// padding it does not otherwise mention.
const bin = Buffer.concat(binParts);
gltf.buffers.push({ byteLength: binLen });

const jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const binPad = (4 - (bin.length % 4)) % 4;
const total = 12 + 8 + jsonBuf.length + jsonPad + 8 + bin.length + binPad;

const glb = Buffer.alloc(total);
let o = 0;
glb.writeUInt32LE(0x46546c67, o); o += 4;          // 'glTF'
glb.writeUInt32LE(2, o); o += 4;                    // version
glb.writeUInt32LE(total, o); o += 4;
glb.writeUInt32LE(jsonBuf.length + jsonPad, o); o += 4;
glb.writeUInt32LE(0x4e4f534a, o); o += 4;           // 'JSON'
jsonBuf.copy(glb, o); o += jsonBuf.length;
for (let i = 0; i < jsonPad; i++) glb[o++] = 0x20;  // spaces
glb.writeUInt32LE(bin.length + binPad, o); o += 4;
glb.writeUInt32LE(0x004e4942, o); o += 4;           // 'BIN\0'
bin.copy(glb, o); o += bin.length;
for (let i = 0; i < binPad; i++) glb[o++] = 0;      // zeros
if (o !== total) die(`GLB assembly wrote ${o} bytes into a ${total}-byte file — this is a bug in the writer`);

writeFileSync(out, glb);

// --- the summary -----------------------------------------------------------
//
// WHAT THE CHAINING DID IS THE NUMBER TO READ. Segments-in against strands-out
// is the whole conversion in one ratio: if it comes back near 1:1 the chaining
// has failed and every vein in the plant is being swept as its own two-ring
// stub, which costs 2x the vertices and looks like a pile of sticks. On a
// Cathedral Fern the ratio should be several segments to the strand.
const nSeg = SEG.n;
const bb = header.bbox;
const heightM = bb ? (bb.max[1] - bb.min[1]) * unitM : 0;
const N = (v) => v.toLocaleString();

console.log(`
  ${header.species}  seed ${header.seed}  stage ${header.stage}  view ${header.view}
  ${N(nSeg)} segments in -> ${N(live.length)} strands out  (${(live.length ? sweptSeg / live.length : 0).toFixed(1)} segments/strand, longest ${N(maxRun)} points)${
  segDropped ? `\n  VEIN_MIN_W ${VEIN_MIN_W}: ${N(segDropped)} segments dropped (${(segDropped / (nSeg || 1) * 100).toFixed(1)}%)` : ''}${
  degenerate ? `\n  !! ${N(degenerate)} zero-length strands skipped — they have no tangent to sweep` : ''}
  tubes at RADIAL ${RADIAL}: ${N(tubeVerts)} vertices, ${N(tubeTris)} triangles

  lamina  ${N(laminaTris)} triangles (non-indexed)
  veins   ${N(tubeTris)} triangles${LINES ? `\n  lines   ${N(strandPts - live.length)} line segments (far-LOD)` : ''}
  points  ${N(PT.n)}

  bbox ${bb ? bb.min.map(v => (v * unitM).toFixed(2)).join(', ') + ' .. ' + bb.max.map(v => (v * unitM).toFixed(2)).join(', ') : '?'} m
  height ${heightM.toFixed(3)} m  (unitM ${unitM})

  ${out}  (${(total / 1048576).toFixed(2)} MB)
`);
