import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Header: hides while scrolling down, returns on the way up.
export function initHeader() {
  const root = document.documentElement;
  let last = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      root.classList.toggle('is-header-hidden', y > last && y > 120);
      last = y;
    },
    { passive: true },
  );
  // Keyboard users must always be able to see what they are focusing.
  document.querySelector('.site-header')?.addEventListener('focusin', () => root.classList.remove('is-header-hidden'));
}

// Reveals: elements with data-reveal ease in once, in sequence within their group.
export function initReveals({ reducedMotion }) {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (reducedMotion || !('IntersectionObserver' in window)) {
    for (const el of items) el.classList.add('is-in');
    return;
  }
  document.documentElement.classList.add('can-reveal');
  const seen = new Map();
  for (const el of items) {
    const group = el.parentElement;
    const index = seen.get(group) ?? 0;
    el.style.setProperty('--i', index);
    seen.set(group, index + 1);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -14% 0px' },
  );
  for (const el of items) observer.observe(el);
}

// Service cards: tilt toward the cursor and light the nearest edge. Mouse only.
export function initTilt({ reducedMotion }) {
  if (reducedMotion || !finePointer()) return;
  for (const card of document.querySelectorAll('[data-tilt]')) {
    // Wait for the rise-in to finish before the tilt takes over the transform.
    card.addEventListener('transitionend', () => card.classList.add('is-tilt-ready'), { once: true });
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.classList.remove('is-tilting');
    });
  }
}

// Material moods: three palettes of one room, by day and by night.
export function initMoods() {
  const stage = document.querySelector('.moods__stage');
  if (!stage) return;
  const images = [...stage.querySelectorAll('[data-mood-img]')];
  const palettes = [...document.querySelectorAll('.palette[data-mood]')];
  const toggle = document.querySelector('.moods .daynight');
  let mood = 'olive';
  let night = false;

  function show() {
    const key = `${mood}-${night ? 'night' : 'day'}`;
    for (const img of images) {
      const on = img.dataset.moodImg === key;
      if (on) img.loading = 'eager';
      img.classList.toggle('is-on', on);
    }
    for (const button of palettes) button.setAttribute('aria-pressed', String(button.dataset.mood === mood));
    toggle?.setAttribute('aria-checked', String(night));
  }

  for (const button of palettes) {
    button.addEventListener('click', () => {
      mood = button.dataset.mood;
      show();
    });
  }
  toggle?.addEventListener('click', () => {
    night = !night;
    show();
  });
}

// Process: on wide screens the section pins and its steps travel sideways while a
// brass line fills. Elsewhere, and with reduced motion, it is a plain vertical list.
export function initProcess({ reducedMotion }) {
  const section = document.querySelector('.process');
  if (!section || reducedMotion) return;
  const media = gsap.matchMedia();
  media.add('(min-width: 56.25rem) and (min-height: 34rem)', () => {
    section.classList.add('is-sideways');
    const track = section.querySelector('.process__track');
    const fill = section.querySelector('.process__line-fill');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        pin: section.querySelector('.process__pin'),
        start: 'top top',
        end: () => `+=${distance() + window.innerHeight * 0.6}`,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          fill.style.transform = `scaleX(${self.progress})`;
        },
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
      section.classList.remove('is-sideways');
    };
  });
}

// Selected work: drag sideways with a mouse (touch and trackpads scroll natively);
// a click opens a detail panel.
const STUDIES = {
  dining: { scope: 'Dining room for eight', mats: 'Walnut, brushed brass, lime plaster, limestone' },
  kitchen: { scope: 'Kitchen with island seating', mats: 'Honed travertine, walnut, olive stone, brass' },
  suite: { scope: 'Primary bedroom', mats: 'Walnut, linen, wool, lime plaster' },
  bath: { scope: 'Primary bathroom', mats: 'Carved stone, walnut, travertine, brushed brass' },
};

export function initWork() {
  const scroller = document.querySelector('.work__scroller');
  const panel = document.getElementById('work-panel');
  if (!scroller || !panel) return;

  let drag = null;
  let moved = false;
  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, left: scroller.scrollLeft };
    moved = false;
  });
  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 5) {
      moved = true;
      scroller.classList.add('is-dragging');
    }
    if (moved) scroller.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    drag = null;
    scroller.classList.remove('is-dragging');
  });

  for (const item of scroller.querySelectorAll('.work__item')) {
    item.addEventListener('click', (event) => {
      if (moved) {
        // the press was a drag, not a click
        event.preventDefault();
        moved = false;
        return;
      }
      const study = STUDIES[item.dataset.work];
      const img = item.querySelector('img');
      panel.querySelector('[data-panel-img]').src = img.currentSrc || img.src;
      panel.querySelector('[data-panel-img]').alt = img.alt;
      panel.querySelector('[data-panel-title]').textContent = item.querySelector('.work__name').textContent;
      panel.querySelector('[data-panel-scope]').textContent = study.scope;
      panel.querySelector('[data-panel-mats]').textContent = study.mats;
      panel.showModal();
    });
  }
  panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
  panel.addEventListener('click', (event) => {
    if (event.target === panel) panel.close(); // click on the backdrop
  });
}

// Questions: one answer open at a time, with a smooth height change.
export function initFaq() {
  const buttons = [...document.querySelectorAll('.faq__q')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      for (const other of buttons) {
        const on = other === button && open;
        other.setAttribute('aria-expanded', String(on));
        document.getElementById(other.getAttribute('aria-controls')).classList.toggle('is-open', on);
      }
      // The page length changed, so scroll-linked sections must re-measure.
      setTimeout(() => ScrollTrigger.refresh(), 650);
    });
  }
}
