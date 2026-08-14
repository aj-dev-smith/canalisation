// IS THE GLB A GLB? — a validator for `tools/gltf_export.mjs`.
//
//   node test/gltf.mjs
//
// This asserts and exits non-zero, so it belongs in the list of harnesses that
// gate rather than the list that print.
//
// TWO DELIBERATE DECISIONS, AND THEY ARE THE WHOLE DESIGN OF THE FILE.
//
// 1. IT GROWS NOTHING. Every other harness here starts a plant, because the
//    thing under test is chemistry. The thing under test here is a TRANSCODER —
//    the bridge pair in, binary glTF out — and a transcoder's failure modes are
//    strides, offsets, alignment and units, none of which need a specimen and
//    all of which are easier to see against data whose every number is known in
//    advance. So this file SYNTHESISES a `canalisation-specimen-1` pair in a
//    temp dir: six triangle vertices, five segments and two points, chosen so
//    that every assertion below has an exact right answer rather than a
//    plausible one. It runs in about a second and it does not care which species
//    exist.
//
//    The fixture is not arbitrary. It carries, on purpose:
//      - a run of THREE segments that chain end-to-end, plus one that does not,
//        so the strand chaining is exercised rather than assumed. Four live
//        segments must come out as exactly two strands.
//      - one ZERO-LENGTH segment, isolated so it forms a strand of its own,
//        because that is the only shape that reaches the converter's degenerate
//        path. A strand with no length has no tangent; the failure it guards
//        against is a NaN ring poisoning the file's POSITION bounds, which is
//        silent in every viewer that does not draw NaN.
//      - one strand thin enough for `VEIN_MIN_W` to drop and the rest thick
//        enough to survive, so the LOD lever can be measured rather than trusted.
//
// 2. IT PARSES THE GLB WITH ITS OWN READER. There is no glTF library here and
//    there is deliberately not going to be one: a check whose reference is the
//    thing being checked is not a check. `test/petiole.mjs` keeps a second
//    implementation of the pipe model for exactly this reason, and
//    `39a_stem.js` keeps `cantileverHz` beside the solver for the same one. The
//    reader below walks chunk headers and reads accessors through a `DataView`
//    with explicit little-endian loads — it shares no code and no assumption
//    with the writer, so "the writer agrees with itself" cannot pass here.
//
//    It is still the weaker of the two proofs available. `tools/gltf_shot.mjs`
//    opens the same file with real three.js and a real GLTFLoader, which is the
//    only thing that can say an engine nobody here wrote can read it. This file
//    says the bytes are right; that one says somebody else agrees.
//
// FOUR DOCUMENTED DEVIATIONS from the plain reading of the format, all of them
// the converter's and all of them asserted here in their deviating form rather
// than quietly worked around:
//
//   - VEIN RADII ARE IN METRES TOO. A tube radius left in world units on a body
//     scaled by `unitM` is 16x too fat, and it reads as a look decision ("the
//     veins are cables") rather than as a unit bug. So the rings are checked at
//     `w * unitM`, not at `w`.
//   - THE POINTS PRIMITIVE HAS NO MATERIAL. Optional in glTF; nothing below
//     requires one.
//   - DEGENERACY IS PER STRAND, not per segment: the converter sums a run's
//     segment lengths and skips the run. The fixture's zero-length segment is
//     therefore placed where it cannot chain to anything.
//   - `scene.extras.bbox` IS IN WORLD UNITS. It is copied verbatim from the
//     header with `unitM` sitting beside it, so it must equal the header's bbox
//     EXACTLY. Converting it would make the key disagree with the header it
//     claims to copy.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let failures = 0;
let checks = 0;

function ok(cond, label, detail) {
  checks++;
  if (cond) return;
  failures++;
  console.error(`  FAIL  ${label}${detail === undefined ? '' : `  (${detail})`}`);
}

// A SECTION THAT THROWS IS ONE FAILED CHECK, NOT THE END OF THE RUN. This was
// not the first shape of the file and the difference is worth stating: breaking
// the converter's chaining made a later loop index past the end of the expected
// strand and throw a TypeError, which exits non-zero — but loses the check
// count and every section after it, so the one mutation reported two failures
// instead of eleven. A harness that stops at its first failure cannot tell you
// how much else is wrong, which is most of what a harness is for.
function section(name, fn) {
  console.log(name);
  if (!fn) return;
  try { fn(); } catch (e) {
    checks++; failures++;
    console.error(`  FAIL  this section threw instead of reporting  (${e && e.message})`);
  }
}

const near = (a, b, eps) => Math.abs(a - b) <= eps;
// The fixture's numbers go through float32 on the way into the .bin, so every
// expectation is rounded the same way rather than relying on the values being
// exactly representable. `unitM` is a power of two, so the metres bake itself is
// exact; this is about the fixture, not about the conversion.
const f32 = Math.fround;

// ---------------------------------------------------------------------------
// THE FIXTURE
// ---------------------------------------------------------------------------

const UNIT_M = 0.0625;   // the shipped ruler, stated rather than imported: this
                         // file is testing a consumer of the header, so it must
                         // be able to hand it a value and check what came out.

// pos3, nrm3, col3, emis1 — two triangles, non-indexed.
// Normals are unit by construction, including one that is not axis-aligned, so
// the unit-length assertion is not trivially satisfied by zeros and ones.
const TRI_V = [
  { p: [-1, 0, 0],     n: [0, 0, 1],     c: [0.25, 0.5, 0.75], e: 0.5 },
  { p: [1, 0, 0],      n: [0, 0, 1],     c: [0.25, 0.5, 0.75], e: 0.5 },
  { p: [0, 2, 0],      n: [0, 0, 1],     c: [0.25, 0.5, 0.75], e: 0.5 },
  { p: [0.5, 3, -2],   n: [0.6, 0.8, 0], c: [1, 0, 0],         e: 0 },
  { p: [2.5, 3.5, -2], n: [0.6, 0.8, 0], c: [0, 1, 0],         e: 0.25 },
  { p: [0.5, 4, -2.5], n: [0.6, 0.8, 0], c: [0, 0, 1],         e: 1 },
];

// a3, b3, w0, w1, col3, emis1.
//
// THE ORDER MATTERS AND IS THE POINT. Segments 0-2 chain (each `b` is the next
// `a`, bit for bit). Segment 3 is zero-length AND lands nowhere near segment 2's
// end or segment 4's start, so it is a strand of one with no length — the only
// way to reach the degenerate path. Segment 4 starts somewhere else again, so it
// is a second live strand, and it is thin enough for VEIN_MIN_W to take.
const SEG_V = [
  { a: [0, 0, 0], b: [0, 1, 0], w0: 0.125,     w1: 0.109375,  c: [1, 0, 0],       e: 0.75 },
  { a: [0, 1, 0], b: [0, 2, 0], w0: 0.109375,  w1: 0.09375,   c: [0, 1, 0],       e: 0.75 },
  { a: [0, 2, 0], b: [0, 3, 0], w0: 0.09375,   w1: 0.078125,  c: [0, 0, 1],       e: 0.75 },
  { a: [5, 0, 0], b: [5, 0, 0], w0: 0.0625,    w1: 0.0625,    c: [1, 1, 0],       e: 0.5 },
  { a: [2, 0, 0], b: [2, 0.5, 0], w0: 1 / 512, w1: 1 / 512,   c: [0.5, 0.5, 0.5], e: 0.25 },
];
const DEGEN_AT = SEG_V[3].a;      // must appear nowhere in the vein mesh
const THIN_W = 1 / 512;
const VEIN_MIN_W = 0.005;         // above the thin strand, below every other

// pos3, col3, size1
const PT_V = [
  { p: [0, 1, 0], c: [1, 1, 1], s: 0.5 },
  { p: [1, 2, 3], c: [0, 0.5, 1], s: 0.25 },
];

// What the converter must produce from the above, worked out on paper first —
// which is the ordering `test/pathogen.mjs` and `test/tree.mjs` both argue for.
//
// Strand A is segments 0-2: 3 segments, so 4 ring points. Strand B is segment 4:
// 1 segment, 2 ring points. Segment 3 is skipped entirely.
const STRANDS = 2;
const LIVE_SEG = 4;
const RINGS = 6;                  // LIVE_SEG + STRANDS — one ring per strand point
const A_PTS = [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]];
const A_RAD = [0.125, 0.109375, 0.09375, 0.078125];
// point 0 takes the FIRST segment's colour; point i+1 takes segment i's. A
// strand whose ribbons taper in colour carries the taper into the tube.
const A_COL = [SEG_V[0].c, SEG_V[0].c, SEG_V[1].c, SEG_V[2].c];
const B_PTS = [[2, 0, 0], [2, 0.5, 0]];
const B_RAD = [THIN_W, THIN_W];

function buildFixture(dir, name, { tri = TRI_V, seg = SEG_V, pt = PT_V } = {}) {
  const triF = new Float32Array(tri.length * 10);
  tri.forEach((v, i) => triF.set([...v.p, ...v.n, ...v.c, v.e], i * 10));
  const segF = new Float32Array(seg.length * 12);
  seg.forEach((s, i) => segF.set([...s.a, ...s.b, s.w0, s.w1, ...s.c, s.e], i * 12));
  const ptF = new Float32Array(pt.length * 7);
  pt.forEach((p, i) => ptF.set([...p.p, ...p.c, p.s], i * 7));

  const bin = Buffer.concat([triF, segF, ptF].map(a => Buffer.from(a.buffer, a.byteOffset, a.byteLength)));

  // an honest bbox over everything the bridge would have measured, in WORLD units
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const g = (p) => { for (let k = 0; k < 3; k++) { if (p[k] < bb[k]) bb[k] = p[k]; if (p[k] > bb[k + 3]) bb[k + 3] = p[k]; } };
  tri.forEach(v => g(v.p)); seg.forEach(s => { g(s.a); g(s.b); }); pt.forEach(p => g(p.p));

  const header = {
    format: 'canalisation-specimen-1',
    species: 'Fixture Fern', seed: 4242, steps: 1, view: 'natural', stage: 'fruiting',
    unitM: UNIT_M,
    wFloor: 0.0035,
    palette: { glow: 1.25, vein: [0.35, 1, 0.95], bgTop: [0.03, 0.01, 0.01] },
    bbox: { min: bb.slice(0, 3), max: bb.slice(3) },
    heroBbox: null,
    garden: [],
    organs: 3, axes: 1,
    sections: {
      tri: { offset: 0, floats: triF.length, stride: 10 },
      seg: { offset: triF.byteLength, floats: segF.length, stride: 12 },
      pt: { offset: triF.byteLength + segF.byteLength, floats: ptF.length, stride: 7 },
    },
    dropped: {},
  };
  const base = join(dir, name);
  writeFileSync(`${base}.json`, JSON.stringify(header, null, 2));
  writeFileSync(`${base}.bin`, bin);
  return { base, header };
}

// ---------------------------------------------------------------------------
// A GLB READER THAT SHARES NOTHING WITH THE WRITER
// ---------------------------------------------------------------------------

const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
// componentType -> [byte size, DataView getter name]
const CTYPE = {
  5120: [1, 'getInt8'], 5121: [1, 'getUint8'], 5122: [2, 'getInt16'],
  5123: [2, 'getUint16'], 5125: [4, 'getUint32'], 5126: [4, 'getFloat32'],
};

// Deliberately structural and deliberately dumb: it walks the chunk table by
// hand and reports what it found rather than throwing, so a malformed file
// produces failed CHECKS instead of a stack trace with no count attached.
function readGLB(buf) {
  const r = { bytes: buf.length, problems: [] };
  if (buf.length < 12) { r.problems.push('shorter than a GLB header'); return r; }
  r.magic = buf.readUInt32LE(0);
  r.version = buf.readUInt32LE(4);
  r.declared = buf.readUInt32LE(8);
  r.chunks = [];
  let o = 12;
  while (o + 8 <= buf.length) {
    const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4);
    const start = o + 8;
    if (start + len > buf.length) { r.problems.push(`chunk at ${o} runs past the end of the file`); break; }
    r.chunks.push({ type, len, start, data: buf.subarray(start, start + len) });
    o = start + len;
  }
  r.end = o;
  const jc = r.chunks.find(c => c.type === 0x4e4f534a);
  const bc = r.chunks.find(c => c.type === 0x004e4942);
  r.jsonChunk = jc; r.binChunk = bc;
  if (jc) {
    try { r.json = JSON.parse(jc.data.toString('utf8')); }
    catch (e) { r.problems.push(`JSON chunk does not parse: ${e.message}`); }
  } else r.problems.push('no JSON chunk');
  if (bc) r.bin = bc.data; else r.problems.push('no BIN chunk');
  return r;
}

// Read an accessor out as a flat JS array. Every load goes through a DataView at
// an explicit byte offset, little-endian — no typed-array views over the buffer,
// so nothing here can accidentally inherit an alignment the writer got right.
function acc(G, i) {
  const a = G.json.accessors[i];
  const bv = G.json.bufferViews[a.bufferView];
  const [sz, get] = CTYPE[a.componentType];
  const comps = COMPS[a.type];
  const dv = new DataView(G.bin.buffer, G.bin.byteOffset, G.bin.byteLength);
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || comps * sz;
  const out = new Array(a.count * comps);
  for (let k = 0; k < a.count; k++) {
    for (let c = 0; c < comps; c++) out[k * comps + c] = dv[get](base + k * stride + c * sz, true);
  }
  return out;
}
const nodeByName = (G, n) => G.json.nodes.find(x => x.name === n);
const meshOf = (G, name) => {
  const nd = nodeByName(G, name);
  return nd && nd.mesh !== undefined ? G.json.meshes[nd.mesh] : null;
};
const primOf = (G, name) => { const m = meshOf(G, name); return m && m.primitives[0]; };

// ---------------------------------------------------------------------------

const CONVERTER = fileURLToPath(new URL('../tools/gltf_export.mjs', import.meta.url));

// Absolute, rather than the `tools/gltf_export.mjs` a shell would type, so this
// harness works from any cwd — a test that only passes from the repo root is a
// test that fails for whoever runs it from `test/`.
function convert(fixtureBase, out, env) {
  const res = spawnSync(process.execPath, [CONVERTER, fixtureBase, out], {
    encoding: 'utf8',
    env: { ...process.env, RADIAL: '', VEIN_MIN_W: '', LINES: '', ...env },
  });
  return res;
}

const dir = mkdtempSync(join(tmpdir(), 'canalisation-gltf-'));
try {
  const { base, header } = buildFixture(dir, 'fixture');

  // --- the base conversion -------------------------------------------------

  section('the converter runs');
  const outA = join(dir, 'a.glb');
  const runA = convert(base, outA, {});
  ok(runA.status === 0, 'the converter exits zero on a well-formed pair',
    runA.status === 0 ? undefined : `status ${runA.status}\n${runA.stderr}`);
  if (runA.status !== 0) console.error(runA.stdout);

  const RADIAL = 5;   // the converter's documented default, exercised by NOT setting it
  // No early exit on a bad file: the sections below are wrapped, so an unusable
  // GLB reports one failure each rather than aborting the run.
  const G = runA.status === 0
    ? readGLB(readFileSync(outA))
    : { problems: ['the converter did not produce a file'], chunks: [], bytes: 0 };
  ok(G.problems.length === 0, 'the GLB parses as a chunked container', G.problems.join('; '));

  // --- container -----------------------------------------------------------

  section('binary glTF container', () => {
    ok(G.magic === 0x46546c67, "magic is 'glTF'", `0x${(G.magic >>> 0).toString(16)}`);
    ok(G.version === 2, 'version is 2', G.version);
    ok(G.declared === G.bytes, 'the declared length is the file length', `${G.declared} vs ${G.bytes}`);
    ok(G.end === G.bytes, 'the chunk table covers the whole file exactly', `${G.end} vs ${G.bytes}`);
    ok(G.chunks.length === 2, 'exactly two chunks', G.chunks.length);
    ok(G.chunks[0] && G.chunks[0].type === 0x4e4f534a, 'the first chunk is JSON');
    ok(G.chunks[1] && G.chunks[1].type === 0x004e4942, 'the second chunk is BIN');
    ok(G.chunks.every(c => c.len % 4 === 0), 'every chunk length is a multiple of 4',
      G.chunks.map(c => c.len).join(', '));
    ok(G.chunks.every(c => c.start % 4 === 0), 'every chunk starts 4-byte aligned');
    {
      // JSON pads with SPACES so the chunk stays parseable; BIN pads with zeros.
      const txt = G.jsonChunk.data.toString('utf8');
      const tail = txt.slice(txt.lastIndexOf('}') + 1);
      ok(tail.length < 4 && /^ *$/.test(tail), 'the JSON chunk is padded with spaces',
        JSON.stringify(tail));
    }
  });

  section('the document', () => {
    ok(G.json.asset && G.json.asset.version === '2.0', 'asset.version is 2.0',
      G.json.asset && G.json.asset.version);
    ok(typeof G.json.asset.generator === 'string' && /gltf_export/.test(G.json.asset.generator),
      'the generator names this pipeline', G.json.asset.generator);
    ok(G.json.buffers.length === 1 && G.json.buffers[0].byteLength === G.bin.length,
      "the buffer's declared length is the BIN chunk's payload",
      `${G.json.buffers[0] && G.json.buffers[0].byteLength} vs ${G.bin.length}`);
    ok(G.json.buffers[0].uri === undefined, 'the buffer is the GLB payload, not an external URI');

    // ALIGNMENT IS THE FAILURE THAT ONLY SOME LOADERS COMPLAIN ABOUT, which makes
    // it worth a check rather than a glance: a 16-bit index buffer at an odd
    // offset produces a file that three.js opens and other engines reject.
    //
    // ⚠ BE HONEST ABOUT WHAT THESE THREE CANNOT CATCH TODAY. Deleting the
    // writer's padding entirely leaves this section green, and that is not a
    // hole in the fixture — it is arithmetic. Every buffer the converter emits
    // is a whole number of 4-byte units already: the attributes are all float32,
    // and an index buffer is Uint16 with an even count (six per quad, two per
    // line), so its byte length is a multiple of 4 whatever RADIAL and however
    // many segments arrive. No capture can make that pad fire, so these assert a
    // property of the output rather than exercise a branch. They are worth
    // keeping — the first attribute that is not float32 (a normalised ubyte
    // colour, a joint index) makes them live — but a green run here is evidence
    // about the format, not about the padding code.
    let badBV = 0, badAcc = 0, spill = 0;
    for (const bv of G.json.bufferViews) {
      if ((bv.byteOffset || 0) % 4) badBV++;
      if ((bv.byteOffset || 0) + bv.byteLength > G.bin.length) spill++;
    }
    for (const a of G.json.accessors) {
      const bv = G.json.bufferViews[a.bufferView];
      const [sz] = CTYPE[a.componentType];
      const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
      if ((a.byteOffset || 0) % 4) badAcc++;
      if (off % sz) badAcc++;
      if (off + a.count * COMPS[a.type] * sz > (bv.byteOffset || 0) + bv.byteLength) spill++;
    }
    ok(badBV === 0, 'every bufferView byteOffset is 4-byte aligned', `${badBV} off`);
    ok(badAcc === 0, 'every accessor byteOffset is aligned to 4 and to its component', `${badAcc} off`);
    ok(spill === 0, 'no accessor or view reads past what it is allowed to', `${spill} spills`);
    ok(G.json.accessors.filter(a => a.min || a.max).every(a => a.min.length === COMPS[a.type]),
      'stated bounds have one entry per component');
  });

  // --- the node tree -------------------------------------------------------

  section('the node tree', () => {
    const root = nodeByName(G, 'specimen');
    ok(!!root, 'there is a root node called "specimen"');
    ok(G.json.scenes.length === 1 && G.json.scene === 0, 'one scene, and it is the default');
    ok(root && G.json.scenes[0].nodes.length === 1 &&
       G.json.nodes[G.json.scenes[0].nodes[0]] === root, 'the scene points at that root');
    ok(root && root.mesh === undefined, 'the root carries no mesh of its own');
    for (const n of ['lamina', 'veins', 'points']) {
      const nd = nodeByName(G, n);
      ok(!!nd && nd.mesh !== undefined, `there is a "${n}" node with a mesh`);
      ok(!!nd && root.children.includes(G.json.nodes.indexOf(nd)),
        `"${n}" is a child of the specimen`);
    }
    ok(!nodeByName(G, 'veins-lines'), 'and no lines node unless LINES=1 asked for one');

    ok(primOf(G, 'lamina').mode === 4, 'lamina is TRIANGLES', primOf(G, 'lamina').mode);
    ok(primOf(G, 'veins').mode === 4, 'veins are TRIANGLES', primOf(G, 'veins').mode);
    ok(primOf(G, 'points').mode === 0, 'points are POINTS', primOf(G, 'points').mode);
  });

  // --- the lamina ----------------------------------------------------------

  section('lamina: a triangle soup, in metres', () => {
    const p = primOf(G, 'lamina');
    ok(p.indices === undefined, 'the soup is NOT indexed');
    const pa = G.json.accessors[p.attributes.POSITION];
    ok(pa.type === 'VEC3' && pa.componentType === 5126, 'POSITION is float VEC3');
    ok(pa.count === TRI_V.length, 'every fixture vertex came across', `${pa.count} of ${TRI_V.length}`);
    ok(pa.count % 3 === 0 && pa.count / 3 === TRI_V.length / 3,
      'the triangle count is the fixture triangle count', `${pa.count / 3}`);

    const pos = acc(G, p.attributes.POSITION);
    const nrm = acc(G, p.attributes.NORMAL);
    const col = acc(G, p.attributes.COLOR_0);

    // THE METRES BAKE. glTF's unit is the metre and three.js believes it, so this
    // is the assertion that keeps a Cathedral Fern 1.4 m tall instead of 22 of
    // nothing. `unitM` is a power of two, so the expectation is exact.
    let worstP = 0;
    for (let v = 0; v < TRI_V.length; v++) {
      for (let c = 0; c < 3; c++) worstP = Math.max(worstP, Math.abs(pos[v * 3 + c] - f32(TRI_V[v].p[c]) * UNIT_M));
    }
    ok(worstP < 1e-6, 'every position is the fixture position times unitM', worstP.toExponential(2));

    // min/max are REQUIRED on POSITION and are what a loader frustum-culls and
    // raycasts against — a stale bound is a plant that vanishes at an angle.
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < pa.count; v++) for (let c = 0; c < 3; c++) {
      if (pos[v * 3 + c] < mn[c]) mn[c] = pos[v * 3 + c];
      if (pos[v * 3 + c] > mx[c]) mx[c] = pos[v * 3 + c];
    }
    ok(!!pa.min && !!pa.max, 'POSITION states min and max');
    ok(pa.min.every((v, c) => near(v, mn[c], 1e-9)) && pa.max.every((v, c) => near(v, mx[c], 1e-9)),
      'and they are the actual bounds of the data',
      `${JSON.stringify(pa.min)}..${JSON.stringify(pa.max)} vs ${JSON.stringify(mn)}..${JSON.stringify(mx)}`);
    const fmn = [0, 1, 2].map(c => Math.min(...TRI_V.map(v => f32(v.p[c]))) * UNIT_M);
    const fmx = [0, 1, 2].map(c => Math.max(...TRI_V.map(v => f32(v.p[c]))) * UNIT_M);
    ok(pa.min.every((v, c) => near(v, fmn[c], 1e-6)) && pa.max.every((v, c) => near(v, fmx[c], 1e-6)),
      'and they are the fixture bounds in metres', `${JSON.stringify(pa.min)} vs ${JSON.stringify(fmn)}`);

    // Normals are NOT scaled — a normal in metres is a normal that is 16x short,
    // and a renderer would light the plant as if it were black.
    let worstN = 0;
    for (let v = 0; v < pa.count; v++) {
      worstN = Math.max(worstN, Math.abs(Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) - 1));
    }
    ok(worstN < 1e-3, 'every normal is unit length', worstN.toExponential(2));

    const ca = G.json.accessors[p.attributes.COLOR_0];
    ok(ca.type === 'VEC4' && ca.componentType === 5126, 'COLOR_0 is float VEC4', ca.type);
    ok(ca.count === pa.count, 'one colour per vertex');
    ok(col.every(v => v >= 0 && v <= 1), 'every colour component is in [0,1]');
    // ALPHA IS THE EMISSIVE WEIGHT, not an opacity — the only slot in a glTF
    // vertex format that every loader already reads. The fixture keeps its
    // emissives inside [0,1] so this is an equality rather than a clamp test;
    // the clamp gets its own fixture below.
    let worstE = 0;
    for (let v = 0; v < TRI_V.length; v++) worstE = Math.max(worstE, Math.abs(col[v * 4 + 3] - f32(TRI_V[v].e)));
    ok(worstE < 1e-6, "alpha carries the capture's emissive weight through unchanged", worstE.toExponential(2));
    let worstC = 0;
    for (let v = 0; v < TRI_V.length; v++) for (let c = 0; c < 3; c++) {
      worstC = Math.max(worstC, Math.abs(col[v * 4 + c] - f32(TRI_V[v].c[c])));
    }
    ok(worstC < 1e-6, 'and rgb is the capture rgb', worstC.toExponential(2));

    const mat = G.json.materials[p.material];
    ok(mat && mat.name === 'lamina', 'the lamina has its own material');
    ok(mat && mat.doubleSided === true, 'and it is double sided — a leaf is drawn from both faces');
    ok(mat && mat.pbrMetallicRoughness.metallicFactor === 0 &&
       near(mat.pbrMetallicRoughness.roughnessFactor, 0.9, 1e-9), 'and it is a rough dielectric');
  });

  // --- the veins -----------------------------------------------------------

  // hoisted out of the section so the VEIN_MIN_W comparison below can read it
  let veinVerts = 0;
  section('veins: segments chained into strands, swept as tubes', () => {
    const p = primOf(G, 'veins');
    const pa = G.json.accessors[p.attributes.POSITION];
    const ia = G.json.accessors[p.indices];
    veinVerts = pa.count;
    ok(p.indices !== undefined, 'a tube is INDEXED — a sweep shares its rings');

    // HOW MANY STRANDS, DERIVED RATHER THAN GUESSED. A sweep emits one ring per
    // strand POINT and a strand of k segments has k+1 points, so
    //   rings = liveSegments + strands.
    // The index count cannot see this — it is `sum(k) * RADIAL * 6` either way —
    // which is exactly why an unchained conversion (four strands of one segment)
    // would pass an index-count check and fail this one.
    ok(pa.count % RADIAL === 0, 'the vertex count is a whole number of rings',
      `${pa.count} at RADIAL ${RADIAL}`);
    const rings = pa.count / RADIAL;
    ok(rings === RINGS, 'one ring per strand point', `${rings} rings, expected ${RINGS}`);
    ok(rings - LIVE_SEG === STRANDS,
      `${LIVE_SEG} live segments chained into exactly ${STRANDS} strands`,
      `got ${rings - LIVE_SEG}`);
    ok(ia.count === LIVE_SEG * RADIAL * 6, 'two triangles per quad, one quad ring per segment',
      `${ia.count} indices, expected ${LIVE_SEG * RADIAL * 6}`);
    ok(ia.type === 'SCALAR' && (ia.componentType === 5123 || ia.componentType === 5125),
      'indices are 16- or 32-bit scalars', ia.componentType);
    ok((pa.count > 65535) === (ia.componentType === 5125),
      'and the width matches the vertex count', `${pa.count} verts, componentType ${ia.componentType}`);

    const idx = acc(G, p.indices);
    ok(idx.every(v => v >= 0 && v < pa.count), 'no index points outside its own accessor',
      `max ${Math.max(...idx)} of ${pa.count}`);
    // AND NO TRIANGLE SPANS TWO STRANDS. That is the failure a wrong vertex
    // offset produces: a valid file, in-range indices, and a ribbon stretched
    // across the plant from one vein to another.
    const boundary = 4 * RADIAL;     // strand A is the first four rings
    let crossed = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const s0 = idx[t] < boundary, s1 = idx[t + 1] < boundary, s2 = idx[t + 2] < boundary;
      if (!(s0 === s1 && s1 === s2)) crossed++;
    }
    ok(crossed === 0, 'no triangle spans two strands', `${crossed} of ${idx.length / 3}`);

    const pos = acc(G, p.attributes.POSITION);
    const nrm = acc(G, p.attributes.NORMAL);
    const col = acc(G, p.attributes.COLOR_0);

    // A ring's vertices sit on a circle about the centreline point, so their mean
    // IS that point (the offsets sum to zero around a full turn) and their common
    // distance from it IS the radius. That reconstructs both without knowing
    // anything about the frame the converter chose.
    const pts = [...A_PTS, ...B_PTS];
    const rad = [...A_RAD, ...B_RAD];
    const cols = [...A_COL, SEG_V[4].c, SEG_V[4].c];
    const emis = [0.75, 0.75, 0.75, 0.75, 0.25, 0.25];
    let worstC = 0, worstR = 0, worstN = 0, worstCol = 0, worstA = 0;
    // CLAMPED TO WHAT WE EXPECTED, so that a wrong ring count is reported by the
    // check above and the rest of this file still runs. An earlier version
    // indexed straight off `rings` and threw a TypeError the moment the chaining
    // broke — which exits non-zero, but loses the count and every check after
    // it, and a harness that stops at its first failure cannot tell you how much
    // else is wrong.
    for (let r = 0; r < Math.min(rings, pts.length); r++) {
      const cen = [0, 0, 0];
      for (let j = 0; j < RADIAL; j++) for (let c = 0; c < 3; c++) cen[c] += pos[(r * RADIAL + j) * 3 + c] / RADIAL;
      for (let c = 0; c < 3; c++) worstC = Math.max(worstC, Math.abs(cen[c] - f32(pts[r][c]) * UNIT_M));
      for (let j = 0; j < RADIAL; j++) {
        const o = (r * RADIAL + j) * 3;
        const d = Math.hypot(pos[o] - cen[0], pos[o + 1] - cen[1], pos[o + 2] - cen[2]);
        // THE RADII ARE IN METRES TOO — deviation (1). A radius left in world
        // units next to metre positions is 16x too fat and reads as a look
        // decision rather than as the unit bug it is.
        worstR = Math.max(worstR, Math.abs(d - f32(rad[r]) * UNIT_M));
        worstN = Math.max(worstN, Math.abs(Math.hypot(nrm[o], nrm[o + 1], nrm[o + 2]) - 1));
        const co = (r * RADIAL + j) * 4;
        for (let c = 0; c < 3; c++) worstCol = Math.max(worstCol, Math.abs(col[co + c] - f32(cols[r][c])));
        worstA = Math.max(worstA, Math.abs(col[co + 3] - f32(emis[r])));
      }
    }
    ok(worstC < 1e-6, 'every ring is centred on its strand point, in metres', worstC.toExponential(2));
    ok(worstR < 1e-6, 'and its radius is that point\'s half-width times unitM', worstR.toExponential(2));
    ok(worstN < 1e-3, 'ring normals point radially outward and are unit length', worstN.toExponential(2));
    ok(worstCol < 1e-6, 'ring colour follows the segment it came from', worstCol.toExponential(2));
    ok(worstA < 1e-6, 'and its alpha is that segment\'s emissive', worstA.toExponential(2));
    ok(col.every(v => v >= 0 && v <= 1), 'every vein colour component is in [0,1]');

    // THE DEGENERATE STRAND. Deviation (3): the converter sums a RUN's lengths,
    // so this only bites for a zero-length segment that chains to nothing — which
    // is why the fixture parks it at x=5 on its own. Checked positionally rather
    // than by arithmetic, because a count can be right for the wrong reason.
    let nearDegen = 0, nonFinite = 0;
    for (let v = 0; v < pa.count; v++) {
      const o = v * 3;
      if (!Number.isFinite(pos[o]) || !Number.isFinite(pos[o + 1]) || !Number.isFinite(pos[o + 2])) nonFinite++;
      const d = Math.hypot(pos[o] - DEGEN_AT[0] * UNIT_M, pos[o + 1] - DEGEN_AT[1] * UNIT_M, pos[o + 2] - DEGEN_AT[2] * UNIT_M);
      if (d < 0.05) nearDegen++;
    }
    ok(nearDegen === 0, 'the zero-length strand was skipped, not swept', `${nearDegen} vertices at it`);
    ok(nonFinite === 0, 'and nothing in the tube is NaN', `${nonFinite}`);
    ok(pa.min.every(Number.isFinite) && pa.max.every(Number.isFinite),
      'so the stated bounds are finite too', `${JSON.stringify(pa.min)}`);

    const mat = G.json.materials[p.material];
    ok(mat && mat.name === 'veins', 'the veins have their own material');
    ok(mat && mat.doubleSided === false, 'and it is single sided — a tube has an outside');
    ok(mat && near(mat.pbrMetallicRoughness.roughnessFactor, 0.7, 1e-9),
      'and it is slightly glossier than the lamina');
  });

  // --- the points ----------------------------------------------------------

  section('points', () => {
    const p = primOf(G, 'points');
    const pa = G.json.accessors[p.attributes.POSITION];
    ok(pa.count === PT_V.length, 'every point came across', `${pa.count} of ${PT_V.length}`);
    const pos = acc(G, p.attributes.POSITION);
    const col = acc(G, p.attributes.COLOR_0);
    ok(p.attributes._SIZE !== undefined, 'the capture\'s point size survives as _SIZE');
    const sa = G.json.accessors[p.attributes._SIZE];
    ok(sa.type === 'SCALAR' && sa.componentType === 5126, '_SIZE is a float scalar', sa.type);
    const siz = acc(G, p.attributes._SIZE);
    let worstP = 0, worstS = 0;
    for (let v = 0; v < PT_V.length; v++) {
      for (let c = 0; c < 3; c++) worstP = Math.max(worstP, Math.abs(pos[v * 3 + c] - f32(PT_V[v].p[c]) * UNIT_M));
      worstS = Math.max(worstS, Math.abs(siz[v] - f32(PT_V[v].s) * UNIT_M));
    }
    ok(worstP < 1e-6, 'point positions are in metres', worstP.toExponential(2));
    ok(worstS < 1e-6, 'and so is the size, so a shader can treat it as a world diameter',
      worstS.toExponential(2));
    ok([0, 1].every(v => near(col[v * 4 + 3], 1, 1e-9)),
      'a point is opaque — there is no emissive channel in the capture to carry');
    // Deviation (2): the points primitive has NO material key. That is legal
    // glTF, so nothing here requires one.
  });

  // --- what the header knew that the triangles do not -----------------------

  section('scene extras', () => {
    const x = G.json.scenes[0].extras;
    ok(!!x, 'the scene carries extras');
    ok(x.species === header.species, 'species carried through', x.species);
    ok(x.seed === header.seed && x.stage === header.stage && x.view === header.view,
      'and seed, stage and view with it');
    ok(x.unitM === UNIT_M, 'unitM is the ruler the positions were baked with', x.unitM);
    ok(x.wFloor === header.wFloor, 'the width floor is stated, so a consumer can tell a swept export from a shipped-look one', x.wFloor);
    ok(JSON.stringify(x.palette) === JSON.stringify(header.palette),
      'the palette is carried unchanged — a species look is its palette');
    // Deviation (4): bbox is VERBATIM and therefore in WORLD units while the
    // geometry is in metres. `unitM` sits beside it; converting one of the two
    // would make this key disagree with the header it claims to copy.
    ok(JSON.stringify(x.bbox) === JSON.stringify(header.bbox),
      'and bbox is the header bbox exactly, in world units beside unitM',
      JSON.stringify(x.bbox));
  });

  // --- VEIN_MIN_W: the LOD lever -------------------------------------------

  section('VEIN_MIN_W drops thin veins', () => {
    const outB = join(dir, 'b.glb');
    const runB = convert(base, outB, { VEIN_MIN_W: String(VEIN_MIN_W) });
    ok(runB.status === 0, 'the converter exits zero with VEIN_MIN_W set', runB.stderr);
    const H = readGLB(readFileSync(outB));
    ok(H.problems.length === 0, 'and writes a parseable GLB', H.problems.join('; '));
    const pv = primOf(H, 'veins');
    const pc = H.json.accessors[pv.attributes.POSITION].count;
    // Strand B is a single segment at 1/512 half-width, under the threshold;
    // strand A's thinnest is 0.078125, well over it. So four rings survive.
    ok(pc === 4 * RADIAL, 'only the thick strand survives',
      `${pc} vertices, expected ${4 * RADIAL}`);
    ok(pc < veinVerts, 'the vein mesh shrank', `${pc} against ${veinVerts}`);
    const pos = acc(H, pv.attributes.POSITION);
    let nearThin = 0;
    for (let v = 0; v < pc; v++) {
      if (Math.abs(pos[v * 3] - B_PTS[0][0] * UNIT_M) < 0.05) nearThin++;
    }
    ok(nearThin === 0, 'and it is the THIN one that went', `${nearThin} vertices left at it`);
    const pl = primOf(H, 'lamina');
    ok(H.json.accessors[pl.attributes.POSITION].count === TRI_V.length,
      'while the lamina is untouched — this lever is about veins only');
  });

  // --- LINES: the far-LOD --------------------------------------------------

  section('LINES=1 adds a centreline far-LOD', () => {
    const RAD2 = 7;   // a non-default RADIAL at the same time, so the ring maths
                      // above cannot be passing on a coincidence with 5
    const outC = join(dir, 'c.glb');
    const runC = convert(base, outC, { LINES: '1', RADIAL: String(RAD2) });
    ok(runC.status === 0, 'the converter exits zero with LINES=1', runC.stderr);
    const H = readGLB(readFileSync(outC));
    ok(H.problems.length === 0, 'and writes a parseable GLB', H.problems.join('; '));

    const nd = nodeByName(H, 'veins-lines');
    ok(!!nd, 'there is a "veins-lines" node');
    ok(!!nd && nodeByName(H, 'specimen').children.includes(H.json.nodes.indexOf(nd)),
      'and it hangs off the specimen with everything else');
    const p = primOf(H, 'veins-lines');
    ok(p.mode === 1, 'it is LINES', p.mode);
    const pa = H.json.accessors[p.attributes.POSITION];
    ok(pa.count === RINGS, 'one vertex per strand point, not per ring',
      `${pa.count}, expected ${RINGS}`);
    const ia = H.json.accessors[p.indices];
    // one line per segment, two indices each — the strand points minus one
    // endpoint per strand
    ok(ia.count === (RINGS - STRANDS) * 2, 'and one line per segment',
      `${ia.count} indices, expected ${(RINGS - STRANDS) * 2}`);
    const idx = acc(H, p.indices);
    ok(idx.every(v => v >= 0 && v < pa.count), 'with no index outside the accessor');
    const boundary = A_PTS.length;
    let crossed = 0;
    for (let t = 0; t < idx.length; t += 2) if ((idx[t] < boundary) !== (idx[t + 1] < boundary)) crossed++;
    ok(crossed === 0, 'and no line joining two different strands', `${crossed}`);

    const lpos = acc(H, p.attributes.POSITION);
    const pts = [...A_PTS, ...B_PTS];
    let worst = 0;
    for (let v = 0; v < Math.min(pa.count, pts.length); v++) for (let c = 0; c < 3; c++) {
      worst = Math.max(worst, Math.abs(lpos[v * 3 + c] - f32(pts[v][c]) * UNIT_M));
    }
    ok(worst < 1e-6, 'the centreline is the strand, in metres', worst.toExponential(2));

    // RADIAL is a real knob, checked on the same file so this costs no spawn
    const tv = H.json.accessors[primOf(H, 'veins').attributes.POSITION].count;
    ok(tv === RINGS * RAD2, `RADIAL=${RAD2} widens the ring rather than the strand count`,
      `${tv} vertices, expected ${RINGS * RAD2}`);
  });

  // --- the clamp, on its own fixture ---------------------------------------
  //
  // Kept separate on purpose. The main fixture's emissives all sit inside [0,1]
  // so its alpha assertion is an EQUALITY — a fixture that straddled the clamp
  // would be testing the clamp and the pass-through with one number and could
  // not tell them apart.

  section('emissive outside [0,1] is clamped', () => {
    const wild = [
      { p: [0, 0, 0], n: [0, 1, 0], c: [1, 1, 1], e: 1.5 },
      { p: [1, 0, 0], n: [0, 1, 0], c: [1, 1, 1], e: -0.5 },
      { p: [0, 1, 0], n: [0, 1, 0], c: [1, 1, 1], e: 0.5 },
    ];
    const { base: cb } = buildFixture(dir, 'clamp', { tri: wild, seg: [], pt: [] });
    const outD = join(dir, 'd.glb');
    const runD = convert(cb, outD, {});
    ok(runD.status === 0, 'a capture with no veins and no points still converts', runD.stderr);
    const H = readGLB(readFileSync(outD));
    ok(H.problems.length === 0, 'and parses', H.problems.join('; '));
    ok(!nodeByName(H, 'veins') && !nodeByName(H, 'points'),
      'with no empty vein or point nodes — a node present only if non-empty');
    const col = acc(H, primOf(H, 'lamina').attributes.COLOR_0);
    ok(near(col[3], 1, 1e-9), 'emissive 1.5 comes through as alpha 1', col[3]);
    ok(near(col[7], 0, 1e-9), 'emissive -0.5 comes through as alpha 0', col[7]);
    ok(near(col[11], 0.5, 1e-9), 'and 0.5 is left alone', col[11]);
  });

  // --- the format string is the contract -----------------------------------

  section('a capture this converter should refuse', () => {
    const bad = join(dir, 'wrong');
    const { header: h } = buildFixture(dir, 'wrong');
    writeFileSync(`${bad}.json`, JSON.stringify({ ...h, format: 'canalisation-specimen-2' }));
    const runE = convert(bad, join(dir, 'e.glb'), {});
    // A future bridge with a different stride would be read as garbage that
    // still looks like a plant — the worst failure this pipeline has, and the
    // reason the format name carries a version at all.
    ok(runE.status !== 0, 'a capture with an unknown format version is refused, not guessed at',
      `status ${runE.status}`);
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------

console.log();
if (failures) {
  console.error(`${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`all ${checks} checks passed`);
