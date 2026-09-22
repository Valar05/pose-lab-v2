#!/usr/bin/env python3
"""Append the ARIES normal map to the accepted v5.1 runtime GLB."""

import hashlib
import json
import struct
from pathlib import Path

DOWNLOAD = Path("/storage/emulated/0/Download")
SOURCE = DOWNLOAD / "FPSPlayer_ARIES_Albedo_v5_1_runtime.glb"
NORMAL = DOWNLOAD / "FPSPlayer_ARIES_Normal_v2.png"
OUTPUT = DOWNLOAD / "FPSPlayer_ARIES_Material_v6_1_runtime.glb"
EXPECTED_SOURCE = "e550e565ece93d6cd064081f8c783915d528ebf9d8ccd88c54da69959b7d72d5"
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def align4(value):
    return (value + 3) & ~3


source = SOURCE.read_bytes()
if sha256(source) != EXPECTED_SOURCE:
    raise RuntimeError("Source GLB is not the accepted v5.1 runtime artifact")
if source[:4] != b"glTF" or struct.unpack_from("<I", source, 4)[0] != 2:
    raise RuntimeError("Source is not binary glTF 2.0")

offset = 12
chunks = []
while offset < len(source):
    length, kind = struct.unpack_from("<II", source, offset)
    offset += 8
    chunks.append((kind, source[offset : offset + length]))
    offset += length
if len(chunks) != 2 or chunks[0][0] != JSON_CHUNK or chunks[1][0] != BIN_CHUNK:
    raise RuntimeError("Expected one JSON chunk and one BIN chunk")

document = json.loads(chunks[0][1].rstrip(b" \x00"))
if len(document.get("images") or []) != 1 or len(document.get("textures") or []) != 1:
    raise RuntimeError("Expected the accepted albedo-only GLB")
materials = document.get("materials") or []
if len(materials) != 1 or "baseColorTexture" not in materials[0].get("pbrMetallicRoughness", {}):
    raise RuntimeError("Expected one accepted textured material")

png = NORMAL.read_bytes()
if not png.startswith(b"\x89PNG\r\n\x1a\n"):
    raise RuntimeError("Normal artifact is not PNG")
old_bin = chunks[1][1]
normal_offset = align4(len(old_bin))
new_bin = old_bin + b"\x00" * (normal_offset - len(old_bin)) + png
new_bin += b"\x00" * (align4(len(new_bin)) - len(new_bin))

view_index = len(document["bufferViews"])
document["bufferViews"].append({"buffer": 0, "byteOffset": normal_offset, "byteLength": len(png)})
image_index = len(document["images"])
document["images"].append({
    "bufferView": view_index,
    "mimeType": "image/png",
    "name": "FPSPlayer_ARIES_Normal_v2",
})
texture_index = len(document["textures"])
document["textures"].append({"sampler": 0, "source": image_index})
materials[0]["normalTexture"] = {"index": texture_index, "texCoord": 1, "scale": 1.0}
document["buffers"][0]["byteLength"] = len(new_bin)

json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
json_bytes += b" " * (align4(len(json_bytes)) - len(json_bytes))
total = 12 + 8 + len(json_bytes) + 8 + len(new_bin)
output = bytearray(struct.pack("<4sII", b"glTF", 2, total))
output.extend(struct.pack("<II", len(json_bytes), JSON_CHUNK))
output.extend(json_bytes)
output.extend(struct.pack("<II", len(new_bin), BIN_CHUNK))
output.extend(new_bin)
OUTPUT.write_bytes(output)

written = OUTPUT.read_bytes()
written_json_length = struct.unpack_from("<I", written, 12)[0]
written_bin_start = 20 + written_json_length + 8
embedded = written[written_bin_start + normal_offset : written_bin_start + normal_offset + len(png)]
if embedded != png:
    raise RuntimeError("Written GLB normal map does not match the authored PNG")

print("FPS_GLTF_NORMAL_V2_OK")
print("source_sha256", sha256(source))
print("normal_sha256", sha256(png))
print("output_sha256", sha256(written))
print("normal_bytes", len(png))
print("output_bytes", len(written))

