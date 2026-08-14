# The stand, in three.js

Five specimens grown by the auxin engine, exported as GLB, standing on a
terrain in **stock three.js** — no fork of the renderer, no plugin, just
`GLTFLoader` and the assets this repo's pipeline makes.

```bash
node demo/build_assets.mjs   # grow the stand (~10 min cold, skips what exists)
node demo/serve.mjs          # http://localhost:8460 — a slow orbital drift
node demo/shot.mjs shots     # the three framings, gated non-black and non-flat
```

![the stand](../shots/demo_wide.png)

## What is honest here and what is staging

- **Every plant was grown.** Species, seed and step count are the whole recipe
  (`build_assets.mjs` is the manifest); growth is deterministic, so the stand
  reproduces bit for bit. Nothing about any plant's shape is drawn — the one
  rule, unchanged by leaving the browser.
- **The look is the palettes'.** Each GLB carries its species palette in its
  scene extras. The sky dome, fog, hemisphere light and key light all read the
  hero's palette — the scene has no art direction that is not already in the
  species.
- **The terrain is modelled**, and it is the only thing here that is. It is
  environment, the same category as the wind in `src/37_wind.js` — seeded
  value-noise fbm, wearing the palette's colours.
- **Positions are staging.** Where a plant stands was never a simulation
  result (`plantGarden` uses a PRNG too). Clones of a grown specimen appear at
  different yaws; the honest fix for visible twins is more seeds in the
  manifest, which is a one-line edit that costs a grow.
- **The conifer's needles are additive lines at opacity 0.16** — the browser's
  own idiom for needles (`VEINS=lines`), with the opacity paying for what the
  browser's grade and LOD normally absorb. Watched blowing out solid white
  without it.

## What phase 3 would add

The wind. `src/37_wind.js` already emits GLSL from one baked mode table, so a
three.js material patch (`onBeforeCompile`) could move this stand with the
same physically-derived field the browser uses — 0.56–0.64 Hz stem modes, a
real gust spectrum, nothing hand-animated. That is the feature no other
vegetation asset has, and it is sitting in the repo already generated.
