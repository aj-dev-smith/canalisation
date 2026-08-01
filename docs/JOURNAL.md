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

## Falsified: a second rotational plane for the falling blade (2026-07-26)

The step-2 measurements left one thing much larger than anything else in the seam: a
falling blade's long axis is drawn **levelled**, so a blade hanging at a droop
straightens out on the exact frame it detaches on, by a median of 27° and up to 44°.
`fallAxis` flattens it deliberately — the borrowed 2D plate model needs gravity in the
pitch plane, which needs a horizontal pitch axis — so this is the reduction showing
through the picture, not an oversight. It is also precisely the tell ROADMAP 7 step 4
forbids: *you should not be able to tell from the motion which frame a blade detached
on.*

The obvious fix is a second rotational degree of freedom: integrate the cross-section
along the blade's **length** as well as across its width, carry the tilt over at
abscission, and let the same added-mass couple level it. No new coefficient — a plate
turns its face into the flow, and for a blade coming down that means its plane goes
horizontal, which levels the long axis. It was built. It is **off**, and it is kept
runnable behind `FALL_DEFAULTS.tiltPlane` with `test/fall.mjs tilt` reproducing both
halves, for the same reason `rhoI: 0` keeps the dead inhibitor and `shootOpts.enabled`
keeps the whole-plant stream.

**It works, and then it does not.**

| | result |
|---|---|
| seam, long-axis jump | 27.1° → **0.00°** (max 0.02) |
| seam, chord jump | 4.0° → **1.0°** |
| dropped with the pitch at rest, tilt 5-40° | levels in 0.10-0.11 s, **0 of 40** go over |
| pitch released at 15-75°, tilt 25° | **32-39 of 40** take the long axis past 90°, median excursion 600-900° |

So it closes the seam exactly, behaves beautifully in the case it was designed for, and
sends the majority of a real canopy end over end.

**Why, and it is a statement about the reduction rather than a bug to find.** Two
independently-solved 2D planes do not exchange angular momentum. A real rigid body has
gyroscopic terms that move it between the planes and conserve the total; here the pitch
feeds the tilt through the frame — the sign of the tilt's restoring couple goes as
`cos(th)` — and nothing carries energy back, so a tumbling pitch drives the tilt
resonantly and no term in the model can stop it. It is well behaved only on the
knife-edge `th = 0` or `90`, which is not a solution. The same file already records the
general form of this lesson from the finite-span correction: **a borrowed model has
assumptions, and one of them is its dimensionality.** This is the second time that has
been the answer here.

Two routes out, and the cheap one is not in this file:

1. **A genuine 3D rigid-body fall** — one angular velocity, one inertia tensor, Euler's
   equations, and the quasi-steady load evaluated on the 3D relative flow. It has a real
   test to hold it to: it must reproduce the validated 2D flutter/tumble ordering as its
   in-plane limit. It is a rewrite of a shipped file, so it wants its own branch.
2. **Stop handing it a 27° tilt.** That tilt *is* `sp.droop`, which is imposed; the
   ROADMAP 5 pre-flight measured what a blade's own weight would actually bend its
   petiole to and got 4.8-13.2°, and at tilts that size this plane never misbehaves.
   **So 7b would close most of this seam by deleting the constant that opens it.** That
   is the third independent argument for 7b in one day.

### A measured consequence of step 4 that was worth checking

Carrying the real release attitude over changed the release pitch from a near-broadside
guess (`skew*0.5`, a degree or two) to what the blade was actually held at — a median of
3-16° across the eight species, with a long tail. The isolated sweep above says that
should matter, so the regime mix was re-measured on real specimens, 60 blades each:

**Steady glides very nearly disappear** (per species: 6→1, 8→0, 4→0, 11→0, 5→0, 4→1) and
flutter and tumble take them up. That is the expected direction and it is right: a blade
released exactly broadside can settle into a straight glide, and one released a few
degrees off starts rocking immediately. Every species still shows more than one regime,
which is #8's headline and the thing that had to survive.

## One air, steps 3 and 5: the stem bends, and the fake sway is deleted (2026-07-26)

The last two steps of ROADMAP 7, and the ones that make the branch visible. The axes are
damped cantilevers loaded by the wind field and their own canopy, and `SWAY` — three
sines of position and wall-clock time in the vertex shader — is gone. That was the last
authored motion in the piece.

### The pre-flight paid for itself

The value of ROADMAP 7's step 0 was never the table; it was that the table existed
*before the solver did*, so there was a number to be wrong against. Three separate bugs
were caught by that comparison and **not one of them would have been visible on screen** —
each produced a plant that swayed pleasantly at a frequency that happened to be wrong.

| species | analytic | solver mode 1 | ringdown | ratio |
|---|---|---|---|---|
| Cathedral Fern | 1.17 | 1.26 | 1.25 | 1.07 |
| Spiral Ossuary | 0.48 | 0.58 | 0.57 | 1.21 |
| Abyssal Frond | 0.84 | 0.75 | 0.75 | 0.90 |
| Sun Coral | 1.49 | 1.57 | 1.56 | 1.05 |
| Hoarfrost Thicket | 3.06 | 3.51 | 3.48 | 1.15 |
| Ember Creeper | 0.53 | 0.62 | 0.62 | 1.16 |
| Sulphur Rosette | 15.06 | 9.35 | 9.15 | 0.62 |
| Nightglass Parasol | 4.57 | 4.53 | 4.47 | 0.99 |

Seven of eight within 0.90-1.21 of the paper answer, off one material constant, with the
eigenvalue and the stopwatch agreeing to under 1% and the discretisation converged to
0.3% across 4 to 24 stations.

### The three bugs, because the shape of them generalises

**A diagonal mass matrix is not a beam.** Each station an independent oscillator, `EI/ds`
against the inertia above it. `ds` goes as `1/M`, so every spring stiffens as the mesh
refines while its inertia does not: 1.57 Hz at four stations, 2.76 at sixteen, still
climbing. The coordinates genuinely share inertia — rotating station j carries the mass
above station k as well — so the mass matrix has off-diagonal terms, and with them
compliances add in series the way a cantilever's do.

**Then it would not integrate.** The coupled mass matrix is ill-conditioned by
construction (neighbouring stations see nearly the same mass at nearly the same
distance), so `M⁻¹K` spans a huge range and an explicit step rang at exactly Nyquist with
zero damping. Backward Euler and one Cholesky per axis per step.

**And then it was 20% fast.** The rotations should stay perpendicular to the axis they
bend, so the state was projected onto that plane every substep — which on a curving stem
deletes a fixed fraction of the deflection each time. A constraint enforced by wiping
part of the state is a damper with no physics in it. The torque already drops its axial
component, which is where the exclusion belongs.

Two harness bugs sat on top of those, and they are the same lesson from the other side:
counting zero crossings into the decayed tail measured float noise, and a uniform kick
excited every mode the mesh carried so the count read a mixture. **When the eigenvalue
and the stopwatch disagree, suspect both.**

### Gravity had to stay in the rest shape, and the arithmetic is pretty

The obvious move is to load the stem with its own weight as well as the wind. It does not
survive contact with the numbers. A cantilever's static sag and its first frequency are
the same stiffness-to-mass group, and eliminating `EI` between them leaves

    delta = 1.545 g / omega_1^2

with nothing free in it at all. At the measured 1.26 Hz, a Cathedral Fern's tip hangs
**27 cm** below where it grew, on a plant 1.08 m tall. Wanting the sag under 5% of the
height forces the first mode above 2.8 Hz, which is not a plant-like sway. **There is no
stiffness that gives both.**

Real plants are not exempt from that arithmetic; they escape it by not being static
structures. A stem is continuously remodelled toward its target orientation, so the shape
it has grown into *is* its static equilibrium and the sag is already spent. `40_plant.js`
grows that shape and `39a_stem.js` solves the deviations about it — which also means the
whole branch changes no silhouette at all.

That same rigid link is the real content of ROADMAP 7b, and it is the third independent
argument today that 7b is the keystone: a petiole bending under its blade's weight is the
same trade between hanging and swaying.

### What it looks like, in numbers

Force-3 tip sway spans **fiftyfold** across the catalogue with no per-species value
anywhere: Spiral Ossuary 2.12 world units, Ember Creeper 1.41, Abyssal Frond 1.26,
Cathedral Fern 0.43, Sun Coral 0.20, and Hoarfrost, Nightglass and Sulphur Rosette
essentially nothing. `EI` goes as r⁴ and the load goes as canopy area, so a tall shoot
carrying a lot of leaf moves and a cushion does not. The pre-flight had already written
down "if a fix makes Sulphur Rosette's stem sway, that fix is wrong"; it does not.

And the number that made the whole exercise feel worthwhile: **the hand-tuned `SWAY`
peaked at about 0.34 world units at the top of a Cathedral Fern, and the physics, asked
independently, says 0.43.** Whoever tuned that sine had a very good eye. What changes is
not the amplitude — it is that the motion now has the plant's own frequency, gusts that
arrive as gusts, a stem and its leaves that move as one thing, and a response that
differs by species because the species differ.

## The wind was a vibration, and it took a person to notice (2026-07-26)

The stem landed, the numbers all agreed with each other, sixty-five checks passed, and
the first person to watch it said: *it wobbles way too fast, and some of the leaves do a
super fast jitter that feels like a bug.*

Two complaints, one wrong number, and it was mine.

`lambdaM` — the integral length scale of the gust spectrum — shipped at 1.0 m, with the
comment "in the surface layer it is of order the height above the ground". That rule is
real, and it is about the **vertical** component: the eddies carrying `w` are limited by
their distance from the wall. The **streamwise** component is not. Its integral scale is
set by the depth of the boundary layer, and the standard wind-engineering figures are
tens to hundreds of metres near the ground — roughly 30-60 m at a height of 1 m.

I had applied one velocity component's length scale to a different one. The result was a
field in which **every gust mode was between 3.9 and 19.3 Hz.** That is not wind. It is
vibration, and it was driving both the stem and the attached blades directly.

### Measured, because "feels like a bug" deserves a number

`tools/jitter.mjs` samples the drawn state at frame rate and reports where the movement's
energy sits. Cathedral Fern, seed 21, same moment in the arc:

| | before | after |
|---|---|---|
| stem tip | 0.00 Hz | 0.41-0.46 Hz |
| individual blades | **3.8-16.5 Hz** | 0.29-1.10 Hz |

The stem's 0.00 Hz on the "before" build is not a bug in the measurement — it is the old
`SWAY` being shader-only, so the geometry genuinely never moved. The blades did, at up to
16.5 Hz, which is past what a 60 Hz display can even show honestly.

At 32 m the ladder runs 32 m down to 0.5 m, the frequencies run 0.13 to 2.9 Hz, and about
63% of the gust variance sits in the two slowest octaves because Kolmogorov gives the big
eddies the big amplitudes. Force-3 sway went **up** slightly as a side effect — Cathedral
Fern 0.30 to 0.43 world units — because a 32 m eddy pushes the whole specimen coherently
where a 1 m one fights itself along the stem.

### What to take from it

**Every number in the field was checked against every other number in the field, and the
field was still wrong.** Divergence-free to 1e-6, gust rms matching `2.5 u*` to 0.1%,
Kolmogorov ratios exact to six figures, JS and GLSL agreeing to 1e-5 on a real GPU. All
of that was true of a wind nobody would recognise as wind. Internal consistency is not
external validity, and no amount of the first buys any of the second.

The check that would have caught it does not exist in the repo and now does: **what
frequencies is the thing actually moving at?** It is the one question the twenty-four
assertions in `test/wind.mjs` never asked, because they were all about the field and none
of them was about a plant standing in it.

Second thing, smaller and more embarrassing: the harness *did* print the mode frequencies,
in a table, every time it ran. 4.822, 3.946, 13.494, 19.263. I read that table repeatedly
while chasing the stiffness of a petiole and never once asked whether 19 Hz was a
plausible thing for weather to do.

## Force 3 was the wrong weather, and the second complaint was not about frequency (2026-07-26)

The length-scale fix landed and the same person watched again: *still too windy, needs to
be more subtle.*

Two things worth separating there, because I nearly conflated them.

### The wind speed was too high, and that is allowed to be a judgement

`uRef` is the one number in the whole mechanical stack that is a choice. Everything
downstream of it — the friction velocity, `sigma_u = 2.5 u*`, the Kolmogorov ladder, every
gust frequency, the log profile — is derived from it, so a wrong value here cannot make
the physics wrong. It can only put the scene in the wrong weather.

It has now been wrong in both directions, which is the useful part. It shipped at 1.2 m/s,
force 1, *"leaves do not move"* — and the mechanics was correctly invisible. It went to
4.0, force 3, *"leaves and small twigs in constant motion"* — cited, defensible, and too
much. Force 3's own wording is the tell: **constant** motion describes a busy scene, and
this piece is a quiet close study of one specimen. It is now 2.5, upper-middle of force 2,
*"wind felt on the face; leaves rustle"*.

All three are Beaufort citations rather than tastes. What I got wrong was not the sourcing
but the assumption that sourcing a number settles it. Choosing which band a scene stands
in is composition, and there is no experiment that resolves composition. So it is a slider
in the UI now (`app.setWind`, which rebakes the field keeping the seed, so dragging it
reads as the wind getting up rather than as a different day each frame), and `clip.mjs`
and `jitter.mjs` both take a `uRef` argument so a before/after on the weather is two runs
of one binary instead of two checkouts.

### "Too fast" meant two different things and only one of them was frequency

This is the part I would have got wrong by pattern-matching on the previous entry. The
first complaint was genuinely about frequency and the fix moved frequencies by a factor of
thirty. This one was phrased the same way and was not:

| Spiral Ossuary, seed 21 | at 4.0 m/s | at 2.5 m/s |
|---|---|---|
| stem tip, dominant rate | 0.53 Hz | 0.60 Hz |
| stem tip, deflection rms | 0.368 | 0.053 world units |
| stem tip, peak slew | 4.15 | 0.67 world units/s |
| worst blade, dominant rate | 0.58 Hz | 0.65 Hz |

The dominant frequency **did not move**, and could not have: it is the stem's own first
bending mode, 0.58 Hz for this species, and the wind only decides how hard it is struck.
What dropped by a factor of six is the peak slew — how fast the tip travels through space
— which is amplitude times frequency, and that is what a viewer is reading when they say
something moves too fast. If someone says it is too fast, measure both, and do not assume
the previous fix's failure mode is this one's.

The amplitude fell faster than the quadratic load law alone predicts (a factor of 7 in
rms against 2.56 in pressure) because the response is resonant: cutting the speed also
slides the whole Taylor-advected gust ladder down in frequency, and less of it lands near
the stem's own mode.

### A third thing, found by fixing the measurement

`tools/jitter.mjs` was recording the **absolute position** of the stem tip, which climbs
as the axis elongates. Growth is a far larger displacement than sway, so the tool reported
an rms near 1.0 world units that barely responded to cutting the wind by a third — it was
measuring the plant getting taller. It now records the tip's offset from the rest shape,
where growth cancels. The frequency estimate happened to survive this because differencing
a slow ramp adds little to the step variance; the amplitude numbers did not, and the
before/after above is unusable without the fix. **A tool built to check one bug can carry
its own.**

### And the number that is not a coincidence

The old hand-tuned `SWAY` peaked at about 0.34 world units on a Cathedral Fern. The
physics says 0.43 at force 3 and 0.17 at force 2, so the sine sits neatly between the two
speeds a person picked by eye — twice, months apart, on the same plant.

But matching peaks is the wrong target and it is worth saying why, because it would be an
easy "restoration" for a future session to make. A sine of amplitude A spends most of its
time near ±A; a gusty wind that occasionally reaches A spends most of its time near zero.
Equal peaks therefore read as very unequal business, and the physical version is the
busier one. Match how it reads, not how far it goes.

## Leaves blinking in and out, and four wrong suspects first (2026-07-27)

AJ, getting ready to post: *"leaves snap in and out of existence… at any given
point maybe up to 25% of the leaves are hidden until you move, then a new set pop
up and disappear."*

**Measured, on the shipped build, seeded so the specimens are the same run to
run:** the default species hides **28.8% of its canopy on average and 50% at the
peak**, with a blade changing visibility about four times a second. So the report
was not an impression; it was the number.

### What it was not, and how each was ruled out

Worth writing down, because all four are the obvious guesses and all four are
wrong, and two of them cost the most time.

- **Vertex buffers saturating.** `Buffers` drops geometry silently when full, and
  `50_geom.js` already documents that failure. Peak occupancy over a whole life
  cycle is **28.5% of the triangle buffer and 44.8% of the line buffer, saturated
  on 0 of 8339 frames.** Not it.
- **Non-finite geometry.** A NaN vertex is not rasterised, so a leaf can vanish
  from the picture while every count stays identical — which is exactly the
  symptom. Scanned every float of both buffers every frame across a full life
  cycle: **zero non-finite values, and no organ ever more than 0.50 bounding-box
  spans off centre.** Not it.
- **Backface culling / one-sided normals.** `CULL_FACE` is never enabled and
  `MESH_FS` flips `N` toward the eye. Not it.
- **Depth precision.** `DEPTH_COMPONENT24`, near 0.05, far 400. Not it.

The measurement that killed all four at once: freeze growth, wind and camera on a
leafy specimen, then orbit. **The triangle count held at 61884 for 1202 consecutive
frames** and nothing was hidden. Whatever removes leaves is not always on — it is
switched on by something.

### What it is

The occlusion cull in `buildScene`. It clears the line of sight to whatever the
director is pointing at, so a leaf does not fill the frame during a close-up, and
it is the only thing in the piece that removes a whole organ. It engages only when
the director has a `subject` (flower, fruit, organ) or a `focus` (apex, leaf) —
which is most of the film's second half.

Two defects, both about *when* rather than *whether*:

**1. It was a cylinder, and it should have been a cone.** The test compared an
organ's world-space distance from the sight line against the subject's world-space
clearance, at any depth. But "in the way" is a statement about *angle*: a leaf a
tenth of the way along the sight line only has to be a tenth as far off it to
cover the same part of the frame. As a cylinder, a leaf right by the lens got the
same generous clearance as one touching the subject, so the cull cleared canopy
that was nowhere near the subject on screen. Scaling the radius by `t / cullDist`
makes it a cone with the radius at the subject unchanged — so the thing the
clearance exists for still happens.

**2. The clearance opened on the cut, not on arrival.** This one is embarrassing,
because the fix was already in the same function. The `leaf` close-up ramps its
clearance in on apparent blade size, with a comment explaining that engaging at
full width from the wide shot "made half the plant vanish in one frame, before
anything had moved". The director's own shots had the identical defect and nobody
joined it up. Measured across all eight species: every shot type sits above **0.41**
apparent size once settled, while the apex and fruit cuts start around **0.21** —
so `smoothstep(0.20, 0.38)` on the same quantity is shut at the cut and fully open
by the time the shot is. Apex flips in the first 0.4s of a shot went to **zero**.

### And a third, which is a plain bug

`takeOver()` — what a pointerdown on the canvas calls — cleared the director's
`subject` but not its `focus`. Since the auto-framer is locked out while the
viewer drives, the *only* remaining effect of that stale focus was to keep the
occlusion cull running, measuring a sight line to a growing tip nobody was looking
at any more. Grab the camera during an apex shot and orbit, and the clearance
sweeps through the plant: **80% of blades hidden at the peak, a blade flipping
every few frames, and it never ends** because `giveBack()` only fires after the
viewer goes idle.

The asymmetry is visible in the harness output: `subject after takeOver(): null
(cleared)` / `focus after takeOver(): apex (survived)`. Focus now records who asked
for it — `focusByDirector` — and `takeOver()` drops the film's and keeps the
viewer's, so pressing "into the cells" still works.

After: **0% hidden, 0 flips, over 1324 frames of orbiting.**

### What is still true, and is a directorial question rather than a bug

On the default species the apex close-up still clears about **24%** of the canopy,
and that is the cull doing its job: the camera sits ~2.2 units off a meristem
surrounded by leaves 4.3 units long, so those blades genuinely are between the
lens and the subject. Clearing them is why the clearance exists. Whether an apex
shot *should* be composed that tightly is a question for whoever is cutting the
film, not something to solve by weakening the test.

The residue that is still worth someone's time: coming *out* of a culling shot,
every hidden blade returns in a single frame, because `cullFrom` goes null on the
cut. The cull cannot be a fade — the forward pass writes depth, so a blade dimmed
to black still hides what is behind it — so the only route is to let the clearance
decay over a few hundred ms after the shot ends rather than switch off.

### The lesson

The tell was **the triangle count**. It was constant across every frame where
leaves were vanishing, which rules out most of the plausible causes in one number
and points straight at the one mechanism that decides *not to build* geometry. Four
hypotheses were tested against the wrong instrument first — screen diffs, buffer
occupancy, NaN scans — and one cheap counter would have gone straight there.

`tools/cull.mjs` is that counter, kept.

## The petiole, and a mechanism that did not survive being given a real one (2026-07-28)

ROADMAP 5 + 7b, landed together because the pre-flight said they had to be. Three
results, and the third is the one worth reading.

### 1. The pipe model, and a pre-flight that was right without a solver

The petiole's radius came off the STEM's radius at the node — half of it, underived,
and irrelevant until ROADMAP 7 step 2 hung a sprung blade off it. Both bending and
torsional stiffness go as r⁴. It is the pipe model now: conducting area proportional to
the blade area supplied, `A_pet = kappa·A_blade`, which is the same reasoning the stem's
own Murray taper runs on and needs no new mechanism.

The ROADMAP 5 pre-flight predicted 0.57-1.21 mm across the eight species with pen and
paper. The solver gives **0.59-1.24**. It also predicted the flap would land at 6.3-9.5
Hz off one constant; the solver gives 6.8-11.3. Nothing was tuned to reach either.

`kappa` is the geometric centre of the published broadleaf range (2e-4 to 1e-3), and it
has an independent confirmation that matters more than the range does: an ordinary
broadleaf runs about 1 mm of petiole diameter on a 4 cm blade, 1.5 on 6, 2.5 on 10 —
r/chord ≈ 0.0125 in all three, which is `kappa` ≈ 4.6e-4. The shipped stalks measure
0.010-0.013 and `test/wind.mjs` asserts it. **The old comment in that harness said a real
leaf was "nearer 0.02"; that was an estimate and it was high**, which is worth recording
because it was the only number standing between the old fat stalk and this one.

The taper went too. A stem tapers because organs join it along its length; nothing joins
a petiole between node and blade, so the pipe model says it is prismatic. Two stated
constants replaced by one.

### 2. The stem's modulus is not the petiole's, and 60 MPa was a claim

`FLAP_DEFAULTS.eModulus` was the stem's 60 MPa, which was cheap and defensible while
only the twist read it. Then 7b made the same number decide how far every leaf hangs and
it stopped being a default: at 60 MPa a horizontally-held Cathedral Fern blade bends its
stalk **83°**, which is a rag. Every species saturated against the geometry — and the
saturation briefly faked a scaling result, see below.

60 MPa is right for the *stem* for a reason `39a_stem.js` states: fleshy, parenchyma-rich,
stout axes, and a column in compression can be built that way. A petiole cannot. It is a
cantilever whose whole job is holding a blade out sideways, and real ones are reinforced
for exactly that with peripheral collenchyma. Herbaceous petiole flexural moduli measure
0.1-1 GPa; 300 MPa is the geometric centre. The check that it is not a dial is that at
300 MPa the solver independently reproduces *both* bands the pre-flight published —
4.8-13.2° of hang, 6.3-9.5 Hz of flap — and neither was used to pick it.

**A saturated nonlinearity can impersonate a scaling law.** At 60 MPa the fixed point
`theta = theta_h·cos(elev - theta)` is pinned against the geometry, so the answer depends
on the organ's elevation and not on its load at all — and the first run of
`test/petiole.mjs` duly reported that bigger blades hang lower, passed, and was wrong. At
any modulus where the beam is actually linear the ordering reverses. The assertion was
measuring the saturation.

### 3. Falsified: an attached blade rocking on its own petiole

This is the real result. ROADMAP 7 step 2 built it, measured 0.28° rms, called it
"correct, continuous at abscission, and invisible", and diagnosed the petiole. The
diagnosis was right about the cause and wrong about the cure: **given a physical stalk
the mechanism does not become visible, it becomes wrong.**

| | old stalk | pipe-model stalk |
|---|---|---|
| twist at the shipped weather | 0.10° rms | **69° rms** |
| time within a whisker of the stop | 0% | **31%** |
| `tools/jitter.mjs` | reads as sway | blades at 10-25 Hz, **READS AS JITTER** |

Three things were ruled out before concluding, and the order matters because two of them
looked like the answer:

- **Not the stop.** `maxFlap` was 1.2 rad = 69°, and the added-mass torque turns a plate
  face-on at 90°, so the stop sat *inside* the model's own stable equilibrium and every
  blade parked against it. That is a genuine bug and it is fixed (1.75 rad) — it took the
  pinned fraction from 12% to 1.3% on the sample where it was first measured — but it did
  not change the verdict.
- **Not the damping.** Measured: the effective ratio sits at its structural 0.12 and goes
  negative only 6% of the time, so this is not the `cCirc` galloping term running away.
  A missing term *was* found while looking (see below) and it moved the ratio 0.10 → 0.12,
  which is real and not nearly enough.
- **Not resonance.** The wind's highest gust mode is **1.78 Hz**. Nothing in the scene is
  driving 25 Hz. The blade is not being shaken, it is *snapping* between the two face-on
  attitudes as the wind wanders across it.

Which is what the pre-flight said would happen, in advance: a plate hinged along its own
midrib is statically unstable in twist, because the aerodynamic centre sits ahead of a
mid-chord pivot — the reason weather vanes are built the other way round. One rigid
degree of freedom is standing in for a lamina that in reality twists progressively,
gives, and reconfigures.

**It ships disabled and re-measurable**, in the same category as `rhoI: 0` and
`38_shoot.js`. Nothing visible was lost: the motion it replaces was 0.28°, and what a
viewer reads is the stem (0.56-0.64 Hz, unchanged) and now the hang. `tools/jitter.mjs`
goes back to READS AS SWAY with everything at 0.38-0.64 Hz.

**The thing not to do is widen `kappa` until it behaves.** It would work — at 1e-3 the
twist is 8° and the stop is never touched — and it is precisely the move the pre-flight
forbids, because the twist spans invisible-to-pinned across `kappa`'s published error bar
and `kappa` has an independent confirmation where it sits. Tuning it would be tuning.

### A term the attached blade was missing, found by asking what the fall gets for free

Worth its own paragraph because it is a clean example of the borrowed-model trap this
project keeps hitting. A falling plate's `vPar`/`vPerp` are its *own* velocity, so when it
rotates the flow it sees rotates with it and the coupling damps it. An attached blade's
are the *wind*, which knows nothing about how fast the blade is turning — so the only
thing resisting rotation was a form drag quadratic in the rate, documented as
contributing "essentially nothing" at the amplitudes the old stiff petiole produced. True,
and true for the wrong reason: `zeta` was silently carrying all of it.

The missing term is the strip integral the model already implies. Rotating at `om`, the
station at chordwise offset x sees an extra normal velocity `x·om`, so the circulatory
force varies along the chord; its moment about the pivot is

    M = -integral x·(1/2 rho cT |vPar| (vPerp + x om)) dx  =  -(rho cT |vPar| c^3 / 24)·om

The `vPerp` half integrates to zero about a mid-chord pivot, which is why it is invisible
until you ask about the *rate*. Linear in rate and speed, always dissipative, no new
constant — `cT` is the plate's own lift slope. It vanishes at face-on, where there is no
chordwise flow to make circulation from, and that is where the form-drag term is large;
the two are complementary and always were. **The fall is deliberately not given it**: its
rotational damping is the published model's, `test/fall.mjs` validates it against the
published flutter/tumble ordering, and adding a term to a validated model to fix a
different model's problem is how you end up with neither.

### And two harnesses that were testing the program of a year ago

Both are the failure CLAUDE.md warns about — a harness holding its own copy of a shipped
scale — and both passed for years before this branch made them wrong.

- `test/wind.mjs` proved the added-mass torque's sign by making the spring negligible at
  an absolute `eModulus: 1e2`, which was four orders below the modulus of the day. ROADMAP
  5 thinned every stalk, `k` goes as r⁴, and the same absolute number became *numerically
  degenerate* rather than merely small: `flapStep` solves the oscillator in closed form and
  its equilibrium term is `torque/k`, so as k falls it evaluates a finite angle as an
  enormous number times a tiny one. The answer wandered — 53°, 132°, 65° — and read
  exactly like a sign error. Above k ≈ 1e-6 it is clean and monotone (94.5, 89.9, 86.7,
  79.7, 77.2 as the spring stiffens), which is face-on approached from the stiff side. The
  fix is to make "negligible" relative to what ships.
- The same file's abscission-seam section snapshotted only organs carrying a flap state,
  so when the flap shipped off the section silently measured **zero blades** — while the
  two things it actually measures, how far the drawn chord and the long axis jump at
  release, are properties of the frame and have nothing to do with the flap. Worth noting
  that the seam got *better* through all of this: the chord jump is 2.3° median, against
  6.4° before the branch and 14.9° with the flap on.

## A garden, and three laws that were wrong on the way (2026-07-29)

The ask was a stand of plants rather than one specimen. The answer to "how many
can we render" turned out to be **one**, and the reason was not what anyone
expected.

### The bottleneck was not the triangles

Crushing the lamina grid thirty-fold moves the line count by exactly nothing:

| | mu×mv | geom ms | ktri | kline |
|---|---|---|---|---|
| shipped (near) | 13×6 | 9.17 | 15.2 | **78.7** |
| coarse | 8×4 | 6.88 | 7.1 | **78.7** |
| minimum | 3×2 | 5.80 | 2.5 | **78.7** |

Every vein segment of every leaf was emitted at every distance — 26,200
six-vertex ribbons per Cathedral Fern — with no level of detail of any kind. One
plant is 65-79k lines against what was then a 149k buffer, so the scene was
capped at one plant by a feature nobody had noticed was missing.

### Wrong law 1: "drop anything narrower than a pixel"

The obvious rule, and it fails on a fact that is more interesting than the rule
was: **measured against the app's own camera, about ninety percent of the hero's
veins are already sub-pixel and already clamped up to the width floor.** The
default `MINW` of 0.004 is not what the app uses — it passes
`cam.dist * px * 1.5`, which is 9.7e-3 at the shipped framing, and against that
almost the whole minor network is being drawn at one uniform width.

So the rule would not have been a distance optimisation. It would have redrawn
the subject of the piece, dropping 87% of the hero's ribbons at the framing
distance. The hierarchy the leaf spends its canalisation finding does not reach
the screen as hierarchy today — it reaches it as a smear that costs full price.
That is a real limitation of the display mapping and it is now written down in
TUNING; it is not something to fix by deleting the smear.

**What shipped instead:** constant vein density per screen pixel, anchored to the
camera's framing distance. A blade at the camera's own distance keeps everything;
a blade with a quarter of the screen area keeps a quarter of the ribbons. Since
`leaf.veins` is sorted by traffic, what survives is the top of the hierarchy.

### Wrong law 2 and 3: two ways to get the light wrong

Culling ribbons must not change how bright a blade is. Two attempts failed
before the third worked, and both failures were instructive.

**Modelling every vein at its natural width under-compensates by 60%.** In the
regime where the cull operates, almost every *dropped* vein was in fact being
drawn clamped to the width floor, which is much wider than its order says. There
have to be two cumulative tables, not one.

**Conserving against the new renderer's own output over-compensates by 15x.**
The per-blade width floor holds a distant ribbon at 1.5 screen pixels, which
makes it far wider in world units than it used to be. Conserving light against a
renderer that had already inflated it keeps the inflation. A specimen at sixteen
focal lengths came out fifteen times too bright, and **the cull was under a fifth
of that error** — the width floor was the rest.

**The invariant that is actually right:** an emissive surface looks equally
bright per pixel however far off it is, so its emitted total in *world* units
must not move with distance at all. Target that and both effects are undone at
once. Conserved to ~2%, and ~12% where so few ribbons survive that the
material-space length approximation stops averaging out.

There is also a fourth thing that was wrong, in the *harness* rather than the
code: the first version moved the camera and the pixel calibration together,
which models one plant being backed away from and can never produce a blade
further off than the subject. It reported the cull working in reverse. **A
measurement of a multi-object scene has to be set up as a multi-object scene.**

### And then the garden froze the tab for nineteen seconds

`plantGarden` warmed every specimen to its head start in one synchronous loop.
The whole test suite passed, every capture tool produced correct pictures, and
the thing was unusable — because a step during *growth* costs 1.7ms rather than
the ~300us a grown plant costs, and 11,400 of them is 19 seconds of blocked main
thread.

Nothing in `tools/` could have caught it. Every tool there navigates, waits, and
screenshots, so a frozen tab and a busy one are indistinguishable. It was found
by a person typing the call into a console. That is the fourth time on this
project that the fastest route to a real defect has been someone watching, and
the second time the suite was green while the piece was visibly broken.

`tools/garden_hitch.mjs` now measures the one thing those tools cannot — the gap
between animation frames — and it immediately found a second freeze underneath
the first, worth 501ms, from constructing seven `Plant`s back to back.

### What is not derived here, and should be said plainly

Where a plant is standing is scene composition, not chemistry — a jittered ring,
scattered by a seeded PRNG. It says where a seed landed, not what grows out of
it, so it does not belong on the SCIENCE.md list; but it is a spatial choice and
it should not be allowed to quietly become one.

What *is* worth keeping: the positions are real, not applied at draw time, so the
axes are solved as cantilevers in a wind field that varies across the ground.
Two plants three metres apart are genuinely in different air, and because the
field advects by Taylor's hypothesis, **a gust crosses the stand** rather than
arriving everywhere at once. That fell out of the field already being right and
cost nothing.

## Views, and four things that were wrong on the way (2026-07-29)

The renderer had been decoupled from the simulation for months without anything
taking advantage of it. What came out of finally trying is in ROADMAP 12; what
follows is the part that did not work, which is the more useful half.

### The claim that was backwards, asserted before it was measured

A prototype said a whole plant at cell resolution would cost 3.86ms against the
lamina-and-veins path's 11.59ms — so the headline was going to be that the cell
view is *cheaper* than the view it replaces. The first version of
`test/views.mjs` asserted exactly that, and failed on the first run.

The prototype had flattened the material-to-world map, which is most of what
`laminaCells` does per cell, and it had drawn no veins. With both put back the
real numbers are 12.3ms against 8.3ms: the cell view is **dearer**, by about
half. The bound that survives is a weaker and more honest one — a whole plant at
solver resolution is the same *order* as a plant drawn as surfaces, not an order
above it.

Worth noting how close this came to shipping as a claim. The prototype was a
measurement, not a guess; it was simply a measurement of something slightly
different from the thing being claimed. **The check that caught it was writing
the assertion down before believing the number.**

### The optimisation that was obvious and wrong

`Buffers.ribbon` built its four corners as four JS arrays and handed them to
`gv`. At the 22,000 vein ribbons one specimen draws that is 88,000 short-lived
allocations a frame; at the 79,000 ribbons a plant of needles wants, 316,000. It
looked like the bottleneck, and rewriting it to write straight into the buffer is
an obviously good change.

It bought 3%. 8.38ms to 8.15ms on `natural`, 12.97 to 12.10 on the cell view. V8
handles short-lived arrays far better than the allocation count suggests.

The measurement that should have come first is the one that came second: **cost
per primitive.** A ribbon is 188ns and a point is 37ns, a ratio of 5.1, against a
data ratio of 42 floats to 7, which is 6. The line pass is memory traffic and
there was never anything to shave inside that vertex format. The way out is
instancing — twelve floats instead of forty-two — and that is ROADMAP 11 now,
with these numbers attached so nobody re-derives them.

The rewrite is kept. It is not slower and it allocates nothing on the hottest
path in the piece. But it was an hour spent on the wrong layer.

### The threshold that could not be computed first

Almost every constant in this project is worked out on paper before the solver is
written, and TUNING.md is a record of that discipline. The needle visibility ramp
is not one of those, and pretending otherwise would have shipped a bad picture.

The geometric answer is that a needle is legible once it is longer than a pixel
or two, and at that threshold `mech` fades in over 0.8 to 2.4 screen pixels. A
Cathedral Fern framed whole then drew 46,000 needles at about three pixels each
over a plant covering some 200,000, so every pixel carried two or three of them,
the additive pass turned the organism into a white blur, and `cells` and `flux`
were **indistinguishable at that framing**. That last part is the tell: a channel
that cannot be told apart from another one is not showing anything.

The right question is not whether one needle is longer than a pixel. It is
whether the *field* of them is sampled well enough to read as directions, which
needs the cells several pixels apart rather than touching. The ramp is 2.5 to 10
pixels, and it was set by looking at the pictures. A specimen framed whole now
shows its cells and its veins; walk in and the pumps come up — which is the ramp
the close-up has always used, arriving at the same place from a different
direction.

### The instrument that was still wearing the species' colours

`field` claims to discard the species palette: auxin on one ramp, no bloom, no
grade, and two species looking alike because a species is only a parameter set.

Counting the colours actually in the point buffer for a garden in that view:
3,380 of 36,049 were warm. `fruitCells` was carrying `pal.fruit1` — a species'
own ripe red — into the ramp, because ripeness felt like data and therefore
felt allowed.

It is data, and that is exactly the objection. Ripeness and auxin concentration
are two different fields, and putting one on the colour ramp that is measuring
the other is the thing an instrument must not do. `ripeTint` is zero in `field`
now, so a ripe fruit and a green one look alike in there. **A view that displays
two quantities on one channel is not more informative than one that displays a
single quantity; it is less.**

The general lesson is narrower than it looks: nothing here was a rendering bug.
Every one of these four was a claim that had drifted from what the code did, and
three of the four were caught by writing the claim down as an assertion or a
count rather than by looking at a picture. The fourth could only have been caught
by looking.

## Falsified: a narrow blade does not canalise parallel venation (2026-07-30)

The question was whether the piece could grow **grass** — and grass is worth asking
about for a reason better than wanting a lawn. Grass is a **monocot**, so it is the
sharpest available test of the claim README leads with: one engine, `stepAuxin()` on
any topology. If reticulate and parallel venation are the same solver under two
boundary conditions, that is a real result. If they are not, that is a limit on the
claim and worth knowing.

**The cheap hypothesis was that narrowness does it.** A monocot leaf is a strap; a
strap has no room for a net; therefore canalisation on a narrow blade should give
co-equal longitudinal bundles. It costs nothing to test, because slenderness is
already a species knob.

### Getting a strap at all was the easy half

`ay` — mediolateral growth, `25_margin.js` — is already in the species table at
0.62–1.12. At 0.03, with the margin's own wavelength shortened (`D` 7.0 → 1.2,
`T` 26 → 52) so the teeth come out fine rather than coarse, the margin grows to
**aspect 0.47 → 0.07, about 14:1, with 128 teeth against 39.** No new code.

One thing that fell out on the way and is worth keeping: **outgrowth in this engine
IS convergence.** The obvious way to get a grass's smooth edge is to turn down `g1`,
the extra outgrowth where auxin has converged. Do that and the blade does not become
smooth, it *does not grow* — 17 points, length 0.08, against 618 and 5.64. `g0` alone
is not a blade. So an entire margin has to come from making the wavelength short
enough that the teeth merge, which is the same "however many fit" argument the lobe
count already runs on. The rule survives; it just constrains the route.

### The venation is where it died

`test/venation.mjs` was written for this and is kept. It measures the thing that
actually separates a monocot from a dicot, which is not the silhouette:

- **axial** — traffic-weighted share of vein running up the blade rather than across.
- **n50 / top** — how many walls crossing mid-blade carry half the traffic crossing
  it, and the largest one's share. A midrib is one strand doing most of the work.

Eight seeds, dicot control against strap:

| | dicot n50 | dicot top | strap n50 | strap top |
|---|---|---|---|---|
| mean | 2.5 | 0.35 | 2.9 | 0.286 |
| range | 1–4 | 0.197–0.789 | 2–4 | 0.21–0.39 |

**No effect.** The dicot's higher mean is one outlier (seed 41, top 0.789); without
it the dicot sits at 0.288 against the strap's 0.286. A narrow blade makes the same
reticulate hierarchy with fewer bundles in it.

### Two traps on the way, both caught by a control

**The first metric was unreachable by construction.** "Fraction of vein within 20° of
the long axis", measured in material coordinates, reported 0.00–0.03 for every dicot
ever grown — which looked like a strong reticulate signal and was arithmetic.
`_link` joins each cell to (same row, next col) and to two diagonals; there is **no
pure along-blade link**, so the most axial segment a vein can be made of is already
~40° off axis. Measured in lattice units instead, where a diagonal is 26.6° and a
cross-link is 90°, the same dicots read 0.59–0.79. *A metric with no reachable
maximum will happily report a result.*

**The second nearly shipped as a discovery.** `domin` — fattest crossing vein over
the median — came back **1.34 and 1.25 for straps against 3.42 and 6.52 for dicots**,
which is exactly what parallel venation would look like. It does not survive. It is
computed on the baked vein list, so it inherits `veinFrac`, `veinFloor` and
`veinMax`; both morphologies were clipped at `veinMax: 260`, and the strap's network
is proportionally denser (0.98 veins per cell against 0.65), which flattens the ratio
for free. Asked of raw wall traffic with no threshold, the difference is gone — and
two more seeds put the strap at 2.69 and 2.12, inside the dicot range. Two seeds and
a threshold-dependent statistic is not a finding.

### Why it fails, and what that says about grass

The blade canalises **once, on tissue that is already its final shape**, with sources
ringing the margin and the sink at the base. That is a radially convergent problem,
and a radially convergent problem has a midrib at any aspect ratio. Narrowness
changes how many bundles fit, not what kind of network forms.

And **stretching cannot rescue it.** The tempting next move is to canalise on a short
blade and then extend it, since material coordinates are normalised and the drawn
aspect is just a map. But `n50` and `top` are statistics of *traffic*, and traffic is
invariant under a coordinate stretch. Stretching would change `axial` — the look —
and provably not the hierarchy. If you want co-equal bundles you have to change the
patterning, not the drawing. Worth writing down because it kills an afternoon's work
in one line.

Real parallel venation is not a different patterning event. The strands are laid down
early and then **extended by an intercalary meristem at the base** — tissue inserted
low and pushed upward, which is why mowing works. This engine has no basal growth
zone; `baseGuard` explicitly *holds* the base still while the margin expands along
its normals.

**So grass needs the intercalary meristem, and that conclusion arrived from two
independent directions in one sitting** — from the silhouette (a strap is extruded,
not expanded) and from the venation (bundles are stretched, not patterned narrow).
Two unrelated lines landing on the same missing mechanism is a much better reason to
believe it than either alone.

That is not a small piece of work, but it is not a spatial prior either: it is a
boundary condition on where tissue is inserted, which is the same `stepAuxin` on a
different topology. Whether it is worth it is a scope question rather than a research
one — and the phyllotaxis half is the real risk, because grass is **distichous**,
strict 180° alternation, and four apex sizes were swept here with the spread staying
near 90°. A grass would wear this project's headline limitation more visibly than any
current species, since two-ranked leaves are an instantly recognisable signature and
random angles read as wrong rather than as variation.

## The conifer's cone is emergent in shape and 2-4x too fat in slope (2026-07-30)

ROADMAP 13 step 1 says nothing else starts until the silhouette is pre-flighted on
paper. It has been, and then checked against the solver in `test/conifer.mjs`. The
answer is split, and the split is the useful part.

**Claim 1's structure is confirmed.** A bud escapes at a fixed distance below the apex,
so a bud at arc position `a` on the leader has been growing for exactly as long as the
leader has taken to climb from `a + d_esc` to its present height. Branch length is

```
L = k * (A_fin - A_esc)
```

— **linear in the arc position of the bud, hitting zero a fixed distance below the
apex.** That is a straight-sided cone and nothing draws it. Measured over 36 laterals on
the shipped defaults: **R2 = 0.9988**, and R2 stays at 0.976-0.999 across a 4x sweep of
`internode`. The lowest branch is 2.89x the middle one. Apical dominance really does
produce a taper on its own, which is the thing worth knowing.

**The slope is wrong, and it is not tunable.** The entry expected the `0.72` at
`40_plant.js:138` to set the taper. It does not, because that penalty multiplies only
`rate` — the tip's own extension — while `elongate()` stretches the subapical zone,
carries no generation penalty at all, and **overwrites `this.length`**. A fixed window
of arc stretching at `internode` and decaying over `internodeSpan` contributes
`internode * internodeSpan` per unit time to leader and lateral alike, so

```
V0 = E + I*S          V1 = gamma*E + I*S          k = V1/V0
```

On the shipped defaults `I*S = 0.0187` against `E = 0.0052` — **stretching is 3.6x the
tip's own extension** — so k = 0.939 rather than 0.72. Measured slope 0.904, and across
`internode` 0 / 0.0018 / 0.0072 / 0.020 the formula tracks to within 4-6% every time.

The consequence is the whole finding: **k is bounded in (gamma, 1) for any species.**
`internode: 0` reaches the floor of 0.72 exactly and nothing reaches below it, because
gamma is hardcoded and shared by all eight species. Converting that to a silhouette with
the measured `zeta = H/A = 0.919` (a stem wanders, so its height is not its arc length):

| | crown half-angle |
|---|---|
| **measured, off 36 branch tips** | **73.9°** |
| closed form at measured k and θ | 75.3° |
| closed form at floor k 0.72, same θ | 48.8° |
| closed form at floor k 0.72, horizontal branch, straight stem | 35.8° |
| **a Norway spruce** | **8-15°** |

So the cone is emergent in shape and far too fat, with no parameter in reach of the
difference. ROADMAP 13's own contingency applies: this is bigger than a day, and the
gate is the slope rather than the shape.

### Then it was drawn, and the drawing said something the numbers had not

Four sections of numbers agreed with each other and with a closed form, and all of them
missed this. An ASCII crown profile — the idiom `test/margin.mjs` and `test/fruit.mjs`
already use — showed the crown is **widest at the top.** It is a vase, not a cone, and
it is not even the right way up.

The cause is a term that appears nowhere in the taper argument. Every axis is pulled
toward vertical every step, with **no generation term anywhere in it**:

```js
40_plant.js:141   const want = v3(0, 1, 0);   // plus wander/nutation
40_plant.js:150   v3lerp(this.dir, this.dir, want, clamp(sp.tropism * dt, 0, 1))
```

At `tropism: 0.02` a branch's initial direction decays with a time constant of **50
steps**, and a branch then grows for thousands. So the hardcoded `0.45` lerp toward
vertical is not a branch angle at all — it is an initial condition that is immediately
forgotten. Measured: nominal 50.7°, actual mean **25.0°**, and the eight longest (oldest)
branches sit at 26.8° against the eight shortest at 31.0° — the older the branch, the
more completely it has been pulled up.

That inverts the crown. A long lower branch curving toward vertical puts its tip near the
**top** of the crown rather than out to the side, which is exactly what `ζ − k·cos θ`
does as θ → 0: the denominator collapses (0.919 − 0.819 = 0.100 on the shipped numbers)
and the envelope goes nearly flat-topped.

**So there are two obstacles, and the entry names neither.** A conifer's laterals are
**plagiotropic** — they hold a near-horizontal set point for life. Every axis in this
engine is **orthotropic**. The length taper is real, confirmed, and emergent; it does not
become a conical silhouette because nothing holds a branch out.

This is also the clearest case yet for the project's own rule about looking at the thing.
Four numeric sections, one closed form, a 4× parameter sweep and an R² of 0.9988 all
passed while the specimen was the wrong shape *and upside down*. The drawing took about
ten lines.

### The obvious fix is a dead end, and it is killed on paper

The first thing anyone reaches for next: `suppressed = exp(-d/dominance)` is already
computed and used as a *binary* gate, so make it a *continuous* multiplier on lateral
elongation. That is apical control rather than apical dominance, it is the textbook
distinction, and it is the right biology for a conifer. It is also wrong here:

```
L(a) = integral V1 * exp(-(A(t) - a)/lambda) dt  =  k*lambda*[beta - exp(-(A_fin - a)/lambda)]
```

with `beta = exp(-d_esc/lambda)`. The exponential vanishes for any bud more than about
`3*lambda` below the apex, so **L tends to the constant `k*lambda*beta`** — 1.70 on the
shipped numbers. Every lower branch ends up the same length: a bottlebrush. The
lowest/middle length ratio goes from 2.89 to **1.09**, so the mechanism reached for to
steepen the taper removes it. Section 4 of `test/conifer.mjs` prints the profile. This
one is derivation, not measurement, and is labelled as such in the file — but it is a
closed form over an escape rule section 1 measured, so it is worth a day of not building
it.

### Four things found on the way, all of which cost time to see

**The closed form for the crown angle was wrong, by a margin too small to notice.** It
had the branch's own extension multiplied by `zeta` — the *leader's* arc-to-height
factor, which has no business acting on a branch. Correct is

```
r = k*u*sin(theta),   z = z_top - u*(zeta - k*cos(theta))
half-angle = atan( k*sin(theta) / (zeta - k*cos(theta)) )
```

against the shipped `zeta*(1 - k*cos(theta))`. The difference is **2-4°** — far too small
to look wrong, big enough to be wrong, and it went into a written-up table before
re-deriving caught it. The section now **measures** the envelope off 36 real branch tips
and keeps the closed form as a cross-check that must agree within 6°. That ordering is
the lesson: derive it, then measure it, and let them argue.

**A harness that compares an arc length to a height is measuring `wander`.** The first
run fitted `axis.length` (arc) against bud *height* and got a slope of 1.13 where the
prediction was 0.94, and at `internode: 0.02` an **inverted** taper with R2 = 0.95 —
long branches at the top. Both were the missing `zeta`, and the inversion also had the
buffer bug below in it. Fitting arc against arc, the error went to 4%. A clean
systematic error with a high R2 is the most convincing wrong answer available.

**`pts` silently truncates and takes `length` with it.** `40_plant.js:168` drops the
oldest point past 900, and `this.length` is recomputed as the arc of what is left — so
past `900 * segLen` of growth **an axis's arc length stops being measured from its
base**, and `org.birthLen` advection loses its floor with it. The harness now caps its
step count under that limit and says so. This matters for ROADMAP 13 specifically: a
conifer wants a tall leader carrying tens of branches, which is exactly the regime that
crosses it.

**Branches undershoot k by a systematic 4-5%,** in every sweep row, same sign. That is
the subapical zone: a branch shorter than `internodeSpan` has less than a full window to
stretch, so young laterals get less than `I*S` until they outgrow it. It is a transient,
it decays, and it is not worth modelling — but it is why the tolerances are 10-12% and
not 3%.

### What this means for ROADMAP 13

Step 2 (the needle) is untouched by any of this and is still cheap — it is a leaf
option, and `test/venation.mjs` already showed `n50 = 1` on a narrow blade. Step 1 is
what is blocked, and it turns out to be blocked **twice**, on two independent terms
neither of which the entry names:

1. **The taper slope.** `k` is floored at the hardcoded `0.72`, and a spruce needs about
   0.2. The specific question is *what sets a lateral's elongation rate, if not a
   hardcoded constant?* The entry's instinct is right that the answer should **delete** a
   constant rather than add eight. The candidate worth pre-flighting next is supply: the
   engine already grows every axis a radius by Murray's law, and the pipe model that
   sized the petiole in #7b is the same argument one level up. That is a feedback loop —
   a thinner branch grows slower, so bears less, so stays thinner — which is how a real
   tree does it, and which is a research question and not an afternoon.
2. **Orthotropy.** Nothing holds a branch out, so the crown inverts. This is the *larger*
   of the two and it was invisible until the thing was drawn. It is also the one with a
   clean route: plagiotropy is a set point on `want`, not a new constant on the escape,
   and gravitropic set-point angle is real, well-documented biology with the
   force-balance machinery from #7b already in the tree to hang it on. **Note this
   supersedes the entry's second obstacle** — the hardcoded `0.45` lerp is not worth
   deriving, because tropism forgets it in fifty steps. Deriving an initial condition
   nothing remembers would have been a wasted day, and that was the entry's plan.

The ordering matters: fixing `k` alone makes a narrower vase, and fixing plagiotropy
alone makes a wide flat cone the right way up. Neither on its own is a conifer.

## Falsified: gravity cannot hold a branch out, and the hidden variable is the wood (2026-07-30)

> ### ⚠ CORRECTED THE SAME DAY — READ THIS BEFORE THE ENTRY
>
> A literature sweep ([research_7_30_26.md](research_7_30_26.md) §2.1, §2.3) came back a few
> hours after this was written and corrects it in three places. **The conclusion survives;
> the reasoning behind it was backwards, and the closing recommendation was wrong.**
>
> **1. "Gravity collapses a branch" is not what the numbers said.** They ran only at
> `E = 60 MPa`, which is herbaceous. A whole living conifer *branch* with bark is
> **0.7-4.6 GPa** — and note that is not stem wood either (~8.5 GPa), because branch
> microfibril angle is 41-53° against 10-20° and MFA dominates axial stiffness. The
> "8-11 GPa" quoted below is the wrong figure for a branch. Use 1-4 GPa, central 2.
> (Cannell & Morgan 1987; Hartwig-Nair et al. 2024.)
>
> **2. "φ = 268°" was never an angle.** Past about 30° a small-deflection formula stops
> reporting a deflection and starts reporting how badly it has been violated. The file
> carried that caveat and the write-up then ignored it. Published large-deflection elastica
> for real conifer branches at 2 GPa give **16.8-26.6° below horizontal with foliage, and
> 3.5° for bare wood.**
>
> **3. So the sign of the argument inverts.** A woody lateral held horizontal is **near
> mechanical equilibrium** — it droops, and the drooped shape is normal rather than a
> failure. **Mechanics *preserves* horizontal, which is exactly why it cannot *supply* it.**
> "Gravity overwhelms stiffness" was never a coherent thing to conclude: a cantilever
> statics problem always has an equilibrium.
>
> **4. And the closing recommendation is falsified.** This entry ends by saying a conifer
> needs GSA and that GSA is an imposition to be argued into SCIENCE.md. **It is not.** The
> antigravitropic offset is auxin-dependent and resolves to per-wall PIN polarity — which
> this engine already has — so branch angle is **derivable**. The direction is
> counterintuitive: **more auxin → more vertical.** See §2.3, and ROADMAP 13.
>
> What survives intact: the force-balance route ROADMAP 13 proposed does not work, an
> active set point is required, and the shipped catalogue is herbaceous. Carry
> **Γ = ρgL³/(Ed²)** instead of a raw slope — measured 0.633 here, and Γ ≳ 0.5 (herbaceous,
> needs a dynamic controller) versus Γ ≲ 0.1 (woody, static set point plus droop) is the
> number that decides the architecture.

ROADMAP 13 names the route to plagiotropy: *"Do not add `sp.branchAngle` — a branch's
angle is where its own weight balances its stiffness, and `39a_stem.js` already computes
that."* Pre-flighted in `test/plagio.mjs` on the radii the engine actually grew, before
writing anything. **It does not work, and it fails in the opposite direction to the one
expected.**

### Gravity does not hold a branch out. It collapses it.

For each vegetative lateral on the shipped catalogue, the cantilever tip slope **held
horizontal** — the only honest way to ask the question, because evaluating at the grown
angle is circular when `sin θ → 0` *is* what vertical means:

| species | L (m) | r (mm) | f1 (Hz) | φ at horizontal |
|---|---|---|---|---|
| Hoarfrost Thicket | 0.66–1.20 | 9.6–16.3 | 0.87–1.67 | 16–33° |
| Sun Coral | 1.69–1.72 | 16.9–17.4 | 0.45 | 85–86° |
| Cathedral Fern | 1.80–1.82 | 17.2–17.3 | 0.40 | 100–106° |
| Spiral Ossuary | 2.52–2.61 | 18.6–19.1 | 0.21 | 233–249° |
| Abyssal Frond | 2.56–2.59 | 18.3 | 0.21 | 260–268° |

Median **100°**, and 8 of 11 past 45°. Linear beam theory is an upper bound past 0.45 rad
so those are not literal angles — but even the stiffest branch in the catalogue is at 16°,
which is nowhere near "gravity is a restoring term you can balance against". **There is no
equilibrium near horizontal to find.** A branch released at any angle folds down.

Checked before believing it, because φ goes as L³ and the conifer pre-flight had already
been bitten once by an arc/height confusion: **arc/chord is 1.06–1.15**, so the branches
are not coiling and the lengths are real. They are also startling on their own — a lateral
runs 1.7–2.6 m on a plant 0.5–1.5 m tall, i.e. **longer than the whole plant**, because
the leader arrests at flowering while laterals keep going. That is the same k ≈ 0.94 from
the taper pre-flight seen from the other end.

The parameter-free form was kept as a cross-check on two independent expressions and they
agree to **0.00%**:

```
phi_self = 0.05219 * g * sin(theta) / (f1^2 * L)
```

No material constant survives in it, exactly as `delta = 1.545 g/omega^2` does not for the
whole-stem sag. That is the same trap one level down — and here it is what makes the
result inescapable rather than tunable.

### The hidden variable was never the geometry. It is the wood.

`E = 60 MPa` is a **herbaceous** modulus — a soft green stem — and it is correct for all
eight shipped species. A conifer is **woody**: softwood along the grain is 8–11 GPa, some
150x stiffer. φ goes as 1/E and f1 as √E, so stiffening buys droop against sway at a fixed
exchange rate:

| E | φ at horizontal | f1 | |
|---|---|---|---|
| 60 MPa (shipped) | 100° | 0.41 Hz | collapses |
| 300 MPa | 20° | 0.92 Hz | holds out, sways like a plant |
| **1200 MPa** | **5.0°** | **1.84 Hz** | **holds out, sways like a plant** |
| 6000 MPa | 1.0° | 4.11 Hz | holds out, sways like a plant |
| 10 GPa (real softwood) | 0.6° | 5.31 Hz | holds out, but vibrates |

**There is a window around 1–2 GPa** where a lateral both supports itself and still sways
at a plant-like rate. And `sp.stemOpts` already reaches `eModulus` — Bend is constructed
with it — so this needs no engine change at all, only a species entry.

### What this does and does not solve

Stiffness lets a branch *hold* an angle. It does not *set* one, and that is the part with
no derivation behind it:

- **`want` is vertical for every axis** (`40_plant.js:141`), leader and lateral alike, and
  `tropism` drags laterals up at a 50-step time constant regardless of stiffness. Woody E
  changes nothing about that.
- **One constant here is deletable and worth deleting anyway.** The launch direction is
  `v3lerp(dir, org.frame.x, v3(0,1,0), 0.45)` — the subtending organ's own frame, lerped
  45% toward vertical. `org.frame.x` is *emergent* (phyllotaxis and `organTilt` grew it);
  the 0.45 is not. Setting it to zero means a branch launches along the leaf in whose axil
  it arose, which is both real and one fewer stated number.
- **But a set point is still a set point.** Real plagiotropy is gravitropic set-point
  angle, and GSA is a genuine, tabulated, species-level biological quantity, not a shape
  dial. There is no way to derive it from anything in this tree — four routes were
  considered and all of them either collapse (the force balance, above), invert the taper
  (continuous apical control, the 2026-07-30 conifer entry), or reduce to the same set
  point wearing a different name.

So the honest position: **a conifer needs GSA, and GSA is an imposition.** The argument for
paying it is `39_fall.js`'s precedent — a hand-picked constant was replaced by *looked-up
leaf mass per area*, and the measured value was better than the chosen one. GSA is the
same kind of number. But it is an addition to SCIENCE.md's "what is imposed" list, and
that list is supposed to be argued for rather than slipped in. **That decision is not the
harness's to make.**

### The smaller finding, which is real regardless

`39a_stem.js:66-69` says the grown shape *is* the static equilibrium, so the rest shape
"carries gravity" and the solver need only handle deviations. **Nothing ever put gravity
into the grown shape.** Growth is purely tropic — `want` is vertical and weight appears
nowhere in `40_plant.js`. For the leader that is harmless, because a vertical beam has no
bending moment from its own weight and `sin θ ≈ 0` does the work. For a lateral at any
angle at all it is not harmless, and this measurement puts a number on how not: the term
that was assumed spent is the dominant one.

## The taper belongs to the fruit, not to Murray's exponent (2026-07-30)

ROADMAP 14 arrived from the literature sweep as "the cheapest fix available": Murray's
law is measured to hold only *"as long as they do not function additionally as supports
for the plant body"* (McCulloh, Sperry & Adler 2003, Nature 421:939-942, quote verified),
`Axis.updateRadii` applies `r³` to every axis, therefore **"we are over-tapering every
trunk in the garden."** One line, no new machinery, changes all eight species.

It was pre-flighted before it was written, per the norm, and the pre-flight came back with
three things — one of which says the entry's premise is backwards, and one of which is a
bug in code that ships.

### 1. The trunks are barrels, not spikes

Measured on the shipped catalogue at 5200 steps, the leader taper `r0/rTip` is **1.33 to
1.63 across the whole height**. A real 1 m herbaceous stem tapers more like 5-8x. The
defect is real and it is **under**-tapering; "over-tapering" describes the opposite plant.

The *direction* of the proposed fix survives — lowering the exponent thickens the base
relative to the tip — and the reason given for it does not. That distinction mattered,
because the reason is what predicts the size of the effect, and the size turned out to be
the whole question.

### 2. The exponent rescales the profile and cannot bend it

`updateRadii` was reparameterised so the exponent is the only thing that moves:

```
r(s) = tipRadius · (1 + X(s)/tipRadius³)^(1/p) · radiusScale
```

with `X(s)` the traffic in `r³` units. At `p = 3` this is algebraically identical to what
shipped — `conv = tipRadius⁰ = 1` — so the change is a bit-for-bit no-op at the default,
which is why the gate stayed green through it.

Written that way, two things follow on paper and both were then measured:

- `taper(p) = taper(p₀)^(p₀/p)`. A stem that tapers 1.54x under Murray tapers 1.91x at `p = 2`.
- **The normalised log-profile does not depend on `p` at all.** Changing the exponent
  rescales the profile in log-radius; it cannot change its shape.

`test/taper.mjs` asserts both, and after the bug in §3 they hold to **4e-16** — floating
point. The second is the load-bearing one: **no exponent turns a barrel into a stem.**
Only the traffic field `X(s)` can, and that is a claim about what the plant carries rather
than about what its wood is made of.

Measured, `p = 2` moves the mean taper 1.50 → 1.84. It also inflates every radius ~2.4x,
so holding `EI` — and so the sway the stem solver was tuned for — costs a `radiusScale`
re-anchor of 0.410-0.440 per species. **A 23% lever, bought with a re-anchor, on a 4x
problem.**

### 3. And the traffic field is dominated by one tuned constant

The thing that actually flattens the trunks:

```
leader taper r0/rTip                                        MEAN
  shipped                    p=3                            1.50
  p=2                                                       1.84
  fruitFlow = 0              p=3                            4.10
  fruitFlow = 0              p=2                            8.47
  fruitFlow = 0, thicken = 0 p=3                            3.54
```

**Removing the fruit sink moves the taper 173%; the exponent moves it 23%.** `fruitFlow`
is 0.0060 against a `tipRadius³` of 1.25e-4 — a floor **48x** the tip's own baseline,
added at *every* station of a fruiting axis. Adding a constant to both ends of a ratio
compresses it toward 1, so a large uniform sink flattens the stem by arithmetic.

Against age, it is sharper still:

```
  leader taper, Cathedral Fern:   800 → 4.55     1600 → 1.54*    5200 → 1.54*
                                                      (* = fruiting)
```

**The plant grows a properly tapered stem, sets fruit, and the stem becomes a barrel in
one step and stays one.** Seven of eight species taper 3.9-4.8 before fruit set. The
eighth (Nightglass Parasol) fruits before the first sample and is a barrel throughout.

Is it *wrong*? Not obviously: a terminal fruit really is drawn through every station below
it, so a uniform addition is the pipe-model-correct thing to do, and a stem under a heavy
terminal load really is more cylindrical. What is wrong is that **`fruitFlow` has no
provenance.** It is not in TUNING.md, it was never swept, and it is currently the single
largest determinant of the silhouette of every mature stem in the garden. Murray's
exponent — which has a paper behind it — is a minor term next to it.

### Verdict

`radiusExp` ships at **3**, its measured-in-non-supporting-conduits value, documented as a
knob rather than a constant, with the McCulloh exception quoted at the line. Moving it was
not done, because the measurement says it is a small lever on the wrong variable and it
would have cost a re-anchor of the stem solver's inputs to buy 23%.

So ROADMAP 14 is **not** the cheapest fix available. It is a real correction to a minor
term. The cheap fix it was standing in front of is `fruitFlow`, and that is a tuning
question with a look attached, which is a different kind of question and belongs to a
different branch.

The general shape of this is one the project keeps rediscovering: **a sourced correction
to a named mechanism is not automatically the biggest term.** The literature said the
exponent was wrong and the literature was right. It was also worth 23%.

### The bug the pre-flight found, which is the part that shipped

One species missed the closed form by 2.8% when every other species hit it exactly. Chased
rather than tolerated, because a closed form that holds for seven of eight is not a closed
form.

`Plant.stepBend` calls `updateRadii` a **second** time, after the bend, and says why:
*"rebuild the frames off the shape that will actually be drawn, so organs, blades and
shed-blade snapshots all ride the bent stem."* That is right for the frames. But
`updateRadii` does two jobs in one function, and the other job is sizing the stem — which
it does by walking `arc`, measured off `this.pts`, against `org.birthLen`, which is an
odometer reading on the shape **growth** produced.

So the shipped radii were measured along the *bent* polyline against a *rest*-shape ruler.
Bending is near-inextensible, so the two agree to about **1.5 ppm** — and that is still
enough to carry an organ across a station boundary and step that station's radius by one
organ's worth of flow. Measured at **1.87%** on the last station of Abyssal Frond and
exactly 0.000% everywhere else: a knife-edge coincidence, not a bias.

It is small and it was never going to be visible. It is also a stem whose **thickness
depends on how hard the wind is blowing**, which is not a thing a stem does. `arc` now
comes off `this.rest` when it is available; the frames still come off `this.pts`, which is
the entire reason for the second call. Pose-dependence is 0.000% on all eight species
afterwards, and the closed form went from 2.8% to 4e-16.

**Two lessons, both already in this file in other clothes.** A tolerance loose enough to
pass would have hidden it — the assertion was written at 2% first, and 2% is exactly the
band the bug lived in. And it was only visible at all because the prediction was worked
out *before* the solver ran: seven species agreeing with each other says nothing, seven
species agreeing with arithmetic and one not is a bug report.

## A conifer, and what it cost: one derivation, one stated number, one falsification (2026-07-30)

ROADMAP 13's two blockers, built and measured. The harness is `test/tree.mjs` and it
follows the norm the pre-flight established the hard way — derive it, then measure it,
then draw it, and let the three argue.

### Blocker 2, the angle: DERIVED

The pre-flight's verdict was that the silhouette was a vase and upside down, because
`want` was vertical for leader and lateral alike and `tropism` erased a branch's launch
direction in fifty steps. The fix is not an angle. It is a fixed point.

A ring of statocyte walls. Gravitropic PIN follows sedimenting statoliths to whichever
wall is lowest; an opposing constitutive carrier sits on the upper wall and does not
know the angle; the set point is where the two fluxes cancel. Auxin sizes the second
one, in the direction the literature insists on and that inverts everything if you get
it backwards: **more auxin, more vertical.**

    the wall sum against its own integral, 4096 walls      3.33e-16
    gsaOf(ago) against asin(ago) at 16 walls               0.000 deg
    the set point across 4 -> 256 walls                    moves 0.0000 deg
    tip directions against the set point, 47 laterals      64.5 vs 65.1 deg
    mean branch angle from vertical                        58.4 deg (pre-flight: 25.0)
      ... lowest quarter of the crown                      63.3 deg
      ... highest quarter of the crown                     52.9 deg
    crown half-angle, off 47 branch tips                   9.5 deg (spruce 8-15)
    widest crown quarter, bottom to top       15.69 / 9.16 / 6.21 / 2.00

**Nothing in the code writes `sin(theta)`.** The angle enters once, as the component of
gravity acting across the axis, because that is the only part statoliths can press a
wall with. The sine law falls out of a projection. That is checkable and it is checked.

**And the leader stays orthotropic with no flag.** An offset is a push away from
vertical *in some direction*; an axis launched straight up has no dorsiventral plane to
be pushed in. That is the clinostat result — outward curvature unmasked in laterals,
"never observed in primary shoots" — read forwards rather than asserted.

### Blocker 1, the vigour: STATED, but with a zero point

`0.72` at `40_plant.js:138` is gone. So is the reason the pre-flight found the taper
slope floored at 0.94 rather than 0.72: `elongate` stretches the subapical zone at 3.6x
the tip's own rate and carried no generation penalty at all. Both read `Axis.vigour`
now.

What sets it is the Borchert–Honda partition's first-order term. At a fork the density
ratio is exactly `(1-L)/L` whatever the two capacities are — the flux terms cancel — so
a branch apex extends at that fraction of the apex dominating it.

    every lateral against (1-L)/L, five values of L        exact to 1e-9
    L = 0.5 is unbiased: every apex at the leader's rate   1.000000
    taper   L = -0.2146 * A_esc + 16.75                    R2 0.9805
    closed form for L = 0.80                               0.25

L is still a stated number. It is a better one than 0.72 was — it has a published name,
a meaning, and a zero point at 0.5 that a test can check, which is why all eight
shipped species came through this unchanged organ for organ — but nobody has derived it
and the sweep says so.

### THE FALSIFICATION: the full flux partition, run because nobody had

The interesting part. `research_7_30_26.md` §1.6(i) proposes substituting subtree auxin
flux for light in Borchert–Honda and notes that nobody has published it: "an empirical
question you can answer in your own engine faster than the literature can answer it for
you." So it was built. It is wrong, and it is wrong in a way that is worth keeping.

The leader takes more than its proportional share at every fork, so **the density in
the leader rises as it climbs**, and a branch attached higher taps a richer stream:

    lowest five branches, mean vigour                      0.031
    highest five branches, mean vigour                     0.201
    resulting taper slope                                  0.048
    the same L, first-order only                           0.215

A 6.5x taper of *rate* pointing the opposite way to the taper of *time* that makes the
cone. At L = 0.845 it cancels it outright — R2 0.033, lengths 1.8-3.5 on a leader of
86, a bottlebrush. At L = 0.80 a taper survives with a fifth of its slope.

**The criticism is precise rather than a shrug, and that is what makes it useful.**
Borchert–Honda is stated for a *binary* tree, where an axis forks once into two. A
monopodial leader carrying two dozen laterals is not that topology, and running the
pairwise rule two dozen times in series compounds a five-percent per-fork bias into a
fourfold one. The first-order term survives that criticism. The product does not.

It ships disabled behind `fluxPartition` and `test/tree.mjs` section 3b turns it on, for
the same reason `rhoI: 0` keeps the dead second inhibitor and `38_shoot.js` keeps the
whole-plant stream: a negative result you cannot re-measure is just a story.

### Two bugs that only a non-vertical axis could expose

Both had been sitting there since the beginning, invisible because every axis was
vertical and both are exactly right for a vertical axis.

**Wander and circumnutation were world-framed.** They were added straight into
`want[0]` and `want[2]`. On a near-vertical `want` that is a tilt, which is what they
are for. On a branch holding 80 degrees off vertical the same offset swings the
*azimuth*. They are applied in the plane across `want` now, and for a vertical `want`
this reproduces the old vectors exactly — the catalogue does not move.

**And the azimuth was a random walk.** `want` took its vertical plane from the current
tip direction, so any azimuthal drift was remembered and built on. Gravity only ever
argues about elevation; there is no restoring term sideways. Measured: a branch holding
a correct 59-degree elevation the whole way up while its azimuth turned a full circle
every nine segments. It climbed 5.2 units and went out 0.2. An axis remembers the
vertical plane it grew out in now, which is the axil's own azimuth and is emergent.

**The lesson is the general one.** Neither bug is a mistake in the old code — both are
correct for the only case that existed. A new body plan is a way of finding the places
where a general-looking mechanism was quietly special-cased, and it found two in one
afternoon.

### What the tree cost, measured in a real browser

The garden had never been watched at framerate, which CLAUDE.md said in as many words.
It has been now, and the answer is not what the roadmap assumed:

    one conifer alone, grown                     45-61 fps
    a garden of eight with two conifers          25-28 fps
    simulation, all eight, per step              5.89 ms
    ... and the same fps in every render view, and with the vein cull switched off

So once a stand is grown it is **neither simulation-bound nor line-bound** — it is the
per-organ CPU work in the geometry build, which is identical across all four views.
ROADMAP 11 (instancing) and 10b (cheaper background simulation) both aim slightly off
the actual bottleneck. A conifer makes it visible because it carries five times the
organs of a herb.

One overflow found and fixed on the way: 620 needles each got a frond's 17x9 mesh and
dropped 317,000 triangles, which the buffer said out loud because a full buffer stopped
being silent. Blade meshes now obey two conservations — never finer than the tissue, and
quads per unit of drawn blade area held constant. A garden of eight went from 279,620
triangles saturated to 81,804 at 29% occupancy, and the natural view from 97.7 ms to
44.3 ms.

## The Charlie Brown tree: a hardcoded coin flip, and two things that were not the problem (2026-07-31)

AJ, watching the ninth species: *"much too sparse. they're some real charlie brown
xmas trees. I think that's the main thing visually."* Which is the third time a person
watching for a few seconds has beaten the harnesses to a real defect — every number in
`test/tree.mjs` and `test/conifer.mjs` was green, the crown half-angle was inside the
Norway spruce band, and the specimen still read as a bare pole with tufts stuck to it.

**The first two diagnoses were both wrong, and both were wrong in the same way** — a
metric that moved with the thing it was measuring.

**Wrong diagnosis 1: not enough organs.** The census said `organBudget: 540` bound
*exactly* — 540 of 540, with the leader taking 80 of them at `maxOrgans`. Obvious cure,
obvious result: raising it to 1200 or 2400 both produced the same 1013 organs, because
laterals were **internode-limited**, not budget-limited (a 3.79-long branch at
`minInternode: 0.12` holds 31.6 organs, measured 32.2).

**Wrong diagnosis 2: no second-order branching.** A spruce bough is a flattened spray of
sub-shoots and ours was a bare stick, so `maxGen: 2` looked like the whole answer. Built,
measured, **falsified**: fill 0.281 -> 0.268, i.e. slightly *worse*, for 4.8x the
simulation cost. At `maxGen: 3`, 0.311 for 6.7x. Sub-branches grow the crown's silhouette
exactly as fast as they fill it, so the ratio does not move. **Do not rebuild this.**

> ## ⚠ RETRACTED 2026-08-01. THIS ONE WAS NOT A WRONG DIAGNOSIS — IT WAS THE RIGHT ONE, KILLED BY THE BROKEN RULER.
>
> Read the paragraph immediately below this box, which was written on the same day as the
> one above: needle area over silhouette area "came back **0.28 for every variant
> including ones that plainly differed**". Then read the three numbers that rejected
> second-order branching — **0.281, 0.268, 0.311.** They are that metric's signature
> value. Every fill number this project quotes today comes from the raster metric that
> replaced it, and they live at 0.51-0.77. **The retraction was written one paragraph
> after the result it invalidates, and neither this entry nor TUNING noticed for a day.**
>
> `maxGen` was also never added to `test/crown.mjs`'s sweepable knob list, so the
> instrument built to replace the broken one had **never been pointed at the one change
> the broken one killed.** Fixed in the same PR.
>
> Re-measured properly, two seeds, both arrested:
>
>     maxGen  axes  organs  height  crownR  blade area  fill @3840
>       1       77    1201   46.06    6.87       672.9      0.7721
>       2      240    3002   46.06   11.53      1702.3      0.7361
>
> Fill falls 4.7% while **crown radius nearly doubles and blade area goes up 2.5x, at
> identical height.** The sentence above — "sub-branches grow the silhouette as fast as
> they fill it" — is arithmetically *true* and beside the point. Fill is ink over the
> crown's **own** outline, normalised exactly so a crown cannot score by getting bigger.
> **That normalisation is what makes it structurally incapable of rewarding a
> better-architected crown.** It answers "is this crown solid"; it can never answer "is
> this a tree".
>
> **The lesson, and it is the sharper form of this entry's own:** when a metric is
> normalised, *the normaliser is a statement about what the metric refuses to see.*
> Before quoting a falsification, check which instrument produced it, what it divides by,
> and whether its number is in the same band as the ones the project quotes now.
>
> And the outside evidence says the rejected thing is most of a real tree. Fabrika,
> Scheer, Sedmak, Kurth & Schon 2019, *BioResources* 14(1):908-921, **10-year-old Norway
> spruce**, >12,000 growth units over 15 trees: first order 26.7%, **second 52.8%**,
> third 16.6%, fourth 4.0%. Kozlowski & Ward 1961 found **quaternary** axes on
> *six*-year-old red pine, white pine, white spruce and black spruce. Ours were 100%
> first order. See the 2026-08-01 entry.

**And the metric was the reason both survived as long as they did.** The first fill
statistic was needle area over silhouette area, and it came back **0.28 for every variant
including ones that plainly differed**, because both terms move together — a ratio of two
quantities that scale with each other measures nothing. Replaced with a rasterised
silhouette: ink over the crown's own outline, per row. That one separated the cases
immediately, and it is the same trap `test/venation.mjs` records under a different name.

### What it actually was: `if (this.rnd() > 0.35)`

One line in `40_plant.js`, uncommented, unreachable, shared by every species: a bud that
had escaped apical dominance then took with probability 0.35, and **two in three were
retired permanently.** It is the strongest single lever on how many branches a crown has,
and it was the same species of constant as the `0.72` and the `v3lerp(..., 0.45)` that
ROADMAP 13 deleted — an unnamed number doing a job a species parameter should do.

Now `sp.budTake`, default 0.35 so all eight herbs are unchanged bud for bud. At 1.0 the
conifer's branch count is decided entirely by `exp(-d/dominance) > branching`, and
`maxAxes` is not what stops it: 77 axes against a cap of 140. **29 branches became 77.**

### The budget is a POOL, which is why one knob was never going to do it

Raising `budTake` alone divides the *same* 540 organs among three times as many branches,
and the tree gets **smaller**: 46.1 -> 35.3 units tall, crown radius 7.9 -> 4.3. More
branches has to be paid for. And the payment has to be aimed: `maxOrgans` is left at 80
deliberately because it caps the **leader**, so the extra budget goes into branches
instead of into a taller trunk. Height then stays at 46.1 to the digit while fill moves.

    budTake  organBudget  organLen   axes  organs   fill
     0.35        540        1.45       30     540   0.559   shipped
     0.45       1600        2.1        39     898   0.604
     0.60       1600        2.1        51    1215   0.672
     1.0         900        2.1        75     900   0.681
     1.0         900        3.0        75     900   0.699
     1.0        1200        3.0        77    1201   0.752   ships
     1.0        1600        2.1        77    1601   0.750

**`organLen` is nearly free fill** — drawn area per organ at no extra organ, 153.6k
triangles against 153.8k — and it **saturates**: 3.0 and 3.8 are within 0.003. It also
does almost nothing alone (0.559 -> 0.570 at 540 organs); it is a multiplier on having
branches to hang needles from. 1200 organs at `organLen 3.0` reaches the same fill as
1600 at 2.1, so the shipped setting is 25% cheaper than the one that first looked right.

### The needle is not a needle — and my first explanation of why was wrong

The preset advertises `aspectFloor: 0.04` and its comment claimed "a blade that narrow
canalises one unbranched midvein. That is a needle." **The floor does not bite.** This
margin grows aspect **0.193** on its own — five times above the floor — so the blade is a
narrow *paddle*, which is exactly what the close-up shows.

The claim was not fabricated, it was **about a different property**: `test/venation.mjs`
measured the *venation* — one dominant bundle, `n50 = 1` — and that is still true. The
*silhouette* was never checked.

**I then got the cause wrong, and the way I got it wrong is the reusable part.** I swept
`marginBias.ay` from 0.16 down to 0.02, saw 0.213 -> 0.103 with a visible flattening in
the middle of that range, and concluded it *saturated* — that no setting of it would
reach a needle, and therefore a new mechanism was needed. Written up in four files that
way. AJ asked whether we could do better on the needles, one more sweep went two decades
further down, and it does not saturate at all:

      ay      len       halfW    aspect    len ratio   width ratio
     0.16    5.3168    1.1339    0.2133      x1.000       x1.000
     0.10    4.2192    0.7928    0.1879      x0.794       x0.699
     0.05    5.6707    1.0044    0.1771      x1.067       x0.886
     0.02    3.5066    0.3612    0.1030      x0.660       x0.319
     0.012   3.6273    0.2251    0.0621      x0.682       x0.199
     0.008   3.7120    0.1576    0.0425      x0.698       x0.139
     0.005   3.7639    0.1025    0.0272      x0.708       x0.090
     0.003   4.2557    0.0672    0.0158      x0.800       x0.059

`ay` is a **pure width knob**: length is flat across the whole range with no trend, while
half-width falls **17x**, monotonically, all the way down. A Norway spruce needle's
0.02-0.05 sits at `ay` ~0.005-0.012, and the lattice still builds there — 100 cells and
100 veins at 0.008. Rendered, it is unmistakably a needle rather than a paddle.

**The error was reading a trend off the noisy end of a sweep and extrapolating past the
data.** Between 0.16 and 0.05 the aspect moves 0.213 -> 0.177 while individual leaves
differ by more than that from each other, so that stretch is noise wearing the shape of a
plateau. The signal starts exactly where I stopped looking. **Separate the ratio into its
numerator and denominator before declaring a knob dead** — one line of extra output would
have shown length flat and width falling, which is not what saturation looks like.

**Why it still is not shipped**, and this is a real tension rather than a doubt: a needle
4.5x narrower covers 4.5x less crown, so fixing the silhouette walks the specimen back
toward the sparseness this whole entry is about. The fill ladder above was measured on
*paddles* and does not carry over — `organLen` saturating at 3.0 is a statement about
needles that already overlap each other, which thin ones do not. It also gets *cheaper*
(92.9k -> 58.1k line vertices), so there is headroom to spend on recovering the fill.
That is the next PR, and ROADMAP 13 item 0 carries the plan.

### A latency bug this exposed, and it was never about the crown

`warmGarden` checked its time budget **once per round**, on stated reasoning: *"a round
is seven steps and the budget is in whole milliseconds, so per-step timing would cost more
than it saves."* That holds only if every step costs the same. A herb's step is a few
hundred microseconds and a conifer's is milliseconds, so one round could overrun the whole
budget several times over with nothing looking. Now checked per step, with a cursor so
breaking mid-round does not hand the budget to whichever specimens sort first. Median frame
gap during establishment 24.8 -> 21.7ms, p99 70.9 -> 59.8ms.

**A comment that names its own assumption is worth more than a correct one**, and this one
paid for itself the day the assumption stopped holding.

### What it costs, measured rather than estimated

A grown stand of seven with two conifers, both fully arrested, real browser on Metal:

    main    48.1 ms/frame  (20.8 fps)   1349 organs   79 axes   59k tri   108k line
    this   127.5 ms/frame  ( 7.8 fps)   2672 organs  172 axes  112k tri   200k line

Linear in organs, so it is ROADMAP 10b and 11 rather than a bug, and it is shipped
knowingly. **Two measurement traps on the way to that table**, both of which produced
confidently wrong numbers first:

- **Life stage was confounded with size.** A cost column swept over `organBudget` went
  *down* as the tree got bigger — 20280us at budget 2200 against 5750us at 1600 — because
  at the larger budget the specimen had not arrested yet and a live meristem is a
  different program from a retired one. Grow to `spent()` **first**, then profile. Fully
  arrested the ratio is a sane 2.2x, not the 8x the naive sweep reported.
- **Two camera positions are not a comparison.** A first pass had main drawing 3,184 line
  vertices against this branch's 265,328 — 83x for 2.6x the organs — and a whole theory
  about the vein LOD's anchor was built on it before the framing was checked. At matched
  `cam.dist` it is 108k against 200k. **There was no anomaly.** The vein cull is fine.

## The needle, and three things the roadmap had wrong about it (2026-07-31)

ROADMAP 13 item 0 was written up as the small, specified, obviously-next piece of work:
one parameter, `marginBias.ay` into a spruce's aspect band, with a known cost to be paid
back out of a re-run fill ladder. It landed, and it is a needle — but almost none of the
plan survived contact.

**First, the ladder could not be re-run, because the instrument was a scratch script and
it was gone.** CLAUDE.md said so in as many words and the sentence had been read many
times without anyone noticing it was load-bearing: "there is still no harness here that
measures how much of anything there is." `test/crown.mjs` is that harness now. It reads
the shipped paddle tree at 0.772 against the lost script's 0.750 and the pre-#32 Charlie
Brown tree at 0.576/0.493 against its 0.546, which is the only reason any of the numbers
below can be compared with the ones already in TUNING.

**And the instrument had to be checked before it could be believed, twice over.** Its
first version sampled the blade at a fixed density and **failed its own area-conservation
check the moment it saw a needle** — 25.7% of the drawn area vanished between 480 and 960
rows, because a blade two pixels wide sampled at a paddle's density is a dotted line, and
a dotted line is a sparse crown. The harness would have manufactured exactly the defect
it exists to measure. Sampling is adaptive to the raster now.

Its width-response check was wrong in the other direction and is the better story. Written
as a 2x nudge from the shipped `ay`, it **passed while measuring nothing**: a 1.03x change
in ink, which reads as "coverage has saturated". It is nothing of the kind. 0.16 → 0.08
moves the *tissue* by 1.07x, because that is the flat top of the sweep TUNING already
warns about by name. **Splitting the ratio into numerator and denominator is the same
lesson, on the same knob, two documents apart** — and the first time it cost four files
saying `ay` saturates.

### The three results

**1. Setting `ay` alone would have been worse than the Charlie Brown tree.** At the
shipped `organLen` the needle reads 0.419/0.352 resolved fill against the pre-#32
specimen's 0.576/0.493. The entry predicted this change "walks the specimen straight back
toward the sparseness that was just fixed"; it walks *past* it. Worth noting how nearly
this was missed: at the whole-tree framing the same specimen reads 0.617 against 0.673,
a gap small enough to argue about. The two numbers disagree because a needle is 2 px
across there, so the raster — and the eye — flatter it. **Fill is pixel coverage and
means nothing without a stated raster.**

**2. `organLen` does not saturate on needles, and that was the one prediction that
held.** TUNING has it flat past 3.0 with 3.0 and 3.8 within 0.003 of each other; on
needles every step still buys, +0.051, +0.041, +0.033, +0.029. That entry was a statement
about needles that already overlap, exactly as item 0 guessed. It is the whole recovery
and it costs no organs.

**3. ORGANS ARE THE WRONG LEVER, AND PAST ~1800 THEY REVERSE.** This is the one nobody
predicted. Sweeping the pool at `ay .008, oL 4.6`:

    organBudget   organs   crown R   resolved fill
       1200        1202      7.01       0.5112
       1800        1800      9.45       0.5345
       2400        2402     11.87       0.5341
       3200        3202     14.95       0.5080

Crown radius more than doubles, and `fill` is ink over the crown's own outline, so the
extra needles grow the silhouette as fast as they fill it. **That is the same mechanism
that falsified `maxGen: 2`**, arriving on a different knob — and it means item 0 never
owed ROADMAP 10b anything, which is how it was costed.

`organTilt`, the other free axis, is nearly dead: 0.92 → 1.40 moves fill by 0.009. Whatever
limits a needled crown, it is not self-overlap.

### What made it affordable at all

Over ay 0.16 → 0.008 the blade **tissue** falls 4.85x and the **drawn ink** only 1.41x,
because at paddle width most of the foliage is behind other foliage. That gap is redundant
tissue and it is what the needle spends. Without it this change would have been a straight
4.5x loss of crown and not worth doing.

Shipped: `ay` 0.012 — the wide end of the band, aspect 0.040-0.058 over three seeds,
`n50 = 1` throughout — with `organLen` 5.4. Resolved fill 0.618/0.567, on screen
0.725/0.712, `organBudget` untouched, line vertices 92.9k → 89.1k.

### And a law it broke that nothing was watching

`test/views.mjs` fails its drawn-area conservation on a needled blade (0.861x at 48 and
96 units against an 8% tolerance) and **both CI runs of that file stay green**, because
one names `Cathedral Fern` and the other reads a fern out of the garden. It is a real
weakness in the law — count is a proxy for area, and it stops being a good one when a
blade reaches the one-cell floor — and it is written up in PITFALLS rather than fixed by
widening the tolerance. The general form: **a gate names its subjects, and a law that
holds for the subjects it names is not a law you have checked.**

### The reversal, and the measurement that caused it (2026-07-31, later)

The entry above shipped a needle. It is reverted, and the reason is the most useful
thing this piece of work produced.

AJ, looking at the before/after: *"I'm not sure I see a huge difference... the tree
looks really bad compared to the original plants. And maybe that's because we're beyond
just simulating auxin?"* Three measurements followed, and the first two were my errors.

**The comparison was invalid.** `tools/tree_shot.mjs` derives every framing from the
specimen's own bounds, and a needled tree is bigger (bounds 51.3 -> 56.0), so its
close-up was shot 9.3% further away. Two pictures at different scales. `FIXDIST=` now
pins it. TUNING already recorded camera mismatch as a way to buy a false theory,
measured on geometry counts; it costs a visual comparison the same way.

**The candidate was only 1.9x narrower than the paddle.** Half-width 0.4251 -> 0.2211
world units, 8.84 -> 4.51 px at the whole-tree framing, where a true needle is 1.99 px.
Half-width is aspect times length, and `organLen` 3.0 -> 5.4 gave back more than half of
what `ay` 0.16 -> 0.012 took away. **Nothing in the fill ladder could see this**: aspect
is preserved, so every ratio statistic still reported a spruce needle, and `fill`
measures coverage rather than width. I asked what class of quantity the harness measures,
built the harness, and then optimised the wrong quantity with it.

**And the frontier under it is real.** At true-needle width, adding organs makes fill
*worse* — 0.617 / 0.605 / 0.581 over budgets 1200 / 1800 / 2400 — the same silhouette
reversal as before. `ay` stops responding below about 0.008, so width is floored near
`0.044 * length`. `aspectFloor` was checked on suspicion and is not the cause. So
`organLen` is the only lever that fills a needled crown and it spends the thinness
one-for-one. **You can have a thin needle or a full crown, and no setting has both.**

### Was it "beyond just simulating auxin"? Not in the way it sounds, and worse

The literal reading does not survive. The conifer is 28 values away from defaults against
a herb mean of 19.6 — but Hoarfrost Thicket and Ember Creeper are at 26, so it is the
most-tuned species by two. Its architecture genuinely is derived.

**The reading that does survive is that it is the first species that does not DISPLAY
the engine.** Same harness, three seeds:

    Cathedral Fern leaf    379-542 cells   373-470 veins   n50 3-7   top strand 16-29%
    Ashfall needle          71-82  cells    69-80  veins   n50 1     top strand 77-99%

A fern leaf canalises a network with a hierarchy in it; a needle canalises a line. And at
each specimen's own framing a fern draws **190 vein ribbons per organ** against this
species' **78** — the needle takes it to ~48 — because the conifer is three times taller
and therefore shot three times further away, and the vein LOD is correctly culling a
network that is sub-pixel anyway.

So the conifer's chemistry went into its skeleton, where nothing draws it, and its
organs — the part anyone can see — went from a 400-vein network to one strand. **The
herbs look good because you are looking directly at the auxin field.** On the conifer
there is almost nothing left to look at, and that is why the paddle looked *better* than
the needle: the paddle was showing more chemistry. Making the blade botanically correct
made it visually poorer.

**Botanical fidelity and legibility of the mechanism point in opposite directions here,
and this project's whole claim is the second one.** So the needle is rejected on
purpose rather than deferred, and ROADMAP 13 item 0 is dissolved rather than done. The
constructive half is ROADMAP 0z: the dominance field, the vigour partition and the
per-axis set point are computed every step and never drawn, and `Axis` already carries
`vigour`, `gsa` and `iaa` where `drawSpecimen` could read them.

## The tree was not a tree, and the ruler that said otherwise measured nothing (2026-08-01)

AJ, on the ninth species: *"I feel like the actual tree branches suck. Doesn't feel like a
real tree in the same way that the other plants feel like real plants?"* Then, a step
later and more precisely: *"are we growing crappy trees modeled after how a vine or a
flower grows?"*

Yes. And the answer had been sitting in this file, in almost his words, marked falsified.

### The observation was already written down

The 2026-07-31 entry above says it outright — *"A spruce bough is a flattened spray of
sub-shoots and ours was a bare stick"* — and then closes it: `maxGen: 2`, **fill 0.281 ->
0.268**, `maxGen: 3` at 0.311.

**Those three numbers are the retracted metric's signature.** Three paragraphs later the
same entry throws that metric out: needle area over silhouette area *"came back 0.28 for
every variant including ones that plainly differed, because both terms move together"*.
Every fill number this project quotes comes from the raster metric that replaced it and
they live at 0.51-0.77. The retraction was written on the same day, one paragraph after
the result it invalidates, and **nothing caught it for a day** — not this file, not
TUNING, which copied the number forward, and not the two follow-on entries that cited it
as settled precedent.

`maxGen` was also never in `test/crown.mjs`'s sweepable knob list. So the instrument built
*because* of the broken one had never been pointed at the change the broken one killed.

### What it is when you measure it properly

    maxGen  axes  organs  height  crownR  blade area  fill @3840  on screen
      1       77    1201   46.06    6.87       672.9      0.7721     0.8323
      2      240    3002   46.06   11.53      1702.3      0.7361     0.7912

Fill falls 4.7% while crown radius nearly doubles and blade area goes up 2.5x, **at
identical height**. Drawn at the same raster, seed 11: 46.2 tall x 12.5 wide becomes 46.8
x 21.3 — the same conic profile, 1.7x the width, and the fill statistic went *down* over
it.

So the old sentence, *"sub-branches grow the silhouette as fast as they fill it"*, is
arithmetically true and beside the point. **Fill is ink over the crown's OWN outline,
normalised precisely so a crown cannot score by getting bigger — which is exactly what
makes it unable to reward a better-architected one.** It answers "is this crown solid". It
can never answer "is this a tree".

**When a metric is normalised, the normaliser is a statement about what it refuses to
see.** That is the third instalment of this project's recurring failure: the conifer
harnesses measured *shape* and not *quantity* (2026-07-31), so a quantity harness was
built; the quantity harness measures *density* and divides out *architecture*. Each fix
was correct and each one carried its own blind spot in the denominator.

### And the rejected thing is most of a real tree

Fabrika, Scheer, Sedmak, Kurth & Schon 2019, *BioResources* 14(1):908-921 — a **10-year
old Norway spruce** stand, >12,000 growth units across 15 trees:

    first order 26.7%   second 52.8%   third 16.6%   fourth 4.0%

Three quarters of a real juvenile spruce is second order or higher. Ours was 100% first,
because `maxGen` sat at **1 — below the herbs' default of 2**, on the one species in the
catalogue that most needed it. Kozlowski & Ward 1961 (Table 3.2 in Kozlowski & Pallardy,
*Physiology of Woody Plants*, 2nd ed.) found **quaternary** axes on *six*-year-old red
pine, eastern white pine, white spruce and black spruce.

Two numbers from the same source that cost nothing and are worth keeping: branch angles in
that stand were "left-skewed and varied between **40 and 70 degrees**", and ROADMAP 13's
derived set point measures 58.4 mean — **the angle work holds up against real trees.** And
Kozlowski & Ward give an apical-control ladder to assert against, 6-year-olds, leader vs
successive whorls in cm: red pine 57.7 / 34.6 / 32.5 / 27.7 / 15.4; white spruce 33.5 /
19.8 / 17.4 / 15.3 / 11.8.

Ships at `maxGen: 2`, `maxAxes: 240`, `organBudget: 3000`. **Both caps had to move**: at
`maxGen: 2` alone the axis count hits the cap and the pool is spent low in the crown,
starving the leader's top — the same pool trap as raising `budTake` alone, arriving a
second time. It costs 2.5x the organs, shipped knowingly, linear in organs, ROADMAP 10b.

### The specimen is a sapling, and the ruler for that was already in the world

`WORLD.unitM` is 0.0625 m per world unit, fixed months ago by the wind field and the
falling blade because both need real physics. Against it:

    Ashfall Spire   2.88 m tall   trunk 9.5 cm   crown 0.85 m across   leaf 13.4 cm
    Cathedral Fern  1.39 m tall   trunk 4.6 cm   crown 0.70 m across   leaf 20.4 cm

**2.88 m is a sapling**, not a forest tree, and that reframes three "defects" as correct
biology for the life stage — verified against literature rather than assumed:

- **No cones, ever.** [D] *Silvics of North America*: white spruce "seed production in
  quantity begins at age 30 or older"; Sitka "usually does not begin until ages 20 to 40".
  `florigenRate: 0` is right at this size.
- **Branches retained to the ground.** [D] Kozlowski & Pallardy p. 59: self-pruning
  "occur[s] in many forest trees growing in dense stands... favored by high stand
  density". Schoonmaker, Lieffers & Landhausser 2014 (*PLoS ONE* 9(8):e104187) measured
  white spruce and lodgepole at **3.3-3.4 m** and found full lower-branch expansion in
  open-grown controls.
- **Strong straight leader.** Correct for an excurrent juvenile conifer.

Age at 2.88 m: sources disagree, so say **8-20 years depending on species and site**.
*Silvics* on white spruce: "10 to 20 years" to breast height under open conditions.

### ⚠ Two things checked and REFUTED, recorded so they do not get repeated

**1. "Our continuous non-whorled branching is correct free growth."** It is not. Free
growth is real and is standard terminology — Kozlowski & Pallardy p. 40, citing Pollard &
Logan 1974, verbatim: *"'free growth' involves elongation of a shoot by simultaneous
initiation and elongation of new (neoformed) stem units"*, and p. 42: *"Free growth has
been reported in firs and spruces up to 10 years old."* **But it adds internodal branches
BETWEEN whorls; it does not remove the whorls.** Whorls stay countable at 10 years in the
Fabrika stand.

The gap statistic says the same independently, and is worth keeping because it is cheap:
for a whorled leader with *k* branches per whorl the gaps are (k-1) near-zeros plus one
annual increment, so **gap CV = sqrt(k-1)** — 2.0 at five per whorl. Uniform-random gives
exponential gaps, **CV = 1.0**, which matched our measured control of 1.03. **Ours is
0.83 — BELOW random**, i.e. more regular than whorled *or* random. That is `minInternode`
showing through. The engine has no growth rhythm and whorls are genuinely missing.

**2. "The trunk has no wood."** Too strong, and wrong in the interesting direction. A
2.9 m conifer stem is essentially *all* secondary xylem — rings from year one. Worse for
the claim, the pipe-model proportionality we use is *right* at this size: sapwood area is
proportional to leaf area above (Shinozaki 1964; Lehnebach et al. 2018, *Ann Bot*
121(5):773-795), and a sapling is all sapwood — Antonova et al. 2024 (*IAWA J*
45(3):375-390) detect true heartwood in Scots pine only at **cambial age 15-17**.

**The actual error is irreversibility.** Strip every leaf off the grown specimen and
re-run `updateRadii` and the basal radius goes **0.7573 -> 0.2412, a 68.2% loss.** Wood is
a permanent deposit; a cambium can only add. A real sapling stripped of foliage does not
thin, it stops thickening. That is the missing physical property and it is one term, not a
mechanism — and note the first attempt to measure it was worthless: running the plant
through senescence showed the radius holding perfectly, because `updateRadii` counts every
organ in `this.organs` whether or not it is dying, so the load never came off.

### What is still missing, ranked

1. **A growth rhythm.** No season, no flush, no bud dormancy anywhere. It buys whorls,
   bare internodes, growth rings and bud scars from one oscillator, because a bud is a
   compressed shoot — hold elongation while organ founding continues and primordia pile up
   at one arc position. A season is environmental, the same category as the air in
   `37_wind.js`, so it costs nothing against the one rule. ⚠ **One obstacle, unproven:**
   `minInternode` currently makes a non-elongating axis *discard* the primordia its
   meristem emits. It would have to queue them instead, without disturbing the eight herbs.
2. **Wood as memory**, per above. One term in `updateRadii`. `EI` goes as r^4, so the sway
   currently rests on a radius that moves with the foliage — run `test/stem.mjs`.
3. **The leader's top third is a bare whip.** Pre-existing, not a regression from the
   branching, and it only reads worse now the crown below it is full. `maxOrgans` is **not**
   the lever: at 130 the specimen is 70.6 units with the same bare top.

### And the palette, which was a separate defect arriving from the same direction

Ashfall Spire was **the only species in the catalogue whose stem hue fought its foliage** —
`stem1 [0.34, 0.31, 0.27]`, a warm neutral with red highest, under cool green blades, where
the fern is teal-on-teal, Sun Coral orange-on-orange and Ember red-on-red. It is also the
only species whose stems are a large share of the frame rather than a thin support for the
blades, so **the defect every herb hid, the tree put in the middle of the picture.**

Two things were wrong and only one was hue: pulling the stem into the foliage's family
fixed the colour and left it reading as dark rods, because `stem1` also sat well below the
blades in **value**. Lightening it toward the foliage's midtone is what actually worked.
The ground is warm now and the tree cold — the only cold-on-warm pairing in the catalogue,
so the species stops living in Cathedral Fern's hue family "only greyer".

**One more thing that turned up while looking**, and it is unresolved: at the whole-tree
framing this specimen draws **92,864 vein ribbons against 87,402 triangles**, and `vein` is
the brightest entry in its palette while `blade1` is the darkest. Sweeping the vein weight
to zero on one grown tree in one session reveals a legible green conifer underneath the
white haze. **At that distance the crown you are looking at IS the vein network, not the
foliage.** The veins must not be culled — they are the only channel through which the
engine is visible, which is what killed the needle — but they have no perceptual distance
fade in `natural`, where the `cells` view's needles already have exactly that law. Not
built. It also means crown fill measures blade footprints while the *impression* of
fullness comes substantially from ribbons.
