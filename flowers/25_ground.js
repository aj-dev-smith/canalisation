// THE GROUND, AND THE FIELD'S SKY. Environment, the same allowed category as
// the wind and the void: nothing about the PLANT is drawn here, the plant
// merely stands on something instead of on an implied floor at y=0 against
// nothing. Where a plant stands, and what colour the air over it is, were
// never simulation results.
//
// Two things live here now, and they are the same subject — the atmosphere a
// field of specimens is seen through:
//
//   FlGround   one large disc, melting into the sky it is drawn against
//   flFieldPal a garden's OWN atmosphere, blended across the species present
//
// ---------------------------------------------------------------- the ground
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
//   - the melt below, which is what the disc ENDS in;
//   - a faint pool of the void's uGlow centred under the plant, so the
//     specimen sits IN the world instead of on a plate.
//
// ⚠ THE MELT USED TO BE A RADIUS AND A GUESSED COLOUR, AND IT READ AS A
// TABLETOP. The disc faded toward one sampled void colour (bgBot->bgTop at
// 0.65) over r/R in [0.35, 0.95] — but the rim was never what a viewer saw.
// What they saw was the HORIZON: a fully fogged ground is uFog, the sky just
// above it is the background gradient near uBot, and on the shipped palettes
// those differ by a factor of 3-5 in luminance (Sun Coral: fog L 0.041
// against bgBot L 0.005). No radial fade can close that, because the seam is
// not at the rim — it is wherever the plane runs out of screen, which for an
// eye near ground level is a straight line across the middle of the frame.
//
// So the ground now melts into THE ACTUAL SKY IN THAT DIRECTION: flSky (the
// background's own function, shared, not a second gradient that resembles it)
// evaluated at the fragment's screen position, which the vertex stage hands
// over as a clip-space varying — perspective-correct, no resolution uniform,
// exact at any camera. Where the melt is complete the ground is bit-for-bit
// the void behind it, so the join cannot be seen; it is inferred from where
// the stems stop. Alpha melts to the void's 3.0 with it, so the defocus does
// not find an edge the colour no longer has.
//
// The melt is driven by the SHARED fog, not by radius: fog is 1 at the
// horizon by construction (the distance there is unbounded) and it carries
// uFogNear, so the melt begins beyond the subject the camera is framing and
// scales with the shot. The radial term survives, tightened to finish at
// 0.90 R, purely to guarantee the geometric rim is never the thing that ends
// the ground — from above, the horizon argument does not apply.
//
// ------------------------------------------------------------ the field sky
//
// flFieldPal: the scene's fog, background, glow, hemisphere and key came from
// the HERO's palette, so a garden of seven stood in one species' weather —
// every plant in Sun Coral's brown-orange sky. A field has its own air.
//
// The obvious blend is an average and it is measurably mud: over the eight
// flowering species the mean fog's SATURATION is 0.222 against a member mean
// of 0.613, and the mean bgGlow's is 0.251 against 0.774 — averaging in RGB
// cancels hue against hue and lands on grey. So the blend preserves chroma:
// take the weighted mean, keep its luminance and its hue direction exactly,
// and rescale its distance from the achromatic axis back to the weighted mean
// of the members' own chroma (clamped so no channel is driven negative —
// restoring chroma must not invent light). The result is a colour of the
// field's average hue at the field's average intensity, not a wash.
//
// The hero still LEADS: FL_SKY_LEAD is its extra weight over an equal share.
// Measured by looking at the same field of seven under 0.0 / 0.35 / 1.0 —
// see the branch notes. 0 is the pure field mean, 1 is today's hero-only sky.
// ?sky= overrides it, which is how the A/B was shot.
//
// It is a no-op for a solo page BY CONSTRUCTION: with no plan, or a plan of
// one, the palette object is returned unchanged.
//
// NOTE the shader strings are built at CONSTRUCTION time, not at load time:
// this file sorts before 30_scene.js in the bundle, so FL_FOG and FL_SKY
// (consts in 30_scene.js) are in their temporal dead zone while this file's
// top level runs. A top-level `${FL_FOG}` parses clean, passes the build, and
// throws on load — the exact shape of bug PITFALLS records for the one shared
// scope.

// the hero's extra weight in the field's sky, over an equal share
const FL_SKY_LEAD = 0.35;
// THE GROUND-HUGGING HAZE: [G, H, P, N] — the palette fog density is
// thickened G-fold at y = 0, thins with scale height H world units, the melt
// curve is shaped by P near the camera, and the first N units of ground are
// floor rather than air. Set by LOOKING at two shots that pull opposite ways
// — a garden from eye level (which needs the near ground to fade, or the
// horizon is a line) and a solo flower close-up (which needs a floor under
// its subject) — in the same category as the wind's uRef. The ladder that got
// here is in the branch notes: G alone trades one against the other (1.5
// hides the horizon and empties the close-up, 0.6 the reverse), P and N are
// what let both be right. ?haze=G,H,P,N sweeps all four.
const FL_HAZE = [2.0, 3.0, 1.5, 5.0];
// THE POOL: [K, R0] — the ground-hugging glow's strength, and its length scale
// in world units ON A PAGE WITH NO FIELD, where 5.0 is the shipped
// `exp(-r * 0.20)` re-spelled and nothing about the solo page moves. A field's
// scale is not in here: it is the clearing's own, see "the pool is the
// clearing's" below. ?pool=K,R0 sweeps both.
const FL_POOL = [1.0, 5.0];

const FL_GND_VS = () => `
  varying vec3 vP;
  varying vec4 vProj;
  void main() {
    vP = position;   // geometry is baked in world space, like every stream here
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vProj = gl_Position;   // screen position, for the sky this disc melts into
  }
`;
const FL_GND_FS = () => `
  varying vec3 vP;
  varying vec4 vProj;
  uniform vec3 uEye, uKey, uKeyCol, uAmbTop, uAmbBot;
  uniform vec3 uSoil0, uSoil1, uGlowC;
  uniform float uR, uHazeG, uHazeH, uHazeP, uHazeN, uPoolK, uPoolR;
  ${FL_FOG}
  ${FL_SKY}
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
    float fw = flFog(vP, uEye);
    c = mix(c, uFog, fw * 0.80);
    // THE MELT: how much of this pixel is air rather than floor. The optical
    // depth of an exponential-height haze along the eye ray — density
    // uFogD*uHazeG at y=0, scale height uHazeH — integrated in closed form
    // for a ray ending ON the ground (y=0, so the far end contributes 1):
    //   tau = rho0 * L * H * (1 - exp(-yEye/H)) / yEye
    // which is uniform density when the eye is IN the layer and thins as
    // 1/yEye when it is above it. That is the whole trick: an eye at ground
    // level sees its own near ground go, an eye above the layer does not.
    // ground nearer than uHazeN is floor rather than air — a close-up must
    // keep the floor its subject stands on, and no haze law starting at the
    // lens can give it one (measured: the solo flower shot lost its ground
    // almost entirely at uHazeN = 0)
    float L = max(0.0, length(vP - uEye) - uHazeN);
    float ye = max(uEye.y, 0.0);
    float hf = ye < 1e-3 ? 1.0 : uHazeH * (1.0 - exp(-ye / uHazeH)) / ye;
    // uHazeP shapes the near half of that curve without moving its far end:
    // 1 is the plain exponential, and above it the floor near the camera
    // survives while the horizon still arrives at exactly 1.
    float melt = pow(1.0 - exp(-uFogD * uHazeG * L * hf), uHazeP);
    // and the geometric rim, which the haze argument does not cover from
    // straight above: the disc must never be what ends the ground
    float geo = smoothstep(0.62, 0.90, r / uR);
    melt = max(melt, geo);
    // THE POOL, AND IT IS AIRLIGHT RATHER THAN ALBEDO. It used to be added to
    // the floor's own colour, ABOVE the fog and above the melt, which made it
    // a thing the disc's own albedo carried and the haze could then hide. But
    // this is a glow in the ground-hugging layer, and the melt IS that layer:
    // mix(surface, sky, melt) is already the airlight form — transmitted
    // surface plus in-scattered air, with the sky standing in for what the air
    // is lit by. The pool is the rest of what it is lit by, so it belongs in
    // the AIR's colour and not in the floor's, and it arrives with the same
    // (1 - transmittance) weight everything else in that layer does.
    //
    // ⚠ THAT WEIGHT IS THE WHOLE REASON IT IS WRITTEN THIS WAY, and adding it
    // flat on top was tried first and measured. A flat pool is a statement
    // about the FLOOR, so it is strongest where the floor fills the frame:
    // it lit the establishing shot correctly and then turned an overhead into
    // a sheet of magenta with the plants as silhouettes (mean pixel 59.8 ->
    // 78.6 at eye height 26, the ground filling nine tenths of the frame).
    // Riding the melt makes it a statement about the AIR: 18% of it survives
    // that overhead and 75-93% survives the establishing shot, which is the
    // right way round, and it costs nothing to say — it is the airlight
    // integral written out rather than a second exponent chosen by eye.
    //
    // It keeps the GEOMETRIC rim, and must: a layer of lit air over the disc
    // has to end where the disc does, or the pool paints a band past the
    // horizon on the one view where the rim is what ends the ground.
    //
    // AND IT BREATHES, because the sky's glow already does and this is the
    // same glow. flSky multiplies uGlow by (0.85 + 0.15 sin(uT x 0.0007)) — a
    // 9.0 s period at +-15%, shipped, from the void's own gradient — so a pool
    // held static would be a SECOND glow that merely resembles the first, and
    // would drift visibly out of phase with the sky it sits under. Same term,
    // same uT (the background's uniforms are already shared into this
    // material), no new number. Nobody has watched it move.
    vec2 suv = vProj.xy / vProj.w * 0.5 + 0.5;
    float breath = 0.85 + 0.15 * sin(uT * 0.0007);
    vec3 air = flSky(suv) + uGlowC * uPoolK * breath * exp(-r / uPoolR) * (1.0 - geo);
    c = mix(c, air, melt);
    // alpha carries linear depth for the defocus pass (shipped MESH_FS), and
    // melts to the void's own 3.0 so a melted pixel defocuses like the void
    gl_FragColor = vec4(c, mix(length(vP - uEye) * 0.01, 3.0, melt));
  }
`;

// A FIELD'S OWN ATMOSPHERE. (pal, plan) -> pal, where plan is flGardenPlan's
// array (entry 0 is the hero). Returns `pal` itself when there is no field.
function flFieldPal(pal, plan, lead) {
  if (!plan || plan.length < 2) return pal;
  let L = lead === undefined ? FL_SKY_LEAD : lead;
  if (typeof location !== 'undefined') {
    const s = new URLSearchParams(location.search).get('sky');
    if (s !== null && isFinite(+s)) L = Math.min(1, Math.max(0, +s));
  }
  const pals = plan.map(p => ({ ...BASE_PAL, ...((SPECIES[p.name] || {}).pal || {}) }));
  const n = pals.length;
  // weights: an equal share each, plus the hero's lead
  const w = pals.map((_, i) => (1 - L) / n + (i === 0 ? L : 0));
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const chroma = c => { const l = lum(c); return Math.hypot(c[0] - l, c[1] - l, c[2] - l); };
  const blend = (key) => {
    const cols = pals.map(p => p[key]);
    const m = [0, 1, 2].map(i => cols.reduce((a, c, j) => a + c[i] * w[j], 0));
    const l = lum(m);
    const want = cols.reduce((a, c, j) => a + chroma(c) * w[j], 0);
    const have = chroma(m);
    let k = have > 1e-9 ? want / have : 1;
    // no channel may go negative: the rescale moves hue nowhere and light nowhere
    for (let i = 0; i < 3; i++) if (m[i] < l) k = Math.min(k, l / (l - m[i]));
    return m.map(v => Math.max(0, l + (v - l) * k));
  };
  const mean = (key) => [0, 1, 2].map(i => pals.reduce((a, p, j) => a + p[key][i] * w[j], 0));
  const out = { ...pal };
  // the seven atmosphere colours, chroma preserved
  for (const k of ['fog', 'bgTop', 'bgBot', 'bgGlow', 'ambTop', 'ambBot', 'keyCol', 'stem0'])
    out[k] = blend(k);
  // a direction and a density are not colours: plain means
  out.key = mean('key');
  out.fogD = pals.reduce((a, p, j) => a + p.fogD * w[j], 0);
  // the GRADE is deliberately not blended — bloomThresh, exposure, grain,
  // vignette and dof are the lens, not the weather, and a field seen through
  // eight averaged lenses is the mud this function exists to avoid.
  return out;
}

class FlGround {
  // shared = { eyeU, fogU, bgU }: the scene's eye uniform, its fog uniform
  // OBJECTS and its background uniforms, so the ground can never drift onto a
  // second fog or melt into a sky that is not the one behind it. `plan` is
  // flGardenPlan's array or null — read for the clearing's rim only (the pool,
  // below), the same one number FlPollen takes off it.
  constructor(scene, pal, shared, plan) {
    const R = 140;
    // the ground's haze: [thickening over the palette's own fog density at
    // y=0, scale height in world units]. ?haze=G,H sweeps it — that is how
    // the two were chosen, by looking at three camera heights.
    let haze = FL_HAZE, poolQ = null;
    if (typeof location !== 'undefined') {
      const s = new URLSearchParams(location.search);
      const h = (s.get('haze') || '').split(',').map(Number);
      if (h.length === 4 && h.every(isFinite)) haze = h;
      // ?pool=K,R — K scales the pool, R REPLACES its length scale outright
      // (not an offset off the rim), so one query says the same thing on the
      // solo page and in a field and an A/B is one number.
      const p = (s.get('pool') || '').split(',').map(Number);
      if (p.length === 2 && p.every(isFinite)) poolQ = p;
    }
    // THE POOL IS THE CLEARING'S, NOT THE ORIGIN'S — and until now it was the
    // origin's. `exp(-r * 0.20)` is a 5-unit length scale written for a page
    // holding one plant at the origin; in a field of seven the plants stand at
    // r = 12-26 (flGardenPlan's ring), where that pool has decayed to
    // exp(-5.2) = 0.6% and the stand is lit by nothing at all. Measured on the
    // establishing shot (?garden=7 seed 21, step 3000, the ground rendered
    // alone against the same frame with the disc hidden): the floor moved the
    // bottom four bands of the picture by 0.31 / 1.83 / 5.64 / 10.06 of 255,
    // and the other eight by ZERO.
    //
    // So a field's pool is the FIELD's: rim + one plant's room, which is the
    // story radius FlPollen independently arrives at for the same clearing
    // (rEdge, 18_pollen.js) and which spends no new hand-picked number —
    // FL_GARDEN_SPACING is the 160-cell drawn-reach sweep in 35_garden.js. On
    // the shipped field that is 26.4 + 12 = 38.4, so the pool is 1/e exactly
    // at the edge of the story the grains are allowed to drift into. With no
    // plan it is FL_POOL[1] and the solo page does not move — the same
    // by-construction no-op as flFieldPal and flGardenPlan.
    //
    // ⚠ It is a length scale and not a radius: the pool does not stop at the
    // rim, it falls off e-fold per uPoolR, which is what keeps it from drawing
    // an edge where the plants stop. It is 0.50 of peak at the outermost
    // plant and 2.6% at the disc's own rim, and the rim term below takes that
    // last part to zero outright.
    //
    // NOTE FL_GARDEN_SPACING is read HERE, in the constructor, and not at this
    // file's top level: 35_garden.js sorts after this file in the bundle, so a
    // top-level read would be the same temporal-dead-zone bug the shader
    // strings at the head of this file are built lazily to avoid.
    let rim = 0;
    if (plan) for (const p of plan) rim = Math.max(rim, Math.hypot(p.origin[0], p.origin[2]));
    const poolK = poolQ ? poolQ[0] : FL_POOL[0];
    const poolR = poolQ ? poolQ[1] : (plan ? rim + FL_GARDEN_SPACING : FL_POOL[1]);
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
        uR: { value: R },
        uHazeG: { value: haze[0] }, uHazeH: { value: haze[1] },
        uHazeP: { value: haze[2] }, uHazeN: { value: haze[3] },
        uPoolK: { value: poolK }, uPoolR: { value: poolR },
        ...shared.fogU,
        ...shared.bgU,
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
}
