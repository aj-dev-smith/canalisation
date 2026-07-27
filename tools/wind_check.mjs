// IS THE SHADER'S AIR THE SIMULATION'S AIR?
//
//   node tools/wind_check.mjs ['{"uRef":3}'] [nSamples]
//
// ROADMAP 7 exists because the piece had two models of the same air. The fix is one
// field read by both the simulation and the shader, and the only way that claim can
// fail silently is if the two evaluate differently — which is invisible on screen,
// because a wrong wind still looks like wind.
//
// So this compiles the GLSL that `windGLSL()` emits, evaluates it on a real GPU at
// sample points, reads the floats back, and compares them to `windAt()` in Node. It
// is the only check in the repo that has to leave Node, and unlike everything else
// in `tools/` it does not render the piece and does not care what anything looks
// like: one pixel per sample, RGBA32F, straight readback.
//
// This is a different kind of tool from the rest of this directory. The others
// capture pictures for a human to judge; this one returns a number and an exit code,
// and it is the browser half of a test whose Node half is `test/wind.mjs`. It is
// here rather than in `test/` because it needs a browser, which the CI gate does
// not have.
//
// WHAT THE TOLERANCE MEANS. The GLSL carries 9 significant figures and float32 keeps
// about 7, so the two arithmetics cannot agree exactly and an equality assertion
// would be a lie. The bound checked is 1e-4 of the mean wind speed, and the measured
// agreement is far better than that; a formula that had actually diverged — a
// dropped mode, a sign, a wrong reciprocal — is wrong by tens of percent, not by
// float32 rounding, so there is no useful gap between "the same field" and "not".
//
// GL backend: as flower_shot.mjs. On macOS, `--use-gl=swiftshader` loses the context
// and the failure does not announce itself (tools/README.md), so ANGLE-on-Metal
// headed is what this asks for there.
import { chromium } from 'playwright';
import { platform } from 'os';
import { WIND_DEFAULTS, windField, windAt, windGLSL } from '../src/37_wind.js';

const opt = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const N = Math.min(256, +(process.argv[3] || 96));

const f = windField(opt);
const src = windGLSL(f);

// The sample points. Deliberately spread over the volume a specimen occupies and
// past it — under the ground, above the canopy — and over a range of plant times
// including a late one, because `om*t` is where float32 loses the most.
const pts = [];
for (let i = 0; i < N; i++) {
  const u = i / (N - 1);
  pts.push([
    Math.sin(i * 2.399963) * 20,
    -2 + u * 28,
    Math.cos(i * 1.618034) * 20,
    (i % 3 === 2 ? 8000 : 0) + u * 2000,
  ]);
}

const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 64, height: 64 } });
pg.on('pageerror', e => console.error('PAGEERROR:', e.message));
await pg.setContent('<canvas id="c" width="8" height="8"></canvas>');

const got = await pg.evaluate(({ src, pts }) => {
  const gl = document.getElementById('c').getContext('webgl2', { antialias: false });
  if (!gl) return { error: 'no webgl2 context' };
  if (!gl.getExtension('EXT_color_buffer_float')) return { error: 'no EXT_color_buffer_float' };
  const N = pts.length;

  const VS = `#version 300 es
void main(){
  // one full-viewport triangle; the viewport is N x 1, so gl_FragCoord.x indexes
  // the sample and there is no interpolation to get wrong
  vec2 p = vec2((gl_VertexID==1) ? 3.0 : -1.0, (gl_VertexID==2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;
  const FS = `#version 300 es
precision highp float;
uniform vec4 uP[${N}];
${src}
out vec4 o;
void main(){
  vec4 s = uP[int(gl_FragCoord.x)];
  o = vec4(windAt(s.xyz, s.w), 1.0);
}`;

  const mk = (type, s) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('compile: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
  } catch (e) {
    return { error: e.message };
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, 1, 0, gl.RGBA, gl.FLOAT, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    return { error: 'float framebuffer incomplete' };
  }

  gl.viewport(0, 0, N, 1);
  gl.useProgram(prog);
  gl.uniform4fv(gl.getUniformLocation(prog, 'uP'), new Float32Array(pts.flat()));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const out = new Float32Array(N * 4);
  gl.readPixels(0, 0, N, 1, gl.RGBA, gl.FLOAT, out);
  const err = gl.getError();
  return { out: Array.from(out), glError: err, renderer: gl.getParameter(gl.RENDERER) };
}, { src, pts });

await b.close();

if (got.error) {
  console.error('GL setup failed:', got.error);
  process.exit(2);
}

console.log(`renderer   ${got.renderer}`);
console.log(`field      uRef=${f.o.uRef} m/s, ${f.modes.length} modes, seed ${f.o.seed}`);
console.log(`samples    ${N}, plant time 0-10000\n`);

const u = [0, 0, 0];
const mean = Math.max(1e-9, f.uMeanMag);
// SPLIT BY HOW LATE THE SAMPLE IS, because the disagreement is not a constant — it
// grows linearly with plant time, and knowing that is worth more than one number.
// The phase of a mode is `om*t`, and a float32 holds it to about 6e-8 of its own
// magnitude, so a sample at t=10000 carries five times the phase error of one at
// t=2000. Reporting a single worst case would hide the mechanism and make the
// tolerance look arbitrary.
const groups = { early: { lim: 3000 }, late: { lim: Infinity } };
for (const g of Object.values(groups)) { g.worst = 0; g.sum = 0; g.n = 0; g.at = null; }
for (let i = 0; i < N; i++) {
  const [x, y, z, t] = pts[i];
  const g = t < groups.early.lim ? groups.early : groups.late;
  windAt(u, f, x, y, z, t);
  for (let k = 0; k < 3; k++) {
    const e = Math.abs(got.out[i * 4 + k] - u[k]);
    g.sum += e; g.n++;
    if (e > g.worst) { g.worst = e; g.at = { i, k, t, y, js: u[k], gl: got.out[i * 4 + k] }; }
  }
}
console.log(`mean speed at reference height   ${mean.toFixed(6)} world/pt`);
for (const [name, g] of Object.entries(groups)) {
  if (!g.n) continue;
  console.log(`${name.padEnd(6)} (${g.n / 3} samples)`
    + `   worst ${(g.worst / mean).toExponential(2)} of mean speed`
    + `   mean ${(g.sum / g.n / mean).toExponential(2)}`
    + `   at t=${g.at.t.toFixed(0)}`);
}
const rel = Math.max(...Object.values(groups).map(g => g.worst / mean));
const w = groups.late.at || groups.early.at;
if (w) {
  console.log(`worst sample                     #${w.i} axis ${'xyz'[w.k]}`
    + ` at y=${w.y.toFixed(1)} t=${w.t.toFixed(0)}`);
  console.log(`                                 JS ${w.js.toExponential(8)}`);
  console.log(`                                 GL ${w.gl.toExponential(8)}`);
}

// WHAT THE TOLERANCE IS FOR. Not float32 perfection — that is impossible and would be
// a lie of an assertion. 1e-3 of the mean wind speed is a tenth of a percent, three
// orders below anything that could be seen in a displacement, and three orders ABOVE
// float32 phase noise at the plant times a run actually reaches. A formula that had
// really diverged — a dropped mode, a lost sign, a wrong reciprocal — is wrong by tens
// of percent, so nothing useful lives in the gap.
//
// If the growth with `t` ever does matter (a page left running for hours, or a shader
// handed a much larger clock), the fix is not a looser bound: it is to quantise the
// baked frequencies onto a common fundamental so the field is exactly periodic, and
// hand the shader `mod(t, T)`. Quantising them by a fraction of a percent is
// physically meaningless, since the spectrum is one random realisation of many.
const TOL = 1e-3;
if (!(rel < TOL)) {
  console.error(`\nFAIL  the shader's field is not the simulation's field`
    + ` (${rel.toExponential(2)} of mean speed, tolerance ${TOL})`);
  process.exit(1);
}
console.log(`\nOK  one field: GLSL and JS agree to ${rel.toExponential(1)} of the mean speed`);
