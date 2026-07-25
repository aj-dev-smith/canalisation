# Journal — decisions, negative results, forks

## The phyllotaxis result (the honest headline)

The model produces **ordered but not golden** phyllotaxis. Divergence wanders
90–160° with sd 80–100. Two hypotheses were tested with controlled sweeps and
**both were falsified.**

### Experiment 1 — was inhibition too short-ranged?

An organ's inhibition reaches ~`√(D/μ)` ≈ 4.5 cells; the pattern's own spacing is
~5.8. So only about two previous organs influence the next, and a Fibonacci spiral
needs four or five to carry the phase. A second, independent diffusible signal was
added (own D, own μ, suppressing polarisation competence) and swept from 4 to 17
cell diameters across four strengths.

**Result: no effect.** Spread stayed 79–104° against a baseline of 90°, with no
trend in range or strength.

**Why, and this is the useful part:** a field with enough reach to remember the last
five organs is also nearly *uniform* across a meristem ten cells wide. It knows how
much inhibition there is but not which way to point. **Range and positional
information trade directly against each other.** You cannot buy memory with reach.
This applies to any scalar inhibitor field on a domain this size — and it explains
why Douady–Couder carries memory in the discrete *positions* of previous primordia
rather than in a field.

### Experiment 2 — could sites be slotting in at a different radius?

Confining initiation to a thin generative ring tightened spread from ~87° to ~59°
and roughly tripled the lock fraction (0.07 → 0.27) — but cut the shoot from ~180
organs to 7.

**Conclusion.** In a single reaction–transport field on an idealised disc, the rate
at which sites become available and the sharpness with which one is chosen are
governed by overlapping constants. Crisp angle or productive shoot, not both.
This is exposed as the **generative ring** slider so a viewer can feel the trade-off.

**What I would try next:** a second length scale from *structure*, not another
molecule — L1/L2 layered geometry so the sink sits in a different layer from the
patterning one, or a mechanical-stress term. That is the untested third hypothesis.

**Do not** add a fudge to force 137.5°. Showing the real measured number is the point.

## Design forks and why

- **Cell-based CPU sim, not GPU.** The tissue divides and rewires its topology every
  frame. WebGL2 has no compute shaders, so GPU means ping-ponging fixed-size
  textures, and fixed-size is exactly what growing tissue cannot be. A few hundred
  cells at a few ms is cheap. Shaders draw it; the CPU decides it.
- **Icosphere fruit with radial growth**, not a free-form growing surface. Removes
  self-intersection during deep lobing entirely. Costs overhangs.
- **Leaf library, not per-organ sim.** Thirty simultaneous tissue simulations
  crawled. Grow a handful and share them.
- **Petals are leaves.** Same margin engine, different chemistry. Goethe was right
  and it means no new code.
- **Fruit = the leaf margin, closed.** "A contour of cells that pushes outward where
  auxin has converged" — open arc with boundary sources is a leaf; closed surface
  with interior sources is an ovary.
- **Film that yields to touch**, not a control panel. The best content (cell-level
  view) was hidden behind a button most people would never press, so it became the
  cold open.

## Bugs that cost the most

1. Depth mask blocking `glClear` — presented as a shading bug, was stale depth.
2. Organs placed by nearest vertex index — presented as "jitter".
3. Timestep above the stability ceiling — presented as a parameter problem.
4. Silent no-op string replacements — three times; see PITFALLS.
5. Asymmetric leaf outline vs symmetric interior lattice — veins hanging outside
   the blade. Introduced *by* making leaves honestly asymmetric.
