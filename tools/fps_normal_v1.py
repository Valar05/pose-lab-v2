import bpy
import binascii
import math
import os
import struct
import zlib
from array import array

DOWNLOAD = "/storage/emulated/0/Download"
SOURCE_ALBEDO = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Albedo_v5_1.png")
OUT_NORMAL = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Normal_v1.png")
OUT_BLEND = os.path.join(DOWNLOAD, "FPSPlayer_UV_Albedo_Normal_v6.blend")
SIZE = 1024
NORMAL_STRENGTH = 1.35


PALETTE_HEIGHTS = {
    (47, 43, 36): 0.28,    # glove palm
    (70, 63, 52): 0.36,    # glove mid
    (94, 82, 65): 0.45,    # glove top
    (143, 119, 82): 0.62,  # knuckle plates
    (174, 111, 29): 0.58,  # cuff
    (126, 79, 27): 0.43,   # cuff shadow
    (163, 153, 133): 0.62, # armor
    (188, 178, 154): 0.72, # armor top
    (132, 124, 108): 0.48, # armor shadow
    (56, 52, 46): 0.25,    # undersuit
    (73, 65, 55): 0.34,    # trim
    (157, 101, 30): 0.55,  # utility band
    (135, 47, 35): 0.52,   # warning identifier
    (166, 155, 134): 0.60,
    (51, 47, 41): 0.24,
}


def png_chunk(kind, payload):
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", binascii.crc32(body) & 0xFFFFFFFF)


def decode_authored_png(path):
    data = open(path, "rb").read()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Accepted albedo is not PNG")
    offset = 8
    compressed = bytearray()
    width = height = None
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4 : offset + 8]
        payload = data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, depth, color_type, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            if (depth, color_type, compression, filtering, interlace) != (8, 6, 0, 0, 0):
                raise RuntimeError("Normal authoring requires non-interlaced RGBA8 PNG")
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break
    if (width, height) != (SIZE, SIZE):
        raise RuntimeError("Accepted albedo must be 1024x1024")
    raw = zlib.decompress(bytes(compressed))
    stride = width * 4
    rgba = bytearray(width * height * 4)
    previous = bytearray(stride)
    cursor = 0
    for y in range(height):
        filter_type = raw[cursor]
        cursor += 1
        scanline = bytearray(raw[cursor : cursor + stride])
        cursor += stride
        reconstructed = bytearray(stride)
        for x in range(stride):
            left = reconstructed[x - 4] if x >= 4 else 0
            up = previous[x]
            up_left = previous[x - 4] if x >= 4 else 0
            value = scanline[x]
            if filter_type == 0:
                pass
            elif filter_type == 1:
                value = (value + left) & 255
            elif filter_type == 2:
                value = (value + up) & 255
            elif filter_type == 3:
                value = (value + ((left + up) >> 1)) & 255
            elif filter_type == 4:
                estimate = left + up - up_left
                pa, pb, pc = abs(estimate - left), abs(estimate - up), abs(estimate - up_left)
                predictor = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
                value = (value + predictor) & 255
            else:
                raise RuntimeError("Unsupported PNG filter")
            reconstructed[x] = value
        rgba[y * stride : (y + 1) * stride] = reconstructed
        previous = reconstructed
    return rgba


def write_png_rgba_topdown(path, rgba):
    stride = SIZE * 4
    raw = b"".join(b"\x00" + bytes(rgba[y * stride : (y + 1) * stride]) for y in range(SIZE))
    data = bytearray(b"\x89PNG\r\n\x1a\n")
    data.extend(png_chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)))
    data.extend(png_chunk(b"IDAT", zlib.compress(raw, 9)))
    data.extend(png_chunk(b"IEND", b""))
    with open(path, "wb") as handle:
        handle.write(data)


def closest_height(rgb):
    exact = PALETTE_HEIGHTS.get(rgb)
    if exact is not None:
        return exact
    # Gutter interpolation and color-managed remnants are assigned to the
    # nearest locked palette entry. Black atlas background stays background.
    if max(rgb) < 24:
        return 0.0
    color, value = min(
        PALETTE_HEIGHTS.items(),
        key=lambda item: sum((rgb[i] - item[0][i]) ** 2 for i in range(3)),
    )
    return value


def box_blur(values, radius=2, passes=2):
    current = values
    span = radius * 2 + 1
    for _ in range(passes):
        horizontal = array("f", [0.0]) * (SIZE * SIZE)
        for y in range(SIZE):
            base = y * SIZE
            running = sum(current[base + min(SIZE - 1, max(0, x))] for x in range(-radius, radius + 1))
            for x in range(SIZE):
                horizontal[base + x] = running / span
                remove_x = max(0, x - radius)
                add_x = min(SIZE - 1, x + radius + 1)
                running += current[base + add_x] - current[base + remove_x]
        vertical = array("f", [0.0]) * (SIZE * SIZE)
        for x in range(SIZE):
            running = sum(horizontal[min(SIZE - 1, max(0, y)) * SIZE + x] for y in range(-radius, radius + 1))
            for y in range(SIZE):
                vertical[y * SIZE + x] = running / span
                remove_y = max(0, y - radius)
                add_y = min(SIZE - 1, y + radius + 1)
                running += horizontal[add_y * SIZE + x] - horizontal[remove_y * SIZE + x]
        current = vertical
    return current


albedo = decode_authored_png(SOURCE_ALBEDO)
height = array("f", [0.0]) * (SIZE * SIZE)
painted = bytearray(SIZE * SIZE)
for index in range(SIZE * SIZE):
    p = index * 4
    rgb = tuple(albedo[p : p + 3])
    height[index] = closest_height(rgb)
    painted[index] = 1 if max(rgb) >= 24 else 0

height = box_blur(height)
normal = bytearray(SIZE * SIZE * 4)
relief_pixels = 0
for y in range(SIZE):
    for x in range(SIZE):
        index = y * SIZE + x
        p = index * 4
        # Keep atlas exteriors and their padded island edges neutral. This
        # prevents mip sampling from inventing a bright UV seam.
        if (
            x < 3 or x >= SIZE - 3 or y < 3 or y >= SIZE - 3
            or not painted[index]
            or not painted[index - 2]
            or not painted[index + 2]
            or not painted[index - 2 * SIZE]
            or not painted[index + 2 * SIZE]
        ):
            normal[p : p + 4] = bytes((128, 128, 255, 255))
            continue
        dx = (height[index + 2] - height[index - 2]) * 0.5 * NORMAL_STRENGTH
        dy = (height[index + 2 * SIZE] - height[index - 2 * SIZE]) * 0.5 * NORMAL_STRENGTH
        nx, ny, nz = -dx, dy, 1.0
        length = math.sqrt(nx * nx + ny * ny + nz * nz)
        nx, ny, nz = nx / length, ny / length, nz / length
        encoded = (
            round((nx * 0.5 + 0.5) * 255),
            round((ny * 0.5 + 0.5) * 255),
            round((nz * 0.5 + 0.5) * 255),
            255,
        )
        normal[p : p + 4] = bytes(encoded)
        if encoded[:3] != (128, 128, 255):
            relief_pixels += 1

if relief_pixels < 2000:
    raise RuntimeError("Normal map contains too little structural relief")
write_png_rgba_topdown(OUT_NORMAL, normal)

normal_image = bpy.data.images.load(OUT_NORMAL, check_existing=False)
if tuple(normal_image.size) != (SIZE, SIZE):
    raise RuntimeError("Encoded normal map has the wrong dimensions")
normal_image.name = "FPSPlayer_ARIES_Normal_v1"
normal_image.colorspace_settings.name = "Non-Color"
normal_image.pack()

bound = 0
for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        continue
    for node in list(nodes):
        if node.type == "NORMAL_MAP" or (node.type == "TEX_IMAGE" and node.label == "ARIES Normal v1"):
            nodes.remove(node)
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "ARIES Normal v1"
    texture.label = "ARIES Normal v1"
    texture.image = normal_image
    texture.interpolation = "Linear"
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.name = "ARIES Normal Strength"
    normal_node.inputs["Strength"].default_value = 0.55
    normal_node.space = "TANGENT"
    links.new(texture.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], bsdf.inputs["Normal"])
    bound += 1

if bound < 1:
    raise RuntimeError("No material accepted the normal map")
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

print("FPS_NORMAL_V1_OK")
print("relief_pixels", relief_pixels)
print("materials_bound", bound)
print("normal", OUT_NORMAL, os.path.getsize(OUT_NORMAL))
print("blend", OUT_BLEND, os.path.getsize(OUT_BLEND))

