import { readFileSync, writeFileSync, readdirSync } from 'fs';
const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();
let out = '';
for (const f of files) {
  let s = readFileSync('src/' + f, 'utf8');
  s = s.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  s = s.replace(/^export\s+/gm, '');
  out += `\n// ===================== ${f} =====================\n` + s;
}
// catch duplicate top-level declarations across the concatenated modules
const seen = new Map();
for (const m of out.matchAll(/^(?:const|let|class|function)\s+([A-Za-z_$][\w$]*)/gm)) {
  if (seen.has(m[1])) console.warn('DUPLICATE TOP-LEVEL:', m[1]);
  seen.set(m[1], true);
}
const tpl = readFileSync('template.html', 'utf8');
writeFileSync('canalisation.html', tpl.replace('/* __BUNDLE__ */', out));
console.log('built canalisation.html', (out.length / 1024).toFixed(1) + 'kb js');
