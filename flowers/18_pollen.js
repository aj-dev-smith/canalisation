// POLLEN, IN THE ONE AIR.
//
// The anther-analogs shed grains, and a grain rides `37_wind.js`'s field — the
// same field the stem bends in, sampled at each grain's own position, because
// two winds in one scene is exactly the sin that file exists to prevent. A
// 30 um grain has a Stokes response time of ~3 ms, far below one plant-time
// unit, so the honest integrator is the quasi-steady one: velocity is the
// local wind plus a settling term, and there is no inertia to integrate.
//
//   Settling is Stokes' law, v_s = rho_p g d^2 / (18 mu_air). With d = 30 um,
//   rho_p = 1200 kg/m^3 (a sporopollenin-walled grain) and mu_air = 1.81e-5
//   Pa s, v_s = 3.3 cm/s — inside the published 2-4 cm/s for pine pollen [D].
//   Converted to world units with the same velToWorld(WORLD) the wind and the
//   falling blade already use; g and the air come from WORLD itself.
//
// ---------------------------------------------------------- ONE POPULATION
//
// A FIELD sheds, not a plant. The population walks a LIST of specimens — the
// boot's `specs` array, hero first — instead of the hero alone, which is what
// it did through phase 2 and which left six of seven flowering plants shedding
// nothing. The alternative shape, one FlPollen per specimen, was rejected for
// three reasons and they are all the same reason:
//
//   - A GRAIN IS NOT PART OF A PLANT. The only per-plant thing about it is the
//     instant and the place it dehisced at; from then on its inputs are the
//     wind field and gravity, both of which are scene-wide by construction.
//     Per-specimen populations would be N copies of one air.
//   - THE CAP IS A SCENE-WIDE RESOURCE. `max` is a legibility and cost number
//     (below), and N caps of 4096 is not the same statement as one — it says
//     "each plant may fill the frame with motes", which is the thing a cap
//     exists to stop. One population also uploads once: `uploadPollen` takes
//     one array, and N of them would need a concatenation pass the way the
//     four geometry streams do.
//   - A GRAIN CROSSING BETWEEN PLANTS IS THE POINT. It is the one thing in
//     this piece that is about the field rather than about a specimen, and a
//     population owned by a plant would be a lie about where its grains are.
//
// What it costs, stated: seven plants' anthers draw on one 4096-grain budget,
// so in principle a field's per-plant plume is thinner than a solo page's.
//
// ⚠ IT IS NOT, AND THE REASON IS THAT NEITHER `max` NOR `life` HAS EVER BOUND
// THIS POPULATION. Measured (test/flowers_pollen.mjs, garden=7 seed=21): the
// field's anther count climbs 11 -> 41 -> 59 over steps 1500-3000 and settles
// near 60, against the hero's own 16, and the population sits at 1-8% of the
// cap over that whole range with ZERO refusals. Nor does a grain ever grow
// old: 0% of deaths are `life`, at every setting swept.
//
// THE POPULATION IS ADVECTION-LIMITED. A grain drifts ~0.32 world units per
// plant-time unit in the shipped 2.5 m/s air (velToWorld x uRef), so it
// crosses the whole 26-unit clearing in ~80 plant-time units — a ninth of
// `life` — and the steady state is `anthers * rate * (time in the story)`,
// where the last term is set by the wind and by `beyond` below. Two constants
// that look like they govern this population and neither of them does; if the
// cap ever DOES bind (a field of twelve of a heavy-anthered species), the
// honest lever is the cap and not the rate, because the rate is a per-anther
// statement about a flower and the cap is a statement about the frame. 7
// floats a grain: 4096 grains is 114 kB.
//
// ⚠ AND IT HAS BEEN LOOKED AT, WHICH IS THE ONLY VERDICT THAT COUNTS. Over a
// full director cycle at ?garden=7 the field holds 330-390 grains, and the
// number of them drawn LARGER THAN 2 PIXELS is 0 (wide) / 5 (dolly) / 7
// (close) / 23 (low) — never more than 4 px, because the camera is never
// within 10 units of a grain: the shots stand outside the crowd (45_director)
// and a grain only exists within a plant's room of a plant. So the mechanism
// is right and what reaches a viewer is a scatter of one-pixel dots; it reads
// as motes in the close-up and as nothing at all in the wide shot.
//
// The lever is the drawn SIZE, and the honest form of it is the vein width
// floor's argument applied to a mote: a real grain is sub-pixel at every
// distance, so what you see is a glare spot of roughly constant ANGULAR size,
// not a constant world size. `?pol=0.05,12,0.07` shows what that buys — at
// 3.2x, motes read around the corollas in the dolly shot and the sky stays
// clean, because the population is concentrated where the plants are. It is
// NOT shipped: it is a look decision, and the look decisions in this piece
// are made by watching, not by the person who found the lever.
//
// ------------------------------------------------------------- TWO CLOCKS
//
// The garden runs its specimens on their own clocks — the step pool is spent
// depth-first, so a member is paid its whole debt when its turn comes and
// nothing in between (40_boot.js) — and pollen needs BOTH clocks, not either:
//
//   - SHEDDING is a plant process, so a specimen sheds in proportion to the
//     plant time IT advanced this frame (`spec.stepped`). A member that was
//     not paid this frame dehisced nothing.
//   - DRIFT is the air, so every grain advances on the WORLD clock, and the
//     wind is sampled at world time. `windAt`'s `t` is a wall clock over the
//     whole clearing; a plant's age is not one, and the population is scene-
//     wide, so there is no per-plant clock available to be wrong with.
//
// It is a no-op on today's page and it is still worth writing down: the hero
// is exempt from the step pool and is paid first out of it, so its age equals
// the world step exactly, and the shipped call passed `specs[0].age` for the
// wind's `t` and got the right number by that accident.
//
// ⚠ THE PLANTS THEMSELVES DO NOT DO THIS, and it is outside this file. Each
// `Plant` samples `windAt` at `this.time` (40_plant.js), which for a member
// that germinated at world step 900 is the air of 900 steps ago. That is one
// wind field evaluated at N different times, i.e. N fields, and it is the same
// class of defect 37_wind.js exists to prevent. The pollen deliberately does
// not copy it.
//
// Stated, honestly:
//   - WHICH organs dehisce is [OURS]: inner organs in the outer part of the
//     inner q-range (qn < qBand) — the stamen-analog band. The carpel-analog
//     at the top of the range keeps its grains. The engine has no anther; q is
//     the closest thing it computes to "this organ makes pollen".
//   - The drawn size and the shed rate are LEGIBILITY choices, same category
//     as the vein width floor MINW: a real grain is 0.0005 world units and
//     sub-pixel at every distance, so a grain is drawn as the mote you see
//     when a shaft of light catches one. Its colour is the KEY LIGHT'S colour,
//     not a pigment — a backlit mote shows you the light, not itself, which in
//     a field means the FIELD's key light (flFieldPal, 25_ground.js) and not
//     the hero's: a grain should match the air it is in.
//   - The edge of the story is a legibility number too, and `?pol=` sweeps it.
//     See `beyond`.

const FL_POLLEN = {
  dGrain: 30e-6,     // grain diameter, m [D: 20-40 um across taxa]
  rhoGrain: 1200,    // grain density, kg/m^3 [D]
  muAir: 1.81e-5,    // dynamic viscosity of air, Pa s (physics)
  max: 4096,         // population cap, SHARED BY THE WHOLE FIELD
  rate: 0.05,        // grains per dehiscing organ per plant-time unit [legibility]
  qBand: 0.72,       // stamen-analog band: qn below this sheds [OURS]
  devGate: 0.85,     // dehiscence gate: the organ is essentially mature
  life: 900,         // pt units before a grain leaves the story (7.2 s). ⚠ NO
                     // GRAIN HAS EVER REACHED IT: 0% of deaths, every sweep.
                     // Kept as the backstop it is, not read as a lever
  size: 0.022,       // drawn mote size, world units [legibility]
  bright: 1.1,       // key-colour multiplier on a mote [grade-category]
  fadeIn: 40,        // pt units to full brightness — a grain POPPING to full
  fadeOut: 150,      // white at the anther reads as a glitch, not a mote
  // HOW FAR PAST THE OUTERMOST PLANT A GRAIN IS STILL PART OF THE PICTURE, in
  // world units beyond the clearing's rim — replacing a bare |x| > 90 box that
  // predates both the field and the ground. It is a LEGIBILITY number, not
  // physics (a real grain keeps going), and it is needed because the point
  // pass has NO FOG and floors gl_PointSize at 1 px (30_scene.js): a grain
  // neither dims nor shrinks out of the frame at any distance, so at 90 units
  // it is still a full-brightness one-pixel dot on the sky.
  //
  // Measured on the shipped 90 (garden=7 seed=21, step 3000): 348 grains alive
  // of which 67 were within one plant's room of any specimen — 81% of the
  // population, and of the cost, was sky — at a mean radius of 44.3 in a
  // clearing of radius 26.4.
  //
  // AND THE PART OF THE POPULATION A VIEWER SEES DOES NOT MOVE WITH IT. Swept
  // solo at step 3000, `beyond` 12 / 30 / 90 gives 38 / 82 / 228 grains alive
  // and 38 / 38 / 38 of them within one plant's room. The whole difference is
  // grains nobody can see, so one plant's room past the last plant (the
  // measured FL_GARDEN_SPACING) keeps the plume among the flowers where the
  // light is and spends nothing. ?pol=rate,beyond,size sweeps all three.
  //
  // It also settles the ground. Solo at `beyond` 90, 48% of grains ended by
  // touching y=0 and at 12 none did; a field of seven (rim 26, so the story
  // runs to 38) lands 13%. Every one of those is out at the rim, drawn at the
  // 1-px floor. Stokes settling is 3.25 cm/s against a wind that moves a grain
  // 100x faster, so nothing in this piece ever watches pollen land, and the
  // y < 0 test below is a floor rather than an event. A landing behaviour
  // (the shed blade's "lie still, then fade") was considered and is not built:
  // it would be machinery for a case the measurement says does not occur.
  beyond: 12,
};

class FlPollen {
  // (seed, keyCol, plan): `keyCol` is the SCENE's key light — the field's when
  // there is a field. `plan` is flGardenPlan's array or null; the population
  // reads only the clearing's rim off it, so it never has to know what a
  // garden is.
  constructor(seed, keyCol, plan) {
    this.buf = new Float32Array(FL_POLLEN.max * 7);   // pt layout: pos3 col3 size
    this.age = new Float32Array(FL_POLLEN.max);
    this.n = 0;
    this.rnd = mulberry32((seed ^ 0x9011e4) >>> 0);
    const P = FL_POLLEN, w = WORLD;
    this.vs = P.rhoGrain * w.gEarth * P.dGrain * P.dGrain / (18 * P.muAir)
      * velToWorld(w);   // world units per plant-time unit, downward
    this.col = [keyCol[0] * P.bright, keyCol[1] * P.bright, keyCol[2] * P.bright];
    this._w = v3();
    // one shed accumulator per specimen — fractional expected counts, so a
    // low rate still sheds eventually, and a member that is paid in bursts
    // sheds the same total as one paid a step at a time
    this._acc = [];
    this._cand = [];
    // ?pol=rate,beyond,size sweeps the three legibility numbers together, for
    // the reason ?lod=0 and ?haze= exist: a look decision has to be shootable
    // as a before/after FROM ONE BUILD, at one seed and one step.
    let rate = P.rate, beyond = P.beyond;
    this.size = P.size;
    if (typeof location !== 'undefined') {
      const s = (new URLSearchParams(location.search).get('pol') || '').split(',').map(Number);
      if (s.length >= 2 && s.every(isFinite)) {
        rate = s[0]; beyond = s[1];
        if (s.length > 2) this.size = s[2];
      }
    }
    this.rate = rate;
    // The clearing's rim: where the outermost plant STANDS. Solo pages have no
    // plan and no rim, so the story starts one plant's room wide.
    //
    // ⚠ WHERE A PLANT STANDS IS NOT HOW FAR IT REACHES, and 35_garden.js
    // measured exactly that: median reach 9.7 units but a p90 of 23.2 and an
    // Ember Creeper columbine at 70.9 — "a creeper whose axes never arrest".
    // A rim-only edge would have killed a sprawler's grains on the step they
    // were shed. So the rim GROWS with the furthest anther the field has ever
    // dehisced from (_emit, monotone — the story may not shrink under a plant
    // that already used it).
    this.beyond = beyond;
    let rim = 0;
    if (plan) for (const p of plan) rim = Math.max(rim, Math.hypot(p.origin[0], p.origin[2]));
    this.rEdge = rim + beyond;
    // a census, so the population can be asked where its grains went rather
    // than only how many there are (test/flowers_pollen.mjs asserts on it)
    this.stat = { emit: 0, refuse: 0, age: 0, ground: 0, edge: 0 };
  }

  _emit(x, y, z, r) {
    if (this.n >= FL_POLLEN.max) { this.stat.refuse++; return; }
    const i = this.n * 7, b = this.buf;
    b[i] = x + (this.rnd() - 0.5) * r;
    b[i + 1] = y + (this.rnd() - 0.5) * r;
    b[i + 2] = z + (this.rnd() - 0.5) * r;
    b[i + 3] = this.col[0]; b[i + 4] = this.col[1]; b[i + 5] = this.col[2];
    b[i + 6] = this.size * (0.7 + 0.6 * this.rnd());
    this.age[this.n] = 0;
    this.n++;
    this.stat.emit++;
    // the story reaches one plant's room past the furthest anther, not past
    // the furthest ROOT (see rEdge in the constructor)
    const rs = Math.hypot(b[i], b[i + 2]) + this.beyond;
    if (rs > this.rEdge) this.rEdge = rs;
  }

  // The dehiscing organs of one specimen. Walked only for a specimen that was
  // PAID plant time this frame, which under depth-first batching is a handful
  // of the field rather than all of it: an organ's dev, senescence and frame
  // move only when its plant does, and a specimen that did not step sheds
  // nothing whatever its anthers look like.
  _sources(S) {
    const c = this._cand;
    c.length = 0;
    const pQ = S.sp.petalQ, wb = S.sp.whorlBands;
    for (const ax of S.plant.axes) {
      if (!ax.floral) continue;
      for (const org of ax.organs) {
        if (!org.floral || org.petal || org.shed) continue;
        if ((org.dev || 0) < FL_POLLEN.devGate || (org.sen || 0) > 0) continue;
        if (!org.frame || org.len < 0.05) continue;
        // with whorl bands the stamens are NAMED, so the q-band heuristic
        // retires and only true anthers shed
        if (wb) { if (org.whorl !== 'stamen') continue; }
        else {
          const qn = ((org.q || 0) - pQ) / Math.max(1e-3, 1 - pQ);
          if (qn > FL_POLLEN.qBand) continue;
        }
        c.push(org);
      }
    }
    return c;
  }

  // THE LONGEST DRIFT STEP THE AIR ALLOWS, derived from the shipped field
  // rather than chosen. A grain is integrated forward-Euler through a gust
  // ladder, so the step has to resolve the fastest thing in that ladder both
  // in space and in time — the same Nyquist argument 15_petal.js makes about
  // its ripple and 35_garden.js makes about its recapture rate, with the same
  // four-samples margin:
  //   space: the shortest mode's wavelength is 2pi/max|k| (8 world units on
  //          the shipped 7-octave ladder), and a grain travels
  //          uMeanMag + sigmaW per plant-time unit;
  //   time:  the fastest mode's period is 2pi/max|om|.
  // Both land near 6 plant-time units, which is exactly the real-time page's
  // per-frame cap — so nSub is 1 in real time and this reaches ?ff= alone,
  // where a 40-step chunk moved a grain 12.8 units in one forward-Euler step,
  // further than the shortest gust is long.
  //
  // ⚠ WHAT IT BUYS IS THE TRAJECTORY, NOT THE CENSUS, and the first version of
  // this note said otherwise off a measurement with a bug in it. Measured
  // properly (garden=7 seed 21, step 3000): the ff chunk goes 302 -> 276
  // grains alive against the watched page's 326, i.e. the fast-forwarded
  // population was already within ~15% of the one you watch. It is kept
  // because an under-resolved integration through a gust ladder is wrong in a
  // way a count cannot show, and because it is free where it does not bite.
  _substep(wf) {
    if (this._dtMax) return this._dtMax;
    let kmax = 0, ommax = 0;
    for (const m of wf.modes) {
      if (m.kmag > kmax) kmax = m.kmag;
      const om = Math.abs(m.om);
      if (om > ommax) ommax = om;
    }
    const spd = wf.uMeanMag + wf.sigmaW;
    const hx = kmax > 0 && spd > 1e-9 ? (TAU / kmax) / 4 / spd : Infinity;
    const ht = ommax > 1e-9 ? (TAU / ommax) / 4 : Infinity;
    return (this._dtMax = Math.max(0.5, Math.min(hx, ht)));
  }

  // Advance the population. `specs` is the boot's specimen list — each entry
  // { S, stepped } — `dt` is the WORLD clock's advance this frame and `t` the
  // world time the air is sampled at. Every specimen sheds on its own
  // `stepped`; every grain drifts on `dt`.
  step(specs, dt, t) {
    const C = FL_POLLEN;
    // shed, plant by plant, each on the plant time it was actually paid
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      if (!s.S || !(s.stepped > 0)) continue;
      const cand = this._sources(s.S);
      if (!cand.length) continue;
      const a = (this._acc[i] || 0) + cand.length * this.rate * s.stepped;
      let nEmit = Math.floor(a);
      this._acc[i] = a - nEmit;
      for (; nEmit > 0; nEmit--) {
        const org = cand[Math.floor(this.rnd() * cand.length) % cand.length];
        const f = org.frame, L = org.len;
        this._emit(f.o[0] + f.x[0] * L, f.o[1] + f.x[1] * L, f.o[2] + f.x[2] * L,
          L * 0.4);
      }
    }
    if (dt <= 0) return;

    // drift: wind at the grain, plus settling; a grain leaves the story on the
    // ground (which is a real disc at y = -0.01 now, 25_ground.js), past the
    // rim of the clearing, or when its time is up. The wind field is the
    // hero's, which IS the field: makeSpecimen hands the same one to every
    // later specimen (40_boot.js).
    const wf = specs[0].S.plant.wind, b = this.buf, w = this._w, st = this.stat;
    const rE = this.rEdge, rE2 = rE * rE;
    // substep, so a fast-forward integrates the same trajectory the watched
    // page does (_substep, above). nSub is 1 in real time.
    const h = this._substep(wf), nSub = Math.max(1, Math.ceil(dt / h));
    for (let k = 0; k < nSub; k++) {
      const dts = dt / nSub, ts = t - dt + dts * (k + 1);
      for (let i = 0; i < this.n;) {
        const o = i * 7;
        windAt(w, wf, b[o], b[o + 1], b[o + 2], ts);
        b[o] += w[0] * dts;
        b[o + 1] += (w[1] - this.vs) * dts;
        b[o + 2] += w[2] * dts;
        this.age[i] += dts;
        // brightness envelope: ease in at the anther, out at the end of life
        const env = Math.max(0, Math.min(
          this.age[i] / C.fadeIn, 1, (C.life - this.age[i]) / C.fadeOut));
        b[o + 3] = this.col[0] * env;
        b[o + 4] = this.col[1] * env;
        b[o + 5] = this.col[2] * env;
        let dead = 0;
        if (b[o + 1] < 0) { st.ground++; dead = 1; }
        else if (this.age[i] > C.life) { st.age++; dead = 1; }
        else if (b[o] * b[o] + b[o + 2] * b[o + 2] > rE2) { st.edge++; dead = 1; }
        if (dead) {
          const l = --this.n;
          if (i !== l) {
            b.copyWithin(o, l * 7, l * 7 + 7);
            this.age[i] = this.age[l];
            continue;   // re-examine the swapped-in grain
          }
        } else i++;
      }
    }
  }
}
// A harness feature test (test/flowers_pollen.mjs): this population is handed
// the whole FIELD, where the phase-2 one took a single specimen. Kept so the
// before/after can be measured from either revision with one harness.
FlPollen.prototype.takesField = true;
