# Pitfalls

Every one of these cost real time. Several will bite again.

## Numerics

**Explicit Euler stability.** `dt < 1/(2·D·w·deg)`. With `D=6`, `w≤1`, six walls
per cell the ceiling is about **0.014**. Current: `dt: 0.014, substeps: 3`.
Exceed it and the field saturates to a flat ~29 everywhere, which looks exactly
like a *parameter* problem — you will chase production and decay rates for an hour.
**If the field is flat and pinned near the clamp, suspect the timestep first.**

## The auxin engine

**Competence must gate gradient *sensing*, not transport capacity.** Modelling the
central zone as "less PIN" stops it exporting auxin, so it becomes a reservoir and
the summit swallows the whole pattern. Gate how *polarised* the carriers can be —
blend the wall allocation toward uniform — and leave total transport alone.

**Competence must NOT gate canalisation.** A cell carrying real flux can polarise
to it whatever its identity. That is why veins cross tissue that would never
spontaneously form a maximum.

**Canalisation needs TOTAL flux, including the diffusive part.** Before any PIN is
polarised there is no directed carrier flux — only the concentration gradient
toward the sink. Exclude diffusion from `J` and no canal ever nucleates. Feels
principled, is wrong.

**The canalisation feedback must stay quadratic.** If `π` saturates, every wall of a
cell ends up equal and the cell has no polarity at all. A canal is the *contrast
between walls*, not the absolute level. `Jsat: 1e6` keeps it in regime.

**Threshold veins on per-cell polarity SHARE, not absolute PIN.** Absolute
thresholding only ever shows the trunk, where all flux funnels.

**Normalise a display mapping against the range that SURVIVES, not the global
max.** Vein width was `log(1+mag)/log(1+maxPi)`, where `maxPi` is the maximum
over every wall in the tissue — including the ones filtered out as non-veins. The
kept veins never reach the bottom of that range, so the lower 44% of the output
was unreachable and a real 15x hierarchy was drawn at 1.5x. The engine was right
the whole time; the presentation step was lossy. **When a filtered subset is
mapped to a visual channel, normalise against the subset.** Nothing looks broken
when this happens — it just quietly looks bland, which is far harder to spot than
a crash.

**A visual channel that discriminates on one tissue can be flat on another.**
The meristem close-up draws needle length from `|polarity|`, and it works: the
competence gate keeps the central zone blurred, so an uncommitted cell genuinely
has a short needle. Reusing that on the blade renders the lamina as one uniform
lamp. The blade runs in flux mode with no competence gate, so *every* cell ends
up essentially fully polarised — measured 0.966 on a vein against 0.957 between
veins, a ratio of **1.01x**, on three seeds. The quantity that separates a vein
from an areole there is traffic: 2.9-5.0x on the same cells. Nothing is broken in
either case; the same channel is simply informative on one tissue and constant on
the other. **Before reusing a display mapping on new tissue, measure its contrast
on that tissue** — `test/lamina.mjs` does exactly this, and reports which of three
candidate channels actually separates.

**A conserved quantity cannot be a scarcity signal.** Abscission was modelled on
flux through the petiole: a leaf that cannot export is shed. But in steady state a
leaf exports what it produces, so that flux measures the blade's own production and
says nothing about its neighbours — mean export moved 0.66 → 0.69 across a 4x change
in sink strength *and* turnover taken to zero. Nothing looked broken; the numbers
were plausible and stable and meant something other than what they were read as.
**Before building a decision on a transport number, check whether conservation
already pins it.** If what flows out must equal what went in, the number is an
accounting identity, not a measurement of competition. Same family as the
self-referential normaliser below: the machinery was fine, the quantity was not.

**Competition needs a contest that is still open.** Auxin transport competition is
real in the Prusinkiewicz bud model because the contest there is over *establishing*
a canal in unpolarised tissue — a transient, winner-take-all. A stem is fully
canalised long before any leaf's fate is in question, so there is nothing left to
win. Reusing a competitive mechanism on tissue that has already resolved gives a
smooth monotonic field with no threshold in it: `a_stem/a_blade` came out reversed
for **96 organs out of 96 at every timepoint**, mean 2.57. A signal present in 100%
of cases is not a signal.

**Exactly one mechanism may own a state variable.** With both the old and new
senescence paths incrementing `org.sen`, they simply added, and the falsified path
scored rho 0.42/0.47 — a partial success. Isolated, it was −0.05/+0.02. **Two
mechanisms writing one variable cannot be measured against each other**, and the
contaminated reading fails in the flattering direction, so it will not look like a
bug. When replacing a mechanism, make the old one return early rather than leaving
it to be additively harmless.

**A primordium must stay a local MAXIMUM.** Model it as a strong decay sink and it
becomes a pit; the up-the-gradient vectors around it then point *away*, and you get
a ring of satellite maxima. How hard a maximum can drain is capped by what the
surrounding network can pump in.

## Growing tissue

**Drive cell division from measured local density, never an abstract area clock.**
A clock desynchronises from the spacing that relaxation actually enforces, giving
boom-bust oscillation and eventual extinction of the whole sheet. Divide when a
cell's neighbourhood has thinned.

**Never track anything by cell index across frames.** Cells are swap-removed;
indices are not identities. Track by position, or by the stable `id` field.

## Species presets

**A parameter that is overwritten before it is read is not a parameter.**
`leafOpts.aspect` sat in all four species presets, differing 0.30 → 0.58, and had
done nothing since the margin engine landed: `Leaf.step()` assigns
`o.aspect = margin.aspect` the instant the outline matures, which is before
`_build()` ever reads it. Every species grew the same leaf (measured aspect
0.44/0.45 across all four). Species leaf character now comes from `marginBias`,
which scales the margin's own chemistry. **If a preset field is meant to change
the output, grow one and measure the output** — `test/species.mjs` does exactly this.

**`minInternode` DISCARDS primordia, it does not queue them.** A shoot that
elongates slowly throws away almost everything its meristem emits. The first
rosette attempt made 12 leaves out of 42 primordia and looked like a patterning
failure; the patterning was fine. Any species with near-zero elongation must lower
`minInternode` to match, or it starves.

**An axis that hits `maxOrgans` arrests, and an arrested apex can never flower.**
`maxOrgans` is not "how many leaves this species has" — it is a kill switch. Set it
comfortably above the leaf count the species actually reaches, and let flowering be
what stops the shoot. A parasol capped at 15 hit the cap before florigen crossed
threshold and never flowered at any seed.

**A floral axis that never reaches `floralOrgans` never sets fruit — and never
arrests, so it elongates forever.** On screen: a bare whip shooting out of the top
of an otherwise finished plant. `test/species.mjs` reports this as the `stuck`
column. **Fixed 2026-07-25** by making "the apex is spent" a physical condition and
`floralOrgans` merely a ceiling on top of it (12 of 16 runs affected → 0 of 16). The
trap generalises: **an organ budget expressed as a count can only terminate a process
that reliably reaches the count.** If the process can stop early for physical
reasons, the counter is not a terminating condition, and the failure shows up as
something that never stops rather than as an error.

**A whole-plant condition turns any per-axis leak fatal.** `Plant.spent()` is an
AND over every growing point, so one shoot that never arrests freezes the entire
organism's life cycle. Hoarfrost Thicket had exactly one such shoot — a `gen1`
lateral stuck at a single organ, still holding a meristem after 30000 steps, because
it elongates too slowly to clear `minInternode` and so discards every primordium it
emits. It never reaches `maxOrgans` (1 of 34), never exhausts `organBudget` (84 of
96), and cannot flower out because only `gen === 0` answers florigen. Harmless for
as long as the consequence was a slightly odd twig; fatal the moment a whole-plant
predicate depended on it, and the specimen simply never finished.

This is the **third** instance of the same root trap now: *an organ budget expressed
as a count can only terminate a process that reliably reaches the count.* Fixed the
same way as the other two, with `apexStalled`/`vegGrace` alongside `floralGrace` and
`spotGrace` — notice that something has stopped, rather than assert what it should
have reached. **Adding an organism-level predicate is a new and much stricter test
of every per-part termination rule you already have**, so expect it to surface the
leaks, and check every part that can decline to terminate rather than only the one
that broke.

**A coordinate measured against a shrinking reference does not change.** Floral organ
identity `q` was `1 - prim.r / meristem.rPZ` — the founding radius over the apex's
*current* radius. Organs are founded at the rim, so it read ~0 for every organ of
every flower, for as long as floral organs have existed: 291 of 294 organs came out
petals and the inner-whorl code path had never once executed. The comment above it
described the intended mechanism ("the meristem shrinks as it consumes itself, so
later organs start further in") accurately enough that it read as working code.
**A ratio is only a measurement if its denominator is fixed** — `q` is now measured
against the radius the apex had when it converted. Two lessons: a self-referential
normaliser silently reports a constant, and *a code path that has never executed has
never been seen*, so its output can be arbitrarily wrong (these organs were rendering
with the foliage palette).

**A cache that is only filled while something is polling hides the data loss.** The
plant holds the last divergence reading so the display does not blank when every
apex has retired. The app polls `stats()` every frame, so the cache was always warm
and the hole was invisible; a headless run calls `stats()` once at the end, by which
time the reading is gone. It only surfaced when apices *started* retiring reliably.
**If a cache exists to survive teardown, fill it at teardown, not on read.**

## Rendering

**`glClear(DEPTH_BUFFER_BIT)` respects the depth mask.** Clearing with `depthMask(false)`
is a silent no-op, so stale depth from previous frames rejects geometry as the
camera pulls back. Cost hours; presented as a shading bug.

**Place organs by interpolated arc length with a parallel-transported frame.**
Indexing the nearest stem vertex makes every organ hop sideways each time the stem
gains a point. This was most of the "jitter".

**Lift veins off the blade along the normal** or they z-fight into speckle.

**A constant triangle count is evidence, and it is the first thing to read when
geometry looks wrong.** "Leaves snap in and out of existence" was chased through
buffer saturation, NaN vertices, backface culling and depth precision before
anybody looked at `renderer.nTri`, which sat on the same integer for 1202
consecutive frames while nothing moved. Constant count with a changing picture
rules out everything that *drops* geometry and points at the one thing that
decides not to *build* it. See the 2026-07-27 JOURNAL entry.

**Clearing the line of sight is a statement about ANGLE, not about world
distance.** The occlusion cull compared each organ's world-space offset from the
sight line against the subject's world-space clearance at any depth, so a leaf
beside the lens was given the same allowance as one touching the subject. Scale
the radius by `t / distanceToSubject` — a cone, not a cylinder.

**Anything that hides geometry must open as the camera ARRIVES, not on the cut.**
This is written down twice now because it was fixed once for the leaf close-up and
then not applied to the director's own shots, which had it identically. A cut that
engages a clearance at full width from the wide shot removes a third of the canopy
in one frame, before anything has moved. Ramp on apparent subject size.

**`takeOver()` must drop everything the director owns, not just some of it.** It
cleared `subject` and left `focus`, and because the auto-framer is already locked
out while the viewer drives, the only surviving effect of that stale focus was to
keep the occlusion cull running against a subject nobody was looking at — 80% of
the canopy blinking as the viewer orbited, forever, since `giveBack()` only fires
on idle. **When a handover clears state, enumerate the state.**

**A reveal driven purely by distance does not survive many instances of the
thing.** The growing-tip close-up has no mode to find: come close enough and the
mechanism fades up. That works because there is one meristem and the camera is
pointed at it. Blades are twenty to a hundred, several sit near the lens at once
around the apex, and every one of them then refined its mesh and grew needles —
which put them all a hair from both the refinement threshold and the occlusion
cull, so they flickered in and out together. **13k triangles to 40k and back,
frame to frame, with the camera dead still.** Distance can still do the fading;
what it cannot do on its own is choose the subject. A microscope looks at one
thing, and which thing has to be decided, not inferred from proximity.

**An occlusion cull cannot be softened into a fade while the pass writes depth.**
The obvious cure for organs blinking in and out is to dim them instead of
dropping them — the blade already takes a `fade`. It does not work: the forward
pass runs with `depthMask(true)`, so a blade faded to black still hides
everything behind it, and hiding what is behind it is the entire job of the cull.
What a binary test *can* be is **sticky**. The subject these are measured from is
a growing, circumnutating tip, so the sight line moves even when the camera does
not; organs near the boundary crossed it back and forth every few frames. With
hysteresis — clearly inside to be dropped, clearly outside to return — a wobble
at the boundary decides once instead of once per frame.

**A full geometry buffer drops triangles silently.** `Buffers` returns early when
a write would overrun, so saturation looks like a picture that is merely missing
things, not like an error. Going into a blade at cell resolution on Sun Coral
(104 organs) pinned **both** the triangle and the line buffers at exactly their
caps, and what was being thrown away was the needles — the entire point of the
view. The specimen alone was already at 86% of the old triangle buffer, so the
margin had been thin for a while and nothing had said so. **`nTri` or `nLine`
sitting on a suspiciously round number is the tell**: compare against
`B.tri.length/10` and `B.line.length/7`, and if they match you are not looking at
a busy frame, you are looking at a truncated one. Lines saturate first — every
vein and every needle is a six-vertex camera-facing ribbon.

**Measure fog from the subject, not the eye.** Fog tuned at 10 units dissolves the
plant entirely once the camera sits at 30.

**Asking to go somewhere is not driving the camera.** `userDriving` locks the
auto-framer out so the wheel does not fight the director — correct, and it fixed a
real bug. But the close-up buttons call `takeOver()` before switching mode, so
"into the cells" set the mode and then guaranteed the camera would never travel to
it. The mechanism faded up only if you also scrolled in by hand, which nobody
does. A focus change now buys a short window (`focusFly`) in which the framer may
still fly, and any touch of the camera spends it. **A flag that means "the human
is steering" must not also swallow the human's explicit request to be taken
somewhere.**

**A flat subject needs the camera oriented to its normal, not to a fixed
elevation.** The apex close-up looks down from `el = 0.78` and that is fine
because a meristem is always roughly horizontal. A blade hangs at whatever its
tilt, droop and roll produce, and a leaf seen edge-on projects its whole cell
sheet onto a single line — the first captures showed a bare stalk with a row of
lights along it and looked exactly like the cells were being drawn in the wrong
place. They were in the right place; the camera was in the wrong one.

**Additive passes need `blendFuncSeparate`** so they don't corrupt linear depth
packed into the scene alpha (used by the depth-of-field pass).

**Growth must be expansion of existing tissue, not appearance plus scaling.** Leaves
expand basipetally with a furled tip; internodes below the apex keep stretching and
carry organs apart. Uniform scale-up reads as mechanical instantly.

**A comment that says "alive" is not a filter.** `Plant.bounds()` opens with
"world-space extent of everything currently alive" and counted every organ ever
made, at full reach. That was harmless for as long as nothing was ever removed
from the plant — and the day blades started being shed, a specimen that had
dropped its entire canopy was still framed for it and sat as a speck in the middle
of an empty shot. The framing was wrong long before anything could show it.
**When you add the first mechanism that removes something, re-read
every loop that walks the collection it came out of.**

## Physics borrowed from a paper

**Sign conventions do not travel; behaviours do.** The added-mass (Munk) torque in
the falling-plate model must turn a plate *broadside* to its own motion — that is
why a dropped card falls flat. Written with the sign as it appears in one write-up,
plates settled **edge-on and knifed down at twice terminal velocity.** Different
presentations of the same model use different frames, so the sign you copy may be
right for a frame you are not in. **Validate against a behaviour everybody has
seen** rather than against the page. On screen this would have looked like "the fall
needs tuning".

**Reduced-order models have a dimensionality, and yours is probably not 2D.** The
plate model solves a cross-section, i.e. an infinitely long plate. A leaf is a stub.
Uncorrected, that over-predicts lift by roughly 2x and produced motion whose first
review was "way too flappy spinny". The finite-span correction `AR/(AR+2)` is one
line. Ask what the borrowed model assumes about the dimension you are not solving.

**Check whether two coefficients are actually one.** `cRot` (rotational damping) and
`cPerp` (broadside drag) are the same normal-force drag coefficient, one integrated
over a rotating chord and one uniform. Treating them as independent and inventing
0.90 for the first silently halved the damping and survived several revisions,
because a wrong-but-plausible coefficient does not announce itself the way a wrong
sign does.

**Simulate the object you draw.** `70_app.js` draws a blade at 0.80 of its organ's
length and shrinks it a further 12% as it dries. The fall was computed from the
organ length, making every plate 1.4x too big and pushing the whole population
toward fluttering. The factor now lives in exactly one place (`39_fall.js`) and both
the picture and the physics read it. **If a renderer scales something, the physics
about that something has to use the same scale.**

**Classify a trajectory by the thing that actually distinguishes it.** Two attempts
at naming flutter-vs-tumble were wrong before the third worked: *net* rotation calls
a plate that went round and came back "barely rotating", and *amplitude* calls a
14-degree transient "flutter". The discriminator is whether the pitch angle is
bounded — the fraction of travelled rotation that ended up as net rotation.

**Do not assert a monotonicity the literature does not claim.** The regime sweep
demanded a clean ordering in I* and failed on rows in the middle that flipped label
between adjacent chords. That is the *chaotic band* the papers put between flutter
and tumble; a single run inside it is genuinely unclassifiable. The check now tests
the ends and allows chaos between them. **When a physics check fails in the middle
of a range, ask whether the middle is supposed to be clean.**

## Simulation that rides inside the frame loop

**Step it in plant time, not frame time.** The fall integration was first written
into `buildScene()`, which runs once per frame — so the speed of a falling leaf
depended on the machine and ignored the time slider. It belongs in `Plant.step`,
which is advanced a bounded number of times per frame from an accumulator
(`70_app.js:743`). Anything that is *simulation* has to go there; only reading goes
in the scene builder.

**A stiff sub-system needs its own step size.** Flutter is an order of magnitude
stiffer than the growth loop it rides inside, and tumbling is stiffer again. At six
sub-steps per plant-time unit mid-range plates ran away to **1e124 within a hundred
units.** The sub-step is now set from the plate's current spin, with a hard ceiling
so an unforeseen state cannot take the frame with it.

**A shed organ must stop reading its live frame.** The axis keeps swaying after the
leaf has gone; a falling blade that reads `org.frame` is hinged to a stem it has
left. Snapshot the frame at abscission.

**A fade budget calibrated against a constant breaks when the constant becomes a
variable.** The old fade ran over a fixed 620 plant-time units from letting go,
which was safe only because descent speed was fixed — it always covered the same
distance in that time. Once falls varied nearly tenfold, blades were half
transparent before they were halfway down and **vanished in mid-air; 36 of 96
reached the ground.** The fade now keys off landing. Look for this wherever a
duration was tuned against something that has since become emergent.

## Process

**Script edits fail silently.** A Python `str.replace` that matches nothing returns
the string unchanged and reports success. This happened three times in one session.
One instance left fruit-wall smoothing at 22% per step for 1500 steps — the
difference between a lobed fruit and a perfect sphere, and it was only caught
because a number failed to move. **Assert every anchor, and write the file only
after all edits succeed** so a failure rolls the whole batch back.

**A harness can outlive the parameters it sweeps.** `test/sweep.mjs` swept
`sinkStrength` and `sinkSigma` across a 72-row grid. Both options had been removed
from the meristem — the sink model was replaced by `organDrain`/`rimDrain` and
primordia-as-maxima — so the meristem ignored them and six rows differing only in
those two fields came back byte-identical:

    {"T":10,"D":3,"S":1.5,"sig":2.2,"mean":107,"sd":92.2,"lock":0.18,...}
    {"T":10,"D":3,"S":4.0,"sig":3.0,"mean":107,"sd":92.2,"lock":0.18,...}

Nothing crashed. It printed a plausible table, and the honest reading of that table
is a **false negative** — "sink strength does not affect the angle." Same shape as
the display-mapping bug above: the machinery was fine, the measurement was not.
**Before trusting a sweep, check the knob still moves the number.** One row at each
extreme is enough.

**The bundle is one shared scope.** Duplicate top-level `const` names across modules
throw at load. `build.js` warns; heed it.

**...and until 2026-07-26 that warning had a hole big enough to ship a dead page
through.** The scan read only the FIRST name of a declarator list, so

    const _c0 = v3(), _c1 = v3(), _sc = v3();     // _sc collides, 20 lines up

produced no warning at all. `build.js` printed `built canalisation.html 223.1kb
js`, wrote a bundle that was a `SyntaxError`, and `node test/smoke.mjs` passed 47
checks — because the gate imports the *simulation* and the collision was in the
*geometry*. Every headless check was green and the page was blank. It was caught
by a new harness that happened to import `50_geom.js`.

`build.js` now compiles the bundle with `new Function` before writing anything and
exits non-zero if it does not parse, and the declarator scan reads the whole comma
list. Two things to take from it that outlive that one bug: **a green CI gate is
only evidence about what the gate imports**, and **the artifact is not verified
until something has parsed it.**

## Numerics and code generation (2026-07-26, ROADMAP 7)

**A sign that lives in an operator cannot be read back out of generated source.**
`windGLSL()` emitted `sin(dot(k,p) - om*t + ph)`, and the round-trip check that reads
the constants back out of the emitted GLSL recovered `-om` for a positive frequency and
`-om` for a negative one — so half the mode table verified as correct while wearing the
wrong sign. Frequencies are now baked already negated with every term a `+`. **Any
constant a test has to verify should carry its own sign**, and any generated numeric
literal should be parenthesised if it can be negative, because `- -1.2*t` is not GLSL.

**An explicit integrator on a spring you did not measure first will pin itself against
your safety stop and look plausible.** The attached blade's petiole came out at
374-4040 Hz at the time — 200 radians per plant-time unit; it is 7-25 Hz now that the
stalk has a derived radius, and the lesson survived the change — and the first
integrator was symplectic
with a cap of 96 substeps. The stiffest blade on the specimen blew through the cap,
hit `maxFlap`, and sat there reading as a believable 68° twist that scaled with wind
speed. Two lessons: **measure the natural frequency before choosing an integrator**,
and a clamp that keeps a diverging state in range converts a crash into a *result*.
The linear part is now solved in closed form, so stability does not depend on the step.

**Everything proportional to a rate belongs in the damping, not in the constant
torque.** Holding a velocity-dependent aerodynamic term constant across a substep
pumped the oscillator: a ringdown in DEAD AIR grew from 12° to 27° over eight cycles,
with no energy source anywhere in the problem. If a conserved quantity grows where
nothing can be feeding it, suspect the split between what you integrate exactly and
what you hold fixed — and note that the artifact was *hiding* a real instability of the
same sign underneath it.

**A finite-difference tolerance that is fixed becomes stricter as the model gets
richer.** The divergence-free check used `h = 0.01` world units and passed at four gust
modes, then failed at seven with 5e-4 of pure truncation error — an assertion about a
field whose divergence is analytically zero, failing for a reason that had nothing to do
with the field. Scale the step off the smallest length in the model, and where you can,
assert the **convergence order** rather than a magnitude: halving the step must quarter
the residual, which an approximately-correct field cannot fake.

## Beam solvers, and three ways to be confidently wrong (2026-07-26)

All three of these produced a solver that ran, looked plausible on screen, and reported
a number. All three were caught by making the thing check itself against a value
computed **before** it existed — which is the entire argument for pre-flighting.

**A diagonal mass matrix is not a beam.** Stations as independent damped oscillators,
each `EI/ds` against the inertia above it, is the obvious discretisation and it does not
converge: `ds` goes as `1/M`, so every spring stiffens as the mesh refines while its
inertia does not, and the measured frequency climbed as the square root of the station
count — 1.57 Hz at four stations, 2.76 at sixteen, still rising. The coordinates share
inertia (rotating station j carries the mass above station k too), so the mass matrix has
off-diagonal terms; with them, compliances add in series the way a real cantilever's do.
**Sweep your resolution parameter before you believe any number that comes out.**

**The coupled mass matrix is ill-conditioned on purpose.** Neighbouring stations see
nearly the same mass at nearly the same distance, so its rows are nearly parallel,
`M⁻¹K` has an enormous spread of eigenvalues, and an explicit step at any affordable
size rings at the sample rate — the first version reported exactly Nyquist and zero
damping, which is a very recognisable fingerprint once you have seen it. Backward Euler
plus one Cholesky per axis per step: unconditionally stable, kills the modes the mesh
invented, and barely touches the one that matters.

**A constraint enforced by deleting part of the state is a damper.** The rotations are
meant to stay perpendicular to the axis they bend, so the state was projected onto that
plane after every substep. On a stem that curves, the tangent has a component along the
swing, so a fixed fraction of the deflection was deleted every substep — worth **20% of
the frequency**, with the solver ringing at 1.52 Hz while its own eigenvalue said 1.26.
Exclude the unwanted degree of freedom where it enters (here: drop the axial component
of the *torque*), never by repeatedly wiping the state.

**And measure a ringdown where the signal is.** Two harness bugs on top of the solver
bugs: counting zero crossings into the decayed tail measured float noise, and kicking
with a uniform shape excited every mode the mesh carried so the count read a mixture.
Kick with the mode you want, and stop counting once the amplitude is into the noise.

## Measuring instruments have bugs too (2026-07-27)

The wind and the stem produced four bugs in the *tools built to check them*, which is a
category worth naming because a broken instrument reports confidently and there is
nothing on screen to contradict it.

**A harness with its own copy of a shipped constant will eventually test a different
program than the one you are running.** `test/stem.mjs` hardcoded `4.0` and labelled the
column "force 3". When the shipped weather dropped to force 2 the harness went on
faithfully reporting a scene that no longer existed — and the table it printed was the
one the docs had been copied from. Read the constant out of the module that defines it
(`WIND_DEFAULTS.uRef`), and if the harness needs band edges either side of it, compute
those relative to the shipped value.

**A signal that contains growth is not a measurement of motion.** `tools/jitter.mjs`
recorded the stem tip's absolute position, which climbs steadily as the axis elongates.
Growth is a far larger displacement than sway, so the tool reported an rms near 1.0 world
units that barely responded to cutting the wind by a third: it was measuring the plant
getting taller. Record the deviation from the rest shape, where growth cancels. Note the
*frequency* estimate survived this — differencing a slow ramp adds little to the step
variance — so half the tool was right and half was garbage, which is the worst case.

**A number normalised by a scale that can be zero is a NaN waiting for a still day.**
Divergence divided by `sigma * k_max` is fine until `uRef: 0`, which is exactly the
configuration the dead-calm assertion exists to test.

**"It moves too fast" is two different measurements and you must take both.** Perceived
speed is amplitude times frequency. The first such report here really was frequency — a
wrong length scale putting every gust mode at 3.9-19.3 Hz. The second, phrased in almost
the same words a few hours later, was amplitude at an *unchanged* frequency: 0.53 to 0.60
Hz, peak slew 4.15 to 0.67. The frequency could not have moved, because it was the stem's
own resonance and only the forcing had changed. Pattern-matching the second report onto
the first would have sent the search straight back into the spectrum.

## Stops, scales and saturations (2026-07-28, ROADMAP 5 + 7b)

Four traps from one branch, and they share a shape: **a number that was harmless while
something else was wrong becomes load-bearing the moment you fix that something.** The
petiole was drawn at half the stem's radius, stiffness goes as r⁴, and everything
downstream of it had quietly been living in a regime nobody chose.

**A stop placed inside the model's own equilibrium does not bound the model, it replaces
it.** `maxFlap` was 1.2 rad = 69°. The added-mass torque turns a plate face-on, and
face-on is 90° from edge-on — so the stop sat *inside* the stable equilibrium. On the old
fat petiole the blade rocked a quarter of a degree and nothing ever reached it; on a real
stalk every blade parked against the clip, and the harness dutifully reported the stop's
value back as the physics. The tell is a "measurement" that comes back equal to a
constant. Ask, for every clamp, whether the thing being clamped has an equilibrium on the
far side of it.

**A saturated nonlinearity can impersonate a scaling law, and it will pass your test.**
The droop balance solves `theta = theta_h·cos(elev - theta)`. At the wrong modulus
`theta_h` is enormous, the fixed point pins against the geometry, and the answer stops
depending on the load at all. `test/petiole.mjs`'s first run asserted that bigger blades
hang lower, passed, and was measuring the saturation — at any modulus where the beam is
linear the ordering reverses. If an assertion passes in a regime you have not checked is
the intended one, it is not evidence.

**"Negligible" stated as an absolute number rots when the scale it was negligible
against moves.** `test/wind.mjs` proved the added-mass torque's sign by setting
`eModulus: 1e2`, four orders below the modulus of the day. Thin the stalk and the same
absolute value is not small, it is *degenerate*: the closed-form oscillator's equilibrium
term is `torque/k`, so as k falls it computes a finite angle as an enormous number times a
tiny one and loses every digit. The answer wandered — 53°, 132°, 65° — and read exactly
like a sign error in the physics. **Make "negligible" relative to what ships**, and if you
suspect degeneracy, sweep the parameter and look for a plateau: above k ≈ 1e-6 the answer
was clean and monotone across three decades.

**A harness that gates on an optional field silently measures nothing when that field
goes away.** The same file's abscission-seam section snapshotted only organs carrying a
flap state. The flap shipped off, `pre` stayed empty, and the section reported zero blades
— while the two quantities it actually measures are properties of the organ's *frame* and
have nothing to do with the flap. It failed loudly here only because one assertion checked
the sample size. Assert your sample size.

## A scene that stopped being one plant (2026-07-29)

**A harness that waits cannot see a freeze.** `plantGarden` ran every specimen's
head start in one synchronous loop — 11,400 steps for a stand of seven — and
blocked the main thread for **19 seconds**. Every capture script in `tools/`
passed, and none of them could have failed: they navigate, `waitForTimeout`, and
screenshot, so a frozen tab and a busy one are the same script. It was found by a
person opening the console and saying "it seems to just freeze, then resume".
`tools/garden_hitch.mjs` is the check that closes the gap — it records the gap
between animation frames and exits non-zero past 250ms.

**Cost during growth is not cost at rest, and the ratio is not small.** A
`plant.step(1)` costs ~300us on a grown specimen and about **1.7ms** while it is
growing, because that is when the leaf pool canalises its library. Any budget
sized on a steady-state measurement will be wrong by 5x exactly when it matters.

**Construction is a cost too.** A `Plant` takes ~70ms before its first step:
every `Axis` runs its meristem forward 220 steps in its own constructor, so the
axis is born from a settled sheet rather than a burst of organs. Budgeting the
head start but building all seven plants up front fixed the 19-second freeze and
left a 501ms one, which the harness then caught.

**`Plant` copies its options at construction.** `this.sp = { ...SPECIES_DEFAULTS,
...sp }` — so the specimen's `sp` and the plant's `sp` are *different objects*,
and setting the outer one looks like it works and does nothing. `senesceHold` has
to be set on `plant.sp`. This is the same shape of trap as the three inlined
copies of the petiole length that ROADMAP 5 found.

**A per-plant LOD rule silently becomes wrong when there are two plants.** Blade
mesh density keyed on `P.organCount()`, which was the scene's organ count while
there was one specimen. In a garden it gives every plant the density it would
have had *alone*, when what the frame has to carry is the total.

**`bounds()` framed the subject, and the framer believed it.** With a stand, the
camera damped in on the hero and ended up standing *inside* the garden looking at
the underside of somebody's canopy. Three captures in a row came back that way
and it reads as a bug in the scene rather than in the framing. Note the
exception that has to survive: when a shot *has* a subject, the subject is still
the right answer, because a close-up is a statement that the rest is not what we
are looking at.

**Sampling with replacement reads as a smaller catalogue.** Species are picked
at random per plant, so a stand of seven from a catalogue of eight came out as
four distinct species with one appearing three times. Fine as a default; wrong
if the point of the shot is the catalogue. Deal without replacement if so.

**A capture tool that sets the camera once has not set the camera.** The framer
damps `cam.dist` toward the scene's bounding sphere every frame, so anything set
at the top of a run is quietly pulled somewhere else before the shutter.
Re-assert immediately before the screenshot. Related: left to itself the director
picks a close-up, and the first run of `veinlod_shot.mjs` produced two frames of
the inside of a single petal.

## Render views (2026-07-29)

**A full buffer used to drop geometry in silence, and now it counts.** This has
cost two debugging sessions, and the advice for spotting it was to notice
`renderer.nTri` sitting on a round number — which you have to already suspect in
order to check. `Buffers` ticks `dropped.tri/line/pt` when an emitter has no
room, `Buffers.saturated()` reports it, the HUD prints it next to the fps, and
`test/views.mjs` asserts on it. If a picture is missing things, look there first.

**A framing distance that suits one species suits no other.** The first version
of `tools/views_shot.mjs` put the camera at a fixed 9 units for every specimen.
A Cathedral Fern at twenty seconds is 23 units tall, so that parked the lens
*inside* it and produced a page of close-ups of the underside of one frond in
four different views — which looked exactly like four broken views. Frame from
`sceneBounds()`, which is what the app's own framer uses.

**A level of detail rule inlined in `buildScene` is a rule no harness can see.**
`bladeMU`/`bladeMV` were computed inline, so `test/views.mjs` measured a stand at
the single-specimen mesh density and reported a garden 52% heavier than the one
that ships. That is the same failure as a harness keeping its own copy of a
shipped constant, arriving by omission instead of duplication — see `stem.mjs`
and its hardcoded wind speed. It is `App.setBladeLOD(specimens)` now, and the
harness calls it.

**`renderer.nTri` and `nLine` are VERTEX counts, not primitive counts.** They are
named for the draw calls they feed. `test/views.mjs` prints triangles and
ribbons; a tool reading the renderer prints vertices. Divide by 3 and by 6 before
comparing the two, or the same scene appears to have tripled.

**A blade drawn with `veinMul: 0` still emitted every ribbon**, at zero
brightness, costing full price for nothing — 22,439 invisible ribbons per
specimen in the lamina-only probe. A weight of zero has to be a skip, not a
multiply, anywhere the multiply happens after the work.

**`createShader` returns null instead of throwing**, so passing it straight to
`shaderSource` gets you the browser's argument-type complaint —

    Argument 1 ('shader') to WebGL2RenderingContext.shaderSource
    must be an instance of WebGLShader

— which sends you reading the shader source, where there is nothing wrong. The
fault is a context that cannot make shaders, usually a lost one. `sh()` in
`60_render.js` checks for it and reports `isContextLost()`, the renderer name and
the GL version instead. Worth the lines because it is the **first** thing the piece
does with WebGL, so that message is the only thing a viewer on an unsupported
browser ever sees. Seen once on Safari over `file://` and not reproducible in
Playwright's WebKit, which starts the piece fine on an Apple GPU.

**A control in the sheet cannot be judged while you use it.** The view rail shipped
at the top of the controls sheet, which is 560px wide and up to 70vh tall — so
opening it to change the view covered the plant whose view was being changed. It is
a segmented control in the bottom bar now. Anything whose effect is *the whole
frame* belongs in the bar; the sheet is for things you set and forget.

Related, and the reason the fix was not just moving the element: the explanatory
copy went with it, into `showTip`. That exposed a second thing — the tip had a flat
3800ms timeout, which suits the shortest slider tip and nothing else. The longest
view note is 260 characters, or 68 characters a second, about three times a reading
pace. It scales with length now.

## Performance

Leaf and margin simulations dominate. Grow a small **library** and share it —
never one simulation per organ (thirty tissue sims at once will crawl).
Retire spent meristems (`this.meristem = null`) and finished fruits (`done` flag);
an arrested shoot should cost nothing.

## `updateRadii` does two jobs, and only one of them may see the pose

`Plant.stepBend` calls `Axis.updateRadii` a second time, after the bend has been
applied, so that organ frames ride the stem that will actually be drawn. That is
correct and deliberate — the comment at `40_plant.js` says so.

The trap is that the same function also **sizes the stem**, and it does that by
walking `arc` against `org.birthLen`. `birthLen` is an odometer reading taken on
the shape *growth* produced; `arc` was measured off `this.pts`, which after the
bend is the *deflected* shape. Two rulers.

Bending is near-inextensible so they agree to about **1.5 ppm** — which sounds
like nothing and is not, because the comparison they feed is **discrete**. An
organ within a few times 1e-5 of a station boundary crosses it as the stem sways,
and that station's radius steps by one organ's worth of flow. Measured at 1.87%
on one station of one species and exactly 0.000% on the other seven: it is a
coincidence of where an organ landed, so it will move as the catalogue moves.

A stem whose thickness depends on how hard the wind is blowing is not a stem.
`arc` now comes off `this.rest` when its length matches; frames still come off
`this.pts`.

**The general form, worth carrying:** when one function computes both a material
property and a pose-dependent one, the material half must read the material
coordinate. It will not announce itself, because an inextensible deflection
preserves arc length almost exactly — the error only becomes visible where a
continuous quantity is compared against a threshold.

It surfaced as a single species missing a closed form by 2.8% while seven hit it
to 4e-16. A tolerance of 2% — which is what was written first, and which looks
generous — would have passed it.

## A general mechanism that has only ever run in one configuration is a special case wearing a general one's clothes (2026-07-30)

Two bugs, both found the day an axis was first allowed to point somewhere other than
straight up, and **neither is a mistake in the code that had it**. Both are exactly
right for a vertical axis, which was the only kind there was.

**1. Wander and circumnutation were in the world's frame.** They were added straight
into `want[0]` and `want[2]` and then renormalised. On a near-vertical `want`, adding a
horizontal offset tilts it — which is what they are for, and what makes an Ember Creeper
a helix. On a branch holding 80 degrees off vertical, the same offset barely changes
the elevation and swings the **azimuth** instead. A branch that ought to run out
straight snakes.

They belong in the plane *across* `want`, which is what circumnutation means — a helical
search about the growing tip's own direction. For a vertical `want` the corrected form
reproduces the old vectors exactly, chosen deliberately so the eight shipped species do
not move: `test/species.mjs` is identical organ for organ before and after.

**2. The azimuth had no restoring term, so it was a random walk.** `want` took its
vertical plane from the *current* tip direction. Gravity only ever argues about
elevation; nothing anywhere turns a shoot sideways. So every azimuthal perturbation was
remembered and built on, and the tip integrated a drift.

The measurement is the memorable part: a branch held a **correct 59-degree elevation
along its entire length** — every segment, checked one by one — while its azimuth turned
a full circle every nine segments. It corkscrewed 5.2 units up and 0.2 out. Every
per-segment number was right and the branch was wrong. An axis now remembers the
vertical plane it grew out in, which is the axil's own azimuth and is emergent.

**What to take from it.** Both were invisible for months because the configuration that
exposes them did not exist, and both were found within an hour of it existing. Before
trusting that something is general, ask what it has actually been *run* on. And note
that (2) was invisible to a per-segment check and obvious in a chord — the same shape of
failure as `test/conifer.mjs` section 3b, where four numeric sections agreed with each
other about a specimen that was the wrong way up.

## The same trap from the harness side: a check that measured the pose (2026-07-30)

Directly above is the bug where `updateRadii` sized a stem off the bent polyline
against a rest-shape ruler. Here is the same confusion arriving in a *test*, found
because a change that had nothing to do with it moved the number by 34%.

`test/conifer.mjs` PREDICTION 3 asserted that a bud escapes a fixed distance below the
apex, `d_esc = max(-dominance*ln(branching), V0*budRelease)`, and measured it as
`|tipPos - org.frame.o|`. That is a **straight line on the deflected pose**. Teaching
`updateRadii` to conserve flow at a fork thickened every trunk below its branches, `EI`
goes as `r⁴`, the leader stopped leaning — `zeta` 0.919 → 0.943, height 63.38 → 64.97 —
and the measured median escape distance fell from **5.49 to 3.64**.

**And not one escape time moved.** The median bud still escaped at age 2252, the count
was still 36. The release schedule — which is what the prediction was *about* — was
identical. The number that changed was how far the stem had bowed.

Bisected rather than guessed: reverting the one line that pushes a kid's subtree flow
into its parent's station list restored 5.49 exactly, with every other change in place.

**The general form.** A quantity that is invariant under deflection (a schedule, a
material length, a count) must not be checked through one that is not (a straight-line
distance, a world position, a chord). It will pass for years, because nothing else moves
the pose — and then something stiffens or softens a beam somewhere and the check reports
a change in a mechanism that did not change. The assertion is on the schedule now and
the distance is printed with a line saying what it is.

## A level-of-detail law can hold on every specimen the gate names (2026-07-31)

`test/views.mjs` asserts that a blade's cell view conserves drawn area from 6 to 96
units — the same conservation the vein cull obeys, stated for discs. It does, on
everything CI runs it against. Give `Ashfall Spire` a needle and it **fails**:

    node test/views.mjs 'Ashfall Spire'
      eye distance   cells drawn   total drawn area
                6            58      1.000x
               12            15      0.954x
               24             4      0.990x
               48             1      0.861x     <- FAIL, 8% tolerance
               96             1      0.861x

The law is `nDraw = max(1, round(T.n * shrink))` with each kept cell's radius scaled by
`sqrt(T.n / nDraw)`, which conserves area exactly **if every cell in the prefix is
drawn and every cell is the same size**. Neither is quite true: the loop skips cells
that fall outside the outline, and a cell's drawn radius comes from its own baked
half-width, so which cell survives at the one-cell floor decides the answer. A paddle
has enough cells that the tail never gets that granular. A needle reaches one cell two
distance-steps earlier and sits there.

**It is a real weakness in the law rather than a wrong tolerance, and it should not be
fixed by widening the 8%.** Conserving *count* is a proxy for conserving *area*; the
honest version scales by the ratio of summed cell areas over the prefix, which is a
prefix sum that could be baked into `cellTable` alongside everything else it bakes.

**The part worth carrying, though, is how nearly nobody would have seen it.** CI runs
this file twice and neither run names the conifer — one names `Cathedral Fern` and the
other takes the garden, whose LOD section reads a fern. Both are green with this in the
tree, and so is `smoke.mjs`. It was found only because the needle work ran the harness
against the species it was changing.

**So: after changing a species, run the whole `test/` suite against THAT species, not
the suite.** A gate names its subjects, and a law that holds for the subjects it names
is not a law you have checked.

## The petiole's "one constant" claim does not survive a needle (2026-07-31)

`test/petiole.mjs` section 2 asserts `freq spread < 0.5 * area spread`, on the pre-flight's
strongest argument that the pipe model is the right law: stiffness goes as `(kappa*A)^2`
and inertia goes as area too, so they nearly cancel and every species lands in a narrow
frequency band off one constant. Its own comment says what a failure would mean — "if that
band ever opens up, something has stopped scaling with area and the law is no longer doing
the work."

Giving the conifer a needle opens it up. Blade areas went 6.1x -> **7.7x** across the
catalogue and the flap frequency 2.29x -> **4.34x** (6.8-29.5 Hz), so the assertion fails.

**Nothing is broken and the number is not wrong.** A needle is a genuinely tiny blade on a
genuinely thin stalk, and a high natural frequency is what that means. The cancellation was
only ever approximate; eight broadleaf herbs spanning 4.5x of area kept the residual hidden,
and a blade an order of magnitude smaller does not.

**Do not fix this by loosening the 0.5.** It is the only thing in the tree watching whether
the pipe model still explains the spread, and the flap mechanism it describes ships
**disabled** (ROADMAP 9), so nothing visible depends on it today. What it is telling you is
that the pre-flight's headline — "one constant puts every species at 6.3-9.5 Hz" — is a
statement about a catalogue of broadleaf herbs and should be re-derived before ROADMAP 9
reopens the flap on a catalogue that now contains a conifer.

`petiole.mjs` is one of the eight harnesses that assert locally and are **not** wired into
CI, so this is red on the branch and green on every required check.

## `updateRadii` counts a dying organ, so senescence is not a way to unload a stem (2026-08-01)

Asking "does the trunk remember what it once carried?" — i.e. is this stem wood or a
pipe? — the obvious experiment is to grow the specimen, let the senescence wave strip it,
and watch the basal radius. Run it and the radius holds at 0.7573 for six thousand steps,
dead flat, through `senescing` and out the other side. **Wood, apparently.**

It is an artifact. `updateRadii` builds its traffic list with

```js
for (const org of this.organs) bl.push([org.birthLen, sp.organFlow]);
```

and nothing there consults `org.sen` or `org.shed`. A senescing organ is still in
`this.organs` and still contributes full flow, so **the load never came off** and the
harness measured a constant against a constant. The organ census printed alongside it said
1201 the whole way, which was the tell and was ignored for one iteration.

The real test removes the organs and re-sizes:

```js
for (const a of axes) a.organs.length = 0;
for (const a of axes) a.updateRadii(sp);
```

Basal radius **0.7573 -> 0.2412, a 68.2% loss.** It is a pipe. See ROADMAP 0y2 — the
missing property is *irreversibility*, not the pipe model, which is right at sapling size.

**The general form:** before believing a null result, check that the independent variable
actually moved. A quantity that is "unchanged" because the thing you meant to change is
still being counted looks exactly like a quantity that is robust.

## `WORLD`, not `WIND_DEFAULTS`, holds the exchange rates — and the wrong one is silent (2026-08-01)

`37_wind.js` exports both. The world's scales live in `WORLD`:

```js
export const WORLD = { unitM: 0.0625, ptPerSec: 125, gEarth: 9.81, rhoAir: 1.2 };
```

`WIND_DEFAULTS` is the *field's* configuration and has no `unitM`. Importing the wrong one
does not throw — `WIND_DEFAULTS.unitM` is `undefined`, every derived length becomes `NaN`,
and a scratch harness happily prints a table of them. This was caught only because the
conversion factor was printed on its own line at the top of the output; every specimen
dimension below it was `NaN` and would otherwise have been read as "the script is still
warming up".

**Print the constant you converted with, not just the converted numbers.** One line at the
top of any harness that crosses between world units and metres.

## `tools/tree_shot.mjs` asserts `OVER=` landed for `sp`, and NOT for `pal` (2026-08-01)

The tool patches any top-level key of the preset —

```js
for (const k of Object.keys(over)) Object.assign(S[k], over[k]);
```

— so `OVER='{"pal":{...}}'` works. But the assertion loop that follows only walks
`over.sp`, so **a malformed or misspelled `pal` override is a silent no-op** and you will
compare a candidate against itself and conclude "no difference" — the most expensive wrong
answer a capture tool can give, and the exact failure the `sp` assertion was added to
prevent.

Until that is fixed, a `pal` A/B is only trustworthy if the resulting images visibly differ
from each other, so **shoot at least two candidates and check they are not identical**
rather than shooting one against a remembered baseline.
