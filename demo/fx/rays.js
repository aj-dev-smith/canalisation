// VOLUMETRIC MOONLIGHT, AND ONE SHOOTING STAR.
//
// Two things that are both about the SAME light. The scene already agrees with
// itself about where the moon is — main.js's MOON drives the dome's disc, the
// key light and the water's streak — and this module adds the two things a
// night sky does with a moon that a rasteriser does not: it scatters its light
// off the air between the moon and the lens, and every so often something else
// burns up in front of it.
//
// --- the rays ----------------------------------------------------------------
// Screen-space radial scattering, the Kenny Mitchell construction. It is an
// approximation of the in-scattering integral and it is honest about which
// approximation: the source term is the moon's own solid angle as the SKY
// SHADER ALREADY DRAWS IT (no second moon, no invented brightness), the
// occlusion is the depth buffer's, and the march is along the screen-space line
// from each pixel to the moon, which is the projection of the world-space line
// from that pixel's surface to the moon. What it cannot know is what happens
// behind the visible surface — that is the standard limitation and it is
// invisible at this scale, because everything occluding here is a plant.
//
// THREE THINGS ARE DERIVED RATHER THAN PICKED, which is the only reason this
// is allowed in a piece whose claim is that nothing is drawn:
//
//   THE SOURCE is the sky dome's own pixels. The mask keeps a pixel only if it
//   is SKY (the dome ships depthWrite:false, so sky pixels hold the cleared
//   depth of exactly 1.0 — the test is not a tolerance, it is an identity) AND
//   bright AND within a few degrees of the moon. Nothing here says how bright
//   the moon is; it reads what the dome drew.
//
//   THE OCCLUSION is the depth buffer, so a plant crossing the disc carves the
//   beam. This is the whole point and it is also the honest limitation: the
//   shafts are carved by geometry within ~3 degrees of the moon, because that
//   is how big the source is. In the 'pond' framing the camera stands at 0.8 m
//   and near plants do cross it; in 'wide' the camera is 3.6 m up, the moon is
//   at the top edge of frame, and what you get is the clean downward wash a
//   moon in clear air gives. Both are correct answers to the same shader.
//
//   THE AIR is the scene's own fog. A shaft is light scattered by the medium
//   BETWEEN the camera and the surface it lands on, so the amount a pixel
//   receives goes as the optical depth to that pixel: 1 - exp(-sigma*z), with
//   sigma read off scene.fog.density rather than chosen. Foreground grass a
//   metre away gets almost none; the sky gets all of it. That single term is
//   what stops the effect from lying flatly over the near field like a decal,
//   and it costs one depth fetch. (⚠ three's FogExp2 squares its exponent for
//   EXTINCTION; the in-scattered fraction is the plain Beer-Lambert form, and
//   the squared version puts a 3 m shaft at 1.7% — the look and the physics
//   agree here and the plain form is the right one for what is being asked.)
//
// The one number that is picked is STRENGTH, and it is picked small: this scene
// is dark, and a linear addition on a near-black base is enormous after gamma.
// See the calibration note where it is declared.
//
// ⚠ IT RUNS AS A PRE-PASS AND RETURNS ITS INPUT UNCHANGED, DELIBERATELY. The
// obvious cheaper wiring is to render the rays inside onFrame — but onFrame
// runs BEFORE the scene is drawn into rtScene, so an onFrame ray pass reads the
// PREVIOUS frame's colour and depth. A still is one draw call: window.__frame()
// sets the camera and draws once, so the rays would be built from wherever the
// camera was before the framing changed, which is a different picture entirely.
// A pre-pass runs after the scene render, sees this frame, and hands its input
// straight back — it modifies nothing in the chain, it only borrows the slot's
// position in time. Priority 9 puts it after dof (1) and mblur (2), so the mask
// still reads rtScene's own sharp colour and depth: scattering happens in the
// air, upstream of the lens, and the rays are added back downstream of it.
//
// --- the shooting star -------------------------------------------------------
// One meteor, in the sky dome's own fragment shader, recurring on a 37 s period
// with the phase offset chosen so that exactly one falls inside t = 17.6..18.6 s
// — the farewell look at the sky that the flight ends on — while t = 300, where
// every still tool pins the clock, lands at phase 23.4 s and sees nothing. The
// stills stay clean by arithmetic, not by hoping.
//
// Its path is a great-circle arc built from the moon's own frame (a horizontal
// perpendicular and the up-at-the-moon perpendicular), which is why the numbers
// baked below are not typed constants: they are computed here from ctx.moonDir
// and would follow it if the moon ever moved. The arc is placed 19-26 degrees
// from the moon — far enough out that the ray mask's angular window excludes it
// completely, so a meteor cannot become a second sun for one second every 37 —
// and it stays between 5 and 15 degrees of elevation, above the ridged hills
// and inside every framing that can see the moon at all.

export default async (ctx) => {
  const { THREE, cam, dbs, rtScene, scene, fsPass, FSV, moonDir, pal, C,
    sm, clamp01, addPrePass, onFrame, addHead, addSlot, addUniform } = ctx;

  // --- the picked numbers, all four of them -----------------------------------
  // How much of a pixel's distance to the moon the march covers. Under 1 so the
  // last taps stop short of the disc rather than piling up inside it.
  const DENSITY = 0.92;
  const TAPS = 44;
  // Per-tap falloff. 0.965^44 = 0.21, so the far end of a shaft still carries a
  // fifth of the near end's weight — a trail that reads as light in air rather
  // than as a halo with a hard edge.
  const DECAY = 0.965;
  // ⚠ THE CALIBRATION KNOB, AND THE ONLY ONE. In linear HDR the dark ground
  // sits near 0.005 and the sky near 0.015; after ACES and a 1/2.2 gamma an
  // addition of 0.004 takes the darkest ground from 14/255 to 21/255. That is
  // the whole budget this scene has, and it is why this number is small and was
  // measured rather than guessed: 0.11 was the first value and it was WRONG —
  // it lifted the whole upper sky by ~20 levels and read as haze rather than as
  // light. 0.042 holds the aureole to a few levels at the moon's surround and
  // to under one level in the darkest fifth of the frame, which is where an
  // effect that adds light to a night scene has to live.
  const STRENGTH = 0.042;

  // --- the source window ------------------------------------------------------
  // The moon's disc is 1.7 degrees of radius (the dome's own smoothstep) and its
  // tight halo is dead by 5. The window fades out between 7 and 12 degrees:
  // generous against the source, and tight enough that nothing else on the dome
  // — a vein glow drawn over the sky, a meteor — can act as a light source.
  const WIN = [Math.cos(12 * Math.PI / 180), Math.cos(7 * Math.PI / 180)];
  // Luminance gate. The dome draws the disc at ~0.82 and its 3-degree halo at
  // ~0.17, so this keeps the disc and the inner halo and rejects the sky wash.
  const THR = 0.18, KNEE = 0.30;

  // --- targets: quarter res, ping-ponged --------------------------------------
  // A god ray is a very low frequency thing; the only detail it carries is the
  // silhouette edge that cut it, and one blur pass costs less than four times
  // the fill would. HalfFloat because the mask is sampled off a linear HDR
  // scene, ClampToEdge because a march toward an off-screen moon walks out of
  // the texture and should keep finding the edge it left (light entering frame
  // from just outside it is a real thing, not an artefact to guard against).
  const mkRT = (w, h) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
  });
  let qw = Math.max(1, dbs.x >> 2), qh = Math.max(1, dbs.y >> 2);
  const rtP = mkRT(qw, qh);   // mask, then the horizontal blur
  const rtQ = mkRT(qw, qh);   // the march, then the vertical blur — the OUTPUT

  // --- pass 1: the mask -------------------------------------------------------
  // The camera ray is rebuilt here rather than the moon being projected into it,
  // because the angular window has to be an ANGLE: an ndc radius is stretched by
  // the aspect ratio and by the framing's fov, so a window written in ndc is a
  // different window in every shot. uRight/uUp arrive pre-scaled by the half-fov
  // tangents, so dot(D, moonDir) below is the same md the dome's own shader
  // computes — one moon, now four readers.
  //
  // ⚠ AND THE OCCLUSION IS THE ONE CLAIM THIS SCENE CANNOT EXERCISE, so it ships
  // with the switch that measures it. The moon sits at 17.2 degrees of elevation
  // and the tallest herb here is 1.4 m, so from any camera above about half a
  // metre NOTHING in the field reaches it: traced frame by frame, the bee faces
  // the moon at all only from t = 15.54 s (the drink and the climb-out), and the
  // sky is clear in front of her the whole way. `?rays=flat` drops the depth term
  // and nothing else, so the difference between the two runs IS the occlusion,
  // and anyone who later adds a canopy, a cloud or a taller specimen can measure
  // it rather than take this comment's word for it. Same category as
  // `app.veinLOD = false` in the native piece: the pre-cull renderer, exactly.
  //
  // MEASURED, and it is a negative result: occ against flat is a mean absolute
  // difference of 0.0005 levels at 'wide', 0.014 at 'pond' and 0.000-0.012 across
  // the farewell, against 1.29 for the whole effect. The depth term is live and
  // correct and this scene gives it nothing to do — so what ships here is the
  // AUREOLE, the forward-scattered halo of a hazy sky, and the shafts are a
  // capability rather than a thing you can currently see. Do not go looking for
  // them in a still and conclude the pass is broken.
  //
  // ⚠ AND KEEP THE INJECTED TEXT A BARE EXPRESSION. The first version of this
  // line carried a trailing `// ?rays=flat` comment inside the GLSL, which ate
  // the semicolon of the statement it was substituted into and silently failed
  // to compile — the switch reported a large, entirely spurious "occlusion"
  // because the flat run had no mask at all. A GLSL compile error is a console
  // error, not a pageerror, so a harness watching only pageerror sees nothing.
  const OCCL = ctx.Q.get('rays') === 'flat'
    ? '1.0'
    : 'step(0.9999, texture2D(tDep, vUv).x)';
  const maskMat = new THREE.ShaderMaterial({
    uniforms: {
      tCol: { value: null }, tDep: { value: rtScene.depthTexture },
      uRight: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() },
      uFwd: { value: new THREE.Vector3() }, uMoon: { value: moonDir },
    },
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tCol, tDep; uniform vec3 uRight, uUp, uFwd, uMoon;
      void main(){
        // the dome writes no depth, so sky is the cleared 1.0 exactly; anything
        // that wrote depth is an occluder and contributes nothing
        float sky = ${OCCL};
        vec3 D = normalize(uFwd + uRight * (vUv.x * 2.0 - 1.0) + uUp * (vUv.y * 2.0 - 1.0));
        float win = smoothstep(${WIN[0].toFixed(6)}, ${WIN[1].toFixed(6)}, dot(D, uMoon));
        // clamp at the door, exactly as main.js does before its own threshold:
        // additive vein light stacks to Inf in a half-float target and Inf
        // through a zero weight is NaN, which a blur then smears
        vec3 c = min(max(texture2D(tCol, vUv).rgb, 0.0), 64.0);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor = vec4(vec3(sky * win * smoothstep(${THR.toFixed(2)}, ${(THR + KNEE).toFixed(2)}, l)), 1.0);
      }`,
  });

  // --- pass 2: the march ------------------------------------------------------
  // Each pixel walks toward the moon's screen position, accumulating the mask
  // with a geometric falloff. The step is proportional to that pixel's distance
  // from the moon, so the shape is scale free — the same shaft at any framing.
  //
  // The start is dithered by an interleaved-gradient hash of the pixel, for the
  // reason dof.js dithers its tap disc: a fixed ladder of 44 samples reproduces
  // every silhouette edge 44 times as a staircase, and hashing the phase turns
  // that structure into noise the blur below immediately eats. It is a pure
  // function of gl_FragCoord — no time, no frame counter — so an offline film
  // reproduces it exactly.
  const marchMat = new THREE.ShaderMaterial({
    uniforms: { tMask: { value: rtP.texture }, uMoonUV: { value: new THREE.Vector2(0.5, 1) } },
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tMask; uniform vec2 uMoonUV;
      void main(){
        vec2 d = (vUv - uMoonUV) * ${(DENSITY / TAPS).toFixed(8)};
        float j = fract(52.9829189 * fract(0.06711056 * gl_FragCoord.x
                                         + 0.00583715 * gl_FragCoord.y));
        vec2 st = vUv - d * j;
        float acc = 0.0, w = 1.0, ws = 0.0;
        for (int i = 0; i < ${TAPS}; i++) {
          acc += texture2D(tMask, st).r * w;
          ws += w; st -= d; w *= ${DECAY.toFixed(4)};
        }
        gl_FragColor = vec4(vec3(acc / ws), 1.0);
      }`,
  });

  // --- pass 3: one separable blur --------------------------------------------
  // The march smooths along the ray and does nothing across it, so a silhouette
  // edge arrives as a hard quarter-res staircase perpendicular to the shaft.
  // Five taps at quarter res is a wide blur in screen terms and costs nothing.
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir;
      void main(){
        float c = texture2D(tex, vUv).r * 0.375;
        c += (texture2D(tex, vUv + dir).r + texture2D(tex, vUv - dir).r) * 0.25;
        c += (texture2D(tex, vUv + dir * 2.4).r + texture2D(tex, vUv - dir * 2.4).r) * 0.0625;
        gl_FragColor = vec4(vec3(c), 1.0);
      }`,
  });

  // --- the composite hookup ---------------------------------------------------
  // The tint is the dome's own moon colour, built by the same expression
  // main.js uses (the palette's bgGlow lerped toward a cold white), then
  // normalised to unit luminance so STRENGTH above is the only magnitude in
  // play and the hue is the species', not a choice made here.
  const mc = C(pal.bgGlow, 6).lerp(new THREE.Color(0.9, 0.95, 1.0), 0.55);
  const mlum = Math.max(1e-4, 0.2126 * mc.r + 0.7152 * mc.g + 0.0722 * mc.b);
  mc.multiplyScalar(1 / mlum);
  // and a whisper cooler than the disc itself: a shaft is light that has been
  // scattered on its way here, and what scatters preferentially is the short end
  mc.setRGB(mc.r * 0.92, mc.g * 0.99, mc.b * 1.08);

  const uK = addUniform('uRaysK', 0);
  addUniform('uRaysTex', rtQ.texture);
  addUniform('uRaysTint', mc);
  addUniform('uRaysDepth', rtScene.depthTexture);
  // sigma: the scene's own fog density, in inverse metres. Read, not chosen.
  const SIGMA = scene.fog?.density ?? 0.044;
  addUniform('uRaysSigma', SIGMA);

  addHead(`
    uniform sampler2D uRaysTex, uRaysDepth;
    uniform vec3 uRaysTint;
    uniform float uRaysK, uRaysSigma;`);
  // the 'light' slot: linear HDR, after bloom, before the tone map — which is
  // where scattered light belongs, so the grade and the vignette act on it
  // exactly as they act on everything else the scene emitted
  addSlot('light', `
    {
      float rz = texture2D(uRaysDepth, uv).x * 2.0 - 1.0;
      float rlin = 2.0 * ${cam.near.toFixed(3)} * ${cam.far.toFixed(1)} /
        (${(cam.far + cam.near).toFixed(3)} - rz * ${(cam.far - cam.near).toFixed(3)});
      // optical depth of the air in front of this pixel: no air, no shaft
      float rair = 1.0 - exp(-uRaysSigma * rlin);
      c += min(texture2D(uRaysTex, uv).rgb, 4.0) * uRaysTint * (uRaysK * rair);
    }`);

  // --- the shooting star ------------------------------------------------------
  // Built in the moon's own frame so nothing about it is a typed direction.
  const M = moonDir.clone();
  const P1 = new THREE.Vector3().crossVectors(M, new THREE.Vector3(0, 1, 0)).normalize();
  const P2 = new THREE.Vector3().crossVectors(P1, M).normalize();
  // WHERE IT CAN GO IS ALMOST FULLY DETERMINED, which is worth writing down
  // because it looks like four free numbers and is nearer to none. The moon
  // sits at 17.2 degrees of elevation and, in 'wide', at the very top edge of
  // frame (ndc.y = 0.99). So a meteor that is (a) far enough from the moon that
  // the ray mask cannot see it, (b) inside the frame, and (c) above the ridged
  // hills, cannot be above the moon (that is off the top) and cannot be below
  // it (17 degrees down from 17 degrees up is the ground). It has to be
  // displaced roughly HORIZONTALLY and fall at a shallow angle — an
  // Earth-grazer. These four numbers are the best point of a swept grid under
  // exactly those constraints: 23 degrees out from the moon, 15 degrees below
  // the horizontal in the moon's own frame, travelling back and down at 140.
  // The arc holds 19.3-27.5 degrees of separation and 14.3 -> 3.4 degrees of
  // elevation over its whole visible length, in frame in 'wide', 'pond' and
  // the farewell — and it burns out just as it reaches the ridge line.
  const TH0 = 23 * Math.PI / 180, ARC = 11 * Math.PI / 180;
  const A = M.clone().multiplyScalar(Math.cos(TH0))
    .addScaledVector(P1.clone().multiplyScalar(Math.cos(-15 * Math.PI / 180))
      .addScaledVector(P2, Math.sin(-15 * Math.PI / 180)), Math.sin(TH0))
    .normalize();
  // the travel direction, made tangent to the sphere at A
  const T = P1.clone().multiplyScalar(Math.cos(-140 * Math.PI / 180))
    .addScaledVector(P2, Math.sin(-140 * Math.PI / 180));
  const B = T.sub(A.clone().multiplyScalar(T.dot(A))).normalize();
  const v3 = (v) => `vec3(${v.x.toFixed(6)}, ${v.y.toFixed(6)}, ${v.z.toFixed(6)})`;

  // 37 s period; 19.4 s offset puts the head at the arc's start at t = 17.6, so
  // the one meteor of a 20 s film falls at 17.6..18.6 — and 300 mod 37, after
  // the offset, is 23.4, which is nowhere near a meteor. Stills stay clean.
  const PERIOD = 37.0, OFFSET = 19.4, DUR = 1.0;
  // the tail runs two thirds of an arc behind the head, and is allowed to sit at
  // negative path parameter — the streak enters already lit, which is what a
  // meteor does. Visible length is therefore 1.65 * 11 = 18 degrees of sky
  // traversed, with ~7 degrees of it alight at any instant.
  const TAIL = 0.65;
  // ⚠ ANGULAR half-width, in radians, NOT pixels — the px_ref lesson from
  // CLAUDE.md applied to a sky: a width in pixels is a different meteor at
  // every render size, and this one is 2 px per 800 lines at a 42 degree frame
  // whatever the render size. The first value was 0.0035 and it was watched:
  // twice this wide, the bloom pass turns the streak into a teardrop blob and
  // it reads as a comet, not a meteor.
  const SIG = 0.0018;
  // AND THE BRIGHTNESS IS A BLOOM DECISION, not a visibility one. Linear 1.0
  // survives ACES at 235/255 against a 30/255 sky, so the streak is already
  // near-white at PEAK = 1 — everything above that is spent on the bloom
  // threshold (0.55), which spreads a quarter-res halo ~40 full-res px wide
  // around anything well over it. The first version ran at 2.5 and the halo
  // was the whole picture of it.
  const PEAK = 1.0, HEAD = 1.6;

  const sky = ctx.skyMat();
  // ASSERT ON THE STRING EDIT. A silent no-op replacement here is a meteor that
  // never appears and a module that reports success — the repo has paid for that
  // three times. If the dome has been rewritten by something else, say so and
  // ship the rays alone rather than corrupting a shader nobody else can see.
  const ANCHOR = 'gl_FragColor = vec4(c, 1.0); }';
  let starOn = false;
  if (!sky) {
    console.warn('fx/rays: no sky material — shooting star skipped');
  } else if (!sky.fragmentShader.includes(ANCHOR) || !sky.fragmentShader.includes('varying vec3 vp;')) {
    console.warn('fx/rays: sky fragment shader is not the one this patch was written against '
      + '— shooting star skipped, rays unaffected');
  } else {
    sky.uniforms.uStarT = { value: 0 };
    sky.fragmentShader = sky.fragmentShader
      .replace('varying vec3 vp;', `varying vec3 vp;
        uniform float uStarT;
        // ONE METEOR. The arc is Path(s) = A cos(s*ARC) + B sin(s*ARC) with A,B
        // orthonormal, so a view direction's position ALONG the arc is atan of
        // its two components in that basis and its distance OFF the arc is what
        // is left over. Two dots and an atan; no distance-to-segment search.
        vec3 meteor(vec3 d){
          float ph = mod(uStarT + ${OFFSET.toFixed(1)}, ${PERIOD.toFixed(1)});
          float u = ph / ${DUR.toFixed(2)};
          // brightens fast, then burns out — and identically zero outside [0,1],
          // which is what keeps a still at t=300 free of it
          float env = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.55, 1.0, u));
          if (env <= 0.0) return vec3(0.0);
          float a = dot(d, ${v3(A)}), b = dot(d, ${v3(B)});
          vec3 inArc = ${v3(A)} * a + ${v3(B)} * b;
          float perp = length(d - inArc);            // ~ the angle off the arc
          // bail before the atan. Not only free for the 99.9% of the dome that
          // is nowhere near the arc — it is also what keeps atan(0,0) from ever
          // being asked for, which is undefined and would put one NaN pixel at
          // the arc's pole and let the blur spread it.
          if (perp > 0.03) return vec3(0.0);
          float s = atan(b, a) / ${ARC.toFixed(6)};
          float ds = u - s;                          // >0 is behind the head
          float front = smoothstep(-0.05, 0.005, ds);   // nothing ahead of it
          float tail = clamp(1.0 - ds / ${TAIL.toFixed(2)}, 0.0, 1.0);
          float core = exp(-(perp * perp) / ${(2 * SIG * SIG).toExponential(6)});
          float head = exp(-(ds * ds) / 0.0128);      // a hot point at the front
          // the dome's own star colour, so the meteor and the field it crosses
          // are made of the same light
          return vec3(0.85, 0.92, 1.0)
            * (env * core * front * (pow(tail, 1.6) + head * ${HEAD.toFixed(2)}) * ${PEAK.toFixed(2)});
        }`)
      .replace(ANCHOR, `c += meteor(d);
        ${ANCHOR}`);
    sky.needsUpdate = true;
    starOn = true;
  }

  // --- per frame: where the moon is, and whether it counts --------------------
  const _p = new THREE.Vector3(), _v4 = new THREE.Vector4(), _f = new THREE.Vector3();
  const _r = new THREE.Vector3(), _u = new THREE.Vector3();
  let fade = 0;
  onFrame((tSec) => {
    if (starOn) sky.uniforms.uStarT.value = tSec;
    // __frame() sets the camera and draws in the same tick, so matrixWorld is
    // stale until something asks for it. Camera.updateMatrixWorld also refreshes
    // matrixWorldInverse, which is what the projection below needs.
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements;
    _r.set(e[0], e[1], e[2]);
    _u.set(e[4], e[5], e[6]);
    _f.set(-e[8], -e[9], -e[10]);

    // project a point 100 m along the moon direction. Doing it by hand rather
    // than with Vector3.project because the SIGN OF W is the whole question: a
    // moon behind the camera comes back from project() mirrored into frame,
    // which would draw a full set of rays converging on a point that is not
    // there. w > 0 is exactly dot(camForward, moonDir) > 0.
    _p.copy(cam.position).addScaledVector(moonDir, 100);
    _v4.set(_p.x, _p.y, _p.z, 1)
      .applyMatrix4(cam.matrixWorldInverse)
      .applyMatrix4(cam.projectionMatrix);
    const w = _v4.w;
    const dotF = _f.dot(moonDir);
    if (w > 1e-3) {
      const nx = _v4.x / w, ny = _v4.y / w;
      marchMat.uniforms.uMoonUV.value.set(nx * 0.5 + 0.5, ny * 0.5 + 0.5);
      // two fades, and they overlap rather than duplicate. The first is the
      // moon leaving the front half of the world — smooth to zero well before
      // w changes sign, so nothing can pop as the camera turns away. The second
      // is the moon being so far outside the frame that a shaft would be a
      // uniform gradient with no source in shot: |ndc| = 1.41 is the corner, so
      // full strength holds past it and dies by 2.6.
      fade = sm(clamp01((dotF - 0.02) / 0.28))
           * sm(clamp01((2.6 - Math.hypot(nx, ny)) / 1.1));
    } else {
      fade = 0;
    }
    uK.value = STRENGTH * fade;

    // the half-fov tangents, read every frame because __frame() changes fov per
    // framing — a ray reconstruction with a stale fov is a picture of a camera
    // that is not there
    const tv = Math.tan(cam.fov * Math.PI / 360);
    maskMat.uniforms.uRight.value.copy(_r).multiplyScalar(tv * cam.aspect);
    maskMat.uniforms.uUp.value.copy(_u).multiplyScalar(tv);
    maskMat.uniforms.uFwd.value.copy(_f);
  });

  addPrePass({
    priority: 9,
    // ⚠ RETURNS ITS INPUT UNCHANGED. This is a hook into the frame's timeline,
    // not a filter: the base image is handed straight on to the bloom, and the
    // only thing that happened is that rtQ now holds this frame's rays.
    render(inputTex) {
      if (fade <= 1e-4) return inputTex;   // nothing to draw and nobody reading it
      // the mask reads rtScene, NOT inputTex: scattering happens in the air in
      // front of the lens, so the source is the scene as the air saw it, not as
      // the defocus left it. It also makes this independent of which other
      // pre-passes happen to be loaded.
      maskMat.uniforms.tCol.value = rtScene.texture;
      maskMat.uniforms.tDep.value = rtScene.depthTexture;
      fsPass(maskMat, rtP);
      marchMat.uniforms.tMask.value = rtP.texture;
      fsPass(marchMat, rtQ);
      blurMat.uniforms.tex.value = rtQ.texture;
      blurMat.uniforms.dir.value.set(1.1 / qw, 0);
      fsPass(blurMat, rtP);
      blurMat.uniforms.tex.value = rtP.texture;
      blurMat.uniforms.dir.value.set(0, 1.1 / qh);
      fsPass(blurMat, rtQ);
      return inputTex;
    },
    setSize(w, h) {
      qw = Math.max(1, w >> 2); qh = Math.max(1, h >> 2);
      rtP.setSize(qw, qh); rtQ.setSize(qw, qh);
    },
  });

  // a probe, for the same reason main.js publishes __stats: the fade is the one
  // thing here that silently decides whether the effect exists in a given shot,
  // and a harness that cannot read it can only guess why a frame came back clean
  window.__rays = () => ({
    fade, k: uK.value, moonUV: marchMat.uniforms.uMoonUV.value.toArray(),
    dotFwdMoon: _f.dot(moonDir), star: starOn,
    starPhase: starOn ? (sky.uniforms.uStarT.value + OFFSET) % PERIOD : null,
  });

  console.log(`fx/rays: ${TAPS} taps, source ${'≤'}12${'°'} of moon, air sigma `
    + `${SIGMA.toFixed(3)}/m, strength ${STRENGTH}`
    + `${starOn ? `; meteor every ${PERIOD}s (one at t=17.6-18.6)` : '; no meteor'}`);
};
