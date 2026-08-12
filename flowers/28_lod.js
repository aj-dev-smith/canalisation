// THE BLADE MESH GETS A DISTANCE TERM.
//
// `bladeMesh` (70_app.js) is, in CLAUDE.md's words, "the only level of detail
// in the piece with no distance term". Its two existing ceilings are both
// conservations — never finer than the tissue, and quads per unit of DRAWN
// BLADE AREA held constant against the largest blade in the scene — and with
// one plant that is very nearly the whole answer, because there is only one
// distance and the piece was tuned at it.
//
// A FIELD is where the missing term bites, and the profile says exactly where:
// of a 118 ms capture of seven specimens (test/flowers_capture.mjs, seed 21 at
// world step 3000), 70% is FLORAL organs and 58% of every float emitted is the
// petal stream. That is not the leaves. It is `20_draw.js` handing every floral
// organ `detL = 1.0` — the microscope, permanently on, so a petal is built at
// the leaf's OWN LATTICE (measured: 5,600 vertices a petal, a ~75x75 grid).
// That is right and deliberate for the close-up the piece is named after: at
// 22x10 a fenestration cut is a row of rectangles and a petal rim is a hexagon.
// It is nonsense for a flower forty units away that covers sixteen pixels.
//
// THE LAW: NEVER FINER THAN THE RASTER — at most one quad per pixel.
//
// This is the same statement the rest of the piece already makes in three
// places: the vein cull ("draw the veins this blade can resolve"), the cell
// thinning, and 15_petal.js's ripple guard ("what the instrument cannot
// resolve, it does not draw as noise"). A quad narrower than a pixel cannot be
// seen — it is not detail, it is aliasing with a cost attached. So:
//
//     px/unit = pxHeight / (2 d tan(fov/2))          the raster, at distance d
//     cap     = round(bl * px/unit)                  one quad per pixel
//     mu, mv  = min(shipped answer, cap)
//
// Nothing here is a taste constant: `pxHeight` is the drawing buffer, `fov` is
// the camera's, and 1.0 quads per pixel is Nyquist rather than a preference.
// It is a CAP and never a raise, so it cannot make anything finer than the
// shipped answer, and the floor stays `bladeMesh`'s own 4 x 2 — a blade is
// still a surface.
//
// WHY IT NEEDS NO HERO EXEMPTION, and what measuring that turned up. The
// subject of a shot is large on screen by construction, so at the flower
// close-up's own framing a petal is ~180 px against a ~75-cell lattice and the
// cap lands above it: the LARGEST petal in the close-up is drawn float for
// float as it was, which is the gate in test/flowers_capture.mjs (the sweep
// beside it prints the whole stream against distance, and 96.6% of it survives
// the browser's own measured close-up). The exemption is the law itself, which
// is the property the vein cull's anchor was built for too.
//
// The 3.4% that does not survive, and the 18% of the TRI stream that goes with
// it, is worth knowing about because it is not the leaves: it is STAMENS and
// CARPELS. `detL = 1.0` is applied by organ IDENTITY, so the microscope draws a
// 0.1-unit filament at the same full lattice as a petal that fills the frame —
// a 70-pixel organ built as a 75 x 75 grid. The two stills are
// indistinguishable (shots/solo_before2.png vs solo_after2.png), so the solo
// page is NOT byte-identical any more and the difference is sub-pixel by
// construction. That is the honest statement, and it is the strongest evidence
// that the microscope wanted a size term rather than an identity test.
//
// The distance is measured to the specimen's NEAR FACE (bounding sphere), not
// to its centre and not per organ: `bladeMesh` is handed a leaf and a length
// and knows nothing about where the organ stands, so the caller sets one
// distance per specimen (40_boot's captureDirty). The near face is the
// conservative end of that approximation — it over-estimates how big the
// specimen's furthest organ is, so the cap can only ever be too generous. The
// same near-face measure the fog is taken from.
//
// `flSetRaster(eye, pxHeight, fov)` with pxHeight 0 makes this file a
// pass-through to the shipped `bladeMesh`, byte for byte — that is the "before"
// the harness measures against.

const FL_LOD_EYE = [0, 0, 0];
let FL_LOD_PXH = 0;        // drawing-buffer height in pixels; 0 disables
let FL_LOD_TAN = 0.376;    // tan(fov/2), the camera's vertical half-angle

function flSetRaster(eye, pxHeight, fov) {
  FL_LOD_EYE[0] = eye[0]; FL_LOD_EYE[1] = eye[1]; FL_LOD_EYE[2] = eye[2];
  FL_LOD_PXH = pxHeight > 0 ? pxHeight : 0;
  if (fov > 0) FL_LOD_TAN = Math.tan(fov / 2);
}

// Pixels per world unit at distance d — the raster, which is what the law is
// about. Zero when no raster has been declared (the pass-through case).
function flPxPerUnit(d) {
  if (!FL_LOD_PXH || !(d > 0)) return 0;
  return FL_LOD_PXH / (2 * d * FL_LOD_TAN);
}

// How far a specimen's NEAR FACE stands from the eye. Clamped at a tenth of a
// unit so a camera inside the canopy asks for the lattice rather than dividing
// by zero.
function flSpecimenDist(S) {
  if (!FL_LOD_PXH) return 0;
  const b = S.plant.bounds();
  const d = Math.hypot(b.cx - FL_LOD_EYE[0], b.cy - FL_LOD_EYE[1], b.cz - FL_LOD_EYE[2]);
  const r = 0.5 * Math.hypot(b.w, b.h);
  return Math.max(0.1, d - r);
}

// Drop-in for `env.bladeMesh`: the shipped answer, then the raster cap.
// `this` is the env, and `this._flD` is the near-face distance the caller set
// for the specimen being drawn (0 = no raster known, no cap).
function flBladeMeshLOD(L, bl, detL, out) {
  App.prototype.bladeMesh.call(this, L, bl, detL, out);
  const ppu = flPxPerUnit(this._flD || 0);
  if (!ppu) return out;
  const cap = Math.round(bl * ppu);
  if (cap < out[0]) out[0] = Math.max(4, cap);
  if (cap < out[1]) out[1] = Math.max(2, cap);
  return out;
}

// what the term is currently doing — for the HUD, and for the harness to
// assert the close-up is untouched
const FL_LOD = {
  px: flPxPerUnit,
  cap: (bl, d) => {
    const ppu = flPxPerUnit(d);
    return ppu ? Math.round(bl * ppu) : Infinity;
  },
};
