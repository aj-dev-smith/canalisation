// THE GROUND. One large disc under the specimen — environment, the same
// allowed category as the wind and the void: nothing about the PLANT is drawn
// here, the plant merely stands on something instead of on an implied floor
// at y=0 against nothing.
//
// The shading is FL_TRI_FS's, subsetted: hemisphere ambient, key diffuse at
// 0.9, the same flFog mixed at 0.80 through the SAME fog uniforms the tissue
// reads (one fog, not two that resemble each other), and alpha carrying
// linear depth — the defocus pass reads alpha as distance, the void writes
// 3.0 and melts, and a ground that wrote anything else would sit unnaturally
// sharp through a racked lens. The full-strength rim term is dropped: with a
// constant up normal, a grazing camera puts pow(1-N.V, 3) near 1 across the
// whole distant disc and 0.7 floods the floor; a whisper (0.12) keeps the
// grazing sheen the tissue has without lifting the value.
//
// Colour is derived from the palette only — mixes of bgBot / ambBot / stem0,
// a dark soil that sits UNDER the plants in value (albedo 0.03-0.10 against
// blades at 0.26-0.58, and lit luminance far below pal.bloomThresh so the
// bloom pass never sees it). Three whispers on top, all environment texture:
//   - a very low-frequency value mottle (two octaves of hash value noise on
//     world xz) so the disc reads as ground, not vinyl;
//   - a radial fade toward the void's own colour so the disc melts into the
//     dark with no visible rim — the defocus finishes the job, since the rim
//     sits at depth ~1.4 in alpha against a subject at ~0.1;
//   - a faint pool of the void's uGlow centred under the plant, so the
//     specimen sits IN the world instead of on a plate.
//
// NOTE the shader strings are built at CONSTRUCTION time, not at load time:
// this file sorts before 30_scene.js in the bundle, so FL_FOG (a const in
// 30_scene.js) is in its temporal dead zone while this file's top level runs.
// A top-level `${FL_FOG}` parses clean, passes the build, and throws on
// load — the exact shape of bug PITFALLS records for the one shared scope.

const FL_GND_VS = () => `
  varying vec3 vP;
  void main() {
    vP = position;   // geometry is baked in world space, like every stream here
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FL_GND_FS = () => `
  varying vec3 vP;
  uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
  uniform vec3 uSoil0, uSoil1, uGlowC, uVoid;
  uniform float uR;
  ${FL_FOG}
  float flGndHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float flGndNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(flGndHash(i),                   flGndHash(i + vec2(1.0, 0.0)), f.x),
               mix(flGndHash(i + vec2(0.0, 1.0)), flGndHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec3 N = vec3(0.0, 1.0, 0.0);
    vec3 V = normalize(uEye - vP);
    // mottle: wavelengths ~18 and ~5 units — value only, and quiet
    float m = flGndNoise(vP.xz * 0.055) * 0.65 + flGndNoise(vP.xz * 0.21) * 0.35;
    vec3 alb = mix(uSoil0, uSoil1, m);
    float d = max(dot(N, uKey), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
    vec3 c = alb * (amb + uKeyCol * d * 0.9) + rim * uAmbTop * 0.12;
    float r = length(vP.xz);
    c += uGlowC * exp(-r * 0.20);
    c = mix(c, uFog, flFog(vP, uEye) * 0.80);
    c = mix(c, uVoid, smoothstep(0.35, 0.95, r / uR));
    // alpha carries linear depth for the defocus pass (shipped MESH_FS)
    gl_FragColor = vec4(c, length(vP - uEye) * 0.01);
  }
`;

class FlGround {
  // shared = { eyeU, fogU }: the scene's eye uniform and its fog uniform
  // OBJECTS, so the ground can never drift onto a second fog.
  constructor(scene, pal, shared) {
    const R = 140;
    const mixc = (a, b, t) => a.map((v, k) => lerp(v, b[k], t));
    // soil, from the palette only: the dark base is the void's bottom pulled
    // toward the stem's shadow tone; the mottle's light end is the lower
    // hemisphere ambient pulled further toward the same stem tone — so the
    // floor is in the species' hue family, valued between the void it meets
    // at the rim and the stems that rise off it. Both mixes were first tried
    // a step brighter (0.20 / 0.50) and a Parasol down-shot doubled the
    // field's value against the old void; a floor should be felt, not seen.
    const soil0 = mixc(pal.bgBot, pal.stem0, 0.16);
    const soil1 = mixc(pal.ambBot, pal.stem0, 0.40);
    // where the disc melts out: the void's own gradient, sampled toward its
    // top — the rim abuts the bg ABOVE the horizon, and a darker pick cut a
    // visible dark trough between fogged soil and sky (measured, first shot)
    const voidC = mixc(pal.bgBot, pal.bgTop, 0.65);
    const geo = new THREE.CircleGeometry(R, 96);
    geo.rotateX(-Math.PI / 2);            // face +y; bake world placement
    geo.translate(0, -0.01, 0);           // just under blades resting at 0
    this.mat = new THREE.ShaderMaterial({
      vertexShader: FL_GND_VS(), fragmentShader: FL_GND_FS(),
      side: THREE.DoubleSide,             // an orbit can dip below the plane
      uniforms: {
        uEye: shared.eyeU,
        uKey: { value: new THREE.Vector3(...pal.key).normalize() },
        uKeyCol: { value: new THREE.Color(...pal.keyCol) },
        uAmbTop: { value: new THREE.Color(...pal.ambTop) },
        uAmbBot: { value: new THREE.Color(...pal.ambBot) },
        uSoil0: { value: new THREE.Color(...soil0) },
        uSoil1: { value: new THREE.Color(...soil1) },
        uGlowC: { value: new THREE.Color(...pal.bgGlow).multiplyScalar(0.6) },
        uVoid: { value: new THREE.Color(...voidC) },
        uR: { value: R },
        ...shared.fogU,
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
}
