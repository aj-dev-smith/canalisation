# Branch vigour and branch angle: what the literature actually says

Answer to the research brief of 2026-07-30. Five parallel literature sweeps.

**How to read this.** Flags used throughout:

- **[D]** demonstrated — the cited paper shows this directly
- **[I]** inferred — the authors assert it, or it follows from cited facts, but was not shown
- **[OURS]** our construction. Not in any paper. Test it before trusting it.
- **⚠** a place where the literature is contested, or where we could not read the primary source

Where a source could not be retrieved, it says so. Nothing here is a confident synthesis over a
real disagreement; where two literatures disagree, both are given and the disagreement is named.

---

## Executive summary — the seven findings that change what you build

1. **Both of your Q1 failures are the same mistake, and it has a closed-form proof.** Any
   multiplier that reads only distance-below-apex produces either a cylinder or a straight cone,
   never a taper. The exponential is the problem, not the memorylessness. §1.1.

2. **Apical dominance and apical control are anti-correlated across crown forms.** Conifers have
   *weak* dominance and *strong* control; oaks the reverse. One `exp(-d/λ)` field cannot be both.
   Excurrent vs decurrent is a 2×2, not one axis. §1.2.

3. **Auxin is the wrong signal for lateral vigour.** Three independent experiments say so, the
   cleanest being: auxin applied to an already-growing dominant shoot does not restore apical
   control at all. This is a category-3 negative, not a tuning problem. §1.3.

4. **You are over-tapering every trunk right now.** Murray's law is measured to hold only in
   non-supporting axes — petioles, vines. Self-supporting stems revert toward the pipe model
   (r²). This is independent of everything else in the brief and is a one-line fix. §1.8.

5. **Yes, the antigravitropic offset is auxin-dependent — and it is resolved down to per-wall PIN
   polarity.** This is the highest-value finding in the brief and it lands exactly on the
   interface you already have. You can derive branch angle. The direction is counterintuitive:
   *more auxin → more vertical.* §2.3.

6. **Your cantilever number was an artefact twice over**, and the correct calculation inverts your
   conclusion. Mechanics *preserves* horizontal rather than destroying it — which is precisely why
   mechanics cannot supply the angle. Right conclusion, wrong reason. §2.1.

7. **Your parallel-venation negative result is right about the growth phase and wrong about where
   patterning happens.** All grass veins are laid down in the primordium by P5, on a domain whose
   aspect ratio is nothing like the mature leaf's. §3.1.

---

# Part 1 — What sets a lateral's elongation rate

## 1.1 The bottlebrush theorem [OURS — derivation, verify it yourself]

This is the most directly actionable result in the brief, so it goes first.

Let the leader apex recede at constant rate `v`. A lateral released at time `t_i` sits at distance
`d_i(t) = v·a_i` below the apex, where `a_i = t − t_i` is its age. Your rule is
`dL_i/da = R·m(d)` with `m(d) = exp(−d/λ)`. Integrate:

```
L_i(a) = R ∫₀^a exp(−v·s/λ) ds = (Rλ/v)·[1 − exp(−v·a/λ)]
```

As `a → ∞`, `L_i → Rλ/v`. **Identical for every lateral, independent of age.** Every branch older
than a few time constants `τ = λ/v` has the same length. Your bottlebrush is not a bug — it is the
exact solution.

Generalise. For *any* memoryless multiplier `m(·)` reading only distance-below-apex, with a
steadily receding leader:

```
L_∞ = (R/v) ∫₀^∞ m(d) dd
```

This is a constant, independent of `i`, **whenever the integral converges**. So:

| `m(d)` | integral | crown |
|---|---|---|
| any exponential | converges | **cylinder (bottlebrush)** |
| constant floor `f` (your 0.72) | diverges linearly | **straight cone**, half-angle `atan(f)` |
| power law `(d/d₀)^(−p)`, `0 < p < 1` | diverges sub-linearly | **`L ∝ a^(1−p)`** |

**Both of your attempts are the two limiting cases of one wrong family.** Nothing in between
escapes.

**The target is not a cone.** Measured conifer crown profiles are parabolic in the upper and middle
crown and approximately cylindrical below (Li 2004, *Larix olgensis*). Parabolic means
`r ∝ depth^(1/2)`, i.e. `p = 1/2`.

So the interim fix is one line: **replace the exponential with a sub-linear power law.** But a bare
exponent is a hand-set parameter, so §1.6 covers what generates `p ≈ ½` mechanistically.

The cylindrical *lower* crown is a different phenomenon — it is crown recession, shaded branches
ceasing extension and dying. **That part genuinely requires a light field.** Target the open-grown
paraboloid and accept that stand-grown lower crowns are out of reach without light.

> Li Fengri 2004, *Modeling crown profile of Larix olgensis trees*, Scientia Silvae Sinicae
> 40(5):16–24.

## 1.2 Apical dominance vs apical control: real, distinct, and anti-correlated [D]

The forestry literature draws a hard line and you should adopt it:

- **Apical dominance** — control by an active apex over *whether inhibited lateral buds open*.
- **Apical control** — suppression of *the vigour of an already-released* subdominant branch.

> Cline & Harrington 2007, Can J For Res 37:74–83, doi:10.1139/X06-218

The decisive structural fact, and it inverts the naive picture:

| | apical dominance | apical control | form |
|---|---|---|---|
| conifers, tulip poplar | **weak** | **strong** | excurrent |
| oaks, hickories, maples | **strong** | **weak** | decurrent |

> Brown, McAlpine & Kormanik 1967, *Apical dominance and form in woody plants: a reappraisal*,
> Am J Bot 54(2):153–162, doi:10.1002/j.1537-2197.1967.tb06904.x

**A single `exp(-d/λ)` cannot be simultaneously weak and strong.** If one signal with one decay
length drove both release and vigour, excurrent and decurrent would be the two ends of one axis.
They are opposite corners of a 2×2. This is fatal to the current architecture, and it is the
structural reason no value of your constant produces a cone.

Brown et al. also reject a pure auxin account on their own data: terminal shoots carried *higher*
diffusible auxin than laterals, yet the laterals' own second-order buds were completely inhibited.
Their conclusion: "the balance of growth factors at any given locus, and not the absolute quantity
of auxin."

⚠ **Status: real, distinct, and orphaned.** The molecular branching field has not absorbed apical
control — it has not addressed it. Beveridge et al. 2023 explicitly scopes itself to annuals. The
forestry literature that owns apical control essentially stopped after ~2009. **There is no modern
molecular treatment.** Everything in §1.2–1.4 is physiological-scale evidence from 1967–2009.

## 1.3 Auxin is not the apical-control signal — three independent negatives [D]

**1. The cleanest experiment.** In *Ipomoea nil*: 1% NAA on a decapitated stump strongly restores
apical *dominance* (classic Thimann–Skoog). But auxin applied to decapitated *already-growing
dominant shoots* does "not, in any observable way, restore apical control in lower dominated
branches." Verbatim conclusion: *"the hypothesis for the role of auxin as a repressor signal in
apical control is not supported."*

> Cline & Sadeski 2002, *Is auxin the repressor signal of branch growth in apical control?*,
> Am J Bot 89(11):1764–1771, doi:10.3732/ajb.89.11.1764
>
> ⚠ One sweep attributed this paper to Wilson & Gartner. Volume/pages/DOI are consistent across
> both; **verify the author line before citing.**

**2. Head-to-head test.** Nutrient-deprivation vs auxin-repression in morning glory, poplar,
Douglas-fir: results consistent with nutrient diversion, inconsistent with auxin repression.
Species caveat — Douglas-fir second/third flush behaved differently.

> Cline, Bhave & Harrington 2009, Trees 23(3):489–500, doi:10.1007/s00468-008-0294-8

**3. Girdling — and this one tells you the actual mechanism.** Six conifer species, 2 cm phloem
girdles:

| girdle position | result |
|---|---|
| 2 cm **above** the branch | all 6 species: branch bends up, compression wood forms in branch |
| 2 cm **below** the branch | *Tsuga canadensis*, *Pinus contorta*, *Pseudotsuga menziesii* **released from apical control**; *Pinus rigida* cambial activity only; *Juniperus virginiana*, *Picea abies* nothing |
| **>20 cm below** | no release in any species |

> Wilson & Gartner 2002, Tree Physiol 22(5):347–353, doi:10.1093/treephys/22.5.347

## 1.4 What apical control actually is — and it inverts the model you proposed [D]

Read the girdling table carefully. Apical control is **not** "the leader monopolises assimilate and
starves the lateral." It is:

> *"branches compete with the subjacent stem for branch-produced photosynthate, and when the branch
> lacks this competitive sink it is released from apical control."*

The stem segment **immediately below** the branch drains the carbon the branch itself made. It is
**local** — 2 cm works, 20 cm does not. It is **species-variable** — nothing in 2 of 6 conifers.
And the flow direction is *out of* the branch, not withheld from it.

This is also fully consistent with the branch-autonomy literature (§1.7): branches make their own
carbon and mostly keep it. Apical control is a local export tax, not a central ration.

**Computationally this is cheap and good news.** It needs only the branch's own blade area and the
stem segment immediately basal to it — both of which you have. It does *not* need a global carbon
pool, sugar transport, or a `Q/D` ratio. ⚠ It has never been formalised as an equation anywhere;
you would be writing the first one.

## 1.5 The Borchert–Honda partition — the published answer, and its honest caveat

Both sweeps converged on this independently, which is worth something.

```
v_m = v · λ·Q_m / (λ·Q_m + (1−λ)·Q_l)
v_l = v · (1−λ)·Q_l / (λ·Q_m + (1−λ)·Q_l)
```

`v` = resource arriving at a branch point, `Q_m`/`Q_l` = capacity measures of the two subtrees,
`λ ∈ [0,1]` = apical control. Then `n = ⌊v⌋` metamers, internode length `l = v/n`.

> Pałubicki, Horel, Longay, Runions, Lane, Měch & Prusinkiewicz 2009, *Self-organizing tree models
> for image synthesis*, ACM TOG 28(3):58, doi:10.1145/1531326.1531364

**The critical number: λ spans only 0.46–0.54 across the entire decurrent→excurrent range**, under
identical conditions. A ±4% bias in the partition flips oak into spruce. That extreme sensitivity
is itself a finding — it is consistent with excurrent/decurrent being labile *within* a species
over its lifetime (below).

Independently reproduced with **xylem flow** as the partitioned resource rather than light:

> Nauber, Hodač, Wäldchen & Mäder 2024, Tree Physiol 44(5):tpae045, doi:10.1093/treephys/tpae045

⚠ **The catch, stated plainly.** In Pałubicki et al., `Q` is *light*, computed by shadow
propagation. You have no light field. **But the equations do not care what `Q` is** — the original
Borchert & Honda 1984 model used an abstract endogenous flux, and Pałubicki et al. describe using
light as *their* contribution.

⚠ **And the deeper catch, from the source itself:** *"It is not known whether apical control in
nature is exerted through competition for resources, hormonal control, or both."* The Prusinkiewicz
lab treats λ as a phenomenological knob. **Nobody has derived it. As of now λ genuinely is a set
point in the published models** — a category-2 answer.

**Excurrent form is age-dependent, not a species constant** [D]. Young vigorous trees hold
excurrent form; older slower trees become decurrent. Pines are conical when young, flat-topped when
old; oaks are excurrent as saplings (Brown et al. 1967). **Implication: λ should be a function of
vigour, not a constant** — and if λ is *derived* from a flux ratio this falls out for free, because
as the crown fills in the leader's share of total flux declines and the partition drifts toward 0.5.

## 1.6 The auxin-native route — what we would actually try first

Three memory variables, all with evidence, all already computable in your engine. Each breaks the
bottlebrush theorem because each is a **monotone accumulator of the branch's own history**, not a
reading of instantaneous position. A branch with a head start gets more cross-section → more
conductance → more primordia → more foliage → more cambial growth → more cross-section. **A ratchet
has no steady state in the co-moving frame, so the integral does not converge. The taper comes from
compounding, not from position.**

**(i) Substitute auxin flux for light in Borchert–Honda.** [OURS — no paper does this] The auxin
flux through an axis's base is a scalar you already compute, and canalisation already makes strand
conductance grow with the flux it carries. The leader subtends more auxin sources → carries more
flux → takes a larger share. **Start at λ = 0.5 exactly** — unbiased, no free parameter. Whether
unbiased flux partitioning alone yields excurrent form is an empirical question you can answer in
your own engine faster than the literature can answer it for you. Given that every published form
lives in λ ∈ [0.46, 0.54], starting at 0.5 is not obviously wrong.

**(ii) Read the canalised PIN field as a persistent per-branch conductance.** This is the
best-supported auxin-native route and it comes from Leyser's own lab.

Bud activation resolves into a slow **lag phase** then a transition to **rapid committed
outgrowth**. Manipulating BRC1, auxin transport, or strigolactone altered the lag phase — and
*"certain treatments also influenced the subsequent rapid growth rate."* The lag phase *is* "the
establishment of canalized auxin transport within the developing bud," and *"auxin transport
dynamics play a key role in determining maximum branching growth rates."*

> Nahas, Ticchiarelli, van Rongen, Dillon & Leyser 2024, New Phytologist, doi:10.1111/nph.19664

**This is the model you want.** Canalised transport capacity established during the lag phase sets
the branch's subsequent maximum growth rate — and that capacity is a persistent PIN-field state
variable you already have.

⚠ Arabidopsis nodal explants, single leaf + bud. Extending to multi-year crown taper is a large
leap. The rate effect is reported qualitatively; **no published functional form links canalised
conductance to elongation rate.**

**A striking corroboration from the opposite direction** [D]: NPA blocking auxin efflux
*specifically from axillary buds* had **no effect** on initial outgrowth after decapitation;
inhibitory effects appeared only from 48 h. Conclusion: initiation of bud outgrowth is
*"independent of auxin canalization and export from the bud."*

> Chabikwa, Brewer & Beveridge 2019, Plant Physiol 179:55–65, doi:10.1104/pp.18.00519

**Canalisation appears to matter *less* for release and *more* for sustained growth — exactly
backwards from how the sim currently uses it.** Two labs, opposite methods, same conclusion.

**(iii) The hydraulic ratchet, with every link measured.** In beech: xylem conductance correlates
with number of leaf primordia in the bud, which correlates with the outermost annual ring area.
And the switch is **discrete**: **<4 primordia → short growth unit; >5 → long growth unit.**

> Cochard, Coste, Chanson, Guehl & Nicolini 2005, Tree Physiol 25(12):1545, doi:10.1093/treephys/25.12.1545

A bimodal shoot-type switch sharpens taper far more effectively than a graded multiplier, because
the crown becomes a *mixture of two populations* whose proportion varies with position, rather than
one population whose rate varies. **Directly implementable, and we would add it early.**

⚠ Causal direction explicitly left open by the authors — conductance may follow growth rather than
drive it. Treat as a correlation strong enough to build on, not a demonstrated mechanism.

⚠ **The loop runs away by construction** on either side of λ = 0.5. What terminates it in real
trees is that the losing branch *dies*. **You will need an abscission rule** or suppressed branches
will asymptote toward zero radius and never leave.

## 1.7 Why we would *not* build share-of-assimilate — the account you were most drawn to

Four independent problems, in increasing order of severity.

**Sucrose is a SIGNAL, not a substrate** [D]. The decisive experiment is a metabolisability
dissociation: **mannose** (phosphorylated by HXK1, not metabolised further) triggers bud growth
identically to glucose; **3-O-methylglucose** (taken up, increases dry matter, poorly
phosphorylated) does **not**. Mannose's effect is concentration-independent. Verbatim: *"sugars are
required as a signal and not necessary as a carbon or energy source to promote bud release."*

> Barbier, Cao, Fichtner et al. 2021, New Phytologist, doi:10.1111/nph.17427

**This matters enormously.** If sucrose were a substrate, "share of assimilate" would be the natural
currency. It is a signal — and a signal has a threshold and a saturation, not a proportional-share
law. ⚠ Caveat: reviews describe a *dual* role, with a minimum sucrose floor beneath the signalling.
So: signal-dominant with a substrate floor.

**The sugar account is about release, not vigour** [D]. Explicitly: release requires reduced stem
IAA + enhanced sucrose + reduced SL, but *sustained* growth *"will follow even if stem IAA and
sucrose are restored, provided that IAA-enhanced GA levels cause bud elongation and enhanced auxin
transport continues from the bud."* The title word is *"initial."* **Nobody claims sugar sets
sustained vigour.**

> Mason, Ross, Babst, Wienclaw & Beveridge 2014, PNAS 111:6092–6097, doi:10.1073/pnas.1322045111
> — ⚠ **full text could not be retrieved**; timescales below are from replications and reviews that
> quote it and agree with each other.
>
> Beveridge, Rameau & Wijerathna-Yapa 2023, J Exp Bot 74(14):3903–3922, doi:10.1093/jxb/erad137

The timescale argument, which is the sound part: phloem sucrose ~150 cm/h vs polar auxin transport
~1 cm/h. Bud growth detectable at ~2.5 h; release up to 24 h before any measurable auxin change in
the adjacent stem. A ~150× speed gap is not a measurement quibble.

**Branches are largely carbon-autonomous** [D, read at abstract level — ⚠ Wiley full texts blocked].
They import meaningfully only under severe local stress.

> Sprugel 2002, Tree Physiol 22:1119–1124 · Lacointe et al. 2004, Plant Cell Environ,
> doi:10.1111/j.1365-3040.2004.01221.x · Hoch 2005, Plant Cell Environ

If branches are autonomous, a whole-plant common pool is the wrong object.

**Every FSPM smuggles the taper back in by hand.** GreenLab's allocation law is clean —
`Δq_o = ρ_o · Q/D`, "own sink strength × supply/total demand." But applied to beech, the fitted ring
sink coefficients are:

| physiological age | `p_rg` |
|---|---|
| PA1 (trunk) | **1.00** |
| PA2 | 0.10 |
| PA3 | 0.05 |
| PA4 (short shoot) | **0.01** |

**A 100× hand-fitted vigour ratio, keyed to branch-order labels read off the real tree.** GreenLab
does not derive apical control from carbon economics; it encodes it. By your own accounting that is
a documented failure with no mechanism underneath. L-PEACH uses user-defined organ functions;
Pałubicki and Nauber use λ. ⚠ There is also a serious null-model challenge arguing published sink
hierarchies may be sampling artefacts (Thompson 2024, Tree Physiol 44(1):tpad151).

**If you build it anyway, build MuSCA's form** — a one-parameter family spanning the whole published
spectrum, with every input something you already have:

```
F_ij = [ Demand_j · f(dist_ij, h) · ACP_i ] / Σ_k [ Demand_k · f(dist_ik, h) ]
f(dist, h) = 1 / (1 + dist)^h
```

`h → 0` = GreenLab common pool; large `h` = branch-autonomous. Given the autonomy literature, **use
large `h`** — which converges on §1.4's local mechanism anyway.

> Reyes, Pallas, Pradal et al. 2020, *MuSCA: a multi-scale source–sink carbon allocation model*,
> Ann Bot, doi:10.1093/aob/mcz122

## 1.8 ⚠ Immediate independent fix: Murray's law is wrong for your trunks [D]

> *"These conduits conform to the Murray's law optimum as long as they do not function additionally
> as supports for the plant body."*
>
> McCulloh, Sperry & Adler 2003, *Water transport in plants obeys Murray's law*, Nature
> 421(6926):939–942, doi:10.1038/nature01444

✅ **Quote verified verbatim against the paper this session.**

- **Holds** (r³) in compliant non-supporting structures: petioles, petiolules, vines.
- **Does not hold** in self-supporting stems and trunks. ⚠ **The paper's statement of the exception
  is verified; the specific replacement exponent is not.** That mechanically-loaded axes revert
  toward **r²** (the pipe model), with elastic-similarity arguments landing near 2.5, is our
  reading of the surrounding literature, not a number quoted from McCulloh et al. **Treat the
  direction as solid and the exponent as a thing to sweep.**

You use Murray's law for every axis. For petioles and slender distal twigs that is well-founded.
**For trunks and load-bearing scaffold branches you are over-tapering relative to measured trees.**
This is unrelated to everything else in the brief and is the cheapest correction available.

Note also that the pipe model (`A_sapwood ∝ A_leaf above`) is a statement about **standing stocks,
not rates** — no dynamics, no time constant, no growth law. It cannot by itself tell you how fast a
branch extends. ⚠ And its own reviewers say it *"is not valid as a universal rule"* (Lehnebach,
Beyer, Letort & Heuret 2018, Ann Bot 121(5):773–795, doi:10.1093/aob/mcx194).

## 1.9 Verdict on Q1

**Auxin alone gives you apical dominance for free** — the canalisation competition you already have
reproduces it, including the acropetal activation sequence and decapitation responses
(Prusinkiewicz et al. 2009, PNAS, doi:10.1073/pnas.0906696106).

**Auxin alone does not give you apical control.** The direct test fails. The best-supported
mechanism is local carbon export to the subjacent stem.

**But you have two auxin-native routes nobody has tried** (§1.6 i and ii), and one of them is
supported by the 2024 Leyser paper. Try those before adding a second currency. If you do need one:
**it is carbon, not strigolactone, not cytokinin** — and per §1.4 you need only a *local* version of
it, which is far cheaper than a transport model.

---

# Part 2 — What sets a branch's angle

## 2.1 Your cantilever number was wrong twice, and the correction inverts your conclusion

**Both of your candidate moduli are wrong, in opposite directions.**

| material | E |
|---|---|
| your herbaceous value | 60 MPa |
| clear conifer **stem** wood, green (your 8–11 GPa) | 8.5 GPa |
| **living conifer BRANCH sections, whole, with bark** | **0.7–4.6 GPa** |
| *Picea abies* branch compression wood | 0.78–0.91 GPa |
| *Picea abies* branch opposite wood | 1.23–1.26 GPa |

> Cannell & Morgan 1987, *Young's modulus of sections of living branches and tree trunks*,
> Tree Physiol 3(4):355–364, doi:10.1093/treephys/3.4.355
>
> Hartwig-Nair, Florisson, Wohlert & Gamstedt 2024, Wood Sci Technol 58(3):887–906,
> doi:10.1007/s00226-024-01548-z

Branch wood is soft because **microfibril angle is 41–53°** versus ~10–20° in mature stem wood, and
MFA dominates axial stiffness. Branch wood is also juvenile, wet, and largely compression wood.
Scots pine branch MOE ≈ ⅓ of stem. **Use E = 1–4 GPa, central 2 GPa.**

**Second error: anything above ~30° from a small-deflection formula is not an angle.** It is the
linear formula reporting how badly it has been violated. Your 268° is a number of that kind. (For
the conifer cases small- and large-deflection agree to ~15%, so the machinery is fine there.)

**Verified large-deflection elastica results** — tapered EI, distributed self-weight plus foliage
by pipe-model distribution, clamped horizontal. Tip slope in degrees below horizontal:

| branch | E=1 GPa | E=2 GPa | E=4 GPa | E=9 GPa |
|---|---|---|---|---|
| upper crown, 0.8 m / 12 mm | −31.6° | **−16.8°** | −8.5° | −3.8° |
| mid crown, 2.0 m / 30 mm | −39.8° | **−21.9°** | −11.2° | −5.0° |
| lower crown, 4.0 m / 60 mm | −46.8° | **−26.6°** | −13.8° | −6.2° |
| mid crown, **bare wood, no foliage** | −7.0° | **−3.5°** | −1.7° | −0.8° |

Solver validated three ways: exact against the analytic small-deflection limit; against Bisshopp &
Drucker 1945 large-deflection tables (0.3017 vs 0.302, 0.4935 vs 0.494, 0.6700 vs 0.665); and loads
cross-checked against measured base bending stress (Evans et al. 2008, 40 species, mean 11.1 MPa,
range 5.2–18.9 — our loads land at the light end, so these deflections are if anything
*under*estimates).

⚠ **Largest single uncertainty is foliage distribution, not modulus.** Same total mass, mid branch,
E=2 GPa: pipe −21.9°, uniform −37.7°, tip-increasing −53.7°, all-in-outer-half −57.5°.

### The plain answer, and it is not what you expected

> **A woody conifer lateral held horizontal IS near mechanical equilibrium.** Gravity does not
> overwhelm stiffness. "Near" means it droops 10–45° at the tip — the observed drooped shape is
> normal, not a failure.
>
> **But the angle is still not determined by mechanics.** The wood skeleton alone droops 1–7°. The
> rest is foliage load. Mechanics adds a *droop correction* on top of a built-in angle; it does not
> choose the angle. Remove the active set point and a conifer branch does not find a horizontal
> equilibrium — it sits wherever it was built, minus 10–45°.
>
> **So you still need an active set point, but for the opposite reason to the one you assumed.** You
> thought mechanics destroyed the horizontal state so something must be holding it. In fact
> mechanics *preserves* it, which means mechanics cannot *supply* it.

Also a framing correction: a cantilever statics problem **always** has an equilibrium. Gravity never
"overwhelms stiffness" in the sense of no solution existing. What varies is how far the equilibrium
sits from the reference shape — and that distinction matters for how you build the controller.

## 2.2 Carry one dimensionless number: Γ = ρgL³/(Ed²)

For a uniform circular cantilever under bare self-weight, `θ_tip = wL³/(6EI) = (8/3)·Γ`.

| case | Γ | (8/3)Γ |
|---|---|---|
| herbaceous 15 cm × 1.0 mm, E = 60 MPa | 0.552 | 84° |
| herbaceous 30 cm × 1.5 mm, E = 60 MPa | 1.962 | 300° |
| **conifer 2.0 m × 30 mm, E = 2 GPa** | **0.0392** | **6.0°** |
| conifer 2.0 m × 30 mm, E = 9 GPa | 0.0087 | 1.3° |

Γ drops ~33× from your herbaceous case to the conifer case, and the `L³/d²` factor contributes only
0.9× of that — **the entire change is E.** To get 268° on conifer geometry you would need
E ≈ 45 MPa. Your number is exactly what an herbaceous modulus produces, nothing more.

**Recommendation: compute Γ per organ and branch on it.**

- **Γ ≳ 0.5** (herbaceous) — no useful static set point; you need a *dynamic* controller, which is
  exactly what the Bastien AC model is.
- **Γ ≲ 0.1** (woody) — static set point plus elastic droop correction is the right decomposition.

One number, decides the architecture. Do not treat one regime as the truth.

## 2.3 ⭐ Yes — the antigravitropic offset is auxin-dependent, and it lands on per-wall PIN

This is the highest-value finding in the brief.

**GSA is a genuine regulated set point** [D]. The founding experiment is clinorotation: on a
clinostat, Arabidopsis lateral shoots and roots show pronounced *outward/upward* curvature "never
observed in primary shoots." Remove the gravity signal and a persistent counter-bending component
is unmasked. GSA is also maintained in organs with negligible self-weight, regained after
reorientation in *both* directions, abolished by removing gravity *sensing* (`pgm-1` no statoliths,
`scr-3` endodermis-defective), and genetically tunable without changing mechanics.

> Roychoudhry, Del Bianco, Kieffer & Kepinski 2013, *Auxin controls gravitropic setpoint angle in
> higher plant lateral branches*, Curr Biol 23(15):1497–1504, doi:10.1016/j.cub.2013.06.034

**Auxin-dependence, in both senses, and they are separable** [D]:

- *Requires auxin transport to exist* — AGO activity is lost under transport inhibition.
- *Magnitude is set by auxin signalling* — verbatim: *"auxin specifies GSA values dynamically
  throughout development by regulating the magnitude of the antigravitropic offset component via
  TIR1/AFB–Aux/IAA–ARF-dependent auxin signalling within the gravity-sensing cells."* And
  **tissue-autonomous**: altering signalling in just those cells is sufficient.

### ⚠ GET THE DIRECTION RIGHT OR THE SIM INVERTS

**More auxin → smaller AGO → MORE VERTICAL.** Verbatim: *"auxin induced more vertical GSAs by
diminishing the relative magnitude of the AGO."*

⚠ Non-monotonic in at least one system: in *bean* basal roots, 50–70 nM IAA → more horizontal,
90–100 nM → more vertical. Monotonic in Arabidopsis over the tested range; **not universal.**

### The mechanism, resolved to per-wall PIN [D]

The AGO **is** a PIN-mediated upward auxin flux:

- **PIN7 → upper membrane** (>50% of columella cells) = **antigravitropic** carrier
- **PIN3 → lower membrane** (~55%) = predominantly **gravitropic**
- Contrast: in primary roots reoriented 45°, both PIN3 and PIN7 polarise to the lower side — no AGO

The auxin → AGO transduction is a phospho-switch:

```
[IAA] ↑ → RCN1 (PP2A A-subunit) ↑ in columella
       → RCN1/PP2A dephosphorylates PIN3 hydrophilic loop
       → PIN3 shifts to LOWER membrane
       → upward antigravitropic flux ↓ → AGO ↓
       → balance reached at smaller angle → MORE VERTICAL
```

> Roychoudhry et al. 2023, Nature Plants 9:1500–1513, doi:10.1038/s41477-023-01478-x

Genetic support (Arabidopsis stage-III lateral roots, angles from vertical; ⚠ several read from
figures — verify before fitting):

| genotype / treatment | GSA |
|---|---|
| WT Col-0 | **63° (SD 7)** |
| WT + 50 nM IAA, 4 h | ~40° |
| `ARL2::RCN1` overexpression | ~45° |
| PIN3 S→A (phosphodead) | ~50° |
| `pin3`, `pin7` singles | ~70° |
| `rcn1` (loss of PP2A) | ~75° |
| PIN3 S→D (phosphomimic) | ~80° |
| `rcn1` + IAA | **no response** (RCN1 required for the auxin effect) |

**Competitive, not multiplicative** [D]: *"angle-dependent variation in downward gravitropic auxin
flux acting against angle-independent upward, antigravitropic flux."* GSA is the angle where they
balance.

### What we would actually build

**Do not add a per-branch GSA parameter.** Add one statocyte layer per axis with a gravity-driven
PIN-targeting bias plus an opposing constitutive bias, and **compute the AGO directly as the net
PIN-mediated auxin flux component antiparallel to ĝ, summed over statocyte walls.** You have
per-wall PIN. That is a genuine derivation, not a fit. Make wall-targeting auxin-sensitive with the
sign above. One gain constant.

An analytic form if you want one [OURS — no paper writes this]. Let `p` = phosphorylated fraction of
statocyte PIN, decreasing in auxin via RCN1:

```
AGO         = A₀ · p([IAA])                      (angle-independent, per their model)
gravitropic = G₀ · (1 − p([IAA])) · g(θ)
θ* solves:   g(θ*) = (A₀/G₀) · p/(1−p)
with g(θ)=sin θ:   θ* = arcsin[ c · p/(1−p) ]
```

⚠ **Two warnings.** (i) The sine law is wrong for roots — max bend rate occurs at **120–130°, not
90°**, and that paper found *all* graviresponse components angle-dependent, including PIN
polarisation, which quietly undercuts the "angle-independent AGO" assumption (Roychoudhry et al.
2025, PNAS 122:e2506400122). (ii) You do not need `p` as a fitted curve at all — compute the flux
directly.

### ⚠ Four real dissents, none fatal but all worth knowing

1. **The AGO is officially "hypothetical."** A neutral review: *"Although the nature of the AGO has
   not been clarified, studies have suggested that gravitropism and the AGO share a common
   gravity-sensing mechanism in statocytes."* If they share the sensor, the AGO is a *second output
   of the gravity sensor*, not a gravity-blind constitutive term. (Kawamoto & Morita 2022, New
   Phytol, doi:10.1111/nph.18474)
2. **Angle-independence is an assumption, not a measurement.** `lzy` mutants' antigravitropic growth
   is suppressed by `pgm` — i.e. it *requires* intact gravity sensing (Kawamoto et al. 2020, Plants
   9:615).
3. **At least one AGO is not auxin at all — it is wall mechanics.** EGT1 in barley/wheat: no auxin
   induction, no AuxRE in the promoter, auxin signalling intact in mutants; acts via cell-wall
   stiffness (7.60 vs 5.6 pN/nm, −26%). *"an auxin-independent AGO mechanism"* (Fusi et al. 2022,
   PNAS).
4. **The biomechanics school uses no AGO at all** — see §2.5.

### ⚠ The gap that will bite you

**Every molecular AGO detail — PIN identity, RCN1, the phospho-switch — is demonstrated only in
lateral ROOTS.** The 2023 paper is explicit that shoots are not addressed and generalisability to
aerial organs is untested. For shoots the demonstrated level is: the AGO exists (clinorotation),
requires auxin transport, and its magnitude is set by TIR1/AFB in the endodermis. **Which shoot PINs
and their polarity is unknown.** Any shoot implementation is extrapolation — a defensible one, but
label it in the code.

## 2.4 ⚠ The decapitation sign trap — this will invert your model if you miss it

Naive coupling: decapitation → less auxin → lateral goes vertical.

**The documented auxin→AGO relation predicts the opposite.** Less auxin → *larger* AGO → *more
horizontal*.

The self-consistent route [OURS, but sign-consistent with all the data]: the released lateral
becomes **its own auxin source**. Its apex ramps up IAA → auxin rises *in its own statocytes* →
AGO ↓ → vertical. **The causal variable is local statocyte auxin in the lateral itself, not the
removal of leader auxin.** Your `exp(-d/λ)` apical-dominance field and the statocyte auxin pool are
**different pools.** Conflate them and you get the inversion.

### And in conifers, three findings against decapitation-coupled GSA entirely [D]

1. *Abies nordmanniana*: auxin transport >90% basipetal; **no detectable dorsiventral hormone
   gradient in horizontal branches**; decapitation affected bud positioning but **not branch
   orientation**. Horizontal orientation *"must rely on a different mechanism, presumably autonomic
   within the branch."* (Veierskov et al. 2007, Tree Physiol 27(1):149)
2. *Abies*: few growth reactions after decapitation; auxin and ABA largely unaffected; the response
   was **cytokinin**-dominated. (Rasmussen et al. 2010, J Plant Growth Regul,
   doi:10.1007/s00344-009-9132-5)
3. *Wollemia nobilis*: **"orthotropic begets orthotropic, plagiotropic begets plagiotropic."** No
   evidence laterals convert to orthotropy. Architectural change occurs by **reiteration from new
   meristems**, not by re-setting an existing branch's angle. Trunk axes are radially symmetric with
   spiral phyllotaxis; branches are dorsiventral with decussate phyllotaxis — **a different organ
   identity, not a different angle.** (Tomlinson & Murch 2009, Am J Bot)

**Implication:** in conifers, plagiotropy looks like a **meristem identity state (topophysis)**, not
a continuously tunable set point. The honest implementation may be a **discrete per-meristem
orthotropic/plagiotropic flag assigned at bud formation**, with the GSA machinery of §2.3 operating
*within* each identity class.

⚠ *Abies* and *Araucaria* sit at the strongly-plagiotropic extreme. *Picea*/*Pinus* do replace
leaders after top damage — routine forestry knowledge — **but we could not locate a controlled study
quantifying the reorientation angle or timescale.** Treat leader replacement in Picea/Pinus as an
evidence gap, not a demonstrated GSA release.

## 2.5 LAZY/TAC1/WEEP — one is implementable, one is not, and knowing which saves you weeks

**The chain** [D except where noted]: amyloplast sediments (seconds–min) → MKK5–MPK3 phosphorylates
LAZY (0.5 h) → phospho-LAZY binds TOC on the amyloplast surface and rides it → transfers to the
nearest (lower) plasma membrane (30 min–2 h) → LZY **CCL** domain binds RLD **BRX** domain
(K_D = 9.7 nM, 1:1) recruiting RLD to the lower membrane → **[I] weakest link:** RLD → PIN3
relocalisation (asymmetry reduced in `rld1 rld4` but delayed to ~300 min; **no direct RLD–PIN
binding shown**) → auxin asymmetry → differential elongation. `lazy234` loses auxin asymmetry
*despite normal amyloplast sedimentation* [D]. ⚠ How gravistimulation activates MPK3 in the first
place is unresolved by the authors' own admission.

> Furutani et al. 2020, Nat Commun, LZY–RLD structural/biophysical · Nishimura et al. 2023, Science,
> doi:10.1126/science.adh9978 · Chen et al. 2023, Cell

| gene | what it does | expressible as auxin? |
|---|---|---|
| **LZY/LAZY** (Arabidopsis) | statolith → PM polarity → RLD → PIN3 | **YES** — output *is* PIN polarity. Implement as a statocyte polarity rule with one gain constant. |
| **LAZY1** (rice) | *negative* regulator of polar auxin transport; `la1` enhances PAT and alters IAA distribution → spreading tillers | **YES** — a scalar gain on PAT magnitude. ⚠ **But the 2007 claim (PAT magnitude) and the 2020 claim (PIN polarity via RLD) are not reconciled anywhere. Contested.** |
| **TAC1** | promotes horizontal branch growth; `tac1` peach = "pillar/broomy" | **NO.** `tac1` shows *no altered gravitropic bending*; `lazy1` is epistatic. TAC1 is **light-regulated** — induced by light, eliminated in prolonged dark, `tac1` phenocopies shade, peach TAC1 interacts with an LHCB homolog. **Its input is light, which you do not have.** |
| **WEEP** (peach) | loss → pendulous branches; weeping branches show flipped early-auxin-response gene expression across the branch | **PROBABLY** — output is an auxin asymmetry. **[I]** — no PIN localisation data, no angles in degrees, upstream/downstream unresolved |

**Practical: implement LZY. Do not attempt TAC1.** It is a genuine, documented, light-gated
parameter with no auxin route — which makes it a *justified* hand-set parameter, and you can cite
exactly why.

## 2.6 Reaction wood — the real actuator in woody branches, and you have no model of it

> **In a woody branch, long-term angle maintenance is NOT primary-growth differential elongation. It
> is asymmetric secondary growth with maturation stress.** You have no secondary growth, so you have
> no representation of the actual actuator.

**Mechanism.** Conifers form **compression wood on the underside**. During secondary-wall
maturation, CW tracheids tend to *elongate* longitudinally; bonded into the existing section they
cannot, the lower side goes into compression, and an **up-bending moment** appears. Angiosperms do
it upside-down (tension wood on the upper side, contracting). Verbatim: *"stem curvature occurs by
differential maturation between the two sides"* — as opposed to herbaceous organs where "growth is
stimulated, preferentially on one side."

Same paper: woody gravitropism is **biphasic** — gravitropic up-righting then **autotropic
decurving**. That is Bastien's graviception + proprioception implemented through a completely
different actuator. **The AC model's control structure survives into woody axes; its plant (in the
control-theory sense) does not.**

> Coutand, Fournier & Moulia 2007, Plant Physiol 144(2):1166–1180, doi:10.1104/pp.106.088153

**Governing equation:**

```
dC = −k · Δα · dr / r²        →       ΔC = k · Δα · (1/r_i − 1/r_f)
```

⚠ **`k` is convention-dependent and this is a factor-of-two trap.** Derived two ways here:
sinusoidal circumferential profile → k = 2; step profile → k = 8/π = 2.55. Published value
(Coutand/Fournier) → k = 4. Folding in eccentric growth (worth ~26% in gymnosperms) lifts 2.55
toward ~3.4. **Fix a convention for Δα explicitly or you will be off by 2×.**

**The r⁻² term is the whole story.** The motor's authority collapses as the branch thickens. A
conifer branch is in a race: load grows while the righting motor weakens as 1/r².

**Sizing it** — for a 2 m mid-crown branch at E = 2 GPa, the required built-in curvature to sit
horizontal when loaded is κ_base = 0.167 m⁻¹ (radius 5.99 m). Curvature the motor can generate per
year at r = 15 mm:

| annual dr | Δα | k=2 | k=4 | years to reach 0.167 m⁻¹ |
|---|---|---|---|---|
| 1.0 mm | 1000 µε | 0.0089 m⁻¹/yr | 0.0178 | 19 / 9.4 |
| 1.5 mm | 2000 µε | 0.0267 | 0.0533 | 6.3 / 3.1 |
| 2.0 mm | 2000 µε | 0.0356 | 0.0711 | 4.7 / 2.3 |

**2–19 years for the motor to build the curvature a 2 m branch needs.** The motor is slow compared
to the loading. That is a checkable prediction, and it explains why a branch is *always* somewhat
drooped: **it is chasing, not holding.**

⚠ **The Δα ≈ 1–3 × 10⁻³ range is background knowledge, not a figure read from a source this
session.** Every paywall hit held exactly these numbers. **Verify against Alméras & Clair 2016,
J R Soc Interface 13:20160550, doi:10.1098/rsif.2016.0550, and Fournier et al. 2014.** Treat the
*scaling* as solid and the *magnitude* as provisional.

### Level-0 approximation — what we would actually implement

Keep your existing controller; cap its authority:

```
κ̇ = −β·(A − GSA) − γ·κ ,    clipped to  |κ̇| ≤ k·Δα·(dr/dt)/r²
```

One new parameter (Δα), one new state (r). Gets the r⁻² collapse, the multi-year time constant, and
the "always slightly drooped" behaviour for free.

⚠ What Level 0 cannot do: reproduce the CW **modulus penalty**. Compression wood is *softer*
(0.91 vs 1.26 GPa), and in gymnosperms removing modulus heterogeneity *increases* correction
efficiency by 24% — the conifer motor partly fights itself. A scalar Δα will over-predict conifer
righting by roughly that much. **Worth a documented 0.8 factor rather than silence.**

## 2.7 ⚠ The Bastien proprioception model has no plagiotropic solution

```
∂C/∂t = −β·sin A(s,t) − γ·C(s,t)          C = ∂A/∂s, A measured from vertical
B = β·L_gz/γ            (balance number; sets both transient and final shape)
steady:  A(s) = A₀·exp(−B·s/L_gz)      tip angle = A₀·e^(−B)
```

Measured B: **0–10, most values 2–5**, across 11 species/organs.

**The only equilibrium is A = 0. Vertical. There is no plagiotropic solution.** The authors say so
themselves, verbatim:

> *"Some organs align in a direction different from that of gravity, called the gravitropic
> set-point angle (GSA)… **the AC model has not been tested for non-orthogravitropic organs.**"*
>
> Bastien, Douady & Moulia 2015, PLoS Comput Biol 11(2):e1004037, doi:10.1371/journal.pcbi.1004037
> · Bastien, Bohr, Moulia & Douady 2013, PNAS 110(2):755–760, doi:10.1073/pnas.1214301109

They propose the patch `−β·A → −β·(A − GSA)` and explicitly do not validate it. Their actual 2015
extension is to **light**, not plagiotropy — and note the structure: the light term introduces a
non-zero attractor via a second *external* field, not an internal reference angle.

⚠ **And the patch conflicts with the AGO mechanism.** The two literatures disagree about *what a set
point is*: a shifted internal reference (Bastien's untested patch) versus a null point of two
antagonistic auxin fluxes (Kepinski). **They predict different behaviour under perturbation** — under
auxin manipulation the AGO model says the angle moves, the shifted-reference model says it does not.
**For an auxin engine, the AGO formulation is the one with a mechanism underneath it.** Do not paper
over this.

**Proprioception is a complement to a GSA, not a replacement.**

## 2.8 Measured angles — and ⚠ the convention trap that will break your calibration

**"Branch angle" means at least four different things and papers routinely do not say which:**

1. **insertion angle** at the stem (forest mensuration, first ~10 cm) — closest to the *set point*
2. **chord angle**, base to tip (TLS, remote sensing) — set point *minus accumulated droop*
3. **tip tangent** (biomechanics) — set point minus *full* droop
4. **angle between two daughter branches** at a bifurcation (some TLS papers) — a different quantity

On our own mid-crown branch at E = 2 GPa these differ by exactly the droop computed above:

```
insertion 0°      chord −11.2°      tip tangent −21.9°
```

**A dataset that does not state its convention cannot calibrate a set point, because the difference
between conventions IS the quantity you are trying to separate out.** Anyone fitting a GSA to TLS
chord angles is fitting set point + droop and calling it a set point. TLS methods also carry RMSE
3.6–4.2° (manual) to 9.3–10.6° (automated), and angle measured at different points along a curved
branch varies by up to 20° — comparable to the entire signal.

**What we could get:**

| taxon | value | convention |
|---|---|---|
| *Cunninghamia lanceolata* var. *lanceolata* | **66.6° mean per tree** (54.7–82.0, SE 8.1); 96% of branches 30–90° | from stem axis above; 90° = horizontal |
| *C. lanceolata* var. *Luotian* | **108.8° mean** (95.7–117.3, SE 6.7); 53% at 105–135° (drooping) | ″ |
| ″ crown-depth gradient | **~40–45° at apex → 90–100° (lanceolata) / ~125° (Luotian) at base** (log fit R²=0.73 / linear R²=0.44) | ″ |
| Douglas-fir plantlets (topophysis) | 18° (centre-derived buds), 45° (basal cotyledon), 55° (plantlet tops), 72° (adult-origin) → 34° after grafting | from vertical |
| Norway spruce | elevation angle **decreases with branching order** and with more recent shoots; **divergence angle independent of order** | — |
| Arabidopsis lateral root (for the AGO model) | 63° ± 7 | from vertical |

> Wu et al. 2019, J Forestry Res, doi:10.1007/s11676-019-00901-4 · Timmis, Ritchie & Pullman 1992,
> PCTOC, doi:10.1007/BF00034351 · Pirochtová & Barták 1991, Lesnictvi 37(3):233–243

**The Cunninghamia crown-depth gradient is the single most useful conifer number here** — and note
it is confounded: age, self-weight and reaction wood all covary with crown depth. **With your full
mechanics, part of that gradient should come out free.** That is a test, not just a target.

⚠ **Well-sourced negative: there is essentially no GSA literature on conifers, and no published
dataset separates leader from lateral GSA in a conifer.** The best target if you want real numbers
is Gilmore & Seymour 1997, Tree Physiol 17(2):71–80 — 39 *Abies balsamea* trees, four canopy
positions, branch angle explicitly modelled by position. Paywalled; get it through a library, then
**check its convention before fitting anything.**

⚠ **Nobody has measured the active/passive angle split in a field conifer.** Closest: Huang, Hung &
Kuo-Huang 2010 (Trees 24:1151, doi:10.1007/s00468-010-0491-0) on Taiwan red cypress — spring-back
released-strain measurements, asymmetric growth strain dominant, and **defoliation reverses the
direction of bending** (leaved branches bend down, defoliated go up). That is the cleanest evidence
the observed angle is a live balance. Alméras, Gril & Costes 2002 gives a real passive-only
decomposition but on apricot. ⚠ Wood also creeps — viscoelasticity accounted for a third of residual
error over one season — so a clean active/passive split may be **ill-posed over multi-year
timescales.** That is a substantive reason the measurement doesn't exist, not an oversight.

**Snow, computed** (mid branch, E=2 GPa): +1 kg → −33.5°, +2 kg → −43.2°, +4 kg → −57.6°. A few kg
roughly doubles the droop. It is elastic, transient, and **not part of the set point** — if you ever
calibrate against winter photographs you will fit the wrong parameter.

---

# Part 3 — Bonus questions

## 3.1 Parallel venation: your premise is right, your conclusion is wrong

**The invariance argument holds only for the case that never occurs.** Canalisation traffic
statistics are invariant under *isotropic* rescaling **when every length parameter rescales too**.
They are *not* invariant under (i) anisotropic stretch, or (ii) any stretch when the model carries
absolute length scales — and canalisation models do: the source birth distance `b_v`, inter-source
distance `b_s`, and kill distance `d_k` are fixed parameters, not fractions of domain size.

More importantly, **the pattern is not completed on a domain of final aspect ratio and then
stretched.** It is completed on a domain that is short in the proximo-distal axis, and the stretch
that follows is nearly pure P-D.

> *"The diversity of vein patterns in nature is truly astounding, but that diversity may result not
> from different vein patterning mechanisms but from different leaf growth patterns superimposed on
> a single vein patterning mechanism."*
>
> Robil & Scarpella 2026, J Exp Bot 77(12):3485–3500, doi:10.1093/jxb/erag109

The decisive geometric fact [D]: in monocots, *"lateral veins branched off the base of the midvein
and formed concentric arches"* — contrasted with reticulate leaves where laterals branch throughout
the midvein's length. **All laterals branch within a short basal window because, at the moment they
branch, the entire primordium is that window.**

⚠ **But the intercalary meristem is not the agent of parallelism.** It supplies length, not topology.
What makes the pattern parallel is that the patterning window **closes while the primordium is still
short in P-D** — too short to fit a second generation of branching.

⚠ **And note the prior art's cheat:** Runions et al. 2005 does produce parallel venation, but by
seeding the answer — *"a row of initial vein nodes was located at the leaf base, instead of the usual
single node."* By your own criterion that is a documented failure, not a mechanism.

**Timing: all longitudinal veins are laid down in the primordium, by P5** [D]:

| vein rank | stage | direction |
|---|---|---|
| midvein | **P1** | — |
| lateral (major) veins | **P2–P4** | acropetal within the primordium |
| rank-1 and rank-2 intermediates | **P3–P5** | basipetal |
| transverse/commissural + tip and base anastomoses | **by end of P5** | closes the network |

> Perico, Tan & Langdale 2022, New Phytologist 234(3), doi:10.1111/nph.17955

**Answer to your explicit question: veins are initiated essentially all at once in the primordium,
in a stereotyped rank order — NOT continuously at the base as tissue is produced.** The full
longitudinal complement is fixed before the long basal-growth phase begins. Corroborated: larger
primordia give more longitudinal veins (Thirulogachandar et al. 2017, Plant J, doi:10.1111/tpj.13590).

### The growth zone, if you need it [D]

Eulerian frame, `x` = distance from base: `v(x)` material velocity, `REGR(x) ≡ ∂v/∂x`,
`LER = ∫₀^L REGR dx`. Cells pass through a **spatially fixed** zone exactly once — that is why a
grass leaf is a stationary factory producing an ever-longer product.

Maize measured values: LER 3.0 ± 0.1 mm/h; division zone **9–30 mm**, total growth zone
**30–90 mm**; mature epidermal cell length 134 ± 6 µm; cell production 22 ± 2 cells/h. ⚠ The 9–30 mm
spread is **real disagreement across labs**, not noise — ligule vs true attachment point, epidermis
vs whole tissue, mitotic-figure vs cell-length criterion, genotype. **Do not hard-code a zone
length.**

Two gifts, both sourced: **REGR is separable in temperature** — `REGR(x,T) = f(T)·g(x)`, shape
temperature-invariant from 13–34 °C — and water deficit is **additive, not multiplicative**.

**The number that matters: growth anisotropy.** Meristem longitudinal RGR ≈ **7×** lateral;
elongation zone lateral ≈ 50% of longitudinal, dorso-ventral ≈ 25%. All three stop simultaneously.

> Ben-Haj-Salah & Tardieu 1995, Plant Physiol 109(3):861–870 · Sprangers et al. 2020, Front Plant
> Sci 11:1163, doi:10.3389/fpls.2020.01163 · Silk & Erickson 1979, J Theor Biol 76:481–501

### Actionable: two rules, no new free parameters

1. **Close the patterning window while the primordium is still short in P-D.** Concretely: no second
   generation of branching while the P-D extent is below ~2·`b_v`. Below that, every new source is
   captured by an existing strand and *extends* it; above it, sources survive far enough from all
   veins to nucleate a branch. **This is the criterion separating a fan from a net, and it is
   computable from `b_v` and primordium extent — not hand-set.** [OURS — testable, not from a paper]
2. **Then apply strongly anisotropic growth from a basal zone**, κ_PD/κ_ML ≈ 7 in the division zone,
   ≈ 2 in the elongation zone. Implement the intercalary meristem as a **lineage-copying operator**:
   cells in the fixed basal zone divide transversely and daughters inherit their file's identity.
   Do *not* implement it as "canalisation into newly produced tissue."

**Three things this will not give you for free:**

- **The strap silhouette** — comes from *where the primordium is initiated* (a band straddling
  concentric domains around the apex), not from the growth field. If you initiate primordia as a
  small disc on a flat apex you get a stretched disc, not a grass leaf. (Richardson et al. 2021,
  Science 374(6573), doi:10.1126/science.abf9407)
- **Commissural rungs** — need a separate rule: they form *after* longitudinal bundles mature, by
  mature-bundle → mature-bundle lateral induction, not by canalisation from a source. (Sakaguchi &
  Fukuda 2008, J Plant Res 121(6):593–602)
- **⚠ Correct medio-lateral vein spacing — which may simply not be a canalisation output in
  grasses.** M-L spacing is *"pre-patterned prior to accumulation of the PIN1a auxin transporter"*,
  and procambial initials are *"distinct at inception"* by marker identity. **If your spacing comes
  out wrong, that is a known open problem in the field, not a bug in your model.** (PNAS 2024,
  doi:10.1073/pnas.2402514121)

⚠ General caution the field itself now makes: *"the concept of canalisation driven solely by PAT is
insufficient to explain the formation of complex venation networks"*, and it *"only simulates
basipetally developing veins and therefore cannot explain the acropetal development of lateral
veins."* Also: canalisation predicts *open* veins, but closed veins are common. (Perico et al. 2022;
Scarpella 2024, Annu Rev Plant Biol 75:377–398)

## 3.2 Conifer whorls: no seasonal clock needed, and there is a clean natural experiment

**A conifer whorl is a pseudowhorl.** Phyllotaxis is spiral throughout; the nodes are clustered in
**space**, not in time of initiation. Decompose into three separable processes:

| process | sets | rhythmic? |
|---|---|---|
| metamer initiation at the apex (spiral, fixed divergence) | node number | continuous within the season |
| organ identity + branch competence per node | *which* nodes can branch | **yes** — cataphyll zone, acrotony |
| internode elongation | node *spacing* | **yes** — near-zero in the cataphyll zone |

**A whorl is a run of consecutive spiral nodes that are simultaneously branch-competent and
unelongated.** This is baked into the architectural literature's own definitions: a *growth unit* is
identified by *"a zone of short internodes and/or cataphylls."* And **rhythmic growth and rhythmic
branching are listed as separate, independent criteria.**

> Barthélémy & Caraglio 2007, *Plant architecture*, Ann Bot 99(3):375–407, doi:10.1093/aob/mcl260

**Not bud release.** The buds are formed as a cluster in the first place — "a terminal bud with a
whorl of subterminal buds about its base." Apical dominance modulates which of them elongate, but
does not create the cluster.

### Does it need a seasonal clock? No — three lines of evidence [D]

**(i) Whorls track flushes, not years.** Tropical pines: *"generally from two to four such periods
of growth occur annually"*, each followed by a new terminal bud cluster and a new whorl. 2–4 whorls
per year in aseasonal conditions. (The forestry rule of thumb that one whorl = one year holds only
for monocyclic temperate conifers.)

**(ii) ⭐ The decisive natural experiment: continuous growth ⇒ ZERO whorls.** *Foxtailing* — the
shoot elongates without interruption, fails to set buds, and produces **no lateral branch whorls at
all**, while initiating nodes at full rate (a Monterey pine foxtail produced ~3200 needle fascicles
in 5 years of continuous growth). Recorded in a dozen *Pinus* species. **Remove the rhythm and the
whorls disappear even though node production continues.** That is your control experiment, already
run by nature.

> FAO *Unasylva* 99, *Shoot growth and form of pines in the tropics*

**(iii) The rhythm is endogenous.** Oak under constant conditions (23 ± 1 °C, 16/8, 75% RH) shows
successive growth/rest phases with a fixed period. ⚠ The cited paper gives both "18–22 d" and
per-cycle values of 34–37 d and 27–29 d, which we could not reconcile from the accessible text.
(Herrmann et al. 2015, J Exp Bot 66(22):7113–7127)

### Recommended model: one oscillator, two readouts [OURS — ingredients sourced, combination not]

- Constant-rate spiral phyllotaxis. **Never modulate the initiation rate.**
- Oscillator phase `φ(t)` gates **internode elongation**: `l = l_max` in extension, ≈ 0 at rest.
- The **same** `φ(t)` gates **branch competence**: axils initiated near the end of the extension
  phase become branch-competent; others do not.

Reproduces: a whorl at the distal end of each increment immediately below the terminal bud; bare
stem between whorls; multiple whorls per year under a faster oscillator; and **zero whorls if the
oscillator is off** — matching the foxtail control. No seasonal clock, only an endogenous relaxation
oscillator.

Conifer branching is also **acrotonic** — only distal axils of a growth unit produce branch buds — so
even with uniform internodes you would get distal clusters. Both effects act in the same direction.

### Branches per whorl

`n = (nodes inside the competence window) × (fraction that develop)`. Because phyllotaxis is a
continuous spiral with fixed divergence, the count is a readout of **window width**, not of
phyllotaxis. **Phyllotactically enumerated, not phyllotactically determined.** The regulated
quantity is window width, which scales with apex size and shoot vigour.

Evidence it is not independently regulated [D]: branch number per whorl correlates with needle
primordium count in the terminal bud and with shoot vigour, and primordium counts decline
monotonically from whorl 1 to whorl 4 down the crown (Colombo & Templeton 2006, Trees 20:633–641).
Hidden semi-Markov models resolve a *Cedrus* annual shoot into "proximal unbranched zone, whorl
zone, interwhorl zone" and predict branch location from **annual shoot length alone** (Courbet,
Sabatier & Guédon 2007, Ann For Sci 64(7):707–718).

⚠ **Contrast, and do not transfer it:** conifer **cotyledon** whorls *are* simultaneous rather than
spiral, and there the number genuinely falls out of a reaction–diffusion wavelength —
`n_c ≈ C/λ` from embryo circumference and inter-cotyledon spacing, with NPA disrupting *amplitude*
but not *wavelength*. That is the "falls out of X computable from Y" answer — **but it is for
cotyledons, not branch whorls.** (Holloway, Rozada & Bray 2018, Ann Bot 121(3):525–534)

⚠ Could not obtain a sourced mean/range for branches per whorl. The data exist in Trincado &
Burkhart 2009 (Can J For Res, loblolly pine, 34 trees, destructive whorl sampling) — table not
extractable.

---

# Part 4 — Ranked changes

**Do first, cheap, independent of everything else:**

1. **Fix the Murray exponent for self-supporting axes** (§1.8). r³ for petioles and distal twigs;
   toward r² for trunks and load-bearing scaffold. You are currently over-tapering every trunk.
2. **Replace `exp(−d/λ)` with a sub-linear power law** `m(d) ∝ (d/d₀)^(−p)`, p ≈ 0.5, as an interim
   (§1.1). One line. Converts bottlebrush → paraboloid. Note it in the docs as a placeholder for #4.
3. **Carry Γ = ρgL³/(Ed²) per organ** and branch the controller on it (§2.2). Γ ≳ 0.5 → dynamic;
   Γ ≲ 0.1 → static set point + droop.

**The two experiments worth running before adding any second signal:**

4. **Borchert–Honda partition with Q ← subtree auxin flux (or Murray cross-section), λ = 0.5**
   (§1.6 i). Nobody has tried this. It is an afternoon's work in your engine and you can answer it
   faster than the literature can.
5. **Compute the AGO directly from per-wall PIN** (§2.3). Statocyte layer per axis, gravity-driven
   PIN targeting plus opposing constitutive bias, auxin-sensitive with the sign **more auxin → more
   vertical**. This is the one genuine derivation available in the whole brief.

**Then:**

6. **Read the canalised PIN field as persistent per-branch conductance** setting sustained growth
   rate (§1.6 ii, Nahas 2024). Keeps vigour an output of the chemistry.
7. **Add the long/short shoot bimodality** with a threshold on that conductance (§1.6 iii). Discrete
   switches sharpen taper better than graded multipliers.
8. **Rate-limit the angle controller by `k·Δα·(dr/dt)/r²`** (§2.6 Level 0). One parameter, one state;
   buys the multi-year lag and the permanent slight droop.
9. **Make λ (or its equivalent) decline with tree size** — excurrent form is age-dependent (§1.5).
10. **Add an abscission rule.** The vigour feedback loop runs away by construction; in real trees the
    losing branch dies (§1.6).
11. **Parallel venation:** close the patterning window at P-D extent < 2·`b_v`, then anisotropic
    growth κ_PD/κ_ML ≈ 7 with a lineage-copying basal zone (§3.1).
12. **Whorls:** one oscillator, two readouts — gate internode elongation *and* branch competence with
    the same phase (§3.2).

---

# Part 5 — What is genuinely a parameter, and why

Each of these is a hand-set value we would now *defend* rather than apologise for, with the citation
for why no mechanism is reachable.

| parameter | why it is irreducible here |
|---|---|
| **Borchert–Honda λ** | Nobody has derived it. Pałubicki et al. state plainly: *"It is not known whether apical control in nature is exerted through competition for resources, hormonal control, or both."* Set λ = 0.5 and see what you get. |
| **TAC1-like branch spreading** | Genuinely light-gated. `tac1` shows no altered gravitropic bending, is induced by light, phenocopies shade, and interacts with an LHCB homolog. You have no light field. (Waite & Dardick 2020, Sci Rep) |
| **EGT1-type mechanical AGO** | An antigravitropic component operating through cell-wall stiffness with no auxin route — no auxin induction, no AuxRE, auxin signalling intact in mutants. (Fusi et al. 2022, PNAS) |
| **Conifer meristem identity (orthotropic/plagiotropic flag)** | *"Orthotropic begets orthotropic."* Architectural change happens by reiteration from new meristems, not by re-setting an angle. Plagiotropic axes are a different organ identity with different phyllotaxis. (Tomlinson & Murch 2009) |
| **Early rootward bending of young laterals** | Stages I–III are gravity-independent differential cell proliferation under **cytokinin** and TCP1 control, with gravitropic machinery present but overridden. A young lateral's angle is not a GSA at all. (De Angelis & Kepinski 2023) |
| **Crown recession / cylindrical lower crown** | Light-driven self-pruning. Requires a light field. Target the open-grown paraboloid instead. |
| **Medio-lateral vein spacing in grasses** | Pre-patterned before PIN1a accumulation; procambial initials distinct at inception by marker identity. May not be a canalisation output at all. (PNAS 2024) |

---

# Part 6 — Open threads and things we could not verify

**Could not retrieve (paywall / captcha / robots):**

- Mason et al. 2014 PNAS full text — every route blocked. Timescales come from replications and
  reviews that quote it and agree with each other.
- Gilmore & Seymour 1997 Tree Physiol — **the best single conifer branch-angle dataset**; 39 *Abies
  balsamea*, four canopy positions. Worth a library request.
- Mäkinen et al. 2003 (Norway spruce) and Mäkinen & Colin 1998 (Scots pine) branch-angle
  coefficients.
- Alméras & Clair 2016 / Fournier et al. 2014 — the numeric maturation-strain values. **The Δα
  magnitude in §2.6 is provisional until these are checked.**
- Trincado & Burkhart 2009 — branches per whorl table.
- Branch-autonomy primaries (Sprugel 2002, Lacointe 2004, Hoch 2005) — abstracts only.
- Bertheloot et al. 2020 — the explicit α equation is an embedded image in the preprint.

**Citation to verify:** the Am J Bot 2002 89(11):1764–1771 paper *"Is auxin the repressor signal of
branch growth in apical control?"* — one sweep attributed it to Cline & Sadeski, the other to Wilson
& Gartner. Volume, pages and DOI agree across both. ⚠ **We ran out of web-search budget before
resolving it. Check the author line before citing.** Note there is definitely *also* a Wilson &
Gartner 2002 in Tree Physiol 22(5):347–353 (the phloem-girdling paper, §1.3) — two different 2002
papers, and that is very likely the source of the confusion.

**Verified this session:** the McCulloh et al. 2003 Murray's-law quote (§1.8), verbatim against the
paper. The cantilever solver in §2.1 was validated three ways (analytic small-deflection limit;
Bisshopp & Drucker 1945 large-deflection tables; measured base bending stress from Evans et al.
2008).

**Worth reading, not retrieved:** Alonso-Serra et al. 2026, *On growth and flow: hydraulic aspects of
aboveground meristems*, New Phytologist, doi:10.1111/nph.70713 — very recent and directly on §1.6.

**Contested points we deliberately did not resolve:**

- Whether canalisation is causative for bud *release* or for sustained *outgrowth*. Two labs now
  point at outgrowth, against the original model — and against how the sim currently uses it.
- Whether the AGO is genuinely angle-independent. It is a modelling assumption; the 2025 PNAS paper
  found *all* graviresponse components angle-dependent.
- Rice LAZY1 as a PAT-magnitude regulator (2007) vs LAZY as a PIN-polarity regulator (2020). Not
  reconciled anywhere.
- Whether sink-strength allocation beats a random-walk null at all (Thompson 2024).

**The single most valuable unmeasured number:** the proximo-distal length of a maize P5 primordium —
the domain size at patterning close. The whole §3.1 argument hinges on it, and it is directly
measurable.
