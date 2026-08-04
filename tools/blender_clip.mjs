// RENDER A SEQUENCE. One Blender process per frame, resumable.
//
//   node tools/blender_clip.mjs export/ember_seq shots/clip
//   HERO='{"samples":192,"res":[1200,1500]}' node tools/blender_clip.mjs export/ember_seq shots/clip
//   JOBS=2 FROM=100 TO=124 node tools/blender_clip.mjs export/ember_seq shots/pilot
//
// Then: ffmpeg -framerate 24 -i shots/clip/f%04d.png -c:v libx264 -pix_fmt yuv420p clip.mp4
//
// ONE PROCESS PER FRAME, and the argument is already written down at the top of
// `blender_shot.py`: an interactive Blender accumulates state and rendering can
// just stop — `bpy.ops.render.render()` returning `{'FINISHED'}` in 0.07s with
// an empty result, in a fresh scene, unrecoverable from script. Over 485 frames
// that is not a risk worth carrying to save ~3s of startup each. It also buys
// two things for free: the job resumes exactly where it died, because a frame
// that has a PNG is a frame that is done, and it parallelises with `JOBS=`.
//
// ⚠ THE RIG IS COMPOSED ONCE, FROM THE CLIP AND NOT FROM A FRAME.
//
// `film()` places every lamp at a multiple of `r` and powers it at `r*r`, where
// `r` is the SUBJECT's extent — the fix that stopped a garden's clearing from
// lighting the hero. A growing plant walks straight into the same trap from the
// other side: rebuild the rig per frame and a seedling gets a seedling's key
// while the grown plant gets a grown plant's, so the exposure crawls for the
// whole clip and every light in the scene slides outward for twenty seconds.
//
// So `span` and `pivot` are computed ONCE here, off `seq.json`'s union bbox, and
// passed to every frame identically. `film()` overrides `ctr`, `height`, `width`
// and `r` from them, which makes the entire rig invariant to what the plant is
// doing — the camera, the four lamps, the sky and the width floor all stay put.
// That invariance is not incidental and it is the only reason this is a film
// rather than a slideshow of separately-lit stills.
//
// ⚠ AND THE PLANT IS SMALL FOR THE FIRST TWO SECONDS. Measured on the shipped
// hero: 10% of final height at frame 60, 25% at 115, 50% at 190 of 485. A frame
// composed for the final size therefore holds a speck at the bottom for the
// first ~2.5s and something under a quarter height for the first 5s. That is the
// right trade and it is deliberate — a subject the camera keeps at a constant
// size on screen does not read as growing, it reads as a zoom — but it is a
// composition choice and `PIVOT`/`SPAN` are here to overrule it.

import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename } from 'node:path';

const BLENDER = process.env.BLENDER
  || '/Applications/Blender.app/Contents/MacOS/Blender';

const dir = process.argv[2];
const outDir = process.argv[3];
if (!dir || !outDir) {
  console.error('usage: node tools/blender_clip.mjs <export/seqdir> <shots/outdir>');
  process.exit(1);
}
if (!existsSync(`${dir}/seq.json`)) {
  console.error(`no manifest at ${dir}/seq.json — run tools/blender_seq.mjs first`);
  process.exit(1);
}

const M = JSON.parse(readFileSync(`${dir}/seq.json`, 'utf8'));
const jobs = Math.max(1, +(process.env.JOBS || 1));
const look = process.env.LOOK || 'film';
const force = !!process.env.FORCE;
// A STATIC SET, BUILT INTO EVERY FRAME. `ALSO=export/stand` (comma-separated for
// more than one). The stand does not sway and does not need to: at 15 m a
// background plant's whole per-frame travel is 1.16 px against 5.4 px of its own
// defocus blur at f/2.8. Export it with `GARDEN_ONLY=1` so it carries no hero of
// its own — the sequence supplies one at the origin every frame.
const also = (process.env.ALSO || '').split(',').map(s => s.trim()).filter(Boolean);

// --- the framing, computed once --------------------------------------------
//
// GL (x, y, z) -> Blender (x, -z, y), scaled to metres. `_to_blender` in
// `blender_import.py` is the one that has to agree with this; a pivot in the
// wrong handedness aims the camera at empty air behind the plant, which looks
// like a lighting bug.
const u = M.unitM;
const lo = M.bbox.min, hi = M.bbox.max;
const ctr = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
// The vertical pivot is deliberately NOT the union bbox's centre. The plant
// spends the clip growing UP out of its base, so centring on the midpoint of the
// final specimen puts the base — where the whole first third of the film happens
// — a long way down the frame. `PIVOT_F` is where in the final height to aim,
// 0.5 being the true centre.
const pf = process.env.PIVOT_F !== undefined ? +process.env.PIVOT_F : 0.46;
const pivot = process.env.PIVOT
  ? JSON.parse(process.env.PIVOT)
  : [ctr[0] * u, -ctr[2] * u, (lo[1] + (hi[1] - lo[1]) * pf) * u];
// `margin` in `film()` is 1.12, so a span equal to the plant's height already
// leaves headroom. A little more, because the plant SWAYS — measured at 219 mm
// peak-to-peak on a 2.9 m specimen, which is 7.5% of its height, and a tip that
// leaves frame on the gusts is the one artefact a still could never have shown.
const span = process.env.SPAN ? +process.env.SPAN : M.heightM * 1.16;

const heroBase = {
  samples: 192, res: [1200, 1500], adaptive: 0.01,
  azimuth: 105, key: 110.0, edge: 45.0, bounce: 1.6,
  sss: 0.55, sss_mm: 0.22, vein_mul: 2.0,
  sky: 30.0, backdrop: 0.45, back: 260.0,
  fstop: 2.8, ground: false,
};
const hero = { ...heroBase, ...JSON.parse(process.env.HERO || '{}'), span, pivot };

const from = process.env.FROM !== undefined ? +process.env.FROM : M.first;
const to = process.env.TO !== undefined ? +process.env.TO : M.last + 1;

mkdirSync(outDir, { recursive: true });

const want = [];
for (let f = from; f < to; f++) {
  const tag = String(f).padStart(4, '0');
  if (!existsSync(`${dir}/f${tag}.json`)) continue;
  if (!force && existsSync(`${outDir}/f${tag}.png`)) continue;
  want.push(f);
}

console.log(`${M.species} seed ${M.seed} — ${M.count} frames at ${M.fps} fps (${M.seconds.toFixed(2)}s)`);
console.log(`  span ${span.toFixed(3)} m  pivot [${pivot.map(v => v.toFixed(3)).join(', ')}]  (fixed for the whole clip)`);
console.log(`  ${hero.res[0]}x${hero.res[1]} @ ${hero.samples} spp, look=${look}, jobs=${jobs}`);
if (also.length) console.log(`  static set: ${also.join(', ')}`);
console.log(`  ${want.length} frames to render (${to - from - want.length} already present)\n`);
if (!want.length) process.exit(0);

let idx = 0, ok = 0, fail = 0;
const t0 = Date.now();
const times = [];

function launch() {
  if (idx >= want.length) return null;
  const f = want[idx++];
  const tag = String(f).padStart(4, '0');
  const started = Date.now();
  const p = spawn(BLENDER, [
    '-b', '-P', 'tools/blender_shot.py', '--',
    '--export', `${dir}/f${tag}`,
    '--out', `${outDir}/f${tag}.png`,
    '--look', look,
    ...also.flatMap(s => ['--also', s]),
    '--hero', JSON.stringify(hero),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let tail = '';
  p.stdout.on('data', d => { tail = (tail + d).slice(-4000); });
  p.stderr.on('data', d => { tail = (tail + d).slice(-4000); });
  p.on('close', code => {
    const dt = (Date.now() - started) / 1000;
    if (code === 0 && existsSync(`${outDir}/f${tag}.png`)) {
      ok++; times.push(dt);
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const left = (want.length - ok - fail) * mean / jobs;
      console.log(`  f${tag}  ${dt.toFixed(1)}s   ${ok}/${want.length}   ` +
        `eta ${(left / 60).toFixed(0)}m`);
    } else {
      fail++;
      console.error(`  f${tag} FAILED (exit ${code})\n${tail.split('\n').slice(-12).join('\n')}`);
    }
    const nxt = launch();
    if (!nxt && !running()) done();
  });
  live.add(p);
  p.on('close', () => live.delete(p));
  return p;
}
const live = new Set();
const running = () => live.size > 0;

function done() {
  const el = (Date.now() - t0) / 1000;
  console.log(`\n  ${ok} rendered, ${fail} failed, ${(el / 60).toFixed(1)} min`);
  if (ok) {
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  ${mean.toFixed(1)}s mean per frame`);
  }
  const n = readdirSync(outDir).filter(f => /^f\d{4}\.png$/.test(f)).length;
  console.log(`
  ${n} frames in ${outDir}/

  ffmpeg -framerate ${M.fps} -pattern_type glob -i '${outDir}/f*.png' \\
    -c:v libx264 -crf 16 -pix_fmt yuv420p -vf format=yuv420p ${basename(outDir)}.mp4
`);
  process.exit(fail ? 1 : 0);
}

for (let i = 0; i < jobs; i++) launch();
