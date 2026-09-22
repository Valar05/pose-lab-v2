import bpy
import binascii
import math
import os
import struct
import zlib
from array import array

DOWNLOAD = "/storage/emulated/0/Download"
SOURCE_ALBEDO = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Albedo_v5_1.png")
OUT_NORMAL = os.path.join(DOWNLOAD, "FPSPlayer_ARIES_Normal_v3.png")
OUT_BLEND = os.path.join(DOWNLOAD, "FPSPlayer_UV_Albedo_Normal_v6_3.blend")
SIZE = 1024
NORMAL_STRENGTH = 18.0


PALETTE_HEIGHTS = {
    (47, 43, 36): 0.10,    # glove palm / substrate
    (70, 63, 52): 0.18,    # glove fabric mid
    (94, 82, 65): 0.28,    # glove fabric top
    (143, 119, 82): 1.32,  # raised knuckle plates
    (174, 111, 29): 1.45,  # raised gold cuff / band
    (126, 79, 27): 1.18,   # gold bevel shadow remains above armor
    (163, 153, 133): 0.66, # armor plateau
    (188, 178, 154): 0.78, # armor highlight plateau
    (132, 124, 108): 0.52, # armor bevel
    (56, 52, 46): 0.04,    # recessed undersuit
    (73, 65, 55): 0.12,    # recessed trim
    (157, 101, 30): 1.38,  # raised utility band
    (135, 47, 35): 0.88,   # raised warning identifier
    (166, 155, 134): 0.68,
    (51, 47, 41): 0.05,
}

BAND_COLORS = {(174, 111, 29), (126, 79, 27), (157, 101, 30)}
ARMOR_COLORS = {(163, 153, 133), (188, 178, 154), (132, 124, 108), (166, 155, 134)}


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


def closest_entry(rgb):
    exact = PALETTE_HEIGHTS.get(rgb)
    if exact is not None:
        return rgb, exact
    # Gutter interpolation and color-managed remnants are assigned to the
    # nearest locked palette entry. Black atlas background stays background.
    if max(rgb) < 24:
        return None, 0.0
    color, value = min(
        PALETTE_HEIGHTS.items(),
        key=lambda item: sum((rgb[i] - item[0][i]) ** 2 for i in range(3)),
    )
    return color, value


def box_blur(values, radius=14, passes=1):
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


def rasterize_uv_mask(mesh, uv_layer):
    mask = bytearray(SIZE * SIZE)
    mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        points = []
        for loop_index in tri.loops:
            u, v = uv_layer.data[loop_index].uv
            points.append((u * (SIZE - 1), (1.0 - v) * (SIZE - 1)))
        (ax, ay), (bx, by), (cx, cy) = points
        min_x = max(0, math.floor(min(ax, bx, cx)) - 1)
        max_x = min(SIZE - 1, math.ceil(max(ax, bx, cx)) + 1)
        min_y = max(0, math.floor(min(ay, by, cy)) - 1)
        max_y = min(SIZE - 1, math.ceil(max(ay, by, cy)) + 1)
        denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(denominator) < 1e-8:
            continue
        for y in range(min_y, max_y + 1):
            py = y + 0.5
            for x in range(min_x, max_x + 1):
                px = x + 0.5
                w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denominator
                w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denominator
                w2 = 1.0 - w0 - w1
                if w0 >= -0.001 and w1 >= -0.001 and w2 >= -0.001:
                    mask[y * SIZE + x] = 1
    return mask


def erode_mask(mask, passes=3):
    current = mask
    for _ in range(passes):
        source = current
        eroded = source[:]
        for y in range(1, SIZE - 1):
            row = y * SIZE
            for x in range(1, SIZE - 1):
                index = row + x
                if source[index] and not (
                    source[index - 1]
                    and source[index + 1]
                    and source[index - SIZE]
                    and source[index + SIZE]
                ):
                    eroded[index] = 0
        current = eroded
    return current


def extend_height_gutter(values, coverage, passes=18):
    """Pad each UV island with its edge height before filtering.

    This removes the artificial drop to the black atlas background without
    sacrificing the real color/height boundaries inside the island.
    """
    current_values = values
    current_coverage = coverage
    for _ in range(passes):
        source_values = current_values
        source_coverage = current_coverage
        expanded_values = array("f", source_values)
        expanded_coverage = source_coverage[:]
        for y in range(1, SIZE - 1):
            row = y * SIZE
            for x in range(1, SIZE - 1):
                index = row + x
                if source_coverage[index]:
                    continue
                neighbours = (
                    index - 1,
                    index + 1,
                    index - SIZE,
                    index + SIZE,
                )
                samples = [source_values[n] for n in neighbours if source_coverage[n]]
                if samples:
                    expanded_values[index] = sum(samples) / len(samples)
                    expanded_coverage[index] = 1
        current_values = expanded_values
        current_coverage = expanded_coverage
    return current_values


def carve_exterior_channel(values, feature_mask, depth=-0.35, passes=5):
    """Cut a readable recessed channel around an elevated semantic feature."""
    original = feature_mask
    expanded = feature_mask[:]
    frontier = feature_mask[:]
    for _ in range(passes):
        source = expanded
        grown = source[:]
        for y in range(1, SIZE - 1):
            row = y * SIZE
            for x in range(1, SIZE - 1):
                index = row + x
                if source[index]:
                    continue
                if source[index - 1] or source[index + 1] or source[index - SIZE] or source[index + SIZE]:
                    grown[index] = 1
        expanded = grown
    for index in range(SIZE * SIZE):
        if expanded[index] and not original[index]:
            values[index] = min(values[index], depth)


albedo = decode_authored_png(SOURCE_ALBEDO)
height = array("f", [0.0]) * (SIZE * SIZE)
band_mask = bytearray(SIZE * SIZE)
for index in range(SIZE * SIZE):
    p = index * 4
    rgb = tuple(albedo[p : p + 3])
    semantic_color, semantic_height = closest_entry(rgb)
    height[index] = semantic_height
    if semantic_color in BAND_COLORS:
        band_mask[index] = 1

if min(PALETTE_HEIGHTS[color] for color in BAND_COLORS) <= max(PALETTE_HEIGHTS[color] for color in ARMOR_COLORS) + 0.30:
    raise RuntimeError("Raised gold bands must remain decisively above every armor plateau")

carve_exterior_channel(height, band_mask)

arm = bpy.data.objects.get("Arms")
if arm is None or arm.type != "MESH":
    raise RuntimeError("Arms mesh not found for UV edge suppression")
mesh = arm.data
uv_layer = mesh.uv_layers.get("AlbedoUV_v1") or mesh.uv_layers.active
if uv_layer is None:
    raise RuntimeError("AlbedoUV_v1/active UV layer not found")
uv_coverage = rasterize_uv_mask(mesh, uv_layer)
safe_uv = erode_mask(uv_coverage)
safe_uv_pixels = sum(safe_uv)
if safe_uv_pixels < 100000:
    raise RuntimeError("UV edge suppression removed too much usable surface")

height = extend_height_gutter(height, uv_coverage)
height = box_blur(height)
normal = bytearray(SIZE * SIZE * 4)
relief_pixels = 0
strong_relief_pixels = 0
for y in range(SIZE):
    for x in range(SIZE):
        index = y * SIZE + x
        p = index * 4
        # Keep atlas exteriors and their padded island edges neutral. This
        # prevents mip sampling from inventing a bright UV seam.
        if not safe_uv[index]:
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
        if max(abs(encoded[0] - 128), abs(encoded[1] - 128)) >= 12:
            strong_relief_pixels += 1

if relief_pixels < 10000 or strong_relief_pixels < 5000:
    raise RuntimeError("Normal v3 failed the visible-relief strength gate")
write_png_rgba_topdown(OUT_NORMAL, normal)

normal_image = bpy.data.images.load(OUT_NORMAL, check_existing=False)
if tuple(normal_image.size) != (SIZE, SIZE):
    raise RuntimeError("Encoded normal map has the wrong dimensions")
normal_image.name = "FPSPlayer_ARIES_Normal_v3"
normal_image.colorspace_settings.name = "Non-Color"
normal_image.pack()

bound = 0
for material in bpy.data.materials:
    if not material.use_nodes or not material.node_tree:
        continue
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        continue
    for node in list(nodes):
        if node.type == "NORMAL_MAP" or (node.type == "TEX_IMAGE" and node.label.startswith("ARIES Normal")):
            nodes.remove(node)
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "ARIES Normal v3"
    texture.label = "ARIES Normal v3"
    texture.image = normal_image
    texture.interpolation = "Linear"
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.name = "ARIES Normal Strength"
    normal_node.inputs["Strength"].default_value = 1.0
    normal_node.space = "TANGENT"
    links.new(texture.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], bsdf.inputs["Normal"])
    bound += 1

if bound < 1:
    raise RuntimeError("No material accepted the normal map")
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)

print("FPS_NORMAL_V3_OK")
print("relief_pixels", relief_pixels)
print("strong_relief_pixels", strong_relief_pixels)
print("safe_uv_pixels", safe_uv_pixels)
print("materials_bound", bound)
print("normal", OUT_NORMAL, os.path.getsize(OUT_NORMAL))
print("blend", OUT_BLEND, os.path.getsize(OUT_BLEND))
