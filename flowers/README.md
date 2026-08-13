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
meristem loses). The **full catalogue prints to the console** on load —
it used to be a second line under the gesture hint, one `white-space:pre`
line wider than the viewport, so it ran back under the HUD and put a band
of overstruck text along the bottom of every still this piece has taken.

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
exactly (smoke 73/73, parity green — 20/20 when this landed, 24/24 now):

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

  ⚠ **It did not reach the screen at all, and no screenshot said so.**
  Measured by evaluating the point pass's own `gl_PointSize` expression per
  live grain (`tools/flowers_motes.mjs`), at the establishing shot **all 320
  live grains were drawn at exactly 1.00 px** — p50, p90, p99 and max all
  1.00, zero variance, the whole population pinned against the rasteriser's
  clamp. The low shot was 1.00 / 1.26 / 1.40. A channel drawn at the
  rasteriser's clamp is a channel with no dynamic range left, and it looks
  in a still exactly like a channel that is working.

  **A mote is an angle, not a length**, and that is what fixed it. A real
  grain is 30 µm = 0.00048 world units and sub-pixel at every distance
  anything here stands, so what is drawn is not the grain but the glare spot
  a shaft of light makes of one — and a glare spot has a constant *angular*
  size. `psize` is floored at `minAng * (distance to the eye)`, re-derived
  every frame in `FlPollen.resize()` rather than baked at emission, because
  the camera moves on frames the world clock does not (`?speed=0` is that
  page, and every still here is shot on it). `FL_POLLEN.size` stays 0.022 and
  becomes the *near* floor under it, which is what stops an intimate camera
  turning a mote into a 64-px blob. It is the vein width floor's argument and
  the Blender bridge's `px_ref`, applied to a grain.

  `minAng = 0.004` is an eye decision and says so, off a ladder at 1x / 3.2x
  / 6.8x / 11x the old world size on the low, bank and wide shots: 3.2x and
  6.8x are still dots you have to hunt for, and 11x is where the plume reads
  immediately as motes between the corollas. Drawn size in device px at
  2200x1560 (p50 / p90 / max, and grains over 2 px of the 320 alive):

  | shot | before | after |
  |---|---|---|
  | `wide` | 1.00 / 1.00 / 1.00, **0** of 320 | 5.75 / 7.00 / 7.41, **320** of 320 |
  | `low` | 1.00 / 1.00 / 1.40, **0** of 320 | 5.97 / 7.20 / 9.27, **320** of 320 |
  | `bank` | — | 5.85 / 7.18 / 8.01, **320** of 320 |

  **And the motes are in the scene's fog now**, which is the other thing
  having a distance buys: a grain 90 units out was being drawn as large and
  as bright as one at 20, which is a swarm of fireflies at one depth rather
  than a plume with depth in it. `uFogD` and `uFogNear` come straight off the
  scene's own fog uniforms through `flFog`'s own formula — one fog, evaluated
  on the CPU for a stream whose shader cannot see it, the same argument
  `37_wind.js` makes about its GLSL. Only the **weight** is this file's own:
  tissue takes 0.80 of the fog, but that 0.80 is a mix *toward the fog
  colour* — distant tissue is veiled, not extinguished — and a mote is
  additively blended with no veil to be mixed into, so the same number spent
  on it is a fade to black. At 0.80 the wide shot read correctly and the bank
  shot lost the plume it had just been given. `fogK = 0.45`, chosen by
  shooting 0.0 / 0.45 / 0.80 on the wide and bank shots.

  Light on the screen (sum of drawn area x luminance) at the wide shot goes
  **164 → 3095 px²**, which is 0.09% of a 3.4M-pixel frame; `bright` is
  deliberately *not* lowered against it, because dimming a mote to pay for
  seeing it is the move that put this mechanism at the 1-px clamp to begin
  with. `?pol=rate,beyond,size,minAng,fogK` sweeps all five and
  `?pol=0.05,12,0.022,0,0` is the pre-floor renderer exactly.
  `test/flowers_pollen.mjs` is unchanged and still conserves (emit 971, edge
  919, alive 52, residual 0): with no eye passed, `resize()` is a no-op.

  ⚠ **A close-up still shows no motes, and that is a population fact rather
  than a size one.** At `?garden=7&seed=21` the subject is specimen 2 and the
  field's plumes belong to the other six: 320 grains at mean heights 12.7 to
  21.5, mean NDC y 3.3 to 4.9 — four frame-heights above the picture. The
  subject cannot shed, structurally: Sulphur Rosette has `whorlBands: false`,
  so all 33 of its floral organs carry the `petal` flag and
  `FlPollen._sources` (which skips petals) finds no anther on it at all,
  against 23 stamens of 76 on the Abyssal Frond. **The showiest corolla and
  the shedding corollas are different flowers for a reason.** Scoring the
  close-up on plume density was measured and it loses on this seed — base
  13.68 x plume 0.80 = 9.67 for the 33-petal corolla against 2.43 and 1.74
  for the two shedding runners-up — and nothing defensible closes a factor of
  six. `low` is where motes read.
- **`flowers/parity.test.mjs`** reconciles the captured streams against the
  shipped `drawSpecimen` float for float (petal stream accounted, exact
  ribbon-count parity) and checks the organ bracketing. **24 checks**, 2
  species — the two added ones reconcile the no-area triangles the capture
  drops rather than loosening the float count for them (see the flash, below).

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

Both of those are **per specimen**, and in a field they mean it — see *Every
flower in the field is its own* below, which is where they stopped being one
draw from the hero's seed applied to everybody.

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

## A GARDEN — `?garden=N`, and the numbers it had to state out loud

`?garden=N` (2 to 12) grows a whole flowering **field** on one page: N specimens,
each with its own species, seed, floral form and germination date, standing on one
ground in one wind on one world clock. Without the parameter the page is the single
specimen it always was — the plan, the field palette and the director are all
no-ops at N < 2 **by construction**, not by a branch someone remembered to write.

None of it says anything about a plant's **shape**. Where a plant stands, where the
camera stands, what colour the air is and what the floor is made of are staging and
environment — the category `37_wind.js` and the Blender bridge's arc already
established (`tools/README.md`), and the only place this piece is allowed a stated
number. Several are stated here, and each of them says so out loud — TUNING has the
table of which may be moved and which are Nyquist rather than taste.

### Where a plant stands, and why the spacing is 12 (`35_garden.js`)

Placement is a **field, not a ring**: dart-thrown over a disc, uniform in *area*
(`d = R sqrt(u)`, because `R u` crowds the centre), accepting the first candidate
that clears `FL_GARDEN_SPACING` of every origin already placed, and keeping the
**best** failed throw rather than the last so a crowded clearing degrades to maximum
spacing instead of to whatever the 48th dart did. The clearing grows with the count
so areal density is constant: N discs of radius `s/2` saturate a random-sequential
disc at ~0.547 area fraction, so sizing at ~1.5x the count it can hold gives
`R = 0.83 s sqrt(N)`. A fixed radius was what the shipped `plantGarden` had, and a
circle that cannot hold seven plants of measured reach 9.5-22 is why the first wide
shot photographed six of them in one overlapping column.

The spacing itself is **measured, and the measurement is the interesting part**. The
shipped 2.5 was set by eye against one corolla and was wrong by ~5x in the direction
that shows — at `garden=7&seed=21` two specimens had grown *through* each other.
`scratch/g2_placement/` grows 8 flowering species x 4 forms x 5 seeds (the seeds a
garden actually deals) to 3000 steps and takes horizontal reach off the **drawn**
streams, the same argument as `floralBounds`: measure what is on screen, not a guess
reconstructed from organ lengths. 160 cells, `seedsweep.out`:

| | p10 | med | p75 | p90 | max |
|---|---|---|---|---|---|
| `maxR` (outermost vertex) | 3.6 | 9.7 | 14.4 | 23.2 | 70.9 |
| `r90` (the body: 90% of drawn geometry) | 2.2 | 5.0 | 7.5 | 12.1 | 20.4 |

**Reach is a statement about a SEED, not about a species**, and the one-seed version
of this table got the middle right and the tail completely wrong. An Ember Creeper
columbine reads `maxR` **7.4 at seed 21 and 65.9 at seed 31697** — same species, same
form, 9x apart. Worse, that specimen's reach **is not bounded in time**: sampled every
200 steps it goes 11.9 (step 1000) -> 28.8 -> 44.4 -> **70.9 (step 3200)** and is still
climbing linearly, a creeper whose axes never arrest. **No fixed spacing keeps a
creeper off its neighbours and none should try** — that is the organism's business
(`organBudget`, apical control), not placement's, which is why every number above is
quoted as a median.

So **12 is a stated fraction and should be read as one**: full clearance of two median
*bodies* (2 x 5.0) with margin, ~80% of a p75 pair, and **62% of full clearance of two
median arms** (2 x 9.7 = 19.4). Full arm clearance was measured and rejected by
looking — at 19-44 units apart, plants 20-48 units tall stop being a stand and read as
a row of isolated specimens. Two neighbours' outermost peduncles may cross; their
bodies do not, which is what a meadow looks like and what the defect actually was.
Grown end to end at `garden=7&seed=21` to step 3600, 3 of 21 pairs overlap at `r90`
and all three involve the runaway creeper or the hero.

Two smaller things the plan fixes at the planning stage, both ROADMAP 10b defects in
the shipped app: species are dealt **without replacement** from a shuffled deck —
and the reshuffle seam is fixed too, so a field of 12 cannot stand two of a kind side
by side — and `Ashfall Spire` is skipped, because the conifer never flowers and this
page is titled flowers. Seeds are `baseSeed + i*7919`, injective for any field this
piece can ask for; a shared seed is an identical twin plant and a viewer sees it.

### A field germinates, it does not appear

`startAt` spreads germination over `FL_GARDEN_STAGGER` = 1200 world steps — the piece
is *growing* a garden, so the growth is the show — but **not from step 0**. A first
cohort (`max(2, min(4, ceil(n/3)))`) germinates together so the opening frames are a
field rather than one plant alone in a clearing, and the rest are spread *evenly* with
jitter narrower than the gap. N uniform-random draws clump: at the first version's 2400
with every `startAt` uniform, `garden=7` had 2 of 7 up at step 1100, and three of the
draws landed inside 300 steps followed by nothing for 900. The boot loop constructs at
most **one** member per frame and holds the world clock while it does, so a cohort costs
that many frames of construction rather than a hitch, and every specimen stays exactly
at `age == world - startAt` with nobody accruing silent debt.

### A field needs a director, not a framer (`45_director.js`)

Pointed at a garden, the shipped framing law does the only thing it can — it frames the
bound of *every* specimen at once. Measured at `?garden=7&seed=21&ff=3000`: radius 36.1,
camera 84.2 units out, six plants bunched into one column and most of the frame empty.
A field photographed from far away and above is not a field; it is a diagram of one.

**Six shots** cycle, each with a base hold set by eye (the rule: a shot must outlast the
viewer's first read of it and stop before it becomes a still), with the hold not
starting until the move has finished so the director can never cut mid-transition. The
order is deliberate — outside, inside, through, across, at, up — and the cycle is ~127 s:

| shot | hold | what it is |
|---|---|---|
| `wide` | 16 s | the establishing frame, *solved* rather than tuned — the field's full width across `fW` of the frame or its top across `fH` of it, whichever binds, standing perpendicular to the field's own plan **diameter** |
| `bank` | 12 s | the field from just outside it, eye at a fifth of flower height, aimed *past* the centre |
| `glide` | 26 s | **the only shot that goes THROUGH.** A traverse down the widest clear lane between the specimens, at flower height, aimed at the vanishing point ahead of it |
| `dolly` | 18 s | a walk along a chord outside the ring, aim held on one flower while everything between sweeps past |
| `close` | 16 s | the best flower **anywhere in the field** |
| `low` | 9 s | kneeling *outside* the canopy, pitched so the field's own skyline sits `FL_LOW_SKY` up the frame and what is above it is sky |

`?shot=wide|bank|glide|dolly|close|low` pins one, for stills — a capture affordance in
the same category as `?ff=`. ⚠ **`?shot=glide` is not a useful still and that is worth
saying rather than engineering around**: pinning a shot stops the clock, so the
traverse's `u` saturates and the camera parks at the end of its own travel — which,
since the window is placed on the mass, is inside it. The still is a wall of soft blade;
in motion the same blade is a wipe. A pinned *clip* cannot show it either — 45 s of
`?shot=glide` travels 1.1 units and scores 94% stationary, because it had arrived before
the recording started. Record the rotation. `?focus=flower` is the seventh thing the
camera can be doing and it is not in the rotation: it is the solo page's close-up law,
extended to score every flower in the field.

The two shots with a subject stretch that hold by up to a third with how good the
subject is, against the director's own running mean of the scores it has picked — the
only scale available that does not need a number written down, since what counts as a
good corolla in a field of Nightglass Parasols is not what it means in a field of
Cathedral Ferns.

#### Nothing in it stops moving (2026-08-12)

*(Written against the five-shot list; `glide` arrived a day later and carries all of
this.)* Watched as a *film* — `tools/flowers_clip.mjs`, which is the first thing here that
records the page rather than photographing it — the list above had one defect above
every other. Three of the five shots are static poses recomputed identically every
frame, so the camera eases onto them in about a second and then holds **absolutely
still**; the close-up's three exponential lerps do the same thing more slowly. Measured
over 120 s at `?garden=7&seed=21&ff=3000`, the camera spent **15.4% of its samples
moving slower than a thousandth of the frame width a second**. A garden with a 0.6 Hz
stem mode swaying inside a locked frame does not read as a held shot. It reads as a
paused one.

So every shot carries a perpetual drift at **one screen-referred rate**: the picture
translates by `FL_DRIFT` = 0.75% of its own width per second whatever the shot's
distance. Two consequences are worth the arithmetic. A lateral drift is
**distance-scaled** — 4.4 cm/s at the establishing shot's 88.7 units, 0.4 cm/s at the
close-up's 8, the same speed on screen. And an **orbit is therefore a constant angular
rate**, 0.46 °/s, independent of everything; which is why the orbit is a term in the
shot *heading* rather than in each pose, since all four field poses put their eye and
their target on that heading, so one term arcs the eye and swings the aim together, and
the close-up gets the same arc through `flDirOutward` without reaching inside the framer
the solo page shares. The establishing shot takes a slow crane on top, because the one
thing it cannot say from a fixed eye is that the field has a floor. The drift saturates
where the cut would have come, so `?shot=` still settles for a still.

**The transitions are the same story one level up, and the derivation reproduces the two
numbers it replaces.** 5.0 s for four shots and a hand-added 7.5 s for `wide` were both
solving for a peak speed — out loud, in the comment that set them — so the peak speed is
the constant now and the durations are what it implies: `trans = 1.5 * distance /
26 u/s` (a smoothstep peaks at 1.5x its mean; 26 u/s is 1.63 m/s, a walk). That gives
5.02 s and 7.85 s against the 5.0 and 7.5 that were set by hand, and it *caps* the whip
the fixed transition allowed. And the **dolly no longer stops**: its travel was eased at
both ends, so the one shot that is going somewhere spent its last seconds parked.

The **lens racks**, too, and it was already paid for: `uFocus` has always been the
camera-to-target distance and nothing ever pulled focus with it. A shot now enters with
its subject soft and resolves onto it over the second half of the move, with the
amplitude taken from the lens's own depth of field (`uRange` is exactly the distance
over which this pass goes sharp to fully blurred) rather than chosen — so a close-up
whose range is 0.22 of its focal distance and an establishing shot whose range is 0.55
of a distance ten times larger both rack by one depth of field without either having to
say by how much.

Measured over the same 150 s of the same seed, before → after:

| | before | after |
|---|---|---|
| stationary (< 0.1 %frame/s) | 15.1% | **0.0%** of samples |
| peak camera speed | 43.7 | **27.3** u/s (`FL_DIR_VPEAK` is 26) |
| capture, weighted over the loop | 58.5 | 61.1 ms |
| specimens recaptured a frame | 3.95 | 4.03 of 7 |

and the drift itself, as the slow decile of each shot's own screen rate — what the
camera does once it has arrived, in %frame/s:

| | `wide` | `bank` | `low` | `close` | `dolly` |
|---|---|---|---|---|---|
| before | 0.101 | 0.021 | 0.015 | 0.873 | 2.114 |
| after | **0.805** | **0.580** | **0.485** | 0.723 | 3.635 |

Those five columns say exactly where the defect was. The three static poses were at a
fiftieth to a hundredth of the drift they carry now, and the 15.1% is them. The
**close-up was never the offender** and is slightly slower than it was — its three
exponential lerps take a long time to converge, so it always crept. The dolly is its own
travel and is faster only because it no longer decelerates into the cut.

⚠ The capture line is the one that had to be **checked and not assumed**: camera motion
dirties a stream (`camMoved`), and a drift that never stops could in principle have made
every frame a recapture. It cannot, and the reason is structural rather than lucky —
`camMoved` only ever redraws the **hero**, and only while the close-up's sight-line cull
is engaged, so every shot but the close-up is untouched by a moving camera by
construction (four in five then; five in six now). The
+4.5% above is inside the run-to-run spread and is not a measurement of the drift: a
second pair at 120 s came back 52.4 → 52.4 ms, and the two runs cannot see the same
plants, because a field that is still growing is heavier at the end of a window than at
the start and the shot shares are not identical.

Three measurements decided more of that file than any preference did. The camera stands
across the field's widest direction, because a stand of seven is never round and standing
on the long axis lays the specimens one behind another. *(That heading was originally the
minor axis of the plan covariance of the origins, and it was the right idea measured on
the wrong thing — see "the heading is a diameter" below.)* Distances are set by the
**subject** rather than by the ring — the frame is
`2 d tan(fov/2)` = 0.752 d units tall, so a median plant fills 55% of frame height at
`d = 2.4 hTop`; the first version distanced off the ring and photographed the inside of
a hedge. And the field is measured in **medians and percentiles**, off flower height
rather than plant height: this garden's tallest specimen is a 46.6-unit Sun Coral whose
flowers all sit between 5.9 and 13.8, so a framing off plant height aims at bare stem.

`flowerScore` is the shipped `bestFlower` — petals over drawn reach, times clearance
from its own trunk — with three terms a field adds: how **open** the corolla is
(`org.dev`, the same channel the bloom reads, so "the most open flower" is a chemistry
question the engine already answered), how **crowded** it is by its neighbours, and a
**rim** bonus, because everything about a close-up is easier from outside the crowd.
⚠ The obvious version of the crowding term is wrong and was built first: a sight-line
test from the *current* camera measures the wrong shot, since the close-up ends up 4.2
corolla radii from its subject, and compounded over seven specimens it chose a 3-petal
Parasol on the rim over a 26-petal Fern in the middle. What can block a close-up is what
stands near the **flower**.

⚠ `FL_DIR_HERO = 1.25` is a thumb on the scale for specimen 0 and it is **paying for a
limitation elsewhere**: the sight-line clearance in `captureDirty` is the hero's alone,
and in a stand this dense that clearance is the difference between a photographed
corolla and a wall of leaf — measured on `?garden=7&seed=21`, the hero close-up draws in
33.9 ms with the flower visible while `?focus=flower` on a Cathedral Fern two plants over
is 131 ms of the subject's own blades across the lens. Delete the thumb the day the cull
follows the subject instead of specimen 0.

#### What the field is, measured: `F.plan`, `F.drawn`, `F.tops`, `F.hull`, `F.discs` (2026-08-13)

Every pose above asks a question about the field, and the round-3 answers were all one
summary — origins, a radius, a height. They are five now, kept apart on purpose, because
each is the *only* right shape for its own question and the wrong shape for the others:

- **`F.plan`** — every drawn station, in plan. Where the plants *stand*. This is what
  the heading is taken off, through **`F.hull`**, its convex hull (Andrew's monotone
  chain; 882 stations reduce to about a dozen vertices on `?garden=7&seed=21`, so a
  heading query is a dozen dot products).
- **`F.drawn`** — that plus where every organ *reaches* (each organ's own frame at half
  and full length). What is in the way of a **lens**. The two are not close: a blade on
  this catalogue is 10 to 22 units long against a station spacing of about one, and the
  first traverse cleared every axis point by 6.13 units and photographed a wall of leaf.
- **`F.tops`** — one point per **axis**, its highest station: the **skyline**. A
  silhouette is made of all of a plant's shoots, so a per-specimen maximum is not it.
- **`F.discs`** — one isotropic disc per specimen, for questions about a specimen rather
  than about the field. ⚠ **A disc over-states an arm by its own length**, which is the
  right conservative shape for "could this plant be across the lens from over there" and
  exactly the wrong one for anything directional.

**The heading is a DIAMETER, not a covariance.** What the establishing pose's width
condition wants is the heading whose across-frame extent is largest, and on the plan hull
that is a support-width maximum — attained along the set's *diameter* — so the camera
stands perpendicular to it. The covariance of *origins* weights a 20-station seedling
exactly like a 252-station Abyssal Frond and knows nothing about what either reaches.
Measured with `tools/flowers_frame.mjs`, standing the establishing eye on every heading
in turn: the field covers **0.584** of the frame's half-width from the covariance heading
and **0.777** from the widest one, *at the same distance*. Drawn stations across the
frame (NDC x span; 2.0 is the whole frame), before this work → now:

| | before | now |
|---|---|---|
| `garden=7 seed=21` | 1.173 | **1.526** |
| `garden=7 seed=31` | 1.281 | **1.519** |
| `garden=9 seed=101` | 1.690 | **1.739** |
| `garden=3 seed=7` | 1.204 | 1.191 — a stand of three is round, the diameter and the covariance agree, and the change is correctly a no-op |

Two things fell out of building it. **The two ends of one diameter are not the same place
to stand** — perspective: the half of the field nearer the camera subtends more, so the
same axis at the same distance gives 0.61 of the frame from one end and 0.78 from the
other, and the ends are compared in the *projection*. And **a disc model cannot answer a
directional question**: the first version put a disc on each origin, one dominating disc
has the same width in every direction, the sweep came back flat and the argmax fell on
rounding.

**The low shot solves for its own standoff and its own pitch.** Its comment claimed it
knelt *outside* the field where a silhouette reads; the arithmetic under it disagreed —
measured, worst canopy clearance **minus 4.1 units** (the eye inside an Ember Creeper
that reaches 43.3), two thirds of the field off the sides of the frame, 54% of the ink in
the *top* half and no sky anywhere. The standoff is `flDirClearance` now, the closed-form
distance at which no drawn station is within one median flower height of the lens; the
pitch is solved from `F.tops` — how high the field rises from this eye, put at
`FL_LOW_SKY = 0.62` of the frame, never below horizontal. `FL_LOW_SKY` is by eye and says
so. Ink in the top half 0.537 → **0.288**, nearest drawn station 17.6 → **20.1** with the
eye outside every canopy, dead margin L/R .039/.031 → .055/.055. ⚠ A **maximum is not a
skyline** — pinning the tallest thing (a 49-unit Abyssal Frond, 50° up from a kneeling
eye) to 0.62 photographed an empty sky with foliage in two corners; it is p85, the same
statistic and the same reason as `hHi`.

**The sixth shot goes through the stand, down a lane it derives.** Five poses stand
outside and look in, and the file said twice why — an eye anywhere inside the ring is
inside a canopy, measured, twice. But *"you cannot stand anywhere inside"* and *"there is
nowhere inside to stand"* are different claims and only the first was ever measured. The
widest lane is **the largest gap in a projection**: pick a direction, project every drawn
point onto the perpendicular axis, sort, and two consecutive values with nothing between
them are a band of the plan no plant lies in — clear by construction rather than clear
where somebody checked. Swept at 3°, the same sweep the heading uses, with two stated
constraints (the gap's centre must lie in the middle half of the field, or the widest
lane skirts the *outside*; and only points within the travelled window count).

That window is the whole reason it works. Asked of the whole 67-unit field the widest
clear lane at `?garden=7&seed=21` is **2.01 units of half-width** — a crack. The camera
covers 23 of those 67 units, and matter beyond the travelled segment is in the *picture*,
not on the lens: **5.14 units** of half-width over the window, with the nearest drawn
point coming to 4.29 as it passes. The aim leans onto the mean lateral position of
everything drawn ahead (a lane is the emptiest line through a stand, so aiming *along* it
aims at the one direction with nothing in it), and the window runs from 1.5 H before the
flanking mass's centroid to 0.5 H after, so the camera spends the shot approaching and
passes through near the end.

The speed is the film's own drift times three and nothing else:
`v = FL_GLIDE_K * FL_DRIFT * (frame width at the aim distance)` — 0.7-0.9 u/s on the
shipped field, i.e. 4.6-5.7 cm/s in `WORLD.unitM`, the spread being which aim distance
the lane solves to. The number that is not sensitive to that is the one measured off the
film. Measured over 285 s of film, the six shots'
steady screen rates are **0.605 / 0.781 / 0.965 / 1.137 / 2.131 / 3.748 %frame/s**; the
glide's 2.131 against `FL_DRIFT`'s 0.75 is 2.84x, second-fastest under the dolly. The
rack needed nothing new: `uFocus` is the camera-to-target distance and the target is a
fixed lead down the lane, so the plane of focus rides ahead and every flower resolves as
it reaches it and softens as it passes.

**A held frame must not be a function of what the plants did while it was held** — the
lesson three separate fixes here share. A **diameter is not continuous in a growing
stand**: one arm reaching past the old extreme swaps which pair of hull points is
furthest apart and swings the answer tens of degrees between two 500 ms measurements, and
at the establishing shot's 90-unit standoff 30° is 47 units of eye, which `40_boot`'s
12%-a-frame lerp turns into 336 u/s against `FL_DIR_VPEAK`'s 26. The same teleport was
found twice in the same place, on `mid` (the midpoint of a support interval). So a shot's
heading, its end, its subject, its gap and its lane are all decided **when the shot
begins** — except where no clock is running, which is the `?shot=` capture case and is
why a pinned still had been framing a fast-forwarded stand of seedlings. Worst sampled
eye speed over 290 s of film, as each fix landed:

    239.5  →  196.0  →  168.1  →  37.7 u/s

with samples over 50 u/s going 7 → 7 → 6 → none, and the `wide` shot's own mean speed
falling 15.0 → 8.2 u/s with nothing else changed. **And a transition is an arc.** The low
shot's pose was solved out of the canopy and it still *entered* through leaf, because a
pose is where a move ends and the straight line to it goes wherever it goes.
`flDirBlendEye` interpolates the eye in the field's own polar coordinates (radius,
azimuth the short way round, height), so the camera swings around the stand rather than
through it; two poses on one bearing still give a straight radial move, which is what the
crane and the bank approach already were. The target still lerps straight — an aim has
nothing to collide with.

The pinned still is reproducible run to run now, which it demonstrably was not.

### Every flower in the field is its own (`30_scene.js`, `40_boot.js`)

The bullseye threshold and the baked spot atlas are **per-specimen** quantities —
one number and three reaction-diffusion fields off that plant's own seed — and both
arrived in the garden as scene-wide uniforms drawn once from the **hero**. A field of
seven species showed one specimen's pigment program seven times.

It was worse than redundant. `20_draw.js` has always run `flSpotsRun` for whatever
petal it is drawing, whoever owns it, so `garden=7` was already baking **twenty-one**
Mimulus fields and uploading three; the other eighteen were computed, paid for, and
thrown away. This draws what the page was already spending.

**The mechanism is a split draw, not a wider vertex.** The petal stream is one
concatenated buffer (`uploadMany`), so a uniform cannot vary inside it, and the three
obvious routes each cost something real: widening `petb` 16 → 17 floats ripples
through `10_capture.js`, the strides and the parity gate; an atlas row offset is a
per-*vertex* quantity too and ripples identically; a world-position hash in the shader
is free but per-**place** rather than per-seed, so two members standing near each other
would match. `uploadMany` already walks the list and knows each buffer's extent, so
**N geometry groups against N materials** makes a per-specimen uniform an honest
per-specimen uniform with the vertex format, the capture and the gate untouched. It
costs N−1 extra draw calls a frame at N ≤ 12, against ~700 for the streams already,
and it measures inside the noise (`flowers_perf` at `garden=7`: median gap 8.4 ms both
sides, p99 108.3 → 108.2, fps 55.5 → 56.2). With one member the groups are cleared and
the material is a single material — the shipped single draw, not a new path.

The jitter comes off each member's **own** seed with the same derived-stream discipline
as the fruit's chemistry (`mulberry32(seed ^ 0xb0117e)`), so a member's flowers are
stable across reloads and identical to what the solo page grows for that seed. The
hero's number does not move, because `plan[0].seed` **is** the URL's seed.

Measured with `tools/flowers_ident.mjs`, which reads the pigment table straight off the
materials and compares two builds pixel for pixel:

| | before | after |
|---|---|---|
| distinct bullseye thresholds, `garden=7&seed=21` | 1 (0.5771 for all seven) | **7**, spanning 0.2829–0.7909 |
| distinct spot atlases | 1 | **7**, 0 collisions |
| solo page vs a pre-change build, seeds 21 and 4207 | — | **mean pixel delta 0.0000/255**, 0.000% of 2.23M px |

⚠ **And it reads at a close-up and not at a bank shot, which is the design and should
not be argued with.** `shot=close` moves 7.56% of the frame at a mean of 0.554/255 —
the same non-hero corolla loses a broad dark proximal band and gains its own discrete
spot field, unmistakable side by side. `shot=bank` moves 1.32% at 0.041/255, and the
amplified diff map is black everywhere except non-hero corollas. Round 2 turned this
stack down deliberately after full strength read as maroon blotches; **the fix for "you
cannot see it at fifty units" is the director, not the gain.**

### The ground, and a field's own sky (`25_ground.js`)

One disc, shaded with `FL_TRI_FS` subsetted, coloured from the palette only (soil is
`bgBot` and `ambBot` pulled toward `stem0`, albedo 0.03-0.10 against blades at
0.26-0.58 and below `bloomThresh`, so a floor is felt rather than seen), alpha carrying
linear depth like every other surface here.

⚠ **The melt used to be a radius and it read as a tabletop.** The rim is not what a
viewer sees; the **horizon** is, and a fully fogged ground and the sky just above it
differ by 3-5x in luminance on these palettes (Sun Coral: fog L 0.041 against `bgBot` L
0.005). No radial fade can close that, because the seam is wherever the plane runs out
of screen. So the ground melts into **the actual sky in that direction** — `flSky`, the
background's own function, shared rather than resembled, evaluated at the fragment's
screen position — and where the melt is complete the ground is bit-for-bit the void
behind it. What drives it is the shared fog rather than radius, through the closed-form
optical depth of an exponential-height haze along a ray that ends *on* the ground:
`tau = rho0 L H (1 - exp(-yEye/H)) / yEye`, uniform when the eye is inside the layer and
thinning as `1/yEye` when it is above. That is the whole trick: an eye at ground level
sees its own near ground go, an eye above the layer does not. `FL_HAZE` is four numbers
set by looking (`?haze=G,H,P,N`), in the wind's `uRef` category, and it exists because a
garden from eye level and a solo close-up pull in opposite directions — `G` alone trades
one against the other, `P` and `N` are what let both be right.

**A plain palette mean is mud, and it is measurable.** The scene's fog, void,
hemisphere, key and glow used to come from the hero, so a garden of seven stood in one
species' weather. Averaging in RGB cancels hue against hue: over the field at
`garden=7&seed=21` the plain mean fog has saturation **0.261 against a member mean of
0.598**, and `keyCol` **0.090 against 0.328** — near-grey. `flFieldPal` therefore keeps
the weighted mean's luminance and hue direction exactly and rescales its distance from
the achromatic axis back to the members' mean chroma, clamped so no channel goes
negative (restoring chroma must not invent light). Measured on the same field, that puts
blended fog saturation at **0.527** where the plain mean was 0.261. The **grade** is
deliberately not blended — `bloomThresh`, exposure, grain, vignette and dof are the
lens, not the weather.

**The hero leads at 0.35, and that number is measured rather than tasted.** At lead 1.0
the sky is the hero's alone; at 0.0 it is the pure field mean, and every garden then
looks the same, which is the failure a blend invites. Over 40 fields of seven, the mean
pairwise angle between two gardens' fog **hues** is 84° at lead 1.0, **64° at 0.35** and
27° at 0.0 — so two thirds of the between-garden variety survives the blend. `?sky=`
overrides it, which is how the A/B was shot.

#### The pool of light was the origin's, and a field is not at the origin (2026-08-13)

The establishing shot had no visible ground, and **the melt was not the reason** — which
is the part worth keeping, because the melt was the obvious suspect and the diagnosis was
made by an instrument rather than by reasoning. `tools/flowers_floor.mjs` renders the same
settled frame three ways (everything / ground hidden / ground alone) and takes the
difference per horizontal band, which is the only honest way to measure "the field floats
in void": a dark floor and a dark void are the same pixels, and on the pre-pool build
**eight of twelve bands came back exactly zero**. It also prints the melt profile along
the view ray from the material's own uniforms, and that is what corrected the first
answer: the melt is **0.75-0.93 out where the plants stand**, not 1.0.

What had taken the floor was `c += uGlowC * exp(-r * 0.20)` — a **5-unit length scale
written for a page holding one plant at the origin**. In a field of seven the plants stand
at r = 12-26, where that pool has decayed to 0.6%, so the stand was lit by nothing. The
scale is the **clearing's** now: `rim + FL_GARDEN_SPACING`, which is the story radius
`FlPollen` independently arrives at for the same field, and which spends no new
hand-picked number — 26.4 + 12 = 38.4 on the shipped field, so the pool is 1/e exactly at
the edge of the clearing the grains may drift into. With no plan it is `FL_POOL[1]` = 5.0
and the solo page does not move, the same by-construction no-op as `flFieldPal`.

**And the pool is AIRLIGHT, not albedo — that is a rejection, not bookkeeping.** Adding
it flat to the floor's colour was built first and measured. A flat pool is a statement
about the *floor*, so it is loudest where the floor fills the frame: it lit the
establishing shot correctly and turned an overhead into a sheet of magenta with the plants
as silhouettes. `mix(surface, sky, melt)` is already the airlight form, so the glow
belongs in the air's colour with the same `(1 - transmittance)` weight — 18% of it
survives that overhead against 75-93% of the establishing shot, which is the right way
round, and it is the airlight integral written out rather than a second exponent chosen by
eye. Ground contribution per band, bottom four, of 255:

| | band 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| before | 0.31 | 1.83 | 5.64 | 10.06 |
| flat pool (**rejected**) | 2.11 | 11.49 | 20.62 | 24.76 |

The airlight pool that ships was measured on the frame instead: wide-shot mean pixel
46.52 → **49.34**.

`tools/flowers_horizon.mjs` at its three heights, mean pixel, no pool → shipped: low
(eye 0.35) 100.29 → 101.39, mid (3.5) 54.37 → 60.47, high (26) 59.83 → **64.01** — where
the flat pool put that last one at 78.59. No hard horizon appears at any of the three: the
geometric rim term multiplies the pool out, so a pool wide enough to light the near ground
cannot paint a band past the disc. The solo Nightglass Parasol is held (per-band ground
contribution 0.00-0.31 before, 0.00-0.28 after — felt, not seen). `?pool=K,R` sweeps the
strength and the length scale from one build.

**The pool breathes with the sky, because it *is* the sky's glow.** `flSky` already
multiplies the void's glow by `(0.85 + 0.15 sin(uT * 0.0007))` — a 9.0 s period at ±15%,
shipped long before any of this — and a static pool under a breathing sky is two glows
that merely resemble each other, which is the thing the shared `FL_FOG` and `FL_SKY`
chunks exist to prevent. Same term, same `uT`, no new uniform and no new number; it can
only ever scale the pool *down* (0.85..1.0), so it cannot introduce an edge the horizon
check did not already see. ⚠ **Nobody has watched it move**: a still cannot see a
9-second breath at all, and the consistency argument above is the whole of what is
claimed. Establishing shot mean pixel 46.52 on the base, 49.05 shipped.

### The harness

```bash
node tools/flowers_shot.mjs shots/g.png 'garden=7&seed=21&ff=3000&speed=0&shot=wide'
node tools/flowers_perf.mjs 'garden=7&seed=21'      # rAF gap sampler, 30 s of LIVE growth
node tools/flowers_horizon.mjs shots/h 'garden=7' # the horizon from three camera heights
node tools/flowers_clip.mjs shots/cine 'garden=7&seed=21&ff=3000' 90   # the page as a FILM
node tools/flowers_frame.mjs 'garden=7&seed=21&shot=wide'  # WHERE in the frame is the field
node tools/flowers_floor.mjs shots/f 'garden=7&shot=wide'  # what is the ground WORTH
node tools/flowers_motes.mjs 'garden=7&seed=21&shot=bank'  # what SIZE is a grain, in px
node test/flowers_capture.mjs '{"n":7,"steps":3000}'   # the field profiler, headless
```

`tools/README.md` has the rest — nine more probes came out of the flash and the black
square, and they generalise beyond this page.

`flowers_clip.mjs` is the only artifact here that shows the piece **moving**, and it is
the instrument the director's drift was measured with: it records the tab with
Playwright's `recordVideo` while sampling the camera at 4 Hz, and reports speed in frame
widths per second, the stationary fraction, and the capture cost. Extract frames with
`ffmpeg -i clip.webm -vf fps=1 f%03d.png` and read them — consecutive frames a second
apart are the only evidence that the camera language is continuous.

`flowers_horizon.mjs` exists because the boot's framer owns the camera and picks one
height, so no shot tool here could answer "does the ground melt from a low camera"; it
wraps `scene.render` and overrules the framer per frame. `flowers_perf.mjs` is
`garden_hitch.mjs`'s lesson applied to this page — **a harness that waits cannot see a
freeze** — and it prints without judging, because this piece has no frame budget yet;
read `garden_hitch`'s other lesson before adding a verdict line to it.

**And one of them was checked by another implementation, which is why it is right
now.** `tools/flowers_shot.mjs` summed the garden's buffers and then added the hero's
again — `__fl.B` *is* `garden[0].B` in a garden — so a stand of seven reported 998
organs for 771 and 10.34M tri floats for 8.18M. Nothing in the page disagreed with it.
`test/flowers_capture.mjs`, which reaches the same quantities down a different path,
did.

### ⚠ What has NOT been done, and it is the important line here

**A person has now watched this page, and the one thing they reported was a defect no
instrument here was looking for** — "glitchy flashes on flowers", which turned out to be
two separate rasterisation bugs and is written up below. That is the fifth time the
deciding instrument on this project has been an eye, and it is exactly the argument this
section was written to make. **It does not discharge the debt.** Nobody has sat through a
full shot rotation at N = 5, 7 and 12 at framerate, so the shot list, the holds, the
drift, the ground, the sky and both LOD terms are still judged on stills, headless numbers
and one 290 s recording sampled at 4 Hz.

Two things a still has already caught. The **`wide` shot** at `garden=7&seed=21&ff=3000`
was a wall of near canopy with nothing receding behind it; the heading is measured off the
field's own diameter now and the drawn stations span 1.173 → 1.526 of the frame, which is
an improvement to the *framing* and not yet an answer to the *recession* — the field is
still measured from stations plus reach percentiles, and this catalogue's tail is enormous.
And **garden time slows with N** — the step pool is `max(8, nAct)`, so at N = 12 each plant
gets one step a frame against a solo page's six. ROADMAP 0f has both, ranked, with watching
it first.

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

**⚠ That table was taken before the germination plan changed, and half of it does not
reproduce.** It was measured with `FL_GARDEN_STAGGER` 2400 and uniform-random
`startAt`s; the shipped plan staggers over 1200 with a first cohort, so every member
is *older* and carries more leaf. Re-run on the shipped plan — same command, same
seed, same raster, `node test/flowers_capture.mjs '{"n":7,"steps":3000,"lod":0}'` —
the field is 761 organs and 127.3 ms of capture, and it splits:

| kind | ms | share | | kind | ms | share |
|---|---|---|---|---|---|---|
| sepal | 37.6 | 29% | | stamen | 22.3 | 17% |
| petal | 33.5 | 26% | | rest | 5.9 | 5% |
| leaf | 29.9 | 23% | | | | |

**The headline survives and one of its numbers does not.** Floral organs are 74% of
the capture (was "70%"), and the cause is still one `detL = 1.0`. But the petal
stream is **46.7% of the floats, not 58%**, and *sepals overtake petals* once the
members are grown. Two things follow: the absolute ms are machine-relative and worth
nothing across machines, and **a profile of a field is a profile of that field's
germination schedule** — re-take it when the plan moves. With the cap on, the same
field costs 56.1 ms and 7.80M floats against 127.3 ms and 25.0M, and flips to
leaf-dominated (leaf 56.6% of the capture).

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

## The one-frame flash — a triangle with no area, and the bloom chain as a lens

AJ watched the field and reported "glitchy flashes on flowers... every now and
again". It is real, it was caught on camera, and it took five probes to say
what it was, because every one of the obvious answers was wrong.

**What it looks like.** A screen-axis-aligned rectangle, 64–100 px, of regular
grid noise, on or beside a flower, for exactly one frame. `tools/flowers_glitch.mjs`
catches it at full resolution the frame it happens: 3 confirmed still-camera
flashes per 75 s at `garden=7&seed=21&ff=2200`.

**The chain, in the order it had to be walked.**

| probe | what it settled |
|---|---|
| `tools/flowers_peak.mjs` | the HDR scene target holds **8,863** at one texel against a frame-peak median of **2.38**, and — attributing in the SAME frame by re-rendering each stream solo — it is the **tri** stream |
| `tools/flowers_scan.mjs` | the DATA is clean: no NaN anywhere, largest colour **1.29**, largest emissive **0.83**. But the minimum normal length is **0** |
| `tools/flowers_term.mjs` | at the flash: vC **7.07**, vE **4.70**, \|vN\| **32.9**, and `vC*vE*3` at **710** against a legitimate ceiling near 3 |
| `tools/flowers_kind.mjs` | the organ is a **leaf** (or a sepal, or a stamen — never a stem), by re-rendering one organ kind at a time |
| `tools/flowers_sliver.mjs` | the triangles covering the flash have screen area **0** and **world** area **0**, spanning up to **14 px**. **6.7–8.5%** of every frame's tri stream is exactly that |

A varying outside the hull of its own vertex values is not a shading result, it
is a statement about **interpolation** — which is why "clamp the anther glow"
and "it must be the pollen" were both dead ends (pollen was falsified early by
`?pol=0,12,0.05`, which flashes at the same rate).

**The mechanism.** `blade()` lays a quad grid over a parametrisation whose
half-width collapses to a point at the leaf base, so the first column of quads
arrives as two coincident vertices and one distant one — a segment wearing three
vertices. It has no barycentric denominator; the rasteriser lights the odd
fragment on it anyway, by fixed-point snapping and the fill rules, and hands
that fragment varyings computed as finite-over-nothing. The half-res bloom chain
then does what a bloom chain does to an impulse: three separable 5-tap blurs at
radii 1, 2.6 and 4.2 have a **sparse** impulse response, a comb of bars about
4 px apart, and that comb over a 64–100 px square is the "grid noise". The grid
was never texels of anything — it is the blur kernel, seen naked.

**Two fixes, both at a cause.**

1. `10_capture.js` **drops a triangle with no area** and counts what it dropped.
   Scale-free: `|e1 x e2| <= 1e-9 * max(|e1|², |e2|²)`, a floor at float32's own
   arithmetic rather than a dial. Nothing legitimate goes — a zero-area triangle
   cannot cover a pixel correctly — and the parity gate reconciles against the
   count instead of being loosened for it: **shipped 267,420 == captured 249,540
   + petal 9,360 + no-area 8,520**, exactly, 20 checks → 24.

2. **That alone was not enough, and that is the part worth keeping.** It took the
   scene peak 7,779 → 1,772 and the visible flash rate 3/75 s → 9/130 s, because
   the residual is legitimate geometry seen **edge-on**, which cannot be removed:
   a leaf has to be drawable from the side. So `30_scene.js` enforces the
   interpolation contract instead, and the test is a **theorem**, not a
   threshold: every vertex normal is unit and perspective-correct interpolation
   is a convex combination, so `|vN| <= 1` holds for every correctly interpolated
   fragment. Splitting the shaded colour on that test puts the **whole** spike
   above it (56.10 at the peak block) and **0.69** below it. A fragment that
   fails is not dim, it is meaningless, so it is discarded. The 1.01 is a float32
   allowance; raising it does not make anything look better, it only lets the
   flash back.

**Measured, `garden=7 ff=2200`, 90 s of peak probe per cell:**

| | seed 21 before | seed 21 after | seed 1337 before | seed 1337 after |
|---|---|---|---|---|
| frame-peak median | 2.38 | 1.84 | 6.72 | 1.97 |
| frame-peak p99 | 369.5 | **5.2** | 439.9 | **19.1** |
| frame-peak max | 7778.7 | **20.0** | 8124.5 | **175.9** |

`tools/flowers_glitch.mjs`, 130–135 s each: **0 confirmed spikes in 1,955 frames
at seed 21 and 0 in 2,164 at seed 4242**, against a 3-per-75 s baseline. The
picture is unchanged — mean pixel 71.59 → 71.31 on the close shot and
45.35 → 45.42 on the wide — and `tools/flowers_perf.mjs` is flat at the median
(gap 8.6 ms both sides, p95 66.8 → 66.9, p99 100.0 → 108.4, fps 57.2 → 55.6).

**⚠ The shipped page still emits the same null geometry**, because `blade()` is
`src/50_geom.js` and both pages call it. It was left alone here deliberately —
this branch owns `flowers/` — but `canalisation.html` is emitting the same
triangles and carrying the same zero normals, and it has the same bloom chain to
magnify them. **Both fixes above are flowers-side and neither is the real one**:
the real fix is at the source, in the parametrisation, and it is booked in
ROADMAP as a decision somebody should take deliberately rather than as a patch.

### The SECOND artefact was the same null geometry, seen through the other hole

While gating the flash a different one-frame defect turned up at `seed=1337`: a
clean screen-axis-aligned square of **pure black**, anywhere on screen, for one
frame. It was not the flash — a hole, not a splat, and it never carried the bloom
comb — and the standing hypothesis was a driver dropping a raster tile, because
it was seed-dependent (13 events in 135 s at seed 1337, **zero** in 1,955 frames
at seed 21 and 2,164 at seed 4242) and had only ever been seen under headed
ANGLE-on-Metal, where ~128 px is a plausible TBDR tile.

**It is ours, and it is the same collapsed blade base.** `tools/flowers_zeron.mjs`
settles that half in Node with no GPU at all: **15,560 of 915,792** captured
vertices carry a normal of exactly zero (2.30%; 14,485 of 629,364 in the tri
stream alone), matching the no-area triangles `10_capture.js` drops species for
species — and the population is a **gap**, a normal is 0 or it is 1 to within
1e-7, with nothing in between. A triangle carrying one of those still has area,
so it is drawn; a fragment landing on that vertex gets `|vN| = 0`, divides by it
in `normalize()`, and writes a **NaN** into the HDR scene target. The post chain
does the rest: three separable blurs spread it over 3.2308 x (1 + 2.6 + 4.2) =
25.2 half-res texels each way, a separable blur's support is a **rectangle**, and
the comp passes NaN through `aces()` and `pow()` untouched. The square measures
**112 x 112 px in six of eight** captured frames — the post chain's own impulse
footprint, not a tile size. The absent bloom comb is not evidence against that
path either: a comb is what a *finite* impulse leaves at sparse taps, and a NaN
has no magnitude to comb with.

**The one-line fix is the guard rewritten as the negation of the valid band**, and
the lesson is the reason it needed rewriting at all: `if (length(vN) > 1.01)
discard;` — the guard phase 1 added against corrupt interpolation — **could never
fire on a NaN, because every comparison against a NaN is false.** The guard built
against bad varyings was the one thing that could not see the worst of them.
`if (!(length(vN) > 0.0 && length(vN) <= 1.01)) discard;` closes the zero end with
an *exact* comparison rather than an epsilon (the measured population is a gap, so
0 is a bit pattern and not a small number) and is NaN-safe. For any finite
`|vN| > 0` the two forms are the same test.

Measured at seed 1337 (`garden=7`, `ff=2200`, ANGLE-on-Metal, 1100x780):

| | before | after |
|---|---|---|
| non-finite texels in `rtScene` | 69 frames / 4,921 | **0 / 4,040** |
| confirmed one-frame holes | 8 / 4,026 | **0 / 4,027** |
| near-black candidates | 8 | **0** |

Seeds 21 and 4242 give 0 non-finite under **both** guards, which is why they never
showed the square.

**Four probes, because each one could not answer the next question**, and the
chain is in `tools/README.md`: `flowers_black` proved the hole was in the drawing
buffer (two readers of the same frame agreed 376 of 376) but its collapse test
counts camera cuts as well; `flowers_hole` asked for the artefact's own signature
(near black, still camera, one frame, recovers) and reduced every post target on
the same frame; `flowers_nan` classified rather than counted, with no `isnan()`
(GLSL ES 1.0 has none — NaN fails every comparison, ±Inf fails exactly one) and
bisected to the tri stream with `HIDE=`; `flowers_vn` named the term by rewriting
`FL_TRI_FS` at runtime, and found **83 markers, all of them `|vN| == 0`**, with
zero unexplained NaN left over.

⚠ **And the A/B that gated it needed a control, three times over.** A before/after
screenshot cannot settle this — the director drifts perpetually and the air never
stops, so **two sessions of the unchanged build differ by a mean 9.5/255 with 43%
of pixels past 8**. So `tools/flowers_guard.mjs` runs both guards against the
*same* frame, and even then its first two designs had floors they could not see:
Three deep-copies a cloned material's uniforms (every block changed, by up to 84),
and the opaque render list sorts by material id, so a clone with *identical*
source still moved 75 blocks a frame. Toggling `fragmentShader` on one material
object keeps the id and the sort. Over 3,921 frames: **0 blocks where both guards
are finite and disagree**, against a control floor of 0, and 38 blocks where the
old guard was non-finite and the new one is not.
