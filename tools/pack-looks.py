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
json.dump({'rooms': rooms, 'looks': [{k: look[k] for k in ('id', 'label', 'line', 'swatch', 'spec')} for look in spec['looks']]},
          open(os.path.join(out, 'looks.json'), 'w'), indent=1)
