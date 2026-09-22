import bpy
import bmesh
import os

DOWNLOAD = "/storage/emulated/0/Download"
OUT_BLEND = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Plates_v7_2.blend")
OUT_GLB = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Plates_v7_2_runtime.glb")
SOURCE_NAME = "Arms"
PLATE_PREFIX = "ARIES_Plate_"

# Exact arm-space intervals used by the accepted v5.1 albedo authoring.
# Thicknesses are local-space; Arms has a uniform 0.252538 scale.
SPECS = [
    ("Upper_A", 1.34, 1.58, 0.026, "armor", None),
    ("Upper_B", 1.64, 1.90, 0.030, "armor", None),
    ("Forearm", 1.98, 2.17, 0.032, "armor", None),
    ("Wrist_Plate", 2.23, 2.28, 0.030, "armor", None),
    ("Utility_Gold", 1.90, 1.98, 0.050, "gold", None),
    ("Wrist_Gold", 2.28, 2.45, 0.055, "gold", None),
    ("Knuckle", 2.62, 2.91, 0.046, "knuckle", "top"),
]

source = bpy.data.objects.get(SOURCE_NAME)
if source is None or source.type != "MESH":
    raise RuntimeError("Arms mesh not found")
armature = next((m.object for m in source.modifiers if m.type == "ARMATURE"), None)
if armature is None:
    raise RuntimeError("Arms has no Armature modifier")
if not source.vertex_groups:
    raise RuntimeError("Arms has no skin vertex groups")

# Idempotent rebuild.
for obj in list(bpy.data.objects):
    if obj.name.startswith(PLATE_PREFIX):
        bpy.data.objects.remove(obj, do_unlink=True)

# Keep the accepted albedo but demote the rejected structural normal to micro-detail.
player = source.active_material
if player is None:
    raise RuntimeError("Arms material missing")
for node in player.node_tree.nodes if player.use_nodes and player.node_tree else []:
    if node.type == "NORMAL_MAP":
        node.inputs["Strength"].default_value = 0.22

plate_material = bpy.data.materials.get("ARIES_Plate_Material")
if plate_material is None:
    plate_material = player.copy()
    plate_material.name = "ARIES_Plate_Material"
for node in plate_material.node_tree.nodes if plate_material.use_nodes and plate_material.node_tree else []:
    if node.type == "NORMAL_MAP":
        node.inputs["Strength"].default_value = 0.16

def clip_interval(obj, side, lo, hi, face_filter=None):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    bm.verts.ensure_lookup_table()
    axis = (float(side), 0.0, 0.0)
    geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
    bmesh.ops.bisect_plane(
        bm,
        geom=geom,
        dist=1.0e-6,
        plane_co=(side * lo, 0.0, 0.0),
        plane_no=axis,
        clear_inner=True,
        clear_outer=False,
    )
    geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
    bmesh.ops.bisect_plane(
        bm,
        geom=geom,
        dist=1.0e-6,
        plane_co=(side * hi, 0.0, 0.0),
        plane_no=axis,
        clear_inner=False,
        clear_outer=True,
    )
    bm.normal_update()
    if face_filter == "top":
        remove = [f for f in bm.faces if f.normal.z <= 0.22]
        if remove:
            bmesh.ops.delete(bm, geom=remove, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1.0e-6)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=1.0e-7)
    if not bm.faces:
        bm.free()
        return False
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return True

def apply_modifier(obj, modifier):
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)

created = []
for label, lo, hi, thickness, family, face_filter in SPECS:
    for side, side_name in ((1, "R"), (-1, "L")):
        obj = source.copy()
        obj.data = source.data.copy()
        obj.name = f"{PLATE_PREFIX}{side_name}_{label}"
        obj.data.name = obj.name + "_Mesh"
        source.users_collection[0].objects.link(obj)
        if not clip_interval(obj, side, lo, hi, face_filter):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue

        # Each shell keeps the source vertex groups and armature relationship.
        if len(obj.vertex_groups) != len(source.vertex_groups):
            raise RuntimeError(f"Weight groups lost on {obj.name}")
        arm_mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None)
        if arm_mod is None or arm_mod.object != armature:
            raise RuntimeError(f"Armature binding lost on {obj.name}")

        obj.data.materials.clear()
        obj.data.materials.append(plate_material)
        for poly in obj.data.polygons:
            poly.material_index = 0
            poly.use_smooth = True

        solid = obj.modifiers.new("Physical plate thickness", "SOLIDIFY")
        solid.thickness = thickness
        solid.offset = 1.0
        solid.use_rim = True
        solid.use_even_offset = True
        bevel = obj.modifiers.new("Manufactured edge bevel", "BEVEL")
        bevel.width = min(0.014, thickness * 0.30)
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = 0.65

        # Bake construction while leaving the Armature modifier live.
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_move_to_index(modifier=solid.name, index=0)
        bpy.ops.object.modifier_move_to_index(modifier=bevel.name, index=1)
        apply_modifier(obj, solid)
        apply_modifier(obj, bevel)
        obj.data.validate(verbose=False, clean_customdata=False)
        obj.data.update(calc_edges=True)

        arm_mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None)
        if arm_mod is None or arm_mod.object != armature:
            raise RuntimeError(f"Applied geometry broke armature on {obj.name}")
        weighted = sum(1 for v in obj.data.vertices if v.groups)
        if weighted != len(obj.data.vertices):
            raise RuntimeError(f"Unweighted plate vertices on {obj.name}: {weighted}/{len(obj.data.vertices)}")
        obj["aries_plate_family"] = family
        obj["aries_plate_interval"] = (lo, hi)
        obj["aries_plate_thickness"] = thickness
        created.append(obj)

# The right-arm red identifier becomes its own thin top plate.
obj = source.copy()
obj.data = source.data.copy()
obj.name = PLATE_PREFIX + "R_Warning"
obj.data.name = obj.name + "_Mesh"
source.users_collection[0].objects.link(obj)
if clip_interval(obj, 1, 1.78, 1.84, "top"):
    obj.data.materials.clear()
    obj.data.materials.append(plate_material)
    for poly in obj.data.polygons:
        poly.material_index = 0
        poly.use_smooth = True
    solid = obj.modifiers.new("Identifier thickness", "SOLIDIFY")
    solid.thickness = 0.042
    solid.offset = 1.0
    solid.use_rim = True
    solid.use_even_offset = True
    bevel = obj.modifiers.new("Identifier bevel", "BEVEL")
    bevel.width = 0.010
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_move_to_index(modifier=solid.name, index=0)
    bpy.ops.object.modifier_move_to_index(modifier=bevel.name, index=1)
    apply_modifier(obj, solid)
    apply_modifier(obj, bevel)
    obj.data.validate(verbose=False, clean_customdata=False)
    obj.data.update(calc_edges=True)
    if any(not v.groups for v in obj.data.vertices):
        raise RuntimeError("Unweighted warning plate vertices")
    obj["aries_plate_family"] = "warning"
    created.append(obj)
else:
    bpy.data.objects.remove(obj, do_unlink=True)

if len(created) < 13:
    raise RuntimeError(f"Expected at least 13 plate objects, built {len(created)}")
if any(next((m for m in o.modifiers if m.type == "ARMATURE"), None) is None for o in created):
    raise RuntimeError("A plate lost its Armature modifier")

# Authoritative phone master.
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

# Export the accepted skinned body plus the independently skinned plates.
bpy.ops.object.select_all(action="DESELECT")
source.hide_set(False)
source.hide_render = False
source.select_set(True)
armature.hide_set(False)
armature.hide_render = False
armature.select_set(True)
for obj in created:
    obj.hide_set(False)
    obj.hide_render = False
    obj.select_set(True)
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
    export_apply=True,
)
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
if "export_animation_mode" in props:
    kwargs["export_animation_mode"] = "ACTIONS"
if "export_nla_strips" in props:
    kwargs["export_nla_strips"] = False
if "export_force_sampling" in props:
    kwargs["export_force_sampling"] = True
bpy.ops.export_scene.gltf(**kwargs)

print("FPS_PLATE_GEOMETRY_V1_2_OK")
print("plate_count", len(created))
print("plate_names", [o.name for o in created])
print("source_groups", len(source.vertex_groups))
print("actions", len(bpy.data.actions))
print("blend", OUT_BLEND, os.path.getsize(OUT_BLEND))
print("glb", OUT_GLB, os.path.getsize(OUT_GLB))
