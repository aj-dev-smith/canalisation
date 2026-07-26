// ---------------------------------------------------------------------------
// THE TRANSPORT STREAM
//
// Every other tissue in this project is a sheet, a ring or a shell. This one is
// the plant's plumbing: one auxin network spanning the WHOLE organism, with a
// node for every organ, every stem segment that carries one, and the root at the
// bottom acting as the only real sink. It is `stepAuxin` again — same solver,
// same feedback — on a tree instead of a lattice.
//
// **THIS FILE IS A FALSIFIED EXPERIMENT AND SHIPS DISABLED.** Nothing in the
// running piece reads it. It is kept, and kept runnable, for the same reason
// `rhoI: 0` keeps the dead second inhibitor in `10_auxin.js`: a negative result
// you cannot re-measure is just a story. `node test/shoot.mjs` switches it on and
// reproduces every number below.
//
// It was built to make abscission a competition: a blade drives auxin down its
// petiole, that basipetal flux holds the abscission zone shut, and a leaf that
// loses its share of a stream shared with every other organ gets shed (Addicott &
// Lynch 1955). It is a lovely story and it does not work here, for a reason worth
// stating at the top of the file so nobody rebuilds it:
//
//   **auxin is MADE by each organ, not competed for.** In steady state a leaf
//   exports what it produces, so flux through the zone measures the leaf's own
//   production and nothing else. The stream cannot refuse it: a stem edge
//   carries ~200 against sources of ~1.
//
// Measured, in `test/shoot.mjs` and JOURNAL.md: flux is conserved, the stem side
// of the zone is richer than the blade side for 96 organs out of 96 at every
// time, and taking the fruit away moves the mean ratio from 2.57 to 2.55. There
// is no scarcity in this stream and therefore no scarcity signal in it.
//
// It was then asked to do the weaker job of merely ORDERING the shed, and could
// not do that either: rank correlation of shed time against founding order ranges
// -0.05 to 0.57 across the eight species, and with the age decline switched off
// the stream cannot finish a plant at all — `dead` 0/2 on every species. What
// ships instead is `Plant.senesceStep` in `40_plant.js`: begun by a physical
// organism state, ordered by a stated rule.
//
// What the stream does produce, and what makes it worth keeping around, is a real
// MEASURED basipetal gradient: a_stem 17.1 at the base to 0.10 at the tip on a
// Cathedral Fern. If anything ever does want to know where a point sits in the
// plant's plumbing, this is the thing that knows.
//
// The graph is append-only. Organs and axes are added and never removed, so a
// node index is a permanent identity and the canalisation memory `pi` on every
// wall survives — rebuilding the topology each time an organ appeared would
// reset every canal in the plant and there would be no competition to measure.
// ---------------------------------------------------------------------------

import { CellField, stepAuxin, MAXNB } from './10_auxin.js';
import { clamp, smoothstep } from './00_math.js';

export const SHOOT_DEFAULTS = {
  // OFF by default, the same way `rhoI: 0` leaves the falsified second
  // inhibitor in `10_auxin.js` switched off but runnable. The stream costs a
  // few hundred nodes a frame and buys the shipped plant nothing, because the
  // thing it was built to decide turned out not to be decidable from it. Turn it
  // on to reproduce the falsification; `test/shoot.mjs` does.
  enabled: false,
  // ...and this one is the falsified claim itself: let the stream set the rate at
  // which blades are dismantled. Measured contribution to shed ORDER, rho(age)
  // over eight species: -0.05, 0.57, -0.00, 0.10, 0.53, 0.13, 0.57, 0.36. It
  // wanders with the species, which is an incidental correlate and not a
  // mechanism — a mechanism holds its sign. `40_plant.js` ships the honest
  // version instead.
  senesceFromStream: false,
  // The root system: not modelled, but it is where auxin goes, and a transport
  // stream with no sink has no direction. This is the only sink in the plant.
  rootDrain: 3.0,
  turnover: 0.05,    // auxin lost in transit; low, so most of it has to travel
  // Sources, in order of how loudly they shout. The fruit was expected to be the
  // loudest and to be what ends the leaves; measured, removing it entirely moves
  // the stem/blade ratio from 2.57 to 2.55, because 2.2 is nothing against ~100
  // units of leaf production. A fruit ends a plant by arresting the apex that set
  // it, which happens in `40_plant.js` and has nothing to do with this file.
  apexSource: 0.55,
  leafSource: 1.10,  // peak export of one fully expanded blade
  fruitSource: 2.20,
  // Auxin export from a blade peaks while it is still expanding and falls away
  // as it matures — expanding leaves are the plant's dominant source, mature ones
  // are weak. Real physiology, and it is doing all the work in this file: with
  // `leafDecay: 0` the stream sheds 42 blades of 96 and no specimen completes.
  // The hope was "the decline ends a leaf, the stream orders them". The second
  // half is false — see `senesceFromStream` — which left an age decline dressed
  // as a transport model, and is why none of this ships.
  leafPeak: 300,
  leafDecay: 2600,
  // Conductances. A petiole is a narrower path than the stem it joins.
  wStem: 1.0,
  wPetiole: 0.75,
  // Export a blade needs to hold itself together. Below it the blade dismantles
  // at a rate set by how far short it falls, so a leaf that has lost everything
  // goes in `senesceFor` and one that is merely struggling takes much longer.
  maintain: 0.55,
  senesceFor: 900,
  // Senescence begins when the ORGANISM is finished, not when a leaf is old —
  // see `Plant.spent()`. Set false and blades senesce as soon as their export
  // fails, which strips a plant that is still growing.
  needSpent: true,
};

// What one blade is currently bidding into the stream. Area, because a big
// mature blade makes more than a small one, and the decline, because it stops
// being the plant's growth front.
function leafExport(org, sp, o) {
  const area = (org.dev || 0) * org.len * org.len / (sp.organLen * sp.organLen + 1e-6);
  const decline = o.leafDecay > 0
    ? Math.exp(-Math.max(0, org.age - o.leafPeak) / o.leafDecay) : 1;
  return o.leafSource * area * decline;
}

export class Vasculature {
  constructor(prm, o, cap = 2048) {
    this.o = { ...SHOOT_DEFAULTS, ...o };
    // The stream runs the same chemistry as every other tissue unless a species
    // says otherwise. `prm` here is the whole-plant parameter set; `o.prm`
    // overrides it for the shoot alone, which is how transport capacity gets
    // tested independently of the meristem's.
    this.prm = { ...prm, ...(this.o.prm || {}) };
    this.F = new CellField(cap);
    this.full = false;
    // the sink. Nothing else in the plant has a mu worth mentioning.
    this.root = this.F.add(0, 0, 0.02);
    this.F.mu[this.root] = this.o.rootDrain;
    this.shed = 0;
  }

  _node(a = 0.10) {
    const i = this.F.add(0, 0, a);
    if (i < 0) this.full = true;
    return i;
  }

  // A new shoot taps into the stream at the node its parent organ sits on — or
  // at the root, for the leader. Returns the axis's apex node.
  startAxis(parentNode) {
    const i = this._node();
    if (i < 0) return -1;
    const p = (parentNode === undefined || parentNode < 0) ? this.root : parentNode;
    this.F.link(p, i, this.o.wStem);
    return i;
  }

  // An organ is founded at the apex, and the apex moves on. So the tissue that
  // WAS the apex becomes this organ's node on the stem, and a fresh apex node is
  // appended above it — which is what a growing point actually does, and keeps
  // the graph append-only into the bargain.
  addOrgan(axis, org) {
    const F = this.F;
    const stem = axis.vApex;
    if (stem === undefined || stem < 0) return;
    const apex = this._node();
    if (apex < 0) return;
    F.link(stem, apex, this.o.wStem);
    axis.vApex = apex;
    const on = this._node();
    if (on < 0) return;
    F.link(on, stem, this.o.wPetiole);
    org.vNode = on;
    org.vStem = stem;
    // the organ node has exactly one wall, so its abscission zone is edge 0 and
    // stays edge 0 forever
    org.vEdge = on * MAXNB;
    org.sen = 0;
  }

  // Basipetal export of one organ: net flux out of the blade, into the stem.
  // Negative means the stem is pushing back into the blade, which is a leaf that
  // has comprehensively lost.
  exportOf(org) {
    return org.vEdge === undefined ? 0 : this.F.J[org.vEdge];
  }

  step(plant, dt) {
    const F = this.F, o = this.o, sp = plant.sp;
    for (let i = 0; i < F.n; i++) { F.rho[i] = 0; F.mu[i] = o.turnover; }
    F.mu[this.root] = o.rootDrain;

    for (const a of plant.axes) {
      if (a.vApex === undefined || a.vApex < 0) continue;
      if (a.alive) F.rho[a.vApex] += o.apexSource;
      // Seeds make auxin, and a lot of it. This is the same fact that lets a
      // fruit set without pollination here, read from the other end: the ovary
      // does not just draw on the plant, it floods the stream.
      // An ovary that has not placed its ovules yet has no seeds to make auxin
      // with, so it is silent until it starts filling — which is exactly when a
      // real fruit takes the plant over.
      if (a.fruit && !a.fruit.barren && a.fruit.phase !== 'pattern') {
        const f = a.fruit;
        const fill = f.phase === 'ripe' ? 1
          : smoothstep(0, 1, (f.age || 0) / Math.max(1, (f.o.growFor || 1200) * 0.4));
        F.rho[a.vApex] += o.fruitSource * fill;
      }
      for (const org of a.organs) {
        if (org.vNode === undefined || org.vNode < 0 || org.shed) continue;
        // a senescing blade is dismantling itself and exports less as it goes,
        // which is why abscission runs away once it starts
        F.rho[org.vNode] = leafExport(org, sp, o) * (1 - (org.sen || 0));
      }
    }

    const sub = this.prm.substeps || 1;
    for (let k = 0; k < sub; k++) stepAuxin(F, this.prm, 'flux');

    // --- record each blade's export ----------------------------------------
    // This is the falsified signal, and it is still measured because a negative
    // result you cannot re-measure is just a story. `test/shoot.mjs` reads it.
    const going = !o.needSpent || plant.spent();
    for (const a of plant.axes) {
      for (const org of a.organs) {
        if (org.vEdge === undefined || org.shed) continue;
        org.vExport = F.J[org.vEdge];
        if (!o.senesceFromStream) continue;
        // a blade that has not finished expanding has not started exporting
        // either, and must not be judged on it
        if (!going || (org.dev || 0) < 0.6) continue;
        const support = clamp(org.vExport / o.maintain, 0, 1);
        org.sen = clamp((org.sen || 0) + dt * (1 - support) / o.senesceFor, 0, 1);
        if (org.sen >= 1) { org.shed = true; org.shedAt = plant.time; this.shed++; }
      }
    }
  }

  // auxin at a node, for the harness and for anything that wants to draw the
  // stream itself later
  auxinAt(i) { return i === undefined || i < 0 ? 0 : this.F.a[i]; }
}
