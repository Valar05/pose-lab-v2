import bpy
import binascii
import math
import os
import struct
import zlib
from array import array

DOWNLOAD = "/storage/emulated/0/Download"
OUT_BLEND = os.path.join(DOWNLOAD, "FPSPlayer_UV_Albedo_v5_1.blend")
OUT_PNG = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Albedo_v5_1.png")
SIZE = 1024
GUTTER_PASSES = 6


def rgba(rgb):
    return (*rgb, 255)


# Locked v4 palette. V5 changes only the placement and readability of these
# accepted colors; it introduces no new color family and no procedural noise.
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


def png_chunk(kind, payload):
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", binascii.crc32(body) & 0xFFFFFFFF)


def write_png_rgba(path, buf, width, height):
    stride = width * 4
    raw = b"".join(
        b"\x00" + bytes(buf[y * stride : (y + 1) * stride])
        for y in range(height - 1, -1, -1)
    )
    data = bytearray(b"\x89PNG\r\n\x1a\n")
    data.extend(png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
    data.extend(png_chunk(b"IDAT", zlib.compress(raw, 9)))
    data.extend(png_chunk(b"IEND", b""))
    with open(path, "wb") as handle:
        handle.write(data)


def color_at(position, normal):
    ax = abs(position.x)

    # Gloves and ochre cuffs are exactly the accepted v4 treatment.
    if ax >= 2.45:
        if 2.62 <= ax <= 2.91 and normal.z > 0.30:
            return PALETTE["knuckle"]
        if normal.z > 0.28:
            return PALETTE["glove_top"]
        if normal.z < -0.20:
            return PALETTE["glove_palm"]
        return PALETTE["glove_mid"]
    if 2.28 <= ax < 2.45:
        return PALETTE["cuff_shadow"] if normal.z < -0.18 else PALETTE["cuff"]

    if 1.18 <= ax < 2.28:
        # Broad manufactured zones replace the unreadable uninterrupted wedge.
        # The narrow dark rings are joint/seam reveals, not dirt or noise.
        if 1.18 <= ax < 1.28:
            return PALETTE["undersuit"]
        if 1.28 <= ax < 1.34:
            return PALETTE["trim"]
        if 1.34 <= ax < 1.58:
            return PALETTE["armor_shadow"] if abs(normal.y) > 0.62 else PALETTE["armor"]
        if 1.58 <= ax < 1.64:
            return PALETTE["trim"]
        if 1.64 <= ax < 1.90:
            # One restrained red top identifier; both arms retain the same
            # underlying accepted palette and no new hue is introduced.
            if position.x > 0 and 1.78 <= ax < 1.84 and normal.z > 0.05:
                return PALETTE["warning_red"]
            return PALETTE["armor_top"] if normal.z > -0.08 else PALETTE["armor"]
        if 1.90 <= ax < 1.98:
            return PALETTE["utility"] if normal.z > -0.18 else PALETTE["cuff_shadow"]
        if 1.98 <= ax < 2.17:
            return PALETTE["armor"] if normal.z > -0.25 else PALETTE["armor_shadow"]
        if 2.17 <= ax < 2.23:
            return PALETTE["trim"]
        return PALETTE["armor_shadow"]

    return PALETTE["undersuit"]


def fill_triangle(buf, mask, uv_points, positions, normal):
    p = [(u * (SIZE - 1), v * (SIZE - 1)) for u, v in uv_points]
    min_x = max(0, math.floor(min(x for x, _ in p)) - 1)
    max_x = min(SIZE - 1, math.ceil(max(x for x, _ in p)) + 1)
    min_y = max(0, math.floor(min(y for _, y in p)) - 1)
    max_y = min(SIZE - 1, math.ceil(max(y for _, y in p)) + 1)
    (ax, ay), (bx, by), (cx, cy) = p
    denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(denom) < 1e-8:
        return
    for y in range(min_y, max_y + 1):
        py = y + 0.5
        for x in range(min_x, max_x + 1):
            px = x + 0.5
            w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom
            w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom
            w2 = 1.0 - w0 - w1
            if w0 >= -0.001 and w1 >= -0.001 and w2 >= -0.001:
                position = positions[0] * w0 + positions[1] * w1 + positions[2] * w2
                set_pixel(buf, x, y, color_at(position, normal))
                mask[y * SIZE + x] = 1


def dilate_gutters(buf, mask, passes):
    """Copy painted edge colors outward without altering any painted texel."""
    total_added = 0
    for _pass in range(passes):
        source_mask = mask[:]
        additions = []
        for y in range(SIZE):
            row = y * SIZE
            for x in range(SIZE):
                index = row + x
                if source_mask[index]:
                    continue
                neighbor = None
                if x > 0 and source_mask[index - 1]:
                    neighbor = index - 1
                elif x + 1 < SIZE and source_mask[index + 1]:
                    neighbor = index + 1
                elif y > 0 and source_mask[index - SIZE]:
                    neighbor = index - SIZE
                elif y + 1 < SIZE and source_mask[index + SIZE]:
                    neighbor = index + SIZE
                if neighbor is not None:
                    additions.append((index, neighbor))
        for index, neighbor in additions:
            dst = index * 4
            src = neighbor * 4
            buf[dst : dst + 4] = buf[src : src + 4]
            mask[index] = 1
        total_added += len(additions)
    return total_added


image = next(
    (
        img
        for version in ("Albedo_v5", "Albedo_v4", "Albedo_v3")
        for img in bpy.data.images
        if version in img.name
    ),
    None,
)
if image is None:
    raise RuntimeError("Packed Albedo_v5/v4/v3 image not found in Blender master")
if image.size[0] != SIZE or image.size[1] != SIZE:
    image.scale(SIZE, SIZE)

pixels, _source_floats = image_bytes(image)
before = bytes(pixels)
arm = bpy.data.objects.get("Arms")
if arm is None or arm.type != "MESH":
    raise RuntimeError("Arms mesh not found")
mesh = arm.data
uv_layer = mesh.uv_layers.get("AlbedoUV_v1") or mesh.uv_layers.active
if uv_layer is None:
    raise RuntimeError("AlbedoUV_v1/active UV layer not found")

mesh.calc_loop_triangles()
painted = 0
paint_mask = bytearray(SIZE * SIZE)
for tri in mesh.loop_triangles:
    poly = mesh.polygons[tri.polygon_index]
    uv_points = [tuple(uv_layer.data[i].uv) for i in tri.loops]
    positions = [mesh.vertices[mesh.loops[i].vertex_index].co.copy() for i in tri.loops]
    fill_triangle(pixels, paint_mask, uv_points, positions, poly.normal)
    painted += 1

gutter_pixels = dilate_gutters(pixels, paint_mask, GUTTER_PASSES)

changed_pixels = sum(
    1 for i in range(0, len(pixels), 4) if pixels[i : i + 4] != before[i : i + 4]
)
if changed_pixels < 4000:
    raise RuntimeError("V5.1 cleanup pass changed too few pixels")

write_png_rgba(OUT_PNG, pixels, SIZE, SIZE)

# Reopen the encoded PNG instead of trusting Blender's in-memory datablock.
# This rejects the exact solid-black failure that a fresh image datablock
# produced on the phone.
encoded = bpy.data.images.load(OUT_PNG, check_existing=False)
if tuple(encoded.size) != (SIZE, SIZE):
    raise RuntimeError("Encoded v5.1 PNG has the wrong dimensions")
encoded_values = array("f", [0.0]) * (encoded.size[0] * encoded.size[1] * 4)
encoded.pixels.foreach_get(encoded_values)
encoded_colors = {
    tuple(round(encoded_values[i + c] * 255.0) for c in range(3))
    for i in range(0, len(encoded_values), 4)
}
if len(encoded_colors) < 8 or max(max(color) for color in encoded_colors) < 90:
    raise RuntimeError("Encoded v5.1 PNG failed color/readability gate")
encoded.name = "FPSPlayer_ARIES_Albedo_v5_1"
encoded.colorspace_settings.name = "sRGB"
encoded.pack()

for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
        bsdf.inputs["Roughness"].default_value = 0.78
        bsdf.inputs["Metallic"].default_value = 0.0
    for node in material.node_tree.nodes:
        if node.type == "TEX_IMAGE":
            node.image = encoded

# Save the master before any runtime packaging. GLB export is deliberately not
# attempted here because Blender 4.3's exporter crashes in this phone proot.
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

print("FPS_ALBEDO_V5_1_OK")
print("painted_triangles", painted)
print("changed_pixels", changed_pixels)
print("gutter_pixels", gutter_pixels)
print("encoded_colors", len(encoded_colors))
print("actions", len(bpy.data.actions))
print("blend", OUT_BLEND, os.path.getsize(OUT_BLEND))
print("png", OUT_PNG, os.path.getsize(OUT_PNG))
