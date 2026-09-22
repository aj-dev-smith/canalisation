# Tend — shears, a lamp and auxin paste: what the literature actually says

Answer to the research brief of 2026-09-22. Four parallel literature strands ran: bud release,
transport numbers, the mechanism of phototropism, and the quantitative laws of tropism. On top of
that, the lead did a primary-source pass on the four quote-critical questions (Q1, Q7, Q10, Q13).

**Read in full by the lead:**
- Thimann & Skoog 1933 and 1934, and Skoog & Thimann 1934
- Went 1926, Went's own 1985 retrospective, and Went & Thimann 1937 (*Phytohormones*)
- Darwin 1880 (the text)
- Snow 1931
- Bastien et al. 2013, 2014 and 2015
- Chauvet et al. 2016 and 2019
- the Kramer 2011 supplement

**Spot-checked against the source, verbatim:** the load-bearing strand quotes from Morris 2005,
Mason 2014, Balla 2016, Haga & Sakai 2012, Han 2021 and Inoue 2008. Every one matched.

**How to read this.** Flags are the same as in [research_7_30_26.md](research_7_30_26.md):

- **[D]** demonstrated: the cited paper shows it directly.
- **[I]** inferred: the authors assert it, or it follows from cited facts, but it was not shown.
- **[OURS]** our construction. Not in any paper. Test it before trusting it.
- **⚠** contested, or we are unsure, or we could not read the primary source.

A second set of tags says how deeply a source was read: (FT) full text, (Abs) abstract, (Rev)
through a review, (Cit) citation checked but content not read. "Via strand" means one of the four
sweeps read it and the lead did not re-read it.

**Engine note.** This worktree already holds an uncommitted draft of Tend: `Axis.streamAt`,
`releaseBuds`, `Plant.cut`, `paste` and `phototropicPull`, with `patSpeed: 0.12`, `photoGain` and
`photoHalf` in the presets. Where a finding bears on a line in that draft, it is named.

---

## Executive summary — twelve findings that change what you build

1. **The 1933–34 experiment used agar blocks, not lanolin, and "wipe it off" was already in it.**
   - Thimann & Skoog put *Rhizopus* growth substance on the cut top of broad bean in agar blocks
     renewed every 6 h. The buds grew "as soon as the application … was stopped". [D, §1.1]
   - An intermittent supply (every 12 h) failed within 4 days. [D, §1.1]
   - Lanolin paste is Laibach's 1933 method; lanolin on decapitated pea appears later
     (*Phytohormones*, 1937).
   - Page copy should say "agar", or "later, lanolin".

2. **The depletion front exists (≈1 cm/h in pea) but it does not start release.**
   - Pea buds 40 cm below the cut grow within 2.5 h, and paste on the stump cannot stop that first
     growth. [D, §1.3]
   - Auxin decides the next step, from about 24–48 h: whether a released bud **commits** to a
     branch or is pushed back into dormancy. [D, §1.3]
   - An auxin-only engine should map "escape" to commitment. It has no honest way to show the
     first flush, which is driven by sugar and cytokinin.

3. **"The bud nearest the cut takes over" is true of commitment, not of release, and not in every
   system.** [D, §1.2]
   - In pea, release is simultaneous all along the stem. The upper bud then wins over 3–5 days,
     and the loser returns to dormancy.
   - The winner is the bud just below wherever the stem's flow was broken, even when it is the
     smaller bud.
   - In young broad bean and pea seedlings, the **lowest** buds grow first (Thimann & Skoog 1934;
     Skoog & Thimann 1934; Snow).

4. **The draft commits a bud instantly (`bornAt = t − 1`), which guarantees exactly one winner.**
   [OURS, from Prusinkiewicz 2009's stated condition]
   - The canalisation model releases several buds exactly when "bud activation is slow compared to
     the process of auxin depletion".
   - The number released is therefore about v_PAT·τ_commit divided by the bud spacing.
   - Add a commitment lag τ_commit (§4.1), or run the canalisation switch itself.

5. **Snow 1931 measured inhibition *increasing* with distance from the apex.** [D, §1.7]
   - Buds 70–170 mm below a leaf or apex are more strongly inhibited than buds 5–42 mm below it,
     and buds "are at first not inhibited because they are too close" to the apex.
   - No paper gives a measured law of inhibition against distance.
   - So **`dominance` (λ) and the exponential form are dials, not lookups.**

6. **Retiring a bud for good after a failed coin flip has no support; the draft's re-armable bud is
   right.** [D, §1.6]
   - Inhibited buds stay competent for weeks and cycle between dormant and growing.
   - The one-way step is **commitment**: large buds lose sensitivity to apical auxin
     (Chatfield 2000).

7. **The transport-to-growth ratio is a lookup: v_PAT/v_growth, median 6.6, range about 4–16.**
   [D, Kramer 2011, §1.5]
   - [OURS] On shipped defaults G ≈ 0.024 units/step, so the draft's `patSpeed: 0.12` is
     v/G ≈ 5.0. That is inside the measured range, a little under the median.

8. **The rate of a tropic turn is set by growth rate over radius, with one measured
   dimensionless gain.** [D, §2.5]
   - dθ_tip/dt = β̃·sin θ·(dL/dt)/R, with β̃ ≈ 0.6–0.8 in wheat.
   - It is independent of the strength of gravity, and proportional to growth across 17–32 °C
     (Chauvet 2016, 2019).
   - The shipped `tropism` lerp is growth-independent. An axis that has almost stopped
     elongating still turns.

9. **Tip steering can get the timing right or the shape right, never both.** [OURS, §2.5]
   - With the measured β̃, the apex turns 90° over only about 2R of new stem, which reads as a kink.
   - The shipped `tropism` gives a plausible arc (e-fold ≈ 0.26 units as laid, ≈1.2 after subapical
     stretching), but with no link to growth.
   - Real plants bend the whole growth zone and then concentrate the curvature at its base. That
     is the AC model, and it needs curvature in already-laid stem within the growth zone.
   - ⚠ Its proprioceptive term is **not auxin**: autostraightening is "not regulated through auxin
     distribution" (Haga & Iino 2006).

10. **Light and gravity combine as additive sine terms, and the draft's
    `normalize(want + k·toward_light)` is the exact equilibrium of that.** [D, model fitted to data;
    OURS, algebra]
    - Measured, the photo-to-gravi ratio scales as I^0.4 (b = 0.36–0.44), not as a saturating
      I/(I + I_half).
    - The sine law for *light* is assumed in every model and has never been measured. ⚠
    - Light also turns gravitropism **down**, through phyA and through plastid conversion. [D, §2.3]

11. **At this engine's compression, real tropic latencies are shorter than a frame.** [OURS, from D
    ratios, §2.6]
    - A 90° reorientation is about 4–6 steps and the reaction delay about 2–3 steps.
    - The plant should follow the lamp essentially as it moves. Bending shows as *motion* only if
      development is slowed while tending.

12. **A decapitated stem barely responds to light: phototropism scales with auxin from the apex.**
    [D Abs, Sato 2014]
    - Stem phototropism is "proportional to the auxin supply from the shoot apex", and decapitation
      gives "a small negative phototropism".
    - With both tools on the page, a stump should not bend toward the lamp.
    - Also: the shipped `prune()` can never release a bud. The dead axis returns before the
      branching loop runs, and dominance is measured from its own dead tip. The draft's stream
      path fixes this. [OURS, code reading]

---

# Part 1 — Shears: decapitation, release and take-over

## 1.1 Thimann & Skoog, exactly (Q1) — primary sources read in full

The three papers:

| | Thimann & Skoog 1933 | Thimann & Skoog 1934 | Skoog & Thimann 1934 |
|---|---|---|---|
| citation | *PNAS* 19(7):714–716, doi:10.1073/pnas.19.7.714. "Communicated April 24, 1933" | *Proc R Soc Lond B* 114(789):317–339, doi:10.1098/rspb.1934.0010 (1 Feb 1934) | *PNAS* 20(8):480–485. "Communicated July 2, 1934" |
| plant | *Vicia faba*, 4–6 weeks old, grown in light | *Vicia faba*, ~15 cm | *Pisum sativum* 'Alaska' |
| auxin | growth substance from cultures of the fungus *Rhizopus suinus*, "about 2·10⁻⁶ mg per plant unit" | same | crystalline "hetero-auxin" and auxin B from Kögl; Went & Thimann 1937 describe hetero-auxin as indole-3-acetic acid |
| vehicle | **agar blocks** on the cut top, "applied … every 6 hours" | agar, "renewed every 6 hours", sealed with paraffin:vaseline 3:1 | **paraffin cups** of aqueous solution, refilled every 8 h, "as satisfactory … as … agar blocks" |

What the 1933–34 papers show, all [D, FT]:

- **Why every 6 h.** "6 hours were necessary for a complete transference of growth substance into
  the stem."
- **The tip is a strong source; a sleeping bud is none.**
  - Terminal buds of 12 cm plants gave "30 to 40 plant units … in an hour" into agar.
  - Undeveloped laterals gave "practically no growth substance".
  - A released lateral gave "almost one-half as much" as an intact terminal bud.
  - Leaves gave about 5 units/h when youngest and under 1 unit/h when oldest.
- **Dose.**
  - About the tip's own output (160 units per 6 h) gave "a slight but definite inhibition".
  - About ten times that (1400–1700 units per 6 h) inhibited the buds completely.
  - [I] The authors blame the gap on application spread "over the whole stem surface" and on
    inactivation at the wound.
- **Numbers from one experiment, bud growth over 8 days:**
  - 3.4 ± 0.5 mm, intact
  - 16.0 ± 2.7 mm, decapitated with plain agar
  - 1.8 ± 0.6 mm, with 1670 units
  - Each experiment used 30–40 buds, and "the inhibition also takes place in the dark".
- **Stopping releases the buds.**
  - 1934: "an immediate increase in rate of elongation as soon as the application of growth
    substance was stopped, indicating that the buds were in no way damaged."
  - Skoog & Thimann 1934: "the inhibited buds grow in a normal manner after the application of
    hormone has ceased."
- **The supply must be continuous.** 300 units every 12 h inhibited markedly "only on the first
  day", and "in 4 days the growth of buds on both sets of plants was equal." (1934)
- **Their mechanism (1934).**
  - "the growth substance produced by the terminal bud reaches the lateral buds and prevents their
    own production of growth substance." After decapitation the buds "commence to synthesize growth
    substance on their own account."
  - They also name a second factor: "hormone control and the supply of nutritive material". With
    the leaves removed, buds grew normally for 5 days and then fell behind.
  - [I] This is recognisably the ancestor of the idea that a released bud has to become a source.
- **Transport is polar.** Growth substance crossed 3 mm sections of *Vicia* stem downwards, with
  "almost no transport" when the section was inverted. [D]
- **Laibach's objection answered.** Laibach said inhibition was a side-effect of the stem swelling.
  Skoog & Thimann 1934 show inhibition was complete "without any accompanying increase in stem
  length or thickness." [D]

**Where the lanolin comes from.**
- Laibach F (1933) "Versuche mit Wuchsstoffpaste", *Ber Dtsch Bot Ges* 51:386–392, introduced
  lanolin as the carrier for auxin. ⚠ The citation is taken from a 1943 US patent (Chalkley,
  US2328193); the paper itself was not read.
- Laibach (1933) and Müller (1935) put lanolin pastes of orchid pollinia or urine on decapitated
  legumes and inhibited the cotyledonary buds. [D, as described in Went & Thimann 1937]
- *Phytohormones* Fig. 59 shows decapitated etiolated pea with **0.15–10 mg IAA per g lanolin**
  against plain lanolin. [D; ⚠ the figure's original source is not given in the caption]

**Page copy that is correct:**

> 1933–34, Pasadena. Kenneth Thimann and Folke Skoog cut the growing tips off broad beans and put
> the tip's hormone back in its place, in blocks of agar renewed every six hours. The buds below
> stayed asleep. When they stopped, the buds grew. (Later versions use auxin in lanolin.)

## 1.2 Which buds grow, how many, and who takes over (Q2)

**Release is simultaneous and spread along the stem, not ordered by distance** (pea) [D, FT, both
quotes checked verbatim]:
- Morris 2005: "decapitation of garden pea plants with seven leaves expanded caused bud growth at
  nodes 7, 6, and 2 within 4 to 6 h … Buds at nodes 1 and 7 were separated by up to 20 cm."
- Mason 2014: "significant bud growth in buds 40 cm below the shoot tip within 2.5 h".

**Then one bud takes over, within days** [D]:
- *Balla J et al. 2016, Sci Rep 6:35955* (FT, verbatim), pea seedlings with two buds:
  - Both buds grew at the same rate ("bud length doubled daily").
  - "Three days after decapitation, growth rates began to slow in shoots that developed from lower
    buds, while upper buds continued growth at the same rate and became evidently dominant".
  - "dominance was not imposed immediately following decapitation".
  - The loser went back to dormancy by day 5: the dormancy marker DRM1 was high again.
- *Thimann & Skoog 1934* (FT), *Vicia*, followed for 5 weeks:
  - The initially longer bud "develops very rapidly"; the shorter "soon shows a marked
    retardation".
  - When the longer was cut on day 35, "the shorter bud at once showed a noticeable increase in
    rate of growth."
  - Their summary: "a rapidly developing lateral bud markedly inhibits the growth of another bud
    adjacent to it."
- Dostál 1926, on *Scrophularia*, as told by Went & Thimann 1937: "Once ahead, this growing bud
  inhibited the other strongly … the balance between inhibition and growth is rather delicately
  poised." [D, Rev]

**What decides the winner** [D, FT verbatim]:
- In Balla 2016, a cut or a ring of transport inhibitor in an intact plant released whichever bud
  lay below it: "The outgrowing axillary bud (lower or upper) was consistently the bud above which
  the primary stem auxin flux was interrupted."
- A ring of the transport inhibitor TIBA placed between the two buds gave "two equally growing
  shoots".
- **Position relative to the break in stem flow beat bud size.**

**Which buds come first depends on the system** ⚠:
- *Vicia*: "the two lowest lateral buds … when the plant is decapitated, it is these buds which
  develop first and grow most markedly, as pointed out by Snow. The buds higher up … very seldom
  higher than those in the axil of the lowest leaf, may also develop, but do so somewhat later"
  (Thimann & Skoog 1934). Those lowest buds sit in axils whose leaves are absent, and leaves
  inhibit their own axillary bud (Dostál). [D]
- Pea: "As a rule Bud No. 2 at first develops the most rapidly, but in a few cases one of the other
  buds may subsequently overtake it … the more rapidly growing bud may completely stop the growth
  of Bud No. 2" (Skoog & Thimann 1934). [D]
- Wild-type Arabidopsis releases "several uppermost buds". [I; cited by Prusinkiewicz 2009 from
  Cline et al. 2001 ⚠, primary not read]

**Inhibition runs in both directions.** "Not only can the upper branch inhibit the lower branch, but
also the lower branch can inhibit the upper branch" (Ongaro V, Bainbridge K, Williamson L, Leyser O
2008, *Mol Plant* 1:388–400). [D, Abs] [I] The draft's `streamAt` only counts sources above a bud,
so it cannot represent this.

**How a new shoot holds down the buds below it (correlative inhibition):**
- It acts from the stem, not inside the bud:
  - ¹⁴C-IAA from the dominant apex "was never detected in the unlabelled shoot" (Morris 1977,
    *Planta* 136:91–96). [D, Abs]
  - "Little or no radioactivity … into the lateral buds … during the first 48 h" (Hall & Hillman
    1975, *Planta* 123:137–143). [D, Abs]
- The subordinate shoot's own export is "severely restricted", and recovers "rapidly" when the
  dominant apex is removed (Morris 1977). [D, Abs]
- Auxin applied at the top of a decapitated stem stops the bud's PIN from polarising and stops it
  canalising (Balla 2011, *Plant J* 65:571–577). [D, Abs]
- ⚠ There is a rival reading. Dun et al.'s "bud transition hypothesis" (via Ferguson & Beveridge
  2009, *Plant Physiol* 149:1929–1944) treats export from the bud as "a consequence, rather than a
  cause, of bud release".

**Woody plants and conifers.**
- A released lateral "can grow larger and may bend upwards", and new wood does the bending (Wilson
  2000, *Am J Bot* 87:601–607). [D, Abs]
- ⚠ No primary study of conifer leader replacement was found (same gap as research_7_30_26 §2.4).
- Many *Picea* and *Abies* axils hold no true bud, and 66% of *P. engelmannii* axillary buds are
  latent or aborted (Burrows 2021, *Plants* 10:2551, review). [I]

## 1.3 The depletion front: release versus sustained outgrowth (Q3)

**The front is real.** "The location of the depletion in auxin level was consistent with an IAA
transport rate of just over 1 cm h⁻¹", and at 4 h only the top 4–5 cm of stem was depleted
(Morris 2005). [D, verbatim]

**It is not what starts release.**
- Morris 2005 saw no IAA change at node 6 at 4 h, nor next to node 2 at 6 h, yet both buds had
  begun to grow. [D]
- Mason 2014: a signal that releases buds 40 cm down in 2.5 h "would need to travel at 16 cm h⁻¹ or
  faster". [D, verbatim]
- Mason 2014 on a low cut: "plants decapitated in the lower third of the stem resulted in a 5-h
  delay in bud release". An auxin front predicts the opposite. [D, verbatim]
- Bean: release is detectable within 30 min. With IAA on the stump the bud grows for 7 h, stops for
  15 h, then resumes after about 2 days (Hall & Hillman 1975). [D, Abs]

**What does start it: sugar and cytokinin.** [D]
- Mason 2014, pea:
  - phloem assimilate travels at about 150 cm/h and reaches node 2 in 38 min;
  - bud sucrose is up 44% by 4 h;
  - BRC1 (a bud-dormancy gene) falls within 2 h;
  - a girdle, or removing the leaves, prevents release.
- Cao D, Chabikwa T, Barbier F, Dun EA, Fichtner F, Dong L, Kerr SC, Beveridge CA 2023, *Plant
  Physiol* 192:1420–1434 (FT, via strand):
  - cytokinin in the bud rises within 1 h;
  - the bud's own IAA rises at 3 h;
  - "Auxin efflux from axillary buds can promote sustained bud growth but not bud release."

**What auxin does.**
- Morris 2005: "In the second mechanism, which first comes into play around 24 h after
  decapitation, a lack of auxin allows long-term, sustained bud outgrowth." [D, verbatim]
- Mason 2014: auxin works "to either promote the progression of growing axillary buds into branches
  or to force them back into dormancy", and "this hormonal effect is substantially dependent on bud
  position because auxin is depleted in a basipetal gradient". [D, verbatim]
- Blocking efflux from the bud alone has no effect on the first outgrowth; effects appear from 48 h
  (Chabikwa, Brewer & Beveridge 2019, *Plant Physiol* 179:55–65). [D, Abs]
- Cline (1997, *Am J Bot* 84:1064) already separated "Stage III" (release) from "Stage IV" (growth
  over the following days to weeks).

⚠ **One counter-case.** In Balla 2016's seedlings, leaving 90 mm of stump instead of 5 mm delayed
the DRM1 and BRC1 responses by about 12 h. That delay is about the size of a front (≈0.7 cm/h, the
strand's arithmetic [OURS]).

**The consensus (Beveridge line; Barbier et al. 2019 *Trends Plant Sci* 24:220–236; Cao 2023):**
- Initial release takes hours, happens along the whole stem, and is reversible.
- Auxin governs the position-dependent step, from about a day: commitment or re-arrest.

[OURS] The draft's comment "the buds nearest the cut are the first it drains past, so they are the
first to wake" is right if "wake" means **"free to commit"**. It is wrong if it means release.

## 1.4 The canalisation switch (Q4)

Prusinkiewicz P, Crawford S, Smith RS, Ljung K, Bennett T, Ongaro V, Leyser O (2009) *PNAS*
106:17431–17436, doi:10.1073/pnas.0906696106. The strand read the equations from the paper's
equation images; PIN is held per metamer face:

```
Φ_i→j        = T·c_i·[PIN_i→j] − T·c_j·[PIN_j→i] + D·(c_i − c_j)
d[PIN_i→j]/dt = ρ·Φⁿ/(Kⁿ+Φⁿ) + ρ₀ − μ·[PIN_i→j]     (Φ ≥ 0;  otherwise ρ₀ − μ·[PIN])
a bud is active once its export flux exceeds Φ_th
```

The only published parameter table found is **dimensionless**. It is Shinohara, Taylor & Leyser
2013, *PLoS Biol* 11:e1001474, Table 1, run "according to Prusinkiewicz et al. (2009)" (⚠ the 2009
supplementary file was blocked):

| μ | ρ | T | ρ₀ | n | K | D | H | H_r | Φ_th |
|---|---|---|---|---|---|---|---|---|---|
| 1.8 | 2.7 | 0.5 | 0.1 | 4.5 | 0.5 | 0.02 | 10 | 3.5 | 2 |

⚠ The Hill exponent n has never been measured. Saturation of the stem's transport capacity is not
needed: "competition can emerge from the positive feedback between auxin flux and polarization of
active auxin transport."

| Prediction | Status |
|---|---|
| **The first source to establish flow wins.** "dominant because it was established first, rather than because of its apical position" | modelled; consistent with Balla 2016's cut and ring experiments [D] |
| The bud nearest the cut commits first. Several buds are released when "bud activation is slow compared to the process of auxin depletion" | modelled |
| **Apical auxin (the Thimann–Skoog experiment) blocks canalisation** | [D] Balla 2011: "Apical auxin application on the decapitated stem prevents this PIN polarization and canalization" |
| Auxin acts without entering the bud | [D] Hall & Hillman 1975; Morris 1977; Booker, Chatfield & Leyser 2003, *Plant Cell* 15:495–507 |
| **Hysteresis: a committed bud ignores apical auxin** | [D] Chatfield et al. 2000 *Plant J* 24:159–169 (Abs): "apical auxin can inhibit the growth of small buds, but larger buds were found to have lost competence to respond" |
| Canalisation is what triggers release in pea | **contradicted** (Chabikwa 2019; Cao 2023) |
| Auxin applied at the base does not inhibit | ⚠ not verified (Chatfield 2000 full text blocked) |

## 1.5 Numbers (Q5) — lookups, and the ratio

| Quantity | Value | System and source | Flag |
|---|---|---|---|
| PAT (polar auxin transport) speed | "just over 1 cm h⁻¹" at the front; 10–12 mm/h | intact pea, Morris 2005 | [D] |
| PAT speed, pulse peak | 8.8–9.0 mm/h | pea, re-fit by Mitchison 2015, *PLoS Comput Biol* 11:e1004487 | [D, via strand] |
| PAT speed | 12–15 mm/h | maize coleoptile, Goldsmith 1967 *Plant Physiol* 42:258 | [D, Abs] |
| PAT speed | 14.8 mm/h; "1–1.5 cm/h regularly found" | Arabidopsis inflorescence, Boot et al. 2016 *J Exp Bot* 67:649 | [D, via strand] |
| PAT speed | 13 mm/h growing, 3 mm/h dormant | white ash, Hollis & Tepper 1971 *Plant Physiol* 48:146 | [D, Abs] |
| PAT speed | 10–15 mm/h | oat, van der Weij 1932 | ⚠ not verified. It is a bioassay speed, and Kramer 2011 excludes all of those |
| PAT speed, bean | about twice dwarf pea | Eliezer & Morris 1980 *Planta* 149:327 | [D, Abs]; no absolute value |
| Phloem sucrose | ~150 cm/h | pea, Mason 2014 | [D] |
| Stem elongation | 0.94–1.13 mm/h; growth confined to the top ~4 cm | Arabidopsis inflorescence, Phyo et al. 2017 *Plant Physiol* 175:1593 | [D, via strand] ⚠ |
| Elongation | ~2.5 mm/h | dark-grown maize, coleoptile plus mesocotyl, Kramer 2011 supplement | [D] |
| Elongation, pea, oat, bean | — | not retrieved | ⚠ |
| **v_PAT / v_growth** | **median 6.6.** "growth rate bounds auxin speed from below" | 227 speeds from 95 papers: Kramer EM, Rutschow HL, Mabie SS 2011 *Trends Plant Sci* 16:461–463, supplement read by the lead | **[D]** |
| v/G range for elongating shoots | ≈4–16 (maize 4.3–6; Arabidopsis 8.8–16 from sources that do not match) | strand arithmetic | [OURS] ⚠ |
| Dilution of a lateral gradient at v/G = 6.6 | 3× becomes 2.3× | Kramer 2011 | [D] |
| Reach of dominance | the whole young shoot: ≥6 nodes, ≥20–40 cm | pea, Morris 2005; Mason 2014 | [I from D] |
| Inhibition against distance | **no measured law**; increases with distance up to 17 cm (§1.7) | Snow 1931 | [D] |

**[OURS] What this means in engine units.**
- An axis's total growth, tip plus subapical stretch, is about 0.0052 + 0.0072 × 2.6 ≈ **0.024
  units/step** on shipped defaults.
- So v_PAT ≈ 6.6 × 0.024 ≈ **0.16 units/step**, with a range of 0.10–0.38.
- The draft's 0.12 sits at v/G ≈ 5.0.
- At 0.16 units/step, the front crosses λ = 6 units in about 38 steps, and a 20-unit stem in about
  125 steps.

## 1.6 Buds far below, stumps, and "retired" buds (Q6)

**Buds held down for a long time are still competent** [D]:
- A node-2 bud held dormant below a girdle grew 11.6 mm in 7 days when given the cytokinin BA
  (Ferguson & Beveridge 2009).
- Node 7 still responds in pea plants over 150 cm tall (Mason 2014).
- Pea buds cycle between dormant and growing (Devitt & Stafstrom 1995 *Plant Mol Biol* 29:255;
  Stafstrom et al. 1998 *Planta* 205:547).

**Losers go back to dormancy; they do not die** (Balla 2016). The irreversible step is commitment
(Chatfield 2000).

**Bud death is structural and slow.**
- Blank axils, and meristems shed once bark forms, especially in conifers (Burrows 2021). [I]
- "the traditional view of auxin-mediated dormancy release is incomplete" (Meier, Saunders &
  Michler 2012, *Tree Physiol* 32:565). [D, Abs]

**Is anything computable beyond "no source above the bud"?** [OURS]
- The flux on the bud's **whole path to the root**, including branches that join the stem below it
  (Ongaro 2008).
- Whether the axil holds a bud at all.
- The leaf and sugar supply remaining, which this engine cannot compute. [D] A girdle high on the
  stem releases buds as decapitation does; a girdle low on the stem blocks auxin but releases
  nothing (Ferguson & Beveridge 2009).

## 1.7 Snow 1931: inhibition increases with distance (read in full)

Snow R (1931) "Experiments on growth and inhibition. I.—The increase of inhibition with distance",
*Proc R Soc Lond B* 108:209–223, doi:10.1098/rspb.1931.0033. His summary, verbatim [D, FT]:

- "(1) In etiolated decapitated pea seedlings, single developing leaves inhibit axillary buds that
  are from 70 to 100 mm. below them more strongly than similar leaves in similar seedlings inhibit
  buds that are only from 5 to 15 mm. below them."
- "(2) … apical buds … inhibit axillary buds that are from 70 to 170 mm. below them more strongly
  than … those that are only from 14 to 42 mm. below them."
- "(6) … the axillary buds are at first not inhibited because they are too close to the developing
  leaves in or near the apical bud. They therefore grow until, through the growth of the main
  shoot, they reach a distance below the developing leaves at which inhibition is strong enough to
  stop them."

This explains why pea buds grow to "about 1 mm" and then stop.

⚠ His own caveats: "the increase may continue only until some certain distance is reached, and then
cease". The work was on etiolated, decapitated seedlings, with single leaves as the source.

**Implication for the engine.**
- Both the shipped rule and the draft's `streamAt` assume "near the apex means held down, far means
  free". At the only scale where anyone has measured it, the sign is the other way.
- Together with the whole-shoot reach in §1.5, **no lookup exists for λ, for `branching`, or for the
  exponential form.**
- [OURS] For a single source, only the escape distance d* = λ·ln(1/threshold) matters (22 cm on
  shipped values). So the two stated numbers are, in effect, one dial.

---

# Part 2 — The lamp: phototropism

## 2.1 The history, for the page (Q7)

| When | Who | What was done | One-line claim | Checked |
|---|---|---|---|---|
| 1880 | Charles Darwin, "assisted by Francis Darwin", *The Power of Movement in Plants* (John Murray) | Coleoptiles of *Phalaris canariensis* (canary grass; he calls them "cotyledons") and *Avena*. Tops covered with "tin-foil blackened within", blackened glass tubes (clear tubes as controls), or cut off. Shading the top 0.15–0.2 inch stopped the fully lit lower part bending | "We must therefore conclude that when seedlings are freely exposed to a lateral light some influence is transmitted from the upper to the lower part, causing the latter to bend." | verbatim (text) |
| 1880 | same book | Circumnutation | "every growing part of every plant is continually circumnutating"; "heliotropism is a modified form of circumnutation" | verbatim |
| 1890s | Rothert | Confirmed in shoots that the zone that perceives and the zone that bends are separate | — | via Went & Thimann 1937. ⚠ The date is cited as 1893, 1894 or 1896 |
| 1910–1913 | Peter Boysen-Jensen | Cut off the *Avena* tip and stuck it back on with gelatin; lit only the tip; the base bent | the transmission is "of a material nature" | *Ber Dtsch Bot Ges* 28:118–120 (1910) and 31:559–566 (1913) confirmed via Crossref; content via Went & Thimann. ⚠ The textbook "mica on the shaded side" experiment credited to him in 1913 was not verified. Went & Thimann credit the mica, cocoa-butter and platinum blocking results to Paál |
| 1914, 1919 | Árpád Paál | Showed the stimulus crosses gelatin but not cocoa-butter, mica or platinum; in darkness, a tip replaced on one side of the stump makes it bend | the tip is "the seat of a growth-regulating center"; "for the first time, the idea of a growth hormone enters botanical literature" (Went & Thimann) | *Ber Dtsch Bot Ges* 32:499–502 (1914) confirmed; *Jahrb wiss Bot* 58 (1919) |
| June 1926 | Frits Went | Tips set on **10% gelatin** for ~1 h; gelatin blocks on one side of decapitated *Avena* gave curvature within 1 h, up to 40° by 3 h, reproducible to ≤20% | the tip releases a growth-promoting substance, and curvature measures it | read in full: *Proc KNAW* 30:10–19, "Communicated at the meeting of June 26, 1926" |
| 1927/1928 | Went, thesis *Wuchsstoff und Wachstum*, *Rec Trav Bot Néerl* 25:1–116 | Agar blocks and the *Avena* curvature test; under one-sided light, downward diffusion is "diverted from the lighted to the darkened side" | "Blaauw's theory of phototropic curvature has to be put aside" | Went's own 1985 Citation Classic. ⚠ Dated 1928, "Published November, 1927" (Went & Thimann footnote) |
| 1924–1927 | Nikolai Cholodny | 1924: root and coleoptile tips restore geotropism to decapitated roots. 1926 (*Jahrb wiss Bot* 65:447–459): hollowed-out lupin hypocotyls regain geotropism when a maize coleoptile tip is placed inside | tropisms come from uneven distribution of growth hormone (1927, *Biol Zentralbl* 47:604–626) | via Went & Thimann; 1927 citation from secondary lists ⚠ |
| 1937 | Went & Thimann, *Phytohormones* (Macmillan) | Section "The Cholodny-Went Theory", p. 154 | Went (1985): so named because Cholodny "had suggested this a year earlier" | read |

## 2.2 The modern mechanism, and the status of Cholodny–Went (Q8)

**Receptors** [D]:
- phot1 works at low fluence; phot1 and phot2 act redundantly at moderate to high fluence
  (Sakai 2001, *PNAS* 98:6969; Liscum et al. 2014, *Plant Cell* 26:38–55).
- NPH3 is required at every fluence.

**The gradient.** "phototropin activation leads to the formation of a gradient of the growth
hormone auxin across the photo-stimulated stem" (Fankhauser & Christie 2015, *Curr Biol* 25:R384).
[D, Abs] In *Brassica* hypocotyls there is **≈20% more free IAA on the shaded flank**, graded gene
expression appears before any curvature, and NPA (an auxin-transport inhibitor) at the apex abolishes
both (Esmon et al. 2006, *PNAS* 103:236). [D, FT via strand]

**PIN3.** Ding et al. 2011, *Nat Cell Biol* 13:447 (Abs): light represses PINOID, and PIN3 is
"polarized specifically to the inner cell sides by GNOM"-dependent trafficking. [D]
- ⚠ Haga & Sakai 2012 could not detect the PINOID repression.
- ⚠ PIN3 polarity is probably not the trigger. The Friml lab: "pronounced PIN3 polarization is
  observed with too much of a delay compared with the phototropic growth response" (Han et al.
  2021, *New Phytol* 232:510, checked verbatim).
- A read-out of auxin, DII, is already asymmetric after 1 h, before any bending. A cross-section
  flux model found endodermal PIN3 polarity "not sufficient", with apoplastic pH "the most
  important" factor (Hohm et al. 2014, *Mol Syst Biol* 10:751). [D]

**Continuous light, which is the lamp's case, is contested** ⚠:
- **PIN-independent:** at 0.17 µmol m⁻² s⁻¹ for 3 h, phototropism "was found not to be impaired
  even in the pin1 pin3 pin7 triple mutants". The authors propose "a PIN-independent mechanism that
  requires continuous stimulation" (Haga & Sakai 2012, *Plant Physiol* 160:763–776, checked
  verbatim).
- **PIN-dependent:** *pin3 pin4 pin7* was "strongly impaired … after long-term unilateral light"
  at 100–120 µmol m⁻² s⁻¹ for 20 h (Willige et al. 2013, *Plant Cell* 25:1674). [D, via strand]
- The two differ in genotype, fluence and duration.

**Where light is perceived.**
- **Coleoptiles:** the tip. Auxin applied at the tip is redistributed sideways (Haga et al. 2005,
  *Plant Cell* 17:103). [D, Abs]
- **Arabidopsis hypocotyl:**
  - Perception is in the upper hypocotyl, and phot1 in the elongation zone is enough; the apex and
    cotyledons are dispensable (Preuten et al. 2013, *Curr Biol* 23:1934). [D, Abs]
  - Perception and bending both happen in the top ≈1.1 mm (Yamamoto et al. 2014, *PCP* 55:497).
    [D, Abs]
  - ⚠ Christie et al. 2011 (*PLoS Biol* 9:e1001076) dissent: sideways fluxes "are initiated in and
    above the hypocotyl apex".

**Cholodny–Went is demonstrated** in coleoptiles (Haga 2005), dicot hypocotyls (Esmon 2006) and
pea epicotyls (Haga & Iino 2006, *J Exp Bot* 57:837, checked). [D]

**It is contested** ⚠ by Bruinsma & Hasegawa 1990 (*Physiol Plant* 79:700): "direct measurement …
invariably shows an even distribution of auxin", with growth inhibitors on the lit side. Esmon's
GC-MS gradient argues against "invariably". Blaauw-type growth inhibition is demonstrated in two
cases: rice *cpt1* coleoptiles (Haga 2005), and UV-B phototropism of Arabidopsis stems through
UVR8 (Vanhaelewyn et al. 2019, *Plant Cell* 31:2070). [D, Abs]

**Green and mature stems.**
- Inflorescence stems and petioles bend: phot1 at low fluence, phot2 at high; the double mutant
  does not bend. Only the lit abaxial side of the petiole is sensitive (Kagawa et al. 2009, *PCP*
  50:1774). [D, Abs]
- Under full sun, cryptochromes dominate (Serrano et al. 2021, *Plant Cell Environ* 44:3246).
  [D, Abs]
- In open light phyB suppresses phototropism in green seedlings; under shade it is strong (Goyal
  et al. 2016, *Curr Biol* 26:3280). [D, Abs]
- **"the phototropic response of stem is proportional to the auxin supply from the shoot apex"**,
  and decapitation gives "a small negative phototropism" (Sato et al. 2014, *J Plant Res* 127:627).
  [D, Abs]

## 2.3 Is the gravitropism parallel real? (Q8)

**Same protein, same cells, same machinery. Demonstrated, but only in separate experiments** [D]:
- Gravity sends PIN3 "to the bottom side of hypocotyl endodermal cells", through GNOM and PINOID
  (Rakusová et al. 2011, *Plant J* 67:817).
- A relocalisation like the gravity one happens under light, "albeit slower" (Grones et al. 2018,
  *Sci Rep* 8:10279).
- The kinase D6PK is needed for both tropisms (Willige 2013).

**The sensors are separate** [D]:
- Mutants without an endodermis (*sgr1*/*scr*, *sgr7*/*shr*) are agravitropic but phototropic
  (Fukaki et al. 1996, *Plant Physiol* 110:945).
- *pifQ* hypocotyls, whose amyloplasts have been converted, are agravitropic but phototropic
  (Kim et al. 2011, *PNAS* 108:1729).
- phot1 expressed in the epidermis alone, or the cortex alone, is enough (Preuten 2013).

⚠ **Nobody has tested light and gravity acting on PIN3 at the same time.**

**Light turns gravitropism down** [D]:
- "phyAphot1 double mutants grew exclusively according to gravity" (Lariguet & Fankhauser 2004,
  *Plant J* 40:826).
- Phytochromes convert the gravity-sensing amyloplasts (Kim 2011).
- A second route runs through LAZY4 (Yang et al. 2020, *PNAS* 117:18840).
- Gravity also attenuates phototropism (Kiss et al. 2012, *Planta* 236:635, on the space station).

**How bending stops.**
- The auxin-native route: PIN3 later polarises to the opposite side, "depleting this auxin maximum
  to end the bending", and interfering with it causes overbending (Rakusová et al. 2016, *Curr
  Biol* 26:3026). [D, Abs] This is shown for gravity only.
- In pea, autostraightening "is not regulated through auxin distribution" (Haga & Iino 2006). [D]

## 2.4 Combining light and gravity (Q9)

**Galland P (2002)** "Tropisms of *Avena* coleoptiles: sine law for gravitropism, exponential law
for photogravitropic equilibrium", *Planta* 215:779–784 [D, Abs checked]:
- Setup: coleoptiles tilted at various angles, lit for 7 h from the side opposite their gravitropic
  bend.
- Result: "The fluence rate that was required to counteract the negative gravitropism increased
  exponentially with the sine of the inclination angle."
- So ln I_c is linear in sin γ: a **logarithmic light transducer** balances a sine-law gravity term.
  Grolig et al. 2000 (*Plant Physiol* 123:765, *Phycomyces*) say so outright: "logarithmic
  transducer" for light, "linear" for gravity. [D, Abs]
- ⚠ Galland's fitted constants were not retrieved.

**Bastien, Douady & Moulia 2015**, "A unified model of shoot tropism in plants: photo-, gravi- and
propio-ception", *PLoS Comput Biol* 11(2):e1004037 [read in full]:

```
local perception (ARC):   ∂C/∂t = −ν·(A − A_P) − β·A − γ·C
apical perception (ARaC): ∂C/∂t = −ν·(A(L) − A_P) − β·A − γ·C
set point:  A_R = A_P·ν/(ν + β) = A_P/(1 + M),     M = β/ν = B/D
light term from Lambert's cosine law:  I(s) = −I₀·sin(A − A_P), then linearised
```

- ⚠ Table 1 of the paper prints M = ν/β. That contradicts its own eqs 16–17 and 26, which agree
  with each other; use M = β/ν.
- Fit to Galland's data: "M ∼ I^−b with values of b between 0.36 and 0.44", R² ≈ 0.91, valid for
  A₀ < 90°. A power law fit better than a logarithm on one protocol; both fitted the other. [D]
- In wheat under side light, the apex settled between vertical and the light. "At first, the whole
  organ curves; then the curvature concentrates near the base." [D]
- The authors add that "the AC model has not been tested for non-orthogravitropic organs". [D]

**The exact equilibrium without the small-angle approximation** [OURS; algebra checked]:
- β·sin A = ν·sin(A_P − A) gives tan A = ν·sin A_P / (β + ν·cos A_P).
- That is exactly the direction of **β·û + ν·l̂**, where û is up and l̂ points to the lamp.
- **The draft's `normalize(want + k·toward_light)` is this equilibrium with k = 1/M.**

⚠ **The sine law for light has never been measured.** Every model assumes it, from Lambert's law or
by projection; Galland held the light perpendicular to the organ. Dümmer et al. 2021 (*J Plant
Physiol* 260:153396) report a tangent law in Arabidopsis; this is not reconciled.

**Measured equilibria vary a lot.**
- Rice coleoptiles reach at most **25°**, and the equilibrium is bell-shaped against log fluence
  (Neumann & Iino 1997, *Planta* 201:288). [D, Abs]
- Arabidopsis goes nearly horizontal because phyA suppresses gravitropism. [D]
- So M spans roughly 0.1–2 across systems [OURS]: it is a real parameter.

## 2.5 Where the bend is laid down: the AC model, and tip steering (Q10)

**Bastien, Bohr, Moulia & Douady 2013**, *PNAS* 110:755–760 [read in full]:

- **The sine law alone fails.** ∂C/∂t = −β·sin A "cannot reach a vertical steady state …
  Oscillations therefore go on indefinitely", so the sine-law model is rejected. [D]
- **The AC model:** ∂C/∂t = −β·sin A − γ·C, applied only in the growth zone
  (L − L_gz < s < L), and zero elsewhere. C = ∂A/∂s is curvature, β the gravisensitivity, γ the
  proprioceptive sensitivity. [D]
- **Its steady state:** the angle decays exponentially over a convergence length L_c = γ/β.
  - **B = L_gz/L_c = β·L_gz/γ.** B is also the ratio of convergence time to the time the apex first
    takes to reach vertical.
  - **Measured B is 0.9–9.3** across 12 organ types from 11 angiosperms, from wheat coleoptile to
    poplar trunk.
  - The oscillation "mode" steps up at **B = 2.8** (one overshoot, a C shape) and **B = 3.9** (an S
    shape).
  - Two-thirds of plants matched the prediction; a third oscillated less than predicted. [D]
- **How it moves:**
  - the whole organ curves up;
  - the apex straightens first;
  - the straightening moves down "without any need for a systemic basipetal propagative signal";
  - curvature ends up at the base of the growth zone;
  - convergence takes "several hours to several months". [D]

**With growth included** (Bastien, Douady & Moulia 2014, *Front Plant Sci* 5:136, FT):
- The sensitivities become dimensionless: β̃ = β·R/Ė and γ̃ = γ/Ė, with Ė the relative elongation
  rate.
- β̃ ≈ 1, because differential growth saturates at about the mean elongation. [I]
- Posture control needs γ̃ > 1.
- The simpler AC model holds when L_gz/R > 6.2·B.
- Convergence time T_c = 1/(Ė·γ̃).
- "The timing of the tropic movement is still fixed primarily by the mean relative rate of
  elongation growth." [D, model]

**The measured sensitivity, in growth units** (Chauvet, Pouliquen, Forterre, Legué & Moulia 2016,
*Sci Rep* 6:35431, FT):
- β̃ = R·(dθ_tip/dt) / (sin θ · dL/dt).
- dθ_tip/dt was **proportional to dL/dt across 17–32 °C**. [D]
- The response follows a sine law from 0° to 180° and is **independent of g** from 0.1 to 3 g. [D]
- Species differ. ⚠ Their values are in the supplement, which was not retrieved.
- In wheat (Chauvet et al. 2019, *J Exp Bot* 70:1955):
  - β̃ = 0.8 (fitted);
  - τ_growth = 1/ε̇ = **1200 min**;
  - R = 0.8 mm;
  - statolith avalanche ≈ 1–2 min;
  - **reaction delay ≈ 13–15 min**;
  - **memory ≈ 13–15 min**. [D]
- [OURS] Cross-check: Arabidopsis inflorescences turn 90° in 90 min (Fukaki et al. 1996, *Plant
  Physiol* 110:933). With dL/dt ≈ 1 mm/h and R ≈ 0.5–0.75 mm, that gives β̃ ≈ 0.5–1.1, which is
  consistent.

**What tip steering cannot do** [OURS, from the numbers above]:
1. **Timing or shape, not both.**
   - With the measured β̃, the apex turns 90° after only (π/2)·R/β̃ ≈ 2R of new growth.
   - Tip steering that uses ω = β̃·(v/R)·sin θ matches that apical timing. But it puts the whole bend
     into that ~2R of stem: in engine units about 0.1 unit, a kink.
   - The shipped `tropism: 0.02` gives an e-folding arc of ≈0.26 units as laid (0.0052/0.02),
     stretched to ≈1.2 by the subapical zone. That is plausible, but it comes from a rate with no
     link to growth.
   - Real plants spread the bend over L_gz (≈2.6 units here) and then concentrate it into L_c ≈
     L_gz/B.
2. A first-order lerp **cannot overshoot**; the AC model does once B > 2.8.
3. Tip steering **cannot straighten from the apex downwards.**
4. **A non-growing axis must not turn**, since dθ/dt ∝ dL/dt. The shipped lerp still turns an axis
   that has almost stopped elongating.

⚠ **Proprioception is a phenomenon without an auxin mechanism.** It is demonstrated by the kinematics
(Bastien 2013). Its mechanism is **not** redistribution of auxin (Haga & Iino 2006). It needs
actin–myosin XI in fibre cells: myosin *xif xik* and *act8* mutants overbend (Okamoto et al. 2015,
*Nat Plants* 1:15031). [D phenotype; I mechanism] **For this engine γ would be a term that is not
auxin**, booked as such.

**How long the bending zone is:**
- Arabidopsis inflorescence: growth confined to the top ~4 cm (Phyo 2017) ⚠.
- Etiolated hypocotyl: the top ≈1.1 mm responds to light (Yamamoto 2014).
- Coleoptile: early on, the whole organ is the growth zone (L_gz = L).
- In the engine, the zone is `internodeSpan` = 2.6 units (e-folding); with R ≈ 0.05, L_gz/R ≈ 50.
  That satisfies Bastien 2014's condition for any B < 8. [OURS]

## 2.6 A continuous lamp: fluence and timing (Q11)

- **Pulses are not the lamp's case.** First positive curvature follows reciprocity and responds to
  pulses (Steinitz & Poff 1986, *Planta* 168:305). [D, Abs]
- **Continuous light gives time-dependent ("second positive") curvature.**
  - Time threshold ≈10 min in Arabidopsis (Janoudi & Poff 1990, *Plant Physiol* 94:1605, Abs), and
    ≈20 min in oat and maize (Zimmerman & Briggs 1963, via Briggs 2014 ⚠).
  - Curvature is "a linear function of the duration" of irradiation (Steinitz & Poff 1986).
  - Light-grown dicots show *only* this response (Everett 1974 *Plant Physiol* 54:222; Ellis 1987
    *Plant Physiol* 85:689). [D, Abs]
- **Lag before bending** [D]:
  - Arabidopsis, 0.01–0.1 µmol m⁻² s⁻¹: about 45 min.
  - Arabidopsis, 1.0 µmol m⁻² s⁻¹: about 75 min; longer again at 10–100 (Whippo & Hangarter 2003,
    *Plant Physiol* 132:1499, FT via strand).
  - Arabidopsis, 0.17 µmol m⁻² s⁻¹: about 70 min (Haga et al. 2015, *Plant Cell* 27:1098).
  - Adaptation sets in after 10–30 min, through RPT2 (Haga 2015).
- **Memory.**
  - Arabidopsis hypocotyl: T_c 80–100 min and memory ≈200 min (Meroz, Bastien & Mahadevan 2019,
    *J R Soc Interface* 16:20190038; Abs checked, numbers via strand).
  - Wheat, gravity: stimuli *add* when under ~60 min apart, *subtract* at ~90 min, and are forgotten
    beyond ~2.2 h (Rivière & Meroz 2023, *PNAS* 120:e2306655120; Abs checked, numbers via strand).
  - Maize: when a second light arrives more than 90 min after the first, the coleoptile stays with
    the first direction (Nick & Schäfer 1988, *Planta* 175:380). [D, Abs; ⚠ coleoptile]
- **Fluence enters compressively**: a power of ≈0.4 (Bastien 2015) or a logarithm (Galland). There
  is an optimum and a decline at high fluence: rice's bell shape; high blue at 100 µmol m⁻² s⁻¹
  attenuates Arabidopsis bending (Whippo & Hangarter 2003). [D]
- **In growth units** [OURS]: wheat reaction delay / τ_growth ≈ 13–15 / 1200 ≈ **0.011–0.013**.
  - The engine's growth zone has Ė ≈ 0.0045 per step, so τ_growth ≈ 220 steps, the reaction delay
    ≈ **2–3 steps**, and a 90° turn ≈ 4–6 steps.
  - A real Arabidopsis 90° in 90 min is ≈0.1–0.2% of its life. That is also ≈3–5 steps of a
    2,500-step life.
  - At true relative speed, the lamp is followed faster than a frame.

## 2.7 Leaves, petioles, sunflowers (Q12)

**Citation correction.** "Inoue 2008 PNAS 105:5626" is the phot1 autophosphorylation paper. **The
leaf-positioning paper is Inoue S, Kinoshita T, Takemiya A, Doi M, Shimazaki K (2008) *Mol Plant*
1:15–26** (both checked).

**Leaf positioning** [D, Abs checked]:
- New petioles grew "obliquely upward" toward weak blue light from above (0.1 µmol m⁻² s⁻¹); in red
  light they were horizontal.
- It needs phot1 and NPH3; phot2 takes over at 5 µmol m⁻² s⁻¹.
- When the light was moved, "the leaf surface changed its orientation to the new blue light source
  within a few hours, whereas the petioles initially were unchanged but then gradually rotated."
- **So it is the growth of young petioles, over hours to days.**

**Where it is perceived:**
- Petiole bending: the lit abaxial side of the petiole (Kagawa 2009).
- Blade flattening: the blade, "reversibly, late in development" (Legris et al. 2021, *Plant
  Physiol* 187:1235, FT via strand).

**Sunflower** (Atamian HS, Creux NM, **Brown RI**, Garner AG, Blackman BK, Harmer SL 2016, *Science*
353:587–590; Crossref confirms the author line, and the brief's "Brown EA" is wrong):
- Tracking is driven by elongation alternating between the east and west flanks.
- Mature plants stop, facing east. [D, Abs]
- It is gated by the circadian clock, and "distinct from phototropin-mediated phototropism" (Brooks,
  Atamian & Harmer 2023, *PLoS Biol* 21:e3002344, FT via strand).
- **A clockless engine should not claim heliotropism.** One thing does transfer: only elongating
  shoots track (Kutschera & Briggs 2016, *Ann Bot* 117:1).

**Pulvini** move by turgor, not growth, so they are out of scope.

**Circumnutation** needs the gravity-sensing endodermis (Kitazawa et al. 2005, *PNAS*
102:18742–18747). [D, Abs] [I] So the engine's stated `nutation` might in time come out of a delayed
gravitropic loop.

---

# Part 3 — Tilting the pot (Q13)

- **Arabidopsis inflorescence** (Fukaki 1996, Abs checked):
  - turns ~90° "within 90 min in darkness at 23 °C";
  - lag "about 30 min";
  - 3 min of stimulation is enough;
  - it senses gravity throughout the elongation zone, and decapitated segments still respond. [D]
- **Wheat coleoptile** (Chauvet 2016):
  - a transient of ~20 min, then the tip angle changes linearly;
  - at 50° it reaches vertical "after several oscillations". [D]
  - ⚠ Bastien 2013 shows wheat *not* overshooting (a different cultivar); Arabidopsis
    inflorescences overshoot into C shapes.
- **Straightening:** the tip goes first, curvature collects at the base, and overshoot depends on
  B (§2.5). [D]
- **PIN3 in the hypocotyl:** enriched on the lower side from 2 h; symmetry restored by ~18 h
  (Rakusová et al. 2019, *Plant J* 98:1048). [D, via strand]
- **In the engine** [OURS]: the stem laid down before the tilt should stay tilted, since mature
  tissue does not curve and that part is correct. The growth zone should bend, and the whole
  reorientation takes ≈4–6 steps at true relative speed.

---

# Part 4 — The minimal honest model

## 4.1 Shears

**Build, Level 0 (the draft plus one state):**

1. **The stream.** S(s, t) sums every source whose path to the root passes s: the axis's own apex,
   branches attached above s, and paste. Each source has a depletion front and an arrival front at
   v_PAT.
   - **v_PAT = 6.6 × G**, where G = total dL/dt of the leader (tip plus subapical) ≈ 0.024
     units/step. That gives ≈0.16 units/step, with a range of 0.10–0.38 (Kramer 2011). **A lookup,
     not a dial.**
   - The draft's 0.12 (v/G ≈ 5.0) is inside the range.

2. **Release is not commitment.**
   - A bud with S < threshold is *free*. It *commits* (becomes an apex, a source and an axis) only
     after staying free for τ_commit.
   - If S rises again before then, because a sibling committed and its stream has arrived or because
     paste was applied, the bud **goes back to dormancy and can be re-armed.**
   - Committed shoots are immune (Chatfield 2000).
   - [OURS, from Prusinkiewicz's condition] This yields "several released, then one wins" out of two
     measured quantities.
     - The number released ≈ (buds within v_PAT·τ_commit of the cut and within reach).
     - The winner is the first to commit.
     - Losers re-arrest, as in Balla 2016 and Thimann & Skoog 1934.
   - The draft's `bornAt = t − 1` is the limit τ_commit = 0, which always gives exactly one winner.

3. **What is flagged.**
   - The first flush, which is sugar-driven, is **not computable here**: nothing should visibly swell
     within "hours" of a cut and be attributed to auxin.
   - In young legume seedlings the lowest buds grow first ⚠.
   - The draft's stream cannot let a lower branch inhibit an upper one (Ongaro 2008).

**Irreducible at Level 0:**
- **τ_commit ≈ 24–72 h in pea.**
  - Auxin's effect begins at ~24 h (Morris 2005); dominance is evident by day 3 (Balla 2016); GA-led
    sustained growth follows from day 3 (Cao 2023).
  - A pea elongation rate was not retrieved, so express it against the front instead [OURS ⚠]: in a
    20–40 cm pea, v_PAT·τ_commit ≈ 24–72 cm, i.e. **τ_commit ≈ 1–2× the time the front takes to
    cross the stem.**
- **λ and `branching` stay dials**, and SCIENCE.md should say they are not lookups (§1.7).

**Level 1 (the principled option).** Run the canalisation switch (§1.4) on the metamer chain with
`stepAuxin`. Then τ_commit, the number released, the winner, hysteresis and competition in both
directions all **emerge**. The constants become the dimensionless switch set.
- [I] `38_shoot.js` was falsified for leaf-abscission *order*, not for bud *activation*. Bud
  activation is the one job the literature says such a network does well.

## 4.2 The lamp

**Level 0 (keep tip steering):**

- **Direction:** want = normalize(û_g + k·l̂), where û_g is the existing set-point direction. This is
  the exact equilibrium of additive sine laws [D model; OURS algebra], so the draft's form stands.
- **Gain:** k = 1/M = k_ref·(I/I_ref)^b, with **b ≈ 0.4** (0.36–0.44; Bastien 2015 on Galland's
  data).
  - With I ∝ P/d², k ∝ P^0.4·d^−0.8.
  - This replaces `photoHalf`, a saturating dial with no source, with a lookup exponent.
  - Optionally add a decline at high fluence ⚠.
- **Rate:** turn at **ω = β̃·(G/R)·sin(angle to want)**, with **β̃ ≈ 0.6–0.8** (wheat; Chauvet
  2016/2019). This replaces `tropism`, and it means **a non-growing axis does not turn.**
  - ⚠ At engine proportions it produces a kink, not an arc (§2.5).
- **Delay:** pass the light direction through a first-order filter of τ ≈ 0.011–0.013 τ_growth
  (wheat, gravity). For light the measured lags are 45–75 min in Arabidopsis; ⚠ these are not
  converted to growth units.
- **Where it is read:** along the growth zone for dicot-like axes (Preuten 2013; Kagawa 2009), at
  the tip for coleoptiles.
- **Supply:** scale k by the axis's own apical stream, so a stump barely bends (Sato 2014) [OURS
  mapping].
- **Light lowers β** [D direction; ⚠ magnitude].

**Level 1 (the bend where it really happens).** Apply the ARC model in the growth zone:

```
∂C/∂t = (Ė/R)·[ −β̃·sin A − (β̃/M)·sin(A − A_P) ] − γ̃·Ė·C,      γ̃ = β̃·L_gz/(B·R)
```

- Every quantity already exists in the engine: Ė(s) = `internode·vigour·exp(−d/internodeSpan)`,
  L_gz, R from `updateRadii`, and A(s) from the stem polyline.
- Organs ride along, because they are placed by arc length. [I, code]
- Choose **B < 2.8** for no overshoot, or **2.8–3.9** for the single C-shaped overshoot of an
  Arabidopsis inflorescence.

**Irreducible:**
- **M_ref**, the photo-to-gravi ratio at a reference lamp. It is genuinely a parameter: it depends
  on light history through phyA, phyB and cryptochromes, which the engine cannot compute. Systems
  span M ≈ 0.1–2.
- b ≈ 0.4 (lookup).
- β̃ (lookup).
- B (lookup, Level 1).
- Proprioception is **not auxin** (Level 1).

**Extrapolations to flag:**
- the sine law for light;
- additivity (Nick & Schäfer 1988 found stimuli are *not* additive when they point the same way at
  high fluence);
- any light term on the statocyte PIN ring [OURS];
- AC with a set point other than vertical is untested (Bastien 2015).

**On time compression** [OURS]: true-relative tropic dynamics finish in a few steps. If the page
wants the viewer to *watch* a bend, it has to slow development while the lamp moves. The honest
default is that the stem is a record of where the lamp was while it grew.

## 4.3 Paste

**Build:** a source at the top of the stump that feeds the stream (the draft's `paste`). Its dose is
in **apex-equivalents** of the tip it replaces.
- 1 apex-equivalent is the physiological dose. [I] Thimann & Skoog needed ~10× through agar, which
  they attribute to losses in application; at ~1× they saw partial inhibition. [D]
- It has to be continuous: a 12-h cycle fails within 4 days. [D]
- Removing it frees the buds at once (Thimann & Skoog 1934) [D]. Visible outgrowth then follows
  τ_commit later [OURS].
- Paste applied late does not stop committed shoots (Chatfield 2000), and auxin on already-growing
  shoots does not restore apical control (Cline MG, Sadeski K 2002, *Am J Bot* 89:1764–1771). The
  author line, left open in research_7_30_26, is now confirmed via Crossref. [D]
- Paste acts from the stem, never inside the bud. [D]

**Flag:** in pea, paste on the stump does not stop the first hours of growth; it re-imposes
dormancy from about 24 h (Morris 2005; Hall & Hillman 1975). The engine shows only that
auxin-dependent half.

**Irreducible:** nothing beyond the shears' constants.

---

# Part 5 — What is genuinely a parameter

| Constant | Status | Value | Why |
|---|---|---|---|
| v_PAT/G | **lookup** | 6.6 (4–16) | Kramer 2011 |
| τ_commit | lookup at Level 0; emergent at Level 1 | 24–72 h (pea) ≈ 1–2× front transit | Morris 2005; Balla 2016; Cao 2023 |
| λ, `branching` | **dial** | — | no measured law; Snow 1931 has the opposite sign near the apex |
| β̃ | lookup | 0.6–0.8 (wheat) | Chauvet 2016/2019; species differ ⚠ |
| B | lookup | 2–5 typical (0.9–9.3) | Bastien 2013/2014 |
| b | lookup | 0.36–0.44 | Bastien 2015 on Galland 2002 |
| reaction delay | lookup | ≈0.011–0.013 τ_growth | Chauvet 2019 |
| M_ref | **genuine parameter** | ~0.1–2 across systems | gated by phytochrome and cryptochrome history the engine does not compute (Goyal 2016; Lariguet 2004; Serrano 2021) |
| proprioception | **not auxin**; a stated term | — | Haga & Iino 2006; Okamoto 2015 |
| paste dose | ≈1 apex-equivalent | — | Thimann & Skoog 1933/34 [I] |

---

# Part 6 — What I could not retrieve or verify

- **Constants and figures:**
  - Galland 2002's fitted constants.
  - Chauvet 2016's per-species β̃ (supplement).
  - The Prusinkiewicz 2009 supplement.
  - The Ding 2011 and Rakusová 2016 full texts.
- **Scanned primaries behind Cloudflare, read only as abstracts or through reviews:**
  - Zimmerman & Briggs 1963;
  - Janoudi & Poff 1990 and 1991;
  - Chatfield 2000, so the basal-auxin result is unverified;
  - Ongaro 2008;
  - Balla 2011;
  - Li & Bangerth 1999, whose abstract is garbled in Crossref.
- **Rates:** pea, oat and bean stem elongation, so there is no v/G for pea; and a hypocotyl growth
  rate to convert phototropic lags into growth units.
- **History:**
  - Boysen-Jensen's 1913 mica experiment;
  - Rothert's date;
  - Paál 1919's pages;
  - Went's thesis date (1928 volume, published November 1927?);
  - the exact publication day of Darwin 1880.
- **Snow:** his later papers (1932, 1937), which might say whether the increase with distance
  saturates.
- **Missing experiments:**
  - any primary study of conifer leader replacement;
  - any light-and-gravity experiment on PIN3 at the same time;
  - any measurement of the phototropic sine law.
- **Resolved this session:**
  - Cline & Sadeski 2002's author line;
  - the Inoue 2008 citation;
  - Atamian 2016's author line;
  - the date Went's 1926 paper was communicated.
