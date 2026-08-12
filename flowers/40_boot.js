// Boot: grow a real specimen with the shipped factory, at the solver's own
// clock, and keep the camera on the flowers.
//
// ?species=Ember%20Creeper  ?seed=21  ?speed=2  ?ff=900
//
// `ff` fast-forwards in chunks before settling into real time — for arriving
// at bloom in a screenshot harness. Growth is deterministic from (species,
// seed, steps), so a fast-forwarded plant IS the plant you'd have watched.
//
// ?garden=N (2..12) grows a whole flowering FIELD: N specimens planned by
// flGardenPlan (35_garden.js) — species dealt without replacement, a jittered
// ring with minimum spacing, germination staggered — all in ONE wind, each
// with its own FlowerBuffers, recaptured only when it changed. Specimen 0 is
// the hero: ?focus=flower, the sight-line cull, the bullseye and the pollen
// all stay pointed at it. Without ?garden the page is the single-specimen
// piece exactly (held to byte identity by the formref harness + parity).

function flBoot() {
  const q = new URLSearchParams(location.search);
  const name = q.get('species') || 'Ember Creeper';
  const seed = +(q.get('seed') || 21);
  let speed = +(q.get('speed') || 1);
  let ff = Math.max(0, +(q.get('ff') || 0));
  // ?garden=N, clamped to 2..12. Absent (or unparseable) means the
  // single-specimen page, bit for bit.
  const gN = Math.round(+(q.get('garden')));
  const gardenN = q.get('garden') !== null && isFinite(gN) ? Math.max(2, Math.min(12, gN)) : 0;

  // THE PLAN comes first in garden mode, because entry 0 decides the hero's
  // species when the URL didn't: the deck deals without replacement and the
  // hero's card counts against the first deal.
  const plan = gardenN
    ? flGardenPlan(seed, gardenN, {
        radius: q.get('radius') !== null ? +q.get('radius') : undefined,
        heroName: q.get('species') !== null ? name : null,
      })
    : null;

  const env = flEnv();
  // THE BLADE MESH GETS A DISTANCE TERM (28_lod.js). A cap, never a raise: the
  // shipped answer, then "never finer than the raster". Installed once, on the
  // one env every specimen is drawn through.
  env.bladeMesh = flBladeMeshLOD;
  // ?lod=0 is the pre-LOD renderer, exactly (`app.veinLOD = false`'s argument):
  // a negative result you cannot re-measure is just a story, and a before/after
  // pair has to be shootable from ONE build at one seed and one step.
  const lodOff = q.get('lod') === '0';
  // ?batch=0 is the pre-batching step pool: one step to every specimen every
  // frame, so every specimen recaptures every frame. Same argument as ?lod=0 —
  // a before/after has to be shootable from one build.
  const batchOff = q.get('batch') === '0';
  const S = App.prototype.makeSpecimen.call(env, gardenN ? plan[0].name : name, seed);
  // Flowers are the subject and floral organs never senesce, but the canopy
  // under them does; hold it unless asked to watch the whole arc. NOTE
  // plant.sp, not S.sp — Plant copies its options at construction (PITFALLS).
  // ?hold=none applies to every specimen in the field.
  if (q.get('hold') !== 'none') S.plant.sp.senesceHold = true;
  // HOMEOTIC FORM — flApplyForm (35_garden.js) carries what used to be inline
  // here, verbatim: `?form=` pins it, a bare open rotates the default per
  // seed, and in a garden every member rotates off its OWN seed, so a default
  // field shows every body plan. 'wild' stays URL-only — the control, not a
  // card in the deck. (Order puts the default seed, 21, on the columbine.)
  const form = flApplyForm(S, gardenN ? plan[0].name : name, seed, q);

  // ONE AIR over the whole clearing (70_app.js makeSpecimen's own argument):
  // the hero's field is THE field, handed to every later specimen.
  const wind = S.plant.wind;

  // The garden: specs[0] is the hero. Members are constructed LAZILY, at most
  // one per frame as the world clock reaches their startAt — a Plant costs
  // ~70ms to construct (every Axis settles its meristem 220 steps), and seven
  // back to back was plantGarden's measured 501ms hitch.
  const specs = [{ S, B: new FlowerBuffers(), plan: plan ? plan[0] : null,
    startAt: 0, age: 0, stepped: 0, form, _drawn: false }];
  if (plan) {
    for (let i = 1; i < plan.length; i++) {
      specs.push({ S: null, B: null, plan: plan[i], startAt: plan[i].startAt,
        age: 0, stepped: 0, form: null, _drawn: false });
    }
  }
  const B = specs[0].B;   // the hero's buffers — bestFlower, the cull, tools

  const scene = new FlowerScene(document.getElementById('stage'), S.pal);
  // The bullseye threshold: one number per specimen, drawn from the published
  // trimodal distribution (Todesco 2022 [D]: 0.33 / 0.59 / 0.78, sd ~0.16 —
  // we jitter by a modest fraction of that). Same PRNG discipline as the
  // fruit's chemistry: a derived stream off the specimen seed.
  // LIMITATION (garden): uBull and the spots atlas are scene-wide and stay
  // the HERO's — every member's petals sample the hero's bullseye threshold
  // and the hero's baked spot rows. Whisper-level pigment, wrong per species;
  // a per-specimen uniform + a wider atlas is the fix when it earns a look.
  {
    const r = mulberry32((seed ^ 0xb0117e) >>> 0);
    const modes = [0.33, 0.59, 0.78];
    scene.petMat.uniforms.uBull.value = modes[Math.floor(r() * 3)] + (r() - 0.5) * 0.10;
  }
  const hud = document.getElementById('hud');
  const hint = document.getElementById('hint');
  hint.textContent = 'drag to orbit · wheel to dolly\n?species= ?seed= ?speed= ?ff= ?form=abc|columbine|daisy|double|wild ?zygo= ?renew= ?homeo= ?disc= ?aniso= ?garden=2..12 ?radius=';
  // The form rail. A form is decided at founding — every organ's identity is
  // read off sp the step it is founded — so switching means regrowing, and
  // the honest way to regrow deterministically is a reload with the form in
  // the URL, same as everything else on this page.
  {
    const rail = document.getElementById('forms');
    for (const f of FL_FORMS) {
      const b = document.createElement('button');
      b.textContent = f;
      if (f === form && !gardenN) b.classList.add('on');
      b.onclick = () => {
        const p = new URLSearchParams(location.search);
        p.set('form', f);
        location.search = p.toString();
      };
      rail.appendChild(b);
    }
    // the garden is a reload too — a field is grown, not toggled
    const g = document.createElement('button');
    g.textContent = gardenN ? 'solo' : 'garden';
    if (gardenN) g.classList.add('on');
    g.onclick = () => {
      const p = new URLSearchParams(location.search);
      if (gardenN) p.delete('garden'); else { p.set('garden', '7'); p.delete('form'); }
      location.search = p.toString();
    };
    rail.appendChild(g);
  }

  // The air carries pollen once the anther-analogs mature (18_pollen.js);
  // grains sample the same wind field the stem bends in. Hero-only for now —
  // the population, like the close-up, follows the subject.
  const pollen = new FlPollen(seed, S.pal.keyCol);

  let step = 0, acc = 0, last = performance.now();
  let fpsA = 0, capMs = 0, rrCursor = 0, heroHadCull = false;
  let stepN = 0, capN = 0;   // plants stepped / recaptured this frame, for the HUD
  // console access, and the screenshot harness's window into the piece
  window.__fl = { S, env, scene, B, garden: specs, plan,
    // stepN/capN are how many specimens the step pool paid and how many were
    // rebuilt this frame — the batching's own numbers, so a harness can read
    // the thing that is being traded rather than infer it from fps
    state: () => ({ step, radius, capMs, stepN, capN,
      target: target.toArray(), dist: scene.camera.position.distanceTo(target) }) };

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
        // A SPURRED FLOWER IS PHOTOGRAPHED IN THREE-QUARTER: its subject is
        // depth — the tubes running back behind the corolla — and the face-on
        // shot that flatters a radial disc hides them completely (measured:
        // every face-on frame of the columbine read as a mallow). Swing the
        // eye toward the flower's horizontal profile, keeping the trunk-away
        // bias so the swing lands on the open side.
        if (S.sp.whorlBands && S.sp.whorlBands.spur) {
          const p = new THREE.Vector3(-d.z, 0, d.x);
          if (p.lengthSq() > 1e-6) {
            p.normalize();
            d.multiplyScalar(0.55).addScaledVector(p, 0.85).normalize();
          }
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
    if (gardenN) {
      // THE FIELD: the bound of every specimen that exists, the same lerp and
      // dolly law as the solo wide shot. Phase-1 deliberately — a proper
      // garden director (walking the field, visiting flowers) comes later.
      let n = 0, x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
      for (const s of specs) {
        if (!s.S) continue;
        for (const ax of s.S.plant.axes) for (const p of ax.pts) {
          if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
          if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
          if (p[2] < z0) z0 = p[2]; if (p[2] > z1) z1 = p[2];
          n++;
        }
      }
      if (n) {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
        const r = Math.max(2, Math.hypot(x1 - cx, y1 - cy, z1 - cz));
        target.lerp(new THREE.Vector3(cx, Math.max(1.2, cy), cz), 0.02);
        radius += (Math.max(5, r * 1.15) - radius) * 0.02;
      }
      scene.controls.target.copy(target);
      scene.fogU.uFogNear.value = Math.max(0, scene.camera.position.distanceTo(target) - radius * 1.1);
      const eye = scene.camera.position;
      const d = eye.distanceTo(target);
      const want = radius * 2.35;
      if (Math.abs(d - want) > 0.01) {
        eye.sub(target).multiplyScalar(1 + (want / Math.max(1e-3, d) - 1) * 0.02).add(target);
      }
      return;
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

  // the sight-line clearance, sized off the subject flower's DRAWN bounds
  // FROM THE LAST FRAME (they must be read before reset() empties the
  // streams; one frame stale is invisible) and opened only as the camera
  // arrives (the shipped ramp — engaging at full width from the wide shot
  // made half the plant vanish in one frame). Hero-only: garden members are
  // captured cull-less, so a close-up through a crowded field may still catch
  // a NEIGHBOUR's blade across the frame — noted, phase 2's problem.
  function heroCull() {
    if (framedAx < 0) return null;
    const e = scene.camera.position;
    const bb = B.floralBounds(framedAx);
    if (!bb) return null;
    let rad = Math.max(S.sp.fruitScale * 2.2, bb.r * 1.25);
    const dx0 = bb.c[0] - e.x, dy0 = bb.c[1] - e.y, dz0 = bb.c[2] - e.z;
    const de = Math.hypot(dx0, dy0, dz0) || 1;
    const near = smoothstep(0.20, 0.38, 2 * rad / de);
    if (near < 0.01) return null;
    rad *= near;
    return { keep: S.plant.axes[framedAx], rad, dist: de, r: de - rad,
      dx: dx0 / de, dy: dy0 / de, dz: dz0 / de };
  }

  // Recapture every specimen whose streams are stale, then upload the lot as
  // one concatenation. A specimen that did not step keeps last frame's
  // streams — the ribbons face the eye in the vertex shader, so they are
  // valid from any camera; only the PIXEL width floor and the meristem's
  // detail ramp go stale, which a stepping plant refreshes anyway.
  function captureDirty(dirty) {
    const t0 = performance.now();
    const e = scene.camera.position;
    env.cam.eye[0] = e.x; env.cam.eye[1] = e.y; env.cam.eye[2] = e.z;
    env.cam.dist = e.distanceTo(target);
    // width floor as shipped, LOD off: every vein the chemistry grew.
    setView(env.cam.eye, 0.004, 0);
    // THE RASTER, for 28_lod.js's never-finer-than-a-pixel cap on the blade
    // mesh. Set beside setView because it is the same kind of statement — where
    // the eye is and what it can resolve — and read per specimen below.
    flSetRaster(env.cam.eye, lodOff ? 0 : scene.rasterH(), scene.fovRad());
    const cull = heroCull();
    heroHadCull = cull !== null;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      if (!s.S || !dirty[i]) continue;
      env.t = s.age;
      // one near-face distance per specimen (28_lod.js): the subject is large
      // on screen, so the cap lands above the leaf's lattice for anything a
      // close-up is actually looking at — no hero exemption, and the 3.4% of
      // the petal stream it does take at the close-up is stamens and carpels,
      // which the microscope draws at full lattice however small they are
      env._flD = flSpecimenDist(s.S);
      s.B.reset();
      flDrawSpecimen(env, s.B, s.S, i === 0 ? cull : null);
      s._drawn = true;
    }
    scene.uploadMany(specs.filter(s => s.S).map(s => s.B));
    capMs = capMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  function countPetals(P) {
    let p = 0, fl = 0;
    for (const ax of P.axes) {
      if (ax.floral) fl++;
      for (const org of ax.organs) if (org.petal) p++;
    }
    return { p, fl };
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fpsA = fpsA * 0.95 + (1 / Math.max(1e-3, dt)) * 0.05;

    for (const s of specs) s.stepped = 0;
    // Plant at most ONE pending member per frame, and hold the world clock
    // while doing so: construction is the sharp cost (plantGarden's lesson),
    // and pausing one world step keeps every specimen exactly at
    // age == world - startAt, so nobody accrues silent debt.
    let planting = false;
    if (gardenN) {
      for (const s of specs) {
        if (s.S || s.startAt > step) continue;
        const p = s.plan;
        const M = App.prototype.makeSpecimen.call(env, p.name, p.seed, p.origin, wind);
        if (q.get('hold') !== 'none') M.plant.sp.senesceHold = true;
        s.form = flApplyForm(M, p.name, p.seed, q);
        s.S = M; s.B = new FlowerBuffers();
        planting = true;
        break;
      }
    }

    // THE WORLD CLOCK, gated by the step pool. The pool is total plant.step()
    // calls the frame may spend (FL_STEP_BUDGET, 35_garden.js); the world only
    // advances as many steps as every active specimen can be paid for, so a
    // heavy field slows garden time instead of killing fps — and a solo page
    // (1 active, pool 8 >= the 6-step frame cap) never feels it.
    if (!planting) {
      let nAct = 0;
      for (const s of specs) if (s.S && s.startAt <= step) nAct++;
      const pool = ff > 0 ? FL_STEP_BUDGET_FF : Math.max(FL_STEP_BUDGET, nAct);
      const afford = Math.max(1, Math.floor(pool / Math.max(1, nAct)));
      let n;
      if (ff > 0) {
        n = Math.min(ff, 40, afford);
        ff -= n;
      } else {
        acc += dt * 125 * speed;
        n = Math.min(6, Math.floor(acc), afford);
        acc -= n;
      }
      step += n;
      // PAY IN BATCHES, NOT IN SLICES — the same steps, spent on fewer plants.
      //
      // The pool used to be spent breadth-first: one step to every specimen,
      // sweep after sweep. Every specimen therefore STEPPED every frame, and a
      // specimen that stepped is recaptured — so the frame paid the whole
      // field's geometry rebuild (7 x ~11 ms, measured) to advance garden time
      // by one step. Depth-first spends exactly the same budget and settles at
      // the same average rate per plant, but concentrates it: each specimen is
      // paid its WHOLE accrued debt when its turn comes, and is not touched at
      // all in between. Roughly `pool / debtPerFrame` specimens are recaptured
      // per frame instead of all of them.
      //
      // The thing this is allowed to cost is temporal resolution, so the bound
      // is Nyquist against the motion — the same argument tools/blender_seq.mjs
      // makes about its stride. A specimen jumps at most `pool` steps (8) =
      // 64 ms of plant time between draws, against the wind's fastest gust at
      // 1.78 Hz (562 ms) and the stem's own mode at 0.56-0.64 Hz. At 30 fps a
      // field of seven redraws each member ~11 times a second, three times the
      // 3.6 Hz floor that judders.
      //
      // The HERO is exempt and always paid first: it is the subject, the
      // close-up and the pollen's plant, and it is the one specimen whose
      // motion is being looked at.
      //
      // WHAT IT COSTS, measured and not waved away (tools/flowers_perf.mjs,
      // 60s of live growth, isolated with ?batch=0): median gap 50.0 -> 34.9ms,
      // and p99 83.4 -> 108.4ms. It trades the TAIL for the median, because a
      // frame that pays three plants their whole debt is heavier than one that
      // pays a step to seven, and the plants are wildly unequal (a Sun Coral
      // capture is 20ms, a Spiral Ossuary 1.4ms). Bounded by the pool. Read
      // that before writing a hitch gate for this page.
      //
      // HOW MANY PLANTS MAY MOVE THIS FRAME. Debt only builds if something
      // refuses to pay it, and the refusal is where the frame is bought — so
      // this is the actual knob, and it is set by Nyquist rather than by taste:
      // every specimen must be redrawn at least FL_RECAP_HZ (35_garden.js: four
      // samples per period of the wind's fastest gust, which is 15_petal.js's
      // ripple guard applied to time). A specimen is redrawn `fps * m / nAct`
      // times a second, so m = nAct * FL_RECAP_HZ / fps.
      //
      // It is a feedback loop and it settles: capping m raises fps, which
      // lowers the m the law asks for, until the field is redrawing at exactly
      // the rate the air needs. fpsA is a 20-frame EMA, which is the damping.
      // During ?ff= there is no cap — a fast-forward is a harness affordance
      // and must arrive at the state it claims.
      const mCap = (ff > 0 || batchOff) ? specs.length
        : Math.max(1, Math.min(specs.length,
          Math.ceil(nAct * FL_RECAP_HZ / Math.max(6, fpsA))));
      let left = pool, drawnN = 0;
      const nSpec = specs.length;
      for (let k = 0; k < nSpec && left > 0 && (k === 0 || drawnN < mCap); k++) {
        // 0 first, then the members from a persistent cursor
        const s = specs[k === 0 ? 0 : 1 + ((rrCursor + k - 1) % Math.max(1, nSpec - 1))];
        if (!s.S) continue;
        const debt = (step - s.startAt) - s.age;
        if (debt <= 0) continue;
        const pay = Math.min(debt, left);
        for (let j = 0; j < pay; j++) s.S.plant.step(1);
        s.age += pay; s.stepped = pay; left -= pay; drawnN++;
      }
      stepN = drawnN;
      // advance the cursor over the MEMBERS only (the hero is not in the
      // rotation), so a field of n rotates through n-1 members
      rrCursor = nSpec > 1 ? (rrCursor + 1) % (nSpec - 1) : 0;
    }
    env.t = specs[0].age;

    // recapture on camera motion too, not just sim steps: the sight-line
    // clearance is computed at capture time from the capture eye, so a frozen
    // plant with a moving camera (speed=0, or orbiting) kept the clearance —
    // and the whole cull — from wherever the camera was steps ago. In garden
    // mode camera motion only redraws the HERO, and only while a cull is (or
    // just was) engaged — the members' streams are camera-valid as captured.
    const _e = scene.camera.position;
    const camMoved = Math.hypot(_e.x - env.cam.eye[0], _e.y - env.cam.eye[1],
      _e.z - env.cam.eye[2]) > 0.02;
    const dirty = [];
    let anyDirty = false;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      let d = !!s.S && (s.stepped > 0 || !s._drawn);
      if (i === 0 && camMoved && (!gardenN || framedAx >= 0 || heroHadCull)) d = !!s.S;
      dirty[i] = d;
      if (d) anyDirty = true;
    }
    capN = dirty.reduce((a2, d) => a2 + (d ? 1 : 0), 0);
    if (anyDirty) captureDirty(dirty);
    if (specs[0].stepped > 0) pollen.step(S, specs[0].stepped, specs[0].age);
    scene.uploadPollen(pollen.buf, pollen.n * 7);
    // spot fields bake lazily in the draw loop; ship each to the GPU once.
    // HERO's library only: the 3-row atlas is scene-wide (see uBull note).
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
    // THE GROUND EXISTS NOW (25_ground.js), and the framing laws predate it:
    // on a tall specimen the wide shot happily walked the eye to y = -16 and
    // shot up through the floor — invisible against a void, a screen-filling
    // ceiling of soil once there is one (measured: the first frame after the
    // ground landed). A photographer with a real floor kneels at it instead
    // of phasing through it, so the eye is held just above the plane; the
    // orbit and the easing both pass through here every frame.
    if (scene.camera.position.y < 0.5) scene.camera.position.y = 0.5;
    scene.render(now);

    const c = countPetals(S.plant);
    let text =
      `${name}  seed ${seed}\n` +
      `${S.plant.stage()}  step ${step}${ff > 0 ? '  (fast-forward ' + ff + ')' : ''}\n` +
      `${c.fl} floral axes · ${c.p} petals · ${pollen.n} grains · ${Math.round(fpsA)} fps`;
    if (gardenN) {
      let germ = 0, flow = 0, tp = 0;
      for (const s of specs) {
        if (!s.S) continue;
        germ++;
        const cc = countPetals(s.S.plant);
        if (cc.fl > 0) flow++;
        tp += cc.p;
      }
      text = `${S.name}  garden of ${specs.length}  seed ${seed}\n` +
        `${germ} germinated · ${flow} flowering · ${tp} petals\n` +
        `step ${step}${ff > 0 ? '  (fast-forward ' + ff + ')' : ''} · capture ${capMs.toFixed(1)}ms ` +
        `(${capN}/${specs.length}) · ${Math.round(fpsA)} fps`;
    }
    hud.textContent = text;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

flBoot();
