# Exercise picture pipeline

The app ships pre-made pictures at `app/src/main/assets/www/img/ex/<id>-<frame>.webp`.
Two sources:

1. **Photos** (67 moves) — from https://github.com/yuhonas/free-exercise-db (public domain).
   `map.json` maps STRIDE exercise ids -> dataset folder names. Each folder has 0.jpg / 1.jpg.
2. **Illustrations** (30 moves) — rendered from the 3D model in `fig3d.js` for moves the
   dataset has no honest match for (jumping jacks, burpees, yoga poses, clamshells, bird dog...).

## Regenerate
    node render.js            # renders illustrations to exout/*.png (needs playwright + chromium)
    # then composite onto white and convert to webp, and copy mapped photos per map.json

`shot.html` is the render harness; it loads figures.js + exercises.js from the app plus fig3d.js here.
fig3d.js is NOT shipped in the app any more — it is only a build tool.

## Known state
- Pictures verified in desktop Chrome at phone size; every referenced file loads.
- NOT verified on a physical Android device.
