"""Packs one customisable room for the site.

Input (a working folder): base.png and one mask-<surface>.png per surface, where each
mask image is the room with that one surface painted flat magenta.
Output (public/cfg/<room>/): base.webp, masks-N.webp (three soft masks per image, in the
R, G and B channels) and meta.json (surface order and each surface's average colour).

usage: python3 tools/pack-room.py <working folder> <room id> <surface> [<surface> ...]
       a surface may be written file=key when the mask file and the surface type differ,
       for example table=stone.
Needs Pillow and numpy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1600, 900  # large enough to stay sharp when the camera pushes in
src, room, *specs = sys.argv[1:]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'cfg', room)
os.makedirs(out, exist_ok=True)

base = Image.open(os.path.join(src, 'base.png')).convert('RGB').resize((W, H), Image.LANCZOS)
b = np.asarray(base).astype(float)
base_magenta = np.minimum(b[..., 0], b[..., 2]) - b[..., 1]


def read_mask(name):
    path = os.path.join(src, f'mask-{name}.png')
    if not os.path.exists(path):
        return None
    a = np.asarray(Image.open(path).convert('RGB').resize((W, H), Image.LANCZOS)).astype(float)
    shift = (np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) - base_magenta  # how far toward magenta
    strong = shift[shift > 15]
    scale = np.percentile(strong, 90) if strong.size > 200 else 60
    return np.clip((shift / scale - 0.3) / 0.4, 0, 1)


masks = {}
for spec in specs:
    name, key = spec.split('=') if '=' in spec else (spec, spec)
    m = read_mask(name)
    if m is None:
        print(f'  {room}: no mask for {name}, skipped')
        continue
    masks[key] = m

# Painting one surface often spills onto others, so the passes are reconciled in order of
# how reliable they are: walls first, then floor, joinery and stone, then small things.
def minus(key, *others, weight=1.0):
    if key not in masks:
        return
    for other in others:
        if other in masks and other != key:
            masks[key] = np.clip(masks[key] - masks[other] * weight, 0, 1)


big = [k for k in ('walls', 'floor', 'timber', 'stone') if k in masks]
small = [k for k in masks if k not in big and k != 'metal']
minus('floor', 'walls', weight=2)
minus('timber', 'walls', 'floor', weight=2)
minus('stone', 'walls', 'floor', 'timber', weight=2)
minus('metal', 'walls', 'floor', 'timber', 'stone', weight=2)
for k in ('rug', 'bedding'):
    minus(k, *[o for o in small if o not in ('rug', 'bedding')])
for k in big:
    minus(k, *small, 'metal')
for k in small:
    minus(k, 'metal')

average = {}
focus = {}
keys = []
for key, m in masks.items():
    soft = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    m = np.asarray(soft).astype(float) / 255
    core = m > 0.6
    if core.sum() < 150:
        print(f'  {room}: {key} came out empty, skipped')
        continue
    masks[key] = m
    keys.append(key)
    average[key] = [round(float(x), 1) for x in b[core].mean(axis=0)]
    # Where the camera goes to look closer: the densest part of the surface (so a wall
    # close-up shows wall, not what stands in front of it) and how big that part is. The
    # page chooses the zoom from the size, because it knows how much of the screen its
    # menu leaves free.
    ys, xs = np.nonzero(core)
    span_x = (np.percentile(xs, 97) - np.percentile(xs, 3)) / W
    span_y = (np.percentile(ys, 97) - np.percentile(ys, 3)) / H
    ww, wh = int(W * min(0.5, max(0.14, span_x))), int(H * min(0.5, max(0.14, span_y)))
    integral = np.pad(m.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    best, bx, by = -1.0, 0, 0
    for yy in range(0, H - wh + 1, 10):
        for xx in range(0, W - ww + 1, 10):
            total = integral[yy + wh, xx + ww] - integral[yy, xx + ww] - integral[yy + wh, xx] + integral[yy, xx]
            if total > best:
                best, bx, by = total, xx, yy
    focus[key] = [round((bx + ww / 2) / W, 3), round((by + wh / 2) / H, 3), round(ww / W, 3), round(wh / H, 3)]
    print(f'  {room}: {key:9s} {100 * m.mean():5.1f}% of the picture')

for i in range(0, len(keys), 3):
    chans = [masks[k] for k in keys[i:i + 3]]
    while len(chans) < 3:
        chans.append(np.zeros((H, W)))
    Image.fromarray((np.dstack(chans) * 255).astype('uint8')).save(os.path.join(out, f'masks-{i // 3}.webp'), 'WEBP', lossless=True)
base.save(os.path.join(out, 'base.webp'), 'WEBP', quality=84, method=6)
json.dump({'width': W, 'height': H, 'surfaces': keys, 'average': average, 'focus': focus}, open(os.path.join(out, 'meta.json'), 'w'))

# A preview with every mask tinted, for checking by eye.
preview = b.copy()
tints = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (0, 255, 255), (255, 0, 255), (255, 128, 0), (128, 0, 255), (0, 128, 128)]
for key, tint in zip(keys, tints):
    w = masks[key][..., None] * 0.55
    preview = preview * (1 - w) + np.array(tint) * w
Image.fromarray(preview.astype('uint8')).save(os.path.join(src, 'preview.jpg'), quality=85)
