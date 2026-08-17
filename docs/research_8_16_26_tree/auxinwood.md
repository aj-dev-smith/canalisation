# Auxin and hormones in woody shoots: where the engine's premise holds and where it breaks

Literature sweep, 2026-08-17. Flags: **[D]** the cited paper demonstrates it directly · **[I]** inferred or asserted, not shown · **[OURS]** my own construction, in no paper I found · **WARN** contested, or primary source unreadable in this session.

---

## 0. The one-paragraph answer

The engine's premise does not hold or break as a whole. It breaks **as a function of length scale**, and the break is sharp and computable. Auxin canalization is the demonstrated mechanism for vascular patterning and cambial rate control at the **millimetre-to-centimetre** scale, and there is a good quantitative case that this is *because* an auxin field's natural length scale is `v/k` ≈ 0.7–9 cm. Over the **metres** of a tree's correlative architecture — which bud escapes, how fast a released branch then grows — auxin is demonstrably not the carrier, and the experiments that killed it are kinetic: the signal arrives 50–100× faster than auxin can travel. The engine is a 2.88 m plant running a single `exp(-d/dominance)` auxin field across its whole crown. That field is honest at `dominance ≈ 2 cm` and is a fiction at `dominance ≈ 100 cm`, and the tree needs the second one. **The fix is not to abandon canalization; it is to stop asking one field to span three orders of magnitude.**

---

## 1. Transport velocity, and the size argument made quantitative

**[D]** Kramer, Rutschow & Mabie 2011 (*Trends in Plant Science* 16:461, the **AuxV** database) compiled >90 published reports of auxin speed across 44 species. Measured range **1.2–18 mm h⁻¹**; typical stem values 10–20 mm h⁻¹. Velocity correlates with organ type, growth rate and clade. **What nobody has published:** AuxV does *not* report a correlation with plant **height or age**. Nobody has measured whether a 30 m spruce transports auxin faster than a seedling. If PAT velocity is size-invariant — and there is no evidence it scales — then the correlative-signal problem gets monotonically worse with tree size, which is the whole argument.

**[D]** Spicer, Tisdale-Orr & Talavera 2013 (*PLoS ONE* 8:e72499) is the best woody-stem transport dataset found. In *Populus tremula × alba*: basipetal ³H-IAA movement in the cambial zone was NPA-sensitive by **83%**, in the inner primary-xylem-parenchyma route by **~75%**, and >10× a benzoic-acid diffusion control — so it is genuine active PAT, not diffusion. Free IAA: **377 ± 36 ng g⁻¹** in developing secondary xylem, **67 ± 3 ng g⁻¹** in primary xylem parenchyma, **undetectable** in mature secondary xylem. They report no velocity in cm h⁻¹ — this is a real gap; the woody-stem literature quantifies *flux* and *inhibitor sensitivity* far more often than *speed*.

**[D]** Bennett et al. 2016 (*PLoS Biology* 14:e1002446, "Connective Auxin Transport in the Shoot Facilitates Communication between Shoot Apices") measured **two** kinetic populations in Arabidopsis stem: a rapid phase at **~1.5 cm h⁻¹** and a slow phase **an order of magnitude slower**, against a standard reference rate of **6–10 mm h⁻¹**.

### 1a. The arithmetic on this engine's own tree [OURS]

The engine's specimen is **2.88 m = 2880 mm**. At 15 mm h⁻¹ a signal takes **192 h ≈ 8 days** to traverse the trunk. Phloem photoassimilate moves at **~150 cm h⁻¹** (Mason et al. 2014, ¹¹C, below) — **1.9 h** for the same trunk. **The ratio is ~100×.**

Whether that matters depends on what a solver step means in plant time, which the engine does not state. Parametrically: if the simulated life is one growing season (~180 d) over 2527 steps, one step ≈ 1.71 h and PAT crosses ~26 mm per step, so the trunk is ~111 steps ≈ 4.4% of the life. **A quasi-static auxin field is therefore a defensible approximation for a monotonically growing tree** and is *not* defensible for any step-change response (decapitation, breakage, a bud suddenly released). The engine does not simulate decapitation, so it is hit less hard here than the literature headline suggests — but see §2.

### 1b. The dominance length is derivable, and it lands on the girdling result [OURS]

The engine uses `exp(-d/dominance)`. That functional form is exactly the steady state of transport-with-decay:

    ∂A/∂t = −v ∂A/∂x − kA + S   ⟹   A(x) = A₀ exp(−kx/v),   L = v/k

So `dominance` is not a free parameter — it is **v/k**, and both terms are measurable. With v = 15 mm h⁻¹:

| IAA half-life t½ | k (h⁻¹) | L = v/k |
|---|---|---|
| 20 min | 2.08 | **7.2 mm** |
| 1 h | 0.693 | **21.6 mm** |
| 4 h | 0.173 | **86.6 mm** |

**WARN:** I could not source an IAA turnover half-life in a woody stem within this session's search budget. The 20 min–4 h bracket is an order-of-magnitude assumption and should be checked before anything is built on it. The arithmetic above is parametric so a real number can be substituted.

**The convergence is the finding.** Wilson & Gartner 2002 (below) bracket the apical-control length scale experimentally between **2 cm** (releases) and **20 cm** (does not). The derived auxin length scale `v/k` spans **0.7–8.7 cm**. Two completely independent routes — a transport-decay steady state and a girdling knife — put the correlative length scale in the **same centimetre band**. As far as this sweep found, **nobody has put those two numbers next to each other** [OURS].

**Consequence for the engine, stated bluntly:** an `exp(-d/dominance)` field that grades a 2.88 m crown needs `dominance` of order 30–100 cm. That is **10–100× larger than any physically defensible auxin length scale.** The field is doing real work in the simulation and it is not auxin doing it.

---

## 2. What carries the signal instead

**[D]** Mason, Ross, Babst, Wienclaw & Beveridge 2014 (*PNAS* 111:6092, "Sugar demand, not auxin, is the initial regulator of apical dominance") is the decisive kinetic experiment. In *Pisum sativum* and *Nicotiana tabacum*:

- Buds **40 cm** below the decapitation site showed significant growth at **2.5 h** — requiring a signal at **≥16 cm h⁻¹**.
- Measured stem auxin transport is **≤2 cm h⁻¹**; **no measurable IAA depletion** at node 2 before bud growth began. Depletion had travelled ~⅓ of the required distance.
- ¹¹C photoassimilate moved at **~150 cm h⁻¹**, arriving at node 2 in **38 min**; ¹⁴C-sucrose uptake into node-2 buds **doubled by ~2 h**; total sucrose **+44% within 4 h**.
- *BRANCHED1* transcript fell substantially **within 2 h** of both decapitation and exogenous sucrose.

Conclusion in the paper: sugars drive **initial** bud release; auxin acts later, **prioritising** the growth of already-released branches. That second clause matters for the engine — auxin is not exonerated, it is **demoted from a release switch to a rate allocator**, which is exactly what apical control is.

**[I]** Kebrom 2017 (*Frontiers in Plant Science* 8:1874, "A Growing Stem Inhibits Bud Outgrowth — The Overlooked Theory of Apical Dominance") revives a 1930s indirect model: auxin promotes **internode elongation**, the elongating internode is a strong sugar sink, and the bud starves. Evidence is correlative across wheat *tin*, pea, sorghum and Arabidopsis (dormant pea buds grow when fed sucrose directly). This is attractive for the engine because it keeps auxin causal while making the *inhibition* a sink-competition term — but it is a synthesis, not a demonstration.

**[D]** Bennett et al. 2016 additionally showed buds on **opposite sides of the stem, exporting into separate vascular bundles, still inhibit each other**, and that *pin3 pin4 pin7* mutants show **reduced** inter-bud competition. So apical dominance is competition for a shared **export** pathway, not readout of a stem auxin concentration. They state directly that apical auxin "does not enter the bud in appreciable amounts and therefore acts indirectly", and that cytokinin-deficient/resistant mutants **still** release on decapitation.

### 2a. The engine change this implies [OURS]

A steady-state sink-competition field has a different functional form from a decaying transport field:

    g_i  ∝  a_i / Σ_j a_j          (share of a finite assimilate pool)
    not
    g_i  ∝  exp(−d_i / L)          (distance below apex)

The share form is **not** a memoryless multiplier on distance-below-apex, so the project's falsification (3) — the bottlebrush theorem — **does not apply to it**. The share form's history lives in the sink strengths `a_j`, which are themselves grown quantities. This is the single cheapest honest upgrade this sweep identified: it replaces a field that is physically indefensible at metre scale with one whose carrier (phloem, 150 cm h⁻¹) crosses the whole tree in under 2 h.

---

## 3. Bud outgrowth in woody plants specifically: paradormancy over decades

**[D]** Meier, Saunders & Michler 2012 (*Tree Physiology* 32:565–584, epicormic bud review — full text read). Persistence numbers:

- Individual epicormic buds maintained **≥40 years** in the epicormic-complex strategy (*Quercus* the type case) — Fink 1980a, Fontaine et al. 1999.
- Isolated-bud strategy (*Salix alba*, *Picea abies*): external buds **rarely >15 years** (Gruber 1994), but **buried meristems ≥50 years** (Fink 1980a).
- Conifer bud lifespans generally shorter than angiosperm; a **detached-meristem** strategy (Fink 1984, Burrows 1990) keeps minimally differentiated meristems hidden in leaf axils.
- Fourth strategy: **epicormic strands** in Australian Myrtaceae — meristematic *strands* in bark producing a continuous series of ephemeral buds.

**The direct falsifier of a monotone auxin-inhibition field** [D, as reported in review; WARN primaries unread]: "Both epicormic and sequential branches form at a time when growth of terminal shoots is most rapid, and therefore when auxin concentrations in the tree are highest" (Wignall & Browning 1988a; Cline & Dong-Il 2002). **Buds break when the tree's auxin is at maximum.** No `exp(-d/dominance)` field can produce that.

**[I], explicitly flagged as such in the review**: "it seems intuitive that the auxin concentration at the base of a tree would be a function of the total auxin production of all branches above that point… Auxin inhibition, therefore, probably increases with distance from the apical meristem" (Rasmussen et al. 2010), followed immediately by "**although it has not been experimentally demonstrated**". That sentence is *precisely* the engine's model — summed `exp(-d/dominance)` over all sources above — and the woody-plant literature's own review labels it an untested intuition.

**[D]** Cline 2000: on decapitation of temperate tree seedlings at spring flush, **only the uppermost remaining sequential buds** released. Meier et al. note that if carbon allocation alone drove release, response should track **bud size irrespective of stem position**. It did not. So sugar is not the whole story in woody plants either — **position still matters**, which leaves room for a short-range polar signal.

**[D]** Auxin/cytokinin ratio at the bud, not auxin level, is the operative variable (Brown et al., via review). Strigolactones proposed as the temporary control in the window between loss of the old apex and establishment of the new one (Dun et al. 2009).

**Meier et al.'s own synthesis, and the useful one for the engine:** **bud size and internal development** are what let a bud overcome inhibition in the absence of disturbance; disturbance-driven sprouting runs on stress signalling instead. That is a **per-bud state variable**, not a field. **Nothing in an auxin field can hold a bud for 40 years and then release it** — holding requires memory in the bud, and the engine currently has none.

**Verdict on question (2): the engine's `exp(-d/dominance)` can never be honest about woody bud control.** Not because the exponential is the wrong shape, but because the real system has (a) a length scale of centimetres, (b) a per-bud competence/size state with decade-scale memory, and (c) a release signal that is maximal when auxin is maximal.

---

## 4. Auxin in the cambium: where the premise genuinely holds — and its exact limit

**[D]** Uggla, Moritz, Sandberg & Sundberg 1996 (*PNAS* 93:9282) — the founding result. GC-MS on cryosections of *Pinus sylvestris* showed a **steep radial IAA concentration gradient** across the cambial meristem, peaking **within the dividing cambial zone** and falling to low levels where secondary wall formation begins. First demonstration of a plant morphogen occurring as a concentration gradient across a developing tissue.

**[D]** Uggla, Mellerowicz & Sundberg 1998 (*Plant Physiol* 117:113, "IAA controls cambial growth in Scots pine by positional signaling"): the **radial width** of the IAA gradient correlates with cambial growth rate. The hypothesis: gradient width sets the number of radial dividing cells.

**Then the field turned on it.**

**[D]** Nilsson et al. 2008 (*Plant Cell* 20:843, hybrid aspen *Populus tremula × tremuloides* overexpressing stabilised **PttIAA3**) — the decisive perturbation. What changed: periclinal divisions significantly reduced; anticlinal-division zone broadened; fibre width and length reduced (P < 0.01); vessel width reduced (P < 0.01); stem diameter smaller at all internodes (P < 0.05); xylem:phloem ratio lower. What did **not** change: **phloem width**, and — critically — **the radial IAA concentration gradient itself was unaltered**. And of ~250 genes whose expression mirrored the auxin distribution, **only 26** were among the 632 genes that actually responded to auxin. The authors' conclusion is a demotion: auxin provides "regulatory cues that modulate the expression of a few key regulators", not morphogen positional information.

**WARN/contested:** Bhalerao & Fischer 2014 (*Physiologia Plantarum* 151:43–51, "Auxin gradients across wood — instructive or incidental?") is the review that frames this as an open question. **Primary unreadable in this session (paywalled, 403).** Title and framing confirmed via multiple indexes; do not cite its internal conclusions from this brief.

### 4a. The map the task asked for

| Tree-form decision | Status | Evidence |
|---|---|---|
| Rate of periclinal division in cambium | **[D] auxin-governed** | Nilsson 2008 (signalling block → fewer divisions) |
| Fibre and vessel **dimensions** | **[D] auxin-governed** | Nilsson 2008 (width/length reduced, P<0.01) |
| Stem diameter / secondary growth **amount** | **[D] auxin-governed** | Nilsson 2008; Uggla 1998 |
| Width of the cambial zone | **[D] auxin-correlated, [I] governed** | Uggla 1998 (correlation only) |
| Radial **positional identity** across cambium | **[I] at best; contested** | Nilsson 2008: gradient intact under blocked signalling; 26/250 genes |
| Phloem width | **[D] NOT auxin** | Nilsson 2008 (unchanged) |
| Which bud releases (transient) | **[D] NOT auxin** | Mason 2014 |
| Branch growth rate after release (apical control) | **[D] NOT auxin** (phloem/sink) | Wilson & Gartner 2002 |
| Branch angle over years | **NOT auxin primarily** — reaction wood | project's prior sweep |
| Cambial activity in dormancy | **[D] NOT auxin concentration** — competence | Schrader 2003; Baba 2011 |

**Read across to the engine:** *Murray's-law radii driven by current auxin traffic is auxin setting a **size**, and that is the best-supported thing in the whole codebase.* Anything that used the auxin gradient to set **identity** across the cambium would be on the contested side of Nilsson 2008.

---

## 5. Season: the mechanism is a competence gate, not a concentration change

**[D/I]** Schrader et al. 2003 (*PNAS* 100:10096, PAT in wood-forming tissues of hybrid aspen; **primary paywalled, abstract-level via indexes — WARN**) and Baba et al. 2011 (*PNAS* 108:3418, activity–dormancy transition in the cambial meristem; **primary paywalled — WARN**) converge on one result that is the single most useful thing in this sweep for the engine's missing rhythm:

> **PAT *capacity* falls strongly in dormancy while IAA *concentration* falls only modestly. The dormant cambium becomes insensitive to applied auxin.** PIN, AUX1/LAX and ABCB transcripts in the cambial zone track the seasonal switch; the transport system must be reactivated in spring.

**This is a competence gate on transport, not a change in the hormone.** The engine already has exactly this primitive — `comp` in `src/15_pathogen.js` gates how far a cell's PIN may depart from uniform. A season would be the *same operator* driven by an environmental clock instead of an infection: hold `comp` low, elongation stops while organ founding continues, primordia pile at one arc position, and a whorl falls out of the branching rule that already exists. It costs nothing against the one rule because season is environmental, like the wind. **[OURS]** for the mapping onto `comp`; **[D/I]** for the biology.

The known obstacle the project already named — `minInternode` discarding primordia on a non-elongating axis — is the right blocker to pre-flight, and the literature is unambiguous that a bud is a **compressed shoot** whose primordia were founded and *retained*, not discarded.

---

## 6. Apical control: has anyone written the equation? No.

**[D]** Wilson & Gartner 2002 (*Tree Physiology* 22:347–353, phloem girdling in six conifers). The experiment and its result:

- Girdle **2 cm above** a branch → **upward bending in all six species**, with **compression wood** in the lower branch and also in the stem below the branch (implying increased auxin production *by the branch*).
- Girdle **2 cm below** a branch (branch still connected to apex and distal branches) → **released from apical control** in *Tsuga canadensis*, *Pinus contorta*, *Pseudotsuga menziesii*; **no release** in *Juniperus virginiana*, *Picea abies* (elongation fell too far); mixed in *Pinus rigida* (cambial activity up, no bending).
- Girdle **>20 cm below** → **no release in any species.**

Authors' interpretation: "branches compete with the subjacent stem for branch-produced photosynthate." **The tax is levied in the phloem, on the branch's own sugar, by the stem immediately below it.** The compression-wood result shows auxin is a downstream *actuator* of the angle change, not the correlative signal.

**[D]** Wilson 2000 (*Am J Bot* 87:601–607, invited review, "Apical control of branch growth and angle in woody plants"; **PDF 403 in this session — WARN**, content via indexes and the 2002 companion): apical control is the inhibition of a lateral by shoots **above** it; releasing it lets the branch grow larger **and bend upward**; it engages only *after* buds have broken and produced leaves.

**As far as this sweep found, no one has formalised apical control as an equation.** Wilson's 2000 review is descriptive; Wilson & Gartner 2002 is an experiment with a verbal interpretation; the 2012 epicormic review treats it qualitatively. This is a genuine gap in the literature, not merely a gap in my reading.

### 6a. A minimal equation [OURS] — flagged, in no paper

Let branch *i* fix carbon at rate `P_i`. Let the stem segment immediately below it have sink demand `S(x)` (cambium + downstream apices). The girdling result says the tax is **local in x**, with a kernel that is substantial at 2 cm and negligible at 20 cm. The minimal form:

    growth_i  =  P_i  /  ( 1 + κ ∫ S(x) · exp(−(x − x_i)/λ) dx )   for x below x_i,
    with λ bracketed at 2 cm < λ < 20 cm  [D, Wilson & Gartner 2002]

Properties, and why each matters here:

1. **It is local.** Girdle at 2 cm and the integral is severed → release. Girdle at 20 cm and almost nothing was in the kernel → no release. This reproduces the only quantitative fact anyone has about apical control.
2. **It is not a function of distance-below-apex**, so the **bottlebrush theorem does not apply.** The project's falsification (3) killed memoryless `f(d_from_apex)`. This is `f(local downstream sink field)`, and its memory lives in `S(x)`, which is itself a grown quantity. **This is the load-bearing point of the whole brief.**
3. **It is anti-correlated with apical dominance by construction**, matching the cross-taxon observation the project already holds: dominance is a *release* switch acting on dormant buds; this acts on *already-released* branches' growth rate. Different variables, different times.
4. **[OURS], untested, and it predicts a parabolic crown.** `S(x)` for a stem segment scales with the cambial area it must supply, which grows with the integral of foliage above it. A low branch therefore faces a tax that *accumulates* with crown above it and saturates as the crown closes — giving a profile that bends over rather than the straight cone a constant multiplier gives. **This is a prediction, not a result. Nobody has published it and I have not simulated it.**

---

## 7. Canalization in secondary growth: the engine's strongest ground, and its one serious challenge

**In favour [D].** Sachs' canalization hypothesis (Sachs 1969, 1981) was built on exactly the woody case: vascular strands regenerating around a wound. The modern confirmation is that **PIN1-marked auxin channels appear in previously homogeneous tissue *before* vascular tissue differentiates**, and transient gradual changes in PIN1 localisation **precede** the polarity of the new strands (Mazur, Kurczyńska & Friml 2016, *Scientific Reports* 6:33754, wounded Arabidopsis inflorescence stems, incl. cambium regeneration). Auxin accumulates above a severed strand; strands below become polarised sinks; a connection canalises between them. **This is the engine's core solver, and it is the right model for this phenomenon.**

**Against, and it is specific.** Two findings bear directly on the *flux-based* form the engine implements:

**[D]** Wulf, Reid & Foo 2019 (*Annals of Botany* 123:429, "Auxin transport and stem vascular reconnection — has our thinking become canalized?"). In legume **heterografts** (lupin/pea, lupin/broadbean), transport of [³H]IAA across the graft junction is **significantly disrupted** relative to self-grafts — yet vascular reconnection is **indistinguishable**: **50% of both** homo- and heterografts connected by **day 4**, **100% of both** by **day 7** (4–10 cell files). Their conclusion: "the amount of auxin flow does not necessarily correlate with the extent of vascular strand reconnection." Grafting success was also normal in gibberellin, brassinosteroid, strigolactone and ethylene mutants; they point at photoassimilates, mobile RNAs/proteins and epigenetic change.

**[D], and this is the one to worry about.** Bennett et al. 2016 state that PIN1 localisation **"does not depend directly on auxin flux"** but on **auxin concentration**. Flux-sensing versus concentration-sensing is the single deepest assumption in a canalization solver, and the current evidence in the best-studied system points at the one the engine did *not* pick. **WARN:** this is contested rather than settled — flux-based models still reproduce venation better than concentration-based ones in published simulations — but a project whose whole claim rests on canalization should know that its polarity rule is the disputed half.

**WARN, unread:** Ravichandran, Blilou et al. 2020 (*New Phytologist* 227:1051, "The canalization hypothesis — challenges and alternatives") is the review that catalogues exactly this. **Paywalled, 403 in this session; abstract not obtained.** It is the highest-value single follow-up read for this project and should not be cited from this brief.

---

## 8. Negative results and unpublished gaps

- **No equation for apical control exists** (§6). The most-cited review is verbal.
- **No PAT-velocity-versus-tree-size dataset exists.** AuxV correlates speed with organ, growth rate and clade — not height (Kramer 2011).
- **Nobody has connected `v/k` to the girdling length scale** (§1b) [OURS]. Two independent centimetre-scale measurements of the same quantity, never compared.
- **The summed-`exp(-d)` whole-tree auxin field is labelled "not experimentally demonstrated" by the woody-plant literature's own review** (Rasmussen et al. 2010, in Meier et al. 2012). The engine implements an explicitly untested intuition.
- **Nobody has built a tree model with a sugar/sink apical control and an auxin canalization cambium in one simulation.** The two literatures barely cite each other.
- **Buds break when tree auxin is highest** (Wignall & Browning 1988a; Cline & Dong-Il 2002, via review). This is a published fact that no auxin-inhibition-field model has ever accommodated.

---

## 9. Verdict on simulability

| Subsystem | Auxin defensible? | Local chemistry/physics/environment route? |
|---|---|---|
| Vein and strand patterning, wound reconnection | **Yes [D]**, with the flux-vs-concentration caveat | already the engine |
| Cambial rate, radius, cell dimensions | **Yes [D]** — auxin sets **size** | already the engine (Murray on traffic) |
| Radial identity across the cambium | **No [I]/contested** | do not build on it |
| Which bud escapes | **No [D]** | sink-share field `a_i / Σa_j`, phloem-fast — cheap |
| Growth rate of a released branch (apical control) | **No [D]** | local export tax, λ ∈ [2,20] cm **[OURS]** |
| 40-year epicormic memory | **No [D]** | per-bud competence state, not a field |
| Whorls / rhythm | **N/A** | seasonal **competence gate on transport** — the engine already owns this operator |
| Branch angle over years | **No** | reaction wood (project already knows) |

**One-line verdict:** the premise is sound where the biology is local and breaks exactly where the engine asks one auxin field to span metres — and every break has a local, environmental or physical substitute that costs nothing against the one rule.
