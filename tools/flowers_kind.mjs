// Kind probe — WHICH ORGAN is extrapolating.
//
// flowers_term.mjs measured the varyings at the flash: vC up to 7.07 where the
// buffer's maximum colour is 1.29, vE up to 4.70 where the maximum emissive is
// 0.83, |vN| up to 32.9 where every normal is unit. A varying outside the hull
// of its own vertex values is not shading, it is INTERPOLATION — so the
// question is which triangles.
//
// FlowerBuffers records [tri0, tri1) per organ with its kind, and uploadMany
// concatenates specimens in a known order, so the global vertex range of every
// organ is recoverable on the page. On a spike this re-renders the tri stream
// one KIND at a time (one draw call per organ, autoClear off) and reduces each.
//
//   node tools/flowers_kind.mjs '<query>' <seconds>
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=21&ff=2200', secondsArg = '60'] = process.argv;
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && window.__fl.scene, null, { timeout: 60000 });
await pg.waitForTimeout(4000);

await pg.evaluate(() => {
  const sc = window.__fl.scene, r = sc.renderer;
  const W = r.domElement.width, H = r.domElement.height;
  const RW = Math.ceil(W / 8), RH = Math.ceil(H / 8);
  const rt = new THREE.WebGLRenderTarget(RW, RH, {
    type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, depthBuffer: false,
  });
  const redMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D uT; uniform vec2 uTexel;
      void main(){ float m = 0.0;
        for (int y=0;y<8;y++) for (int x=0;x<8;x++) {
          vec3 c = texture2D(uT, vUv + vec2(float(x)-3.5, float(y)-3.5)*uTexel).rgb;
          m = max(m, max(max(c.r,c.g),c.b)); }
        gl_FragColor = vec4(clamp(log2(1.0+m)/16.0,0.0,1.0), 0.0, 0.0, 1.0); }`,
    uniforms: { uT: { value: null }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } },
    depthTest: false, depthWrite: false,
  });
  const buf = new Uint8Array(RW * RH * 4);
  const reduce = () => {
    redMat.uniforms.uT.value = sc.rtScene.texture;
    sc._fsMesh.material = redMat;
    r.setRenderTarget(rt); r.render(sc._fsScene, sc._fsCam);
    r.readRenderTargetPixels(rt, 0, 0, RW, RH, buf);
    let mx = 0, mi = 0;
    for (let i = 0; i < RW * RH; i++) if (buf[i * 4] > mx) { mx = buf[i * 4]; mi = i; }
    return { peak: Math.pow(2, mx / 255 * 16) - 1, x: (mi % RW) * 8, y: (RH - 1 - Math.floor(mi / RW)) * 8 };
  };

  const S = window.__glk = { n: 0, hist: [], spikes: [] };
  const orig = sc.render.bind(sc);
  sc.render = (t) => {
    orig(t);
    const m = reduce(); S.n++;
    S.hist.push(m.peak); if (S.hist.length > 200) S.hist.shift();
    const tail = S.hist.slice(0, -1);
    const med = tail.length ? tail.slice().sort((a, b) => a - b)[tail.length >> 1] : 0;
    if (S.spikes.length < 8 && tail.length > 40 && m.peak > Math.max(30, med * 4)) {
      // global vertex ranges per organ kind, in uploadMany's order
      const list = window.__fl.garden.filter(s => s.S);
      const byKind = {};
      let off = 0;
      for (const s of list) {
        for (const o of s.B.organs) {
          const k = o.meta.kind;
          if (o.tri1 > o.tri0) (byKind[k] = byKind[k] || []).push([(off + o.tri0) / 10, (o.tri1 - o.tri0) / 10]);
        }
        off += s.B.triN;
      }
      const vis = sc.scene.children.map(o => o.visible);
      for (const o of sc.scene.children) o.visible = (o === sc.triMesh);
      const keepRange = { ...sc.triGeo.drawRange };
      const rec = { frame: S.n, peak: +m.peak.toFixed(1), med: +med.toFixed(2), x: m.x, y: m.y, kind: {} };
      r.autoClear = false;
      for (const [k, ranges] of Object.entries(byKind)) {
        r.setRenderTarget(sc.rtScene);
        r.clear(true, true, false);
        for (const [a, c] of ranges) { sc.triGeo.setDrawRange(a, c); r.render(sc.scene, sc.camera); }
        const a2 = reduce();
        rec.kind[k] = `${a2.peak.toFixed(1)}@${a2.x},${a2.y} (${ranges.length})`;
      }
      r.autoClear = true;
      sc.triGeo.setDrawRange(keepRange.start, keepRange.count);
      sc.scene.children.forEach((o, i) => { o.visible = vis[i]; });
      S.spikes.push(rec);
    }
    r.setRenderTarget(null);
  };
});

await pg.waitForTimeout(+secondsArg * 1000);
const out = await pg.evaluate(() => window.__glk);
console.log(`frames ${out.n}, spikes ${out.spikes.length}`);
for (const s of out.spikes) {
  console.log(`f${s.frame} peak ${s.peak} (med ${s.med}) at ${s.x},${s.y}`);
  for (const [k, v] of Object.entries(s.kind)) console.log(`     ${k.padEnd(9)} ${v}`);
}
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
