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
//     dead after twenty seconds. Four shots cycle: the wide field, a dolly
//     across it at flower height, a close-up on the best flower ANYWHERE in
//     the field, and a low upward shot with the plants against the sky glow.
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
// shortest because it is a punctuation mark, not a scene. ---
const FL_DIR_SHOTS = [
  { name: 'wide', hold: 20 },
  { name: 'dolly', hold: 24 },
  { name: 'close', hold: 16 },
  { name: 'low', hold: 12 },
];
// Seconds of eased travel between shots. 5 s across the ~25 units a wide-to-
// close move covers is ~5 u/s at the peak of a smoothstep — a glide, not a
// whip. A shot's hold does NOT start until its transition has finished, so the
// director can never cut mid-move.
const FL_DIR_TRANS = 5.0;
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
// stand, how far out the ring reaches, and — the number the whole wide shot is
// built on — how high the FLOWERS are. Not how high the plants are: this
// garden's tallest specimen is a 46.6-unit Sun Coral whose flowers all sit
// between 5.9 and 13.8, so a framing off plant height points the camera at
// bare stem. Medians, not extremes, for the same reason.
function flDirField(specs) {
  let n = 0, sx = 0, sz = 0;
  const fh = [], hs = [], pos = [];
  for (const s of specs) {
    if (!s.S) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    sx += o[0]; sz += o[2]; n++;
    let ymax = 0;
    for (const ax of s.S.plant.axes) for (const p of ax.pts) if (p[1] > ymax) ymax = p[1];
    hs.push(ymax);
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
  // 75th percentile + a canopy margin: an origin is a stem, and the plant
  // standing on it reaches out. 3.0 is a measured corolla reach (floralBounds
  // r runs 0.5-4.6 across this catalogue; the ring's own spacing is 2.5).
  const R = Math.max(4, ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.75))] + 3.0);
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
  return { cx, cz, R, hMid, hTop: med(hs), pa, n };
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

function flDirScoreOf(specs, i, ai, scoreAxis, F) {
  const s = specs[i];
  if (!s || !s.S || !s.S.plant.axes[ai]) return 0;
  const base = scoreAxis(s, ai);
  if (!(base > 0)) return 0;
  const bb = s.B.floralBounds(ai);
  if (!bb) return 0;
  const rim = F ? 0.65 + 0.5 * smoothstep(0, F.R, Math.hypot(bb.c[0] - F.cx, bb.c[2] - F.cz)) : 1;
  return base * (0.25 + 0.75 * flDirOpenness(s.S.plant.axes[ai]))
    * flDirCrowd(specs, s, bb) * rim * flDirCompact(bb);
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
      const sc = base * open * clear * rim * flDirCompact(bb);
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

// THE WIDE FIELD. Eye just outside the ring at a fifth of flower height,
// aimed PAST the centre: the target sits 0.30 R beyond it, so the mass of the
// field is in the near half of the frame and the far plants have somewhere to
// recede to. Distance 1.75 R + 5 was set by eye against the alternative of
// framing the bound (which is what phase 1 did, and which put the camera 84
// units out): at this distance the ring's near plants overflow the frame edges
// and its far ones stand about a third of frame height.
function flDirPoseWide(dir, F) {
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
// is FL_DIR_TRANS + hold, so nothing ever cuts mid-transition.
function flDirClock(dir, now) {
  const sh = FL_DIR_SHOTS[dir.shot];
  const el = (now - dir.t0) / 1000;
  dir.cut = false;
  if (el > FL_DIR_TRANS + sh.hold) {
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
