// The petal surface, as a stream of its own.
//
// This is blade()'s surface half (50_geom.js:351-455) with the SAME
// parametrisation — bladeMap, the asymmetric half-widths, the furl, the
// fenestration cut — emitting to a fourth stream that carries, per vertex,
// what the shipped 10-float layout has no room for:
//
//   pos3 nrm3 col3 emis · dd · q · u · v        (14 floats)
//
// col/emis are baked EXACTLY as shipped (same veinTint, same 0.24 glow), so
// with a shader that ignores the last four floats this stream is
// pixel-identical to the shipped lamina. That is deliberate: parity first,
// then mechanisms — dd is the distance field of a vein network that canalised
// itself, q is how far in from the rim the organ was founded, and both are
// channels the project computes and has never drawn. What the petal shader
// does with them is argued in 35_shade.js, not here.
//
// The vasculature half is not copied: the draw loop still calls the shipped
// blade() with { surface: false } and the veins arrive through the ribbon
// stream like everyone else's.

const _fpP = v3(), _fpPu = v3(), _fpPv = v3(), _fpE1 = v3(), _fpE2 = v3(), _fpN = v3();
const _fpQp = [v3(), v3(), v3(), v3()];
const _fpQn = [v3(), v3(), v3(), v3()];
let _fpPos = new Float32Array(0), _fpNrm = new Float32Array(0), _fpCol = new Float32Array(0), _fpDD = new Float32Array(0);

function flPetalSurface(B, leaf, frame, len, wid, pal, curl, ripple, glow, MU, MV, dev, sen, q) {
  if (!leaf.margin || !leaf.margin.mature) return;
  MU = MU || 22; MV = MV || 10;
  dev = dev === undefined ? 1 : dev;
  sen = sen || 0;
  const o = leaf.o;
  const { wAt, wMat, furlAt } = bladeMap(leaf, len, dev);
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
      bladePoint(_fpP, frame, u, at(u, t), len, wid, curl, ripple, furlAt(u));
      bladePoint(_fpPu, frame, u + h, at(u + h, t), len, wid, curl, ripple, furlAt(u + h));
      bladePoint(_fpPv, frame, u, at(u, t + h), len, wid, curl, ripple, furlAt(u));
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
    B.petal(pos, nrm, k3, col, k4, ddb[k1], q, u, t);
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
