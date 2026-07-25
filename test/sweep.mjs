import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const [shard, nshard] = [ +process.argv[2], +process.argv[3] ];
const grid = [];
for (const T of [10, 14, 20, 30])
 for (const D of [3, 4.5, 6])
  for (const S of [1.5, 2.5, 4])
   for (const sig of [2.2, 3.0])
     grid.push({T,D,S,sig});
for (let i = shard; i < grid.length; i += nshard) {
  const g = grid[i];
  const prm = { ...DEFAULT_PRM, T: g.T, D: g.D, mu: 0.3, rho: 0.6 };
  const m = new Meristem(prm, { G: 0.0026, sinkStrength: g.S, sinkSigma: g.sig }, 3);
  for (let s = 0; s < 4000; s++) m.step(1);
  const st = m.divergenceStats(40);
  if (!st) { console.log(JSON.stringify({...g, fail:'no primordia'})); continue; }
  console.log(JSON.stringify({ ...g, mean:+st.mean.toFixed(1), sd:+st.sd.toFixed(1), lock:+st.lock.toFixed(2), n:st.n, plast:+m.plastochron.toFixed(0), live:m.primordia.length }));
}
