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
// 71 s of hold + 27.5 s of transition = 98.5 s, against 92 s for the old four
// (72 + 20). One more shot for six and a half seconds of cycle.
const FL_DIR_SHOTS = [
  { name: 'wide', hold: 16, trans: 7.5 },
  { name: 'bank', hold: 12 },
  { name: 'dolly', hold: 18 },
  { name: 'close', hold: 16 },
  { name: 'low', hold: 9 },
];
// Seconds of eased travel between shots. 5 s across the ~25 units a wide-to-
// close move covers is ~5 u/s at the peak of a smoothstep — a glide, not a
// whip. A shot's hold does NOT start until its transition has finished, so the
// director can never cut mid-move.
//
// A shot may state its own, and `wide` does. Every cut flips the heading end
// for end, so a transition crosses the field: at ?garden=7 the old worst move
// was ~87 units in 5 s (17 u/s mean, ~26 at the peak of a smoothstep, since a
// smoothstep peaks at 1.5x its mean). The establishing shot stands at 88.7
// units where `bank` stands at 47.9, which takes that move to ~136 units and
// would have peaked near 41 u/s — 2.6 m/s in WORLD.unitM, a jog. 7.5 s puts it
// back at 27, within a unit of the peak the other four already have. It is
// NOT the 59-62 u/s whip the close-up's arrival gate was built for; it is the same
// arithmetic caught one shot earlier.
const FL_DIR_TRANS = 5.0;
function flDirTrans(dir) {
  const sh = FL_DIR_SHOTS[dir.shot];
  return (sh && sh.trans) || FL_DIR_TRANS;
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
function flDirField(specs) {
  let n = 0, sx = 0, sz = 0;
  const fh = [], hs = [], pos = [], reach = [];
  for (const s of specs) {
    if (!s.S) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    sx += o[0]; sz += o[2]; n++;
    let ymax = 0, rch = 0;
    for (const ax of s.S.plant.axes) for (const p of ax.pts) {
      if (p[1] > ymax) ymax = p[1];
      const rr = Math.hypot(p[0] - o[0], p[2] - o[2]);
      if (rr > rch) rch = rr;
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
  // THE FIELD'S SHORT AXIS, from the plan covariance of the origins, is where
  // the camera stands: a stand of seven is never round, and standing off the
  // SHORT axis lays the long one ACROSS the frame, which is what fills a 1.41
  // landscape picture with plants. Standing on the long axis and looking down
  // it was tried first and is the bunched column again — the specimens line up
  // one behind another and occupy the middle fifth of the width.
  let sxx = 0, szz = 0, sxz = 0;
  for (const p of pos) {
    const dx = p[0] - cx, dz = p[1] - cz;
    sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
  }
  const pa = 0.5 * Math.atan2(2 * sxz, sxx - szz) + Math.PI / 2;
  return { cx, cz, R, Rout, hMid, hHi, hTop: med(hs), pa, n };
}

// The heading a shot is taken from: the field's long axis, flipped end for end
// between shots and jittered, so no two consecutive shots come from the same
// side and none of them points at the empty quarter.
function flDirAng(dir, F) {
  return F.pa + dir.flip + dir.jit;
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
function flDirOutward(dir, F, bb) {
  let x = bb.c[0] - F.cx, z = bb.c[2] - F.cz;
  const l = Math.hypot(x, z);
  if (l < 0.75) { const a = flDirAng(dir, F); return { x: Math.cos(a), z: Math.sin(a) }; }
  return { x: x / l, z: z / l };
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
//   WIDTH   the field's full diameter 2*Rout across fW of the frame width
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
function flDirPoseEstab(dir, F, cam) {
  const fovH = 2 * Math.tan(cam.fov * Math.PI / 360);
  const A = Math.max(0.5, cam.aspect);
  const k = flEstabKnobs();
  const dW = 2 * F.Rout / (k[0] * A * fovH);
  const dH = F.hHi / (k[1] * fovH);
  // and never inside the field it is establishing, whatever the fractions say
  const D = Math.max(dW, dH, F.Rout * 1.15 + 6);
  const a = flDirAng(dir, F), c = Math.cos(a), s = Math.sin(a);
  const yT = fovH * D * (0.5 - k[2]);
  const yE = Math.max(FL_DIR_EYE_FLOOR, yT + fovH * D * (k[3] - 0.5));
  dir.wantEye.set(F.cx + c * D, yE, F.cz + s * D);
  // aimed at the MIDDLE, unlike every other shot here: the establishing frame
  // is the one whose subject is the whole field, so there is nothing to push
  // into the near half of the picture.
  dir.wantTgt.set(F.cx, yT, F.cz);
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
  const t = (2 * smoothstep(0, 1, u) - 1) * F.R * 0.95;
  dir.wantEye.set(F.cx + c * D - s * t,
    Math.max(FL_DIR_EYE_FLOOR, F.hMid * 0.42),
    F.cz + s * D + c * t);
  // aim two thirds of the way from the middle of the field to the subject, so
  // the shot has a subject AND still holds the field around it
  dir.wantTgt.set(lerp(F.cx, bb.c[0], 0.65),
    lerp(F.hMid * 0.85, bb.c[1], 0.65),
    lerp(F.cz, bb.c[2], 0.65));
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
  if (el > flDirTrans(dir) + sh.hold) {
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
    dir.cut = true;
  }
  dir.el = dir.cut ? 0 : el;
  return FL_DIR_SHOTS[dir.shot].name;
}
