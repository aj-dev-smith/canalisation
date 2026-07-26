import { readFileSync, writeFileSync, readdirSync } from 'fs';
const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();
let out = '';
for (const f of files) {
  let s = readFileSync('src/' + f, 'utf8');
  s = s.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  s = s.replace(/^export\s+/gm, '');
  out += `\n// ===================== ${f} =====================\n` + s;
}
// ...and still name the duplicate, because "already been declared" alone does
// not say which file the other one is in.
//
// Every declarator, not just the head of the list: `const _c0 = v3(), _sc = v3()`
// declares two names and only the first was ever checked, which is exactly how a
// collision got into a bundle that this script then reported as built. Commas
// inside a call do not declare anything, hence the depth count. Destructuring is
// not handled and is not used in src/.
const seen = new Map();
for (const line of out.split('\n')) {
  const m = line.match(/^(?:(?:const|let)\s+(.*)|(?:class|function)\s+([A-Za-z_$][\w$]*))/);
  if (!m) continue;
  const names = [];
  if (m[2]) names.push(m[2]);
  else {
    let depth = 0, start = 0;
    for (let i = 0; i <= m[1].length; i++) {
      const ch = m[1][i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (i === m[1].length || (ch === ',' && depth === 0)) {
        const d = m[1].slice(start, i).match(/^\s*([A-Za-z_$][\w$]*)/);
        if (d) names.push(d[1]);
        start = i + 1;
      }
    }
  }
  for (const n of names) {
    if (seen.has(n)) console.warn('DUPLICATE TOP-LEVEL:', n);
    seen.set(n, true);
  }
}
// The bundle is one shared scope, so a name used twice is a SyntaxError and the
// page is simply dead. Ask the engine, rather than a regex, whether what we just
// wrote is a program at all — this is compiled, never called, so the browser
// globals it refers to do not have to exist.
try {
  new Function(out);
} catch (e) {
  console.error('BUNDLE DOES NOT PARSE:', e.message);
  console.error('canalisation.html was NOT written.');
  process.exit(1);
}

const tpl = readFileSync('template.html', 'utf8');
writeFileSync('canalisation.html', tpl.replace('/* __BUNDLE__ */', out));
console.log('built canalisation.html', (out.length / 1024).toFixed(1) + 'kb js');
