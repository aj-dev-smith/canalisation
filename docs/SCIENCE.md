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

Not simulated at all: pollination (parthenocarpy is real — auxin alone sets fruit),
turgor and wall mechanics, light, nutrients, and — newly conspicuous — **air.**

Air is conspicuous because half of it now exists. A blade that has let go is a
properly loaded aerodynamic body; a blade still attached is a rigid card in dead
calm, and the stem it hangs from moves to a decorative vertex displacement in the
shader that the simulation cannot see (`SWAY` in `60_render.js`). So the piece has
two unrelated models of the same air, and the moment of abscission is a
discontinuity between them: nothing establishes that the scene has air in it until
a leaf needs some. The first person to watch it said so unprompted, and they were
describing this. It is the top of the ROADMAP now.

Note which direction that debt runs. Wind and gravity are *environment*, not shape,
so responding to them is not an imposition in the sense this list means — and the
force balance that would make an attached blade hang correctly under its own weight
is the one thing that could delete `droop`, which is currently eight stated numbers
in the species table.

Light is the other interesting absence. It is the resource leaves actually compete
for, and shading is what orders senescence in a real canopy — the one honest route
to deriving imposition 6 away.
