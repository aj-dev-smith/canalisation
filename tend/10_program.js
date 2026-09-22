// ---------------------------------------------------------------------------
// TEND — the gardener's bench.
//
// A person cannot draw this plant. What they can do is what a plant physiologist
// or a gardener does: move the light, cut a stem, and dress the cut. Each of the
// three is one of the experiments auxin was discovered through, and each acts on
// the plant's ENVIRONMENT or its CHEMISTRY — never on its shape. The shape that
// results is still entirely the engine's; the page only decides where the lamp
// is and where the blade went in.
//
// This file is the program a specimen is grown under here, and the words the
// page uses about what it is doing. The bench itself is 20_bench.js.
// ---------------------------------------------------------------------------

// THE PROGRAM. Every key is an engine option that already exists with a shipped
// default (`budField`, `dominance`, `budTake`...), so this adds no mechanism; it
// is a different setting of the same machinery, the way a floral form is.
//
//   budField 'stream'  bud release is decided by the auxin actually flowing past
//                      each bud from every source above it, so that cutting,
//                      pasting and the laterals' own streams all mean something.
//                      See `Axis.streamAt` in src/40_plant.js.
//   reach              how many world units of stem one living apex holds asleep.
//                      A plant held along most of its length is a plant a cut
//                      can release — the shipped reach is ~3.6 units, so most of
//                      a shipped specimen's buds were let go long before anyone
//                      could cut above them. Stated as a reach rather than as a
//                      decay length because a species' own `branching` threshold
//                      is part of its character, and the reach is what a
//                      gardener sees: dominance = reach / ln(1/branching).
//   budTake            more buds take when released than in the wild presets,
//                      because a bud that wakes and aborts is invisible and a
//                      bench where the experiment fails two times in three
//                      teaches the coin, not the hormone.
//   florigenThresh     x3: the plant stays vegetative long enough to be shaped
//                      before it flowers — a long-day plant kept in short days,
//                      which is what a nursery does with a mother plant.
//   senesceHold        a tended plant does not dismantle itself while you are
//                      tending it; the page lets it go when asked.
const TEND_REACH = 18;
function tendProgram(name, sp) {
  // A species that ships with `branching: 0` — Sulphur Rosette, which is a rosette
  // and never branches — has no threshold at all, and the stream path returns
  // before it looks at a bud: cut one and nothing ever grows. A rosette's axils do
  // hold buds, and decapitating one releases them, so the bench gives it the
  // engine's default threshold. Every other species keeps its own.
  const br = sp.branching > 0 && sp.branching < 1 ? sp.branching : 0.55;
  return {
    budField: 'stream',
    branching: br,
    dominance: TEND_REACH / Math.log(1 / br),
    budTake: 0.62,
    budRelease: 150,
    maxAxes: 40,
    maxGen: 4,
    organBudget: Math.max(sp.organBudget || 0, 300),
    maxOrgans: Math.max(sp.maxOrgans || 0, 70),
    florigenThresh: (sp.florigenThresh || 12) * 3,
    maxFlowers: Math.max(sp.maxFlowers || 0, 10),
    senesceHold: true,
  };
}

// The species this bench offers. The conifer is left out on purpose: it is a
// 240-axis crown whose buds are released by a different architecture, and its
// one-strand needles do not show the vein network this page lights up.
const TEND_SPECIES = ['Ember Creeper', 'Cathedral Fern', 'Abyssal Frond', 'Sun Coral',
  'Hoarfrost Thicket', 'Spiral Ossuary', 'Sulphur Rosette', 'Nightglass Parasol'];

// THE THREE EXPERIMENTS, as the page tells them. Dates, organisms and claims are
// checked against docs/research_9_22_26_tend.md; every measured sentence the page
// adds after a person does one of them is computed from the simulation, never
// written here.
const TEND_EXPERIMENTS = [
  {
    key: 'light', year: '1880', tool: 'lamp',
    title: 'Move the light',
    story: 'Charles and Francis Darwin shade the tip of a grass seedling and it '
      + 'stops turning toward a window. The tip sees the light; something it '
      + 'makes travels down and bends the stem below.',
  },
  {
    key: 'stream', year: '1928', tool: null,
    title: 'See what travels',
    story: 'Frits Went catches that something in a block of agar, and the block '
      + 'alone bends a seedling. It is auxin. Here it is the light running down '
      + 'each stem from every growing tip, at the speed it really moves.',
  },
  {
    key: 'cut', year: '1933', tool: 'shears',
    title: 'Cut the tip',
    story: 'Kenneth Thimann and Folke Skoog cut the growing tip off broad beans. '
      + 'The buds below it, held asleep until then, begin to grow — and the first '
      + 'to get going puts its neighbours back to sleep.',
  },
  {
    key: 'paste', year: '1933', tool: 'paste',
    title: 'Put it back',
    story: 'Then they put the tip\'s hormone back on the cut, in blocks of agar '
      + 'renewed every six hours, and the buds stay asleep until they stop. It was '
      + 'the auxin holding them, not the tip. (Later versions use auxin in lanolin.)',
  },
];

const TEND_TOOLS = {
  look: { label: 'Look', hint: 'Drag to turn around the plant. Scroll or pinch to come closer.' },
  lamp: { label: 'Lamp', hint: 'Drag to carry the lamp. Growing tips turn toward it.' },
  shears: { label: 'Shears', hint: 'Click a stem to cut it. Everything above the cut falls.' },
  paste: { label: 'Auxin', hint: 'Click a stem to cut it and put auxin back on the cut at once. Click the dressed stump to take it away.' },
};
