# Canalisation — a xenobotany engine

A plant grown by simulating **auxin**, the hormone that tells plant cells where to
become things. Runs in real time in a browser. One rule governs the whole project:

> **Nothing about the plant's shape is drawn.** No shape code, no outlines, no
> curves, no counts. Every form — where leaves go, the angle between them, the
> vein networks, the leaf silhouettes, petal number, fruit lobing — falls out of
> chemistry. If you find yourself writing a shape, you have taken a wrong turn.

The only spatial priors in the entire codebase are documented in
[docs/SCIENCE.md](docs/SCIENCE.md) under "What is imposed". Keep that list short.
Adding to it is a real cost and should be argued for, not slipped in.

## Read these before changing anything

| Doc | Why |
|---|---|
| [docs/SCIENCE.md](docs/SCIENCE.md) | The biology, the papers, what emerges vs what is imposed |
| [docs/TUNING.md](docs/TUNING.md) | Hard-won parameter regimes. **Read before touching any constant.** Hours of sweeps live here |
| [docs/PITFALLS.md](docs/PITFALLS.md) | Bugs that cost hours. Several will bite you again if you do not know them |
| [docs/JOURNAL.md](docs/JOURNAL.md) | Negative results, design forks and why they went the way they did |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What is unfinished, ranked, with my recommendation |
| [docs/research_7_30_26.md](docs/research_7_30_26.md) | **Literature sweep on branch vigour and branch angle.** Answers, with citations, what sets a lateral's growth rate and its angle. Read before touching branching, `updateRadii`, or anything gravitropic — it corrects two of our own results and names one live bug |

`research_7_30_26.md` is a different kind of document from the rest: it is **outside
evidence**, not our own findings, and it is flagged throughout with `[D]` demonstrated,
`[I]` inferred, `[OURS]` their construction, and `⚠` contested. Treat those flags as load
bearing — several of its most useful claims are explicitly marked as unverified or as
things nobody has published, and one citation's author line is flagged as unresolved.
Its Part 5 is the list of things it argues are **genuinely** parameters, with the reason
each is irreducible; that is the shortest honest answer to "what would we have to impose".

## Build and run

```bash
node build.js            # concatenates src/*.js into canalisation.html
open canalisation.html   # no server needed, no dependencies
```

`canalisation.html` is a **build artifact** — never edit it. Source is `src/`,
numbered so the concatenation order is the dependency order. `build.js` strips
`import`/`export`, warns about duplicate top-level declarations (the bundle is one
shared scope — name collisions are silent otherwise and cost a debugging cycle),
and **compiles the bundle before writing it**, exiting non-zero if it does not
parse. It used to only warn, and the warning had a hole; PITFALLS.md has the day
that cost.

Tests are headless Node, no browser:

```bash
node test/smoke.mjs                                # structural invariants; a CI gate
node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'   # is the tissue patterning at all?
node test/phyllo.mjs                               # divergence angle stats
node test/margin.mjs                               # grow a leaf outline, ASCII silhouette
node test/fruit.mjs                                # grow fruits, ASCII radius map
node test/flower2.mjs                              # full life cycle incl. axillary flowers
node test/vein.mjs                                 # vein network + hierarchy ratios, ASCII
node test/lamina.mjs                               # blade at cell resolution: is there contrast to draw?
node test/species.mjs                              # grow every species, print what each one does
node test/whorl.mjs                                # floral organ identity — does q span its range?
node test/flower.mjs                               # one isolated axis: florigen, floralCount, fruit set
node test/focus.mjs '[{"tag":"a"}]'                # meristem probe: divergence, lock, primordium peak ratio
node test/ring.mjs                                 # T/D/geometry map on STATIC tissue, checked for stationarity
node test/shoot.mjs                                # senescence: does the specimen finish, and in what order
node test/senesce.mjs                              # senescence, drawn: does a dying blade change, and do the veins go last
node test/fall.mjs                                 # a shed blade: is the fall a falling plate, and do real blades differ
node test/wind.mjs '{"uRef":3}'                    # the wind field: profile, gusts, spectrum, divergence, GLSL round trip
node test/stem.mjs                                 # the stem as a beam: ringdown vs the pre-flight, sway per species, convergence
node test/petiole.mjs                              # the stalk as a pipe, and the hang as a force balance
node test/veinlod.mjs                              # vein level of detail: what it saves, and the light it must conserve
node test/views.mjs                                # render views: cost, cull laws, cell table; the other CI gate
node test/conifer.mjs                              # ROADMAP 13 pre-flight: does a taper fall out of apical dominance?
node test/plagio.mjs                               # ROADMAP 13 pre-flight: can gravity hold a branch out? (no)
node test/taper.mjs                                # ROADMAP 14: what sizes a stem, swept and drawn (~3min)
node test/tree.mjs                                 # ROADMAP 13: the crown — set point, taper, and an ASCII conifer (~4min)
node test/crown.mjs '{"maxGen":2}'                 # HOW MUCH OF ANYTHING IS THERE — crown fill, at five rasters (~40s)
```

Five browser tools are about the scene rather than the simulation, and one of them
checks something no other harness here can:

```bash
node tools/tree_shot.mjs shots            # THE CONIFER, PORTRAIT. the only tall-plant framing
node tools/garden_shot.mjs shots 7        # grow a stand, three framings, buffer occupancy
node tools/garden_hitch.mjs 7             # DOES PLANTING A GARDEN FREEZE THE TAB?
node tools/veinlod_shot.mjs shots         # before/after for the vein LOD, on the hero
node tools/views_shot.mjs shots           # every render view, wide and close
GARDEN=7 node tools/clip.mjs shots/g 10   # record the stand moving
```

`tree_shot.mjs` is portrait because every other capture tool here frames into 16:10, and
a 46-unit spire in a landscape frame occupies the middle fifth of the picture — **"looks
lost" and "is too sparse" are the same picture**, so the wrong frame cannot answer the
question. It polls for the crown rather than waiting: its first run waited 60s at 4x and
photographed a *dead* tree, stripped by its own senescence wave, from which "sparse"
would have been the obvious and completely wrong conclusion. `OVER=` patches a preset
through `window.__SPECIES` so an A/B happens in one session on one GL backend, and it
asserts the patch landed rather than trusting it.

`garden_hitch.mjs` exists because **a harness that waits cannot see a freeze.**
`plantGarden` once blocked the main thread for nineteen seconds and every capture
script in `tools/` passed — they all navigate, wait, and screenshot, so a frozen
tab and a busy one are the same script. It measures the gap between animation
frames and exits non-zero past 250ms.

**⚠ IT IS RED ON `main` RIGHT NOW, AND THAT IS EXPECTED.** Worst gap ~292ms against a
250ms budget, where `main` before #32 was 141ms. It is **not** reporting a stall: every
one of its worst frames lands at `debt 0`, which is the *grown* stand's ordinary
per-frame cost rather than anything in the warm loop, and its verdict line was written
when a stand that heavy could not exist. Read its **median and p99** instead (21.7ms and
59.8ms, both better than before #32). It will stay red until ROADMAP 10b lands. **Do not
raise its threshold to make it pass** — that deletes the only signal anyone has about
the thing 10b exists to fix.

**Ten of those assert and exit non-zero: `smoke.mjs`, `wind.mjs`, `stem.mjs`,
`petiole.mjs`, `veinlod.mjs`, `views.mjs`, `conifer.mjs`, `plagio.mjs`, `taper.mjs`,
`tree.mjs`.** Only
**two of the ten are wired into CI** and therefore gate a merge — `smoke.mjs` and
`views.mjs`. The other eight assert locally and *nothing runs them for you*, which is worth
knowing before treating a green PR as evidence about the stem or the air. The rest print
and never fail.

`test/tree.mjs` is where ROADMAP 13 landed, and it is the check on both pre-flights
above being answered. Its first two sections are the derivation — the statocyte wall sum
against its own integral, and the auxin-to-angle map, whose direction is the thing that
inverts the whole silhouette if you get it backwards (**more auxin, more vertical**).
Section 3 asserts apical control against a closed form it hits to 1e-9. **Section 3b is
a falsified mechanism switched on deliberately** (`fluxPartition`), in the same category
as `test/shoot.mjs`'s stream: the flagship untried experiment from the literature sweep,
built, measured and wrong. Section 5 draws the crown, for the reason `conifer.mjs`
section 3b exists. ~4min.

`test/plagio.mjs` is the ROADMAP 13 blocker-2 pre-flight and its answer is **no**: on the
radii the engine actually grew, a lateral held horizontal has a tip slope of 16-268°, so
gravity does not hold a branch out, it collapses it. The hidden variable is that
`E = 60 MPa` is a **herbaceous** modulus and a conifer is woody (8-11 GPa). Read it before
proposing any force-balance route to branch angle.

`test/taper.mjs` is ROADMAP 14, and its result is that **the literature was right about the
mechanism and it was a minor term.** Murray's `r³` really is measured only in conduits that
do not support the plant, so `radiusExp` now exists — but it **ships at 3**, because moving
it buys 23% of a taper that is 4x off, and the thing actually setting the taper is
`fruitFlow`, an unswept constant 48x the tip's baseline that turns a properly tapered stem
into a barrel in the single step that sets fruit (+173% against the exponent's +23%). Its
section 2 is the reason: the exponent provably **rescales the log-profile and cannot bend
it**, so no exponent turns a barrel into a stem. Read it before proposing any change to
`updateRadii`, and note it also found a live bug — stem thickness depended on how hard the
wind was blowing. **Do not lower a tolerance to make this file pass**; 2% was written first
and 2% is exactly the band the bug lived in.

`test/conifer.mjs` is the ROADMAP 13 pre-flight and it is the derivation, not the solver:
branch length against bud position worked out on paper first, then checked. ~95s, five
specimens. Its verdict is that the **length taper is emergent and confirmed** (R2 0.9988)
while the **silhouette is a vase, and upside down** — because `tropism` pulls every axis
toward vertical with no generation term, so laterals curve up and the crown ends up
widest at the top. Section 4 kills the obvious follow-up on paper rather than by building
it. Read the box at the top of ROADMAP 13 before touching branching.

**Its section 3b is the reason that file draws an ASCII crown.** Four numeric sections, a
closed form and a 4x parameter sweep all agreed with each other while the specimen was
the wrong shape *and the wrong way up*; ten lines of ASCII caught it immediately. That is
the same argument as "get a person to watch it", applied to a harness — and the closed
form it disagreed with had a 2-4° error that was too small to look wrong and was already
written up. **Derive it, then measure it, then draw it, and let the three argue.**

`views.mjs` runs **twice**, and both runs gate. The invariants job names a species,
which skips the garden of eight and costs 5s; a separate concurrent job — **`render
views (a garden of eight)`** — runs the whole thing, so the expensive half costs no
wall clock. There are now **three required status contexts** on `main`, not two.

Two things about CI worth not relearning, both learned here:

- **A check that is not a required status context is not a gate.** That job existed
  for one push while only `build + invariants` was required, so it ran, went red and
  would have let the merge through. GitHub matches required checks by NAME —
  **renaming that job silently stops it gating**, and requiring a context that never
  reports blocks every PR instead. The workflow says this where someone would look.
  It is verified rather than assumed: a throwaway PR broke an assertion that only
  fires with more than one specimen, the fast form passed, the garden job failed and
  the PR went `BLOCKED`. **A gate you have not watched fail is not a gate you know
  about** — which is the same argument as the rest of this file, applied to CI.
- **The runner is about 4.5x slower than a laptop** on this CPU-bound work, not the
  1.7x assumed. Estimate CI cost from a measurement, not a ratio: gating the garden
  as a step took the invariants job from 105s to 269s against a predicted ~195s. That split is the project's epistemics in miniature — an
*emergent* quantity must not be pinned down in a test, because that would convert it
into an imposed one, while a *physical* claim can be checked against a number worked
out beforehand and therefore should be. When you add something to the mechanics, work
the number out first and assert against it; when you add something to the chemistry,
print it and read it.

`test/petiole.mjs` keeps a *second* implementation of the pipe model and the cantilever
tip slope, deliberately, for the same reason `cantileverHz` lives in `39a_stem.js`: a
check whose reference is the thing being checked is not a check. It also carries the one
test ROADMAP 7b asked for by name — a bigger blade **on the same stalk** has to hang
lower — which is a controlled experiment and not a correlation, and the difference
matters: across a whole specimen the pipe model predicts the opposite sign.

`test/stem.mjs` and `test/smoke.mjs` both read the shipped wind speed out of
`WIND_DEFAULTS` rather than keeping their own copy. `stem.mjs` used to hardcode 4.0 and
label it "force 3", so when the default changed it went on faithfully reporting a scene
that no longer existed. **A harness with its own copy of a shipped constant is a harness
that will eventually test a different program than the one you are running.**

`test/fall.mjs` has a fourth section that is an archived experiment rather than a check:
`node test/fall.mjs tilt` switches on `FALL_DEFAULTS.tiltPlane` — a second rotational
plane for the falling blade, which closes the abscission seam exactly and then pumps
itself end over end whenever the pitch tumbles. Ships off. Nothing reads it.

Three more files are **archived experiments** in whole, not live checks. They are the code that
produced the negative results in [docs/JOURNAL.md](docs/JOURNAL.md), kept so those
results stay reproducible. All three still run; none should be read as a current
diagnostic:

```bash
node test/inhib.mjs 0 1     # falsified: a second inhibitor with its own length scale
node test/ring2.mjs 0 1     # falsified: confining initiation to a thin generative ring
node test/venation.mjs      # falsified: a narrow blade canalising PARALLEL venation
```

The first two take `<shard> <nshard>` so a long sweep can be split across processes.

`test/venation.mjs` is the one to read before anyone asks about **grass**, or any other
monocot. The strap silhouette is nearly free — `ay` is already a species knob — but the
venation stays reticulate at every aspect ratio, because the blade canalises once on
tissue that is already its final shape and a radially convergent problem has a midrib
whatever its width. **Stretching cannot fix it**: `n50` and `top` are statistics of
traffic and traffic is invariant under a coordinate stretch, so extending a blade
changes the look and provably not the hierarchy. Grass needs an intercalary meristem,
which the 2026-07-30 JOURNAL entry argues from two independent directions.

It also carries two metric traps worth knowing before writing any harness here: a
first metric whose maximum was **unreachable by construction** and therefore reported a
strong result that was arithmetic, and a threshold-dependent statistic that showed a
clean 3x effect on two seeds and none at all on eight. Both were caught by running a
control first. **`domin` is kept in the output purely so that second trap stays
visible** — do not draw conclusions from it.

`test/shoot.mjs` is both kinds at once. It checks the shipped senescence, and it
also reproduces a falsified hypothesis — abscission driven by auxin transport — by
switching the whole-plant stream on (`shootOpts.enabled`, off everywhere else).
The stream in `src/38_shoot.js` ships disabled for the same reason `rhoI: 0` keeps
the dead second inhibitor in `10_auxin.js`: **a negative result you cannot
re-measure is just a story.** Nothing in the running piece reads it.

**A harness can outlive the parameters it sweeps.** `test/sweep.mjs` was removed
because it swept two meristem options that no longer exist, so two thirds of its
grid was duplicate rows wearing distinct labels. If you add a sweep, assert the
knob still moves the number before trusting the table.

**Always test the science headlessly before touching the renderer.** A visual bug
and a simulation bug look identical on screen, and the headless harnesses give you
numbers in seconds instead of minutes.

`test/fall.mjs` is the one harness here that can **fail on the physics rather than
report on it**. Its first section sweeps the dimensionless moment of inertia and
asserts the published ordering — flutter at low `I*`, tumble at high, chaos allowed
in between — because if that ordering does not hold, `39_fall.js` is not a falling
plate and nothing else it prints means anything. The other two sections print and do
not judge. The same validation runs inside `smoke.mjs`, so it gates.

**The gate covers geometry as well as simulation now.** `smoke.mjs` imports
`50_geom.js` and asserts that a senescing blade is drawn differently from a live
one. That is there because a name collision inside `50_geom.js` once shipped a
bundle that did not parse while the gate passed 47 checks — **a green gate is only
evidence about what the gate imports.** It still cannot see the *scene*: whether
`70_app.js` passes the right thing to `blade()` is a question only a browser can
answer, and `tools/senesce_shot.mjs` is where it would show.

Two checks cannot be done in Node at all.

`tools/wind_check.mjs` evaluates the emitted shader on a real GPU and compares it to
`windAt()` — the only thing in `tools/` that returns a number and an exit code instead of
a picture. A wrong wind still looks like wind, so this is not a class of bug the eye can
catch.

`tools/cull.mjs` asks **whether the scene is hiding leaves the viewer can see**. The
occlusion cull in `buildScene` is the only thing in the piece that removes a whole
organ, and it is switched on by the director rather than by anything you can see in a
still. Run it after touching the camera director, the focus modes or that cull. It
seeds every specimen so a before and an after look at the same eight plants.

`tools/jitter.mjs` asks **where the movement's energy sits in frequency**, sampling the
drawn state at frame rate. Run it after anything that touches the air, the stem or the
petiole. It exists because the wind field passed all twenty-four of its own assertions
while every gust mode sat between 3.9 and 19.3 Hz — internally consistent, and nothing a
person would call wind. `tools/clip.mjs` records a webm, which is the only artifact here
that shows the piece *moving*.

When you *do* need pixels, `tools/` drives a real browser with Playwright and
[tools/README.md](tools/README.md) lists each capture script. Read that file first —
it documents which tools ask for the wrong GL backend and hand you a **black PNG
while still reporting a full triangle count**, which is a failure that does not
announce itself. None of them can judge performance or motion; use a real browser
for both.

**The known-good visual loop** is `node build.js`, then open `canalisation.html`
in a real browser — not headless, where software rendering runs at ~16fps and
cannot judge motion — and let one specimen run the whole arc: seed, leaves,
flower, fruit, ripe, `senescing`, `spent`. Roughly 75 seconds at 1x on a Cathedral
Fern, less on the time slider. [docs/ROADMAP.md](docs/ROADMAP.md) ends with the
same loop written out.

Note at the end of that arc: shed blades now **stop falling and lie still for a few
seconds** before fading, so the last shot holds litter under a standing seed head for
longer than it used to. That is deliberate, not a stall. There is still **no ground
geometry** in the scene — a blade simply stops at the height of the plant's base, so
the "floor" is implied by where the stem starts and nothing else. ROADMAP 6 (a new
specimen germinating) will want a real one.

## Branching

`main` is protected and is never committed to directly. **Every change goes on a
feature branch and lands through a pull request**, including your own — the point
is that CI has run and the reasoning is written down somewhere other than a commit
message.

```bash
git switch main && git pull
git switch -c short-descriptive-name    # leaf-vein-hierarchy, not fix-stuff
# ... work, then before opening the PR:
node build.js && node test/smoke.mjs
```

- Branch off `main`, one concern per branch.
- **Commit the regenerated `canalisation.html` with the source change that caused
  it.** CI fails the PR if the artifact is stale. It is also the file most likely
  to conflict, since it is a 150kb generated blob — if it does, do not hand-merge
  it. Take either side and re-run `node build.js`.
- If a branch touches the simulation, put the before/after numbers from the `test/`
  harnesses in the PR body. That is the review currency here, not screenshots.
- Long-lived branches drift badly against a generated artifact. Rebase on `main`
  often, or keep them short.

### Stacked PRs: retarget the whole stack BEFORE merging anything

A long session produces a stack — #16 → #17 → #18 → #19, each based on the one
below. Two things bite, and both bit on 2026-07-27:

1. **Merging the bottom PR with `--delete-branch` auto-closes the one above it**,
   and GitHub will not let you reopen a PR whose base branch no longer exists. The
   commits are safe on their own branch, but the PR — its body, its numbers, its
   review — is gone, and the only way back is a fresh PR. Recovering #17 cost a
   round trip that retargeting first would have avoided entirely.
2. **CI does not fire when you change a PR's base.** The workflow triggers on
   `pull_request` into `main`, and a base change is not one of the default actions,
   so the required check never runs and the PR sits at `BLOCKED` with nothing
   pending. Close and reopen it to fire `reopened`; there are no new commits, so a
   push will not do it.

So the order that works:

```bash
gh pr edit 17 --base main && gh pr edit 18 --base main && gh pr edit 19 --base main
# then, per PR, bottom up: close/reopen to fire CI, wait, merge WITHOUT --delete-branch
git push origin --delete <branch>       # only once everything has landed
```

Also worth knowing: **CI only fires on PRs into `main`**, so while a stack is stacked
the upper PRs show no checks at all. That is not "CI passed", it is "CI never ran" —
run `node build.js && node test/smoke.mjs && node test/stem.mjs && node test/wind.mjs`
locally before believing an upper PR is green.

[CONTRIBUTING.md](CONTRIBUTING.md) is the outward-facing version of this for people
arriving from GitHub, and it leads with the one rule above.

## Architecture

```
src/00_math.js      vec3/mat4, seeded PRNG (mulberry32), smoothstep
src/10_auxin.js     THE ENGINE. CellField + stepAuxin(). Everything else is geometry
src/20_meristem.js  growing tip: dividing cell sheet, organ initiation, divergence measurement
src/25_margin.js    leaf outline grown from margin convergence points
src/30_leaf.js      blade: interior lattice, vein canalisation, bake
src/35_fruit.js     ovary wall as icosphere shell; ovule placement, swelling, ripening wave
src/37_wind.js      THE AIR. One wind field, plus the world's scales and the two
                    physical constants of air. JS and GLSL from one baked mode table
src/38_shoot.js     FALSIFIED EXPERIMENT, ships disabled. Whole-plant auxin transport
src/39_fall.js      A BLADE IN AIR, attached or shed. Quasi-steady plate
                    aerodynamics; the petiole, sized by the pipe model, as the
                    cantilever a leaf hangs off. Its TORSIONAL half ships disabled
src/40_plant.js     the organism: axes, elongation, branching, florigen, fruit set,
                    senescence. THE GRAVITROPIC SET POINT is here — the statocyte
                    balance that decides which way an axis points — and so is
                    APICAL CONTROL, which decides how fast it grows
src/39a_stem.js     THE STEM BENDS. Axes as coupled damped cantilevers off EI on the
                    radii Murray's law grew, loaded by the canopy. Lettered, not
                    numbered, because it must load after the air and before the organism
src/50_geom.js      simulation state -> triangles, ribbons, points; senescence colour.
                    Vein LEVEL OF DETAIL is here, and it is what lets the scene hold
                    more than one plant. So is the CELL TABLE, which is what lets a
                    WHOLE PLANT be drawn at the resolution the solver runs at
src/60_render.js    WebGL2: forward pass, bloom, depth of field, grade. No sway — the
                    geometry moves for real now
src/70_app.js       species presets, camera director, scene assembly, App.setWind.
                    A SCENE IS A LIST OF SPECIMENS now, not one plant: makeSpecimen,
                    drawSpecimen, plantGarden, sceneBounds. VIEWS lives here too --
                    WHICH CHANNELS OF THE SIMULATION REACH THE SCREEN
src/80_main.js      UI wiring: the wind slider, the view rail, and the only place a
                    dropped-geometry report reaches a person
```

`stepAuxin()` in `10_auxin.js` is the whole thesis. It runs on **any** topology —
a growing 2D sheet, a 1D chain, an icosphere. Meristem, leaf margin, leaf venation
and fruit are all the same solver on different geometry with different boundary
conditions. **When adding an organ, reach for that function before writing anything new.**

`39_fall.js` is the one part of the tree that is *not* that solver, and it is worth
knowing why it is allowed to exist. It is physics the plant is subject to rather than
chemistry the plant does — gravity and air, with every input either physical or
measured off something the margin grew. The rule this project runs on is that nothing
about the plant's **shape** is drawn; an environment the plant responds to is a
different category, and one that has so far only *removed* stated constants. ROADMAP
7 extends it and asks the framing question explicitly, because "one engine" is
something README and CONTRIBUTING both promise.

**Its constants are not tunable in the way the rest of the project's are.** TUNING.md
is otherwise a record of hard-won sweeps; the fall's section is the opposite and says
so at the top. Every number in `39_fall.js` is physics, air, biology, or a published
coefficient. If the fall looks wrong, the bug is in the model — that is how all four
of its bugs were found, and none would have been visible on screen.

## Working style that paid off here

- **Science first, pixels second.** Prove a mechanism in a headless harness before rendering it.
- **Assert on every string edit.** Silent no-op replacements bit three times in one session; one was the difference between a lobed fruit and a perfect sphere. If editing by script, assert the anchor exists, and write the file only after all edits succeed.
- **Report negative results honestly.** Two hypotheses about phyllotaxis and four about senescence have been tested and falsified. All six are written up in [docs/JOURNAL.md](docs/JOURNAL.md) with their numbers, and they are more useful than the successes would have been.
- **Look up the real number before choosing one.** The falling blade was going to keep one hand-picked constant; checking it against real leaf mass per area removed the need for any. The hand-picked version was also measurably *worse* — it put every blade on the same side of a transition the measured values straddle by themselves. Reach for a table before reaching for a dial.
- **A borrowed model has assumptions, and one of them is its dimensionality.** The plate aerodynamics was solving a cross-section — an infinitely long plate — while a leaf is a stub, which over-predicted lift roughly twofold and read as "flappy". Ask what a borrowed model assumes about the dimension you are *not* solving, and whether two of its coefficients are secretly one.
- **Pre-flight the number before writing the solver.** The stem's frequencies were worked out analytically for all eight species on paper first. That table then caught three separate bugs in the solver, none of which was visible on screen and all of which produced a plant that swayed pleasantly at the wrong rate. A solver that cannot reproduce a number somebody computed beforehand is not the thing it claims to be.
- **Green is a statement about what the gate imports, and about internal consistency only.** A name collision once shipped a bundle that did not parse while 47 checks passed. The wind field passed all 24 of its own assertions while every gust mode sat at vibration frequencies. Ask what the suite *cannot* see, then go and look at that.
- **Ask what CLASS of quantity the suite measures at all.** The sharpest version of the above, and the 2026-07-31 instance. `test/tree.mjs` and `test/conifer.mjs` were entirely green on a conifer a person immediately called a Charlie Brown tree, because every statistic in them — branch angle, crown half-angle, taper slope, length fit — is a **shape** statistic and not one of them is a **quantity** statistic. A crown can be exactly the right shape with a tenth of the foliage. **`test/crown.mjs` is that missing quantity harness and it exists now** — ink over the crown's own rasterised outline, reproducing the lost scratch script at both ends of its range (0.772 against 0.750 shipped, 0.576/0.493 against 0.546 for the pre-#32 tree). Before believing a green suite about appearance, write down what it would still pass with. **And state the raster**: fill is pixel coverage, so a blade thinner than a cell is measured by the sampler rather than the tissue, which is why that file reports five rasters and separates "how it reads on screen" from "how much is there".
- **THEN ASK WHAT THE METRIC DIVIDES BY — the 2026-08-01 instance, and it is the same mistake one level up.** Having the right *class* of statistic is not enough. `crown.mjs`'s fill is ink over the crown's **own** rasterised outline, normalised exactly so a crown cannot score by getting bigger — and that normalisation is what made it unable to see second-order branching, which nearly doubles crown radius and multiplies blade area 2.5x for a 4.7% *fall* in fill. **When a metric is normalised, the normaliser is a statement about what it refuses to see.** The suite measured shape and not quantity, so a quantity harness was built; the quantity harness measures density and divides out architecture. **Before quoting a falsification, check which instrument produced it and whether its number is in the same band as the ones the project quotes now** — three rejected values at 0.281/0.268/0.311 sat nowhere near any shipped fill (0.51-0.77), which was visible for free on the page and went unnoticed for a day. And a knob that is not in a harness's sweep list has not been measured by it: `maxGen` never was.
- **Do not read a trend off the noisy end of a sweep, and split a ratio before calling a knob dead.** Same session: `marginBias.ay` was swept 0.16 → 0.02, flattened in the middle, and got written up in four files as "saturates — needs a new mechanism". It does not saturate; the signal starts exactly where the sweep stopped. The tell was available for free — `ay` is a *width* knob and the aspect it moves is width/length, so printing numerator and denominator separately shows length flat and width falling 17x, which is not what saturation looks like.
- **Get a person to watch it.** Three times now the fastest path to a genuine modelling error was AJ watching for a few seconds — a wind field at vibration frequencies, a crown that was upside down, and a tree with a tenth of its foliage. When a report says "feels like a bug", measure it before explaining it — and take more than one measurement, because "too fast" has meant frequency once and amplitude once, in nearly the same words.
- **Never fake it to make it look better.** The piece's entire claim is that nothing is drawn. A single hardcoded curve would make the whole thing a lie.

## The honest state of it

**THERE IS A TREE. `Ashfall Spire` is the ninth species and it is a different body plan
— a straight leader, two dozen plagiotropic laterals that get longer toward the ground,
needles, and no reproduction at all.** ROADMAP 13, landed 2026-07-30. Three things about
it are worth knowing before touching anything near branching:

- **A branch's angle is derived, not stated.** An axis holds a gravitropic set point: a
  ring of statocyte walls, gravitropic PIN following sedimenting statoliths to the lower
  wall against a constitutive antigravitropic carrier on the upper one, and the angle is
  where the two fluxes cancel. Auxin sizes the offset and **more auxin means more
  vertical** — get that backwards and the crown inverts. Tips sit at their set point to
  0.6°; crown half-angle 9.5° against a Norway spruce's 8-15. `sin(theta)` is nowhere in
  the code. The leader stays vertical with **no flag saying so**, because an axis
  launched straight up has no dorsiventral plane for an offset to push it in.
- **IT WAS A CHARLIE BROWN TREE UNTIL 2026-07-31, and the cause was a third unnamed
  constant.** A bud that escaped apical dominance then took with probability `0.35` —
  hardcoded in `40_plant.js`, uncommented, unreachable — so two in three were retired
  permanently. It is `sp.budTake` now, default 0.35 so the eight herbs are unchanged, and
  **1.0** for the conifer, which removes the coin flip and leaves branch count to
  `exp(-d/dominance) > branching`. 29 branches became 77 and crown fill went 0.559 to
  0.752. The thing not to relearn: the **organ budget is a pool**, so raising `budTake`
  alone makes the tree *smaller* (46.1 → 35.3 units) — **anything that multiplies axes has
  to be paid for out of the pool in the same commit.** TUNING has the ladder and the two
  ways to measure it wrong.
- **THE BRANCHES BRANCH NOW, AND THE ENTRY THAT SAID THEY SHOULD NOT WAS MEASURED WITH A
  RETRACTED RULER (2026-08-01).** `maxGen` ships at **2** with `maxAxes: 240` and
  `organBudget: 3000`. It was written up in three files as falsified on "fill 0.281 →
  0.268" — and **0.281 is the signature of the metric the same JOURNAL entry throws out
  three paragraphs later** ("came back 0.28 for every variant including ones that plainly
  differed"). Every fill number the project quotes lives at 0.51-0.77. `maxGen` was also
  never in `test/crown.mjs`'s knob list, so the instrument built to replace the broken one
  had never been pointed at the change it killed. Re-measured: fill 0.772 → 0.736 while
  **crown radius nearly doubles (6.87 → 11.53) and blade area goes 673 → 1702, at
  identical height.** Fill is normalised by the crown's own outline precisely so a crown
  cannot score by getting bigger — **so it can never answer "is this a tree", and a flat
  fill means "denser per unit of outline", never "more tree". Print crown radius and blade
  area beside it.** Outside evidence says this is nearer the floor than the ceiling: a real
  10-year-old Norway spruce is **26.7% first order, 52.8% second, 16.6% third, 4.0%
  fourth**. It costs 2.5x the organs and a grown stand of seven was already 20.8 → 7.8 fps;
  shipped knowingly, linear in organs, ROADMAP 10b and 11. **Do not buy frames back by
  lowering `maxGen`.**
- **THE SPECIMEN IS A 2.88 m SAPLING, and the ruler was already in the world.**
  `WORLD.unitM` = 0.0625 m/unit, fixed months ago by the wind and the falling blade. Trunk
  9.5 cm, crown 0.85 m across, leaf 13.4 cm (a Cathedral Fern is 1.39 m). That makes three
  apparent defects **correct biology for the life stage**, checked against literature: no
  cones ever (spruce seed production starts at 20-40 years), branches retained to the
  ground (self-pruning needs stand shading; measured on real 3.3 m spruce), and a strong
  straight leader. ⚠ **Two things that are NOT excused by it and were checked**: our
  branch spacing is *not* juvenile "free growth" — free growth adds internodal branches
  **between** whorls rather than removing them, and our gap CV is 0.83 against 1.0 for
  random and √(k−1) ≈ 2.0 for whorled, so the crown is more regular than either; and the
  stem is not "wood-free" — a 2.9 m stem is essentially all secondary xylem, and the real
  error is **irreversibility** (strip the leaves, re-run `updateRadii`, and the basal
  radius falls 0.757 → 0.241, a 68.2% loss; a cambium can only add). JOURNAL 2026-08-01.
- **The needle is a paddle, and the preset used to claim otherwise.** `aspectFloor: 0.04`
  does **not** bite — this margin grows aspect 0.193 on its own. What `test/venation.mjs`
  measured was the **venation**, one dominant bundle, and that still holds; the
  **silhouette** was never checked. **`marginBias.ay` is the fix and it is a pure width
  knob**: over 0.16 → 0.003 the margin's length is flat while its half-width falls 17x, so
  a spruce needle's 0.02-0.05 sits at ay ~0.005-0.012 and the lattice still builds there.
  It is not shipped because a needle 4.5x narrower covers 4.5x less crown and undoes the
  density work above; **TUNING's fill ladder was measured on paddles and does not carry
  over.** ROADMAP 13 item 0 has the plan. An earlier pass stopped that sweep at 0.02 and
  wrote "saturates" into four files — **separate a ratio into numerator and denominator
  before calling a knob dead**, and do not read a trend off the noisy end of a sweep.
- **The hardcoded `0.72` is gone**, along with the untaxed subapical stretch that was
  the real reason the taper was floored. Both read `Axis.vigour` = `(1-L)/L` off
  `apicalControl`. L = 0.5 is unbiased, which is why the eight herbs are unchanged organ
  for organ. **L is still a stated number** and SCIENCE.md books it as a debt.
- **The full flux partition is FALSIFIED and ships off** (`fluxPartition`). It was the
  literature sweep's flagship untried experiment and it inverts the rate taper —
  0.031 at the bottom of the crown against 0.201 at the top — because the leader's
  stream is re-concentrated at every fork it passes. **Do not rebuild it**; the
  2026-07-30 JOURNAL entry says exactly why it fails.

**And two bugs that had been there since the beginning, both invisible because every
axis was vertical, both found within an hour of one not being.** Wander and
circumnutation were added in the world's frame — a tilt on a vertical axis, an azimuth
swing on a plagiotropic one. And the azimuth was re-read off the tip each step, which is
a random walk with nothing to restore it: a branch held a correct 59° elevation along its
whole length while its azimuth turned a full circle every nine segments, so it
corkscrewed 5.2 up and 0.2 out. PITFALLS has both, and the general lesson — **ask what a
general-looking mechanism has actually been run on.**

**THE GARDEN HAS NOW BEEN WATCHED IN A REAL BROWSER, and the bottleneck is not where the
roadmap said.** A stand of eight with two conifers ran at 25-28 fps *before the conifer's
crown was filled in* — and that number did not move when you switched render view, did
not move when you turned the vein cull off, against 5.9ms of simulation. So a grown
stand is bound by the **per-organ CPU work in the geometry build**, which all four views
share. Measure that before optimising ROADMAP 11 or 10b.

**Those numbers are pre-#32 and the conifer is now ~2.2x the organs it was.** Measured
the same way after (a stand of *seven* with two conifers, both fully arrested, real
browser on Metal): **48.1 → 127.5 ms/frame, 20.8 → 7.8 fps**, 1349 → 2672 organs,
79 → 172 axes, 108k → 200k line vertices. The cost is linear in organs, so the diagnosis
above is unchanged and it is still ROADMAP 10b and 11 — but **do not quote 25-28 fps for
a stand that contains conifers.**

**AND THE PER-PLANT VERSION OF THAT DIAGNOSIS WAS INCOMPLETE — THE SIMULATION HALF WAS
NOBODY'S SUSPECT (2026-08-02).** Asked why even ONE conifer grinds, the answer is that an
**arrested** Ashfall Spire — 240 axes, 3002 organs, *zero live axes* — cost **39.4 ms a
step and 57.9 ms to build geometry for**, and the app takes up to six steps a frame. The
sampler put **77% of the step in `39a_stem.js`**, not in `stepAuxin`, the meristem or
senescence. Two identities shipped (#37) and took the step to **26.25 ms**: the bend
solver's load loops are prefix sums rather than nested loops, and `windAt` was returning
a bit-identical answer up to 64 times per step because `t` does not advance inside the
substep loop. `test/stem.mjs` reproduces every printed figure exactly, before and after.
Three things not to relearn, all in JOURNAL 2026-08-02:

- **The confidently-reasoned first answer was 5% of the step.** `updateRadii` and
  `bladeAreaOf` recomputing frozen geometry on an arrested plant is real, has an exact
  precedent in `cellTable`, and is worth about 2 ms. **Run the sampler before the
  refactor, not after it.**
- **`subCap: 64` is now the largest remaining simulation lever and it is UNSWEPT** — 123
  of 240 axes sit pinned at it, 67% of all load-point evaluations. It is *not* an
  identity; see TUNING before touching it, and PITFALLS for why the first sweep of it
  measured nothing.
- **`bladeMesh` is the only level of detail in the piece with no distance term**, which
  is most of the remaining 58 ms draw. And **one conifer emits 1,006,500 line vertices**
  against the 664k recorded for a garden of *eight* — that is ROADMAP 11, and it is still
  not an argument for widening the vein cull.

**⚠ `tools/garden_hitch.mjs` EXITS NON-ZERO ON `main`, AND IT IS NOT YOUR FAULT.** Worst
frame gap ~292ms against its 250ms budget, where `main` before #32 was 141ms. It is not
reporting a stall: the worst frames all land at `debt 0`, which is the *grown* stand's
ordinary per-frame cost, not the warm loop. Its verdict line was written when a heavy
stand could not exist. It will keep saying FREEZES until ROADMAP 10b lands. Its median
and p99 are the numbers worth reading (21.7ms / 59.8ms, both *better* than before #32).
**Do not "fix" it by raising its threshold** — that would delete the only signal anyone
has about the thing 10b is for.

*The rest of this section is current as of 2026-07-31. The most recent landings are the wind field (#16), the
falsified second rotational plane (#17), the bending stem (#18), the weather being
turned down to force 2 (#19), the occlusion cull no longer hiding leaves the viewer can
see (#23), the petiole becoming a petiole — pipe-model radius and droop as a force
balance (ROADMAP 5 + 7b) — **the scene becoming a garden** (#25, ROADMAP 10),
**the renderer getting views** (ROADMAP 12), **a conifer** (#31, ROADMAP 13) and
**the conifer's crown being filled in** (#32); if the git log has moved a long way past
those, treat the specifics below as needing a re-read rather than as fact.*

**THE RENDERER HAS FOUR VIEWS, AND THEY ARE ONE TABLE.** `VIEWS` in `70_app.js` says
which channels of the simulation reach the screen — `natural` is what always shipped,
`cells` draws every organ at the resolution the solver runs at with no lamina at all,
`flux` keeps the veins and the pump directions and drops the surfaces, `field` puts
auxin on one ramp with the species palette and the whole grade discarded. `app.setRenderView('cells')`
from the console, or the segmented control in the bottom bar — **not** the controls
sheet, which is where it started and which covered the plant whose view you were
changing. **They are one
`drawSpecimen` reading different weights, deliberately** — four copies of that function
would drift apart inside a week, and every real difference between these views is a
channel turned up or down. Adding a fifth should be an entry in the table.

None of it adds a spatial prior and SCIENCE.md says so explicitly: every channel was
already being computed, and a view turns it up or down.

What made a whole plant at cell resolution possible was two measurements. **A specimen
already IS a cell field** — 9k cells on a Nightglass Parasol, 82k on an Abyssal Frond —
and the point buffer held 74,898, so one plant saturated it; that is a buffer size, not
a research problem. And **a mature leaf is frozen tissue** (`Leaf.step()` returns on its
first line once `mature`) worn by 118 organs from a library of eight, so the per-cell
neighbour loop was solving the same problem a hundred times a frame. Baked once per
library leaf in `cellTable`: 18.98ms → 6.81ms, and `test/views.mjs` asserts the table
reproduces the live path cell for cell.

**Be honest about what it costs**: `cells` is *dearer* than the lamina it replaces —
12.3ms against 8.3ms for one specimen — not cheaper. The first version of the harness
asserted the opposite, off a prototype that had skipped the material-to-world map, and
failed on its first run. The bound that survives is that a whole plant at solver
resolution is the same *order* as a plant drawn as surfaces. **A garden of eight in
`cells` works and is CPU-bound long before it is buffer-bound.**

Two level-of-detail laws came with it, both the vein cull's law restated: cells thin
with distance keeping drawn area constant to within 0.5% out to sixteen focal lengths,
and needles fade where the *field* of them stops being resolvable. That second
threshold is perceptual and was set by looking — the only number in this work that
could not have been computed first — and **narrowing it to buy frames is the same
mistake as widening the vein cull**: it makes `cells` and `flux` the same picture.

Also here, and worth knowing separately: **a full buffer is no longer silent.**
`Buffers` counts what it drops, `saturated()` reports it, the HUD prints it beside the
fps and `test/views.mjs` asserts on it. That pitfall has cost two sessions.

**THE SCENE IS NO LONGER ONE PLANT.** `App` holds a hero specimen plus a `garden` of
others, each with its own species, palettes, seed and position, all standing in the same
wind field. `app.plantGarden(7, { radius: 20 })` from the console. The hero is still
mirrored onto the App as `app.plant`/`app.pal`/`app.sp`, which is deliberate and is what
kept the HUD, the director, the close-up modes and every tool in `tools/` working
without knowing a garden exists — **do not "clean that up" without checking all of
them.**

What made it possible was finding that **the vein ribbons, not the triangles, are what
a specimen costs to draw**, and that they had no level of detail at all: 26,200
six-vertex ribbons per Cathedral Fern emitted at every distance. One plant ate 53-94% of
a 16.7ms frame. The cull law is anchored to the camera's framing distance so the subject
keeps every ribbon it always had — **and the law that was rejected is the more useful
half of that story**, because it turned up the fact that about ninety percent of the
hero's veins are already sub-pixel and already drawn at one uniform width. TUNING and
JOURNAL both cover it. `app.veinLOD = false` is the pre-LOD renderer, exactly.

Geometry is comfortable — eight specimens was 551k triangles and 664k lines against
buffers about 60% full, and it has since been watched in a real browser. **Simulation is
the ceiling and that is now confirmed rather than suspected**: a stand of seven with two
conifers spends 127.5ms a frame, the number is linear in organ count, and it does not
move with render view or with the vein cull. ROADMAP 10b.

**The life cycle is complete.** A specimen germinates, leafs, flowers, fruits,
ripens, and then **finishes**: it runs out of growing points, drains each blade
into its own veins, drops them one at a time in a wave up the plant, and reports
`dead`, leaving a standing seed head. All nine species get all the way through — the
conifer without ever flowering, because it runs out of growing points instead.
The stage bar along the bottom of the page tells you where a run has got to, and
`tools/senesce_shot.mjs` walks the last act headlessly.

At default speed a Cathedral Fern reaches `senescing` around 19s and `spent`
around 73s. The time slider goes to 4x.

**A shed blade falls by aerodynamics, not by animation.** Four stated constants and
a positional hash were replaced by an integrated quasi-steady plate
(`39_fall.js`), and nothing about the fall is chosen — gravity, air and leaf mass
per area are physical, and the two exchange rates needed to express them in world
units were already fixed by things that shipped months ago. Which of flutter,
tumble, chaos or glide a blade picks is selected by the width its own margin grew,
so the blades on one specimen do not fall alike: all eight species show more than
one regime among their own leaves. Blades also land now, which they could not
before.

**There is one air, and the whole plant is in it.** `37_wind.js` is a real wind field
— log-law boundary layer, Kolmogorov gust ladder, Taylor advection, exactly
divergence-free — evaluated by the simulation and (in the emitted GLSL) by the shader
from **one baked table of modes**, so it cannot be two functions that resemble each
other. Attached blades are loaded through the same plate model the fall uses and hand
their attitude to the fall at abscission. The axes are damped cantilevers off
`EI` on the radii Murray's law grew (`39a_stem.js`), and **`SWAY` is deleted** — the
geometry moves for real. ROADMAP 7 steps 1, 3, 5, 7b and half of 4; step 2 was built,
measured and falsified, and ships off.

The stem's first mode lands within 0.90-1.21 of the pre-flight's analytic value on
seven of eight species, its eigenvalue and its ringdown agree to under 1%, and the
answer moves 0.3% across 4 to 24 stations. **Do not touch that solver without running
`node test/stem.mjs`** — three separate bugs in it were invisible except by making it
check itself against a number computed beforehand.

**And do not trust that the field is right just because its own harness is green.** The
gust spectrum shipped with the *vertical* component's integral length scale applied to
the *streamwise* one, which put every gust mode between 3.9 and 19.3 Hz. The piece looked
like it was vibrating, and a person watching said so; twenty-four passing assertions had
not. `tools/jitter.mjs` is the check that closes that gap and it is the one to run after
touching the air.

**The weather is the one number here that the eye decides**, and it took two goes. The
field shipped at force 1 (invisible), then force 3 (too much for a close study of one
specimen), and settled at **force 2, `uRef: 2.5` m/s**. Everything downstream of it is
derived, so a wrong value cannot make the physics wrong — only the scene. It is a slider
in the UI (`app.setWind`), and `tools/clip.mjs` and `tools/jitter.mjs` both take a `uRef`
argument. **Do not raise it back without watching it.** And when someone says the motion
is too fast, measure amplitude as well as frequency: the second complaint moved the peak
slew by a factor of six and the dominant frequency not at all, because that frequency is
the stem's own bending mode and the wind only decides how hard it is struck.

**The petiole is a petiole now, and `droop` is deleted.** The stalk's radius used to be
half the *stem's* radius at the node — underived, and load-bearing at r⁴ once anything
hung off it. It comes off the blade by the pipe model: 6.2-9.5 mm became 0.59-1.24 across
the eight species, which is what the ROADMAP 5 pre-flight predicted on paper to within
3%. `sp.droop` — one constant and eight species values — is gone with it, replaced by the
tip slope of that stalk under the weight of its own blade, resolved against the angle the
organ grew at. Leaves hang at 8.6-21.3° off no per-species number. Flower close-ups no
longer read as petals bolted to scaffolding, which was the same defect arriving from the
composition side.

**And it falsified the attached blade's rock, which now ships off.** This is the part to
read before touching any of it. That mechanism was built for ROADMAP 7 step 2, measured
at a quarter of a degree, and blamed on the petiole. The blame was right and the cure was
not: given a physical stalk it does not become visible, it becomes wrong — 69° rms twist,
a third of the time against its stop, and `tools/jitter.mjs` reporting blades at 10-25 Hz
when the wind's own fastest gust is 1.78 Hz. Not resonance, not damping, not the
integrator; all three measured and ruled out. A plate hinged along its own midrib is
statically unstable in twist, which the pre-flight predicted in advance. It is disabled
and re-measurable, like `rhoI: 0` and `38_shoot.js`, and **the thing not to do is widen
`kappa` until it behaves** — that is the one move the pre-flight forbids. ROADMAP 9 says
what would have to change instead.

### Where the work goes next

[docs/ROADMAP.md](docs/ROADMAP.md) is the ranked list and has the reasoning; the
short version, in order:

0z1. **A GROWTH RHYTHM — the tree's biggest remaining gap, and it is one oscillator.**
   There is no season, no flush and no bud dormancy anywhere in the engine, so the tree
   grows exactly the way the flowers do: continuously. That is why it has **no whorls**,
   and whorls are most of what reads as "conifer". Measured: gap CV 0.83 against 1.0 for
   uniform-random and √(k−1) ≈ 2.0 for a whorled leader. **A bud is a compressed shoot**,
   so holding elongation while organ founding continues piles primordia at one arc
   position — a whorl of buds, then a bare internode, out of the branching rule that
   already exists. Growth rings and bud scars come off the same clock. A season is
   *environmental*, the same category as the air in `37_wind.js`, so it costs nothing
   against the one rule. ⚠ **One obstacle, unproven and worth pre-flighting first:**
   `minInternode` currently makes a non-elongating axis *discard* the primordia its
   meristem emits (it is the stalled-shoot bug in the senescence notes). It would have to
   queue them instead, without disturbing the eight herbs. Kill criterion: if that cannot
   be done, take the wood term alone.
0z2. **WOOD AS MEMORY — one term in `updateRadii`.** Strip every leaf off the grown
   conifer and re-run it: basal radius **0.7573 → 0.2412, a 68.2% loss.** Radius is a pure
   function of *current* traffic with no accumulation, so the 2.9 m trunk is a herbaceous
   pipe. The pipe-model proportionality is actually correct at this size (a sapling is all
   sapwood); **the missing property is irreversibility** — a cambium can only add. Note
   `EI` goes as r⁴, so the sway currently rests on a radius that moves with the foliage:
   **`node test/stem.mjs` is not optional here.** And do not "measure" this by running
   senescence — `updateRadii` counts dying organs too, so the load never comes off and the
   radius holds perfectly, which is what a first attempt reported.
0. ~~**THE NEEDLE IS A PADDLE (ROADMAP 13 item 0)**~~ — **BUILT, MEASURED, DRAWN AND
   REJECTED, 2026-07-31. Do not reopen it without reading the JOURNAL entry.** The knob
   works: `marginBias.ay` 0.008 grows aspect 0.040-0.058, inside a Norway spruce's
   0.02-0.05, with `n50 = 1`, and at arm's length it is unmistakably a needle.

   **It is rejected because a needle canalises ONE strand.** A Cathedral Fern leaf
   canalises 373-470 veins with traffic over 3-7 of them (top strand 16-29%); a needle
   canalises 69-80 with one carrying 77-99%. That is correct *Picea* and
   `test/venation.mjs` books it as a success — and the reticulate network is **the only
   channel through which this engine is visible.** At each specimen's own framing a fern
   draws 190 vein ribbons per organ against the conifer's 78, and the needle takes it to
   ~48. **The paddle looked better because it was showing more chemistry.** This is
   xenobotany; the species is Ashfall Spire, not Norway Spruce, and botanical fidelity to
   a genus nobody promised is not worth the only thing a viewer can see. **Botanical
   correctness and legibility of the mechanism point in opposite directions here, and
   this project's whole claim is the second one.**

   Four things it produced that outlive it: `test/crown.mjs`; the fact that `organLen` is
   the only lever that fills a needled crown *and spends the thinness one-for-one*, so no
   setting has both; that **organs saturate near 1800 and then reverse**, so this never
   owed ROADMAP 10b anything; and `minInternode` as the one lever that adds foliage
   without lengthening an axis. *(That saturation used to be cited as "the `maxGen: 2`
   mechanism again". The mechanism is real on this knob — a bigger crown that is also
   emptier — but `maxGen: 2` was un-falsified on 2026-08-01 and ships. Second-order
   branching nearly doubles crown radius and multiplies blade area 2.5x for a 4.7% fill
   cost, which is the opposite case. Both are reasons not to judge a crown by fill alone.)*
0a. **WHAT THE GARDEN OWES (ROADMAP 10b) IS NOW THE URGENT ONE, not the cheap one.**
   It was "the cheapest interesting work here"; #32 made it the thing standing between
   the piece and a stand that runs. A grown background plant pays full `stepAuxin` cost
   to pattern tissue that will never change again, and a conifer is now 1200 organs of
   exactly that. 20.8 → 7.8 fps on a stand of seven. Still not research.
0aa. **THE ARCHITECTURE VIEW (ROADMAP 0z) — the thing that would actually make the tree
   good.** The needle work's real finding is that the conifer's chemistry went into its
   **skeleton**, where nothing draws it: the dominance field deciding which buds escape,
   the vigour partition down the crown, the per-axis gravitropic set point. All computed
   every step, none on screen. `Axis` already carries `vigour`, `gsa` and `iaa`, and
   `drawSpecimen` already colours stems through a per-station callback, so a fifth
   `VIEWS` entry is a table entry and a callback rather than a project. **A
   computed-but-undrawn channel is a view waiting to happen** — the same argument
   ROADMAP 12 was built on.
0b. **THE CONE (ROADMAP 13c) — small, and the only thing the conifer does not have.**
   `Ashfall Spire` has no reproduction at all: `florigenRate: 0`, no flowers, no fruit.
   That is correct for a gymnosperm and it is a code path *removed*, but it means the
   specimen finishes by running out of growing points and leaves a bare skeleton rather
   than a seed head. A cone is a short determinate axis bearing spirally arranged
   scales — plausibly a floral axis whose `q` stays in one band and never goes whorled —
   so it **deletes** the ovary path rather than adding one, and it would show the
   reproductive machinery generalises across a 300-million-year split. Read the box at
   the top of ROADMAP 13 first.
0c. **WHERE THE FRAME ACTUALLY GOES.** Measured in a real browser: the cost is the
   per-organ CPU work in the geometry build, identical in all four views and identical
   with the vein cull off. It was 25-28 fps for a stand of eight **before #32**; after,
   a stand of seven with two conifers is 7.8 fps and the cost is linear in organs.
   ROADMAP 11 (instancing ribbons) and 10b (cheaper background simulation) are both
   aimed slightly off it. **Measure before optimising, and measure an ARRESTED stand** —
   a live meristem is a different program from a retired one, and a sweep that mixes
   them reports cost going *down* as the specimen gets bigger.

   ⚠ **That is a STAND-level diagnosis and it does not carry to one plant (2026-08-02).**
   Profiled per specimen, an arrested conifer splits roughly evenly: 57.9 ms of geometry
   against 39.4 ms *per simulation step*, six of which can land in a frame. #37 took the
   step to 26.25 ms with two identities in `39a_stem.js`. What is left is `subCap`
   (unswept, not an identity, see TUNING), `bladeMesh`'s missing distance term, and the
   line-vertex count. **And do not profile a specimen that is still senescing** — a run
   that times several variants back to back advances the plant through its own leaf drop
   and reports the draw getting 7x cheaper. PITFALLS 2026-08-02.
0b. ~~**MURRAY'S LAW IS WRONG FOR SELF-SUPPORTING AXES (ROADMAP 14)**~~ — **DONE
   2026-07-30, and it was a minor term.** The literature was right about the mechanism
   and wrong about the size: `radiusExp` exists and ships at 3, because the exponent
   provably rescales the radius profile without bending it, and `p = 2` buys 23% of a
   taper that is 4x off. "We are over-tapering every trunk" was backwards — they are
   **barrels**, 1.33-1.63 over the whole height. What supersedes it:

   **`fruitFlow` IS THE TAPER (the follow-on, and it is cheap).** Zeroing it moves the
   taper **+173%** against the exponent's +23%. It is 48x the tip's own baseline, added
   at every station of a fruiting axis, and it has **no sweep in TUNING.md and never had
   one**. Seven of eight species taper 3.9-4.8 before fruit set and become barrels in
   the single step that sets it, permanently. ⚠ It is not obviously *wrong* — a terminal
   fruit is drawn through every station below it — so this is a magnitude-and-look
   question and **wants a person watching**, not a sweep alone. `EI` is built on these
   radii and `r⁴` is unforgiving, so **`node test/stem.mjs` is not optional here.**
1. **The rest of what the garden owes (ROADMAP 10b)** — its headline half is 0a above.
   The remainder is not about frames: a species picker that samples *with* replacement
   (a stand of seven from a catalogue of eight came out as four distinct species), and a
   director whose entire shot list assumes one subject — which got sharper with the
   conifer, since at 46 units it is three times the height of any herb.
2. **The handover** — a new specimen germinating as the old one fades. The garden has
   reframed rather than replaced this: the question is now "a stand gains and loses
   members", and the scene already holds a list. `Plant.dead()` is the trigger and the
   camera director already exists. It also owns an open question: the final frame is a
   dim, small silhouette and the end of the film is not composed yet.
3. **A lamina that gives (ROADMAP 9)** — the debt the petiole left behind, and the
   reason the attached blade's twist ships off. The most interesting route is to put
   the midrib's compliance in series with the petiole's, using the width the vein
   hierarchy grew, which would make the flap frequency emergent from the vein network.
   That is also #4's machinery, so the two are much cheaper together.
4. **The third phyllotaxis hypothesis** — the honest headline limitation, below.
   Pure science, and a negative result is as publishable as a positive one here.
5. **Lamina tensioning its own margin** — real quality jump, real work.
6. **A ribbon as twelve floats (ROADMAP 11)** — the one piece of pure engineering, and
   it has numbers now. A ribbon costs 188ns against a point's 37ns, a ratio of 5.1
   against a data ratio of 6, so the line pass is memory traffic and there is nothing
   to shave inside the current vertex format — a rewrite that removed 316,000
   allocations a frame bought 3%, which is in JOURNAL so nobody tries it twice.
   Instancing it speeds up every view at once and hands back the 64MB the line buffer
   had to grow to.

### Four live limitations, all with diagnoses rather than excuses

**The garden has not been watched at framerate in a real browser.** Geometry is
comfortable; the simulation is not obviously so, because eight specimens each take up to
six `plant.step(1)` per frame. Headless fps is explicitly not worth reading here and the
tools do not claim otherwise. Establishing a stand also takes ~38s at the shipped
budget — interactive throughout, and it reads as the clearing filling in, but nearly all
of that is leaf-library canalisation. **Measure before optimising, and do not buy frames
by widening the vein cull** — it is anchored so the subject keeps every ribbon it always
had, and loosening the anchor is how the hero quietly stops looking like itself.

**Phyllotaxis is ordered but does not lock to the golden angle** — it wanders
90–160°. Do not add a fudge factor to force 137.5°. Displaying the real measured
number, spread and all, is the point. Two hypotheses have been tested and
falsified; the third is ROADMAP 3.

**The attached blade does not rock at all, and that is now a decision rather than a
defect.** The petiole is physical, and at a physical stiffness the one-degree-of-freedom
rigid blade snaps between face-on attitudes instead of rocking, so it ships disabled with
its three measurements written down (ROADMAP 9). What a viewer reads is the stem, which
bends for real at 0.56-0.64 Hz, and the hang, which is now a force balance. **If you are
picking up work with no other instruction, pick up the architecture view (ROADMAP 0z,
small and specified), then what the garden owes (ROADMAP 10b). The needle was built and
REJECTED — do not restart it.** Also still
open is the other half of step 4: a falling blade's long axis snaps level on the frame it
detaches on — by a median 15° now, down from 27°, because a derived droop hands the fall
a smaller tilt exactly as ROADMAP 7b predicted — and the obvious fix was built and
falsified, see `FALL_DEFAULTS.tiltPlane`.

**Senescence is built and drawn, but it is split down the middle.** *When* a
specimen senesces is emergent — `Plant.spent()`, a physical condition with nothing
scheduling it. *The order* is imposed: a wave up the plant, oldest first, plus the
within-blade rule that tissue against a vein drains last. Both are SCIENCE.md item
6. Four attempts to derive the between-blade order from auxin transport were
falsified, and **the machinery for them is still in the tree and is easy to
mistake for live code** — read the 2026-07-26 JOURNAL entries before reopening it.
The route out is light, not another molecule.

What is *not* imposed there, and is worth protecting: no leaf has a lifespan,
nothing counts down, and the pattern a dying blade drains in is the distance field
of a vein network that canalised itself.
