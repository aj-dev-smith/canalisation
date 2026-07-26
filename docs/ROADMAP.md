# Roadmap

Entries keep their original numbers as they are finished, and finished ones stay
here for the reasoning they record — so **the section numbers are history, not
priority.** The list below is the priority.

**Start here, in this order:**

1. **[#7, one air, and a plant that responds to it](#7-one-air-and-a-plant-that-responds-to-it)** —
   went to the top on 2026-07-26. A shed blade is now properly loaded aerodynamics
   while everything still attached is a rigid card in dead calm, so abscission is a
   discontinuity between two unrelated models of the same air. It is also the route
   to deleting `droop`, and it shares its machinery with #3 below.
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

**The shape of the fix** is one field, defined once, read by everything:

- an actual wind velocity field, expressed once and available to both the
  simulation and the shader (not two functions that resemble each other);
- attached blades loaded through the **same plate model the fall already uses**,
  rocking on a petiole with elastic restoring torque and damping;
- the stem genuinely bending, rather than being displaced after the fact — this is
  the part that makes it days rather than an afternoon, and it replaces `SWAY`
  rather than feeding it;
- abscission continuous in attitude *and* angular velocity, so a blade that lets go
  is already moving in the air that will carry it down.

**Two things make it worth more than it costs.** It is the only route to `droop`
becoming a force balance instead of eight stated numbers in the species table —
which *deletes* a SCIENCE.md prior rather than adding one. And ROADMAP 3 below, the
project's headline limitation, already names a mechanical-stress term as one of its
two candidate routes; a real mechanics engine is shared infrastructure for both.

**The condition to hold it to.** Bending stiffness must come from `EI ∝ r⁴` on the
radii the plant already grows (`ax.radii`, emergent from Murray's law), so the whole
engine costs one or two *material* constants rather than eight species-specific
ones. A naive elastic stem needs stiffness and damping per species, which would be
more new constants than the one it deletes — a net loss by this project's own
accounting. **If it cannot be done off the existing radii, stop and reconsider
rather than pushing through.**

**The thing to decide deliberately, not discover later.** The piece currently claims
one rule and one engine — `stepAuxin()` on any topology — and README and
CONTRIBUTING both lead with it. A second solver makes that two engines. That is
defensible (wind and gravity are *environment*, not shape, so responding to them is
not an imposition in the sense that list means) but it wants a decision about how the
project describes itself, taken up front.

Do not start this by writing a mechanics solver. Start by deriving what stiffness
`EI ∝ r⁴` actually gives on real radii, headlessly, and check the natural
frequencies land somewhere a viewer would read as plant-like. If they do not, the
rest does not matter.

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
