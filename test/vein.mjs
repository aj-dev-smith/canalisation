import { Leaf } from '../src/30_leaf.js';
import { DEFAULT_PRM, MAXNB } from '../src/10_auxin.js';
const over = JSON.parse(process.argv[2] || '{}');
const lo = JSON.parse(process.argv[3] || '{}');
const prm = { ...DEFAULT_PRM, ...over };
const L = new Leaf(prm, lo, 4);
const marks = [800, 1800, 3000];
for (let s = 1; s <= 3000; s++) {
  L.step(1);
  if (marks.includes(s)) console.log(s, JSON.stringify(L.stats()));
}
L.bake();
// crude ASCII picture of the vein network
const W = 64, H = 26;
const g = Array.from({length:H},()=>new Array(W).fill(' '));
for (const v of L.veins) {
  for (let t = 0; t <= 12; t++) {
    const x = v.x0 + (v.x1-v.x0)*t/12, y = v.y0 + (v.y1-v.y0)*t/12;
    const cx = Math.round(x*(W-1)), cy = Math.round((y/L.o.aspect*0.5+0.5)*(H-1));
    if (cx>=0&&cx<W&&cy>=0&&cy<H) g[cy][cx] = v.w>0.75?'#':(v.w>0.5?'+':'.');
  }
}
console.log('veins:', L.veins.length, 'maxPI:', L.maxPi.toFixed(2));
console.log(g.map(r=>r.join('')).join('\n'));
