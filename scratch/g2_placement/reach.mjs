// WHAT DOES ONE SPECIMEN OCCUPY? Grow every species in every form, capture
// its drawn streams, and take the horizontal reach off the geometry that is
// actually on screen. This is the number FL_GARDEN_SPACING has to be sized
// from — the shipped 2.5 was set by eye and a single flower's floralBounds is
// 3.70, so plants grew through each other.
//
//   node scratch/reach.mjs '{"steps":3000}'
import { M } from './loader.mjs';

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const steps = arg.steps ?? 3000;
const forms = arg.forms ? arg.forms.split(',') : M.FL_FORMS;
const names = arg.species ? [arg.species]
  : Object.keys(M.SPECIES).filter(n => n !== 'Ashfall Spire');
const seed = arg.seed ?? 21;

function measure(name, form, sd) {
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, name, sd, [0, 0, 0]);
  S.plant.sp.senesceHold = true;
  M.flApplyForm(S, name, sd, new URLSearchParams('form=' + form));
  for (let i = 0; i < steps; i++) S.plant.step(1);

  const B = new M.FlowerBuffers();
  env.cam.eye = [0, 3, 30]; env.cam.dist = 30;
  M.setView(env.cam.eye, 0.004, 0);
  env.t = steps;
  B.reset();
  M.flDrawSpecimen(env, B, S);

  // DRAWN reach: hypot(x, z) over every vertex the capture emitted. The MAX is
  // one flopping peduncle; the QUANTILES are the body — the radius most of the
  // specimen's drawn area actually lives inside.
  const rs = [];
  let ymax = 0;
  for (let k = 0; k < B.triN; k += 10) {
    rs.push(Math.hypot(B.tri[k], B.tri[k + 2]));
    if (B.tri[k + 1] > ymax) ymax = B.tri[k + 1];
  }
  for (let k = 0; k < B.petbN; k += 16) {
    rs.push(Math.hypot(B.petb[k], B.petb[k + 2]));
    if (B.petb[k + 1] > ymax) ymax = B.petb[k + 1];
  }
  rs.sort((a, b) => a - b);
  const Q = (p) => rs.length ? rs[Math.min(rs.length - 1, Math.floor(p * rs.length))] : 0;
  const drawn = Q(0.999), r90 = Q(0.90), r50 = Q(0.50);
  // the brief's reach: organ frame origin + organ length
  let frame = 0;
  for (const ax of S.plant.axes) {
    for (const org of ax.organs) {
      if (!org.frame || org.len < 0.05) continue;
      const o = org.frame.o;
      frame = Math.max(frame, Math.hypot(o[0], o[2]) + org.len);
    }
    for (const p of ax.pts) frame = Math.max(frame, Math.hypot(p[0], p[2]));
  }
  // the biggest corolla
  let floralR = 0, nfl = 0;
  for (let ai = 0; ai < S.plant.axes.length; ai++) {
    if (!S.plant.axes[ai].floral) continue;
    nfl++;
    const bb = B.floralBounds(ai);
    if (bb) floralR = Math.max(floralR, bb.r);
  }
  let organs = 0;
  for (const ax of S.plant.axes) organs += ax.organs.length;
  return { drawn, r90, r50, frame, floralR, nfl, organs, ymax };
}

console.log(`reach at ${steps} steps, seed ${seed}  (units; WORLD.unitM 0.0625 m/unit)`);
console.log('species                 form        maxR    r90    r50  frameR  floralR  axes  organs  height');
const per = {}, per90 = {};
const all = [], all90 = [];
for (const name of names) {
  for (const form of forms) {
    const m = measure(name, form, seed);
    per[name] = Math.max(per[name] || 0, m.drawn);
    per90[name] = Math.max(per90[name] || 0, m.r90);
    all.push(m.drawn); all90.push(m.r90);
    console.log(
      `${name.padEnd(22)}  ${form.padEnd(10)}  ${m.drawn.toFixed(2).padStart(5)}  ` +
      `${m.r90.toFixed(2).padStart(5)}  ${m.r50.toFixed(2).padStart(5)}  ` +
      `${m.frame.toFixed(2).padStart(6)}  ${m.floralR.toFixed(2).padStart(7)}  ` +
      `${String(m.nfl).padStart(4)}  ${String(m.organs).padStart(6)}  ${m.ymax.toFixed(2).padStart(6)}`);
  }
}
const stat = (a) => { const s = a.slice().sort((x, y) => x - y);
  return `min ${s[0].toFixed(2)} med ${s[(s.length / 2) | 0].toFixed(2)} max ${s[s.length - 1].toFixed(2)}`; };
console.log(`\nover all ${all.length} (species x form) cells:  maxR ${stat(all)}   r90 ${stat(all90)}`);
console.log(`FULL clearance (maxR) of two medians = ${((all.slice().sort((a,b)=>a-b)[(all.length/2)|0]) * 2).toFixed(1)} units`);
console.log(`BODY clearance (r90) of two medians = ${((all90.slice().sort((a,b)=>a-b)[(all90.length/2)|0]) * 2).toFixed(1)} units`);
console.log('per-species worst maxR', JSON.stringify(per));
console.log('per-species worst r90 ', JSON.stringify(per90));
