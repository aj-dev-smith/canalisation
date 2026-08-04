# Capture tools (headless Playwright)

`npm i -D playwright && npx playwright install chromium` first. These render the
page offscreen and screenshot it — **fine for verifying geometry and catching
console errors, useless for judging performance or motion.** Use a real browser
for both.

Do not read the `fps` in the state dump. Repeated identical runs on one machine
gave 15.6, 33.4, 120 and 120.2, because headless chromium sometimes gets a
hardware path and sometimes falls back to software, and the tool cannot tell you
which it got. One run also produced a black frame while still reporting a full
triangle count. Real Chrome on the same machine is a steady 120 (vsync).

**On macOS, `--use-gl=swiftshader` loses the WebGL context** and writes an
all-black PNG while still reporting a full triangle count — the failure above, in a
form that does not announce itself. `--use-angle=metal` in a headed browser renders
correctly on the same machine. `flower_shot.mjs` picks per platform; the older tools
still ask for swiftshader unconditionally and will hand you a black frame here.

They resolve playwright's own chromium rather than a hardcoded path, so they work
on any platform. Both of those were broken until 2026-07-25: the browser path was
a Linux-only absolute path, and the page URL was built with `${process.cwd()}`
inside **single** quotes, so it never interpolated.

- `shot.mjs out.png <waitMs> [jsToEval]` — one capture plus a state dump
- `multi.mjs` — all four species, desktop and mobile viewports
- `closer.mjs` — flies to the apex and captures the cell-level view
- `fruit_shot.mjs` — runs at speed until a fruit sets, then captures
- `flower_shot.mjs out.png [species] [seed]` — catches the brief window where the
  flower is open and the ovary is not yet drawn, and frames it
- `leaf_shot.mjs prefix [species] [seed]` — goes into a blade at cell resolution
  and captures it three times while it canalises (`-early`, `-mid`, `-done`).
  Picks its GL backend the same way `flower_shot.mjs` does. The needles falling
  into line only read if the camera is square to the blade — a leaf seen edge-on
  puts six hundred cells on one line and looks like an empty stalk, so check the
  `-mid` frame before believing a "nothing is drawn" report
- `clip.mjs OUTDIR SECONDS [species] [seed] [speed] [waitSeconds] [w] [h] [uRef]` —
  **records a webm.** The only artifact in the repo that shows the piece MOVING, which everything
  else here explicitly cannot judge. Records square by default (1000×1000): the camera
  fits the specimen's height into 66% of the frame, so a tall narrow plant on a 16:10
  viewport is framed correctly and looks lost. Also drops a matching still. `waitSeconds`
  runs at 4x and decides which act gets filmed — 3-5s for a full canopy, 20s+ for the
  seed head. Same GL-backend choice as `flower_shot.mjs`; **never read a clip recorded on
  the software path**, it runs at ~16fps and reads as the simulation stuttering.

  To compare against an older build, add a git worktree at the earlier commit, symlink
  `node_modules` into it, and run *this* copy of the tool with the worktree as cwd — the
  page URL comes from `process.cwd()` and the playwright import resolves from the script.
  For a *weather* comparison you do not need any of that: pass `uRef` and record twice.
- `garden_shot.mjs OUTDIR [n] [seed] [dist] [waitMs] [radius]` — grows a stand and takes
  **three framings in one session**, because the interesting question is what the garden
  looks like FROM WHERE and regrowing it per guess is slow. Reports buffer occupancy per
  framing, which is the number that fails quietly: a full buffer drops geometry silently.

  It re-asserts the camera immediately before every shutter. The framer damps `cam.dist`
  toward the scene's bounding sphere every frame, so anything set once is pulled
  somewhere else before the picture is taken — three captures in a row came back looking
  at the inside of one plant that way. `radius` wants to stay well clear of the blade
  length: these plants carry 4-unit fronds, so a ring of 9 puts them through each other.

- `garden_hitch.mjs [n] [seed] [radius] [budgetMs]` — **does planting a garden freeze the
  tab?** Records the gap between animation frames while the stand establishes and exits
  non-zero past 250ms. Nothing else in `tools/` can see this, because every other tool
  here sits and waits: `plantGarden` originally ran all seven head starts in one
  synchronous loop — 19 seconds of blocked main thread — and every capture script passed.

  A step during GROWTH costs about 1.7ms rather than the ~300us a grown plant costs,
  because that is when the leaf pool canalises its library, and a `Plant` costs ~70ms to
  construct before it takes a single step. Both are now paid off a slice per frame.
  501ms worst gap → 149ms.

- `veinlod_shot.mjs OUTDIR [species] [seed] [waitMs]` — **before/after for the vein
  level of detail**, on the hero specimen at the shipped camera, which is the frame that
  change puts at risk. Flips `app.veinLOD`, which is the whole switch: `false` restores
  the pre-LOD renderer exactly (every vein of every blade at the scene-wide floor).

  It forces its own wide framing and takes the camera off the director, for a reason
  worth knowing before trusting any capture here: left alone the director picks a
  close-up, and the first run of this tool produced two frames of the inside of a single
  petal. It also re-asserts `cam.dist` immediately before each shutter, because the
  camera damps toward the specimen's bounding box every frame and a distance set once at
  the top of the run is quietly pulled back in.

  **Pick the distance deliberately.** The cull law is anchored to the camera's own
  framing, so a lone specimen filling the frame is barely culled however far away it is
  in absolute terms — at `VEINLOD_DIST=26` only 3% of ribbons go and the comparison
  proves nothing. The informative shot is from *inside* the canopy (9 or so), where the
  back of the plant is well beyond the framing distance and 31% of the ribbons go.

- `tree_shot.mjs OUTDIR [seed] [waitMs] [species]` — **the conifer, framed as a tree**,
  and the only capture tool here that is portrait. `Ashfall Spire` is 46 units tall,
  three times any herb, and everything else frames from `sceneBounds()` into a 16:10
  viewport — which puts the tree in the middle fifth of the picture. "Looks lost" and
  "is too sparse" are the same picture, so a landscape frame cannot answer the
  question this tool exists for. Three framings: the whole silhouette, the middle
  third where a viewer reads density, and one branch close enough to count needles on.

  **It polls for the crown rather than waiting a fixed time.** Its first run waited 60s
  at 4x and photographed a *dead* tree — the specimen arrests around step 2900 and its
  own senescence wave then strips every needle — from which "sparse" would have been
  the obvious and completely wrong conclusion. It stops the clock at arrest.

  `OVER='{"sp":{"budTake":1}}' TAG=dense node tools/tree_shot.mjs shots` patches the
  preset via `window.__SPECIES` before growing, so two candidates are compared in **one
  browser session on one GL backend** rather than across a rebuild and a second
  browser, which on this machine are not guaranteed to be the same renderer. It
  **asserts the patch landed** — a silent no-op would compare a candidate against
  itself and report "no difference", the most expensive wrong answer it could give.

- `views_shot.mjs OUTDIR [species] [seed] [waitMs]` — **every render view, one plant,
  one frame.** `GARDEN=7 node tools/views_shot.mjs shots` does a stand instead. The
  view registry is the only thing in the piece that changes what a frame is made *of*
  rather than where the camera is, and no headless harness can judge that:
  `test/views.mjs` says what each view costs and that nothing is dropped, which is
  exactly the class of green that has twice coexisted with a picture nobody would ship.

  Two framings per view, because the views disagree about which one they are for.
  `wide` is the whole specimen, where `cells` has to still read as a plant; `close` is
  an arm's length off the canopy, where it has to read as tissue. **A view that only
  works at one of those is not finished** — the needle ramp was set by looking at
  exactly this pair, after a version where `cells` and `flux` came back identical at
  `wide`.

  It enumerates `window.__VIEWS` rather than keeping its own list, so a fifth view is
  covered the day it is added. It frames from `app.sceneBounds()` for a reason in
  PITFALLS: a fixed distance that suits one species parks the lens inside another.
  It also prints `B.saturated()` per frame, which is the only place a dropped-geometry
  report reaches a person other than the HUD.

- `jitter.mjs [species] [seed] [waitSeconds] [uRef]` — **where is the movement's energy?**
  Samples the drawn state at frame rate — the tip of the main axis and individual blade
  normals — and reports a dominant rate per signal, plus a verdict at about 4 Hz, which
  is where "sway" becomes "jitter" and where a 60 Hz display starts lying to you.

  It exists because "it wobbles too fast" and "some leaves jitter" are the two reports a
  still cannot answer and a person watching cannot quantify. It caught the wind field's
  integral length scale being the vertical component's rather than the streamwise one:
  blades were moving at 3.8-16.5 Hz. Run it after anything that touches the air, the
  stem or the petiole. Note it freezes the camera but NOT growth — growth and the wind
  share a clock, so `speedMul: 0` stops both — which means during the growing phase some
  of what it measures is organs developing. Point it past the end of growth
  (`waitSeconds` 26+) to isolate the air.

  **Read the rms and the peak slew, not only the dominant rate.** "Too fast" has meant
  both things here: once it really was frequency (the length scale), and once it was
  amplitude at an unchanged frequency (the wind speed — dominant rate 0.53 to 0.60 Hz,
  peak slew 4.15 to 0.67). The optional `uRef` overrides the shipped wind speed, so that
  comparison is two runs of one binary rather than two checkouts.

  The tip signal is the tip's **offset from the rest shape**, not its position. It used
  to be the position, and since growth is a much larger displacement than sway the tool
  spent a while reporting an rms that barely moved when the wind was cut by a third.
- `sway.mjs` — **deleted (2026-07-27).** It took two screenshots to show the old shader
  sway field animating, and that field went in ROADMAP 7 step 5. It was left in place for
  a day as "obsolete but harmless", which it was not: it froze the scene with
  `speedMul = 0`, and since growth and the wind now share a clock that stops the air too,
  so it would have reported *no motion at all* on a plant that moves — a false negative
  dressed as a measurement. It also asked for swiftshader, which on macOS writes black
  PNGs while reporting a full triangle count. `clip.mjs` replaces it.

  The general rule, and `test/sweep.mjs` was removed for the same reason: **a harness can
  outlive the thing it measures, and a stale one is worse than no harness** because it
  still produces output that looks like evidence.
- `wind_check.mjs ['{"uRef":3}'] [nSamples]` — **not a capture tool.** The one thing
  in here that returns a number and an exit code instead of a picture, and the only
  check in the repo that has to leave Node. Compiles the GLSL `windGLSL()` emits,
  evaluates it at sample points into an RGBA32F target, reads the floats back and
  compares them to `windAt()` in Node. That the shader's air and the simulation's air
  are the same field is ROADMAP 7's whole claim and it cannot be checked by looking,
  because a wrong wind still looks like wind. Measured agreement on ANGLE/Metal is
  1.6e-5 of the mean wind speed early in a run and 1.1e-4 late in one — it grows
  linearly with plant time, which the tool now reports as two groups rather than one
  number, because the growth is the mechanism. Fails above 1e-3. Its Node half is
  `test/wind.mjs`, which does the physics
- `senesce_shot.mjs prefix [species] [seed]` — runs until the specimen dismantles
  itself and captures `-onset`, `-mid`, `-spent`. Picks its GL backend the way
  `flower_shot.mjs` does. The three frames now differ: on Cathedral Fern seed 21
  the count holds at 63594 tri while the plant is only draining — colour costs no
  geometry — and falls to **16-28k** at `dead`, which is the canopy having left. The
  spread is the poll catching `dead()` a few frames either side, with blades still
  mid-fall. The top of that range moved up on 2026-07-26 when blades started letting go
  at the attitude they were actually held at: steady glides nearly disappeared in favour
  of flutter and tumble, which descend more slowly, so more blades are still in the air
  when the poll fires. Measured 27738 on this seed. **A count that does not fall by `spent` means shed blades are going
  nowhere**, whatever the frames look like. What it cannot judge is whether
  the drain reads, because the counts are blind to colour; `test/senesce.mjs` has
  those numbers. It reads the lit stage chip out of the DOM rather than off the
  model, so a display that silently stops matching the simulation shows up here
- `cull.mjs [secsPerSpecies] [handoverSecs]` — **not a capture tool.** Like
  `wind_check.mjs`, it returns numbers. Asks whether the occlusion cull in
  `buildScene` is removing leaves the viewer can see. Pass 1 runs every species
  through a whole life cycle with the director hands off and reports the share of
  the canopy the cull hides plus `flips/frame`, the rate at which some blade
  changes visibility — which is what a viewer actually notices, and is not
  something a still can show. Pass 2 takes the camera mid apex shot the way a
  pointerdown does, pulls back and orbits, and prints whether `focus` and
  `subject` survived the handover.

  It seeds every specimen with 4242 on purpose. Without a fixed seed each run
  grows a different plant and the species numbers move by more than any change
  you are trying to measure — the first two baseline runs of this tool disagreed
  about which species was worst, because they were not looking at the same plants.

---

## The Blender bridge — not Playwright, not a capture tool

Everything above drives the browser and screenshots it. These two do not open a
browser at all: they grow a specimen in Node, hand its geometry to Blender, and
let Cycles light it.

```bash
node tools/blender_export.mjs                                   # Cathedral Fern, seed 21
STAGE=peak node tools/blender_export.mjs 'Ashfall Spire' 3 14000
VIEW=flux MESH=auto node tools/blender_export.mjs 'Sun Coral' 5
```

- `blender_export.mjs [species] [seed] [maxSteps]` — writes `export/<name>.json`
  and `.bin`. `VIEW=` is any of the four render views; `STAGE=` stops at a stage
  instead of a step count, and `STAGE=peak` is the last step before senescence
  begins — the fullest the plant ever is, which has no name in `Plant.stage()`
  and costs a second growth to find, because a plant cannot be rewound.
- `blender_import.py` — run inside Blender (or over the MCP bridge). `build(path)`
  makes three datablocks, `setup_scene(H)` frames and lights them, `render(out)`
  writes a PNG.

**It adds no geometry code.** It grows with the shipped `makeSpecimen`, draws
with the shipped `drawSpecimen`, and supplies only a `Buffers` subclass that
keeps a second copy of what passes through. A bridge that re-implemented the draw
would drift from the renderer inside a week — the same argument that has
`test/views.mjs` driving the real `drawSpecimen` through a stand-in App. Its
stand-in App is copied from that file **on purpose**: the list is every property
`drawSpecimen` reads off `this`, and two copies break loudly where one would
quietly draw a different program.

Four things it does differently from the browser, all of them deliberate:

- **Veins cross as CURVES, not as the triangles the browser draws.** A vein on
  screen is a camera-facing ribbon — a billboard baked at one eye position — so
  exported as triangles every vein in the plant would turn edge-on and vanish on
  the first frame of a turntable. The exporter drops the ribbon's `side` vector
  and keeps the segment and its two widths; Cycles renders a strand with a
  radius, correctly, from anywhere. The view-dependence was never in the vein, it
  was in the rasteriser.
- **The vein LOD is off and `MINW` is not a pixel.** The cull exists so a
  real-time frame can drop veins that land under a pixel; a path tracer has no
  frame budget. About ninety percent of a hero's veins are sub-pixel in the
  browser and drawn at one uniform width — here the hierarchy the canalisation
  grew is visible as thickness for the first time.
- **`MESH=full` is the default and it is the real prize.** `bladeMesh` scales the
  lamina grid down to hold quads-per-drawn-area constant, and is clamped by the
  leaf's own lattice — so asking for more is not a request for invented detail,
  it is a request to stop throwing solved tissue away. Cathedral Fern seed 21:
  20,154 triangles at the browser's LOD, **274,568** at the solver's. `MESH=auto`
  keeps the browser's numbers, for an A/B against a screenshot.
- **The veins are LIGHT, not surfaces, and that is measured off the shader.**
  `60_render.js` draws the line and point passes with
  `blendFuncSeparate(SRC_ALPHA, ONE)` and `depthMask(false)`, and their whole
  fragment shader is `vec3 c = vC * vE;` — no lighting term, no occlusion. So
  the vein and point materials are `Add Shader(Emission, Transparent BSDF)` with
  shadow casting off, which is the exact analogue. Rendering them as lit
  Principled tubes — which this did first — turned the `flux` view's ghost stem,
  weighted `0.14` precisely so you can see tissue through it, into a solid white
  pillar down the middle of the plant. A weight is a brightness, and a
  brightness only reads as transparency if the thing is additive. `solid_veins=True`
  puts the lit surface back, for using an export as a model rather than as a
  picture of the piece.
- **Two-sided leaves are `60_render.js` line 99, not a style choice.** That line
  is `if (dot(N,V) < 0.0) N = -N;` — a lamina is a one-sided sheet standing in
  for a two-sided organ. Cycles flips shading normals off the GEOMETRIC normal,
  and these are custom normals off the parametric surface the blade grew, which
  can disagree by more than a right angle. Without the flip node in the material
  every blade turned away from the key renders **solid black**, which it did, and
  which reads as a material bug rather than as a missing line from the shader
  this is supposed to be reproducing.

The ruler is real: `WORLD.unitM` was fixed months ago by the wind field and the
falling blade, so everything is scaled into metres on the way in and a Cathedral
Fern is 2.36 m. That is what makes a physical camera mean anything — 85 mm at
f/2.8 gives the depth of field a 2.4 m plant would actually have. **Do not scale
the plant up to fill the frame; move the camera.**

No part of the real-time grade — bloom, exposure, vignette — comes across, and
none should. Those are a rasteriser's substitutes for light transport. Vertex
colours are the palette's own linear values, and Cycles does its own tone map.

### The hero rig — `blender_hero.py` and `blender_shot.py`

`blender_import.setup_scene` is a NEUTRAL framing: three area lights, a flat
background, no point of view. That is right for checking an import and wrong for
a picture. `blender_hero.py` is the point of view, and it is a separate file so a
look-dev decision can never be mistaken for a fidelity one.

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b -P tools/blender_shot.py -- \
  --export export/ember_creeper_7_natural --out shots/hero.png \
  --build '{"vein_emis_mul": 14.0}' \
  --hero  '{"samples": 640, "res": [2000, 2500], "azimuth": 285, "air": 0.030}'
```

**Render from the CLI, not over MCP.** The bridge is the right tool for LOOKING
at a scene and a bad one for rendering it. Mid-session, `bpy.ops.render.render()`
in the interactive Blender started returning `{'FINISHED'}` in 0.07 s with an
empty result — in a brand new scene containing one sphere, so it was the session
and not the file — and nothing recovered it from a script. A fresh process per
render cannot get into that state, and a movie-grade frame is minutes, which has
no business blocking the app you are watching the scene in. `--blend` saves the
assembled scene if you want to open it and push it by hand.

**The idea is that the plant is the light source.** The veins already *are*
emission (`vec3 c = vC * vE`) and `makeSpecimen` pulls the lamina down by
`laminaMul` so they win. A rasteriser can only add that light to the pixels a
vein covers; a path tracer lets it leave the plant. So the rig is a dark room
with a plant that glows, plus the minimum needed to read a silhouette.

Five things in here that are not preferences, and one Blender trap:

- **Backlight leads, and it is switched out of the volume.** A lamina is a
  translucent sheet; front-lit these are red flakes, back-lit the light comes
  through the tissue and the vein network shows *inside* it. But a backlight
  strong enough to do that also fills the volume, and the first version traded
  every bit of the darkness the picture depends on for it. `visible_volume_scatter
  = False` on the practicals separates them: they shape tissue, and the only
  thing in the air is light the plant emitted.
- **The rig is camera-relative.** It was world-space first, which is fine at one
  azimuth and wrong the moment the camera orbits — at 285° the "rim" had swung to
  the front and become a second key. Four stills at four azimuths did not show
  this, because each is a plausible design on its own. **A turntable would have.**
- **`geo_bounds` frames the geometry, not the bounding box.** A creeper's extremes
  are three outlying leaves on long petioles, so the box centre lands in empty air
  beside the plant and the camera points at nothing. Percentiles of the drawn
  points, 2% trimmed off each end.
- **The world runs the species' own `bgTop`→`bgBot` gradient.** An Ember Creeper's
  are 0.030 and 0.006 of warm near-black — a factor of five, which is the entire
  tonal range the picture has to work in.
- **The grade is rebuilt from the render, not imported.** The piece has bloom, a
  vignette, grain and chromatic aberration of its own, and `blender_import`
  deliberately brings none of it across; a rasteriser's bloom is a substitute for
  light transport and doing both is grading twice. The glare here is a convolution
  of light that was actually emitted and actually travelled.
- ⚠ **In Blender 5.x the compositor is a node group, and its group INPUT is not
  the render.** You need a `Render Layers` node *inside* the group. Measured on a
  200 px sphere: no compositor and an RLayers graph write byte-identical
  31,426-byte files; a group-input-to-group-output passthrough writes 9,354 bytes
  of blank. **It costs no render time**, which is the trap — wall clock fell from
  4.6 s to 0.2 s, which reads like the render being skipped rather than like the
  picture being thrown away at the last step.
- ⚠ **`ShaderNodeMix` has four inputs called "A"** and three outputs called
  "Result", separated only by identifier (`A_Float`, `A_Color`, …).
  `node.inputs["A"]` silently returns the float one, so a colour graph written by
  name links, renders, and is wrong. `_sock()` exists for this.

### ⚠ IT LOOKS CONSIDERABLY WORSE THAN THE BROWSER, AND HERE IS WHY

AJ's verdict on the first path-traced hero, 2026-08-03, and it should not be
softened: **considerably worse than the custom WebGL renderer.** That is the
fourth time the eye has been the deciding instrument on this project and the
only verdict that counts. The bridge is faithful about *geometry* and threw away
the *look*, in three specific, measurable ways.

**1. The vein width floor is not a rasteriser artefact. It is what makes the
network visible.** `50_geom.js:591` draws every vein at
`max(wFloor, base * (0.25 + s.w * 1.35))`, and `wFloor` is `MINW` — about
`0.004` world units at the camera's framing distance. `blender_export.mjs` sets
`MINW = 1e-4`, deliberately, reasoning that "a floor measured in pixels has no
meaning in a path tracer". That reasoning is correct about physics and wrong
about the picture. Measured on Cathedral Fern seed 21: the *median* vein radius
is 0.004 world units — exactly the floor — and the thinnest are 0.00032, **12x
below it**. So the browser lifts more than half the network up to a common
width, and the export draws it at its true, invisible size. That is why the
Ember Creeper's leaves render as flat red discs.

**This is the ROADMAP 13 needle lesson restated, and I walked straight into it.**
There, a botanically correct needle canalising one strand was rejected because
the reticulate network is the only channel through which this engine is visible.
Here, physically correct sub-pixel veins are the same mistake wearing a
different hat: **correctness and legibility of the mechanism point in opposite
directions, and this project's whole claim is the second one.**

**2. The lamina's shading model is a designed three-term look, and the palette
carries its parameters.** `60_render.js:100-105`:

```glsl
vec3 c = vC * (amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7;
c += vC * vE * 3.0;
```

`amb` is a gradient between `ambBot` and `ambTop` by world normal; `back` is a
squared wrap term; `rim` is a cubed Fresnel. Every one of `key`, `keyCol`,
`ambTop`, `ambTop` is a **species palette entry** — a tuned look that ships with
the plant. `blender_hero.py` invents its own lighting and uses none of them.
Note also the **`* 3.0` on emission**, which the export does not apply.

**3. The grade is not a garnish.** `BASE_PAL` carries `bloom: 0.38`,
`bloomThresh: 1.15`, `exposure: 1.04`, `grain: 0.024`, `vignette: 0.60`,
`dof: 0.80`, plus per-species `fog`/`fogD`. The bridge deliberately imports none
of it on the argument that a rasteriser's bloom substitutes for light transport.
True, and beside the point: with the vein network drawn 12x too thin and no
emission multiplier, there is nothing left for a physically-correct glare to
catch.

**The route out, in order:**

1. `WFLOOR=` on the exporter, defaulting to the shipped `MINW` in world units,
   so the network keeps the width the piece draws it at. This is one line and it
   is probably most of the gap.
2. A `--look shipped` mode in the hero rig that lights from `key`/`keyCol`/
   `ambTop`/`ambBot` and applies the `* 3.0`, so Cycles reproduces the thing
   that already works before anything new is invented on top of it.
3. Only then art-direct beyond it. **Match the reference before improving on it**
   — the same discipline as deriving a number before asserting it.

Do not read the existing `hero()` defaults as tuned. They were reached by
looking at renders that were missing most of their vein network.
