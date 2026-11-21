import gsap from 'gsap';

const PULL = 0.25; // share of the cursor's offset from the button centre
const MAX = 8; // pixels

// Primary buttons pull slightly toward the cursor. Desktop pointers only.
export function initMagnetic({ reducedMotion }) {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer || reducedMotion) return;

  for (const button of document.querySelectorAll('.button--primary')) {
    const moveX = gsap.quickTo(button, 'x', { duration: 0.35, ease: 'power3.out' });
    const moveY = gsap.quickTo(button, 'y', { duration: 0.35, ease: 'power3.out' });
    const limit = (v) => Math.max(-MAX, Math.min(MAX, v));

    button.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const box = button.getBoundingClientRect();
      // Measure from the button's resting centre, not its pulled position.
      const restX = box.left + box.width / 2 - gsap.getProperty(button, 'x');
      const restY = box.top + box.height / 2 - gsap.getProperty(button, 'y');
      moveX(limit((event.clientX - restX) * PULL));
      moveY(limit((event.clientY - restY) * PULL));
    });
    button.addEventListener('pointerleave', () => {
      moveX(0);
      moveY(0);
    });
  }
}
