import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'assets/car/ferrari.glb'))
before=sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
for o in list(bpy.data.objects):
 if o.type!='MESH' or len(o.data.polygons)<200: continue
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Realtime mesh reduction','DECIMATE')
 mod.ratio=.22
 bpy.ops.object.modifier_apply(modifier=mod.name)
after=sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
bpy.ops.export_scene.gltf(filepath=str(root/'assets/car/ferrari-lite.glb'),export_format='GLB',export_extras=True,export_animations=False)
print('CAR_OPTIMIZED',before,after)
