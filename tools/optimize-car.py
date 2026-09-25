"""Reduce secondary car detail while preserving the authored body normals.

Run with: blender --background --factory-startup --python tools/optimize-car.py
The hero silhouette, windscreen and rims remain at source quality with their
authored split normals. Secondary and interior meshes receive stronger reduction
so the hero panels do not need to trade surface quality for geometry savings.
"""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / "assets/car/ferrari.glb"))
before = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
preserve = {"body", "glass", "rim_fl", "rim_fr", "rim_rl", "rim_rr"}
for obj in list(bpy.data.objects):
    if obj.type != "MESH" or obj.name in preserve or len(obj.data.polygons) < 200:
        continue
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Realtime secondary detail reduction", "DECIMATE")
    modifier.ratio = 0.22
    bpy.ops.object.modifier_apply(modifier=modifier.name)
after = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
bpy.ops.export_scene.gltf(
    filepath=str(root / "assets/car/ferrari-lite.glb"),
    export_format="GLB",
    export_extras=True,
    export_animations=False,
)
print("CAR_OPTIMIZED", before, after)
