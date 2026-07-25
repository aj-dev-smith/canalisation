# Roadmap

Ranked by what I would actually do next.

## 1. Life cycle and senescence
The piece still stops. Specimens should age, senesce (colour draining, veins dying
last, blades releasing and drifting down) and give way to a new one germinating as
the old fades. Turns it from a thing that finishes into an endless film. The camera
director already exists and would shoot it.

## 2. Cell-level view on a leaf
The **look closer** treatment currently only exists on the meristem, where needles
converge to make a leaf. The other half of the claim — the same needles falling
into *line* to make a vein — has never been shown. This would complete the
unification argument visually. Probably the highest ratio of insight to work left.

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
~16fps and cannot judge motion). Let a specimen run all the way to ripe fruit and
watch the camera work. That full-arc observation is the thing that was never
possible in the original session.
