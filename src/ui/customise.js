// Interactive rooms: tap a surface in the photograph and choose its colour or material
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
  const roomNav = root.querySelector('.cfg__rooms');
  const tabs = root.querySelector('.cfg__tabs');
  const swatches = root.querySelector('.cfg__swatches');
  const themes = root.querySelector('.cfg__themes');
  const divider = root.querySelector('.cfg__divider');
  const handle = root.querySelector('.cfg__handle');
  const hint = root.querySelector('.cfg__hint');
  const zoomButton = root.querySelector('[data-zoom]');
  const base = root.dataset.customiser; // folder holding one sub-folder per room
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const chosen = {}; // surface type -> hex (absent = as photographed)
  const loaded = {}; // room id -> { meta, src, masks, canvas, ctx, out }
  let room = null;
  let active = 0;
  let highlight = -1;

  // The camera: a zoom level and the point it is centred on (0 to 1 across the picture),
  // plus a slight drift with the cursor while the whole room is shown.
  const cam = { zoom: 1, x: 0.5, y: 0.5, driftX: 0, driftY: 0 };
  function applyCamera() {
    const z = cam.zoom;
    if (z > 1.01) {
      // keep the picture's edges outside the frame
      const limit = ((z - 1) / (2 * z)) * 100;
      const tx = Math.max(-limit, Math.min(limit, (0.5 - cam.x) * 100));
      const ty = Math.max(-limit, Math.min(limit, (0.5 - cam.y) * 100));
      view.style.transform = `scale(${z}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`;
    } else {
      view.style.transform = `scale(1.035) translate(${(-cam.driftX * 1.4).toFixed(2)}%, ${(-cam.driftY * 1.4).toFixed(2)}%)`;
    }
    root.classList.toggle('is-zoomed', z > 1.01);
    if (zoomButton) {
      zoomButton.textContent = z > 1.01 ? 'Whole room' : 'Look closer';
      zoomButton.setAttribute('aria-pressed', String(z > 1.01));
    }
  }
  function zoomTo(key) {
    const focus = room.meta.focus?.[key];
    if (!focus) return;
    [cam.x, cam.y, cam.zoom] = focus;
    applyCamera();
  }
  function zoomOut() {
    cam.zoom = 1;
    applyCamera();
  }

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
      baseUrl: `${dir}/base.webp?v=${__ASSET_VERSION__}`,
    };
    canvas.addEventListener('click', (event) => {
      const index = surfaceAt(data, event);
      if (index >= 0) select(index, true);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') canvas.style.cursor = surfaceAt(data, event) >= 0 ? 'zoom-in' : 'default';
    });
    loaded[id] = data;
    return data;
  }

  // Strength (0 to 255) of surface i at byte offset p: three surfaces per sheet, in R, G, B.
  const maskAt = (r, i, p) => r.masks[(i / 3) | 0][p + (i % 3)];

  function render(r = room) {
    const { meta, src, out } = r;
    const count = meta.surfaces.length;
    const gains = meta.surfaces.map((key) => {
      const hex = chosen[key];
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
    const data = out.data;
    const flash = r === room ? highlight : -1;
    for (let p = 0; p < src.length; p += 4) {
      let red = src[p];
      let green = src[p + 1];
      let blue = src[p + 2];
      for (let i = 0; i < count; i++) {
        const m = maskAt(r, i, p);
        if (m < 8) continue;
        const a = m / 255;
        const gain = gains[i];
        if (gain) {
          red += (Math.min(255, src[p] * gain[0]) - src[p]) * a;
          green += (Math.min(255, src[p + 1] * gain[1]) - src[p + 1]) * a;
          blue += (Math.min(255, src[p + 2] * gain[2]) - src[p + 2]) * a;
        }
        if (i === flash) {
          red += (255 - red) * 0.14 * a;
          green += (255 - green) * 0.14 * a;
          blue += (255 - blue) * 0.14 * a;
        }
      }
      data[p] = red;
      data[p + 1] = green;
      data[p + 2] = blue;
      data[p + 3] = 255;
    }
    r.ctx.putImageData(out, 0, 0);
  }

  const roomConfig = () => ROOMS.find((x) => x.id === room.id);
  const labelFor = (key) => roomConfig().labels[key] ?? FINISHES[key].label;

  function drawSwatches() {
    const key = room.meta.surfaces[active];
    const avg = room.meta.average[key];
    swatches.replaceChildren(
      ...FINISHES[key].options.map(([name, hex]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cfg__swatch';
        button.setAttribute('aria-pressed', String((chosen[key] ?? null) === hex));
        button.innerHTML = `<i style="--c: ${hex ?? `rgb(${avg.join(' ')})`}"></i><span>${name}</span>`;
        button.addEventListener('click', () => {
          if (hex) chosen[key] = hex;
          else delete chosen[key];
          hint?.classList.add('is-used');
          render();
          drawSwatches();
        });
        return button;
      }),
    );
    for (const [i, tab] of [...tabs.children].entries()) tab.setAttribute('aria-selected', String(i === active));
  }

  function drawTabs() {
    tabs.replaceChildren(
      ...room.meta.surfaces.map((key, i) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'cfg__tab';
        tab.setAttribute('role', 'tab');
        tab.textContent = labelFor(key);
        tab.addEventListener('click', () => select(i, true));
        return tab;
      }),
    );
  }

  // Choose a surface. With `closer`, the camera pushes in on it so its detail can be seen
  // (the move itself shows which surface was picked, so nothing needs redrawing).
  function select(index, closer = false) {
    active = index;
    drawSwatches();
    const tab = tabs.children[index];
    if (tab) tabs.scrollTo({ left: tab.offsetLeft - 16, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (closer) zoomTo(room.meta.surfaces[index]);
  }

  // Which surface is under the pointer (the canvas is drawn with object-fit: cover).
  function surfaceAt(r, event) {
    const box = r.canvas.getBoundingClientRect();
    const { width: W, height: H } = r.meta;
    const scale = Math.max(box.width / W, box.height / H);
    const x = Math.floor((event.clientX - box.left - (box.width - W * scale) / 2) / scale);
    const y = Math.floor((event.clientY - box.top - (box.height - H * scale) / 2) / scale);
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
    const button = roomNav.querySelector(`[data-room="${id}"]`);
    button?.classList.add('is-loading');
    let next;
    try {
      next = await loadRoom(id);
    } catch {
      button?.classList.remove('is-loading');
      switching = false;
      return;
    }
    button?.classList.remove('is-loading');
    render(next);
    const previous = room;
    room = next;
    active = 0;
    highlight = -1;
    setSplit(0);
    zoomOut();
    original.src = next.baseUrl;
    previous?.canvas.classList.remove('is-active');
    previous?.canvas.classList.add('is-leaving');
    next.canvas.classList.remove('is-leaving');
    next.canvas.classList.add('is-active');
    setTimeout(() => previous?.canvas.classList.remove('is-leaving'), 1300);
    for (const b of roomNav.children) b.setAttribute('aria-pressed', String(b.dataset.room === id));
    drawTabs();
    drawSwatches();
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
  // A room button scrolls to the middle of that room's band, so scroll and buttons agree.
  function scrollToRoom(index) {
    if (!section || filmEnd >= 1) return goTo(ROOMS[index].id);
    const progress = filmEnd + ((index + 0.5) / ROOMS.length) * (1 - filmEnd);
    const top = section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * progress;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo(0, top);
  }

  roomNav.replaceChildren(
    ...ROOMS.map((r) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cfg__room';
      button.dataset.room = r.id;
      button.textContent = r.label;
      button.addEventListener('click', () => scrollToRoom(ROOMS.indexOf(r)));
      return button;
    }),
  );

  themes.replaceChildren(
    ...Object.entries(THEMES).map(([name, set]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cfg__theme';
      button.textContent = name;
      button.addEventListener('click', () => {
        for (const key of Object.keys(FINISHES)) delete chosen[key];
        Object.assign(chosen, set);
        hint?.classList.add('is-used');
        zoomOut();
        render();
        drawSwatches();
      });
      return button;
    }),
  );

  zoomButton?.addEventListener('click', () => {
    if (cam.zoom > 1.01) zoomOut();
    else zoomTo(room.meta.surfaces[active]);
  });

  // Compare: drag the handle to reveal the room as photographed on the left.
  let split = 0;
  function setSplit(value) {
    split = Math.max(0, Math.min(1, value));
    original.style.clipPath = `inset(0 ${(1 - split) * 100}% 0 0)`;
    divider.style.left = `${split * 100}%`;
    handle.style.left = `${split * 100}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(split * 100)));
  }
  let dragging = false;
  handle.addEventListener('pointerdown', (event) => {
    dragging = true;
    zoomOut(); // the comparison is of the whole room
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
    for (const key of Object.keys(FINISHES)) delete chosen[key];
    zoomOut();
    render();
    drawSwatches();
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
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && cam.zoom > 1.01) zoomOut();
  });

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
