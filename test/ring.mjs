import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const out=[];
for (const T of [25, 40, 60])
 for (const D of [3, 6, 10])
  for (const geo of [[10,2.4,6.8],[12,2.8,8.5],[14,3.2,10]]) {
   const prm = { ...DEFAULT_PRM, T, D, mu:0.3, rho:0.6 };
   const m = new Meristem(prm, { R:geo[0], rCZ:geo[1], rPZ:geo[2], G:0, detectOff:true }, 5);
   for (let s=0;s<1400;s++) m.step(1);
   const st = m.patternStats();
   // is it still there after another 600 steps? (stationary, not transient)
   for (let s=0;s<600;s++) m.step(1);
   const st2 = m.patternStats();
   out.push({T,D,R:geo[0],cz:geo[1],pz:geo[2],peaks:st.peaks,peaks2:st2.peaks,
     contrast:st2.contrast, spacing:st2.spacing, cells:st2.cells});
  }
out.filter(o=>o.peaks2>=3).sort((a,b)=>b.contrast-a.contrast).forEach(o=>console.log(JSON.stringify(o)));
console.log('--- dead configs:', out.filter(o=>o.peaks2<3).length, 'of', out.length);
