# A real tree — literature sweep, 2026-08-16

**The question asked:** the conifer works and it is not a tree — "a plant pretending to
be a tree." Papers first: what does published biology say a REAL tree needs, how much of
it can be expressed as local chemistry, physics, or environment rather than drawn shape,
and is it a separate engine?

**Provenance.** Eight independent literature sweeps (cambium/wood, season/dormancy,
reaction wood/posture, mechanosensing/taper, architecture models/timescale, light,
hydraulics/allometry, auxin in woody shoots) plus two adversarial critique passes — one
hunting for smuggled shape priors, one ranking feasibility against the engine as it
stands. Roughly 200 sources. The full briefs are in
[research_8_16_26_tree/](research_8_16_26_tree/) and carry their own source lists; this
document is the synthesis and the ranking. Every sweep was primed with the project's own
falsifications (the flux partition, gravity-held branches, memoryless apical control, the
Murray exponent) so nothing dead is re-proposed here.

Flags, as in [research_7_30_26.md](research_7_30_26.md), and they are load-bearing:

- **[D]** demonstrated — the cited paper shows this directly
- **[I]** inferred — asserted by the authors, or follows from cited facts, but not shown
- **[OURS]** our construction (or a brief's). Not in any paper. Test it before trusting it.
- **⚠** contested, or the primary source could not be read

---

## Executive summary — nine findings

**1. VERDICT: SAME ENGINE. Across ~200 citations, not one mechanism asks for a change to
`stepAuxin`.** Several say explicitly *do not* reach for auxin: compression wood is not an
auxin asymmetry (measured directly in pine — Hellgren et al. 2004 [D]); bud release is not
auxin (the signal is 50–100× too fast — Mason et al. 2014 [D]); no auxin-concentration-
dependent cambial growth rate has ever been measured (Eckes-Shephard et al. 2022, verbatim
[D]). What the literature asks for instead is more **physics** (a strain rule, a curvature
rule), more **environment** (a clock, a light field), and **memory** (monotone
accumulators) — the three categories the engine already has homes for: `39a_stem.js`,
`37_wind.js`, and `Axis.rest`. The one honest case for a separate path — decades, 30 m,
visible rings, self-pruning in a closed stand — requires yearly steps and GreenLab-style
factorisation, and that engine provably cannot have real weather or two-way light. **The
trade is: a grown tree, or a tree in weather. This project chose the second years ago,
and every mechanism below is compatible with it.**

**2. THE ENGINE HAS A METRE AND NO SECOND, and that is the largest prior found — it is
not in any mechanism, it is a missing clock.** `WORLD.unitM` fixed the metre once and
everything derives from it; there is no equivalent for time, and every tree mechanism
carries a real time constant (strain accommodation 7 d, reaction-wood latency 7 d,
free-running flush 18–37 d, a season 365 d). The eight briefs each privately invented a
steps↔days conversion and they disagree by **~130×** — and two of them back-solved the
same ~250-step oscillator period from biologies 18× apart, because both were really
solving for "about 24 whorls." That is a count, tuned to look right. **Name one constant
(`WORLD.stepDays` or per-species), book it beside `L` in SCIENCE.md's debt list, derive
every timescale from it — and the whorl count becomes a prediction.** If it comes out 3
or 40, report it, exactly as phyllotaxis reports 90–160° instead of forcing 137.5°.
Kill criterion: if `stepDays` must vary >~20× across the catalogue to keep every species'
size consistent with its literature age, it is not a physical quantity — drop it and
accept that every imported time constant is [OURS].

**3. THE BARREL, EXPLAINED IN ONE LINE: Murray-3 on foliage traffic and constant stress
under a point load at the very top predict the SAME profile, d ∝ x^⅓.** [OURS], built on
Dean & Long 1986 [D]. The exponent was never the problem — the *moment* was, because
traffic has no lever arm. The published fix is the S3m strain rule (Coutand & Moulia:
plants sense strain, not stress — tested head-to-head, stress gave *no relationship*
[D]): `dr/dt = k·max(0, Ŝ − S₀)` per station, with Ŝ a running high quantile of |ε| =
M·r/EI, which the bend solver already computes. Its fixed point is uniform strain →
`r³ ∝ M` → Dean's measured δ = 0.313–0.333 across nine conifers [D]. **The `max(0,·)` is
a cambium — irreversibility is not a second mechanism, it is the same term** — so this
one line closes the 68.2%-reversibility gap AND retires `fruitFlow` (a terminal fruit
enters as a moment with a lever arm, which is what a fruit is, instead of an unswept 48×
flow constant). The causal evidence is the cleanest in the whole sweep: guyed pines lose
their taper and regain it when released (Jacobs 1954 [D]); guy-wiring beech changed ring
distribution "drastically to an ice-cream-cone" and mechanics explains >50% of increment
(Dlouhá et al. 2022 [D]⚠); nobody has published a growth simulation where taper emerges
from strain-sensing on a turbulent wind field — the engine is positioned to be first.

**4. REACTION WOOD IS ONE EQUATION WITH ONE MEASURED CONSTANT, AND IT IS THE MOST
ENGINE-SHAPED RESULT IN THE SWEEP.** `dC/dD = −4·Δα·f/D²` (Alméras et al. 2018, Eq. 24
[D]), conifer Δα ≈ 2500 µstrain [D]. The `D⁻²` makes thin young axes agile and thick old
ones frozen — **90× more motricity in a 1 cm branch than the 9.5 cm trunk** — and
integrating it gives a *lifetime curvature budget*, `|ΔC|max = 4Δα/D₀`: an axis that
starts reacting at 5 mm has 57° of correction available, ever; at 20 mm, 14°. "A branch
that does not fix its posture while thin never will" — a shape-generating,
history-dependent law with zero shape in it [OURS, corollary of Eq. 27]. Three
constraints: it is **not** auxin (Hellgren 2004 [D] — the one place our chemistry would
be the wrong answer); the side is derivable from the statocytes we already run (Gerttula
2015 [D], *Populus*; ⚠ no conifer-cambium equivalent exists); and the sign flips to the
upper side at **7–12° from vertical** (Archer & Wilson 1973 [D]) — which calibrates the
proprioceptive term for free (see finding 8). It strictly requires monotone D: with a
reversible radius, ΔD < 0 and a branch straightens itself when a leaf drops. **This does
not re-open `test/plagio.mjs` — plagio measured a structure with a load and no motor;
this supplies the motor, as a rate.**

**5. THE ENGINE HAS GROWN A FOXTAIL, AND THAT IS A DOCUMENTED PHENOTYPE WITH A DOCUMENTED
CAUSE.** Branchless pine stems 6–12 m, up to **40% incidence** in aseasonal lowland
tropics, suppressed wherever a dry season exists (Kozlowski & Greathouse [D]); Lanner
1966 [D]: one foxtail ran **5 years of continuous growth — no whorls, no rings, all
earlywood, in the same specimen**. Aseasonality removes whorls and rings *together*, which
is ROADMAP 0z1 and 0z2 sharing one clock, confirmed from the field side. The minimal
signal is **one scalar** — day length, with a per-species critical night threshold that
is genuinely bracketed (2–3 h Arctic to 7–10 h Romanian *Picea abies*, Gyllenstrand 2007
[D]) — gating elongation while organ founding continues. The primordium queue **is**
preformation, the central fact of conifer shoot growth (next year's shoot length is
written the previous summer [D]); the whorl arrangement then falls out of
inhibition–competition on a compressed apex (Cannell & Bowler 1978 [D]) — which is
`stepAuxin` on a meristem sheet, i.e. already shipped. Fixing `minInternode`'s discard is
the biology, not a workaround. **⚠ One honest caveat for SCIENCE.md rather than hiding:
the rhythm is not purely environmental** — two pines set bud under continuous light
(Ekberg et al. [D]⚠), oak free-runs at 21–37 d unchanged by resource addition (Herrmann
2015 [D]), and a conifer "whorl" is a compressed helix, not a true whorl. **Nobody has
published a model deriving whorl spacing from primordium queueing — that result is
available to this project cheaply.** Kill criterion: gap CV must move UP through 1.0
toward √(k−1)≈2. Down means regularisation, and the mechanism is wrong.

**6. THE `dominance` FIELD IS A CHEMISTRY CLAIM THAT IS NOT CHEMISTRY, and the literature
supplies both the indictment and the replacement.** `exp(-d/dominance)` is the steady
state of transport-with-decay, so `dominance = v/k` — and with measured PAT velocities
(10–20 mm h⁻¹, AuxV database [D]) and any plausible IAA turnover, `v/k` = **0.7–8.7 cm**.
The girdling experiments bracket apical control at the same band: a girdle 2 cm below a
branch releases it, >20 cm never does (Wilson & Gartner 2002 [D]). Two independent routes
land in the same centimetre band [OURS — nobody has put them side by side]. Our crown
needs `dominance ≈ 6 units = 37.5 cm` — **10–100× beyond any defensible auxin length
scale** — and the woody literature's own review labels the summed-exp(-d) whole-tree
field "not experimentally demonstrated" [D]. Sharper: **epicormic buds break when the
tree's auxin is at its maximum** [D via review], which no auxin-inhibition field can
produce, and epicormics are held for 40+ years, which requires per-bud memory, not a
field. The replacements both escape the bottlebrush theorem legitimately (their history
lives in grown quantities, not in distance-below-apex): a **sink share** `aᵢ/Σaⱼ` for
which bud escapes (phloem moves at ~150 cm h⁻¹ — 1.9 h across our trunk vs auxin's 8
days; Mason 2014 [D]), and a **local export tax**
`growthᵢ = Pᵢ/(1 + κ∫S(x)e^{−(x−xᵢ)/λ}dx)`, λ ∈ [2, 20] cm [OURS, from Wilson & Gartner's
numbers — apical control has never been formalised, so any equation is [OURS] by
definition, in good company]. The export tax predicts a parabolic crown [OURS, untested].
**The honest likely outcome is that the λ measurement kills it at our scale — and that
negative would be `auxinwood`'s central claim confirmed on our own tree, publishable in
the same category as the four falsified senescence hypotheses.**

**7. LIGHT IS THE MISSING ENVIRONMENT, AND IT BUYS LESS FOR THE HERO THAN EXPECTED.**
Two expectation-setters, both from the literature and both unwelcome: **light gives no
whorls** (nothing connects a light field to branch spacing), and **a solitary 2.88 m
sapling will not self-prune** — crown recession is a stand phenomenon; open-grown
conifers keep branches to the ground, which our specimen already correctly does. What
light actually buys: **senescence order derived instead of imposed** (a blade dies when
its time-integrated light falls below a fraction of the specimen's own maximum — Sprugel
2002's relative rule [D]; never an absolute threshold, which on a solitary hero becomes a
crown-depth dial), retiring SCIENCE.md imposed item 6; crown recession in the garden;
and a photogravitropic set-point blend with a measured exponent (`A_R = A_P/(1+M)`,
`M = a·I^b`, b ≈ 0.36–0.44, R² 0.91 — Bastien et al. 2015 [D], ⚠ herbaceous). It is
two-way coupled — nearer `15_pathogen.js` than `37_wind.js`, since the plant makes its
own shade — and needs a CPU path for the thirteen headless harnesses (ray-bundle depth
map ≈ 221 ms per whole tree on a 2017 CPU [D]; voxel propagation is the Node fallback at
~14×; amortise every ~50 steps). **Pre-flight before any code: rank the arrested
conifer's blades by computed light and by age. If the orders match, light buys nothing
for senescence order on one specimen and the case collapses to the garden.** One
correction to carry back into our own docs: Borchert & Honda's original Q was **purely
endogenous** — the light-fed version is Pałubicki 2009, who say so verbatim [D]. Anywhere
our docs say the original was light-modulated is wrong.

**8. THE CROWN-SHAPE ANSWER EVERYONE POINTS AT IS STRUCTURALLY UNABLE TO AGE, AND THE
INSTRUMENT TO SEE A PARABOLA DOES NOT EXIST YET.** Four briefs independently converge on
Duchemin et al. 2018 — a crown as a propagating front, two dimensionless numbers,
validated against 36 photographs at d < 0.05 [D]. **Do not build it.** It contains an
explicit surface-tension smoothing term on an outline, no organs, no meristems — the
exact inversion of this project — and self-similar means scale-invariant means **no
ontogeny**: the one published memoryless model that yields a non-conical crown provably
cannot yield the excurrent→decurrent transition, which is the thing an old tree does.
(It also softens our "bottlebrush theorem" to its honest scope: memoryless multipliers
on distance-below-apex in a branching structure — Duchemin shows memoryless *front* rules
can make non-cones. The narrow form is the one our falsification proved.) The routes with
memory are the export tax (finding 6), per-branch hydraulic path length feeding turgor
(Ψ at a tip is a function of its own path length, not its height — demonstrated by
epicormic induction *reversing* basal conduit size, Bicego 2025 [D]; the feedback
"longer branch → lower turgor → slower extension, asymptote set by insertion height"
gives a concave envelope and **no paper builds it** [OURS]), and light. **And nothing in
the test suite reports the crown profile r(z)** — `crown.mjs` measures fill, `conifer.mjs`
measures half-angle and length taper, all green on a crown a person called wrong. Build
the ~40-line r(z) harness with a cone-residual before building any of the three
mechanisms, or success and failure will be indistinguishable.

**9. FOUR CHEAP THINGS THE SWEEP FOUND THAT DESERVE HEADLINES AND NEARLY GOT LOST.**
(a) **Ovalisation is free**: the strain rule per angular sector gives an elliptical
cross-section stiff against the prevailing wind — +38% diameter in the bending plane vs
+12% perpendicular, 16% ovalisation buying +212% rigidity, pith *not* eccentric (Roignant
2018, Niez 2019 [D]) — a coupling between the air and the form that nothing in the piece
has, with nothing drawn. (b) **Season as a competence gate reuses the pathogen operator**:
dormancy is a collapse of transport *capacity* with IAA barely moving (Baba 2011 [D]⚠) —
exactly the `comp` blend `15_pathogen.js` already ships, driven by a clock instead of an
infection (keep `comp` in [0,1]; below zero is the polarity inversion, a different
creature). (c) **Modulating `uRef` on the same clock turns an incoherence into latewood**:
an axis dormant through 250 steps of identical breeze contradicts a shipped number; wind
up in the same phase the cambium is competent = more strain-wood in that phase = **rings
by duration, Cartenì et al. 2018's exact mechanism [D], with no ring boundary anywhere in
the code**. (d) **"Physiological age" is already free**: the architecture literature's
per-meristem monotone state arrives as a side effect of any of the above — accumulated
wood area, spent curvature budget, cumulative strain, hydraulic path length. **Forbid the
name, use the physical quantity** — stated as an index it is AmapSim's "reference axis,"
a number that sets every parameter, which is the PRIOR category wearing a lab coat.

---

## Part 1 — Wood: the cambium, the taper, and memory

### 1.1 What actually controls cambial growth — a width law, not a rate law

The whole "radial auxin gradient" story rests on Uggla, Mellerowicz & Sundberg (1998,
*Plant Physiol* 117:113) [D]: a steep IAA gradient exists across the cambial zone, but
concentration in the dividing cells correlated *poorly* with growth rate — **the radial
WIDTH of the gradient is what correlates**. Uggla et al. 2001 [D] sharpened it across the
earlywood→latewood transition: total IAA constant, peak concentration *rising*, zone
narrowing, growth slowing. **Model concentration→rate and you get the sign backwards.**
Smetana et al. (2019, *Nature* 565:485) [D] go further: the auxin *signalling* maximum
marks a **quiescent** organizer, not the dividing cells. And the decisive negative, worth
quoting verbatim wherever the radius rule is documented — Eckes-Shephard et al. (2022,
*Front Plant Sci* 13:837648), reviewing 17 wood-formation models 1968–2020:

> "No specific concentration threshold has yet been identified that can delineate zone
> widths, or no auxin-concentration dependent growth-rates have been measured, two
> fundamental assumptions of most of these models."

So: **auxin traffic setting the SIZE of the radial increment is [I], unfalsified, the
least-bad mechanism, and best wired as flux → width of dividing zone.** Any transfer
function we write is [OURS], same category as `chi` in `15_pathogen.js`. Nilsson et al.
2008 [D] add that blocking auxin signalling reduces divisions while leaving the gradient
*intact* — the gradient is not the identity signal. Our Murray-on-traffic radii are auxin
setting a **size**, which is the best-supported thing in the codebase; nothing here asks
to change that half.

### 1.2 Irreversibility has a citable sentence, and the pipe model always had the memory term

Lehnebach et al. (2018, *Ann Bot* 121:773, p. 814) [D]: *"Secondary growth is a cumulative
process in which the diameter increases or stagnates but cannot reduce, whereas leaf area
may increase or decrease."* That is our 68.2% bug written as a sentence. Shinozaki's own
1964 formulation has **disused pipes** — shed a leaf and its pipe is not removed, it
accumulates in the trunk [D] — so the engine implements only the active half of the pipe
model. The minimal law is area-accumulating (`r² += max(0,k·Φ)·dt` — area is the additive
quantity; integrating r is dimensionally wrong) [OURS]. Aye et al. 2022 [D] is the same
bookkeeping fitted to five species at R² 84–99%: sapwood = pipes to live foliage,
heartwood = pipes whose foliage is gone.

**But do not build this as its own commit.** The feasibility critique's single largest
finding: the strain rule of §1.3 is *already* non-negative — **the `max(0,·)` IS the
cambium** — so building accumulation first means writing `updateRadii` twice. And one
trap [CODE]: `updateRadii` runs at least twice per plant step (once in `Axis.step`, once
from `stepBend`), and stations are not material (`pts` grows by append) — a naive `+=`
double-counts, and the accumulator must be keyed on material arc coordinate, not index.

**A second trap, and it reframes ROADMAP 0z2: wood memory is invisible in a normal run.**
`updateRadii` counts dying organs and nothing in the shipped life cycle ever removes
traffic from a station, so no station's radius ever falls during an ordinary life. The
68.2% collapse is only reachable by the leaf-stripping *experiment*. Memory is an
**enabler** (reaction wood cannot exist without monotone D), not a visual deliverable —
rank it accordingly or the commit will measure beautifully and show nothing.

### 1.3 The strain rule — the highest support-to-code ratio in the sweep

S3m (Coutand & Moulia 2000; Coutand et al. 2009; Moulia et al. 2015 [D]): plants sense
**strain amplitude** — sign discarded, tension ≡ compression; fitted head-to-head against
stress-sensing, stress gave *no relationship* [D]. The radial response is local to the
station and roughly linear in cumulative deformation (⚠ "linear" is the published verbal
claim; the primary slope was unreadable); elongation responds logarithmically and
*negatively* (a single bend halts it for 100–1000 min while stimulating diameter growth
+0.35 mm over 3 days [D]). Accommodation is real: ~7 days without stimulus to recover
full sensitivity (Martin et al. 2010 via Leblanc-Fournier 2014 [D]) — without it the
integral runs forever. Trees high-pass filter wind: acclimated beech respond only to
events with >1-week return period, i.e. storms (Bonnesoeur et al. 2016 [D]⚠).

The causal experiments are unusually clean: Jacobs 1954 (guyed *Pinus radiata* grow tall
and untapered; release the guys, taper returns) [D]⚠; Coutand et al. 2008 (staking a
wind-exposed tree does not restore the sheltered phenotype; bending a sheltered one
recovers the wind phenotype — mechanical stimulation, not "wind," is the cause) [D];
Dlouhá et al. 2022 (guy-wired beech: ring-width distribution collapses to an "ice-cream
cone"; mechanics explains >50% of thinning response) [D]⚠.

The closure is [OURS] and it is one term:

```
dr/dt = k · max(0, Ŝ − S₀)        Ŝ = running high-quantile |ε|, ε = M·r/(E·I)
```

Fixed point: uniform strain → uniform stress → `r³ ∝ M` — which is Dean & Long's measured
`D = φ·M^δ`, δ = 0.313 in *Pinus contorta*, 8/12 fits within ±10% of the predicted ⅓
across nine conifers (Dean et al. 2002) [D]. Uniform stress is contested as an *axiom*
(Niklas & Spatz 2000 measured stress varying 100× within one cherry [D]) and solid as an
*outcome for the stem below the crown* — and S3m is a local sensing law where uniform
stress is a global optimality statement: the one rule permits the first and forbids the
second. **Assert the taper against the closed form the rule predicts, and quote Dean as
independent agreement — never tune k or S₀ until δ lands on 0.33.** That is the
`test/tree.mjs` discipline, not the `crown.mjs` fill trap.

Three warnings that are ordering constraints:

- **Fix E first.** Under a strain rule `ε ∝ M/(E·r³)`, so a wrong modulus is a wrong
  *taper*, not just a wrong sway frequency — and the posture motor of Part 2 is `E·Δα`.
  E corrupts sway, taper and posture simultaneously. (The conifer already ships
  `eModulus: 1.2e9`; the herbaceous 60 MPa is `STEM_DEFAULTS`. Note `test/plagio.mjs`
  still *prints its verdict lines* off `STEM_DEFAULTS` while the species ships 1.2 GPa —
  and CLAUDE.md still quotes the retracted 16–268° framing. Both want correcting.)
- **The engine's wind is stationary** — there are no storms and there is no week, so
  Bonnesoeur's filter has nothing to filter and a running max over any window converges.
  Take the running max because it is cheap and correct; do not build return-period
  machinery.
- **`S₀` survives as a stated threshold.** No universal ε₀ exists — fitted per species in
  every S3m paper ⚠. It can be *anchored* by requiring the buckling safety factor
  H_crit/H ≈ 4 (Niklas 1994, 111 species [D]) at the shipped `uRef` — but say honestly
  that this is calibration against an interspecific outcome statistic, one rung below the
  LMA table that removed the falling blade's constant.

**Free consequence worth its own harness line:** per-angular-sector application of the
same rule gives ovalisation (finding 9a). The beam solver knows the bending plane.

### 1.4 Rings, and why they are last

Cartenì et al. 2018 [D] is the existence proof: full earlywood→latewood profiles (lumen
42.9→2.8 µm, latewood 0.9–57.8%) from seasonal sugar availability alone — **no auxin, no
gradient, no ring boundary in the code; the ring is a *duration* phenomenon under an
environmental rhythm.** Latewood is not auxin depletion (total IAA constant across the
transition [D]) and not metabolic rate (it is duration of wall deposition [D]). So rings
= wood memory + the clock + *a cross-section to look at* — and nothing in the four VIEWS
draws a section. Lowest-value item in eight briefs for this engine; noted so nobody
builds it first.

---

## Part 2 — Posture: reaction wood, the D⁻² collapse, and the sign to check first

### 2.1 The motor, with numbers

The engine's statocyte set point is the correct model of *where an axis wants to point* —
and the sweep found a genuine convergence: Roychoudhry et al. 2013's antigravitropic
offset, believed to share the statocytes with graviception (Kawamoto & Morita 2022 [D]),
*is* our upper-wall carrier, derived rather than stated. What the engine lacks is the
**only motor that still exists once elongation has ceased**:

```
σ  = sign( β·sin(A − A_set) + γ·C )        which side lays reaction wood
ΔC = −σ · 4·Δα·f · ΔD / D²                 what that ring buys      [Alméras 2018 Eq. 24, D]
```

Δα ≈ 2500 µstrain for a conifer (CW +2000, normal −500; Alméras & Clair 2016 [D] — the
−500 is stable enough across species that the field hardcodes it; ⚠ Δα is in no trait
database, so 2500 is representative, not species-specific, and CW's high MFA lowers its E,
so the motor is E·Δα — a softwood trades stiffness against motricity). ΔC accumulates into
`Axis.rest`, which is exactly the right home — "the shape growth actually produced."
Timescales are real and long: first movement in 3 days, righting over a season, basipetal,
and *"in Abies, almost no recovery occurred in the basal portion because of its large
diameter"* — the D⁻² law observed in one sentence in 1986 [D].

### 2.2 What it explains, and what it must reproduce

- **The Alméras & Fournier posture-control number**: PC ∝ E·Δα·D/(ρg·sinφ·H²); PC < 1 and
  the branch loses — the published answer to "what limits how big a branch can still
  right itself" [D].
- **The lifetime curvature budget** |ΔC|max = 4Δα/D₀ (143° from 2 mm, 14° from 20 mm)
  [OURS] — history-dependence with zero new state.
- **The proprioceptive flip**: CW moves to the upper side at 7–12° *before* vertical
  (Archer & Wilson 1973 [D]; confirmed at 10–20° across five species [D]). A pure sin
  rule overshoots and oscillates; the γ·C term reaching parity with β·sin is exactly a
  flip at a fixed angle — **so the measured flip angle sets β/γ, and Bastien's
  per-species fitted balance number never has to be imported.** Assert against 7–12° in
  the harness. This converts a parameter-at-risk into a calibrated one.
- **The AC model has no plagiotropic fixed point** (∂A/∂t = −β·sinA − γ·C is a
  straightening machine; steady state is vertical, full stop [D]/[OURS]) — which is why
  the set point + wood motor is the right architecture and a Bastien-style controller
  alone can never hold a branch out. Fusing them — the AC form with `A_set` from a
  statocyte flux balance — **appears to be genuinely unwritten. The engine is one term
  away from it.**

### 2.3 The hard negative and the ⚠ that outranks everything here

**Do not model compression wood as an auxin bump.** Hellgren et al. 2004 mapped IAA by
GC-MS across gravistimulated cambia in pine and aspen: *"reaction wood is formed without
any obvious alterations in IAA balance"* [D]. The classical application experiments
contradict their own concentration measurements [D via Groover 2016], and the
gravity-sensing cells are peripheral to the cambium, so applied auxin arrives at the
wrong tissue (Gerttula 2015 [D]).

**⚠ THE AUXIN/ANGLE SIGN MAY BE INVERTED, AND THE EXISTING VALIDATION CANNOT SETTLE IT.**
Roychoudhry et al. 2013 may have auxin sizing the *antigravitropic* offset — larger AGO,
larger GSA, more *horizontal* — the inverse of the shipped "more auxin, more vertical,"
which CLAUDE.md says flips the whole silhouette. The primary's figures were unreadable
this session and secondary summaries contradict each other. Crown half-angle 9.5° against
a spruce's 8–15° is a band 1.9× wide — a wrong sign fits inside it. **One careful read of
that paper's Figure 4, and a narrower check than the band, before touching anything in
this Part.**

Safe to skip: autostress/growth stresses (a *strength* term — "the stem is stronger than
the wood it is made of" [D] — matters only when stems can break); bark as a second motor
(Clair et al. 2019 [D], real, in no model); heartwood (wrong life stage at 2.88 m, and
§1.2's accumulator already supplies what it would buy).

---

## Part 3 — The rhythm: one scalar, one queue, and the whorl as a prediction

### 3.1 The mechanism chain, every link published

1. Short days stop elongation, cut organ number, shorten internodes to a rosette, and
   stop the cambium — one external scalar moving all four together (Wareing 1949,
   *Pinus sylvestris* [D]).
2. The conifer readout is a per-species critical night length, 2–3 h (Arctic) to 7–10 h
   (Romanian) in *Picea abies*, with PaFT4 *up* under short days — opposite sign to
   poplar's FT (Gyllenstrand 2007 [D]; Böhlenius 2006 [D]).
3. A bud is a compressed shoot: the winter bud contains the whole next year's primordia
   (preformation; elongation completes in 2–6 weeks [D]), laterals form *inside* it,
   evenly dispersed by **inhibition–competition** on the cone-shaped apex — "a variety of
   staggered and whorled arrangements could result" from one rule (Cannell & Bowler 1978
   [D]).
4. Remove the season and both signatures vanish together: the foxtail (finding 5).

Steps 1–2 are environment (the wind's category); step 3 is `stepAuxin` on a compressed
apex, already shipped. What is missing is only the queue: `minInternode` currently
*destroys* the primordium (it is already `shift()`ed off before the `continue` fires
[CODE] — worse than ROADMAP 0z1's phrasing). The fix is small, touches all nine species,
and needs a cap (or the stalled-shoot trap becomes an unbounded pile instead of a
discarded one).

### 3.2 The honest disagreement, and how the priors critique resolves it

`season` reads the literature as *environmental forcing with an internal caveat*; 
`architecture` reads it as *endogenous oscillator, period weeks, needing no environment
at all* (oak 18–22 d flushes under constant conditions, unmoved by mycorrhizal resource
addition [D]; cacao free-runs and individuals desynchronise, the signature of an
uncoupled oscillator [D]; Borchert 1973 gets intermittent↔continuous from a
two-compartment feedback with one parameter [D] — but its second compartment is a *root*,
and inventing a root whose only job is to set a period is a free period wearing a
compartment's clothes). Both routes produce the same code — an oscillator gating
elongation — and both briefs sized the period at ~250 steps **by back-solving from the
whorl count** from biologies 18× apart. That is the count-tuned-to-look-right trap.
Resolution: **fix the clock first (finding 2), then the period is either 18–37 d
(endogenous) or 365 d (season) in *stated* units, and the whorl count is a prediction
either way.** Note also the season is over-parameterised by one: period × duty threshold
× elongation rate give two observables (whorl count, bare-internode length) — fix all but
the threshold from outside the silhouette.

Second-order facts worth keeping: lammas/polycyclism is vigour-gated (r = 0.81 with
internode length [D]) and is how the one-flush rule breaks; vigour sets internode length,
whorl size and lammas together and internodal branching separately (Kroon 2008 [D]); the
crown of a real conifer is datable year by year from cataphyll scars — the legibility
*is* the rhythm [D]; and the cambial "off" state is a **competence** change, not a
concentration change — a dormant cambium is auxin-deaf (Baba 2011 [D]⚠), which is the
`comp` operator (finding 9b), and endodormancy proper is callose-plugged plasmodesmata
reopened by chilling-induced glucanases (Rinne 2011 [D]) — transport gating, the engine's
own idiom, needed only if a real winter is ever wanted.

Kill criteria, in order: gap CV must rise past 1.0 (down = regularisation = wrong
mechanism); `test/species.mjs` organ-for-organ on the eight herbs (the queue touches
shared code); the queue cap must bind.

---

## Part 4 — Apical control and the field that is not chemistry

The prior sweep established apical dominance ≠ apical control and that auxin is not the
apical-control signal; this sweep adds the kinetics and the replacement forms
(finding 6). What is genuinely new:

- **A quasi-static auxin field is defensible for a monotonically growing tree** — at
  15 mm h⁻¹ and any sane `stepDays`, the trunk is a few percent of a life — and
  indefensible for step changes (decapitation, breakage). We do not simulate those, so
  the engine is hit less hard than the literature headline suggests. What it cannot
  survive is the *length scale* (0.7–8.7 cm vs the 37.5 cm we ship) and the *epicormic
  facts* (release at auxin maximum; 40-year holds) [D].
- **Auxin is demoted, not exonerated**: sugars drive initial release, auxin prioritises
  already-released branches (Mason 2014's own conclusion [D]) — which is exactly what
  apical control is. The engine's first-order (1−L)/L survives as the thing being
  replaced *by a derivation* rather than contradicted.
- Both replacement forms need a per-branch carbon fixation rate — **which needs light**
  (§Part 5), so neither is as cheap in isolation as it looks; they are one coupled change
  with the light field, or they run on blade area as a proxy first.
- Either form must be checked against collapse: **if the implementation reduces to
  f(distance-below-apex), stop** — that is the falsified class. Their escape is that
  history lives in grown quantities (`aⱼ`, `S(x)`).
- Bookkeeping for SCIENCE.md either way: `dominance` as shipped is a **stated
  phenomenological field wearing auxin's name**. Book it honestly or replace it; do not
  leave it described as chemistry.

---

## Part 5 — Light

The mechanics (all [D], from the light brief): one sun direction plus a sky fraction, no
diurnal cycle; per-organ `L_i` from an orthographic depth map in light space (a shadow
map — 221 ms per 20-cycle tree; the only one of four published models a WebGL2 renderer
does for free); voxel shadow propagation as the CPU/Node fallback (~14×); refresh every
~50 steps (light changes on the timescale of organ founding, not wind). Branch death and
blade senescence on **relative** light — own integrated `L_i` vs the specimen's current
maximum (Sprugel 2002's "when branch autonomy fails": suppressed trees keep branches at
irradiances where dominant trees' branches die [D]; Kothari 2025 measured the same as a
fitted `L_top` slope [D]) — never an absolute threshold, which on a solitary crown is a
crown-depth dial (the priors critique's "PARAMETER for the garden, PRIOR-in-waiting on
the hero").

What the engine's framing gets from it beyond finding 7: the excurrent→decurrent
question decomposes as **upper/mid parabola = tropism-against-light front; lower cylinder
= self-pruning at a light threshold — both halves are light** (Kothari 2025 [D];
Duchemin 2018 [D]); and TAC1/LAZY light-gating means branch angle opens toward light as
**one light-dependent multiplier on the offset the statocytes already compute** [OURS
identification; the gating is [D/I]] — a crown beside a gap leans into it, for free.

A warning from the FSPM trenches: LIGNUM's own authors needed `BOOST`, an admittedly
ad-hoc lower-crown elongation promoter, because carbon + light alone let the crown base
rise too fast — and it was counterproductive in two of three formulations [D]. Carbon
balance plus light does not, by itself, hold a lower crown. Do not promise the garden
that it will.

And the sequencing lesson the pathogen work already paid for: `L_i` is a per-organ scalar
the renderer can read. **Every mechanism in this document produces a new per-station or
per-organ scalar — accumulated wood, spent curvature budget, strain history, light. Ship
each with its VIEWS entry in the same commit, or repeat the lesion.**

---

## Part 6 — Hydraulics: size, not form — with two exceptions worth having

The frame [D throughout]: hydraulic limitation of height is real but over-sold (51-study
review: where it occurs it explains 21–28% against wood-production declines of 30–90%;
compensation is the rule; the 2026 dipterocarp result is full compensation, no
height-related growth loss). Nothing hydraulic derives crown shape — the field's own
best crown model is tropism+light. Roots are isometric with stem mass across ten orders
of magnitude — ignore for form, one lumped resistance if a ceiling is ever wanted.
Ψ(z) = Ψ_soil − ρgz − ∫R·E is an environmental field in the wind's exact category if
that ceiling is wanted; bare ρgz as a vigour multiplier is **memoryless and linear — the
bottlebrush with better physics. Do not.**

The two exceptions:

1. **Conduit taper is the one hydraulic law whose published mechanism is auxin — the
   flagship overlap with this engine.** D_h ∝ L^0.2 universally (r² 0.88 over 0.5–44 m;
   257 species; ~600k conduits; β ≈ 0.20 stable across cambial age and climate [D]).
   Mechanism: Aloni & Zimmermann's auxin-gated expansion duration — fast differentiation
   near the source → narrow conduits; slow far away → wide [D]; confirmed in a spruce at
   r² 0.73, measured exponent 0.23 [D]; and causally: move the leaves down the stem
   (epicormics after partial harvest) and basal conduit area *falls* — set by current
   path length, not cambial age (Bicego 2025 [D]). **Nobody has derived b ≈ 0.2 from an
   auxin gradient — the two halves of the literature have never been joined. An engine
   that already solves auxin transport on arbitrary topology is unusually placed to try,
   and a negative is publishable.** Implement the local rule, *measure* the exponent,
   report it against 0.1–0.3. If a coefficient is ever tuned until it lands on 0.2, the
   flagship becomes a fit.
2. **The path-length term bends the radius log-profile, which `test/taper.mjs` §2 proved
   an exponent cannot.** Holding resistance per leaf area constant with b = 0.2 widening
   requires sapwood area ∝ L^0.6 [OURS — standard arithmetic, novel application]: a
   derived, non-pipe taper term, ~10 lines, `below = total − arc[i]` already exists.
   Untested; belongs behind the strain rule so its contribution can be attributed.

Also booked here: conduit taper and external stem taper are **different questions** —
nothing in the b ≈ 0.2 literature predicts stem diameter, so no engine radius exponent is
testable against it. And the pipe model's own review [D]: the ratio is not constant, most
sapwood does not conduct, Leonardo fails in *Cryptomeria*, butt swell is mechanics — "a
barrel trunk is the pipe model's known failure mode, not a bug in its implementation."

---

## Part 7 — Architecture and time

**In Hallé's grammar, the engine already builds Roux's model (a coffee bush); the
conifer architectures (Massart, Rauh) differ by ONE property: rhythmicity** [D]. That is
finding 5's work order restated from the taxonomy side. But "set the Massart bit" is a
flag; an oscillator gating elongation while founding continues is a mechanism — only the
second is buildable here. Crown shape does not live at the model level anyway: the same
*Araucaria*, same model, is a 20-tier cone in a stand and an umbrella at 4 m in the open
[D]. It lives at the architectural unit and **reiteration** — whose *sequential* form
fires on "a definite threshold of differentiation," a monotone state, not a date [D].
Which is finding 9d: the state arrives free from any memory mechanism; name the physical
quantity, never "physiological age."

**Every published FSPM steps in growth cycles, and a growth cycle is not a year — it is
one round of organogenesis.** LIGNUM, GreenLab, AmapSim, MAppleT, L-PEACH: all impose the
cycle as an input schedule [D]. GreenLab's 1000× substructure factorisation requires
same-age branches to be *identical* — exactly what a self-organising, environment-coupled
engine can never grant. **The engine does not owe the literature years; it owes it
flushes** — and it is the only simulator in this table whose tree would stand in real
weather while it grows. Two admissions from that literature worth keeping: Pałubicki's
excurrent→decurrent transition is *scheduled* ("apical control removed in the course of
development" — nobody derives it) [D], and their λ habit dial spans decurrent→excurrent
over **0.46–0.54** — a ±4% knife-edge that is a silhouette with a Greek letter on it. The
same paper concedes it "requires a memory of past leaves and branches" for branch width —
a graphics paper with no biology to defend independently confirming our 68.2% finding [D].

**Sympody is one flag the engine can nearly afford already**: indeterminate vs
determinate apex fate under CETS-family control, demonstrated switching *within one
plant* (cotton [D]); the engine carries florigen and builds determinate floral axes now.
An apex-fate predicate on a florigen threshold unlocks six-plus of the 23 models. Not
tree work; booked for the day someone asks for a xenobotanical oak.

### The three time architectures (the fourth is named only to be refused)

- **A. Name the slow clock** (finding 2). Zero code; one debt entry; every literature
  constant converts by arithmetic. ⚠ One constant cannot serve nine species — a fern
  lives ~17–20× faster than the spruce in the same 2527 steps; per-species is honest but
  is nine numbers where there were zero. Kill: >20× spread means it is not physical.
- **B. Season as compressed forcing, air left alone.** `WORLD.phase(t)` read only by
  growth (elongation gate, cambial competence, queue release). The known incoherence — a
  dormant axis standing through 250 steps of identical breeze — is *fixed for profit* by
  modulating `uRef` on the same clock: strain-wood lands in the windy phase, the cambium
  is competent in the same phase, **latewood by duration with no ring code** (finding 9c).
- **C. Grow-then-inhabit — for the garden only, never the hero.** It attacks the real
  perf problem (26 ms steps on an arrested conifer), and it deletes exactly the coupling
  the strongest literature here is about: S3m taper is strain *during* growth; Dlouhá is
  literally "remove mechanics during growth and the stem stops being a stem" [D].
  **You would grow a barrel and then shake it.** As a background-specimen split it is
  nearly free (`warmGarden` already does half); kill criterion is a `garden_shot` A/B at
  framing distance.
- **D. A yearly clock, like every published model — refused.** There is no growth cycle
  in which a 0.6 Hz stem mode is resolved. It deletes the wind, the fall, the bend
  solver, and `blender_seq`'s whole argument. This is the "grown tree vs tree in
  weather" trade of finding 1, decided.

---

## Part 8 — The shape-prior audit (what to refuse, and why)

Full table in [research_8_16_26_tree/critique_priors.md](research_8_16_26_tree/critique_priors.md).
The refusals, each with its disguise named:

| Proposal | Disguise |
|---|---|
| Duchemin's self-similar crown front | a photographed outline with a smoothing term; no organs; cannot age. **Cite in SCIENCE.md as the contrast case, next to Nauber's 14 hand-tuned parameters. Never build.** |
| The Pałubicki λ partition | a habit dial on a ±4% knife-edge, and it re-opens our own flux-partition falsification |
| "Physiological age" as a stated index | AmapSim's reference axis — a number that sets every parameter |
| Chuine/Sarvas phenology apparatus | four-plus fitted curve parameters where one threshold does the job |
| Kikuzawa leaf-longevity optimality | a global optimality statement; the engine may not optimise. PAR senescence does the same job causally |
| Kozak variable-exponent taper | forestry openly drawing the stem (their own admission) |
| MECHATREE's S ≈ 3, Eloy's α ≈ 2 | evolved/derived global safety criteria, not sensing laws — calibration numbers, not mechanisms |
| Targeting δ = 0.33 or b = 0.2 | tuning constants until a measured exponent appears = converting external agreement into a fit |
| An absolute light-death threshold on the hero | a crown-depth dial (fine as a *relative* rule in a garden) |
| Bare ρgz vigour multiplier | the bottlebrush with better physics |
| Auxin→compression-wood, concentration→cambial-rate, the full flux partition | falsified in the literature, in the literature, and here, respectively |

And the deepest item, no action but belongs beside SCIENCE.md's foundations: **PIN
polarity may follow concentration, not flux** (Bennett 2016 [D]; contested — flux models
still reproduce venation better in published simulations ⚠). The engine's polarity rule
is the disputed half of canalization. Meanwhile the engine's strongest ground is also
here: PIN1 channels appear in homogeneous tissue *before* vascular differentiation in
wounded stems, cambium regeneration included (Mazur et al. 2016 [D]) — wound canalization
is the woody case Sachs built the hypothesis on, and it is this solver.

---

## Part 9 — The build order

**Step 0 — measure, no code (~1 session).**
(a) Print Γ = ρgL³/(Ed²) per axis at the shipped 1.2 GPa (Γ ≲ 0.1 closes the posture-
architecture question in favour of static set point + elastic droop).
(b) `tools/jitter.mjs` on Ashfall Spire — stillness may already be shipped and unmeasured.
(c) The light pre-flight: rank the arrested conifer's blades by computed `L_i` and by
age; matching orders kill the hero's light case.
(d) **Build the r(z) crown-profile harness** (~40 lines, cone residual, arrested
specimen) — nothing in the suite can currently see a parabola, and every crown mechanism
below would otherwise be measured by an instrument that cannot distinguish success from
failure.
(e) Read Roychoudhry 2013 Figure 4 and settle the auxin/angle sign (⚠, Part 2.3).
(f) Declare `WORLD.stepDays` (or refuse it by its kill criterion) so every constant below
has units.

**Step 1 — S3m strain-driven, non-negative radial increment.** One term; it is wood
memory (do not build accumulation separately); retires `fruitFlow` and ends the
`radiusExp` argument; `test/stem.mjs` and `test/taper.mjs` both load-bearing
(taper's 2% band was written first — do not widen it). Kill: pre-flight the fixed point
on paper; if the solver does not land near δ ≈ ⅓ on a static load, the closure is wrong.
Measure pure accumulation's taper first (basal stations integrate longer — some taper is
free from age alone [OURS]) so the strain term's contribution is attributed.

**Step 2 — reaction wood**, gated on 1 (needs monotone D) and on 0e (the sign). ΔC into
`Axis.rest`; β/γ calibrated by the 7–12° flip, asserted in the harness; expect and check
the D⁻² consequences (90× branch/trunk motricity; curvature budget). Same commit as its
VIEWS channel.

**Step 3 — the growth rhythm**: oscillator + primordium queue (+ cap), independent of
1–2, buildable in parallel. The only channel with no rival supplier (whorls). Kills as
in Part 3.3. Take architecture B's `uRef` coupling in the same change if cheap — it turns
the incoherence into latewood.

**Step 4 — apical control rewrite**: export tax or sink share, one, pre-flighted on
paper. Retires the stated L. Kill: collapse to f(distance-below-apex), or λ refusing to
live in [0.32, 3.2] world units — **and the second kill is the expected one. Write it up
either way; a falsified export tax at our scale is the auxin-length-scale claim confirmed
on our own tree.**

**Step 5 — the light field**, only if 0c survives: senescence order (retiring imposed
item 6) and the garden are the real prizes; crown recession on the hero was never on
offer. Needs the CPU path cheap enough for the headless suite (~5 ms amortised or it
becomes browser-only, the category `tools/wind_check.mjs` exists to prevent).

Deliberately not on the list: rings (Part 1.4), heartwood, roots, autostress, a cone
(13c — still correct, still separate), the needle (rejected 2026-07-31, stays rejected),
Duchemin, and anything from the refusal table.

**What this order buys against the channels a viewer reads as "tree": whorls + bud scars
(3), real taper (1), wood that persists (1, visible once anything sheds load), branches
that stay out and age into place (2), a candidate parabolic crown (4, honestly uncertain),
senescence order + a living stand (5). Not addressed by any literature found: bark (a
renderer question), and sheer size/age — which is blocked by the organ-pool saturation
near 1800, an engine constraint, not biology. Stillness may already be owned (0b).**

---

## Part 10 — What is genuinely a parameter

In the spirit of research_7_30_26 Part 5 — the numbers that survive with a defence, each
a debt to book rather than a smell to hide:

| Number | Defence |
|---|---|
| `WORLD.stepDays` | the missing second; fixed the way `unitM` was (size must agree with literature age); its failure mode is its kill criterion |
| `S₀` (strain threshold) | physical units, per-species in every S3m paper; anchorable via H_crit/H ≈ 4 — an outcome statistic, and say so |
| `Δα ≈ 2.5e-3` | measured, hardcoded by the field itself; representative, not species-specific — label it |
| β/γ | **not free** — set by the 7–12° flip angle (a measurement, not a fit) |
| critical night length (2–10 h) | bracketed across provenances [D]; degenerate with the period until stepDays exists |
| export-tax λ ∈ [2, 20] cm | the one quantitative fact about apical control, from two independent routes |
| export-tax gain κ | **entirely free — no published value.** The brief that proposed it advertises "predicts a parabolic crown," which is precisely what κ would be tuned to deliver. Ship only with a stated derivation or an admission it is eye-set |
| per-organ opacity k ≈ 0.5 | spherical leaf-angle distribution, standard [D] |
| relative pruning threshold | scale-free by construction (Sprugel); legitimate in a garden, a dial on a solitary hero |
| accumulation rate k (if separate from S3m's) | costs nothing *if it replaces* the existing pipe constant; check before booking |

---

## Part 11 — Open threads and citations to verify

- **Roychoudhry et al. 2013, Figure 4** — the sign check that gates Part 2. Highest
  priority read in this document.
- **Ravichandran et al. 2020, *New Phytol* 227:1051** ("The canalization hypothesis —
  challenges and alternatives") — paywalled this session; the highest-value single
  follow-up for the engine's foundations. Do not cite from here.
- ⚠ author lines / primary text unverified: Dlouhá 2022 (403; abstract only), Bonnesoeur
  2016 (403), Jacobs 1954 (secondhand), Ekberg et al. (venue unresolved), Bhalerao &
  Fischer 2014 (title/framing only), Schrader 2003 and Baba 2011 (abstract level),
  Sprugel 1991 (abstract), Greathouse 1971 author line, the 2025 *Ann For Sci* wind-
  mechanobiology opinion (search-index text only), Savage 2010 exact exponents.
- Coutand 2008's 4.4% basal strains are implausibly large for woody tissue and may be a
  units artefact ⚠ — do not calibrate against them.
- **Corrections to carry into our own docs**: CLAUDE.md still quotes `plagio.mjs`'s
  retracted 16–268° framing (the file itself was corrected 2026-07-30); `plagio.mjs`
  prints verdicts off `STEM_DEFAULTS.eModulus` while the species ships 1.2 GPa; and
  anywhere we say Borchert–Honda's original Q was light-modulated is wrong (it was
  endogenous; Pałubicki 2009 added light and says so).
- The briefs disagree about whether the specimen's 2527 steps are one season or nine
  years (§Part 7A). The disagreement is the argument for `stepDays`, not something to
  resolve by picking the convenient reading.
