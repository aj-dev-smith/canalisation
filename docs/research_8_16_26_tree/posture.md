# Reaction wood and posture control — what a real branch does that a statocyte set point cannot

Literature sweep, 2026-08-17. Flags: `[D]` demonstrated by the cited paper · `[I]` inferred/asserted
but not shown · `[OURS]` my construction, in no paper · `⚠` contested, or primary source unreadable.

**The one-line answer.** The engine's statocyte set point is the correct model of *where an axis
wants to point*. Reaction wood is not a second opinion about the angle — it is the **only motor
that still exists once an axis has stopped elongating**, and its capacity to act falls as `D⁻²`.
That single scaling law is the whole story of why a real tree looks like a tree and the engine's
sapling does not, and it is four lines of code on a quantity the engine already tracks.

---

## 0. The headline number, because everything below is a corollary of it

`[D]` **Coutand, Fournier & Moulia 2007, Plant Physiology 144:1166–1180** (poplar trunks) give the
curvature increment produced by a ring of new wood as

> dθ/ds = 4α · dr/r²

restated by `[D]` **Alméras, Ghislain, Clair, Šećerović, Pilate & Fournier 2018, *Trees* 32** ("Quantifying
the motor power of trees", their Eqs. 24 and 27) in diameter form as

> **dC/dD = −4 · Δα · f / D²**  and, integrated,  **ΔC = 4 Δα f (1/D₁ − 1/D₀)**

where `Δα` is the *difference in maturation strain between the two sides* of the ring, `D` the
diameter, and `f` a form factor (`f ≈ 1` unless growth is strongly eccentric — `[D]` Alméras,
Thibaut & Gril 2005, *Trees* 19:457–467 showed the eccentricity motor is the weaker one).

The same law appears in `[D]` **Alméras & Fournier 2009, J. Theor. Biol. 256:370–381** and is the
core of `[D]` **Fournier, Dlouhá, Jaouen & Alméras 2013, JXB 64:4793–4815**, which packages it into
two named traits:

- **MV** (tropic motion velocity) `= −4 Fm Δα/D² · dD/dt` — curvature rate, m⁻¹ s⁻¹.
- **PC** (posture control, a.k.a. gravitropic performance) `= −(dC_m/dD)/(dC_g/dD)`, with the
  gravitational half `dC_g/dD = 16(1+b) F_g sin φ · (ρ_T g/E) · H²/D³` (⚠ exponents read off an OCR'd
  PDF; my own beam derivation reproduces `H²/D³` and the leading 16, so I am confident, but the
  `(1+b)` allometry term I have not independently checked).

  Reduced: **PC ∝ E · Δα · D / (ρ_T g sin φ · H²)**. `PC = 1` is neutral, `PC > 1` righting,
  `PC < 0`… `PC = 0` means the tree can no longer react at all. Measured `PC` across tropical
  functional groups spans roughly **5–30** (Fournier et al. 2013 Fig. 4).

**What this says, in the project's own vocabulary: posture is not a shape, it is a rate, and the
rate is a function of `D`, `H`, `E` and one wood property.** Every one of those except `Δα` is
already in the engine.

---

## 1. Compression wood: induction, sign, magnitude, timescale

### 1a. The signal is *not* demonstrably auxin, and this is a hard negative result

`[D]` **Hellgren, Olofsson & Sundberg 2004, Plant Physiology 135:212–220** mapped endogenous IAA by
tangential cryosectioning + GC-MS across the cambial region in aspen **and Scots pine** during
gravistimulation. Verbatim from the abstract: *"reaction wood is formed without any obvious
alterations in IAA balance. This is in contrast to gravitropic responses in roots and shoots where
a redistribution of IAA has been documented."* They also found cambial growth stimulated on the
tension-wood side **without** an IAA increase.

`[D]` **Sundberg, Tuominen & Little 1994** (via Groover 2016): a ring of auxin-transport inhibitor
on *Pinus sylvestris* produced compression wood *above* the ring — consistent with the "high auxin
→ CW" story — but the measured auxin concentration above the ring was **lower than controls**. The
classical experiment and its own control disagree.

`[D]` **Groover 2016, New Phytologist 211:790–802** (Tansley review) is the standing summary:
applied auxin on the *lower* side of a gymnosperm stem stimulates CW, applied auxin on the *upper*
side of an angiosperm inhibits TW — *"the general notion from these experiments is that auxin
depletion stimulates tension wood while auxin increase stimulates compression wood. Conflicting
results have been obtained by measurement of endogenous auxin concentrations."*

He then gives three reasons the application experiments may be uninterpretable, of which the
sharpest is `[D]` **Gerttula et al. 2015, Plant Cell 27:2800–2813**: the gravity-sensing cells are
**peripheral to the cambium**, so external auxin arrives at the wrong tissue. Gibberellin and
ethylene are both implicated too (GA induces TW and can convert weeping cherry to upright — `[D]`
Nakamura et al. 1994, via Groover).

**Consequence for the engine: do not model compression wood as "high auxin makes CW".** It is the
one place in this brief where the project's existing chemistry would be the *wrong* answer, and it
is wrong in a way the literature has already checked directly in a pine.

### 1b. Where the sign *does* come from, and it is machinery the engine already has

`[D]` **Gerttula et al. 2015, Plant Cell**: in young *Populus* stems, starch-filled amyloplasts sit
in the endodermis with PIN3 on the plasma membrane. **In older stems the endodermis and cortex are
sloughed off, and cells in the secondary phloem acquire statoliths and PIN3 expression instead.**
On tilting, ptPIN3 relocalises toward the ground — and because the tissue geometry differs top vs
bottom, the *same* relocalisation directs auxin inward to the cambium on the top and outward to the
cortex on the bottom, which a DR5:GUS reporter confirms.

`[I]` So the woody stem keeps a statocyte ring; it just migrates outward with the cambium. **The
engine's existing gravitropic set-point machinery is the right object and does not need replacing —
it needs to survive into secondary growth and to emit a *side* rather than a *bend*.** That is the
cheapest possible bridge from what exists to what is missing.

⚠ Note the honest gap: Gerttula is *Populus*, an angiosperm. I found no equivalent statolith/PIN3
localisation study in a conifer cambium. The conifer literature is transcriptomic (`[D]` Villalobos
et al. 2012, BMC Genomics 14:768, radiata pine branches) and does not localise the sensor.

### 1c. The sign flips *before* vertical — the woody motor is proprioceptive too

This is the most interesting single observation I found, and it is old.

`[D]` **Archer & Wilson 1973, Plant Physiology 51:777–782**: in *Pinus strobus*, compression wood
begins forming on the **upper** side while the leader is still **7–12° from vertical**.

`[D]` **Yoshizawa, Okamoto & Idei 1986, Wood and Fiber Science 18(4):579–589** (five conifer species
tilted to 45°) confirm and extend it: CW appears on the opposite side *in concordance with* its
disappearance on the original underside; sensitivity on the underside "declines or is lost" under
prolonged inclination at deviation angles of **10–20°**.

`[OURS]` A pure graviceptive rule (`sign = sign(sin φ)`) cannot do this — it would keep making CW
until φ = 0 and then overshoot. Reversing at 7–12° is exactly the behaviour of the AC model's
proprioceptive term `−γC` reaching parity with `−β sin A`. **The autotropic/proprioceptive half of
posture control is present in the wood motor, not just in elongating tissue**, and it is why real
conifers do not oscillate about vertical.

### 1d. Magnitudes, with units

From `[D]` **Alméras & Clair 2016, J. R. Soc. Interface 13:20160550** (critical review):

| wood | longitudinal maturation strain | stress | MFA |
|---|---|---|---|
| tension wood (angiosperm) | ≈ **−3000 µstrain** (−0.3 %, contractile) | up to **+50 MPa** tensile | < 5° |
| normal wood | ≈ **−500 µstrain** | ~ −10 MPa tensile | 10–20° |
| **compression wood (conifer)** | ≈ **+2000 µstrain** (+0.2 %, expansive) | **−20 MPa** compressive | **30–40°** |

The −500 µstrain figure for normal wood is the one `[D]` Alméras et al. 2018 assume as a fixed
parameter, citing Clair et al. 2006/2013 and Fournier 1994 — i.e. it is stable enough across species
to hardcode. Their TW reference value is −5000 µstrain with a measured range **−1300 to −7200**.

`[OURS]` For a conifer, therefore, **Δα = α_CW − α_NW ≈ +2000 − (−500) = 2500 µstrain = 2.5 × 10⁻³**.
That is the single number the engine would need.

**⚠ A conifer-specific trap:** `[D]` Fournier et al. 2013 point out that CW's high MFA gives it a
**lower** E, and the motor product is `E·Δα`, not `Δα` alone — so in softwoods there is a genuine
trade-off between stem stiffness and motricity that hardwoods do not have. Do not copy a tension-wood
`Δα` into a conifer and expect the same motor.

### 1e. Timescales

- First movement in a tilted young conifer: within **3 days**, and it occurs in the *current shoots*
  (i.e. primary growth) `[D]` Yoshizawa et al. 1986, citing Yoshizawa et al. 1986b.
- Righting is **basipetal**: it starts at the top and proceeds down. Tilted in late May, *Picea*,
  *Abies* and *Cryptomeria* were largely upright by August–September; *Chamaecyparis* and *Larix*
  were still incomplete in October `[D]` Yoshizawa et al. 1986.
- **"In *Abies*, almost no recovery occurred in the basal portion because of its large diameter."**
  `[D]` — the `D⁻²` law observed directly, in one sentence, in 1986.
- In poplar `[D]` Coutand et al. 2007: ~7 d latency, gravitropic curving over 2–3 weeks, autotropic
  decurving beginning *before* any part overshot vertical, whole cycle ~100 days; radial growth peaks
  **lead** curvature peaks by 7–20 days because maturation takes 1–2 weeks.

---

## 2. The Alméras & Fournier framework and the `D⁻²` collapse

`[D]` **Alméras & Fournier 2009** abstract, verbatim on the limit question: *"By analyzing dimensional
effects, we show that the necessity for gravitropic correction might constrain stem allometric growth
in the long-term… gravitropic performance limits the increase in height of tilted stem and branches.
The performance of this function may thus limit the slenderness and lean of stems, and therefore the
ability of the tree to capture light in a heterogeneous environment."*

So the published answer to "what limits how big a branch can still right itself" is: **`PC` falling
through 1**, with `PC ∝ E Δα D / (ρ_T g sin φ H²)`. A branch loses when it lengthens faster than it
thickens, weighted by the load it carries.

`[D]` Alméras et al. 2018 add the empirical half: measured change in curvature is strongly correlated
with initial radius (R² = 0.18 on its own) and essentially uncorrelated with relative radius increment
(R² = 0.013) — *"the smaller the section, the larger the change in curvature, irrespective of the
magnitude of maturation strain."*

### The arithmetic on the engine's own specimen `[OURS]`

Using Δα = 2.5 × 10⁻³, f = 1, and the engine's stated dimensions (trunk D = 9.5 cm; `WORLD.unitM`
= 0.0625 m/unit):

| axis | `dC/dD` (m⁻¹ per m) | per 5 mm (trunk) / 1 mm (branch) of Δ*D* | angle over a 1 m / 0.4 m segment |
|---|---|---|---|
| engine trunk, D = 9.5 cm | 1.11 | 5.5 × 10⁻³ m⁻¹ | **0.32°** |
| a 1 cm branch | 100 | 1.0 × 10⁻¹ m⁻¹ | **2.3°** |
| a mature 30 cm trunk | 0.11 | 5.6 × 10⁻⁴ m⁻¹ | **0.03°** |

**Ninety-fold more motricity in the branch than in the trunk, from `(9.5/1)²` alone.**

And a consequence I did not find stated anywhere, which falls straight out of Alméras et al.'s Eq. 27
`[OURS]`: **an axis has a finite lifetime curvature budget.** Integrating from `D₀` to `D₁ → ∞`,
`|ΔC|_max = 4Δα/D₀` — independent of how long it grows. Over a 0.5 m span:

| D₀ at which the axis started reacting | total angular correction available, ever |
|---|---|
| 2 mm | 143° |
| 5 mm | 57° |
| 10 mm | 29° |
| 20 mm | 14° |

**A branch that does not fix its posture while it is thin never will.** That is a shape-generating
law with no shape in it, and it is the single most engine-shaped result in this brief.

`[D]` Also worth knowing before assuming wood is the whole motor: **Clair et al. 2019, New Phytologist**
("the bark side of the force") showed the inner bark contributes measurable righting stress in nine
tropical species, by a *different* mechanism (wood radial pressure against a trellis structure in the
inner bark, not cell-wall maturation). It is a second motor, not in any model I found.

---

## 3. Proprioception: the AC model has no plagiotropic solution, and this is load-bearing

`[D]` **Bastien, Bohr, Moulia & Douady 2013, PNAS 110:755–760** — the AC model:

> ∂A/∂t = −β sin A(s,t) − γ C(s,t)

β = graviceptive sensitivity, γ = proprioceptive sensitivity, A = angle from vertical, C = curvature.
A single dimensionless **balance number `B = β L_gz / γ`** governs everything. `[D]` **Bastien, Douady
& Moulia 2014, Front. Plant Sci. 5:136** (the ACĖ model, adding growth) report **B measured across 11
species at 0 to 10, most between 2 and 5.**

`[OURS]` The steady state is trivially derivable: `∂A/∂t = 0` for all `s` requires `C = 0` (straight)
and `sin A = 0` — i.e. **vertical, and nothing else.** There is no plagiotropic fixed point. The
graviception+proprioception pair is a straightening machine; it cannot hold an angle.

`[D]` **Moulia, Badel, Bastien, Duchemin & Eloy 2022, New Phytologist 233:2354–2379** confirm the
practical corollary: *"when the balance number is small, the axis displays low curvature and stays
very inclined, which can **mimic** a plagiotropic branch although the gravitropic set-point angle is
vertical."* (⚠ this sentence reached me through a search index rather than the PDF — HAL, Wiley and
OUP all refused the fetch — but it is quoted consistently and matches the derivation above.)

**Nothing published since supplies a plagiotropic equilibrium to the AC model itself.** What supplies
it is a separate mechanism bolted alongside:

`[D]` **Roychoudhry, Del Bianco, Kieffer & Kepinski 2013, Current Biology 23:1497–1504** — the
**antigravitropic offset (AGO)**: lateral branches carry an auxin-dependent growth component acting
*against* graviception, and *"the GSA of lateral roots and shoots is dependent upon the magnitude of
the antigravitropic offset component."* Displace the branch either way and the imbalance restores the
angle. `[D]` **Kawamoto & Morita 2022, New Phytologist** review it and note that graviception and the
AGO are believed to **share the same statocytes**.

**This is exactly the engine's mechanism.** The engine's antigravitropic carrier on the upper wall,
balanced against gravitropic PIN following statoliths to the lower wall, *is* the AGO, derived rather
than stated. That is a genuine convergence with the primary literature and worth writing down.

⚠ **One direction to double-check.** The engine's rule is *more auxin → more vertical*. Roychoudhry
et al. state that auxin sets **the magnitude of the AGO** (via TIR1/AFB–Aux/IAA–ARF signalling *inside*
the gravity-sensing cells) — and a larger AGO means a *larger* GSA, i.e. **more horizontal**. If that
reading is right the engine's sign is inverted relative to the primary source. I could not open the
figures (Elsevier 403) and the secondary summaries I could read contradict each other, so I flag this
`⚠` rather than asserting it. Given the project's own note that inverting this flips the whole
silhouette, it is worth one careful read of that paper's Figure 4 before anything is changed.

---

## 4. The minimal curvature-rate law, ready to implement

`[OURS]`, assembled from `[D]` Alméras et al. 2018 Eq. 24, `[D]` Bastien et al. 2013, and `[D]`
Archer & Wilson 1973:

```
per axis station, per step, only where elongation has ceased and D is growing:

  σ   = sign( β·sin(A − A_set) + γ·C )      # WHICH side lays reaction wood
  ΔC  = −σ · 4 · Δα · f · ΔD / D²           # HOW MUCH curvature that ring buys
```

- `Δα = 2.5e-3` (conifer, from §1d), `f = 1`.
- `A_set` is the engine's existing statocyte set point. **The set point supplies the target; the wood
  supplies the motor.** They are not competing models.
- The `γ·C` term is not optional decoration — it is what reproduces Archer & Wilson's sign reversal at
  7–12° and prevents the oscillation a pure `sin` rule would give.
- `ΔC` is **irreversible**: it accumulates into the axis's rest shape. This is the same property
  ROADMAP 0z2 wants for radius, and it wants the same one-line treatment (`store = max(store, new)`
  for radius; `store += ΔC` for curvature). Doing both in one commit is much cheaper than either alone.

**Sign derivability, directly answering the question asked:** `[I]` yes, from machinery the engine
already runs — the statocyte flux imbalance that currently produces the set point produces a *side*
for free, and `[D]` Gerttula 2015 shows a real woody stem does exactly that (statocytes migrate into
the secondary phloem and keep polarising PIN3 downward). `[D]` What is *not* derivable, and must not
be faked, is a claim that CW is induced by an auxin concentration asymmetry — Hellgren 2004 measured
it in pine and it is not there.

---

## 5. Growth stresses / autostress: safe to ignore for looks, and here is the reason

`[D]` **Kübler's** classical field (via `[D]` Alméras & Clair 2016 and `[I]` Brudi's practitioner
review): the trunk periphery sits in longitudinal **tension**, the core in **compression**, magnitudes
of order **10–20 MPa** at the periphery.

`[D]` Alméras & Clair 2016 on what that buys: peripheral tensile prestress raises bending strength by
delaying compression failure on the compressed face, while the balancing core compression sits near
the neutral axis and costs nothing — *"the stem is stronger than the wood it is made of, and a growing
stem can bend considerably more than its non-growing beam equivalent without breaking."*

**`[OURS]` Verdict: ignoring autostress costs the engine nothing visible.** It is a *strength* term,
not a *shape* term. It changes when a stem breaks, and the engine does not break stems. The one place
it would matter is a future storm/breakage feature. The asymmetric part of the same field —
`Δα` — is the shape term, and that is §4.

---

## 6. Crown shape, since the engine's crown is a cone and shouldn't be

Not asked, but it is the deliverable's actual complaint and it has a clean answer.

`[D]` **Duchemin, Eloy, Badel & Moulia 2018, J. R. Soc. Interface 15:20170976** model a crown as a
propagating front with velocity

> U = ψ · (n + α_g v + α_p ℓ)/|n + α_g v + α_p ℓ| + γ κ n

— `n` normal, `v` vertical, `ℓ` mean light direction, `κ` in-plane curvature, `ψ` the locally
intercepted light, `α_g`/`α_p` gravitropic and phototropic intensities. **The model is length-free, so
crown shapes are self-similar attractors of just two numbers.** They map the `(α_g, α_p)` phase
diagram: solutions always have a pointed top; a **pointed bottom requires α_g > 1**; cusps, loops and
flat bottoms occupy named regions; below `α_p + √α_g > −1` no self-similar shape exists at all.

Three things follow for this project. First, **cones are the trivial self-similar solution** of their
equation — so "the crown is a cone" is not a bug so much as the zero-information answer, and the
non-conical shapes require the *light* term. The engine has no light field, which is precisely the
missing input. Second, they explicitly exclude reaction wood: *"the curvature of the 'branches' is only
due to the variation of ψ and ℓ along these trajectories, and not to the bending under self-weight …
or any other global re-orientating mechanisms such as those related to reaction wood."* So this and §4
are independent, additive contributions to crown form. Third, the light term is `ψ`, a *local* quantity
at the front — environmental forcing in the same category as the engine's wind, costing nothing against
the one rule.

⚠ Contrast with `[D]` **Nauber, Hodač, Wäldchen & Mäder 2024, Tree Physiology 44:tpae045**, which
simulates spruce and pine architecture with **14 hand-tuned parameters** including `gravitysense`,
`lightsense` and `proprioception`, manually adjusted per species, with branch angles set directly by a
phyllotaxis pattern. It is the state of the art in FSPM and it is exactly the thing this project exists
not to be. Worth citing in SCIENCE.md as the contrast case.

---

## 7. What nobody has published

- **No plagiotropic equilibrium for the AC/ACĖ model.** Plagiotropy is supplied by a *bolted-on* AGO
  (Roychoudhry 2013) that has never been written into Bastien's dynamical form. Fusing them —
  `∂A/∂t = −β sin(A − A_set) − γC` with `A_set` from a statocyte flux balance — appears to be genuinely
  unwritten. The engine is one term away from it.
- **No statolith/PIN localisation study in a conifer cambium.** Gerttula's result is *Populus* only.
- **No model couples reaction wood to crown shape.** Duchemin et al. 2018 say so in their own text; the
  Fournier/Alméras `PC` framework is per-section and `[D]` Fournier et al. 2013 name it as an open
  challenge: *"In the current definition of integrative traits … branching patterns are included only
  through the load parameters."*
- **The stress-generation mechanism in the cell wall is still unknown.** `[D]` Alméras & Clair 2016
  reject several candidates and cannot select among the four survivors for tension wood; for compression
  wood a lignin-swelling/high-MFA "unified hypothesis" is favoured but *"the motor of this swelling at a
  molecular level is unspecified."* Nothing below the tissue scale is safe to build on.
- **`Δα` is not in any trait database.** `[D]` Fournier et al. 2013 devote a section to this and call
  translating anatomy into `Δα` "an unsolved problem". So the 2500 µstrain figure is a representative
  value, not a species value, and it should be labelled as such wherever it lands.

---

## 8. Simulability verdict, mechanism by mechanism

| mechanism | local chemistry / physics / environment? | verdict |
|---|---|---|
| `dC/dD = −4Δα f/D²` on new rings | **physics**, on `D` the engine already grows | **build it.** ~4 lines, one constant, no shape |
| proprioceptive sign flip (`γC` term) | physics/sensing, local curvature | **build it with the above** — without it the axis oscillates |
| irreversible accumulation of `C` | memory, same category as ROADMAP 0z2's wood | **build both in one commit** — `EI ∝ r⁴` couples them |
| which side lays CW | the engine's own statocyte imbalance | **derivable**, and matches Gerttula 2015 |
| "high auxin induces CW" | — | **do not build.** Falsified in pine, Hellgren 2004 |
| autostress / Kübler field | physics, but a *strength* term | **skip.** No visible cost until stems can break |
| crown profile from tropism balance | environment (a light field) | **the real gap**, and independent of all the above |

**Overall: yes, and cheaply.** Reaction wood is the rare case where the biology reduces to one
published equation with one measured constant, over a state variable the engine already maintains, and
where the mechanism has *no shape in it whatsoever* — it emits a curvature rate, and the silhouette is
whatever falls out. The `D⁻²` term is doing the interesting work: it makes young thin axes agile and
old thick ones frozen, for free, which is most of what separates a tree from a plant pretending to be
one. The one thing to verify before writing any of it is the auxin/angle sign in §3.

---

### Sources

1. Groover A. 2016. Gravitropisms and reaction woods of forest trees — evolution, functions and mechanisms. *New Phytologist* 211:790–802. (Tansley review)
2. Hellgren JM, Olofsson K, Sundberg B. 2004. Patterns of auxin distribution during gravitational induction of reaction wood in poplar and pine. *Plant Physiology* 135:212–220.
3. Gerttula S, Zinkgraf M, et al. 2015. Transcriptional and hormonal regulation of gravitropism of woody stems in *Populus*. *Plant Cell* 27:2800–2813.
4. Sundberg B, Tuominen H, Little C. 1994. Effects of IAA transport inhibitors on compression wood in *Pinus sylvestris*. (via Groover 2016)
5. Wilson BF, Archer RR. 1977. Reaction wood: induction and mechanical action. *Ann. Rev. Plant Physiol.* (loop experiments; via Groover 2016)
6. Archer RR, Wilson BF. 1973. Mechanics of the compression wood response II. *Plant Physiology* 51:777–782.
7. Yoshizawa N, Okamoto Y, Idei T. 1986. Righting movement and xylem development in tilted young conifer trees. *Wood and Fiber Science* 18(4):579–589.
8. Coutand C, Fournier M, Moulia B. 2007. The gravitropic response of poplar trunks. *Plant Physiology* 144:1166–1180.
9. Alméras T, Fournier M. 2009. Biomechanical design and long-term stability of trees. *J. Theoretical Biology* 256:370–381.
10. Fournier M, Dlouhá J, Jaouen G, Alméras T. 2013. Integrative biomechanics for tree ecology: beyond wood density and strength. *JXB* 64:4793–4815.
11. Alméras T, Ghislain B, Clair B, Šećerović A, Pilate G, Fournier M. 2018. Quantifying the motor power of trees. *Trees* 32.
12. Alméras T, Clair B. 2016. Critical review on the mechanisms of maturation stress generation in trees. *J. R. Soc. Interface* 13:20160550.
13. Alméras T, Thibaut A, Gril J. 2005. Effect of circumferential heterogeneity of maturation strain, MOE and radial growth. *Trees* 19:457–467.
14. Clair B, Ghislain B, Prunier J, et al. 2019. Mechanical contribution of secondary phloem to postural control in trees: the bark side of the force. *New Phytologist* 221.
15. Bastien R, Bohr T, Moulia B, Douady S. 2013. Unifying model of shoot gravitropism reveals proprioception as a central feature of posture control. *PNAS* 110:755–760.
16. Bastien R, Douady S, Moulia B. 2014. A unifying modeling of plant shoot gravitropism with an explicit account of the effects of growth. *Front. Plant Sci.* 5:136.
17. Moulia B, Bastien R, Chauvet-Thiry H, Leblanc-Fournier N. 2019. Posture control in land plants. *JXB* 70:3467–3494.
18. Moulia B, Douady S, Hamant O. 2021. Fluctuations shape plants through proprioception. *Science* 372:eabc6868.
19. Moulia B, Badel E, Bastien R, Duchemin L, Eloy C. 2022. The shaping of plant axes and crowns through tropisms and elasticity. *New Phytologist* 233:2354–2379.
20. Duchemin L, Eloy C, Badel E, Moulia B. 2018. Tree crowns grow into self-similar shapes controlled by gravity and light sensing. *J. R. Soc. Interface* 15:20170976. (arXiv:1801.00964)
21. Roychoudhry S, Del Bianco M, Kieffer M, Kepinski S. 2013. Auxin controls gravitropic setpoint angle in higher plant lateral branches. *Current Biology* 23:1497–1504.
22. Kawamoto N, Morita MT. 2022. Gravity sensing and responses in the coordination of the shoot gravitropic setpoint angle. *New Phytologist* 236.
23. Sierra-de-Grado R, Pando V, Martínez-Zurimendi P, et al. 2008. Biomechanical differences in the stem straightening process among *Pinus pinaster* provenances. *Tree Physiology* 28:835–846.
24. Sierra-de-Grado R, Pando V, Voltas J, Zas R, Majada J, Climent J. 2022. Straightening the crooked: intraspecific divergence of stem posture control in a model conifer. *JXB* 73:1222–1235.
25. Huang Y-S, Hung L-F, Kuo-Huang L-L. 2010. Biomechanical modeling of gravitropic response of branches. *Trees* 24.
26. Nauber T, Hodač L, Wäldchen J, Mäder P. 2024. Parametrization of biological assumptions to simulate growth of tree branching architectures. *Tree Physiology* 44:tpae045.
27. Timell TE. 1986. *Compression Wood in Gymnosperms.* Springer. (3 vols; cited throughout the above)
28. Dardick C, Callahan A, Horn R, et al. 2013. PpeTAC1 promotes the horizontal growth of branches. *Plant Journal* (via Groover 2016)
29. Villalobos DP, et al. 2012. Transcriptome profiling of radiata pine branches. *BMC Genomics* 14:768.
