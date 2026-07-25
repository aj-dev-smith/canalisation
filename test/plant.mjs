import { Plant } from '../src/40_plant.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
const prm = { ...DEFAULT_PRM, T:40, D:6, mu:0.3, rho:0.6, b:3 };
const mo = { ...MERISTEM_DEFAULTS, R:10, rCZ:2.4, rPZ:6.8, G:0.003 };
const P = new Plant(prm, mo, { leafLibrary: 1 }, 12);
const t0 = Date.now();
for (let s = 1; s <= 1400; s++) {
  P.step(1);
  if (s % 200 === 0) {
    const st = P.stats();
    console.log(s, 'organs', st.organs, 'axes', st.axes, 'h', st.height.toFixed(2),
      'plast', Math.round(st.plastochron), 'div', st.divergence ? st.divergence.mean.toFixed(0)+'±'+st.divergence.sd.toFixed(0) : '-');
  }
}
console.log('ms/step', ((Date.now()-t0)/1400).toFixed(2));
