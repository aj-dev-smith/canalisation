// LIVING WATER — the pond stops being a mirror and starts being a surface.
//
// The disc in main.js is a fresnel plate with a perfectly flat normal, so its
// moon reflection is a laser line: a single hard streak that never moves and
// gives the eye no reason to believe there is water under it. What is missing
// is not colour, it is SLOPE. Every readable thing about water at night —
// where the glitter path is, how wide it is, that it is alive — comes from the
// statistics of the surface normal, and a flat normal has none.
//
// So this module keeps every colour decision the scene already made (deep,
// skyc, glow, the fresnel floor that stops the pond reading as a hole, the
// moon streak's exponent and the ONE moonDir the dome and the key light share)
// and changes exactly one thing: the normal. Two scrolling octaves of value
// noise, no textures, and the whole thing is anchored to physics rather than
// to taste:
//
//   DIRECTION comes from the wind. ctx.wind.field.uMean is the shipped field's
//   mean flow — the same field the grass and the plants and the mist all read.
//   The ripples travel downwind because that is where wind ripples go. One
//   air, one more reader; nothing here picks a direction.
//
//   SPEED comes from the dispersion relation. A pattern in a random wave field
//   advects at the GROUP velocity, and for deep-water gravity waves that is
//   half the phase speed: cg = 0.5*sqrt(g*lambda/(2*pi)). Surface tension is
//   negligible at these wavelengths (the capillary term is 0.4% of the gravity
//   term at 26 cm), so the plain deep-water form is the right one. That gives
//   0.54 and 0.32 m/s, which is the "slow and believable" band by arithmetic
//   rather than by dialling until it looked right.
//
//   AMPLITUDE is set by a target rms SLOPE, not a target height, because slope
//   is the quantity the picture actually shows. Cox & Munk 1954 — the sun
//   glitter measurement, which is literally this effect — gives rms slope
//   sqrt(0.003 + 5.12e-3*U) = 0.126 rad at this wind. ⚠ That is an OPEN-OCEAN,
//   fetch-unlimited number and this is a six-metre pond, where a ripple has a
//   couple of metres to grow in; we take ~28% of it. The cap is also doing
//   cinematic work and should be honest about it: the streak's lobe is
//   pow(dot,180), a half-width near 6 degrees, and a reflection turns TWICE
//   the normal, so an rms slope past ~0.06 rad smears the streak away entirely
//   instead of breaking it into glints. 0.035 rad puts the glint spread at
//   about 4 degrees against that 6 — broken, not erased.
//
// Nothing here adds light on balance: the pond region comes out at the same
// mean luminance the flat disc had (102.3 against 102.9 of 255, measured), and
// what changed is where that light sits. See the deleted second lobe below.
//
//   ANISOTROPY is the crests: wind ripples run ACROSS the wind, so the noise
//   is sampled with a lower frequency perpendicular to the flow than along it.
//
// And a LEVEL OF DETAIL law, for the same reason the native piece culls veins:
// a ripple narrower than a couple of pixels is not a ripple, it is aliasing,
// and at the grazing angles a ground camera sees a pond at, most of the far
// half of the disc is exactly that. Each octave fades out below ~2 px of
// projected wavelength, so distant water goes smooth — which is also what
// distant water does.
//
// The rim: water at the edge of a basin mirrors the BANK, not the sky, and the
// bank is dark. A little of the sky share traded for deep toward the rim, plus
// a shelter term (a fetch of nothing has no ripples), reads as depth and stops
// the disc from ending on a hard geometric edge.

export default async (ctx) => {
  const mat = ctx.pondMat();
  if (!mat) return;

  // --- the wind, as a direction ----------------------------------------------
  // uMean is world units per plant-time; only its heading matters here. The
  // field's x/z axes ARE the scene's — main.js feeds canWind() world positions
  // straight — so no frame conversion is needed, and none should be invented.
  const um = ctx.wind.field.uMean;
  const wmag = Math.hypot(um[0], um[2]);
  const wdir = wmag > 1e-6 ? [um[0] / wmag, um[2] / wmag] : [1, 0];

  // --- the two octaves --------------------------------------------------------
  // lambda in metres: a broad wind swell the pond is just wide enough to hold,
  // and the ripple riding on it. Slope is split between them so the total rms
  // is the number argued for above: sqrt(0.017^2 + 0.033^2) = 0.037 rad. The
  // split is weighted toward the SHORT octave on purpose — watched: with the
  // budget spread evenly the streak breaks into soft bands, which reads as
  // sheen rather than as water. Glints are a fine-ripple phenomenon, and the
  // long octave's job is only to make sure they do not arrive in a uniform
  // field.
  const G = 9.81;
  const OCT = [
    { lam: 0.80, slope: 0.017, aniso: 0.45 },
    { lam: 0.185, slope: 0.033, aniso: 0.62 },
  ];
  // group velocity, m/s — half the deep-water phase speed
  const drift = OCT.map((o) => 0.5 * Math.sqrt(G * o.lam / (2 * Math.PI)));
  // value noise on a unit lattice has its energy near a two-cell wavelength, so
  // a cell of lambda/2 puts the octave's features at lambda. k is cells/metre.
  const kk = OCT.map((o) => 2 / o.lam);
  // height amplitude from slope amplitude, treating the octave as its dominant
  // sinusoid: h = A sin(2 pi x / lam) has rms slope A*(2 pi/lam)/sqrt(2).
  const amp = OCT.map((o) => o.slope * o.lam * Math.SQRT2 / (2 * Math.PI));

  const T = ctx.THREE;
  const U = mat.uniforms;
  U.uTime = { value: 0 };
  U.uWindDir = { value: new T.Vector2(wdir[0], wdir[1]) };
  U.uAmp = { value: new T.Vector2(amp[0], amp[1]) };
  U.uK = { value: new T.Vector2(kk[0], kk[1]) };
  U.uLam = { value: new T.Vector2(OCT[0].lam, OCT[1].lam) };
  U.uDrift = { value: new T.Vector2(drift[0], drift[1]) };
  U.uPond = { value: new T.Vector3(ctx.POND.x, ctx.POND.z, ctx.POND.r) };
  // pixels across a one-metre span held one metre from the camera, face on.
  // Refreshed per frame because __frame() changes the fov per framing and the
  // drawing buffer changes on resize — an LOD law that reads a stale fov is a
  // law about a camera that is not there.
  U.uPxPerM = { value: 400 };

  // The whole fragment shader, rewritten. Everything above `// --- ours` is the
  // original construction, unchanged in intent; vn is still read as the base
  // normal so that if the vertex shader ever stops being flat this still adds a
  // perturbation to it rather than replacing it.
  mat.fragmentShader = `
    varying vec3 vw; varying vec3 vn;
    uniform vec3 deep, skyc, glow, moonDir, moonCol;
    uniform float uTime, uPxPerM;
    uniform vec2 uWindDir, uAmp, uK, uLam, uDrift;
    uniform vec3 uPond;                 // centre x, centre z, radius

    float wHash(vec2 p){
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    // value noise, smoothstep-interpolated, signed
    float wNoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = wHash(i),              b = wHash(i + vec2(1.0, 0.0));
      float c = wHash(i + vec2(0.0,1.0)), d = wHash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
    }
    // surface height in metres at a world xz, sampled in the WIND's frame:
    // along-flow first, across-flow second, and the along-flow coordinate slid
    // backwards by drift*t so the pattern travels DOWNWIND as t advances.
    float wHeight(vec2 p, vec2 gain){
      vec2 d = uWindDir, n = vec2(-uWindDir.y, uWindDir.x);
      float a = dot(p, d), b = dot(p, n);
      float h  = wNoise(vec2((a - uTime * uDrift.x) * uK.x, b * uK.x * 0.45)) * gain.x;
            h += wNoise(vec2((a - uTime * uDrift.y) * uK.y, b * uK.y * 0.62) + 31.7) * gain.y;
      return h;
    }

    void main(){
      vec3 V = normalize(cameraPosition - vw);

      // --- ours: the surface, before anything is coloured ---------------------
      vec2 pc = vw.xz - uPond.xy;
      float rr = clamp(length(pc) / uPond.z, 0.0, 1.0);   // 0 centre, 1 rim
      float bank = smoothstep(0.45, 1.0, rr);             // how much bank, not sky
      // no fetch at the edge of a basin, so no ripples there either
      float shelter = 1.0 - 0.60 * smoothstep(0.70, 1.0, rr);

      // LEVEL OF DETAIL. A metre of surface at distance D, foreshortened by the
      // grazing angle, covers uPxPerM/D * dot(V,N) pixels; an octave whose
      // wavelength lands under ~2 of them is drawn as noise rather than as
      // water, so fade it out. dot(V,vn) is the flat-normal stand-in — using
      // the perturbed normal here would make the LOD depend on the thing it is
      // deciding whether to compute.
      float dist = max(length(cameraPosition - vw), 0.05);
      float px = uPxPerM / dist * max(dot(V, vn), 0.02);
      vec2 lod = smoothstep(vec2(1.2), vec2(3.5), uLam * px);
      vec2 gain = uAmp * shelter * lod;

      // central differences for the slope; the step is well under the short
      // octave's wavelength and well over the float grid at these distances
      float e = 0.03;
      float hx = wHeight(vw.xz + vec2(e, 0.0), gain) - wHeight(vw.xz - vec2(e, 0.0), gain);
      float hz = wHeight(vw.xz + vec2(0.0, e), gain) - wHeight(vw.xz - vec2(0.0, e), gain);
      vec3 N = normalize(vn + vec3(-hx / (2.0 * e), 0.0, -hz / (2.0 * e)));

      // a floor under the fresnel: real water reflects ~2% at normal
      // incidence but a pond with nothing to refract renders as a hole —
      // the sky share needs to start above zero to read as a surface
      float fr = 0.18 + 0.82 * pow(1.0 - max(dot(V, N), 0.0), 2.5);
      // toward the rim the surface mirrors the BANK, which is dark: trade sky
      // for deep rather than dimming the lot, so the fresnel gradient survives
      vec3 c = mix(deep, skyc, fr * (1.0 - 0.40 * bank)) + glow * fr * 0.5 * (1.0 - 0.5 * bank);
      // the moon's streak — same direction the dome draws the disc in, and the
      // original's exponent and weight, untouched. On a sloped surface it is no
      // longer a line: it fires only where a facet happens to be aimed, which
      // is exactly what a glitter path is.
      //
      // ⚠ A wide second lobe (pow(md, 26.0) * 0.10) was built to put some body
      // under the glints and is DELETED, measured rather than argued: it was
      // 100% of this module's brightness lift — pond-region mean luminance
      // 102.3 without it against 109.4 with, on a control of 102.9 — and it
      // spent that light flattening the contrast between a glint and the water
      // around it. Without it the effect is pure REDISTRIBUTION: the pond ends
      // up the brightness it always was, and only the arrangement changed.
      vec3 R = reflect(-V, N);
      float md = max(dot(R, moonDir), 0.0);
      c += moonCol * pow(md, 180.0) * 1.6;
      c *= 1.0 - 0.26 * bank;
      // and the disc stops on a soft edge rather than a geometric one
      gl_FragColor = vec4(c, 0.92 * (1.0 - 0.35 * smoothstep(0.86, 1.0, rr)));
    }`;
  mat.needsUpdate = true;

  ctx.onFrame((tSec) => {
    U.uTime.value = tSec;
    // half the drawing buffer height over tan(half fov) IS pixels per metre at
    // one metre — the standard pinhole relation, read fresh so a framing change
    // is followed rather than assumed
    U.uPxPerM.value = (ctx.dbs.y * 0.5) / Math.tan(ctx.cam.fov * Math.PI / 360);
  });
};
