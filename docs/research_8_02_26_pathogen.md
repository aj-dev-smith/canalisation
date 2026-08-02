# An injectable auxin-deforming agent: what the literature actually supports

Answer to the research brief of 2026-08-02. Four parallel literature sweeps plus a
primary-source pass on the two priority questions (Q3 and Q4).

**How to read this.** Same flags as [research_7_30_26.md](research_7_30_26.md):

- **[D]** demonstrated — the cited paper shows this directly, with a genetic, biochemical or
  imaging intervention
- **[I]** inferred — the authors assert it, or it follows from cited facts, but was not shown
- **[OURS]** our construction. Not in any paper. Test it before trusting it.
- **⚠** contested, or a place where we could not read the primary source

Every "we could not retrieve this" is written down in Part 6 rather than smoothed over. Several
of the most useful claims below are flagged unverified and they are still the useful ones —
that is what the flags are for.

---

## Executive summary — the nine findings that change what you build

1. **Q3 is YES, and it is the strongest result in the brief — but at the vascular layer, not
   the tumour-outline layer.** A gall's *own vascular network* is continuous with the host's
   pre-existing bundles, initiates within days, and its two morphologies are exactly the two
   solutions a canalisation solver gives for a source with a drain and a source without one.
   Aloni's own reading, in print: the patterns "reflect the apparent synthesis sites,
   concentration gradients and flow pathways of the plant hormones." The *lump* is not
   canalised; the *plumbing inside the lump* is. §3.

2. **Q4 is YES, and there is exactly one clean case: cyst nematodes relocate PIN3 from the
   basal to the lateral membrane.** Grunewald et al. 2009 — expression *and* polarity, in
   infected tissue, with `pin3`/`pin4` mutants giving small, arrested feeding sites. It is the
   only documented pathogen-driven PIN repolarisation we found. §4.1.

3. **The second-best polarity route is a bacterial effector that degrades the trafficking
   machine, and it is a two-paper bridge nobody has closed.** *Pseudomonas syringae* HopM1
   destroys AtMIN7 [D]; AtMIN7 = BEN1 = BIG5 is required for polar PIN localisation and for
   dynamic repolarisation [D]. **Nobody has looked at PIN in HopM1-infected tissue.** That is
   an [I] bridge across two [D] results and it is the single most interesting untried
   experiment in this sweep. §4.2.

4. **Level and placement have already been run as an A/B by nature, and they give different
   body plans.** *Agrobacterium* installs a local auxin **source** and changes transport not at
   all → an undifferentiated blob. *Rhodococcus fascians* changes **where auxin maxima form**,
   repeatedly → organised, iterated shoots. Same disease category, opposite morphology, and the
   difference is exactly your `rho`-vs-`P` axis. §1.1 vs §1.2.

5. **`rho` alone is a weaker knob than it looks, because the host clamps it.** In iaaM plants
   the *precursor* moves 945-2014x while **free IAA moves 2.5x** — the difference is all
   conjugation and oxidation (GH3, DAO). If you model the agent as a pure `rho` bump with no
   `mu` response, you will over-predict the deformation by two to three orders of magnitude.
   The engine has `mu`; use it. §1.1.

6. **Phyllody is NOT an auxin phenomenon and you must not route it through auxin.** SAP54 /
   phyllogen degrades ABCE-class MADS-box proteins via RAD23. Auxin is not mentioned, not
   measured and not implicated in any of the four primary papers. In our engine phyllody is a
   perturbation of `q`, the floral-organ identity parameter — one line, no auxin. §1.3.

7. **Witches' broom IS expressible in transport terms, via a node the engine already has.**
   Four independent effectors (SAP11, SWP1, SJP1/2, and TENGU by a different route) converge on
   BRC1/TB1 — and in jujube, BRC1 directly represses `ZjPIN1c`/`ZjPIN3`, so de-repressing it
   raises PIN and releases the bud [D]. Combined with Prusinkiewicz's auxin-transport-switch
   model of bud activation, this is a **pure `P`/`comp` perturbation of the bud's ability to
   canalise into the stem** — no cytokinin, no strigolactone, no second hormone required. §1.3, §4.4.

8. **No agent moves in the polar auxin transport stream. Not one.** Phytoplasmas are sieve-element
   only; wilt fungi are xylem-lumen only; viruses go plasmodesmata then phloem, source→sink; galls
   are local. Advecting your infection front along `J` is **not** literature-supported as
   transport. **But two couplings are real and one is very good**: auxin closes plasmodesmata via
   callose [D], so a diffusive front through a high-auxin region is genuinely slowed by the auxin
   it created; and viral systemic pattern tracks the assimilate source→sink field, which the
   engine does not have but whose *topology* the vein network approximates. §2.

9. **Vertical transmission is weak, and the one spectacular case is spectacular AND silent.**
   *iaaM* and *iaaH* are fixed in the genome of **every cultivated sweet potato** and are
   transcribed [D] — but **no naturally acquired T-DNA gene has been shown to change the shape of
   the plant carrying it.** Phytoplasma seed transmission is contested and every published "rate"
   is a PCR-positivity rate; *Agrobacterium* was found in **0 of 2,650** seeds. Heritable
   pathogen-induced *morphology* has no documented case, and its nearest literature has a
   published failure to replicate. §5.

---

## Part 0 — The mapping table

This is the table the brief asked for: minimal perturbation → our state variable. Everything in
it is defended in Part 1. **`b` is the flux-response exponent; `w` is wall conductance; `P` is
per-wall PIN allocation; `comp` is PIN competence.**

| Agent | Minimal mechanism | Our variable | Evidence |
|---|---|---|---|
| *A. tumefaciens* iaaM/iaaH | two-enzyme Trp→IAM→IAA bypass of the host route | **`rho` ↑, cell-autonomous, in transformed cells only** | [D] enzyme assay |
| *A. tumefaciens* ipt | cytokinin synthesis; sets gall vs shooty vs rooty | **none — needs a second signal** | [D] T-DNA mutants |
| *A. tumefaciens* gene 5 | Trp→indole-3-lactate, an auxin antagonist, autoregulated | **`rho` ↓ feedback, or an inhibitory `comp` term** | [D] 28x conversion; ⚠ ILA's anti-auxin status disputed |
| *A. tumefaciens* gene 6b | reduces basipetal PAT 50-80% at near-unchanged auxin level | **`w` or `P` ↓ — the cleanest transport-only oncogene** | [D] transgenic tobacco |
| host response to all of the above | GH3 conjugation + DAO oxidation buffer the excess | **`mu` ↑, saturating and auxin-dependent** | [D] LC-MS/MS |
| *P. savastanoi* iaaL | IAA→IAA-lysine, an inactivating conjugation | **`mu` ↑, agent-encoded** | [D] cloned enzyme |
| *R. fascians* fas | methylated cytokinin mix; host IPyA auxin is *accessory* | **`comp` ↑ (new competent domains) + `rho` ↑ downstream** | [D] `ahk3/ahk4`, `taa1 tar2` |
| Phytoplasma SAP54 | degrades ABCE MADS via RAD23 | **`q` — floral organ identity. NOT auxin** | [D] `rad23` requirement |
| Phytoplasma SAP11/SWP1/SJP1-2 | destabilise class II TCPs incl. BRC1/TB1 | **bud `comp`/`P` — the canalisation switch at the bud** | [D] BRC1→PIN in jujube |
| Phytoplasma SAP05 | RPN10 hijack, degrades SPL+GATA, ubiquitin-independent | **none — phase/juvenility, needs an age signal** | [D] structures |
| Phytoplasma TENGU | 38aa peptide, escapes the phloem; lowers IAA and ARF6/8 | **flux-response `b` ↓ (signalling gain), not transport** | [C] 2009 → [D] 2014 titre |
| Cyst nematode (syncytium) | PIN1↓, PIN3/PIN4 ↑ **and relocated basal→lateral** | **`P` — per-wall reallocation. THE polarity case** | [D] §4.1 |
| Root-knot nematode (gall) | AUX1/LAX3 import at the basipetal face + PIN3 | **`w` on influx + `P`** | [D] `aux1`, `lax3` mutants |
| Cyst nematode Hs19C07 | effector binds the LAX3 influx carrier directly | **`w` ↑ on specific walls, agent-encoded** | [D] interaction; [I] flux consequence |
| *Pantoea agglomerans* | requires host basipetal PAT; PIN2 up 35x | **`comp`/`P` on host tissue** | [D] NPA/TIBA rings |
| *A. rhizogenes* rolB | tyrosine phosphatase; raises auxin *sensitivity* | **`b` — the flux-response exponent itself** | [D] phenotype; [I] mechanism |
| NPA / TIBA (synthetic) | locks PIN inward-facing; global, non-directional | **`w` ↓ uniformly. NOT a polarity tool** | [D] structures |
| Strigolactone (absent from engine) | blocks auxin's feedback on PIN polarity, non-transcriptionally | **`b` ↓ — the canalisation gain** | [D] §4.5 |

---

# Part 1 — Q1: mechanism, at our level of representation

## 1.1 *Agrobacterium tumefaciens* — a `rho` source, and the host clamp you must model with it

**iaaM** (= *tms1*, gene 1) is tryptophan 2-monooxygenase (EC 1.13.12.3): L-Trp → indole-3-acetamide
+ CO₂. **iaaH** (= *tms2*) is indole-3-acetamide hydrolase: IAM → IAA + NH₃. **[D]**, by cell-free
enzyme assay:

- Schröder G, Waffenschmidt S, Weiler EW, Schröder J (1984). The T-region of Ti plasmids codes for
  an enzyme synthesizing indole-3-acetic acid. *Eur J Biochem* 138:387-391. doi:10.1111/j.1432-1033.1984.tb07927.x
- Thomashow MF, Hugly S, Buchholz WG, Thomashow LS (1986). Molecular basis for the auxin-independent
  phenotype of crown gall tumor tissues. *Science* 231:616-618. doi:10.1126/science.3511528. PMID 3511528

**ipt** (= *tmr*, gene 4) is DMAPP:AMP dimethylallyltransferase, the committed step of cytokinin
biosynthesis. **[D]** Akiyoshi DE, Klee H, Amasino RM, Nester EW, Gordon MP (1984). *PNAS*
81:5994-5998. doi:10.1073/pnas.81.19.5994. A later result complicates "ipt just adds cytokinin":
the bacterial IPT draws on a *plastidic* substrate pool and reroutes host biosynthesis rather than
adding to it — Sakakibara H et al. (2005), *PNAS*, PMID 15998742. **[D]**

**Two properties of this mechanism matter for us and both are unusual:**

- **It is cell-autonomous and heritable in the cell lineage.** The T-DNA integrates. Transformed
  cells make auxin whether or not the bacterium is still there. That is a `rho` field painted onto
  a set of cells and then left alone — not a diffusing agent. It is the *easiest possible* thing
  for our solver to represent and the *least* interesting, because the perturbation carries no
  spatial information of its own.
- **It bypasses the host's IPyA (TAA1/YUC) route entirely**, which is why gall tissue grows
  hormone-independently in culture. In our terms: it is a `rho` term that does not read `a`.

### The host clamps it hard, and this is the finding to build on

**[D] Mashiguchi K, Hisano H, Takeda-Kamiya N, Takebayashi Y, Ariizumi T, Gao Y, Ezura H, Sato K,
Zhao Y, Hayashi K, Kasahara H (2019). *Agrobacterium tumefaciens* enhances biosynthesis of two
distinct auxins in the formation of crown galls. *Plant Cell Physiol* 60(1):29-37.
doi:10.1093/pcp/pcy182. PMC6343636.**

LC-MS/MS across the whole IAA and PAA metabolite network. In transgenic *Arabidopsis* expressing
iaaM alone (their Fig. 3C, fold vs control):

| metabolite | fold |
|---|---|
| IAM (precursor) | **945x** |
| **IAA (free)** | **2.5x** |
| IAA-Asp | 20x |
| IAA-Glu | 5x |
| oxIAA | 3.6x |
| PAM | 83x |
| PAA | 2.4x |
| PAA-Asp | **274x** |

In transgenic barley: IAM **2,014x**, PAA-Asp 3.2x, free PAA 1.9x. In actual tomato galls the paper
reports significance rather than fold-changes, and IAM, IAA, IAA-Asp, IAA-Glu and oxIAA are all
significantly elevated. ⚠ **Do not quote the table above as gall numbers — it is transgenic tissue.**

The authors' own conclusion: "GH3 and DAO enzymes actively metabolize overproduced auxins to
regulate cellular auxin levels." **[D]** for the metabolite levels; **[I]** for the attribution to
GH3/DAO specifically (metabolite-inferred, no enzyme assay or mutant).

Independently: total (free + conjugated) IAA in *Arabidopsis* crown galls is **17.3 ± 8.8 µM**
against **2.1 ± 1 µM** in healthy stem — about **10x** (Gohlke J, Deeken R (2014), *Front Plant Sci*
5:155, doi:10.3389/fpls.2014.00155, PMC4006022, attributing to Thomashow 1986). **[D]**

**The 10x-total against 2.5x-free is not a contradiction — the difference is the conjugate pool.**

> **[OURS] What this means for the build.** A pure `rho` injection with fixed `mu` is the wrong
> model and will be visibly wrong. The literature says the correct minimal model is `rho ↑` **plus
> an auxin-dependent, saturating `mu`** — which is what GH3/DAO are. Our engine already has a
> constant `mu`; making it `mu(a)` with a Hill-ish saturation is a one-term change and is the
> difference between a 2.5x and a 945x deformation. Cheap, defensible, and it removes a parameter
> rather than adding one, because the *clamp* is what sets the final auxin level, not the source.

### Two more oncogenes, and one of them is the transport case

**gene 5** — **[D]** Körber H et al. (1991). T-DNA gene 5 of *Agrobacterium* modulates auxin
response by autoregulated synthesis of a growth hormone antagonist in plants. *EMBO J* 10:3983-3991.
PMC453145. A 28-fold increase in Trp → indole-3-lactate; ILA competes with IAA for auxin-binding
proteins and inhibits the gene-5 promoter itself — an autoregulatory brake. Expression is
auxin-inducible and **confined to vascular phloem cells**, which is itself a flux-following
localisation. ⚠ ILA's status as a genuine anti-auxin is disputed ("Indole-3-lactic acid is a weak
auxin analogue but not an anti-auxin", *J Plant Growth Regul*, doi:10.1007/BF00204911).

**gene 6b** — the cleanest published case of *transport changed while level held constant*:

**[D] Kakiuchi Y, Gális I, Tamogami S, Wabiko H (2006). Reduction of polar auxin transport in
tobacco by the tumorigenic *Agrobacterium tumefaciens* AK-6b gene. *Planta* 223:237-247.
doi:10.1007/s00425-005-0080-4.** Dexamethasone-inducible AK-6b in tobacco: **basipetal auxin
transport reduced 50-80%, intracellular auxin content only slightly reduced.** Phenotype includes
**altered venation**. Follow-ups from the same group are directly about vein pattern
(doi:10.1007/s10265-006-0049-9) and about *ectopic localisation* — redistribution, not amount —
of auxin and cytokinin (doi:10.1007/s00425-013-1930-0). ⚠ We relayed the 50-80% figure from the
abstract via a sweep; we did not read the paper's figures.

### The auxin:cytokinin ratio, and its molecular re-derivation

**[D]** T-DNA mutants are the cleanest in-planta demonstration of Skoog-Miller ever done:
*ipt* mutants give **rooty** galls, *iaaM/iaaH* mutants give **shooty** galls, wild-type gives an
undifferentiated tumour; and mixed inoculation of an auxin-locus mutant with a cytokinin-locus
mutant restores full tumorigenicity. Ooms G, Hooykaas PJJ, Moolenaar G, Schilperoort RA (1981).
*Gene* 14:33-50. PMID 6266929.

The molecular re-derivation is a transcriptional feedback, not a "ratio": **[D]** Cheng Z-J et al.
(2013), *Plant Physiol*, PMID 23124326 — **ARF3 binds the *AtIPT5* promoter and represses it**, so
auxin signalling gates cytokinin *synthesis*. Also Su Y-H, Liu Y-B, Zhang X-S (2011), *Mol Plant*
4(4):616-625, doi:10.1093/mp/ssr007. And a modern quantitative revisit: "Quantitative regeneration:
Skoog and Miller revisited", *Quantitative Plant Biology* (2023), PMC10495819.

> **We have no cytokinin.** The ratio is the single place where "you need a second signal, and here
> is which one" is the honest answer. See Part 7.

## 1.2 *Rhodococcus fascians* — placement, not level

The virulence determinant is **cytokinin, and that is demonstrated on both sides of the interaction**:

- **[D]** Pertry I et al. (2009). Identification of *Rhodococcus fascians* cytokinins and their modus
  operandi to reshape the plant. *PNAS* 106(3):929-934. doi:10.1073/pnas.0811683106. PMC2630087.
  A synergistic mix of isopentenyladenine, *trans*-zeatin, *cis*-zeatin and their 2-methylthio
  derivatives. **Host cytokinin receptor mutants `ahk3` and `ahk4` are required for symptoms** —
  a host-side genetic requirement.
- **[D]** Pertry I et al. (2010). *MPMI* 23(9):1164-1174. doi:10.1094/MPMI-23-9-1164. FasD/FasE/FasF
  enzymology; the *fas* operon is on the linear virulence plasmid and the *ipt* mutant strain
  **D188-5 is non-pathogenic**.
- **[D]** Radhika V et al. (2015). Methylated cytokinins from the phytopathogen *Rhodococcus
  fascians* mimic plant hormone activity. *Plant Physiol* 169(2):1118-1126.
  doi:10.1104/pp.15.00787. **1-MeiP and 2-MeiP**, made by methyltransferases MT1/MT2 upstream of
  *fas*; receptor-recognised; methylation presumably evades host CKX degradation.

**Host auxin is *accessory*, and that word is load-bearing:**

**[D] Stes E, Prinsen E, Holsters M, Vereecke D (2012). Plant-derived auxin plays an accessory role
in symptom development upon *Rhodococcus fascians* infection. *Plant J* 70(3):513-527.
doi:10.1111/j.1365-313X.2011.04890.x. PMID 22181713.** Bacterial cytokinins specifically activate
the host's **IPyA** auxin biosynthesis route. The *taa1-1 tar2-1* double mutant shows **decreased
responsiveness**, while bacterial colonisation and virulence gene expression are unimpaired. The
paper's transport framing — increased auxin production and the accumulating cytokinins "modified
the polar auxin transport so that new auxin maxima were repetitively established" — is **[I]**,
inferred from response patterns with no PIN measurement.

⚠ A stronger directional claim circulates in secondary sources ("IPyA auxin *induced* PAT, whereas
the plasmid cytokinins *inhibited* PAT"). We could not locate it in a primary abstract. Do not
attribute it to Stes 2012.

Phenotype: **delayed senescence, loss of apical dominance, activation of dormant axillary
meristems, multiple inflorescences** — a stunted bushy plant made of *shoots*, not callus. Ectopic
KNOX activation appears but **late (17 dpi) and downstream**, not as the driver — **[D]** Depuydt S
et al. (2008), *Plant Physiol* 146(3):1267-1281, doi:10.1104/pp.107.113969, PMC2259056.

> **[OURS] The A/B nature already ran.** *Agrobacterium* = a local `rho` source with no transport
> change → a blob. *Rhodococcus* = repeated re-establishment of auxin maxima → iterated shoots.
> **Level gives you a lump; placement gives you a body plan.** That is the brief's own Q4 intuition,
> confirmed by two organisms rather than by argument.

## 1.3 Phytoplasmas — three symptoms, three completely different mechanisms

**This is the section where the obvious modelling choice is wrong.**

### SAP54 / phyllogen → phyllody. NOT auxin. [D-negative]

SAP54 binds MADS-domain transcription factors and bridges them to **RAD23** shuttle proteins for
26S-proteasome degradation. **Causal test:** *Arabidopsis rad23* mutants expressing SAP54 do **not**
convert flowers to leaf-like tissue.

- MacLean AM et al. (2011). *Plant Physiol* 157(2):831-841. doi:10.1104/pp.111.181586
- MacLean AM et al. (2014). Phytoplasma effector SAP54 hijacks plant reproduction by degrading
  MADS-box proteins... *PLoS Biol* 12(4):e1001835. doi:10.1371/journal.pbio.1001835. PMID 24714165
- Maejima K et al. (2014). Recognition of floral homeotic MADS domain transcription factors by a
  phytoplasmal effector, phyllogen, induces phyllody. *Plant J* 78(4):541-554.
  doi:10.1111/tpj.12495. PMID 24597566
- Orlovskis Z et al. (2025). *eLife* 13:RP98992. doi:10.7554/eLife.98992.3
- Iwabuchi N et al. (2022). *Plant Cell* 34(5):1709-1723 — argues phyllogen acts as a
  **ubiquitin-like mediator**, substituting for the ubiquitin tag. ⚠ abstract only.

Targets: **SEP3 (class E), AP1 (class A), CAL**; also SOC1, AGL6/AGL24. Maejima emphasises classes
**A and E**, which control organ identity *and floral meristem determinacy* — which is why the
phenotype includes indeterminacy (flower-within-flower) as well as homeosis. Orlovskis 2025 adds
that SVP is destabilised **indirectly**, because its obligate multimer partners are degraded —
the effect propagates through **complex stoichiometry**, not one-to-one binding.

**Auxin is not mentioned, not measured and not implicated in any of the four primary papers.**

> **[OURS] For us this is a `q` perturbation and nothing else.** We already have a floral-organ
> identity parameter that sweeps across a range. Phyllody is that parameter pinned to its
> vegetative end, plus loss of determinacy. **It costs no auxin machinery at all** — and it is
> arguably the single cheapest visible symptom we could ship, because the whorl machinery exists.
> It is also the one that most obviously reads as *disease* to a viewer.

### SAP11 / SWP1 / SJP1-2 → witches' broom, via BRC1. Auxin, but through a switch.

Class II TCP destabilisation. **[D]** Sugio A et al. (2011), *PNAS* 108(48):E1254-E1263,
doi:10.1073/pnas.1105664108; Sugio et al. (2014), *New Phytol*, doi:10.1111/nph.12721.
⚠ **Clade specificity is strain-dependent** — Pecher P et al. (2019), *PLoS Pathog* 15(9):e1008035,
PMC6802841: SAP11(AYWB) hits **both** CIN-TCPs and CYC/TB1-TCPs (BRC1/TCP18, BRC2/TCP12);
SAP11(MBSP) hits **only** CYC/TB1. Pecher upgrades the branching link from Sugio's explicitly
speculative **[C]** to **[D]**: both variants destabilise the CYC/TB1 branching suppressors and both
produce significantly more rosette-leaf branches.

Sugio 2011's own hormone axis is **jasmonate** (CIN-TCP → LOX2 → JA down → more leafhoppers), not
auxin. Chang SH et al. (2018), *J Exp Bot* 69(22):5389-5401, doi:10.1093/jxb/ery318 — axillary
meristem proliferation, delayed flowering, extended vegetative phase; auxin not mentioned.

**The one documented effector → PIN → flux → branching chain is in jujube:**

**[D] Zhou Y, Ma X, et al. (2021). Jujube witches' broom phytoplasma effectors SJP1 and SJP2 induce
lateral bud outgrowth by repressing the ZjBRC1-controlled auxin efflux channel. *Plant Cell
Environ* 44. doi:10.1111/pce.14141.** ZjBRC1 binds the promoters of the auxin efflux carriers
**ZjPIN1c and ZjPIN3** and down-regulates them; SJP1/2 repress ZjBRC1, de-repressing PIN, changing
efflux, releasing buds. Evidence: in vivo interaction, localisation, promoter binding, IAA
measurement. ⚠ **The SJP1/2 target set is unsettled** — later papers reassign to ZjTCP2
(*J Exp Bot* 75(10):3054) and ZjTCP7 (PMID 38623040), with both stabilisation and destabilisation
reported. Treat any single mechanism as provisional. No PMID retrieved for Zhou 2021.

Also **[D]** Wang J et al. (2018), *Mol Plant Pathol*, doi:10.1111/mpp.12733 — SWP1 destabilises
BRC1/TCP18 → witches' broom.

> **[OURS] and this is the most build-ready mechanism in the whole brief.** Prusinkiewicz P,
> Crawford S, Smith RS, Ljung K, Bennett T, Ongaro V, Leyser O (2009). Control of bud activation by
> an auxin transport switch. *PNAS* 106:17431. doi:10.1073/pnas.0906696106. In that model, a bud
> activates **when it can canalise its own auxin into the stem** — an inactive bud has non-polar
> PIN1, and activation is PIN1 upregulation plus polarisation into a file connecting bud to stem.
> Auxin already in the stem *lowers the stem's sink strength*, so the bud cannot establish the
> positive feedback and stays dormant.
>
> **That is a statement entirely in variables we have.** Witches' broom = an agent that lowers the
> canalisation threshold at buds (`comp` ↑ or `b` ↑ locally), or raises the stem's sink strength.
> **No cytokinin, no strigolactone, no BRC1 gene.** And it composes with our existing
> `exp(-d/dominance)` field rather than replacing it. If we build one symptom, build this one.

### TENGU → dwarfism + broom, and be careful how strong you make the auxin claim

**Hoshi A et al. (2009). A unique virulence factor for proliferation and dwarfism in plants
identified from a phytopathogenic bacterium. *PNAS* 106(15):6416-6421.
doi:10.1073/pnas.0813038106. PMID 19329488.**

Phenotype **[D]** — single transgene, witches' broom and dwarfism in *N. benthamiana* and
*Arabidopsis*. **The auxin claim in that paper is [C] and nothing more**: it rests *exclusively* on
microarray expression of auxin-responsive genes. No IAA measurement, no transport assay, no PIN
localisation, no DR5. The paper's own verb is "suggest". ⚠ **Anyone citing Hoshi 2009 for "TENGU
inhibits auxin transport" is over-reading it.**

Upgraded later: **[D]** Minato N et al. (2014). *Sci Rep* 4:7399. doi:10.1038/srep07399.
PMID 25492247 — measures endogenous hormone: TENGU reduces **JA and auxin levels in buds**, and
*ARF6*/*ARF8* transcripts fall in both transgenic and infected plants. **Still signalling, not
transport.** ⚠ Several reviews misattribute the ARF6/ARF8 result to Hoshi 2009; it is Minato 2014.

Processing **[D]**: Sugawara K et al. (2013), *Plant Physiol* 162(4):2005-2014, PMID 23784461 —
the N-terminal **11 aa** suffice; TENGU is processed to 19/21-residue peptides; a
processing-compromised mutant has reduced symptom activity.

**The fact that matters most for us is not the auxin claim.** TENGU protein was immunolocalised in
**apical buds while the phytoplasma itself stayed phloem-restricted [D]**. See §2.3.

### SAP05 → witches' broom without auxin, and without ubiquitin

**[D]** Huang W et al. (2021). Parasitic modulation of host development by ubiquitin-independent
protein degradation. *Cell* 184(20):5201-5214.e12. doi:10.1016/j.cell.2021.08.029. PMID 34536345.
SAP05 bridges host **SPL** and **GATA** regulators directly to proteasome subunit **RPN10**,
degrading them without ubiquitination. Phenotype: proliferation of leaves and sterile shoots,
no flowering, **prolonged host lifespan**. Two amino acids define why it does not bind the insect
vector's RPN10. Structures: Liu S et al. (2024), *Nat Commun* 15, doi:10.1038/s41467-024-45521-7,
PMID 38326322; Zhang L et al. (2024), *iScience*, PMID 38322988; *PNAS* 120,
doi:10.1073/pnas.2310664120.

**Auxin not mentioned.** This is the miR156/SPL *age* pathway — a phase effector. We have no age
pathway, so this one costs a second signal. Its "prolonged lifespan" phenotype is tantalising
against our senescence machinery and we should note it and not build it.

## 1.4 *Plasmodiophora brassicae* (clubroot)

*Pending — see Part 6.*

## 1.5 Nematode feeding sites — the best-resolved auxin-transport pathology in plant biology

This is where the transport evidence actually lives, and we sourced it directly rather than through
a sweep. It carries both Q3 and Q4, so the detail is in §4.1; the mechanism summary:

**Cyst nematodes (syncytia).** **[D] Grunewald W, Cannoot B, Friml J, Gheysen G (2009). Parasitic
nematodes modulate PIN-mediated auxin transport to facilitate infection. *PLoS Pathog*
5(1):e1000266. doi:10.1371/journal.ppat.1000266.** PIN1 and PIN7 **down**, PIN3 and PIN4 **up and
specifically expressed** in young syncytia; PIN2 absent. Mutants: `pin1` −40% cyst number
(initiation defect); `pin3`,`pin4` −10-25% but dramatically more small/underdeveloped cysts
(expansion defect); double mutants worse than singles.

**Root-knot nematodes (giant cells).** **[D] Kyndt T, Goverse A, Haegeman A, Warmerdam S, Wanjau C,
Jahani M, et al. (2016). Redirection of auxin flow in *Arabidopsis thaliana* roots after infection
by root-knot nematodes. *J Exp Bot* 67(15):4559-4570. doi:10.1093/jxb/erw230.** Auxin is **imported
at the basipetal side of the feeding site** by the concerted action of influx proteins **AUX1 and
LAX3** plus efflux protein **PIN3**; `aux1` and `lax3` mutants bear significantly **fewer and
smaller galls**. That is causal evidence that *import*, not synthesis, sizes the structure.

**An agent-encoded transporter perturbation.** **[D] Lee C, Chronis D, Kenning C, Peret B, Hewezi T,
Davis EL, Baum TJ, Hussey R, Bennett M, Mitchum MG (2011). The novel cyst nematode effector protein
19C07 interacts with the *Arabidopsis* auxin influx transporter LAX3 to control feeding site
development. *Plant Physiol* 155(2):866-880. PMID 21156858.** Hs19C07 binds LAX3; LAX3 and its
downstream polygalacturonase are expressed in the developing syncytium and in cells about to be
*incorporated* into it; ectopic 19C07 speeds lateral root emergence. The authors propose it
**increases LAX3-mediated auxin influx** — **[D]** for the interaction, **[I]** for the flux
consequence.

> **[OURS] This is the shape of the mechanism to steal.** The effector does not make auxin and does
> not change polarity — it raises the conductance `w` of specific walls, at the boundary of the
> structure, on the cells that are about to be recruited. **The structure grows by conductance
> spreading at its own margin.** That is an infection front expressed purely as a wall property,
> and it is the most directly implementable thing in this brief after §1.3's bud switch.

## 1.6 Four more worth knowing

**[D] *Pantoea agglomerans* pv. *gypsophilae* — the gall that REQUIRES host PAT.**
Chalupowicz L, Weinthal D, Gaba V, Sessa G, Barash I, Manulis-Sasson S (2013). Polar auxin transport
is essential for gall formation by *Pantoea agglomerans* on gypsophila. *Mol Plant Pathol*
14(2):185-190. doi:10.1111/j.1364-3703.2012.00839.x. PMID 23083316. Lanolin rings of TIBA or NPA on
gypsophila stems: galls developed **above** the ring but were **completely abolished below** it;
water-lanolin controls galled on both sides within 3 weeks. **PIN2 expression rose 35-fold at 24 h
post-inoculation**, reduced ~6-fold by TIBA; AUX1 unaffected. Disrupting the bacterium's own *iaaH*
did not change PIN2 induction — **the PIN response is host-driven, not a response to bacterial
auxin.** And the stated contrast: **TIBA did not inhibit *A. tumefaciens* tumours on tomato**,
which the authors attribute to *Agrobacterium* integrating its hormone genes and therefore being
transport-independent. ⚠ We read that Agrobacterium claim only in Chalupowicz's framing; we did not
retrieve their primary source for it.

**[D] *Pseudomonas savastanoi* iaaL — an agent-encoded `mu`.** IAA-lysine synthase converts IAA to
the far less active 3-indole-acetyl-ε-L-lysine. Cloned: PMID 3084452. Allelic variation and its
effect on the IAA/IAA-Lys balance: *Front Plant Sci* (2023) 14:1176705,
doi:10.3389/fpls.2023.1176705, PMC10280071. The olive-knot pathogen carries iaaM/iaaH **and** an
inactivating conjugase — i.e. an organism that tunes both `rho` and `mu`, which is exactly the
two-knob structure our solver would need.

**⚠ *Ustilago maydis* — the negative control.** Reineke G et al. (2008), *Mol Plant Pathol*,
doi:10.1111/j.1364-3703.2008.00470.x. The fungus makes IAA efficiently from tryptophan and auxin
rises in infected tissue, but **fungal IAA production is not essential for tumour formation**.
Tumours here need organ-specific host and pathogen genes (Skibbe et al., *Science*,
doi:10.1126/science.1185775). **A gall does not have to be an auxin gall.**

**[D/I] *A. rhizogenes* rolB — the only known perturbation of the flux RESPONSE.** rolB encodes a
plasma-membrane tyrosine phosphatase and increases the tissue's **sensitivity** to auxin rather than
its auxin content — the hairy-root phenotype follows. **[D]** for the phenotype and the phosphatase
activity; **[I]** for the auxin-perception mechanism. ⚠ Note the counter-title we found and did not
read: "The rolB gene of *Agrobacterium rhizogenes* does not increase the auxin sensitivity of
tobacco protoplasts by modifying the intracellular auxin concentration" — i.e. the sensitivity
change is real and the *route* is contested. **This is the closest thing in the literature to a
biological knob on our flux-response exponent `b`.**

---

# Part 2 — Q2: how the agent spreads, and whether that can ride our flux field

**Short answer: no agent moves in the polar auxin transport stream, and we could not find a paper
that even tests it.** But the question decomposes into four routes with very different
implications, and two of them are usable.

## 2.1 The four routes, with speeds

| Route | Agents | Speed | Follows what |
|---|---|---|---|
| **Phloem sieve lumen** | phytoplasmas, most viruses systemically | phloem sap ~16-20 cm/h; phytoplasma front ~**0.2-0.3 cm/day** ⚠ | source→sink assimilate field |
| **Plasmodesmata, cell-to-cell** | viruses locally | TMV ~**6 cells/day** (1 cell per 4 h) | symplastic connectivity |
| **Xylem lumen** | *Verticillium*, *Fusarium*, *Ralstonia* | not measured here | vessel topology, almost strictly |
| **Polar auxin transport** | **nothing** | (PAT is 5-20 mm/h) | — |

Anchors:
- **PAT = 5 to 20 mm/h**, phloem-borne auxin ~**16-20 cm/h** — i.e. **phloem is 8-40x faster than
  PAT**, and most long-distance auxin redistribution is phloem, not PIN. *The Arabidopsis Book*,
  "Polar auxin transport and asymmetric auxin distribution", doi:10.1199/tab.0108, PMC3243298. **[D]**
- **TMV spreads ~6 cells/day**; replication complexes traverse plasmodesmata at 18-20 hpi and repeat
  in the adjacent cell in 3-4 h. Kawakami S, Watanabe Y, Beachy RN (2004), *PNAS*,
  doi:10.1073/pnas.0401221101. **[D]**
- **Phytoplasma timecourse [D]**: Wei W et al. (2004), *Phytopathology* 94(3):244-250,
  doi:10.1094/PHYTO.2004.94.3.244 — after localised leafhopper inoculation of one leaf: main stem by
  **1 dpi**, roots and top leaf by **2 dpi**, other leaves progressively **top to bottom from 7 to
  21 dpi**; populations rose **~6x per week** between 14 and 28 dpi; throughout the phloem by 21 dpi.
  Carminati G et al. (2021), *Pathogens* 10(7):811, PMID 34206841 — graft-inoculated tomato,
  systemic at **~29 dpi**; titre at 15 dpi **roots = 22x apexes, 221x lower stem**.
- ⚠ **Phytoplasma longitudinal front ~0.2-0.3 cm/day**, "strongly retarded as compared with mass
  flow" — van Bel AJE & Musetti R (2019), *J Exp Bot* 70(15):3737-3755, doi:10.1093/jxb/erz172,
  citing Aryan et al. 2016 (*J Phytopathol* 164:631-640, doi:10.1111/jph.12486). **We could not
  retrieve Aryan (403).** This is the single most quantitatively useful number in the sweep and it
  is **unverified at source**.
- **[D]** Mass flow alone is insufficient: Pagliari L et al. (2017), *J Exp Bot* 68(13):3673-3688,
  PMID 28859375 — SEOR1-mediated restriction of phloem transport did **not** limit phytoplasma
  titre. And the pathogen partly blocks its own highway: Musetti R et al. (2013), *MPMI*
  26(4):379-386, PMID 23234405 — infection drives Ca²⁺ influx → callose and protein plugging at
  sieve plates. **[D]**
- ⚠ **Source-vs-sink is host-dependent.** Christensen NM et al. (2004), *MPMI* 17(11):1175-1184,
  PMID 15553243 — in *Euphorbia pulcherrima* phytoplasmas accumulated **disproportionately in
  SOURCE leaves** and were near-undetectable in sinks. Do not model it as universally sink-directed.
- **Xylem wilts are the strictest case**: hyphae lie "approximately parallel to the long axes of
  vessels" and **vessel-to-vessel colonisation was uncommon**, occurring only through intertracheary
  pit membranes. (Ultrastructural study of vascular colonization in three vascular wilt diseases I,
  *Physiol Plant Pathol*, PII 0048405383900188.) **[D]** ⚠ read via snippet only.

## 2.2 So can we advect the front along `J`? — the honest answer

**No, if you mean "the agent is carried by polar auxin transport". That is not a thing in the
literature.** PAT is a carrier-mediated parenchyma route for a 175-Da molecule; nothing pathogenic
uses it.

**But there are two defensible couplings, and one is good enough to build on.**

**(a) [D] Auxin closes plasmodesmata.** Han X et al. (2014). Auxin-callose-mediated plasmodesmal
gating is essential for tropic auxin gradient formation and signaling. *Dev Cell*
S1534-5807(13)00735-1. An auxin–GSL8 feedback circuit raises plasmodesmal callose and locally
lowers symplastic permeability. In roots, **auxin activates PDLP5, closing plasmodesmata** —
Sager R et al. (2020), *Nat Commun*, doi:10.1038/s41467-019-14226-7, where PDLP5 induction during
lateral root emergence *restricts the spatial scope of auxin signalling* to the overlying cells.
Also relevant: Band LR (2021), *New Phytol*, doi:10.1111/nph.17517, and Paterlini A (2020),
*Biology Open* 9(11):bio055541 — auxin itself moves through plasmodesmata, so PD state is part of
the transport field, not separate from it.

> **[OURS] The mechanism this licenses.** Let the agent's concentration `g` diffuse cell-to-cell
> with a conductance that is *the plasmodesmal one*, and let auxin close plasmodesmata. Then:
> the agent raises `rho`; auxin rises; plasmodesmata shut; **the front decelerates in exactly the
> tissue it has already deformed and accelerates into tissue it has not.** That is a self-limiting,
> self-sharpening travelling wave with a shape nobody drew, built from one [D] coupling and no new
> molecule. It also makes the lesion's *boundary* emergent — which is the part of a disease a
> viewer actually reads.
>
> **What it is not:** it is not "the front follows `J`". It follows `−∇` of its own concentration
> through a conductance modulated by `a`. That is a weaker and more honest claim, and it is the one
> the literature supports.

**(b) [I] The systemic pattern follows source→sink.** Viral systemic spread tracks photoassimilate
distribution — Roberts AG et al. (1997), *Plant Cell*, phloem unloading in sink leaves of
*N. benthamiana*; Roberts et al. (2007) report the similarity between CaMV infection and
photoassimilate distribution in sink organs; **unloading occurs via class III veins**. We have no
carbon model, so we cannot do this properly. But our vein hierarchy *is* a proxy for the same
topology, and "the agent enters an organ at its major veins and unloads at the minor ones" is a
statement about a network we already grew.

## 2.3 The finding that changes the architecture: effector range ≠ agent range

**[D]** TENGU protein was immunolocalised in **apical buds** while the phytoplasma remained
**phloem-restricted** (Hoshi 2009). SAP11 and SAP54 act in the nuclei of cells the bacterium never
enters.

> **[OURS] Model two fields, not one.** `g` — where the agent is, confined to a route — and `e` —
> where its effector is, which diffuses out of that route into the tissue. They have different
> geometries and different length scales, and the *effect* field is the one that deforms the plant.
> This is free: it is one more diffusible scalar on a cell field we already step, and it means the
> deformation is **not** co-located with the infection, which is exactly what real phyllody looks
> like (bacterium in the phloem, flowers turned to leaves).

---

# Part 3 — Q3: does the perturbation's pattern follow the pre-existing flux network?

**This is the question the brief cared most about and the answer is a qualified yes. The
qualification is which layer you ask about.**

## 3.1 The gall's own vasculature is continuous with the host's, and its two morphologies are the
two canalisation solutions

**[D] Aloni R, Pradel KS, Ullrich CI (1995). The three-dimensional structure of vascular tissues in
*Agrobacterium tumefaciens*-induced crown galls and in the host stems of *Ricinus communis* L.
*Planta* 196:597-605. doi:10.1007/BF00203661.** Thick sections, lactic-acid cleared, lacmoid
stained, 10-day to 2-month tumours:

- **Two distinct strand types.** **Tree-like branched bundles** developing *toward the tumour
  surface* in fast-growing regions; **globular bundles** — spiral and circular vessels, whorl-like —
  in slowly developing parts. Both carry xylem and phloem.
- **Both are continuous with the host vascular system.**
- Tumour bundles are interconnected by a **dense net of phloem anastomoses: sieve tubes but no
  vessels.**
- In the host **below** the tumour, increased xylem differentiation where gall bundles join.
  At the interface, vessel number considerably increased, interrupted by multiseriate rays.
- **Earliest vascular differentiation detected at 7 days post-infection.**
- Their interpretation, quoted: the patterns *"reflect the apparent synthesis sites, concentration
  gradients and flow pathways of the plant hormones additionally produced in the tumors."* **[I]**

> **[OURS] Read those two bundle types as a canalisation solver would.** A distributed auxin source
> **with a drain** (the host bundle system, at the tumour base) canalises into **branched strands
> running from source to drain** — exactly the tree-like bundles, and Aloni notes they develop
> *toward the tumour surface*, i.e. toward where the IAA-producing transformed cells are. A source
> **without an accessible drain** — the slow interior, cut off by the tumour's own bulk — canalises
> into **closed loops**, which is what "spiral and circular vessels, whorl-like" is a description
> of. **We would get both, from one solver, by whether a region has a path to a sink.** We should
> check that against `test/vein.mjs` before believing it, but it is a prediction with a picture
> attached and it costs nothing to test.

**[D]** Vascularisation is a *precondition*, not a consequence: Ullrich CI, Aloni R (2000).
Vascularization is a general requirement for growth of plant and animal tumours. *J Exp Bot*
51(353):1951-1960. PMID 11141169. Plant tumours reach >100 mm where an unvascularised animal tumour
stalls at a few mm. And Wächter R et al. (2003), *Plant Physiol* 133(3):1024-1037,
doi:10.1104/pp.103.028142, PMID 14526106: vascular differentiation plus epidermal disruption
**redirect nutrient-bearing water flow into the tumour** — the gall grows by capturing flow.
Deeken R et al. (2006), *Plant Cell* 18(12), PMC1785420: ~22% of the genome differentially
expressed, sugar and K⁺ up to 10x and 5x, transpiration ~15x normal tissue.

⚠ **One relayed claim we checked and had to correct.** It is sometimes stated that the
ethylene-insensitive tomato *Never ripe* mutant "does not develop tumours". The primary paper says
something narrower: **[D]** Aloni R, Wolf A, Feigenbaum P, Avni A, Klee HJ (1998). The *Never ripe*
mutant provides evidence that tumor-induced ethylene controls the morphogenesis of *Agrobacterium
tumefaciens*-induced crown galls on tomato stems. *Plant Physiol* 117(3):841-849. Ethylene evolution
from gall-bearing internodes was **up to 50x** control at 21 and 28 dpi; tumour-induced ethylene
**decreased vessel diameter** in host tissue beside the tumour in wild type but had limited effect
in *Nr*; and it **promoted the unorganised callus shape** — **galls on *Nr* stems had a smooth
surface.** So ethylene controls gall *morphogenesis and host vessel calibre*, not gall existence.
**A third signal decides whether the lump is lumpy.** We have no ethylene.

## 3.2 In *Rhodococcus*, the auxin response PRECEDES the anatomy

**[D] Dolzblasz A, Banasiak A, Vereecke D (2018). Neovascularization during leafy gall formation on
*Arabidopsis thaliana* upon *Rhodococcus fascians* infection. *Planta* 247(1):215-228.
doi:10.1007/s00425-017-2778-5. PMID 28942496.** De novo vascularisation by fascicular/interfascicular
cambium activity plus parenchyma transdifferentiation, **basipetally below the infection site in
the main stem and acropetally in the entire side branch**. Using pDR5:GUS, **a strong auxin response
is mounted before any apparent anatomical change**, from which they argue auxin "is the signal that
controls the vascular differentiation induced by the infection."

**[D]** for the temporal ordering of the DR5 signal against anatomy; **[I]** for auxin being causal
(no transport perturbation, no PIN imaging). **This is the closest thing in either gall literature
to a canalisation-shaped claim: auxin response predicts where the new strands will appear.**

Note the *direction* asymmetry — basipetal in the stem, acropetal in the branch. That is a polarity
field statement, and it is free in our engine.

## 3.3 In nematode feeding sites, the structure is caged by vasculature it recruited

**[D]** The infective juvenile **migrates intercellularly to the vascular cylinder** and selects
provascular cells — the feeding site's *position* is set by host anatomy before any hormone is
involved. And the mature structure is "encaged within a network of **de novo** formed xylem and
phloem cells" — Bartlem DG, Jones MGK, Hammes UZ (2014). Vascularization and nutrient delivery at
root-knot nematode feeding sites in host roots. *J Exp Bot* 65(7):1789-1798. PMID 24336493.

So across three independent systems — bacterial tumour, bacterial leafy gall, animal feeding site —
**the same thing happens: a new sink appears, and the host's vascular patterning machinery grows a
strand network to it, continuous with what was already there.**

## 3.4 What the literature does NOT say, and it matters

- **"Canalisation" is not used as a term in the crown-gall literature.** Aloni's framework —
  hormone concentration gradients and flow pathways inducing vascular differentiation — is
  canalisation in substance, but no crown-gall paper cites Sachs's feedback, tests it, or models
  PIN repolarisation. This is a genuine gap, not our failure to find it. Entry points to Aloni's
  own synthesis: Aloni R (2001) "Foliar and axial aspects of vascular differentiation"; Aloni R
  (2013), *Planta*, doi:10.1007/s00425-013-1927-8; Aloni R (2025), *Planta*,
  doi:10.1007/s00425-025-04716-y, PMC12081539.
- **Nobody has imaged PIN in a crown gall.** We searched for PIN expression, immunolocalisation, and
  crown-gall transcriptome PIN hits and found nothing; the standard review (Gohlke & Deeken 2014)
  contains no discussion of PIN, PAT, AUX1/LAX, NPA, canalisation, GH3, IAA-Asp or oxIAA at all.
  **Treat crown-gall PIN biology as open.**
- ⚠ **Canalisation itself is contested.** Ravichandran SJ, Linh NM, Scarpella E (2020). The
  canalization hypothesis — challenges and alternatives. *New Phytol*, doi:10.1111/nph.16605,
  argues against the standard account; Bennett T et al. (2019), *Ann Bot* 123(3):429, "Auxin
  transport and stem vascular reconnection — has our thinking become canalized?". Read these beside
  Mazur E, Kulik I, Hajný J, Friml J (2020), *New Phytol*, doi:10.1111/nph.16446, PMC7318144, which
  is the current molecular statement for it. **Our engine is built on the pro-canalisation side of a
  live argument. That is worth knowing and worth saying in SCIENCE.md.**

## 3.5 The verdict on Q3

**[OURS]** Split the question in two and the answer is clean:

- **Does the DISEASE'S VASCULAR PATTERN follow / extend the host's flux network? YES, [D], in three
  independent systems, with strand continuity, direction asymmetry, and a DR5 signal that precedes
  the anatomy.** If we build this, the gall's internal plumbing is free and it is genuinely emergent.
- **Does the disease's OUTLINE — the lump's silhouette — follow the flux network? NO EVIDENCE, and
  one paper says a different signal sets it** (ethylene, *Never ripe*, smooth vs callus). The
  literature's account of tumour *shape* is unconstrained proliferation plus mechanical confinement,
  not patterning.

> **So the honest design is: do not draw the gall's outline, and do not expect to derive it either.
> Derive the vasculature, let the surface be whatever the cell-division field produces, and be
> prepared for the answer that a lump is a lump.** The interesting emergent object here is the
> strand network inside it, not its silhouette — which is the same lesson as the needle: the
> chemistry is legible in the veins.

---

# Part 4 — Q4: is there an agent that rewrites POLARITY rather than a rate?

**Yes. One clean case, one two-paper bridge nobody has closed, and a clear negative about NPA.**

## 4.1 [D] The clean case: cyst nematodes relocate PIN3 from basal to lateral membranes

**Grunewald W, Cannoot B, Friml J, Gheysen G (2009). Parasitic nematodes modulate PIN-mediated auxin
transport to facilitate infection. *PLoS Pathog* 5(1):e1000266. doi:10.1371/journal.ppat.1000266.**

Two changes, and they are of *different kinds*:

| PIN | change | kind |
|---|---|---|
| PIN1 | strongly down-regulated in the initial cell | expression |
| PIN7 | down | expression |
| PIN3 | up, and **relocalised from basal to lateral plasma membrane** — "clear fluorescence at the outer and inner lateral sides of 4-day-old syncytia" | **polarity** |
| PIN4 | up, similar lateral redistribution | **polarity** |
| PIN2 | not expressed in feeding sites | — |

Mutant phenotypes: `pin1` −40% cysts (**initiation**); `pin3`,`pin4` −10-25% cysts but dramatically
more small/underdeveloped ones (**expansion**); `pin1pin3` and `pin1pin4` worse than singles.

The model: **PIN1 down blocks efflux out of the initial cell, so auxin accumulates; PIN3/PIN4 turned
sideways distribute it laterally, and the syncytium expands radially into the cells that receive
it.** The authors demonstrate the localisations and the mutant phenotypes; the causal chain from
effector to relocalisation is **[I]** — they do not identify the effector that does it.

Complementary, and with the opposite carrier class: **[D]** Kyndt et al. 2016 (§1.5) — in root-knot
galls, auxin is *imported* at the **basipetal side** by AUX1 and LAX3 together with PIN3, and
`aux1`/`lax3` mutants make fewer and smaller galls.

> **[OURS] Why this is the one to copy.** It is a **per-wall reallocation of `P` with the cell's
> total PIN roughly conserved** — take the allocation off the basal wall and put it on the lateral
> ones. In our solver that is one line in the PIN allocation step: a per-cell bias field that
> rotates the preferred wall away from the flux-maximising one. And it produces a *radially
> expanding* structure rather than a *longer* one, which is a genuinely different morphology and not
> a sick version of the same plant. **That is the Q4 answer the brief was hoping existed.**

## 4.2 [I] The bridge: a bacterial effector destroys the machine that polarises PIN

Two demonstrated results with nobody standing between them:

- **[D]** *Pseudomonas syringae* pv. tomato effector **HopM1** localises to the TGN/EE and mediates
  proteasome-dependent degradation of **AtMIN7**, an ARF-GEF involved in vesicle trafficking.
  Nomura K et al. (2006), *Science*; Nomura et al. (2011). ⚠ Contested in part — Gangadharan A et al.
  (2013), *PLoS ONE* 8:e82032, doi:10.1371/journal.pone.0082032, argue HopM1 suppresses defences
  **independently of targeting AtMIN7**.
- **[D]** **AtMIN7 = BEN1 = BIG5.** Tanaka H et al. (2009), *Curr Biol*, "Fluorescence imaging-based
  screen identifies ARF GEF component of early endosomal trafficking". BEN1 localises to the TGN/EE
  (distinct from GNOM-positive recycling endosomes) and mediates trafficking of constitutively
  cycling PM proteins including **PIN1 and PIN2**. With BEN2/VPS45, BEN1 is "collectively required
  for polar PIN localization, for their dynamic repolarization, and consequently for auxin activity
  gradient formation" — Tanaka H et al. (2013), *PLoS Genet* 9:e1003540,
  doi:10.1371/journal.pgen.1003540, PMC3667747.

**Nobody has looked at PIN localisation in HopM1-infected or HopM1-expressing tissue.** We searched
and found nothing.

> **[OURS] Flag this loudly.** It is the most interesting untried experiment in the sweep, it is an
> **[I] bridge and not a fact**, and it is exactly the kind of claim that gets laundered into
> certainty by being repeated. If we cite it, cite it as two papers and a gap.

## 4.3 [D] The polarity machinery itself, and what "rewrite" looks like when it happens

We do not need a pathogen to know what a polarity rewrite produces, because the plant's own machinery
has been inverted experimentally:

- **A binary switch, and it inverts.** **[D]** Friml J et al. (2004). A PINOID-dependent binary switch
  in apical-basal PIN polar targeting directs auxin efflux. *Science* 306(5697):862-865.
  doi:10.1126/science.1100618. **PID overexpression shifts PIN localisation basal→apical**; `pid`
  loss of function shifts PIN1 apical→basal at the inflorescence apex. PID (kinase) and PP2A
  (phosphatase) set the direction by phosphorylation state. Phosphorylation of conserved PIN motifs
  directs polarity and transport: Huang F et al. (2010), *Plant Cell* 22(4):1129, PMC2879764.
  **This is a dosage knob whose sign flips a polarity — the single most engine-shaped fact in Q4.**
- **Randomisation gives a body plan, not a sick plant.** **[D]** Steinmann T et al. (1999).
  Coordinated polar localization of auxin efflux carrier PIN1 by GNOM ARF GEF. *Science*
  286(5438):316-318. In `gnom` embryos PIN1 polarity is **largely randomised with respect to
  neighbouring cells**; PIN1 asymmetry normally *develops from a random distribution* during early
  embryogenesis. `gnom` seedlings have no apical-basal axis at all.
- **The trafficking route is directional, which matters.** GNOM preferentially mediates PIN recycling
  at the **basal** side; apical PIN2 localisation runs through a GNOM-independent route, and PID
  recruits PINs *into* that GNOM-independent trafficking. Geldner N et al. (2003), *Cell*
  S0092-8674(03)00003-5; Kleine-Vehn J et al. (2008), *Curr Biol*, "ARF GEF-dependent transcytosis
  and polar delivery of PIN auxin carriers"; Kleine-Vehn J et al. (2009), *Plant Cell*, PMC2814515.
  **So brefeldin A is not a global block — it hits basal recycling preferentially.** A pathogen that
  hit that route would bias polarity in one direction, not scramble it.
- **Auxin itself repolarises PIN, and that is our whole thesis.** **[D]** Sauer M, Balla J, Luschnig
  C, Wisniewska J, Reinöhl V, Friml J, Benková E (2006). Canalization of auxin flow by
  Aux/IAA-ARF-dependent feedback regulation of PIN polarity. *Genes Dev* 20:2902-2911. Local auxin
  application, wounding, and de novo organ formation all rearrange PIN subcellular polarity;
  the effect is cell-specific, **does not depend on PIN transcription**, and runs through Aux/IAA-ARF
  signalling. Auxin "acts as a polarizing cue, which links individual cell polarity with tissue and
  organ polarity."

## 4.4 What a rate perturbation gives you — and the surprise is that it is not always "a sick plant"

The brief's framing was that a rate perturbation makes a *sick* plant and a polarity perturbation
makes a *different body plan*. **That is mostly right and there is one important exception.**

**[D] Okada K, Ueda J, Komaki MK, Bell CJ, Shimura Y (1991). Requirement of the auxin polar transport
system in early stages of *Arabidopsis* floral bud formation. *Plant Cell* 3(7):677-684.** Polar
transport activity in `pin1-1` is **14% of wild type** and in `pin1-2` **7%**. The phenotype is the
**pin-formed inflorescence** — a naked spike with no floral buds at all. That is a *capacity*
reduction, not a polarity change, and it produces one of the most radically different body plans in
plant genetics.

> **[OURS] So the sharper statement is about MAGNITUDE and UNIFORMITY, not about which knob.** A
> small uniform rate change makes a sick plant. A rate change that takes transport below the
> threshold where primordia can canalise removes an entire organ class — because organ initiation in
> our engine, as in the plant, **is** a canalisation event. `pin1`'s 7-14% is a number worth
> targeting: it says the interesting regime is roughly an order of magnitude down, not 20%.
>
> And a polarity change gives you something a rate change provably cannot: **a different DIRECTION
> of expansion** (Grunewald's radial syncytium), which no scalar multiplier on `w` can produce.

## 4.5 NPA, TIBA, and the one biological modulator of the canalisation gain

**NPA is a global, non-directional efflux block. It is not a polarity tool.** **[D]** Abas L et al.
(2021). Naphthylphthalamic acid associates with and inhibits PIN auxin transporters. *PNAS* 118,
doi:10.1073/pnas.2020857118, PMID 33443187; and independently Teale WD et al. (2021), *EMBO J*.
Structures show NPA **locks PIN in an inward-facing state**, competing with IAA at the intracellular
pocket at much higher affinity; NPA-bound structures exist for PIN1, PIN3 and PIN8. Review: Kong M,
Liu X, Sun L, Tan S (2022), *Mol Hortic* 2:22, doi:10.1186/s43897-022-00043-y. The older ABCB-target
model is superseded. **In our terms NPA is `w ↓` uniformly — the least interesting perturbation
available**, though see §4.4 for why "uniform and large" is still not boring.

**The one thing known to modulate the canalisation FEEDBACK itself is a hormone we do not have:**

**[D] Zhang J, Mazur E, Balla J, Gallei M, Kalousek P, Medveďová Z, Li Y, Wang Y, Prát T, Vasileva M,
Reinöhl V, Procházka S, Halouzka R, Tarkowski P, Luschnig C, Brewer PB, Friml J (2020).
Strigolactones inhibit auxin feedback on PIN-dependent auxin transport canalization. *Nat Commun*
11. doi:10.1038/s41467-020-17252-y. PMC7360611.** Strigolactones do **not** change PIN abundance or
constitutive endocytosis. They **uncouple auxin's effect on endocytosis and trafficking**, through a
non-transcriptional D14/MAX2 route — i.e. they **block the auxin→PIN-polarity feedback loop that IS
canalisation**. Assays: vascular regeneration after wounding (faster in `max1-1`/`max4-1` SL
biosynthesis mutants, nearly abolished in DEX≫MAX1); NAA-induced PIN2 lateralisation attenuated by
GR24; BFA and FM4-64 experiments.

> **[OURS] This is the biological identity of our flux-response exponent `b`, and it is the answer
> to "which second signal".** We do not need strigolactone the molecule. We need the thing it does:
> a diffusible field that **turns the canalisation gain down**. An agent that raised `b` locally
> would make tissue hyper-canalising — fewer, fatter, more dominant strands; an agent that lowered
> it would make tissue that cannot form a vein at all. Neither is a rate change and neither is a
> polarity change. **It is a third axis and it is the one our solver is uniquely able to show.**

## 4.6 The verdict on Q4

**[OURS]** Ranked by how much body-plan change they buy per line of code, and by how well the
literature backs them:

1. **Per-wall PIN reallocation (basal → lateral).** [D] in cyst nematodes. Produces radial expansion.
   One line in the allocation step. **Build this one.**
2. **Flux-response gain `b`, up or down, as a diffusible field.** [D] as a mechanism (strigolactone),
   [D/I] as a pathology (rolB raises auxin sensitivity). Changes the *hierarchy* of the vein network,
   which is the channel this engine is visible through.
3. **Transport capacity `w`, but an order of magnitude, not 20%.** [D] `pin1` at 7-14% removes an
   organ class. Cheapest of all and not as boring as it sounds.
4. **`rho` with a saturating `mu`.** [D] and it is what *Agrobacterium* does — but the host clamp
   means the visible effect is small, and it carries no spatial information of its own.

---

# Part 5 — Q5: vertical transmission, and whether a deformation can be inherited

**The brief expected this to be weak and was right about three of its four parts. The fourth is
stronger and cleaner than the brief expected, and it is the one worth building the arc on.**

## 5.1 Seed transmission of the agents themselves

| Agent | Verdict | Numbers |
|---|---|---|
| **Phytoplasma** | ⚠ **CONTESTED. Every published "rate" is a PCR-positivity rate.** | 18% of coconut embryos [D for DNA]; 1.8% soybean seeds; ~35% of grouped seedling samples in the tomato/rape/maize study |
| ***A. tumefaciens*** | **NO** [D], and there is a clean negative | **0 of 2,650** seeds from the mother tree; never in the seed interior |
| ***P. brassicae*** | **Surface contamination only** [D] | 7/46 samples, 10³–3.4×10⁴ spores per 10 g, 80-100% viable — **below the level that produces symptoms in bioassay** |
| ***R. fascians*** | "Externally seed-borne" — seed coat, not embryo | ⚠ review-and-datasheet claim, primary basis not reached |
| **Viruses** | **YES, [D], and large** | ~18-25% of plant viruses in at least one host; PSbMV 0-55%; tobacco ringspot in soybean 54-78%; "some reaching 100%" |
| ***Epichloë*** | **YES — vertical transmission IS the norm** [D] | 88-93% in selected *Lolium* populations, 69-70% unselected, >99% in individual genotypes |

The load-bearing details:

- **Phytoplasmas.** The mechanistic objection is real: they are phloem-limited and there is no
  sieve-element connection to the embryo. **[D] for DNA in embryos** — Cordova et al. (2003),
  *Mol Plant Pathol* 4(2), doi:10.1046/j.1364-3703.2003.00152.x, PMID 20569368: nested PCR positive
  in **13 of 72 coconut embryos**, with *in situ* PCR localising signal to the plumule. **Not
  demonstrated: viability, infectivity, or a symptomatic adult plant.** Against it: a properly
  controlled screenhouse experiment on lime witches' broom sampled every 3 months **for 2 years**
  and found **no transmission** (*Plant Disease*, doi:10.1094/PDIS-06-10-0400 — ⚠ author list
  unverified, APS 403); and Akhtar & Dickinson's sesame, lentil and chickpea phyllody experiments
  **failed to transmit through seed while grafting and leafhopper transmission succeeded in the same
  experiments** — a negative with positive controls, which is the strong form. Even the sympathetic
  review concedes that "in the majority of these seedlings after the fourth leaf stage the presence
  of phytoplasmas is greatly reduced" (Kumari et al. 2019, *Front Microbiol* 10:1349,
  doi:10.3389/fmicb.2019.01349, PMC6610314). ⚠ The single most-cited "tomato seed transmission"
  reference is a **two-page conference supplement with no DOI** (Calari et al. 2011, *Bull Insectol*
  64:S157-S158) and carries far more citation load than its evidentiary weight.
- ***Agrobacterium*, and the negative is instructive.** Yakabe LE, Parker SR, Kluepfel DA (2014),
  *Plant Disease* 98(6):766-770, doi:10.1094/PDIS-07-13-0742-RE, PMID 30708636: **"*A. tumefaciens*
  was never detected in or on the 2,650 seeds collected directly from the mother tree"**;
  contamination appeared only on nuts left on the orchard floor and **never in the seed interior**.
  But germinate seed *in the presence of* the bacterium with **no wounding** and **94% of seedlings
  formed tumours, 89% carried systemic populations**. **The route is the soil and the wounds of
  emergence — the environment, not the seed.**
- ***Epichloë* is the one that inherits by default**, and it does so by a route worth knowing:
  hyphae grow between the meristematic cells of the shoot apex and **co-migrate with cell files into
  ovules and embryos** (Schardl CL, Leuchtmann A, Spiering MJ (2004), *Annu Rev Plant Biol*
  55:315-340, doi:10.1146/annurev.arplant.55.031903.141735). Rates are a *selected* property, not a
  default: a nine-generation maintenance programme took transmission **76% → >95%** (Gagic M et al.
  (2018), *Front Plant Sci* 9:1580, doi:10.3389/fpls.2018.01580, PMID 30483280). ⚠ Its morphological
  effect splits: the *sexual* mode forms a stroma round the inflorescence and **suppresses it
  entirely — "choke disease"** [D]; the *vertically transmitted asexual* mode is typically
  **asymptomatic**, with reported effects on height, tillering and leaf traits **variable in sign
  across studies**.

> **[OURS] The arc "inject → deform → inherit" is not supported by any of the agents in Part 1.**
> If we want inheritance, the literature offers two honest routes and they are different stories:
> **the endophyte route** (the agent rides the shoot apical meristem into the ovule — which is
> exactly a mechanism our meristem module could express, since the agent would simply have to be
> present in the dividing cell sheet) and **the genomic route** below.

## 5.2 The one case where it really happened: T-DNA is fixed in crop genomes

**[D] Kyndt T, Quispe D, Zhai H, Jarret R, Ghislain M, Liu Q, Gheysen G, Kreuze JF (2015). The
genome of cultivated sweet potato contains *Agrobacterium* T-DNAs with expressed genes: an example
of a naturally transgenic food crop. *PNAS* 112(18):5844-5849. doi:10.1073/pnas.1419685112.
PMID 25902487. PMC4426443.**

- **IbT-DNA1 contains *iaaM* and *iaaH*** (plus C-protein and agrocinopine synthase). Present in
  **all 291 cultivated hexaploid accessions tested and absent from closely related wild relatives.**
- IbT-DNA2 carries a **RolB/RolC homologue** plus ORF13/ORF14; in 45 of 217 genotypes. **No *ipt*
  reported.**
- **They are transcribed** — qRT-PCR found low but detectable mRNA in leaf, stem, root, shoot apex
  and storage root.

Breadth: **[D]** Matveeva TV, Otten L (2019), *Plant Mol Biol* 101:415-437,
doi:10.1007/s11103-019-00913-y — cT-DNA in **23 of 275 dicot species screened**, across *Eutrema,
Arachis, Quillaja, Euphorbia, Parasponia, Humulus, Juglans, Camellia, Cuscuta* and more; reviews now
estimate **5-10% of dicots** carry it (**[I]** extrapolation).

⚠ **Correction to the brief: there is no "Chen et al., *Plant Cell* 2019" on natural T-DNAs.** The
two papers matching the description are **Chen K, Otten L (2017), *Front Plant Sci* 8:1600,
doi:10.3389/fpls.2017.01600, PMC5606197** and Matveeva & Otten 2019 above. Treat the *Plant Cell*
attribution as erroneous until someone produces a DOI.

**And here is where it stops, which is the important part:**

> **No naturally acquired T-DNA gene has been shown to change the shape of the plant carrying it.**

Kyndt et al. found **no association between IbT-DNA2 alleles and root characteristics** (one
marginal P = 0.04 at one location). In *Nicotiana glauca* and *Linaria vulgaris*, Matveeva & Lutova
(2014), *Front Plant Sci* 5:326, PMC4127661, state plainly: *"No phenotype of the hairy root disease
is observed."* ⚠ Expression in *Linaria* is contested and resolving toward "expressed, very weakly"
— the same group reported no amplifiable mRNA in 2014 and rolC expression by real-time RT-PCR in
2018 (*Vavilov J Genet Breed* 22(2), doi:10.18699/VJ18.359), with **no obvious morphological
differences** either way. Chen & Otten (2017) put it flatly: *"At the moment of writing, no direct
evidence exists for a particular role for any of the cT-DNA genes within their normal context."*
Every documented cT-DNA phenotype — Ng_orf13 dark rounded leaves, Ng_rolC dwarf pale lanceolate
leaves, the sweet-potato RolB/RolC homologue causing early flowering — comes from **artificial
overexpression in tobacco or *Arabidopsis***, not from the natural host.

## 5.3 Pathogen-induced morphology becoming heritable epigenetically: NOT SUPPORTED

**We found no published case.** The nearest literature is defence-*chemical* priming, and it has a
published failure to replicate:

- **[D, contested]** Luna E, Bruce TJA, Roberts MR, Flors V, Ton J (2012), *Plant Physiol*
  158(2):844-853, PMID 22147520; and Rasmann S et al. (2012), *Plant Physiol* 158(2):854-863,
  doi:10.1104/pp.111.187831 — progeny primed for SA- and JA-dependent resistance, persisting through
  one stress-free generation; siRNA-biogenesis mutants fail to produce primed progeny, which is the
  main argument for an epigenetic basis.
- **⚠ THE NEGATIVE, and it is the entry that matters.** Yun J, Noh B, Noh Y-S (2022). Negative
  evidence on the transgenerational inheritance of defense priming in *Arabidopsis thaliana*.
  *BMB Reports* 55(7):342-347. doi:10.5483/BMBRep.2022.55.7.013. PMID 35410637. PMC9340085. Using
  **both** infiltration and the original dipping method, at two developmental stages: **no
  resistance phenotype, no difference in bacterial growth, no elevated PR1, no increased H3
  acetylation at PR1.** Attributed to photoperiod, humidity, infection intensity — which is to say
  nobody knows. **This is a contested literature, not a settled one.**
- **[D]** Boyko A et al. (2007), *Nucleic Acids Res* 35(5):1714-1725, doi:10.1093/nar/gkm029 — TMV
  infection gave an **8.2-fold increase in rearrangement frequency** at LRR-homologous loci in
  progeny, plus methylation changes. **One generation, and no morphological change reported.**
- ⚠ The only morphological transgenerational result we found is weak and not from a pathogen:
  Verhoeven KJF, van Gurp TP (2012), *PLoS ONE* 7(6):e38605 — JA-treated (herbivory-mimic) apomictic
  dandelion parents gave offspring with **reduced specific leaf area**, significant in one genotype
  and "subsignificant" across three, with "little consistency" between replicates by the authors'
  own account. **The SA (pathogen-mimic) arm produced no morphological offspring effect.**
- **[D] but not pathogen-induced — the existence proof.** Cubas P, Vincent C, Coen E (1999). An
  epigenetic mutation responsible for natural variation in floral symmetry. *Nature* 401:157-161.
  doi:10.1038/43657. *Lcyc* is hypermethylated and silent in peloric *Linaria vulgaris*, the
  methylation **co-segregates with the phenotype**, and somatic revertants show demethylation and
  restored expression. **A heritable epigenetic change to plant SHAPE is possible. Nobody has shown
  a pathogen causing one.**

## 5.4 Crown gall teratomas: the mitotic claim holds, the meiotic one does not

- **[D]** Braun AC, Wood HN (1976), *PNAS* 73(2):496-500, PMID 1061149. Teratoma shoots grafted onto
  normal plants gave **morphologically normal stems and leaves** — yet retained opine synthesis and
  hormone-independent growth when returned to culture. **The neoplastic state is reversibly
  suppressed, not lost.**
- **[D]** Turgeon R, Wood HN, Braun AC (1976), *PNAS* 73(10):3562-3564. Suppression characterises the
  **vegetative** phase; **recovery from the tumorous state occurs during the reproductive phase**,
  and seed progeny are normal.
- **[D]** Once the oncogenes are disarmed, T-DNA passes meiosis as a simple Mendelian trait —
  Barton KA, Binns AN, Matzke AJM, Chilton M-D (1983), *Cell* 32(4):1033-1043. ⚠ author list from
  the standard citation, page returned 403.
- **Habituation** — a mitotically heritable, **reversible**, *directed* loss of a cultured cell's
  hormone requirement, at 100-1,000x the somatic mutation rate, leaving the cell totipotent;
  regenerated plants have the **original** hormone requirement. ⚠ Meins review citation unverified.

## 5.5 The verdict on Q5

**[OURS]** Ranked by what the literature will actually support, if we want the arc to end in
inheritance:

1. **The genomic route is [D] and it is spectacular, and it is also silent.** *iaaM* and *iaaH* are
   in every cultivated sweet potato and are transcribed — **and no naturally transgenic plant has a
   demonstrated phenotype.** For a xenobotany piece that is arguably *better* than a phenotype: the
   agent's genes become part of the lineage and the deformation fades. **"The disease became the
   species and stopped being visible" is both the literature's actual finding and a good ending.**
2. **The endophyte route is [D] and it is the only one where the agent itself inherits.** *Epichloë*
   rides the shoot apical meristem into the ovule at 69-99%. It is also the one our architecture
   could express without new machinery, because the agent would only have to be present in the
   dividing cell sheet the meristem already simulates.
3. **Do not build heritable pathogen-induced morphology as if it were established.** It is not.
   If we show it, SCIENCE.md should say it is a licence we took, and JOURNAL should carry the Yun
   2022 replication failure so nobody later "confirms" it from a review.

---

# Part 6 — What we could not retrieve or verify

Read this before citing anything above.

**Not retrieved at source (paywall, 403, or auth wall):**

- **Aryan et al. 2016**, *J Phytopathol* 164:631-640, doi:10.1111/jph.12486 — the **0.2-0.3 cm/day**
  phytoplasma front speed, the most quantitatively useful number in the brief. Verified **only** as a
  sentence in van Bel & Musetti 2019 citing it. Host, method and even whether the paper contains the
  number are unconfirmed. **If this figure is load-bearing, get the PDF.**
- **Aloni, Pradel & Ullrich 1995**, *Planta* 196:597-605 — Springer auth wall. Title, volume, pages
  and DOI confirmed from several sources; the anatomical detail in §3.1 is from abstract and snippet
  text, not the paper.
- **Kakiuchi et al. 2006**, *Planta* 223:237-247 — the **50-80% PAT reduction** is from the abstract
  via a sweep. Not read at source; Europe PMC and Springer both failed.
- **Klee et al. 1987**, *Genes Dev* 1:86-96 — 403. DOI inferred, not verified.
- **Pertry et al. 2009**, *PNAS* — 403; abstract via PMC index.
- **Schwalm et al. 2003**, *Planta* 218:163-178 — auth wall; **full author list unverified**.
  (Flavonoid-mediated retention of auxin in the gall; **[I]** for flavonoids being the causal flux
  regulator.)
- **Dolzblasz et al. 2018** — auth wall; bibliographic data from Wikidata Q49060413 and PubMed.
  Note online 2017 / issue 2018.
- **Hoshi 2009 and Sugio 2011** *PNAS* full texts — 403. Statements about what is **absent** from
  those papers (e.g. "auxin not mentioned") rest on abstract + PMC-accessible content and are
  **weaker than the positive claims**.
- **Zhou et al. 2021** (SJP1/SJP2) — Wiley 403. No PMID; volume/pages unconfirmed.
- **Iwabuchi et al. 2022**, *Plant Cell* 34(5):1709 — abstract only; author list not fully resolved.
- **The ultrastructural wilt-colonisation study** (*Physiol Plant Pathol*, PII 0048405383900188) —
  snippet only; author and year not established.
- **Roberts et al. 1997 / 2007** on source-sink viral spread — read via secondary summary only.
- **Four APS-published papers** — apsjournals.apsnet.org returned 403 on every attempt. Affected:
  the **lime witches'-broom seed-transmission negative** (PDIS-06-10-0400) — which is the strongest
  evidence in §5.1 and whose **author list and year we could not verify**; the PSbMV rate paper
  (PDIS-06-21-1349-RE); Putnam & Miller 2007 on *R. fascians*; and Matveeva et al. 2012 on
  *Linaria* cT-DNA.
- **The CABI sceptical chapter on phytoplasma seed transmission** (doi:10.1079/9781800627031.0006) —
  403; authorship unconfirmed.
- **Alfalfa phytoplasma seed-transmission percentages** — both the *Seeds* 2025 paper and the
  Springer chapter were unreachable. **We have the claim and not the numbers.**
- **Barley stripe mosaic virus "0-100%"** — quoted from a secondary summary, no primary citation
  obtained. Do not use it.
- **Yang & Simpson 1981** and **Barton et al. 1983** — citations assembled from snippets.
- **The Meins habituation review citation** (believed *Annu Rev Genet* 23:395-408, 1989) —
  unconfirmed.
- **Whether Kyndt et al. 2015 has been challenged** (e.g. on contamination grounds) — not searched.
  We can say we saw no challenge, not that it is uncontested.

**Claims relayed at one remove and not traced to a primary source:**

- **"NPA/TIBA do not inhibit *Agrobacterium* tumours on tomato"** — read only in Chalupowicz et al.'s
  framing. This is load-bearing for §1.6's contrast and should be traced.
- **"*R. fascians* IPyA auxin induced PAT while plasmid cytokinins inhibited PAT"** — could not be
  located in a primary abstract. **Do not attribute to Stes 2012.**
- **Depuydt 2008's ~3.5-fold net decrease in host cytokinin** — from one summarisation pass of the
  PMC full text. Check Fig. 6.
- **Thomashow et al. (1986) *FEBS Lett*** on gene 1 tryptophan 2-monooxygenase — indexed but author
  line, volume and pages unverified. **Cite the *Science* 231:616-618 paper instead.**

**Experiments that appear never to have been done (absence of evidence, not evidence of absence):**

- **PIN expression, localisation or polarity inside an *Agrobacterium* crown gall.** Searched
  directly; nothing found; the standard review does not mention PIN at all.
- **PIN localisation in HopM1-expressing or *P. syringae*-infected tissue.** §4.2's bridge is open.
- **Phytoplasma spread tested against auxin transport inhibitors or in `pin` mutants.** So
  "phytoplasma spread is independent of auxin transport" is **[C] by absence of mechanism**, not
  **[D] by falsification.**
- **Any measurement of a gall's or lesion's expansion as a front velocity** in a form comparable to
  the transport speeds in §2.1. Wei 2004 and Carminati 2021 give arrival times per organ without
  path lengths, so a rate cannot be derived from them without assuming plant dimensions.

**Corrections we made to claims that were circulating:**

- The *Never ripe* result does **not** say tumours fail to form. It says ethylene controls gall
  **morphogenesis** and host vessel calibre; *Nr* galls form with a **smooth surface**. §3.1.
- **ARF6/ARF8 repression by TENGU is Minato et al. 2014, not Hoshi et al. 2009.** §1.3.
- **SAP11's clade specificity is strain-dependent** (Pecher 2019), which several summaries flatten.
- ⚠ **"Canalisation" is a contested hypothesis**, not settled ground (Ravichandran/Scarpella 2020;
  Bennett 2019). §3.4.
- **There is no "Chen et al., *Plant Cell* 2019" on natural T-DNAs.** The brief asked for it by name.
  The papers that exist are Chen & Otten 2017 (*Front Plant Sci* 8:1600) and Matveeva & Otten 2019
  (*Plant Mol Biol* 101:415-437). §5.2.
- **Every phytoplasma "seed transmission rate" in the literature is a PCR-positivity rate**, not a
  demonstrated infection. Nobody has published a Koch's-postulates-grade symptomatic adult from
  seed. §5.1.

---

# Part 7 — What is genuinely a parameter

Everything below would have to be **stated** if we build this, with the reason each is irreducible.
This is the cost sheet. It is deliberately short, and each line says what would remove it.

## 7.1 Irreducible — no amount of transport modelling gives these

1. **WHERE THE AGENT ARRIVES. One position, per infection.**
   Irreducible because it is an *event in the environment*, not a property of the plant. Every
   system in Part 1 has this: *Agrobacterium* needs a **wound**; the nematode J2 **selects** a
   provascular cell by criteria nobody has identified ("yet unknown vascular cells"); the leafhopper
   **chooses** a leaf. This is the same category as `37_wind.js` — a thing the plant is subject to —
   so it costs nothing against the one rule, exactly as the falling blade did not. **Removing it
   would require a model of vector behaviour or of wound distribution, which is a different project.**
   *Cheapest honest form: a seeded random position on the plant surface, and a time.*

2. **WHEN IT ARRIVES. One time.**
   Same category and the same defence. **Note it interacts with the life cycle** — arrival before
   florigen and arrival after produce different diseases, and that is emergent once the time is
   stated.

3. **THE AGENT'S DIFFUSIVITY / SPREAD RATE. One number, or one ratio.**
   Irreducible because it is a property of the *agent*, not the host. The literature gives real
   anchors — TMV **6 cells/day** [D], phytoplasma **~0.2-0.3 cm/day** [⚠ unverified] against PAT at
   **5-20 mm/h** [D] — so it can be *chosen from a table* rather than dialled, which is the standard
   this project already applies to leaf mass per area in `39_fall.js`. **The dimensionless form is
   the one to state**: front speed over PAT speed. TMV at 6 cells/day against PAT at ~5-20 mm/h is
   roughly **two orders of magnitude slower than transport**, which is the regime worth building.

4. **WHICH VARIABLE THE AGENT TOUCHES, AND ITS SIGN.** *(One enum, one sign, per agent.)*
   Irreducible because it is the agent's genome. `iaaM` is a `rho` gene; `iaaL` is a `mu` gene;
   `6b` is a `w` gene; Hs19C07 is a `w`-on-influx gene; the syncytium's is a `P` gene. **You cannot
   derive from transport which perturbation a pathogen evolved.** This is the one parameter that is
   *the point* — it is the species definition of the disease, the way `marginBias.ay` is the species
   definition of a leaf.

5. **THE MAGNITUDE OF THAT PERTURBATION. One scalar per agent.**
   Irreducible, but **strongly constrained by literature** and therefore closer to a lookup than a
   dial: free IAA moves **2.5x** under iaaM despite a 945x precursor [D]; PAT falls **50-80%** under
   6b [⚠]; PIN2 rises **35x** under *Pantoea* [D]; `pin1` at **7-14%** of wild-type PAT removes an
   organ class [D]. **Pick from those, do not sweep.**

6. **THE AUXIN-DEPENDENT CLAMP `mu(a)` — its saturation point.**
   *This is a parameter we would be ADDING, and it is worth it.* GH3/DAO buffering is [D] and is the
   difference between a 2.5x and a 945x deformation. The *shape* (saturating, auxin-activated) is
   given by the biology; the **half-saturation constant is not**, and no paper we found reports it in
   a form we could use. ⚠ **This is a real new constant. Book it in SCIENCE.md.**

7. **THE ETHYLENE-SHAPED HOLE, if we want the gall to have a surface.**
   [D] *Never ripe*: the difference between a lumpy callus gall and a smooth one is **ethylene**, a
   signal we do not have. If gall *surface texture* matters, this is a stated constant or a third
   signal. **Recommendation: do not model gall surface. Model the vasculature.** §3.5.

8. **THE AUXIN:CYTOKININ RATIO, if we want gall-vs-shooty-vs-rooty.**
   [D] and unavoidable: the three morphologies are a *two-hormone* phase diagram (Ooms 1981), and
   the molecular re-derivation is a transcriptional loop (ARF3 → IPT5) that still needs the second
   species. **We have one hormone. This is a genuine "you need a second signal, and it is cytokinin".**
   *Cheapest form that is not a lie: a single scalar `k` per agent standing for the CK arm, entering
   only as a competence term. That is one stated number, not a hormone model — but it should be
   named as an imposed prior, not smuggled in as chemistry.*

## 7.2 NOT parameters — things we would otherwise have assumed we had to state, and do not

These are the wins, and they are the reason to build this at all.

- **The gall's internal vein pattern.** [D] §3.1/§3.2 — it is what a canalisation solver produces
  from a source with, and without, a drain. **Free.**
- **Whether the gall's strands connect to the host's.** [D] — they do, in all three systems, and our
  solver connects them for the same reason.
- **The direction the vasculature propagates from the infection** (basipetal in stem, acropetal in
  branch, [D] Dolzblasz). Falls out of the existing polarity field.
- **The lesion's boundary.** [OURS] §2.2 — auxin closes plasmodesmata [D], so a diffusive agent
  through a conductance modulated by `a` sharpens and self-limits its own front. **We would get a
  boundary without drawing one.**
- **Which organs are affected and in what order.** Falls out of arrival position plus the spread
  model plus the plant's own architecture. Nothing scheduled.
- **The severity gradient along an axis.** Falls out of distance from the arrival point.
- **Whether a bud breaks.** [D] §1.3 + Prusinkiewicz 2009 — bud activation *is* a canalisation
  threshold in the model we would use. Witches' broom is that threshold moved, not a branching rule.
- **The deformed leaf's silhouette.** Our margin already grows from convergence points; perturbing
  the field perturbs the outline. **Do not add a "crinkle".**
- **Which vein strand becomes dominant under a `b` perturbation.** That is exactly what the solver
  decides.
- **Phyllody.** [D] §1.3 — a `q` perturbation. We already sweep `q`. **The cheapest visible symptom
  in the whole brief, and it needs no auxin machinery at all.**

## 7.3 The one-line recommendation

**[OURS]** If we build one thing: **the bud-activation switch (§1.3, §7.2) plus a `P`-reallocation
agent (§4.1), with a saturating `mu` (§7.1.6) and a plasmodesmal-conductance front (§2.2).** Every
piece is [D] in the literature, every piece is expressed in variables the solver already carries,
and together they give a witches' broom whose branch count, branch placement, front shape and
internal venation are all emergent. The stated parameters are **where, when, how fast, which
variable, how much** — five numbers, four of which are environmental and one of which is the
species definition of the disease.

**What we should NOT build**: gall surface morphology (needs ethylene), the rooty/shooty phase
diagram (needs cytokinin), the SAP05 phase effect (needs an age pathway), or anything that claims
the infection front rides the polar auxin transport stream (not supported by any paper we found).
