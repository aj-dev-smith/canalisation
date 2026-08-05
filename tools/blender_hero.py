# THE HERO SHOT. Art direction, kept deliberately out of `blender_import.py`.
#
#   import importlib.util as u
#   s = u.spec_from_file_location("hero", ".../tools/blender_hero.py")
#   h = u.module_from_spec(s); s.loader.exec_module(h)
#   H = h.ci.build(".../export/ember_creeper_7_natural", vein_emis_mul=8.0)
#   h.hero(H); h.ci.render(".../shots/ember.png", samples=768)
#
# `blender_import.setup_scene` is a NEUTRAL framing: three area lights, a flat
# background, nothing that expresses a point of view. That is right for checking
# an import and wrong for a picture. This file is the point of view, and it is
# separate so that a look-dev decision can never be mistaken for a fidelity one.
#
# THE ONE IDEA HERE: THE PLANT IS THE LIGHT SOURCE.
#
# `60_render.js` draws every vein as emission — `vec3 c = vC * vE` — and that is
# the piece's whole thesis made visible: the vasculature is the chemistry, and
# it is the brightest thing in the plant on purpose (`makeSpecimen` pulls the
# lamina DOWN by `laminaMul` so the veins win). A rasteriser can only add that
# light to the pixels it covers. A path tracer can let it leave the plant — light
# the tissue in front of it, scatter in the air around it, fall on the ground
# beneath it. So the rig here is not a studio with a plant in it. It is a dark
# room with a plant that glows, plus the minimum needed to read the silhouette.
#
# Everything below is a lighting choice and none of it touches geometry. The
# geometry came from `drawSpecimen` and cannot be edited from here.

import bpy
import numpy as np
from mathutils import Vector

import sys
ci = sys.modules.get("ci")          # blender_import, loaded by the caller


# `ShaderNodeMix` carries a full set of sockets for every data type it can
# handle, and they SHARE DISPLAY NAMES — there are four inputs called "A" and
# three outputs called "Result", distinguished only by identifier
# (`A_Float`, `A_Color`, ...). `node.inputs["A"]` silently returns the first,
# which is the float one, so a colour graph written by name compiles, links,
# renders, and is wrong. That is how the grade came out pure white and how the
# leaf's translucent branch was reading a scalar. Always by identifier.
def _sock(group, ident):
    for s in group:
        if s.identifier == ident:
            return s
    raise KeyError(f"no socket {ident!r} in {[s.identifier for s in group]}")


# ---------------------------------------------------------------------------
# a leaf that lets light through
# ---------------------------------------------------------------------------
#
# `blender_import` gives the lamina a Principled BSDF with some subsurface,
# which is the honest neutral choice. A leaf is better than that: it is a sheet
# a fraction of a millimetre thick, and the thing that makes leaves read as
# leaves rather than as painted card is that you can see the light coming
# THROUGH one when it is between you and a source.
#
# `Add(Mix(Principled, Translucent), Emission)` — the mix is the front/back
# split, the add keeps the vein glow exact rather than halving it through the
# mix. Emission is a separate branch for the same reason it is in `_additive`:
# `vC * vE` is a quantity the renderer computes, and it should survive.
def leaf_material(name="canalisation.surface", translucency=0.42, emis_mul=1.5,
                  roughness=0.34, sheen=0.25):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (900, 0)
    add = nt.nodes.new("ShaderNodeAddShader"); add.location = (700, 0)
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.location = (500, 120)
    mix.inputs[0].default_value = translucency
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled"); bsdf.location = (260, 260)
    trans = nt.nodes.new("ShaderNodeBsdfTranslucent"); trans.location = (260, -80)
    emit = nt.nodes.new("ShaderNodeEmission"); emit.location = (500, -260)

    col = nt.nodes.new("ShaderNodeAttribute"); col.attribute_name = "Col"
    col.location = (-420, 200)
    em = nt.nodes.new("ShaderNodeAttribute"); em.attribute_name = "emis"
    em.location = (-420, -260)
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = emis_mul; mul.location = (-200, -260)

    # The back of a leaf is lit by what came through it, so the translucent
    # branch is the same colour opened up a little — light that has been through
    # tissue is warmer and brighter than the tissue's own albedo.
    warm = nt.nodes.new("ShaderNodeMix"); warm.data_type = "RGBA"
    warm.blend_type = "MULTIPLY"; warm.location = (-200, -40)
    _sock(warm.inputs, "Factor_Float").default_value = 1.0
    _sock(warm.inputs, "B_Color").default_value = (1.55, 1.25, 1.10, 1.0)

    nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(col.outputs["Color"], _sock(warm.inputs, "A_Color"))
    nt.links.new(_sock(warm.outputs, "Result_Color"), trans.inputs["Color"])
    nt.links.new(col.outputs["Color"], emit.inputs["Color"])
    nt.links.new(em.outputs["Fac"], mul.inputs[0])
    nt.links.new(mul.outputs["Value"], emit.inputs["Strength"])
    nt.links.new(bsdf.outputs["BSDF"], mix.inputs[1])
    nt.links.new(trans.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], add.inputs[0])
    nt.links.new(emit.outputs["Emission"], add.inputs[1])
    nt.links.new(add.outputs["Shader"], out.inputs["Surface"])

    def setif(k, v):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    setif("Roughness", roughness)
    setif("IOR", 1.42)
    setif("Sheen Weight", sheen)
    setif("Sheen Roughness", 0.35)
    # A lamina IS a thin wall — one sheet of triangles standing in for an organ
    # with two epidermes and a mesophyll between them. Telling Cycles that is
    # what stops the translucent branch behaving like a solid.
    setif("Thin Wall", True)

    # the two-sided normal, i.e. `60_render.js` line 99 — see blender_import
    geo = nt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-420, -560)
    d = nt.nodes.new("ShaderNodeVectorMath"); d.operation = "DOT_PRODUCT"
    d.location = (-200, -560)
    sgn = nt.nodes.new("ShaderNodeMath"); sgn.operation = "SIGN"
    sgn.location = (-20, -560)
    flip = nt.nodes.new("ShaderNodeVectorMath"); flip.operation = "SCALE"
    flip.location = (150, -560)
    nt.links.new(geo.outputs["Normal"], d.inputs[0])
    nt.links.new(geo.outputs["Incoming"], d.inputs[1])
    nt.links.new(d.outputs["Value"], sgn.inputs[0])
    nt.links.new(geo.outputs["Normal"], flip.inputs[0])
    nt.links.new(sgn.outputs["Value"], flip.inputs["Scale"])
    nt.links.new(flip.outputs["Vector"], bsdf.inputs["Normal"])
    return mat


# ---------------------------------------------------------------------------
# where the plant actually is
# ---------------------------------------------------------------------------
#
# A BOUNDING BOX IS THE WRONG THING TO FRAME. `blender_import.setup_scene` uses
# one, which is fine for a check and wrong for a picture: an Ember Creeper is a
# sprawling, leaning thing whose extremes are three outlying leaves on long
# petioles, so the box centre lands in empty air beside the plant and the camera
# dutifully points at nothing. The first close crop put the entire specimen in
# the left third of the frame with the right two thirds empty floor.
#
# Percentiles of the actual drawn points instead. `trim=0.02` throws away the
# outermost 2% at each end, which is the outlying-leaf case exactly, and leaves
# the mass of the plant — the thing a person would say the plant IS.
def geo_bounds(objs, trim=0.02):
    pts = []
    for ob in objs:
        d = ob.data
        if ob.type == "MESH":
            a = np.empty(len(d.vertices) * 3, dtype="f8")
            d.vertices.foreach_get("co", a)
        elif ob.type in {"CURVES", "POINTCLOUD"}:
            n = len(d.points)
            a = np.empty(n * 3, dtype="f8")
            d.attributes["position"].data.foreach_get("vector", a)
        else:
            continue
        pts.append(a.reshape(-1, 3))
    if not pts:
        return Vector((0, 0, 0)), Vector((1, 1, 1))
    p = np.concatenate(pts)
    lo = np.percentile(p, trim * 100.0, axis=0)
    hi = np.percentile(p, 100.0 - trim * 100.0, axis=0)
    return Vector(lo.tolist()), Vector(hi.tolist())


# ---------------------------------------------------------------------------
# the room
# ---------------------------------------------------------------------------
def _ground(ctr, radius, colour, roughness=0.92):
    me = bpy.data.objects.get("canalisation.ground")
    if me is None:
        bpy.ops.mesh.primitive_plane_add(size=1.0)
        me = bpy.context.object
        me.name = "canalisation.ground"
    me.scale = (radius, radius, 1.0)
    me.location = (ctr.x, ctr.y, 0.0)

    mat = bpy.data.materials.get("canalisation.ground") or \
        bpy.data.materials.new("canalisation.ground")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (400, 0)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); b.location = (140, 0)
    b.inputs["Base Color"].default_value = (*colour, 1.0)
    b.inputs["Roughness"].default_value = roughness
    # Something for the light to catch, so the floor is a surface rather than a
    # gradient. Scaled off the plant, not off a magic number.
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.location = (-320, -180)
    noise.inputs["Scale"].default_value = 6.0 / max(radius, 1e-3) * 40.0
    noise.inputs["Detail"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump"); bump.location = (-100, -180)
    bump.inputs["Strength"].default_value = 0.25
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    me.data.materials.clear()
    me.data.materials.append(mat)
    return me


def _air(ctr, radius, height, density, colour, anisotropy=0.35):
    """A box of participating medium around the specimen.

    THE AIR IS WHY THIS IS WORTH PATH TRACING. Vein emission in a rasteriser
    can only brighten the pixels the vein covers; here it leaves the plant and
    scatters, so a dense corner of the vein network reads as a glow in the air
    around it and the plant is visibly IN something. Bounded rather than a world
    volume, because an infinite medium is both slower and flatter.
    """
    ob = bpy.data.objects.get("canalisation.air")
    if ob is None:
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        ob = bpy.context.object
        ob.name = "canalisation.air"
    ob.scale = (radius * 2.4, radius * 2.4, height * 1.9)
    ob.location = (ctr.x, ctr.y, height * 0.72)
    ob.visible_shadow = False

    mat = bpy.data.materials.get("canalisation.air") or \
        bpy.data.materials.new("canalisation.air")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (300, 0)
    sc = nt.nodes.new("ShaderNodeVolumeScatter"); sc.location = (60, 0)
    sc.inputs["Color"].default_value = (*colour, 1.0)
    sc.inputs["Density"].default_value = density
    sc.inputs["Anisotropy"].default_value = anisotropy
    nt.links.new(sc.outputs["Volume"], out.inputs["Volume"])
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return ob


def _light(name, kind, loc, energy, size, target, colour, in_air=False):
    """A practical. `in_air=False` keeps it out of the volume — see below."""
    ob = bpy.data.objects.get(name)
    if ob is None:
        ob = ci._link(name, bpy.data.lights.new(name, kind))
    ob.data.type = kind
    ob.data.energy = energy
    ob.data.color = colour
    if kind == "AREA":
        ob.data.size = size
    else:
        ob.data.shadow_soft_size = size
    # THE PRACTICALS DO NOT LIGHT THE AIR. Only the plant does.
    #
    # This started as a fix and turned out to be the thesis. A backlight strong
    # enough to transilluminate a lamina is also strong enough to fill the
    # volume, and the first version turned the whole frame into a milky brown
    # backdrop — every bit of the darkness the picture depends on, gone, in
    # exchange for the one lighting effect it most needed. Switching the
    # practicals out of volume scatter separates the two: they shape the tissue,
    # and the only thing in the air is light the plant emitted. Which is what
    # the file said it was doing at the top, before it was true.
    ob.visible_volume_scatter = in_air
    ci._aim(ob, Vector(loc), Vector(target))
    return ob


# ---------------------------------------------------------------------------
# the grade
# ---------------------------------------------------------------------------
#
# The piece has a grade of its own — bloom, exposure, vignette, grain, chromatic
# aberration — and `blender_import` deliberately imports NONE of it, because a
# rasteriser's bloom is a substitute for light transport and doing both is
# grading twice. This rebuilds the same intentions from the render instead: the
# glow here is a convolution of light that was actually emitted and actually
# travelled, not a threshold pass over a flat image.
def grade(fog=0.22, streaks=0.06, dispersion=0.006, vignette=0.30,
          threshold=0.55):
    sc = bpy.context.scene
    sc.use_nodes = True
    g = bpy.data.node_groups.get("canalisation.grade")
    if g is None:
        g = bpy.data.node_groups.new("canalisation.grade", "CompositorNodeTree")
    g.nodes.clear()
    for item in list(g.interface.items_tree):
        g.interface.remove(item)
    g.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    sc.compositing_node_group = g

    # THE SOURCE IS A RENDER LAYERS NODE, NOT THE GROUP'S INPUT SOCKET, and this
    # is the whole reason the first grade came out blank. A scene compositor in
    # 5.x is a node group, so the obvious reading is that its Image input is the
    # render — it is not, and a group-input-to-group-output passthrough composites
    # nothing over an empty frame. Measured on a 200px sphere: no compositor and
    # a Render Layers graph write byte-identical 31,426-byte files; the
    # passthrough writes 9,354 bytes of blank.
    #
    # It also costs no render time, which is the trap. The render still happens;
    # you just never see it. A wall-clock that drops from 4.6 s to 0.2 s is the
    # tell, and it reads like the render being skipped rather than like the
    # picture being thrown away at the last step.
    gin = g.nodes.new("CompositorNodeRLayers"); gin.location = (-600, 0)
    gout = g.nodes.new("NodeGroupOutput"); gout.location = (900, 0)

    def menu(node, socket, value):
        try:
            node.inputs[socket].default_value = value
        except Exception as exc:  # noqa: BLE001
            print(f"  grade: {socket}={value!r} refused ({exc})")

    # Fog glow, wide and low — the halo an emissive plant in dusty air has.
    fg = g.nodes.new("CompositorNodeGlare"); fg.location = (-360, 0)
    menu(fg, "Type", "Fog Glow"); menu(fg, "Quality", "High")
    fg.inputs["Threshold"].default_value = threshold
    fg.inputs["Strength"].default_value = fog
    fg.inputs["Size"].default_value = 8.0

    # A few streaks, barely there. Enough to say "lens", not enough to say "80s".
    st = g.nodes.new("CompositorNodeGlare"); st.location = (-120, 0)
    menu(st, "Type", "Streaks"); menu(st, "Quality", "High")
    st.inputs["Threshold"].default_value = threshold + 0.35
    st.inputs["Strength"].default_value = streaks
    st.inputs["Streaks"].default_value = 4
    st.inputs["Size"].default_value = 5.0

    ld = g.nodes.new("CompositorNodeLensdist"); ld.location = (120, 0)
    ld.inputs["Dispersion"].default_value = dispersion
    if "Fit" in ld.inputs:
        ld.inputs["Fit"].default_value = True

    # vignette: an ellipse, blurred, multiplied
    ell = g.nodes.new("CompositorNodeEllipseMask"); ell.location = (120, -320)
    ell.inputs["Size"].default_value = (0.86, 0.86)   # a 2D socket, not 3D
    blur = g.nodes.new("CompositorNodeBlur"); blur.location = (320, -320)
    # `Size` is a single 2D vector socket in 5.x, not the old Size X / Size Y
    # pair — assigning a float to it fails with an error that names neither.
    blur.inputs["Size"].default_value = (240.0, 240.0)
    lift = g.nodes.new("ShaderNodeMix"); lift.data_type = "RGBA"
    lift.blend_type = "MIX"; lift.location = (520, -320)
    _sock(lift.inputs, "Factor_Float").default_value = vignette
    _sock(lift.inputs, "A_Color").default_value = (1, 1, 1, 1)   # no vignette
    mulv = g.nodes.new("ShaderNodeMix"); mulv.data_type = "RGBA"
    mulv.blend_type = "MULTIPLY"; mulv.location = (700, 0)
    _sock(mulv.inputs, "Factor_Float").default_value = 1.0

    g.links.new(gin.outputs["Image"], fg.inputs["Image"])
    g.links.new(fg.outputs["Image"], st.inputs["Image"])
    g.links.new(st.outputs["Image"], ld.inputs["Image"])
    g.links.new(ell.outputs[0], blur.inputs["Image"])
    g.links.new(blur.outputs["Image"], _sock(lift.inputs, "B_Color"))
    g.links.new(ld.outputs["Image"], _sock(mulv.inputs, "A_Color"))
    g.links.new(_sock(lift.outputs, "Result_Color"), _sock(mulv.inputs, "B_Color"))
    g.links.new(_sock(mulv.outputs, "Result_Color"), gout.inputs[0])
    return g


# ---------------------------------------------------------------------------
def hero(H, res=(1600, 2000), samples=512, lens=85.0, fstop=2.2,
         azimuth=28.0, elevation=-0.06, margin=1.10,
         emis_mul=2.5, translucency=0.42,
         air=0.020, key=3.5, rim=30.0, fill=1.0, ambient=0.06, exposure=0.0,
         ground=False, ground_mul=0.7, do_grade=True, trim=0.02):
    """Stage, light and frame an imported specimen. Returns the camera."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = exposure
    if hasattr(sc, "cycles_curves"):
        sc.cycles_curves.shape = "THICK"
    # Volume needs bounces to look like air rather than like fog on a card.
    sc.cycles.volume_bounces = 2
    sc.cycles.transmission_bounces = 8

    for junk in ("Cube", "Light", "Camera",
                 "canalisation.key", "canalisation.fill", "canalisation.rim"):
        ob = bpy.data.objects.get(junk)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)

    pal = H.get("palette", {})
    bg = ci.bg_colour(H)
    vein = pal.get("vein", [1.0, 0.6, 0.4])

    # the lamina, upgraded from the neutral import material
    leaf_material(emis_mul=emis_mul, translucency=translucency)

    # bounds
    obs = [bpy.data.objects[n] for n in H.get("_objects", [])
           if n in bpy.data.objects]
    lo, hi = geo_bounds(obs, trim=trim)
    ctr = (lo + hi) * 0.5
    height = max(hi.z - lo.z, 0.1)
    width = max(hi.x - lo.x, hi.y - lo.y, 0.1)
    r = max(width, height)

    # THE ROOM IS NEARLY BLACK. The species' own background is already almost
    # black — an Ember Creeper sits on 0.030, 0.010, 0.010 — and the point is
    # that what you see is what the plant emitted.
    # THE SPECIES' OWN GRADIENT, not a flat colour. `60_render.js` runs the
    # background from `bgTop` to `bgBot`, and an Ember Creeper's are 0.030 and
    # 0.006 of warm near-black — a factor of five, which is small in absolute
    # terms and is the entire tonal range this picture has to work in. Flattening
    # it to one value throws away the only thing separating the top of the frame
    # from the bottom.
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    wt = world.node_tree
    wt.nodes.clear()
    wout = wt.nodes.new("ShaderNodeOutputWorld"); wout.location = (400, 0)
    bgn = wt.nodes.new("ShaderNodeBackground"); bgn.location = (200, 0)
    bgn.inputs[1].default_value = ambient
    top = pal.get("bgTop") or bg
    geo = wt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-560, 0)
    sep = wt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-380, 0)
    rng = wt.nodes.new("ShaderNodeMapRange"); rng.location = (-220, 0)
    rng.inputs["From Min"].default_value = -0.45
    rng.inputs["From Max"].default_value = 0.55
    ramp = wt.nodes.new("ShaderNodeValToRGB"); ramp.location = (-40, 0)
    ramp.color_ramp.elements[0].color = (bg[0], bg[1], bg[2], 1.0)
    ramp.color_ramp.elements[1].color = (top[0], top[1], top[2], 1.0)
    wt.links.new(geo.outputs["Incoming"], sep.inputs["Vector"])
    wt.links.new(sep.outputs["Z"], rng.inputs["Value"])
    wt.links.new(rng.outputs["Result"], ramp.inputs["Fac"])
    wt.links.new(ramp.outputs["Color"], bgn.inputs[0])
    wt.links.new(bgn.outputs["Background"], wout.inputs["Surface"])

    if ground:
        _ground(ctr, r * 40.0, [c * ground_mul for c in bg])
    if air > 0:
        _air(ctr, r, hi.z, air, [min(1.0, c * 1.6 + 0.25) for c in vein])

    # THE RIG IS CAMERA-RELATIVE, and it has to be. These were world-space
    # positions first, which is fine while the camera sits at one azimuth and
    # quietly wrong the moment it orbits: at azimuth 285 the "rim" had swung
    # round to the front and become a second key, so every lighting judgement
    # made at one angle was invalid at the next. A turntable would have shown it
    # instantly; four stills at four azimuths did not, because each one looks
    # like a plausible lighting design on its own.
    #
    # BACKLIGHT LEADS. A lamina is a translucent sheet — that is the whole point
    # of the leaf shader — and translucency only reads when the source is BEHIND
    # the subject. Front-lit, these leaves are red flakes; back-lit, the light
    # comes through the tissue and the vein network shows as a tracery inside it,
    # which is the thing this project exists to show.
    def place(off_deg, elev, dist_mul):
        a = np.radians(azimuth + off_deg)
        return (ctr.x + r * dist_mul * np.sin(a),
                ctr.y - r * dist_mul * np.cos(a),
                ctr.z + r * elev)

    _light("canalisation.rim", "AREA", place(172.0, 0.75, 2.1),
           rim * r * r, r * 1.3, ctr, (1.0, 0.60, 0.36))
    _light("canalisation.key", "AREA", place(58.0, 0.85, 2.2),
           key * r * r, r * 1.6, ctr, (1.0, 0.80, 0.68))
    _light("canalisation.fill", "AREA", place(-78.0, 0.15, 2.4),
           fill * r * r, r * 2.2, ctr, (0.42, 0.60, 1.0))

    # camera — see blender_import for why the sensor fit is pinned
    cam = bpy.data.objects.get("canalisation.cam")
    if cam is None:
        cam = ci._link("canalisation.cam", bpy.data.cameras.new("canalisation.cam"))
    cam.data.lens = lens
    cam.data.sensor_fit = "HORIZONTAL"
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    sc.camera = cam
    fit_v = height * res[0] / res[1]
    dist = max(fit_v, width) * (lens / cam.data.sensor_width) * margin
    a = np.radians(azimuth)
    eye = Vector((ctr.x + dist * np.sin(a),
                  ctr.y - dist * np.cos(a),
                  ctr.z + dist * elevation))
    focus = ci._aim(cam, eye, ctr)
    cam["pivot"] = list(ctr); cam["dist"] = dist; cam["elev"] = elevation

    if do_grade:
        grade()

    print(f"  hero: {height:.2f} m at {focus:.2f} m, {lens:.0f}mm f/{fstop}, "
          f"{samples} spp, air {air}")
    return cam
