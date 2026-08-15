// THE LENS AND THE FILM STOCK — the five things in a frame that belong to the
// CAMERA rather than to the world. Everything else in demo/fx/ adds or moves
// light in the scene; this module adds none. It is the last stop before the
// screen and it does exactly what a lens and an emulsion do to an image that
// has already been formed: fringe it at the edges, smear the bright points
// sideways, push the shadows and the highlights apart in hue, lay a grain over
// it, and round it to eight bits without banding.
//
// That is a deliberate boundary. A grade that reaches back into the scene is a
// grade that can hide a modelling error — the pond once read as a hole and the
// fix was the pond, not a curve — so nothing here samples world position,
// depth, or any of the scene's own uniforms. Five slots on the composite, no
// render targets, no passes, no per-pixel cost worth measuring.
//
// THIS SCENE IS DARK AND THAT IS THE WHOLE CALIBRATION PROBLEM. The composite
// ends in pow(c, 1/2.2), and gamma is an amplifier at the bottom of the range:
// the derivative of c^(1/2.2) at c = 0.03 is 3.15, so an addition of 0.005
// there moves 4 levels of 255, while the same addition at c = 0.5 moves under
// one. Every amplitude below was therefore chosen by working out what it does
// in 8-bit AFTER the gamma, not by how it reads as a linear number. The
// numbers are in the comments where each one is set.
//
// One thing this module deliberately does NOT do is touch the black point.
// Nothing here has a lift, an offset or a floor; the split tone is exactly
// luminance-preserving by construction (below), the grain is zero-mean and
// gated off in the deep shadows, and the dither is +-half a code value. The
// darkest fifth of the frame is meant to come back unchanged, and the verify
// pass measures that rather than assuming it.

export default async (ctx) => {
  const { THREE, renderer, dbs, pal, C, addHead, addSlot, addUniform, setSampler, onFrame } = ctx;

  // --- colour helpers ---------------------------------------------------------
  // A TINT IS A HUE, NOT A BRIGHTNESS. Every colour this module uses as a
  // multiplier is first divided by its own Rec.709 luminance, so multiplying a
  // neutral pixel by it leaves that pixel's luminance untouched and changes
  // only where the light sits between the channels. That is what lets the
  // strengths below be read as "how much hue", with no exposure hidden in them.
  const LUMA = [0.2126, 0.7152, 0.0722];
  const lum = (c) => Math.max(1e-5, LUMA[0] * c.r + LUMA[1] * c.g + LUMA[2] * c.b);
  const unit = (c) => c.multiplyScalar(1 / lum(c));
  // push a unit-luminance colour further from (or nearer to) white, then
  // re-normalise — saturation without exposure
  const sat = (c, k) => unit(c.setRGB(1 + (c.r - 1) * k, 1 + (c.g - 1) * k, 1 + (c.b - 1) * k));

  // --- 1. chromatic aberration ------------------------------------------------
  // A real lens brings short wavelengths to a focus sooner than long ones, so
  // the blue image is SMALLER than the red one and the two only coincide on
  // axis. That gives the sign for free: red is sampled from a slightly smaller
  // radius (its image is magnified), blue from a slightly larger one, green
  // stays put. It is not a stylistic choice about which fringe goes where.
  //
  // The growth law is radius^2 because lateral colour in a simple lens goes as
  // the square of the field angle, and the practical consequence is the one
  // that matters here: it is IDENTICALLY ZERO at the centre of frame, where
  // the subject always is, and only shows in the corners.
  //
  // THE MAGNITUDE IS AN IMAGE FRACTION, NOT A PIXEL COUNT — the px_ref lesson
  // from the native piece, applied to a lens. 0.75 px of red-to-blue separation
  // at the corner of a 1600 px frame is the same 0.047% of frame width at any
  // render size, so a preview and a deliverable are the same photograph. A
  // constant in pixels would make the 3200-wide film a different lens.
  //
  // ⚠ HALVED FROM 1.5 px AFTER LOOKING, and the reason is worth writing down
  // because it is about this SCENE rather than about lenses. A sub-pixel
  // channel shift produces a fringe of shift * local_contrast, and this frame
  // is not a photograph of soft things — it is tens of thousands of 3-5 px
  // leaves at 150+ levels of contrast against a near-black ground. At 1.5 px
  // the bottom corners came back with red-and-cyan speckle on every leaf: a
  // 0.5 px shift across a 150-level edge is 75 levels of fringe on the edge
  // pixel, which is nothing like "just there". Measured mean |diff| in the
  // bottom corner tiles fell 2.2-2.6 to 0.9-1.1 of 255 at half the spread,
  // where it reads as a lens and not as a defect. A frame of soft subjects
  // would carry the textbook 1.5 comfortably; this one does not.
  const CA_PX_AT_1600 = 0.75;
  const uCASpread = addUniform('uCASpread', CA_PX_AT_1600 / 1600);

  // --- 2. the anamorphic streak ----------------------------------------------
  // An anamorphic lens has a cylindrical element, so a point source images as a
  // horizontal line. The composite already holds the only thing needed to draw
  // that: glowTex, the quarter-res thresholded bloom, which by construction is
  // near-zero everywhere except where the scene put a bright SOURCE — the moon
  // disc, the water glints, the brightest vein ends. Sampling it wide and
  // horizontally is the whole effect, and it costs eight texture fetches of a
  // quarter-res target.
  //
  // Reading glowTex rather than the accumulated c is the point, not an
  // economy: a lens flare comes from bright sources, not from whatever else
  // happens to have been added to the frame by then (god rays, for instance,
  // are light in air and have no business streaking).
  //
  // The tint is the moon's own colour — the same construction the sky dome and
  // the pond use, so the picture keeps agreeing with itself about what colour
  // its light source is — pushed a little to the short end, because a flare is
  // light that has been scattered inside the glass and what scatters is blue.
  // It is unit-luminance, so STREAK_GAIN alone says how much is added.
  const streakTint = sat(unit(C(pal.bgGlow, 6).lerp(new THREE.Color(0.9, 0.95, 1.0), 0.55)), 1.0);
  streakTint.setRGB(streakTint.r * 0.88, streakTint.g * 0.97, streakTint.b * 1.16);
  unit(streakTint);
  // taps at +-2, 4, 7, 11 quarter-res texels = +-8, 16, 28, 44 full-res px at
  // 1600 wide, so the streak runs about 5% of frame width either side of a
  // source. Weights are exp(-x/5): the near taps carry it, the far ones give it
  // the long thin tail that reads as anamorphic rather than as a wider bloom.
  const TAPS = [[2, 0.670], [4, 0.449], [7, 0.247], [11, 0.111]];
  // ⚠ THE CALIBRATION KNOB. The sum of the weights over both sides is 2.95, so
  // the streak adds at most 2.95 * GAIN of the glow's value, spread across ~90
  // px. At 0.09 that is 0.27 of a source's bloom — the moon grows a wing, and
  // a vein end (which is a thousandth as bright) grows nothing a person can
  // see, which is the correct behaviour for a lens artefact.
  //
  // Measured on the moon in 'wide' with everything else held: the light this
  // adds 40-80 px from the disc is 5.3x greater horizontally than vertically,
  // which is the number that says "streak" rather than "slightly more bloom".
  // Closer in than ~40 px it measures as almost nothing, and that is not a
  // failure — the halo is already clipped at 255 there, so a lens has nowhere
  // to put the light. The wing only exists where there is headroom for it.
  const STREAK_GAIN = 0.09;
  const uStreakGain = addUniform('uStreakGain', STREAK_GAIN);
  addUniform('uStreakTint', streakTint);

  // --- 3. the split tone ------------------------------------------------------
  // Shadows toward the sky's own blue, highlights toward the key's warmth. Both
  // colours are READ, not picked: bgTop is the palette's zenith and key is the
  // palette's moon, so a different species' export re-grades itself.
  //
  // HOW EXPOSURE IS PRESERVED, exactly: the tinted colour is rescaled so its
  // Rec.709 luminance equals the untinted pixel's, per pixel, before the blend.
  //   tinted = c * tint;  tinted *= luma(c) / luma(tinted);  c = mix(c, tinted, amt)
  // A blend between two colours of equal luminance has that luminance, so the
  // luminance of every pixel in the frame is bit-for-bit what it was and only
  // its hue has moved. There is no exposure term anywhere in this section, and
  // no amount of strength can add or remove light.
  const toneShadow = C(pal.bgTop).clone();
  unit(toneShadow);
  // the key is only mildly warm as exported (about 1.08/0.99/0.86 once
  // normalised), which at these strengths is under one code value — invisible.
  // Pushed 1.8x from white it lands near 1.14/0.98/0.75, which is a handful of
  // levels on the moon's surround and on the brightest veins: enough to
  // separate them from the sky, not enough to look tinted.
  const toneHigh = sat(unit(C(pal.key).clone()), 1.8);
  // 0.085 in the shadows against 0.06 in the highlights, pivoting on luminance.
  // At a neutral 0.10 the shadow tint comes out as R 88 / B 91 of 255 — a cast
  // you can measure and would not point at.
  addUniform('uToneShadow', toneShadow);
  addUniform('uToneHigh', toneHigh);
  const uToneAmt = addUniform('uToneAmt', new THREE.Vector2(0.085, 0.06));

  // --- 4. the grain -----------------------------------------------------------
  // AMPLITUDE, WORKED OUT THROUGH THE GAMMA. The grade slot is pre-gamma, so an
  // addition of a there becomes a * (1/2.2) * c^(1/2.2 - 1) of display value.
  // With GRAIN_AMP = 0.010 and the luminance weight below, peak-to-peak:
  //   c = 0.0023 (deep shade)   weight 0.00  ->  0.0 of 255   — gated off
  //   c = 0.075  (the sky)      weight 0.24  ->  1.1 of 255
  //   c = 0.15   (lit foliage)  weight 0.63  ->  2.1 of 255
  //   c = 0.50   (a glint)      weight 0.96  ->  1.6 of 255
  // One to two levels through the mids and nothing in the blacks is what a
  // scanned stock does, and it is why the weight exists at all: unweighted
  // grain at this amplitude puts seven levels of hiss into the deep shade,
  // because the gamma slope there is 12.4 and not 0.66.
  //
  // ⚠ BOTH NUMBERS CAME DOWN AFTER LOOKING. The first pass ran 0.014 with the
  // low knee at 0.008, and the per-knob attribution said what the crop showed:
  // grain was strongest in the SKY (mean |diff| 1.09 of 255 in the top corners
  // against 0.22 in the dark bottom ones), because the sky is the brightest
  // large flat area in a night frame and the weight was already full there. A
  // night sky with visible grain reads as a compression artefact, not as film.
  // Dropping to 0.010 and moving the knee to 0.02..0.20 takes the sky from 3.4
  // levels to 1.1 while leaving the foliage where it was.
  const GRAIN_AMP = 0.010;
  const uGrainAmp = addUniform('uGrainAmp', GRAIN_AMP);
  // QUANTISED TO 24 Hz so an offline film gets exactly one grain pattern per
  // rendered frame — grain that crawls within a frame is not grain, and grain
  // that changes between two renders of the same instant would break the
  // reproducibility every tool in demo/ depends on. The seed is the frame
  // index, wrapped, so the hash never sees a float big enough to lose its low
  // bits: at 24 Hz a 20 s film uses 480 of the 1024 available and repeats
  // nowhere inside itself.
  //
  // ⚠ THE EPSILON IS LOAD-BEARING AND IT IS NOT PARANOIA. film.mjs steps the
  // clock with `i * 1000 / fps` milliseconds, and at 24 fps frame 7 is
  // 291.66666666666663 ms — which comes back through the seconds conversion as
  // 6.999999999999999 frames, so a bare floor() hands frames 6 and 7 the SAME
  // grain and the pattern visibly sticks for a frame every few seconds. A tenth
  // of a millisecond of tolerance costs nothing and removes the whole class.
  const GRAIN_HZ = 24, GRAIN_WRAP = 1024, GRAIN_EPS = 1e-4;
  const uGrainSeed = addUniform('uGrainSeed', 0);

  // --- 5. the dither ----------------------------------------------------------
  // The banding killer, and the reason it is needed here more than in most
  // scenes: this frame is one enormous smooth gradient (a sky dome from near
  // black to slightly-less-near black, plus exponential fog over everything
  // else), and after the gamma the whole upper half of the picture lives inside
  // about twenty code values. Twenty values across a thousand pixels of height
  // is a contour every fifty rows, and they are plainly visible on any decent
  // display.
  //
  // +-0.5/255 of noise before the hardware quantises is exactly enough to turn
  // each contour into a stochastic boundary — the quantisation error stops
  // being correlated with position, which is the entire mechanism. It cannot
  // change the mean, and at half a code value it cannot be seen as noise.
  //
  // The hash is interleaved gradient noise (Jimenez 2014) rather than a
  // sin-fract hash, because IGN is engineered to have a flat spectrum over a
  // pixel neighbourhood — a sin-fract hash has visible diagonal structure at
  // exactly this amplitude, which trades banding for moire. It is a pure
  // function of gl_FragCoord and does not animate: a still is a still.

  // --- resolution, kept live --------------------------------------------------
  // Both the aberration and the streak need to know the drawing buffer, and
  // main.js resizes rtScene/rtA on window resize without telling effect
  // modules (only pre-passes get setSize). Reading it every frame is a couple
  // of nanoseconds and cannot go stale.
  const uRes = addUniform('uGradeRes', new THREE.Vector2(dbs.x, dbs.y));
  const uGlowTx = addUniform('uGradeGlowTx',
    new THREE.Vector2(1 / Math.max(1, dbs.x >> 2), 1 / Math.max(1, dbs.y >> 2)));

  addHead(`
    uniform vec2 uGradeRes, uGradeGlowTx;
    uniform float uCASpread, uStreakGain, uGrainAmp, uGrainSeed;
    uniform vec3 uStreakTint, uToneShadow, uToneHigh;
    uniform vec2 uToneAmt;

    float gradeLuma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    // Hoskins hash13 — three floats in, one uniform float out, no trig
    float gradeHash(vec3 p){
      p = fract(p * vec3(0.1031, 0.1030, 0.0973));
      p += dot(p, p.yxz + 33.33);
      return fract((p.x + p.y) * p.z);
    }
    // interleaved gradient noise: flat over a pixel neighbourhood, which is
    // what a dither pattern has to be
    float gradeIGN(vec2 p){
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }

    // THE LENS. Red magnified, blue minified, green on axis, separation growing
    // as the square of the normalised field radius and identically zero at the
    // centre of frame. Distances are computed in PIXELS and converted back to
    // uv at the end, so the fringe is radially symmetric on screen rather than
    // in a stretched uv space — in a 16:10 frame the two differ by 1.6x.
    vec3 fetchCA(sampler2D t, vec2 uv){
      vec2 dPx = (uv - 0.5) * uGradeRes;
      float r = length(dPx);
      float rn = r / max(0.5 * length(uGradeRes), 1.0);   // exactly 1 at a corner
      float sepPx = uCASpread * uGradeRes.x * rn * rn;    // red-to-blue, in px
      // ⚠ AND A FLOOR, WHICH IS ABOUT THE SAMPLER AND NOT ABOUT THE LENS.
      // Bilinear weights are quantised (1/256 on this hardware), so an
      // ARBITRARILY SMALL offset still fetches a fixed ~1/256 blend with the
      // neighbouring texel rather than scaling smoothly to nothing. On this
      // scene's 200-level leaf edges that is a floor of ~0.8 of a code value
      // that does not care how small the offset is — measured, by running the
      // aberration at 1x and 4x and finding the inner bins moved 0.607 -> 0.673
      // (a floor) while the outer bins moved 1.08 -> 2.19 (a law). Below 0.02 px
      // of separation there is nothing to fetch but that rounding, so take the
      // plain sample and let the centre of frame be EXACTLY the ungraded image.
      if (sepPx < 0.02) return texture2D(t, uv).rgb;
      vec2 dir = dPx / max(r, 1e-4);
      vec2 off = dir * (0.5 * sepPx) / uGradeRes;         // px -> uv, half each way
      return vec3(
        texture2D(t, uv - off).r,
        texture2D(t, uv).g,
        texture2D(t, uv + off).b);
    }`);
  setSampler('fetchCA');

  addSlot('light', `
    {
      // the anamorphic wing. Horizontal only, on the bloom's own texture, with
      // the same Inf clamp main.js applies at every other read of it — an
      // additive vein stack can reach Inf in a half-float target and Inf
      // through the ACES rational is NaN.
      vec3 st = vec3(0.0);
      ${TAPS.map(([d, w]) => `
      st += (min(max(texture2D(glowTex, uv + vec2(${d.toFixed(1)} * uGradeGlowTx.x, 0.0)).rgb, 0.0), 64.0)
           + min(max(texture2D(glowTex, uv - vec2(${d.toFixed(1)} * uGradeGlowTx.x, 0.0)).rgb, 0.0), 64.0))
           * ${w.toFixed(3)};`).join('')}
      c += st * uStreakTint * uStreakGain;
    }`);

  addSlot('grade', `
    {
      // --- split tone, at constant luminance ---
      float l = gradeLuma(c);
      float w = smoothstep(0.06, 0.55, l);
      vec3 tinted = c * mix(uToneShadow, uToneHigh, w);
      tinted *= l / max(gradeLuma(tinted), 1e-5);   // the exposure guarantee
      c = mix(c, tinted, mix(uToneAmt.x, uToneAmt.y, w));

      // --- grain ---
      // strongest through the mids: ramped in above the deep shadows (where
      // the gamma slope would multiply it by three) and pulled back in the
      // highlights (where film has less silver to be grainy with anyway).
      float gl = gradeLuma(c);
      float gw = smoothstep(0.02, 0.20, gl) * (1.0 - 0.85 * smoothstep(0.45, 0.9, gl));
      float gn = gradeHash(vec3(gl_FragCoord.xy, uGrainSeed)) - 0.5;
      c += gn * (uGrainAmp * gw);
    }`);

  addSlot('final', `
    {
      // +-0.5 of a code value, post-gamma, decorrelated per channel — the
      // offsets are irrational-ish so the three planes do not share a pattern
      // and the dither reads as neutral rather than as coloured speckle.
      vec2 fc = gl_FragCoord.xy;
      vec3 dth = vec3(gradeIGN(fc), gradeIGN(fc + 61.7), gradeIGN(fc + 137.3)) - 0.5;
      gl_FragColor.rgb += dth * (1.0 / 255.0);
    }`);

  const _sz = new THREE.Vector2();
  onFrame((tSec) => {
    renderer.getDrawingBufferSize(_sz);
    uRes.value.set(_sz.x, _sz.y);
    uGlowTx.value.set(1 / Math.max(1, _sz.x >> 2), 1 / Math.max(1, _sz.y >> 2));
    // deterministic in tSec alone: a repeated still (ds = 0) reproduces, and a
    // film gets one pattern per frame at 24 Hz whatever the render rate
    uGrainSeed.value = Math.floor(tSec * GRAIN_HZ + GRAIN_EPS) % GRAIN_WRAP;
  });

  // a console handle for calibration, the way rays.js exposes its one knob —
  // these are the whole look and they are worth being able to A/B in a live
  // page without a rebuild. Zeroing any one of them isolates it exactly, which
  // is how each of the amplitudes above was actually measured: against the same
  // page in the same state, not against a second page load (the mist and the
  // motes advect on wall-clock, so two loads of one URL are two pictures).
  window.__grade = {
    ca: uCASpread, streak: uStreakGain, tone: uToneAmt, grain: uGrainAmp,
    seed: uGrainSeed,
  };
};
