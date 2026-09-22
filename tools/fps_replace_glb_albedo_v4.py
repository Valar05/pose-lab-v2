#!/usr/bin/env python3
"""Replace the one embedded Base Color PNG in the accepted FPS arms GLB.

This intentionally preserves geometry, skin, animations, node hierarchy, and
material wiring. It is the deterministic color-only fallback for the phone's
Blender 4.3 exporter crash.
"""

import hashlib
import json
import struct
from pathlib import Path

DOWNLOAD = Path("/storage/emulated/0/Download")
SOURCE = DOWNLOAD / "FPSPlayer_ARIES_Albedo_v3_runtime.glb"
ALBEDO = DOWNLOAD / "FPSPlayer_ARIES_Albedo_v4.png"
OUTPUT = DOWNLOAD / "FPSPlayer_ARIES_Albedo_v4_runtime.glb"
EXPECTED_SOURCE_SHA256 = "bd191abb1421661c01924c3cc3191f01568037c62b6c539346fa40357ea613aa"

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def align4(value):
    return (value + 3) & ~3


source = SOURCE.read_bytes()
if sha256(source) != EXPECTED_SOURCE_SHA256:
    raise RuntimeError("Source GLB is missing or is not the accepted v3 runtime artifact")
if source[:4] != b"glTF" or struct.unpack_from("<I", source, 4)[0] != 2:
    raise RuntimeError("Source is not a binary glTF 2.0 file")

offset = 12
chunks = []
while offset < len(source):
    length, chunk_type = struct.unpack_from("<II", source, offset)
    offset += 8
    chunks.append((chunk_type, source[offset : offset + length]))
    offset += length

if len(chunks) != 2 or chunks[0][0] != JSON_CHUNK or chunks[1][0] != BIN_CHUNK:
    raise RuntimeError("Expected one JSON chunk followed by one BIN chunk")

document = json.loads(chunks[0][1].rstrip(b" \x00"))
images = document.get("images") or []
if len(images) != 1 or images[0].get("mimeType") != "image/png":
    raise RuntimeError("Expected exactly one embedded PNG image")

views = document.get("bufferViews") or []
view_index = images[0].get("bufferView")
if not isinstance(view_index, int) or not (0 <= view_index < len(views)):
    raise RuntimeError("Embedded image has no valid bufferView")

view = views[view_index]
start = int(view.get("byteOffset", 0))
old_length = int(view["byteLength"])
old_data_end = start + old_length

# Image payloads are 4-byte padded in the BIN chunk. Prefer the next declared
# bufferView boundary because it is authoritative when the image is not last.
later_offsets = sorted(
    int(candidate.get("byteOffset", 0))
    for i, candidate in enumerate(views)
    if i != view_index and int(candidate.get("byteOffset", 0)) >= old_data_end
)
old_span_end = later_offsets[0] if later_offsets else align4(old_data_end)
if old_span_end > len(chunks[1][1]):
    raise RuntimeError("Image bufferView exceeds BIN chunk")

png = ALBEDO.read_bytes()
if not png.startswith(b"\x89PNG\r\n\x1a\n"):
    raise RuntimeError("Replacement albedo is not a PNG")
new_span = png + (b"\x00" * (align4(len(png)) - len(png)))
old_bin = chunks[1][1]
new_bin = old_bin[:start] + new_span + old_bin[old_span_end:]
delta = len(new_span) - (old_span_end - start)

view["byteLength"] = len(png)
for i, candidate in enumerate(views):
    if i == view_index:
        continue
    candidate_offset = int(candidate.get("byteOffset", 0))
    if candidate_offset >= old_span_end:
        candidate["byteOffset"] = candidate_offset + delta

document["buffers"][0]["byteLength"] = len(new_bin)
images[0]["name"] = "FPSPlayer_ARIES_Albedo_v4"

json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
json_bytes += b" " * (align4(len(json_bytes)) - len(json_bytes))
new_bin += b"\x00" * (align4(len(new_bin)) - len(new_bin))

total = 12 + 8 + len(json_bytes) + 8 + len(new_bin)
output = bytearray(struct.pack("<4sII", b"glTF", 2, total))
output.extend(struct.pack("<II", len(json_bytes), JSON_CHUNK))
output.extend(json_bytes)
output.extend(struct.pack("<II", len(new_bin), BIN_CHUNK))
output.extend(new_bin)
OUTPUT.write_bytes(output)

# Independent readback of the exact embedded image bytes.
written = OUTPUT.read_bytes()
_, _, written_total = struct.unpack_from("<4sII", written, 0)
if written_total != len(written):
    raise RuntimeError("Written GLB length header mismatch")
json_length = struct.unpack_from("<I", written, 12)[0]
bin_header = 20 + json_length
bin_length, bin_type = struct.unpack_from("<II", written, bin_header)
if bin_type != BIN_CHUNK:
    raise RuntimeError("Written GLB BIN chunk missing")
bin_start = bin_header + 8
embedded = written[bin_start + start : bin_start + start + len(png)]
if embedded != png:
    raise RuntimeError("Written GLB embedded albedo does not match v4 PNG")

print("FPS_GLTF_ALBEDO_TRANSPLANT_V4_OK")
print("source_sha256", sha256(source))
print("albedo_sha256", sha256(png))
print("output_sha256", sha256(written))
print("old_image_bytes", old_length)
print("new_image_bytes", len(png))
print("output_bytes", len(written))
