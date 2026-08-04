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
    ap.add_argument("--neutral", action="store_true",
                    help="use blender_import.setup_scene instead of the hero rig")
    ap.add_argument("--blend", default="",
                    help="also save the assembled scene to this .blend")
    a = ap.parse_args(argv)

    here = os.path.dirname(os.path.abspath(__file__))
    ci = _load("ci", os.path.join(here, "blender_import.py"))
    hero = _load("hero", os.path.join(here, "blender_hero.py"))

    import bpy
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)

    t0 = time.perf_counter()
    H = ci.build(a.export, **json.loads(a.build))
    print(f"  imported in {time.perf_counter() - t0:.1f}s")

    if a.neutral:
        ci.setup_scene(H, **json.loads(a.hero))
    else:
        hero.hero(H, **json.loads(a.hero))

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
