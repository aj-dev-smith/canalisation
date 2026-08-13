// THE FIELD, GROWN. Take the shipped plan for a garden and actually grow it
// on the boot loop's clock (age = max(0, world - startAt)), then answer the
// two questions the plan alone cannot:
//   1. do any two specimens INTERPENETRATE at maturity? Measured off the drawn
//      streams at each specimen's own origin, body (r90) and arm (max).
//   2. what does a viewer SEE at step 600 / 1200 / 2400 / 3600 — how many are
//      up, how many are flowering, how many organs each.
//
//   node scratch/field.mjs '{"n":7,"seed":21}'
import { M } from './loader.mjs';

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const n = arg.n ?? 7;
const seed = arg.seed ?? 21;
const MARKS = arg.marks || [600, 1200, 2400, 3600];
const END = MARKS[MARKS.length - 1];

const plan = M.flGardenPlan(seed, n, {});
const wind = null;
const specs = plan.map((p) => {
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, p.name, p.seed, p.origin);
  S.plant.sp.senesceHold = true;
  const form = M.flApplyForm(S, p.name, p.seed, new URLSearchParams());
  return { env, S, p, form, age: 0 };
});

function snap(s) {
  let organs = 0, fl = 0, petals = 0;
  for (const ax of s.S.plant.axes) {
    organs += ax.organs.length;
    if (ax.floral) fl++;
    for (const o of ax.organs) if (o.petal) petals++;
  }
  return { organs, fl, petals };
}

console.log(`garden of ${n}, seed ${seed}\n`);
console.log('#  species              form        origin           d(hero)  startAt');
for (let i = 0; i < specs.length; i++) {
  const p = specs[i].p;
  console.log(`${i}  ${p.name.padEnd(20)} ${specs[i].form.padEnd(10)}  ` +
    `(${p.origin[0].toFixed(1).padStart(6)},${p.origin[2].toFixed(1).padStart(6)})  ` +
    `${Math.hypot(p.origin[0], p.origin[2]).toFixed(1).padStart(6)}  ${String(p.startAt).padStart(6)}`);
}

console.log('\nWHAT A VIEWER SEES (world step -> per-specimen organ count, * = flowering):');
let world = 0;
for (const mark of MARKS) {
  while (world < mark) {
    world++;
    for (const s of specs) if (world > s.p.startAt) { s.S.plant.step(1); s.age++; }
  }
  const rows = specs.map((s) => {
    if (s.age === 0) return '   -';
    const c = snap(s);
    return `${String(c.organs).padStart(4)}${c.fl ? '*' : ' '}`;
  });
  const up = specs.filter(s => s.age > 0).length;
  const flow = specs.filter(s => s.age > 0 && snap(s).fl > 0).length;
  console.log(`  step ${String(mark).padStart(4)}:  ${up}/${n} up, ${flow} flowering   [${rows.join('')}]`);
}

console.log('\nWHAT EACH ONE OCCUPIES AT STEP ' + END + ' (drawn streams, radius off its OWN origin):');
const reach = [];
for (let i = 0; i < specs.length; i++) {
  const s = specs[i];
  const B = new M.FlowerBuffers();
  s.env.cam.eye = [0, 3, 60]; s.env.cam.dist = 60;
  M.setView(s.env.cam.eye, 0.004, 0);
  s.env.t = s.age;
  B.reset();
  M.flDrawSpecimen(s.env, B, s.S);
  const rs = [];
  const ox = s.p.origin[0], oz = s.p.origin[2];
  for (let k = 0; k < B.triN; k += 10) rs.push(Math.hypot(B.tri[k] - ox, B.tri[k + 2] - oz));
  for (let k = 0; k < B.petbN; k += 16) rs.push(Math.hypot(B.petb[k] - ox, B.petb[k + 2] - oz));
  rs.sort((a, b) => a - b);
  const Q = (p) => rs[Math.min(rs.length - 1, Math.floor(p * rs.length))];
  reach.push({ max: Q(0.999), r90: Q(0.90), r50: Q(0.5) });
  console.log(`${i}  ${s.p.name.padEnd(20)} ${s.form.padEnd(10)}  ` +
    `maxR ${Q(0.999).toFixed(2).padStart(6)}  r90 ${Q(0.90).toFixed(2).padStart(6)}  r50 ${Q(0.5).toFixed(2).padStart(6)}`);
}

console.log('\nPAIRWISE (gap = centre distance - both reaches; negative = overlap):');
let bodyBad = 0, armBad = 0, worstBody = 1e9, worstArm = 1e9;
for (let i = 0; i < n; i++) {
  for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(plan[i].origin[0] - plan[j].origin[0],
      plan[i].origin[2] - plan[j].origin[2]);
    const gb = d - reach[i].r90 - reach[j].r90;
    const ga = d - reach[i].max - reach[j].max;
    if (gb < 0) { bodyBad++; }
    if (ga < 0) { armBad++; }
    worstBody = Math.min(worstBody, gb); worstArm = Math.min(worstArm, ga);
  }
}
const pairs = n * (n - 1) / 2;
console.log(`  BODIES overlapping: ${bodyBad}/${pairs}   worst body gap ${worstBody.toFixed(2)}`);
console.log(`  ARMS   overlapping: ${armBad}/${pairs}   worst arm  gap ${worstArm.toFixed(2)}`);
