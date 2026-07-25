// Does the up-the-gradient instability actually make spots on frozen tissue?
import { Meristem } from '../src/20_meristem.js';
import { DEFAULT_PRM } from '../src/10_auxin.js';

const prm = { ...DEFAULT_PRM, ...JSON.parse(process.argv[2] || '{}') };
const mo = { G: 0, detectOff: true, ...JSON.parse(process.argv[3] || '{}') };
const m = new Meristem(prm, mo, 11);
const STEPS = +(process.env.STEPS || 900);
for (let i = 0; i < STEPS; i++) m.step(1);
const s = m.patternStats();
console.log(JSON.stringify({ ...s, T: prm.T, D: prm.D, b: prm.b, Km: prm.Km, mu: prm.mu, rho: prm.rho }));
