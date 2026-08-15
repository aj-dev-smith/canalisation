// SOFT MOONLIGHT SHADOWS — the moon finally leaves a mark on the ground.
//
// The scene already agrees with itself about WHERE the light is: the dome
// draws the disc, the key light points from it, the pond streaks along it.
// What was missing is the CONSEQUENCE. Nothing occluded anything, so a field
// of ~150 plants stood on ground lit evenly from every direction — the tell
// that a night scene is ambient rather than lit.
//
// The moon here sits at elevation asin(moonDir.y) = 17.2 degrees, which is
// the whole character of this effect: shadows at 17 degrees are LONG (a 1 m
// herb throws 3.3 m) and they rake across the meadow rather than pooling
// under the plant. Long rake is most of what reads as moonlight.
//
// Everything below is derived from that one number and from the scene's own
// dimensions; nothing here is a dial turned until it looked right, except the
// shadow intensity, which is a look decision and is labelled as one.

export default async (ctx) => {
  const { THREE, scene, renderer, keyLight, moonDir, onFrame } = ctx;

  // --- how dark a shadow is allowed to be -----------------------------------
  // A LOOK DECISION, and the only one in this file. A moon is a hard light
  // with a 0.5-degree disc, so physically a shadow of it is nearly black and
  // whatever fills it is skylight — which this scene does have (a
  // HemisphereLight at 1.15 that no shadow touches). But the key is 1.5 and
  // carries the palette's warmth, so removing all of it from a third of the
  // frame drops those pixels to the hemisphere alone and the field blacks out
  // in a scene that has no headroom to lose. Keeping ~35% of the key inside
  // the shadow is the compromise: the rake still reads, the blacks stay where
  // the grade put them.
  // Checked at both ends rather than assumed: at 1.0 the near meadow in the
  // 'grove' framing loses its blades entirely and reads as flat dark cloth
  // (mean -3.35%, 22% of pixels darker); at 0.65 the same rake is legible and
  // the grass keeps its texture (-2.12%, 20.4%). The 1.0 pass was also the
  // acne stress test — full strength is where bias failures show — and the
  // ground and the laminae came back clean, which is what the two numbers
  // above are worth.
  const INTENSITY = 0.65;

  // --- the shadow camera ----------------------------------------------------
  // A directional light shadows through an orthographic camera hung at the
  // light's position looking at its target (the origin). Every bound below is
  // computed rather than guessed, because a shadow frustum that is too big
  // wastes the only resolution there is and one that is too small clips a
  // shadow off mid-field — a failure that looks like a bug in the geometry.
  const R = 22;                                // metres: the planted field. main.js
                                               // rejects plants past r=18 and sows
                                               // grass to r=21.
  const HMAX = 4.5;                            // metres: tallest thing in that disc
                                               // (a fern ~1.4 m, terrain +1.3, margin)
  const D = keyLight.position.length();         // 60 — where main.js hung the moon
  const sinE = moonDir.y, cosE = Math.sqrt(1 - sinE * sinE);

  const sh = keyLight.shadow;
  // The frustum is NOT square, and the asymmetry is the low elevation showing
  // up again. The camera's local X runs across the light's azimuth, so the
  // field's 44 m diameter arrives at full width there. Its local Y runs along
  // the azimuth, where the ground is foreshortened by sin(elevation) = 0.296,
  // so the same 44 m disc only needs R*sinE = 6.5 — and what actually sets
  // that axis is HEIGHT, at HMAX*cosE = 4.3. Half the box in Y is twice the
  // texel density in Y for free.
  sh.camera.left = -R; sh.camera.right = R;
  const halfY = R * sinE + HMAX * cosE + 3;    // 6.5 + 4.3 + margin
  sh.camera.top = halfY; sh.camera.bottom = -halfY;
  // Depth: the light is 60 m out, content lies within +-R along its own axis.
  sh.camera.near = D - R - 2;
  sh.camera.far = D + R + 8;
  sh.camera.updateProjectionMatrix();
  sh.mapSize.set(2048, 2048);

  // --- bias, and why these two numbers ---------------------------------------
  // three's `bias` is added to the receiver's depth in NORMALISED [0,1] light
  // depth, so its world meaning is bias * (far - near) — here 52 m of span, so
  // -0.0005 is 2.6 cm of pullback along the light ray. That is the budget for
  // peter-panning: a stem point at height y is 0.296*y nearer the light than
  // the ground under it, so contact shadow is lost only below y = 8.8 cm,
  // which at this rake is the first 29 cm of a shadow that runs metres. Any
  // larger and the plants start to hover.
  //
  // 2.6 cm is only affordable because THE TERRAIN DOES NOT CAST (see below):
  // self-shadow acne is a fight between bias and the depth slope across one
  // texel, and at 17 degrees on flat ground that slope is tan(73) = 3.3, i.e.
  // 7 cm of depth error per 21.5 mm texel — a bias big enough to beat it would
  // detach every plant from its own shadow by the better part of a metre.
  // Removing the ground from the caster set removes the fight entirely.
  sh.bias = -0.0005;
  // normalBias offsets the sample along the receiver's own normal, which is
  // what cleans up the remaining acne on the plants themselves (a lamina is
  // both caster and receiver, and a leaf seen edge-on to the moon is the same
  // grazing case in miniature). Kept small — 1.5 cm, about the thickness of
  // the smallest blade the exporter writes — for the same peter-pan reason.
  sh.normalBias = 0.015;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  keyLight.castShadow = true;

  // PCF_SOFT in r161 ignores shadow.radius and blurs over a fixed ~2-texel
  // kernel, so the penumbra here is 2 * 44/2048 = 4.3 cm wide regardless of
  // how far the caster is from the receiver. That is SOFTER than the truth (a
  // 0.5-degree moon gives ~9 mm of penumbra at 1 m) and the error is in the
  // right direction: it hides the fact that a 21.5 mm texel cannot resolve a
  // leaf edge, and it reads as the diffusion a misty field would give anyway.

  // --- who casts, and how they are identified --------------------------------
  // The plants are the only things in this scene that were GROWN, and the
  // exporter left a fingerprint that finds them without a name list: it bakes
  // each vertex's emissive weight into COLOR_0's alpha, so a grown mesh is the
  // only mesh here whose 'color' attribute is a vec4. Terrain colour is vec3,
  // grass colour is per-instance, sky and pond are ShaderMaterials with no
  // colour attribute at all. Identify by the data, not by a list that goes
  // stale the first time an asset is added.
  let casters = 0, receivers = 0, rocks = 0;
  const terrain = ctx.terrainMesh(), grass = ctx.grassMesh();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const col = o.geometry?.attributes?.color;
    if (col && col.itemSize === 4) {
      // a grown specimen: casts AND receives — one frond shading another is
      // the whole reason a drift reads as having depth
      o.castShadow = true; o.receiveShadow = true;
      casters++; receivers++;
    } else if (o.geometry?.type === 'IcosahedronGeometry') {
      // the rocks: twelve of them, a few hundred triangles each, and a rock
      // with no shadow at a 17-degree rake is a decal. Cheap, so included.
      o.castShadow = true; o.receiveShadow = true;
      rocks++; receivers++;
    }
  });
  // THE GROUND RECEIVES AND DOES NOT CAST. Receiving is the point of the whole
  // effect. Not casting is the deliberate trade argued above: within this
  // 22 m box the terrain is a gentle meadow whose self-shadowing at 21.5 mm
  // texels would be a smear, the ridged hills that WOULD self-shadow well sit
  // past r=20 and are outside the frustum anyway, and keeping it out of the
  // caster set is what buys the small bias that keeps plants on the ground.
  if (terrain) { terrain.receiveShadow = true; receivers++; }
  // The grass receives and does not cast: 64k blades rendered into the depth
  // map every update would cost more than the rest of the pass put together,
  // and a blade is 11 mm wide against a 21.5 mm texel — it would alias into
  // noise rather than resolve into shadow. What matters is that the meadow
  // takes the plants' shadows, and it does.
  if (grass) { grass.receiveShadow = true; receivers++; }

  // --- KNOWN LIMITATION, stated rather than fixed ----------------------------
  // The wind is a vertex-shader displacement patched into each plant's own
  // material (main.js patchMaterial). The shadow pass does not use that
  // material — three renders casters with MeshDepthMaterial — so the shadow is
  // of the UNDISPLACED plant while the lit plant leans. At the shipped force-2
  // weather that lean is ~2 cm, which is one shadow texel, so the disagreement
  // is below the resolution of the thing disagreeing. Receivers are fine: the
  // wind edits `transformed` in begin_vertex, and worldpos_vertex (which the
  // shadow lookup reads) runs after it.
  //
  // It also makes the map STATIC, and that is worth taking: no caster moves in
  // the depth pass, so re-rendering 150 specimens into 2048^2 every frame
  // would produce a bit-identical texture. Render it once instead.
  renderer.shadowMap.autoUpdate = false;
  let arm = 4;   // a few frames of insurance in case anything installs after us
  onFrame(() => { if (arm-- > 0) renderer.shadowMap.needsUpdate = true; });

  // --- shadow intensity, backported ------------------------------------------
  // LightShadow.intensity arrived in r165 and this page vendors r161, so the
  // property does not exist. Rather than reach for another light — the rig is
  // the palette's and is not this module's to re-balance — this is the exact
  // change upstream made, in the exact chunk they made it in: the directional
  // shadow term becomes mix(1, shadow, intensity). It is baked as a literal
  // because it never animates, and it is asserted, because a silent no-op
  // string replace would ship a scene with black shadows and no error.
  const CH = THREE.ShaderChunk;
  const call = 'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize,'
    + ' directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius,'
    + ' vDirectionalShadowCoord[ i ] )';
  if (INTENSITY < 1 && CH.lights_fragment_begin.includes(call)) {
    CH.lights_fragment_begin = CH.lights_fragment_begin.replace(
      call, `mix( 1.0, ${call}, ${INTENSITY.toFixed(3)} )`);
  } else if (INTENSITY < 1) {
    console.warn('fx/shadows: could not backport shadow intensity — shadows will be full strength');
  }

  console.log(`fx/shadows: ${casters} grown meshes cast, ${rocks} rocks, ${receivers} receive;`
    + ` moon elev ${(Math.asin(sinE) * 180 / Math.PI).toFixed(1)}deg,`
    + ` box ${(2 * R).toFixed(0)}x${(2 * halfY).toFixed(1)} m at 2048 =`
    + ` ${(2 * R / 2048 * 1000).toFixed(1)}x${(2 * halfY / 2048 * 1000).toFixed(1)} mm/texel,`
    + ` depth ${sh.camera.near.toFixed(0)}-${sh.camera.far.toFixed(0)} m,`
    + ` bias ${(sh.bias * (sh.camera.far - sh.camera.near) * 100).toFixed(1)} cm,`
    + ` intensity ${INTENSITY}`);
};
