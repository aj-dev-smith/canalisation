// EXPERIMENT: does an inhibition length scale decoupled from the pattern
// wavelength tighten the divergence angle?
import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';

const [shard, nshard] = [+process.argv[2] || 0, +process.argv[3] || 1];
const STEPS = +(process.env.STEPS || 6000);
const BASE = { T: 40, D: 6, mu: 0.30, rho: 0.60, b: 3 };
const GEO = { R: 10, rCZ: 2.4, rPZ: 6.8, G: 0.003, detectA: 1.7 };

const runs = [];
runs.push({ tag: 'baseline (auxin only)', L: 0, kI: 0, prm: { rhoI: 0 } });
for (const [muI, L] of [[0.30, 4.5], [0.10, 7.7], [0.04, 12.2], [0.02, 17.3]])
  for (const kI of [0.15, 0.4, 1.0, 2.5])
    runs.push({ tag: `L=${L} kI=${kI}`, L, kI, prm: { rhoI: 1.0, DI: 6, muI, kI } });

for (let i = shard; i < runs.length; i += nshard) {
  const r = runs[i];
  const out = [];
  for (const seed of [3, 21]) {
    const prm = { ...DEFAULT_PRM, ...BASE, ...r.prm };
    const m = new Meristem(prm, GEO, seed);
    let emitted = 0; const times = [];
    for (let s = 0; s < STEPS; s++) {
      m.step(1);
      while (m.emitted.length > emitted) { times.push(s); emitted++; }
    }
    const st = m.divergenceStats(15);
    // how much of the competent tissue is being suppressed?
    let sup = 0, tot = 0;
    for (let j = 0; j < m.F.n; j++) {
      const rr = Math.hypot(m.F.x[j], m.F.y[j]);
      if (rr > GEO.rCZ && rr < GEO.rPZ) { tot++; if (m.F.comp[j] < 0.5) sup++; }
    }
    const g = times.slice(1).map((t, k) => t - times[k]).slice(-15);
    out.push({ st, organs: times.length, live: m.primordia.length,
      sup: tot ? sup / tot : 0, gap: g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0 });
  }
  const ok = out.filter(o => o.st);
  const rec = {
    tag: r.tag, L: r.L, kI: r.kI,
    sd: ok.length ? +(ok.reduce((a, o) => a + o.st.sd, 0) / ok.length).toFixed(1) : null,
    mean: ok.length ? +(ok.reduce((a, o) => a + o.st.mean, 0) / ok.length).toFixed(1) : null,
    lock: ok.length ? +(ok.reduce((a, o) => a + o.st.lock, 0) / ok.length).toFixed(2) : null,
    organs: Math.round(out.reduce((a, o) => a + o.organs, 0) / out.length),
    live: Math.round(out.reduce((a, o) => a + o.live, 0) / out.length),
    suppressed: +(out.reduce((a, o) => a + o.sup, 0) / out.length).toFixed(2),
    gap: Math.round(out.reduce((a, o) => a + o.gap, 0) / out.length),
  };
  console.log(JSON.stringify(rec));
}
