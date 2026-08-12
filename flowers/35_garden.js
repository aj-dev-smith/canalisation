// The garden: a PLAN for N specimens, and the floral-form config shared by the
// hero and every garden member.
//
// flGardenPlan is flowers' answer to App.plantGarden (70_app.js:843), with the
// two defects ROADMAP 10b names fixed at the planning stage:
//   - species are dealt WITHOUT replacement — a shuffled deck, reshuffled when
//     exhausted — because the shipped picker sampling with replacement turned
//     a stand of seven from a catalogue of eight into four species;
//   - 'Ashfall Spire' is skipped: the conifer never flowers (florigenRate 0)
//     and this piece is titled flowers.
// Placement is a FIELD, not a ring: dart-thrown over a disc whose radius grows
// with sqrt(N) so areal density is constant, at a minimum spacing MEASURED off
// what a grown specimen occupies. startAt germinates a first cohort at once and
// spreads the rest over FL_GARDEN_STAGGER world steps — the piece is "growing a
// garden", so the growth IS the show. Everything is drawn from one mulberry32
// stream off the base seed: the URL fully decides the field, same discipline as
// everything else here.
//
// WHERE A PLANT STANDS WAS NEVER A SIMULATION RESULT (tools/README.md, the
// Blender bridge's arc). Placement is staging, in the allowed environment
// category with the air and the ground; nothing here says anything about a
// plant's shape.

// Total plant.step() calls per frame across the whole garden, in real time.
// The budget is a POOL (plantGarden's warm-budget discipline): when the field
// wants more steps than the pool holds, the world clock itself slows — a heavy
// frame slows garden time instead of killing fps. 8 covers a solo specimen's
// per-frame maximum (6) with headroom, so the single-specimen page never feels
// the cap; a field of 12 in canalisation runs at ~2/3 step per plant per frame.
const FL_STEP_BUDGET = 8;
// During ?ff= the budget is the solo fast-forward chunk (40): ff is a harness
// affordance, not a watched scene, and it must still pay every step honestly.
const FL_STEP_BUDGET_FF = 40;
// HOW MUCH ROOM A SPECIMEN TAKES, MEASURED RATHER THAN CHOSEN. The shipped
// 2.5 was set by eye against a single flower's corolla, and it was wrong by
// nearly 4x in the direction that shows: at garden=7 seed=21 two specimens had
// grown THROUGH each other. Grown headlessly, all 8 flowering species x all 4
// forms at 3000 steps, taking horizontal reach hypot(x,z) off the DRAWN
// streams (the same argument as floralBounds: measure what is on screen, not a
// guess reconstructed from organ lengths). Units; WORLD.unitM = 0.0625 m/unit.
//
//   species              maxR (worst form)   r90 (worst form)   height
//   Abyssal Frond            22.13  daisy        9.24  double    48.5
//   Cathedral Fern           21.56  daisy        6.16  daisy     43.8
//   Spiral Ossuary           20.60  daisy       16.77  daisy     42.6
//   Sun Coral                12.86  daisy        6.03  daisy     46.6
//   Nightglass Parasol       10.62  double       5.85  double    10.8
//   Ember Creeper            10.44  abc          7.54  abc       23.1
//   Hoarfrost Thicket         9.75  daisy        6.53  daisy     18.2
//   Sulphur Rosette           3.38  abc          1.89  abc        4.5
//   over 32 cells: maxR min 3.37 / med 9.49 / max 22.13
//                  r90  min 1.22 / med 5.76 / max 16.77
//
// maxR is one flopping arm — a daisy bolts a 9-10 unit peduncle and throws it
// sideways at tropism 0.002 — so FULL clearance for two median neighbours is
// 19.0 units and for the two worst 44.3. That field is too sparse to read as a
// field: at 44 units apart plants 20-48 units tall stop being a stand and
// become a row of isolated specimens.
//
// ⚠ SO THIS IS A STATED FRACTION AND IT SHOULD BE READ AS ONE. 12 units is
// FULL clearance of two median BODIES (r90, 11.5) and 63% of full clearance of
// two median ARMS. Two neighbours' outermost peduncles may cross; their bodies
// do not, which is what a meadow looks like and what the interpenetration
// defect actually was. It is 4.8x the shipped value.
const FL_GARDEN_SPACING = 12;
// Field radius per specimen, from constant areal density. N discs of radius
// s/2 saturate a dart-thrown (random sequential adsorption) disc at ~0.547
// area fraction, so N_sat = 2.19 (R/s)^2; sizing the clearing at ~1.5x the
// count it can hold keeps the acceptance rate high without pushing every
// specimen to the rim (which is what maximising the minimum distance does, and
// it draws a fairy ring). R = s*sqrt(1.5 N/2.19) = 0.83 s sqrt(N).
const FL_FIELD_PACK = 0.83;
const FL_GARDEN_STAGGER = 1200;   // world steps over which germination spreads
// ...but not from step 0: a first COHORT germinates together so the opening
// frames are a field and not one plant alone in a clearing. At the shipped
// 2400 with every startAt uniform-random, garden=7 had 2 of 7 up at step 1100
// (measured, by looking). The boot loop constructs at most one member per
// frame, so a cohort costs that many frames of construction, not a hitch.
const FL_GARDEN_COHORT = (n) => Math.max(2, Math.min(4, Math.ceil(n / 3)));

const FL_FORMS = ['abc', 'columbine', 'daisy', 'double'];

// The homeotic form config, extracted verbatim from flBoot so each garden
// member gets its own form off its own seed. Same reads of `q`, same order,
// same defaults as the single-specimen path always had — the reference
// harness (formref) holds this to byte identity against HEAD's inline block.
// Returns the form name it applied.
function flApplyForm(S, name, seed, q) {
  const form = q.get('form') || FL_FORMS[seed % FL_FORMS.length];
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
  if (form === 'columbine') {
    // THE SPURRED FLOWER — Aquilegia's plan, read off the same bands. Two
    // moves the other forms don't make: B-class expression expands OUTWARD
    // into whorl 1 (wb.sepalPetaloid — a columbine's showy outer whorl is
    // petaloid sepals, the same homeotic lever as the double but pointed the
    // other way), and the petal whorl carries a NECTAR SPUR — its proximal
    // sheet domain rolled closed and elongated backward by phase-II cell
    // anisotropy (Puzey et al. 2012 [D], see 12_form.js; the tube's taper is
    // the margin's own base width, not a drawn cone). The BICOLOR is the
    // A. coerulea read: sepals wear the species' full petal colour, blades
    // pale toward cream — one palette split, species identity kept.
    // Program measured (col_probe, Ember 21, step 5200): renew .70 + dome 3
    // + cap 32 founds 17-24 organs per flower; the q-zero founding pile IS
    // the sepal whorl (~7), petals band to .28 (~8-11 spurred), stamens to
    // .75, and the fruit itself is the pistil at the centre.
    const rn = Math.min(0.9, Math.max(0, +(q.get('renew') || 0.70)));
    const over = {
      whorlBands: {
        sepal: +(q.get('sepal') || 0.02),
        stamen: +(q.get('stamen') || 0.28),
        carpel: +(q.get('carpel') || 0.75),
        sepalLen: 0.32,          // the showy outer whorl: sepals half again a petal
        petalLen: 0.26,          // blades shortish — the spur is the length
        stamenLen: 0.13, filament: 1.5, style: 1.5,
        sepalPetaloid: 1,
        spur: {
          uS: +(q.get('us') || 0.30),
          aniso: +(q.get('aniso') || 6),
          // pi + petalTilt maps every petal's spur to the SAME world
          // direction — anti-parallel to the flower's axis — so the five
          // tubes descend behind the corolla as a parallel ring, which is
          // the columbine silhouette. Measured at three angles: +0.35
          // converges under the fruit, -0.85 bundles over the crown.
          angle: Math.PI + +(q.get('spurang') || 0.8),
        },
      },
      apexRenew: rn, floralOrgans: 32, floralDome: 3.0,
      // a SMALL receptacle: the whorls nest on the dome they were founded on
      // (sepals at the rim, the pistil at centre), the organs ride the tip —
      // and floral elongation below them becomes the PEDICEL, which is how a
      // real columbine carries each flower clear of its own foliage. Without
      // this the axillaries sat 0.24 units off the trunk (the round-3
      // unphotographable case) and the director could only shoot the
      // terminal, fruit-first.
      receptacle: +(q.get('disc') || 0.25),
      floralElong: 0.30, floralStretch: 0.08, floralNode: 0.008,
      tropism: 0.004,
      floralGrace: 1200, organBudget: 260, maxOrgans: 120,
      // blades cup forward (a columbine's corolla is a crown, not a splay);
      // sepals spread on the leaf tilt they inherited
      petalGrade: 0.15, petalTilt: 0.8, zygomorphy: 0,
    };
    S.sp = { ...S.sp, ...over };
    Object.assign(S.plant.sp, over);
    const pp = S.petalPal;
    const mixc = (a, b, t) => a.map((v, k) => lerp(v, b[k], t));
    // sepals: the species' petal colour at full depth, tips held back from
    // the pale gradient so the outer whorl reads saturated behind the blades
    S.sepalPal = { ...pp, blade1: mixc(pp.blade1, pp.blade0, 0.55) };
    // blades: paled toward cream — the bicolor. Held back from full white:
    // at 0.60/0.72 the blades saturated through the velvet sheen and the
    // bloom chain into white blotches (the anther lesson, arriving through
    // albedo), and the nectar guides need pigment left to bite on
    S.petalPal = { ...pp,
      blade0: mixc(pp.blade0, [0.97, 0.95, 0.90], 0.35),
      blade1: mixc(pp.blade1, [0.99, 0.97, 0.93], 0.48),
      glow: pp.glow * 0.85 };
    // a columbine's pistil is a sheaf of slender follicles, not a berry —
    // fruitScale is a draw-time scalar (fruitShell only), so this changes
    // what the centre weighs in the frame and nothing in the simulation
    const fsO = { fruitScale: S.sp.fruitScale * 0.55 };
    S.sp = { ...S.sp, ...fsO };
    Object.assign(S.plant.sp, fsO);
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
  return form;
}

// flGardenPlan(baseSeed, n, { radius, heroName }) -> [{ name, seed, origin,
// startAt }]. Entry 0 is the hero: the URL's seed, startAt 0, standing at the
// clearing's centre — every close-up affordance (?focus=flower, the cull, the
// bullseye draw, the pollen) stays pointed at specimen 0. heroName pins its
// species (an explicit ?species=); null lets the deck deal it, and either way
// the hero's species counts against the first deal so a default field of 8 is
// 8 distinct species.
function flGardenPlan(baseSeed, n, opts = {}) {
  // The clearing scales with the count so density is roughly constant. The
  // shipped default was a FIXED 7 — a circle whose circumference cannot hold
  // seven plants of measured reach 9.5-22, which is why the wide shot bunched
  // six into one column. ?radius= still overrides, floored at one spacing.
  const rad = isFinite(opts.radius)
    ? Math.max(FL_GARDEN_SPACING, opts.radius)
    : FL_FIELD_PACK * FL_GARDEN_SPACING * Math.sqrt(Math.max(1, n));
  const r = mulberry32((baseSeed ^ 0x517cc1b7) >>> 0);
  const pool = Object.keys(SPECIES).filter(nm => nm !== 'Ashfall Spire');
  let deck = [], firstDeal = true, lastDealt = null;
  const draw = () => {
    if (!deck.length) {
      deck = pool.slice();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = (r() * (i + 1)) | 0;
        const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      if (firstDeal && opts.heroName) {
        const k = deck.indexOf(opts.heroName);
        if (k >= 0) deck.splice(k, 1);
      }
      // WITHOUT REPLACEMENT ACROSS THE RESHUFFLE BOUNDARY TOO. A shuffled deck
      // deals distinctly WITHIN a pass and says nothing about the seam: at
      // n > 8 the last card of one deck and the first of the next can be the
      // same species, which puts two of a kind side by side in a field whose
      // whole point is that they differ. draw() pops the tail, so it is the
      // tail that has to move.
      if (!firstDeal && lastDealt !== null && deck.length > 1
        && deck[deck.length - 1] === lastDealt) {
        const t = deck[deck.length - 1];
        deck[deck.length - 1] = deck[0]; deck[0] = t;
      }
      firstDeal = false;
    }
    lastDealt = deck.pop();
    return lastDealt;
  };

  // GERMINATION SCHEDULE, laid out before the loop so a member knows its own
  // slot. Cohort 0 (the hero and its first neighbours) starts at once; the
  // rest are spread EVENLY over the stagger with jitter narrower than the gap,
  // so the field fills in steadily instead of clumping the way N uniform draws
  // do (garden=7 at the shipped 2400 dealt three startAts inside 300 steps and
  // then nothing for 900).
  const cohort = Math.min(n, FL_GARDEN_COHORT(n));
  const later = Math.max(0, n - cohort);
  const startAts = [];
  for (let i = 0; i < n; i++) {
    if (i < cohort) { startAts.push(0); continue; }
    const k = i - cohort;
    const gap = FL_GARDEN_STAGGER / (later + 1);
    startAts.push(Math.max(0, Math.round(gap * (k + 1) + (r() - 0.5) * gap * 0.7)));
  }

  const plan = [];
  for (let i = 0; i < n; i++) {
    let origin = [0, 0, 0];
    if (i > 0) {
      // DART THROWING over the disc, uniform in AREA (d = R*sqrt(u), not
      // R*u — the second crowds the centre), accepting the first candidate
      // that clears FL_GARDEN_SPACING against every origin already placed.
      // Two departures from the ring this replaces, both deliberate:
      //   - candidates are drawn over the whole disc rather than from a fixed
      //     angular slot at a fixed-ish distance, so the field has DEPTH —
      //     some plants near the eye, some far — instead of every specimen
      //     sitting at one radius, which reads as a fairy circle;
      //   - the fallback keeps the BEST failed try rather than the LAST, so a
      //     genuinely crowded clearing degrades to maximum spacing instead of
      //     to whatever the 24th throw happened to be (which could, and at
      //     spacing 2.5 routinely did, land on top of a neighbour).
      let best = null, bestD = -1;
      for (let t = 0; t < 48; t++) {
        const a = r() * TAU, d = rad * Math.sqrt(r());
        const c = [Math.cos(a) * d, 0, Math.sin(a) * d];
        let dmin = Infinity;
        for (const p of plan) {
          const dd = Math.hypot(c[0] - p.origin[0], c[2] - p.origin[2]);
          if (dd < dmin) dmin = dd;
        }
        if (dmin > bestD) { bestD = dmin; best = c; }
        if (dmin >= FL_GARDEN_SPACING) break;
      }
      origin = best;
    }
    plan.push({
      name: i === 0 && opts.heroName ? opts.heroName : draw(),
      // plantGarden's stride. (baseSeed + i*7919) mod 2^32 is injective for
      // any i < 2^32/7919, so no two members of a field of 12 can share a
      // seed — a shared seed is an identical twin plant, and a viewer sees it.
      seed: i === 0 ? baseSeed : (baseSeed + i * 7919) >>> 0,
      origin,
      startAt: startAts[i],
    });
  }
  return plan;
}
