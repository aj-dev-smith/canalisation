// Grow every species in the catalogue headlessly and print what each one does.
//
// A species is a parameter set, so the only honest way to know whether a new one
// is worth having is to run it and read the numbers off. This prints; it does not
// judge — no assertion here should ever pin an emergent quantity. What it is for
// is catching a species that is quietly broken: one that never makes a leaf, never
// flowers, never sets fruit, or grows leaves so narrow they read as sticks.
//
//   node test/species.mjs                 # every species, 2 seeds, 5000 steps
//   node test/species.mjs 'Ember Creeper' # just one
//
import { SPECIES } from '../src/70_app.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';
import { MERISTEM_DEFAULTS } from '../src/20_meristem.js';
import { LEAF_DEFAULTS } from '../src/30_leaf.js';
import { Plant, SPECIES_DEFAULTS } from '../src/40_plant.js';

const only = process.argv[2];
const STEPS = +(process.env.STEPS || 5000);
const SEEDS = [21, 137];

function run(name, seed) {
  const S = SPECIES[name];
  const prm = { ...DEFAULT_PRM, ...S.prm };
  const mo = { ...MERISTEM_DEFAULTS, ...S.mo };
  const sp = { ...SPECIES_DEFAULTS, ...S.sp };
  sp.leafOpts = { ...LEAF_DEFAULTS, ...(S.sp.leafOpts || {}) };
  const P = new Plant(prm, mo, sp, seed);
  for (let s = 1; s <= STEPS; s++) P.step(1);

  const c = P.card();
  const st = P.stats();
  // An axis that converted to a flower but never made its complement of floral
  // organs never calls setFruit, so it never arrests — and an unarrested axis
  // elongates for as long as the simulation runs. On screen that is a bare whip
  // shooting out of the top of an otherwise finished plant. Count them.
  const stuck = P.axes.filter(a => a.floral && !a.fruit).length;
  // the leaf library is what every organ on the plant is wearing
  const asp = P.leaves.lib.map(L => L.o.aspect);
  const teeth = P.leaves.lib.map(L => L.margin.teeth.length);
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  return {
    organs: st.organs, axes: st.axes, height: st.height,
    div: st.divergence ? st.divergence.mean : NaN,
    sd: st.divergence ? st.divergence.sd : NaN,
    flowers: c.flowers, petals: c.petals, seeds: c.seeds, stuck,
    leaves: P.leaves.lib.length, aspect: mean(asp), teeth: mean(teeth),
  };
}

const num = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const cols = ['organs', 'axes', 'height', 'div', 'flowers', 'petals', 'seeds', 'stuck', 'aspect', 'teeth'];
console.log(`${STEPS} steps, seeds ${SEEDS.join('/')}\n`);
console.log('species'.padEnd(19) + cols.map(c => c.padStart(8)).join(''));

const names = only ? [only] : Object.keys(SPECIES);
for (const name of names) {
  if (!SPECIES[name]) { console.error('no such species: ' + name); process.exit(1); }
  for (const seed of SEEDS) {
    const r = run(name, seed);
    const label = seed === SEEDS[0] ? name.slice(0, 18) : '';
    console.log(label.padEnd(19) +
      num(r.organs).padStart(8) + num(r.axes).padStart(8) + num(r.height, 1).padStart(8) +
      (num(r.div) + '±' + num(r.sd)).padStart(8) +
      num(r.flowers).padStart(8) + num(r.petals).padStart(8) + num(r.seeds).padStart(8) +
      num(r.stuck).padStart(8) +
      num(r.aspect, 2).padStart(8) + num(r.teeth, 0).padStart(8));
    // the failure modes worth shouting about, none of them emergent quantities
    if (!r.organs) console.log('    ^ NO ORGANS — this species never makes a leaf');
    if (!r.leaves) console.log('    ^ NO LEAF GREW — the margin never matured');
    if (!r.flowers) console.log('    ^ never flowered within ' + STEPS + ' steps');
    if (r.stuck) console.log('    ^ ' + r.stuck + ' floral ' + (r.stuck > 1 ? 'axes' : 'axis') +
      ' never set fruit, so ' + (r.stuck > 1 ? 'they are' : 'it is') + ' still elongating');
  }
}
