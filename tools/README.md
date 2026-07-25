# Capture tools (headless Playwright)

`npm i -D playwright && npx playwright install chromium` first. These render the
page offscreen and screenshot it — **fine for verifying geometry and catching
console errors, useless for judging performance or motion.** Use a real browser
for both.

Do not read the `fps` in the state dump. Repeated identical runs on one machine
gave 15.6, 33.4, 120 and 120.2, because headless chromium sometimes gets a
hardware path and sometimes falls back to software, and the tool cannot tell you
which it got. One run also produced a black frame while still reporting a full
triangle count. Real Chrome on the same machine is a steady 120 (vsync).

They resolve playwright's own chromium rather than a hardcoded path, so they work
on any platform. Both of those were broken until 2026-07-25: the browser path was
a Linux-only absolute path, and the page URL was built with `${process.cwd()}`
inside **single** quotes, so it never interpolated.

- `shot.mjs out.png <waitMs> [jsToEval]` — one capture plus a state dump
- `multi.mjs` — all four species, desktop and mobile viewports
- `closer.mjs` — flies to the apex and captures the cell-level view
- `fruit_shot.mjs` — runs at speed until a fruit sets, then captures
- `sway.mjs` — pixel-diffs two frames to prove the sway field animates
