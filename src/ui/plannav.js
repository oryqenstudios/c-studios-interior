import { STAGES } from '../scroll/timeline.js';

// Small floor-plan button in the header that opens a mini plan. Clicking a room jumps to it.
export function initPlanNav({ ui, jumpToRoom }) {
  const toggle = document.getElementById('plan-toggle');
  const popover = document.getElementById('plan-popover');
  if (!toggle || !popover) return;
  const rooms = [...popover.querySelectorAll('[data-room]')];

  const isOpen = () => !popover.hidden;

  function open() {
    popover.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    rooms[0]?.focus();
  }

  function close(returnFocus = true) {
    if (!isOpen()) return;
    popover.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !popover.contains(event.target) && !toggle.contains(event.target)) close(false);
  });
  popover.addEventListener('focusout', (event) => {
    if (isOpen() && event.relatedTarget && !popover.contains(event.relatedTarget) && event.relatedTarget !== toggle) {
      close(false);
    }
  });

  for (const button of rooms) {
    button.addEventListener('click', () => {
      close();
      jumpToRoom(button.dataset.room);
    });
  }

  return {
    // Marks the room the walkthrough is currently in.
    update() {
      if (!isOpen()) return;
      for (const button of rooms) {
        const [from, to] = STAGES[button.dataset.room];
        const here = ui.p >= from && ui.p < to;
        if ((button.getAttribute('aria-current') === 'true') !== here) {
          if (here) button.setAttribute('aria-current', 'true');
          else button.removeAttribute('aria-current');
        }
      }
    },
  };
}
