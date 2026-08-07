// The organ loop, owned.
//
// This is `App.prototype.drawSpecimen` (70_app.js) with three subtractions and
// one addition. Subtracted: the occlusion cull (there is no director here and
// nothing to clear a sight line for), the microscope (`_watch`/`_replay` — the
// close-up story belongs to the shipped page), and the falling-blade redraw
// (petals never shed today; when they do, this is where it returns). Added:
// `B.beginOrgan/endOrgan` bracketing, so every downstream mesh knows which
// organ it came from, what kind it is, and what its `q` was.
//
// Every emitter called here is the SHIPPED one — blade(), tube(), fruitShell(),
// meristemDome(), laminaCells() — the same argument that keeps the Blender
// bridge honest: this file adds no geometry code, it adds bookkeeping.

// The stand-in App: exactly the property list makeSpecimen + the helpers read
// off `this`. Duplicated deliberately from tools/blender_export.mjs:46 and
// test/views.mjs — a third copy that breaks loudly beats a shared import that
// drifts quietly (their words, kept).
function flEnv(over) {
  return {
    cam: { eye: v3(0, 4, 15), dist: 15, fov: 0.72 },
    viewName: 'natural',
    view: App.prototype.view,
    setBladeLOD: App.prototype.setBladeLOD,
    bladeMesh: App.prototype.bladeMesh,
    bladeMU: 22, bladeMV: 10, bladeRef: 4.3,
    detail: 0, t: 12000,
    _watch: null, _replay: null,
    showMeristem: true,
    ringWidth: 0, windU: undefined, senesceHeld: false,
    _mesh: [0, 0],
    ...over,
  };
}

// Whorl palettes, built lazily per specimen. The ANTHER wears the species' own
// vasculature glow, concentrated — an anther is a packet of what the veins
// carry, and the pollen it sheds is already lit by the same key. The CARPEL is
// leaf tissue turned inward: pale green-white style and stigma, faint glow.
// Grade-category numbers, same standing as the shipped palette scalars.
function flWhorlPals(S) {
  const pal = S.pal, pp = S.petalPal, m = pal.laminaMul;
  const mixc = (a, b, t) => a.map((v, k) => lerp(v, b[k], t));
  const vein = pal.vein;
  return {
    anther: { ...pp,
      blade0: mixc(pp.blade0, vein.map(v => v * m * 1.05), 0.75),
      blade1: mixc(pp.blade1, vein.map(v => v * m * 1.25), 0.85),
      // the first pass ran glow at 2.5x with a 0.9 floor and every anther
      // saturated to a white bokeh blob through the bloom chain (measured on
      // the live shader); an anther should read warm, not incandescent
      vein, glow: Math.min(0.45, pp.glow * 1.4) },
    carpel: { ...pp,
      // pale luminous green — a style IS chlorophyll tissue. The first mix sat
      // at 0.55 toward a dark olive and the carpel read as a black faceted
      // blob at the flower's crown (isolated live: brightening ONLY this
      // palette turned the mystery object pale green)
      blade0: mixc(pal.blade1, [0.55, 0.70, 0.45], 0.8),
      blade1: mixc(pal.blade1, [0.85, 0.98, 0.70], 0.8),
      vein, glow: Math.min(0.5, Math.max(pp.glow * 1.3, 0.35)) },
  };
}

// `cull` is the shipped sight-line occlusion clearance (70_app.js), ported the
// day the flower focus got a facing shot: face-on through a canopy is a shot
// INTO foliage, and without the clearance the frame is mostly defocused blades
// with a flower peeking through a gap (measured, immediately). Same cone test,
// same hysteresis, same keep rules — the subject flower's own organs are never
// cleared. Null (the parity harness, the wide shot) draws everything, as ever.
function flDrawSpecimen(env, B, S, cull) {
  const pal = S.pal;
  const V = env.view();
  const cpal = V.cellPal ? { ...pal, ...V.cellPal } : pal;
  for (let ai = 0; ai < S.plant.axes.length; ai++) {
    const ax = S.plant.axes[ai];
    const nseg = ax.pts.length;
    if (nseg > 1) {
      B.beginOrgan({ kind: 'stem', ax: ai, floral: !!ax.floral, gen: ax.gen });
      if (V.stemSolid) {
        tube(B, ax.pts, ax.radii, 7, (t) => ({
          c: [lerp(pal.stem0[0], pal.stem1[0], t), lerp(pal.stem0[1], pal.stem1[1], t), lerp(pal.stem0[2], pal.stem1[2], t)],
          e: t > 0.93 && ax.alive ? (t - 0.93) * 5.0 * pal.glow : 0,
        }));
      } else {
        stemRibbon(B, ax.pts, ax.radii, pal.stem1, V.stem);
      }
      B.endOrgan();
    }
    for (let oi = 0; oi < ax.organs.length; oi++) {
      const org = ax.organs[oi];
      if (org.len < 0.02) continue;
      if (org.shed) continue;               // petals do not fall (yet); leaves that do are the page's story
      const oFr = org.frame;
      // the shipped cone-from-the-eye occlusion test, hysteresis included: an
      // organ must be clearly inside the cleared cone to drop and clearly
      // outside to return, so a wobble at the boundary decides once
      let occluded = false;
      if (cull && !(ax === cull.keep && org.floral)) {
        const ox = oFr.o[0] - env.cam.eye[0];
        const oy = oFr.o[1] - env.cam.eye[1];
        const oz = oFr.o[2] - env.cam.eye[2];
        const t = ox * cull.dx + oy * cull.dy + oz * cull.dz;
        // the window extends one organ-length PAST the subject: a face-on
        // shot sits inside the canopy, and a blade rooted just behind the
        // flower reaches forward across its face (the shipped cull never met
        // this case — its director shoots from outside the crown)
        if (t > 0 && t < cull.r + (org.len || 0)) {
          const px2 = ox - cull.dx * t, py2 = oy - cull.dy * t, pz2 = oz - cull.dz * t;
          const lat = Math.hypot(px2, py2, pz2) - (org.len || 0);
          occluded = lat < cull.rad * (t / cull.dist) * (org._occ ? 1.20 : 0.86);
        }
      }
      org._occ = occluded;
      if (occluded) continue;
      const L = org.leaf;
      const sen = org.sen || 0;
      const kind = org.whorl && org.whorl !== 'inner' ? org.whorl
        : org.petal ? 'petal' : org.floral ? 'inner' : 'leaf';
      B.beginOrgan({ kind, ax: ai, org: oi, q: org.q || 0, sen, dev: org.dev || 0, len: org.len });
      // petiole — the stalk on screen is the stalk in the solver (ROADMAP 5)
      const a = oFr.o;
      const pt = petioleOf(org);
      const pet = pt.len;
      const b = v3(a[0] + oFr.x[0] * pet, a[1] + oFr.x[1] * pet, a[2] + oFr.x[2] * pet);
      let petC = pal.stem1;
      if (org.petal || kind === 'stamen' || kind === 'carpel') {
        // a petal's stalk wears the petal's base colour, not the stem's: a
        // doubled corolla draws 20+ of these, and in stem-brown they read as
        // a wire armature through the flower (measured on the double). A
        // stamen's FILAMENT is paler still — it reads as light structure
        // holding the anthers up — and the carpel's style stays green.
        const pb = kind === 'stamen' ? S.petalPal.blade1
          : kind === 'carpel' ? pal.blade1 : S.petalPal.blade0;
        const t = kind === 'stamen' ? 0.85 : kind === 'carpel' ? 0.55 : 0.65;
        _petC[0] = lerp(pal.stem1[0], pb[0], t);
        _petC[1] = lerp(pal.stem1[1], pb[1], t);
        _petC[2] = lerp(pal.stem1[2], pb[2], t);
        petC = _petC;
      } else if (sen > 0) {
        senesceTint(_petC, pal.stem1[0], pal.stem1[1], pal.stem1[2], sen * 0.85);
        petC = _petC;
      }
      if (V.stemSolid) tube(B, [a, b], [pt.r0, pt.r1], 5, () => ({ c: petC, e: 0 }));
      else stemRibbon(B, [a, b], [pt.r0, pt.r1], petC, V.stem);
      if (!L || !L.margin || !L.margin.mature) { B.endOrgan(); continue; }
      const fr = { o: b, x: oFr.x, y: oFr.y, z: oFr.z };
      const dev = clamp((org.dev || 0) * 1.06 - 0.03, 0, 1);
      const bl = drawnBladeLen(org.len, sen);
      if (bl < 0.02) { B.endOrgan(); continue; }
      const wp = (kind === 'stamen' || kind === 'carpel')
        && (S._whorlPals || (S._whorlPals = flWhorlPals(S)));
      const bp = org.petal ? S.petalPal
        : kind === 'sepal' ? pal            // a sepal IS a leaf — A-class alone
          : kind === 'stamen' ? wp.anther
            : kind === 'carpel' ? wp.carpel
              : org.floral ? S.innerPals[clamp(
                Math.round(((org.q - S.sp.petalQ) / Math.max(1e-3, 1 - S.sp.petalQ)) * (INNER_STEPS - 1)),
                0, INNER_STEPS - 1)]
                : pal;
      const curl = -bl * (org.petal ? 0.05 : 0.16) * (1 + sen * 2.2);
      const ripple = bl * 0.014;
      // A flower close-up lives at the mesh resolution the shipped page only
      // reaches under its microscope: at 22x10 a fenestration cut is a row of
      // rectangles and a petal rim is a hexagon (measured on the Parasol).
      // Floral organs get the microscope's refinement all the time — there are
      // ~9 of them per flower, so it is cheap where it matters.
      // Floral organs draw at the lattice's own full resolution (detL 1.0):
      // the ripple's Nyquist guard in flPetalForm assumes the grid IS the
      // lattice, and at 0.85 the two drifted apart.
      const mesh = env.bladeMesh(L, bl, org.floral ? 1.0 : 0, env._mesh);
      if (org.petal && V.lamina > 0) {
        // PETALS ONLY go to the petal stream: same grid and colours, but the
        // out-of-plane form is 12_form.js's shell + ripple physics, and the
        // veins are mapped through that SAME displacement (a vein floats off
        // the surface otherwise). Inner organs take the shipped card below —
        // the shell curvature scales as 1/L, so a 0.4-unit stamen-analog fed
        // through it rolls into a crumpled tube whose flipping normals strobe
        // the sheen (measured: AJ called it "weird flashy things" within a
        // minute of looking; Liang & Mahadevan derived their shell for a
        // petal's aspect ratio, not a stamen's). Ripple phase must be
        // deterministic and stable across frames — hashing the organ's place
        // in the plant is safe where calling org.rnd() here would burn the
        // organ's own PRNG stream and change the plant.
        const phase = (ai * 37 + oi * 101) % 251 * 0.0793;
        const lib = Math.max(0, (S.plant.leaves.plib || []).indexOf(L));
        // one-time bake per library petal: the Mimulus reaction-diffusion
        // field on this petal's own lattice (17_spots.js)
        if (L.mature && !L._flSpots) L._flSpots = flSpotsRun(L);
        flPetalSurface(B, L, fr, bl, bl, bp, bp.glow,
          mesh[0], mesh[1], dev, sen, org.q || 0, phase, lib);
        flPetalVeins(B, L, fr, bl, bl, bp, bp.glow, dev, sen, org.q || 0, phase, V.veins);
      } else {
        blade(B, L, fr, bl, bl, bp, curl, ripple, bp.glow, mesh[0], mesh[1], dev,
          1, sen, { surface: V.lamina > 0, veinMul: V.veins });
      }
      if (V.cells > 0 || V.needles > 0.004) {
        laminaCells(B, L, fr, bl, bl, cpal, curl, ripple, env.t, V.needles, dev,
          sen, { cells: V.cells > 0 ? 1 : 0 });
      }
      B.endOrgan();
    }
    if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
      const n2 = ax.pts.length;
      const tip = ax.pts[n2 - 1];
      const fs = S.sp.fruitScale * (ax.gen === 0 ? 1 : 0.72);
      B.beginOrgan({ kind: 'fruit', ax: ai, phase: ax.fruit.phase, tip });
      if (V.fruitSolid) fruitShell(B, ax.fruit, tip, fs, pal);
      else fruitCells(B, ax.fruit, tip, fs, cpal, V.needles, V.ripeTint);
      B.endOrgan();
    }
    if (env.showMeristem && ax.alive && ax.meristem) {
      const n = ax.pts.length;
      const tip = ax.pts[n - 1];
      const prev = ax.pts[Math.max(0, n - 2)];
      const dir = v3(); v3norm(dir, v3sub(dir, tip, prev));
      if (!isFinite(dir[0]) || v3len(dir) < 0.5) v3set(dir, 0, 1, 0);
      let refv = v3(0, 0, 1);
      if (Math.abs(dir[2]) > 0.9) refv = v3(1, 0, 0);
      const e1 = v3(); v3norm(e1, v3cross3(e1, refv, dir));
      const e2 = v3(); v3norm(e2, v3cross3(e2, dir, e1));
      const mScale = Math.max(0.35, ax.radii[n - 1] * 5.5);
      const dEye = Math.hypot(env.cam.eye[0] - tip[0], env.cam.eye[1] - tip[1], env.cam.eye[2] - tip[2]);
      const det = smoothstep(0.030, 0.105, mScale / Math.max(0.01, dEye));
      B.beginOrgan({ kind: 'meristem', ax: ai });
      meristemDome(B, ax.meristem, { o: tip, x: dir, y: e2, z: e1 },
        mScale, cpal, env.t, Math.max(det, V.needles) * V.meristem);
      B.endOrgan();
    }
  }
}
