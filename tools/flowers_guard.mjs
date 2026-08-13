// Guard A/B — does closing the interpolation guard's zero end change the
// picture anywhere it was not already broken?
//
// The claim in 30_scene.js is that `!(length(vN) > 0.0 && length(vN) <= 1.01)`
// is the same test as `length(vN) > 1.01` for every finite non-zero |vN|, and
// differs only on the fragments that were writing NaN. That is a claim about
// arithmetic, and the assert-the-claim rule says measure it.
//
// A before/after SCREENSHOT cannot: the director drifts perpetually and the
// air never stops, so two page sessions are never the same frame — two shots
// of the unchanged build differ by a mean 9.5/255 with 43% of pixels past 8.
// So both guards are run against the SAME frame instead. Two materials that
// differ in exactly one line, the mesh swapped between two renders of one
// scene at one camera, and a GPU reduction over 8x8 blocks that separates the
// two outcomes that matter:
//
//   FIXED     old is non-finite, new is finite     — the bug, being removed
//   CHANGED   both finite and they differ          — a regression, and there
//                                                    must be none of these
//
//   node tools/flowers_guard.mjs '<query>' <seconds>
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=1337&ff=2200', secondsArg = '120'] = process.argv;
// CONTROL=1 renders the NEW guard twice, so any CHANGED it reports is the
// probe's own floor rather than the guard's doing. Run it before believing a
// number out of this file — the first two designs of the A/B both had a floor
// they could not see, one from a deep-copied uniform block and one from the
// render list's material-id sort.
const process_control = process.env.CONTROL === '1';
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

const out = await pg.evaluate(async ({ seconds, control }) => {
  const S = window.__fl.scene;
  const NEW = 'if (!(length(vN) > 0.0 && length(vN) <= 1.01)) discard;';
  const OLD = 'if (length(vN) > 1.01) discard;';
  const src = S.triMat.fragmentShader;
  if (src.indexOf(NEW) < 0) return { err: 'shipped guard is not the new form; nothing to A/B' };
  // ONE material object, two shader texts. Swapping the material for a clone
  // was the first design and it has a FLOOR: Three sorts the opaque render
  // list by material id, so a clone draws at a different point in the list and
  // coplanar surfaces swap — a clone with IDENTICAL source still reported 75
  // changed blocks a frame, up to 10.6. Toggling `fragmentShader` on the same
  // object keeps the id, so the sort is unchanged and the two programs are
  // both cached after the first frame.
  const srcNew = src, srcOld = src.replace(NEW, OLD);
  const M = S.triMat;
  const setFS = (t) => { if (M.fragmentShader !== t) { M.fragmentShader = t; M.needsUpdate = true; } };

  const W = S.rtScene.width, H = S.rtScene.height;
  const rtO = { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, depthBuffer: true, samples: 4 };
  const rtA = new THREE.WebGLRenderTarget(W, H, rtO);
  const rtB = new THREE.WebGLRenderTarget(W, H, rtO);
  const BX = Math.ceil(W / 8), BY = Math.ceil(H / 8);
  const DIFF = `
    varying vec2 vUv;
    uniform sampler2D uA, uB; uniform vec2 uSize, uG;
    bool fin(vec3 c) { return all(lessThan(abs(c), vec3(1e30))); }
    void main(){
      vec2 base = floor(vUv * uG) * 8.0;
      float fixedB = 0.0, changed = 0.0, mx = 0.0, badNew = 0.0;
      for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
        vec2 uv = (base + vec2(float(i), float(j)) + 0.5) / uSize;
        vec3 a = texture2D(uA, uv).rgb, b = texture2D(uB, uv).rgb;
        bool fa = fin(a), fb = fin(b);
        if (!fb) badNew = 1.0;
        else if (!fa) fixedB = 1.0;
        else {
          float d = max(max(abs(a.r - b.r), abs(a.g - b.g)), abs(a.b - b.b));
          if (d > 1e-4) { changed = 1.0; mx = max(mx, d); }
        }
      }
      gl_FragColor = vec4(fixedB, changed, mx / (1.0 + mx), badNew);
    }
  `;
  const mat = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`,
    fragmentShader: DIFF, depthTest: false, depthWrite: false,
    uniforms: { uA: { value: rtA.texture }, uB: { value: rtB.texture },
      uSize: { value: new THREE.Vector2(W, H) }, uG: { value: new THREE.Vector2(BX, BY) } },
  });
  const rtD = new THREE.WebGLRenderTarget(BX, BY, { type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const fs = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; fs.add(m);
  const buf = new Uint8Array(BX * BY * 4);

  const R = { n: 0, fixedFrames: 0, fixedBlocks: 0, changedFrames: 0, changedBlocks: 0,
    badNewFrames: 0, maxDiff: 0 };
  const done = new Promise(res => setTimeout(res, seconds * 1000));
  const loop = () => {
    R.n++;
    setFS(control ? srcNew : srcOld);
    S.renderer.setRenderTarget(rtA); S.renderer.render(S.scene, S.camera);
    setFS(srcNew);
    S.renderer.setRenderTarget(rtB); S.renderer.render(S.scene, S.camera);
    S.renderer.setRenderTarget(rtD); S.renderer.render(fs, cam);
    S.renderer.readRenderTargetPixels(rtD, 0, 0, BX, BY, buf);
    S.renderer.setRenderTarget(null);
    let fx = 0, ch = 0, bn = 0, mx = 0;
    for (let k = 0; k < BX * BY; k++) {
      if (buf[k * 4] > 127) fx++;
      if (buf[k * 4 + 1] > 127) ch++;
      if (buf[k * 4 + 3] > 127) bn++;
      const t = buf[k * 4 + 2] / 255;
      mx = Math.max(mx, t >= 1 ? 1e3 : t / (1 - t));
    }
    if (fx) { R.fixedFrames++; R.fixedBlocks += fx; }
    if (ch) { R.changedFrames++; R.changedBlocks += ch; }
    if (bn) R.badNewFrames++;
    R.maxDiff = Math.max(R.maxDiff, mx);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  await done;
  setFS(srcNew);
  return R;
}, { seconds: +secondsArg, control: !!process_control });

if (out.err) { console.log('ERROR:', out.err); await b.close(); process.exit(1); }
console.log(`frames ${out.n}`);
console.log(`FIXED   old non-finite / new finite : ${out.fixedFrames} frames, ${out.fixedBlocks} blocks`);
console.log(`CHANGED both finite and different   : ${out.changedFrames} frames, ${out.changedBlocks} blocks,` +
  ` largest difference ${out.maxDiff.toFixed(5)}`);
console.log(`new guard still non-finite anywhere : ${out.badNewFrames} frames`);
console.log(out.changedBlocks === 0 && out.badNewFrames === 0
  ? 'PASS — the two guards agree everywhere they are both defined, and the new one is never non-finite.'
  : 'LOOK — the guards disagree on finite fragments, or the new one still writes a NaN.');
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
