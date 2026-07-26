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

`test/smoke.mjs` is the only harness that asserts, and it is the CI gate. Its checks
are deliberately loose — it verifies that the chemistry is alive and finite, not
that any emergent quantity has a particular value. Pinning down divergence angles or
petal counts in a test would quietly convert an emergent result into an imposed one.

Everything else in `test/` is a **diagnostic instrument**: it prints numbers and
ASCII renderings and always exits 0. You read the output; it does not pass or fail.

```bash
node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'   # is the tissue patterning at all?
node test/phyllo.mjs                               # divergence angle statistics
node test/margin.mjs                               # leaf outline, ASCII silhouette
node test/fruit.mjs                                # fruits, ASCII radius map
node test/flower2.mjs                              # full life cycle incl. axillary flowers
node test/species.mjs                              # grow all eight species, print what each does
node test/senesce.mjs                              # a dying blade, drawn: ASCII map of what still holds colour
```

`CLAUDE.md` lists the full set — there are fifteen of them, plus two archived
experiments kept so their falsified results stay reproducible.

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
