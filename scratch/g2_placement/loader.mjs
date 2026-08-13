// shared loader: the flowers bundle in plain Node (copied from test/flowers_capture.mjs)
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
export const root = join(here, '..', '..');
const strip = (s) => s
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s+/gm, '');

let code = '';
const SRC_SKIP = new Set(['60_render.js', '80_main.js']);
for (const f of readdirSync(join(root, 'src')).filter(f => f.endsWith('.js') && !SRC_SKIP.has(f)).sort())
  code += strip(readFileSync(join(root, 'src', f), 'utf8')) + '\n';
for (const f of ['10_capture.js', '12_form.js', '15_petal.js', '17_spots.js', '20_draw.js', '35_garden.js'])
  code += strip(readFileSync(join(root, 'flowers', f), 'utf8')) + '\n';
code += '\nreturn { App, Buffers, FlowerBuffers, flEnv, flDrawSpecimen, SPECIES, setView, v3,' +
  ' flGardenPlan, flApplyForm, FL_FORMS, FL_GARDEN_SPACING, FL_GARDEN_STAGGER, mulberry32 };\n';

export const M = new Function(code)();
