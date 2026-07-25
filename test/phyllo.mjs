import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';

const overrides = JSON.parse(process.argv[2] || '{}');
const mOver = JSON.parse(process.argv[3] || '{}');
const prm = { ...DEFAULT_PRM, ...overrides };

const m = new Meristem(prm, mOver, 7);
const STEPS = +(process.env.STEPS || 2600);
const t0 = Date.now();
for (let i = 0; i < STEPS; i++) m.step(1);
const ms = Date.now() - t0;

const st = m.divergenceStats(60);
const amax = Math.max(...m.F.a.slice(0, m.F.n));
const amean = m.F.a.slice(0, m.F.n).reduce((s, v) => s + v, 0) / m.F.n;
console.log(JSON.stringify({
  cells: m.F.n,
  primordiaTotal: m.divergence.length + 1,
  live: m.primordia.length,
  plastochron: +m.plastochron.toFixed(2),
  auxin: { mean: +amean.toFixed(2), max: +amax.toFixed(2) },
  divergence: st ? { mean: +st.mean.toFixed(2), sd: +st.sd.toFixed(2), n: st.n, handed: st.handed } : null,
  last12: m.divergence.slice(-12).map(v => +(v * 180 / Math.PI).toFixed(1)),
  msPerStep: +(ms / STEPS).toFixed(3),
}));
