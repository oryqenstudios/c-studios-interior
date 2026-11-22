// Interactive rooms, driven by a material board: pick a part of the room from the list (or
// tap it in the photograph), and the camera pushes in on just that part while the rest of
// the room dims; move through the finishes to preview them and select one to apply it.
//
// Tap a surface in the photograph and choose its colour or material
// tone. Each room stays a photograph; a soft mask per surface says where a finish applies,
// and each pixel there is multiplied toward the chosen colour, so the photograph's own
// light and shadow are kept. Choices are stored per surface type, so walls, floors,
// joinery, stone, curtains and metal carry from room to room.

const ROOMS = [
  { id: 'living', label: 'Living', labels: { timber: 'Joinery', stone: 'Coffee table' } },
  { id: 'kitchen', label: 'Kitchen', labels: { timber: 'Cabinetry', stone: 'Island' } },
  { id: 'bedroom', label: 'Bedroom', labels: { timber: 'Bed and joinery' } },
  { id: 'bath', label: 'Bathroom', labels: { timber: 'Vanity', stone: 'Bath and basins' } },
];

// Finishes per surface type. `null` is the room as photographed.
const FINISHES = {
  walls: { label: 'Walls', options: [['Lime plaster', null], ['Warm white', '#efe9de'], ['Sand', '#cdb99a'], ['Clay', '#b98b6e'], ['Sage', '#9aa58c'], ['Olive', '#5d6650'], ['Charcoal', '#3d3d3f']] },
  floor: { label: 'Floor', options: [['Limestone', null], ['Pale oak', '#c9a67c'], ['Honey oak', '#b0834f'], ['Walnut', '#6e4b33'], ['Grey stone', '#8d8b86'], ['Dark slate', '#45464a']] },
  timber: { label: 'Joinery', options: [['Walnut', null], ['Natural oak', '#b08d62'], ['Smoked oak', '#4a3b30'], ['Ebony', '#2a2523'], ['Olive lacquer', '#4e5744']] },
  stone: { label: 'Stone', options: [['Travertine', null], ['White marble', '#e9e6e0'], ['Grey stone', '#8d8b86'], ['Black marble', '#2f2e2e'], ['Terracotta', '#a9674a']] },
  metal: { label: 'Metal', options: [['Brushed brass', null], ['Bronze', '#6b4a2e'], ['Copper', '#b06a4a'], ['Nickel', '#b9b9b6'], ['Blackened steel', '#2b2b2c']] },
  curtains: { label: 'Curtains', options: [['Sheer linen', null], ['White', '#f4f1ea'], ['Sand', '#cdb99a'], ['Sage', '#9aa58c'], ['Charcoal', '#4a4a4c']] },
  sofa1: { label: 'Curved sofa', options: [['Olive velvet', null], ['Oatmeal linen', '#cfc3ad'], ['Rust', '#a4563a'], ['Ink blue', '#34425a'], ['Charcoal', '#3f3f41'], ['Blush', '#c9a394']] },
  sofa2: { label: 'Second sofa', options: [['Cream boucle', null], ['Stone', '#a9a297'], ['Caramel', '#a9794f'], ['Olive', '#5d6650'], ['Charcoal', '#434345']] },
  rug: { label: 'Rug', options: [['Natural wool', null], ['Ivory', '#e6dfd0'], ['Clay', '#a9806a'], ['Moss', '#6b7257'], ['Graphite', '#4b4a49']] },
  splash: { label: 'Splashback', options: [['Olive stone', null], ['White marble', '#e9e6e0'], ['Grey stone', '#8d8b86'], ['Terracotta', '#a9674a'], ['Charcoal', '#3d3d3f']] },
  stools: { label: 'Stools', options: [['Cream leather', null], ['Caramel', '#a9794f'], ['Olive', '#5d6650'], ['Rust', '#a4563a'], ['Charcoal', '#434345']] },
  bedding: { label: 'Bed linen', options: [['White linen', null], ['Oatmeal', '#cfc3ad'], ['Sage', '#a8b09b'], ['Blush', '#d3b3a6'], ['Slate', '#6f757c']] },
  throw: { label: 'Throw', options: [['Olive', null], ['Rust', '#a4563a'], ['Ink blue', '#34425a'], ['Caramel', '#a9794f'], ['Charcoal', '#3f3f41']] },
  towels: { label: 'Towels', options: [['Olive', null], ['White', '#f4f1ea'], ['Sand', '#cdb99a'], ['Rust', '#a4563a'], ['Charcoal', '#3d3d3f']] },
};

// Whole-home themes set many surface types at once, in every room.
const THEMES = {
  'Olive and walnut': {},
  'Sand and oak': { walls: '#cdb99a', floor: '#c9a67c', timber: '#b08d62', stone: '#e9e6e0', metal: '#b9b9b6', curtains: '#f4f1ea', sofa1: '#cfc3ad', rug: '#e6dfd0', splash: '#e9e6e0', throw: '#a9794f', towels: '#cdb99a' },
  'Charcoal and stone': { walls: '#3d3d3f', floor: '#8d8b86', timber: '#2a2523', stone: '#2f2e2e', metal: '#2b2b2c', sofa1: '#3f3f41', sofa2: '#a9a297', rug: '#4b4a49', splash: '#8d8b86', stools: '#434345', bedding: '#6f757c', throw: '#3f3f41', towels: '#3d3d3f' },
  'Clay and oak': { walls: '#b98b6e', floor: '#b0834f', timber: '#b08d62', stone: '#a9674a', metal: '#b06a4a', sofa1: '#a4563a', sofa2: '#a9794f', rug: '#a9806a', splash: '#a9674a', stools: '#a4563a', throw: '#a4563a', towels: '#a4563a' },
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

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
  return ctx.getImageData(0, 0, w, h).data;
}

export async function initCustomiser() {
  const root = document.querySelector('[data-customiser]');
  if (!root) return null;
  const view = root.querySelector('.cfg__view');
  const original = root.querySelector('.cfg__original');
  const panel = root.querySelector('.lsc');
  const list = root.querySelector('.lsc__list');
  const crumb = root.querySelector('.lsc__crumb');
  const counter = root.querySelector('.lsc__count');
  const note = root.querySelector('.lsc__desc');
  const base = root.dataset.customiser; // folder holding one sub-folder per room
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const chosen = {}; // surface type -> hex (absent = as photographed)
  let preview = null; // finishes being tried out but not yet applied: { key: hex | null }
  const loaded = {}; // room id -> { meta, src, masks, canvas, ctx, out }
  let room = null;
  let focusKey = null; // the surface the camera is on; everything else is dimmed
  let comparing = false;
  // Rooms that are built up from empty: what has been placed in each, the option being
  // tried out, and the group the camera is on.
  const placed = {}; // room id -> { group id -> option id }
  let previewItem = null; // { group, option } (option null = none)
  let focusGroup = null;
  const placedIn = (r) => (placed[r.id] ??= {});
  const optionOf = (r, group) => (r === room && previewItem?.group === group.id ? previewItem.option : placedIn(r)[group.id]) ?? null;

  const finishOf = (key) => (preview && key in preview ? preview[key] : chosen[key]) ?? null;
  const nameOf = (key, hex) => FINISHES[key].options.find((o) => o[1] === (hex ?? null))?.[0] ?? 'Custom';
  const roomConfig = () => ROOMS.find((x) => x.id === room.id);
  const labelFor = (key) => roomConfig().labels[key] ?? FINISHES[key].label;

  /* ---------- camera ---------- */

  // A zoom level and the point it is centred on (0 to 1 across the picture), plus a
  // slight drift with the cursor while the whole room is shown. The point is placed in
  // the middle of the part of the screen the menu leaves free.
  const cam = { zoom: 1, x: 0.5, y: 0.5, driftX: 0, driftY: 0 };
  cam.w = 0.3; // size of the thing being looked at, as a share of the picture
  cam.h = 0.3;
  // The part of the screen the menu leaves free: its centre (relative to the middle of
  // the screen) and its size, all as shares of the screen.
  function freeArea() {
    const box = root.getBoundingClientRect();
    const menu = panel.getBoundingClientRect();
    if (menu.width < box.width * 0.7) {
      const left = menu.right - box.left; // menu at the side
      return { cx: (left + box.width) / 2 / box.width - 0.5, cy: 0, w: (box.width - left) / box.width, h: 1 };
    }
    const top = menu.top - box.top; // menu along the bottom
    return { cx: 0, cy: top / 2 / box.height - 0.5, w: 1, h: top / box.height };
  }
  function applyCamera() {
    if (cam.zoom > 1.01) {
      const box = root.getBoundingClientRect();
      const free = freeArea();
      // The picture covers the screen (object-fit: cover), so work in screen pixels.
      const pictureRatio = room.meta.width / room.meta.height;
      const cover = Math.max(box.width / pictureRatio, box.height);
      const pw = cover * pictureRatio;
      const ph = cover;
      // Zoom until the thing fills about two thirds of the free area, within limits.
      const z = Math.max(1.5, Math.min(3, Math.min((free.w * box.width * 0.68) / (cam.w * pw), (free.h * box.height * 0.68) / (cam.h * ph))));
      cam.zoom = z;
      // Move the thing's centre to the centre of the free area, without showing an edge.
      const want = (c, size, screen, centre) => {
        const offset = (0.5 - c) * size * z + centre * screen;
        const limit = (size * z - screen) / 2;
        return Math.max(-limit, Math.min(limit, offset));
      };
      const tx = want(cam.x, pw, box.width, free.cx);
      const ty = want(cam.y, ph, box.height, free.cy);
      view.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${z.toFixed(3)})`;
      // Only the room on show may be visible while the camera is in close.
      root.classList.add('is-close');
    } else {
      view.style.transform = `scale(1.035) translate(${(-cam.driftX * 1.4).toFixed(2)}%, ${(-cam.driftY * 1.4).toFixed(2)}%)`;
      root.classList.remove('is-close');
    }
    root.classList.toggle('is-zoomed', cam.zoom > 1.01);
  }
  function focusOn(key) {
    focusKey = key;
    focusGroup = null;
    const focus = key && room.meta.focus?.[key];
    if (focus) {
      [cam.x, cam.y, cam.w, cam.h] = focus;
      cam.zoom = 2; // any value above 1: the real zoom is worked out from the screen
    } else cam.zoom = 1;
    applyCamera();
    requestRender();
  }

  function focusOnThing(group, box) {
    focusKey = null;
    focusGroup = group;
    [cam.x, cam.y, cam.w, cam.h] = box;
    cam.zoom = 2;
    applyCamera();
    requestRender();
  }

  /* ---------- rooms ---------- */

  async function loadRoom(id) {
    if (loaded[id]) return loaded[id];
    const dir = `${base}/${id}`;
    const meta = await fetch(`${dir}/meta.json?v=${__ASSET_VERSION__}`).then((r) => r.json());
    const sheets = Math.ceil(meta.surfaces.length / 3);
    const [baseImg, ...maskImgs] = await Promise.all([
      loadImage(`${dir}/base.webp?v=${__ASSET_VERSION__}`),
      ...Array.from({ length: sheets }, (_, i) => loadImage(`${dir}/masks-${i}.webp?v=${__ASSET_VERSION__}`)),
    ]);
    const canvas = document.createElement('canvas');
    canvas.className = 'cfg__canvas';
    canvas.width = meta.width;
    canvas.height = meta.height;
    view.insertBefore(canvas, original);
    const ctx = canvas.getContext('2d');
    const data = {
      id,
      meta,
      canvas,
      ctx,
      src: pixels(baseImg, meta.width, meta.height),
      masks: maskImgs.map((img) => pixels(img, meta.width, meta.height)),
      out: ctx.createImageData(meta.width, meta.height),
      baseUrl: `${dir}/${meta.build ? 'studio' : 'base'}.webp?v=${__ASSET_VERSION__}`,
      dir,
      layers: {}, // option id -> image, for rooms that are built up from empty
      mattes: {}, // option id -> the thing's outline
    };
    if (meta.build) {
      // Working canvases: the room with things placed (before recolouring), the outlines of
      // those things, and a cut-out of the thing the camera is on.
      const sheet = () => {
        const c = document.createElement('canvas');
        c.width = meta.width;
        c.height = meta.height;
        return [c, c.getContext('2d', { willReadFrequently: true })];
      };
      [data.placedCanvas, data.placedCtx] = sheet();
      [data.matteCanvas, data.matteCtx] = sheet();
      [data.cutCanvas, data.cutCtx] = sheet();
      data.baseImg = baseImg;
      // Fetch the layers quietly so that trying an option is instant.
      for (const group of meta.groups) for (const option of group.options) layerOf(data, option.id);
    }
    // Tapping a part of the room opens that part's finishes.
    canvas.addEventListener('click', (event) => {
      const group = groupAt(data, event);
      if (group) return openGroup(group);
      const index = surfaceAt(data, event);
      if (index >= 0) openSurface(data.meta.surfaces[index]);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') canvas.style.cursor = surfaceAt(data, event) >= 0 ? 'zoom-in' : 'default';
    });
    loaded[id] = data;
    return data;
  }

  // A placed thing's picture, loaded on first use.
  function layerOf(r, id) {
    if (!r.layers[id]) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => r === room && requestRender();
      img.src = `${r.dir}/${id}.webp?v=${__ASSET_VERSION__}`;
      r.layers[id] = img;
      // Its outline, used to keep the thing's own colour when the surfaces are recoloured.
      const matte = new Image();
      matte.decoding = 'async';
      matte.onload = () => r === room && requestRender();
      matte.src = `${r.dir}/${id}-p.webp?v=${__ASSET_VERSION__}`;
      r.mattes[id] = matte;
    }
    return r.layers[id];
  }

  // Which placed thing is under the pointer, if any (topmost first).
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext('2d', { willReadFrequently: true });
  function groupAt(r, event) {
    if (!r.meta.build) return null;
    const box = r.canvas.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * r.meta.width;
    const y = ((event.clientY - box.top) / box.height) * r.meta.height;
    for (const group of [...r.meta.groups].sort((a, b) => b.z - a.z)) {
      const id = placedIn(r)[group.id];
      const img = id && r.layers[id];
      if (!img?.complete || !img.naturalWidth) continue;
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.drawImage(img, -x, -y, r.meta.width, r.meta.height);
      if (probeCtx.getImageData(0, 0, 1, 1).data[3] > 150) return group;
    }
    return null;
  }

  // Strength (0 to 255) of surface i at byte offset p: three surfaces per sheet, in R, G, B.
  const maskAt = (r, i, p) => r.masks[(i / 3) | 0][p + (i % 3)];

  function render(r = room) {
    const { meta, out } = r;
    const count = meta.surfaces.length;
    const gains = meta.surfaces.map((key) => {
      const hex = finishOf(key);
      if (!hex) return null;
      const target = hexToRgb(hex);
      const avg = meta.average[key];
      const even = lum(target) / lum(avg);
      // Mostly a per-channel tint, eased toward a plain brightness change so the warmth
      // of the room's light survives. The more a dark surface is lightened, the more the
      // tint gives way, and the gain is capped so it does not turn noisy.
      const tint = even > 1.6 ? 0.55 : 0.8;
      return [0, 1, 2].map((k) => Math.min(3.2, (target[k] / avg[k]) * tint + even * (1 - tint)));
    });

    // In a room built up from empty, everything placed goes in first (with the light and
    // shadow it throws), and the surfaces are recoloured around it afterwards.
    let src = r.src;
    let protect = null;
    let litMatte = null;
    if (meta.build) {
      const w = meta.width;
      const h = meta.height;
      r.placedCtx.globalCompositeOperation = 'source-over';
      r.placedCtx.drawImage(r.baseImg, 0, 0, w, h);
      r.matteCtx.clearRect(0, 0, w, h);
      let any = false;
      for (const group of [...meta.groups].sort((a, b) => a.z - b.z)) {
        const id = optionOf(r, group);
        if (!id) continue;
        const img = layerOf(r, id);
        const matte = r.mattes[id];
        if (!img.complete || !img.naturalWidth || !matte?.complete || !matte.naturalWidth) continue;
        r.placedCtx.drawImage(img, 0, 0, w, h);
        r.matteCtx.drawImage(matte, 0, 0, w, h);
        any = true;
        if (r === room && focusGroup === group.id) litMatte = matte;
      }
      if (any) {
        src = r.placedCtx.getImageData(0, 0, w, h).data;
        protect = r.matteCtx.getImageData(0, 0, w, h).data;
      }
    }

    const spot = r === room && focusKey ? meta.surfaces.indexOf(focusKey) : -1;
    const data = out.data;
    for (let p = 0; p < src.length; p += 4) {
      let red = src[p];
      let green = src[p + 1];
      let blue = src[p + 2];
      const open = protect ? 1 - protect[p + 3] / 255 : 1; // 0 where something placed covers the surface
      if (open > 0.02) {
        for (let i = 0; i < count; i++) {
          const gain = gains[i];
          if (!gain) continue;
          const m = maskAt(r, i, p);
          if (m < 8) continue;
          const a = (m / 255) * open;
          red += (Math.min(255, src[p] * gain[0]) - src[p]) * a;
          green += (Math.min(255, src[p + 1] * gain[1]) - src[p + 1]) * a;
          blue += (Math.min(255, src[p + 2] * gain[2]) - src[p + 2]) * a;
        }
      }
      if (spot >= 0) {
        // Spotlight: everything that is not the chosen surface falls back into shadow.
        const keep = 0.34 + 0.66 * (maskAt(r, spot, p) / 255) * open;
        red *= keep;
        green *= keep;
        blue *= keep;
      }
      data[p] = red;
      data[p + 1] = green;
      data[p + 2] = blue;
      data[p + 3] = 255;
    }
    r.ctx.putImageData(out, 0, 0);

    if (litMatte) {
      // The camera is on one placed thing: cut it out of the finished picture, dim the
      // room, and set it back on top.
      const w = meta.width;
      const h = meta.height;
      r.cutCtx.globalCompositeOperation = 'source-over';
      r.cutCtx.clearRect(0, 0, w, h);
      r.cutCtx.drawImage(litMatte, 0, 0, w, h);
      r.cutCtx.globalCompositeOperation = 'source-in';
      r.cutCtx.drawImage(r.canvas, 0, 0);
      r.ctx.fillStyle = 'rgb(12 10 8 / 0.58)';
      r.ctx.fillRect(0, 0, w, h);
      r.ctx.drawImage(r.cutCanvas, 0, 0);
    }
  }

  // Redraw at most once per display frame, however fast the visitor moves through options.
  let pending = false;
  function requestRender() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render();
    });
  }

  // Which surface is under the pointer (the canvas fills its layer, however it is zoomed).
  function surfaceAt(r, event) {
    const box = r.canvas.getBoundingClientRect();
    const { width: W, height: H } = r.meta;
    const x = Math.floor(((event.clientX - box.left) / box.width) * W);
    const y = Math.floor(((event.clientY - box.top) / box.height) * H);
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    const p = (y * W + x) * 4;
    let best = -1;
    let strength = 90;
    for (let i = 0; i < r.meta.surfaces.length; i++) {
      const m = maskAt(r, i, p);
      if (m > strength) {
        strength = m;
        best = i;
      }
    }
    return best;
  }

  // Move to another room: the current view pushes forward and dissolves into the next,
  // which is already wearing every finish chosen so far.
  let switching = false;
  let wanted = null; // a room asked for while another change was still playing
  async function goTo(id) {
    if (room?.id === id) return;
    if (switching) {
      wanted = id;
      return;
    }
    switching = true;
    let next;
    try {
      next = await loadRoom(id);
    } catch {
      switching = false;
      return;
    }
    const previous = room;
    room = next;
    preview = null;
    previewItem = null;
    focusKey = null;
    focusGroup = null;
    cam.zoom = 1;
    setComparing(false);
    render(next);
    applyCamera();
    original.src = next.baseUrl;
    previous?.canvas.classList.remove('is-active');
    previous?.canvas.classList.add('is-leaving');
    next.canvas.classList.remove('is-leaving');
    next.canvas.classList.add('is-active');
    setTimeout(() => previous?.canvas.classList.remove('is-leaving'), 1300);
    showRoot();
    setTimeout(() => {
      switching = false;
      if (wanted && wanted !== room.id) goTo(wanted);
      wanted = null;
    }, 700);
  }

  // Scrolling moves through the rooms: the stretch of scroll after the film is divided
  // into one band per room.
  const section = root.closest('[data-film]');
  let filmEnd = 1;
  const bandOf = (progress) => Math.min(ROOMS.length - 1, Math.max(0, Math.floor(((progress - filmEnd) / (1 - filmEnd)) * ROOMS.length)));
  section?.addEventListener('film:progress', (event) => {
    filmEnd = event.detail.filmEnd;
    if (!room || event.detail.progress < filmEnd) return;
    goTo(ROOMS[bandOf(event.detail.progress)].id);
  });
  // Choosing a room scrolls to the middle of its band, so scroll and menu always agree.
  function scrollToRoom(index) {
    if (!section || filmEnd >= 1) return goTo(ROOMS[index].id);
    const progress = filmEnd + ((index + 0.5) / ROOMS.length) * (1 - filmEnd);
    const top = section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * progress;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo(0, top);
  }

  function setComparing(value) {
    comparing = value;
    original.style.opacity = value ? 1 : 0;
  }

  /* ---------- the menu ---------- */

  // A menu is a title and rows. A row has a label, an optional value shown at the right,
  // an optional colour chip, and what happens when it is highlighted, left, or selected.
  let rows = [];
  let menuBack = null; // what "back" does in the current menu (null at the top level)
  let samples = false; // the current menu is a board of sample tiles

  function draw(title, items, { back = null, focusIndex = 0 } = {}) {
    rows = items;
    menuBack = back;
    panel.classList.toggle('has-back', Boolean(back));
    // Finishes are laid out as a board of sample tiles; everything else is a list.
    samples = items.some((item) => item.chip || item.thumb !== undefined);
    list.classList.toggle('lsc__list--samples', samples);
    crumb.textContent = title;
    list.replaceChildren(
      ...items.map((item, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'none');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lsc__row';
        button.setAttribute('role', 'menuitem');
        if (item.current) button.setAttribute('aria-current', 'true');
        const chip = item.thumb
          ? `<i class="lsc__chip lsc__chip--photo" style="background-image: url('${item.thumb}')"></i>`
          : item.thumb === null
            ? '<i class="lsc__chip lsc__chip--none"></i>'
            : item.chip
              ? `<i class="lsc__chip" style="--c: ${item.chip}"></i>`
              : '';
        const value = item.value ? `<span class="lsc__value">${item.value}</span>` : '';
        const mark = item.current ? '<span class="lsc__tick" aria-hidden="true"></span>' : item.more ? '<span class="lsc__more" aria-hidden="true"></span>' : '';
        button.innerHTML = `${chip}<span class="lsc__label">${item.label}</span>${value}${mark}`;
        button.addEventListener('click', () => item.select?.());
        const over = () => highlight(i, false);
        button.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && over());
        button.addEventListener('focus', over);
        if (item.stage) {
          const heading = document.createElement('p');
          heading.className = 'lsc__stage';
          heading.textContent = item.stage;
          li.append(heading);
        }
        li.append(button);
        return li;
      }),
    );
    highlight(Math.min(focusIndex, items.length - 1), false);
  }

  let current = 0;
  function highlight(index, moveFocus = true) {
    current = index;
    for (const [i, li] of [...list.children].entries()) li.lastChild.classList.toggle('is-current', i === index);
    counter.textContent = `${index + 1} / ${rows.length}`;
    note.textContent = rows[index]?.note ?? '';
    rows[index]?.over?.();
    const button = list.children[index]?.lastChild;
    if (moveFocus) button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest' });
  }

  function showRoot(focusIndex = 0) {
    preview = null;
    previewItem = null;
    if (focusKey || focusGroup) focusOn(null);
    const config = roomConfig();
    const build = room.meta.build;
    const groups = build ? room.meta.groups : [];
    const stageRows = (stage) =>
      groups
        .filter((group) => group.stage === stage)
        .map((group, i) => ({
          stage: i === 0 ? (stage === 2 ? '02  Fixtures and fittings' : '03  Furniture and styling') : null,
          label: group.label,
          value: group.options.find((o) => o.id === placedIn(room)[group.id])?.label ?? 'Not chosen',
          more: true,
          note: 'Select to see the options and place one in the room.',
          select: () => openGroup(group),
        }));
    const done = groups.filter((group) => placedIn(room)[group.id]).length;
    draw(config.label === 'Living' ? 'Living room' : config.label, [
      { label: 'Room', value: config.label, more: true, note: 'Move to another room. Scrolling also takes you through them.', select: () => showRooms() },
      ...room.meta.surfaces.map((key, i) => ({
        stage: build && i === 0 ? '01  Surface selections' : null,
        label: labelFor(key),
        value: nameOf(key, chosen[key]),
        more: true,
        note: 'Select to look closer and choose a finish.',
        select: () => openSurface(key),
      })),
      ...stageRows(2),
      ...stageRows(3),
      { stage: build ? `${done} of ${groups.length} placed` : null, label: 'Themes', more: true, note: 'Set every surface in the home at once.', select: () => showThemes() },
      {
        label: build ? 'The studio\u2019s version' : 'Compare',
        value: comparing ? (build ? 'Showing' : 'Original') : build ? '' : 'Yours',
        note: build ? 'See how the studio finished this room, then switch back to yours.' : 'Switch between the room as designed and your version.',
        select: () => {
          setComparing(!comparing);
          showRoot(current);
        },
      },
      {
        label: build ? 'Start again' : 'Reset',
        note: build ? 'Empty this room and return its surfaces to the original.' : 'Return every surface to the original design.',
        select: () => {
          for (const key of Object.keys(FINISHES)) delete chosen[key];
          placed[room.id] = {};
          setComparing(false);
          requestRender();
          showRoot(current);
        },
      },
    ], { focusIndex });
    if (build && done === 0 && !Object.keys(chosen).length) note.textContent = 'An empty room. Begin with the surfaces, then place the fixtures.';
  }

  // The options for one kind of fixture or furniture: try them in the room, place one.
  function openGroup(group) {
    setComparing(false);
    const index = room.meta.surfaces.length + 1 + room.meta.groups.indexOf(group);
    const applied = placedIn(room)[group.id] ?? null;
    const look = (option) => focusOnThing(group.id, (option ?? group.options.find((o) => o.id === applied) ?? group.options[0]).focus);
    look(null);
    const items = [{ id: null, label: 'None', spec: 'Leave this out.' }, ...group.options].map((option) => ({
      label: option.label,
      thumb: option.id ? `${room.dir}/${option.id}-t.webp?v=${__ASSET_VERSION__}` : null,
      current: option.id === applied,
      note: option.spec,
      over: () => {
        previewItem = { group: group.id, option: option.id };
        if (option.id) look(option);
        requestRender();
      },
      select: () => {
        if (option.id) placedIn(room)[group.id] = option.id;
        else delete placedIn(room)[group.id];
        previewItem = null;
        requestRender();
        openGroup(group);
      },
    }));
    draw(group.label, items, { back: () => showRoot(index), focusIndex: Math.max(0, items.findIndex((item, i) => (i ? group.options[i - 1].id : null) === applied)) });
  }

  function showRooms() {
    draw('Room', ROOMS.map((r, i) => ({
      label: r.label === 'Living' ? 'Living room' : r.label,
      current: r.id === room.id,
      note: r.id === room.id ? 'You are here.' : 'Select to go there.',
      select: () => {
        if (r.id === room.id) showRoot();
        else scrollToRoom(i);
      },
    })), { back: () => showRoot(0), focusIndex: ROOMS.findIndex((r) => r.id === room.id) });
  }

  function openSurface(key) {
    setComparing(false);
    focusOn(key);
    const index = room.meta.surfaces.indexOf(key);
    const avg = room.meta.average[key];
    const applied = chosen[key] ?? null;
    const options = FINISHES[key].options;
    draw(labelFor(key), options.map(([name, hex]) => ({
      label: name,
      chip: hex ?? `rgb(${avg.join(' ')})`,
      current: hex === applied,
      note: hex === applied ? 'Applied.' : hex ? 'Previewing. Select to apply.' : 'The original design. Select to apply.',
      over: () => {
        preview = { [key]: hex };
        requestRender();
      },
      select: () => {
        if (hex) chosen[key] = hex;
        else delete chosen[key];
        preview = null;
        requestRender();
        openSurface(key); // redraw the list with the new tick, staying on this surface
      },
    })), { back: () => showRoot(index + 1), focusIndex: Math.max(0, options.findIndex((o) => o[1] === (preview && key in preview ? preview[key] : applied))) });
  }

  function showThemes() {
    draw('Themes', Object.entries(THEMES).map(([name, set]) => ({
      label: name,
      note: 'Previewing in this room. Select to apply to the whole home.',
      over: () => {
        preview = Object.fromEntries(Object.keys(FINISHES).map((k) => [k, set[k] ?? null]));
        requestRender();
      },
      select: () => {
        for (const key of Object.keys(FINISHES)) delete chosen[key];
        Object.assign(chosen, set);
        preview = null;
        requestRender();
        showRoot(room.meta.surfaces.length + 1);
      },
    })), { back: () => showRoot(room.meta.surfaces.length + 1) });
  }

  root.querySelector('[data-back]')?.addEventListener('click', () => menuBack?.());

  // Keys, while the menu has focus: up and down move, Enter selects (it is a button), and
  // Escape, Backspace or the left arrow go back.
  panel.addEventListener('keydown', (event) => {
    const move = (by) => {
      event.preventDefault();
      highlight(Math.max(0, Math.min(rows.length - 1, current + by)));
    };
    if (samples) {
      // A board of tiles: arrows move across and down it.
      const columns = Math.max(1, Math.round(list.clientWidth / (list.children[0]?.offsetWidth || list.clientWidth)));
      if (event.key === 'ArrowRight') return move(1);
      if (event.key === 'ArrowLeft') return move(-1);
      if (event.key === 'ArrowDown') return move(columns);
      if (event.key === 'ArrowUp') return move(-columns);
    } else {
      if (event.key === 'ArrowDown') return move(current === rows.length - 1 ? -current : 1);
      if (event.key === 'ArrowUp') return move(current === 0 ? rows.length - 1 : -1);
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        return rows[current]?.select?.();
      }
    }
    if ((event.key === 'Escape' || event.key === 'Backspace' || (!samples && event.key === 'ArrowLeft')) && menuBack) {
      event.preventDefault();
      menuBack();
      list.children[current]?.lastChild.focus({ preventScroll: true });
    }
  });
  // Leaving the menu drops any finish that was only being previewed.
  panel.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || (!preview && !previewItem)) return;
    preview = null;
    previewItem = null;
    requestRender();
  });

  // A slight drift with the cursor gives the wide view some depth. Mouse only.
  if (finePointer && !reducedMotion) {
    root.addEventListener('pointermove', (event) => {
      const box = root.getBoundingClientRect();
      cam.driftX = (event.clientX - box.left) / box.width - 0.5;
      cam.driftY = (event.clientY - box.top) / box.height - 0.5;
      if (cam.zoom <= 1.01) applyCamera();
    });
  }
  window.addEventListener('resize', applyCamera);

  await goTo('living');
  applyCamera();
  root.classList.add('is-ready');

  // Prepare the other rooms shortly before they are needed, one at a time and in idle
  // moments, so the work never interrupts the film above.
  let preparing = false;
  const idle = window.requestIdleCallback ? (fn) => window.requestIdleCallback(fn, { timeout: 1500 }) : (fn) => setTimeout(fn, 300);
  function prepareRest() {
    if (preparing) return;
    preparing = true;
    const rest = ROOMS.slice(1).map((r) => r.id);
    const nextOne = () => {
      const id = rest.shift();
      if (!id) return;
      idle(() => loadRoom(id).catch(() => {}).then(nextOne));
    };
    nextOne();
  }
  section?.addEventListener('film:progress', (event) => {
    if (event.detail.progress > event.detail.filmEnd * 0.82) prepareRest();
  });
  return { root, chosen };
}
