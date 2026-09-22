// ---------------------------------------------------------------------------
// THE BENCH: the shipped App with a person's hands in place of the director.
//
// Everything that draws a plant is the shipped code — `makeSpecimen`, the
// renderer, the one `drawSpecimen` every view reads — so the plant on this page
// is the plant on the main page, grown under a different program. What is added
// here is the three instruments and what they need: picking a stem out of the
// frame, a cut branch that falls, a lamp that is somewhere, and the auxin
// stream drawn so a person can watch it drain.
// ---------------------------------------------------------------------------

const _tbA = v3(), _tbB = v3(), _tbC = v3(), _tbD = v3(), _tbE = v3();
const _tbP = m4(), _tbV = m4(), _tbVP = m4();
const TB_UP = v3(0, 1, 0);
// Gravity in world units per plant-time step squared: the same two exchange
// rates the falling blade uses, so a cut branch falls through the same world a
// shed leaf does. (9.81 m/s^2, 0.0625 m/unit, 125 steps/s.)
const TB_G = WORLD.gEarth / WORLD.unitM / (WORLD.ptPerSec * WORLD.ptPerSec);
const TB_LAMP = [1.0, 0.76, 0.48];     // the lamp's colour, #ffc27a-ish in linear

// A palette with every colour scaled — how a cutting that has lain on the
// ground for a while fades without anything being drawn differently.
function tbFadePal(p, v) {
  const o = { ...p };
  for (const k of ['blade0', 'blade1', 'vein', 'veinTint', 'stem0', 'stem1', 'petal0',
    'petal1', 'petalVein', 'fruit0', 'fruit1', 'spark', 'pin', 'cell0', 'cell1']) {
    if (Array.isArray(p[k])) o[k] = p[k].map(x => x * v);
  }
  o.glow = (p.glow || 1) * v;
  return o;
}

class TendApp extends App {
  constructor(canvas) {
    super(canvas, null);
    this.tool = 'look';
    // THE LAMP. Environment, in the category of the wind: it says where light
    // comes from and never what grows toward it. `power` is in world units
    // squared — the distance at which its irradiance is 1 is sqrt(power).
    this.lamp = { pos: v3(7, 8, 6), power: 90, on: false };
    // The simulation reads a COMMITTED copy of the lamp, not the one under the
    // pointer. The pointer moves between steps at whatever rate the browser
    // delivers events; the copy only moves inside `step`, in quantised jumps that
    // are written to the record — so a shared link replays the exact light the
    // plant grew toward, step for step. See `_commitLamp`.
    this.simLamp = { pos: v3(7, 8, 6), power: 90, on: false };
    this.plant.light = this.simLamp;
    this.cuttings = [];
    this.hover = null;
    this.hoverStump = null;
    this.flashes = [];
    this.trials = { light: null, cut: null, paste: null };
    this.results = { light: '', stream: '', cut: '', paste: '' };
    this.showStream = true;
    this.glowGain = 0.10;
    this.stemGlow = (ax, t) => this._glowAt(ax, t);
    this.userDriving = true;
    this.zoom = 1;
    this.speedMul = 1;
    this.cam.el = 0.16; this.cam.az = 0.55;
    this.onEvent = null;     // the page's hook for anything worth saying
  }

  program(name, sp) { return tendProgram(name, sp); }

  newSpecimen(name = this.speciesName, seed = (Math.random() * 1e6) | 0) {
    if (TEND_SPECIES.indexOf(name) < 0) name = TEND_SPECIES[0];
    super.newSpecimen(name, seed);
    this.seed = seed;
    if (this.simLamp) this.plant.light = this.simLamp;
    this.cuttings = [];
    this.flashes = [];
    this.hover = null; this.hoverStump = null;
    this.bbS = null;
    if (this.trials) {
      this.trials = { light: null, cut: null, paste: null };
      this.results = { light: '', stream: '', cut: '', paste: '' };
      if (this.lamp && this.lamp.on) this._startLightTrial();
    }
  }

  // --------------------------------------------------------------------------
  step(dtms) {
    // step count follows real time, 125 steps a second at 1x, the same clock
    // the main page and the falling blade run on. For a moment after a cut the
    // clock is slowed, because at 1x the drain crosses a whole plant in about a
    // second; the page says so when it does it, and nothing in the simulation
    // knows — it is the same steps, fewer per frame.
    let speed = this.speedMul;
    if (this.slowUntil && this.t < this.slowUntil) {
      const u = clamp((this.slowUntil - this.t) / 700, 0, 1);
      speed = Math.min(speed, lerp(speed, 0.28, u));
    }
    if (this._replayQ) speed = Math.max(speed, 12);
    this._acc += speed * dtms / 8;
    const cap = this._replayQ ? 28 : 8;
    const steps = clamp(Math.floor(this._acc), 0, cap);
    this._acc = Math.min(this._acc - steps, cap);
    for (let i = 0; i < steps; i++) {
      if (this._replayQ) this._replayActions();
      else this._commitLamp();
      this.plant.step(1);
      this._stepCuttings(1);
      // for tools/tend_replay.mjs, which checks a shared link regrows the same
      // plant by fingerprinting both at the same step
      if (this.onStep) this.onStep(this.plant);
    }
    this.age += steps;
    this.t += dtms;
    this._readEvents();
    this._measure();
    for (const f of this.flashes) f.t += dtms;
    this.flashes = this.flashes.filter(f => f.t < 1600);
    this._frame(dtms);
    for (const s of this.spores) {
      s.p[1] += s.sp * 0.004 * dtms * 0.06;
      s.p[0] += Math.sin(this.t * 0.0004 + s.ph) * 0.004;
      if (s.p[1] > 26) s.p[1] = -2;
    }
  }

  // The camera frames what the plant has become, and the person turns it. No
  // director: a bench is looked at, not filmed.
  _frame(dtms) {
    const c = this.cam;
    const raw = this.plant.bounds();
    const bs = this.bbS || (this.bbS = { ...raw });
    // held still through a cut: the plant shrinking under the blade is exactly
    // what the camera must not chase while the drain is running
    const hold = this.holdUntil && this.t < this.holdUntil;
    const k = hold ? 0 : 1 - Math.exp(-0.05 * dtms / 16.67);
    // LEANING IN TO A CUT. The drain and the race it starts are a few centimetres
    // of stem, invisible at the distance a whole plant is framed from, and they
    // are over in a few seconds even slowed. So for that window the camera eases
    // toward the cut and back out again; touching the camera cancels it.
    const fc = this.focusCut;
    let lean = 0;
    if (fc) {
      const u = this.t - fc.t0;
      lean = smoothstep(0, 650, u) * (1 - smoothstep(fc.dur - 900, fc.dur, u));
      if (u > fc.dur) this.focusCut = null;
    }
    bs.cx = lerp(bs.cx, raw.cx, k); bs.cy = lerp(bs.cy, raw.cy, k); bs.cz = lerp(bs.cz, raw.cz, k);
    bs.w = lerp(bs.w, raw.w, k); bs.h = lerp(bs.h, raw.h, k);
    const W = this.renderer.W, H = this.renderer.H;
    const aspect = Math.max(0.45, W / Math.max(1, H));
    const halfV = c.fov / 2, halfH = Math.atan(Math.tan(halfV) * aspect);
    const distV = (Math.max(1.2, bs.h) / 2 / 0.70) / Math.tan(halfV);
    const distH = (Math.max(1.2, bs.w) / 2 / 0.74) / Math.tan(halfH);
    const want = clamp(Math.max(distV, distH) + bs.w * 0.3 + 1.0, 4, 160) * this.zoom;
    // the fitted distance lives apart from `dist`, which is what the renderer
    // focuses at and the vein width floor is measured from — so a lean-in moves
    // the lens's focus with the camera rather than leaving it on the whole plant
    c.fitDist = lerp(c.fitDist === undefined ? c.dist : c.fitDist, want, k);
    if (c.cx === undefined) { c.cx = bs.cx; c.cz = bs.cz; }
    c.cx = lerp(c.cx, bs.cx, k); c.cz = lerp(c.cz, bs.cz, k);
    c.tgtY = lerp(c.tgtY, bs.cy - bs.h * 0.04, k);
    v3set(c.target, c.cx, c.tgtY, c.cz);
    let dist = c.fitDist;
    if (lean > 0) {
      // toward a point a little below the cut, where the buds it frees are
      const p = fc.p;
      c.target[0] = lerp(c.target[0], p[0], lean);
      c.target[1] = lerp(c.target[1], p[1] - fc.drop, lean);
      c.target[2] = lerp(c.target[2], p[2], lean);
      dist = lerp(c.fitDist, Math.max(3.5, c.fitDist * 0.6), lean);
    }
    c.fogNear = Math.max(0, c.fitDist - Math.max(bs.h, bs.w) * 0.55);
    c.dofRange = Math.max(2.5, Math.max(bs.h, bs.w) * 0.75);
    c.dist = dist;
    const ce = Math.cos(c.el), se = Math.sin(c.el);
    v3set(c.eye, c.target[0] + Math.sin(c.az) * ce * dist, c.target[1] + se * dist,
      c.target[2] + Math.cos(c.az) * ce * dist);
  }

  // --------------------------------------------------------------------------
  // PICKING. The same matrices the renderer builds, so a stem is picked where it
  // is drawn. Returns the axis, the material arc position `s` a cut would use,
  // and the world point.
  _vp() {
    const c = this.cam, cv = this.canvas;
    m4perspective(_tbP, c.fov, cv.clientWidth / Math.max(1, cv.clientHeight), 0.05, 400);
    m4lookAt(_tbV, c.eye, c.target, TB_UP);
    return m4mul(_tbVP, _tbP, _tbV);
  }
  _proj(M, p, out) {
    const x = p[0], y = p[1], z = p[2];
    const cx = M[0] * x + M[4] * y + M[8] * z + M[12];
    const cy = M[1] * x + M[5] * y + M[9] * z + M[13];
    const cw = M[3] * x + M[7] * y + M[11] * z + M[15];
    const cv = this.canvas;
    out[0] = (cx / cw * 0.5 + 0.5) * cv.clientWidth;
    out[1] = (1 - (cy / cw * 0.5 + 0.5)) * cv.clientHeight;
    out[2] = cw;
    return out;
  }
  pickStem(x, y, tolPx = 14) {
    const M = this._vp();
    const a = [0, 0, 0], b = [0, 0, 0];
    let best = null, bestD = Infinity;
    const pxPerUnit = this.canvas.clientHeight / (2 * Math.tan(this.cam.fov / 2));
    for (const ax of this.plant.axes) {
      const n = ax.pts.length;
      if (n < 2) continue;
      const mat = (ax.rest && ax.rest.length === n) ? ax.rest : ax.pts;
      let arc = 0;
      this._proj(M, ax.pts[0], a);
      for (let i = 1; i < n; i++) {
        const seg = v3len(v3sub(_tbA, mat[i], mat[i - 1]));
        this._proj(M, ax.pts[i], b);
        if (a[2] > 0.05 && b[2] > 0.05) {
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const L2 = dx * dx + dy * dy;
          const f = L2 > 1e-9 ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1) : 0;
          const px = a[0] + dx * f - x, py = a[1] + dy * f - y;
          const d = Math.hypot(px, py);
          const rPx = (ax.radii[i] || 0.05) * pxPerUnit / Math.max(0.1, a[2]);
          const tol = Math.max(tolPx, rPx + 6);
          // nearer the pointer wins; a hair's preference for the stem in front
          const score = d / tol + 0.0005 * a[2];
          if (d < tol && score < bestD) {
            bestD = score;
            best = { ax, s: arc + seg * f, p: v3lerp(v3(), ax.pts[i - 1], ax.pts[i], f), i, f };
          }
        }
        arc += seg;
        a[0] = b[0]; a[1] = b[1]; a[2] = b[2];
      }
    }
    return best;
  }
  // a stump is a cut axis's last point
  pickStump(x, y, tolPx = 26) {
    const M = this._vp();
    const q = [0, 0, 0];
    let best = null, bestD = tolPx;
    for (const ax of this.plant.axes) {
      if (!ax.cutInfo || !ax.pts.length) continue;
      this._proj(M, ax.pts[ax.pts.length - 1], q);
      if (q[2] <= 0.05) continue;
      const d = Math.hypot(q[0] - x, q[1] - y);
      if (d < bestD) { bestD = d; best = ax; }
    }
    return best;
  }

  // --------------------------------------------------------------------------
  // THE THREE INSTRUMENTS
  // THE POPULATION AN EXPERIMENT IS ABOUT: the buds below `s` on `ax` that the
  // stream is holding asleep right now. A cut can only release those — the rest
  // were let go long ago, and counting them would report the plant's ordinary
  // branching as the experiment's result.
  _heldBelow(ax, s) {
    const P = this.plant, out = new Set();
    for (const o of ax.organs) {
      if (o.floral || o.shed || o.took || o.birthLen > s) continue;
      if (ax.streamAt(o.birthLen, P.time, this.sp) > this.sp.branching) out.add(o);
    }
    return out;
  }
  doCut(pick, withPaste) {
    const P = this.plant;
    // the record keeps the cut to a thousandth of a unit, so the live cut is made
    // at the same rounded place the replay will make it
    pick.s = Math.round(pick.s * 1000) / 1000;
    const idx = P.axes.indexOf(pick.ax);
    const held = this._heldBelow(pick.ax, pick.s);
    const c = P.cut(pick.ax, pick.s);
    if (!c) return null;
    this._rec([withPaste ? 'C' : 'c', P.time, idx, pick.s]);
    this.cuttings.push(this._makeCutting(c));
    this.hover = null;
    if (this.slowCuts !== false) this.slowUntil = this.t + 2600;
    this.holdUntil = this.t + 3400;
    if (this.leanCuts !== false && !this._replayQ) {
      // the stump's last point IS the cut — read it there rather than trusting the
      // caller's pick, which a replay or a script fills in with the old tip
      const ends = pick.ax.pts;
      this.focusCut = { p: v3copy(v3(), ends[ends.length - 1]), t0: this.t,
        dur: 3600, drop: Math.min(2.5, pick.s * 0.2) };
    }
    const removed = c.organs.length + c.axes.reduce((n, a) => n + a.organs.length, 0);
    const trial = { t0: P.time, axis: pick.ax, s: pick.s, held, removed };
    if (withPaste) {
      // Thimann & Skoog's protocol, in one motion: the cut is dressed as it is made
      P.paste(pick.ax, 1);
      this.trials.paste = { ...trial, wipedAt: null };
      this.results.paste = '';
      this._say('cutpaste', { removed, held: held.size });
    } else {
      this.trials.cut = trial;
      this.results.cut = '';
      this._say('cut', { removed, held: held.size });
    }
    return c;
  }
  togglePaste(ax) {
    const P = this.plant;
    const on = ax.cutInfo.paste.some(p => p.off === Infinity);
    this._rec([on ? 'w' : 'p', P.time, P.axes.indexOf(ax)]);
    if (on) {
      P.wipe(ax);
      const tr = this.trials.paste;
      if (tr && tr.axis === ax) tr.wipedAt = P.time;
      this._say('wipe');
    } else {
      // dressing a stump that was cut a while ago: the population is whatever the
      // stream is still holding below it
      P.paste(ax, 1);
      this.trials.paste = { t0: P.time, axis: ax, s: ax.cutInfo.s, held: this._heldBelow(ax, ax.cutInfo.s),
        wipedAt: null };
      this.results.paste = '';
      this._say('paste');
    }
  }
  setLamp(on) {
    this.lamp.on = !!on;
    if (on) this._startLightTrial(); else this.trials.light = null;
  }

  // --------------------------------------------------------------------------
  // THE RECORD. A tended plant is a seed and what was done to it, and the engine
  // is deterministic, so that is enough to grow it again exactly — every cut at
  // the step it was made, the light where it was, step for step. This is what a
  // shared link carries: no geometry, only the gardener's side of the story.
  startLog(ff) {
    this.log = { v: 1, sp: this.speciesName, seed: this.seed, ff, a: [] };
  }
  _rec(a) { if (this.log && this.log.a.length < 6000) this.log.a.push(a); }
  // Move the simulation's lamp to the pointer's, in steps of at least 0.6 world
  // units, snapped to 0.05, and write each move down. The drawn lamp follows the
  // pointer exactly; the one the plant grows toward lags it by less than a step's
  // worth of travel, which no tip can resolve anyway.
  _commitLamp() {
    const L = this.lamp, S = this.simLamp, t = this.plant.time;
    if (!L.on) {
      if (S.on) { S.on = false; this._rec(['o', t]); }
      return;
    }
    const d = Math.hypot(L.pos[0] - S.pos[0], L.pos[1] - S.pos[1], L.pos[2] - S.pos[2]);
    if (S.on && d < 0.6) return;
    const q = (x) => Math.round(x * 20) / 20;
    v3set(S.pos, q(L.pos[0]), q(L.pos[1]), q(L.pos[2]));
    S.on = true;
    this._rec(['L', t, S.pos[0], S.pos[1], S.pos[2]]);
  }
  // Grow a record: the specimen from its seed, then every action at its step.
  // Fast, but visibly — the plant regrows in front of the person it was sent to.
  replay(log) {
    this.newSpecimen(log.sp, log.seed);
    for (let i = 0; i < log.ff; i++) this.plant.step(1);
    this.age = log.ff; this.bbS = null;
    this.startLog(log.ff);
    this._replayQ = log.a.slice().sort((x, y) => x[1] - y[1]);
    this._replayEnd = this._replayQ.length ? this._replayQ[this._replayQ.length - 1][1] + 1 : this.plant.time;
    if (!this._replayQ.length) this._replayQ = null;
  }
  _replayActions() {
    const P = this.plant, Q = this._replayQ;
    while (Q.length && Q[0][1] <= P.time) {
      const a = Q.shift();
      const ax = P.axes[a[2]];
      if (a[0] === 'c' || a[0] === 'C') {
        if (ax) this.doCut({ ax, s: a[3], p: ax.tipPos(), i: 1, f: 0 }, a[0] === 'C');
      } else if (a[0] === 'p' || a[0] === 'w') {
        if (ax && ax.cutInfo) this.togglePaste(ax);
      } else if (a[0] === 'L') {
        v3set(this.lamp.pos, a[2], a[3], a[4]); v3set(this.simLamp.pos, a[2], a[3], a[4]);
        if (!this.lamp.on) this.setLamp(true);
        this.simLamp.on = true; this._placed = true;
        this._rec(['L', P.time, a[2], a[3], a[4]]);
      } else if (a[0] === 'o') {
        this.setLamp(false); this.simLamp.on = false;
        this._rec(['o', P.time]);
      }
    }
    if (!Q.length && P.time >= this._replayEnd) {
      this._replayQ = null;
      this._say('replayed');
    }
  }
  // Carry the lamp to the pixel under the pointer, on the plane through where it
  // already is and facing the camera: dragging moves it across the frame, and
  // turning the camera and dragging again moves it in depth.
  moveLamp(x, y, fresh) {
    const c = this.cam, cv = this.canvas;
    const fwd = v3norm(_tbA, v3sub(_tbA, c.target, c.eye));
    const right = v3norm(_tbB, v3cross(_tbB, fwd, TB_UP));
    const up2 = v3cross(_tbC, right, fwd);
    const ty = Math.tan(c.fov / 2), tx = ty * cv.clientWidth / Math.max(1, cv.clientHeight);
    const nx = (x / cv.clientWidth) * 2 - 1, ny = 1 - (y / cv.clientHeight) * 2;
    const dir = v3(fwd[0] + right[0] * nx * tx + up2[0] * ny * ty,
      fwd[1] + right[1] * nx * tx + up2[1] * ny * ty,
      fwd[2] + right[2] * nx * tx + up2[2] * ny * ty);
    const anchor = fresh ? c.target : this.lamp.pos;
    const depth = v3dot(v3sub(_tbD, anchor, c.eye), fwd);
    const t = depth / Math.max(1e-4, v3dot(dir, fwd));
    const g = this.plant.origin[1];
    v3set(this.lamp.pos, c.eye[0] + dir[0] * t, Math.max(g + 0.6, c.eye[1] + dir[1] * t),
      c.eye[2] + dir[2] * t);
  }

  // --------------------------------------------------------------------------
  // A CUTTING. What left the plant, as it was, falling through the same gravity
  // a shed blade falls through: it tips off the stump about the cut, falls,
  // settles on the ground, wilts and goes. The branch is rigid — its shape is
  // the one it grew, nothing bends it — and the wilting is the shipped
  // senescence drawing, driven by `sen` on organs nobody else owns now.
  _makeCutting(c) {
    const axes = [];
    const wrap = (pts, radii, organs, fruit, gen) => {
      const o = { pts: pts.map(p => v3(p[0], p[1], p[2])), radii: radii.slice(), organs,
        fruit, gen, alive: false, meristem: null, kids: [],
        _p0: pts.map(p => v3(p[0], p[1], p[2])) };
      for (const g of organs) {
        g._f0 = { o: v3copy(v3(), g.frame.o), x: v3copy(v3(), g.frame.x),
          y: v3copy(v3(), g.frame.y), z: v3copy(v3(), g.frame.z) };
      }
      axes.push(o);
    };
    wrap(c.pts, c.radii, c.organs, c.fruit, c.gen);
    for (const a of c.axes) { a.meristem = null; wrap(a.pts, a.radii, a.organs, a.fruit, a.gen); }
    // mass: stem as radius squared times length, blades by area — the same two
    // proportionalities the bend solver loads a stem with
    let m = 0;
    const com = v3();
    for (const ax of axes) {
      for (let i = 1; i < ax.pts.length; i++) {
        const w = ax.radii[i] * ax.radii[i] * v3len(v3sub(_tbA, ax.pts[i], ax.pts[i - 1])) * 40;
        v3addScaled(com, com, v3lerp(_tbB, ax.pts[i], ax.pts[i - 1], 0.5), w); m += w;
      }
      for (const g of ax.organs) {
        const w = 0.02 * (g.len || 0) * (g.len || 0);
        v3addScaled(com, com, g.frame.o, w); m += w;
      }
    }
    const P0 = v3(c.pts[0][0], c.pts[0][1], c.pts[0][2]);
    if (m > 0) v3scale(com, com, 1 / m); else v3copy(com, c.pts[c.pts.length - 1]);
    const arm = v3sub(v3(), com, P0);
    const armL = Math.max(0.2, v3len(arm));
    const h = v3(arm[0], 0, arm[2]);
    if (v3len(h) < 0.04 * armL) {
      // a cutting standing dead upright tips the way its last segment leaned
      const n = c.pts.length;
      v3sub(h, c.pts[n - 1], c.pts[Math.max(0, n - 2)]); h[1] = 0;
      if (v3len(h) < 1e-5) v3set(h, 1, 0, 0.3);
    }
    v3norm(h, h);
    const a = v3norm(v3(), v3cross(v3(), TB_UP, h));
    const phi0 = Math.acos(clamp(arm[1] / armL, -1, 1));
    return {
      axes, P0, com0: com, a, armL, phi0,
      S: { plant: { axes }, pal: this.pal, petalPal: this.petalPal, innerPals: this.innerPals, sp: this.sp },
      th: 0, om: 0.0015, X: v3copy(v3(), com), V: v3(), phase: 'topple', t: 0, vis: 1, thFlat: null, age: 0,
    };
  }
  // where a material point of the cutting is now
  _cutPt(C, q, out) {
    v3sub(_tbE, q, C.P0);
    v3rotAxis(out, _tbE, C.a, C.th);
    v3add(out, out, C.P0);
    if (C.phase !== 'topple') {
      // free: the centre of mass has its own track, the body turns about it
      v3sub(_tbE, C.com0, C.P0);
      v3rotAxis(_tbD, _tbE, C.a, C.th);
      out[0] += C.X[0] - (_tbD[0] + C.P0[0]);
      out[1] += C.X[1] - (_tbD[1] + C.P0[1]);
      out[2] += C.X[2] - (_tbD[2] + C.P0[2]);
    }
    return out;
  }
  _lowest(C) {
    let low = Infinity;
    const q = _tbC;
    for (const ax of C.axes) {
      for (const p of ax._p0) { this._cutPt(C, p, q); if (q[1] < low) low = q[1]; }
      for (const g of ax.organs) {
        if (g.shed) continue;
        v3addScaled(_tbA, g._f0.o, g._f0.x, (g.len || 0) * 0.9);
        this._cutPt(C, _tbA, q); if (q[1] < low) low = q[1];
      }
    }
    return low;
  }
  _stepCuttings(dt) {
    const ground = this.plant.origin[1];
    for (const C of this.cuttings) {
      C.t += dt;
      C.age += dt;
      // nothing flows in a cut piece: it goes out like a light rather than
      // lingering as bright as the plant it left, and starts to wilt at once
      C.vis = Math.min(C.vis, 1 - 0.55 * smoothstep(0, 90, C.age));
      for (const ax of C.axes) for (const g of ax.organs) g.sen = Math.min(1, (g.sen || 0) + dt / 700);
      if (C.phase === 'topple') {
        // a pendulum about the cut: the arm is to the centre of mass, and the
        // 1.35 is the radius of gyration of a leafy spray about its base,
        // squared, over the arm squared — a stick is 4/3
        const alpha = TB_G / (1.35 * C.armL) * Math.sin(C.phi0 + C.th);
        C.om += alpha * dt; C.th += C.om * dt;
        if (C.th > 0.5 || C.t > 90) {
          // it slides off the stump: free now, carrying the spin it had
          C.phase = 'fall';
          v3sub(_tbE, C.com0, C.P0);
          v3rotAxis(_tbD, _tbE, C.a, C.th);
          v3add(C.X, _tbD, C.P0);
          v3cross(C.V, C.a, _tbD); v3scale(C.V, C.V, C.om);
        }
      } else if (C.phase === 'fall') {
        // leafy things fall on their drag, not on g: a light linear drag keeps a
        // spray from dropping like a stone without pretending to be aerodynamics
        C.V[1] -= TB_G * dt;
        v3scale(C.V, C.V, 1 - 0.012 * dt);
        v3addScaled(C.X, C.X, C.V, dt);
        C.th += C.om * dt; C.om *= 1 - 0.004 * dt;
        const low = this._lowest(C);
        if (low <= ground) {
          C.X[1] += ground - low;
          C.phase = 'land'; C.t = 0;
          // it comes to rest lying down, whichever way it was already going
          const side = C.phi0 + C.th;
          C.thFlat = C.th + clamp(Math.PI / 2 - side, -0.6, 0.9);
        }
      } else if (C.phase === 'land') {
        C.th = lerp(C.th, C.thFlat, 1 - Math.exp(-0.08 * dt));
        const low = this._lowest(C);
        C.X[1] += ground - low;
        if (C.t > 80) { C.phase = 'rest'; C.t = 0; }
      } else {
        C.vis = Math.min(C.vis, 0.45 * (1 - smoothstep(160, 420, C.t)));
      }
      for (const ax of C.axes) for (const g of ax.organs) if (g.fall && !g.fall.done) fallStep(g.fall, dt);
    }
    this.cuttings = this.cuttings.filter(C => !(C.phase === 'rest' && C.t > 420));
  }
  _poseCutting(C) {
    for (const ax of C.axes) {
      for (let i = 0; i < ax._p0.length; i++) this._cutPt(C, ax._p0[i], ax.pts[i]);
      for (const g of ax.organs) {
        const f = g._f0;
        this._cutPt(C, f.o, g.frame.o);
        v3rotAxis(g.frame.x, f.x, C.a, C.th);
        v3rotAxis(g.frame.y, f.y, C.a, C.th);
        v3rotAxis(g.frame.z, f.z, C.a, C.th);
      }
    }
    if (C.vis < 1) {
      C.S.pal = tbFadePal(this.pal, C.vis);
      C.S.petalPal = tbFadePal(this.petalPal, C.vis);
      C.S.innerPals = this.innerPals.map(p => tbFadePal(p, C.vis));
    }
  }

  // --------------------------------------------------------------------------
  // THE STREAM, DRAWN. Each living axis's stations are read off `streamAt` once a
  // frame; the stem's own tube then carries it as emission through the
  // `stemGlow` hook in `drawSpecimen`. What a person sees is the quantity that
  // decides which buds wake — nothing here is shaped to look like a flow.
  _prepGlow() {
    const P = this.plant, t = P.time, sp = this.sp;
    for (const ax of P.axes) {
      const n = ax.pts.length;
      if (!this.showStream || n < 2) { ax._glow = null; continue; }
      const g = ax._glow && ax._glow.length === n ? ax._glow : (ax._glow = new Float32Array(n));
      const mat = (ax.rest && ax.rest.length === n) ? ax.rest : ax.pts;
      let arc = 0;
      for (let i = 0; i < n; i++) {
        if (i > 0) arc += v3len(v3sub(_tbA, mat[i], mat[i - 1]));
        g[i] = ax.streamAt(Math.min(arc, ax.length), t, sp);
      }
    }
  }
  // The glow is the stream measured against the one number that decides
  // anything, `branching`: a stem lit is a stem whose buds are being held
  // asleep, a stem dark is one whose buds are free to go. Scaled that way the
  // drain front after a cut is a boundary moving down the stem, which is the
  // thing worth seeing — the raw sum saturated to white wherever two branches'
  // streams met.
  _glowAt(ax, t) {
    const g = ax._glow;
    if (!g) return 0;
    const f = t * (g.length - 1), i = Math.min(g.length - 2, Math.floor(f));
    const v = i < 0 ? g[0] : lerp(g[i], g[i + 1], f - i);
    const u = clamp(v / (2 * this.sp.branching), 0, 1);
    return this.glowGain * u * u * (3 - 2 * u);
  }

  buildScene() {
    const B = this.B;
    B.reset();
    const px = 2 * Math.tan(this.cam.fov / 2) / Math.max(1, this.renderer.H);
    setView(this.cam.eye, this.cam.dist * px * 1.5, this.veinLOD === false ? 0 : px);
    this.detail = 0;
    this.setBladeLOD([this.hero]);
    this._prepGlow();
    this.drawSpecimen(B, this.hero, null);
    for (const C of this.cuttings) { this._poseCutting(C); this.drawSpecimen(B, C.S, null); }
    this._drawBench(B);
    for (const s of this.spores) B.point(s.p, this.pal.spore, s.s * 0.9);
    this.renderer.upload(B);
  }

  // --------------------------------------------------------------------------
  // THE STREAM, MOVING. `streamAt` is a sum over sources of auxin that left each
  // source at some time and has travelled some distance; this draws that sum as
  // what it is made of. Every source — a living apex, the auxin still in the stem
  // when a cut went in, paste on a stump — sends motes rootward down its own
  // path and on through every parent below it, at `patSpeed`, fading over
  // `dominance`, and a mote exists only if its source was on when it left. So a
  // cut does not dim anything: the last mote to pass the cut is the tail of the
  // stream, and a person watches it run down the stem past the buds. The spacing
  // is the only thing chosen here — how many motes a unit of stream is drawn as.
  _arcTable(ax) {
    const n = ax.pts.length;
    const mat = (ax.rest && ax.rest.length === n) ? ax.rest : ax.pts;
    const a = ax._arcT && ax._arcT.length === n ? ax._arcT : (ax._arcT = new Float32Array(n));
    a[0] = 0;
    for (let i = 1; i < n; i++) a[i] = a[i - 1] + v3len(v3sub(_tbA, mat[i], mat[i - 1]));
    return a;
  }
  _pointAt(ax, s, out) {
    const a = ax._arcT, n = ax.pts.length;
    if (!a || n < 2) { v3copy(out, ax.pts[0]); return 0.05; }
    let lo = 0, hi = n - 1;
    if (s <= 0) { v3copy(out, ax.pts[0]); return ax.radii[0]; }
    if (s >= a[n - 1]) { v3copy(out, ax.pts[n - 1]); return ax.radii[n - 1]; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= s) lo = m; else hi = m; }
    const f = (s - a[lo]) / Math.max(1e-6, a[hi] - a[lo]);
    v3lerp(out, ax.pts[lo], ax.pts[hi], f);
    return lerp(ax.radii[lo], ax.radii[hi], f);
  }
  _drawMotes(B) {
    const P = this.plant, t = P.time, sp = this.sp, v = P.patV, lam = sp.dominance, tau = P.tauCommit;
    const vein = this.pal.vein, eye = this.cam.eye;
    const SP = 0.42;                           // world units between motes
    const phase = (t * v) % SP;
    // a mote's identity is when it left its source, which does not change as it
    // travels; hashing it gives each one a fixed jitter, so a stream reads as
    // particles and not as a dotted line
    const base = Math.floor(t * v / SP);
    const hsh = (i) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    for (const ax of P.axes) this._arcTable(ax);
    const col = [0, 0, 0], q = v3();
    // one source: starts at arc `s0` of `ax`, strength `k` (or `k(te)` for a
    // source whose output was still rising when that mote left it), on over [on, off)
    const trace = (ax, s0, k, on, off) => {
      let X = ax, sHi = s0, d0 = 0;
      while (X) {
        // motes on this stretch sit at path distances d0 .. d0 + sHi
        const first = Math.ceil((d0 - phase) / SP);
        for (let j = Math.max(0, first - 1); ; j++) {
          const id = base - j;
          const h1 = hsh(id), h2 = hsh(id + 7919);
          const d = j * SP + phase + (h1 - 0.5) * 0.6 * SP;
          if (d > d0 + sHi) break;
          if (d < d0) continue;
          const te = t - d / v;
          if (te < on || te >= off) continue;
          const b = (typeof k === 'function' ? k(te) : k) * Math.exp(-d / lam);
          if (b < 0.04) { if (typeof k === 'function') continue; break; }
          const r = this._pointAt(X, sHi - (d - d0), q);
          // lift it off the stem's centreline toward the eye, or the tube hides it
          v3sub(_tbB, eye, q); v3norm(_tbB, _tbB);
          v3addScaled(q, q, _tbB, r * 1.15);
          // capped below white, so a mote keeps the plant's own hue
          const g = Math.min(0.95, b * 1.05) * (0.75 + 0.5 * h2);
          col[0] = vein[0] * g; col[1] = vein[1] * g; col[2] = vein[2] * g;
          B.point(q, col, Math.max(0.04, r * 1.1) * (0.65 + 0.55 * h2) * (0.7 + 0.3 * Math.min(1, b)));
        }
        d0 += sHi;
        if (!X.parent) break;
        sHi = X.attachLen();
        X = X.parent;
      }
    };
    for (const ax of P.axes) {
      // a bud that has come free exports on a ramp — the rising stream that puts
      // the buds below it back to sleep is visible as motes leaving it
      if (ax.freeBuds) for (const o of ax.freeBuds) {
        const f0 = o.freeAt, vg = ax.vigour;
        trace(ax, o.birthLen, (te) => Math.min(1, (te - f0) / tau) * vg, f0, o.stopAt === undefined ? Infinity : o.stopAt);
      }
      if (ax.alive && ax.meristem) trace(ax, ax.length, ax.vigour, ax.bornAt, Infinity);
      else if (ax.cutInfo) {
        const c = ax.cutInfo;
        if (t - c.t < (c.s + 40) / v) trace(ax, c.s, c.level, -Infinity, c.t);
        for (const p of c.paste) trace(ax, c.s, p.dose, p.on, p.off);
      } else if (ax.offAt !== undefined && t - ax.offAt < (ax.length + 40) / v) {
        trace(ax, ax.length, ax.vigour, ax.bornAt, ax.offAt);
      }
    }
  }

  // Buds, the lamp, the blade's preview, stumps and the moment a bud wakes.
  _drawBench(B) {
    const P = this.plant, sp = this.sp, pal = this.pal, t = P.time;
    const accent = pal.vein;
    const col = [0, 0, 0];
    if (this.showStream) this._drawMotes(B);
    // BUDS. Every axil that could still grow a shoot, drawn by what the stream
    // is doing to it: held (bright), let go and dormant (faint), waiting to be
    // old enough (between). These are the dots the whole experiment is about.
    if (this.showStream) {
      for (const ax of P.axes) {
        for (const org of ax.organs) {
          if (org.floral || org.shed || org.took || (org.dev || 0) < 0.25) continue;
          const free = org.freeAt !== undefined && org.stopAt === undefined;
          let k, grow = 1;
          if (free) {
            // free, and racing: bright, pulsing, and swelling toward the moment it
            // either commits or is put back to sleep
            const u = clamp((t - org.freeAt) / P.tauCommit, 0, 1);
            k = (1.1 + 0.45 * Math.sin(this.t * 0.016 + org.birthLen * 3)) * (1.0 + 0.9 * u);
            grow = 1.9 + 1.1 * u;
          } else if (org.armed || ax.streamAt(org.birthLen, t, sp) > sp.branching) {
            k = 0.42;                                // held asleep by the stream
          } else {
            k = 0.08;                                // let go and not growing: dormant
          }
          col[0] = accent[0] * k; col[1] = accent[1] * k; col[2] = accent[2] * k;
          const r = Math.max(0.05, (org.radius || 0.05) * 1.1);
          v3addScaled(_tbA, org.frame.o, org.frame.x, r * 1.2);
          B.point(_tbA, col, r * 2.3 * grow);
        }
      }
    }
    // STUMPS: the wound, and the paste on it
    for (const ax of P.axes) {
      if (!ax.cutInfo || !ax.pts.length) continue;
      const e = ax.pts[ax.pts.length - 1];
      const pasted = ax.cutInfo.paste.some(p => p.off === Infinity);
      const r = Math.max(0.05, ax.radii[ax.radii.length - 1] || 0.05);
      const hot = this.hoverStump === ax ? 1.6 : 1;
      if (pasted) {
        B.point(e, [TB_LAMP[0] * 1.6 * hot, TB_LAMP[1] * 1.45 * hot, TB_LAMP[2] * 1.1 * hot], r * 3.2);
      } else {
        const age = t - ax.cutInfo.t;
        const fresh = 1 + 2.5 * Math.exp(-age / 60);
        B.point(e, [0.75 * fresh * hot, 0.82 * fresh * hot, 0.80 * fresh * hot], r * 2.2);
      }
    }
    // THE BLADE'S PREVIEW: a ring where it will go in, and everything that
    // would leave the plant traced over in pale light
    const hv = (this.tool === 'shears' || this.tool === 'paste') ? this.hover : null;
    if (hv && P.axes.indexOf(hv.ax) >= 0) {
      const ax = hv.ax, n = ax.pts.length;
      const i = clamp(hv.i, 1, n - 1);
      v3norm(_tbA, v3sub(_tbA, ax.pts[i], ax.pts[i - 1]));
      v3norm(_tbB, v3cross(_tbB, Math.abs(_tbA[1]) > 0.9 ? v3(1, 0, 0) : TB_UP, _tbA));
      v3cross(_tbC, _tbA, _tbB);
      const r = Math.max(0.06, (ax.radii[i] || 0.05) * 2.2);
      for (let k = 0; k < 18; k++) {
        const th = k / 18 * TAU;
        const q = v3(hv.p[0] + (_tbB[0] * Math.cos(th) + _tbC[0] * Math.sin(th)) * r,
          hv.p[1] + (_tbB[1] * Math.cos(th) + _tbC[1] * Math.sin(th)) * r,
          hv.p[2] + (_tbB[2] * Math.cos(th) + _tbC[2] * Math.sin(th)) * r);
        B.point(q, [1.4, 1.45, 1.5], r * 0.45);
      }
      // wider than the stem, so what shows is a halo round everything that
      // would leave the plant — the tube hides the ribbon's middle
      const ghost = [0.62, 0.68, 0.72];
      const up = [hv.p], ur = [(ax.radii[i] || 0.05) * 1.9];
      for (let k = i; k < n; k++) { up.push(ax.pts[k]); ur.push(ax.radii[k] * 1.9); }
      stemRibbon(B, up, ur, ghost, 0.55);
      const walk = (a) => { stemRibbon(B, a.pts, a.radii.map(r => r * 1.9), ghost, 0.55); for (const k of a.kids) walk(k); };
      for (const k of ax.kids) if (k.attachLen() > hv.s) walk(k);
    }
    // A BUD WAKING: a brief light where it happened
    for (const f of this.flashes) {
      const u = f.t / 1600;
      const k = (1 - u) * (1 - u) * 2.2;
      B.point(f.p, [accent[0] * k, accent[1] * k, accent[2] * k], 0.12 + 0.5 * u);
    }
    // THE LAMP
    if (this.lamp.on) {
      const L = this.lamp.pos;
      B.point(L, [TB_LAMP[0] * 3.2, TB_LAMP[1] * 3.2, TB_LAMP[2] * 3.2], 0.55);
      B.point(L, [TB_LAMP[0] * 0.35, TB_LAMP[1] * 0.3, TB_LAMP[2] * 0.22], 3.2);
    }
  }

  // The lamp is the key light while it is on: every blade is shaded from where
  // the person is holding it. Restored after the draw — the palette belongs to
  // the specimen, and the same save-and-restore `App.render` uses for views.
  render() {
    const p = this.pal, L = this.lamp;
    const k0 = p.key, c0 = p.keyCol;
    if (L && L.on) {
      const b = this.bbS || this.plant.bounds();
      const d = v3norm(v3(), v3(L.pos[0] - b.cx, L.pos[1] - b.cy, L.pos[2] - b.cz));
      p.key = [d[0], d[1], d[2]];
      p.keyCol = [lerp(c0[0], 1.05, 0.6), lerp(c0[1], 0.80, 0.6), lerp(c0[2], 0.52, 0.6)];
    }
    super.render();
    p.key = k0; p.keyCol = c0;
  }

  // --------------------------------------------------------------------------
  // WHAT HAPPENED, MEASURED. Every sentence the page adds after a person does
  // something is computed here off the plant, never written in advance.
  _readEvents() {
    const ev = this.plant.events;
    // the plant keeps the last 64; each is marked as it is read, so a trimmed list
    // cannot be read twice
    for (const e of ev) {
      if (e._read) continue;
      e._read = true;
      if (e.kind !== 'bud' && e.kind !== 'free' && e.kind !== 'resleep') continue;
      const org = e.org;
      if (e.kind === 'bud' && org) this.flashes.push({ p: v3copy(v3(), org.frame.o), t: 0 });
      // only the buds an experiment was about, and only after it started — a
      // plant grown synchronously leaves a queue of older events behind it
      for (const tr of [this.trials.cut, this.trials.paste]) {
        if (!tr || e.from !== tr.axis || e.t < tr.t0 || !tr.held.has(org)) continue;
        const phase = tr.wipedAt === undefined || tr.wipedAt === null || e.t < tr.wipedAt ? 'a' : 'b';
        const rec = tr[phase] || (tr[phase] = { freed: new Set(), slept: new Set(), woke: [] });
        if (e.kind === 'free') rec.freed.add(org);
        else if (e.kind === 'resleep') rec.slept.add(org);
        else rec.woke.push({ t: e.t, s: e.s });
      }
      if (e.kind === 'bud') this._say('bud', { gen: e.axis.gen });
      else if (e.kind === 'free') this._say('free');
    }
  }
  _startLightTrial() { this.trials.light = { t0: this.plant.time }; }
  _measure() {
    const P = this.plant;
    const cm = (u) => Math.max(1, Math.round(u * WORLD.unitM * 100));
    const buds = (n) => n === 1 ? 'one bud' : n + ' buds';
    // PLANT TIME, calibrated by the drain. The front runs at `patV` world units a
    // step, and a real one at about a centimetre an hour (Morris et al. 2005), so a
    // step is about patV * unitM * 100 hours of a plant's life — close to an hour
    // on a Cathedral Fern, which makes one second on screen about five days.
    const hrs = (n) => {
      const h = n * P.patV * WORLD.unitM * 100;
      return h < 36 ? `about ${Math.max(1, Math.round(h))} hour${Math.round(h) === 1 ? '' : 's'}`
        : `about ${Math.round(h / 24)} days`;
    };
    // THE LEAN, NOT THE ANGLE TO THE LAMP. The first version reported how much the
    // angle between a tip's heading and the lamp had closed, and it said "turned
    // away" while the leader visibly arched over toward the lamp: a tip that grows
    // up past the lamp's height changes the direction TO the lamp faster than it
    // turns. What Darwin measured, and what reads, is the lean: how far from
    // vertical the tip now points, signed by whether that lean faces the lamp.
    const tl = this.trials.light;
    if (tl && this.lamp.on) {
      let n = 0, lean = 0;
      const L = this.simLamp.on ? this.simLamp.pos : this.lamp.pos;
      for (const ax of P.axes) {
        if (!ax.alive || !ax.meristem) continue;
        const d = ax.dir, tip = ax.tipPos();
        const hx = L[0] - tip[0], hz = L[2] - tip[2], hl = Math.hypot(hx, hz) || 1;
        const dh = Math.hypot(d[0], d[2]);
        const a = Math.atan2(dh, d[1]) * 180 / Math.PI;
        const facing = dh > 1e-4 ? (d[0] * hx + d[2] * hz) / (dh * hl) : 0;
        lean += a * Math.sign(facing || 1); n++;
      }
      const dt = P.time - tl.t0;
      if (n && dt > 60) {
        const m = lean / n;
        this.results.light = `${n === 1 ? 'The growing tip leans' : n + ' growing tips lean, on average,'} `
          + `${Math.abs(m).toFixed(0)}° from upright, ${m >= 0 ? 'toward' : 'away from'} the lamp — lit for ${hrs(dt)}.`;
      } else if (!n && dt > 60) {
        this.results.light = 'No tip is growing, so nothing can turn. Cut a stem and let a bud grow out, then light it.';
      }
    }
    const tc = this.trials.cut;
    if (tc) {
      const K = tc.held.size, rec = tc.a;
      if (!K) {
        this.results.cut = 'Nothing below this cut was being held asleep, so there was nothing to release. Cut where the stem is lit.';
      } else if (P.time - tc.t0 > 20) {
        const F = rec ? rec.freed.size : 0, C = rec ? rec.woke.length : 0, Z = rec ? rec.slept.size : 0;
        if (!F) this.results.cut = `The tip was holding ${buds(K)} asleep below the cut. The auxin is draining down to them.`;
        else if (!C) this.results.cut = `The drain has freed ${F} of the ${buds(K)} the tip was holding. Now they race: the first to hold its own long enough grows out.`;
        else {
          const f = rec.woke[0];
          this.results.cut = `The drain freed ${F} of the ${buds(K)} the tip was holding. `
            + `${C === 1 ? 'One' : C} grew out, the first ${cm(tc.s - f.s)} cm below the cut, ${hrs(f.t - tc.t0)} after it`
            + (Z ? `, and put ${Z === 1 ? 'one' : Z} back to sleep.` : '.');
        }
      }
    }
    const tp = this.trials.paste;
    if (tp) {
      const K = tp.held.size, A = tp.a, Bq = tp.b;
      const under = A ? A.freed.size + A.woke.length : 0;
      if (!K) {
        this.results.paste = 'Nothing below this stump is being held asleep, so the auxin has nothing to hold. Dress a fresh cut higher up.';
      } else if (tp.wipedAt === null) {
        this.results.paste = `Auxin back on the cut ${hrs(P.time - tp.t0)} ago, with ${buds(K)} below it. `
          + (under === 0 ? 'Not one has come free.' : `${under} came free all the same.`);
      } else {
        const F = Bq ? Bq.freed.size : 0, C = Bq ? Bq.woke.length : 0;
        this.results.paste = `Under the auxin, ${under === 0 ? 'not one bud came free' : under + ' came free'}. `
          + (C ? `Taken away: ${F} freed, ${C === 1 ? 'one' : C} grew out ${hrs(Bq.woke[0].t - tp.wipedAt)} later.`
            : F ? `Taken away: ${F} freed, racing to grow out.` : `Taken away ${hrs(P.time - tp.wipedAt)} ago; the auxin is draining.`);
      }
    }
  }
  _say(kind, data) { if (this.onEvent) this.onEvent(kind, data || {}); }

  // --------------------------------------------------------------------------
  // HANDS. Look drags the camera round; the lamp follows the pointer while it
  // is pressed; the shears and the paste act on a click, so a drag with either
  // still turns the camera instead of cutting something by accident.
  _bindInput() {
    const c = this.canvas;
    let drag = null, pinch = 0;
    const orbit = (dx, dy) => {
      this.cam.az -= dx * 0.006;
      this.cam.el = clamp(this.cam.el + dy * 0.005, -0.35, 1.3);
    };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      const x = e.clientX, y = e.clientY;
      const alt = e.button === 1 || e.button === 2;
      if (!alt && this.tool === 'lamp') {
        const fresh = !this.lamp.on && !this._placed;
        this.moveLamp(x, y, fresh);
        this._placed = true;
        if (!this.lamp.on) this.setLamp(true);
        drag = { mode: 'lamp' };
        return;
      }
      drag = { mode: 'orbit', x, y, x0: x, y0: y, alt };
      this.focusCut = null;
    });
    c.addEventListener('pointermove', e => {
      const x = e.clientX, y = e.clientY;
      this.pointer = [x, y];
      if (!drag) {
        if (this.tool === 'shears') this.hover = this.pickStem(x, y, e.pointerType === 'touch' ? 24 : 14);
        else if (this.tool === 'paste') {
          this.hoverStump = this.pickStump(x, y, 18);
          this.hover = this.hoverStump ? null : this.pickStem(x, y, 14);
        }
        return;
      }
      if (drag.mode === 'lamp') { this.moveLamp(x, y, false); return; }
      orbit(x - drag.x, y - drag.y);
      drag.x = x; drag.y = y;
    });
    const end = (e) => {
      if (drag && drag.mode === 'orbit' && !drag.alt && e && e.type === 'pointerup') {
        const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
        if (moved < 6) {
          if (this.tool === 'shears') {
            const pk = this.pickStem(e.clientX, e.clientY, e.pointerType === 'touch' ? 24 : 14);
            if (pk) this.doCut(pk);
          } else if (this.tool === 'paste') {
            const st = this.pickStump(e.clientX, e.clientY, e.pointerType === 'touch' ? 30 : 18);
            if (st) this.togglePaste(st);
            else {
              const pk = this.pickStem(e.clientX, e.clientY, e.pointerType === 'touch' ? 24 : 14);
              if (pk) this.doCut(pk, true); else this._say('nostump');
            }
          }
        }
      }
      drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => { drag = null; });
    c.addEventListener('pointerleave', () => { if (!drag) { this.hover = null; this.hoverStump = null; } });
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.focusCut = null;
      this.zoom = clamp(this.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.25, 3);
    }, { passive: false });
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        drag = null;
      }
    }, { passive: true });
    c.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.zoom = clamp(this.zoom * (pinch / Math.max(1, d)), 0.25, 3);
        pinch = d;
      }
    }, { passive: true });
    c.addEventListener('touchend', () => { pinch = 0; }, { passive: true });
  }
}
