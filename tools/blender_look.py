# THE SHIPPED LOOK, REBUILT IN CYCLES. A reference match, not a design.
#
#   Blender -b -P tools/blender_shot.py -- --export export/ember_peak \
#       --out shots/ember_shipped.png --look shipped
#
# WHY THIS FILE EXISTS. `blender_hero.py` art-directed a path-traced Ember
# Creeper from scratch — physical lights, a translucent lamina, volumetric air,
# a glare pass — and AJ's verdict was "considerably worse than the custom webgl
# renderer, and I'm a bit surprised by that". The surprise is the useful part:
# every individual choice in that rig was defensible and the picture still lost,
# because the piece's look is NOT emergent and NOT incidental. It is a designed,
# hand-written, deliberately non-physical shading model plus a grade, and both
# are in `src/`. Replacing them with better physics replaces the thing that
# works with something nobody chose.
#
# So this module reproduces `60_render.js` in Cycles as closely as a path tracer
# can, and reproduces nothing else. It is the reference the hero rig is allowed
# to be judged against. Match first, improve second — the same discipline as
# deriving a number before asserting it, and the same lesson as ROADMAP 13's
# needle, where the botanically correct answer was rejected because the
# reticulate vein network is the only channel through which this engine is
# visible at all.
#
# WHAT "MATCH" MEANS HERE, precisely, because it is not obvious:
#
#  - **The lamina is UNLIT.** `MESH_FS` is a three-term hand-written model —
#    a wrapped diffuse term, a transmission term, a Fresnel rim, and an emission
#    term at 3x — evaluated against ONE key direction that is a species palette
#    entry. There is no such thing as reproducing that with lights, so it is
#    rebuilt as a pure Emission shader that computes the same expression from
#    the same normals. That is not a cheat; it is what the reference does.
#  - **There are therefore NO LIGHTS IN THE SCENE AT ALL**, and no BSDF, which
#    means no global illumination and nothing for samples to converge. 32 spp is
#    plenty; the sampling is doing anti-aliasing and depth of field and nothing
#    else. A frame that took nine minutes on the hero rig takes seconds here.
#  - **The view transform is Standard, not AgX.** The browser tone maps with an
#    ACES fit and then writes sRGB; that curve is rebuilt in the compositor, so
#    letting Blender apply a second film response on top would be grading twice.
#    This is the same argument `blender_export.mjs` makes for not baking the
#    grade into vertex colours, applied at the other end of the pipe.
#
# WHAT IS HONESTLY NOT A MATCH, listed so nobody discovers it as a bug:
#
#  - **Depth of field.** `pal.dof` is a blend amount over a screen-space blur
#    with a focus plane and a range, not an aperture. A physical lens is a
#    different operator and the two cannot be reconciled by choosing an f-stop.
#    Default is nearly stopped down, so the reference match is a sharp picture.
#  - **The vignette** is an ellipse mask rather than `1 - vig*dot(d,d)*1.6`,
#    because the compositor has no screen-coordinate source to evaluate that in.
#    It is fitted at the corners and is wrong in between.
#  - **Occlusion.** The rasteriser's line pass is additive with depth writes
#    OFF, so a vein behind a leaf still adds its light to the pixel. Here the
#    lamina is opaque emission and does occlude. Making the veins visible
#    through tissue is a real difference and it is left alone deliberately —
#    it is the one place where the path tracer is more correct AND darker, and
#    it wants to be seen rather than papered over.

import bpy
import numpy as np
from mathutils import Vector

import sys
ci = sys.modules.get("ci")            # blender_import, loaded by the caller
hero = sys.modules.get("hero")        # blender_hero, for geo_bounds


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

# GL is y-up and Blender is z-up; `blender_import._to_blender` maps positions
# and normals by (x, -z, y). A palette's key is a DIRECTION in that same GL
# frame, so it has to go through the same map or the light comes from the wrong
# place — and it would still look like a plausible lighting design, which is
# exactly how the camera-relative rig bug survived four stills.
def _dir(v):
    d = Vector((v[0], -v[2], v[1]))
    return d.normalized() if d.length > 1e-9 else Vector((0, 0, 1))


def _vm(nt, op, loc, a=None, b=None, scale=None):
    n = nt.nodes.new("ShaderNodeVectorMath")
    n.operation = op
    n.location = loc
    if a is not None:
        n.inputs[0].default_value = tuple(a)
    if b is not None:
        n.inputs[1].default_value = tuple(b)
    if scale is not None:
        n.inputs["Scale"].default_value = scale
    return n


def _m(nt, op, loc, a=None, b=None, c=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.location = loc
    for i, v in enumerate((a, b, c)):
        if v is not None:
            n.inputs[i].default_value = v
    return n


# The fog in `MESH_FS` and `LINE_FS` is measured in SIMULATION units, and the
# import scales the whole specimen into metres by `WORLD.unitM`. A fog density
# carried across unchanged is off by a factor of sixteen, which reads as no fog
# at all rather than as a bug.
def _fog_terms(nt, H, near, loc):
    pal = H.get("palette", {})
    scale = float(H.get("unitM", 1.0)) or 1.0
    dens = float(pal.get("fogD", 0.0)) / scale
    cam = nt.nodes.new("ShaderNodeCameraData"); cam.location = (loc[0], loc[1])
    sub = _m(nt, "SUBTRACT", (loc[0] + 180, loc[1]), b=near)
    mx = _m(nt, "MAXIMUM", (loc[0] + 360, loc[1]), b=0.0)
    neg = _m(nt, "MULTIPLY", (loc[0] + 540, loc[1]), b=-dens)
    ex = _m(nt, "EXPONENT", (loc[0] + 720, loc[1]))
    one = _m(nt, "SUBTRACT", (loc[0] + 900, loc[1]), a=1.0)
    amt = _m(nt, "MULTIPLY", (loc[0] + 1080, loc[1]), b=0.80)
    amt.use_clamp = True
    nt.links.new(cam.outputs["View Distance"], sub.inputs[0])
    nt.links.new(sub.outputs[0], mx.inputs[0])
    nt.links.new(mx.outputs[0], neg.inputs[0])
    nt.links.new(neg.outputs[0], ex.inputs[0])
    nt.links.new(ex.outputs[0], one.inputs[1])
    nt.links.new(one.outputs[0], amt.inputs[0])
    return amt, list(pal.get("fog", [0, 0, 0]))


# ---------------------------------------------------------------------------
# THE WIDTH FLOOR, AND WHERE IT ACTUALLY LIVES
# ---------------------------------------------------------------------------
#
# `blender_export.mjs` now defaults to the shipped `MINW`, which is a large
# improvement on the `1e-4` it used to pass — and `MINW`'s module default of
# 0.004 is NOT the number the app runs at. `70_app.js` calls
#
#     setView(cam.eye, cam.dist * px * 1.5, px)      px = 2 tan(fov/2) / H
#
# so the floor the piece is actually drawn with is **one and a half pixels of
# half-width**, recomputed every frame from the camera. Three pixels across.
# That is why "ninety percent of the hero's veins are already sub-pixel and
# already clamped up to the floor" is true and not a contradiction: they are
# sub-pixel by chemistry and pixel-sized by the time they are drawn.
#
# A pixel floor cannot be baked into a view-independent export, so it belongs
# here, where the camera and the resolution are both known — which is exactly
# where the browser does it. Flooring twice is harmless as long as the second
# floor is the larger, and it is: 0.004 sim units against roughly 0.08.
def floor_radii(objs, dist, lens, sensor, res_x, px_floor=1.5):
    if px_floor <= 0:
        return 0.0
    world_per_px = 2.0 * dist * np.tan(0.5 * 2.0 * np.arctan(sensor / (2.0 * lens))) / res_x
    floor = px_floor * world_per_px
    raised = total = 0
    for ob in objs:
        if ob.type != "CURVES":
            continue
        att = ob.data.attributes.get("radius")
        if att is None:
            continue
        n = len(att.data)
        r = np.empty(n, dtype="f4")
        att.data.foreach_get("value", r)
        raised += int((r < floor).sum()); total += n
        np.maximum(r, floor, out=r)
        att.data.foreach_set("value", r)
    if total:
        print(f"  width floor {floor * 1000:.2f} mm ({px_floor} px): "
              f"{raised}/{total} strand ends raised ({100 * raised / total:.1f}%)")
    return floor


# ---------------------------------------------------------------------------
# MESH_FS
# ---------------------------------------------------------------------------
#
#   vec3 N = normalize(vN);
#   vec3 V = normalize(uEye - vP);
#   if (dot(N,V) < 0.0) N = -N;
#   float d    = max(dot(N, uKey), 0.0);
#   float back = pow(max(dot(-N, uKey), 0.0), 2.0);
#   float rim  = pow(1.0 - max(dot(N, V), 0.0), 3.0);
#   vec3  amb  = mix(uAmbBot, uAmbTop, N.y*0.5+0.5);
#   vec3  c    = vC*(amb + uKeyCol*d*0.9) + vC*uKeyCol*back*0.55 + rim*uAmbTop*0.7;
#   c += vC * vE * 3.0;
#
# The two-sided flip is done explicitly rather than relying on Cycles' own
# backfacing normal, because these are CUSTOM normals off a parametric surface
# and they can disagree with the geometric normal by more than 90 degrees — the
# first import rendered every blade backface solid black for exactly this.
#
# ⚠ THE `* 3.0` ON EMISSION IS PART OF THE LOOK AND WAS MISSING FROM THE HERO
# RIG. The vasculature is meant to be the brightest thing in the plant;
# `makeSpecimen` even pulls the lamina DOWN by `laminaMul` to guarantee it.
def surface_material(H, name="canalisation.surface", fog=True, near=0.0,
                     emis_mul=3.0):
    pal = H.get("palette", {})
    key = _dir(pal.get("key", [0.4, 0.7, 0.5]))
    keyCol = list(pal.get("keyCol", [1.0, 1.0, 1.0]))
    ambTop = list(pal.get("ambTop", [0.1, 0.1, 0.1]))
    ambBot = list(pal.get("ambBot", [0.02, 0.02, 0.02]))

    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    geo = nt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-1400, 200)
    col = nt.nodes.new("ShaderNodeAttribute"); col.attribute_name = "Col"
    col.location = (-1400, -260)
    emi = nt.nodes.new("ShaderNodeAttribute"); emi.attribute_name = "emis"
    emi.location = (-1400, -420)

    # the flip: N *= (dot(N,V) > 0 ? 1 : -1)
    nv = _vm(nt, "DOT_PRODUCT", (-1200, 260))
    nt.links.new(geo.outputs["Normal"], nv.inputs[0])
    nt.links.new(geo.outputs["Incoming"], nv.inputs[1])
    gt = _m(nt, "GREATER_THAN", (-1020, 260), b=0.0)
    nt.links.new(nv.outputs["Value"], gt.inputs[0])
    sgn = _m(nt, "MULTIPLY_ADD", (-860, 260), b=2.0, c=-1.0)
    nt.links.new(gt.outputs[0], sgn.inputs[0])
    Nf = _vm(nt, "SCALE", (-700, 260))
    nt.links.new(geo.outputs["Normal"], Nf.inputs[0])
    nt.links.new(sgn.outputs[0], Nf.inputs["Scale"])

    # d, back
    dk = _vm(nt, "DOT_PRODUCT", (-520, 400), b=key)
    nt.links.new(Nf.outputs["Vector"], dk.inputs[0])
    d = _m(nt, "MAXIMUM", (-340, 460), b=0.0)
    nt.links.new(dk.outputs["Value"], d.inputs[0])
    d09 = _m(nt, "MULTIPLY", (-160, 460), b=0.9)
    nt.links.new(d.outputs[0], d09.inputs[0])
    bneg = _m(nt, "MULTIPLY", (-340, 300), b=-1.0)
    nt.links.new(dk.outputs["Value"], bneg.inputs[0])
    b0 = _m(nt, "MAXIMUM", (-160, 300), b=0.0)
    nt.links.new(bneg.outputs[0], b0.inputs[0])
    bpw = _m(nt, "POWER", (20, 300), b=2.0)
    nt.links.new(b0.outputs[0], bpw.inputs[0])
    b55 = _m(nt, "MULTIPLY", (200, 300), b=0.55)
    nt.links.new(bpw.outputs[0], b55.inputs[0])

    # rim — after the flip, max(dot(N,V),0) is |dot| by construction
    av = _m(nt, "ABSOLUTE", (-520, 120))
    nt.links.new(nv.outputs["Value"], av.inputs[0])
    inv = _m(nt, "SUBTRACT", (-340, 120), a=1.0)
    nt.links.new(av.outputs[0], inv.inputs[1])
    rim = _m(nt, "POWER", (-160, 120), b=3.0)
    nt.links.new(inv.outputs[0], rim.inputs[0])
    r07 = _m(nt, "MULTIPLY", (20, 120), b=0.7)
    nt.links.new(rim.outputs[0], r07.inputs[0])

    # amb = ambBot + (ambTop-ambBot)*(N.z*0.5+0.5)   [GL's N.y is Blender's N.z]
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-520, -60)
    nt.links.new(Nf.outputs["Vector"], sep.inputs[0])
    af = _m(nt, "MULTIPLY_ADD", (-340, -60), b=0.5, c=0.5)
    nt.links.new(sep.outputs["Z"], af.inputs[0])
    dlt = [ambTop[i] - ambBot[i] for i in range(3)]
    ascl = _vm(nt, "SCALE", (-160, -60), a=dlt)
    nt.links.new(af.outputs[0], ascl.inputs["Scale"])
    amb = _vm(nt, "ADD", (20, -60), b=ambBot)
    nt.links.new(ascl.outputs["Vector"], amb.inputs[0])

    # term1 = C * (amb + keyCol*d*0.9)
    kd = _vm(nt, "SCALE", (200, 460), a=keyCol)
    nt.links.new(d09.outputs[0], kd.inputs["Scale"])
    t1a = _vm(nt, "ADD", (380, 200))
    nt.links.new(amb.outputs["Vector"], t1a.inputs[0])
    nt.links.new(kd.outputs["Vector"], t1a.inputs[1])
    t1 = _vm(nt, "MULTIPLY", (560, 200))
    nt.links.new(col.outputs["Color"], t1.inputs[0])
    nt.links.new(t1a.outputs["Vector"], t1.inputs[1])

    # term2 = C * keyCol * back * 0.55
    kb = _vm(nt, "SCALE", (380, 20), a=keyCol)
    nt.links.new(b55.outputs[0], kb.inputs["Scale"])
    t2 = _vm(nt, "MULTIPLY", (560, 20))
    nt.links.new(col.outputs["Color"], t2.inputs[0])
    nt.links.new(kb.outputs["Vector"], t2.inputs[1])

    # term3 = rim * ambTop * 0.7   (NOT tinted by the surface colour — it is a
    # specular edge, and this is the term that separates a leaf from the black)
    t3 = _vm(nt, "SCALE", (560, -140), a=ambTop)
    nt.links.new(r07.outputs[0], t3.inputs["Scale"])

    # term4 = C * E * 3
    e3 = _m(nt, "MULTIPLY", (380, -320), b=emis_mul)
    nt.links.new(emi.outputs["Fac"], e3.inputs[0])
    t4 = _vm(nt, "SCALE", (560, -320))
    nt.links.new(col.outputs["Color"], t4.inputs[0])
    nt.links.new(e3.outputs[0], t4.inputs["Scale"])

    s1 = _vm(nt, "ADD", (760, 120))
    nt.links.new(t1.outputs["Vector"], s1.inputs[0])
    nt.links.new(t2.outputs["Vector"], s1.inputs[1])
    s2 = _vm(nt, "ADD", (760, -60))
    nt.links.new(t3.outputs["Vector"], s2.inputs[0])
    nt.links.new(t4.outputs["Vector"], s2.inputs[1])
    tot = _vm(nt, "ADD", (940, 40))
    nt.links.new(s1.outputs["Vector"], tot.inputs[0])
    nt.links.new(s2.outputs["Vector"], tot.inputs[1])
    final = tot

    if fog:
        amt, fcol = _fog_terms(nt, H, near, (-1400, -700))
        # mix(c, fog, f) written as c + (fog - c)*f, because VectorMath has no
        # mix and the colour Mix node is the four-sockets-called-A trap.
        dif = _vm(nt, "SUBTRACT", (940, -700), a=fcol)
        nt.links.new(tot.outputs["Vector"], dif.inputs[1])
        scl = _vm(nt, "SCALE", (1120, -700))
        nt.links.new(dif.outputs["Vector"], scl.inputs[0])
        nt.links.new(amt.outputs[0], scl.inputs["Scale"])
        final = _vm(nt, "ADD", (1300, -300))
        nt.links.new(tot.outputs["Vector"], final.inputs[0])
        nt.links.new(scl.outputs["Vector"], final.inputs[1])

    em = nt.nodes.new("ShaderNodeEmission"); em.location = (1500, 40)
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(final.outputs["Vector"], em.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (1700, 40)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# LINE_FS / PT_FS
# ---------------------------------------------------------------------------
#
#   vec3 c = vC * vE;
#   c *= (1.0 - fog*0.8);
#
# and it is drawn with `blendFuncSeparate(SRC_ALPHA, ONE)` and `depthMask(false)`
# — additive, unlit, non-occluding. `Add(Emission, Transparent)` is that, and
# the transparent half is what stops a vein from reading as a lit tube. Getting
# this wrong turned `flux`'s ghost stem, drawn at weight 0.14, into an opaque
# white pillar.
def vein_material(H, name="canalisation.vein", mul=1.0, fog=True, near=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    col = nt.nodes.new("ShaderNodeAttribute"); col.attribute_name = "Col"
    col.location = (-600, 120)
    emi = nt.nodes.new("ShaderNodeAttribute"); emi.attribute_name = "emis"
    emi.location = (-600, -60)
    e = _m(nt, "MULTIPLY", (-400, -60), b=mul)
    nt.links.new(emi.outputs["Fac"], e.inputs[0])
    lit = _vm(nt, "SCALE", (-200, 60))
    nt.links.new(col.outputs["Color"], lit.inputs[0])
    nt.links.new(e.outputs[0], lit.inputs["Scale"])
    final = lit

    if fog:
        amt, _ = _fog_terms(nt, H, near, (-1600, -520))
        keep = _m(nt, "SUBTRACT", (-400, -520), a=1.0)
        nt.links.new(amt.outputs[0], keep.inputs[1])
        final = _vm(nt, "SCALE", (-20, -260))
        nt.links.new(lit.outputs["Vector"], final.inputs[0])
        nt.links.new(keep.outputs[0], final.inputs["Scale"])

    em = nt.nodes.new("ShaderNodeEmission"); em.location = (200, 60)
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(final.outputs["Vector"], em.inputs["Color"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.location = (200, -160)
    add = nt.nodes.new("ShaderNodeAddShader"); add.location = (420, 0)
    nt.links.new(em.outputs[0], add.inputs[0])
    nt.links.new(tr.outputs[0], add.inputs[1])
    out = nt.nodes.new("ShaderNodeOutputMaterial"); out.location = (620, 0)
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# COMP_FS
# ---------------------------------------------------------------------------
#
#   c += bloom(c, thresh) * uBloomAmt;
#   c *= uExposure;
#   c  = aces(c);
#   c *= 1.0 - uVig*dot(d,d)*1.6;
#   c += (hash(...)-0.5)*uGrain;
#   o  = pow(c, 1/2.2);
#
# The final gamma is Blender's Standard view transform, which is why this must
# not run under AgX. Everything before it is rebuilt here.
def grade(H, bloom=None, thresh=None, exposure=None, vignette=None,
          grain=None, dispersion=0.004, bloom_size=8.0):
    pal = H.get("palette", {})
    bloom = pal.get("bloom", 0.38) if bloom is None else bloom
    thresh = pal.get("bloomThresh", 1.15) if thresh is None else thresh
    exposure = pal.get("exposure", 1.04) if exposure is None else exposure
    vignette = pal.get("vignette", 0.60) if vignette is None else vignette
    grain = pal.get("grain", 0.024) if grain is None else grain

    sc = bpy.context.scene
    sc.use_nodes = True
    g = bpy.data.node_groups.get("canalisation.shipped")
    if g is None:
        g = bpy.data.node_groups.new("canalisation.shipped", "CompositorNodeTree")
    g.nodes.clear()
    for item in list(g.interface.items_tree):
        g.interface.remove(item)
    g.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    sc.compositing_node_group = g

    # A RENDER LAYERS NODE, NOT THE GROUP INPUT. A scene compositor in 5.x is a
    # node group whose Image input is NOT the render, so a passthrough silently
    # composites nothing over an empty frame — and it costs no render time,
    # which reads like the render being skipped rather than thrown away.
    src = g.nodes.new("CompositorNodeRLayers"); src.location = (-900, 0)
    out = g.nodes.new("NodeGroupOutput"); out.location = (1800, 0)

    # Screen coordinates, needed three times below. `Normalized` IS `uv`.
    # ⚠ ITS `Image` INPUT IS NOT DECORATIVE — it is where the node gets the
    # domain to produce coordinates over. Unlinked, every output is zero, and
    # the failure is silent and plausible: a flat background instead of a
    # gradient, no halo, and a vignette that is a constant. Nothing errors.
    crd = g.nodes.new("CompositorNodeImageCoordinates"); crd.location = (-900, -700)
    g.links.new(src.outputs["Image"], crd.inputs["Image"])
    csep = g.nodes.new("ShaderNodeSeparateXYZ"); csep.location = (-740, -700)
    g.links.new(crd.outputs["Normalized"], csep.inputs[0])

    def mix(bt, loc, fac=1.0, b=None):
        n = g.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"; n.blend_type = bt; n.location = loc
        hero._sock(n.inputs, "Factor_Float").default_value = fac
        if b is not None:
            hero._sock(n.inputs, "B_Color").default_value = (*b, 1.0)
        return n

    def menu(node, socket, value):
        try:
            node.inputs[socket].default_value = value
        except Exception as exc:                                   # noqa: BLE001
            print(f"  shipped grade: {socket}={value!r} refused ({exc})")

    # THE BACKGROUND IS A SHADER AND IT HAS A GLOW IN IT. `BG_FS`:
    #
    #   vec2 p = uv*2.0-1.0;
    #   vec3 c = mix(uBot, uTop, pow(clamp(uv.y,0,1), 0.75));
    #   float d = length(p*vec2(1.0,1.25) - vec2(0.0,-0.15));
    #   c += uGlow * exp(-d*2.1) * (0.85 + 0.15*sin(t*0.0007));
    #
    # `bgGlow` is a warm halo BEHIND the specimen, in screen space, and it is
    # most of why the browser's frame is a dark warm field rather than black.
    # A world shader cannot express it — it is not a direction, it is a place in
    # the picture — so the plant renders on alpha and this composites under it,
    # which is also the browser's own draw order. The animated 0.85-1.00 breath
    # is evaluated at its midpoint; a still cannot show it.
    bot = ci.bg_colour(H)
    top = pal.get("bgTop") or bot
    glow = pal.get("bgGlow") or [0, 0, 0]

    gy = _m(g, "POWER", (-560, -640), b=0.75)
    gy.use_clamp = True
    g.links.new(csep.outputs["Y"], gy.inputs[0])
    grad = mix("MIX", (-380, -640), b=tuple(top))
    hero._sock(grad.inputs, "A_Color").default_value = (*bot, 1.0)
    g.links.new(gy.outputs[0], hero._sock(grad.inputs, "Factor_Float"))

    gx = _m(g, "MULTIPLY_ADD", (-560, -800), b=2.0, c=-1.0)
    g.links.new(csep.outputs["X"], gx.inputs[0])
    gyy = _m(g, "MULTIPLY_ADD", (-560, -900), b=2.5, c=-1.25 + 0.15)
    g.links.new(csep.outputs["Y"], gyy.inputs[0])
    gx2 = _m(g, "MULTIPLY", (-400, -800))
    g.links.new(gx.outputs[0], gx2.inputs[0]); g.links.new(gx.outputs[0], gx2.inputs[1])
    gy2 = _m(g, "MULTIPLY", (-400, -900))
    g.links.new(gyy.outputs[0], gy2.inputs[0]); g.links.new(gyy.outputs[0], gy2.inputs[1])
    gsum = _m(g, "ADD", (-240, -850))
    g.links.new(gx2.outputs[0], gsum.inputs[0]); g.links.new(gy2.outputs[0], gsum.inputs[1])
    gd = _m(g, "SQRT", (-80, -850))
    g.links.new(gsum.outputs[0], gd.inputs[0])
    gnd = _m(g, "MULTIPLY", (80, -850), b=-2.1)
    g.links.new(gd.outputs[0], gnd.inputs[0])
    gex = _m(g, "EXPONENT", (240, -850))
    g.links.new(gnd.outputs[0], gex.inputs[0])
    ghalo = mix("MULTIPLY", (400, -850), b=tuple(glow))
    g.links.new(gex.outputs[0], hero._sock(ghalo.inputs, "A_Color"))
    bgc = mix("ADD", (560, -700))
    g.links.new(hero._sock(grad.outputs, "Result_Color"), hero._sock(bgc.inputs, "A_Color"))
    g.links.new(hero._sock(ghalo.outputs, "Result_Color"), hero._sock(bgc.inputs, "B_Color"))

    # BY NAME, NOT BY INDEX. Alpha Over is (Background, Foreground, Factor) in
    # 5.x and was (Factor, Image, Image) before it; wiring by position put the
    # background on Foreground and the render on Factor, which composites the
    # unlinked Background socket's default 0.8 grey over everything and reads as
    # a blown-out frame rather than as a mis-wire.
    over = g.nodes.new("CompositorNodeAlphaOver"); over.location = (-860, -300)
    g.links.new(hero._sock(bgc.outputs, "Result_Color"), over.inputs["Background"])
    g.links.new(src.outputs["Image"], over.inputs["Foreground"])

    # bloom: a threshold pass, blurred, added at `bloomAmt`. Glare's own
    # Strength is that add, so the numbers carry over directly. It runs over the
    # COMPOSITE, background included, exactly as `BRIGHT_FS` does.
    gl = g.nodes.new("CompositorNodeGlare"); gl.location = (-700, 0)
    menu(gl, "Type", "Fog Glow"); menu(gl, "Quality", "High")
    gl.inputs["Threshold"].default_value = thresh
    gl.inputs["Strength"].default_value = bloom
    gl.inputs["Size"].default_value = bloom_size

    ld = g.nodes.new("CompositorNodeLensdist"); ld.location = (-500, 0)
    ld.inputs["Dispersion"].default_value = dispersion
    if "Fit" in ld.inputs:
        ld.inputs["Fit"].default_value = True

    ex = mix("MULTIPLY", (-300, 0), b=(exposure, exposure, exposure))

    # aces(x) = clamp( x*(2.51x+0.03) / (x*(2.43x+0.59)+0.14) )
    n1 = mix("MULTIPLY", (-100, 160), b=(2.51, 2.51, 2.51))
    n2 = mix("ADD", (60, 160), b=(0.03, 0.03, 0.03))
    n3 = mix("MULTIPLY", (220, 160))
    d1 = mix("MULTIPLY", (-100, -180), b=(2.43, 2.43, 2.43))
    d2 = mix("ADD", (60, -180), b=(0.59, 0.59, 0.59))
    d3 = mix("MULTIPLY", (220, -180))
    d4 = mix("ADD", (380, -180), b=(0.14, 0.14, 0.14))
    dv = mix("DIVIDE", (540, 0))
    dv.clamp_result = True

    # THE VIGNETTE IS THE EXACT EXPRESSION, not an ellipse mask, because 5.x has
    # `CompositorNodeImageCoordinates` and its `Normalized` output IS `uv`. The
    # first draft here reached for the blurred-ellipse approximation that
    # `blender_hero.grade` uses and wrote a comment excusing it; the node that
    # makes the excuse unnecessary turned up in the same listing that explained
    # why `CompositorNodeTexture` had stopped existing. Look at what the API
    # offers before deciding what cannot be done with it.
    #
    #   c *= 1.0 - uVig * dot(uv-0.5, uv-0.5) * 1.6
    dx = _m(g, "SUBTRACT", (860, -360), b=0.5)
    dy = _m(g, "SUBTRACT", (860, -500), b=0.5)
    g.links.new(csep.outputs["X"], dx.inputs[0])
    g.links.new(csep.outputs["Y"], dy.inputs[0])
    xx = _m(g, "MULTIPLY", (1000, -360)); yy = _m(g, "MULTIPLY", (1000, -500))
    g.links.new(dx.outputs[0], xx.inputs[0]); g.links.new(dx.outputs[0], xx.inputs[1])
    g.links.new(dy.outputs[0], yy.inputs[0]); g.links.new(dy.outputs[0], yy.inputs[1])
    dd = _m(g, "ADD", (1140, -420))
    g.links.new(xx.outputs[0], dd.inputs[0]); g.links.new(yy.outputs[0], dd.inputs[1])
    vf = _m(g, "MULTIPLY_ADD", (1280, -420), b=-vignette * 1.6, c=1.0)
    g.links.new(dd.outputs[0], vf.inputs[0])
    vig = mix("MULTIPLY", (1080, 0))
    g.links.new(vf.outputs[0], hero._sock(vig.inputs, "B_Color"))

    g.links.new(over.outputs["Image"], gl.inputs["Image"])
    g.links.new(gl.outputs["Image"], ld.inputs["Image"])
    g.links.new(ld.outputs["Image"], hero._sock(ex.inputs, "A_Color"))
    for n in (n1, d1):
        g.links.new(hero._sock(ex.outputs, "Result_Color"),
                    hero._sock(n.inputs, "A_Color"))
    g.links.new(hero._sock(n1.outputs, "Result_Color"), hero._sock(n2.inputs, "A_Color"))
    g.links.new(hero._sock(n2.outputs, "Result_Color"), hero._sock(n3.inputs, "B_Color"))
    g.links.new(hero._sock(ex.outputs, "Result_Color"), hero._sock(n3.inputs, "A_Color"))
    g.links.new(hero._sock(d1.outputs, "Result_Color"), hero._sock(d2.inputs, "A_Color"))
    g.links.new(hero._sock(d2.outputs, "Result_Color"), hero._sock(d3.inputs, "B_Color"))
    g.links.new(hero._sock(ex.outputs, "Result_Color"), hero._sock(d3.inputs, "A_Color"))
    g.links.new(hero._sock(d3.outputs, "Result_Color"), hero._sock(d4.inputs, "A_Color"))
    g.links.new(hero._sock(n3.outputs, "Result_Color"), hero._sock(dv.inputs, "A_Color"))
    g.links.new(hero._sock(d4.outputs, "Result_Color"), hero._sock(dv.inputs, "B_Color"))

    g.links.new(hero._sock(dv.outputs, "Result_Color"), hero._sock(vig.inputs, "A_Color"))
    tail = vig

    # grain, added after the tone map exactly as `COMP_FS` does. The browser
    # hashes `uv * vec2(1024, 768)`; white noise on the same coordinates scaled
    # the same way is the same thing, one pixel of noise per screen pixel.
    # (`CompositorNodeTexture` does not exist in 5.x — a texture-datablock node
    # was the 4.x route and it is gone.)
    if grain > 0:
        px = g.nodes.new("ShaderNodeVectorMath"); px.operation = "MULTIPLY"
        px.location = (1280, -620)
        px.inputs[1].default_value = (1024.0, 768.0, 1.0)
        g.links.new(crd.outputs["Normalized"], px.inputs[0])
        wn = g.nodes.new("ShaderNodeTexWhiteNoise"); wn.location = (1440, -620)
        g.links.new(px.outputs["Vector"], wn.inputs["Vector"])
        gv = _m(g, "MULTIPLY_ADD", (1600, -620), b=grain, c=-0.5 * grain)
        g.links.new(wn.outputs["Value"], gv.inputs[0])
        gadd = mix("ADD", (1600, 0))
        g.links.new(hero._sock(vig.outputs, "Result_Color"),
                    hero._sock(gadd.inputs, "A_Color"))
        g.links.new(gv.outputs[0], hero._sock(gadd.inputs, "B_Color"))
        tail = gadd

    g.links.new(hero._sock(tail.outputs, "Result_Color"), out.inputs[0])
    print(f"  shipped grade: bloom {bloom} @ {thresh}, exposure {exposure}, "
          f"vignette {vignette}, grain {grain}")
    return g


# ---------------------------------------------------------------------------
def shipped(H, res=(1600, 2000), samples=32, lens=85.0, fstop=16.0,
            azimuth=28.0, elevation=-0.06, margin=1.10, trim=0.02,
            fog=True, do_grade=True, exposure=0.0, emis_mul=3.0,
            vein_mul=1.0, dof=False, px_floor=1.5):
    """Reproduce `60_render.js` on an imported specimen. Returns the camera."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    # THE BACKGROUND IS COMPOSITED, NOT RENDERED, when the grade is on — see
    # `grade()`. `bgGlow` is a screen-space halo and a world shader cannot say
    # that. With the grade off there is nothing to composite over, so the world
    # gradient below has to do the job and the film stays opaque.
    sc.render.film_transparent = bool(do_grade)
    # STANDARD, NOT AgX — the ACES fit is rebuilt in the compositor above and a
    # second film response on top of it is grading twice.
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = exposure
    if hasattr(sc, "cycles_curves"):
        # RIBBONS is a camera-facing sheet, which is the exact artefact the
        # curve export was built to delete. Three stills passed before a `cells`
        # view showed a stem as a flat band.
        sc.cycles_curves.shape = "THICK"

    # No lights, no BSDFs, no volume. Nothing here bounces.
    for ob in list(bpy.data.objects):
        if ob.type in ("LIGHT",) or ob.name in ("Cube", "canalisation.ground",
                                                "canalisation.air"):
            bpy.data.objects.remove(ob, do_unlink=True)

    obs = [bpy.data.objects[n] for n in H.get("_objects", [])
           if n in bpy.data.objects]
    lo, hi = hero.geo_bounds(obs, trim=trim)
    ctr = (lo + hi) * 0.5
    height = max(hi.z - lo.z, 0.1)
    width = max(hi.x - lo.x, hi.y - lo.y, 0.1)

    cam = bpy.data.objects.get("canalisation.cam")
    if cam is None:
        cam = ci._link("canalisation.cam", bpy.data.cameras.new("canalisation.cam"))
    cam.data.lens = lens
    cam.data.sensor_fit = "HORIZONTAL"        # AUTO fits the LONGER image axis
    cam.data.dof.use_dof = bool(dof)
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

    # `uFogNear` is measured from the NEAR FACE of the subject, not from the
    # eye, so the fog reads the same whether the camera is close in or pulled
    # back. Half the framing extent is that face to within the subject's own
    # asymmetry, which is the accuracy this term deserves.
    near = max(0.0, dist - max(width, height) * 0.5)
    floor_radii(obs, focus, lens, cam.data.sensor_width, res[0], px_floor)

    surface_material(H, fog=fog, near=near, emis_mul=emis_mul)
    vein_material(H, mul=vein_mul, fog=fog, near=near)
    # `blender_import` names its two materials; point them both at the rebuilt
    # ones so a scene assembled by `build()` needs no other change.
    for ob in obs:
        for slot in ob.material_slots:
            nm = (slot.material.name if slot.material else "")
            if nm.startswith("canalisation.surface"):
                slot.material = bpy.data.materials["canalisation.surface"]
            elif nm.startswith("canalisation.vein") or nm.startswith("canalisation.add"):
                slot.material = bpy.data.materials["canalisation.vein"]

    # the background gradient, bgBot to bgTop, at strength 1: with no BSDF in
    # the scene the world is only ever seen directly, so this is exactly the
    # colour the browser clears to.
    pal = H.get("palette", {})
    bot = ci.bg_colour(H)
    top = pal.get("bgTop") or bot
    world = sc.world or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    wt = world.node_tree
    wt.nodes.clear()
    wout = wt.nodes.new("ShaderNodeOutputWorld"); wout.location = (400, 0)
    bgn = wt.nodes.new("ShaderNodeBackground"); bgn.location = (200, 0)
    bgn.inputs[1].default_value = 1.0
    geo = wt.nodes.new("ShaderNodeNewGeometry"); geo.location = (-560, 0)
    sep = wt.nodes.new("ShaderNodeSeparateXYZ"); sep.location = (-380, 0)
    rng = wt.nodes.new("ShaderNodeMapRange"); rng.location = (-220, 0)
    rng.inputs["From Min"].default_value = -0.45
    rng.inputs["From Max"].default_value = 0.55
    ramp = wt.nodes.new("ShaderNodeValToRGB"); ramp.location = (-40, 0)
    ramp.color_ramp.elements[0].color = (bot[0], bot[1], bot[2], 1.0)
    ramp.color_ramp.elements[1].color = (top[0], top[1], top[2], 1.0)
    wt.links.new(geo.outputs["Incoming"], sep.inputs["Vector"])
    wt.links.new(sep.outputs["Z"], rng.inputs["Value"])
    wt.links.new(rng.outputs["Result"], ramp.inputs["Fac"])
    wt.links.new(ramp.outputs["Color"], bgn.inputs[0])
    wt.links.new(bgn.outputs["Background"], wout.inputs["Surface"])

    if do_grade:
        grade(H)

    print(f"  shipped: {height:.2f} m at {focus:.2f} m, {lens:.0f}mm, "
          f"{samples} spp, fog {'on' if fog else 'off'}, "
          f"unlit (no lights in scene)")
    return cam
