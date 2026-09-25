# Third-party visual assets

## Ferrari 458 Italia

- Author: **vicent091036**.
- License: **Creative Commons Attribution 4.0 International** — https://creativecommons.org/licenses/by/4.0/
- Original model: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Local file: `assets/car/ferrari.glb`, obtained from Three.js r113: https://raw.githubusercontent.com/mrdoob/three.js/r113/examples/models/gltf/ferrari.glb
- License verification: the Three.js repository's asset-license audit explicitly lists `gltf/ferrari.glb` as **CC-BY 4.0**: https://github.com/mrdoob/three.js/issues/23089#issuecomment-1001258942 . The original Sketchfab model was unavailable at verification on 2026-09-25; attribution is independently confirmed by the official r113 car example: https://github.com/mrdoob/three.js/blob/r113/examples/webgl_materials_car.html
- Changes: material colors, a local procedural reflection environment, scale/orientation adapted to Sketchbook's existing chassis, and wheels attached to existing physics transforms. The downloaded `ferrari.glb` is retained unmodified. The runtime `ferrari-lite.glb` is a Blender decimation of meshes over 200 polygons to 22% of their original faces; node hierarchy and wheel transforms are preserved.
- Suggested visible credit: **Ferrari 458 Italia by vicent091036 · CC BY 4.0** (link to the original model and license).

## Draco decoder

- Author: Google / Draco contributors.
- License: **Apache License 2.0**, included at `assets/draco/LICENSE`.
- Files: `assets/draco/draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js`.
- Source: unchanged copies from installed Three.js **0.113.0**, `examples/js/libs/draco/gltf/`.
- Upstream: https://github.com/google/draco ; Three.js decoder documentation: https://github.com/mrdoob/three.js/blob/r113/examples/js/libs/draco/README.md

## Existing game assets

The original car and world in `build/assets/`, and vehicle controller code, are
retained from **Sketchbook**, by **swift502**, under the repository's MIT license.
The Ferrari appearance changes no physics and falls back to this original car
if its load fails.

## Fonts

Barlow and Barlow Condensed by Jeremy Tribby, SIL Open Font License 1.1. License texts included in assets/fonts; Fontsource distributions served locally.
