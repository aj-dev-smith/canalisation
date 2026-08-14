// THE STAND, IN SOMEONE ELSE'S RENDERER. Five grown specimens on a terrain,
// lit and fogged — the demo the asset pipeline exists for.
//
// The rule this scene keeps: the LOOK comes out of the GLBs, not out of art
// direction. Every specimen carries its species palette in its scene extras
// (bgTop/bgBot, fog, key light, ambient) because the exporter put it there,
// and the sky dome, the fog, and both lights below read the hero's palette
// rather than a colour anyone picked. The terrain is the one modelled thing
// in the frame and the HUD says so — it is environment, the same category as
// the wind, and its colours are derived from the same palette so it reads as
// the world the species evolved in rather than a stage it was dropped on.
//
// The emissive channel: the exporter bakes each vertex's emissive weight into
// COLOR_0's alpha (the format doc in tools/gltf_export.mjs). Three.js reads a
// VEC4 COLOR_0 as vertex colour + alpha, so a one-line onBeforeCompile turns
// that alpha back into glow — the veins light up the way they do at home. The
// conifer's needles arrive as LINES (VEINS=lines) and get additive blending,
// which is literally how src/60_render.js draws them.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- the stand, as staging ---------------------------------------------------
// Positions are staging, not simulation results — the same honesty note as the
// Blender exporter's arc. Clones share a grown geometry; a clone at another
// yaw is presentation, and the honest fix (more seeds) is a build_assets edit.
const STAND = [
  { url: '/export/demo_ashfall_spire_7.glb', hero: true, at: [[0, 0]] },
  { url: '/export/demo_ember_creeper_7.glb', at: [[-3.4, 2.6], [4.2, 1.1], [1.9, -4.6]] },
  { url: '/export/demo_nightglass_parasol_3.glb', at: [[-1.8, -2.3], [2.6, 3.4], [-4.8, -1.2]] },
  { url: '/export/demo_sun_coral_5.glb', at: [[3.3, -2.2], [-2.7, 4.4], [5.6, 3.0]] },
  { url: '/export/demo_cathedral_fern_21_sen.glb', at: [[-4.9, 3.3], [4.6, -4.2]] },
];

// --- seeded noise, so the terrain reproduces ---------------------------------
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
// height in metres. Gentle: the plants are 0.8-2.9 m and the ground should
// undulate under them, not compete. The centre flattens so the hero stands
// on ground rather than a slope.
function ground(x, z) {
  const h = (fbm(x * 0.09 + 7.3, z * 0.09 + 2.1) - 0.5) * 2.6
    + (fbm(x * 0.55, z * 0.55) - 0.5) * 0.22;
  const r = Math.hypot(x, z);
  return h * sm(Math.min(1, Math.max(0, (r - 1.5) / 6)));
}

// --- renderer ----------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 220);

const C = (a, mul = 1) => new THREE.Color().setRGB(a[0] * mul, a[1] * mul, a[2] * mul);

// --- load the stand ----------------------------------------------------------
const loader = new GLTFLoader();
const loaded = await Promise.all(STAND.map((s) => loader.loadAsync(s.url)));
const pal = loaded.find((_, i) => STAND[i].hero).scene.userData?.palette
  ?? loaded[0].scene.userData?.palette ?? null;
// GLTFLoader puts scene-level extras on scene.userData; the exporter wrote the
// palette there. If a foreign GLB ever lands here, fall back to a dusk.
const P = {
  bgTop: pal?.bgTop ?? [0.012, 0.02, 0.028], bgBot: pal?.bgBot ?? [0.004, 0.007, 0.01],
  bgGlow: pal?.bgGlow ?? [0.02, 0.03, 0.03], fog: pal?.fog ?? [0.01, 0.016, 0.02],
  key: pal?.keyCol ?? [1.0, 0.92, 0.8], ambTop: pal?.ambTop ?? [0.25, 0.3, 0.33],
  ambBot: pal?.ambBot ?? [0.1, 0.09, 0.08], stem: pal?.stem0 ?? [0.1, 0.12, 0.1],
  blade: pal?.blade1 ?? [0.1, 0.2, 0.15],
};

// --- sky: the species' own backdrop, as a dome -------------------------------
{
  const geo = new THREE.SphereGeometry(180, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      // the dome's floor is the FOG colour, not the palette's bgBot: the far
      // terrain resolves to fog, and if the sky resolves to anything else the
      // horizon is a stripe. The palette's own backdrop takes over with height.
      top: { value: C(P.bgTop) }, bot: { value: C(P.fog) }, glow: { value: C(P.bgGlow) },
    },
    vertexShader: `varying vec3 vp; void main(){ vp = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vp; uniform vec3 top, bot, glow;
      void main(){
        float t = clamp(normalize(vp).y * 0.5 + 0.5, 0.0, 1.0);
        // hold the fog colour through the horizon (t=0.5) and only then climb
        // to the palette's backdrop — mixing any earlier re-opens the seam the
        // fog-coloured floor exists to close
        vec3 c = mix(bot, top, smoothstep(0.52, 0.95, t));
        float ny = normalize(vp).y;
        // the glow band sits a few degrees ABOVE the horizon, never on it —
        // at y=0 it would brighten the sky against terrain the fog has already
        // matched, and the seam would be back wearing the glow's colour
        c += glow * exp(-abs(ny) * 6.0) * smoothstep(0.004, 0.05, ny);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
}
scene.fog = new THREE.FogExp2(C(P.fog), 0.064);

// --- terrain: the one modelled thing, wearing the palette --------------------
{
  const N = 220, SIZE = 90;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const soil = C(P.bgBot, 2.2), moss = C(P.blade, 0.32), rock = C(P.stem, 0.6);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = ground(x, z);
    p.setY(i, y);
    // slope by finite difference, cheap and only used for tinting
    const s = Math.min(1, Math.hypot(ground(x + 0.4, z) - y, ground(x, z + 0.4) - y) * 3.2);
    const m = (fbm(x * 0.7 + 40, z * 0.7 + 9) - 0.3) * 1.6;
    const c = soil.clone().lerp(moss, Math.max(0, Math.min(1, m)) * (1 - s)).lerp(rock, s * 0.55);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0,
  }));
  mesh.receiveShadow = false;
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
for (let i = 0; i < loaded.length; i++) {
  const src = loaded[i].scene;
  src.traverse((o) => {
    if (o.isMesh) {
      patchMaterial(o.material, 1.5);
      o.material.transparent = false;   // alpha is emissive weight, not opacity
      meshes++;
      const g = o.geometry;
      tris += g.index ? g.index.count / 3 : g.attributes.POSITION?.count / 3 || g.attributes.position.count / 3;
    } else if (o.isLine || o.isLineSegments) {
      // the browser's own move: additive glowing lines, depth-read no-write.
      // OPACITY IS LOAD-BEARING: a conifer is 235k segments, and at additive
      // full strength the crown sums to a solid white cone — watched, not
      // guessed. The browser gets away with it because its renderer grades
      // and its ribbons thin with the LOD; a raw line pass has to pay with
      // opacity instead.
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
  const rnd = mulberry32(101 + i);
  for (const [x, z] of STAND[i].at) {
    const inst = src === undefined ? null : (STAND[i].at.length > 1 ? src.clone() : src);
    inst.position.set(x, ground(x, z), z);
    inst.rotation.y = rnd() * Math.PI * 2;
    scene.add(inst);
  }
}

// --- framings ----------------------------------------------------------------
// Deterministic and reachable from the shot tool: __frame(name) is a contract.
const FRAMES = {
  wide: { eye: [10.5, 2.1, 8.6], look: [0, 1.35, 0], fov: 38 },
  hero: { eye: [4.8, 1.5, 2.4], look: [0, 1.55, 0], fov: 42 },
  grove: { eye: [-4.6, 0.75, -3.4], look: [0.4, 1.25, 0.4], fov: 50 },
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
  // a slow orbital drift through the wide framing; the shot tool bypasses it
  const s = (t - t0) / 1000;
  const a = 0.72 + s * 0.021, r = 10.9 - Math.sin(s * 0.05) * 1.2;
  cam.position.set(Math.sin(a) * r, 1.9 + Math.sin(s * 0.11) * 0.35, Math.cos(a) * r);
  cam.lookAt(0, 1.35, 0);
  renderer.render(scene, cam);
};
window.__hold = false;   // the shot tool sets this to stop the drift
renderer.setAnimationLoop((t) => { if (!window.__hold) drift(t); });

window.__stats = () => ({
  triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
  meshes, lines, tris: Math.round(tris),
});
window.__ready = true;
