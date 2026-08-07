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
class FlowerBuffers extends Buffers {
  constructor() {
    super();
    this.seg = new Float32Array(1 << 18);   // 12 floats per vein segment
    this.segN = 0;
    this.petb = new Float32Array(1 << 18);  // 14 floats per petal vertex
    this.petbN = 0;
    this.organs = [];                        // [{ meta, tri0,tri1, seg0,seg1, pt0,pt1 }]
    this._open = null;
  }
  reset() {
    super.reset();
    this.segN = 0;
    this.petbN = 0;
    this.organs.length = 0;
    this._open = null;
  }
  _grow(name) {
    const old = this[name];
    const next = new Float32Array(old.length * 2);
    next.set(old);
    this[name] = next;
  }
  beginOrgan(meta) {
    this._open = { meta, tri0: this.triN, seg0: this.segN, pt0: this.ptN };
  }
  endOrgan() {
    const o = this._open;
    if (!o) return;
    o.tri1 = this.triN; o.seg1 = this.segN; o.pt1 = this.ptN;
    this.organs.push(o);
    this._open = null;
  }
  vert(p, n, c, e) {
    if (this.triN + 10 > this.tri.length) this._grow('tri');
    super.vert(p, n, c, e);
  }
  point(p, c, s) {
    if (this.ptN + 7 > this.pt.length) this._grow('pt');
    super.point(p, c, s);
  }
  // The petal stream: pos3 nrm3 col3 emis dd q u v. Written from grid arrays
  // by index so flPetalSurface pays one call, not four copies.
  petal(pos, nrm, k3, col, k4, dd, q, u, v) {
    if (this.petbN + 14 > this.petb.length) this._grow('petb');
    const s = this.petb;
    let n = this.petbN;
    s[n++] = pos[k3]; s[n++] = pos[k3 + 1]; s[n++] = pos[k3 + 2];
    s[n++] = nrm[k3]; s[n++] = nrm[k3 + 1]; s[n++] = nrm[k3 + 2];
    s[n++] = col[k4]; s[n++] = col[k4 + 1]; s[n++] = col[k4 + 2];
    s[n++] = col[k4 + 3];
    s[n++] = dd; s[n++] = q; s[n++] = u; s[n++] = v;
    this.petbN = n;
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
