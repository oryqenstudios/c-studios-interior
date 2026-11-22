"""Packs the material board's photographs.

Each room has an empty shell and, for each of the studio's looks, three whole photographs:
surfaces, fixtures and fittings, furniture and styling (see tools/rooms/looks.json).
Every photograph is saved at full size (2816 x 1584) and at half size for small screens.

usage: python3 tools/pack-looks.py <folder of generated pictures>
Output: public/cfg/looks.json and public/cfg/<room>/{empty,<look>-1,<look>-2,<look>-3}[-s].webp
"""
import json
import os
import sys

from PIL import Image

src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(os.path.join(here, 'rooms', 'looks.json')))
out = os.path.join(here, '..', 'public', 'cfg')
W, H = 2816, 1584
LABELS = {'living': 'Living room', 'kitchen': 'Kitchen', 'bedroom': 'Bedroom', 'bath': 'Bathroom'}


def save(picture, room, name):
    os.makedirs(os.path.join(out, room), exist_ok=True)
    img = Image.open(picture).convert('RGB').resize((W, H), Image.LANCZOS)
    img.save(os.path.join(out, room, name + '.webp'), 'WEBP', quality=90, method=6)
    img.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(out, room, name + '-s.webp'), 'WEBP', quality=86, method=6)


rooms = []
for room, r in spec['rooms'].items():
    save(os.path.join(here, '..', r['empty']), room, 'empty')
    for look in spec['looks']:
        for stage in (1, 2, 3):
            save(os.path.join(src, f"{room}-{look['id']}-{stage}.png"), room, f"{look['id']}-{stage}")
    rooms.append({'id': room, 'label': LABELS[room], 'fixtures': r['fx'], 'furniture': r['fn']})
    print('packed', room)
json.dump({'rooms': rooms, 'looks': [{k: look[k] for k in ('id', 'label', 'line', 'swatch', 'surface', 'spec')} for look in spec['looks']]},
          open(os.path.join(out, 'looks.json'), 'w'), indent=1)

# ---- floors and walls: each as its own photograph of each empty room ----
# A wall photograph is used whole. A floor photograph keeps only its floor: the floor is
# whatever differs most between the nine floor photographs of a room (the walls, ceiling
# and garden are the same in all of them).
import glob

import numpy as np
from scipy import ndimage

surf = os.path.join(os.path.dirname(os.path.abspath(src)), 'surf')
for room in spec['rooms']:
    floors = [np.asarray(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
              for f in sorted(glob.glob(os.path.join(surf, f'{room}-floor-*.png')))]
    if len(floors) < 2:
        continue
    stack = np.stack([f.mean(axis=2) for f in floors])
    spread = ndimage.gaussian_filter(stack.max(axis=0) - stack.min(axis=0), 3)
    floor = spread > 38
    floor[: int(H * 0.45)] = False  # never the ceiling
    floor = ndimage.binary_opening(floor, iterations=3)
    labels, count = ndimage.label(floor)
    sizes = ndimage.sum(floor, labels, range(1, count + 1))
    # only areas that run down to the foot of the picture: a patch that differs somewhere
    # in the garden or the glazing is not floor
    reach = ndimage.maximum(np.indices(floor.shape)[0], labels, range(1, count + 1))
    floor = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > 0.004 * W * H and reach[i] > 0.88 * H])
    floor = ndimage.binary_fill_holes(ndimage.binary_closing(np.pad(floor, 40), iterations=12))[40:-40, 40:-40]
    alpha = (ndimage.gaussian_filter(floor.astype(np.float32), 1.2) * 255).astype('uint8')
    Image.fromarray(alpha).save(os.path.join(out, room, 'floor-mask.png'))
    for n, f in enumerate(floors, 1):
        layer = Image.fromarray(np.dstack([f.astype('uint8'), alpha]), 'RGBA')
        layer.save(os.path.join(out, room, f'floor-{n}.webp'), 'WEBP', quality=88, alpha_quality=95, method=6)
        layer.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(out, room, f'floor-{n}-s.webp'), 'WEBP', quality=84, alpha_quality=92, method=6)
    for f in sorted(glob.glob(os.path.join(surf, f'{room}-wall-*.png'))):
        save(f, room, os.path.basename(f)[len(room) + 1:-4])
    print('packed surfaces', room, f'{100 * floor.mean():.1f}% floor')

# ---- close-up photographs of every option (tools/rooms/options.json) ----
options = json.load(open(os.path.join(here, 'rooms', 'options.json')))
opts_src = os.path.join(os.path.dirname(os.path.abspath(src)), 'opts')
os.makedirs(os.path.join(out, 'opts'), exist_ok=True)
for gid, group in options['groups'].items():
    for n, option in enumerate(group['options'], 1):
        img = Image.open(os.path.join(opts_src, f'{gid}-{n}.png')).convert('RGB')
        img.resize((W, H), Image.LANCZOS).save(os.path.join(out, 'opts', f'{gid}-{n}.webp'), 'WEBP', quality=88, method=6)
        img.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(out, 'opts', f'{gid}-{n}-s.webp'), 'WEBP', quality=84, method=6)
        option.pop('desc', None)
json.dump(options, open(os.path.join(out, 'options.json'), 'w'), indent=1)
print('packed options')
