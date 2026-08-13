// FlowerBuffers — a Buffers that keeps everything and knows which organ it is
// holding.
//
// Two departures from the shipped emitter, both with precedent:
//   - It GROWS rather than drops. A frame budget is the right constraint for a
//     rasteriser and the wrong one for a scene graph; the Blender bridge made
//     the same call and its first conifer shipped 80% short before it did.
//   - `ribbon()` records (a, b, w0, w1, colour, emis) and drops `side` — the
//     bridge's exact argument: the view-dependence was in the rasteriser, not
//     the vein. Here the camera-facing expansion happens per frame in the
//     vertex shader, so a vein is a thickness from every orbit angle.
//
// The third thing is new: `beginOrgan(meta)` / `endOrgan()` bracket the shipped
// emitters, recording [start, end) per stream per organ. The shipped buffers
// carry no organ identity at all — the Blender bridge had to cluster on vertex
// colour to tell a petal from a leaf. Since we own the draw loop, we can just
// write it down.
//
// And a fourth, which is a BUG FIX and is why AJ's "glitchy flashes on flowers"
// stopped. A blade is a quad grid over a parametrisation whose half-width
// collapses to a point at the leaf's base, so the whole first column of quads
// arrives as two coincident vertices and one distant one: a segment wearing
// three vertices, with EXACTLY zero area, up to 14 px long on screen. Measured
// on `garden=7&seed=21`: 6.7-8.5% of every frame's tri stream (1,256 of 18,628
// triangles at the low end, 4,497 of 66,674 at the high) has world-space area
// exactly 0. Every one of those is emitted by `blade()`, so leaves, sepals and
// stamens all carry them.
//
// A triangle with no area has no barycentric denominator. The rasteriser still
// lights the odd fragment on one — fixed-point snapping and the fill rules see
// to that — and its varyings come out as finite-over-nothing: measured at the
// flash, vC 7.07 where the buffer's largest colour is 1.29, vE 4.70 where the
// largest emissive is 0.83, |vN| 32.9 where every normal is unit, and the
// emissive term vC*vE*3 at 710 against a legitimate ceiling near 3. One texel
// of the HDR scene target then holds 8,863 against a frame-peak median of 2.4,
// and the half-res bloom chain spreads that impulse into its own sparse impulse
// response — three separable 5-tap blurs at radii 1, 2.6 and 4.2 give a comb of
// bars about 4 px apart over a ~64-100 px square. That square, for one frame,
// is the artefact. `tools/flowers_peak.mjs` and its four siblings are the
// chain of measurements; `tools/flowers_glitch.mjs` is the before/after.
//
// So: A TRIANGLE WITH NO AREA IS NOT DRAWN. Nothing legitimate is lost — a
// zero-area triangle cannot cover a pixel correctly, and its only contribution
// to the picture was the corrupt fragment — and the tri stream gets ~7% smaller
// for free. What is dropped is COUNTED rather than silent, for the same reason
// the shipped `Buffers` counts its own drops, and `parity.test.mjs` reconciles
// against the count rather than being loosened to accommodate it.

// Below this, a triangle's cross product is not small, it is zero: the test is
// |e1 x e2| <= FL_DEGEN * max(|e1|^2, |e2|^2), which is dimensionless and so
// says the same thing about a 40-unit frond and a 0.1-unit stamen. float32
// carries ~1e-7 relative precision, so 1e-9 is a floor at the ARITHMETIC and
// not a threshold with taste in it — everything it removes has three vertices
// that are bit-identical or collinear below what the format can represent.
const FL_DEGEN = 1e-9;
class FlowerBuffers extends Buffers {
  constructor() {
    super();
    this.seg = new Float32Array(1 << 18);   // 12 floats per vein segment
    this.segN = 0;
    this.petb = new Float32Array(1 << 18);  // 16 floats per petal vertex
    this.petbN = 0;
    this.organs = [];                        // [{ meta, tri0,tri1, seg0,seg1, pt0,pt1 }]
    this._open = null;
    this.degen = { tri: 0, pet: 0 };         // triangles with no area, dropped
  }
  reset() {
    super.reset();
    this.segN = 0;
    this.petbN = 0;
    this.organs.length = 0;
    this._open = null;
    this.degen.tri = 0; this.degen.pet = 0;
  }
  // The completed triangle ending at `n` in `arr`, stride `st` floats a vertex,
  // position first: does it enclose anything? Both streams emit independent
  // triangles three vertices at a time, so a stride-aligned test is exact.
  _noArea(arr, n, st) {
    const k = n - st * 3;
    const ax = arr[k + st] - arr[k], ay = arr[k + st + 1] - arr[k + 1], az = arr[k + st + 2] - arr[k + 2];
    const bx = arr[k + st * 2] - arr[k], by = arr[k + st * 2 + 1] - arr[k + 1], bz = arr[k + st * 2 + 2] - arr[k + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const a2 = ax * ax + ay * ay + az * az, b2 = bx * bx + by * by + bz * bz;
    const s = (a2 > b2 ? a2 : b2) * FL_DEGEN;
    return cx * cx + cy * cy + cz * cz <= s * s;
  }
  _grow(name) {
    const old = this[name];
    const next = new Float32Array(old.length * 2);
    next.set(old);
    this[name] = next;
  }
  beginOrgan(meta) {
    this._open = { meta, tri0: this.triN, seg0: this.segN, pt0: this.ptN, pet0: this.petbN };
  }
  endOrgan() {
    const o = this._open;
    if (!o) return;
    o.tri1 = this.triN; o.seg1 = this.segN; o.pt1 = this.ptN; o.pet1 = this.petbN;
    this.organs.push(o);
    this._open = null;
  }
  // The union bound of everything one axis's floral organs actually put on
  // screen — petals from the petal stream, the fruit from the tri stream.
  // This is what a flower close-up frames from: the DRAWN reach, not a guess
  // reconstructed from organ lengths (two guesses shipped screenshots taken
  // from inside the corolla before this was written).
  floralBounds(axIdx) {
    let n = 0;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const o of this.organs) {
      const m = o.meta;
      if (m.ax !== axIdx) continue;
      if (m.kind === 'petal' || m.kind === 'inner') {
        for (let k = o.pet0; k < o.pet1; k += 16) {
          const x = this.petb[k], y = this.petb[k + 1], z = this.petb[k + 2];
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (z < z0) z0 = z; if (z > z1) z1 = z;
          n++;
        }
      } else if (m.kind === 'fruit') {
        for (let k = o.tri0; k < o.tri1; k += 10) {
          const x = this.tri[k], y = this.tri[k + 1], z = this.tri[k + 2];
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (z < z0) z0 = z; if (z > z1) z1 = z;
          n++;
        }
      }
    }
    if (!n) return null;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    return { c: [cx, cy, cz], r: Math.hypot(x1 - cx, y1 - cy, z1 - cz) };
  }
  vert(p, n, c, e) {
    if (this.triN + 10 > this.tri.length) this._grow('tri');
    super.vert(p, n, c, e);
    if (this.triN % 30 === 0 && this._noArea(this.tri, this.triN, 10)) {
      this.triN -= 30; this.degen.tri++;
    }
  }
  point(p, c, s) {
    if (this.ptN + 7 > this.pt.length) this._grow('pt');
    super.point(p, c, s);
  }
  // The petal stream: pos3 nrm3 col3 emis dd q u v dev lib. Written from grid
  // arrays by index so flPetalSurface pays one call, not four copies.
  petal(pos, nrm, k3, col, k4, dd, q, u, v, dev, lib) {
    if (this.petbN + 16 > this.petb.length) this._grow('petb');
    const s = this.petb;
    let n = this.petbN;
    s[n++] = pos[k3]; s[n++] = pos[k3 + 1]; s[n++] = pos[k3 + 2];
    s[n++] = nrm[k3]; s[n++] = nrm[k3 + 1]; s[n++] = nrm[k3 + 2];
    s[n++] = col[k4]; s[n++] = col[k4 + 1]; s[n++] = col[k4 + 2];
    s[n++] = col[k4 + 3];
    s[n++] = dd; s[n++] = q; s[n++] = u; s[n++] = v;
    s[n++] = dev; s[n++] = lib || 0;
    this.petbN = n;
    if (n % 48 === 0 && this._noArea(s, n, 16)) { this.petbN = n - 48; this.degen.pet++; }
  }
  // seg2() in the parent funnels through here, so PIN needles arrive free.
  ribbon(a, b, side, w0, w1, c, e) {
    if (this.segN + 12 > this.seg.length) this._grow('seg');
    const s = this.seg;
    let n = this.segN;
    s[n++] = a[0]; s[n++] = a[1]; s[n++] = a[2];
    s[n++] = b[0]; s[n++] = b[1]; s[n++] = b[2];
    s[n++] = w0; s[n++] = w1;
    s[n++] = c[0]; s[n++] = c[1]; s[n++] = c[2];
    s[n++] = e;
    this.segN = n;
  }
}
