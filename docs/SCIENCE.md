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
| Whole shoot | — | — | flowering time, branching, stem taper |

## What emerges

Nobody wrote any of these numbers:

- Where each leaf goes, and the angle between successive leaves
- The plastochron (time between leaves)
- Every vein in every leaf, and the vein hierarchy
- Each leaf's silhouette, and how many teeth it has
- How many petals a flower opens with (however many convergence points fit)
- When the plant flowers (when enough leaf area has made enough florigen)
- Where branches appear (apical dominance = auxin competition)
- Stem thickness (Murray's law on the traffic it carries)
- How many seeds a fruit has, and therefore how lobed it is
- Where the ripening wave starts and how it crosses

## What is imposed

Keep this list short. Every entry is a debt.

1. **Central-zone competence.** Cells near the summit polarise less sharply, so
   organs cannot found there. Real (CZ vs PZ identity), but it is a spatial prior.
   Implemented as `comp[i]` scaling *gradient sharpness only* — see PITFALLS.
2. **Floral organ identity by founding radius.** A continuous coordinate `q` read
   off the radius at which the organ was founded, not the ABC model. Softer than
   naming four whorls, but still a positional rule.
3. **Enclosing growth at high `q`.** That inner floral organs curve inward rather
   than flattening is asserted, not derived.
4. **The florigen threshold.** That a tip converts at all is a modelled switch,
   though *when* it happens emerges from leaf area.
5. **Radial fruit growth.** Wall cells keep their direction and change only their
   distance from the centre, so a fruit is always star-shaped. Prevents
   self-intersection during deep lobing. Costs overhangs; almost nothing has them.

Not simulated at all: pollination (parthenocarpy is real — auxin alone sets fruit),
turgor and wall mechanics, light, nutrients, senescence.
