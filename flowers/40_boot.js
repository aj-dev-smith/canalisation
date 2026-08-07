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
  // HOMEOTIC FORM. `?form=double` is the ABC model's B-class expansion
  // (Meyerowitz [D]): a real doubled rose, peony or camellia is a homeotic
  // conversion — organs that would have been stamens founded as petals. Here
  // that is ONE threshold moved on the floral identity field q the engine
  // already computes: org.petal = q < petalQ (40_plant.js:611), so raising
  // petalQ converts the stamen-analog whorls and EVERYTHING else falls out —
  // petal library, petal length, petal tilt, and the q-lagged bloom, so the
  // converted inner whorls stay cupped while the outer ones recurve. Nested,
  // graded, never drawn. `?homeo=` moves the threshold (default 0.62; the
  // engine's q tops out at 0.94, so 0.9+ is a fully sterile double, which is
  // what real double cultivars are). Set before any step runs, so every organ
  // is FOUNDED under the new identity, and on both copies of sp (the plant
  // holds its own — PITFALLS).
  // Both halves of the C-class mutant: B-expansion converts the stamen band
  // (petalQ up), and lost determinacy keeps the meristem founding (apexRenew —
  // the WUS shutoff failing, see consumeApex()). floralOrgans is the ceiling
  // over the physical spend and has to rise with it, same shape as budTake
  // needing the organ pool raised with it (TUNING's ladder).
  // Measured (Ember Creeper, seed 21, step 3200): wild 6 petals/flower;
  // B alone ~8; B + renewal 0.6 -> 14, 0.8 -> 23 — peony-grade — and C alone
  // gives 11 with petalQ untouched, which is the pure ag phenotype. Fruit
  // still sets in every case; the apex spends through floralGrace.
  // The double ships as the DEFAULT form — the piece is titled flowers, and a
  // 20-petal graded corolla is the strongest image it makes. `?form=wild` is
  // the shipped configuration, untouched.
  // `?form=abc` — now the DEFAULT — is the FULL ABC model: whorlBands cuts q
  // into sepal / petal / stamen / carpel (sharp boundaries — AP3/AG mutual
  // antagonism), so a flower is a green calyx, a corolla, a ring of filaments
  // carrying glowing anthers, and a central pistil, in that order, off the one
  // coordinate the meristem's self-consumption already produces. The bands are
  // set against the MEASURED q founding sequence (abc_probe: renewal 0.45 +
  // floralDome 3 spans q 0 -> 0.85 over ~13 organs), not an idealised one:
  // {0.08, 0.30, 0.65} gives S4-6 P4-6 A3-5 C0-2, which is a eudicot plan.
  // floralDome 3 is the measured size at which Ember's WORKING axillaries
  // already convert (R0/organR = 3.0); without it a terminal apex founds ten
  // organs at q ~= 0 and reads as one whorl (the Parasol's only flower is
  // terminal, so this is not optional). Compression knobs as the double's.
  const form = q.get('form') || 'abc';
  if (form === 'abc') {
    // TWO FLORAL PROGRAMS, assigned per species from the measured whorl
    // balance (scratchpad abc_sweep, 8 species x both, step 5200): program A
    // for species whose q climbs steadily; program B — smaller dome, more
    // renewal, bands shifted down — for species whose q sits at zero for
    // most foundings and then jumps (a Cathedral Fern under A is S8 P1 A0
    // C1; under B it is S3 P5 A4 C1, a real eudicot plan). Spiral Ossuary
    // founds only 3 floral organs even WILD — its flowers were always
    // inconspicuous, and no program can conjure organs its meristem does
    // not make; it takes A and does what it always did.
    const progB = new Set(['Cathedral Fern', 'Hoarfrost Thicket', 'Sulphur Rosette']);
    const P = progB.has(name)
      ? { renew: 0.75, organs: 28, dome: 2.2, bands: [0.06, 0.24, 0.60] }
      : { renew: 0.55, organs: 26, dome: 3.0, bands: [0.08, 0.38, 0.65] };
    const rn = Math.min(0.9, Math.max(0, +(q.get('renew') || P.renew)));
    const over = {
      whorlBands: {
        sepal: +(q.get('sepal') || P.bands[0]),
        stamen: +(q.get('stamen') || P.bands[1]),
        carpel: +(q.get('carpel') || P.bands[2]),
        // filament 3.0 threw the anthers clear of the flower; 1.8 holds them
        // just above the corolla (by eye, like the wind's uRef)
        filament: 1.8, style: 1.5,
      },
      apexRenew: rn, floralOrgans: P.organs, floralDome: P.dome,
      floralElong: 0.08, floralStretch: 0.08, floralNode: 0.008,
      floralGrace: 960, petalGrade: 0.35,
      // ?zygo=0.8 breaks radial symmetry the way a snapdragon does (CYC/DICH,
      // see 40_plant.js). Off by default: the radial corolla is the classical
      // flower, and the bilateral form is a variation to visit. Terminal
      // flowers stay radial either way (peloria), so the Parasol's moon shot
      // is untouched at any setting.
      zygomorphy: Math.min(1, Math.max(0, +(q.get('zygo') || 0))),
    };
    S.sp = { ...S.sp, ...over };
    Object.assign(S.plant.sp, over);
  }
  if (form === 'daisy') {
    // THE CAPITULUM — a composite head. A daisy is not a flower; it is dozens
    // of flowers on a disc, and this form is the round-3 machinery read at a
    // different scale: the SAME four whorl bands land on Asteraceae anatomy
    // exactly — sepal band = the involucre's phyllaries, petal band = the ray
    // florets, stamen band = the disc florets (which is why the disc glows
    // and sheds pollen: those organs were already anthers), carpel = centre.
    // `receptacle` (40_plant.js) un-collapses the floral dome: q RECORDS the
    // radius each organ was founded at, so the head becomes the disc the
    // meristem actually was, rim founded first, centre last. Measured
    // (daisy_probe, Ember seed 21, step 5200): renew .88 + dome 4 + cap 90
    // founds 52-53 florets per axillary head — S15 P11 A26, against a real
    // daisy's 13-21 rays — closing by the cap with a FRUIT at the disc's
    // centre, the engine's ovary where a real capitulum packs its hundred.
    // The terminal head stays small (the q-zero terminal trap, round 3);
    // bestFlower prefers the big axillaries on organ count, so the camera
    // finds the heads that work.
    const rn = Math.min(0.95, Math.max(0, +(q.get('renew') || 0.88)));
    const over = {
      whorlBands: {
        sepal: +(q.get('sepal') || 0.05),
        stamen: +(q.get('stamen') || 0.18),
        carpel: +(q.get('carpel') || 0.96),
        sepalLen: 0.16,          // phyllaries: short bracts under the rim
        petalLen: 0.45,          // a ray is a strap, half again a petal
        stamenLen: 0.10,         // a disc floret is small...
        filament: 0.9,           // ...and sits IN the disc, not above it
        style: 1.5,
      },
      receptacle: +(q.get('disc') || 1.1),
      apexRenew: rn, floralOrgans: 90, floralDome: 4.0,
      // Under `receptacle` the florets ride the TIP (40_plant.js elongate),
      // so floral elongation stops being corolla smear and becomes the
      // PEDUNCLE — the daisy bolts. .35 grows a 9-10 unit scape. And the
      // scape must not climb the trunk: at the herb's tropism .02 a 12-unit
      // peduncle ends 0.4 units from the trunk (measured), at .002 it holds
      // ~3 units clear with a gentle sun-turn, span 0.38 — a disc, held out.
      floralElong: 0.35, floralStretch: 0.08, floralNode: 0.008,
      tropism: 0.002,
      // a head founds for far longer than a eudicot flower, and dozens of
      // heads spend far past the herb's pool — both raised together
      // (TUNING's budTake ladder: anything that multiplies organs pays)
      floralGrace: 1600, organBudget: 400, maxOrgans: 140,
      petalGrade: 0, petalTilt: 1.5, zygomorphy: 0,
    };
    S.sp = { ...S.sp, ...over };
    Object.assign(S.plant.sp, over);
  }
  if (form === 'double') {
    const pq = Math.min(0.94, Math.max(0.05, +(q.get('homeo') || 0.62)));
    const rn = Math.min(0.9, Math.max(0, +(q.get('renew') || 0.7)));
    // Compression, the founding gate and the grace move TOGETHER (all three
    // measured, each alone un-doubles the flower): a compressed axis cannot
    // clear the shipped floral minInternode between foundings, so floralNode
    // drops with it — floral organs sharing a node is what a whorl is — and
    // a compressed flower's early founding cadence outruns floralGrace 320,
    // so the grace triples or the axillary flowers silently die at 9 petals.
    // Measured result: 20-23 petals per flower, spread 0.26-0.40 units
    // against 8.4-13.0 loose — a corolla, not a raceme.
    const over = { petalQ: pq, apexRenew: rn, floralOrgans: 34,
      floralElong: 0.08, floralStretch: 0.08, floralNode: 0.008,
      floralGrace: 960, petalGrade: 0.5 };
    S.sp = { ...S.sp, ...over };
    Object.assign(S.plant.sp, over);
  }
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
  hint.textContent = 'drag to orbit · wheel to dolly\n?species= ?seed= ?speed= ?ff= ?form=abc|daisy|double|wild ?zygo= ?renew= ?homeo= ?disc=';

  // The air carries pollen once the anther-analogs mature (18_pollen.js);
  // grains sample the same wind field the stem bends in.
  const pollen = new FlPollen(seed, S.pal.keyCol);

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
  let dofR;   // eased dofRange, the shipped director's law (70_app.js:1415)
  // The best close-up subject is the most COMPACT flower, not the most
  // petalled one: the terminal flower's organs ride the whole curling apex,
  // so its bound is a third of the plant and "focus" degenerates to a wide
  // shot. Score petals against drawn reach.
  // the main trunk's point nearest a height — the thing a close-up must clear
  function trunkNear(y) {
    let tp = null, bd = 1e9;
    for (const p of S.plant.axes[0].pts) {
      const d = Math.abs(p[1] - y);
      if (d < bd) { bd = d; tp = p; }
    }
    return tp;
  }
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
      // a corolla pressed against the trunk cannot be photographed — the
      // trunk above it crosses every facing shot (measured: a flower 0.36
      // units off a trunk, corolla radius 2.13, framed with the trunk through
      // its face). Prefer clearance, in units of the corolla's own radius.
      const tp = ai === 0 ? null : trunkNear(bb.c[1]);
      const clear = tp
        ? smoothstep(0.25, 1.0,
          Math.hypot(bb.c[0] - tp[0], bb.c[2] - tp[2]) / Math.max(0.3, bb.r))
        : 1;
      const score = n / (0.6 + bb.r) * (0.15 + 0.85 * clear);
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
    // A flower has a facing: down its own axis. Face-on is the shot that shows
    // a radial corolla AS a corolla, and for an axillary flower it puts the
    // trunk BEHIND the subject instead of through it (the framing used to set
    // target and dolly but never azimuth, so the camera routinely looked at a
    // flower bisected by the stem it grew from). Only while the viewer is not
    // orbiting — a drag owns the camera for a while.
    if (performance.now() - lastOrbit > 6000) {
      const ax = S.plant.axes[ai];
      // the TIP tangent, not the base-to-tip chord: a bolting peduncle curves
      // (the daisy's scape launches sideways and turns up), and the disc faces
      // where the tip points, not where the stalk came from
      const a = ax.pts[Math.max(0, ax.pts.length - 7)], b = ax.pts[ax.pts.length - 1];
      const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (d.lengthSq() > 1e-6) {
        d.normalize();
        // blend AWAY from the trunk: an axillary flower's pedicel often points
        // nearly straight up, and the pure axis shot looks down through the
        // trunk above it. Pushing the eye to the flower's open side gives the
        // three-quarter view a photographer would walk to. Tapered by the
        // flower's own measured clearance — a head already held out on a
        // peduncle (the daisy) keeps its facing; only a trunk-hugger is steered.
        if (ai !== 0) {
          const tp = trunkNear(target.y);
          const lx = target.x - tp[0], lz = target.z - tp[2];
          const ll = Math.hypot(lx, lz);
          const w = 0.9 * (1 - smoothstep(0.8, 2.5, ll));
          if (ll > 1e-4 && w > 1e-3) { d.x += w * lx / ll; d.z += w * lz / ll; d.normalize(); }
        }
        // keep some horizon: a terminal flower points straight up and a pure
        // overhead shot flattens it
        d.y = Math.min(d.y, 0.60); d.normalize();
        const eye = scene.camera.position, want = radius * 2.35;
        _desiredEye.copy(target).addScaledVector(d, want);
        eye.lerp(_desiredEye, 0.012);
      }
    }
    return true;
  }
  const _desiredEye = new THREE.Vector3();
  let lastOrbit = -1e9;
  scene.controls.addEventListener('start', () => { lastOrbit = performance.now(); });
  let framedAx = -1;   // which axis the flower shot is on; -1 = no clearance
  function updateFraming() {
    framedAx = -1;
    if (focus === 'flower') {
      // >= 0, not truthy: the best flower is often the TERMINAL one, axis 0,
      // and a truthiness test silently fell through to the wide shot
      const ax = bestFlower();
      if (ax >= 0 && frameAxisFlower(ax)) {
        framedAx = ax;
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
    // the sight-line clearance, sized off the subject flower's DRAWN bounds
    // FROM THE LAST FRAME (they must be read before reset() empties the
    // streams; one frame stale is invisible) and opened only as the camera
    // arrives (the shipped ramp — engaging at full width from the wide shot
    // made half the plant vanish in one frame)
    let cull = null;
    if (framedAx >= 0) {
      const bb = B.floralBounds(framedAx);
      if (bb) {
        let rad = Math.max(S.sp.fruitScale * 2.2, bb.r * 1.25);
        const dx0 = bb.c[0] - e.x, dy0 = bb.c[1] - e.y, dz0 = bb.c[2] - e.z;
        const de = Math.hypot(dx0, dy0, dz0) || 1;
        const near = smoothstep(0.20, 0.38, 2 * rad / de);
        if (near >= 0.01) {
          rad *= near;
          cull = { keep: S.plant.axes[framedAx], rad, dist: de, r: de - rad,
            dx: dx0 / de, dy: dy0 / de, dz: dz0 / de };
        }
      }
    }
    B.reset();
    flDrawSpecimen(env, B, S, cull);
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

    // recapture on camera motion too, not just sim steps: the sight-line
    // clearance is computed at capture time from the capture eye, so a frozen
    // plant with a moving camera (speed=0, or orbiting) kept the clearance —
    // and the whole cull — from wherever the camera was steps ago
    const _e = scene.camera.position;
    const camMoved = Math.hypot(_e.x - env.cam.eye[0], _e.y - env.cam.eye[1],
      _e.z - env.cam.eye[2]) > 0.02;
    if (stepped > 0 || camMoved || !frame.drawn) { capture(); frame.drawn = true; }
    if (stepped > 0) pollen.step(S, stepped, step);
    scene.uploadPollen(pollen.buf, pollen.n * 7);
    // spot fields bake lazily in the draw loop; ship each to the GPU once
    const plib = S.plant.leaves.plib || [];
    for (let li = 0; li < plib.length; li++) {
      const L = plib[li];
      if (L._flSpots && !L._flSpotsUp) { scene.setSpots(li, L._flSpots); L._flSpotsUp = true; }
    }
    updateFraming();
    // the lens: focus on the plane the camera is looking at, with the shipped
    // director's range law — tight in a flower close-up, the subject's own
    // scale otherwise — eased so a focus change racks rather than snaps
    const fDist = scene.camera.position.distanceTo(target);
    scene.compU.uFocus.value = fDist;
    const dofT = focus === 'flower'
      ? Math.max(0.4, fDist * 0.22)
      : Math.max(2.0, radius * 0.62);
    dofR = dofR === undefined ? dofT : dofR + (dofT - dofR) * 0.05;
    scene.compU.uRange.value = dofR;
    scene.render(now);

    const c = countPetals();
    hud.textContent =
      `${name}  seed ${seed}\n` +
      `${S.plant.stage()}  step ${step}${ff > 0 ? '  (fast-forward ' + ff + ')' : ''}\n` +
      `${c.fl} floral axes · ${c.p} petals · ${pollen.n} grains · ${Math.round(fpsA)} fps`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

flBoot();
