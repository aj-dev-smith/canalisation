// REACH OVER A LIFE. One specimen, reach sampled every 200 steps — because a
// reach table taken at one step is a statement about that step, and the field
// harness found an Ember Creeper columbine at maxR 70 where the 3000-step
// table said 7.4.
//
//   node scratch/arc.mjs '{"species":"Ember Creeper","form":"columbine","seed":63373"}'
import { M } from './loader.mjs';

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const species = arg.species || 'Ember Creeper';
const form = arg.form || 'columbine';
const seed = arg.seed ?? 21;
const end = arg.end ?? 4000;
const hold = arg.hold !== false;

const env = M.flEnv();
const S = M.App.prototype.makeSpecimen.call(env, species, seed, [0, 0, 0]);
if (hold) S.plant.sp.senesceHold = true;
M.flApplyForm(S, species, seed, new URLSearchParams('form=' + form));

const B = new M.FlowerBuffers();
env.cam.eye = [0, 3, 60]; env.cam.dist = 60;
M.setView(env.cam.eye, 0.004, 0);

console.log(`${species} ${form} seed ${seed} hold=${hold}`);
console.log('step  stage        organs  axes  maxR   r90   r50   ymin   ymax   shed');
for (let w = 0; w <= end; w++) {
  S.plant.step(1);
  if (w % 200) continue;
  env.t = w;
  B.reset();
  M.flDrawSpecimen(env, B, S);
  const rs = [];
  let ymin = 1e9, ymax = -1e9;
  for (let k = 0; k < B.triN; k += 10) {
    rs.push(Math.hypot(B.tri[k], B.tri[k + 2]));
    ymin = Math.min(ymin, B.tri[k + 1]); ymax = Math.max(ymax, B.tri[k + 1]);
  }
  for (let k = 0; k < B.petbN; k += 16) {
    rs.push(Math.hypot(B.petb[k], B.petb[k + 2]));
    ymin = Math.min(ymin, B.petb[k + 1]); ymax = Math.max(ymax, B.petb[k + 1]);
  }
  rs.sort((a, b) => a - b);
  const Q = (p) => rs.length ? rs[Math.min(rs.length - 1, Math.floor(p * rs.length))] : 0;
  let organs = 0, shed = 0;
  for (const ax of S.plant.axes) for (const o of ax.organs) {
    organs++;
    if (o.shed || o.fallen || o.detached) shed++;
  }
  console.log(`${String(w).padStart(4)}  ${S.plant.stage().padEnd(11)}  ` +
    `${String(organs).padStart(6)}  ${String(S.plant.axes.length).padStart(4)}  ` +
    `${Q(0.999).toFixed(1).padStart(5)} ${Q(0.9).toFixed(1).padStart(5)} ${Q(0.5).toFixed(1).padStart(5)}  ` +
    `${ymin.toFixed(1).padStart(6)} ${ymax.toFixed(1).padStart(6)}  ${String(shed).padStart(4)}`);
}
