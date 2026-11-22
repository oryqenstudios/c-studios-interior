import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scroll-driven film: real footage played frame by frame as the visitor scrolls.
// Frames are individual images (seeking inside a video file is jerky in several
// browsers). Three things keep it smooth:
//   - the film eases toward the scroll position instead of jumping to it,
//   - neighbouring frames are blended, so slow scrolling glides between them (two stacked
//     canvases; the blend is an opacity change, so no canvas is redrawn every frame),
//   - frames near the visitor are held as bitmaps already scaled to the screen,
//   - frames are decoded before they are used, and the ones near the visitor's current
//     position are fetched first.
//
// Markup: <section class="film" data-film="/film/plan" data-frames="325">, containing a
// .film__canvas and any number of captions with data-from / data-to (0 to 1 of the
// section's scroll) that fade in and out.
// Frame sets: d = 1920 x 1080, m = 960 x 540, p = 608 x 1080 (the middle of the picture,
// for portrait phones, so the footage is not enlarged until it goes soft).
const SETS = ['d', 'm', 'p'];
const CAPTION_FADE = 0.025;
const FLOAT_FADE = 0.05; // floating text takes longer to arrive and leave
const EASE_PER_SECOND = 9; // how quickly the film catches up with the scroll position
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const drift = !reducedMotion;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const pad = (n) => String(n).padStart(3, '0');

function initFilm(section) {
  const canvas = section.querySelector('.film__canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const count = Number(section.dataset.frames);
  const first = Number(section.dataset.first || 0); // index of this section's first frame within the folder
  const filmEnd = Number(section.dataset.end || 0.94); // the last frame holds after this
  const scrim = section.querySelector('.film__scrim');
  const rail = section.querySelector('.film__rail-bar');
  const captions = [...section.querySelectorAll('[data-from]')].map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
  }));

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const portrait = window.innerWidth / window.innerHeight < 0.8;
  const set = portrait ? 'p' : window.innerWidth * ratio > 1100 ? 'd' : 'm';
  const url = (i) => `${section.dataset.film}/${set}/f-${pad(first + i)}.webp?v=${__ASSET_VERSION__}`;
  const frames = new Array(count);
  let target = 0; // where the scroll says the film should be
  let progress = 0; // where the film is, easing toward the target
  let drawnKey = -1; // the upper canvas's opacity as last set
  let started = false;

  const positionOf = (p) => clamp01(p / filmEnd) * (count - 1);

  function nearest(index) {
    for (let d = 0; d < count; d++) {
      if (frames[index - d]?.ready) return index - d;
      if (frames[index + d]?.ready) return index + d;
    }
    return -1;
  }

  // Two stacked canvases: even frames are drawn on the lower one, odd frames on the upper,
  // and the blend between neighbouring frames is the upper canvas's opacity. A canvas is
  // redrawn only when its own frame changes (not on every display frame), and the blend
  // itself is done by the compositor, which costs nothing on the main thread.
  const upper = canvas.cloneNode(false);
  upper.style.transition = 'none';
  upper.style.opacity = 0;
  canvas.after(upper);
  const layers = [
    { el: canvas, ctx, shown: -1 },
    { el: upper, ctx: upper.getContext('2d'), shown: -1 },
  ];

  // Frames near the visitor are also kept as bitmaps already cut and scaled to the canvas,
  // so putting one on screen is a plain copy: no decoding and no resampling while scrolling.
  const KEEP_BEHIND = 6;
  const KEEP_AHEAD = 14;
  let generation = 0; // bumped when the canvas changes size, to drop bitmaps made for the old size
  function prepare(i) {
    const frame = frames[i];
    if (!frame?.ready || frame.bitmap || frame.preparing || !window.createImageBitmap) return;
    const { img } = frame;
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const sw = canvas.width / scale;
    const sh = canvas.height / scale;
    const made = generation;
    frame.preparing = true;
    createImageBitmap(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, { resizeWidth: canvas.width, resizeHeight: canvas.height, resizeQuality: 'high' })
      .then((bitmap) => {
        frame.preparing = false;
        if (made !== generation || Math.abs(i - Math.round(positionOf(progress))) > KEEP_AHEAD + 4) return bitmap.close();
        frame.bitmap = bitmap;
        for (const layer of layers) if (layer.shown === i) layer.shown = -1; // redraw it sharp
        draw();
      })
      .catch(() => {
        frame.preparing = false;
      });
  }
  let windowAt = -99;
  function keepWindow(here) {
    if (here === windowAt) return;
    windowAt = here;
    const ahead = target >= progress ? KEEP_AHEAD : KEEP_BEHIND;
    const behind = target >= progress ? KEEP_BEHIND : KEEP_AHEAD;
    for (let i = Math.max(0, here - behind); i <= Math.min(count - 1, here + ahead); i++) prepare(i);
    for (let i = 0; i < count; i++) {
      const frame = frames[i];
      if (frame?.bitmap && (i < here - behind - 3 || i > here + ahead + 3)) {
        frame.bitmap.close();
        frame.bitmap = null;
      }
    }
  }

  function paint(layer, index) {
    if (layer.shown === index) return;
    const frame = frames[index];
    if (frame.bitmap) layer.ctx.drawImage(frame.bitmap, 0, 0);
    else {
      const { img } = frame;
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      layer.ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
    layer.shown = index;
  }

  function draw() {
    const position = positionOf(progress);
    let a = Math.floor(position);
    let b = Math.min(a + 1, count - 1);
    let mixAmount = position - a;
    if (!(frames[a]?.ready && frames[b]?.ready)) {
      // not everything has loaded yet: show the closest frame that has
      a = nearest(Math.round(position));
      if (a < 0) return;
      b = a;
      mixAmount = 0;
    }
    keepWindow(Math.round(position));
    // the even frame goes on the lower canvas, the odd one on the upper
    const even = a % 2 === 0 ? a : b;
    const odd = a % 2 === 0 ? b : a;
    if (even % 2 === 0) paint(layers[0], even);
    if (odd % 2 === 1) paint(layers[1], odd);
    const upperOpacity = a === b ? (a % 2 === 1 ? 1 : 0) : a % 2 === 0 ? mixAmount : 1 - mixAmount;
    const rounded = Math.round(upperOpacity * 100) / 100;
    if (rounded !== drawnKey) {
      drawnKey = rounded;
      upper.style.opacity = rounded;
    }
    canvas.classList.add('is-ready');
  }

  function resize() {
    // Sharp on dense screens, but never larger than is useful for the footage.
    const width = Math.min(Math.round(canvas.clientWidth * ratio), 1920);
    const height = Math.round((width * canvas.clientHeight) / Math.max(1, canvas.clientWidth));
    if (width === canvas.width && height === canvas.height) return;
    generation++;
    for (const frame of frames) {
      if (frame?.bitmap) frame.bitmap.close();
      if (frame) frame.bitmap = null;
    }
    windowAt = -99;
    for (const layer of layers) {
      layer.el.width = width;
      layer.el.height = height;
      layer.ctx.imageSmoothingEnabled = true;
      layer.ctx.imageSmoothingQuality = 'high';
      layer.shown = -1;
    }
    draw();
  }

  function load(i) {
    if (i < 0 || i >= count || frames[i]) return;
    const img = new Image();
    img.decoding = 'async';
    const frame = { img, ready: false };
    frames[i] = frame;
    img.src = url(i);
    // Decode off the main thread before the frame is used, so drawing it never stalls.
    const done = () => {
      frame.ready = true;
      if (Math.abs(i - positionOf(progress)) < KEEP_AHEAD) {
        windowAt = -99;
        draw();
      }
    };
    if (img.decode) img.decode().then(done, () => (img.complete && img.naturalWidth ? done() : null));
    else img.onload = done;
  }

  // A coarse pass first so scrubbing works early, then the frames in between. Whatever
  // is just ahead of the visitor is always fetched before the rest.
  const order = [];
  for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!frames[i] && !order.includes(i)) order.push(i);
  let next = 0;
  function loadAll() {
    if (started) return;
    started = true;
    const pump = () => {
      const here = Math.round(positionOf(target));
      for (let i = here - 4; i <= here + 14; i++) load(i);
      for (let n = 0; n < 8 && next < order.length; n++) load(order[next++]);
      if (next < order.length) setTimeout(pump, 80);
    };
    pump();
  }

  function applyCaptions() {
    let strongest = 0;
    for (const { el, from, to } of captions) {
      // A caption that starts at 0 is already there on load; one that ends at 1 stays.
      const span = el.classList.contains('film__float') ? FLOAT_FADE : CAPTION_FADE;
      const fadeIn = from <= 0 ? 1 : clamp01((progress - from) / span);
      const fadeOut = to >= 1 ? 1 : clamp01((to - progress) / span);
      const opacity = Math.min(fadeIn, fadeOut);
      el.style.opacity = opacity;
      el.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      if (drift && el.classList.contains('film__float')) {
        // Floating text: rises into place as it arrives, keeps drifting gently upward
        // while it is on screen, and lifts away as it leaves.
        const life = clamp01((progress - from) / (to - from));
        const y = (1 - fadeIn) * 56 - (1 - fadeOut) * 40 - life * 14;
        el.style.setProperty('--float-y', `${y.toFixed(1)}px`);
      }
      // Travelling titles drift sideways across their time on screen, like signage passed on a walk.
      if (drift && el.classList.contains('film__title') && el.dataset.side) {
        const life = clamp01((progress - from) / (to - from)) - 0.5;
        const dir = el.dataset.side === 'left' ? -1 : 1;
        el.style.transform = `translate(${(dir * life * 6).toFixed(2)}vw, -50%)`;
      }
      if ('inert' in el && el.querySelector('a, button')) el.inert = opacity < 0.5;
      if (!el.classList.contains('film__tag')) strongest = Math.max(strongest, opacity);
    }
    if (scrim) scrim.style.opacity = strongest;
  }

  function apply() {
    draw();
    applyCaptions();
    // Past the film's end the section holds on its last frame; anything layered there can open.
    section.classList.toggle('is-film-done', progress >= filmEnd - 0.004);
    section.dispatchEvent(new CustomEvent('film:progress', { detail: { progress, filmEnd } }));
    if (rail) rail.style.transform = `scaleY(${clamp01(progress / filmEnd)})`;
  }

  // Ease the film toward the scroll position, one step per display frame, and stop when
  // it has arrived. With reduced motion it follows the scroll exactly.
  let running = false;
  let last = 0;
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const gap = target - progress;
    if (reducedMotion || Math.abs(gap) < 0.00015) progress = target;
    else progress += gap * (1 - Math.exp(-EASE_PER_SECOND * dt));
    apply();
    if (progress !== target) requestAnimationFrame(step);
    else running = false;
  }
  function follow() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }

  // The first film starts loading at once; one further down waits until it is near.
  load(0);
  if (section.getBoundingClientRect().top < window.innerHeight * 1.5) loadAll();
  else {
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadAll();
          near.disconnect();
        }
      },
      { rootMargin: '200% 0px' },
    );
    near.observe(section);
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      target = self.progress;
      follow();
    },
  });

  window.addEventListener('resize', resize);
  resize();
  apply();
  section.classList.add('is-live');
}

export function initFilms() {
  for (const section of document.querySelectorAll('[data-film]')) initFilm(section);
}

export { SETS as FILM_SETS };
