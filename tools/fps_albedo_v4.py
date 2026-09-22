import bpy
import math
import os
from array import array

DOWNLOAD = "/storage/emulated/0/Download"
OUT_BLEND = os.path.join(DOWNLOAD, "FPSPlayer_UV_Albedo_v4.blend")
OUT_PNG = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Albedo_v4.png")
OUT_GLB = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Albedo_v4_runtime.glb")

# Albedo-only pass. 512px is deliberate: the material is broad color zoning,
# and this keeps the phone Blender run below its proot memory cliff.
SIZE = 512


def rgba(rgb):
    return (*rgb, 255)


# ARIES reference palette: dusty EVA ivory, oxidized ochre, warm technical
# browns, and one restrained emergency-red identifier. Nothing is pure white
# or pure black, so the arms cannot read as skin plus Counter-Strike gloves.
PALETTE = {
    "glove_palm": rgba((47, 43, 36)),
    "glove_mid": rgba((70, 63, 52)),
    "glove_top": rgba((94, 82, 65)),
    "knuckle": rgba((143, 119, 82)),
    "cuff": rgba((174, 111, 29)),
    "cuff_shadow": rgba((126, 79, 27)),
    "armor": rgba((163, 153, 133)),
    "armor_top": rgba((188, 178, 154)),
    "armor_shadow": rgba((132, 124, 108)),
    "undersuit": rgba((56, 52, 46)),
    "trim": rgba((73, 65, 55)),
    "utility": rgba((157, 101, 30)),
    "warning_red": rgba((135, 47, 35)),
    "leg": rgba((166, 155, 134)),
    "boot": rgba((51, 47, 41)),
}


# Normalize known v2/v3 flat colors before repainting the Arms triangles.
OLD_TO_NEW = {
    (43, 42, 39): PALETTE["glove_palm"],
    (60, 56, 50): PALETTE["glove_mid"],
    (78, 70, 60): PALETTE["glove_top"],
    (124, 111, 91): PALETTE["knuckle"],
    (184, 119, 28): PALETTE["cuff"],
    (190, 176, 147): PALETTE["armor"],
    (207, 194, 166): PALETTE["armor_top"],
    (178, 163, 135): PALETTE["armor_shadow"],
    (91, 81, 68): PALETTE["trim"],
    (205, 134, 27): PALETTE["utility"],
    (67, 62, 55): PALETTE["undersuit"],
    (190, 177, 148): PALETTE["leg"],
    (44, 43, 39): PALETTE["boot"],
}


def image_bytes(image):
    values = array("f", [0.0]) * (SIZE * SIZE * 4)
    image.pixels.foreach_get(values)
    out = bytearray(len(values))
    for i, value in enumerate(values):
        out[i] = max(0, min(255, round(value * 255.0)))
    return out, values


def set_pixel(buf, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        i = (y * SIZE + x) * 4
        buf[i : i + 4] = bytes(color)


def edge(ax, ay, bx, by, px, py):
    return (px - ax) * (by - ay) - (py - ay) * (bx - ax)


def fill_triangle(buf, points, color):
    p = [(u * (SIZE - 1), v * (SIZE - 1)) for u, v in points]
    min_x = max(0, math.floor(min(x for x, _ in p)) - 1)
    max_x = min(SIZE - 1, math.ceil(max(x for x, _ in p)) + 1)
    min_y = max(0, math.floor(min(y for _, y in p)) - 1)
    max_y = min(SIZE - 1, math.ceil(max(y for _, y in p)) + 1)
    (ax, ay), (bx, by), (cx, cy) = p
    area = edge(ax, ay, bx, by, cx, cy)
    if abs(area) < 1e-8:
        return
    positive = area > 0
    for y in range(min_y, max_y + 1):
        py = y + 0.5
        for x in range(min_x, max_x + 1):
            px = x + 0.5
            e0 = edge(ax, ay, bx, by, px, py)
            e1 = edge(bx, by, cx, cy, px, py)
            e2 = edge(cx, cy, ax, ay, px, py)
            inside = (
                e0 >= -0.01 and e1 >= -0.01 and e2 >= -0.01
                if positive
                else e0 <= 0.01 and e1 <= 0.01 and e2 <= 0.01
            )
            if inside:
                set_pixel(buf, x, y, color)


def face_color(poly):
    center = poly.center
    normal = poly.normal
    ax = abs(center.x)

    # Hands: warm technical leather/rubber, not black.
    if ax >= 2.45:
        if 2.62 <= ax <= 2.91 and normal.z > 0.30:
            return PALETTE["knuckle"]
        if normal.z > 0.28:
            return PALETTE["glove_top"]
        if normal.z < -0.20:
            return PALETTE["glove_palm"]
        return PALETTE["glove_mid"]

    # Ochre wrist armor with a darker underside.
    if 2.28 <= ax < 2.45:
        return PALETTE["cuff_shadow"] if normal.z < -0.18 else PALETTE["cuff"]

    # Main forearm armor. The narrow red identifier is intentionally small.
    if 1.18 <= ax < 2.28:
        if 1.49 <= ax < 1.56 and normal.z > 0.05:
            return PALETTE["warning_red"]
        if 1.42 <= ax < 1.62:
            return PALETTE["utility"]
        if 1.88 <= ax < 1.98 and normal.z > -0.10:
            return PALETTE["trim"]
        if normal.z > 0.35:
            return PALETTE["armor_top"]
        if normal.z < -0.30:
            return PALETTE["undersuit"]
        if abs(normal.y) > 0.72:
            return PALETTE["armor_shadow"]
        return PALETTE["armor"]

    # Shoulder-side geometry remains visibly technical instead of falling
    # through to a pale legacy texture.
    return PALETTE["undersuit"]


image = next(
    (
        img
        for img in bpy.data.images
        if "Albedo_v3" in img.name or "Albedo_v2" in img.name
    ),
    None,
)
if image is None:
    raise RuntimeError("Packed Albedo_v3/v2 image not found in Blender master")
if image.size[0] != SIZE or image.size[1] != SIZE:
    image.scale(SIZE, SIZE)

pixels, floats = image_bytes(image)
for i in range(0, len(pixels), 4):
    replacement = OLD_TO_NEW.get(tuple(pixels[i : i + 3]))
    if replacement:
        pixels[i : i + 4] = bytes(replacement)

arm = bpy.data.objects.get("Arms")
if arm is None or arm.type != "MESH":
    raise RuntimeError("Arms mesh not found")
mesh = arm.data
uv_layer = mesh.uv_layers.get("AlbedoUV_v1") or mesh.uv_layers.active
if uv_layer is None:
    raise RuntimeError("AlbedoUV_v1/active UV layer not found")

mesh.calc_loop_triangles()
painted = 0
for tri in mesh.loop_triangles:
    poly = mesh.polygons[tri.polygon_index]
    color = face_color(poly)
    points = [tuple(uv_layer.data[loop_index].uv) for loop_index in tri.loops]
    fill_triangle(pixels, points, color)
    painted += 1

for i, channel in enumerate(pixels):
    floats[i] = channel / 255.0
image.pixels.foreach_set(floats)
image.name = "FPSPlayer_ARIES_Albedo_v4"
image.filepath_raw = OUT_PNG
image.file_format = "PNG"
image.colorspace_settings.name = "sRGB"
image.save()
image.pack()

for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
        bsdf.inputs["Roughness"].default_value = 0.78
        bsdf.inputs["Metallic"].default_value = 0.0
        for socket_name in ("Normal", "Coat Weight"):
            socket = bsdf.inputs.get(socket_name)
            if socket:
                if socket_name == "Coat Weight":
                    socket.default_value = 0.0
                for link in list(socket.links):
                    material.node_tree.links.remove(link)
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE":
            node.image = image

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

bpy.ops.object.select_all(action="DESELECT")
armature = bpy.data.objects.get("Armature")
if armature is None:
    raise RuntimeError("Armature not found")
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

print("FPS_ALBEDO_V4_OK")
print("painted_triangles", painted)
print("actions", len(bpy.data.actions))
print("blend", OUT_BLEND, os.path.getsize(OUT_BLEND))
print("png", OUT_PNG, os.path.getsize(OUT_PNG))
print("glb", OUT_GLB, os.path.getsize(OUT_GLB))
