# THE PRODUCTION RIG. Fourth layer, and the only one allowed to add detail.
#
#   Blender -b -P tools/blender_shot.py -- --export export/ember_peak \
#       --out shots/hero.png --look film \
#       --hero '{"res": [3200, 4000], "samples": 1024}'
#
# The stack, and it is deliberate:
#
#   blender_import.py   FIDELITY  — the geometry `drawSpecimen` emitted, nothing
#                                   added, nothing interpreted
#   blender_look.py     REFERENCE — `60_render.js` rebuilt in Cycles, so there is
#                                   a control to be judged against
#   blender_hero.py     TASTE     — one art direction (the plant as light source)
#   blender_film.py     THIS      — everything, no holding back
#
# WHAT "NO HOLDING BACK" IS ALLOWED TO MEAN, because the project has exactly one
# rule and it would be very easy to break it here:
#
#   > Nothing about the plant's SHAPE is drawn.
#
# Every piece of detail added below is either a PHYSICAL constant that was
# already in the codebase, or a field the plant's own chemistry canalised. In
# particular:
#
#  - **Lamina thickness is `FALL_DEFAULTS.thickM` = 0.4 mm**, which has been in
#    `39_fall.js` for months because the falling-blade model needed it. It is a
#    measured property of real leaves, not a modelling choice, and the fall's
#    section of TUNING.md says so at the top. A blade in the browser is a
#    zero-thickness sheet; giving it its real thickness is subtraction of an
#    approximation, not addition of a shape.
#  - **The areole doming is the vein distance field**, rebuilt in Blender with a
#    Geometry Proximity node against the vein curves themselves. `50_geom.js`
#    already computes exactly this (`nearVein()` -> `dd`) and already uses it for
#    `veinTint` and for the order a dying blade drains in — so this is a channel
#    the engine computes and the renderer has never drawn, which is ROADMAP 0z's
#    argument. It is not a bump texture. It is the network the chemistry grew,
#    read as geometry.
#  - **Vein thickness variation is `radius`**, which is traffic, which is the
#    canalisation result itself.
#
# Nothing here invents a silhouette, a count, an angle or a curve. If you find
# yourself reaching for a noise texture to make tissue look interesting, stop —
# there is an unread simulation channel that will do it honestly.

import bpy
import numpy as np
from mathutils import Vector

import sys
ci = sys.modules.get("ci")
hero = sys.modules.get("hero")
look = sys.modules.get("look")

# `39_fall.js` FALL_DEFAULTS.thickM — metres, real, and the reason no constant
# had to be invented here. Kept as a named module constant rather than inlined
# so that a change in the engine has one place to land.
THICK_M = 0.0004


def _sock(group, ident):
    return hero._sock(group, ident)


# ---------------------------------------------------------------------------
# geometry: thickness, and the vein field as relief
# ---------------------------------------------------------------------------
#
# A GEOMETRY NODES GRAPH RATHER THAN MODIFIERS, for one reason: the proximity
# result has to reach the SHADER as well as the mesh, and only a Store Named
# Attribute can carry it there. The doming and the attribute are the same
# evaluation, so they cannot disagree.
#
#   d      = distance to the nearest vein point, metres
#   t      = min(d / reach, 1)                       0 at a vein, 1 mid-areole
#   offset = dome * (1 - (1-t)^2) along the normal   a bulge between veins
#
# `reach` is not a taste constant either — it is `1/11` of a world unit, which
# is `nearVein(u,vv) * 11` in `50_geom.js:403` read backwards: the engine's own
# statement about how far a vein's influence extends across tissue.
def veinfield(obj, veins, dome_m, reach_m, attr="vdist"):
    ng = bpy.data.node_groups.get("canalisation.veinfield")
    if ng is None:
        ng = bpy.data.node_groups.new("canalisation.veinfield", "GeometryNodeTree")
    ng.nodes.clear()
    for item in list(ng.interface.items_tree):
        ng.interface.remove(item)
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")

    n = ng.nodes
    gin = n.new("NodeGroupInput"); gin.location = (-800, 0)
    gout = n.new("NodeGroupOutput"); gout.location = (900, 0)

    info = n.new("GeometryNodeObjectInfo"); info.location = (-800, -260)
    info.inputs["Object"].default_value = veins
    info.transform_space = "RELATIVE"

    # ⚠ DISTANCE TO THE SEGMENTS, NOT TO THE STRAND ENDPOINTS. Proximity in
    # POINTS mode against 2-point strands measures distance to 42,000 isolated
    # dots, and the field it produces is a lump per dot: the first close-up came
    # back with a leaf quilted in a regular diamond grid, which read as fabric
    # and not as tissue. Curve To Mesh with no profile turns the strands into
    # edges, and EDGES mode is then a true distance-to-line field — which is
    # what `nearVein()` computes in `50_geom.js` and what an areole actually is.
    wire = n.new("GeometryNodeCurveToMesh"); wire.location = (-680, -260)
    ng.links.new(info.outputs["Geometry"], wire.inputs["Curve"])

    prox = n.new("GeometryNodeProximity"); prox.location = (-560, -180)
    prox.target_element = "EDGES"
    ng.links.new(wire.outputs["Mesh"], prox.inputs["Geometry"])

    # t = min(d/reach, 1)
    div = n.new("ShaderNodeMath"); div.operation = "DIVIDE"; div.location = (-360, -180)
    div.inputs[1].default_value = max(1e-9, reach_m)
    ng.links.new(prox.outputs["Distance"], div.inputs[0])
    t = n.new("ShaderNodeMath"); t.operation = "MINIMUM"; t.location = (-200, -180)
    t.inputs[1].default_value = 1.0
    ng.links.new(div.outputs[0], t.inputs[0])

    store = n.new("GeometryNodeStoreNamedAttribute"); store.location = (-20, 0)
    store.data_type = "FLOAT"; store.domain = "POINT"
    store.inputs["Name"].default_value = attr
    ng.links.new(gin.outputs[0], store.inputs["Geometry"])
    ng.links.new(t.outputs[0], store.inputs["Value"])

    # 1-(1-t)^2 — flat against the vein, rounding off into the areole
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.location = (-200, -360)
    inv.inputs[0].default_value = 1.0
    ng.links.new(t.outputs[0], inv.inputs[1])
    sq = n.new("ShaderNodeMath"); sq.operation = "MULTIPLY"; sq.location = (-40, -360)
    ng.links.new(inv.outputs[0], sq.inputs[0]); ng.links.new(inv.outputs[0], sq.inputs[1])
    hgt = n.new("ShaderNodeMath"); hgt.operation = "SUBTRACT"; hgt.location = (120, -360)
    hgt.inputs[0].default_value = 1.0
    ng.links.new(sq.outputs[0], hgt.inputs[1])
    amp = n.new("ShaderNodeMath"); amp.operation = "MULTIPLY"; amp.location = (280, -360)
    amp.inputs[1].default_value = dome_m
    ng.links.new(hgt.outputs[0], amp.inputs[0])

    nrm = n.new("GeometryNodeInputNormal"); nrm.location = (280, -520)
    off = n.new("ShaderNodeVectorMath"); off.operation = "SCALE"; off.location = (460, -440)
    ng.links.new(nrm.outputs["Normal"], off.inputs[0])
    ng.links.new(amp.outputs[0], off.inputs["Scale"])

    setp = n.new("GeometryNodeSetPosition"); setp.location = (660, 0)
    ng.links.new(store.outputs["Geometry"], setp.inputs["Geometry"])
    ng.links.new(off.outputs["Vector"], setp.inputs["Offset"])
    ng.links.new(setp.outputs["Geometry"], gout.inputs[0])

    md = obj.modifiers.get("canalisation.veinfield")
    if md is None:
        md = obj.modifiers.new("canalisation.veinfield", "NODES")
    md.node_group = ng
    return ng


# ⚠ WELD FIRST, AND NOTHING ELSE WORKS UNTIL YOU DO.
#
# `blender_import._surfaces` builds the lamina as a TRIANGLE SOUP: `vertices.add(n)`
# with one vertex per CORNER and `loops.foreach_set("vertex_index", arange(n))`,
# so no triangle shares a vertex with its neighbour. That is invisible and
# harmless while the mesh is only ever shaded — custom split normals make it look
# like a smooth surface, and every render before this one did.
#
# The moment anything treats it as a SOLID it falls apart: Solidify extrudes each
# triangle into its own closed slab with its own rim, so a leaf becomes a mosaic
# of ~2,350 separate tiles and reads as fish scales or quilted fabric.
#
# **It cost four renders to find, and the reason is instructive**: the artefact
# looked exactly like a plausible material or displacement problem, so it was
# chased through vein widths (20x), subsurface radius (4x), coat roughness, and
# the doming amplitude down to zero — four changes, four byte-similar images.
# FOUR LARGE INDEPENDENT CHANGES THAT ALL DO NOTHING IS NOT A LOOK PROBLEM. It
# means the thing you are adjusting is not the thing you are seeing.
#
# The threshold is deliberately tiny. The duplicates are bit-identical positions
# (the same lattice corner written three times), so 1 micron merges exactly them
# and nothing else — it is not a decimation and it must not become one.
def weld(obj, threshold=1e-6):
    md = obj.modifiers.get("canalisation.weld")
    if md is None:
        md = obj.modifiers.new("canalisation.weld", "WELD")
    md.merge_threshold = threshold
    return md


# A REAL SHEET, NOT A SURFACE. Solidify last, so the doming is already in the
# position it thickens. `use_rim` closes the edge, which is what gives a leaf its
# bright margin when it is lit from behind — the single most recognisable thing
# about a backlit leaf and something a zero-thickness plane cannot do at all.
def solidify(obj, thickness=THICK_M):
    md = obj.modifiers.get("canalisation.thickness")
    if md is None:
        md = obj.modifiers.new("canalisation.thickness", "SOLIDIFY")
    md.thickness = thickness
    # ⚠ THICKEN BACKWARDS, NOT SYMMETRICALLY. At `offset = 0` the sheet grows
    # both ways about the original surface and SWALLOWS THE VEINS — which sit
    # on that surface and are thinner than the lamina at any close framing. The
    # first close-up lost the vein network entirely, and it did not look like a
    # bug, it looked like a leaf with no veins. `-1` keeps the front face where
    # `drawSpecimen` put it, so the vasculature stays on the outside of the
    # tissue where the renderer has always drawn it.
    md.offset = -1.0
    md.use_rim = True
    md.use_rim_only = False
    md.use_even_offset = False
    # Custom split normals came off the parametric surface; letting Solidify
    # flip them on the new back face is the difference between a leaf and a
    # black card seen edge-on.
    md.use_flip_normals = False
    return md


# ⚠ THE VEIN WIDTHS ARE A LEGIBILITY CHOICE, NOT A MEASUREMENT, AND AT CLOSE
# RANGE THEY ARE 6-15x TOO FAT.
#
# `50_geom.js` draws a vein at `base * (0.25 + w*1.35)` under a floor whose
# whole purpose is to keep a sub-pixel network visible — the browser's problem
# is that veins are too THIN to see. Measured on this specimen, the median vein
# comes out 0.46 mm wide on a 130 mm leaf; with ~235 veins that is 108 mm of
# vein across a 130 mm blade, so the network covers nearly the whole lamina. A
# rasteriser survives that because its veins are camera-facing ribbons drawn
# additively, which merge into a smear. Cycles draws them as what they are —
# stubby capsules — and a leaf comes out looking like fish scales.
#
# Real minor venation in a leaf that size is 0.03-0.08 mm. So this is a scale on
# the whole set, which leaves every RATIO — the hierarchy, which is the actual
# canalisation result — untouched. It is the exact inverse of the width floor:
# the floor exists because a wide frame cannot resolve the network, this exists
# because a close one resolves it too well.
def scale_radii(objs, mul):
    if mul == 1.0:
        return
    for ob in objs:
        if ob.type != "CURVES":
            continue
        att = ob.data.attributes.get("radius")
        if att is None:
            continue
        r = np.empty(len(att.data), dtype="f4")
        att.data.foreach_get("value", r)
        att.data.foreach_set("value", r * mul)
        print(f"  vein radius x{mul}: median now {np.median(r) * mul * 1000:.3f} mm")


def prep(H, dome_mul=1.0, reach_units=1.0 / 11.0, thickness=THICK_M, attr="vdist"):
    """Give the lamina its real thickness and the vein field as relief."""
    names = H.get("_objects", [])
    surf = next((bpy.data.objects[n] for n in names
                 if n in bpy.data.objects and n.endswith(".surfaces")), None)
    veins = next((bpy.data.objects[n] for n in names
                  if n in bpy.data.objects and n.endswith(".veins")), None)
    if surf is None or veins is None:
        print("  film: no lamina or no veins to build a field from")
        return None
    scale = float(H.get("unitM", 1.0)) or 1.0
    reach = reach_units * scale
    # A bulge cannot be deeper than the sheet is thick without turning the leaf
    # inside out, so the dome is expressed as a multiple of the real thickness.
    dome = dome_mul * thickness
    weld(surf)                       # must come first — see the note above
    veinfield(surf, veins, dome, reach, attr)
    solidify(surf, thickness)
    print(f"  film: lamina {thickness * 1000:.2f} mm thick, "
          f"areole dome {dome * 1000:.2f} mm over a {reach * 1000:.0f} mm reach")
    return surf


# ---------------------------------------------------------------------------
# the leaf
# ---------------------------------------------------------------------------
#
# WHAT MAKES A LEAF READ AS A LEAF, in the order a viewer notices it:
#
#  1. **It transmits.** Held against a light, tissue glows and the vasculature
#     shows as a darker tracery inside it. With a real 0.4 mm sheet this is
#     genuine subsurface transport rather than a translucency fudge, so the
#     vein shadow comes out of the geometry instead of being painted.
#  2. **It has a cuticle.** A waxy specular layer, and it is NOT uniform:
#     tissue over a vein sits lower and reads glossier. `vdist` drives it.
#  3. **Its edge is bright.** That is the rim face Solidify built.
#  4. **The vasculature is the brightest thing in it**, which is this project's
#     whole thesis and the one thing the hero rig must not lose.
def leaf_material(H, name="canalisation.surface", attr="vdist",
                  sss=0.62, sss_mm=1.4, rough_vein=0.16, rough_areole=0.42,
                  coat=0.32, emis_mul=3.0, tint=1.0):
    pal = H.get("palette", {})
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (1000, 0)
    add = nt.nodes.new("ShaderNodeAddShader"); add.location = (800, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); bsdf.location = (480, 160)
    emit = nt.nodes.new("ShaderNodeEmission"); emit.location = (480, -420)

    col = nt.nodes.new("ShaderNodeAttribute"); col.attribute_name = "Col"
    col.location = (-700, 200)
    emi = nt.nodes.new("ShaderNodeAttribute"); emi.attribute_name = "emis"
    emi.location = (-700, -420)
    vd = nt.nodes.new("ShaderNodeAttribute"); vd.attribute_name = attr
    vd.attribute_type = "GEOMETRY"; vd.location = (-700, -60)

    # base colour, lifted a little: the browser's vertex colour already has
    # `laminaMul` baked into it to hold the lamina under the veins, and that
    # ratio was set against an unlit shader. Under real light transport the
    # transmission does that job, so the albedo can come back up.
    lift = nt.nodes.new("ShaderNodeVectorMath"); lift.operation = "SCALE"
    lift.location = (-460, 200); lift.inputs["Scale"].default_value = tint
    nt.links.new(col.outputs["Color"], lift.inputs[0])
    nt.links.new(lift.outputs["Vector"], bsdf.inputs["Base Color"])

    # roughness: glossier over a vein, matter in the middle of an areole
    rgh = nt.nodes.new("ShaderNodeMapRange"); rgh.location = (-240, -60)
    rgh.inputs["To Min"].default_value = rough_vein
    rgh.inputs["To Max"].default_value = rough_areole
    nt.links.new(vd.outputs["Fac"], rgh.inputs["Value"])
    nt.links.new(rgh.outputs["Result"], bsdf.inputs["Roughness"])

    def put(sock, value):
        if sock in bsdf.inputs:
            bsdf.inputs[sock].default_value = value
        else:
            print(f"  film: Principled has no {sock!r}")

    put("Subsurface Weight", sss)
    # ⚠ THE SCALE HAS TO BE SHORT AGAINST THE SHEET, or there is no absorption.
    # A 0.4 mm lamina with a 1.4 mm mean free path passes nearly everything and
    # a backlit leaf comes out pale salmon — which is what "washed out" was.
    # Tissue is dense; the light that gets through has been through something.
    put("Subsurface Scale", sss_mm / 1000.0)
    put("IOR", 1.42)
    put("Coat Weight", coat)
    # A cuticle is waxy, not chrome. At 0.08 the stems rendered as black plastic
    # tubing with a mirror band down them.
    put("Coat Roughness", 0.22)
    put("Sheen Weight", 0.12)
    put("Specular IOR Level", 0.42)
    if "Subsurface Radius" in bsdf.inputs:
        # tissue transmits long wavelengths furthest — the reason a backlit
        # leaf of any colour goes warm at the edges
        bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.28, 0.12)

    # the vasculature's own light, exactly as `MESH_FS` adds it
    e3 = nt.nodes.new("ShaderNodeMath"); e3.operation = "MULTIPLY"
    e3.location = (-460, -420); e3.inputs[1].default_value = emis_mul
    nt.links.new(emi.outputs["Fac"], e3.inputs[0])
    ec = nt.nodes.new("ShaderNodeVectorMath"); ec.operation = "SCALE"
    ec.location = (-240, -420)
    nt.links.new(col.outputs["Color"], ec.inputs[0])
    nt.links.new(e3.outputs[0], ec.inputs["Scale"])
    nt.links.new(ec.outputs["Vector"], emit.inputs["Color"])
    emit.inputs["Strength"].default_value = 1.0

    nt.links.new(bsdf.outputs[0], add.inputs[0])
    nt.links.new(emit.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return mat


# The veins keep the reference match's additive emission — that is the identity
# and it is not up for negotiation — but gain a faint dielectric surface so they
# catch a highlight and read as wet strands rather than as drawn lines.
def vein_material(H, name="canalisation.vein", mul=1.0, body=0.10):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    col = nt.nodes.new("ShaderNodeAttribute"); col.attribute_name = "Col"
    col.location = (-600, 120)
    emi = nt.nodes.new("ShaderNodeAttribute"); emi.attribute_name = "emis"
    emi.location = (-600, -60)
    e = nt.nodes.new("ShaderNodeMath"); e.operation = "MULTIPLY"
    e.location = (-400, -60); e.inputs[1].default_value = mul
    nt.links.new(emi.outputs["Fac"], e.inputs[0])
    lit = nt.nodes.new("ShaderNodeVectorMath"); lit.operation = "SCALE"
    lit.location = (-200, 60)
    nt.links.new(col.outputs["Color"], lit.inputs[0])
    nt.links.new(e.outputs[0], lit.inputs["Scale"])

    em = nt.nodes.new("ShaderNodeEmission"); em.location = (60, 60)
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(lit.outputs["Vector"], em.inputs["Color"])

    gls = nt.nodes.new("ShaderNodeBsdfGlossy"); gls.location = (60, -140)
    gls.inputs["Roughness"].default_value = 0.22
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.location = (60, -320)
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.location = (280, -220)
    mix.inputs[0].default_value = body
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(gls.outputs[0], mix.inputs[2])

    add = nt.nodes.new("ShaderNodeAddShader"); add.location = (480, 0)
    nt.links.new(em.outputs[0], add.inputs[0])
    nt.links.new(mix.outputs[0], add.inputs[1])
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (680, 0)
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# the room
# ---------------------------------------------------------------------------
#
# CAMERA-RELATIVE, AND THAT IS NOT A STYLE CHOICE. The hero rig's lights were
# world-space first, which is fine at one azimuth and quietly wrong the moment
# the camera orbits: at azimuth 285 its "rim" had swung round to the front and
# become a second key, so every lighting judgement made at one angle was invalid
# at the next. Four stills at four azimuths did not show it. A turntable would
# have, instantly.
#
# BACKLIGHT LEADS. The leaf is now a real 0.4 mm sheet with real subsurface
# transport, and none of that is visible from the front. Held against a source,
# tissue glows and the vasculature reads as a tracery inside it — which is
# simultaneously the most beautiful thing a leaf does and the exact thing this
# project exists to show.
def _lamp(name, loc, energy, size, target, colour, in_air=False, kind="AREA"):
    lt = bpy.data.lights.get(name) or bpy.data.lights.new(name, kind)
    lt.type = kind
    lt.energy = energy
    lt.color = colour
    if kind == "AREA":
        lt.shape = "DISK"
        lt.size = size
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = ci._link(name, lt)
    ob.data = lt
    ci._aim(ob, Vector(loc), target)
    # A light strong enough to transilluminate a lamina also fills the volume.
    # The practicals shape tissue; only the plant's own emission is in the air.
    ob.visible_volume_scatter = in_air
    return ob


def _floor(ctr, radius, colour, roughness, drop=0.0, spec=0.12):
    name = "canalisation.floor"
    ob = bpy.data.objects.get(name)
    if ob:
        bpy.data.objects.remove(ob, do_unlink=True)
    me = bpy.data.meshes.new(name)
    r = radius
    me.from_pydata([(-r, -r, 0), (r, -r, 0), (r, r, 0), (-r, r, 0)], [], [(0, 1, 2, 3)])
    me.update()
    ob = ci._link(name, me)
    ob.location = (ctr.x, ctr.y, drop)
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); o.location = (300, 0)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (0, 0)
    b.inputs["Base Color"].default_value = (*colour, 1.0)
    b.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    nt.links.new(b.outputs[0], o.inputs["Surface"])
    ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------------------
# THE SKY, AND WHY A BLACK BACKGROUND IS A BLACK STEM
# ---------------------------------------------------------------------------
#
# IN THE BROWSER THE BACKGROUND IS A BACKDROP. IN A PATH TRACER IT IS A LIGHT.
# That one sentence is the whole of this function, and missing it cost a look.
#
# The film rig shipped with `ambient=0.012` on a world colour of `bgTop * 3`
# (~0.09 for an Ember Creeper), so the environment contributed about 0.001 —
# there was effectively no sky. Every photon in the frame came from four lamps,
# three of them behind the subject. A stem whose albedo is [0.16, 0.06, 0.05]
# with nothing on its camera-facing side renders exactly what it should: a flat
# black worm. Side by side against `--look shipped` the same stem is a lit,
# rounded, warm tube. The background and the stem were one bug.
#
# What the shipped renderer actually does is TWO things with two different
# colours, and it is worth being precise about which:
#
#   BG_FS    mix(bgBot, bgTop, pow(uv.y, 0.75)) + bgGlow * exp(-d * 2.1)
#            — the backdrop. What the eye sees where the plant is not.
#   MESH_FS  amb = mix(ambBot, ambTop, N.y * 0.5 + 0.5)
#            — an ambient term BY NORMAL, added to every surface before the key.
#            It is an unlit cheat and it is why nothing in the browser is ever
#            unlit: a tube gets top-light and bottom-shadow wherever the key is.
#
# A path tracer can hold that split exactly, with `Is Camera Ray`: camera rays
# get the backdrop, every other ray gets the ambient. That is the standard
# background/lighting separation every renderer has, and here it is not an
# invention — it reproduces a term the shipped shader already carries, in the
# palette's own numbers. `ambTop`/`ambBot` were already in the export header.
#
# ⚠ THE BACKDROP MOVES OUT OF THE COMPOSITOR WHEN THIS IS ON. A screen-space
# card behind a real volume does not compose: the haze would sit in front of a
# flat sheet with nothing to attenuate. So `film()` turns `film_transparent`
# off and tells `grade()` to skip its own background when the sky is real.
def _sky(H, azimuth, elevation=-0.04, sky=1.0, glow=1.0, glow_tight=2.4,
         glow_elev=0.12, horizon=-0.30, zenith=0.90, backdrop=1.0):
    """The world as a light and a backdrop at once. Returns the Background node."""
    pal = H.get("palette", {})
    sc = bpy.context.scene
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputWorld"); out.location = (1400, 0)
    bg = nt.nodes.new("ShaderNodeBackground"); bg.location = (1200, 100)
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs[0], out.inputs["Surface"])

    # In a world shader `Generated` is the direction the ray is travelling.
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.location = (-1000, 0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-820, 0)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])

    # ⚠ TWO GRADIENTS, NOT ONE, AND COLLAPSING THEM COST A LADDER OF RENDERS.
    # `BG_FS` gradients on SCREEN HEIGHT (`pow(uv.y, 0.75)`); `MESH_FS`
    # gradients on the SURFACE NORMAL (`N.y * 0.5 + 0.5`). Those are different
    # functions of different things and they only look alike written down.
    #
    # It matters most for exactly the thing that was broken: a stem is vertical,
    # so its normals are HORIZONTAL, so in the browser it samples the precise
    # midpoint of ambBot->ambTop. Mapped through a photographic horizon at
    # -0.30 it samples t = 0.25 instead — near ambBot — and every stem in the
    # frame stayed black while the sky knob appeared to do nothing. Raising the
    # knob to an absurd 40 was what proved the link was live and the mapping
    # wrong, which is the fish-scale lesson again: when four values of a knob
    # give one picture, stop tuning it and go and find what you are not moving.
    #
    # So the ambient runs -1..1 — `N.y * 0.5 + 0.5` exactly — and the backdrop
    # keeps the photographic horizon, which is what a camera sees.
    tv = nt.nodes.new("ShaderNodeMapRange"); tv.location = (-640, 120)
    tv.inputs["From Min"].default_value = horizon
    tv.inputs["From Max"].default_value = zenith
    tv.clamp = True
    nt.links.new(sep.outputs["Z"], tv.inputs["Value"])

    ta = nt.nodes.new("ShaderNodeMapRange"); ta.location = (-640, -120)
    ta.inputs["From Min"].default_value = -1.0
    ta.inputs["From Max"].default_value = 1.0
    ta.clamp = True
    nt.links.new(sep.outputs["Z"], ta.inputs["Value"])

    def ramp(lo, hi, mul, y, t=None):
        """lo + t * (hi - lo), all VectorMath — see `_vm`'s note on Mix."""
        a = [c * mul for c in lo]
        b = [c * mul for c in hi]
        d = look._vm(nt, "SUBTRACT", (-440, y), a=b, b=a)
        s = look._vm(nt, "SCALE", (-260, y))
        nt.links.new(d.outputs["Vector"], s.inputs[0])
        nt.links.new((t or tv).outputs["Result"], s.inputs["Scale"])
        add = look._vm(nt, "ADD", (-80, y), b=a)
        nt.links.new(s.outputs["Vector"], add.inputs[0])
        return add

    # the backdrop the eye sees, and the ambient every surface is shaded by
    seen = ramp(pal.get("bgBot", [0, 0, 0]), pal.get("bgTop", [0, 0, 0]),
                backdrop, 260, tv)
    amb = ramp(pal.get("ambBot", [0, 0, 0]), pal.get("ambTop", [0, 0, 0]),
               sky, -260, ta)

    # `bgGlow` as a real lobe in the world rather than a smear in the
    # compositor, aimed through the subject and away from the camera — which is
    # where `BG_FS` puts it, and which is also what backlights a silhouette.
    a = np.radians(azimuth)
    gd = Vector((-np.sin(a), np.cos(a), glow_elev)).normalized()
    dot = look._vm(nt, "DOT_PRODUCT", (-640, 460), b=tuple(gd))
    nt.links.new(tc.outputs["Generated"], dot.inputs[0])
    mx = look._m(nt, "MAXIMUM", (-460, 460), b=0.0)
    nt.links.new(dot.outputs["Value"], mx.inputs[0])
    pw = look._m(nt, "POWER", (-280, 460), b=glow_tight)
    nt.links.new(mx.outputs[0], pw.inputs[0])
    gc = look._vm(nt, "SCALE", (-100, 460),
                  a=[c * glow for c in pal.get("bgGlow", [0, 0, 0])])
    nt.links.new(pw.outputs[0], gc.inputs["Scale"])
    lit = look._vm(nt, "ADD", (120, 360))
    nt.links.new(seen.outputs["Vector"], lit.inputs[0])
    nt.links.new(gc.outputs["Vector"], lit.inputs[1])

    # camera rays -> backdrop, everything else -> ambient.
    lp = nt.nodes.new("ShaderNodeLightPath"); lp.location = (300, 620)
    diff = look._vm(nt, "SUBTRACT", (500, 200))
    nt.links.new(lit.outputs["Vector"], diff.inputs[0])
    nt.links.new(amb.outputs["Vector"], diff.inputs[1])
    sel = look._vm(nt, "SCALE", (700, 200))
    nt.links.new(diff.outputs["Vector"], sel.inputs[0])
    nt.links.new(lp.outputs["Is Camera Ray"], sel.inputs["Scale"])
    fin = look._vm(nt, "ADD", (900, 100))
    nt.links.new(sel.outputs["Vector"], fin.inputs[0])
    nt.links.new(amb.outputs["Vector"], fin.inputs[1])
    nt.links.new(fin.outputs["Vector"], bg.inputs["Color"])
    return bg


# ⚠ AND IT SHIPS AT ZERO, because an UNBOUNDED volume cannot be atmosphere.
# Optical depth to the background is `density * distance`, and a world volume has
# no far wall, so the distance is infinite and the sky is ALWAYS fully scattered:
# every camera ray terminates in fog. Two ladders came back as flat tan walls
# before that arithmetic got done — the first blamed on the backdrop, the second
# on `haze_lit` (real, a 434 W backlight made visible to the volume), and neither
# was the whole story. Density only changes HOW FAST it saturates, never whether.
#
# `haze_lit` is off for the same reason the original comment gave: a light strong
# enough to transilluminate a 0.4 mm lamina will also light the whole sky.
#
# What the frame actually wanted from haze — separation of a dark subject, and a
# background that is not black — the SKY does, and does without a boundary. Real
# depth should come from things at real distances, which is what `GARDEN=` in
# `blender_export.mjs` is for. If you want atmosphere back, it needs a FINITE
# volume whose far wall is behind everything the camera can see, and then the
# wall itself is the thing to go looking for in the frame.
#
# THE AIR IS THE WORLD'S VOLUME, NOT A BOX. It was a box first, and a box has
# EDGES: the first film render came back with a hard dark band ruled straight
# across the middle of the frame, which is the top face of the haze cube seen
# from inside. Scaling it up only moves the seam. A world volume has no boundary
# to find, costs the same, and cannot be walked out of by a camera move.
def _air(density, colour, anisotropy=0.55):
    world = bpy.context.scene.world
    wt = world.node_tree
    o = next((n for n in wt.nodes if n.type == "OUTPUT_WORLD"), None)
    if o is None:
        return None
    s = wt.nodes.new("ShaderNodeVolumeScatter"); s.location = (100, -260)
    s.inputs["Color"].default_value = (*colour, 1.0)
    s.inputs["Density"].default_value = density
    s.inputs["Anisotropy"].default_value = anisotropy
    wt.links.new(s.outputs[0], o.inputs["Volume"])
    return s


# ---------------------------------------------------------------------------
# the grade
# ---------------------------------------------------------------------------
#
# AgX rather than the browser's ACES fit, and the `bgGlow` halo kept. The fit in
# `COMP_FS` is a 1-D curve that clamps at 1.0; it is a good answer for an LDR
# rasteriser and it crushes a path tracer's highlights, which here are the whole
# vasculature. AgX rolls those off with hue preserved. Everything else about the
# shipped grade — the halo, the bloom, `1 - vig*dot(d,d)*1.6`, the grain — is
# kept, because that IS the piece's look and it survives a better transform.
def grade(H, bloom=0.30, thresh=1.0, size=9.0, streaks=0.04,
          vignette=0.55, grain=0.012, dispersion=0.004, background=True):
    pal = H.get("palette", {})
    sc = bpy.context.scene
    sc.use_nodes = True
    g = bpy.data.node_groups.get("canalisation.film")
    if g is None:
        g = bpy.data.node_groups.new("canalisation.film", "CompositorNodeTree")
    g.nodes.clear()
    for item in list(g.interface.items_tree):
        g.interface.remove(item)
    g.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    sc.compositing_node_group = g

    src = g.nodes.new("CompositorNodeRLayers"); src.location = (-1000, 0)
    out = g.nodes.new("NodeGroupOutput"); out.location = (1600, 0)

    # ⚠ its Image input is where it gets the domain; unlinked, every output is
    # zero and the failure is a flat frame with no error
    crd = g.nodes.new("CompositorNodeImageCoordinates"); crd.location = (-1000, -700)
    g.links.new(src.outputs["Image"], crd.inputs["Image"])
    csep = g.nodes.new("ShaderNodeSeparateXYZ"); csep.location = (-840, -700)
    g.links.new(crd.outputs["Normalized"], csep.inputs[0])

    def mix(bt, loc, fac=1.0, b=None):
        n = g.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"; n.blend_type = bt; n.location = loc
        _sock(n.inputs, "Factor_Float").default_value = fac
        if b is not None:
            _sock(n.inputs, "B_Color").default_value = (*b, 1.0)
        return n

    def m(op, loc, a=None, b=None, c=None):
        n = g.nodes.new("ShaderNodeMath"); n.operation = op; n.location = loc
        for i, v in enumerate((a, b, c)):
            if v is not None:
                n.inputs[i].default_value = v
        return n

    def menu(node, socket, value):
        try:
            node.inputs[socket].default_value = value
        except Exception as exc:                                   # noqa: BLE001
            print(f"  film grade: {socket}={value!r} refused ({exc})")

    head = src.outputs["Image"]
    if background:
        # BG_FS, exactly: a vertical gradient plus a screen-space halo behind
        # the specimen. `bgGlow` is most of why the browser's frame is a warm
        # field rather than black, and no world shader can express it — it is
        # not a direction, it is a place in the picture.
        bot = ci.bg_colour(H); top = pal.get("bgTop") or bot
        glow = pal.get("bgGlow") or [0, 0, 0]
        gy = m("POWER", (-680, -640), b=0.75); gy.use_clamp = True
        g.links.new(csep.outputs["Y"], gy.inputs[0])
        grad = mix("MIX", (-500, -640), b=tuple(top))
        _sock(grad.inputs, "A_Color").default_value = (*bot, 1.0)
        g.links.new(gy.outputs[0], _sock(grad.inputs, "Factor_Float"))
        gx = m("MULTIPLY_ADD", (-680, -820), b=2.0, c=-1.0)
        g.links.new(csep.outputs["X"], gx.inputs[0])
        gyy = m("MULTIPLY_ADD", (-680, -920), b=2.5, c=-1.10)
        g.links.new(csep.outputs["Y"], gyy.inputs[0])
        x2 = m("MULTIPLY", (-520, -820)); g.links.new(gx.outputs[0], x2.inputs[0]); g.links.new(gx.outputs[0], x2.inputs[1])
        y2 = m("MULTIPLY", (-520, -920)); g.links.new(gyy.outputs[0], y2.inputs[0]); g.links.new(gyy.outputs[0], y2.inputs[1])
        s2 = m("ADD", (-360, -870)); g.links.new(x2.outputs[0], s2.inputs[0]); g.links.new(y2.outputs[0], s2.inputs[1])
        dd = m("SQRT", (-200, -870)); g.links.new(s2.outputs[0], dd.inputs[0])
        nd = m("MULTIPLY", (-40, -870), b=-2.1); g.links.new(dd.outputs[0], nd.inputs[0])
        ex = m("EXPONENT", (120, -870)); g.links.new(nd.outputs[0], ex.inputs[0])
        halo = mix("MULTIPLY", (280, -870), b=tuple(glow))
        g.links.new(ex.outputs[0], _sock(halo.inputs, "A_Color"))
        bgc = mix("ADD", (440, -720))
        g.links.new(_sock(grad.outputs, "Result_Color"), _sock(bgc.inputs, "A_Color"))
        g.links.new(_sock(halo.outputs, "Result_Color"), _sock(bgc.inputs, "B_Color"))
        # by NAME — 5.x is (Background, Foreground, Factor) and was not
        over = g.nodes.new("CompositorNodeAlphaOver"); over.location = (-820, -300)
        g.links.new(_sock(bgc.outputs, "Result_Color"), over.inputs["Background"])
        g.links.new(src.outputs["Image"], over.inputs["Foreground"])
        head = over.outputs["Image"]

    fg = g.nodes.new("CompositorNodeGlare"); fg.location = (-600, 0)
    menu(fg, "Type", "Fog Glow"); menu(fg, "Quality", "High")
    fg.inputs["Threshold"].default_value = thresh
    fg.inputs["Strength"].default_value = bloom
    fg.inputs["Size"].default_value = size
    g.links.new(head, fg.inputs["Image"])

    st = g.nodes.new("CompositorNodeGlare"); st.location = (-380, 0)
    menu(st, "Type", "Streaks"); menu(st, "Quality", "High")
    st.inputs["Threshold"].default_value = thresh + 0.4
    st.inputs["Strength"].default_value = streaks
    st.inputs["Streaks"].default_value = 6
    st.inputs["Size"].default_value = 6.0
    g.links.new(fg.outputs["Image"], st.inputs["Image"])

    ld = g.nodes.new("CompositorNodeLensdist"); ld.location = (-160, 0)
    ld.inputs["Dispersion"].default_value = dispersion
    if "Fit" in ld.inputs:
        ld.inputs["Fit"].default_value = True
    g.links.new(st.outputs["Image"], ld.inputs["Image"])

    # the real expression, not an ellipse mask
    dx = m("SUBTRACT", (200, -360), b=0.5); g.links.new(csep.outputs["X"], dx.inputs[0])
    dy = m("SUBTRACT", (200, -500), b=0.5); g.links.new(csep.outputs["Y"], dy.inputs[0])
    xx = m("MULTIPLY", (360, -360)); g.links.new(dx.outputs[0], xx.inputs[0]); g.links.new(dx.outputs[0], xx.inputs[1])
    yy = m("MULTIPLY", (360, -500)); g.links.new(dy.outputs[0], yy.inputs[0]); g.links.new(dy.outputs[0], yy.inputs[1])
    r2 = m("ADD", (520, -420)); g.links.new(xx.outputs[0], r2.inputs[0]); g.links.new(yy.outputs[0], r2.inputs[1])
    vf = m("MULTIPLY_ADD", (680, -420), b=-vignette * 1.6, c=1.0)
    g.links.new(r2.outputs[0], vf.inputs[0])
    vig = mix("MULTIPLY", (880, 0))
    g.links.new(ld.outputs["Image"], _sock(vig.inputs, "A_Color"))
    g.links.new(vf.outputs[0], _sock(vig.inputs, "B_Color"))
    tail = vig

    if grain > 0:
        px = g.nodes.new("ShaderNodeVectorMath"); px.operation = "MULTIPLY"
        px.location = (880, -620)
        px.inputs[1].default_value = (1920.0, 1440.0, 1.0)
        g.links.new(crd.outputs["Normalized"], px.inputs[0])
        wn = g.nodes.new("ShaderNodeTexWhiteNoise"); wn.location = (1060, -620)
        g.links.new(px.outputs["Vector"], wn.inputs["Vector"])
        gv = m("MULTIPLY_ADD", (1240, -620), b=grain, c=-0.5 * grain)
        g.links.new(wn.outputs["Value"], gv.inputs[0])
        ga = mix("ADD", (1400, 0))
        g.links.new(_sock(vig.outputs, "Result_Color"), _sock(ga.inputs, "A_Color"))
        g.links.new(gv.outputs[0], _sock(ga.inputs, "B_Color"))
        tail = ga

    g.links.new(_sock(tail.outputs, "Result_Color"), out.inputs[0])
    return g


# ---------------------------------------------------------------------------
def film(H, res=(3200, 4000), samples=1024, adaptive=0.004, lens=100.0,
         fstop=4.0, azimuth=105.0, elevation=-0.04, margin=1.12, trim=0.02,
         back=90.0, key=6.0, edge=18.0, bounce=1.5, ambient=0.012,
         haze=0.0, haze_lit=False, ground=True, ground_drop=0.0,
         ground_rough=0.86, ground_spec=0.08, dome_mul=1.0,
         sky=12.0, sky_glow=1.0, glow_tight=2.4, backdrop=1.0, sky_bg=True,
         sss=0.62, sss_mm=1.4, coat=0.32, tint=1.35, emis_mul=3.0,
         vein_mul=1.0, vein_scale=1.0, px_floor=1.5, px_ref=2500.0,
         do_grade=True, exposure=0.0,
         span=None, pivot=None,
         look_transform="AgX", contrast="AgX - Medium High Contrast"):
    """Everything. Returns the camera."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = adaptive
    sc.cycles.use_denoising = True
    # A 0.4 mm sheet with subsurface needs the rays to survive crossing it, and
    # the volume needs enough bounces to be air rather than fog on a card.
    sc.cycles.max_bounces = 24
    sc.cycles.transmission_bounces = 24
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.volume_bounces = 4
    sc.cycles.use_light_tree = True
    sc.cycles.blur_glossy = 1.0
    sc.render.filter_size = 1.6
    sc.view_settings.view_transform = look_transform
    try:
        sc.view_settings.look = contrast
    except Exception:                                              # noqa: BLE001
        sc.view_settings.look = "None"
    sc.view_settings.exposure = exposure
    if hasattr(sc, "cycles_curves"):
        # RIBBONS is a camera-facing sheet — the exact artefact the curve
        # export exists to delete
        sc.cycles_curves.shape = "THICK"
    # ⚠ A REAL SKY HAS TO BE PHOTOGRAPHED, NOT COMPOSITED. With `sky_bg` the
    # world is the visible background, so the film is opaque and `grade()` skips
    # its own card — a screen-space backdrop behind a real volume does not
    # compose, because the haze would sit in front of a flat sheet with nothing
    # to attenuate and the ground would have no horizon to fade into.
    sc.render.film_transparent = bool(do_grade) and not sky_bg

    for junk in ("Cube", "Light", "canalisation.key", "canalisation.fill",
                 "canalisation.rim", "canalisation.ground", "canalisation.air"):
        ob = bpy.data.objects.get(junk)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)

    pal = H.get("palette", {})
    obs = [bpy.data.objects[n] for n in H.get("_objects", [])
           if n in bpy.data.objects]
    lo, hi = hero.geo_bounds(obs, trim=trim)
    ctr = (lo + hi) * 0.5
    height = max(hi.z - lo.z, 0.1)
    width = max(hi.x - lo.x, hi.y - lo.y, 0.1)
    r = max(width, height)

    # camera first: the width floor is a PIXEL floor and needs the framing
    cam = bpy.data.objects.get("canalisation.cam")
    if cam is None:
        cam = ci._link("canalisation.cam", bpy.data.cameras.new("canalisation.cam"))
    cam.data.lens = lens
    cam.data.sensor_fit = "HORIZONTAL"      # AUTO fits the LONGER image axis
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    cam.data.dof.aperture_blades = 7
    sc.camera = cam
    # FRAMING. `span` is how many metres of subject the frame holds vertically;
    # `pivot` is what it holds. Both default to the whole specimen, and both
    # exist because everything expensive in this rig — a 0.4 mm sheet, the
    # areole relief, real subsurface transport, the vein tracery — is invisible
    # at whole-plant framing. A 13 cm leaf across 4000 pixels of a 2.7 m plant
    # is 200 pixels; the same leaf framed at 0.3 m is most of the picture.
    if pivot is not None:
        ctr = Vector(tuple(pivot))
    if span:
        height = float(span)
        width = height * res[0] / res[1]
    # ⚠ AND `r` HAS TO FOLLOW THE SUBJECT, NOT THE SET. Every light below is
    # placed at a multiple of `r` and powered at `r * r`, so `r` is "how big is
    # the thing being lit". Left at the whole scene's extent it is the size of
    # the CLEARING the moment a garden is exported — a stand 150 units across
    # puts the key nine metres from a plant that is three, and the hero gets the
    # same flat wash as everything behind it. `span`/`pivot` say what the
    # subject is; this is the half of that statement the lights need.
    r = max(width, height)
    fit_v = height * res[0] / res[1]
    dist = max(fit_v, width) * (lens / cam.data.sensor_width) * margin
    a = np.radians(azimuth)
    eye = Vector((ctr.x + dist * np.sin(a),
                  ctr.y - dist * np.cos(a),
                  ctr.z + dist * elevation))
    focus = ci._aim(cam, eye, ctr)
    cam["pivot"] = list(ctr); cam["dist"] = dist; cam["elev"] = elevation

    # ⚠ THE WIDTH FLOOR IS A PIXEL FLOOR, SO A PREVIEW IS A DIFFERENT PLANT.
    #
    # `70_app.js` floors a vein at 1.5 px of the CANVAS it is drawing into, and
    # that canvas is about a thousand pixels tall. Carried across as a literal
    # 1.5 px of the RENDER, a 4000-pixel frame floors the same vein four times
    # thinner: measured on this stand, 6.73 mm at 720x900 against 1.51 mm at
    # 3200x4000, with 100% of strand ends sitting at the floor in BOTH. Every
    # look decision in a ladder of previews was therefore taken on veins 4.5x
    # fatter than the deliverable, and the 4K frame came back papery with the
    # tracery gone faint — which reads as a sampling or a material problem and
    # is neither.
    #
    # So the floor is scaled to the shipped canvas rather than to this frame:
    # a hero render is a photograph of what the browser shows, and the browser
    # shows 1.5 px of ~1000. `px_ref=0` opts out and gives literal render
    # pixels back, which is the right thing for judging the true hierarchy and
    # the wrong thing for judging the look.
    #
    # 2500 IS SET BY EYE AND IS THE ONLY NUMBER HERE THAT COULD NOT BE COMPUTED,
    # the same category as the wind's `uRef`. Bracketed at 4K on this stand:
    # 1.51 mm is papery and the tracery vanishes, 6.05 mm merges the marginal
    # veins into a crust along every leaf edge, 2.42 mm reads as tissue. And the
    # bracket is why a preview cannot settle it — at 720x900 the 6 mm version
    # looked RIGHT, because a whole leaf is 90 pixels there and the sampler was
    # doing the blending that the veins are supposed to do.
    eff = px_floor * (res[1] / px_ref if px_ref else 1.0)
    look.floor_radii(obs, focus, lens, cam.data.sensor_width, res[0], eff)
    scale_radii(obs, vein_scale)
    prep(H, dome_mul=dome_mul)
    leaf_material(H, sss=sss, sss_mm=sss_mm, coat=coat, tint=tint,
                  emis_mul=emis_mul)
    vein_material(H, mul=vein_mul)

    def place(off_deg, elev, dist_mul):
        aa = np.radians(azimuth + off_deg)
        return (ctr.x + r * dist_mul * np.sin(aa),
                ctr.y - r * dist_mul * np.cos(aa),
                ctr.z + r * elev)

    # BACKLIGHT LEADS — see the note above `_lamp`. Big, low, warm, and behind.
    # `haze_lit` is what turns the air from a grey lift into shafts: the back
    # light is the only one with the subject between it and the camera, so it
    # is the only one whose beam can be broken by the plant.
    _lamp("canalisation.back", place(178.0, 0.10, 1.9), back * r * r, r * 1.5,
          ctr, (1.0, 0.52, 0.26), in_air=haze_lit)
    # a small hard key just off-axis, to keep the stems from going to silhouette
    _lamp("canalisation.key", place(52.0, 0.62, 2.2), key * r * r, r * 0.55,
          ctr, (1.0, 0.84, 0.72))
    # a cool edge from behind the other shoulder — the only cool thing in the
    # frame, and what stops a warm palette reading as one flat colour
    _lamp("canalisation.edge", place(-136.0, 0.48, 2.0), edge * r * r, r * 0.9,
          ctr, (0.44, 0.62, 1.0))
    # ⚠ A SOFT BOUNCE, KEPT ABOVE THE FLOOR. This sat at elevation -0.55, which
    # is BELOW the plant's base, so it lit the ground plane at a grazing angle
    # from underneath and turned it into a white pool with a hard horizon ruled
    # across the frame. A fill light placed relative to the SUBJECT still has to
    # be checked against the ROOM.
    _lamp("canalisation.bounce", place(20.0, 0.06, 2.4), bounce * r * r, r * 2.4,
          ctr, (1.0, 0.62, 0.44))

    bg = ci.bg_colour(H)
    if sky > 0 or sky_bg:
        _sky(H, azimuth, elevation=elevation, sky=sky, glow=sky_glow,
             glow_tight=glow_tight, backdrop=backdrop)
    else:
        world = sc.world or bpy.data.worlds.new("World")
        sc.world = world
        world.use_nodes = True
        wt = world.node_tree; wt.nodes.clear()
        wo = wt.nodes.new("ShaderNodeOutputWorld"); wo.location = (300, 0)
        wb = wt.nodes.new("ShaderNodeBackground"); wb.location = (100, 0)
        wb.inputs[0].default_value = (*[c * 3.0 for c in bg], 1.0)
        wb.inputs[1].default_value = ambient
        wt.links.new(wb.outputs[0], wo.inputs["Surface"])

    if ground:
        # ⚠ ROUGH, AND THAT IS THE WHOLE FIGHT. This shipped at 0.42 and the
        # ground came back a blown white pool three renders running — with an
        # albedo of 0.005, which cannot produce white by diffuse means at any
        # light level. It is the SPECULAR: a low backlight behind the subject
        # reflects off a smooth plane at grazing incidence, where Fresnel goes
        # to one regardless of how dark the surface is. A dark floor is not a
        # dim floor. Roughness and a low specular level are what make it dim.
        # FAR ENOUGH THAT ITS EDGE IS BEHIND THE FOG. At r*30 the quad ended
        # at ~80 m, unlit, and ruled a hard black band across the frame between
        # the lit near ground and the sky. A horizon is supposed to be where the
        # air runs out, not where the geometry does.
        _floor(ctr, r * 400.0, [c * 0.9 for c in bg], ground_rough,
               drop=lo.z + ground_drop, spec=ground_spec)
    if haze > 0:
        vein = pal.get("vein", [1.0, 0.6, 0.4])
        _air(haze, [min(1.0, c * 1.4 + 0.2) for c in vein])

    if do_grade:
        grade(H, background=not sky_bg)

    print(f"  film: {height:.2f} m at {focus:.2f} m, {lens:.0f}mm f/{fstop}, "
          f"{res[0]}x{res[1]} @ {samples} spp (adaptive {adaptive}), "
          f"{look_transform}")
    return cam
