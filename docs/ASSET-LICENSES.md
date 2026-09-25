# Third-party visual assets

## Ferrari 458 Italia

- Author: **vicent091036**.
- License: **Creative Commons Attribution 4.0 International** — https://creativecommons.org/licenses/by/4.0/
- Original model: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Local file: `assets/car/ferrari.glb`, obtained from Three.js r113: https://raw.githubusercontent.com/mrdoob/three.js/r113/examples/models/gltf/ferrari.glb
- License verification: the Three.js repository's asset-license audit explicitly lists `gltf/ferrari.glb` as **CC-BY 4.0**: https://github.com/mrdoob/three.js/issues/23089#issuecomment-1001258942 . The original Sketchfab model was unavailable at verification on 2026-09-25; attribution is independently confirmed by the official r113 car example: https://github.com/mrdoob/three.js/blob/r113/examples/webgl_materials_car.html
- Changes: material colors, a local procedural reflection environment, scale/orientation adapted to Sketchbook's existing chassis, and wheels attached to existing physics transforms. The downloaded `ferrari.glb` is retained unmodified. The runtime `ferrari-lite.glb` preserves the source body, glass and wheel-rim geometry and authored normals; secondary meshes over 200 polygons are reduced in Blender to 22% of their faces (159,984 triangles total). Node hierarchy and wheel transforms are preserved. The car casts a ground shadow but does not receive the old engine’s shadow map, avoiding visible self-shadow acne.
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

## Photographed arena surfaces

- **Clean Asphalt**, Dimitrios Savva: https://polyhaven.com/a/clean_asphalt
- **Concrete Wall 006**: https://polyhaven.com/a/concrete_wall_006
- License: **CC0**, https://polyhaven.com/license
- Local 1K JPEG diffuse, OpenGL normal and roughness maps in `assets/textures/`. Obtained from the download links on the corresponding Poly Haven pages; filenames retain asset identities. Used with original UVs/material settings; no external requests during play.

## Voodoo tribute

The Voodoo, Helix Jump and Hole.io names are editorial references in an independent hackathon tribute. Signs and sculptures are original geometry/canvas artwork. No logos or game artwork were copied; this is not an official Voodoo product.
