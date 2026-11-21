import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scroll-driven film: real footage played frame by frame as the visitor scrolls.
// Frames are individual images so scrubbing is smooth in every browser (seeking inside
// a video file is not), and neighbouring frames are blended so slow moves stay fluid.
//
// Markup: <section class="film" data-film="/film/walk" data-frames="120">, containing
// a .film__canvas and any number of captions with data-from / data-to (0 to 1 of the
// section's scroll) that fade in and out.
// Frame sets: d = 1280 x 720, m = 720 x 405, p = 540 x 960 (the centre of the picture,
// for portrait phones, so the footage is not enlarged until it goes soft).
const SETS = ['d', 'm', 'p'];
const CAPTION_FADE = 0.025;
const FLOAT_FADE = 0.05; // floating text takes longer to arrive and leave
const drift = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const portrait = window.innerWidth / window.innerHeight < 0.8;
  const wide = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 900;
  const set = portrait ? 'p' : wide ? 'd' : 'm';
  const url = (i) => `${section.dataset.film}/${set}/f-${pad(first + i)}.webp`;
  const frames = new Array(count);
  let progress = 0;
  let drawnKey = '';
  let started = false;

  function nearest(index) {
    for (let d = 0; d < count; d++) {
      if (frames[index - d]?.ready) return index - d;
      if (frames[index + d]?.ready) return index + d;
    }
    return -1;
  }

  function paint(img, alpha) {
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  function draw() {
    const position = clamp01(progress / filmEnd) * (count - 1);
    const a = Math.floor(position);
    const b = Math.min(a + 1, count - 1);
    const mixAmount = Math.round((position - a) * 20) / 20;
    if (frames[a]?.ready && frames[b]?.ready) {
      const key = `${a}:${mixAmount}`;
      if (key === drawnKey) return;
      drawnKey = key;
      paint(frames[a].img, 1);
      if (mixAmount > 0) paint(frames[b].img, mixAmount);
    } else {
      // not everything has loaded yet: show the closest frame that has
      const index = nearest(Math.round(position));
      if (index < 0 || `n${index}` === drawnKey) return;
      drawnKey = `n${index}`;
      paint(frames[index].img, 1);
    }
    ctx.globalAlpha = 1;
    canvas.classList.add('is-ready');
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    drawnKey = '';
    draw();
  }

  function load(i) {
    if (frames[i]) return;
    const img = new Image();
    img.decoding = 'async';
    frames[i] = { img, ready: false };
    img.onload = () => {
      frames[i].ready = true;
      drawnKey = '';
      draw();
    };
    img.src = url(i);
  }

  // A coarse pass first so scrubbing works early, then the frames in between.
  function loadAll() {
    if (started) return;
    started = true;
    const order = [];
    for (const step of [8, 4, 2, 1]) for (let i = 0; i < count; i += step) if (!order.includes(i)) order.push(i);
    let next = 0;
    const pump = () => {
      for (let n = 0; n < 6 && next < order.length; n++) load(order[next++]);
      if (next < order.length) setTimeout(pump, 100);
    };
    pump();
  }

  function apply() {
    draw();
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
    // Past the film's end the section holds on its last frame; anything layered there can open.
    section.classList.toggle('is-film-done', progress >= filmEnd - 0.004);
    section.dispatchEvent(new CustomEvent('film:progress', { detail: { progress, filmEnd } }));
    if (rail) rail.style.transform = `scaleY(${clamp01(progress / filmEnd)})`;
  }

  // The hero film starts loading at once; a film further down waits until it is near.
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
      { rootMargin: '150% 0px' },
    );
    near.observe(section);
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      progress = self.progress;
      apply();
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
