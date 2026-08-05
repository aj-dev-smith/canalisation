# HEADLESS RENDER ENTRY POINT.
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender_shot.py -- \
#       --export export/ember_creeper_7_natural \
#       --out shots/ember.png \
#       --hero '{"samples": 512, "res": [1600, 2000], "air": 0.012}'
#
# The MCP bridge is the right tool for LOOKING at a scene and a bad one for
# rendering it. Two reasons, both learned here rather than assumed:
#
#  - **An interactive Blender accumulates state, and rendering can just stop.**
#    Mid-session `bpy.ops.render.render()` started returning `{'FINISHED'}` in
#    0.07 s with an empty result — in a brand new scene containing one sphere,
#    so it was the session and not the file. Nothing recovered it from a script.
#    A fresh process per render cannot get into that state.
#  - **A movie-grade frame is minutes, not seconds**, and it has no business
#    blocking the application somebody is looking at the scene in.
#
# So: the MCP connection stays for inspection and iteration at low samples, and
# every frame that matters comes out of here. Same two modules either way, so
# there is no second implementation to drift.

import json
import os
import sys
import time
import importlib.util


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(prog="blender_shot")
    ap.add_argument("--export", required=True,
                    help="path to the .json/.bin pair, without the extension")
    ap.add_argument("--out", required=True, help="output PNG")
    ap.add_argument("--hero", default="{}",
                    help="JSON kwargs forwarded to blender_hero.hero()")
    ap.add_argument("--build", default="{}",
                    help="JSON kwargs forwarded to blender_import.build()")
    ap.add_argument("--turntable", type=int, default=0,
                    help="render N frames of an orbit into --out as a directory")
    ap.add_argument("--look", default="hero",
                    choices=("hero", "shipped", "film", "neutral"),
                    help="film = the production rig; hero = art direction; "
                         "shipped = reproduce 60_render.js; "
                         "neutral = the import's own check rig")
    ap.add_argument("--neutral", action="store_true",
                    help="deprecated alias for --look neutral")
    ap.add_argument("--blend", default="",
                    help="also save the assembled scene to this .blend")
    ap.add_argument("--also", action="append", default=[],
                    help="extra .json/.bin pairs to build into the same scene; "
                         "repeatable. For a film's static set — see --also below")
    a = ap.parse_args(argv)

    here = os.path.dirname(os.path.abspath(__file__))
    # Load order matters: each module picks the earlier ones up out of
    # `sys.modules` at import time, so `look` must come after `hero`.
    ci = _load("ci", os.path.join(here, "blender_import.py"))
    hero = _load("hero", os.path.join(here, "blender_hero.py"))
    look = _load("look", os.path.join(here, "blender_look.py"))
    film = _load("film", os.path.join(here, "blender_film.py"))

    import bpy
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)

    t0 = time.perf_counter()
    H = ci.build(a.export, **json.loads(a.build))

    # `--also` BUILDS A SECOND EXPORT INTO THE SAME SCENE, and it exists for one
    # job: a film's static set. A growing hero is a new specimen every frame
    # (485 of them, 6.3 GB), while the stand behind it never has to change —
    # measured, at 15 m a background plant's whole per-frame sway is 1.16 px
    # against 5.4 px of its own defocus blur, so a set exported ONCE is
    # indistinguishable from a live one and costs 128 MB instead of 62 GB.
    #
    # The extra objects are appended to `_objects` rather than kept separate,
    # deliberately: everything downstream of framing — `floor_radii`, the leaf
    # and vein materials, `prep` — walks that list, and a set that skipped them
    # would be the same plants wearing different tissue. What must NOT come from
    # here is the framing, and it cannot: `film()` takes `span`/`pivot` from the
    # caller, and `blender_clip.mjs` computes them off the hero sequence's own
    # union bbox. `build` already namespaces objects by file stem, so nothing
    # collides.
    for extra in a.also:
        H2 = ci.build(extra, **json.loads(a.build))
        H["_objects"] = H.get("_objects", []) + H2.get("_objects", [])
    print(f"  imported in {time.perf_counter() - t0:.1f}s")

    mode = "neutral" if a.neutral else a.look
    kw = json.loads(a.hero)
    if mode == "neutral":
        ci.setup_scene(H, **kw)
    elif mode == "shipped":
        look.shipped(H, **kw)
    elif mode == "film":
        film.film(H, **kw)
    else:
        hero.hero(H, **kw)

    if a.blend:
        os.makedirs(os.path.dirname(os.path.abspath(a.blend)), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.blend))
        print(f"  saved {a.blend}")

    t0 = time.perf_counter()
    if a.turntable:
        ci.turntable(a.out, frames=a.turntable,
                     samples=bpy.context.scene.cycles.samples)
    else:
        ci.render(a.out)
    print(f"  rendered in {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    main(argv)
