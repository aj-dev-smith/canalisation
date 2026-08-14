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
- **The environment is modelled, and says so.** Terrain (fbm with ridged far
  hills), 42k instanced grass blades, displaced-icosahedron rocks, a fresnel
  pond, hashed stars — the standard procedural-landscape kit of the three.js
  ecosystem, wearing the palette's colours. All of it is the same category as
  the wind in `src/37_wind.js`: environment the plants stand in, never the
  plants.
- **Positions are staging.** Where a plant stands was never a simulation
  result (`plantGarden` uses a PRNG too). The stand is eight distinct seeds
  across four species and two life stages; the two remaining clones stand far
  apart at different yaws.
- **The conifer is deliberately absent.** Its one dominant vein strand is
  correct *Picea*, and the reticulate vein network is the only channel this
  engine is visible through — the ROADMAP 13 needle verdict, carrying over to
  the export. `VEINS=lines` and its recipe stay documented in tools/README.md
  for anyone who wants a tree anyway.

## What phase 3 would add

The wind. `src/37_wind.js` already emits GLSL from one baked mode table, so a
three.js material patch (`onBeforeCompile`) could move this stand with the
same physically-derived field the browser uses — 0.56–0.64 Hz stem modes, a
real gust spectrum, nothing hand-animated. That is the feature no other
vegetation asset has, and it is sitting in the repo already generated.
