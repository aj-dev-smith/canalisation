# Tuning

Parameter regimes found by sweeping. **Read this before changing a constant.**
Many of these were hours of work and are not obvious from the equations.

## The auxin engine (`10_auxin.js` DEFAULT_PRM)

```
rho 0.60  mu 0.30   →  undisturbed steady state a = rho/mu = 2.0
D 6.0     T 40      →  the working regime for the meristem
b 3.0               →  gradient sharpness
dt 0.014  substeps 3 →  under the stability ceiling (~0.014). DO NOT RAISE.
ath 0.60  hSwitch 2.5 → a real sigmoid, not a step. A sharp switch means
                        canalisation can never nucleate in low-auxin lamina.
alpha 0.08 beta 0.15 Jsat 1e6 → quadratic regime; π must not saturate
piFloor 0.002       → low enough that a nucleating canal can beat it
```

### Pattern-formation map (static tissue, `test/pattern.mjs`)

Measured contrast and spot spacing at `mu 0.3, rho 0.6`:

| T | D | contrast | peaks | spacing |
|---|---|---|---|---|
| 10 | 3 | 3.2 | 5 | 6.5 |
| 20 | 5 | 4.6 | 7 | 5.8 |
| **40** | **6** | **9.8** | **5** | **5.8** | ← the regime in use
| 40 | 8 | 6.4 | 7 | 5.8 |
| any | ≥10 | ~2.1 | ~70 | 1.7 | ← pattern destroyed, noise

Rule of thumb: raising **D** lengthens the wavelength until it collapses; raising
**T** sharpens contrast. `D ≥ 10` kills the pattern entirely.

**Always verify a stationary pattern on static tissue (`G: 0`) before enabling
growth.** A pattern that dies with `G=0` will never work with growth on.

## Meristem (`20_meristem.js`)

```
R 10  rCZ 2.4  rPZ 6.8  G 0.003
detectA 1.7    persist 8   mergeR 2.2
organDrain 0.3  keepFrac 0.45 (hysteresis: strong max to be born, weak to survive)
```

- `rCZ` too small → the summit patterns and spots nucleate everywhere → disorder.
- `rPZ`→`R` drain is what confines initiation to a ring. Without it maxima form
  across the whole disc.
- Narrowing the competent band (`rOut`) tightens the divergence angle *and*
  starves the shoot — this is exposed as the "generative ring" slider deliberately.
- Warm the meristem ~220 steps at birth and discard the emitted burst, or the
  plant is born wearing a rosette of transient organs.

## Leaf margin (`25_margin.js`)

```
g0 0.00030  g1 0.00115  gExp 2.2   ay 0.62   smooth 0.16
D 7.0 (chain)  dMax 0.030  maxPts 620  mature 1400
```
Variety per leaf comes from randomising `ay`, `g1`, `gExp`, `D`, `tipBias` — the
margin's chemistry — **not** from shape numbers. Petals are the same engine with
`ay` 0.95–1.5, `g1` near zero and high `D`: broad, smooth, untoothed.

## Fruit (`35_fruit.js`)

```
subdiv 3 (642 wall cells)   gWall 0.00016  gAux 0.00052  gExp 1.8
smooth 0.020  ← CRITICAL. At 0.22 the wall smoothing flattens every lobe
                 (lobing 0.1 = sphere). At 0.02 lobing is 0.5–0.8.
wallMu 0.46  D 2.6  → keeps seed auxin local so lobes are distinct
ripenRate 0.022  ripenDiff 0.13 → wave crosses in a watchable time
```
Typical output: 15–19 seeds, lobing 0.5–0.8.

## Plant (`40_plant.js`)

```
elongation 0.0052   internode 0.0072  internodeSpan 2.6   minInternode 0.18
thicken 0.00030     nutation 0.0135   nutAmp 0.16
organGrow 190       florigenRate 0.0016  florigenThresh 12  floralOrgans 9
maxFlowers 6  organBudget 96  fruitScale 0.55
```
Most stem length should come from **subapical elongation**, not tip extension —
that is what spreads leaves apart and reads as growth rather than extrusion.
Organs are born crowded (`minInternode` small) and stretch apart afterwards.

## Rendering (`70_app.js` BASE_PAL)

```
bloom 0.38  bloomThresh 1.15  exposure 1.04  laminaMul 0.86
sway 1.0    dof 0.80    grain 0.024  vignette 0.60
```
`laminaMul` pulls the leaf body down so the **vasculature carries the light**.
A leaf should read as light held inside tissue. Vein emissive and lamina
brightness are a balance — raise one and lower the other.
