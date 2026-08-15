// ATTENTION-DRIVEN DEPTH OF FIELD — the camera focuses on what the bee attends to.
//
// The flight camera in main.js is a bee, and a bee's path is a string of
// VISITS (hang at 0.8-1.8 m off a specimen, look at it) joined by DARTS
// (cross the clearing, look 5-20 m out). Both already publish the one number
// this needs: flightCam writes window.__focusDist as the length of the gaze
// vector, i.e. the distance to the thing the camera is currently attending
// to. That is not a proxy for focus, it IS focus — an eye converges on what
// it looks at — so nothing here has to invent a subject or search the depth
// buffer for one. The orbit camera publishes the same quantity (distance to
// its subject), so the effect works in both modes without knowing which.
//
// Two consequences, and they are the whole reason this is the marquee effect:
//
//   A VISIT MELTS THE FIELD. Focused at ~1.2 m, everything past the specimen
//   goes to the aperture's limit, the moon becomes a soft disc, and the ~150
//   plants behind the subject stop competing with it. That is the single
//   strongest "this is a photograph, not a render" cue available.
//
//   A DART BRINGS IT BACK. Focused at 5-20 m, depth of field is enormous —
//   this is not a dial being turned down, it falls out of the thin-lens
//   formula, where the blur circle at infinity is A*f/(F-f) and F is in the
//   denominator. Only the grass the camera is flying THROUGH stays soft.
//
// So the rack is emergent from the flight path. What is imposed is two
// constants — the entrance pupil diameter, and a ceiling on how far it may
// open, which is a look decision and is argued for where it is declared.
// Everything else — how blur scales with distance, why a far focus is nearly
// all sharp, why the near field falls off faster than the far — is the thin
// lens, and the ceiling only binds below ~1.15 m of focus.
//
// ⚠ THE PUPIL IS BIGGER THAN ANY REAL LENS AND THAT IS DELIBERATE, LABELLED.
// The scene's field of view is set by the framing, not by us, so the only
// free parameter left is the pupil. At the hero framing's 42° the effective
// focal length is 31 mm, and a 30 mm pupil there is f/1.05 — faster than a
// photographic lens exists. A physically-plausible f/2 would put the melt at
// a 3-pixel radius, which reads as "slightly out of focus" rather than as
// shallow depth of field, because the cinematic look everyone recognises
// comes from long lenses on big formats and this camera is neither. The
// exaggeration is one number, it is stated, and every DEPENDENCE stays
// physical: a scene twice as far focused keeps the blur that geometry says.
//
// Runs at pre-pass priority 1, so the blur happens BEFORE the bloom threshold
// — glows bloom from the blurred image, which is what a real lens does (the
// halation is in the optics, downstream of the defocus) and costs nothing.

export default async (ctx) => {
  const { THREE, cam, dbs, rtScene, fsPass, FSV, addPrePass, onFrame, mulberry32 } = ctx;

  // --- the imposed numbers ----------------------------------------------------
  // Entrance pupil diameter, metres. Picked by looking at the hero framing at
  // a visit distance and the wide framing at a far one; see the note above for
  // why a physical f-number could not be the knob instead.
  const PUPIL = 0.030;
  // The format the field of view is measured against. Only the RATIO of pupil
  // to format matters (focal length scales with format, and c/S is what lands
  // on screen), so this is not a second knob — it is the unit PUPIL is in.
  const FORMAT_H = 0.024;
  // ⚠ AND ONE LOOK CONSTANT ON TOP OF IT, WHICH THIS EFFECT DOES NOT GET TO
  // PRETEND IS PHYSICS. Blur at infinity goes as 1/(F-f), so a bee hovering at
  // its closest — hoverR bottoms out at 0.75 m — puts the background 14x
  // further out than the 1.6 m hero visit does, and at that distance the
  // SUBJECT is the casualty: a specimen 0.5 m deep, filling the frame at 0.74 m,
  // has its near foliage 0.3-0.4 m from the lens, well past the clamp, and the
  // plant stops being a plant. Watched, and it is the one frame of the eight
  // captured that reads as wrong. This piece exists to show grown form; an
  // effect that erases the form of the thing it is focusing ON has overrun its
  // remit, whatever the thin lens says. So the aperture stops down — as a
  // photographer's would — the moment the background blur would exceed this.
  // Measured in FRAME HEIGHTS, not pixels: a pixel-denominated look constant
  // is a different picture at every resolution, which is exactly the trap the
  // Blender bridge's px_ref note in CLAUDE.md was written about. It bites only
  // below ~1.15 m of focus; every framing longer than that is untouched thin
  // lens, which is why the 1.13 m and 1.6 m visits below are unchanged by it.
  const BG_CAP = 0.0173;
  // Largest gather radius the disc will carry, also in frame heights. Beyond
  // this, 32 taps undersample into ghosting no matter how they are placed.
  // ⚠ THIS ONE IS A SAMPLING LIMIT AND THE TAP COUNT IS CALIBRATED TO IT: the
  // set was chosen with the radius near 12 half-res pixels, so a render very
  // much larger than 1200x750 wants more taps, not just a bigger number here.
  const MAXR_FRAC = 0.032;
  // How fast the focus follows attention. A bee's head turn is ~0.2 s and the
  // gaze cap in main.js is 55°/s, so a focus pull much faster than this reads
  // as a snap-zoom; much slower and the subject is soft through the whole
  // visit. 0.25 s is a rack, deliberate and legible.
  const TAU = 0.25;
  // Where the sharp image gives way to the blurred one, in half-res pixels of
  // CoC radius. Below ~0.35 the disc is inside one full-res pixel and there is
  // nothing to show; by 1.4 the blur is real and the sharp copy would only be
  // aliasing against it.
  const BLEND = [0.35, 1.4];

  // --- the tap set ------------------------------------------------------------
  // 32 taps, best-candidate sampled in the unit disc (16 candidates per pick,
  // keep the one furthest from everything chosen so far). That is blue noise
  // by construction — a uniform random disc clumps, and clumps in a gather
  // read as bokeh with lumps in it. Seeded, so the set is identical in every
  // session and every offline film frame.
  const TAPS = (() => {
    const r = mulberry32(2527), pts = [];
    for (let i = 0; i < 32; i++) {
      let best = null, bestD = -1;
      for (let k = 0; k < 16; k++) {
        // uniform in the disc: sqrt of the radial draw, or the centre crowds
        const a = r() * Math.PI * 2, rad = Math.sqrt(r());
        const p = [Math.cos(a) * rad, Math.sin(a) * rad];
        let d = Infinity;
        for (const q of pts) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1]));
        if (d > bestD) { bestD = d; best = p; }
      }
      pts.push(best);
    }
    return pts;
  })();
  // baked as unrolled TAP() calls: GLSL ES 1.00 has no array initialisers, and
  // an unrolled disc is faster than an indexed one anyway
  const TAP_CALLS = TAPS
    .map(([x, y]) => `  TAP(${x.toFixed(5)}, ${y.toFixed(5)}, ${Math.hypot(x, y).toFixed(5)})`)
    .join('\n');

  // --- targets ----------------------------------------------------------------
  // Half res for the gather (a blur is bandlimited; full-res taps buy nothing
  // and cost 4x), full res for the recomposite, all HalfFloat because the
  // scene is linear HDR and the emissive veins live well above 1.
  const mkRT = (w, h) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
  });
  let fullW = dbs.x, fullH = dbs.y;
  let halfW = Math.max(1, fullW >> 1), halfH = Math.max(1, fullH >> 1);
  const rtDown = mkRT(halfW, halfH);    // colour + CoC, quarter area
  const rtBlur = mkRT(halfW, halfH);    // the gather
  const rtOut = mkRT(fullW, fullH);     // what bloom and the composite read

  // the linearisation the whole file agrees on — near 0.05, far 320, both
  // taken from the camera main.js built rather than restated
  const LINZ = `
    float linZ(vec2 uv){
      float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
      return 2.0 * ${cam.near.toFixed(3)} * ${cam.far.toFixed(1)} /
        (${(cam.far + cam.near).toFixed(3)} - z * ${(cam.far - cam.near).toFixed(3)});
    }
    // signed circle of confusion RADIUS in half-res pixels. Negative is nearer
    // than the focal plane. uCocScale carries the whole thin lens: it is
    // 0.5 * A*f/((F-f)*formatHeight) * halfResHeight, so the (z-F)/z here is
    // the only per-pixel geometry.
    float cocAt(vec2 uv){
      float z = linZ(uv);
      return clamp(uCocScale * (z - uFocus) / max(z, 1e-4), -uMaxR, uMaxR);
    }`;

  // uMaxR is a UNIFORM rather than a baked constant so the encoding range
  // tracks the frame height — bake it and a 4K film silently clamps at a third
  // of the blur a 1200-wide preview showed, which is the px_ref bug again
  const U = () => ({ uFocus: { value: 6 }, uCocScale: { value: 0 }, uMaxR: { value: 12 } });

  // --- pass 1: downsample, and carry the CoC in alpha -------------------------
  // A 4-tap box rather than a bilinear fetch, because the emissive veins are
  // sub-pixel lines and a 2x decimation that skips samples turns them into
  // crawling dots. The CoC keeps the sample of LARGEST MAGNITUDE of the four:
  // averaging CoC across a silhouette invents a depth that is on neither side
  // of it, and taking the extreme dilates the near field by half a full-res
  // pixel, which is free and always in the right direction.
  const downMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ tColor: { value: null }, tDepth: { value: rtScene.depthTexture }, uTexel: { value: new THREE.Vector2() } }, U()),
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tColor, tDepth; uniform vec2 uTexel; uniform float uFocus, uCocScale, uMaxR;
      ${LINZ}
      void main(){
        vec2 o = uTexel * 0.5;
        vec2 a = vUv + vec2(-o.x, -o.y), b = vUv + vec2(o.x, -o.y);
        vec2 c = vUv + vec2(-o.x, o.y), d = vUv + vec2(o.x, o.y);
        // clamp at the door, exactly as main.js does before its threshold:
        // additive vein light stacks to Inf in a half-float target, and Inf
        // multiplied by a zero gather weight is NaN, which smears
        vec3 col = min(max(texture2D(tColor, a).rgb + texture2D(tColor, b).rgb
                         + texture2D(tColor, c).rgb + texture2D(tColor, d).rgb, 0.0), 256.0) * 0.25;
        float k0 = cocAt(a), k1 = cocAt(b), k2 = cocAt(c), k3 = cocAt(d);
        float mn = min(min(k0, k1), min(k2, k3));
        float mx = max(max(k0, k1), max(k2, k3));
        float coc = (-mn > mx) ? mn : mx;
        gl_FragColor = vec4(col, coc / uMaxR);
      }`,
  });

  // --- pass 2: the gather -----------------------------------------------------
  // Gather-as-scatter. Each tap contributes only if ITS OWN circle of
  // confusion reaches this pixel: w = saturate((|coc_tap| - distance) * 0.5 + 1).
  // That one line is the answer to bleeding, and it is the CoC-premultiplied
  // weighting written as a coverage test rather than as a multiply — a sharp
  // foreground tap has |coc| ~ 0, so its weight collapses to zero the moment
  // it is more than a pixel or two away, and it cannot smear into a blurred
  // background behind it. The reverse direction comes free: a blurred
  // background tap has a large |coc| and DOES reach across, which is what
  // stops a defocused background from developing a hard sharp-edged hole
  // around every twig in front of it.
  //
  // ⚠ NEAR FIELD IS SINGLE-PLANE, deliberately and by the spec's leave. A
  // pixel gathers over its own radius, so a defocused foreground softens
  // inside its silhouette but does not EXPAND over the sharp background
  // behind it. Dilating the radius with the neighbourhood's near CoC is the
  // usual fix and it fights this weighting head on: the same coverage test
  // that stops sharp-into-blurred bleeding also zeroes every background tap
  // inside a dilated radius, so the background vanishes into a foreground
  // halo instead of being composited under it. Doing it properly needs a
  // separate near layer with its own alpha, which is a second gather and a
  // second target. What this scene actually shows in the near field is grass
  // and terrain — a smooth depth ramp, where neighbouring pixels have nearly
  // equal CoC and single-plane is very close to right.
  const blurMat2 = new THREE.ShaderMaterial({
    uniforms: { tHalf: { value: rtDown.texture }, uTexel: { value: new THREE.Vector2() }, uMaxR: { value: 12 } },
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tHalf; uniform vec2 uTexel; uniform float uMaxR;
      void main(){
        vec4 c0 = texture2D(tHalf, vUv);
        float R = abs(c0.a) * uMaxR;
        // The tap set is fixed, so without this every bright vein point is
        // reproduced as 32 identical ghosts in a repeating constellation.
        // Rotating the disc per pixel by an interleaved-gradient angle turns
        // that structure into high-frequency noise, which the bloom pass
        // immediately downstream smooths. It is a pure function of the pixel —
        // no time, no frame counter — so an offline film reproduces it exactly.
        float ang = fract(52.9829189 * fract(0.06711056 * gl_FragCoord.x
                                           + 0.00583715 * gl_FragCoord.y)) * 6.2831853;
        float ca = cos(ang), sa = sin(ang);
        vec3 acc = c0.rgb; float wsum = 1.0;
        #define TAP(dx,dy,l) { vec2 o = vec2(ca*(dx) - sa*(dy), sa*(dx) + ca*(dy)) * R; vec4 s = texture2D(tHalf, vUv + o * uTexel); float w = clamp((abs(s.a) * uMaxR - (l) * R) * 0.5 + 1.0, 0.0, 1.0); acc += s.rgb * w; wsum += w; }
${TAP_CALLS}
        #undef TAP
        gl_FragColor = vec4(acc / wsum, c0.a);
      }`,
  });

  // --- pass 3: put it back at full resolution ---------------------------------
  // The CoC is recomputed here from the full-res depth rather than upsampled,
  // so the sharp/blurred boundary lands on the geometry's own silhouette
  // instead of on a half-res staircase.
  const outMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ tSharp: { value: null }, tBlur: { value: rtBlur.texture }, tDepth: { value: rtScene.depthTexture } }, U()),
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tSharp, tBlur, tDepth; uniform float uFocus, uCocScale, uMaxR;
      ${LINZ}
      void main(){
        vec3 sharp = min(max(texture2D(tSharp, vUv).rgb, 0.0), 256.0);
        float a = smoothstep(${BLEND[0].toFixed(2)}, ${BLEND[1].toFixed(2)}, abs(cocAt(vUv)));
        gl_FragColor = vec4(mix(sharp, texture2D(tBlur, vUv).rgb, a), 1.0);
      }`,
  });

  const texel = (m, w, h) => m.uniforms.uTexel.value.set(1 / w, 1 / h);
  const sizeAll = () => {
    texel(downMat, fullW, fullH);   // pass 1 steps in FULL-res texels
    texel(blurMat2, halfW, halfH);  // pass 2 steps in HALF-res texels
  };
  sizeAll();

  // --- the rack ---------------------------------------------------------------
  // An exponential follower with a real time constant, driven by the frame's
  // own delta so a 24 fps offline film and a 60 fps browser rack at the same
  // RATE. ds is 0 for a repeated still, which makes the EMA a no-op and every
  // re-render of one frame identical — determinism is load-bearing here.
  //
  // ⚠ ds IS DERIVED FROM tSec, SO A STILL TOOL THAT HOLDS tSec HOLDS THE FOCUS
  // TOO. window.__frame(name, tSec) defaults tSec to 300 for every framing, so
  // walking five framings at the default gives ds = 0 on four of them and the
  // focus stays where the first one put it. That is the contract working as
  // written (a repeat of one frame must be bit-identical), not a bug, and it
  // costs nothing in the shipped tools because demo/shot.mjs does not change
  // __focusDist between framings either. It cost an hour of this module's
  // verification, though: four framings came back uniformly blurred and read
  // exactly like a broken depth fetch. If a harness wants a per-framing rack,
  // it must advance tSec — and both sides of an A/B must advance it alike.
  let focus = -1;
  onFrame((tSec, ds) => {
    const want = Math.max(0.15, ctx.focusDist());
    if (focus < 0) focus = want;
    else focus += (want - focus) * (1 - Math.exp(-ds / TAU));

    // the thin lens, evaluated against the camera the framing actually set:
    // fov is per-framing here, so the focal length is read every frame rather
    // than assumed. f = (formatHeight/2) / tan(fov/2).
    const f = FORMAT_H / (2 * Math.tan(cam.fov * Math.PI / 360));
    const F = Math.max(focus, f * 1.02);          // focus inside the focal length has no image
    // the two limits, both frame-height fractions turned into half-res pixels
    // HERE and nowhere else, so the picture is the same at any render size
    const scale = Math.min(0.5 * (PUPIL * f) / ((F - f) * FORMAT_H), BG_CAP) * halfH;
    const maxR = MAXR_FRAC * halfH;
    for (const m of [downMat, blurMat2, outMat]) m.uniforms.uMaxR.value = maxR;
    for (const m of [downMat, outMat]) {
      m.uniforms.uFocus.value = F;
      m.uniforms.uCocScale.value = scale;
    }
  });

  addPrePass({
    priority: 1,
    render(inputTex) {
      downMat.uniforms.tColor.value = inputTex;
      downMat.uniforms.tDepth.value = rtScene.depthTexture;
      fsPass(downMat, rtDown);
      blurMat2.uniforms.tHalf.value = rtDown.texture;
      fsPass(blurMat2, rtBlur);
      outMat.uniforms.tSharp.value = inputTex;
      outMat.uniforms.tBlur.value = rtBlur.texture;
      outMat.uniforms.tDepth.value = rtScene.depthTexture;
      fsPass(outMat, rtOut);
      return rtOut.texture;
    },
    setSize(w, h) {
      fullW = w; fullH = h;
      halfW = Math.max(1, w >> 1); halfH = Math.max(1, h >> 1);
      rtDown.setSize(halfW, halfH);
      rtBlur.setSize(halfW, halfH);
      rtOut.setSize(fullW, fullH);
      sizeAll();
    },
  });

  // the console line every other module here prints, for the same reason: a
  // pass that silently did not install looks exactly like a pass that did
  console.log(`fx/dof: thin lens, pupil ${(PUPIL * 1000).toFixed(0)}mm, ${TAPS.length} taps, `
    + `bg cap ${(BG_CAP * 100).toFixed(2)}% of frame height, rack ${TAU}s`);
};
