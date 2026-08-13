// Sliver probe — WHAT TRIANGLE IS UNDER THE FLASH.
//
// The chain so far: the flash is a bloom splat of one ultra-bright texel
// (flowers_glitch.mjs), the texel is in the tri stream (flowers_peak.mjs), the
// vertex data feeding it is clean (flowers_scan.mjs), the varyings at that
// fragment are five to thirty times outside the hull of their own vertex values
// (flowers_term.mjs), and the organ is a leaf (flowers_kind.mjs). Varyings
// outside their hull is a statement about the RASTERISER, so this projects
// every triangle in the tri stream on the spike frame, finds the ones covering
// the flash block, and reports their screen area and organ.
//
//   node tools/flowers_sliver.mjs '<query>' <seconds>
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

  const S = window.__gls = { n: 0, hist: [], spikes: [], census: null };
  const orig = sc.render.bind(sc);
  sc.render = (t) => {
    orig(t);
    const m = reduce(); S.n++;
    S.hist.push(m.peak); if (S.hist.length > 200) S.hist.shift();
    const tail = S.hist.slice(0, -1);
    const med = tail.length ? tail.slice().sort((a, b) => a - b)[tail.length >> 1] : 0;
    if (S.spikes.length < 6 && tail.length > 40 && m.peak > Math.max(30, med * 4)) {
      const cam = sc.camera;
      cam.updateMatrixWorld();
      const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      const e = vp.elements;
      const list = window.__fl.garden.filter(s => s.S);
      const hits = [];
      let census = { total: 0, lt1e2: 0, lt1e4: 0, lt1e6: 0, lt1e8: 0, behind: 0 };
      const X0 = m.x, Y0 = m.y, X1 = m.x + 8, Y1 = m.y + 8;
      for (const s of list) {
        const A = s.B.tri, N = s.B.triN;
        const sx = [0, 0, 0], sy = [0, 0, 0], sw = [0, 0, 0];
        for (let k = 0; k < N; k += 30) {
          let bad = 0;
          for (let v = 0; v < 3; v++) {
            const o = k + v * 10;
            const px = A[o], py = A[o + 1], pz = A[o + 2];
            const cx = e[0] * px + e[4] * py + e[8] * pz + e[12];
            const cy = e[1] * px + e[5] * py + e[9] * pz + e[13];
            const cw = e[3] * px + e[7] * py + e[11] * pz + e[15];
            if (cw <= 0) bad = 1;
            sw[v] = cw;
            sx[v] = (cx / cw * 0.5 + 0.5) * 1100;
            sy[v] = (1 - (cy / cw * 0.5 + 0.5)) * 780;
          }
          if (bad) { census.behind++; continue; }
          const ar = Math.abs((sx[1] - sx[0]) * (sy[2] - sy[0]) - (sx[2] - sx[0]) * (sy[1] - sy[0])) * 0.5;
          census.total++;
          if (ar < 1e-2) census.lt1e2++;
          if (ar < 1e-4) census.lt1e4++;
          if (ar < 1e-6) census.lt1e6++;
          if (ar < 1e-8) census.lt1e8++;
          const bx0 = Math.min(sx[0], sx[1], sx[2]), bx1 = Math.max(sx[0], sx[1], sx[2]);
          const by0 = Math.min(sy[0], sy[1], sy[2]), by1 = Math.max(sy[0], sy[1], sy[2]);
          if (bx1 < X0 - 1 || bx0 > X1 + 1 || by1 < Y0 - 1 || by0 > Y1 + 1) continue;
          let meta = null;
          for (const o of s.B.organs) if (k >= o.tri0 && k < o.tri1) { meta = o.meta; break; }
          // world-space degeneracy: is the triangle emitted flat, or only seen
          // flat? projection preserves collinearity, so these separate cleanly
          const ax2 = A[k + 10] - A[k], ay2 = A[k + 11] - A[k + 1], az2 = A[k + 12] - A[k + 2];
          const bx2 = A[k + 20] - A[k], by2 = A[k + 21] - A[k + 1], bz2 = A[k + 22] - A[k + 2];
          const cx2 = ay2 * bz2 - az2 * by2, cy2 = az2 * bx2 - ax2 * bz2, cz2 = ax2 * by2 - ay2 * bx2;
          const wArea = Math.hypot(cx2, cy2, cz2) * 0.5;
          const e2m = Math.max(ax2 * ax2 + ay2 * ay2 + az2 * az2, bx2 * bx2 + by2 * by2 + bz2 * bz2);
          hits.push({ sp: s.S.name, area: +ar.toExponential(2), kind: meta ? meta.kind : '?',
            wArea: +wArea.toExponential(2), rel: +(wArea / Math.max(1e-30, e2m)).toExponential(2),
            span: [+(bx1 - bx0).toFixed(3), +(by1 - by0).toFixed(3)] });
        }
      }
      hits.sort((a, b) => a.area - b.area);
      S.census = census;
      S.spikes.push({ frame: S.n, peak: +m.peak.toFixed(1), med: +med.toFixed(2), x: m.x, y: m.y,
        nHit: hits.length, census, hits: hits.slice(0, 6) });
    }
    r.setRenderTarget(null);
  };
});

await pg.waitForTimeout(+secondsArg * 1000);
const out = await pg.evaluate(() => window.__gls);
console.log(`frames ${out.n}, spikes ${out.spikes.length}`);
for (const s of out.spikes) {
  const c = s.census;
  console.log(`f${s.frame} peak ${s.peak} (med ${s.med}) block ${s.x},${s.y}  tris ${c.total} behind ${c.behind}` +
    `  area<1e-2: ${c.lt1e2}  <1e-4: ${c.lt1e4}  <1e-6: ${c.lt1e6}  <1e-8: ${c.lt1e8}`);
  console.log(`   ${s.nHit} triangles overlap the block; smallest:`);
  for (const h of s.hits) console.log(`     ${h.kind.padEnd(9)} screen ${h.area} px2  world ${h.wArea} (rel ${h.rel})  span ${h.span}  ${h.sp}`);
}
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
