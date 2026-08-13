// NaN probe — the black square is a NON-FINITE TEXEL, and this finds it.
//
// tools/flowers_hole.mjs convicted the pass: at seed 1337 the one-frame black
// square is accompanied, every time, by non-finite texels in the DEFOCUS
// target, while the scene target's luminance at the same tile does not move.
// That is exactly what a single bad texel in the scene looks like after two
// separable gaussians — a point becomes an axis-aligned RECTANGLE, because a
// separable blur's support is a rectangle, and the comp then does
// mix(scene, dof, coc), which is NaN wherever dof is, and NaN survives aces()
// and pow() to arrive on screen as black.
//
// But hole.mjs samples 64 texels per 69x65 tile, so "the scene is clean" is a
// claim it is not entitled to make: one bad texel in ninety is exactly what it
// would miss. THIS probe has EXACT COVERAGE — one output texel per 8x8 block
// of the scene target, eight-by-eight taps at texel centres, so no texel goes
// unlooked-at — and it classifies rather than counting:
//
//   NaN  iff  !(v < 1e30) && !(v > -1e30)     (NaN fails every comparison)
//   Inf  iff  exactly one of those holds
//
// which needs neither isnan() nor `v != v` — the first does not exist in GLSL
// ES 1.0 and the second is what a fast-math compiler folds away.
//
// The alpha channel is classified separately because it is not colour: every
// surface writes linear depth there for the defocus, and the comp reads it as
// `sc.a * 100.0`. A NaN in alpha alone would blacken a region with a perfectly
// finite picture underneath it.
//
//   node tools/flowers_nan.mjs '<query>' <seconds>
//   HIDE=pt node tools/flowers_nan.mjs 'garden=7&seed=1337&ff=2200' 140
// HIDE takes a comma list of tri,pet,rib,pt,bg,ground — the bisection.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=1337&ff=2200', secondsArg = '140'] = process.argv;
const angle = process.env.ANGLE || 'metal';
const hide = process.env.HIDE || '';
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: [`--use-angle=${angle}`, '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl, '(angle:', angle + ', hide:', hide || 'nothing', ')');
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 90000 });
await pg.waitForTimeout(4000);

const out = await pg.evaluate(async ({ seconds, hide }) => {
  const S = window.__fl.scene;
  let bgMesh = null;
  S.scene.traverse(o => { if (o.renderOrder === -1 && o.isMesh) bgMesh = o; });
  for (const nm of hide.split(',').filter(Boolean)) {
    const m = { tri: S.triMesh, pet: S.petMesh, rib: S.ribMesh, pt: S.ptMesh, bg: bgMesh,
      ground: S.ground && S.ground.mesh }[nm];
    if (m) m.visible = false;
  }
  const W = S.rtScene.width, H = S.rtScene.height;
  const BX = Math.ceil(W / 8), BY = Math.ceil(H / 8);
  const CLS = `
    varying vec2 vUv;
    uniform sampler2D uT; uniform vec2 uSize; uniform vec2 uB;
    // NaN fails every comparison; +-Inf fails exactly one
    void cls(float v, inout float nan, inout float inf, inout float huge) {
      bool lo = !(v < 1e30), hi = !(v > -1e30);
      if (lo && hi) nan = 1.0;
      else if (lo || hi) inf = 1.0;
      else if (abs(v) > 1e4) huge = 1.0;
    }
    void main(){
      vec2 base = floor(vUv * uB) * 8.0;
      float nanC = 0.0, infC = 0.0, hugeC = 0.0, nanA = 0.0, infA = 0.0;
      for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
        vec4 c = texture2D(uT, (base + vec2(float(i), float(j)) + 0.5) / uSize);
        cls(c.r, nanC, infC, hugeC); cls(c.g, nanC, infC, hugeC); cls(c.b, nanC, infC, hugeC);
        float d = 0.0; cls(c.a, nanA, infA, d);
      }
      gl_FragColor = vec4(nanC * 0.5 + infC * 0.25, nanA * 0.5 + infA * 0.25, hugeC, 1.0);
    }
  `;
  const mkPass = (frag, uni) => new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader: frag, uniforms: uni, depthTest: false, depthWrite: false,
  });
  const uni = { uT: { value: null }, uSize: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2() } };
  const mat = mkPass(CLS, uni);
  const rtB = (w, h) => new THREE.WebGLRenderTarget(w, h, {
    type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, depthBuffer: false });
  const rtSc = rtB(BX, BY);
  const dW = S.rtDofB.width, dH = S.rtDofB.height;
  const rtDf = rtB(Math.ceil(dW / 8), Math.ceil(dH / 8));
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; fsScene.add(mesh);
  const bufS = new Uint8Array(BX * BY * 4);
  const bufD = new Uint8Array(rtDf.width * rtDf.height * 4);

  const scan = (tex, w, h, rt, buf) => {
    uni.uT.value = tex;
    uni.uSize.value.set(w, h);
    uni.uB.value.set(rt.width, rt.height);
    S.renderer.setRenderTarget(rt);
    S.renderer.render(fsScene, fsCam);
    S.renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, buf);
    S.renderer.setRenderTarget(null);
    const hits = [];
    for (let k = 0; k < rt.width * rt.height; k++) {
      const o = k * 4;
      if (buf[o] > 8 || buf[o + 1] > 8 || buf[o + 2] > 8) {
        hits.push({ x: (k % rt.width) * 8, y: (h - 1 - ((k / rt.width) | 0) * 8),
          nanC: buf[o] > 100, infC: buf[o] > 30 && buf[o] < 100,
          nanA: buf[o + 1] > 100, infA: buf[o + 1] > 30 && buf[o + 1] < 100,
          huge: buf[o + 2] > 8 });
      }
    }
    return hits;
  };

  const R = { n: 0, scFrames: 0, dfFrames: 0, ev: [], W, H,
    counts: { nanC: 0, infC: 0, nanA: 0, infA: 0, huge: 0 } };
  const done = new Promise(res => setTimeout(res, seconds * 1000));
  const loop = () => {
    R.n++;
    const hs = scan(S.rtScene.texture, W, H, rtSc, bufS);
    const hd = scan(S.rtDofB.texture, dW, dH, rtDf, bufD);
    if (hs.length) {
      R.scFrames++;
      for (const h of hs) for (const k of Object.keys(R.counts)) if (h[k]) R.counts[k]++;
      if (R.ev.length < 24) R.ev.push({ frame: R.n, sceneBlocks: hs.length, dofBlocks: hd.length,
        first: hs[0], all: hs.slice(0, 6) });
    } else if (hd.length) {
      R.dfFrames++;
      if (R.ev.length < 24) R.ev.push({ frame: R.n, sceneBlocks: 0, dofBlocks: hd.length, first: hd[0] });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  await done;
  return R;
}, { seconds: +secondsArg, hide });

console.log(`frames ${out.n}   scene ${out.W}x${out.H}`);
console.log(`frames with a non-finite texel in rtScene: ${out.scFrames}`);
console.log(`frames with one in the DEFOCUS target but NOT in rtScene: ${out.dfFrames}`);
console.log('scene blocks by class:', JSON.stringify(out.counts));
for (const e of out.ev.slice(0, 20)) {
  const f = e.first;
  console.log(`  f${e.frame}  sceneBlocks ${e.sceneBlocks} dofBlocks ${e.dofBlocks}  first at px (${f.x},${f.y})` +
    `  nanRGB ${+f.nanC} infRGB ${+f.infC} nanA ${+f.nanA} infA ${+f.infA} huge ${+f.huge}`);
}
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
