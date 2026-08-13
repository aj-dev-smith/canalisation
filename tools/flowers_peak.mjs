// Peak probe — WHAT VALUE IS IN THE SCENE BUFFER, and which stream put it there.
//
// tools/flowers_glitch.mjs catches the one-frame flash in the FINISHED picture.
// This one looks one step upstream, at the HDR scene target the bloom chain
// reads, and it does two things that probe cannot:
//
//   1. It measures the peak, every frame, without reading a megapixel back. A
//      reduce pass takes the max over each 8x8 block into a byte target as
//      log2(1+L)/16, so a whole frame's peak costs one small readPixels. NaN
//      and Inf are detected as `!(l <= 1e30)` — a comparison every non-finite
//      value fails — and reported in the green channel.
//
//   2. On a spike it ATTRIBUTES the peak in the SAME FRAME. Geometry, camera
//      and uniforms are all still exactly what produced the spike, so the scene
//      is re-rendered once per stream with everything else hidden and reduced
//      again. Whichever solo render still holds the peak is the stream that
//      made it. A bisect that needs one run instead of five, and one that
//      cannot be confounded by the flash simply not recurring.
//
//   node tools/flowers_peak.mjs '<query>' <seconds> [outdir]
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const [, , query = 'garden=7&seed=21&ff=2200', secondsArg = '90', outdir = 'shots/peak'] = process.argv;
const seconds = +secondsArg;
mkdirSync(outdir, { recursive: true });
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;

const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
console.log('open', pageUrl);
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 60000 });
await pg.waitForTimeout(4000);

await pg.evaluate(() => {
  const sc = window.__fl.scene;
  const r = sc.renderer;
  const W = r.domElement.width, H = r.domElement.height;
  const RW = Math.ceil(W / 8), RH = Math.ceil(H / 8);
  const rt = new THREE.WebGLRenderTarget(RW, RH, {
    type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, depthBuffer: false,
  });
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D uT; uniform vec2 uTexel;
      void main(){
        float m = 0.0, bad = 0.0;
        for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
          vec3 c = texture2D(uT, vUv + vec2(float(x) - 3.5, float(y) - 3.5) * uTexel).rgb;
          float l = max(max(c.r, c.g), c.b);
          if (!(l <= 1e30)) bad = 1.0; else m = max(m, l);
        }
        gl_FragColor = vec4(clamp(log2(1.0 + m) / 16.0, 0.0, 1.0), bad, 0.0, 1.0);
      }`,
    uniforms: { uT: { value: null }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } },
    depthTest: false, depthWrite: false,
  });
  const buf = new Uint8Array(RW * RH * 4);

  // named streams, everything the scene draws
  const streams = [];
  const named = { tri: sc.triMesh, pet: sc.petMesh, rib: sc.ribMesh, pt: sc.ptMesh, pol: sc.polMesh };
  for (const [k, m] of Object.entries(named)) if (m) streams.push([k, m]);
  const others = sc.scene.children.filter(o => !streams.some(s => s[1] === o));
  streams.push(['rest', others]);   // background + ground

  const reduce = () => {
    mat.uniforms.uT.value = sc.rtScene.texture;
    sc._fsMesh.material = mat;
    r.setRenderTarget(rt);
    r.render(sc._fsScene, sc._fsCam);
    r.readRenderTargetPixels(rt, 0, 0, RW, RH, buf);
    let mx = 0, mi = 0, bad = 0;
    for (let i = 0; i < RW * RH; i++) {
      if (buf[i * 4 + 1] > 127) bad++;
      if (buf[i * 4] > mx) { mx = buf[i * 4]; mi = i; }
    }
    return { peak: Math.pow(2, mx / 255 * 16) - 1, x: (mi % RW) * 8, y: (RH - 1 - Math.floor(mi / RW)) * 8, bad };
  };

  const S = window.__glp = { n: 0, hist: [], spikes: [], frames: {} };
  const orig = sc.render.bind(sc);
  sc.render = (t) => {
    orig(t);
    const m = reduce();
    S.n++;
    S.hist.push(+m.peak.toFixed(2));
    if (S.hist.length > 4000) S.hist.shift();
    // a spike: far above the running median of the last 60 frames
    const tail = S.hist.slice(-61, -1);
    const med = tail.length ? tail.slice().sort((a, b) => a - b)[tail.length >> 1] : 0;
    if (S.spikes.length < 24 && tail.length > 30 && (m.bad > 0 || m.peak > Math.max(8, med * 3))) {
      // ATTRIBUTE, this frame: solo-render each stream and re-reduce
      const vis = sc.scene.children.map(o => o.visible);
      const attr = {};
      for (const [k, m2] of streams) {
        const list = Array.isArray(m2) ? m2 : [m2];
        for (const o of sc.scene.children) o.visible = list.includes(o);
        r.setRenderTarget(sc.rtScene);
        r.render(sc.scene, sc.camera);
        const a = reduce();
        attr[k] = { peak: +a.peak.toFixed(2), bad: a.bad, x: a.x, y: a.y };
      }
      sc.scene.children.forEach((o, i) => { o.visible = vis[i]; });
      r.setRenderTarget(sc.rtScene);
      r.render(sc.scene, sc.camera);
      S.spikes.push({ frame: S.n, peak: +m.peak.toFixed(2), med: +med.toFixed(2), bad: m.bad, x: m.x, y: m.y, attr,
        capN: window.__fl.state().capN, shot: window.__fl.state().shot });
      if (Object.keys(S.frames).length < 8) S.frames[S.n] = r.domElement.toDataURL();
    }
    r.setRenderTarget(null);
  };
});

await pg.waitForTimeout(seconds * 1000);
const out = await pg.evaluate(() => ({
  n: window.__glp.n, spikes: window.__glp.spikes, frames: window.__glp.frames,
  hist: window.__glp.hist.slice(-400),
}));
const h = out.hist.slice().sort((a, b) => a - b);
console.log(`frames ${out.n}  peak median ${h[h.length >> 1]}  p99 ${h[Math.floor(h.length * 0.99)]}  max ${h[h.length - 1]}`);
console.log(`spikes: ${out.spikes.length}`);
for (const s of out.spikes) {
  console.log(`  f${s.frame} peak ${s.peak} (med ${s.med}) bad ${s.bad} at ${s.x},${s.y} shot ${s.shot} capN ${s.capN}`);
  console.log('     ' + Object.entries(s.attr).map(([k, v]) => `${k} ${v.peak}${v.bad ? '/NaN' + v.bad : ''}@${v.x},${v.y}`).join('  '));
}
let n = 0;
for (const [f, url] of Object.entries(out.frames)) {
  writeFileSync(`${outdir}/p${f}.png`, Buffer.from(url.split(',')[1], 'base64'));
  n++;
}
console.log(`saved ${n} frames to ${outdir}/`, 'errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
