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
const FL_DIR_SHOTS = [
  { name: 'wide', hold: 16 },
  { name: 'bank', hold: 12 },
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
  const d = Math.hypot(x - dir.fromEye.x, y - dir.fromEye.y, z - dir.fromEye.z);
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
  const fh = [], hs = [], pos = [], reach = [], plan = [];
  for (const s of specs) {
    if (!s.S) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    sx += o[0]; sz += o[2]; n++;
    let ymax = 0, rch = 0;
    for (const ax of s.S.plant.axes) for (const p of ax.pts) {
      if (p[1] > ymax) ymax = p[1];
      const rr = Math.hypot(p[0] - o[0], p[2] - o[2]);
      if (rr > rch) rch = rr;
      plan.push([p[0], p[2]]);
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
  return { cx, cz, R, Rout, hMid, hHi, hTop: med(hs), pa, n, discs, hull };
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
function flDirAng(dir, F) {
  return F.pa + dir.flip + dir.jit + flDirOrbit(dir);
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

function flDirScoreOf(specs, i, ai, scoreAxis, F) {   // i === 0 is the hero
  const s = specs[i];
  if (!s || !s.S || !s.S.plant.axes[ai]) return 0;
  const base = scoreAxis(s, ai);
  if (!(base > 0)) return 0;
  const bb = s.B.floralBounds(ai);
  if (!bb) return 0;
  const rim = F ? 0.65 + 0.5 * smoothstep(0, F.R, Math.hypot(bb.c[0] - F.cx, bb.c[2] - F.cz)) : 1;
  return base * (0.25 + 0.75 * flDirOpenness(s.S.plant.axes[ai]))
    * flDirCrowd(specs, s, bb) * rim * flDirCompact(bb) * (i === 0 ? FL_DIR_HERO : 1);
}

function flDirPick(specs, eye, scoreAxis, F) {   // eslint-disable-line no-unused-vars
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
      const sc = base * open * clear * rim * flDirCompact(bb) * (i === 0 ? FL_DIR_HERO : 1);
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
  const a0 = flDirAng(dir, F);
  if (dir.cut || dir.estabEnd === undefined) {
    dir.estabEnd = solve(a0 + Math.PI).fill > solve(a0).fill ? Math.PI : 0;
  }
  const sol = solve(a0 + dir.estabEnd);
  const a = sol.ang, c = Math.cos(a), s = Math.sin(a), D = sol.D;
  // and the lateral shift that centres what is drawn, re-read at the distance
  // actually used — `mid` is in tangent units, so mid*D is the world offset at
  // the field's own depth, and one correction is enough because the residual is
  // second order in (depth spread / D).
  const ex = flFieldSpanP(F, a, D);
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
  const mx = Math.sin(a) * ex.mid * D, mz = -Math.cos(a) * ex.mid * D;
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

// THE LOW UPWARD SHOT. Kneeling OUTSIDE the field at the foot of the best
// flower's own plant and looking up it, so the plant and its neighbours cross
// the sky's glow (FL_BG_FS's uGlow) instead of the ground — the one framing
// here where a silhouette reads. Short: it is punctuation, not a scene.
function flDirPoseLow(dir, F) {
  const a = flDirAng(dir, F) + 0.55, c = Math.cos(a), s = Math.sin(a);
  // Two thirds of the wide shot's standoff, the eye all but on the soil, and
  // the aim ABOVE the flowers: the horizon drops off the bottom of the frame
  // and the whole bank is read against the sky's glow instead of against the
  // ground. ⚠ This was first built as a kneel at the foot of one plant, which
  // is a beautiful idea and does not survive contact with this catalogue —
  // these species carry leaves to the ground and reach 3-4 units, so an eye
  // anywhere inside the ring is inside a canopy. Twice measured, twice a wall
  // of blurred leaf. The only interior shot here is the close-up, which steers
  // around its trunk on purpose.
  const D = Math.max(F.R * 1.1 + 4, F.hTop * 1.35);
  dir.wantEye.set(F.cx + c * D, FL_DIR_EYE_FLOOR * 0.85, F.cz + s * D);
  dir.wantTgt.set(F.cx - c * F.R * 0.15, F.hMid * 1.45, F.cz - s * F.R * 0.15);
  flDirPace(dir, dir.wantEye.x, dir.wantEye.y, dir.wantEye.z);
  return Math.max(3, F.R * 0.8);
}

// Advance the shot clock. Returns the name of the shot to play this frame, and
// sets dir.cut on the frame a new shot begins (which is when the subject is
// re-picked and the transition's start pose is frozen). A shot's total length
// is flDirTrans(dir) + hold, so nothing ever cuts mid-transition.
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
