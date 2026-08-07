// The petal surface, as a stream of its own — and no longer a flat card.
//
// This is blade()'s surface half (50_geom.js:351-455) with the SAME
// parametrisation — bladeMap, the asymmetric half-widths, the furl, the
// fenestration cut — but the out-of-plane displacement is 12_form.js's
// physics instead of the shipped `curl*u^2` pose: the Liang & Mahadevan
// shell curvatures (the bloom), plus Cerda & Mahadevan edge ripples at their
// published wavelength and amplitude. The veins are mapped through the SAME
// displacement — a vein floating off a curved petal was the first thing the
// first build of this file produced.
//
// Stream layout, 16 floats per vertex:
//   pos3 nrm3 col3 emis · dd · q · u · v · dev · lib
//
// col/emis are baked EXACTLY as shipped (same veinTint, same 0.24 glow); the
// shader mechanisms (35_shade) MODULATE that baseline, they do not replace it.

const _fpP = v3(), _fpPu = v3(), _fpPv = v3(), _fpE1 = v3(), _fpE2 = v3(), _fpN = v3();
const _fpQ0 = v3(), _fpQ1 = v3(), _fpSide = v3(), _fpSenV = v3();
let _fpPos = new Float32Array(0), _fpNrm = new Float32Array(0), _fpCol = new Float32Array(0), _fpDD = new Float32Array(0);

// Out-of-plane height of petal tissue at (u, v): the shell curvatures bend
// the sheet, the edge ripple corrugates it. `tN` is the normalised lateral
// coordinate (-1..1) for the ripple envelope; `off` carries furl and vein lift.
// The ripple's spatial weight is the measured strain geography: strain rises
// base to tip (Liang & Mahadevan [D]) and lives at the margin, so the
// envelope is u-ramped and edge-weighted. The 0.4/0.6 and 0.25/0.75 splits
// are stated shape constants inside a [D] profile.
function flPetalPoint(out, frame, u, v, len, wid, form, phase, tN, off) {
  const x = u * len, y = v * wid;
  const shell = 0.5 * form.kx * x * x + 0.5 * form.ky * y * y;
  const env = (0.4 + 0.6 * u) * (0.25 + 0.75 * tN * tN);
  const rip = form.amp * env * Math.sin(2 * Math.PI * y / form.lam + phase);
  const n = shell + rip + (off || 0);
  out[0] = frame.o[0] + frame.x[0] * x + frame.z[0] * y + frame.y[0] * n;
  out[1] = frame.o[1] + frame.x[1] * x + frame.z[1] * y + frame.y[1] * n;
  out[2] = frame.o[2] + frame.x[2] * x + frame.z[2] * y + frame.y[2] * n;
  return out;
}

function flPetalSurface(B, leaf, frame, len, wid, pal, glow, MU, MV, dev, sen, q, phase, lib) {
  if (!leaf.margin || !leaf.margin.mature) return;
  MU = MU || 22; MV = MV || 10;
  dev = dev === undefined ? 1 : dev;
  sen = sen || 0;
  const o = leaf.o;
  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const form = flPetalForm(len, dev, q);
  const vdf = leaf.vdf, res = leaf.vdfRes || 0;
  const nearVein = (u, v) => {
    if (!vdf) return 9;
    const a = clamp(Math.round(u * (res - 1)), 0, res - 1);
    const b = clamp(Math.round((v / o.aspect * 0.5 + 0.5) * (res - 1)), 0, res - 1);
    return vdf[a * res + b];
  };

  const NU = MU + 1, NV = MV + 1;
  const pos = _fpPos.length >= NU * NV * 3 ? _fpPos : (_fpPos = new Float32Array(NU * NV * 3));
  const nrm = _fpNrm.length >= NU * NV * 3 ? _fpNrm : (_fpNrm = new Float32Array(NU * NV * 3));
  const col = _fpCol.length >= NU * NV * 4 ? _fpCol : (_fpCol = new Float32Array(NU * NV * 4));
  const ddb = _fpDD.length >= NU * NV ? _fpDD : (_fpDD = new Float32Array(NU * NV));
  const h = 0.004;
  const at = (u, t) => t * wAt(u, t);
  const matAtUV = (u, t) => t * wMat(u, t);
  for (let i = 0; i < NU; i++) {
    const u = i / MU;
    for (let j = 0; j < NV; j++) {
      const t = (j / MV) * 2 - 1;
      const k3 = (i * NV + j) * 3, k4 = (i * NV + j) * 4, k1 = i * NV + j;
      flPetalPoint(_fpP, frame, u, at(u, t), len, wid, form, phase, t, furlAt(u));
      flPetalPoint(_fpPu, frame, u + h, at(u + h, t), len, wid, form, phase, t, furlAt(u + h));
      flPetalPoint(_fpPv, frame, u, at(u, t + h), len, wid, form, phase, t + h, furlAt(u));
      v3sub(_fpE1, _fpPu, _fpP); v3sub(_fpE2, _fpPv, _fpP);
      v3norm(_fpN, v3cross(_fpN, _fpE1, _fpE2));
      pos[k3] = _fpP[0]; pos[k3 + 1] = _fpP[1]; pos[k3 + 2] = _fpP[2];
      nrm[k3] = _fpN[0]; nrm[k3 + 1] = _fpN[1]; nrm[k3 + 2] = _fpN[2];
      const vv = matAtUV(u, t);
      const dd = vdf ? clamp(1 - nearVein(u, vv) * 11, 0, 1) : 0;
      ddb[k1] = dd;
      const tt = clamp(u * 0.9 + 0.1, 0, 1);
      const r = lerp(pal.blade0[0], pal.blade1[0], tt) + dd * pal.veinTint[0];
      const g = lerp(pal.blade0[1], pal.blade1[1], tt) + dd * pal.veinTint[1];
      const b = lerp(pal.blade0[2], pal.blade1[2], tt) + dd * pal.veinTint[2];
      const hold = dd * dd;
      const sl = sen > 0 ? clamp((sen - hold * VEIN_LAG) / (1 - VEIN_LAG), 0, 1) : 0;
      senesceTint(_senC, r, g, b, sl);
      col[k4] = _senC[0]; col[k4 + 1] = _senC[1]; col[k4 + 2] = _senC[2];
      col[k4 + 3] = dd * glow * 0.24 * (1 - sl);
    }
  }
  const emit = (i, j) => {
    const k3 = (i * NV + j) * 3, k4 = (i * NV + j) * 4, k1 = i * NV + j;
    const u = i / MU, t = (j / MV) * 2 - 1;
    // the v slot carries the vdf-style texture coordinate (material lateral
    // over aspect), so the shader samples the spot field exactly where the
    // CPU samples the vein distance field
    const tex = clamp((matAtUV(u, t) / (o.aspect || 1)) * 0.5 + 0.5, 0, 1);
    B.petal(pos, nrm, k3, col, k4, ddb[k1], q, u, tex, dev, lib);
  };
  for (let i = 0; i < MU; i++) {
    const u0 = i / MU, u1 = (i + 1) / MU;
    for (let j = 0; j < MV; j++) {
      if (o.fenestrate > 0 && vdf) {
        const mu = (u0 + u1) * 0.5;
        const mt = ((j + 0.5) / MV) * 2 - 1;
        if (nearVein(mu, matAtUV(mu, mt)) > o.fenestrate && mu > 0.16 && mu < 0.93) continue;
      }
      emit(i, j); emit(i, j + 1); emit(i + 1, j + 1);
      emit(i, j); emit(i + 1, j + 1); emit(i + 1, j);
    }
  }
}

// The petal's vasculature, mapped through the SAME displacement the surface
// uses. This mirrors the shipped bladeVeins (50_geom.js:464) in its PXR=0
// form — this piece runs with vein LOD off, so the cull, the relight and the
// per-blade floor all reduce to identities; what remains is the dev gate, the
// half-width guards, the width law and the emission law, kept verbatim.
function flPetalVeins(B, leaf, frame, len, wid, pal, glow, dev, sen, q, phase, veinMul) {
  const segs = leaf.veins;
  if (!segs || veinMul <= 0) return;
  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
  const form = flPetalForm(len, dev, q);
  const lift = len * 0.010 + 0.005;
  const base = len * 0.0034;
  const sv = sen > 0 ? clamp((sen - VEIN_LAG) / (1 - VEIN_LAG), 0, 1) : 0;
  senesceTint(_fpSenV, pal.vein[0], pal.vein[1], pal.vein[2], sv);
  const vglow = glow * (1 - sv * 0.92);
  for (let k = 0; k < segs.length; k++) {
    const s = segs[k];
    if (s.x0 > dev + 0.04 || s.x1 > dev + 0.04) continue;
    const w0 = wMat(s.x0, s.y0), w1 = wMat(s.x1, s.y1);
    if (w0 < 1e-3 || w1 < 1e-3) continue;
    const t0 = clamp(s.y0 / w0, -1, 1), t1 = clamp(s.y1 / w1, -1, 1);
    flPetalPoint(_fpQ0, frame, s.x0, t0 * wAt(s.x0, s.y0), len, wid, form, phase, t0, lift + furlAt(s.x0));
    flPetalPoint(_fpQ1, frame, s.x1, t1 * wAt(s.x1, s.y1), len, wid, form, phase, t1, lift + furlAt(s.x1));
    const w = Math.max(0.004, base * (0.25 + s.w * 1.35));
    // side is irrelevant to FlowerBuffers.ribbon (camera-faced in the shader)
    B.ribbon(_fpQ0, _fpQ1, null, w, w, _fpSenV, vglow * (0.06 + s.w * 0.52) * veinMul);
  }
}
