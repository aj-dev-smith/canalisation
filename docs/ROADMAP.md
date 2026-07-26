# Roadmap

Entries keep their original numbers as they are finished, and finished ones stay
here for the reasoning they record — so **the section numbers are history, not
priority.** The list below is the priority.

**Start here, in this order:**

1. **[#1, the visible half of senescence](#1-life-cycle-and-senescence--half-done-2026-07-26)** — the simulation
   is done and nothing draws it. Best ratio of payoff to work in the file.
2. **[#5, petiole radius at flower scale](#5-smaller-things)** — an afternoon, with a clear repro shot.
3. **[#3, the third phyllotaxis hypothesis](#3-third-phyllotaxis-hypothesis)** — the honest headline limitation.
   Pure science; a negative result is as publishable as a positive one here.
4. **[#4, lamina tensioning its own margin](#4-lamina-pulls-on-its-own-margin)** — meaningful quality jump, meaningful work.

#2 and #4b are **done**; their entries are kept for what they record.

## 1. Life cycle and senescence — HALF DONE (2026-07-26)
The simulation half is in: a specimen now **finishes**. `Plant.spent()` is true when
every growing point has arrested or consumed itself, `senesceStep` dismantles the
blades in a wave from there, and `dead()`/`stage()` report the end. Cathedral Fern
sheds 96 of 96 over ~4600 steps and reaches stage `dead`. The CI gate asserts a
spent specimen senesces.

Getting there falsified four hypotheses about deriving abscission from auxin
transport, and the whole-plant stream that was built to test them is kept, off, in
`38_shoot.js`. **Read the JOURNAL entry before reopening this** — the honest
summary is that the *timing* of senescence is emergent and the *order* is imposed
(SCIENCE.md item 6), and the route to deriving the order away is light, not
another molecule.

**Still to do, and this is the visible half.** `node tools/senesce_shot.mjs` is the
tool for it — it already captures `-onset`, `-mid` and `-spent`, and today all
three come back identical at 63594 triangles and 141528 lines, which is the
measurement of exactly how much of this is unbuilt:
- Nothing renders it yet. `org.sen` (0→1) and `org.shed` exist and no geometry or
  shader reads them. Wanted: colour draining, and **veins dying last** — the
  per-blade `veinDistanceField` is already computed and is exactly the channel for
  it, so this should not need new simulation.
- Shed blades should release and drift down rather than blinking out. `org.shed`
  is currently a boolean the renderer ignores.
- A new specimen germinating as the old one fades. `dead()` is the trigger; the
  camera director already exists and would shoot it.
- The stem and fruit persist after every blade has gone, which is right for a
  seed head but has never been looked at on screen.

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

## Known-good verification loop
`node build.js` then open in a real browser (not headless — software rendering is
~16fps and cannot judge motion). Let a specimen run the whole arc — seed, leaves,
flower, fruit, ripe, and now on through `senescing` to `spent` — and watch the
camera work. The stage bar at the bottom tells you where it has got to.

At the default speed a Cathedral Fern reaches `senescing` around 19s and `spent`
around 73s; the time slider goes to 4x if you want it sooner. `tools/senesce_shot.mjs`
does the same run headlessly and dumps the state at each mark.
