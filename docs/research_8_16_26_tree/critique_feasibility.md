# Feasibility ranking, dependency order, and the separate-path question

A critique of the eight tree briefs (`wood`, `season`, `posture`, `mechano`, `architecture`,
`light`, `hydraulics`, `auxinwood`), mapped onto the engine as it stands on `main`.

Flags follow the briefs: `[D]` demonstrated in a cited paper · `[I]` inferred · `[OURS]` my
construction · `⚠` contested or a live disagreement between briefs. Everything about *the
engine* below was read out of `src/` in this session and is marked `[CODE]`.

---

## 0. Four things to fix before the ranking, because they change it

### 0a. `wood.md` items 1 and 2 are the same term, and building them separately writes `updateRadii` twice

`wood.md` §7 ranks **accumulation** (`r² += max(0, k·Φ)·dt`) first and **mechanosensing**
(increment ∝ log integrated strain) second, as two commits. `mechano.md` §8 shows they
collapse:

```
dr/dt = k · max(0, Ŝ − S₀)
```

is *already* non-negative — it is a cambium, so irreversibility is not a second property
you add, it is what the `max(0, ·)` is. Build `wood.md` §4 first and you write a monotone
accumulator driven by traffic, then rewrite it three weeks later driven by strain. **Take
`mechano.md`'s version and get `wood.md`'s for free.** This is the single largest
efficiency in the whole set and neither brief notices it, because each was written without
the other.

### 0b. `architecture.md`'s "the timescale problem dissolves" rests on two numbers that only agree under a life the specimen contradicts

`architecture.md` §5.2: the free-running rhythm is **18–37 days** `[D]`, a life wants
**8–12 flushes**, 2527 steps ÷ 10 ≈ **250 steps/flush**, therefore "entirely inside the
existing time architecture". Those two facts are only consistent if 250 steps ≈ 3 weeks,
i.e. **one step ≈ 2 hours, i.e. the whole life is one growing season (~210 d)**. But the
specimen is a **2.88 m spruce sapling**, which the project's own JOURNAL dates against
literature at 8–10 years. Under *that* reading one step ≈ **1.2–1.4 days**, 250 steps ≈
**one year**, and the endogenous 21-day oscillator would fire **~150 times** over a life —
150 whorls on a 2.9 m stem, which is a bottlebrush, not a conifer.

Both readings produce the *same code* (one oscillator, period ~250 steps). They produce
different **justifications**, a different **name** for the constant, and a different
answer to "does this need `WORLD.daylength` or not". This project cares about the
justification more than most codebases do, so the disagreement is not cosmetic. `⚠`

### 0c. `test/plagio.mjs`'s blocker-2 has already been corrected, and CLAUDE.md still quotes the retracted version `[CODE]`

CLAUDE.md and ROADMAP still say: *"on the radii the engine actually grew, a lateral held
horizontal has a tip slope of 16–268°, so gravity does not hold a branch out, it collapses
it. The hidden variable is that `E = 60 MPa` is a herbaceous modulus."*

The file itself was corrected on 2026-07-30 (`test/plagio.mjs` lines 63–105) and now says
the opposite about the mechanism:

> "SO THE CONCLUSION INVERTS. A woody conifer lateral held horizontal is NEAR MECHANICAL
> EQUILIBRIUM… Mechanics PRESERVES the horizontal state — which is exactly why it cannot
> SUPPLY it… 'Gravity overwhelms stiffness' was never a coherent thing to conclude."

Three consequences:

1. **`Ashfall Spire` already ships `stemOpts: { eModulus: 1.2e9 }`** (`70_app.js:318`)
   `[CODE]` — 20× the herbaceous default and *inside* the corrected 1–4 GPa whole-branch
   window that the same file derives (branch MFA 41–53° against stem wood's 10–20°,
   Cannell & Morgan 1987). So "give the conifer a woody modulus" is **already done**, and
   any plan that opens with it is planning a change that landed.
2. **But `test/plagio.mjs` reads `STEM_DEFAULTS.eModulus` directly** (`line 115`) `[CODE]`,
   not the species preset. Its headline table is still computed at 60 MPa on a species
   that ships 1.2 GPa. Its `mult` sweep covers the range, so the numbers are recoverable —
   but the *verdict lines* are printed off the wrong one.
3. The genuinely open item is not "stiffer" but **"different by axis order"**: the same
   literature says stem wood is 8–11 GPa and branch wood 0.7–4.6 GPa *in one tree*, and
   the cause is MFA — which is exactly the variable reaction wood changes (`posture.md`
   §1d: CW's MFA is 30–40°, and `E·Δα` not `Δα` is the motor). `stemOpts` is per-species
   `[CODE]`, so the engine currently **cannot express a trunk stiffer than its own
   branches**. That is a real gap, it is small, and it becomes free once reaction wood
   exists.

The useful thing the corrected file leaves behind is one dimensionless group,
`Γ = ρgL³/(Ed²)`, with `Γ ≳ 0.5` herbaceous (a *dynamic* controller is the right model)
and `Γ ≲ 0.1` woody (static set point + elastic droop). **Print Γ per axis before
proposing any posture work.** One number decides which architecture applies, and it is
already derived.

### 0d. Wood memory is currently invisible on screen, and the reason is a two-line detail

`updateRadii` builds its traffic list as
`for (const org of this.organs) bl.push([org.birthLen, sp.organFlow]);` — **with no `shed`
or senescence check** (`40_plant.js:942`) `[CODE]`. CLAUDE.md already warns about this
from the other side ("do not measure this by running senescence — `updateRadii` counts
dying organs too"). Combined with the fact that nothing else in the shipped life cycle
ever removes traffic from a station, the consequence is:

> **During a normal run, no station's radius ever falls. Making the radius monotone
> therefore changes nothing a viewer can see.**

The 68.2% collapse is real, but it is only reachable by an *experiment* that strips
leaves. So wood memory is an **enabler**, not a deliverable: its payoff is gated on
something that removes load actually existing (a shed-aware `updateRadii`, light-driven
branch death, breakage). Ranking it as a visual win — which `wood.md` §7 and ROADMAP 0z2
both come close to — will produce a commit that measures beautifully and shows nothing.
It still belongs high in the order, because **reaction wood cannot be built without it**
(§3 below), but for the right reason.

---

## 1. Cost tiers

Costs are in the project's own currency: does it change an existing rule, add a module, or
change how time works.

### T0 — one term in an existing rule, no new state (< ~20 lines)

| Mechanism | Where | Notes |
|---|---|---|
| Conduit-taper path-length term in the radius | `updateRadii`; `below = total − arc[i]` already exists `[CODE]` | `hydraulics.md` §3: `N d⁴ ∝ L`, `N ∝ L^0.2` ⟹ sapwood area ∝ `L^0.6`. **Bends the log-profile, which `test/taper.mjs` §2 proved an exponent provably cannot.** `[OURS]`, untested, ~10 lines |
| Sink-share apical control `aᵢ/Σaⱼ` | `updateVigour`; `subtreeFlow` already computes the numerator `[CODE]` | `auxinwood.md` §2a. Retires the stated `L`. Escapes the bottlebrush theorem because history lives in `aⱼ` |
| Modulate `uRef` on the growth-rhythm clock | `App.setWind` exists; wind is a pure fn of `(x,t,uRef)` `[CODE]` | Turns architecture B's incoherence (§4) into a second free coupling |
| Per-axis-order modulus | `stemOpts` is per-species only `[CODE]` | Needs reaction wood to be derived rather than stated; as a stated pair it is two constants, and `posture.md` says `Δα` is not in any trait database |

### T0.5 — one term, but with new per-station state and a cache hazard

| Mechanism | Cost | The hazard |
|---|---|---|
| Monotone radius accumulator | ~30 lines + guard | **`updateRadii` runs at least twice per plant step** — once in `Axis.step`, once from `stepBend` after `apply` (`40_plant.js:1713`) `[CODE]`. A naive `+=` double-counts. And stations are *not material*: `pts` grows by append as the axis elongates, so the accumulator must be keyed on the material arc coordinate (`rest`/`birthLen`-like), not on index |
| Local export tax `1/(1 + κ∫S(x)e^{−(x−xᵢ)/λ}dx)` | ~20 lines, the walk exists | `λ ∈ [2, 20] cm` = **0.32–3.2 world units** at `unitM = 0.0625`. The crown currently needs `dominance: 6.0` `[CODE]`, i.e. **2–19× larger than the girdling bracket allows**. The measurement may kill the mechanism — see §5 |
| Reaction wood `ΔC = −σ·4Δα·f·ΔD/D²` into `rest` | ~30–50 lines | `Axis.rest` already exists and is "the shape growth actually produced" `[CODE]` — exactly the right home. **Requires monotone `D`**: if `D` can fall, `ΔD < 0` and the axis un-bends |

### T1 — one new module or subsystem, no new architecture

| Mechanism | Cost | Blockers |
|---|---|---|
| **S3m strain-driven radius** | ~100–150 lines + a harness | Needs per-station `\|ε\| = M·r/(EI)`. The bend solver stores `st.k = E·I/ds` and station angles `[CODE]`, so curvature and hence ε are one division away. Plus a running max with decay per station |
| **Growth rhythm** (oscillator + primordium queue) | ~60–100 lines | The `minInternode` blocker is real and is **worse than named**: the primordium has already been `shift()`ed off `m.emitted` when the `continue` fires (`40_plant.js:420–425`) `[CODE]`, so it is *destroyed*, not skipped. `unshift` + `break` is a one-line fix that changes behaviour for all nine species and needs a queue cap |
| **Light field** | ~300–500 lines | Two-way coupled, so it must recompute as the plant grows (`light.md` §8: amortise ~50 steps). And it needs a **CPU path**, because 13 headless harnesses run the simulation with no GL — the browser shadow map is free, the Node fallback is the voxel propagation at ~14× |
| **Per-meristem physiological age** | ~40 lines | `architecture.md` §7 calls this "the actual architectural gap" because "every rule in Canalisation is currently a pure function of the current field". **That is not true** `[CODE]`: `org.age`, `Axis.age`, `plant.florigen`, `lastOrganAt`, `lastFloralAt` are all accumulators, and `apexStalled`/`apexSpent` read them. What is missing is a monotone state *other rules branch on*, which is smaller than the brief implies |

### T2 — a new time architecture

Only one candidate: **simulating decades**. Discussed and rejected in §4.

---

## 2. What each mechanism buys, against the channels that make a viewer say "tree"

| Channel | Delivered by | Tier | Confidence |
|---|---|---|---|
| **whorls + bud scars** | growth rhythm **only** | T1 | high — `season.md`, `architecture.md` and `light.md` independently say nothing else touches it |
| **real taper** | S3m strain (primary); conduit path-length term (secondary) | T1 / T0 | high — `mechano.md` §2's table is the cleanest thing in the sweep |
| **wood that persists** | S3m (same term) | — | **subsumed** — and invisible today (§0d) |
| **a parabolic crown** | export tax `[OURS]` **or** per-branch path-length turgor `[OURS]` **or** light | T0.5 / T0.5 / T1 | low — three rival unpublished routes |
| **plagiotropic branches that stay out** | already mostly true at 1.2 GPa (§0c); reaction wood supplies the *set point maintenance* and the `D⁻²` gradient | T0.5 | high |
| **bark** | **nothing in eight briefs** | render | — |
| **sheer size and age** | **nothing in eight briefs** — and organs saturate near 1800 (CLAUDE.md) | — | — |
| **still and massive** | already 20× stiffer than a herb; **unmeasured** | measurement | — |

Two readings of that table, both uncomfortable and both worth stating:

- **Three of the eight channels are not answered by any of the eight briefs.** Bark is a
  renderer question the science sweep could never reach. Size and age are blocked by the
  organ-pool saturation the project already found, which is an engine constraint, not a
  biology one. Stillness may already be shipped and nobody has pointed `tools/jitter.mjs`
  at the conifer.
- **Only one channel has exactly one supplier and no rival**: whorls. Everything else is
  either already partly there, or contested between two or three mechanisms. That is a
  strong argument for the rhythm's rank independent of how cheap it is.

### The barrel, explained in one line, which is the best thing in the sweep

`mechano.md` §2 `[OURS]`, built on Dean & Long 1986 `[D]`:

> Murray-3 on foliage traffic gives `d ∝ x^{1/3}`. Constant stress under a **point load at
> the very top** gives `d ∝ x^{1/3}`. **They are the same profile.** The engine's exponent
> was never the problem — the *moment* was, because traffic has no lever arm.

That supersedes both the `radiusExp` result and `fruitFlow` in one sentence, and it should
go into TUNING.md whether or not anyone builds S3m. A terminal fruit currently enters as a
48× flow constant with no lever arm; under a strain rule it enters as `M = W·L`, which is
what a fruit actually is.

---

## 3. Dependency order

```
  [0] MEASURE FIRST (no code)
       ├─ Γ = ρgL³/(Ed²) per axis, at the SHIPPED 1.2 GPa      → decides posture architecture
       ├─ tools/jitter.mjs on Ashfall Spire                    → is it already still?
       └─ light pre-flight: rank blades by L_i vs by age       → may kill the light field

  [1] S3m STRAIN-DRIVEN NON-NEGATIVE RADIAL INCREMENT
       ├── subsumes → wood memory / irreversibility
       ├── retires  → fruitFlow, and the radiusExp argument
       └── requires → per-station |ε|  [already computable, CODE]
              │
              ▼
  [2] REACTION WOOD   ΔC = −σ·4Δα·f·ΔD/D²  →  Axis.rest
       │   requires monotone D  ── strictly gated on [1]
       ├── unlocks → per-axis modulus from accumulated MFA (closes §0c's gap
       │             without stating a second constant)
       └── requires → the auxin/angle SIGN settled first  (⚠ posture.md §3)

  [3] GROWTH RHYTHM   (oscillator + primordium queue)
       │   INDEPENDENT of [1] and [2] — can be built in parallel
       ├── requires → minInternode queue fix  (one line, nine species)
       └── enables → growth rings, but ONLY with [1] and a way to SEE a section

  [4] APICAL CONTROL REWRITE   (export tax OR sink share — pick one)
       │   INDEPENDENT of everything above
       └── candidate parabolic crown; retires the stated L

  [5] LIGHT FIELD
       │   requires nothing; required BY nothing on the hero
       ├── buys → crown recession (GARDEN ONLY — light.md §2 WARN)
       ├── buys → senescence order (retires a SCIENCE.md imposed prior)
       └── buys → GSA photo/gravi blend  A_R = A_P/(1+M), M = a·I^0.4
```

**Four dependency claims worth defending explicitly:**

1. **Reaction wood strictly needs wood memory.** Its law is per *increment* of diameter.
   With a reversible radius, `ΔD` goes negative whenever traffic falls and the axis
   un-bends — a branch that straightens itself when a leaf drops. Not a rounding error; a
   sign error.
2. **Wood memory does not need to be a separate commit** (§0a).
3. **Nothing needs light first.** `light.md` is admirably honest that its own best value
   is the garden and senescence order, neither of which is "is this a tree". Its own
   pre-flight — rank the arrested conifer's blades by light and by age, and see whether
   the orders differ — costs almost nothing and can retire the whole item.
4. **Nothing needs a season first**, including rings. Rings need wood memory *and* a clock
   *and* a cross-section to look at, and the third does not exist in any of the four
   `VIEWS`. Rings are the lowest-value item in eight briefs for this engine.

### The missing instrument, and by the project's own rule it comes before the mechanism

CLAUDE.md's 2026-07-31 and 2026-08-01 lessons are "ask what CLASS of quantity the suite
measures" and "ask what the metric DIVIDES BY". Applied here:

- `crown.mjs` measures **fill**, normalised by the crown's own outline — so it "can never
  answer 'is this a tree'" (CLAUDE.md's own words) and cannot see a shape change.
- `conifer.mjs` measures **half-angle** and **length taper** — shape statistics, and both
  are already green on a crown a person called Charlie Brown.
- `taper.mjs` measures the **stem**, not the crown.
- `tree.mjs` measures the **set point** and **apical control**.

**Nothing in the suite reports the crown profile `r(z)` — the actual curve that separates
a cone from a parabola, and the exact quantity Duchemin et al. fit to 36 photographs at
d < 0.05.** Every parabolic-crown candidate in §5 would be measured by an instrument that
cannot distinguish success from failure. Build `r(z)` with a shape-vs-cone residual, on
the *arrested* specimen, before building any of the three mechanisms. It is ~40 lines and
it is the same argument that produced `crown.mjs`.

---

## 4. The timescale question

### 4a. The engine already has two clocks, and they already disagree by ten million

This is the part none of the briefs states, and it reframes the question.

- **The mechanics clock is real and has a unit.** `WORLD.ptPerSec = 125` `[CODE]`, so one
  plant-time unit is **8 ms** of physical time. The stem's first mode is 0.56–0.64 Hz, the
  fastest gust 1.78 Hz, and `blender_seq` refuses to raise the stride below ~3.6 Hz
  sampling because the wind would judder. Every number in `37_wind.js`, `39_fall.js` and
  `39a_stem.js` lives on this clock.
- **The growth clock has no unit at all.** A 2.88 m sapling appears in 2527 steps ≈ 20.2 s.
  If the specimen is 8–10 years old, one step ≈ **1.2–1.4 days**. Ratio to the mechanics
  clock: **~1.5 × 10⁷**.

So the engine is *already* a two-clock simulation, and it *already* ships an unstated
seven-order-of-magnitude conversion. The tree program does not create the timescale
problem; it makes the existing one load-bearing, because **every mechanism in these eight
briefs carries a real time constant** — S3m accommodation 7 d, reaction-wood latency 7 d,
flush period 18–37 d, a season 365 d, Bonnesoeur's return period > 1 week — and none of
them can be converted to steps without stating `stepDays`.

**Nothing does today**, because every growth constant in the presets is a per-step rate
fitted by eye. The moment one time constant is imported from the literature, `stepDays`
becomes a stated constant — and it is a bad one, because it *re-scales every other rate*.
That is the true price of the tree program, and it is not in any of the eight briefs.

### 4b. Three concrete time architectures

---

**A. NAME THE SLOW CLOCK. (Recommended.)**

Declare `WORLD.stepDays` beside `unitM` and `ptPerSec`, and fix it the way `unitM` was
fixed — by making the specimen's *size* agree with its *age* in the literature. 2.88 m
spruce ≈ 8–10 yr over 2527 steps ⟹ **1.16–1.45 days/step**. Then:

| literature constant | steps |
|---|---|
| S3m accommodation (7 d) | ~5–6 |
| reaction-wood latency (7 d) | ~5–6 |
| endogenous flush (18–37 d) | ~14–29 |
| one year / one whorl | ~280 |
| a whole life | 2527 (≈ 9 yr) |

- **Cost:** zero code. One constant, one line in SCIENCE.md's debt list.
- **What it buys:** every subsequent time constant converts by arithmetic instead of by
  eye. That is the same move that removed the falling blade's hand-picked constant.
- **⚠ What it breaks, and it is real:** *one constant cannot serve nine species.* A
  Cathedral Fern reaches 1.39 m in the same 2527 steps; a herb does that in one season, so
  its implied `stepDays` is ~0.07 — **17–20× faster than the conifer's**. Making it
  per-species is defensible (a fern and a spruce genuinely live at different rates) and it
  is honest, but it is nine stated numbers where there were zero.
- **Kill criterion:** if `stepDays` has to vary by more than ~20× across the catalogue to
  keep every specimen's size consistent with its literature age, it is not a physical
  quantity and should be dropped rather than stated. Falling back to unitless growth is
  fine — it just means every new time constant is `[OURS]` and must say so.

---

**B. SEASON AS COMPRESSED FORCING, WITH THE AIR LEFT ALONE.**

`WORLD.phase(t)`, period ~250–310 steps, read **only by growth rules** — the elongation
gate, the cambial competence gate, the primordium queue release. The wind, the bend
solver, the fall are untouched and stay stationary.

The competence gate is the elegant part and `auxinwood.md` §5 found it: dormancy is a
collapse of PAT *capacity* with IAA barely moving `[D]`, which is **exactly the `comp`
operator `15_pathogen.js` already owns** `[CODE]` — `g = uni + (g_raw − uni)·comp`. A
season would be the same operator driven by a clock instead of an infection. That is a
genuinely strong architectural fit and it means the season needs no new primitive in
`stepAuxin`.

- **Cost:** one world scalar, one per-species threshold (`season.md`: 2–10 h critical dark
  period `[D]`), the `minInternode` queue fix. T1.
- **What it buys:** whorls and bud scars — the one channel with no rival. Rings, given
  wood memory.
- **⚠ What it breaks:** an axis that stops elongating for 250 steps while a 2.5 m/s breeze
  blows unchanged is a plant standing through four months of identical weather. Nobody
  will *see* it, but the project's standard is that a derived number must not be
  contradicted by a shipped one, and this contradicts.
- **The mitigation is worth more than the fix.** Modulate `uRef` on the same clock. The
  wind is already a pure function of `(x, t, uRef)` and `App.setWind` already exists
  `[CODE]`. That converts an incoherence into a free second coupling: strain is higher in
  the windy phase, so S3m lays more wood in the same phase the cambium is competent —
  which is **latewood by duration, exactly Cartenì et al. 2018's mechanism** `[D]`, with
  no ring boundary anywhere in the code. One line, and it makes items [1] and [3] pay each
  other.
- **Kill criterion:** gap CV must move from 0.83 **up** past 1.0. `architecture.md` §5.3 is
  right that the sign is the test — an oscillator clusters (CV up), a mechanism that
  merely regularises spacing pushes CV *down*. If it goes down, the whorl is not emergent
  from the queue and the season case collapses to rings, which are invisible.
- **Second kill criterion:** the queue must not disturb the eight herbs, organ for organ,
  in `test/species.mjs`. And it needs a cap, or the stalled-shoot trap becomes an
  unbounded pile of primordia instead of a discarded one.

---

**C. GROW-THEN-INHABIT.**

Grow with the bend solver disabled and a quasi-static load; switch mechanics on once the
specimen is arrested.

- **Cost: nearly zero, because the garden already does the first half.** `warmGarden`
  steps `plant.step(1)` in a budgeted loop and background specimens arrive grown
  (`70_app.js:944`, `S.debt`) `[CODE]`. What is missing is only the mechanics gate.
- **What it buys:** it is the *performance* answer, not the biology answer. It attacks the
  39.4 ms/step on an arrested conifer directly, and it makes many more growth steps
  affordable — which any multi-flush rhythm will need.
- **⚠ What it breaks, and it is fatal for the hero:** every mechanism in these briefs that
  makes the tree a tree needs mechanics *during* growth. S3m taper is strain sensed while
  growing. Reaction wood is curvature laid down per ring while growing. Dlouhá's
  ice-cream-cone result is *literally* "remove the mechanical stimulation during growth
  and the stem stops being a stem" `[D]`. Grow-then-inhabit deletes exactly the coupling
  the strongest literature in the sweep is about. **You would grow a barrel and then shake
  it.**
- **The shippable version is the split:** use C for the garden's background specimens,
  never for the hero. One flag.
- **Kill criterion for the split:** if a background specimen grown with mechanics off is
  visually distinguishable from one grown with mechanics on, at garden framing distance,
  the split fails. That is a `tools/garden_shot.mjs` A/B and it is cheap.

---

**D. A YEARLY CLOCK, LIKE EVERY PUBLISHED MODEL. Named only so nobody proposes it.**

Step in growth cycles: 1 GC = 1 flush, 10–40 GCs per life. This is LIGNUM, GreenLab,
MAppleT, AmapSim, L-PEACH and Nauber — *every* FSPM in `architecture.md`'s table — and it
is what GreenLab's 1000× substructure factorisation requires.

It is rejected for one reason: **there is no such thing as a growth cycle in which a
0.6 Hz stem mode is resolved.** A yearly clock deletes the wind, the fall, the bend
solver, and `blender_seq`'s whole argument. `architecture.md` §2 is right that "the engine
does not owe the literature years, it owes it flushes" — and the corollary is that the
literature's timestep is unavailable here, permanently.

---

## 5. Verdict: same engine, and the evidence is that nothing asks to touch `stepAuxin`

**"A real tree" is the same engine with new modules. It is not a separate path.**

The strongest evidence is not that the mechanisms are cheap — it is *where they land*.
Across eight briefs and roughly 200 citations, **not one mechanism asks for a change to
`stepAuxin`.** Several go further and say explicitly do *not* reach for auxin:

- compression wood is **not** an auxin asymmetry — measured directly in pine, Hellgren
  et al. 2004 `[D]`;
- bud release is **not** auxin — it is 50–100× too slow, Mason et al. 2014 `[D]`;
- cambial radial *identity* is **not** auxin — the gradient survives blocked signalling,
  Nilsson et al. 2008 `[D]`;
- no auxin-concentration-dependent cambial growth rate has ever been measured —
  Eckes-Shephard et al. 2022, verbatim `[D]`.

What the briefs *do* ask for is more **physics** (a strain rule, a curvature rule, a
modulus that varies with MFA), more **environment** (a clock, a light field), and
**memory** (one monotone accumulator). Those are the three categories the engine already
has homes for — `39a_stem.js`, `37_wind.js`, and `Axis.rest`. `39_fall.js` set the
precedent and CLAUDE.md already argues it: an environment the plant responds to is a
different category from a shape, and it has so far only *removed* stated constants.

There is one honest case for a separate path, and stating it sharpens the verdict.
**If you wanted decades, rings you can see, 30 m, and self-pruning in a closed stand**,
you would want yearly steps and GreenLab's factorisation — and that engine provably cannot
have real weather or two-way light, because it does not resolve seconds and it treats
same-age branches as identical. **The trade is explicit: you can have a grown tree or a
tree in weather.** This project's entire identity is the second one, so the choice was
made years ago and the briefs are all compatible with it.

### Ranked build order — first five, in order, each with a kill criterion

**0. Measure before building. (No code, ~1 session.)**
   Print `Γ = ρgL³/(Ed²)` per axis at the shipped 1.2 GPa; run `tools/jitter.mjs` on
   Ashfall Spire; run `light.md`'s pre-flight (rank the arrested conifer's blades by `L_i`
   and by age); and **build the crown-profile `r(z)` harness** (§3), because nothing in
   the suite can currently see a parabola.
   *Kill:* if the light rankings match the age rankings, drop light from the plan for the
   hero and keep it only as a garden feature. If Γ ≲ 0.1 on every lateral, the posture
   architecture is "static set point + elastic droop" and the dynamic controller
   discussion is closed.

**1. S3m strain-driven, non-negative radial increment.** `dr/dt = k·max(0, Ŝ − S₀)`, `Ŝ` a
   running max of |ε| with a ~6-step decay. **This is wood memory** (§0a) — do not build
   that separately. Retires `fruitFlow` (an unswept 48× constant with no lever arm) and
   ends the `radiusExp` argument.
   *Kill:* pre-flight the fixed point on paper first — `ε = M r/(EI)`, `I ∝ r⁴` ⟹
   `r³ ∝ M/(E ε*)`. If the solver does not land at Dean's δ = 0.31–0.33 on a static load,
   the closure is wrong and the term is not S3m.
   *Second kill:* `test/taper.mjs`'s 2% band. It was written first and it is exactly the
   band the wind-dependent-thickness bug lived in — do not widen it.
   *Warning to carry:* the engine's wind is **stationary**, so Bonnesoeur's high-pass
   filter has nothing to filter — a running max over any window converges to the same
   number. Take the running max because it is cheap and correct, but **do not build
   return-period machinery**; there are no storms and there is no week.

**2. Reaction wood.** `σ = sign(β·sin(A − A_set) + γ·C)`, `ΔC = −σ·4Δα·f·ΔD/D²`,
   accumulated into `Axis.rest`. Δα = 2.5e-3 for a conifer. Gated on [1].
   *Kill, and it comes first:* **settle the auxin/angle sign.** `posture.md` §3 flags `⚠`
   that Roychoudhry et al. 2013 may have auxin sizing the *antigravitropic* offset, i.e.
   more auxin ⟹ more **horizontal** — the inverse of the engine's shipped rule, which
   `test/tree.mjs` §2 asserts and which CLAUDE.md says inverts the whole silhouette. One
   careful read of that paper's Figure 4 before any code.
   *Second kill:* the `γ·C` proprioceptive term must reproduce a sign reversal at **7–12°
   from vertical** (Archer & Wilson 1973 `[D]`). Without it a pure `sin` rule oscillates
   about vertical, and the oscillation is the tell.
   *Free consequence to check for:* the `D⁻²` term predicts **90× more motricity in a 1 cm
   branch than in the 9.5 cm trunk**, and a finite lifetime budget (`|ΔC|max = 4Δα/D₀`) —
   57° ever for an axis that starts reacting at 5 mm, 14° at 20 mm. That is a
   shape-generating law with no shape in it, and it is the most engine-shaped result in
   eight briefs.

**3. The growth rhythm.** One oscillator + the `minInternode` queue fix. Independent of
   [1] and [2]; buildable in parallel. Buys the only channel with no rival.
   *Kill:* gap CV must move **up** past 1.0 (§4B). Down means regularisation, not
   clustering, and the mechanism is wrong.
   *Second kill:* `test/species.mjs` organ-for-organ on the eight herbs. The queue fix
   touches shared code.
   *Third:* the queue needs a cap; without one, the stalled-shoot trap becomes an
   unbounded pile.

**4. Apical control rewrite — pick ONE of the export tax or the sink share, pre-flight
   both on paper.** Retires the stated `L = 0.5` from SCIENCE.md's debt list, and is the
   only candidate that might bend the crown toward a parabola without a light field.
   *Kill:* it must not reduce to a memoryless function of distance-below-apex — that is
   the falsified class, and both candidates escape it only because their history lives in
   a grown quantity (`aⱼ`, `S(x)`). If the implementation collapses to `f(d_from_apex)`,
   stop.
   *Second kill, and it is the interesting one:* the export tax's `λ` must land in
   **0.32–3.2 world units**. The crown currently needs `dominance: 6.0`. **The honest
   likely outcome is that the measurement kills the mechanism** — and if so, that is
   `auxinwood.md`'s central claim confirmed on our own tree (one auxin field cannot span
   metres), which is a publishable negative in the same category as the four falsified
   senescence hypotheses.

**5. The light field — only if step 0's pre-flight survives.** Biggest build in the set,
   two-way coupled, needs a CPU path for thirteen headless harnesses, and its own brief
   says a solitary 2.88 m sapling will not self-prune and light gives no whorls. Its real
   value is **senescence order** (retires a SCIENCE.md imposed prior) and the **garden** —
   both worth having, neither an answer to "is this a tree".
   *Kill:* the pre-flight in step 0.
   *Second kill:* if the CPU fallback costs more than ~5 ms amortised per 50 steps, it
   cannot run in the headless suite and the mechanism becomes browser-only, which is the
   category `tools/wind_check.mjs` exists to avoid.

### Deliberately not in the top five

- **Rings.** Need [1] + a clock + a cross-section view. Nothing draws a section.
- **Heartwood, roots, autostress, conduit taper as anatomy.** All four briefs say skip for
  form: wrong life stage, isometric, a strength term, and per-cell respectively.
- **Anything auxin→compression wood, auxin-concentration→growth-rate, or the full flux
  partition.** Three separate briefs plus the project's own `test/tree.mjs` §3b.
- **`marginBias.ay` / the needle.** Built, measured, drawn and rejected 2026-07-31.
- **Physiological age as a new architecture.** `architecture.md` overstates the gap
  (§1, T1 row): the engine has accumulators. What it lacks is small.

### One last cross-brief note

Three briefs independently converge on **Duchemin et al. 2018** as the literature's answer
to crown shape — `posture.md` §6, `architecture.md` §4, `hydraulics.md` §4 — and it is a
*self-similar* model. `architecture.md` draws the right inference and it should be carried
forward loudly: **self-similar means scale-invariant means no ontogeny**, so the one
published memoryless model that gives a non-conical crown provably *cannot* give the
excurrent→decurrent transition. The crown-shape answer everyone points at is structurally
unable to produce the thing that makes an old tree look old. If a parabolic crown is the
goal, the three unpublished routes in §2 are not a fallback — they are the only routes
with memory in them.
