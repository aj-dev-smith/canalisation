# A CANALISATION SPECIMEN, INSIDE BLENDER.
#
# Reads the `<name>.json` + `<name>.bin` pair that `tools/blender_export.mjs`
# writes and rebuilds it as three real datablocks:
#
#   <name>.surfaces   a mesh    — lamina, stems, petioles, fruit, meristem dome
#   <name>.veins      a Curves  — every vein, needle and thin stem, as strands
#   <name>.points     a PointCloud — spores and cell-resolution tissue
#
# Run it from the MCP bridge, or from Blender's text editor:
#
#   import importlib.util as u
#   s = u.spec_from_file_location("ci", "/abs/path/tools/blender_import.py")
#   m = u.module_from_spec(s); s.loader.exec_module(m)
#   m.build("/abs/path/export/cathedral_fern_21_natural")
#   m.setup_scene()
#
# THREE THINGS THIS FILE IS CAREFUL ABOUT, all of them places where a plausible
# shortcut would quietly render a different plant.
#
# 1. THE VEINS ARE CURVES, NOT THE TRIANGLES THE BROWSER DRAWS. A vein in the
#    real-time renderer is a camera-facing ribbon, which is a billboard baked at
#    one eye position; exported as triangles it would turn edge-on and vanish on
#    the first frame of a turntable. The exporter drops the ribbon's `side`
#    vector and keeps the segment and its two widths, so Cycles gets a strand
#    with a radius and renders it correctly from anywhere. About ninety percent
#    of a hero's veins are sub-pixel in the browser and drawn at one uniform
#    width; here they are not, so the hierarchy the canalisation grew is visible
#    as thickness for the first time.
#
# 2. THE NORMALS ARE THE SIMULATION'S, NOT BLENDER'S. `blade()` computes a
#    normal per vertex off the parametric surface it grew. Letting Blender
#    recompute them from an unwelded triangle soup gives flat shading with a
#    seam at every triangle, which reads as low-poly and is the single most
#    obvious way an export can look worse than the thing it came from.
#
# 3. THE RULER IS REAL. `WORLD.unitM` was fixed months ago by the wind field and
#    the falling blade, so a Cathedral Fern is 2.36 m and an Ashfall Spire is a
#    2.88 m sapling. Everything is scaled into metres on the way in, which is
#    what makes a physical camera — focal length, f-stop, real depth of field —
#    mean anything at all. Do not "scale it up so it fills the view"; move the
#    camera.
#
# Nothing here applies the real-time grade (bloom, exposure, vignette). Those
# are a rasteriser's substitutes for light transport, and a path tracer does its
# own. Vertex colours are the palette's own linear values.

import json
import os

import bpy
import numpy as np
from mathutils import Vector

# The engine is GL-handed and Y-up; Blender is Z-up. This is a rotation, not a
# mirror — get it wrong and the plant is both on its side and inside out, which
# reads as a shading bug rather than as a transform bug.
#
#   x_bl = x_gl        y_bl = -z_gl        z_bl = y_gl
def _to_blender(p, scale):
    """(N,3) engine coords -> (N,3) Blender metres."""
    out = np.empty_like(p)
    out[:, 0] = p[:, 0]
    out[:, 1] = -p[:, 2]
    out[:, 2] = p[:, 1]
    return out * scale


# The species' own background, which is the right colour for a room to be when
# the point of the picture is what the plant emitted. There is no single `bg`
# key — a palette carries `bgTop` and `bgBot` and the shipped renderer runs a
# gradient between them — so this takes the darker end, which is what the plant
# is actually seen against. Falls back only if the header predates the fix.
def bg_colour(H, default=(0.02, 0.03, 0.05)):
    pal = (H or {}).get("palette") or {}
    for k in ("bgBot", "bgTop", "bg"):
        c = pal.get(k)
        if c:
            return list(c)
    return list(default)


def _aim(ob, eye, target):
    ob.location = eye
    look = Vector(target) - Vector(eye)
    ob.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    if ob.type == "CAMERA":
        ob.data.dof.focus_distance = look.length
    return look.length


def _link(name, data):
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------
#
# One shader for everything, parameterised. Every surface in this plant is the
# same substance seen at different densities — that is the claim the piece makes
# — so three unrelated node trees would be a lie about the model as well as a
# maintenance problem. `Col` and `emis` are written on every datablock, so the
# same tree reads correctly off a mesh, a strand or a point.
def _material(name, emis_mul=1.0, roughness=0.55, subsurface=0.0, ior=1.4,
              two_sided=False):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (280, 0)

    # A LEAF IS LIT FROM BOTH SIDES, and this is not a stylistic choice — it is
    # `60_render.js` line 99, `if (dot(N,V) < 0.0) N = -N;`, which is there
    # because a lamina is a one-sided sheet standing in for a two-sided organ.
    # Cycles flips the shading normal for a backfacing hit using the GEOMETRIC
    # normal, and these are custom normals off the parametric surface the blade
    # grew, which can disagree with it by more than a right angle. Without this
    # every blade turned away from the key renders solid black — which it did,
    # and it read as a shading bug in the material rather than as a missing line
    # from the shader it is supposed to be reproducing.
    if two_sided:
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        geo.location = (-320, -420)
        d = nt.nodes.new("ShaderNodeVectorMath")
        d.operation = "DOT_PRODUCT"
        d.location = (-100, -420)
        sgn = nt.nodes.new("ShaderNodeMath")
        sgn.operation = "SIGN"
        sgn.location = (60, -420)
        flip = nt.nodes.new("ShaderNodeVectorMath")
        flip.operation = "SCALE"
        flip.location = (220, -560)
        nt.links.new(geo.outputs["Normal"], d.inputs[0])
        nt.links.new(geo.outputs["Incoming"], d.inputs[1])
        nt.links.new(d.outputs["Value"], sgn.inputs[0])
        nt.links.new(geo.outputs["Normal"], flip.inputs[0])
        nt.links.new(sgn.outputs["Value"], flip.inputs["Scale"])
        nt.links.new(flip.outputs["Vector"], bsdf.inputs["Normal"])

    col = nt.nodes.new("ShaderNodeAttribute")
    col.attribute_name = "Col"
    col.location = (-320, 120)
    em = nt.nodes.new("ShaderNodeAttribute")
    em.attribute_name = "emis"
    em.location = (-320, -180)
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = emis_mul
    mul.location = (-100, -180)

    nt.links.new(em.outputs["Fac"], mul.inputs[0])
    nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(col.outputs["Color"], bsdf.inputs["Emission Color"])
    nt.links.new(mul.outputs["Value"], bsdf.inputs["Emission Strength"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    def setif(key, value):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value

    setif("Roughness", roughness)
    setif("IOR", ior)
    setif("Subsurface Weight", subsurface)
    # A leaf is a slab of translucent tissue a fraction of a millimetre thick.
    # Scattering distance is in metres because the import is in metres.
    if subsurface and "Subsurface Radius" in bsdf.inputs:
        bsdf.inputs["Subsurface Radius"].default_value = (0.004, 0.010, 0.003)
    return mat


# THE VEINS AND THE POINTS ARE LIGHT, NOT SURFACES, and this is not an
# interpretation — it is what the renderer does. `60_render.js` draws the line
# and point passes with `blendFuncSeparate(SRC_ALPHA, ONE)` and `depthMask(false)`,
# and their fragment shader is one line: `vec3 c = vC * vE;`. No lighting term,
# no occlusion, straight addition into the frame. A vein is emitted light with a
# colour and a strength, and nothing else.
#
# Rendering it as a lit Principled tube — which is what this did first — gets two
# things wrong at once. It adds a diffuse response the piece does not have, and
# it OCCLUDES: the `flux` view's ghost stem, weighted 0.14 precisely so you can
# see the tissue through it, came out as a solid white pillar down the middle of
# the plant. The weight is a brightness, and a brightness only reads as
# transparency if the thing is additive.
#
# `Add Shader(Emission, Transparent BSDF)` is the exact analogue: the transparent
# branch passes the ray through unchanged, the emission adds on top. Shadow
# casting goes off on the objects, because a light does not cast one.
def _additive(name, mul=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    add = nt.nodes.new("ShaderNodeAddShader")
    add.location = (400, 0)
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.location = (200, 100)
    clear = nt.nodes.new("ShaderNodeBsdfTransparent")
    clear.location = (200, -120)

    col = nt.nodes.new("ShaderNodeAttribute")
    col.attribute_name = "Col"
    col.location = (-260, 140)
    em = nt.nodes.new("ShaderNodeAttribute")
    em.attribute_name = "emis"
    em.location = (-260, -80)
    m = nt.nodes.new("ShaderNodeMath")
    m.operation = "MULTIPLY"
    m.inputs[1].default_value = mul
    m.location = (-60, -80)

    nt.links.new(col.outputs["Color"], emit.inputs["Color"])
    nt.links.new(em.outputs["Fac"], m.inputs[0])
    nt.links.new(m.outputs["Value"], emit.inputs["Strength"])
    nt.links.new(emit.outputs["Emission"], add.inputs[0])
    nt.links.new(clear.outputs["BSDF"], add.inputs[1])
    nt.links.new(add.outputs["Shader"], out.inputs["Surface"])
    return mat


def _attrs(data, col, emis, domain="POINT"):
    """Write the two channels every datablock here carries."""
    n = len(col)
    ca = data.color_attributes.new(name="Col", type="FLOAT_COLOR", domain=domain)
    rgba = np.ones((n, 4), dtype="f4")
    rgba[:, :3] = col
    ca.data.foreach_set("color", rgba.ravel())
    ea = data.attributes.new("emis", "FLOAT", domain)
    ea.data.foreach_set("value", np.ascontiguousarray(emis, dtype="f4"))


# ---------------------------------------------------------------------------
# the three datablocks
# ---------------------------------------------------------------------------
def _surfaces(name, buf, sec, scale, mat):
    n = sec["floats"] // sec["stride"]
    if n == 0:
        return None
    a = buf[sec["offset"] // 4: sec["offset"] // 4 + sec["floats"]].reshape(n, 10)
    pos = _to_blender(a[:, 0:3].astype("f8"), scale)
    nrm = _to_blender(a[:, 3:6].astype("f8"), 1.0)
    col = a[:, 6:9]
    emis = a[:, 9]

    me = bpy.data.meshes.new(name)
    ntri = n // 3
    # The fast path. `from_pydata` builds 60,000 Python tuples and is the
    # fallback rather than the default, because the cell views can hand this an
    # order of magnitude more.
    try:
        me.vertices.add(n)
        me.vertices.foreach_set("co", pos.ravel())
        me.loops.add(n)
        me.loops.foreach_set("vertex_index", np.arange(n, dtype="i4"))
        me.polygons.add(ntri)
        me.polygons.foreach_set("loop_start", np.arange(0, n, 3, dtype="i4"))
        me.update()
        me.validate()
    except Exception as exc:  # noqa: BLE001 — any RNA change should fall back, loudly
        print(f"  fast mesh path failed ({exc}); falling back to from_pydata")
        me.clear_geometry()
        me.from_pydata(pos.tolist(), [], np.arange(n).reshape(ntri, 3).tolist())
        me.update()

    _attrs(me, col, emis)
    me.materials.append(mat)

    # THE SIMULATION'S NORMALS, NOT A RECOMPUTED ONES. See the note at the top.
    me.shade_smooth()
    # The numpy array first: a conifer at solver resolution is 4.3 M vertices and
    # `tolist()` on that is millions of Python tuples and several gigabytes.
    for cand in (nrm, nrm.tolist()):
        try:
            me.normals_split_custom_set_from_vertices(cand)
            break
        except Exception as exc:  # noqa: BLE001
            last = exc
    else:
        print(f"  custom normals refused ({last}); Blender's own will be used")
    return _link(name, me)


def _veins(name, buf, sec, scale, mat):
    n = sec["floats"] // sec["stride"]
    if n == 0:
        return None
    a = buf[sec["offset"] // 4: sec["offset"] // 4 + sec["floats"]].reshape(n, 12)

    cu = bpy.data.hair_curves.new(name)
    cu.add_curves([2] * n)

    pos = np.empty((n * 2, 3), dtype="f8")
    pos[0::2] = a[:, 0:3]
    pos[1::2] = a[:, 3:6]
    cu.attributes["position"].data.foreach_set("vector", _to_blender(pos, scale).ravel())

    # A ribbon's half-width IS the strand's radius: the emitter offsets the two
    # corners by `+-side*w`, so the drawn thing is 2w across and a tube of
    # radius w is the same silhouette from every direction rather than from one.
    rad = np.empty(n * 2, dtype="f4")
    rad[0::2] = a[:, 6]
    rad[1::2] = a[:, 7]
    if "radius" not in cu.attributes:
        cu.attributes.new("radius", "FLOAT", "POINT")
    cu.attributes["radius"].data.foreach_set("value", rad * scale)

    col = np.repeat(a[:, 8:11], 2, axis=0)
    emis = np.repeat(a[:, 11], 2)
    _attrs(cu, col, emis)
    cu.materials.append(mat)
    return _link(name, cu)


def _points(name, buf, sec, scale, mat, size_mul=0.5):
    n = sec["floats"] // sec["stride"]
    if n == 0:
        return None
    a = buf[sec["offset"] // 4: sec["offset"] // 4 + sec["floats"]].reshape(n, 7)

    pc = bpy.data.pointclouds.new(name)
    pc.resize(n)
    pc.attributes["position"].data.foreach_set(
        "vector", _to_blender(a[:, 0:3].astype("f8"), scale).ravel())
    if "radius" not in pc.attributes:
        pc.attributes.new("radius", "FLOAT", "POINT")
    # `size` is a point sprite's diameter in world units; a radius is half of it.
    pc.attributes["radius"].data.foreach_set(
        "value", np.ascontiguousarray(a[:, 6] * scale * 0.5 * size_mul, dtype="f4"))
    _attrs(pc, a[:, 3:6], np.ones(n, dtype="f4"))
    pc.materials.append(mat)
    return _link(name, pc)


# ---------------------------------------------------------------------------
def build(path, clear=True, emis_mul=1.5, vein_emis_mul=1.0, solid_veins=False):
    """Import the `<path>.json` + `<path>.bin` pair. Returns the header dict."""
    path = os.path.splitext(path)[0]
    with open(path + ".json") as fh:
        H = json.load(fh)
    buf = np.fromfile(path + ".bin", dtype="f4")

    stem = os.path.basename(path)
    if clear:
        for suffix in ("surfaces", "veins", "points"):
            ob = bpy.data.objects.get(f"{stem}.{suffix}")
            if ob:
                bpy.data.objects.remove(ob, do_unlink=True)

    scale = H["unitM"]
    S = H["sections"]

    # A leaf is tissue and scatters; a vein is light. `solid_veins` gives them
    # back a lit surface, which is wrong about the piece but is what you want if
    # you are using an export as a model rather than as a picture of the piece.
    m_surf = _material("canalisation.surface", emis_mul=emis_mul,
                       roughness=0.42, subsurface=0.35, two_sided=True)
    if solid_veins:
        m_vein = _material("canalisation.vein", emis_mul=vein_emis_mul,
                           roughness=0.30)
        m_pt = _material("canalisation.point", emis_mul=vein_emis_mul,
                         roughness=0.5)
    else:
        m_vein = _additive("canalisation.vein", vein_emis_mul)
        m_pt = _additive("canalisation.point", vein_emis_mul)

    surf = _surfaces(f"{stem}.surfaces", buf, S["tri"], scale, m_surf)
    lit = [_veins(f"{stem}.veins", buf, S["seg"], scale, m_vein),
           _points(f"{stem}.points", buf, S["pt"], scale, m_pt)]
    lit = [o for o in lit if o]
    if not solid_veins:
        for o in lit:          # light does not cast a shadow
            o.visible_shadow = False
    objs = ([surf] if surf else []) + lit

    H["_objects"] = [o.name for o in objs]
    H["_scale"] = scale
    print(f"  {H['species']} seed {H['seed']} ({H['view']}, {H['stage']}): "
          f"{S['tri']['floats'] // 30:,} triangles, "
          f"{S['seg']['floats'] // 12:,} strands, "
          f"{S['pt']['floats'] // 7:,} points")
    if any(H.get("dropped", {}).values()):
        print(f"  !! the exporter dropped geometry: {H['dropped']}")
    return H


# ---------------------------------------------------------------------------
# a scene to look at it in
# ---------------------------------------------------------------------------
#
# Deliberately plain, and deliberately separate from `build`. This is a
# neutral three-quarter view that frames the specimen and nothing more — art
# direction is AJ's, and a lighting rig baked into the importer would be one
# more thing to fight. The one non-obvious choice is a physical camera: the
# plant is in metres, so a 50 mm lens at f/2.8 gives the depth of field a 2.4 m
# plant would actually have, which is the whole reason for going to a path
# tracer instead of screenshotting the browser.
def setup_scene(H=None, res=(1440, 1800), samples=128, lens=85.0, fstop=2.8,
                azimuth=35.0, elevation=0.18, fill=1.35, bg=None,
                key=220.0, exposure=0.0, margin=1.25):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.exposure = exposure
    # THICK, NOT RIBBONS, AND THIS IS THE WHOLE REASON THE VEINS COME ACROSS AS
    # CURVES. Cycles' RIBBONS mode renders a strand as a flat camera-facing
    # sheet, which is precisely the billboard the exporter went to the trouble of
    # throwing away — set it and the import faithfully reproduces the artefact it
    # was built to remove. It was set to RIBBONS here for three renders before a
    # picture showed a stem as a flat band, which is the tell — the numbers were
    # right and the geometry was right and only looking at it caught this.
    if hasattr(sc, "cycles_curves"):
        sc.cycles_curves.shape = "THICK"

    for junk in ("Cube",):
        ob = bpy.data.objects.get(junk)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)

    # The world is the species' own background colour, dimmed to a fill. The
    # palette already decided what this plant sits against.
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    bgn = world.node_tree.nodes.get("Background")
    if bgn:
        c = bg or bg_colour(H)
        bgn.inputs[0].default_value = (c[0], c[1], c[2], 1.0)
        bgn.inputs[1].default_value = 1.0

    # frame whatever was imported
    obs = [bpy.data.objects[n] for n in (H or {}).get("_objects", [])
           if n in bpy.data.objects]
    if not obs:
        obs = [o for o in sc.objects if o.type in {"MESH", "CURVES", "POINTCLOUD"}]
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in obs:
        for corner in ob.bound_box:
            w = ob.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    ctr = (lo + hi) * 0.5
    height = max(hi.z - lo.z, 0.1)
    width = max(hi.x - lo.x, hi.y - lo.y, 0.1)

    cam = bpy.data.objects.get("canalisation.cam")
    if cam is None:
        cam = _link("canalisation.cam", bpy.data.cameras.new("canalisation.cam"))
    cam.data.lens = lens
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    sc.camera = cam

    # Far enough back that the taller of the two extents fits the frame. The
    # sensor fit is PINNED HORIZONTAL because the arithmetic below assumes it:
    # on AUTO, Blender maps the sensor to whichever image axis is longer, so a
    # portrait resolution silently flips the field of view and the distance
    # comes out short. The tree was framed at 1200x1800 and lost its bottom
    # metre — which looks like the plant being too big rather than like a
    # camera bug, and `tree_shot.mjs` is portrait for a reason.
    cam.data.sensor_fit = "HORIZONTAL"
    sensor = cam.data.sensor_width
    fit_v = height * sc.render.resolution_x / sc.render.resolution_y
    dist = max(fit_v, width) * (lens / sensor) * margin
    ang = np.radians(azimuth)
    eye = Vector((ctr.x + dist * np.sin(ang),
                  ctr.y - dist * np.cos(ang),
                  ctr.z + dist * elevation))
    focus = _aim(cam, eye, ctr)
    # kept so `turntable` can orbit the same framing rather than re-deriving it
    cam["pivot"] = list(ctr)
    cam["dist"] = dist
    cam["elev"] = elevation

    # A key and a fill, both large and soft, because everything here is thin and
    # translucent — a small hard source makes a leaf read as plastic.
    def area(name, loc, energy, size, tgt):
        ob = bpy.data.objects.get(name)
        if ob is None:
            ob = _link(name, bpy.data.lights.new(name, "AREA"))
        ob.data.energy = energy
        ob.data.size = size
        ob.location = loc
        d = tgt - Vector(loc)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return ob

    # Energy goes as r^2 because the rig is placed in multiples of r, so this is
    # one exposure for a 13 cm leaf and a 2.9 m tree rather than a number to
    # re-find per specimen.
    r = max(width, height)
    e = key * r * r
    area("canalisation.key", (ctr.x - r * 1.6, ctr.y - r * 1.9, ctr.z + r * 1.3),
         e, r * 1.5, ctr)
    area("canalisation.fill", (ctr.x + r * 2.1, ctr.y - r * 0.6, ctr.z + r * 0.2),
         e * fill * 0.25, r * 2.0, ctr)
    area("canalisation.rim", (ctr.x + r * 0.4, ctr.y + r * 2.2, ctr.z + r * 1.6),
         e * 0.45, r * 1.2, ctr)

    print(f"  framed {height:.2f} m tall at {focus:.2f} m, "
          f"{lens:.0f} mm f/{fstop}")
    return cam


def render(out_path, samples=None):
    sc = bpy.context.scene
    if samples:
        sc.cycles.samples = samples
    sc.render.filepath = out_path
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print(f"  wrote {out_path}")


# A TURNTABLE IS THE PROOF, not just an asset. The one substantive claim this
# bridge makes about the geometry is that a vein stops being a camera-facing
# ribbon and becomes a tube — and an orbit is the only thing that can tell those
# apart. A billboard plant thins and flickers as the camera comes round; this
# should not. Render one before believing the import, and again after touching
# anything in the material or `cycles_curves`.
#
# The lights do NOT orbit with the camera, deliberately: a rig that follows the
# lens gives every frame the same shading and hides exactly the wrongness this
# is for.
def turntable(out_dir, frames=48, samples=48, start=0.0, sweep=360.0):
    sc = bpy.context.scene
    cam = sc.camera
    if cam is None or "pivot" not in cam:
        raise RuntimeError("call setup_scene() first — the orbit reuses its framing")
    ctr = Vector(cam["pivot"])
    dist, elev = cam["dist"], cam["elev"]
    os.makedirs(out_dir, exist_ok=True)
    for i in range(frames):
        a = np.radians(start + sweep * i / frames)
        _aim(cam, Vector((ctr.x + dist * np.sin(a),
                          ctr.y - dist * np.cos(a),
                          ctr.z + dist * elev)), ctr)
        render(os.path.join(out_dir, f"{i:03d}.png"), samples=samples)
