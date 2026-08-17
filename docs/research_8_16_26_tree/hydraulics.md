# Hydraulics, height and allometry — what a real tree needs, and what of it is local

Literature sweep, 2026-08-17. Flags: `[D]` the cited paper demonstrates it; `[I]` inferred
or asserted but not shown; `[OURS]` my construction, in no paper; `WARN` contested or
primary text unreadable.

**One-line frame for everything below.** Hydraulics is overwhelmingly a theory of **size
limits**, not of **form**. The single largest finding of this sweep is that *no published
mechanism derives crown shape from water transport* — the best mechanistic crown-shape
model in the literature uses tropisms and light and contains no hydraulics at all. What
hydraulics *does* hand this engine is one universal, locally-derivable anatomical law
(conduit taper), one honest scalar ceiling on height, and one irreversibility criterion
for wood. All three are cheap. None of them is a shape.

---

## 1. The pipe model, half a century on

**Lehnebach, Beyer, Letort & Heuret 2018, *Annals of Botany* 121:773–795** is the review
and its verdict is blunt: PMT "is not valid as a universal rule" `[D]`. The failures that
matter here:

- **The ratio is not constant.** A_L:A_S varies with ontogeny, site fertility, stand
  density, competitive status and crown position `[D]`. Shinozaki's own specific pipe
  length *L* varied across seasons and growth stages and the authors "were unable to
  identify any generic trend" — i.e. **nobody has a predictive law for the pipe-model
  constant**, then or now `[D]`.
- **Sapwood tapers where the model forbids it.** Sapwood area *increases* from crown base
  to breast height, contradicting the constant-area assumption outright `[D]`. Butt
  swelling alone refutes Pressler's law.
- **"Sapwood" mostly isn't conducting.** In *Quercus phellos* only 2 of 21 sapwood rings
  conduct; in *Ulmus americana* 90% of flow is in the outermost ring alone `[D]`.
  Staining studies typically find 2–9 conducting rings.
- **Leonardo's rule fails.** Yamamoto & Kobayashi 1993 in *Cryptomeria*: the slope
  "varied among individuals and was not systematically equal to 1" `[D]`.
- **Explicit critique of FSPMs**: models adopt sectoriality, area preservation and
  constant A_L:A_S without validating any of them for the modelled species `[D]`. That is
  a direct hit on any engine whose radius rule is a pipe-model relative.

**Size vs shape.** Lehnebach's own framing is that PMT conflates them: the *size* claim
(stem cross-section ∝ leaf quantity) is a first approximation that survives; the *shape*
corollary (constant sapwood area below the crown, i.e. a cylinder under a cone) is the
part that is empirically dead. **A barrel trunk is the pipe model's known failure mode,
not a bug in its implementation.**

What replaces it, per the review: count only conducting sapwood; make *L* size-dependent;
use process-based allocation that includes a *mechanical* term at the trunk base (butt
swelling is mechanics, not hydraulics) `[D]`.

**McCulloh, Sperry & Adler 2003, *Nature* 421:939–942** is the already-known result,
confirmed: the optimum is Murray's law, *not* the pipe model or da Vinci's rule, and real
conduits obey Murray "as long as they do not function additionally as supports for the
plant body" `[D]`.

---

## 2. Height limits: real, well-measured, and silent about form

- **Koch, Sillett, Jennings & Davis 2004, *Nature* 428:851–854** `[D]`: *Sequoia
  sempervirens*, tallest known individual 112.7 m; regression of height gradients in leaf
  functional traits gives **122–130 m** maximum barring mechanical damage. Mechanism:
  gravity plus path-length resistance limit leaf expansion and photosynthesis even with
  ample soil water. Defended against Netting in **Koch & Sillett 2009, *Am. J. Bot.*
  96:545–547** `[D]`.
- **Gravitational term: 0.01 MPa m⁻¹**, standing, chronic, present whether or not the
  tree is transpiring (Scholander 1965; restated in every paper below) `[D]`.
- **The hydraulic limitation hypothesis is largely NOT supported as an explanation of
  growth decline.** **Ryan, Phillips & Bond 2006, *Plant Cell Environ.* 29:367–381**
  reviewed 51 studies `[D]`: g_s, A and K_L are "often, but not always" lower in taller
  trees; where hydraulic limitation of A occurs it is **21–28%** (Hubbard 1999 21%; Skov
  2004 28%; Niinemets 2002 27%) against wood-production declines of **30–90%**. Verdict:
  "no evidence supports the original expectation that hydraulic limitation of carbon
  assimilation is sufficient to explain observed declines in wood production", and any
  height limit "does not appear to be related to the so-called age-related decline".
- **Compensation is the rule.** **McDowell et al. 2002, *Tree Physiol.* 22:763–774**:
  Douglas-fir 15 → 32 m, K_L falls 44%, then only 6% further to 60 m `[D]`.
  **Phillips et al. 2002, *Tree Physiol.* 22:205–211**: 60 m trees had *higher* sapwood
  conductivity than 32 m trees, breaking the predicted ranking `[D]`.
  **Ishii et al. 2014, *Funct. Ecol.* 28:1087–1093** `[D]`: *Sequoia* treetop leaves store
  >5× daily transpirational demand in transfusion tissue.
- **And the most recent word is a flat contradiction. Bittencourt et al. 2026, *Science*
  393:60–64** `[D]`: in the world's tallest tropical trees (SE Asian dipterocarps) the
  more negative xylem pressures caused by height "were fully compensated for through
  adjustment of vessel anatomy and leaf hydraulic traits", with no height-related growth
  loss even in severe drought.

**Does anything about SHAPE follow? No.** Every quantity here is a scalar per tree (H_max)
or per height (Ψ, K_L, A). **Gorgens et al. 2021, *Glob. Change Biol.* 27:177–189** `[D]`:
across 282,750 ha of Amazon, wind and light drive giant-tree distribution as much as
precipitation — even *where* tall trees occur is environmental, not hydraulic.

**Simulability.** A height ceiling is nearly free and is the one hydraulic thing that is
solidly supported. Ψ(z) = Ψ_soil − ρ g z − ∫R·E is a **local field readable at every
cell**, structurally identical to `37_wind.js` — an environmental forcing, permitted
category, no spatial prior. Cost: one scalar per station on an axis the engine already
walks. `[OURS]`

---

## 3. Conduit taper — the strongest result in this brief, and the one with an auxin story

**The empirical law.** Conduit hydraulic diameter *D_h* widens tip-to-base as
*D_h ∝ L^b* with **b ≈ 0.2**:

| Study | System | Result |
|---|---|---|
| Anfodillo et al. 2006, *New Phytol.* 169:279–290 `[D]` | 50 trees, angio + gymno, **0.5–44.4 m** | taper vs tree height r² = **0.88**, P<0.0001, independent of age, site, altitude; trees near max height slightly **under**-taper |
| Olson et al. 2014, *Ecol. Lett.* 17:988–997 `[D]` | **257 species, 609 samples** | widening as predicted across all angiosperm orders, habits, climates; **plant size, not climate or habit, is by far the main driver** |
| Rita et al. 2024, *Tree Physiol.* 44:tpae080 `[D]` | 10 *Fagus sylvatica*, 2 sites | **β ≈ 0.20, consistent across cambial age and climate** |
| Simovic & Michaletz 2025, *Plant Cell Environ.* 48:6912–6923 `[D]` | **~600,000 conduits**, 5 conifers, shoots *and* roots | exponents "closely aligning with theoretical predictions"; widening also fine-root → coarse-root; thickness:span ratios rise base→tip and always exceed the collapse limit |
| Khoma & McAdam 2025, *New Phytol.* 248:628–636 `[D]` | ferns, *Equisetum giganteum* | widening appears exactly in organs needing apical supply, absent in soil-surface and aquatic rhizomes — so it is **conditional, not obligate anatomy** |
| Olson & Anfodillo 2021, *New Phytol.* review — WARN, full text unreachable (403); abstract level only | synthesis | "just right" exponent ≈ **0.2**, empirical range **0.1–0.3** |

**Fonti & Cabon 2024, *Tree Physiol.* 44:tpae089** title it exactly right: "globally
convergent yet variable."

**The mechanism is local and it is auxin.** This is the finding to build on.

- **Aloni & Zimmermann 1983, *Differentiation* 24:203–208** `[D]` — the six-point
  hypothesis. Basipetal polar auxin flow sets a decreasing concentration gradient; **rate
  of differentiation scales with auxin; final conduit size is set by how long the cell
  expands before the secondary wall stops it.** Fast differentiation → narrow; slow →
  wide. NAA in lanolin on decapitated *Phaseolus vulgaris* at 0.03%, 0.1%, 1.0% produced a
  sharp basipetal gradient of increasing diameter and falling density over 0–4 cm; vessels
  per xylem cell fell from ≥0.4 at the application point to ≤0.2 at 4 cm; pattern shifted
  from layers to bundles with distance `[D]`.
- **Petit / Anfodillo et al. 2012, *J. Exp. Bot.* 63:837–845** `[D]` — the confirmation in
  a tree. An 11.5 m, 30-year-old *Picea abies*: conduit lumen area correlates with
  duration of the expansion phase, **r² = 0.73, P<0.01**; measured widening exponent
  **0.23**. Their reading is a cell-level timing rule under a positional (auxin) signal,
  not organ-level optimisation. They state the inductive signal "remains to be
  identified."
- **Bicego, Cocco, Urbinati & Anfodillo 2025, *Tree Physiol.* 45:tpaf127** `[D]` — the
  cleanest causal test available. Partial harvesting triggered epicormic shoots, moving
  leaves *down* the stem and shortening mean hydraulic path length. Basal conduit area
  then **fell by a factor of 0.93 to 0.56 (P<0.01)** in 9 trees over 4 species; the two
  trees without epicormics showed no change. **Conduit size at the base is set by current
  hydraulic path length, not by cambial age** — and it is *reversible downward*.

**Conduit taper and external stem taper are DIFFERENT QUESTIONS.** `[D]/[I]` Anfodillo's
b ≈ 0.2 is a law about *lumen diameter of individual cells* as a function of distance from
the apex. External stem diameter is set by pipe-model area plus mechanical loading plus
butt swelling. Nothing in the taper literature predicts stem diameter, and nothing in the
pipe-model literature predicts conduit diameter. Any engine result about a *radius*
exponent is not testable against b ≈ 0.2.

**But they are coupled, and the coupling bends the profile.** `[OURS]` Hagen–Poiseuille:
resistance R ∝ L/(N d⁴). With N fixed, exact compensation of path length requires
**b = 0.25**. Observed b ≈ 0.2 therefore *under*-compensates — which is precisely
Anfodillo 2006's note that trees near maximum height show "nonoptimal tapering …
insufficient to compensate." Holding total resistance per unit leaf area constant needs
N d⁴ ∝ L, so N ∝ L^0.2, and sapwood **area** = N d² ∝ L^(0.2+0.4) = **L^0.6**. That is a
trunk whose conducting area grows with path length *even at constant leaf area* — a
derived, non-pipe taper. **This is the mechanism the project's own `radiusExp` result
proves an exponent change cannot supply**: changing the Murray exponent rescales the log
profile, whereas a path-length term in per-conduit conductance *bends* it. Flagged
`[OURS]`: the arithmetic is standard, the application to an external stem profile is mine
and is in no paper I found.

**Savage et al. 2010, *PNAS* 107:22722–22727** `[D]` supersedes WBE and the pipe model on
this: adding hydraulic safety/efficiency trade-offs to space filling yields joint
predictions for sap flow, conduit taper and **conduit frequency vs conduit radius**, and
"the central tendency of observed scaling properties supports our predictions much better
than the West, Brown, and Enquist (WBE) or pipe models". WARN: I could not read the full
text (PNAS 403); exact predicted exponents not verified here.

---

## 4. Turgor, Lockhart, and whether a parabolic crown falls out honestly

**The gradient is real and it is measured.** **Woodruff, Bond & Meinzer 2004, *Plant Cell
Environ.* 27:229–236**, Douglas-fir at Wind River, sampling heights **13.5, 34.7, 44.2,
55.6 m** `[D]`:

- Pre-dawn and midday Ψ_l both decline linearly with height, **steeper than the 0.01 MPa
  m⁻¹ gravitational line**.
- May 2002 pre-dawn turgor decline **≈ 0.015 MPa m⁻¹**; at midday May 2001 estimated
  turgor **near zero at 55.6 m**.
- **At bud swell (May) there is no osmotic adjustment at all** — symplast solute content
  actually fell 30% between 13.5 and 55.6 m. By July adjustment had occurred but was
  insufficient; residual turgor decline still ≈ 0.25 MPa over that span.
- **Needle length, needle width and branch annual extension all decline with height;
  LMA rises sharply.**
- **The light confound is explicitly excluded**: canopy light transmittance (Parker et al.
  2002, same stand) does not change appreciably over the sampled interval, and Marshall &
  Monserud 2003 found the same LMA gradients in stands too open to have a light gradient.

**Ryan et al. 2006** call this "an entirely different paradigm": turgor limits growth by
limiting **cell expansion and division**, a *sink* limitation, independent of carbon
supply — and note mature bonsai as proof sink limitation alone shapes a tree `[D]`.

**Lockhart 1965, *J. Theor. Biol.* 8:264–275** is the equation: relative expansion rate
∝ φ(P − Γ) above a yield threshold Γ. Modern uses:

- **Peters et al. 2021, *New Phytol.* 229:213–229** `[D]`: a turgor-driven model
  reproduces **4 years of hourly** stem radial increment in *Picea abies* and *Larix
  decidua* along an elevation gradient, validated against wood-formation observations;
  strict environmental regulation at **air T > 2 °C and soil Ψ > −0.6 MPa**; warm dry
  summers reduce growth *via turgor* despite favourable cambial temperatures.
- **Cabon et al. 2020, *New Phytol.*** `[D]`: Lockhart applied to tracheid enlargement in
  Scots pine reproduces xylogenesis from water potential.
- **Potkay, Hölttä, Trugman & Fan 2022, *Tree Physiol.* 42:229–252** `[D within model]`:
  a Lockhart-based turgor-driven growth model produces **asymptotic height ≈ 45 m for
  Scots pine** (the observed upper limit) and metabolic scaling that departs from ¾ —
  isometric (β = 1) when small, sub-¾ when large. **Turgor alone produces a height
  ceiling.** It does not address crown gradients.

**The negative result, and it is recent.** **Alemán-Sancheschúlz et al., *J. Exp. Bot.*
77(4):1076 (2026; bioRxiv 2024.10.06.616874)** `[D]`: the turgor limitation hypothesis
predicts smaller and left-skewed leaf epidermal cell size distributions in taller trees.
In *Bursera simaruba* (29 individuals, **0.15–26.6 m**) and *Eucalyptus camaldulensis*
(29 individuals, **1.09–23 m**) skewness was unrelated to height in both species, variance
stayed wide at all heights, and **guard cells correlated *positively* with height** in
both (*B. simaruba* F = 32.95, P<0.001). Their reading: cell sizes reflect selection
within a wide developmental envelope, not limitation. **WARN: turgor limitation is
contested at the cell-anatomy level while being well supported at the shoot-extension and
cambium level.** Both can be true — Woodruff measured *organ extension*, they measured
*cell size* — but do not cite turgor limitation as settled.

**Could a parabolic crown fall out honestly? Partly, and there is a trap.** `[OURS]`

The trap is that a bare ρ g z term is **linear in height and memoryless**, which puts it
in exactly the class the project already falsified ("bottlebrush theorem": a memoryless
multiplier on distance below apex gives a cylinder or a cone, never a parabola). Adding
gravitational Ψ as a vigour multiplier will reproduce that failure with better physics.

What escapes it is that **Ψ at a growing tip is a function of that tip's own hydraulic
path length, not of its height** — this is Bicego 2025's demonstrated variable `[D]`, and
a lateral's path length is its insertion height *plus its own accumulated run*. That makes
a per-branch feedback: longer branch → longer path → lower Ψ → lower turgor → slower
extension → self-limiting length, with the asymptote set by insertion height. Low branches
asymptote long, high branches asymptote short, and the envelope is **concave, not linear**
— a paraboloid rather than a cone. It is local (one accumulated scalar per station, on a
walk the engine already does for radii), it is physics not chemistry, and it is not a
stated shape. **This is the single most promising item in this brief and I found no paper
that builds it.** Nearest published relatives: Buckley & Roberts 2006's DESPOT, and
Cabon 2026, *New Phytol.* 249:729–735, which argues exactly this framing — resource
economies produce *spatial gradients along the leaf-to-root axis* that regulate **local
sink activity**, dissolving the source/sink dichotomy `[I]`.

**And the honest comparison.** The best mechanistic crown-shape model published is
**Duchemin, Eloy, Badel & Moulia 2018, *J. R. Soc. Interface*, doi:10.1098/rsif.2017.0976**
`[D]`: a propagating-front model where crown growth velocity ∝ intercepted light angle ψ,
re-oriented by weighted gravitropism α_g and phototropism α_p plus a smoothing term. Being
length-free it has **self-similar attractor solutions independent of initial conditions**,
and varying just (α_g, α_p) produces conical, spherical and columnar crowns resembling
Norway spruce, oak and Mediterranean cypress. Cones are trivial self-similar solutions;
the universal γ→0 shape is the analytic inner envelope of a family of cones. **Two
dimensionless numbers, no hydraulics, no drawn shape.** If the goal is a crown that reads
as a crown, this is the cheaper route and it lands in the permitted environmental
category. It is also a warning: crown shape in the literature is a *tropism-and-light*
problem, and this engine already has the tropism half.

---

## 5. Sapwood, heartwood, Huber values — do they constrain the radius rule?

- **Mencuccini et al. 2019, *New Phytol.* 224:1544–1556** `[D]`: **1135 species**; Huber
  value H_v spans **three orders of magnitude**; negative isometry between H_v and K_s.
  H_v is therefore a species trait with enormous range and no universal value — it
  constrains nothing about form, only calibration.
- **Within a crown**, H_v increases basipetally and decreases with branch order `[I]`
  (birch/Sitka literature, secondary) — same direction as the §3 taper argument.
- **Direction with height is contested. McDowell et al. 2002, *Oecologia* 132:12–20**
  `[D]`: A_L:A_S declines with height in 15 Douglas-fir spanning **13–62 m** (P = 0.02),
  and a meta-analysis of 13 whole-tree studies finds a consistent decline — **except
  *Picea abies* and *Abies balsamea*, which increase, "the reason for this is not
  clear."** Note for this project: **the engine's model species is a spruce, and spruce is
  one of the two exceptions.**
- **Buckley & Roberts 2006, *Tree Physiol.* 26:145–157** `[D within model]` argue from
  optimality that L/S should *increase* with H, contradicting the conventional wisdom.
  Ryan 2006 reports the same increase in field data and calls it "a strong counter-
  argument to hydraulic limitation."
- **Petit, Mencuccini, Carrer, Prendin & Hölttä 2023, *J. Exp. Bot.* 74:5072–5087** `[D]`
  is the mechanism for sapwood depth: in a *Picea abies* and a *Fagus sylvatica*, D_h
  increased with distance from *each ring's own* apex, and **net of that, D_h did not
  increase with H**. Across a global dataset, the **number of sapwood rings at the base
  increases with H and decreases with height-growth rate ΔH**; mean sapwood ring width
  increases with ΔH. Their criterion for the sapwood→heartwood transition is **local and
  energetic**: it occurs where maintenance respiration of living cells in inner rings buys
  less conductance than the same carbon spent on new conduits.
- **Aye, Brännström & Carlsson 2022, *Tree Physiol.* 42:2174–2185** `[D]` is the
  wood-memory bookkeeping in its cheapest form: **sapwood pipes connect leaves currently
  on the tree; heartwood is pipes that used to connect leaves and branches now discarded.**
  Fitted to five species on three continents: calibration R² **84–99%**, cross-validation
  from age and height alone R² **68–98%**.

**Verdict on the radius rule.** `[OURS]` The project's noted defect — strip the leaves,
re-run the rule, basal radius falls 68.2%, because a cambium can only add — is *exactly*
Aye 2022's distinction, and the fix is one line of accounting rather than a new mechanism:
partition each station's cross-section into (a) pipes to live foliage, recomputed from
current traffic as now, and (b) a monotone non-decreasing accumulator of pipes whose
foliage has been shed. No shape is stated; the accumulator is the plant's own shedding
history. Petit 2023 supplies the closure criterion if a *rate* is wanted, and it is local.

---

## 6. Root:shoot — can the engine keep ignoring roots?

- **Enquist & Niklas 2002, *Science* 295:1517–1520** and **Niklas & Enquist 2002, *Am. J.
  Bot.* 89:812–819** `[D]`: M_L ∝ M_S^(3/4) ∝ M_R^(3/4), hence **M_S ∝ M_R — stem and root
  mass are isometric**. Across ten orders of magnitude of plant mass, standing biomass
  partitions **8% leaf / 67% stem / 25% root**, annual growth **30% / 57% / 13%**.
  Constants differ between angiosperms and conifers; exponents do not.
- **Roots are roughly half of whole-plant hydraulic resistance**, rising under water
  stress. WARN: widely cited (Sperry-attributed) and species/condition dependent; I could
  not pin a single primary measurement in this sweep.

**Verdict.** For **form**, yes — ignore roots. Isometry with the stem means a root system
is a constant multiplier and changes no proportion above ground `[D]`. For **size limits**,
no — half the resistance and the entire supply term are below ground, so any absolute
height ceiling computed from Ψ needs a lumped root resistance. Cheapest honest version:
one scalar, R_root ≈ R_shoot `[OURS]`. **Kempes, West, Crowell & Girvan 2011, *PLoS ONE*
6:e20551** `[D]` is the precedent — maximum height across the continental US predicted by
intersecting a *required* metabolic flow, an *evaporative* flow and a *precipitation-
limited available* flow, with D ∝ H^(2/3) and canopy radius R_c ∝ H^(2/3); over-predicts
in wet environments (competition), under-predicts in arid ones. **Niklas & Spatz 2004,
*PNAS* 101:15661–15663** `[D]` add the correction that L ∝ D^(2/3), M ∝ D^(8/3) are *not*
mechanical-stability adaptations — a growth-hydraulic model fits better, and the 2/3 and
8/3 rules are violated by small and intermediate plants.

---

## 7. What nobody has published

1. **No derivation of b ≈ 0.2 from an auxin gradient.** Aloni & Zimmermann 1983 give the
   local rule; Petit 2012 confirms the expansion-duration mechanism and measures 0.23 in a
   spruce; Anfodillo/Olson give the universal exponent — and **the two halves have never
   been joined quantitatively.** Petit 2012 says outright the inductive signal "remains to
   be identified." An engine that already solves auxin transport on arbitrary topology is
   in an unusually good position to try, and a *negative* result would be publishable.
2. **No hydraulic theory of crown shape.** Searched hard; the field's mechanistic crown
   shape model (Duchemin 2018) is tropism + light.
3. **No predictive law for the pipe-model constant *L***, sixty years on (Lehnebach 2018).
4. **No published branch-length model driven by per-branch hydraulic path length**, though
   Cabon 2026 argues for precisely that class of spatially-explicit sink model.

## 8. Verdict on simulability

| Mechanism | Sets | Local? | Verdict |
|---|---|---|---|
| Ψ(z) = Ψ_soil − ρgz − ∫R·E as an environmental field | **size** (height ceiling) | yes — same category as wind | **Take it.** One scalar per station, no spatial prior. |
| Conduit taper D_h ∝ L^0.2 from auxin-gated expansion duration | **size** (per-cell), feeds shape via §3 arithmetic | **yes, and the mechanism is auxin** | **Take it. This is the flagship.** The one place hydraulics and this engine's chemistry are the *same* mechanism. |
| Path-length term in per-conduit conductance | **shape** (bends the taper log-profile) | yes | **Take it.** Does what `radiusExp` provably cannot. `[OURS]`, untested. |
| Turgor / Lockhart vigour gradient | **size**, and shape *only* with per-branch path-length feedback | yes | **Take it with the caveat.** Bare ρgz is memoryless → bottlebrush. Path length is not. |
| Wood memory as sapwood/heartwood bookkeeping | **size** (irreversibility) | yes | **Take it.** One accumulator, Aye 2022. |
| Huber value / A_L:A_S | calibration only | n/a | Species knob. Direction is contested; spruce is an exception. |
| Roots | size only | n/a | **Keep ignoring for form.** One lumped resistance if a ceiling is wanted. |
| Hydraulics as an explanation of crown shape | nothing | — | **Does not exist in the literature.** Use tropisms + light (Duchemin 2018). |
