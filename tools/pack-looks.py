"""Packs the material board's photographs.

Each room has an empty shell and, for each of the studio's looks, three whole photographs:
surfaces, fixtures and fittings, furniture and styling (see tools/rooms/looks.json).
Every photograph is saved at full size (2816 x 1584) and at half size for small screens.

usage: python3 tools/pack-looks.py <folder of generated pictures>   (PACK=surfaces for floors and walls only)
Output: public/cfg/looks.json and public/cfg/<room>/{empty,<look>-1,<look>-2,<look>-3}[-s].webp
"""
import json
import os
import sys

from PIL import Image, ImageFilter

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


ONLY = os.environ.get('PACK')  # 'surfaces' repacks only the floors and walls
rooms = []
for room, r in spec['rooms'].items():
    if ONLY:
        break
    save(os.path.join(here, '..', r['empty']), room, 'empty')
    for look in spec['looks']:
        for stage in (1, 2, 3):
            save(os.path.join(src, f"{room}-{look['id']}-{stage}.png"), room, f"{look['id']}-{stage}")
    rooms.append({'id': room, 'label': LABELS[room], 'fixtures': r['fx'], 'furniture': r['fn']})
    print('packed', room)
if not ONLY:
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
    # Each wall photograph is a separate generation, so its garden, glazing and ceiling
    # differ slightly from the next one's. Only the wall is kept; everything else comes
    # from the empty room, so nothing but the wall changes as a visitor browses. The wall
    # is whatever differs strongly between the wall photographs once fine detail (leaves)
    # is blurred away.
    wall_files = sorted(glob.glob(os.path.join(surf, f'{room}-wall-*.png')))
    small = lambda f: np.asarray(Image.open(f).convert('RGB').resize((W // 2, H // 2), Image.LANCZOS)).astype(np.float32)
    # Measured between the 15th and 85th percentile, so that something only a few of the
    # photographs changed by mistake (a painted ceiling) does not count as wall.
    stack = np.stack([ndimage.gaussian_filter(small(f), (4, 4, 0)).astype(np.uint8) for f in wall_files])
    spread = (np.percentile(stack, 85, axis=0) - np.percentile(stack, 15, axis=0)).max(axis=2)
    del stack
    wall = spread > 0.45 * np.percentile(spread[spread > 60], 90)
    wall &= ~np.asarray(Image.fromarray(floor).resize((W // 2, H // 2)))
    wall = ndimage.binary_closing(ndimage.binary_opening(wall, iterations=2), iterations=2)
    labels, count = ndimage.label(wall)
    sizes = ndimage.sum(wall, labels, range(1, count + 1))
    wall = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > 0.004 * wall.size])
    wall_alpha = np.asarray(Image.fromarray((wall * 255).astype('uint8')).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)[..., None] / 255
    Image.fromarray((wall_alpha[..., 0] * 255).astype('uint8')).save(os.path.join(out, room, 'wall-mask.png'))
    empty = np.asarray(Image.open(os.path.join(here, '..', spec['rooms'][room]['empty'])).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
    for f in wall_files:
        picture = np.asarray(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
        img = Image.fromarray((empty * (1 - wall_alpha) + picture * wall_alpha).astype('uint8'))
        name = os.path.basename(f)[len(room) + 1:-4]
        img.save(os.path.join(out, room, name + '.webp'), 'WEBP', quality=90, method=6)
        img.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(out, room, name + '-s.webp'), 'WEBP', quality=86, method=6)
    print('packed surfaces', room, f'{100 * floor.mean():.1f}% floor')

if ONLY:
    raise SystemExit

# ---- close-up photographs of every option (tools/rooms/options.json) ----
options = json.load(open(os.path.join(here, 'rooms', 'options.json')))
opts_src = os.path.join(os.path.dirname(os.path.abspath(src)), 'opts')
os.makedirs(os.path.join(out, 'opts'), exist_ok=True)
for gid, group in options['groups'].items():
  # a material may have its own close-ups for some rooms: <group>-<room>-<n>.png
  for name in [gid] + [f'{gid}-{room}' for room in group.get('rooms', [])]:
    for n, option in enumerate(group['options'], 1):
        img = Image.open(os.path.join(opts_src, f'{name}-{n}.png')).convert('RGB')
        img.resize((W, H), Image.LANCZOS).save(os.path.join(out, 'opts', f'{name}-{n}.webp'), 'WEBP', quality=88, method=6)
        img.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(out, 'opts', f'{name}-{n}-s.webp'), 'WEBP', quality=84, method=6)
        option.pop('desc', None)
json.dump(options, open(os.path.join(out, 'options.json'), 'w'), indent=1)
print('packed options')
