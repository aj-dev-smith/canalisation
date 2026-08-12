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
// Three.js adds on top — real orbit, per-frame camera-faced ribbons — changes
// where you can stand, not what the plant is wearing. The post chain below is
// the shipped one too, defocus included, so the lens is the same lens.
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
    // alpha carries linear depth for the defocus pass (shipped MESH_FS)
    gl_FragColor = vec4(c, length(vP - uEye) * 0.01);
  }
`;

// The petal stream: shipped lighting as the baseline, with four published
// mechanisms layered on top, each reading a channel the engine computes:
//
//   TRANSLUCENCY  van der Kooi 2016 [D]: petal transmittance usually EXCEEDS
//     reflectance. The shipped back-transmission term (0.55) is boosted where
//     tissue is far from a vein (vDD low) — a vascular bundle is the thick
//     part of a petal, so dd doubles as a thinness map [OURS coupling]. Light
//     through pigment filters twice (Beer-Lambert), hence the col^2 tint.
//   CONICAL CELLS  Ren 2017 + Gorton & Vogelmann 1996 + Noda 1994 [D]:
//     the epidermis' microfacet normals are a RING that tilts 18deg->52deg as
//     cells mature — a velvet sheen, not a gloss — and the cone's optical job
//     is to steer light INTO the pigment (x3.5-4.7 vs x2.1-2.7 flat), so
//     maturity deepens saturation at constant pigment. Both ride vDev.
//   BULLSEYE  Todesco 2022 [D]: a proximal pigment zone bounded by a
//     threshold on the normalised proximodistal coordinate — one number per
//     specimen, drawn from the published trimodal distribution. Deepening is
//     a pigment-exponent, not a paint: pow(albedo, k) is what more absorber
//     in the same tissue does.
const FL_PET_VS = `
  attribute vec3 col;
  attribute float emis;
  attribute float aDD; attribute float aQ; attribute float aU; attribute float aV;
  attribute float aDev; attribute float aLib;
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  varying float vDD; varying float vQ; varying float vU; varying float vV;
  varying float vDev; varying float vLib;
  void main() {
    vP = position; vN = normal; vC = col; vE = emis;
    vDD = aDD; vQ = aQ; vU = aU; vV = aV; vDev = aDev; vLib = aLib;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FL_PET_FS = `
  varying vec3 vP; varying vec3 vN; varying vec3 vC; varying float vE;
  varying float vDD; varying float vQ; varying float vU; varying float vV;
  varying float vDev; varying float vLib;
  uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
  uniform float uBull;
  uniform sampler2D uSpots;
  ${FL_FOG}
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(uEye - vP);
    if (dot(N, V) < 0.0) N = -N;
    float dNK = dot(N, uKey);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);

    // pigment, AT A WHISPER. The full-strength stack (bullseye 0.8 in a hard
    // +-0.07 ring, spots 0.9 across the face, dev 1.25) turned the bake's
    // smooth pale ramp into sharp maroon blotches — isolated by drawing raw
    // albedo, which was beautiful on its own. The zone is a wide soft
    // gradient now, and the spots live inside it only.
    float zone = 1.0 - smoothstep(uBull - 0.18, uBull + 0.18, vU);
    float spot = texture2D(uSpots, vec2(vU, (vV + vLib) / 3.0)).r;
    // NECTAR GUIDE: anthocyanin laid over the vasculature — in Antirrhinum,
    // Venosa is an MYB active only in epidermal cells OVERLYING veins [D], so
    // the pigment pattern IS the vein network. vDD is the distance-to-vein
    // field the engine already computes (translucency reads it too); read as
    // pigment it draws the guides a pollinator would follow, converging on
    // the throat, so it deepens inside the bullseye zone and fades distally.
    float guide = (1.0 - smoothstep(0.0, 0.28, vDD)) * (0.35 + 0.65 * zone);
    float kPig = (1.0 + 0.35 * zone) * mix(1.0, 1.12, vDev)
               * (1.0 + 0.35 * smoothstep(0.65, 1.0, spot) * zone)
               * (1.0 + 0.55 * guide);
    vec3 alb = pow(max(vC, vec3(0.0)), vec3(kPig));

    // THIN TISSUE IS LIT FROM BOTH SIDES. A one-sided lambert throws half of
    // every cupped petal into hard shadow — correct for cardboard, and it
    // read as meat (measured). van der Kooi's point is that transmission
    // DOMINATES: so the diffuse is wrapped (a 150 um petal never goes black)
    // and the transmission lobe is wide, tinted by the pigment twice.
    float fwd = clamp((dNK + 0.55) / 1.55, 0.0, 1.0);
    float bwd = max(-dNK, 0.0);
    float transW = 0.55 * (1.0 + 0.7 * (1.0 - vDD));
    vec3 transCol = alb * alb * 1.5;

    vec3 c = alb * (amb + uKeyCol * fwd * 0.9)
           + transCol * uKeyCol * bwd * transW
           + rim * uAmbTop * 0.7;

    // velvet: ring NDF whose tilt matures 22deg -> 52deg
    vec3 H = normalize(uKey + V);
    float ang = acos(clamp(dot(N, H), 0.0, 1.0));
    float thn = radians(mix(22.0, 52.0, vDev));
    float sheen = exp(-pow((ang - thn) / radians(14.0), 2.0));
    c += uKeyCol * sheen * 0.20 * (0.25 + 0.75 * fwd);

    c += alb * vE * 3.0;
    c = mix(c, uFog, flFog(vP, uEye) * 0.80);
    // alpha carries linear depth for the defocus pass (shipped MESH_FS)
    gl_FragColor = vec4(c, length(vP - uEye) * 0.01);
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
    gl_FragColor = vec4(c, 3.0);   // the void is far away, so it defocuses (shipped)
  }
`;

// The post chain: shipped 60_render.js whole, this time — an earlier revision
// leaned on UnrealBloomPass and dropped the defocus, which left the piece
// without the one lens effect a flower close-up is actually made of. Bloom is
// a bright pass plus three widening gaussian passes at half res; defocus is
// the whole scene blurred twice at half res and mixed in by a circle of
// confusion read from the alpha channel, which every surface above writes as
// linear depth. The comp is COMP_FS verbatim: defocus mix, bloom add, lateral
// chroma sampled per-plane, exposure -> ACES -> vignette -> grain -> gamma.
const FL_FS_VS = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FL_BRIGHT_FS = `
  varying vec2 vUv;
  uniform sampler2D uT; uniform float uThresh;
  void main() {
    vec3 c = texture2D(uT, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(c * smoothstep(uThresh, uThresh * 2.2, l), 1.0);
  }
`;
const FL_BLUR_FS = `
  varying vec2 vUv;
  uniform sampler2D uT; uniform vec2 uDir;
  void main() {
    vec3 s = texture2D(uT, vUv).rgb * 0.2270270270;
    s += texture2D(uT, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(uT, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
    s += texture2D(uT, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
    s += texture2D(uT, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
    gl_FragColor = vec4(s, 1.0);
  }
`;
const FL_COMP_FS = `
  varying vec2 vUv;
  uniform sampler2D uScene, uBloom, uDof;
  uniform float uBloomAmt, uExposure, uGrain, uT, uVig;
  uniform float uFocus, uRange, uDofAmt;
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec4 sc = texture2D(uScene, vUv);
    vec3 c = sc.rgb;
    // defocus: alpha carries linear depth, so the plane the camera is looking
    // at stays sharp and everything in front of and behind it softens
    float zdep = sc.a * 100.0;
    float coc = clamp(abs(zdep - uFocus) / max(0.001, uRange), 0.0, 1.0);
    coc = coc * coc * (3.0 - 2.0 * coc) * uDofAmt;
    c = mix(c, texture2D(uDof, vUv).rgb, coc);
    vec3 b = texture2D(uBloom, vUv).rgb;
    c += b * uBloomAmt;
    vec2 d = (vUv - 0.5);
    float ca = 0.0016 * dot(d, d) * 4.0;
    c.r = mix(texture2D(uScene, vUv + d * ca).r, texture2D(uDof, vUv + d * ca).r, coc) + texture2D(uBloom, vUv + d * ca).r * uBloomAmt;
    c.b = mix(texture2D(uScene, vUv - d * ca).b, texture2D(uDof, vUv - d * ca).b, coc) + texture2D(uBloom, vUv - d * ca).b * uBloomAmt;
    c *= uExposure;
    c = aces(c);
    c *= 1.0 - uVig * dot(d, d) * 1.6;
    c += (hash(vUv * vec2(1024.0, 768.0) + fract(uT * 0.001)) - 0.5) * uGrain;
    gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
  }
`;

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
      uniforms: { ...this.triMat.uniforms, uBull: { value: 0.59 }, uSpots: { value: null } },
    });
    // 3-row atlas for the per-library-petal spot fields, filled as they bake
    this._spotRes = FL_SPOT_RES;
    this._spotData = new Float32Array(this._spotRes * this._spotRes * 3);
    this._spotTex = new THREE.DataTexture(
      this._spotData, this._spotRes, this._spotRes * 3,
      THREE.RedFormat, THREE.FloatType);
    this._spotTex.minFilter = THREE.LinearFilter;
    this._spotTex.magFilter = THREE.LinearFilter;
    this.petMat.uniforms.uSpots.value = this._spotTex;
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
    // CustomBlending with (ZERO, ONE) on alpha is the Three spelling of the
    // shipped blendFuncSeparate(SRC_ALPHA, ONE, ZERO, ONE): colour adds, alpha
    // is left alone — it is carrying depth for the defocus (60_render.js:388).
    const addBlend = {
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    };
    this.ribMat = new THREE.ShaderMaterial({
      vertexShader: FL_RIB_VS, fragmentShader: FL_RIB_FS,
      side: THREE.DoubleSide,
      ...addBlend,
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
      ...addBlend,
      uniforms: { uPx: { value: innerHeight * devicePixelRatio * 0.9 } },
    });
    this.ptMesh = new THREE.Points(this.ptGeo, this.ptMat);
    this.ptMesh.frustumCulled = false;
    this.scene.add(this.ptMesh);

    // --- pollen stream (same 7-float layout and material as points; the
    // physics lives in 18_pollen.js and the boot owns the population) ---
    this.polCap = 1 << 15;
    this.polArr = new Float32Array(this.polCap);
    this.polGeo = new THREE.BufferGeometry();
    this._bindPol();
    this.polMesh = new THREE.Points(this.polGeo, this.ptMat);
    this.polMesh.frustumCulled = false;
    this.scene.add(this.polMesh);

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

    // --- post: the shipped chain, manually — scene to a half-float target
    // (alpha = depth), bright + 3x widening blur at half res for bloom, the
    // scene blurred twice at half res for defocus, one comp to the screen ---
    const rtO = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false,
    };
    const pr = this.renderer.getPixelRatio();
    const W = Math.max(2, Math.round(innerWidth * pr));
    const H = Math.max(2, Math.round(innerHeight * pr));
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...rtO, depthBuffer: true, samples: 4 });
    this.rtBright = new THREE.WebGLRenderTarget(W >> 1, H >> 1, rtO);
    this.rtBlurA = new THREE.WebGLRenderTarget(W >> 1, H >> 1, rtO);
    this.rtBlurB = new THREE.WebGLRenderTarget(W >> 1, H >> 1, rtO);
    this.rtDofA = new THREE.WebGLRenderTarget(W >> 1, H >> 1, rtO);
    this.rtDofB = new THREE.WebGLRenderTarget(W >> 1, H >> 1, rtO);
    this._fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._fsScene = new THREE.Scene();
    this._fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this._fsMesh.frustumCulled = false;
    this._fsScene.add(this._fsMesh);
    const fsMat = (frag, uniforms) => new THREE.ShaderMaterial({
      vertexShader: FL_FS_VS, fragmentShader: frag, uniforms,
      depthTest: false, depthWrite: false,
    });
    this.brightMat = fsMat(FL_BRIGHT_FS, {
      uT: { value: null }, uThresh: { value: pal.bloomThresh },
    });
    this.blurMat = fsMat(FL_BLUR_FS, {
      uT: { value: null }, uDir: { value: new THREE.Vector2() },
    });
    this.compU = {
      uScene: { value: null }, uBloom: { value: null }, uDof: { value: null },
      uBloomAmt: { value: pal.bloom }, uExposure: { value: pal.exposure },
      uGrain: { value: pal.grain }, uVig: { value: pal.vignette },
      uFocus: { value: 12 }, uRange: { value: 8 },
      uDofAmt: { value: pal.dof === undefined ? 0.8 : pal.dof },
      uT: { value: 0 },
    };
    this.compMat = fsMat(FL_COMP_FS, this.compU);

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
      const pr2 = this.renderer.getPixelRatio();
      const W2 = Math.max(2, Math.round(innerWidth * pr2));
      const H2 = Math.max(2, Math.round(innerHeight * pr2));
      this.rtScene.setSize(W2, H2);
      for (const rt of [this.rtBright, this.rtBlurA, this.rtBlurB, this.rtDofA, this.rtDofB])
        rt.setSize(W2 >> 1, H2 >> 1);
      this.ptMat.uniforms.uPx.value = innerHeight * devicePixelRatio * 0.9;
    });
  }

  _fsPass(mat, target) {
    this._fsMesh.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this._fsScene, this._fsCam);
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
    const ib = new THREE.InterleavedBuffer(this.petArr, 16);
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
    this.petGeo.setAttribute('aDev', new THREE.InterleavedBufferAttribute(ib, 1, 14));
    this.petGeo.setAttribute('aLib', new THREE.InterleavedBufferAttribute(ib, 1, 15));
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
  _bindPol() {
    const ib = new THREE.InterleavedBuffer(this.polArr, 7);
    ib.setUsage(THREE.DynamicDrawUsage);
    this._polIB = ib;
    this.polGeo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    this.polGeo.setAttribute('col', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    this.polGeo.setAttribute('psize', new THREE.InterleavedBufferAttribute(ib, 1, 6));
  }

  // Push the pollen population (7 floats a grain, pt layout) for this frame.
  uploadPollen(arr, nFloats) {
    if (nFloats > this.polCap) {
      while (this.polCap < nFloats) this.polCap *= 2;
      this.polArr = new Float32Array(this.polCap);
      this._bindPol();
    }
    this.polArr.set(arr.subarray(0, nFloats));
    this._polIB.needsUpdate = true;
    this.polGeo.setDrawRange(0, nFloats / 7);
  }

  // Install a baked spot field into the atlas row for one library petal.
  // flSpotsRun bakes out[a*res+b] with a = u-index; the texture samples
  // x = u, so the write is the transpose.
  setSpots(lib, out) {
    const res = this._spotRes;
    if (lib < 0 || lib > 2) return;
    for (let a = 0; a < res; a++)
      for (let b = 0; b < res; b++)
        this._spotData[(lib * res + b) * res + a] = out[a * res + b];
    this._spotTex.needsUpdate = true;
  }

  // Push one captured frame into the GPU-side buffers.
  upload(B) { this.uploadMany([B]); }

  // Concatenate N specimens' FlowerBuffers into the four stream arrays — the
  // garden path. One list of copies per stream, caps grown by doubling as
  // ever; with a single B this is `upload` exactly, byte for byte, which is
  // what keeps the solo page the same page.
  uploadMany(list) {
    let tn = 0, pn = 0, sn = 0, qn = 0;
    for (const B of list) { tn += B.triN; pn += B.petbN; sn += B.segN; qn += B.ptN; }

    if (tn > this.triCap) {
      while (this.triCap < tn) this.triCap *= 2;
      this.triArr = new Float32Array(this.triCap);
      this._bindTri();
    }
    let o = 0;
    for (const B of list) { this.triArr.set(B.tri.subarray(0, B.triN), o); o += B.triN; }
    this._triIB.needsUpdate = true;
    this.triGeo.setDrawRange(0, tn / 10);

    if (pn > this.petCap) {
      while (this.petCap < pn) this.petCap *= 2;
      this.petArr = new Float32Array(this.petCap);
      this._bindPet();
    }
    o = 0;
    for (const B of list) { this.petArr.set(B.petb.subarray(0, B.petbN), o); o += B.petbN; }
    this._petIB.needsUpdate = true;
    this.petGeo.setDrawRange(0, pn / 16);

    if (sn > this.segCap) {
      while (this.segCap < sn) this.segCap *= 2;
      this.segArr = new Float32Array(this.segCap);
      this._bindSeg();
    }
    o = 0;
    for (const B of list) { this.segArr.set(B.seg.subarray(0, B.segN), o); o += B.segN; }
    this._segIB.needsUpdate = true;
    this.ribGeo.instanceCount = sn / 12;

    if (qn > this.ptCap) {
      while (this.ptCap < qn) this.ptCap *= 2;
      this.ptArr = new Float32Array(this.ptCap);
      this._bindPt();
    }
    o = 0;
    for (const B of list) { this.ptArr.set(B.pt.subarray(0, B.ptN), o); o += B.ptN; }
    this._ptIB.needsUpdate = true;
    this.ptGeo.setDrawRange(0, qn / 7);
  }

  render(t) {
    this.controls.update();
    this._eyeU.value.copy(this.camera.position);
    this.bgU.uT.value = t;
    this.compU.uT.value = t;
    const r = this.renderer;

    r.setRenderTarget(this.rtScene);
    r.render(this.scene, this.camera);

    // bloom: bright pass, then three two-pass blurs at widening radii (shipped
    // 60_render.js:422 — radii 1, 2.6, 4.2, each X into A then Y into B)
    this.brightMat.uniforms.uT.value = this.rtScene.texture;
    this._fsPass(this.brightMat, this.rtBright);
    let src = this.rtBright;
    for (let i = 0; i < 3; i++) {
      const rad = 1 + i * 1.6;
      this.blurMat.uniforms.uT.value = src.texture;
      this.blurMat.uniforms.uDir.value.set(rad / this.rtBlurA.width, 0);
      this._fsPass(this.blurMat, this.rtBlurA);
      this.blurMat.uniforms.uT.value = this.rtBlurA.texture;
      this.blurMat.uniforms.uDir.value.set(0, rad / this.rtBlurB.height);
      this._fsPass(this.blurMat, this.rtBlurB);
      src = this.rtBlurB;
    }

    // defocus image: two gaussian passes over the whole scene (shipped :443)
    let dsrc = this.rtScene;
    for (let i = 0; i < 2; i++) {
      const rad = 1.4 + i * 2.2;
      this.blurMat.uniforms.uT.value = dsrc.texture;
      this.blurMat.uniforms.uDir.value.set(rad / this.rtDofA.width, 0);
      this._fsPass(this.blurMat, this.rtDofA);
      this.blurMat.uniforms.uT.value = this.rtDofA.texture;
      this.blurMat.uniforms.uDir.value.set(0, rad / this.rtDofB.height);
      this._fsPass(this.blurMat, this.rtDofB);
      dsrc = this.rtDofB;
    }

    this.compU.uScene.value = this.rtScene.texture;
    this.compU.uBloom.value = src.texture;
    this.compU.uDof.value = this.rtDofB.texture;
    this._fsPass(this.compMat, null);
  }
}
