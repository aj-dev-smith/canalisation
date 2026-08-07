// Boot: grow a real specimen with the shipped factory, at the solver's own
// clock, and keep the camera on the flowers.
//
// ?species=Ember%20Creeper  ?seed=21  ?speed=2  ?ff=900
//
// `ff` fast-forwards in chunks before settling into real time — for arriving
// at bloom in a screenshot harness. Growth is deterministic from (species,
// seed, steps), so a fast-forwarded plant IS the plant you'd have watched.

function flBoot() {
  const q = new URLSearchParams(location.search);
  const name = q.get('species') || 'Ember Creeper';
  const seed = +(q.get('seed') || 21);
  let speed = +(q.get('speed') || 1);
  let ff = Math.max(0, +(q.get('ff') || 0));

  const env = flEnv();
  const S = App.prototype.makeSpecimen.call(env, name, seed);
  // Flowers are the subject and floral organs never senesce, but the canopy
  // under them does; hold it unless asked to watch the whole arc. NOTE
  // plant.sp, not S.sp — Plant copies its options at construction (PITFALLS).
  if (q.get('hold') !== 'none') S.plant.sp.senesceHold = true;
  const B = new FlowerBuffers();
  const scene = new FlowerScene(document.getElementById('stage'), S.pal);
  // The bullseye threshold: one number per specimen, drawn from the published
  // trimodal distribution (Todesco 2022 [D]: 0.33 / 0.59 / 0.78, sd ~0.16 —
  // we jitter by a modest fraction of that). Same PRNG discipline as the
  // fruit's chemistry: a derived stream off the specimen seed.
  {
    const r = mulberry32((seed ^ 0xb0117e) >>> 0);
    const modes = [0.33, 0.59, 0.78];
    scene.petMat.uniforms.uBull.value = modes[Math.floor(r() * 3)] + (r() - 0.5) * 0.10;
  }
  const hud = document.getElementById('hud');
  const hint = document.getElementById('hint');
  hint.textContent = 'drag to orbit · wheel to dolly\n?species= ?seed= ?speed= ?ff=';

  let step = 0, acc = 0, last = performance.now();
  let fpsA = 0;
  // console access, and the screenshot harness's window into the piece
  window.__fl = { S, env, scene, B, state: () => ({ step, radius, target: target.toArray(), dist: scene.camera.position.distanceTo(target) }) };

  // Frame the flowers once there are flowers; the whole plant until then.
  // Petal REACH, not axis length — a flower framed from `ax.length` reads as
  // a speck (JOURNAL 2026-07-2x, and 70_app.js:1324 is the shipped fix).
  // ?focus=flower tightens onto the single best flower (most petals).
  const focus = q.get('focus') || 'plant';
  const target = new THREE.Vector3(0, 2, 0);
  let radius = 6;
  // The best close-up subject is the most COMPACT flower, not the most
  // petalled one: the terminal flower's organs ride the whole curling apex,
  // so its bound is a third of the plant and "focus" degenerates to a wide
  // shot. Score petals against drawn reach.
  function bestFlower() {
    let best = -1, bestScore = 0;
    for (let ai = 0; ai < S.plant.axes.length; ai++) {
      const ax = S.plant.axes[ai];
      if (!ax.floral) continue;
      let n = 0;
      for (const org of ax.organs) if (org.petal && org.len > 0.05) n++;
      if (n < 3) continue;
      const bb = B.floralBounds(ai);
      if (!bb) continue;
      const score = n / (0.6 + bb.r);
      if (score > bestScore) { bestScore = score; best = ai; }
    }
    return best;
  }
  // Frame from the DRAWN reach — the bound of what the capture actually put in
  // the petal stream for this axis. Two hand-derived versions of this framed
  // from organ bases and organ lengths, and both put the camera inside the
  // corolla: a petal rides a petiole and is as wide as it is long, so nothing
  // short of the geometry knows where the flower ends.
  function frameAxisFlower(ai) {
    const bb = B.floralBounds(ai);
    if (!bb) return false;
    target.lerp(new THREE.Vector3(bb.c[0], bb.c[1], bb.c[2]), 0.03);
    // r * 1.8 with the 2.35 dolly law puts the corolla at ~55% of frame height
    radius += (Math.max(1.0, bb.r * 1.8) - radius) * 0.03;
    return true;
  }
  function updateFraming() {
    if (focus === 'flower') {
      const ax = bestFlower();
      if (ax && frameAxisFlower(ax)) {
        scene.controls.target.copy(target);
        scene.fogU.uFogNear.value = Math.max(0, scene.camera.position.distanceTo(target) - radius * 1.1);
        const eye = scene.camera.position;
        const d = eye.distanceTo(target);
        const want = radius * 2.35;
        if (Math.abs(d - want) > 0.01) {
          eye.sub(target).multiplyScalar(1 + (want / Math.max(1e-3, d) - 1) * 0.03).add(target);
        }
        return;
      }
    }
    let n = 0, cx = 0, cy = 0, cz = 0, r = 0;
    for (const ax of S.plant.axes) {
      if (!ax.floral) continue;
      for (const org of ax.organs) {
        if (!org.floral || org.len < 0.05 || !org.frame) continue;
        const o = org.frame.o;
        cx += o[0]; cy += o[1]; cz += o[2]; n++;
      }
    }
    if (n >= 3) {
      cx /= n; cy /= n; cz /= n;
      for (const ax of S.plant.axes) {
        if (!ax.floral) continue;
        for (const org of ax.organs) {
          if (!org.floral || org.len < 0.05 || !org.frame) continue;
          const o = org.frame.o;
          r = Math.max(r, Math.hypot(o[0] - cx, o[1] - cy, o[2] - cz) + org.len);
        }
      }
      target.lerp(new THREE.Vector3(cx, cy, cz), 0.02);
      radius += (Math.max(1.6, r * 2.1) - radius) * 0.02;
    } else {
      // vegetative: frame the shoot
      let ymax = 0.5;
      for (const ax of S.plant.axes) for (const p of ax.pts) ymax = Math.max(ymax, p[1]);
      target.lerp(new THREE.Vector3(0, ymax * 0.62, 0), 0.02);
      radius += (Math.max(4, ymax * 1.35) - radius) * 0.02;
    }
    scene.controls.target.copy(target);
    scene.fogU.uFogNear.value = Math.max(0, scene.camera.position.distanceTo(target) - radius * 1.1);
    const eye = scene.camera.position;
    const d = eye.distanceTo(target);
    const want = radius * 2.35;
    if (Math.abs(d - want) > 0.01) {
      eye.sub(target).multiplyScalar(1 + (want / Math.max(1e-3, d) - 1) * 0.02).add(target);
    }
  }

  function capture() {
    const e = scene.camera.position;
    env.cam.eye[0] = e.x; env.cam.eye[1] = e.y; env.cam.eye[2] = e.z;
    env.cam.dist = e.distanceTo(target);
    // width floor as shipped, LOD off: every vein the chemistry grew.
    setView(env.cam.eye, 0.004, 0);
    B.reset();
    flDrawSpecimen(env, B, S);
    scene.upload(B);
  }

  function countPetals() {
    let p = 0, fl = 0;
    for (const ax of S.plant.axes) {
      if (ax.floral) fl++;
      for (const org of ax.organs) if (org.petal) p++;
    }
    return { p, fl };
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fpsA = fpsA * 0.95 + (1 / Math.max(1e-3, dt)) * 0.05;

    let stepped = 0;
    if (ff > 0) {
      const n = Math.min(ff, 40);
      for (let i = 0; i < n; i++) S.plant.step(1);
      step += n; ff -= n; stepped = n;
    } else {
      acc += dt * 125 * speed;
      const n = Math.min(6, Math.floor(acc));
      acc -= n;
      for (let i = 0; i < n; i++) S.plant.step(1);
      step += n; stepped = n;
    }
    env.t = step;

    if (stepped > 0 || !frame.drawn) { capture(); frame.drawn = true; }
    // spot fields bake lazily in the draw loop; ship each to the GPU once
    const plib = S.plant.leaves.plib || [];
    for (let li = 0; li < plib.length; li++) {
      const L = plib[li];
      if (L._flSpots && !L._flSpotsUp) { scene.setSpots(li, L._flSpots); L._flSpotsUp = true; }
    }
    updateFraming();
    scene.render(now);

    const c = countPetals();
    hud.textContent =
      `${name}  seed ${seed}\n` +
      `${S.plant.stage()}  step ${step}${ff > 0 ? '  (fast-forward ' + ff + ')' : ''}\n` +
      `${c.fl} floral axes · ${c.p} petals · ${Math.round(fpsA)} fps`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

flBoot();
