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
- `sway.mjs` — **obsolete.** It pixel-diffed two frames to prove the old shader sway field
  animated, and that field was deleted in ROADMAP 7 step 5. Kept only until something
  wants its diffing trick; `clip.mjs` is what to reach for now
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
