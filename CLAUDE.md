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
```

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

One check cannot be done in Node at all: whether the GLSL the shader compiles is the
same wind field the simulation sums. `tools/wind_check.mjs` evaluates the emitted
shader on a real GPU and compares it to `windAt()` — the only thing in `tools/` that
returns a number and an exit code instead of a picture. A wrong wind still looks like
wind, so this is not a class of bug the eye can catch.

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
                    aerodynamics; the petiole as a damped torsional spring
src/40_plant.js     the organism: axes, elongation, branching, florigen, fruit set, senescence
src/50_geom.js      simulation state -> triangles, ribbons, points; senescence colour
src/60_render.js    WebGL2: forward pass, bloom, depth of field, grade, and `SWAY` —
                    a decorative vertex wobble the simulation cannot see. ROADMAP 7 deletes it
src/70_app.js       species presets, camera director, scene assembly
src/80_main.js      UI wiring
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
- **Never fake it to make it look better.** The piece's entire claim is that nothing is drawn. A single hardcoded curve would make the whole thing a lie.

## The honest state of it

*Current as of 2026-07-26. The two most recent landings are the falling blade (#13)
and the mechanics pre-flight (#14); if the git log has moved a long way past those,
treat the specifics below as needing a re-read rather than as fact.*

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

**There is one air now, and it is half wired in.** `37_wind.js` is a real wind
field — log-law boundary layer, Kolmogorov gust ladder, Taylor advection, exactly
divergence-free — evaluated by the simulation and (in the emitted GLSL) by the shader
from **one baked table of modes**, so it cannot be two functions that resemble each
other. Every attached blade is now loaded through the same plate model the fall uses,
and hands its attitude and rate to the fall at abscission. ROADMAP 7 steps 1, 2 and
half of 4.

**`SWAY` is still there and still what moves the scene, because the attached blade
rocks by a quarter of a degree.** That is not a solver bug: the petiole is drawn at
half the *stem's* radius — 8 mm through — and torsional stiffness goes as r⁴, so the
blade is a rigid card on a rubber rod. The next thing to do is therefore ROADMAP 5,
the petiole's radius, which arrived at the same defect from the cosmetic side. Read
the 2026-07-26 JOURNAL entries before touching either; they rank three ways out and
say why softening `eModulus` is not one of them.

### Where the work goes next

[docs/ROADMAP.md](docs/ROADMAP.md) is the ranked list and has the reasoning; the
short version, in order:

1. **One air, continued** — the field and the attached blades have landed; what is
   left is **the stem genuinely bending** (step 3), the second rotational degree of
   freedom that would stop a falling blade snapping its long axis level (the other
   half of step 4), and deleting `SWAY` (step 5). Days, not an afternoon.
   **But do the petiole's radius first:** step 2 measured itself into needing it, and
   nothing about attached-blade motion will be visible until it is fixed.
   ROADMAP 7 has the staged order and the pre-flight table: `EI ∝ r⁴` on the radii
   the plant already grows gives plant-like sway (0.5–4.6 Hz on seven of eight
   species) off **one** material constant, `E ≈ 60 MPa`. `droop` is deliberately held
   back to 7b.
2. **The handover** — a new specimen germinating as the old one fades. The last
   piece of the cycle. `Plant.dead()` is the trigger and the camera director
   already exists. It also owns an open question: the final frame is a dim, small
   silhouette and the end of the film is not composed yet.
3. **Petiole radius at flower scale** — an afternoon, with a clean repro shot.
4. **The third phyllotaxis hypothesis** — the honest headline limitation, below.
   Pure science, and a negative result is as publishable as a positive one here.
5. **Lamina tensioning its own margin** — real quality jump, real work.

### Three live limitations, all with diagnoses rather than excuses

**Phyllotaxis is ordered but does not lock to the golden angle** — it wanders
90–160°. Do not add a fudge factor to force 137.5°. Displaying the real measured
number, spread and all, is the point. Two hypotheses have been tested and
falsified; the third is ROADMAP 3.

**The scene still has two models of the same air, and now three.** A shed blade and
an attached blade are both properly loaded aerodynamic bodies off one field — that is
new — but `SWAY` in the shader is still what visibly moves the scene, and the stem does
not bend at all. That is deliberate rather than half-finished: ROADMAP 7's own order
says two air models is the bug and adding a third temporarily is fine, and `SWAY` goes
only once steps 3 and 4 hold. **If you are picking up work with no other instruction,
pick up the petiole's radius (ROADMAP 5) and then step 3.**

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
