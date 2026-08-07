// PETAL FORM, FROM A GROWTH LAW RATHER THAN A POSE.
//
// The shipped petal is a flat card with a 5% droop (`curl = -bl * 0.05`).
// This file replaces that pose with the two published results that make a
// petal a petal, evaluated in closed form each frame — no relaxation loop, no
// keyframes, nothing scheduled:
//
// 1. ANTHESIS AS A PITCHFORK (Liang & Mahadevan 2011, PNAS 108:5516 [D]).
//    A petal is a curved shell. Excess growth along its edge loads it; at a
//    critical strain the shell bifurcates and "becomes a perfectly efficient
//    bending actuator": longitudinal curvature UNBENDS while lateral
//    curvature CURLS, which is a flower opening. Their equations, m = 1 case:
//
//      beta* = (1 - nu) + (1/4)(1 - nu)(3 + nu) k0^2
//      past it:  kx = ((1+nu)/2) k0 - sqrt(beta_g - beta*)
//                ky = ((1+nu)/2) k0 + sqrt(beta_g - beta*)
//
//    Below threshold the bud is a closed cup (kx = ky = k0); past it the
//    petal lays back and gains a lateral roll. The BLOOM IS THE BIFURCATION.
//
// 2. EDGE RIPPLES BY CERDA & MAHADEVAN'S WAVELENGTH LAW (PRL 90:074302 [D],
//    experimentally verified; chosen over Marder's thickness-free form, which
//    over-predicts the lily by ~8x — the literature sweep's numbers):
//
//      lambda = sqrt(2 pi L t) / [3 (1 - nu^2) eps]^(1/4)
//      A      = sqrt(nu L t) * [16 eps / (3 pi^2 (1 - nu^2))]^(1/4)
//
//    with the lily's measured edge-strain profile, ~0.2 at the base rising to
//    ~0.5 at the tip (Liang & Mahadevan 2011 [D]; Portet 2022 measures the
//    same rise). Amplitude and wavelength both come out in millimetres, and
//    they are drawn in millimetres — no artistic multiplier.
//
// What each constant is:
//   NU        0.3        physical (Poisson; Kennaway 2011 uses exactly this)
//   T_PETAL   0.0024     petal thickness in world units = 150 um at the
//                        world's own 0.0625 m/unit. Published range is
//                        75-419 um (van der Kooi 2016 [D]); 150 sits in the
//                        thick of it. ONE stated number.
//   K0        1.0        dimensionless rest curvature of the bud. "Flower
//                        petals are almost always naturally curved, unlike
//                        leaves" (L&M [D]); O(1) is their regime. Stated.
//   BETA_MAX  2.6*beta*  how far past threshold a fully mature petal loads.
//                        Sets WHERE in dev the bloom lands (~dev 0.62), not
//                        whether it happens. Stated, structural.
//   EPS0/EPS1 0.2/0.5    the lily's measured edge strain profile [D].
//
// Driving beta_g with the organ's own `dev` is the one [OURS] construction:
// dev is the engine's maturation wave, and edge strain in the papers grows
// with maturation. It is the same coupling the furl already uses.

const FL_NU = 0.3;
const FL_T_PETAL = 0.0024;
const FL_K0 = 1.0;
const FL_EPS0 = 0.2, FL_EPS1 = 0.5;
const FL_BSTAR = (1 - FL_NU) + 0.25 * (1 - FL_NU) * (3 + FL_NU) * FL_K0 * FL_K0;
// How hard the bloom drives past the bifurcation. 2.6, 2.0 and 1.6 all rolled
// each petal into a taco — the lateral curvature times the half-width swept
// 45-60 deg, and a corolla of tacos reads as a wad of spikes (AJ called the
// first one "weird flashy things"; the measured ladder is in the PR). Shell
// theory is a small-strain theory anyway: at 1.25 the overshoot is a SHALLOW
// CUP — edge slope ~25 deg, length nearly flat with a slight outward arc —
// and the bifurcation's sign still carries the whole bud-to-bloom story.
const FL_BETA_MAX = 1.25 * FL_BSTAR;

// THE NECTAR SPUR (Aquilegia). Puzey, Gerbode, Hodges, Kramer & Mahadevan
// (Proc. R. Soc. B 279:1640, 2012 [D] — the same Mahadevan as both mechanisms
// above, so the whole corolla now runs on one lab's physics): petal growth is
// two phases, cell proliferation then HIGHLY ANISOTROPIC cell elongation, and
// all spur-length diversity across the genus is achieved SOLELY by the degree
// of anisotropy — not cell number, not cell size. So the spur here is the
// petal's own proximal sheet domain (the spur compartment is set early as a
// distinct domain — Yant 2015 [D]) rolled closed and carried backward by an
// anisotropy factor that ramps with dev, the phase-II handover on the same
// dev coupling the bloom already uses. TWO things are deliberately NOT
// stated: the tube's radius at each u is the margin-grown width of the sheet
// at that u (the roll map has the flat sheet as its c->0 limit), so the spur
// tapers to a point because the petal base narrows — the silhouette is the
// margin's, not a cone's; and which petals have spurs is whorl identity, so
// it rides the ABC bands. Stated: uS (the compartment's share of the sheet,
// [OURS]), the anisotropy ceiling (P2012 measure ~2-10 across the genus [D]),
// and the sagittal angle the tube leaves at (geometry, by eye).
function flSpurOf(so, bl, dev) {
  if (!so || !(so.aniso > 1)) return null;
  const uS = so.uS ?? 0.30;
  // phase II: proliferation hands over to anisotropic elongation partway
  // through maturation; before the handover the spur is the shallow cup the
  // divisions made (P2012 fig 2 — spurs begin as a bump, then shoot)
  const a = 1 + (so.aniso - 1) * smoothstep(0.30, 0.90, dev);
  const ang = so.angle ?? (Math.PI + 0.35);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  // sqrt(a) is the tube's slenderness. P2012 bound it from both sides: cell
  // WIDTH stays roughly constant while length multiplies (their measurement),
  // but the compartment that elongates is the cup the divisions made, not the
  // full sheet — so the lateral scale sits between width-conserving (1) and
  // area-conserving (1/a). The geometric middle 1/sqrt(a) is stated [OURS];
  // at aniso 6 it gives diameter ~10% of spur length, which is a real
  // A. coerulea's proportion. Measured at the two ends: 1 is a sausage
  // (lateral span 0.40 against a 0.425 mouth — the petal margin holds its
  // width until the last 2% of the sheet), 1/a is a wire the rasteriser
  // reduces to its own veins.
  return { uS, uM: uS * 1.5, a: Math.sqrt(a), dx, dy, nx: -dy, ny: dx, len: uS * bl * a };
}

// -> { kx, ky, lam, amp } — curvatures in 1/world-units, ripple in world units.
// Curvatures are L&M's dimensionless k-bar made dimensional with the blade
// length as the shell scale.
function flPetalForm(bl, dev, q, nv, spur) {
  const bg = FL_BETA_MAX * dev * dev;
  // Inner organs stay nearer the bud state: identity holds them at a smaller
  // effective load. SCIENCE.md books "enclosing growth at high q" as imposed
  // and unbuilt; the pitchfork gives it a lever — high q lags the bloom.
  // The 0.85 is stated. [OURS]
  const lag = 1 - 0.85 * clamp(q, 0, 1);
  const open = (bg / FL_BSTAR - 1) * lag;
  let kbx = FL_K0, kby = FL_K0;
  if (open > 0) {
    const s = Math.sqrt(Math.min(6, open) * FL_BSTAR);
    kbx = ((1 + FL_NU) / 2) * FL_K0 - s;
    kby = ((1 + FL_NU) / 2) * FL_K0 + s;
  }
  const eps = FL_EPS0 + (FL_EPS1 - FL_EPS0) * dev;
  const L = Math.max(0.05, bl);
  const lam = Math.sqrt(2 * Math.PI * L * FL_T_PETAL) / Math.pow(3 * (1 - FL_NU * FL_NU) * eps, 0.25);
  let amp = Math.sqrt(FL_NU * L * FL_T_PETAL) * Math.pow(16 * eps / (3 * Math.PI * Math.PI * (1 - FL_NU * FL_NU)), 0.25);
  // A ripple the drawing lattice cannot resolve must not be drawn. lam comes
  // out near 0.11 world units and the petal grid samples the width at ~0.04,
  // so the sine lands 2-3 samples per wavelength and aliases into jagged
  // offsets — which is exactly the crumpled-foil mottle measured on screen.
  // Below ~4 samples per wavelength fade the amplitude out instead: the same
  // law as the vein LOD, "what the instrument cannot resolve, it does not
  // draw as noise". `nv` is the petal lattice's own cross rows; both the
  // surface and its veins pass it, so they stay on one displaced surface.
  if (nv) amp *= smoothstep(2.5, 4.0, lam / (L / nv));
  return { kx: kbx / L, ky: kby / L, lam, amp, eps, spur: flSpurOf(spur, bl, dev) };
}
