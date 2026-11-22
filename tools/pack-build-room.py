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
# The ceiling is not a wall: where the model painted it too, cut it out (a polygon in the
# room description, as shares of the picture).
if spec.get('ceiling') and 'walls' in masks:
    from PIL import ImageDraw
    cut = Image.new('L', (W, H), 0)
    ImageDraw.Draw(cut).polygon([(x * W, y * H) for x, y in spec['ceiling']], fill=255)
    masks['walls'] = masks['walls'] * (1 - np.asarray(cut.filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255)
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
# A later, cleaner picture of the empty room (empty2.png) is the one shown, when there is
# one; options made from either picture are measured against the one they were made from.
base2 = load('empty2') if os.path.exists(os.path.join(src, 'empty2.png')) else None
Image.fromarray((base if base2 is None else base2).astype('uint8')).save(os.path.join(out, 'base.webp'), 'WEBP', quality=92, method=6)
first_base = base
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
        source = option.get('image', name)  # a redone picture of this option, if any
        a = load(source)
        base = first_base
        if base2 is not None and np.abs(a - base2).mean() < np.abs(a - first_base).mean():
            base = base2
        distance = np.abs(a - base).sum(axis=2)
        different = distance > 60
        # The thing's outline comes from a second picture in which only it was painted
        # magenta (matte-<name>.png): far more exact than guessing from what changed.
        matte_path = os.path.join(src, 'matte-' + source + '.png')
        if not os.path.exists(matte_path):
            print(f'  {room}: {name} has no outline picture, skipped')
            continue
        mp = load('matte-' + source)
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
        ratio3 = a / np.maximum(base, 8)
        spread = ratio3.max(axis=2) - ratio3.min(axis=2)
        level = ratio3.mean(axis=2)
        room_like = (spread < 0.14) & (level > 0.45) & (level < 1.7)  # the room itself, in shadow or lit by the thing
        roomish = ndimage.binary_opening(room_like | (distance < 40), iterations=2)

        def fill(shape):
            # Fill specks the model missed, but leave real openings (between chair legs,
            # under a table) where the empty room is plainly seen.
            whole = ndimage.binary_fill_holes(shape)
            return shape | (whole & ~roomish) if option.get('legs', group.get('legs')) else whole

        keep = fill(ndimage.binary_opening((raw > 0.5) & allowed, iterations=1))
        if keep.mean() > 0.3:
            print(f'  {room}: {name} outline covers {100 * keep.mean():.0f}% of the picture, skipped')
            continue
        labels, count = ndimage.label(keep)
        sizes = ndimage.sum(keep, labels, range(1, count + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s > max(40, sizes.max() * 0.04)])
        # Mend bites in the outline: pixels right beside the thing that are clearly not the
        # empty room, and not merely the room in shadow (same colour, only darker).
        # (the outline picture shows them faintly magenta: painted, but shaded too dark to count)
        extra = (raw > 0.12) & (distance > 60) & ~room_like & ndimage.binary_dilation(keep, iterations=22) & ~unstable
        keep = fill(ndimage.binary_closing(keep | ndimage.binary_opening(extra, iterations=2), iterations=3))
        labels, count = ndimage.label(keep)
        sizes = ndimage.sum(keep, labels, range(1, count + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s > max(40, sizes.max() * 0.04)])
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
        opening = option.get('open', group.get('open'))  # True: clear glass. 'loose': also gaps seen in shadow
        through = option.get('through')  # polygons (shares of the picture) that are plainly open: between bed posts, under a table
        if opening or regions or through:
            hole = np.zeros((H, W), bool)
            if opening or regions:
                see_through = np.abs(a - base).sum(axis=2) < 34
                if opening == 'loose' or regions:
                    # The same colour only lighter or darker: wall or floor in the thing's shadow.
                    see_through |= (spread < 0.12) & (level > 0.45) & (level < 1.6)
                if regions:
                    inside = np.zeros((H, W), bool)
                    for x0, y0, x1, y1 in regions:
                        inside[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = True
                    see_through &= inside
                hole = ndimage.binary_closing(ndimage.binary_opening(see_through, iterations=1), iterations=1)
            if through:
                from PIL import ImageDraw
                cut = Image.new('L', (W, H), 0)
                for polygon in through:
                    ImageDraw.Draw(cut).polygon([(x * W, y * H) for x, y in polygon], fill=255)
                # a little wider than drawn, but never the thing's own dark frame or stone
                hole |= ndimage.binary_dilation(np.asarray(cut) > 0, iterations=24) & (lum(a) > 62) & (level > 0.4)
            guard &= ~hole
            # Nothing of the thing is there either, so whatever stands behind shows through.
            gap = np.asarray(Image.fromarray(((hole & keep) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0))).astype(float) / 255
            solid = solid * (1 - gap)
        guard = np.asarray(Image.fromarray((guard * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
        # The layer is the thing alone. What it does to the room around it travels separately:
        # `shade` is how much darker each pixel became (drawn by multiplying, so the shadow
        # falls on whatever is there: floor, rug, another piece), and `glow` is the light it
        # adds. Small differences are the image model's noise and are ignored.
        layer = np.dstack([a, solid * 255]).astype('uint8')
        Image.fromarray(layer, 'RGBA').save(os.path.join(out, name + '.webp'), 'WEBP', quality=92, alpha_quality=96, method=6)
        blur = lambda x, r: ndimage.gaussian_filter(x, (r, r, 0) if x.ndim == 3 else r)
        reach = ndimage.binary_dilation(keep, iterations=90) & ~unstable
        reach = blur(reach.astype(float), 18) * (1 - solid)
        a_s, b_s = blur(a, 2.5), blur(base, 2.5)
        darker = np.clip(1 - a_s / np.maximum(b_s, 8) - 0.05, 0, 1) / 0.95
        shade = 1 - darker * reach[..., None]
        Image.fromarray((shade * 255).astype('uint8')).save(os.path.join(out, name + '-s.webp'), 'WEBP', quality=88, method=6)
        far = ndimage.binary_dilation(keep, iterations=200) & ~unstable
        far = blur(far.astype(float), 30) * (1 - solid)
        glow = np.clip(blur(a, 4) - blur(base, 4) - 7, 0, 255) * far[..., None]
        has_glow = bool((glow.max(axis=2) > 12).mean() > 0.002)
        if has_glow:
            Image.fromarray(glow.astype('uint8')).save(os.path.join(out, name + '-g.webp'), 'WEBP', quality=86, method=6)
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
        options.append({'id': name, 'label': option['label'], 'spec': option.get('spec', ''), 'glow': has_glow,
                        'focus': [round(cx / W, 3), round(cy / H, 3), round(max(0.12, (x1 - x0) / W), 3), round(max(0.12, (y1 - y0) / H), 3)]})
        print(f'  {room}: {name:10s} {100 * keep.mean():5.2f}% of the picture')
    groups.append({'id': group['id'], 'label': group['label'], 'stage': group['stage'], 'z': group.get('z', 5), 'options': options})

# The floor as a flat plane: a 3 x 3 matrix taking a point in the picture (as shares of its
# width and height) to metres on the floor, so floor layouts can be drawn in perspective.
floor_h = None
if spec.get('floor'):
    (fw, fd), quad = spec['floor']['size'], spec['floor']['quad']
    world = [(0, fd), (fw, fd), (fw, 0), (0, 0)]
    rows, rhs = [], []
    for (x, y), (u, v) in zip(quad, world):
        rows += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        rhs += [u, v]
    floor_h = [round(float(t), 6) for t in np.linalg.solve(np.array(rows, float), np.array(rhs, float))] + [1.0]

json.dump({'width': W, 'height': H, 'build': True, 'floorH': floor_h, 'surfaces': surfaces, 'average': average, 'focus': focus, 'groups': groups},
          open(os.path.join(out, 'meta.json'), 'w'))
