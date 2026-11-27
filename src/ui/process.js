import gsap from 'gsap';

// The process as a lock you open. A brass dial is turned by hand through five positions:
// Storytelling, Plan, Build, Furnishing, Handover. Behind it the picture changes from a page of notes
// to a floor plan, bare walls and a furnished model, a week counter runs, and the last
// turn of the dial turns the key and opens the door onto the finished home.
const SWEEP = 270; // degrees of travel, from lower left round to lower right
const WEEKS = [1, 4, 8, 16, 17]; // the week each step starts in, taking the longest of each stated range (1-3, 3-4, 1-8, within 1)
const NAMES = ['Storytelling', 'Plan', 'Build', 'Furnishing', 'Handover'];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initProcess({ reducedMotion }) {
  const section = document.querySelector('.proc');
  const dial = section?.querySelector('.proc__dial');
  if (!dial) return;
  const images = [...section.querySelectorAll('[data-proc-img]')];
  const steps = [...section.querySelectorAll('[data-step]')];
  const knob = section.querySelector('.proc__knob');
  const week = section.querySelector('[data-week]');
  const notes = section.querySelector('.proc__notes');
  const ticks = section.querySelector('.proc__ticks');
  const last = steps.length - 1;
  const state = { value: 0 }; // 0 (brief) to 1 (handover)
  let shown = -1;

  // Tick marks round the dial, with a longer brass mark and a name at each step.
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i <= 40; i++) {
    const major = i % 10 === 0;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('y1', major ? -92 : -86);
    line.setAttribute('y2', -80);
    line.setAttribute('transform', `rotate(${-SWEEP / 2 + (i / 40) * SWEEP})`);
    if (major) line.classList.add('is-major');
    ticks.append(line);
  }
  const marks = steps.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'proc__mark';
    button.textContent = NAMES[i];
    const angle = ((-SWEEP / 2 + (i / last) * SWEEP - 90) * Math.PI) / 180;
    button.style.setProperty('--mx', `${(Math.cos(angle) * 50).toFixed(2)}%`);
    button.style.setProperty('--my', `${(Math.sin(angle) * 50).toFixed(2)}%`);
    button.addEventListener('click', () => turnTo(i / last));
    dial.parentElement.append(button);
    return button;
  });

  function apply() {
    const v = state.value;
    const position = v * last;
    // Each picture is fully there at its own step and gone by the next.
    images.forEach((img, i) => (img.style.opacity = i === 0 ? 1 : clamp01(position - (i - 1))));
    if (notes) notes.style.opacity = clamp01(1 - position * 1.6);
    knob.setAttribute('transform', `rotate(${(-SWEEP / 2 + v * SWEEP).toFixed(2)})`); // the drawing is centred on 0,0
    // The week counter runs between the steps' weeks.
    const a = Math.floor(position);
    const b = Math.min(last, a + 1);
    week.textContent = String(Math.round(WEEKS[a] + (WEEKS[b] - WEEKS[a]) * (position - a))).padStart(2, '0');

    const index = Math.round(position);
    if (index !== shown) {
      shown = index;
      steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
      marks.forEach((mark, i) => mark.setAttribute('aria-current', String(i === index)));
      dial.setAttribute('aria-valuenow', String(index + 1));
      dial.setAttribute('aria-valuetext', `Step ${index + 1} of ${steps.length}: ${NAMES[index]}`);
    }
    // The final turn: the key turns and the door is open.
    section.classList.toggle('is-open', v > 0.97);
  }

  function turnTo(value, duration = 0.9) {
    section.classList.add('is-used');
    gsap.to(state, { value: clamp01(value), duration: reducedMotion ? 0 : duration, ease: 'power3.out', overwrite: true, onUpdate: apply });
  }

  // Turning by hand: follow the change in the pointer's angle round the dial's centre,
  // then settle on the nearest step when it is let go.
  let drag = null;
  const angleOf = (event) => {
    const box = dial.getBoundingClientRect();
    return (Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
  };
  dial.addEventListener('pointerdown', (event) => {
    drag = angleOf(event);
    dial.setPointerCapture(event.pointerId);
    gsap.killTweensOf(state);
    section.classList.add('is-used', 'is-turning');
  });
  dial.addEventListener('pointermove', (event) => {
    if (drag === null) return;
    const now = angleOf(event);
    let delta = now - drag;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    drag = now;
    state.value = clamp01(state.value + delta / SWEEP);
    apply();
  });
  const release = () => {
    if (drag === null) return;
    drag = null;
    section.classList.remove('is-turning');
    turnTo(Math.round(state.value * last) / last, 0.6);
  };
  dial.addEventListener('pointerup', release);
  dial.addEventListener('pointercancel', release);

  dial.addEventListener('keydown', (event) => {
    const index = Math.round(state.value * last);
    const to = { ArrowRight: index + 1, ArrowUp: index + 1, ArrowLeft: index - 1, ArrowDown: index - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    turnTo(Math.max(0, Math.min(last, to)) / last);
  });

  section.classList.add('is-live');
  apply();

  // The first time it comes into view, the dial gives a small turn and returns, to show
  // that it can be turned.
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen.disconnect();
        if (section.classList.contains('is-used')) return;
        gsap.to(state, { value: 0.13, duration: 0.7, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: 0.5, onUpdate: apply });
      },
      { threshold: 0.6 },
    );
    seen.observe(section);
  }
}
