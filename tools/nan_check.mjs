// NaN probe for the MAIN page — does canalisation.html flash the black square too?
//
// THE ANSWER IS NO, AND THE ANSWER IS MEASURED. 133,731 frames across nine
// configurations, on ANGLE-on-Metal, headed, with a positive control that fires:
// **not one non-finite texel, and not one one-frame hole.** The detail is at the
// bottom of this header; read the mechanism first, because the interesting part
// is that the main page has every ingredient and still does not fire.
//
// flowers.html's one-frame black square was convicted (2026-08-12) as
// `normalize(vN)` on a vertex normal of EXACTLY zero: a fragment that lands on
// one divides by zero, the NaN goes into the HDR scene target, two separable
// gaussians spread one texel into an axis-aligned RECTANGLE, and the comp's
// mix()/aces()/pow() all pass NaN to the screen. `flowers/30_scene.js` guards it.
//
// `src/60_render.js`'s MESH_FS does `normalize(vN)` with NO guard of any kind,
// on the SAME geometry — `blade()` in `src/50_geom.js` is shared — through its
// own bloom+defocus chain. Both pages therefore had the same suspect and only
// one had ever been searched.
//
// THE OBVIOUS ALTERNATIVE EXPLANATIONS ARE RULED OUT MECHANICALLY, NOT BY EYE.
// "Maybe the main page's tone map clamps the NaN" is the first thing to check
// and it is wrong: strip comments and whitespace from both comp shaders and they
// differ in exactly one token — `max(c, 0.0)` against `max(c, vec3(0.0))`, which
// is a GLSL ES 1.0 requirement and not a semantic difference. Same `aces()`, same
// `clamp`, same `pow`, same `mix(scene, dof, coc)`, same three-blur bloom and
// two-blur defocus. And it is not the threshold either: `CONTROL=1` patches a
// deliberate NaN into this page's MESH_FS and the black square appears, so the
// whole chain works here. Only the trigger is missing.
//
// THE ZERO NORMALS ARE THERE, AND THE MAIN PAGE HAS MORE OF THEM. Counted
// headlessly first, which is the cheap half of the question: across the nine
// species at seed 1337 the main page's tri stream carries **41,775 zero normals
// in 565,932 vertices (7.38%)** against the flowers stream's 1.70%, and no
// non-unit normals at all.
//
// THE STRUCTURE IS WHAT DECIDES IT, AND IT COMES OUT OF `blade()`. At u = 0 the
// blade's half-width is zero, so all MV+1 grid vertices of that row are the SAME
// POINT; `Pv - P` is the zero vector there, the cross product is zero, and
// `v3norm` hands back an exactly-zero normal. So per quad in row 0 you get one
// triangle with TWO zero normals — and it has **exactly zero area**, because two
// of its corners are the same point — and one triangle with ONE zero normal,
// which does have area. Measured, and it is not approximate: of 13,925 two-zero
// triangles, 13,924 have area identically 0 and the last (one needle on Ashfall
// Spire) has 1.05e-6.
//
// That is the whole result. A two-zero triangle has a zero-normal EDGE — a set
// of positive measure, where every fragment would divide by zero — but it is
// collapsed to a point and rasterises nothing. A one-zero triangle is drawn, but
// its zero-normal locus is a single VERTEX: to get an exactly-zero interpolant a
// sample has to land on that vertex to within float32, and anywhere near it the
// normal is small-but-finite, so normalize() returns garbage rather than NaN.
// The main page never won that coincidence. flowers.html won it 69 times in
// 4,921 frames at seed 1337 and zero times at seeds 21 and 4242, so it is rare
// there too, and the difference between the pages is framing and rasterisation
// rather than geometry: `tools/flowers_zeron.mjs` shows the surviving zero-normal
// population is the same triangles, species for species (Cathedral Fern 1,230 on
// both), because flowers' `10_capture.js` drops the no-area ones the main page
// keeps and drawing nothing is what a no-area triangle does anyway.
//
// So the guard was NOT ported. `MARK=1` is the reason it would have cost nothing
// and bought nothing: it paints the fragments the guard would discard instead of
// discarding them, and 29,381 frames — including a fully grown conifer and a
// blade base filling the frame — marked **zero blocks**. The guard is a no-op on
// this page today. What would change that, and would want this file run again:
// anything that gives a two-zero triangle area (a blade base with width, a
// tessellation change in `blade()`, a vertex jitter), MSAA on the scene target,
// or a driver that flushes a small interpolant to zero.
//
// THE INSTRUMENT IS THE NON-FINITE TEXEL, NOT A SCREENSHOT DIFFER. The wind
// never stops and the director drifts perpetually, so two frames of the
// unchanged build differ everywhere and a picture differ has a floor far above
// the artefact. Instead, after every app draw, reduce the HDR targets on the
// GPU — one output texel per 8x8 block, `texelFetch` at every texel so nothing
// goes unlooked-at — and classify rather than count:
//
//   NaN  iff  !(v < 1e30) && !(v > -1e30)     (a NaN fails every comparison)
//   Inf  iff  exactly one of those holds
//
// which needs no isnan(). Alpha is classified separately because it is not
// colour: every surface writes linear depth there and the comp reads it as
// `sc.a * 100.0`, so a NaN in alpha alone would blacken a region that has a
// perfectly finite picture underneath it.
//
// The screen is watched too, with `flowers_hole.mjs`'s three-condition
// signature — a tile goes NEAR BLACK, the camera is STILL, and it RECOVERS on
// the next frame — because "there is a NaN in a buffer" and "a viewer sees a
// hole" are different claims and this file should be able to make both. ⚠ Its
// still-camera condition means it contributes NOTHING on a garden run or a
// forced close-up, where the eye never stops moving and no candidate is ever
// raised: read `darkest collapse seen 999/255` as "this half was inert", not as
// a clean result. The buffer scan is the instrument that ran everywhere.
//
//   node tools/nan_check.mjs geom                   # section 0: no browser at all
//   node tools/nan_check.mjs <seconds> [garden] [seed] [species]
//   node tools/nan_check.mjs 180                    # solo hero, 3 minutes
//   node tools/nan_check.mjs 240 7 1337             # a stand of seven, seed 1337
//   node tools/nan_check.mjs 150 0 1337 'Ashfall Spire'
//   CLOSE=1 GROW=40 node tools/nan_check.mjs 150    # parked on a blade base
//   DPR=2 node tools/nan_check.mjs 180              # 4x the fragment samples
//
// CONTROL=1 IS THE POSITIVE CONTROL AND IT IS NOT OPTIONAL. A zero from an
// instrument nobody has watched fire is not a measurement — this project has
// twice had a metric whose interesting value was unreachable by construction.
// It patches MESH_FS to make a NaN the artefact's own way on a sparse set of
// fragments, and the run must come back non-zero. `CONTROL=huge` checks the
// readback path on its own with a finite marker. Run one of them once per
// session before believing a clean run. The FIRST version of the NaN control
// wrote `normalize(vec3(0.0))`, which is a compile-time constant: ANGLE folded
// it away, the control came back clean, and it would have been read as "the
// probe works and the page is fine". It builds the zero vector out of a uniform
// that is never written, so it is zero at runtime and unknown at compile time.
//
// GUARD=1 patches flowers' guard into MESH_FS at runtime, so a before and after
// happen in ONE session on ONE backend rather than across two builds. MARK=1 is
// the better half of that A/B and is described above. VIEW=cells|flux|field
// switches the render view first. HUGE= lowers the finite-but-absurd threshold.
//
// --- the runs behind "no", all with the shipped shader ----------------------
//   solo hero, 25s / 240s / 60s at HUGE=100      2,992 + 28,789 + 7,155 frames
//   garden of 7, seed 1337, 240s                              26,018 frames
//   solo hero at DPR 2 (2200x1560), 180s                      21,543 frames
//   'Ashfall Spire' seed 1337, 150s (58% of all zero normals)    697 frames
//   'Cathedral Fern' seed 21, 100s                            11,986 frames
//   'Abyssal Frond' seed 4242, 100s                           11,751 frames
//   parked on a blade base, 20s + 150s                  2,400 + 18,000 frames
//                                                    ------------------------
//                                                     133,731 frames, 0 hits
// and with MARK=1: solo 120s, conifer 120s, blade base 120s = 29,381 frames,
// 0 fragments the guard would have removed.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , secondsArg = '180', gardenArg = '0', seedArg = '1337', species = ''] = process.argv;
const seconds = +secondsArg, garden = +gardenArg, seed = +seedArg;

// --- section 0: the geometry, in Node, before any browser starts -----------
//
// `node tools/nan_check.mjs geom` and nothing else runs. It is separate because
// it costs ~50s of growth and the browser half does not need it, but it is the
// half that EXPLAINS the browser half, and a negative result nobody can
// re-measure is just a story. It walks the shipped tri stream through the
// shipped `drawSpecimen` — the same stand-in App `test/views.mjs` uses, for the
// same reason: a tool with its own copy of the draw eventually measures a
// different program from the one that ships.
if (secondsArg === 'geom') {
  const { App, SPECIES } = await import('../src/70_app.js');
  const { Buffers, setView } = await import('../src/50_geom.js');
  const { v3 } = await import('../src/00_math.js');
  const standIn = () => ({
    cam: { eye: v3(0, 4, 15), dist: 15, fov: 0.72 },
    viewName: 'natural', view: App.prototype.view,
    setBladeLOD: App.prototype.setBladeLOD, bladeMesh: App.prototype.bladeMesh,
    bladeMU: 22, bladeMV: 10, bladeRef: 4.3,
    detail: 0, t: 12000, _watch: null, _replay: null, showMeristem: true,
    ringWidth: 0, windU: undefined, senesceHeld: false,
  });
  const STEPS = +(process.env.STEPS || 2200);
  const T = { verts: 0, zero: 0, nonUnit: 0, t1: 0, t1area: 0, t2: 0, t2area: 0, maxA2: 0 };
  console.log(`the tri stream at seed ${seed}, ${STEPS} steps, per species\n`);
  console.log('species                  verts    zeroN  nonUnit   1-zero tris (with area)   2-zero tris (with area)');
  for (const name of Object.keys(SPECIES)) {
    const app = standIn();
    const S = App.prototype.makeSpecimen.call(app, name, seed);
    for (let s = 0; s < STEPS; s++) S.plant.step(1);
    const px = 2 * Math.tan(app.cam.fov / 2) / 1000;
    setView(app.cam.eye, app.cam.dist * px * 1.5, px);
    const B = new Buffers();
    App.prototype.drawSpecimen.call(app, B, S);
    const a = B.tri, n = B.triN, ST = 10;
    const r = { verts: 0, zero: 0, nonUnit: 0, t1: 0, t1area: 0, t2: 0, t2area: 0 };
    for (let k = 0; k + ST * 3 <= n; k += ST * 3) {
      let zt = 0; const p = [];
      for (let v = 0; v < 3; v++) {
        const o = k + v * ST;
        const L = Math.hypot(a[o + 3], a[o + 4], a[o + 5]);
        r.verts++;
        if (L === 0) { r.zero++; zt++; } else if (Math.abs(L - 1) > 1e-3) r.nonUnit++;
        p.push([a[o], a[o + 1], a[o + 2]]);
      }
      if (zt === 0) continue;
      // twice the triangle's area, as the cross product of two edges
      const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
      const vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
      const A = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      if (zt === 1) { r.t1++; if (A > 0) r.t1area++; }
      else { r.t2++; if (A > 0) { r.t2area++; if (A > T.maxA2) T.maxA2 = A; } }
    }
    for (const k of Object.keys(r)) T[k] += r[k];
    console.log(`${name.padEnd(20)} ${String(r.verts).padStart(8)} ${String(r.zero).padStart(8)}` +
      ` ${String(r.nonUnit).padStart(8)}   ${String(r.t1).padStart(8)} (${r.t1area})` +
      `             ${String(r.t2).padStart(8)} (${r.t2area})`);
  }
  console.log(`\nTOTAL ${T.verts} vertices: ${T.zero} zero (${(100 * T.zero / T.verts).toFixed(2)}%),` +
    ` ${T.nonUnit} non-unit.`);
  console.log(`  ${T.t1} triangles carry ONE zero normal, ${T.t1area} of them with area —` +
    ` their zero-normal locus is a single VERTEX.`);
  console.log(`  ${T.t2} carry TWO, ${T.t2area} of them with area (largest ${T.maxA2.toExponential(3)}) —` +
    ` a two-zero triangle has a zero-normal EDGE,`);
  console.log('  so this is the row that could divide by zero over a whole span, and it is collapsed to a point.');
  console.log(T.t2area > 1
    ? '\n⚠ A ZERO-NORMAL EDGE NOW HAS AREA. Re-run the browser half — the argument above no longer holds.'
    : '\nThe only drawable zero-normal locus is a point, which is why the browser half finds nothing.');
  process.exit(0);
}
const withGuard = !!process.env.GUARD;
const control = process.env.CONTROL || '';
const view = process.env.VIEW || '';
// The `huge` class is the OTHER artefact's threshold — the near-degenerate
// triangle whose varyings come from outside their own hull, which flowers
// guards with the same line's `<= 1.01` half. Its measured peak there was
// 8,863 in the HDR target against a frame-peak median of 2.4, so the default
// 1e4 sits just ABOVE the thing it would have to catch. HUGE= lowers it.
const hugeT = process.env.HUGE || '1e4';
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
// DPR=2 quadruples the fragment samples, which is the one lever that raises the
// chance of a sample landing on the single vertex where the interpolant is
// exactly zero. The renderer caps the ratio at 2 itself.
const pg = await b.newPage({ viewport: { width: 1100, height: 780 },
  deviceScaleFactor: +(process.env.DPR || 1) });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pathToFileURL(process.cwd() + '/canalisation.html').href);
await pg.waitForFunction(() => window.__app && window.__app.renderer, null, { timeout: 90000 });
console.log(`canalisation.html   garden ${garden || 'none (solo hero)'}   seed ${seed}` +
  `   guard ${withGuard ? 'PATCHED IN' : 'as shipped'}   view ${view || 'natural'}`);

if (species) await pg.evaluate(([s, sd]) => window.__app.newSpecimen(s, sd), [species, seed]);
if (view) await pg.evaluate((v) => window.__app.setRenderView(v), view);
if (garden > 1) {
  await pg.evaluate(([n, sd]) => window.__app.plantGarden(n, { seed: sd, radius: 20 }), [garden, seed]);
  await pg.waitForFunction(() => !window.__app.gardenWarming(), null, { timeout: 300000, polling: 200 });
  console.log('stand established');
}
await pg.waitForTimeout(3000);

// CLOSE=1 is the adversarial framing. The zero normals come off the collapsed
// BLADE BASE, so the hostile picture is a blade base filling the frame: the
// director's own `organ` shot goes there, but only for ten seconds at a time
// and only when it picks it. This parks there for the whole run, the way
// tools/close.mjs does, and stops the clock so the specimen cannot grow past it.
if (process.env.CLOSE) {
  // let the specimen actually GROW first — parked on a three-second-old seedling
  // this run reported 1,062 triangles and would have proved nothing
  const grow = +(process.env.GROW || 60);
  await pg.evaluate((s) => { window.__app.speedMul = s; }, +(process.env.SPEED || 4));
  await pg.waitForTimeout(grow * 1000);
  const parked = await pg.evaluate(() => {
    const a = window.__app;
    const w = a.watchOrgan && a.watchOrgan();
    const ax = a.plant.axes[0];
    const org = (w && w.org) || (ax && ax.organs[Math.max(0, ax.organs.length - 4)]);
    if (!org || !org.frame) return null;
    a.speedMul = 0;
    a.userDriving = true;              // the director must not take it back
    a.cam.autoRot = false;
    const o = org.frame.o;
    a.cam.cx = o[0]; a.cam.tgtY = o[1]; a.cam.cz = o[2];
    a.cam.dist = 2.2; a.cam.el = 0.4;
    a.plant.bounds = () => ({ cx: o[0], cy: o[1], cz: o[2], w: 1.2, h: 0.9 });
    return { dist: a.cam.dist, at: [+o[0].toFixed(2), +o[1].toFixed(2), +o[2].toFixed(2)] };
  });
  if (!parked) { console.log('CLOSE failed — no organ with a frame to park on'); await b.close(); process.exit(1); }
  console.log(`parked on a blade base at ${JSON.stringify(parked.at)}, dist ${parked.dist}`);
  await pg.waitForTimeout(2000);
}

// --- the candidate guard, patched into the SHIPPED shader source -----------
// The renderer compiles MESH_FS once in its constructor, so switching guards
// means recompiling that program and swapping it in. Everything else about the
// draw is untouched.
if (withGuard || control || process.env.MARK) {
  // Exactly one line changes, and it goes where the shipped guard would go.
  // The zero vector is built from a UNIFORM that is never written, so it is
  // zero at runtime and unknown at compile time. `normalize(vec3(0.0))` is a
  // compile-time constant and the first version of this control used it: ANGLE
  // folded it away and the control came back clean, which would have been read
  // as "the probe works and the page is fine". A control that cannot fire is
  // the exact failure it exists to rule out.
  // MARK=1 is the A/B, and it is exact where a screenshot differ is not. It
  // paints the fragments the guard WOULD discard instead of discarding them, so
  // the `huge` class counts them directly. Zero marked blocks is a proof that
  // the guard removes no fragment and therefore cannot change a pixel — which a
  // before/after picture cannot establish here, because the wind never stops.
  const PROLOGUE = process.env.MARK
    ? `  if (!(length(vN) > 0.0 && length(vN) <= 1.01)) { o = vec4(vec3(1e6), 1.0); return; }`
    : control === 'huge'
    ? `  if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 977.0) < 1.0) {
    o = vec4(vec3(1e6), 1.0); return;
  }`
    : control
      ? `  if (mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 977.0) < 1.0) {
    o = vec4(normalize(vN * uZero), 1.0); return;
  }`
      : `  if (!(length(vN) > 0.0 && length(vN) <= 1.01)) discard;`;
  const okPatch = await pg.evaluate((PROLOGUE) => {
    const R = window.__app.renderer, gl = R.gl;
    // recover the sources the way the renderer built them
    const HEAD = '#version 300 es\nprecision highp float;';
    const VS = `${HEAD}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aEmis;
uniform mat4 uVP;
out vec3 vP; out vec3 vN; out vec3 vC; out float vE;
void main(){ vP=aPos; vN=aNrm; vC=aCol; vE=aEmis; gl_Position=uVP*vec4(aPos,1.0); }`;
    const FS = `${HEAD}
in vec3 vP; in vec3 vN; in vec3 vC; in float vE;
uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot, uFog;
uniform float uFogD, uFogNear;
uniform float uZero;
out vec4 o;
void main(){
${PROLOGUE}
  vec3 N = normalize(vN);
  vec3 V = normalize(uEye - vP);
  if (dot(N,V) < 0.0) N = -N;
  float d = max(dot(N, uKey), 0.0);
  float back = pow(max(dot(-N, uKey), 0.0), 2.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 amb = mix(uAmbBot, uAmbTop, N.y*0.5+0.5);
  vec3 c = vC * (amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7;
  c += vC * vE * 3.0;
  float dist = length(vP-uEye);
  float f = 1.0 - exp(-max(0.0, dist - uFogNear)*uFogD);
  c = mix(c, uFog, clamp(f,0.0,1.0)*0.80);
  o = vec4(c, dist*0.01);
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const n = gl.getActiveUniform(p, i).name;
      p.u[n] = gl.getUniformLocation(p, n);
    }
    for (const k of ['uVP', 'uEye', 'uKey', 'uKeyCol', 'uAmbTop', 'uAmbBot', 'uFog', 'uFogD', 'uFogNear'])
      if (p.u[k] === undefined) return false;
    R.pMesh = p;
    return true;
  }, PROLOGUE);
  // ASSERT the patch landed, rather than trusting it — tree_shot.mjs's rule.
  if (!okPatch) { console.log('PATCH FAILED — every uniform must survive the relink'); await b.close(); process.exit(1); }
  console.log(process.env.MARK ? 'A/B MARKER patched in: MESH_FS paints what the guard would discard'
    : control ? 'POSITIVE CONTROL patched in: MESH_FS now makes a NaN on purpose'
      : 'guard patched into the live MESH_FS program');
}

const out = await pg.evaluate(async ({ seconds, hugeT }) => {
  const A = window.__app, R = A.renderer, gl = R.gl;
  const HEAD = '#version 300 es\nprecision highp float;\n#define HUGE_T ' + hugeT;
  const VS = `${HEAD}
out vec2 uv;
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); uv = p; gl_Position = vec4(p*2.0-1.0,0.0,1.0); }`;
  // exact coverage: one output texel per 8x8 block, texelFetch at every texel
  const FS = `${HEAD}
in vec2 uv; out vec4 o;
uniform sampler2D uT;
void cls(float v, inout float nan, inout float inf, inout float huge){
  bool lo = !(v < 1e30), hi = !(v > -1e30);
  if (lo && hi) nan = 1.0;
  else if (lo || hi) inf = 1.0;
  else if (abs(v) > HUGE_T) huge = 1.0;
}
void main(){
  ivec2 base = ivec2(gl_FragCoord.xy) * 8;
  float nanC=0.0, infC=0.0, hugeC=0.0, nanA=0.0, infA=0.0;
  for (int j=0;j<8;j++) for (int i=0;i<8;i++) {
    vec4 c = texelFetch(uT, base + ivec2(i,j), 0);
    cls(c.r,nanC,infC,hugeC); cls(c.g,nanC,infC,hugeC); cls(c.b,nanC,infC,hugeC);
    float d=0.0; cls(c.a,nanA,infA,d);
  }
  o = vec4(nanC*0.5+infC*0.25, nanA*0.5+infA*0.25, hugeC, 1.0);
}`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const uT = gl.getUniformLocation(prog, 'uT');
  const vao = gl.createVertexArray();

  const mkTarget = (w, h) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, tex, w, h, buf: new Uint8Array(w * h * 4) };
  };
  let targets = null, dims = null;
  const ensure = () => {
    const key = R.W + 'x' + R.H;
    if (dims === key) return;
    dims = key;
    const sw = Math.ceil(R.W / 8), sh8 = Math.ceil(R.H / 8);
    const hw = Math.max(2, R.W >> 1), hh = Math.max(2, R.H >> 1);
    targets = { scene: mkTarget(sw, sh8), dof: mkTarget(Math.ceil(hw / 8), Math.ceil(hh / 8)),
      srcScene: [R.W, R.H], srcDof: [hw, hh] };
  };

  const scan = (tex, t) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.f);
    gl.viewport(0, 0, t.w, t.h);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uT, 0);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, t.buf);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const hits = [];
    for (let k = 0; k < t.w * t.h; k++) {
      const o = k * 4;
      if (t.buf[o] > 8 || t.buf[o + 1] > 8 || t.buf[o + 2] > 8)
        hits.push({ x: (k % t.w) * 8, y: ((k / t.w) | 0) * 8,
          nanC: t.buf[o] > 100, infC: t.buf[o] > 30 && t.buf[o] < 100,
          nanA: t.buf[o + 1] > 100, infA: t.buf[o + 1] > 30 && t.buf[o + 1] < 100,
          huge: t.buf[o + 2] > 8 });
    }
    return hits;
  };

  // --- the screen, read with flowers_hole.mjs's three-condition signature ---
  const cv = R.canvas, GX = 16, GY = 12;
  const small = document.createElement('canvas');
  small.width = GX * 8; small.height = GY * 8;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  const screenGrid = () => {
    ctx.drawImage(cv, 0, 0, small.width, small.height);
    const d = ctx.getImageData(0, 0, small.width, small.height).data;
    const g = new Float32Array(GX * GY);
    for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) {
      const i = (y * small.width + x) * 4;
      g[((y >> 3) * GX) + (x >> 3)] += (d[i] * 0.30 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 64;
    }
    return g;
  };

  const Rres = { n: 0, scFrames: 0, dfFrames: 0, ev: [], holes: 0, cand: 0, minSeen: 999,
    counts: { nanC: 0, infC: 0, nanA: 0, infA: 0, huge: 0 }, W: 0, H: 0, png: null,
    tri: 0, line: 0, pt: 0, triPeak: 0, linePeak: 0 };
  let prevScr = null, prevEye = null, pending = null;

  const orig = R.draw.bind(R);
  R.draw = (cam, pal, t) => {
    orig(cam, pal, t);
    ensure();
    Rres.n++; Rres.W = R.W; Rres.H = R.H;
    Rres.tri = R.nTri; Rres.line = R.nLine; Rres.pt = R.nPt;
    // the PEAK, not the last frame — a run that outlives its specimen would
    // otherwise report the skeleton it ended on and imply nothing was drawn
    if (R.nTri > Rres.triPeak) Rres.triPeak = R.nTri;
    if (R.nLine > Rres.linePeak) Rres.linePeak = R.nLine;
    const hs = scan(R.fbo.scene.tex, targets.scene);
    const hd = scan(R.fbo.dofB.tex, targets.dof);
    if (hs.length) {
      Rres.scFrames++;
      for (const h of hs) for (const k of Object.keys(Rres.counts)) if (h[k]) Rres.counts[k]++;
      if (Rres.ev.length < 24) Rres.ev.push({ frame: Rres.n, sceneBlocks: hs.length,
        dofBlocks: hd.length, first: hs[0] });
      if (!Rres.png) { try { Rres.png = cv.toDataURL(); } catch (e) { /* tainted */ } }
    } else if (hd.length) {
      Rres.dfFrames++;
      if (Rres.ev.length < 24) Rres.ev.push({ frame: Rres.n, sceneBlocks: 0, dofBlocks: hd.length, first: hd[0] });
    }
    // the screen half: a hole is ONE frame, on a STILL camera, going NEAR BLACK
    const scr = screenGrid();
    const eyeMove = prevEye ? Math.hypot(cam.eye[0] - prevEye[0], cam.eye[1] - prevEye[1],
      cam.eye[2] - prevEye[2]) : 9;
    prevEye = [cam.eye[0], cam.eye[1], cam.eye[2]];
    if (pending) {
      const p = pending; pending = null;
      const back = p.tiles.filter(k => scr[k] > p.before[k] * 0.6);
      if (back.length >= Math.max(1, p.tiles.length * 0.6)) Rres.holes += back.length;
    }
    if (prevScr && eyeMove < 0.02) {
      const tiles = [];
      for (let k = 0; k < GX * GY; k++) {
        if (scr[k] < prevScr[k] * 0.45 && prevScr[k] - scr[k] > 26) {
          if (scr[k] < Rres.minSeen) Rres.minSeen = +scr[k].toFixed(2);
          if (scr[k] < 12) tiles.push(k);
        }
      }
      if (tiles.length) { Rres.cand++; pending = { tiles, before: prevScr }; }
    }
    prevScr = scr;
  };

  await new Promise(res => setTimeout(res, seconds * 1000));
  R.draw = orig;
  return Rres;
}, { seconds, hugeT });

console.log(`\nframes ${out.n}   scene ${out.W}x${out.H}   PEAK drawn: ${out.triPeak} tri verts` +
  ` (${(out.triPeak / 3) | 0} triangles), ${out.linePeak} line verts   [last frame ${out.tri}/${out.line}]`);
console.log(`frames with a non-finite texel in the SCENE target:            ${out.scFrames}`);
console.log(`frames with one in the DEFOCUS target but NOT in the scene:    ${out.dfFrames}`);
console.log('scene blocks by class:', JSON.stringify(out.counts));
console.log(`screen: near-black candidates ${out.cand}   CONFIRMED one-frame holes ${out.holes}` +
  `   darkest collapse seen ${out.minSeen}/255`);
for (const e of out.ev.slice(0, 20)) {
  const f = e.first;
  console.log(`  f${e.frame}  sceneBlocks ${e.sceneBlocks} dofBlocks ${e.dofBlocks}  first at px (${f.x},${f.y})` +
    `  nanRGB ${+f.nanC} infRGB ${+f.infC} nanA ${+f.nanA} infA ${+f.infA} huge ${+f.huge}`);
}
if (out.png) {
  const { writeFileSync, mkdirSync } = await import('fs');
  mkdirSync('shots', { recursive: true });
  writeFileSync('shots/nan_first.png', Buffer.from(out.png.split(',')[1], 'base64'));
  console.log('saved shots/nan_first.png (the first frame carrying one)');
}
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
// THE SENSE OF THE EXIT CODE FLIPS UNDER CONTROL AND MARK, and that is the
// point of having them: a shipped-shader run is bad if it finds something, and
// a control run is bad if it finds NOTHING. Without this, `CONTROL=1 && echo
// ok` would congratulate an instrument that had been folded away by the
// compiler — which is exactly how the first control failed.
const hit = !!(out.scFrames || out.dfFrames || out.holes);
if (control || process.env.MARK) {
  console.log(hit ? 'control/marker FIRED, as it must' : 'control/marker DID NOT FIRE — the instrument is blind, not the page');
  process.exit(hit ? 0 : 1);
}
process.exit(hit ? 1 : 0);
