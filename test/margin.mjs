import { Margin } from '../src/25_margin.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
const over = JSON.parse(process.argv[2] || '{}');
const M = new Margin(DEFAULT_PRM, over, +(process.env.SEED || 3));
let s = 0;
while (!M.mature && s < 4000) { M.step(1); s++; }
console.log(JSON.stringify({ steps: s, pts: M.F.n, teeth: M.teeth.length,
  aspect: +M.aspect.toFixed(2), len: +M.length.toFixed(2) }));
const W = 74, H = 27;
const g = Array.from({length:H},()=>new Array(W).fill(' '));
for (let k = 0; k < W; k++) {
  const u = k/(W-1);
  const l = M.half(u,-1)/M.aspect, r = M.half(u,1)/M.aspect;
  const mid = (H-1)/2;
  for (let y = 0; y < H; y++) {
    const v = (y-mid)/mid;
    if (v < 0 && -v <= l) g[y][k] = '#';
    if (v > 0 && v <= r) g[y][k] = '#';
    if (Math.abs(v) < 0.04) g[y][k] = '-';
  }
}
for (const t of M.teeth) {
  const k = Math.round(t.u*(W-1));
  const y = Math.round((H-1)/2 + (t.v/M.aspect)*((H-1)/2));
  if (k>=0&&k<W&&y>=0&&y<H) g[y][k] = '*';
}
console.log(g.map(r=>r.join('')).join('\n'));
