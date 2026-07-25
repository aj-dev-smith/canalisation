## What this changes

<!-- One or two sentences. -->

## Does it add a spatial prior?

<!--
The project's one rule: nothing about the plant's shape is drawn. If this PR adds
anything to the "What is imposed" list in docs/SCIENCE.md — a shape, an outline, a
curve, a count, an angle — say so explicitly and argue for it here. That is a real
cost, and an unflagged one is the most common reason a PR is declined.

If it adds nothing, just write "No".
-->

## Numbers

<!--
If this touches the simulation, paste before/after output from the relevant
harness. This is the review currency here — more than a screenshot.

  node test/phyllo.mjs
  node test/pattern.mjs '{"T":40,"D":6}' '{"G":0}'
  node test/margin.mjs
  node test/fruit.mjs
  node test/flower2.mjs
-->

## Checklist

- [ ] Changes are in `src/`, not in `canalisation.html`
- [ ] Ran `node build.js` and committed the regenerated `canalisation.html`
- [ ] `node test/smoke.mjs` passes
- [ ] Read [docs/TUNING.md](../docs/TUNING.md) if I changed a constant
- [ ] Added a note to [docs/JOURNAL.md](../docs/JOURNAL.md) if I tried something that
      did not work (negative results are welcome here)
