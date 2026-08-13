// Hole probe — WHICH PASS is the one-frame black square in?
//
// tools/flowers_black.mjs established that the ~128 px screen-axis-aligned
// square of pure black is in the drawing buffer and not in the readback. It did
// not say where in the post chain the hole is made, and its collapse test is
// not specific: run at seed 1337 it flags 232 tiles in 2,613 frames, in
// consecutive runs of six frames with luminance falling 60 -> 25, which is a
// camera cut and not a hole. THE DETECTOR HERE IS THE ARTEFACT'S OWN
// SIGNATURE, three conditions rather than one:
//   - the tile goes NEAR BLACK (< 12 of 255), not merely darker;
//   - the camera is still (eyeMove < 0.02), so a cut cannot qualify;
//   - it RECOVERS on the next frame — a hole is one frame, a shadow is not.
//
// The chain is scene -> bright -> 3x(blurX,blurY) -> bloom, scene -> 2x(blurX,
// blurY) -> defocus, then one comp to the screen (30_scene.js:render). Every
// intermediate is a half-float target, so every one of them can hold Inf, and
// a half-float target is exactly where an Inf can be MADE: the shipped grade
// only clamps at the very end, in aces(), and aces(Inf) is Inf/Inf = NaN.
//
// So each frame, after the app has rendered, reduce every intermediate to a
// 16x12 tile grid on the GPU — mean luminance per tile, plus a flag for any
// texel that is not finite (`abs(c) < 1e30` is false for both NaN and Inf, and
// needs no isnan(), which GLSL ES 1.0 does not have) — and read the four grids
// back. On a confirmed hole, the same tile is looked up in all four grids for
// the same frame: the first target that collapsed with it names the pass, and
// the non-finite flag says whether the app made an Inf or the driver dropped a
// tile.
//
// Costs four readPixels a frame, so it runs at roughly half framerate. That
// halves the frames per wall-clock second, not the rate per frame.
//
//   node tools/flowers_hole.mjs '<query>' <seconds> <outdir>
//   node tools/flowers_hole.mjs 'garden=7&seed=1337&ff=2200' 135 shots/hole
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const [, , query = 'garden=7&seed=1337&ff=2200', secondsArg = '135', outdir = 'shots/hole'] = process.argv;
const angle = process.env.ANGLE || 'metal';
mkdirSync(outdir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: [`--use-angle=${angle}`, '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl, '(angle:', angle + ')');
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 90000 });
await pg.waitForTimeout(4000);

await pg.evaluate(() => {
  const S = window.__fl.scene;
  const cv = S.renderer.domElement;
  const GX = 16, GY = 12;

  // --- the GPU reduction: mean luminance per tile + a non-finite flag ---
  const RED_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`;
  const RED_FS = `
    varying vec2 vUv;
    uniform sampler2D uT; uniform vec2 uG;
    void main(){
      float sum = 0.0, mx = 0.0, bad = 0.0;
      for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
        vec2 o = ((vec2(float(i), float(j)) + 0.5) / 8.0 - 0.5) / uG;
        vec3 c = texture2D(uT, vUv + o).rgb;
        if (!all(lessThan(abs(c), vec3(1e30)))) { bad = 1.0; }
        else { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); sum += l; mx = max(mx, l); }
      }
      float m = sum / 64.0;
      gl_FragColor = vec4(m / (1.0 + m), bad, mx / (1.0 + mx), 1.0);
    }
  `;
  const redMat = new THREE.ShaderMaterial({
    vertexShader: RED_VS, fragmentShader: RED_FS,
    uniforms: { uT: { value: null }, uG: { value: new THREE.Vector2(GX, GY) } },
    depthTest: false, depthWrite: false,
  });
  const redRT = new THREE.WebGLRenderTarget(GX, GY, {
    type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  const fsScene = new THREE.Scene();
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), redMat);
  fsMesh.frustumCulled = false;
  fsScene.add(fsMesh);
  const buf = new Uint8Array(GX * GY * 4);
  const reduce = (tex) => {
    redMat.uniforms.uT.value = tex;
    S.renderer.setRenderTarget(redRT);
    S.renderer.render(fsScene, fsCam);
    S.renderer.readRenderTargetPixels(redRT, 0, 0, GX, GY, buf);
    S.renderer.setRenderTarget(null);
    const mean = new Float32Array(GX * GY), bad = new Uint8Array(GX * GY);
    for (let k = 0; k < GX * GY; k++) {
      // readback is bottom-up; flip to top-down so tile indices match the screen
      const x = k % GX, y = (GY - 1) - ((k / GX) | 0);
      const o = (y * GX + x) * 4;
      const t = buf[o] / 255;
      mean[k] = (t >= 1 ? 1e3 : t / (1 - t)) * 255;
      bad[k] = buf[o + 1] > 127 ? 1 : 0;
    }
    return { mean, bad };
  };

  // --- the screen, read the way flowers_black.mjs reads it ---
  const small = document.createElement('canvas');
  small.width = GX * 8; small.height = GY * 8;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  const screenGrid = () => {
    ctx.drawImage(cv, 0, 0, small.width, small.height);
    const d = ctx.getImageData(0, 0, small.width, small.height).data;
    const t = new Float32Array(GX * GY);
    for (let y = 0; y < small.height; y++) for (let x = 0; x < small.width; x++) {
      const i = (y * small.width + x) * 4;
      t[((y >> 3) * GX) + (x >> 3)] += (d[i] * 0.30 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 64;
    }
    return t;
  };

  const names = ['scene', 'bright', 'bloom', 'dof'];
  const H = window.__hole = { n: 0, ev: [], cand: 0, badFrames: 0, shots: {}, minSeen: 999 };
  let prevScr = null, prevG = null, prevEye = null, pending = null;
  const loop = () => {
    const scr = screenGrid();
    const g = [reduce(S.rtScene.texture), reduce(S.rtBright.texture),
      reduce(S.rtBlurB.texture), reduce(S.rtDofB.texture)];
    H.n++;
    const st = window.__fl.state();
    const eyeMove = prevEye ? Math.hypot(st.eye[0] - prevEye[0], st.eye[1] - prevEye[1], st.eye[2] - prevEye[2]) : 9;
    prevEye = st.eye;
    let anyBad = 0;
    for (let t = 0; t < 4; t++) for (let k = 0; k < GX * GY; k++) if (g[t].bad[k]) anyBad++;
    if (anyBad) H.badFrames++;

    // confirm a pending candidate: a hole is ONE frame, so it must come back
    if (pending) {
      const p = pending; pending = null;
      const back = p.tiles.filter(k => scr[k] > p.before[k] * 0.6);
      if (back.length >= Math.max(1, p.tiles.length * 0.6)) {
        for (const k of back) {
          const rec = { frame: p.frame, tile: k, prev: +p.before[k].toFixed(1),
            now: +p.at[k].toFixed(1), after: +scr[k].toFixed(1), shot: p.shot0, t: {} };
          for (let t = 0; t < 4; t++) {
            const pm = p.gPrev[t].mean[k], nm = p.gAt[t].mean[k];
            rec.t[names[t]] = { prev: +pm.toFixed(1), now: +nm.toFixed(1),
              collapsed: (nm < pm * 0.45 && pm - nm > 8) ? 1 : 0,
              bad: p.gAt[t].bad[k], anyBad: p.anyBad };
          }
          H.ev.push(rec);
        }
        if (Object.keys(H.shots).length < 10) H.shots['f' + p.frame] = p.png;
      }
    }
    // candidate: still camera, tile falls NEAR BLACK from something visible
    if (prevScr && eyeMove < 0.02) {
      const tiles = [];
      for (let k = 0; k < GX * GY; k++) {
        if (scr[k] < prevScr[k] * 0.45 && prevScr[k] - scr[k] > 26) {
          if (scr[k] < H.minSeen) H.minSeen = +scr[k].toFixed(2);
          if (scr[k] < 12) tiles.push(k);
        }
      }
      if (tiles.length) {
        H.cand++;
        pending = { frame: H.n, tiles, before: prevScr, at: scr, gPrev: prevG, gAt: g,
          anyBad, shot0: st.shot, png: cv.toDataURL() };
      }
    }
    prevScr = scr; prevG = g;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

await pg.waitForTimeout(+secondsArg * 1000);
const out = await pg.evaluate(() => ({ n: window.__hole.n, ev: window.__hole.ev,
  cand: window.__hole.cand, badFrames: window.__hole.badFrames,
  shots: window.__hole.shots, minSeen: window.__hole.minSeen }));
console.log(`frames ${out.n}   near-black candidates ${out.cand}   CONFIRMED one-frame holes ${out.ev.length}`);
console.log(`darkest collapse seen ${out.minSeen} / 255   frames with a non-finite texel anywhere ${out.badFrames}`);
const tally = { scene: 0, bright: 0, bloom: 0, dof: 0 };
for (const e of out.ev) for (const k of Object.keys(tally)) tally[k] += e.t[k].collapsed;
if (out.ev.length) console.log('of those holes, the same tile also collapsed in:', JSON.stringify(tally));
for (const e of out.ev.slice(0, 30)) {
  const p = Object.entries(e.t).map(([k, v]) => `${k} ${v.prev}->${v.now}${v.collapsed ? '*' : ''}${v.bad ? '!NF' : ''}`).join('  ');
  console.log(`  f${e.frame} tile ${e.tile} shot ${e.shot}  screen ${e.prev}->${e.now}->${e.after}  | ${p}  | NF tiles ${e.t.scene.anyBad}`);
}
let saved = 0;
for (const [f, url] of Object.entries(out.shots)) {
  writeFileSync(`${outdir}/${f}.png`, Buffer.from(url.split(',')[1], 'base64'));
  saved++;
}
console.log(`saved ${saved} frames to ${outdir}/`, 'errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
