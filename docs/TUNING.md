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
sway 1.0    dof 0.80    grain 0.024  vignette 0.60
```
`laminaMul` pulls the leaf body down so the **vasculature carries the light**.
A leaf should read as light held inside tissue. Vein emissive and lamina
brightness are a balance — raise one and lower the other.

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
uRef       4.0      m/s at yRefM     how hard it is blowing. Beaufort 3
bearing    0.0      rad              which way. Ground plane. A scene picks one
seed       1        -                which realisation of the spectrum is drawn
```

**`uRef` comes off the Beaufort scale, and that is a better answer than taste,**
because Beaufort's force descriptions are *defined by what the wind does to plants*:
force 1 is "leaves do not move", force 2 is "leaves rustle", force 3 is **"leaves and
small twigs in constant motion"**, force 4 raises dust and moves small branches. This
piece is about leaves and small twigs in constant motion, so it stands in a force 3
and 4.0 m/s is the low-middle of that band.

It shipped at 1.2 — force 1 — for exactly as long as it took to measure an attached
blade, which twisted by 0.03 degrees and was reported as "the mechanics is invisible".
It was, correctly: at force 1, by definition, leaves do not move. The load is quadratic
in speed, so force 3 is eleven times the pressure of force 1.

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
lambdaM    1.0      m       integral length scale ~ height above ground
nMode      4        -       octaves of it: 1.0, 0.5, 0.25, 0.125 m
spectralSlope  -5/3  -      Kolmogorov. Amplitude exponent is (slope+1)/2 = -1/3
turnover   1.0      -       each eddy decorrelates at its own rate, a_i k_i
```

The chain is: `u* = kappa·uRef/ln(1+yRef/z0)`, then `sigma_u = 2.5 u*`, then the
octave amplitudes are Kolmogorov's and normalised so their variances sum to
`sigma_u²`, then each mode's frequency is Taylor's `k·U` plus its own turnover.
**So "how gusty is it" is not a second dial.** At the shipped weather:

| | value |
|---|---|
| `u*` | 0.407 m/s |
| `sigma_u` | 1.017 m/s (turbulence intensity 25%) |
| mean speed at 1 m / at 0.25 m | 4.00 / 2.65 m/s |
| gust peak seen over 40k samples | 2.31 m/s = 2.27 sigma |
| mode frequencies | 4.8, 3.9, 13.5, 19.3 Hz |
| gust variance in 0.3-6 Hz | 72%, 2 of 4 modes |

That last row is the one to check first if a later step produces a plant that does
not move. The ROADMAP 7 pre-flight put the stems' first cantilever mode at 0.5-4.6 Hz
on seven of eight species, and 72% of the gust variance is in that band, carried by the
two largest eddies — so the air contains energy where the stems will resonate.

**The fraction in band falls as the wind rises, and that is real.** At 1.2 m/s all four
modes are in band; at 4 it is 72%; at 6 it is 44%. Taylor scaling sweeps the small
eddies past faster, so their forcing moves out of the range anything structural
answers to. A gale therefore moves the plant less per unit of wind than it looks like
it should — worth knowing before somebody reads a stiff-looking plant as a solver bug.

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

## The attached blade (`39_fall.js`, ROADMAP 7 step 2, 2026-07-26)

Read this the way you read the fall's section: there is nothing here to sweep for
appearance. There is, however, a number in it that IS arbitrary and turns out to
dominate everything, and that is the point of this section.

```
eModulus   60e6   Pa   Young's modulus. THE pre-flight's one material constant
poisson    0.5    -    turgid parenchyma is nearly incompressible -> G = E/3
zeta       0.10   -    structural damping ratio. Measured range 0.05-0.2 in plant stems
sub        12     -    substeps per period of the FORCING (the response is exact)
maxFlap    1.2    rad  a stop, not a shape
```

`zeta` is a **third** material constant, which the pre-flight said should make you
re-read rather than reach for it. The argument for it is a measurement, not a
preference: aerodynamic rotational damping (`cRot`) is *quadratic* in the rate, so at
the microradian amplitudes this geometry produces it does essentially nothing, and a
blade struck by a gust rings undamped forever. Material damping is linear and is what
stops a real petiole. At these stiffnesses 0.1 means the ring is gone within a quarter
of a plant-time unit and the blade simply follows the wind.

### What the petiole works out to, and why it is the whole story

Torsional stiffness goes as **r⁴**, and the petiole's radius is currently `0.5` of the
STEM's radius at the node — a number nobody derived. Measured on a Cathedral Fern at
6000 steps:

| | value |
|---|---|
| petiole length | 0.82-1.02 world units (5-6 cm) |
| petiole base radius | 0.118-0.131 (7.4-8.2 mm) |
| radius as a fraction of the blade's own chord | 0.14-0.27 — **a real leaf is nearer 0.02** |
| torsional stiffness `k` | 30-108 world torque/rad |
| first torsional frequency | **374-4040 Hz** |
| rock at force 3, all 110 blades | 0.28° rms, 4.6° peak |
| rock at force 2 / force 4-5 | 0.07° / 1.09° rms |

So the mechanism is correct — quadratic in wind speed, zero in still air, larger for a
bigger blade on the same stalk, all asserted — and it is **quasi-static and nearly
invisible**, because the blade is hanging off a fat rubber rod. An order of magnitude
in radius is four orders in stiffness. Do not tune `eModulus` down to compensate: that
is the compensation the pre-flight already spent once, and doing it twice would make a
petiole out of jelly. **The number to fix is the radius**, and it is ROADMAP 5.

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
