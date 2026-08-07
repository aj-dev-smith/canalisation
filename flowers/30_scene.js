// Streams -> Three.js. One mesh per stream, interleaved so a frame's upload is
// a single copy, capacities doubled on demand (a growing plant is the normal
// case here, not the exception).
//
// THE SHADING IS THE SHIPPED SHADING, TRANSLITERATED. Every lighting and grade
// decision below is copied line-for-line from src/60_render.js — hemisphere
// ambient, key diffuse at 0.9, the back-transmission term at 0.55, the rim at
// 0.7, emissive x3, fog mixed at 0.80, veins as colour TIMES emissive, points
// at x1.12 with no fog, ACES -> vignette -> grain -> gamma. The palettes were
// tuned against that pipeline for months; a renderer that improvises its own
// lighting hands back a silhouette (measured: first boot of this file). What
// Three.js adds on top — real orbit, per-frame camera-faced ribbons, mip-chain
// bloom — changes where you can stand, not what the plant is wearing.
//
// The vein ribbon is the load-bearing choice: the shipped rasteriser bakes six
// camera-facing vertices per vein per frame on the CPU; Blender got curves; we
// get an instanced quad expanded toward the eye in the vertex shader — which is
// ROADMAP 11's "a ribbon as twelve floats", built here because Three.js makes
// it an afternoon instead of a renderer rewrite. Same twelve floats.

const FL_FOG = `
  uniform vec3 uFog; uniform float uFogD, uFogNear;
  float flFog(vec3 p, vec3 eye) {
    return clamp(1.0 - exp(-max(0.0, length(p - eye) - uFogNear) * uFogD), 0.0, 1.0);
  }
`;

const FL_TRI_VS = `
  attribute vec3 col;
  attribute float emis;
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  void main() {
    vP = position; vN = normal; vC = col; vE = emis;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FL_TRI_FS = `
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
  ${FL_FOG}
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(uEye - vP);
    if (dot(N, V) < 0.0) N = -N;
    float d = max(dot(N, uKey), 0.0);
    float back = pow(max(dot(-N, uKey), 0.0), 2.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
    vec3 c = vC * (amb + uKeyCol * d * 0.9) + vC * uKeyCol * back * 0.55 + rim * uAmbTop * 0.7;
    c += vC * vE * 3.0;
    c = mix(c, uFog, flFog(vP, uEye) * 0.80);
    gl_FragColor = vec4(c, 1.0);
  }
`;

// The petal stream: shipped lighting, with the chemistry channels along for
// the ride. vDD is the distance-to-vein field, vQ the floral identity, vU the
// proximodistal coordinate — 35_shade.js (the mechanism layer) is what reads
// them; until it lands this is the tri shader with more varyings.
const FL_PET_VS = `
  attribute vec3 col;
  attribute float emis;
  attribute float aDD; attribute float aQ; attribute float aU; attribute float aV;
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  varying float vDD; varying float vQ; varying float vU; varying float vV;
  void main() {
    vP = position; vN = normal; vC = col; vE = emis;
    vDD = aDD; vQ = aQ; vU = aU; vV = aV;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FL_PET_FS = `
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  varying float vDD; varying float vQ; varying float vU; varying float vV;
  uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
  ${FL_FOG}
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(uEye - vP);
    if (dot(N, V) < 0.0) N = -N;
    float d = max(dot(N, uKey), 0.0);
    float back = pow(max(dot(-N, uKey), 0.0), 2.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
    vec3 c = vC * (amb + uKeyCol * d * 0.9) + vC * uKeyCol * back * 0.55 + rim * uAmbTop * 0.7;
    c += vC * vE * 3.0;
    c = mix(c, uFog, flFog(vP, uEye) * 0.80);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const FL_RIB_VS = `
  attribute vec3 iA; attribute vec3 iB; attribute vec2 iW; attribute vec3 iC; attribute float iE;
  varying vec3 vC; varying float vE; varying vec3 vP;
  uniform vec3 uEye;
  void main() {
    // position.x in {-1,+1} picks the side, position.y in {0,1} picks the end
    vec3 p = mix(iA, iB, position.y);
    vec3 axis = normalize(iB - iA + vec3(1e-9));
    vec3 toEye = normalize(uEye - p);
    vec3 side = normalize(cross(axis, toEye) + vec3(1e-9));
    float w = mix(iW.x, iW.y, position.y);
    p += side * position.x * w;
    vC = iC; vE = iE; vP = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FL_RIB_FS = `
  varying vec3 vC; varying float vE; varying vec3 vP;
  uniform vec3 uEye;
  ${FL_FOG}
  void main() {
    vec3 c = vC * vE;
    c *= (1.0 - flFog(vP, uEye) * 0.8);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const FL_PT_VS = `
  attribute vec3 col; attribute float psize;
  varying vec3 vC;
  uniform float uPx;
  void main() {
    vC = col;
    vec4 cp = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = cp;
    gl_PointSize = clamp(psize * uPx / max(0.001, cp.w), 1.0, 64.0);
  }
`;
const FL_PT_FS = `
  varying vec3 vC;
  void main() {
    vec2 d = gl_PointCoord * 2.0 - 1.0;
    float r = dot(d, d);
    if (r > 1.0) discard;
    float a = smoothstep(1.0, 0.15, r);
    gl_FragColor = vec4(vC * a * 1.12, 1.0);
  }
`;

// The void: shipped BG_FS on a full-screen triangle pinned behind everything.
const FL_BG_VS = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;
const FL_BG_FS = `
  varying vec2 vUv;
  uniform vec3 uTop, uBot, uGlow; uniform float uT;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    vec3 c = mix(uBot, uTop, pow(clamp(vUv.y, 0.0, 1.0), 0.75));
    float d = length(p * vec2(1.0, 1.25) - vec2(0.0, -0.15));
    c += uGlow * exp(-d * 2.1) * (0.85 + 0.15 * sin(uT * 0.0007));
    gl_FragColor = vec4(c, 1.0);
  }
`;

// The grade: shipped COMP_FS minus the defocus pass (bloom arrives already
// summed into tDiffuse by UnrealBloomPass, so uBloomAmt folds into its
// strength). Exposure -> ACES -> chroma at the edges -> vignette -> grain ->
// gamma, in the shipped order.
const FL_COMP = {
  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1 },
    uGrain: { value: 0 },
    uVig: { value: 0 },
    uT: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uExposure, uGrain, uVig, uT;
    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = (vUv - 0.5);
      float ca = 0.0016 * dot(d, d) * 4.0;
      c.r = texture2D(tDiffuse, vUv + d * ca).r;
      c.b = texture2D(tDiffuse, vUv - d * ca).b;
      c *= uExposure;
      c = aces(c);
      c *= 1.0 - uVig * dot(d, d) * 1.6;
      c += (hash(vUv * vec2(1024.0, 768.0) + fract(uT * 0.001)) - 0.5) * uGrain;
      gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
    }
  `,
};

class FlowerScene {
  constructor(container, pal) {
    this.pal = pal;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.NoToneMapping;      // the grade pass owns it
    this.renderer.outputEncoding = THREE.LinearEncoding;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(41.25, innerWidth / innerHeight, 0.05, 400);
    this.camera.position.set(6, 4, 12);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;

    const eyeU = { value: new THREE.Vector3() };
    this._eyeU = eyeU;
    // fogNear tracks the subject: the shipped app measures fog from the near
    // face of what the camera is looking at (70_app.js:1409), so the plant
    // itself is never inside its own fog. The boot updates it per frame.
    const fogU = {
      uFog: { value: new THREE.Color(...pal.fog) },
      uFogD: { value: pal.fogD },
      uFogNear: { value: 0 },
    };
    this.fogU = fogU;

    // --- tri stream ---
    this.triCap = 1 << 20;                    // floats
    this.triArr = new Float32Array(this.triCap);
    this.triGeo = new THREE.BufferGeometry();
    this._bindTri();
    this.triMat = new THREE.ShaderMaterial({
      vertexShader: FL_TRI_VS, fragmentShader: FL_TRI_FS,
      side: THREE.DoubleSide,
      uniforms: {
        uEye: eyeU,
        uKey: { value: new THREE.Vector3(...pal.key).normalize() },
        uKeyCol: { value: new THREE.Color(...pal.keyCol) },
        uAmbTop: { value: new THREE.Color(...pal.ambTop) },
        uAmbBot: { value: new THREE.Color(...pal.ambBot) },
        ...fogU,
      },
    });
    this.triMesh = new THREE.Mesh(this.triGeo, this.triMat);
    this.triMesh.frustumCulled = false;
    this.scene.add(this.triMesh);

    // --- petal stream ---
    this.petCap = 1 << 18;
    this.petArr = new Float32Array(this.petCap);
    this.petGeo = new THREE.BufferGeometry();
    this._bindPet();
    this.petMat = new THREE.ShaderMaterial({
      vertexShader: FL_PET_VS, fragmentShader: FL_PET_FS,
      side: THREE.DoubleSide,
      uniforms: this.triMat.uniforms,
    });
    this.petMesh = new THREE.Mesh(this.petGeo, this.petMat);
    this.petMesh.frustumCulled = false;
    this.scene.add(this.petMesh);

    // --- ribbon stream (instanced quads) ---
    this.segCap = 1 << 17;
    this.segArr = new Float32Array(this.segCap);
    this.ribGeo = new THREE.InstancedBufferGeometry();
    const quad = new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 0, 0, 1, 1, 0, -1, 1, 0]);
    this.ribGeo.setAttribute('position', new THREE.BufferAttribute(quad, 3));
    this._bindSeg();
    // Veins are LIGHT, not paint: the shipped line pass blends (SRC_ALPHA, ONE)
    // with the depth mask off — additive over the tissue, depth-tested against
    // it. An opaque ribbon draws the reticulum as dirt (measured: second boot).
    this.ribMat = new THREE.ShaderMaterial({
      vertexShader: FL_RIB_VS, fragmentShader: FL_RIB_FS,
      side: THREE.DoubleSide,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uEye: eyeU, ...fogU },
    });
    this.ribMesh = new THREE.Mesh(this.ribGeo, this.ribMat);
    this.ribMesh.frustumCulled = false;
    this.scene.add(this.ribMesh);

    // --- point stream ---
    this.ptCap = 1 << 18;
    this.ptArr = new Float32Array(this.ptCap);
    this.ptGeo = new THREE.BufferGeometry();
    this._bindPt();
    this.ptMat = new THREE.ShaderMaterial({
      vertexShader: FL_PT_VS, fragmentShader: FL_PT_FS,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uPx: { value: innerHeight * devicePixelRatio * 0.9 } },
    });
    this.ptMesh = new THREE.Points(this.ptGeo, this.ptMat);
    this.ptMesh.frustumCulled = false;
    this.scene.add(this.ptMesh);

    // --- background, pinned to the far plane ---
    this.bgU = {
      uTop: { value: new THREE.Color(...pal.bgTop) },
      uBot: { value: new THREE.Color(...pal.bgBot) },
      uGlow: { value: new THREE.Color(...pal.bgGlow) },
      uT: { value: 0 },
    };
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: FL_BG_VS, fragmentShader: FL_BG_FS,
        uniforms: this.bgU, depthWrite: false, depthTest: false,
      }));
    bg.frustumCulled = false;
    bg.renderOrder = -1;
    this.scene.add(bg);

    // --- post: bloom then the shipped grade ---
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
    this.bloom = new THREE.UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      pal.bloom, 0.4, pal.bloomThresh);
    this.composer.addPass(this.bloom);
    this.comp = new THREE.ShaderPass(FL_COMP);
    this.comp.uniforms.uExposure.value = pal.exposure;
    this.comp.uniforms.uGrain.value = pal.grain;
    this.comp.uniforms.uVig.value = pal.vignette;
    this.composer.addPass(this.comp);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      this.composer.setSize(innerWidth, innerHeight);
      this.ptMat.uniforms.uPx.value = innerHeight * devicePixelRatio * 0.9;
    });
  }

  _bindTri() {
    const ib = new THREE.InterleavedBuffer(this.triArr, 10);
    ib.setUsage(THREE.DynamicDrawUsage);
    this._triIB = ib;
    this.triGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    this.triGeo.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    this.triGeo.setAttribute('col', new THREE.InterleavedBufferAttribute(ib, 3, 6));
    this.triGeo.setAttribute('emis', new THREE.InterleavedBufferAttribute(ib, 1, 9));
  }
  _bindPet() {
    const ib = new THREE.InterleavedBuffer(this.petArr, 14);
    ib.setUsage(THREE.DynamicDrawUsage);
    this._petIB = ib;
    this.petGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    this.petGeo.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    this.petGeo.setAttribute('col', new THREE.InterleavedBufferAttribute(ib, 3, 6));
    this.petGeo.setAttribute('emis', new THREE.InterleavedBufferAttribute(ib, 1, 9));
    this.petGeo.setAttribute('aDD', new THREE.InterleavedBufferAttribute(ib, 1, 10));
    this.petGeo.setAttribute('aQ', new THREE.InterleavedBufferAttribute(ib, 1, 11));
    this.petGeo.setAttribute('aU', new THREE.InterleavedBufferAttribute(ib, 1, 12));
    this.petGeo.setAttribute('aV', new THREE.InterleavedBufferAttribute(ib, 1, 13));
  }
  _bindSeg() {
    const ib = new THREE.InstancedInterleavedBuffer(this.segArr, 12);
    ib.setUsage(THREE.DynamicDrawUsage);
    this._segIB = ib;
    this.ribGeo.setAttribute('iA', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    this.ribGeo.setAttribute('iB', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    this.ribGeo.setAttribute('iW', new THREE.InterleavedBufferAttribute(ib, 2, 6));
    this.ribGeo.setAttribute('iC', new THREE.InterleavedBufferAttribute(ib, 3, 8));
    this.ribGeo.setAttribute('iE', new THREE.InterleavedBufferAttribute(ib, 1, 11));
  }
  _bindPt() {
    const ib = new THREE.InterleavedBuffer(this.ptArr, 7);
    ib.setUsage(THREE.DynamicDrawUsage);
    this._ptIB = ib;
    this.ptGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    this.ptGeo.setAttribute('col', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    this.ptGeo.setAttribute('psize', new THREE.InterleavedBufferAttribute(ib, 1, 6));
  }

  // Push one captured frame into the GPU-side buffers.
  upload(B) {
    if (B.triN > this.triCap) {
      while (this.triCap < B.triN) this.triCap *= 2;
      this.triArr = new Float32Array(this.triCap);
      this._bindTri();
    }
    this.triArr.set(B.tri.subarray(0, B.triN));
    this._triIB.needsUpdate = true;
    this.triGeo.setDrawRange(0, B.triN / 10);

    if (B.petbN > this.petCap) {
      while (this.petCap < B.petbN) this.petCap *= 2;
      this.petArr = new Float32Array(this.petCap);
      this._bindPet();
    }
    this.petArr.set(B.petb.subarray(0, B.petbN));
    this._petIB.needsUpdate = true;
    this.petGeo.setDrawRange(0, B.petbN / 14);

    if (B.segN > this.segCap) {
      while (this.segCap < B.segN) this.segCap *= 2;
      this.segArr = new Float32Array(this.segCap);
      this._bindSeg();
    }
    this.segArr.set(B.seg.subarray(0, B.segN));
    this._segIB.needsUpdate = true;
    this.ribGeo.instanceCount = B.segN / 12;

    if (B.ptN > this.ptCap) {
      while (this.ptCap < B.ptN) this.ptCap *= 2;
      this.ptArr = new Float32Array(this.ptCap);
      this._bindPt();
    }
    this.ptArr.set(B.pt.subarray(0, B.ptN));
    this._ptIB.needsUpdate = true;
    this.ptGeo.setDrawRange(0, B.ptN / 7);
  }

  render(t) {
    this.controls.update();
    this._eyeU.value.copy(this.camera.position);
    this.bgU.uT.value = t;
    this.comp.uniforms.uT.value = t;
    this.composer.render();
  }
}
