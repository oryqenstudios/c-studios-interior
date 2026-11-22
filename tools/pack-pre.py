"""Packs the photographs of every item option shown in the room (the board's instant view).

Each is a separate generation of the same room with one thing changed, and is published
whole, exactly as generated, at full size.

usage: python3 tools/pack-pre.py <folder of look pictures> <folder of option pictures> [look id ...]
Output: public/cfg/<room>/pre/<look>-<stage>-<group>-<n>[-s].webp, and the list of looks
that have them in public/cfg/looks.json ("pre").
"""
import glob
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image
from scipy import ndimage

looks_dir, pre_dir = sys.argv[1:3]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'public', 'cfg')
W, H = 2816, 1584  # the size they were generated at; one file each (no half-size copy), as there are many


def load(path, size=(W, H)):
    return np.asarray(Image.open(path).convert('RGB').resize(size, Image.LANCZOS)).astype(np.float32)


def pack(path):
    room, look, stage, gid, n = re.match(r'(\w+?)-(\w+?)-(\d)-(\w+)-(\d+)\.png$', os.path.basename(path)).groups()
    # Used whole, exactly as generated. (Blending each one into the look's photograph to
    # hold the garden still was tried and let the replaced item show through: never again.)
    picture = load(path)
    share = 1.0
    img = Image.fromarray(picture.astype('uint8'))
    folder = os.path.join(out, room, 'pre')
    os.makedirs(folder, exist_ok=True)
    name = f'{look}-{stage}-{gid}-{n}'
    img.save(os.path.join(folder, name + '.webp'), 'WEBP', quality=86, method=5)
    return look, round(float(share), 3)


if __name__ == '__main__':
    only = sys.argv[3:]  # look ids; all if none given
    files = [f for f in sorted(glob.glob(os.path.join(pre_dir, '*-[0-9]-*-[0-9]*.png'))) if not only or os.path.basename(f).split('-')[1] in only]
    with ProcessPoolExecutor(3) as pool:
        done = list(pool.map(pack, files))
    looks = sorted({look for look, _ in done})
    path = os.path.join(out, 'looks.json')
    data = json.load(open(path))
    data['pre'] = looks
    json.dump(data, open(path, 'w'), indent=1)
    print(len(done), 'packed for', looks)
