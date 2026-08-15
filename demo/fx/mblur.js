// CAMERA MOTION BLUR — the darts, exposed rather than sampled.
//
// The flight camera is a bee, and a bee's path alternates VISITS (hang off a
// specimen, barely moving) with DARTS (cross the clearing at several metres a
// second). A renderer takes an infinitely short sample of each of those; a
// camera does not — its shutter is open for a fraction of the frame interval
// and everything that moves across the sensor during that time is integrated
// into one exposure. That difference is most of why rendered movement reads as
// "computer" and filmed movement reads as filmed, and on a dart it is the
// single largest remaining discrepancy in this scene: 8 m/s past grass a metre
// off the lens is tens of pixels of travel inside one 24 fps frame, drawn here
// as if the shutter were open for none of it.
//
// So: reconstruct where each pixel's surface WAS one frame ago, and integrate
// the image along the segment between there and here.
//
//   depth + inverse(current viewProjection)  ->  world position
//   world position * previous viewProjection ->  where it was on screen
//   velocity = uv - prevUv
//
// Nothing about that needs a velocity buffer, a second render or any change to
// the scene: the depth texture main.js already keeps and two 4x4 matrices are
// the whole input. What it buys, and what it does not, are both consequences
// of that one choice and are stated below rather than discovered later.
//
// ⚠ WHAT IT CANNOT SEE, SAID PLAINLY: a reprojection of the DEPTH buffer knows
// only where the camera went. The plants sway in the wind — that displacement
// happens in the vertex shader, so the depth it writes is already the swayed
// depth and the reprojection reads it as a stationary surface. This effect is
// therefore camera motion blur exactly and not object motion blur, which is
// what its name claims and no more. It is also the right ordering of effort
// here: a leaf tip's wind travel is a fraction of a pixel per frame at force 2,
// and a dart's is tens. Per-object velocity would need every material in the
// scene to write a second buffer, which is a rewrite of the scene rather than
// an effect module.
//
// ⚠ AND WHAT IT DOES NOT DILATE. Each pixel gathers over ITS OWN velocity, so a
// fast near blade picks up the background it is sweeping across — correct, it
// really is translucent during the exposure — but it does not EXPAND over the
// slow background beyond its own silhouette. The usual fix is a neighbourhood
// velocity dilation (McGuire), and the usual reason it is needed is a fast
// object crossing a slow background. Under CAMERA-ONLY motion that case cannot
// arise: parallax is monotone in depth, so a pixel is never slower than the
// thing in front of it. The gather is doing all the work a camera-only blur has
// to do, and a dilation pass would buy a case this effect cannot produce.
//
// THE ORDERING, STATED BECAUSE IT IS THE ONE THING EASY TO GET WRONG. The
// matrices are snapshotted inside render(), NOT in onFrame. onFrame runs at the
// top of draw(), before renderer.render(scene, cam) — and three only refreshes
// camera.matrixWorldInverse during render, so a viewProjection built in onFrame
// is the PREVIOUS frame's view wearing this frame's name. __frame() makes that
// vivid: it moves the camera and calls draw() immediately, so onFrame would see
// the pre-jump matrices every time. render() is called after the scene pass, so
// there both matrices are this frame's. Sequence per pass: build curVP, blur
// with (curVP, prevVP), then copy curVP into prevVP on the way out.
//
// THE SHUTTER IS A FRACTION OF A FRAME, WHICH IS WHY IT NEEDS NO FRAME RATE.
// Velocity above is displacement over one frame interval, whatever that
// interval is; a 180-degree shutter is open for half of it. So uShutter = 0.5
// and the blur is correct at 24 fps offline and at whatever the browser manages
// live, without either one being told which it is. A repeated still gets the
// same camera twice, prevVP == curVP, velocity identically zero — stills are
// untouched, and this file makes that free rather than approximate by skipping
// the pass outright when nothing moved (see maxStreakPx below).
//
// Runs at pre-pass priority 2, so AFTER dof and BEFORE the bloom threshold: the
// defocus is in the optics, the smear is the exposure of that optical image,
// and the glow blooms from the result. A streaked highlight that then blooms is
// what a bright vein does past a real lens.
//
// MEASURED, against fx=none at 900x560 with the drifters equalised across the
// two pages (the mist and motes integrate on wall clock from page load, so two
// browsers disagree about the field by ~0.1/255 before this module is even
// asked; equalising them is what turns "close" into "exactly"):
//
//   still, __frame twice at one t   0.0000 mean abs diff, worst channel 0
//   flight dart, t = 5.5 s          9.56/255 (3.75%), 47% of channels moved
//   flight dart, t = 6.46 s         5.37/255 (2.11%), 33% moved
//   flight hover on the hero, 11.5s 5.03/255 (1.97%), 27% moved
//   default orbit camera, t = 4 s   0.90/255 (0.35%),  3% moved
//
// The last line is the one worth keeping: the orbit is a slow arc at 11 m, so
// only the foreground pays, and that is the pass reading the scene's velocity
// rather than applying a look. Frame means move 44.79 -> 45.58 and 67.75 ->
// 69.60 on the darts — the blacks lift by well under one code value, which is
// the whole budget a scene this dark has.
//
// ⚠ One visible side effect, correct and worth knowing: the mote field's
// sub-pixel points DIM on the moving frames. A one-pixel highlight that travels
// three pixels during the exposure spreads its energy over three pixels and
// loses two thirds of its peak. That is what a camera does to a spark, and it
// is also the reason the whole pass reads as anti-aliasing on the grass.

export default async (ctx) => {
  const { THREE, cam, dbs, rtScene, fsPass, FSV, addPrePass } = ctx;

  // --- the four numbers -------------------------------------------------------
  // A 180-degree shutter: open for half the frame interval. This is the
  // photographic default, it is what nearly every film anyone has watched was
  // exposed at, and it is the reason this is not a look knob. Larger reads as
  // dreamy, smaller as the stuttery look of a war film.
  const SHUTTER = 0.5;
  // ⚠ AND ONE LOOK CONSTANT ON TOP OF IT, WHICH THIS EFFECT DOES NOT GET TO
  // PRETEND IS PHYSICS — the same concession fx/dof's BG_CAP makes, for exactly
  // the same reason and after exactly the same discovery. The streak this scene
  // physically asks for is enormous: measured on the flight at a 560-line frame,
  // a DART wants 120-290 px of travel at the near plane, and even a HOVER — the
  // bee arcing 0.6 rad around a plant she is studying — wants 10-12 px on the
  // subject and ~26 px on the background swinging past it. Every one of those is
  // correct 180-degree shutter. All of them were rendered, and the hover frame
  // came back with the specimen dissolved. This piece exists to show grown form,
  // and an effect that erases the form of the thing the camera is hovering to
  // look at has overrun its remit, whatever the shutter says.
  //
  // So the response SATURATES rather than clips: streak' = S*(1 - exp(-streak/S)).
  // That is the identity for small motion — a slow drift keeps the blur physics
  // says it has, to within a percent — and it bends only where the smear would
  // start destroying the subject.
  //
  // ⚠ A HARD CLAMP WAS TRIED FIRST AND IS THE WRONG SHAPE, which is worth more
  // than the constant is. Clamping at 24 px (16.8 px at the 560-line test frame)
  // looked reasonable on paper and deleted the effect's whole point in practice:
  // EVERY frame with any camera motion in it — hovers included — asks for more
  // than any tasteful ceiling, so the clamp bound on all of them and made a hover
  // and a dart the SAME picture. A bound that is always active is not a bound, it
  // is a constant. Saturation keeps the ordering (hover ~6 px, near foliage on a
  // dart at the 8.4 px asymptote, both at 560 lines) while bounding the worst
  // case, and it is smooth, so nothing pops as the camera accelerates.
  //
  // In FRAME HEIGHTS rather than pixels, because a pixel-denominated look
  // constant is a different picture at every resolution — the trap CLAUDE.md's
  // px_ref note is about, and the one fx/dof states the same way. A 4K film gets
  // this picture rather than a fifth of the smear.
  //
  // It is also what makes eight taps enough: the ladder never spans more than S,
  // so the tap spacing stays near a pixel and the gather cannot break into the
  // discrete ghosts an unbounded velocity would produce. And it is what makes a
  // TELEPORT survivable — the flight loop wraps at 22 s and __frame() jumps
  // outright, both of which ask for the whole image dragged across itself.
  const SATURATE = 0.015;
  // Taps along the segment. Uniformly spaced and uniformly weighted, because an
  // open shutter is open uniformly — the exposure integral is a box filter, and
  // any prettier falloff would be inventing an aperture that is not there.
  const TAPS = 8;
  // Below this much streak the pass is skipped entirely and the input texture
  // is handed straight on. 0.4 px is under the sharp/blurred threshold fx/dof
  // settled on for the same reason (nothing to show inside one pixel), and
  // skipping rather than blurring by an invisible amount is what makes a still
  // BIT-identical to fx=none instead of merely close.
  const MIN_PX = 0.4;

  // --- the target -------------------------------------------------------------
  // HalfFloat, full res: the scene is linear HDR and the emissive veins live
  // well above 1, so an LDR intermediate here would clip exactly the highlights
  // whose streaks are the point.
  let fullW = dbs.x, fullH = dbs.y;
  const rtOut = new THREE.WebGLRenderTarget(Math.max(1, fullW), Math.max(1, fullH), {
    type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
  });

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: rtScene.depthTexture },
      uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() },
      uRes: { value: new THREE.Vector2(fullW, fullH) },
      uShutter: { value: SHUTTER }, uSatPx: { value: SATURATE * fullH },
    },
    vertexShader: FSV,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D tColor, tDepth;
      uniform mat4 uInvVP, uPrevVP;
      uniform vec2 uRes;
      uniform float uShutter, uSatPx;

      // interleaved gradient noise, a pure function of the pixel — no time, no
      // frame counter — so an offline film reproduces the dither exactly. Same
      // construction and the same reason as fx/dof's per-pixel disc rotation.
      float ign(vec2 p){
        return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
      }

      void main(){
        // THE SKY IS BLURRED LIKE EVERYTHING ELSE AND THAT IS CORRECT. Its depth
        // is at or near the far plane, so the reconstruction puts it 320 m out,
        // where a translation reprojects to nothing and a rotation reprojects to
        // the full angular sweep. Pure rotational blur on the sky is exactly what
        // a panning camera records; skipping the far plane would leave a sharp
        // starfield sitting behind streaked hills.
        float d = texture2D(tDepth, vUv).x;
        vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        vec2 vel = vec2(0.0);
        if (abs(wp.w) > 1e-9) {
          vec4 pp = uPrevVP * vec4(wp.xyz / wp.w, 1.0);
          // w <= 0 is a point that was BEHIND the previous camera; there is no
          // previous screen position to travel from, so it contributes no
          // velocity rather than a mirrored one
          if (pp.w > 1e-6) vel = (vUv - (pp.xy / pp.w * 0.5 + 0.5)) * uShutter;
        }
        // saturate, do not clip — see SATURATE above. The identity for small
        // motion, an asymptote at uSatPx for large.
        float L = length(vel * uRes);
        if (L > 1e-6) vel *= uSatPx * (1.0 - exp(-L / uSatPx)) / L;

        // Stratified over the open shutter and offset by the pixel's own noise:
        // a fixed ladder of 8 taps reproduces every bright vein point as 8
        // discrete ghosts, and jittering the ladder turns that structure into
        // high-frequency noise the bloom pass immediately downstream smooths.
        float j = ign(gl_FragCoord.xy);
        vec3 acc = vec3(0.0);
        for (int i = 0; i < ${TAPS}; i++) {
          float t = (float(i) + j) / ${TAPS}.0 - 0.5;
          vec2 uv = clamp(vUv + vel * t, vec2(0.0), vec2(1.0));
          // clamp at the door, exactly as main.js does before its threshold and
          // fx/dof before its gather: additive vein light stacks to Inf in a
          // half-float target, and Inf through the ACES rational is NaN
          acc += min(max(texture2D(tColor, uv).rgb, 0.0), 256.0);
        }
        gl_FragColor = vec4(acc / ${TAPS}.0, 1.0);
      }`,
  });

  // --- how much is actually moving --------------------------------------------
  // The frustum, probed at its corners and at the centres of its near and far
  // faces, reprojected through the previous viewProjection exactly as the shader
  // does per pixel. The near-plane corners travel fastest of anything that can
  // be drawn, so this is a conservative bound: it over-estimates, and the only
  // thing it decides is whether to skip, so over-estimating errs toward doing
  // the work. Zero of it, and the frame is handed on untouched.
  const PROBES = [];
  for (const z of [-1, 1]) for (const y of [-1, 1]) for (const x of [-1, 1]) PROBES.push([x, y, z]);
  PROBES.push([0, 0, -1], [0, 0, 1]);

  const curVP = new THREE.Matrix4(), prevVP = new THREE.Matrix4(), invVP = new THREE.Matrix4();
  const _v = new THREE.Vector4();
  const _cp = new THREE.Vector3(), _cf = new THREE.Vector3();
  let hasPrev = false, lastPx = 0, subjPx = 0, ran = false;

  // AND HOW MUCH THE SUBJECT IS MOVING, which is the number that decided the
  // saturation constant and the only one that answers "is the plant legible".
  // A point at distance d straight ahead lands at ndc (0,0) by construction, so
  // its previous ndc IS its travel. Read at focusDist — what the bee is
  // attending to — this is the streak on the thing being looked at, which the
  // frustum bound above deliberately is not: that one is dominated by the near
  // plane at 5 cm, where nothing in this scene is ever drawn.
  //
  // ⚠ It reads the SCREEN CENTRE, so a dart flown straight at its own gaze
  // target reports 0 and means it: a camera translating along its optical axis
  // produces radial blur, and the centre of a radial field is the one point that
  // does not move. Zero here is a statement about that pixel, not about the pass
  // — which is why the probe returns `ran` separately.
  function streakAtPx(d) {
    cam.getWorldPosition(_cp); cam.getWorldDirection(_cf);
    _v.set(_cp.x + _cf.x * d, _cp.y + _cf.y * d, _cp.z + _cf.z * d, 1).applyMatrix4(prevVP);
    if (_v.w <= 1e-6) return Infinity;
    return Math.hypot((_v.x / _v.w) * 0.5 * fullW, (_v.y / _v.w) * 0.5 * fullH) * SHUTTER;
  }
  const soft = (L) => (L > 1e-6 ? SATURATE * fullH * (1 - Math.exp(-L / (SATURATE * fullH))) : 0);

  function maxStreakPx() {
    let m = 0;
    for (let i = 0; i < PROBES.length; i++) {
      const [x, y, z] = PROBES[i];
      _v.set(x, y, z, 1).applyMatrix4(invVP);
      if (Math.abs(_v.w) < 1e-9) return Infinity;
      _v.set(_v.x / _v.w, _v.y / _v.w, _v.z / _v.w, 1).applyMatrix4(prevVP);
      if (_v.w <= 1e-6) return Infinity;        // was behind the previous camera
      const dx = (_v.x / _v.w - x) * 0.5 * fullW * SHUTTER;
      const dy = (_v.y / _v.w - y) * 0.5 * fullH * SHUTTER;
      const l = Math.hypot(dx, dy);
      if (l > m) m = l;
    }
    return m;
  }

  addPrePass({
    priority: 2,
    render(inputTex) {
      // both of these are this frame's: the scene pass just ran, and three
      // refreshed matrixWorldInverse inside it. See the ordering note above.
      curVP.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      invVP.copy(curVP).invert();

      // first frame of the session has no previous view to travel from. Zero
      // velocity rather than a guessed one — a guess here is one frame of the
      // whole image smeared, at the exact moment someone is looking at it.
      lastPx = hasPrev ? maxStreakPx() : 0;
      subjPx = hasPrev ? streakAtPx(Math.max(0.15, ctx.focusDist())) : 0;
      ran = lastPx >= MIN_PX;
      if (ran) {
        mat.uniforms.tColor.value = inputTex;
        mat.uniforms.tDepth.value = rtScene.depthTexture;
        mat.uniforms.uInvVP.value.copy(invVP);
        mat.uniforms.uPrevVP.value.copy(prevVP);   // read BEFORE prevVP is advanced
      }
      // advance the history only once the uniform above has taken its copy —
      // overwriting prevVP first is a one-line way to blur against the current
      // frame, i.e. against nothing, and it looks exactly like a working pass
      // that the camera happens never to move in
      prevVP.copy(curVP);
      hasPrev = true;
      if (!ran) return inputTex;
      fsPass(mat, rtOut);
      return rtOut.texture;
    },
    setSize(w, h) {
      fullW = w; fullH = h;
      rtOut.setSize(Math.max(1, w), Math.max(1, h));
      mat.uniforms.uRes.value.set(w, h);
      mat.uniforms.uSatPx.value = SATURATE * h;
    },
  });

  // A pass that skipped and a pass that ran are the SAME PICTURE whenever the
  // camera is still, which is the one thing a screenshot cannot distinguish
  // from a pass that failed to install. main.js publishes probes like this for
  // the same reason (__gazeErr, __camQ); a harness reads it, nothing else does.
  // `subject` is the streak on what the camera is attending to, before and
  // after saturation — the pair the look constant was chosen against.
  window.__mblur = () => ({
    ran, taps: TAPS, shutter: SHUTTER, satPx: SATURATE * fullH,
    bound: lastPx,                                   // frustum worst case, unsaturated
    subject: [subjPx, soft(subjPx)],                 // at focusDist, raw -> drawn
  });

  console.log(`fx/mblur: reprojection blur, ${TAPS} taps, ${SHUTTER * 360}° shutter, `
    + `saturating at ${(SATURATE * 100).toFixed(1)}% of frame height (${(SATURATE * fullH).toFixed(1)}px here)`);
};
