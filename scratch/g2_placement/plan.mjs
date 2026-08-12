// DOES THE PLAN COMPOSE A FIELD? Statistics of flGardenPlan over many seeds:
// achieved minimum spacing, depth spread, species repeats, seed collisions,
// and the germination schedule.
//
//   node scratch/plan.mjs
import { M } from './loader.mjs';

const SEEDS = [];
for (let s = 1; s <= 64; s++) SEEDS.push(s);
const NS = [2, 3, 5, 7, 10, 12];

console.log('n   radius  minGap(min/med)  nearest-nb(min/med/max)  depthCV  rimFrac  dartFail  adjDup  seedDup');
for (const n of NS) {
  const gaps = [], nns = [], ds = [];
  let rim = 0, tot = 0, fails = 0, adjDup = 0, seedDup = 0, radius = 0;
  for (const seed of SEEDS) {
    const plan = M.flGardenPlan(seed, n, {});
    radius = 0.83 * 12 * Math.sqrt(n);
    let mg = Infinity;
    for (let i = 0; i < plan.length; i++) {
      let nn = Infinity;
      for (let j = 0; j < plan.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(plan[i].origin[0] - plan[j].origin[0],
          plan[i].origin[2] - plan[j].origin[2]);
        if (d < nn) nn = d;
      }
      if (n > 1) { nns.push(nn); if (nn < mg) mg = nn; }
      const rr = Math.hypot(plan[i].origin[0], plan[i].origin[2]);
      ds.push(rr);
      tot++;
      if (i > 0 && rr > radius * 0.85) rim++;
      if (i > 0 && plan[i].name === plan[i - 1].name) adjDup++;
      for (let j = 0; j < i; j++) if (plan[i].seed === plan[j].seed) seedDup++;
    }
    if (mg < 12 - 1e-6) fails++;
    gaps.push(mg);
  }
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
  const sd = Math.sqrt(ds.reduce((a, b) => a + (b - mean) ** 2, 0) / ds.length);
  console.log(
    `${String(n).padStart(2)}  ${radius.toFixed(1).padStart(6)}  ` +
    `${q(gaps, 0).toFixed(1).padStart(5)}/${q(gaps, 0.5).toFixed(1).padStart(5)}    ` +
    `${q(nns, 0).toFixed(1).padStart(5)}/${q(nns, 0.5).toFixed(1).padStart(5)}/${q(nns, 0.999).toFixed(1).padStart(5)}   ` +
    `${(sd / Math.max(1e-6, mean)).toFixed(2).padStart(6)}   ` +
    `${(rim / Math.max(1, tot - SEEDS.length) * 100).toFixed(0).padStart(4)}%  ` +
    `${String(fails).padStart(6)}/${SEEDS.length}  ${String(adjDup).padStart(5)}  ${String(seedDup).padStart(6)}`);
}

console.log('\ngermination schedule (startAt, world steps):');
for (const n of NS) {
  const p = M.flGardenPlan(21, n, {});
  console.log(`  n=${String(n).padStart(2)}  ${p.map(x => x.startAt).join(', ')}`);
}

console.log('\nspecies dealt, seed 21 (deck without replacement, hero unpinned):');
for (const n of [8, 9, 12]) {
  const p = M.flGardenPlan(21, n, {});
  console.log(`  n=${n}: ${p.map(x => x.name.split(' ')[0]).join(' | ')}`);
}
console.log('  with ?species=Sun Coral pinned, n=12:');
console.log(`    ${M.flGardenPlan(21, 12, { heroName: 'Sun Coral' }).map(x => x.name.split(' ')[0]).join(' | ')}`);

console.log('\nthe field, seed 21 n=7 (origin, dist from hero, startAt):');
for (const s of M.flGardenPlan(21, 7, {})) {
  console.log(`  ${s.name.padEnd(20)} (${s.origin[0].toFixed(1).padStart(6)},${s.origin[2].toFixed(1).padStart(6)})  ` +
    `d ${Math.hypot(s.origin[0], s.origin[2]).toFixed(1).padStart(5)}  startAt ${s.startAt}`);
}
