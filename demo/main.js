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
// THE SHIPPED AIR, not a copy of it. windField() bakes the mode table once,
// windGLSL() emits the same numbers as shader source, windAt() sums them in
// JS for the CPU-side drifters — one field, three readers, same file the
// simulation runs. Everything it needs is pure math (00_math.js), so the
// browser can import it exactly as Node does.
import { windField, windAt, windGLSL, WORLD as WIND_WORLD } from './src/37_wind.js';

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
  fern5: { url: './export/demo_cathedral_fern_5.glb', kind: 'adult' },
  fern21s: { url: './export/demo_cathedral_fern_21_sen.glb', kind: 'adult' },
  fern3j: { url: './export/demo_cathedral_fern_3_juv.glb', kind: 'juv' },
  creep7: { url: './export/demo_ember_creeper_7.glb', kind: 'adult' },
  creep12: { url: './export/demo_ember_creeper_12.glb', kind: 'adult' },
  creep21j: { url: './export/demo_ember_creeper_21_juv.glb', kind: 'juv' },
  creep33j: { url: './export/demo_ember_creeper_33_juv.glb', kind: 'juv' },
  para3: { url: './export/demo_nightglass_parasol_3.glb', kind: 'adult' },
  para9: { url: './export/demo_nightglass_parasol_9.glb', kind: 'adult' },
  para5j: { url: './export/demo_nightglass_parasol_5_juv.glb', kind: 'juv' },
  para17j: { url: './export/demo_nightglass_parasol_17_juv.glb', kind: 'juv' },
  coral5: { url: './export/demo_sun_coral_5.glb', kind: 'adult' },
  coral2: { url: './export/demo_sun_coral_2.glb', kind: 'adult' },
  coral9j: { url: './export/demo_sun_coral_9_juv.glb', kind: 'juv' },
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

// --- release knobs -----------------------------------------------------------
// All URL parameters, cinematic defaults: ?post=none kills the composer,
// ?dpr=1 caps resolution, ?grass=16000 thins the meadow, ?plants=0.5 sows
// half the field. The fps meter is always on — a demo that hides its own
// frame rate is asking to be trusted instead of measured.
const Q = new URLSearchParams(location.search);
const POST = Q.get('post') ?? 'bloom';
const DPR = +(Q.get('dpr') || Math.min(devicePixelRatio, 2));
const GRASS_N = Math.max(0, +(Q.get('grass') || 64000) | 0);
const DENSITY = Math.min(2, Math.max(0.1, +(Q.get('plants') || 1)));

// --- renderer ----------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 320);

const C = (a, mul = 1) => new THREE.Color().setRGB(a[0] * mul, a[1] * mul, a[2] * mul);

// --- bloom: the native look, finally — and HAND-ROLLED, with a reason -------
// The engine's browser renderer draws veins as additive LIGHT and grades the
// frame; without a bloom pass the emissive channel this exporter ships is a
// whisper. UnrealBloomPass renders BLACK in this container's headless GL on
// every backend (default, angle, swiftshader — all bisected to 0.0000 mean
// while a plain RenderPass+OutputPass composer drew fine, so it is the pass
// and not the float targets). Owning ~60 lines beats shipping a dependency
// that hands some viewers the documented black frame: threshold at quarter
// res, one separable 9-tap gaussian, additive composite with a vignette.
// ?post=none skips everything (the bisect switch that found this; kept).
const dbs = new THREE.Vector2();
renderer.getDrawingBufferSize(dbs);
const rtScene = new THREE.WebGLRenderTarget(dbs.x, dbs.y, { type: THREE.HalfFloatType });
const rtA = new THREE.WebGLRenderTarget(dbs.x >> 2, dbs.y >> 2, { type: THREE.HalfFloatType, depthBuffer: false });
const rtB = new THREE.WebGLRenderTarget(dbs.x >> 2, dbs.y >> 2, { type: THREE.HalfFloatType, depthBuffer: false });

const fsScene = new THREE.Scene();
const fsCam = new THREE.Camera();
const fsGeo = new THREE.BufferGeometry();   // one big triangle, no matrices
fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 3, -1, -1, 3], 2));
const fsMesh = new THREE.Mesh(fsGeo, null);
fsMesh.frustumCulled = false;
fsScene.add(fsMesh);
const FSV = `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const thresholdMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, thr: { value: 0.55 }, knee: { value: 0.25 } },
  vertexShader: FSV,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tex; uniform float thr, knee;
    void main(){
      // additive emissive lines can stack to Inf in a half-float target, and
      // Inf through the ACES rational is NaN, which the blur then smears into
      // black rectangles — watched. Clamp at the door.
      vec3 c = min(max(texture2D(tex, vUv).rgb, 0.0), 64.0);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      gl_FragColor = vec4(c * smoothstep(thr, thr + knee, l), 1.0); }`,
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
  vertexShader: FSV,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir;
    void main(){
      vec3 c = texture2D(tex, vUv).rgb * 0.227;
      c += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316;
      c += (texture2D(tex, vUv + dir * 3.231).rgb + texture2D(tex, vUv - dir * 3.231).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0); }`,
});
const compMat = new THREE.ShaderMaterial({
  uniforms: { base: { value: null }, glowTex: { value: null }, strength: { value: 0.9 } },
  vertexShader: FSV,
  fragmentShader: `varying vec2 vUv; uniform sampler2D base, glowTex; uniform float strength;
    void main(){
      vec3 c = min(max(texture2D(base, vUv).rgb, 0.0), 64.0)
             + min(max(texture2D(glowTex, vUv).rgb, 0.0), 64.0) * strength;
      // three only tone maps when rendering to SCREEN, so the target holds
      // linear HDR — the grade has to happen here or it silently vanishes:
      // ACES (Narkowicz fit), a gentle vignette, then the sRGB the screen expects
      c *= 1.15;
      c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
      float d = length(vUv - 0.5);
      c *= 1.0 - 0.34 * smoothstep(0.35, 0.78, d);
      gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0); }`,
});

function fsPass(mat, target) {
  fsMesh.material = mat;
  renderer.setRenderTarget(target);
  renderer.render(fsScene, fsCam);
}
// renderer.info resets per render() call, so after the bloom passes it holds
// the composite quad — 1 call, 1 triangle — which a perf probe faithfully
// reported as the whole scene. Snapshot the SCENE pass's numbers.
const lastInfo = { calls: 0, triangles: 0 };
function draw() {
  if (POST === 'none') {
    renderer.setRenderTarget(null); renderer.render(scene, cam);
    lastInfo.calls = renderer.info.render.calls; lastInfo.triangles = renderer.info.render.triangles;
    return;
  }
  renderer.setRenderTarget(rtScene);
  renderer.render(scene, cam);
  lastInfo.calls = renderer.info.render.calls; lastInfo.triangles = renderer.info.render.triangles;
  thresholdMat.uniforms.tex.value = rtScene.texture;
  fsPass(thresholdMat, rtA);
  for (let i = 0; i < 2; i++) {
    blurMat.uniforms.tex.value = rtA.texture;
    blurMat.uniforms.dir.value.set((1 + i) / rtA.width, 0);
    fsPass(blurMat, rtB);
    blurMat.uniforms.tex.value = rtB.texture;
    blurMat.uniforms.dir.value.set(0, (1 + i) / rtA.height);
    fsPass(blurMat, rtA);
  }
  compMat.uniforms.base.value = rtScene.texture;
  compMat.uniforms.glowTex.value = rtA.texture;
  fsPass(compMat, null);
}

// the moon's place in the sky is shared by the dome, the key light and the
// water's streak — one direction, three readers, or the picture disagrees
// with itself about where its own light comes from
const MOON = new THREE.Vector3(-0.55, 0.28, 0.72).normalize();

// --- the wind ----------------------------------------------------------------
// The field is the engine's own: log-law profile, Kolmogorov octave ladder,
// Taylor advection, divergence-free, at the shipped force-2 weather. What is
// approximated here is the RESPONSE — a plant leans along the field with a
// first-mode cantilever weight (y/H)^1.5, quasi-statically, because the bend
// solver (39a_stem.js) is a simulation and this page is a scene. The field's
// slowest octaves are 0.13-0.5 Hz, well under any stem's own mode, so the
// quasi-static read is honest for what dominates; what it forgoes is ringing.
// t is PLANT TIME (125 units per second), exactly as the module warns.
const WF = windField({ seed: 2527 });
const WIND_SRC = windGLSL(WF, 'canWind');
const M2UNIT = (1 / WIND_WORLD.unitM).toFixed(4);            // metres -> world units
const VEL2MS = (WIND_WORLD.unitM * WIND_WORLD.ptPerSec).toFixed(4); // field -> m/s
const PT_PER_SEC = WIND_WORLD.ptPerSec;
const windShaders = [];
let windT = 300 * PT_PER_SEC;   // where stills sample the gust ladder; drifts live

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
      moonDir: { value: MOON }, moonCol: { value: C(P.bgGlow, 6).lerp(new THREE.Color(0.9, 0.95, 1.0), 0.55) },
    },
    vertexShader: `varying vec3 vp; void main(){ vp = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vp; uniform vec3 top, bot, glow, moonDir, moonCol;
      float hash(vec3 c){ return fract(sin(dot(c, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vp);
        float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        // hold the fog colour through the horizon and only then climb
        vec3 c = mix(bot, top, smoothstep(0.52, 0.95, t));
        // the glow band sits a few degrees ABOVE the horizon, never on it
        c += glow * exp(-abs(d.y) * 6.0) * smoothstep(0.004, 0.05, d.y);
        // the moon: a disc, a limb, and a wide halo the fog would give it
        float md = dot(d, moonDir);
        c += moonCol * smoothstep(0.9989, 0.99955, md);            // disc, ~2.7 deg
        c += moonCol * 0.35 * pow(max(md, 0.0), 220.0);            // halo
        c += moonCol * 0.06 * pow(max(md, 0.0), 24.0);             // sky wash
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
    uniforms: {
      deep: { value: C(P.bgBot, 1.6) }, skyc: { value: C(P.fog, 2.4) }, glow: { value: C(P.bgGlow, 1.2) },
      moonDir: { value: MOON }, moonCol: { value: C(P.bgGlow, 6).lerp(new THREE.Color(0.9, 0.95, 1.0), 0.55) },
    },
    vertexShader: `varying vec3 vw; varying vec3 vn;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0); vw = w.xyz; vn = vec3(0.,1.,0.);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vw; varying vec3 vn; uniform vec3 deep, skyc, glow, moonDir, moonCol;
      void main(){
        vec3 V = normalize(cameraPosition - vw);
        // a floor under the fresnel: real water reflects ~2% at normal
        // incidence but a pond with nothing to refract renders as a hole —
        // the sky share needs to start above zero to read as a surface
        float fr = 0.18 + 0.82 * pow(1.0 - max(dot(V, vn), 0.0), 2.5);
        vec3 c = mix(deep, skyc, fr) + glow * fr * 0.5;
        // the moon's streak — same direction the dome draws the disc in
        vec3 R = reflect(-V, vn);
        c += moonCol * pow(max(dot(R, moonDir), 0.0), 180.0) * 1.6;
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
  // grass rides the same field at a floppier gain — no emissive, so boost 0
  // and the #ifdef compiles the glow line out
  patchMaterial(mat, 0, 0.1, 0.05);
  const COUNT = GRASS_N;
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
// more sky fill than a studio would use: the key sits at a moon's low
// elevation, and at that angle a doubleSided canopy shows black facets
// wherever a blade turns away — watched as speckle across every drift
scene.add(new THREE.HemisphereLight(C(P.ambTop, 1.15), C(P.ambBot, 0.9), 1.15));
// the key IS the moon — same direction the dome draws the disc in,
// its colour pulled toward the moon's, so shadows and sky agree
const key = new THREE.DirectionalLight(C(P.key).lerp(new THREE.Color(0.8, 0.88, 1.0), 0.45), 1.5);
key.position.copy(MOON).multiplyScalar(60);
scene.add(key);
const rim = new THREE.DirectionalLight(C(P.bgGlow, 3.0), 0.5);
rim.position.set(10, 4, -14);
scene.add(rim);

// --- ground mist: billboard fog cards ----------------------------------------
// Sprites so they face every framing. A radial-gradient canvas texture, huge,
// near-transparent, hovering at chest height — the cheap trick every
// atmospheric three.js scene uses, and it earns its place.
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const rnd = mulberry32(5150);
  window.__mists = [];
  for (let i = 0; i < 11; i++) {
    const m = new THREE.SpriteMaterial({
      map: tex, color: C(P.fog, 2.0), transparent: true,
      opacity: 0.05 + rnd() * 0.06, depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * 14;
    s.position.set(Math.cos(a) * r, 0.5 + rnd() * 0.9, Math.sin(a) * r);
    s.scale.set(14 + rnd() * 14, 2.2 + rnd() * 2.2, 1);
    scene.add(s);
    window.__mists.push(s);
  }
}

// --- spore motes: the air over a field like this would not be empty ----------
// Faint additive points; the bloom pass is what turns them into fireflies.
{
  const rnd = mulberry32(6060);
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, r = 1.5 + Math.sqrt(rnd()) * 16;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.3 + rnd() * rnd() * 2.4;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color: C(P.bgGlow, 14), size: 0.035, sizeAttenuation: true,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  scene.add(new THREE.Points(g, m));
  window.__motes = g.attributes.position;
}

// --- the material patch: alpha back into glow, and the air into the vertex ---
// One onBeforeCompile doing both. heightM is the plant's own grown height (off
// the bbox its exporter wrote), so the bend weight tops out at the actual tip;
// amp is metres of lean per m/s of wind — the one aesthetic number in the wind
// path, sized so a gust at the shipped weather leans a herb a few centimetres,
// which is the band the native piece measures (1.9 deg on the floppiest).
function patchMaterial(m, boost, heightM, amp) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEmisBoost = { value: boost };
    sh.uniforms.uWindT = { value: windT };
    sh.uniforms.uWindAmp = { value: amp };
    sh.uniforms.uInvH = { value: 1 / Math.max(heightM, 0.01) };
    windShaders.push(sh);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {',
        `${WIND_SRC}\nuniform float uWindT, uWindAmp, uInvH;\nvoid main() {`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 wpw = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vec3 wpw = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        // evaluate at the VERTEX, not the base: the ladder's big octaves are
        // far larger than a plant so it still moves as one thing, and the
        // small ones put per-leaf texture on top for free
        vec3 uw = canWind(wpw * ${M2UNIT}, uWindT) * ${VEL2MS};
        float bendw = pow(clamp(transformed.y * uInvH, 0.0, 1.0), 1.5);
        transformed += vec3(uw.x, uw.y * 0.3, uw.z) * (uWindAmp * bendw);
      }`);
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
  const bb = scenes[k].userData?.bbox;
  const hM = bb ? (bb.max[1] - bb.min[1]) * (scenes[k].userData.unitM ?? WIND_WORLD.unitM) : 1.2;
  scenes[k].traverse((o) => {
    if (o.isMesh) {
      patchMaterial(o.material, 2.2, hM, 0.02);
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
const CAMS = [[13.8, 10.8], [4.6, 0.6], [-5.4, -3.6], [8.9, -8.8], [12.6, -13.2]];
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
    const n = Math.max(1, Math.round((g.per[0] + Math.floor(fieldRnd() * (g.per[1] - g.per[0] + 1))) * DENSITY));
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
for (let i = 0; i < Math.round(45 * DENSITY); i++) {
  const a = fieldRnd() * Math.PI * 2, rr = 2 + Math.sqrt(fieldRnd()) * 16;
  const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
  const key = keys[(fieldRnd() * keys.length) | 0];
  if (claim(x, z, ASSETS[key].kind === 'adult' ? 0.85 : 0.38)) { plant(key, x, z); planted++; }
}
console.log(`sowed ${planted} plants`);

// --- the flight --------------------------------------------------------------
// The pollinator's tour: ?cam=flight (and the film tool's default). A
// Catmull-Rom spline threaded through the SOWN field — waypoints are found
// off the actual claimed plant positions, so the path adapts to what grew:
// in low over the far drifts, close past an adult, blade-height through the
// mid-field, half a loop around the hero, a skim across the pond and its
// moon streak, then up and out facing the moon. Terrain-aware, plant-aware
// (a soft push off any stem it strays into), with a flutter bob and a bank
// into the turns, both small — a camera that moves like an insect and cuts
// like one are different things, and only the first is wanted.
const FLIGHT_S = 20;
const flightCurve = (() => {
  const P = (x, z, h) => new THREE.Vector3(x, ground(x, z) + h, z);
  // the nearest adult to a spot, so a "flyby" is of a plant that exists
  const adultNear = (x, z) => {
    let best = null, bd = 1e9;
    for (const p of claimed) {
      if (p.r < 0.8) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best ?? { x, z };
  };
  const a1 = adultNear(-4, 2.5), a2 = adultNear(-2, -2.5), a3 = adultNear(3, -2);
  const raw = new THREE.CatmullRomCurve3([
    P(-15, 8.5, 2.4),                      // in over the far field
    P(-8.5, 5, 1.0),                       // descending
    P(a1.x + 0.8, a1.z + 0.5, 0.7),        // first flyby, shoulder height
    P((a1.x + a2.x) / 2 - 0.6, (a1.z + a2.z) / 2, 0.5),
    P(a2.x - 0.8, a2.z - 0.5, 0.6),        // second flyby
    P(-1.7, 2.1, 1.0),                     // approach the hero
    P(1.9, 1.5, 1.15),                     // half a loop around it — WIDE:
    P(2.1, -1.3, 0.9),                     // the tight version whipped the yaw
    P(a3.x + 0.7, a3.z + 0.7, 0.55),       // out through the coral drift
    P(4.2, -3.8, 0.45),                    // dropping toward the water
    new THREE.Vector3(5.2, POND.y + 0.35, -5.0),  // the skim — moon in the water
    P(7.6, -7.6, 1.2),                     // climbing out
    P(10.2, -10.6, 2.3),                   // and away, facing the moon
  ]);
  // BAKE the avoidance into the curve, then smooth it — the first version
  // pushed off plants per FRAME, and a force that kicks in and out as the
  // path brushes each stem is a jerk by construction; a viewer called it
  // exactly that. Push the samples, clamp them to the ground, then three
  // box-smooth passes so what remains is one continuous line.
  const N = 320, pts = [];
  for (let i = 0; i <= N; i++) {
    const p = raw.getPointAt(i / N);
    for (let pass = 0; pass < 2; pass++) {
      for (const c of claimed) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
        if (d < 0.5 && d > 1e-6 && p.y < 1.7) {
          const push = (0.5 - d) * 0.9;
          p.x += (dx / d) * push; p.z += (dz / d) * push;
        }
      }
    }
    p.y = Math.max(p.y, ground(p.x, p.z) + 0.22);
    pts.push(p);
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 2; i < pts.length - 2; i++) {
      pts[i].set(
        (pts[i - 2].x + pts[i - 1].x + pts[i].x + pts[i + 1].x + pts[i + 2].x) / 5,
        (pts[i - 2].y + pts[i - 1].y + pts[i].y + pts[i + 1].y + pts[i + 2].y) / 5,
        (pts[i - 2].z + pts[i - 1].z + pts[i].z + pts[i + 1].z + pts[i + 2].z) / 5);
    }
  }
  for (const p of pts) p.y = Math.max(p.y, ground(p.x, p.z) + 0.2);

  // THE GAZE IS BAKED AND RATE-LIMITED, and this is the part that makes the
  // film provably smooth rather than probably smooth. A runtime lookAt at a
  // point ahead on the spline flipped the camera 135 degrees in one frame
  // where the avoidance bake left a cusp near the pond — the ahead point
  // crossed BEHIND the camera. Measured by the jerk probe, not seen. So:
  // per-sample forward directions from a wide displacement window, the
  // farewell blended in here, and then a hard cap on degrees-per-sample —
  // a whip is now impossible by construction, not unlikely by tuning.
  const fwd = [];
  const fare = new THREE.Vector3(MOON.x * 40, MOON.y * 40 - 6, MOON.z * 40).normalize();
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(i - 2, 0)], b = pts[Math.min(i + 8, N)];
    const f = new THREE.Vector3().subVectors(b, a);
    if (f.lengthSq() < 1e-9) f.copy(fwd[i - 1] ?? new THREE.Vector3(0, 0, -1));
    f.normalize();
    f.lerp(fare, sm(clamp01((i / N - 0.72) / 0.22))).normalize();
    fwd.push(f);
  }
  const CAP = 1.0 * Math.PI / 180;   // 1 deg/sample ≈ 0.67 deg/frame at 24fps
  const axis = new THREE.Vector3();
  for (let i = 1; i <= N; i++) {
    const ang = fwd[i - 1].angleTo(fwd[i]);
    if (ang > CAP) {
      axis.crossVectors(fwd[i - 1], fwd[i]);
      if (axis.lengthSq() < 1e-12) { fwd[i].copy(fwd[i - 1]); continue; }
      axis.normalize();
      fwd[i].copy(fwd[i - 1]).applyAxisAngle(axis, CAP).normalize();
    }
  }
  return { pts, fwd, N };
})();
const CAM_MODE = Q.get('cam') ?? 'drift';
// runtime is just interpolation of the baked arrays — position, forward —
// plus the flutter bob (which translates the camera and its look target
// together, so it cannot turn the view) and a followed bank.
const _fp = new THREE.Vector3(), _ff = new THREE.Vector3(), _lk = new THREE.Vector3();
let rollEMA = 0, lastU = -1;
function flightCam(s) {
  // ease both ends so the flight leaves and arrives instead of starting
  const u = (1 - Math.cos(Math.PI * Math.min(Math.max(s / FLIGHT_S, 0), 1))) / 2;
  if (lastU < 0 || u < lastU) rollEMA = 0;
  lastU = u;
  const { pts, fwd, N } = flightCurve;
  const x = u * N, i0 = Math.min(Math.floor(x), N - 1), ft = x - i0;
  _fp.lerpVectors(pts[i0], pts[i0 + 1], ft);
  _ff.lerpVectors(fwd[i0], fwd[i0 + 1], ft).normalize();
  // flutter: two incommensurate bobs, centimetres — an insect, not a drone
  _fp.y += Math.sin(s * 2.1) * 0.035 + Math.sin(s * 3.7) * 0.02;
  cam.position.copy(_fp);
  cam.up.set(0, 1, 0);
  cam.lookAt(_lk.copy(_fp).addScaledVector(_ff, 3));
  // bank into the turn: roll off the horizontal turn rate, followed not snapped
  const f2 = fwd[Math.min(i0 + 4, N)];
  const roll = Math.max(-0.06, Math.min(0.06, (_ff.x * f2.z - _ff.z * f2.x) * 4));
  rollEMA += (roll - rollEMA) * 0.08;
  cam.rotateZ(rollEMA);
}
window.__camQ = () => cam.quaternion.toArray();   // for the jerk probe

// --- framings ----------------------------------------------------------------
const FRAMES = {
  // wide faces the moon — an overview with the light source in frame; field
  // is the old moonless overview kept for the drift-density view
  wide: { eye: [12.6, 3.6, -13.2], look: [-1.2, 2.3, 1.8], fov: 42 },
  field: { eye: [13.8, 3.4, 10.8], look: [0, 0.9, 0], fov: 40 },
  hero: { eye: [4.6, 1.35, 0.6], look: [0, 1.3, 0.3], fov: 42 },
  grove: { eye: [-5.4, 0.9, -3.6], look: [1.4, 1.1, 1.1], fov: 55 },
  pond: { eye: [8.9, 0.8, -8.8], look: [0, 1.25, 0.4], fov: 44 },
};
window.__frame = (name, tSec = 300) => {
  const f = FRAMES[name]; if (!f) return Object.keys(FRAMES);
  cam.position.fromArray(f.eye);
  cam.fov = f.fov; cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3().fromArray(f.look));
  // stills sample the gust ladder at one fixed plant time, so a capture is
  // reproducible — the field still shows in them as differential lean. tSec
  // is there so two stills can A/B the wind itself.
  for (const sh of windShaders) sh.uniforms.uWindT.value = tSec * PT_PER_SEC;
  draw();
  return name;
};

// --- run ---------------------------------------------------------------------
addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.getDrawingBufferSize(dbs);
  rtScene.setSize(dbs.x, dbs.y);
  rtA.setSize(dbs.x >> 2, dbs.y >> 2);
  rtB.setSize(dbs.x >> 2, dbs.y >> 2);
});

let t0 = performance.now(), tLast = performance.now();
const _w = new Float32Array(3);
// one drifter step: sample the shipped field AT the drifter, in world units
// and plant time, and carry it downwind. Mist is heavy air (slow), a spore is
// nearly the air itself.
function advect(p, dt, gain) {
  windAt(_w, WF, p.x * 16, p.y * 16, p.z * 16, windT);
  p.x += _w[0] * 7.8125 * gain * dt;
  p.y += _w[1] * 7.8125 * gain * 0.4 * dt;
  p.z += _w[2] * 7.8125 * gain * dt;
  if (Math.hypot(p.x, p.z) > 19) { p.x *= -0.94; p.z *= -0.94; }  // re-enter upwind
}
const drift = (t) => {
  const s = (t - t0) / 1000, dt = Math.min((t - tLast) / 1000, 0.1);
  meter(t - tLast);
  tLast = t;
  windT = (300 + s) * PT_PER_SEC;
  for (const sh of windShaders) sh.uniforms.uWindT.value = windT;
  for (const sp of window.__mists) advect(sp.position, dt, 0.12);
  const mp = window.__motes;
  for (let i = 0; i < mp.count; i++) {
    _p.set(mp.getX(i), mp.getY(i), mp.getZ(i));
    advect(_p, dt, 0.5);
    if (_p.y < 0.15 || _p.y > 3.2) _p.y = 0.3 + (i % 7) * 0.3;
    mp.setXYZ(i, _p.x, _p.y, _p.z);
  }
  mp.needsUpdate = true;
  if (CAM_MODE === 'flight') {
    flightCam(s % (FLIGHT_S + 2));   // live viewing loops with a beat of rest
  } else {
    const a = 0.72 + s * 0.021, r = 11.4 - Math.sin(s * 0.05) * 1.3;
    cam.position.set(Math.sin(a) * r, 2.1 + Math.sin(s * 0.11) * 0.4, Math.cos(a) * r);
    cam.lookAt(0, 1.15, 0);
  }
  // __skipDraw lets a resumed film replay the INTEGRATED state — the mist and
  // motes accumulate position, unlike the camera and the sway, which are pure
  // functions of time — without paying for 400 renders it already has on disk
  if (!window.__skipDraw) draw();
};
const _p = new THREE.Vector3();
window.__hold = false;
renderer.setAnimationLoop((t) => { if (!window.__hold) drift(t); });
// deterministic time for offline filming: demo/film.mjs holds the RAF loop
// and drives this instead, one fabricated timestamp per frame — wall-clock
// recording under software GL is a slideshow, but a stepped render is smooth
// at any renderer speed because the clock is ours, not the machine's
window.__stepMs = (ms) => drift(t0 + ms);

// the fps meter — always on, top right, because a demo that hides its own
// frame rate is asking to be trusted instead of measured. EMA over frame
// times; software GL will honestly say 1, real GPUs say what they say.
const fpsEl = document.createElement('div');
fpsEl.id = 'fps';   // so the film tool can hide it — a meter in a film frame is a boom mic in shot
fpsEl.style.cssText = 'position:fixed;top:10px;right:12px;color:#9fb4ad;opacity:.8;'
  + 'font:12px ui-monospace,monospace;text-shadow:0 1px 2px #000;pointer-events:none;text-align:right';
document.body.appendChild(fpsEl);
let emaMs = 0, fpsTick = 0;
function meter(dtMs) {
  emaMs = emaMs ? emaMs * 0.92 + dtMs * 0.08 : dtMs;
  if (++fpsTick % 12 === 0) {
    fpsEl.textContent = `${(1000 / emaMs).toFixed(0)} fps · ${emaMs.toFixed(1)} ms · `
      + `${lastInfo.calls} calls · ${(lastInfo.triangles / 1e6).toFixed(2)}M tris`;
  }
}

window.__stats = () => ({
  triangles: lastInfo.triangles, calls: lastInfo.calls,
  meshes, lines, tris: Math.round(tris), plants: planted,
});
window.__ready = true;
