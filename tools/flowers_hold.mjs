// WHAT DOES THE CAMERA STAND IN DURING A HOLD?
//
//   node tools/flowers_hold.mjs 'garden=7&seed=21&ff=3000&speed=0'
//
// tools/flowers_trans.mjs measures the MOVE between two shots, on the argument
// that a pose is solved and the middle of a transition is not. That argument has
// a hole in it, and the hole is the dolly: a "pose" that TRAVELS is not one
// point, it is a chord, and only one point of that chord was ever solved
// against anything. The dolly rides `+-0.95 R` of lateral travel at a standoff
// picked as `max(1.25 R + 4, 1.45 hTop)` — a fraction of the field's radius,
// which is the same class of stated number that flDirPoseLow's standoff was
// before flDirClearance replaced it. On ?garden=7&seed=21 that puts the eye
// forty units from the middle with an Ember Creeper arm reaching past it, and
// the film shows an eighteen-second wall of out-of-focus blade with the subject
// in one corner (shots/final21/f040.png, f045.png).
//
// So this walks the HOLD rather than the transition. For every shot in one full
// rotation it steps the dwell — the pose re-solved every sample, exactly as
// 40_boot re-solves it every frame, so the dolly's travel, the glide's traverse,
// the establishing crane and every shot's orbit all happen — and reports the
// same three numbers flowers_trans reports about a move: clearance to drawn
// vertices, foreground cover, and how much of the frame has any ink in it.
//
// ⚠ IT MEASURES THE POSE AND NOT THE CAMERA. 40_boot damps the camera 12% of the
// way to the want each frame, so the first fraction of a second of a hold is
// still arriving. Over an 18 s dwell that is a rounding error, and the pose is
// the thing this file is about — but a hold whose FIRST sample is the worst one
// is reporting the transition's arrival, not the dwell.
//
// ⚠ AND ONE ROTATION IS ONE BEARING, WHICH IS THE TRAP THIS FILE FELL INTO ON
// ITS FIRST RUN. flDirClock walks the heading jitter by the golden angle at
// every cut and flips the end at every cut, so the dolly stands somewhere
// different on every pass through the list and never repeats. Measured over one
// rotation the dolly's hold at ?garden=7&seed=21 has a worst clearance of 12.9
// units and 12% cover — a clean shot — while the film of the same build and the
// same seed is a wall of blade for most of the dwell (shots/final21/f040.png).
// Both are true: they are different bearings. So this walks ROTATIONS, and the
// answer is a distribution rather than a number.
//
// THE CLOUD, the rasteriser and the GL recipe are flowers_trans.mjs's, verbatim,
// for the reason that file gives: the drawn vertex buffer is the width of a
// blade and every model of one is optimistic.
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import { platform } from 'os';

// TWO MODES, AND THE SECOND ONE IS THE ARBITER.
//
//   node tools/flowers_hold.mjs 'garden=7&seed=21&ff=3000&speed=0' 17 8
//   node tools/flowers_hold.mjs 'garden=7&seed=21&ff=3000'  live 200
//
// The first RECONSTRUCTS: it drives the shipped pose functions with the shot
// clock's own per-cut state, which is fast, repeatable and answers "what would
// this shot be from that bearing". The second WATCHES: it lets the page run and
// samples the camera the renderer is actually using, twice a second, against the
// cloud as it stands at that moment — camera position, camera orientation,
// uFocus and uRange all read out of the live scene rather than modelled. It
// costs one wall-clock second per second of film and it is the only one of the
// two that can be wrong about nothing.
//
// The first run of the reconstruction called the dolly clean at ?garden=7&seed=21
// while the film of the same build was a wall, so the two disagreeing is not
// hypothetical. Where they disagree, the live mode is the one to believe.
const [, , query = 'garden=7&seed=21&ff=3000&speed=0', nsArg = '17', rotArg = '8'] = process.argv;
const LIVE = nsArg === 'live' ? Math.max(10, +rotArg || 200) : 0;
const NS = Math.max(5, +nsArg || 17);
const ROT = Math.max(1, +rotArg || 8);
// ⚠ THE TRIANGLE STRIDE IS A CONTROL, NOT A PERFORMANCE SETTING. Coverage is
// measured off a subsample of the drawn triangles, so a coarser stride can only
// under-report. FLSKIP= sweeps it, and it is swept rather than assumed: the
// vertex-sampling version of this metric moved 14% -> 23% -> more as its budget
// grew, which is what sent it to a triangle raster. If the answer moves with
// this knob, the answer is about the knob.
const SKIP = Math.max(1, +process.env.FLSKIP || 4);
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
  const deadline = Date.now() + 300000;
  for (;;) {
    const hud = await pg.evaluate(() => document.getElementById('hud').textContent);
    if (!hud.includes('(fast-forward')) break;
    if (Date.now() > deadline) { console.error('TIMEOUT'); await b.close(); process.exit(1); }
    await pg.waitForTimeout(500);
  }
}
await pg.waitForTimeout(2000);

// ONE RASTERISER, INJECTED ONCE AND USED BY BOTH MODES, because the two
// numbers this file prints have to be the same number.
//
// ⚠ AND IT RASTERISES TRIANGLES RATHER THAN SAMPLING VERTICES, WHICH IS THE
// SECOND TRAP THIS FILE FELL INTO. flowers_trans.mjs marks a frame cell when a
// subsampled VERTEX lands in it, and that is fine for the question it asks
// (how close does the eye come to anything). Asked instead what FRACTION of the
// picture a near blade covers, it undercounts, and it undercounts by an amount
// that depends on the sampler: run as a control on ?garden=7&seed=21, the
// dolly's blur wall reads 14% at a 15k-point cloud, 23% at 60k and was still
// climbing at 240k. A number that moves with its own budget is a number about
// the budget.
//
// A triangle covers its own screen area whether it was sampled or not, so
// filling each sampled triangle's NDC BOUNDING BOX converges in the count of
// triangles rather than in the count of vertices. The bbox over-states a thin
// diagonal triangle and a lamina is made of many small ones, so on a 32 x 20
// grid the two errors are both under a cell.
await pg.evaluate(() => {
  const GX = 32, GY = 20;
  const all = new Uint8Array(GX * GY), zmin = new Float64Array(GX * GY);
  const _v = new THREE.Vector4();
  const nx = new Float64Array(3), ny = new Float64Array(3);
  // THE WALL, AND ITS THRESHOLD IS THE SHIPPED LENS RATHER THAN A FRACTION.
  // flowers_trans.mjs calls a cell foreground when something lands in it nearer
  // than HALF the eye-to-subject distance, and its own comment says the half is
  // by eye. On the dolly that reports a clean frame for unreadable mush: the
  // focal distance is ~40 units and the plants that fill it stand 21 to 28 away,
  // nearer than the subject and further than half of it.
  //
  // The lens says exactly where the line is. 40_boot sets uFocus to the
  // camera-to-target distance and uRange to max(min, k*focal) per shot, and the
  // defocus pass blurs by |z - uFocus| / uRange — so anything nearer than
  // uFocus - uRange is at or past FULL blur. `blur` is the fraction of frame
  // cells whose NEAREST drawn surface is inside that band: the frontmost thing
  // there is unreadable and it hides whatever is behind it. That is the picture
  // a viewer calls a wall, and both of its numbers are the renderer's own.
  window.__wallStats = (ex, ey, ez, mv, fd, rng, skip) => {
    all.fill(0); zmin.fill(1e18);
    let d2 = 1e18;
    const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      const xs = [ax, bx, cx], ys = [ay, by, cy], zs = [az, bz, cz];
      let lo = 1e18;
      for (let i = 0; i < 3; i++) {
        const dx = xs[i] - ex, dy = ys[i] - ey, dz = zs[i] - ez;
        const q = dx * dx + dy * dy + dz * dz;
        if (q < lo) lo = q;
        _v.set(xs[i], ys[i], zs[i], 1).applyMatrix4(mv);
        if (_v.w <= 0) return;                 // any vertex behind the lens: skip
        nx[i] = _v.x / _v.w; ny[i] = _v.y / _v.w;
      }
      if (lo < d2) d2 = lo;
      let x0 = Math.min(nx[0], nx[1], nx[2]), x1 = Math.max(nx[0], nx[1], nx[2]);
      let y0 = Math.min(ny[0], ny[1], ny[2]), y1 = Math.max(ny[0], ny[1], ny[2]);
      if (x1 < -1 || x0 > 1 || y1 < -1 || y0 > 1) return;
      x0 = Math.max(-1, x0); x1 = Math.min(1, x1);
      y0 = Math.max(-1, y0); y1 = Math.min(1, y1);
      const i0 = Math.min(GX - 1, ((x0 + 1) * 0.5 * GX) | 0);
      const i1 = Math.min(GX - 1, ((x1 + 1) * 0.5 * GX) | 0);
      const j0 = Math.min(GY - 1, ((1 - y1) * 0.5 * GY) | 0);
      const j1 = Math.min(GY - 1, ((1 - y0) * 0.5 * GY) | 0);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const c = j * GX + i;
          all[c] = 1;
          if (lo < zmin[c]) zmin[c] = lo;
        }
      }
    };
    for (const s of window.__fl.garden) {
      if (!s.B) continue;
      const B = s.B;
      // tri: 10 floats a vertex, 3 vertices a triangle
      for (let k = 0, t = 0; k + 30 <= B.triN; k += 30 * skip, t++) {
        tri(B.tri[k], B.tri[k + 1], B.tri[k + 2],
          B.tri[k + 10], B.tri[k + 11], B.tri[k + 12],
          B.tri[k + 20], B.tri[k + 21], B.tri[k + 22]);
      }
      // petb: 16 floats a vertex, 3 a triangle
      for (let k = 0; k + 48 <= B.petbN; k += 48 * skip) {
        tri(B.petb[k], B.petb[k + 1], B.petb[k + 2],
          B.petb[k + 16], B.petb[k + 17], B.petb[k + 18],
          B.petb[k + 32], B.petb[k + 33], B.petb[k + 34]);
      }
      // seg: 12 floats a vertex, a ribbon. A vein ribbon is a hair on screen, so
      // it is marked as a degenerate triangle on one vertex rather than filled.
      for (let k = 0; k + 12 <= B.segN; k += 12 * skip) {
        tri(B.seg[k], B.seg[k + 1], B.seg[k + 2],
          B.seg[k], B.seg[k + 1], B.seg[k + 2],
          B.seg[k], B.seg[k + 1], B.seg[k + 2]);
      }
    }
    const soft = fd - rng, s2 = soft * soft;
    let ink = 0, blur = 0;
    for (let i = 0; i < all.length; i++) {
      if (!all[i]) continue;
      ink++;
      if (zmin[i] < s2) blur++;
    }
    return { d: Math.sqrt(d2), ink: ink / (GX * GY), blur: blur / (GX * GY) };
  };
});

if (LIVE) {
  // THE FILM, SAMPLED. Nothing here is reconstructed: the camera's own world
  // matrix, its own projection, and the two lens uniforms the defocus pass
  // reads. The cloud is rebuilt at every sample because the field grows while
  // the film runs, which is half the question.
  await pg.evaluate((SKIP) => {
    window.__wall = { rows: [] };
    const fl = window.__fl;
    const _mv = new THREE.Matrix4();
    window.__wallSample = () => {
      const cam = fl.scene.camera, st = fl.state();
      cam.updateMatrixWorld();
      _mv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      // the SHIPPED lens, read out of the uniforms rather than modelled
      const fd = fl.scene.compU.uFocus.value, rng = fl.scene.compU.uRange.value;
      const r = window.__wallStats(cam.position.x, cam.position.y, cam.position.z,
        _mv, fd, rng, SKIP);
      const F = flDirField(fl.garden);
      // ⚠ THE DIRECTOR'S OWN SCORE, ASKED OF THE POSE THE DIRECTOR CHOSE. This
      // is the control on flDirDollySolve: if the raster says 83% of the frame
      // is unreadable while flDirFrameLoad says the pose is empty, then the solve
      // is not wrong about which bearing is best — its RULER is wrong, and no
      // amount of searching with it will help.
      const tg = new THREE.Vector3().fromArray(st.target);
      const fr = typeof flDirFrameLoad === 'function'
        ? flDirFrameLoad(F, cam.position.x, cam.position.y, cam.position.z,
          tg.x, tg.y, tg.z, 1.06, 0.752, 0) : { blur: -160, ink: 0 };
      const load = fr.blur / 160, dink = fr.ink / 160;   // 16 x 10 cells
      window.__wall.rows.push({ t: +(performance.now() / 1000).toFixed(1), shot: st.shot,
        load: +load.toFixed(4), dink: +dink.toFixed(4), nsolid: F.solid.length,
        el: +st.el.toFixed(1), step: st.step, d: +r.d.toFixed(2),
        fd: +fd.toFixed(1), rng: +rng.toFixed(1),
        // ⚠ WHERE THE EYE ACTUALLY IS, because the reconstruction above and this
        // mode once disagreed by a factor of two on a purely geometric number
        // and neither of them could be checked against the other without it.
        // `D` is the eye's distance from the field's own middle — the one number
        // both modes print — and `gd` is the geometric eye-to-target distance,
        // which is what uFocus should equal once a shot has settled.
        D: +Math.hypot(cam.position.x - F.cx, cam.position.z - F.cz).toFixed(1),
        gd: +cam.position.distanceTo(new THREE.Vector3().fromArray(st.target)).toFixed(1),
        R: +F.R.toFixed(1), Rout: +F.Rout.toFixed(1), hTop: +F.hTop.toFixed(1),
        ink: +r.ink.toFixed(3), blur: +r.blur.toFixed(3) });
    };
    window.__wallTimer = setInterval(window.__wallSample, 500);
  }, SKIP);
  process.stdout.write(`watching ${LIVE}s of film`);
  for (let i = 0; i < LIVE; i += 10) {
    await pg.waitForTimeout(10000);
    process.stdout.write('.');
  }
  console.log('');
  const w = await pg.evaluate(() => { clearInterval(window.__wallTimer); return window.__wall.rows; });
  const f2 = (x, d = 2) => (+x).toFixed(d);
  const byShot = {};
  for (const r of w) (byShot[r.shot] = byShot[r.shot] || []).push(r);
  console.log(`\nLIVE — ${w.length} samples over ${LIVE}s, camera and lens read out of the running page`);
  // ⚠ A HOLE IS THE OTHER FAILURE AND IT IS COUNTED HERE. Minimising the wall
  // alone has its optimum pointing out of the stand, and the first version of
  // flDirDollySolve found one — several seconds of empty fog. `ink` is the
  // fraction of frame cells holding any drawn surface at any depth; under 15% is
  // a frame with nothing in it. 15% is by eye and is a REPORTING threshold, the
  // same category as the 50% that calls a frame a wall.
  console.log('  shot        samples   step range      focal    clearance min/med    BLUR WALL med / MAX    wall (>=50%)    ink med / MIN    HOLE (<15%)');
  for (const k of Object.keys(byShot)) {
    const rs = byShot[k];
    const md = (a) => { const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
    const bl = rs.map(r => r.blur), dd = rs.map(r => r.d);
    const wall = rs.filter(r => r.blur >= 0.5).length;
    const nk = rs.map(r => r.ink);
    const hole = rs.filter(r => r.ink < 0.15).length;
    console.log(`  ${(k || '(none)').padEnd(10)} ${String(rs.length).padStart(6)}   ` +
      `${rs[0].step}-${rs[rs.length - 1].step}`.padStart(12) + `  ${f2(md(rs.map(r => r.fd)), 0).padStart(6)}   ` +
      `${f2(Math.min(...dd)).padStart(7)} /${f2(md(dd)).padStart(7)}   ` +
      `${f2(100 * md(bl), 0).padStart(7)}% /${f2(100 * Math.max(...bl), 0).padStart(4)}%   ${String(wall).padStart(4)}/${rs.length}` +
      `   ${f2(100 * md(nk), 0).padStart(5)}% /${f2(100 * Math.min(...nk), 0).padStart(4)}%   ${String(hole).padStart(4)}/${rs.length}`);
  }
  const wl = w.filter(r => r.blur >= 0.5);
  const hl = w.filter(r => r.ink < 0.15);
  console.log(`\n  WALL over the whole film: ${wl.length}/${w.length} samples (${f2(100 * wl.length / w.length, 1)}%)`);
  console.log(`  HOLE over the whole film: ${hl.length}/${w.length} samples (${f2(100 * hl.length / w.length, 1)}%)`);
  const dl = w.filter(r => r.shot === 'dolly');
  if (dl.length) {
    console.log(`  the dolly's own dwell: wall ${dl.filter(r => r.blur >= 0.5).length}/${dl.length}, ` +
      `hole ${dl.filter(r => r.ink < 0.15).length}/${dl.length}`);
    console.log('\n  every dolly sample:  el / standoff from the middle / clearance / focal (geometric) / blur');
    for (const r of dl) {
      console.log(`    el ${f2(r.el, 1).padStart(5)}  step ${String(r.step).padStart(5)}  D ${f2(r.D, 1).padStart(6)}` +
        `  clear ${f2(r.d, 1).padStart(6)}  focus ${f2(r.fd, 1).padStart(6)}/${f2(r.gd, 1).padStart(6)}` +
        `  rng ${f2(r.rng, 1).padStart(5)}  R ${f2(r.R, 1).padStart(5)} Rout ${f2(r.Rout, 1).padStart(5)}` +
        `  blur ${(f2(100 * r.blur, 0) + '%').padStart(5)}  ink ${(f2(100 * r.ink, 0) + '%').padStart(5)}  solve blur/ink ${(f2(100 * r.load, 0) + '%').padStart(5)}/${(f2(100 * r.dink, 0) + '%').padStart(5)}`);
    }
  }
  console.log('');
  await b.close();
  process.exit(0);
}

const out = await pg.evaluate(([NS, ROT, SKIP]) => {
  const fl = window.__fl, cam = fl.scene.camera;
  const specs = fl.garden;
  const F = flDirField(specs);

  const _cm = cam.clone(), _tg = new THREE.Vector3(), _mv = new THREE.Matrix4();
  const near = (x, y, z, tx, ty, tz, plan) => {
    _cm.position.set(x, y, z);
    _tg.set(tx, ty, tz);
    _cm.lookAt(_tg);
    _cm.updateMatrixWorld();
    _mv.multiplyMatrices(_cm.projectionMatrix, _cm.matrixWorldInverse);
    const fd = Math.hypot(tx - x, ty - y, tz - z);
    const rng = Math.max(plan.min, fd * plan.k);
    const r = window.__wallStats(x, y, z, _mv, fd, rng, SKIP);
    return { d: r.d, ink: r.ink, blur: r.blur, fd, rng };
  };

  // 40_boot's flowerScore, second copy — same warning as flowers_trans.mjs
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

  // ⚠ A THIRD COPY OF SOMETHING 40_boot OWNS, and the same warning as the score
  // above: these are the per-shot lens plans out of flBoot's updateFraming, and
  // if they change there this table is the suspect.
  const DOF = { wide: { k: 0.55, min: 6.0 }, bank: { k: 0.42, min: 3.0 },
    glide: { k: 0.22, min: 1.5 }, dolly: { k: 0.35, min: 1.5 },
    close: { k: 0.22, min: 0.4 }, low: { k: 0.45, min: 3.0 } };

  let cutId = 0;
  const dir = flDirMake();
  flDirLens(dir, cam);
  const pick = flDirPick(specs, cam.position, scoreAxis, F, fl.pollen);
  const bb = pick ? specs[pick.i].B.floralBounds(pick.ai) : null;
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

  const rows = [];
  let prev = null;
  for (let pass = 0; pass < 1 + ROT; pass++) {
    for (let k = 0; k < FL_DIR_SHOTS.length; k++) {
      const sh = FL_DIR_SHOTS[k];
      dir.shot = k;
      dir.ang = (dir.ang + 2.39996323) % TAU;
      dir.flip = dir.flip ? 0 : Math.PI;
      dir.jit = (dir.ang / TAU - 0.5) * 1.0;
      dir.spin = dir.jit >= 0 ? 1 : -1;
      dir.holdK = 1;
      dir.lane = null;
      if (prev) { dir.fromEye.copy(prev.eye); dir.fromTgt.copy(prev.tgt); }
      dir.t0 = ++cutId;
      dir.cut = true; dir.el = 0;
      poseEye(sh.name, 0);
      const e = new THREE.Vector3();
      flDirBlendEye(e, dir, F, 0);
      const T = flDirTrans(dir);
      dir.cut = false;
      // THE HOLD, and it is the whole point of this file: elapsed from the end
      // of the transition to the cut. The pose is re-solved at every sample, so
      // whatever the shot does while it is held is what gets measured.
      const H = sh.hold * (dir.holdK || 1);
      const samp = [];
      let px = 0, pz = 0, py = 0, travel = 0;
      for (let i = 0; i < NS; i++) {
        const v = i / (NS - 1);
        dir.el = T + v * H;
        poseEye(sh.name, flDirU(dir));
        const nr = near(dir.wantEye.x, dir.wantEye.y, dir.wantEye.z,
          dir.wantTgt.x, dir.wantTgt.y, dir.wantTgt.z, DOF[sh.name] || DOF.bank);
        if (i) travel += Math.hypot(dir.wantEye.x - px, dir.wantEye.y - py, dir.wantEye.z - pz);
        px = dir.wantEye.x; py = dir.wantEye.y; pz = dir.wantEye.z;
        samp.push({ v, d: +nr.d.toFixed(2), fd: +nr.fd.toFixed(1),
          ink: +nr.ink.toFixed(3), blur: +nr.blur.toFixed(3),
          D: +Math.hypot(dir.wantEye.x - F.cx, dir.wantEye.z - F.cz).toFixed(1),
          fd: +Math.hypot(dir.wantTgt.x - dir.wantEye.x, dir.wantTgt.y - dir.wantEye.y,
            dir.wantTgt.z - dir.wantEye.z).toFixed(1) });
      }
      dir.el = T + H;
      poseEye(sh.name, flDirU(dir));
      prev = { eye: dir.wantEye.clone(), tgt: dir.wantTgt.clone() };
      if (pass) {
        let worst = 1e9, worstV = 0, ink = 1, bpk = 0, bpkV = 0;
        let sb = 0, nWall = 0;
        for (const s of samp) {
          if (s.d < worst) { worst = s.d; worstV = s.v; }
          if (s.blur > bpk) { bpk = s.blur; bpkV = s.v; }
          if (s.ink < ink) ink = s.ink;
          sb += s.blur;
          // A WALL, stated the way a viewer meets it and counted the way the
          // film was read: fully-blurred near foliage over half the frame. It is
          // a REPORTING number — nothing in the director reads it.
          if (s.blur >= 0.5) nWall++;
        }
        rows.push({ name: sh.name, rot: pass, T: +T.toFixed(1), hold: +H.toFixed(1),
          travel: +travel.toFixed(1), worst: +worst.toFixed(2), worstV: +worstV.toFixed(2),
          blur: +bpk.toFixed(3), blurV: +bpkV.toFixed(2), meanBlur: +(sb / samp.length).toFixed(3),
          ink: +ink.toFixed(3), wall: nWall, n: samp.length, samp });
      }
    }
  }
  let ntri = 0;
  for (const s of specs) if (s.B) ntri += (s.B.triN / 30 + s.B.petbN / 48 + s.B.segN / 12) / SKIP;
  return { rows, tri: Math.round(ntri), ns: NS, rot: ROT,
    F: { cx: F.cx, cz: F.cz, R: F.R, Rout: F.Rout, hMid: F.hMid, hHi: F.hHi, hTop: F.hTop },
    subj: pick ? { i: pick.i, ai: pick.ai, r: bb.r, c: bb.c } : null,
    step: fl.state ? (fl.state().step || 0) : 0,
    brush: typeof flBrushKnob === 'function' ? flBrushKnob() : null };
}, [NS, ROT, SKIP]);

const f = (x, d = 2) => (x === undefined || x === null ? 'n/a' : (+x).toFixed(d));
console.log(`\nFIELD  cx ${f(out.F.cx, 1)} cz ${f(out.F.cz, 1)}  R ${f(out.F.R, 1)} Rout ${f(out.F.Rout, 1)}  hMid ${f(out.F.hMid, 1)} hTop ${f(out.F.hTop, 1)} hHi ${f(out.F.hHi, 1)}`);
console.log(`       ${out.tri} drawn primitives rasterised (stride ${SKIP})   brush ${f(out.brush, 1)}   subject ${out.subj ? `specimen ${out.subj.i} axis ${out.subj.ai} r ${f(out.subj.r)}` : 'none'}`);
console.log(`\nHOLDS — ${out.rot} rotations (each a fresh bearing: the jitter walks by the golden angle), ${out.ns} samples across each dwell`);
console.log('  shot      hold  eye travel    standoff       worst clear: min / med   BLUR WALL mean: med / MAX   least ink   wall samples (blur>=50%)');
const names = [];
for (const r of out.rows) if (!names.includes(r.name)) names.push(r.name);
const med = (a) => { const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
for (const nm of names) {
  const rs = out.rows.filter(r => r.name === nm);
  const w = rs.map(r => r.worst), bl = rs.map(r => r.meanBlur);
  let wall = 0, n = 0, d0 = 0, d1 = 0, tr = 0, ink = 1;
  for (const r of rs) {
    wall += r.wall; n += r.n; tr += r.travel;
    d0 += r.samp[0].D; d1 += r.samp[r.samp.length - 1].D;
    ink = Math.min(ink, r.ink);
  }
  console.log(`  ${nm.padEnd(8)} ${f(rs[0].hold, 1).padStart(5)}  ${f(tr / rs.length, 1).padStart(8)}   ` +
    `${f(d0 / rs.length, 1).padStart(5)}->${f(d1 / rs.length, 1).padStart(5)}   ` +
    `${f(Math.min(...w)).padStart(7)} / ${f(med(w)).padStart(6)}   ` +
    `${f(100 * med(bl), 0).padStart(4)}% / ${f(100 * Math.max(...bl), 0).padStart(3)}%   ` +
    `${f(100 * ink, 0).padStart(4)}%   ${String(wall).padStart(4)}/${n}`);
}
console.log('\n  THE DOLLY, ROTATION BY ROTATION — its chord is the thing no pose solve ever saw');
console.log('    rot   standoff  travel   worst clear (v)   blur wall mean / peak (v)   wall');
for (const r of out.rows.filter(x => x.name === 'dolly')) {
  console.log(`    ${String(r.rot).padStart(3)}   ${f(r.samp[0].D, 1).padStart(5)}->${f(r.samp[r.samp.length - 1].D, 1).padStart(5)}  ` +
    `${f(r.travel, 1).padStart(6)}   ${f(r.worst).padStart(7)} (${f(r.worstV)})   ` +
    `${f(100 * r.meanBlur, 0).padStart(8)}% / ${f(100 * r.blur, 0).padStart(3)}% (${f(r.blurV)})   ${String(r.wall).padStart(2)}/${r.n}`);
}
{
  const worstRot = out.rows.filter(x => x.name === 'dolly')
    .reduce((a, r) => (a && a.meanBlur >= r.meanBlur ? a : r), null);
  console.log(`\n  the worst of them (rotation ${worstRot.rot}), sample by sample across its own chord:`);
  const every = (k, g) => {
    let line = k;
    for (const s of worstRot.samp) line += ` ${g(s).padStart(5)}`;
    console.log(line);
  };
  every('    v      ', s => f(s.v, 2));
  every('    clear  ', s => f(s.d, 1));
  every('    BLUR   ', s => f(100 * s.blur, 0) + '%');
  every('    ink    ', s => f(100 * s.ink, 0) + '%');
  every('    stand  ', s => f(s.D, 0));
}
let wall = 0, n = 0, dw = 0, dn = 0;
for (const r of out.rows) {
  wall += r.wall; n += r.n;
  if (r.name === 'dolly') { dw += r.wall; dn += r.n; }
}
console.log(`\n  BLUR WALL over every hold in ${out.rot} rotations: ${wall}/${n} samples (${f(100 * wall / n, 1)}%) with near foliage over half the frame`);
console.log(`  of which the DOLLY is ${dw}/${dn} (${f(100 * dw / dn, 1)}% of its own dwell)`);
console.log('');
await b.close();
