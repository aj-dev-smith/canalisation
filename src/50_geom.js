// ---------------------------------------------------------------------------
// Turning simulation state into triangles, lines and points.
// Rebuilt every few frames; nothing here is persistent.
// ---------------------------------------------------------------------------

import { MAXNB } from './10_auxin.js';
import {
  v3, v3set, v3copy, v3add, v3sub, v3scale, v3addScaled, v3dot, v3cross,
  v3norm, v3len, v3lerp, TAU, clamp, lerp, smoothstep,
} from './00_math.js';

export class Buffers {
  constructor() {
    // SIZED FOR A CLEARING, NOT FOR A SPECIMEN.
    //
    // A full buffer drops geometry silently, so the failure is a picture that is
    // merely missing things — `renderer.nTri`/`nLine` sitting on a round number
    // equal to `B.tri.length/10` or `B.line.length/7` means saturated, not busy.
    // That is worth knowing twice over, because it has now happened twice. At
    // 1<<21 one dense specimen reached 86% of the triangle buffer on its own and
    // going into a blade at cell resolution pinned BOTH at exactly their caps,
    // which is where the needles were being thrown away. At 1<<22 a garden of
    // eight pinned both again on the very first frame it was asked for.
    //
    // Eight specimens, 525 organs, framed as a stand: 551k triangles and 664k
    // lines, which is 66% and 55% of these. That is the measurement they are set
    // from rather than a guess, and the headroom above it is deliberate — the
    // close-up modes multiply one blade's cost by a large factor and the garden
    // does not switch them off. Uploads are subarrays, so headroom costs nothing
    // per frame; only the allocation.
    //
    // THE CELL VIEW MOVED TWO OF THESE, and `test/views.mjs` is where the new
    // numbers come from. Worst reachable case is a garden of eight in `cells`:
    //
    //   natural  220k triangles   145k ribbons        221 points
    //   cells      0              316k ribbons     528k points
    //   flux       0              318k ribbons     173k points
    //   field      0                1.5k ribbons   362k points
    //
    // so the point buffer went from 1<<19 — where ONE specimen at cell
    // resolution came to 90-109% of it, which is why nobody had tried this — to
    // 1<<23, and the line buffer from 1<<23 to 1<<24. Both are set from that
    // table with the same headroom rule as before.
    //
    // Note which way the cost went. A whole plant of cells is not what strains
    // this; the NEEDLES are, at 42 floats per six-vertex ribbon against a
    // point's 7. ROADMAP 11 would emit a ribbon as 12 floats and expand it in
    // the vertex shader, which takes the worst case back under 1<<23 and hands
    // back most of the CPU cost as well. Until then this is 128MB of buffer.
    this.tri = new Float32Array(1 << 23);   // pos3 nrm3 col3 emis1 = 10
    this.triN = 0;
    // Lines still get the most traffic: every vein and every needle is a
    // six-vertex camera-facing ribbon, so a refined blade full of committed
    // cells is by far the heaviest thing the scene ever builds.
    this.line = new Float32Array(1 << 24);  // pos3 col3 emis1 = 7
    this.lineN = 0;
    this.pt = new Float32Array(1 << 23);    // pos3 col3 size1 = 7
    this.ptN = 0;
    // AND A FULL BUFFER SAYS SO NOW.
    //
    // Dropping geometry silently is a documented pitfall here that has cost two
    // debugging sessions, and the advice for spotting it was to notice
    // `renderer.nTri` sitting on a round number — which is a thing you have to
    // already suspect in order to check. Every emitter returns early when there
    // is no room; each of them ticks a counter instead of returning quietly, so
    // the HUD and `test/views.mjs` can both say "this picture is missing
    // things" rather than leaving it to be inferred.
    this.dropped = { tri: 0, line: 0, pt: 0 };
  }
  reset() {
    this.triN = 0; this.lineN = 0; this.ptN = 0;
    this.dropped.tri = 0; this.dropped.line = 0; this.dropped.pt = 0;
  }
  // did this frame lose anything?
  saturated() {
    const d = this.dropped;
    return d.tri || d.line || d.pt ? { ...d } : null;
  }
  vert(p, n, c, e) {
    if (this.triN + 10 > this.tri.length) { this.dropped.tri++; return; }
    const t = this.tri, i = this.triN;
    t[i] = p[0]; t[i + 1] = p[1]; t[i + 2] = p[2];
    t[i + 3] = n[0]; t[i + 4] = n[1]; t[i + 5] = n[2];
    t[i + 6] = c[0]; t[i + 7] = c[1]; t[i + 8] = c[2];
    t[i + 9] = e;
    this.triN += 10;
  }
  // one glowing vertex of a vein ribbon
  gv(p, c, e) {
    const l = this.line, i = this.lineN;
    l[i] = p[0]; l[i + 1] = p[1]; l[i + 2] = p[2];
    l[i + 3] = c[0]; l[i + 4] = c[1]; l[i + 5] = c[2]; l[i + 6] = e;
    this.lineN += 7;
  }
  // a plain 2-vertex glowing line (needles are thin by nature)
  seg2(a, b, c, e) {
    if (this.lineN + 42 > this.line.length) { this.dropped.line++; return; }
    v3sub(_sa, b, a);
    v3sub(_sb, VIEW, a);
    v3norm(_sc, v3cross(_sc, _sa, _sb));
    if (!isFinite(_sc[0])) return;
    const w = MINW * 0.85;
    this.ribbon(a, b, _sc, w, w * 0.35, c, e);
  }

  // A vein drawn as a camera-facing ribbon rather than a hairline, so its
  // order — how much traffic it carries — is legible as thickness.
  //
  // WRITTEN STRAIGHT INTO THE BUFFER, and worth knowing how little that bought.
  // This used to build the four corners as four JS arrays and hand them to
  // `gv` — 88,000 short-lived arrays a frame at one specimen's vein count,
  // 316,000 at the needle count a whole plant wants. It looked like the
  // bottleneck and it was not: 8.38ms to 8.15ms on `natural`, 12.97 to 12.10 on
  // the cell view. V8 handles short-lived arrays better than the arithmetic
  // suggested, and the guess cost an hour that a measurement would not have.
  //
  // What a ribbon actually costs is the 42 floats it writes. Measured per
  // primitive on a Cathedral Fern: a ribbon 188ns, a point 37ns — a ratio of
  // 5.1 against a data ratio of 6, so this is memory traffic and essentially
  // irreducible in this vertex format. The way out is a format change, not a
  // micro-optimisation: two vertices and a width attribute expanded in the
  // vertex shader would be 14 floats instead of 42. That is written up in
  // ROADMAP 11, because it would speed up every view at once and it is what
  // stands between the cell view and a whole garden of it.
  //
  // Kept anyway. It is not slower, it allocates nothing on the hottest path in
  // the piece, and the measurement above is the useful part.
  ribbon(a, b, side, w0, w1, c, e) {
    const l = this.line;
    let i = this.lineN;
    if (i + 42 > l.length) { this.dropped.line++; return; }
    const ax0 = a[0] - side[0] * w0, ay0 = a[1] - side[1] * w0, az0 = a[2] - side[2] * w0;
    const ax1 = a[0] + side[0] * w0, ay1 = a[1] + side[1] * w0, az1 = a[2] + side[2] * w0;
    const bx0 = b[0] - side[0] * w1, by0 = b[1] - side[1] * w1, bz0 = b[2] - side[2] * w1;
    const bx1 = b[0] + side[0] * w1, by1 = b[1] + side[1] * w1, bz1 = b[2] + side[2] * w1;
    const c0 = c[0], c1 = c[1], c2 = c[2];
    // a0 a1 b1, then a0 b1 b0
    l[i] = ax0; l[i + 1] = ay0; l[i + 2] = az0;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    l[i] = ax1; l[i + 1] = ay1; l[i + 2] = az1;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    l[i] = bx1; l[i + 1] = by1; l[i + 2] = bz1;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    l[i] = ax0; l[i + 1] = ay0; l[i + 2] = az0;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    l[i] = bx1; l[i + 1] = by1; l[i + 2] = bz1;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    l[i] = bx0; l[i + 1] = by0; l[i + 2] = bz0;
    l[i + 3] = c0; l[i + 4] = c1; l[i + 5] = c2; l[i + 6] = e; i += 7;
    this.lineN = i;
  }
  point(p, c, s) {
    if (this.ptN + 7 > this.pt.length) { this.dropped.pt++; return; }
    const t = this.pt, i = this.ptN;
    t[i] = p[0]; t[i + 1] = p[1]; t[i + 2] = p[2];
    t[i + 3] = c[0]; t[i + 4] = c[1]; t[i + 5] = c[2]; t[i + 6] = s;
    this.ptN += 7;
  }
}

const _a = v3(), _b = v3(), _c = v3(), _d = v3(), _n = v3(), _t = v3(), _u = v3();
const _sa = v3(), _sb = v3(), _sc = v3();

// Where the camera is, for orienting vein ribbons — and how big a pixel is, so
// that a blade can ask what IT resolves rather than what the focal distance
// does. `MINW` is world units per pixel at the camera's orbit distance, which
// is the right answer for one centred specimen and the wrong one the moment
// there are two: a plant across the clearing needs a coarser floor than the one
// in front of the lens, and using the near one draws its veins sub-pixel thin.
//
// `PXR` is the ANGULAR pixel size — world units per pixel per unit of distance —
// so `PXR * d` is the scale at a blade `d` away. Zero means no per-object scale
// was supplied and everything falls back to `MINW`, which is what every caller
// that has not been told about this gets.
let VIEW = v3(0, 0, 1), MINW = 0.004, PXR = 0;
export function setView(eye, minWorld, pxPerDist) {
  v3copy(VIEW, eye); MINW = minWorld; PXR = pxPerDist || 0;
}

// a generalised cylinder along a polyline, with a parallel-transported frame
export function tube(B, pts, radii, sides, colFn) {
  const n = pts.length;
  if (n < 2) return;
  let up = v3(0, 0, 1);
  const prevRing = [], curRing = [], prevNrm = [], curNrm = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    v3sub(_t, pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]);
    if (v3len(_t) < 1e-6) v3set(_t, 0, 1, 0);
    v3norm(_t, _t);
    if (Math.abs(v3dot(_t, up)) > 0.95) v3set(up, 1, 0, 0);
    v3norm(_u, v3cross(_u, up, _t));
    v3norm(_n, v3cross(_n, _t, _u));
    v3copy(up, _n);
    curRing.length = 0; curNrm.length = 0;
    const r = radii[i];
    for (let k = 0; k < sides; k++) {
      const th = (k / sides) * TAU;
      const cs = Math.cos(th), sn = Math.sin(th);
      const nx = _u[0] * cs + _n[0] * sn;
      const ny = _u[1] * cs + _n[1] * sn;
      const nz = _u[2] * cs + _n[2] * sn;
      curNrm.push(v3(nx, ny, nz));
      curRing.push(v3(p[0] + nx * r, p[1] + ny * r, p[2] + nz * r));
    }
    if (i > 0) {
      const c0 = colFn((i - 1) / (n - 1)), c1 = colFn(i / (n - 1));
      for (let k = 0; k < sides; k++) {
        const k2 = (k + 1) % sides;
        B.vert(prevRing[k], prevNrm[k], c0.c, c0.e);
        B.vert(curRing[k], curNrm[k], c1.c, c1.e);
        B.vert(prevRing[k2], prevNrm[k2], c0.c, c0.e);
        B.vert(prevRing[k2], prevNrm[k2], c0.c, c0.e);
        B.vert(curRing[k], curNrm[k], c1.c, c1.e);
        B.vert(curRing[k2], curNrm[k2], c1.c, c1.e);
      }
    }
    prevRing.length = 0; prevNrm.length = 0;
    for (let k = 0; k < sides; k++) { prevRing.push(curRing[k]); prevNrm.push(curNrm[k]); }
  }
}

// map a point in blade space (u along, v across) into world space, with a
// little curl so blades are not flat cards
function bladePoint(out, frame, u, v, len, wid, curl, ripple, off) {
  const bend = curl * u * u;
  const rip = Math.sin(u * 9.0 + v * 5.0) * ripple * u;
  const n = bend + rip + (off || 0);
  out[0] = frame.o[0] + frame.x[0] * u * len + frame.z[0] * v * wid + frame.y[0] * n;
  out[1] = frame.o[1] + frame.x[1] * u * len + frame.z[1] * v * wid + frame.y[1] * n;
  out[2] = frame.o[2] + frame.x[2] * u * len + frame.z[2] * v * wid + frame.y[2] * n;
  return out;
}

const P0 = v3(), P1 = v3(), P2 = v3(), E1 = v3(), E2 = v3(), NN = v3();
const _pa = v3(), _pb = v3(), _pc = v3(), _e1 = v3(), _e2 = v3(), _nn = v3();
const _q0 = v3(), _q1 = v3(), _q2 = v3(), _q3 = v3(), _side = v3();
const _n0 = v3(), _n1 = v3(), _n2 = v3(), _n3 = v3(), _cc = v3(), _fc = v3();
const _c0 = v3(), _c1 = v3(), _c2 = v3(), _senC = v3(), _senV = v3();
// One scratch colour for every point emitted. `B.point` copies out of it
// immediately, so a fresh array per cell bought nothing and cost an allocation
// on the hottest path in the piece — see the note on `Buffers.ribbon`.
const _pcol = v3();
let _gridPos = new Float32Array(0), _gridNrm = new Float32Array(0), _gridCol = new Float32Array(0);

function triNormal(a, b, c) {
  v3sub(E1, b, a); v3sub(E2, c, a);
  v3norm(NN, v3cross(NN, E1, E2));
  return NN;
}

// Where a point of leaf TISSUE currently sits on the drawn surface.
//
// Veins and cells are both simulated in material coordinates — u along the
// blade, y in real half-widths — and both have to be mapped onto whatever the
// blade is doing right now: expanding, furled at the tip, cut to an asymmetric
// outline. Both callers need exactly the same mapping. When `blade()` owned a
// private copy of it, anything else drawing on the lamina had to reimplement
// it, and any drift shows up as cells floating off their own leaf.
function bladeMap(leaf, len, dev) {
  const o = leaf.o;
  // A leaf does not scale up. It expands from the base outward as a wave of
  // maturation runs to the tip, and the tissue ahead of that wave is still
  // rolled up in the bud. That is why an unfurling frond looks the way it does.
  const TAIL = 0.46;
  const matAt = (u) => clamp((dev - u) / TAIL + 1, 0, 1);
  // asymmetric: the two sides of a grown leaf are not the same, because the
  // two halves of the margin patterned independently
  const wAt = (u, t) => leaf.wSide(clamp(u, 0, 1), t < 0 ? -1 : 1) * (0.10 + 0.90 * matAt(u));
  const wMat = (u, t) => leaf.wSide(clamp(u, 0, 1), t < 0 ? -1 : 1);
  const furlAt = (u) => {
    const m = 1 - matAt(u);
    return -len * o.furl * m * m * (0.6 + m);
  };
  return { matAt, wAt, wMat, furlAt };
}

// ---------------------------------------------------------------------------
// THE COLOUR OF SENESCENCE, DERIVED RATHER THAN PAINTED
//
// A senescing leaf is not repainted, it is EMPTIED. The pigment-protein
// complexes are dismantled and their nitrogen withdrawn into the plant before
// the blade is let go — that recovery is the whole reason for senescing rather
// than simply dropping. What stays behind is cell wall: unpigmented, and warm,
// because that is the colour of what oxidises in it.
//
// So this is a SUBTRACTION from the blade's own colour rather than eight
// hand-picked autumn browns. Discard the pigment (collapse to luminance), keep
// the wall, tint it warm. A teal fern drains to grey-tan and a red rosette to
// dusty brown, and neither needed a palette entry — which also means adding a
// species costs nothing here.
//
// Two stages, because that is the order it happens in: the pigment goes first
// and the tissue is briefly PALER than it was alive, and only then does the
// wall dry and darken. One stage looks like a dimmer switch.
//
// Note what is and is not asserted. Colour in this piece was authored anyway
// (see the species table in 70_app.js), so a colour transform adds no new
// spatial prior. The PATTERN it drains in is not authored: that comes from the
// canalised vein network, below.
export function senesceTint(out, r, g, b, s) {
  if (s <= 0) { out[0] = r; out[1] = g; out[2] = b; return out; }
  const l = 0.30 * r + 0.59 * g + 0.11 * b;
  const k0 = clamp(s * 2, 0, 1), k1 = clamp(s * 2 - 1, 0, 1);
  // pigment gone, wall exposed          // then dried out
  const p0 = l * 1.45 + 0.020, d0 = l * 0.72 + 0.010;
  const p1 = l * 1.16 + 0.012, d1 = l * 0.48 + 0.005;
  const p2 = l * 0.44, d2 = l * 0.20;
  out[0] = lerp(lerp(r, p0, k0), d0, k1);
  out[1] = lerp(lerp(g, p1, k0), d1, k1);
  out[2] = lerp(lerp(b, p2, k0), d2, k1);
  return out;
}

// How far behind the lamina the vasculature drains. Tissue next to a vein is
// the last to be dismantled, because the vein is the route the recovered
// nitrogen leaves by and it has to stay working until the withdrawal is over —
// green islands along the veins of a yellow leaf are this, seen from a lawn.
//
// It is worth being clear about why this constant is cheap. It sets the LAG,
// one number; the SHAPE of what is spared is `leaf.vdf`, the distance-to-vein
// field of a network that canalised itself. Nothing here knows what a vein
// looks like. At 0.45 the open lamina is fully drained by sen=0.55 and the
// vein tracery holds until sen=1, which is the whole width of the shed.
const VEIN_LAG = 0.45;

// A frond: a coarse parametric surface cut to the blade outline, with the
// canalised vein network laid on top of it. The mesh is deliberately much
// coarser than the tissue that was simulated — the veins carry the detail.
// `fade` dims the blade's own surface. Under the microscope the lamina is an
// opaque sheet lit from the front and the cells sit ON it, so at full strength
// the skin simply outshines the tissue — the first close-up of a blade showed a
// bright flat slab with a row of lit cells around the margin, where the auxin
// sources are, and nothing at all in between. It was drawing correctly; you
// could not see it. Turning the surface down is what lets the cells through.
// `sen` (0..1) is the organ's senescence. It is deliberately NOT stored on the
// leaf: blades come from a shared library, so several organs draw the same
// `leaf` object and one of them dying must not drain the others.
// `opts` is how a VIEW asks for part of a blade rather than all of it, and it
// exists because the two halves of this function are drawn in different passes
// with different rules. The lamina is opaque triangles that write depth; the
// vasculature is additive ribbons that do not. So a view that wants to see
// through the organism cannot get there by fading the surface to black —
// black tissue still occludes, which is the whole reason the occlusion cull in
// `buildScene` had to be a skip rather than a fade. It has to not be drawn.
//
//   surface  draw the lamina at all
//   veinMul  scale on the vasculature's emission
//
// Absent, both are on and this is exactly the function that shipped.
export function blade(B, leaf, frame, len, wid, pal, curl, ripple, glow, MU, MV, dev, fade, sen, opts) {
  const o = leaf.o;
  const wantSurface = !opts || opts.surface !== false;
  const veinMul = opts && opts.veinMul !== undefined ? opts.veinMul : 1;
  if (veinMul <= 0 && !wantSurface) return;
  // Hoisted from below the quad loop, where it used to sit. Nothing about a
  // blade can be drawn before its outline closes, and the grid was being built
  // and thrown away in that window.
  if (!leaf.margin || !leaf.margin.mature) return;
  MU = MU || 22; MV = MV || 10;
  dev = dev === undefined ? 1 : dev;
  fade = fade === undefined ? 1 : fade;
  sen = sen || 0;

  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const vdf = leaf.vdf, res = leaf.vdfRes || 0;
  const nearVein = (u, v) => {
    if (!vdf) return 9;
    const a = clamp(Math.round(u * (res - 1)), 0, res - 1);
    const b = clamp(Math.round((v / o.aspect * 0.5 + 0.5) * (res - 1)), 0, res - 1);
    return vdf[a * res + b];
  };

  // The vasculature does not need the grid, so a view that has asked for veins
  // alone skips the whole build. That is most of the blade's cost: 22x10 quads
  // of finite-differenced normals and per-vertex senescence.
  if (!wantSurface) { bladeVeins(); return; }

  // Build the surface once as a grid, with normals from finite differences of
  // the parametrisation. Smooth normals rather than per-facet ones: a frond is
  // a curved sheet, and faceting reads as cheap.
  const NU = MU + 1, NV = MV + 1;
  const pos = _gridPos.length >= NU * NV * 3 ? _gridPos : (_gridPos = new Float32Array(NU * NV * 3));
  const nrm = _gridNrm.length >= NU * NV * 3 ? _gridNrm : (_gridNrm = new Float32Array(NU * NV * 3));
  const col = _gridCol.length >= NU * NV * 4 ? _gridCol : (_gridCol = new Float32Array(NU * NV * 4));
  const h = 0.004;
  const P = _pa, Pu = _pb, Pv = _pc;
  const at = (u, t) => t * wAt(u, t);                    // where the tissue is now
  const matAtUV = (u, t) => t * wMat(u, t);              // where it came from
  for (let i = 0; i < NU; i++) {
    const u = i / MU;
    for (let j = 0; j < NV; j++) {
      const t = (j / MV) * 2 - 1;
      const k3 = (i * NV + j) * 3, k4 = (i * NV + j) * 4;
      bladePoint(P, frame, u, at(u, t), len, wid, curl, ripple, furlAt(u));
      bladePoint(Pu, frame, u + h, at(u + h, t), len, wid, curl, ripple, furlAt(u + h));
      bladePoint(Pv, frame, u, at(u, t + h), len, wid, curl, ripple, furlAt(u));
      v3sub(_e1, Pu, P); v3sub(_e2, Pv, P);
      v3norm(_nn, v3cross(_nn, _e1, _e2));
      pos[k3] = P[0]; pos[k3 + 1] = P[1]; pos[k3 + 2] = P[2];
      nrm[k3] = _nn[0]; nrm[k3 + 1] = _nn[1]; nrm[k3 + 2] = _nn[2];
      const vv = matAtUV(u, t);
      const dd = vdf ? clamp(1 - nearVein(u, vv) * 11, 0, 1) : 0;
      const tt = clamp(u * 0.9 + 0.1, 0, 1);
      const r = lerp(pal.blade0[0], pal.blade1[0], tt) + dd * pal.veinTint[0];
      const g = lerp(pal.blade0[1], pal.blade1[1], tt) + dd * pal.veinTint[1];
      const b = lerp(pal.blade0[2], pal.blade1[2], tt) + dd * pal.veinTint[2];
      // This vertex's own senescence: the open lamina goes first and the tissue
      // held against a vein goes last, so the blade empties into its own
      // vasculature rather than dimming as one flat card.
      //
      // `hold` is squared, and that matters more than it looks. `dd` reads
      // better than half the lamina as "near a vein" — the network is dense and
      // the field is a linear ramp — so used raw it spares most of the blade and
      // the drain comes out as blotches. Green islands are TIGHT to the vein.
      // Squaring narrows what is held without touching `dd` itself, which
      // fenestration and the vein tint are both calibrated against.
      const hold = dd * dd;
      const sl = sen > 0 ? clamp((sen - hold * VEIN_LAG) / (1 - VEIN_LAG), 0, 1) : 0;
      senesceTint(_senC, r, g, b, sl);
      col[k4] = _senC[0] * fade;
      col[k4 + 1] = _senC[1] * fade;
      col[k4 + 2] = _senC[2] * fade;
      // dead tissue does not glow. It is the first thing to go and it is what
      // makes the drain read at a distance, where the hue shift alone does not.
      col[k4 + 3] = dd * glow * 0.24 * fade * (1 - sl);
    }
  }
  const gp = (i, j, out) => { const k = (i * NV + j) * 3; out[0] = pos[k]; out[1] = pos[k + 1]; out[2] = pos[k + 2]; return out; };
  const gn = (i, j, out) => { const k = (i * NV + j) * 3; out[0] = nrm[k]; out[1] = nrm[k + 1]; out[2] = nrm[k + 2]; return out; };
  const gcC = (i, j) => { const k = (i * NV + j) * 4; _cc[0] = col[k]; _cc[1] = col[k + 1]; _cc[2] = col[k + 2]; return _cc; };
  const gcE = (i, j) => col[(i * NV + j) * 4 + 3];

  for (let i = 0; i < MU; i++) {
    const u0 = i / MU, u1 = (i + 1) / MU;
    for (let j = 0; j < MV; j++) {
      // Fenestration is cut against the distance-to-vein field, which only
      // exists once the leaf has baked. Without that guard `nearVein` returns
      // its "nothing anywhere near" sentinel for every quad, every quad clears
      // the threshold, and a still-canalising monstera is drawn as a hole with
      // a rim. Only ever visible on a leaf being watched while it canalises.
      if (o.fenestrate > 0 && vdf) {
        const mu = (u0 + u1) * 0.5;
        const mt = ((j + 0.5) / MV) * 2 - 1;
        if (nearVein(mu, matAtUV(mu, mt)) > o.fenestrate && mu > 0.16 && mu < 0.93) continue;
      }
      gp(i, j, _q0); gp(i, j + 1, _q1); gp(i + 1, j + 1, _q2); gp(i + 1, j, _q3);
      B.vert(_q0, gn(i, j, _n0), gcC(i, j), gcE(i, j));
      B.vert(_q1, gn(i, j + 1, _n1), gcC(i, j + 1), gcE(i, j + 1));
      B.vert(_q2, gn(i + 1, j + 1, _n2), gcC(i + 1, j + 1), gcE(i + 1, j + 1));
      B.vert(_q0, gn(i, j, _n0), gcC(i, j), gcE(i, j));
      B.vert(_q2, gn(i + 1, j + 1, _n2), gcC(i + 1, j + 1), gcE(i + 1, j + 1));
      B.vert(_q3, gn(i + 1, j, _n3), gcC(i + 1, j), gcE(i + 1, j));
    }
  }

  if (veinMul > 0) bladeVeins();

  // --- the vasculature, as ribbons whose width is the vein's order ----------
  //
  // A function declaration so it can be reached from above as well, without
  // moving a hundred lines of reasoning around. It closes over everything the
  // grid build already computed and computes none of it itself.
  function bladeVeins() {
  const lift = len * 0.010 + 0.005;
  const segs = leaf.veins;
  if (segs) {
    const base = len * 0.0034;
    // The vasculature is at dd=1 by definition, so it drains on the far end of
    // the lag and is still lit when the lamina around it has gone: a shed blade
    // leaves as a skeleton. This is the one place the hierarchy earns its keep
    // visually — the midrib is the last lit thing on the plant.
    const sv = sen > 0 ? clamp((sen - VEIN_LAG) / (1 - VEIN_LAG), 0, 1) : 0;
    senesceTint(_senV, pal.vein[0], pal.vein[1], pal.vein[2], sv);
    const vglow = glow * (1 - sv * 0.92);

    // LEVEL OF DETAIL, AND WHY IT IS NOT A CHEAT.
    //
    // A ribbon narrower than a pixel is not drawn thin — the `Math.max` below
    // clamps it UP to the minimum width. So every sub-pixel vein comes out the
    // same width as every other one, and the hierarchy the leaf spent its
    // canalisation finding is destroyed on the way to the screen: what is left
    // is a smear at uniform width that costs exactly as much to draw as the
    // real thing. Twenty-six thousand ribbons per specimen, every frame,
    // however far away it is, and that — not the triangles — is what capped
    // the scene at one plant.
    //
    // The statement here is about SAMPLING, not about the plant: draw the veins
    // this blade can resolve, and fold the light of the rest into them so the
    // blade does not simply dim as it recedes. Nothing is invented and nothing
    // is hidden — at the focal distance `wpp` IS `MINW`, `wMin` lands near 0.02
    // and no vein is dropped, which is why one specimen looks exactly as it did.
    // THE CULL LAW: constant vein density per screen pixel.
    //
    // The tempting law is "drop anything narrower than a pixel", and it is
    // wrong here for a reason worth writing down: measured against the app's own
    // camera, about NINETY PERCENT of the veins on the hero specimen are already
    // sub-pixel and are already being clamped up to the width floor. So that
    // rule is not a statement about distant plants at all — it would redraw the
    // subject of the piece. The hierarchy below roughly `w = 0.3` never reaches
    // the screen as hierarchy today; it reaches it as a uniform smear.
    //
    // What IS new when a second plant appears is that a blade can be further off
    // than the distance the width floor was calibrated at. So anchor to the
    // hero: a blade at the focal distance keeps everything, exactly as it does
    // now, and a blade with a quarter of the screen area keeps a quarter of the
    // ribbons. `veins` is sorted by traffic, so what it keeps is the top of the
    // hierarchy — which is precisely what survives being looked at from further
    // away. Nothing here is a taste constant: the exponent is the inverse square
    // of distance because that is how screen area works.
    const dEye = PXR > 0
      ? Math.hypot(frame.o[0] - VIEW[0], frame.o[1] - VIEW[1], frame.o[2] - VIEW[2])
      : 0;
    const wFloor = PXR > 0 ? 1.5 * PXR * dEye : MINW;
    // the distance the scene-wide floor was measured at — the hero's distance
    const dRef = PXR > 0 ? MINW / (1.5 * PXR) : 0;
    const shrink = (PXR > 0 && dEye > dRef) ? (dRef / dEye) * (dRef / dEye) : 1;
    // invert `base * (0.25 + w*1.35) >= width` for the order at the clamp
    const oClamp = base > 1e-9 ? (wFloor / base - 0.25) / 1.35 : 0;
    const N = segs.length;
    // ONLY CULL A BLADE WHOSE NETWORK IS ALL THERE. The light tables are baked
    // over every vein, but the loop below skips any vein ahead of the
    // development wave, so on a half-grown blade the tables describe a network
    // larger than the one being drawn and the relight over-brightens it — by 69%
    // across a growing canopy, which is how this was found. A blade still
    // canalising is small, short-lived and near the camera, so the honest fix is
    // to leave it alone rather than to bake a second table per stage of growth.
    // If a garden of SIMULTANEOUSLY germinating plants ever needs this, the
    // cheap version is a five-flop pass over the dropped tail respecting `dev`.
    const grown = dev >= 1;
    // `veins` is sorted by traffic, so the kept set is a prefix — a count, not a
    // search. `nClamp` is where the width floor takes over from natural width,
    // and it is needed whether or not anything is culled.
    let nClamp = N;
    while (nClamp > 0 && segs[nClamp - 1].w < oClamp) nClamp--;
    // A blade is never less than its midrib, however far off it is
    let nDraw = grown ? Math.max(1, Math.round(N * shrink)) : N;
    if (nDraw > N) nDraw = N;
    if (nClamp > nDraw) nClamp = nDraw;

    // CONSERVE SURFACE BRIGHTNESS, which is the invariant a receding object has
    // to obey: an emissive surface looks equally bright per pixel however far
    // off it is, so its total light falls as the inverse square exactly as its
    // area does — and in world units that means the emitted total must not move
    // with distance at all.
    //
    // Two things here push it around and both have to be undone. The cull
    // removes ribbons. And the width floor is per-blade now, so a distant
    // ribbon is held at 1.5 screen pixels and is therefore much WIDER in world
    // units than it used to be — which is right, because the alternative is
    // veins thinning away to nothing, but it inflates the light badly: left
    // uncorrected a specimen at sixteen focal lengths came out fifteen times too
    // bright, and it was the width floor doing most of that, not the cull.
    //
    // So the target is what the old renderer emitted with the scene-wide floor,
    // which is constant with distance and is therefore the correct answer as
    // well as the compatible one. Each vein is accounted at the width it would
    // actually have been drawn at, which is why there are two tables; `base` and
    // `vglow` cancel in the ratio.
    const LN = leaf.veinLiteNat, LC = leaf.veinLiteClamp;
    let relight = 1;
    if (LN && LC && PXR > 0) {
      const nRef = (() => {
        const o0 = base > 1e-9 ? (MINW / base - 0.25) / 1.35 : 0;
        let n = N;
        while (n > 0 && segs[n - 1].w < o0) n--;
        return n;
      })();
      const target = base * LN[nRef] + MINW * (LC[N] - LC[nRef]);
      const drawn = base * LN[nClamp] + wFloor * (LC[nDraw] - LC[nClamp]);
      if (drawn > 1e-12 && target > 1e-12) relight = target / drawn;
    }

    for (let k = 0; k < nDraw; k++) {
      const s = segs[k];
      // veins mature basipetally too — none exist ahead of the wave
      if (s.x0 > dev + 0.04 || s.x1 > dev + 0.04) continue;
      // a vein whose material half-width has collapsed cannot be mapped onto
      // the current outline — skip it rather than divide by nothing and fling
      // a quad to infinity
      const w0 = wMat(s.x0, s.y0), w1 = wMat(s.x1, s.y1);
      if (w0 < 1e-3 || w1 < 1e-3) continue;
      // and never let a remapped vein leave the blade, whatever the outline did
      const t0 = clamp(s.y0 / w0, -1, 1), t1 = clamp(s.y1 / w1, -1, 1);
      bladePoint(_q0, frame, s.x0, t0 * wAt(s.x0, s.y0), len, wid, curl, ripple, lift + furlAt(s.x0));
      bladePoint(_q1, frame, s.x1, t1 * wAt(s.x1, s.y1), len, wid, curl, ripple, lift + furlAt(s.x1));
      v3sub(_e1, _q1, _q0);
      v3sub(_e2, VIEW, _q0);
      v3norm(_side, v3cross(_side, _e1, _e2));
      if (!isFinite(_side[0])) continue;
      const w = Math.max(wFloor, base * (0.25 + s.w * 1.35));
      B.ribbon(_q0, _q1, _side, w, w, _senV, vglow * (0.06 + s.w * 0.52) * relight * veinMul);
    }
  }
  }
}

// ---------------------------------------------------------------------------
// THE BLADE, AT CELL RESOLUTION
//
// The other half of the claim. On the meristem the needles CONVERGE, and that
// convergence is a leaf. Here they fall into LINE, and that line is a vein.
// Same field, same solver, same drawing language — only the boundary
// conditions differ.
//
// One thing does NOT carry over, and it is worth knowing before touching the
// constants. On the meristem, needle length is |polarity|: competence keeps the
// central zone blurred, so an uncommitted cell genuinely has a short needle.
// The blade runs in flux mode with no such gate, and measured across three
// seeds EVERY cell ends up essentially fully polarised — mean |polarity| 0.96
// on a vein and 0.96 between veins, a ratio of 1.01x. Drawing length from
// polarity here renders the lamina as one uniform lamp with no veins in it.
//
// What separates a vein from an areole is TRAFFIC: mean flux 11-25 on a vein
// against 4-6 between them, 2.9-5.0x, same three seeds. So direction comes from
// the PIN allocation, exactly as on the meristem, and length and brightness
// come from flux. That is not a display trick — traffic is what canalisation
// selects for, and it is the same quantity `bake()` keeps a vein by.
// `test/lamina.mjs` prints all of these; rerun it before retuning anything here.
// ---------------------------------------------------------------------------
// WHAT A FROZEN LEAF'S TISSUE IS DOING, WORKED OUT ONCE.
//
// `Leaf.step()` returns on its first line once `mature` is set, so `F.a`, `F.P`
// and `F.J` never move again. And a specimen wears a LIBRARY of leaves — five
// by default — across a hundred-odd organs. So the per-cell neighbour loop
// below was solving the same problem a hundred times over for five distinct
// inputs, every frame: six hypots, a division and a normalisation per cell per
// organ, for an answer that had been fixed since the blade baked.
//
// Measured over a Cathedral Fern's 118 organs, drawing every one of them:
//
//   cells only        3.70 ms live      0.42 ms baked     8.8x
//   cells + needles  19.99 ms live      3.86 ms baked     5.2x
//
// which is the difference between a whole plant at cell resolution being
// impossible and it being CHEAPER than the lamina-and-veins view it replaces
// (11.59 ms over the same organs). The bake itself is 1.66 ms, once.
//
// Two things are baked beyond the mechanism, and they are what removes the last
// per-cell work. `w` is the blade's material half-width at this cell, and `ew`
// the same at the far end of its needle — both frozen with the margin — so a
// GROWN organ places a cell with no outline lookup at all. That is exact rather
// than approximate: `matAt` clamps to 1 everywhere once `dev` reaches 1, which
// makes `wAt` and `wMat` the same function, cancels the ratio in `toSurface`,
// and sends `furlAt` to zero. A mature cell's material coordinate IS its
// surface coordinate. A blade still unfurling has none of that and takes the
// live path, which is also what the close-up's replay is.
//
// Cached on the leaf exactly like `_maxJ` was, and for the same reason. Nothing
// here is a new spatial prior: every number in the table is read off tissue the
// solver settled, and `test/views.mjs` asserts the table reproduces the live
// path cell for cell.
function cellTable(leaf) {
  const F = leaf.F, n = F.n;
  // Normalise traffic against this leaf's own busiest wall — the midrib at the
  // petiole, where everything funnels. Linear, not log: the hierarchy spans
  // three orders of magnitude and log-compressing it puts the median at 0.43
  // of full brightness, which is the whole point of the picture washed out.
  let maxJ = 1e-6;
  for (let i = 0; i < n; i++) {
    const d = F.deg[i], off = i * MAXNB;
    for (let k = 0; k < d; k++) if (F.J[off + k] > maxJ) maxJ = F.J[off + k];
  }
  const T = {
    n, maxJ,
    x: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n),
    g: new Float32Array(n), h: new Float32Array(n),
    ux: new Float32Array(n), uy: new Float32Array(n),
    ex: new Float32Array(n), ey: new Float32Array(n), ew: new Float32Array(n),
    fn: new Float32Array(n), flux: new Float32Array(n),
  };
  // THE ORDER THE TABLE IS STORED IN IS THE LEVEL OF DETAIL.
  //
  // `veins` is sorted by traffic so a distant blade keeps a PREFIX and the cull
  // is a count rather than a search. Cells want the same trick and a different
  // key: there is no hierarchy among cells to keep the top of, and taking the
  // busiest ones would degrade a receding blade into its own vasculature, which
  // is a picture of something else. What a distant blade should lose is
  // RESOLUTION, evenly.
  //
  // So the table is stored in a stable hashed order, which makes any prefix a
  // spatially uniform sample of the lattice. Striding the lattice directly is
  // the obvious alternative and it aliases badly — the field is stored row
  // major, so a stride near `nv` samples a single column and the blade comes
  // out as stripes. Hashing is immune to that, and being fixed at bake time it
  // keeps the SAME cells frame to frame, without which a drifting sample
  // shimmers.
  //
  // A second hash, deliberately not `h`. Sharing one would tie a cell's spark
  // phase to its cull rank, and every cell a distant blade kept would then be
  // sparking in unison.
  const order = new Int32Array(n);
  const rank = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    order[i] = i;
    rank[i] = (Math.imul(F.id[i] ^ 0x7f4a7c15, 0x85ebca6b) >>> 8) / 16777216;
  }
  // Float64Array has no comparator sort, and this runs once per library leaf
  const idx = Array.from(order).sort((a, b) => rank[a] - rank[b]);
  const ms = 1 / Math.max(4, leaf.o.nu);
  for (let s = 0; s < n; s++) {
    const i = idx[s];
    const x = F.x[i], y = F.y[i];
    T.x[s] = x; T.y[s] = y;
    T.w[s] = leaf.wSide(clamp(x, 0, 1), y < 0 ? -1 : 1);
    // Measured max ~8-10 per blade, but the median cell sits near 0.8 — the
    // sources at the teeth are an order of magnitude above the lamina. A 0.7
    // exponent leaves that median at a fifth of the range and most of the
    // sheet reads as empty space; 0.55 keeps every cell present as a cell
    // while the sources still obviously blaze.
    T.g[s] = Math.pow(clamp(F.a[i] / 8, 0, 1), 0.55);
    T.h[s] = (Math.imul(F.id[i] ^ 0x2545f491, 0x9e3779b1) >>> 8) / 16777216;
    const d = F.deg[i], off = i * MAXNB;
    let px = 0, py = 0, tot = 0, flux = 0;
    for (let k = 0; k < d; k++) {
      const e = off + k, j = F.nbr[e];
      const dx = F.x[j] - x, dy = F.y[j] - y;
      const el = Math.hypot(dx, dy) || 1;
      const w = F.P[e];
      px += w * dx / el; py += w * dy / el; tot += w;
      if (F.J[e] > flux) flux = F.J[e];
    }
    // A cell with no needle still has a point drawn for it — `ux`/`uy` of zero
    // is how the draw knows to skip only the mechanism. Dropping such cells
    // from the table instead would quietly delete tissue from the picture.
    if (tot <= 1e-6) continue;
    px /= tot; py /= tot;
    const pol = Math.hypot(px, py);
    if (pol < 0.02) continue;
    const ux = px / pol, uy = py / pol;
    const fn = clamp(flux / maxJ, 0, 1);        // traffic: the vein channel
    T.ux[s] = ux; T.uy[s] = uy; T.fn[s] = fn; T.flux[s] = flux;
    // a needle reaches at most a little under two cells, so a committed file
    // reads as a continuous line without every cell overwriting its neighbour
    const nl = ms * (0.30 + fn * 1.40);
    const ex = x + ux * nl, ey = y + uy * nl;
    T.ex[s] = ex; T.ey[s] = ey;
    T.ew[s] = leaf.wSide(clamp(ex, 0, 1), ey < 0 ? -1 : 1);
  }
  return T;
}

// `opts.cells` at 0 suppresses the discs and keeps the mechanism, which is the
// whole of the flux view: what a cell is DOING, without the cell. `detail` is
// unchanged in meaning — how much of that mechanism is showing — and a view
// simply sets a floor on it where the close-up sets it by distance.
export function laminaCells(B, leaf, frame, len, wid, pal, curl, ripple, t, detail, dev, sen, opts) {
  const F = leaf.F;
  if (!F || !F.n || !leaf.margin || !leaf.margin.mature) return;
  const wantCells = !opts || opts.cells !== 0;
  dev = dev === undefined ? 1 : dev;
  sen = sen || 0;
  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const lift = len * 0.013 + 0.006;      // clear of the blade, and of the veins
  // Size everything off the lattice the tissue was actually simulated on, not
  // off the blade. A species with a finer lattice has smaller cells and should
  // draw smaller ones; a fixed fraction of blade length merges them into a
  // sheet of touching discs on anything dense. `ms` is one cell in material
  // units (u runs 0..1 over `nu` cells), `cw` is one cell in world units.
  const ms = 1 / Math.max(4, leaf.o.nu);
  const cw = len * ms;

  // The table is only correct for tissue that has stopped moving AND for an
  // organ whose outline is fully open — see `cellTable`. Everything else falls
  // through to the live path, unchanged.
  const T = (leaf.mature && dev >= 1)
    ? (leaf._cells || (leaf._cells = cellTable(leaf)))
    : null;
  let maxJ = leaf._maxJ || 0;
  if (!T && (!maxJ || !leaf.mature)) {
    maxJ = 1e-6;
    for (let i = 0; i < F.n; i++) {
      const d = F.deg[i], off = i * MAXNB;
      for (let k = 0; k < d; k++) if (F.J[off + k] > maxJ) maxJ = F.J[off + k];
    }
    if (leaf.mature) leaf._maxJ = maxJ;   // frozen tissue, so measure it once
  }

  const toSurface = (u, y, out) => {
    const w0 = wMat(u, y);
    if (w0 < 1e-3) return null;
    const tt = clamp(y / w0, -1, 1);
    return bladePoint(out, frame, u, tt * wAt(u, y), len, wid, curl, ripple,
      lift + furlAt(u));
  };
  // the same map, with the half-width already known — see `cellTable`
  const atW = (u, y, w0, out) => {
    if (w0 < 1e-3) return null;
    const tt = clamp(y / w0, -1, 1);
    return bladePoint(out, frame, u, tt * w0, len, wid, curl, ripple, lift);
  };

  // HOW MANY CELLS THIS BLADE CAN RESOLVE.
  //
  // The same law as the vein cull in `blade()`, stated for an area instead of a
  // length: constant cell density per screen pixel, anchored so that a blade at
  // the hero's framing distance keeps every cell it has. It is needed for the
  // same reason too — the point shader clamps `gl_PointSize` up to one pixel, so
  // a sub-pixel cell is not drawn small, it is drawn at full price at a size
  // that says nothing. Twenty thousand of those per background specimen is what
  // a whole-plant cell view would otherwise cost to draw a grey smear.
  //
  // AND THE LIGHT IS CONSERVED, which is the invariant a receding surface has to
  // obey. A kept cell stands for `1/shrink` cells, so its drawn AREA is scaled
  // by that and its radius by the square root — total emitted area, and
  // therefore surface brightness per pixel, does not move with distance. This is
  // exactly the `relight` argument in `blade()`, and it is simpler here only
  // because a point's area is one number rather than two tables.
  //
  // The prefix is uniform by construction (see `cellTable`), so no ordering
  // question arises: `nDraw` cells is a `shrink` sample of the lattice wherever
  // it is cut. A blade with no table is still unfurling, which means small,
  // short-lived and near the camera — left alone, exactly as `blade()` leaves a
  // half-grown network alone.
  let nDraw = T ? T.n : F.n, cellMul = 1, mech = 1;
  if (T && PXR > 0) {
    const dEye = Math.hypot(frame.o[0] - VIEW[0], frame.o[1] - VIEW[1], frame.o[2] - VIEW[2]);
    const dRef = MINW / (1.5 * PXR);
    if (dEye > dRef) {
      const shrink = (dRef / dEye) * (dRef / dEye);
      nDraw = Math.max(1, Math.round(T.n * shrink));
      cellMul = Math.sqrt(T.n / nDraw);
    }
    // AND THE MECHANISM FADES WITH WHETHER IT CAN BE RESOLVED AT ALL.
    //
    // A needle is a line whose whole content is its DIRECTION. Below about a
    // pixel long it has none — it is a dot that costs 42 floats, and a whole
    // background specimen's worth of them is what pins the line buffer when a
    // garden is drawn in the cell view. So it fades out over the pixel or two
    // where the direction stops being legible.
    //
    // This is not a new rule, which is why it is allowed to be a fade where the
    // vein cull had to conserve light. The close-up has ALWAYS faded the
    // mechanism up with proximity — `detail` is that ramp — on the argument
    // that you cannot see a cell's pumps from across the room. A view sets a
    // floor on `detail`; this is the same ramp continuing to apply underneath
    // the floor, per blade, which is the only place it can be evaluated. And
    // unlike a vein, a needle is not surface: nothing integrates it at
    // distance, so there is no light to fold anywhere.
    const nlPx = ms * (0.30 + 1.40) * len / (PXR * dEye);
    mech = clamp((nlPx - 0.8) / 1.6, 0, 1);
  }
  const dim = 1 - detail * 0.42;
  for (let i = 0; i < nDraw; i++) {
    const x = T ? T.x[i] : F.x[i], y = T ? T.y[i] : F.y[i];
    // no tissue exists ahead of the wave of maturation, so no cells either
    if (x > dev + 0.04) continue;
    if (!(T ? atW(x, y, T.w[i], _c0) : toSurface(x, y, _c0))) continue;

    let g, ux, uy, fn, flux, hash;
    if (T) {
      g = T.g[i]; ux = T.ux[i]; uy = T.uy[i];
      fn = T.fn[i]; flux = T.flux[i]; hash = T.h[i];
    } else {
      g = Math.pow(clamp(F.a[i] / 8, 0, 1), 0.55);
      hash = (Math.imul(F.id[i] ^ 0x2545f491, 0x9e3779b1) >>> 8) / 16777216;
      // --- which way this cell has aimed its pumps --------------------------
      const d = F.deg[i], off = i * MAXNB;
      let px = 0, py = 0, tot = 0;
      flux = 0;
      for (let k = 0; k < d; k++) {
        const e = off + k, j = F.nbr[e];
        const dx = F.x[j] - x, dy = F.y[j] - y;
        const el = Math.hypot(dx, dy) || 1;
        const w = F.P[e];
        px += w * dx / el; py += w * dy / el; tot += w;
        if (F.J[e] > flux) flux = F.J[e];
      }
      ux = 0; uy = 0; fn = 0;
      if (tot > 1e-6) {
        px /= tot; py /= tot;
        const pol = Math.hypot(px, py);
        if (pol >= 0.02) { ux = px / pol; uy = py / pol; fn = clamp(flux / maxJ, 0, 1); }
      }
    }

    // A CELL DRAINS ON ITS OWN TRAFFIC. `blade()` spares the tissue against a
    // vein using `vdf`, the distance field of the baked network; a cell has the
    // quantity that field was derived from, so it uses that directly. Same
    // physical statement — the vein is the route the nitrogen leaves by, so it
    // and the tissue on it work until the withdrawal is over — off a better
    // measurement. Squared for the same reason `blade()` squares `dd`: green
    // islands are tight to the vein, and the raw channel spares half the blade.
    const sl = sen > 0 ? clamp((sen - fn * fn * VEIN_LAG) / (1 - VEIN_LAG), 0, 1) : 0;
    const cr = lerp(pal.cell0[0], pal.cell1[0], g);
    const cg = lerp(pal.cell0[1], pal.cell1[1], g);
    const cb = lerp(pal.cell0[2], pal.cell1[2], g);
    if (wantCells) {
      if (sl > 0) senesceTint(_senC, cr, cg, cb, sl); else v3set(_senC, cr, cg, cb);
      v3set(_pcol, _senC[0] * dim, _senC[1] * dim, _senC[2] * dim);
      B.point(_c0, _pcol, cw * 0.62 * (1 + g * 0.5) * cellMul);
    }

    if (detail * mech < 0.02 || (ux === 0 && uy === 0)) continue;
    // dead tissue has stopped pumping, so the mechanism goes out with it
    const live = 1 - sl;
    if (live < 0.02) continue;

    const nl = ms * (0.30 + fn * 1.40);
    const ex = T ? T.ex[i] : x + ux * nl, ey = T ? T.ey[i] : y + uy * nl;
    if (!(T ? atW(ex, ey, T.ew[i], _c1) : toSurface(ex, ey, _c1))) continue;
    B.seg2(_c0, _c1, pal.pin, detail * mech * (0.10 + fn * 2.1) * live);

    // --- auxin actually on the move ----------------------------------------
    //
    // The spark rides the DRAWN needle rather than the curved surface under it.
    // It used to be mapped through `toSurface` at an intermediate material
    // point, which put it on the lamina while the needle it is travelling along
    // is a straight world-space segment — so on a curled blade the spark drifted
    // off its own needle. Interpolating the two endpoints is both cheaper and
    // the more consistent picture.
    if (fn > 0.02) {
      const ph = (t * 0.00055 * (0.5 + Math.min(2.5, flux * 0.08)) + hash) % 1;
      const s = 0.15 + ph * 1.25;
      _c2[0] = _c0[0] + (_c1[0] - _c0[0]) * s;
      _c2[1] = _c0[1] + (_c1[1] - _c0[1]) * s;
      _c2[2] = _c0[2] + (_c1[2] - _c0[2]) * s;
      const fade = Math.sin(ph * Math.PI);
      const b2 = detail * mech * fade * clamp(fn * 2.4, 0, 1.6) * live;
      v3set(_pcol, pal.spark[0] * b2, pal.spark[1] * b2, pal.spark[2] * b2);
      B.point(_c2, _pcol, cw * 0.30 * (0.6 + fade));
    }
  }
}

// ---------------------------------------------------------------------------
// THE GROWING TIP, AT CELL RESOLUTION
//
// Each cell is drawn as a disc coloured by how much auxin it holds. Then, as
// the camera comes in, the mechanism fades up on top of it:
//
//   needle  — the direction that cell has loaded its PIN pumps. This is the
//             decision the whole model turns on. Length and brightness are how
//             committed the cell is; an unpolarised cell has almost none.
//   spark   — auxin actually being moved, travelling along that needle at a
//             rate set by the real flux through that wall.
//
// Watch the needles around a forming organ: they all swing to point at it. That
// convergence IS the primordium. Nothing else is happening.
// ---------------------------------------------------------------------------
export function meristemDome(B, m, frame, scale, pal, t, detail) {
  const F = m.F, o = m.o;
  const R = o.R;
  const p = v3(), q = v3();
  const dt = detail || 0;
  const toWorld = (sx, sy, sz, out) => {
    out[0] = frame.o[0] + frame.z[0] * sx + frame.y[0] * sy + frame.x[0] * sz;
    out[1] = frame.o[1] + frame.z[1] * sx + frame.y[1] * sy + frame.x[1] * sz;
    out[2] = frame.o[2] + frame.z[2] * sx + frame.y[2] * sy + frame.x[2] * sz;
    return out;
  };
  const domeH = (r) => Math.sqrt(Math.max(0, 1 - r * r)) * 0.55;

  for (let i = 0; i < F.n; i++) {
    const x = F.x[i], y = F.y[i];
    const r = Math.hypot(x, y) / R;
    const sx = x / R * scale, sy = y / R * scale, sz = domeH(r) * scale;
    toWorld(sx, sy, sz, p);
    const a = clamp(F.a[i] / 6, 0, 1);
    const g = Math.pow(a, 0.7);
    // at close range the cells must read as separate cells, not as one lamp
    const shrink = 1 - dt * 0.42;
    const dim = 1 - dt * 0.45;
    v3set(_pcol, lerp(pal.cell0[0], pal.cell1[0], g) * dim,
      lerp(pal.cell0[1], pal.cell1[1], g) * dim,
      lerp(pal.cell0[2], pal.cell1[2], g) * dim);
    B.point(p, _pcol,
      scale * (0.052 + 0.018 * F.sz[i]) * (1 + g * 0.55) * shrink);

    if (dt < 0.02) continue;

    // --- the cell's PIN polarity ------------------------------------------
    const d = F.deg[i], off = i * MAXNB;
    let px = 0, py = 0, tot = 0, flux = 0;
    for (let k = 0; k < d; k++) {
      const e = off + k, j = F.nbr[e];
      const ex = F.x[j] - x, ey = F.y[j] - y;
      const el = Math.hypot(ex, ey) || 1;
      const w = F.P[e];
      px += w * ex / el; py += w * ey / el; tot += w;
      if (F.J[e] > flux) flux = F.J[e];
    }
    if (tot <= 1e-6) continue;
    px /= tot; py /= tot;
    const pol = Math.hypot(px, py);          // 0 apolar, 1 all on one wall
    if (pol < 0.02) continue;
    const ux = px / pol, uy = py / pol;

    const nl = scale * 0.070 * (0.35 + pol * 1.45);
    const bx = sx + ux * nl, by = sy + uy * nl;
    const r2 = Math.hypot(bx, by) / scale;
    toWorld(bx, by, domeH(Math.min(1, r2)) * scale, q);
    const nb = dt * (0.10 + pol * 1.5) * (0.4 + clamp(F.a[i] / 4, 0, 1));
    B.seg2(p, q, pal.pin, nb);

    // --- auxin on the move --------------------------------------------------
    if (flux > 0.02) {
      const h = (Math.imul(F.id[i] ^ 0x2545f491, 0x9e3779b1) >>> 8) / 16777216;
      const ph = (t * 0.00055 * (0.5 + Math.min(2.5, flux * 0.35)) + h) % 1;
      const fx = sx + ux * nl * (0.15 + ph * 1.25);
      const fy = sy + uy * nl * (0.15 + ph * 1.25);
      const rr = Math.hypot(fx, fy) / scale;
      toWorld(fx, fy, domeH(Math.min(1, rr)) * scale, q);
      const fade = Math.sin(ph * Math.PI);
      const b2 = dt * fade * clamp(flux * 0.5, 0, 1.6);
      v3set(_pcol, pal.spark[0] * b2, pal.spark[1] * b2, pal.spark[2] * b2);
      B.point(q, _pcol, scale * 0.035 * (0.6 + fade));
    }
  }
}


// ---------------------------------------------------------------------------
// A fruit: the ovary wall as a closed shell, coloured by how far the ripening
// wave has crossed it, with the seeds glowing faintly through the flesh.
// ---------------------------------------------------------------------------
export function fruitShell(B, fr, origin, scale, pal) {
  const P = fr.pos, N = fr.nrm, R = fr.ripe;
  const a = v3(), b = v3(), c = v3(), na = v3(), nb = v3(), nc = v3();
  const cc = v3();
  const col = (i) => {
    const t = clamp(R[i], 0, 1);
    cc[0] = lerp(pal.fruit0[0], pal.fruit1[0], t);
    cc[1] = lerp(pal.fruit0[1], pal.fruit1[1], t);
    cc[2] = lerp(pal.fruit0[2], pal.fruit1[2], t);
    return cc;
  };
  if (!fr._glow || fr._glow.length !== fr.n) {
    fr._glow = new Float32Array(fr.n);
    for (const sd of fr.seeds) fr._glow[sd] = 1;
  }
  const G = fr._glow;
  const put = (i, p, n) => {
    p[0] = origin[0] + P[i * 3] * scale;
    p[1] = origin[1] + P[i * 3 + 1] * scale;
    p[2] = origin[2] + P[i * 3 + 2] * scale;
    n[0] = N[i * 3]; n[1] = N[i * 3 + 1]; n[2] = N[i * 3 + 2];
  };
  const em = (i) => pal.glow * (0.04 + 0.26 * G[i] + 0.18 * R[i]);
  for (const f of fr.faces) {
    put(f[0], a, na); put(f[1], b, nb); put(f[2], c, nc);
    B.vert(a, na, col(f[0]), em(f[0]));
    B.vert(b, nb, col(f[1]), em(f[1]));
    B.vert(c, nc, col(f[2]), em(f[2]));
  }
}

// ---------------------------------------------------------------------------
// THE FRUIT, AT CELL RESOLUTION
//
// The ovary wall is not a mesh that happens to have colours on it. It is a
// `CellField` on an icosphere running the same solver as the meristem and the
// blade — which is the claim `35_fruit.js` is making and which the shell,
// drawn as a closed opaque surface, hides. Every vertex of that shell is a
// cell holding auxin, and `ripe` is a wave that crossed it.
//
// So there is nothing to invent here: it is `laminaCells` on the third
// topology. Auxin is the colour, ripeness warms it, and an ovule glows through
// from inside because it is a seed and the flesh is no longer in the way.
// ---------------------------------------------------------------------------
export function fruitCells(B, fr, origin, scale, pal, detail) {
  const P = fr.pos, R = fr.ripe, F = fr.F;
  if (!P || !F) return;
  if (!fr._glow || fr._glow.length !== fr.n) {
    fr._glow = new Float32Array(fr.n);
    for (const sd of fr.seeds) fr._glow[sd] = 1;
  }
  const G = fr._glow;
  // one cell of an icosphere subdivided to `n` vertices, in world units
  const cw = scale * 2.2 / Math.sqrt(Math.max(12, fr.n));
  const dim = 1 - (detail || 0) * 0.42;
  let maxA = 1e-6;
  for (let i = 0; i < fr.n; i++) if (F.a[i] > maxA) maxA = F.a[i];
  for (let i = 0; i < fr.n; i++) {
    _c0[0] = origin[0] + P[i * 3] * scale;
    _c0[1] = origin[1] + P[i * 3 + 1] * scale;
    _c0[2] = origin[2] + P[i * 3 + 2] * scale;
    const g = Math.pow(clamp(F.a[i] / maxA, 0, 1), 0.55);
    const t = clamp(R[i], 0, 1);
    // auxin picks the cell out of the wall; ripeness carries it to the ripe
    // colour, which is the same two-ended ramp `fruitShell` reads
    const r = lerp(lerp(pal.cell0[0], pal.cell1[0], g), pal.fruit1[0], t * 0.75);
    const gg = lerp(lerp(pal.cell0[1], pal.cell1[1], g), pal.fruit1[1], t * 0.75);
    const b = lerp(lerp(pal.cell0[2], pal.cell1[2], g), pal.fruit1[2], t * 0.75);
    const sd = G[i];
    v3set(_pcol, (r + sd * 0.55) * dim, (gg + sd * 0.45) * dim, (b + sd * 0.30) * dim);
    B.point(_c0, _pcol, cw * (0.55 + g * 0.45 + sd * 0.5));
  }
}

// ---------------------------------------------------------------------------
// THE STEM, WITHOUT THE STEM IN THE WAY
//
// `tube()` is opaque geometry that writes depth, which is right for a plant
// standing in light and wrong for a view whose whole proposition is that you
// can see through the organism. The lines and points passes are additive with
// depth writes off, so an axis emitted as ribbons occludes nothing and the
// tissue behind it comes through.
//
// The radii are unchanged — they are what Murray's law grew, and they are the
// one thing about a stem this project does derive. Nothing is added: this is
// the same polyline at the same thickness, in the pass that does not hide
// things.
// ---------------------------------------------------------------------------
export function stemRibbon(B, pts, radii, col, glow) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    v3sub(_e1, b, a);
    v3sub(_e2, VIEW, a);
    v3norm(_side, v3cross(_side, _e1, _e2));
    if (!isFinite(_side[0])) continue;
    B.ribbon(a, b, _side, Math.max(MINW, radii[i - 1]), Math.max(MINW, radii[i]),
      col, glow);
  }
}
