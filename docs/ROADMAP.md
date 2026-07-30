# Roadmap

Entries keep their original numbers as they are finished, and finished ones stay
here for the reasoning they record — so **the section numbers are history, not
priority.** The list below is the priority.

**Start here, in this order:**

0. **[#13, a conifer](#13-a-conifer-not-started)** — **START HERE. This is the next
   thing to build**, and it is a direction rather than a debt: AJ asked what else the
   engine could grow, and a ninth species that is a *different body plan* is worth more
   right now than any of the polishing below. The needles are already proven (see #13
   for the numbers); the interesting claim is that a conifer's conical silhouette
   should fall out of apical dominance the engine already has, and the cone should
   **delete** the ovary path rather than add anything. Do the pre-flight first.
1. **[#10b, what the garden still owes](#10-a-garden-2026-07-29)** — a stand of plants
   ships, and it left three things behind: the simulation cost of stepping eight
   specimens, a species picker that samples with replacement, and a director whose
   whole shot list assumes one subject. The first is the real one. **None of it is
   research** — it is the cheapest interesting work on this list.
2. **[#6, one specimen giving way to the next](#6-handover-and-the-end-of-the-film)** — the last piece
   of the life cycle, and the garden has **reframed rather than replaced** it: the
   question is no longer "one plant replaces another" but "a stand gains and loses
   members", and the scene already holds a list. `dead()` is still the trigger. It
   carries the ending as a *shot* too: a run currently tails off rather than finishing.
3. **[#9, a blade that gives](#9-a-lamina-that-gives-and-a-blade-that-reconfigures)** — the debt #5
   left behind. The attached blade's twist ships **off**, because on a
   petiole with a physical radius one rigid degree of freedom hinged at mid-chord snaps
   between face-on attitudes instead of rocking. It is also the same machinery #4 wants.
4. **[#3, the third phyllotaxis hypothesis](#3-third-phyllotaxis-hypothesis)** — the honest headline limitation.
   Pure science; a negative result is as publishable as a positive one here. **Read
   #7 first**: its second candidate route is a mechanical-stress term, which is #7's
   machinery, so the two are cheaper together than apart.
5. **[#4, lamina tensioning its own margin](#4-lamina-pulls-on-its-own-margin)** — meaningful quality jump, meaningful work.
   Cheaper alongside #9, which needs a lamina that deforms for a different reason.
6. **[#11, a ribbon as twelve floats instead of forty-two](#11-a-ribbon-as-twelve-floats)** — the one
   piece of pure engineering on this list, and it now has numbers behind it. A ribbon
   is 188ns and a point 37ns, a ratio of 5.1 against a data ratio of 6, so the line
   pass is memory traffic and there is nothing to shave inside the current format.
   Instancing it would speed up **every view at once**, hand back most of the 64MB the
   line buffer had to grow to, and is what stands between the cell view and a whole
   garden of it.

#1, #2, #4b, #5, #7, #7b, #8, #10 and #12 are **done**; their entries are kept for what
they record. **#12b is falsified** and its entry is the one to read before anyone asks
about grass, palms, or any other monocot.

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
2. **Done (2026-07-26), and it found the real obstacle.** Attached blades are loaded
   through the plate model on a damped torsional petiole, stepped in `Plant.step`, and
   `test/wind.mjs` asserts all three of the things asked for — response quadratic in
   gust strength, larger for a bigger blade on the same stalk, exactly zero in still
   air — plus stability in a gale and the sign of the added-mass couple.

   **It is correct and nearly invisible: 0.28° rms, 4.6° peak.** Torsional stiffness
   goes as r⁴ and the petiole is drawn at half the STEM's radius — 8 mm through, 0.14-0.27
   of the blade's own chord where a real leaf is nearer 0.02 — giving 374-4040 Hz. So the
   blade is a rigid card on a rubber rod. **Do not soften `eModulus` to compensate**;
   that compensation was already spent once on the stem. Read the JOURNAL entry: it
   ranks three ways out, and the first is #5's petiole radius, which arrived here from a
   completely different direction and is now blocking rather than cosmetic.

   **RESOLVED, AND NOT THE WAY THIS ENTRY EXPECTED (2026-07-28).** #5 gave the stalk a
   derived radius, and the rock did not become visible — it became wrong. Blades snap
   between face-on attitudes at 10-25 Hz, `tools/jitter.mjs` says READS AS JITTER, and
   the cause is that a plate hinged along its own midrib is statically unstable in
   twist. **Step 2 ships disabled** (`FLAP_DEFAULTS.enabled`) and is now #9. The
   numbers above describe the petiole of 2026-07-26 and no longer describe anything in
   the tree.

   Also: the weather was wrong for a *stated* reason, and then wrong again in the other
   direction. The field shipped at 1.2 m/s, which the Beaufort scale defines as the force
   where "leaves do not move"; it went to 4.0, force 3, "leaves and small twigs in
   constant motion"; and it settled at **2.5, upper-middle of force 2**, after a person
   watched force 3 and said it was too much weather for a close study of one specimen.
   All three are cited rather than tasted, which is the property worth keeping — but the
   choice between the bands is composition and the eye is the instrument for it. It is a
   slider in the UI now, and `tools/clip.mjs` and `tools/jitter.mjs` both take it.
3. **Done (2026-07-26), and the precomputed check earned its keep three times over.**
   `39a_stem.js`: each axis a chain of damped rotational springs with a coupled mass
   matrix, stiffness `EI/ds` on the radii Murray's law grew, loaded by the canopy's own
   blades at their own attitudes. Measured against the table above:

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

   Seven of eight within 0.90-1.21 of a number worked out on paper before the solver
   existed; Sulphur Rosette is the stubby outlier this entry already called. Eigenvalue
   and stopwatch agree to under 1%, and the first mode moves 0.3% across 4 to 24
   stations, so `stations` is a resolution rather than a dial.

   **Sway is emergent and spans eightyfold**, at the shipped 2.5 m/s: Spiral Ossuary
   0.82 world units, Ember Creeper 0.58, Abyssal Frond 0.40, Cathedral Fern 0.17, Sun
   Coral 0.08, and Hoarfrost, Nightglass and Sulphur Rosette essentially nothing. "If a
   fix makes Sulphur Rosette's stem sway, that fix is wrong" — it does not. The spread is
   the same at every wind speed, because it comes from r⁴ and canopy area rather than
   from the weather.

   **Gravity stays in the rest shape, and that is arithmetic rather than convenience.**
   `delta = 1.545 g / omega^2` with nothing free in it, so at 1.26 Hz a Cathedral Fern's
   tip would hang 27 cm below where it grew. There is no stiffness giving both a
   plant-like period and a stem that stands up; real stems escape it by being remodelled
   toward their target as they grow, so the grown shape IS the equilibrium and the solver
   does deviations about it. **The same rigid link is why 7b is subtler than it looks.**

   Three bugs, all invisible except by making the solver check itself, all in PITFALLS: a
   diagonal mass matrix is not a beam; the coupled mass matrix is ill-conditioned by
   construction so an explicit step rings at Nyquist; and a constraint enforced by
   deleting part of the state every substep is a damper worth 20% of the frequency.

   **And one number that was wrong in the field rather than the solver.** The first build
   read as "wobbles way too fast, and some leaves jitter" — two complaints, one cause:
   `lambdaM` was the *vertical* component's integral length scale (1 m) applied to the
   *streamwise* one, which put every gust mode between 3.9 and 19.3 Hz. Measured with
   `tools/jitter.mjs`, blades went from 3.8-16.5 Hz to 0.29-1.10 Hz and the stem tip
   settled at 0.41-0.46 Hz. See TUNING.
4. **Half done (2026-07-26), and the other half is a bug this found rather than
   caused.** `startFall` now measures the attitude off the drawn chord and carries the
   rock's rate over, reduced by the cosine of the blade's droop, instead of guessing
   both off the margin's asymmetry. Measured over 24 blades caught letting go, the
   chord jumps a median 4.0°.

   But **the long axis jumps a median 27° and up to 44°**, because `fallFrame` draws a
   falling blade with its long axis levelled — `fallAxis` flattens it deliberately,
   since the 2D plate model needs gravity in the pitch plane and therefore a horizontal
   pitch axis. A blade hanging at 27° straightens out on the frame it detaches on, which
   is exactly the tell this step forbids.

   **That second degree of freedom was then built, measured, and falsified** — it is in
   the tree behind `FALL_DEFAULTS.tiltPlane`, off, with `test/fall.mjs tilt` reproducing
   it. It closes the seam exactly (27.1° → 0.00, chord 4.0 → 1.0) and levels in 0.10 s
   from any tilt when the pitch is at rest, but once the pitch tumbles it is pumped
   without bound: 32-39 of 40 blades take the long axis past 90°, median excursion
   600-900°. Two independently-solved 2D planes do not exchange angular momentum, so the
   pitch drives the tilt through `cos(th)` and nothing carries energy back. **A borrowed
   model has assumptions, and one of them is its dimensionality** — the second time that
   has been the answer in this file.

   So what is left of step 4 needs either a genuine 3D rigid-body fall (which must
   reproduce the validated 2D flutter/tumble ordering as its in-plane limit), or 7b: a
   derived droop hands this plane 5-13° instead of 27, and at tilts that size it never
   misbehaves. **Third independent argument for 7b.**
5. **Done (2026-07-26).** `SWAY` is deleted. The geometry moves for real, so the vertex
   shader has nothing to pretend about, and `pal.sway` is gone with it.

   One number worth keeping: the hand-tuned displacement peaked at about 0.34 world units
   at the top of a Cathedral Fern; the physics, asked independently, said 0.43 at force 3
   and says 0.17 at the force 2 it settled on. Whoever tuned that sine had a good eye and
   it landed between the two — amplitude was never what was wrong with it. What was wrong
   is that it ran on wall-clock time at a frequency no plant has, and the simulation could
   not see it. Note that matching *peaks* between a sine and a gusty wind overshoots
   badly: the sine sits near its extremes and the gusts sit near the middle.

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

## 7b. Droop as a force balance — DONE (2026-07-28)

Landed with #5, which the pre-flight below said it had to be. `sp.droop` — one constant
and eight species values — is **deleted**. A leaf hangs at the tip slope of its own
petiole under the weight of its own blade, resolved against the elevation it grew at,
and comes out at 8.6-21.3° across the eight species off no per-species number. The
blade's area and the position of its centroid are both read off the silhouette the margin
grew, so a leaf carrying its area near the tip pulls its stalk down further and nothing
said it should. Constants, reasoning and the shipped table are in TUNING.md; the two
negative results it produced are in JOURNAL.md.

Two things it turned up that the entry below did not predict. **The stem's 60 MPa is not
the petiole's modulus** — at 60 MPa a horizontally-held blade bends its stalk 83°, and a
petiole is a cantilever built of collenchyma rather than a fleshy column, so it is 300 MPa
now with a citation. And **across a specimen the scaling runs the other way**: the pipe
model grows a thicker stalk for a bigger blade and r⁴ beats the extra weight, so a bigger
leaf hangs *less*. That is a known over-compensation of the pipe model and it is the
strongest argument for the successor law in #5.

The original entry follows, kept for the reasoning.

Deferred out of 7 on purpose. `sp.droop` is one stated constant in
`40_plant.js:615` and eight values in the species table, and it is currently the
answer to "how far does a leaf hang". Once a blade is loaded by its own weight and by
air, that becomes a force balance and the constant can go — **deleting an entry from
SCIENCE.md's imposed list**, which almost nothing else on this roadmap does.

Needs 7 first, and needs its own before/after across all eight species, because it
changes every silhouette at every stage.

**It also has its number now, from #5's pre-flight.** With a pipe-model petiole at a
real petiole's modulus, the blade's own weight bends the stalk by **4.8-13.2° across the
eight species** — bounded, stable, and no per-species value. That is the column in that
table which behaves, and it is the physical quantity `sp.droop` (0.10-0.95, eight stated
numbers) is standing in for. It is also why #5 and this entry should land together: the
twist saturates without it. Expect petiole stiffness to have to carry
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

## 10. A garden — DONE (2026-07-29)

The scene holds a stand of plants rather than one specimen. Two branches' worth of
work in one: a level of detail for the vein network, which was the thing capping the
scene at one plant, and then the scene itself.

**The cap was the veins, and nobody had noticed it was ungated.** Crushing the lamina
grid thirty-fold moves the line count by *nothing* — every vein segment of every leaf
was emitted at every distance as a six-vertex ribbon, 26,200 per Cathedral Fern. One
specimen ate 53-94% of a 16.7ms frame on an M5 Mac Pro. The law that shipped is
constant vein density per screen pixel anchored to the camera's framing distance; the
law that was rejected, and why, is the more useful half and is in JOURNAL.md.

**What the scene gained:** `makeSpecimen` bundles a plant with its palettes and
species options, `drawSpecimen` is `buildScene`'s axis loop reading off that bundle,
`Plant` has an `origin`, and `plantGarden(n)` scatters specimens on a jittered ring
with staggered ages. The hero is still mirrored onto the App, which is what kept the
HUD, the director, the close-up modes and every tool working untouched.

**One air over the whole clearing**, and it fell out of the field already being right:
positions are real rather than applied at draw time, so a gust crosses the stand.

Three defects it exposed rather than added — a buffer sized for one plant, an LOD rule
counting one plant's organs, and a framer that framed the subject and left the camera
standing inside the garden. All three in PITFALLS.

### 10b. What it owes

1. **Simulation cost is the ceiling now, not geometry.** Eight specimens each take up
   to six `plant.step(1)` per frame. Geometry is comfortable — 551k triangles and 664k
   lines against buffers at ~60% — but a grown background plant is paying full
   `stepAuxin` cost to pattern tissue that will never change again. That is the lever,
   and it has not been measured in a real browser yet, only headless where the fps is
   explicitly not worth reading.
2. **A stand takes ~38s to establish** at the shipped 8ms/frame budget. Interactive
   throughout, and it reads as the clearing filling in, but nearly all of that time is
   leaf-library canalisation. Sharing libraries between same-species plants is the
   lever and it has a visual cost — same-species plants would stop having their own
   leaves — so it wants its own before/after.
3. **Species are sampled with replacement.** A stand of seven from a catalogue of
   eight came out as four distinct species with one appearing three times. Fine as a
   default, wrong whenever the point of the shot is the catalogue. Deal without
   replacement — shuffle and pop, reshuffling only when the stand is bigger than the
   catalogue.
4. **The director still assumes one subject.** Its shot list flies into an apex, a
   flower, a fruit; with a stand it picks one plant and the other seven stop being the
   point. `tools/garden_shot.mjs` and the `GARDEN=` path in `clip.mjs` both switch it
   off rather than solve this. A garden wants shots of its own, and that is the same
   question #6 is holding — what the *film* is, once there is more than one plant in
   it.

Not on this list, deliberately: **do not widen the vein cull to buy frames.** It is
anchored so the subject keeps every ribbon it always had, and loosening that anchor
is how the hero specimen quietly stops looking like itself.

## 12. Render views, and a whole plant at cell resolution — DONE (2026-07-29)

The renderer had been decoupled from the simulation for months and nothing had taken
advantage of it. **A view now decides which channels of the simulation reach the
screen**, and there are four: `natural` (what shipped), `cells` (every organ at the
resolution the solver runs at), `flux` (the transport network with no surfaces at
all) and `field` (auxin on one ramp, species palette and grade discarded). `VIEWS` in
`70_app.js` is one table of weights read by one `drawSpecimen`; adding a fifth should
be an entry, not a file.

**The finding that made it possible.** A whole specimen already IS a cell field —
9,417 cells on a Nightglass Parasol, 81,930 on an Abyssal Frond — and the point
buffer held 74,898, so *one plant at cell resolution was 90-109% of it*. That is why
this had never been tried, and it is a buffer size rather than a research problem.

**The finding that made it affordable.** `Leaf.step()` returns on its first line once
`mature` is set, so a grown leaf is frozen tissue; and a specimen wears a library of
eight leaves across 118 organs. The per-cell neighbour loop in `laminaCells` was
therefore solving the same problem a hundred times a frame for eight distinct inputs.
Baked once per library leaf, **18.98ms to 6.81ms**. Two extra columns in the table —
the blade's material half-width at the cell and at the end of its needle — remove the
outline lookup as well, exactly rather than approximately, because `matAt` clamps to 1
at full development and the ratio in `toSurface` cancels.

**Two level-of-detail laws, both borrowed from the vein cull.** The table is stored in
a stable hashed order, so a distant blade keeps a uniform prefix; drawn area is
conserved to within 0.5% from 6 to 96 units, which is the same invariant `relight`
obeys, stated for discs. And the needles fade out where the field of them stops being
resolvable — that threshold is perceptual, was set by looking, and is the one number
in this work that could not have been computed first.

**What it cost honestly.** The cell view is **dearer** than the lamina it replaces —
12.3ms against 8.3ms for one specimen — not cheaper, which is what the first version
of `test/views.mjs` asserted on the strength of a prototype that skipped the
material-to-world map. The bound that matters is that a whole plant at solver
resolution is the same *order* as a plant drawn as surfaces. A garden of eight in
`cells` is 316k ribbons and 528k points, which the buffers now hold, but it is
CPU-bound long before it is buffer-bound. See #11.

Three things this exposed rather than added, all in PITFALLS: a full buffer that
dropped geometry silently and now counts it, a blade level of detail inlined in
`buildScene` where no harness could reach it, and `fruitCells` carrying a species'
ripe red into a view whose claim is that the palette has been discarded.

## 11. A ribbon as twelve floats

**Not started. Pure engineering, and the numbers are already in.**

Every vein and every needle is a camera-facing ribbon: six vertices of seven floats,
forty-two floats and one CPU cross-product-and-normalise per primitive. Measured on a
Cathedral Fern a ribbon costs 188ns against a point's 37ns — a ratio of 5.1 against a
data ratio of 6 — so the line pass is memory traffic, and rewriting the emitter to
avoid four JS array allocations moved it by 3%. That was checked, and it is written
up in JOURNAL because guessing cost an hour.

The way out is a format change. WebGL2 has instanced arrays: emit **one** instance of
twelve floats per ribbon (two endpoints, two widths, colour, emission), generate the
six corners from `gl_VertexID`, and do the camera-facing expansion in the vertex
shader — which also deletes the CPU cross product in `seg2` and in the vein loop.

What it would buy, in order of how much it matters:

1. **Every view gets faster at once**, because both the vasculature and the needles go
   through it. The vasculature alone is 4.15ms of a Cathedral Fern.
2. **The line buffer goes back to `1<<23`.** It had to grow to `1<<24` for a garden in
   the cell view; 316k ribbons is 13.3M floats today and 3.8M instanced.
3. It removes the one thing standing between `cells` and a whole garden of it.

Risks worth knowing before starting: `tools/` reads `renderer.nLine` as a vertex count
and several capture scripts print it; the bloom threshold is tuned against the current
emission; and `test/veinlod.mjs` asserts a light conservation law that is stated in
drawn width, which instancing does not change but does move the code that applies it.

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
- **Leaves still return in one frame when a culling shot ends (2026-07-28).** The
  occlusion cull was hiding up to half the canopy and blinking as the shot moved;
  #23 fixed the three defects behind that and `tools/cull.mjs` is the harness. What
  it did not fix: `cullFrom` goes null on the cut, so every hidden blade reappears
  on a single frame. **It cannot be a fade** — the forward pass writes depth, so a
  blade dimmed to black still hides what is behind it, which is the entire job. The
  route is to let the clearance *decay* over a few hundred ms after the shot ends
  rather than switch off, which means holding the departing subject for that long.
  Cheap, and the last visible pop in the piece.

  Also open, and a directorial question rather than a bug: the apex close-up still
  clears about **24%** of a Cathedral Fern's canopy, because the camera sits ~2.2
  units off a meristem surrounded by leaves 4.3 units long and those blades really
  are in front of the subject. If that reads as too aggressive, the fix is how the
  shot is composed, not a weaker cull.
- **Organ petioles dominate a flower close-up — DONE (2026-07-28).** The stalks were
  fat opaque tubes and the petals read as blades bolted to scaffolding, at flower scale
  and everywhere else. The radius comes off the blade now, by the pipe model, and it went
  from 6.2-9.5 mm to 0.59-1.24 across the eight species — which is what the pre-flight
  below predicted, to within 3%, with no solver. `droopScale`, which existed only to hold
  floral organs up against a leaf's droop, is gone too: a petal is a short stalk carrying
  a small light blade and the force balance already gives it almost nothing to hang by.

  Two constants replaced by one. The petiole does not taper — nothing joins it between the
  node and the blade, so the pipe model says it is prismatic — and `kappa` is confirmed
  twice over, by the published broadleaf range and by the petiole-to-chord ratio of a real
  leaf. The renderer and the mechanics read `petioleOf`, which they did not before: three
  copies of the stalk's length and one of its radius were inlined in `70_app.js` while a
  comment in `39_fall.js` claimed there was one definition.

  **What it did not fix, and what that cost, is #9.**
### Pre-flight for the petiole: measured, and it decides more than it looks like (2026-07-26)

Same treatment as ROADMAP 7's stiffness pre-flight, and the same conclusion shape: one
constant, no per-species anything. Every specimen grown to 6000 steps; medians over all
its blades. `r_pipe` is the pipe model — petiole conducting area proportional to the
blade area it supplies, `A_pet = kappa·A_blade`, with `kappa = 4e-4` (measured broadleaf
petioles run 2e-4 to 1e-3) — evaluated at a real petiole's modulus, 1 GPa, rather than
the stem's 60 MPa. `tw` is quasi-static twist in a force 3; `bend_g` is the angle the
petiole bends under the blade's own weight.

| species | blades | area cm² | r now mm | r pipe mm | f now Hz | f pipe Hz | tw now | tw pipe | bend g |
|---|---|---|---|---|---|---|---|---|---|
| Cathedral Fern | 90 | 72 | 6.46 | 0.96 | 90 | **7.7** | 0.5° | 53° | 7.7° |
| Spiral Ossuary | 90 | 45 | 7.30 | 0.76 | 197 | **9.0** | 0.2° | 55° | 12.0° |
| Abyssal Frond | 119 | 115 | 6.61 | 1.21 | 52 | **6.7** | 1.5° | 59° | 6.2° |
| Sun Coral | 96 | 45 | 6.40 | 0.76 | 157 | **8.6** | 0.2° | 56° | 7.6° |
| Hoarfrost Thicket | 96 | 25 | 6.21 | 0.57 | 302 | **9.5** | 0.1° | 53° | 13.2° |
| Ember Creeper | 25 | 28 | 6.32 | 0.60 | 252 | **8.8** | 0.1° | 58° | 5.9° |
| Sulphur Rosette | 29 | 50 | 7.06 | 0.80 | 163 | **8.1** | 0.1° | 42° | 10.2° |
| Nightglass Parasol | 6 | 108 | 9.49 | 1.17 | 111 | **6.3** | 0.2° | 54° | 4.8° |

Four things to take from it, and the fourth is why this is a pre-flight rather than a
patch:

1. **The blade areas are right.** 25-115 cm² is an ordinary range of real leaf, so the
   scale the piece claims holds up. It is only the stalk that is wrong.
2. **The pipe model puts every species at 6.3-9.5 Hz off one constant.** Blade areas
   span 4.5x and the frequency barely moves, because `k ~ r⁴ ~ (kappa·A)²` and the
   inertia scales with area too, so they very nearly cancel. That is the same shape of
   result as the stem pre-flight — plant-like numbers, no per-species values — and it is
   the strongest argument that the pipe model is the right law here.
3. **But the twist then saturates: 42-59° rms against a 69° stop.** A blade hinged on
   its own midrib is statically *unstable* in twist — the aerodynamic centre sits ahead
   of a mid-chord pivot, which is why weather vanes are built the other way round — so
   once the spring is physical the wind wins and the blade sits face-on. That is real
   (leaves genuinely do flip about their midribs in a force 3), but as a lone degree of
   freedom against a hard stop it will read as *pinned*, not as flutter.
4. **And the answer spans the entire range of behaviours over `kappa`'s own
   uncertainty.** Twist goes as `1/kappa²`: at 4e-4 it saturates, at 1e-3 — still well
   inside the measured range — it is about 8°, which is exactly right. A quantity that
   swings from "invisible" through "perfect" to "pinned" across the error bar of a
   borrowed constant **cannot be the primary motion**, and should not be tuned into
   looking correct.

**So the recommendation is: do this WITH 7b, not with the twist.** The bending column is
the one that behaves — 4.8-13.2° under gravity alone, bounded, stable, and physically
what `sp.droop` is standing in for. Bending is the DOF that responds sanely to wind,
twist is a detail on top of it, and doing the radius change without the force balance
would trade one stated constant for a leaf pinned at a stop.

And the way to get `kappa` out of the codebase entirely, which is this project's kind of
answer: **the petiole's conducting area is something the leaf already canalises.** The
vein hierarchy's trunk — the midrib at the petiole, where `50_geom.js` says everything
funnels — is the measured conducting cross-section for that blade. Sizing the stalk off
the traffic the midrib actually carries would replace a borrowed literature constant
with the engine's own output, and would give a heavier-veined leaf a stouter stalk,
which is variation nothing in the piece has now. What it would not do is remove the
absolute scale, since drawn vein width is a display mapping (TUNING.md) — so it is a
better law with the same one free number.

- Flowers do not announce themselves against heavy foliage; make them larger and open wider
- Fruit is a little small against the plant (`fruitScale`)
- Fenestrated species get blocky holes at low blade LOD
- Director's later shots (flower, fruit, ripening) are built but lightly tested — I never watched a full seed-to-ripe run at framerate
- First-run tip fires once; a viewer arriving mid-scroll misses it

## 9. A lamina that gives, and a blade that reconfigures

The debt #5 left behind, and the reason `FLAP_DEFAULTS.enabled` is `false`.

An attached blade rocking on its own petiole was built for #7 step 2, measured at 0.28°,
and diagnosed as the petiole's fault. Given a petiole with a physical radius the
mechanism does not become visible — it becomes wrong. 69° rms twist at the shipped
weather, a third of the time against its stop, blades snapping between the two face-on
attitudes at 10-25 Hz when the wind's own fastest gust mode is 1.78 Hz. It is not
resonance, not the damping and not the integrator; all three were measured and ruled out
(JOURNAL.md). It is that a plate hinged along its own midrib is statically **unstable**
in twist, because the aerodynamic centre sits ahead of a mid-chord pivot — which the #5
pre-flight predicted before any of it was built.

**Do not reopen this by widening `kappa`.** It would work, and it is the one move the
pre-flight explicitly forbids: the twist spans invisible-to-pinned across `kappa`'s own
error bar, and `kappa` has an independent confirmation where it sits. What has to change
is the model.

What would have to be true, in rough order of how much each buys:

1. **The lamina is not rigid.** One degree of freedom is standing in for a blade that in
   reality twists progressively along its span and cups under load. The member that
   resists is the midrib — which this project *canalises a width for* — so putting the
   midrib's compliance in series with the petiole's would make the flap frequency
   emergent from the vein network. That is the most interesting fix by this project's
   standards and it is also #4's machinery, so the two are much cheaper together.
2. **Real leaves reconfigure.** A blade under load rolls toward the flow and sheds it;
   that is why drag on a real canopy grows slower than the square of wind speed. Nothing
   here does it, so the load never falls off and the blade has no way out but the stop.
3. **The pivot may be wrong.** A leaf's elastic axis and its centre of pressure are not
   the same line, and a mid-chord hinge is the worst case for static stability. Whether
   the drawn midrib is the right elastic axis is a question nobody has asked.

One term already went in while looking, and it is kept: the attached blade had no
quasi-steady pitch damping at all, because its relative wind is the *field* and does not
know how fast the blade is turning, where a falling plate's is its own velocity and gets
the coupling for free. The strip integral is in `flapTerms` as `cPitch`, it costs no new
constant, and it is worth about 0.02 of damping ratio — real, and nowhere near enough.

**A cheap first experiment**, before any of the above: `test/petiole.mjs` section 5
already sweeps the whole regime, and `tools/jitter.mjs` gives a one-word verdict. Anything
proposed here can be measured in two commands.

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

## 12b. A monocot — FALSIFIED (2026-07-30)

The full write-up, with the numbers and the two metric traps, is in
[JOURNAL.md](JOURNAL.md) under 2026-07-30, and `test/venation.mjs` keeps it
re-measurable. The short version, because someone will ask about grass again:

**The strap silhouette is nearly free.** `ay` is already a species knob; at 0.03 with a
shorter margin wavelength the outline goes from aspect 0.47 to **0.07 (~14:1) with 128
fine teeth against 39 coarse ones.** No new code.

**The venation is not.** Over eight seeds a strap and a dicot control have the same
hierarchy — n50 2.9 vs 2.5, top-strand share 0.286 vs 0.288 once the dicot's single
outlier is set aside. The blade canalises **once, on tissue already at its final
shape**, sources ringing the margin and the sink at the base; a radially convergent
problem has a midrib at any aspect ratio.

**And stretching provably cannot rescue it.** `n50` and `top` are statistics of
*traffic*, and traffic is invariant under a coordinate stretch, so canalising short and
then extending changes the look and not the hierarchy. That line is here to save an
afternoon.

Real parallel venation is strands laid down early and extended by an **intercalary
meristem at the base**. This engine has no basal growth zone — `baseGuard` explicitly
holds the base still. That conclusion arrived from two independent directions in one
sitting (a strap is extruded not expanded; bundles are stretched not patterned narrow),
which is a better reason to believe it than either alone.

It is not a spatial prior if built — it is a boundary condition on where tissue is
inserted. But **the phyllotaxis half is the real risk**: grass is distichous, strict
180°, and four apex sizes were swept with the spread staying near 90°. A monocot would
wear this project's headline limitation more visibly than any current species.

**Note the shared ceiling:** an intercalary meristem and the apex-splitting a
dichotomous body plan needs (liverworts, clubmosses) are the same class of work — the
central zone is a fixed radius `rCZ` from the apex centre (`20_meristem.js:50`), so it
cannot split by construction. Building either gets you closer to the other.

## 13. A conifer — STEP 1 DONE, AND IT CAME BACK SPLIT

**The next thing to build.** A ninth species that is a different body plan, arrived at
by asking what else the engine could grow after the monocot came back negative.

> **Step 1 has been run — read this before the rest of the entry, which was written
> before it.** The pre-flight is `test/conifer.mjs` and the write-up is the 2026-07-30
> JOURNAL entry. Verdict: **the cone is emergent in shape and 2-4x too fat in slope.**
>
> Branch length is linear in the arc position of its bud, zero a fixed distance below
> the apex — R2 = 0.9988 over 36 laterals, and 0.976-0.999 across a 4x sweep. **Claim 1's
> structure is confirmed and nothing draws a cone.**
>
> But the taper slope is `k = (0.72*E + I*S)/(E + I*S)`, not `0.72`. The `0.72` at
> `40_plant.js:138` multiplies only the tip's own extension, while `elongate()` stretches
> the subapical zone with no generation penalty and **overwrites `this.length`**. On the
> shipped defaults that stretching is **3.6x** the tip term, so k = 0.939 (measured
> 0.904). **k is bounded in (0.72, 1) for every species**, giving a crown half-angle of
> 36-63° against a Norway spruce's 8-15°. No parameter reaches the difference.
>
> Also settled: **`budRelease` binds the escape distance, not `dominance`** (7.18 against
> 3.59), so the term the entry below expects to be shaping the crown is not the one in
> charge. And the obvious next move — using the already-computed `exp(-d/dominance)` as a
> continuous multiplier instead of a binary gate — is **killed on paper** in section 4 of
> the harness: it drives every lower branch to the same length (ratio 2.89 → 1.09), which
> is a bottlebrush. Do not build it to find out.
>
> **So step 1's gate is not passed, and the entry's own contingency applies: this is
> bigger than a day.** The open question is now specific — *what sets a lateral's
> elongation rate, if not a hardcoded 0.72?* — and the instinct below is right that the
> answer should delete a constant. Best candidate to pre-flight next is supply, via the
> Murray's-law radii every axis already grows and the pipe model that sized the petiole
> in #7b. **Step 2, the needle, is untouched by any of this and is still cheap.**

The framing that makes it worth doing rather than cosmetic: **a conifer is mostly a
branching-architecture project wearing a leaf-shaped hat.** The needles are the cheap,
already-proven part. Two claims are what would make it a result.

### The needle is already proven, and one line is in the way

The strap work from 12b lands correctly here. At `nv: 5` on a narrow blade the venation
comes out **one bundle carrying 80% of mid-blade traffic, n50 = 1** — a needle's single
unbranched midvein, which is what *Picea* has and *Pinus* doubles.

`30_leaf.js:192` clamps blade aspect to `Math.max(0.12, margin.aspect)`. Probed by
making the floor overridable: at 0.05 the margin's own **0.073** takes over and the
lattice still builds — 103 cells against 64, canalising normally. **So the floor is
over-conservative rather than load-bearing.** It is shared with all eight existing
species, so it wants to become a leaf option, not a global change. (The probe was
reverted; nothing is in the tree.)

### Claim 1: the conical silhouette should be emergent

`Axis.step` already carries apical dominance:

```js
const suppressed = Math.exp(-d / sp.dominance);
if (suppressed > sp.branching) continue;
```

A bud escapes once the leader has climbed far enough above it — so **lower buds escape
earlier and have had longer to elongate, and the taper of a conifer falls out of
dominance plus elapsed time with nothing drawing a cone.** That is the claim, and it is
the reason to do this.

**Pre-flight it before writing anything.** Predict branch length against height from
`dominance`, `branching` and time, on paper, for the parameters being proposed — then
check the solver reproduces it. That is the norm that caught three bugs in the stem
solver and it applies exactly here, because this is a mechanical claim rather than a
chemical one. If the taper does not fall out of the existing term, this becomes much
bigger than a day and that is worth knowing on day zero.

Two obstacles, both honest:

- **`maxAxes: 5` is a hard cap** and a spruce wants tens of branches. That is a budget
  number, and raising it walks into the simulation ceiling #10b is about — so a conifer
  doubles as the stress test for per-plant axis count. Expect these two to be done
  together or for this one to be gated by it.
- **`v3lerp(dir, org.frame.x, v3(0,1,0), 0.45)`** in the branching escape lerps a new
  axis 45% toward vertical, hardcoded and undocumented. Conifer laterals are near
  horizontal, so it has to move. **Do not add `sp.branchAngle`** — the right move is to
  ask what sets it, and there is a strong candidate: the same force balance that
  deleted `droop` in #7b. A branch's angle is where its own weight balances its
  stiffness, and `39a_stem.js` already computes that. **That route deletes a constant
  instead of adding eight**, which is the accounting this project runs on.

### Claim 2: the cone is a REMOVAL, not an addition

Conifers have no flowers and no fruit — a gymnosperm seed is naked, with no ovary wall.
`35_fruit.js` is "the ovary wall as icosphere shell", and a cone does not need it.

A cone is a short determinate axis bearing spirally arranged scales, which is what the
meristem already does. The floral machinery gives determinate axes that consume
themselves (#4b) with a continuous organ identity `q`. **A cone is plausibly a floral
axis where `q` stays in one band and the arrangement never goes whorled** — so the
conifer subtracts a code path rather than adding one, and shows the reproductive
machinery generalises across a 300-million-year split rather than being quietly tuned
to angiosperms. Do this last, after the silhouette is real.

### What to watch for, none of it blocking

- **Fascicles** — pines bear 2-5 needles from a dwarf shoot. Probably near-zero
  `elongation` on a determinate lateral, but that is a guess and not a measurement.
- **Needle count.** A real conifer has thousands; `maxOrgans` runs 44-60. Thousands of
  needles through the cell table is the garden's ceiling again.
- **Evergreen against the senescence wave.** Conifers do not shed everything at once.
  The wave is already imposed (SCIENCE.md item 6), so a conifer either lives with it or
  exposes it as angiosperm-shaped. Interesting either way.
- **Phyllotaxis is a non-issue here, and that is the point.** Conifer phyllotaxis is
  spiral and genuinely variable, so the engine's wandering divergence stops being a
  limitation and becomes correct. A conifer dodges both of the things that killed the
  monocot — no intercalary growth, no distichy.

### The order

1. ~~**Pre-flight the silhouette on paper.** Nothing else starts until this predicts a
   taper.~~ **Done — see the box at the top of this entry.** It predicts a taper of the
   right *shape* and the wrong *slope*, and the slope is not reachable by any species
   parameter. `test/conifer.mjs`.
2. Needle: aspect floor as a leaf option, species entry, confirm `test/venation.mjs`
   gives n50 = 1 on the shipped species rather than on a hand-passed config.
3. **Watch it in a real browser.** The silhouette is composition and the eye is the
   instrument — the two times a genuine modelling error was caught fastest here, that
   is how.
4. Cone last, framed as deleting the ovary path.

### Other body plans considered at the same time, ranked

Kept because the ranking is the useful part, not the list:

- **Compound leaves — "a leaf whose teeth became leaves."** The most on-thesis idea
  available and the one to do after the conifer. The margin already breaks into evenly
  spaced convergence points; in real plants leaflet initiation *is* that same auxin
  convergence, differing in degree rather than kind (Barkoulas/Tsiantis on *Cardamine*,
  sibling to the Bilsborough paper `25_margin.js` already follows). `Margin`'s
  constructor takes only `(prm, opts, seed)` — nothing plant-level — **so it recurses
  as it stands.** And the venation should work *better* than the strap did, because
  drainage stays convergent at every level: leaflet to rachis to petiole. One mechanism
  buys ferns, rowan, walnut, mimosa, jacaranda.
- **Cactus and succulent ribs.** Phyllotaxis expressed on the *stem surface* instead of
  as organs. The meristem already computes the field; the stem is a tube of revolution
  that ignores it. No new solver — a new geometry path reading a channel already being
  computed, which is the same shape as #12.
- **Tendrils and climbers.** An organ whose margin never expands into a lamina, plus
  coiling on contact. Coiling is environment-response, which #7 already decided is
  allowed.
- **Dichotomous branching** — liverworts, clubmosses, algae. The most alien body plan
  available, and blocked by the same fixed-`rCZ` limit noted in 12b.
