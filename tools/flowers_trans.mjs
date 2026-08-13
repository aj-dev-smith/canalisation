// WHAT DOES THE CAMERA PASS THROUGH BETWEEN SHOTS?
//
//   node tools/flowers_trans.mjs 'garden=7&seed=21&ff=3000&speed=0'
//
// Every other instrument here measures a POSE. A pose is where a move ends, and
// the defect this file was written for is entirely in the middle of the move:
// caught on film at shots/film/fr06.png, one out-of-focus near blade filling the
// whole frame with the subject invisible, four seconds into the transition into
// `close`. The pose either side of it is clean. flDirBlendEye already stopped
// the eye CHORDING across the middle of the stand; what is left is that the
// blended path's height and radius can still drag the lens through a canopy
// standing between two poses.
//
// So this walks the transitions rather than the shots. For each shot-to-shot
// move in one full rotation it reconstructs the path the director would fly —
// the real pose functions, the real blend, the real per-frame re-solve of the
// pose as the orbit turns — and reports how close the eye comes to anything the
// field DRAWS, in three dimensions.
//
// THE CLOUD IS THIS FILE'S OWN, AND THAT IS DELIBERATE. flDirField's `drawn` is
// a plan projection: [x, z] pairs with the height thrown away, which is exactly
// the coordinate a fly-over is about. This builds [x, y, z] from the same two
// sources (every drawn station, and each organ's frame at half and full reach)
// so the number here is independent of whatever the director believes. ⚠ It
// inherits the one weakness of that construction, which is worth restating
// rather than hiding: AN ORGAN IS SAMPLED ALONG ITS OWN AXIS, so a blade's WIDTH
// is invisible to it and every clearance printed below is optimistic by roughly
// a lamina half-width.
//
// GL backend and the drain/settle recipe are flowers_shot.mjs's, verbatim.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

// The third argument is which path the CLOSE-UP's entrance is modelled as.
// Every other shot blends through flDirBlendEye; the close-up is framed by the
// shipped framer and 40_boot holds it back toward the pose it cut from, which is
// a CHORD in world space. `auto` reads the build under test — a bundle that
// exposes flDirLift is one where that entrance was moved onto the same arc.
const [, , query = 'garden=7&seed=21&ff=3000&speed=0', nsArg = '41', closeArg = 'auto'] = process.argv;
const NS = Math.max(5, +nsArg || 41);
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
await pg.waitForTimeout(2000);

const out = await pg.evaluate(([NS, closeMode]) => {
  const fl = window.__fl, cam = fl.scene.camera;
  const specs = fl.garden;
  const F = flDirField(specs);

  // --- the cloud, and it is THE DRAWN SURFACE rather than a model of it. Each
  // specimen's FlowerBuffers holds the triangles, petal grids and vein ribbons
  // that were actually handed to the GPU this frame, so this needs no estimate
  // of how wide a blade is: it reads the vertices. That is the whole reason the
  // caveat in the header is worth taking seriously about F.drawn and not about
  // this — the director samples an organ along its AXIS and cannot know its
  // width; the vertex buffer is the width.
  //
  // Subsampled to ~60k points so the six-transition sweep stays under a minute;
  // a lamina is thousands of vertices and every third one bounds it just as
  // well for a nearest-point query.
  const cloud = [];
  let tot = 0;
  for (const s of specs) if (s.B) tot += s.B.triN / 10 + s.B.petbN / 16 + s.B.segN / 12;
  const skip = Math.max(1, Math.round(tot / 60000));
  for (const s of specs) {
    if (!s.B) continue;
    const B = s.B;
    for (let k = 0, i = 0; k < B.triN; k += 10, i++) {
      if (i % skip) continue;
      cloud.push([B.tri[k], B.tri[k + 1], B.tri[k + 2]]);
    }
    for (let k = 0, i = 0; k < B.petbN; k += 16, i++) {
      if (i % skip) continue;
      cloud.push([B.petb[k], B.petb[k + 1], B.petb[k + 2]]);
    }
    for (let k = 0, i = 0; k < B.segN; k += 12, i++) {
      if (i % skip) continue;
      cloud.push([B.seg[k], B.seg[k + 1], B.seg[k + 2]]);
    }
  }
  // HOW MUCH OF THE FRAME IS FOREGROUND — which is the defect stated the way a
  // viewer meets it. A nearest-point distance says the lens is inside a plant;
  // it does not say the picture is a wall. So each sample is also RASTERISED:
  // a 32 x 20 grid of the frame, and a cell is marked when any drawn vertex
  // falls in it CLOSER THAN HALF the eye-to-subject distance. Half is by eye and
  // it is a reporting threshold only — nothing in the director reads it — but it
  // is the right shape of test, because the lens is focused at the subject's own
  // distance (40_boot sets uFocus to it) and anything at half that range is the
  // out-of-focus foreground that fr06.png is made of.
  const _cm = cam.clone(), _tg = new THREE.Vector3(), _v = new THREE.Vector4();
  const _mv = new THREE.Matrix4();
  const GX = 32, GY = 20, grid = new Uint8Array(GX * GY);
  const near = (x, y, z, tx, ty, tz) => {
    let d2 = 1e18, n3 = 0, vy = 0;
    _cm.position.set(x, y, z);
    _tg.set(tx, ty, tz);
    _cm.lookAt(_tg);
    _cm.updateMatrixWorld();
    _mv.multiplyMatrices(_cm.projectionMatrix, _cm.matrixWorldInverse);
    grid.fill(0);
    const fd = Math.hypot(tx - x, ty - y, tz - z);
    const nearZ = 0.5 * fd;
    for (const p of cloud) {
      const dx = p[0] - x, dy = p[1] - y, dz = p[2] - z;
      const q = dx * dx + dy * dy + dz * dz;
      if (q < d2) { d2 = q; vy = p[1]; }
      if (q < 9) n3++;                      // vertices inside 3 units of the lens
      if (q > nearZ * nearZ) continue;
      _v.set(p[0], p[1], p[2], 1).applyMatrix4(_mv);
      if (_v.w <= 0) continue;
      const nx = _v.x / _v.w, ny = _v.y / _v.w;
      if (nx < -1 || nx > 1 || ny < -1 || ny > 1) continue;
      grid[Math.min(GY - 1, ((1 - ny) * 0.5 * GY) | 0) * GX
        + Math.min(GX - 1, ((nx + 1) * 0.5 * GX) | 0)] = 1;
    }
    let cov = 0;
    for (let i = 0; i < grid.length; i++) cov += grid[i];
    return { d: Math.sqrt(d2), n3, cov: cov / (GX * GY), dy: y - vy };
  };

  // THE SUBJECT SCORE, re-implemented from 40_boot's flowerScore, which is a
  // closure inside flBoot and cannot be reached from here. ⚠ A SECOND
  // IMPLEMENTATION IS A THING THAT DRIFTS — tools/flowers_frame.mjs carries the
  // same copy and the same warning. If the subject this tool picks stops
  // agreeing with the page's own HUD, this copy is the suspect.
  const scoreAxis = (sp, ai) => {
    const ax = sp.S.plant.axes[ai];
    if (!ax.floral) return 0;
    let n = 0;
    for (const org of ax.organs) if (org.petal && org.len > 0.05) n++;
    if (n < 3) return 0;
    const bb = sp.B.floralBounds(ai);
    if (!bb) return 0;
    let clear = 1;
    if (ai !== 0) {
      let tp = null, bd = 1e9;
      for (const p of sp.S.plant.axes[0].pts) {
        const d = Math.abs(p[1] - bb.c[1]);
        if (d < bd) { bd = d; tp = p; }
      }
      clear = tp ? smoothstep(0.25, 1.0,
        Math.hypot(bb.c[0] - tp[0], bb.c[2] - tp[2]) / Math.max(0.3, bb.r)) : 1;
    }
    return n / (0.6 + bb.r) * (0.15 + 0.85 * clear);
  };

  const _t0 = new THREE.Vector3();
  let cutId = 0;
  const arcClose = closeMode === 'auto' ? typeof flDirLift === 'function' : closeMode === 'arc';
  const dir = flDirMake();
  flDirLens(dir, cam);
  const pick = flDirPick(specs, cam.position, scoreAxis, F, fl.pollen);
  const bb = pick ? specs[pick.i].B.floralBounds(pick.ai) : null;

  // THE CLOSE-UP'S DESTINATION, and it is the one pose here that is not a pose
  // function. 40_boot frames it with the shipped framer — three exponential
  // lerps onto a corolla — and paces the move off the corolla CENTRE ("over-
  // estimating a 40-unit move by 8 units is a third of a second"). The eye
  // itself ends about `radius * 2.35` out from that centre along the direction
  // frameAxisFlower blends, whose largest term in a garden is flDirOutward. That
  // standoff is reconstructed here rather than the whole blend: a second copy of
  // frameAxisFlower would drift, and the part that matters for a flight path is
  // WHERE THE MOVE STOPS, not which side of the flower it stops on.
  const closeStand = bb ? Math.max(1.0, bb.r * 1.8) * 2.35 : 0;
  const poseEye = (name, u) => {
    if (name === 'close') {
      if (!bb) return null;
      const o = flDirOutward(dir, F, bb);
      dir.wantEye.set(bb.c[0] + o.x * closeStand, bb.c[1], bb.c[2] + o.z * closeStand);
      dir.wantTgt.set(bb.c[0], bb.c[1], bb.c[2]);
      return Math.max(1, bb.r);
    }
    if (name === 'dolly') return flDirPoseDolly(dir, F, bb || { c: [F.cx, F.hMid, F.cz] }, u);
    if (name === 'glide') return flDirPoseGlide(dir, F, u);
    if (name === 'low') return flDirPoseLow(dir, F);
    if (name === 'wide') return flDirPoseEstab(dir, F, cam);
    return flDirPoseBank(dir, F);
  };

  // ONE FULL ROTATION, cut by cut, with the per-cut state flDirClock walks:
  // the heading jitter, the end-for-end flip and the orbit's sign. Nothing here
  // reads a wall clock — `el` is set to where the transition has got to, which
  // is what every pose function actually reads.
  const rows = [];
  let prev = null, prevName = '(start)';
  for (let pass = 0; pass < 2; pass++) {           // one warm rotation, then measure
    for (let k = 0; k < FL_DIR_SHOTS.length; k++) {
      const sh = FL_DIR_SHOTS[k];
      dir.shot = k;
      dir.ang = (dir.ang + 2.39996323) % TAU;
      dir.flip = dir.flip ? 0 : Math.PI;
      dir.jit = (dir.ang / TAU - 0.5) * 1.0;
      dir.spin = dir.jit >= 0 ? 1 : -1;
      dir.holdK = 1;
      dir.lane = null;
      // the cut frame: freeze the pose we are leaving, solve the one we are
      // going to, and let the pose price the move (flDirPace).
      if (prev) { dir.fromEye.copy(prev.eye); dir.fromTgt.copy(prev.tgt); }
      dir.t0 = ++cutId;                       // a cut token, so flDirArc solves once
      dir.cut = true; dir.el = 0;
      poseEye(sh.name, 0);
      const e = new THREE.Vector3();
      // the cut frame's own blend is where the crane is solved and where the
      // move is re-priced off the path it will actually fly (flDirArc), so the
      // duration has to be read AFTER it and not off the chord.
      flDirBlendEye(e, dir, F, 0);
      const T = flDirTrans(dir);
      dir.cut = false;
      const samp = [];
      let worst = 1e9, worstW = 0, worstN = 0, len = 0, lift = 0;
      let px = 0, py = 0, pz = 0;
      for (let i = 0; i < NS; i++) {
        const w0 = i / (NS - 1);
        dir.el = w0 * T;
        poseEye(sh.name, flDirU(dir));
        const w = smoothstep(0, 1, w0);
        if (sh.name === 'close' && !arcClose) e.copy(dir.fromEye).lerp(dir.wantEye, w);
        else flDirBlendEye(e, dir, F, w);
        // the aim lerps straight — an arced aim is a swerve — but it does rise
        // with a craning eye (flDirBlendTgt), which is what 40_boot passes
        const tg = _t0;
        if (typeof flDirBlendTgt === 'function') flDirBlendTgt(tg, dir, w);
        else tg.copy(dir.fromTgt).lerp(dir.wantTgt, w);
        const nr = near(e.x, e.y, e.z, tg.x, tg.y, tg.z);
        if (i) len += Math.hypot(e.x - px, e.y - py, e.z - pz);
        px = e.x; py = e.y; pz = e.z;
        // and how much of that height is the crane rather than the path
        if (typeof flDirLift === 'function') lift = Math.max(lift, flDirLift(dir, w));
        const sky = typeof flDirSkyOver === 'function'
          ? flDirSkyOver(F, e.x, e.z, typeof flBrushKnob === 'function' ? flBrushKnob() : 4) : -1e9;
        samp.push({ w: w0, y: +e.y.toFixed(2), d: +nr.d.toFixed(2), n3: nr.n3,
          cov: +nr.cov.toFixed(3), sur: +Math.max(-99, e.y - sky).toFixed(2),
          dy: +nr.dy.toFixed(2) });
        if (nr.d < worst) { worst = nr.d; worstW = w0; worstN = nr.n3; }
      }
      // WHERE THE SHOT LEAVES FROM IS NOT WHERE IT ARRIVED. The hold is where
      // the dolly's chord, the glide's traverse, the establishing crane and
      // every shot's orbit actually happen, so the next transition starts from
      // the pose at the END of the hold. Walking only the transitions and
      // handing the next one the arrival point measures a film nobody watches.
      const from = sh.name;
      dir.el = T + sh.hold * (dir.holdK || 1);
      poseEye(sh.name, flDirU(dir));
      prev = { eye: dir.wantEye.clone(), tgt: dir.wantTgt.clone(), name: sh.name };
      if (pass) {
        // THE HEADLINE IS THE INTERIOR OF THE PATH. Both ends of a transition
        // are POSES, and a pose is allowed to be near tissue — the close-up
        // stands four corolla radii off its subject and the glide enters its
        // own lane. What this file is about is the middle, where nothing was
        // ever solved. [0.12, 0.88] is by eye and is only a reporting window;
        // the whole profile is printed below it either way.
        let iw = 1e9, iwW = 0, iwN = 0, iwY = 0, cov = 0, covW = 0;
        for (const s of samp) {
          if (s.w < 0.12 || s.w > 0.88) continue;
          if (s.d < iw) { iw = s.d; iwW = s.w; iwN = s.n3; iwY = s.dy; }
          if (s.cov > cov) { cov = s.cov; covW = s.w; }
        }
        rows.push({ to: sh.name, from: prevName, T: +T.toFixed(2), worst: +worst.toFixed(2),
          worstW: +worstW.toFixed(2), worstN, len: +len.toFixed(1),
          inner: +iw.toFixed(2), innerW: +iwW.toFixed(2), innerN: iwN, innerY: iwY,
          cov: +cov.toFixed(3), covW: +covW.toFixed(2),
          lift: +lift.toFixed(2), samp });
      }
      prevName = from;
    }
  }
  return { rows, cloud: cloud.length, ns: NS, arcClose,
    holds: FL_DIR_SHOTS.reduce((a, s) => a + s.hold, 0),
    F: { cx: F.cx, cz: F.cz, R: F.R, Rout: F.Rout, hMid: F.hMid, hHi: F.hHi, hTop: F.hTop },
    subj: pick ? { i: pick.i, ai: pick.ai, r: bb.r, c: bb.c } : null,
    vpeak: FL_DIR_VPEAK, trans: FL_DIR_TRANS };
}, [NS, closeArg]);

const f = (x, d = 2) => (x === undefined || x === null ? 'n/a' : (+x).toFixed(d));
console.log(`\nFIELD  cx ${f(out.F.cx, 1)} cz ${f(out.F.cz, 1)}  R ${f(out.F.R, 1)} Rout ${f(out.F.Rout, 1)}  hMid ${f(out.F.hMid, 1)} hTop ${f(out.F.hTop, 1)} hHi ${f(out.F.hHi, 1)}`);
console.log(`       ${out.cloud} drawn points in 3D   subject ${out.subj ? `specimen ${out.subj.i} axis ${out.subj.ai} r ${f(out.subj.r)}` : 'none'}`);
console.log(`       VPEAK ${out.vpeak} u/s, transition clamp [${out.trans.join(', ')}] s`);
console.log(`\nTRANSITIONS — one full rotation, ${NS} samples each; the close-up's entrance modelled as ${out.arcClose ? 'an ARC (flDirBlendEye)' : 'a CHORD (the shipped hold-back)'}`);
console.log('  move               trans  path len  peak u/s   INTERIOR clear (w)   v<3u    ends   fg cover (w)   lift   where that nearest vertex is');
let worstAll = 1e9, nBad = 0, sumT = 0;
for (const r of out.rows) {
  worstAll = Math.min(worstAll, r.inner);
  if (r.inner < 3) nBad++;
  sumT += r.T;
  console.log(`  ${(r.from + ' -> ' + r.to).padEnd(18)} ${f(r.T, 1).padStart(5)}  ${f(r.len, 1).padStart(8)}  ` +
    `${f(1.5 * r.len / r.T, 1).padStart(8)}   ${f(r.inner).padStart(7)} (${f(r.innerW)})` +
    ` ${String(r.innerN).padStart(5)}  ${f(r.worst).padStart(6)}    ` +
    `${f(100 * r.cov, 0).padStart(3)}% (${f(r.covW)})  ${f(r.lift).padStart(5)}  ` +
    `${r.innerY > 0 ? 'below the lens by ' + f(r.innerY, 1) : 'ABOVE the lens by ' + f(-r.innerY, 1)}`);
}
console.log(`\n  WORST INTERIOR over the rotation ${f(worstAll)} units;  ${nBad}/${out.rows.length} transitions pass within 3 units of drawn tissue`);
console.log(`  transitions total ${f(sumT, 1)} s of a rotation that also holds ` +
  `${out.holds} s  ->  ${f(sumT + out.holds, 1)} s per loop`);
console.log('\n  per path: clearance to drawn vertices, eye height, foreground cover,');
console.log('  and MODEL — how far the eye is above what the director\'s own F.solid asks for');
console.log('  (negative = the crane did not clear it; positive with a small clearance = F.solid is blind there)');
for (const r of out.rows) {
  const every = (k, g) => {
    let line = k;
    for (const s of r.samp) if (Math.round(s.w * (out.ns - 1)) % 4 === 0) line += ` ${g(s).padStart(5)}`;
    console.log(line);
  };
  every(`  ${r.to.padEnd(8)}`, s => f(s.d, 1));
  every('    eye y ', s => f(s.y, 1));
  every('    cover ', s => f(100 * s.cov, 0) + '%');
  every('    model ', s => f(s.sur, 1));
}
console.log('');
await b.close();
