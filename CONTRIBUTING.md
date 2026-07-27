# Contributing

Contributions are welcome. This file is short, but the first section is not
negotiable and is the reason most declined PRs get declined.

## The one rule

> **Nothing about the plant's shape is drawn.** No shape code, no outlines, no
> curves, no counts. Every form — where leaves go, the angle between them, the vein
> networks, the leaf silhouettes, petal number, fruit lobing — falls out of
> chemistry. If you find yourself writing a shape, you have taken a wrong turn.

The full list of spatial priors that *are* imposed is in
[docs/SCIENCE.md](docs/SCIENCE.md) under "What is imposed". It is short on purpose.
**Adding to that list is a real cost and has to be argued for in the PR, not slipped
in.** A change that makes the plant look better by telling it what to look like
makes the project a lie, and will be declined however good the screenshot is.

The most common version of this: **do not add a fudge factor to force the
divergence angle to 137.5°.** See "Known limitations" in the [README](README.md)
and the falsified-hypothesis write-ups in [docs/JOURNAL.md](docs/JOURNAL.md). A
*structural* mechanism that tightens the angle on its own is a genuinely exciting
contribution — that is roadmap item #3.

## The second category: environment is not shape

Some of the code is not the auxin solver and is not supposed to be. The wind field
(`37_wind.js`), the bending stems (`39a_stem.js`) and the falling blade
(`39_fall.js`) are **physics the plant is subject to**, not chemistry the plant does.
The one rule is about shape, and none of that describes a shape — so far it has only
ever *removed* stated constants, which is the direction to keep it pointing.

The bar in that category is different but not lower:

- **Every number is physical, cited, or measured off something the plant grew.** Not
  chosen because it looked right. Gravity, air density, von Kármán's constant, a
  roughness length off a standard table, leaf mass per area off a real one.
- **Work the number out before you write the solver.** The stem's frequencies were
  computed analytically for all eight species first, and that pre-flight caught three
  separate bugs in the solver that were invisible on screen. `docs/ROADMAP.md` has
  the table.
- **A borrowed model brings assumptions, including about the dimension you are not
  solving.** The plate aerodynamics was solving an infinitely long plate while a leaf
  is a stub, which over-predicted lift roughly twofold.
- `docs/TUNING.md`'s sections on the fall and the stem are the *opposite* of the rest
  of that file, and say so at the top. There is nothing there to sweep for appearance.

**The one exception, and it is exactly one.** `uRef`, how hard the wind is blowing, is
a composition choice: everything downstream of it is derived from it, so a wrong value
cannot make the physics wrong, only put the scene in the wrong weather. It is cited to
a Beaufort band and it is a slider in the page. If you find yourself arguing that a
second constant deserves the same latitude, that is the point to open an issue instead
of a PR.

## Licensing of contributions

Inbound is outbound: **contributions you submit are licensed under the
[MIT License](LICENSE)**, the same terms as the project. There is no CLA to sign.
By opening a pull request you confirm you have the right to license the work that
way.

## Before you change anything

| Doc | Why |
|---|---|
| [docs/SCIENCE.md](docs/SCIENCE.md) | The biology, the papers, what emerges vs what is imposed |
| [docs/TUNING.md](docs/TUNING.md) | Hard-won parameter regimes. **Read before touching any constant.** Hours of sweeps live here |
| [docs/PITFALLS.md](docs/PITFALLS.md) | Bugs that cost hours. Several will bite you again if you do not know them |
| [docs/JOURNAL.md](docs/JOURNAL.md) | Negative results and design forks, with reasoning |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What is unfinished, ranked — a good place to find work |

## Workflow

```bash
node build.js        # regenerate canalisation.html from src/
node test/smoke.mjs  # invariants; must pass
open canalisation.html
```

1. Fork, and branch off `main`.
2. Make your change in `src/` — **never** in `canalisation.html`.
3. **Test the science headlessly before you look at pixels.** A visual bug and a
   simulation bug look identical on screen; the harnesses in `test/` give you
   numbers in seconds instead of minutes.
4. Run `node build.js` and commit the regenerated `canalisation.html` along with
   your source change. CI fails if the two are out of sync.
5. Open a PR against `main`.

## Testing

`test/smoke.mjs` is the CI gate. Its checks are deliberately loose — it verifies that
the chemistry is alive and finite, not that any emergent quantity has a particular
value. Pinning down divergence angles or petal counts in a test would quietly convert
an emergent result into an imposed one.

**`test/wind.mjs` and `test/stem.mjs` also assert and exit non-zero**, and that is the
second category above: a physical claim can be checked against a number worked out
beforehand, so it gets a real assertion. `test/stem.mjs` compares the solver's
eigenvalue, a stopwatch on a ringdown, and an analytic pre-flight computed before the
solver existed. Run it before and after any change to the beam.

Everything else in `test/` is a **diagnostic instrument**: it prints numbers and
ASCII renderings and always exits 0. You read the output; it does not pass or fail.

Two things cannot be checked in Node at all and live in `tools/`, which drives a real
browser: whether the emitted shader agrees with the simulation on a GPU
(`wind_check.mjs`), and what frequencies the drawn scene is actually moving at
(`jitter.mjs`). Run the second after anything that touches the air, the stem or the
petiole — **a green harness is a statement about internal consistency, not about
whether the answer resembles the thing being modelled.** The wind field passed all
twenty-four of its own assertions while every gust mode sat between 3.9 and 19.3 Hz,
which is not weather, and the first person to *watch* it said so immediately.

```bash
node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'   # is the tissue patterning at all?
node test/phyllo.mjs                               # divergence angle statistics
node test/margin.mjs                               # leaf outline, ASCII silhouette
node test/fruit.mjs                                # fruits, ASCII radius map
node test/flower2.mjs                              # full life cycle incl. axillary flowers
node test/species.mjs                              # grow all eight species, print what each does
node test/senesce.mjs                              # a dying blade, drawn: ASCII map of what still holds colour
node test/fall.mjs                                 # a shed blade: is the fall a falling plate?
```

`CLAUDE.md` lists the full set — there are eighteen of them, plus archived
experiments kept runnable so their falsified results stay reproducible. **A negative
result you cannot re-measure is just a story**, which is why `38_shoot.js` and
`FALL_DEFAULTS.tiltPlane` are in the tree and switched off rather than deleted. Do
not mistake either for live code.

If your change touches the simulation, **paste the relevant before/after numbers in
the PR.** That is the review currency here, far more than a screenshot.

## Source layout

`src/` is numbered so that concatenation order is dependency order — `build.js`
concatenates the files, strips `import`/`export`, warns about duplicate top-level
declarations, and then compiles the bundle before writing it, exiting non-zero if
it does not parse. The bundle is **one shared scope**, so a name collision between
two files is otherwise silent: it used to only warn, and a collision that the
warning missed once shipped a page that was a `SyntaxError` while the CI gate
passed. Heed the warning, and if the build refuses to write, read the message.

`stepAuxin()` in [src/10_auxin.js](src/10_auxin.js) runs on any topology — a growing
2D sheet, a 1D chain, an icosphere. Meristem, leaf margin, leaf venation and fruit
are all that same solver with different geometry and boundary conditions.
**If you are adding an organ, reach for that function before writing anything new.**

## Things that make a PR easy to accept

- One concern per PR.
- Numbers from the headless harnesses, before and after.
- A note in [docs/JOURNAL.md](docs/JOURNAL.md) if you tried something and it did not
  work. Negative results are genuinely valued here — two falsified phyllotaxis
  hypotheses and four falsified senescence ones are recorded there, with their
  numbers, and they are more useful than the successes would have been.
- If you changed a constant, say which regime in [docs/TUNING.md](docs/TUNING.md)
  you were moving between and why.

## Reporting bugs

Include your browser and GPU for rendering issues. For simulation issues, the
output of the relevant `test/` harness is worth far more than a description — and
please include the seed, since almost everything here is seeded and reproducible.
