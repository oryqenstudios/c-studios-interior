"""Packs the photographs of every item option shown in the room (the board's instant view).

Each is a separate generation of the same room with one thing changed, so everything
else in it (garden, light, other pieces) differs very slightly from the next. Only the
part that really changed is kept; the rest comes from the look's own photograph, so
nothing but the chosen item moves as a visitor steps through the options.

usage: python3 tools/pack-pre.py <folder of look pictures> <folder of option pictures>
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
W, H = 1920, 1080  # there are many of these: kept smaller than the rooms so the site stays within its hosting allowance


def load(path, size=(W, H)):
    return np.asarray(Image.open(path).convert('RGB').resize(size, Image.LANCZOS)).astype(np.float32)


def pack(path):
    room, look, stage, gid, n = re.match(r'(\w+?)-(\w+?)-(\d)-(\w+)-(\d+)\.png$', os.path.basename(path)).groups()
    base_path = os.path.join(looks_dir, f'{room}-{look}-{stage}.png')
    half = (W // 2, H // 2)
    # what changed, with fine detail (leaves) blurred away
    change = np.abs(ndimage.gaussian_filter(load(path, half), (3, 3, 0)) - ndimage.gaussian_filter(load(base_path, half), (3, 3, 0))).max(axis=2)
    mask = ndimage.binary_opening(change > 24, iterations=1)
    labels, count = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    mask = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > 0.0004 * mask.size])
    mask = ndimage.binary_fill_holes(ndimage.binary_dilation(mask, iterations=8))
    picture = load(path)
    share = mask.mean()
    if 0.0005 < share < 0.6:
        alpha = np.asarray(Image.fromarray((mask * 255).astype('uint8')).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
        alpha = ndimage.gaussian_filter(alpha, 4)[..., None]
        picture = load(base_path) * (1 - alpha) + picture * alpha
    img = Image.fromarray(picture.astype('uint8'))
    folder = os.path.join(out, room, 'pre')
    os.makedirs(folder, exist_ok=True)
    name = f'{look}-{stage}-{gid}-{n}'
    img.save(os.path.join(folder, name + '.webp'), 'WEBP', quality=88, method=5)
    img.resize(half, Image.LANCZOS).save(os.path.join(folder, name + '-s.webp'), 'WEBP', quality=84, method=5)
    return look, round(float(share), 3)


if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(pre_dir, '*-[0-9]-*-[0-9]*.png')))
    with ProcessPoolExecutor(3) as pool:
        done = list(pool.map(pack, files))
    looks = sorted({look for look, _ in done})
    path = os.path.join(out, 'looks.json')
    data = json.load(open(path))
    data['pre'] = looks
    json.dump(data, open(path, 'w'), indent=1)
    print(len(done), 'packed for', looks, '| whole picture kept for', sum(1 for _, share in done if not 0.0005 < share < 0.6))
