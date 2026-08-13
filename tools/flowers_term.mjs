// Term probe — WHICH TERM of FL_TRI_FS is in the thousands.
//
// flowers_peak.mjs put the one-frame flash's source in the tri stream and
// flowers_scan.mjs proved the DATA is clean (col <= 1.29, emis <= 0.83, no
// NaN). So the number is made inside the fragment shader out of bounded
// inputs, which leaves exactly one question: which term. This re-renders the
// tri mesh on a spike frame with one debug fragment shader per term, reducing
// each through the same max pass, so every term is measured on the SAME
// fragment that produced the spike.
//
//   node tools/flowers_term.mjs '<query>' <seconds>
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const [, , query = 'garden=7&seed=21&ff=2200', secondsArg = '60'] = process.argv;
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + query;
const b = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
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

  // one debug material per term, sharing the tri vertex shader and uniforms
  const head = `
    varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
    uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
    uniform vec3 uFog; uniform float uFogD, uFogNear;
    void main(){
      vec3 N = normalize(vN);
      vec3 V = normalize(uEye - vP);
      if (dot(N, V) < 0.0) N = -N;
      float d = max(dot(N, uKey), 0.0);
      float back = pow(max(dot(-N, uKey), 0.0), 2.0);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
      float fg = clamp(1.0 - exp(-max(0.0, length(vP - uEye) - uFogNear) * uFogD), 0.0, 1.0);
      vec3 OUT; `;
  const terms = {
    vC: 'OUT = abs(vC);',
    vE: 'OUT = vec3(abs(vE));',
    vNlen: 'OUT = vec3(length(vN));',
    Nabs: 'OUT = abs(N);',
    amb: 'OUT = abs(amb);',
    dif: 'OUT = abs(vC * uKeyCol * d * 0.9);',
    backT: 'OUT = abs(vC * uKeyCol * back * 0.55);',
    rimT: 'OUT = vec3(abs(rim * 0.7)) * abs(uAmbTop);',
    emisT: 'OUT = abs(vC * vE * 3.0);',
    fogT: 'OUT = vec3(fg);',
    vPlen: 'OUT = vec3(length(vP) * 0.001);',
    // THE INVARIANT. Every vertex normal in these streams is unit length, and
    // perspective-correct interpolation is a convex combination, so |vN| <= 1
    // is a theorem rather than a tolerance. Anything above it is a fragment
    // whose barycentrics are out of hull. `hi`/`lo` split the actual shaded
    // colour on that test: if the spike lands entirely in `hi`, the invariant
    // names the corrupt fragments exactly and nothing legitimate is inside it.
    nOver: 'OUT = vec3(max(0.0, length(vN) - 1.0));',
    hi: 'vec3 cc = vC*(amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7 + vC*vE*3.0; cc = mix(cc, uFog, fg*0.80); OUT = length(vN) > 1.0 ? cc : vec3(0.0);',
    lo: 'vec3 cc = vC*(amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7 + vC*vE*3.0; cc = mix(cc, uFog, fg*0.80); OUT = length(vN) > 1.0 ? vec3(0.0) : cc;',
  };
  const mats = {};
  for (const [k, body] of Object.entries(terms)) {
    mats[k] = new THREE.ShaderMaterial({
      vertexShader: FL_TRI_VS, fragmentShader: head + body + ' gl_FragColor = vec4(OUT, 1.0); }',
      side: THREE.DoubleSide, uniforms: sc.triMat.uniforms,
    });
  }

  const S = window.__glt = { n: 0, hist: [], spikes: [] };
  const orig = sc.render.bind(sc);
  sc.render = (t) => {
    orig(t);
    const m = reduce(); S.n++;
    S.hist.push(m.peak); if (S.hist.length > 200) S.hist.shift();
    const tail = S.hist.slice(0, -1);
    const med = tail.length ? tail.slice().sort((a, b) => a - b)[tail.length >> 1] : 0;
    if (S.spikes.length < 10 && tail.length > 40 && m.peak > Math.max(30, med * 4)) {
      const vis = sc.scene.children.map(o => o.visible);
      for (const o of sc.scene.children) o.visible = (o === sc.triMesh);
      const rec = { frame: S.n, peak: +m.peak.toFixed(1), med: +med.toFixed(2), x: m.x, y: m.y, term: {} };
      const keep = sc.triMesh.material;
      for (const k of Object.keys(mats)) {
        sc.triMesh.material = mats[k];
        r.setRenderTarget(sc.rtScene); r.render(sc.scene, sc.camera);
        const a = reduce();
        rec.term[k] = `${a.peak.toFixed(2)}@${a.x},${a.y}`;
      }
      sc.triMesh.material = keep;
      sc.scene.children.forEach((o, i) => { o.visible = vis[i]; });
      S.spikes.push(rec);
    }
    r.setRenderTarget(null);
  };
});

await pg.waitForTimeout(+secondsArg * 1000);
const out = await pg.evaluate(() => window.__glt);
console.log(`frames ${out.n}, spikes ${out.spikes.length}`);
for (const s of out.spikes) {
  console.log(`f${s.frame} peak ${s.peak} (med ${s.med}) at ${s.x},${s.y}`);
  for (const [k, v] of Object.entries(s.term)) console.log(`     ${k.padEnd(6)} ${v}`);
}
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
