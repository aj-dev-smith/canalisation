# The science

## The one molecule

Auxin. Cells hold a concentration, and distribute PIN transporter proteins across
their walls to pump it at each other. That is the entire mechanism.

```
da_i/dt = ρ_i − μ_i·a_i + Σ_j [ T (P_ji φ(a_j) − P_ij φ(a_i)) + D w_ij (a_j − a_i) ]

φ(a)  = a / (Km + a)                 saturating carrier kinetics
P_ij  = p_i · q_ij / Σ_k q_ik        PIN split across a cell's walls
```

A cell has **two ways** to decide which wall to load, and chooses between them by
how much auxin it holds:

```
q_ij = (1−s_i)·G_ij + s_i·C_ij
  G_ij = a_j^b / Σ                   UP-THE-GRADIENT  → maxima  (Smith 2006)
  C_ij = π_ij / Σ                    WITH-THE-FLUX    → canals  (Mitchison 1980)
    dπ_ij/dt = α·J_ij² − β·π_ij
  s_i  = a_i^h / (ath^h + a_i^h)     the concentration switch
```

Low auxin → point at your richest neighbour → auxin piles into isolated maxima →
leaf positions, leaf teeth, ovule positions. High auxin → point where flux already
goes → diffuse flow collapses into narrow canals → veins.

Two shapes, one mechanism, separated by a threshold. This unification is the claim
of Bayer et al. (2009) and Cieslak et al. (2019).

`stepAuxin(F, prm, mode)` takes `mode` = `'grad'` | `'flux'` | `'auto'`. The
meristem runs `'grad'`, leaf venation runs `'flux'`, the switch is what `'auto'` does.

## Papers

- **Mitchison 1980** — canalisation; flux induces its own transport capacity
- **Sachs 1969/1981** — the canalisation hypothesis
- **Smith et al. 2006 PNAS** — up-the-gradient PIN polarisation gives phyllotaxis
- **Bayer et al. 2009 Genes Dev** — integrating both modes in one tissue
- **Bilsborough et al. 2011 PNAS** — leaf margin: convergence points drive serration
- **Runions et al. 2005** — leaf venation patterns
- **Cieslak et al. 2019 PLoS Comp Biol** — concentration-switched unified model
- **Douady & Couder** — phyllotaxis as a packing/inhibition dynamic

## Where each mechanism lives

| Structure | Tissue | Mode | Emerges |
|---|---|---|---|
| Growing tip | dividing 2D sheet on a dome | grad | leaf positions, divergence angle, plastochron |
| Leaf margin | 1D closed-ended chain | grad | outline, teeth, lobes, leaf shape |
| Leaf blade | triangular lattice | flux | vein network and its hierarchy |
| Ovary wall | icosphere shell | grad then flux | ovule number/arrangement, fruit lobing |
| Whole shoot | — | — | flowering time, branching, stem taper, when the specimen finishes |
| Transport stream | tree over the whole plant | flux | *nothing that ships* — see below |

The last row is an honest failure, kept runnable and switched off (`shootOpts.enabled`).
`38_shoot.js` runs the solver over the entire organism — a node per organ, per stem
segment, laterals tapping where they branch, the root the only sink — and produces
a real basipetal gradient. It was built to derive abscission and could not: auxin is
*made* by each organ rather than competed for, so flux through a petiole is conserved
and carries no scarcity signal. Three hypotheses and the diagnosis are in JOURNAL.md.
It is left in place the way `rhoI: 0` leaves the falsified second inhibitor in
`10_auxin.js`, so the negative result stays reproducible.

## What emerges

Nobody wrote any of these numbers:

- Where each leaf goes, and the angle between successive leaves
- The plastochron (time between leaves)
- Every vein in every leaf, and the vein hierarchy
- Each leaf's silhouette, and how many teeth it has
- How many petals a flower opens with, and how many organs the flower makes at
  all — the apex consumes itself founding them and stops when it runs out
- Which whorl a floral organ belongs to (read off how far the apex had contracted
  by the time it was founded)
- When the plant flowers (when enough leaf area has made enough florigen)
- Where branches appear (apical dominance = auxin competition)
- Stem thickness (Murray's law on the traffic it carries)
- How many seeds a fruit has, and therefore how lobed it is
- Where the ripening wave starts and how it crosses
- When a specimen is finished and begins to senesce — every growing point has
  either arrested on its budget or consumed itself founding a flower, so nothing
  anywhere is still patterning. Downstream of how much leaf it built, which set
  when it flowered, which set when its apices were spent
- **How a shed blade falls.** Not the fact that it falls — that is gravity — but
  everything about the way it comes down: whether it flutters, tumbles, or settles
  into a glide, how fast, how far sideways, and which way it turns. A falling plate
  picks one of those behaviours according to a dimensionless moment of inertia, and
  for a leaf that number is set by the width of the silhouette its own margin grew.
  So the blades on one specimen do not fall alike, and nothing chose which of them
  does what. Which way a blade turns comes from the same place: the two halves of a
  margin pattern independently and do not come out equal, and that asymmetry is the
  off-centre pressure that breaks the symmetry of the fall. The plane it falls in is
  the direction the leaf was pointing, which phyllotaxis set. See `39_fall.js`,
  measured in `test/fall.mjs`
- The pattern a dying blade drains in. Tissue next to a vein is held longest, and
  *what counts as next to a vein* is the distance field of a network that
  canalised itself — so the green-island tracery on a senescing leaf is that
  leaf's own vasculature, seen a second time. Only the lag is stated (item 6)

## What is imposed

Keep this list short. Every entry is a debt.

1. **Central-zone competence.** Cells near the summit polarise less sharply, so
   organs cannot found there. Real (CZ vs PZ identity), but it is a spatial prior.
   Implemented as `comp[i]` scaling *gradient sharpness only* — see PITFALLS.
2. **Floral organ identity by founding radius.** A continuous coordinate `q` read
   off the radius at which the organ was founded, not the ABC model. Softer than
   naming four whorls, but still a positional rule. `q` is measured against the
   radius the apex had when it converted; measuring it against the apex's *current*
   radius is scale-invariant and reports zero forever, which is what it did until
   2026-07-25. Where the identity boundary sits on `q` (`petalQ`) is chosen, and
   with it the petal:stamen ratio — that number is part of this imposition.
3. **Enclosing growth at high `q`.** That inner floral organs curve inward rather
   than flattening is asserted, not derived.
4. **The florigen threshold.** That a tip converts at all is a modelled switch,
   though *when* it happens emerges from leaf area.
5. **Radial fruit growth.** Wall cells keep their direction and change only their
   distance from the centre, so a fruit is always star-shaped. Prevents
   self-intersection during deep lobing. Costs overhangs; almost nothing has them.
6. **The order blades senesce in.** A wave up the plant, oldest tissue first. That
   a specimen senesces *at all* is emergent (`Plant.spent()`, above); which blade
   goes first is stated. This entry was paid for rather than assumed — a
   whole-plant auxin transport network was built specifically to derive it and
   could not, four experiments in JOURNAL.md. Note what is NOT imposed here: no
   leaf has a lifespan, and nothing counts down.

   The same rule now runs *within* a blade: tissue against a vein drains last
   (`VEIN_LAG` in `50_geom.js`), which is real — the vein is how the recovered
   nitrogen leaves, so it works until the withdrawal is over — but it is asserted,
   not derived. One number, and it is only a lag: **what** is spared is the
   distance field of a vein network that canalised itself, so the pattern on a
   dying leaf is not drawn any more than the network was. The colour the dead tissue
   goes is presentation, in the same category as the sway — though it is derived
   from each species' own palette rather than painted per species.

   **The falling used to be listed here and is not any more.** It was four stated
   constants and a hash; it is now integrated aerodynamics whose every input is
   either physics, air, or something the margin grew. That is a debt paid off rather
   than a new one — see the 2026-07-26 JOURNAL entry, and the honest limitation it
   left behind, below.

**Render views add nothing to this list, and that is worth stating rather than
assuming.** `VIEWS` in `70_app.js` decides which channels of the simulation reach
the screen — the lamina, the vasculature, the cells, the needles — and every one of
those channels was already being computed. A view turns a channel up or down; none
of them invents geometry, and the `cells` and `flux` views in particular draw
nothing that was not read straight off a `CellField`. The one thing a view chooses
that a picture could not is *when a needle is too small to be worth drawing*, which
is a statement about sampling and screen pixels rather than about a plant — the
same category as the vein cull. TUNING.md has the number and how it was arrived at.

The `field` view is the strongest form of the claim. Every species on one auxin
ramp, no palette and no grade: what is left on screen is the concentration field
and the geometry it produced, and two species look alike in there because a species
is only a parameter set.

Not simulated at all: pollination (parthenocarpy is real — auxin alone sets fruit),
turgor and wall mechanics, light, and nutrients.

**Air used to be on that list and is not any more.** It went from being the most conspicuous
omission — a blade that had let go was a properly loaded aerodynamic body while
everything still attached was a rigid card in dead calm, and the first person to watch
it said so unprompted — to being one field that the falling blade, the attached blade
and the bending stem all read.

**There is one air now, and the whole plant responds to it** (`37_wind.js`,
`39a_stem.js`, ROADMAP 7). The field is a log-law boundary layer with a Kolmogorov gust
spectrum advected by Taylor's hypothesis, exactly divergence-free, and the simulation
and the shader evaluate it from one baked table of modes rather than from two functions
that resemble each other. One number in it is a choice — how hard it is blowing — and
even that is cited rather than picked: it stands in a Beaufort force 2, "wind felt on
the face, leaves rustle", at 2.5 m/s. It stood in a force 3 first and that was too much
weather for a close study of one specimen; which band a scene stands in is composition,
so it is a slider in the UI rather than a constant. Everything else follows from it,
including the gust strength, which is the measured surface-layer `2.5 u*` rather than a
second dial, and every gust frequency, which scales with the speed by Taylor's
hypothesis.

**The axes are damped cantilevers.** Bending stiffness is `EI` on radii Murray's law
grew, the load is the canopy's own blades at their own attitudes, and the first mode
comes out within 0.90-1.21 of a frequency worked out on paper before the solver existed
— on seven of eight species, off one material constant. How far each species sways is
emergent and spans eighty-fold, from Spiral Ossuary's 0.82 world units down to Sulphur
Rosette's nothing, because a 31 cm plant on an 18 mm base is a cushion and cushions do
not sway. The spread does not depend on the weather — it comes from `r⁴` and canopy
area — so turning the wind down quietens every species without flattening the catalogue.

**`SWAY` is gone**, and with it the last authored motion in the piece.

**And `droop` is gone too** (2026-07-28). It was eight stated numbers in the species
table plus a constant, and it was the answer to "how far down does a leaf point". It is
now a force balance: the tip slope of the petiole under the weight of the blade it
carries, resolved against the angle the organ grew at, because only the component of
weight *across* a stalk bends it. Every input is physics or something the plant already
made — the blade's area and the position of its centroid are both read off the silhouette
the margin grew, so a leaf that carries its area near the tip pulls its own stalk down
further and nothing anywhere says it should. Blades hang at 8.6-21.3° across the eight
species off no per-species value.

That was only payable because **the petiole's radius stopped being arbitrary** in the
same change. It used to be half the stem's radius at the node, which nobody derived and
which nothing depended on until a blade was hung off it; bending and torsional stiffness
both go as r⁴, so it was four orders of magnitude of load-bearing guesswork. It comes off
the blade now, by the pipe model — conducting area proportional to the leaf area
supplied, the same reasoning the stem's own taper runs on. One dimensionless constant,
confirmed independently by the petiole-to-chord ratio of a real broadleaf, and it deleted
a second constant on the way: nothing joins a petiole between the node and the blade, so
it carries the same traffic end to end and does not taper.

Note which direction that debt runs. Wind and gravity are *environment*, not shape, so
responding to them is not an imposition in the sense this list means — and so far the
mechanics has only ever *removed* stated constants. `SWAY`, then the fall's four, and now
`droop`'s nine.

**What the same change falsified**, because it belongs here rather than in a footnote:
an attached blade also rocking on its own petiole. That mechanism was built for ROADMAP 7
step 2, measured at a quarter of a degree, and diagnosed as the petiole's fault. On a
petiole with a physical radius it does not become visible, it becomes wrong — 69° rms,
a third of the time against its stop, blades snapping between face-on attitudes at
10-25 Hz when the wind's own fastest gust is 1.78 Hz. A plate hinged along its own midrib
is statically unstable in twist. It ships disabled and re-measurable, like the second
inhibitor and the whole-plant transport stream, and what would have to change is the
model rather than a number: see ROADMAP 5.

Light is the other interesting absence. It is the resource leaves actually compete
for, and shading is what orders senescence in a real canopy — the one honest route
to deriving imposition 6 away.
