# flowers.html — the flowers, given a stage of their own

A Three.js piece that grows a real specimen with the shipped engine and points
everything at the one part of the plant the shipped page treats as a minor
character: the flower. Nothing about the plant's shape is drawn here either —
this directory adds **no growth code and no organ geometry**; it adds a
renderer, and a set of petal mechanisms taken from published morphogenesis
and petal-optics literature, each reading a channel the engine already
computes.

```bash
node flowers/build.js        # -> flowers.html (single file, no server, no CDN)
open flowers.html            # grows an Ember Creeper from seed, live
node flowers/parity.test.mjs # the gate: captured streams == shipped drawSpecimen
```

URL parameters: `?species=Nightglass%20Parasol` `?seed=7` `?speed=2`
`?ff=1100` (fast-forward, deterministic) `?focus=flower` (frame the most
compact flower from its *drawn* bounds) `?hold=none` (let senescence run)
`?form=wild|double` (**double is the default** — see below) `?homeo=0.62`
(where the petal identity threshold sits) `?renew=0.7` (how much
determinacy the floral meristem loses).

## The double flower — the C-class mutant, grown

The default form is a **doubled flower**: 20-23 petals per corolla in
nested whorls, outer-large to inner-small, the inner whorls still cupped
while the outer ones recurve. None of it is drawn; it is the ABC model's
C-class failure expressed through four engine parameters that all default
to the numbers that were previously hardwired (PR: "Four floral
determinacy knobs"):

- *B-class expansion* — `petalQ` 0.28 -> 0.62. `org.petal = q < petalQ`
  (40_plant.js), so raising the threshold founds the stamen-analog whorls
  as petals: a real doubled rose IS petaloid stamens (Meyerowitz ABC
  **[D]**). Petal library, length, tilt and the q-lagged bloom all follow
  from the identity, so the conversion costs nothing downstream.
- *C-class determinacy loss* — `apexRenew` 0.7. AGAMOUS terminates the
  floral meristem by shutting off WUS stem-cell renewal (Lohmann 2001,
  Lenhard 2001 **[D]**); in this engine floral organ identity IS the apex
  consuming itself, so renewal is one factor on the contraction in
  `consumeApex()`. Measured: 6 petals/flower wild, 14 at renewal 0.6, 23
  at 0.8 — and with `petalQ` untouched, renewal alone gives the *ag-1*
  petal-petal-petal phenotype.
- *A flower is a compressed shoot* — `floralElong`/`floralStretch` 0.08.
  An indeterminate flower at shipped elongation strings its petals over
  8.4-13.0 units of axis (a raceme); compressed, the same organs pack
  into a 0.26-0.40-unit corolla. **Three traps, all measured**: the
  compression must drop `floralNode` with it (the founding gate discards
  primordia otherwise — the stalled-shoot trap, and the flower silently
  un-doubles to 9 petals), must raise `floralGrace` (the compressed
  flower's early cadence outruns 320 steps and the axillaries die), and
  on the Nightglass Parasol the compressed corolla ends up wrapped
  around the terminal fruit — a glowing moon in a ring of fenestrated
  petals, which nobody designed.
- *Petaloid stamens are smaller than true petals* — `petalGrade` 0.5
  scales a petal down with its identity q, so the corolla grades the way
  a rose does.

`?form=wild` is the shipped configuration, bit for bit — every default
equals the old literal, `test/smoke.mjs` 73/73 before and after.

## What it is

- **The simulation is the shipped simulation.** `makeSpecimen` grows the
  plant; `flDrawSpecimen` (20_draw.js) is the shipped organ loop minus the
  occlusion cull and the microscope, calling the shipped emitters. A
  `Buffers` subclass records per-organ `[start, end)` ranges per stream —
  the organ identity the shipped buffers never carried — and captures veins
  as the Blender bridge does: `(a, b, w0, w1, colour, emis)`, `side` dropped,
  camera-faced per frame in the vertex shader (ROADMAP 11's twelve floats).
- **The shading baseline is 60_render.js transliterated** — hemisphere
  ambient, key at 0.9, back-transmission at 0.55, rim at 0.7, emissive x3,
  fog from the subject's near face, veins additive at colour x emissive.
  The palettes were tuned against that pipeline; an improvised renderer
  hands back a silhouette (measured).
- **The post chain is 60_render.js whole**: bright pass + three widening
  gaussian blurs for bloom, the scene blurred at half res for defocus
  with linear depth carried in alpha, COMP_FS verbatim (defocus mix,
  bloom, lateral chroma, ACES -> vignette -> grain -> gamma). Focus racks
  on the shipped director's law — tight on a flower close-up. The
  additive passes preserve destination alpha (the Three spelling of
  `blendFuncSeparate(SRC_ALPHA, ONE, ZERO, ONE)`), because alpha is the
  depth channel.
- **Pollen rides the one air** (18_pollen.js): grains shed by the mature
  stamen-analog band sample `windAt()` at their own positions — the same
  field the stem bends in — plus a Stokes settling speed of 3.3 cm/s
  (30 um, 1200 kg/m^3, published pine-pollen range 2-4 **[D]**). The
  drawn size and shed rate are legibility choices, same category as the
  vein width floor; a mote's colour is the key light's, because that is
  what a backlit mote shows you.
- **`flowers/parity.test.mjs`** reconciles the captured streams against the
  shipped `drawSpecimen` float for float (petal stream accounted, exact
  ribbon-count parity) and checks the organ bracketing. 20 checks, 2 species.

## The petal mechanisms, and where each number comes from

The petal stream (16 floats/vertex) carries `dd` (distance-to-vein), `q`
(floral identity), `u`, `v`, `dev`, `lib` beside the shipped colour — all
computed by the engine, none previously drawn.

**Form (12_form.js + 15_petal.js).** The shipped petal was a flat card with
`curl = -bl*0.05`. Now:

- *Anthesis is a bifurcation* — Liang & Mahadevan 2011, PNAS 108:5516 **[D]**.
  A petal is a curved shell; edge growth strain loads it, and past
  `beta* = (1-nu) + (1/4)(1-nu)(3+nu) k0^2` the longitudinal curvature
  unbends while the lateral curvature rolls: a bud is a cup and a bloom is a
  recurved petal because the equation says so. Driving the load with the
  organ's own `dev` is the one **[OURS]** coupling; letting high `q` lag the
  bloom gives SCIENCE.md's unbuilt "enclosing growth at high q" a mechanism.
- *Edge ripples* — Cerda & Mahadevan 2003, PRL 90:074302 **[D]**,
  experimentally verified: `lambda = sqrt(2 pi L t)/[3(1-nu^2) eps]^(1/4)`,
  amplitude likewise closed-form, evaluated with a 150 um petal (published
  range 75-419 um) at the world's own 0.0625 m/unit and the lily's measured
  base-to-tip strain rise (0.2 -> 0.5 **[D]**). **The formula returns
  ~7 mm and the petal grid samples the width at ~2.5 mm**, so drawn
  naively the sine aliases into jagged offsets — the crumpled-foil mottle
  AJ caught in a minute. `flPetalForm` fades the amplitude below ~4
  samples per wavelength: the vein-LOD law, applied to a ripple. What the
  instrument cannot resolve, it does not draw as noise.
- Veins are mapped through the same displacement (`flPetalVeins` mirrors the
  shipped `bladeVeins` in its PXR=0 form) — otherwise they float off the
  curved surface, which is exactly what the first build did.

**Light (the petal shader in 30_scene.js).**

- *Translucency*: petal transmittance usually exceeds reflectance (van der
  Kooi 2016, Proc R Soc B **[D]**); the back-transmission term is boosted
  where tissue is far from a vein — `dd` as a thinness map is **[OURS]** —
  and light through pigment filters twice, hence the squared-albedo tint.
- *Conical epidermal cells*: the microfacet normals of a conical-celled
  epidermis are a ring, not a lobe, tilting ~18 deg -> ~52 deg as cells mature
  (Ren 2017, PLoS Genetics **[D]**) — a velvet sheen that rides `dev`. The
  cone's optical job is steering light *into* the pigment (x3.5-4.7 vs
  x2.1-2.7 flat; Gorton & Vogelmann 1996 **[D]**), so maturity deepens
  saturation at constant pigment — `mixta` mutants look paler with unchanged
  anthocyanin (Noda 1994, Nature **[D]**). Modelled as a pigment exponent.
- *Bullseye*: a proximal pigment zone thresholded on the normalised
  proximodistal coordinate, one number per specimen drawn from the published
  trimodal distribution (0.33/0.59/0.78; Todesco 2022, eLife, n=1589 **[D]**).
- *Spots*: Ding, Yuan et al. 2020's activator-inhibitor system (Current
  Biology **[D]**, complete parameter set verbatim) run on the petal's own
  lamina lattice (17_spots.js) — zero-flux for free on the cut lattice, baked
  once per library petal, never the same twice. Two numerical departures are
  flagged in that file's header.

**What the second pass corrected (all measured, none guessed)**: the
pigment stack ran at full strength and turned the bake's smooth pale ramp
into sharp maroon blotches — isolating raw albedo in the live shader
showed the bake was beautiful on its own, so the bullseye is a wide soft
gradient now and the spots whisper inside it; a one-sided lambert threw
half of every cupped petal into hard shadow, which read as meat — thin
tissue is lit from both sides now (wrapped diffuse, wide transmission
lobe), which is van der Kooi's transmittance point applied to the model
rather than bolted on; inner organs fed through the petal shell rolled
into crumpled tubes (curvature scales 1/L; the shell was derived for a
petal's aspect ratio, not a stamen's) and take the shipped card now; and
the shell was being driven to a ~60 deg edge roll, where 1.25x the
bifurcation threshold gives the shallow cup that reads as a petal.

**Known gap**: `?focus=flower` on a dense canopy (Cathedral Fern) shoots
through foliage — the shipped page's sight-line occlusion cull was
deliberately dropped here as "no director, no subject", and the flower
focus is precisely a subject. Port it next.

**Not built, deliberately**: the diffraction-grating blue halo (needs
spectral rendering an RGB pipeline can only fake); nyctinasty (needs a
temperature/day cycle — a genuinely new global, same category as the wind,
argued in ROADMAP 0z1's terms and left for a session that wants it);
Marder-energy lattice relaxation (the closed forms above cover the regimes a
real-time piece can show).

## What is stated, honestly

`T_PETAL = 150 um` (published range), `K0 = 1.0` (their O(1) regime),
`BETA_MAX = 2.0*beta*` (positions the bloom in dev; structural), the q-lag
0.85 **[OURS]**, the ripple envelope shape constants inside the **[D]**
strain profile, the shader gain constants (grade-category, like the shipped
palette scalars), and the bullseye jitter width. Every physical constant
above them is published, and flagged where it lands in the files.
