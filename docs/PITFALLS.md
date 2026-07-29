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
374-4040 Hz — 200 radians per plant-time unit — and the first integrator was symplectic
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

## Performance

Leaf and margin simulations dominate. Grow a small **library** and share it —
never one simulation per organ (thirty tissue sims at once will crawl).
Retire spent meristems (`this.meristem = null`) and finished fruits (`done` flag);
an arrested shoot should cost nothing.
