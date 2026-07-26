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

## Performance

Leaf and margin simulations dominate. Grow a small **library** and share it —
never one simulation per organ (thirty tissue sims at once will crawl).
Retire spent meristems (`this.meristem = null`) and finished fruits (`done` flag);
an arrested shoot should cost nothing.
