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
    // Sized for a dense specimen with one blade refined to cell resolution.
    // These were half this and it was not obviously wrong: a full buffer drops
    // geometry silently, so the failure is a picture that is merely missing
    // things. Measured on Sun Coral, 104 organs — the plant alone reaches 86%
    // of the old triangle buffer, and going into a blade pinned both the
    // triangle and the line buffers at exactly their caps, which is where the
    // needles were being thrown away. `renderer.nTri`/`nLine` sitting on a
    // round number equal to `B.tri.length/10` or `B.line.length/7` means
    // saturated, not busy. Uploads are subarrays, so headroom costs nothing
    // per frame — only the allocation.
    this.tri = new Float32Array(1 << 21);   // pos3 nrm3 col3 emis1 = 10
    this.triN = 0;
    // Lines get the most headroom: every vein and every needle is a six-vertex
    // camera-facing ribbon, so a refined blade full of committed cells is by
    // far the heaviest thing the scene ever builds. One notch up from the
    // triangle buffer measured 98.5% full on Sun Coral, which is not headroom.
    this.line = new Float32Array(1 << 21);  // pos3 col3 emis1 = 7
    this.lineN = 0;
    this.pt = new Float32Array(1 << 19);    // pos3 col3 size1 = 7
    this.ptN = 0;
  }
  reset() { this.triN = 0; this.lineN = 0; this.ptN = 0; }
  vert(p, n, c, e) {
    if (this.triN + 10 > this.tri.length) return;
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
    if (this.lineN + 42 > this.line.length) return;
    v3sub(_sa, b, a);
    v3sub(_sb, VIEW, a);
    v3norm(_sc, v3cross(_sc, _sa, _sb));
    if (!isFinite(_sc[0])) return;
    const w = MINW * 0.85;
    this.ribbon(a, b, _sc, w, w * 0.35, c, e);
  }

  // A vein drawn as a camera-facing ribbon rather than a hairline, so its
  // order — how much traffic it carries — is legible as thickness.
  ribbon(a, b, side, w0, w1, c, e) {
    if (this.lineN + 42 > this.line.length) return;
    const a0 = [a[0] - side[0] * w0, a[1] - side[1] * w0, a[2] - side[2] * w0];
    const a1 = [a[0] + side[0] * w0, a[1] + side[1] * w0, a[2] + side[2] * w0];
    const b0 = [b[0] - side[0] * w1, b[1] - side[1] * w1, b[2] - side[2] * w1];
    const b1 = [b[0] + side[0] * w1, b[1] + side[1] * w1, b[2] + side[2] * w1];
    this.gv(a0, c, e); this.gv(a1, c, e); this.gv(b1, c, e);
    this.gv(a0, c, e); this.gv(b1, c, e); this.gv(b0, c, e);
  }
  point(p, c, s) {
    if (this.ptN + 7 > this.pt.length) return;
    const t = this.pt, i = this.ptN;
    t[i] = p[0]; t[i + 1] = p[1]; t[i + 2] = p[2];
    t[i + 3] = c[0]; t[i + 4] = c[1]; t[i + 5] = c[2]; t[i + 6] = s;
    this.ptN += 7;
  }
}

const _a = v3(), _b = v3(), _c = v3(), _d = v3(), _n = v3(), _t = v3(), _u = v3();
const _sa = v3(), _sb = v3(), _sc = v3();

// where the camera is, for orienting vein ribbons
let VIEW = v3(0, 0, 1), MINW = 0.004;
export function setView(eye, minWorld) { v3copy(VIEW, eye); MINW = minWorld; }

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
const _c0 = v3(), _c1 = v3();
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

// A frond: a coarse parametric surface cut to the blade outline, with the
// canalised vein network laid on top of it. The mesh is deliberately much
// coarser than the tissue that was simulated — the veins carry the detail.
// `fade` dims the blade's own surface. Under the microscope the lamina is an
// opaque sheet lit from the front and the cells sit ON it, so at full strength
// the skin simply outshines the tissue — the first close-up of a blade showed a
// bright flat slab with a row of lit cells around the margin, where the auxin
// sources are, and nothing at all in between. It was drawing correctly; you
// could not see it. Turning the surface down is what lets the cells through.
export function blade(B, leaf, frame, len, wid, pal, curl, ripple, glow, MU, MV, dev, fade) {
  const o = leaf.o;
  MU = MU || 22; MV = MV || 10;
  dev = dev === undefined ? 1 : dev;
  fade = fade === undefined ? 1 : fade;

  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const vdf = leaf.vdf, res = leaf.vdfRes || 0;
  const nearVein = (u, v) => {
    if (!vdf) return 9;
    const a = clamp(Math.round(u * (res - 1)), 0, res - 1);
    const b = clamp(Math.round((v / o.aspect * 0.5 + 0.5) * (res - 1)), 0, res - 1);
    return vdf[a * res + b];
  };

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
      col[k4] = (lerp(pal.blade0[0], pal.blade1[0], tt) + dd * pal.veinTint[0]) * fade;
      col[k4 + 1] = (lerp(pal.blade0[1], pal.blade1[1], tt) + dd * pal.veinTint[1]) * fade;
      col[k4 + 2] = (lerp(pal.blade0[2], pal.blade1[2], tt) + dd * pal.veinTint[2]) * fade;
      col[k4 + 3] = dd * glow * 0.24 * fade;
    }
  }
  const gp = (i, j, out) => { const k = (i * NV + j) * 3; out[0] = pos[k]; out[1] = pos[k + 1]; out[2] = pos[k + 2]; return out; };
  const gn = (i, j, out) => { const k = (i * NV + j) * 3; out[0] = nrm[k]; out[1] = nrm[k + 1]; out[2] = nrm[k + 2]; return out; };
  const gcC = (i, j) => { const k = (i * NV + j) * 4; _cc[0] = col[k]; _cc[1] = col[k + 1]; _cc[2] = col[k + 2]; return _cc; };
  const gcE = (i, j) => col[(i * NV + j) * 4 + 3];

  if (!leaf.margin || !leaf.margin.mature) return;
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

  // --- the vasculature, as ribbons whose width is the vein's order ----------
  const lift = len * 0.010 + 0.005;
  const segs = leaf.veins;
  if (segs) {
    const base = len * 0.0034;
    for (const s of segs) {
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
      const w = Math.max(MINW, base * (0.25 + s.w * 1.35));
      B.ribbon(_q0, _q1, _side, w, w, pal.vein, glow * (0.06 + s.w * 0.52));
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
export function laminaCells(B, leaf, frame, len, wid, pal, curl, ripple, t, detail, dev) {
  const F = leaf.F;
  if (!F || !F.n || !leaf.margin || !leaf.margin.mature) return;
  dev = dev === undefined ? 1 : dev;
  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const lift = len * 0.013 + 0.006;      // clear of the blade, and of the veins
  // Size everything off the lattice the tissue was actually simulated on, not
  // off the blade. A species with a finer lattice has smaller cells and should
  // draw smaller ones; a fixed fraction of blade length merges them into a
  // sheet of touching discs on anything dense. `ms` is one cell in material
  // units (u runs 0..1 over `nu` cells), `cw` is one cell in world units.
  const ms = 1 / Math.max(4, leaf.o.nu);
  const cw = len * ms;

  // Normalise traffic against this leaf's own busiest wall — the midrib at the
  // petiole, where everything funnels. Linear, not log: the hierarchy spans
  // three orders of magnitude and log-compressing it puts the median at 0.43
  // of full brightness, which is the whole point of the picture washed out.
  let maxJ = leaf._maxJ || 0;
  if (!maxJ || !leaf.mature) {
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

  for (let i = 0; i < F.n; i++) {
    const x = F.x[i], y = F.y[i];
    // no tissue exists ahead of the wave of maturation, so no cells either
    if (x > dev + 0.04) continue;
    if (!toSurface(x, y, _c0)) continue;

    // Measured max ~8-10 per blade, but the median cell sits near 0.8 — the
    // sources at the teeth are an order of magnitude above the lamina. A 0.7
    // exponent leaves that median at a fifth of the range and most of the
    // sheet reads as empty space; 0.55 keeps every cell present as a cell
    // while the sources still obviously blaze.
    const a = clamp(F.a[i] / 8, 0, 1);
    const g = Math.pow(a, 0.55);
    const dim = 1 - detail * 0.42;
    B.point(_c0, [lerp(pal.cell0[0], pal.cell1[0], g) * dim,
      lerp(pal.cell0[1], pal.cell1[1], g) * dim,
      lerp(pal.cell0[2], pal.cell1[2], g) * dim],
      cw * 0.62 * (1 + g * 0.5));

    if (detail < 0.02) continue;

    // --- which way this cell has aimed its pumps ----------------------------
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
    const pol = Math.hypot(px, py);
    if (pol < 0.02) continue;
    const ux = px / pol, uy = py / pol;
    const fn = clamp(flux / maxJ, 0, 1);         // traffic: the vein channel

    // a needle reaches at most a little under two cells, so a committed file
    // reads as a continuous line without every cell overwriting its neighbour
    const nl = ms * (0.30 + fn * 1.40);
    if (!toSurface(x + ux * nl, y + uy * nl, _c1)) continue;
    B.seg2(_c0, _c1, pal.pin, detail * (0.10 + fn * 2.1));

    // --- auxin actually on the move ----------------------------------------
    if (fn > 0.02) {
      const h = (Math.imul(F.id[i] ^ 0x2545f491, 0x9e3779b1) >>> 8) / 16777216;
      const ph = (t * 0.00055 * (0.5 + Math.min(2.5, flux * 0.08)) + h) % 1;
      if (toSurface(x + ux * nl * (0.15 + ph * 1.25), y + uy * nl * (0.15 + ph * 1.25), _c1)) {
        const fade = Math.sin(ph * Math.PI);
        const b2 = detail * fade * clamp(fn * 2.4, 0, 1.6);
        B.point(_c1, [pal.spark[0] * b2, pal.spark[1] * b2, pal.spark[2] * b2],
          cw * 0.30 * (0.6 + fade));
      }
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
    const col = [
      lerp(pal.cell0[0], pal.cell1[0], g),
      lerp(pal.cell0[1], pal.cell1[1], g),
      lerp(pal.cell0[2], pal.cell1[2], g),
    ];
    // at close range the cells must read as separate cells, not as one lamp
    const shrink = 1 - dt * 0.42;
    const dim = 1 - dt * 0.45;
    B.point(p, [col[0] * dim, col[1] * dim, col[2] * dim],
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
      B.point(q, [pal.spark[0] * b2, pal.spark[1] * b2, pal.spark[2] * b2],
        scale * 0.035 * (0.6 + fade));
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
