// THE STAND, IN SOMEONE ELSE'S RENDERER — grown specimens in the middle of
// the standard procedural-landscape kit the three.js ecosystem trades in:
// fbm terrain with ridged far hills, instanced grass, displaced-icosahedron
// rocks, a pond, a starred sky. All of that is MODELLED ENVIRONMENT and the
// HUD says so plainly. The plants are the part that was grown, and the line
// between the two categories is this project's one rule, unchanged by
// leaving the browser: environment may be authored, organisms may not.
//
// The look still comes out of the GLBs: every specimen carries its species
// palette in scene extras, and the sky, fog, lights, terrain tint, rock tint
// and water all read the hero's palette rather than colours anyone picked.
//
// The emissive channel: the exporter bakes each vertex's emissive weight into
// COLOR_0's alpha. Three.js reads VEC4 COLOR_0 as colour + alpha, so one
// onBeforeCompile line turns that alpha back into glow — the veins light up
// the way they do at home.
//
// The conifer is deliberately absent. It has never read as well as the herbs
// (its one dominant vein strand is correct Picea and the reticulate network
// is the only channel this engine is visible through — the ROADMAP 13 needle
// verdict, applying to the export too), so the stand is herbs at several
// seeds and two life stages.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- the field ---------------------------------------------------------------
// A WILD FIELD, NOT AN ARRANGEMENT. Three things make a stand read as wild,
// and all three are ecology rather than art: NUMBERS (~150 individuals, not a
// dozen), AGE STRUCTURE (juveniles outnumber adults — the juvenile assets are
// the same species grown fewer steps, which is honest size variation; nothing
// is scaled), and CLUSTERED DISPERSAL (plants grow in drifts where seeds
// fell, so each species gets patch centres and members scatter around them —
// uniform-random placement is the diorama look wearing a different hat).
// Where each drift sits is still staging, same honesty note as ever; what is
// NOT staging is every plant in it.
const ASSETS = {
  fern5: { url: '/export/demo_cathedral_fern_5.glb', kind: 'adult' },
  fern21s: { url: '/export/demo_cathedral_fern_21_sen.glb', kind: 'adult' },
  fern3j: { url: '/export/demo_cathedral_fern_3_juv.glb', kind: 'juv' },
  creep7: { url: '/export/demo_ember_creeper_7.glb', kind: 'adult' },
  creep12: { url: '/export/demo_ember_creeper_12.glb', kind: 'adult' },
  creep21j: { url: '/export/demo_ember_creeper_21_juv.glb', kind: 'juv' },
  creep33j: { url: '/export/demo_ember_creeper_33_juv.glb', kind: 'juv' },
  para3: { url: '/export/demo_nightglass_parasol_3.glb', kind: 'adult' },
  para9: { url: '/export/demo_nightglass_parasol_9.glb', kind: 'adult' },
  para5j: { url: '/export/demo_nightglass_parasol_5_juv.glb', kind: 'juv' },
  para17j: { url: '/export/demo_nightglass_parasol_17_juv.glb', kind: 'juv' },
  coral5: { url: '/export/demo_sun_coral_5.glb', kind: 'adult' },
  coral2: { url: '/export/demo_sun_coral_2.glb', kind: 'adult' },
  coral9j: { url: '/export/demo_sun_coral_9_juv.glb', kind: 'juv' },
};
// per species: which assets, how many drifts, drift population, patch tightness
const GROUPS = [
  { assets: ['fern5', 'fern21s', 'fern3j'], adultShare: 0.45, drifts: 3, per: [3, 6], sigma: 1.6 },
  { assets: ['creep7', 'creep12', 'creep21j', 'creep33j'], adultShare: 0.3, drifts: 5, per: [6, 12], sigma: 2.1 },
  { assets: ['para3', 'para9', 'para5j', 'para17j'], adultShare: 0.3, drifts: 5, per: [6, 13], sigma: 1.9 },
  { assets: ['coral5', 'coral2', 'coral9j'], adultShare: 0.35, drifts: 5, per: [6, 12], sigma: 2.0 },
];
const HERO = { key: 'fern5', at: [0, 0.3] };

// --- seeded noise, so the whole environment reproduces -----------------------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lat = (() => {
  const r = mulberry32(2527);
  const g = new Float32Array(256 * 256);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (ix, iz) => g[((iz & 255) << 8) | (ix & 255)];
})();
const sm = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz);
  const a = lat(ix, iz), b = lat(ix + 1, iz), c = lat(ix, iz + 1), d = lat(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm(x, z) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { v += amp * vnoise(x * f, z * f); amp *= 0.5; f *= 2.03; }
  return v;
}
// ridged fbm — the far hills. |2n-1| folded and inverted is the standard trick
function ridged(x, z) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(2 * vnoise(x * f + 31.7, z * f + 11.3) - 1);
    v += amp * n * n; amp *= 0.5; f *= 2.11;
  }
  return v;
}

// the pond: a carved basin, and the water level that fills it
const POND = { x: 5.2, z: -5.0, r: 2.9, y: -0.16 };

// height in metres. A gentle meadow in the middle, ridged hills far out, and
// the basin carved last so the water has somewhere to sit.
function ground(x, z) {
  const r = Math.hypot(x, z);
  let h = ((fbm(x * 0.09 + 7.3, z * 0.09 + 2.1) - 0.5) * 2.6
    + (fbm(x * 0.55, z * 0.55) - 0.5) * 0.22)
    * sm(clamp01((r - 1.5) / 6));
  h += sm(clamp01((r - 20) / 22)) * ridged(x * 0.045, z * 0.045) * 7.5;
  const dp = Math.hypot(x - POND.x, z - POND.z);
  h -= 0.55 * Math.exp(-(dp * dp) / (2.0 * 2.0));
  return h;
}

// --- renderer ----------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 320);

const C = (a, mul = 1) => new THREE.Color().setRGB(a[0] * mul, a[1] * mul, a[2] * mul);

// --- load the stand ----------------------------------------------------------
const loader = new GLTFLoader();
const keys = Object.keys(ASSETS);
const loadedList = await Promise.all(keys.map((k) => loader.loadAsync(ASSETS[k].url)));
const scenes = {};
keys.forEach((k, i) => { scenes[k] = loadedList[i].scene; });
const pal = scenes[HERO.key].userData?.palette
  ?? loadedList[0].scene.userData?.palette ?? null;
const P = {
  bgTop: pal?.bgTop ?? [0.012, 0.02, 0.028], bgBot: pal?.bgBot ?? [0.004, 0.007, 0.01],
  bgGlow: pal?.bgGlow ?? [0.02, 0.03, 0.03], fog: pal?.fog ?? [0.01, 0.016, 0.02],
  key: pal?.keyCol ?? [1.0, 0.92, 0.8], ambTop: pal?.ambTop ?? [0.25, 0.3, 0.33],
  ambBot: pal?.ambBot ?? [0.1, 0.09, 0.08], stem: pal?.stem0 ?? [0.1, 0.12, 0.1],
  blade: pal?.blade1 ?? [0.1, 0.2, 0.15],
};

// --- sky: the species' backdrop as a dome, with a modelled star field --------
{
  const geo = new THREE.SphereGeometry(280, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      // the dome's floor is the FOG colour: the far terrain resolves to fog,
      // and if the sky resolves to anything else the horizon is a stripe
      top: { value: C(P.bgTop) }, bot: { value: C(P.fog) }, glow: { value: C(P.bgGlow) },
    },
    vertexShader: `varying vec3 vp; void main(){ vp = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vp; uniform vec3 top, bot, glow;
      float hash(vec3 c){ return fract(sin(dot(c, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vp);
        float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        // hold the fog colour through the horizon and only then climb
        vec3 c = mix(bot, top, smoothstep(0.52, 0.95, t));
        // the glow band sits a few degrees ABOVE the horizon, never on it
        c += glow * exp(-abs(d.y) * 6.0) * smoothstep(0.004, 0.05, d.y);
        // stars: hashed cells with a round falloff INSIDE the cell — lighting
        // the whole cell draws squares, a cell at this resolution being ~0.26
        // degrees, which is several pixels. Watched, not guessed.
        vec3 cell = floor(d * 220.0);
        float s = step(0.9985, hash(cell)) * (0.35 + 0.65 * hash(cell + 7.0));
        float core = smoothstep(0.22, 0.03, length(fract(d * 220.0) - 0.5));
        c += vec3(0.85, 0.92, 1.0) * s * core * 0.8 * smoothstep(0.06, 0.35, d.y);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
}
scene.fog = new THREE.FogExp2(C(P.fog), 0.044);

// --- terrain -----------------------------------------------------------------
const soil = C(P.bgBot, 2.2), moss = C(P.blade, 0.32), rockC = C(P.stem, 0.6);
{
  const N = 260, SIZE = 130;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = ground(x, z);
    p.setY(i, y);
    const s = Math.min(1, Math.hypot(ground(x + 0.4, z) - y, ground(x, z + 0.4) - y) * 3.2);
    const m = (fbm(x * 0.7 + 40, z * 0.7 + 9) - 0.3) * 1.6;
    const c = soil.clone().lerp(moss, clamp01(m) * (1 - s)).lerp(rockC, s * 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  })));
}

// --- water: a fresnel disc in the basin --------------------------------------
{
  const geo = new THREE.CircleGeometry(POND.r, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: false,
    // the reflected colour is the FOG's, not the zenith's: at the grazing
    // angles a ground camera sees, water mirrors the horizon, and in this
    // world the horizon is the fog — the zenith is near-black, and mixing
    // toward it left the pond reading as a hole a second time
    uniforms: { deep: { value: C(P.bgBot, 1.6) }, skyc: { value: C(P.fog, 2.4) }, glow: { value: C(P.bgGlow, 1.2) } },
    vertexShader: `varying vec3 vw; varying vec3 vn;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vw = w.xyz; vn = vec3(0.,1.,0.);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vw; varying vec3 vn; uniform vec3 deep, skyc, glow;
      void main(){
        vec3 V = normalize(cameraPosition - vw);
        // a floor under the fresnel: real water reflects ~2% at normal
        // incidence but a pond with nothing to refract renders as a hole —
        // the sky share needs to start above zero to read as a surface
        float fr = 0.18 + 0.82 * pow(1.0 - max(dot(V, vn), 0.0), 2.5);
        vec3 c = mix(deep, skyc, fr) + glow * fr * 0.5;
        gl_FragColor = vec4(c, 0.92); }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(POND.x, POND.y, POND.z);
  scene.add(m);
}

// --- rocks: displaced icosahedra ---------------------------------------------
{
  const rnd = mulberry32(4111);
  for (let i = 0; i < 12; i++) {
    const rad = 0.12 + rnd() * rnd() * 0.7;
    const geo = new THREE.IcosahedronGeometry(rad, 2);
    const p = geo.attributes.position, off = rnd() * 90;
    for (let v = 0; v < p.count; v++) {
      const nx = p.getX(v) / rad, ny = p.getY(v) / rad, nz = p.getZ(v) / rad;
      const d = 1 + (fbm(nx * 1.6 + off, nz * 1.6 + ny) - 0.5) * 0.7;
      p.setXYZ(v, p.getX(v) * d, p.getY(v) * d * 0.85, p.getZ(v) * d);
    }
    geo.computeVertexNormals();
    const a = rnd() * Math.PI * 2, r = 2.2 + rnd() * 12;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.4) continue;  // not in the pond
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: rockC.clone().lerp(soil, rnd() * 0.5), roughness: 1,
    }));
    m.position.set(x, ground(x, z) - rad * 0.12, z);
    m.rotation.y = rnd() * Math.PI * 2;
    scene.add(m);
  }
}

// --- grass: one blade, instanced ---------------------------------------------
// The ecosystem's signature move (see any of the recent procedural-terrain
// repos). One bent blade, ~40k instances, per-instance colour off the same
// moss the terrain wears — so the meadow and the ground read as one material.
{
  const H = 0.085, W = 0.011;
  const blade = new THREE.BufferGeometry();
  // four triangles up a slight curve; normals lean so both faces light
  const pts = [], idx = [];
  const SEGS = 4;
  for (let s = 0; s <= SEGS; s++) {
    const t = s / SEGS, y = t * H, lean = t * t * 0.35 * H, w = W * (1 - t * 0.85);
    pts.push(-w / 2, y, lean, w / 2, y, lean);
  }
  for (let s = 0; s < SEGS; s++) {
    const b = s * 2;
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  blade.setIndex(idx);
  blade.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
  const COUNT = 64000;
  const mesh = new THREE.InstancedMesh(blade, mat, COUNT);
  const rnd = mulberry32(909);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
    S = new THREE.Vector3(), T = new THREE.Vector3(), col = new THREE.Color();
  let placed = 0;
  while (placed < COUNT) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 21;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = ground(x, z);
    if (y < POND.y + 0.06) continue;                    // not in the water
    T.set(x, y - 0.004, z);
    E.set((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5);
    S.setScalar(0.7 + rnd() * 0.9);
    M.compose(T, Q.setFromEuler(E), S);
    mesh.setMatrixAt(placed, M);
    col.copy(moss).lerp(soil, rnd() * 0.55).multiplyScalar(1.0 + rnd() * 0.6);
    mesh.setColorAt(placed, col);
    placed++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
}

// --- lights: the palette's key and ambient, not a studio ---------------------
scene.add(new THREE.HemisphereLight(C(P.ambTop, 1.15), C(P.ambBot, 0.9), 0.85));
const key = new THREE.DirectionalLight(C(P.key), 1.35);
key.position.set(-14, 9, 10);
scene.add(key);
const rim = new THREE.DirectionalLight(C(P.bgGlow, 3.0), 0.5);
rim.position.set(10, 4, -14);
scene.add(rim);

// --- the emissive patch: alpha back into glow --------------------------------
function patchMaterial(m, boost) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEmisBoost = { value: boost };
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float uEmisBoost;\nvoid main() {')
      .replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef USE_COLOR_ALPHA
          totalEmissiveRadiance += vColor.rgb * vColor.a * uEmisBoost;
        #endif`);
  };
  m.needsUpdate = true;
}

let tris = 0, meshes = 0, lines = 0;
for (const k of keys) {
  scenes[k].traverse((o) => {
    if (o.isMesh) {
      patchMaterial(o.material, 1.5);
      o.material.transparent = false;   // alpha is emissive weight, not opacity
      meshes++;
      const g = o.geometry;
      tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    } else if (o.isLine || o.isLineSegments) {
      // additive glowing lines, depth-read no-write — and OPACITY IS
      // LOAD-BEARING at line counts like a conifer's (watched blowing out
      // solid white); the herbs' far-LODs ride the same setting
      o.material.blending = THREE.AdditiveBlending;
      o.material.transparent = true;
      o.material.opacity = 0.16;
      o.material.depthWrite = false;
      lines++;
    } else if (o.isPoints) {
      o.material.size = 0.01;
      o.material.blending = THREE.AdditiveBlending;
      o.material.transparent = true;
      o.material.depthWrite = false;
    }
  });
}

// --- sow the field -----------------------------------------------------------
// Clustered dispersal with collision: each species gets drift centres, members
// scatter around them with a gaussian, adults keep more ground than juveniles.
// Clones share geometry and materials with their asset; only the transform is
// per-plant. Everything is seeded, so the field reproduces.
const fieldRnd = mulberry32(7301);
const claimed = [];
const inPond = (x, z, m = 0.5) => Math.hypot(x - POND.x, z - POND.z) < POND.r + m;
// nothing sows inside a camera — a drift once landed exactly on the pond
// framing and the capture was the inside of a Sun Coral canopy
const CAMS = [[13.8, 10.8], [4.6, 0.6], [-5.4, -3.6], [8.9, -8.8]];
function claim(x, z, need) {
  if (Math.hypot(x, z) > 18 || inPond(x, z)) return false;
  for (const c of CAMS) if (Math.hypot(c[0] - x, c[1] - z) < 1.6) return false;
  for (const p of claimed) {
    if (Math.hypot(p.x - x, p.z - z) < Math.max(need, p.r)) return false;
  }
  claimed.push({ x, z, r: need });
  return true;
}
function plant(key, x, z) {
  const inst = scenes[key].clone();
  inst.position.set(x, ground(x, z), z);
  inst.rotation.y = fieldRnd() * Math.PI * 2;
  scene.add(inst);
}

claim(HERO.at[0], HERO.at[1], 1.2);
plant(HERO.key, HERO.at[0], HERO.at[1]);
let planted = 1;

for (const g of GROUPS) {
  const adults = g.assets.filter((k) => ASSETS[k].kind === 'adult');
  const juvs = g.assets.filter((k) => ASSETS[k].kind === 'juv');
  for (let d = 0; d < g.drifts; d++) {
    const a = fieldRnd() * Math.PI * 2, rr = 2.2 + Math.sqrt(fieldRnd()) * 12.5;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const n = g.per[0] + Math.floor(fieldRnd() * (g.per[1] - g.per[0] + 1));
    for (let i = 0; i < n; i++) {
      const u = Math.max(fieldRnd(), 1e-6), v = fieldRnd();
      const rad = g.sigma * Math.sqrt(-2 * Math.log(u)) * 0.7, th = v * Math.PI * 2;
      const x = cx + Math.cos(th) * rad, z = cz + Math.sin(th) * rad;
      const adult = fieldRnd() < g.adultShare;
      const pool = adult && adults.length ? adults : (juvs.length ? juvs : adults);
      const key = pool[(fieldRnd() * pool.length) | 0];
      if (claim(x, z, adult ? 0.85 : 0.38)) { plant(key, x, z); planted++; }
    }
  }
}
// loners — the stragglers between drifts that keep the patches from reading
// as islands
for (let i = 0; i < 45; i++) {
  const a = fieldRnd() * Math.PI * 2, rr = 2 + Math.sqrt(fieldRnd()) * 16;
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
  const key = keys[(fieldRnd() * keys.length) | 0];
  if (claim(x, z, ASSETS[key].kind === 'adult' ? 0.85 : 0.38)) { plant(key, x, z); planted++; }
}
console.log(`sowed ${planted} plants`);

// --- framings ----------------------------------------------------------------
const FRAMES = {
  wide: { eye: [13.8, 3.4, 10.8], look: [0, 0.9, 0], fov: 40 },
  hero: { eye: [4.6, 1.35, 0.6], look: [0, 1.3, 0.3], fov: 42 },
  grove: { eye: [-5.4, 0.9, -3.6], look: [1.4, 1.1, 1.1], fov: 55 },
  pond: { eye: [8.9, 0.8, -8.8], look: [0, 1.25, 0.4], fov: 44 },
};
window.__frame = (name) => {
  const f = FRAMES[name]; if (!f) return Object.keys(FRAMES);
  cam.position.fromArray(f.eye);
  cam.fov = f.fov; cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3().fromArray(f.look));
  renderer.render(scene, cam);
  return name;
};

// --- run ---------------------------------------------------------------------
addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let t0 = performance.now();
const drift = (t) => {
  const s = (t - t0) / 1000;
  const a = 0.72 + s * 0.021, r = 11.4 - Math.sin(s * 0.05) * 1.3;
  cam.position.set(Math.sin(a) * r, 2.1 + Math.sin(s * 0.11) * 0.4, Math.cos(a) * r);
  cam.lookAt(0, 1.15, 0);
  renderer.render(scene, cam);
};
window.__hold = false;
renderer.setAnimationLoop((t) => { if (!window.__hold) drift(t); });

window.__stats = () => ({
  triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
  meshes, lines, tris: Math.round(tris), plants: planted,
});
window.__ready = true;
