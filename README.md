# Canalisation

A plant grown from its own chemistry — a real-time browser simulation of **auxin**,
the hormone that tells plant cells where to become things. Leaf arrangement, vein
networks, leaf silhouettes, petal number, fruit lobing, ripening — and when a
specimen is finished — all fall out of the transport equations.

**Nothing about the plant's shape is drawn.** No shape code, no outlines, no curves,
no counts. That is the whole claim, and it is the one thing this project will not
trade away.

```bash
git clone https://github.com/aj-dev-smith/canalisation
cd canalisation
node build.js && open canalisation.html
```

No server, no dependencies, no build toolchain. Node 18+ to run `build.js`, a
browser with WebGL2 to watch it. `canalisation.html` is a single self-contained
file — you can open the committed one directly without building.

## What emerges

Every one of these is a consequence of the chemistry, not a parameter:

- **Phyllotaxis** — where each leaf goes around the stem, and the angle between them
- **Vein networks** — midrib, secondaries and reticulation, by auxin canalisation
- **Leaf outlines** — including teeth and lobes, grown from margin convergence points
- **Petal number** — nobody tells it five
- **Fruit lobing** and the ripening wave across the surface
- **The end of a life** — a specimen runs out of growing points, drains each blade
  into its own veins and drops them, leaving a standing seed head. Nothing
  schedules that; it falls out of how much leaf the plant managed to build

The complete list of spatial priors that *are* imposed lives in
[docs/SCIENCE.md](docs/SCIENCE.md) under "What is imposed". It is short on purpose.
Adding to it is a real cost.

## Known limitations

Read this before opening an issue about it:

**Phyllotaxis is ordered but does not lock to the golden angle.** Divergence wanders
90–160° with a standard deviation of 80–100°, rather than settling at 137.5°. Two
hypotheses for why were tested with controlled sweeps and both were falsified —
the write-ups are in [docs/JOURNAL.md](docs/JOURNAL.md).

This is a real, diagnosed limitation, not a bug awaiting a patch. **Pull requests
that force 137.5° with a fudge factor will be declined**, however well they make it
look. Displaying the honestly measured number, spread and all, is the point of the
piece. A structural mechanism that tightens the angle on its own is very welcome —
see idea #3 in [docs/ROADMAP.md](docs/ROADMAP.md).

## How it works

`stepAuxin()` in [src/10_auxin.js](src/10_auxin.js) is the entire thesis. It runs on
**any** topology — a growing 2D cell sheet, a 1D chain, an icosphere. The meristem,
the leaf margin, leaf venation and the fruit are all that same solver on different
geometry with different boundary conditions.

```
src/00_math.js      vec3/mat4, seeded PRNG, smoothstep
src/10_auxin.js     THE ENGINE. CellField + stepAuxin(). Everything else is geometry
src/20_meristem.js  growing tip: dividing cell sheet, organ initiation, divergence
src/25_margin.js    leaf outline grown from margin convergence points
src/30_leaf.js      blade: interior lattice, vein canalisation, bake
src/35_fruit.js     ovary wall as icosphere shell; ovules, swelling, ripening
src/40_plant.js     the organism: axes, branching, florigen, fruit set, senescence
src/50_geom.js      simulation state -> triangles, ribbons, points
src/60_render.js    WebGL2: forward pass, sway, bloom, depth of field, grade
src/70_app.js       species presets, camera director, scene assembly
src/80_main.js      UI wiring
```

Sources are numbered so that concatenation order is dependency order.
`canalisation.html` is a **build artifact** — never edit it by hand.

## Testing

The simulation is tested headlessly in Node, no browser required. These harnesses
print numbers and ASCII renderings in seconds, where a visual check takes minutes
and cannot tell a rendering bug from a simulation bug.

```bash
node test/smoke.mjs                                # invariants; the CI gate
node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'   # is the tissue patterning at all?
node test/phyllo.mjs                               # divergence angle statistics
node test/margin.mjs                               # grow a leaf outline, ASCII silhouette
node test/fruit.mjs                                # grow fruits, ASCII radius map
node test/flower2.mjs                              # full life cycle incl. axillary flowers
node test/senesce.mjs                              # a dying blade, drawn: ASCII map of what still holds colour
```

Only `smoke.mjs` asserts. The rest are diagnostic instruments — you read their
output, they do not pass or fail.

## Documentation

| Doc | What's in it |
|---|---|
| [docs/SCIENCE.md](docs/SCIENCE.md) | The biology, the papers, what emerges vs what is imposed |
| [docs/TUNING.md](docs/TUNING.md) | Hard-won parameter regimes. **Read before touching any constant** |
| [docs/PITFALLS.md](docs/PITFALLS.md) | Bugs that cost hours, several of which will bite you again |
| [docs/JOURNAL.md](docs/JOURNAL.md) | Negative results, design forks and why they went the way they did |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What is unfinished, ranked |

[CLAUDE.md](CLAUDE.md) is the orientation file for AI coding agents working in this
repo. It is a condensed version of the above and is kept in sync with it.

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
[docs/ROADMAP.md](docs/ROADMAP.md) is the ranked list of what is actually worth
doing next, if you want somewhere to start.

## License

[MIT](LICENSE). Take it and do whatever you like with it.

## Colophon

Built by AJ Smith with Claude Opus 5. The `docs/` directory is a genuine research
record, including the experiments that did not work.
