import bpy
import os

OUT_GLB = "/storage/emulated/0/Download/FPSPlayer_ARIES_Albedo_v4_runtime.glb"

arm = bpy.data.objects.get("Arms")
armature = bpy.data.objects.get("Armature")
if arm is None or arm.type != "MESH":
    raise RuntimeError("Arms mesh not found")
if armature is None or armature.type != "ARMATURE":
    raise RuntimeError("Armature not found")

bpy.ops.object.select_all(action="DESELECT")
arm.hide_set(False)
arm.hide_render = False
armature.hide_set(False)
armature.hide_render = False
arm.select_set(True)
armature.select_set(True)
bpy.context.view_layer.objects.active = armature

kwargs = dict(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_materials="EXPORT",
    export_yup=True,
)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
if "export_animation_mode" in props:
    kwargs["export_animation_mode"] = "ACTIONS"
if "export_nla_strips" in props:
    kwargs["export_nla_strips"] = False
if "export_force_sampling" in props:
    kwargs["export_force_sampling"] = True

bpy.ops.export_scene.gltf(**kwargs)
print("FPS_EXPORT_V4_OK")
print("actions", len(bpy.data.actions))
print("glb", OUT_GLB, os.path.getsize(OUT_GLB))
