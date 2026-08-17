# Tree architecture models and the timescale problem

Literature brief for Canalisation, 2026-08-17.
Flags: `[D]` demonstrated in the cited work · `[I]` inferred/asserted but not shown · `[OURS]` my construction, in no paper · `WARN` contested or source unreadable.

---

## 0. Headline

**The engine already builds a published tree architecture. It is Roux's model — a coffee bush.** An orthotropic monopodial indeterminate trunk, plagiotropic laterals, lateral (or no) flowering, **continuous** growth and **continuous** branching is the formal definition of Roux's model `[D]` (Prusinkiewicz & Remphrey 2000; Hallé, Oldeman & Tomlinson 1978). Massart's model — fir, *Araucaria* — is the same architecture with **rhythmic** growth and branching plus a second plagiotropic order; Rauh's model (pine, spruce, oak, ash, larch) is the same again with orthotropic laterals `[D]`. So the distance between "a plant pretending to be a tree" and a published conifer architecture is, in the formal grammar, **one property: rhythmicity**.

And rhythmicity is not a season. It is a free-running endogenous oscillator with a period of **weeks**, not years `[D]` (§5). That single fact dissolves most of the timescale problem.

---

## 1. The 23 models: minimal trait set, and program vs taxonomy

**The trait set.** Barthélémy & Caraglio (2007, *Annals of Botany* 99:375–407) state the identification criteria as four groups `[D]`:

1. **Growth pattern** — determinate vs indeterminate; **rhythmic vs continuous**
2. **Branching pattern** — terminal vs lateral vs none; **monopodial vs sympodial**; rhythmic vs continuous vs diffuse; immediate (sylleptic) vs delayed (proleptic)
3. **Axis differentiation** — orthotropic vs plagiotropic vs mixed
4. **Flowering position** — lateral vs terminal

That is ~9–11 binary/ternary characters, hundreds of combinations, and "apparently only 23 architectural models found in nature" `[D]`. The extra discriminators in the practical key are basitony/acrotony, dichotomous vs axillary branching, hapaxanthy vs pleonanthy, phyllomorphic vs long-lived branches, and secondary bending/erection (Shipunov's key after Hallé et al. 1978, pp. 84–97).

**Program or taxonomy? Both, and the seam is exactly where the engine sits.**

- Barthélémy & Caraglio call it "an inherent growth strategy … the fundamental growth programme", genetically determined and only altered under extreme conditions `[I]` — asserted, with a citation trail, not demonstrated mechanistically.
- The same paper immediately undercuts the partition: intermediate forms are common, "there is no real disjunction between the models", all architectures are theoretically possible, and the 23 are simply "the most stable and most frequent, i.e. the most probable biologically" — an **architectural continuum** `[D]`.
- Prusinkiewicz & Remphrey (2000, *L'arbre — The Tree 2000*, 177–186) say flatly that the classification "remains descriptive in character", and then formalise it: each model becomes 1–4 L-system productions over a handful of module states. Roux is `A → O[B]A; B → P[K]B`. Massart is `A → O[B]ⁿA; B → P[K]B; B → P[C]B; C → P[K]C` `[D]`.

**Verdict:** the *traits* are program flags and are directly implementable; the *number 23* is an empirical frequency distribution over that flag space, not a partition of it. Building "an architectural model" is cheap; the models do not, however, determine crown shape — see below.

**Two omissions in that formalisation are load-bearing for this project** `[D]`: Prusinkiewicz & Remphrey **could not express the continuous/rhythmic distinction at all** ("models that are similar except for this trait have been grouped together"), and they dropped McClure's and Tomlinson's models as incomparable. Their closing paragraph names formalising continuous vs rhythmic growth as an **open problem**. I found no paper since 2000 that closes it — L-systems step synchronously in discrete time, Petri nets fire asynchronously in continuous time, and the authors flag reconciling the two as future work. `[D]` for the open problem as stated in 2000; `WARN` on my claim that it is still open, which is an absence-of-evidence result from search, not a survey.

**Crown shape is not at the model level.** *Araucaria araucana* in a forest stand: 15–20 m trunk, conical crown, up to 20 tiers of living branches. The same species, same architectural model, same architectural unit, in full sun on poor soil: cones at under 4 m, "umbrella form" `[D]` (Barthélémy & Caraglio 2007, Fig. 20, after Grosfeld et al. 1999). If the engine's problem is that the crown reads wrong, the architectural model is the wrong level to fix it at.

**The level that does carry crown shape is the architectural unit and reiteration** `[D]`:
- **Architectural unit** = the species' specific expression of its model, as a finite and small set of axis categories. *Cedrus atlantica*: five categories (A1–A5); no more than five or six even in Cupressaceae.
- **Reiteration** (Oldeman 1974) = duplication of the architectural unit. Total vs partial; delayed (from dormant meristems) vs immediate (by dedifferentiation of a growing branch); **opportunistic** (adaptive to a resource increase, or traumatic) vs **automatic/sequential** — the latter occurring "after a definite threshold of differentiation" and being "a common feature of tree development and crown construction" `[D]`.
- **Physiological age of a meristem** and the **morphogenetic gradients** ("base effect" and "drift") are the machinery that predicts the structure of any entity from its topological position plus the plant's ontogenetic stage `[D]`.

Note carefully: sequential reiteration is triggered by a **threshold on differentiation state**, not by a date `[D]`. That is a monotone state variable, not a clock.

---

## 2. FSPMs that grow trees: what is imposed, what emerges, what the timestep is

| Model | Timestep | Imposed | Emergent |
|---|---|---|---|
| **LIGNUM** (Perttunen et al. 1998, *Ecol. Model.* 108:189–198; Perttunen 2009 diss.) | **1 year**, useful to ~15 yr | branching angle, bud number, phyllotaxis, pipe model | crown shape from carbon balance + light interception |
| **LIGNUM/EBH** (Sievänen et al. 2018, *Ann. Bot.* 122:423) | **1-year growth cycles** | λ per branch order; an *ad hoc* `BOOST` | shoot elongation, crown density |
| **GreenLab** (de Reffye & Hu 2003; review *Plant Phenomics* 2024) | **growth cycle (GC)** | dual-scale automaton, **physiological age**, sink functions | biomass partition, organ sizes |
| **AmapSim** (Barczi et al. 2008, *Ann. Bot.* 101:1125–1138) | GC | **"reference axis": physiological age as a number that sets every parameter** | topology via stochastic bud automata |
| **MAppleT** (Costes et al. 2008, *Funct. Plant Biol.*) | year + intra-year | topology from hidden semi-Markov chains fitted to 6 yr of digitised 'Fuji' | axis **geometry** from a rod model with shape memory |
| **L-PEACH** (Allen, Prusinkiewicz & DeJong 2005, *New Phytol.* 166) | **1 day** (`L-PEACH-d`), multiple years | organ sink functions | carbon partition, architecture |
| **Nauber et al. 2024** (*Tree Physiol.* 44:tpae045) | annual GC + intra-year env. updates | 14 named parameters | crown outline; species-distinguishable silhouettes |

**Numbers worth having.**
- Sievänen et al. 2018 `[D]`: four Scots pines, ages **8, 16, 25, 33 yr**, heights **2.6, 7.2, 12.0, 13.6 m**; 18 model-component combinations, 54 runs; best loss **0.0394**; EBH uses **3** parameters against LIGNUM's 5 and VIGOR's 8; fitted λ = **0.614, 0.615, 0.517** for branches, side branches and higher orders.
- Nauber et al. 2024 `[D]`: 14 parameters (leaf number, node number, divergence angle, branching angle, internode length, proprioception, lightsense, gravitysense, shedding rate, xylem flow, apical dominance, budding rate, acrotony, epitony); **720** simulated trees; the five most influential are **gravitysense, xylem flow, shedding rate, proprioception, lightsense** — spruce, pine, oak and poplar silhouettes from adjusting only those.
- GreenLab's **substructure factorization** `[D]`: branches of the same physiological age created at the same growth cycle are treated as *identical*, so the structure collapses to a recursion — **>1000× speed-up**, and computation time becomes at most **quadratic in plant age and independent of organ count**.

**How published models bridge decades: they don't simulate them.** Every model here steps in a **growth cycle**, and a growth cycle is not a unit of time — it is a unit of **organogenesis** (one round of preformation-then-extension). GreenLab goes further and factors the tree so that most of it is never simulated at all. `[I]` This is the sharpest structural finding in the brief: the "year" in the FSPM literature is a proxy for "one flush", and the engine does not owe the literature years — it owes it **flushes**. `[OURS]` GreenLab's trick is also exactly what a self-organising, environment-coupled engine cannot use: two branches of the same physiological age in different light are not identical.

**A published negative worth quoting.** Sievänen et al. needed `BOOST`, an admittedly *ad hoc* promotion of shoot elongation in the lower crown, because in the mechanistic runs "the crown base often rose relatively quickly"; and `BOOST` was *counterproductive* with two of the three elongation formulations `[D]`. Carbon balance plus light does not, by itself, hold a lower crown.

---

## 3. Graphics models — flagged as graphics, not biology

Palubicki et al. 2009 (*ACM TOG* 28(3):58) is an image-synthesis paper; its validation is that trees look right, and it says so. Its resource rules are nonetheless the cleanest statement of the BH idea in print `[D]`:

- **Extended BH.** Basipetal pass accumulates light `Q` in internodes. Acropetal pass distributes `v_base = αQ_base`, splitting at each fork:
  `v_m = v·λQ_m / (λQ_m + (1−λ)Q_l)`, `v_l = v·(1−λ)Q_l / (λQ_m + (1−λ)Q_l)`.
  Metamer count `n = ⌊v⌋`, internode length `l = v/n`.
- **λ is brutally narrow.** The full decurrent→excurrent progression in their Fig. 7 spans **λ = 0.46, 0.48, 0.50, 0.52, 0.54** at α = 2 `[D]`. A ±4% window around 0.5 covers the whole habit range. Compare Sievänen's *fitted* λ ≈ 0.61 on real Scots pine `[I]` — the formulations differ (per-order λ, light term), but the graphics band and the fitted value are not the same number, which is worth knowing before importing 0.5.
- **Priority model.** Axes sorted by mean light per bud, resource split by piecewise-linear weights (`w_max = 1`, `w_min = 0.006`, κ = 0.5 or 0.35); apical control = putting the terminal bud first in the list *irrespective of its light*.
- **Shedding** after Takenaka (1994): total light gathered by a branch ÷ its internode count; below threshold, shed.
- **Diameter**: `dⁿ = d₁ⁿ + d₂ⁿ`, n ∈ [2,3], the pipe model (Shinozaki et al. 1964).

**The line in that paper this project should read twice** `[D]`: *"branch width is not decreased when leaves and branches are shed or pruned. The model thus requires a memory of past leaves and branches."* A graphics paper, with no biology to defend, found it could not do without wood memory. That is independent confirmation of the project's own 68.2% basal-radius finding.

**And their excurrent→decurrent transition is a scheduled clock, not a mechanism** `[D]`: apical control "removed in the course of development". They cite Barthélémy & Caraglio for the phenomenon and then impose it. Nobody in the graphics literature derives it.

Scale, for reference: 1,000 metamers (young) to **700,000** (old) in 106 simulation steps, 82 s on a 2.4 GHz Pentium 4 `[D]`. Nauber & Mäder (2025, *Computer Graphics Forum* 44) is the current follow-on, comparing four light-distribution schemes (ray tracing, space colonisation, voxel, bounding volumes) for exactly this class of model.

---

## 4. Excurrent → decurrent, and the parabolic crown

**Apical control, restated with its numbers.** Wilson (2000, *Am. J. Bot.* 87:601–607) `[D]`: apical control is inhibition of a lateral by shoots *above* it; strong apical control → excurrent, weak → round/oval crowns. Auxin at high concentration applied to a girdled or decapitated woody stem *can substitute* for apical control (inhibiting branch diameter growth, upward bending and neoformed leaves) — but "hormones appear to be involved … it is not known how", and their role may be to **maintain the strength of the stem sink** for branch-produced assimilate. Gravimorphism and restricted water/nutrient transport are explicitly *not* the primary mechanism. Wilson & Gartner (2002, *Tree Physiol.* 22:347) supply the local-export-tax geometry: a girdle **2 cm** below a branch releases it, **>20 cm** does not `[D]`. **Apical control has still never been written as an equation** `[D]`, which means any formalisation the project writes is `[OURS]` by definition, and it is in good company.

**A memoryless model that *does* produce non-conical crowns.** Duchemin, Eloy, Badel & Moulia (2018, *J. R. Soc. Interface* 15:20170976) `[D]`: a propagating-front crown model with velocity
`V = α_p ψ ℓ + α_g (v − n(v·n)) + γκn`
— phototropic intensity α_p, gravitropic intensity α_g, ψ intercepted light, γ a surface-tension-like regulariser. Because the model is length-free it admits **self-similar solutions independent of initial conditions**; varying (α_g, α_p) sweeps a family of crown silhouettes with pointed tops, cusped bases and other singular features, obtained analytically as the inner envelope of cones (a Wulff construction). Validated against **36 photographed crowns**, best fit d < 0.05 in **97%** of cases, across *Betula pubescens*, *Quercus castaneifolia*, *Thuja occidentalis*.

**This is a partial counterexample to the project's "bottlebrush theorem" and should be treated as one.** `WARN` — I found **no published theorem under that name**, and Duchemin et al. show that *memoryless local tropism-vs-light rules give non-conical crowns*. The project's claim survives only in its narrow form (a memoryless multiplier on distance-below-apex, in a branching structure). But note the price of the counterexample: **self-similar means scale-invariant means no ontogeny**. A crown that converges to a shape independent of its initial condition *cannot* change shape with age. So the same paper that supplies a memoryless parabola proves that memoryless rules cannot supply the excurrent→decurrent transition. `[OURS]` for that inference; both halves are `[D]` in the paper.

**The lower cylinder is a light threshold, not a shape.** Kothari et al. (2025, *Functional Ecology*) `[D]`: self-pruning "defines the live crown base and thus determines crown depth"; the operative variable is `L_base`, the fraction of light reaching the crown base at which pruning initiates. 12 temperate North American species (six evergreen conifers, one deciduous conifer, five broadleaves), n = **546** trees across 72 plots. Shade-tolerant and resource-conservative species prune at lower `L_base`; within species, trees with sunlit tops prune at higher `L_base`; neighbourhood composition shifts it further. So the published decomposition of the conifer profile is: **upper/mid parabola = tropism-against-light front; lower cylinder = self-pruning at a light threshold.** Both halves are light. The engine has **no light field at all**.

**Size, not age.** Silver fir at its southern limit: size-mediated, not age-dependent, processes drove height-growth reduction `[D]`. Hydraulic limitation (Ryan & Yoder 1997) is the standard mechanism and is contested (Becker et al. 2000, *Funct. Ecol.*) `WARN`. The useful part for a simulation is that the transition is keyed to a **state** (path length, height) that the engine already computes, not to a calendar.

**Size and shape have different drivers.** Jucker et al. (2025, *Nature Communications* 16:4876) `[D]`: **374,888** trees, **1,914** species; height and crown diameter are **largely decoupled — two independent axes**. Height–diameter scaling is controlled primarily by water availability and light competition; **crown width is predominantly shaped by exposure to wind and fire**. The engine has a real wind field that nothing in growth reads.

**Mechanisms with memory that are published and implementable:**
- **Shape memory of secondary growth** (Fournier et al. 1991; implemented in MAppleT) `[D]`: rotation at a node `Ω_i = Ω_r,i + Ω_m,i` — current torque plus a memory term. The axis keeps the shape it hardened into.
- **Reaction wood** as the multi-year angle actuator. MAppleT uses Alméras's empirical law `P_r = 0.164 − 0.178·Δθ` (Δθ in radians, negative when the branch bends) `[D]`, with `γ = 2πP_r` the angular sector and the section second moment augmented per cambial layer. Magnitudes: normal wood maturation strain ≈ **−500 μstrain**, tension wood down to ≈ **−1380 μstrain** `[D]`; reaction curvature rate in **m⁻¹ yr⁻¹**, a function of section diameter, diameter growth rate and gravitropic efficiency (Alméras & Fournier 2009, *J. Theor. Biol.*).
- **A published negative on that** `[D]`: in apple (and apricot, Alméras et al. 2004) reaction wood has **no active up-righting function** — it only resists further bending. Do not extrapolate the forest-tree actuator to every species.

---

## 5. Rhythmicity is endogenous, and this is the finding that changes the plan

The project's stated gap is "no season/dormancy, hence no whorls". The literature says the rhythm is **not** the season.

- **Herrmann et al. 2015** (*J. Exp. Bot.* 66:7113), "Endogenous rhythmic growth in oak trees is regulated by internal clocks rather than resource availability" `[D]`: *Quercus robur* microcuttings under **constant** conditions (23 ± 1 °C, 16 h light / 8 h dark, ~180 μmol m⁻² s⁻¹) show successive growth/rest phases of **fixed 18–22 d periods**, 2–3 shoot flushes in 8 weeks, with shoot and root flushes alternating. Boosting internal resources by *Piloderma croceum* inoculation "affected neither the rhythmic growth nor the associated resource allocation patterns"; "resources are unlikely to be the factors determining alternating rhythmic growth". Circadian-associated genes (*SFR6* homologue, KELCH-repeat F-box) are differentially expressed across the cycle.
- **Theobroma cacao** `[D]`: the shoot-growth rhythm persists under controlled environmental conditions, strongly suggesting endogeneity (*Am. J. Bot.* 1971, 58) — `WARN` on the author line (Greathouse, Laetsch & Phinney), which I could not open to verify.
- Continuous and rhythmic growth are both "determined endogenously … modulated by external factors" `[I]` (CIRAD/GreenLab teaching materials, following Hallé et al.).

**Consequences for this engine, in order:**

1. **Whorls are chemistry, not weather.** They do not need the environmental-forcing exemption that wind and gravity use. An oscillator in the meristem — organ founding continues while elongation is held, then releases — is the same category as everything else in `10_auxin.js`. `[OURS]`, but the endogeneity it rests on is `[D]`.
2. **They do not need years.** The measured free-running period is **weeks** in constant conditions. `[OURS]` Sizing it against the engine: a 2.88 m sapling with ~24 laterals wants roughly 8–12 flushes over its life; at 125 steps/s and a 2527-step arc, that is a period of ~210–320 solver steps, ~1.7–2.6 s of wall clock. Entirely inside the existing time architecture. Nothing here argues for a second engine.
3. **The gap CV number is the right instrument.** Measured 0.83 against 1.0 for uniform-random and √(k−1) ≈ 2.0 for a whorled leader. An oscillator should move it *up* past 1.0; a mechanism that only regularises spacing moves it *down*. That sign is the falsification test.

---

## 6. Sympodial vs monopodial: what one flag costs

**In the grammar, one production.** Monopodial indeterminate: `A → O[B]A` (the apex re-creates itself). Sympodial: the apex becomes determinate — terminal flower or death — and is replaced by one or more laterals, e.g. Leeuwenberg's model as a succession of equivalent determinate orthotropic modules `[D]` (Prusinkiewicz & Remphrey 2000; Barthélémy & Caraglio 2007). Scarrone's and Stone's models are *compositions* of Corner's and Leeuwenberg's `[D]` — so sympody composes rather than forking the codebase.

**In the plant, one scalar ratio, and the engine already has it.** McGarry et al. (2016, *New Phytologist* 212) `[D]`: in cotton, *GhSFT* (florigen, FT orthologue) and *GhSP* (*SELF-PRUNING*/TFL1 orthologue) "navigate meristems between monopodial and sympodial programs **in a single plant**". *GhSP* maintains indeterminate growth in all apices; without it, both branch systems terminate precociously; *GhSFT* drives sympodial branching and flowering in side shoots. More broadly, indeterminate meristems → monopodial, determinate → sympodial, under CETS-family (TFL1/CEN/SP) control `[D]`.

`[OURS]`: this maps onto Canalisation with no new category. The engine already carries florigen and already builds determinate floral axes. Sympody is the predicate "when the terminal apex converts, promote its topmost lateral to axis-continuing", i.e. an apex-fate rule reading a florigen threshold. It is one flag, and it unlocks Leeuwenberg, Scarrone, Nozeran, Koriba, Prévost and Troll — six or more of the 23 — for roughly the cost of the flag. That is the best architecture-per-line ratio in this brief.

---

## 7. Verdict: is this a separate engine path?

**No — with one genuine addition, and it is a state variable, not a clock.**

What does **not** need a new time architecture:
- **Whorls / rhythmic growth.** Endogenous oscillator, period weeks, chemistry `[D]` → an oscillator on the existing solver clock `[OURS]`.
- **Wood memory.** Irreversibility is `r ← max(r_prev, r_pipe)`: one monotone scalar per station, no history buffer. Palubicki et al. state it as a hard model requirement; MAppleT implements it as a memory term in the rod equations `[D]`. Warning already in the project's own notes: `EI ∝ r⁴`.
- **Reaction wood as the angle actuator.** Its rate is naturally expressed *per increment of secondary growth* (`m⁻¹ yr⁻¹` via `dr/r²`), not per year `[D]`; once radius accumulates, it maps onto the engine's step directly.
- **Sympody.** One apex-fate predicate on a signal that already exists.

What **does** need something the engine has never had:
- **A monotone per-meristem state** — the literature's "physiological age" `[D]` — read by other rules. Sequential reiteration fires on "a definite threshold of differentiation"; morphogenetic gradients ("base effect", "drift") are functions of it; AmapSim makes it an explicit numeric ordinate that sets every parameter. **Every rule in Canalisation is currently a pure function of the current field.** That is the actual architectural gap, and it is one accumulating variable, not a yearly cycle. Beware: if it is *stated* rather than derived, it is exactly AmapSim's imposed "reference axis" and belongs in SCIENCE.md's debt list next to `L = 0.8`.
- **The excurrent→decurrent transition.** Every published model schedules it (Palubicki: apical control "removed in the course of development") or attributes it to size-driven physiology (hydraulic limitation, size-not-age) `[D]`/`WARN`. Deriving it from a size state the engine already computes — leader path length weakening apical control — would be `[OURS]` and, given that apical control has never been formalised at all `[D]`, a genuinely novel result rather than an implementation.

**And the highest-value single addition is none of the above: it is a light field.** Light is the resource in every FSPM allocation rule here; it sets the crown base through the self-pruning threshold `L_base` (Kothari et al. 2025) `[D]`; it is one of only two parameters in the only published *memoryless* model that produces non-conical crowns (Duchemin et al. 2018) `[D]`; it is a top-five sensitivity parameter in Nauber et al. 2024 `[D]`; and Jucker et al. 2025 put light competition and wind — the two fields — on the two decoupled axes of global crown variation `[D]`. Light is an environmental field in exactly the category `37_wind.js` already occupies, so it costs nothing against the one rule. A conifer crown without a light field is a crown missing both of the mechanisms the literature uses to shape it.

---

## Sources

1. Hallé F., Oldeman R.A.A., Tomlinson P.B. (1978) *Tropical Trees and Forests: An Architectural Analysis*. Springer.
2. Hallé F. & Oldeman R.A.A. (1970) *Essai sur l'architecture et la dynamique de croissance des arbres tropicaux*. Masson.
3. Barthélémy D. & Caraglio Y. (2007) Plant architecture: a dynamic, multilevel and comprehensive approach. *Annals of Botany* 99:375–407.
4. Oldeman R.A.A. (1974) *L'architecture de la forêt guyanaise*. ORSTOM. (reiteration)
5. Prusinkiewicz P. & Remphrey W.R. (2000) Characterization of architectural tree models using L-systems and Petri nets. In *L'arbre — The Tree 2000*, 177–186.
6. Palubicki W., Horel K., Longay S., Runions A., Lane B., Měch R., Prusinkiewicz P. (2009) Self-organizing tree models for image synthesis. *ACM TOG* 28(3):58.
7. Borchert R. & Honda H. (1984) Control of development in the bifurcating branch system of *Tabebuia rosea*. *Botanical Gazette* 145:184–195.
8. Takenaka A. (1994) A simulation model of tree architecture development based on growth response to local light environment. *J. Plant Research* 107:321–330.
9. Sievänen R. et al. (2018) A study of crown development mechanisms using a shoot-based tree model and segmented TLS data. *Annals of Botany* 122:423–434.
10. Perttunen J., Sievänen R., Nikinmaa E. et al. (1998) LIGNUM: a model combining the structure and functioning of trees. *Ecological Modelling* 108:189–198.
11. Perttunen J. (2009) *The LIGNUM Functional-Structural Tree Model*. Diss., Helsinki Univ. of Technology.
12. Costes E., Smith C., Renton M., Guédon Y., Prusinkiewicz P., Godin C. (2008) MAppleT: simulation of apple tree development using mixed stochastic and biomechanical models. *Functional Plant Biology* 35:936–950.
13. Barczi J.-F., Rey H., Caraglio Y., de Reffye P., Barthélémy D. et al. (2008) AmapSim: a structural whole-plant simulator. *Annals of Botany* 101:1125–1138.
14. de Reffye P. et al. — GreenLab: a state-of-the-art review. *Plant Phenomics* (2024), doi:10.34133/plantphenomics.0118. Substructure factorization: >1000× speed-up, quadratic in age.
15. Allen M.T., Prusinkiewicz P., DeJong T.M. (2005) Using L-systems for modeling source–sink interactions: the L-PEACH model. *New Phytologist* 166:869–880.
16. Nauber T., Hodač L., Wäldchen J., Mäder P. (2024) Parametrization of biological assumptions to simulate growth of tree branching architectures. *Tree Physiology* 44:tpae045.
17. Nauber T. & Mäder P. (2025) Light distribution models for tree growth simulation. *Computer Graphics Forum* 44.
18. Duchemin L., Eloy C., Badel E., Moulia B. (2018) Tree crowns grow into self-similar shapes controlled by gravity and light sensing. *J. R. Soc. Interface* 15:20170976.
19. Kothari S. et al. (2025) Self-pruning in tree crowns is influenced by functional strategies and neighbourhood interactions. *Functional Ecology*, doi:10.1111/1365-2435.70116.
20. Jucker T. et al. (2025) The global spectrum of tree crown architecture. *Nature Communications* 16:4876.
21. Wilson B.F. (2000) Apical control of branch growth and angle in woody plants. *American Journal of Botany* 87:601–607.
22. Wilson B.F. & Gartner B.L. (2002) Effects of phloem girdling in conifers on apical control of branches. *Tree Physiology* 22:347–353.
23. Cline M.G. & Harrington C.A. (2007) Apical dominance and apical control in multiple flushing of temperate woody species. *Can. J. For. Res.* 37:74–83.
24. Herrmann S. et al. (2015) Endogenous rhythmic growth in oak trees is regulated by internal clocks rather than resource availability. *J. Exp. Bot.* 66:7113–7127.
25. Greathouse D.C., Laetsch W.M., Phinney B.O. (1971) The shoot-growth rhythm of a tropical tree, *Theobroma cacao*. *Am. J. Bot.* 58:281–286. `WARN` author line unverified.
26. McGarry R.C. et al. (2016) Monopodial and sympodial branching architecture in cotton is differentially regulated by *SINGLE FLOWER TRUSS* and *SELF-PRUNING* orthologs. *New Phytologist* 212:244–258.
27. Alméras T. (2001) Thesis; Alméras T., Costes E., Salles J.-C. (2004) *Trees* / *Ann. Bot.* — reaction wood in fruit trees has no active up-righting role.
28. Alméras T. & Fournier M. (2009) Biomechanical design and long-term stability of trees. *J. Theor. Biol.* 256:370–381.
29. Fournier M., Chanson B., Thibaut B., Guitard D. (1991) Mécanique de l'arbre sur pied. *Ann. Sci. For.* 48. (shape memory of secondary growth)
30. Shinozaki K., Yoda K., Hozumi K., Kira T. (1964) A quantitative analysis of plant form — the pipe model theory. *Jpn. J. Ecol.* 14.
31. Sachs T. & Novoplansky A. (1995) Tree form: architectural models do not suffice. *Israel J. Plant Sci.* 43:203–212.
32. Ryan M.G. & Yoder B.J. (1997) Hydraulic limits to tree height and tree growth. *BioScience* 47:235–242. `WARN` contested — Becker P. et al. (2000) *Functional Ecology* 14:4–11.
33. Grosfeld J. et al. (1999) — architectural variation in *Araucaria araucana*, via Barthélémy & Caraglio 2007 Fig. 20.
