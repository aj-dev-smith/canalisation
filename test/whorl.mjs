// Floral organ identity: does the q coordinate actually span its range?
//
// `q` is read off the radius an organ was founded at (40_plant.js), and it is
// the ONLY thing distinguishing one floral organ from another. If q never
// leaves zero, every organ is a petal and a flower is a single whorl.
//
// Prints, per flowering axis, the q sequence in founding order and the identity
// split it produced. Run across the whole catalogue.
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 5000);
const SEEDS = (process.env.SEEDS || '21,137').split(',').map(Number);

function grow(name, seed) {
  const S = SPECIES[name];
  const prm = { ...DEFAULT_PRM, ...S.prm };
  const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  const P = new Plant(prm, mo, sp, seed);
  for (let s = 1; s <= STEPS; s++) P.step(1);
  return P;
}

let totOrg = 0, totPetal = 0, totInner = 0, totFlowers = 0, qsum = 0, qmax = 0;
const spread = [];

for (const name of Object.keys(SPECIES)) {
  if (only && name !== only) continue;
  console.log('\n' + name);
  for (const seed of SEEDS) {
    const P = grow(name, seed);
    const flowers = P.axes.filter(a => a.floral);
    if (!flowers.length) { console.log(`  seed ${seed}: never flowered`); continue; }
    for (const a of flowers) {
      const fo = a.organs.filter(o => o.floral);
      const qs = fo.map(o => o.q);
      const petals = fo.filter(o => o.petal).length;
      const inner = fo.length - petals;
      const lo = qs.length ? Math.min(...qs) : 0;
      const hi = qs.length ? Math.max(...qs) : 0;
      totOrg += fo.length; totPetal += petals; totInner += inner; totFlowers++;
      for (const q of qs) { qsum += q; if (q > qmax) qmax = q; }
      spread.push(hi - lo);
      console.log(`  seed ${seed}: ${String(fo.length).padStart(2)} organs` +
        ` petals ${String(petals).padStart(2)} inner ${String(inner).padStart(2)}` +
        ` q ${lo.toFixed(2)}-${hi.toFixed(2)}` +
        ` fruit ${a.fruit ? 'y' : 'N'}` +
        `  [${qs.map(q => q.toFixed(2)).join(' ')}]`);
    }
  }
}

const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
console.log('\n--- totals over %d flowers ---', totFlowers);
console.log('floral organs   ', totOrg);
console.log('petals / inner  ', totPetal, '/', totInner,
  `(${(100 * totInner / (totOrg || 1)).toFixed(0)}% inner)`);
console.log('mean q          ', (qsum / (totOrg || 1)).toFixed(3), ' max q', qmax.toFixed(3));
console.log('mean q spread   ', mean(spread).toFixed(3), '(within one flower)');
