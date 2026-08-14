// DOES THE GLB RENDER IN SOMEBODY ELSE'S ENGINE?
//
//   node tools/gltf_shot.mjs export/cathedral_fern_21_natural.glb shots
//
// `tools/gltf_export.mjs` writes a binary glTF by hand — chunk headers, accessor
// min/max, 4-byte alignment, a sweep from segments to tubes. The validator in
// `test/` reads that file back with a parser written in the same session by the
// same hand, which is the shape of check this repo already refuses elsewhere:
// `test/petiole.mjs` keeps a SECOND implementation of the pipe model on purpose,
// because a check whose reference is the thing being checked is not a check.
// The reference here is the whole point of the format — real three.js, real
// GLTFLoader, unmodified, off a CDN — so what this proves is not "our writer
// agrees with our reader" but "an engine nobody here wrote can open it".
//
// It is a capture tool in `tools/` style and it is also the second kind of tool
// in here — like `wind_check.mjs` and `cull.mjs`, it returns an exit code rather
// than only pictures. It fails on: a loader error, zero triangles rendered, or a
// frame that is uniformly near-black.
//
// THAT LAST ONE IS THE POINT OF THE WHOLE FILE, and it is a pitfall this repo
// has paid for twice (tools/README.md): a lost WebGL context writes an all-black
// PNG **while still reporting a full triangle count**, so "triangles > 0" is not
// evidence that anything was drawn. The check therefore reads the drawing buffer
// back with `gl.readPixels` on the centre crop and asks two things of it: that it
// is not near-black, and that it is not FLAT — a correctly framed camera pointing
// past the specimen renders a perfectly good picture of the background. Both
// numbers are printed for every angle whether they pass or not.
//
// THREE.JS WITHOUT NPM. This repo has no dependencies and is not about to grow
// one for a proof, so a pinned three.js is downloaded once into `tools/.cache/`
// (gitignored) and served locally on later runs. Two things about that:
//
//   - `curl`, not `fetch`. Node's global fetch does NOT read `HTTPS_PROXY`, and
//     this environment reaches the network through one; curl does read it. A
//     fetch() here fails with a bare connect error that reads like the CDN being
//     down.
//   - The loader's own imports are followed. `GLTFLoader.js` imports `three`
//     (which the page's importmap supplies) and `../utils/BufferGeometryUtils.js`
//     (which it does not), so the vendoring walks relative specifiers
//     recursively and mirrors the package's own layout — that way every relative
//     import resolves over HTTP exactly as it would in a bundler.
//
// A file:// page cannot do any of this (module CORS), so the tool stands up a
// `node:http` server on an ephemeral port serving the cache, the .glb and one
// generated page. `js` must be served as `text/javascript` or the browser
// refuses the module outright.
//
// GL backend: as `flower_shot.mjs`. On macOS `--use-gl=swiftshader` loses the
// context and hands back the black PNG described above, so ANGLE-on-Metal headed
// is what this asks for there.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, extname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , glbPath, outDir = 'shots'] = process.argv;
if (!glbPath) {
  console.error('usage: node tools/gltf_shot.mjs <path-to.glb> [shots-dir]');
  process.exit(2);
}
if (!existsSync(glbPath)) {
  console.error(`no such file: ${glbPath}`);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const W = +(process.env.WIDTH || 1280);
const H = +(process.env.HEIGHT || 960);

// --- three.js, vendored ----------------------------------------------------
//
// PINNED, and the pin is load-bearing rather than tidiness. `GLTFLoader.js` has
// to be a version whose only bare specifier is `three` itself; addon files that
// reach for other packages would need a whole importmap of things nobody here
// chose. 0.161.0 imports `three` and one relative sibling, which is exactly what
// the vendoring below can satisfy.
const VER = process.env.THREE_VERSION || '0.161.0';
const CDN = process.env.THREE_CDN || `https://unpkg.com/three@${VER}/`;
const CACHE = fileURLToPath(new URL(`.cache/three-${VER}/`, import.meta.url));

// Relative specifiers only — `three` is the importmap's job. Matches `from '…'`,
// a bare side-effect `import '…'` and a dynamic `import('…')`, and requires the
// target to end in `.js` so a path-looking string inside a comment cannot send
// this off fetching something that does not exist.
const RELIMP = /(?:from|import)\s*\(?\s*['"](\.[^'"]*\.js)['"]/g;

function vendorOne(rel, fatal) {
  const dst = join(CACHE, rel);
  if (existsSync(dst)) return { src: readFileSync(dst, 'utf8'), fetched: false };
  mkdirSync(dirname(dst), { recursive: true });
  const url = CDN + rel;
  const r = spawnSync('curl', ['-sSfL', url, '-o', dst], { encoding: 'utf8' });
  if (r.status !== 0) {
    const why = `${url}\n  curl exit ${r.status}: ${(r.stderr || '').trim()}`;
    if (fatal) { console.error(`could not fetch ${why}`); process.exit(1); }
    console.error(`  !! skipped a dependency: ${why}`);
    return null;
  }
  return { src: readFileSync(dst, 'utf8'), fetched: true };
}

function vendor(rel, seen = new Map(), fatal = true) {
  if (seen.has(rel)) return seen;
  const got = vendorOne(rel, fatal);
  seen.set(rel, !!(got && got.fetched));
  if (!got) return seen;
  for (const m of got.src.matchAll(RELIMP)) {
    // Resolve against the package layout so the same relative path works over
    // HTTP. A dependency that 404s is a warning, not a stop: the browser will
    // then report the real module error and the assertions below will catch it,
    // which is more informative than this regex's opinion.
    vendor(posix.normalize(posix.join(posix.dirname(rel), m[1])), seen, false);
  }
  return seen;
}

const ENTRY_THREE = 'build/three.module.js';
const ENTRY_LOADER = 'examples/jsm/loaders/GLTFLoader.js';
const vendored = vendor(ENTRY_THREE);
vendor(ENTRY_LOADER, vendored);
const fresh = [...vendored].filter(([, f]) => f).map(([k]) => k);
console.log(`three ${VER}  ${vendored.size} files  ${fresh.length ? `downloaded ${fresh.length}` : 'all cached'}  ${CACHE}`);

// --- the page --------------------------------------------------------------
//
// A NEUTRAL STUDIO GREY, NOT THE SPECIES' OWN BACKDROP. The header carries
// `palette.bgTop` and it is tempting to use it — but an Ember Creeper's is
// 0.030/0.010/0.010 of warm near-black, and a near-black background is the one
// thing that makes the black-frame assertion below unable to tell a working
// renderer from a dead one. This tool is a pipeline proof and not a look tool;
// `blender_look.py` is where the shipped look is reproduced faithfully.
const PAGE = (angles) => `<!doctype html><meta charset="utf-8"><title>glb</title>
<style>html,body{margin:0;background:#22262b;overflow:hidden}canvas{display:block}</style>
<script type="importmap">
{"imports":{"three":"/three/${ENTRY_THREE}","three/addons/":"/three/examples/jsm/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const S = window.__stats = { triangles: 0, calls: 0, meshes: 0, error: null,
  ready: false, nodes: [], bbox: null, extras: null, points: 0 };
const fail = (m) => { if (!S.error) S.error = m; S.ready = true; };
addEventListener('error', (e) => fail('window.error: ' + (e.message || e)));
addEventListener('unhandledrejection', (e) => fail('rejection: ' + ((e.reason && e.reason.message) || e.reason)));

const W = ${W}, H = ${H};
// preserveDrawingBuffer so the centre crop can be read back after the render
// rather than in the same compositing tick — the readback IS the check here.
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x22262b);
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x3a3020, 2.0));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
scene.add(key, key.target);

const cam = new THREE.PerspectiveCamera(35, W / H, 0.01, 1000);
const ANGLES = ${JSON.stringify(angles)};

new GLTFLoader().load('/model.glb', (gltf) => {
  try {
    scene.add(gltf.scene);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const sph = box.getBoundingSphere(new THREE.Sphere());
    S.bbox = { min: box.min.toArray(), max: box.max.toArray(),
      radius: sph.radius, center: sph.center.toArray() };
    gltf.scene.traverse((o) => {
      const g = o.geometry;
      if (!g) return;
      const verts = g.attributes.position ? g.attributes.position.count : 0;
      const idx = g.index ? g.index.count : 0;
      S.nodes.push({ name: o.name || '(unnamed)', type: o.type, verts, idx,
        tris: o.isMesh ? (idx || verts) / 3 : 0,
        attrs: Object.keys(g.attributes) });
      if (o.isMesh) S.meshes++;
      if (o.isPoints) S.points += verts;
    });
    S.extras = (gltf.parser.json.scenes && gltf.parser.json.scenes[0] || {}).extras || null;
    cam.near = Math.max(1e-4, sph.radius / 500);
    cam.far = sph.radius * 40;
    cam.updateProjectionMatrix();
    S.ready = true;
  } catch (e) { fail('post-load: ' + (e.stack || e)); }
}, undefined, (e) => fail('load: ' + ((e && (e.message || e.type)) || e)));

// WHAT THE CENTRE CROP IS, in numbers. Mean luminance answers "is this the
// black PNG"; \`ink\` — the share of pixels more than 4/255 off the crop's MODAL
// luminance, which on any framing is the background — answers "is anything in
// front of the background". A camera pointing past the specimen scores a fine
// mean and an ink of zero, which is the failure a mean alone cannot see.
function crop() {
  const gl = renderer.getContext();
  const cw = Math.max(2, Math.floor(W * 0.6)), ch = Math.max(2, Math.floor(H * 0.6));
  const px = new Uint8Array(cw * ch * 4);
  gl.readPixels((W - cw) >> 1, (H - ch) >> 1, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const hist = new Int32Array(256), lum = new Uint8Array(cw * ch);
  let sum = 0, max = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const L = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) | 0;
    lum[j] = L; hist[L]++; sum += L; if (L > max) max = L;
  }
  let mode = 0;
  for (let i = 1; i < 256; i++) if (hist[i] > hist[mode]) mode = i;
  let ink = 0;
  for (let j = 0; j < lum.length; j++) if (Math.abs(lum[j] - mode) > 4) ink++;
  return { mean: sum / lum.length / 255, max: max / 255, mode: mode / 255,
    ink: ink / lum.length, w: cw, h: ch };
}

// FIT THE BOX'S CORNERS, NOT THE BOUNDING SPHERE. A sphere fit is one line and
// it is what this tool did first — but a plant is tall and narrow (a Cathedral
// Fern is 0.91 x 2.36 x 0.82 m, sphere radius 1.33), so fitting the sphere put
// the specimen in about a third of the frame with the rest background. That is
// the framing \`tree_shot.mjs\` exists because of: "looks lost" and "is too
// sparse" are the same picture. It also blunts the check, since \`ink\` is
// measured on the centre crop and a subject that small barely reaches it.
//
// The solve is exact rather than a fudge factor. Put the camera at \`c + dir*d\`;
// for a corner \`a = q - c\` the camera-space offsets \`a·right\` and \`a·up\` do not
// depend on d (both axes are perpendicular to dir), and the depth is \`a·v + d\`.
// So each corner and each axis gives a lower bound \`d >= |offset|/t - a·v\`, and
// the answer is the largest of them. Whole box in shot at every angle, tightly.
function fitDistance(c, dir, up, right, v, halfV, halfH) {
  const b = S.bbox;
  let d = -Infinity;
  for (let i = 0; i < 8; i++) {
    const a = new THREE.Vector3(
      (i & 1 ? b.max[0] : b.min[0]) - c.x,
      (i & 2 ? b.max[1] : b.min[1]) - c.y,
      (i & 4 ? b.max[2] : b.min[2]) - c.z);
    const z = a.dot(v);
    d = Math.max(d, Math.abs(a.dot(up)) / halfV - z, Math.abs(a.dot(right)) / halfH - z);
  }
  return d;
}

window.__shoot = (name) => {
  const a = ANGLES.find((x) => x.name === name);
  const c = new THREE.Vector3().fromArray(S.bbox.center), r = S.bbox.radius;
  const A = THREE.MathUtils.degToRad(a.az), E = THREE.MathUtils.degToRad(a.el);
  const dir = new THREE.Vector3(Math.cos(E) * Math.sin(A), Math.sin(E), Math.cos(E) * Math.cos(A));
  const v = dir.clone().negate();                       // camera -> centre
  const right = new THREE.Vector3().crossVectors(v, new THREE.Vector3(0, 1, 0));
  // Straight down would make that cross product degenerate; no angle here is,
  // but a future one might be, and a NaN camera renders a clean empty frame.
  if (right.lengthSq() < 1e-9) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, v).normalize();
  const halfV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const d = fitDistance(c, dir, up, right, v, halfV, halfV * cam.aspect) * 1.06;
  cam.position.copy(c).addScaledVector(dir, d);
  cam.lookAt(c);
  // The key rides with the camera and is offset up and to one side, so a shape
  // reads at every angle. A world-fixed key becomes a backlight the moment the
  // camera orbits — the mistake blender_hero.py made and that four stills at
  // four azimuths failed to show (tools/README.md).
  key.position.copy(cam.position).add(new THREE.Vector3(0, r * 0.9, 0));
  key.target.position.copy(c);
  renderer.render(scene, cam);
  S.triangles = renderer.info.render.triangles;
  S.calls = renderer.info.render.calls;
  return crop();
};
</script>`;

// --- serve it --------------------------------------------------------------
//
// Module scripts will not load off file://, and the .glb has to arrive as bytes
// with a length, so this is an actual server rather than `page.setContent`.
// Ephemeral port: several of these can run at once, and nothing here should care
// what else is listening.
const MIME = { '.js': 'text/javascript', '.glb': 'model/gltf-binary',
  '.json': 'application/json', '.map': 'application/json' };

const angles = [
  { name: 'front', az: 0, el: 6 },
  { name: 'quarter', az: 52, el: 18 },
  { name: 'top', az: 26, el: 62 },
];
const html = PAGE(angles);

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const send = (file) => {
    const st = statSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream',
      'content-length': st.size });
    createReadStream(file).pipe(res);
  };
  try {
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (path === '/model.glb') return send(resolve(glbPath));
    if (path.startsWith('/three/')) {
      const f = resolve(CACHE, '.' + path.slice('/three'.length));
      if (!f.startsWith(CACHE)) { res.writeHead(403).end(); return; }
      return send(f);
    }
    res.writeHead(404).end();
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(String(e.message || e));
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

// --- render it -------------------------------------------------------------
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('requestfailed', (r) => errs.push(`REQUESTFAILED ${r.url()} ${r.failure()?.errorText}`));

const mb = (statSync(glbPath).size / 1048576).toFixed(1);
console.log(`loading ${glbPath} (${mb} MB) at ${W}x${H} on ${gpu ? 'ANGLE/Metal' : 'swiftshader'}`);
await pg.goto(`http://127.0.0.1:${port}/`);

// A software rasteriser parsing tens of MB of accessors is slow and that is not
// a failure — poll for the loader rather than waiting a fixed time, the way
// tree_shot.mjs polls for the crown. `ready` is set on the error path too, so a
// broken file reports its reason instead of timing out.
let stats;
try {
  await pg.waitForFunction(() => window.__stats && window.__stats.ready,
    null, { timeout: +(process.env.TIMEOUT || 180000) });
  stats = await pg.evaluate(() => window.__stats);
} catch (e) {
  stats = { error: `never became ready: ${e.message}`, nodes: [], bbox: null };
}

const fails = [];
if (stats.error) fails.push(`GLTFLoader: ${stats.error}`);

const shots = [];
if (!stats.error) {
  for (const a of angles) {
    const c = await pg.evaluate((n) => window.__shoot(n), a.name);
    await pg.screenshot({ path: `${outDir}/gltf_${a.name}.png` });
    shots.push({ ...a, ...c });
  }
  stats = { ...stats, ...await pg.evaluate(() => ({ triangles: window.__stats.triangles, calls: window.__stats.calls })) };
}

// --- what is in the file ---------------------------------------------------
//
// Printed whether it passed or not, so the run doubles as a sanity readout: the
// node names are the ones the layout promises ("specimen" over "lamina",
// "veins", "points"), and the bbox is in METRES, because positions are baked to
// metres on the way out. A Cathedral Fern that comes back 2.36 m tall is the
// same plant `tools/README.md` measures; one that comes back 37 m tall means the
// `unitM` scale never got applied.
console.log('');
console.log('node              type          verts      tris       attributes');
for (const n of stats.nodes || []) {
  console.log(n.name.padEnd(17), n.type.padEnd(13),
    String(n.verts).padEnd(10), String(n.tris | 0).padEnd(10), (n.attrs || []).join(' '));
}
if (stats.bbox) {
  const f = (v) => v.map((x) => x.toFixed(3)).join(', ');
  const size = stats.bbox.max.map((x, i) => x - stats.bbox.min[i]);
  console.log(`\nbbox  ${f(stats.bbox.min)}  ..  ${f(stats.bbox.max)}  (metres)`);
  console.log(`size  ${f(size)} m   height ${size[1].toFixed(2)} m   sphere r ${stats.bbox.radius.toFixed(3)} m`);
}
if (stats.extras) {
  const e = stats.extras;
  console.log(`extras  ${e.species} seed ${e.seed}  stage ${e.stage}  view ${e.view}  unitM ${e.unitM}  wFloor ${e.wFloor}`);
}

console.log('');
console.log('angle     az   el   mean    max     ink      png');
for (const s of shots) {
  console.log(s.name.padEnd(9), String(s.az).padEnd(4), String(s.el).padEnd(4),
    s.mean.toFixed(4).padEnd(7), s.max.toFixed(4).padEnd(7),
    s.ink.toFixed(4).padEnd(8), `${outDir}/gltf_${s.name}.png`);
}
console.log(`\nrendered ${(stats.triangles || 0).toLocaleString()} triangles in ${stats.calls || 0} draw calls;`
  + ` ${stats.meshes || 0} meshes, ${(stats.points || 0).toLocaleString()} points`);

// --- assert ----------------------------------------------------------------
//
// The thresholds are deliberately far from the measured values rather than
// tight around them, because this is a "did it draw" gate and not a look test.
// Measured on Cathedral Fern seed 21 at 1280x960 on swiftshader: mean
// 0.1495-0.1584 against a background of 0.1451, ink 0.0817-0.1241. A lost
// context reads 0.0000 for the mean; a camera pointing past the specimen reads
// the background's own 0.1451 with an ink of exactly zero.
//
// `ink` is low in absolute terms — a plant is mostly gaps, and this one is a
// narrow spire — so the threshold is 0.002, more than an order of magnitude
// under the smallest measured value and well over the zero a miss produces.
// Do not tighten it toward the measured band: a sparser species or a far-LOD
// export is a legitimately thinner picture, and this is a "did it draw" gate.
//
// ALL THREE FAILURE PATHS HAVE BEEN WATCHED FAILING, which is the only reason
// to believe any of them — a gate you have not watched fail is not a gate you
// know about, and this repo has a CI entry saying exactly that:
//
//   ink   a hand-written GLB holding two millimetre triangles a kilometre apart
//         is a VALID file: it loads, three.js reports `triangles = 2`, and the
//         centre crop comes back mean 0.1451 / ink 0.0000 at all three angles —
//         the background, exactly, and nothing else. This is the case that
//         justifies the whole file, because `triangles > 0` passes it.
//   mean  reproduced by rendering an empty scene on a black clear, so the
//         readback is a real all-zero drawing buffer: mean 0.0000, and the
//         assertion fires at all three angles. ⚠ That is the lost context's
//         PIXELS rather than a lost context — `WEBGL_lose_context` is not
//         exposed on the swiftshader build here, so the cause could not be
//         staged, only the symptom the check actually reads.
//   error a GLB truncated to 200 kB fails on the loader path with
//         "Invalid typed array length", before any angle is shot.
if (!stats.error && !(stats.triangles > 0)) fails.push(`nothing drawn: renderer.info.render.triangles = ${stats.triangles}`);
for (const s of shots) {
  if (s.mean < 0.02) fails.push(`${s.name}: centre crop is near-black (mean ${s.mean.toFixed(4)}) — the black-PNG failure, and the triangle count above does NOT rule it out`);
  else if (s.ink < 0.002) fails.push(`${s.name}: centre crop is flat (ink ${s.ink.toFixed(4)}) — background only, nothing of the specimen is in frame`);
}

if (errs.length) console.log('--- console ---\n' + errs.slice(0, 8).join('\n'));

await b.close();
server.close();

if (fails.length) {
  console.log('\nFAIL');
  for (const f of fails) console.log('  !! ' + f);
  process.exit(1);
}
console.log('\nOK — the GLB opens in stock three.js and draws');
