import { Fruit } from '../src/35_fruit.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const over = JSON.parse(process.argv[2] || '{}');
for (const seed of [3, 17, 41, 88]) {
  const f = new Fruit(DEFAULT_PRM, over, seed);
  let s = 0;
  while (!f.mature && s < 4000) { f.step(1); s++; }
  for (let k = 0; k < 400; k++) f.step(1);   // let ripening finish
  console.log('seed', seed, JSON.stringify(f.stats()));
}
// silhouette of one, as a radius map over latitude/longitude
const f = new Fruit(DEFAULT_PRM, over, 17);
let s = 0; while (!f.mature && s < 4000) { f.step(1); s++; }
const W = 60, H = 22, ch = ' .:-=+*#%@';
const g = Array.from({length:H},()=>new Array(W).fill(' '));
let mn=1e9,mx=-1e9;
for (let i=0;i<f.n;i++){ if(f.rad[i]<mn)mn=f.rad[i]; if(f.rad[i]>mx)mx=f.rad[i]; }
for (let i=0;i<f.n;i++){
  const x=f.dir[i*3], y=f.dir[i*3+1], z=f.dir[i*3+2];
  const lon=Math.atan2(z,x), lat=Math.asin(Math.max(-1,Math.min(1,y)));
  const cx=Math.round((lon/Math.PI*0.5+0.5)*(W-1));
  const cy=Math.round((0.5-lat/Math.PI)*(H-1));
  const t=(f.rad[i]-mn)/Math.max(1e-6,mx-mn);
  if(cx>=0&&cx<W&&cy>=0&&cy<H) g[cy][cx]=ch[Math.min(9,Math.floor(t*9.99))];
}
for (const sd of f.seeds) {
  const x=f.dir[sd*3], y=f.dir[sd*3+1], z=f.dir[sd*3+2];
  const lon=Math.atan2(z,x), lat=Math.asin(Math.max(-1,Math.min(1,y)));
  const cx=Math.round((lon/Math.PI*0.5+0.5)*(W-1)), cy=Math.round((0.5-lat/Math.PI)*(H-1));
  if(cx>=0&&cx<W&&cy>=0&&cy<H) g[cy][cx]='O';
}
console.log('\nradius map (unrolled sphere; O = seed):');
console.log(g.map(r=>r.join('')).join('\n'));
