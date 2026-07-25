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

## First run on real hardware (2026-07-25)

The full-arc observation ROADMAP said had never been possible. Apple M5 Pro, real
Chrome, 2400x1620. It ran seed to ripe unattended: 97 leaves, 1 flower, 9 petals,
16 seeds, divergence 156 +/- 90. The director's untested later shots do work.

**Frame budget, median over 120 frames — the surprise:**

| | ms |
|---|---|
| `plant.step()` — the entire simulation | 0.1 |
| `buildScene()` — CPU geometry | 5.9 |
| `render()` — WebGL, with `gl.finish()` | 0.0 |

**The GPU is asleep and the simulation is free.** Everything is CPU geometry
generation, which better hardware does not help. 119.8fps, vsync-capped.
(Headless swiftshader for comparison: 15.6fps — the docs' "~16fps" was right.)

`buildScene` costs 5.7ms even at `axesAlive: 0, fullyDev: 106/106` — a plant that
has entirely stopped changing. Sway is wholly in the vertex shader
(`vec3 P=sway(aPos)` in all three programs), so that geometry is genuinely
invariant and cacheable. Nobody has spent that yet.

### Negative result — blade LOD is not the problem

The "blocky holes at low blade LOD" item assumed tessellation. Raising
`bladeMU/MV` from 13x6 to 22x10 costs **3.5ms** (5.7 -> 9.2, over the 8.33ms budget
for 120fps) and changes the silhouette almost not at all — re-derive the A/B with
`tools/shot.mjs` if you doubt it. Reason: the margin's teeth are only **4.9% of the
blade half-width** (mean tooth depth 0.026 vs half-width 0.544), and a 13-span
mesh already represents a 5% wobble fine. `wSide` does carry them — 51 wiggles one
side, 16 the other, the honest asymmetry. **They are too shallow to read, not too
coarsely drawn.** Do not spend the frame budget on tessellation.

### The vein hierarchy was real and the bake was destroying it

Raw traffic across kept veins spans **15x**; it was being drawn at **1.5x**,
because the log mapping was normalised against `maxPi` (the max over all walls,
including non-veins) rather than the range the kept veins occupy. Fixed by
rescaling to the surviving range — same log law, right normaliser. Drawn ratio
1.82x -> 6.40x, which is the ceiling the `0.25` offset in `50_geom.js` imposes.
Full sweep in TUNING.md. This changed nothing about the chemistry; it stopped a
presentation step from throwing away what the chemistry had already found.

### Open: the hierarchy points the wrong way

Making it visible immediately exposed the next problem. Traffic should accumulate
toward the single petiole sink at `u < 0.045`. Measured mean traffic by band:

```
u  0.0-0.1  0.1-0.2  0.2-0.3  0.3-0.4  0.4-0.5  0.5-0.6  0.6-0.7  0.7-0.8  0.8-0.9  0.9-1.0
     327       83      113      146      126      230      356      621     1082     1260
```

There *is* a trunk at the sink (max 1197 in the first band), but the heaviest
veins in the leaf sit at `u` 0.76–0.97 — at the tip. The top 8 by traffic are all
`u >= 0.70`. **This is pre-existing and independent of the mapping fix**, which
only remaps `w` and never touches `mag`. Untested hypotheses: `pi` is a history
variable that keeps accumulating where flux has been sustained longest, and
`addSource` recruits near the expanding margin, so late tip sources may simply
have had the most time under load; or the basipetal maturation wave is loading the
tip first. Worth a controlled run with source recruitment frozen.

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
