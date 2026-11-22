import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initFilms } from './ui/film.js';
import { initHeroVideo } from './ui/herovideo.js';
import { initMagnetic } from './ui/magnetic.js';
import { initForm } from './ui/form.js';
import { initLooks } from './ui/looks.js';
import { initFaq, initHeader, initReveals, initTilt, initWork } from './ui/sections.js';
import { initProcess } from './ui/process.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// Smooth scrolling, unless reduced motion is requested.
if (!reducedMotion) {
  const lenis = new Lenis({ anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  window.__lenis = lenis; // lets sections scroll the page smoothly
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
ScrollTrigger.config({ ignoreMobileResize: true });

initFilms();
const heroVideo = initHeroVideo({ reducedMotion });
initHeader();
initReveals({ reducedMotion });
initTilt({ reducedMotion });
initProcess({ reducedMotion });
initWork();
initFaq();
initForm();
initLooks().catch(() => {
  /* the room simply stays as the photograph if its assets fail to load */
});
initMagnetic({ reducedMotion });
for (const el of document.querySelectorAll('[data-year]')) el.textContent = new Date().getFullYear();

// The header gets a solid background once the films have scrolled away.
ScrollTrigger.create({
  trigger: '#build',
  start: 'bottom 96px',
  end: 'max',
  toggleClass: { targets: root, className: 'is-past-hero' },
});

// Thin brass line along the bottom edge: progress through the whole page.
const progressBar = document.querySelector('.progress__bar');
if (progressBar) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      progressBar.style.transform = `scaleX(${self.progress})`;
    },
  });
}

// Loader: show the mark briefly, then fade the page up. Never longer than two seconds.
const started = performance.now();
let cleared = false;
const clearLoader = () => {
  if (cleared) return;
  cleared = true;
  const wait = reducedMotion ? 0 : Math.max(0, 1200 - (performance.now() - started));
  setTimeout(() => {
    root.classList.remove('is-loading');
    heroVideo?.play(); // the hero clip starts as the page is revealed
  }, wait);
};
document.fonts.ready.then(clearLoader);
setTimeout(clearLoader, 1800);
