# Journal — decisions, negative results, forks

## The phyllotaxis result (the honest headline)

The model produces **ordered but not golden** phyllotaxis. Divergence wanders
90–160° with sd 80–100. Two hypotheses were tested with controlled sweeps and
**both were falsified.**

### Experiment 1 — was inhibition too short-ranged?

An organ's inhibition reaches ~`√(D/μ)` ≈ 4.5 cells; the pattern's own spacing is
~5.8. So only about two previous organs influence the next, and a Fibonacci spiral
needs four or five to carry the phase. A second, independent diffusible signal was
added (own D, own μ, suppressing polarisation competence) and swept from 4 to 17
cell diameters across four strengths.

**Result: no effect.** Spread stayed 79–104° against a baseline of 90°, with no
trend in range or strength.

**Why, and this is the useful part:** a field with enough reach to remember the last
five organs is also nearly *uniform* across a meristem ten cells wide. It knows how
much inhibition there is but not which way to point. **Range and positional
information trade directly against each other.** You cannot buy memory with reach.
This applies to any scalar inhibitor field on a domain this size — and it explains
why Douady–Couder carries memory in the discrete *positions* of previous primordia
rather than in a field.

### Experiment 2 — could sites be slotting in at a different radius?

Confining initiation to a thin generative ring tightened spread from ~87° to ~59°
and roughly tripled the lock fraction (0.07 → 0.27) — but cut the shoot from ~180
organs to 7.

**Conclusion.** In a single reaction–transport field on an idealised disc, the rate
at which sites become available and the sharpness with which one is chosen are
governed by overlapping constants. Crisp angle or productive shoot, not both.
This is exposed as the **generative ring** slider so a viewer can feel the trade-off.

**What I would try next:** a second length scale from *structure*, not another
molecule — L1/L2 layered geometry so the sink sits in a different layer from the
patterning one, or a mechanical-stress term. That is the untested third hypothesis.

**Do not** add a fudge to force 137.5°. Showing the real measured number is the point.

## First run on real hardware (2026-07-25)

The full-arc observation ROADMAP said had never been possible. Apple M5 Pro, real
Chrome, 2400x1620. It ran seed to ripe unattended: 97 leaves, 1 flower, 9 petals,
16 seeds, divergence 156 +/- 90. The director's untested later shots do work.

**Frame budget, median over 120 frames — the surprise:**

| | ms |
|---|---|
| `plant.step()` — the entire simulation | 0.1 |
| `buildScene()` — CPU geometry | 5.9 |
| `render()` — WebGL, with `gl.finish()` | 0.0 |

**The GPU is asleep and the simulation is free.** Everything is CPU geometry
generation, which better hardware does not help. 119.8fps, vsync-capped.

Measured in real Chrome, and it has to be. The headless tools' `fps` is not
usable as a number: four identical runs gave 15.6, 33.4, 120 and 120.2, because
headless chromium may or may not get a hardware path and does not say which. An
earlier draft of this entry quoted 15.6 as confirming the docs' "~16fps" figure —
that was one sample from an unstable configuration, and it is withdrawn.

`buildScene` costs 5.7ms even at `axesAlive: 0, fullyDev: 106/106` — a plant that
has entirely stopped changing. Sway is wholly in the vertex shader
(`vec3 P=sway(aPos)` in all three programs), so that geometry is genuinely
invariant and cacheable. Nobody has spent that yet.

### Negative result — blade LOD is not the problem

The "blocky holes at low blade LOD" item assumed tessellation. Raising
`bladeMU/MV` from 13x6 to 22x10 costs **3.5ms** (5.7 -> 9.2, over the 8.33ms budget
for 120fps) and changes the silhouette almost not at all — re-derive the A/B with
`tools/shot.mjs` if you doubt it. Reason: the margin's teeth are only **4.9% of the
blade half-width** (mean tooth depth 0.026 vs half-width 0.544), and a 13-span
mesh already represents a 5% wobble fine. `wSide` does carry them — 51 wiggles one
side, 16 the other, the honest asymmetry. **They are too shallow to read, not too
coarsely drawn.** Do not spend the frame budget on tessellation.

### The vein hierarchy was real and the bake was destroying it

Raw traffic across kept veins spans **15x**; it was being drawn at **1.5x**,
because the log mapping was normalised against `maxPi` (the max over all walls,
including non-veins) rather than the range the kept veins occupy. Fixed by
rescaling to the surviving range — same log law, right normaliser. Drawn ratio
1.82x -> 6.40x, which is the ceiling the `0.25` offset in `50_geom.js` imposes.
Full sweep in TUNING.md. This changed nothing about the chemistry; it stopped a
presentation step from throwing away what the chemistry had already found.

### Open: about a third of leaves grow a futile eddy at the tip

Making the hierarchy visible immediately exposed the next problem. Characterised,
because the first look was misleading in two ways worth recording.

**The transport model is fine.** Net flux accumulates toward the petiole sink
exactly as conservation demands — 2.3 units crossing `u=0.9` rising to 80.0
crossing `u=0.1`, tracking cumulative production above each boundary (4.8 ->
110.4). The sink at `u < 0.045` absorbs 71% of all disposal, body turnover the
other 29%. Do not go looking for a leak; there isn't one.

*(First measurement of this was wrong: it summed only the basipetal half of each
crossing and so reported gross, not net, flux — which looked flat and suggested a
conservation failure. If you re-derive this, keep the sign.)*

**The defect is circulation.** Gross apical flux as a share of gross basal, by
band, on an affected leaf:

```
u        0.1   0.3   0.5   0.7   0.9
circ%     4%   12%   45%   89%   98%
```

At the tip, 106 units move basally and 104 move back apically through *different*
walls — a closed loop delivering almost nothing. Because `pi` grows like `J^2` and
`bake()` reads `max(pi[e], pi[rev e])`, **both limbs of a futile eddy are drawn as
major veins.** That is why an affected leaf's heaviest vasculature sits at
`u` 0.76–0.97 while the net transport there is ~2 units.

**Incidence — and it is not universal.** Over 16 seeds, mean `pi` in the basal
fifth over the apical fifth:

```
inverted (< 0.5):  seeds 3, 4, 10, 12, 13   ratios 0.03 0.12 0.43 0.08 0.15
correct  (>= 1):   the other 11             median ratio 5.9, up to 22.3
```

**5 of 16 (31%).** Tip circulation predicts it cleanly: every inverted leaf is at
>= 78%, every healthy one at <= 68%. Note `test/vein.mjs` uses **seed 4**, which is
one of the pathological ones — do not generalise from it, as I initially did.

**It is permanent, not transient.** Stepped 4000 further steps past maturity —
nearly 3x the maturation time — circulation holds at 92–101% and the ratio moves
0.03 -> 0.04, 0.08 -> 0.08, 0.12 -> 0.17. Baking later will not help. It is a
stable attractor of an unbounded quadratic feedback: a closed flux loop
reinforces itself with nothing to cap it.

**Fix is a real fork, not a tweak**, which is why it is still open. The obvious
lever is `Jsat`, currently 1e6 precisely so the feedback never saturates — and
PITFALLS records that saturating `pi` costs the cell its polarity altogether. So
loop suppression probably cannot come from clamping the feedback. Ranking veins by
net `|J|` instead of `pi` was tested and **rejected**: it compresses the pathology
(0.12 -> 0.29) but does not fix it, and it makes healthy leaves worse
(3.80 -> 1.92). Spurious loops are a known weakness of Mitchison-type flux
canalisation; the literature on loop suppression is where to start. Worth
remembering that real leaves *do* form closed loops — reticulate venation and
areoles are loops — so the target is not "no loops", it is "no loop that outweighs
the midrib".

## The director could not catch its own headline events (2026-07-25)

Reported as "it always skips the blooming and the fruiting to go follow another
stalk". Measured on a Cathedral Fern, and it was arithmetic rather than taste:

| event | occurrences per film | window open |
|---|---|---|
| blooming | 1 | **1.1s** |
| ripening front | 1 | **1.2s** |
| fruit swelling | 1 | 4.2s |
| leaf unfurling | ~continuous | 16.1s |

A shot holds for **10–12s**, and the director only chose at shot boundaries. So a
1.1s bloom window is roughly a tenth of one shot: the chance of a re-pick even
landing inside it was about 1 in 12, and it then had to win a weighted lottery
against leaf, apex and wide. **An event shorter than one shot cannot be caught by
tuning weights.** Confirmed by instrumenting a full run — on three seeds the old
director spent 0% of the bloom window and 0% of the ripening window looking at
them, going `apex > organ > wide` while the only flower of the film opened and
closed off camera.

Rare events are no longer lottery entries. They are headlines: triggered on "this
axis is *about to* bloom" rather than "is blooming" so the camera is already
there; allowed to preempt a running shot instead of waiting out the hold; held
past the end of the event so you rest on the opened flower; and fired once per
axis so the film moves on. Leaf, apex and wide remain a lottery — they are the
filler between events.

```
                bloom   swell   ripen    shot order
  before          0%      0%      0%     apex > organ > wide
  after         100%     90%    100%     apex > organ > flower* > fruit*
```

Two framing bugs fell out of finally pointing the camera at a flower:

- **The flower shot framed the stalk, not the flower.** `scale` was
  `ax.length * 0.6` — the length of the whole shoot — so a flower on a tall axis
  was framed from 39.77 units, the clamp ceiling, and read as a speck. Now scaled
  from how far the petal tips actually reach (~1.5 units), giving ~7.
- **The occlusion cull tested each organ's base position.** So a long leaf whose
  base sits *behind* the subject, but whose blade reaches across the front of it,
  was kept — and buried the flower. It also stripped lateral scenery that was
  never in the way. Now it clears a cylinder along the line of sight, sized to the
  subject, and never culls the subject's own floral organs.

**Open, and a composition question rather than a bug:** the ovary visually
dominates a flower close-up. It is not oversized — measured at 1.0 world radius
against a petal reach of 1.66, so 0.6x — but it is an opaque solid mass whereas
the petals are thin translucent blades, so it reads as much bigger than it is.
Note also that fruit sets almost immediately, so there is barely a petals-without-
ovary moment to shoot. Worth deciding whether the ovary should stay small until
the petals have finished opening.

## The flower had one whorl, and the mechanism for more was already there (2026-07-25)

Asked how complex a flower this engine could grow. The answer turned out to be a
measurement rather than an opinion: **every floral organ was a petal**, and had
been since floral organs existed.

`q` — the continuous coordinate that is the *only* thing distinguishing one floral
organ from another — was read as `1 - prim.r / meristem.rPZ`. Organs are founded at
the rim of the competent flank, so `prim.r ≈ rPZ` and `q ≈ 0` always. Measured over
42 flowers across the catalogue, two seeds each:

```
                 floral organs   petals   inner   mean q   q rises through the flower
  before                   294      291       3    0.028   no (noise around zero)
  after                    261      193      68    0.173   85-89% of steps
```

Three petals out of 294 ever cleared `petalQ`, and those three were organs that
happened to found near the centre, not a whorl. `petalQ 0.62` had never fired in
anger; SCIENCE.md's imposition 3 ("enclosing growth at high `q`") had never once
executed.

**The bug is that a coordinate measured against a shrinking reference is
scale-invariant.** The code comment said "the floral meristem shrinks as it
consumes itself, so later organs start further in" — a correct description of a
mechanism nobody had written. Two things were missing: the apex never contracted,
and even if it had, `q` measured against the *current* `rPZ` would have reported
the same value forever. So: contract the apex by the tissue each organ recruits
(`consumeApex`), and measure `q` against `floralR0`, the radius the apex had when
it converted.

### The apex has to be big enough to spend

`goFloral` shrank the apex at conversion (`R ×0.66, rPZ ×0.62`). With contraction
switched on that left room for 2-5 organs before the apex ran out, against a
`floralOrgans` ceiling of 9 — so no flower ever reached the ceiling and none ever
set fruit. Conversion is now a loss of stem-cell *renewal*, not of size: `rCZ`
shrinks, `G` rises, and the dome keeps its radius, because everything the flower
will make has to fit in it and nothing replaces what gets used.

### Falsified: keeping more of the central zone does not help

Reasoning that a collapsed `rCZ` lets organs found anywhere and so muddies the
radial gradient, I predicted that keeping more central zone would sharpen it.
**Backwards.** Sweeping `floralCZ` (the fraction of `rCZ` surviving conversion)
over the catalogue:

```
  floralCZ   organs   inner   mean q   q rises
      0.42      261      20    0.173      85%   ← original value, kept
      0.70      252       9    0.152      85%
      0.85      229       4    0.115      87%
      1.00      243       1    0.125      89%
```

A retained central zone pushes every organ *outward*, which is the opposite of
what identity needs. The monotonicity improves slightly and the identity range
collapses — the wrong trade. `floralCZ` stays at 0.42 and is now a named parameter
so the sweep is repeatable.

### ROADMAP 4b fell out of it, because it had to

Once the apex is a finite resource, "spent" is a physical state rather than a
counter, so `floralOrgans` became a ceiling on top of a real terminal condition.
That closes the bare-whip bug: **stuck floral axes went from 12 of 16 runs to 0 of
16**, and specimen heights stopped running away with it (Cathedral Fern 78.8 → 16.4,
Spiral Ossuary 76.6 → 24.0, Nightglass Parasol 73.8 → 10.5 — those were whips, not
plants). Seeds per specimen roughly doubled, because flowers that used to hang
never-fruiting now fruit.

**Detecting "spent" needs two rules and geometry alone is not enough.** An apex can
stall with 40-70 cells still in the dome, having merely lost the room to sharpen
another maximum: measured stalls at competent-annulus areas of 27.0 and 15.7 against
one founder patch of 11.3, while another apex successfully founded an organ at 15.7.
Near the wavelength limit whether one more organ appears is stochastic, so there is
no clean threshold to find. The geometric rule (flank narrower than one founder
patch) catches the deeply contracted ones; an idleness rule catches the rest. Both
waits were measured with the grace disabled, over 57 conversions and 345 organs:

```
  conversion -> first organ   p50 25   p90 73   p99 125   max 127
  organ -> next organ         p50 10   p90 65   p99 238   max 579
```

`floralGrace 320` sits above the first-organ wait everywhere (so no flower is
aborted before it starts) and above the p99 gap (so it costs about 1% of organs at
the tail). It is the same kind of rule as the meristem's own `spotGrace` — how you
notice something has stopped, not a statement about what a flower should be.

### The divergence angle was being thrown away with the apex

Retiring meristems properly exposed a latent hole: `divergenceStats` only exists on
a live meristem, and the plant's `_lastDiv` cache is only filled when `stats()` is
polled. The app polls every frame so it never noticed; a headless run ends with
every apex retired and reported `—±—` for the project's headline number. A growing
point now hands its reading to the organism before being dropped, keeping the
fullest one rather than the last to retire.

### What it actually looks like, and what is still wrong

Verified in a real GPU path (`tools/flower_shot.mjs`; the swiftshader tools write
black PNGs on this machine while reporting a full triangle count). The whorls read:
an outer ring of broad pale petals, an inner cluster of short erect organs. Two
things are worth fixing and are not in this branch:

- **Inner organs had no appearance at all**, because that render path had never
  executed — they fell through to the *foliage* palette and read as green stem-stubs
  in the middle of a flower. They now grade from the petal colour toward the
  species' own vein colour as `q` rises. Graded, not switched: `q` is continuous.
- **The petioles dominate the composition.** At flower scale the organ stalks are
  fat opaque tubes and the petals read as blades stuck to scaffolding. Pre-existing
  — it was equally true when every organ was a petal — but a flower close-up is
  where it hurts, and nothing had ever pointed a camera here.

On the ovary that JOURNAL previously recorded as dominating the frame: there *is* a
window where the flower stands alone, and it is not as narrow as the earlier note
implied. In 39 of 39 flowers the petals reach full development **before** the shell
is first drawn, by 21-504 steps (median ~154). It is short, not absent — about a
second of wall time at 4x, which is why polling from outside the page steps over it.

## The other half of the claim: a blade at cell resolution (2026-07-25)

ROADMAP 2. The meristem close-up shows needles **converging**, and that
convergence is a leaf. The blade was supposed to show the same needles falling
into **line**, and that line being a vein — the argument that both organs are one
solver on different geometry. It had never been drawn.

### The display channel does not transfer

The obvious move is to point `meristemDome()`'s drawing language at the leaf's
cell field. Measuring first (`test/lamina.mjs`) said that would have produced a
blank-looking leaf. Needle length on the meristem is `|polarity|`, and on the
blade polarity is **constant**: 0.966 on a vein, 0.957 between veins, 1.01x, on
all three seeds tried. Every cell in a blade is fully polarised, because the
competence gate that blurs the meristem's central zone has no counterpart there.

The channel that does separate is traffic — flux 11.4 against 4.0, 2.9x, and
4.9x and 3.2x on the other two seeds. That is not a fudge: traffic is what
canalisation selects for, and it is the quantity `bake()` already keeps a vein
by. Needle *direction* still comes from the PIN allocation exactly as on the
meristem, and it is worth having: a needle sits at 0.85-0.88 |cos| to its own
vein, against 0.5 for random. So the picture is honest — direction is the cell's
decision, brightness is what that decision is carrying.

Generalised into PITFALLS.md, because the same shape will recur: a mapping that
is informative on one tissue can be a constant on another, and it fails silently
by looking bland rather than by looking wrong.

### Fork: adopt a canalising leaf, or replay one

The thing worth watching is over almost before it starts. The library canalises a
blade in ~900 steps at 60 steps a frame — fifteen frames, a quarter of a second —
and then freezes it for the rest of the specimen's life. So there is essentially
never a leaf on the plant caught in the act.

**First attempt: let one organ adopt the leaf the library is currently growing**,
so its vasculature would grow in place instead of arriving fully plumbed. It is a
small change and it costs nothing, since the leaf is being simulated anyway. Then
`test/species.mjs` came back byte-identical to `main`, which is the exact shape of
the dead-sweep trap already in PITFALLS.md, so it got instrumented rather than
believed. The path fired **once in 5000 steps**, and put an unbaked blade on
screen for 15 of them. The reason is structural: once the library is full the pool
stops growing leaves entirely, so the window only exists early, and an organ has to
request a leaf during it. Reverted — a feature that fires 0.3% of the time is not
a feature, and the fix for it (keep a leaf canalising for the specimen's whole
life) changes what every specimen looks like and deserves its own argument.

**What shipped: the close-up grows the blade again.** A leaf is reproducible from
`(prm, opts, seed)` — same lattice, same sources, same vein network segment for
segment, verified on three seeds and asserted in `test/lamina.mjs`. So the view
re-runs the identical computation that produced the blade you are pointing at,
slowly, and ends on exactly the vasculature that blade already has. Not a
recording and not an approximation of one. It is reliable, it costs one leaf
simulation only while someone is looking, and it leaves the plant untouched —
`test/species.mjs` is identical to `main` and now *provably* so, which is the
difference between that and the first attempt.

### Three things were wrong once it was on screen

None were simulation bugs and none were visible headlessly.

1. **The camera never went there.** `takeOver()` sets `userDriving`, which locks
   the auto-framer out, and the close-up buttons call it before switching mode. So
   asking to go into the cells set the mode and guaranteed the camera would not
   travel to it. This was true of the existing apex view too, and had been since
   the manual-camera work.
2. **The blade was seen edge-on**, putting 616 cells on one line. Read exactly
   like the cells were being drawn in the wrong place. The camera now steers to
   the organ's own normal.
3. **The lamina outshone the tissue.** The blade is an opaque lit sheet and the
   cells sit on it; at full strength the first capture showed a bright slab with a
   row of lit cells around the margin, where the auxin sources are, and nothing in
   between. Drawing correctly, invisible. The surface now fades as the cells come
   up, and depth of field goes shallow so the blade behind stops competing.

All three are in PITFALLS.md. The general lesson is narrower than "test visually":
each of these produced a picture that looked like a *different* bug than it was,
and the headless harness was green throughout.

### And then everything snapped

First review of the working view: "things seem to be snapping in and out of the
scene." Tracing every frame across entering, holding and leaving the view found
three separate causes, none of which had anything to do with the tissue.

**The reveal was distance-driven, and blades are not meristems.** Copying the
growing tip's "no mode to find, just come closer" idiom meant *every* blade near
the lens refined its mesh and grew needles. Around the apex that is several at
once, all sitting a hair from both the refinement threshold and the occlusion
cull, flickering in and out together: **13k triangles to 40k and back, frame to
frame, camera dead still.** The close-up now applies to the blade being
inspected and nothing else. Distance still does the fading, so arriving still
feels like arriving; it just no longer picks the subject.

**Depth of field switched in one frame** — 5.09 to 0.45 going in, 1.12 to 7.45
coming out. Eased.

**The cull was binary against a moving subject.** The tip it measures from grows
and circumnutates, so the sight line never settles and organs near the boundary
crossed it repeatedly. Fading them was the obvious fix and is wrong — the forward
pass writes depth, so a blade dimmed to black still hides what is behind it,
which is the whole point of clearing it. Hysteresis instead.

Also dropped: swapping the whole leaf over to the replay, which made the
vasculature blink out when the replay took over and back when it finished. The
veins now always come from the real leaf and only the cells and needles come from
the replay. That removed a pop *and* reads better — the network being present
throughout is what makes the needles legible as falling into it rather than
merely milling about.

```
                            before   after
p95 frame-to-frame dGeom     1482      336
frames moving >3000 verts      36        7
largest depth-of-field step  6.34     0.37
```

The two large frames that remain are entering and leaving the mode, which are
cuts. Worth writing down that none of this was visible in a still capture — the
three-frame `leaf_shot.mjs` triptych looked correct throughout.

## Senescence: a whole-plant transport stream, and why it does not drive it (2026-07-26)

The piece stopped instead of ending (ROADMAP 1). Specimens needed to finish and
give way. The tempting version of that is a leaf lifespan constant, which would be
a clock, so the first attempt tried to derive it — and the derivation failed. Four
hypotheses tested, all falsified, and the diagnosis is worth more than the feature.

### The mechanism that was tried

Abscission by auxin flux. A blade drives auxin down its petiole; that basipetal
flux holds the abscission zone at the petiole base shut, and a leaf that loses its
share of the stream is shed (Addicott & Lynch 1955; Sexton & Roberts 1982). To
have a share to lose, the whole shoot became one auxin network — a node per organ,
a node per stem segment carrying one, laterals tapping the node they branch from,
the root the only sink. `stepAuxin` again, on a tree. That part works: 242 nodes,
finite, canalised, and it produces a real basipetal gradient, **a_stem 17.1 at the
base to 0.10 at the tip.** It fills the row SCIENCE.md had left blank.

### Experiment 1 — is flux through the zone a scarcity signal?

No. **Flux through the zone is conserved.** In steady state a leaf exports what it
produces, so the number measures the blade's own production and nothing about its
neighbours. Swept the two things that should have starved it:

```
                          mean export    a_root    a_max
turnover 0.05  root 3        0.662        11.52     50.5
turnover 0.05  root 12       0.665         3.02     50.4
turnover 0.005 root 3        0.682        18.50     60.0
turnover 0     root 12       0.687         6.20     19.7
```

Mean export does not move — 0.66 to 0.69 across a 4x change in sink strength and
turnover taken to zero. The stream cannot refuse a leaf: a stem edge carries
`T·p·φ` ≈ 200 against sources of ≈ 1. There is no scarcity in it.

### Experiment 2 — is a reversed gradient across the zone the signal?

This is the textbook one: abscission is promoted by auxin applied to the stem side
and prevented by auxin applied to the blade side, so the zone reads a *ratio*, not
a flux. Measured `a_stem/a_blade` for every organ at four timepoints:

```
t=2000   n=73   min 1.99  mean 2.59  max 4.51   reversed(>1) 73/73
t=4000   n=96   min 1.29  mean 2.57  max 3.97   reversed(>1) 96/96
t=9000   n=96   min 1.29  mean 2.57  max 3.96   reversed(>1) 96/96
```

**Reversed for every organ at every time.** Of course it is — a stem carries the
sum of everything above it and a leaf carries only its own. The ratio is a smooth
function of depth in the stream with no threshold anywhere in it.

### Experiment 3 — correlative control (take the fruit off, leaves stay green)

Not reproduced. Removing the fruit's auxin contribution entirely moved the mean
ratio from **2.57 to 2.55**. A fruit source of 2.2 is nothing against ~100 units of
leaf production. Whatever ends a plant here, it is not the fruit's auxin.

### The diagnosis

**Auxin is made by each organ, not competed for.** Auxin transport competition is
real in the Prusinkiewicz 2009 bud model because there the contest is over
*establishing* a canal in unpolarised tissue — a transient, winner-take-all. A stem
is already fully canalised long before any leaf's fate is in question, so there is
no contest left to lose. A transport stream with an unlimited sink and a pipe two
orders of magnitude wider than its traffic contains no "this organ is losing" signal.

The steelman was tested too: narrowing the pipe (shoot `T` 40 → 8) does starve
organs, min export −0.487. But it starves the *apical* ones and inverts the
gradient that made the model attractive (a_base 17.1 → 1.3, a_top 0.10 → 20.8).
That is distance-to-sink, not competition, and it is a different claim.

### Experiment 4 — the one that decided the shape of the feature

Given all that, does the stream at least *order* the shed? No — and the way it
fails is more damning than a flat zero would have been. Rank correlation of shed
time against founding order, `stream drives`, all eight species, seeds 21/137,
14000 steps:

```
Cathedral Fern     -0.05      Hoarfrost Thicket   0.53
Spiral Ossuary      0.57      Ember Creeper       0.13
Abyssal Frond      -0.00      Sulphur Rosette     0.57
Sun Coral           0.10      Nightglass Parasol  0.36
```

**−0.05 to 0.57.** Not zero, but not anything: the stream's ordering wanders with
the species, which is the signature of an incidental correlate rather than a
mechanism. A mechanism would hold its sign.

The decisive row is the knockout. With the age-linked decline in leaf export
switched off, `dead` is **0/2 on every one of the eight species** — the stream
alone cannot finish a plant at all, on any preset, at any seed. So the decline was
ending the leaves and nothing was ordering them. **The implementation was an age
timer routed through 200 lines of auxin network**, which is worse than an honest
age timer, because it is dishonest about itself.

For contrast, the shipped rule scores rho(age) 1.00 and rho(y) 0.97–1.00 across
all eight — as it must, because there the ordering is stated rather than derived.
That is the number to distrust on sight: a coefficient of exactly 1.00 is a
restatement of the rule, not evidence for it.

One trap on the way to that number, and it is a general one: the first run of this
comparison read rho 0.42/0.47 and looked like a partial success. Both mechanisms
were incrementing `sen` at once, so they simply added. **Two mechanisms writing one
variable cannot be measured against each other** — exactly one must own it, and
`Plant.senesceStep` now returns early when the stream is driving.

### What shipped

Split honestly in two:

- **WHEN a specimen senesces is emergent**, and this is the good half. `Plant.spent()`
  — every growing point has either arrested on its budget or consumed itself
  founding a flower, so no tissue anywhere is still patterning. Nothing schedules
  it. It sits downstream of how much leaf the plant built, which set when it
  flowered, which set when its apices were spent. It is the same kind of physical
  condition as `apexSpent`, and it is why a fruit ends a plant: not through auxin,
  but by arresting the apex that set it.
- **The ORDER is asserted**, a wave up the plant with the oldest tissue letting go
  first, and SCIENCE.md now carries it as imposition 6. It is stated plainly rather
  than derived, because the attempt to derive it is the four experiments above.

The stream stays in the tree, off by default, the same way `rhoI: 0` leaves the
falsified second inhibitor in `10_auxin.js` — a negative result you cannot
re-measure is just a story. `node test/shoot.mjs` turns it on and reproduces every
number here.

### The bug the feature exposed: one stalled shoot froze the organism

Building `Plant.spent()` turned a long-standing cosmetic leak into a fatal one.
Hoarfrost Thicket came out of the first full run **0 shed, 0/2 dead on all four
variants** — it never finished at all. The harness's own `NOTHING SENESCED` warning
caught it, which is the argument for harnesses that shout rather than just print.

One shoot of nine, stuck: `gen1 organs=1 alive=true meristem=true`, still holding a
growing point after 30000 steps.

- `vegOrganCount` 84 against `organBudget` 96 → `budgetLeft` never hits zero
- `organs.length` 1 against `maxOrgans` 34 → the count never arrests it
- it is `gen1`, and only `gen === 0` converts on florigen → it can never flower out

It elongates too slowly to clear `minInternode`, so it discards every primordium
its meristem emits and sits on one organ forever. **Exactly the trap PITFALLS
already records** for floral axes — an organ budget expressed as a count can only
terminate a process that reliably reaches the count — in its vegetative form.

It had been survivable because a stalled twig is just a slightly odd twig. But
`spent()` is an AND over every growing point, so one leaked axis froze the entire
life cycle. **A whole-plant condition turns any per-axis leak fatal**, and that is
the general lesson: adding an organism-level predicate is a new, much stricter test
of every per-part termination rule you already had.

Fixed with `apexStalled` / `vegGrace`, the vegetative twin of `floralGrace`. The
constant came off measurements rather than a guess — across all eight species the
longest gap between organs on a healthy shoot is **500** steps and the longest any
lateral takes to found its first is **320**, so 1600 is 3.2x the worst real gap.
Before/after on `test/species.mjs`: every column identical on all eight species
except Hoarfrost seed 137 divergence, 114±97 → 126±112, which is the retired apex
now handing in its reading and is well inside a ±100 sd. All eight species now
reach `dead`.

**What I would try next, if anyone wants to reopen it:** the missing scarce
resource is not auxin. Leaves compete for *light*, and shading is what actually
orders senescence in a real canopy. The plant already knows where every blade is
in space, so an occlusion term is computable — and unlike a second inhibitor field
it would be a genuinely new axis of information rather than another scalar on the
same disc.

## Senescence, the half you can see (2026-07-26)

The simulation half landed and nothing drew it. `org.sen` ran 0→1, `org.shed`
flipped, and `tools/senesce_shot.mjs` came back with **63594 triangles and
141528 lines at onset, at half, and at dead** — three identical frames, which is
as exact a measurement of "unbuilt" as this repo has ever had.

Afterwards, same tool, same specimen: 63594/141528 at onset (a colour change
costs no geometry, so this one *should* not move), 63096/139980 at half once a
dozen blades have let go, and **15786–21762 tri at `dead` across three runs**.
That last spread is not noise in the simulation — the tool polls for `dead()` and
catches it a few frames either side, and a few frames is the difference between
six blades still falling through shot and none.

### Deriving the drained colour instead of painting eight of them

The obvious version is a brown per species in the palette table. It was worth
resisting, and not only on principle: nothing about a senescing leaf is a new
colour, it is the *removal* of one. The pigment-protein complexes are taken apart
and their nitrogen withdrawn into the plant — that recovery is the entire reason
a plant senesces a leaf rather than simply dropping it — and what is left is cell
wall.

So `senesceTint()` collapses the blade's own colour to luminance and tints the
result warm, in two stages, because the tissue goes **pale before it goes dark**
and one stage reads as a dimmer switch. A teal fern drains to grey-tan and a red
rosette to dusty brown out of the same four lines, and the ninth species will not
need an entry either. This is not a claim about chemistry — colour was authored
here already — but it is one less thing hand-placed.

### Veins die last, and the vdf was already sitting there

Tissue against a vein is the last to be dismantled, because the vein is the route
the recovered nitrogen leaves by and has to keep working until the withdrawal is
finished. That is the green islands you see along the veins of a yellowing leaf,
and `leaf.vdf` — the distance-to-vein field, already computed for fenestration —
is exactly the channel. One constant (`VEIN_LAG`) sets how far behind the
vasculature drains; the *shape* of what is spared is a network that canalised
itself. Nothing here knows what a vein looks like.

**The one thing that had to be measured rather than guessed:** used raw, `dd`
calls **58% of the lamina "near a vein"** — the network is dense and the field is
a linear ramp — so most of the blade was spared and the drain read as blotches
rather than a tracery. Squaring it narrows what is held without touching `dd`
itself, which fenestration and the vein tint are both calibrated against. That is
the whole of the tuning; `test/senesce.mjs` prints an ASCII map of what is still
holding colour, and the vein tree is legible in it at sen=0.5 and gone by 0.8.

`test/senesce.mjs`, Cathedral Fern seed 7, drawn through the shipped `blade()`:

| sen | drain open | drain vein | warmth open | warmth vein | lamina glow | vein glow |
|---|---|---|---|---|---|---|
| 0.00 | 0.000 | 0.000 | 0.31 | 0.21 | 0.1332 | 0.1703 |
| 0.25 | 1.253 | 0.000 | 2.81 | 0.21 | 0.1264 | 0.1703 |
| 0.50 | 1.259 | 0.793 | 3.69 | 1.11 | 0.0858 | 0.1560 |
| 0.75 | 1.314 | 1.457 | 3.79 | 3.52 | 0.0292 | 0.0848 |
| 1.00 | 1.314 | 1.508 | 3.79 | 3.76 | 0.0000 | 0.0136 |

At a quarter gone the open lamina has fully turned and the tissue on the veins has
not started. **`drain` saturates and `warmth` does not**, and both are in the table
for that reason: the drained colour passes through pale on its way to dark, so a
distance from the living colour stops growing about halfway along while the thing
is still visibly changing. A single metric here would have been read as "it
finishes at sen=0.25", which is wrong.

### The fall is stated motion, and says so

A shed organ separates at the base of its stalk, so what leaves is the whole leaf
and what is left is bare stem. Everything after that — a constant descent, a
lateral flutter, an end-over-end pitch — is asserted, in the same category as the
sway in `60_render.js`, and it is deliberately *not* an integration of gravity: a
blade is almost all area and almost no mass, so it is at terminal velocity within
a length of letting go and what you actually watch is drag. There is no ground in
this scene, so it fades out on the way down rather than landing.

### Two things the visible half exposed in code that was already there

**`Plant.bounds()` said "everything currently alive" and counted shed organs at
full reach.** Invisible while nothing was ever removed. The moment blades started
leaving, a specimen that had dropped its whole canopy was still framed for it and
sat tiny in the middle of an empty shot. One `if (o.shed) continue`, and the
camera now closes in as the plant dismantles itself.

**`build.js` reported success on a bundle that was a SyntaxError.** The duplicate
check only ever read the first name of a declarator list, so `const _c0 = v3(),
_sc = v3()` hid a genuine collision with an `_sc` twenty lines up. The build
printed its usual `built canalisation.html 223.1kb js`; the page was dead; the
CI gate passed, because `smoke.mjs` imports the simulation and not the geometry.
What caught it was the new harness importing `50_geom.js`. `build.js` now hands
the bundle to `new Function` before writing anything — the engine settles what a
regex was guessing at — and the declarator scan reads the whole comma list.

**Still not built:** a new specimen germinating as the old one fades (ROADMAP 1),
and the standing stem does not drain at all. Leaving the stem lit is a choice
rather than an omission — it is what makes the end read as a seed head instead of
a corpse — but it has now been looked at on screen, which it had not been before.

## Design forks and why

- **Cell-based CPU sim, not GPU.** The tissue divides and rewires its topology every
  frame. WebGL2 has no compute shaders, so GPU means ping-ponging fixed-size
  textures, and fixed-size is exactly what growing tissue cannot be. A few hundred
  cells at a few ms is cheap. Shaders draw it; the CPU decides it.
- **Icosphere fruit with radial growth**, not a free-form growing surface. Removes
  self-intersection during deep lobing entirely. Costs overhangs.
- **Leaf library, not per-organ sim.** Thirty simultaneous tissue simulations
  crawled. Grow a handful and share them.
- **Petals are leaves.** Same margin engine, different chemistry. Goethe was right
  and it means no new code.
- **Fruit = the leaf margin, closed.** "A contour of cells that pushes outward where
  auxin has converged" — open arc with boundary sources is a leaf; closed surface
  with interior sources is an ovary.
- **Film that yields to touch**, not a control panel. The best content (cell-level
  view) was hidden behind a button most people would never press, so it became the
  cold open.

## Four species that all had the same leaf

Expanding the catalogue from four species to eight started with what looked like a
palette job and turned into a measurement. `test/species.mjs` grows every preset
headlessly and prints what each one does; the first run of it reported blade aspect
0.44, 0.45, 0.44, 0.45 for four species whose presets differed by nearly 2x on
`leafOpts.aspect`.

The field had been dead since the margin engine replaced the drawn silhouette.
`Leaf.step()` sets `o.aspect = margin.aspect` the moment the outline matures, which
is before `_build()` reads it — so every species wore the generic leaf and the
presets had been documenting an intent the code no longer honoured. Nobody would
have caught this by looking, because a leaf that is 0.45 wide when you asked for
0.30 still looks like a leaf.

The replacement is `marginBias`: per-species **multipliers on the margin's own
chemistry**, applied over the per-leaf random draw rather than instead of it. So a
Spiral Ossuary leaf still differs from the next Spiral Ossuary leaf, and both are
narrower than anything a Nightglass Parasol grows. Measured aspect now runs 0.32 to
0.57 across the catalogue. It matters that the knob is a rate constant on
mediolateral growth and not a width: nothing in the preset knows what shape will
come out, which is the only version of this that is allowed.

Two other preset fields turned out to be traps rather than settings, both found the
same way — by growing the thing and reading a number that would not move.
`minInternode` silently **discards** primordia rather than queueing them, so the
first rosette attempt starved at 12 leaves out of 42 primordia and looked like a
patterning failure. And `maxOrgans` is a kill switch, not a leaf count: an axis that
reaches it arrests, and an arrested apex can never convert to a flower, so the first
Nightglass Parasol never flowered at any seed. Both are in PITFALLS now.

The same harness surfaced something worth not fixing on that branch. An axis that
converts to a flower but never makes its complement of floral organs never calls
`setFruit`, so it never arrests, so it elongates for as long as the simulation runs
— the bare whip out of the top of a finished plant. It is in 12 of 16 runs across
the catalogue **including all four species that predate it**, so it is not a
property of the new presets and it does not belong in a branch about presets. It is
ROADMAP 4b with the numbers attached.

## Bugs that cost the most

1. Depth mask blocking `glClear` — presented as a shading bug, was stale depth.
2. Organs placed by nearest vertex index — presented as "jitter".
3. Timestep above the stability ceiling — presented as a parameter problem.
4. Silent no-op string replacements — three times; see PITFALLS.
5. Asymmetric leaf outline vs symmetric interior lattice — veins hanging outside
   the blade. Introduced *by* making leaves honestly asymmetric.

## The falling leaf was the last authored thing in the piece (2026-07-26)

Asked what to do next, I offered the ROADMAP. The answer was better than the list:
*everything here reads as fully simulated, but then a leaf falls and it's clearly a
crappy animation.* That was right, and the code admitted it — the comment above the
old `SHED_*` constants in `70_app.js` called the fall "stated motion... NOT a claim
about chemistry". Four constants and a hash of the attachment point, so every blade
fell at one speed, swung one distance, pitched at one rate, and a canopy came down
in parallel.

### The fix is not "add gravity", and the old comment knew why

The comment being replaced argued that a blade hits terminal velocity within a
length of letting go and never accelerates again, so a constant descent is *closer*
to the truth than an integrated one. That is correct, and it is the trap: integrate
gravity and drag alone and you get something worse than the sine, because you have
added the boring half of the physics. What makes a leaf worth watching is that **its
attitude sets the drag and the drag changes its attitude.** Broadside it stalls;
stalled it slips edgewise, sheds the stall, and pitches through.

So: the quasi-steady falling plate — added mass, circulation with translational and
rotational parts, drag resolved along and across the chord, rotational damping
(Andersen, Pesavento & Wang, JFM 541, 2005). The result worth having is theirs: a
falling plate has no single behaviour. It picks steady descent, flutter, or tumble,
and which one is selected by a dimensionless moment of inertia that comes down to
width. **Width is the one thing `30_leaf.js` overwrites with whatever the margin
grew**, which is why this belongs in this project rather than merely working.

### The plan was one honest fudge. It turned out not to be needed

The intention was to trade four animation constants for one: a scaled gravity,
chosen to put the fall on the same compressed clock as the growth, and labelled as a
fudge. Then I checked the calibration against real numbers instead of picking it.

Leaf mass per area is one of the most measured traits in plant ecology (50-150
g/m2). Air is 1.2. Gravity is 9.81. And the two exchange rates needed to put those
in world units were **already fixed by things that shipped months ago** — a 16-unit
plant reads as a metre, and `App.step` runs plant time at 125 units per second. With
those five numbers there is nothing left to choose.

It also lands better than the chosen version did. Terminal velocity for a drained
blade comes out at 0.78 m/s, which is what a dead leaf does. And the dimensionless
moment of inertia across the blades these species actually grow comes out **0.1-1.8,
straddling the flutter/tumble transition** instead of piled up on one side of it. An
earlier draft picked the density by hand *trying to arrange exactly that* and put
every blade on the same side. **The measured constants beat the tuned ones**, which
is this project's whole argument in miniature.

### Four things were wrong, and the harness found all four

Worth recording because none of them would have been visible on screen — they would
have looked like "the fall needs tuning".

1. **The Munk torque had the wrong sign.** The added-mass torque must turn a plate
   *broadside* to its own motion; that is why a dropped card falls flat. With the
   sign as first written, plates settled **edge-on and knifed down at twice terminal
   velocity.** Frame conventions differ between write-ups of this model; the falling
   card does not. The sign in the code is the one that reproduces the card, and it
   is commented as having been established by measurement rather than by reading.
2. **The integrator was under-resolved by a factor of four.** Six sub-steps per
   plant-time unit; mid-range chords ran away to **1e124 within a hundred units.**
   Now adaptive on the plate's current spin, so a barely-rocking plate is cheap and
   a tumbling one pays for itself.
3. **The regime classifier was wrong twice.** First it measured *net* rotation, so a
   plate that went round and came back read as barely rotating. Then it measured
   amplitude, which called a 14-degree transient "flutter". The real discriminator
   is whether the pitch angle is **bounded**: the fraction of travelled rotation that
   ended up as net rotation, near 1 for a tumbler and near 0 for a flutterer.
4. **The physics was about the wrong object.** `70_app.js` draws a blade at 0.80 of
   its organ's length and shrinks it 12% more as it dries. Using the organ length
   made every plate 1.4x too big. The factor now lives in one place and both the
   picture and the fall read it.

**And one assertion was wrong, which is a different kind of mistake.** The
validation check demanded the regime be monotonic in I* all the way down the sweep,
and it failed — on rows in the middle that flipped label from one chord to the next.
That is not a bug, it is the chaotic band the papers put *between* flutter and
tumble, and a single run inside it is genuinely unclassifiable. The check was
asserting something the literature does not claim. It now tests the ends — flutter
low, tumble high, chaos allowed in between — which is falsifiable and true.

### "Way too flappy spinny"

First reaction to watching it, and the diagnosis was in the model, not the dials.

**The integrator is 2D — an infinitely long plate — and a leaf is a stub.** Air
escapes round the ends of a short plate instead of being turned by it, so the
circulation actually developed is a fraction of the two-dimensional prediction, and
circulation is what drives both the lift and the spin. Uncorrected 2D lift on a
leaf-shaped plate is roughly double reality. The standard finite-span correction
`AR/(AR+2)` fixes it, and it *adds* emergence rather than damping it uniformly:
AR is length over width, so how much lift a blade keeps is its own silhouette's
business. Long narrow leaves stay lively; broad stubby ones fall steeply.

Second, and embarrassing: **rotational damping was not an independent coefficient
and I had been treating it as one.** It is the same normal-force drag as `cPerp`,
integrated over a chord with local speed `omega*r`. It sat at an invented 0.90,
quietly halving the damping.

| | tumbling | sideways, med/worst | spin, med/worst |
|---|---|---|---|
| 2D, `cRot: 0.9` | 43% | 0.68 / 4.63 | 1.67 / 7.37 rev/s |
| finite span | 41% | 0.53 / 2.71 | 2.46 / 6.25 |
| + consistent damping | **14%** | **0.37 / 2.11** | **2.05 / 5.01** |

Median spin *rises* slightly across that table while the worst case falls and
tumbling collapses — because the corrected falls are steeper and shorter, so
rotations per second can go up while rotations per fall go down. Read the tumbling
column, not the median.

### A fixed fade budget cannot survive a variable fall

The old animation faded a blade over 620 plant-time units from letting go, which was
safe precisely because descent was constant: it always covered the same distance in
that time. Real falls vary nearly tenfold in speed, and the fixed budget left blades
half transparent before they were halfway down — **the CI gate caught it at 36 of 96
reaching the ground.** They were evaporating in mid-air.

The fade now keys off *landing*: fully drawn for the whole descent however long it
takes, lies on the ground for `settle`, then goes. 547 of 547 blades across all
eight species now land. `life` is only a backstop for the rare glider. Blades also
now land at all, which they could not before — there was no ground, and the old
comment said so.

### What emerged, and what it cost

Deleted: four animation constants, a positional hash, and the claim in SCIENCE.md
item 6 that the falling was presentation. Added: no spatial priors, and no chosen
numbers.

Now emergent per blade: the regime (flutter/chaotic/tumble/steady, 30/20/14/9% and
**all eight species show more than one among their own leaves**), descent speed
(8.7x spread where it was identical for every blade), drift, and which way it turns
— that last from the margin's own left-right asymmetry, which comes out 50/50 across
a canopy without anything asking it to.

### The limitation this leaves, and it is the interesting one

Also from watching it: *there's clearly some gravity/wind field on the leaves, but
ONLY the moment they die do they become alive and fall — the rest of the plant has
no response to gravity or wind.*

That is exactly right and the mechanism is worse than it sounds. The piece now has
**two unrelated models of the same air.** A shed blade is a properly loaded
aerodynamic body on the CPU. Everything still attached is a rigid card in dead calm,
displaced by `SWAY` in `60_render.js` — three sines of position and time, evaluated
in the vertex shader, which the simulation cannot see. The falling blade even gets
that decorative displacement added on top of its own physics. Abscission is a
discontinuity between the two, and nothing in the scene establishes that there is
air in it until a leaf needs some.

The fix is one field, defined once, read by everything: attached blades loaded by it
through the same plate model, the stem genuinely bending under it, and the handover
at abscission continuous in attitude and angular velocity. Two things make that
worth more than it costs. It would let **`droop` stop being eight stated numbers in
the species table** and become a force balance — deleting a spatial prior. And
ROADMAP 3, the third phyllotaxis hypothesis and the project's headline limitation,
already names *a mechanical-stress term* as one of its two candidate routes. So a
real mechanics engine is shared infrastructure for the wind and for the open
question, not a detour from it.

The condition to hold it to: stiffness must come from `EI ∝ r⁴` on radii the plant
already grows, so the whole thing costs one or two material constants rather than
eight species-specific ones. If it cannot be done that way it is a net loss by this
project's own accounting, and that is the signal to stop rather than push on.

## One air, step 1: the field, and nothing reading it (2026-07-26)

ROADMAP 7 is the fix for the piece having **two unrelated models of the same air** —
integrated aerodynamics for a blade that has let go, a decorative vertex displacement
for everything still attached. The order written down for it starts with the field
itself, before any solver, and this is that step. `37_wind.js` exists,
`tools/wind_check.mjs` proves the shader would agree with it, and **nothing reads it.**
`SWAY` is untouched and still moves the scene.

### What the field is, and why each part of it is not a choice

- **Height profile: the log law of the wall.** `U(y) ∝ ln(1 + y/z0)`, off von
  Karman's 0.40 and a roughness length from a standard table (mown grass, 0.008-0.03 m;
  0.02 taken). The `1 +` is the ordinary regularisation so it is finite and zero *at*
  the ground rather than singular below the roughness height; above a few `z0` it is
  the same curve. This replaces `SWAY`'s `h*h`, which is a drawn shape.
- **Gust strength: derived, not dialled.** `sigma_u ≈ 2.5 u*` in the neutral surface
  layer, and `u*` follows from the profile and the reference speed. So saying how hard
  it is blowing says how gusty it is; there is no second knob, which is the failure mode
  this project keeps finding (see `cRot` in the fall).
- **Gust spectrum: Kolmogorov.** Four octaves, `E(k) ∝ k^(-5/3)`, so the amplitude
  exponent is `-1/3` and the relative size of large and small eddies is not picked.
  The harness measures the ratio off the baked table (0.7937 = 2^(-1/3), three times
  over) rather than trusting the constant.
- **Frequencies: Taylor's frozen-turbulence hypothesis.** An eddy's frequency at a
  fixed point is `k·U`, the mean flow carrying it past, plus the eddy's own turnover
  rate `a k`. **There is no "sway frequency" anywhere in the file.** `SWAY` had three,
  set by ear: `t*1.00`, `t*0.71`, `t*1.63`.

The one dial is the weather — `uRef`, and `bearing` for which way. A still day is
`uRef: 0`, and it is exactly zero, which the gate asserts.

### The invariant that earned its keep before anything used it

The field is **exactly divergence-free**: each gust mode is polarised perpendicular
to its own wavevector, so its divergence vanishes identically, and the mean flow is
horizontal and depends only on height. Measured with a central difference the residual
is truncation error and halves as `h²` (ratio 3.8 against the ideal 4).

That is worth having because it is *assertable*, and because a field with sources in
it pumps energy into whatever reads it — which, four steps from now, would be very
hard to attribute. It also decided a modelling question that would otherwise have been
decided by eye: **the gusts do not taper to zero at the ground.** Tapering them by the
shear profile looks more physical and breaks the divergence; keeping `sigma_u` constant
with height is both the measured surface-layer behaviour and exactly solenoidal. What
quietens the bottom of a specimen is that the bottom of a specimen is stiff.

The first version of the test fixed the difference step at 0.01 world units, which
passed at four modes and failed at seven with 5e-4 of pure truncation — an assertion
about a field whose divergence is analytically zero, failing because the test got
stricter as the ladder got longer. The step now comes off the shortest wave in the
field, and the *ratio* between two steps is asserted as well as the magnitude, which
is the stronger statement: an approximately solenoidal field would flatten out at its
own error instead of converging.

### "Defined once" is a claim about two languages, so it needed a GPU

The whole point of the branch is that two functions resembling each other is the bug.
So the JS and the GLSL are not two implementations: `windField()` bakes a table of
modes, `windAt()` sums it, and `windGLSL()` emits an unrolled sum of *the same table's
numbers* as literals. Two checks, because they catch different things:

- `windGLSLNumbers()` reads the constants back out of the emitted source and the gate
  asserts they are the baked ones. This is the half that needs no browser, and it
  caught the one real bug in the step: the emitter wrote `- om*t`, so **a sign that
  lives in the operator cannot be read back out of the source** — the round trip
  recovered `-om` for a positive frequency and `-om` for a negative one, and half the
  table was silently wrong-signed. The frequency is now baked already negated and
  every term is a `+`. Any constant a test has to verify should carry its own sign.
- `tools/wind_check.mjs` compiles the emitted GLSL in a real browser, evaluates it at
  96 points into an RGBA32F target, reads the floats back and compares them to
  `windAt()`. Worst disagreement **2.5e-5 of the mean wind speed**, mean 4.3e-7, worst
  case at the largest `t` — which is where `om*t` eats the float32 significand, exactly
  as expected. It is the first tool in `tools/` that returns a number and an exit code
  rather than a picture, because it is the browser half of a test whose Node half is
  `test/wind.mjs`.

### Two things this exposed rather than added

**The density of air was about to be defined twice.** `gEarth`, `rhoAir`, `unitM` and
`ptPerSec` lived in `FALL_DEFAULTS`, and the wind needs all four. They are now `WORLD`
in `37_wind.js` and the fall spreads them, so every key name and every harness
override still works, and the gate asserts the two agree. A second `rhoAir` is
precisely the class of bug this branch exists to remove, and it would have been
introduced *by the fix for it*.

**The clocks are already two.** `70_app.js` keeps `age` in plant-time steps and `t` in
real milliseconds, and `SWAY` reads `t`. So a wind field wired to the shader the
obvious way would be driven by wall-clock while the simulation read plant time — two
airs again, in a form that only shows up on the time slider, where the plant speeds up
and the wind does not. Everything in `37_wind.js` is per plant-time unit and it says so
at the top of the file.

### What the numbers say about step 2, before it is written

At the shipped weather (1.2 m/s at a metre, Beaufort 1-2): `u* = 0.122` m/s,
`sigma_u = 0.305` m/s, turbulence intensity 25%, gust peaks at 2.3 sigma, mode
frequencies 1.4 / 1.2 / 4.0 / 5.8 Hz. The pre-flight table put the stems' first
cantilever mode at 0.5-4.6 Hz on seven of eight species, so **all four gust modes land
in the band where the stems will resonate.** That was not arranged; it follows from the
integral length scale being of order the height above the ground, which is of order the
plant.

It does not survive turning the wind up. At `uRef: 6` the small eddies advect past at
12-36 Hz and only 44% of the gust variance is still in band. A gale moves the plant
*less* per unit of wind than it looks like it should — correct physics, and worth
knowing before somebody reads a stiff-looking plant as a solver bug.

## One air, step 2: the attached blade is loaded, and it barely moves (2026-07-26)

Step 2 of ROADMAP 7 asked for attached blades loaded through the same plate model the
fall already uses, rocking on a petiole with elastic restoring torque and damping. That
is built, wired into `Plant.step`, and measured. **The mechanism is right and the motion
is nearly invisible**, for a reason that is worth more than the mechanism.

### What was built

One degree of freedom per blade: the rock of the chord about the midrib, which is the
same angle `org.roll` already turned and the same angle the fall integrates. Choosing
that DOF rather than a more obvious one (the petiole bending, which is bigger) was
deliberate — it is the only choice that makes abscission continuous without translating
anything, which is step 4.

Three torques, all the fall's, evaluated on the wind rather than on the blade's own
velocity: the added-mass (Munk) couple that turns a plate's face into the flow, the
normal force acting through a centre of area the margin put off the midrib, and
rotational damping. Held by the petiole as a torsional spring, `k = GJ/L`, integrated
over the real taper, off the pre-flight's one material constant.

Asserted in `test/wind.mjs`: zero in still air; growing faster than linearly with wind
speed (it is a load, and loads go as U²); larger for a bigger blade on the same stalk;
bounded by the stop in a gale rather than diverging; and — the one that checks the sign
of the Munk term the way the fall's was checked, by behaviour rather than by reading —
a blade with its spring removed turns its face to the wind, wind-along-chord going from
62% to 19%.

### The finding: an order of magnitude in the petiole is four orders in the answer

| | measured |
|---|---|
| petiole base radius | 7.4-8.2 mm, i.e. **0.14-0.27 of the blade's own chord** |
| a real leaf | nearer 0.02 |
| first torsional frequency | 374-4040 Hz |
| rock at the shipped weather | 0.28° rms, 4.6° peak over 110 blades |

The petiole is drawn at half the stem's radius at the node. Nobody derived that, and
until now nothing depended on it — it was a tube in a picture. Torsional stiffness goes
as the fourth power of the radius, so a stalk that is ten times too thick is ten
thousand times too stiff, and the blade hanging off it is mechanically a rigid card
being held by a rubber rod 8 mm through.

**Do not fix this by softening `eModulus`.** 60 MPa is already a soft answer chosen
because this plant's radii are stout — the pre-flight says so plainly, and reaching for
it again would make a petiole out of jelly to compensate for a radius nobody defended.
Three candidate ways out, with numbers, in preference order:

1. **The petiole radius should come off the blade it carries, not off the stem.** This
   is ROADMAP 5's existing complaint ("at flower scale the stalks are fat opaque tubes
   and the petals read as blades bolted to scaffolding") arriving from a completely
   different direction, which is usually a sign it is the real defect. The pipe model —
   petiole conducting area proportional to the leaf area it supplies — is the same
   Murray's-law reasoning the stem taper already uses, so it needs no new mechanism,
   only a measured proportionality. At a plausible one it gives a 0.4-0.5 mm petiole
   and about 2.5 Hz, which is plant-like. It also thins every stalk in the piece, which
   is a visual change to every specimen and wants its own before/after.
2. **The compliance that ought to dominate is the blade's own midrib, and it is
   missing.** A rigid blade on a sprung petiole puts all the give in the stalk. In a
   real leaf the lamina twists along its length, and the member that resists is the
   midrib — which this project *canalises a width for*. Putting the midrib's torsion in
   series with the petiole's, using the width the vein hierarchy grew, is the most
   *interesting* fix by this project's standards: it makes the flap frequency emergent
   from the vein network. Rough arithmetic says the midrib is some 600x more compliant
   than the petiole, so it would dominate completely and give about 2° of rock. It is
   also the most speculative, because a one-DOF rigid blade is a crude stand-in for a
   lamina that twists progressively.
3. **Accept it.** These are succulent-stemmed things with short fat stalks and small
   blades, and such a plant's leaves genuinely do not rock much; the visible response
   to wind was always going to be the stem (step 3) and the force-balance droop (7b).
   This is the honest null option and it is not absurd — but it does leave step 2 as a
   mechanism nobody can see.

### And a weather that was wrong for a stated reason

The field shipped at 1.2 m/s. Measuring the blade at 0.03° prompted the obvious
question — is 1.2 m/s much wind? — and **the Beaufort scale answers it in terms of
plants**: force 1 (0.3-1.5 m/s) is "leaves do not move"; force 2 is "leaves rustle";
force 3 (3.4-5.4) is **"leaves and small twigs in constant motion"**. The piece is about
leaves in constant motion, so it was standing in the one force where by definition
nothing happens. It now stands in a force 3 at 4.0 m/s, which is a *cited* choice rather
than a taste, and being quadratic in speed that is eleven times the pressure.

That change alone took the peak rock from 0.45° to 4.6°. It also costs something worth
recording: at 1.2 m/s all four gust modes sat in the 0.3-6 Hz band the stems will
resonate in, and at 4.0 m/s it is 72% — Taylor scaling sweeps the small eddies past
faster, so their forcing moves out of the range anything structural answers to.

### The seam, measured — and it is not the rock (ROADMAP 7 step 4)

`startFall` now hands the fall the attitude and the angular rate the blade already had
instead of guessing both from the margin's asymmetry. The attitude is read off the drawn
chord, which is what the viewer has been looking at; the rate carries over directly,
reduced by the cosine of the blade's droop, because the fall pitches about the
*levelled* long axis.

Measured over 24 blades caught in the act of letting go:

| | median | max |
|---|---|---|
| chord jump at release | 4.0° | 19.6° |
| **long-axis jump at release** | **27.1°** | **44.3°** |

The second row is a bug this branch found rather than caused, and it is much larger than
anything the rock does. `fallFrame` draws a falling blade with its long axis
**levelled** — `fallAxis` flattens it deliberately, because the 2D plate model requires
gravity to lie in the pitch plane, which requires a horizontal pitch axis. So a blade
hanging at 27° straightens out in the frame it detaches on. That is precisely the tell
step 4 says must not exist: *you should not be able to tell from the motion which frame
a blade detached on.*

It is left in place rather than half-fixed, because the honest fix is a second rotational
degree of freedom — the roll about the chord — integrated with the same coefficients in
the perpendicular plane. Two coupled 2D solvers is a defensible reduction of a 3D
problem and costs no new constants, and it would let a released blade level *over a
timescale* instead of instantly, which is what a real one does. That is its own branch:
it changes the drawn fall, which shipped, so it wants its own before/after.

## The petiole, pre-flighted: one law, and a constant that decides everything (2026-07-26)

Step 2 ended pointing at the petiole's radius, so it was measured across all eight
species before anyone changed it. **The table is in ROADMAP 5** and the summary is:

- **Blade areas are 25-115 cm², which is real leaf.** The scale the piece claims is
  fine. Only the stalk is wrong: 6.2-9.5 mm of radius where the pipe model wants
  0.57-1.21.
- **The pipe model puts every species' flap frequency at 6.3-9.5 Hz off one constant.**
  Areas span 4.5x and the frequency barely moves, because stiffness goes as `(kappa·A)²`
  and the inertia scales with area too, so they nearly cancel. Same shape of result as
  ROADMAP 7's stem pre-flight, and the strongest argument that this is the right law.
- **But the twist then saturates** — 42-59° rms against a 69° stop — because a blade
  hinged on its own midrib is statically *unstable* in twist. The aerodynamic centre
  sits ahead of a mid-chord pivot, which is why weather vanes are built the other way
  round. Real leaves do flip about their midribs in a force 3; as a lone degree of
  freedom against a hard stop it will read as pinned rather than as flutter.
- **And the whole range of behaviours fits inside `kappa`'s error bar.** Twist goes as
  `1/kappa²`, and the measured range of petiole-area-per-blade-area across broadleaf
  species is 2e-4 to 1e-3. At 4e-4 the blade pins; at 1e-3 it twists about 8°, which is
  exactly right. **A quantity that swings from invisible through perfect to pinned over
  the error bar of a borrowed constant cannot be the primary motion**, and tuning it
  until it looks right would be tuning, not measuring.

So the recommendation is recorded as: do #5 **with** 7b. Bending is the column that
behaves — 4.8-13.2° under the blade's own weight, bounded, no per-species number — and
it is what `sp.droop`'s eight stated values stand in for. Twist is a detail on top of a
stable DOF, not a substitute for one.

The way to get `kappa` out of the codebase is also written down there, because it is
this project's kind of answer: **the conducting cross-section of a petiole is something
the leaf already canalises.** The trunk of the vein hierarchy — the midrib at the
petiole, where `50_geom.js` says everything funnels — *is* the measured conducting area
for that blade. Sizing the stalk off the traffic the midrib carries replaces a borrowed
literature constant with the engine's own output, and gives a heavier-veined leaf a
stouter stalk, which is variation nothing in the piece has. It does not remove the
absolute scale, since drawn vein width is a display mapping — a better law with the same
one free number.
