# The shape-prior hunt

An adversarial read of the eight tree briefs (`wood`, `season`, `posture`, `mechano`,
`architecture`, `light`, `hydraulics`, `auxinwood`), asking one question of every
mechanism they propose: **does it smuggle a shape in?**

Categories used throughout:

- **CLEAN** — local chemistry, local physics, or an environmental forcing. Nothing about
  the plant's form is stated; the form is whatever falls out.
- **PARAMETER** — one irreducible number, with units, that has to be defended the way
  `uRef`, `WORLD.unitM` and Borchert–Honda's `L` are defended. A parameter is a debt, not
  a disqualification.
- **PRIOR** — a shape in disguise. Named disguises: *(a)* a stated angle, count, curve or
  exponent tuned to look right; *(b)* a "biological" parameter that is really a shape
  (architectural-model flag, crown-shape target, allometric exponent fitted to
  silhouettes); *(c)* a mechanism whose published form is descriptive or statistical
  rather than causal, so implementing it is curve-fitting; *(d)* something that
  contradicts or re-opens one of this project's own falsifications.

Two things are hunted in both directions. The reverse hunt — mechanisms the briefs
**under-claim**, where something that looks like a prior is already derivable from
machinery in the tree — is §3, and it is where most of the free wins are.

---

## 0. The finding that outranks every individual mechanism: THE ENGINE HAS A METRE AND NO SECOND

`WORLD.unitM = 0.0625 m/unit` is the project's model citizen. It was fixed once, by the
wind and the falling blade, and every length in the piece is derived from it. There is no
equivalent for **time**, and all eight briefs need one.

Each brief solves that privately, and they do not agree:

| Brief | Timescale it must convert | Implied seconds-per-step |
|---|---|---|
| `auxinwood` §1a | "life ≈ one growing season (180 d) over 2527 steps" | **≈ 1.7 h/step** |
| `architecture` §5 | "8–12 flushes of an 18–22 d oscillator" | **≈ 1.4–2.5 h/step** |
| `mechano` §8 | "7-day accommodation ≈ a handful of seconds" of wall clock | **≈ 16 min/step** |
| `wood` §3 + `season` §6 | one growth **ring** per year on a ~10-year sapling | **≈ 35 h/step** |
| `posture` §1e | righting cycle ~100 d, May→September | months over a life |
| `37_wind.js` (shipped) | stem mode 0.56–0.64 Hz, gust 1.78 Hz | **≈ 8 ms/step, real** |

That is a spread of roughly **130×** among the developmental clocks alone, sitting on top
of a physical clock seven orders of magnitude away. Every one of those conversions is a
dial, every dial is currently set by looking at the answer, and **`auxinwood` is the only
brief that notices**: *"Whether that matters depends on what a solver step means in plant
time, which the engine does not state."*

### And here is the proof that the dial is already being turned to a shape

`architecture` §5 sizes its oscillator like this, verbatim: *"a 2.88 m sapling with ~24
laterals wants roughly 8–12 flushes over its life; at 125 steps/s and a 2527-step arc,
that is a period of ~210–320 solver steps."*

`season` §7 and `wood` §3 want the **same** clock to produce annual rings and annual
whorls. On a ~10-year-old specimen that is 2527/10 ≈ **253 steps** per cycle.

Both routes land on ~250 steps. Their underlying biologies are **18× apart** — a 20-day
free-running rhythm against a 365-day season. They converge not because the biology
converges but because **both were back-solved from "about 24 whorls"**. That is a count,
tuned to look right. Disguise (a), and it is the single largest prior in the eight briefs.

**Recommendation, and it should precede all the mechanism work.** Add one stated world
constant — call it `WORLD.stepDays`, or a single growth-time-to-wind-time ratio — book it
in SCIENCE.md's numbered debt list next to `L`, and **derive every timescale in every
mechanism from it**. Then the whorl count is a *prediction*. If it comes out at 3, or at
40, that is a result and you report it, exactly as the project reports 90–160° instead of
forcing 137.5°. One stated number replaces at least six hidden ones, and the whorl count
stops being an input.

Corollary worth stating separately: with a clock fixed, the season is **over-parameterised
by one**. Period × duty cycle (the critical-night-length threshold on a sine) × elongation
rate produce two observables — whorl count and bare-internode length. Three knobs, two
observables. Two of the three must be fixed from outside the silhouette or the ratio of
whorl to internode — a visible proportion of the leader — becomes a hand-set dial.

---

## 1. The ranking

### CLEAN

| Mechanism | Brief | Why it survives |
|---|---|---|
| **S3m strain-driven radial growth**, `dr/dt = k·max(0, Ŝ − S₀)` | `mechano` §8 | Local, per-station, on a strain the beam solver already computes from a wind field that already exists. Amplitude-only sensing needs no wood modulus in the sensing step. Non-negative, so it *is* a cambium and closes the 68.2% reversibility gap in the same term. Best support-to-code ratio in the eight briefs. |
| **Reaction-wood curvature**, `dC/dD = −4Δα·f/D²` | `posture` §0, §4 | A mechanics identity on `D`, which the engine grows. Emits a *rate*, not a silhouette. The `D⁻²` collapse (90× more motricity in a 1 cm branch than a 9.5 cm trunk) is shape-generating with no shape in it. |
| **Lifetime curvature budget** `\|ΔC\|max = 4Δα/D₀` | `posture` §2 | A corollary of the above, not a new assumption. "A branch that does not fix its posture while thin never will" is an emergent history-dependence with zero new state. |
| **Irreversible area accumulation**, `r² += max(0, k·Φ)·dt` | `wood` §4, `hydraulics` §5 | Area is the additive quantity in every pipe-model formulation; integrating `r` is dimensionally wrong. Cures reversibility without a new mechanism. **But see the three-way collision in §2.** |
| **Which side lays reaction wood** | `posture` §1b, §4 | Derivable from the statocyte flux imbalance the engine already computes. Gerttula 2015 shows a real woody stem does exactly that. |
| **Queueing primordia against a gated elongation** (fixing `minInternode`'s discard) | `season` §3 | Not a workaround. Preformation is the rate-limiting step in conifer shoot growth, and a bud *is* a compressed shoot whose primordia were founded and retained. The whorl arrangement then comes from inhibition–competition on a compressed apex — which is `stepAuxin` on a meristem sheet, i.e. already shipped. |
| **Season as a competence gate on transport** (`comp`-style) | `auxinwood` §5 | Elegant and cheap: PAT *capacity* collapses in dormancy while IAA barely moves. It reuses the exact operator `15_pathogen.js` already ships. Keep it in [0,1] — CLAUDE.md records that `comp < 0` is a polarity inversion, not a dormancy. |
| **Sink-share bud release**, `a_i / Σa_j` | `auxinwood` §2a | Escapes the bottlebrush theorem *legitimately*: it is not `f(distance below apex)`, and its memory lives in grown sink strengths. Kinetically honest (phloem crosses the trunk in 1.9 h against auxin's 8 days). |
| **Per-organ light `L_i` from an orthographic depth map** | `light` §1 | A shadow map is something the renderer already does. Two-way coupled, so nearer `15_pathogen.js` than the wind — the brief is honest about that and it does not make it a prior. |
| **Shade-driven senescence on PAR** | `light` §6 | Would *retire* an imposed rule (SCIENCE.md item 6's imposed senescence order) rather than add one. Its own pre-flight is exactly right: rank the arrested conifer's blades by light and by age and see whether the orders differ. |
| **Per-angular-sector ovalisation** | `mechano` §8 | Free from the same rule if the beam solver knows the bending plane. See §3. |
| **Conduit taper from auxin-gated expansion duration** (Aloni's local rule) | `hydraulics` §3 | The *mechanism* is the engine's own idiom. **The exponent is not** — see PRIOR below. |

### PARAMETER

| Number | Brief | Defence, and how strong it is |
|---|---|---|
| **`Δα ≈ 2500 µstrain`** (conifer CW − NW) | `posture` §1d | Measured, with units, stable enough across species that Alméras hardcodes the −500 half. **Weakness the brief states itself:** `Δα` is in no trait database and translating anatomy into it is "an unsolved problem". Label it representative, not species-specific. Also note the motor is `E·Δα`, so a wrong `E` corrupts it. |
| **`ε₀` / `S₀`, the strain perception threshold** | `mechano` §8 | A sensing threshold with physical units, same category as `uRef`. **The proposed anchor is weaker than advertised**: `H_crit/H ≈ 4` (Niklas 1994, 111 species) is an *interspecific allometric outcome*, not a material property. Anchoring a sensing law to an outcome statistic is calibration-by-result — better than eyeballing, worse than the LMA table that removed the falling blade's last constant. Say so when it lands. |
| **β/γ, the graviceptive/proprioceptive ratio** | `posture` §1c, §3 | Bastien's balance number `B` is *fitted per species* (0–10, mostly 2–5) and fitting it would be fitting axis curvature. **But it does not have to be fitted** — see §3, R2. |
| **Per-species critical night length, 2–10 h** | `season` §1a | Genuinely bracketed by Gyllenstrand (2–3 h Arctic, 7–10 h Romanian). Fine *as a threshold*. Degenerate with the period; see §0. |
| **Export-tax kernel `λ ∈ [2, 20] cm`** | `auxinwood` §6a | The one quantitative fact anyone has about apical control (a girdle at 2 cm releases, at 20 cm never). Two independent routes — `v/k` = 0.7–8.7 cm and the girdling knife — land in the same centimetre band. Strong. |
| **Export-tax gain `κ`** | `auxinwood` §6a | **Entirely free.** No published value, and the brief advertises that the equation "predicts a parabolic crown" — which is precisely what `κ` would be tuned to deliver. Ship it only with a stated derivation or an admission that it is eye-set. |
| **`k`, the accumulation rate in `r² += kΦ·dt`** | `wood` §4 | Arguably costs nothing new if it *replaces* the existing pipe constant rather than sitting beside it. Check that before booking it as a debt. |
| **Sympody: an apex-fate threshold on florigen** | `architecture` §6 | A fate rule on a threshold of a field that already exists, which is the engine's idiom. The *payoff* claim ("unlocks 6 of the 23 models") is taxonomy point-scoring, not a reason to build it. |
| **Photograviceptive `M = a·I^b`, `b ≈ 0.36–0.44`** | `light` §4 | `b` is measured at R² 0.91. `a` has no quoted value. Two real problems: it was measured on **herbaceous growth zones** while `posture` establishes the woody actuator is reaction wood, so this mixes two models of the same quantity; and it will move the shipped 0.6° set-point and 9.5° crown half-angle, i.e. it re-opens tested ground. Category-(d) risk, flagged by the brief itself. |
| **Relative light pruning threshold** | `light` §2, §8 | Sprugel's relative rule is right and avoids a percent-of-full-light constant. **But a normalised threshold is a statement about what the rule refuses to see** — CLAUDE.md's own 2026-08-01 lesson. Normalising to the specimen's own maximum makes pruning scale-free, so the threshold *is* a crown-depth proportion. And the brief warns a solitary 2.88 m sapling will not self-prune at all — so on the hero the only way to make the mechanism do anything is to lower the threshold until the crown recedes, which is dialling crown depth by hand. **PARAMETER for the garden; PRIOR-in-waiting on the hero.** |

### PRIOR

| Proposal | Brief | The disguise |
|---|---|---|
| **The season's PERIOD** | `season` §7, `architecture` §5 | **(a).** With no stated seconds-per-step, the period's only anchor is the whorl count. Two briefs derive ~250 steps from biologies 18× apart, because both back-solved from "~24 laterals". The season *itself* is defensible — the foxtail evidence is as clean an environment→form chain as the wind's, 40% incidence with a 61 mm/month threshold, and aseasonality demonstrably removes whorls *and* rings together. It is the **period** that is the shape. Fix §0 and this moves to PARAMETER. |
| **Duchemin's self-similar crown front** | `posture` §6, `hydraulics` §4, `architecture` §4, `light` (implicitly) | **(b) and (c) together, and it is the biggest one.** Four briefs recommend it approvingly. It is a *surface* propagating with a velocity law plus **`γκn`, an explicit surface-tension-like smoothing term on an outline**, whose free parameters `(α_g, α_p)` were swept until 36 **photographed crown silhouettes** fitted at d < 0.05 in 97% of cases. There are no organs, no meristems, no branches in it. Importing it is importing the outline and then filling it — the exact inversion of this project. Worse, `architecture` §4 proves the price: self-similar means scale-invariant means **no ontogeny**, so it cannot ever give excurrent→decurrent, which is the thing a tree does. Cite it in SCIENCE.md as the contrast case, next to Nauber's 14 hand-tuned parameters. Do not build it. |
| **"Physiological age" as a monotone per-meristem state** | `architecture` §7 | **(b).** The brief flags the risk and then recommends it anyway. In AmapSim it is literally "a number that sets every parameter" — an index into what an organ should look like. **Forbid the name.** If a monotone state is needed, name the physical quantity: accumulated wood area, spent curvature budget, hydraulic path length, cumulative strain. See §3, R3 — the engine gets one free from any of the other mechanisms and needs no new variable at all. |
| **The Palubicki λ vigour partition** | `architecture` §3, `light` §5 | **(a) + (d).** The full decurrent→excurrent habit range spans **λ = 0.46 to 0.54** — a ±4% knife-edge that walks the whole silhouette. That is a habit dial with a Greek letter on it. It also re-opens the Borchert–Honda flux partition, which this project built, measured (rate taper inverted, 0.031 bottom against 0.201 top) and falsified, and which JOURNAL 2026-07-30 says exactly why not to rebuild. `light` §5 does the honest thing and recommends against on its own evidence; `architecture` is warmer about it. **No.** |
| **Chuine's budburst model / Sarvas period units** | `season` §7 | **(c).** Sigmoid response curves with two fitted empirical parameters each, accumulating chilling and forcing units against a temperature-dependent threshold. It is the phenology literature's curve-fitting apparatus, not a mechanism. A day-length threshold is one number; this is four or more, all fitted. |
| **Kikuzawa leaf-longevity cost–benefit** | `light` §6 | **(c).** An *optimality* model — longevity maximises net gain per unit time. This is the same family as the uniform-stress axiom that `wood` §5 correctly rejects: a global optimality statement, not a local rule. The engine may not optimise. Shade-induced senescence on PAR does the same job causally; take that instead. |
| **Kothari's `L_base`** | `light` §2 | **(c).** The brief says it plainly — a fitted trait, with species identity explaining 51.3% of the variance. Useful as a sanity band. Never as a value. |
| **Kozak variable-exponent taper** | `mechano` §4 | **(a), openly.** The exponent is itself a fitted function of relative height — neiloid, then paraboloid, then conic. Forestry drawing the stem. The brief cites it as an admission, not a recommendation; keeping it here so nobody imports it later. |
| **MECHATREE's evolved safety factor `S ≈ 3`** | `mechano` §3 | **(b) + (c).** A neural-network-parameterised safety factor selected over 10,000 simulated years of tournament evolution. Not a physiological sensing law. The brief says so. |
| **Eloy's `α ≈ 2` from constant fracture probability** | `mechano` §3 | **(b).** An allometric exponent derived from a *global* optimality assumption (uniform fracture risk across the tree) on an assumed self-similar skeleton. Nothing was measured and nothing was grown. |
| **Targeting `b ≈ 0.2` for conduit taper** | `hydraulics` §3 | **(a), conditionally.** The Aloni mechanism is CLEAN and the brief is right that this is the one place hydraulics and this engine's chemistry are the *same* mechanism. But `b ≈ 0.2` is an exponent fitted across 257 species and 0.5–44.4 m. Implement the local rule, **measure** `b`, and report it against the 0.1–0.3 range as external agreement. If it is ever *set*, or if a coefficient is tuned until it comes out at 0.2, the flagship becomes a fit. |
| **Targeting Dean's `δ = 0.313–0.333` for stem taper** | `mechano` §2 | Same trap, one level up, and worth stating separately because the temptation is stronger: `k` and `S₀` in the strain rule could be tuned until the taper exponent lands on 0.33. Assert `δ` against the closed form the strain rule *predicts* (`ε ∝ M/(E r³)` ⟹ `r³ ∝ M`), and quote Dean as independent agreement. That is the `test/tree.mjs` §3 discipline, not the `crown.mjs` fill trap. |
| **"Rhythmicity" as an architectural-model flag** | `architecture` §0 | **(b), by a slide.** "The distance from a plant pretending to be a tree to a published conifer architecture is one property: rhythmicity" is true in Hallé's *grammar* and empty in this engine. Setting the Massart bit is a flag; an oscillator gating elongation while founding continues is a mechanism. The brief opens with the first framing and closes with the second. Only the second is buildable here. |
| **Bare `ρgz` as a vigour multiplier** | `hydraulics` §4 | **(d), flagged honestly by the brief.** Linear in height and memoryless — it reproduces the bottlebrush with better physics. Included here because it is the obvious first implementation of an otherwise good idea. |

---

## 2. Collisions — mechanisms that fix the same thing twice

The briefs were written independently and it shows. Four overlaps, all of which would
double-count if shipped together.

**(i) Three separate cures for the 68.2% radius reversibility.** `wood` §4 wants
`r² += max(0, k·Φ)·dt`; `mechano` §8 wants `dr/dt = k·max(0, Ŝ − S₀)` and points out it is
non-negative and therefore closes the same gap "in the same term"; `hydraulics` §5 wants a
two-part sapwood/heartwood accumulator after Aye 2022. All three are defensible. **Exactly
one should ship.** `EI ∝ r⁴` makes a double-counted radius catastrophic rather than merely
wrong, and `test/stem.mjs` and `test/taper.mjs` both become load-bearing on the same
commit. My preference is `mechano`'s, because it is the only one of the three that also
distributes increment along the stem and deletes `fruitFlow` — but the choice should be
explicit and the other two written up as not-taken.

**(ii) Two branch-length tapers, one of which already exists and works.** `hydraulics` §4
proposes per-branch hydraulic path length feeding back on turgor to self-limit branch
length, with insertion height setting the asymptote. The engine **already grows an emergent
length taper at R² 0.9988** from bud position (`test/conifer.mjs`). Adding a second
mechanism for the same observable means the first is now doing unknown work. Run the
ablation before, not after.

**(iii) Two apical-control replacements at two length scales.** `auxinwood` §2a
(sink-share for *which bud escapes*) and §6a (local export tax for *how fast a released
branch grows*) are anti-correlated by construction and address different variables at
different times — the brief says so and is right. But both need a per-branch carbon
fixation rate `P_i`, which needs the **light field**. Neither is as cheap as advertised in
isolation; they are one coupled change with `light`.

**(iv) Roots.** `hydraulics` §6 says ignore roots for form (stem and root mass are
isometric, so a root system is a constant multiplier). `season` §1c's most implementable
rhythm model — Borchert 1973, the only one that gives an oscillation with no environmental
input and whose single parameter switches intermittent↔continuous — **is a shoot:root
feedback**. Implementing it would mean inventing a root compartment whose only function is
to set the rhythm's period, i.e. disguise (b): a free period wearing a compartment's
clothes. Take the environmental route or take neither.

---

## 3. The reverse hunt — eight things the briefs under-claim

**R1. Irreversible accumulation may produce the taper on its own, and nobody checked.**
Every brief treats memory (fixes SIZE) and mechanosensing (fixes SHAPE) as orthogonal.
But `r² += max(0, k·Φ)·dt` is an integral, and **basal stations have been integrating for
longer than apical ones**. A taper falls out of age alone, with no mechanical term at all.
This is free, it is one line, and it should be measured *before* the strain rule so the
strain rule's contribution can be attributed. It also means the barrel may be partly an
artefact of reversibility rather than of the load model.

**R2. β/γ is anchored by a measured angle, so it is not a free curvature dial.**
`posture` recommends the `γ·C` proprioceptive term and separately reports Archer & Wilson:
compression wood flips to the upper side while the leader is still **7–12° from vertical**,
confirmed at 10–20° across five species. The brief does not connect them. That reversal
angle is exactly where `γ·C` reaches parity with `β·sin A` — so **the measured flip angle
determines the ratio**, and `B` need never be fitted to an observed axis curvature. This
converts a PARAMETER-at-risk into a calibrated one, and it is the difference between
importing Bastien's fitted `B` (fitting shape) and reproducing Archer & Wilson's angle
(reproducing a measurement). Assert against the flip angle in the harness.

**R3. "Physiological age" is already free.** `architecture` calls a monotone per-meristem
state "the actual architectural gap" and "one genuine addition". It is not an addition.
Any of the other four mechanisms hands you one: accumulated wood area (`wood`/`hydraulics`),
spent curvature budget `4Δα/D₀` (`posture`), hydraulic path length (`hydraulics`),
cumulative strain (`mechano`). Each is physical, each is monotone, each is already needed
for its own reasons. Build any one and the "physiological age" gap closes as a side effect
— and it closes with a named physical quantity instead of an index.

**R4. Ovalisation is free and is a genuinely new visible thing.** `mechano` §8 puts it in a
closing "one more, free" paragraph. It deserves more: the beam solver already knows the
bending plane, the same strain rule applied per angular sector gives it with no new
mechanism, and the published magnitudes are large (16% ovalisation → +212% rigidity; +38%
diameter in the bending plane against +12% perpendicular, with the pith **not** eccentric).
A stem that is stiff against the prevailing wind is a coupling between the air and the form
that nothing in the piece currently has, and nothing about that shape would be drawn.

**R5. The wind is already the high-pass filter.** `mechano` §1 makes much of Bonnesoeur —
trees respond only to events with a return period over a week, so drive growth from a
running maximum, not a mean. True, but the engine gets most of this for nothing: the stem's
own bending mode is 0.56–0.64 Hz and the fastest gust is 1.78 Hz, so **the beam solver's
response already is a filter** and the strain a station sees is already the filtered
quantity. The running max is a cheap accumulator on top, not a new signal-processing stage.

**R6. Reaction wood does not re-open `test/plagio.mjs`; it explains it.** The temptation
will be to read `posture` as contradicting the shipped negative result that gravity cannot
hold a branch out (tip slope 16–268° on the radii the engine grew). It does not. `plagio`
measured a structure with a **load and no motor**. `posture` supplies the motor, and it is
a *curvature rate*, not a static balance. Frame it that way in the PR or someone will
reasonably object that a falsified route is being rebuilt.

**R7. `E = 60 MPa` is now load-bearing on three mechanisms at once, and it is herbaceous.**
`plagio.mjs` already named it the hidden variable (conifer wood is 8–11 GPa, 130–180×
higher). Under a strain rule, `ε ∝ M/(E r³)`, so a wrong modulus is a wrong **taper**, not
just a wrong sway frequency (`mechano` §8). And the posture motor's power is `E·Δα`
(`posture` §1d). So `E` corrupts sway, taper and posture simultaneously. **Fix the modulus
first**, or every constant calibrated afterwards is calibrated against a wrong beam. This
is an ordering constraint no brief states.

**R8. A per-organ scalar with no view is another `lesion`.** `light` §8 item 7 notices in
passing that `L_i` "is a per-organ scalar the renderer can read". This should be the
headline for the whole set. CLAUDE.md's own post-mortem on the pathogen work is that
`F.vir` is computed and never drawn, so a correct, derived, measured mechanism was
indistinguishable from a healthy plant on screen. **Every mechanism above produces a new
per-organ or per-station scalar** — titre of accumulated wood, spent curvature, strain
history, light. Ship each one with its `VIEWS` entry in the same commit, or repeat the
lesion.

---

## 4. Threats to shipped, tested ground — read before touching anything

Three items in the briefs are not proposals at all. They are attacks on code that is
already in the tree and already has green harnesses under it.

1. **The AGO sign may be inverted** (`posture` §3, flagged `⚠` by the brief). Roychoudhry
   et al. have auxin setting the *magnitude of the antigravitropic offset*, and a larger
   offset means a **larger** GSA — more horizontal. The engine ships "more auxin, more
   vertical", and CLAUDE.md says getting it backwards inverts the whole silhouette.
   **The existing validation is too loose to settle it:** crown half-angle 9.5° against a
   Norway spruce's 8–15° is a band 1.9× wide, and a wrong sign that lands inside a band
   that wide is not evidence. This wants one careful read of that paper's Figure 4 and a
   *narrower* check, not a re-run of the same one.
2. **`dominance` is 10–100× beyond any defensible auxin length scale** (`auxinwood` §1b).
   `exp(-d/dominance)` is the steady state of transport-with-decay, so `dominance = v/k`,
   and both terms are measurable: 0.7–8.7 cm. A 2.88 m crown needs 30–100 cm. The woody
   literature's own review labels the summed-`exp(-d)` whole-tree field "not experimentally
   demonstrated". This is not a shape prior — it is a **chemistry claim that is not
   chemistry**. Either book it in SCIENCE.md as a stated phenomenological field (honest) or
   replace it with the sink-share form (better). Do not leave it described as auxin.
3. **PIN polarity may follow concentration, not flux** (`auxinwood` §7, Bennett 2016). This
   is the deepest item in all eight briefs and it is not about trees at all — it is about
   `stepAuxin`. It is contested rather than settled, and flux-based models still reproduce
   venation better in published simulations. No action, but it belongs in SCIENCE.md's
   "what is imposed" discussion as the assumption the whole engine rests on.

And one negative to preserve: **do not model compression wood as an auxin bump**
(`posture` §1a). Hellgren measured it directly in a pine and it is not there. It is the one
place where reaching for this project's existing chemistry would be the wrong answer.

---

## 5. What I would build, in order

1. **Fix `E`** (R7). Everything downstream is calibrated against it.
2. **State one time constant** (§0). Then re-derive every timescale, and let the whorl
   count be a prediction.
3. **Irreversible accumulation alone**, and measure the taper it produces (R1). Attribute
   before adding.
4. **The S3m strain term**, replacing `fruitFlow`. Assert the taper exponent against the
   closed form, not against Dean.
5. **Reaction wood**, with the `γ·C` term calibrated against Archer & Wilson's 7–12° flip
   (R2), in the same commit as (3)/(4) because `EI ∝ r⁴` couples them.
6. **The elongation gate + primordium queue**, once (2) gives the period an anchor.
7. **Light**, for senescence order and the garden — running its own pre-flight first
   (does the light ranking of blades differ from the age ranking on the arrested conifer?).

Each with its view in the same commit (R8). And nothing from the PRIOR table, ever, except
as the contrast case in SCIENCE.md.
