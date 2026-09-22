# Tend

**You can't draw this plant. You can only tend it.**

`tend.html` is a bench. On it is a plant grown by the same auxin engine as
`canalisation.html`, and in your hands are the three instruments auxin was
discovered with: a **lamp**, a pair of **shears**, and the tip's own **hormone**,
to put back on a cut. None of them touches the plant's shape. Each acts on its
environment or its chemistry, and the engine decides what grows back, from where,
and which way.

```bash
node tend/build.js          # -> tend.html (one file, no server, no CDN)
open tend.html
node test/tend.mjs          # the science, headless, derivation first (~90 s)
node tools/tend_shot.mjs shots 'Cathedral Fern' 21 900   # the experiments, photographed
node tools/tend_replay.mjs  # a shared link regrows the same plant, bit for bit
```

## The three experiments

| year | who | instrument | what the engine does |
|---|---|---|---|
| 1880 | Charles and Francis Darwin | **Lamp** | living tips steer to where gravity's pull and the light's balance: `normalize(up + k·toward_lamp)`, the exact equilibrium of additive sine laws, with k = photoGain·I^0.4 |
| 1928 | Frits Went | the glow itself | every living tip's auxin drawn as motes running rootward at polar-transport speed |
| 1933 | Kenneth Thimann and Folke Skoog | **Shears** | the stream below a cut drains; the buds it was holding come free as the drain passes them, race, and the first to commit puts the rest back to sleep |
| 1933 | the same, the control | **Auxin** | the stump becomes a source again, and the buds stay asleep until it is taken away |

The history is checked against primary sources in
[docs/research_9_22_26_tend.md](../docs/research_9_22_26_tend.md). Two corrections
from it are on the page: Thimann & Skoog put the hormone back in **agar blocks**,
renewed every six hours, not in lanolin (that came later); and their buds grew "as
soon as the application ... was stopped", so taking the auxin away is part of the
original experiment, not an addition.

## What you are looking at

- **The motes are the stream, not an effect.** Each living tip, each freed bud and
  each dressed stump sends motes rootward at `patV` — the measured 6.6× the stem's
  own growth rate (Kramer 2011) — fading over `dominance`, and a mote exists only if
  its source was on when it left. After a cut, the last mote to pass the cut is the
  tail of the stream, and you watch it run down past the buds. That is
  `Axis.streamAt` drawn, component by component.
- **The dots at every leaf axil are buds.** Dim: held asleep by the stream. Bright
  and pulsing: freed, making their own auxin, racing. Gone: grown out into a shoot.
  Faint: let go, not growing.
- **Numbers on the page are measured, never written.** "The drain freed 17 of the 17
  buds the tip was holding. One grew out, the first 1 cm below the cut, about 2 days
  after it, and put 16 back to sleep" is computed off the plant, and the population
  is the buds the stream was holding at the moment of the cut — never the plant's
  ordinary branching.

## The clock

Development here is compressed about ten thousand times against physical time, and
the drain is what says by how much: the front runs at `patV` world units a step, a
real one at about a centimetre an hour (Morris et al. 2005), so a step is about an
hour of a plant's life and one second on screen is about five days. The page
reports every interval in those plant hours. For a moment after each cut the page
also slows the clock, because at 1x the drain crosses a whole plant in a second —
and it says so when it does. The simulation does not know: it is the same steps,
fewer per frame.

## Share

A tended plant is a seed and a list of what was done to it, and the engine is
deterministic, so **share** copies a link that regrows your exact plant in front of
whoever opens it — every cut at the step it was made, the auxin on and off, the
lamp where you held it. No geometry travels; the record is typically a few hundred
characters, deflated into the URL's fragment. The lamp is the one thing that needed
care: the pointer moves between frames, so the plant grows toward a committed copy
of the lamp that moves in logged, quantised steps. `tools/tend_replay.mjs` checks a
live session against its own link, every stem point at the same step.

## What it does not do

Said plainly, because the literature is precise about each:

- **The first flush after a cut is sugar, not auxin**, and is not modelled. In a
  real pea, buds 40 cm below a cut start growing within hours, before any auxin
  front could reach them. What auxin decides — and what this shows — is which freed
  bud commits and which goes back to sleep, from about a day on.
- **The lamp steers the tip; it does not bend the stem.** Real stems curve their
  whole growth zone and straighten from the tip down (Bastien et al. 2013). The
  engine's gravitropism has always steered the tip too. The stem that results is a
  record of where the light was while it grew.
- **A lower branch cannot hold back an upper one**, which real ones can (Ongaro
  2008): the stream only flows rootward.
- **How far one tip's hold reaches is a dial.** Nobody has measured how inhibition
  falls with distance, and the one measurement there is (Snow 1931) found it rising.
  The bench grows its plants with a long reach so that a cut is legible.

## How it is built

`tend/build.js` concatenates the engine (`src/`, minus the main page's wiring) with
`tend/*.js` into one scope, checks it for duplicate names and parses it before
writing, like the other two pages. The page draws with the shipped renderer and the
shipped `drawSpecimen`; the only additions to `src/` are the stream, the three bud
states, the cut, the paste and the lamp in `40_plant.js` (all off unless a page asks
for them), a `stemGlow` hook in `drawSpecimen`, and a `program` hook in
`makeSpecimen`. Every uncut specimen on the other pages is bit-identical to before.

- `10_program.js` — the program a specimen is grown under here, the species offered,
  and the words the page uses
- `20_bench.js` — `TendApp`: the camera, picking, the instruments, the falling
  cutting, the motes and buds, the measurements, and the record
- `30_page.js` — the page: the dock, the timeline, the readout, share, the loop
- `template.html` — the layout and its two kinds of light: the plant's own vein
  colour for everything, and the lamp's amber for the lamp alone

URL parameters: `?species=`, `?seed=`, `?ff=` (grow this many steps first),
`?speed=0|0.5|1|2`, `?tool=look|lamp|shears|paste`, `?lamp=x,y,z`, `?clean` (the
plant and nothing else, for recording), and `#r=` (a shared record).
