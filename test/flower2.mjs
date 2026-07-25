import { Plant } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
const prm = { ...DEFAULT_PRM, T:40, D:6, mu:0.3, rho:0.6, b:3 };
const mo = { ...MERISTEM_DEFAULTS, R:10, rCZ:2.4, rPZ:6.8, G:0.0042 };
const P = new Plant(prm, mo, { leafLibrary:3, maxAxes:8, branching:0.55 }, 21);
const t0 = Date.now();
for (let s = 1; s <= 5000; s++) {
  P.step(1);
  if (s % 1000 === 0) {
    const fl = P.axes.filter(a=>a.floral);
    console.log(s, 'axes', P.axes.length, 'flowers', fl.length,
      'petals', P.axes.reduce((n,a)=>n+a.organs.filter(o=>o.petal).length,0),
      'fruits', P.axes.filter(a=>a.fruit).length,
      'ripe', P.axes.filter(a=>a.fruit&&a.fruit.ripe).map(a=>+a.fruit.stats().ripe).join(','),
      'florigen', P.florigen.toFixed(1));
  }
}
console.log('ms/step', ((Date.now()-t0)/5000).toFixed(2));
