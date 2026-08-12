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
`?form=abc|double|wild` (**abc is the default** — see below) `?zygo=0.85`
(CYC/DICH bilateral symmetry, 0 = radial) `?sepal= ?stamen= ?carpel=`
(where the whorl boundaries sit on q) `?homeo=0.62` (double form: the
petal identity threshold) `?renew=` (how much determinacy the floral
meristem loses).

## The full ABC flower — four whorls off one coordinate

The default form is now a **complete flower**: a calyx of sepals, a
corolla of petals, a ring of stamens — thin filaments carrying warm
anthers, which are what sheds the pollen — and a central carpel, a pale
green style at the flower's crown. None of it is drawn, and nothing
counts a whorl; it is the ABC model read off the one coordinate the
engine always computed. `whorlBands` (40_plant.js) cuts the floral
identity q into four bands, outermost to innermost — boundaries sharp
because AP3/AG mutual antagonism makes real whorl boundaries sharp
**[D]** — and every organ property follows from the band: a sepal takes
a LEAF from the ordinary library (A-class alone is a leaf-like organ,
and the engine's non-petal leaf request already handed one out), a
stamen is a small blade whose stalk elongates (`org.stalkX`, read by
`petioleOf`, so the bending physics and the stem's load see the same
filament the renderer draws; its radius still comes off the anther's
area, so a filament is thin *because* its anther is small), and the
carpel stands at the top of the spiral where the meristem consumed
itself to nothing.

Two supporting engine knobs, both defaulting to the shipped behaviour
exactly (smoke 73/73, parity 20/20):

- `floralDome` — a cap on the converted dome, in founder-patch radii. A
  floral meristem has a *characteristic* size, not a fraction of
  whatever apex converted. Measured: Ember's working axillary flowers
  convert at exactly 3.0 organR, while its terminal converts at 3.7 and
  the Parasol's at 4.1 — and an uncapped terminal founds ten organs at
  q ≈ 0 and reads as one whorl. A *multiplier* was tried first and
  cannot work: it fixed the terminal and collapsed the axillaries to
  1-3 organs, because the dome must still FIT its organs.
- Whorl-banded organs drop most of the leaf's pitch scatter — floral
  insertion is canalised, and with five petals the scatter that
  vanished inside a 23-petal double reads as a jumble (measured, by
  looking). Sepals keep it: they are leaves.

**Two floral programs**, assigned per species from a measured sweep of
all eight (`abc_sweep`): program A (dome 3.0, renew 0.55, bands
0.08/0.38/0.65) where q climbs steadily, program B (dome 2.2, renew
0.75, bands 0.06/0.24/0.60) for species whose q sits at zero and then
jumps — a Cathedral Fern is S8 P1 A0 C1 under A and S3 P5 A4 C1 under
B. Spiral Ossuary founds only 3 floral organs even wild; its flowers
were always inconspicuous and no program can conjure organs its
meristem does not make.

**Zygomorphy** (`?zygo=`): CYCLOIDEA/DICHOTOMA are expressed in the
dorsal — adaxial — domain of the floral meristem (Luo 1996 Nature,
1999 Cell **[D]**), and the cyc/dich double mutant is fully radial. The
adaxial reference is the horizontal negation of the axis's own first
segment — the direction the bud grew out of its parent — so nothing is
stated, and a TERMINAL flower, which has no subtending axis, stays
radial at any setting: that is real peloria **[D]**, arriving free.
Dorsal petals enlarge and stand (the upper lip), ventral petals reflex
(the landing lip), and a strongly dorsal stamen aborts to a staminode
**[D]**. Applied once per organ, the first time it has a direction.

## The spurred flower — a columbine, tube and all (`?form=columbine`)

An Aquilegia's plan, and the two moves the other forms don't make. The
first is the homeotic lever pointed the OTHER way: the double expands
B-class expression inward (stamens found as petals); a columbine expands
it **outward into whorl 1** — `sepalPetaloid` routes the sepals through
the petal stream with their own palette, so the showy outer whorl is
petaloid sepals wearing the species' full petal colour while the true
blades pale toward cream. The bicolor is one palette split; the organ is
still a leaf (ordinary library, margin, veins), which is exactly what a
homeotic identity is — same tissue, different program reading it.

The second is the **nectar spur**, and it has one lab's physics behind
it: Puzey, Gerbode, Hodges, Kramer & **Mahadevan** (Proc. R. Soc. B
279:1640, 2012 `[D]`) — the same Mahadevan as the pitchfork bloom and
the edge ripples, so the whole corolla now runs on his group's papers.
Their result: petal growth is two phases, cell proliferation then
highly anisotropic cell elongation, and ALL spur-length diversity
across the genus is achieved **solely by the degree of anisotropy**.
Built here as a domain map with the flat sheet as its limit:

- The petal's proximal sheet domain (`uS` = 0.30 of it) **rolls closed**
  — lateral arc length wraps at closure fraction `w`, the two margins
  meet at a seam, and the map is the identity at `w = 0`, so the mouth
  flares back to the open blade through a funnel. The tube's radius is
  the sheet's own local width; no cone is drawn.
- The closed tube **elongates backward** by the anisotropy factor,
  ramping with `dev` on the same coupling the bloom uses (phase II).
  `aniso` 6 grows a tube 1.8x the blade's length.
- **Slenderness is the anisotropy too**: P2012 bound the lateral scale
  between width-conserving (1) and area-conserving (1/a); the geometric
  middle `1/sqrt(a)` is stated, and at aniso 6 it gives a diameter ~10%
  of spur length — a real A. coerulea's proportion. Measured at both
  ends: 1 is a sausage (the petal margin holds its width until the last
  2% of the sheet), 1/a is a wire the rasteriser reduces to its veins.
- The spur direction `pi + petalTilt` maps every petal's tube to the
  same world direction — anti-parallel to the flower's axis — so the
  tubes descend behind the corolla as a parallel ring. Measured at
  three angles: +0.35 converges under the fruit, -0.85 bundles over
  the crown.
- **The veins wrap in with the sheet they canalised on**, so each spur
  arrives with its own vasculature spiralling to the tip — where the
  NECTARY glows softly, the engine's one language for "something is
  made here", held under the anther lesson's white-out ceiling.

The rest is the round-4 machinery reused at flower scale: a SMALL
`receptacle` (0.25) nests the whorls on the dome they were founded on
and turns floral elongation into the PEDICEL, so each flower is carried
out on a 4-5 unit stalk clear of the foliage (0.24 units of trunk
clearance became 1.25, measured — the round-3 unphotographable case).
The program is renew .70 + dome 3 + cap 32: the q-zero founding pile
(~7) IS the sepal whorl, ~8 petals band to .28, stamens to .75, and the
fruit itself — drawn at 0.55 scale, a columbine's pistil is slender
follicles — is the centre. The photographer learned one new move: **a
spurred flower is shot in three-quarter**, because its subject is depth
and the face-on frame that flatters a disc hides every tube (measured:
it read as a mallow).

## The capitulum — a daisy is a hundred flowers (`?form=daisy`)

A composite flower head, and the round-3 machinery read at a different
scale rather than new identity code: the SAME four whorl bands land on
Asteraceae anatomy exactly — the sepal band is the involucre's
phyllaries, the petal band the ray florets, the stamen band the disc
florets (which is why the disc glows and sheds pollen: those organs were
already anthers), and the centre sets a fruit. Two engine additions,
both defaulting to the shipped behaviour bit for bit:

- **`receptacle`** un-collapses the floral dome. `q` RECORDS the radius
  each organ was founded at (`1 - prim.r/floralR0`); placing every
  floret on the axis line threw that away. Under the knob a floret's
  base is offset by `receptacle*(1-q)` — rim founded first, centre last,
  the head becomes the disc the meristem actually was. 52-53 florets per
  axillary head (S~17 P5-13 A16-29), measured.
- **A receptacle does not elongate.** Under the same knob every floret
  rides the TIP (`elongate`), so the disc stays one station — span 2.9
  units of smear collapses to 0.0 — while floral elongation below it
  becomes the PEDUNCLE: the daisy bolts a 9-10 unit scape, exactly what
  a real one does. `tropism` .002 (against the herb's .02) holds the
  head ~3 units clear of the trunk; at .02 a 12-unit peduncle climbs the
  trunk and ends 0.4 units from it (measured, both).

**Finding the daisy's centre found a sterile corner that had been in the
app since before this piece existed.** Every specimen draws its fruit
chemistry from its seed (`makeSpecimen`), and ovule patterning on the
642-cell shell fails outright when `T/D < ~5.3` — the boundary is sharp
(12-20 ovules one side, ZERO the other) and the draw ranges include the
corner, so **5 of 40 specimen seeds were barren for life** — no
ripening, a seed head with nothing in it, in canalisation.html too.
Ember seed 21, both round-record seeds' neighbours, drew T 15.1 and
could never have ripened anything. One clamp (`D <= T/6`) after the
draws fixes it: fertile specimens bit-identical, PRNG order untouched.
Every daisy head now ripens a 14-16-ovule fruit at the disc's centre.

## The double flower — the C-class mutant, grown (`?form=double`)

`?form=double` is a **doubled flower**: 20-23 petals per corolla in
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
  what a backlit mote shows you — the FIELD's key light in a garden
  (`flFieldPal`), so a grain matches the air it is in.

  **A field sheds, not a plant.** One population walks every germinated
  specimen: a grain is not part of a plant, since once shed its only
  inputs are the wind and gravity, and the cap and the upload are
  scene-wide. Each specimen sheds on the plant time *it* was paid this
  frame; every grain drifts on the *world* clock, because the air is one
  field and `windAt`'s `t` is a wall clock. `test/flowers_pollen.mjs` is
  the census — anthers, grains, where they go, what a step costs — and
  it found that neither `max` nor `life` has ever bound this population:
  it is **advection-limited** (a grain crosses the whole clearing in
  0.65 s), 0 cap refusals at 59 anthers and 0% of deaths by age.

  ⚠ **And it barely reaches the screen.** Measured over a full director
  cycle at `?garden=7`: ~330-390 grains alive, of which the number drawn
  larger than 2 px is **0 (wide) / 5 (dolly) / 7 (close) / 23 (low)** and
  never more than 4 px, because the camera is never within 10 units of a
  grain. The mechanism is right and what a viewer gets is a scatter of
  one-pixel dots; it reads as motes only in the close-up. The lever is the
  drawn size — a constant *angular* size, the vein width floor's argument
  applied to a mote — and it is a look decision, so it is swept by
  `?pol=rate,beyond,size` and not taken here.
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

**The flower shot is a photographer now, not a tripod.** Three things
landed together, each measured against a frame that was mostly foliage:
the camera eases to the flower's own *facing* (down its axis, blended
away from the trunk — the three-quarter view a person would walk to;
only while the viewer is not orbiting); `bestFlower` scores down a
corolla pressed against the trunk, because the trunk above it crosses
every facing shot (measured: a flower 0.36 units off a trunk, corolla
radius 2.13, framed with the trunk through its face); and the shipped
sight-line occlusion cull is ported — the round-2 "known gap" — with
one extension the shipped director never needed: the cleared window
reaches one organ-length PAST the subject, because a face-on shot sits
*inside* the canopy and a blade rooted just behind the flower reaches
forward across its face. The cull is view-dependent, so `capture()`
re-runs on camera motion, not only on sim steps — at `speed=0` the
clearance used to be computed once from wherever the camera began.

**Nectar guides**: in Antirrhinum, Venosa is an MYB active only in
epidermal cells overlying veins **[D]** — the pigment pattern IS the
vein network. The petal stream already carries `dd` (distance-to-vein,
computed for translucency); read as pigment it draws the guides a
pollinator would follow, deepening inside the bullseye zone and fading
distally. One `smoothstep` and one multiply on `kPig`.

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

## What a FIELD costs, and the two terms that pay for it

`?garden=N` multiplies the one thing this piece was never asked to do more
than once: rebuild every specimen's geometry on the CPU, every frame, for
every plant. Measured on the page's own HUD, a stand of seven at bloom cost
**99.8 ms of capture a frame**. `test/flowers_capture.mjs` is the profiler,
headless and reproducible — it grows the field `flGardenPlan` plans *with the
germination stagger*, so it is the page's field and not a different one, and
it reproduces the browser float for float. (That is how the double count in
`tools/flowers_shot.mjs` was found: it added the hero twice, reporting 998
organs for 771.)

**Where it goes**, per organ kind, seven specimens at world step 3000:

| kind | ms | share | | kind | ms | share |
|---|---|---|---|---|---|---|
| petal | 45.9 | 39% | | stamen | 13.1 | 11% |
| sepal | 28.2 | 24% | | rest | 4.4 | 4% |
| leaf | 25.3 | 22% | | | | |

**70% is floral organs and 58% of every float emitted is the petal stream** —
not the leaves, which is where the shipped app's diagnosis pointed. The cause
is one line in `20_draw.js`: every floral organ is handed `detL = 1.0`, the
microscope, permanently on, so a petal is built at the leaf's own lattice
(~5,600 vertices). That is right for the close-up the piece is named after and
nonsense for a flower forty units away covering sixteen pixels.

### 1. Never finer than the raster (`28_lod.js`)

`bladeMesh` is the only level of detail in the project with no distance term.
It gets one, and it is the vein cull's law restated for the surface — a
statement about sampling, not about the plant:

    px/unit = pxHeight / (2 d tan(fov/2))      the raster, at distance d
    cap     = round(bl * px/unit)               one quad per pixel
    mu, mv  = min(shipped answer, cap)

A cap and never a raise; the floor stays `bladeMesh`'s own 4x2 and the ceiling
stays the leaf's lattice. Nothing in it is a taste constant: `pxHeight` is the
drawing buffer, `fov` is the camera's, and one quad per pixel is Nyquist. The
distance is per specimen, to its bounding sphere's **near face** — the same
measure the fog is taken from, and the conservative end of the approximation.

**No hero exemption**, because the law exempts the subject by itself: at the
close-up's own framing a petal is ~180 px against a ~75-cell lattice. That
claim is a sweep and a gate in `flowers_capture.mjs`, and measuring it
corrected it three times — the last being the gate itself. "The corolla keeps
>= 95% of the petal stream" passed at 1600 steps (96.6%) and **failed at 1400
(89.0%)**, because a younger flower's organs are smaller and a cap in pixels
bites a small organ first: a percentage of a stream is a statement about a
growth stage. The gate is now the claim itself and is stage-independent — *the
largest petal in the close-up is drawn exactly as it was*, float for float. The solo page is **not** byte-identical any more: at the
measured close-up distance it keeps 96.6% of the petal stream and 81% of the
tri stream, and **none of the difference is leaves** — it is stamens and
carpels, because `detL = 1.0` is applied by organ *identity*, so a 0.1-unit
filament was built as a 75 x 75 grid. The two stills are indistinguishable.
`?lod=0` is the pre-LOD renderer, exactly.

### 2. Pay in batches, not in slices (`40_boot.js`)

The step pool was spent breadth-first — one step to every specimen, sweep
after sweep — so **every specimen stepped every frame, and a specimen that
stepped is recaptured**: the frame paid the whole field's rebuild to advance
garden time by one step. Depth-first spends the same budget on fewer plants at
the same average rate each. How few is Nyquist rather than taste:
`FL_RECAP_HZ = 1.78 * 4` — four samples per period of the wind's fastest gust,
which is `15_petal.js`'s ripple guard applied to time — so `m = nAct * HZ /
fps`. It is a feedback loop and it settles. The hero is exempt and always paid
first: it is the subject, the close-up and the pollen's plant. `?batch=0` is
the pre-batching pool.

### What it bought, and what it cost

Live grown field, real browser on Metal, `ff=3000` then `speed=1`:

| field | before | after |
|---|---|---|
| 5 | 106.5 ms (5/5), 10 fps | 30.9 ms (2/5), **25 fps** |
| 7 | 120.9 ms (7/7), 10 fps | 38.0 ms (3/7), **21 fps** |
| 10 | 123.0 ms (9/10), 10 fps | 26.3 ms (3/10), **26 fps** |

`tools/flowers_perf.mjs`, 60 s of live growth at speed 4, is where the cost
shows and it is worth knowing before anyone writes a hitch gate. Isolated with
the two switches:

| | median | p95 | p99 | worst | fps |
|---|---|---|---|---|---|
| before | 50.0 | 67.1 | 83.4 | 100.0 | 21.6 |
| LOD only | 49.9 | 60.0 | 75.0 | 91.7 | 22.9 |
| LOD + batch | 34.9 | 75.1 | 108.4 | 116.8 | 25.6 |

The LOD improves every column. **The batching trades the tail for the
median**: frames are lumpier, because a frame that pays three plants their
whole debt is heavier than one that pays a step to seven, and the plants are
wildly unequal (a Sun Coral capture is 20 ms, a Spiral Ossuary 1.4 ms). That
is inherent to round-robin over a heterogeneous field, it is bounded by the
pool, and it is the honest price of the 30% median.

### The negative result: there is no frozen tissue to cache

The obvious third move is the `cellTable` argument — a specimen that has
stopped changing does not need recapturing. **It does not hold here, and it is
not the wind.** An Ember Creeper at step 3000 with **zero live axes** (nothing
growing, nothing being founded) changes **56.4% of its triangle floats on the
very next step**, with deltas up to 0.41 world units — and it still changes
56.4% of them with the wind turned off (`uRef = 0`). The axes are damped
cantilevers and the petioles hang off them; the *material* shape of a mature
lamina is frozen and is already baked, but where that lamina IS in the world
moves every step, on every plant, forever. A geometry cache would be a wrong
picture, so the answer to "recapture less" is temporal (above), not memoised.
