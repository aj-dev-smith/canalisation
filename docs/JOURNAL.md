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
