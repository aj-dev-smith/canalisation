// WHERE IN THE FRAME IS THE FIELD?
//
//   node tools/flowers_frame.mjs 'garden=7&seed=21&ff=3000&speed=0&shot=wide'
//
// A still tells you a shot looks lopsided. It does not tell you by how much, or
// whether the next seed is lopsided the same way, and "the establishing frame
// wastes a quarter" is a claim about a NUMBER. This is that number, taken two
// independent ways so a disagreement is visible:
//
//   INK   the drawn canvas, reduced to a grid of blocks, each block's luminance
//         above the frame's own floor (the 15th percentile — the void, which on
//         these palettes is not black). Reports the ink centroid in NDC, the
//         share of ink in each half, and the DEAD MARGIN: how far in from each
//         edge you can walk before meeting 1% of the peak row/column. A frame
//         that wastes its left quarter has deadL ~ 0.25.
//   GEOM  every germinated specimen's drawn points projected through the live
//         camera, giving the NDC-x span the plants actually occupy and the
//         bearing of each specimen from the eye. This is the half a renderer
//         cannot lie about, and it is the half the director can act on.
//
// The two answer different questions on purpose: GEOM says where the plants
// are, INK says where the LIGHT is, and a field of one bright specimen and six
// dim ones has those in different places. Fixing a framing means moving both.
//
// GL backend and the drain/settle recipe are flowers_shot.mjs's, verbatim —
// including the black-frame check, because a black canvas has a beautifully
// centred ink distribution.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

const [, , query = 'garden=7&seed=21&ff=3000&speed=0&shot=wide'] = process.argv;
const q = new URLSearchParams(query);
const pageUrl = pathToFileURL(process.cwd() + '/flowers.html').href + '?' + q.toString();
const gpu = platform() === 'darwin';
const b = await chromium.launch({
  headless: !gpu,
  args: gpu ? ['--use-angle=metal', '--no-sandbox']
    : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pg = await b.newPage({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 2 });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
await pg.goto(pageUrl);
await pg.waitForFunction(() => window.__fl && typeof window.__fl.state === 'function', null, { timeout: 30000 });
{
  const deadline = Date.now() + 240000;
  for (;;) {
    const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
    if (!hud.includes('(fast-forward')) break;
    if (Date.now() > deadline) { console.error('TIMEOUT'); await b.close(); process.exit(1); }
    await pg.waitForTimeout(500);
  }
}
{
  let prev = null, stable = 0;
  const until = Date.now() + 30000;
  while (Date.now() < until && stable < 2) {
    await pg.waitForTimeout(600);
    const s = await pg.evaluate(() => window.__fl.state());
    if (prev) {
      const dT = Math.hypot(s.target[0] - prev.target[0], s.target[1] - prev.target[1], s.target[2] - prev.target[2]);
      stable = (Math.abs(s.dist - prev.dist) < 0.05 && dT < 0.05) ? stable + 1 : 0;
    }
    prev = s;
  }
}

const shot = await pg.screenshot({ type: 'png' });
const ink = await pg.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
  const NX = 128, NY = 90;
  const c = document.createElement('canvas');
  c.width = NX; c.height = NY;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, NX, NY);
  const d = g.getImageData(0, 0, NX, NY).data;
  const L = new Float64Array(NX * NY);
  for (let i = 0; i < NX * NY; i++) {
    L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  }
  const srt = Array.from(L).sort((a, b) => a - b);
  const floor = srt[Math.floor(srt.length * 0.15)];
  let tot = 0, sx = 0, sy = 0, left = 0, top = 0;
  const col = new Float64Array(NX), row = new Float64Array(NY);
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const v = Math.max(0, L[y * NX + x] - floor);
    tot += v; col[x] += v; row[y] += v;
    const nx = (x + 0.5) / NX * 2 - 1, ny = 1 - (y + 0.5) / NY * 2;
    sx += v * nx; sy += v * ny;
    if (nx < 0) left += v; if (ny > 0) top += v;
  }
  // The dead margin is a QUANTILE of the ink, not a threshold on it: these
  // palettes have a lit sky and a grain, so every column carries something and
  // a "first column above 1% of peak" walk returns zero from both edges on a
  // frame a person calls half empty. How far in you must walk to meet the
  // first 5% of the ink is the same question with no threshold in it.
  const walk = (a, rev, frac) => {
    const n = a.length;
    let s = 0, T = 0;
    for (const v of a) T += v;
    for (let i = 0; i < n; i++) { s += a[rev ? n - 1 - i : i]; if (s > frac * T) return i / n; }
    return 1;
  };
  return {
    floor, mean: srt.reduce((p, q) => p + q, 0) / srt.length,
    cx: sx / tot, cy: sy / tot, leftShare: left / tot, topShare: top / tot,
    deadL: walk(col, false, 0.05), deadR: walk(col, true, 0.05),
    deadT: walk(row, false, 0.05), deadB: walk(row, true, 0.05),
  };
}, shot.toString('base64'));

const geom = await pg.evaluate(() => {
  const fl = window.__fl, cam = fl.scene.camera;
  cam.updateMatrixWorld();
  const mvp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const v = new THREE.Vector4();
  const rows = [];
  let lo = 1e9, hi = -1e9, ylo = 1e9, yhi = -1e9, off = 0, wsum = 0;
  for (let i = 0; i < fl.garden.length; i++) {
    const s = fl.garden[i];
    if (!s.S) continue;
    let xl = 1e9, xh = -1e9, yl = 1e9, yh = -1e9, n = 0, behind = 0;
    for (const ax of s.S.plant.axes) for (const p of ax.pts) {
      v.set(p[0], p[1], p[2], 1).applyMatrix4(mvp);
      if (v.w <= 0) { behind++; continue; }
      const nx = v.x / v.w, ny = v.y / v.w;
      xl = Math.min(xl, nx); xh = Math.max(xh, nx);
      yl = Math.min(yl, ny); yh = Math.max(yh, ny);
      n++;
    }
    if (!n) continue;
    const o = s.plan ? s.plan.origin : [0, 0, 0];
    // CLEARANCE — how near the eye stands to this specimen. Two numbers,
    // because they answer different halves of "is the camera inside a plant":
    // the plan distance to its trunk minus what it reaches (the canopy line a
    // pose can be solved against), and the true 3D distance to its nearest
    // drawn station (what the lens actually has in front of it).
    let rch = 0, near = 1e9;
    const e = cam.position;
    for (const ax of s.S.plant.axes) for (const p of ax.pts) {
      rch = Math.max(rch, Math.hypot(p[0] - o[0], p[2] - o[2]));
      near = Math.min(near, Math.hypot(p[0] - e.x, p[1] - e.y, p[2] - e.z));
    }
    const dPlan = Math.hypot(o[0] - e.x, o[2] - e.z);
    rows.push({ i, sp: (s.plan && s.plan.name) || '?', n, behind, x: [xl, xh], y: [yl, yh], o,
      rch, near, dPlan, clear: dPlan - rch });
    lo = Math.min(lo, xl); hi = Math.max(hi, xh);
    ylo = Math.min(ylo, yl); yhi = Math.max(yhi, yh);
    off += n * (xl + xh) / 2; wsum += n;
  }
  const F = flDirField(fl.garden);
  // and what the director's own laws say about the heading the eye is actually
  // standing on — the pose functions are stateful, so this reads the ones that
  // are pure functions of the field and compares them with where the camera is.
  const e = cam.position;
  const aEye = Math.atan2(e.z - F.cz, e.x - F.cx);
  const law = {
    aEye, aEyeDeg: aEye * 180 / Math.PI,
    dEye: Math.hypot(e.x - F.cx, e.z - F.cz),
    hMid: F.hMid,
    clearance: typeof flDirClearance === 'function' ? flDirClearance(F, aEye, F.hMid) : undefined,
    gap: typeof flDirGap === 'function' ? flDirGap(F, aEye) * 180 / Math.PI : undefined,
    lowFloors: [F.R * 1.1 + 4, F.hTop * 1.35],
  };
  // THE LANE the traverse would take, and how wide it actually is. The
  // derivation says "no drawn station lies in this band"; the number says
  // whether that band is a corridor or a crack. It also walks the lane end to
  // end and reports the closest any drawn station comes to the moving eye,
  // which is the question a still of one instant cannot answer.
  if (typeof flDirCorridor === 'function') {
    const kw = Math.max(0.5, cam.aspect) * 2 * Math.tan(cam.fov * Math.PI / 360);
    const T = 32;
    const K = typeof FL_GLIDE_K === 'number' ? FL_GLIDE_K : 3;
    const L = Math.max(8, F.Rout);
    const v = K * FL_DRIFT * kw * L;
    const ln = flDirCorridor(F, 0.5 * T * K * FL_DRIFT * kw * F.Rout);
    const c = Math.cos(ln.ang), s = Math.sin(ln.ang);
    const rx = Math.sin(ln.ang), rz = -Math.cos(ln.ang);
    const bx = F.cx + rx * ln.off, bz = F.cz + rz * ln.off;
    const yE = Math.max(1.0, F.hMid);
    let worst = 1e9, worstT = 0, worstD = 1e9;
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const t = ((i / steps) - 0.5) * v * T;
      const ex = bx + c * t, ez = bz + s * t;
      for (const g of fl.garden) {
        if (!g.S) continue;
        for (const ax of g.S.plant.axes) for (const p of ax.pts) {
          const d = Math.hypot(p[0] - ex, p[1] - yE, p[2] - ez);
          if (d < worst) { worst = d; worstT = t; }
        }
      }
      // and against everything the field DRAWS, in plan — a stem is not what
      // ends up on the lens, a blade is
      for (const p of F.drawn) {
        const d = Math.hypot(p[0] - ex, p[1] - ez);
        if (d < worstD) worstD = d;
      }
    }
    law.lane = { half: ln.half, off: ln.off, len: ln.len, deg: ln.ang * 180 / Math.PI,
      v, travel: v * T, eyeY: yE, worst, worstT, worstD };
  }
  return { rows, span: [lo, hi], yspan: [ylo, yhi], xbar: off / wsum, F, law,
    eye: cam.position.toArray(), fov: cam.fov, aspect: cam.aspect };
});

// THE HEADING SWEEP — the half of this tool that is about what the director
// COULD have done. For every heading on a 4-degree grid it stands the
// establishing eye where flDirPoseEstab would stand it, projects every drawn
// point of every specimen through that camera, and reports how much of the
// frame's width and height the field then covers. It is the same arithmetic the
// pose does, run over the whole circle instead of over the one heading the
// covariance picked, and it says in one table whether a heading is worth
// choosing at all.
const sweep = await pg.evaluate(() => {
  const fl = window.__fl, cam = fl.scene.camera;
  const F = flDirField(fl.garden);
  const fovH = 2 * Math.tan(cam.fov * Math.PI / 360);
  const A = Math.max(0.5, cam.aspect);
  const k = flEstabKnobs();
  const dW = 2 * F.Rout / (k[0] * A * fovH);
  const dH = F.hHi / (k[1] * fovH);
  const D = Math.max(dW, dH, F.Rout * 1.15 + 6);
  const yT = fovH * D * (0.5 - k[2]);
  const yE = Math.max(1.0, yT + fovH * D * (k[3] - 0.5));
  const out = [];
  for (let deg = 0; deg < 360; deg += 4) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const eye = new THREE.Vector3(F.cx + c * D, yE, F.cz + s * D);
    const cm = cam.clone();
    cm.position.copy(eye);
    cm.lookAt(F.cx, yT, F.cz);
    cm.updateMatrixWorld();
    const mvp = new THREE.Matrix4().multiplyMatrices(cm.projectionMatrix, cm.matrixWorldInverse);
    const v = new THREE.Vector4();
    let xl = 1e9, xh = -1e9, yl = 1e9, yh = -1e9;
    for (const sp of fl.garden) {
      if (!sp.S) continue;
      for (const ax of sp.S.plant.axes) for (const p of ax.pts) {
        v.set(p[0], p[1], p[2], 1).applyMatrix4(mvp);
        if (v.w <= 0) continue;
        const nx = v.x / v.w, ny = v.y / v.w;
        if (nx < xl) xl = nx; if (nx > xh) xh = nx;
        if (ny < yl) yl = ny; if (ny > yh) yh = ny;
      }
    }
    // and what the director's own solver believes it would get from here, so a
    // disagreement between the pose's arithmetic and the projected stations is
    // visible rather than inferred
    const sol = typeof flEstabSolve === 'function' ? flEstabSolve(F, a, k, A, fovH) : null;
    out.push({ deg, w: (xh - xl) / 2, h: (yh - yl) / 2, mid: (xh + xl) / 2, top: yh, bot: yl,
      solFill: sol ? sol.fill : undefined, solD: sol ? sol.D : undefined });
  }
  return { rows: out, D, yT, yE, pa: F.pa };
});

// WHOSE GRAINS ARE THESE, AND ARE THEY ANYWHERE NEAR THE SUBJECT?
// tools/flowers_motes.mjs answers how big a grain is drawn and how many are in
// frame; when the answer is zero, the next question is whether the population
// is somewhere else or the FRAME is. This assigns every live grain to the
// nearest specimen origin in plan and reports where each specimen's plume sits
// relative to the shot, so "the close-up has no motes" separates into "the
// subject is not shedding" and "the subject's plume is out of frame".
const pollen = await pg.evaluate(() => {
  const fl = window.__fl, p = fl.pollen, cam = fl.scene.camera;
  if (!p || !p.n) return null;
  cam.updateMatrixWorld();
  const mvp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  const v = new THREE.Vector4();
  const by = fl.garden.map(() => ({ n: 0, inFrame: 0, y: 0, ndcY: 0, dist: 0 }));
  const st = fl.state();
  for (let i = 0; i < p.n; i++) {
    const o = i * 7, x = p.buf[o], y = p.buf[o + 1], z = p.buf[o + 2];
    let bi = 0, bd = 1e9;
    for (let j = 0; j < fl.garden.length; j++) {
      const g = fl.garden[j];
      if (!g.S) continue;
      const q = g.plan ? g.plan.origin : [0, 0, 0];
      const d = Math.hypot(x - q[0], z - q[2]);
      if (d < bd) { bd = d; bi = j; }
    }
    v.set(x, y, z, 1).applyMatrix4(mvp);
    const on = v.w > 0 && Math.abs(v.x) <= v.w && Math.abs(v.y) <= v.w && v.z >= -v.w && v.z <= v.w;
    const r = by[bi];
    r.n++; if (on) r.inFrame++;
    r.y += y; r.ndcY += v.w > 0 ? v.y / v.w : 0;
    r.dist += Math.hypot(x - cam.position.x, y - cam.position.y, z - cam.position.z);
  }
  // and the director's own subject-score factors, for every floral axis in the
  // field. `flowerScore` is a closure inside flBoot and cannot be reached, so
  // the base term is missing — but every MULTIPLIER is a global function and
  // they are what a garden adds, so this says which of them is deciding.
  const F = flDirField(fl.garden);
  const cand = [];
  for (let i = 0; i < fl.garden.length; i++) {
    const s = fl.garden[i];
    if (!s.S) continue;
    for (let ai = 0; ai < s.S.plant.axes.length; ai++) {
      const ax = s.S.plant.axes[ai];
      if (!ax.floral) continue;
      const bb = s.B.floralBounds(ai);
      if (!bb) continue;
      // the shipped base score, re-implemented from 40_boot's flowerScore
      // (which is a closure). ⚠ A SECOND IMPLEMENTATION IS A THING THAT DRIFTS:
      // if this column stops agreeing with which subject the page picks, this
      // copy is the suspect, not the page.
      let np = 0;
      for (const org of ax.organs) if (org.petal && org.len > 0.05) np++;
      let clear = 1;
      if (ai !== 0) {
        let tp = null, bd = 1e9;
        for (const q of s.S.plant.axes[0].pts) {
          const d = Math.abs(q[1] - bb.c[1]);
          if (d < bd) { bd = d; tp = q; }
        }
        clear = tp ? smoothstep(0.25, 1.0,
          Math.hypot(bb.c[0] - tp[0], bb.c[2] - tp[2]) / Math.max(0.3, bb.r)) : 1;
      }
      const base = np < 3 ? 0 : np / (0.6 + bb.r) * (0.15 + 0.85 * clear);
      cand.push({ i, ai, r: bb.r, y: bb.c[1], base, np,
        open: 0.25 + 0.75 * flDirOpenness(ax),
        crowd: flDirCrowd(fl.garden, s, bb),
        rim: 0.65 + 0.5 * smoothstep(0, F.R, Math.hypot(bb.c[0] - F.cx, bb.c[2] - F.cz)),
        compact: flDirCompact(bb),
        plume: typeof flDirPlume === 'function' ? flDirPlume(p, bb) : undefined });
    }
  }
  return { rows: by, subj: st.subj, shot: st.shot, tgt: st.target, n: p.n, cand };
});

const f = (x, d = 3) => (x === undefined ? 'n/a' : (+x).toFixed(d));
console.log(`\nINK   centroid  x ${f(ink.cx)}  y ${f(ink.cy)}      (0,0 is the middle of the frame)`);
console.log(`      halves    left ${f(ink.leftShare)}  top ${f(ink.topShare)}   (0.5 each is balanced)`);
console.log(`      dead      L ${f(ink.deadL)}  R ${f(ink.deadR)}  T ${f(ink.deadT)}  B ${f(ink.deadB)}   (fraction of the frame with no ink at all)`);
console.log(`\nGEOM  plants span NDC x [${f(geom.span[0])}, ${f(geom.span[1])}]  y [${f(geom.yspan[0])}, ${f(geom.yspan[1])}]`);
console.log(`      station-weighted mid x ${f(geom.xbar)}`);
console.log(`      field  cx ${f(geom.F.cx, 2)} cz ${f(geom.F.cz, 2)}  R ${f(geom.F.R, 2)} Rout ${f(geom.F.Rout, 2)} hHi ${f(geom.F.hHi, 2)} hTop ${f(geom.F.hTop, 2)} pa ${f(geom.F.pa)}`);
console.log(`      eye ${geom.eye.map(v => f(v, 1)).join(', ')}  fov ${f(geom.fov, 2)} aspect ${f(geom.aspect, 3)}`);
for (const r of geom.rows) {
  console.log(`      [${r.i}] ${r.sp.padEnd(20)} x [${f(r.x[0], 2).padStart(6)}, ${f(r.x[1], 2).padStart(6)}]  y [${f(r.y[0], 2).padStart(6)}, ${f(r.y[1], 2).padStart(6)}]  pts ${String(r.n).padStart(4)}  reach ${f(r.rch, 1).padStart(5)}  eye-to-trunk ${f(r.dPlan, 1).padStart(6)}  clearance ${f(r.clear, 1).padStart(7)}  nearest station ${f(r.near, 1)}`);
}
{
  const cl = geom.rows.map(r => r.clear).sort((a, b) => a - b)[0];
  const nr = geom.rows.map(r => r.near).sort((a, b) => a - b)[0];
  console.log(`      WORST clearance ${f(cl, 1)} (negative = the eye is inside a canopy)   nearest drawn station ${f(nr, 1)}`);
}
{
  const L = geom.law;
  console.log(`\nLAW   the eye stands on heading ${f(L.aEyeDeg, 1)}deg at ${f(L.dEye, 1)} from the middle`);
  console.log(`      flDirClearance on that heading (margin hMid ${f(L.hMid, 1)}) = ${f(L.clearance, 1)}   low floors ${L.lowFloors.map(v => f(v, 1)).join(' / ')}`);
  console.log(`      nearest gap centre to it: ${f(L.gap, 1)}deg`);
  if (L.lane) {
    const n = L.lane;
    console.log(`      LANE  ${f(n.deg, 1)}deg  offset ${f(n.off, 1)}  half-width ${f(n.half, 2)}  length ${f(n.len, 1)}`);
    console.log(`            eye y ${f(n.eyeY, 1)}  speed ${f(n.v, 2)} u/s  travel over 32 s ${f(n.travel, 1)}`);
    console.log(`            closest STEM station to the moving eye ${f(n.worst, 2)} (at t ${f(n.worstT, 1)});  closest DRAWN point in plan ${f(n.worstD, 2)}`);
  }
}
if (pollen) {
  console.log(`\nMOTES ${pollen.n} live grains  ·  shot ${pollen.shot}  ·  subject ${pollen.subj ? 'specimen ' + pollen.subj.i + ' axis ' + pollen.subj.ax : 'none'}  ·  target ${pollen.tgt.map(v => f(v, 1)).join(', ')}`);
  for (let i = 0; i < pollen.rows.length; i++) {
    const r = pollen.rows[i];
    if (!r.n) continue;
    console.log(`      [${i}] ${String(r.n).padStart(4)} grains  ${String(r.inFrame).padStart(4)} in frame   mean height ${f(r.y / r.n, 1).padStart(6)}  mean ndc.y ${f(r.ndcY / r.n, 2).padStart(7)}  mean range ${f(r.dist / r.n, 1)}`);
  }
  const cs = pollen.cand.slice().sort((p, q) =>
    (q.base * q.open * q.crowd * q.rim * q.compact * (q.plume || 1) * (q.i === 0 ? 1.25 : 1)) - (p.base * p.open * p.crowd * p.rim * p.compact * (p.plume || 1) * (p.i === 0 ? 1.25 : 1)));
  console.log(`      subject score, best first (base re-implemented from 40_boot's closure — see the tool):`);
  for (const c of cs.slice(0, 8)) {
    console.log(`        [${c.i}] ax ${String(c.ai).padStart(2)}  petals ${String(c.np).padStart(2)} base ${f(c.base, 2)}  r ${f(c.r, 2)} y ${f(c.y, 1).padStart(5)}   open ${f(c.open, 2)}  crowd ${f(c.crowd, 2)}  rim ${f(c.rim, 2)}  compact ${f(c.compact, 2)}  plume ${f(c.plume, 2)}   product ${f(c.base * c.open * c.crowd * c.rim * c.compact * (c.plume || 1) * (c.i === 0 ? 1.25 : 1), 3)}`);
  }
}

const best = sweep.rows.slice().sort((p, q) => q.w - p.w)[0];
const worst = sweep.rows.slice().sort((p, q) => p.w - q.w)[0];
const paDeg = ((sweep.pa * 180 / Math.PI) % 360 + 360) % 360;
const atPa = sweep.rows.reduce((p, q) =>
  Math.abs(((q.deg - paDeg + 540) % 360) - 180) > Math.abs(((p.deg - paDeg + 540) % 360) - 180) ? q : p);
console.log(`\nSWEEP the establishing eye at D ${f(sweep.D, 1)}, yE ${f(sweep.yE, 1)}, aimed at yT ${f(sweep.yT, 1)}`);
console.log(`      half-width of the field on screen, per heading (1.0 = the frame's own half-width)`);
console.log(`        widest   ${best.deg}deg  w ${f(best.w)}  h ${f(best.h)}  mid ${f(best.mid)}`);
console.log(`        pa       ${atPa.deg}deg  w ${f(atPa.w)}  h ${f(atPa.h)}  mid ${f(atPa.mid)}    <- what the covariance picks`);
console.log(`        narrowest ${worst.deg}deg  w ${f(worst.w)}  h ${f(worst.h)}  mid ${f(worst.mid)}`);
let line = '      stations  ';
for (const r of sweep.rows) if (r.deg % 20 === 0) line += `${r.deg}:${f(r.w, 2)} `;
console.log(line);
if (sweep.rows[0].solFill !== undefined) {
  let l2 = '      solver    ';
  for (const r of sweep.rows) if (r.deg % 20 === 0) l2 += `${r.deg}:${f(r.solFill, 2)} `;
  console.log(l2);
  let l3 = '      solver D  ';
  for (const r of sweep.rows) if (r.deg % 20 === 0) l3 += `${r.deg}:${f(r.solD, 0)} `;
  console.log(l3);
}
console.log('');
await b.close();
if (ink.mean < 3) { console.error('BLACK FRAME — nothing above is evidence.'); process.exit(1); }
