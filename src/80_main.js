// ---------------------------------------------------------------------------
// wiring
// ---------------------------------------------------------------------------

const canvas = document.getElementById('c');
const $ = (id) => document.getElementById(id);

let app;
try {
  app = new App(canvas, null);
} catch (e) {
  $('fatal').style.display = 'block';
  $('fatal').textContent = 'Could not start: ' + e.message;
  throw e;
}
window.__app = app;

// --- the specimen label ----------------------------------------------------
let lastHud = 0;
const STAGES = ['seedling', 'leafing', 'flowering', 'fruiting', 'ripe'];
function hud(now) {
  if (now - lastHud < 220) return;
  lastHud = now;
  const c = app.plant.card();
  $('cardName').textContent = 'no. ' + app.specimenNo + ' · ' + app.speciesName;
  $('cLeaves').textContent = c.leaves || '—';
  $('cTeeth').textContent = c.teeth || '—';
  $('cFlowers').textContent = c.flowers || '—';
  $('cPetals').textContent = c.petals || '—';
  $('cSeeds').textContent = c.seeds || '—';
  $('cFlowered').textContent = c.floweredAt ? c.floweredAt + ' leaves' : '—';
  $('cDiv').textContent = c.divergence
    ? c.divergence.toFixed(0) + '° ±' + c.divergenceSd.toFixed(0) : '—';
  const st = c.stage;
  for (const el of document.querySelectorAll('#stage span'))
    el.classList.toggle('on', el.dataset.s === st);
  $('fps').textContent = app.fps.toFixed(0);
  $('legend').classList.toggle('on', app.detail > 0.35);
  document.body.classList.toggle('driving', !!app.userDriving);
}

// --- loop ------------------------------------------------------------------
let last = performance.now(), frames = 0, fpsT = 0;
function loop(now) {
  const dt = Math.min(64, now - last); last = now;
  frames++; fpsT += dt;
  if (fpsT > 500) { app.fps = frames * 1000 / fpsT; frames = 0; fpsT = 0; }
  app.step(dt);
  if (app.fps > 42 || app.frame % 2 === 0) app.buildScene();
  app.frame++;
  app.render();
  hud(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- species ---------------------------------------------------------------
// The rail lives in the bottom bar, not behind the controls sheet: the catalogue
// is the first thing worth trying, so it should not need a menu opened first.
const chips = $('species');
const rgb = (c) => 'rgb(' + c.map(v => Math.round(Math.min(1, v) * 255)).join(',') + ')';
for (const name of Object.keys(SPECIES)) {
  const b = document.createElement('button');
  b.className = 'chip' + (name === app.speciesName ? ' on' : '');
  b.title = name;
  // the swatch is the species' own vein colour, read off its palette — the same
  // number the renderer uses, so the chip cannot drift from the plant
  const dot = document.createElement('i');
  dot.style.background = dot.style.color = rgb(SPECIES[name].pal.vein);
  b.append(dot, document.createTextNode(name));
  b.onclick = () => {
    app.newSpecimen(name);
    [...chips.children].forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    b.scrollIntoView({ block: 'nearest', inline: 'center' });
    syncSliders();
    $('regrowBtn').classList.remove('urge');
  };
  chips.appendChild(b);
}
// a fresh specimen of the same species leaves the rail alone; a species change
// is the only thing that moves it
chips.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });

// --- controls that show you their own effect -------------------------------
let tipT = 0;
function showTip(text) {
  const t = $('tip');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(tipT);
  tipT = setTimeout(() => t.classList.remove('on'), 3800);
}

const SLIDERS = [
  ['transport', v => { app.prm.T = v; }, () => app.prm.T, 8, 90, 1,
    'How hard each cell pumps auxin at its neighbours. Turn it down far enough and the maxima stop forming — the plant runs out of leaves.'],
  ['diffusion', v => { app.prm.D = v; }, () => app.prm.D, 1, 14, 0.1,
    'How much auxin leaks between cells. This sets how far a new leaf reaches to keep the next one away from it.'],
  ['tip growth', v => { for (const a of app.plant.axes) if (a.meristem) a.meristem.o.G = v; },
    () => { for (const a of app.plant.axes) if (a.meristem) return a.meristem.o.G; return app.mo.G; },
    0.0008, 0.010, 0.0002,
    'How fast the growing point expands. Faster means gaps open sooner, so leaves come thicker and faster.'],
  ['sharpness', v => { app.prm.b = v; }, () => app.prm.b, 1.5, 5, 0.1,
    'How decisively a cell commits to its richest neighbour. High values make hard, isolated maxima; low ones smear them out.'],
  ['generative ring', v => {
    for (const a of app.plant.axes) if (a.meristem) a.meristem.o.rOut = v > 0 ? a.meristem.o.rCZ + v : 0;
    app.ringWidth = v;
  }, () => app.ringWidth ?? 0, 0, 5, 0.2,
    'How wide a band may found a leaf. Narrow it and the divergence angle tightens — and the shoot nearly stops making leaves. That trade-off is a real result.'],
  ['time', v => { app.speedMul = v; }, () => app.speedMul, 0, 4, 0.25,
    'How fast the simulation runs.'],
];
const slidersEl = $('sliders');
const sliderRefs = [];
for (const [label, set, get, min, max, step, tip] of SLIDERS) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = '<label>' + label + '<span></span></label>' +
    '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '">';
  slidersEl.appendChild(row);
  const inp = row.querySelector('input');
  const out = row.querySelector('span');
  inp.oninput = () => {
    set(parseFloat(inp.value));
    out.textContent = inp.value;
    // take the viewer to where this control's effect is actually visible
    if (label !== 'time') {
      app.takeOver();
      app.focus = 'apex';
      app.cam.autoRot = true; app.cam.idle = 9999;
      showTip(tip);
      $('regrowBtn').classList.add('urge');
    }
  };
  sliderRefs.push({ inp, out, get });
}
function syncSliders() {
  for (const s of sliderRefs) {
    const v = s.get();
    s.inp.value = v;
    s.out.textContent = (Math.round(v * 10000) / 10000).toString();
  }
}
syncSliders();

// --- buttons ---------------------------------------------------------------
$('newBtn').onclick = () => { app.newSpecimen(); app.giveBack(); syncSliders(); $('regrowBtn').classList.remove('urge'); };
$('regrowBtn').onclick = () => {
  app.newSpecimen(app.speciesName);
  app.giveBack();
  $('regrowBtn').classList.remove('urge');
  showTip('Same chemistry, new specimen — the shape follows from the settings you just changed.');
};
$('pruneBtn').onclick = () => {
  if (app.plant.prune()) {
    showTip('Apex removed. The auxin that was suppressing the buds below it is gone, so one of them will take over.');
  }
};
$('cellsBtn').onclick = () => {
  app.takeOver();
  app.focus = app.focus === 'apex' ? null : 'apex';
  app.cam.autoRot = true; app.cam.idle = 9999;
  $('cellsBtn').textContent = app.focus ? 'pull back' : 'into the cells';
};
$('sheetBtn').onclick = () => {
  document.body.classList.toggle('sheet');
  $('sheetBtn').textContent = document.body.classList.contains('sheet') ? 'close' : 'controls';
};
$('handover').onclick = () => { app.giveBack(); $('cellsBtn').textContent = 'into the cells'; };
$('cineBtn').onclick = () => {
  document.body.classList.add('cinema');
  document.body.classList.remove('sheet');
  $('sheetBtn').textContent = 'controls';
  app.giveBack();
};
$('exitCine').onclick = () => document.body.classList.remove('cinema');
$('aboutBtn').onclick = () => $('about').classList.toggle('show');
$('aboutClose').onclick = () => $('about').classList.remove('show');

addEventListener('resize', () => app.renderer.resize());
setTimeout(() => { const h = $('hint'); if (h) h.style.opacity = 0; }, 8000);

// --- first run: the mechanism before anything else -------------------------
app.focus = 'apex';
showTip('This is the growing tip, one cell at a time. Every needle is a cell aiming its pumps — where they agree, a leaf begins.');
