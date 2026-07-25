import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const cfgs = JSON.parse(process.argv[2]);
const STEPS = +(process.env.STEPS || 9000);
for (const c of cfgs) {
  const prm = { ...DEFAULT_PRM, mu:0.3, rho:0.6, ...(c.prm||{}) };
  const m = new Meristem(prm, { G: 0.008, ...(c.mo||{}) }, c.seed ?? 3);
  const times = []; let last = m.emitted.length;
  for (let s = 0; s < STEPS; s++) { m.step(1); while (m.emitted.length > last) { times.push(s); last++; } }
  // is a primordium still a local auxin maximum, as it must be?
  let pa = 0, pc = 0;
  for (const p of m.primordia) {
    let best = 0;
    for (let i = 0; i < m.F.n; i++) if (Math.hypot(m.F.x[i]-p.x, m.F.y[i]-p.y) < 1.2) best = Math.max(best, m.F.a[i]);
    if (best) { pa += best; pc++; }
  }
  const s15 = m.divergenceStats(15), s40 = m.divergenceStats(40); const sp = m.spatialDivergence();
  const g = times.slice(1).map((t,i)=>t-times[i]).slice(-20);
  const gm = g.reduce((a,b)=>a+b,0)/(g.length||1);
  console.log(JSON.stringify({ tag:c.tag,
    settled: s15 ? {mean:+s15.mean.toFixed(1), sd:+s15.sd.toFixed(1), lock:+s15.lock.toFixed(2)} : null,
    all40: s40 ? {mean:+s40.mean.toFixed(1), sd:+s40.sd.toFixed(1)} : null,
    organs: times.length, gapMean:+gm.toFixed(0), live:m.primordia.length,
    aMean:+m.aMean.toFixed(2), primA:+(pc?pa/pc:0).toFixed(2),
    peakRatio: +(pc? (pa/pc)/m.aMean : 0).toFixed(1),
    spatial: sp ? {mean:+sp.mean.toFixed(1), sd:+sp.sd.toFixed(1), vals: sp.vals.map(v=>+v.toFixed(0))} : null,
    last12: m.divergence.slice(-12).map(v=>+(v*180/Math.PI).toFixed(0)) }));
}
