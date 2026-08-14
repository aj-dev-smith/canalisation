// GROW THE STAND. The demo's assets are not committed — they are grown, which
// is the honest version of "grown, not modeled": every GLB here reproduces
// bit-for-bit from a species name, a seed and a step count, because growth is
// seeded and deterministic. Run this once; it skips whatever already exists.
//
//   node demo/build_assets.mjs          # ~10 min cold, seconds warm
//   FORCE=1 node demo/build_assets.mjs  # regrow everything
//
// The manifest is the recipe the scene is composed from, and the choices are
// stated rather than accidental:
//  - MESH=auto everywhere. The browser's own blade budget, not the solver's
//    full lamina — a real-time scene has a frame budget, same as the browser.
//  - The conifer ships VEINS=lines. Its foliage IS its segments (needles
//    funnel through the ribbon path), so a width cut strips the crown rather
//    than slimming it, and sweeping 235k unchained stubs into prisms cost
//    81 MB to say what the browser says with glowing lines. Measured, see
//    tools/README.md.
//  - The herbs keep tubes at VEIN_MIN_W=0.006 — their vein hierarchies are
//    the thing this engine is FOR, and at demo distances the tubes read.
//  - One specimen is exported senescing, because a life cycle is an asset
//    dimension: a dying blade drains along the distance field of its own
//    vein network, and no other vegetation pack has that.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

// The conifer is not in the stand. Its one dominant vein strand is correct
// Picea and the reticulate network is the only channel this engine is visible
// through (the ROADMAP 13 needle verdict, carrying over to the export), so
// the demo is herbs — eight distinct seeds, two life stages. VEINS=lines and
// the spire's recipe stay documented in tools/README.md for anyone who wants
// a tree anyway.
const MANIFEST = [
  { species: 'Cathedral Fern', seed: 5, steps: 4000, stage: 'peak', out: 'demo_cathedral_fern_5', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Cathedral Fern', seed: 21, steps: 4000, stage: 'senescing', out: 'demo_cathedral_fern_21_sen', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Ember Creeper', seed: 7, steps: 4000, stage: 'peak', out: 'demo_ember_creeper_7', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Ember Creeper', seed: 12, steps: 4000, stage: 'peak', out: 'demo_ember_creeper_12', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Nightglass Parasol', seed: 3, steps: 4000, stage: 'peak', out: 'demo_nightglass_parasol_3', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Nightglass Parasol', seed: 9, steps: 4000, stage: 'peak', out: 'demo_nightglass_parasol_9', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Sun Coral', seed: 5, steps: 4000, stage: 'peak', out: 'demo_sun_coral_5', conv: { VEIN_MIN_W: '0.006' } },
  { species: 'Sun Coral', seed: 2, steps: 4000, stage: 'peak', out: 'demo_sun_coral_2', conv: { VEIN_MIN_W: '0.006' } },
];

const run = (cmd, args, env) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

for (const m of MANIFEST) {
  const base = join(ROOT, 'export', m.out);
  if (process.env.FORCE !== '1' && existsSync(`${base}.glb`)) {
    console.log(`  ${m.out}.glb exists — skipping (FORCE=1 to regrow)`);
    continue;
  }
  if (process.env.FORCE === '1' || !existsSync(`${base}.json`)) {
    console.log(`\ngrowing ${m.species} seed ${m.seed}${m.stage ? ` to ${m.stage}` : ''}…`);
    run('node', ['tools/blender_export.mjs', m.species, String(m.seed), String(m.steps)],
      { MESH: 'auto', STAGE: m.stage, OUT: base });
  }
  run('node', ['tools/gltf_export.mjs', base], m.conv);
}
console.log('\nthe stand is grown. node demo/serve.mjs and open http://localhost:8460');
