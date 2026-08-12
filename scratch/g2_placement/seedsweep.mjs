// IS THE REACH TABLE A STATEMENT ABOUT A SPECIES OR ABOUT A SEED? The first
// table was one seed (21) and the grown field then produced an Ember Creeper
// columbine at maxR 70 where that table said 7.4. Sweep the seeds a garden
// actually deals: baseSeed + i*7919.
import { M } from './loader.mjs';

const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const steps = arg.steps ?? 3000;
const seeds = arg.seeds || [21, 7940, 15859, 23778, 31697];
const names = Object.keys(M.SPECIES).filter(n => n !== 'Ashfall Spire');

function measure(name, form, sd) {
  const env = M.flEnv();
  const S = M.App.prototype.makeSpecimen.call(env, name, sd, [0, 0, 0]);
  S.plant.sp.senesceHold = true;
  M.flApplyForm(S, name, sd, new URLSearchParams('form=' + form));
  for (let i = 0; i < steps; i++) S.plant.step(1);
  const B = new M.FlowerBuffers();
  env.cam.eye = [0, 3, 60]; env.cam.dist = 60;
  M.setView(env.cam.eye, 0.004, 0);
  env.t = steps; B.reset();
  M.flDrawSpecimen(env, B, S);
  const rs = [];
  for (let k = 0; k < B.triN; k += 10) rs.push(Math.hypot(B.tri[k], B.tri[k + 2]));
  for (let k = 0; k < B.petbN; k += 16) rs.push(Math.hypot(B.petb[k], B.petb[k + 2]));
  rs.sort((a, b) => a - b);
  const Q = (p) => rs.length ? rs[Math.min(rs.length - 1, Math.floor(p * rs.length))] : 0;
  return { max: Q(0.999), r90: Q(0.90) };
}

console.log(`reach over ${seeds.length} seeds at ${steps} steps  (maxR / r90)`);
console.log('species              form        ' + seeds.map(s => String(s).padStart(13)).join(''));
const allMax = [], all90 = [];
for (const name of names) {
  for (const form of M.FL_FORMS) {
    const cells = seeds.map(sd => {
      const m = measure(name, form, sd);
      allMax.push(m.max); all90.push(m.r90);
      return `${m.max.toFixed(1).padStart(6)}/${m.r90.toFixed(1).padStart(5)} `;
    });
    console.log(`${name.padEnd(20)} ${form.padEnd(10)}  ${cells.join('')}`);
  }
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log(`\nover ${allMax.length} cells:`);
console.log(`  maxR  p10 ${q(allMax,0.1).toFixed(1)}  med ${q(allMax,0.5).toFixed(1)}  p75 ${q(allMax,0.75).toFixed(1)}  p90 ${q(allMax,0.9).toFixed(1)}  max ${q(allMax,1).toFixed(1)}`);
console.log(`  r90   p10 ${q(all90,0.1).toFixed(1)}  med ${q(all90,0.5).toFixed(1)}  p75 ${q(all90,0.75).toFixed(1)}  p90 ${q(all90,0.9).toFixed(1)}  max ${q(all90,1).toFixed(1)}`);
