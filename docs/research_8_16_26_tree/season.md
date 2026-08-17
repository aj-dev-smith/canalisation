# The growth rhythm: season, dormancy, whorls

Literature sweep, 2026-08-16. Flags: `[D]` the cited paper demonstrates it; `[I]` inferred
or asserted in the literature but not shown; `[OURS]` my construction, in no paper; `WARN`
contested, or primary source unreadable and the claim comes from a secondary route.

Read the verdict (§7) first if you only want the answer.

---

## 1. Is the rhythm environmental forcing, or an internal oscillator?

**Both, and which one depends on the species. This is the single most important thing in
this brief, because it means "a season is environmental, same category as wind" is
defensible but is a *choice*, not the only reading of the literature.**

### 1a. The photoperiod arm is genuinely external, and it is one scalar

- **`[D]` Böhlenius et al. 2006, *Science* 312:1040–1043.** The CO/FT module that times
  flowering in annuals also times *short-day-induced growth cessation and bud set* in
  *Populus*. Critical daylength for bud set tracks latitude of origin; FT expression is
  the intermediate. This is the canonical "one scalar, read in the leaf, moved as a
  signal" result — day length in, a mobile protein out, apex responds.
- **`[D]` Gyllenstrand et al. 2007, *Plant Physiology* 144:248–257.** The conifer version,
  and it inverts the sign. *Picea abies* `PaFT4` (the paper's name; often cited as
  `PaFTL2`) is *up* under short days and low under long days — **positively** correlated
  with bud set, where poplar's FT is negatively correlated. Numbers worth having:
  critical dark period for bud set is **7–10 h for a Romanian (southern) population and
  2–3 h for an Arctic one**. So a single per-species threshold on one scalar switches a
  spruce between elongating and setting bud.
- **`[D]` Heide 1974, cited widely** (WARN: read through secondary sources only): critical
  night length **6–8 h for Nordic seed origins between 60°N and 66°N**. Consistent with
  the above.
- **`[D]` Wareing 1949, *Nature* 163:770–771.** Short days (10 h) vs long (15 h) in
  *Pinus sylvestris* seedlings: short days cause earlier growth cessation, **fewer leaves
  formed before the terminal resting bud**, *and* **shortened internodes, giving a rosette
  habit** — plus cessation of cambial activity. This is the most useful single old paper
  for this engine: the same external scalar moves organ *number*, internode *length*, and
  *radial* growth together. A rosette is a whorl of leaves with the internodes taken out.
- **`[D]` Downs & Borthwick 1956, *Botanical Gazette* 117:310–326.** The species survey.
  **Birch, catalpa, elm, red maple and dogwood can be kept growing continuously at a 16 h
  photoperiod; paulownia, sweetgum and horse chestnut cannot.** So even within temperate
  angiosperms, half the tested species free-run into continuous growth (pure environmental
  control) and half stop anyway (an internal term).

### 1b. But the plant's *measurement* of day length is itself an oscillator

- **`[D]` Clapham et al. 2001, *Biological Rhythm Research* 32(4):479–487.** Night-break
  experiments on *Picea abies* under extended nights (3 × 8 h light / 40 h dark). Bud set
  was delayed when the break fell near the critical night length of 6–7 h **and again
  about 22–23 h later** — the recurrence interval is the signature of *circadian*, not
  hourglass, timekeeping.
- **`[D]` Lázaro-Gimeno et al. 2024, *Tree Physiology* 44(11):tpae139.** Recent and
  directly on point. Delayed-fluorescence rhythms in spruce buds: free-running periods
  **~24.9 h and ~27.4 h (northern clone 142), ~19.98–21.5 h (southern clone 483)**, with
  an ultradian ~14 h component; amplitude **damps** through bud development stage IV.
  Core clock genes (`LHY`, `ELF3`, `ELF4`, `GI`, `TOC1`, with `LUX` as hub) are rhythmic.
  Rhythmicity was detectable under warm constant light but *not* under cool short-day
  spring conditions.
- **`WARN` Gyllenstrand et al. 2014, *PLoS ONE*, "No Time for Spruce: Rapid Dampening of
  Circadian Rhythms in *Picea abies*."** Title-level only; I could not read the paper. It
  asserts that spruce's clock damps unusually fast in constant conditions, which is in
  tension with a strong free-running oscillator and consistent with the damping in the
  2024 paper above.

### 1c. And some trees free-run a *growth* rhythm with no season at all

- **`[D]` Ekberg, Eriksson & Dormling, "Photoperiodic reactions in conifer species"**
  (WARN: primary paywalled; venue commonly given as *Holarctic Ecology* 2:255–263, 1979 —
  treat the volume/pages as unresolved). Result read consistently across several secondary
  sources: **in seedlings of *Pinus sylvestris* and *Pinus contorta*, growth cessation and
  bud set occurred in all light regimes, including continuous illumination.** Photoperiod
  set the *rate*, not the *occurrence*. This is a **negative result for pure environmental
  forcing in exactly the genus that gives us the archetypal whorl**, and it should be
  taken seriously before committing.
- **`[D]` Greathouse, Laetsch & Phinney 1971, *American Journal of Botany*** ("The
  shoot-growth rhythm of a tropical tree, *Theobroma cacao*"). Alternating flush and rest
  persists under controlled constant conditions, and — the diagnostic detail — **growth is
  asynchronous between individuals** under those conditions, which is what an endogenous,
  uncoupled oscillator looks like and what an environmental driver cannot produce.
- **`[D]` Herrmann et al. 2015, *J. Exp. Botany* 66(22):7113–7127.** *Quercus robur*
  microcuttings at constant 23 °C, 16 h/8 h: 2–3 flushes in 8 weeks, cycle length
  **~21 d rising to 27–37 d by the third cycle**. Ectomycorrhizal inoculation raised
  growth but **did not change the period** — so the rhythm is a clock, not a
  resource-depletion cycle. Title claim: "regulated by internal clocks rather than
  resource availability."
- **`[D]`/`[I]` Borchert 1973, *Physiologia Plantarum* 29:173–180.** *This is the same
  Borchert as Borchert–Honda, and this paper is the most directly implementable thing in
  the sweep.* A rhythm emerges from **feedback between two continuous processes (shoot and
  root) when the slower one is rate-limiting for the faster**, i.e. from maintaining a
  constant shoot:root ratio. Period length is set by the growth rates. Simulated patterns
  matched measured tropical-tree growth `[D for the fit]`, and — the line that matters —
  **"the transition from intermittent to continuous growth … can be simulated by varying a
  single parameter in the model."** `[I]` that the shoot:root interpretation is the true
  mechanism; the demonstration is that a two-compartment rate-limited feedback suffices.

---

## 2. Endo- vs ecodormancy, and what the "off" state actually is locally

- **`[D]`/definitional. Lang, Early, Martin & Darnell 1987, *HortScience* 22:371–377.**
  The universal terminology. **Paradormancy** — inhibited by a signal from *another* organ
  (this is what the engine already has: apical dominance). **Endodormancy** — inhibited by
  a signal *within the meristem itself*; will not grow even under perfect conditions;
  released by chilling. **Ecodormancy** — inhibited only by the environment. The engine
  has paradormancy and nothing else, and **endodormancy is the state that makes a bud a
  bud**.
- **`[D]` Rinne et al. 2011, *The Plant Cell* 23:130–146.** The best local-chemistry story
  in the literature for this engine, because it is *transport gating*, which the codebase
  already does. Dormancy establishment closes plasmodesmata at the shoot apical meristem
  with **callose sphincters**, symplastically isolating every cell. Chilling
  hyperinduces FT and recruits **GA-inducible 1,3-β-glucanases** that digest the callose,
  reopening the conduits so FT/CENL1 can move and growth resumes. So: **endodormancy is a
  closed-transport state and chilling is a scalar that reopens it.**
- **`[D]` Singh et al. / "Wake up: the regulation of dormancy release and bud break in
  perennial plants", *Frontiers in Plant Science* 2025.** Recent synthesis; adds that
  **ABA-mediated plasmodesmata constriction** in hybrid aspen blocks FT entry, and that
  `EBB1`/`EBB3` form a temperature-sensing arm upstream of cell division.
- **`[D]`/`[I]` "Molecular advances in bud dormancy in trees", *J. Exp. Botany* 2024,
  75(19):6063.** Review; DAM/SVP-family MADS-box genes as the endodormancy integrators,
  with H3K4me3/H3K27me3 as the chilling-counting memory. `[I]` that the histone marks *are*
  the chill counter rather than a correlate.
- **`[D]` Baba et al. 2011, *PNAS* 108:3418–3423.** The cambial half, and it is a warning
  for an auxin engine. At the activity→dormancy transition the cambium changes its
  **responsiveness to auxin**, not (only) its auxin content: repressor ARFs induced,
  activator ARFs down, and in full dormancy the SCF^TIR1 complex is perturbed so Aux/IAA
  repressors are stabilised. **A dormant cambium is auxin-deaf.** Compare
  **`[D]` Uggla et al. 1996, *PNAS* 93:9282–9286**, which showed the steep radial IAA
  gradient across the *Pinus sylvestris* cambium that positions xylem differentiation —
  the gradient is the positional signal, and dormancy switches off the reading of it.

---

## 3. Conifer shoot growth: preformation is a queue, and the queue is the whole mechanism

- **`[D]`/textbook. Fixed (preformed) growth**: the winter bud contains *all* the leaf
  primordia that will expand next season; elongation is complete in 2–6 weeks. **Free
  growth / neoformation**: the apex keeps founding *and* elongating through the summer.
  Most temperate Pinaceae are fixed; seedlings and vigorous juveniles show free growth.
- **`[D]` "Needle and bud scale development in *Picea abies*", *Trees* 2024, 38.** Temperate
  and boreal conifers have **determinate growth: a whole year's complement of needles
  begins to form in the summer of year 1**, overwinters inside scales that were themselves
  initiated in the spring of year 1 *before* the needles. A useful complication: many
  organs in a given bud are **intermediate** between scale and needle, so scale-vs-needle
  is a continuum of a single positional variable, not two organ types.
- **`[D]` Lanner 1966, USDA Forest Service Research Paper PSW-RP-29, "The phenology and
  growth habits of pines in Hawaii."** The clean statement of the temporal separation
  between initiation and elongation in Pinaceae, plus the foxtail data in §4.
- **`[D]` Cannell, Thompson & Lines 1976** (in Cannell & Last, eds., *Tree Physiology and
  Yield Improvement*, Academic Press, pp. 173–205) (WARN: chapter not read; cited
  consistently in the primary literature I did read). Inherent differences in conifer shoot
  growth trace to **the number of primordia laid down in the bud**, so next year's shoot
  length is largely written the previous summer.
- **`[D]`/`[I]` "Primordium initiation drives tree growth", *Annals of Forest Science* 2017,
  74:1 (WARN: both the HAL PDF and the Springer page refused to serve). Title-level claim,
  and it is the claim: **the rate-limiting step for tree growth is primordium initiation,
  not internode elongation.**

**What this settles for the engine.** The project's own stated obstacle — that
`minInternode` makes a non-elongating axis *discard* the primordia its meristem emits —
is not an implementation annoyance to route around. **Queueing founded primordia against
suspended elongation IS preformation**, and preformation is the central fact of conifer
shoot growth. `[OURS]` Fixing that one behaviour is doing the biology, not working around
the code; taking "the wood term alone" as the kill-criterion fallback would skip the
mechanism that produces whorls.

---

## 4. Foxtailing: the natural control experiment, and it is unusually clean

- **`[D]` Kozlowski & Greathouse, *Unasylva* No. 99, "Shoot growth and form of pines in the
  tropics."** Field survey. Foxtailing — **a branchless stem up to 6 m, occasionally 12 m,
  with needles packed near the tip and no lateral branches at all** — reaches **up to 40 %
  incidence in lowland sites with constantly high temperatures and heavy non-seasonal
  rainfall**, and is **reduced where there is a distinct dry season (< 61 mm/month for
  3–4 months)**. Also: tropical pines run **2–4 growth periods per year, ~30–60 mm of
  leader elongation per period**; temperate *P. taeda* runs 2–3; up to **seven** successive
  bud elongations per year is recorded in exceptional cases. It calls foxtailing "a
  striking form of apical dominance" `[I]` — the mechanistic attribution is not shown.
- **`[D]` Lanner 1966 (as above), reported via two independent secondaries:** a foxtail with
  **5 years of continuous shoot growth with no dormant period, producing a 13 cm diameter
  stem composed entirely of earlywood.** No dormancy → no whorls *and* no growth rings, in
  the same specimen.
- **`[I]` Lloyd 1914** named the phenomenon; the mechanism given is **failure to set a bud
  cluster** — the central bud of which would have extended the leader and the lateral buds
  of which would have become the branch whorl.

**This is exactly the engine's current condition.** A continuously growing conifer with no
whorls is not a bug that no one has seen; it is a documented tropical phenotype with a
documented cause (aseasonality), a 40 % incidence figure, and a 61 mm/month rainfall
threshold that switches it. The engine has, without meaning to, grown a foxtail.

---

## 5. The whorl itself: nobody needs to draw it

- **`[D]` Shaw 1914, *The Genus Pinus*.** The terminology and the anatomy. **The whorl is
  the cluster of subterminal buds around the base of the terminal bud, at the tip of the
  year's shoot** — buds "each concealed in the axil of a primary leaf converted into a
  bud-scale". Uninodal species make one whorl per year; multinodal species (about a third
  of pines, incl. *P. taeda* and the serotinous group) make two or more.
- **`[D]` Sweet & Bollmann 1976, *NZ Journal of Forestry Science* 6(3):393–396.** Splits
  the ambiguous "multinodal" into six morphotypes. Worth knowing that the category is not
  binary.
- **`[D]` Cannell & Bowler 1978, *Canadian Journal of Forest Research* 8(1):129–137.**
  The load-bearing paper. Lateral buds form on *Picea sitchensis* leaders in April–May,
  **inside the winter bud, before the leader emerges**. On the cone-shaped surface of the
  parent bud they are **evenly, not randomly, dispersed**; the authors conclude the
  division centres are **positioned by inhibition–competition mechanisms**, which is why
  **the number of lateral buds scales with parent shoot size**, why branches are dispersed
  with equal expectation in all compass directions with minimal mutual shading, and why
  **"a variety of staggered and whorled branch arrangements could result"** from one rule.
  Companion paper: **Cannell & Bowler 1978b**, *Can. J. For. Res.* 8:138–141, a computer
  simulation of needle phyllotaxis on elongating conifer shoots.
- **`[OURS]`** The engine already implements inhibition–competition positioning: that is
  what `stepAuxin` on a meristem sheet *is*. So the whorl needs **no new spatial rule at
  all**. It needs the two things Cannell & Bowler's specimens had and the engine's do not:
  primordia founded onto an apex whose internodes are not extending, and a *cone-shaped*
  (compressed) parent surface rather than a stretched one.
- `WARN`/**`[D]`** A conifer "whorl" is not a true whorl. The buds are a **compressed
  helix (pseudowhorl)** — same phyllotaxis, internode length near zero. That matters for
  the engine's own gap-CV statistic: the target is not "k branches at one arc position"
  but "k successive helical positions with no axial separation, then a long gap".
- **`[D]` Kroon et al. 2008, *Scandinavian Journal of Forest Research* 23(4).** 27-year
  *Picea abies* progeny trial. Significant genetic variation (p < 0.01) for numbers of both
  internodal and whorl branches. Block-mean internode length correlated **r ≥ 0.90 with
  branch dimensions, r = 0.81 with lammas frequency, r = 0.68 with branches per whorl, and
  only r = 0.25 with internodal branches per unit length.** Read as: **vigour sets internode
  length, whorl size and lammas frequency together, and internodal branching separately.**

---

## 6. Polycyclism / lammas, and the crown as a yearly record

- **`[D]` Polycyclism in *Quercus robur* / *Q. petraea*** (Nicolini, Barthélémy and
  colleagues; and the CyberLeninka open version of "Polycyclism and phenological variability
  in the common oak"): several growth units per annual shoot; **up to four GUs per year in
  juveniles under low stand density, full light, no late frost and sufficient water**; much
  more frequent in the youngest ontogenetic phases and declining with age.
- **`[D]` Lammas growth in *Picea abies*** (Kroon et al. 2008, above) forms **extra whorls**,
  and its frequency correlates 0.81 with internode length — i.e. **it is vigour-gated**, and
  it is the documented way the one-flush-per-year rule breaks.
- **`[D]` Retrospective architectural analysis** — e.g. "Retrospective analysis of tree
  architecture in silver fir (*Abies alba*)", *Annals of Forest Science* 2012, 69. Annual
  shoot extension can be **dated on standing conifers of any size** from **bud-scale
  (cataphyll) scars and pseudo-whorls**. This is the direct answer to question (3): **the
  crown of a real conifer is a legible year-by-year record**, and that legibility is a
  consequence of the rhythm, not a decoration on top of it.
- **`[D]` Wareing 1949 (above) and Wareing 1956, *New Phytologist* 55** (*Robinia*):
  photoperiod gates **cambial** activity too. Combined with the Lanner foxtail (all
  earlywood, no rings), the same scalar that makes whorls makes growth rings — so the
  project's ROADMAP 0z1 and 0z2 are one clock, exactly as it guessed.

---

## 7. Usable quantitative models, and what is missing

- **`[D]` Chuine 2000, *J. Theoretical Biology* 207:337–347, "A unified model for budburst
  of trees."** Three parts: a sigmoid temperature-response function accumulating **chilling
  units** and **forcing units**, a defined effective period, and a **temperature-dependent
  threshold**. Sequential, parallel, alternating and spring-warming models are all special
  cases. Two empirical parameters per response curve (sharpness, mid-point). Directly
  codeable in a dozen lines.
- **`[D]` Sarvas 1972, 1974, *Communicationes Instituti Forestalis Fenniae*.** The original
  "period units" / "high-temperature units" formulation of the *whole annual cycle* (active
  period; autumn and winter dormancy) rather than budburst alone.
- **`[D]`/`WARN` Delpierre et al. 2016, *Annals of Forest Science* 73:5–25.** The standard
  review (WARN: paywalled, read via abstract and citing papers). Forcing is generally
  accumulated above ~5 °C; photoperiod modulates in some species only.
- **`[D]` Borchert 1973 (above)** — the only model here that produces the rhythm *without*
  an environmental input, and the only one whose single parameter switches
  intermittent↔continuous.

**Negative results and gaps — what nobody has published:**

1. `[I]`/**gap.** **Autumn models are far weaker than spring models.** Budburst has a
   fifty-year modelling literature; **bud set / growth cessation has essentially no
   equivalent standardised model family**. The photoperiod threshold is the model.
2. **gap.** I found **no published mechanistic model that derives whorl spacing from
   primordium queueing**. Retrospective analyses *measure* whorls; architectural models
   (AMAP, LIGNUM, GreenLab, L-systems) **impose** the annual growth cycle as an input
   schedule. The claim "a bud is a compressed shoot, so pausing elongation while initiation
   continues piles primordia into a whorl" is **`[I]` at best and arguably `[OURS]`** — it
   is exactly what the anatomy says (Shaw 1914; Cannell & Bowler 1978; *Trees* 2024) but I
   found nobody who has run it as a simulation and reported the resulting spacing statistic.
   **That is a genuinely novel result available to this project cheaply.**
3. **gap.** No one has published the gap-CV statistic the project is measuring against.
   Its 0.83 vs √(k−1) ≈ 2.0 comparison appears to be its own construction, and is fine, but
   the literature target should be stated as "clustered pseudowhorls dated by cataphyll
   scars", not as a published CV.
4. `WARN`/contested. **Whether temperate conifers free-run.** *Pinus sylvestris* and
   *P. contorta* set bud under continuous light (Ekberg et al.); *Picea abies* is strongly
   photoperiodic with a 2–10 h critical dark period (Gyllenstrand et al. 2007) yet its
   circadian clock damps fast (Gyllenstrand et al. 2014; Lázaro-Gimeno et al. 2024). These
   are not reconciled in the literature.
5. `[D]`, and an oddity worth knowing: **Kvaalen & Johnsen 2008, *New Phytologist* 177**.
   Timing of bud set in *Picea abies* is shifted by an **epigenetic memory of the
   temperature during zygotic/somatic embryogenesis** — the mother's summer changes the
   offspring's critical night length. Nothing to build, but it shows the "threshold" is not
   a constant of the species.

---

## 8. Verdict

**Is "a season is environmental, the same category as wind" defensible? Yes — with one
honest caveat that should be written into SCIENCE.md rather than hidden.**

Defensible because: the demonstrated proximate trigger in the species the engine is
imitating is **an external scalar with a per-species threshold** (Gyllenstrand et al. 2007:
2–3 h vs 7–10 h critical dark period; Heide 1974: 6–8 h across 60–66 °N), and the
demonstrated *absence* of the season demonstrably removes the whorls (Kozlowski &
Greathouse; Lanner 1966 — a 5-year continuous foxtail, all earlywood, no branches). That is
as clean an environment→form causal chain as the wind field's.

The caveat: **the plant's reading of that scalar is itself an oscillator** (Clapham et al.
2001 — circadian, not hourglass; recurrence at 22–23 h), and **two pines set bud under
continuous light** (Ekberg et al.), and **cacao and oak free-run growth rhythms in constant
conditions with periods of 21–37 days** (Greathouse et al. 1971; Herrmann et al. 2015).
So "purely environmental" is a species-specific simplification, not a universal.

**Minimal signal that gets whorls: ONE scalar, and it should be day length.**

`[OURS]` The cheapest defensible construction, in the engine's own idiom:

- A world-level scalar `WORLD.daylength(t)` — a sine of the year, alongside `WORLD.unitM`
  and the wind's `uRef`. One number, no spatial structure, exactly the wind's category.
- A per-species critical night length (a *stated* number, one per species, on the same
  footing as `uRef` — and the literature gives the range: **2–10 h**).
- The response is local chemistry: below threshold, **elongation is gated off while
  primordium founding continues** — the preformation queue (§3), which the literature says
  is the rate-limiting process anyway. Nothing says where a branch goes.
- Whorl *spacing* then falls out for free, because inhibition–competition on a compressed
  apex is what the engine already computes (Cannell & Bowler 1978), and the resulting
  arrangement is a compressed helix, which is what a real pseudowhorl is.
- **Do not add temperature as a second input unless chilling is wanted.** Day length and
  temperature are phase-shifted versions of the same annual cycle; one is enough for the
  whorl. Chilling only becomes necessary if endodormancy is wanted (Lang et al. 1987) — and
  if it is, the elegant local form is already in the codebase's vocabulary: **dormancy is
  callose-closed plasmodesmata and chilling is the glucanase that reopens them** (Rinne et
  al. 2011), which is the same transport-gating the pathogen module already does.

**What sets SIZE vs what sets SHAPE.** Forcing temperature and the duration of the
permissive window set the **size** of the annual increment — the number of preformed stem
units and the internode length (Wareing 1949; Cannell et al. 1976), and vigour sets
branches-per-whorl and lammas frequency together (Kroon et al. 2008, r = 0.68 and 0.81).
The **on/off transition itself** sets the **shape**: whorls, bud scars, growth rings, and
the crown's legibility as a yearly record. **A season changes nothing about what a branch
looks like and everything about where branches are not.** That is the argument that keeps
it out of SCIENCE.md's numbered list.

Highest-value single experiment `[OURS]`: **queue the primordia instead of discarding them,
square-wave the elongation gate with a fixed period, and measure the gap CV.** If it goes
from 0.83 toward ~2, the whorl is emergent from machinery that already exists and the
project can publish a result nobody has (§7 gap 2). If it does not, the wood term alone is
still worth having and the foxtail reading of the current tree is at least honest.

---

## Sources

1. Böhlenius H. et al. 2006. CO/FT regulatory module controls timing of flowering and seasonal growth cessation in trees. *Science* 312:1040–1043. https://www.science.org/doi/10.1126/science.1126038
2. Gyllenstrand N., Clapham D., Källman T., Lagercrantz U. 2007. A Norway spruce FLOWERING LOCUS T homolog is implicated in control of growth rhythm in conifers. *Plant Physiology* 144:248–257. https://academic.oup.com/plphys/article/144/1/248/6106742
3. Clapham D. et al. 2001. Circadian timekeeping for the photoperiodic control of budset in *Picea abies* seedlings. *Biological Rhythm Research* 32(4):479–487. https://www.tandfonline.com/doi/abs/10.1076/brhm.32.4.479.1336
4. Lázaro-Gimeno D. et al. 2024. The circadian clock participates in seasonal growth in Norway spruce (*Picea abies*). *Tree Physiology* 44(11):tpae139. https://academic.oup.com/treephys/article/44/11/tpae139/7868159
5. Lang G.A., Early J.D., Martin G.C., Darnell R.L. 1987. Endo-, para- and ecodormancy: physiological terminology and classification for dormancy research. *HortScience* 22:371–377. https://journals.ashs.org/hortsci/view/journals/hortsci/22/5/article-p701_c.xml
6. Rinne P.L.H. et al. 2011. Chilling of dormant buds hyperinduces FLOWERING LOCUS T and recruits GA-inducible 1,3-β-glucanases to reopen signal conduits and release dormancy in *Populus*. *The Plant Cell* 23:130–146. https://academic.oup.com/plcell/article/23/1/130/6094974
7. "Wake up: the regulation of dormancy release and bud break in perennial plants." 2025. *Frontiers in Plant Science*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11924409/
8. "Molecular advances in bud dormancy in trees." 2024. *Journal of Experimental Botany* 75(19):6063. https://academic.oup.com/jxb/article/75/19/6063/7656453
9. Downs R.J., Borthwick H.A. 1956. Effects of photoperiod on growth of trees. *Botanical Gazette* 117:310–326. https://www.journals.uchicago.edu/doi/abs/10.1086/335918
10. Wareing P.F. 1949. Photoperiodic control of leaf growth and cambial activity in *Pinus sylvestris*. *Nature* 163:770–771. https://www.nature.com/articles/163770a0
11. Ekberg I., Eriksson G., Dormling I. Photoperiodic reactions in conifer species. (WARN: venue/pages unresolved; commonly cited as *Holarctic Ecology* 2:255–263, 1979.) https://www.researchgate.net/publication/227668143_Photoperiodic_reactions_in_conifer_species
12. Greathouse T.E., Laetsch W.M., Phinney B.O. 1971. The shoot-growth rhythm of a tropical tree, *Theobroma cacao*. *American Journal of Botany*. https://bsapubs.onlinelibrary.wiley.com/doi/10.1002/j.1537-2197.1971.tb09974.x
13. Herrmann S. et al. 2015. Endogenous rhythmic growth in oak trees is regulated by internal clocks rather than resource availability. *Journal of Experimental Botany* 66(22):7113–7127. https://academic.oup.com/jxb/article/66/22/7113/2893275
14. Borchert R. 1973. Simulation of rhythmic tree growth under constant conditions. *Physiologia Plantarum* 29:173–180. https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1399-3054.1973.tb03087.x
15. Lanner R.M. 1966. The phenology and growth habits of pines in Hawaii. USDA Forest Service Research Paper PSW-RP-29. https://www.fs.usda.gov/psw/publications/documents/psw_rp029/psw_rp029.pdf
16. Kozlowski T.T., Greathouse T.E. Shoot growth and form of pines in the tropics. *Unasylva* No. 99. https://www.fao.org/4/A7218E/a7218e03.htm
17. Shaw G.R. 1914. *The Genus Pinus*. https://www.gutenberg.org/files/26798/26798-h/26798-h.htm
18. Sweet G.B., Bollmann M.P. 1976. The terminology of pine shoot growth. *NZ Journal of Forestry Science* 6(3):393–396. https://www.scionresearch.com/__data/assets/pdf_file/0010/58897/NZJFS631976SWEET393-396.pdf
19. Cannell M.G.R., Bowler K.C. 1978. Spatial arrangement of lateral buds at the time that they form on leaders of *Picea* and *Larix*. *Canadian Journal of Forest Research* 8(1):129–137. https://cdnsciencepub.com/doi/10.1139/x78-021
20. Cannell M.G.R., Bowler K.C. 1978. Phyllotactic arrangements of needles on elongating conifer shoots: a computer simulation. *Can. J. For. Res.* 8:138–141. https://doi.org/10.1139/x78-022
21. "Needle and bud scale development in *Picea abies*." 2024. *Trees* 38. https://link.springer.com/article/10.1007/s00468-024-02518-5
22. Kroon J. et al. 2008. Genetic and environmental variation of internodal and whorl branch formation in a progeny trial of *Picea abies*. *Scandinavian Journal of Forest Research* 23(4). https://www.tandfonline.com/doi/abs/10.1080/02827580802249118
23. "Retrospective analysis of tree architecture in silver fir (*Abies alba* Mill.)." 2012. *Annals of Forest Science* 69. https://link.springer.com/article/10.1007/s13595-012-0188-1
24. "Polycyclism and phenological variability in the common oak (*Quercus robur* L.)." https://cyberleninka.org/article/n/1265349
25. Chuine I. 2000. A unified model for budburst of trees. *Journal of Theoretical Biology* 207(3):337–347. https://www.sciencedirect.com/science/article/abs/pii/S0022519300921787
26. Delpierre N. et al. 2016. Temperate and boreal forest tree phenology: from organ-scale processes to terrestrial ecosystem models. *Annals of Forest Science* 73:5–25. https://link.springer.com/article/10.1007/s13595-015-0477-6
27. Uggla C., Moritz T., Sandberg G., Sundberg B. 1996. Auxin as a positional signal in pattern formation in plants. *PNAS* 93:9282–9286. https://www.pnas.org/doi/pdf/10.1073/pnas.93.17.9282
28. Baba K. et al. 2011. Activity–dormancy transition in the cambial meristem involves stage-specific modulation of auxin response in hybrid aspen. *PNAS* 108(8):3418–3423. https://www.pnas.org/doi/10.1073/pnas.1011506108
29. Kvaalen H., Johnsen Ø. 2008. Timing of bud set in *Picea abies* is regulated by a memory of temperature during zygotic and somatic embryogenesis. *New Phytologist* 177. https://nph.onlinelibrary.wiley.com/doi/10.1111/j.1469-8137.2007.02222.x
30. "Primordium initiation drives tree growth." 2017. *Annals of Forest Science* 74. (WARN: full text unreachable.) https://link.springer.com/article/10.1007/s13595-016-0612-z
