"""Packs a "build it up" room for the material board.

The room starts empty. Each fixture or furniture option was generated as the empty room
with that one thing added, so the thing (with its shadow and any glow) can be lifted off
by comparing the two pictures and saved as a see-through layer.

Input (a working folder): empty.png, mask-<surface>.png for each surface (the empty room
with that surface painted magenta), <group>-<n>.png for each option, and
matte-<group>-<n>.png (that option with only the added thing painted magenta).
A JSON file describes the groups: see tools/rooms/*.json.
Output (public/cfg/<room>/): base.webp, masks-N.webp, one layer and one thumbnail per
option, and meta.json.

usage: python3 tools/pack-build-room.py <working folder> <room id> <description.json>
Needs Pillow, numpy and scipy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

W, H = 2240, 1260  # close to the generated size, so close-ups and large screens stay sharp
src, room, spec_path = sys.argv[1:4]
spec = json.load(open(spec_path))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'cfg', room)
os.makedirs(out, exist_ok=True)


def load(name):
    return np.asarray(Image.open(os.path.join(src, name + '.png')).convert('RGB').resize((W, H), Image.LANCZOS)).astype(float)


base = load('empty')
lum = lambda a: a @ np.array([0.3, 0.59, 0.11])

# ---- surfaces: soft masks from the painted-magenta pictures ----
base_magenta = np.minimum(base[..., 0], base[..., 2]) - base[..., 1]
masks, average, focus = {}, {}, {}
for key in spec['surfaces']:
    a = load('mask-' + key)
    shift = (np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) - base_magenta
    strong = shift[shift > 15]
    scale = np.percentile(strong, 90) if strong.size > 200 else 60
    masks[key] = np.clip((shift / scale - 0.3) / 0.4, 0, 1)
if 'floor' in masks and 'walls' in masks:
    masks['floor'] = np.clip(masks['floor'] - masks['walls'] * 2, 0, 1)


def densest(m, core):
    """Centre and size of the densest part of a mask, as shares of the picture."""
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
    return [round((bx + ww / 2) / W, 3), round((by + wh / 2) / H, 3), round(ww / W, 3), round(wh / H, 3)]


surfaces = []
for key, m in masks.items():
    soft = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    m = np.asarray(soft).astype(float) / 255
    core = m > 0.6
    masks[key] = m
    surfaces.append(key)
    average[key] = [round(float(x), 1) for x in base[core].mean(axis=0)]
    focus[key] = densest(m, core)
    print(f'  {room}: surface {key:8s} {100 * m.mean():5.1f}%')
for i in range(0, len(surfaces), 3):
    chans = [masks[k] for k in surfaces[i:i + 3]]
    while len(chans) < 3:
        chans.append(np.zeros((H, W)))
    Image.fromarray((np.dstack(chans) * 255).astype('uint8')).save(os.path.join(out, f'masks-{i // 3}.webp'), 'WEBP', lossless=True)
Image.fromarray(base.astype('uint8')).save(os.path.join(out, 'base.webp'), 'WEBP', quality=92, method=6)
# The studio's own finished version of the room, for comparison.
Image.open(spec['studio']).convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(out, 'studio.webp'), 'WEBP', quality=90, method=6)

# ---- options: lift each added thing off the empty room as a layer ----
# Parts of the picture that the image model redraws differently every time (foliage
# outside the window, mostly) differ in most options. They are noise, not the thing.
names = [f"{g['id']}-{n}" for g in spec['groups'] for n in range(1, len(g['options']) + 1) if os.path.exists(os.path.join(src, f"{g['id']}-{n}.png"))]
changed = np.zeros((H, W))
for name in names:
    changed += np.abs(load(name) - base).sum(axis=2) > 60
unstable = ndimage.binary_dilation(changed >= max(4, 0.3 * len(names)), iterations=2)
print(f'  {room}: {100 * unstable.mean():.1f}% of the picture is unstable between generations and ignored')

groups = []
for group in spec['groups']:
    options = []
    for n, option in enumerate(group['options'], 1):
        name = f"{group['id']}-{n}"
        if name not in names:
            print(f'  {room}: {name} missing, skipped')
            continue
        a = load(name)
        distance = np.abs(a - base).sum(axis=2)
        different = distance > 60
        # The thing's outline comes from a second picture in which only it was painted
        # magenta (matte-<name>.png): far more exact than guessing from what changed.
        matte_path = os.path.join(src, 'matte-' + name + '.png')
        if not os.path.exists(matte_path):
            print(f'  {room}: {name} has no outline picture, skipped')
            continue
        mp = load('matte-' + name)
        magenta = lambda x: np.minimum(x[..., 0], x[..., 2]) - x[..., 1]
        shift = magenta(mp) - magenta(a)
        strong = shift[shift > 25]
        if strong.size < 150:
            print(f'  {room}: {name} outline came out empty, skipped')
            continue
        raw = np.clip((shift / np.percentile(strong, 85) - 0.3) / 0.35, 0, 1)
        # Safeguard: the outline may not reach beyond where the thing actually changed the
        # picture (the model occasionally paints a whole wall).
        allowed = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_dilation(different, iterations=14), iterations=30))
        keep = ndimage.binary_fill_holes(ndimage.binary_opening((raw > 0.5) & allowed, iterations=1))
        if keep.mean() > 0.3:
            print(f'  {room}: {name} outline covers {100 * keep.mean():.0f}% of the picture, skipped')
            continue
        labels, count = ndimage.label(keep)
        sizes = ndimage.sum(keep, labels, range(1, count + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s > max(40, sizes.max() * 0.01)])
        # The layer: the thing, plus the light and shadow it throws on the room nearby.
        # The page places layers first and recolours walls and floor afterwards, so that
        # shade is recoloured with the surface it falls on; `protect` marks the thing
        # itself, which must keep its own colour.
        solid = np.asarray(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255
        # What must keep its own colour when the surfaces are recoloured. Pulled in by a
        # pixel or two, so the blended edge of the thing takes the new surface colour and
        # no pale fringe is left. For open things (a tree, a ladder, glass) anything inside
        # the outline that still looks like the empty room is surface seen through it,
        # and is left free to be recoloured.
        guard = ndimage.binary_erosion(keep, iterations=2)
        regions = option.get('open_regions')  # parts of the picture (x0, y0, x1, y1 as shares) where gaps show the room behind
        if group.get('open') or option.get('open') or regions:
            # Unchanged from the empty room, or the same colour only lighter or darker:
            # that is wall or floor (perhaps in the thing's shadow), not the thing.
            ratio3 = a / np.maximum(base, 8)
            same_hue = ((ratio3.max(axis=2) - ratio3.min(axis=2)) < 0.12) & (ratio3.mean(axis=2) > 0.45) & (ratio3.mean(axis=2) < 1.6)
            see_through = (np.abs(a - base).sum(axis=2) < 34) | same_hue
            if regions:
                inside = np.zeros((H, W), bool)
                for x0, y0, x1, y1 in regions:
                    inside[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
                see_through &= inside
            guard &= ~ndimage.binary_closing(ndimage.binary_opening(see_through, iterations=1), iterations=1)
        guard = np.asarray(Image.fromarray((guard * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
        near = ndimage.binary_dilation(keep, iterations=75) & ~unstable
        near = np.asarray(Image.fromarray((near * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(16))).astype(float) / 255
        changed_here = np.clip((np.abs(lum(a) - lum(base)) - 5) / 14, 0, 1)
        alpha = np.clip(solid + near * changed_here * (1 - solid), 0, 1)
        layer = np.dstack([a, alpha * 255]).astype('uint8')
        Image.fromarray(layer, 'RGBA').save(os.path.join(out, name + '.webp'), 'WEBP', quality=92, alpha_quality=96, method=6)
        protect = np.dstack([np.full((H, W, 3), 255), guard * 255]).astype('uint8')
        Image.fromarray(protect, 'RGBA').save(os.path.join(out, name + '-p.webp'), 'WEBP', lossless=True)
        # A square thumbnail of the thing, and where the camera goes to look at it.
        ys, xs = np.nonzero(keep)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        side = int(max(x1 - x0, y1 - y0) * 1.25) + 20
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        left, top = int(np.clip(cx - side // 2, 0, max(0, W - side))), int(np.clip(cy - side // 2, 0, max(0, H - side)))
        Image.fromarray(a.astype('uint8')).crop((left, top, min(W, left + side), min(H, top + side))).resize((240, 240), Image.LANCZOS).save(
            os.path.join(out, name + '-t.webp'), 'WEBP', quality=82, method=6)
        options.append({'id': name, 'label': option['label'], 'spec': option.get('spec', ''),
                        'focus': [round(cx / W, 3), round(cy / H, 3), round(max(0.12, (x1 - x0) / W), 3), round(max(0.12, (y1 - y0) / H), 3)]})
        print(f'  {room}: {name:10s} {100 * keep.mean():5.2f}% of the picture')
    groups.append({'id': group['id'], 'label': group['label'], 'stage': group['stage'], 'z': group.get('z', 5), 'options': options})

json.dump({'width': W, 'height': H, 'build': True, 'surfaces': surfaces, 'average': average, 'focus': focus, 'groups': groups},
          open(os.path.join(out, 'meta.json'), 'w'))
