// vN probe — WHICH quantity in the tri shader goes non-finite?
//
// tools/flowers_nan.mjs put the black square's NaN in rtScene's colour (never
// alpha, never Inf), one 8x8 block at a time, and bisected it to the TRI
// stream: hide triMesh and 2,155 frames at seed 1337 carry none; hide petMesh
// instead and the rate is unchanged. This names the term.
//
// It rewrites FL_TRI_FS at runtime — the material is on window.__fl.scene, and
// Three recompiles on needsUpdate — swapping the interpolation guard for a
// classifier that paints a marker instead of shading, one channel mask per
// cause, all markers at 1e5 so the existing "huge" test finds them:
//
//   R      |vN| is NaN or Inf        (the guard's `>` cannot see a NaN)
//   B      |vN| is ZERO               (normalize(0) = 0/0 = NaN)
//   G      the eye lies ON the fragment (normalize(uEye - vP) = 0/0)
//   R+G+B  vC or vE is non-finite     (the NaN arrived in a varying, not a term)
//
// The classifier does NOT discard, so anything still arriving as NaN is a NaN
// the five markers do not explain — which is the point: a marker count that
// does not add up to the NaN count would mean the cause is downstream, in vC
// or vE, and the guard would be the wrong fix.
//
//   node tools/flowers_vn.mjs '<query>' <seconds>
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=1337&ff=2200', secondsArg = '140'] = process.argv;
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl);
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 90000 });
await pg.waitForTimeout(4000);

const out = await pg.evaluate(async ({ seconds }) => {
  const S = window.__fl.scene;
  const src = S.triMat.fragmentShader;
  const anchor = 'if (length(vN) > 1.01) discard;';
  if (src.indexOf(anchor) < 0) return { err: 'guard anchor not found in FL_TRI_FS' };
  // The shipped discard STAYS — intercepting it too was the first version of
  // this probe and it aliased: a marker is read per 8x8 block, a degenerate
  // sliver puts |vN| > 1.01 fragments in the same block as its |vN| = 0 one,
  // and the block then reports whichever mask has more channels. Keeping the
  // discard leaves only the two cases the guard CANNOT see, one channel each.
  const CLASSIFY = `
    if (length(vN) > 1.01) discard;
    {
      float L = length(vN);
      float Lv = length(uEye - vP);
      if (!(L < 1e30) && !(L > -1e30)) { gl_FragColor = vec4(1e5, 0.0, 0.0, 1.0); return; }
      if (L <= 1e-6)                   { gl_FragColor = vec4(0.0, 0.0, 1e5, 1.0); return; }
      if (!(Lv > 1e-9))                { gl_FragColor = vec4(0.0, 1e5, 0.0, 1.0); return; }
      if (!(length(vC) < 1e30) || !(abs(vE) < 1e30))
                                       { gl_FragColor = vec4(1e5, 1e5, 1e5, 1.0); return; }
    }
  `;
  S.triMat.fragmentShader = src.replace(anchor, CLASSIFY);
  S.triMat.needsUpdate = true;

  const W = S.rtScene.width, H = S.rtScene.height;
  const BX = Math.ceil(W / 8), BY = Math.ceil(H / 8);
  const CLS = `
    varying vec2 vUv;
    uniform sampler2D uT; uniform vec2 uSize; uniform vec2 uB;
    void main(){
      vec2 base = floor(vUv * uB) * 8.0;
      float nanC = 0.0, hr = 0.0, hg = 0.0, hb = 0.0;
      for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
        vec3 c = texture2D(uT, (base + vec2(float(i), float(j)) + 0.5) / uSize).rgb;
        if (!all(lessThan(abs(c), vec3(1e30)))) nanC = 1.0;
        else {
          if (c.r > 1e4) hr = 1.0;
          if (c.g > 1e4) hg = 1.0;
          if (c.b > 1e4) hb = 1.0;
        }
      }
      gl_FragColor = vec4(nanC, hr, hg, hb);
    }
  `;
  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader: CLS, depthTest: false, depthWrite: false,
    uniforms: { uT: { value: null }, uSize: { value: new THREE.Vector2(W, H) },
      uB: { value: new THREE.Vector2(BX, BY) } },
  });
  const rt = new THREE.WebGLRenderTarget(BX, BY, { type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; fsScene.add(mesh);
  const buf = new Uint8Array(BX * BY * 4);

  const R = { n: 0, nanFrames: 0, markFrames: 0, marks: {}, nanBlocks: 0, ev: [] };
  const NAMES = { 1: 'vN is NaN', 4: 'vN is ZERO (normalize(0))', 2: 'eye ON the fragment',
    7: 'vC or vE non-finite' };
  const done = new Promise(res => setTimeout(res, seconds * 1000));
  const loop = () => {
    R.n++;
    mat.uniforms.uT.value = S.rtScene.texture;
    S.renderer.setRenderTarget(rt);
    S.renderer.render(fsScene, fsCam);
    S.renderer.readRenderTargetPixels(rt, 0, 0, BX, BY, buf);
    S.renderer.setRenderTarget(null);
    let nan = 0, marks = [];
    for (let k = 0; k < BX * BY; k++) {
      if (buf[k * 4] > 127) nan++;
      const m = (buf[k * 4 + 1] > 127 ? 1 : 0) + (buf[k * 4 + 2] > 127 ? 2 : 0)
        + (buf[k * 4 + 3] > 127 ? 4 : 0);
      if (m > 0) marks.push({ m, x: (k % BX) * 8, y: (H - 1 - ((k / BX) | 0) * 8) });
    }
    if (nan) { R.nanFrames++; R.nanBlocks += nan; }
    if (marks.length) {
      R.markFrames++;
      for (const mk of marks) R.marks[NAMES[mk.m] || ('mask ' + mk.m)] =
        (R.marks[NAMES[mk.m] || ('mask ' + mk.m)] || 0) + 1;
      if (R.ev.length < 20) R.ev.push({ frame: R.n, nan, marks: marks.slice(0, 4)
        .map(mk => `${NAMES[mk.m] || ('mask ' + mk.m)} @(${mk.x},${mk.y})`) });
      if (!R.png && R.n > 30) R.png = S.renderer.domElement.toDataURL();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  await done;
  return R;
}, { seconds: +secondsArg });

if (out.err) { console.log('ERROR:', out.err); await b.close(); process.exit(1); }
console.log(`frames ${out.n}`);
console.log(`frames carrying a MARKER (a named cause): ${out.markFrames}`);
console.log(`frames still carrying an unexplained NaN:  ${out.nanFrames}  (${out.nanBlocks} blocks)`);
console.log('markers by cause:', JSON.stringify(out.marks));
for (const e of out.ev) console.log(`  f${e.frame}  nanBlocks ${e.nan}  ${e.marks.join('  ')}`);
if (out.png) { (await import('fs')).writeFileSync('shots/vn_markers.png', Buffer.from(out.png.split(',')[1], 'base64')); console.log('saved shots/vn_markers.png'); }
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
