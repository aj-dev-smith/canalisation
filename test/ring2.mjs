// EXPERIMENT 2: does confining initiation to a thin generative ring
// (so sites cannot slot in at a different radius) tighten the angle?
import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const [shard, nshard] = [+process.argv[2] || 0, +process.argv[3] || 1];
const STEPS = +(process.env.STEPS || 6000);
const BASE = { T: 40, D: 6, mu: 0.30, rho: 0.60, b: 3 };
const runs = [];
for (const [cz, out] of [[2.4, 0], [2.6, 3.8], [2.6, 4.4], [3.0, 4.4], [3.0, 5.2], [3.4, 5.0], [2.2, 3.4]])
  for (const cw of [0.5, 0.9])
    runs.push({ cz, out, cw });
for (let i = shard; i < runs.length; i += nshard) {
  const r = runs[i];
  const res = [];
  for (const seed of [3, 21, 44]) {
    const prm = { ...DEFAULT_PRM, ...BASE };
    const m = new Meristem(prm, { R: 10, rCZ: r.cz, rOut: r.out, rPZ: 6.8, G: 0.003,
      detectA: 1.7, czWidth: r.cw }, seed);
    let e = 0; const times = [];
    for (let s = 0; s < STEPS; s++) { m.step(1); while (m.emitted.length > e) { times.push(s); e++; } }
    res.push({ st: m.divergenceStats(15), organs: times.length, live: m.primordia.length });
  }
  const ok = res.filter(x => x.st);
  console.log(JSON.stringify({
    cz: r.cz, rOut: r.out, cw: r.cw,
    sd: ok.length ? +(ok.reduce((a, o) => a + o.st.sd, 0) / ok.length).toFixed(1) : null,
    mean: ok.length ? +(ok.reduce((a, o) => a + o.st.mean, 0) / ok.length).toFixed(1) : null,
    lock: ok.length ? +(ok.reduce((a, o) => a + o.st.lock, 0) / ok.length).toFixed(2) : null,
    organs: Math.round(res.reduce((a, o) => a + o.organs, 0) / res.length),
    live: Math.round(res.reduce((a, o) => a + o.live, 0) / res.length),
  }));
}
