# Roadmap

Entries keep their original numbers as they are finished, and finished ones stay
here for the reasoning they record — so **the section numbers are history, not
priority.** The list below is the priority.

**Start here, in this order:**

1. **[#7, one air, and a plant that responds to it](#7-one-air-and-a-plant-that-responds-to-it)** —
   went to the top on 2026-07-26. A shed blade is now properly loaded aerodynamics
   while everything still attached is a rigid card in dead calm, so abscission is a
   discontinuity between two unrelated models of the same air. It is also the route
   to deleting `droop` ([#7b](#7b-droop-as-a-force-balance)), and it shares its
   machinery with #3 below. **Scoped, pre-flighted, and started** — the stem bends
   for real, the stiffness stop-condition passes on one material constant, and step
   1 (the field itself, `37_wind.js`) landed on 2026-07-26. **Start at step 2,
   attached blades.**
2. **[#6, one specimen giving way to the next](#6-handover-and-the-end-of-the-film)** — the last piece
   of the life cycle, and the only part of senescence still unbuilt. `dead()` is
   the trigger and the camera director already exists. It carries the ending as a
   *shot* too: a run currently tails off rather than finishing.
3. **[#5, petiole radius at flower scale](#5-smaller-things)** — an afternoon, with a clear repro shot.
4. **[#3, the third phyllotaxis hypothesis](#3-third-phyllotaxis-hypothesis)** — the honest headline limitation.
   Pure science; a negative result is as publishable as a positive one here. **Read
   #7 first**: its second candidate route is a mechanical-stress term, which is #7's
   machinery, so the two are cheaper together than apart.
5. **[#4, lamina tensioning its own margin](#4-lamina-pulls-on-its-own-margin)** — meaningful quality jump, meaningful work.

#1, #2, #4b and #8 are **done**; their entries are kept for what they record.

## 1. Life cycle and senescence — DONE (2026-07-26)
Both halves, simulated and drawn, in one day and two branches.

**Simulated.** A specimen **finishes**. `Plant.spent()` is true when every growing
point has arrested or consumed itself, `senesceStep` dismantles the blades in a
wave from there, and `dead()`/`stage()` report the end. Cathedral Fern sheds 96 of
96 over ~4600 steps and reaches stage `dead`. The CI gate asserts a spent specimen
senesces.

Getting there falsified four hypotheses about deriving abscission from auxin
transport, and the whole-plant stream that was built to test them is kept, off, in
`38_shoot.js`. **Read the JOURNAL entry before reopening this** — the honest
summary is that the *timing* of senescence is emergent and the *order* is imposed
(SCIENCE.md item 6), and the route to deriving the order away is light, not
another molecule.

**Drawn.** `org.sen` and `org.shed` are read by the geometry: the lamina drains,
the tissue held against a vein drains last so a blade empties into its own
canalised network, the glow dies, the blade curls as it dries, and a shed organ
separates at the base of its stalk and flutters down. The drained colour is
*derived* from each species' own rather than painted — there are no per-species
browns and adding a ninth species will not need one.

Where the three `senesce_shot` marks used to come back identical at 63594
triangles and 141528 lines, `spent` is now 16-22k, depending on how many blades
the poll catches still falling: the canopy has actually left. Numbers for the
colour claim are in `test/senesce.mjs`, which drives the shipped `blade()` and
prints an ASCII map of what is still holding colour. JOURNAL.md has the reasoning,
TUNING.md the seven constants, and SCIENCE.md item 6 now covers the within-blade
order as well as the between-blade one.

Two things this exposed rather than added, both fixed here: `Plant.bounds()` was
counting shed organs, so a stripped specimen was still framed for its old canopy;
and `build.js` would report success on a bundle that did not parse. See PITFALLS.

**What is left is the handover — [#6](#6-handover-and-the-end-of-the-film).** The stem and fruit persisting
after every blade has gone has now been looked at on screen and is being kept: it
reads as a seed head, which is right. The stem does not drain and that is also a
choice, not an omission.

## 2. Cell-level view on a leaf — DONE (2026-07-25)
The **look closer** treatment now exists on the blade as well as the meristem, so
both halves of the claim are visible: needles converging to make a leaf, and the
same needles falling into line to make a vein. "into the cells" walks through
both.

Two things had to be true that were not. The meristem's display channel does not
transfer — polarity is constant across a blade (1.01x vein against areole) and
traffic is what separates (2.9-5.0x), so needle direction comes from PIN and
brightness from flux. And canalisation is over in a quarter of a second, so the
close-up regrows the blade from its seed, which reproduces it exactly. Details and
the reverted first attempt in JOURNAL.md, constants in TUNING.md, three new
rendering traps in PITFALLS.md.

Follow-up worth doing, deliberately left out: **keep one leaf canalising for the
whole life of a specimen.** The pool stops making leaves once the library is full,
so after the first second every blade on the plant is frozen and the library never
refreshes. Growing replacements continuously would give later organs different
leaves from juvenile ones, which is botanically right — but it changes what every
specimen looks like, so it wants its own branch and its own before/after.

## 7. One air, and a plant that responds to it

**The problem, stated the way it was first noticed:** *there's clearly some
gravity/wind field on the leaves, but ONLY the moment they die do they become alive
and fall — the rest of the plant has no response to gravity or wind.*

Correct, and the mechanism is worse than it sounds. There are now **two unrelated
models of the same air.** A shed blade is a properly loaded aerodynamic body,
integrated on the CPU in `39_fall.js`. Everything still attached is a rigid card in
dead calm, displaced by `SWAY` in `60_render.js` — three sines of position and time
evaluated in the vertex shader, which the simulation cannot see. The falling blade
even gets that decorative displacement added on top of its own physics. So nothing
in the scene establishes that there *is* air in it until a leaf needs some, and
abscission is the seam between the two.

### Decided: the stem bends for real

Asked whether to stop at wind-responsive blades or go all the way, the call was **all
the way** — the axes become a dynamic elastic system that genuinely bends under wind
and its own weight, and `SWAY` in `60_render.js` is *replaced* rather than fed. Blades
alone would have left the stem moving to a rhythm unrelated to the air, which is a
smaller version of the same complaint.

**`droop` is explicitly NOT in this branch.** Deriving it from a gravity/aero force
balance deletes a SCIENCE.md prior and is the bigger prize, but it changes how all
eight species look at every stage. Tangled up with a motion change, a regression in
either becomes hard to attribute. Its own branch, its own before/after — see 7b.

### The shape of it

One field, defined once, read by everything:

- an actual wind velocity field, expressed once and available to **both** the
  simulation and the shader — not two functions that resemble each other, which is
  precisely the failure being fixed;
- attached blades loaded through the **same plate model the fall already uses**
  (`39_fall.js`), rocking on a petiole with elastic restoring torque and damping;
- the stem genuinely bending — the part that makes this days rather than an
  afternoon;
- abscission continuous in attitude **and angular velocity**, so a blade that lets
  go is already moving in the air that will carry it down. This is the actual seam,
  and it is the acceptance criterion: if you can tell from the motion which frame a
  blade detached on, it is not done.

### Pre-flight: the stop condition, already tested (2026-07-26)

The condition was that bending stiffness must come off `EI ∝ r⁴` on radii the plant
already grows (`ax.radii`, emergent from Murray's law), so the engine costs one or two
*material* constants rather than eight species-specific ones. A naive elastic stem
needing per-species stiffness would add more constants than `droop` deletes — a net
loss by this project's own accounting.

**It passes.** First cantilever mode `f₁ = 0.5596·(r/L²)·√(E/4ρ)`, with `I = πr⁴/4`,
`ρ = 800 kg/m³`, radii and lengths measured off real specimens at 6000 steps:

| species | L (m) | base r (mm) | slenderness | f₁ @ 1 GPa | f₁ @ 60 MPa |
|---|---|---|---|---|---|
| Cathedral Fern | 1.08 | 17.9 | 60 | 4.81 Hz | **1.18 Hz** |
| Spiral Ossuary | 1.59 | 16.2 | 99 | 1.99 | **0.49** |
| Abyssal Frond | 1.27 | 17.9 | 71 | 3.46 | **0.85** |
| Sun Coral | 0.95 | 17.7 | 54 | 6.16 | **1.51** |
| Hoarfrost Thicket | 0.61 | 15.2 | 40 | 12.65 | **3.10** |
| Ember Creeper | 1.60 | 18.0 | 89 | 2.21 | **0.54** |
| Sulphur Rosette | 0.31 | 18.6 | 16 | 61.88 | **15.16** |
| Nightglass Parasol | 0.65 | 25.2 | 26 | 18.87 | **4.62** |

**One material constant, `E ≈ 60 MPa`, puts seven of eight species in 0.49–4.6 Hz**,
which is plant-like sway, and the spread across them is emergent from geometry alone.
Nothing per-species is needed.

Three things to carry forward from that table:

1. **The tissue is soft, and it has to be.** 60 MPa is turgid, parenchyma-rich,
   succulent-like — not wood, which is 1–10 GPa and gives 2–60 Hz. That is not a
   fudge to get a nice number: these stems are genuinely fleshy. Slenderness runs
   16–99 where a real herbaceous stem is nearer 200, so the radii the simulation
   grows describe thick succulent axes, and soft tissue is the consistent reading.
   Do not reach for a woody `E` and then wonder why everything buzzes.
2. **Sulphur Rosette is a real outlier and is not a bug.** A 31 cm plant with an
   18.6 mm base radius is a stubby cushion; slenderness 16 *should* be stiff, and
   15 Hz is what that geometry means. Its motion has to come from its leaves, not
   its stem. If a fix makes Sulphur Rosette's stem sway, that fix is wrong.
3. **`ρ = 800` and `E` are the whole material budget.** If a third material constant
   starts to feel necessary, that is the signal to re-read this section.

### The order to do it in

Do not start by writing a solver. In order, each step measurable before the next:

0. **Done** — the table above. `EI` off emergent radii gives plant-like frequencies.
1. **Done (2026-07-26)** — the field. `37_wind.js`: a log-law boundary layer with a
   Kolmogorov gust ladder advected by Taylor's hypothesis, exactly divergence-free,
   with one dial (how hard it is blowing) and everything else measured or derived.
   The JS and the GLSL come off one baked mode table — `windGLSL()` unrolls the same
   numbers `windAt()` sums — and they agree on a real GPU to 2.5e-5 of the mean wind
   speed (`tools/wind_check.mjs`; `test/wind.mjs` for the physics). Nothing reads it
   yet, and `SWAY` is untouched.

   Three things to carry into step 2:

   - **The air contains energy where the stems will resonate, but only at low wind.**
     At `uRef: 1.2` all four gust modes fall in 0.3-6 Hz, which brackets the pre-flight
     table's 0.5-4.6 Hz. At `uRef: 6` only 44% of the gust variance is still in band,
     because Taylor scaling sweeps the small eddies past faster. A gale will move the
     plant less per unit of wind than it looks like it should; that is physics, not a
     bug to fix.
   - **Hand the shader PLANT time, not `App.t`.** `SWAY` reads real milliseconds.
     A field driven by wall-clock in the shader and plant time in the simulation is
     two airs again, in a form that only shows on the time slider.
   - **The smallest mode is 2 world units and up to 6 Hz.** Nothing filters that yet.
     The plant's own dynamics is the filter — that is the point of replacing `SWAY` —
     so do not smooth the field to make step 2 look calmer.
2. **Attached blades.** Petiole as a damped torsional spring driven by the existing
   plate model. A new harness — `test/wind.mjs` — should show blade response scaling
   with gust strength and with the blade's own area, and going quiet in still air.
3. **The stem.** Axes as damped cantilevers off `E` and `ax.radii`. Check measured
   frequencies against the table above; if they disagree, the solver is wrong, and
   that is a genuinely valuable check to have precomputed.
4. **The seam.** Continuity of attitude and angular velocity at abscission. Assert
   it: the angular velocity a blade starts its fall with must equal the one it had
   while attached, to within a step.
5. **Delete `SWAY`.** Only once 1–4 hold. Two air models is the bug; adding a third
   temporarily is fine, shipping two is not.

### Decide this up front rather than discovering it in the docs

The piece currently claims **one rule and one engine** — `stepAuxin()` on any
topology — and README, CONTRIBUTING and CLAUDE.md all lead with it. A second solver
makes that two engines, and that framing needs a deliberate decision.

The defensible position, and the recommended one: wind and gravity are
**environment, not shape.** Responding to them is not an imposition in the sense the
SCIENCE.md list means, any more than gravity was for the falling blade — and the
mechanics *removes* imposed constants (`SWAY`, and then `droop`) rather than adding
any. So the one rule survives intact; what changes is that the piece now also has
weather. Say that plainly in README rather than quietly growing a second engine.

## 7b. Droop as a force balance

Deferred out of 7 on purpose. `sp.droop` is one stated constant in
`40_plant.js:615` and eight values in the species table, and it is currently the
answer to "how far does a leaf hang". Once a blade is loaded by its own weight and by
air, that becomes a force balance and the constant can go — **deleting an entry from
SCIENCE.md's imposed list**, which almost nothing else on this roadmap does.

Needs 7 first, and needs its own before/after across all eight species, because it
changes every silhouette at every stage. Expect petiole stiffness to have to carry
what `droop` used to, and check that it does not simply become `droop` wearing a
physical-sounding name: the test is whether a bigger blade on the same stalk hangs
lower without anyone saying it should.

## 8. The falling leaf — DONE (2026-07-26)

The last authored motion in the piece. Four constants and a positional hash became
integrated quasi-steady plate aerodynamics, and the whole of it — regime, speed,
drift, direction of turn — is now derived. Nothing about it is chosen: gravity, air
and leaf mass per area are physical, and the two exchange rates needed to put them in
world units were already fixed by things that shipped months ago.

The result worth keeping is that **the blades on one specimen do not fall alike.**
Which of flutter, tumble, chaos or glide a blade picks is selected by a dimensionless
moment of inertia made of the width its own margin grew; all eight species show more
than one regime among their own leaves, and descent speed spans 8.7x where it used to
be identical for every blade. Which way a blade turns comes from the margin's
left-right asymmetry, which splits 50/50 across a canopy with nothing asking it to.

An earlier draft picked the density by hand to try to arrange that straddle and put
every blade on the same side of it. The measured constants beat the tuned ones.

Blades also now land, which they could not before — there was no ground. Four bugs
and one bad assertion are written up in JOURNAL.md; all five were found by
`test/fall.mjs` and none would have been visible on screen. The limitation it left
behind is #7 above.

## 3. Third phyllotaxis hypothesis
A second length scale from structure rather than chemistry: two cell layers (L1
patterning, L2 draining), or a mechanical-stress term. See JOURNAL.md. If the angle
tightens toward 137.5° when the scales are decoupled *structurally*, that is a real
finding and worth writing up properly.

## 4. Lamina pulls on its own margin
Leaf outlines are rougher than real leaves because only the boundary is simulated —
a real lamina tensions its own edge. Would need a 2D tissue with a free boundary.
Meaningful quality jump, meaningful work.

## 4b. Floral axes that never finish — DONE (2026-07-25)
Fixed as a consequence of giving the floral apex whorls: once the apex genuinely
consumes itself, "spent" is a physical state and `floralOrgans` is only a ceiling
over it. 12 of 16 runs affected → 0 of 16; heights stopped running away (Cathedral
Fern 78.8 → 16.4). Petal counts did change, as predicted, and are now emergent —
before/after in JOURNAL.md. The guessed fix ("an apex that has stopped emitting is
spent") was right but insufficient on its own: idleness alone cannot be distinguished
from slow patterning near the wavelength limit, so it takes a geometric condition
too. Details in JOURNAL.md and TUNING.md.

## 5. Smaller things
- **Organ petioles dominate a flower close-up.** At flower scale the stalks are fat
  opaque tubes and the petals read as blades bolted to scaffolding. Pre-existing and
  unrelated to whorls, but the flower shot is where it shows — reproduce with
  `node tools/flower_shot.mjs shots/f.png 'Sulphur Rosette' 424242`. Probably wants
  petiole radius to scale with the organ it carries rather than with the stem.
- Flowers do not announce themselves against heavy foliage; make them larger and open wider
- Fruit is a little small against the plant (`fruitScale`)
- Fenestrated species get blocky holes at low blade LOD
- Director's later shots (flower, fruit, ripening) are built but lightly tested — I never watched a full seed-to-ripe run at framerate
- First-run tip fires once; a viewer arriving mid-scroll misses it

## 6. Handover, and the end of the film
A new specimen germinating as the old one fades — the last piece of the life
cycle, and now that the old one visibly dismantles itself there is something to
hand over *from*. `Plant.dead()` is the trigger and the camera director already
exists and would shoot it.

**This entry also owns the ending as a shot, which is not composed yet.** Watch
`senesce_shot`'s `-spent` frame: a bare seed head, correct in every particular and
dim, small and unresolved. The specimen loses most of its volume in the last few
seconds, the framer is damped against a bounding box that is itself damped, and by
the time it has caught up the stems are lit from behind and read as a silhouette.
None of that is wrong, exactly — but nothing has decided what the last ten seconds
of a run should look like, and until something does, the piece still tails off
rather than ending.

The open questions are whether the new seed shares the frame with the standing
seed head or replaces it, and whether the species changes. None of them is
answerable from a headless harness: this one wants a real browser and a decision,
not a sweep.

## Known-good verification loop
`node build.js` then open in a real browser (not headless — software rendering is
~16fps and cannot judge motion). Let a specimen run the whole arc — seed, leaves,
flower, fruit, ripe, and now on through `senescing` to `spent` — and watch the
camera work. The stage bar at the bottom tells you where it has got to.

At the default speed a Cathedral Fern reaches `senescing` around 19s and `spent`
around 73s; the time slider goes to 4x if you want it sooner. `tools/senesce_shot.mjs`
does the same run headlessly and dumps the state at each mark.
