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
// the view table, so a capture script can enumerate them rather than keep its
// own list and quietly stop covering the one that was added last
window.__VIEWS = VIEWS;
// The species table, for the same reason and one more: a preset A/B is only
// honest if both specimens are grown in ONE browser session on ONE GL backend,
// and a tool that has to rebuild the bundle between candidates cannot do that.
// `newSpecimen` reads this table, so a tool can patch a preset and regrow.
window.__SPECIES = SPECIES;
// The agent table (15_pathogen.js), so `plant.inoculate()` is discoverable from
// the console rather than requiring you to read the source for the names. An
// agent is the one thing in the piece with no UI at all — it is an event in the
// environment, so nothing on the page implies one, and without this a person
// looking at an infected plant has no way to find out what to type.
window.__AGENTS = AGENTS;

// --- the specimen label ----------------------------------------------------
let lastHud = 0;
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
  // The agent rows appear only once something has been injected — a healthy
  // plant should say nothing about a disease it does not have, so the row
  // showing up IS the notification. `burden` is what tells you it actually took:
  // inoculate() can succeed and the agent still fail to establish, because
  // invasion has a real threshold at R0 = r/clr and nothing schedules it.
  const ag = app.plant.agentBurden && app.plant.agentBurden();
  $('cAgentRow').style.display = ag ? '' : 'none';
  $('cBurdenRow').style.display = ag ? '' : 'none';
  if (ag) {
    $('cAgent').textContent = ag.agent;
    $('cBurden').textContent = ag.axes
      ? ag.axes + (ag.axes === 1 ? ' apex' : ' apices') + ' · peak ' + ag.peak.toFixed(2)
      : 'cleared';
  }
  const st = c.stage;
  for (const el of document.querySelectorAll('#stage span'))
    el.classList.toggle('on', el.dataset.s === st);
  $('fps').textContent = app.fps.toFixed(0);
  // A FULL BUFFER USED TO BE INVISIBLE. It drops geometry and carries on, so
  // the symptom is a picture that is merely missing things — twice now that
  // has been diagnosed the long way round. `Buffers` counts what it threw
  // away; this is the only place a person would see it.
  const sat = app.B.saturated();
  $('sat').textContent = sat
    ? `dropped ${sat.tri} tri / ${sat.line} line / ${sat.pt} pt` : '';
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

// --- the view rail ---------------------------------------------------------
// Which channels of the simulation reach the screen.
//
// IN THE BAR, NOT IN THE SHEET, and the reason is the whole argument for where
// any control goes. It started in the controls sheet on the theory that a view
// is something you choose once and then watch. That was wrong the first time
// anyone used it: the sheet is 560px wide and up to 70vh tall, so opening it to
// change the view covers the thing whose view you are changing. **A control that
// hides its own subject cannot be judged.** Switching views is now one click and
// nothing moves over the plant.
//
// The copy matters more here than on the other controls, so it goes through
// `showTip` — the same channel the sliders use to say what they just did, and it
// gets out of the way on its own. Every one of these is the same plant, the same
// solver and the same frame; what changes is how much of what the simulation
// knows is allowed through. Somebody who reads "cells" as a stylised filter has
// been told the opposite of the truth.
const VIEW_NOTE = {
  natural: 'The plant standing in light. Opaque tissue, the canalised veins glowing inside it.',
  cells: 'No lamina at all — every leaf, growing point and ovary wall drawn at the resolution the solver runs at. Each disc is one cell holding the auxin it actually holds; each needle is the wall it has loaded its pumps onto. About 67,000 of them on a Cathedral Fern.',
  flux: 'The organism as one transport network. Drop the cells and keep what they are doing: veins and pump directions, nothing else. Tip, leaf and fruit end up in the same language, because they are the same solver on different geometry.',
  field: 'An instrument, not a picture. Auxin concentration on one ramp, the species colours discarded, no bloom or grade. Two species look alike in here — which is the point, since a species is only a parameter set.',
};
const viewsEl = $('views');
for (const name of Object.keys(VIEWS)) {
  const b = document.createElement('button');
  if (name === app.viewName) b.className = 'on';
  b.textContent = VIEWS[name].label || name;
  b.title = VIEW_NOTE[name] || name;
  b.onclick = () => {
    if (app.viewName === name) return;          // no tip for a no-op
    app.setRenderView(name);
    for (const x of viewsEl.children) x.classList.remove('on');
    b.classList.add('on');
    showTip(VIEW_NOTE[name] || '');
  };
  viewsEl.appendChild(b);
}

// --- controls that show you their own effect -------------------------------
let tipT = 0;
function showTip(text) {
  const t = $('tip');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(tipT);
  // HOW LONG IT STAYS UP IS A FUNCTION OF HOW MUCH THERE IS TO READ. This was a
  // flat 3800ms, which suits the shortest slider tip and no other: the view
  // notes run to 260 characters, and 3.8 seconds of that is 68 characters a
  // second, roughly three times a reading pace. 38ms a character is about 315
  // words a minute — brisk, but the tip is a nudge rather than a document, and
  // the floor keeps a short one from flashing past.
  tipT = setTimeout(() => t.classList.remove('on'),
    Math.min(10000, Math.max(3800, text.length * 38)));
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
  // The weather, in metres per second at a metre off the ground — the one number in
  // the mechanics that is a composition choice rather than a measurement, so it is the
  // one that belongs on a slider. The band edges are Beaufort's: 0 is a dead calm and
  // costs exactly nothing, 1.6 is where leaves start to rustle, 3.4 is "leaves and
  // small twigs in constant motion", 5.5 raises dust. Everything downstream of it —
  // gust strength, gust frequencies, the height profile — is rebaked from it, so this
  // cannot put the air into a state the physics disagrees with.
  ['wind', v => { app.setWind(v); }, () => app.plant.wind.o.uRef, 0, 8, 0.1,
    'How hard it is blowing, in metres per second. Beaufort 2 (1.6-3.3) is leaves rustling; 3.4 and up is constant motion. The gusts get faster as well as stronger, because an eddy\'s frequency is how quickly the wind carries it past.'],
  ['time', v => { app.speedMul = v; }, () => app.speedMul, 0, 4, 0.25,
    'How fast the simulation runs.'],
];
// Two controls act on the whole standing plant rather than on the growing point, so
// they must not yank the camera to the apex the way the chemistry sliders do — you
// cannot judge sway through a macro lens on a meristem.
const WHOLE_PLANT = new Set(['time', 'wind']);
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
    if (!WHOLE_PLANT.has(label)) {
      app.takeOver();
      setCellFocus('apex');       // sets autoRot for us
      app.cam.idle = 9999;
      showTip(tip);
      $('regrowBtn').classList.add('urge');
    } else if (label === 'wind') {
      // Nothing to regrow — the weather changes what the plant is doing, not what it
      // grew into — but the tip is still worth showing, because "the gusts get faster
      // as well as stronger" is the non-obvious half of moving this control.
      showTip(tip);
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

// --- inject something ------------------------------------------------------
// The one control here that perturbs the plant's CHEMISTRY mid-life rather than
// its parameters. Deliberately does NOT move the camera: an agent's effect is
// whole-plant and slow, so yanking to the apex the way the chemistry sliders do
// would frame out the thing you just caused. Same reasoning as WHOLE_PLANT above.
const AGENT_TIP = {
  gall: 'Auxin production, raised wherever the agent has reached — the direct analogue of the genes Agrobacterium injects. Watch the LEAF, not the shoot: the blade keeps canalising, but with every cell a source there is no gradient left to build a hierarchy out of, so traffic spreads over a hundred strands instead of ten.',
  lesion: 'The same auxin source, but slow, and with the two things the literature says really happen: the host conjugates away the excess, and the auxin closes the plasmodesmata the agent is spreading through. It stops. Where it stops is not written down anywhere — it is where a slow front got to before the blade finished developing.',
  chlorosis: 'A sink rather than a source: the agent degrades auxin where it sits. The specimen thins out and founds fewer organs, because there is less signal to sharpen into a maximum.',
  blind: 'Polarisation competence knocked out. The tissue still carries auxin perfectly well — it just cannot sharpen it into a peak any more, and founding a leaf IS sharpening a peak. Expect the growing point to keep going and stop producing.',
  invert: 'Polarity REVERSED. Below zero the competence term stops pulling a cell toward uniform and reflects it through: PIN goes to the wall the gradient rule would have avoided. The most drastic thing here — expect a bare whip with its leaves at the foot, arrested before it ever flowers.',
  leafygall: 'FALSIFIED, and kept so it stays re-measurable. It was meant to reproduce Rhodococcus — new competent domains, so more organs and iterated shoots. It does not: competence sharpens the maxima that exist rather than creating new ones. Expect roughly nothing, and that is the result.',
  systemic: 'Rides the auxin transport field instead of crawling. ⚠ No evidence supports this — nothing pathogenic actually moves in the polar transport stream — so it is kept as our own construction and labelled, not as physics.',
};
const agentSel = $('agentSel');
for (const name of Object.keys(AGENTS)) {
  const o = document.createElement('option');
  o.value = name; o.textContent = name;
  agentSel.appendChild(o);
}
agentSel.value = 'invert';   // the one whose effect is unmistakable
// THERE IS A WINDOW OF SUSCEPTIBILITY, AND NOTHING SCHEDULES IT. Measured over
// eight seeds, an `invert` inoculation takes 8/8 at 200 steps, 7/8 at 400, 4/8
// at 600, 1/8 at 800 and 0/8 at 1000 — after which the specimen finishes with
// exactly the organ count it would have had untouched. A meristem is growing,
// advecting tissue: every cell it makes starts clean, so late on the plant
// simply outruns the agent, and the leader converts to a flower before a titre
// can build. That is a real property and not a failure, but it makes for a
// miserable demo, so the button says which side of the window you are on.
const SUSCEPTIBLE_UNTIL = 700;
function infect(name) {
  const inf = app.plant.inoculate(name);
  if (!inf) {
    // A herb's leader converts to a flower early and `setFruit` takes its
    // growing point with it, leaving nothing living to inject into. Say so
    // rather than appearing to work — the first browser capture written against
    // this API infected nothing four times in silence.
    showTip('Nothing to inject into — every growing point on this specimen has already converted or arrested. An agent needs living meristem. Use "fresh + inject" instead.');
    return false;
  }
  const late = app.age > SUSCEPTIBLE_UNTIL;
  showTip((AGENT_TIP[name] || ('Injected ' + name + '.')) + (late
    ? '  ⚠ This specimen is past its window — an inoculation this late usually washes out, and the burden row will fall back to "cleared". That is real, not a bug: a meristem makes clean cells faster than the agent can take them. Use "fresh + inject" to see the effect.'
    : '  Watch the burden row on the card — if it climbs, it took.'));
  return true;
}
$('infectBtn').onclick = () => infect(agentSel.value);
// The reliable demo path: a new specimen, run forward to the middle of its
// susceptible window, and injected there. Stepping synchronously is fine — this
// is a few hundred steps on a seedling, not a grown plant.
$('infectNewBtn').onclick = () => {
  app.newSpecimen(app.speciesName);
  app.giveBack();
  for (let i = 0; i < 260; i++) app.plant.step(1);
  app.age = 260;
  syncSliders();
  $('regrowBtn').classList.remove('urge');
  infect(agentSel.value);
};
// The close-up is a tour of two places, not one: the tip, where needles
// converge and that convergence IS a leaf, and the blade, where the same
// needles fall into line and that line IS a vein. One button walks the viewer
// through both rather than adding a fourth control to a full bar.
const CELL_LABEL = { null: 'into the cells', apex: 'into a leaf', leaf: 'pull back' };
function setCellFocus(f) {
  app.enterFocus(f);
  // The tip is a dome and orbiting it shows more of the spiral; a blade is
  // flat, and orbiting one only carries the camera round to its edge, where
  // the whole cell sheet collapses onto a line.
  app.cam.autoRot = f !== 'leaf';
  $('cellsBtn').textContent = CELL_LABEL[f === null ? 'null' : f];
}
$('cellsBtn').onclick = () => {
  app.takeOver();
  app.cam.idle = 9999;
  if (app.focus === null) {
    setCellFocus('apex');
    showTip('The growing tip, one cell at a time. Every needle is a cell aiming its pumps — where they agree, a leaf begins.');
  } else if (app.focus === 'apex') {
    // nothing to show until a blade has actually opened
    if (!app.watchOrgan()) {
      setCellFocus(null);
      showTip('No blade has opened yet — let this one grow a little, then look again.');
    } else {
      setCellFocus('leaf');
      showTip('The same cells, the same needles, in a leaf. Where they fall into line the auxin gets a road, and that road is a vein — brightness is the traffic it carries.');
    }
  } else setCellFocus(null);
};
$('sheetBtn').onclick = () => {
  document.body.classList.toggle('sheet');
  $('sheetBtn').textContent = document.body.classList.contains('sheet') ? 'close' : 'controls';
};
$('handover').onclick = () => { app.giveBack(); $('cellsBtn').textContent = CELL_LABEL.null; };
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
setCellFocus('apex');
showTip('This is the growing tip, one cell at a time. Every needle is a cell aiming its pumps — where they agree, a leaf begins.');
