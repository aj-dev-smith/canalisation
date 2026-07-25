# Canalisation — a xenobotany engine

A plant grown by simulating **auxin**, the hormone that tells plant cells where to
become things. Runs in real time in a browser. One rule governs the whole project:

> **Nothing about the plant's shape is drawn.** No shape code, no outlines, no
> curves, no counts. Every form — where leaves go, the angle between them, the
> vein networks, the leaf silhouettes, petal number, fruit lobing — falls out of
> chemistry. If you find yourself writing a shape, you have taken a wrong turn.

The only spatial priors in the entire codebase are documented in
[docs/SCIENCE.md](docs/SCIENCE.md) under "What is imposed". Keep that list short.
Adding to it is a real cost and should be argued for, not slipped in.

## Read these before changing anything

| Doc | Why |
|---|---|
| [docs/SCIENCE.md](docs/SCIENCE.md) | The biology, the papers, what emerges vs what is imposed |
| [docs/TUNING.md](docs/TUNING.md) | Hard-won parameter regimes. **Read before touching any constant.** Hours of sweeps live here |
| [docs/PITFALLS.md](docs/PITFALLS.md) | Bugs that cost hours. Several will bite you again if you do not know them |
| [docs/JOURNAL.md](docs/JOURNAL.md) | Negative results, design forks and why they went the way they did |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What is unfinished, ranked, with my recommendation |

## Build and run

```bash
node build.js            # concatenates src/*.js into canalisation.html
open canalisation.html   # no server needed, no dependencies
```

`canalisation.html` is a **build artifact** — never edit it. Source is `src/`,
numbered so the concatenation order is the dependency order. `build.js` strips
`import`/`export` and warns about duplicate top-level declarations (the bundle is
one shared scope — name collisions are silent otherwise and cost a debugging cycle).

Tests are headless Node, no browser:

```bash
node test/smoke.mjs                                # structural invariants; the CI gate
node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'   # is the tissue patterning at all?
node test/phyllo.mjs                               # divergence angle stats
node test/margin.mjs                               # grow a leaf outline, ASCII silhouette
node test/fruit.mjs                                # grow fruits, ASCII radius map
node test/flower2.mjs                              # full life cycle incl. axillary flowers
node test/vein.mjs                                 # vein network + hierarchy ratios, ASCII
node test/species.mjs                              # grow every species, print what each one does
```

**Always test the science headlessly before touching the renderer.** A visual bug
and a simulation bug look identical on screen, and the headless harnesses give you
numbers in seconds instead of minutes.

## Branching

`main` is protected and is never committed to directly. **Every change goes on a
feature branch and lands through a pull request**, including your own — the point
is that CI has run and the reasoning is written down somewhere other than a commit
message.

```bash
git switch main && git pull
git switch -c short-descriptive-name    # leaf-vein-hierarchy, not fix-stuff
# ... work, then before opening the PR:
node build.js && node test/smoke.mjs
```

- Branch off `main`, one concern per branch.
- **Commit the regenerated `canalisation.html` with the source change that caused
  it.** CI fails the PR if the artifact is stale. It is also the file most likely
  to conflict, since it is a 150kb generated blob — if it does, do not hand-merge
  it. Take either side and re-run `node build.js`.
- If a branch touches the simulation, put the before/after numbers from the `test/`
  harnesses in the PR body. That is the review currency here, not screenshots.
- Long-lived branches drift badly against a generated artifact. Rebase on `main`
  often, or keep them short.

[CONTRIBUTING.md](CONTRIBUTING.md) is the outward-facing version of this for people
arriving from GitHub, and it leads with the one rule above.

## Architecture

```
src/00_math.js      vec3/mat4, seeded PRNG (mulberry32), smoothstep
src/10_auxin.js     THE ENGINE. CellField + stepAuxin(). Everything else is geometry
src/20_meristem.js  growing tip: dividing cell sheet, organ initiation, divergence measurement
src/25_margin.js    leaf outline grown from margin convergence points
src/30_leaf.js      blade: interior lattice, vein canalisation, bake
src/35_fruit.js     ovary wall as icosphere shell; ovule placement, swelling, ripening wave
src/40_plant.js     the organism: axes, internode elongation, branching, florigen, fruit set
src/50_geom.js      simulation state -> triangles, ribbons, points
src/60_render.js    WebGL2: forward pass, sway, bloom, depth of field, grade
src/70_app.js       species presets, camera director, scene assembly
src/80_main.js      UI wiring
```

`stepAuxin()` in `10_auxin.js` is the whole thesis. It runs on **any** topology —
a growing 2D sheet, a 1D chain, an icosphere. Meristem, leaf margin, leaf venation
and fruit are all the same solver on different geometry with different boundary
conditions. **When adding an organ, reach for that function before writing anything new.**

## Working style that paid off here

- **Science first, pixels second.** Prove a mechanism in a headless harness before rendering it.
- **Assert on every string edit.** Silent no-op replacements bit three times in one session; one was the difference between a lobed fruit and a perfect sphere. If editing by script, assert the anchor exists, and write the file only after all edits succeed.
- **Report negative results honestly.** Two hypotheses about phyllotaxis were tested and falsified. That is in [docs/JOURNAL.md](docs/JOURNAL.md) and it is more useful than a success would have been.
- **Never fake it to make it look better.** The piece's entire claim is that nothing is drawn. A single hardcoded curve would make the whole thing a lie.

## The honest state of it

It grows, flowers and fruits. Phyllotaxis is **ordered but does not lock to the
golden angle** — it wanders 90–160°. That is a real limitation with a diagnosis,
not a bug to be papered over; see [docs/JOURNAL.md](docs/JOURNAL.md). Do not add a
fudge factor to force 137.5°. Displaying the real measured number, spread and all,
is the point.
