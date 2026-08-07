// The organ loop, owned.
//
// This is `App.prototype.drawSpecimen` (70_app.js) with three subtractions and
// one addition. Subtracted: the occlusion cull (there is no director here and
// nothing to clear a sight line for), the microscope (`_watch`/`_replay` — the
// close-up story belongs to the shipped page), and the falling-blade redraw
// (petals never shed today; when they do, this is where it returns). Added:
// `B.beginOrgan/endOrgan` bracketing, so every downstream mesh knows which
// organ it came from, what kind it is, and what its `q` was.
//
// Every emitter called here is the SHIPPED one — blade(), tube(), fruitShell(),
// meristemDome(), laminaCells() — the same argument that keeps the Blender
// bridge honest: this file adds no geometry code, it adds bookkeeping.

// The stand-in App: exactly the property list makeSpecimen + the helpers read
// off `this`. Duplicated deliberately from tools/blender_export.mjs:46 and
// test/views.mjs — a third copy that breaks loudly beats a shared import that
// drifts quietly (their words, kept).
function flEnv(over) {
  return {
    cam: { eye: v3(0, 4, 15), dist: 15, fov: 0.72 },
    viewName: 'natural',
    view: App.prototype.view,
    setBladeLOD: App.prototype.setBladeLOD,
    bladeMesh: App.prototype.bladeMesh,
    bladeMU: 22, bladeMV: 10, bladeRef: 4.3,
    detail: 0, t: 12000,
    _watch: null, _replay: null,
    showMeristem: true,
    ringWidth: 0, windU: undefined, senesceHeld: false,
    _mesh: [0, 0],
    ...over,
  };
}

function flDrawSpecimen(env, B, S) {
  const pal = S.pal;
  const V = env.view();
  const cpal = V.cellPal ? { ...pal, ...V.cellPal } : pal;
  for (let ai = 0; ai < S.plant.axes.length; ai++) {
    const ax = S.plant.axes[ai];
    const nseg = ax.pts.length;
    if (nseg > 1) {
      B.beginOrgan({ kind: 'stem', ax: ai, floral: !!ax.floral, gen: ax.gen });
      if (V.stemSolid) {
        tube(B, ax.pts, ax.radii, 7, (t) => ({
          c: [lerp(pal.stem0[0], pal.stem1[0], t), lerp(pal.stem0[1], pal.stem1[1], t), lerp(pal.stem0[2], pal.stem1[2], t)],
          e: t > 0.93 && ax.alive ? (t - 0.93) * 5.0 * pal.glow : 0,
        }));
      } else {
        stemRibbon(B, ax.pts, ax.radii, pal.stem1, V.stem);
      }
      B.endOrgan();
    }
    for (let oi = 0; oi < ax.organs.length; oi++) {
      const org = ax.organs[oi];
      if (org.len < 0.02) continue;
      if (org.shed) continue;               // petals do not fall (yet); leaves that do are the page's story
      const oFr = org.frame;
      const L = org.leaf;
      const sen = org.sen || 0;
      const kind = org.petal ? 'petal' : org.floral ? 'inner' : 'leaf';
      B.beginOrgan({ kind, ax: ai, org: oi, q: org.q || 0, sen, dev: org.dev || 0, len: org.len });
      // petiole — the stalk on screen is the stalk in the solver (ROADMAP 5)
      const a = oFr.o;
      const pt = petioleOf(org);
      const pet = pt.len;
      const b = v3(a[0] + oFr.x[0] * pet, a[1] + oFr.x[1] * pet, a[2] + oFr.x[2] * pet);
      let petC = pal.stem1;
      if (sen > 0) {
        senesceTint(_petC, pal.stem1[0], pal.stem1[1], pal.stem1[2], sen * 0.85);
        petC = _petC;
      }
      if (V.stemSolid) tube(B, [a, b], [pt.r0, pt.r1], 5, () => ({ c: petC, e: 0 }));
      else stemRibbon(B, [a, b], [pt.r0, pt.r1], petC, V.stem);
      if (!L || !L.margin || !L.margin.mature) { B.endOrgan(); continue; }
      const fr = { o: b, x: oFr.x, y: oFr.y, z: oFr.z };
      const dev = clamp((org.dev || 0) * 1.06 - 0.03, 0, 1);
      const bl = drawnBladeLen(org.len, sen);
      if (bl < 0.02) { B.endOrgan(); continue; }
      const bp = org.petal ? S.petalPal
        : org.floral ? S.innerPals[clamp(
          Math.round(((org.q - S.sp.petalQ) / Math.max(1e-3, 1 - S.sp.petalQ)) * (INNER_STEPS - 1)),
          0, INNER_STEPS - 1)]
          : pal;
      const curl = -bl * (org.petal ? 0.05 : 0.16) * (1 + sen * 2.2);
      const ripple = bl * 0.014;
      const mesh = env.bladeMesh(L, bl, 0, env._mesh);
      blade(B, L, fr, bl, bl, bp, curl, ripple, bp.glow, mesh[0], mesh[1], dev,
        1, sen, { surface: V.lamina > 0, veinMul: V.veins });
      if (V.cells > 0 || V.needles > 0.004) {
        laminaCells(B, L, fr, bl, bl, cpal, curl, ripple, env.t, V.needles, dev,
          sen, { cells: V.cells > 0 ? 1 : 0 });
      }
      B.endOrgan();
    }
    if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
      const n2 = ax.pts.length;
      const tip = ax.pts[n2 - 1];
      const fs = S.sp.fruitScale * (ax.gen === 0 ? 1 : 0.72);
      B.beginOrgan({ kind: 'fruit', ax: ai, phase: ax.fruit.phase, tip });
      if (V.fruitSolid) fruitShell(B, ax.fruit, tip, fs, pal);
      else fruitCells(B, ax.fruit, tip, fs, cpal, V.needles, V.ripeTint);
      B.endOrgan();
    }
    if (env.showMeristem && ax.alive && ax.meristem) {
      const n = ax.pts.length;
      const tip = ax.pts[n - 1];
      const prev = ax.pts[Math.max(0, n - 2)];
      const dir = v3(); v3norm(dir, v3sub(dir, tip, prev));
      if (!isFinite(dir[0]) || v3len(dir) < 0.5) v3set(dir, 0, 1, 0);
      let refv = v3(0, 0, 1);
      if (Math.abs(dir[2]) > 0.9) refv = v3(1, 0, 0);
      const e1 = v3(); v3norm(e1, v3cross3(e1, refv, dir));
      const e2 = v3(); v3norm(e2, v3cross3(e2, dir, e1));
      const mScale = Math.max(0.35, ax.radii[n - 1] * 5.5);
      const dEye = Math.hypot(env.cam.eye[0] - tip[0], env.cam.eye[1] - tip[1], env.cam.eye[2] - tip[2]);
      const det = smoothstep(0.030, 0.105, mScale / Math.max(0.01, dEye));
      B.beginOrgan({ kind: 'meristem', ax: ai });
      meristemDome(B, ax.meristem, { o: tip, x: dir, y: e2, z: e1 },
        mScale, cpal, env.t, Math.max(det, V.needles) * V.meristem);
      B.endOrgan();
    }
  }
}
