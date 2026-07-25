import { Plant } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
const prm = { ...DEFAULT_PRM, T:40, D:6, mu:0.3, rho:0.6, b:3 };
const mo = { ...MERISTEM_DEFAULTS, R:10, rCZ:2.4, rPZ:6.8, G:0.0042 };
const P = new Plant(prm, mo, { leafLibrary:1, maxAxes:1, branching:0 }, 9);
for (let s = 1; s <= 6000; s++) {
  P.step(1);
  if (s % 600 === 0) {
    const a = P.axes[0];
    console.log(s, 'organs', a.organs.length, 'floral', a.floral, 'flr', a.florigen.toFixed(1),
      'floralOrgans', a.floralCount, 'fruit', a.fruit ? JSON.stringify(a.fruit.stats()) : 'none');
  }
}
