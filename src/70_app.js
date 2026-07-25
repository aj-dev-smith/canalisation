// ---------------------------------------------------------------------------
// The exhibit: camera, species, scene assembly, and the loop.
// ---------------------------------------------------------------------------

import { DEFAULT_PRM } from './10_auxin.js';
import { MERISTEM_DEFAULTS } from './20_meristem.js';
import { LEAF_DEFAULTS } from './30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from './40_plant.js';
import { Buffers, tube, blade, meristemDome, fruitShell, setView } from './50_geom.js';
import { Renderer } from './60_render.js';
import {
  v3, v3set, v3copy, v3add, v3sub, v3scale, v3addScaled, v3norm, v3len, v3lerp,
  TAU, clamp, lerp, smoothstep, mulberry32,
} from './00_math.js';

// --- species ---------------------------------------------------------------
// Each is a parameter set, not a shape. Nothing here says what the plant will
// look like; it says how its chemistry is tuned.
export const SPECIES = {
  'Cathedral Fern': {
    prm: { T: 40, D: 6.0, mu: 0.30, rho: 0.60, b: 3.0 },
    mo: { R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.0042 },
    sp: {
      elongation: 0.0044, organLen: 4.3, organTilt: 0.86, droop: 0.5,
      maxOrgans: 52, branching: 0.5, maxAxes: 5,
      leafOpts: { fenestrate: 0, aspect: 0.40 },
    },
    pal: {
      blade0: [0.06, 0.21, 0.21], blade1: [0.10, 0.36, 0.32],
      veinTint: [0.02, 0.16, 0.22], vein: [0.35, 1.0, 0.95],
      stem0: [0.13, 0.26, 0.27], stem1: [0.22, 0.44, 0.40],
      cell0: [0.05, 0.14, 0.20], cell1: [0.55, 1.0, 0.85],
      bgTop: [0.012, 0.030, 0.045], bgBot: [0.004, 0.008, 0.014],
      bgGlow: [0.03, 0.10, 0.13], fog: [0.02, 0.05, 0.07], fogD: 0.075,
      key: [0.35, 0.75, 0.45], keyCol: [0.55, 0.85, 0.80],
      ambTop: [0.10, 0.22, 0.30], ambBot: [0.02, 0.04, 0.07],
      glow: 1.0, spore: [0.4, 0.9, 0.85],
      pin: [0.55, 0.92, 1.0], spark: [0.85, 1.0, 0.95],
      fruit0: [0.06, 0.20, 0.17], fruit1: [0.95, 0.45, 0.55],
      petal0: [0.20, 0.30, 0.46], petal1: [0.62, 0.80, 1.0], petalVein: [0.8, 0.95, 1.0],
    },
  },
  'Spiral Ossuary': {
    prm: { T: 52, D: 6.5, mu: 0.30, rho: 0.60, b: 3.4 },
    mo: { R: 10, rCZ: 2.2, rPZ: 6.4, G: 0.0042 },
    sp: {
      elongation: 0.0036, organLen: 3.2, organTilt: 0.66, droop: 0.24,
      maxOrgans: 60, branching: 0.30, maxAxes: 3,
      leafOpts: { fenestrate: 0, aspect: 0.30 },
    },
    pal: {
      blade0: [0.26, 0.24, 0.20], blade1: [0.50, 0.47, 0.40],
      veinTint: [0.30, 0.16, 0.02], vein: [1.0, 0.62, 0.20],
      stem0: [0.30, 0.28, 0.24], stem1: [0.58, 0.54, 0.46],
      cell0: [0.18, 0.15, 0.13], cell1: [1.0, 0.75, 0.35],
      bgTop: [0.045, 0.038, 0.033], bgBot: [0.010, 0.008, 0.007],
      bgGlow: [0.09, 0.055, 0.02], fog: [0.06, 0.05, 0.045], fogD: 0.062,
      key: [0.4, 0.8, 0.3], keyCol: [0.95, 0.85, 0.70],
      ambTop: [0.22, 0.20, 0.18], ambBot: [0.05, 0.04, 0.035],
      glow: 0.9, spore: [1.0, 0.8, 0.45],
      pin: [1.0, 0.80, 0.45], spark: [1.0, 0.95, 0.75],
      fruit0: [0.24, 0.22, 0.17], fruit1: [1.0, 0.62, 0.18],
      petal0: [0.44, 0.38, 0.28], petal1: [1.0, 0.90, 0.66], petalVein: [1.0, 0.9, 0.7],
    },
  },
  'Abyssal Frond': {
    prm: { T: 34, D: 5.4, mu: 0.30, rho: 0.60, b: 2.7 },
    mo: { R: 11, rCZ: 2.8, rPZ: 7.4, G: 0.0034 },
    sp: {
      elongation: 0.0050, organLen: 5.0, organTilt: 1.02, droop: 0.95,
      maxOrgans: 44, branching: 0.62, maxAxes: 6,
      leafOpts: { fenestrate: 0.052, aspect: 0.52 },
    },
    pal: {
      blade0: [0.10, 0.04, 0.16], blade1: [0.20, 0.08, 0.29],
      veinTint: [0.22, 0.02, 0.24], vein: [1.0, 0.28, 0.85],
      stem0: [0.14, 0.06, 0.20], stem1: [0.26, 0.11, 0.36],
      cell0: [0.09, 0.03, 0.14], cell1: [1.0, 0.45, 0.95],
      bgTop: [0.030, 0.010, 0.045], bgBot: [0.004, 0.002, 0.010],
      bgGlow: [0.07, 0.015, 0.10], fog: [0.04, 0.015, 0.06], fogD: 0.082,
      key: [0.3, 0.85, 0.42], keyCol: [0.62, 0.45, 0.85],
      ambTop: [0.16, 0.08, 0.26], ambBot: [0.03, 0.01, 0.06],
      glow: 0.95, spore: [0.9, 0.4, 1.0],
      pin: [0.85, 0.55, 1.0], spark: [1.0, 0.80, 1.0],
      fruit0: [0.08, 0.05, 0.16], fruit1: [0.95, 0.20, 0.70],
      petal0: [0.32, 0.10, 0.34], petal1: [1.0, 0.42, 0.86], petalVein: [1.0, 0.7, 1.0],
    },
  },
  'Sun Coral': {
    prm: { T: 46, D: 7.2, mu: 0.30, rho: 0.60, b: 3.2 },
    mo: { R: 9.5, rCZ: 2.0, rPZ: 6.2, G: 0.005 },
    sp: {
      elongation: 0.0032, organLen: 3.0, organTilt: 0.5, droop: 0.15,
      maxOrgans: 64, branching: 0.72, maxAxes: 7, maxGen: 3,
      leafOpts: { fenestrate: 0.040, aspect: 0.58 },
    },
    pal: {
      blade0: [0.30, 0.10, 0.04], blade1: [0.56, 0.24, 0.08],
      veinTint: [0.35, 0.22, 0.02], vein: [1.0, 0.85, 0.35],
      stem0: [0.34, 0.12, 0.05], stem1: [0.62, 0.26, 0.09],
      cell0: [0.22, 0.07, 0.03], cell1: [1.0, 0.9, 0.45],
      bgTop: [0.045, 0.020, 0.014], bgBot: [0.008, 0.004, 0.004],
      bgGlow: [0.11, 0.04, 0.015], fog: [0.07, 0.035, 0.02], fogD: 0.058,
      key: [0.45, 0.7, 0.55], keyCol: [1.0, 0.82, 0.60],
      ambTop: [0.26, 0.14, 0.09], ambBot: [0.05, 0.025, 0.02],
      glow: 1.0, spore: [1.0, 0.7, 0.35],
      pin: [1.0, 0.85, 0.50], spark: [1.0, 1.0, 0.80],
      fruit0: [0.22, 0.10, 0.04], fruit1: [1.0, 0.72, 0.15],
      petal0: [0.44, 0.18, 0.06], petal1: [1.0, 0.78, 0.30], petalVein: [1.0, 0.9, 0.5],
    },
  },
};

const BASE_PAL = {
  bloom: 0.38, bloomThresh: 1.15, exposure: 1.04, grain: 0.024, vignette: 0.60,
  sway: 1.0, dof: 0.80, laminaMul: 0.86,
  pin: [0.62, 0.88, 1.0], spark: [1.0, 0.98, 0.86],
  fruit0: [0.10, 0.22, 0.14], fruit1: [0.85, 0.30, 0.22],
  petal0: [0.30, 0.24, 0.42], petal1: [0.72, 0.55, 0.95], petalVein: [1.0, 0.85, 1.0],
};

export class App {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.renderer = new Renderer(canvas);
    this.B = new Buffers();
    this.cam = {
      az: 0.7, el: 0.22, dist: 15, fov: 0.72,
      eye: v3(0, 4, 15), target: v3(0, 4, 0), tgtY: 4,
      autoRot: true, idle: 0,
    };
    this.speciesName = 'Cathedral Fern';
    this.speedMul = 1;
    this.showMeristem = true;
    this.detail = 0;
    this.focus = null;
    this.userDriving = false;
    this.subject = null;
    this.shot = null; this.shotT = 0;
    this.resumeAfter = 16000;
    this.idleT = 0;
    this.ringWidth = 0;
    this.frame = 0;
    this.t = 0;
    this.fps = 60;
    this._acc = 0;
    this.spores = [];
    this.newSpecimen();
    this._bindInput();
  }

  newSpecimen(name = this.speciesName, seed = (Math.random() * 1e6) | 0) {
    this.specimenNo = ('000' + (seed % 9973)).slice(-4);
    const S = SPECIES[name] || SPECIES['Cathedral Fern'];
    this.speciesName = name;
    this.prm = { ...DEFAULT_PRM, ...S.prm };
    this.mo = { ...MERISTEM_DEFAULTS, ...S.mo };
    this.sp = { ...SPECIES_DEFAULTS, ...S.sp };
    this.sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
    this.pal = { ...BASE_PAL, ...S.pal };
    // The lamina is pulled down so the vasculature is the brightest thing in
    // the plant. A leaf should read as light held inside tissue.
    const m = this.pal.laminaMul;
    this.pal.blade0 = this.pal.blade0.map(v => v * m);
    this.pal.blade1 = this.pal.blade1.map(v => v * m);
    // petals share every rendering rule with leaves; only the colours differ
    this.petalPal = { ...this.pal, blade0: this.pal.petal0.map(v => v * m),
      blade1: this.pal.petal1.map(v => v * m), vein: this.pal.petalVein,
      veinTint: this.pal.petal1.map(v => v * 0.25) };
    if (this.ringWidth) this.mo.rOut = this.mo.rCZ + this.ringWidth;
    const fr = mulberry32(seed ^ 0x51ed270b);
    this.sp.fruitOpts = {
      T: lerp(14, 34, fr()), D: lerp(1.8, 4.2, fr()),
      gExp: lerp(1.3, 2.6, fr()), gAux: lerp(0.00035, 0.00075, fr()),
      seedThresh: lerp(1.25, 1.7, fr()),
    };
    this.plant = new Plant(this.prm, this.mo, this.sp, seed);
    this.bbS = null;
    this.cam.dist = 7.5; this.cam.tgtY = 1.4;
    const rnd = mulberry32(seed ^ 0x5bf03635);
    this.spores = [];
    this.shot = null; this.shotT = 0; this.subject = null;
    this.userDriving = false; this.idleT = 0;
    for (let i = 0; i < 220; i++) {
      this.spores.push({
        p: v3((rnd() - 0.5) * 34, rnd() * 26 - 2, (rnd() - 0.5) * 34),
        s: 0.02 + rnd() * 0.05, ph: rnd() * TAU, sp: 0.1 + rnd() * 0.5,
      });
    }
    this.age = 0;
  }

  _bindInput() {
    const c = this.canvas;
    let drag = false, panning = false, lx = 0, ly = 0, pinch = 0, pcx = 0, pcy = 0;

    // Orbit and zoom alone cannot get you onto one leaf — they only ever circle
    // the point the auto-framer chose, which is the middle of the plant. Panning
    // moves that point in the camera's own screen plane, scaled so a pixel drags
    // the same apparent distance however far out you are.
    const pan = (dx, dy) => {
      const cm = this.cam;
      const fwd = v3(); v3norm(fwd, v3sub(fwd, cm.target, cm.eye));
      const right = v3(); v3norm(right, v3cross3(right, fwd, v3(0, 1, 0)));
      const up2 = v3(); v3norm(up2, v3cross3(up2, right, fwd));
      const s = 2 * Math.tan(cm.fov / 2) * cm.dist / Math.max(1, this.renderer.H);
      if (cm.cx === undefined) { cm.cx = cm.target[0]; cm.cz = cm.target[2]; }
      cm.cx += (up2[0] * dy - right[0] * dx) * s;
      cm.tgtY += (up2[1] * dy - right[1] * dx) * s;
      cm.cz += (up2[2] * dy - right[2] * dx) * s;
      cm.idle = 0;
    };

    const down = (x, y, isPan) => {
      drag = true; panning = !!isPan; lx = x; ly = y;
      this.cam.idle = 0; this.cam.autoRot = false; this.takeOver();
    };
    const move = (x, y) => {
      if (!drag) return;
      const dx = x - lx, dy = y - ly;
      if (panning) pan(dx, dy);
      else {
        this.cam.az -= dx * 0.006;
        this.cam.el = clamp(this.cam.el + dy * 0.005, -0.5, 1.35);
      }
      lx = x; ly = y; this.cam.idle = 0;
    };
    const up = () => { drag = false; panning = false; };
    c.addEventListener('pointerdown', e => {
      c.setPointerCapture(e.pointerId);
      // right button or shift-drag pans; shift is there for trackpads
      down(e.clientX, e.clientY, e.button === 2 || e.button === 1 || e.shiftKey);
    });
    c.addEventListener('pointermove', e => move(e.clientX, e.clientY));
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.takeOver();
      // stop the idle drift too, exactly as pointerdown does — without this a
      // wheel-only zoom left autoRot on, which picked the faster damping
      this.cam.autoRot = false;
      this.cam.dist = clamp(this.cam.dist * (1 + Math.sign(e.deltaY) * 0.09), 3, 70);
      this.cam.idle = 0;
    }, { passive: false });
    const centre = (t) => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        [pcx, pcy] = centre(e.touches);
        drag = false;
        this.takeOver();
        this.cam.autoRot = false;
      }
    }, { passive: true });
    c.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.cam.dist = clamp(this.cam.dist * (pinch / Math.max(1, d)), 3, 70);
        pinch = d;
        // and two fingers moving together pan, so touch can reach a leaf too
        const [nx, ny] = centre(e.touches);
        pan(nx - pcx, ny - pcy);
        pcx = nx; pcy = ny;
        this.cam.idle = 0;
      }
    }, { passive: true });
    c.addEventListener('touchend', () => { pinch = 0; }, { passive: true });
  }

  // ---------------------------------------------------------------------------
  // THE DIRECTOR
  //
  // The plant has events now — a leaf unfurling, a flower opening, a fruit
  // swelling, a ripening wave crossing it. This picks which of those to be
  // looking at, holds the shot, and moves on. It hands over the instant the
  // viewer touches anything, and takes back over only if asked.
  // ---------------------------------------------------------------------------
  pickShot() {
    const P = this.plant;
    const prev = this.shot && this.shot.kind;
    const cand = [];
    let liveTip = null;
    for (const ax of P.axes) if (ax.alive && ax.meristem && (!liveTip || ax.tipPos()[1] > liveTip.tipPos()[1])) liveTip = ax;

    for (const ax of P.axes) {
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
        let r = 0;
        for (let i = 0; i < ax.fruit.n; i++) r += ax.fruit.ripe[i];
        r /= ax.fruit.n;
        // a ripening front crossing a fruit is the best thing on screen
        const w = (r > 0.02 && r < 0.97) ? 9 : (ax.fruit.phase === 'grow' ? 6 : 1.2);
        cand.push({ kind: 'fruit', ax, w, dist: 3.4, el: 0.30, hold: 11000 });
      }
      if (ax.floral && !ax.fruit) {
        const open = ax.organs.filter(o => o.petal && (o.dev || 0) > 0.05 && (o.dev || 0) < 0.95).length;
        if (open) cand.push({ kind: 'flower', ax, w: 7, dist: 4.2, el: 0.34, hold: 10000 });
      }
    }
    for (const ax of P.axes) {
      for (const o of ax.organs) {
        if (o.floral || !o.leaf) continue;
        const d = o.dev || 0;
        if (d > 0.14 && d < 0.62) { cand.push({ kind: 'organ', ax, org: o, w: 3.2, dist: 2.6, el: 0.26, hold: 8500 }); break; }
      }
    }
    if (liveTip) cand.push({ kind: 'apex', ax: liveTip, w: P.organCount() < 5 ? 12 : 2.6, hold: 9500 });
    cand.push({ kind: 'wide', w: P.organCount() < 3 ? 0.2 : 5, hold: 12000 });

    let tot = 0;
    for (const c of cand) { if (c.kind === prev) c.w *= 0.22; tot += c.w; }
    let r = this._rnd() * tot;
    for (const c of cand) { r -= c.w; if (r <= 0) return c; }
    return cand[cand.length - 1];
  }

  _rnd() {
    this._rs = ((this._rs || 12345) * 1103515245 + 12345) & 0x7fffffff;
    return this._rs / 0x7fffffff;
  }

  directorStep(dtms) {
    if (this.userDriving) {
      this.subject = null;
      // yielding to touch has to work in both directions: after a while with
      // no input, the film resumes on its own
      this.idleT = (this.idleT || 0) + dtms;
      if (this.idleT > this.resumeAfter) this.giveBack();
      return;
    }
    this.idleT = 0;
    this.shotT = (this.shotT || 0) + dtms;
    if (!this.shot || this.shotT > (this.shot.hold || 10000)) {
      this.shot = this.pickShot();
      this.shotT = 0;
    }
    const sh = this.shot;
    if (sh.kind === 'apex' && (!sh.ax.alive || !sh.ax.meristem)) { this.shot = null; return; }
    this.focus = sh.kind === 'apex' ? 'apex' : null;
    this.subject = (sh.kind === 'fruit' || sh.kind === 'flower' || sh.kind === 'organ') ? sh : null;
  }

  takeOver() {
    this.idleT = 0;
    if (this.userDriving) return;
    this.userDriving = true;
    this.subject = null;
    if (this.onHandover) this.onHandover();
  }
  giveBack() {
    this.userDriving = false;
    this.focus = null;
    this.shot = null; this.shotT = 0;
    this.cam.autoRot = true;
  }

  // --------------------------------------------------------------------------
  step(dtms) {
    // step count follows real time, so growth looks the same on a slow device
    this._acc += this.speedMul * dtms / 8;
    const steps = clamp(Math.floor(this._acc), 0, 6);
    this._acc -= steps;
    for (let i = 0; i < steps; i++) this.plant.step(1);
    this.age += steps;
    this.t += dtms;

    this.directorStep(dtms);

    // camera: frame whatever the specimen has actually become
    const c = this.cam;
    c.idle += dtms;
    // Resuming the drift is the film's business, and giveBack() owns it. Flipping
    // it back on after 6s while the viewer was still driving also switched the
    // framing damping from 0.035 to 0.10, so a wheel zoom was dragged back three
    // times faster than a drag was.
    if (c.idle > 6000 && !this.userDriving) c.autoRot = true;
    if (c.autoRot) c.az += dtms * 0.000042;
    // The raw bounding box jumps every time an organ appears. Smooth it first,
    // then smooth the camera against it — two stages of damping is the
    // difference between a camera that drifts and one that twitches.
    const raw = this.plant.bounds();
    const bs = this.bbS || (this.bbS = { ...raw });
    // damping expressed as a time constant, so a slow device and a fast one
    // settle at the same rate rather than the same number of frames
    const damp = (rate) => 1 - Math.exp(-rate * dtms / 16.67);
    const kb = damp(0.075);
    bs.cx = lerp(bs.cx, raw.cx, kb); bs.cy = lerp(bs.cy, raw.cy, kb);
    bs.cz = lerp(bs.cz, raw.cz, kb);
    bs.w = lerp(bs.w, raw.w, kb); bs.h = lerp(bs.h, raw.h, kb);
    const bb = bs;
    // Fit the specimen into the clear part of the frame — the panel owns the
    // bottom, so the subject is fitted to 66% of the height and biased upward.
    const aspect = Math.max(0.45, this.renderer.W / this.renderer.H);
    // Fit the specimen's bounding sphere. Horizontal FOV is the wider of the
    // two on a landscape canvas, so the vertical one is what binds.
    const halfV = c.fov / 2;
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    const hh = bb.h / 2, hw = bb.w / 2;
    // fit height into 66% of the frame (the panel owns the bottom) and width
    // into 86%, then step back far enough to clear the near side of the plant
    const distV = (hh / 0.66) / Math.tan(halfV);
    const distH = (hw / 0.86) / Math.tan(halfH);
    let want = clamp(Math.max(distV, distH) + hw * 0.9 + 1.2, 5, 120);
    let aimY = bb.cy - hh * 0.14, aimX = bb.cx, aimZ = bb.cz;
    const sub = this.subject;
    if (sub) {
      let p = null, scale = 1;
      if (sub.kind === 'fruit') { p = sub.ax.tipPos(); scale = this.sp.fruitScale * 1.6; }
      else if (sub.kind === 'flower') { p = sub.ax.tipPos(); scale = Math.max(0.5, sub.ax.length * 0.6); }
      else if (sub.kind === 'organ' && sub.org) { p = sub.org.frame.o; scale = Math.max(0.6, sub.org.len * 0.7); }
      if (p) {
        aimX = p[0]; aimY = p[1]; aimZ = p[2];
        want = clamp(scale * sub.dist, 1.6, 40);
        c.el = lerp(c.el, sub.el, damp(0.03));
      }
    }
    if (this.focus === 'apex') {
      // sit right off the growing point, close enough that single cells resolve
      let best = null;
      for (const ax of this.plant.axes) if (ax.alive && (!best || ax.tipPos()[1] > best.tipPos()[1])) best = ax;
      if (!best) best = this.plant.main;
      const tp = best.tipPos();
      const ms = Math.max(0.35, best.radii[best.radii.length - 1] * 5.5);
      want = ms * 5.6;
      aimX = tp[0]; aimY = tp[1] + ms * 0.22; aimZ = tp[2];
      // look down onto the dome — the spiral is only legible from above
      c.el = lerp(c.el, 0.78, damp(0.05));
    }
    // While the viewer is driving, the auto-framer has to keep its hands off the
    // camera. This block used to run unconditionally: a wheel event set `dist`,
    // and the very next frame lerped it straight back to the fitted distance, so
    // zooming in visibly sprang back out. Orbit escaped only because `az`/`el`
    // are not fitted here — which is exactly how the bug presented, "zoom fights
    // me, orbit is fine". `userDriving` gated the director's choice of shot but
    // never the framing.
    const k = damp(c.autoRot ? 0.10 : 0.035);
    if (c.cx === undefined) { c.cx = aimX; c.cz = aimZ; }
    if (!this.userDriving) {
      c.dist = lerp(c.dist, want, k);
      c.tgtY = lerp(c.tgtY, aimY, k);
      c.cx = lerp(c.cx, aimX, k);
      c.cz = lerp(c.cz, aimZ, k);
    }
    v3set(c.target, c.cx, c.tgtY, c.cz);
    // fog begins where the subject does
    c.fogNear = Math.max(0, c.dist - Math.max(hh, hw) * 1.1);
    // only things well off the plane the camera is looking at go soft
    c.dofRange = Math.max(2.0, Math.max(hh, hw) * 0.62);
    const ce = Math.cos(c.el), se = Math.sin(c.el);
    v3set(c.eye,
      c.target[0] + Math.sin(c.az) * ce * c.dist,
      c.target[1] + se * c.dist,
      c.target[2] + Math.cos(c.az) * ce * c.dist);

    for (const s of this.spores) {
      s.p[1] += s.sp * 0.004 * dtms * 0.06;
      s.p[0] += Math.sin(this.t * 0.0004 + s.ph) * 0.004;
      if (s.p[1] > 26) s.p[1] = -2;
    }
  }

  buildScene() {
    const B = this.B, pal = this.pal, P = this.plant;
    B.reset();
    // spend the vertex budget where there is something to see: a specimen with
    // sixty fronds gets a coarser surface than one with six
    // vein ribbons face the camera and never get thinner than a pixel or so
    const px = 2 * Math.tan(this.cam.fov / 2) / Math.max(1, this.renderer.H);
    setView(this.cam.eye, this.cam.dist * px * 1.5);
    this.detail = 0;
    // when the camera has gone in to look at a growing tip, anything between it
    // and that tip is in the way — drop it rather than let a leaf fill the frame
    let cullFrom = null, cullR = 0;
    const sb = this.subject;
    if (sb && (sb.kind === 'fruit' || sb.kind === 'flower')) {
      cullFrom = sb.ax.tipPos();
      cullR = Math.hypot(this.cam.eye[0] - cullFrom[0], this.cam.eye[1] - cullFrom[1],
        this.cam.eye[2] - cullFrom[2]) - this.sp.fruitScale * 2.2;
    } else if (this.focus === 'apex') {
      let best = null;
      for (const ax of P.axes) if (ax.alive && (!best || ax.tipPos()[1] > best.tipPos()[1])) best = ax;
      if (best) {
        cullFrom = best.tipPos();
        cullR = Math.hypot(this.cam.eye[0] - cullFrom[0], this.cam.eye[1] - cullFrom[1],
          this.cam.eye[2] - cullFrom[2]) - Math.max(0.35, best.radii[best.radii.length - 1] * 5.5) * 1.15;
      }
    }
    const nOrg = P.organCount();
    const fen = (this.sp.leafOpts.fenestrate || 0) > 0;
    this.bladeMU = nOrg > 42 ? (fen ? 17 : 13) : nOrg > 24 ? 18 : 22;
    this.bladeMV = nOrg > 42 ? (fen ? 9 : 6) : nOrg > 24 ? 8 : 10;
    for (const ax of P.axes) {
      const nseg = ax.pts.length;
      if (nseg > 1) {
        tube(B, ax.pts, ax.radii, 7, (t) => ({
          c: [lerp(pal.stem0[0], pal.stem1[0], t), lerp(pal.stem0[1], pal.stem1[1], t), lerp(pal.stem0[2], pal.stem1[2], t)],
          e: t > 0.93 && ax.alive ? (t - 0.93) * 5.0 * pal.glow : 0,
        }));
      }
      for (const org of ax.organs) {
        if (org.len < 0.02) continue;
        if (cullFrom) {
          const dq = Math.hypot(this.cam.eye[0] - org.frame.o[0], this.cam.eye[1] - org.frame.o[1],
            this.cam.eye[2] - org.frame.o[2]);
          if (dq < cullR) continue;
        }
        const L = org.leaf;
        // petiole
        const a = org.frame.o;
        // a longer stalk carries the blade clear of the shoot and its neighbours
        const pet = org.len * 0.34 + org.radius * 1.8;
        const b = v3(a[0] + org.frame.x[0] * pet,
          a[1] + org.frame.x[1] * pet,
          a[2] + org.frame.x[2] * pet);
        tube(B, [a, b], [org.radius * 0.5, org.radius * 0.30], 5, () => ({ c: pal.stem1, e: 0 }));
        if (!L || !L.margin || !L.margin.mature) continue;
        const fr = { o: b, x: org.frame.x, y: org.frame.y, z: org.frame.z };
        // blades unfurl rather than appearing at full size
        // one development parameter: the blade lengthens, the wave of
        // maturation runs out along it, and the furled tip uncoils behind it
        const dev = clamp((org.dev || 0) * 1.06 - 0.03, 0, 1);
        const bl = org.len * 0.80;
        if (bl < 0.02) continue;
        const bp = org.petal ? this.petalPal : pal;
        blade(B, L, fr, bl, bl, bp, -bl * (org.petal ? 0.05 : 0.16), bl * 0.014,
          bp.glow, this.bladeMU, this.bladeMV, dev);
      }
      // the fruit, if this shoot got that far
      if (ax.fruit && !ax.fruit.barren && ax.fruit.phase !== 'pattern') {
        const n2 = ax.pts.length;
        const tip = ax.pts[n2 - 1];
        const fs = this.sp.fruitScale * (ax.gen === 0 ? 1 : 0.72);
        fruitShell(B, ax.fruit, tip, fs, pal);
      }

      // the growing point itself
      if (this.showMeristem && ax.alive && ax.meristem) {
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
        // the mechanism fades up as you approach — no mode to find, you just
        // come closer and the cells start showing what they are doing
        const dEye = Math.hypot(this.cam.eye[0] - tip[0], this.cam.eye[1] - tip[1], this.cam.eye[2] - tip[2]);
        const det = smoothstep(0.030, 0.105, mScale / Math.max(0.01, dEye));
        if (det > this.detail) this.detail = det;
        meristemDome(B, ax.meristem, { o: tip, x: dir, y: e2, z: e1 },
          mScale, pal, this.t, det);
      }
    }
    for (const s of this.spores) B.point(s.p, pal.spore, s.s * 0.9);
    this.renderer.upload(B);
  }

  render() {
    // ease the bloom off as the cells resolve, so detail is not washed away
    const p = this.pal;
    const keep = p._bloom === undefined ? (p._bloom = p.bloom) : p._bloom;
    p.bloom = keep * (1 - 0.55 * this.detail);
    this.renderer.draw(this.cam, this.pal, this.t);
    p.bloom = keep;
  }
}

// tiny local cross to avoid an import cycle in the hot path
function v3cross3(o, a, b) {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  o[0] = x; o[1] = y; o[2] = z; return o;
}
