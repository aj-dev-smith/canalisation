# Light as the missing environment

Literature sweep, 2026-08-17. Flags: `[D]` the cited paper demonstrates it; `[I]` inferred
or asserted but not shown in the source I read; `[OURS]` my construction, in no paper;
`WARN` contested, or the primary source was unreadable and I am relying on a secondary.

---

## 0. Headline corrections to the brief's premises

**The brief's question 5 rests on a false premise, and the correction is useful.**
Borchert & Honda's `Q` was **not** light-modulated in the original. Borchert R & Honda H
(1984), *Botanical Gazette* 145:184–195, modelled *Tabebuia rosea* with flux distribution
as a **purely endogenous** mechanism. The light-modulated version is Pałubicki W, Horel K,
Longay S, Runions A, Lane B, Mech R & Prusinkiewicz P (2009), *ACM TOG* 28(3):58, who say
so in as many words — the BH model "was originally proposed as a purely endogenous
mechanism… We have adapted the BH model to self-organizing trees by using the amount of
light received by the buds to guide the distribution of the resource." `[D]` (read from
the paper PDF). So the thing to evaluate is **Pałubicki's extended BH**, not Borchert's.

**A confirming quote for the project's existing claim that apical control has never been
formalised.** Same paper, same section: "It is not known whether apical control in nature
is exerted through competition for resources, hormonal control, or both [Bangerth 1989]."
`[D]`. Seventeen years later nothing I found supersedes this.

**Light will not give you whorls.** Nothing in this sweep connects a light field to
branch *spacing* along a leader. Whorls are a product of the flush/dormancy cycle, which
is the project's own ROADMAP 0z1. Do not buy a light field expecting gap CV to move.
`[OURS]`, but I looked and found no counter-example.

---

## 1. Canopy light models: the cheapest published form that runs inside one crown

### The whole-crown closed form (free, and answers the wrong question)

Duursma RA *et al.* (2012), *New Phytologist* 193:397–408, fitted a two-variable closed
form for a whole plant's silhouette-to-total-area ratio on **1831 digitised plants of 124
species**:

```
STAR = (φ·A_C / β^ε·A_L) · (1 − exp(−K·β^ε·A_L / A_C))
```

with `A_L/A_C` = crown density (leaf area over convex-hull surface area), `β` = a leaf
dispersion parameter, `K = 0.5`, `φ = 0.254`, `ε = −2.28`. **R² = 0.847**; crown density
alone gives 0.426, dispersion alone 0.324. `[D]` (read from PDF). This is the cheapest
honest within-crown self-shading law in the literature and it costs two scalars.

**But it returns one number per crown.** It tells you how much light the plant catches —
it **sets the SIZE, not the SHAPE**. It cannot say which branch is dark, so it cannot buy
crown recession or senescence order. Worth knowing precisely because it is tempting.

The underlying turbid-medium law is Monsi & Saeki (1953, reprinted *Ann Bot* 2005):
`Q_int = Q_0(1 − e^(−kL))`, `k ≈ 0.5` for a spherical leaf-angle distribution. Its error
under heterogeneous/anisotropic architecture is large and has been quantified: Ponce de
León MA & Bailey BN (2019), *Ecological Modelling* 406:133–143 `[I]` (cited by Kothari
*et al.*, primary not read). Conifers need a shoot-level clumping correction (STAR),
Oker-Blom & Smolander (1988); Stenberg P (1996), *Tree Physiology* — a conifer shoot's
silhouette-to-needle-area ratio falls with needle inclination and mutual shading, sun
shoots lower than shade shoots `[I]` (abstract only).

### The per-organ models, with real timings

Nauber T & Mäder P (2025), *Computer Graphics Forum* 44(1):e15268, is the paper to read:
it implements **four** within-crown light models in one FSPM and times them on the same
tree. `[D]` (read from PDF).

| Model | What it is | 20 growth cycles, one tree (Intel i7-7700HQ) |
|---|---|---|
| Bounding volume (BV) | distance to a convex hull | **100 ms** |
| Ray bundle (RB) | orthographic **depth map** from the light direction | **221 ms** |
| Voxel (VO) | shadow propagation on a 3D grid | 3 064 ms |
| Space colonization (SC) | attraction markers | 13 661 ms |

With three competing trees in the scene: BV 6 007 ms, RB 2 706 ms, VO 9 728 ms, SC
78 733 ms; with an obstacle, SC blows up to 489 110 ms. **The ray-bundle depth map is
~60× cheaper than space colonization and ~14× cheaper than voxels**, and it is the only
one of the four that is already a thing a WebGL2 renderer does for free.

The two formulas worth copying:

**Voxel shadow propagation** — Pałubicki (2007), used in Pałubicki *et al.* (2009). A bud
in voxel `(I,J,K)` deposits a pyramidal penumbra into voxels `(I±p, J−q, K±p)`,
`q = 0..q_max`, `p = 0..q`, adding `Δs = a·b^(−q)` with `a > 0`, `b > 1`. A bud's light
exposure is then `Q = max(C − s + a, 0)`, `C` = full exposure; the `+a` is "a bud does not
shadow itself". `[D]`. Nauber's generalisation adds an opacity and an angular term:
`Δs_i = a·b^|v_d| · (1 − max(0, α_s/(sw·π/2)·(1−sw)))`, `L_VO(v) = a·max(0, 1 − s(v))`. `[D]`

**Ray bundle** — build an orthographic depth map `dm_d` in light space; an organ at `p'`
is lit iff `p'_z ≤ dm_d(p'_x, p'_y)`, and a perception range `pr` averages neighbouring
texels to soften it. `[D]` This is literally a shadow map.

The physically correct within-crown model is a per-voxel turbid medium integrated over sky
directions — RATP (Sinoquet *et al.*), MAESTRA, and the asymmetric-crown formulation of
Cescatti A (1997), *Ecological Modelling* 101:263–274 `[I]`. It is the right answer and it
is one to two orders more expensive than the depth map.

### Precedent that crown shape emerges from local light

Takenaka A (1994), *Journal of Plant Research* 107:321–330: branch units grow and **die**
by their own local light, mutual shading is computed, and "the shape of the crowns of
trees grown in a model forest stand varies with their position in the stand in a similar
way as observed in real forests." `[I]` (abstract only; primary paywalled). This is the
existence proof that the shape falls out — and note the crown shape emerged **in a
stand**, not on a solitary tree.

---

## 2. Branch autonomy and light-driven self-pruning

### The principle, and where it breaks

Sprugel DG, Hinckley TM & Schaap W (1991), *Annu. Rev. Ecol. Syst.* 22:309–334, is the
canonical statement: a branch's carbohydrate economy is largely independent of the tree it
is attached to. `[I]` (abstract only).

Sprugel DG (2002), *Tree Physiology* 22:1119–1124 — "When branch autonomy fails: Milton's
Law of resource availability and allocation" — is the one that matters here, and it
**breaks the fixed-threshold model of branch death**. `[D]` (read). Autonomy holds "as
long as light is the primary factor limiting photosynthesis and growth"; it fails because
allocation is set by a branch's **position relative to the other branches on the same
tree**. The empirical statement: *"branches on suppressed trees are able to grow and
produce new foliage at solar irradiances where branches on dominant trees die"*, and
generally, "a stressed branch on a tree where all other branches are also stressed does
better than a similarly stressed branch on a tree where some branches are relatively
unstressed."

**This is the single most implementable finding in the sweep.** Branch death is a
*relative* comparison inside one crown, not an absolute light threshold. It is exactly
Sachs & Novoplansky's "every bud and branch is constantly compared with alternatives" —
i.e. it is a self-organising local rule, and it means the engine does **not** have to state
a percent-of-full-light constant.

### The numbers, for when you want a sanity band

- **Whole-plant light compensation point**, juvenile trees: 0.53–2.73 mol PPFD m⁻² d⁻¹,
  ≈ **1.5–6.5 % of above-canopy PPFD**. Lusk CH & Jorgensen MA (2013), *Functional Ecology*
  27:1286–1294 `[I]` (secondary). Threefold interspecific variation in Bornean saplings:
  Baltzer & Thomas (2007) `[I]`. Givnish *et al.* (1988) argued for an *effective* light
  compensation point that charges the branch for all tissue it would shed with it `[I]`.
- **Kothari S, Urgoiti J, Messier C, Keeton WS & Paquette A (2025)**, *Functional Ecology*
  (biorxiv 2024.10.17.618957), 12 temperate species, IDENT-Montréal, canopy closed. They
  define `L_base = ln(I_base/I_o)`, the log light fraction at the live crown base, as the
  self-pruning threshold. `[D]` (read from PDF).
  - Species identity explains **51.3 %** of individual variation in `L_base`.
  - Shade tolerance (Niinemets & Valladares 2006 scores) correlates negatively,
    R² = 0.411, p = 0.025; acquisitiveness positively, R² = 0.655, p = 0.001; the two
    together **R² = 0.897**.
  - **Leaf lifespan is the best single predictor: R² = 0.846 across all species** (and
    0.824 within evergreens). Longer-lived leaves ⇒ deeper shade tolerated before pruning.
  - **`L_top` has a significant positive effect on `L_base` (F = 9.65, p = 0.002)**: a tree
    with a sunlit top prunes at a *higher* light level. That is correlative inhibition
    measured, and it is Sprugel 2002's relative rule showing up as a fitted slope.
- **Schoonmaker AL, Lieffers VJ, Landhäusser SM *et al.* (2014)**, *PLOS ONE* 9(8):e104187,
  ~17-year lodgepole pine and white spruce, four shading treatments. `[D]` (read).
  Uniform shading ≈ 10.8 % of full light in the lower crown; light asymmetric ≈ 7.1 %;
  heavy asymmetric ≈ 1.2 % (pine) / 5.0 % (spruce). Needle TNC fell to **9 % vs 17 %** in
  controls; lower-branch bud expansion **~40 % vs 100 %**. Verdict: **asymmetric shading of
  only the lower crown hurt more than uniform shading of the whole tree** — again, the
  *gradient within the crown*, not the absolute level, drives recession. No explicit
  mortality threshold is reported, and they say so.

### WARN: the carbon story is not the only story

Protz CG, Silins U & Lieffers VJ (2000), *Can. J. For. Res.* 30:1088–1095 — reduction in
**branch sapwood hydraulic permeability** as a factor limiting survival of lower branches
of lodgepole pine `[I]` (cited, primary not read). A shaded branch may be dying of
plumbing as much as of carbon. Anyone claiming "the branch died of its own budget" should
know this competing account exists.

### WARN, and this one bites the project directly

**A solitary sapling does not self-prune.** Crown recession in the literature is a
*stand* phenomenon: open-grown conifers retain branches to the ground because their lower
branches still get enough light `[I]` (multiple secondary sources, consistent with the
project's own note that a real 3.3 m spruce keeps its branches). Self-shading inside one
2.88 m crown will not remove lower branches. **A light field buys crown recession for the
garden, not for the hero.** If the goal is to fix the single conifer's silhouette, this is
the wrong instrument.

---

## 3. Shade avoidance: what is signal, what is response

**The signal.** R:FR ≈ **1.15** in the open, essentially invariant across weather and
season; **as low as 0.09** under a vegetational canopy; ≈ 1.2 → 0.2 through a single leaf.
Li Z, Zhao T, Liu J, Li H & Liu B (2023), *Plants* 12(7):1550 `[D]` (read). Chlorophyll
absorbs red and blue and transmits/reflects far-red, so R:FR is a **neighbour detector
that works before shading** — reflected FR from a neighbour drops R:FR while PAR is still
full.

**The transduction.** Low R:FR shifts phyB out of Pfr, releasing PIF4/PIF5/PIF7, which
raise auxin biosynthesis and drive elongation. Blue-light depletion works through
CRY1/CRY2–DELLA. Ballaré CL & Pierik R (2017), *Plant Cell Environ* 40:2530–2543 `[I]`
(403, secondary only); Li *et al.* 2023 `[D]` for the PIF→senescence half.

**Response magnitudes.** WARN — I could not open a primary with clean numbers. Smith H &
Whitelam GC (1997), *Plant Cell Environ* 20:840–844, is the source for the claim that stem
extension rate is **linear in phytochrome photoequilibrium Pfr/P** over the ecologically
relevant range `[I]`. Hyponasty (upward leaf/petiole reorientation) and petiole elongation
are the classic dicot responses; I found no degree-figure I would quote. Note the sign:
shade avoidance produces **hyponasty (up)**, not epinasty (down); epinasty in the
literature is mostly an ethylene/flooding response and is a different mechanism `[I]`.

**Branch angle is light-gated, and it acts on machinery the engine already has.**
- Waite JM & Dardick C (2018), *J. Exp. Bot.* 69(20):4935 — TAC1 modulates plant
  architecture in response to **photosynthetic** signals `[I]`.
- Waite JM & Dardick C (2024), *BMC Biology* 22 — IGT/LAZY family genes are
  **differentially influenced by light** and are collectively required for light-induced
  changes to organ angle. `[I]` (search snippet; the article redirected and I could not
  read it). TAC1 promotes horizontal orientations and is light-expressed; LAZY genes
  promote vertical; prolonged darkness narrows branch angles.

**Why this matters here more than the elongation half.** LAZY/TAC1 act by biasing the
auxin asymmetry that follows sedimenting statoliths — i.e. they set the **gravitropic set
point**, which is precisely the quantity `40_plant.js` already computes from a statocyte
flux balance. Light-gated branch angle is therefore **one light-dependent multiplier on an
offset that already exists**, not a new mechanism and not a shape prior. `[OURS]` (the
identification is mine; the light-gating and the GSA role are each `[D]`/`[I]` above).
Prediction it makes for free: an open-grown crown spreads wider than a shaded one, and a
crown beside a gap leans into it.

---

## 4. Phototropism vs gravitropism: there is a published blend, and it is one number

Bastien R, Douady S & Moulia B (2015), *PLoS Computational Biology* 11(2):e1004037 —
"A Unified Model of Shoot Tropism in Plants: Photo-, Gravi- and Propio-ception". `[D]`
(read). The gravity + proprioception (AC) model:

```
∂C(s,t)/∂t = −β·A(s,t) − γ·C(s,t)          B = β·L_gz/γ
```

`A` = local angle to vertical, `C` = curvature, `β` graviceptive, `γ` proprioceptive
sensitivity, `L_gz` growth-zone length. Adding light gives the ARC model:

```
∂C/∂t = −ν·[A(s,t) − A_P] − β·A(s,t) − γ·C(s,t)
```

with `ν` photoceptive sensitivity and `A_P` the light direction. The **photogravitropic
set-point angle** is

```
A_R = A_P·ν/(ν + β) = A_P/(1 + M),      M = β/ν
```

and the light dependence of `M` was fitted against Galland's oat-coleoptile data: a
**power law `M(I) = a·I^b` with b ≈ 0.36–0.44** beat a Weber–Fechner log law, capturing
**R² ≈ 0.91** across tilt angles and intensities, collapsing to one master curve for
`A_0 < 90°`. Species: wheat and oat coleoptiles, Arabidopsis hypocotyls, sunflower.

**This is a drop-in for the engine.** The set point stops being "vertical, offset by
auxin" and becomes "a weighted mean of the gravity vector and the light vector, weighted
by one dimensionless number whose intensity dependence is a measured exponent near 0.4".
Nothing about a shape is stated. `[OURS]` for the drop-in claim.

**WARN, twice.** (a) Measured on herbaceous growth zones, not woody axes; over years the
actuator in a tree is reaction wood, which the project already knows. (b) The engine's
existing set point sits at 0.6° of target and crown half-angle 9.5°; adding a photoceptive
term will move both, so `test/tree.mjs` section 2's auxin-to-angle map is the thing that
has to be re-derived, not patched.

---

## 5. Does a light-fed vigour partition escape the engine's falsification?

The engine falsified the full Borchert–Honda flux partition on a monopodial leader: the
vigour taper inverted (0.031 at the bottom of the crown against 0.201 at the top) because
the leader's stream is re-concentrated at every fork. The question is whether Pałubicki's
light-fed version escapes it. Here is what the paper actually does, and then my reading.

**What Pałubicki's extended BH is.** `[D]` (read from PDF). Two passes per growth cycle.
Basipetal: light exposure `Q` at each bud flows down, accumulating as `Q = Q_m + Q_l` at
each fork. At the base, `v_base = α·Q_base`. Acropetal: at each fork the resource splits

```
v_m = v·λQ_m/(λQ_m + (1−λ)Q_l)        v_l = v·(1−λ)Q_l/(λQ_m + (1−λ)Q_l)
```

A bud receiving `v` makes `n = ⌊v⌋` metamers of length `l = v/n`.

**It does produce excurrent trees** — their Figure 7 sweeps `λ` = 0.46, 0.48, 0.50, 0.52,
0.54 at `α = 2` and walks decurrent → excurrent. `[D]`

**Three structural differences from the engine's implementation, and I think they are the
whole story.** All `[OURS]`, all cheap to check:

1. **`Q` must be extensive and must accumulate over the lateral's own history.** In BH,
   `Q_l` is the summed light of everything distal to the fork on that lateral. An old
   lower branch carries many buds, so its `Q_l` is *large*, and its share of `v` grows as
   it grows. That is positive feedback supporting the lower crown. If the engine's `Q` was
   an intensive quantity — current auxin flux, or organ count normalised — that feedback
   is absent and the inversion is forced. **This is the first thing to check before
   rebuilding anything.**
2. **`v` is recomputed from scratch each cycle** (`v_base = α·Q_base`), not integrated. A
   partition that accumulates state down an axis will drift; one that is re-derived from
   the base each cycle cannot.
3. **The fraction rule is applied at binary forks.** On a monopodial leader with `N`
   laterals hung off one axis, the leader passes `N` forks and its share is a *product* of
   `N` fractions, i.e. it decays geometrically along its own length. That is exactly the
   "re-concentration" the engine measured. Pałubicki's trees are mostly branching systems
   where the "main axis" changes identity; a single 24-lateral leader is the worst case for
   this rule and it is the case the engine ran.

**And the light does not, by itself, supply the length taper.** Upper laterals in a
conifer are *better* lit than lower ones, so a light-fed `Q` pushes the taper the *wrong*
way if age is not in the picture. What makes a real conifer's lower branches longer is
that they have been extending for more years — which the engine already gets right
(length taper emergent, R² = 0.9988). `[OURS]`

**Verdict on question 5:** a light-fed partition is worth one experiment, but only if `Q`
is made extensive and cumulative and the split is re-derived each cycle. `λ` spanning
decurrent→excurrent over 0.46–0.54 is a knife-edge and would be a **new stated constant
with high sensitivity**, in the same debt category as `L = 0.8`. On the evidence I would
not spend the crown's architecture on it.

---

## 6. Senescence order: the strongest case for light in this project

The engine imposes senescence *order* (a wave up the plant, oldest first). Light replaces
it with two published local rules, either of which is a genuine derivation:

- **Kikuzawa K (1991)**, *American Naturalist* 138:1250–1263 — a leaf's optimal longevity
  maximises net gain per unit time over its own life, given a declining photosynthetic
  rate and a construction cost. Predicts short life at high initial rate, long life at
  high LMA, short life at fast decline; explains the LMA–longevity correlation. `[I]`
  (secondary). Purely local, no scheduler, no lifespan constant.
- **Shade-induced senescence** — Li *et al.* 2023 `[D]`: low R:FR → phyB inactive → PIF4/5
  → SAG29, ORE1, NYC1, SGR plus ethylene and ABA; the `pif1 pif3 pif4 pif5` quadruple
  mutant senesces *slower* than wild type. Low blue → CRY–DELLA → WRKY45 → SAG12/13/113.
  **WARN on which cue dominates**: several studies find induction under canopy shade
  depends more on **light intensity than on light quality**; in field sunflower the R:FR
  gradient contributes to reallocation but "the irradiance component of the light gradient
  dominates the canopy effect" (Rousseaux *et al.*, via Li *et al.* 2023) `[I]`. For an
  engine with no photoreceptors this is good news: **use PAR, not R:FR**.

**Why this is the best-value target.** In a canopy the lowest leaves are both the oldest
and the darkest, so a light rule *reproduces* the imposed order without stating it — and
it makes a prediction the imposed rule cannot: a **young shaded leaf inside the crown dies
before an old sunlit one at the top**. That is a one-line falsification test and it is the
thing to measure before writing any renderer code. `[OURS]`

---

## 7. What nobody has published

- **No equation for apical control.** Confirmed live in a 2009 primary (Pałubicki *et al.*,
  quoted in §0). `[D]`
- **No formalisation of correlative inhibition.** It is named in Sprugel 2002, Schoonmaker
  2014 and Kothari 2025 as the reason absolute thresholds fail, and none of the three
  writes it down. Kothari's `L_base` is a *fitted trait*, not a mechanism. `[D]`
- **No light-derived whorls.** See §0.
- **No within-crown light model driving leaf-resolution senescence in real time.** Every
  FSPM I found runs light on annual growth cycles (Takenaka 1994; Pałubicki 2009; Nauber
  2025). A 20.2-second life at 125 steps/s is outside the published regime — which is an
  opportunity, not a blocker.
- **No quantitative map from light to a GSA offset in a woody axis.** TAC1/LAZY light
  gating is molecular and qualitative; the ARC model is quantitative and herbaceous. The
  bridge between them is unbuilt.

---

## 8. Verdict

**Is a light field the same category as the wind field? Almost, but not quite — and the
difference is the interesting part.** `37_wind.js` is a pure function of `(x, t)`: the
plant does not affect it, so it is one-way and can be evaluated pointwise forever. A light
field is exogenous at its *source* (a sun direction and a sky) but the *field* is produced
by the plant's own geometry, so it is a **two-way coupling** — nearer in kind to
`15_pathogen.js` than to the wind. It must be recomputed as the plant grows, and in a
garden it couples specimens to each other, which the wind never did.

**It adds no shape prior** provided the response is per-organ and local. It does add three
stated constants, and all three have measured values, which is more than can be said for
the ones they retire:

| New constant | Retires | Literature value |
|---|---|---|
| per-organ opacity / `k` | — | `k = 0.5` spherical LAD (Monsi & Saeki; Duursma's `K`) |
| death threshold, **relative** | SCIENCE.md item 6's imposed senescence order | 1.5–6.5 % absolute (Lusk 2013) *as a sanity band only* — use `L_i` vs the specimen's own max, per Sprugel 2002 |
| photograviceptive `M` | — | `M = a·I^b`, `b ≈ 0.36–0.44` (Bastien 2015) |

**Minimal model that buys crown recession + senescence order:**

1. One sun direction plus a uniform sky fraction. No diurnal cycle — a life is 20.2 s.
2. Per-organ `L_i ∈ [0,1]` from an **orthographic depth/opacity map in light space**
   (Nauber's ray bundle; 221 ms for a whole 20-cycle tree on a 2017 CPU, and the engine
   already rasterises geometry every frame). Voxel shadow propagation `Δs = a·b^(−q)`,
   `Q = max(C − s + a, 0)` is the CPU-only fallback at ~14× the cost.
3. **Amortise.** Light changes on the timescale of organ founding, not of wind. Refresh
   every ~50 solver steps: ~50 updates over a 2527-step life. `[OURS]`
4. Senescence: a blade dies when its own time-integrated `L_i` falls below a fraction of
   the **specimen's current maximum**, never below an absolute constant (Sprugel 2002;
   Kothari's `L_top` effect).
5. Branch death: the same rule at axis level, summed over that axis's own blades —
   legitimate precisely because of branch autonomy (Sprugel 1991).
6. GSA: `A_R = A_P/(1 + M)`, `M = a·I^0.4`.
7. `L_i` is a per-organ scalar the renderer can read — a fifth `VIEWS` entry, and unlike
   `F.vir` this channel has an unmistakable visual consequence.

**Two expectation-setters, both from the literature and both unwelcome.** A solitary 2.88 m
sapling **will not self-prune** (§2, WARN) — this is a garden feature. And light **will not
give whorls** (§0). If the tree is meant to stop being "a plant pretending to be a tree",
the growth rhythm is still the bigger lever; light is the bigger lever for the *stand*, for
*senescence order*, and for retiring an imposed rule in SCIENCE.md.

**The pre-flight to run before writing any of it**, in this project's own idiom: compute
`L_i` once on the arrested conifer and ask whether the ranking of blades by light differs
from the ranking by age. If it does not, light buys nothing for senescence order on one
specimen, and the whole case rests on the garden. Derive it, measure it, then draw it.

---

## Sources

1. Pałubicki W, Horel K, Longay S, Runions A, Lane B, Mech R, Prusinkiewicz P (2009). Self-organizing tree models for image synthesis. *ACM Trans. Graph.* 28(3):58. https://algorithmicbotany.org/papers/selforg.sig2009.html
2. Nauber T, Mäder P (2025). Light Distribution Models for Tree Growth Simulation. *Computer Graphics Forum* 44(1):e15268. https://doi.org/10.1111/cgf.15268
3. Borchert R, Honda H (1984). Control of development in the bifurcating branch system of *Tabebuia rosea*. *Botanical Gazette* 145:184–195.
4. Duursma RA *et al.* (2012). Light interception efficiency explained by two simple variables. *New Phytologist* 193:397–408. https://doi.org/10.1111/j.1469-8137.2011.03943.x
5. Monsi M, Saeki T (1953/2005). On the factor light in plant communities. *Annals of Botany* 95:549–567.
6. Ponce de León MA, Bailey BN (2019). Evaluating the use of Beer's law… *Ecological Modelling* 406:133–143.
7. Stenberg P (1996). A method for estimating light interception by a conifer shoot. *Tree Physiology*. https://pubmed.ncbi.nlm.nih.gov/11498327/
8. Cescatti A (1997). Modelling the radiative transfer in discontinuous canopies of asymmetric crowns I. *Ecological Modelling* 101:263–274.
9. Sprugel DG, Hinckley TM, Schaap W (1991). The Theory and Practice of Branch Autonomy. *Annu. Rev. Ecol. Syst.* 22:309–334. https://www.annualreviews.org/doi/abs/10.1146/annurev.es.22.110191.001521
10. Sprugel DG (2002). When branch autonomy fails: Milton's Law of resource availability and allocation. *Tree Physiology* 22:1119–1124. https://academic.oup.com/treephys/article/22/15-16/1119/1633838
11. Schoonmaker AL, Lieffers VJ, Landhäusser SM *et al.* (2014). Uniform versus Asymmetric Shading Mediates Crown Recession in Conifers. *PLOS ONE* 9(8):e104187. https://doi.org/10.1371/journal.pone.0104187
12. Kothari S, Urgoiti J, Messier C, Keeton WS, Paquette A (2025). Self-pruning in tree crowns is influenced by functional strategies and neighbourhood interactions. *Functional Ecology*. https://doi.org/10.1111/1365-2435.70116 (preprint: https://doi.org/10.1101/2024.10.17.618957)
13. Lusk CH, Jorgensen MA (2013). The whole-plant compensation point as a measure of juvenile tree light requirements. *Functional Ecology* 27:1286–1294.
14. Baltzer JL, Thomas SC (2007). Physiological and morphological correlates of whole-plant light compensation point. *Oecologia*.
15. Givnish TJ *et al.* (1988) — effective light compensation point (cited in Kothari 2025).
16. Protz CG, Silins U, Lieffers VJ (2000). Reduction in branch sapwood hydraulic permeability… *Can. J. For. Res.* 30:1088–1095.
17. Bastien R, Douady S, Moulia B (2015). A Unified Model of Shoot Tropism in Plants: Photo-, Gravi- and Propio-ception. *PLoS Comput. Biol.* 11(2):e1004037. https://doi.org/10.1371/journal.pcbi.1004037
18. Moulia B *et al.* (2022). The shaping of plant axes and crowns through tropisms and elasticity. *New Phytologist*. https://doi.org/10.1111/nph.17913
19. Kawamoto N, Morita MT (2022). Gravity sensing and responses in the coordination of the shoot gravitropic setpoint angle. *New Phytologist*. https://doi.org/10.1111/nph.18474
20. Li Z, Zhao T, Liu J, Li H, Liu B (2023). Shade-Induced Leaf Senescence in Plants. *Plants* 12(7):1550. https://pmc.ncbi.nlm.nih.gov/articles/PMC10097262/
21. Ballaré CL, Pierik R (2017). The shade-avoidance syndrome: multiple signals and ecological consequences. *Plant Cell Environ.* 40:2530–2543.
22. Smith H, Whitelam GC (1997). The shade avoidance syndrome: multiple responses mediated by multiple phytochromes. *Plant Cell Environ.* 20:840–844.
23. Waite JM, Dardick C (2018). TILLER ANGLE CONTROL 1 modulates plant architecture in response to photosynthetic signals. *J. Exp. Bot.* 69(20):4935.
24. Waite JM, Dardick C (2024). IGT/LAZY genes are differentially influenced by light and required for light-induced change to organ angle. *BMC Biology* 22. https://doi.org/10.1186/s12915-024-01813-4
25. Kikuzawa K (1991). A cost-benefit analysis of leaf habit and leaf longevity of trees. *American Naturalist* 138:1250–1263.
26. Takenaka A (1994). A simulation model of tree architecture development based on growth response to local light environment. *J. Plant Res.* 107:321–330.
27. Niinemets Ü, Valladares F (2006). Tolerance to shade, drought and waterlogging of temperate Northern Hemisphere trees and shrubs. *Ecological Monographs* 76:521–547.
28. Hoch G (2005). Fruit-bearing branchlets are carbon autonomous in mature broad-leaved temperate forest trees. *Plant Cell Environ.* 28:651–659.
29. Sachs T, Novoplansky A (1995) / Sachs T (2004) — self-organising tree development (cited in Pałubicki 2009).
