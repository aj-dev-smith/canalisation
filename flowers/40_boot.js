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
// with its own FlowerBuffers, recaptured only when it changed. The sight-line
// cull, the bullseye and the pollen all stay pointed at specimen 0, the hero;
// the CAMERA no longer does — ?focus=flower and the garden director both score
// every flower in the field (45_director.js). Without ?garden the page is the
// single-specimen piece exactly (held to byte identity by the formref harness
// + parity).
//
// ?shot=wide|bank|glide|dolly|close|low pins the garden director to one shot, for stills.

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

  // the plan goes in so the ATMOSPHERE can be the field's rather than the
  // hero's (flFieldPal, 25_ground.js); null keeps the solo page identical
  const scene = new FlowerScene(document.getElementById('stage'), S.pal, plan);
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
  // The gesture hint stays on the canvas; the URL-parameter catalogue does
  // not — as one white-space:pre line it was wider than the viewport and ran
  // straight through the HUD, so every still had a band of overstruck text
  // along its bottom. A person composing URLs is in the console anyway.
  hint.textContent = 'drag to orbit · wheel to dolly';
  console.info('canalisation flowers — ?species= ?seed= ?speed= ?ff= '
    + '?form=abc|columbine|daisy|double|wild ?zygo= ?renew= ?homeo= ?disc= '
    + '?aniso= ?garden=2..12 ?radius= ?shot=wide|bank|glide|dolly|close|low');
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
  // grains sample the same wind field the stem bends in. ONE population over
  // the whole FIELD — it walks `specs`, so every germinated specimen sheds,
  // where phase 2's hero-only population left six of seven flowering plants
  // shedding nothing. A mote's colour is the KEY LIGHT'S, so in a field it is
  // scene.pal's (flFieldPal's blend) and not the hero's: a grain matches the
  // air it is in. On a solo page flFieldPal returns the hero's palette
  // unchanged, so this is the same colour it always was. The plan goes in for
  // the clearing's rim alone.
  const pollen = new FlPollen(seed, scene.pal.keyCol, plan);
  // The pollen's own clock: the WORLD's, read as a delta off `step`. The air
  // is one field over the clearing and its `t` is a wall clock, not any
  // plant's age (18_pollen.js has the argument). Equal to specs[0].age on
  // every path today — the hero is exempt from the step pool and paid first
  // out of it — which is why the shipped call got the right number.
  let polStep = 0;

  let step = 0, acc = 0, last = performance.now();
  let fpsA = 0, capMs = 0, rrCursor = 0, heroHadCull = false;
  let stepN = 0, capN = 0;   // plants stepped / recaptured this frame, for the HUD
  // console access, and the screenshot harness's window into the piece
  window.__fl = { S, env, scene, B, garden: specs, plan, pollen,
    // stepN/capN are how many specimens the step pool paid and how many were
    // rebuilt this frame — the batching's own numbers, so a harness can read
    // the thing that is being traded rather than infer it from fps. The
    // director's own state (shot, elapsed, subject) rides along beside them:
    // one handle, so a harness never has to guess which half it is reading.
    state: () => ({ step, radius, capMs, stepN, capN,
      target: target.toArray(),
      dist: scene.camera.position.distanceTo(target),
      eye: scene.camera.position.toArray(),
      shot: framedShot, el: director ? director.el : 0,
      subj: director && director.subj
        ? { i: director.subj.i, ax: director.subj.ai } : null }) };

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
  // the main trunk's point nearest a height — the thing a close-up must clear.
  // Takes the plant rather than closing over the hero's: in a garden the best
  // flower may be on any specimen, and it must clear ITS OWN trunk.
  function trunkNear(y, P) {
    let tp = null, bd = 1e9;
    for (const p of P.axes[0].pts) {
      const d = Math.abs(p[1] - y);
      if (d < bd) { bd = d; tp = p; }
    }
    return tp;
  }
  // The shipped close-up score for one floral axis, lifted out of bestFlower
  // unchanged so the garden director (45_director.js) can run it over every
  // specimen instead of only the hero. Returns 0 for "not a subject".
  function flowerScore(sp, ai) {
    const ax = sp.S.plant.axes[ai];
    if (!ax.floral) return 0;
    let n = 0;
    for (const org of ax.organs) if (org.petal && org.len > 0.05) n++;
    if (n < 3) return 0;
    const bb = sp.B.floralBounds(ai);
    if (!bb) return 0;
    // a corolla pressed against the trunk cannot be photographed — the
    // trunk above it crosses every facing shot (measured: a flower 0.36
    // units off a trunk, corolla radius 2.13, framed with the trunk through
    // its face). Prefer clearance, in units of the corolla's own radius.
    const tp = ai === 0 ? null : trunkNear(bb.c[1], sp.S.plant);
    const clear = tp
      ? smoothstep(0.25, 1.0,
        Math.hypot(bb.c[0] - tp[0], bb.c[2] - tp[2]) / Math.max(0.3, bb.r))
      : 1;
    return n / (0.6 + bb.r) * (0.15 + 0.85 * clear);
  }
  function bestFlower(sp) {
    let best = -1, bestScore = 0;
    for (let ai = 0; ai < sp.S.plant.axes.length; ai++) {
      const score = flowerScore(sp, ai);
      if (score > bestScore) { bestScore = score; best = ai; }
    }
    return best;
  }
  // Frame from the DRAWN reach — the bound of what the capture actually put in
  // the petal stream for this axis. Two hand-derived versions of this framed
  // from organ bases and organ lengths, and both put the camera inside the
  // corolla: a petal rides a petiole and is as wide as it is long, so nothing
  // short of the geometry knows where the flower ends.
  // `sp` is the specimen the flower belongs to — the hero on the solo page and
  // in every shipped path, any member of the field when the garden director
  // picks a subject. Everything below reads sp.S / sp.B where it used to close
  // over the hero's S and B; with sp = specs[0] it is the shipped framer.
  // `out` (garden only, null everywhere else) is a unit horizontal direction
  // pointing from the middle of the field OUT through this flower. A close-up
  // taken from inside a stand is taken through somebody else's leaf — measured
  // on ?garden=7: the subject 10.7 units away and a neighbour's blade filling
  // the frame, which no cull here can fix (the sight-line clearance is the
  // HERO's, and the blade belongs to another specimen). Standing outside the
  // crowd and shooting inward is what a photographer in a real border does.
  function frameAxisFlower(ai, sp, out) {
    const S = sp.S, B = sp.B;
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
    if (performance.now() - lastOrbit > orbitHold()) {
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
          const tp = trunkNear(target.y, S.plant);
          const lx = target.x - tp[0], lz = target.z - tp[2];
          const ll = Math.hypot(lx, lz);
          const w = 0.9 * (1 - smoothstep(0.8, 2.5, ll));
          if (ll > 1e-4 && w > 1e-3) { d.x += w * lx / ll; d.z += w * lz / ll; d.normalize(); }
        }
        // ...and then away from the FIELD, if there is one
        if (out) { d.x += 0.85 * out.x; d.z += 0.85 * out.z; d.normalize(); }
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
  const _poseE = new THREE.Vector3(), _poseT = new THREE.Vector3();
  let lastOrbit = -1e9;
  // How long a drag owns the camera. 6 s on the solo page, unchanged — one
  // subject in the middle of the frame, you turn it, you look, it resumes. A
  // FIELD is a place, and a viewer who drags is walking around in it, so the
  // garden holds far longer (FL_DIR_ORBIT_HOLD, 45_director.js).
  // A FUNCTION, not a value: 45_director.js's consts are in their temporal
  // dead zone while flBoot() runs (see below), and reading one at boot throws
  // — which it duly did on the first run of this file.
  const orbitHold = () => (gardenN ? FL_DIR_ORBIT_HOLD * 1000 : 6000);
  scene.controls.addEventListener('start', () => { lastOrbit = performance.now(); });
  let framedAx = -1;   // which axis the flower shot is on; -1 = no clearance
  let framedShot = '';   // the shot the garden director is playing (HUD, tools)
  // The garden director, built LAZILY on the first updateFraming — every const
  // in 45_director.js is in its temporal dead zone while flBoot() runs, since
  // that file sorts after this one in the one-scope bundle. updateFraming is
  // only ever called from inside requestAnimationFrame, which is after the
  // whole bundle has executed. See the load-order note in 45_director.js.
  let director = null;
  // The garden's per-shot lens plan { k, min }: uRange = max(min, k * focal
  // distance). null on the solo page, where the shipped law below still runs
  // untouched.
  let dofPlan = null;
  // ?shot=wide|bank|glide|dolly|close|low pins the director to one shot — a capture
  // affordance, the same category as ?ff=, so a still of a named shot is
  // reproducible. Unpinned (the page as watched) it cycles.
  let pinIdx = -2;   // resolved on first use — FL_DIR_SHOTS is in its TDZ at boot
  // ?focus=flower's subject, held between re-picks: a subject that changes
  // every frame is a cut nobody asked for.
  let focusPick = null, focusPickT = -1e9;

  function updateFraming() {
    framedAx = -1;
    const now = performance.now();
    // The director is built here and not at boot: every const in
    // 45_director.js is in its temporal dead zone while flBoot() runs, and
    // updateFraming only ever runs inside requestAnimationFrame. Its field
    // measurement is hoisted above the focus branch because ?focus=flower
    // needs it too — a close-up wants to know which way is OUT of the field.
    if (gardenN) {
      if (!director) {
        director = flDirMake();
        director.t0 = now; director._last = now; director.pickT = now;
        director.fromEye.copy(scene.camera.position);
        director.fromTgt.copy(target);
        director.fromR = radius;
        director.cut = true; director.el = 0;
      }
      if (!director.field || now - director.scan > 500) {
        director.field = flDirField(specs);
        director.scan = now;
      }
      // the lens the perpetual drift is measured in — a rate in frame widths
      // per second is only a rate once somebody has read the frame off the
      // camera. Every frame, since a resize changes the aspect.
      flDirLens(director, scene.camera);
    }
    if (focus === 'flower') {
      // In a garden the override means the best flower IN THE FIELD, not on
      // the hero. Re-picked every 3 s and only when the challenger is clearly
      // better (1.25x), so the shot does not hop between two equal corollas.
      let sp = specs[0], ax;
      if (gardenN) {
        if (!focusPick || now - focusPickT > 3000) {
          const p = flDirPick(specs, scene.camera.position, flowerScore, director.field, pollen);
          focusPickT = now;
          if (p && (!focusPick || !specs[focusPick.i].S ||
            !specs[focusPick.i].B.floralBounds(focusPick.ai) ||
            p.score > focusPick.score * 1.25)) focusPick = p;
        }
        if (focusPick) { sp = specs[focusPick.i]; ax = focusPick.ai; }
        else ax = -1;
      } else {
        // >= 0, not truthy: the best flower is often the TERMINAL one, axis 0,
        // and a truthiness test silently fell through to the wide shot
        ax = bestFlower(sp);
      }
      const outF = gardenN && director.field && ax >= 0
        ? flDirOutward(director, director.field, sp.B.floralBounds(ax) || { c: [0, 0, 0] })
        : null;
      if (ax >= 0 && frameAxisFlower(ax, sp, outF)) {
        // the sight-line cull is the HERO's alone (it is captured with a cull;
        // the members are not), so a close-up on a member gets no clearance
        framedAx = sp === specs[0] ? ax : -1;
        scene.controls.target.copy(target);
        scene.fogU.uFogNear.value = Math.max(0, scene.camera.position.distanceTo(target) - radius * 1.1);
        const eye = scene.camera.position;
        const d = eye.distanceTo(target);
        const want = radius * 2.35;
        if (Math.abs(d - want) > 0.01) {
          eye.sub(target).multiplyScalar(1 + (want / Math.max(1e-3, d) - 1) * 0.03).add(target);
        }
        if (gardenN) { dofPlan = { k: 0.22, min: 0.4 }; framedShot = 'focus'; }
        return;
      }
    }
    if (gardenN) {
      // THE GARDEN DIRECTOR (45_director.js): a shot list for a field, in
      // place of phase 1's single framing of the bound of everything — which
      // is how six plants ended up bunched in a column 84 units away.
      const dtms = now - director._last;
      director._last = now;

      // THE VIEWER OWNS THE CAMERA. While a drag is recent the director does
      // not touch the eye at all, and its shot clock STOPS (rather than
      // running on invisibly and cutting the instant control comes back).
      // autoRotate is handed back at the same time — the solo page's idle
      // drift, which is the right feel for a view somebody chose, and exactly
      // the wrong one under a director that owns its own azimuth.
      if (now - lastOrbit < orbitHold()) {
        director.t0 += dtms;
        director.resume = true;
        scene.controls.autoRotate = true;
        target.copy(scene.controls.target);
        scene.fogU.uFogNear.value = Math.max(0,
          scene.camera.position.distanceTo(target) - radius * 1.1);
        dofPlan = { k: 0.40, min: 2.0 };
        return;
      }
      scene.controls.autoRotate = false;

      if (pinIdx === -2) pinIdx = FL_DIR_SHOTS.findIndex(sh => sh.name === q.get('shot'));
      let name;
      if (pinIdx >= 0) {
        director.cut = director.shot !== pinIdx;
        if (director.cut) { director.shot = pinIdx; director.t0 = now; }
        director.el = (now - director.t0) / 1000;
        name = FL_DIR_SHOTS[pinIdx].name;
      } else {
        name = flDirClock(director, now);
      }
      // coming back from a drag re-enters on a full eased transition from
      // wherever the viewer left the camera, so control is handed back rather
      // than snatched
      if (director.resume) { director.resume = false; director.t0 = now; director.cut = true; director.el = 0; }

      const F = director.field;
      if (!F) return;
      // The subject is chosen ON THE CUT and held for the whole shot: a subject
      // that changes mid-shot is a cut nobody asked for. The one exception is
      // a subject that has stopped being one — the field goes on growing, and
      // a flower chosen when it was the only one open can be left behind by a
      // corolla ten times its size. Re-checked every 6 s, and it takes a 1.6x
      // better challenger to actually move (measured: with no hysteresis the
      // top two trade places continuously).
      if (director.cut || !director.subj || !specs[director.subj.i].S) {
        director.subj = flDirPick(specs, scene.camera.position, flowerScore, F, pollen);
        director.pickT = now;
        // and how long to hold on it: a subject-bearing shot stretches or
        // shrinks its hold by up to a third with how good this one is against
        // the ones this director has picked before (45_director.js)
        if (director.cut) flDirDwell(director, director.subj ? director.subj.score : 0);
      } else if (now - director.pickT > 6000) {
        director.pickT = now;
        const cur = flDirScoreOf(specs, director.subj.i, director.subj.ai, flowerScore, F, pollen);
        const p = flDirPick(specs, scene.camera.position, flowerScore, F, pollen);
        if (p && p.score > cur * 1.6) director.subj = p;
      }
      const sj = director.subj;
      const bb = sj ? specs[sj.i].B.floralBounds(sj.ai) : null;
      // nothing flowering yet: the two shots that need a subject fall back to
      // the field itself. The low shot does not need one. They fall back to
      // `bank` rather than `wide` because a field with nothing flowering is a
      // field of seedlings, and `wide` is solved from the plant bounds — with
      // nothing tall yet the WIDTH binds, so three of the five shots would be
      // the empty clearing at maximum standoff.
      if (!bb && (name === 'close' || name === 'dolly')) name = 'bank';

      if (name === 'close') {
        if (director.cut) {
          director.fromEye.copy(scene.camera.position);
          director.fromTgt.copy(target);
          director.fromR = radius;
          // pace the arrival off the distance to the corolla, like every other
          // move — the four field poses do this from inside themselves, and
          // this one has no pose function to do it in
          flDirPace(director, bb.c[0], bb.c[1], bb.c[2]);
        }
        frameAxisFlower(sj.ai, specs[sj.i], flDirOutward(director, F, bb));
        framedAx = sj.i === 0 ? sj.ai : -1;
        scene.controls.target.copy(target);
        scene.fogU.uFogNear.value = Math.max(0,
          scene.camera.position.distanceTo(target) - radius * 1.1);
        const eye = scene.camera.position;
        const d = eye.distanceTo(target);
        const want = radius * 2.35;
        if (Math.abs(d - want) > 0.01) {
          eye.sub(target).multiplyScalar(1 + (want / Math.max(1e-3, d) - 1) * 0.03).add(target);
        }
        // THE ARRIVAL GATE. The close-up is the shipped framer, and the shipped
        // framer is three exponential lerps (target 0.03, eye 0.012, dolly
        // 0.03) — which is an ease-OUT, and an ease-out STARTS at its fastest.
        // Measured over a full cycle with the sampler: entering the close-up
        // from the dolly peaked at 59-62 units/s, against 19 for every other
        // transition (WORLD.unitM makes that 3.9 m/s against 1.2 — a whip
        // against a walk). Holding the camera back toward the pose it cut from,
        // by the same smoothstep the other shots use, turns those three lerps
        // into an ease-in-out without touching the framer the solo page shares.
        {
          const w = smoothstep(0, 1, Math.min(1, director.el / flDirTrans(director)));
          if (w < 0.999) {
            scene.camera.position.lerp(director.fromEye, 1 - w);
            target.lerp(director.fromTgt, 1 - w);
            radius = lerp(radius, director.fromR, 1 - w);
            scene.controls.target.copy(target);
          }
        }
        dofPlan = { k: 0.22, min: 0.4 };
        framedShot = name;
        return;
      }
      if (director.cut) {
        director.fromEye.copy(scene.camera.position);
        director.fromTgt.copy(target);
        director.fromR = radius;
      }
      // how far through the whole shot we are — the director's own number now,
      // because the dolly's travel is a function of it and the shot clock cuts
      // on it, and a hold that stretches with its subject made those two
      // different quantities computed in two files
      const u = flDirU(director);
      let rWant;
      if (name === 'dolly') { rWant = flDirPoseDolly(director, F, bb, u); dofPlan = { k: 0.35, min: 1.5 }; }
      // THE TRAVERSE (45_director.js). Its lens is the shallowest of the field
      // shots on purpose: the focal plane rides a fixed distance ahead down the
      // lane, so `k` is what decides how thick the slab of sharp flowers is as
      // they pass. It needs no subject — the aim is the far end of the lane.
      else if (name === 'glide') { rWant = flDirPoseGlide(director, F, u); dofPlan = { k: 0.22, min: 1.5 }; }
      else if (name === 'low') { rWant = flDirPoseLow(director, F); dofPlan = { k: 0.45, min: 3.0 }; }
      // the establishing frame is SOLVED from the live camera's own fov and
      // aspect, so it is the one pose that is handed the camera
      else if (name === 'wide') { rWant = flDirPoseEstab(director, F, scene.camera); dofPlan = { k: 0.55, min: 6.0 }; }
      else { rWant = flDirPoseBank(director, F); dofPlan = { k: 0.42, min: 3.0 }; }
      // THE TRANSITION: an eased blend from the pose the camera held at the
      // cut to the pose this shot wants, over flDirTrans(director) seconds, with a
      // little damping on top so a want that moves (the dolly, a growing
      // subject) never reads as a step. Ease-in-out, not the exponential lerp
      // the solo framer uses: a cut across a field is a MOVE, and an
      // exponential move starts at its fastest.
      const w = smoothstep(0, 1, Math.min(1, director.el / flDirTrans(director)));
      // the eye swings AROUND the field rather than across it (flDirBlendEye);
      // the target still lerps straight, because an aim has nothing to collide
      // with and an arced aim is a swerve
      flDirBlendEye(_poseE, director, F, w);
      _poseT.copy(director.fromTgt).lerp(director.wantTgt, w);
      scene.camera.position.lerp(_poseE, 0.12);
      target.lerp(_poseT, 0.12);
      radius += (lerp(director.fromR, rWant, w) - radius) * 0.12;
      scene.controls.target.copy(target);
      scene.fogU.uFogNear.value = Math.max(0,
        scene.camera.position.distanceTo(target) - radius * 1.1);
      framedShot = name;
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
        // One air, one clock: this member's life clock starts at zero but the
        // world is at `startAt`, so without the phase it would bend to wind
        // from `startAt` steps ago for its whole life (40_plant.js windPhase).
        M.plant.windPhase = s.startAt;
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
    if (step > polStep) { pollen.step(specs, step - polStep, step); polStep = step; }
    // a mote is drawn at a constant ANGULAR size and is fogged by the scene's
    // own fog (18_pollen.js), so both are functions of where the camera is and
    // have to be re-derived on every frame — including the frames the world
    // clock does not advance on, which is the whole of ?speed=0
    pollen.resize(scene.camera.position,
      scene.fogU.uFogD.value, scene.fogU.uFogNear.value);
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
    // In a field the subject is the thing being FRAMED and everything nearer
    // is foreground: the range is scheduled off the focal distance per shot
    // (45_director.js sets dofPlan), so the plants the dolly passes blur
    // instead of pulling focus. uFocus is the camera-to-target distance and
    // alpha is linear depth, so this is only a scheduling question. dofPlan is
    // null on the solo page and the shipped law below is what runs there.
    const dofT = dofPlan
      ? Math.max(dofPlan.min, fDist * dofPlan.k)
      : (focus === 'flower'
        ? Math.max(0.4, fDist * 0.22)
        : Math.max(2.0, radius * 0.62));
    dofR = dofR === undefined ? dofT : dofR + (dofT - dofR) * 0.05;
    scene.compU.uRange.value = dofR;
    // AND THE FOCUS RACKS, in a garden. It is set below the range rather than
    // above it because the rack's amplitude is the range — one depth of field,
    // so a shot enters with its subject soft and pulls onto it as the move
    // lands (flDirFocus). On the solo page and while a drag owns the camera
    // this is the shipped `uFocus = distance to what you are looking at`.
    // `resume` is set while a drag owns the camera and cleared on the frame
    // control comes back: a viewer turning the camera themselves gets the
    // shipped lens, not a rack frozen wherever the shot clock stopped.
    scene.compU.uFocus.value = (gardenN && director && !director.resume && framedShot !== 'focus')
      ? flDirFocus(director, fDist, dofR) : fDist;
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
        `${germ} germinated · ${flow} flowering · ${tp} petals` +
        (framedShot ? `  ·  shot: ${framedShot}` : '') + '\n' +
        `step ${step}${ff > 0 ? '  (fast-forward ' + ff + ')' : ''} · capture ${capMs.toFixed(1)}ms ` +
        `(${capN}/${specs.length}) · ${Math.round(fpsA)} fps`;
    }
    hud.textContent = text;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

flBoot();
