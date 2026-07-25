# Capture tools (headless Playwright)

`npm i -D playwright` first. These render the page offscreen and screenshot it.
Software rendering runs ~16fps — fine for verifying geometry and catching errors,
**useless for judging motion**. Use a real browser for that.

- `shot.mjs out.png <waitMs> [jsToEval]` — one capture plus a state dump
- `multi.mjs` — all four species, desktop and mobile viewports
- `closer.mjs` — flies to the apex and captures the cell-level view
- `fruit_shot.mjs` — runs at speed until a fruit sets, then captures
- `sway.mjs` — pixel-diffs two frames to prove the sway field animates
