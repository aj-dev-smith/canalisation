# The cambium and wood as memory — literature brief

Prepared 2026-08-16 for Canalisation. Flags: **[D]** demonstrated in the cited paper ·
**[I]** inferred/asserted but not shown · **[OURS]** my construction, in no paper ·
**WARN** contested, or primary source unreadable and the claim rests on a secondary
summary.

The engine's current radius rule is `r = f(current auxin traffic)`, Murray exponent 3,
fully reversible. This brief asks what the literature would let us replace it with. The
short answer, stated up front so the rest can be checked against it:

> **Auxin sets the SIZE of the radial increment. Mechanics sets its DISTRIBUTION along
> the stem. Neither is currently in the engine's radius rule, and the second one is
> nearly free because `39a_stem.js` already computes a bending moment at every station.**

---

## 1. How cambial activity is actually controlled

### 1.1 The Uggla result, stated precisely — it is a WIDTH law, not a rate law

Uggla, Mellerowicz & Sundberg (1998, *Plant Physiology* 117:113–121) cryosectioned Scots
pine cambia at 30 µm resolution and ran GC-MS on each section. This is the paper the
whole "radial auxin gradient" story rests on. What it found: [D]

- A steep radial IAA concentration gradient exists across the cambial zone, peaking in
  the dividing cells and falling off sharply toward both differentiating xylem and
  phloem.
- **The correlation between IAA concentration in the dividing cells and cambial growth
  rate was poor.** The highest concentration was in the fastest cambia, but concentration
  did not predict rate.
- **The radial WIDTH of the gradient correlated strongly with growth rate.**

Their interpretation is positional signalling: gradient width sets *how many cell files
deep the dividing zone is*, and the number of dividing cells is the dominant term in
cambial growth rate. This is a fundamentally different claim from "more auxin, faster
growth", and it is the one the data supports.

Uggla, Magel, Moritz & Sundberg (2001, *Plant Physiology* 125:2029–2039) followed the
same cambia through the earlywood→latewood transition and got the sharpest version of
it: [D]

- Total IAA supplied to cambial tissue stayed **fairly constant** across the transition.
- **Peak IAA concentration rose.**
- The radial width of the IAA distribution **narrowed, in lockstep with the narrowing of
  the combined cambial + expansion zone.**
- Sucrose showed no major seasonal variation (100–400 µg cm⁻² in phloem, falling steeply
  across the cambium). The only consistent enzymatic change was sucrose synthase in
  secondary-wall-forming tracheids (200–400 pkat cm⁻²).
- Their conclusion on latewood: **not metabolically triggered.** "It is the duration and
  not the rate of wall material deposition that causes the thicker cell walls of the
  latewood tracheids", and the factor inducing cessation of division "remains to be
  identified."

So a constant auxin supply spread over a shrinking zone produces a rising peak and a
falling growth rate. If you model concentration you get the sign backwards.

### 1.2 Does "the cambium integrates the auxin traffic passing it" survive?

Partly, and it survives better than the concentration version — but nobody has measured
it.

**For:** Most IAA in the cambium and developing xylem is supplied by polar auxin
transport, not local synthesis [D, Sundberg's group, reviewed in Bhalerao & Fischer 2014,
*Physiologia Plantarum* 151:43–51]. A gradient maintained by through-flux is a flux
object, and the width of a transport-maintained gradient scales with the flux driving it
[I].

**Against, and this is serious:**

- Nilsson et al. (2008, *Plant Cell* 20:843–855; commentary "Probing the Role of Auxin in
  Wood Formation", *Plant Cell* 20:822) found that **expression of most auxin-responsive
  genes had limited correlation with auxin concentration** — maturing xylem cells have
  *lower* auxin than cambial cells yet express auxin-responsive genes *more* strongly.
  Their proposal is that cells respond to *changes* in auxin rather than absolute level.
  [D]
- Smetana et al. (2019, *Nature* 565:485–489) put the auxin **signalling** maximum on the
  xylem side of the Arabidopsis cambium, where it specifies a **quiescent organizer**,
  not the dividing stem cells. High auxin signalling → cellular quiescence, via HD-ZIP III
  through MONOPTEROS/ARF5. [D] This inverts the naive "auxin drives division" reading.
- A 2024/25 *Frontiers in Plant Science* review of cambial phytohormones states the
  paradox plainly: "the maximum reactivity of auxin is not co-located with the maximum
  concentration of auxin." [D on the state of the field]
- Dormancy is the cleanest falsification of a pure auxin rule. An endodormant cambium
  becomes **insensitive** to growth-promotive signals; auxin content is not what changes.
  Localised heating of dormant *Cryptomeria*, *Larix* and *Quercus* stems reactivates
  division **in the heated zone only**. [D, reviewed in Ražanská/Frontiers 2024 and in
  *J Exp Bot* 68:79 "Environmental and hormonal control of cambial stem cell dynamics"]
  **WARN**: I read these through reviews, not the primary heating papers.
- **The decisive negative, and it should be quoted verbatim in our docs.** Eckes-Shephard,
  Ljungqvist, Drew, Rathgeber & Friend (2022, *Front. Plant Sci.* 13:837648), reviewing 17
  wood-formation models 1968–2020: *"No specific concentration threshold has yet been
  identified that can delineate zone widths, or no auxin-concentration dependent
  growth-rates have been measured, two fundamental assumptions of most of these models."*
  [D]

**Verdict:** "The cambium integrates the auxin traffic passing it" is **[I], unfalsified,
and the least-bad available mechanism** — but it must be wired as *flux → width of the
dividing zone → number of cells produced*, not *concentration → growth rate*. No paper
demonstrates a flux-dependent cambial growth rate; if we build one it is **[OURS]** and
should be labelled so, exactly like `chi` in `15_pathogen.js`.

### 1.3 A working cambium model with no auxin in it at all

Lebovka et al. (2023, *eLife* 12:e66627) is the strongest recent counterexample to
auxin-centrism. A cell-based VirtualLeaf model of Arabidopsis cambium containing
**PXY/CLE41 receptor–ligand signalling and differential cell-wall stiffness, and no
explicit auxin**, reproduces bidirectional xylem-in/phloem-out production, stable radial
subdomains, and tissue proportions (24% cambium, 10% xylem, 65% phloem) across five
independent parameter sets. [D]

The finding that matters most to us: **periclinal division orientation — the thing that
makes radial files at all — required mechanical constraint.** Without differential
stiffness, division orientation "was almost random". [D] Cambium stem cells were assigned
roughly half the wall stiffness of surrounding tissue.

---

## 2. Published models: what goes in, what falls out

| Model | Inputs | Outputs | Auxin? |
|---|---|---|---|
| **Vaganov–Shashkin (VS)** | soil moisture, temperature, daylength | ring width index, cell production, cell size | daylength stands in for "carbohydrate *or* hormonal signal" |
| **VS-Cambium-Developer** (2023) | same, no year-to-year recalibration | cell production + intra-seasonal radial cell development | no |
| **Drew's CAMBIUM** (2010) | xylem water potential, temperature, carbohydrate, hormone | cell production, enlargement, thickening, vessel frequency in *Eucalyptus* | yes — canalization hypothesis + Uggla radial distribution |
| **Deleuze & Houllier** (1997 *Silva Fennica* 31; 1998 *J Theor Biol* 193) | temperature → production; soil moisture → enlargement; carbohydrate → wall thickening; weekly steps | wood density profiles, ring width **distributed along the stem** | no — a 1-D reaction–diffusion carbon transport along a continuous cambial sink |
| **Hartmann XyDyS** (2017 *Ann For Sci* 74) | one morphogen, explicit diffusion, 1-D radial file | zonation + radial growth ✔; **final cell-size profile ✘** | yes, and it fails |
| **Hartmann XyDyS2** (2021 *J Exp Bot* 72:1727–1737) | two signals — a division signal D (TDIF or cytokinin) and auxin — with **seasonally prescribed boundary concentrations** | earlywood→latewood emerges; cell size ∝ auxin peak height at the moment a cell stops dividing | yes |
| **Cartenì et al.** (2018 *Front Plant Sci* 9:1053) | seasonal sugar availability; water non-limiting | full ring profile emerges | **no — explicitly** |
| **Kramer** (2001 *J Theor Biol* 208:387–397) | IAA in the cambial region coupled to fusiform initial orientation | two nonlinear ODEs; grain patterns at knots, wounds, branch junctions | yes |
| **Lebovka et al.** (2023 *eLife* 12:e66627) | PXY/CLE41, phloem factors, wall stiffness | bidirectionality, radial files, subdomains | no |

Three things to take from that table.

**(a) The pure-morphogen route was tried and it hit a wall.** Hartmann et al. (2017)
showed a morphogenetic gradient **can** control radial growth and zonation but **cannot**
explain the final cell sizes in the ring. Their 2021 fix needed a second signal *and*
externally imposed seasonal boundary conditions. [D] Seasonality is never emergent in any
of these models.

**(b) Cartenì et al. (2018) is the existence proof that you do not need auxin for a
ring.** With sugar availability alone — low early (slow wall deposition, long
enlargement, big thin cells), high late (short enlargement, thick walls) — the model
produced tracheid lumen radial diameter falling **42.9 → 2.8 µm** in *Larix decidua*,
wall thickness rising **2.7 → 7.6 µm**, enlargement durations **3.9–19 days**, and
latewood percentages **0.9–57.8%** matching observation. They conclude "spatial gradients
are not strictly necessary for the emergence of the typical tree-ring patterns observed
in conifers." [D] **This is the single most useful modelling result in this brief for our
purposes**, because it says the ring is a *duration* phenomenon driven by an
*environmental* rhythm — precisely the permitted category.

**(c) Deleuze & Houllier is the only model here that answers "how much wood at THIS
height".** Everything else solves one radial file. Their 1-D reaction–diffusion along the
cambium as a continuous sink is the published alternative to the pipe model for
*distributing* increment along a stem — and Lehnebach et al. (2018) note it **failed to
predict the sharp increment at the trunk base of butt-swelled trees**, "suggesting a
mechanical signal might interfere with a simple carbon diffusion principle". [D]

---

## 3. Earlywood/latewood and rings

Three competing hypotheses, none settled (Eckes-Shephard et al. 2022): **H1** environmental
limitation (water stress), **H2** carbon availability rising toward season end,
**H3** anticipatory daylength/hormonal signal. The review's verdict is that a universal
framework "would have to accommodate both physical and tree-internal regulatory
mechanisms". [D]

What the data constrain:

- Latewood is **not** switched by running out of auxin — total IAA is constant across the
  transition (Uggla et al. 2001). [D]
- Latewood is **not** metabolically triggered — it is *duration* of wall deposition, not
  rate (Uggla et al. 2001). [D]
- Radial growth is **turgor-limited**, not photosynthesis-limited, in mature conifers.
  Peters et al. (2021, *New Phytologist* 229:213–229) fitted a Lockhart-type turgor-driven
  growth model to *Picea abies* and *Larix decidua* along an elevational gradient,
  matching observed timing and dynamics of wood formation, with cambial activity strongly
  inhibited below **−1 MPa** stem water potential. [D]

**Could rings emerge from a seasonal forcing plus the cambium rule alone?** Yes, and this
is well supported. [D via Cartenì 2018 and Hartmann 2021, [I] for our specific
implementation.] Both models get earlywood→latewood out of a *temporal* modulation with
no ring boundary anywhere in the code. Neither generates the season itself: it is a
prescribed boundary condition in both. For Canalisation that is the correct division —
season is environment, same category as `37_wind.js`, and the ring is what the tissue
does to it. **What must NOT be imposed is the transition;** what must be imposed is a
scalar clock.

---

## 4. Irreversibility — is radius an integral of flux?

This is the question with the cleanest answer in the brief.

**The literature statement you want** is in Lehnebach, Bossu, Panayotov et al. (2018,
*Annals of Botany* 121:773–795, "The pipe model theory half a century on: a review"),
p. 814: *"Secondary growth is a cumulative process in which the diameter increases or
stagnates but cannot reduce, whereas leaf area may increase or decrease."* [D — as a
statement of anatomical fact; the review states it in passing rather than deriving it,
so it is best read as textbook-grade rather than as that paper's result.]

That is exactly the engine's bug written as a sentence. Our radius is a function of a
quantity (`leaf area`/traffic) that the same review says can go both ways, while the
thing it produces cannot.

**The published mechanism is Shinozaki's own, and it is usually skipped.** Shinozaki,
Yoda, Hozumi & Kira (1964a,b, *Japanese Journal of Ecology* 14:97–105 and 133–139)
introduced **disused pipes**: a pipe serves a unit of leaf area, and when that leaf or
branch is shed the pipe is *not removed* — it accumulates at the centre of the stem.
"The successive accumulation of disused pipes in the trunk is associated with the progress
of tree growth." [D as their stated model] So the pipe model has always had the memory
term; the engine implements only the active half.

**Minimal defensible accumulation law.** [OURS, assembled from the above]

```
r(t+dt)² = r(t)² + max(0, k · Φ(t)) · dt          # area, not radius, accumulates
```

with `Φ(t)` the current auxin (or carbon) traffic at that station. Cross-sectional **area**
is the additive quantity in every pipe-model formulation — a ring of given thickness adds
more area at large radius — so integrating `r` directly is dimensionally the wrong move.
Equivalent statement: current traffic sets the **ring width**, and radius is the running
sum of rings. Reversibility disappears for free, and the 68.2% collapse on leaf-stripping
becomes a *stalled* radius instead of a shrinking one.

**Supporting formalism:** Valentine (1985, *J Theor Biol* 117:579–585) derives basal-area
growth rate from the pipe model by partitioning the tree into pipes in steady-state
growth, i.e. basal area growth as an aggregate over pipes — an area-accumulating
formulation, not a radius-setting one. [D]

**Two honest caveats.**

1. Lehnebach et al. flag a real ambiguity in the original: "it is not explicitly stated
   whether pipes can be reused in two successive years or not" (p. 776). The pipe model
   is not as clean an accumulation law as it is usually quoted to be. [D]
2. The constant leaf-area:sapwood-area ratio the engine implicitly assumes is **not
   species-constant**. It varies within crowns, falls with tree size, and varies with
   site fertility, VPD and stand density (Lehnebach et al. 2018, pp. 794–799, citing
   Mäkelä & Vanninen 2001, Magnani et al. 2000, McDowell et al. 2002, Delzon et al. 2004).
   Specific leaf area alone can vary **2×** between crown top and bottom. [D]

**What nobody has published:** a wood-formation model in which the radius is explicitly
the time-integral of a *local auxin flux*, with an irreversibility constraint, running on
a whole simulated tree. VS, CAMBIUM, XyDyS and Cartenì all solve one radial file; the pipe
model and Deleuze–Houllier distribute increment but have no cambial mechanism. That gap
is real, and building in it is defensible novelty rather than reinvention. [I]

---

## 5. What actually distributes radius along a stem — the strongest finding here

The engine's trunk is a barrel. The literature says the reason is that nothing mechanical
is distributing the increment.

**Dlouhá, Ningre, Fournier, Constant and Dongmo Keumo Jiazet (2022, *Annals of Forest
Science* 79)**, "No matter how much space and light are available, radial growth
distribution in *Fagus sylvatica* is under strong biomechanical control". 40 pole-sized
beech; half the plot thinned; within each sub-plot half the trees **guy-wired to remove
mechanical stimulation** of the lower stem. Results: [D]

- Removing mechanical stimulation **decreased volume increment in the lower stem and
  radial root growth, and did not affect axial growth**.
- **Ring width distribution along stem height changed drastically to an "ice-cream
  cone"-like distribution** — i.e. without mechanosensing, the stem stops being a stem.
- **Mechanical stimulation explains more than 50% of the increment stimulated by
  thinning**, on every growth indicator.

**WARN**: I could not open the full text (Springer 403); the author line, the volume and
the quoted results come from the journal's own abstract as returned by search, so treat
the author order and article number as unverified.

The quantitative law for this already exists. **Coutand & Moulia (2000, *J Exp Bot*
51:1825–1842)** and **Coutand et al. (2009, *Plant Physiol* 151:223–232)** established the
**Sum of Strain-Sensing model (S3m)**: plants sense *strain*, not force or stress; only
amplitude matters, not sign (tension and compression are equivalent); and the integrated
signal is the strain summed over the **strained volume**. Coutand et al. 2009 showed the
integral of longitudinal strain over responding tissue is highly correlated with both
diameter growth response and *PtaZFP2* transcript abundance — the model, previously
established for elongation, transfers to diameter growth and to gene expression. [D]

Numbers, from Moulia, Coutand & Fournier-Leblanc (2015, *Front Plant Sci* 6:52): [D]

- The dose–response is **logarithmic, not linear**; a log fit explains **72%** of the
  overall response.
- Sensitivity extends to **~1% strain inducing a transient 200-fold increment in
  *Pta-ZFP2* transcription**, with linear sensing well beyond the elastic range, to ~5%
  strain.
- After a single bending: elongation stops for hours (recovery **100–1000 min**), while
  **secondary growth is stimulated ~+0.35 mm diameter over 3 days, then decays to control
  over the next 3–4 days**. The secondary-growth stimulation is roughly **30×** the
  initial inhibition.
- Secondary growth integrates strain "on a one-cell thick cross-section" — i.e. the
  response is **local to the station**, which is what we need.

Trees also **filter** the wind signal rather than integrating it raw: Bonnesoeur et al.
(2016, *New Phytologist* 210:850–860, "Forest trees filter chronic wind-signals to
acclimate to high winds") — **WARN**, 403, title and framing only.

**Relation to the alternatives we have already rejected.** The "uniform stress"
/ adaptive-growth axiom (Mattheck) makes the same prediction from the other end:
stems taper so that bending-plus-axial stress is equalised along the length, and measured
height–diameter profiles fit uniform-stress profiles well; diameter is predictable from
bending moment by a simple power function where E is roughly constant (Dean et al. 2002,
*Trees* 16, evaluating North American conifers; Morgan & Cannell re-examination,
PMID 14967633). [D] It is contested as an *axiom* — Slater (2016) argues the veracity of
uniform stress is not supported and points to contradictory work on strain responses and
dynamic wind movement. [D as a published dissent]

For us the distinction is unimportant and worth stating: **S3m is a local mechanism with
a measured dose–response; uniform stress is a global optimality statement.** The one rule
in `CLAUDE.md` forbids the second and permits the first. Adding "cambial increment at a
station is proportional to the log of the integrated strain that station experienced" is
a *local physics* term, in the same category as `39_fall.js`. Adding "taper the stem until
stress is uniform" would be drawing a shape.

---

## 6. Heartwood — a 2.88 m sapling does not need it

- Heartwood onset in *Pinus sylvestris* is reported at **9–20 years**, though a recent
  IAWA study notes systematic study of initiation age had not previously been done
  (**WARN**, Brill 403, secondary summary only).
- Onset is a **diameter/size** threshold more than an age one; faster-growing stems form
  heartwood earlier (Sellin 1994, *Can J For Res* 24, *Picea abies* — **WARN**, 403,
  abstract via search). Sapwood **width** becomes roughly constant once a tree is
  established (~7.8 cm dominant, ~2.0 cm suppressed *Picea abies*).
- The best current mechanism is **hydraulic obsolescence, not age**: the sapwood→heartwood
  transition is set when an inner ring adds **<0.3%** to cumulative conductance, and
  depends on tree height H and height growth rate ΔH; taller trees keep more sapwood
  rings; trees studied spanned **2–64 m**, conduit widening exponent **b = 0.14–0.23**
  (*J Exp Bot* 74(17):5072, 2023 — **WARN**, author line unresolved).

**Verdict for the engine: skip it.** At 2.88 m the specimen sits at the very bottom of the
2–64 m range, and Lehnebach et al. (2018, p. 804) warn that disused pipes are
"often confused with" heartwood — they are not the same thing. What we want from
heartwood — a stem core that no longer participates — is already delivered by the
accumulation law in §4, which is why that law is the cheap version of this whole section.

---

## 7. Recommendations, ranked, with what class of quantity each fixes

1. **Accumulation (§4). Fixes SIZE + memory.** `r² += max(0, k·Φ)·dt`. One line, one
   published sentence under it, kills the 68.2% reversibility bug. `EI ∝ r⁴` so
   `test/stem.mjs` is mandatory.
2. **A mechanosensing term (§5). Fixes SHAPE — the barrel.** Increment at a station gains
   a term in `log(1 + integrated strain)`. The engine already has the wind field and the
   per-station bending moment; this is the highest ratio of published support to new code
   in the brief, and it is the only thing in the literature demonstrated to control the
   *along-stem distribution* of radial growth. It also makes trunk taper a function of
   the weather, which is a genuinely new coupling for the piece.
3. **Auxin as zone WIDTH, not rate (§1).** If §1's mechanism is kept, wire flux to the
   number of dividing cells. Do not wire concentration to growth rate — Uggla 1998 says
   that specific thing does not work.
4. **Rings, if and only if a season lands (§3).** Modulate cell *duration*/size, not a
   ring boundary. Cartenì et al. is the template and it needs no auxin.
5. **Heartwood: no.** Wrong life stage; §4 already supplies what it would buy.

### What the literature does not have, and we should not pretend it does

- No measured auxin-concentration-dependent cambial growth rate, and no concentration
  threshold that delineates zone widths (Eckes-Shephard et al. 2022, verbatim). Any
  auxin→radius transfer function we write is **[OURS]**.
- No model in which stem radius is the life-integral of a local auxin flux on a whole
  tree.
- No emergent season anywhere. Every ring model imposes the clock.
- Auxin **signalling** and auxin **concentration** peak in different places, and the
  signalling peak marks quiescence (Smetana et al. 2019). Anyone who writes "more auxin,
  more division" into this engine should be pointed at that paper first.

---

## Sources

1. Uggla C, Mellerowicz EJ, Sundberg B (1998) *Plant Physiology* 117:113–121.
2. Uggla C, Magel E, Moritz T, Sundberg B (2001) *Plant Physiology* 125:2029–2039.
3. Bhalerao RP, Fischer U (2014) *Physiologia Plantarum* 151:43–51.
4. Nilsson J et al. (2008) *The Plant Cell* 20:843–855; commentary *Plant Cell* 20:822.
5. Smetana O et al. (2019) *Nature* 565:485–489.
6. Mähönen AP group (2025) *PNAS* 122, doi:10.1073/pnas.2511087122 (**WARN**, 403; title
   and framing from search only).
7. Kramer EM (2001) *Journal of Theoretical Biology* 208(4):387–397.
8. Eckes-Shephard AH, Ljungqvist FC, Drew DM, Rathgeber CBK, Friend AD (2022)
   *Frontiers in Plant Science* 13:837648.
9. Hartmann FP, Rathgeber CBK, Fournier M, Moulia B (2017) *Annals of Forest Science* 74.
10. Hartmann FP et al. (2021) *Journal of Experimental Botany* 72(5):1727–1737.
11. Drew DM et al. (2010) CAMBIUM model — via ref. 8.
12. Deleuze C, Houllier F (1997) *Silva Fennica* 31:239–249; (1998) *J Theor Biol* 193.
13. Vaganov–Shashkin model and VS-Cambium-Developer (2023) — via ref. 8 and PMC10609909.
14. Cartenì F, Deslauriers A, Rossi S, Morin H, De Micco V, Mazzoleni S, Giannino F (2018)
    *Frontiers in Plant Science* 9:1053.
15. Lebovka I, Hay Mele B, Liu X, Zakieva A, Schlamp T, Gursanscky NR, Merks RMH,
    Großeholz R, Greb T, Wabnik K (2023) *eLife* 12:e66627.
16. Lehnebach R et al. (2018) *Annals of Botany* 121(5):773–795.
17. Shinozaki K, Yoda K, Hozumi K, Kira T (1964a,b) *Japanese Journal of Ecology*
    14:97–105, 133–139.
18. Valentine HT (1985) *Journal of Theoretical Biology* 117:579–585.
19. Coutand C, Moulia B (2000) *Journal of Experimental Botany* 51(352):1825–1842.
20. Coutand C et al. (2009) *Plant Physiology* 151(1):223–232.
21. Moulia B, Coutand C, Fournier-Leblanc N (2015) *Frontiers in Plant Science* 6:52.
22. Dlouhá J, Ningre F, Fournier M, Constant T, Dongmo Keumo Jiazet JH (2022)
    *Annals of Forest Science* 79 (**WARN**, 403; abstract via search).
23. Bonnesoeur V et al. (2016) *New Phytologist* 210:850–860 (**WARN**, 403).
24. Dean TJ et al. (2002) *Trees* 16:559–568; Slater D (2016) argument against the axiom
    of uniform stress; Morgan & Cannell, PMID 14967633.
25. Peters RL et al. (2021) *New Phytologist* 229(1):213–229.
26. *Journal of Experimental Botany* 74(17):5072 (2023), sapwood→heartwood hydraulic
    transition (**WARN**, author line unresolved).
27. Sellin A (1994) *Canadian Journal of Forest Research* 24 (**WARN**, 403).
28. *Frontiers in Plant Science* (2024/25), "Phytohormones involved in vascular cambium
    activity in woods", doi:10.3389/fpls.2024.1508242.
29. Buttò V et al. (2025) *New Phytologist*, doi:10.1111/nph.20390 (**WARN**, 403; framing
    from search only).
