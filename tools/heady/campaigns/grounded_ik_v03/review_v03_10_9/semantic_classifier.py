import json, math, struct, hashlib, io, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

LABEL_COLORS = {
    'body': (80, 255, 180),
    'hair_existing': (90, 160, 255),
    'hair_candidate': (255, 70, 210),
    'face': (255, 225, 120),
    'ambiguous': (255, 170, 40),
}
VIEWS = [
    ('FRONT', (0, 0, 0)),
    ('BACK', (0, math.pi, 0)),
    ('LEFT', (0, -math.pi/2, 0)),
    ('RIGHT', (0, math.pi/2, 0)),
    ('OBLIQUE', (0, math.radians(35), 0)),
    ('REAR-OBLIQUE', (0, math.pi + math.radians(35), 0)),
]

def sha256(path):
    import hashlib
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def load_glb(path):
    data = Path(path).read_bytes()
    if data[:4] != b'glTF':
        raise RuntimeError('NOT_GLB')
    version = struct.unpack_from('<I', data, 4)[0]
    if version != 2:
        raise RuntimeError('UNSUPPORTED_GLB_VERSION')
    total_len = struct.unpack_from('<I', data, 8)[0]
    off = 12
    json_chunk = None
    bin_chunk = None
    while off < total_len:
        clen, ctype = struct.unpack_from('<II', data, off)
        off += 8
        chunk = data[off:off+clen]
        off += clen
        if ctype == 0x4E4F534A:
            json_chunk = json.loads(chunk.decode('utf-8'))
        elif ctype == 0x004E4942:
            bin_chunk = chunk
    if json_chunk is None or bin_chunk is None:
        raise RuntimeError('MISSING_CHUNKS')
    return json_chunk, bin_chunk

def component_dtype(ct):
    return {
        5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
        5125: np.uint32, 5126: np.float32
    }[ct]

def type_count(t):
    return {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[t]

def accessor_array(doc, blob, idx):
    acc = doc['accessors'][idx]
    bv = doc['bufferViews'][acc['bufferView']]
    comp = component_dtype(acc['componentType'])
    ncomp = type_count(acc['type'])
    offset = bv.get('byteOffset',0) + acc.get('byteOffset',0)
    stride = bv.get('byteStride', np.dtype(comp).itemsize*ncomp)
    count = acc['count']
    raw = blob[offset: offset + stride*count]
    arr = np.frombuffer(raw, dtype=np.uint8).reshape(count, stride)
    out = np.empty((count, ncomp), dtype=comp)
    elem_bytes = np.dtype(comp).itemsize*ncomp
    for i in range(count):
        out[i] = np.frombuffer(arr[i,:elem_bytes].tobytes(), dtype=comp, count=ncomp)
    if acc['type'] == 'SCALAR':
        out = out[:,0]
    return out

def load_texture(doc, blob, material_index=0):
    mats = doc.get('materials', [])
    if not mats:
        return Image.new('RGBA', (4,4), (255,255,255,255))
    mat = mats[material_index]
    base = mat.get('pbrMetallicRoughness', {}).get('baseColorTexture', {})
    if 'index' not in base:
        return Image.new('RGBA', (4,4), (255,255,255,255))
    tex = doc['textures'][base['index']]
    img = doc['images'][tex['source']]
    if 'bufferView' in img:
        bv = doc['bufferViews'][img['bufferView']]
        start = bv.get('byteOffset',0)
        end = start + bv['byteLength']
        return Image.open(io.BytesIO(blob[start:end])).convert('RGBA')
    if 'uri' in img and img['uri'].startswith('data:'):
        import base64
        b64 = img['uri'].split(',',1)[1]
        return Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
    raise RuntimeError('UNSUPPORTED_IMAGE_STORAGE')

def load_mesh(glb_path):
    doc, blob = load_glb(glb_path)
    mesh = doc['meshes'][0]
    prim = mesh['primitives'][0]
    attrs = prim['attributes']
    pos = accessor_array(doc, blob, attrs['POSITION']).astype(np.float32)
    uv = accessor_array(doc, blob, attrs.get('TEXCOORD_0')).astype(np.float32) if 'TEXCOORD_0' in attrs else np.zeros((len(pos),2), np.float32)
    joints = accessor_array(doc, blob, attrs.get('JOINTS_0')).astype(np.int32) if 'JOINTS_0' in attrs else np.zeros((len(pos),4), np.int32)
    weights = accessor_array(doc, blob, attrs.get('WEIGHTS_0')).astype(np.float32) if 'WEIGHTS_0' in attrs else np.zeros((len(pos),4), np.float32)
    indices = accessor_array(doc, blob, prim['indices']).astype(np.int32).reshape(-1, 3)
    tex = load_texture(doc, blob, prim.get('material',0))
    names = [n.get('name', f'node_{i}') for i,n in enumerate(doc.get('nodes',[]))]
    skin_joints = doc['skins'][0]['joints'] if doc.get('skins') else []
    return {
        'doc': doc, 'blob': blob, 'positions': pos, 'uv': uv, 'joints': joints,
        'weights': weights, 'indices': indices, 'texture': tex, 'node_names': names,
        'skin_joints': np.array(skin_joints, dtype=np.int32),
    }

def sample_vertex_colors(tex, uv):
    arr = np.asarray(tex.convert('RGBA'), dtype=np.uint8)
    h, w = arr.shape[:2]
    u = np.mod(uv[:,0], 1.0)
    v = np.mod(1.0 - uv[:,1], 1.0)
    x = np.clip((u*(w-1)).round().astype(int), 0, w-1)
    y = np.clip((v*(h-1)).round().astype(int), 0, h-1)
    return arr[y, x, :3].astype(np.float32) / 255.0

def classify_vertices(mesh):
    pos = mesh['positions']
    colors = sample_vertex_colors(mesh['texture'], mesh['uv'])
    joints = mesh['joints']
    weights = mesh['weights']
    n = len(pos)
    mins = pos.min(axis=0)
    maxs = pos.max(axis=0)
    center = (mins + maxs) / 2.0
    size = np.maximum(maxs - mins, 1e-6)
    pn = (pos - mins) / size
    r, g, b = colors[:,0], colors[:,1], colors[:,2]
    brightness = colors.mean(axis=1)
    saturation = np.max(colors, axis=1) - np.min(colors, axis=1)

    skin_like = (r > g) & (g > b*0.8) & (brightness > 0.45) & (saturation > 0.10) & (saturation < 0.45)
    purple_like = (r > 0.32) & (b > 0.22) & (r + b > 1.05*g + 0.28) & (saturation > 0.18)
    white_or_orange = ((brightness > 0.72) | ((r > 0.6) & (g > 0.28) & (b < 0.28)))
    top_region = pn[:,1] > 0.63
    head_region = (pn[:,1] > 0.58) & (np.abs((pos[:,0]-center[0]) / size[0]) < 0.28)
    front_region = (pos[:,2] - center[2]) > -0.10 * size[2]
    side_outer = np.abs((pos[:,0]-center[0]) / size[0]) > 0.24
    low_region = pn[:,1] < 0.36

    hair_bone_influence = np.zeros(n, dtype=np.float32)
    if mesh['skin_joints'].size:
        joint_ids = mesh['skin_joints']
        hair_nodes = {i for i, nm in enumerate(mesh['node_names']) if nm.startswith('HeadyHair_')}
        if hair_nodes:
            # map JOINTS_0 local skin indices -> global node indices
            mapped = joint_ids[np.clip(joints, 0, len(joint_ids)-1)]
            for k in range(4):
                hair_bone_influence += np.where(np.isin(mapped[:,k], list(hair_nodes)), weights[:,k], 0.0)

    face_score = (
        skin_like.astype(np.float32) * 1.7 +
        top_region.astype(np.float32) * 0.9 +
        head_region.astype(np.float32) * 1.0 +
        front_region.astype(np.float32) * 0.7 +
        (~side_outer).astype(np.float32) * 0.6 +
        (1.0 - np.clip(np.abs((pos[:,0]-center[0]) / size[0]), 0, 1)) * 0.5
    )

    hair_score = (
        purple_like.astype(np.float32) * 1.5 +
        hair_bone_influence * 2.2 +
        ((pn[:,1] > 0.15) & (pn[:,1] < 0.98)).astype(np.float32) * 0.4 +
        side_outer.astype(np.float32) * 0.5 +
        (~white_or_orange).astype(np.float32) * 0.2
    )

    body_score = (
        (~purple_like).astype(np.float32) * 0.4 +
        (~skin_like).astype(np.float32) * 0.3 +
        (pn[:,1] < 0.92).astype(np.float32) * 0.2 +
        (white_or_orange).astype(np.float32) * 0.7 +
        low_region.astype(np.float32) * 0.8
    )

    labels = np.array(['ambiguous']*n, dtype=object)
    labels[(body_score >= hair_score) & (body_score >= face_score)] = 'body'
    labels[(hair_score > body_score) & (hair_score >= face_score + 0.15)] = 'hair_candidate'
    labels[(face_score > hair_score) & (face_score > body_score) & (skin_like)] = 'face'
    labels[hair_bone_influence > 0.01] = 'hair_existing'
    # Candidate hair remains candidate even if existing hair; allow existing tag to dominate only for already rigged hair
    labels[(hair_bone_influence > 0.01) & purple_like] = 'hair_existing'
    labels[(labels == 'hair_candidate') & low_region & (~purple_like) & (hair_bone_influence < 0.01)] = 'ambiguous'
    labels[(labels == 'face') & (~front_region)] = 'ambiguous'
    return labels, colors, hair_bone_influence

def euler_matrix(rx, ry, rz):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    Rx = np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]], dtype=np.float32)
    Ry = np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]], dtype=np.float32)
    Rz = np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]], dtype=np.float32)
    return (Rz @ Ry @ Rx).astype(np.float32)

def render_views(mesh, labels, colors, out_png):
    pos = mesh['positions']
    tri = mesh['indices']
    texcols = (colors*255).clip(0,255).astype(np.uint8)
    W,H = 520, 520
    panel_positions = [(0,0),(540,0),(1080,0),(0,540),(540,540),(1080,540)]
    grid = Image.new('RGB', (1600, 1060), (5,10,18))
    draw_grid = ImageDraw.Draw(grid)
    for (view_name, euler), (ox, oy) in zip(VIEWS, panel_positions):
        R = euler_matrix(*euler)
        tp = pos @ R.T
        mins = tp.min(axis=0)
        maxs = tp.max(axis=0)
        ctr = (mins + maxs) / 2.0
        span = max(maxs[0]-mins[0], maxs[1]-mins[1]) * 1.18
        if span <= 1e-6: span = 1.0
        x = (tp[:,0] - ctr[0]) / span * (W*0.82) + W/2
        y = (-(tp[:,1] - ctr[1]) / span) * (H*0.82) + H/2
        z = tp[:,2]

        panel = Image.new('RGB', (W,H), (5,10,18))
        d = ImageDraw.Draw(panel)
        depths = z[tri].mean(axis=1)
        order = np.argsort(depths)
        for idx in order:
            verts = tri[idx]
            pts = [(float(x[v]), float(y[v])) for v in verts]
            base = texcols[verts].mean(axis=0)
            tri_labels = labels[verts]
            unique, counts = np.unique(tri_labels, return_counts=True)
            label = unique[counts.argmax()]
            overlay = np.array(LABEL_COLORS.get(label, (180,180,180)), dtype=np.float32)
            fill = tuple(np.clip(base*0.60 + overlay*0.40, 0, 255).astype(np.uint8).tolist())
            d.polygon(pts, fill=fill)
        dd = ImageDraw.Draw(panel)
        dd.text((10,8), view_name, fill=(230,235,240))
        grid.paste(panel, (ox, oy))
    legend_y = 1040
    legend = "GREEN body | BLUE existing seven-hair-bone ownership | MAGENTA image-space hair candidate | YELLOW face | ORANGE ambiguous"
    draw_grid.text((10, legend_y), legend, fill=(235,235,235))
    grid.save(out_png)

def render_face_uv_overlay(mesh, labels, out_png):
    tex = mesh['texture'].convert('RGBA')
    img = tex.copy()
    d = ImageDraw.Draw(img, 'RGBA')
    uv = mesh['uv']
    tri = mesh['indices']
    w,h = img.size
    for t in tri:
        tri_labels = labels[t]
        if np.sum(tri_labels == 'face') >= 2:
            pts = []
            for v in t:
                u = float(uv[v,0] % 1.0)
                vv = float(1.0 - (uv[v,1] % 1.0))
                pts.append((u*w, vv*h))
            d.polygon(pts, fill=(255,230,70,90), outline=(255,255,255,160))
    img.save(out_png)

def render_preview_counts(labels, out_json, source_info):
    import collections
    counts = collections.Counter(labels.tolist())
    counts_all = {k:int(counts.get(k,0)) for k in ['body','hair_existing','hair_candidate','face','ambiguous']}
    data = {'counts': counts_all, **source_info}
    Path(out_json).write_text(json.dumps(data, indent=2) + '\n')

def main():
    if len(sys.argv) != 4:
        print("usage: semantic_classifier.py SOURCE_GLB DERIVED_GLB OUTDIR", file=sys.stderr)
        sys.exit(2)
    source_glb = sys.argv[1]
    derived_glb = sys.argv[2]
    outdir = Path(sys.argv[3]); outdir.mkdir(parents=True, exist_ok=True)

    source = load_mesh(source_glb)
    derived = load_mesh(derived_glb)
    # Use derived mesh for classification; source only for identity and future mapping references
    labels, colors, hair_infl = classify_vertices(derived)
    render_views(derived, labels, colors, outdir / 'Heady_v03_10_9_Semantic6Views.png')
    render_face_uv_overlay(derived, labels, outdir / 'Heady_v03_10_9_FaceUVOverlay.png')

    receipt = {
        'campaign': 'HEADY_SEMANTIC_CLASSIFIER',
        'version': '03.10.9',
        'source_glb': source_glb,
        'source_sha256': sha256(source_glb),
        'derived_glb': derived_glb,
        'derived_sha256': sha256(derived_glb),
        'source_joint_count': len(source['doc']['skins'][0]['joints']) if source['doc'].get('skins') else 0,
        'derived_joint_count': len(derived['doc']['skins'][0]['joints']) if derived['doc'].get('skins') else 0,
        'vertex_count': int(len(derived['positions'])),
        'triangle_count': int(len(derived['indices'])),
        'hair_bone_vertex_count': int(np.sum(hair_infl > 0.01)),
        'semantic_counts': {
            'body': int(np.sum(labels == 'body')),
            'hair_existing': int(np.sum(labels == 'hair_existing')),
            'hair_candidate': int(np.sum(labels == 'hair_candidate')),
            'face': int(np.sum(labels == 'face')),
            'ambiguous': int(np.sum(labels == 'ambiguous')),
        },
        'notes': [
            'Read-only semantic classification only; no skin weights modified.',
            'Image-space labels are heuristics combining texture color, spatial priors, and existing hair-bone ownership.',
            'Primary acceptance target is whether visible hair and face can be isolated credibly for later rigging and expression work.'
        ],
        'outputs': [
            'Heady_v03_10_9_Semantic6Views.png',
            'Heady_v03_10_9_FaceUVOverlay.png',
            'Heady_v03_10_9_Receipt.json'
        ]
    }
    Path(outdir / 'Heady_v03_10_9_Receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')

if __name__ == '__main__':
    main()
