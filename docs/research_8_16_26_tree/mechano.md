# Mechanosensing, wind, and the taper

Literature sweep, 2026-08-17. Flags: `[D]` demonstrated by the cited paper · `[I]` inferred or
asserted but not shown · `[OURS]` my construction, in no paper I found · `WARN` contested, or
primary source unreadable and the number comes from a secondary summary.

---

## 0. The bottom line first

**The mechanism you want is published, it is quantitative, and it is local.** Trees set radial
growth from *strain they can feel*, not from stress, not from flux, not from a taper curve. The
governing model — Coutand & Moulia's **S3m, the "sum of strain-sensing model"** — is a per-cell
strain amplitude summed over tissue volume, feeding a growth modulation. It is the closest thing
in tree biology to `stepAuxin`'s epistemics: a local rule from which a global form falls out.

And the global form it falls out to is **Metzger's constant-stress taper**, which is *measured* in
conifers to a fitted exponent of 0.313–0.333 against a predicted 0.333 (Dean & Long 1986; Dean et
al. 2002). So the taper is not a thing you state. It is the attractor of a local strain rule
running on a bending solver you already have.

One caution up front, because it is the same trap as `fluxPartition`: **constant stress is
contested as an axiom and well supported as an outcome.** Niklas & Spatz (2000) measured stress
varying by one to two orders of magnitude *within* a single cherry tree. The resolution is that
the uniform-stress fit holds well for **stems below the crown** and fails inside the crown and in
branches — which is exactly the domain split your engine already has.

---

## 1. Thigmomorphogenesis: the S3m dose-response law, with numbers

### The equations

**Local sensing** (Moulia et al. 2015, *Front. Plant Sci.* 6:52) `[D]`:

```
dS_i = k_s · (ε − ε₀) · dV
```

`ε` = local longitudinal strain, `ε₀` = a perception threshold, `k_s` = mechanosensitivity,
`dV` = tissue element volume. **Amplitude only — sign is discarded.** Tension and compression at
equal magnitude give equal signal.

**Spatial integration** over the strained volume:

```
S1strains = Σ (ε − ε₀) ΔV
```

**Response** — and this is the part most often mis-stated, because the two growth responses have
*different* dose laws:

- **Primary (elongation, distal / systemic): logarithmic.** `τ_r = a₁ · log(S1strains / S0)`
  where `τ_r` is the recovery time of elongation. Explains **75% of a 1:10 variation** in
  response (Moulia et al. 2015) `[D]`. Recovery times span **100–1000 min** for a single bend.
- **Secondary (radial, local): roughly linear in cumulative deformation.** Explains **75% of a
  1:5 variation** via `S2strains` `[D]`. The linear-vs-log split is stated explicitly in the
  Coutand 2010 review lineage `[I]` — I could not open the primary for the fitted slope, so treat
  "linear" as the published verbal claim, not a coefficient you can copy. `WARN`

**Strain, not stress, is decisive and this was tested head-to-head.** Fitting the same data
against a stress-sensing hypothesis, "no relationship was obtained" (Moulia et al. 2015) `[D]`.
That is unusually clean for plant biology and it matters for you: a strain rule needs no wood
modulus in the sensing step, only in the beam step.

### Magnitudes actually applied

| Study | Species | Regime | Strain | Radial response |
|---|---|---|---|---|
| Coutand et al. 2008, *Ann. Bot.* | *Prunus avium*, 1 yr | 8 bends/day, 4 cm midpoint displacement, 1 min each, one season | 0.5–6% at base (mean **4.4 ± 0.8%**); 0.3–2.5% at 65 cm (**1.8 ± 0.3%**) `WARN` — these are implausibly large for woody tissue and may be a units artefact in the extraction | **+30%** basal radial growth vs sheltered; elongation **−80%** |
| Roignant et al. 2018, *Ann. Bot.* | poplar | 1 bend/day × 3 d/week × 8 weeks, 5 s each | **ε_max ≈ 1% (10 000 µε)** | D∥ 8.0 ± 0.2 mm vs control 5.8 ± 0.2 (**+38%**); D⊥ 6.5 ± 0.2 (**+12%**) |
| Niez et al. 2019, *Trees* | poplar | periodic bending, ± water stress | — | ovalisation **16%**, bending rigidity **+212%**; unchanged by water stress |
| Bonnesoeur et al. 2016, *New Phytol.* 210:850–860 | *Fagus sylvatica*, 15 pairs, field | artificial bending matched to strongest natural wind strains | — | secondary growth **≥ +80%**; ~**2×** larger relative volume increment in suppressed than dominant trees |

### Three properties of the response that are load-bearing for a simulator

1. **It is genuinely local around the circumference.** Roignant et al. 2018 `[D]`: pith
   eccentricity was **−4.8 ± 0.8%, not significant**, while ovalisation was 12%. Wood increment
   was *similar on the stretched and compressed sides* and *elevated on both* relative to the
   neutral axis. So radial growth tracks |ε| per angular sector. That is a per-station,
   per-direction rule — the same shape of thing as a PIN polarity.
2. **Accommodation (desensitisation) is real and slow.** Poplar needs **~7 days without a
   bending stimulus** to recover full mechanosensitive gene inducibility (Martin et al. 2010,
   cited in Leblanc-Fournier et al. 2014, *Front. Plant Sci.* 5:401) `[D]`. Fast Ca²⁺
   desensitisation is much quicker: full desensitisation after **6–7 stimulations (~30 s)**,
   recovery in **< 60 s** in *Nicotiana* (Knight et al. 1992) `[D]`. Without accommodation a
   continuously-wind-loaded model integrates forever.
3. **Trees high-pass filter the wind.** Bonnesoeur et al. 2016 `[D]`: acclimated beech responded
   **only to wind events with a return period longer than one week**; daily thermal wind peaks
   were filtered out entirely; thigmomorphogenesis was driven by **storms**. This is the single
   most useful result in this brief for a real-time engine — it says drive growth from a **high
   quantile / running maximum of |ε|**, not from the mean, and it means you need very few strain
   samples per simulated season.

---

## 2. The constant-stress (uniform stress) hypothesis: status

**Metzger 1893** proposed the stem is a beam of uniform bending resistance — a **cubic
paraboloid**, `d³ ∝ x` where x is distance below the load, i.e. `d ∝ x^{1/3}` for a point load.

**Evidence for:**
- **Dean & Long 1986, *Ann. Bot.* 58:833** — *Pinus contorta*. Fit `D_h = φ·(M_h)^δ`. Uniform
  stress predicts δ = 0.333. Measured **δ = 0.313** `[D]`.
- **Dean et al. 2002, *Trees*** (Dean, Roberts, Gilmore, Maguire, Long, O'Hara, Seymour) — **nine
  North American conifers** (balsam fir, subalpine fir, red spruce, lodgepole, slash, longleaf,
  ponderosa, loblolly pine, Douglas-fir). **8 of 12 fitted δ within ±10% of 0.333; 11 of 12
  within ±15%** `[D]`. Douglas-fir deviates. Where the fit was poor, residuals were biased with
  height — i.e. the *functional form* is right and a single exponent over the whole stem is not.
- **Morgan & Cannell 1994, *Tree Physiol.* 14:49** — transfer-matrix structural analysis;
  measured height–diameter profiles were well fitted by profiles computed to give uniform stress,
  using realistic crown force distributions `[D]`.

**Evidence against:**
- **Niklas & Spatz 2000, *Trees*** — five *Prunus serotina*, 0.29 m to 13.11 m. Wind-induced
  stress **varies by one to two orders of magnitude within one tree**, with a **local maximum in
  the branches**, and the safety factor varies sinusoidally along the axis `[D]`. Uniform stress
  is falsified as a whole-tree statement.
- **Slater, "An argument against the axiom of uniform stress being applicable to trees"** —
  argues the axiom is incomplete given adaptive strain responses, dynamic sway and graduated
  failure `[I]`.
- **Gray 1956** argued the bole is closer to a **quadratic** paraboloid (`d² ∝ x`) than a cubic
  one, i.e. Metzger over-predicts taper `[I]` `WARN` (secondary source only).

**Verdict: uniform stress is a good empirical law for the stem below the crown in conifers and a
bad law for branches and within-crown stem.** That split is not a fudge — it is what
Niklas & Spatz and Dean et al. jointly say.

### What taper each hypothesis predicts — the comparison you asked for `[OURS]`

Take `x` = distance below the apex, uniform foliage density down the crown, `d` = diameter.

| Rule | `M(x)` or driver | Predicted profile |
|---|---|---|
| Murray exponent 3 on foliage traffic (**what the engine ships**) | `d³ ∝ x` | `d ∝ x^{1/3}` |
| Metzger constant stress, **point** crown load | `M ∝ x`, `σ = 32M/πd³` | `d ∝ x^{1/3}` |
| Pipe model / Leonardo / area-preserving | `d² ∝ x` | `d ∝ x^{1/2}` |
| Constant stress, **distributed** crown drag | `M ∝ x²` | `d ∝ x^{2/3}` |
| Elastic similarity (McMahon 1973) | self-weight buckling | `d ∝ x^{3/2}` |

Two things fall out of that table that are worth stating plainly:

- **The engine's Murray-3 rule is numerically identical to the weakest possible constant-stress
  prediction** — a point load at the very top. That is why the trunks are barrels: the rule is
  right in form and is being fed a load model with no lever arm. `[OURS]`
- **Moving from Murray-3 to a strain set point does not change the exponent, it changes what the
  exponent multiplies.** A strain set point gives `ε = M·r / (E·I)` with `I ∝ r⁴`, hence
  `ε ∝ M/(E r³)`, hence **`r³ ∝ M/(E ε*)` — exactly Dean's `D = φ M^{1/3}`, with `φ` absorbing E
  and the set point.** The engine's exponent 3 was never the problem; the *moment* was. `[OURS]`,
  built on Dean & Long 1986 `[D]`.

This is the strongest single result in the sweep and it directly supersedes `fruitFlow`: you do
not need an unswept constant multiplying traffic at every station. You need `M(x)` from the beam
solver, which you compute already.

---

## 3. Eloy: what was demonstrated and what was modelled

**Eloy 2011, *Phys. Rev. Lett.* 107:258101 — "Leonardo's Rule, Self-Similarity, and Wind-Induced
Stresses in Trees."** Leonardo's rule is `Σ d_daughter^α = d_parent^α` with **α ≈ 2**; real trees
measure **α = 1.8–2.3** `[D]` (that range is the literature Eloy cites, not his own measurement).
Eloy's contribution is a **derivation, not a measurement** `[I]`: assume the skeleton is
self-similar and assume diameters are adjusted so the **probability of wind-induced fracture is
constant across the tree**, and α = 2 follows. Two variants (a fractal model, a beam model from
elastic similarity) give the same answer. **Nothing in the paper is a growth simulation and no
tree was measured for it.**

**Eloy, Fournier, Lacointe & Moulia 2017, *Nat. Commun.* 8:1014 — MECHATREE.** This is the one
that matters to you, because it is an actual *growth* model in which wind sets the diameters.

- Diameter rule: max bending stress per segment `σ_max = 32M/(π d³)`; a small neural network,
  fed **`σ_max/σ₀`** (relative wind stress felt by the segment) and the number of foliages
  irrigating it, outputs a **safety factor S**; each segment targets volume `V = S · V_fract`.
  So the control variable is **stress relative to material strength**, evaluated **per segment,
  locally** `[D as a model spec]`.
- Wind: drag with `C_d = 1`; `F_fol = ½ρU²S_fol`; moments propagated recursively tip-to-base;
  extreme wind with **100-year return period ≈ 40 m/s**; fracture as **Weibull, m = 10** for wood.
- Selection: single-elimination tournament, 32 forests × 20 000 random genomes × 10 000 years.
- **Emergent results:** fittest species converge on **S ≈ 3** and fractal dimension **D ≈ 2.5–2.7**.
- **Allometries, simulated vs measured:**

| | MECHATREE | measured |
|---|---|---|
| height exponent β_H | 0.87 (0.871–0.876) | **0.73** (0.71–0.76) |
| foliage number β_N | 1.97 | **2.17** (2.01–2.32) |
| stem biomass β_B | 2.82 | **2.89** (2.71–3.14) |
| diameter ratio R_d | 1.85 (1.81–1.90) | **1.56–1.94** |
| Leonardo area ratio | 0.94 distal / 0.985 proximal | **0.90–1.05** |

- **Taper inside the model:** `d ∝ ℓ^β` with **β ≈ 3/2 in intermediate branches** (elastic
  similarity) and **β ≈ 2/3 in the trunk** (distributed wind load) `[D within the model]`. Note
  that this reproduces two different regimes in one tree from one rule — which is the
  Niklas-&-Spatz objection answered rather than dodged.
- **Honest limits:** hydraulics is *deliberately excluded*; the paper does **not** report a
  no-wind control run `WARN`, so "wind causes this" is an inference from the model's structure,
  not from an ablation. And the authors concede WBE and SERA predict similar allometries — the
  allometries **do not discriminate** between wind and hydraulics.

**For your purposes:** MECHATREE is the existence proof that a per-segment mechanical criterion
plus a wind field yields real tree allometries with nothing drawn. But its criterion is a
*neural-network-parameterised safety factor selected over evolutionary time*, not a physiological
sensing law. You have a better option available (S3m) and a real dynamic wind field, which
MECHATREE did not.

---

## 4. What real trees actually measure

- **Bentley et al. 2013, *Ecol. Lett.* 16:1069–1078** — five functionally divergent species,
  branch radii and lengths measured through the hierarchy. Findings `[D]`:
  - Branching **is area-preserving and statistically self-similar within trees** — WBE/Leonardo
    survives for radii.
  - **Node-level and whole-tree exponents differ**, which falsifies the assumption of an
    optimised, symmetrically branching tree.
  - **Length exponents change across branching order** — there is no single `b`.
  - **Radius scaling is less variable than length scaling.**
  - The metabolic-rate-vs-size exponent **differs significantly from the 3/4 prediction.**
  - `WARN` I could not open the tables; the per-species exponent values with CIs are not in this
    brief. The five bullets above are the paper's own stated conclusions.
- **Dahle & Grabosky 2010, *Trees* 24:321–326** — *Acer platanoides*: length-vs-diameter slopes
  match **elastic similarity only above a ~3 m branch length threshold** `[D]`. Small branches
  scale differently. Another argument that one exponent over a whole tree is wrong.
- **Forestry's own answer is that nobody has a mechanistic taper law.** Operational stem taper
  is fitted with **variable-exponent equations** (Kozak 2004 and descendants), where the exponent
  is *itself a fitted function of relative height* — neiloid at the butt, paraboloid in the
  middle, conic at the top `[D]`. That is forestry openly drawing the shape. Worth knowing: the
  discipline that most needs a taper does not have a derived one.

---

## 5. Wind acclimation experiments — the causal evidence

This is the cleanest experimental literature in the sweep, because it manipulates sway directly.

- **Jacobs 1954, *Aust. J. Bot.* 2:33–51** — the classic. Guyed *Pinus radiata* versus
  free-swaying. Restraining sway produced **taller, less tapered** stems; releasing the guys
  restored taper. Removal of stimulus → loss of taper `[D]`.
- **Coutand et al. 2008, *Ann. Bot.*** — the best-designed of the modern versions, four
  treatments on *Prunus avium*: unsheltered wind (NSW), sheltered (S), sheltered + artificial
  bending (SB), unsheltered + **staked** (NSSt). Root biomass fraction: **NSW 60%, NSSt 56%,
  SB 45%, S 37%** `[D]`. Read the ordering carefully — **staking a wind-exposed tree did not
  restore the sheltered phenotype**, and bending a sheltered tree recovered most of the wind
  phenotype. Mechanical stimulation, not wind per se, is the cause.
- **Bonnesoeur et al. 2016** (above) — the field version on mature-ish beech, with the wind
  filtering result.
- **Watt et al. 2014, *Trees*** — stem guying in radiata pine; radial growth redistributed along
  the stem, with resin feature changes `WARN` (503 on fetch; cited from the abstract listing).
- **Niez et al. 2019, *Trees*** — mechanical acclimation is prioritised **even under water
  stress**, and the ovalisation route buys **+212% rigidity for 16% shape change** `[D]`. Trees
  spend on this before they spend on drought.
- **Wang et al. 2022, *Front. Plant Sci.* 13:971690** — GreenLab FSPM + incremental transfer
  matrix, wind 0–26 m/s. Height falls **17.96 m → 2.68 m**; DBH rises **~20.4 → 23.6 cm** then
  collapses; secondary-growth sink strength rises **0.52 → 18.21**. Crucially, **there is no
  strain-to-growth law in it** — allocation is found by NSGA-II optimisation against a
  don't-break constraint (MOR 45 MPa) `[D as a model spec]`. It is an optimality model wearing
  physiology's clothes.

---

## 6. Safety factors and Greenhill buckling

- **Greenhill / Euler critical height** `H_crit = C (E/ρ)^{1/3} D^{2/3}` — the buckling limit for
  a self-loaded column.
- **McMahon 1973** — elastic similarity: constant `E/ρ` and constant safety factor imply
  **`H ∝ D^{2/3}`** `[D]`.
- **Niklas 1994, *Am. J. Bot.*** ("Interspecific allometries of critical buckling height and
  actual plant height"; "The allometry of safety-factors for plant height") — **111 self-
  supporting species**, E and ρ measured. `H_crit` allometry parallels `H`, so the safety factor
  is **roughly size-independent at H_crit/H ≈ 4** `[D]`.
- **Eloy et al. 2017** independently evolve **S ≈ 3** against wind fracture (a different failure
  mode) `[D within the model]`.

**Use for you:** these are the *calibration* numbers, not the mechanism. If you want to set a
strain set point without picking it by eye, require `H_crit/H ≈ 4` at your shipped `uRef` on the
2.88 m sapling and solve backwards. That converts one eye-chosen constant into one
literature-anchored one — the same move that removed the falling blade's hand-picked constant.

---

## 7. Negative results, and what nobody has published

- **Nobody has published a growth simulation in which stem taper emerges from real-time strain
  sensing on a turbulent wind field.** `[OURS]`, from an exhaustive-as-I-could-make-it search.
  MECHATREE uses evolved safety factors on extreme-value winds, not sensing. Wang et al. 2022
  uses optimisation. The S3m literature is experimental and analytical and stops at the single
  organ. The 2025 *Annals of Forest Science* opinion paper on wind mechanobiology explicitly
  argues for "integrating wind-induced strain sensing ... into tree and forest growth models"
  precisely **because it is not there yet** `WARN` (Springer paywall/Anubis blocked both
  mirrors; claim taken from search-index text, not the PDF).
- **S3m has never been shown to converge on the Metzger profile.** The two literatures do not
  cite each other on this point. The convergence argument in §2 is `[OURS]`, though every
  ingredient is `[D]`.
- **Frequency and strain-rate dependence is largely open.** S3m is amplitude-only by
  construction. Bonnesoeur's filter is an *event-magnitude* filter, not a frequency response.
  Whether the same summed strain delivered at 0.6 Hz versus 0.06 Hz produces the same wood is not
  settled in anything I found `WARN`.
- **Flexure wood is poorly characterised.** Coutand et al. 2015 (*Front. Plant Sci.* 6:266) state
  outright that "the anatomical characterization of flexure wood is still poorly documented" and
  call for work on its mechanical and hydraulic properties `[D]`. So a mechanically-grown stem
  cannot yet be given a literature-correct modulus.
- **Kern et al. 2005**: flexure reduced vessel number and diameter but **whole-stem conductivity
  was not significantly impacted** `[D]` — the radial growth compensates. Useful: you can grow
  radius from strain without owing the hydraulic model anything.

---

## 8. Verdict on simulability

**Yes — and the published mechanism is S3m, not our construction. What is ours is one closure.**

The engine already computes, per axis station, per step: a bending moment from a real wind field,
a radius, and hence a surface strain `ε = M r / (E I)`. That is precisely the input S3m takes.
The rule to add is one term in `updateRadii`:

```
dr/dt  =  k · max(0, Ŝ − S₀)          Ŝ = high-quantile |ε| over a season-length window
```

Four properties of that one line, each answering a named gap:

1. **It is non-negative, so it is a cambium.** Radius accumulates and cannot fall. That closes
   the wood-memory gap (basal radius currently loses 68.2% when leaves are stripped) *in the same
   term*, without a separate mechanism. `[D]` for irreversibility being the real missing property.
2. **It converges on the measured taper.** Where strain is high, radius grows; radius growth
   lowers strain as `r^{-3}`; the fixed point is uniform strain, hence for uniform E, uniform
   stress, hence `r³ ∝ M` — Dean's `δ = 0.313–0.333` `[D]`. **It replaces `fruitFlow` entirely**:
   a terminal fruit's weight enters as a moment with a lever arm, which is what a fruit actually
   does, instead of as a 48× flow constant with no lever arm.
3. **It needs the high quantile, not the mean** (Bonnesoeur 2016 `[D]`), which is cheap — a
   running max per station, updated once per step, no extra beam solves.
4. **It needs accommodation** or it integrates forever (Martin et al. 2010 `[D]`). A decay on `Ŝ`
   with a ~7-day-equivalent time constant is the published form. In your 20.2 s life that is a
   handful of seconds.

**Costs, stated honestly.** One number survives as stated: the perception threshold `S₀` (or
equivalently the strain set point). I found **no universal value for `ε₀`** in the literature —
it is fitted per species in every S3m paper `WARN`. It is however a *sensing threshold with
physical units*, in the same category as `uRef` and `WORLD.unitM`, and it can be anchored rather
than eyeballed by demanding `H_crit/H ≈ 4` (Niklas 1994 `[D]`). Net ledger: **remove `fruitFlow`
and the Murray exponent debate, add one threshold.**

**Two things this does NOT buy, and should not be sold as buying.** It does not produce the
parabolic crown — that is a light and branching problem, not a taper problem, and Niklas & Spatz
2000 `[D]` shows stress-based reasoning fails inside the crown anyway. And it does not produce
whorls; nothing here is a clock. Also `E = 60 MPa` is herbaceous, and a strain rule reads E
directly (`ε ∝ M/(E r³)`), so a wrong modulus is now a wrong *taper* and not just a wrong sway
frequency — `test/stem.mjs` and `test/taper.mjs` both become load-bearing on the same change.

**One more, free.** Roignant 2018 `[D]` shows the response is per-angular-sector: 16% ovalisation
for +212% rigidity (Niez 2019 `[D]`). If the beam solver knows the bending *plane*, an elliptical
cross-section falls out of the same rule at no extra mechanism — a directional stem that is stiff
against the prevailing wind. Nothing about that shape would be drawn.

---

## Sources

1. Coutand C, Moulia B (2000) *J. Exp. Bot.* 51:1825 — controlled bending, tomato; local strain sensing and spatial integration.
2. Coutand C, Martin L, Leblanc-Fournier N, Decourteix M, Julien JL, Moulia B (2009) *Plant Physiol.* 151:223–232 — strain mechanosensing quantitatively controls diameter growth and PtaZFP2. `WARN` full text not retrievable (503/paywall); cited via Moulia 2015 and abstract listings.
3. Coutand C, Dupraz C, Jaouen G, Ploquin S, Adam B (2008) *Ann. Bot.* — mechanical stimuli regulate biomass allocation, *Prunus avium*. PMC2710262.
4. Moulia B, Coutand C, Julien JL (2015) *Front. Plant Sci.* 6:52 — mechanosensitive control of plant growth; the S3m equations.
5. Moulia B et al. (2011) *Integrative mechanobiology of growth and architectural development in changing mechanical environments*, Springer. `WARN` PDF unparseable.
6. Roignant J et al. (2018) *Ann. Bot.* — "Feeling stretched or compressed?" PMC5946949.
7. Niez B, Dlouha J, Moulia B, Badel E (2019) *Trees* 33 — ovalisation, +212% rigidity, water stress.
8. Bonnesoeur V, Constant T, Moulia B, Fournier M (2016) *New Phytol.* 210:850–860. `WARN` 403 on all mirrors; numbers from indexed abstract text.
9. Leblanc-Fournier N, Martin L, Lenne C, Decourteix M (2014) *Front. Plant Sci.* 5:401 — accommodation, desensitisation kinetics; cites Martin et al. 2010 and Knight et al. 1992.
10. Telewski FW (2006) *Am. J. Bot.* 93:1466–1476 — a unified hypothesis of mechanoperception.
11. Telewski FW, Jaffe MJ — *Wind and Trees* ch. 14, wind-induced physiological and developmental responses.
12. Jacobs MR (1954) *Aust. J. Bot.* 2:33–51 — wind sway and form of *Pinus radiata*. `WARN` cited secondhand.
13. Watt MS et al. (2014) *Trees* 28 — stem guying, radial growth, radiata pine. `WARN` 503.
14. Metzger K (1893) — cubic paraboloid / uniform stress. `WARN` historical, secondary sources only.
15. Morgan J, Cannell MGR (1994) *Tree Physiol.* 14:49 — re-examination of the uniform stress hypothesis.
16. Dean TJ, Long JN (1986) *Ann. Bot.* 58:833 — constant-stress and elastic-instability in *Pinus contorta*; δ = 0.313.
17. Dean TJ, Roberts SD, Gilmore DW, Maguire DA, Long JN, O'Hara KL, Seymour RS (2002) *Trees* 16 — uniform stress in nine North American conifers.
18. Niklas KJ, Spatz H-C (2000) *Trees* 14 — wind-induced stresses in cherry: evidence against constant stress.
19. Slater D — "An argument against the axiom of uniform stress being applicable to trees."
20. Gray HR (1956) — quadratic paraboloid stem form. `WARN` secondary.
21. Eloy C (2011) *Phys. Rev. Lett.* 107:258101 — Leonardo's rule from wind loads.
22. Eloy C, Fournier M, Lacointe A, Moulia B (2017) *Nat. Commun.* 8:1014 — MECHATREE. PMC5715076.
23. Bentley LP et al. (2013) *Ecol. Lett.* 16:1069–1078 — empirical assessment of tree branching networks. `WARN` tables not retrieved.
24. Dahle GA, Grabosky JC (2010) *Trees* 24:321–326 — allometry in *Acer platanoides* branches.
25. McMahon TA (1973); McMahon & Kronauer (1976) — elastic similarity, H ∝ D^{2/3}.
26. Niklas KJ (1994) *Am. J. Bot.* — interspecific allometries of critical buckling height; the allometry of safety factors. H_crit/H ≈ 4 over 111 species.
27. Wang Y et al. (2022) *Front. Plant Sci.* 13:971690 — "Stronger wind, smaller tree", GreenLab + ITMM optimisation.
28. Coutand C, Fournier M, Badel E et al. (2015) *Front. Plant Sci.* 6:266 — acclimation of mechanical and hydraulic functions; flexure wood poorly characterised. PMC4406077.
29. Kern KA et al. (2005) — flexure reduces vessel number/diameter, whole-stem conductivity unaffected. Cited via 28.
30. Anon. (2025) *Ann. For. Sci.* 82, doi:10.1186/s13595-024-01271-6 — "Beyond the perception of wind only as a meteorological hazard." `WARN` primary unreadable (Springer/Anubis blocked); author line unresolved.
31. Kozak A (2004) and the variable-exponent taper literature; Sharma et al. (2021) *Can. J. For. Res.*, review of stem taper equations.
