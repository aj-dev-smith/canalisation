#!/bin/bash
# Drop this folder into ~/Code and run: bash SETUP.sh
set -e
git init -q
git add -A
git commit -q -m "Canalisation: a xenobotany engine grown from auxin transport

A real-time simulation of auxin, the plant hormone that determines where organs
form. Leaf arrangement, vein networks, leaf outlines, petal counts, fruit lobing
and ripening all emerge from the chemistry. Nothing about the shape is drawn.

Built with Claude Opus 5. See CLAUDE.md and docs/ for the full handover."
echo "Repo initialised. Now: npm i -D playwright (optional, for headless capture)"
echo "Then: node build.js && open canalisation.html"
