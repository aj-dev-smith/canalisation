// THE GARDEN DIRECTOR — a shot list for a FIELD.
//
// The shipped director (70_app.js, and the solo half of 40_boot.js) frames ONE
// subject: it finds the plant's bound, backs off 2.35 radii and holds. Pointed
// at a garden that law does the only thing it can — it frames the bound of
// EVERY specimen at once, which is a sphere containing a 46-unit hero, a plant
// flung to the far edge of the ring, and a lot of air. Measured on
// ?garden=7&seed=21&ff=3000: radius 36.1, camera 84.2 units out, six plants
// bunched into one overlapping column and most of the frame empty. A field
// photographed from far away and above is not a field; it is a diagram of one.
//
// So this file is a director rather than a framer. Three ideas, all staging —
// where a camera stands was never a simulation result, the same category as
// where a plant stands (tools/README.md, the Blender bridge's arc):
//
//  1. A FIELD READS FROM LOW AND NEAR, LOOKING ACROSS. The eye sits at roughly
//     a fifth of flower height (2-3 units, ~15 cm in WORLD.unitM — a mouse's
//     eye, not a drone's), just outside the ring, aimed at a point PAST the
//     centre so the near plants are cut by the frame edges and the far ones
//     stand small against the fog. Depth comes from the plants themselves
//     occluding each other, which is exactly what the overhead shot destroys.
//  2. A SHOT LIST, NOT A SHOT. The piece grows over minutes and one framing is
//     dead after twenty seconds. Five shots cycle: the establishing frame that
//     says what this place IS, a bank shot inside the thicket, a dolly across
//     it at flower height, a close-up on the best flower ANYWHERE in the
//     field, and a low upward shot with the plants against the sky glow.
//  3. THE VIEWER OWNS THE CAMERA WHEN THEY TOUCH IT, and for much longer than
//     the solo page's six seconds — see FL_DIR_ORBIT_HOLD.
//  4. NOTHING EVER STOPS MOVING. A shot that has arrived at its pose is a
//     still, and a still with a 0.6 Hz stem swaying in it reads as a freeze
//     frame with a bug in it rather than as a held frame. Every shot carries a
//     perpetual drift at ONE screen-referred rate — see FL_DRIFT — and the
//     transitions are paced off the DISTANCE they cover rather than off a
//     constant, so the whole film moves at one speed.
//
// NOTE ON LOAD ORDER, which is the 25_ground.js pitfall in its other form:
// this file sorts AFTER 40_boot.js, and 40_boot.js calls flBoot() at its own
// top level, so every `const` here is in its temporal dead zone at boot time.
// Function declarations are hoisted across the whole one-scope bundle and are
// safe; the constants are not. The director is therefore built LAZILY, on the
// first updateFraming() — which runs inside requestAnimationFrame, after the
// bundle has finished executing. Do not construct it at boot.

// --- the shot list. Holds are in SECONDS and every one of them was set by
// eye, the category this project says only an eye can settle. The rule used
// was: a shot must outlast the viewer's first read of it (what is that, where
// am I, what is it doing) and stop before it becomes a still. The dolly is
// longest because it is the only shot that is going somewhere; the low shot is
// shortest because it is a punctuation mark, not a scene.
//
// FIVE SHOTS, NOT FOUR. `wide` used to be the pose now called `bank`, and it
// was not wide: it distanced off the MEDIAN FLOWER height (5.9-13.8 units on
// ?garden=7&seed=21) while the plants standing there are 4.4-49.2 tall, so it
// framed flowers at eye level and every tall specimen ran out of the top of
// the picture. That frame is a good frame — it is the inside of the stand,
// petals across the whole width — and it survives under its own name. What it
// cannot do is say what the place IS, so `wide` is now solved from the PLANT
// bounds (flDirPoseEstab) and `bank` is the thicket.
//
// The holds were re-balanced rather than kept, because five shots at the old
// numbers is a 117 s loop:
//     wide   16   the establishing read: count them, find the ground, then go
//     bank   12   the same field from inside it; dense, so it reads fast
//     dolly  18   still the longest — the only shot that is going somewhere
//     close  16   the subject
//     low     9   punctuation
// 71 s of hold + ~28 s of transition = ~99 s, against 92 s for the old four
// (72 + 20). One more shot for six and a half seconds of cycle.
//
// `hold` is a BASE now: the two shots that have a subject stretch or shrink it
// by up to a third with how good that subject is (flDirDwell). `trans` is gone
// — a transition is paced by the distance it covers (flDirPace), which lands
// within 0.4 s of both numbers this table used to carry.
//
// SIX SHOTS NOW, AND THE SIXTH IS THE ONLY ONE THAT GOES THROUGH. `glide` is a
// tracking move down a lane between the specimens (flDirPoseGlide). It holds
// 26 s — longer than any pose, because a traverse whose dwell is a pose's dwell
// is a nudge — and it sits between `bank` and `dolly`, so the film reads as
// outside, inside, through, across, at, up. The cycle is ~127 s against ~99.
const FL_DIR_SHOTS = [
  { name: 'wide', hold: 16 },
  { name: 'bank', hold: 12 },
  { name: 'glide', hold: 26 },
  { name: 'dolly', hold: 18 },
  { name: 'close', hold: 16 },
  { name: 'low', hold: 9 },
];
// A TRANSITION IS PACED BY ITS OWN LENGTH, NOT BY A CONSTANT — and that
// derivation reproduces both of the numbers it replaces, which is the reason to
// trust it. Those numbers were 5.0 s for four shots and a hand-added 7.5 s for
// `wide`, and the note that set them did the arithmetic out loud: a smoothstep
// peaks at 1.5x its mean, the worst ordinary move at ?garden=7 is ~87 units and
// took 5 s (17.4 u/s mean, 26 at the peak), and the establishing frame stands
// at 88.7 units where `bank` stands at 47.9, which makes that move ~136 units
// and wanted 7.5 s to peak at the same 27.
//
// So the constant that was actually being held fixed across both was the PEAK
// SPEED, and the two durations are what it implies:
//
//     trans = 1.5 * distance / FL_DIR_VPEAK,  clamped
//
// 87 units -> 5.02 s and 136 -> 7.85 s, against the 5.0 and 7.5 that were set
// by hand. It is worth having as a law rather than as two numbers because the
// director's distances are not fixed: ?garden=12 is a 107-unit-wide field where
// ?garden=3 is 31, and the close-up's move length depends on which flower won.
// 26 u/s is 1.63 m/s in WORLD.unitM — a walk. The clamp keeps a 6-unit nudge
// from cutting in a quarter of a second and a ?garden=12 crane from taking
// fifteen; both ends were hit in the shipped range.
const FL_DIR_VPEAK = 26;
const FL_DIR_TRANS = [3.5, 9.0];   // seconds, [min, max]
function flDirTrans(dir) {
  return dir.transS || 5.0;
}
// Called by each pose on the frame it cuts on, once the pose it is moving TO is
// known. `pt` is the point the eye is travelling to — wantEye for the four
// field poses, and the subject's own corolla centre for the close-up, whose
// final standoff is a few units and is set inside the shipped framer rather
// than here (over-estimating a 40-unit move by 8 units is a third of a second).
function flDirPace(dir, x, y, z) {
  if (!dir.cut) return;
  flDirPrice(dir, Math.hypot(x - dir.fromEye.x, y - dir.fromEye.y, z - dir.fromEye.z));
}
// the law itself, over a DISTANCE. Split out because the crane (flDirArc) has to
// re-price the same move off the length of the path it will actually fly rather
// than off the straight line between its ends, and two copies of a clamp is how
// two of them end up different.
function flDirPrice(dir, d) {
  dir.transS = Math.max(FL_DIR_TRANS[0],
    Math.min(FL_DIR_TRANS[1], 1.5 * d / FL_DIR_VPEAK));
}
// How far through the whole shot (transition + hold) we are. The dolly's travel
// is a function of this, so it has to be the SAME number the shot clock cuts
// on — the two used to be computed in different files off different holds.
function flDirU(dir) {
  const sh = FL_DIR_SHOTS[dir.shot];
  return Math.min(1, dir.el / (flDirTrans(dir) + sh.hold * (dir.holdK || 1)));
}

// --- THE PERPETUAL DRIFT, and it is ONE number for the whole film. ---
//
// A pose that has been reached is a still. The four field poses are recomputed
// identically every frame and the camera lerps onto them in about a second, so
// three of the five shots spent most of their hold frozen; the close-up's three
// exponential lerps do the same thing more slowly. A garden with a 0.6 Hz stem
// mode swaying inside a locked frame does not read as a held shot, it reads as
// a paused one.
//
// The rate is SCREEN-REFERRED, which is the only frame in which "gentle" means
// anything: the picture translates by FL_DRIFT of its own width per second,
// whatever the shot's distance. The frame at distance d is `fovH*d` units tall
// and `A*fovH*d` wide, both read off the live camera (flDirLens) exactly as the
// establishing pose reads them. Two consequences worth stating:
//
//   - A LATERAL DRIFT IS DISTANCE-SCALED. 0.75%/s at the establishing shot's
//     88.7 units is 0.70 u/s = 4.4 cm/s in WORLD.unitM; at the close-up's ~8
//     units it is 0.06 u/s = 0.4 cm/s. Same speed on screen, two orders apart
//     in the world — which is the whole point, since a viewer sees the screen.
//   - AN ORBIT IS A CONSTANT ANGULAR RATE, because v = omega*d and the rate
//     scales with d: omega = FL_DRIFT * A * fovH = 0.0080 rad/s = 0.46 deg/s,
//     the same in every shot at every distance. That is why the orbit is added
//     to the shot HEADING (flDirAng) rather than to each pose: all four field
//     poses put their eye and their target on that heading, so one term arcs
//     the eye and swings the aim together, and the close-up gets the same arc
//     for free through flDirOutward.
//
// 0.0075 is BY EYE and it is the one number here an eye had to settle — the
// same category as the wind's uRef and the needle-fade threshold. What is
// derived is that a single fraction can serve every shot at once. Read it as
// "the frame slides about a sixth of its own width across a twenty-second
// shot"; at 1.5x it reads as a move rather than a drift, and at half it is
// indistinguishable from the sway.
//
// MEASURED, on the film rather than on the code — `node tools/flowers_clip.mjs
// shots/cine 'garden=7&seed=21&ff=3000' 150`, which records the tab and reports
// the camera's own speed. Against the same 150 s before this landed:
//
//     STATIONARY (under 0.1 %frame/s)   15.1%  ->  0.0% of samples
//     peak speed                        43.7   ->  27.3 u/s   (VPEAK is 26)
//     capture, weighted over the loop   58.5   ->  61.1 ms
//
// and the drift itself, as the slow decile of each shot's own screen rate —
// what the camera is doing once it has arrived, in %frame/s:
//
//     wide  0.101 -> 0.805    bank 0.021 -> 0.580    low 0.015 -> 0.485
//     close 0.873 -> 0.723    dolly 2.114 -> 3.635
//
// Those five numbers say exactly where the defect was. The three static poses
// were at a fiftieth to a hundredth of the drift they carry now — frozen, and
// the 15.1% is them. The CLOSE-UP was never the offender and is slightly slower
// than it was: its three exponential lerps take a long time to converge, so it
// always crept. The dolly is its own travel and is faster only because it no
// longer decelerates into the cut.
//
// The last line is the one to check when touching this: camera motion dirties
// a capture (40_boot's camMoved), and a drift that never stops could in
// principle have made every frame a recapture. It cannot, and the reason is
// structural rather than lucky — camMoved only ever redraws the HERO, and only
// while the close-up's sight-line cull is engaged, so four shots in five are
// untouched by a moving camera by construction.
const FL_DRIFT = 0.0075;
// The lens, cached on the director once a frame: kw = frame widths, kh = frame
// heights, per unit of distance. Read rather than written down because a window
// is not 1.41 wide by decree — the same argument flDirPoseEstab makes.
function flDirLens(dir, cam) {
  const fovH = 2 * Math.tan(cam.fov * Math.PI / 360);
  dir.kh = fovH;
  dir.kw = Math.max(0.5, cam.aspect) * fovH;
}
// Drift elapses over the SHOT, not forever. ?shot=wide pins the director and
// leaves el running unbounded, and a drift linear in el would have craned the
// establishing eye a hundred units up by the time a capture tool had settled.
// It saturates where the cut would have come.
function flDirDriftT(dir) {
  const sh = FL_DIR_SHOTS[dir.shot];
  return Math.min(dir.el, flDirTrans(dir) + sh.hold * (dir.holdK || 1));
}
// The orbit, in radians: a constant angular rate, sign alternating per cut so
// the film does not spend ten minutes turning one way.
function flDirOrbit(dir) {
  return dir.spin * FL_DRIFT * (dir.kw || 1.06) * flDirDriftT(dir);
}
// How long a drag owns the camera. The solo page uses 6 s, which is right for
// one subject in the middle of the frame: you turn it, you look, it resumes.
// A field is a place — a viewer who drags is walking around IN it, past plants
// that are not the subject, and six seconds means the director hauls them off
// the thing they went to look at. 25 s, by eye.
const FL_DIR_ORBIT_HOLD = 25;
// The field is re-measured every 500 ms (40_boot). The scan touches every axis
// point and every floral bound of every specimen, so it is throttled; nothing
// it measures moves fast enough for half a second of staleness to show.
// The eye never goes below this. The ground is a real plane at y = 0 now
// (25_ground.js) and a camera under it shoots up through a screen-filling
// ceiling of soil. 40_boot clamps at 0.5 as a backstop; the director aims to
// never reach the clamp, because a clamped eye is a framing that silently
// stopped being the one that was computed.
const FL_DIR_EYE_FLOOR = 1.0;
// ⚠ A THUMB ON THE SCALE FOR THE HERO, AND IT IS PAYING FOR A LIMITATION
// ELSEWHERE. The sight-line clearance in 40_boot's heroCull is specimen 0's
// alone — the members are captured cull-less — and in a stand this dense that
// clearance is the difference between a photographed corolla and a wall of
// leaf: measured on ?garden=7&seed=21, the hero close-up draws in 33.9 ms with
// the flower visible, while ?focus=flower on a Cathedral Fern two plants over
// is 131 ms of the subject's own blades across the lens. 1.25 is small enough
// that a clearly better flower elsewhere still wins. DELETE IT the day the
// cull follows the subject instead of the hero — that is one line in
// captureDirty (`i === 0 ? cull : null`) plus a spec index on heroCull's
// return, and it is the highest-value follow-up this director has.
const FL_DIR_HERO = 1.25;

// A fresh director. Lazily, from updateFraming — see the load-order note.
function flDirMake() {
  return {
    shot: 0, t0: -1e9, el: 0, ang: 0.9, flip: 0, jit: 0,
    fromEye: new THREE.Vector3(), fromTgt: new THREE.Vector3(), fromR: 8,
    wantEye: new THREE.Vector3(), wantTgt: new THREE.Vector3(),
    field: null, scan: -1e9, subj: null, pickT: -1e9, cut: true,
    // the drift and the pacing: which way this shot orbits, how long its move
    // was paced at, how long its hold was stretched to, and the lens the
    // screen-referred rate is measured in
    spin: 1, transS: 5.0, holdK: 1, sAvg: 0, kw: 1.06, kh: 0.752,
    // the crane between shots: how high this move rises over the canopy it
    // would otherwise have gone through, solved once on the cut (flDirArc), and
    // — for the close-up alone, whose eye is the shipped framer's own state —
    // how much of that rise is currently sitting on the camera
    liftA: 0, arcAt: -1, lifted: 0, liftedT: 0,
  };
}

// THE FIELD, measured rather than assumed: where the germinated specimens
// stand, how far out the ring reaches, and — the number the INSIDE shots are
// built on — how high the FLOWERS are. Not how high the plants are: this
// garden's tallest specimen is a 46.6-unit Sun Coral whose flowers all sit
// between 5.9 and 13.8, so a framing off plant height points the camera at
// bare stem. Medians, not extremes, for the same reason.
//
// TWO MORE NUMBERS, AND THEY ARE THE OTHER HALF OF THAT SENTENCE. An
// establishing frame has the opposite job: it must contain the PLANTS, so it
// is solved from `hHi` (how tall the field is) and `Rout` (how wide, canopy
// included — an origin is a stem and the plant standing on it reaches out).
// Both are 85th percentiles for the reason `R` is a 75th: a dart-thrown field
// regularly hands one member a veto. Measured on ?garden=7&seed=21, an Ember
// Creeper sprawls 46.7 units from its own origin — twice the whole ring's
// spacing — and takes the field's outer radius from 30.6 (p85) to 62.4 (max).
// Framing off that one axis doubles the standoff and photographs a clearing
// nobody is standing in. Height loses nothing to the same treatment there
// (p85 48.0 against max 49.2); at ?garden=12 it is 44.8 against 49.9.
// THE PLAN HULL of a set of (x, z) pairs — Andrew's monotone chain, lower and
// upper, returned counter-clockwise. This is here because the questions the
// director asks about the field's SHAPE are all support-function questions
// ("how wide is it seen from there"), and a support function is exact and cheap
// on a hull and wrong on any rounder summary. Measured on ?garden=7&seed=21 the
// field is 882 drawn stations and its plan hull is a dozen vertices, so every
// heading query below is a dozen dot products.
function flHull(pts) {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  lo.pop(); up.pop();
  return lo.concat(up);
}

function flDirField(specs) {
  let n = 0, sx = 0, sz = 0;
  // `plan` is every drawn STATION; `drawn` is that plus where every organ
  // REACHES. They answer different questions and are kept apart on purpose:
  // where the plants stand (the heading, the hull) is a question about stems,
  // and what is in the way of a lens (clearance, the traverse's lane) is a
  // question about lamina. A blade on this catalogue is 10 to 22 units long
  // against a station spacing of about one, so the two are not close.
  // `solid` is `drawn` WITH ITS HEIGHT KEPT — [x, z, y] rather than [x, z]. It
  // exists because a fly-over is a question about the coordinate a plan throws
  // away: "what is standing where the path crosses, and how tall is it". Same
  // two sources, same points, one more number each. Kept beside `drawn` rather
  // than replacing it because the lane solve and flDirClearance are 60-heading
  // sweeps over that array and neither of them wants the third column.
  const fh = [], hs = [], pos = [], reach = [], plan = [], drawn = [], solid = [], tops = [];
  for (const s of specs) {
    if (!s.S) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    sx += o[0]; sz += o[2]; n++;
    let ymax = 0, rch = 0;
    for (const ax of s.S.plant.axes) {
      // THE SKYLINE, one point per axis: the highest station on it. That is
      // what a low camera reads against the sky, and it has to be per AXIS and
      // not per specimen — a plant's silhouette is made of all its shoots, and
      // the tallest station of the whole specimen is one point of it.
      let bt = null;
      for (const p of ax.pts) {
        if (p[1] > ymax) ymax = p[1];
        const rr = Math.hypot(p[0] - o[0], p[2] - o[2]);
        if (rr > rch) rch = rr;
        plan.push([p[0], p[2]]);
        drawn.push([p[0], p[2]]);
        solid.push([p[0], p[2], p[1]]);
        if (!bt || p[1] > bt[2]) bt = [p[0], p[2], p[1]];
      }
      if (bt) tops.push(bt);
      // and where this axis's organs reach: an organ is drawn from its own
      // frame outward along that frame's x by about its length, so half-way and
      // all the way out are two points that bracket a blade. `len` rather than
      // drawnBladeLen — a clearance test should over-state, and a senescing
      // blade that has shortened is still tissue in the air.
      for (const org of ax.organs) {
        const fr = org.frame;
        if (!fr || !(org.len > 0.05)) continue;
        drawn.push([fr.o[0] + fr.x[0] * org.len * 0.5, fr.o[2] + fr.x[2] * org.len * 0.5]);
        drawn.push([fr.o[0] + fr.x[0] * org.len, fr.o[2] + fr.x[2] * org.len]);
        // `solid` gets the organ's axis too, as a floor for the case where a
        // specimen has no buffers yet. What it is actually built from is below.
        for (const kk of [0.35, 0.7, 1.0]) {
          solid.push([fr.o[0] + fr.x[0] * org.len * kk, fr.o[2] + fr.x[2] * org.len * kk,
            fr.o[1] + fr.x[1] * org.len * kk]);
        }
      }
    }
    hs.push(ymax); reach.push(rch);
    // the weight is the specimen's own station count — how much PLANT is
    // standing there. A germinating seedling and a grown Abyssal Frond are one
    // origin each, and a centre that treats them alike aims the camera at the
    // gap between the field and its smallest member.
    let w = 0;
    for (const ax of s.S.plant.axes) w += ax.pts.length;
    pos.push([o[0], o[2], Math.max(1, w)]);
    for (let ai = 0; ai < s.S.plant.axes.length; ai++) {
      if (!s.S.plant.axes[ai].floral) continue;
      const bb = s.B.floralBounds(ai);
      if (bb) fh.push(bb.c[1]);
    }
  }
  if (!n) return null;
  // --- AND THE REST OF `solid` IS THE DRAWN SURFACE ITSELF. -----------------
  //
  // Everything above is a model of where tissue is: stations, and organs sampled
  // along their own AXIS. That model is what `drawn` has always been and it is
  // right for the questions `drawn` answers, which are all support functions in
  // PLAN. It is wrong for "is the lens inside a plant", and the error is not
  // small — a lens does not meet a blade edge-on, and the first version of the
  // crane below found nothing to clear on a path whose true clearance to drawn
  // geometry was 0.46 units, because the nearest axis sample was four away.
  //
  // Inflating each sample to a sphere was tried and it is the wrong repair: an
  // estimated half-width over-states as often as it under-states, and on
  // ?garden=7&seed=1337 it asked for a 36-unit crane where the true geometry
  // wanted none. The buffers are right here. Every specimen's FlowerBuffers
  // holds the triangles, petal grids and vein ribbons that were handed to the
  // GPU, so the director can read the surface rather than guess at it — the same
  // argument frameAxisFlower makes about framing from the DRAWN reach, where two
  // hand-derived versions put the camera inside the corolla.
  //
  // Subsampled to a budget, because a field is 1.5 million vertices and this
  // runs every 500 ms. A blade is thousands of them and one in a couple of
  // hundred still bounds it: the query is a nearest-point, not a rasterisation.
  {
    let nv = 0;
    for (const s of specs) if (s.B) nv += s.B.triN / 10 + s.B.petbN / 16 + s.B.segN / 12;
    const sk = Math.max(1, Math.round(nv / FL_DIR_SOLIDN));
    for (const s of specs) {
      if (!s.B) continue;
      const B = s.B;
      for (let k = 0; k < B.triN; k += 10 * sk) solid.push([B.tri[k], B.tri[k + 2], B.tri[k + 1]]);
      for (let k = 0; k < B.petbN; k += 16 * sk) solid.push([B.petb[k], B.petb[k + 2], B.petb[k + 1]]);
      for (let k = 0; k < B.segN; k += 12 * sk) solid.push([B.seg[k], B.seg[k + 2], B.seg[k + 1]]);
    }
  }
  const med = (a) => {
    if (!a.length) return 0;
    const b = a.slice().sort((p, q) => p - q);
    return b[b.length >> 1];
  };
  // MEDIANS AND PERCENTILES, not extremes. A jittered ring regularly flings
  // one specimen to the far edge (measured on this seed: six plants inside 8
  // units and one at the rim), and a MAX radius hands that one plant a veto
  // over the whole framing — which is exactly what phase 1 did. The centre
  // stays a mean: a componentwise median of a ring is not a point on the
  // ring's inside, and using one put the wide shot 7 units further out than
  // the field it was measuring.
  let cx = 0, cz = 0, wsum = 0;
  for (const p of pos) { cx += p[0] * p[2]; cz += p[1] * p[2]; wsum += p[2]; }
  cx /= wsum; cz /= wsum;
  const ds = pos.map(p => Math.hypot(p[0] - cx, p[1] - cz)).sort((a, b) => a - b);
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  // 75th percentile + a canopy margin: an origin is a stem, and the plant
  // standing on it reaches out. 3.0 is a measured corolla reach (floralBounds
  // r runs 0.5-4.6 across this catalogue; the ring's own spacing is 2.5).
  const R = Math.max(4, pct(ds, 0.75) + 3.0);
  // and the field's own outer bound: each specimen's distance from the middle
  // PLUS what that specimen actually reaches, at the 85th percentile
  const outs = pos.map((p, i) => Math.hypot(p[0] - cx, p[1] - cz) + reach[i]).sort((a, b) => a - b);
  const Rout = Math.max(R, pct(outs, 0.85));
  const hHi = Math.max(2, pct(hs.slice().sort((a, b) => a - b), 0.85));
  const hMid = fh.length ? med(fh) : Math.max(2, med(hs) * 0.55);
  // THE FIELD AS A SET OF DISCS, for the questions that are about a specimen
  // rather than about the field: one disc per germinated specimen on its own
  // origin, with what its stations reach and how tall it is. ⚠ A disc is
  // ISOTROPIC, so a 43-unit trailing arm is modelled as a 43-unit circle. That
  // is the right conservative shape for "could this plant be across the lens
  // from over there" (flDirClearance) and exactly the wrong one for "how wide
  // is the field from over there" — the first version of this heading law used
  // discs and returned a flat sweep, because one dominating disc has the same
  // width in every direction and the argmax then falls on rounding.
  const discs = pos.map((p, i) => [p[0], p[1], reach[i], hs[i]]);
  // THE HEADING, and it is the field's own DIAMETER rather than the covariance
  // of its origins. The old law took the minor axis of the origins' plan
  // covariance and stood on it, so the major axis lay across the frame. That is
  // the right idea measured on the wrong thing: a covariance of ORIGINS weights
  // a 20-station seedling exactly like a 252-station Abyssal Frond and knows
  // nothing about what either of them reaches.
  //
  // What the establishing pose's width condition actually wants is the heading
  // whose ACROSS-FRAME extent is largest, and on the field's plan hull that has
  // a closed form: the extent in a direction is a support width, its maximum
  // over all directions is the set's DIAMETER, and it is attained along the
  // diameter. So the camera stands PERPENDICULAR to the field's own diameter.
  // Swept here at 3 degrees rather than solved pairwise because the sweep is
  // 60 x (a dozen hull vertices) and reads as the thing it is; the error from
  // the grid is (1 - cos 1.5deg), four parts in ten thousand of the width.
  //
  // MEASURED on ?garden=7&seed=21 with tools/flowers_frame.mjs, which stands
  // the establishing eye on every heading in turn and projects every drawn
  // station through it: the field covers 0.584 of the frame's half-width from
  // the covariance heading and 0.777 from the widest one, at the same distance.
  // A third of the picture, for a heading that was already being chosen.
  const hull = flHull(plan);
  let pa = 0, pw = -1;
  for (let d = 0; d < 180; d += 3) {
    const a = d * Math.PI / 180;
    const w = flFieldSpan({ cx, cz, hull }, a).half;
    if (w > pw) { pw = w; pa = a; }
  }
  return { cx, cz, R, Rout, hMid, hHi, hTop: med(hs), pa, n, discs, hull, plan, drawn, solid, tops };
}

// THE FIELD ACROSS THE FRAME, from a heading. `half` is how far the field
// reaches either side of the camera axis and `mid` is where the middle of that
// reach sits — in world units, along the frame's own right vector.
//
// The eye stands at C + D*(cos a, sin a) looking back at C, so the view
// direction is -(cos a, sin a) and the frame's right vector in plan is
// (sin a, -cos a). `mid` is what the establishing pose slides itself sideways
// by: aiming at the field's weighted CENTRE puts the centroid of the origins in
// the middle of the picture, which is not the same point as the middle of what
// is drawn, and the difference is the empty quarter.
function flFieldSpan(F, a) {
  const rx = Math.sin(a), rz = -Math.cos(a);
  let lo = 1e9, hi = -1e9;
  for (const d of F.hull) {
    const u = (d[0] - F.cx) * rx + (d[1] - F.cz) * rz;
    if (u < lo) lo = u;
    if (u > hi) hi = u;
  }
  if (hi < lo) return { half: 1, mid: 0 };
  return { half: (hi - lo) / 2, mid: (hi + lo) / 2 };
}

// The heading a shot is taken from: perpendicular to the field's own diameter
// (flDirField, which is where the derivation is), flipped end for end
// between shots and jittered, so no two consecutive shots come from the same
// side and none of them points at the empty quarter — plus the perpetual orbit,
// which is a term in the HEADING precisely so that every pose built on it arcs
// its eye and swings its aim together instead of sliding sideways.
// ⚠ AND THE BASIS IS FROZEN ON THE CUT, which is the third and last version of
// the same teleport. `F.pa` is the direction of the field's plan DIAMETER, and a
// diameter is not a continuous function of a growing stand: one arm reaching
// past the old extreme swaps which pair of points is furthest apart and swings
// the answer by tens of degrees between two 500 ms measurements. At the
// establishing frame's 90-unit standoff a 30-degree swing is 47 units of eye,
// and 40_boot's 12%-a-frame lerp makes that 5.6 units in one frame — 336 units
// a second against FL_DIR_VPEAK's 26. tools/flowers_clip.mjs found it as six
// samples over 50 u/s in a 290 s film, every one of them inside `wide`, and it
// survived two other fixes aimed at the wrong suspect (the lateral shift, then
// the end re-decision) because all three produce the same signature.
//
// A shot's heading is now decided when the shot begins, like its end, its
// subject, its gap and its lane. Nothing about a held frame should be a function
// of what the plants did while it was being held.
//
// ⚠ EXCEPT WHERE NO CLOCK IS RUNNING. Under ?shot= the director never cuts, so
// a heading frozen on the cut is the one measured on the first frame it ever
// ran — inside the fast-forward, on a stand of seedlings — and a pinned still
// is then a framing of a field that no longer exists. `overrun` is true only
// once the elapsed time has passed this shot's own length, which flDirClock
// makes impossible while it is cutting, so it is exactly the pinned case.
function flDirAng(dir, F) {
  const sh = FL_DIR_SHOTS[dir.shot];
  if (dir.cut || dir.pa === undefined
    || dir.el > flDirTrans(dir) + sh.hold * (dir.holdK || 1)) dir.pa = F.pa;
  return dir.pa + dir.flip + dir.jit + flDirOrbit(dir);
}

// How OPEN a flower is: the mean development of the petals that are drawn.
// org.dev is the same channel the bloom reads (20_draw.js), so "the most open
// flower" is a chemistry question the engine already answered.
function flDirOpenness(ax) {
  let s = 0, n = 0;
  for (const org of ax.organs) {
    if (!org.petal || !(org.len > 0.05)) continue;
    s += org.dev || 0; n++;
  }
  return n ? s / n : 0;
}

// CAN THIS FLOWER BE PHOTOGRAPHED — how much other plant is standing right
// beside it. Every other germinated specimen is a vertical cylinder on its own
// origin; a neighbour within a couple of units of the corolla will cross the
// shot from most of the angles the close-up could take, one three or four
// units away from almost none of them. Floored at 0.45 so this can shade a
// choice between two subjects and never overturn the petal count.
//
// ⚠ THE OBVIOUS VERSION OF THIS IS WRONG AND WAS BUILT FIRST: a sight-line
// test from the CURRENT camera to the flower, penalising every specimen the
// segment passes. It measures the wrong shot. The close-up ends up 4.2 corolla
// radii from its subject, so what can block it is what stands near the FLOWER,
// not what stands near the middle of a 40-unit sight line the camera is about
// to leave. Compounded over seven specimens it also swamped the score:
// measured on ?garden=7&seed=21, it chose a 3-petal Nightglass Parasol
// (base 0.75) over a 26-petal Cathedral Fern (base 8.27), purely because the
// Parasol stands on the rim of the clearing and the Fern stands in it.
function flDirCrowd(specs, self, bb) {
  let k = 1;
  for (const s of specs) {
    if (!s.S || s === self) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    let ymax = 0;
    for (const a of s.S.plant.axes) for (const p of a.pts) if (p[1] > ymax) ymax = p[1];
    if (ymax < bb.c[1] * 0.5) continue;       // too short to reach the shot
    const d = Math.hypot(bb.c[0] - o[0], bb.c[2] - o[2]);
    k *= 0.6 + 0.4 * smoothstep(1.0, 4.5, d);
  }
  return Math.max(0.45, k);
}

// THE BEST FLOWER IN THE FIELD — the shipped bestFlower's score (petals over
// drawn reach, times clearance from its own trunk) with two terms a garden
// adds: how open the corolla is, and how crowded it is by its neighbours.
// Returns { i, ai, bb, score } or null. `eye` is unused by the score and kept
// because the caller has it; see flDirCrowd for why it must not be used.
//
// The subject is picked ONCE per shot and held. A subject that changes
// mid-shot is a cut nobody asked for, and with seven specimens flowering at
// once the top two scores trade places constantly.
// COMPACTNESS, harder than the shipped 1/(0.6+r). A terminal flower's organs
// ride the whole curling apex, so its drawn bound can be a third of the plant
// and a "close-up" of it is a wide shot of a raceme — the shipped comment says
// exactly this, and n/(0.6+r) lets a 26-organ spread at r 2.54 outscore a
// 5-petal corolla at r 1.42 anyway. Garden-only: the solo page's law is
// untouched.
function flDirCompact(bb) {
  return smoothstep(4.0, 1.0, bb.r);
}

// IS THERE ANYTHING IN THE AIR AROUND THIS FLOWER — and the population is asked
// rather than the plant. `tools/flowers_motes.mjs` reports 0 grains of 320 in
// frame at the close-up, and the reason is not the grain size that tool was
// built to measure: on ?garden=7&seed=21 the subject was specimen 2, a
// twenty-station Sulphur Rosette with a corolla at height 3.8 that sheds
// NOTHING, while the other six shed 320 grains between them at mean heights
// 12.7 to 21.5 — a plume four frame-heights above the picture (mean ndc.y 3.3
// to 4.9). A close-up cannot show motes that are not there.
//
// The honest form of the fix is a term in the SUBJECT SCORE, and the honest
// source for it is the pollen itself. The alternative — re-deriving which
// organs are dehiscing from `whorl`, `dev` and `sen` — is a second copy of
// FlPollen._sources's gates that would drift from it inside a month, and it
// answers a worse question anyway: what a close-up needs is not that this
// flower HAS anthers but that there is pollen in the air where the camera is
// about to point. A grain that has drifted off is somebody else's mote.
//
// The radius is the corolla's own drawn bound, taken generously (2.5 r, floored
// at 1.5 units so a small flower still has an airspace): the close-up ends up
// about 4.2 corolla radii out with the corolla filling the frame, so a grain
// inside that sphere is a grain in the picture. The weight runs 0.8 to 1.4, the
// same 1.75x spread as `rim` and the same job — enough to decide between two
// comparable corollas, not enough to overturn a petal count.
//
// ⚠ AND ON THE SEED THIS WAS BUILT FOR IT DOES NOT WIN, WHICH IS THE HONEST
// HEADLINE AND IS NOT A BUG IN THIS TERM. The subject at ?garden=7&seed=21 is a
// Sulphur Rosette carrying 33 petals on a corolla of radius 1.81: base score
// 13.68 against 2.14 for the best flower that IS shedding. Nothing defensible
// closes a factor of six, and nothing should — that really is the best corolla
// in the field. What it cannot do is shed, and the reason is structural: that
// species has `whorlBands: false`, so every one of its floral organs carries
// the `petal` flag and FlPollen._sources — which skips petals — finds no anther
// on it at all. Measured across the field: 33/33 organs petal on specimen 2,
// against 23 stamens of 76 organs on the Abyssal Frond.
//
// So the field's showiest corolla and its shedding corollas are different
// flowers here for a reason, and `close` keeps returning 0 grains in frame. The
// framing half of that was measured too and rejected on the measurement: at
// seed 31 the subject's OWN plume sits at mean height 26.8 against a corolla at
// 17.2, nine units above a frame about five units tall, so no headroom this
// shot could give would reach it. A grain drifts ~0.32 units per unit of plant
// time and lives a long time; by the time there are grains they are gone.
function flDirPlume(pol, bb) {
  if (!pol || !pol.n) return 0;
  const r = Math.max(1.5, bb.r * 2.5), r2 = r * r;
  let n = 0;
  for (let i = 0; i < pol.n; i++) {
    const o = i * 7;
    const dx = pol.buf[o] - bb.c[0], dy = pol.buf[o + 1] - bb.c[1], dz = pol.buf[o + 2] - bb.c[2];
    if (dx * dx + dy * dy + dz * dz < r2) n++;
  }
  return 0.8 + 0.6 * smoothstep(0, 6, n);
}

function flDirScoreOf(specs, i, ai, scoreAxis, F, pol) {   // i === 0 is the hero
  const s = specs[i];
  if (!s || !s.S || !s.S.plant.axes[ai]) return 0;
  const base = scoreAxis(s, ai);
  if (!(base > 0)) return 0;
  const bb = s.B.floralBounds(ai);
  if (!bb) return 0;
  const rim = F ? 0.65 + 0.5 * smoothstep(0, F.R, Math.hypot(bb.c[0] - F.cx, bb.c[2] - F.cz)) : 1;
  return base * (0.25 + 0.75 * flDirOpenness(s.S.plant.axes[ai]))
    * flDirCrowd(specs, s, bb) * rim * flDirCompact(bb) * flDirPlume(pol, bb)
    * (i === 0 ? FL_DIR_HERO : 1);
}

function flDirPick(specs, eye, scoreAxis, F, pol) {   // eslint-disable-line no-unused-vars
  let best = null, bs = 0;
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    if (!s.S) continue;
    for (let ai = 0; ai < s.S.plant.axes.length; ai++) {
      const ax = s.S.plant.axes[ai];
      if (!ax.floral) continue;
      const base = scoreAxis(s, ai);
      if (!(base > 0)) continue;
      const bb = s.B.floralBounds(ai);
      if (!bb) continue;
      const open = 0.25 + 0.75 * flDirOpenness(ax);
      const clear = flDirCrowd(specs, s, bb);
      // A FLOWER ON THE RIM IS A PHOTOGRAPHABLE FLOWER. Everything about the
      // close-up is easier from outside the crowd, so a corolla out at the
      // edge of the clearing is worth about 1.5x one of equal size in the
      // middle of it. F is optional: ?focus=flower asks before the field has
      // been measured on the first frame.
      const rim = F ? 0.65 + 0.5 * smoothstep(0, F.R, Math.hypot(bb.c[0] - F.cx, bb.c[2] - F.cz)) : 1;
      // and whether there is anything in the air around it — see flDirPlume
      const sc = base * open * clear * rim * flDirCompact(bb) * flDirPlume(pol, bb)
        * (i === 0 ? FL_DIR_HERO : 1);
      if (sc > bs) { bs = sc; best = { i, ai, bb, score: sc }; }
    }
  }
  return best;
}

// The horizontal direction from the middle of the field out through a flower,
// which is the side a close-up should be taken from. Falls back to the shot's
// own heading for a flower standing on the centre.
// It carries the orbit too, which is how the CLOSE-UP drifts: the shipped
// framer builds its eye direction by blending the flower's own facing with
// this vector, then eases onto it at 0.012 a frame, so turning this slowly
// walks the camera around the corolla at the same 0.46 deg/s everything else
// moves at — about ten degrees of parallax across the shot, against a
// background at ten times the range. Nothing else here could move the close-up
// without reaching inside the framer the solo page shares.
//
// ⚠ Under ?focus=flower the shot clock never runs, so dir.el stays 0 and this
// term is exactly zero. That mode is a capture affordance and a still of it
// should be reproducible; the drift belongs to the film.
function flDirOutward(dir, F, bb) {
  let x = bb.c[0] - F.cx, z = bb.c[2] - F.cz;
  const l = Math.hypot(x, z);
  const o = flDirOrbit(dir), co = Math.cos(o), so = Math.sin(o);
  if (l < 0.75) { const a = flDirAng(dir, F); return { x: Math.cos(a), z: Math.sin(a) }; }
  x /= l; z /= l;
  return { x: x * co - z * so, z: x * so + z * co };
}

// --- the poses. Each writes dir.wantEye / dir.wantTgt and returns the
// subject scale (the `radius` the fog and the dolly law are built on). ---

// THE ESTABLISHING FRAME — the one shot that has to answer "what is this
// place". Three things a viewer must be able to do from it: count the plants,
// see where the field ENDS, and find the ground. None of those survive a
// framing built on flower height, which is what `bank` (below) is and why
// `wide` used to be a thicket mid-shot with five specimens cropped top and
// bottom.
//
// SO IT IS SOLVED, not tuned. The frame at distance d is fovH*d units tall and
// A*fovH*d wide, where fovH = 2 tan(fov/2) = 0.752 at the shipped 41.25 deg
// and A is the canvas aspect — both read off the live camera rather than
// written down, because a window is not 1.41 wide by decree. Two conditions,
// and the distance is whichever binds:
//
//   WIDTH   the field's extent ACROSS THIS HEADING across fW of the frame width
//   HEIGHT  the field's top hHi across fH of the frame height
//
// Which one binds is a property of the FIELD's own aspect and it swaps inside
// the shipped range, which is the argument for taking the max of both rather
// than picking one: at ?garden=3 the stand is 30.6 wide and 34.0 tall and the
// HEIGHT binds (62.8 against 33.6); at ?garden=12 it is 106.8 wide and 44.8
// tall and the WIDTH binds (117.1 against 82.7). ?garden=7 is height-bound at
// 88.7 against 67.1. A pose that solved only one of them is inside the field
// at one end of the range and a mile away at the other.
//
// THEN THE COMPOSITION, which is two more fractions and is where the eye gets
// its say. The frame at the field's own depth spans y in
// [yT - fovH*d/2, yT + fovH*d/2], so putting the field's FEET at height bF up
// the frame fixes the target: yT = fovH*d*(0.5 - bF). And the HORIZON sits at
// the eye's own elevation, so putting it at hz up the frame fixes the eye:
// yE = yT + fovH*d*(hz - 0.5). Feet below the horizon, tops above it — the
// plants cross the skyline, which is what makes a field read as standing on
// something. ?estab=fW,fH,bF,hz sweeps all four, and three rungs of that
// ladder were shot at ?garden=7 and looked at:
//   fH 0.62  d 103.0  the field is a small clump in the middle of a dark
//                     frame — the tree_shot lesson exactly, "looks lost" and
//                     "is too sparse" are the same picture
//   fH 0.78  d  81.8  full and good, but the two nearest spires graze the top
//                     edge (the frame's top is 0.411*d + yE, so a plant 25
//                     units nearer than the middle loses 10 units of headroom)
//   fH 0.72  d  88.7  SHIPPED. every specimen whole, sky above them, and the
//                     stand still fills the frame
// The horizon fraction is 0.45 — a shade below centre, so the ground has the
// lower half and the plants cross the skyline into the upper.
//
// ⚠ THIS IS NOT PHASE 1'S FRAMING OF THE BOUND, though the distances are
// comparable (88.7 here against 84.2 there). That one framed a SPHERE from
// above and put six plants in an overlapping column; this one stands off the
// short axis at 1.25 m of eye height and looks across, so the long axis lies
// across the frame and the depression angle is 2.2 degrees. Far away and
// above is a diagram; far away and level is a landscape.
//
// ⚠ AND THE GROUND IS NOT VISIBLE FROM HERE, WHICH IS NOT THE MELT'S FAULT.
// tools/flowers_horizon.mjs was run at this pose's own eye and target at three
// heights (8.0 / 18.4 / 34.0 world units, the middle one the shipped pose):
// there is NO hard horizon at any of them — 25_ground.js's melt holds, and
// that is the thing that tool exists to catch. There is also no ground: the
// floor is inferred entirely from where the stems stop. Raising the melt's
// near shaping (?haze=2,3,2.5,5, the one knob built to keep floor near the
// camera without bringing a horizon back) was shot against the default and is
// indistinguishable. The limiter is VALUE, not optical depth — soil albedo is
// 0.03-0.10 by decision ("a floor should be felt, not seen") and lands within
// a hair of the void it is drawn against, so there is no contrast for a
// horizon to be made of. Nothing here changes the ground; it is reported.
const FL_ESTAB = [0.86, 0.72, 0.15, 0.45];
function flEstabKnobs() {
  if (typeof location === 'undefined') return FL_ESTAB;
  const v = (new URLSearchParams(location.search).get('estab') || '').split(',').map(Number);
  return (v.length === 4 && v.every(isFinite)) ? v : FL_ESTAB;
}
// THE FIELD IN THE PICTURE — the hull's support width the way the LENS sees it
// rather than the way a plan does. `half` and `mid` come back in tangent units,
// which is the unit the frame's own half-width is: A*fovH/2. The difference
// between this and flFieldSpan is a factor of 1/(D - along) per vertex, and it
// is not small — a field is not centred on its own centre, so the half that is
// NEAR the camera subtends more. Measured on ?garden=7&seed=21, standing on the
// two ends of one and the same diameter gives 0.61 and 0.777 of the frame.
function flFieldSpanP(F, a, D) {
  const c = Math.cos(a), s = Math.sin(a), rx = Math.sin(a), rz = -Math.cos(a);
  let lo = 1e9, hi = -1e9;
  for (const p of F.hull) {
    const u = (p[0] - F.cx) * rx + (p[1] - F.cz) * rz;
    const along = (p[0] - F.cx) * c + (p[1] - F.cz) * s;
    const q = u / Math.max(1, D - along);
    if (q < lo) lo = q;
    if (q > hi) hi = q;
  }
  if (hi < lo) return { half: 0.1, mid: 0 };
  return { half: (hi - lo) / 2, mid: (hi + lo) / 2 };
}
// Solve the establishing standoff from a heading: the distance at which the
// field's PROJECTED width is k[0] of the frame's, found by fixed point because
// the projected width depends on the distance it is solved for. The map is
// close to half ~ W/D, so the iterate D <- D * fill/k0 is a contraction and
// three passes are worth ten; it starts from the plan solution, which is that
// map exactly.
function flEstabSolve(F, a, k, A, fovH) {
  const halfFrame = A * fovH / 2;
  let D = 2 * Math.min(flFieldSpan(F, a).half, F.Rout) / (k[0] * A * fovH);
  let sp = null;
  for (let i = 0; i < 3; i++) {
    sp = flFieldSpanP(F, a, D);
    D = Math.max(4, D * (sp.half / halfFrame) / k[0]);
  }
  sp = flFieldSpanP(F, a, D);
  return { D, fill: sp.half / halfFrame, mid: sp.mid };
}
function flDirPoseEstab(dir, F, cam) {
  const fovH = 2 * Math.tan(cam.fov * Math.PI / 360);
  const A = Math.max(0.5, cam.aspect);
  const k = flEstabKnobs();
  // WHICH END OF THE DIAMETER, AND THE PROJECTION DECIDES. flDirAng alternates
  // the heading end for end at every cut (dir.flip) so no two consecutive shots
  // come from the same side, and that is right for the four shots that are
  // ABOUT the field. The establishing frame is the one shot that is about the
  // PLACE, and the two ends of one diameter are not equally good places to
  // stand: same axis, same distance, 0.61 of the frame from one end and 0.777
  // from the other. So this pose keeps the jitter (a repeating heading is what
  // makes a cycling director read as a loop) and takes whichever end its own
  // field projects widest from. Two solves of a dozen hull vertices.
  //
  // ⚠ AND THE TWO ENDS MUST BE COMPARED AT THE DISTANCE ACTUALLY USED, which is
  // the whole reason this is written out rather than read off flEstabSolve's
  // own `fill`. That solver returns the distance at which the width condition
  // is exactly met, so its fill is 0.86 from every heading by construction — a
  // flat sweep that says nothing. On this field the HEIGHT condition binds from
  // every heading (dH 91 against dW 57-83), so the camera never stands where
  // the width solve asked, and what a viewer gets is the width fill at dH:
  // 0.57 from one end of the diameter and 0.79 from the other.
  const dH = F.hHi / (k[1] * fovH);
  const halfFrame = A * fovH / 2;
  // ⚠ THE STANDOFF IS CLIPPED WHERE THE HEADING IS NOT. A heading is
  // directional, so one specimen's 43-unit arm only widens the headings it lies
  // across and needs no guard. A DISTANCE is one number for the whole picture,
  // and the p85 that sizes `Rout` exists precisely so a 65.9-unit arm — one
  // measured seed of one species, still climbing linearly at step 3200 — cannot
  // stand the camera 145 units off a clearing nobody is in. So the width
  // condition is clipped at what a p85-round field would have asked for: the
  // arm is framed if it fits and crosses the frame edge if it does not, which
  // is a good picture either way. And never inside the field it is
  // establishing, whatever the fractions say.
  const cap = 2 * F.Rout / (k[0] * A * fovH);
  const solve = (ang) => {
    const D = Math.max(Math.min(flEstabSolve(F, ang, k, A, fovH).D, cap), dH, F.Rout * 1.15 + 6);
    return { ang, D, fill: flFieldSpanP(F, ang, D).half / halfFrame };
  };
  //
  // ⚠ AND IT IS DECIDED ON THE CUT AND HELD. The field is re-measured every
  // 500 ms and the orbit turns the heading all shot, so an end chosen every
  // frame is an end that can change its mind — and changing it is a 180-degree
  // jump of the establishing eye, the most violent thing this director could
  // possibly do. Same argument as the subject being picked on the cut.
  //
  // ⚠ AND IT IS RE-DECIDED IF THE FIELD STOPS BEING THE ONE IT WAS DECIDED ON,
  // BUT ONLY WHERE NO CLOCK IS RUNNING. Under ?shot=wide the director never
  // cuts, so the choice was made on the first frame it ever ran — inside the
  // fast-forward, on a stand of seedlings — and then held for the session. Two
  // builds of the same code photographed the two different ends of the same
  // diameter that way (drawn stations across the frame, 1.53 and 1.19), which is
  // the sharpest possible statement that the choice was not being made on the
  // field anyone sees. So a quarter change in the field's own height re-opens
  // it: a growing stand crosses that many times a second, a grown one never.
  //
  // ⚠ AND THE FIRST VERSION OF THAT RULE HAD NO `overrun` IN IT, WHICH PUT THE
  // TELEPORT BACK. tools/flowers_clip.mjs over 285 s: seven samples above 50
  // units/s, all inside `wide`, at elapsed 10.9 to 24.7 — the middle of a HOLD,
  // where a 180-degree flip of the eye and a reset of the damped distance are
  // the only things that could move the camera at all. Peak 196 u/s against
  // FL_DIR_VPEAK's 26. `overrun` is true only once the shot clock has run past
  // this shot's own length, which happens when there is no clock — the pinned
  // capture case, and nothing else.
  const a0 = flDirAng(dir, F);
  const overrun = dir.el > flDirTrans(dir)
    + FL_DIR_SHOTS[dir.shot].hold * (dir.holdK || 1);
  if (dir.cut || dir.estabEnd === undefined
    || (overrun && Math.abs(F.hHi - dir.estabH) > 0.25 * dir.estabH)) {
    dir.estabEnd = solve(a0 + Math.PI).fill > solve(a0).fill ? Math.PI : 0;
    dir.estabH = F.hHi;
    dir.estabD = undefined;   // a new end is a new pose, not a place to drift to
  }
  const sol = solve(a0 + dir.estabEnd);
  const a = sol.ang, c = Math.cos(a), s = Math.sin(a);
  // and the lateral shift that centres what is drawn, re-read at the distance
  // actually used — `mid` is in tangent units, so mid*D is the world offset at
  // the field's own depth, and one correction is enough because the residual is
  // second order in (depth spread / D).
  //
  // ⚠ BOTH OF THESE ARE DAMPED, AND THE REASON IS A MEASURED TELEPORT. The field
  // is re-solved every 500 ms on a stand that is still growing, and neither the
  // distance nor the lateral shift is a smooth function of it: `mid` is the
  // midpoint of a support interval, so one new vertex on the hull — an arm that
  // has just grown past the old extreme — moves it by tens of units in one
  // measurement. 40_boot then lerps the camera 12% of the way to the want every
  // frame, which turns a 30-unit step in the want into 3.6 units in one frame.
  // tools/flowers_clip.mjs saw exactly that: seven samples of a 280 s film over
  // 50 units/s, all of them inside `wide`, all of them late in the run, peaking
  // at 239 — against FL_DIR_VPEAK of 26. A first-order lag at 0.01 a frame (a
  // ~1.7 s time constant at 60 fps) is slower than anything the eye reads as a
  // move here and an order of magnitude slower than the step it is smoothing.
  // Set outright on the cut, because a cut IS a step.
  const exM = flFieldSpanP(F, a, sol.D);
  if (dir.cut || dir.estabD === undefined) {
    dir.estabD = sol.D;
    dir.estabMid = exM.mid * sol.D;
  } else {
    dir.estabD += (sol.D - dir.estabD) * 0.01;
    dir.estabMid += (exM.mid * sol.D - dir.estabMid) * 0.01;
  }
  const D = dir.estabD;
  const yT = fovH * D * (0.5 - k[2]);
  // THE CRANE, and it is the one shot that gets a vertical drift on top of the
  // shared orbit. An establishing frame's job is to say what the place is, and
  // the thing this one cannot say from a fixed eye is that the field has a
  // FLOOR — the ground has no horizon on these palettes (see below), so the
  // only cue left is parallax. Rising moves the depression angle from 2.2 to
  // about 9 degrees over the shot, which slides the near plants down the frame
  // against the far ones. Same rate as the orbit, read against frame HEIGHT
  // rather than width, so it drifts at the same speed on screen.
  const yD = FL_DRIFT * (dir.kh || fovH) * D * flDirDriftT(dir);
  const yE = Math.max(FL_DIR_EYE_FLOOR, yT + fovH * D * (k[3] - 0.5) + yD);
  // AND THE WHOLE POSE SLIDES SIDEWAYS ONTO WHAT IS DRAWN. Eye and target both,
  // by ex.mid along the frame's right vector, so the view direction is
  // untouched and only the framing moves: the middle of the occupied sector
  // ends up in the middle of the picture instead of the centroid of the
  // origins. Those are different points whenever the field is lopsided, which
  // a dart-thrown field of seven always is.
  const mx = Math.sin(a) * dir.estabMid, mz = -Math.cos(a) * dir.estabMid;
  dir.wantEye.set(F.cx + mx + c * D, yE, F.cz + mz + s * D);
  // aimed at the MIDDLE, unlike every other shot here: the establishing frame
  // is the one whose subject is the whole field, so there is nothing to push
  // into the near half of the picture.
  dir.wantTgt.set(F.cx + mx, yT, F.cz + mz);
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  // the fog's scale (uFogNear = dist - 1.1 r) and the lens range. Half the
  // field's height rather than Rout alone: at ?garden=3 the stand is tall and
  // narrow, and fogging from 1.1*Rout would start the haze 15 units in front
  // of the near plants.
  return Math.max(F.Rout, F.hHi * 0.6);
}

// THE BANK — inside the stand, at flower height. This was `wide` until the
// establishing frame above existed, and it is kept whole because it is the
// best-looking frame the director has: the eye just outside the ring at a
// fifth of flower height, aimed PAST the centre (the target sits 0.30 R
// beyond it), so the mass of the field is in the near half of the frame and
// the far plants have somewhere to recede to. Distance is set by the SUBJECT
// and the subject here is a flowering plant, so it is 2.0 hTop with a floor
// against the ring — which is exactly why it cannot be the establishing shot:
// hTop is a MEDIAN and the two spires in a stand of seven are twice it.
// Nothing below this line changed when it was renamed.
function flDirPoseBank(dir, F) {
  const a = flDirAng(dir, F), c = Math.cos(a), s = Math.sin(a);
  // Distance is set by the SUBJECT, not by the ring: the frame is
  // 2*d*tan(fov/2) = 0.752 d units tall at distance d (41.25 deg, 30_scene),
  // so a median plant standing at the centre of the field fills 55% of frame
  // height at d = hTop / (0.55 * 0.752) = 2.4 hTop. The near plants are then
  // ~R closer and overflow the edges, which is the shot. The first version of
  // this pose distanced off the RING (1.75 R + 5 = 24 units) and photographed
  // the inside of a hedge: these plants are 10-19 units tall and a 16-unit
  // plant fills the frame at 21 units. Floor it against the ring anyway, for
  // the case of a wide field of short specimens.
  const D = Math.max(F.R * 1.5 + 5, F.hTop * 2.0);
  dir.wantEye.set(F.cx + c * D, Math.max(FL_DIR_EYE_FLOOR, F.hMid * 0.25), F.cz + s * D);
  dir.wantTgt.set(F.cx - c * F.R * 0.30, F.hMid * 0.95, F.cz - s * F.R * 0.30);
  // no vertical drift here and none in `low`: those two poses ARE their eye
  // height (a fifth of flower height, and a kneel), so a crane deletes the shot
  // rather than moving it. They carry the shared orbit and nothing else.
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  return F.R * 1.05;
}

// THE DOLLY — a walk ACROSS the field, aimed at a flower in it. The eye rides
// a chord OUTSIDE the ring (never through it), about six tenths of the wide
// shot's standoff, translating by a ring radius over the shot while the aim
// holds on the subject: the subject is steady in frame and everything between
// it and the camera sweeps past, which is where a field's depth actually
// shows. Speed comes from the shot's own length and is eased at both ends.
//
// ⚠ The first version of this pose put the eye AT flower height a few radii
// from the subject and translated by its own standoff. That drives the camera
// straight into a neighbour's canopy — measured on ?garden=7: the frame is a
// wall of blurred leaf with the subject behind it. In a field this dense the
// only reliable interior shot is the close-up, which steers around a trunk on
// purpose (frameAxisFlower). Everything else stands outside and looks in.
function flDirPoseDolly(dir, F, bb, u) {
  const a = flDirAng(dir, F), c = Math.cos(a), s = Math.sin(a);
  const D = Math.max(F.R * 1.25 + 4, F.hTop * 1.45);
  // ⚠ THE DOLLY USED TO STOP. Its travel was `2*smoothstep(0,1,u)-1` over the
  // whole shot, which is an ease at BOTH ends — so the one shot in the list
  // that is going somewhere spent its last four seconds arriving and its last
  // two parked, which is the freeze frame this pass exists to remove. It eases
  // in over the first fifth and then runs at a constant rate straight through
  // the cut, so the camera is still moving on the frame the next shot blends
  // from. `a0/2` is the area the ease gives away and dividing by `1 - a0/2`
  // puts f(1) back at 1, so the shot covers exactly the chord it always did.
  const a0 = 0.2;
  const f = u < a0 ? u * u / (2 * a0) : u - a0 / 2;
  const t = (2 * (f / (1 - a0 / 2)) - 1) * F.R * 0.95;
  dir.wantEye.set(F.cx + c * D - s * t,
    Math.max(FL_DIR_EYE_FLOOR, F.hMid * 0.42),
    F.cz + s * D + c * t);
  // aim two thirds of the way from the middle of the field to the subject, so
  // the shot has a subject AND still holds the field around it
  dir.wantTgt.set(lerp(F.cx, bb.c[0], 0.65),
    lerp(F.hMid * 0.85, bb.c[1], 0.65),
    lerp(F.cz, bb.c[2], 0.65));
  // paced off where the eye ENTERS the chord, not off the middle of it: the
  // travel is already running when the transition lands
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  return Math.max(3, F.R * 0.7);
}

// WHERE A HEADING LEAVES THE FIELD — the standoff at which no drawn station is
// within `margin` of the eye, exact and in closed form. A station at plan
// offset (along, perp) from the field's middle is within `margin` of the ray
// point at parameter t whenever |perp| < margin and t is between
// along -+ sqrt(margin^2 - perp^2); the answer is the furthest such exit, which
// is the smallest standoff on this heading with nothing on the lens.
//
// ⚠ IT IS THE STATIONS AND NOT THE DISCS, and the difference is a factor of two
// in the answer. The disc model puts a circle of the specimen's REACH on its
// origin, so one Ember Creeper trailing 43.3 units becomes a 43-unit disc that
// the eye must leave in every direction — measured, that stood the low shot
// 67.1 units out where the stations ask for less than half of it, and turned a
// kneel into a distant shot. An arm is thin, and only the part of it that is
// actually there should push the camera back.
function flDirClearance(F, a, margin) {
  const c = Math.cos(a), s = Math.sin(a), rx = Math.sin(a), rz = -Math.cos(a);
  const m2 = margin * margin;
  let D = 0;
  for (const p of F.drawn) {
    const perp = (p[0] - F.cx) * rx + (p[1] - F.cz) * rz;
    const q = m2 - perp * perp;
    if (q <= 0) continue;
    const t = (p[0] - F.cx) * c + (p[1] - F.cz) * s + Math.sqrt(q);
    if (t > D) D = t;
  }
  return D;
}
// THE GAP NEAREST A HEADING. Every specimen has a bearing from the middle of
// the field; between consecutive bearings there is an arc with no plant on it.
// This returns the middle of whichever such arc lies nearest `a0`, which is
// where a low camera can walk in without a trunk on the lens. It replaces a
// hardcoded +0.55 rad, and the two are the same size on a stand of seven (seven
// bearings, 51 degrees of arc each, so the nearest gap centre is never more
// than 26 degrees away) — the difference is that this one knows where the
// plants are.
function flDirGap(F, a0) {
  if (!F.discs || F.discs.length < 2) return a0;
  const bs = F.discs.map(d => Math.atan2(d[1] - F.cz, d[0] - F.cx)).sort((p, q) => p - q);
  let best = a0, bd = 1e9;
  for (let i = 0; i < bs.length; i++) {
    const m = (bs[i] + (i + 1 < bs.length ? bs[i + 1] : bs[0] + TAU)) / 2;
    const dd = Math.abs(((m - a0 + Math.PI) % TAU + TAU) % TAU - Math.PI);
    if (dd < bd) { bd = dd; best = m; }
  }
  return best;
}

// THE LOW UPWARD SHOT. Kneeling OUTSIDE the field and looking up into it, so
// the plants cross the sky's glow (FL_BG_FS's uGlow) instead of the ground —
// the one framing here where a silhouette reads. Short: punctuation, not a
// scene.
//
// ⚠ IT DID NOT DO THAT, AND THE POSE ABOVE THIS LINE SAID SO WHILE THE
// ARITHMETIC BELOW IT DISAGREED. Measured on ?garden=7&seed=21&shot=low with
// tools/flowers_frame.mjs: the eye stood 35.3 units out with a worst canopy
// clearance of MINUS 4.1 — inside an Ember Creeper that reaches 43.3 — the
// drawn stations spanned NDC x from -3.5 to +1.8, so two thirds of the field
// was off the sides of the picture, and there was no sky anywhere in the frame.
// A wall of near foliage, which is exactly what its own comment warns about
// three lines further down. Two numbers were stated rather than solved, and
// both of them are solvable:
//
//   THE STANDOFF was 1.1 R + 4, a fraction of a radius that cannot know what
//   any individual plant reaches. It is flDirClearance now: the distance at
//   which the ray this shot stands on has left every canopy, plus a margin of
//   one median flower height — near enough for the near plants to tower, far
//   enough that none of them is ON the lens.
//   THE PITCH was hMid*1.45 at the field's middle, an elevation that happens to
//   be inside the canopy of anything taller than 1.45 median flowers. It is
//   solved from the SKYLINE now, in exactly the way the establishing frame is
//   solved from the field's top: find the highest thing this eye can see, and
//   put it FL_LOW_SKY of the way up the frame, so what is above it is sky. That
//   makes the pitch a function of what is standing there rather than of a
//   fraction, and it never looks down — clamped at horizontal, because an
//   upward shot that pitches down is not this shot.
//
// FL_LOW_SKY is 0.62 in NDC, i.e. the skyline four fifths of the way up the
// frame with the top fifth open. It is by eye, the same category as FL_DRIFT
// and the establishing frame's four fractions, and it is the only number here
// that is not derived.
const FL_LOW_SKY = 0.62;
function flDirPoseLow(dir, F) {
  // enter through a gap rather than at a stated offset from the shot's heading,
  // and — like the establishing frame's end — decide it ON THE CUT and hold it.
  // The gap a heading is nearest to is a piecewise-constant function of that
  // heading, and the orbit turns the heading all shot: recomputed every frame
  // it steps from one gap to the next mid-hold, which is a teleport rather than
  // a drift. Held, the orbit still swings the AIM through the gap it chose.
  if (dir.cut || dir.lowAng === undefined) dir.lowAng = flDirGap(F, flDirAng(dir, F));
  const a = dir.lowAng + flDirOrbit(dir), c = Math.cos(a), s = Math.sin(a);
  const yE = FL_DIR_EYE_FLOOR * 0.85;
  // outside every canopy, and no further out than it has to be: the floors are
  // the old law, kept as a floor so a field of seedlings does not put the
  // camera in among them.
  const D = Math.max(F.R * 1.1 + 4, F.hTop * 1.35, flDirClearance(F, a, F.hMid));
  const ex = F.cx + c * D, ez = F.cz + s * D;
  // THE SKYLINE: the elevation the field's own tops rise to from this eye, over
  // the ones in front of it, at the 85th percentile — the same statistic and
  // for the same reason as `hHi`, that a stand of seven regularly hands one
  // member a veto. Axis tops rather than specimen discs, because a disc's near
  // edge is where its trailing arm lies on the ground and reading a plant's
  // full height off a point ten units away pitched this camera into the sky
  // with the whole field below the bottom edge (measured: NDC y -6.0 to -1.1).
  //
  // ⚠ AND A MAXIMUM IS NOT A SKYLINE, which was the second version and is the
  // same mistake one rung down. The tallest thing in this field is a 49-unit
  // Abyssal Frond, 50 degrees up from a kneeling eye 40 units away; pinning
  // THAT to 0.62 of the frame is a camera pointed at the top of one plant, and
  // it photographed an empty sky with foliage in two corners.
  const els = [];
  for (const p of F.tops) {
    if ((p[0] - ex) * -c + (p[1] - ez) * -s <= 0) continue;
    els.push(Math.atan2(p[2] - yE, Math.max(1, Math.hypot(p[0] - ex, p[1] - ez))));
  }
  els.sort((p, q) => p - q);
  const phi = els.length ? els[Math.min(els.length - 1, Math.floor(els.length * 0.85))] : 0;
  // and the pitch that puts it FL_LOW_SKY up the frame. tan(fovV/2) is half the
  // lens's own frame height per unit of distance, which flDirLens already
  // caches as kh; ndc.y for something at elevation (phi - theta) off the axis is
  // tan(phi - theta) / tan(fovV/2).
  const th = Math.max(0, phi - Math.atan(FL_LOW_SKY * (dir.kh || 0.752) / 2));
  const L = Math.hypot(F.cx - ex, F.cz - ez);
  dir.wantEye.set(ex, yE, ez);
  dir.wantTgt.set(ex - c * L * Math.cos(th), yE + L * Math.sin(th), ez - s * L * Math.cos(th));
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  return Math.max(3, F.R * 0.8);
}

// --- THE TRAVERSE. ---------------------------------------------------------
//
// Five poses stand outside the stand and look in. That is not an accident and
// it is written up twice above: an eye anywhere inside the ring is inside a
// canopy, and both earlier attempts at an interior shot photographed a wall of
// blurred leaf. But "you cannot stand anywhere inside" and "there is nowhere
// inside to stand" are different claims, and only the first one was ever
// measured. A stand of seven planted on a jittered ring has LANES in it, and a
// lane is derivable from the same stations everything else here is derived
// from.
//
// THE WIDEST LANE IS THE LARGEST GAP IN A PROJECTION. Pick a direction of
// travel; project every drawn station onto the axis PERPENDICULAR to it; sort.
// Two consecutive values with nothing between them are a band of the plan that
// no station lies in — a corridor running the whole length of the field, clear
// by construction rather than clear where it was checked. The widest corridor
// over all directions is then a sweep, the same 3-degree sweep the establishing
// heading uses and for the same reason.
//
// Two constraints on which gap counts, both stated:
//   - THE LANE MUST BE INSIDE THE STAND. The largest gap in that projection is
//     often between the main cluster and one flung-out Ember Creeper arm tip,
//     which is a real and perfectly clear lane that runs along the OUTSIDE of
//     the field. This is a traverse; it has to go through. So only gaps whose
//     centre is within the middle half of the field's perpendicular extent are
//     considered.
//   - ⚠ A STATION IS A STEM, NOT A BLADE. The corridor is clear of every drawn
//     axis point and says nothing about the lamina hanging off them, which is
//     the one part of this derivation that is weaker than it looks. What it
//     buys is that the camera never passes through a STEM, and the measured
//     half-widths are in the tools.
// `H` is how far along the lane the camera will actually travel either side of
// the middle, and it is what makes this a usable derivation rather than a
// pretty one. Asked of the WHOLE field the widest clear lane at ?garden=7 is
// 2.01 units of half-width — a crack, not a corridor, because a lane has to
// miss every plant over 67 units to qualify. The camera covers 25 of those 67,
// and only what it passes can be in its way: matter beyond the travelled
// segment is in the PICTURE, which is the point, and not on the lens.
function flDirCorridor(F, H) {
  let best = null;
  for (let d = 0; d < 180; d += 3) {
    const a = d * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a), rx = Math.sin(a), rz = -Math.cos(a);
    const us = [];
    let lo = 1e9, hi = -1e9;
    for (const p of F.drawn) {
      const al = (p[0] - F.cx) * c + (p[1] - F.cz) * s;
      if (al < lo) lo = al;
      if (al > hi) hi = al;
      if (Math.abs(al) > H) continue;
      us.push((p[0] - F.cx) * rx + (p[1] - F.cz) * rz);
    }
    if (us.length < 2) continue;
    us.sort((p, q) => p - q);
    const span = us[us.length - 1] - us[0];
    for (let i = 1; i < us.length; i++) {
      const half = (us[i] - us[i - 1]) / 2, off = (us[i] + us[i - 1]) / 2;
      if (Math.abs(off) > span * 0.25) continue;   // the middle half of the field
      if (!best || half > best.half) best = { half, off, ang: a, len: hi - lo };
    }
  }
  return best || { half: 0, off: 0, ang: F.pa, len: Math.max(8, F.Rout * 2) };
}

// THE GLIDE — a tracking move down that lane, at flower height, aimed at the
// vanishing point ahead of it. Everything a viewer sees passes the camera
// instead of the camera passing around it, which is the one thing five orbiting
// poses cannot do.
//
// THE SPEED IS THE FILM'S OWN DRIFT, TIMES THREE. FL_DRIFT is a screen-referred
// rate — the picture translating by a fraction of its own width per second —
// and the whole argument for it is that "gentle" only means anything on screen.
// A traverse is a move rather than a drift, so it gets a stated multiple of that
// one rate and nothing else:
//
//     v = FL_GLIDE_K * FL_DRIFT * (frame width at the aim distance)
//
// which on ?garden=7&seed=21 lands at 0.7-0.9 units/s (4.6-5.7 cm/s in
// WORLD.unitM) depending on where the solved aim distance sits as the field
// grows — the number that is NOT sensitive to that choice is the measured
// screen rate, 2.1-2.2 %frame/s against FL_DRIFT's 0.75, which is what
// tools/flowers_clip.mjs reports. Over a 26-second dwell plus its transition
// that is roughly 25-30 units of travel through a field 61 units across.
// FL_GLIDE_K = 3 is
// the one number here that is chosen, and it is chosen as a ceiling: at 1 the
// move is indistinguishable from the drift the other five shots already carry,
// and the rate this measures is the one tools/flowers_clip.mjs reports.
//
// THE AIM IS THE FAR END OF THE LANE, not a subject. Aiming at a flower while
// passing it swings the camera through a large angle at closest approach, which
// is a whip and not a glide; aiming down the lane puts the corridor's vanishing
// point in the middle of the frame with the flanking plants streaming past the
// edges. It also does the focus work for free: 40_boot sets uFocus to the
// camera-to-target distance, so the plane of focus rides a fixed distance ahead
// and every flower in the lane resolves as it reaches that plane and softens
// again as it passes. Nothing new was needed for the rack; it is the shipped
// lens pointed forwards.
//
// ⚠ AND `?shot=glide` IS NOT A USEFUL STILL, WHICH IS WORTH SAYING RATHER THAN
// ENGINEERING AROUND. Pinning a shot stops the clock, so `u` saturates at 1 and
// the camera parks at the traverse's last position — which, since the window is
// placed on the mass, is deep inside it. The still is a wall of soft blade. In
// motion that same blade is a wipe and reads as passing something; as a frame it
// reads as a mistake, and a traverse stopped anywhere is a frame of a move. For
// the same reason a PINNED CLIP cannot show this shot at all: measured, 45 s of
// ?shot=glide travels 1.1 units and scores 94% stationary, because it had
// already arrived before the recording started. Record the rotation.
const FL_GLIDE_K = 3;
function flDirPoseGlide(dir, F, u) {
  // the lane is solved on the cut and held. It is a 60 x (every station) sweep
  // with a sort inside it, and — more to the point — a lane that is re-solved
  // while the camera is in it is a swerve.
  if (dir.cut || !dir.lane) {
    // how far the camera will travel either side of the middle, wanted BEFORE
    // the lane is solved because the lane only has to be clear over it. The aim
    // lead is not known yet either, so it is estimated at Rout — the field's own
    // outer radius — which is what half a lane's length comes to anyway.
    const T0 = flDirTrans(dir) + FL_DIR_SHOTS[dir.shot].hold * (dir.holdK || 1);
    const H = 0.5 * T0 * FL_GLIDE_K * FL_DRIFT * (dir.kw || 1.06) * F.Rout;
    const ln = flDirCorridor(F, H);
    // WHICH WAY DOWN IT: the end nearer the pose the camera is cutting from, so
    // the entrance is the shortest move the transition could have been asked to
    // make. flDirPace prices it either way; this keeps the price low.
    const c = Math.cos(ln.ang), s = Math.sin(ln.ang);
    const rx = Math.sin(ln.ang), rz = -Math.cos(ln.ang);
    const bx = F.cx + rx * ln.off, bz = F.cz + rz * ln.off;
    const dA = Math.hypot(bx - c * H - dir.fromEye.x, bz - s * H - dir.fromEye.z);
    const dB = Math.hypot(bx + c * H - dir.fromEye.x, bz + s * H - dir.fromEye.z);
    const ang = dB < dA ? ln.ang + Math.PI : ln.ang;
    // WHERE ALONG THE LANE TO SPEND THE SHOT, and it is not the middle. Centred
    // on the field, the traverse's last third ran out of plants: it had passed
    // everything that flanks the lane and was aimed down the empty end of it —
    // a measured frame with two soft leaves in one corner and nothing else. The
    // mass has a centroid along the lane, and the window is placed so the camera
    // spends the shot APPROACHING it and passes through near the end: from
    // 1.5 H before it to 0.5 H after. Only points within a lane's own width of
    // the axis count, since it is the flanking plants that make the picture.
    const c2 = Math.cos(ang), s2 = Math.sin(ang);
    const rx2 = Math.sin(ang), rz2 = -Math.cos(ang);
    let ms = 0, mn = 0;
    for (const p of F.drawn) {
      if (Math.abs((p[0] - F.cx) * rx2 + (p[1] - F.cz) * rz2 - ln.off) > H) continue;
      ms += (p[0] - F.cx) * c2 + (p[1] - F.cz) * s2;
      mn++;
    }
    dir.lane = { ang, off: ln.off, half: ln.half, len: ln.len, bx, bz, H,
      t0: (mn ? ms / mn : 0) - 1.5 * H };
  }
  const ln = dir.lane;
  const c = Math.cos(ln.ang), s = Math.sin(ln.ang);
  // the aim lead, and the same length the speed is referred to, so that the
  // travel over the shot is exactly the 2H the lane was solved to be clear over
  const L = Math.max(8, F.Rout);
  const v = FL_GLIDE_K * FL_DRIFT * (dir.kw || 1.06) * L;
  const T = flDirTrans(dir) + FL_DIR_SHOTS[dir.shot].hold * (dir.holdK || 1);
  // placed on the mass rather than on the middle — see the lane solve above
  const t = ln.t0 + u * v * T;
  const ex = ln.bx + c * t, ez = ln.bz + s * t;
  const yE = Math.max(FL_DIR_EYE_FLOOR, F.hMid);
  dir.wantEye.set(ex, yE, ez);
  // THE AIM LOOKS DOWN THE LANE AND LEANS INTO THE PLANTS. A lane is by
  // construction the emptiest line through the stand, so a camera that aims
  // exactly along it aims at the one direction with nothing in it — measured on
  // the film, the last third of the traverse was a crowded left half and a bare
  // right one. So the aim is offset laterally onto the mean lateral position of
  // everything the field draws AHEAD of the eye, within the aim lead: the same
  // move the establishing frame makes when it slides onto the occupied sector,
  // made forwards and continuously. Clamped to a third of the frame's own half
  // width so it leans rather than swings, and the whole thing is smoothed by
  // 40_boot's 0.12 target lerp.
  //
  // It also replaces the shared orbit on this shot. Every other pose adds
  // flDirOrbit so that an arrived camera is never still; a traverse is never
  // arrived, and an orbit term on top of the translation is two motions with
  // nothing relating them.
  let mx = 0, mn = 0;
  for (const p of F.drawn) {
    const al = (p[0] - ex) * c + (p[1] - ez) * s;
    if (al < 2 || al > L) continue;
    mx += (p[0] - ex) * s - (p[1] - ez) * c;
    mn++;
  }
  const lim = 0.33 * (dir.kw || 1.06) * L * 0.5;
  const lat = mn ? Math.max(-lim, Math.min(lim, mx / mn)) : 0;
  dir.wantTgt.set(ex + c * L + s * lat, yE, ez + s * L - c * lat);
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  return Math.max(3, F.R * 0.5);
}

// A TRANSITION IS AN ARC, NOT A CHORD — and that is the other half of the low
// shot's entrance. Its POSE was solved out of the canopy (flDirPoseLow), and it
// still entered through a wall of leaf, because the pose is where the move ENDS
// and the straight line to it from the previous shot goes wherever it goes. The
// headings alternate end for end at every cut (dir.flip), so a great many of
// those lines run straight across the middle of the stand at flower height.
//
// Interpolating the eye in the field's own polar coordinates instead — radius,
// azimuth the short way round, height — makes the camera swing AROUND the stand
// at an interpolated radius rather than through it. It costs nothing: two poses
// on the same bearing still give a straight radial move, which is what the
// establishing crane and the bank's approach already were.
// ⚠ AND WHICH WAY ROUND IS DECIDED ON THE CUT, WHICH IS THE FOURTH VERSION OF
// THIS DIRECTOR'S OLDEST BUG. "The short way round" is not a continuous function
// of two poses: at a half-turn it is a coin flip, and `wantEye` is recomputed
// every frame (the orbit turns it, the dolly travels, the field is re-measured).
// Two poses nearly antipodal — which `low` and `wide` are, one kneeling outside
// the stand and one 90 units off the far side — sit exactly there, so a hair of
// movement in the want swaps +179 degrees for -179 and the eye is thrown across
// the field in one frame.
//
// It is on film, in BOTH builds, so it predates the crane: tools/flowers_clip.mjs
// on ?garden=7&seed=1337 caught `low -> wide` at 191 and 434 units/s against
// FL_DIR_VPEAK's 26, one sample wide, mid-blend, with the azimuth running
// 221 -> 216 -> 204 -> 186 degrees and then jumping to 238 and climbing. The eye
// moved 80 units between two frames.
//
// The fix is an unwrap rather than a freeze: the difference is still read from
// the live want every frame, but on the branch this move STARTED on, so it can
// drift continuously and can never jump by a turn. Same argument as the frozen
// heading, the frozen establishing end, the frozen gap and the frozen lane —
// nothing about a move in progress should be a function of what the plants did
// while it was being flown.
function flDirPolar(out, dir, F, w) {
  const ax = dir.fromEye.x - F.cx, az = dir.fromEye.z - F.cz;
  const bx = dir.wantEye.x - F.cx, bz = dir.wantEye.z - F.cz;
  const ra = Math.hypot(ax, az), rb = Math.hypot(bx, bz);
  const aa = Math.atan2(az, ax), ab = Math.atan2(bz, bx);
  let d = ((ab - aa + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (dir.arcD !== undefined) {
    d = dir.arcD + (((d - dir.arcD + Math.PI) % TAU + TAU) % TAU - Math.PI);
  }
  const r = ra + (rb - ra) * w, an = aa + d * w;
  out.set(F.cx + Math.cos(an) * r,
    dir.fromEye.y + (dir.wantEye.y - dir.fromEye.y) * w,
    F.cz + Math.sin(an) * r);
}

// --- AND WHERE IT STILL WENT THROUGH SOMETHING, IT RISES OVER IT. -----------
//
// The arc above fixed the half of this that is about PLAN: a straight line
// between two poses on opposite sides of a stand crosses the middle of it, and
// swinging round at an interpolated radius does not. What it cannot fix is that
// the interpolated radius and the interpolated height are still a line through
// a canopy that happens to stand between the two poses. Measured with
// tools/flowers_trans.mjs on ?garden=7&seed=21 — the real pose functions, the
// real blend, the drawn VERTICES rather than a model of them — two of the six
// transitions in a rotation pass within 0.7 units of drawn tissue, and one of
// them puts foreground across 46% of the frame in the middle of the move. On
// seed 1337 it is 0.07 units and 63%. That is fr06.png: one out-of-focus near
// blade, the subject invisible, four seconds into a move.
//
// THE CINEMATIC ANSWER IS TO RISE AND SETTLE, and it is also the derivable one.
// A crane over the canopy that descends onto the new pose is what a camera
// operator does when the direct path is through a hedge, and it costs one term:
//
//     eye.y += A * flDirBump(w)
//
// zero at both ends (the poses are solved and must not move), one across the
// middle, and — because `w` is already a smoothstep of elapsed time — with zero
// VELOCITY at both ends too, so a lifted move begins and ends exactly as gently
// as an unlifted one. `A` is not chosen: it is the smallest amplitude for which
// nothing the field draws is within FL_DIR_BRUSH of any sample of the path, and
// the samples are spaced at half that margin so there is no gap between them to
// thread.
//
// THE HEIGHT ONE POINT OF THE PATH NEEDS IS A CLOSED FORM, and it is
// flDirClearance's derivation turned on its side. That one asks how far ALONG a
// heading the eye must stand for a cylinder of radius `margin` around it to be
// empty; this asks how far UP. A drawn point at plan offset dp from the path and
// height y is inside the sphere of radius m about an eye at height ye whenever
// dp < m and |ye - y| < sqrt(m^2 - dp^2), so an eye inside that sphere leaves it
// from above at y + sqrt(m^2 - dp^2) — and an eye that is already outside it is
// left alone, which is the correction in flDirRise and the thing that keeps a
// move passing UNDER a canopy from being craned over it.
//
// ⚠ MOST TRANSITIONS MUST COME OUT UNTOUCHED, and that is the test this
// mechanism has to pass rather than a hope: a director that cranes on every cut
// has replaced one tic with another. Four of six are untouched on seed 21 and
// five of six on seed 1337 — the ones that lift are exactly the ones the harness
// says are inside a plant. The amplitude is solved ON THE CUT and held, like the
// establishing frame's end, the low shot's gap and the traverse's lane: a lift
// re-solved every frame against a stand that is still growing is a swerve.
//
// FL_DIR_BRUSH IS NOT DERIVED, BUT IT WAS SWEPT. It cannot be "the distance at
// which a plant stops filling the frame" — a 15-unit blade covers half the frame
// out to 20 units, no achievable margin makes a stand of spacing 12 empty, and
// the pictures where foliage crowds the edges are the good ones. What it is is
// the distance at which the lens stops being INSIDE the plant. The ladder, on
// ?garden=7&seed=21 with tools/flowers_trans.mjs, as (moves lifted of six; the
// crane each one takes; the foreground cover of the two that were broken, which
// was 20% and 46% before any of this):
//   brush  3   2/6   22.0 / 10.2   11% / 23%      SHIPPED
//   brush  4   2/6   23.5 /  9.8   10% / 22%
//   brush  6   1/6   -    / 20.6   21% / 25%   (measured under an earlier rule)
// 4 costs a unit and a half of extra crane for nothing a number can see; 6 asked
// 57 units on the traverse's entrance, more than any stand allows, so that move
// kept the path it had. ⚠ The 6 row was taken before flDirRise below stopped the
// solve craning over things the path passes UNDER, so it is an upper bound on
// what 6 would ask now rather than a measurement of it; 3 and 4 are current.
// 3.0 units is 19 cm in WORLD.unitM. ?brush=<m> sweeps it.
const FL_DIR_BRUSH = 3.0;
// How many points of the drawn surface the field measurement keeps (flDirField).
// 8000 over a stand of seven is one vertex in ~200 and about 0.2 ms a scan
// against a 500 ms scan interval. The crane's solve walks it once per path
// sample per pass — 21 to 81 samples, at most three passes, once a cut.
const FL_DIR_SOLIDN = 8000;
// scratch for the solve, which runs once a cut and must not allocate in a frame
const _arcE = { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } };
// ⚠ `+null` IS 0 AND 0 IS A LEGAL MARGIN, so this reads the parameter's
// PRESENCE before its value. The first version did not, and every unswept run
// of the page therefore flew at margin 0 while the swept ones flew at the number
// on the URL — which is the worst possible arrangement, because the ladder in
// the comment above was measured correctly and the default was a different
// program. It showed up as a shipped build reproducing a sweep rung nobody had
// asked for. flEstabKnobs is safe from this by construction (it needs four
// finite numbers); a single-number knob is not.
function flBrushKnob() {
  if (typeof location === 'undefined') return FL_DIR_BRUSH;
  const q = new URLSearchParams(location.search).get('brush');
  if (q === null) return FL_DIR_BRUSH;
  const v = +q;
  return isFinite(v) && v >= 0 ? v : FL_DIR_BRUSH;
}
// ⚠ AND IT ONLY CLIMBS OUT OF WHAT IT IS IN, WHICH IS NOT THE SAME AS CLIMBING
// OVER WHAT IS NEAR. The first version asked the eye to be above everything
// within `m` in PLAN, and a path that passes comfortably UNDER a canopy is then
// asked to get over it: measured on ?garden=7&seed=1337, `close -> low` has a
// true clearance of 6.41 units to anything drawn and the solve still wanted a
// 21-unit crane, which took the clearance to 2.95 and the foreground cover from
// 7% to 20%. It made a clean move worse in order to satisfy a requirement the
// move never violated. Passing beneath a plant is a perfectly good shot.
//
// So a point only pushes the eye when the eye is INSIDE its sphere — |dy| <
// sqrt(m^2 - dp^2) with dp < m — and then it pushes to the top of it. Rising
// out of one sphere can put the eye inside a higher one, so the walk repeats;
// four passes, and on this field it converges in one or two.
function flDirRise(F, x, z, y0, m) {
  const m2 = m * m;
  let y = y0;
  for (let it = 0; it < 4; it++) {
    let top = y;
    for (const p of F.solid) {
      const dx = p[0] - x, dz = p[1] - z;
      const q = m2 - dx * dx - dz * dz;
      if (q <= 0) continue;
      const sp = Math.sqrt(q);
      if (y <= p[2] - sp || y >= p[2] + sp) continue;
      const t = p[2] + sp;
      if (t > top) top = t;
    }
    if (top <= y + 1e-4) break;
    y = top;
  }
  return y;
}
// THE WINDOW, AND IT HAS A FLAT TOP RATHER THAN A PEAK. A crane rises, HOLDS,
// and comes down; `4w(1-w)` is a triangle with rounded corners and is at full
// height for an instant. Two smoothsteps back to back are the shape a camera
// operator actually flies, and they are also what makes the solve behave:
// dividing a required excess by the window is how a need at w = 0.2 sizes an
// amplitude that peaks in the middle, and under a parabola that division is 2.8x
// at w = 0.1 and blows the amplitude past any cap the stand allows. Measured on
// ?garden=7&seed=21 at the shipped margin, `bank -> glide` asked 24.4 units with
// the parabola and 21.9 with this, on the same path — and 21.9 is inside what
// the stand allows where 24.4 is not, so under the parabola that move keeps its
// straight path and under this one it cranes.
//
// Both ends are smoothsteps, so the lift leaves and returns with zero slope in
// `w`, which is on top of `w` itself being a smoothstep of elapsed time.
//
// The floor is 0.5: below it the window is small enough that the division is
// again the thing deciding, and the path there is a second from a pose that has
// been solved and is allowed to stand near tissue. It is w in [0.16, 0.84].
function flDirBump(w) {
  return smoothstep(0, 0.35, w) * smoothstep(1, 0.65, w);
}
function flDirLift(dir, w) { return (dir.liftA || 0) * flDirBump(w); }
function flDirArc(dir, F) {
  dir.arcAt = dir.t0;
  dir.liftA = 0;
  // the branch this move goes round on, taken once from the poses as they stand
  // on the cut frame and then only ever unwrapped against (flDirPolar)
  dir.arcD = ((Math.atan2(dir.wantEye.z - F.cz, dir.wantEye.x - F.cx)
    - Math.atan2(dir.fromEye.z - F.cz, dir.fromEye.x - F.cx)
    + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (!F.solid || !F.solid.length) return;
  const m = flBrushKnob();
  const e = _arcE;
  // ⚠ THE SAMPLE SPACING IS SET BY THE MARGIN, not by a round number, and that
  // is not a nicety: a fixed 21 samples on a 100-unit path is 5 units apart,
  // wider than the 3-unit margin, so the solve can thread the path between two
  // samples and declare a canopy cleared that it flies straight through. Half
  // the margin means no gap in the path is unexamined. The base path is measured
  // first with a pass that touches no geometry, and the count is capped: a solve
  // is one pass over F.solid per sample and it runs on a cut frame.
  let L0 = 0, qx = 0, qy = 0, qz = 0;
  for (let i = 0; i <= 20; i++) {
    flDirPolar(e, dir, F, i / 20);
    if (i) L0 += Math.hypot(e.x - qx, e.y - qy, e.z - qz);
    qx = e.x; qy = e.y; qz = e.z;
  }
  const N = Math.max(21, Math.min(81, Math.round(2 * L0 / Math.max(0.5, m)) + 1));
  // ⚠ AND THE SOLVE IS ITERATED, because a crane can fly into something the
  // unlifted path was under. The requirement is evaluated at the height the eye
  // will ACTUALLY be at, which depends on the amplitude being solved for, so one
  // pass answers the question the old path asked rather than the new one — and
  // the new path is higher everywhere except at its ends. Three passes, each one
  // starting from the amplitude the last found; it settles on the first or
  // second here, and the kill criterion below catches the case where it does not.
  let A = 0;
  for (let pass = 0; pass < 3; pass++) {
    let A2 = A;
    for (let i = 1; i < N - 1; i++) {
      const w = i / (N - 1), b = flDirBump(w);
      if (b < 0.5) continue;
      flDirPolar(e, dir, F, w);
      const y = e.y + A * b;
      const ex = flDirRise(F, e.x, e.z, y, m) - y;
      if (ex > 0 && A + ex / b > A2) A2 = A + ex / b;
    }
    if (A2 <= A + 1e-3) break;
    A = A2;
  }
  // ⚠ AND WHEN IT CANNOT CLEAR, IT DOES NOT RISE AT ALL — THE CAP IS A KILL
  // CRITERION AND NOT A CLAMP, which is the single most important line in this
  // mechanism. The requirement is not always satisfiable: a path that runs the
  // length of a 49-unit Abyssal Frond asks the eye to get over 49 units, and no
  // move of this length has that in it. A clamp answers by rising as far as it
  // is allowed, and that is the worst of the three options — measured on
  // ?garden=7&seed=1337, `close -> low` wanted 39.4 units, took a clamp at 21.5,
  // and flew the eye through the CROWN of the plant it could not clear:
  // clearance 6.41 -> 1.67 units and foreground cover 8% -> 18%, a crane that
  // made the shot worse than the straight path it replaced. BETWEEN the plants
  // and OVER the plants are both fine; a third of the way up one is the height
  // that is neither. So if the crane cannot do the job, the director keeps the
  // move it already had, and the number is reported rather than acted on.
  //
  // The ceiling itself is `hHi` PLUS THE MARGIN, and both halves are derived.
  // `hHi` is the 85th percentile of plant height — the statistic the establishing
  // frame is already solved from, and chosen there for this same reason, that a
  // stand of seven regularly hands one member a veto; rising above it is a
  // helicopter and there is nothing up there to clear. The margin is on top of it
  // because clearing a point AT that height means standing up to `m` above it,
  // which is what the closed form says: a ceiling of exactly `hHi` forbids the
  // one crane that gets over the field's own skyline. Measured on
  // ?garden=7&seed=1337, `glide -> dolly` asked 32.4 against a bare `hHi` of 30.9
  // and was killed by 5% — with the margin the ceiling is 33.9 and the move
  // cranes.
  flDirPolar(e, dir, F, 0.5);
  dir.arcNeed = A;                          // what clearing it would have cost
  dir.arcCap = Math.max(0, F.hHi + m - e.y);   // what this stand allows
  if (A > dir.arcCap) A = 0;
  dir.liftA = A > 0.05 ? A : 0;
  // A LIFTED PATH IS A LONGER PATH, AND THE PACING LAW IS PEAK SPEED. flDirPace
  // priced this move off the straight-line distance between the poses on the cut
  // frame; that was already an under-estimate once the eye started arcing, and a
  // crane on top of it would put the peak well over FL_DIR_VPEAK — which is the
  // whip this director has been chased around by three times. So the move is
  // re-priced off the length of the path it will actually fly, measured as the
  // polyline through these same samples.
  let len = 0, px = 0, py = 0, pz = 0;
  for (let i = 0; i < N; i++) {
    const w = i / (N - 1);
    flDirPolar(e, dir, F, w);
    e.y += flDirLift(dir, w);
    if (i) len += Math.hypot(e.x - px, e.y - py, e.z - pz);
    px = e.x; py = e.y; pz = e.z;
  }
  flDirPrice(dir, len);
}
function flDirBlendEye(out, dir, F, w) {
  if (dir.cut && dir.arcAt !== dir.t0) flDirArc(dir, F);
  flDirPolar(out, dir, F, w);
  out.y += flDirLift(dir, w);
}
// AND THE AIM RISES WITH IT, BECAUSE A CRANE IS A TRANSLATION AND NOT A SWING.
// Lifting the eye alone leaves the target on the ground, which pitches the lens
// down onto the canopy it has just risen over — and a canopy seen from ten units
// above it at close range is the same wall of near foliage this whole mechanism
// exists to remove. Measured on ?garden=7&seed=21 with tools/flowers_trans.mjs:
// eye-only lift took the foreground cover of `bank -> glide` from 20% to 27%,
// i.e. it made the defect worse while making the clearance better. Moving the
// aim by the same amount slides the whole picture up instead: the composition
// the two poses agreed on is untouched, the foreground drops below the frame,
// and what a viewer sees is the stand from higher up for a couple of seconds.
// It is the same argument the traverse makes about the orbit — a second motion
// with nothing relating it to the first is two motions, not one.
// ...BUT NOT ALL OF THE WAY, AND THIS IS THE ONE FRACTION IN THE MECHANISM.
// FL_DIR_CRANE_AIM is how much of the eye's rise the aim takes with it, and the
// dial has a defect at each end. Swept on ?garden=7&seed=21 over `bank -> glide`,
// the move that cranes 21.9 units there, as (foreground cover / least ink — how
// much of the frame has ANY drawn vertex in it at the emptiest sample):
//   no crane   21% / 45%
//   aim 0.0    20% / 44%   the aim stays down, the lens pitches into the canopy
//                          it has just cleared, and the crane buys nothing
//   aim 0.5    11% / 38%   SHIPPED
//   aim 1.0    10% / 25%   the picture translates exactly and the top of the arc
//                          is empty sky — read on film as three blank frames
// Half takes nearly all of the cover and a third of the emptiness, which is the
// composition a crane shot is actually cut for: the stand in the lower half of
// the frame with sky above it. ?aim=<f> sweeps it.
const FL_DIR_CRANE_AIM = 0.5;
function flAimKnob() {
  if (typeof location === 'undefined') return FL_DIR_CRANE_AIM;
  const q = new URLSearchParams(location.search).get('aim');
  if (q === null) return FL_DIR_CRANE_AIM;
  const v = +q;
  return isFinite(v) && v >= 0 && v <= 1 ? v : FL_DIR_CRANE_AIM;
}
function flDirBlendTgt(out, dir, w) {
  out.copy(dir.fromTgt).lerp(dir.wantTgt, w);
  out.y += flAimKnob() * flDirLift(dir, w);
}

// Advance the shot clock. Returns the name of the shot to play this frame, and
// sets dir.cut on the frame a new shot begins (which is when the subject is
// re-picked and the transition's start pose is frozen). A shot's total length
// is flDirTrans(dir) + hold, so nothing ever cuts mid-transition.
//
// ⚠ THE HOLD IS ALREADY THE DWELL AFTER THE MOVE, AND THAT IS WORTH SAYING
// BECAUSE IT HAS BEEN READ THE OTHER WAY. `low` holds 9 s against a transition
// the pacing law can price anywhere from 3.5 to 9 s, which is a third to a half
// of the SEGMENT — but not of the dwell: this line adds the two rather than
// taking the move out of the hold, so a shot that took nine seconds to arrive
// still gets every second of its hold. Measured rather than argued, on
// ?garden=7&seed=21 with tools/flowers_clip.mjs, which reports each segment's
// wall-clock length and where the camera stopped moving inside it: `low` runs
// 12.3 s of which the move is 3.3, in the build before the crane and in the
// build after it. The camera trails the blend by the 0.12-a-frame damping in
// 40_boot, which is about 0.15 s at 60 fps and is the only part of the dwell
// the move actually eats.
//
// So neither of the two repairs someone might reach for is needed, and both
// would cost: lengthening the hold pushes a rotation the crane has already
// taken from 126 to 130 s further out, and starting the hold clock on arrival
// is what this line does.
function flDirClock(dir, now) {
  const sh = FL_DIR_SHOTS[dir.shot];
  const el = (now - dir.t0) / 1000;
  dir.cut = false;
  if (el > flDirTrans(dir) + sh.hold * (dir.holdK || 1)) {
    dir.shot = (dir.shot + 1) % FL_DIR_SHOTS.length;
    dir.t0 = now;
    // The heading is the field's long axis (flDirAng); what walks between
    // shots is which END of it the camera stands at, and a jitter about it.
    // The jitter walks by the golden angle — any irrational step would do,
    // this one is on hand — because a heading that repeats is what makes a
    // cycling director read as a loop.
    dir.ang = (dir.ang + 2.39996323) % TAU;
    dir.flip = dir.flip ? 0 : Math.PI;
    dir.jit = (dir.ang / TAU - 0.5) * 1.0;   // +-0.5 rad, never repeating
    // and which way the drift orbits, off the same irrational walk. A constant
    // direction reads as one continuous circuit of the garden, which sounds
    // better than it looks: with the heading already flipping end for end at
    // every cut, half the shots would then orbit INTO the move they just made.
    dir.spin = dir.jit >= 0 ? 1 : -1;
    dir.holdK = 1;
    dir.cut = true;
  }
  dir.el = dir.cut ? 0 : el;
  return FL_DIR_SHOTS[dir.shot].name;
}

// HOW LONG TO HOLD ON A SUBJECT, AND IT IS THE SUBJECT THAT SAYS. The two shots
// that have one — `close` and `dolly` — hold a base 16 and 18 seconds whatever
// they found, so the film gives a five-petal corolla on the far rim exactly as
// long as the best flower in the garden. `flowerScore` already ranks them, and
// the director already carries the winner's score.
//
// The reference is the director's OWN running mean of the scores it has picked,
// which is the only scale available that does not need a number written down:
// what "a good subject" means in a field of Nightglass Parasols is not what it
// means in a field of Cathedral Ferns, and the garden's composition is a seed's
// business. +-1/3, by eye, and clamped — a subject three times the average is
// not worth three times the screen time, and nothing should ever be cut so
// short that it reads as a mistake. The EMA is slow (1/6) so one exceptional
// flower does not immediately become the new normal.
function flDirDwell(dir, score) {
  if (!(score > 0)) { dir.holdK = 1; return; }
  if (!(dir.sAvg > 0)) dir.sAvg = score;
  const k = score / dir.sAvg;
  dir.sAvg += (score - dir.sAvg) / 6;
  const name = FL_DIR_SHOTS[dir.shot].name;
  dir.holdK = (name === 'close' || name === 'dolly')
    ? Math.max(0.7, Math.min(1.35, 0.62 + 0.38 * k)) : 1;
}

// THE FOCUS RACK — the cheapest atmosphere in the piece, and it is already
// paid for. The defocus pass reads alpha as linear depth and blurs by
// `|z - uFocus| / uRange`, and 40_boot has always set uFocus to the
// camera-to-target distance — so the lens is a real lens pointed at the subject
// and nothing has ever pulled focus with it.
//
// A shot therefore ENTERS out of focus and resolves: the plane of focus starts
// in front of the subject, on whatever foreground the shot is looking through,
// and racks back onto the subject over the second half of the move. The
// amplitude is not chosen — it is the lens's own depth of field, `uRange`,
// which is exactly the distance over which this pass goes from sharp to fully
// blurred. Racking by 1.2 of it means the subject starts unambiguously soft
// and finishes sharp, in every shot, without any shot having to say by how
// much: a close-up's range is 0.22 of its focal distance and the establishing
// shot's is 0.55 of a distance ten times larger.
//
// Capped at 0.45 of the focal distance so the near plane can never cross the
// camera on the wide shot, where 1.2 uRange is 58 units and the subject is 89
// away. The window is [0.35, 1.35] of the transition: the rack starts a third
// into the move, so the first thing that happens on a cut is the move, and it
// finishes a third of a transition AFTER the camera has settled, so the last
// thing that resolves in a new frame is the subject.
const FL_RACK = [0.35, 1.35, 1.2, 0.45];
function flDirFocus(dir, fDist, range) {
  if (!dir || !(range > 0)) return fDist;
  const T = flDirTrans(dir);
  const w = smoothstep(FL_RACK[0] * T, FL_RACK[1] * T, dir.el);
  const amp = Math.min(FL_RACK[2] * range, FL_RACK[3] * fDist);
  return fDist - (1 - w) * amp;
}
