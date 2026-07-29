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
