#!/usr/bin/env python3
import argparse
import hashlib
import io
import json
import struct
from pathlib import Path
from PIL import Image

ALIGN = 4

DEFAULT_IMAGES = {
    'character': {
        'max_size': 1024,
        'quality': 72,
        'budgets': {
            'public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb': 11_500_000,
        },
    },
    'sword': {
        'max_size': 768,
        'quality': 68,
        'budgets': {
            'public/assets/crimson/arborblade_sword_review.glb': 2_500_000,
        },
    },
}


def align4(value):
    return (value + 3) & ~3


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_glb(path):
    data = Path(path).read_bytes()
    if data[:4] != b'glTF':
        raise ValueError(f'{path} is not a GLB')
    version, total_len = struct.unpack_from('<II', data, 4)
    if version != 2 or total_len != len(data):
        raise ValueError(f'{path} has invalid GLB header')
    offset = 12
    gltf = None
    bin_chunk = None
    while offset < len(data):
        length, chunk_type = struct.unpack_from('<I4s', data, offset)
        chunk = data[offset + 8:offset + 8 + length]
        if chunk_type == b'JSON':
            gltf = json.loads(chunk.rstrip(b' \x00').decode('utf8'))
        elif chunk_type == b'BIN\x00':
            bin_chunk = bytes(chunk)
        offset += 8 + length
    if gltf is None or bin_chunk is None:
        raise ValueError(f'{path} missing JSON or BIN chunk')
    return gltf, bin_chunk


def write_glb(path, gltf, bin_chunk):
    gltf['buffers'] = [{'byteLength': len(bin_chunk)}]
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf8')
    json_padded = json_bytes + b' ' * (align4(len(json_bytes)) - len(json_bytes))
    bin_padded = bin_chunk + b'\x00' * (align4(len(bin_chunk)) - len(bin_chunk))
    total = 12 + 8 + len(json_padded) + 8 + len(bin_padded)
    header = b'glTF' + struct.pack('<II', 2, total)
    json_header = struct.pack('<I4s', len(json_padded), b'JSON')
    bin_header = struct.pack('<I4s', len(bin_padded), b'BIN\x00')
    Path(path).write_bytes(header + json_header + json_padded + bin_header + bin_padded)


def image_buffer(gltf, bin_chunk, image):
    view_index = image.get('bufferView')
    if view_index is None:
        return None
    view = gltf['bufferViews'][view_index]
    start = view.get('byteOffset', 0)
    return bin_chunk[start:start + view['byteLength']]


def resize_image(raw, max_size, quality):
    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert('RGB')
        width, height = image.size
        scale = min(1.0, max_size / max(width, height))
        if scale < 1.0:
            image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        image.save(out, format='JPEG', quality=quality, optimize=True, progressive=False)
        return out.getvalue(), {'from': [width, height], 'to': [image.width, image.height]}


def rebuild_with_images(gltf, bin_chunk, image_payloads):
    source_views = gltf.get('bufferViews', [])
    source_to_payload = {item['source_view']: item['bytes'] for item in image_payloads}
    new_bin = bytearray()
    view_offset = []
    for index, view in enumerate(source_views):
        if len(new_bin) % ALIGN:
            new_bin.extend(b'\x00' * (align4(len(new_bin)) - len(new_bin)))
        view_offset.append(len(new_bin))
        payload = source_to_payload.get(index)
        if payload is None:
            start = view.get('byteOffset', 0)
            payload = bin_chunk[start:start + view['byteLength']]
        new_bin.extend(payload)
    for index, view in enumerate(gltf.get('bufferViews', [])):
        view['byteOffset'] = view_offset[index]
        if index in source_to_payload:
            view['byteLength'] = len(source_to_payload[index])
    return bytes(new_bin)


def optimize_one(source, target, max_size, quality):
    gltf, bin_chunk = read_glb(source)
    image_payloads = []
    image_report = []
    for index, image in enumerate(gltf.get('images', [])):
        raw = image_buffer(gltf, bin_chunk, image)
        if not raw:
            continue
        optimized, dims = resize_image(raw, max_size, quality)
        view_index = image.get('bufferView')
        image_payloads.append({'image': index, 'source_view': view_index, 'bytes': optimized})
        image['mimeType'] = 'image/jpeg'
        image_report.append({
            'index': index,
            'name': image.get('name'),
            'sourceBytes': len(raw),
            'reviewBytes': len(optimized),
            'dimensions': dims,
        })
    gltf.setdefault('asset', {}).setdefault('extras', {})['poseLabV2ReviewOptimization'] = {
        'sourceGlb': str(source),
        'maxTextureSize': max_size,
        'jpegQuality': quality,
        'policy': 'review-default-fidelity-preserving-texture-budget; source GLB retained separately',
    }
    out_bin = rebuild_with_images(gltf, bin_chunk, image_payloads)
    write_glb(target, gltf, out_bin)
    return {
        'source': str(source),
        'target': str(target),
        'sourceBytes': Path(source).stat().st_size,
        'reviewBytes': Path(target).stat().st_size,
        'sourceSha256': sha256(source),
        'reviewSha256': sha256(target),
        'maxTextureSize': max_size,
        'jpegQuality': quality,
        'images': image_report,
        'animations': [{'name': a.get('name'), 'channels': len(a.get('channels', [])), 'samplers': len(a.get('samplers', []))} for a in gltf.get('animations', [])],
        'nodes': len(gltf.get('nodes', [])),
        'meshes': len(gltf.get('meshes', [])),
        'skins': len(gltf.get('skins', [])),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--character-source', default='public/assets/crimson/crimson_plume_knight_rigged_pbr.glb')
    parser.add_argument('--sword-source', default='public/assets/crimson/arborblade_sword.glb')
    parser.add_argument('--character-target', default='public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb')
    parser.add_argument('--sword-target', default='public/assets/crimson/arborblade_sword_review.glb')
    parser.add_argument('--manifest', default='public/assets/crimson/crimson_review_assets_manifest.json')
    parser.add_argument('--character-max-size', type=int, default=1024)
    parser.add_argument('--sword-max-size', type=int, default=768)
    parser.add_argument('--character-quality', type=int, default=72)
    parser.add_argument('--sword-quality', type=int, default=68)
    args = parser.parse_args()

    character = optimize_one(Path(args.character_source), Path(args.character_target), args.character_max_size, args.character_quality)
    sword = optimize_one(Path(args.sword_source), Path(args.sword_target), args.sword_max_size, args.sword_quality)
    combined = character['reviewBytes'] + sword['reviewBytes']
    manifest = {
        'schema': 'pose-lab-v2-crimson-review-assets-v1',
        'policy': 'optimized assets are default hosted review payload; full PBR GLBs remain available with quality=source',
        'character': character,
        'sword': sword,
        'budgets': {
            'combinedReviewBytesMax': 14_000_000,
            'characterReviewBytesMax': 11_500_000,
            'swordReviewBytesMax': 2_500_000,
        },
        'combinedReviewBytes': combined,
        'combinedSourceBytes': character['sourceBytes'] + sword['sourceBytes'],
    }
    errors = []
    if combined > manifest['budgets']['combinedReviewBytesMax']:
        errors.append(f'combined review bytes {combined} exceed budget')
    if character['reviewBytes'] > manifest['budgets']['characterReviewBytesMax']:
        errors.append('character review GLB exceeds budget')
    if sword['reviewBytes'] > manifest['budgets']['swordReviewBytesMax']:
        errors.append('sword review GLB exceeds budget')
    Path(args.manifest).write_text(json.dumps(manifest, indent=2) + '\n')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(json.dumps({'ok': True, **manifest}, indent=2))


if __name__ == '__main__':
    main()
