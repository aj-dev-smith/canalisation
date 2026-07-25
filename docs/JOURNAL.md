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
