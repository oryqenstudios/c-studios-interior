import gsap from 'gsap';

// Header switch that blends between the day and night lighting states.
// It unlocks once stage 05 (the lights coming on) has played. Until the visitor uses it,
// the lighting follows the scroll; after that their choice applies at every stage.
export function initDayNight({ ui, reducedMotion }) {
  const button = document.querySelector('.daynight');
  if (!button) return;

  const isNight = () => (ui.override > 0.5 ? ui.night : ui.scriptedNight) > 0.5;

  function reflect() {
    const value = String(isNight());
    if (button.getAttribute('aria-checked') !== value) button.setAttribute('aria-checked', value);
  }

  ui.onUnlock = () => {
    button.disabled = false;
    button.title = 'Switch between day and night';
  };

  button.addEventListener('click', () => {
    const target = isNight() ? 0 : 1;
    // Start the blend from what is on screen now, then hand control to the visitor.
    if (ui.override === 0) ui.night = ui.scriptedNight;
    gsap.to(ui, {
      night: target,
      override: 1,
      duration: reducedMotion ? 0 : 0.7,
      ease: 'power1.inOut',
      overwrite: true,
    });
    button.setAttribute('aria-checked', String(target === 1));
  });

  // While the lighting still follows the scroll, keep the switch in step with it.
  return {
    update() {
      if (ui.override === 0) reflect();
    },
  };
}
