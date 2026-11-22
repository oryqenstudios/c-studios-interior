// The studio's material catalogue for surfaces, and how each choice is drawn.
// Colours and names are the studio's. The drawing is an approximation laid over a
// photograph: a tint for the colour, a pattern for the layout or finish type.

export const FLOORING = [
  { id: 'light-oak', label: 'Light oak', hex: '#C8A77A', finish: 'Matte', kind: 'wood', layouts: ['straight', 'herringbone', 'chevron'] },
  { id: 'walnut', label: 'Natural walnut', hex: '#7A5638', finish: 'Satin', kind: 'wood', layouts: ['straight', 'herringbone', 'chevron'] },
  { id: 'smoked-oak', label: 'Smoked oak', hex: '#4E3B2C', finish: 'Matte', kind: 'wood', layouts: ['straight', 'herringbone'] },
  { id: 'ash', label: 'Whitewashed ash', hex: '#D9CDB8', finish: 'Matte', kind: 'wood', layouts: ['straight'] },
  { id: 'marble', label: 'White marble', hex: '#F1EEE8', finish: 'Polished, grey veins', kind: 'marble', layouts: ['slab', 'tile'] },
  { id: 'travertine', label: 'Beige travertine', hex: '#D8C7A8', finish: 'Honed', kind: 'stone', layouts: ['slab', 'tile'] },
  { id: 'porcelain', label: 'Grey porcelain', hex: '#9A9A96', finish: 'Matte', kind: 'stone', layouts: ['tile', 'slab'] },
  { id: 'terrazzo', label: 'Terrazzo', hex: '#E3DED3', finish: 'Polished, speckled', kind: 'terrazzo', layouts: ['seamless'] },
  { id: 'microcement', label: 'Microcement', hex: '#B4AFA6', finish: 'Matte', kind: 'cement', layouts: ['seamless'] },
];

export const LAYOUTS = {
  straight: 'Straight',
  herringbone: 'Herringbone',
  chevron: 'Chevron',
  slab: 'Large slab',
  tile: '60 cm tile',
  seamless: 'Seamless',
};

export const WALL_FINISHES = [
  { id: 'paint', label: 'Matte paint', look: 'Flat, even colour.' },
  { id: 'limewash', label: 'Limewash', look: 'Soft, cloudy variation.' },
  { id: 'venetian', label: 'Venetian plaster', look: 'Subtle polished sheen.' },
  { id: 'slats', label: 'Timber slats', look: 'Vertical ribs in timber. Uses the timber tone, not the wall colour.' },
  { id: 'fluted', label: 'Fluted panel', look: 'Painted vertical grooves in the wall colour.' },
  { id: 'stone', label: 'Stone cladding', look: 'Travertine slabs. Uses the stone tone, not the wall colour.' },
];

export const WALL_COLOURS = [
  ['Warm white', '#F2EDE4'],
  ['Greige', '#CFC6B8'],
  ['Sand', '#B7A68C'],
  ['Sage', '#9BA58E'],
  ['Deep olive', '#46503F'],
  ['Terracotta', '#B5694A'],
  ['Dusty blue', '#7F93A3'],
  ['Charcoal', '#2F2F31'],
];

// Colours the two wall finishes that are not painted take instead of the wall colour.
export const SLAT_TIMBER = '#7A5638';
export const CLADDING_STONE = '#D8C7A8';

/* ---------- drawing ---------- */

const frac = (t) => t - Math.floor(t);
// A repeatable pseudo-random number in 0..1 for a pair of whole numbers.
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Smooth noise in 0..1.
function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi) + (hash(xi + 1, yi) - hash(xi, yi)) * sx;
  const b = hash(xi, yi + 1) + (hash(xi + 1, yi + 1) - hash(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
}

const JOINT = 0.006; // width of a joint, in metres
const BOARD = 0.15; // board width
const TILE = 0.6;

// How much lighter or darker the floor is at a point (u, v in metres on the floor):
// joints between boards or tiles, a slight change of tone from piece to piece, veins and
// speckles. Returns a multiplier around 1.
export function floorPattern(u, v, kind, layout) {
  let m = 1;
  if (layout === 'straight') {
    const column = Math.floor(u / BOARD);
    const along = v + hash(column, 7) * 1.8;
    if (frac(u / BOARD) * BOARD < JOINT || frac(along / 1.8) * 1.8 < JOINT) return 0.74;
    m = 0.95 + hash(column, Math.floor(along / 1.8)) * 0.1;
  } else if (layout === 'herringbone') {
    // Boards five cells long, each row stepped one cell from the last, turned through 45 degrees.
    const a = (u + v) * 0.7071;
    const b = (u - v) * 0.7071;
    const s = 0.12;
    const n = 5;
    const gx = Math.floor(a / s);
    const gy = Math.floor(b / s);
    const fx = frac(a / s) * s;
    const fy = frac(b / s) * s;
    const k = (((gx - gy) % (2 * n)) + 2 * n) % (2 * n);
    if (k < n) {
      if (fy < JOINT || (k === 0 && fx < JOINT)) return 0.74;
      m = 0.95 + hash(gx - k, gy) * 0.1;
    } else {
      if (fx < JOINT || (k === n && fy < JOINT)) return 0.74;
      m = 0.95 + hash(gx + 31, gy + (k - n)) * 0.1;
    }
  } else if (layout === 'chevron') {
    const column = Math.floor(u / 0.5);
    const across = frac(u / 0.5);
    if (across * 0.5 < JOINT) return 0.74;
    const slope = column & 1 ? across : 1 - across;
    const along = v + slope * 0.5;
    if (frac(along / BOARD) * BOARD < JOINT) return 0.76;
    m = 0.95 + hash(column, Math.floor(along / BOARD)) * 0.1;
  } else if (layout === 'tile' || layout === 'slab') {
    const w = layout === 'tile' ? TILE : 1.2;
    const d = layout === 'tile' ? TILE : 2.4;
    if (frac(u / w) * w < JOINT || frac(v / d) * d < JOINT) return 0.8;
    m = 0.98 + hash(Math.floor(u / w), Math.floor(v / d)) * 0.04;
  }
  if (kind === 'marble') {
    // long, wandering grey veins
    const vein = Math.abs(Math.sin(u * 1.7 + v * 0.9 + noise(u * 0.9, v * 0.9) * 6.5));
    if (vein < 0.045) m *= 0.84 + vein * 2;
    m *= 0.98 + noise(u * 3, v * 3) * 0.04;
  } else if (kind === 'terrazzo') {
    const chip = hash(Math.floor(u / 0.022), Math.floor(v / 0.022));
    if (chip > 0.86) m *= 0.84;
    else if (chip < 0.1) m *= 1.07;
  } else if (kind === 'cement') {
    m *= 0.95 + noise(u * 1.6, v * 1.6) * 0.1;
  } else if (kind === 'stone') {
    m *= 0.97 + noise(u * 5, v * 5) * 0.06;
  }
  return m;
}

// The same for a wall, at a point in the picture (x, y as shares of its width).
// Returns a multiplier around 1.
export function wallPattern(x, y, finish) {
  if (finish === 'limewash') return 0.93 + noise(x * 9, y * 9) * 0.1 + noise(x * 34, y * 34) * 0.04;
  if (finish === 'slats' || finish === 'fluted') {
    const rib = frac(x * 150);
    const groove = finish === 'slats' ? 0.42 : 0.3;
    if (rib < groove) return finish === 'slats' ? 0.62 : 0.86;
    // each rib catches a little light on one side
    return 1 + (rib - groove) * (finish === 'slats' ? 0.12 : 0.07);
  }
  if (finish === 'stone') {
    if (frac(x * 7) < 0.0035 || frac(y * 2.6) < 0.006) return 0.82; // slab joints
    const vein = Math.abs(Math.sin(y * 46 + noise(x * 6, y * 6) * 5));
    return (vein < 0.08 ? 0.93 : 1) * (0.97 + noise(x * 40, y * 40) * 0.06);
  }
  return 1;
}

// How strongly light and shade show on a finish: polished surfaces show more, matte less.
export const contrastOf = (text) => (/polish|gloss|sheen|mirror/i.test(text) ? 1.16 : /matte|flat/i.test(text) ? 0.93 : 1);
