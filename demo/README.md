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

## The grade

The bloom is hand-rolled (threshold → quarter-res separable gaussian →
additive composite with ACES and a vignette) because `UnrealBloomPass`
renders black in headless GL on every backend — bisected, not assumed; the
`?post=none` switch that found it is still in `main.js`. Two lessons are in
comments where they bit: additive emissive lines can stack to Inf in a
half-float target and Inf through the ACES rational is NaN, which the blur
smears into black rectangles; and three.js only tone maps when rendering to
screen, so a render-target pipeline that forgets to grade is silently linear.
The moon is one direction shared by the sky dome, the key light and the
water's streak — one light source, three readers, or the picture disagrees
with itself about where its own light comes from.

## The wind

The field is **the engine's own** — the page imports `src/37_wind.js` itself
(served raw; it depends only on `00_math.js`, which is pure math), bakes the
mode table once, and injects `windGLSL()`'s emitted source into every plant
and grass material. One field, three readers: the vertex shaders lean the
canopy, `windAt()` advects the mist and the spore motes on the CPU, and both
sum the same baked numbers the simulation sums — a copy in demo/ would be
the two-airs bug the module exists to prevent, reintroduced by hand.

What is approximated is the **response**: a quasi-static first-mode lean,
`(y/H)^1.5` off each plant's own exported height, because the bend solver is
a simulation and this page is a scene. The ladder's slow octaves (0.13–0.5 Hz)
dominate the loading and read honestly this way; what is forgone is ringing.
`amp` — metres of lean per m/s — is the one aesthetic number in the wind
path, sized to the native piece's measured band (the floppiest herb leans
1.9°). Stills sample the ladder at a fixed plant time so captures reproduce
bit-exact; `__frame(name, tSec)` A/Bs the wind itself, and the check that
gates it: same `t` → diff 0.0000, `t + 1.5 s` → 2.5% of pixels moved.

`node demo/clip.mjs shots 20` records the webm — the only artifact here that
shows it moving. Under software GL it is a low-frame-rate record of
true-rate motion; do not read stutter as a solver bug.
