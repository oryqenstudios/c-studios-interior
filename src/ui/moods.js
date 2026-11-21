import gsap from 'gsap';
import { DEFAULT_MOOD, MOODS, moodColors, setMood } from '../scene/materials.js';

const STORAGE_KEY = 'c-studios-mood';

function remembered() {
  try {
    const key = sessionStorage.getItem(STORAGE_KEY);
    return key && MOODS[key] ? key : null;
  } catch {
    return null;
  }
}

// Three round swatches in the header. Choosing one blends wall, timber and fabric
// colours over about half a second. The choice lasts for the visit.
export function initMoods({ mats, reducedMotion }) {
  const buttons = [...document.querySelectorAll('.swatch[data-mood]')];
  let current = remembered() ?? DEFAULT_MOOD;

  function mark() {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mood === current));
  }

  function choose(key) {
    if (!MOODS[key] || key === current) return;
    current = key;
    mark();
    try {
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* private browsing: the choice simply will not persist */
    }
    for (const [name, color] of Object.entries(moodColors(key))) {
      gsap.to(mats[name].color, {
        r: color.r,
        g: color.g,
        b: color.b,
        duration: reducedMotion ? 0 : 0.5,
        ease: 'power1.inOut',
        overwrite: true,
      });
    }
  }

  setMood(mats, current);
  mark();
  for (const button of buttons) button.addEventListener('click', () => choose(button.dataset.mood));

  return { choose, current: () => current };
}
