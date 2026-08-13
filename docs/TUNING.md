# Tuning

Parameter regimes found by sweeping. **Read this before changing a constant.**
Many of these were hours of work and are not obvious from the equations.

## The auxin engine (`10_auxin.js` DEFAULT_PRM)

```
rho 0.60  mu 0.30   →  undisturbed steady state a = rho/mu = 2.0
D 6.0     T 40      →  the working regime for the meristem
b 3.0               →  gradient sharpness
dt 0.014  substeps 3 →  under the stability ceiling (~0.014). DO NOT RAISE.
ath 0.60  hSwitch 2.5 → a real sigmoid, not a step. A sharp switch means
                        canalisation can never nucleate in low-auxin lamina.
alpha 0.08 beta 0.15 Jsat 1e6 → quadratic regime; π must not saturate
piFloor 0.002       → low enough that a nucleating canal can beat it
```

### Pattern-formation map (static tissue, `test/pattern.mjs`)

Measured contrast and spot spacing at `mu 0.3, rho 0.6`:

| T | D | contrast | peaks | spacing |
|---|---|---|---|---|
| 10 | 3 | 3.2 | 5 | 6.5 |
| 20 | 5 | 4.6 | 7 | 5.8 |
| **40** | **6** | **9.8** | **5** | **5.8** | ← the regime in use
| 40 | 8 | 6.4 | 7 | 5.8 |
| any | ≥10 | ~2.1 | ~70 | 1.7 | ← pattern destroyed, noise

Rule of thumb: raising **D** lengthens the wavelength until it collapses; raising
**T** sharpens contrast. `D ≥ 10` kills the pattern entirely.

**Always verify a stationary pattern on static tissue (`G: 0`) before enabling
growth.** A pattern that dies with `G=0` will never work with growth on.

## Meristem (`20_meristem.js`)

```
R 10  rCZ 2.4  rPZ 6.8  G 0.003
detectA 1.7    persist 8   mergeR 2.2
organDrain 0.3  keepFrac 0.45 (hysteresis: strong max to be born, weak to survive)
```

- `rCZ` too small → the summit patterns and spots nucleate everywhere → disorder.
- `rPZ`→`R` drain is what confines initiation to a ring. Without it maxima form
  across the whole disc.
- Narrowing the competent band (`rOut`) tightens the divergence angle *and*
  starves the shoot — this is exposed as the "generative ring" slider deliberately.
- Warm the meristem ~220 steps at birth and discard the emitted burst, or the
  plant is born wearing a rosette of transient organs.

## Leaf margin (`25_margin.js`)

```
g0 0.00030  g1 0.00115  gExp 2.2   ay 0.62   smooth 0.16
D 7.0 (chain)  dMax 0.030  maxPts 620  mature 1400
```
Variety per leaf comes from randomising `ay`, `g1`, `gExp`, `D`, `tipBias` — the
margin's chemistry — **not** from shape numbers. Petals are the same engine with
`ay` 0.95–1.5, `g1` near zero and high `D`: broad, smooth, untoothed.

## Leaf veins — traffic to drawn width (`30_leaf.js` `bake()`)

The canalisation engine produces a **15x** spread of traffic across the veins it
keeps (raw `pi`, max/median). Across *all* walls the spread is ~950x. How that
becomes ribbon width is a display mapping, and it was throwing the hierarchy away.

Downstream, `50_geom.js` draws each vein at `max(MINW, base*(0.25 + w*1.35))`, so
the **drawn** ratio is what the eye gets — and the `0.25` offset caps any mapping
at **6.4x** no matter what `w` does. Measured over four leaves:

| mapping | drawn max/min | drawn max/median | median w |
|---|---|---|---|
| `log(1+mag)/log(1+maxPi)` (was) | 1.82 | 1.49 | 0.61 |
| **`log`, rescaled to the kept range** | **6.40** | **2.67** | **0.27** | ← in use
| `pow 0.5` (sqrt) | 3.43 | 2.63 | 0.27 |
| `pow 0.35` | 2.57 | 2.04 | 0.40 |
| `linear` | 5.56 | 4.60 | 0.07 |

The old divisor was `maxPi` — the maximum over *every* wall in the tissue,
including walls that never became veins. Kept veins bottom out around `mag` 29 of
`maxPi` 2347, so `log(1+29)/log(1+2347) = 0.44`: **the bottom 44% of the output
range was unreachable by construction.** Rescaling to `[min,max]` of the veins
actually kept is the same log law with the right normaliser, and it hits the 6.4x
geometric ceiling.

`linear` reaches a similar ratio but collapses median `w` to 0.07, so everything
but the trunk sits on the `MINW` pixel floor — the failure mode PITFALLS warns
about under "threshold on share, not absolute". Do not use it.

If you ever want more than 6.4x, the `0.25` in `50_geom.js` is the binding
constraint, not the mapping. It exists so minor veins stay visible; lower it and
they become hairlines. Change one or the other, never both at once.

## Fruit (`35_fruit.js`)

```
subdiv 3 (642 wall cells)   gWall 0.00016  gAux 0.00052  gExp 1.8
smooth 0.020  ← CRITICAL. At 0.22 the wall smoothing flattens every lobe
                 (lobing 0.1 = sphere). At 0.02 lobing is 0.5–0.8.
wallMu 0.46  D 2.6  → keeps seed auxin local so lobes are distinct
ripenRate 0.022  ripenDiff 0.13 → wave crosses in a watchable time
```
Typical output: 15–19 seeds, lobing 0.5–0.8.

## Plant (`40_plant.js`)

```
elongation 0.0052   internode 0.0072  internodeSpan 2.6   minInternode 0.18
thicken 0.00030     nutation 0.0135   nutAmp 0.16
organGrow 190       florigenRate 0.0016  florigenThresh 12  floralOrgans 9
maxFlowers 6  organBudget 96  fruitScale 0.55
floralGrace 320     floralCZ 0.42     petalQ 0.28
```
Most stem length should come from **subapical elongation**, not tip extension —
that is what spreads leaves apart and reads as growth rather than extrusion.
Organs are born crowded (`minInternode` small) and stretch apart afterwards.

### The flower: apex contraction and organ identity

A determinate apex is a finite resource. Each floral organ recruits `organR` worth
of tissue that is never replaced, so the competent flank contracts, later organs are
founded further in, and `q` (identity) rises. Three constants govern it. **All were
set by measurement — see JOURNAL.md for the full tables.**

`floralCZ` — fraction of `rCZ` surviving conversion. Swept over the catalogue; the
intuition that a *retained* central zone sharpens the radial gradient is wrong,
because it pushes every organ outward:

| `floralCZ` | organs | inner | mean q |
|---|---|---|---|
| **0.42** | **261** | **20** | **0.173** | ← in use
| 0.70 | 252 | 9 | 0.152 |
| 1.00 | 243 | 1 | 0.125 |

`petalQ` — where the identity boundary sits on `q`, and therefore the petal:stamen
ratio. The measured `q` distribution is heavily skewed (p50 0.06, p75 0.29, p90 0.53,
max 0.94), so a high threshold produces no inner whorl at all:

| `petalQ` | petals | inner | flowers with ≥2 inner | flowers all-petal |
|---|---|---|---|---|
| 0.62 | 241 | 20 (8%) | 2/42 | 24/42 |
| 0.40 | 219 | 42 (16%) | 11/42 | 16/42 |
| **0.28** | **~200** | **~61 (25%)** | **~19/42** | **~11/42** | ← in use
| 0.15 | 163 | 98 (38%) | 28/42 | 10/42 |

This is the one number here that is a *choice* rather than a measurement, and
SCIENCE.md lists it as such. It sat at 0.62 for as long as `q` was stuck at zero,
where its value could not matter.

`floralGrace` — idle steps before an apex with room left counts as spent. Set from
the measured waits (conversion→first organ max 127; organ→next organ p99 238, max
579): 320 is above every first-organ wait, so no flower is aborted before it starts,
and above the p99 gap, so it costs ~1% of organs at the tail. **Do not lower it
below ~130** or flowers abort with zero organs and become bare ovaries.

Do not tune apex contraction itself to hit a target organ count. Its magnitude comes
from `organR` against the apex area, which is physics already in the model; if you
want more organs per flower the honest lever is a larger apex at conversion, not a
gentler contraction.

## Species (`70_app.js` SPECIES)

A species is `prm` + `mo` + `sp` + `marginBias` + `pal`. `node test/species.mjs`
grows all of them and prints organs, axes, height, divergence, flowers, petals,
seeds, stuck axes, leaf aspect and tooth count. Run it before and after any change.

### Keeping a meristem emitting

The single most important thing to check on a new preset is whether the meristem
keeps producing for thousands of steps or locks up after a few dozen organs. It is
`D` that decides, far more than `T` or `G`. Main-axis organ count at 4000 steps,
four seeds, `maxOrgans 78`, flowering suppressed:

| T | D | G | organs by seed |
|---|---|---|---|
| 36 | 5.2 | 0.0046 | 29 / 18 / 38 / 78 |
| 36 | 6.0 | 0.0034 | **78 / 78 / 78 / 78** |
| 42 | 5.2 | 0.0060 | 9 / 17 / 35 / 14 |
| 42 | 6.0 | 0.0034 | 27 / 77 / 70 / 75 |
| 42 | 6.8 | 0.0034 | **78 / 78 / 78 / 78** |
| 42 | 6.8 | 0.0060 | 41 / 78 / 37 / 21 |
| 48 | 5.2 | 0.0034 | 14 / 28 / 36 / 71 |

**Low D with high G stalls.** The field settles into a state where nothing clears
`detectA` above a mean that the existing primordia have raised. `D` near 6.5–7 with
`G` near 0.0034 keeps emitting at every seed. A leafy species wants that corner; a
species that is meant to run out of leaves can sit outside it, but check it is
running out for the reason you intended.

### marginBias — leaf character without leaf shape

Multipliers on the per-leaf margin draw (`LeafPool._make`), so per-leaf variety
survives. Measured mean blade aspect over the leaf library:

| species | `ay` | measured aspect |
|---|---|---|
| Spiral Ossuary, Hoarfrost Thicket | 0.55–0.62 | 0.32–0.34 |
| Sulphur Rosette | 0.78 | 0.36–0.39 |
| Cathedral Fern | 0.86 | 0.44–0.46 |
| Abyssal Frond | 1.12 | 0.48–0.53 |
| Sun Coral | 1.20 | 0.47–0.48 |
| Ember Creeper, Nightglass Parasol | 1.35–1.45 | 0.54–0.57 |

`ay` is the only bias with a large, reliable effect on the silhouette. `g1`/`gExp`
move tooth prominence, `D` moves tooth count modestly (38 → 55 across its whole
useful span). Pushing `D` past ~14 with `g1` near zero stops outgrowth altogether —
the margin matures at length 0.13 and the leaf is a stub. That corner is the petal
regime, and it only works for petals because they are meant to be tiny.

### Rates that compound

`internode` is applied as `L *= (1 + e·dt)` every step, so it compounds: 0.0090
over 9000 steps is not 1.8x, it is enormous. Anything above ~0.009 needs the axis
to arrest early or the specimen leaves the frame. This is also why a species whose
axes never arrest (see PITFALLS) reads as a runaway rather than a slow drift.

## Rendering (`70_app.js` BASE_PAL)

```
bloom 0.38  bloomThresh 1.15  exposure 1.04  laminaMul 0.86
dof 0.80    grain 0.024       vignette 0.60
```
`laminaMul` pulls the leaf body down so the **vasculature carries the light**.
A leaf should read as light held inside tissue. Vein emissive and lamina
brightness are a balance — raise one and lower the other.

`sway 1.0` used to be listed here and is gone with the vertex-shader sway it fed
(ROADMAP 7 step 5). The geometry moves for real; nothing in the palette displaces
anything any more.

**These are the `natural` view's values.** A render view may override any of them
for the duration of one `draw` call — see "Render views" at the foot of this file
for the table of what each one changes and why. The overrides are saved and
restored around the call rather than written in, because the palette belongs to the
specimen and switching views must not be destructive.

### The blade at cell resolution (`50_geom.js` `laminaCells()`)

Rerun `test/lamina.mjs` before changing any of these; it prints every number
below.

**Needle length and brightness come from FLUX, not from polarity.** This is the
one thing that does not carry over from the meristem close-up, and it is not a
matter of taste. Measured across seeds 7/4/12 at maturity:

```
channel   on a vein   in between    ratio
polP         0.966       0.957       1.01x     <- what the meristem draws
frac         0.972       0.966       1.01x     <- what bake() thresholds
flux        11.41        3.95        2.89x     (4.95x, 3.19x on the other seeds)
```

The meristem can use `|polarity|` because competence keeps its central zone
blurred, so an uncommitted cell really does have a short needle. The blade runs
in flux mode with no such gate and **every** cell ends up essentially fully
polarised, so polarity carries no information here — draw length from it and the
lamina is one uniform lamp with no veins in it. Traffic is what canalisation
selects for and what separates a vein from an areole. Direction still comes from
the PIN allocation, same as the meristem; alignment between a needle and its own
vein measures 0.85-0.88 |cos|, against 0.5 for random.

**Normalise flux linearly, against the leaf's own busiest wall.** Log
compression puts the median cell at 0.43-0.56 of full brightness and throws the
contrast away — the same failure as the vein-width bug in PITFALLS.md, one step
further down the pipe.

```
cell disc   cw * 0.62      cw = len/nu, one cell in world units
needle      ms * (0.30 + fn*1.40)      ms = 1/nu, one cell in material units
auxin       (a/8) ^ 0.55, dim 1 - 0.42*detail
```

Size off the **lattice**, never off blade length: a fixed fraction of the blade
merges the discs into a solid sheet on any species with a finer `nu`. The 0.55
auxin exponent is load-bearing — the median cell sits at 0.77 against a maximum
near 9, because the sources at the teeth are an order of magnitude above the
lamina, and at 0.7 most of the sheet reads as empty space.

**Detail ramp** `smoothstep(0.42, 0.95, bl / eyeDistance)`, **applied only to the
blade being inspected**. The floor has to clear the director's existing `organ`
beauty shot, which sits at about 0.44 — below that a normal leaf close-up would
start sprouting needles. The same ramp refines that blade's mesh from
`bladeMU/MV` up to the tissue's own `nu`/`nv` and fades its surface out by
`1 - 0.82*detail`; at full strength the lit surface simply outshines the cells
sitting on it.

Restricting it to one blade is not an optimisation, it is the fix for a popping
bug — see PITFALLS.md. Purely distance-driven, every blade near the lens refined
and grew needles at once, and they all then sat a hair from both this threshold
and the occlusion cull. Traced at a dead-still camera: 13k triangles to 40k and
back, frame to frame.

**A render view sets a FLOOR on that ramp rather than replacing it**, so a view
that wants cells everywhere still fades the mechanism up as you approach one
blade. `cells` uses 0.85 and `flux` 1. The floor does not defeat the per-blade
visibility ramp underneath it — see "Render views" for that one, which is the only
number in this file set by looking at a picture.

**Three things in here changed when the whole plant got cells** (ROADMAP 12), and
all three are visible at microscope range in `natural` too:

- The mechanism now comes from a **table baked once per library leaf**, because a
  mature leaf is frozen tissue. `test/views.mjs` asserts it reproduces the live
  path cell for cell. A blade still unfurling has no table and takes the live path
  — which is exactly what the close-up's replay is.
- **A cell drains on its own traffic.** `blade()` spares the tissue against a vein
  using `vdf`, the distance field of the baked network; a cell has the quantity
  that field was derived from, so it uses `fn*fn` directly against the same
  `VEIN_LAG`. Same physical statement, better measurement.
- **The spark rides the drawn needle**, interpolating its two endpoints, instead
  of being re-mapped onto the curved lamina at an intermediate material point. On
  a curled blade it used to drift off the needle it was travelling along.

**Smoothing constants that exist only to stop things snapping:**

```
dofRange      lerp toward target, damp(0.05)   was assigned outright
leaf cull     radius * smoothstep(0.30, 0.80, bl/eyeDistance)
cull hysteresis   drop below cullRad*0.86, restore above cullRad*1.20
```

Measured over ~1080 frames entering, holding and leaving the view: p95
frame-to-frame geometry change 1482 → 336, frames moving >3000 vertices 36 → 7,
largest depth-of-field step 6.34 → 0.37. `tools/_pop.mjs` is not kept — it was a
throwaway tracer; the numbers are here so a regression is recognisable.

**Replay rate** `dtms * 0.075 * speedMul`, clamped 1-12 steps a frame: about
twelve seconds for the ~900 steps of canalisation. The margin phase before it is
fast-forwarded at 400 steps a frame, because the outline is already on screen
and running it at watchable speed opens the close-up on eight seconds of nothing.

## Senescence, and the stream that does not drive it (2026-07-26)

Only one constant matters for the shipped mechanism, because only one thing about
it is a number:

```
senesceFor    2200    how long the slowest blade on a finished specimen takes
vegGrace      1600    idle steps before a vegetative apex counts as stalled
```

`vegGrace` is not a taste knob — it is a leak-stopper, and it was chosen off
measurements. Across all eight species the longest gap between organs on a healthy
shoot is **500** steps and the longest a new lateral takes to found its first is
**320**, so 1600 sits at 3.2x the worst real gap. Lower it below ~600 and you will
start arresting shoots that were merely slow. Its counterpart for floral apices is
`floralGrace: 320`, which is much tighter because a floral apex patterns faster.

Everything else is a physical condition. Senescence starts when `Plant.spent()` —
no growing point anywhere — and each blade's rate is `(age/oldest)²`, squared so
the wave has a front instead of the plant fading uniformly. On Cathedral Fern at
14000 steps that gives a shed running **4546 → 9115**, so roughly 4600 steps of
wave rather than a cut, with `rho(age)` 1.00 and `rho(y)` 0.98 up the plant.

`senesceFor` is the knob to reach for if a specimen strips too fast to read. Note
it sets the *slowest* blade: the oldest tissue goes appreciably sooner because of
the squared term, so halving it does not halve the wave.

**The transport stream in `38_shoot.js` is off (`shootOpts.enabled: false`) and
its constants are not tuned parameters — they are the settings the falsification
was measured at.** Do not sweep them expecting the plant to change; nothing in the
shipped plant reads them. They are:

```
rootDrain 3.0   turnover 0.05   apexSource 0.55   leafSource 1.10
fruitSource 2.20   leafPeak 300   leafDecay 2600   maintain 0.55
```

For the record of what was already swept and found not to matter: mean blade
export sat at 0.66-0.69 across `turnover` 0.05 → 0 and `rootDrain` 3 → 12, because
the quantity is conserved. Shoot `T` 40 → 8 is the one change that does something
— it starves apical organs and inverts the basipetal gradient — and that is a
different claim, not a tuning of this one. JOURNAL.md has the tables.

### Drawing it (2026-07-26)

Seven numbers, and only one of them was arrived at by measurement rather than by
eye. They live in `50_geom.js` and in the organ loop in `70_app.js`.

```
VEIN_LAG     0.45    how far behind the lamina the vasculature drains
dd -> dd*dd          what counts as "held against a vein"   <- the measured one
(the four SHED_* constants that used to be here are gone — see "The fall" below)
curl  x(1 + sen*2.2)   a drying blade curls
len   x(1 - sen*0.12)  ...and shrivels, slightly
```

**Squaring `dd` is the one that matters.** `dd` is a linear ramp off a dense vein
network, so raw it reads **58% of the lamina** as vein-adjacent and the drain
comes out as blotches instead of a tracery. Do not fix that by lowering
`VEIN_LAG` — that shortens the window in which there is any contrast at all
rather than tightening it — and do not fix it by steepening `dd` itself, which
fenestration (`o.fenestrate`) and the vein tint are both calibrated against.

`VEIN_LAG` sets the window, not the strength. At 0.45 the open lamina is fully
drained by sen=0.55 and the vein tracery holds until sen=1, which puts the whole
of the contrast between roughly sen 0.2 and 0.65 — verify with `test/senesce.mjs`,
which prints the ASCII map. Push it above ~0.6 and the lamina drains before the
wave has travelled; below ~0.3 the blade goes as one card.

The senescence colour itself has **no per-species constants and should not grow
any** — `senesceTint()` derives the drained colour from the blade's own, which is
the only reason adding a species does not mean picking a brown for it. See
JOURNAL.md.

## The fall (`39_fall.js`, 2026-07-26)

**Read this section differently from the rest of the file.** Everywhere else here
is hard-won parameter regimes — numbers found by sweeping until something looked
right. This one is the opposite, and the point of it is that there was nothing to
sweep. If you find yourself reaching for a dial in this file to change how the fall
*looks*, that is the signal that something is wrong with the model instead.

### The inputs, and where each one comes from

The first four moved to `WORLD` in `37_wind.js` when the wind field arrived — the
air has one density, not one per file — and `FALL_DEFAULTS` spreads them, so every
key name below still works and a harness can still override any of them.

```
unitM      0.0625   metres per world unit      already fixed: 16u plant reads as 1m
ptPerSec   125      plant-time units / second  already fixed: 70_app.js:703
gEarth     9.81     m/s^2                      gravity
rhoAir     1.2      kg/m^3                     air
lmaFresh   0.120    kg/m^2   leaf mass per area, turgid  (real trait, 50-150 g/m2)
lmaDry     0.072    kg/m^2   ...once drained into its own veins
thickM     0.0004   m        lamina thickness
cPar 0.18  cPerp 1.95  cT 1.20  cR pi    quasi-steady plate coefficients (JFM 541)
cRot       null     rotational damping = cPerp. NOT independent — see below
arCorrect  true     finite-span correction, AR/(AR+2)
```

Everything the fall does is derived from those. `g` in world units is
`gEarth/(unitM*ptPerSec^2)`, areal density is `lma/(rhoAir*unitM)`, and both drop
out of requiring the dimensionless groups to match — there is no freedom in either.
A drained blade's broadside terminal velocity comes out at **0.78 m/s**, which is
what a dead leaf does, and it was not aimed at.

### The two that are not what they look like

**`cRot: null` means "use `cPerp`", and that is a correction, not a shortcut.** The
torque resisting spin is the same normal-force drag as `cPerp`, integrated over a
chord whose local speed is `omega*r` rather than uniform, so it takes the same
coefficient. It sat at an invented `0.90` for several revisions, which silently
halved the damping. Fixing it took tumbling from 41% of blades to **14%**.

**`arCorrect` is the difference between "flappy and spinny" and a fall.** The
integrator solves a cross-section — a plate of infinite span. A leaf is a stub, air
escapes round its ends, and the circulation actually developed is a fraction of
what 2D theory gives. Since circulation drives both lift and spin, uncorrected 2D
is roughly twice reality and it showed. Set `arCorrect: false` to see what it looks
like without; the numbers are in the table below. Note that AR is the blade's length
over its width, which `30_leaf.js` overwrites with what the margin grew — so this
term damps each blade by an amount its own silhouette decided.

| | tumbling | sideways travel, med/worst | spin, med/worst |
|---|---|---|---|
| 2D, `cRot: 0.9` | 43% | 0.68 / 4.63 | 1.67 / 7.37 rev/s |
| finite span, `cRot: 0.9` | 41% | 0.53 / 2.71 | 2.46 / 6.25 |
| **shipped** (finite span, `cRot: cPerp`) | **14%** | **0.37 / 2.11** | **2.05 / 5.01** |

Sideways travel is per unit of height dropped; much over 1.5 and a blade leaves the
frame before it lands. Spin much over 1-3 rev/s reads as flapping rather than
falling. Both are cues to go and look, not pass/fail — `test/fall.mjs` prints them.

### The two that ARE presentation

```
life     1800   plant-time backstop before a blade is dropped, ~14s at 1x
settle   420    plant-time it lies on the ground before fading, ~3.4s
```

**The fade keys off landing, not off a clock, and it has to.** The old animation
faded over a fixed 620 units from letting go, which was safe when descent was a
constant — it always covered the same distance in that time. Real falls vary nearly
tenfold in speed, so the fixed budget had blades half transparent before they were
halfway down: **36 of 96 reached the ground.** Keyed off landing it is 547 of 547
across all eight species. `life` is now only a backstop for the rare glider.

### Coupled to the renderer, on purpose

`BLADE_DRAWN` (0.80) and `BLADE_DRY_SHRINK` (0.12) live in `39_fall.js` although
they are rendering numbers, because **the physics has to be about the blade on the
screen.** `70_app.js` draws a blade at 0.80 of its organ's length; using the organ
length made every plate 1.4x too big and pushed the whole population toward
fluttering. One definition, read by both. If you change how long a blade is drawn,
you are changing the aerodynamics, and that is the correct coupling.

## The air (`37_wind.js`, 2026-07-26)

**Read this section the way you read the fall's, not the way you read the rest of
the file.** There is one dial here and it is the weather. Everything else is a
measured constant or is derived from one, and if the wind looks wrong the thing to
change is the model.

### The one choice

```
uRef       2.5      m/s at yRefM     how hard it is blowing. Beaufort 2
bearing    0.0      rad              which way. Ground plane. A scene picks one
seed       1        -                which realisation of the spectrum is drawn
```

**`uRef` comes off the Beaufort scale, and that is a better answer than taste,**
because Beaufort's force descriptions are *defined by what the wind does to plants*:
force 1 is "leaves do not move", force 2 is "leaves rustle", force 3 is **"leaves and
small twigs in constant motion"**, force 4 raises dust and moves small branches.

It has now been wrong in both directions, which is the useful thing about this entry.
It shipped at 1.2 — force 1 — for exactly as long as it took to measure an attached
blade, which twisted by 0.03 degrees and was reported as "the mechanics is invisible".
It was, correctly: at force 1, by definition, leaves do not move. Then it shipped at
4.0 — force 3 — and a person watching said "too windy" twice. Force 3's own wording is
the tell: *constant* motion describes a busy scene, and this is a quiet close study of
one specimen. **2.5, upper-middle of force 2, is where a viewer reads air rather than
weather.** The load is quadratic in speed, so that is 39% of the force-3 pressure and
eleven times the force-1 pressure.

**This is the one number in the mechanics where the eye is the right instrument**, and
that is not a contradiction of the rest of this file. Everything downstream of `uRef` is
derived from it, so a wrong value here cannot make the physics wrong — it can only put
the scene in the wrong weather, and choosing the weather is composition, not physics.
There is no experiment that settles it. So it is also a **slider in the UI**: `app.setWind(u)`
rebakes the field, keeping the seed, so dragging it reads as the wind getting up rather
than as a different day each frame. `tools/clip.mjs` and `tools/jitter.mjs` both take a
`uRef` argument for the same reason — a before/after on the weather should be two runs
of one binary, not two checkouts.

`uRef: 0` is a dead calm and the field is then **identically zero everywhere** —
asserted in the gate, because a field that trembled at zero wind would be the old
decorative sway wearing a physical name. A still scene has to cost nothing and do
nothing.

### Everything else, and where it comes from

```
yRefM      1.0      m       the height uRef is quoted at. A plant's height
z0M        0.02     m       roughness length. Standard table: mown grass 0.008-0.03
kappa      0.40     -       von Karman
sigmaOverUstar  2.5  -      neutral surface layer. Sets the gust strength from u*
lambdaM    32.0     m       integral length scale, STREAMWISE. See below — 1.0 was wrong
nMode      7        -       octaves of it: 32 down to 0.5 m
spectralSlope  -5/3  -      Kolmogorov. Amplitude exponent is (slope+1)/2 = -1/3
turnover   1.0      -       each eddy decorrelates at its own rate, a_i k_i
```

The chain is: `u* = kappa·uRef/ln(1+yRef/z0)`, then `sigma_u = 2.5 u*`, then the
octave amplitudes are Kolmogorov's and normalised so their variances sum to
`sigma_u²`, then each mode's frequency is Taylor's `k·U` plus its own turnover.
**So "how gusty is it" is not a second dial.** At the shipped weather:

| | at the shipped 2.5 m/s | at the 4.0 it shipped at first |
|---|---|---|
| `u*` | 0.254 m/s | 0.407 |
| `sigma_u` | 0.636 m/s (turbulence intensity 25%) | 1.017 (25%) |
| mean speed at 1 m / at 0.25 m | 2.50 / 1.66 m/s | 4.00 / 2.65 |
| gust peak seen over 40k samples | 1.54 m/s = 2.42 sigma | 2.59 = 2.54 sigma |
| mode frequencies | 0.09, 0.08, 0.27, 0.38, 0.52, 0.38, 1.78 Hz | 0.15, 0.13, 0.43, 0.61, 0.83, 0.61, 2.86 |
| gust variance in 0.3-6 Hz | 22%, 4 of 7 modes | 37%, 5 of 7 |

Turbulence intensity is 25% at both, which is the point of the section below it: the
gustiness is a property of the surface, not of the speed, so turning the wind down does
not make it a different *kind* of air. Every frequency scales with `uRef` — Taylor's
hypothesis is `k·U` — so the slower weather is also literally slower, by the same factor.

### The integral length scale was wrong, and you could SEE it

`lambdaM` shipped at 1.0 m, justified as "of order the height above the ground". That
rule is real and it is about the **vertical** component — the eddies carrying `w` are
limited by their distance from the wall. The **streamwise** component is not: its
integral scale is set by the depth of the boundary layer, and standard wind-engineering
values are tens to hundreds of metres near the ground (roughly 30-60 m at a height of
1 m). Using the vertical component's scale for the streamwise one put **every gust mode
between 3.9 and 19.3 Hz**, which is not wind, it is vibration.

It was reported by eye as two separate complaints — "the whole thing wobbles way too
fast" and "some leaves do a fast jitter" — and both were this one number. Measured with
`tools/jitter.mjs`, before and after:

| | before | after |
|---|---|---|
| stem tip | 0.00 Hz (the old sway was shader-only, so the geometry never moved) | 0.41-0.46 Hz |
| individual blades | **3.8-16.5 Hz** | 0.29-1.10 Hz |

At 32 m the ladder runs down to 0.5 m, the frequencies run 0.08 to 1.8 Hz at the shipped
speed, and about 63% of the gust variance sits in the two slowest octaves, because
Kolmogorov gives the big eddies the big amplitudes. Keep the ladder **wide** rather than
sliding it: the largest eddy is much bigger than the plant so it pushes the whole
specimen together, and the smallest is a fraction of it so the load still varies along
the stem.

Note the frequencies are not monotonic in the mode index (0.09, 0.08, 0.27, 0.38, 0.52,
0.38, 1.78). That is Taylor's hypothesis behaving correctly: a mode whose wavevector is
nearly perpendicular to the mean flow is swept past slowly whatever its size.

**And note what the second fix did NOT change.** Dropping `uRef` from 4.0 to 2.5 barely
moved the dominant frequency of the drawn motion — Spiral Ossuary's stem went 0.53 to
0.60 Hz — because that frequency is the *stem's own first mode*, not the wind's. What
changed by a factor of six was the peak slew, how fast the tip travels through space:
4.15 to 0.67 world units per second. Both complaints were phrased as speed and only the
first one was about frequency; the second was amplitude wearing the same word. If
somebody says it is moving too fast, measure both.

### The two invariants worth knowing about

**Divergence-free, exactly.** Each gust mode is polarised perpendicular to its own
wavevector, and the mean flow is horizontal and varies only with height. The gate
measures the residual with a central difference and it is truncation error: halving
the step quarters it (measured ratio 3.8 against the ideal 4). A field with sources
in it pumps energy into whatever reads it, and once four things read this that would
be very hard to find.

**The gusts do not taper to nothing at the ground, and that is deliberate.** `sigma_u`
is very nearly constant with height through the surface layer even though the mean
speed goes to zero at the roughness height — that is the measured behaviour, and it
is also the only version that keeps the divergence exactly zero. What quietens the
bottom of a specimen is that the bottom of a specimen is stiff, which is step 3.

### The time argument is plant time

Not milliseconds. `70_app.js` keeps both clocks — `age` in plant-time steps, `t` in
real ms — and the old `SWAY` read `t`. A shader driven by wall-clock and a simulation
driven by plant time would be two airs again, in a form that only shows on the time
slider: the plant would speed up and the wind would not. Every rate in `37_wind.js`
is per plant-time unit.

### float32 is the only reason this needs a tolerance

`windGLSL()` emits nine significant figures and the GPU keeps about seven, so the
shader and the simulation cannot agree exactly. Measured on ANGLE/Metal at 96 sample
points spanning `t` 0-10000:

| samples | worst | mean |
|---|---|---|
| `t` < 3000 | 1.6e-5 of mean wind speed | 2.4e-6 |
| `t` ~ 9000 | 1.1e-4 | 2.0e-5 |

**The disagreement grows linearly with plant time**, because a mode's phase is `om*t`
and a float32 holds that to a fixed fraction of its own magnitude. `tools/wind_check.mjs`
reports the two groups separately for that reason and gates at 1e-3 of mean speed — a
tenth of a percent, three orders below anything visible and three above the noise. There
is no useful gap between "the same field" and "not": a dropped mode or a lost sign is
wrong by tens of percent, not by rounding.

If the growth ever matters — a page left running for hours — the fix is not a looser
bound but quantising the baked frequencies onto a common fundamental, so the field is
exactly periodic and the shader can be handed `mod(t, T)`. Shifting them by a fraction
of a percent is physically meaningless: the spectrum is one random realisation of many.

## The petiole (`39_fall.js`, ROADMAP 5, 2026-07-28)

The stalk is the load-bearing geometry in this whole file, and until 2026-07-28 it was
the one piece of it nobody had derived. It came off the STEM's radius at the node —
half of it — and both bending and torsional stiffness go as **r⁴**, so a stalk ten times
too thick was ten thousand times too stiff. It is the pipe model now.

```
kappa       4.5e-4  -   petiole conducting area per unit blade area
ofOrganLen  0.34    -   stalk length as a fraction of the organ (drawn, unchanged)
ofRadius    1.8     -   plus this much of the stem's radius, to clear the shoot
```

**`kappa` is measured twice, from two directions, and that is why it is not a dial.**
Published petiole-area-per-blade-area across broadleaf species runs 2e-4 to 1e-3, and
this is the geometric centre of it. Independently: take an ordinary broadleaf and the
petiole diameter runs about 1 mm on a 4 cm blade, 1.5 on 6 cm, 2.5 on 10 — r/chord ≈
0.0125 in all three, which is `kappa` ≈ 4.6e-4 on the same leaf. `test/wind.mjs` asserts
the shipped stalks land in that band, and they do: 0.010-0.013.

**Do NOT choose `kappa` by what the twist looks like.** The ROADMAP 5 pre-flight
established, before any of this was built, that the blade's twist runs from invisible
through plausible to pinned across `kappa`'s own error bar. A quantity that spans every
behaviour over a borrowed constant's uncertainty cannot be used to pick that constant.
`test/petiole.mjs` section 5 prints all four corners so the sensitivity stays measured.

**And it does not taper**, which deleted the second old constant. A stem tapers because
organs join it along its length; nothing joins a petiole between the node and the blade,
so the pipe model says it is prismatic. `torsionK` is exact for `r0 === r1`.

## The attached blade (`39_fall.js`, ROADMAP 7 step 2 — SHIPS OFF, 2026-07-28)

Read this the way you read the fall's section: there is nothing here to sweep for
appearance. Read it also knowing that **the mechanism it describes is switched off**,
and that the reason is in JOURNAL.md and above `stepFlaps` in `40_plant.js`.

```
enabled    false  -    a falsified mechanism, kept runnable
eModulus   300e6  Pa   THE PETIOLE'S modulus, and NOT the stem's 60e6 — see below
poisson    0.5    -    turgid parenchyma is nearly incompressible -> G = E/3
zeta       0.10   -    structural damping ratio. Measured range 0.05-0.2 in plant stems
rhoTissue  800    kg/m3  hydrated plant tissue. `39a_stem.js` imports this one
sub        12     -    substeps per period of the FORCING (the response is exact)
maxFlap    1.75   rad  a stop, and it has to sit outside the equilibrium
```

**`eModulus` is the one place two parts of this plant are given different material, so
it needs an argument.** It was the stem's 60 MPa, which was defensible while only the
twist read it. Then ROADMAP 7b made the same number decide how far every leaf hangs, and
60 MPa turned out to be a claim rather than a default: it puts a horizontally-held
Cathedral Fern blade **83°** down, which is a rag, not a leaf. 60 MPa is right for the
stem for a stated reason — fleshy, parenchyma-rich, stout-radius axes, and a column in
compression can be built that way. A petiole cannot: it is a cantilever whose entire job
is holding a blade out sideways, and real ones are reinforced for it with peripheral
collenchyma. Herbaceous petiole flexural moduli measure about 0.1-1 GPa (Niklas, *Plant
Biomechanics*); 300 MPa is the geometric centre, chosen the same way `kappa` was. The
check that it is not a dial: at this value the solver reproduces **both** bands the
ROADMAP 5 pre-flight published before it existed — 4.8-13.2° of hang and 6.3-9.5 Hz of
flap — and neither was used to choose it.

**`maxFlap` moved from 1.2 to 1.75 rad, and that is a correction rather than a taste.**
The added-mass torque turns a plate face-on; face-on is a quarter turn from edge-on;
1.2 rad is 69°, which is *inside* 90. On the old petiole that never mattered, because the
blade rocked by a quarter of a degree and the stop was decorative. On a real stalk the
blade reaches its equilibrium, and a stop placed short of it does not bound the model, it
replaces it — every blade parks against the clip and the harness reports the stop's value
back as physics. `test/wind.mjs` had already noticed for its own free-blade check, where
it opens the stop to 3 rad and says why in a comment.

`zeta` is a **third** material constant, which the pre-flight said should make you
re-read rather than reach for it. (It is now joined by a fourth, `rhoTissue`, which is
not new to the project — `39a_stem.js` used to state it separately and now imports it
from here, because the droop balance needs the stalk's own weight and one number with
two homes is one number too many.) The argument for it is a measurement, not a
preference: aerodynamic rotational damping (`cRot`) is *quadratic* in the rate, so at
the microradian amplitudes this geometry produces it does essentially nothing, and a
blade struck by a gust rings undamped forever. Material damping is linear and is what
stops a real petiole. At these stiffnesses 0.1 means the ring is gone within a quarter
of a plant-time unit and the blade simply follows the wind.

### What the petiole works out to, now that it is a petiole

Measured across all eight species at 6000 steps, medians over every mature blade
(`node test/petiole.mjs`):

| species | blades | area cm² | r mm | flap Hz | hang |
|---|---|---|---|---|---|
| Cathedral Fern | 90 | 65 | 0.97 | 8.7 | 12.4° |
| Spiral Ossuary | 90 | 42 | 0.77 | 10.4 | 21.3° |
| Abyssal Frond | 119 | 102 | 1.21 | 7.6 | 10.2° |
| Sun Coral | 96 | 39 | 0.75 | 9.8 | 10.9° |
| Hoarfrost Thicket | 96 | 24 | 0.59 | 11.3 | 20.0° |
| Ember Creeper | 25 | 28 | 0.63 | 9.4 | 9.1° |
| Sulphur Rosette | 29 | 43 | 0.78 | 9.5 | 14.1° |
| Nightglass Parasol | 6 | 108 | 1.24 | 6.8 | 8.6° |

The radius was **6.2-9.5 mm** before and is **0.59-1.24** now; the pre-flight predicted
0.57-1.21 without a solver, which is as close as that kind of arithmetic gets. Blade
areas span 4.5× and the flap frequency spans 1.66×, because stiffness goes as `(kappa·A)²`
while the inertia goes as the area, so the two nearly cancel — the same shape of result
as the stem pre-flight, and the strongest argument that the pipe model is the right law.

**What it did NOT fix is the twist**, and that is the whole reason `enabled: false` is at
the top of `FLAP_DEFAULTS`. On a physical stalk the aerodynamic torque and the spring are
within a factor of two of each other, so the blade reaches face-on and then snaps between
the two face-on attitudes as the wind wanders. Three measurements, all agreeing:

| | |
|---|---|
| twist at the shipped weather | **69° rms**, against 0.10° on the old stalk |
| time within a whisker of the stop | **31%** |
| `tools/jitter.mjs` verdict | blades at 10-25 Hz, peak slew 100× the stem's — **READS AS JITTER** |
| the wind's own highest gust mode | **1.78 Hz** — so nothing is driving 25 Hz |

That last row is the finding. It is not resonance and it is not the integrator: a plate
hinged along its own midrib is statically *unstable* in twist, the aerodynamic centre
sits ahead of a mid-chord pivot, and the pre-flight predicted exactly this. The effective
damping ratio was measured too and sits at its structural 0.12, going negative only 6% of
the time, so it is not a damping problem either. See JOURNAL.md.

### The integrator is exact in the linear part, and that is not an optimisation

A 4000 Hz spring is 200 radians per plant-time unit. An explicit integrator needs
hundreds of substeps per unit not to explode, and the first version — symplectic, 96
substeps, capped — blew the stiffest blade on the specimen through the cap and pinned
it against `maxFlap`, where it read as a plausible 68° twist. The damped harmonic
oscillator is now advanced by its closed-form solution with the aerodynamic torque held
constant over the substep: unconditionally stable at any stiffness, one substep instead
of four hundred, and `sub` only has to resolve the *forcing*.

Everything proportional to the rate goes into that solution's damping rather than into
the constant torque, including a term that can be **negative**: rotational circulation
acting through a centre of area the margin put off the midrib feeds the rock, which is
what leaf flutter is. Held constant across a substep instead, it pumped the spring —
a ringdown in dead air grew from 12° to 27° over eight cycles, with no energy source.

### `tiltPlane` — off, and it is a falsified experiment (2026-07-26)

```
tiltPlane  false   a second rotational plane: the long axis levelling itself
```

Not a dial and not a work in progress: a hypothesis that was tested and failed, kept
runnable so it stays re-measurable (`node test/fall.mjs tilt`). It closes the abscission
seam exactly — long-axis jump 27.1° → 0.00°, chord jump 4.0 → 1.0 — and from any tilt
between 5° and 40° it levels in 0.10 s with no blade of forty going over. Then, once the
pitch tumbles, 32-39 of 40 blades take the long axis past 90° with median excursions of
600-900°, because two independently-solved 2D planes do not exchange angular momentum.
Full reasoning in JOURNAL.md. **Do not switch it on to see if it looks better** — it
manufactures energy, which is not a thing to ship whatever it looks like.

## How far a leaf hangs (`39_fall.js` `bendOf`, ROADMAP 7b, 2026-07-28)

**There is nothing in this section to tune, and that is the entire point of it.** What
was here was `sp.droop`: one constant in `40_plant.js` and eight values in the species
table (0.10-0.95), which were the answer to "how far down does a leaf point". They are
gone. The answer is the tip slope of the petiole under the weight of the blade it
carries, and every input is physics or something the plant already grew.

    theta_horizontal = W L (L/2 + d) / (EI)          W  the blade's weight
                                                     L  the stalk the renderer draws
    theta = theta_horizontal * cos(elevation - theta) d  where the blade's area sits

`d` is the span centroid of the silhouette the margin grew (`bladeArm`), so a blade
carrying its area out near the tip pulls its stalk down further and nothing said it
should. The second line is what makes it a *balance* rather than a formula — only the
component of weight across a stalk bends it, so a leaf held out horizontally hangs the
full amount and one already pointing steeply down barely moves. Four fixed-point
iterations. `BEND_MAX` (1.05 rad) is a stop of the same kind as `maxFlap` and `maxTilt`:
reaching it means the load has left the regime a linear beam describes.

Shipped result: **8.6-21.3° across the eight species**, off no per-species number. The
elevation of a blade's own axis moved from a p50 spanning -35° to +26° (eight tuned
values) to one spanning -34° to -1°. So the catalogue's spread in *hang* narrowed; the
spread in silhouette that remains comes from `organTilt`, `organLen` and the margins,
which were always there.

**Why the petiole is allowed to sag when the stem is not.** `39a_stem.js` argues at
length that a beam's static sag and its first natural frequency are the same
stiffness-to-mass group and cannot be picked independently — at a plant-like sway period
a Cathedral Fern's tip would hang 27 cm low. That is still true here. What differs is
what the plant does about it: a stem is continuously remodelled toward vertical by
gravitropic growth, so the shape it grew into already *is* its loaded equilibrium and its
sag is spent, while a petiole is not, and a leaf hanging below its node is not a defect,
it is the most obvious thing a leaf does. Same arithmetic, opposite conclusion, and the
numbers agree: 27 cm of stem is not a plant and 5-13° of leaf is.

### The scaling reverses across a specimen, and the roadmap expected the other sign

ROADMAP 7b asked for one check: *does a bigger blade on the same stalk hang lower without
anyone saying it should?* It does — 0.5×/1×/2× the area on the stalk the organ actually
grew gives, on a Cathedral Fern, 9.6° / 23.3° / 58.2°. `test/petiole.mjs` section 4
asserts it for every species.

Across the organs of one specimen the answer is the opposite, and it is not a bug:

    W ~ A,  I ~ r^4 ~ (kappa A)^2,   so   theta ~ A / A^2 ~ 1/A

because the pipe model grows a *thicker* stalk for a bigger blade and r⁴ beats the extra
weight. Measured: Cathedral Fern's smallest quartile hangs 21.6° and its largest 11.8°.
This is a known over-compensation — real petioles scale nearer elastic similarity
(r ~ M^(3/8)) than area proportionality, precisely because area proportionality stiffens
faster than it loads — and it is the strongest argument for the successor law ROADMAP 5
records: sizing the stalk off the traffic the midrib actually canalises, which is under
no obligation to go as the area.

## The stem as a beam (`39a_stem.js`, ROADMAP 7 step 3, 2026-07-26)

Nothing here is a dial either. The whole section exists so that the next person can tell
which numbers are physics, which are resolution, and which one is the weather.

```
eModulus   60e6   Pa      the pre-flight's one material constant. `39_fall.js` shares it
rhoTissue  800    kg/m^3  hydrated plant tissue. The pre-flight shares it
zeta       0.10   -       structural damping, as the petiole. Same tissue
cdStem     1.2    -       circular cylinder in crossflow. Textbook
cPerp/cPar 1.95/0.18      the plate model's, so a blade earns the drag its attitude gives
stations   8      -       a RESOLUTION, and section 3 of test/stem.mjs proves it
sub        6      -       integrator substeps per radian of the axis's OWN first mode
subCap     64     -       a flat ceiling on that, and the one number here NOBODY HAS SWEPT
```

### `subCap` is the unmeasured one, and on a conifer it is most of the cost (2026-08-02)

Every other number above is either physics with a citation or a resolution with a
convergence plot. `subCap` is neither. It is a flat ceiling with no derivation, and until
the conifer existed it never bound anything — a herb's axes are few and slow.

Measured on one arrested Ashfall Spire (240 axes, 3002 organs):

```
138,311  load-point evaluations per plant.step(1)
  3,897  the same work at subCap 1                    (35.5x fewer)
    123  of 240 axes PINNED AT THE CAP                (67.2% of all load points)
```

The pinned axes are gen-2 twigs 0.76-0.81 units long with ω₁ of 66-75 — the substep rule
is doing exactly what it says (a stiff tip refines itself) on axes whose motion nobody
can see. After the prefix-sum rewrite the residual per-substep cost is the integrate
block, an M² matvec plus a Cholesky solve, so this is the largest remaining lever on the
simulation half.

**It has not been swept and must not be lowered on a hunch.** Backward Euler is
unconditionally stable, so fewer substeps buys numerical damping of precisely the modes
those twigs have rather than instability — which means a wrong value here does not crash,
it quietly deadens part of the plant. That makes it a resolution-versus-dial question of
the same kind section 3 of `test/stem.mjs` already asks of `stations`, and it wants the
same instrument: sway trajectory against substep count, converged or not.

⚠ **The first attempt at that sweep was invalid and is written up in PITFALLS.** `Bend`
copies `STEM_DEFAULTS` in its constructor, so mutating the module object after the axes
exist changes nothing; sweeping this requires walking the objects
(`for (const a of plant.axes) a.bend.o.subCap = c`). The invalid run reported bit-identical
sway at every setting, which reads as "converged" and means "disconnected".

### The check that mattered

The pre-flight computed the first cantilever mode analytically, off `EI ∝ r⁴` on the
radii the plant grows, **before any solver existed.** That is the whole value of it:

| species | analytic | solver mode 1 | ringdown | ratio |
|---|---|---|---|---|
| Cathedral Fern | 1.17 | 1.26 | 1.25 | 1.07 |
| Spiral Ossuary | 0.48 | 0.58 | 0.57 | 1.21 |
| Abyssal Frond | 0.84 | 0.75 | 0.75 | 0.90 |
| Sun Coral | 1.49 | 1.57 | 1.56 | 1.05 |
| Hoarfrost Thicket | 3.06 | 3.51 | 3.48 | 1.15 |
| Ember Creeper | 0.53 | 0.62 | 0.62 | 1.16 |
| Sulphur Rosette | 15.06 | 9.35 | 9.15 | **0.62** |
| Nightglass Parasol | 4.57 | 4.53 | 4.47 | 0.99 |

`analytic` is a uniform beam on the base radius; the solver is tapered and carries a
real canopy, so agreement to ±20% is as close as those two things can be. Sulphur
Rosette is the stubby outlier the pre-flight already called — a 31 cm plant on an 18.5 mm
base — and it is the one species where the uniform approximation is worst.

Three numbers to check first if this ever looks wrong:

1. **mode 1 against ringdown.** An eigenvalue and a stopwatch, computed independently.
   They agree to under 1% on every species. If they diverge, the integrator is not
   solving the system it assembled — which is exactly how the projection bug was found.
2. **the first mode against `stations`.** 1.261 / 1.262 / 1.259 / 1.264 / 1.264 / 1.263
   Hz at 4, 6, 8, 12, 16 and 24 stations: 0.3% across the range. A number that moves
   with the mesh is a dial wearing a physical name.
3. **`zeta` measured off the decay**, which comes back 0.103-0.113 against the 0.10 set.
   The excess is backward Euler's own dissipation and it is small enough to ignore.

### Sway, which is emergent and enormous in spread

Tip displacement from the grown shape, world units, at Beaufort band edges. The starred
column is what ships. `test/stem.mjs` reads the shipped speed out of `WIND_DEFAULTS`
rather than keeping its own copy — it used to hardcode 4.0, and when the default dropped
it went on faithfully reporting a scene that no longer existed.

| species | 1.6 | **\*2.5** | 3.4 | 5.5 | tip angle at 2.5 |
|---|---|---|---|---|---|
| Spiral Ossuary | 0.29 | **0.82** | 1.57 | 4.12 | 1.9° |
| Ember Creeper | 0.20 | 0.58 | 1.04 | 2.85 | 1.3° |
| Abyssal Frond | 0.19 | 0.40 | 0.89 | 2.13 | 1.1° |
| Cathedral Fern | 0.07 | 0.17 | 0.31 | 0.80 | 0.6° |
| Sun Coral | 0.03 | 0.08 | 0.14 | 0.37 | 0.3° |
| Hoarfrost Thicket | 0.00 | 0.01 | 0.01 | 0.05 | 0.1° |
| Nightglass Parasol | 0.00 | 0.01 | 0.01 | 0.04 | 0.0° |
| Sulphur Rosette | 0.00 | 0.00 | 0.00 | 0.00 | 0.0° |

Around eightyfold between the extremes at the shipped speed, off no per-species number:
`EI` goes as r⁴ and the load goes as the canopy area, so a tall thin shoot with a big
canopy moves and a cushion does not. **Do not "fix" the bottom of that table.**

The harness also asserts that the *top* of the slider still does something — that the
deflection at 5.5 m/s is at least 1.5x the deflection at the shipped speed, for every
species that moves at all. Without that, a `maxTilt` stop could quietly saturate the
whole upper half of the control and the gale would draw the same picture as the breeze.

### Gravity is in the rest shape, and it is not a shortcut

`delta = 1.545 g / omega_1^2` — a cantilever's self-weight sag and its first frequency are
the same stiffness-to-mass group, with nothing free between them. At the measured 1.26 Hz
a Cathedral Fern's tip would hang **27 cm** below where it grew, on a plant 1.08 m tall;
holding the sag under 5% of the height needs the first mode above 2.8 Hz, which is not a
plant-like sway. Real stems escape the trade by being continuously remodelled toward
their target orientation, so the grown shape *is* the static equilibrium. This solves
deviations about it. **If you add self-weight loading here, every specimen will lie
down.**

## Vein level of detail, and a scene with more than one plant (2026-07-29)

Numbers for the change that made a garden possible. Read the JOURNAL entry
alongside it — the interesting part is which law was *rejected*, and why.

### What one specimen costs, on an M5 Mac Pro

Measured in Node, at peak canopy (~2000 steps), against a 16.7 ms frame:

| species | blades | sim ms | geom ms | **ms/frame** | ktri | **kline** |
|---|---|---|---|---|---|---|
| Cathedral Fern | 97 | 1.62 | 7.51 | **9.12** | 18.2 | 78.4 |
| Spiral Ossuary | 83 | 3.37 | 6.45 | **9.82** | 15.6 | 64.8 |
| Abyssal Frond | 97 | 1.76 | 10.17 | **11.93** | 29.4 | 78.5 |
| Sun Coral | 96 | 1.60 | 10.01 | **11.61** | 28.5 | 78.7 |
| Hoarfrost Thicket | 96 | 8.47 | 7.29 | **15.76** | 18.7 | 72.9 |
| Ember Creeper | 82 | 2.70 | 6.18 | **8.88** | 15.9 | 63.5 |
| Sulphur Rosette | 42 | 3.93 | 3.62 | **7.55** | 8.7 | 37.6 |
| Nightglass Parasol | 12 | 0.29 | 2.13 | **2.42** | 7.1 | 10.9 |

**One specimen ate 53-94% of the frame, and the cost was the vein ribbons.**
Crushing the lamina grid 30x (13x6 to 3x2) moves the line count by *nothing* —
78.7k either way — and takes only 37% off the geometry time. Every segment of
every leaf was emitted at every distance as a six-vertex camera-facing ribbon,
26,200 of them per Cathedral Fern, with no gate of any kind.

### The cull law

**Constant vein density per screen pixel, anchored to the camera's framing
distance.** A blade at the camera's own distance keeps every vein it always did;
a blade with a quarter of the screen area keeps a quarter of the ribbons. The
exponent is the inverse square because that is how screen area works — there is
no taste constant in it, and `leaf.veins` is already sorted by traffic, so what
survives is the top of the hierarchy the leaf canalised for itself.

**Do not replace this with "drop anything narrower than a pixel".** That was
tried first and it is the wrong law here, for a reason that is worth knowing on
its own: measured against the app's own camera, **about ninety percent of the
hero's veins are already sub-pixel and already clamped up to the width floor.**
So that rule is not a statement about distant plants — it redraws the subject of
the piece. The hierarchy below roughly `w = 0.3` does not reach the screen as
hierarchy today; it reaches it as a uniform smear that costs full price.

Two pixel widths do two different jobs and must not be conflated:

| | value | job |
|---|---|---|
| width floor | 1.5 px | keeps a minor vein visible at all — predates this, see above |
| `PXR` | angular px | lets a blade rescale both to its OWN distance |

`setView(eye, minWorld, pxPerDist)`. Passing `0` for the third is the pre-LOD
renderer exactly, and `app.veinLOD = false` does that from a browser.

### Light: conserve surface brightness, not ribbon count

An emissive surface looks equally bright per pixel however far off it is, so its
emitted total in **world** units must not move with distance. Two things push it
around and both must be undone:

1. the cull removes ribbons;
2. the per-blade width floor holds survivors at 1.5 screen pixels, so they get
   *wider in world units* the further off they are.

**The second is much the larger.** Left uncorrected a specimen at sixteen focal
lengths came out **fifteen times too bright**, and the cull was under a fifth of
that. Two baked cumulative tables per leaf (`veinLiteNat`, `veinLiteClamp` in
`30_leaf.js`) make the correction O(1) per blade. There must be two: modelling
every vein at its natural width **under-compensates by 60%**, because in that
regime almost every dropped vein was in fact being drawn clamped.

Conserved to ~2% while a useful number of ribbons survive, ~12% on the two
species that fall under a tenth of one — where the specimen is about a dozen
pixels tall. The residual is `veinLite` measuring segments in the leaf's material
space while the blade is drawn through `wAt`; it averages out over hundreds of
ribbons and stops averaging when a handful are left. `test/veinlod.mjs` asserts
15% and says why it is not tighter.

**A blade still canalising is not culled at all** (`dev >= 1`). The tables are
baked over the whole network while the draw loop skips veins ahead of the
development wave, so on a half-grown blade the relight over-brightens — by 69%
across a growing canopy, which is how the guard was found.

### Buffer sizes — set from a measurement, four times now

| buffer | size | floats/primitive | worst reachable case |
|---|---|---|---|
| `tri` | `1 << 23` (32MB) | 30 | 220k triangles, a garden of eight in `natural` — 79% |
| `line` | `1 << 24` (64MB) | 42 | 316k ribbons, a garden of eight in `cells` — 79% |
| `pt` | `1 << 23` (32MB) | 7 | 528k points, the same — 44% |

Every previous size was exceeded by the thing that came next, which is the pattern
to expect rather than a run of bad luck: `1 << 21` was pinned by one dense specimen
with a blade at cell resolution, `1 << 22` by a garden of eight on the very first
frame it was asked for, and the point buffer's `1 << 19` by **one specimen** in the
`cells` view — 90-109% across the species, which is why a whole plant at cell
resolution had never been drawn. The line buffer grew for the same view at garden
scale.

`test/views.mjs` prints the table above and asserts on it, so the next size change
should be a measurement too. **ROADMAP 11 takes `line` back to `1 << 23`** by
emitting a ribbon as twelve floats and expanding it in the vertex shader.

A full buffer used to drop geometry silently, and the failure was a picture that is
merely missing things. It is not silent any more: `Buffers` counts what it dropped,
`saturated()` reports it, the HUD prints it beside the fps and the harness asserts
no drops. The old detection advice — `renderer.nTri`/`nLine` sitting on a round
number equal to `B.tri.length/10` or `B.line.length/7` — still works, but you should
not need it.

### The garden

| knob | value | why |
|---|---|---|
| ring radius | 20 | must clear the blade length; these carry 4-unit fronds, and a ring of 9 puts them through each other |
| head start | 120-2600 steps | a seedling beside a flowering adult beside a seed head — the one thing a single specimen cannot show |
| `warmBudgetMs` | 8 | ms per frame paid toward establishing the stand |

**The head start is not free and must not be paid at once.** A step during
*growth* costs about **1.7ms**, not the ~300us a grown plant costs, because that
is when the leaf pool canalises its library; and a `Plant` costs ~70ms to
construct before it takes a single step, since every `Axis` runs its meristem
forward 220 steps in its own constructor. Seven of each, synchronously, was **19
seconds of frozen tab**. Both are budgeted per frame now: worst frame gap 501ms →
149ms, measured by `tools/garden_hitch.mjs`.

At 8ms/frame a stand of seven takes ~38s to establish. That is interactive
throughout and it reads as the clearing filling in, but if it needs to be faster
the cost is nearly all leaf-library canalisation — sharing libraries between
same-species plants is the lever, and it has a visual cost.

### `senesceHold` — a viewer control, not a mechanism

`0`. Same category as the wind and time sliders: it pauses a stage rather than
inventing one, and a specimen released carries on from where it stopped rather
than jumping.

| | live | shed | mean sen |
|---|---|---|---|
| both at 2400 | 97 | 0 | 0.110 |
| free at 5000 | 78 | 19 | 0.653 |
| **held** at 5000 | **97** | **0** | **0.110** |
| released +1500 | 95 | 2 | 0.583 |

It exists because a garden is mostly *background*, and the piece's timing was
built around one specimen being watched all the way through — left alone, a stand
with staggered ages has half its members dismantling themselves before anyone has
looked at them. `app.holdSenescence()` sets it across the clearing.

## Render views (`70_app.js` VIEWS, ROADMAP 12, 2026-07-29)

**This section is halfway between the two kinds of tuning in this file.** The
weights below are composition — how much of a channel is showing — and they were
set by looking, like `BASE_PAL` above. The two *laws* at the end are not, and
both are anchored to a number rather than to taste.

A view is a set of weights on channels the simulation already computes. Nothing
here changes geometry; every number is an amount of something, not a shape.

| | `natural` | `cells` | `flux` | `field` |
|---|---|---|---|---|
| `lamina` | 1 | 0 | 0 | 0 |
| `veins` | 1 | 0.45 | 1.35 | 0 |
| `cells` | 0 | 1 | 0 | 1 |
| `needles` | 0 | 0.85 | 1 | 0 |
| `stem` | 1 | 0.16 | 0.14 | 0.10 |
| `stemSolid` | yes | no | no | no |
| `fruitSolid` | yes | no | no | no |
| `ripeTint` | — | 0.75 | 0.75 | **0** |
| `spores` | yes | yes | yes | **no** |
| `exposure` | 1.04 | 0.90 | 1.06 | 1.00 |
| `bloom` | 0.38 | 0.22 | 0.30 | **0** |

**`stem` is the one that moved a lot, and it is worth knowing why.** It started
at 0.55 and read as lit frosted glass laid across the tissue behind it — the one
thing in these views that looked drawn rather than measured. The stem's *width*
is unchanged and is not tunable: a ribbon at the radius Murray's law grew is the
stem's true silhouette. Only the brightness moved. `stemSolid: false` is not a
weight at all — `tube()` writes depth, so in a view whose proposition is that
you can see through the organism the stem has to move to the additive pass or it
punches a plant-shaped hole in its own tissue.

**`veins: 0.45` in the cell view is deliberate and not a fade for cost.** The
veins are what the needles fall into; without them a field of needles reads as
milling about rather than as canalising, which is the whole claim.

**`ripeTint: 0` in `field` is a correctness constraint, not a taste one.**
Ripeness and auxin concentration are two different fields and an instrument must
not put one on the ramp measuring the other. Counted before the fix: 3,380 of
36,049 points in a `field` garden were still carrying a species' ripe red.

### The two laws, which are not taste

**Cell level of detail: constant cell density per screen pixel, drawn area
conserved.** The same law as the vein cull, stated for an area instead of a
length, and anchored the same way — a blade at the hero's framing distance keeps
every cell. The table is stored in a stable hashed order so any prefix is a
uniform sample of the lattice; a kept cell stands for `1/shrink` cells, so its
radius scales by `sqrt` and the total emitted area does not move with distance.
Measured by `test/views.mjs`:

```
eye distance   cells drawn   total drawn area
          6           705      1.000x
         12           177      1.005x
         24            44      1.000x
         48            11      1.004x
         96            3       0.977x
```

Do not replace the hash with a stride. The field is stored row major, so a stride
near `nv` samples a single column and the blade comes out as stripes.

**Needle visibility: 2.5 to 10 screen pixels, and this one was set by eye.** The
geometric answer — a needle is legible once it is a pixel or two long — gives a
whole plant 46,000 needles at three pixels each over 200,000 pixels of frame, and
the additive pass turns it white. The question is not whether one needle is long
enough but whether the *field* of them is sampled well enough to read as
directions. See JOURNAL. **Do not narrow this to buy frames** — it is the same
mistake as widening the vein cull, and it makes `cells` and `flux` the same
picture.

## The radius exponent, and what actually sets a stem's taper

`radiusExp` (ROADMAP 14, `test/taper.mjs`). Murray's law — `r³` proportional to the
traffic an axis carries — is measured to hold only *"as long as they do not function
additionally as supports for the plant body"* (McCulloh, Sperry & Adler 2003, Nature
421:939-942). Every axis here supports the plant, so the exponent is a knob. **The
paper's statement of the exception is verified; the replacement exponent is not**, which
is why this is a sweep and not a substitution.

Shipped catalogue, seed 21, 5200 steps, leader axis:

```
  p      r0 mean   rTip mean   taper    lat taper   f1 mean   Greenhill S   rescale
  3.0    18.33mm    12.24mm    1.499      2.50       3.43 Hz     2.23        1.000x
  2.5    25.93mm    15.93mm    1.630      3.60       4.88 Hz     2.82        0.705x
  2.0    43.64mm    23.73mm    1.844      6.66       8.28 Hz     3.99        0.418x
```

`rescale` is the factor `radiusScale` would need to hold the basal radius where `p = 3`
put it — and so to hold `EI`, and so to hold the sway. It clusters at 0.410-0.440, a 7%
spread, so a single global re-anchor would leave species within ±4% of their present
radius, which is ±17% in `EI` and ±8% in `f1`. Not free.

**`radiusExp` ships at 3 and moving it is not recommended on this evidence.** Two reasons,
both measured rather than argued:

**1. The exponent cannot change the profile's shape, only its scale.** After the
reparameterisation `r(s) = tipRadius·(1 + X(s)/tipRadius³)^(1/p)·radiusScale`, the
normalised log-profile is independent of `p` — asserted in `test/taper.mjs` §2 and holding
to 4e-16. Lowering `p` makes a barrel a slightly narrower barrel. It cannot make it a
stem.

**2. The taper is set by `fruitFlow`, by a factor of three over the exponent.**

```
  leader taper r0/rTip                                        MEAN
  shipped                    p=3                              1.50
  p=2                                                         1.84    (+23%)
  fruitFlow = 0              p=3                              4.10   (+173%)
  fruitFlow = 0              p=2                              8.47
  fruitFlow = 0, thicken = 0 p=3                              3.54
```

`fruitFlow: 0.0060` sits against a `tipRadius³` of 1.25e-4 — a floor **48x** the tip's own
baseline, added at every station of a fruiting axis. Adding a constant to both ends of a
ratio compresses it toward 1, so the sink flattens the stem arithmetically.

Against age it is a step change, not a drift:

```
  leader taper, steps:        800    1600    2400    3200    4000    5200
  Cathedral Fern             4.55   1.54*   1.54*   1.54*   1.54*   1.54*
  Spiral Ossuary             3.87   1.41*   1.41*   1.41*   1.41*   1.41*
  Sulphur Rosette            3.88   5.00    1.63*   1.63*   1.63*   1.63*
  Nightglass Parasol         1.48*  1.48*   1.48*   1.48*   1.48*   1.48*
                                                        (* = axis is fruiting)
```

Seven of eight species taper 3.9-4.8 before fruit set — a plausible stem — and become
barrels in the step that sets fruit, permanently, because the leader stops growing so
`X(s)` never changes again.

**`fruitFlow` has no sweep anywhere in this file and never had one.** It is currently the
single largest determinant of the silhouette of every mature stem in the garden. Before
touching it, note that it is not obviously *wrong* — a terminal fruit is drawn through
every station below it, and a stem under a heavy terminal load is genuinely more
cylindrical — so this is a question about magnitude and about what the piece should look
like, not about correctness. Which makes it a different kind of change from this one.

**Greenhill, for scale.** `L_crit = 1.959·(E r²/4ρg)^(1/3)`; real trees carry a safety
factor of 2-5 against self-buckling. The shipped leaders sit at **S = 0.98 .. 1.74 ..
5.57**, so the median is within a factor of two of a real tree — better than this engine
had any right to be, and not the thing ROADMAP 14 was worried about. Lowering `p` raises
`S` by making everything thicker and raises `f1` with it, which is the trade
`39a_stem.js:49-69` already names: a stem stiff enough not to fall over does not sway like
a plant.

---

## Apical control, and the gravitropic set point (2026-07-30, ROADMAP 13)

Three species numbers arrived with the conifer. Two are switched off by default and
the third has a zero point, which is why all eight shipped species came through
unchanged organ for organ (`test/species.mjs`, before and after).

### `apicalControl` — what fraction of the leader's rate a branch apex gets

Borchert–Honda's L. The closed form is the whole of it:

```
    vigour of a lateral, relative to the apex dominating it   =   (1 - L) / L
```

exact, whatever the two subtree capacities are — the flux terms cancel at a fork.
`test/tree.mjs` asserts it to 1e-9 across five values of L. So the number is readable
straight off the crown you want, via the envelope from `test/conifer.mjs` section 3:

```
    half-angle = atan( k*sin(theta) / (zeta - k*cos(theta)) ),   k = (1-L)/L
```

| L | k = (1-L)/L | what it is |
|---|---|---|
| 0.50 | 1.000 | **unbiased.** Every apex in the plant runs at the leader's rate. The default, and the reason the catalogue did not move — it is *not* a no-op relative to the old hardcoded 0.72, but it is within 6% of it and measured to be indistinguishable across the eight |
| 0.65 | 0.538 | |
| 0.75 | 0.333 | |
| **0.80** | **0.250** | **Ashfall Spire.** Measured crown half-angle 9.5deg against a Norway spruce's 8-15 |
| 0.90 | 0.111 | a spire; branches barely leave the trunk |

It replaced `(this.gen === 0 ? 1 : 0.72)` at `40_plant.js:138`, and it also had to be
applied to `sp.internode` — `elongate` stretches the subapical zone at 3.6x the tip's own
rate on shipped defaults and carried **no** generation penalty at all, which is the whole
reason the pre-flight measured a taper slope of 0.94 where 0.72 was intended.

⚠ **It is a stated number and the sweep cannot fix that.** Nobody has derived L; the
Prusinkiewicz lab treats it as a knob and says so. The full flux partition was built to
try and is falsified — see JOURNAL.

### `agoGain` / `agoK` — the antigravitropic offset

`agoGain` **ships at 0**, which is the orthotropic engine exactly. It is not a taper
knob and it is not an angle; it is the size of one of two competing statocyte fluxes,
and the angle is where they cancel. In the continuum limit the ring sum gives

```
    sin(theta*) = ago = agoGain * agoK^n / (agoK^n + iaa^n),     n = prm.nP = 2
```

so `agoK` is the auxin level at which the offset is half its maximum — the direct
analogue of `kP` in `10_auxin.js`, read on the same Hill exponent.

**`agoK` has to straddle the leader's auxin and a lateral's, and that is the whole of
choosing it.** A lateral's statocyte auxin is essentially its own vigour, so at
`apicalControl` 0.80 it sits at 0.25 while the leader sits at 1. Measured set points at
`agoGain: 1.0`:

| `agoK` | lateral (iaa 0.25) | what happens |
|---|---|---|
| 0.45 | 50deg | branches sweep up; reads as a young fir |
| **0.90** | **66deg** | **Ashfall Spire.** Bang inside the measured GSA range for real laterals (WT Arabidopsis 63deg, SD 7) |
| 1.60 | 79deg | near-horizontal, and a gen-2 branch would droop past level |

Two things not to do. **Do not use `agoK` to widen the crown** — it moves the half-angle
by about 3 degrees across its whole useful range while `apicalControl` moves it by
tens, because the envelope depends on `k` far more strongly than on `theta`. And **do
not raise `agoGain` above about 1.4**: `sin(theta*)` clamps at 1, so everything past
that is a 90-degree branch and the knob has stopped meaning anything.

The within-crown gradation is not tuned at all and should not be: an axis's statocyte
auxin is its own apex plus every apex above it attenuated over `dominance`, so branches
near the leader stand up and branches far below it lie out flat, measured at 52.9deg in
the top quarter against 63.3deg in the bottom. That is the same field that decides
whether a bud escapes, read a second time.

## How full a crown is (`70_app.js` Ashfall Spire, 2026-07-31)

Prompted by a person watching: *"much too sparse... real charlie brown xmas trees."*
Three knobs, and the reason no single one of them works is that they fight each other.

**`budTake` — what fraction of escaped buds build a shoot.** New, and it was a hardcoded
`0.35` in `40_plant.js` before. **Default 0.35, so every herb is unchanged.** The conifer
ships at **1.0**, which removes the coin flip entirely and leaves branch count to
`exp(-d/dominance) > branching`.

    budTake   axes   organs   fill
      0.35      30      702   0.546
      0.45      39      898   0.604
      0.60      51     1215   0.672
      0.75      60     1429   0.714
      1.0       77     1601   0.750     <- ships

`fill` is ink over the crown's own rasterised outline, per row. **Do not use needle area
over silhouette area**: both terms scale together and it returns ~0.28 for every variant
including ones that plainly differ. That mistake cost two wrong diagnoses.

**`organBudget` — and it is a POOL over the whole specimen.** This is the one that is not
obvious. Raising `budTake` on its own divides the same 540 organs among three times as
many branches and **the tree gets smaller**: 46.1 -> 35.3 units tall, crown radius
7.9 -> 4.3. It went 540 -> 1200 for `budTake`, and **1200 -> 3000 for `maxGen: 2`**
(2026-08-01), which is the same trap arriving a second time: a change that multiplies
axes has to be paid for out of the pool or it starves the leader's top. **Any time you
add axes, budget in the same commit.**

`fill` cannot referee that, and this is where two sessions have now gone wrong: fill is
normalised by the crown's own outline, so it reports "denser per unit of outline" and
never "more tree". **Read crown radius and blade area beside it.**

**`maxOrgans` stays at 80, deliberately.** It caps the **leader**, so the extra budget
goes into branches rather than into a taller trunk. With it left alone the height stays
at 46.1 to the digit while fill moves 0.559 -> 0.752. Raise it and you get a taller
tree, not a fuller one — measured twice now, and the second time was someone reaching for
it as a **density** knob to fill the leader's bare top: **130 gives a 70.6-unit specimen
with the same bare top.** It sets leader LENGTH. Whatever fixes the top is not this.

**`organLen` — nearly free, and it saturates.** 1.45 -> **3.0**. Drawn area per organ at
no extra organ: 153.6k triangles against 153.8k. It saturates hard — 3.0 and 3.8 are
within 0.003 of each other — and it does **almost nothing alone** (0.559 -> 0.570 at 540
organs). It is a multiplier on having branches to hang needles from. Because of it, 1200
organs at 3.0 reaches the same fill as 1600 at 2.1, which is where the 25% saving came
from.

**`maxGen` IS 2 NOW, AND THE ENTRY THAT SAID OTHERWISE WAS MEASURED WITH A RETRACTED
RULER (2026-08-01).** This block used to read *"stays at 1. Second-order branching is the
obvious idea and it is falsified: fill 0.281 -> 0.268 for 4.8x the simulation cost."*

**0.281 is the signature of the metric the JOURNAL entry it cited retracts three
paragraphs later** — needle area over silhouette area, which "came back 0.28 for every
variant including ones that plainly differed". Every fill number on this page comes from
the raster metric that replaced it and they live at 0.51-0.77. Three rejected values
(0.281 / 0.268 / 0.311) sat nowhere near any of them, which was visible for free on the
page. And `maxGen` was never in `test/crown.mjs`'s sweepable knob list, so the working
instrument had **never been pointed at the one change the broken one killed.**

Re-measured with it, two seeds:

    maxGen  axes  organs  height  crownR  blade area  fill @3840  on screen
      1       77    1201   46.06    6.87       672.9      0.7721     0.8323
      2      240    3002   46.06   11.53      1702.3      0.7361     0.7912

Fill falls 4.7% while **crown radius nearly doubles and blade area goes up 2.5x at
identical height.** The old sentence — "sub-branches grow the silhouette as fast as they
fill it" — is arithmetically true and beside the point: fill is ink over the crown's
**own** outline, normalised precisely so a crown cannot score by getting bigger, which is
exactly what makes it unable to see this change. **When a metric is normalised, the
normaliser is a statement about what it refuses to measure.**

The outside evidence says this is nearer the floor than the ceiling. Fabrika, Scheer,
Sedmak, Kurth & Schon 2019, *BioResources* 14(1):908-921, on a **10-year-old Norway
spruce** stand, >12,000 growth units across 15 trees: **first order 26.7%, second 52.8%,
third 16.6%, fourth 4.0%** — three quarters of a real sapling is second order or higher,
and ours was 100% first. Kozlowski & Ward 1961 (Table 3.2 in Kozlowski & Pallardy,
*Physiology of Woody Plants* 2nd ed.) found **quaternary** axes on six-year-old red pine,
white pine, white spruce and black spruce.

**BOTH CAPS HAVE TO MOVE WITH IT AND THAT IS THE WHOLE TRICK.** `maxGen: 2` alone hits
`maxAxes` and the organ pool is spent low in the crown, starving the leader's top third —
the same pool trap as raising `budTake` alone. Ships at `maxAxes` **240** and
`organBudget` **3000**, which hold height at 46.06 to the digit while the crown fills.
Pushed past it (4200 organs, `maxOrgans` 110) the triangle buffer saturates and drops
27-38k triangles.

**It costs 2.5x the organs and that is shipped knowingly**, same as #32's crown: linear in
organs, so it belongs to ROADMAP 10b and 11. **Do not buy frames back by lowering
`maxGen`** — that restores the defect, and a person watching called it out before any
number here did.

**What it costs, and it is shipped knowingly.** A grown stand of seven with two conifers,
both fully arrested: 48.1 -> 127.5 ms/frame, 20.8 -> 7.8 fps, 1349 -> 2672 organs. Linear
in organs, so it is ROADMAP 10b and 11 rather than anything to tune here.

**Two ways to measure this wrong, both of which produced confident nonsense first:**

- **Profile only an ARRESTED specimen.** A cost sweep over `organBudget` went *down* as
  the tree got bigger, because at the larger budget it had not arrested yet and a live
  meristem is a different program from a retired one. Grow to `spent()` first. Arrested,
  the ratio is 2.2x; the naive sweep said 8x.
- **Match the camera before comparing geometry counts.** Two framings of the same scene
  gave 3,184 line vertices against 265,328 and nearly bought a whole false theory about
  the vein LOD's anchor. At matched `cam.dist` it is 108k against 200k, and there is no
  anomaly.

**The needle is still a paddle, and `marginBias.ay` is the knob that fixes it.**
`aspectFloor: 0.04` does not bite — the margin grows 0.193 on its own. `ay` is a **pure
width knob**: over 0.16 -> 0.003 the margin's *length* is flat (x0.66 to x1.07, no trend)
while its *half-width* falls 17x.

     ay      len      halfW    aspect    cells  veins
    0.16    5.3168   1.1339   0.2133      93     86     <- ships
    0.05    5.6707   1.0044   0.1771      61     60
    0.02    3.5066   0.3612   0.1030      76     73
    0.012   3.6273   0.2251   0.0621      98     95
    0.008   3.7120   0.1576   0.0425     100    100     <- spruce band
    0.005   3.7639   0.1025   0.0272      55     39
    0.003   4.2557   0.0672   0.0158      44     35

A Norway spruce needle is 0.02-0.05, so `ay` ~0.005-0.012, and the lattice still builds
there. **Do not conclude from the top of this sweep that it saturates** — between 0.16
and 0.05 the aspect moves less than one leaf differs from another, so that stretch is
noise shaped like a plateau, and an earlier pass stopped at 0.02 and wrote "saturates"
into four files. Separate a ratio into numerator and denominator before calling a knob
dead.

**Not shipped yet because of a real tension**: a needle 4.5x narrower covers 4.5x less
crown, and the fill ladder above was measured on **paddles**, so it does not carry over —
`organLen` saturating at 3.0 is a statement about needles that already overlap. It is
*cheaper* (92.9k -> 58.1k line vertices), so there is headroom to spend recovering the
fill. ROADMAP 13 item 0.

## The needle, and the ladder re-run on it (ROADMAP 13 item 0, 2026-07-31)

**There is an instrument now.** Both ladders above were measured in a scratch script that
no longer exists, which made "re-run the ladder from scratch" impossible to do honestly.
`test/crown.mjs` is that measurement as a harness: ink over the crown's own rasterised
outline, per row. It reads the shipped paddle tree at **0.772** against the lost script's
0.750, and the pre-#32 Charlie Brown tree at **0.576/0.493** against its 0.546 — so the
two instruments agree to a few percent at both ends of the range that matters.

**Read two numbers, not one, and they answer different questions.** `fill` is pixel
coverage, so it means nothing without a stated raster:

- **ON SCREEN (960 rows)** is the whole-tree framing `tools/tree_shot.mjs` shoots at,
  ~21 px per world unit. It is what "reads as sparse" is a statement about.
- **HOW MUCH IS THERE (3840 rows)** is the finest raster at which a needle is still four
  pixels across. Coarser than that and the number is the sampler's rounding.

The two separate exactly when the ink stops being resolvable, which is what this change
does: a needle at the whole-tree framing is **2 px across**, so the on-screen number
flatters it. The viewer's eye has the same problem, which is why both are kept rather
than one being called correct.

### `ay` — and 0.012 is the place to sit, not 0.008

Measured across three seeds on the shipped species' own margin chemistry, not a
hand-passed config:

    sp.ay    aspect (3 seeds)       n50   cells     spruce band 0.02-0.05
    0.16     0.201 0.224 0.232       1    83-100    <- ships, a PADDLE
    0.012    0.040 0.058 0.047       1    78-87     <- inside the band
    0.008    0.047 0.054 0.040       1    71-82     <- inside the band

Both candidates are in the band and both hold `n50 = 1`, the single unbranched bundle a
*Picea* needle has. **0.012 is the better buy**: the same needle by every venation
statistic, and it holds materially more crown. ROADMAP named 0.005-0.012 without
distinguishing within it; the wide end is where to sit. Cells stay at 78-87, clear of the
44-55 floor where the blade runs out of tissue to canalise — **that floor, not the
aspect, is the real limit on this knob.**

### The ladder, re-run on needles

Two seeds, both arrested, `organBudget` untouched at 1200:

    variant                                on screen        resolved
    PADDLE ship      ay .16  oL 3.0      0.832 0.824      0.772 0.773
    PADDLE pre-#32   budTake .35         0.673 0.562      0.576 0.493   <- "Charlie Brown"
    NEEDLE           ay .008 oL 3.0      0.617 0.574      0.419 0.352
    NEEDLE           ay .008 oL 3.8      0.644 0.616      0.470 0.388
    NEEDLE           ay .008 oL 4.6      0.665 0.649      0.511 0.416
    NEEDLE           ay .008 oL 5.4      0.683 0.671      0.544 0.440
    NEEDLE           ay .008 oL 6.5      0.693 0.689      0.573 0.463
    NEEDLE           ay .012 oL 4.6      0.712 0.678      0.586 0.526
    NEEDLE           ay .012 oL 5.4      0.725 0.712      0.618 0.567

**Setting `ay` alone is worse than the tree a person called a Charlie Brown tree.** At
the shipped `organLen` the needle lands at 0.419/0.352 resolved against the pre-#32
tree's 0.576/0.493. ROADMAP said this change "walks the specimen straight back toward the
sparseness that was just fixed"; it walks **past** it. Do not ship the one-parameter
version — and note that the on-screen column hides this, reporting 0.617 against 0.673,
which is the whole reason the resolved column exists.

**`organLen` does NOT saturate on needles.** The ladder above records it saturating at
3.0, with 3.0 and 3.8 within 0.003 of each other. On needles every step still buys:
+0.051, +0.041, +0.033, +0.029 of resolved fill. That entry was a statement about needles
that already overlap, exactly as ROADMAP 13 item 0 predicted, and it is the cheap axis
because it costs no organs.

### The point it would have shipped at, and why it did not

**Nothing here ships. The needle was built, measured, drawn and rejected** — see the
2026-07-31 JOURNAL entry, and note the reason is not in this table. `ay .012` +
`organLen 5.4` was the cost-neutral candidate (no extra organs, 92.9k -> 89.1k line
vertices) and the ladder runs past it:

    ay .012                              on screen        resolved     organs
    oL 5.4  bud 1200   <- SHIPS        0.725 0.712      0.618 0.567     1201
    oL 5.4  bud 1800                   0.752 0.732      0.655 0.593     1800
    oL 5.4  bud 2400                   0.751 0.727      0.658 0.592     2402
    oL 6.5  bud 1800                   0.790 0.769      0.712 0.643     1800
    PADDLE, for reference              0.832 0.824      0.772 0.773     1201

**And then a person looked at it and the whole table stopped mattering.** What the
candidate actually ships as a *picture* is a blade only **1.9x narrower than the
paddle** (half-width 0.4251 -> 0.2211 world, 8.84 -> 4.51 px at the whole-tree framing),
because half-width is aspect times length and `organLen` gave back more than half of
what `ay` took away. Every ratio statistic in this file still said "needle" — aspect is
preserved — and `fill` measures coverage, not width, so **nothing in the ladder could
see it.** Ask what class of quantity the table measures, again.

The frontier underneath is real and no row escapes it. At a true needle width (2 px)
organs make fill *worse* (0.617 / 0.605 / 0.581 over budgets 1200 / 1800 / 2400), and
`ay` stops responding below about 0.008, so width is floored near `0.044 * length`. You
can have a thin needle or a full crown. `aspectFloor` was checked on suspicion and is
**not** the cause — 0.04 and 0.012 give identical results, so this file's older claim
that it never bites survives.

### Organs are the wrong lever, and past ~1800 they REVERSE

The obvious way to buy the rest of the fill back is more needles. It does not work, and
this is the sharpest result of the re-run. At `ay .008, oL 4.6`, sweeping the pool:

    organBudget   organs   crown R   resolved fill
       1200        1202      7.01       0.5112
       1800        1800      9.45       0.5345
       2400        2402     11.87       0.5341
       3200        3202     14.95       0.5080

**It peaks around 1800 and then falls.** The crown radius more than doubles over that
sweep, and `fill` is ink over the crown's own outline — so the extra organs grow the
silhouette as fast as they fill it. That is **the same mechanism that was read as
falsifying `maxGen: 2`**, arriving on a different knob, and it is why this change needed
no organ budget at all.

⚠ **Read that comparison the other way round now (2026-08-01).** `maxGen: 2` was
un-falsified and ships; see the `maxGen` block above. What the two cases share is real —
fill is normalised by the crown's own outline, so **neither of them can be judged by fill
alone.** What differs is that on this knob the crown got bigger and *emptier*, while
second-order branching nearly doubles crown radius and multiplies blade area 2.5x for a
4.7% fill cost. **A flat fill number means "denser per unit of outline", never "more
tree".** Print crown radius and blade area beside it or the statistic will mislead you in
whichever direction you were already leaning.

`organTilt` is the other free axis and it is nearly dead: 0.92 -> 1.40 moves resolved
fill by 0.009. Self-overlap is not what limits a needled crown.

**What this means for ROADMAP 10b.** The needle did not have to be paid for in
simulation cost, so 10b should not be sized as though item 0 owed it anything.

**The free axes alone recover most of the loss.** `ay .012` with `oL 5.4` reaches
0.618/0.567 resolved and 0.725/0.712 on screen with the organ budget untouched — clear of
the Charlie Brown line without spending a single organ. Exhaust this before ROADMAP 10b
has to pay for anything.

### What overlap buys, and why any of this is affordable

Across the change actually proposed, ay 0.16 -> 0.008 at fixed everything else:

    blade tissue      673 ->  139 sq units     4.85x less
    drawn ink         197 ->  140 sq units     1.41x less

Tissue falls 4.9x and the picture only 1.4x, because at paddle width most of the foliage
is behind other foliage. **That gap is the redundant tissue and it is what pays for this.**

**A trap on the way to that number, and it is this file's own lesson arriving again.**
The instrument's width-response check was first written as a 2x nudge from the shipped
`ay`, and it passed while measuring nothing — it read a 1.03x ink change as "coverage has
saturated". It is nothing of the kind: 0.16 -> 0.08 moves the *tissue* by 1.07x, because
that is the flat top of the sweep this file already warns about by name. The ratio said
nothing true until it was split into numerator and denominator. Same lesson, same knob,
two documents apart.

## The agent in the tissue (`15_pathogen.js`, 2026-08-02)

**Read the top of the fall's section first — this one is closer to that than to the
rest of this file.** Most of these numbers are not free parameters to be swept
into place. Four of them come off literature anchors, two are properties of the
*agent* rather than the plant (so they are the disease's species definition, not a
tuning target), and one is a genuinely new stated constant booked in SCIENCE.md.

### What each number is, and whether you may sweep it

| knob | what it is | may I sweep it? |
|---|---|---|
| `r`, `clr` | replication and host clearance | **as a ratio only.** `R0 = r/clr` is the meaningful quantity; nothing invades below 1 |
| `Dv` | plasmodesmal spread rate | **derive it, do not dial it** — see below |
| `chi` | carried by the auxin flux `J` | ⚠ **not literature-supported.** Nothing pathogenic moves in the polar transport stream. `[OURS]`; ships only on `systemic` |
| `dRho`, `dMu`, `dComp` | which variable the agent deforms, and its sign | **no.** This is the agent's genome — `iaaM` is a `rho` gene, `iaaL` is a `mu` gene. Pick, do not sweep |
| magnitude of the above | how hard it pushes | **pick from the table, do not sweep.** Free IAA moves 2.5x under iaaM despite a 945x precursor; PAT falls 50-80% under `6b`; PIN2 rises 35x under *Pantoea* |
| `pdGate`, `pdN` | auxin closing plasmodesmata | shape is demonstrated; the half-point is ours |
| `clampMu`, `clampK` | the host's GH3/DAO response | ⚠ **`clampK` is a new stated constant.** SCIENCE.md books it |

### The endemic titre is not the carrying capacity

`r v (1 - v) = clr v` settles at **`v* = 1 - clr/r`**, not at `vCap`. This matters
for every threshold you write: an agent at `R0 = 1.29` establishes permanently at
a titre of **0.222**, and a detector looking above 0.5 reports it as failing to
invade. A mild agent is a low-grade permanent deformation, not an all-or-nothing
one. `burden(thresh)` takes the threshold for exactly this reason — pass a
fraction of `v*`, not a fixed number.

### Sizing `Dv` from the organ, which is the only honest way to do it

The extent of a lesion is set by how far a slow front gets before the organ stops
developing, so `Dv` is derived from the organ's own clock rather than chosen:

- a blade's interior lattice appears at step ~1401 and it matures at ~2302, so the
  agent has **37.8 time units** (`dt` 0.014 x 3 substeps x 901 steps)
- the lattice is ~22 hops from its middle to its edge
- a third-of-a-blade lesion therefore wants a front near **0.19 cells/tu**
- `c = 2 sqrt(Dv (r - clr))`, so **`Dv (r - clr) ~ 9e-3`**

At `r = 0.85, clr = 0.05` that is `Dv ~ 0.011`; the gate takes another ~23% off,
so `lesion` ships at **`Dv: 0.008`** and measures burden **0.36**. The sweep that
confirms it, inoculated mid-blade:

| `Dv` | `r` | predicted `c` | burden |
|---|---|---|---|
| 0.300 | 0.85 | 0.980 | 1.000 |
| 0.080 | 0.85 | 0.506 | 1.000 |
| 0.030 | 0.85 | 0.310 | 0.810 |
| 0.010 | 0.85 | 0.179 | 0.518 |
| 0.004 | 0.85 | 0.113 | 0.323 |
| 0.030 | 0.25 | 0.155 | 0.101 |

Two orders of magnitude below the other agents is **not** a fudge: real
plasmodesmal movement is slow next to polar transport. TMV manages ~6 cells/day
against PAT at 5-20 mm/h, roughly two orders of magnitude slower, which is the
regime this sits in.

### Do not use the plasmodesmal gate to bound a lesion

`pdGate` is worth having — it takes ~23% off the front speed and the auxin doing
it is the agent's own, confirmed by a `dRho = 0` control that is unchanged. But
**it does not self-limit**, whatever the research brief's `[OURS]` paragraph says.
The medium is homogeneous and every coupling is local, so the system admits a
travelling wave and a travelling wave has one speed; the front *accelerates*
toward its asymptote (0.570 → 0.742 → 0.794 cells/tu) rather than decaying.
`test/pathogen.mjs` section 6 asserts this so it cannot quietly stop being true.

If you want a genuinely self-limiting lesion you need something that breaks
translation invariance — clearance that rises with cumulative damage is the
obvious candidate and it is not built.

## The flower field (`flowers/`, `?garden=N`, 2026-08-12)

The flowers piece grows a whole field now. Its numbers live here for the same
reason everything else in this file does, with one caveat at the top: **almost
every constant in this section is environment or staging, not chemistry.** Where
a plant stands, where the camera stands, how thick the air is and how coarse a
distant blade is drawn are the `37_wind.js` category. Nothing here touches what a
plant *is*, and a wrong value can only make the scene wrong, never the physics.

The full argument for each is in `flowers/README.md` ("A GARDEN"); this is the
table, plus the two things that must not be dialled.

| knob | file | ships | may I move it? |
|---|---|---|---|
| `FL_GARDEN_SPACING` | `35_garden.js` | 12 | ⚠ **a stated fraction of a measurement** — see below |
| `FL_FIELD_PACK` | `35_garden.js` | 0.83 | derived: `R = s sqrt(1.5 N / 2.19)` off the dart-throwing saturation density |
| `FL_GARDEN_STAGGER` | `35_garden.js` | 1200 steps | taste — but re-take any field profile after moving it |
| `FL_GARDEN_COHORT` | `35_garden.js` | `max(2, min(4, ceil(n/3)))` | taste; it exists so the opening frames are a field |
| `FL_STEP_BUDGET` | `35_garden.js` | 8 | ⚠ it is the world clock's rate limit — see below |
| `FL_RECAP_HZ` | `35_garden.js` | `1.78 * 4` | **no. Nyquist against the wind's fastest gust** |
| blade-mesh cap | `28_lod.js` | 1 quad/pixel | **no. Nyquist against the raster** |
| `FL_HAZE` | `25_ground.js` | `[2.0, 3.0, 1.5, 5.0]` | by looking, in `uRef`'s category (`?haze=G,H,P,N`) |
| `FL_SKY_LEAD` | `25_ground.js` | 0.35 | measured — see below (`?sky=`) |
| `FL_POOL` | `25_ground.js` | `[1.0, 5.0]` | the 5.0 is the solo page's shipped `exp(-r*0.20)` re-spelled; **a field's length scale is not in here** and must not be pasted in — see below (`?pool=K,R`) |
| `FL_DIR_SHOTS` holds | `45_director.js` | 16/12/26/18/16/9 s | by eye, and only by eye. Six shots now; ~127 s of cycle |
| `FL_DIR_ORBIT_HOLD` | `45_director.js` | 25 s | by eye. The solo page's 6 s is wrong for a field: a viewer who drags is walking around *in* a place |
| `FL_DIR_HERO` | `45_director.js` | 1.25 | ⚠ **it is paying for a limitation** — delete it the day the sight-line cull follows the subject instead of specimen 0 |
| `FL_DRIFT` | `45_director.js` | 0.0075 /s | **by eye**, `uRef`'s category — but it is the one rate the whole film is quoted in; see below |
| `FL_DIR_VPEAK` | `45_director.js` | 26 u/s | **derived** — it reproduces both hand-set transition times it replaced |
| `FL_GLIDE_K` | `45_director.js` | 3 | stated, and stated as a ceiling: at 1 the traverse is indistinguishable from the drift every other shot carries |
| `FL_LOW_SKY` | `45_director.js` | 0.62 | by eye, and it says so in the file |
| `FL_RACK` | `45_director.js` | `[0.35, 1.35, 1.2, 0.45]` | the amplitude is the lens's own depth of field (`uRange`), not a choice; the window and the caps are by eye |
| `FL_POLLEN.minAng` | `18_pollen.js` | 0.004 | **by eye**, off a measured ladder — see below (`?pol=`) |
| `FL_POLLEN.fogK` | `18_pollen.js` | 0.45 | by eye, and it is the one weight that could **not** be taken from the shipped fog |

### `FL_GARDEN_SPACING` — 12 is 62% of what the sweep says, deliberately

Measured, not chosen: 8 flowering species x 4 forms x 5 seeds grown to 3000 steps,
horizontal reach taken off the **drawn streams** (`scratch/g2_placement/`, table in
`seedsweep.out`, 160 cells).

| | p10 | med | p75 | p90 | max |
|---|---|---|---|---|---|
| `maxR` outermost vertex | 3.6 | 9.7 | 14.4 | 23.2 | 70.9 |
| `r90` the body | 2.2 | 5.0 | 7.5 | 12.1 | 20.4 |

12 is full clearance of two median **bodies** (2 x 5.0) with margin and **62% of
full clearance of two median arms** (2 x 9.7 = 19.4). The other end was measured
and rejected by looking: at 19-44 units apart, plants 20-48 units tall stop being a
stand and read as a row of isolated specimens. The shipped `plantGarden`'s 2.5 was
~5x too small in the direction that shows — at `garden=7&seed=21` two specimens had
grown *through* each other.

**Do not "fix" the overlap that remains by raising it.** The tail is not a species
property and it is not bounded in time: an Ember Creeper columbine reaches `maxR`
7.4 at seed 21 and 65.9 at seed 31697, and sampled every 200 steps that specimen
goes 11.9 (step 1000) → 28.8 → 44.4 → 70.9 (step 3200), still climbing linearly.
Reproduce with
`node scratch/g2_placement/arc.mjs '{"species":"Ember Creeper","form":"columbine","seed":31697,"end":3200}'`
(re-run 2026-08-12, reproduces every figure). No fixed spacing keeps a creeper off
its neighbours; that is `organBudget` and apical control's business, not
placement's.

### `FL_STEP_BUDGET` — the pool that slows garden time instead of the frame rate

The pool is `max(FL_STEP_BUDGET, nAct)` `plant.step()` calls a frame, and each
active specimen may spend `floor(pool / nAct)` of it. A solo page never feels it (1
active, 8 ≥ the 6-step frame cap). **A field does, and the effect lands on the
clock rather than the frame rate:** at N = 12 every plant is allowed exactly one
step a frame against the solo page's six, so the world runs ~6x slower per
wall-clock second and a garden of twelve takes ~6x as long to reach bloom. That is
a deliberate trade — a heavy frame slows garden time rather than killing fps — but
it is a statement about how long a viewer waits, and **it has not been watched.**

### The two that are Nyquist, and are not dials

`FL_RECAP_HZ` and the blade-mesh pixel cap look like quality knobs and are not.
`FL_RECAP_HZ = 1.78 * 4` is four samples per period of the wind's fastest gust mode
(`37_wind.js`); below ~3.6 Hz the air judders and reads as a solver bug, which is
the same bound `tools/blender_seq.mjs` states about its frame stride and
`15_petal.js` states about its ripple. The blade cap is one quad per pixel, off the
drawing buffer's own height and the camera's own fov. **Lowering either to buy
frames is the vein-cull mistake in a new place** — it makes the piece cheaper by
making it a different piece, and unlike a taste constant there is no argument
available for where the new value should sit.

### `FL_SKY_LEAD` — 0.35, and what a plain mean costs

A garden's atmosphere is blended across the species standing in it. Averaging
palettes in RGB cancels hue against hue: on the field at `garden=7&seed=21` the
plain mean fog has saturation **0.261 against a member mean of 0.598**, and
`keyCol` **0.090 against 0.328** — near-grey. `flFieldPal` keeps the weighted
mean's luminance and hue direction and rescales its chroma back to the members'
mean, clamped so no channel goes negative; that puts blended fog saturation at
**0.527**.

The hero's extra weight over an equal share is then the only free number here, and
it is set against a measurement rather than a preference: over 40 fields of seven,
the mean pairwise angle between two gardens' fog **hues** is **84° at lead 1.0, 64°
at 0.35 and 27° at 0.0**. A pure field mean gives every garden nearly the same sky —
0.35 keeps about two thirds of the between-garden variety while still being the
field's air rather than the hero's.

### The film's one rate: `FL_DRIFT`, and the two numbers derived off it (2026-08-13)

`FL_DRIFT = 0.0075` — the picture translating by 0.75% of its own width per second —
is by eye and is in `uRef`'s category, but it is worth more than a taste constant
because **everything else about the camera's motion is quoted against it.** Two
consequences fall straight out of it being *screen-referred*: a lateral drift is
distance-scaled (4.4 cm/s at the establishing shot's 88.7 units, 0.4 cm/s at the
close-up's 8, the same speed on screen), and an **orbit is therefore a constant
angular rate** — 0.46 °/s, independent of everything — which is why the orbit is a
term in the shot *heading* rather than in each pose.

It replaced three of six shots holding **absolutely still**: measured over 120 s at
`?garden=7&seed=21&ff=3000`, the camera spent **15.4% of its samples** moving slower
than a thousandth of a frame width per second, and the per-shot slow-decile drift
before → after was `wide` 0.101 → 0.805, `bank` 0.021 → 0.580, `low` 0.015 → 0.485,
`close` 0.873 → 0.723, `dolly` 2.114 → 3.635 %frame/s. ⚠ **The close-up was never
the offender** and is now marginally *slower* than it was, because its three
exponential lerps converge so slowly that it always crept. Know that before trying
to make the close-up move more.

⚠ **Do not take the "0.00 → 0.49-0.81" that the first write-up of this quoted.** The
left-hand column was reasoned rather than measured — the per-shot statistic was added
to `tools/flowers_clip.mjs` *after* the baseline run — and the baseline was then
re-run from the previous build with the same instrument for the same 150 s. The real
numbers are the ones above, and one of them is a correction rather than a refinement.

**`FL_DIR_VPEAK = 26 u/s` is derived and that is the reason to trust it.** The
transitions used to be 5.0 s for four shots and a hand-added 7.5 s for `wide`, and
the comment that set them did the arithmetic out loud — so the constant actually
being held fixed was the *peak speed*, and the durations are what it implies:
`trans = 1.5 * distance / VPEAK`, clamped to [3.5, 9.0] s. That gives **5.02 s and
7.85 s** against the 5.0 and 7.5 set by hand, and it caps the whip the fixed
transition allowed (peak 44.2 → 26.6 u/s). 26 u/s is 1.63 m/s in `WORLD.unitM` — a
walk. It is a law rather than two numbers because the distances are not fixed:
`?garden=12` is a 107-unit field where `?garden=3` is 31.

**`FL_GLIDE_K = 3` is the traverse's whole speed.** `v = FL_GLIDE_K * FL_DRIFT *
(frame width at the aim distance)` ≈ 0.9 u/s on the shipped field, 5.7 cm/s. Measured
over 285 s of film the six shots' steady screen rates are **0.605 / 0.781 / 0.965 /
1.137 / 2.131 / 3.748 %frame/s** — the glide at 2.84x `FL_DRIFT`, second-fastest under
the dolly. Chosen as a ceiling: at `K = 1` a traverse is indistinguishable from the
drift every other shot already carries.

⚠ **A held frame must not be a function of what the plants did while it was held**,
and that is a rule rather than a constant. The establishing heading is the field's
plan **diameter**, which is *not continuous in a growing stand* — one arm past the old
extreme swaps which pair of hull points is furthest apart and swings the answer tens
of degrees between two 500 ms measurements, which at a 90-unit standoff is 47 units of
eye and, through `40_boot`'s 12%-a-frame lerp, **336 u/s against VPEAK's 26**. Worst
sampled eye speed over 290 s of film, as each fix landed: **239.5 → 196.0 → 168.1 →
37.7 u/s**, with samples over 50 u/s going 7 → 7 → 6 → none. Every per-shot decision —
heading, end, subject, gap, lane — is taken **on the cut** and held.

### `minAng` and `fogK` — a mote is an angle, and a mote's fog is not the tissue's

Measured before anything moved: at the establishing shot **all 320 live grains were
drawn at exactly 1.00 px** (p50 = p90 = p99 = max = 1.00, zero variance), the whole
population against the rasteriser's clamp. `psize` is floored at `minAng x (distance to
the eye)` now, re-derived every frame from the eye — the vein width floor's argument and
the Blender bridge's `px_ref`, applied to a grain, and `FL_POLLEN.size = 0.022` stays as
the *near* floor under it.

`minAng = 0.004` is an eye decision, taken off a ladder at 1x / 3.2x / 6.8x / 11x the
old world size on the low, bank and wide shots: 3.2x and 6.8x are still dots you have to
hunt for; 11x is where the plume reads immediately as motes between the corollas, and it
put the bank shot's median at 5.6 device px. Drawn size, device px at 2200x1560
(p50 / p90 / max, grains over 2 px of 320 alive):

| shot | before | after |
|---|---|---|
| `wide` | 1.00 / 1.00 / 1.00, 0 | **5.75 / 7.00 / 7.41, 320** |
| `low` | 1.00 / 1.00 / 1.40, 0 | **5.97 / 7.20 / 9.27, 320** |
| `bank` | — | **5.85 / 7.18 / 8.01, 320** |

Stated as `psize` per world unit of distance it is a fraction of the **frame**, not a
pixel count, so it does not change with display density. Total drawn light at the wide
shot goes 164 → 3095 px², 0.09% of a 3.4M-pixel frame; **`bright` is deliberately not
lowered against it**, because dimming a mote to pay for seeing it is the move that put
this mechanism at the 1-px clamp to begin with.

`fogK = 0.45` is the one number here that could not be taken from the shipped fog.
`uFogD`/`uFogNear` come straight off the scene's own fog uniforms through `flFog`'s own
formula, but the tissue's 0.80 is a mix *toward the fog colour* — distant tissue is
veiled, not extinguished — and a mote is additively blended with no veil to be mixed
into, so the same weight spent on it is a fade to black. At 0.80 the wide shot read
correctly and the bank shot lost the plume it had just been given. Shot at 0.0 / 0.45 /
0.80. `?pol=rate,beyond,size,minAng,fogK` sweeps all five and
`?pol=0.05,12,0.022,0,0` is the pre-floor renderer exactly.

### `FL_POOL` — the length scale is the clearing's, and the pool is airlight

The ground's glow was `exp(-r * 0.20)`: **a 5-unit pool written for one plant at the
origin.** In a field the plants stand at r = 12-26, where that has decayed to 0.6%, so
the stand was lit by nothing — measured by rendering the same frame with the ground
hidden and taking the difference per band, where **eight of twelve bands came back
exactly zero** (`tools/flowers_floor.mjs`). ⚠ **The melt was not the cause**, which is
what the same tool's closed-form profile said: it is 0.75-0.93 where the plants stand,
not 1.0.

A field's length scale is therefore not a constant in this file at all — it is
`rim + FL_GARDEN_SPACING`, the same clearing radius `FlPollen` independently arrives at
(26.4 + 12 = 38.4 on the shipped field, so the pool is 1/e exactly at the edge of the
story the grains may drift into). With no plan it is `FL_POOL[1] = 5.0` and the solo
page does not move — the same by-construction no-op as `flFieldPal`.

**And it is airlight, not albedo, which is a rejection and not bookkeeping.** Ground
contribution per band, bottom four, of 255:

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| before | 0.31 | 1.83 | 5.64 | 10.06 |
| flat pool, **rejected** | 2.11 | 11.49 | 20.62 | 24.76 |

The flat pool lit the establishing shot correctly and turned an overhead into a sheet of
magenta with the plants as silhouettes, because a flat pool is a statement about the
*floor* and is therefore loudest where the floor fills the frame. Riding the melt makes
it a statement about the **air**: 18% survives that overhead against 75-93% of the
establishing shot. Wide frame mean pixel 46.52 → 49.34; `tools/flowers_horizon.mjs` at
its three heights, no pool → shipped, 100.29 → 101.39, 54.37 → 60.47, 59.83 → 64.01
(the flat pool put that last one at 78.59). `?pool=K,R` sweeps both from one build.

The pool also **breathes with the sky**, off `flSky`'s own shipped
`(0.85 + 0.15 sin(uT * 0.0007))` — a 9.0 s period at ±15%, no new uniform, no new
number, and it can only ever scale the pool down. ⚠ **Nobody has watched that move**; a
still cannot see a 9-second breath at all.
