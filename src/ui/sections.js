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

// Statement: the sentence arrives word by word, one line after the other, each word
// rising from behind the line's lower edge. It is set twice, one copy over the other: a
// fine brass outline (the idea) and a solid fill (the thing made). The fill sweeps across
// once on arrival; after that it follows the visitor's pointer or finger across the line.
export function initStatement({ reducedMotion }) {
  const text = document.querySelector('[data-statement]');
  if (!text || reducedMotion || !('IntersectionObserver' in window)) return;
  const section = text.closest('.statement');
  text.setAttribute('aria-label', text.textContent.replace(/\s+/g, ' ').trim());
  let index = 0;
  const lines = [...text.querySelectorAll('.statement__line')];
  for (const [l, line] of lines.entries()) {
    const words = line.textContent.trim().split(/\s+/);
    line.setAttribute('aria-hidden', 'true');
    line.replaceChildren(
      ...words.flatMap((word, i) => {
        const span = document.createElement('span');
        span.className = 'statement__word';
        span.textContent = word;
        span.style.setProperty('--w', index++ + l * 3); // a beat between the lines
        return i < words.length - 1 ? [span, ' '] : [span];
      }),
    );
  }
  // the solid copy, laid exactly over the outlined one
  const fill = document.createElement('span');
  fill.className = 'statement__fill';
  fill.setAttribute('aria-hidden', 'true');
  fill.append(...lines.map((line) => line.cloneNode(true)));
  text.append(fill);
  text.classList.add('is-split');

  // How far the fill reaches, 0 to 1 across the sentence, easing toward where it should be.
  let shown = 0;
  let goal = 0;
  let running = false;
  let lastTime = 0;
  let speed = 2.2; // slower for the first sweep, quicker when following a pointer
  function tick(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    shown += (goal - shown) * (1 - Math.exp(-speed * dt));
    if (Math.abs(goal - shown) < 0.001) shown = goal;
    text.style.setProperty('--fill', `${(shown * 100).toFixed(2)}%`);
    if (shown !== goal) requestAnimationFrame(tick);
    else running = false;
  }
  function reach(value, rate) {
    goal = Math.max(0, Math.min(1, value));
    speed = rate;
    if (running) return;
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(tick);
  }

  let arrived = false;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      text.classList.add('is-in');
      observer.disconnect();
      // once the words have landed, the fill sweeps across by itself
      setTimeout(() => {
        arrived = true;
        reach(1, 1.6);
      }, 1500);
    },
    { threshold: 0.6 },
  );
  observer.observe(text);

  const follow = (event) => {
    if (!arrived) return;
    const box = text.getBoundingClientRect();
    // a little past each end, so the whole sentence can be emptied or filled
    reach((event.clientX - box.left) / box.width * 1.1 - 0.05, 9);
    section.classList.add('is-touched');
  };
  section.addEventListener('pointermove', follow);
  section.addEventListener('pointerdown', follow);
  const settle = () => arrived && reach(1, 2.2);
  section.addEventListener('pointerleave', settle);
  section.addEventListener('pointerup', (event) => event.pointerType !== 'mouse' && settle());
  section.addEventListener('pointercancel', settle);
}

// Services: one card is always selected and shows its three points. Pointing at a card,
// tapping it or tabbing to it selects it.
export function initServices() {
  const cards = [...document.querySelectorAll('.cards .card')];
  if (!cards.length) return;
  const list = cards[0].parentElement;
  list.classList.add('is-interactive');
  function select(card) {
    for (const other of cards) {
      const on = other === card;
      other.classList.toggle('is-selected', on);
      other.querySelector('.card__toggle')?.setAttribute('aria-expanded', String(on));
    }
  }
  for (const card of cards) {
    card.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && select(card));
    card.addEventListener('click', () => select(card));
    card.addEventListener('focusin', () => select(card));
  }
  select(cards[0]);
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

// Selected work: drag sideways with a mouse (touch and trackpads scroll natively);
// a click opens a detail panel.
const STUDIES = {
  dining: { scope: 'Dining room for eight', mats: 'Walnut, brushed brass, lime plaster, limestone' },
  kitchen: { scope: 'Kitchen with island seating', mats: 'Honed travertine, walnut, olive stone, brass' },
  suite: { scope: 'Bedroom', mats: 'Walnut, linen, wool, lime plaster' },
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
