// ---------------------------------------------------------------------------
// The page: four instruments, the experiments in the order they were done, a
// readout of the specimen as measured, and the loop.
//
// URL parameters, for people and for the capture tools alike:
//   ?species=Ember%20Creeper  ?seed=21   which plant
//   ?ff=600                   grow this many steps before the first frame
//   ?speed=0|0.5|1|2          the clock
//   ?tool=look|lamp|shears|paste
//   ?lamp=x,y,z               a lamp already lit, in world units
// ---------------------------------------------------------------------------

const tbEl = (id) => document.getElementById(id);
let tbApp;
try {
  tbApp = new TendApp(tbEl('c'));
} catch (e) {
  tbEl('fatal').style.display = 'block';
  tbEl('fatal').textContent = 'Could not start: ' + e.message;
  throw e;
}
window.__tend = tbApp;
// the capture tools in tools/ drive `window.__app`; this page answers to it too
window.__app = tbApp;
window.__TEND = { TEND_SPECIES, TEND_EXPERIMENTS, tendProgram };

const tbQ = new URLSearchParams(location.search);
const tbRgb = (c, k = 1) => 'rgb(' + c.map(v => Math.round(Math.min(1, v * k) * 255)).join(',') + ')';

// --- the specimen ----------------------------------------------------------
function tbGrow(name, seed) {
  tbApp.newSpecimen(name, seed);
  // a bench opens on a seedling that is already up, not on bare soil
  const ff = Math.max(0, Math.min(4000, +(tbQ.get('ff') || 260) | 0));
  for (let i = 0; i < ff; i++) tbApp.plant.step(1);
  tbApp.age = ff;
  tbApp.bbS = null;
  tbApp.startLog(ff);
  document.documentElement.style.setProperty('--accent', tbRgb(tbApp.pal.vein, 0.95));
  for (const b of document.querySelectorAll('.chip')) b.classList.toggle('on', b.dataset.name === name);
  tbSyncCard(true);
}

// --- the instruments -------------------------------------------------------
function tbSetTool(tool) {
  if (!TEND_TOOLS[tool]) return;
  // pressing the lamp while it is already in hand puts it out, or lights it
  if (tool === 'lamp' && tbApp.tool === 'lamp') {
    tbApp.setLamp(!tbApp.lamp.on);
    if (tbApp.lamp.on && !tbApp._placed) tbApp.moveLamp(innerWidth * 0.72, innerHeight * 0.38, true);
    tbSay(tbApp.lamp.on ? 'The lamp is lit.' : 'The lamp is out.');
  }
  tbApp.tool = tool;
  tbApp.hover = null; tbApp.hoverStump = null;
  document.body.dataset.tool = tool;
  for (const b of document.querySelectorAll('.tool')) {
    const on = b.dataset.tool === tool;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  tbEl('hint').textContent = TEND_TOOLS[tool].hint;
  for (const li of document.querySelectorAll('.exp')) {
    const ex = TEND_EXPERIMENTS.find(e => e.key === li.dataset.key);
    const on = ex.tool === tool;
    li.classList.toggle('on', on);
    if (on) li.classList.add('open');
  }
}
for (const b of document.querySelectorAll('.tool')) b.onclick = () => tbSetTool(b.dataset.tool);

// --- the experiments, as a timeline ----------------------------------------
const tbList = tbEl('exps');
for (const ex of TEND_EXPERIMENTS) {
  const li = document.createElement('li');
  li.className = 'exp' + (ex.key === 'stream' ? ' open' : '');
  li.dataset.key = ex.key;
  li.tabIndex = 0;
  li.innerHTML = `<span class="yr">${ex.year}</span><h2></h2><p class="story"></p><div class="res"></div>`;
  li.querySelector('h2').textContent = ex.title;
  li.querySelector('.story').textContent = ex.story;
  if (ex.key === 'stream') {
    const sw = document.createElement('button');
    sw.className = 'btn on sw';
    sw.id = 'streamSw';
    sw.textContent = 'auxin shown';
    sw.onclick = (e) => { e.stopPropagation(); tbToggleStream(); };
    li.appendChild(sw);
  }
  const act = () => {
    if (ex.tool) tbSetTool(ex.tool);
    li.classList.toggle('open', ex.tool ? true : !li.classList.contains('open'));
  };
  li.onclick = act;
  li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
  tbList.appendChild(li);
}
function tbToggleStream() {
  tbApp.showStream = !tbApp.showStream;
  tbEl('streamBtn').classList.toggle('on', tbApp.showStream);
  const sw = tbEl('streamSw');
  if (sw) { sw.classList.toggle('on', tbApp.showStream); sw.textContent = tbApp.showStream ? 'auxin shown' : 'auxin hidden'; }
}
tbEl('streamBtn').onclick = tbToggleStream;

// --- what just happened ----------------------------------------------------
let tbSayT = 0;
function tbSay(text) {
  const el = tbEl('say');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(tbSayT);
  tbSayT = setTimeout(() => el.classList.remove('on'), Math.min(7000, Math.max(2600, text.length * 45)));
}
let tbBudSaidAt = -1e9, tbFreeSaidAt = -1e9;
tbApp.onEvent = (kind, d) => {
  if (kind === 'cut') tbSay('Cut. Watch the last of the auxin run down past the buds — slowed so you can see it.');
  else if (kind === 'cutpaste') tbSay('Cut, and auxin put back on the cut. The stump is a source again, as if the tip were still there.');
  else if (kind === 'paste') tbSay('Auxin back on the stump. It is a source again, as if the tip were still there.');
  else if (kind === 'wipe') tbSay('Taken away. The last of that auxin is on its way down the stem.');
  else if (kind === 'nostump') tbSay('Click a stem to cut it and put auxin on the cut, or click a dressed stump.');
  else if (kind === 'free' && tbApp.t - tbFreeSaidAt > 4000) { tbFreeSaidAt = tbApp.t; tbSay('The drain has reached the buds. They are free — and racing each other.'); }
  else if (kind === 'replayed') tbSay('That is the plant as it was sent. It is yours now — carry on tending it.');
  else if (kind === 'bud' && tbApp.t - tbBudSaidAt > 1500) { tbBudSaidAt = tbApp.t; tbSay('A bud grew out. Its own auxin now holds the ones below it.'); }
};

// --- the readout -----------------------------------------------------------
let tbCardAt = 0;
function tbSyncCard(force) {
  const now = performance.now();
  if (!force && now - tbCardAt < 250) return;
  tbCardAt = now;
  const P = tbApp.plant, sp = tbApp.sp, t = P.time;
  let leaves = 0, tips = 0, held = 0, free = 0, dorm = 0, top = P.origin[1];
  for (const ax of P.axes) {
    if (ax.alive && ax.meristem) tips++;
    for (const p of ax.pts) if (p[1] > top) top = p[1];
    for (const o of ax.organs) {
      if (o.floral || o.shed) continue;
      leaves++;
      if (o.took) continue;
      if (o.freeAt !== undefined && o.stopAt === undefined) free++;
      else if (ax.streamAt(o.birthLen, t, sp) > sp.branching) held++;
      else if (!o.armed) dorm++;
    }
  }
  tbEl('cardName').textContent = tbApp.speciesName;
  tbEl('cardSeed').textContent = 'seed ' + tbApp.seed;
  tbEl('cHeight').textContent = Math.round((top - P.origin[1]) * WORLD.unitM * 100) + ' cm';
  tbEl('cLeaves').textContent = leaves;
  tbEl('cTips').textContent = tips;
  tbEl('cHeld').textContent = held;
  tbEl('cFree').textContent = free;
  tbEl('cDorm').textContent = dorm;
  tbEl('cStage').textContent = P.stage();
  for (const li of document.querySelectorAll('.exp')) {
    const r = tbApp.results[li.dataset.key] || '';
    const el = li.querySelector('.res');
    if (el.textContent !== r) el.textContent = r;
  }
}

// --- share: a link that regrows this plant ---------------------------------
// The record is a seed and what was done to it (see `TendApp.startLog`), packed
// into the URL's fragment, so nothing leaves the browser that the person does
// not paste somewhere themselves. Deflated where the browser can, plain where it
// cannot; either way it is text the page parses and checks, never code.
const tbB64 = {
  enc(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
};
async function tbPack(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'undefined') return 'j' + tbB64.enc(raw);
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  return 'z' + tbB64.enc(z);
}
async function tbUnpack(str) {
  const kind = str[0], bytes = tbB64.dec(str.slice(1));
  let raw = bytes;
  if (kind === 'z') raw = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  else if (kind !== 'j') throw new Error('unknown record');
  return JSON.parse(new TextDecoder().decode(raw));
}
// A record from a URL is untrusted input: every field is checked, every number
// finite and bounded, and a record that would take the page more than a few
// seconds to regrow is refused rather than run.
function tbValid(r) {
  if (!r || r.v !== 1 || TEND_SPECIES.indexOf(r.sp) < 0) return null;
  const seed = r.seed >>> 0, ff = Math.max(0, Math.min(4000, r.ff | 0));
  if (!Array.isArray(r.a) || r.a.length > 6000) return null;
  const a = [];
  for (const x of r.a) {
    if (!Array.isArray(x) || typeof x[0] !== 'string' || !Number.isFinite(x[1])) return null;
    const t = x[1] | 0;
    if (t < 0 || t > 20000) return null;
    if (x[0] === 'c' || x[0] === 'C') { if (!Number.isInteger(x[2]) || !Number.isFinite(x[3])) return null; a.push([x[0], t, x[2], +x[3]]); }
    else if (x[0] === 'p' || x[0] === 'w') { if (!Number.isInteger(x[2])) return null; a.push([x[0], t, x[2]]); }
    else if (x[0] === 'L') { if (![x[2], x[3], x[4]].every(Number.isFinite)) return null; a.push(['L', t, +x[2], +x[3], +x[4]]); }
    else if (x[0] === 'o') a.push(['o', t]);
    else return null;
  }
  return { v: 1, sp: r.sp, seed, ff, a };
}
tbEl('shareBtn').onclick = async () => {
  try {
    const url = location.href.split('#')[0].split('?')[0] + '#r=' + await tbPack(tbApp.log);
    await navigator.clipboard.writeText(url);
    tbSay(tbApp.log.a.length
      ? 'Link copied. It regrows this plant from its seed, cut for cut, with the lamp where you held it.'
      : 'Link copied. Nothing has been done to this plant yet — it will grow the same seed untouched.');
  } catch (e) {
    tbSay('Could not copy the link: ' + e.message);
  }
};

// --- species, speed, seed --------------------------------------------------
const tbChips = tbEl('species');
for (const name of TEND_SPECIES) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.dataset.name = name;
  const dot = document.createElement('i');
  dot.style.background = dot.style.color = tbRgb(SPECIES[name].pal.vein);
  b.append(dot, document.createTextNode(name));
  b.onclick = () => tbGrow(name, (Math.random() * 1e6) | 0);
  tbChips.appendChild(b);
}
function tbSetSpeed(v) {
  tbApp.speedMul = v;
  for (const b of document.querySelectorAll('#speed button')) b.classList.toggle('on', +b.dataset.v === v);
}
for (const b of document.querySelectorAll('#speed button')) b.onclick = () => tbSetSpeed(+b.dataset.v);
tbEl('newBtn').onclick = () => tbGrow(tbApp.speciesName, (Math.random() * 1e6) | 0);
tbEl('benchBtn').onclick = () => document.body.classList.toggle('benchOpen');

addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key.toLowerCase();
  if (k === '1') tbSetTool('look');
  else if (k === '2') tbSetTool('lamp');
  else if (k === '3') tbSetTool('shears');
  else if (k === '4') tbSetTool('paste');
  else if (k === 'a') tbToggleStream();
  else if (k === 'n') tbGrow(tbApp.speciesName, (Math.random() * 1e6) | 0);
  else if (k === ' ' && e.target === document.body) { e.preventDefault(); tbSetSpeed(tbApp.speedMul > 0 ? 0 : 1); }
});

// --- boot ------------------------------------------------------------------
{
  const name = tbQ.get('species') || 'Cathedral Fern';
  const seed = tbQ.has('seed') ? (+tbQ.get('seed') >>> 0) : ((Math.random() * 1e6) | 0);
  tbGrow(TEND_SPECIES.indexOf(name) >= 0 ? name : TEND_SPECIES[0], seed);
  if (tbQ.has('speed')) tbSetSpeed(+tbQ.get('speed'));
  if (tbQ.has('lamp')) {
    const v = tbQ.get('lamp').split(',').map(Number);
    if (v.length === 3 && v.every(Number.isFinite)) { v3set(tbApp.lamp.pos, v[0], v[1], v[2]); tbApp.setLamp(true); tbApp._placed = true; }
  }
  tbSetTool(TEND_TOOLS[tbQ.get('tool')] ? tbQ.get('tool') : 'look');
  if (tbQ.has('clean')) document.body.classList.add('clean');
  // a shared record regrows in front of the person it was sent to
  if (location.hash.startsWith('#r=')) {
    tbUnpack(location.hash.slice(3)).then((r) => {
      const log = tbValid(r);
      if (!log) throw new Error('that link does not hold a plant this page can grow');
      tbApp.replay(log);
      document.documentElement.style.setProperty('--accent', tbRgb(tbApp.pal.vein, 0.95));
      for (const b of document.querySelectorAll('.chip')) b.classList.toggle('on', b.dataset.name === log.sp);
      tbSay(`Regrowing a ${log.sp} someone tended — ${log.a.length} thing${log.a.length === 1 ? '' : 's'} done to it.`);
    }).catch((e) => tbSay('Could not regrow that plant: ' + e.message));
  }
  // the first thing to say is what to pick up, not how to turn the camera
  if (!tbQ.has('tool')) tbEl('hint').textContent = 'Pick up the lamp or the shears below. Drag to turn around the plant.';
}

let tbLast = performance.now(), tbFrames = 0, tbFpsT = 0;
function tbLoop(now) {
  const dt = Math.min(64, now - tbLast); tbLast = now;
  tbFrames++; tbFpsT += dt;
  if (tbFpsT > 500) { tbApp.fps = tbFrames * 1000 / tbFpsT; tbFrames = 0; tbFpsT = 0; }
  tbApp.step(dt);
  if (tbApp.fps > 40 || tbApp.frame % 2 === 0) tbApp.buildScene();
  tbApp.frame++;
  tbApp.render();
  tbSyncCard(false);
  requestAnimationFrame(tbLoop);
}
requestAnimationFrame(tbLoop);
addEventListener('resize', () => tbApp.renderer.resize());
