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
node test/smoke.mjs                                # structural invariants; the CI gate
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
```

Four browser tools are about the scene rather than the simulation, and one of them
checks something no other harness here can:

```bash
node tools/garden_shot.mjs shots 7        # grow a stand, three framings, buffer occupancy
node tools/garden_hitch.mjs 7             # DOES PLANTING A GARDEN FREEZE THE TAB?
node tools/veinlod_shot.mjs shots         # before/after for the vein LOD, on the hero
GARDEN=7 node tools/clip.mjs shots/g 10   # record the stand moving
```

`garden_hitch.mjs` exists because **a harness that waits cannot see a freeze.**
`plantGarden` once blocked the main thread for nineteen seconds and every capture
script in `tools/` passed — they all navigate, wait, and screenshot, so a frozen
tab and a busy one are the same script. It measures the gap between animation
frames and exits non-zero past 250ms.

**Five of those assert and exit non-zero: `smoke.mjs`, `wind.mjs`, `stem.mjs`,
`petiole.mjs`, `veinlod.mjs`.** The
rest print and never fail. That split is the project's epistemics in miniature — an
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

Two more files are **archived experiments** in whole, not live checks. They are the code that
produced the negative results in [docs/JOURNAL.md](docs/JOURNAL.md), kept so those
results stay reproducible. Both still run; neither should be read as a current
diagnostic:

```bash
node test/inhib.mjs 0 1     # falsified: a second inhibitor with its own length scale
node test/ring2.mjs 0 1     # falsified: confining initiation to a thin generative ring
```

Both take `<shard> <nshard>` so a long sweep can be split across processes.

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
src/40_plant.js     the organism: axes, elongation, branching, florigen, fruit set, senescence
src/39a_stem.js     THE STEM BENDS. Axes as coupled damped cantilevers off EI on the
                    radii Murray's law grew, loaded by the canopy. Lettered, not
                    numbered, because it must load after the air and before the organism
src/50_geom.js      simulation state -> triangles, ribbons, points; senescence colour.
                    Vein LEVEL OF DETAIL is here, and it is what lets the scene hold
                    more than one plant
src/60_render.js    WebGL2: forward pass, bloom, depth of field, grade. No sway — the
                    geometry moves for real now
src/70_app.js       species presets, camera director, scene assembly, App.setWind.
                    A SCENE IS A LIST OF SPECIMENS now, not one plant: makeSpecimen,
                    drawSpecimen, plantGarden, sceneBounds
src/80_main.js      UI wiring, including the wind slider
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
- **Get a person to watch it.** Twice now the fastest path to a genuine modelling error was AJ watching for a few seconds. When a report says "feels like a bug", measure it before explaining it — and take more than one measurement, because "too fast" has meant frequency once and amplitude once, in nearly the same words.
- **Never fake it to make it look better.** The piece's entire claim is that nothing is drawn. A single hardcoded curve would make the whole thing a lie.

## The honest state of it

*Current as of 2026-07-29. The most recent landings are the wind field (#16), the
falsified second rotational plane (#17), the bending stem (#18), the weather being
turned down to force 2 (#19), the occlusion cull no longer hiding leaves the viewer can
see (#23), the petiole becoming a petiole — pipe-model radius and droop as a force
balance (ROADMAP 5 + 7b) — and **the scene becoming a garden** (#25, ROADMAP 10); if the
git log has moved a long way past those, treat the specifics below as needing a re-read
rather than as fact.*

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

Geometry is comfortable now — eight specimens is 551k triangles and 664k lines against
buffers about 60% full. **Simulation is the ceiling**, and it has not been watched in a
real browser yet.

**The life cycle is complete.** A specimen germinates, leafs, flowers, fruits,
ripens, and then **finishes**: it runs out of growing points, drains each blade
into its own veins, drops them one at a time in a wave up the plant, and reports
`dead`, leaving a standing seed head. All eight species get all the way through.
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

1. **What the garden owes (ROADMAP 10b)** — the cheapest interesting work here, and
   none of it is research. The simulation cost of stepping eight specimens is the real
   one: a grown background plant pays full `stepAuxin` cost to pattern tissue that will
   never change again. Also a species picker that samples *with* replacement (a stand of
   seven from a catalogue of eight came out as four distinct species), and a director
   whose entire shot list assumes one subject.
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
picking up work with no other instruction, pick up what the garden owes (ROADMAP 10b),
then the handover (ROADMAP 6).** Also still
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
