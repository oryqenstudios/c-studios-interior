// Interactive room: tap a surface in the photograph and choose its colour or material
// tone. The photograph's own light and shadow are kept: each pixel of a surface is
// multiplied by (chosen colour / the surface's average colour), weighted by a soft mask.

const SURFACES = [
  {
    key: 'walls',
    label: 'Walls',
    options: [
      ['Lime plaster', null],
      ['Warm white', '#efe9de'],
      ['Sand', '#cdb99a'],
      ['Clay', '#b98b6e'],
      ['Sage', '#9aa58c'],
      ['Olive', '#5d6650'],
      ['Charcoal', '#3d3d3f'],
    ],
  },
  {
    key: 'floor',
    label: 'Floor',
    options: [
      ['Limestone', null],
      ['Pale oak', '#c9a67c'],
      ['Honey oak', '#b0834f'],
      ['Walnut', '#6e4b33'],
      ['Grey stone', '#8d8b86'],
      ['Dark slate', '#45464a'],
    ],
  },
  {
    key: 'timber',
    label: 'Joinery',
    options: [
      ['Walnut', null],
      ['Natural oak', '#b08d62'],
      ['Smoked oak', '#4a3b30'],
      ['Ebony', '#2a2523'],
      ['Olive lacquer', '#4e5744'],
    ],
  },
  {
    key: 'sofa1',
    label: 'Curved sofa',
    options: [
      ['Olive velvet', null],
      ['Oatmeal linen', '#cfc3ad'],
      ['Rust', '#a4563a'],
      ['Ink blue', '#34425a'],
      ['Charcoal', '#3f3f41'],
      ['Blush', '#c9a394'],
    ],
  },
  {
    key: 'sofa2',
    label: 'Second sofa',
    options: [
      ['Cream boucle', null],
      ['Stone', '#a9a297'],
      ['Caramel', '#a9794f'],
      ['Olive', '#5d6650'],
      ['Charcoal', '#434345'],
    ],
  },
  {
    key: 'rug',
    label: 'Rug',
    options: [
      ['Natural wool', null],
      ['Ivory', '#e6dfd0'],
      ['Clay', '#a9806a'],
      ['Moss', '#6b7257'],
      ['Graphite', '#4b4a49'],
    ],
  },
];

// Whole-room themes set several surfaces at once.
const THEMES = {
  'Olive and walnut': {},
  'Sand and oak': { walls: '#cdb99a', floor: '#c9a67c', timber: '#b08d62', sofa1: '#cfc3ad', rug: '#e6dfd0' },
  'Charcoal and stone': { walls: '#3d3d3f', floor: '#8d8b86', timber: '#2a2523', sofa1: '#3f3f41', sofa2: '#a9a297', rug: '#4b4a49' },
  'Clay and oak': { walls: '#b98b6e', floor: '#b0834f', timber: '#b08d62', sofa1: '#a4563a', sofa2: '#a9794f', rug: '#a9806a' },
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pixels(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export async function initCustomiser() {
  const root = document.querySelector('[data-customiser]');
  if (!root) return null;
  const canvas = root.querySelector('.cfg__canvas');
  const original = root.querySelector('.cfg__original');
  const tabs = root.querySelector('.cfg__tabs');
  const swatches = root.querySelector('.cfg__swatches');
  const themes = root.querySelector('.cfg__themes');
  const divider = root.querySelector('.cfg__divider');
  const handle = root.querySelector('.cfg__handle');
  const hint = root.querySelector('.cfg__hint');
  const base = root.dataset.customiser; // folder with base.webp, masks-a.webp, masks-b.webp, meta.json

  const [meta, baseImg, masksA, masksB] = await Promise.all([
    fetch(`${base}/meta.json`).then((r) => r.json()),
    loadImage(`${base}/base.webp`),
    loadImage(`${base}/masks-a.webp`),
    loadImage(`${base}/masks-b.webp`),
  ]);

  const W = meta.width;
  const H = meta.height;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const src = pixels(baseImg, W, H).data;
  const ma = pixels(masksA, W, H).data;
  const mb = pixels(masksB, W, H).data;
  const out = ctx.createImageData(W, H);

  // Mask of surface i at pixel p (byte offset): three surfaces per mask image, in R, G, B.
  const maskOf = [
    (p) => ma[p],
    (p) => ma[p + 1],
    (p) => ma[p + 2],
    (p) => mb[p],
    (p) => mb[p + 1],
    (p) => mb[p + 2],
  ];

  const chosen = Object.fromEntries(SURFACES.map((s) => [s.key, null]));
  let active = 0;
  let highlight = -1;

  function render() {
    // Per-surface channel gains: chosen colour over the surface's average colour.
    const gains = SURFACES.map((s) => {
      const hex = chosen[s.key];
      if (!hex) return null;
      const target = hexToRgb(hex);
      const avg = meta.average[s.key];
      // Mostly a per-channel tint, eased toward a plain brightness change so the warmth of
      // the room's light survives, and capped so dark surfaces do not turn noisy when lightened.
      const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
      const even = lum(target) / lum(avg);
      // The more a dark surface is lightened, the more the tint gives way to plain brightness.
      const mixTint = even > 1.6 ? 0.55 : 0.8;
      return [0, 1, 2].map((k) => Math.min(3.2, (target[k] / avg[k]) * mixTint + even * (1 - mixTint)));
    });
    const data = out.data;
    for (let p = 0; p < src.length; p += 4) {
      let r = src[p];
      let g = src[p + 1];
      let b = src[p + 2];
      for (let i = 0; i < 6; i++) {
        const m = maskOf[i](p);
        if (m < 8) continue;
        const a = m / 255;
        const gain = gains[i];
        if (gain) {
          r += (Math.min(255, src[p] * gain[0]) - src[p]) * a;
          g += (Math.min(255, src[p + 1] * gain[1]) - src[p + 1]) * a;
          b += (Math.min(255, src[p + 2] * gain[2]) - src[p + 2]) * a;
        }
        if (i === highlight) {
          r += (255 - r) * 0.14 * a;
          g += (255 - g) * 0.14 * a;
          b += (255 - b) * 0.14 * a;
        }
      }
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }

  function drawSwatches() {
    const surface = SURFACES[active];
    swatches.replaceChildren(
      ...surface.options.map(([name, hex]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cfg__swatch';
        button.setAttribute('aria-pressed', String(chosen[surface.key] === hex));
        const avg = meta.average[surface.key];
        button.innerHTML = `<i style="--c: ${hex ?? `rgb(${avg.join(' ')})`}"></i><span>${name}</span>`;
        button.addEventListener('click', () => {
          chosen[surface.key] = hex;
          hint?.classList.add('is-used');
          render();
          drawSwatches();
        });
        return button;
      }),
    );
    for (const [i, tab] of [...tabs.children].entries()) tab.setAttribute('aria-selected', String(i === active));
  }

  function select(index) {
    active = index;
    drawSwatches();
    // Flash the chosen surface so it is clear what the swatches will change.
    highlight = index;
    render();
    setTimeout(() => {
      if (highlight === index) {
        highlight = -1;
        render();
      }
    }, 650);
  }

  tabs.replaceChildren(
    ...SURFACES.map((surface, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'cfg__tab';
      tab.setAttribute('role', 'tab');
      tab.textContent = surface.label;
      tab.addEventListener('click', () => select(i));
      return tab;
    }),
  );

  themes.replaceChildren(
    ...Object.entries(THEMES).map(([name, set]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cfg__theme';
      button.textContent = name;
      button.addEventListener('click', () => {
        for (const s of SURFACES) chosen[s.key] = set[s.key] ?? null;
        hint?.classList.add('is-used');
        render();
        drawSwatches();
      });
      return button;
    }),
  );

  // Tap a surface in the picture to select it.
  const surfaceAt = (event) => {
    const box = canvas.getBoundingClientRect();
    // the canvas is drawn with object-fit: cover
    const scale = Math.max(box.width / W, box.height / H);
    const x = Math.floor((event.clientX - box.left - (box.width - W * scale) / 2) / scale);
    const y = Math.floor((event.clientY - box.top - (box.height - H * scale) / 2) / scale);
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    const p = (y * W + x) * 4;
    let best = -1;
    let strength = 90;
    for (let i = 0; i < 6; i++) {
      const m = maskOf[i](p);
      if (m > strength) {
        strength = m;
        best = i;
      }
    }
    return best;
  };
  canvas.addEventListener('click', (event) => {
    const index = surfaceAt(event);
    if (index >= 0) select(index);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    canvas.style.cursor = surfaceAt(event) >= 0 ? 'pointer' : 'default';
  });

  // Compare: drag the divider to reveal the original on the left.
  let split = 0;
  const setSplit = (value) => {
    split = Math.max(0, Math.min(1, value));
    original.style.clipPath = `inset(0 ${(1 - split) * 100}% 0 0)`;
    divider.style.left = `${split * 100}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(split * 100)));
  };
  let dragging = false;
  handle.addEventListener('pointerdown', (event) => {
    dragging = true;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const box = root.getBoundingClientRect();
    setSplit((event.clientX - box.left) / box.width);
  });
  handle.addEventListener('pointerup', () => (dragging = false));
  handle.addEventListener('pointercancel', () => (dragging = false));
  handle.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') setSplit(split - 0.05);
    if (event.key === 'ArrowRight') setSplit(split + 0.05);
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    for (const s of SURFACES) chosen[s.key] = null;
    render();
    drawSwatches();
  });

  // A slight drift with the cursor gives the still some depth. Mouse only.
  const view = root.querySelector('.cfg__view');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.addEventListener('pointermove', (event) => {
      const box = root.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      view.style.transform = `scale(1.035) translate(${(-x * 1.4).toFixed(2)}%, ${(-y * 1.4).toFixed(2)}%)`;
    });
  }

  setSplit(0);
  render();
  drawSwatches();
  root.classList.add('is-ready');
  return { root };
}
